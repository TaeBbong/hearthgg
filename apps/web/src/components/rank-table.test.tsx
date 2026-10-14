import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankTable } from "./rank-table";

describe("RankTable", () => {
  it("renders rank, linked name and formatted rating", () => {
    render(
      <RankTable
        board={{ region: "AP", mode: "arena" }}
        seasonId={56}
        rows={[
          [1, "Sinah", 7.7],
          [2, "하스의신", 7.12],
        ]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "평균 승수" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("1")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("7.70")).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("link", { name: "하스의신" })).toHaveAttribute(
      "href",
      `/ap/arena/56/${encodeURIComponent("하스의신")}`,
    );
  });

  it("omits the rating column for legend boards", () => {
    render(<RankTable board={{ region: "EU", mode: "standard" }} seasonId={156} rows={[[1, "x", null]]} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });

  it("shows movement since the last close when given", () => {
    render(
      <RankTable
        board={{ region: "AP", mode: "wild" }}
        seasonId={156}
        rows={[
          [1, "a", null],
          [2, "b", null],
          [3, "c", null],
          [4, "d", null],
        ]}
        changes={[3, -2, 0, "new"]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "변동" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("3계단 상승");
    expect(rows[1]).toHaveTextContent("2계단 하락");
    expect(rows[2]).toHaveTextContent("변동 없음");
    expect(rows[3]).toHaveTextContent("NEW");
  });

  it("highlights the requested rank", () => {
    render(
      <RankTable
        board={{ region: "AP", mode: "wild" }}
        seasonId={156}
        rows={[
          [1, "a", null],
          [2, "b", null],
        ]}
        highlightRank={2}
      />,
    );
    expect(screen.getAllByRole("row")[2]).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("row")[2]).toHaveAttribute("id", "rank-2");
  });
});
