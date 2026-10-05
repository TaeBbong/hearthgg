-- Global circuit breaker for the Blizzard endpoint: while blocked_until is in the
-- future, no probe or crawl sends requests (Blizzard answers bursts with 403s).
CREATE TABLE upstream_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  blocked_until INTEGER NOT NULL,
  reason TEXT NOT NULL,
  tripped_at INTEGER NOT NULL
);
