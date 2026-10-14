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

/** A daily closing rank. */
export interface HistoryPoint {
  day: string;
  rank: number;
  rating: number | null;
}

/** A rank observed when it changed; `at` is the snapshot's data time (ms). */
export interface RankPoint {
  at: number;
  rank: number;
  rating: number | null;
}

/**
 * Rows to record as rank points for `next`: every row of each name whose set
 * of (rank, rating) differs from `previous`. Writing a name's whole group keeps
 * namesakes traceable (each timestamp holds all of them). Names that left the
 * board write nothing; their line simply ends.
 */
export function changedRows(previous: Snapshot | null, next: Snapshot): HistoryRow[] {
  const rows = historyRows(next);
  if (!previous || previous.seasonId !== next.seasonId) return rows;

  const groupOf = (list: readonly HistoryRow[]) => {
    const groups = new Map<string, string[]>();
    for (const [rank, name, rating] of list) groups.set(name, [...(groups.get(name) ?? []), `${rank}:${rating}`]);
    return new Map([...groups].map(([name, states]) => [name, states.join(",")]));
  };
  const before = groupOf(historyRows(previous));
  const after = groupOf(rows);
  return rows.filter(([, name]) => before.get(name) !== after.get(name));
}

/**
 * Names are not unique, so one day or timestamp can hold several ranks for a
 * name. Walking back from the latest, keep the rank closest to the one chosen
 * after it: a player's rank moves gradually, namesakes rarely cross.
 */
export function traceSeries<T extends { rank: number }>(points: readonly T[], anchorRank: number, keyOf: (point: T) => string | number): T[] {
  const groups = new Map<string | number, T[]>();
  for (const point of points) groups.set(keyOf(point), [...(groups.get(keyOf(point)) ?? []), point]);

  const keys = [...groups.keys()].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const series: T[] = [];
  let anchor = anchorRank;
  for (const key of keys.toReversed()) {
    const nearest = groups.get(key)!.reduce((best, point) => (Math.abs(point.rank - anchor) < Math.abs(best.rank - anchor) ? point : best));
    series.push(nearest);
    anchor = nearest.rank;
  }
  return series.toReversed();
}
