-- Lock flag for leave_assignment rows transferred to leave_commutation (idempotent).

SET @db_name = DATABASE();

SET @has_commuted := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_assignment'
    AND COLUMN_NAME = 'commuted'
);
SET @sql_commuted := IF(
  @has_commuted = 0,
  'ALTER TABLE leave_assignment ADD COLUMN commuted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = locked after transfer to leave_commutation'' AFTER period_semester',
  'SELECT ''leave_assignment.commuted already exists'''
);
PREPARE stmt_commuted FROM @sql_commuted;
EXECUTE stmt_commuted;
DEALLOCATE PREPARE stmt_commuted;

-- Backfill: mark rows that already have an active commutation record.
UPDATE leave_assignment la
INNER JOIN leave_commutation lc ON lc.leave_assignment_id = la.id AND lc.status != 3
SET la.commuted = 1
WHERE la.commuted = 0;
