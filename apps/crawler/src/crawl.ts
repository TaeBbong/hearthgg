import { NonRetryableError } from "cloudflare:workflows";
import {
  PAGE_SIZE,
  SnapshotIntegrityError,
  assembleSnapshot,
  boardId,
  changedRows,
  chunk,
  deserializeSnapshot,
  fetchLeaderboardPage,
  isUpstreamBlock,
  mapWithConcurrency,
  mergeTopRefresh,
  serializeSnapshot,
  snapshotKey,
  type LeaderboardPage,
  type Mode,
  type RefreshKind,
  type Region,
} from "@hearthgg/core";
import { BoardStore } from "./board-store";
import { BUDGET_WAIT_CAP_MS, CRAWL_BATCH_PAGES, CRAWL_CONCURRENCY, LOCK_LEASE_MS, MAX_BUDGET_WAITS } from "./limits";
import { RequestBudget } from "./request-budget";
import { blockAlert, boardFailureAlert, boardRecoveryNotice } from "./messages";
import { recordRankPoints } from "./points";
import { UpstreamGuard, throttleFactor } from "./upstream-guard";

/** Consecutive failures that trigger one alert (not repeated until the board recovers). */
export const ALERT_AFTER_FAILURES = 3;

export interface CrawlParams {
  region: Region;
  mode: Mode;
  seasonId: number;
  runId: string;
  /** "top" re-reads only the first `pages` pages and merges them into the current snapshot. */
  kind: RefreshKind;
  /** Pages to fetch in this run. */
  pages: number;
  /** Board size reported by the probe. */
  totalPages: number;
  expectedTotalSize: number;
  fingerprint: string;
  startedAt: number;
}

/** The subset of a Workflow step the crawl needs; lets tests run steps inline. */
export interface CrawlStep {
  do<T>(name: string, fn: () => Promise<T>): Promise<T>;
  /** Durable sleep: no CPU or requests while waiting. */
  sleep(name: string, ms: number): Promise<void>;
}

export interface CrawlDeps {
  db: D1Database;
  bucket: R2Bucket;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  alert?: (message: string) => Promise<void>;
  /** Pages per workflow step; each step's output is persisted, so keep it well under 1MiB. */
  batchSize?: number;
  /** Parallel upstream requests within a step; the global cap multiplies this. */
  concurrency?: number;
}

export interface CrawlResult {
  published: boolean;
  key: string | null;
  totalSize: number;
  /** Failure streak this publish ended (0 if none). */
  recoveredFrom: number;
}

