-- Transparency: which balance was charged and snapshot at HR approval time.
ALTER TABLE leave_request
  ADD COLUMN deduction_charge_to VARCHAR(64) NULL DEFAULT NULL
    COMMENT 'Leave code balance charged on HR approval (may differ from leave_code on form)',
  ADD COLUMN deduction_balance_before_hours DECIMAL(10, 4) NULL DEFAULT NULL
    COMMENT 'Total remaining hours on deduction_charge_to before HR deduction',
  ADD COLUMN deduction_balance_after_hours DECIMAL(10, 4) NULL DEFAULT NULL
    COMMENT 'Total remaining hours on deduction_charge_to after HR deduction';
