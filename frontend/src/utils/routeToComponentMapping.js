/**
 * Maps route paths to component identifiers
 * This is used to check page access for sidebar menu items
 */
export const routeToComponentMap = {
  '/home': null, // Home doesn't need access check
  '/admin-home': null, // Admin home doesn't need access check
  '/profile': null, // Profile doesn't need access check
  '/attendance-user-state': 'attendance-user-state',
  '/daily_time_record': 'daily-time-record',
  '/daily_time_record_honorarium': 'daily-time-record-honorarium',
  '/daily_time_record_service_credits': 'daily-time-record-service-credits',
  '/daily_time_record_overtime': 'daily-time-record-overtime',
  '/daily_time_record_faculty': 'daily-time-record-faculty',
  '/payslip': 'payslip',
  '/pds1': 'pds1',
  '/pds2': 'pds2',
  '/pds3': 'pds3',
  '/pds4': 'pds4',
  '/settings': 'settings',
  '/reports': 'reports',
  '/users-list': 'users-list',
  '/registration': 'registration',
  '/employee-category': 'employee-category',
  '/reset-password': 'reset-password',
  '/payroll-formulas': 'payroll-formulas',
  '/admin-security': 'admin-security',
  '/employee-reports': 'employee-reports',
  '/personalinfo': 'personalinfo',
  '/children': 'children',
  '/college': 'college',
  '/graduate': 'graduate',
  '/vocational': 'vocational',
  '/learningdev': 'learningdev',
  '/eligibility': 'eligibility',
  '/voluntarywork': 'voluntarywork',
  '/workexperience': 'workexperience',
  '/other-information': 'other-information',
  '/view_attendance': 'view-attendance',
  '/attendance_form': 'attendance-form',
  '/search_attendance': 'search-attendance',
  '/attendance_module': 'attendance-module',
  '/attendance_module_faculty': 'attendance-module-faculty',
  '/attendance_module_faculty_40hrs': 'attendance-module-faculty-40hrs',
  '/attendance_summary': 'attendance-summary',
  '/official_time': 'official-time',
  '/payroll-table': 'payroll-table',
  '/payroll-jo': 'payroll-jo',
  '/payroll-processed': 'payroll-processed',
  '/payroll-processed-jo': 'payroll-processed-jo',
  '/payroll-released': 'payroll-released',
  '/distribution-payslip': 'distribution-payslip',
  '/overall-payslip': 'overall-payslip',
  '/remittance-table': 'remittances',
  '/item-table': 'item-table',
  '/salary-grade': 'salary-grade',
  '/department-table': 'department-table',
  '/department-assignment': 'department-assignment',
  '/assessment-clearance': 'assessment-clearance',
  '/clearance': 'clearance',
  '/clearance-back': 'clearance-back',
  '/faculty-clearance': 'faculty-clearance',
  '/faculty-clearance-70-days': 'faculty-clearance-70-days',
  '/hrms-request-forms': 'hrms-request-forms',
  '/individual-faculty-loading': 'individual-faculty-loading',
  '/in-service-training': 'in-service-training',
  '/leave-card': 'leave-card',
  '/leave-card-back': 'leave-card-back',
  '/leave-form': 'leave-form',
  '/locator-slip': 'locator-slip',
  '/permission-to-teach': 'permission-to-teach',
  '/request-for-id': 'request-for-id',
  '/saln-front': 'saln-front',
  '/saln-back': 'saln-back',
  '/scholarship-agreement': 'scholarship-agreement',
  '/subject': 'subject',
  '/absences-report': 'absences-report',
  '/attendance-adjustment-reports': 'attendance-adjustment-reports',
  '/announcement': 'announcement',
  '/audit-logs': 'audit-logs',
  '/pages-list': 'pages-list',
  '/bulk-register': 'bulk-register',
  '/philhealth-table': 'philhealth',
  '/holiday': 'holiday',
  '/leave-table': 'leave-table',
  '/leave-assignment': 'leave-assignment',
  '/leave-request': 'leave-request',
  '/leave-request-user': 'leave-request-user',
  '/leave-commutation': 'leave-commutation',
  '/system-settings': 'system-settings',
  '/pds-templates': 'pds-templates',
  '/file201': 'file201',
  '/leave-commutation': 'leave-commutation',
  '/service-credits': 'service-credits',
  '/compensatory-time-off': 'compensatory-time-off',
  '/assignment-management': 'assignment-management',
  '/earnings-management': 'earnings-management',
  '/supervisor-assignment': 'supervisor-assignment',
  '/leave-request-supervisor': 'leave-request-supervisor',
  '/daily-time-record-supervisor': 'daily-time-record-supervisor',
};

/**
 * Get component identifier for a route
 * @param {string} route - Route path
 * @returns {string|null} Component identifier or null if not found/not needed
 */
export const getComponentIdentifierForRoute = (route) => {
  return routeToComponentMap[route] || null;
};

/** Resolve sidebar menu keys (e.g. view_attendance) to App route paths. */
export const getRouteForMenuItemKey = (itemKey) => {
  if (!itemKey) return null;
  if (String(itemKey).startsWith('/')) return itemKey;
  const underscored = `/${itemKey}`;
  if (routeToComponentMap[underscored] !== undefined) return underscored;
  const dashed = `/${String(itemKey).replace(/_/g, '-')}`;
  if (routeToComponentMap[dashed] !== undefined) return dashed;
  return underscored;
};

/**
 * Get all component identifiers that need access checking
 * @returns {string[]} Array of component identifiers
 */
export const getAllComponentIdentifiers = () => {
  return Object.values(routeToComponentMap).filter((id) => id !== null);
};

/** Stable list for sidebar access checks (avoid re-creating each render). */
export const ALL_COMPONENT_IDENTIFIERS = getAllComponentIdentifiers();
