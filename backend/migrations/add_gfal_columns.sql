-- Add GFAL to active payroll remittance tables (idempotent)

SET @db_name = DATABASE();

SET @has_remittance_gfal := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'remittance_table'
    AND COLUMN_NAME = 'gfal'
);
SET @sql_remittance := IF(
  @has_remittance_gfal = 0,
  'ALTER TABLE remittance_table ADD COLUMN gfal DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER gsisPolicyLoan',
  'SELECT "remittance_table.gfal already exists"'
);
PREPARE stmt_remittance FROM @sql_remittance;
EXECUTE stmt_remittance;
DEALLOCATE PREPARE stmt_remittance;

SET @has_processed_gfal := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'payroll_processed'
    AND COLUMN_NAME = 'gfal'
);
SET @sql_processed := IF(
  @has_processed_gfal = 0,
  'ALTER TABLE payroll_processed ADD COLUMN gfal DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER gsisPolicyLoan',
  'SELECT "payroll_processed.gfal already exists"'
);
PREPARE stmt_processed FROM @sql_processed;
EXECUTE stmt_processed;
DEALLOCATE PREPARE stmt_processed;
