-- Migration: add_attendancerecord_manual_lock_columns.sql
-- Prevents device auto-sync from overwriting admin-edited attendance rows.
-- Run once against the HRIS database before deploying backend changes.

ALTER TABLE attendancerecord
  ADD COLUMN manually_modified TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = row locked; device auto-sync must not overwrite';

ALTER TABLE attendancerecord
  ADD COLUMN modified_at DATETIME NULL
    COMMENT 'When the row was last manually edited';

ALTER TABLE attendancerecord
  ADD COLUMN modified_by VARCHAR(100) NULL
    COMMENT 'Employee number of admin who last manually edited the row';
