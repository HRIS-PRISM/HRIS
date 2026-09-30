-- Device attendance (AttendanceRecordInfo) performance indexes.
--
-- The table has millions of rows and no indexes, so every date-range query
-- (Attendance Device "All Users", device summary, bulk auto-save) reads the whole
-- table. These two indexes let those queries read only the selected period:
--   (AttendanceDateTime, PersonID) - range scans by period; also covers the
--                                    per-person day counts without touching rows
--   (PersonID, AttendanceDateTime) - one employee's records for a period
--
-- Idempotent: each index is created only when it does not exist yet.
-- On a large table this takes a minute or two; reads keep working meanwhile.

SET @db_name = DATABASE();

SET @has_ari_dt_person := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND LOWER(TABLE_NAME) = 'attendancerecordinfo'
    AND INDEX_NAME = 'idx_ari_datetime_person'
);
SET @sql_ari_dt_person := IF(
  @has_ari_dt_person = 0,
  'CREATE INDEX idx_ari_datetime_person ON AttendanceRecordInfo (AttendanceDateTime, PersonID)',
  'SELECT "idx_ari_datetime_person already exists"'
);
PREPARE stmt_ari_dt_person FROM @sql_ari_dt_person;
EXECUTE stmt_ari_dt_person;
DEALLOCATE PREPARE stmt_ari_dt_person;

SET @has_ari_person_dt := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND LOWER(TABLE_NAME) = 'attendancerecordinfo'
    AND INDEX_NAME = 'idx_ari_person_datetime'
);
SET @sql_ari_person_dt := IF(
  @has_ari_person_dt = 0,
  'CREATE INDEX idx_ari_person_datetime ON AttendanceRecordInfo (PersonID, AttendanceDateTime)',
  'SELECT "idx_ari_person_datetime already exists"'
);
PREPARE stmt_ari_person_dt FROM @sql_ari_person_dt;
EXECUTE stmt_ari_person_dt;
DEALLOCATE PREPARE stmt_ari_person_dt;
