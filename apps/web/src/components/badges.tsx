import type { Mode, Region } from "@hearthgg/core/domain";
import { MODE_LABEL } from "@/lib/labels";

const MODE_DOT: Record<Mode, string> = {
  arena: "bg-mode-arena",
  undergroundarena: "bg-mode-undergroundarena",
  standard: "bg-mode-standard",
  wild: "bg-mode-wild",
  battlegrounds: "bg-mode-battlegrounds",
};

export function ModeBadge({ mode }: { mode: Mode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
      <span className={`size-1.5 rounded-full ${MODE_DOT[mode]}`} aria-hidden />
      {MODE_LABEL[mode]}
    </span>
  );
}

export function RegionBadge({ region }: { region: Region }) {
  return (
    <span className="inline-flex items-center rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-primary">
      {region}
    </span>
  );
}

/** Rank number with gold/silver/bronze chips for the podium. */
export function RankChip({ rank, className = "" }: { rank: number; className?: string }) {
  const podium = rank === 1 ? "bg-rank-1 text-white" : rank === 2 ? "bg-rank-2 text-white" : rank === 3 ? "bg-rank-3 text-white" : "";
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-[13px] font-bold tabular-nums ${
        podium || "text-foreground"
      } ${className}`}
    >
      {rank}
    </span>
  );
}
