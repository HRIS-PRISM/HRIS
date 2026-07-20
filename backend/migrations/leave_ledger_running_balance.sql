-- Running-ledger balance columns (idempotent via INFORMATION_SCHEMA checks).

SET @db_name = DATABASE();

-- leave_assignment.earning_status
SET @has_earning_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_assignment'
    AND COLUMN_NAME = 'earning_status'
);
SET @sql_earning_status := IF(
  @has_earning_status = 0,
  'ALTER TABLE leave_assignment ADD COLUMN earning_status TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 when approved earnings have been applied to this assignment'' AFTER commuted',
  'SELECT ''leave_assignment.earning_status already exists'''
);
PREPARE stmt_earning_status FROM @sql_earning_status;
EXECUTE stmt_earning_status;
DEALLOCATE PREPARE stmt_earning_status;

-- leave_earnings.is_applied
SET @has_is_applied := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_earnings'
    AND COLUMN_NAME = 'is_applied'
);
SET @sql_is_applied := IF(
  @has_is_applied = 0,
  'ALTER TABLE leave_earnings ADD COLUMN is_applied TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 when earning hours were added to leave_assignment.remaining_hours'' AFTER earn_status',
  'SELECT ''leave_earnings.is_applied already exists'''
);
PREPARE stmt_is_applied FROM @sql_is_applied;
EXECUTE stmt_is_applied;
DEALLOCATE PREPARE stmt_is_applied;

-- is_applied is set only when Earnings Management approves an earning and updates leave_assignment.
-- Do not bulk-mark approved rows here; use backend/scripts/backfill_running_ledger_balances.js if needed.
