const db = require('../db');
const { logAudit } = require('../middleware/auth');

const SKIP_COMPARE_FIELDS = new Set([
  'id',
  'profile_picture',
  'profilePicture',
  'created_at',
  'updated_at',
  'incValue',
]);

const MODULE_CONFIG = {
  children_table: {
    label: 'Children Information',
    sqlTable: 'children_table',
    personIdField: 'person_id',
    fields: {
      childrenFirstName: 'First Name',
      childrenMiddleName: 'Middle Name',
      childrenLastName: 'Last Name',
      childrenNameExtension: 'Name Extension',
      dateOfBirth: 'Date of Birth',
      person_id: 'Employee Number',
    },
  },
  college_table: {
    label: 'College',
    sqlTable: 'college_table',
    personIdField: 'person_id',
    fields: {
      collegeNameOfSchool: 'School Name',
      collegeDegree: 'Degree',
      collegePeriodFrom: 'Period From',
      collegePeriodTo: 'Period To',
      collegeHighestAttained: 'Highest Level Attained',
      collegeYearGraduated: 'Year Graduated',
      collegeScholarshipAcademicHonorsReceived: 'Scholarship / Honors',
      person_id: 'Employee Number',
    },
  },
  eligibility_table: {
    label: 'Eligibility',
    sqlTable: 'eligibility_table',
    personIdField: 'person_id',
    fields: {
      eligibilityName: 'Eligibility Name',
      eligibilityRating: 'Rating',
      eligibilityDateOfExam: 'Date of Exam',
      eligibilityPlaceOfExam: 'Place of Exam',
      licenseNumber: 'License Number',
      DateOfValidity: 'Date of Validity',
      person_id: 'Employee Number',
    },
  },
  graduate_table: {
    label: 'Graduate Studies',
    sqlTable: 'graduate_table',
    personIdField: 'person_id',
    fields: {
      graduateNameOfSchool: 'School Name',
      graduateDegree: 'Degree',
      graduatePeriodFrom: 'Period From',
      graduatePeriodTo: 'Period To',
      graduateHighestAttained: 'Highest Level Attained',
      graduateYearGraduated: 'Year Graduated',
      graduateScholarshipAcademicHonorsReceived: 'Scholarship / Honors',
      person_id: 'Employee Number',
    },
  },
  learning_and_development_table: {
    label: 'Learning and Development',
    sqlTable: 'learning_and_development_table',
    personIdField: 'person_id',
    fields: {
      titleOfProgram: 'Program Title',
      dateFrom: 'Date From',
      dateTo: 'Date To',
      numberOfHours: 'Number of Hours',
      typeOfLearningDevelopment: 'Type of LD',
      conductedSponsored: 'Conducted / Sponsored By',
      person_id: 'Employee Number',
    },
  },
  other_information_table: {
    label: 'Other Information',
    sqlTable: 'other_information_table',
    personIdField: 'person_id',
    fields: {
      specialSkills: 'Special Skills',
      nonAcademicDistinctions: 'Non-Academic Distinctions',
      membershipInAssociation: 'Membership in Association',
      person_id: 'Employee Number',
    },
  },
  vocational_table: {
    label: 'Vocational',
    sqlTable: 'vocational_table',
    personIdField: 'person_id',
    fields: {
      vocationalNameOfSchool: 'School Name',
      vocationalDegree: 'Course',
      vocationalPeriodFrom: 'Period From',
      vocationalPeriodTo: 'Period To',
      vocationalHighestAttained: 'Highest Level Attained',
      vocationalYearGraduated: 'Year Graduated',
      person_id: 'Employee Number',
    },
  },
  voluntary_work_table: {
    label: 'Voluntary Work',
    sqlTable: 'voluntary_work_table',
    personIdField: 'person_id',
    fields: {
      nameAndAddress: 'Name and Address',
      dateFrom: 'Date From',
      dateTo: 'Date To',
      numberOfHours: 'Number of Hours',
      natureOfWork: 'Nature of Work',
      person_id: 'Employee Number',
    },
  },
  work_experience_table: {
    label: 'Work Experience',
    sqlTable: 'work_experience_table',
    personIdField: 'person_id',
    fields: {
      workDateFrom: 'Date From',
      workDateTo: 'Date To',
      workPositionTitle: 'Position Title',
      workCompany: 'Company',
      workMonthlySalary: 'Monthly Salary',
      SalaryJobOrPayGrade: 'Salary / Pay Grade',
      StatusOfAppointment: 'Status of Appointment',
      isGovtService: 'Government Service',
      person_id: 'Employee Number',
    },
  },
  person_table: {
    label: 'Personal Information',
    sqlTable: 'person_table',
    personIdField: 'agencyEmployeeNum',
    dynamicFields: true,
    fields: {},
  },
};

