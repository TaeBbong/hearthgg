import { PAGE_SIZE, type BoardId } from "@hearthgg/core";

export interface FakeBoard {
  seasonId: number;
  names: string[];
  /** Past seasons, served when the request pins `seasonId`. */
  past?: Record<number, string[]>;
}

/**
 * In-memory stand-in for Blizzard's leaderboard endpoint. Boards not listed in
 * `boards` answer as empty boards in `defaultSeasonId`.
 */
export function createFakeBlizzard(boards: Partial<Record<BoardId, FakeBoard>> = {}, defaultSeasonId = 100) {
  const requests: URL[] = [];
  let failWith: number | undefined;
  let inFlight = 0;
  let peak = 0;

  const fetch: typeof globalThis.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url);
    inFlight++;
    peak = Math.max(peak, inFlight);
    // Yield so concurrent callers overlap and `peak` reflects real parallelism.
    await new Promise((resolve) => setTimeout(resolve, 1));
    inFlight--;
    if (failWith) return new Response("upstream down", { status: failWith });

    const id = `${url.searchParams.get("region")}:${url.searchParams.get("leaderboardId")}` as BoardId;
    const board = boards[id] ?? { seasonId: defaultSeasonId, names: [] };
    const pinned = url.searchParams.get("seasonId");
    const seasonId = pinned ? Number(pinned) : board.seasonId;
    const names = seasonId === board.seasonId ? board.names : (board.past?.[seasonId] ?? []);
    const page = Number(url.searchParams.get("page"));
    const rows = names
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map((accountid, offset) => ({ rank: (page - 1) * PAGE_SIZE + offset + 1, accountid, rating: 100 - offset }));

    return Response.json({
      seasonId,
      leaderboard: {
        columns: ["rank", "accountid", "rating"],
        rows,
        pagination: rows.length
          ? { totalPages: Math.ceil(names.length / PAGE_SIZE), totalSize: names.length }
          : { totalPages: 0, totalSize: 0 },
      },
    });
  };

  return {
    fetch,
    boards,
    requests,
    failAll(status: number | undefined) {
      failWith = status;
    },
    /** Most requests that were in flight at once. */
    peak: () => peak,
  };
}

export function names(count: number, prefix = "player"): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}
