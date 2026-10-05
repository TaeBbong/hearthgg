import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankHistoryChart, chartModel, niceRankTicks } from "./rank-history-chart";

const points = [
  { day: "2026-10-01", rank: 40, rating: 6.5 },
  { day: "2026-10-02", rank: 25, rating: 6.9 },
  { day: "2026-10-04", rank: 12, rating: 7.3 },
];

describe("niceRankTicks", () => {
  it("returns clean, rank-ordered ticks covering the range", () => {
    expect(niceRankTicks(12, 40)).toEqual([10, 20, 30, 40]);
    expect(niceRankTicks(1, 3)).toEqual([1, 2, 3]);
    expect(niceRankTicks(150, 1200)).toEqual([500, 1000, 1500]);
  });
});

describe("chartModel", () => {
  const model = chartModel(points, { width: 400, height: 200 });

  it("puts the best rank at the top", () => {
    const [first, , last] = model.points;
    expect(last!.y).toBeLessThan(first!.y);
  });

  it("spaces days by calendar distance, not by index", () => {
    const [a, b, c] = model.points;
    // Coordinates are rounded to 0.1px.
    expect(c!.x - b!.x).toBeCloseTo(2 * (b!.x - a!.x), 0);
  });

  it("starts the line at the first point", () => {
    expect(model.path.startsWith(`M${model.points[0]!.x},${model.points[0]!.y}`)).toBe(true);
  });
});

describe("RankHistoryChart", () => {
  it("explains when there is not enough history yet", () => {
    render(<RankHistoryChart mode="arena" points={points.slice(0, 1)} />);
    expect(screen.getByText(/기록이 쌓이는 중/)).toBeInTheDocument();
  });

  it("labels the latest rank directly and describes the chart", () => {
    render(<RankHistoryChart mode="arena" points={points} />);
    expect(screen.getByRole("img", { name: /10월 1일부터 10월 4일까지 순위 40위에서 12위/ })).toBeInTheDocument();
    expect(screen.getByText("#12")).toBeInTheDocument();
  });

  it("offers every value as a table", () => {
    render(<RankHistoryChart mode="arena" points={points} />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent("10월 4일");
    expect(rows[2]).toHaveTextContent("12");
    expect(rows[2]).toHaveTextContent("7.30");
  });

  it("shows a tooltip that keyboard users can move between days", () => {
    render(<RankHistoryChart mode="arena" points={points} />);
    const plot = screen.getByRole("group", { name: "날짜별 순위 탐색" });
    fireEvent.focus(plot);
    expect(screen.getByRole("status")).toHaveTextContent("#12");
    fireEvent.keyDown(plot, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("#25");
    expect(screen.getByRole("status")).toHaveTextContent("10월 2일");
    expect(screen.getByRole("status")).toHaveTextContent("6.90");
  });
});
