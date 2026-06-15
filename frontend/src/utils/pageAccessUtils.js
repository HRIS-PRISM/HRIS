/**
 * Page access helpers (aligned with backend/utils/pageAccess.js).
 */

/** Pages whose access is granted/revoked via Supervisor Assignment, not UsersList. */
export const ASSIGNMENT_MANAGED_PAGE_IDENTIFIERS = [
  'leave-request-supervisor',
  'daily-time-record-supervisor',
];

export function isAssignmentManagedPage(page) {
  const identifier = String(page?.component_identifier || '').trim();
  return ASSIGNMENT_MANAGED_PAGE_IDENTIFIERS.includes(identifier);
}

export function normalizeRole(role) {
  const key = String(role || '').trim().toLowerCase();
  if (key === 'admin') return 'administrator';
  return key;
}

export function isPageAuthorizedForRole(page, role) {
  const roleKey = String(role || '').trim().toLowerCase();
  if (!roleKey) return false;
  const normalizedRole = roleKey === 'admin' ? 'administrator' : roleKey;
  const allowed = String(page?.page_group || '')
    .split(',')
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(normalizedRole);
}

/** Grant is on and not expired. */
export function isPageAccessActive(access) {
  const privilege = String(access?.page_privilege || '0');
  if (privilege === '0' || privilege === '') {
    return false;
  }
  if (!access?.expires_at) {
    return true;
  }
  return new Date(access.expires_at).getTime() > Date.now();
}

/** Outside role page_group — requires expiring exception grant. */
export function isOutOfRoleScopePage(page, role) {
  return !isPageAuthorizedForRole(page, role);
}

/**
 * @param {number|string} amount - Positive duration
 * @param {'days'|'hours'} unit
 * @returns {string|null} ISO expiry or null if invalid
 */
export function computeExpiresAtFromDuration(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  const d = new Date();
  if (unit === 'hours') {
    d.setTime(d.getTime() + n * 60 * 60 * 1000);
  } else {
    d.setDate(d.getDate() + n);
  }
  return d.toISOString();
}

/** Maximum temporary (out-of-role) grant: 24 hours. */
export const MAX_EXCEPTION_MS = 24 * 60 * 60 * 1000;

export function validateExceptionDuration(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return 'Enter a duration greater than zero.';
  }
  if (unit === 'days' && n > 1) {
    return 'Maximum temporary access is 1 day.';
  }
  if (unit === 'hours' && n > 24) {
    return 'Maximum temporary access is 24 hours (1 day).';
  }
  if (unit !== 'days' && unit !== 'hours') {
    return 'Select hours or days.';
  }
  const expiresAt = computeExpiresAtFromDuration(n, unit);
  if (!expiresAt) {
    return 'Invalid duration.';
  }
  if (new Date(expiresAt).getTime() - Date.now() > MAX_EXCEPTION_MS) {
    return 'Maximum temporary access is 1 day.';
  }
  return null;
}

export function previewExceptionExpiry(amount, unit) {
  const err = validateExceptionDuration(amount, unit);
  if (err) return { error: err, expiresAt: null };
  return {
    error: null,
    expiresAt: computeExpiresAtFromDuration(amount, unit),
  };
}

export function formatAccessExpiry(expiresAt) {
  if (!expiresAt) {
    return 'No expiry';
  }
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) {
    return 'Invalid date';
  }
  if (d.getTime() <= Date.now()) {
    return 'Expired';
  }
  return d.toLocaleString();
}

