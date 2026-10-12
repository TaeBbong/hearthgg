import { env } from "cloudflare:test";
import { serializeSnapshot, snapshotKey, type Snapshot } from "@hearthgg/core";
import { describe, expect, it } from "vitest";
import { BoardStore } from "../src/board-store";
import { runDailyTick } from "../src/daily";

const NOW = Date.UTC(2026, 9, 12, 14, 50); // 23:50 KST

async function publish(names: string[]) {
  const s: Snapshot = {
    v: 1,
    region: "US",
    mode: "arena",
    seasonId: 56,
    generatedAt: NOW - 60_000,
    totalSize: names.length,
    rows: names.map((name, index) => [index + 1, name, 7]),
  };
  const store = new BoardStore(env.DB);
  const board = { region: s.region, mode: s.mode };
  await store.ensureCurrentSeason(board, s.seasonId);
  await store.acquireLock(board, s.seasonId, "run", NOW - 120_000, 60_000);
  await env.SNAPSHOTS.put(snapshotKey(s), serializeSnapshot(s));
  await store.publish(board, s.seasonId, "run", { snapshotKey: snapshotKey(s), generatedAt: s.generatedAt, deepGeneratedAt: s.generatedAt, totalSize: s.totalSize, fingerprint: "f" }, NOW);
}

describe("runDailyTick", () => {
  it("records history and sends one report per KST day across the closing ticks", async () => {
    await publish(["a", "b"]);
    const sent: string[] = [];
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, alert: async (message: string) => void sent.push(message) };

    await runDailyTick({ ...deps, now: () => NOW });
    await runDailyTick({ ...deps, now: () => NOW + 5 * 60_000 });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("10월 12일 일일 리포트");
    expect(sent[0]).toContain("오늘 순위 기록: 1개 보드, 2명");
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM rank_history").first<{ n: number }>();
    expect(count?.n).toBe(2);
  });

  it("sends the next day's report the next day", async () => {
    await publish(["a"]);
    const sent: string[] = [];
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, alert: async (message: string) => void sent.push(message) };

    await runDailyTick({ ...deps, now: () => NOW });
    await runDailyTick({ ...deps, now: () => NOW + 86_400_000 });
    expect(sent).toHaveLength(2);
  });
});
