import { isMode, pageOfRank, regionFromSlug, regionSlug, type Board } from "@hearthgg/core/domain";

export function boardHref(board: Board, { seasonId, page }: { seasonId?: number; page?: number } = {}): string {
  const path = `/${regionSlug(board.region)}/${board.mode}${seasonId === undefined ? "" : `/${seasonId}`}`;
  return page && page > 1 ? `${path}?page=${page}` : path;
}

export function playerHref(board: Board, seasonId: number, name: string): string {
  return `/${regionSlug(board.region)}/${board.mode}/${seasonId}/${encodeURIComponent(name)}`;
}

export function searchHref(query: string): string {
  return `/search?${new URLSearchParams({ q: query })}`;
}

export function parseBoardParams({ region, mode }: { region: string; mode: string }): Board | null {
  const parsedRegion = regionFromSlug(region);
  if (!parsedRegion || !isMode(mode)) return null;
  return { region: parsedRegion, mode };
}

export function blizzardLeaderboardUrl(board: Board, seasonId: number, rank: number): string {
  const params = new URLSearchParams({
    region: board.region,
    leaderboardId: board.mode,
    seasonId: String(seasonId),
    page: String(pageOfRank(rank)),
  });
  return `https://hearthstone.blizzard.com/ko-kr/community/leaderboards/?${params}`;
}
