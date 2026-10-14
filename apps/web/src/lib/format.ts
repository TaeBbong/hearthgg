import type { Mode } from "@hearthgg/core/domain";

const integer = new Intl.NumberFormat("ko-KR");
const kstDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatRating(mode: Mode, rating: number | null): string | null {
  if (rating === null) return null;
  return mode === "arena" ? rating.toFixed(2) : integer.format(rating);
}

export function formatRelative(time: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return "방금 전";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function formatKstDateTime(time: number): string {
  const parts = Object.fromEntries(kstDateTime.formatToParts(time).map((part) => [part.type, part.value]));
  return `${parts.month}월 ${parts.day}일 ${parts.hour}:${parts.minute}`;
}

/** "상위 N%": rounded up so rank 1 never reads as 0%. */
export function topPercent(rank: number, total: number): string {
  const percent = (rank / total) * 100;
  const rounded = percent < 1 ? Math.ceil(percent * 100) / 100 : Math.ceil(percent);
  return `상위 ${rounded}%`;
}

export function formatCount(count: number): string {
  return integer.format(count);
}

const KST_OFFSET_MS = 9 * 3_600_000;

/** "day": one closing rank per day. "time": a rank recorded whenever it changed. */
export type Granularity = "day" | "time";

/** "10월 4일", plus "14:05" for measurements; always in Korea time. */
export function formatPointTime(at: number, granularity: Granularity) {
  const kst = new Date(at + KST_OFFSET_MS);
  const day = `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
  if (granularity === "day") return day;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}
