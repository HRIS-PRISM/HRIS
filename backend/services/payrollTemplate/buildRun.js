/**
 * Turns payroll_processed rows into an Appendix33Run.
 *
 * This is the only place that knows both the database column names and the export
 * contract. The filler downstream of it never sees a payroll_processed row.
 */

const { normaliseEmployee } = require('./contract');
const { periodLabels } = require('./fillAppendix33');
const M = require('./appendix33Map');
const { getResolved, resolveScopeTemplate } = require('./positionOverrides');

/**
 * Resolves which Appendix 33 block a payroll row belongs to.
 * An allowed department code wins (so CCJE with tabs-automatic stays CCJE even when
 * the employee is Temporary). Employment category is used only when the department
 * is not on the allow-list (GEN.AD / TEMPO people in an unmapped office).
 *
 * @param {Object} row
 * @param {{departments: Object, employmentTypes: Object}} maps
 * @returns {{key:string, blueprintKey:string|null}|null}
 */
function resolveRowScope(row, maps) {
  const code = row.department == null ? '' : String(row.department).trim();
  if (code && maps.departments?.[code]) {
    const resolved = resolveScopeTemplate(maps.departments[code], code);
    if (resolved) return resolved;
  }
  const typeName = row.employmentTypeName == null ? '' : String(row.employmentTypeName).trim();
  if (typeName && maps.employmentTypes?.[typeName]) {
    const resolved = resolveScopeTemplate(maps.employmentTypes[typeName], typeName);
    if (resolved) return resolved;
  }
  return null;
}

/** @returns {string|null} template key only, kept for callers that do not need the blueprint */
function resolveTemplateKey(row, maps) {
  return resolveRowScope(row, maps)?.key || null;
}

/**
 * Groups rows by template department and normalises each into an Appendix33Employee.
 *
 * Rows whose department / employment category is not on the allow-list are collected
 * into `unmapped` rather than dropped, so the caller can refuse the export and say
 * whose pay would have gone missing. Allowed scopes with no tab set of their own come
 * back in `blueprints`, telling the filler which block to copy for them. Employees are
 * sorted by name to match how the sheets have always been ordered by hand.
 *
 * @param {Object[]} rows payroll_processed rows (may include employmentTypeName)
 * @param {{month:number|string, year:number|string, payrollNoSeed?:string, quincena?:string,
 *          forceScope?:{key:string, blueprintKey:string|null}}} period
 *        `forceScope` puts every row in one block. A scoped download has already
 *        filtered the query to that department / category, so per-row routing would
 *        only scatter those employees into blocks the download will not show.
 * @returns {{run: import('./contract').Appendix33Run, unmapped: Object[], counts: Object, blueprints: Object.<string,string>}}
 */
function buildRun(rows, period) {
  const month = Number(period.month);
  const year = Number(period.year);
  const { periodLabel, periodShort, daysInPeriod } = periodLabels(month, year);

  const departments = {};
  for (const key of M.DEPARTMENT_KEYS) departments[key] = [];

  /** generated key -> blueprint key it should be copied from */
  const blueprints = {};
  const unmappedCounts = new Map();
  const maps = getResolved();
  const forceScope = period.forceScope || null;

  for (const row of rows) {
    const scope = forceScope || resolveRowScope(row, maps);
    if (!scope) {
      const typeName = row.employmentTypeName == null ? '' : String(row.employmentTypeName).trim();
      const code = row.department == null ? '' : String(row.department).trim();
      const label = typeName
        ? `emp:${typeName}`
        : (code || '(no department)');
      unmappedCounts.set(label, (unmappedCounts.get(label) || 0) + 1);
      continue;
    }

    if (!departments[scope.key]) departments[scope.key] = [];
    if (scope.blueprintKey) blueprints[scope.key] = scope.blueprintKey;

    const mapped = {};
    for (const [dbField, contractField] of Object.entries(M.DB_FIELD_TO_CONTRACT)) {
      mapped[contractField] = row[dbField];
    }
    for (const field of M.UNSOURCED_CONTRACT_FIELDS) mapped[field] = 0;

    departments[scope.key].push(normaliseEmployee(mapped));
  }

  const counts = {};
  for (const key of Object.keys(departments)) {
    departments[key].sort((a, b) => a.name.localeCompare(b.name, 'en'));
    counts[key] = departments[key].length;
  }

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
    blueprints,
  };
}

module.exports = { buildRun, resolveTemplateKey, resolveRowScope };
