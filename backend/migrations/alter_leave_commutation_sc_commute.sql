-- SC / CTO commutation: nullable leave_assignment_id + source row links (idempotent).

SET @db_name = DATABASE();

-- leave_assignment_id nullable (SC/CTO have no leave_assignment row)
SET @lc_la_nullable := (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'leave_commutation' AND COLUMN_NAME = 'leave_assignment_id'
  LIMIT 1
);
SET @sql_lc_la := IF(
  @lc_la_nullable = 'NO',
  'ALTER TABLE leave_commutation MODIFY COLUMN leave_assignment_id INT NULL',
  'SELECT ''leave_commutation.leave_assignment_id already nullable'''
);
PREPARE stmt_lc_la FROM @sql_lc_la;
EXECUTE stmt_lc_la;
DEALLOCATE PREPARE stmt_lc_la;

-- service_credit_id
SET @has_lc_sc := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'leave_commutation' AND COLUMN_NAME = 'service_credit_id'
);
SET @sql_lc_sc := IF(
  @has_lc_sc = 0,
  'ALTER TABLE leave_commutation ADD COLUMN service_credit_id INT NULL DEFAULT NULL COMMENT ''Source service_credit period when leave_code = SC'' AFTER leave_assignment_id',
  'SELECT ''leave_commutation.service_credit_id already exists'''
);
PREPARE stmt_lc_sc FROM @sql_lc_sc;
EXECUTE stmt_lc_sc;
DEALLOCATE PREPARE stmt_lc_sc;

-- cto_credit_id
SET @has_lc_cto := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'leave_commutation' AND COLUMN_NAME = 'cto_credit_id'
);
SET @sql_lc_cto := IF(
  @has_lc_cto = 0,
  'ALTER TABLE leave_commutation ADD COLUMN cto_credit_id INT NULL DEFAULT NULL COMMENT ''Source cto_credit row when leave_code = CTO'' AFTER service_credit_id',
  'SELECT ''leave_commutation.cto_credit_id already exists'''
);
PREPARE stmt_lc_cto FROM @sql_lc_cto;
EXECUTE stmt_lc_cto;
DEALLOCATE PREPARE stmt_lc_cto;

-- service_credit.commuted lock flag (mirrors leave_assignment.commuted)
SET @has_sc_commuted := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'service_credit' AND COLUMN_NAME = 'commuted'
);
SET @sql_sc_commuted := IF(
  @has_sc_commuted = 0,
  'ALTER TABLE service_credit ADD COLUMN commuted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = locked after transfer to leave_commutation'' AFTER voided_at',
  'SELECT ''service_credit.commuted already exists'''
);
PREPARE stmt_sc_commuted FROM @sql_sc_commuted;
EXECUTE stmt_sc_commuted;
DEALLOCATE PREPARE stmt_sc_commuted;
