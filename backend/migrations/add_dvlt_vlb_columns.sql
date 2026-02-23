-- =====================================================
-- Migration: Add DVLT and VLB columns to payroll_processing table
-- Description: Adds two new columns for leave tracking:
--   - dvlt: Deducted Vacation Leave Tardiness
--   - vlb: Vacation Leave Balance
-- Date: 2026-02-23
-- =====================================================

-- Check if columns exist, and add them if they don't
-- This approach makes the migration idempotent (can be run multiple times safely)

-- Add DVLT column (Deducted Vacation Leave Tardiness)
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payroll_processing' 
    AND COLUMN_NAME = 'dvlt'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE payroll_processing ADD COLUMN dvlt DECIMAL(10,2) DEFAULT 0.00 COMMENT "Deducted Vacation Leave Tardiness" AFTER grossSalary',
    'SELECT "Column dvlt already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add VLB column (Vacation Leave Balance)
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payroll_processing' 
    AND COLUMN_NAME = 'vlb'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE payroll_processing ADD COLUMN vlb DECIMAL(10,2) DEFAULT 0.00 COMMENT "Vacation Leave Balance" AFTER dvlt',
    'SELECT "Column vlb already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the columns were added
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payroll_processing'
    AND COLUMN_NAME IN ('dvlt', 'vlb')
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- Optional: If you also need to add these columns to payroll_processed table
-- Uncomment the following section if needed
-- =====================================================

/*
-- Add DVLT column to payroll_processed table
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payroll_processed' 
    AND COLUMN_NAME = 'dvlt'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE payroll_processed ADD COLUMN dvlt DECIMAL(10,2) DEFAULT 0.00 COMMENT "Deducted Vacation Leave Tardiness" AFTER grossSalary',
    'SELECT "Column dvlt already exists in payroll_processed" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add VLB column to payroll_processed table
SET @columnExists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payroll_processed' 
    AND COLUMN_NAME = 'vlb'
);

SET @sql = IF(@columnExists = 0,
    'ALTER TABLE payroll_processed ADD COLUMN vlb DECIMAL(10,2) DEFAULT 0.00 COMMENT "Vacation Leave Balance" AFTER dvlt',
    'SELECT "Column vlb already exists in payroll_processed" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the columns were added to payroll_processed
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payroll_processed'
    AND COLUMN_NAME IN ('dvlt', 'vlb')
ORDER BY ORDINAL_POSITION;
*/

-- =====================================================
-- End of Migration
-- =====================================================
