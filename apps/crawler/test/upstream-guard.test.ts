import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { UpstreamGuard } from "../src/upstream-guard";

const NOW = Date.UTC(2026, 9, 5, 12);
const MINUTE = 60_000;

describe("UpstreamGuard", () => {
  it("is open until tripped", async () => {
    expect(await new UpstreamGuard(env.DB).blockedUntil(NOW)).toBeNull();
  });

  it("blocks for the cooldown and reports only the first trip as new", async () => {
    const guard = new UpstreamGuard(env.DB);
    expect(await guard.trip(NOW, "403", 30 * MINUTE)).toBe(true);
    expect(await guard.trip(NOW + MINUTE, "403", 30 * MINUTE)).toBe(false);
    expect(await guard.blockedUntil(NOW + 10 * MINUTE)).toBe(NOW + 31 * MINUTE);
    expect(await guard.blockedUntil(NOW + 32 * MINUTE)).toBeNull();
  });

  it("never shortens an existing block", async () => {
    const guard = new UpstreamGuard(env.DB);
    await guard.trip(NOW, "403", 60 * MINUTE);
    await guard.trip(NOW, "429", MINUTE);
    expect(await guard.blockedUntil(NOW)).toBe(NOW + 60 * MINUTE);
  });

  it("counts a trip after the previous block expired as new again", async () => {
    const guard = new UpstreamGuard(env.DB);
    await guard.trip(NOW, "403", MINUTE);
    expect(await guard.trip(NOW + 2 * MINUTE, "403", MINUTE)).toBe(true);
  });
});
