-- Hours actually deducted from leave_assignment when HR approves (used for exact reversal).
-- Decimal rate HR entered (day fraction); optional if they entered hours directly.
ALTER TABLE leave_request
  ADD COLUMN deduction_applied_hours DECIMAL(10, 4) NULL DEFAULT NULL
    COMMENT 'Hours deducted on HR approval',
  ADD COLUMN hr_approval_rate DECIMAL(5, 3) NULL DEFAULT NULL
    COMMENT 'HR-entered decimal day rate when applicable';
