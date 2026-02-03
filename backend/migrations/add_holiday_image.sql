-- Add image column to holiday table for carousel/announcement display
-- Run this once if your holiday table was created without image.
ALTER TABLE holiday ADD COLUMN image VARCHAR(500) NULL;
