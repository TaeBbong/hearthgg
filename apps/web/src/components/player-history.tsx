import type { Board } from "@hearthgg/core/domain";
import { traceSeries } from "@hearthgg/core/history";
import type { SnapshotRow } from "@hearthgg/core/snapshot";
import { getHistory } from "@/lib/data/queries";
import { Card, CardHeader, SkeletonRows } from "./card";
import { RankHistoryChart } from "./rank-history-chart";

/** Daily rank trend; one traced series per namesake so their histories don't interleave. */
export async function PlayerHistory({
  board,
  seasonId,
  name,
  entries,
}: {
  board: Board;
  seasonId: number;
  name: string;
  entries: readonly SnapshotRow[];
}) {
  const points = await getHistory(board.region, board.mode, seasonId, name);
  const anchors = entries.map(([rank]) => rank);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-[15px] font-bold text-foreground">순위 추이</h2>
        <span className="text-[12px] text-muted">매일 23:50(KST) 마감 순위</span>
      </CardHeader>
      {anchors.map((anchor) => (
        <div key={anchor} className="border-b border-border-subtle last:border-b-0">
          {anchors.length > 1 ? <p className="px-4 pt-3 text-[12px] font-semibold text-muted">현재 #{anchor} 플레이어</p> : null}
          <RankHistoryChart mode={board.mode} points={points.length ? traceSeries(points, anchor) : []} />
        </div>
      ))}
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
