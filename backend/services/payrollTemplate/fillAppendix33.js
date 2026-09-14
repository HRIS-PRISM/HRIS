/**
 * Fills the EARIST Appendix 33 master workbook from an Appendix33Run.
 *
 * Only per-employee input cells are written. Subtotals, the SUMMARY sheet and the
 * amount-in-words VBA call are left as formulas, so Excel's own arithmetic stays an
 * independent check on what the payroll engine produced.
 */

const fs = require('fs');
const path = require('path');
const { XlsmPackage } = require('./xlsmPatcher');
const { translateFormula } = require('./formulaTranslate');
const M = require('./appendix33Map');
const { getResolved } = require('./positionOverrides');
const { getActiveTemplatePath } = require('./templateStore');

function loadLayout() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'layout.json'), 'utf8'));
}

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates', 'EARIST_Appendix33.xlsm');

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

/** Thrown when a department has more employees this run than its block can hold. */
class Appendix33CapacityError extends Error {
  constructor(overflows) {
    const detail = overflows
      .map((o) => `${o.department} needs ${o.needed} rows but the template holds ${o.capacity}`)
      .join('; ');
    super(`Payroll template is too small for this run: ${detail}`);
    this.name = 'Appendix33CapacityError';
    this.overflows = overflows;
  }
}

