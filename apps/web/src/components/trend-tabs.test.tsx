import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendTabs } from "./trend-tabs";

describe("TrendTabs", () => {
  it("shows every measurement by default and switches to daily closing ranks", () => {
    render(<TrendTabs live={<p>live chart</p>} daily={<p>daily chart</p>} />);
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("live chart")).toBeInTheDocument();
    expect(screen.getByText(/바뀔 때마다/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "일별" }));
    expect(screen.getByRole("button", { name: "일별" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("daily chart")).toBeInTheDocument();
    expect(screen.queryByText("live chart")).not.toBeInTheDocument();
    expect(screen.getByText(/23:50\(KST\) 마감/)).toBeInTheDocument();
  });
});
