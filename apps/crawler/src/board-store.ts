import type { Board, Mode, Region } from "@hearthgg/core";

export interface BoardRow {
  region: Region;
  mode: Mode;
  seasonId: number;
  isCurrent: boolean;
  snapshotKey: string | null;
  previousSnapshotKey: string | null;
  generatedAt: number | null;
  totalSize: number | null;
  fingerprint: string | null;
  lastSuccessAt: number | null;
  lastAttemptAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  lockRunId: string | null;
  lockExpiresAt: number | null;
}

interface RawBoardRow {
  region: Region;
  mode: Mode;
  season_id: number;
  is_current: number;
  snapshot_key: string | null;
  previous_snapshot_key: string | null;
  generated_at: number | null;
  total_size: number | null;
  fingerprint: string | null;
  last_success_at: number | null;
  last_attempt_at: number | null;
  last_error: string | null;
  consecutive_failures: number;
  lock_run_id: string | null;
  lock_expires_at: number | null;
}

function toBoardRow(raw: RawBoardRow): BoardRow {
  return {
    region: raw.region,
    mode: raw.mode,
    seasonId: raw.season_id,
    isCurrent: raw.is_current === 1,
    snapshotKey: raw.snapshot_key,
    previousSnapshotKey: raw.previous_snapshot_key,
    generatedAt: raw.generated_at,
    totalSize: raw.total_size,
    fingerprint: raw.fingerprint,
    lastSuccessAt: raw.last_success_at,
    lastAttemptAt: raw.last_attempt_at,
    lastError: raw.last_error,
    consecutiveFailures: raw.consecutive_failures,
    lockRunId: raw.lock_run_id,
    lockExpiresAt: raw.lock_expires_at,
  };
}

export interface PublishInput {
  snapshotKey: string;
  generatedAt: number;
  totalSize: number;
  fingerprint: string;
}

/**
 * D1-backed board state. Every mutation is a single conditional statement so
 * concurrent cron ticks and workflow runs cannot interleave unsafely.
 */
export class BoardStore {
  constructor(private readonly db: D1Database) {}

  async get({ region, mode }: Board, seasonId: number): Promise<BoardRow | null> {
    const raw = await this.db
      .prepare("SELECT * FROM boards WHERE region = ? AND mode = ? AND season_id = ?")
      .bind(region, mode, seasonId)
      .first<RawBoardRow>();
    return raw ? toBoardRow(raw) : null;
  }

  async getCurrent({ region, mode }: Board): Promise<BoardRow | null> {
    const raw = await this.db
      .prepare("SELECT * FROM boards WHERE region = ? AND mode = ? AND is_current = 1")
      .bind(region, mode)
      .first<RawBoardRow>();
    return raw ? toBoardRow(raw) : null;
  }

  async listCurrent(): Promise<BoardRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM boards WHERE is_current = 1 ORDER BY region, mode")
      .all<RawBoardRow>();
    return results.map(toBoardRow);
  }

  /** Marks `seasonId` as the board's current season, retiring an older one if needed. */
  async ensureCurrentSeason(board: Board, seasonId: number): Promise<{ previousSeasonId: number | null }> {
    const current = await this.getCurrent(board);
    if (current?.seasonId === seasonId) return { previousSeasonId: null };
    if (current && current.seasonId > seasonId) {
      throw new Error(`Season regressed for ${board.region}:${board.mode}: ${current.seasonId} -> ${seasonId}`);
    }

    await this.db.batch([
      this.db
        .prepare("UPDATE boards SET is_current = 0 WHERE region = ? AND mode = ? AND season_id < ?")
        .bind(board.region, board.mode, seasonId),
      this.db
        .prepare(
          `INSERT INTO boards (region, mode, season_id, is_current) VALUES (?, ?, ?, 1)
           ON CONFLICT (region, mode, season_id) DO UPDATE SET is_current = 1`,
        )
        .bind(board.region, board.mode, seasonId),
    ]);
    return { previousSeasonId: current?.seasonId ?? null };
  }

  /** Compare-and-swap lease: succeeds only if the lock is free or its lease has expired. */
  async acquireLock({ region, mode }: Board, seasonId: number, runId: string, now: number, leaseMs: number): Promise<boolean> {
    const row = await this.db
      .prepare(
        `UPDATE boards SET lock_run_id = ?1, lock_expires_at = ?2, last_attempt_at = ?3
         WHERE region = ?4 AND mode = ?5 AND season_id = ?6
           AND (lock_run_id IS NULL OR lock_expires_at < ?3)
         RETURNING lock_run_id`,
      )
      .bind(runId, now + leaseMs, now, region, mode, seasonId)
      .first<{ lock_run_id: string }>();
    return row?.lock_run_id === runId;
  }

  async releaseLock({ region, mode }: Board, seasonId: number, runId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE boards SET lock_run_id = NULL, lock_expires_at = NULL
         WHERE region = ? AND mode = ? AND season_id = ? AND lock_run_id = ?`,
      )
      .bind(region, mode, seasonId, runId)
      .run();
  }

  /**
   * Atomically points the board at a new snapshot. Only the lock owner may
   * publish, and only a newer snapshot may replace the current one. Returns the
   * object key that fell out of the two-version window and can be deleted.
   */
  async publish(
    board: Board,
    seasonId: number,
    runId: string,
    input: PublishInput,
    now: number,
  ): Promise<{ published: boolean; staleKey: string | null }> {
    const before = await this.get(board, seasonId);
    const row = await this.db
      .prepare(
        `UPDATE boards SET
           previous_snapshot_key = snapshot_key,
           snapshot_key = ?1, generated_at = ?2, total_size = ?3, fingerprint = ?4,
           last_success_at = ?5, last_error = NULL, consecutive_failures = 0,
           lock_run_id = NULL, lock_expires_at = NULL
         WHERE region = ?6 AND mode = ?7 AND season_id = ?8 AND lock_run_id = ?9
           AND (generated_at IS NULL OR generated_at < ?2)
         RETURNING snapshot_key`,
      )
      .bind(input.snapshotKey, input.generatedAt, input.totalSize, input.fingerprint, now, board.region, board.mode, seasonId, runId)
      .first();
    if (!row) return { published: false, staleKey: null };
    return { published: true, staleKey: before?.previousSnapshotKey ?? null };
  }

  /** Records a failed probe or crawl; returns the new consecutive failure count (0 if the board is unknown). */
  async recordFailure({ region, mode }: Board, seasonId: number, runId: string | null, error: string, now: number): Promise<number> {
    const row = await this.db
      .prepare(
        `UPDATE boards SET
           last_error = ?1, last_attempt_at = ?2, consecutive_failures = consecutive_failures + 1,
           lock_run_id = CASE WHEN lock_run_id = ?3 THEN NULL ELSE lock_run_id END,
           lock_expires_at = CASE WHEN lock_run_id = ?3 THEN NULL ELSE lock_expires_at END
         WHERE region = ?4 AND mode = ?5 AND season_id = ?6
         RETURNING consecutive_failures`,
      )
      .bind(error.slice(0, 500), now, runId, region, mode, seasonId)
      .first<{ consecutive_failures: number }>();
    return row?.consecutive_failures ?? 0;
  }
}
