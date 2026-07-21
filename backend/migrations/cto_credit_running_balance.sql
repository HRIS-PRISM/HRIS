-- Running-ledger balance columns for cto_credit + cto_earnings (idempotent).

SET @db_name = DATABASE();

-- cto_credit.total_hours
SET @has_cto_total := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_credit' AND COLUMN_NAME = 'total_hours'
);
SET @sql_cto_total := IF(
  @has_cto_total = 0,
  'ALTER TABLE cto_credit ADD COLUMN total_hours DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT ''Post-deduction: earned_hours - used_hours'' AFTER earned_hours',
  'SELECT ''cto_credit.total_hours already exists'''
);
PREPARE stmt_cto_total FROM @sql_cto_total;
EXECUTE stmt_cto_total;
DEALLOCATE PREPARE stmt_cto_total;

-- cto_credit.carried_forward_hours
SET @has_cto_carry := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_credit' AND COLUMN_NAME = 'carried_forward_hours'
);
SET @sql_cto_carry := IF(
  @has_cto_carry = 0,
  'ALTER TABLE cto_credit ADD COLUMN carried_forward_hours DECIMAL(10,3) NOT NULL DEFAULT 0.000 AFTER total_hours',
  'SELECT ''cto_credit.carried_forward_hours already exists'''
);
PREPARE stmt_cto_carry FROM @sql_cto_carry;
EXECUTE stmt_cto_carry;
DEALLOCATE PREPARE stmt_cto_carry;

-- cto_credit.earning_status
SET @has_cto_earn_st := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_credit' AND COLUMN_NAME = 'earning_status'
);
SET @sql_cto_earn_st := IF(
  @has_cto_earn_st = 0,
  'ALTER TABLE cto_credit ADD COLUMN earning_status TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when period has approved cto_earnings'' AFTER carried_forward_hours',
  'SELECT ''cto_credit.earning_status already exists'''
);
PREPARE stmt_cto_earn_st FROM @sql_cto_earn_st;
EXECUTE stmt_cto_earn_st;
DEALLOCATE PREPARE stmt_cto_earn_st;

-- cto_credit.voided_at
SET @has_cto_void := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_credit' AND COLUMN_NAME = 'voided_at'
);
SET @sql_cto_void := IF(
  @has_cto_void = 0,
  'ALTER TABLE cto_credit ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earning_status',
  'SELECT ''cto_credit.voided_at already exists'''
);
PREPARE stmt_cto_void FROM @sql_cto_void;
EXECUTE stmt_cto_void;
DEALLOCATE PREPARE stmt_cto_void;

-- cto_credit.commuted
SET @has_cto_commuted := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_credit' AND COLUMN_NAME = 'commuted'
);
SET @sql_cto_commuted := IF(
  @has_cto_commuted = 0,
  'ALTER TABLE cto_credit ADD COLUMN commuted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = locked after transfer to leave_commutation'' AFTER voided_at',
  'SELECT ''cto_credit.commuted already exists'''
);
PREPARE stmt_cto_commuted FROM @sql_cto_commuted;
EXECUTE stmt_cto_commuted;
DEALLOCATE PREPARE stmt_cto_commuted;

-- cto_earnings.voided_at
SET @has_ce_void := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_earnings' AND COLUMN_NAME = 'voided_at'
);
SET @sql_ce_void := IF(
  @has_ce_void = 0,
  'ALTER TABLE cto_earnings ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earn_status',
  'SELECT ''cto_earnings.voided_at already exists'''
);
PREPARE stmt_ce_void FROM @sql_ce_void;
EXECUTE stmt_ce_void;
DEALLOCATE PREPARE stmt_ce_void;

-- cto_earnings.is_applied
SET @has_ce_applied := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_earnings' AND COLUMN_NAME = 'is_applied'
);
SET @sql_ce_applied := IF(
  @has_ce_applied = 0,
  'ALTER TABLE cto_earnings ADD COLUMN is_applied TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when earning was applied to cto_credit period'' AFTER voided_at',
  'SELECT ''cto_earnings.is_applied already exists'''
);
PREPARE stmt_ce_applied FROM @sql_ce_applied;
EXECUTE stmt_ce_applied;
DEALLOCATE PREPARE stmt_ce_applied;

-- cto_earnings.voided
SET @has_ce_voided := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_earnings' AND COLUMN_NAME = 'voided'
);
SET @sql_ce_voided_flag := IF(
  @has_ce_voided = 0,
  'ALTER TABLE cto_earnings ADD COLUMN voided TINYINT NOT NULL DEFAULT 0 COMMENT ''1 when earning is voided (soft-delete)'' AFTER is_applied',
  'SELECT ''cto_earnings.voided already exists'''
);
PREPARE stmt_ce_voided_flag FROM @sql_ce_voided_flag;
EXECUTE stmt_ce_voided_flag;
DEALLOCATE PREPARE stmt_ce_voided_flag;

UPDATE cto_earnings SET voided = 1 WHERE voided_at IS NOT NULL AND voided = 0;

-- cto_usage.action: add commute
SET @cto_usage_action := (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'cto_usage' AND COLUMN_NAME = 'action'
  LIMIT 1
);
SET @sql_cto_usage_commute := IF(
  @cto_usage_action IS NOT NULL AND @cto_usage_action NOT LIKE '%commute%',
  'ALTER TABLE cto_usage MODIFY COLUMN action ENUM(''offset'',''use_as_leave'',''forfeit'',''commute'') NOT NULL',
  'SELECT ''cto_usage.action already includes commute'''
);
PREPARE stmt_cto_usage_commute FROM @sql_cto_usage_commute;
EXECUTE stmt_cto_usage_commute;
DEALLOCATE PREPARE stmt_cto_usage_commute;
