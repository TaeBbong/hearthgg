import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parsePositiveInt } from "@/components/board-view";
import { PlayerView, PlayerViewSkeleton } from "@/components/player-view";
import { MODE_LABEL, REGION_LABEL, seasonLabel } from "@/lib/labels";
import { parseBoardParams } from "@/lib/routes";

type Params = Awaited<PageProps<"/[region]/[mode]/[season]/[name]">["params"]>;

/** Segments arrive percent-encoded; a stray "%" in a name must not crash the page. */
function decodeName(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function parse(params: Params) {
  const board = parseBoardParams(params);
  const seasonId = parsePositiveInt(params.season);
  if (!board || !seasonId) return null;
  return { board, seasonId, name: decodeName(params.name) };
}

export async function generateMetadata({ params }: PageProps<"/[region]/[mode]/[season]/[name]">): Promise<Metadata> {
  const parsed = parse(await params);
  if (!parsed) return {};
  const { board, seasonId, name } = parsed;
  return {
    title: `${name} - ${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]}`,
    description: `${name}의 ${REGION_LABEL[board.region]} ${MODE_LABEL[board.mode]} ${seasonLabel(seasonId)} 리더보드 순위`,
  };
}

export default function PlayerPage({ params }: PageProps<"/[region]/[mode]/[season]/[name]">) {
  return (
    <Suspense fallback={<PlayerViewSkeleton />}>
      {params.then((resolved) => {
        const parsed = parse(resolved);
        if (!parsed) notFound();
        return <PlayerView {...parsed} />;
      })}
    </Suspense>
  );
}
