import type { Board } from "@hearthgg/core/domain";
import type { SnapshotRow } from "@hearthgg/core/snapshot";
import Link from "next/link";
import { formatRating } from "@/lib/format";
import { RATING_LABEL } from "@/lib/labels";
import { playerHref } from "@/lib/routes";
import { RankChip } from "./badges";

export function RankTable({
  board,
  seasonId,
  rows,
  highlightRank,
}: {
  board: Board;
  seasonId: number;
  rows: readonly SnapshotRow[];
  highlightRank?: number;
}) {
  const ratingLabel = RATING_LABEL[board.mode];

  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-border bg-surface-muted text-[12px] text-muted">
          <th scope="col" className="w-20 py-2 text-center font-normal">
            순위
          </th>
          <th scope="col" className="py-2 pl-3 text-left font-normal">
            플레이어
          </th>
          {ratingLabel ? (
            <th scope="col" className="w-28 py-2 pr-4 text-right font-normal">
              {ratingLabel}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map(([rank, accountId, rating]) => {
          const highlighted = rank === highlightRank;
          return (
            <tr
              key={rank}
              id={`rank-${rank}`}
              aria-current={highlighted ? "true" : undefined}
              className={`scroll-mt-24 border-b border-border-subtle last:border-b-0 ${
                highlighted ? "bg-primary-soft" : "hover:bg-surface-muted"
              }`}
            >
              <td className="py-1.5 text-center">
                <RankChip rank={rank} />
              </td>
              <td className="py-1.5 pl-3">
                <Link
                  href={playerHref(board, seasonId, accountId)}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {accountId}
                </Link>
              </td>
              {ratingLabel ? (
                <td className="py-1.5 pr-4 text-right font-semibold tabular-nums text-foreground">
                  {formatRating(board.mode, rating)}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
