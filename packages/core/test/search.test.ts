import { describe, expect, it } from "vitest";
import type { Snapshot } from "../src/snapshot";
import { buildSearchIndex, findExact, search } from "../src/search";

function snapshot(overrides: Partial<Snapshot>, names: Array<[string, number | null]>): Snapshot {
  return {
    v: 1,
    region: "AP",
    mode: "standard",
    seasonId: 156,
    generatedAt: 0,
    totalSize: names.length,
    rows: names.map(([name, rating], index) => [index + 1, name, rating]),
    ...overrides,
  };
}

const apStandard = buildSearchIndex(
  snapshot({}, [
    ["Sinah", null],
    ["sinahfan", null],
    ["XxSinahxX", null],
    ["Other", null],
    ["sinah", null], // same display name as rank 1, different case
  ]),
);
const euArena = buildSearchIndex(
  snapshot({ region: "EU", mode: "arena", seasonId: 56 }, [
    ["Nobody", 7.1],
    ["SINAH", 6.9],
  ]),
);

describe("search", () => {
  it("returns nothing for a blank query", () => {
    expect(search([apStandard], "  ").hits).toEqual([]);
  });

  it("matches case-insensitively across every board", () => {
    const { hits, total } = search([apStandard, euArena], "sinah");
    expect(total).toBe(5);
    expect(hits.map((hit) => [hit.region, hit.mode, hit.accountId])).toContainEqual(["EU", "arena", "SINAH"]);
  });

  it("breaks rank ties by board order: AP, US, EU", () => {
    const board = (region: Snapshot["region"]) => buildSearchIndex(snapshot({ region, mode: "arena", seasonId: 56 }, [["Champ", 7]]));
    const { hits } = search([board("EU"), board("US"), board("AP")], "champ");
    expect(hits.map((hit) => hit.region)).toEqual(["AP", "US", "EU"]);
  });

  it("orders exact > prefix > contains, then by rank", () => {
    const { hits } = search([apStandard, euArena], "sinah");
    expect(hits.map((hit) => [hit.match, hit.accountId, hit.rank])).toEqual([
      ["exact", "Sinah", 1],
      ["exact", "SINAH", 2],
      ["exact", "sinah", 5],
      ["prefix", "sinahfan", 2],
      ["contains", "XxSinahxX", 3],
    ]);
  });

  it("carries board context and rating on each hit", () => {
    const hit = search([euArena], "sinah").hits[0];
    expect(hit).toEqual({
      region: "EU",
      mode: "arena",
      seasonId: 56,
      rank: 2,
      accountId: "SINAH",
      rating: 6.9,
      match: "exact",
    });
  });

  it("limits hits but reports the full total", () => {
    const { hits, total } = search([apStandard, euArena], "sinah", { limit: 2 });
    expect(hits).toHaveLength(2);
    expect(total).toBe(5);
  });
});

describe("findExact", () => {
  it("finds every row sharing a normalized name in one board", () => {
    expect(findExact(apStandard, "SINAH").map(([rank]) => rank)).toEqual([1, 5]);
    expect(findExact(apStandard, "nobody")).toEqual([]);
  });
});
