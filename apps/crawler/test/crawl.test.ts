import { env } from "cloudflare:test";
import { deserializeSnapshot } from "@hearthgg/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardStore } from "../src/board-store";
import { runCrawl, type CrawlParams, type CrawlStep } from "../src/crawl";
import { UpstreamGuard } from "../src/upstream-guard";
import { RequestBudget } from "../src/request-budget";
import { MAX_BUDGET_WAITS, REQUEST_BURST } from "../src/limits";
import { createFakeBlizzard, names } from "./fake-blizzard";

const NOW = Date.UTC(2026, 9, 5, 12);
const board = { region: "AP", mode: "wild" } as const;

/** Runs steps inline and records their names, like a Workflow without persistence. */
function inlineStep(onSleep: (ms: number) => void = () => {}) {
  const names: string[] = [];
  const sleeps: Array<[string, number]> = [];
  const step: CrawlStep = {
    async do(name, fn) {
      names.push(name);
      return fn();
    },
    async sleep(name, ms) {
      sleeps.push([name, ms]);
      onSleep(ms);
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

    expect(steps).toEqual([
      "reserve pages 1-2 (1)",
      "fetch pages 1-2",
      "reserve pages 3-4 (1)",
      "fetch pages 3-4",
      "reserve pages 5-5 (1)",
      "fetch pages 5-5",
      "publish",
    ]);
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

  it("stops before any request when it does not hold the lock", async () => {
    const store = await prepare("someone-else");
    await expect(
      runCrawl(params(), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW }),
    ).rejects.toThrow(/lock/);
    expect(blizzard.requests).toHaveLength(0);
    expect((await store.getCurrent(board))?.lockRunId).toBe("someone-else");
  });

  it("discards its own object when it lost the lock right before publishing", async () => {
    const store = await prepare();
    const { step } = inlineStep();
    const takeoverBeforePublish: CrawlStep = {
      ...step,
      async do(name, fn) {
        if (name === "publish") {
          await store.releaseLock(board, 156, "run-1");
          await store.acquireLock(board, 156, "someone-else", NOW, 60_000);
        }
        return step.do(name, fn);
      },
    };

    const result = await runCrawl(params(), takeoverBeforePublish, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW });
    expect(result.published).toBe(false);
    expect((await env.SNAPSHOTS.list()).objects).toHaveLength(0);
    expect((await store.getCurrent(board))?.snapshotKey).toBeNull();
  });

  it("announces recovery when a board that triggered an alert publishes again", async () => {
    const store = await prepare();
    for (let i = 0; i < 3; i++) await store.recordFailure(board, 156, null, "boom", NOW);
    await store.acquireLock(board, 156, "run-1", NOW, 60_000);
    const alerts: string[] = [];

    const { step, names: steps } = inlineStep();
    await runCrawl(params(), step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW, alert: async (m) => void alerts.push(m) });

    expect(alerts).toEqual(["[hearthgg] ✅ AP:wild 수집이 3회 연속 실패 후 복구됐습니다."]);
    // Sent from a step so a workflow replay cannot send it twice.
    expect(steps.at(-1)).toBe("notify recovery");
  });

  it("stays quiet when a shorter failure streak ends", async () => {
    const store = await prepare();
    await store.recordFailure(board, 156, null, "boom", NOW);
    await store.acquireLock(board, 156, "run-1", NOW, 60_000);
    const alerts: string[] = [];
    await runCrawl(params(), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW, alert: async (m) => void alerts.push(m) });
    expect(alerts).toEqual([]);
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
    expect(alert.mock.calls[0]?.[0]).toMatch(/AP:wild 시즌 156 수집이 3회 연속 실패/);
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

  it("uses fewer parallel requests while recovering from a recent block", async () => {
    await prepare();
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW };
    await runCrawl(params(), inlineStep().step, deps);
    expect(blizzard.peak()).toBe(3);

    const recovering = createFakeBlizzard({ "AP:wild": { seasonId: 156, names: names(120) } });
    await new UpstreamGuard(env.DB).trip(NOW - 40 * 60_000, "403"); // 1 strike, block over
    await new BoardStore(env.DB).acquireLock(board, 156, "run-2", NOW, 60_000);
    await runCrawl(params({ runId: "run-2", startedAt: NOW + 1 }), inlineStep().step, { ...deps, fetch: recovering.fetch });
    expect(recovering.peak()).toBe(1);
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

  it("records every row as rank points on a board's first snapshot, then only names that moved", async () => {
    const store = await prepare();
    const deps = { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW };
    await runCrawl(params({ startedAt: 1_000 }), inlineStep().step, deps);

    // Two players swap places; everyone else keeps their rank.
    const swapped = names(120);
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    blizzard.boards["AP:wild"] = { seasonId: 156, names: swapped };
    await store.acquireLock(board, 156, "run-2", NOW + 120_000, 60_000);
    await runCrawl(params({ runId: "run-2", kind: "top", pages: 2, startedAt: 2_000 }), inlineStep().step, deps);

    const { results } = await env.DB.prepare("SELECT at, COUNT(*) AS n FROM rank_points WHERE region = 'AP' AND mode = 'wild' GROUP BY at").all();
    expect(results).toEqual([
      { at: 1_000, n: 120 },
      { at: 2_000, n: 2 },
    ]);
    const moved = await env.DB.prepare("SELECT name, rank, rating FROM rank_points WHERE at = 2000 ORDER BY rank").all();
    // The fake board rates by position on the page, so the swap also swaps ratings.
    expect(moved.results).toEqual([
      { name: "player2", rank: 1, rating: 100 },
      { name: "player1", rank: 2, rating: 99 },
    ]);
  });

  it("refuses a top refresh when there is no previous snapshot to merge into", async () => {
    await prepare();
    await expect(
      runCrawl(params({ kind: "top", pages: 2 }), inlineStep().step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW }),
    ).rejects.toThrow(/previous snapshot/);
  });

  it("sleeps until the request budget refills instead of overspending", async () => {
    const store = await prepare();
    await new RequestBudget(env.DB).reserve(REQUEST_BURST, NOW);
    let clock = NOW;
    const { step, sleeps } = inlineStep((ms) => (clock += ms));

    const result = await runCrawl(params(), step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => clock });

    expect(result.published).toBe(true);
    expect(sleeps[0]?.[0]).toBe("wait for budget 1-5 (1)");
    expect(sleeps[0]?.[1]).toBeGreaterThan(0);
    expect((await store.getCurrent(board))?.lockRunId).toBeNull();
  });

  it("gives up when the budget never frees up", async () => {
    const store = await prepare();
    await new RequestBudget(env.DB).reserve(REQUEST_BURST, NOW);
    const { step, sleeps } = inlineStep(); // time never advances

    await expect(
      runCrawl(params(), step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => NOW }),
    ).rejects.toThrow(/budget/);
    expect(sleeps).toHaveLength(MAX_BUDGET_WAITS);
    expect(blizzard.requests).toHaveLength(0);
    expect((await store.getCurrent(board))?.consecutiveFailures).toBe(1);
  });

  it("stops when another run took over its lock while it waited", async () => {
    const store = await prepare();
    await new RequestBudget(env.DB).reserve(REQUEST_BURST, NOW);
    let clock = NOW;
    const { step } = inlineStep((ms) => {
      clock += ms;
    });
    // Simulate a takeover after the first wait.
    await store.releaseLock(board, 156, "run-1");
    await store.acquireLock(board, 156, "intruder", NOW, 60 * 60_000);

    await expect(
      runCrawl(params(), step, { db: env.DB, bucket: env.SNAPSHOTS, fetch: blizzard.fetch, now: () => clock }),
    ).rejects.toThrow(/lock/);
    expect(blizzard.requests).toHaveLength(0);
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
