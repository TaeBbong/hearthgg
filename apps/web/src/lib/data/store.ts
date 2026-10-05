import type { Mode, Region } from "@hearthgg/core/domain";

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
}
