"use client";

import type { Board } from "@hearthgg/core/domain";
import { useRouter } from "next/navigation";
import { seasonLabel } from "@/lib/labels";
import { boardHref } from "@/lib/routes";

export function SeasonSelect({ board, seasons, value }: { board: Board; seasons: number[]; value: number }) {
  const router = useRouter();
  if (seasons.length <= 1) return <span className="text-[13px] text-muted">{seasonLabel(value)}</span>;

  return (
    <select
      aria-label="시즌"
      value={value}
      onChange={(event) => {
        const seasonId = Number(event.target.value);
        // The newest season lives at the canonical season-less URL.
        router.push(boardHref(board, seasonId === seasons[0] ? {} : { seasonId }));
      }}
      className="rounded bg-surface-muted px-2 py-1 text-[13px] text-foreground ring-1 ring-border"
    >
      {seasons.map((seasonId) => (
        <option key={seasonId} value={seasonId}>
          {seasonLabel(seasonId)}
        </option>
      ))}
    </select>
  );
}
