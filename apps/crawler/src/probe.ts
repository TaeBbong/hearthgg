import {
  BOARDS,
  boardId,
  decideCrawl,
  fetchLeaderboardPage,
  mapWithConcurrency,
  pageFingerprint,
  type Board,
  type BoardId,
} from "@hearthgg/core";
import { BoardStore } from "./board-store";
import { ALERT_AFTER_FAILURES, type CrawlParams } from "./crawl";

/** Upper bound for one crawl; a crashed run's lock frees itself after this. */
export const LOCK_LEASE_MS = 30 * 60_000;

export interface ProbeDeps {
  db: D1Database;
  startCrawl: (params: CrawlParams) => Promise<void>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  alert?: (message: string) => Promise<void>;
  concurrency?: number;
}

export interface ProbeOutcome {
  board: BoardId;
  action: "started" | "skipped" | "locked" | "failed";
  seasonId?: number;
  reason?: string;
  error?: string;
}

/**
 * One cron tick: read page 1 of every board, decide which boards changed
 * enough to crawl, and hand each of those to a crawl workflow under a lock.
 */
export async function runProbeCycle(deps: ProbeDeps): Promise<ProbeOutcome[]> {
  const now = (deps.now ?? Date.now)();
  const store = new BoardStore(deps.db);
  const fetchDeps = { fetch: deps.fetch, sleep: deps.sleep };

  async function launch(board: Board, seasonId: number, totalPages: number, totalSize: number, fingerprint: string) {
    const runId = `${board.region}-${board.mode}-${seasonId}-${now}`;
    if (!(await store.acquireLock(board, seasonId, runId, now, LOCK_LEASE_MS))) return false;
    try {
      await deps.startCrawl({ ...board, seasonId, runId, totalPages, expectedTotalSize: totalSize, fingerprint, startedAt: now });
    } catch (error) {
      await store.releaseLock(board, seasonId, runId);
      throw error;
    }
    return true;
  }

  /** Best effort: the retired season keeps its last regular snapshot if this fails. */
  async function finalizeSeason(board: Board, seasonId: number) {
    try {
      const page = await fetchLeaderboardPage({ ...board, page: 1, seasonId }, fetchDeps);
      await launch(board, seasonId, page.totalPages, page.totalSize, await pageFingerprint(page));
    } catch (error) {
      console.error(`final crawl of ${boardId(board)} season ${seasonId} not started`, error);
    }
  }

  async function probe(board: Board): Promise<ProbeOutcome> {
    const id = boardId(board);
    let seasonId: number | undefined;
    try {
      const page = await fetchLeaderboardPage({ ...board, page: 1 }, fetchDeps);
      seasonId = page.seasonId;

      const { previousSeasonId } = await store.ensureCurrentSeason(board, seasonId);
      if (previousSeasonId !== null) await finalizeSeason(board, previousSeasonId);

      const row = await store.get(board, seasonId);
      const fingerprint = await pageFingerprint(page);
      const decision = decideCrawl(
        row?.snapshotKey ? { seasonId, fingerprint: row.fingerprint, lastSuccessAt: row.lastSuccessAt } : null,
        { seasonId, fingerprint, totalPages: page.totalPages },
        now,
      );
      if (!decision.crawl) return { board: id, action: "skipped", seasonId, reason: decision.reason };

      const started = await launch(board, seasonId, page.totalPages, page.totalSize, fingerprint);
      return { board: id, action: started ? "started" : "locked", seasonId, reason: decision.reason };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedSeason = seasonId ?? (await store.getCurrent(board))?.seasonId;
      if (failedSeason !== undefined) {
        const failures = await store.recordFailure(board, failedSeason, null, message, now);
        if (failures === ALERT_AFTER_FAILURES) {
          await deps.alert?.(`[hearthgg] ${id} probe failed ${failures} times in a row: ${message}`);
        }
      }
      return { board: id, action: "failed", seasonId, error: message };
    }
  }

  // Keep upstream concurrency low; the probe runs every few minutes.
  return mapWithConcurrency(BOARDS, deps.concurrency ?? 4, probe);
}
