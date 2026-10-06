import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { RequestBudget } from "../src/request-budget";

const NOW = Date.UTC(2026, 9, 6, 12);

function budget() {
  // 3,600/h = 1 token per second, burst 100.
  return new RequestBudget(env.DB, { perHour: 3_600, burst: 100 });
}

describe("RequestBudget", () => {
  it("starts full and refuses to overspend, telling how long to wait", async () => {
    expect(await budget().reserve(100, NOW)).toEqual({ granted: true, waitMs: 0 });
    expect(await budget().reserve(5, NOW)).toEqual({ granted: false, waitMs: 5_000 });
  });

  it("refills at the hourly rate, capped at the burst size", async () => {
    await budget().reserve(100, NOW);
    expect(await budget().available(NOW + 30_000)).toBeCloseTo(30);
    expect(await budget().available(NOW + 3_600_000)).toBe(100);
  });

  it("refills slower under a throttle factor", async () => {
    await budget().reserve(100, NOW);
    expect(await budget().available(NOW + 30_000, 0.5)).toBeCloseTo(15);
  });

  it("never grants more than it has to concurrent callers", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => budget().reserve(30, NOW)));
    expect(results.filter((r) => r.granted)).toHaveLength(3);
  });
});
