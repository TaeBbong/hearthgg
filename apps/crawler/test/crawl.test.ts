import { env } from "cloudflare:test";
import { deserializeSnapshot } from "@hearthgg/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardStore } from "../src/board-store";
import { runCrawl, type CrawlParams, type CrawlStep } from "../src/crawl";
import { UpstreamGuard } from "../src/upstream-guard";
import { createFakeBlizzard, names } from "./fake-blizzard";

const NOW = Date.UTC(2026, 9, 5, 12);
const board = { region: "AP", mode: "wild" } as const;

/** Runs steps inline and records their names, like a Workflow without persistence. */
function inlineStep() {
  const names: string[] = [];
  const sleeps: Array<[string, number]> = [];
  const step: CrawlStep = {
    async do(name, fn) {
      names.push(name);
      return fn();
    },
    async sleep(name, ms) {
      sleeps.push([name, ms]);
    },
  };
  return { step, names, sleeps };
}

function params(overrides: Partial<CrawlParams> = {}): CrawlParams {
  return {
    region: "AP",
    mode: "wild",
    seasonId: 156,
    runId: "run-1",
    kind: "full",
    pages: 5,
    totalPages: 5,
    expectedTotalSize: 120,
    fingerprint: "fp-1",
    startedAt: NOW,
    ...overrides,
  };
}

async function prepare(lockRunId = "run-1") {
  const store = new BoardStore(env.DB);
  await store.ensureCurrentSeason(board, 156);
  await store.acquireLock(board, 156, lockRunId, NOW, 60_000);
  return store;
}

