import { describe, expect, it, vi } from "vitest";
import {
  BlizzardSchemaError,
  UpstreamError,
  buildLeaderboardUrl,
  fetchLeaderboardPage,
  parseLeaderboardPage,
} from "../src/blizzard";
import standardPage from "./fixtures/ap-standard-page1.json";
import arenaPage from "./fixtures/ap-arena-page1.json";
import bgPage from "./fixtures/ap-battlegrounds-page1.json";
import outOfRange from "./fixtures/ap-standard-out-of-range.json";

const noSleep = () => Promise.resolve();

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("buildLeaderboardUrl", () => {
  it("targets the community endpoint with region, mode and page", () => {
    const url = new URL(buildLeaderboardUrl({ region: "AP", mode: "arena", page: 3 }));
    expect(url.origin + url.pathname).toBe(
      "https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData",
    );
    expect(url.searchParams.get("region")).toBe("AP");
    expect(url.searchParams.get("leaderboardId")).toBe("arena");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.has("seasonId")).toBe(false);
  });

  it("pins a season when given", () => {
    const url = new URL(buildLeaderboardUrl({ region: "EU", mode: "wild", page: 1, seasonId: 155 }));
    expect(url.searchParams.get("seasonId")).toBe("155");
  });
});

describe("parseLeaderboardPage", () => {
  it("parses rows without rating (standard)", () => {
    const page = parseLeaderboardPage(standardPage);
    expect(page.seasonId).toBe(156);
    expect(page.totalPages).toBe(31);
    expect(page.rows[0]).toEqual({ rank: 1, accountId: "sinah", rating: null });
    expect(page.rows).toHaveLength(25);
  });

  it("parses decimal (arena) and integer (battlegrounds) ratings", () => {
    expect(parseLeaderboardPage(arenaPage).rows[0]?.rating).toBe(7.77);
    expect(parseLeaderboardPage(bgPage).rows[0]?.rating).toBe(18114);
  });

  it("accepts an empty out-of-range page", () => {
    const page = parseLeaderboardPage(outOfRange);
    expect(page.rows).toEqual([]);
    expect(page.totalSize).toBe(0);
  });

  it("throws a schema error when the shape changes", () => {
    expect(() => parseLeaderboardPage({ seasonId: 1, leaderboard: { rows: "nope" } })).toThrow(
      BlizzardSchemaError,
    );
  });
});

describe("fetchLeaderboardPage", () => {
  it("sends a browser user agent and asks for compression", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(standardPage));
    await fetchLeaderboardPage({ region: "AP", mode: "standard", page: 1 }, { fetch: fetchFn, sleep: noSleep });

    const init = fetchFn.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("user-agent")).toMatch(/Mozilla\/5\.0/);
    expect(headers.get("accept-encoding")).toMatch(/gzip/);
  });

  it("retries transient failures with backoff, then succeeds", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(jsonResponse(arenaPage));
    const sleep = vi.fn((_ms: number) => Promise.resolve());

    const page = await fetchLeaderboardPage(
      { region: "AP", mode: "arena", page: 1 },
      { fetch: fetchFn, sleep, random: () => 0 },
    );

    expect(page.rows).toHaveLength(25);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    // Second wait honours Retry-After (seconds) over the computed backoff.
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 2000]);
  });

  it("retries network errors", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(jsonResponse(standardPage));

    const page = await fetchLeaderboardPage({ region: "AP", mode: "standard", page: 1 }, { fetch: fetchFn, sleep: noSleep });
    expect(page.seasonId).toBe(156);
  });

  it("gives up after the retry budget with an UpstreamError", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => new Response("down", { status: 500 }));

    await expect(
      fetchLeaderboardPage({ region: "AP", mode: "standard", page: 1 }, { fetch: fetchFn, sleep: noSleep, retries: 2 }),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not retry client errors such as 403", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response("forbidden", { status: 403 }));

    await expect(
      fetchLeaderboardPage({ region: "AP", mode: "standard", page: 1 }, { fetch: fetchFn, sleep: noSleep }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not retry schema errors", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ unexpected: true }));

    await expect(
      fetchLeaderboardPage({ region: "AP", mode: "standard", page: 1 }, { fetch: fetchFn, sleep: noSleep }),
    ).rejects.toBeInstanceOf(BlizzardSchemaError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
