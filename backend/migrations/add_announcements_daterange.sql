-- Announcements: add date range so items show in carousel only when today is in range
ALTER TABLE announcements ADD COLUMN date_start DATE NULL;
ALTER TABLE announcements ADD COLUMN date_end DATE NULL;
UPDATE announcements SET date_start = COALESCE(date_start, date), date_end = COALESCE(date_end, date) WHERE date_start IS NULL OR date_end IS NULL;
