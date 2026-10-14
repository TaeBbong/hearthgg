import type { Board } from "@hearthgg/core/domain";
import type { PlayerView } from "./data/leaderboard-service";
import { formatKstDateTime, formatRating, topPercent } from "./format";
import { MODE_LABEL, RATING_LABEL, REGION_LABEL, seasonLabel } from "./labels";

export interface PlayerCard {
  name: string;
  board: string;
  /** "#2", or null when the name is not ranked. */
  rank: string | null;
  details: string[];
  /** Data time of the ranking. */
  note: string | null;
}

/** Text of a player's share card; the first namesake leads, the others are counted. */
export function playerCard(board: Board, seasonId: number, name: string, view: PlayerView | null): PlayerCard {
  const boardLine = `${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]} · ${seasonLabel(seasonId)}`;
  const first = view?.entries[0];
  if (!view || !first) return { name: view?.displayName ?? name, board: boardLine, rank: null, details: ["리더보드에서 찾을 수 없음"], note: null };

  const [rank, , rating] = first;
  const ratingLabel = RATING_LABEL[board.mode];
  const details = [topPercent(rank, view.pointer.totalSize ?? rank)];
  if (ratingLabel && rating !== null) details.push(`${ratingLabel} ${formatRating(board.mode, rating)}`);
  if (view.entries.length > 1) details.push(`같은 이름 ${view.entries.length}명`);
  return {
    name: view.displayName,
    board: boardLine,
    rank: `#${rank.toLocaleString("ko-KR")}`,
    details,
    note: view.pointer.generatedAt ? `${formatKstDateTime(view.pointer.generatedAt)} 기준` : null,
  };
}
