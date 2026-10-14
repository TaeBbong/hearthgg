"use client";

import { useState, type ReactNode } from "react";
import { CardHeader } from "./card";

const VIEWS = {
  live: { label: "전체", caption: "순위가 바뀔 때마다 기록" },
  daily: { label: "일별", caption: "매일 23:50(KST) 마감 순위" },
} as const;

type View = keyof typeof VIEWS;

/** Header with a 전체/일별 switch; both charts arrive server-rendered and only the chosen one mounts. */
export function TrendTabs({ live, daily }: { live: ReactNode; daily: ReactNode }) {
  const [view, setView] = useState<View>("live");

  return (
    <>
      <CardHeader>
        <h2 className="text-[15px] font-bold text-foreground">순위 추이</h2>
        <span className="text-[12px] text-muted">{VIEWS[view].caption}</span>
        <div role="group" aria-label="추이 단위" className="ml-auto inline-flex rounded-md bg-surface-muted p-0.5 text-[12px]">
          {(Object.keys(VIEWS) as View[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className="rounded px-2.5 py-1 font-medium text-muted hover:text-foreground aria-pressed:bg-surface aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {VIEWS[key].label}
            </button>
          ))}
        </div>
      </CardHeader>
      {view === "live" ? live : daily}
    </>
  );
}
