-- Dedicated earnings audit trail (mirrors runtime ensure in backend/index.js)
CREATE TABLE IF NOT EXISTS earnings_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  earning_type VARCHAR(64) NOT NULL,
  earning_id VARCHAR(64) NULL COMMENT 'Parent row id as string, or employeeNumber for some UI inserts',
  action VARCHAR(512) NOT NULL,
  old_status VARCHAR(64) NULL,
  new_status VARCHAR(64) NULL,
  actor VARCHAR(64) NULL,
  notes TEXT NULL,
  payload LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_earnings_audit_type_id (earning_type, earning_id),
  KEY idx_earnings_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
