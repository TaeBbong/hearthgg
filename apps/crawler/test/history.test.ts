import { env } from "cloudflare:test";
import { serializeSnapshot, snapshotKey, type Snapshot } from "@hearthgg/core";
import { describe, expect, it } from "vitest";
import { BoardStore } from "../src/board-store";
import { captureDailyHistory, HISTORY_SEASONS_KEPT } from "../src/history";

// 23:55 KST on 2026-10-05
const NOW = Date.UTC(2026, 9, 5, 14, 55);

function snapshot(seasonId: number, names: string[], board = { region: "AP", mode: "arena" } as const): Snapshot {
  return {
    v: 1,
    ...board,
    seasonId,
    generatedAt: NOW - 60_000,
    totalSize: names.length,
    rows: names.map((name, index) => [index + 1, name, 7 - index / 10]),
  };
}

async function publish(s: Snapshot) {
  const store = new BoardStore(env.DB);
  const board = { region: s.region, mode: s.mode };
  await store.ensureCurrentSeason(board, s.seasonId);
  await store.acquireLock(board, s.seasonId, "run", NOW - 120_000, 60_000);
  const key = snapshotKey(s);
  await env.SNAPSHOTS.put(key, serializeSnapshot(s));
  await store.publish(board, s.seasonId, "run", { snapshotKey: key, generatedAt: s.generatedAt, totalSize: s.totalSize, fingerprint: "f" }, NOW);
}

async function history(name: string) {
  const { results } = await env.DB.prepare("SELECT season_id, day, rank, rating FROM rank_history WHERE name = ? ORDER BY day, rank")
    .bind(name)
    .all();
  return results;
}

describe("captureDailyHistory", () => {
  it("records every ranked row of each current board under the KST day", async () => {
    await publish(snapshot(56, ["Sinah", "Other", "SINAH"]));

    const result = await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW });

    expect(result).toEqual([{ board: "AP:arena", seasonId: 56, day: "2026-10-05", rows: 3, status: "captured" }]);
    expect(await history("sinah")).toEqual([
      { season_id: 56, day: "2026-10-05", rank: 1, rating: 7 },
      { season_id: 56, day: "2026-10-05", rank: 3, rating: 6.8 },
    ]);
  });

  it("archives the day's snapshot to R2 as the source of truth", async () => {
    await publish(snapshot(56, ["Sinah"]));
    await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW });
    const archived = await env.SNAPSHOTS.get("daily/AP/arena/56/2026-10-05.json");
    expect(JSON.parse(await archived!.text()).rows).toEqual([[1, "Sinah", 7]]);
  });

  it("is idempotent within a day", async () => {
    await publish(snapshot(56, ["Sinah"]));
    await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW });
    const again = await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW + 60_000 });
    expect(again[0]?.status).toBe("already-captured");
    expect(await history("sinah")).toHaveLength(1);
  });

  it("inserts large boards in chunks", async () => {
    const names = Array.from({ length: 2_345 }, (_, index) => `p${index}`);
    await publish(snapshot(56, names));
    const [result] = await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW, chunkSize: 500 });
    expect(result?.rows).toBe(2_345);
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM rank_history").first<{ n: number }>();
    expect(count?.n).toBe(2_345);
  });

  it(`keeps only the latest ${HISTORY_SEASONS_KEPT} seasons per board in the index`, async () => {
    for (const [seasonId, offset] of [
      [54, 3],
      [55, 2],
      [56, 1],
    ] as const) {
      await publish(snapshot(seasonId, ["Sinah"]));
      await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW - offset * 86_400_000 });
    }
    expect((await history("sinah")).map((row) => row.season_id)).toEqual([55, 56]);
    // The archive is never pruned.
    expect(await env.SNAPSHOTS.head("daily/AP/arena/54/2026-10-02.json")).not.toBeNull();
  });

  it("skips boards without a published snapshot", async () => {
    await new BoardStore(env.DB).ensureCurrentSeason({ region: "EU", mode: "wild" }, 156);
    expect(await captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => NOW })).toEqual([]);
  });
});
