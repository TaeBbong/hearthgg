import { boardId } from "@hearthgg/core/domain";
import { getBoardStatus } from "@/lib/data/queries";

/** Machine-readable crawl health for uptime checks. */
export async function GET() {
  const boards = await getBoardStatus();
  return Response.json(
    {
      boards: boards.map((board) => ({
        board: boardId(board),
        seasonId: board.seasonId,
        totalSize: board.totalSize,
        generatedAt: board.generatedAt,
        lastSuccessAt: board.lastSuccessAt,
        consecutiveFailures: board.consecutiveFailures,
        lastError: board.lastError,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
