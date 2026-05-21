-- Migration: add_overall_daily_late_undertime.sql
-- Per-day late/undertime for DTR on overall_attendance_record (single source of truth)

ALTER TABLE overall_attendance_record
  ADD COLUMN daily_late_undertime JSON NULL
    COMMENT 'Array of {date, lateTotal, undertimeTotal} for DTR daily columns';

ALTER TABLE overall_attendance_record
  ADD COLUMN computation_module_type VARCHAR(64) NULL
    COMMENT 'NON_TEACHING | FACULTY_30HRS | DESIGNATED_40HRS';

DROP TABLE IF EXISTS dtr_computed_daily_late;
