import { describe, expect, it } from "vitest";
import type { Snapshot } from "../src/snapshot";
import { rankChanges, ratingCutoffs } from "../src/standings";

function board(size: number, rated = true): Snapshot {
  return {
    v: 1,
    region: "AP",
    mode: rated ? "arena" : "standard",
    seasonId: 56,
    generatedAt: 0,
    totalSize: size,
    rows: Array.from({ length: size }, (_, index) => [index + 1, `p${index + 1}`, rated ? 9 - index / 1000 : null]),
  };
}

describe("ratingCutoffs", () => {
  it("reports the rating needed for each milestone rank the board reaches", () => {
    expect(ratingCutoffs(board(150))).toEqual([
      { rank: 1, rating: 9 },
      { rank: 10, rating: 8.991 },
      { rank: 100, rating: 8.901 },
    ]);
  });

  it("has nothing to report on boards without ratings", () => {
    expect(ratingCutoffs(board(150, false))).toEqual([]);
  });
});

describe("rankChanges", () => {
  const rows = [
    [1, "Sinah", null],
    [2, "Riser", null],
    [3, "Faller", null],
    [4, "Rookie", null],
  ] as const;

  it("compares each row with the same name's previous rank (positive means up)", () => {
    const previous = [
      { name: "sinah", rank: 1 },
      { name: "riser", rank: 9 },
      { name: "faller", rank: 2 },
    ];
    expect(rankChanges(rows, previous)).toEqual([0, 7, -1, "new"]);
  });

  it("pairs namesakes with their nearest previous ranks", () => {
    const namesakes = [
      [1, "Sinah", null],
      [40, "sinah", null],
    ] as const;
    const previous = [
      { name: "sinah", rank: 45 },
      { name: "sinah", rank: 3 },
    ];
    expect(rankChanges(namesakes, previous)).toEqual([2, 5]);
  });
});
