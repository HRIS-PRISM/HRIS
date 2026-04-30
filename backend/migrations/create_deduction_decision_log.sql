CREATE TABLE IF NOT EXISTS deduction_decision_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  leave_request_id BIGINT NULL,
  employeeNumber VARCHAR(64) NOT NULL,
  leave_code VARCHAR(64) NULL,
  leave_date DATE NULL,
  decision VARCHAR(32) NOT NULL,
  decision_source VARCHAR(64) NOT NULL DEFAULT 'hr_approval',
  actor_employeeNumber VARCHAR(64) NULL,
  system_recommendation_json LONGTEXT NULL,
  final_applied_json LONGTEXT NULL,
  override_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_deduction_decision_emp_date (employeeNumber, leave_date),
  KEY idx_deduction_decision_leave_request (leave_request_id)
);
