import "server-only";
import type { Board, Mode, Region } from "@hearthgg/core/domain";
import type { HistoryPoint, RankPoint } from "@hearthgg/core/history";
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

  async readHistory({ region, mode }: Board, seasonId: number, normalizedName: string): Promise<HistoryPoint[]> {
    const { results } = await this.db
      .prepare(
        `SELECT day, rank, rating FROM rank_history
         WHERE region = ? AND mode = ? AND season_id = ? AND name = ?
         ORDER BY day, rank`,
      )
      .bind(region, mode, seasonId, normalizedName)
      .all<HistoryPoint>();
    return results;
  }

  async readClosingRanks({ region, mode }: Board, seasonId: number, beforeDay: string, names: string[]) {
    const baseline = await this.db
      .prepare("SELECT day FROM history_days WHERE region = ? AND mode = ? AND season_id = ? AND day < ? ORDER BY day DESC LIMIT 1")
      .bind(region, mode, seasonId, beforeDay)
      .first<{ day: string }>();
    if (!baseline) return null;
    // One primary-key lookup per name; json_each keeps it a single bound parameter.
    const { results } = await this.db
      .prepare(
        `SELECT name, rank FROM rank_history
         WHERE region = ?1 AND mode = ?2 AND season_id = ?3 AND day = ?4 AND name IN (SELECT value FROM json_each(?5))`,
      )
      .bind(region, mode, seasonId, baseline.day, JSON.stringify(names))
      .all<{ name: string; rank: number }>();
    return { day: baseline.day, ranks: results };
  }

  async readPoints({ region, mode }: Board, seasonId: number, normalizedName: string): Promise<RankPoint[]> {
    const { results } = await this.db
      .prepare(
        `SELECT at, rank, rating FROM rank_points
         WHERE region = ? AND mode = ? AND season_id = ? AND name = ?
         ORDER BY at, rank`,
      )
      .bind(region, mode, seasonId, normalizedName)
      .all<RankPoint>();
    return results;
  }

  async readUpstreamBlock(now: number): Promise<number | null> {
    const row = await this.db
      .prepare("SELECT blocked_until FROM upstream_state WHERE id = 1 AND blocked_until > ?")
      .bind(now)
      .first<{ blocked_until: number }>();
    return row?.blocked_until ?? null;
  }

  async readSnapshot(key: string): Promise<string | null> {
    const object = await this.bucket.get(key);
    return object ? object.text() : null;
  }
}
