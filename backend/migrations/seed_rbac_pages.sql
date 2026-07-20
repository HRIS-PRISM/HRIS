-- Seed pages for RBAC-gated modules (forms, reports, leave admin hubs).
-- Idempotent: skips rows that already exist by component_identifier.
-- After insert, grants default page_access for administrators (and staff for employee-reports).

-- Fix FILE 201 page_group if it used a non-role label (e.g. 'Forms')
UPDATE pages
SET page_group = 'staff,administrator,superadmin,technical'
WHERE component_identifier = 'file201'
  AND (
    page_group IS NULL
    OR page_group = ''
    OR page_group = 'Forms'
    OR FIND_IN_SET('administrator', REPLACE(page_group, ' ', '')) = 0
  );

-- ── Forms ─────────────────────────────────────────────────────────────────────
INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Assessment Clearance', 'Assessment clearance form', '/assessment-clearance', 'administrator,superadmin,technical', 'assessment-clearance'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'assessment-clearance');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Clearance', 'Employee clearance form', '/clearance', 'administrator,superadmin,technical', 'clearance'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'clearance');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Clearance (Back)', 'Employee clearance form (back page)', '/clearance-back', 'administrator,superadmin,technical', 'clearance-back'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'clearance-back');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Faculty Clearance', 'Faculty clearance form', '/faculty-clearance', 'administrator,superadmin,technical', 'faculty-clearance'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'faculty-clearance');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Faculty Clearance (70 Days)', 'Faculty clearance form (70 days)', '/faculty-clearance-70-days', 'administrator,superadmin,technical', 'faculty-clearance-70-days'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'faculty-clearance-70-days');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'HRMS Request Forms', 'HRMS request forms', '/hrms-request-forms', 'administrator,superadmin,technical', 'hrms-request-forms'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'hrms-request-forms');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Individual Faculty Loading', 'Individual faculty loading form', '/individual-faculty-loading', 'administrator,superadmin,technical', 'individual-faculty-loading'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'individual-faculty-loading');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'In-Service Training', 'In-service training form', '/in-service-training', 'administrator,superadmin,technical', 'in-service-training'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'in-service-training');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Leave Card', 'Leave card form', '/leave-card', 'administrator,superadmin,technical', 'leave-card'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'leave-card');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Leave Card (Back)', 'Leave card form (back page)', '/leave-card-back', 'administrator,superadmin,technical', 'leave-card-back'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'leave-card-back');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Leave Form', 'Leave application form', '/leave-form', 'administrator,superadmin,technical', 'leave-form'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'leave-form');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Locator Slip', 'Locator slip form', '/locator-slip', 'administrator,superadmin,technical', 'locator-slip'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'locator-slip');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Permission to Teach', 'Permission to teach form', '/permission-to-teach', 'administrator,superadmin,technical', 'permission-to-teach'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'permission-to-teach');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Request for ID', 'Request for ID form', '/request-for-id', 'administrator,superadmin,technical', 'request-for-id'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'request-for-id');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'SALN (Front)', 'Statement of assets and liabilities (front)', '/saln-front', 'administrator,superadmin,technical', 'saln-front'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'saln-front');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'SALN (Back)', 'Statement of assets and liabilities (back)', '/saln-back', 'administrator,superadmin,technical', 'saln-back'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'saln-back');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Scholarship Agreement', 'Scholarship agreement form', '/scholarship-agreement', 'administrator,superadmin,technical', 'scholarship-agreement'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'scholarship-agreement');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Subject Still To Be Taken', 'Subject still to be taken form', '/subject', 'administrator,superadmin,technical', 'subject'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'subject');

-- ── Reports & leave admin hubs ──────────────────────────────────────────────
INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Reports', 'Administrative reports and analytics', '/reports', 'administrator,superadmin,technical', 'reports'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'reports');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Employee Reports', 'Personal employee reports', '/employee-reports', 'staff,administrator,superadmin,technical', 'employee-reports'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'employee-reports');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Absences Report', 'Employee absences report', '/absences-report', 'administrator,superadmin,technical', 'absences-report'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'absences-report');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Attendance Adjustment Reports', 'Attendance adjustment audit report', '/attendance-adjustment-reports', 'administrator,superadmin,technical', 'attendance-adjustment-reports'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'attendance-adjustment-reports');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Assignment Management', 'Leave, service credit, and CTO assignments', '/assignment-management', 'administrator,superadmin,technical', 'assignment-management'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'assignment-management');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Earnings Management', 'Leave, SC, CTO earnings and deductions', '/earnings-management', 'administrator,superadmin,technical', 'earnings-management'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'earnings-management');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Page Management', 'Manage system pages and access groups', '/pages-list', 'technical', 'pages-list'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'pages-list');

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'Employee Category', 'Employment category and type configuration', '/employee-category', 'administrator,superadmin,technical', 'employee-category'
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = 'employee-category');

-- Ensure component_identifier is set when page exists by URL only (legacy rows)
UPDATE pages SET component_identifier = 'reports', page_group = 'administrator,superadmin,technical'
WHERE (component_identifier IS NULL OR component_identifier = '') AND page_url IN ('/reports', 'reports');

UPDATE pages SET component_identifier = 'employee-reports', page_group = 'staff,administrator,superadmin,technical'
WHERE (component_identifier IS NULL OR component_identifier = '') AND page_url IN ('/employee-reports', 'employee-reports');

UPDATE pages SET component_identifier = 'earnings-management', page_group = 'administrator,superadmin,technical'
WHERE (component_identifier IS NULL OR component_identifier = '') AND page_url IN ('/earnings-management', 'earnings-management');

UPDATE pages SET component_identifier = 'assignment-management', page_group = 'administrator,superadmin,technical'
WHERE (component_identifier IS NULL OR component_identifier = '') AND page_url IN ('/assignment-management', 'assignment-management');

-- ── Default page_access: administrators get all pages in their access group ─
INSERT INTO page_access (employeeNumber, page_id, page_privilege)
SELECT u.employeeNumber, p.id, '1'
FROM users u
INNER JOIN pages p
  ON FIND_IN_SET('administrator', REPLACE(p.page_group, ' ', '')) > 0
WHERE u.role = 'administrator'
  AND NOT EXISTS (
    SELECT 1
    FROM page_access pa
    WHERE pa.employeeNumber = u.employeeNumber
      AND pa.page_id = p.id
  );

-- Staff: employee-reports (and any other staff-group pages missing grants)
INSERT INTO page_access (employeeNumber, page_id, page_privilege)
SELECT u.employeeNumber, p.id, '1'
FROM users u
INNER JOIN pages p
  ON FIND_IN_SET('staff', REPLACE(p.page_group, ' ', '')) > 0
WHERE u.role = 'staff'
  AND NOT EXISTS (
    SELECT 1
    FROM page_access pa
    WHERE pa.employeeNumber = u.employeeNumber
      AND pa.page_id = p.id
  );
