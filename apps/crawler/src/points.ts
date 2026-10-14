import { chunk, type Board, type HistoryRow } from "@hearthgg/core";
import { HISTORY_SEASONS_KEPT } from "./history";

/**
 * Records rank observations at snapshot time `at`. INSERT OR IGNORE on the
 * full key makes a retried publish step a no-op.
 */
export async function recordRankPoints(
  db: D1Database,
  { region, mode }: Board,
  seasonId: number,
  at: number,
  rows: readonly HistoryRow[],
  chunkSize = 500,
): Promise<number> {
  if (!rows.length) return 0;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO rank_points (region, mode, season_id, at, rank, name, rating)
     SELECT ?1, ?2, ?3, ?4, json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]')
     FROM json_each(?5)`,
  );
  await db.batch(chunk(rows, chunkSize).map((part) => insert.bind(region, mode, seasonId, at, JSON.stringify(part))));
  return rows.length;
}

/**
 * Drops points of seasons older than the newest HISTORY_SEASONS_KEPT per board.
 * A finished season can hold millions of rows, so deletes run in bounded
 * batches over the primary-key range and resume on the next run.
 */
export async function pruneRankPoints(db: D1Database, { batchSize = 10_000, maxBatches = 50 } = {}): Promise<number> {
  const { results: cutoffs } = await db
    .prepare(
      `SELECT region, mode, season_id AS cutoff FROM (
         SELECT region, mode, season_id, ROW_NUMBER() OVER (PARTITION BY region, mode ORDER BY season_id DESC) AS position FROM boards
       ) WHERE position = ?1`,
    )
    .bind(HISTORY_SEASONS_KEPT)
    .all<{ region: string; mode: string; cutoff: number }>();

  const remove = db.prepare(
    `DELETE FROM rank_points WHERE (region, mode, season_id, name, at, rank) IN (
       SELECT region, mode, season_id, name, at, rank FROM rank_points
       WHERE region = ?1 AND mode = ?2 AND season_id < ?3 LIMIT ?4
     )`,
  );
  let deleted = 0;
  let batches = 0;
  for (const { region, mode, cutoff } of cutoffs) {
    while (batches < maxBatches) {
      batches++;
      const { meta } = await remove.bind(region, mode, cutoff, batchSize).run();
      deleted += meta.changes;
      if (meta.changes < batchSize) break;
    }
  }
  return deleted;
}
