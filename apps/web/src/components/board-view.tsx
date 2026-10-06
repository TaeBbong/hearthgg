import { PAGE_SIZE, type Board } from "@hearthgg/core/domain";
import { TOP_PAGES } from "@hearthgg/core/refresh";
import { notFound } from "next/navigation";
import { getLeaderboard } from "@/lib/data/queries";
import { formatCount } from "@/lib/format";
import { MODE_LABEL, REGION_LABEL } from "@/lib/labels";
import { boardHref } from "@/lib/routes";
import { Card, CardHeader, EmptyState, SkeletonRows } from "./card";
import { Pagination } from "./pagination";
import { RankTable } from "./rank-table";
import { RelativeTime } from "./relative-time";
import { SeasonSelect } from "./season-select";

export function parsePositiveInt(value: string | string[] | undefined): number | undefined {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * One page of a board. `seasonId` undefined means the current season at the
 * canonical URL; an explicit unknown season is a 404.
 */
export async function BoardView({
  board,
  seasonId,
  page,
  highlight,
}: {
  board: Board;
  seasonId?: number;
  page: number;
  highlight?: number;
}) {
  const data = await getLeaderboard(board.region, board.mode, seasonId, page);
  if (!data) {
    if (seasonId !== undefined) notFound();
    return (
      <Card>
        <EmptyState title="아직 수집된 데이터가 없습니다">이 리더보드는 다음 수집 주기에 채워집니다.</EmptyState>
      </Card>
    );
  }

  const { pointer } = data;
  const href = (target: number) => boardHref(board, { seasonId, page: target });
  // Ranks below the top pages are refreshed less often; say so on those pages.
  const firstRank = data.rows[0]?.[0] ?? 0;
  const deep = data.deepGeneratedAt !== null && firstRank > TOP_PAGES * PAGE_SIZE;
  const dataTime = deep ? data.deepGeneratedAt : pointer.generatedAt;

  return (
    <Card>
      <CardHeader>
        <h1 className="text-base font-bold text-foreground">
          {REGION_LABEL[board.region]} {MODE_LABEL[board.mode]} 랭킹
        </h1>
        <SeasonSelect board={board} seasons={data.seasons} value={data.seasonId} />
        <p className="ml-auto text-[12px] text-muted">
          총 {formatCount(pointer.totalSize ?? 0)}명
          {dataTime ? (
            <>
              {" · "}
              {deep ? `${formatCount(TOP_PAGES * PAGE_SIZE + 1)}위 이하 ` : null}
              <RelativeTime time={dataTime} /> 기준
            </>
          ) : null}
        </p>
      </CardHeader>
      {data.rows.length ? (
        <RankTable board={board} seasonId={data.seasonId} rows={data.rows} highlightRank={highlight} />
      ) : (
        <EmptyState title="이 페이지에는 랭커가 없습니다" />
      )}
      <Pagination page={data.page} totalPages={data.totalPages} href={href} />
    </Card>
  );
}

export function BoardViewSkeleton() {
  return (
    <Card>
      <div className="h-[53px] border-b border-border" />
      <SkeletonRows rows={12} />
    </Card>
  );
}
