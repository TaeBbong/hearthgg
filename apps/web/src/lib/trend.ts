import { kstDay, traceSeries, type HistoryPoint, type RankPoint } from "@hearthgg/core/history";
import type { SnapshotRow } from "@hearthgg/core/snapshot";
import type { RankChange } from "@hearthgg/core/standings";

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

export interface TrendSummary {
  /** Best rank on record this season (earliest time it was reached). */
  best: { rank: number; at: number } | null;
  /** Ranks gained since the baseline close; positive is up. */
  change: RankChange | null;
  /** The closing day compared with: the latest before the snapshot's KST day. */
  baselineDay: string | null;
}

/** Headline numbers for one namesake, from both histories and the current rank. */
export function trendSummary({
  daily,
  points,
  entry,
  observedAt,
}: {
  daily: readonly HistoryPoint[];
  points: readonly RankPoint[];
  entry: SnapshotRow;
  observedAt: number | null;
}): TrendSummary {
  const [rank] = entry;
  const closes = traceSeries(daily, rank, (point) => point.day);
  const live = traceSeries(points, rank, (point) => point.at);
  if (!closes.length && !live.length) return { best: null, change: null, baselineDay: null };

  const now = observedAt ?? Date.now();
  const candidates = [
    ...closes.map((point) => ({ rank: point.rank, at: Date.parse(point.day) })),
    ...live.map(({ rank, at }) => ({ rank, at })),
    { rank, at: now },
  ].toSorted((a, b) => a.at - b.at);
  const best = candidates.reduce((top, candidate) => (candidate.rank < top.rank ? candidate : top));

  const today = kstDay(now);
  const baseline = closes.findLast((point) => point.day < today);
  return { best, change: baseline ? baseline.rank - rank : null, baselineDay: baseline?.day ?? null };
}
