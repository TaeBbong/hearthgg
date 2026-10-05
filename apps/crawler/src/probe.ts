import {
  BOARDS,
  boardId,
  decideCrawl,
  fetchLeaderboardPage,
  mapWithConcurrency,
  pageFingerprint,
  type Board,
  type BoardId,
  type LeaderboardPage,
} from "@hearthgg/core";
import { BoardStore } from "./board-store";
import { ALERT_AFTER_FAILURES, type CrawlParams } from "./crawl";

/** Upper bound for one crawl; a crashed run's lock frees itself after this. */
export const LOCK_LEASE_MS = 30 * 60_000;

/**
 * Crawls allowed in flight across all boards. Each crawl keeps a few upstream
 * requests open, so this is what bounds total load on Blizzard.
 */
export const MAX_CONCURRENT_CRAWLS = 3;

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
  /** Lower runs first: unpublished boards, then the stalest. */
  priority: number;
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
    let seasonId: number | undefined;
    try {
      const page = await fetchLeaderboardPage({ ...board, page: 1 }, fetchDeps);
      seasonId = page.seasonId;

      const { previousSeasonId } = await store.ensureCurrentSeason(board, seasonId);
      if (previousSeasonId !== null) {
        // Best effort: the retired season keeps its last regular snapshot if this fails.
        try {
          const last = await fetchLeaderboardPage({ ...board, page: 1, seasonId: previousSeasonId }, fetchDeps);
          candidates.push({ board, seasonId: previousSeasonId, page: last, fingerprint: await pageFingerprint(last), reason: "final", priority: -1, final: true });
        } catch (error) {
          console.error(`final crawl of ${boardId(board)} season ${previousSeasonId} not scheduled`, error);
        }
      }

      const row = await store.get(board, seasonId);
      const fingerprint = await pageFingerprint(page);
      const decision = decideCrawl(
        row?.snapshotKey ? { seasonId, fingerprint: row.fingerprint, lastSuccessAt: row.lastSuccessAt } : null,
        { seasonId, fingerprint, totalPages: page.totalPages },
        now,
      );
      if (!decision.crawl) {
        outcomes.set(boardId(board), { board: boardId(board), action: "skipped", seasonId, reason: decision.reason });
        return;
      }
      if (row?.lockRunId && (row.lockExpiresAt ?? 0) >= now) {
        outcomes.set(boardId(board), { board: boardId(board), action: "locked", seasonId, reason: decision.reason });
        return;
      }
      candidates.push({ board, seasonId, page, fingerprint, reason: decision.reason, priority: row?.lastSuccessAt ?? 0, final: false });
    } catch (error) {
      await fail(board, seasonId, error);
    }
  }

  // Keep upstream concurrency low; the probe runs every few minutes.
  await mapWithConcurrency(BOARDS, deps.concurrency ?? 4, probe);

  let budget = (deps.maxConcurrentCrawls ?? MAX_CONCURRENT_CRAWLS) - (await store.countActiveLocks(now));
  for (const candidate of candidates.toSorted((a, b) => a.priority - b.priority)) {
    const { board, seasonId, page, fingerprint, reason, final } = candidate;
    const id = boardId(board);
    const record = (outcome: Omit<ProbeOutcome, "board" | "seasonId">) => {
      if (!final) outcomes.set(id, { board: id, seasonId, reason, ...outcome });
    };

    if (budget <= 0) {
      record({ action: "deferred" });
      continue;
    }
    const runId = `${board.region}-${board.mode}-${seasonId}-${now}`;
    if (!(await store.acquireLock(board, seasonId, runId, now, LOCK_LEASE_MS))) {
      record({ action: "locked" });
      continue;
    }
    try {
      await deps.startCrawl({ ...board, seasonId, runId, totalPages: page.totalPages, expectedTotalSize: page.totalSize, fingerprint, startedAt: now });
      budget--;
      record({ action: "started" });
    } catch (error) {
      await store.releaseLock(board, seasonId, runId);
      if (final) console.error(`final crawl of ${id} season ${seasonId} not started`, error);
      else await fail(board, seasonId, error);
    }
  }

  return BOARDS.map((board) => outcomes.get(boardId(board))!);
}
