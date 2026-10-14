import type { Board, Mode, Region } from "@hearthgg/core/domain";
import type { HistoryPoint, RankPoint } from "@hearthgg/core/history";

/** Read model of a crawled board, as published by the crawler. */
export interface BoardPointer {
  region: Region;
  mode: Mode;
  seasonId: number;
  isCurrent: boolean;
  snapshotKey: string | null;
  generatedAt: number | null;
  totalSize: number | null;
  lastSuccessAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
}

/** Storage boundary for the web app; Cloudflare-backed in production, faked in tests. */
export interface LeaderboardStore {
  listBoards(): Promise<BoardPointer[]>;
  readSnapshot(key: string): Promise<string | null>;
  /** Daily closing ranks for a normalized name; several per day when namesakes exist. */
  readHistory(board: Board, seasonId: number, normalizedName: string): Promise<HistoryPoint[]>;
  /** Ranks recorded whenever a name's ranks changed, oldest first; namesakes share each timestamp. */
  readPoints(board: Board, seasonId: number, normalizedName: string): Promise<RankPoint[]>;
  /** End of the crawler's upstream block (epoch ms) if it is still in effect at `now`. */
  readUpstreamBlock(now: number): Promise<number | null>;
}
