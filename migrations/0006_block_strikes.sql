-- Consecutive blocks escalate the cooldown and slow the crawler down while it
-- recovers; strikes decay after quiet periods.
ALTER TABLE upstream_state ADD COLUMN strikes INTEGER NOT NULL DEFAULT 0;
