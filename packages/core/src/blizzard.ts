import { z } from "zod";
import type { Mode, Region } from "./domain";

const ENDPOINT = "https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData";

// The endpoint answers 403 to non-browser user agents.
const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  accept: "application/json",
  // Pages are ~300KB raw but ~17KB gzipped.
  "accept-encoding": "gzip, br",
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

export interface PageRequest {
  region: Region;
  mode: Mode;
  page: number;
  seasonId?: number;
}

export interface LeaderboardRow {
  rank: number;
  accountId: string;
  rating: number | null;
}

export interface LeaderboardPage {
  seasonId: number;
  totalPages: number;
  totalSize: number;
  rows: LeaderboardRow[];
}

export class BlizzardSchemaError extends Error {
  override name = "BlizzardSchemaError";
}

export class UpstreamError extends Error {
  override name = "UpstreamError";
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** 403 (WAF) and 429 mean Blizzard wants us to stop, not that one page failed. */
export function isUpstreamBlock(error: unknown): boolean {
  return error instanceof UpstreamError && (error.status === 403 || error.status === 429);
}

const responseSchema = z.object({
  seasonId: z.number().int(),
  leaderboard: z.object({
    rows: z.array(
      z.object({
        rank: z.number().int().positive(),
        accountid: z.string(),
        rating: z.number().optional(),
      }),
    ),
    pagination: z.object({
      totalPages: z.number().int().nonnegative(),
      totalSize: z.number().int().nonnegative(),
    }),
  }),
});

export function buildLeaderboardUrl({ region, mode, page, seasonId }: PageRequest): string {
  const params = new URLSearchParams({ region, leaderboardId: mode, page: String(page) });
  if (seasonId !== undefined) params.set("seasonId", String(seasonId));
  return `${ENDPOINT}?${params}`;
}

export function parseLeaderboardPage(body: unknown): LeaderboardPage {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    throw new BlizzardSchemaError(`Unexpected leaderboard response: ${parsed.error.message}`);
  }
  const { seasonId, leaderboard } = parsed.data;
  return {
    seasonId,
    totalPages: leaderboard.pagination.totalPages,
    totalSize: leaderboard.pagination.totalSize,
    rows: leaderboard.rows.map((row) => ({
      rank: row.rank,
      accountId: row.accountid,
      rating: row.rating ?? null,
    })),
  };
}

export interface FetchDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /** Retries after the first attempt. */
  retries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function retryAfterMs(response: Response): number | undefined {
  const value = response.headers.get("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.min(seconds * 1000, MAX_DELAY_MS) : undefined;
}

/** Exponential backoff with additive jitter so parallel workers do not retry in lockstep. */
function backoffMs(attempt: number, random: () => number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempt + Math.floor(random() * BASE_DELAY_MS), MAX_DELAY_MS);
}

export async function fetchLeaderboardPage(request: PageRequest, deps: FetchDeps = {}): Promise<LeaderboardPage> {
  const { fetch: fetchFn = fetch, sleep = defaultSleep, random = Math.random, retries = 4 } = deps;
  const url = buildLeaderboardUrl(request);

  let lastError: UpstreamError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let waitMs: number | undefined;
    try {
      const response = await fetchFn(url, { headers: REQUEST_HEADERS });
      if (response.ok) return parseLeaderboardPage(await response.json());

      lastError = new UpstreamError(`Blizzard responded ${response.status} for ${url}`, response.status);
      if (!RETRYABLE_STATUS.has(response.status)) throw lastError;
      waitMs = retryAfterMs(response);
    } catch (error) {
      if (error instanceof BlizzardSchemaError || error === lastError) throw error;
      lastError = new UpstreamError(`Network error for ${url}: ${String(error)}`);
    }
    if (attempt < retries) await sleep(waitMs ?? backoffMs(attempt, random));
  }
  throw lastError;
}