const MANILA_TZ = 'Asia/Manila';

const humanizeField = (key) =>
  String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const DATE_FIELD_PATTERN =
  /(date|birth|from|to|validity|graduated|period)/i;

const isDateLikeField = (field, val) => {
  if (DATE_FIELD_PATTERN.test(String(field || ''))) return true;
  if (val instanceof Date) return true;
  const s = String(val ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) || /GMT|UTC|T\d{2}:\d{2}/.test(s);
};

const coerceDate = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s || s === '—') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Calendar date in Asia/Manila — DB DATE vs form ISO compare equal when same day. */
const dateCompareKey = (val) => {
  if (val === null || val === undefined || val === '') return null;

  const s = String(val).trim();
  // MySQL DATE / plain form value — no timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = coerceDate(val);
  if (!d) return null;

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: MANILA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

const formatDateDisplay = (val) => dateCompareKey(val);

const numericCompareKey = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

const normalizeCompareKey = (val, field) => {
  if (val === null || val === undefined) return '';
  const text = String(val).trim();
  if (text === '') return '';

  if (isDateLikeField(field, val)) {
    const dateKey = dateCompareKey(val);
    if (dateKey) return `date:${dateKey}`;
  }

  // Long date strings that failed isDateLikeField but parse as dates (e.g. GMT+0800)
  if (/GMT|UTC|T\d{2}:\d{2}/.test(text)) {
    const dateKey = dateCompareKey(val);
    if (dateKey) return `date:${dateKey}`;
  }

  const num = numericCompareKey(val);
  if (num !== null && /^-?\d+(\.\d+)?$/.test(text.replace(/,/g, ''))) {
    return `num:${num}`;
  }

  return `str:${text.toLowerCase()}`;
};

const formatValue = (val, field = '') => {
  if (val === null || val === undefined) return '—';
  const text = String(val).trim();
  if (text === '') return '—';

  const dateDisplay = formatDateDisplay(val);
  if (dateDisplay && isDateLikeField(field, val)) return dateDisplay;

  const num = numericCompareKey(val);
  if (num !== null && /^-?\d+(\.\d+)?$/.test(text.replace(/,/g, ''))) {
    return Number.isInteger(num) ? String(num) : String(num);
  }

  return text;
};

const valuesEqual = (a, b, field = '') =>
  normalizeCompareKey(a, field) === normalizeCompareKey(b, field);

const resolveFieldLabels = (config, row) => {
  if (!config.dynamicFields) return config.fields || {};
  const labels = { ...(config.fields || {}) };
  Object.keys(row || {}).forEach((key) => {
    if (!SKIP_COMPARE_FIELDS.has(key) && !labels[key]) {
      labels[key] = humanizeField(key);
    }
  });
  return labels;
};

const buildChangeEntries = (operation, oldRow, newRow, config) => {
  const fieldLabels = resolveFieldLabels(config, { ...(oldRow || {}), ...(newRow || {}) });
  const keys =
    operation === 'delete'
      ? Object.keys(fieldLabels)
      : [
          ...new Set([
            ...Object.keys(fieldLabels),
            ...Object.keys(oldRow || {}),
            ...Object.keys(newRow || {}),
          ]),
        ];

  const changes = [];

  keys.forEach((field) => {
    if (SKIP_COMPARE_FIELDS.has(field)) return;
    const label = fieldLabels[field] || humanizeField(field);
    const oldVal = formatValue(oldRow?.[field], field);
    const newVal = formatValue(newRow?.[field], field);

    if (operation === 'create') {
      if (newVal === '—') return;
      changes.push({
        field,
        label,
        old: null,
        new: newVal,
        create_line: `Create: ${newVal}`,
      });
      return;
    }

    if (operation === 'delete') {
      if (oldVal === '—') return;
      changes.push({
        field,
        label,
        old: oldVal,
        new: null,
        delete_line: `Delete: ${oldVal}`,
      });
      return;
    }

    // Updates: only compare fields present in the submitted payload.
    if (!Object.prototype.hasOwnProperty.call(newRow || {}, field)) return;

    if (!valuesEqual(oldRow?.[field], newRow?.[field], field)) {
      changes.push({
        field,
        label,
        old: oldVal,
        new: newVal,
        update_line: `Update: ${newVal}`,
        diff_line: `${oldVal} → ${newVal}`,
      });
    }
  });

  return changes;
};

const buildAuditDetails = (operation, oldRow, newRow, config) => {
  const changes = buildChangeEntries(operation, oldRow, newRow, config);
  const summaryParts = changes.map((c) => {
    if (operation === 'create') return c.create_line;
    if (operation === 'delete') return c.delete_line;
    return `${c.label}: ${c.diff_line}`;
  });

  return {
    module_type: 'dashboard',
    module_label: config.label,
    operation,
    changes,
    changes_summary: summaryParts.join(' · ') || null,
  };
};

const resolveTargetEmployee = (config, oldRow, newRow) => {
  const personField = config.personIdField || 'person_id';
  const fromPersonId = newRow?.[personField] ?? oldRow?.[personField];
  if (fromPersonId != null && String(fromPersonId).trim() !== '') {
    return String(fromPersonId).trim();
  }
  const agencyNum = newRow?.agencyEmployeeNum ?? oldRow?.agencyEmployeeNum;
  return agencyNum != null && String(agencyNum).trim() !== ''
    ? String(agencyNum).trim()
    : null;
};

const getModuleConfig = (tableName) => MODULE_CONFIG[tableName] || null;

const fetchDashboardRow = (tableName, id, callback) => {
  const config = getModuleConfig(tableName);
  if (!config) return callback(new Error(`Unknown dashboard table: ${tableName}`));

  db.query(
    `SELECT * FROM \`${config.sqlTable}\` WHERE id = ? LIMIT 1`,
    [id],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, Array.isArray(rows) && rows.length ? rows[0] : null);
    },
  );
};

