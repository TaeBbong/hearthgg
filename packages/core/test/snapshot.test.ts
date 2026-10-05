import { describe, expect, it } from "vitest";
import { parseLeaderboardPage, type LeaderboardPage } from "../src/blizzard";
import {
  SnapshotIntegrityError,
  assembleSnapshot,
  deserializeSnapshot,
  serializeSnapshot,
  slicePage,
  snapshotKey,
} from "../src/snapshot";
import wildBoard from "./fixtures/ap-wild-board.json";

const board = { region: "AP", mode: "wild" } as const;
const pages: LeaderboardPage[] = wildBoard.map((page) => parseLeaderboardPage(page));
const expectedTotalSize = pages[0]!.totalSize;
const generatedAt = Date.UTC(2026, 9, 5, 6, 0);

function input(overrides: Partial<Parameters<typeof assembleSnapshot>[0]> = {}) {
  return {
    board,
    seasonId: 156,
    generatedAt,
    expectedTotalSize,
    pages: pages.map((data, index) => ({ page: index + 1, data })),
    ...overrides,
  };
}

describe("assembleSnapshot", () => {
  it("joins every page into compact rank-ordered rows", () => {
    const snapshot = assembleSnapshot(input());
    expect(snapshot.rows).toHaveLength(expectedTotalSize);
    expect(snapshot.rows[0]).toEqual([1, pages[0]!.rows[0]!.accountId, null]);
    expect(snapshot.rows.at(-1)?.[0]).toBe(expectedTotalSize);
    expect(snapshot).toMatchObject({ v: 1, ...board, seasonId: 156, generatedAt, totalSize: expectedTotalSize });
  });

  it("accepts pages in any order", () => {
    const shuffled = input().pages.toReversed();
    expect(assembleSnapshot(input({ pages: shuffled })).rows[0]?.[0]).toBe(1);
  });

  it("rejects a missing page", () => {
    const withGap = input().pages.filter(({ page }) => page !== 3);
    expect(() => assembleSnapshot(input({ pages: withGap }))).toThrow(SnapshotIntegrityError);
  });

  it("rejects a short page that is not the last one", () => {
    const broken = input().pages.map((entry) =>
      entry.page === 2 ? { ...entry, data: { ...entry.data, rows: entry.data.rows.slice(0, 10) } } : entry,
    );
    expect(() => assembleSnapshot(input({ pages: broken }))).toThrow(/page 2/);
  });

  it("rejects ranks that do not match their page position", () => {
    const shifted = input().pages.map((entry) =>
      entry.page === 4
        ? { ...entry, data: { ...entry.data, rows: entry.data.rows.map((row) => ({ ...row, rank: row.rank + 1 })) } }
        : entry,
    );
    expect(() => assembleSnapshot(input({ pages: shifted }))).toThrow(/rank/);
  });

  it("rejects pages from another season (rollover mid-crawl)", () => {
    const mixed = input().pages.map((entry) =>
      entry.page === 5 ? { ...entry, data: { ...entry.data, seasonId: 157 } } : entry,
    );
    expect(() => assembleSnapshot(input({ pages: mixed }))).toThrow(/season/);
  });

  it("tolerates small growth while crawling but rejects large drift", () => {
    expect(() => assembleSnapshot(input({ expectedTotalSize: expectedTotalSize - 10 }))).not.toThrow();
    expect(() => assembleSnapshot(input({ expectedTotalSize: expectedTotalSize * 2 }))).toThrow(/rows/);
  });

  it("builds an empty snapshot for an empty board", () => {
    const empty = assembleSnapshot(input({ expectedTotalSize: 0, pages: [] }));
    expect(empty.rows).toEqual([]);
  });
});

describe("snapshot storage", () => {
  it("round-trips through serialization", () => {
    const snapshot = assembleSnapshot(input());
    expect(deserializeSnapshot(serializeSnapshot(snapshot))).toEqual(snapshot);
  });

  it("refuses unknown formats", () => {
    expect(() => deserializeSnapshot(JSON.stringify({ v: 99 }))).toThrow();
  });

  it("uses immutable, versioned object keys", () => {
    expect(snapshotKey(assembleSnapshot(input()))).toBe(`snapshots/AP/wild/156/${generatedAt}.json`);
  });
});

describe("slicePage", () => {
  it("returns one leaderboard page of rows", () => {
    const snapshot = assembleSnapshot(input());
    const second = slicePage(snapshot, 2);
    expect(second.rows[0]?.[0]).toBe(26);
    expect(second.rows).toHaveLength(25);
    expect(second.totalPages).toBe(Math.ceil(expectedTotalSize / 25));
  });

  it("clamps out-of-range pages to an empty result", () => {
    expect(slicePage(assembleSnapshot(input()), 999).rows).toEqual([]);
  });
});
