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
  '/reports': null, // Reports might not have a component identifier
  '/users-list': 'users-list',
  '/registration': 'registration',
  '/employee-category': 'employee-category',
  '/reset-password': 'reset-password',
  '/payroll-formulas': 'payroll-formulas',
  '/admin-security': 'admin-security',
  '/employee-reports': null, // Might not have component identifier
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
  '/assessment-clearance': null, // Might not have component identifier
  '/clearance': null,
  '/faculty-clearance': null,
  '/hrms-request-forms': null,
  '/individual-faculty-loading': null,
  '/in-service-training': null,
  '/leave-card': null,
  '/locator-slip': null,
  '/permission-to-teach': null,
  '/request-for-id': null,
  '/saln-front': null,
  '/scholarship-agreement': null,
  '/subject': null,
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
};

/**
 * Get component identifier for a route
 * @param {string} route - Route path
 * @returns {string|null} Component identifier or null if not found/not needed
 */
export const getComponentIdentifierForRoute = (route) => {
  return routeToComponentMap[route] || null;
};

/**
 * Get all component identifiers that need access checking
 * @returns {string[]} Array of component identifiers
 */
export const getAllComponentIdentifiers = () => {
  return Object.values(routeToComponentMap).filter((id) => id !== null);
};
