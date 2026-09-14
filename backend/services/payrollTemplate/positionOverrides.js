/**
 * Runtime overrides for Appendix 33 cell positions and department routing.
 *
 * Defaults live in appendix33Map.js. Anything saved from the Payroll Processed
 * settings dialog is stored here as JSON so HR can change columns without a deploy.
 */

const fs = require('fs');
const path = require('path');
const M = require('./appendix33Map');

const FILE = path.join(__dirname, 'positionOverrides.json');
const COL_RE = /^[A-Z]{1,3}$/;

const FIELD_META = {
  wtax: [
    { key: 'name', label: 'Employee name' },
    { key: 'position', label: 'Position' },
    { key: 'employeeNumber', label: 'Employee number' },
    { key: 'withholdingTax', label: 'Withholding tax' },
    { key: 'lwopDays', label: 'LWOP / absence days' },
    { key: 'lwopHours', label: 'Late / absence hours' },
    { key: 'lwopMinutes', label: 'Late / absence minutes' },
  ],
  pay: [
    { key: 'rateNbc594', label: 'NBC 597 / rate (column F of gross)' },
    { key: 'nbcDiffl597', label: "Differential" },
    { key: 'increment', label: 'Step increment' },
  ],
  deds: [
    { key: 'gsisArrears', label: 'GSIS arrears' },
    { key: 'gsisSalaryLoan', label: 'GSIS salary loan' },
    { key: 'gsisPolicyLoan', label: 'GSIS policy loan' },
    { key: 'gfal', label: 'GFAL' },
    { key: 'cpl', label: 'CPL' },
    { key: 'mpl', label: 'MPL' },
    { key: 'mplLite', label: 'MPL Lite' },
    { key: 'emergencyLoan', label: 'Emergency loan (ELA)' },
    { key: 'gsisHousingLoan', label: 'GSIS housing loan' },
    { key: 'gsisOthers', label: 'Other GSIS' },
    { key: 'pagibigFundCont', label: 'Pag-IBIG contribution' },
    { key: 'pagibig2', label: 'Pag-IBIG 2' },
    { key: 'pagibigMpl', label: 'Pag-IBIG MPL' },
    { key: 'pagibigCalLoan', label: 'Pag-IBIG calamity loan' },
    { key: 'pagibigOthers', label: 'Other Pag-IBIG' },
    { key: 'landbankSalaryLoan', label: 'Landbank salary loan' },
    { key: 'earistCreditCoop', label: 'EARIST credit coop' },
    { key: 'feu', label: 'FEU' },
    { key: 'mtslaSalaryLoan', label: 'MTSLA salary loan' },
    { key: 'otherDeds', label: 'Other deductions / unliq. CA' },
  ],
};

function loadOverrides() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.error('Appendix 33: could not read positionOverrides.json', err);
    return {};
  }
}

