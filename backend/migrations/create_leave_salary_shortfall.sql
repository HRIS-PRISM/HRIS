-- Tracks leave/CTO-style deductions that exceed available credits and must be recovered via salary.
-- Run once on deploy; backend/index.js also ensures this table exists.

CREATE TABLE IF NOT EXISTS leave_salary_shortfall (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number VARCHAR(64) NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  reference_date DATE NULL COMMENT 'Calendar day of deduction / event',
  negative_balance_days DECIMAL(14, 6) NOT NULL COMMENT 'Balance after deduction in days (typically negative, e.g. -8.679)',
  shortfall_days DECIMAL(14, 6) NOT NULL COMMENT 'Days charged to salary (positive)',
  shortfall_hours DECIMAL(14, 6) NOT NULL,
  policy_hours DECIMAL(14, 6) NOT NULL DEFAULT 0 COMMENT 'Assessed deduction hours (audit; may exceed salary shortfall)',
  policy_days DECIMAL(14, 6) NOT NULL DEFAULT 0 COMMENT 'Assessed deduction days (policy_hours/8)',
  leave_code VARCHAR(32) NOT NULL,
  entry_type VARCHAR(64) NULL,
  leave_earning_id INT NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lss_emp_period (employee_number, period_year, period_month),
  INDEX idx_lss_created (created_at),
  UNIQUE KEY uq_lss_leave_earning (leave_earning_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
