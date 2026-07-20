import React from 'react';
import GatedPageRoute from '../components/GatedPageRoute';

export const ADMIN_ROLES = ['administrator', 'superadmin', 'technical'];
export const ADMIN_ROUTE_ROLES = ADMIN_ROLES;
export const ALL_USER_ROLES = [...ADMIN_ROLES, 'staff'];
export const SUPER_TECH_ROLES = ['superadmin', 'technical'];

export function adminPage(Component, pageId, message) {
  return (
    <GatedPageRoute
      allowedRoles={ADMIN_ROLES}
      componentIdentifier={pageId}
      message={message}
      bypassRoles={['superadmin', 'technical']}
    >
      <Component />
    </GatedPageRoute>
  );
}

export function allUserPage(Component, pageId, message) {
  return (
    <GatedPageRoute
      allowedRoles={ALL_USER_ROLES}
      componentIdentifier={pageId}
      message={message}
      bypassRoles={['superadmin', 'technical']}
    >
      <Component />
    </GatedPageRoute>
  );
}

export function superTechPage(Component, pageId, message) {
  return (
    <GatedPageRoute
      allowedRoles={SUPER_TECH_ROLES}
      componentIdentifier={pageId}
      message={message}
      bypassRoles={['superadmin', 'technical']}
    >
      <Component />
    </GatedPageRoute>
  );
}

export function technicalPage(Component, pageId, message) {
  return (
    <GatedPageRoute
      allowedRoles={['technical']}
      componentIdentifier={pageId}
      message={message}
      bypassRoles={['technical']}
    >
      <Component />
    </GatedPageRoute>
  );
}