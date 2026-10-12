-- Recovery notice for the upstream breaker: armed by each trip, claimed once
-- after the first successful probe once the block ended.
ALTER TABLE upstream_state ADD COLUMN recovery_pending INTEGER NOT NULL DEFAULT 0;

-- One daily report per KST day, even though two cron ticks fall in the window.
CREATE TABLE daily_reports (
  day TEXT PRIMARY KEY,
  sent_at INTEGER NOT NULL
);
