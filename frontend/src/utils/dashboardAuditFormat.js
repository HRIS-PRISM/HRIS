export const parseDashboardAuditDetails = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getDashboardAuditOperation = (log) => {
  const details = parseDashboardAuditDetails(log?.details_json);
  if (details?.operation) return String(details.operation).toLowerCase();
  const action = String(log?.action || '').toLowerCase();
  if (action.includes('create') || action.includes('insert') || action.includes('add')) return 'create';
  if (action.includes('update') || action.includes('edit') || action.includes('modify')) return 'update';
  if (action.includes('delete') || action.includes('remove')) return 'delete';
  return 'activity';
};

export const getDashboardAuditChanges = (log) => {
  const details = parseDashboardAuditDetails(log?.details_json);
  return Array.isArray(details?.changes) ? details.changes : [];
};

export const formatDashboardAuditTime = (log) => {
  const raw = log?.timestamp || log?.created_at;
  if (!raw) return '';
  const ts = new Date(raw);
  if (Number.isNaN(ts.getTime())) return '';
  return ts.toLocaleString();
};

export const formatDashboardModuleName = (tableName, moduleLabel) => {
  if (tableName) {
    return String(tableName).toUpperCase().replace(/[\s-]+/g, '_');
  }
  return String(moduleLabel || 'MODULE').toUpperCase().replace(/[\s-]+/g, '_');
};

/** `San Jose, Dhani I. (#20134507)` — matches attendance audit style. */
export const formatPersonRef = (name, empNum) => {
  const num = String(empNum || '').trim();
  const n = String(name || '').trim();
  if (!num) return n || 'Unknown user';
  if (n) return `${n} (#${num})`;
  return `#${num}`;
};

const UPDATE_VERB_BY_TABLE = {
  person_table: 'updated personal information in',
  children_table: 'updated children information in',
  college_table: 'updated college information in',
  eligibility_table: 'updated eligibility information in',
  graduate_table: 'updated graduate studies in',
  learning_and_development_table: 'updated learning and development in',
  other_information_table: 'updated other information in',
  vocational_table: 'updated vocational information in',
  voluntary_work_table: 'updated voluntary work in',
  work_experience_table: 'updated work experience in',
};

const CREATE_VERB_BY_TABLE = {
  person_table: 'added personal information in',
  children_table: 'added children information in',
  college_table: 'added college information in',
  eligibility_table: 'added eligibility information in',
  graduate_table: 'added graduate studies in',
  learning_and_development_table: 'added learning and development in',
  other_information_table: 'added other information in',
  vocational_table: 'added vocational information in',
  voluntary_work_table: 'added voluntary work in',
  work_experience_table: 'added work experience in',
};

const DELETE_VERB_BY_TABLE = {
  person_table: 'deleted personal information from',
  children_table: 'deleted children information from',
  college_table: 'deleted college information from',
  eligibility_table: 'deleted eligibility information from',
  graduate_table: 'deleted graduate studies from',
  learning_and_development_table: 'deleted learning and development from',
  other_information_table: 'deleted other information from',
  vocational_table: 'deleted vocational information from',
  voluntary_work_table: 'deleted voluntary work from',
  work_experience_table: 'deleted work experience from',
};

export const getDashboardActionVerb = (operation, tableName) => {
  const table = String(tableName || '').toLowerCase();
  if (operation === 'create') {
    return CREATE_VERB_BY_TABLE[table] || 'added a record in';
  }
  if (operation === 'delete') {
    return DELETE_VERB_BY_TABLE[table] || 'deleted a record from';
  }
  if (operation === 'update') {
    return UPDATE_VERB_BY_TABLE[table] || 'updated a record in';
  }
  return 'modified';
};

export const buildDashboardChangesSummary = (log) => {
  const changes = getDashboardAuditChanges(log);
  const operation = getDashboardAuditOperation(log);
  if (!changes.length) return null;

  return changes
    .map((c) => {
      if (operation === 'create') {
        return `${c.label}: ${c.new}`;
      }
      if (operation === 'delete') {
        return `${c.label}: ${c.old}`;
      }
      const oldVal = c.old ?? '—';
      const newVal = c.new ?? '—';
      return `${c.label}: ${oldVal} → ${newVal}`;
    })
    .join(' · ');
};

/**
 * Attendance-style sentence:
 * San Jose, Dhani I. (#20134507) updated personal information in PERSON_TABLE
 * for San Jose, Dhani I. (#20134507) · Changes: Height Cm: 175 → 177
 */
export const buildDashboardAuditSentence = (log) => {
  const details = parseDashboardAuditDetails(log?.details_json);
  const operation = getDashboardAuditOperation(log);
  const moduleName = formatDashboardModuleName(log?.table_name, details?.module_label);
  const verb = getDashboardActionVerb(operation, log?.table_name);

  const actor = formatPersonRef(log?.actorName, log?.employeeNumber);
  const target = formatPersonRef(log?.targetName, log?.targetEmployeeNumber);

  const parts = [];
  const changesSummary =
    buildDashboardChangesSummary(log) ||
    (details?.changes_summary
      ? String(details.changes_summary).replace(/\s*->\s*/g, ' → ')
      : null);

  if (changesSummary) {
    parts.push(`Changes: ${changesSummary}`);
  }

  const base = `${actor} ${verb} ${moduleName} for ${target}`;
  return parts.length ? `${base} · ${parts.join(' · ')}` : `${base}.`;
};
