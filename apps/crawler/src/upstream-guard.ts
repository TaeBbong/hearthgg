/** How long every probe and crawl stays quiet after Blizzard blocks us. */
export const BLOCK_COOLDOWN_MS = 30 * 60_000;

/**
 * Global circuit breaker shared by the cron probe and all crawl workflows.
 * One 403/429 anywhere pauses every request, instead of each board and each
 * retry discovering the block on its own (and prolonging it).
 */
export class UpstreamGuard {
  constructor(private readonly db: D1Database) {}

  async blockedUntil(now: number): Promise<number | null> {
    const row = await this.db
      .prepare("SELECT blocked_until FROM upstream_state WHERE id = 1 AND blocked_until > ?")
      .bind(now)
      .first<{ blocked_until: number }>();
    return row?.blocked_until ?? null;
  }

  /** Extends (never shortens) the block. Returns true when this call started a new block. */
  async trip(now: number, reason: string, cooldownMs = BLOCK_COOLDOWN_MS): Promise<boolean> {
    const until = now + cooldownMs;
    const [previous] = await this.db.batch<{ blocked_until: number }>([
      this.db.prepare("SELECT blocked_until FROM upstream_state WHERE id = 1"),
      this.db
        .prepare(
          `INSERT INTO upstream_state (id, blocked_until, reason, tripped_at) VALUES (1, ?1, ?2, ?3)
           ON CONFLICT (id) DO UPDATE SET
             blocked_until = MAX(blocked_until, excluded.blocked_until),
             reason = excluded.reason,
             tripped_at = CASE WHEN blocked_until > excluded.tripped_at THEN tripped_at ELSE excluded.tripped_at END`,
        )
        .bind(until, reason.slice(0, 200), now),
    ]);
    const wasBlocked = (previous?.results[0]?.blocked_until ?? 0) > now;
    return !wasBlocked;
  }
}
