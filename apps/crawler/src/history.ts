import { boardId, chunk, dailyArchiveKey, deserializeSnapshot, historyRows, kstDay, type BoardId } from "@hearthgg/core";
import { BoardStore } from "./board-store";

/** Seasons per board kept in the D1 index; older ones live only in the R2 archive. */
export const HISTORY_SEASONS_KEPT = 2;

export interface HistoryDeps {
  db: D1Database;
  bucket: R2Bucket;
  now?: () => number;
  /** Rows per INSERT; each chunk is one JSON parameter expanded by json_each. */
  chunkSize?: number;
}

export interface CaptureResult {
  board: BoardId;
  seasonId: number;
  day: string;
  rows: number;
  status: "captured" | "already-captured";
}

/**
 * Records each current board's latest snapshot as that KST day's closing
 * ranks. Safe to call repeatedly: a board-day is written once, atomically.
 */
export async function captureDailyHistory(deps: HistoryDeps): Promise<CaptureResult[]> {
  const { db, bucket, now = Date.now, chunkSize = 500 } = deps;
  const day = kstDay(now());
  const boards = (await new BoardStore(db).listCurrent()).filter((row) => row.snapshotKey);
  const results: CaptureResult[] = [];

  for (const board of boards) {
    const id = boardId(board);
    const done = await db
      .prepare("SELECT 1 FROM history_days WHERE region = ? AND mode = ? AND season_id = ? AND day = ?")
      .bind(board.region, board.mode, board.seasonId, day)
      .first();
    if (done) {
      results.push({ board: id, seasonId: board.seasonId, day, rows: 0, status: "already-captured" });
      continue;
    }

    const object = await bucket.get(board.snapshotKey!);
    if (!object) continue;
    const json = await object.text();
    const rows = historyRows(deserializeSnapshot(json));

    // Archive first: if the index write fails, the next attempt redoes both.
    const archiveKey = dailyArchiveKey(board, board.seasonId, day);
    await bucket.put(archiveKey, json, { httpMetadata: { contentType: "application/json" } });

    const insert = db.prepare(
      `INSERT OR REPLACE INTO rank_history (region, mode, season_id, day, rank, name, rating)
       SELECT ?1, ?2, ?3, ?4, json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]')
       FROM json_each(?5)`,
    );
    await db.batch([
      ...chunk(rows, chunkSize).map((part) => insert.bind(board.region, board.mode, board.seasonId, day, JSON.stringify(part))),
      db
        .prepare(
          `INSERT INTO history_days (region, mode, season_id, day, archive_key, row_count, captured_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(board.region, board.mode, board.seasonId, day, archiveKey, rows.length, now()),
    ]);
    results.push({ board: id, seasonId: board.seasonId, day, rows: rows.length, status: "captured" });

    await pruneOldSeasons(db, board);
  }
  return results;
}

/** Drops index rows for seasons older than the newest HISTORY_SEASONS_KEPT seen for the board. */
async function pruneOldSeasons(db: D1Database, { region, mode }: { region: string; mode: string }) {
  const keep = `SELECT season_id FROM boards WHERE region = ?1 AND mode = ?2 ORDER BY season_id DESC LIMIT ${HISTORY_SEASONS_KEPT}`;
  await db.batch([
    db.prepare(`DELETE FROM rank_history WHERE region = ?1 AND mode = ?2 AND season_id NOT IN (${keep})`).bind(region, mode),
    db.prepare(`DELETE FROM history_days WHERE region = ?1 AND mode = ?2 AND season_id NOT IN (${keep})`).bind(region, mode),
  ]);
}
