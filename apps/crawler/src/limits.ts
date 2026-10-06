// Every knob that bounds load on Blizzard, in one place.

const MINUTE = 60_000;

/** Total requests per hour across probes and crawls (~0.8 req/s). */
export const REQUESTS_PER_HOUR = 3_000;
/** Most requests that can be spent at once after a quiet period. */
export const REQUEST_BURST = 600;

/** Crawls in flight at once; each keeps CRAWL_CONCURRENCY requests open. */
export const MAX_CONCURRENT_CRAWLS = 2;
export const CRAWL_CONCURRENCY = 3;
/** Pages per workflow step (and per budget reservation); step output stays well under 1MiB. */
export const CRAWL_BATCH_PAGES = 50;
export const PROBE_CONCURRENCY = 2;

/** Upper bound for one crawl without a heartbeat; a crashed run's lock frees itself after this. */
export const LOCK_LEASE_MS = 30 * MINUTE;

/** A crawl waiting on the budget sleeps at most this long per wait, and gives up after MAX_BUDGET_WAITS. */
export const BUDGET_WAIT_CAP_MS = 15 * MINUTE;
export const MAX_BUDGET_WAITS = 8;
