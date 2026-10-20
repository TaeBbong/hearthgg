import { boardId } from "@hearthgg/core/domain";
import { getBoardStatus, getUpstreamBlock } from "@/lib/data/queries";

/** Machine-readable crawl health for uptime checks; error details stay in the crawler's alerts and logs. */
export async function GET() {
  const [boards, upstreamBlockedUntil] = await Promise.all([getBoardStatus(), getUpstreamBlock()]);
  return Response.json(
    {
      upstreamBlockedUntil,
      boards: boards.map((board) => ({
        board: boardId(board),
        seasonId: board.seasonId,
        totalSize: board.totalSize,
        generatedAt: board.generatedAt,
        lastSuccessAt: board.lastSuccessAt,
        consecutiveFailures: board.consecutiveFailures,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
