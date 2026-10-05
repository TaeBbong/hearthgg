import { describe, expect, it } from "vitest";
import { blizzardLeaderboardUrl, boardHref, parseBoardParams, playerHref, searchHref } from "./routes";

const board = { region: "AP", mode: "arena" } as const;

describe("routes", () => {
  it("links to the current season board without a season segment", () => {
    expect(boardHref(board)).toBe("/ap/arena");
    expect(boardHref(board, { page: 3 })).toBe("/ap/arena?page=3");
  });

  it("links to a past season and page", () => {
    expect(boardHref(board, { seasonId: 55, page: 2 })).toBe("/ap/arena/55?page=2");
  });

  it("encodes player names", () => {
    expect(playerHref(board, 56, "하스의신")).toBe(`/ap/arena/56/${encodeURIComponent("하스의신")}`);
  });

  it("builds search URLs", () => {
    expect(searchHref("Sinah")).toBe("/search?q=Sinah");
  });

  it("parses and validates route params", () => {
    expect(parseBoardParams({ region: "ap", mode: "arena" })).toEqual(board);
    expect(parseBoardParams({ region: "kr", mode: "arena" })).toBeNull();
    expect(parseBoardParams({ region: "ap", mode: "twist" })).toBeNull();
  });

  it("deep-links to the official leaderboard page for a rank", () => {
    const url = new URL(blizzardLeaderboardUrl(board, 56, 26));
    expect(url.hostname).toBe("hearthstone.blizzard.com");
    expect(url.searchParams.get("leaderboardId")).toBe("arena");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("seasonId")).toBe("56");
  });
});
