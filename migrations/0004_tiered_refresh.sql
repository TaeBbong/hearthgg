-- Data time of ranks below the top pages (last full crawl). Top-only refreshes
-- keep it; the web shows it for deep pages.
ALTER TABLE boards ADD COLUMN deep_generated_at INTEGER;