/** Thrown when payroll rows carry a department code the template has no block for. */
class Appendix33MappingError extends Error {
  constructor(unmapped) {
    const detail = unmapped.map((u) => `${u.department} (${u.count} employees)`).join(', ');
    super(`These departments have no Appendix 33 sheet: ${detail}`);
    this.name = 'Appendix33MappingError';
    this.unmapped = unmapped;
  }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Zero amounts are written as blank cells rather than 0.
 * A blank sums identically but matches how the workbook has always been filled by
 * hand, so the printed page looks the same as the ones HR produced before.
 */
function writeAmount(sheet, col, row, value, donorRow) {
  const cell = sheet.writable(col + row, col + donorRow);
  const amount = round2(value);
  if (amount === 0) cell.clear();
  else cell.setNumber(amount);
}

function writeText(sheet, col, row, value, donorRow) {
  sheet.writable(col + row, col + donorRow).setText(value == null ? '' : String(value));
}

/**
 * Captures a block's first two employee rows as the formula pattern for the rest.
 *
 * Row 1 of a block and row 2 differ: the serial number is a literal 1 on the first row
 * and =+B21+1 afterwards, and the EC / Pag-IBIG government-share columns are literal
 * constants first and a =W21 chain afterwards. Everything else on row 2 is row 1 with
 * the row numbers shifted, so row 2 shifted by (i-1) reproduces any row i.
 */
function capturePattern(sheet, kind, firstRow, deptKey) {
  const cols = [...M.FORMULA_COLS[kind], ...M.CHAINED_CONST_COLS[kind]];
  const fallback = M.firstRowFormulas(deptKey)[kind] || {};
  const first = {};
  const next = {};
  for (const col of cols) {
    first[col] = sheet.formulaAt(col + firstRow);
    next[col] = sheet.formulaAt(col + (firstRow + 1));
    if (first[col] === null && fallback[col]) first[col] = fallback[col];
    if (next[col] === null && fallback[col]) next[col] = translateFormula(fallback[col], 1, 0);
  }
  return { cols, first, next };
}

/** Restores row i's formulas from the captured pattern. */
function stampRow(sheet, pattern, firstRow, i) {
  for (const col of pattern.cols) {
    if (i === 0) {
      // Row 1 keeps whatever the template holds: either its own formula, or a literal
      // (serial number 1, EC 100, Pag-IBIG 200) that the block is defined by.
      if (pattern.first[col] !== null) sheet.setFormula(col + firstRow, pattern.first[col]);
      continue;
    }
    const source = pattern.next[col];
    if (source === null) continue;
    sheet.setFormula(col + (firstRow + i), translateFormula(source, i - 1, 0));
  }
}

/** Empties every cell the export owns on an unused row, formulas included. */
function clearRow(sheet, kind, firstRow, i, owned) {
  for (const col of [...owned[kind], ...M.CHAINED_CONST_COLS[kind]]) {
    sheet.clearCell(col + (firstRow + i));
  }
}

function dailyRateFormula(paySheet, payRow, daysInPeriod) {
  const days = Number(daysInPeriod);
  const divisor = Number.isInteger(days) && days > 0 ? days : 31;
  return `'${paySheet}'!I${payRow}/${divisor}`;
}

function fillDepartment(pkg, dept, employees, layout, map, daysInPeriod) {
  const names = M.sheetNames(dept.key);
  const geometry = layout.departments[dept.key];
  const sheets = {
    wtax: pkg.sheet(names.wtax),
    pay: pkg.sheet(names.pay),
    deds: pkg.sheet(names.deds),
  };
  const firstRow = map.firstRows;

  const patterns = {
    wtax: capturePattern(sheets.wtax, 'wtax', firstRow.wtax, dept.key),
    pay: capturePattern(sheets.pay, 'pay', firstRow.pay, dept.key),
    deds: capturePattern(sheets.deds, 'deds', firstRow.deds, dept.key),
  };

  for (let i = 0; i < geometry.capacity; i++) {
    const employee = employees[i];

    if (!employee) {
      clearRow(sheets.wtax, 'wtax', firstRow.wtax, i, map.owned);
      clearRow(sheets.pay, 'pay', firstRow.pay, i, map.owned);
      clearRow(sheets.deds, 'deds', firstRow.deds, i, map.owned);
      continue;
    }

    for (const kind of ['wtax', 'pay', 'deds']) {
      stampRow(sheets[kind], patterns[kind], firstRow[kind], i);
    }

    const wtaxRow = firstRow.wtax + i;
    writeText(sheets.wtax, map.wtax.name, wtaxRow, employee.name, firstRow.wtax);
    writeText(sheets.wtax, map.wtax.position, wtaxRow, employee.position, firstRow.wtax);
    writeText(sheets.wtax, map.wtax.employeeNumber, wtaxRow, employee.employeeNumber, firstRow.wtax);
    for (const field of ['withholdingTax', 'lwopDays', 'lwopHours', 'lwopMinutes']) {
      const col = map.wtax[field];
      if (col === M.WTAX_DAILY_RATE_COL) continue;
      writeAmount(sheets.wtax, col, wtaxRow, employee[field], firstRow.wtax);
    }

    const payRow = firstRow.pay + i;
    sheets.wtax.setFormula(
      M.WTAX_DAILY_RATE_COL + wtaxRow,
      dailyRateFormula(names.pay, payRow, daysInPeriod),
      M.WTAX_DAILY_RATE_COL + firstRow.wtax,
    );
    for (const [field, col] of Object.entries(map.pay)) {
      writeAmount(sheets.pay, col, payRow, employee[field], firstRow.pay);
    }

    const dedsRow = firstRow.deds + i;
    for (const [field, col] of Object.entries(map.deds)) {
      writeAmount(sheets.deds, col, dedsRow, employee[field], firstRow.deds);
    }
  }

  // Each block has one spare row inside its SUM range beyond the aligned capacity.
  clearRow(sheets.pay, 'pay', firstRow.pay, geometry.capacity, map.owned);
  clearRow(sheets.deds, 'deds', firstRow.deds, geometry.capacity, map.owned);
}

function writePeriodCells(pkg, run, activeDepts) {
  for (const dept of activeDepts) {
    const pay = pkg.sheet(M.sheetNames(dept.key).pay);
    if (run.periodLabel) pay.setText(M.PERIOD_CELLS.payPeriodLabel, run.periodLabel);
    if (run.monthCode) pay.setText(M.PERIOD_CELLS.payMonthCode, run.monthCode);
  }
  if (run.quincena) {
    // Full-workbook exports seed GEN.AD; single-department exports write the
    // quincena onto that department's own PAY sheet instead.
    const quincenaSheet = activeDepts.length === 1
      ? M.sheetNames(activeDepts[0].key).pay
      : M.PERIOD_CELLS.quincenaSheet;
    pkg.sheet(quincenaSheet).setText(M.PERIOD_CELLS.quincenaCell, run.quincena);
  }
  const summary = pkg.sheet('SUMMARY');
  if (run.periodShort) summary.setText('B2', run.periodShort);
  if (run.payrollNoSeed) summary.setText('B8', run.payrollNoSeed);
}

/** Amount columns on SUMMARY department rows (serial B and title C stay put). */
const SUMMARY_AMOUNT_COLS = (() => {
  const cols = [];
  const start = 'D'.charCodeAt(0);
  for (let code = start; code <= 'Z'.charCodeAt(0); code += 1) {
    cols.push(String.fromCharCode(code));
  }
  for (const first of ['A']) {
    for (let second = 'A'.charCodeAt(0); second <= 'T'.charCodeAt(0); second += 1) {
      cols.push(first + String.fromCharCode(second));
    }
  }
  return cols;
})();

/**
 * Other-department SUMMARY rows would otherwise keep live sheet refs (or #REF!
 * if those sheets were removed). Replace every amount cell with "-" so empty
 * lines match the printed payroll style.
 */
function blankInactiveSummaryRows(pkg, onlyDepartmentKey) {
  const summary = pkg.sheet('SUMMARY');
  for (const dept of M.DEPARTMENTS) {
    if (dept.key === onlyDepartmentKey) continue;
    const row = dept.summaryRow;
    for (const col of SUMMARY_AMOUNT_COLS) {
      const ref = col + row;
      summary.setText(ref, '-', ref);
    }
  }
}

/**
 * @param {import('./contract').Appendix33Run} run
 * @param {{templatePath?: string, onlyDepartmentKey?: string|null}} [options]
 * @returns {Buffer} the filled .xlsm
 */
function fillAppendix33(run, options = {}) {
  const templatePath = options.templatePath || getActiveTemplatePath();
  const onlyDepartmentKey = options.onlyDepartmentKey
    ? String(options.onlyDepartmentKey).trim()
    : '';
  const departments = run.departments || {};
  const layout = loadLayout();
  const map = getResolved();

  const activeDepts = onlyDepartmentKey
    ? M.DEPARTMENTS.filter((dept) => dept.key === onlyDepartmentKey)
    : M.DEPARTMENTS;

  if (onlyDepartmentKey && !activeDepts.length) {
    throw new Appendix33MappingError([{ department: onlyDepartmentKey, count: 0 }]);
  }

  const unmapped = Object.keys(departments)
    .filter((key) => !layout.departments[key])
    .map((key) => ({ department: key, count: departments[key].length }));
  if (unmapped.length) throw new Appendix33MappingError(unmapped);

  const overflows = activeDepts
    .map((dept) => ({
      department: dept.key,
      needed: (departments[dept.key] || []).length,
      capacity: layout.departments[dept.key].capacity,
    }))
    .filter((o) => o.needed > o.capacity);
  if (overflows.length) throw new Appendix33CapacityError(overflows);

  const pkg = XlsmPackage.load(fs.readFileSync(templatePath));

  // Expand shared formulas and drop every cached result across the whole workbook, so
  // no figure from a previous period can be printed before Excel recalculates.
  for (const name of pkg.sheetNames()) pkg.sheet(name).normalizeFormulas();

  // Always walk every department block: the selected one gets employees, the rest
  // are cleared so hidden sheets never keep leftover template sample rows.
  for (const dept of M.DEPARTMENTS) {
    const employees = activeDepts.some((d) => d.key === dept.key)
      ? (departments[dept.key] || [])
      : [];
    fillDepartment(pkg, dept, employees, layout, map, run.daysInPeriod);
  }
  writePeriodCells(pkg, run, activeDepts);

  // Single-department downloads: only four tabs visible, and other SUMMARY rows
  // show "-" instead of live cross-sheet formulas / #REF!.
  if (onlyDepartmentKey) {
    blankInactiveSummaryRows(pkg, onlyDepartmentKey);
    const names = M.sheetNames(onlyDepartmentKey);
    pkg.showOnlySheets(['SUMMARY', names.wtax, names.pay, names.deds]);
  }

  pkg.setFullCalcOnLoad();

  return pkg.toBuffer();
}

/** "For the period JANUARY 1-31, 2026" and its short form for the SUMMARY sheet. */
function periodLabels(month, year) {
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const short = `${MONTH_NAMES[Number(month) - 1]} 1-${lastDay}, ${year}`;
  return {
    periodShort: short,
    periodLabel: `For the period ${short}`,
    daysInPeriod: lastDay,
  };
}

module.exports = {
  fillAppendix33,
  periodLabels,
  Appendix33CapacityError,
  Appendix33MappingError,
  TEMPLATE_PATH,
  MONTH_NAMES,
};
