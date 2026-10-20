import { describe, expect, it } from "vitest";
import { playerCard } from "./og-card";

const pointer = {
  region: "AP",
  mode: "arena",
  seasonId: 56,
  isCurrent: true,
  snapshotKey: "k",
  generatedAt: Date.UTC(2026, 9, 14, 9, 45), // 18:45 KST
  totalSize: 11_360,
  lastSuccessAt: null,
  consecutiveFailures: 0,
} as const;

describe("playerCard", () => {
  it("leads with the rank, then percentile and rating", () => {
    const card = playerCard({ region: "AP", mode: "arena" }, 56, "sinah", {
      pointer,
      seasonId: 56,
      displayName: "Sinah",
      entries: [[2, "Sinah", 8.37]],
      otherBoards: [],
      deepGeneratedAt: null,
    });
    expect(card).toEqual({
      name: "Sinah",
      board: "아시아·태평양 투기장 · 시즌 56",
      rank: "#2",
      details: ["상위 0.02%", "평균 승수 8.37"],
      note: "10월 14일 18:45 기준",
    });
  });

  it("mentions namesakes and leaves out ratings on legend boards", () => {
    const card = playerCard({ region: "EU", mode: "standard" }, 156, "x", {
      pointer: { ...pointer, region: "EU", mode: "standard", seasonId: 156, totalSize: 6_240 },
      seasonId: 156,
      displayName: "EL7TE",
      entries: [
        [1, "EL7TE", null],
        [3, "EL7TE", null],
      ],
      otherBoards: [],
      deepGeneratedAt: null,
    });
    expect(card.rank).toBe("#1");
    expect(card.details).toEqual(["상위 0.02%", "같은 이름 2명"]);
  });

  it("still names the player when they are not ranked or the board is unknown", () => {
    const unranked = playerCard({ region: "AP", mode: "wild" }, 156, "nobody", null);
    expect(unranked).toEqual({ name: "nobody", board: "아시아·태평양 야생전 · 시즌 156", rank: null, details: ["리더보드에서 찾을 수 없음"], note: null });
  });
});
