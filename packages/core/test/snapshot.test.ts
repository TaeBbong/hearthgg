import { describe, expect, it } from "vitest";
import { parseLeaderboardPage, type LeaderboardPage } from "../src/blizzard";
import { PAGE_SIZE } from "../src/domain";
import {
  SnapshotIntegrityError,
  assembleSnapshot,
  mergeTopRefresh,
  deserializeSnapshot,
  serializeSnapshot,
  slicePage,
  snapshotKey,
} from "../src/snapshot";
import wildBoard from "./fixtures/ap-wild-board.json";
import type { Snapshot } from "../src/snapshot";

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

  it("leaves out a page Blizzard serves empty mid-board", () => {
    const glitched = input().pages.map((entry) => (entry.page === 2 ? { ...entry, data: { ...entry.data, rows: [] } } : entry));
    const snapshot = assembleSnapshot(input({ pages: glitched }));
    expect(slicePage(snapshot, 2).rows).toEqual([]);
    expect(slicePage(snapshot, 3).rows[0]?.[0]).toBe(2 * PAGE_SIZE + 1);
    // The board still has those players; only their page is unavailable.
    expect(snapshot.totalSize).toBe(expectedTotalSize);
  });

  it("rejects more empty pages than an upstream glitch explains", () => {
    const hollow = input().pages.map((entry) =>
      entry.page >= 2 && entry.page <= 4 ? { ...entry, data: { ...entry.data, rows: [] } } : entry,
    );
    expect(() => assembleSnapshot(input({ pages: hollow }))).toThrow(/page 4 has 0 rows/);
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

function namedBoard(names: string[], generatedAt: number, overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    v: 1,
    region: "AP",
    mode: "arena",
    seasonId: 56,
    generatedAt,
    totalSize: names.length,
    rows: names.map((name, index) => [index + 1, name, null]),
    ...overrides,
  };
}

describe("mergeTopRefresh", () => {
  const previous = namedBoard(["a", "b", "c", "d", "e", "f"], 100);

  it("takes fresh top rows and keeps the older rows below them", () => {
    const top = namedBoard(["b", "a", "x"], 200);
    const merged = mergeTopRefresh(previous, top, 7);
    expect(merged.rows.map(([rank, name]) => [rank, name])).toEqual([
      [1, "b"],
      [2, "a"],
      [3, "x"],
      [4, "d"],
      [5, "e"],
      [6, "f"],
    ]);
    expect(merged).toMatchObject({ generatedAt: 200, deepGeneratedAt: 100, totalSize: 7 });
  });

  it("drops a deep row whose player now appears in the fresh top", () => {
    const top = namedBoard(["a", "b", "e"], 200);
    expect(mergeTopRefresh(previous, top, 6).rows.map(([rank, name]) => [rank, name])).toEqual([
      [1, "a"],
      [2, "b"],
      [3, "e"],
      [4, "d"],
      [6, "f"],
    ]);
  });

  it("keeps the deep part's original timestamp across repeated top refreshes", () => {
    const once = mergeTopRefresh(previous, namedBoard(["a", "b", "c"], 200), 6);
    expect(mergeTopRefresh(once, namedBoard(["a", "b", "c"], 300), 6).deepGeneratedAt).toBe(100);
  });

  it("refuses to merge different boards or seasons", () => {
    expect(() => mergeTopRefresh(previous, namedBoard(["a"], 200, { seasonId: 57 }), 1)).toThrow(SnapshotIntegrityError);
  });
});

describe("slicePage with rank gaps", () => {
  it("selects rows by rank range so pages match rank links", () => {
    const gappy: Snapshot = { ...namedBoard([], 0), rows: [[1, "a", null], [26, "z", null], [27, "y", null], [52, "q", null]] };
    expect(slicePage(gappy, 2).rows.map(([rank]) => rank)).toEqual([26, 27]);
    expect(slicePage(gappy, 3).rows.map(([rank]) => rank)).toEqual([52]);
    expect(slicePage(gappy, 3).totalPages).toBe(3);
  });
});
