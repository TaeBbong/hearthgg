import type { LeaderboardPage } from "./blizzard";
import { PAGE_SIZE, type Board, type Mode, type Region } from "./domain";

/** `[rank, accountId, rating]` — tuples keep a 20k-row board around 600KB of JSON. */
export type SnapshotRow = readonly [rank: number, accountId: string, rating: number | null];

export interface Snapshot {
  v: 1;
  region: Region;
  mode: Mode;
  seasonId: number;
  /** Epoch ms when the crawl that produced this snapshot started. */
  generatedAt: number;
  /**
   * Data time of rows below the refreshed top pages, when they come from an
   * earlier full crawl (see mergeTopRefresh). Absent: all rows share generatedAt.
   */
  deepGeneratedAt?: number;
  totalSize: number;
  rows: SnapshotRow[];
}

export class SnapshotIntegrityError extends Error {
  override name = "SnapshotIntegrityError";
}

export interface AssembleInput {
  board: Board;
  seasonId: number;
  generatedAt: number;
  /** totalSize reported by the probe; the board may grow a little while crawling. */
  expectedTotalSize: number;
  pages: Array<{ page: number; data: LeaderboardPage }>;
}

function growthTolerance(expected: number): number {
  return Math.max(PAGE_SIZE, Math.ceil(expected * 0.02));
}

export function assembleSnapshot({ board, seasonId, generatedAt, expectedTotalSize, pages }: AssembleInput): Snapshot {
  const ordered = pages.toSorted((a, b) => a.page - b.page);
  const rows: SnapshotRow[] = [];

  ordered.forEach(({ page, data }, index) => {
    if (page !== index + 1) throw new SnapshotIntegrityError(`missing page ${index + 1}`);
    if (data.seasonId !== seasonId) {
      throw new SnapshotIntegrityError(`page ${page} belongs to season ${data.seasonId}, expected ${seasonId}`);
    }
    const isLast = index === ordered.length - 1;
    if (!isLast && data.rows.length !== PAGE_SIZE) {
      throw new SnapshotIntegrityError(`page ${page} has ${data.rows.length} rows`);
    }
    data.rows.forEach((row, offset) => {
      const expectedRank = (page - 1) * PAGE_SIZE + offset + 1;
      if (row.rank !== expectedRank) {
        throw new SnapshotIntegrityError(`page ${page} has rank ${row.rank} where ${expectedRank} was expected`);
      }
      rows.push([row.rank, row.accountId, row.rating]);
    });
  });

  if (Math.abs(rows.length - expectedTotalSize) > growthTolerance(expectedTotalSize)) {
    throw new SnapshotIntegrityError(`assembled ${rows.length} rows but the board reported ${expectedTotalSize}`);
  }

  return { v: 1, ...board, seasonId, generatedAt, totalSize: rows.length, rows };
}

export function snapshotKey({ region, mode, seasonId, generatedAt }: Snapshot): string {
  return `snapshots/${region}/${mode}/${seasonId}/${generatedAt}.json`;
}

export function serializeSnapshot(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeSnapshot(json: string): Snapshot {
  const value = JSON.parse(json) as Partial<Snapshot>;
  if (value.v !== 1 || !Array.isArray(value.rows)) {
    throw new Error(`Unsupported snapshot format (v=${String(value.v)})`);
  }
  return value as Snapshot;
}

/** First index whose rank is greater than `rank` (rows are rank-ordered). */
function upperBound(rows: readonly SnapshotRow[], rank: number): number {
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (rows[mid]![0] <= rank) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * One leaderboard page, selected by rank range rather than array position:
 * merged snapshots can have gaps below the top pages, and page links are
 * computed from ranks.
 */
export function slicePage(snapshot: Snapshot, page: number): { page: number; totalPages: number; rows: SnapshotRow[] } {
  const lastRank = snapshot.rows.at(-1)?.[0] ?? 0;
  const from = (page - 1) * PAGE_SIZE;
  return {
    page,
    totalPages: Math.ceil(lastRank / PAGE_SIZE),
    rows: page < 1 ? [] : snapshot.rows.slice(upperBound(snapshot.rows, from), upperBound(snapshot.rows, from + PAGE_SIZE)),
  };
}

/**
 * Combines a fresh crawl of the top pages with the rest of the previous
 * snapshot. A player who climbed into the top would otherwise appear twice,
 * so deep rows whose name is now in the top are dropped; players who fell out
 * of the top reappear at the next full crawl.
 */
export function mergeTopRefresh(previous: Snapshot, top: Snapshot, totalSize: number): Snapshot {
  if (previous.region !== top.region || previous.mode !== top.mode || previous.seasonId !== top.seasonId) {
    throw new SnapshotIntegrityError("cannot merge snapshots from different boards or seasons");
  }
  const cutoff = top.rows.at(-1)?.[0] ?? 0;
  const inTop = new Set(top.rows.map(([, accountId]) => accountId));
  const deep = previous.rows.filter(([rank, accountId]) => rank > cutoff && !inTop.has(accountId));
  return {
    ...top,
    totalSize,
    deepGeneratedAt: previous.deepGeneratedAt ?? previous.generatedAt,
    rows: [...top.rows, ...deep],
  };
}
