import { normalizeName } from "./normalize";
import type { Snapshot } from "./snapshot";

/** Ranks whose rating shows what it takes to get there. */
export const CUTOFF_RANKS = [1, 10, 100, 1_000] as const;

export interface Cutoff {
  rank: number;
  rating: number;
}

/** Rating at each milestone rank the board reaches; empty for boards without ratings (standard, wild). */
export function ratingCutoffs(snapshot: Snapshot, ranks: readonly number[] = CUTOFF_RANKS): Cutoff[] {
  return ranks.flatMap((rank) => {
    // Rows are ordered by rank; fall back to a search if a rank was skipped.
    const row = snapshot.rows[rank - 1]?.[0] === rank ? snapshot.rows[rank - 1] : snapshot.rows.find(([r]) => r === rank);
    return row && row[2] !== null ? [{ rank, rating: row[2] }] : [];
  });
}

/** Ranks gained since `previous` (positive is up, 0 unchanged), or "new" for a name not ranked then. */
export type RankChange = number | "new";

/**
 * Movement of each row against a previous ranking of the same names (normalized).
 * Namesakes are paired with the nearest unused previous rank.
 */
export function rankChanges(
  rows: ReadonlyArray<readonly [rank: number, name: string, rating: number | null]>,
  previous: ReadonlyArray<{ name: string; rank: number }>,
): RankChange[] {
  const remaining = new Map<string, number[]>();
  for (const { name, rank } of previous) remaining.set(name, [...(remaining.get(name) ?? []), rank]);

  return rows.map(([rank, name]) => {
    const candidates = remaining.get(normalizeName(name));
    if (!candidates?.length) return "new";
    const nearest = candidates.reduce((best, candidate) => (Math.abs(candidate - rank) < Math.abs(best - rank) ? candidate : best));
    candidates.splice(candidates.indexOf(nearest), 1);
    return nearest - rank;
  });
}
