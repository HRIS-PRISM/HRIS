-- Audit: store assessed policy day/hours and calendar reference even when shortfall to salary is 0.
-- Run once; backend/index.js also attempts these ADDs (ignores ER_DUP_FIELDNAME).

ALTER TABLE leave_salary_shortfall
  ADD COLUMN reference_date DATE NULL COMMENT 'Calendar day of deduction / event' AFTER period_month,
  ADD COLUMN policy_hours DECIMAL(14, 6) NOT NULL DEFAULT 0 COMMENT 'Assessed deduction hours (full policy amount)' AFTER shortfall_hours,
  ADD COLUMN policy_days DECIMAL(14, 6) NOT NULL DEFAULT 0 COMMENT 'Assessed deduction days (policy_hours/8)' AFTER policy_hours;
