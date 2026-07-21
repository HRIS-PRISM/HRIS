-- supervisor_assignment.role is a display title only (not login role).
ALTER TABLE supervisor_assignment
  MODIFY COLUMN role VARCHAR(100) NOT NULL DEFAULT 'Supervisor';
