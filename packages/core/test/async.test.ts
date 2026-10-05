import { describe, expect, it } from "vitest";
import { chunk, mapWithConcurrency } from "../src/async";

describe("mapWithConcurrency", () => {
  it("preserves input order in the output", async () => {
    const result = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });
    expect(result).toEqual([60, 20, 40]);
  });

  it("never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
    });
    expect(peak).toBe(3);
  });

  it("rejects when any task fails", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});

describe("mapWithConcurrency after a failure", () => {
  it("stops starting new tasks once one has failed", async () => {
    const started: number[] = [];
    await expect(
      mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 2, async (n) => {
        started.push(n);
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (n === 1) throw new Error("blocked");
        return n;
      }),
    ).rejects.toThrow("blocked");
    // Give any still-running worker time to (wrongly) pick up more items.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(started.length).toBeLessThanOrEqual(3);
  });
});

describe("chunk", () => {
  it("splits into fixed-size groups", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