const logDashboardCreate = (req, tableName, recordId, newRow) => {
  const config = getModuleConfig(tableName);
  if (!config) return;
  try {
    const details = buildAuditDetails('create', null, newRow, config);
    logAudit(
      req.user,
      'Create',
      tableName,
      recordId,
      resolveTargetEmployee(config, null, newRow),
      details,
    );
  } catch (e) {
    console.error('[dashboard-audit] create:', e.message);
  }
};

const logDashboardUpdate = (req, tableName, recordId, oldRow, newRow) => {
  const config = getModuleConfig(tableName);
  if (!config) return;
  try {
    const details = buildAuditDetails('update', oldRow, newRow, config);
    logAudit(
      req.user,
      'Update',
      tableName,
      recordId,
      resolveTargetEmployee(config, oldRow, newRow),
      details,
    );
  } catch (e) {
    console.error('[dashboard-audit] update:', e.message);
  }
};

const logDashboardDelete = (req, tableName, recordId, oldRow) => {
  const config = getModuleConfig(tableName);
  if (!config) return;
  try {
    const details = buildAuditDetails('delete', oldRow, null, config);
    logAudit(
      req.user,
      'Delete',
      tableName,
      recordId,
      resolveTargetEmployee(config, oldRow, null),
      details,
    );
  } catch (e) {
    console.error('[dashboard-audit] delete:', e.message);
  }
};

module.exports = {
  MODULE_CONFIG,
  getModuleConfig,
  fetchDashboardRow,
  logDashboardCreate,
  logDashboardUpdate,
  logDashboardDelete,
  buildAuditDetails,
};
