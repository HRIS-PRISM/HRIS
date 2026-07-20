-- Remove supervisor module page_access for users with no supervisor_assignment.
-- Run after backfill_supervisor_page_access.sql when assignments were removed outside the API.

DELETE pa
FROM page_access pa
INNER JOIN pages p ON p.id = pa.page_id
WHERE p.component_identifier IN ('leave-request-supervisor', 'daily-time-record-supervisor')
  AND NOT EXISTS (
    SELECT 1
    FROM supervisor_assignment sa
    WHERE TRIM(CAST(sa.supervisorEmployeeNumber AS CHAR)) = TRIM(CAST(pa.employeeNumber AS CHAR))
  );
