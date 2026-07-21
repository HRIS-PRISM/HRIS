import { MODULE_TYPES } from './halfDayReview';

/** Device computation button type → workflow computation module id */
export const COMPUTATION_TYPE_TO_MODULE_ID = {
  NONTEACHING: 'non_teaching',
  FACULTY_30: 'faculty_30',
  FACULTY_DESIGNATED: 'faculty_designated',
};

/** Workflow computation module id → DTR drawer key */
export const COMPUTATION_MODULE_TO_DRAWER = {
  non_teaching: 'nonTeaching',
  faculty_30: 'faculty30',
  faculty_designated: 'facultyDesignated',
};

/** DTR drawer key → workflow computation module id */
export const DRAWER_TO_COMPUTATION_MODULE = Object.fromEntries(
  Object.entries(COMPUTATION_MODULE_TO_DRAWER).map(([k, v]) => [v, k]),
);

export const COMPUTATION_MODULE_TO_LATE_TYPE = {
  non_teaching: MODULE_TYPES.NON_TEACHING,
  faculty_30: MODULE_TYPES.FACULTY_30HRS,
  faculty_designated: MODULE_TYPES.DESIGNATED_40HRS,
};

export const HUB_WORKFLOW_STEPS = [
  { id: 'device', label: 'Device Record', shortLabel: 'Device', path: '/view_attendance' },
  { id: 'dtr', label: 'DTR Overall', shortLabel: 'DTR', path: '/daily_time_record_faculty' },
  {
    id: 'summary',
    label: 'Summary',
    shortLabel: 'Summary',
    path: '/attendance_summary',
  },
];

/** Employment category colors (matches EMPLOYMENT_CATEGORY_OPTIONS in DTR Overall). */
export const HUB_COMPUTATION_CATEGORY_COLORS = {
  nonTeaching: '#2E7D32',
  faculty30: '#1565C0',
  facultyDesignated: '#7B1FA2',
};

/** Computation modules available in the DTR hub (user picks one). */
export const HUB_COMPUTATION_BUTTONS = [
  {
    drawer: 'nonTeaching',
    moduleType: MODULE_TYPES.NON_TEACHING,
    label: 'Non-Teaching',
    categoryColor: HUB_COMPUTATION_CATEGORY_COLORS.nonTeaching,
    applyTip: 'Apply Non-Teaching late/undertime to DTR columns',
    openTip: 'Open Non-Teaching computation module (sliding panel)',
  },
  {
    drawer: 'faculty30',
    moduleType: MODULE_TYPES.FACULTY_30HRS,
    label: '30 Hours',
    categoryColor: HUB_COMPUTATION_CATEGORY_COLORS.faculty30,
    applyTip: 'Apply Faculty 30hrs late/undertime to DTR columns',
    openTip: 'Open Faculty 30hrs computation module (sliding panel)',
  },
  {
    drawer: 'facultyDesignated',
    moduleType: MODULE_TYPES.DESIGNATED_40HRS,
    label: 'Designated',
    categoryColor: HUB_COMPUTATION_CATEGORY_COLORS.facultyDesignated,
    applyTip: 'Apply Designated late/undertime to DTR columns',
    openTip: 'Open Designated computation module (sliding panel)',
  },
];

export const resolveDrawerFromComputationModule = (moduleId) =>
  COMPUTATION_MODULE_TO_DRAWER[moduleId] || null;

export const resolveComputationModuleFromDrawer = (drawerKey) =>
  DRAWER_TO_COMPUTATION_MODULE[drawerKey] || null;
