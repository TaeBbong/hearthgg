-- Daily closing rank per player. Derived index: the R2 `daily/` archive is the
-- source of truth and only recent seasons are kept here.
-- `rank` is part of the key because Blizzard names are not unique (namesakes).
CREATE TABLE rank_history (
  region TEXT NOT NULL,
  mode TEXT NOT NULL,
  season_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  day TEXT NOT NULL,
  rank INTEGER NOT NULL,
  rating REAL,
  PRIMARY KEY (region, mode, season_id, name, day, rank)
) WITHOUT ROWID;

-- One row per captured board-day; written in the same batch as its history rows.
CREATE TABLE history_days (
  region TEXT NOT NULL,
  mode TEXT NOT NULL,
  season_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  archive_key TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  captured_at INTEGER NOT NULL,
  PRIMARY KEY (region, mode, season_id, day)
);
