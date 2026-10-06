const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** First block pauses for 30 minutes; each consecutive block doubles it. */
export const BASE_COOLDOWN_MS = 30 * MINUTE;
export const MAX_COOLDOWN_MS = 6 * HOUR;
/** One strike is forgiven per this much quiet time after a block ends. */
export const STRIKE_DECAY_MS = 6 * HOUR;
const MAX_THROTTLE_STRIKES = 3;

export function cooldownFor(strikes: number): number {
  return Math.min(BASE_COOLDOWN_MS * 2 ** Math.max(strikes - 1, 0), MAX_COOLDOWN_MS);
}

export function effectiveStrikes(strikes: number, blockedUntil: number, now: number): number {
  const quiet = Math.max(0, now - blockedUntil);
  return Math.max(0, strikes - Math.floor(quiet / STRIKE_DECAY_MS));
}

/** Share of normal throughput (budget refill, concurrency) to use while recovering. */
export function throttleFactor(strikes: number): number {
  return 1 / 2 ** Math.min(strikes, MAX_THROTTLE_STRIKES);
}

export function blockAlert(trip: TripResult, cause: string): string {
  return `[hearthgg] Blizzard is blocking requests (${cause}); pausing all crawls for ${Math.round(
    cooldownFor(trip.strikes) / MINUTE,
  )} minutes (strike ${trip.strikes})`;
}

export interface UpstreamStatus {
  blockedUntil: number | null;
  strikes: number;
}

export interface TripResult extends UpstreamStatus {
  blockedUntil: number;
  /** False when already blocked: nothing escalates and nobody needs another alert. */
  newlyBlocked: boolean;
}

interface Row {
  blocked_until: number;
  strikes: number;
}

/**
 * Global circuit breaker shared by the cron probe and all crawl workflows.
 * One 403/429 anywhere pauses every request; blocks soon after recovering
 * escalate the pause, and recent strikes slow the crawler down afterwards.
 */
export class UpstreamGuard {
  constructor(private readonly db: D1Database) {}

  private row(): Promise<Row | null> {
    return this.db.prepare("SELECT blocked_until, strikes FROM upstream_state WHERE id = 1").first<Row>();
  }

  async status(now: number): Promise<UpstreamStatus> {
    const row = await this.row();
    if (!row) return { blockedUntil: null, strikes: 0 };
    return {
      blockedUntil: row.blocked_until > now ? row.blocked_until : null,
      strikes: effectiveStrikes(row.strikes, row.blocked_until, now),
    };
  }

  async blockedUntil(now: number): Promise<number | null> {
    return (await this.status(now)).blockedUntil;
  }

  /**
   * Read-then-write: two runs tripping at the same instant may both compute the
   * same next strike, which is harmless (same cooldown, at worst two alerts).
   */
  async trip(now: number, reason: string): Promise<TripResult> {
    const row = await this.row();
    if (row && row.blocked_until > now) {
      return { newlyBlocked: false, blockedUntil: row.blocked_until, strikes: row.strikes };
    }
    const strikes = (row ? effectiveStrikes(row.strikes, row.blocked_until, now) : 0) + 1;
    const blockedUntil = now + cooldownFor(strikes);
    await this.db
      .prepare(
        `INSERT INTO upstream_state (id, blocked_until, reason, tripped_at, strikes) VALUES (1, ?1, ?2, ?3, ?4)
         ON CONFLICT (id) DO UPDATE SET
           blocked_until = excluded.blocked_until, reason = excluded.reason,
           tripped_at = excluded.tripped_at, strikes = excluded.strikes`,
      )
      .bind(blockedUntil, reason.slice(0, 200), now, strikes)
      .run();
    return { newlyBlocked: true, blockedUntil, strikes };
  }
}
