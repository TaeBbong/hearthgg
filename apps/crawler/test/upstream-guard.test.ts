import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { STRIKE_DECAY_MS, UpstreamGuard, cooldownFor, effectiveStrikes, throttleFactor } from "../src/upstream-guard";

const NOW = Date.UTC(2026, 9, 6, 12);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("escalation math", () => {
  it("doubles the cooldown per strike, capped at six hours", () => {
    expect([1, 2, 3, 4, 5, 9].map(cooldownFor)).toEqual([30 * MINUTE, HOUR, 2 * HOUR, 4 * HOUR, 6 * HOUR, 6 * HOUR]);
  });

  it("forgets one strike per quiet period after the block ended", () => {
    const blockedUntil = NOW;
    expect(effectiveStrikes(3, blockedUntil, NOW + STRIKE_DECAY_MS - 1)).toBe(3);
    expect(effectiveStrikes(3, blockedUntil, NOW + STRIKE_DECAY_MS)).toBe(2);
    expect(effectiveStrikes(3, blockedUntil, NOW + 10 * STRIKE_DECAY_MS)).toBe(0);
  });

  it("halves throughput per strike, never below one eighth", () => {
    expect([0, 1, 2, 3, 7].map(throttleFactor)).toEqual([1, 0.5, 0.25, 0.125, 0.125]);
  });
});

describe("UpstreamGuard", () => {
  const guard = () => new UpstreamGuard(env.DB);

  it("is open with no strikes until tripped", async () => {
    expect(await guard().status(NOW)).toEqual({ blockedUntil: null, strikes: 0 });
  });

  it("blocks for 30 minutes on the first trip", async () => {
    expect(await guard().trip(NOW, "403")).toEqual({ newlyBlocked: true, blockedUntil: NOW + 30 * MINUTE, strikes: 1 });
    expect(await guard().status(NOW + 10 * MINUTE)).toEqual({ blockedUntil: NOW + 30 * MINUTE, strikes: 1 });
  });

  it("does not escalate on repeated trips within the same block", async () => {
    await guard().trip(NOW, "403");
    expect(await guard().trip(NOW + MINUTE, "403")).toEqual({ newlyBlocked: false, blockedUntil: NOW + 30 * MINUTE, strikes: 1 });
  });

  it("doubles the cooldown when blocked again soon after recovering", async () => {
    await guard().trip(NOW, "403");
    const again = await guard().trip(NOW + 31 * MINUTE, "403");
    expect(again).toEqual({ newlyBlocked: true, blockedUntil: NOW + 31 * MINUTE + HOUR, strikes: 2 });
  });

  it("starts over after long enough without blocks", async () => {
    await guard().trip(NOW, "403");
    await guard().trip(NOW + 31 * MINUTE, "403");
    const later = NOW + 31 * MINUTE + HOUR + 3 * STRIKE_DECAY_MS;
    expect((await guard().trip(later, "403")).strikes).toBe(1);
  });

  it("keeps strikes after the block ends so callers can slow down", async () => {
    await guard().trip(NOW, "403");
    expect(await guard().status(NOW + HOUR)).toEqual({ blockedUntil: null, strikes: 1 });
  });
});

describe("claimRecoveryNotice", () => {
  const guard = () => new UpstreamGuard(env.DB);

  it("is claimable exactly once after a block ends", async () => {
    await guard().trip(NOW, "403");
    expect(await guard().claimRecoveryNotice(NOW + 10 * MINUTE)).toBe(false); // still blocked
    expect(await guard().claimRecoveryNotice(NOW + 31 * MINUTE)).toBe(true);
    expect(await guard().claimRecoveryNotice(NOW + 36 * MINUTE)).toBe(false);
  });

  it("re-arms on the next block", async () => {
    await guard().trip(NOW, "403");
    await guard().claimRecoveryNotice(NOW + 31 * MINUTE);
    await guard().trip(NOW + 40 * MINUTE, "403");
    expect(await guard().claimRecoveryNotice(NOW + 40 * MINUTE + 2 * HOUR)).toBe(true);
  });

  it("has nothing to announce when there was never a block", async () => {
    expect(await guard().claimRecoveryNotice(NOW)).toBe(false);
  });
});
