-- FILE 201 documents module
-- Uses employeeNumber as owner/uploader key (VARCHAR) instead of numeric user_id.

CREATE TABLE IF NOT EXISTS file201_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(80) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  relative_path VARCHAR(500) NOT NULL,
  uploaded_by_employee_number VARCHAR(64) NULL,
  upload_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_file201_employee_number (employee_number),
  INDEX idx_file201_file_type (file_type),
  INDEX idx_file201_upload_date (upload_date),
  INDEX idx_file201_uploaded_by (uploaded_by_employee_number),
  CONSTRAINT fk_file201_employee_number
    FOREIGN KEY (employee_number) REFERENCES users(employeeNumber)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_file201_uploaded_by_employee
    FOREIGN KEY (uploaded_by_employee_number) REFERENCES users(employeeNumber)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)
SELECT 'FILE 201', 'Personal Data Sheets', '/file201', 'Forms', 'file201'
WHERE NOT EXISTS (
  SELECT 1 FROM pages WHERE component_identifier = 'file201'
);
