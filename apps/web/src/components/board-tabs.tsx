import { MODES, REGIONS, type Board } from "@hearthgg/core/domain";
import Link from "next/link";
import { MODE_LABEL, REGION_LABEL } from "@/lib/labels";
import { boardHref } from "@/lib/routes";

/** op.gg-style segmented tabs: region on top, modes below. */
export function BoardTabs({ board }: { board: Board }) {
  return (
    <div className="flex flex-col gap-2 py-4">
      <nav aria-label="지역" className="flex gap-1">
        {REGIONS.map((region) => {
          const current = region === board.region;
          return (
            <Link
              key={region}
              href={boardHref({ region, mode: board.mode })}
              aria-current={current ? "page" : undefined}
              className={`rounded px-3 py-1.5 text-[13px] font-semibold ${
                current ? "bg-primary text-white" : "bg-surface text-muted ring-1 ring-border hover:text-foreground"
              }`}
            >
              {REGION_LABEL[region]}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="모드" className="flex gap-4 overflow-x-auto border-b border-border [scrollbar-width:none]">
        {MODES.map((mode) => {
          const current = mode === board.mode;
          return (
            <Link
              key={mode}
              href={boardHref({ region: board.region, mode })}
              aria-current={current ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-1 pb-2 pt-1 text-sm ${
                current ? "border-primary font-bold text-primary" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {MODE_LABEL[mode]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
