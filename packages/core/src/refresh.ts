const MINUTE = 60_000;

/** Pages refreshed often: ranks 1–1,000, where nearly all lookups land. */
export const TOP_PAGES = 40;
/** Minimum gap between top refreshes of one board. */
export const TOP_INTERVAL_MS = 10 * MINUTE;
/** Re-read the top pages this often even if page 1 looks unchanged (deeper reshuffles). */
export const TOP_MAX_STALENESS_MS = 60 * MINUTE;
/** The whole board (ranks beyond the top pages) is re-crawled this often. */
export const FULL_INTERVAL_MS = 120 * MINUTE;

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
export function decideRefresh(state: RefreshState | null, probe: Probe, now: number): RefreshDecision {
  const full = (reason: "initial" | "new-season" | "deep-due", urgency: number) =>
    ({ refresh: true, kind: "full", reason, pages: probe.totalPages, urgency }) as const;

  if (!state) return full("initial", Infinity);
  if (state.seasonId !== probe.seasonId) return full("new-season", Infinity);

  const fitsInTop = probe.totalPages <= TOP_PAGES;
  if (!fitsInTop) {
    const fullAge = state.fullRefreshedAt === null ? Infinity : now - state.fullRefreshedAt;
    if (fullAge >= FULL_INTERVAL_MS) return full("deep-due", fullAge / FULL_INTERVAL_MS);
  }

  const topAge = state.topRefreshedAt === null ? Infinity : now - state.topRefreshedAt;
  const top = (reason: "changed" | "stale") =>
    ({
      refresh: true,
      kind: fitsInTop ? "full" : "top",
      reason,
      pages: Math.min(TOP_PAGES, probe.totalPages),
      urgency: topAge / TOP_INTERVAL_MS,
    }) as const;

  if (probe.fingerprint === state.fingerprint) {
    return topAge > TOP_MAX_STALENESS_MS ? top("stale") : { refresh: false, reason: "unchanged" };
  }
  return topAge < TOP_INTERVAL_MS ? { refresh: false, reason: "too-soon" } : top("changed");
}
