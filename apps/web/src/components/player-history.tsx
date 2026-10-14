import type { Board } from "@hearthgg/core/domain";
import type { SnapshotRow } from "@hearthgg/core/snapshot";
import type { ReactNode } from "react";
import { getHistory, getRankPoints } from "@/lib/data/queries";
import { dailySeries, liveSeries } from "@/lib/trend";
import { Card, SkeletonRows } from "./card";
import { RankHistoryChart } from "./rank-history-chart";
import { TrendTabs } from "./trend-tabs";

/**
 * Rank trend, either every recorded change (전체) or daily closing ranks (일별).
 * One traced series per namesake so their histories don't interleave.
 */
export async function PlayerHistory({
  board,
  seasonId,
  name,
  entries,
  observedAt,
}: {
  board: Board;
  seasonId: number;
  name: string;
  entries: readonly SnapshotRow[];
  /** Data time of the snapshot the entries come from. */
  observedAt: number | null;
}) {
  const [daily, points] = await Promise.all([
    getHistory(board.region, board.mode, seasonId, name),
    getRankPoints(board.region, board.mode, seasonId, name),
  ]);

  const perNamesake = (chart: (entry: SnapshotRow) => ReactNode) =>
    entries.map((entry) => (
      <div key={entry[0]} className="border-b border-border-subtle last:border-b-0">
        {entries.length > 1 ? <p className="px-4 pt-3 text-[12px] font-semibold text-muted">현재 #{entry[0]} 플레이어</p> : null}
        {chart(entry)}
      </div>
    ));

  return (
    <Card>
      <TrendTabs
        live={perNamesake((entry) => (
          <RankHistoryChart mode={board.mode} granularity="time" points={liveSeries(points, entry, observedAt)} />
        ))}
        daily={perNamesake(([rank]) => (
          <RankHistoryChart mode={board.mode} granularity="day" points={dailySeries(daily, rank)} />
        ))}
      />
    </Card>
  );
}

export function PlayerHistorySkeleton() {
  return (
    <Card>
      <div className="h-12 border-b border-border" />
      <SkeletonRows rows={4} />
    </Card>
  );
}
