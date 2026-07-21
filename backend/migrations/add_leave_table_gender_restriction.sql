-- =====================================================
-- Migration: leave_table.gender_restriction
-- Required by POST/PUT /leaveRoute/leave_table (LeaveTable.jsx).
-- Idempotent: safe to run multiple times.
-- =====================================================

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leave_table'
    AND COLUMN_NAME = 'gender_restriction'
);

SET @sql = IF(
  @columnExists = 0,
  'ALTER TABLE leave_table ADD COLUMN gender_restriction VARCHAR(32) NULL DEFAULT NULL COMMENT ''Optional: Male, Female, or NULL for any'' AFTER leave_hours',
  'SELECT "Column gender_restriction already exists on leave_table" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'leave_table'
  AND COLUMN_NAME = 'gender_restriction';
