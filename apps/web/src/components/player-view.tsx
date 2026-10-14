import { PAGE_SIZE, pageOfRank, type Board } from "@hearthgg/core/domain";
import { TOP_PAGES } from "@hearthgg/core/refresh";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { SnapshotRow } from "@hearthgg/core/snapshot";
import { getHistory, getPlayer, getRankPoints } from "@/lib/data/queries";
import { formatPointTime, formatRating, topPercent } from "@/lib/format";
import { MODE_LABEL, RATING_LABEL, REGION_LABEL, seasonLabel } from "@/lib/labels";
import { blizzardLeaderboardUrl, boardHref, playerHref } from "@/lib/routes";
import { trendSummary } from "@/lib/trend";
import { ModeBadge, RankChangeBadge, RankChip, RegionBadge } from "./badges";
import { Card, CardHeader, EmptyState, SkeletonRows } from "./card";
import { PlayerHistory, PlayerHistorySkeleton } from "./player-history";
import { RelativeTime } from "./relative-time";
import { FavoriteButton, RecordVisit } from "./saved-players";
import { ShareButton } from "./share-button";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums text-foreground">{children}</dd>
    </div>
  );
}

/** 전일 대비 / 최고 순위 for one namesake; streams in after the profile (shares the history queries). */
async function EntryTrendStats({
  board,
  seasonId,
  name,
  entry,
  observedAt,
}: {
  board: Board;
  seasonId: number;
  name: string;
  entry: SnapshotRow;
  observedAt: number | null;
}) {
  const [daily, points] = await Promise.all([
    getHistory(board.region, board.mode, seasonId, name),
    getRankPoints(board.region, board.mode, seasonId, name),
  ]);
  const { best, change, baselineDay } = trendSummary({ daily, points, entry, observedAt });
  return (
    <>
      {change !== null && baselineDay ? (
        <Stat label={`${formatPointTime(Date.parse(baselineDay), "day")} 마감 대비`}>
          <RankChangeBadge change={change} size="lg" />
        </Stat>
      ) : null}
      {best ? (
        <Stat label="최고 순위">
          #{best.rank.toLocaleString("ko-KR")} <span className="text-[12px] font-normal text-muted">{formatPointTime(best.at, "day")}</span>
        </Stat>
      ) : null}
    </>
  );
}

export async function PlayerView({ board, seasonId, name }: { board: Board; seasonId: number; name: string }) {
  const player = await getPlayer(board.region, board.mode, seasonId, name);
  if (!player) notFound();

  const { pointer, entries, otherBoards, displayName } = player;
  // A player ranked below the top pages was last read by the slower full crawl.
  const deep = player.deepGeneratedAt !== null && (entries[0]?.[0] ?? 0) > TOP_PAGES * PAGE_SIZE;
  const dataTime = deep ? player.deepGeneratedAt : pointer.generatedAt;
  const ratingLabel = RATING_LABEL[board.mode];
  const seasonQuery = pointer.isCurrent ? {} : { seasonId };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <RegionBadge region={board.region} />
              <ModeBadge mode={board.mode} />
              <span className="text-[12px] text-muted">{seasonLabel(seasonId)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="break-all text-2xl font-extrabold text-foreground">{displayName}</h1>
              {entries.length > 0 ? (
                <>
                  <FavoriteButton player={{ ...board, name: displayName }} />
                  <ShareButton
                    title={`${displayName} - ${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]} | hearthgg`}
                    text={`${displayName} · ${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]} ${entries[0]![0].toLocaleString("ko-KR")}위`}
                  />
                  <RecordVisit player={{ ...board, name: displayName }} />
                </>
              ) : null}
            </div>
            {dataTime ? (
              <p className="text-[12px] text-muted">
                <RelativeTime time={dataTime} /> 수집된 {REGION_LABEL[board.region]} 리더보드 기준
              </p>
            ) : null}
          </div>
          {entries.length > 0 ? (
            <a
              href={blizzardLeaderboardUrl(board, seasonId, entries[0]![0])}
              target="_blank"
              rel="noreferrer"
              className="self-start text-[12px] text-muted hover:text-primary sm:self-auto"
            >
              Blizzard 공식 리더보드에서 확인 ↗
            </a>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState title={`${seasonLabel(seasonId)} ${MODE_LABEL[board.mode]} 리더보드에서 찾을 수 없습니다`}>
              리더보드에는 상위권 플레이어만 공개됩니다. 이름(배틀태그의 # 앞부분)을 정확히 입력했는지 확인해 주세요.
            </EmptyState>
          </div>
        ) : (
          <>
            {entries.length > 1 ? (
              <p className="border-t border-border bg-primary-soft px-5 py-2 text-[12px] text-primary">
                같은 이름의 플레이어가 이 리더보드에 {entries.length}명 있습니다. 배틀태그 번호는 공개되지 않아 구분할 수 없습니다.
              </p>
            ) : null}
            <ul className="divide-y divide-border-subtle border-t border-border">
              {entries.map((entry) => {
                const [rank, , rating] = entry;
                return (
                  <li key={rank} className="flex flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4">
                    <dl className="flex flex-wrap gap-x-8 gap-y-3">
                      <Stat label="순위">#{rank.toLocaleString("ko-KR")}</Stat>
                      {ratingLabel ? <Stat label={ratingLabel}>{formatRating(board.mode, rating)}</Stat> : null}
                      <Stat label="백분위">{topPercent(rank, pointer.totalSize ?? rank)}</Stat>
                      <Suspense fallback={null}>
                        <EntryTrendStats board={board} seasonId={seasonId} name={name} entry={entry} observedAt={pointer.generatedAt} />
                      </Suspense>
                    </dl>
                    <Link
                      href={`${boardHref(board, { ...seasonQuery, page: pageOfRank(rank) })}${pageOfRank(rank) > 1 ? "&" : "?"}highlight=${rank}#rank-${rank}`}
                      className="ml-auto rounded bg-primary px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-strong"
                    >
                      랭킹에서 보기
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {entries.length > 0 ? (
        // Streams separately so the profile shows before the history query finishes.
        <Suspense fallback={<PlayerHistorySkeleton />}>
          <PlayerHistory board={board} seasonId={seasonId} name={name} entries={entries} observedAt={pointer.generatedAt} />
        </Suspense>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-bold text-foreground">다른 리더보드의 같은 이름</h2>
          <span className="text-[12px] text-muted">현재 시즌 기준</span>
        </CardHeader>
        {otherBoards.length === 0 ? (
          <EmptyState title="다른 리더보드에서는 찾지 못했습니다" />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {otherBoards.map((hit) => (
              <li key={`${hit.region}:${hit.mode}:${hit.rank}`}>
                <Link
                  href={playerHref(hit, hit.seasonId, hit.accountId)}
                  className="flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-surface-muted"
                >
                  <RegionBadge region={hit.region} />
                  <ModeBadge mode={hit.mode} />
                  <span className="flex w-12 shrink-0 justify-center">
                    <RankChip rank={hit.rank} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{hit.accountId}</span>
                  {hit.rating !== null ? (
                    <span className="tabular-nums text-muted">{formatRating(hit.mode, hit.rating)}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function PlayerViewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="h-32 animate-pulse" />
      </Card>
      <Card>
        <SkeletonRows rows={3} />
      </Card>
    </div>
  );
}
