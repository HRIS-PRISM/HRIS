-- Admin Action Trail: tracks superadmin / administrator / admin actions only.
-- Viewers: superadmin + technical. Immutable (no delete API).

CREATE TABLE IF NOT EXISTS admin_action_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeNumber VARCHAR(64) NULL,
  actor_role VARCHAR(64) NULL,
  action VARCHAR(512) NOT NULL,
  table_name VARCHAR(128) NULL,
  record_id INT NULL,
  targetEmployeeNumber VARCHAR(64) NULL,
  details_json LONGTEXT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_action_trail_timestamp (timestamp),
  KEY idx_admin_action_trail_employee (employeeNumber),
  KEY idx_admin_action_trail_actor_role (actor_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Page registry for sidebar / RBAC (superadmin + technical only)
INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT
  'Admin Action Trail',
  'Trail of superadmin and administrator actions across the system',
  '/admin-action-trail',
  'superadmin,technical',
  'admin-action-trail'
WHERE NOT EXISTS (
  SELECT 1 FROM pages WHERE component_identifier = 'admin-action-trail'
);
