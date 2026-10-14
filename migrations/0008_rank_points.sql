-- Rank observations recorded whenever a published snapshot changes a name's
-- ranks (all rows of that name, so namesakes stay traceable per timestamp).
-- Kept for the same recent seasons as rank_history; pruned in batches.
CREATE TABLE rank_points (
  region TEXT NOT NULL,
  mode TEXT NOT NULL,
  season_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  at INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  rating REAL,
  PRIMARY KEY (region, mode, season_id, name, at, rank)
) WITHOUT ROWID;
