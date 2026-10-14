import { describe, expect, it } from "vitest";
import { changedRows, dailyArchiveKey, historyRows, isDailyCaptureWindow, kstDay, traceSeries } from "../src/history";
import type { Snapshot } from "../src/snapshot";

describe("kstDay", () => {
  it("uses the Korea calendar day", () => {
    expect(kstDay(Date.UTC(2026, 9, 5, 14, 59))).toBe("2026-10-05"); // 23:59 KST
    expect(kstDay(Date.UTC(2026, 9, 5, 15, 0))).toBe("2026-10-06"); // 00:00 KST
  });
});

describe("isDailyCaptureWindow", () => {
  it("opens for the last ten minutes of the KST day", () => {
    expect(isDailyCaptureWindow(Date.UTC(2026, 9, 5, 14, 49))).toBe(false); // 23:49 KST
    expect(isDailyCaptureWindow(Date.UTC(2026, 9, 5, 14, 50))).toBe(true); // 23:50 KST
    expect(isDailyCaptureWindow(Date.UTC(2026, 9, 5, 14, 59))).toBe(true);
    expect(isDailyCaptureWindow(Date.UTC(2026, 9, 5, 15, 0))).toBe(false);
  });
});

describe("historyRows", () => {
  it("stores normalized names so lookups are case-insensitive", () => {
    const snapshot: Snapshot = {
      v: 1,
      region: "AP",
      mode: "arena",
      seasonId: 56,
      generatedAt: 0,
      totalSize: 2,
      rows: [
        [1, "Sinah", 7.7],
        [2, "ＡＢＣ", null],
      ],
    };
    expect(historyRows(snapshot)).toEqual([
      [1, "sinah", 7.7],
      [2, "abc", null],
    ]);
  });
});

describe("dailyArchiveKey", () => {
  it("keeps one immutable archive per board, season and day", () => {
    expect(dailyArchiveKey({ region: "EU", mode: "wild" }, 156, "2026-10-05")).toBe("daily/EU/wild/156/2026-10-05.json");
  });
});

const byDay = (point: { day: string }) => point.day;

describe("traceSeries", () => {
  it("returns one point per day for a unique name", () => {
    const points = [
      { day: "2026-10-01", rank: 40, rating: 7 },
      { day: "2026-10-02", rank: 30, rating: 7.2 },
    ];
    expect(traceSeries(points, 30, byDay)).toEqual(points);
  });

  it("follows the namesake whose rank stays closest, walking back from today", () => {
    const points = [
      { day: "2026-10-01", rank: 2, rating: null },
      { day: "2026-10-01", rank: 300, rating: null },
      { day: "2026-10-02", rank: 1, rating: null },
      { day: "2026-10-02", rank: 280, rating: null },
      { day: "2026-10-03", rank: 1, rating: null },
      { day: "2026-10-03", rank: 250, rating: null },
    ];
    expect(traceSeries(points, 250, byDay).map((p) => p.rank)).toEqual([300, 280, 250]);
    expect(traceSeries(points, 1, byDay).map((p) => p.rank)).toEqual([2, 1, 1]);
  });

  it("skips days the player was not ranked", () => {
    const points = [
      { day: "2026-10-01", rank: 10, rating: null },
      { day: "2026-10-03", rank: 12, rating: null },
    ];
    expect(traceSeries(points, 12, byDay).map((p) => p.day)).toEqual(["2026-10-01", "2026-10-03"]);
  });
});

describe("traceSeries over measurement times", () => {
  it("groups by timestamp in time order, not string order", () => {
    const points = [
      { at: 9_000, rank: 3, rating: null },
      { at: 10_000, rank: 2, rating: null },
      { at: 100_000, rank: 1, rating: null },
    ];
    expect(traceSeries(points, 1, (point) => point.at).map((p) => p.at)).toEqual([9_000, 10_000, 100_000]);
  });
});

describe("changedRows", () => {
  const base = {
    v: 1,
    region: "AP",
    mode: "standard",
    seasonId: 156,
    generatedAt: 0,
  } as const;
  const snap = (rows: Array<[number, string, number | null]>, overrides: Partial<Snapshot> = {}): Snapshot => ({
    ...base,
    totalSize: rows.length,
    rows,
    ...overrides,
  });

  it("records every row when there is nothing to compare with", () => {
    const next = snap([
      [1, "Sinah", null],
      [2, "Other", null],
    ]);
    expect(changedRows(null, next)).toEqual([
      [1, "sinah", null],
      [2, "other", null],
    ]);
    expect(changedRows(snap([[1, "Sinah", null]], { seasonId: 155 }), next)).toHaveLength(2);
  });

  it("records only names whose rank or rating changed", () => {
    const previous = snap([
      [1, "A", 7],
      [2, "B", 6.5],
      [3, "C", 6],
    ]);
    const next = snap([
      [1, "B", 7.1],
      [2, "A", 7],
      [3, "C", 6],
    ]);
    expect(changedRows(previous, next)).toEqual([
      [1, "b", 7.1],
      [2, "a", 7],
    ]);
    expect(changedRows(next, next)).toEqual([]);
  });

  it("records a rating change at the same rank", () => {
    expect(changedRows(snap([[1, "A", 7]]), snap([[1, "A", 7.2]]))).toEqual([[1, "a", 7.2]]);
  });

  it("writes every namesake row when any of them moved, so each timestamp holds the whole group", () => {
    const previous = snap([
      [1, "Sinah", null],
      [2, "x", null],
      [3, "sinah", null],
    ]);
    const next = snap([
      [1, "Sinah", null],
      [2, "sinah", null],
      [3, "x", null],
    ]);
    expect(changedRows(previous, next)).toEqual([
      [1, "sinah", null],
      [2, "sinah", null],
      [3, "x", null],
    ]);
  });

  it("writes nothing for a name that left the board", () => {
    expect(changedRows(snap([[1, "A", null], [2, "B", null]]), snap([[1, "A", null]]))).toEqual([]);
  });
});
