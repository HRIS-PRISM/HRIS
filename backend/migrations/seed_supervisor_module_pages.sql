-- Register supervisor leave module pages (idempotent).
-- page_group staff: staff users receive access via supervisor_assignment → page_access grant.

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Supervisor Assignment Management', 'Assign Deans, Department Heads, and Supervisors to departments', '/supervisor-assignment', 'administrator,superadmin,technical', 'supervisor-assignment'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'supervisor-assignment');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Leave Request Approval - Supervisor', 'Supervisor leave approval for assigned departments', '/leave-request-supervisor', 'staff,administrator,superadmin,technical', 'leave-request-supervisor'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'leave-request-supervisor');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Daily Time Record - Supervisor', 'Attendance Management', '/daily-time-record-supervisor', 'staff,administrator,superadmin,technical', 'daily-time-record-supervisor'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'daily-time-record-supervisor');