describe("runCrawl", () => {
  let blizzard: ReturnType<typeof createFakeBlizzard>;
  beforeEach(() => {
    blizzard = createFakeBlizzard({ "AP:wild": { seasonId: 156, names: names(120) } });
  });

  it("fetches every page in batches, publishes the snapshot and swaps the pointer", async () => {
    const store = await prepare();
    const { step, names: steps } = inlineStep();

    const result = await runCrawl(params(), step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW, batchSize: 2 });

    expect(steps).toEqual(["fetch pages 1-2", "fetch pages 3-4", "fetch pages 5-5", "publish"]);
    expect(result).toMatchObject({ published: true, totalSize: 120 });

    const current = await store.getCurrent(board);
    expect(current).toMatchObject({ generatedAt: NOW, totalSize: 120, fingerprint: "fp-1", lockRunId: null });

    const object = await env.SNAPSHOTS.get(current!.snapshotKey!);
    const snapshot = deserializeSnapshot(await object!.text());
    expect(snapshot.rows).toHaveLength(120);
    expect(snapshot.rows[119]).toEqual([120, "player120", 81]);
  });

  it("pins the probed season on every page request so a rollover cannot mix seasons", async () => {
    await prepare();
    await runCrawl(params(), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW });
    expect(blizzard.requests.every((url) => url.searchParams.get("seasonId") === "156")).toBe(true);
  });

  it("deletes the snapshot that fell out of the two-version window", async () => {
    const store = await prepare();
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW };
    const keys: string[] = [];
    for (const startedAt of [1, 2, 3]) {
      await store.acquireLock(board, 156, `run-${startedAt}`, NOW + 120_000 * startedAt, 60_000);
      await runCrawl(params({ runId: `run-${startedAt}`, startedAt }), inlineStep().step, deps);
      keys.push((await store.getCurrent(board))!.snapshotKey!);
    }
    expect(await env.SNAPSHOTS.head(keys[0]!)).toBeNull();
    expect(await env.SNAPSHOTS.head(keys[1]!)).not.toBeNull();
    expect(await env.SNAPSHOTS.head(keys[2]!)).not.toBeNull();
  });

  it("discards its own object when it lost the lock before publishing", async () => {
    const store = await prepare("someone-else");
    const result = await runCrawl(params(), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW });

    expect(result.published).toBe(false);
    expect((await env.SNAPSHOTS.list()).objects).toHaveLength(0);
    expect((await store.getCurrent(board))?.snapshotKey).toBeNull();
  });

  it("records the failure, alerts on the third in a row and rethrows", async () => {
    const store = await prepare();
    blizzard.failAll(500);
    const alert = vi.fn(async (_message: string) => {});
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW, alert, sleep: async () => {} };

    for (const attempt of [1, 2, 3]) {
      await store.acquireLock(board, 156, `run-${attempt}`, NOW + attempt * 120_000, 60_000);
      await expect(runCrawl(params({ runId: `run-${attempt}` }), inlineStep().step, deps)).rejects.toThrow();
    }

    expect(await store.getCurrent(board)).toMatchObject({ consecutiveFailures: 3, lockRunId: null });
    expect(alert).toHaveBeenCalledOnce();
    expect(alert.mock.calls[0]?.[0]).toMatch(/AP:wild/);
  });

  it("trips the global breaker on a 403 and alerts about the block, not the board", async () => {
    await prepare();
    blizzard.failAll(403);
    const alerts: string[] = [];
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW, alert: async (m: string) => void alerts.push(m) };

    await expect(runCrawl(params(), inlineStep().step, deps)).rejects.toThrow(/403/);
    expect(await new UpstreamGuard(env.DB).blockedUntil(NOW)).not.toBeNull();
    expect(alerts).toEqual([expect.stringMatching(/Blizzard.*403/)]);
  });

  it("aborts without requests while the breaker is open", async () => {
    const store = await prepare();
    await new UpstreamGuard(env.DB).trip(NOW - 60_000, "403");

    await expect(
      runCrawl(params(), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW }),
    ).rejects.toThrow(/blocked/);
    expect(blizzard.requests).toHaveLength(0);
    expect((await store.getCurrent(board))?.lockRunId).toBeNull();
  });

  it("refreshes only the top pages and keeps deeper rows from the previous snapshot", async () => {
    const store = await prepare();
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW };
    await runCrawl(params({ startedAt: 1_000 }), inlineStep().step, deps);

    // Top two pages reshuffle; the rest of the board is not re-read.
    blizzard.boards["AP:wild"] = { seasonId: 156, names: [...names(50, "fresh"), ...names(120).slice(50)] };
    blizzard.requests.length = 0;
    await store.acquireLock(board, 156, "run-2", NOW + 120_000, 60_000);
    const result = await runCrawl(params({ runId: "run-2", kind: "top", pages: 2, startedAt: 2_000 }), inlineStep().step, deps);

    expect(result.published).toBe(true);
    expect(blizzard.requests.map((url) => url.searchParams.get("page"))).toEqual(["1", "2"]);
    const current = await store.getCurrent(board);
    expect(current).toMatchObject({ generatedAt: 2_000, deepGeneratedAt: 1_000, totalSize: 120 });
    const snapshot = deserializeSnapshot(await (await env.SNAPSHOTS.get(current!.snapshotKey!))!.text());
    expect(snapshot.rows[0]?.[1]).toBe("fresh1");
    expect(snapshot.rows[50]).toEqual([51, "player51", 100]);
    expect(snapshot.deepGeneratedAt).toBe(1_000);
  });

  it("refuses a top refresh when there is no previous snapshot to merge into", async () => {
    await prepare();
    await expect(
      runCrawl(params({ kind: "top", pages: 2 }), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW }),
    ).rejects.toThrow(/previous snapshot/);
  });

  it("rejects an inconsistent crawl without publishing", async () => {
    const store = await prepare();
    // Board shrank to a fraction of what the probe reported.
    blizzard.boards["AP:wild"] = { seasonId: 156, names: names(30) };

    await expect(
      runCrawl(params(), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW }),
    ).rejects.toThrow(/rows|page/);
    expect((await store.getCurrent(board))?.snapshotKey).toBeNull();
  });
});
