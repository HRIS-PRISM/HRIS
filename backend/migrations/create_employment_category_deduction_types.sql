-- Policy: which leave types may be charged for attendance deductions, per employment type and context.
-- employment_category_id references employment_type_config.id (same value as employment_category.employmentCategory / users.employmentCategory).
-- leave_type_id references leave_table.id (canonical leave types).
-- Example seed (adjust IDs for your environment) — leave types only (VL, SL, …).
-- Service Credit (SC) and CTO are not configured here; they are hardcoded in getDeductionOptions.
--   INSERT INTO employment_category_deduction_types (employment_category_id, leave_type_id, deduction_context)
--   SELECT 3, lt.id, 'HALF_DAY' FROM leave_table lt WHERE lt.leave_code IN ('VL','SL');

CREATE TABLE IF NOT EXISTS employment_category_deduction_types (
  id INT NOT NULL AUTO_INCREMENT,
  employment_category_id INT NOT NULL COMMENT 'employment_type_config.id',
  leave_type_id INT NOT NULL COMMENT 'leave_table.id',
  deduction_context ENUM('ABSENCE', 'HALF_DAY', 'TARDINESS') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_emp_cat_leave_ctx (employment_category_id, leave_type_id, deduction_context),
  KEY idx_emp_cat_ctx (employment_category_id, deduction_context),
  CONSTRAINT fk_ecdt_employment_type
    FOREIGN KEY (employment_category_id) REFERENCES employment_type_config (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ecdt_leave_type
    FOREIGN KEY (leave_type_id) REFERENCES leave_table (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
