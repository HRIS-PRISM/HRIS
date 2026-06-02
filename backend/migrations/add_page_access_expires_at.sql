-- Temporary exception grants (pages outside user role page_group) may set expires_at.
-- NULL expires_at = permanent grant (normal in-scope access).
ALTER TABLE page_access
  ADD COLUMN expires_at DATETIME NULL DEFAULT NULL
  AFTER page_privilege;

CREATE INDEX idx_page_access_expires_at ON page_access (expires_at);
