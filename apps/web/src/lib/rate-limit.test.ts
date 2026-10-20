import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

function limiter(allow: boolean) {
  const keys: string[] = [];
  return {
    keys,
    limit: async ({ key }: RateLimitOptions): Promise<RateLimitOutcome> => {
      keys.push(key);
      return { success: allow };
    },
  };
}

function request(path: string, ip?: string) {
  return new Request(`https://rank.example${path}`, { headers: ip ? { "cf-connecting-ip": ip } : {} });
}

describe("rateLimit", () => {
  it("lets a visitor through while under the limit", async () => {
    const env = { SEARCH_RATE_LIMITER: limiter(true), PAGE_RATE_LIMITER: limiter(true) };
    expect(await rateLimit(request("/ap/arena?page=2", "203.0.113.7"), env)).toBeNull();
    expect(env.PAGE_RATE_LIMITER.keys).toEqual(["203.0.113.7"]);
  });

  it("answers 429 with Retry-After once a visitor is over the limit", async () => {
    const env = { SEARCH_RATE_LIMITER: limiter(true), PAGE_RATE_LIMITER: limiter(false) };
    const response = await rateLimit(request("/ap/arena/56/sinah/opengraph-image", "203.0.113.7"), env);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it("counts autocomplete against its own limit", async () => {
    const env = { SEARCH_RATE_LIMITER: limiter(false), PAGE_RATE_LIMITER: limiter(true) };
    expect((await rateLimit(request("/api/search?q=sinah", "203.0.113.7"), env))?.status).toBe(429);
    expect(env.PAGE_RATE_LIMITER.keys).toEqual([]);
  });

  it("does not limit requests without a client address (local preview)", async () => {
    const env = { SEARCH_RATE_LIMITER: limiter(false), PAGE_RATE_LIMITER: limiter(false) };
    expect(await rateLimit(request("/ap/arena"), env)).toBeNull();
  });
});
