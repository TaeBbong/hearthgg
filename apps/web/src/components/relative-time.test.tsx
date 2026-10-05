import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelativeTime } from "./relative-time";

describe("RelativeTime", () => {
  const start = Date.UTC(2026, 9, 5, 6, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
  });
  afterEach(() => vi.useRealTimers());

  it("shows relative time with the absolute time as a machine-readable value", () => {
    render(<RelativeTime time={start - 5 * 60_000} />);
    const time = screen.getByText("5분 전");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", new Date(start - 5 * 60_000).toISOString());
    expect(time).toHaveAttribute("title", "10월 5일 14:55");
  });

  it("keeps itself current", () => {
    render(<RelativeTime time={start - 5 * 60_000} />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("6분 전")).toBeInTheDocument();
  });
});
