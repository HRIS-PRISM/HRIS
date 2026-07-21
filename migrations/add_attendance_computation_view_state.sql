-- Migration: add_attendance_computation_view_state.sql
-- Creates table to store the selected computation type for DTR preview per employee+period

CREATE TABLE IF NOT EXISTS attendance_computation_view_state (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_number VARCHAR(64) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  selected_computation_type VARCHAR(64) NOT NULL,
  selected_by VARCHAR(64) DEFAULT NULL,
  selected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uq_employee_period (employee_number, period_start, period_end),
  INDEX idx_employee_number (employee_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
