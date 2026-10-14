import { describe, expect, it } from "vitest";
import { dailySeries, liveSeries, trendSummary } from "./trend";

const T = Date.UTC(2026, 9, 14, 5, 0); // 14:00 KST
const MINUTE = 60_000;

describe("liveSeries", () => {
  it("follows the player's own namesake and holds the current rank until the latest snapshot", () => {
    const points = [
      { at: T, rank: 5, rating: 7 },
      { at: T, rank: 40, rating: 6 },
      { at: T + 10 * MINUTE, rank: 3, rating: 7.2 },
      { at: T + 10 * MINUTE, rank: 40, rating: 6 },
    ];
    expect(liveSeries(points, [3, "Sinah", 7.2], T + 30 * MINUTE)).toEqual([
      { at: T, rank: 5, rating: 7 },
      { at: T + 10 * MINUTE, rank: 3, rating: 7.2 },
      { at: T + 30 * MINUTE, rank: 3, rating: 7.2 },
    ]);
  });

  it("does not repeat the last point when it is the latest snapshot", () => {
    const points = [{ at: T, rank: 3, rating: null }];
    expect(liveSeries(points, [3, "Sinah", null], T)).toEqual(points);
  });

  it("returns nothing when no change was recorded yet", () => {
    expect(liveSeries([], [3, "Sinah", null], T)).toEqual([]);
  });
});

describe("dailySeries", () => {
  it("traces the namesake and places each closing rank on its day", () => {
    const points = [
      { day: "2026-10-01", rank: 5, rating: null },
      { day: "2026-10-01", rank: 40, rating: null },
      { day: "2026-10-02", rank: 3, rating: null },
    ];
    expect(dailySeries(points, 3)).toEqual([
      { at: Date.parse("2026-10-01"), rank: 5, rating: null },
      { at: Date.parse("2026-10-02"), rank: 3, rating: null },
    ]);
  });
});

describe("trendSummary", () => {
  const observedAt = Date.UTC(2026, 9, 14, 9, 0); // 18:00 KST, Oct 14
  const daily = [
    { day: "2026-10-12", rank: 2, rating: null },
    { day: "2026-10-13", rank: 6, rating: null },
    { day: "2026-10-13", rank: 50, rating: null },
  ];
  const points = [
    { at: Date.UTC(2026, 9, 14, 3, 0), rank: 4, rating: null },
    { at: Date.UTC(2026, 9, 14, 3, 0), rank: 50, rating: null },
  ];

  it("reports the best recorded rank and the change since the previous close", () => {
    expect(trendSummary({ daily, points, entry: [4, "Sinah", null], observedAt })).toEqual({
      best: { rank: 2, at: Date.parse("2026-10-12") },
      change: 2,
      baselineDay: "2026-10-13",
    });
  });

  it("ignores today's own close and counts the current rank as a candidate for the best", () => {
    const withToday = [...daily, { day: "2026-10-14", rank: 4, rating: null }];
    expect(trendSummary({ daily: withToday, points: [], entry: [1, "Sinah", null], observedAt })).toMatchObject({
      best: { rank: 1, at: observedAt },
      change: 5,
      baselineDay: "2026-10-13",
    });
  });

  it("has nothing to say without any recorded history", () => {
    expect(trendSummary({ daily: [], points: [], entry: [4, "Sinah", null], observedAt })).toEqual({ best: null, change: null, baselineDay: null });
  });
});
