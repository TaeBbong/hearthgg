import type { LeaderboardPage } from "./blizzard";

const MINUTE = 60_000;

/** Even when the top page looks unchanged, re-crawl after this long to catch deeper reshuffles. */
export const MAX_STALENESS_MS = 60 * MINUTE;

/**
 * Hash of the first page (rows + board size). Blizzard's ETag differs per
 * request even for identical bodies, so change detection has to be ours.
 */
export async function pageFingerprint(page: LeaderboardPage): Promise<string> {
  const payload = JSON.stringify([page.seasonId, page.totalSize, page.rows]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Bigger boards cost more upstream requests, so they are refreshed less often. */
export function crawlIntervalMs(totalPages: number): number {
  if (totalPages <= 100) return 5 * MINUTE;
  if (totalPages <= 1000) return 10 * MINUTE;
  if (totalPages <= 2000) return 20 * MINUTE;
  return 30 * MINUTE;
}

export interface CrawlState {
  seasonId: number;
  fingerprint: string | null;
  lastSuccessAt: number | null;
}

export interface Probe {
  seasonId: number;
  fingerprint: string;
  totalPages: number;
}

export type CrawlDecision =
  | { crawl: true; reason: "initial" | "new-season" | "changed" | "stale" }
  | { crawl: false; reason: "unchanged" | "too-soon" };

export function decideCrawl(state: CrawlState | null, probe: Probe, now: number): CrawlDecision {
  if (!state) return { crawl: true, reason: "initial" };
  if (probe.seasonId !== state.seasonId) return { crawl: true, reason: "new-season" };
  if (state.lastSuccessAt === null) return { crawl: true, reason: "changed" };

  const age = now - state.lastSuccessAt;
  if (probe.fingerprint === state.fingerprint) {
    return age > MAX_STALENESS_MS ? { crawl: true, reason: "stale" } : { crawl: false, reason: "unchanged" };
  }
  return age < crawlIntervalMs(probe.totalPages)
    ? { crawl: false, reason: "too-soon" }
    : { crawl: true, reason: "changed" };
}
