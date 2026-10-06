import { REQUEST_BURST, REQUESTS_PER_HOUR } from "./limits";

const HOUR_MS = 3_600_000;

/**
 * Token bucket in D1 shared by every probe and crawl. Refill and spend happen
 * in one conditional UPDATE, so concurrent reservations never overspend.
 */
export class RequestBudget {
  private readonly perHour: number;
  private readonly burst: number;

  constructor(
    private readonly db: D1Database,
    { perHour = REQUESTS_PER_HOUR, burst = REQUEST_BURST }: { perHour?: number; burst?: number } = {},
  ) {
    this.perHour = perHour;
    this.burst = burst;
  }

  /** Tokens per ms; `factor` < 1 slows refill while recovering from a block. */
  private rate(factor: number): number {
    return (this.perHour * factor) / HOUR_MS;
  }

  async reserve(count: number, now: number, factor = 1): Promise<{ granted: boolean; waitMs: number }> {
    const rate = this.rate(factor);
    const [, spent] = await this.db.batch<{ tokens: number }>([
      this.db.prepare("INSERT OR IGNORE INTO request_budget (id, tokens, updated_at) VALUES (1, ?, ?)").bind(this.burst, now),
      this.db
        .prepare(
          `UPDATE request_budget
           SET tokens = MIN(?1, tokens + MAX(0, ?2 - updated_at) * ?3) - ?4, updated_at = MAX(updated_at, ?2)
           WHERE id = 1 AND MIN(?1, tokens + MAX(0, ?2 - updated_at) * ?3) >= ?4
           RETURNING tokens`,
        )
        .bind(this.burst, now, rate, count),
    ]);
    if (spent?.results.length) return { granted: true, waitMs: 0 };

    const missing = count - (await this.available(now, factor));
    return { granted: false, waitMs: Math.ceil(missing / rate) };
  }

  async available(now: number, factor = 1): Promise<number> {
    const row = await this.db
      .prepare("SELECT MIN(?1, tokens + MAX(0, ?2 - updated_at) * ?3) AS tokens FROM request_budget WHERE id = 1")
      .bind(this.burst, now, this.rate(factor))
      .first<{ tokens: number }>();
    return row?.tokens ?? this.burst;
  }
}
