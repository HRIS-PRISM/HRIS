/**
 * Turns payroll_processed rows into an Appendix33Run.
 *
 * This is the only place that knows both the database column names and the export
 * contract. The filler downstream of it never sees a payroll_processed row.
 */

const { normaliseEmployee } = require('./contract');
const { periodLabels } = require('./fillAppendix33');
const M = require('./appendix33Map');
const { getResolved } = require('./positionOverrides');

/**
 * Resolves which Appendix 33 block a payroll row belongs to.
 * Employment category (typeName) wins when mapped; otherwise department code.
 *
 * @param {Object} row
 * @param {{departments: Object, employmentTypes: Object}} maps
 * @returns {string|null}
 */
function resolveTemplateKey(row, maps) {
  const typeName = row.employmentTypeName == null ? '' : String(row.employmentTypeName).trim();
  if (typeName && maps.employmentTypes?.[typeName]) {
    return maps.employmentTypes[typeName];
  }
  const code = row.department == null ? '' : String(row.department).trim();
  if (code && maps.departments?.[code]) {
    return maps.departments[code];
  }
  return null;
}

/**
 * Groups rows by template department and normalises each into an Appendix33Employee.
 *
 * Rows whose department / employment category has no template block are collected
 * into `unmapped` rather than dropped, so the caller can refuse the export and say
 * whose pay would have gone missing. Employees are sorted by name to match how the
 * sheets have always been ordered by hand.
 *
 * @param {Object[]} rows payroll_processed rows (may include employmentTypeName)
 * @param {{month:number|string, year:number|string, payrollNoSeed?:string, quincena?:string}} period
 * @returns {{run: import('./contract').Appendix33Run, unmapped: Object[], counts: Object}}
 */
function buildRun(rows, period) {
  const month = Number(period.month);
  const year = Number(period.year);
  const { periodLabel, periodShort, daysInPeriod } = periodLabels(month, year);

  const departments = {};
  for (const key of M.DEPARTMENT_KEYS) departments[key] = [];

  const unmappedCounts = new Map();
  const maps = getResolved();

  for (const row of rows) {
    const templateKey = resolveTemplateKey(row, maps);
    if (!templateKey) {
      const typeName = row.employmentTypeName == null ? '' : String(row.employmentTypeName).trim();
      const code = row.department == null ? '' : String(row.department).trim();
      const label = typeName
        ? `emp:${typeName}`
        : (code || '(no department)');
      unmappedCounts.set(label, (unmappedCounts.get(label) || 0) + 1);
      continue;
    }

    const mapped = {};
    for (const [dbField, contractField] of Object.entries(M.DB_FIELD_TO_CONTRACT)) {
      mapped[contractField] = row[dbField];
    }
    for (const field of M.UNSOURCED_CONTRACT_FIELDS) mapped[field] = 0;

    departments[templateKey].push(normaliseEmployee(mapped));
  }

  for (const key of M.DEPARTMENT_KEYS) {
    departments[key].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }

  const counts = {};
  for (const key of M.DEPARTMENT_KEYS) counts[key] = departments[key].length;

  return {
    run: {
      periodLabel,
      periodShort,
      monthCode: String(month).padStart(2, '0'),
      payrollNoSeed: period.payrollNoSeed || '',
      quincena: period.quincena || '',
      daysInPeriod,
      departments,
    },
    unmapped: [...unmappedCounts.entries()].map(([department, count]) => ({ department, count })),
    counts,
  };
}

module.exports = { buildRun, resolveTemplateKey };
