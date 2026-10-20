import { serializeSnapshot, type Snapshot } from "@hearthgg/core";
import { describe, expect, it, vi } from "vitest";
import { LeaderboardService, type ServiceCaches } from "./leaderboard-service";
import type { BoardPointer, LeaderboardStore } from "./store";
import { TtlLru } from "./lru";

const NOW = Date.UTC(2026, 9, 5, 12);

function snapshot(region: Snapshot["region"], mode: Snapshot["mode"], seasonId: number, names: string[]): Snapshot {
  return {
    v: 1,
    region,
    mode,
    seasonId,
    generatedAt: NOW - 60_000,
    totalSize: names.length,
    rows: names.map((name, index) => [index + 1, name, mode === "arena" ? 7 - index / 10 : null]),
  };
}

function pointer(s: Snapshot, isCurrent = true): BoardPointer {
  return {
    region: s.region,
    mode: s.mode,
    seasonId: s.seasonId,
    isCurrent,
    snapshotKey: `snapshots/${s.region}/${s.mode}/${s.seasonId}/${s.generatedAt}.json`,
    generatedAt: s.generatedAt,
    totalSize: s.totalSize,
    lastSuccessAt: NOW - 30_000,
    consecutiveFailures: 0,
  };
}

function setup() {
  const apArena = snapshot("AP", "arena", 56, ["Sinah", "Other", ...Array.from({ length: 30 }, (_, i) => `p${i}`)]);
  const apArenaPast = snapshot("AP", "arena", 55, ["OldChamp", "Sinah"]);
  const euStandard = { ...snapshot("EU", "standard", 156, ["sinahfan", "SINAH", "x"]), deepGeneratedAt: NOW - 7_200_000 };
  const snapshots = [apArena, apArenaPast, euStandard];
  const pointers = [pointer(apArena), pointer(apArenaPast, false), pointer(euStandard)];

  const store: LeaderboardStore = {
    listBoards: vi.fn(async () => pointers),
    readUpstreamBlock: vi.fn(async (now: number) => (now < NOW + 60_000 ? NOW + 60_000 : null)),
    readHistory: vi.fn(async (_board, _seasonId, name: string) =>
      name === "sinah"
        ? [
            { day: "2026-10-03", rank: 3, rating: 6.5 },
            { day: "2026-10-04", rank: 1, rating: 7 },
          ]
        : [],
    ),
    readClosingRanks: vi.fn(async (_board, _seasonId, beforeDay: string, names: string[]) => ({
      day: "2026-10-04",
      ranks: [
        { name: "sinah", rank: 4 },
        { name: "other", rank: 1 },
      ].filter((row) => names.includes(row.name) && beforeDay === "2026-10-05"),
    })),
    readPoints: vi.fn(async (_board, _seasonId, name: string) => (name === "sinah" ? [{ at: NOW - 600_000, rank: 1, rating: 7 }] : [])),
    readSnapshot: vi.fn(async (key: string) => {
      const found = snapshots.find((s) => pointer(s).snapshotKey === key);
      return found ? serializeSnapshot(found) : null;
    }),
  };
  const caches: ServiceCaches = {
    pointers: new TtlLru({ maxEntries: 1, ttlMs: 30_000 }),
    indexes: new TtlLru({ maxEntries: 10 }),
    history: new TtlLru({ maxEntries: 10, ttlMs: 600_000 }),
    points: new TtlLru({ maxEntries: 10, ttlMs: 600_000 }),
    changes: new TtlLru({ maxEntries: 10 }),
  };
  let now = NOW;
  const service = new LeaderboardService(store, caches, () => now);
  return { service, store, pointers, advance: (ms: number) => (now += ms) };
}

