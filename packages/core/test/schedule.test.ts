import { describe, expect, it } from "vitest";
import { MAX_STALENESS_MS, crawlIntervalMs, decideCrawl, pageFingerprint } from "../src/schedule";
import { parseLeaderboardPage } from "../src/blizzard";
import standardPage from "./fixtures/ap-standard-page1.json";

const MINUTE = 60_000;
const page = parseLeaderboardPage(standardPage);

describe("pageFingerprint", () => {
  it("is stable for identical content", async () => {
    expect(await pageFingerprint(page)).toBe(await pageFingerprint(structuredClone(page)));
  });

  it("changes when rows move", async () => {
    const swapped = { ...page, rows: [page.rows[1]!, page.rows[0]!, ...page.rows.slice(2)] };
    expect(await pageFingerprint(swapped)).not.toBe(await pageFingerprint(page));
  });

  it("changes when the board grows even if the top page is unchanged", async () => {
    expect(await pageFingerprint({ ...page, totalSize: page.totalSize + 1 })).not.toBe(await pageFingerprint(page));
  });
});

describe("crawlIntervalMs", () => {
  it("crawls small boards often and large boards politely", () => {
    expect(crawlIntervalMs(10)).toBe(5 * MINUTE);
    expect(crawlIntervalMs(300)).toBe(10 * MINUTE);
    expect(crawlIntervalMs(1500)).toBe(20 * MINUTE);
    expect(crawlIntervalMs(5000)).toBe(30 * MINUTE);
  });
});

describe("decideCrawl", () => {
  const now = Date.UTC(2026, 9, 5, 12, 0);
  const probe = { seasonId: 156, fingerprint: "b", totalPages: 31 };
  const state = { seasonId: 156, fingerprint: "a", lastSuccessAt: now - 6 * MINUTE };

  it("crawls a board seen for the first time", () => {
    expect(decideCrawl(null, probe, now)).toEqual({ crawl: true, reason: "initial" });
  });

  it("crawls immediately when the season rolls over", () => {
    expect(decideCrawl({ ...state, lastSuccessAt: now }, { ...probe, seasonId: 157 }, now)).toEqual({
      crawl: true,
      reason: "new-season",
    });
  });

  it("skips when the top page is unchanged", () => {
    expect(decideCrawl({ ...state, fingerprint: "b" }, probe, now)).toEqual({ crawl: false, reason: "unchanged" });
  });

  it("respects the board's crawl interval", () => {
    expect(decideCrawl({ ...state, lastSuccessAt: now - 2 * MINUTE }, probe, now)).toEqual({
      crawl: false,
      reason: "too-soon",
    });
    expect(decideCrawl(state, probe, now)).toEqual({ crawl: true, reason: "changed" });
  });

  it("re-crawls an unchanged-looking board once it is too stale", () => {
    const stale = { ...state, fingerprint: "b", lastSuccessAt: now - MAX_STALENESS_MS - 1 };
    expect(decideCrawl(stale, probe, now)).toEqual({ crawl: true, reason: "stale" });
  });

  it("retries a board that never succeeded", () => {
    expect(decideCrawl({ ...state, lastSuccessAt: null }, probe, now)).toEqual({ crawl: true, reason: "changed" });
  });
});
