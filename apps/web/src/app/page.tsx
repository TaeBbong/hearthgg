import { boardId, type BoardId } from "@hearthgg/core/domain";
import { Suspense } from "react";
import { BoardOverview, BoardOverviewSkeleton } from "@/components/board-overview";
import { Logo } from "@/components/logo";
import { SavedPlayers } from "@/components/saved-players";
import { SearchBox } from "@/components/search-box";
import { getBoardStatus } from "@/lib/data/queries";

/** Favorites and recent players link to each board's current season, known only on the server. */
async function SavedPlayersSection() {
  const currentSeasons: Partial<Record<BoardId, number>> = Object.fromEntries(
    (await getBoardStatus()).map((pointer) => [boardId(pointer), pointer.seasonId]),
  );
  return <SavedPlayers currentSeasons={currentSeasons} />;
}

export default function HomePage() {
  return (
    <>
      <section className="flex flex-col items-center gap-5 pb-12 pt-14 sm:pt-24">
        <h1 className="text-primary">
          <Logo size="lg" />
        </h1>
        <p className="text-center text-[13px] text-muted">
          투기장 · 지하 투기장 · 정규전 · 야생전 · 전장 리더보드를 아시아·태평양 · 아메리카 · 유럽에서 한 번에 검색하세요
        </p>
        <div className="w-full max-w-[640px]">
          <SearchBox size="lg" />
        </div>
        <Suspense fallback={null}>
          <SavedPlayersSection />
        </Suspense>
      </section>
      <Suspense fallback={<BoardOverviewSkeleton />}>
        <BoardOverview />
      </Suspense>
    </>
  );
}
