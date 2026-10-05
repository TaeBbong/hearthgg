import type { Board } from "./domain";
import { normalizeName } from "./normalize";
import type { Snapshot } from "./snapshot";

const KST_OFFSET_MS = 9 * 60 * 60_000;
/** Daily capture runs during the last minutes of the KST day so each day shows its closing ranks. */
const CAPTURE_WINDOW_MS = 10 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** `YYYY-MM-DD` in Korea time. */
export function kstDay(time: number): string {
  return new Date(time + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isDailyCaptureWindow(time: number): boolean {
  const msIntoDay = (time + KST_OFFSET_MS) % DAY_MS;
  return msIntoDay >= DAY_MS - CAPTURE_WINDOW_MS;
}

/** `[rank, normalizedName, rating]`: the shape inserted into the history index. */
export type HistoryRow = [rank: number, name: string, rating: number | null];

export function historyRows(snapshot: Snapshot): HistoryRow[] {
  return snapshot.rows.map(([rank, accountId, rating]) => [rank, normalizeName(accountId), rating]);
}

export function dailyArchiveKey({ region, mode }: Board, seasonId: number, day: string): string {
  return `daily/${region}/${mode}/${seasonId}/${day}.json`;
}

export interface HistoryPoint {
  day: string;
  rank: number;
  rating: number | null;
}

/**
 * Names are not unique, so a day can hold several ranks for one name. Walking
 * back from the latest day, keep the rank closest to the one chosen after it —
 * a player's rank moves gradually, namesakes rarely cross.
 */
export function traceSeries(points: readonly HistoryPoint[], anchorRank: number): HistoryPoint[] {
  const byDay = new Map<string, HistoryPoint[]>();
  for (const point of points) byDay.set(point.day, [...(byDay.get(point.day) ?? []), point]);

  const days = [...byDay.keys()].toSorted();
  const series: HistoryPoint[] = [];
  let anchor = anchorRank;
  for (const day of days.toReversed()) {
    const nearest = byDay.get(day)!.reduce((best, point) => (Math.abs(point.rank - anchor) < Math.abs(best.rank - anchor) ? point : best));
    series.push(nearest);
    anchor = nearest.rank;
  }
  return series.toReversed();
}
