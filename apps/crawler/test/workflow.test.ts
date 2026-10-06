import { env, introspectWorkflowInstance } from "cloudflare:test";
import { parseLeaderboardPage, type LeaderboardPage } from "@hearthgg/core";
import { describe, expect, it } from "vitest";
import { BoardStore } from "../src/board-store";
import type { CrawlParams } from "../src/crawl";
import wildBoard from "../../../packages/core/test/fixtures/ap-wild-board.json";

const NOW = Date.UTC(2026, 9, 5, 12);
const pages: LeaderboardPage[] = wildBoard.map((page) => parseLeaderboardPage(page));

describe("CrawlBoardWorkflow", () => {
  it("publishes a snapshot from persisted page batches", async () => {
    const store = new BoardStore(env.DB);
    const board = { region: "AP", mode: "wild" } as const;
    const runId = "AP-wild-156-test";
    await store.ensureCurrentSeason(board, pages[0]!.seasonId);
    await store.acquireLock(board, pages[0]!.seasonId, runId, Date.now(), 60_000);

    await using instance = await introspectWorkflowInstance(env.CRAWL_BOARD, runId);
    // Replay the fetch step from real captured pages instead of calling Blizzard.
    await instance.modify(async (m) => {
      await m.mockStepResult(
        { name: `fetch pages 1-${pages.length}` },
        pages.map((data, index) => ({ page: index + 1, data })),
      );
    });

    const params: CrawlParams = {
      ...board,
      seasonId: pages[0]!.seasonId,
      runId,
      kind: "full",
      pages: pages.length,
      totalPages: pages.length,
      expectedTotalSize: pages[0]!.totalSize,
      fingerprint: "fp",
      startedAt: NOW,
    };
    await env.CRAWL_BOARD.create({ id: runId, params });

    await instance.waitForStatus("complete");
    expect(await instance.getOutput()).toMatchObject({ published: true, totalSize: pages[0]!.totalSize });
    expect((await store.getCurrent(board))?.generatedAt).toBe(NOW);
  });
});
