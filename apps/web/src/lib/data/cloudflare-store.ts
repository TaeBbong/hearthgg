import "server-only";
import type { Mode, Region } from "@hearthgg/core/domain";
import type { BoardPointer, LeaderboardStore } from "./store";

interface BoardRow {
  region: Region;
  mode: Mode;
  season_id: number;
  is_current: number;
  snapshot_key: string | null;
  generated_at: number | null;
  total_size: number | null;
  last_success_at: number | null;
  last_error: string | null;
  consecutive_failures: number;
}

/** Reads what the crawler publishes: pointers from D1, snapshot bodies from R2. */
export class CloudflareStore implements LeaderboardStore {
  constructor(
    private readonly db: D1Database,
    private readonly bucket: R2Bucket,
  ) {}

  async listBoards(): Promise<BoardPointer[]> {
    const { results } = await this.db
      .prepare(
        `SELECT region, mode, season_id, is_current, snapshot_key, generated_at, total_size,
                last_success_at, last_error, consecutive_failures
         FROM boards
         WHERE snapshot_key IS NOT NULL OR is_current = 1
         ORDER BY region, mode, season_id DESC`,
      )
      .all<BoardRow>();
    return results.map((row) => ({
      region: row.region,
      mode: row.mode,
      seasonId: row.season_id,
      isCurrent: row.is_current === 1,
      snapshotKey: row.snapshot_key,
      generatedAt: row.generated_at,
      totalSize: row.total_size,
      lastSuccessAt: row.last_success_at,
      lastError: row.last_error,
      consecutiveFailures: row.consecutive_failures,
    }));
  }

  async readSnapshot(key: string): Promise<string | null> {
    const object = await this.bucket.get(key);
    return object ? object.text() : null;
  }
}
