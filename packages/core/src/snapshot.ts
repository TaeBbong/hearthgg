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

export function slicePage(snapshot: Snapshot, page: number): { page: number; totalPages: number; rows: SnapshotRow[] } {
  const start = (page - 1) * PAGE_SIZE;
  return {
    page,
    totalPages: Math.ceil(snapshot.rows.length / PAGE_SIZE),
    rows: start < 0 ? [] : snapshot.rows.slice(start, start + PAGE_SIZE),
  };
}
