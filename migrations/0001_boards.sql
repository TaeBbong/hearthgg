-- One row per (region, mode, season). Holds the published snapshot pointer,
-- crawl lock, change-detection fingerprint and health counters.
CREATE TABLE boards (
  region TEXT NOT NULL,
  mode TEXT NOT NULL,
  season_id INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1,
  snapshot_key TEXT,
  previous_snapshot_key TEXT,
  generated_at INTEGER,
  total_size INTEGER,
  fingerprint TEXT,
  last_success_at INTEGER,
  last_attempt_at INTEGER,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  lock_run_id TEXT,
  lock_expires_at INTEGER,
  PRIMARY KEY (region, mode, season_id)
);

CREATE INDEX boards_current ON boards (region, mode, is_current);
