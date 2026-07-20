const STORAGE_KEY = 'hrisAttendanceWorkflow';

export const ATTENDANCE_FLOW_CORRECTION = 'correction';
export const ATTENDANCE_FLOW_COMPUTATION = 'computation';

export const ATTENDANCE_MODULES = {
  device: {
    id: 'device',
    path: '/view_attendance',
    label: 'Device',
  },
  state: {
    id: 'state',
    path: '/attendance_form',
    label: 'State',
  },
  dtr: {
    id: 'dtr',
    path: '/daily_time_record_faculty',
    label: 'DTR Overall',
  },
  modification: {
    id: 'modification',
    path: '/search_attendance',
    label: 'Modification',
  },
  non_teaching: {
    id: 'non_teaching',
    path: '/attendance_module',
    label: 'Non-Teaching',
    computationType: 'NONTEACHING',
  },
  faculty_30: {
    id: 'faculty_30',
    path: '/attendance_module_faculty',
    label: 'Faculty 30 hrs',
    computationType: 'FACULTY_30',
  },
  faculty_designated: {
    id: 'faculty_designated',
    path: '/attendance_module_faculty_40hrs',
    label: 'Faculty Designated',
    computationType: 'FACULTY_DESIGNATED',
  },
  summary: {
    id: 'summary',
    path: '/attendance_summary',
    label: 'Attendance Summary',
  },
};

const PATH_TO_MODULE_ID = Object.values(ATTENDANCE_MODULES).reduce((acc, mod) => {
  acc[mod.path] = mod.id;
  return acc;
}, {});

const COMPUTATION_MODULE_IDS = new Set([
  'non_teaching',
  'faculty_30',
  'faculty_designated',
]);

const CORRECTION_BRANCH_IDS = new Set(['dtr', 'modification']);

export const getModuleIdFromPath = (pathname) => PATH_TO_MODULE_ID[pathname] || null;

export const getModuleById = (moduleId) => ATTENDANCE_MODULES[moduleId] || null;

const emptyContext = () => ({
  flowType: null,
  employeeNumber: '',
  fullName: '',
  startDate: '',
  endDate: '',
  selectedYear: null,
  selectedMonth: null,
  correctionOrder: 'dtr-first',
  computationModule: null,
  visitHistory: [],
});

export const readAttendanceWorkflow = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyContext();
    const parsed = JSON.parse(raw);
    return { ...emptyContext(), ...parsed };
  } catch {
    return emptyContext();
  }
};

export const writeAttendanceWorkflow = (patch) => {
  const next = { ...readAttendanceWorkflow(), ...patch };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
  return next;
};

const monthIndexFromIso = (iso) => {
  if (!iso || typeof iso !== 'string') return null;
  const parts = iso.split('-').map(Number);
  if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { year: parts[0], month: parts[1] - 1 };
};

export const buildWorkflowNavState = (ctx, { direction, extraState } = {}) => ({
  employeeNumber: ctx.employeeNumber || '',
  personID: ctx.employeeNumber || '',
  fullName: ctx.fullName || '',
  startDate: ctx.startDate || '',
  endDate: ctx.endDate || '',
  fromAttendanceWorkflow: true,
  fromDevice: ctx.flowType === ATTENDANCE_FLOW_COMPUTATION,
  ...(ctx.computationModule
    ? { openComputationModule: ctx.computationModule }
    : {}),
  ...(extraState && typeof extraState === 'object' ? extraState : {}),
  ...(direction === 'back' ? { workflowNavDirection: 'back' } : {}),
});

export const extractWorkflowFields = (source) => {
  if (!source || typeof source !== 'object') return null;
  const employeeNumber = String(
    source.employeeNumber ?? source.personID ?? source.personId ?? '',
  ).trim();
  const startDate = source.startDate ? String(source.startDate).slice(0, 10) : '';
  const endDate = source.endDate ? String(source.endDate).slice(0, 10) : '';
  if (!employeeNumber || !startDate || !endDate) return null;

  const monthParts = monthIndexFromIso(startDate);
  return {
    employeeNumber,
    fullName: source.fullName || source.personName || source.employeeName || '',
    startDate,
    endDate,
    selectedYear: monthParts?.year ?? null,
    selectedMonth: monthParts?.month ?? null,
  };
};

