import { describe, expect, it } from "vitest";
import type { BoardRow } from "../src/board-store";
import { blockAlert, blockRecoveryNotice, boardFailureAlert, boardRecoveryNotice, dailyReport } from "../src/messages";

const NOW = Date.UTC(2026, 9, 12, 14, 50); // 23:50 KST
const MINUTE = 60_000;

function row(overrides: Partial<BoardRow>): BoardRow {
  return {
    region: "US",
    mode: "arena",
    seasonId: 56,
    isCurrent: true,
    snapshotKey: "k",
    previousSnapshotKey: null,
    generatedAt: NOW - 5 * MINUTE,
    deepGeneratedAt: NOW - 30 * MINUTE,
    totalSize: 9_760,
    fingerprint: "f",
    lastSuccessAt: NOW - 4 * MINUTE,
    lastAttemptAt: NOW - 4 * MINUTE,
    lastError: null,
    consecutiveFailures: 0,
    lockRunId: null,
    lockExpiresAt: null,
    ...overrides,
  };
}

describe("alerts", () => {
  it("describes a block with its cooldown and strike count", () => {
    expect(blockAlert({ newlyBlocked: true, blockedUntil: NOW, strikes: 2 }, "Blizzard responded 403")).toBe(
      "[hearthgg] ⛔ Blizzard가 요청을 차단했습니다 (Blizzard responded 403). 모든 수집을 60분 동안 멈춥니다. (연속 차단 2회)",
    );
  });

  it("names the board and season on repeated failures", () => {
    expect(boardFailureAlert("AP:wild", 156, 3, "boom")).toBe("[hearthgg] ⚠️ AP:wild 시즌 156 수집이 3회 연속 실패했습니다: boom");
    expect(boardFailureAlert("AP:wild", undefined, 3, "boom")).toBe("[hearthgg] ⚠️ AP:wild 확인이 3회 연속 실패했습니다: boom");
  });

  it("announces recoveries", () => {
    expect(boardRecoveryNotice("EU:arena", 4)).toBe("[hearthgg] ✅ EU:arena 수집이 4회 연속 실패 후 복구됐습니다.");
    expect(blockRecoveryNotice(1)).toBe("[hearthgg] ✅ Blizzard 차단이 풀려 수집을 재개했습니다. 당분간 처리량을 50%로 낮춰 운영합니다.");
    expect(blockRecoveryNotice(0)).toBe("[hearthgg] ✅ Blizzard 차단이 풀려 수집을 재개했습니다.");
  });
});

describe("dailyReport", () => {
  const boards = [
    row({}),
    row({ region: "EU", mode: "wild", seasonId: 156, totalSize: 451, generatedAt: NOW - 4 * 60 * MINUTE }),
    row({ region: "AP", mode: "standard", seasonId: 156, totalSize: 771, consecutiveFailures: 2, lastError: "Blizzard responded 503" }),
    row({ region: "AP", mode: "battlegrounds", seasonId: 19, snapshotKey: null, generatedAt: null, totalSize: null }),
  ];

  it("summarizes health, the day's history capture and every board", () => {
    const report = dailyReport({
      day: "2026-10-12",
      now: NOW,
      boards,
      captured: [{ board: "US:arena", rows: 9_760 }, { board: "EU:wild", rows: 451 }],
      upstream: { blockedUntil: null, strikes: 0 },
    });

    expect(report.split("\n")).toEqual([
      "[hearthgg] 📊 10월 12일 일일 리포트",
      "정상 1 · 지연 1 · 실패 중 1 · 수집 전 1 (전체 4)",
      "오늘 순위 기록: 2개 보드, 10,211명",
      "Blizzard 차단: 없음",
      "✅ US 투기장 시즌 56 · 9,760명 · 5분 전",
      "🐢 EU 야생전 시즌 156 · 451명 · 240분 전",
      "⚠️ AP 정규전 시즌 156 · 771명 · 5분 전 · 연속 실패 2회: Blizzard responded 503",
      "⏳ AP 전장 시즌 19 · 수집 전",
    ]);
  });

  it("reports an active block and recovery throttling", () => {
    const blocked = dailyReport({ day: "2026-10-12", now: NOW, boards: [], captured: [], upstream: { blockedUntil: NOW + 30 * MINUTE, strikes: 1 } });
    expect(blocked).toContain("Blizzard 차단: 10월 13일 00:20까지 (연속 차단 1회)");
    const recovering = dailyReport({ day: "2026-10-12", now: NOW, boards: [], captured: [], upstream: { blockedUntil: null, strikes: 2 } });
    expect(recovering).toContain("Blizzard 차단: 없음 (복구 중, 처리량 25%)");
  });
});
