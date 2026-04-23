/**
 * Component Identifier Mapping
 *
 * This file maps component identifiers (used in usePageAccess hook)
 * to their actual component file paths, route paths, and icons.
 *
 * This helps administrators see which components are connected to which pages
 * and provides icons for dynamic sidebar rendering.
 */

import {
  Person,
  ChildFriendly,
  School,
  FileCopy,
  Psychology,
  Work,
  Badge,
  Diversity3,
  Description,
  AppRegistration,
  Assessment,
  Devices,
  Search,
  EditCalendar,
  WorkHistory,
  PointOfSale,
  Receipt,
  MonetizationOn,
  Business,
  BusinessCenter,
  Assignment,
  EventNote,
  CalendarMonth,
  Receipt as ReceiptLong,
  LibraryBooks,
  Calculate,
  People,
  Settings,
  AdminPanelSettings,
  Pages,
  Announcement as AnnouncementIcon,
  History,
} from '@mui/icons-material';

export const componentMapping = {
  pds1: {
    componentPath: 'components/PDS/PDS1.jsx',
    routePath: '/pds1',
    componentName: 'PDS1',
    description: 'Personal Data Sheet Page 1',
    icon: FileCopy,
  },
  pds2: {
    componentPath: 'components/PDS/PDS2.jsx',
    routePath: '/pds2',
    componentName: 'PDS2',
    description: 'Personal Data Sheet Page 2',
    icon: FileCopy,
  },
  pds3: {
    componentPath: 'components/PDS/PDS3.jsx',
    routePath: '/pds3',
    componentName: 'PDS3',
    description: 'Personal Data Sheet Page 3',
    icon: FileCopy,
  },
  pds4: {
    componentPath: 'components/PDS/PDS4.jsx',
    routePath: '/pds4',
    componentName: 'PDS4',
    description: 'Personal Data Sheet Page 4',
    icon: FileCopy,
  },
  registration: {
    componentPath: 'components/Registration.jsx',
    routePath: '/registration',
    componentName: 'Registration',
    description: 'Single User Registration',
    icon: AppRegistration,
  },
  'bulk-register': {
    componentPath: 'components/BulkRegister.jsx',
    routePath: '/bulk-register',
    componentName: 'BulkRegister',
    description: 'Bulk User Registration',
    icon: People,
  },
  'pages-list': {
    componentPath: 'components/PagesList.jsx',
    routePath: '/pages-list',
    componentName: 'PagesList',
    description: 'Pages Management Library',
    icon: Pages,
  },
  'users-list': {
    componentPath: 'components/UsersList.jsx',
    routePath: '/users-list',
    componentName: 'UsersList',
    description: 'User Management',
    icon: People,
  },
  personalinfo: {
    componentPath: 'components/DASHBOARD/PersonTable.jsx',
    routePath: '/personalinfo',
    componentName: 'PersonTable',
    description: 'Personal Information Dashboard',
    icon: Person,
  },
  children: {
    componentPath: 'components/DASHBOARD/Children.jsx',
    routePath: '/children',
    componentName: 'Children',
    description: 'Children Information Dashboard',
    icon: ChildFriendly,
  },
  college: {
    componentPath: 'components/DASHBOARD/College.jsx',
    routePath: '/college',
    componentName: 'College',
    description: 'College Information Dashboard',
    icon: School,
  },
  graduate: {
    componentPath: 'components/DASHBOARD/GraduateStudies.jsx',
    routePath: '/graduate',
    componentName: 'GraduateStudies',
    description: 'Graduate Studies Dashboard',
    icon: School,
  },
  vocational: {
    componentPath: 'components/DASHBOARD/Vocational.jsx',
    routePath: '/vocational',
    componentName: 'Vocational',
    description: 'Vocational Studies Dashboard',
    icon: School,
  },
  learningdev: {
    componentPath: 'components/DASHBOARD/LearningAndDevelopment.jsx',
    routePath: '/learningdev',
    componentName: 'LearningAndDevelopment',
    description: 'Learning and Development Dashboard',
    icon: Psychology,
  },
  eligibility: {
    componentPath: 'components/DASHBOARD/Eligibility.jsx',
    routePath: '/eligibility',
    componentName: 'Eligibility',
    description: 'Eligibility Dashboard',
    icon: Badge,
  },
  voluntarywork: {
    componentPath: 'components/DASHBOARD/Voluntary.jsx',
    routePath: '/voluntarywork',
    componentName: 'Voluntary',
    description: 'Voluntary Work Dashboard',
    icon: Diversity3,
  },
  workexperience: {
    componentPath: 'components/DASHBOARD/WorkExperience.jsx',
    routePath: '/workexperience',
    componentName: 'WorkExperience',
    description: 'Work Experience Dashboard',
    icon: Work,
  },
  'other-information': {
    componentPath: 'components/DASHBOARD/OtheInformation.jsx',
    routePath: '/other-information',
    componentName: 'OtheInformation',
    description: 'Other Information Dashboard',
    icon: Description,
  },
  'view-attendance': {
    componentPath: 'components/ATTENDANCE/AttendanceDevice.jsx',
    routePath: '/view_attendance',
    componentName: 'AttendanceDevice',
    description: 'View Attendance Dashboard',
    icon: Devices,
  },
  'search-attendance': {
    componentPath: 'components/ATTENDANCE/AttendanceModification.jsx',
    routePath: '/search_attendance',
    componentName: 'AttendanceModification',
    description: 'Attendance Modification and Search',
    icon: Search,
  },
  'attendance-user-state': {
    componentPath: 'components/ATTENDANCE/AttendanceUserState.jsx',
    routePath: '/attendance-user-state',
    componentName: 'AttendanceUserState',
    description: 'Attendance User State Management',
    icon: Person,
  },
  'daily-time-record': {
    componentPath: 'components/ATTENDANCE/DailyTimeRecord.jsx',
    routePath: '/daily_time_record',
    componentName: 'DailyTimeRecord',
    description: 'Daily Time Record - Regular Work Days',
    icon: CalendarMonth,
  },
  'daily-time-record-faculty': {
    componentPath: 'components/ATTENDANCE/DailyTimeRecordOverall.jsx',
    routePath: '/daily_time_record_faculty',
    componentName: 'DailyTimeRecordOverall',
    description: 'Daily Time Record Overall',
    icon: CalendarMonth,
  },
  'daily-time-record-honorarium': {
    componentPath: 'components/ATTENDANCE/DailyTimeRecordHonorarium.jsx',
    routePath: '/daily_time_record_honorarium',
    componentName: 'DailyTimeRecordHonorarium',
    description: 'Daily Time Record - Honorarium',
    icon: CalendarMonth,
  },
  'daily-time-record-service-credits': {
    componentPath: 'components/ATTENDANCE/DailyTimeRecordServiceCredits.jsx',
    routePath: '/daily_time_record_service_credits',
    componentName: 'DailyTimeRecordServiceCredits',
    description: 'Daily Time Record - Service Credits',
    icon: CalendarMonth,
  },
  'daily-time-record-overtime': {
    componentPath: 'components/ATTENDANCE/DailyTimeRecordOvertime.jsx',
    routePath: '/daily_time_record_overtime',
    componentName: 'DailyTimeRecordOvertime',
    description: 'Daily Time Record - Overtime',
    icon: CalendarMonth,
  },
  'attendance-form': {
    componentPath: 'components/ATTENDANCE/AttendanceState.jsx',
    routePath: '/attendance_form',
    componentName: 'AttendanceState',
    description: 'Attendance Form',
    icon: EditCalendar,
  },
  'attendance-module': {
    componentPath: 'components/ATTENDANCE/AttendanceModuleNonTeaching.jsx',
    routePath: '/attendance_module',
    componentName: 'AttendanceModuleNonTeaching',
    description: 'Attendance Module for Non-Teaching Staff',
    icon: Assessment,
  },
  'attendance-module-faculty': {
    componentPath: 'components/ATTENDANCE/AttendanceModuleFaculty30hrs.jsx',
    routePath: '/attendance_module_faculty',
    componentName: 'AttendanceModuleFaculty30hrs',
    description: 'Attendance Module for Faculty (30 hours)',
    icon: Assessment,
  },
  'attendance-module-faculty-40hrs': {
    componentPath:
      'components/ATTENDANCE/AttendanceModuleFacultyDesignated.jsx',
    routePath: '/attendance_module_faculty_40hrs',
    componentName: 'AttendanceModuleFacultyDesignated',
    description: 'Attendance Module for Faculty (40 hours/Designated)',
    icon: Assessment,
  },
  'attendance-summary': {
    componentPath: 'components/ATTENDANCE/AttendanceSummary.jsx',
    routePath: '/attendance_summary',
    componentName: 'AttendanceSummary',
    description: 'Attendance Summary',
    icon: WorkHistory,
  },
  'official-time': {
    componentPath: 'components/ATTENDANCE/OfficialTimeForm.jsx',
    routePath: '/official_time',
    componentName: 'OfficialTimeForm',
    description: 'Official Time Form',
    icon: EventNote,
  },
  'payroll-table': {
    componentPath: 'components/PAYROLL/PayrollProcessing.jsx',
    routePath: '/payroll-table',
    componentName: 'PayrollProcessing',
    description: 'Payroll Processing',
    icon: PointOfSale,
  },
  'payroll-processed': {
    componentPath: 'components/PAYROLL/PayrollProcessed.jsx',
    routePath: '/payroll-processed',
    componentName: 'PayrollProcessed',
    description: 'Payroll Processed Records',
    icon: Receipt,
  },
  'payroll-released': {
    componentPath: 'components/PAYROLL/PayrollReleased.jsx',
    routePath: '/payroll-released',
    componentName: 'PayrollReleased',
    description: 'Payroll Released Records',
    icon: MonetizationOn,
  },
  'payroll-jo': {
    componentPath: 'components/PAYROLL/PayrollJO.jsx',
    routePath: '/payroll-jo',
    componentName: 'PayrollJO',
    description: 'Payroll Job Order',
    icon: Assignment,
  },
  'payroll-processed-jo': {
    componentPath: 'components/PAYROLL/PayrollProcessedJO.jsx',
    routePath: '/payroll-processed-jo',
    componentName: 'PayrollProcessedJO',
    description: 'Payroll PRocessed Job Order',
    icon: Assignment,
  },
  remittances: {
    componentPath: 'components/PAYROLL/Remittances.jsx',
    routePath: '/remittance-table',
    componentName: 'Remittances',
    description: 'Remittances Management',
    icon: ReceiptLong,
  },
  'item-table': {
    componentPath: 'components/PAYROLL/ItemTable.jsx',
    routePath: '/item-table',
    componentName: 'ItemTable',
    description: 'Item Table Management',
    icon: LibraryBooks,
  },
  'salary-grade': {
    componentPath: 'components/PAYROLL/SalaryGradeTable.jsx',
    routePath: '/salary-grade',
    componentName: 'SalaryGradeTable',
    description: 'Salary Grade Table',
    icon: Calculate,
  },
  'department-table': {
    componentPath: 'components/PAYROLL/DepartmentTable.jsx',
    routePath: '/department-table',
    componentName: 'DepartmentTable',
    description: 'Department Table Management',
    icon: Business,
  },
  'department-assignment': {
    componentPath: 'components/PAYROLL/DepartmentAssignment.jsx',
    routePath: '/department-assignment',
    componentName: 'DepartmentAssignment',
    description: 'Department Assignment',
    icon: BusinessCenter,
  },
  holiday: {
    componentPath: 'components/PAYROLL/Holiday.jsx',
    routePath: '/holiday',
    componentName: 'Holiday',
    description: 'Holiday Management',
    icon: CalendarMonth,
  },
  payslip: {
    componentPath: 'components/PAYROLL/Payslip.jsx',
    routePath: '/payslip',
    componentName: 'Payslip',
    description: 'Payslip Generation',
    icon: Receipt,
  },
  'overall-payslip': {
    componentPath: 'components/PAYROLL/PayslipOverall.jsx',
    routePath: '/overall-payslip',
    componentName: 'PayslipOverall',
    description: 'Overall Payslip',
    icon: Receipt,
  },
  'distribution-payslip': {
    componentPath: 'components/PAYROLL/PayslipDistribution.jsx',
    routePath: '/distribution-payslip',
    componentName: 'PayslipDistribution',
    description: 'Payslip Distribution',
    icon: Receipt,
  },
  philhealth: {
    componentPath: 'components/PAYROLL/PhilHealth.jsx',
    routePath: '/philhealth-table',
    componentName: 'PhilHealth',
    description: 'PhilHealth Management',
    icon: Description,
  },
  announcement: {
    componentPath: 'components/Announcement.jsx',
    routePath: '/announcement',
    componentName: 'Annoucement',
    description: 'Announcement Management',
    icon: AnnouncementIcon,
  },
  'audit-logs': {
    componentPath: 'components/AuditLogs.jsx',
    routePath: '/audit-logs',
    componentName: 'AuditLogs',
    description: 'Audit Trail',
    icon: History,
  },
  settings: {
    componentPath: 'components/Settings.jsx',
    routePath: '/settings',
    componentName: 'Settings',
    description: 'Settings',
    icon: Settings,
  },
  'admin-security': {
    componentPath: 'components/AdminSecurity.jsx',
    routePath: '/admin-security',
    componentName: 'AdminSecurity',
    description: 'Security Management',
    icon: AdminPanelSettings,
  },
  'employee-category': {
    componentPath: 'components/EmploymentCategory.jsx',
    routePath: '/employee-category',
    componentName: 'EmploymentCategory',
    description: 'Employee Category Management',
    icon: AdminPanelSettings,
  },
  'reset-password': {
    componentPath: 'components/ResetPassword.jsx',
    routePath: '/reset-password',
    componentName: 'ResetPassword',
    description: 'Reset Password',
    icon: AdminPanelSettings,
  },
  'payroll-formulas': {
    componentPath: 'components/PayrollFormulas.jsx',
    routePath: '/payroll-formulas',
    componentName: 'PayrollFormulas',
    description: 'Payroll Formulas',
    icon: AdminPanelSettings,
  },
  'leave-table': {
    componentPath: 'components/LEAVE/LeaveTable.jsx',
    routePath: '/leave-table',
    componentName: 'LeaveTable',
    description: 'Leave Table Management',
    icon: EventNote,
  },
  'leave-assignment': {
    componentPath: 'components/LEAVE/LeaveAssignment.jsx',
    routePath: '/leave-assignment',
    componentName: 'LeaveAssignment',
    description: 'Leave Assignment',
    icon: Assignment,
  },
  'leave-request': {
    componentPath: 'components/LEAVE/LeaveRequest.jsx',
    routePath: '/leave-request',
    componentName: 'LeaveRequest',
    description: 'Leave Request Management',
    icon: Description,
  },
  'leave-request-user': {
    componentPath: 'components/LEAVE/LeaveRequestUser.jsx',
    routePath: '/leave-request-user',
    componentName: 'LeaveRequestUser',
    description: 'User Leave Request',
    icon: EventNote,
  },
  'leave-commutation': {
    componentPath: 'components/LEAVE/LeaveCommutation.jsx',
    routePath: '/leave-commutation',
    componentName: 'LeaveCommutation',
    description: 'Leave Commutation Management',
    icon: MonetizationOn,
  },
  'system-settings': {
    componentPath: './SystemSettings.jsx',
    routePath: '/system-settings',
    componentName: 'SystemSettings',
    description: 'System Settings',
    icon: AdminPanelSettings,
  },
  'pds-templates': {
    componentPath: './PDSTemplates.jsx',
    routePath: '/pds-templates',
    componentName: 'PDSTemplates',
    description: 'PDS Version Templates',
    icon: FileCopy,
  },
    'service-credits': {
    componentPath: 'components/LEAVE/ServiceCredits.jsx',
    routePath: '/service-credits',
    componentName: 'ServiceCredits',
    description: 'Service Credits Management',
    icon: FileCopy,
  },
  'compensatory-time-off': {
    componentPath: 'components/LEAVE/CompensatoryTimeOff.jsx',
    routePath: '/compensatory-time-off',
    componentName: 'CompensatoryTimeOff',
    description: 'Compensatory Time Off Management',
    icon: FileCopy,
  },
    'assignment-management': {
    componentPath: 'components/LEAVE/AssignmentManagement.jsx',
    routePath: '/assignment-management',
    componentName: 'AssignmentManagement',
    description: 'Assignment Management',
    icon: FileCopy,
  },
    'earnings-management': {
    componentPath: 'components/LEAVE/EarningsManagement.jsx',
    routePath: '/earnings-management',
    componentName: 'EarningsManagement',
    description: 'Earnings Management',
    icon: FileCopy,
  },
};

/**
 * Get component information by identifier
 * @param {string} identifier - Component identifier
 * @returns {Object|null} Component info or null if not found
 */
export const getComponentInfo = (identifier) => {
  return componentMapping[identifier] || null;
};

/**
 * Get all component identifiers
 * @returns {string[]} Array of component identifiers
 */
export const getAllIdentifiers = () => {
  return Object.keys(componentMapping);
};

/**
 * Check if an identifier exists
 * @param {string} identifier - Component identifier
 * @returns {boolean} True if identifier exists
 */
export const hasIdentifier = (identifier) => {
  return identifier in componentMapping;
};

/**
 * Category Icons - Icons for collapsible menu sections
 */
export const categoryIcons = {
  General: Description,
  'System Administration': AdminPanelSettings,
  Registration: AppRegistration,
  'Information Management': Person,
  'Attendance Management': CalendarMonth,
  'Payroll Management': MonetizationOn,
  'Leave Management': EventNote,
  Form: Assignment,
  'Pages Management': Pages,
  'Personal Data Sheets': FileCopy,
};

/**
 * Get icon for a category
 * @param {string} category - Category name
 * @returns {Component} Icon component
 */
export const getCategoryIcon = (category) => {
  return categoryIcons[category] || Description;
};
