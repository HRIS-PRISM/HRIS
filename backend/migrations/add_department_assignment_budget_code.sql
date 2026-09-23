-- Payroll budget department: an optional override telling the Appendix 33 export
-- which department tab an employee's pay should be charged to, without changing
-- the employee's real department in department_assignment.code.
--   budgetCode = NULL/empty  -> use the real department (current behaviour)
--   budgetCode = 'CEN'       -> export routes the employee to the CEN tab
-- Idempotent: safe to run more than once.

SET @db_name = DATABASE();

SET @has_budget_code := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'department_assignment'
    AND COLUMN_NAME = 'budgetCode'
);
SET @sql_budget_code := IF(
  @has_budget_code = 0,
  'ALTER TABLE department_assignment ADD COLUMN budgetCode VARCHAR(50) NULL COMMENT ''Optional budget department code for payroll export routing'' AFTER code',
  'SELECT "department_assignment.budgetCode already exists"'
);
PREPARE stmt_budget_code FROM @sql_budget_code;
EXECUTE stmt_budget_code;
DEALLOCATE PREPARE stmt_budget_code;