export const buildHydrationPayload = (locationState, moduleId) => {
  // Device is admin entry — always require a fresh manual search.
  if (moduleId === 'device') return null;

  const inWorkflow =
    locationState?.fromAttendanceWorkflow === true || locationState?.fromDevice === true;

  const fromState = extractWorkflowFields(locationState);
  if (fromState && inWorkflow) {
    return { ...fromState, autoSearch: true };
  }

  // Do not restore session context when opening a module from the sidebar.
  if (!inWorkflow) return null;

  const stored = readAttendanceWorkflow();
  if (!stored.employeeNumber || !stored.startDate || !stored.endDate) return null;
  return {
    employeeNumber: stored.employeeNumber,
    fullName: stored.fullName || '',
    startDate: stored.startDate,
    endDate: stored.endDate,
    selectedYear: stored.selectedYear,
    selectedMonth: stored.selectedMonth,
    autoSearch: true,
  };
};

export const clearWorkflowEmployeeFields = () => {
  const ctx = readAttendanceWorkflow();
  return writeAttendanceWorkflow({
    ...ctx,
    employeeNumber: '',
    fullName: '',
    startDate: '',
    endDate: '',
    selectedYear: null,
    selectedMonth: null,
  });
};

export const syncAttendanceWorkflow = (moduleId, fields = {}) => {
  const extracted = extractWorkflowFields(fields);
  if (!extracted) return readAttendanceWorkflow();

  const current = readAttendanceWorkflow();
  const patch = {
    employeeNumber: extracted.employeeNumber,
    fullName: extracted.fullName || current.fullName || '',
    startDate: extracted.startDate,
    endDate: extracted.endDate,
    selectedYear: extracted.selectedYear,
    selectedMonth: extracted.selectedMonth,
  };

  if (!current.flowType && moduleId === 'device') {
    patch.flowType = null;
  }

  return writeAttendanceWorkflow(patch);
};

const applyFlowMetadata = (moduleId, ctx) => {
  const patch = {};

  if (CORRECTION_BRANCH_IDS.has(moduleId) && ctx.flowType === ATTENDANCE_FLOW_CORRECTION && !ctx.correctionOrder) {
    patch.correctionOrder = moduleId === 'dtr' ? 'dtr-first' : 'modification-first';
  }

  if (COMPUTATION_MODULE_IDS.has(moduleId)) {
    patch.flowType = ATTENDANCE_FLOW_COMPUTATION;
    patch.computationModule = moduleId;
  } else if (moduleId === 'state' || moduleId === 'dtr' || moduleId === 'modification') {
    if (!ctx.flowType || ctx.flowType === ATTENDANCE_FLOW_CORRECTION) {
      patch.flowType = ATTENDANCE_FLOW_CORRECTION;
    }
  }

  return patch;
};

/** Truncate forward history when navigating back (browser-back semantics). */
export const truncateHistoryForBack = (targetModuleId) => {
  const ctx = readAttendanceWorkflow();
  const history = Array.isArray(ctx.visitHistory) ? [...ctx.visitHistory] : [];
  const idx = history.lastIndexOf(targetModuleId);
  const nextHistory = idx >= 0 ? history.slice(0, idx + 1) : [...history, targetModuleId];
  return writeAttendanceWorkflow({ ...ctx, visitHistory: nextHistory });
};

export const registerWorkflowVisit = (moduleId, { isBack = false } = {}) => {
  if (!moduleId) return readAttendanceWorkflow();
  const ctx = readAttendanceWorkflow();
  const flowPatch = applyFlowMetadata(moduleId, ctx);

  if (isBack) {
    return writeAttendanceWorkflow({ ...ctx, ...flowPatch });
  }

  const history = Array.isArray(ctx.visitHistory) ? [...ctx.visitHistory] : [];
  if (history[history.length - 1] !== moduleId) {
    history.push(moduleId);
  }

  return writeAttendanceWorkflow({ ...ctx, ...flowPatch, visitHistory: history });
};

