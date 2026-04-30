-- Append-only leave credit usage ledger (voided_at = soft-exclude from balance sums).
-- hours_delta: negative = consume credit (increases effective used_hours), positive = restore.

CREATE TABLE IF NOT EXISTS leave_credit_usage (
  id INT NOT NULL AUTO_INCREMENT,
  leave_assignment_id INT NOT NULL,
  employee_number VARCHAR(50) NOT NULL,
  leave_code VARCHAR(50) NOT NULL,
  period_year INT NULL,
  period_month INT NULL,
  hours_delta DECIMAL(14,6) NOT NULL COMMENT 'Signed: negative deducts from remaining',
  source_type VARCHAR(40) NOT NULL COMMENT 'LEAVE_REQUEST, LEAVE_EARNING, HALF_DAY_POLICY, LEGACY_OPENING, REVERSAL, etc.',
  source_id INT NULL,
  remarks VARCHAR(512) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NULL,
  voided_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_lcu_assignment (leave_assignment_id),
  KEY idx_lcu_employee_code (employee_number, leave_code),
  KEY idx_lcu_source (source_type, source_id),
  KEY idx_lcu_voided (voided_at),
  CONSTRAINT fk_lcu_leave_assignment
    FOREIGN KEY (leave_assignment_id) REFERENCES leave_assignment (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
