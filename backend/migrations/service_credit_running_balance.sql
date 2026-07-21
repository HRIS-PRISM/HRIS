-- Running-ledger balance columns for service_credit + sc_earnings (idempotent).

SET @db_name = DATABASE();

-- service_credit.total_hours
SET @has_sc_total := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'service_credit' AND COLUMN_NAME = 'total_hours'
);
SET @sql_sc_total := IF(
  @has_sc_total = 0,
  'ALTER TABLE service_credit ADD COLUMN total_hours DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT ''Post-deduction: earned_hours - used_hours'' AFTER earned_hours',
  'SELECT ''service_credit.total_hours already exists'''
);
PREPARE stmt_sc_total FROM @sql_sc_total;
EXECUTE stmt_sc_total;
DEALLOCATE PREPARE stmt_sc_total;

-- service_credit.carried_forward_hours
SET @has_sc_carry := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'service_credit' AND COLUMN_NAME = 'carried_forward_hours'
);
SET @sql_sc_carry := IF(
  @has_sc_carry = 0,
  'ALTER TABLE service_credit ADD COLUMN carried_forward_hours DECIMAL(10,3) NOT NULL DEFAULT 0.000 AFTER total_hours',
  'SELECT ''service_credit.carried_forward_hours already exists'''
);
PREPARE stmt_sc_carry FROM @sql_sc_carry;
EXECUTE stmt_sc_carry;
DEALLOCATE PREPARE stmt_sc_carry;

-- service_credit.earning_status
SET @has_sc_earn_st := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'service_credit' AND COLUMN_NAME = 'earning_status'
);
SET @sql_sc_earn_st := IF(
  @has_sc_earn_st = 0,
  'ALTER TABLE service_credit ADD COLUMN earning_status TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when period has approved sc_earnings'' AFTER carried_forward_hours',
  'SELECT ''service_credit.earning_status already exists'''
);
PREPARE stmt_sc_earn_st FROM @sql_sc_earn_st;
EXECUTE stmt_sc_earn_st;
DEALLOCATE PREPARE stmt_sc_earn_st;

-- service_credit.voided_at
SET @has_sc_void := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'service_credit' AND COLUMN_NAME = 'voided_at'
);
SET @sql_sc_void := IF(
  @has_sc_void = 0,
  'ALTER TABLE service_credit ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earning_status',
  'SELECT ''service_credit.voided_at already exists'''
);
PREPARE stmt_sc_void FROM @sql_sc_void;
EXECUTE stmt_sc_void;
DEALLOCATE PREPARE stmt_sc_void;

-- sc_earnings.voided_at
SET @has_se_void := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sc_earnings' AND COLUMN_NAME = 'voided_at'
);
SET @sql_se_void := IF(
  @has_se_void = 0,
  'ALTER TABLE sc_earnings ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earn_status',
  'SELECT ''sc_earnings.voided_at already exists'''
);
PREPARE stmt_se_void FROM @sql_se_void;
EXECUTE stmt_se_void;
DEALLOCATE PREPARE stmt_se_void;

-- sc_earnings.is_applied
SET @has_se_applied := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sc_earnings' AND COLUMN_NAME = 'is_applied'
);
SET @sql_se_applied := IF(
  @has_se_applied = 0,
  'ALTER TABLE sc_earnings ADD COLUMN is_applied TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when earning was applied to service_credit period'' AFTER voided_at',
  'SELECT ''sc_earnings.is_applied already exists'''
);
PREPARE stmt_se_applied FROM @sql_se_applied;
EXECUTE stmt_se_applied;
DEALLOCATE PREPARE stmt_se_applied;

-- sc_earnings.voided
SET @has_se_voided := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'sc_earnings' AND COLUMN_NAME = 'voided'
);
SET @sql_se_voided_flag := IF(
  @has_se_voided = 0,
  'ALTER TABLE sc_earnings ADD COLUMN voided TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when earning is voided (soft-delete)'' AFTER is_applied',
  'SELECT ''sc_earnings.voided already exists'''
);
PREPARE stmt_se_voided_flag FROM @sql_se_voided_flag;
EXECUTE stmt_se_voided_flag;
DEALLOCATE PREPARE stmt_se_voided_flag;

UPDATE sc_earnings SET voided = 1 WHERE voided_at IS NOT NULL AND voided = 0;
