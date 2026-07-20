-- Migration: add_half_day_review.sql
-- HR approve/reject workflow for suggested half-days (per-period JSON on overall record)

ALTER TABLE overall_attendance_record
  ADD COLUMN half_day_review JSON NULL
    COMMENT 'Per-date half-day HR decisions: suggested, approved (rendered), rejected (HR tardiness)';
