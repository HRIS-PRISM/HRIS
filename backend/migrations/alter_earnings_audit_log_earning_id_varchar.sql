-- Allow earning_id to hold employeeNumber (alphanumeric) as well as numeric ids as strings
ALTER TABLE earnings_audit_log
  MODIFY COLUMN earning_id VARCHAR(64) NULL
  COMMENT 'Usually leave/sc/cto row id; may be employeeNumber for UI-only rows';
