"use client";

import type { Mode } from "@hearthgg/core/domain";
import type { RankPoint } from "@hearthgg/core/history";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatPointTime, formatRating, type Granularity } from "@/lib/format";
import { RATING_LABEL } from "@/lib/labels";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Live history can hold thousands of changes; the table lists the latest ones. */
const LIVE_TABLE_ROWS = 100;


const MARGIN = { top: 14, right: 44, bottom: 26, left: 48 };
const HEIGHT = 220;

/** Ticks on 1/2/5×10ⁿ steps; the axis extends to the outer ticks. Ranks start at 1. */
export function niceRankTicks(best: number, worst: number): number[] {
  const rough = Math.max((worst - best) / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough)!;
  const ticks: number[] = [];
  for (let tick = Math.floor(best / step) * step; tick <= Math.ceil(worst / step) * step; tick += step) {
    if (tick >= 1) ticks.push(tick);
  }
  return ticks;
}

export interface ChartPoint extends RankPoint {
  x: number;
  y: number;
}

export function chartModel(
  points: readonly RankPoint[],
  { width, height }: { width: number; height: number },
  { stepped = false }: { stepped?: boolean } = {},
) {
  const ranks = points.map((point) => point.rank);
  const ticks = niceRankTicks(Math.min(...ranks), Math.max(...ranks));
  const top = Math.min(ticks[0]!, ...ranks);
  const bottom = Math.max(ticks.at(-1)!, ...ranks, top + 1);

  const start = points[0]!.at;
  const span = Math.max(points.at(-1)!.at - start, stepped ? HOUR_MS : DAY_MS);
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const xOf = (at: number) => MARGIN.left + ((at - start) / span) * plotWidth;
  const yOf = (rank: number) => MARGIN.top + ((rank - top) / (bottom - top)) * plotHeight;

  const placed: ChartPoint[] = points.map((point) => ({ ...point, x: round(xOf(point.at)), y: round(yOf(point.rank)) }));
  return {
    points: placed,
    // Recorded ranks hold until the next change, so measurements draw as steps.
    path: placed
      .map((point, index) => (index === 0 ? `M${point.x},${point.y}` : stepped ? `H${point.x}V${point.y}` : `L${point.x},${point.y}`))
      .join(""),
    ticks: ticks.map((rank) => ({ rank, y: round(yOf(rank)) })),
    plot: { left: MARGIN.left, right: width - MARGIN.right, top: MARGIN.top, bottom: height - MARGIN.bottom },
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

const COPY = {
  day: {
    empty: "기록이 쌓이는 중입니다. 매일 23:50(KST)의 순위가 기록되며, 이틀 이상 쌓이면 그래프가 표시됩니다.",
    explore: "날짜별 순위 탐색",
    selected: "선택한 날짜의 순위",
    column: "날짜",
  },
  time: {
    empty: "아직 기록된 순위 변화가 없습니다. 순위가 바뀔 때마다 기록되어 그래프에 바로 반영됩니다.",
    explore: "시점별 순위 탐색",
    selected: "선택한 시점의 순위",
    column: "시각",
  },
} as const;

/** Follows the container width so marks keep their pixel specs instead of being stretched. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    // Without ResizeObserver the chart keeps its fallback width.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function RankHistoryChart({ mode, points, granularity }: { mode: Mode; points: readonly RankPoint[]; granularity: Granularity }) {
  const [containerRef, width] = useWidth<HTMLDivElement>(640);
  const [active, setActive] = useState<number | null>(null);

  const copy = COPY[granularity];
  if (points.length < 2) {
    return <p className="px-4 py-10 text-center text-[13px] text-muted">{copy.empty}</p>;
  }

  const model = chartModel(points, { width, height: HEIGHT }, { stepped: granularity === "time" });
  const format = (at: number) => formatPointTime(at, granularity);
  const tableRows = granularity === "time" ? points.slice(-LIVE_TABLE_ROWS).toReversed() : points;
  const first = points[0]!;
  const last = model.points.at(-1)!;
  const ratingLabel = RATING_LABEL[mode];
  const current = active === null ? null : model.points[active]!;

  function nearest(clientX: number, target: Element) {
    const x = clientX - target.getBoundingClientRect().left;
    let best = 0;
    model.points.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(model.points[best]!.x - x)) best = index;
    });
    return best;
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    setActive((index) => Math.min(Math.max((index ?? model.points.length - 1) + step, 0), model.points.length - 1));
  }

  return (
    <div className="px-2 pb-3 pt-2">
      <div ref={containerRef} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${format(first.at)}부터 ${format(last.at)}까지 순위 ${first.rank}위에서 ${last.rank}위`}
          className="block overflow-visible"
        >
          {model.ticks.map(({ rank, y }) => (
            <g key={rank}>
              <line x1={model.plot.left} x2={model.plot.right} y1={y} y2={y} className="stroke-border-subtle" strokeWidth={1} />
              <text x={model.plot.left - 8} y={y} dy="0.32em" textAnchor="end" className="fill-subtle text-[11px] tabular-nums">
                {rank.toLocaleString("ko-KR")}위
              </text>
            </g>
          ))}
          <text x={model.points[0]!.x} y={HEIGHT - 6} className="fill-subtle text-[11px]">
            {format(first.at)}
          </text>
          <text x={last.x} y={HEIGHT - 6} textAnchor="end" className="fill-subtle text-[11px]">
            {format(last.at)}
          </text>

          {current ? (
            <line x1={current.x} x2={current.x} y1={model.plot.top} y2={model.plot.bottom} className="stroke-muted" strokeWidth={1} />
          ) : null}

          <path d={model.path} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={last.x} cy={last.y} r={4} className="fill-primary stroke-surface" strokeWidth={2} />
          <text x={last.x + 8} y={last.y} dy="0.32em" className="fill-foreground text-[12px] font-bold tabular-nums">
            #{last.rank}
          </text>
          {current && current !== last ? (
            <circle cx={current.x} cy={current.y} r={4} className="fill-primary stroke-surface" strokeWidth={2} />
          ) : null}

          {/* Hit layer: the whole plot snaps to the nearest point, so readers aim at a time, not a 2px line. */}
          <g
            role="group"
            aria-label={copy.explore}
            tabIndex={0}
            className="outline-none focus-visible:[&>rect]:stroke-primary"
            onPointerMove={(event: PointerEvent<SVGGElement>) => setActive(nearest(event.clientX, event.currentTarget.ownerSVGElement!))}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((index) => index ?? model.points.length - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
          >
            <rect
              x={model.plot.left}
              y={model.plot.top}
              width={model.plot.right - model.plot.left}
              height={model.plot.bottom - model.plot.top}
              fill="transparent"
              strokeWidth={1}
              rx={4}
            />
          </g>
        </svg>

        {current ? (
          <div
            role="status"
            aria-label={copy.selected}
            className="pointer-events-none absolute top-0 z-10 min-w-28 -translate-x-1/2 rounded-md bg-surface px-3 py-2 text-[12px] shadow-lg ring-1 ring-border"
            style={{ left: Math.min(Math.max(current.x, 70), width - 70) }}
          >
            <p className="text-base font-bold tabular-nums text-foreground">#{current.rank.toLocaleString("ko-KR")}</p>
            <p className="whitespace-nowrap text-muted">{format(current.at)}</p>
            {ratingLabel && current.rating !== null ? (
              <p className="text-muted">
                {ratingLabel} <span className="font-semibold text-foreground">{formatRating(mode, current.rating)}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <details className="mt-2 px-2 text-[12px]">
        <summary className="cursor-pointer text-muted hover:text-foreground">
          표로 보기{granularity === "time" && points.length > LIVE_TABLE_ROWS ? ` (최근 ${LIVE_TABLE_ROWS}개)` : ""}
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 text-left font-normal">
                {copy.column}
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                순위
              </th>
              {ratingLabel ? (
                <th scope="col" className="py-1 text-right font-normal">
                  {ratingLabel}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((point) => (
              <tr key={point.at} className="border-t border-border-subtle">
                <td className="py-1">{format(point.at)}</td>
                <td className="py-1 text-right tabular-nums">{point.rank.toLocaleString("ko-KR")}</td>
                {ratingLabel ? <td className="py-1 text-right tabular-nums">{formatRating(mode, point.rating)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
