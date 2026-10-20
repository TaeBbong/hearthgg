import { describe, expect, it } from "vitest";
import { MAX_NAME_LENGTH, parsePlayerParams } from "./player-params";

const segments = { region: "ap", mode: "arena", season: "56" };

describe("parsePlayerParams", () => {
  it("decodes the board, season and name", () => {
    expect(parsePlayerParams({ ...segments, name: encodeURIComponent("하스의신") })).toEqual({
      board: { region: "AP", mode: "arena" },
      seasonId: 56,
      name: "하스의신",
    });
  });

  it("keeps a stray percent sign instead of failing", () => {
    expect(parsePlayerParams({ ...segments, name: "100%" })?.name).toBe("100%");
  });

  it("rejects names longer than any BattleTag", () => {
    expect(parsePlayerParams({ ...segments, name: "a".repeat(MAX_NAME_LENGTH) })).not.toBeNull();
    expect(parsePlayerParams({ ...segments, name: "a".repeat(MAX_NAME_LENGTH + 1) })).toBeNull();
    // Measured after decoding: an encoded Hangul name is nine times longer in the URL.
    expect(parsePlayerParams({ ...segments, name: encodeURIComponent("가".repeat(MAX_NAME_LENGTH)) })).not.toBeNull();
  });
});
