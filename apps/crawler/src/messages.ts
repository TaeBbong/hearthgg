import { MODE_LABEL, compareBoards, type BoardId } from "@hearthgg/core";
import type { BoardRow } from "./board-store";
import { cooldownFor, throttleFactor, type TripResult, type UpstreamStatus } from "./upstream-guard";

// Every Discord notification the crawler sends, worded in one place.

const MINUTE = 60_000;
const KST_OFFSET_MS = 9 * 60 * MINUTE;
/** A board whose newest data is older than this is flagged as lagging in the daily report. */
const LAGGING_AFTER_MS = 3 * 60 * MINUTE;

const count = new Intl.NumberFormat("ko-KR");

function kstDateTime(time: number): string {
  const [date, clock] = new Date(time + KST_OFFSET_MS).toISOString().split("T") as [string, string];
  return `${kstDate(date)} ${clock.slice(0, 5)}`;
}

/** `2026-10-12` → `10월 12일` */
function kstDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${Number(month)}월 ${Number(date)}일`;
}

function percent(strikes: number): number {
  return Math.round(throttleFactor(strikes) * 100);
}

export function blockAlert(trip: TripResult, cause: string): string {
  return `[hearthgg] ⛔ Blizzard가 요청을 차단했습니다 (${cause}). 모든 수집을 ${Math.round(
    cooldownFor(trip.strikes) / MINUTE,
  )}분 동안 멈춥니다. (연속 차단 ${trip.strikes}회)`;
}

/** `seasonId` undefined: the failure happened while probing, before a crawl. */
export function boardFailureAlert(board: BoardId, seasonId: number | undefined, failures: number, message: string): string {
  const what = seasonId === undefined ? "확인이" : `시즌 ${seasonId} 수집이`;
  return `[hearthgg] ⚠️ ${board} ${what} ${failures}회 연속 실패했습니다: ${message}`;
}

export function boardRecoveryNotice(board: BoardId, failures: number): string {
  return `[hearthgg] ✅ ${board} 수집이 ${failures}회 연속 실패 후 복구됐습니다.`;
}

export function blockRecoveryNotice(strikes: number): string {
  const throttled = strikes > 0 ? ` 당분간 처리량을 ${percent(strikes)}%로 낮춰 운영합니다.` : "";
  return `[hearthgg] ✅ Blizzard 차단이 풀려 수집을 재개했습니다.${throttled}`;
}

export interface DailyReportInput {
  /** KST day, `YYYY-MM-DD`. */
  day: string;
  now: number;
  boards: readonly BoardRow[];
  /** Boards whose closing ranks were recorded for `day`. */
  captured: ReadonlyArray<{ board: string; rows: number }>;
  upstream: UpstreamStatus;
}

export function dailyReport({ day, now, boards, captured, upstream }: DailyReportInput): string {
  const tally = { ok: 0, lagging: 0, failing: 0, pending: 0 };
  const lines = boards.toSorted(compareBoards).map((board) => {
    const label = `${board.region} ${MODE_LABEL[board.mode]} 시즌 ${board.seasonId}`;
    if (!board.snapshotKey || board.generatedAt === null) {
      tally.pending++;
      return `⏳ ${label} · 수집 전`;
    }
    const detail = `${label} · ${count.format(board.totalSize ?? 0)}명 · ${Math.round((now - board.generatedAt) / MINUTE)}분 전`;
    if (board.consecutiveFailures > 0) {
      tally.failing++;
      return `⚠️ ${detail} · 연속 실패 ${board.consecutiveFailures}회: ${board.lastError ?? "알 수 없음"}`;
    }
    if (now - board.generatedAt > LAGGING_AFTER_MS) {
      tally.lagging++;
      return `🐢 ${detail}`;
    }
    tally.ok++;
    return `✅ ${detail}`;
  });

  const block = upstream.blockedUntil
    ? `${kstDateTime(upstream.blockedUntil)}까지 (연속 차단 ${upstream.strikes}회)`
    : upstream.strikes > 0
      ? `없음 (복구 중, 처리량 ${percent(upstream.strikes)}%)`
      : "없음";
  const recordedRows = captured.reduce((sum, entry) => sum + entry.rows, 0);

  return [
    `[hearthgg] 📊 ${kstDate(day)} 일일 리포트`,
    `정상 ${tally.ok} · 지연 ${tally.lagging} · 실패 중 ${tally.failing} · 수집 전 ${tally.pending} (전체 ${boards.length})`,
    `오늘 순위 기록: ${captured.length}개 보드, ${count.format(recordedRows)}명`,
    `Blizzard 차단: ${block}`,
    ...lines,
  ].join("\n");
}
