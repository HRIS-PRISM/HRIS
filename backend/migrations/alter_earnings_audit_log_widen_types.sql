-- Fix truncated earning_type / action (e.g. VARCHAR(10) → "attendance", "half_day_p")
ALTER TABLE earnings_audit_log
  MODIFY COLUMN earning_type VARCHAR(64) NOT NULL;
ALTER TABLE earnings_audit_log
  MODIFY COLUMN action VARCHAR(512) NOT NULL;
