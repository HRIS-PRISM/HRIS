-- =====================================================
-- Migration: Add TEVL column to payroll_processing table
-- Description: Adds TEVL (Temporary Earned Vacation Leave) column
-- Date: 2026-02-24
-- =====================================================

-- Idempotent: only add if column does not exist
SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payroll_processing'
    AND COLUMN_NAME = 'tevl'
);

SET @sql = IF(@columnExists = 0,
  'ALTER TABLE payroll_processing ADD COLUMN tevl DECIMAL(10,2) DEFAULT 0.00 COMMENT "TEVL (Temporary Earned Vacation Leave)" AFTER grossSalary',
  'SELECT "Column tevl already exists in payroll_processing" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure dvlt is positioned after tevl if dvlt exists
SET @dvltExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payroll_processing'
    AND COLUMN_NAME = 'dvlt'
);

SET @sql = IF(@dvltExists = 1,
  'ALTER TABLE payroll_processing MODIFY COLUMN dvlt DECIMAL(10,2) DEFAULT 0.00 COMMENT "Deducted Vacation Leave Tardiness" AFTER tevl',
  'SELECT "Column dvlt does not exist in payroll_processing (no modify)" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Optional: Add to payroll_processed if you use a finalized table
SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payroll_processed'
    AND COLUMN_NAME = 'tevl'
);
SET @sql = IF(@columnExists = 0,
  'ALTER TABLE payroll_processed ADD COLUMN tevl DECIMAL(10,2) DEFAULT 0.00 COMMENT "TEVL (Temporary Earned Vacation Leave)" AFTER grossSalary',
  'SELECT "Column tevl already exists in payroll_processed" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @dvltExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payroll_processed'
    AND COLUMN_NAME = 'dvlt'
);
SET @sql = IF(@dvltExists = 1,
  'ALTER TABLE payroll_processed MODIFY COLUMN dvlt DECIMAL(10,2) DEFAULT 0.00 COMMENT "Deducted Vacation Leave Tardiness" AFTER tevl',
  'SELECT "Column dvlt does not exist in payroll_processed (no modify)" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verify
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payroll_processing'
  AND COLUMN_NAME IN ('tevl','dvlt')
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- End of Migration
-- =====================================================
