import { describe, expect, it } from "vitest";
import { TtlLru } from "./lru";

describe("TtlLru", () => {
  it("returns stored values", () => {
    const cache = new TtlLru<string, number>({ maxEntries: 2 });
    cache.set("a", 1, 0);
    expect(cache.get("a", 0)).toBe(1);
    expect(cache.get("b", 0)).toBeUndefined();
  });

  it("evicts the least recently used entry", () => {
    const cache = new TtlLru<string, number>({ maxEntries: 2 });
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    cache.get("a", 0); // a is now most recent
    cache.set("c", 3, 0);
    expect(cache.get("b", 0)).toBeUndefined();
    expect(cache.get("a", 0)).toBe(1);
    expect(cache.get("c", 0)).toBe(3);
  });

  it("expires entries after their ttl", () => {
    const cache = new TtlLru<string, number>({ maxEntries: 2, ttlMs: 100 });
    cache.set("a", 1, 0);
    expect(cache.get("a", 99)).toBe(1);
    expect(cache.get("a", 101)).toBeUndefined();
  });
});
