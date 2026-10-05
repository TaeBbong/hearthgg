import { describe, expect, it } from "vitest";
import { BlizzardSchemaError, UpstreamError, isUpstreamBlock } from "../src/blizzard";

describe("isUpstreamBlock", () => {
  it("treats 403 and exhausted 429s as the upstream blocking us", () => {
    expect(isUpstreamBlock(new UpstreamError("forbidden", 403))).toBe(true);
    expect(isUpstreamBlock(new UpstreamError("slow down", 429))).toBe(true);
  });

  it("does not treat outages or other errors as blocks", () => {
    expect(isUpstreamBlock(new UpstreamError("down", 503))).toBe(false);
    expect(isUpstreamBlock(new UpstreamError("network"))).toBe(false);
    expect(isUpstreamBlock(new BlizzardSchemaError("shape"))).toBe(false);
    expect(isUpstreamBlock(new Error("x"))).toBe(false);
  });
});
