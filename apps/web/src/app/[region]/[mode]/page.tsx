import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardView, BoardViewSkeleton, parsePositiveInt } from "@/components/board-view";
import { MODE_LABEL, REGION_LABEL } from "@/lib/labels";
import { parseBoardParams } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/[region]/[mode]">): Promise<Metadata> {
  const board = parseBoardParams(await params);
  if (!board) return {};
  return { title: `${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]} 랭킹` };
}

export default function CurrentSeasonPage({ params, searchParams }: PageProps<"/[region]/[mode]">) {
  return (
    <Suspense fallback={<BoardViewSkeleton />}>
      {Promise.all([params, searchParams]).then(([resolved, query]) => {
        const board = parseBoardParams(resolved);
        if (!board) notFound();
        return <BoardView board={board} page={parsePositiveInt(query.page) ?? 1} highlight={parsePositiveInt(query.highlight)} />;
      })}
    </Suspense>
  );
}
