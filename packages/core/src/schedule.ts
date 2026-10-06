import type { LeaderboardPage } from "./blizzard";

/**
 * Hash of the first page (rows + board size). Blizzard's ETag differs per
 * request even for identical bodies, so change detection has to be ours.
 */
export async function pageFingerprint(page: LeaderboardPage): Promise<string> {
  const payload = JSON.stringify([page.seasonId, page.totalSize, page.rows]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