function normalizeCol(value, field) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${field} needs a column letter (A, B, AA, …)`);
  }
  const col = String(value).trim().toUpperCase();
  if (!COL_RE.test(col)) throw new Error(`${field} has an invalid column "${value}"`);
  return col;
}

function normalizeColMap(incoming, defaults, sheetLabel) {
  const out = { ...defaults };
  if (!incoming || typeof incoming !== 'object') return out;
  for (const key of Object.keys(defaults)) {
    if (incoming[key] === undefined) continue;
    out[key] = normalizeCol(incoming[key], `${sheetLabel}.${key}`);
  }
  return out;
}

function normalizeFirstRow(value, fallback, label) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 500) {
    throw new Error(`${label} must be a row number between 1 and 500`);
  }
  return n;
}

function normalizeDeptMap(incoming) {
  const out = { ...M.DB_DEPT_TO_TEMPLATE };
  if (!incoming || typeof incoming !== 'object') return out;
  for (const [code, key] of Object.entries(incoming)) {
    const deptCode = String(code).trim();
    if (!deptCode) continue;
    const templateKey = key == null ? '' : String(key).trim();
    if (!templateKey) {
      delete out[deptCode];
      continue;
    }
    if (!M.DEPARTMENT_KEYS.includes(templateKey)) {
      throw new Error(`${deptCode} is mapped to unknown sheet "${templateKey}"`);
    }
    out[deptCode] = templateKey;
  }
  return out;
}

/** employment_type_config.typeName -> template key */
function normalizeEmpTypeMap(incoming) {
  const out = { ...(M.DB_EMP_TYPE_TO_TEMPLATE || {}) };
  if (!incoming || typeof incoming !== 'object') return out;
  for (const [typeName, key] of Object.entries(incoming)) {
    const name = String(typeName).trim();
    if (!name) continue;
    const templateKey = key == null ? '' : String(key).trim();
    if (!templateKey) {
      delete out[name];
      continue;
    }
    if (!M.DEPARTMENT_KEYS.includes(templateKey)) {
      throw new Error(`Employment category "${name}" is mapped to unknown sheet "${templateKey}"`);
    }
    out[name] = templateKey;
  }
  return out;
}

function ownedFrom(inputCols) {
  return {
    wtax: [...new Set([...M.FORMULA_COLS.wtax, ...Object.values(inputCols.wtax)])],
    pay: [...new Set([...M.FORMULA_COLS.pay, ...Object.values(inputCols.pay)])],
    deds: [...new Set([...M.FORMULA_COLS.deds, ...Object.values(inputCols.deds)])],
  };
}

function getResolved() {
  const stored = loadOverrides();
  const wtax = normalizeColMap(stored.wtax, M.WTAX_INPUT_COLS, 'WTAX');
  const pay = normalizeColMap(stored.pay, M.PAY_INPUT_COLS, 'PAY');
  const deds = normalizeColMap(stored.deds, M.DEDS_INPUT_COLS, 'DEDS');
  const firstRows = {
    wtax: normalizeFirstRow(stored.firstRows?.wtax, M.WTAX_FIRST_ROW, 'WTAX first row'),
    pay: normalizeFirstRow(stored.firstRows?.pay, M.PAY_FIRST_ROW, 'PAY first row'),
    deds: normalizeFirstRow(stored.firstRows?.deds, M.DEDS_FIRST_ROW, 'DEDS first row'),
  };
  return {
    wtax,
    pay,
    deds,
    firstRows,
    departments: normalizeDeptMap(stored.departments),
    employmentTypes: normalizeEmpTypeMap(stored.employmentTypes),
    owned: ownedFrom({ wtax, pay, deds }),
  };
}

function saveOverrides(body) {
  const resolved = {
    wtax: normalizeColMap(body?.wtax, M.WTAX_INPUT_COLS, 'WTAX'),
    pay: normalizeColMap(body?.pay, M.PAY_INPUT_COLS, 'PAY'),
    deds: normalizeColMap(body?.deds, M.DEDS_INPUT_COLS, 'DEDS'),
    firstRows: {
      wtax: normalizeFirstRow(body?.firstRows?.wtax, M.WTAX_FIRST_ROW, 'WTAX first row'),
      pay: normalizeFirstRow(body?.firstRows?.pay, M.PAY_FIRST_ROW, 'PAY first row'),
      deds: normalizeFirstRow(body?.firstRows?.deds, M.DEDS_FIRST_ROW, 'DEDS first row'),
    },
    departments: normalizeDeptMap(body?.departments),
    employmentTypes: normalizeEmpTypeMap(body?.employmentTypes),
  };
  fs.writeFileSync(FILE, JSON.stringify(resolved, null, 2) + '\n');
  return getResolved();
}

function resetOverrides() {
  if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  return getResolved();
}

function describeLayout() {
  const resolved = getResolved();
  return {
    fields: FIELD_META,
    defaults: {
      wtax: M.WTAX_INPUT_COLS,
      pay: M.PAY_INPUT_COLS,
      deds: M.DEDS_INPUT_COLS,
      firstRows: { wtax: M.WTAX_FIRST_ROW, pay: M.PAY_FIRST_ROW, deds: M.DEDS_FIRST_ROW },
      departments: M.DB_DEPT_TO_TEMPLATE,
      employmentTypes: M.DB_EMP_TYPE_TO_TEMPLATE || {},
    },
    current: {
      wtax: resolved.wtax,
      pay: resolved.pay,
      deds: resolved.deds,
      firstRows: resolved.firstRows,
      departments: resolved.departments,
      employmentTypes: resolved.employmentTypes,
    },
    templateDepartments: M.DEPARTMENTS,
  };
}

module.exports = {
  FILE,
  FIELD_META,
  loadOverrides,
  getResolved,
  saveOverrides,
  resetOverrides,
  describeLayout,
};
