/** Active page_access: privilege set and not past expires_at. */
const PAGE_ACCESS_ACTIVE_SQL = `
  COALESCE(pa.page_privilege, '') NOT IN ('', '0')
  AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
`;

function parseExpiresAt(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

function isAccessRecordActive(privilege, expiresAt) {
  const p = String(privilege || '0');
  if (p === '0' || p === '') {
    return false;
  }
  if (!expiresAt) {
    return true;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

function roleInPageGroup(pageGroup, role) {
  const roleKey = String(role || '').trim().toLowerCase();
  if (!roleKey) return false;
  const normalizedRole = roleKey === 'admin' ? 'administrator' : roleKey;
  const allowed = String(pageGroup || '')
    .split(',')
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(normalizedRole);
}

module.exports = {
  PAGE_ACCESS_ACTIVE_SQL,
  parseExpiresAt,
  isAccessRecordActive,
  roleInPageGroup,
};
