import { kstDay } from "@hearthgg/core";
import { BoardStore } from "./board-store";
import { captureDailyHistory, type CaptureResult } from "./history";
import { dailyReport } from "./messages";
import { pruneRankPoints } from "./points";
import { UpstreamGuard } from "./upstream-guard";

export interface DailyDeps {
  db: D1Database;
  bucket: R2Bucket;
  now?: () => number;
  alert?: (message: string) => Promise<void>;
}

/**
 * Runs on the cron ticks at the end of the KST day: records closing ranks,
 * prunes rank points of old seasons, then sends the daily report once (the
 * first tick to claim the day sends it).
 */
export async function runDailyTick(deps: DailyDeps): Promise<{ captures: CaptureResult[]; reported: boolean }> {
  const { db, bucket } = deps;
  const time = (deps.now ?? Date.now)();
  const day = kstDay(time);
  const captures = await captureDailyHistory({ db, bucket, now: () => time });
  await pruneRankPoints(db);

  const claimed = await db
    .prepare("INSERT OR IGNORE INTO daily_reports (day, sent_at) VALUES (?, ?) RETURNING day")
    .bind(day, time)
    .first();
  if (!claimed) return { captures, reported: false };

  const [boards, upstream, { results: captured }] = await Promise.all([
    new BoardStore(db).listCurrent(),
    new UpstreamGuard(db).status(time),
    db
      .prepare("SELECT region || ':' || mode AS board, row_count AS rows FROM history_days WHERE day = ? ORDER BY region, mode")
      .bind(day)
      .all<{ board: string; rows: number }>(),
  ]);
  await deps.alert?.(dailyReport({ day, now: time, boards, captured, upstream }));
  return { captures, reported: true };
}
