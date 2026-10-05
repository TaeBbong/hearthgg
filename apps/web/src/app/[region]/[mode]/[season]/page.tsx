import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardView, BoardViewSkeleton, parsePositiveInt } from "@/components/board-view";
import { MODE_LABEL, REGION_LABEL, seasonLabel } from "@/lib/labels";
import { parseBoardParams } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/[region]/[mode]/[season]">): Promise<Metadata> {
  const resolved = await params;
  const board = parseBoardParams(resolved);
  const seasonId = parsePositiveInt(resolved.season);
  if (!board || !seasonId) return {};
  return { title: `${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]} ${seasonLabel(seasonId)} 랭킹` };
}

export default function SeasonPage({ params, searchParams }: PageProps<"/[region]/[mode]/[season]">) {
  return (
    <Suspense fallback={<BoardViewSkeleton />}>
      {Promise.all([params, searchParams]).then(([resolved, query]) => {
        const board = parseBoardParams(resolved);
        const seasonId = parsePositiveInt(resolved.season);
        if (!board || !seasonId) notFound();
        return (
          <BoardView
            board={board}
            seasonId={seasonId}
            page={parsePositiveInt(query.page) ?? 1}
            highlight={parsePositiveInt(query.highlight)}
          />
        );
      })}
    </Suspense>
  );
}
