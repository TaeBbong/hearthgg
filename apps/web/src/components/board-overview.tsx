import { MODES, REGIONS, type Mode } from "@hearthgg/core/domain";
import Link from "next/link";
import { getOverview } from "@/lib/data/queries";
import { formatCount, formatRating } from "@/lib/format";
import { MODE_LABEL } from "@/lib/labels";
import { boardHref, playerHref } from "@/lib/routes";
import { RegionBadge } from "./badges";
import { Card, CardHeader, EmptyState, SkeletonRows } from "./card";
import { RelativeTime } from "./relative-time";

const MODE_ACCENT: Record<Mode, string> = {
  arena: "border-t-mode-arena",
  undergroundarena: "border-t-mode-undergroundarena",
  standard: "border-t-mode-standard",
  wild: "border-t-mode-wild",
  battlegrounds: "border-t-mode-battlegrounds",
};

/** One card per mode showing each region's #1 and board size. */
export async function BoardOverview() {
  const overview = await getOverview();
  if (overview.length === 0) {
    return (
      <Card>
        <EmptyState title="아직 수집된 랭킹이 없습니다">첫 수집이 끝나면 이곳에 모드별 1위가 표시됩니다.</EmptyState>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODES.map((mode) => {
        const boards = overview.filter(({ pointer }) => pointer.mode === mode);
        const latest = Math.max(0, ...boards.map(({ pointer }) => pointer.generatedAt ?? 0));
        return (
          <Card key={mode} className={`border-t-[3px] ${MODE_ACCENT[mode]}`}>
            <CardHeader className="justify-between">
              <h2 className="text-[15px] font-bold text-foreground">{MODE_LABEL[mode]}</h2>
              <Link href={boardHref({ region: "AP", mode })} className="text-[12px] text-muted hover:text-primary">
                전체 랭킹 ›
              </Link>
            </CardHeader>
            <ul className="divide-y divide-border-subtle">
              {REGIONS.map((region) => {
                const board = boards.find(({ pointer }) => pointer.region === region);
                const top = board?.top[0];
                return (
                  <li key={region} className="flex items-center gap-2 px-4 py-2.5 text-[13px]">
                    <RegionBadge region={region} />
                    {board && top ? (
                      <>
                        <span className="text-[11px] font-bold text-rank-1">1위</span>
                        <Link
                          href={playerHref({ region, mode }, board.pointer.seasonId, top[1])}
                          className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary"
                        >
                          {top[1]}
                        </Link>
                        <span className="shrink-0 tabular-nums text-muted">
                          {top[2] !== null ? formatRating(mode, top[2]) : `${formatCount(board.pointer.totalSize ?? 0)}명`}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-subtle">수집 대기 중</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {latest > 0 ? (
              <p className="border-t border-border-subtle px-4 py-2 text-[11px] text-subtle">
                <RelativeTime time={latest} /> 갱신
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

export function BoardOverviewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODES.map((mode) => (
        <Card key={mode}>
          <div className="h-12 border-b border-border" />
          <SkeletonRows rows={3} />
        </Card>
      ))}
    </div>
  );
}