export async function runCrawl(params: CrawlParams, step: CrawlStep, deps: CrawlDeps): Promise<CrawlResult> {
  const { region, mode, seasonId, runId, kind } = params;
  const { db, bucket, now = Date.now, batchSize = CRAWL_BATCH_PAGES, concurrency = CRAWL_CONCURRENCY } = deps;
  const board = { region, mode };
  const store = new BoardStore(db);
  const guard = new UpstreamGuard(db);
  const budget = new RequestBudget(db);
  const fetchDeps = { fetch: deps.fetch, sleep: deps.sleep };

  try {
    const pages: Array<{ page: number; data: LeaderboardPage }> = [];
    const pageNumbers = Array.from({ length: params.pages }, (_, index) => index + 1);
    for (const batch of chunk(pageNumbers, batchSize)) {
      const range = `${batch[0]}-${batch.at(-1)}`;
      for (let attempt = 1; ; attempt++) {
        const reservation = await step.do(`reserve pages ${range} (${attempt})`, async () => {
          // Doubles as the lock heartbeat: budget waits can outlast one lease.
          if (!(await store.extendLock(board, seasonId, runId, now(), LOCK_LEASE_MS))) {
            throw new NonRetryableError("Crawl lock was taken over by another run");
          }
          const { blockedUntil, strikes } = await guard.status(now());
          if (blockedUntil) throw new NonRetryableError(`Upstream blocked until ${new Date(blockedUntil).toISOString()}`);
          return budget.reserve(batch.length, now(), throttleFactor(strikes));
        });
        if (reservation.granted) break;
        if (attempt > MAX_BUDGET_WAITS) throw new NonRetryableError("Request budget did not free up in time");
        await step.sleep(`wait for budget ${range} (${attempt})`, Math.min(reservation.waitMs, BUDGET_WAIT_CAP_MS));
      }

      const fetched = await step.do(`fetch pages ${range}`, async () => {
        // Fewer parallel requests while recovering from a recent block.
        const { strikes } = await guard.status(now());
        const parallel = Math.max(1, Math.floor(concurrency * throttleFactor(strikes)));
        try {
          return await mapWithConcurrency(batch, parallel, async (page) => ({
            page,
            // Pin the season: if it rolls over mid-crawl we still read one consistent season.
            data: await fetchLeaderboardPage({ region, mode, page, seasonId }, fetchDeps),
          }));
        } catch (error) {
          if (!isUpstreamBlock(error)) throw error;
          // Retrying would only extend the block: stop every crawl, not just this step.
          const trip = await guard.trip(now(), (error as Error).message);
          if (trip.newlyBlocked) await deps.alert?.(blockAlert(trip, (error as Error).message));
          throw new NonRetryableError((error as Error).message, "UpstreamBlocked");
        }
      });
      pages.push(...fetched);
    }

    const result = await step.do("publish", async (): Promise<CrawlResult> => {
      let snapshot;
      let previous;
      try {
        snapshot = assembleSnapshot({
          board,
          seasonId,
          generatedAt: params.startedAt,
          // A top refresh covers only its pages, so only those rows are expected.
          expectedTotalSize: kind === "top" ? Math.min(params.expectedTotalSize, params.pages * PAGE_SIZE) : params.expectedTotalSize,
          pages,
        });
        // The lock keeps this pointer stable until our publish below.
        const previousKey = (await store.get(board, seasonId))?.snapshotKey;
        const previousObject = previousKey ? await bucket.get(previousKey) : null;
        previous = previousObject ? deserializeSnapshot(await previousObject.text()) : null;
        if (kind === "top") {
          if (!previous) throw new NonRetryableError("Top refresh needs a previous snapshot to merge into");
          snapshot = mergeTopRefresh(previous, snapshot, params.expectedTotalSize);
        }
      } catch (error) {
        // Re-running the step would assemble the same pages again.
        if (error instanceof SnapshotIntegrityError) throw new NonRetryableError(error.message, error.name);
        throw error;
      }

      // Points go in before the pointer swap: if publishing then fails, they are still
      // genuine observations, and a retry re-inserts nothing (INSERT OR IGNORE).
      await recordRankPoints(db, board, seasonId, snapshot.generatedAt, changedRows(previous, snapshot));

      const key = snapshotKey(snapshot);
      await bucket.put(key, serializeSnapshot(snapshot), { httpMetadata: { contentType: "application/json" } });

      const { published, staleKey, recoveredFrom } = await store.publish(
        board,
        seasonId,
        runId,
        {
          snapshotKey: key,
          generatedAt: snapshot.generatedAt,
          deepGeneratedAt: snapshot.deepGeneratedAt ?? snapshot.generatedAt,
          totalSize: snapshot.totalSize,
          fingerprint: params.fingerprint,
        },
        now(),
      );
      if (!published) {
        // A retried step may find its own earlier attempt already published.
        if ((await store.get(board, seasonId))?.snapshotKey === key) return { published: true, key, totalSize: snapshot.totalSize, recoveredFrom: 0 };
        await bucket.delete(key);
        return { published: false, key: null, totalSize: snapshot.totalSize, recoveredFrom: 0 };
      }
      if (staleKey) await bucket.delete(staleKey);
      return { published: true, key, totalSize: snapshot.totalSize, recoveredFrom };
    });

    // Notifications run inside steps: code between steps re-runs when a workflow replays.
    if (result.recoveredFrom >= ALERT_AFTER_FAILURES) {
      await step.do("notify recovery", async () => {
        await deps.alert?.(boardRecoveryNotice(boardId(board), result.recoveredFrom));
        return true;
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failures = await step.do("record failure", () => store.recordFailure(board, seasonId, runId, message, now()));
    // During an upstream block the breaker already alerted once for everyone.
    const blocked = (await guard.blockedUntil(now())) !== null;
    if (failures === ALERT_AFTER_FAILURES && !blocked) {
      await step.do("notify failure", async () => {
        await deps.alert?.(boardFailureAlert(boardId(board), seasonId, failures, message));
        return true;
      });
    }
    throw error;
  }
}
