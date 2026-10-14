import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { BoardStore } from "../src/board-store";
import { pruneRankPoints, recordRankPoints } from "../src/points";

const board = { region: "AP", mode: "standard" } as const;

async function points(seasonId?: number) {
  const { results } = await env.DB.prepare(
    `SELECT season_id, name, at, rank, rating FROM rank_points ${seasonId === undefined ? "" : "WHERE season_id = ?"} ORDER BY season_id, at, rank`,
  )
    .bind(...(seasonId === undefined ? [] : [seasonId]))
    .all();
  return results;
}

describe("recordRankPoints", () => {
  it("writes the rows under the snapshot time, in chunks", async () => {
    const rows = Array.from({ length: 7 }, (_, index) => [index + 1, `p${index + 1}`, null] as [number, string, null]);
    expect(await recordRankPoints(env.DB, board, 156, 1_000, rows, 3)).toBe(7);
    expect(await points()).toHaveLength(7);
    expect((await points())[0]).toEqual({ season_id: 156, name: "p1", at: 1_000, rank: 1, rating: null });
  });

  it("is idempotent, so a retried publish step does not duplicate points", async () => {
    const rows: Array<[number, string, number]> = [[1, "sinah", 7.2]];
    await recordRankPoints(env.DB, board, 156, 1_000, rows);
    await recordRankPoints(env.DB, board, 156, 1_000, rows);
    expect(await points()).toHaveLength(1);
  });
});

describe("pruneRankPoints", () => {
  async function seasons(...ids: number[]) {
    const store = new BoardStore(env.DB);
    for (const id of ids) {
      await store.ensureCurrentSeason(board, id);
      await recordRankPoints(env.DB, board, id, id, [
        [1, "a", null],
        [2, "b", null],
        [3, "c", null],
        [4, "d", null],
        [5, "e", null],
      ]);
    }
  }

  it("keeps the newest two seasons per board and deletes the rest in batches", async () => {
    await seasons(154, 155, 156);
    expect(await pruneRankPoints(env.DB, { batchSize: 2, maxBatches: 10 })).toBe(5);
    expect(await points(154)).toHaveLength(0);
    expect(await points(155)).toHaveLength(5);
    expect(await points(156)).toHaveLength(5);
  });

  it("stops after the batch cap and finishes on a later run", async () => {
    await seasons(154, 155, 156);
    expect(await pruneRankPoints(env.DB, { batchSize: 2, maxBatches: 1 })).toBe(2);
    expect(await pruneRankPoints(env.DB, { batchSize: 2, maxBatches: 10 })).toBe(3);
    expect(await pruneRankPoints(env.DB, { batchSize: 2, maxBatches: 10 })).toBe(0);
  });

  it("keeps everything while a board has two seasons or fewer", async () => {
    await seasons(155, 156);
    expect(await pruneRankPoints(env.DB)).toBe(0);
    expect(await points()).toHaveLength(10);
  });
});