export const getWorkflowSteps = (ctx = readAttendanceWorkflow()) => {
  if (ctx.flowType === ATTENDANCE_FLOW_COMPUTATION) {
    return ['device', 'dtr', 'summary'];
  }

  if (ctx.correctionOrder === 'modification-first') {
    return ['device', 'state', 'dtr', 'summary'];
  }
  return ['device', 'state', 'dtr', 'summary'];
};

export const getWorkflowPreviousModule = (currentModuleId, ctx = readAttendanceWorkflow()) => {
  const history = Array.isArray(ctx.visitHistory) ? ctx.visitHistory : [];
  if (history.length < 2) return null;

  const top = history[history.length - 1];
  if (top === currentModuleId) {
    return getModuleById(history[history.length - 2]);
  }

  const idx = history.lastIndexOf(currentModuleId);
  if (idx > 0) return getModuleById(history[idx - 1]);
  return null;
};

export const getWorkflowNextModule = (currentModuleId, ctx = readAttendanceWorkflow()) => {
  const steps = getWorkflowSteps(ctx);
  const stepIdx = steps.indexOf(currentModuleId);
  if (stepIdx < 0 || stepIdx >= steps.length - 1) return null;
  return getModuleById(steps[stepIdx + 1]);
};

export const prepareWorkflowNavigation = (targetModuleId, fields = {}) => {
  const extracted = extractWorkflowFields(fields);
  const current = readAttendanceWorkflow();
  const patch = extracted
    ? {
      employeeNumber: extracted.employeeNumber,
      fullName: extracted.fullName || current.fullName || '',
      startDate: extracted.startDate,
      endDate: extracted.endDate,
      selectedYear: extracted.selectedYear,
      selectedMonth: extracted.selectedMonth,
    }
    : {};

  if (targetModuleId === 'state' || targetModuleId === 'dtr' || targetModuleId === 'modification') {
    patch.flowType = ATTENDANCE_FLOW_CORRECTION;
    if (targetModuleId === 'dtr' && !current.correctionOrder) patch.correctionOrder = 'dtr-first';
    if (targetModuleId === 'modification' && !current.correctionOrder) {
      patch.correctionOrder = 'modification-first';
    }
  }

  if (COMPUTATION_MODULE_IDS.has(targetModuleId) || targetModuleId === 'summary') {
    patch.flowType = ATTENDANCE_FLOW_COMPUTATION;
    if (COMPUTATION_MODULE_IDS.has(targetModuleId)) {
      patch.computationModule = targetModuleId;
    }
  }

  const next = writeAttendanceWorkflow({ ...current, ...patch });
  const history = Array.isArray(next.visitHistory) ? [...next.visitHistory] : [];
  if (history[history.length - 1] !== targetModuleId) {
    history.push(targetModuleId);
  }
  writeAttendanceWorkflow({ visitHistory: history });
  return readAttendanceWorkflow();
};

export const navigateWorkflowBack = (navigate, targetModuleId, fields = {}) => {
  const mod = getModuleById(targetModuleId);
  if (!mod) return;

  truncateHistoryForBack(targetModuleId);

  if (targetModuleId === 'device') {
    clearWorkflowEmployeeFields();
    navigate(mod.path, {
      state: {
        fromAttendanceWorkflow: true,
        workflowNavDirection: 'back',
      },
    });
    return;
  }

  const extracted = extractWorkflowFields(fields);
  if (extracted) {
    const current = readAttendanceWorkflow();
    writeAttendanceWorkflow({
      employeeNumber: extracted.employeeNumber,
      fullName: extracted.fullName || current.fullName || '',
      startDate: extracted.startDate,
      endDate: extracted.endDate,
      selectedYear: extracted.selectedYear,
      selectedMonth: extracted.selectedMonth,
    });
  }

  const ctx = readAttendanceWorkflow();
  navigate(mod.path, { state: buildWorkflowNavState(ctx, { direction: 'back' }) });
};

export const navigateAttendanceWorkflow = (navigate, targetModuleId, fields = {}, extraState = {}) => {
  const mod = getModuleById(targetModuleId);
  if (!mod) return;
  prepareWorkflowNavigation(targetModuleId, fields);
  const ctx = readAttendanceWorkflow();
  navigate(mod.path, {
    state: buildWorkflowNavState(ctx, { extraState }),
  });
};
