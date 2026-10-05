import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Mode, Region } from "@hearthgg/core/domain";
import { connection } from "next/server";
import { cache } from "react";
import { CloudflareStore } from "./cloudflare-store";
import { LeaderboardService, type ServiceCaches } from "./leaderboard-service";
import { TtlLru } from "./lru";

// Module scope outlives a request inside one isolate (cross-request LRU);
// React.cache below dedupes calls within a single request.
const caches: ServiceCaches = {
  pointers: new TtlLru({ maxEntries: 1, ttlMs: 30_000 }),
  indexes: new TtlLru({ maxEntries: 24 }),
  history: new TtlLru({ maxEntries: 500, ttlMs: 10 * 60_000 }),
};

const getService = cache(async () => {
  // Leaderboards are live data: never bake them into the prerendered shell.
  await connection();
  const { env } = await getCloudflareContext({ async: true });
  return new LeaderboardService(new CloudflareStore(env.DB, env.SNAPSHOTS), caches);
});

export const searchPlayers = cache(async (query: string, limit = 50) => (await getService()).search(query, limit));

// Primitive arguments only: React.cache compares arguments by identity.
export const getLeaderboard = cache(async (region: Region, mode: Mode, seasonId: number | undefined, page: number) =>
  (await getService()).leaderboard({ region, mode }, seasonId, page),
);

export const getPlayer = cache(async (region: Region, mode: Mode, seasonId: number, name: string) =>
  (await getService()).player({ region, mode }, seasonId, name),
);

export const getHistory = cache(async (region: Region, mode: Mode, seasonId: number, name: string) =>
  (await getService()).history({ region, mode }, seasonId, name),
);

export const getOverview = cache(async () => (await getService()).overview(3));

export const getUpstreamBlock = cache(async () => (await getService()).upstreamBlockedUntil());

export const getBoardStatus = cache(async () => (await getService()).status());
