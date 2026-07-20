-- Final computed attendance outcome after leave credits (source of truth for payroll unpaid hours).
-- Run on deploy; backend/index.js also ensures this table exists.

CREATE TABLE IF NOT EXISTS attendance_result (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number VARCHAR(64) NOT NULL,
  result_date DATE NOT NULL,
  source_type VARCHAR(16) NOT NULL COMMENT 'ABSENT | TARDINESS',
  source_key VARCHAR(160) NOT NULL COMMENT 'Stable id e.g. LEAVE_EARNING:42, HALF_DAY_DDL:9',
  original_hours DECIMAL(14, 6) NOT NULL DEFAULT 0,
  leave_used VARCHAR(32) NOT NULL DEFAULT 'NONE' COMMENT 'VL, SL, CTO, SC, NONE, etc.',
  leave_hours_used DECIMAL(14, 6) NOT NULL DEFAULT 0,
  unpaid_hours DECIMAL(14, 6) NOT NULL DEFAULT 0,
  paid_hours DECIMAL(14, 6) NOT NULL DEFAULT 0 COMMENT 'Hours covered by leave / paid status',
  status VARCHAR(32) NOT NULL COMMENT 'FULLY_COVERED, PARTIAL, UNPAID, ZERO',
  leave_earning_id INT NULL,
  sc_earning_id INT NULL,
  cto_earning_id INT NULL,
  deduction_decision_log_id INT NULL,
  remarks TEXT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ar_source_key (source_key),
  KEY idx_ar_emp_date (employee_number, result_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
