import React from 'react';
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import { getUserInfo } from '../utils/auth';

/**
 * Wraps a page and enforces page_access grants.
 * Superadmin and technical roles bypass the page_access check (role gate is on the route).
 */
const PageAccessGate = ({
  componentIdentifier,
  children,
  loadingFallback = null,
  message = 'You do not have permission to access this page.',
  returnPath = '/admin-home',
  returnButtonText = 'Return to Home',
  bypassRoles = ['superadmin', 'technical'],
}) => {
  const { hasAccess, loading } = usePageAccess(componentIdentifier);
  const role = getUserInfo()?.role;
  const canBypass = bypassRoles.includes(role);

  if (loading) {
    return loadingFallback;
  }

  if (canBypass || hasAccess) {
    return children;
  }

  return (
    <AccessDenied
      title="Access Denied"
      message={message}
      returnPath={returnPath}
      returnButtonText={returnButtonText}
    />
  );
};

export default PageAccessGate;
