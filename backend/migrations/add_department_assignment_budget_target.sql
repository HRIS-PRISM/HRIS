-- Payroll budget target: an optional override telling the Appendix 33 export
-- which tab an employee's pay should be charged to, without changing the
-- employee's real department in department_assignment.code.
--
-- The target has two kinds, chosen in Department Assignment:
--   budgetType = 'department'          budgetCode = 'CEN'          -> CEN department tab
--   budgetType = 'employment_category' budgetCode = 'Non-Teaching' -> Non-Teaching block
--
-- budgetCode = NULL/empty (either kind) -> use the real department (default behaviour)
-- Rows saved before budgetType existed are treated as 'department'.
--
-- Employment category names are employment_type_config.typeName (up to 100 chars),
-- so budgetCode is widened from VARCHAR(50).
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
  'ALTER TABLE department_assignment ADD COLUMN budgetCode VARCHAR(200) NULL COMMENT ''Optional payroll charge target (department code or employment category name)'' AFTER code',
  'ALTER TABLE department_assignment MODIFY COLUMN budgetCode VARCHAR(200) NULL COMMENT ''Optional payroll charge target (department code or employment category name)'''
);
PREPARE stmt_budget_code FROM @sql_budget_code;
EXECUTE stmt_budget_code;
DEALLOCATE PREPARE stmt_budget_code;

SET @has_budget_type := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'department_assignment'
    AND COLUMN_NAME = 'budgetType'
);
SET @sql_budget_type := IF(
  @has_budget_type = 0,
  'ALTER TABLE department_assignment ADD COLUMN budgetType VARCHAR(30) NULL COMMENT ''department | employment_category'' AFTER budgetCode',
  'SELECT "department_assignment.budgetType already exists"'
);
PREPARE stmt_budget_type FROM @sql_budget_type;
EXECUTE stmt_budget_type;
DEALLOCATE PREPARE stmt_budget_type;

-- Existing rows carry a department code only; make the kind explicit so the
-- export never has to guess.
UPDATE department_assignment
SET budgetType = 'department'
WHERE budgetCode IS NOT NULL
  AND TRIM(budgetCode) <> ''
  AND (budgetType IS NULL OR TRIM(budgetType) = '');
