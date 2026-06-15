-- Grant supervisor module page_access to everyone currently in supervisor_assignment.
-- Run after seed_supervisor_module_pages.sql.

INSERT INTO page_access (employeeNumber, page_id, page_privilege, expires_at)
SELECT DISTINCT sa.supervisorEmployeeNumber, p.id, '1', NULL
FROM supervisor_assignment sa
INNER JOIN pages p ON p.component_identifier IN ('leave-request-supervisor', 'daily-time-record-supervisor')
WHERE NOT EXISTS (
  SELECT 1
  FROM page_access pa
  WHERE pa.employeeNumber = sa.supervisorEmployeeNumber
    AND pa.page_id = p.id
);
