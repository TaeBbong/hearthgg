import { Suspense } from "react";
import { BoardOverview, BoardOverviewSkeleton } from "@/components/board-overview";
import { Logo } from "@/components/logo";
import { SearchBox } from "@/components/search-box";

export default function HomePage() {
  return (
    <>
      <section className="flex flex-col items-center gap-5 pb-12 pt-14 sm:pt-24">
        <h1 className="text-primary">
          <Logo size="lg" />
        </h1>
        <p className="text-center text-[13px] text-muted">
          투기장 · 지하 투기장 · 정규전 · 야생전 · 전장 리더보드를 아메리카 · 유럽 · 아시아에서 한 번에 검색하세요
        </p>
        <div className="w-full max-w-[640px]">
          <SearchBox size="lg" />
        </div>
      </section>
      <Suspense fallback={<BoardOverviewSkeleton />}>
        <BoardOverview />
      </Suspense>
    </>
  );
}
