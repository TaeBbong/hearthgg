import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { BoardStore } from "../src/board-store";

const board = { region: "AP", mode: "arena" } as const;
const LEASE = 30 * 60_000;
const NOW = Date.UTC(2026, 9, 5, 12);

function store() {
  return new BoardStore(env.DB);
}

describe("ensureCurrentSeason", () => {
  it("registers a board the first time it is seen", async () => {
    const result = await store().ensureCurrentSeason(board, 56);
    expect(result).toEqual({ previousSeasonId: null });
    expect(await store().getCurrent(board)).toMatchObject({ seasonId: 56, isCurrent: true, consecutiveFailures: 0 });
  });

  it("rotates to a new season and reports the previous one", async () => {
    await store().ensureCurrentSeason(board, 56);
    const result = await store().ensureCurrentSeason(board, 57);
    expect(result).toEqual({ previousSeasonId: 56 });
    expect((await store().getCurrent(board))?.seasonId).toBe(57);
    expect(await store().get(board, 56)).toMatchObject({ isCurrent: false });
  });

  it("is a no-op for the season that is already current", async () => {
    await store().ensureCurrentSeason(board, 56);
    expect(await store().ensureCurrentSeason(board, 56)).toEqual({ previousSeasonId: null });
  });

  it("refuses to move back to an older season", async () => {
    await store().ensureCurrentSeason(board, 57);
    await expect(store().ensureCurrentSeason(board, 56)).rejects.toThrow(/regress/);
  });
});

describe("crawl lock", () => {
  it("lets exactly one run hold the lock", async () => {
    await store().ensureCurrentSeason(board, 56);
    const results = await Promise.all([
      store().acquireLock(board, 56, "run-a", NOW, LEASE),
      store().acquireLock(board, 56, "run-b", NOW, LEASE),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("can be taken over once the lease expires", async () => {
    await store().ensureCurrentSeason(board, 56);
    expect(await store().acquireLock(board, 56, "run-a", NOW, LEASE)).toBe(true);
    expect(await store().acquireLock(board, 56, "run-b", NOW + 1000, LEASE)).toBe(false);
    expect(await store().acquireLock(board, 56, "run-b", NOW + LEASE + 1, LEASE)).toBe(true);
  });

  it("is released by its owner only", async () => {
    await store().ensureCurrentSeason(board, 56);
    await store().acquireLock(board, 56, "run-a", NOW, LEASE);
    await store().releaseLock(board, 56, "run-b");
    expect(await store().acquireLock(board, 56, "run-c", NOW, LEASE)).toBe(false);
    await store().releaseLock(board, 56, "run-a");
    expect(await store().acquireLock(board, 56, "run-c", NOW, LEASE)).toBe(true);
  });
});

describe("publish", () => {
  const snapshot = (generatedAt: number) => ({
    snapshotKey: `snapshots/AP/arena/56/${generatedAt}.json`,
    generatedAt,
    totalSize: 10,
    fingerprint: `fp-${generatedAt}`,
  });

  it("swaps the pointer, keeps one previous version and reports the one to delete", async () => {
    await store().ensureCurrentSeason(board, 56);

    for (const [index, generatedAt] of [1, 2, 3].entries()) {
      await store().acquireLock(board, 56, `run-${generatedAt}`, NOW, LEASE);
      const result = await store().publish(board, 56, `run-${generatedAt}`, snapshot(generatedAt), NOW);
      expect(result.published).toBe(true);
      expect(result.staleKey).toBe(index >= 2 ? snapshot(generatedAt - 2).snapshotKey : null);
    }

    expect(await store().getCurrent(board)).toMatchObject({
      snapshotKey: snapshot(3).snapshotKey,
      previousSnapshotKey: snapshot(2).snapshotKey,
      generatedAt: 3,
      fingerprint: "fp-3",
      lastSuccessAt: NOW,
      lockRunId: null,
    });
  });

  it("rejects a run that no longer holds the lock", async () => {
    await store().ensureCurrentSeason(board, 56);
    await store().acquireLock(board, 56, "run-a", NOW, LEASE);
    await store().acquireLock(board, 56, "run-b", NOW + LEASE + 1, LEASE);
    expect((await store().publish(board, 56, "run-a", snapshot(5), NOW)).published).toBe(false);
  });

  it("never replaces a newer snapshot with an older one", async () => {
    await store().ensureCurrentSeason(board, 56);
    await store().acquireLock(board, 56, "run-a", NOW, LEASE);
    await store().publish(board, 56, "run-a", snapshot(10), NOW);
    await store().acquireLock(board, 56, "run-b", NOW, LEASE);
    expect((await store().publish(board, 56, "run-b", snapshot(9), NOW)).published).toBe(false);
  });

  it("resets failure counters on success", async () => {
    await store().ensureCurrentSeason(board, 56);
    await store().recordFailure(board, 56, null, "boom", NOW);
    await store().acquireLock(board, 56, "run-a", NOW, LEASE);
    await store().publish(board, 56, "run-a", snapshot(1), NOW);
    expect(await store().getCurrent(board)).toMatchObject({ consecutiveFailures: 0, lastError: null });
  });
});

describe("recordFailure", () => {
  it("counts consecutive failures and releases the failing run's lock", async () => {
    await store().ensureCurrentSeason(board, 56);
    await store().acquireLock(board, 56, "run-a", NOW, LEASE);
    expect(await store().recordFailure(board, 56, "run-a", "first", NOW)).toBe(1);
    expect(await store().recordFailure(board, 56, null, "second", NOW)).toBe(2);
    expect(await store().getCurrent(board)).toMatchObject({ lastError: "second", lockRunId: null });
  });

  it("ignores boards that were never registered", async () => {
    expect(await store().recordFailure({ region: "EU", mode: "wild" }, 1, null, "x", NOW)).toBe(0);
  });
});

describe("listCurrent", () => {
  it("lists only current-season rows", async () => {
    await store().ensureCurrentSeason(board, 56);
    await store().ensureCurrentSeason(board, 57);
    await store().ensureCurrentSeason({ region: "EU", mode: "wild" }, 156);
    const rows = await store().listCurrent();
    expect(rows.map((row) => [row.region, row.mode, row.seasonId])).toEqual([
      ["AP", "arena", 57],
      ["EU", "wild", 156],
    ]);
  });
});
