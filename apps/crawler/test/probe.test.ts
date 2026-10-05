import { env } from "cloudflare:test";
import { BOARDS } from "@hearthgg/core";
import { describe, expect, it, vi } from "vitest";
import { BoardStore } from "../src/board-store";
import type { CrawlParams } from "../src/crawl";
import { runProbeCycle } from "../src/probe";
import { UpstreamGuard } from "../src/upstream-guard";
import { createFakeBlizzard, names } from "./fake-blizzard";

const NOW = Date.UTC(2026, 9, 5, 12);
const ap = { region: "AP", mode: "arena" } as const;

function setup(blizzard = createFakeBlizzard({ "AP:arena": { seasonId: 56, names: names(60) } })) {
  const started: CrawlParams[] = [];
  const startCrawl = vi.fn(async (params: CrawlParams) => {
    started.push(params);
  });
  const deps = {
    db: env.DB,
    fetch: blizzard.fetch,
    startCrawl,
    now: () => NOW,
    sleep: async () => {},
    maxConcurrentCrawls: BOARDS.length,
  };
  return { blizzard, started, startCrawl, deps, store: new BoardStore(env.DB) };
}

describe("runProbeCycle", () => {
  it("probes every board once and starts crawls for boards seen for the first time", async () => {
    const { blizzard, started, deps } = setup();
    const outcomes = await runProbeCycle(deps);

    expect(outcomes).toHaveLength(BOARDS.length);
    expect(blizzard.requests.filter((url) => url.searchParams.get("page") === "1")).toHaveLength(BOARDS.length);
    expect(started).toHaveLength(BOARDS.length);

    const arena = started.find((p) => p.region === "AP" && p.mode === "arena");
    expect(arena).toMatchObject({ seasonId: 56, totalPages: 3, expectedTotalSize: 60, startedAt: NOW });
    expect(arena?.runId).toMatch(/^AP-arena-56-/);
  });

  it("holds the crawl lock for every started run", async () => {
    const { started, deps, store } = setup();
    await runProbeCycle(deps);
    const arena = started.find((p) => p.region === "AP" && p.mode === "arena")!;
    expect((await store.getCurrent(ap))?.lockRunId).toBe(arena.runId);
  });

  it("does not start a second crawl while one is still running", async () => {
    const { started, deps } = setup();
    await runProbeCycle(deps);
    started.length = 0;

    const outcomes = await runProbeCycle({ ...deps, now: () => NOW + 10 * 60_000 });
    expect(started).toHaveLength(0);
    expect(outcomes.find((o) => o.board === "AP:arena")).toMatchObject({ action: "locked" });
  });

  it("skips boards whose top page has not changed", async () => {
    const { started, deps, store } = setup();
    await runProbeCycle(deps);
    const arena = started.find((p) => p.region === "AP" && p.mode === "arena")!;
    await store.publish(ap, 56, arena.runId, { snapshotKey: "k", generatedAt: NOW, totalSize: 60, fingerprint: arena.fingerprint }, NOW);
    started.length = 0;

    const outcomes = await runProbeCycle({ ...deps, now: () => NOW + 10 * 60_000 });
    expect(outcomes.find((o) => o.board === "AP:arena")).toMatchObject({ action: "skipped", reason: "unchanged" });
    expect(started.some((p) => p.region === "AP" && p.mode === "arena")).toBe(false);
  });

  it("rotates the season and also schedules a final crawl of the season that just ended", async () => {
    const blizzard = createFakeBlizzard({ "AP:arena": { seasonId: 56, names: names(60) } });
    const { started, deps, store } = setup(blizzard);
    await runProbeCycle(deps);
    const first = started.find((p) => p.region === "AP" && p.mode === "arena")!;
    await store.publish(ap, 56, first.runId, { snapshotKey: "k", generatedAt: NOW, totalSize: 60, fingerprint: first.fingerprint }, NOW);
    started.length = 0;

    blizzard.boards["AP:arena"] = { seasonId: 57, names: names(5), past: { 56: names(70) } };
    await runProbeCycle({ ...deps, now: () => NOW + 60 * 60_000 });

    const arenaRuns = started.filter((p) => p.region === "AP" && p.mode === "arena");
    expect(arenaRuns.map((p) => [p.seasonId, p.expectedTotalSize])).toEqual([
      [56, 70],
      [57, 5],
    ]);
    expect((await store.getCurrent(ap))?.seasonId).toBe(57);
  });

  it("isolates failures per board and records them", async () => {
    const { blizzard, deps, store } = setup();
    await runProbeCycle(deps); // registers boards
    blizzard.failAll(503);

    const outcomes = await runProbeCycle({ ...deps, now: () => NOW + 60 * 60_000 });
    expect(outcomes.every((o) => o.action === "failed")).toBe(true);
    expect((await store.getCurrent(ap))?.consecutiveFailures).toBe(1);
  });

  it("caps crawls in flight across boards and defers the rest to a later tick", async () => {
    const { started, deps } = setup();
    const outcomes = await runProbeCycle({ ...deps, maxConcurrentCrawls: 4 });
    expect(started).toHaveLength(4);
    expect(outcomes.filter((o) => o.action === "deferred")).toHaveLength(BOARDS.length - 4);

    // The four runs above still hold their locks, so nothing else may start yet.
    started.length = 0;
    await runProbeCycle({ ...deps, maxConcurrentCrawls: 4, now: () => NOW + 5 * 60_000 });
    expect(started).toHaveLength(0);
  });

  it("gives the budget to unpublished boards first, then to the stalest", async () => {
    const { started, deps, store } = setup(
      createFakeBlizzard({
        "AP:arena": { seasonId: 56, names: names(60) },
        "EU:arena": { seasonId: 56, names: names(60) },
      }),
    );
    // Publish everything except EU:arena; AP:arena is the oldest publication.
    await runProbeCycle(deps);
    for (const params of started) {
      if (params.region === "EU" && params.mode === "arena") continue;
      const age = params.region === "AP" && params.mode === "arena" ? 3 : 1;
      const board = { region: params.region, mode: params.mode };
      await store.publish(board, params.seasonId, params.runId, { snapshotKey: "k", generatedAt: NOW, totalSize: 0, fingerprint: "old" }, NOW - age * 60 * 60_000);
    }
    await store.releaseLock({ region: "EU", mode: "arena" }, 56, started.find((p) => p.region === "EU" && p.mode === "arena")!.runId);
    started.length = 0;

    await runProbeCycle({ ...deps, maxConcurrentCrawls: 2 });
    expect(started.map((p) => `${p.region}:${p.mode}`)).toEqual(["EU:arena", "AP:arena"]);
  });

  it("sends no requests while the upstream breaker is open", async () => {
    const { blizzard, started, deps } = setup();
    await new UpstreamGuard(env.DB).trip(NOW - 60_000, "403");

    const outcomes = await runProbeCycle(deps);
    expect(blizzard.requests).toHaveLength(0);
    expect(started).toHaveLength(0);
    expect(outcomes.every((o) => o.action === "skipped" && o.reason === "upstream-blocked")).toBe(true);
  });

  it("trips the breaker on a 403, stops probing other boards and alerts once", async () => {
    const { blizzard, deps } = setup();
    blizzard.failAll(403);
    const alerts: string[] = [];

    const outcomes = await runProbeCycle({ ...deps, concurrency: 1, alert: async (message) => void alerts.push(message) });

    expect(blizzard.requests).toHaveLength(1);
    expect(outcomes.filter((o) => o.action === "failed")).toHaveLength(1);
    expect(outcomes.filter((o) => o.reason === "upstream-blocked")).toHaveLength(BOARDS.length - 1);
    expect(await new UpstreamGuard(env.DB).blockedUntil(NOW)).not.toBeNull();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatch(/403/);
  });

  it("releases the lock when the workflow cannot be started", async () => {
    const { deps, store } = setup();
    const outcomes = await runProbeCycle({
      ...deps,
      startCrawl: async () => {
        throw new Error("workflow quota");
      },
    });
    expect(outcomes.find((o) => o.board === "AP:arena")).toMatchObject({ action: "failed" });
    expect((await store.getCurrent(ap))?.lockRunId).toBeNull();
  });
});
