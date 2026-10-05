import { describe, expect, it } from "vitest";
import { dailyArchiveKey, historyRows, isDailyCaptureWindow, kstDay, traceSeries } from "../src/history";
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

describe("traceSeries", () => {
  it("returns one point per day for a unique name", () => {
    const points = [
      { day: "2026-10-01", rank: 40, rating: 7 },
      { day: "2026-10-02", rank: 30, rating: 7.2 },
    ];
    expect(traceSeries(points, 30)).toEqual(points);
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
    expect(traceSeries(points, 250).map((p) => p.rank)).toEqual([300, 280, 250]);
    expect(traceSeries(points, 1).map((p) => p.rank)).toEqual([2, 1, 1]);
  });

  it("skips days the player was not ranked", () => {
    const points = [
      { day: "2026-10-01", rank: 10, rating: null },
      { day: "2026-10-03", rank: 12, rating: null },
    ];
    expect(traceSeries(points, 12).map((p) => p.day)).toEqual(["2026-10-01", "2026-10-03"]);
  });
});
