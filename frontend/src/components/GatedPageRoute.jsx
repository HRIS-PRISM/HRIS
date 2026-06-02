import React from 'react';
import { Navigate } from 'react-router-dom';
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import { getUserInfo, hasToken } from '../utils/auth';
export function normalizeRole(role) {
  const key = String(role || '').trim().toLowerCase();
  if (key === 'admin') return 'administrator';
  return key;
}

/**
 * Route guard: role list OR active page_access grant (supports temporary out-of-role access).
 * Superadmin/technical (bypassRoles) skip page_access check.
 */
const GatedPageRoute = ({
  children,
  allowedRoles = [],
  componentIdentifier,
  message = 'You do not have permission to access this page.',
  returnPath = '/admin-home',
  returnButtonText = 'Return to Home',
  bypassRoles = ['superadmin', 'technical'],
  loadingFallback = null,
}) => {
  if (!hasToken()) {
    return <Navigate to="/" replace />;
  }

  const userRole = normalizeRole(getUserInfo()?.role);
  const bypass = bypassRoles.map(normalizeRole).includes(userRole);
  const roleAllowed = allowedRoles.map(normalizeRole).includes(userRole);

  const { hasAccess, loading, error } = usePageAccess(
    bypass ? null : componentIdentifier,
    { autoCheck: !bypass && !!componentIdentifier },
  );

  if (bypass) {
    return children;
  }

  if (loading || hasAccess === null) {
    return loadingFallback;
  }

  const grantedByPageAccess = hasAccess === true;

  if (grantedByPageAccess) {
    return children;
  }

  if (roleAllowed && !componentIdentifier) {
    return children;
  }

  return (
    <AccessDenied
      title="Access Denied"
      message={
        error
          ? `${message} (${error})`
          : message
      }
      returnPath={returnPath}
      returnButtonText={returnButtonText}
    />
  );
};

export default GatedPageRoute;
