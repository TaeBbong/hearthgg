import { describe, expect, it } from "vitest";
import { dailySeries, liveSeries } from "./trend";

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
