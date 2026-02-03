-- Holiday: same structure as announcement - Title, About, Date Range
-- Run once. Safe to run multiple times only if columns don't exist.
ALTER TABLE holiday ADD COLUMN title VARCHAR(255) NULL;
ALTER TABLE holiday ADD COLUMN about TEXT NULL;
ALTER TABLE holiday ADD COLUMN date_start DATE NULL;
ALTER TABLE holiday ADD COLUMN date_end DATE NULL;
-- Backfill: copy description to title, date to date_start/date_end if new columns are null
UPDATE holiday SET title = COALESCE(title, description), date_start = COALESCE(date_start, date), date_end = COALESCE(date_end, date) WHERE title IS NULL OR date_start IS NULL;
