import { MODES, type Mode } from "@hearthgg/core/domain";
import { normalizeName } from "@hearthgg/core/normalize";
import Link from "next/link";
import { searchPlayers } from "@/lib/data/queries";
import { formatCount, formatRating } from "@/lib/format";
import { MODE_LABEL, seasonLabel } from "@/lib/labels";
import { playerHref, searchHref } from "@/lib/routes";
import { ModeBadge, RankChip, RegionBadge } from "./badges";
import { Card, CardHeader, EmptyState, SkeletonRows } from "./card";

const RESULT_LIMIT = 200;

/** Bolds the matched part of a name (comparison is on normalized text). */
function Highlight({ name, query }: { name: string; query: string }) {
  const at = normalizeName(name).indexOf(normalizeName(query));
  // Normalization can change length (e.g. NFKC folds); only highlight when offsets still line up.
  if (at < 0 || normalizeName(name).length !== name.length) return <>{name}</>;
  const end = at + normalizeName(query).length;
  return (
    <>
      {name.slice(0, at)}
      <mark className="bg-transparent font-bold text-primary">{name.slice(at, end)}</mark>
      {name.slice(end)}
    </>
  );
}

export async function SearchResults({ query, mode }: { query: string; mode?: Mode }) {
  if (!query.trim()) {
    return (
      <Card>
        <EmptyState title="검색어를 입력해 주세요">배틀태그의 # 앞 이름으로 모든 지역과 모드를 검색합니다.</EmptyState>
      </Card>
    );
  }

  const { hits, total } = await searchPlayers(query, RESULT_LIMIT);
  const counts = new Map<Mode, number>();
  for (const hit of hits) counts.set(hit.mode, (counts.get(hit.mode) ?? 0) + 1);
  const visible = mode ? hits.filter((hit) => hit.mode === mode) : hits;
  const filterHref = (target?: Mode) => (target ? `${searchHref(query)}&mode=${target}` : searchHref(query));

  return (
    <Card>
      <CardHeader>
        <h1 className="text-base font-bold text-foreground">
          &ldquo;{query}&rdquo; 검색 결과 <span className="text-primary">{formatCount(total)}</span>건
        </h1>
        {total > hits.length ? <span className="text-[12px] text-muted">관련도 순 상위 {RESULT_LIMIT}건 표시</span> : null}
      </CardHeader>

      {hits.length === 0 ? (
        <EmptyState title="일치하는 플레이어가 없습니다">리더보드에는 상위권 플레이어만 공개됩니다. 철자를 확인해 주세요.</EmptyState>
      ) : (
        <>
          <nav aria-label="모드 필터" className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            {[undefined, ...MODES.filter((m) => counts.has(m))].map((target) => {
              const current = target === mode;
              return (
                <Link
                  key={target ?? "all"}
                  href={filterHref(target)}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                    current ? "bg-primary text-white" : "bg-surface-muted text-muted hover:text-foreground"
                  }`}
                >
                  {target ? MODE_LABEL[target] : "전체"} {target ? counts.get(target) : hits.length}
                </Link>
              );
            })}
          </nav>
          <ul className="divide-y divide-border-subtle">
            {visible.map((hit) => (
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
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    <Highlight name={hit.accountId} query={query} />
                  </span>
                  {hit.match === "exact" ? (
                    <span className="hidden rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-semibold text-success sm:inline">
                      정확히 일치
                    </span>
                  ) : null}
                  <span className="hidden w-16 text-right text-[12px] text-subtle sm:inline">{seasonLabel(hit.seasonId)}</span>
                  <span className="w-14 text-right tabular-nums text-muted">
                    {hit.rating !== null ? formatRating(hit.mode, hit.rating) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function SearchResultsSkeleton() {
  return (
    <Card>
      <div className="h-[53px] border-b border-border" />
      <SkeletonRows rows={8} />
    </Card>
  );
}
