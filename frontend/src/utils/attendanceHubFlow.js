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
    label: 'Non-Academic',
    categoryColor: HUB_COMPUTATION_CATEGORY_COLORS.nonTeaching,
    openTip: 'Open Non-Academic computation (sliding panel)',
  },
  {
    drawer: 'faculty30',
    moduleType: MODULE_TYPES.FACULTY_30HRS,
    label: 'Academic | 30 Hours',
    categoryColor: HUB_COMPUTATION_CATEGORY_COLORS.faculty30,
    openTip: 'Open Academic 30 Hours computation (sliding panel)',
  },
  {
    drawer: 'facultyDesignated',
    moduleType: MODULE_TYPES.DESIGNATED_40HRS,
    label: 'Academic | 40 Hours',
    categoryColor: HUB_COMPUTATION_CATEGORY_COLORS.facultyDesignated,
    openTip: 'Open Academic 40 Hours computation (sliding panel)',
  },
];

export const LATE_TYPE_TO_DRAWER = {
  [MODULE_TYPES.NON_TEACHING]: 'nonTeaching',
  [MODULE_TYPES.FACULTY_30HRS]: 'faculty30',
  [MODULE_TYPES.DESIGNATED_40HRS]: 'facultyDesignated',
};

export const resolveDrawerFromComputationModule = (moduleId) =>
  COMPUTATION_MODULE_TO_DRAWER[moduleId] || null;

export const resolveComputationModuleFromDrawer = (drawerKey) =>
  DRAWER_TO_COMPUTATION_MODULE[drawerKey] || null;

export const resolveDrawerFromLateType = (moduleType) =>
  LATE_TYPE_TO_DRAWER[moduleType] || null;

export const hubButtonForModuleType = (moduleType) =>
  HUB_COMPUTATION_BUTTONS.find((b) => b.moduleType === moduleType) || null;

export const hubButtonLabelForModuleType = (moduleType) =>
  hubButtonForModuleType(moduleType)?.label || null;

/** Warning copy when opening a compute module that does not match Employment Category. */
export function mismatchComputationSnackbar({ expectedModuleType, clickedLabel }) {
  const expectedLabel = hubButtonLabelForModuleType(expectedModuleType);
  if (!expectedLabel) {
    return 'No employment category assigned. Set it in Employment Category, or pick a computation type.';
  }
  return `This employee is classified as ${expectedLabel}. Opening ${clickedLabel} will use a different late/U-time formula.`;
}
