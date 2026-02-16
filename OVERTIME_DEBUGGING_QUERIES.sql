-- OVERTIME DTR DEBUGGING QUERIES
-- Run these queries to find why overtime is not displaying

-- ============================================
-- 1. Check if overtime schedules exist in officialtime table
-- ============================================
SELECT 
  employeeID,
  day,
  startDate,
  endDate,
  officialOverTimeIN,
  officialOverTimeOUT
FROM officialtime
WHERE officialOverTimeIN IS NOT NULL 
  AND officialOverTimeOUT IS NOT NULL
ORDER BY employeeID, startDate;

-- If this returns NO rows, you need to add overtime schedules!
-- ============================================


-- ============================================
-- 2. Check attendance records with specialType data
-- ============================================
SELECT 
  personID,
  date,
  day,
  timeIN,
  timeOUT,
  specialType,
  specialTimeIN,
  specialTimeOUT
FROM attendancerecord
WHERE specialType IS NOT NULL
ORDER BY date DESC
LIMIT 50;

-- This shows which special types were recorded
-- ============================================


-- ============================================
-- 3. Check for OVERTIME specific records
-- ============================================
SELECT 
  personID,
  date,
  day,
  specialType,
  specialTimeIN,
  specialTimeOUT,
  timeIN,
  timeOUT
FROM attendancerecord
WHERE specialType = 'OVERTIME'
ORDER BY date DESC;

-- If this returns NO rows, no overtime was captured/classified
-- ============================================


-- ============================================
-- 4. Check raw device data (AttendanceState 5 & 6)
-- ============================================
SELECT 
  PersonID,
  PersonName,
  Date,
  Time1,
  Time2,
  Time3,
  Time4,
  Time5,
  Time6,
  AttendanceState
FROM attendancerecordinfo
WHERE AttendanceState IN (5, 6)
  AND (Time5 IS NOT NULL OR Time6 IS NOT NULL)
ORDER BY Date DESC
LIMIT 50;

-- AttendanceState 5 or 6 = special time (could be overtime/honorarium/service)
-- Time5 = special time IN, Time6 = special time OUT
-- ============================================


-- ============================================
-- 5. Check if specific employee has overtime schedule
-- ============================================
-- Replace 'EMPLOYEE_NUMBER' with actual employee number
SELECT 
  employeeID,
  day,
  startDate,
  endDate,
  officialTimeIN,
  officialTimeOUT,
  officialOverTimeIN,
  officialOverTimeOUT
FROM officialtime
WHERE employeeID = 'EMPLOYEE_NUMBER'
  AND officialOverTimeIN IS NOT NULL 
  AND officialOverTimeOUT IS NOT NULL;
-- ============================================


-- ============================================
-- 6. Full diagnostic - see what's missing
-- ============================================
SELECT 
  ar.personID,
  ar.date,
  ar.day,
  ar.timeIN,
  ar.timeOUT,
  ar.specialType,
  ar.specialTimeIN,
  ar.specialTimeOUT,
  ot.officialOverTimeIN,
  ot.officialOverTimeOUT,
  CASE 
    WHEN ot.officialOverTimeIN IS NULL THEN 'No overtime schedule'
    WHEN ar.specialType IS NULL THEN 'No special type recorded'
    WHEN ar.specialType != 'OVERTIME' THEN CONCAT('Special type is: ', ar.specialType)
    ELSE 'OK - should display'
  END AS diagnosis
FROM attendancerecord ar
LEFT JOIN officialtime ot ON DAYNAME(ar.date) = ot.day
  AND ar.personID = ot.employeeID
  AND ar.date BETWEEN ot.startDate AND ot.endDate
WHERE ar.personID = 'EMPLOYEE_NUMBER'  -- Replace with actual employee number
  AND ar.date >= '2026-01-01'  -- Adjust date range
ORDER BY ar.date DESC;
-- ============================================
