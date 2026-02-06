-- Official Time Versioning: add academicYear, startDate, endDate (after employeeID), status (before breaktime)
-- Run once. If columns exist, you may get "Duplicate column" and can ignore.

ALTER TABLE officialtime ADD COLUMN academicYear VARCHAR(50) DEFAULT NULL AFTER employeeID;
ALTER TABLE officialtime ADD COLUMN startDate DATE DEFAULT NULL AFTER academicYear;
ALTER TABLE officialtime ADD COLUMN endDate DATE DEFAULT NULL AFTER startDate;
ALTER TABLE officialtime ADD COLUMN status VARCHAR(20) DEFAULT NULL AFTER officialOverTimeOUT;

UPDATE officialtime SET startDate = '1970-01-01', endDate = '2099-12-31', status = 'active' WHERE startDate IS NULL;

-- Drop unique key so multiple versions per employee are allowed (run only if it exists)
-- ALTER TABLE officialtime DROP INDEX employeeID;
