import type { Metadata } from "next";
import { Suspense } from "react";
import { ModeBadge, RegionBadge } from "@/components/badges";
import { Card, CardHeader, EmptyState, SkeletonRows } from "@/components/card";
import { RelativeTime } from "@/components/relative-time";
import { getBoardStatus } from "@/lib/data/queries";
import { formatCount } from "@/lib/format";
import { seasonLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "데이터 수집 상태" };

async function StatusTable() {
  const boards = await getBoardStatus();
  if (boards.length === 0) return <EmptyState title="아직 수집 기록이 없습니다" />;

  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-border bg-surface-muted text-[12px] text-muted">
          <th scope="col" className="py-2 pl-4 text-left font-normal">
            리더보드
          </th>
          <th scope="col" className="py-2 text-left font-normal">
            시즌
          </th>
          <th scope="col" className="py-2 text-right font-normal">
            랭커 수
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-normal">
            마지막 수집
          </th>
        </tr>
      </thead>
      <tbody>
        {boards.map((board) => (
          <tr key={`${board.region}:${board.mode}`} className="border-b border-border-subtle last:border-b-0">
            <td className="py-2 pl-4">
              <span className="flex items-center gap-1.5">
                <RegionBadge region={board.region} />
                <ModeBadge mode={board.mode} />
              </span>
            </td>
            <td className="py-2 text-muted">{seasonLabel(board.seasonId)}</td>
            <td className="py-2 text-right tabular-nums">{formatCount(board.totalSize ?? 0)}</td>
            <td className="py-2 pr-4 text-right">
              {board.consecutiveFailures > 0 ? (
                <span className="font-semibold text-danger" title={board.lastError ?? undefined}>
                  실패 {board.consecutiveFailures}회 ·{" "}
                </span>
              ) : null}
              <span className="text-muted">{board.lastSuccessAt ? <RelativeTime time={board.lastSuccessAt} /> : "대기 중"}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function StatusPage() {
  return (
    <div className="py-6">
      <Card>
        <CardHeader>
          <h1 className="text-base font-bold text-foreground">데이터 수집 상태</h1>
          <span className="text-[12px] text-muted">5분마다 변경을 확인하고, 바뀐 리더보드만 다시 수집합니다.</span>
        </CardHeader>
        <Suspense fallback={<SkeletonRows rows={15} />}>
          <StatusTable />
        </Suspense>
      </Card>
    </div>
  );
}
