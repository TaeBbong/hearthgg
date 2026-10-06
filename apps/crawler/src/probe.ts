import {
  BOARDS,
  boardId,
  decideRefresh,
  fetchLeaderboardPage,
  isUpstreamBlock,
  mapWithConcurrency,
  pageFingerprint,
  type Board,
  type BoardId,
  type LeaderboardPage,
  type RefreshKind,
} from "@hearthgg/core";
import { BoardStore } from "./board-store";
import { ALERT_AFTER_FAILURES, type CrawlParams } from "./crawl";
import { CRAWL_BATCH_PAGES, LOCK_LEASE_MS, MAX_CONCURRENT_CRAWLS, PROBE_CONCURRENCY } from "./limits";
import { RequestBudget } from "./request-budget";
import { UpstreamGuard, blockAlert, throttleFactor } from "./upstream-guard";

export interface ProbeDeps {
  db: D1Database;
  startCrawl: (params: CrawlParams) => Promise<void>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  alert?: (message: string) => Promise<void>;
  concurrency?: number;
  maxConcurrentCrawls?: number;
}

export interface ProbeOutcome {
  board: BoardId;
  action: "started" | "skipped" | "locked" | "deferred" | "failed";
  seasonId?: number;
  reason?: string;
  error?: string;
}

interface Candidate {
  board: Board;
  seasonId: number;
  page: LeaderboardPage;
  fingerprint: string;
  reason: string;
  kind: RefreshKind;
  pages: number;
  /** Higher runs first: unpublished boards, then whatever is most overdue for its tier. */
  urgency: number;
  /** Retired-season crawls ride along without an outcome of their own. */
  final: boolean;
}

/**
 * One cron tick: read page 1 of every board, decide which boards changed
 * enough to crawl, then start the most urgent ones within the global budget.
 */
