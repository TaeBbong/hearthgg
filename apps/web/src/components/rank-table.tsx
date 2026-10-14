import type { Board } from "@hearthgg/core/domain";
import type { SnapshotRow } from "@hearthgg/core/snapshot";
import type { RankChange } from "@hearthgg/core/standings";
import Link from "next/link";
import { formatRating } from "@/lib/format";
import { RATING_LABEL } from "@/lib/labels";
import { playerHref } from "@/lib/routes";
import { RankChangeBadge, RankChip } from "./badges";

export function RankTable({
  board,
  seasonId,
  rows,
  highlightRank,
  changes,
}: {
  board: Board;
  seasonId: number;
  rows: readonly SnapshotRow[];
  highlightRank?: number;
  /** Movement since the last daily close, aligned with `rows`. */
  changes?: readonly RankChange[];
}) {
  const ratingLabel = RATING_LABEL[board.mode];

  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-border bg-surface-muted text-[12px] text-muted">
          <th scope="col" className="w-16 py-2 text-center font-normal sm:w-20">
            순위
          </th>
          {changes ? (
            <th scope="col" className="w-12 py-2 text-center font-normal">
              변동
            </th>
          ) : null}
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
        {rows.map(([rank, accountId, rating], index) => {
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
              {changes ? (
                <td className="py-1.5 text-center">
                  <RankChangeBadge change={changes[index] ?? "new"} />
                </td>
              ) : null}
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
