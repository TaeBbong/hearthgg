-- Token bucket shared by every probe and crawl: caps total requests to Blizzard
-- over time, independent of how many crawls run at once.
CREATE TABLE request_budget (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  tokens REAL NOT NULL,
  updated_at INTEGER NOT NULL
);
