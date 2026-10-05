import { describe, expect, it } from "vitest";
import { formatKstDateTime, formatRating, formatRelative, topPercent } from "./format";

describe("formatRating", () => {
  it("shows arena average wins with two decimals", () => {
    expect(formatRating("arena", 7.7)).toBe("7.70");
  });

  it("shows integer ratings with thousands separators", () => {
    expect(formatRating("battlegrounds", 18114)).toBe("18,114");
    expect(formatRating("undergroundarena", 8806)).toBe("8,806");
  });

  it("returns null when the mode or row has no rating", () => {
    expect(formatRating("standard", null)).toBeNull();
  });
});

describe("formatRelative", () => {
  const now = Date.UTC(2026, 9, 5, 12);
  it.each([
    [now - 20_000, "방금 전"],
    [now - 5 * 60_000, "5분 전"],
    [now - 3 * 3_600_000, "3시간 전"],
    [now - 2 * 86_400_000, "2일 전"],
  ])("formats %s", (time, expected) => {
    expect(formatRelative(time, now)).toBe(expected);
  });
});

describe("formatKstDateTime", () => {
  it("renders in Korea time", () => {
    expect(formatKstDateTime(Date.UTC(2026, 9, 5, 6, 7))).toBe("10월 5일 15:07");
  });
});

describe("topPercent", () => {
  it("rounds up to a readable percentage", () => {
    expect(topPercent(1, 20_000)).toBe("상위 0.01%");
    expect(topPercent(150, 1000)).toBe("상위 15%");
    expect(topPercent(1, 3)).toBe("상위 34%");
  });
});
