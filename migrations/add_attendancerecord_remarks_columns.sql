-- Migration: add_attendancerecord_remarks_columns.sql
-- Required by view-attendance, Attendance Modification, and DTR Overall

ALTER TABLE attendancerecord
  ADD COLUMN remarks TEXT NULL
    COMMENT 'Manual adjustment remarks for this day';

ALTER TABLE attendancerecord
  ADD COLUMN autofill_remarks TEXT NULL
    COMMENT 'Auto-filled adjustment remarks (e.g. from device sync rules)';
