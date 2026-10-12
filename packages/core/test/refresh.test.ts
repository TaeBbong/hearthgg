import { describe, expect, it } from "vitest";
import {
  FULL_INTERVAL_MS,
  TOP_INTERVAL_MS,
  TOP_MAX_STALENESS_MS,
  TOP_PAGES,
  compareRefreshPriority,
  decideRefresh,
  refreshPolicyFor,
} from "../src/refresh";

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 9, 6, 12);

const bigProbe = { seasonId: 56, fingerprint: "new", totalPages: 455 };
const smallProbe = { seasonId: 156, fingerprint: "new", totalPages: 31 };
const fresh = { seasonId: 56, fingerprint: "old", topRefreshedAt: NOW - 11 * MINUTE, fullRefreshedAt: NOW - 30 * MINUTE };

describe("decideRefresh", () => {
  it("does a full crawl for a board with no snapshot yet, ahead of everything", () => {
    expect(decideRefresh(null, bigProbe, NOW)).toEqual({ refresh: true, kind: "full", reason: "initial", pages: 455, urgency: Infinity });
  });

  it("does a full crawl when the season rolls over", () => {
    expect(decideRefresh({ ...fresh, seasonId: 55 }, bigProbe, NOW)).toMatchObject({ kind: "full", reason: "new-season", urgency: Infinity });
  });

  it("refreshes only the top pages of a big board when page 1 changed", () => {
    expect(decideRefresh(fresh, bigProbe, NOW)).toEqual({
      refresh: true,
      kind: "top",
      reason: "changed",
      pages: TOP_PAGES,
      urgency: (11 * MINUTE) / TOP_INTERVAL_MS,
    });
  });

  it("waits out the top interval even if page 1 changed", () => {
    expect(decideRefresh({ ...fresh, topRefreshedAt: NOW - 5 * MINUTE }, bigProbe, NOW)).toEqual({ refresh: false, reason: "too-soon" });
  });

  it("re-reads the top pages after a while even when page 1 looks unchanged", () => {
    expect(decideRefresh({ ...fresh, fingerprint: "new" }, bigProbe, NOW)).toEqual({ refresh: false, reason: "unchanged" });
    const stale = { ...fresh, fingerprint: "new", topRefreshedAt: NOW - TOP_MAX_STALENESS_MS - MINUTE };
    expect(decideRefresh(stale, bigProbe, NOW)).toMatchObject({ refresh: true, kind: "top", reason: "stale" });
  });

  it("crawls the whole board when the deep part is due, ranked by how overdue it is", () => {
    const due = { ...fresh, fullRefreshedAt: NOW - 2 * FULL_INTERVAL_MS };
    expect(decideRefresh(due, bigProbe, NOW)).toEqual({ refresh: true, kind: "full", reason: "deep-due", pages: 455, urgency: 2 });
  });

  it("treats boards that fit in the top pages as full crawls on the top schedule", () => {
    const small = { ...fresh, seasonId: 156, fullRefreshedAt: NOW - 3 * FULL_INTERVAL_MS };
    expect(decideRefresh(small, smallProbe, NOW)).toMatchObject({ refresh: true, kind: "full", reason: "changed", pages: 31 });
  });
});

describe("regional priority", () => {
  it("refreshes AP on a faster clock than other regions", () => {
    expect(refreshPolicyFor("AP")).toEqual({ topIntervalMs: 5 * MINUTE, topMaxStalenessMs: 30 * MINUTE, fullIntervalMs: 60 * MINUTE });
    expect(refreshPolicyFor("US")).toEqual({ topIntervalMs: TOP_INTERVAL_MS, topMaxStalenessMs: TOP_MAX_STALENESS_MS, fullIntervalMs: FULL_INTERVAL_MS });
    expect(refreshPolicyFor("EU")).toEqual(refreshPolicyFor("US"));
  });

  it("applies the region's policy to refresh decisions", () => {
    const state = { ...fresh, topRefreshedAt: NOW - 6 * MINUTE, fullRefreshedAt: NOW - 30 * MINUTE };
    expect(decideRefresh(state, bigProbe, NOW, refreshPolicyFor("US"))).toEqual({ refresh: false, reason: "too-soon" });
    expect(decideRefresh(state, bigProbe, NOW, refreshPolicyFor("AP"))).toMatchObject({ refresh: true, kind: "top", urgency: 6 / 5 });

    const deep = { ...fresh, fullRefreshedAt: NOW - 70 * MINUTE };
    expect(decideRefresh(deep, bigProbe, NOW, refreshPolicyFor("US"))).toMatchObject({ kind: "top" });
    expect(decideRefresh(deep, bigProbe, NOW, refreshPolicyFor("AP"))).toMatchObject({ kind: "full", reason: "deep-due" });
  });

  it("orders AP first: weighted urgency, then region rank on ties", () => {
    const candidates = [
      { region: "US", urgency: 1.5 },
      { region: "AP", urgency: 1 },
      { region: "EU", urgency: Infinity },
      { region: "AP", urgency: Infinity },
      { region: "US", urgency: 3 },
    ] as const;
    expect(candidates.toSorted(compareRefreshPriority).map((c) => `${c.region}:${c.urgency}`)).toEqual([
      "AP:Infinity",
      "EU:Infinity",
      "US:3",
      "AP:1",
      "US:1.5",
    ]);
  });
});