export async function runProbeCycle(deps: ProbeDeps): Promise<ProbeOutcome[]> {
  const now = (deps.now ?? Date.now)();
  const store = new BoardStore(deps.db);
  const fetchDeps = { fetch: deps.fetch, sleep: deps.sleep };
  const outcomes = new Map<BoardId, ProbeOutcome>();
  const candidates: Candidate[] = [];
  const guard = new UpstreamGuard(deps.db);
  const budget = new RequestBudget(deps.db);
  const skippedAll = (reason: string): ProbeOutcome[] =>
    BOARDS.map((board) => outcomes.get(boardId(board)) ?? { board: boardId(board), action: "skipped", reason });

  const { blockedUntil, strikes } = await guard.status(now);
  if (blockedUntil) return skippedAll("upstream-blocked");
  // Recently blocked: refill the budget slower and run fewer crawls until strikes decay.
  const throttle = throttleFactor(strikes);
  // The probe itself costs one request per board.
  if (!(await budget.reserve(BOARDS.length, now, throttle)).granted) return skippedAll("budget");
  let blocked = false;

  async function fail(board: Board, seasonId: number | undefined, error: unknown) {
    const id = boardId(board);
    const message = error instanceof Error ? error.message : String(error);
    const failedSeason = seasonId ?? (await store.getCurrent(board))?.seasonId;
    if (failedSeason !== undefined) {
      const failures = await store.recordFailure(board, failedSeason, null, message, now);
      if (failures === ALERT_AFTER_FAILURES) {
        await deps.alert?.(`[hearthgg] ${id} failed ${failures} times in a row: ${message}`);
      }
    }
    outcomes.set(id, { board: id, action: "failed", seasonId, error: message });
  }

  async function probe(board: Board) {
    if (blocked) return;
    let seasonId: number | undefined;
    try {
      const page = await fetchLeaderboardPage({ ...board, page: 1 }, fetchDeps);
      seasonId = page.seasonId;

      const { previousSeasonId } = await store.ensureCurrentSeason(board, seasonId);
      if (previousSeasonId !== null) {
        // Best effort: the retired season keeps its last regular snapshot if this fails.
        try {
          const last = await fetchLeaderboardPage({ ...board, page: 1, seasonId: previousSeasonId }, fetchDeps);
          candidates.push({
            board,
            seasonId: previousSeasonId,
            page: last,
            fingerprint: await pageFingerprint(last),
            reason: "final",
            kind: "full",
            pages: last.totalPages,
            urgency: Infinity,
            final: true,
          });
        } catch (error) {
          console.error(`final crawl of ${boardId(board)} season ${previousSeasonId} not scheduled`, error);
        }
      }

      const row = await store.get(board, seasonId);
      const fingerprint = await pageFingerprint(page);
      const decision = decideRefresh(
        row?.snapshotKey
          ? { seasonId, fingerprint: row.fingerprint, topRefreshedAt: row.generatedAt, fullRefreshedAt: row.deepGeneratedAt }
          : null,
        { seasonId, fingerprint, totalPages: page.totalPages },
        now,
      );
      if (!decision.refresh) {
        outcomes.set(boardId(board), { board: boardId(board), action: "skipped", seasonId, reason: decision.reason });
        return;
      }
      if (row?.lockRunId && (row.lockExpiresAt ?? 0) >= now) {
        outcomes.set(boardId(board), { board: boardId(board), action: "locked", seasonId, reason: decision.reason });
        return;
      }
      candidates.push({
        board,
        seasonId,
        page,
        fingerprint,
        reason: decision.reason,
        kind: decision.kind,
        pages: decision.pages,
        urgency: decision.urgency,
        final: false,
      });
    } catch (error) {
      if (isUpstreamBlock(error)) {
        blocked = true;
        const trip = await guard.trip(now, (error as Error).message);
        if (trip.newlyBlocked) await deps.alert?.(blockAlert(trip, (error as Error).message));
      }
      await fail(board, seasonId, error);
    }
  }

  // Keep upstream concurrency low; the probe runs every few minutes.
  await mapWithConcurrency(BOARDS, deps.concurrency ?? PROBE_CONCURRENCY, probe);
  if (blocked) return skippedAll("upstream-blocked");

  const maxCrawls = Math.max(1, Math.floor((deps.maxConcurrentCrawls ?? MAX_CONCURRENT_CRAWLS) * throttle));
  let slots = maxCrawls - (await store.countActiveLocks(now));
  // Stable sort: equally urgent candidates keep probe order (retired seasons first).
  for (const candidate of candidates.toSorted((a, b) => (b.urgency === a.urgency ? 0 : b.urgency - a.urgency))) {
    const { board, seasonId, page, fingerprint, reason, kind, pages, final } = candidate;
    const id = boardId(board);
    const record = (outcome: Omit<ProbeOutcome, "board" | "seasonId">) => {
      if (!final) outcomes.set(id, { board: id, seasonId, reason, ...outcome });
    };

    if (slots <= 0) {
      record({ action: "deferred", reason: "no-slot" });
      continue;
    }
    // Only start what can make progress now; the workflow reserves per batch as it goes.
    if ((await budget.available(now, throttle)) < Math.min(CRAWL_BATCH_PAGES, pages)) {
      record({ action: "deferred", reason: "budget" });
      continue;
    }
    const runId = `${board.region}-${board.mode}-${seasonId}-${now}`;
    if (!(await store.acquireLock(board, seasonId, runId, now, LOCK_LEASE_MS))) {
      record({ action: "locked" });
      continue;
    }
    try {
      await deps.startCrawl({
        ...board,
        seasonId,
        runId,
        kind,
        pages,
        totalPages: page.totalPages,
        expectedTotalSize: page.totalSize,
        fingerprint,
        startedAt: now,
      });
      slots--;
      record({ action: "started" });
    } catch (error) {
      await store.releaseLock(board, seasonId, runId);
      if (final) console.error(`final crawl of ${id} season ${seasonId} not started`, error);
      else await fail(board, seasonId, error);
    }
  }

  return BOARDS.map((board) => outcomes.get(boardId(board))!);
}
