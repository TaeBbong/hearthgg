import type { Mode, Region } from "./domain";
import { normalizeName } from "./normalize";
import type { Snapshot, SnapshotRow } from "./snapshot";

export interface SearchIndex {
  snapshot: Snapshot;
  /** normalizeName(accountId) per row, aligned with snapshot.rows. */
  names: string[];
}

export type MatchKind = "exact" | "prefix" | "contains";

export interface SearchHit {
  region: Region;
  mode: Mode;
  seasonId: number;
  rank: number;
  accountId: string;
  rating: number | null;
  match: MatchKind;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}

const MATCH_ORDER: Record<MatchKind, number> = { exact: 0, prefix: 1, contains: 2 };

export function buildSearchIndex(snapshot: Snapshot): SearchIndex {
  return { snapshot, names: snapshot.rows.map(([, accountId]) => normalizeName(accountId)) };
}

function matchKind(name: string, query: string): MatchKind | undefined {
  if (name === query) return "exact";
  if (name.startsWith(query)) return "prefix";
  if (name.includes(query)) return "contains";
  return undefined;
}

/** Case-insensitive partial match across boards; exact matches first, then prefix, then contains. */
export function search(indexes: readonly SearchIndex[], rawQuery: string, { limit = 50 } = {}): SearchResult {
  const query = normalizeName(rawQuery);
  if (!query) return { hits: [], total: 0 };

  const hits: SearchHit[] = [];
  for (const { snapshot, names } of indexes) {
    names.forEach((name, index) => {
      const match = matchKind(name, query);
      if (!match) return;
      const [rank, accountId, rating] = snapshot.rows[index]!;
      hits.push({ region: snapshot.region, mode: snapshot.mode, seasonId: snapshot.seasonId, rank, accountId, rating, match });
    });
  }

  hits.sort((a, b) => MATCH_ORDER[a.match] - MATCH_ORDER[b.match] || a.rank - b.rank);
  return { hits: hits.slice(0, limit), total: hits.length };
}

/** Every row of one board whose name normalizes to `name` (Blizzard names are not unique). */
export function findExact({ snapshot, names }: SearchIndex, name: string): SnapshotRow[] {
  const target = normalizeName(name);
  return snapshot.rows.filter((_, index) => names[index] === target);
}
