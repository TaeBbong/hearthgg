import { traceSeries, type HistoryPoint, type RankPoint } from "@hearthgg/core/history";
import type { SnapshotRow } from "@hearthgg/core/snapshot";

/**
 * Every recorded change for the namesake now at `entry`'s rank. Points are
 * written only on change, so the current rank is extended to the latest
 * snapshot time (`observedAt`) to show it still holds.
 */
export function liveSeries(points: readonly RankPoint[], [rank, , rating]: SnapshotRow, observedAt: number | null): RankPoint[] {
  const series = traceSeries(points, rank, (point) => point.at);
  const last = series.at(-1);
  if (last && observedAt !== null && observedAt > last.at) series.push({ at: observedAt, rank, rating });
  return series;
}

/** Daily closing ranks for the namesake now at `rank`, placed at the start of each day. */
export function dailySeries(points: readonly HistoryPoint[], rank: number): RankPoint[] {
  return traceSeries(points, rank, (point) => point.day).map(({ day, rank, rating }) => ({ at: Date.parse(day), rank, rating }));
}
