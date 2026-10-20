/** Workers Rate Limiting bindings (see wrangler.jsonc), keyed by client IP. */
export interface RateLimiters {
  /** Autocomplete: one request per debounced keystroke. */
  SEARCH_RATE_LIMITER: RateLimit;
  /** Everything else the Worker renders (static assets never reach it), including link prefetches. */
  PAGE_RATE_LIMITER: RateLimit;
}

/** Period of both limiters in wrangler.jsonc, in seconds. */
const PERIOD_SECONDS = 60;

/** A 429 response when the client is over its limit, or null to let the request through. */
export async function rateLimit(request: Request, env: RateLimiters): Promise<Response | null> {
  const ip = request.headers.get("cf-connecting-ip");
  // Only Cloudflare's edge sets the client address; local previews have none.
  if (!ip) return null;
  const limiter = new URL(request.url).pathname === "/api/search" ? env.SEARCH_RATE_LIMITER : env.PAGE_RATE_LIMITER;
  const { success } = await limiter.limit({ key: ip });
  if (success) return null;
  return new Response("Too many requests", {
    status: 429,
    headers: { "retry-after": String(PERIOD_SECONDS), "cache-control": "no-store" },
  });
}
