-- Soft-void support for leave_assignment + leave_earnings (idempotent).

SET @db_name = DATABASE();

-- leave_assignment.voided_at
SET @has_la_void := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'leave_assignment' AND COLUMN_NAME = 'voided_at'
);
SET @sql_la_void := IF(
  @has_la_void = 0,
  'ALTER TABLE leave_assignment ADD COLUMN voided_at DATETIME NULL DEFAULT NULL COMMENT ''Soft-void timestamp for period audit'' AFTER commuted',
  'SELECT ''leave_assignment.voided_at already exists'''
);
PREPARE stmt_la_void FROM @sql_la_void;
EXECUTE stmt_la_void;
DEALLOCATE PREPARE stmt_la_void;

-- leave_earnings.voided_at
SET @has_le_void := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'leave_earnings' AND COLUMN_NAME = 'voided_at'
);
SET @sql_le_void := IF(
  @has_le_void = 0,
  'ALTER TABLE leave_earnings ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earn_status',
  'SELECT ''leave_earnings.voided_at already exists'''
);
PREPARE stmt_le_void FROM @sql_le_void;
EXECUTE stmt_le_void;
DEALLOCATE PREPARE stmt_le_void;

-- leave_earnings.voided
SET @has_le_voided := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'leave_earnings' AND COLUMN_NAME = 'voided'
);
SET @sql_le_voided := IF(
  @has_le_voided = 0,
  'ALTER TABLE leave_earnings ADD COLUMN voided TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when earning is voided (soft-delete)'' AFTER voided_at',
  'SELECT ''leave_earnings.voided already exists'''
);
PREPARE stmt_le_voided FROM @sql_le_voided;
EXECUTE stmt_le_voided;
DEALLOCATE PREPARE stmt_le_voided;

UPDATE leave_earnings SET voided = 1 WHERE voided_at IS NOT NULL AND voided = 0;
