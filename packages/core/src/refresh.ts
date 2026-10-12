import type { Region } from "./domain";

const MINUTE = 60_000;

/** Pages refreshed often: ranks 1–1,000, where nearly all lookups land. */
export const TOP_PAGES = 40;
/** Minimum gap between top refreshes of one board. */
export const TOP_INTERVAL_MS = 10 * MINUTE;
/** Re-read the top pages this often even if page 1 looks unchanged (deeper reshuffles). */
export const TOP_MAX_STALENESS_MS = 60 * MINUTE;
/** The whole board (ranks beyond the top pages) is re-crawled this often. */
export const FULL_INTERVAL_MS = 120 * MINUTE;

export interface RefreshPolicy {
  topIntervalMs: number;
  topMaxStalenessMs: number;
  fullIntervalMs: number;
}

export const DEFAULT_POLICY: RefreshPolicy = {
  topIntervalMs: TOP_INTERVAL_MS,
  topMaxStalenessMs: TOP_MAX_STALENESS_MS,
  fullIntervalMs: FULL_INTERVAL_MS,
};

/** The service starts with the Korean community, so AP data is kept fresher. */
export const PRIORITY_POLICY: RefreshPolicy = {
  topIntervalMs: 5 * MINUTE,
  topMaxStalenessMs: 30 * MINUTE,
  fullIntervalMs: 60 * MINUTE,
};

export const PRIORITY_REGION: Region = "AP";
/** How much more an equally overdue priority-region board counts when budget is short. */
const PRIORITY_WEIGHT = 2;
/** Tie-break order when urgency is equal (e.g. several boards never crawled). */
const REGION_RANK: Record<Region, number> = { AP: 0, US: 1, EU: 2 };

export function refreshPolicyFor(region: Region): RefreshPolicy {
  return region === PRIORITY_REGION ? PRIORITY_POLICY : DEFAULT_POLICY;
}

/** Sort comparator for refresh candidates: weighted urgency (desc), then region rank. */
export function compareRefreshPriority(a: { region: Region; urgency: number }, b: { region: Region; urgency: number }): number {
  const weight = (c: { region: Region; urgency: number }) => (c.region === PRIORITY_REGION ? c.urgency * PRIORITY_WEIGHT : c.urgency);
  const [wa, wb] = [weight(a), weight(b)];
  if (wa !== wb) return wb > wa ? 1 : -1;
  return REGION_RANK[a.region] - REGION_RANK[b.region];
}

export interface RefreshState {
  seasonId: number;
  fingerprint: string | null;
  /** Data time of the last published top part (every snapshot includes one). */
  topRefreshedAt: number | null;
  /** Data time of the last full crawl, i.e. of the ranks below the top pages. */
  fullRefreshedAt: number | null;
}

export interface Probe {
  seasonId: number;
  fingerprint: string;
  totalPages: number;
}

export type RefreshKind = "full" | "top";

export type RefreshDecision =
  | {
      refresh: true;
      kind: RefreshKind;
      reason: "initial" | "new-season" | "deep-due" | "changed" | "stale";
      pages: number;
      /** How overdue relative to its target interval; higher runs first when budget is short. */
      urgency: number;
    }
  | { refresh: false; reason: "unchanged" | "too-soon" };

/**
 * Tiered refresh: the top pages follow page-1 changes closely, the rest of a
 * board is re-crawled on a slower clock. Ranking by "overdue ratio" lets the
 * slow tier win once it has waited long enough, so it is never starved.
 */
export function decideRefresh(
  state: RefreshState | null,
  probe: Probe,
  now: number,
  policy: RefreshPolicy = DEFAULT_POLICY,
): RefreshDecision {
  const full = (reason: "initial" | "new-season" | "deep-due", urgency: number) =>
    ({ refresh: true, kind: "full", reason, pages: probe.totalPages, urgency }) as const;

  if (!state) return full("initial", Infinity);
  if (state.seasonId !== probe.seasonId) return full("new-season", Infinity);

  const fitsInTop = probe.totalPages <= TOP_PAGES;
  if (!fitsInTop) {
    const fullAge = state.fullRefreshedAt === null ? Infinity : now - state.fullRefreshedAt;
    if (fullAge >= policy.fullIntervalMs) return full("deep-due", fullAge / policy.fullIntervalMs);
  }

  const topAge = state.topRefreshedAt === null ? Infinity : now - state.topRefreshedAt;
  const top = (reason: "changed" | "stale") =>
    ({
      refresh: true,
      kind: fitsInTop ? "full" : "top",
      reason,
      pages: Math.min(TOP_PAGES, probe.totalPages),
      urgency: topAge / policy.topIntervalMs,
    }) as const;

  if (probe.fingerprint === state.fingerprint) {
    return topAge > policy.topMaxStalenessMs ? top("stale") : { refresh: false, reason: "unchanged" };
  }
  return topAge < policy.topIntervalMs ? { refresh: false, reason: "too-soon" } : top("changed");
}
