import { NonRetryableError } from "cloudflare:workflows";
import {
  SnapshotIntegrityError,
  assembleSnapshot,
  boardId,
  chunk,
  fetchLeaderboardPage,
  isUpstreamBlock,
  mapWithConcurrency,
  type LeaderboardPage,
  serializeSnapshot,
  snapshotKey,
  type Mode,
  type Region,
} from "@hearthgg/core";
import { BoardStore } from "./board-store";
import { BLOCK_COOLDOWN_MS, UpstreamGuard } from "./upstream-guard";

/** Consecutive failures that trigger one alert (not repeated until the board recovers). */
export const ALERT_AFTER_FAILURES = 3;

export interface CrawlParams {
  region: Region;
  mode: Mode;
  seasonId: number;
  runId: string;
  totalPages: number;
  expectedTotalSize: number;
  fingerprint: string;
  startedAt: number;
}

/** The subset of a Workflow step the crawl needs; lets tests run steps inline. */
export interface CrawlStep {
  do<T>(name: string, fn: () => Promise<T>): Promise<T>;
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
}

export async function runCrawl(params: CrawlParams, step: CrawlStep, deps: CrawlDeps): Promise<CrawlResult> {
  const { region, mode, seasonId, runId, totalPages } = params;
  const { db, bucket, now = Date.now, batchSize = 50, concurrency = 3 } = deps;
  const board = { region, mode };
  const store = new BoardStore(db);
  const guard = new UpstreamGuard(db);
  const fetchDeps = { fetch: deps.fetch, sleep: deps.sleep };

  try {
    const pages: Array<{ page: number; data: LeaderboardPage }> = [];
    const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
    for (const batch of chunk(pageNumbers, batchSize)) {
      const fetched = await step.do(`fetch pages ${batch[0]}-${batch.at(-1)}`, async () => {
        const blockedUntil = await guard.blockedUntil(now());
        if (blockedUntil) throw new NonRetryableError(`Upstream blocked until ${new Date(blockedUntil).toISOString()}`);
        try {
          return await mapWithConcurrency(batch, concurrency, async (page) => ({
            page,
            // Pin the season: if it rolls over mid-crawl we still read one consistent season.
            data: await fetchLeaderboardPage({ region, mode, page, seasonId }, fetchDeps),
          }));
        } catch (error) {
          if (!isUpstreamBlock(error)) throw error;
          // Retrying would only extend the block: stop every crawl, not just this step.
          if (await guard.trip(now(), (error as Error).message)) {
            await deps.alert?.(
              `[hearthgg] Blizzard is blocking requests (${(error as Error).message}); pausing all crawls for ${BLOCK_COOLDOWN_MS / 60_000} minutes`,
            );
          }
          throw new NonRetryableError((error as Error).message, "UpstreamBlocked");
        }
      });
      pages.push(...fetched);
    }

    return await step.do("publish", async () => {
      let snapshot;
      try {
        snapshot = assembleSnapshot({
          board,
          seasonId,
          generatedAt: params.startedAt,
          expectedTotalSize: params.expectedTotalSize,
          pages,
        });
      } catch (error) {
        // Re-running the step would assemble the same pages again.
        if (error instanceof SnapshotIntegrityError) throw new NonRetryableError(error.message, error.name);
        throw error;
      }

      const key = snapshotKey(snapshot);
      await bucket.put(key, serializeSnapshot(snapshot), { httpMetadata: { contentType: "application/json" } });

      const { published, staleKey } = await store.publish(
        board,
        seasonId,
        runId,
        { snapshotKey: key, generatedAt: snapshot.generatedAt, totalSize: snapshot.totalSize, fingerprint: params.fingerprint },
        now(),
      );
      if (!published) {
        // A retried step may find its own earlier attempt already published.
        if ((await store.get(board, seasonId))?.snapshotKey === key) return { published: true, key, totalSize: snapshot.totalSize };
        await bucket.delete(key);
        return { published: false, key: null, totalSize: snapshot.totalSize };
      }
      if (staleKey) await bucket.delete(staleKey);
      return { published: true, key, totalSize: snapshot.totalSize };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failures = await step.do("record failure", () => store.recordFailure(board, seasonId, runId, message, now()));
    // During an upstream block the breaker already alerted once for everyone.
    const blocked = (await guard.blockedUntil(now())) !== null;
    if (failures === ALERT_AFTER_FAILURES && !blocked) {
      await deps.alert?.(`[hearthgg] ${boardId(board)} season ${seasonId} failed ${failures} times in a row: ${message}`);
    }
    throw error;
  }
}
