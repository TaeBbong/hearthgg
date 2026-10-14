import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayerView, PlayerViewSkeleton } from "@/components/player-view";
import { MODE_LABEL, REGION_LABEL, seasonLabel } from "@/lib/labels";
import { parsePlayerParams as parse } from "@/lib/player-params";

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