describe("LeaderboardService", () => {
  it("searches current seasons of every board", async () => {
    const { service } = setup();
    const result = await service.search("sinah");
    expect(result.total).toBe(3);
    expect(result.hits.map((hit) => [hit.region, hit.mode, hit.seasonId, hit.accountId])).toEqual([
      ["AP", "arena", 56, "Sinah"],
      ["EU", "standard", 156, "SINAH"],
      ["EU", "standard", 156, "sinahfan"],
    ]);
  });

  it("lists boards in display order (AP, US, EU), newest season first", async () => {
    const { service, store } = setup();
    const usWild = snapshot("US", "wild", 156, ["x"]);
    const apArena = snapshot("AP", "arena", 56, ["y"]);
    // D1 sorts region codes alphabetically (AP, EU, US); the service must not leak that order.
    vi.mocked(store.listBoards).mockResolvedValueOnce([
      pointer(snapshot("EU", "arena", 56, ["z"])),
      pointer(usWild),
      pointer(snapshot("AP", "arena", 55, ["w"]), false),
      pointer(apArena),
    ]);
    expect((await service.boards()).map((p) => `${p.region}:${p.mode}:${p.seasonId}`)).toEqual([
      "AP:arena:56",
      "AP:arena:55",
      "US:wild:156",
      "EU:arena:56",
    ]);
  });

  it("parses each immutable snapshot once across calls", async () => {
    const { service, store } = setup();
    await service.search("a");
    await service.search("b");
    expect(store.readSnapshot).toHaveBeenCalledTimes(2); // two current boards
  });

  it("re-reads board pointers after their short ttl", async () => {
    const { service, store, advance } = setup();
    await service.search("a");
    advance(10_000);
    await service.search("a");
    expect(store.listBoards).toHaveBeenCalledTimes(1);
    advance(30_000);
    await service.search("a");
    expect(store.listBoards).toHaveBeenCalledTimes(2);
  });

  it("serves one leaderboard page with season navigation", async () => {
    const { service } = setup();
    const page = await service.leaderboard({ region: "AP", mode: "arena" }, undefined, 2);
    expect(page).toMatchObject({ seasonId: 56, page: 2, totalPages: 2, seasons: [56, 55] });
    expect(page?.rows[0]?.[0]).toBe(26);
  });

  it("adds rating cutoffs and movement since the last daily close", async () => {
    const { service, store } = setup();
    const page = await service.leaderboard({ region: "AP", mode: "arena" }, undefined, 1);
    expect(page?.cutoffs).toEqual([
      { rank: 1, rating: 7 },
      { rank: 10, rating: 6.1 },
    ]);
    // Snapshot data time is 2026-10-05 KST, so the baseline is an earlier closing day.
    expect(page?.changes).toEqual({ day: "2026-10-04", changes: [3, -1, ...Array(23).fill("new")] });
    await service.leaderboard({ region: "AP", mode: "arena" }, undefined, 1);
    expect(store.readClosingRanks).toHaveBeenCalledTimes(1);
  });

  it("leaves past seasons without movement", async () => {
    const { service } = setup();
    expect((await service.leaderboard({ region: "AP", mode: "arena" }, 55, 1))?.changes).toBeNull();
  });

  it("serves a past season by id and returns null for unknown ones", async () => {
    const { service } = setup();
    expect((await service.leaderboard({ region: "AP", mode: "arena" }, 55, 1))?.rows[0]?.[1]).toBe("OldChamp");
    expect(await service.leaderboard({ region: "AP", mode: "arena" }, 1, 1)).toBeNull();
    expect(await service.leaderboard({ region: "US", mode: "wild" }, undefined, 1)).toBeNull();
  });

  it("finds a player, including namesakes and their other boards", async () => {
    const { service } = setup();
    const player = await service.player({ region: "AP", mode: "arena" }, 56, "SINAH");
    expect(player?.entries.map(([rank]) => rank)).toEqual([1]);
    expect(player?.displayName).toBe("Sinah");
    expect(player?.otherBoards.map((hit) => [hit.region, hit.mode])).toEqual([["EU", "standard"]]);
  });

  it("returns a player page shell even when the name is not ranked", async () => {
    const { service } = setup();
    const player = await service.player({ region: "AP", mode: "arena" }, 56, "nobody");
    expect(player).toMatchObject({ entries: [], displayName: "nobody" });
  });

  it("summarizes each current board with its top rows", async () => {
    const { service } = setup();
    const overview = await service.overview(2);
    expect(overview.map((o) => [o.pointer.region, o.pointer.mode, o.top.map(([, name]) => name)])).toEqual([
      ["AP", "arena", ["Sinah", "Other"]],
      ["EU", "standard", ["sinahfan", "SINAH"]],
    ]);
  });

  it("reads a player's daily history by normalized name and caches it", async () => {
    const { service, store } = setup();
    const board = { region: "AP", mode: "arena" } as const;
    expect(await service.history(board, 56, "SINAH")).toHaveLength(2);
    await service.history(board, 56, "Sinah");
    expect(store.readHistory).toHaveBeenCalledTimes(1);
    expect(store.readHistory).toHaveBeenCalledWith(board, 56, "sinah");
  });

  it("reads rank points by normalized name and refetches once a newer snapshot is published", async () => {
    const { service, store, pointers, advance } = setup();
    const board = { region: "AP", mode: "arena" } as const;
    expect(await service.points(board, 56, "SINAH")).toEqual([{ at: NOW - 600_000, rank: 1, rating: 7 }]);
    await service.points(board, 56, "Sinah");
    expect(store.readPoints).toHaveBeenCalledTimes(1);

    // The crawler publishes again: points cached for the old snapshot no longer apply.
    pointers[0] = { ...pointers[0]!, generatedAt: NOW, snapshotKey: "snapshots/AP/arena/56/next.json" };
    advance(31_000);
    await service.points(board, 56, "sinah");
    expect(store.readPoints).toHaveBeenCalledTimes(2);
  });

  it("reports while the crawler is paused by an upstream block", async () => {
    const { service, advance } = setup();
    expect(await service.upstreamBlockedUntil()).toBe(NOW + 60_000);
    advance(120_000);
    expect(await service.upstreamBlockedUntil()).toBeNull();
  });

  it("reports a stalled crawler once the newest data is over an hour old", async () => {
    const { service, advance } = setup();
    advance(120_000); // past the upstream block in the fake store
    expect(await service.freshness()).toEqual({ blockedUntil: null, stalledSince: null });
    advance(61 * 60_000);
    expect(await service.freshness()).toEqual({ blockedUntil: null, stalledSince: NOW - 30_000 });
  });

  it("exposes when ranks below the refreshed top pages were collected", async () => {
    const { service } = setup();
    const page = await service.leaderboard({ region: "EU", mode: "standard" }, undefined, 1);
    expect(page?.deepGeneratedAt).toBe(NOW - 7_200_000);
    expect((await service.player({ region: "EU", mode: "standard" }, 156, "x"))?.deepGeneratedAt).toBe(NOW - 7_200_000);
    expect((await service.leaderboard({ region: "AP", mode: "arena" }, undefined, 1))?.deepGeneratedAt).toBeNull();
  });

  it("lists board status for the current seasons", async () => {
    const { service } = setup();
    const status = await service.status();
    expect(status.map((s) => `${s.region}:${s.mode}`)).toEqual(["AP:arena", "EU:standard"]);
  });
});
