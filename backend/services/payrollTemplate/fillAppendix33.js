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
function capturePattern(sheet, kind, firstRow, deptKey, shape, dedsVariant) {
  const formulaCols = kind === 'deds'
    ? M.dedsFormulaCols(dedsVariant)
    : M.FORMULA_COLS[kind];
  const cols = [...formulaCols, ...M.CHAINED_CONST_COLS[kind]];
  const fallback = M.firstRowFormulas(deptKey, shape, dedsVariant)[kind] || {};
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

/** Blueprint sheet name -> generated sheet name, for rewriting cross-sheet formulas. */
function sheetRenameMap(fromKey, toKey) {
  const from = M.sheetNames(fromKey);
  const to = M.sheetNames(toKey);
  return { [from.wtax]: to.wtax, [from.pay]: to.pay, [from.deds]: to.deds };
}

function renameSheetRefs(formula, renames) {
  let out = formula;
  const entries = Object.entries(renames).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    if (!from || !to || from === to) continue;
    out = out.split(`'${from}'!`).join(`'${to}'!`);
  }
  for (const [from, to] of entries) {
    if (!from || !to || from === to) continue;
    if (/[\s'![\]]/.test(from)) continue;
    const re = new RegExp(`(^|[^A-Za-z0-9_.'])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}!`, 'g');
    out = out.replace(re, `$1'${to}'!`);
  }
  return out;
}

/**
 * Creates a department's three tabs by copying a blueprint block.
 *
 * This is what lets an admin allow a department the template was never drawn for:
 * the copy carries the blueprint's columns, formulas, styles and merges, and its
 * formulas are repointed at the new trio so the block totals itself.
 */
function generateDepartmentSheets(pkg, key, blueprintKey) {
  const source = M.sheetNames(blueprintKey);
  const target = M.sheetNames(key);
  const renames = sheetRenameMap(blueprintKey, key);
  for (const kind of ['wtax', 'pay', 'deds']) {
    pkg.cloneSheet(source[kind], target[kind], renames);
  }
}

/** Clone the generic WTAX / PAY / DEDS trio into a named department block. */
function generateDepartmentSheetsFromGeneric(pkg, key, source) {
  const target = M.sheetNames(key, M.TEMPLATE_SHAPE_MULTI);
  const renames = { [source.wtax]: target.wtax, [source.pay]: target.pay, [source.deds]: target.deds };
  for (const kind of ['wtax', 'pay', 'deds']) {
    pkg.cloneSheet(source[kind], target[kind], renames);
  }
}

/**
 * The department blocks this run has to touch: the template's own 13, plus one
 * entry per generated department. Generated blocks borrow their blueprint's
 * geometry, because they are a byte-for-byte copy of it.
 */
function describeDepartments(layout, blueprints) {
  const all = M.DEPARTMENTS.map((dept) => ({
    ...dept,
    blueprintKey: null,
    geometry: layout.departments[dept.key],
  }));
  for (const [key, blueprintKey] of Object.entries(blueprints || {})) {
    if (all.some((d) => d.key === key)) continue;
    const geometry = layout.departments[blueprintKey];
    if (!geometry) continue;
    all.push({ key, title: key, summaryRow: null, blueprintKey, geometry });
  }
  return all;
}

function applyDedsLayout(map, pkg, dedsSheetName) {
  const sheet = pkg.sheet(dedsSheetName);
  const variant = M.detectDedsVariant(sheet);
  const deds = M.dedsInputCols(variant);
  const formulaCols = M.dedsFormulaCols(variant);
  map.dedsVariant = variant;
  map.deds = deds;
  map.owned = {
    ...map.owned,
    deds: [...new Set([...formulaCols, ...Object.values(deds)])],
  };
  return map;
}

function fillDepartment(pkg, dept, employees, layout, map, daysInPeriod, shape, blueprintSheets, titles) {
  const names = M.sheetNames(dept.key, shape, blueprintSheets);
  const geometry = dept.geometry || layout.departments[dept.key];
  const sheets = {
    wtax: pkg.sheet(names.wtax),
    pay: pkg.sheet(names.pay),
    deds: pkg.sheet(names.deds),
  };
  writeBlockHeadings(sheets, dept.key, titles);
  const firstRow = map.firstRows;
  const dedsVariant = map.dedsVariant || M.detectDedsVariant(sheets.deds);

  const patterns = {
    wtax: capturePattern(sheets.wtax, 'wtax', firstRow.wtax, dept.key, shape, dedsVariant),
    pay: capturePattern(sheets.pay, 'pay', firstRow.pay, dept.key, shape, dedsVariant),
    deds: capturePattern(sheets.deds, 'deds', firstRow.deds, dept.key, shape, dedsVariant),
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

function writePeriodCells(pkg, run, activeDepts, shape, blueprintSheets) {
  for (const dept of activeDepts) {
    const pay = pkg.sheet(M.sheetNames(dept.key, shape, blueprintSheets).pay);
    if (run.periodLabel) pay.setText(M.PERIOD_CELLS.payPeriodLabel, run.periodLabel);
    if (run.monthCode) pay.setText(M.PERIOD_CELLS.payMonthCode, run.monthCode);
  }
    if (run.quincena) {
    const preferred = (shape === M.TEMPLATE_SHAPE_GENERIC || activeDepts.length === 1)
      ? M.sheetNames(activeDepts[0].key, shape, blueprintSheets).pay
      : M.PERIOD_CELLS.quincenaSheet;
    if (pkg.sheetPaths.has(preferred)) {
      pkg.sheet(preferred).setText(M.PERIOD_CELLS.quincenaCell, run.quincena);
    } else {
      for (const dept of activeDepts) {
        pkg.sheet(M.sheetNames(dept.key, shape, blueprintSheets).pay)
          .setText(M.PERIOD_CELLS.quincenaCell, run.quincena);
      }
    }
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
 * Gives a generated department a SUMMARY line by taking over its blueprint's row.
 *
 * SUMMARY has exactly 13 hand-drawn department rows, so a generated block cannot
 * get one of its own. On a single-department download every other row is blanked
 * anyway, which frees the blueprint's row to be repointed at the generated tabs.
 */
function pointSummaryRowAt(pkg, dept, title) {
  const summary = pkg.sheet('SUMMARY');
  const blueprint = M.DEPARTMENTS.find((d) => d.key === dept.blueprintKey);
  if (!blueprint) return;

  const row = blueprint.summaryRow;
  const captured = {};
  for (const col of SUMMARY_AMOUNT_COLS) captured[col] = summary.formulaAt(col + row);

  blankInactiveSummaryRows(pkg, null);

  const renames = sheetRenameMap(dept.blueprintKey, dept.key);
  for (const [col, formula] of Object.entries(captured)) {
    if (formula === null) continue;
    summary.setFormula(col + row, renameSheetRefs(formula, renames));
  }
  summary.setText(`C${row}`, title || dept.key);
}

function flattenEmployees(departments) {
  const out = [];
  for (const list of Object.values(departments || {})) {
    if (Array.isArray(list)) out.push(...list);
  }
  return out;
}

/**
 * @param {import('./contract').Appendix33Run} run
 * @param {{templatePath?: string, onlyDepartmentKey?: string|null,
 *          onlyDepartmentTitle?: string, blueprints?: Object.<string,string>}} [options]
 *        `blueprints` maps a department key the template has no tabs for to the block
 *        whose three sheets should be copied for it.
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
  const pkg = XlsmPackage.load(fs.readFileSync(templatePath));
  const blueprint = M.resolveBlueprintSheets(pkg.sheetNames());
  const shape = blueprint?.shape
    || (layout.shape === M.TEMPLATE_SHAPE_GENERIC ? M.TEMPLATE_SHAPE_GENERIC : M.TEMPLATE_SHAPE_MULTI);

  if (shape === M.TEMPLATE_SHAPE_GENERIC) {
    const genericSheets = blueprint?.sheets || layout.genericSheets || M.GENERIC_SHEETS;
    applyDedsLayout(map, pkg, genericSheets.deds);
    return fillGenericAppendix33(run, options, layout, map, pkg, genericSheets);
  }

  applyDedsLayout(map, pkg, M.sheetNames('GEN.AD').deds);

  const blueprints = {};
  for (const [key, blueprintKey] of Object.entries(options.blueprints || {})) {
    if (layout.departments[blueprintKey]) blueprints[key] = blueprintKey;
  }

  const allDepts = describeDepartments(layout, blueprints);
  const activeDepts = onlyDepartmentKey
    ? allDepts.filter((dept) => dept.key === onlyDepartmentKey)
    : allDepts;

  if (onlyDepartmentKey && !activeDepts.length) {
    throw new Appendix33MappingError([{ department: onlyDepartmentKey, count: 0 }]);
  }

  const unmapped = Object.keys(departments)
    .filter((key) => !allDepts.some((dept) => dept.key === key))
    .map((key) => ({ department: key, count: departments[key].length }));
  if (unmapped.length) throw new Appendix33MappingError(unmapped);

  const overflows = activeDepts
    .map((dept) => ({
      department: dept.key,
      needed: (departments[dept.key] || []).length,
      capacity: dept.geometry.capacity,
    }))
    .filter((o) => o.needed > o.capacity);
  if (overflows.length) throw new Appendix33CapacityError(overflows);

  // Copy the blueprint trio for every generated department before anything else is
  // parsed or filled, so the new tabs behave like template ones from here on.
  for (const dept of activeDepts) {
    if (dept.blueprintKey) generateDepartmentSheets(pkg, dept.key, dept.blueprintKey);
  }

  // Expand shared formulas and drop every cached result across the whole workbook, so
  // no figure from a previous period can be printed before Excel recalculates.
  for (const name of pkg.sheetNames()) pkg.sheet(name).normalizeFormulas();

  const titles = resolveHeadingTitles(options, onlyDepartmentKey);

  // Always walk every department block: the selected one gets employees, the rest
  // are cleared so hidden sheets never keep leftover template sample rows.
  for (const dept of allDepts) {
    const isActive = activeDepts.some((d) => d.key === dept.key);
    if (!isActive && dept.blueprintKey) continue; // its tabs were never created
    const employees = isActive ? (departments[dept.key] || []) : [];
    fillDepartment(pkg, dept, employees, layout, map, run.daysInPeriod, shape, undefined, titles);
  }
  writePeriodCells(pkg, run, activeDepts, shape);

  // Single-department downloads: only four tabs visible, and other SUMMARY rows
  // show "-" instead of live cross-sheet formulas / #REF!.
  if (onlyDepartmentKey) {
    const dept = activeDepts[0];
    if (dept.blueprintKey) pointSummaryRowAt(pkg, dept, titles[onlyDepartmentKey] || options.onlyDepartmentTitle);
    else blankInactiveSummaryRows(pkg, onlyDepartmentKey);
    const names = M.sheetNames(onlyDepartmentKey, shape);
    pkg.showOnlySheets(['SUMMARY', names.wtax, names.pay, names.deds]);
  }

  pkg.setFullCalcOnLoad();

  return pkg.toBuffer();
}

function findSubtotalRow(sheet, col, firstRow) {
  const needle = `SUM(${col}${firstRow}:`;
  for (let r = firstRow; r <= firstRow + 600; r++) {
    const f = sheet.formulaAt(`${col}${r}`);
    if (f && f.startsWith(needle)) return r;
  }
  throw new Appendix33MappingError([{ department: sheet.name, count: 0 }]);
}

function genericGeometry(pkg, layout, sheets) {
  const stored = layout.departments[M.GENERIC_KEY];
  if (stored) return stored;
  const wtaxSubtotal = findSubtotalRow(pkg.sheet(sheets.wtax), 'F', M.WTAX_FIRST_ROW);
  const paySubtotal = findSubtotalRow(pkg.sheet(sheets.pay), 'F', M.PAY_FIRST_ROW);
  const dedsSubtotal = findSubtotalRow(pkg.sheet(sheets.deds), 'F', M.DEDS_FIRST_ROW);
  return {
    capacity: wtaxSubtotal - M.WTAX_FIRST_ROW,
    wtaxSubtotal,
    paySubtotal,
    dedsSubtotal,
    summaryRow: 8,
  };
}

function departmentTitle(key, titles) {
  if (titles && titles[key]) return titles[key];
  const known = M.DEPARTMENTS.find((d) => d.key === key);
  return known ? known.title : String(key).toUpperCase();
}

function payDedsBanner(key, titles) {
  const title = departmentTitle(key, titles);
  if (key === 'TEMPO' || key === 'CONTRACTUAL') return title;
  return `Regular Employees - ${title}`;
}

function writeBlockHeadings(sheets, key, titles) {
  const name = departmentTitle(key, titles);
  const banner = payDedsBanner(key, titles);
  sheets.wtax.setText(M.TITLE_CELLS.wtax, name, M.TITLE_CELLS.wtax);
  sheets.pay.setText(M.TITLE_CELLS.pay, banner, M.TITLE_CELLS.pay);
  sheets.deds.setText(M.TITLE_CELLS.deds, banner, M.TITLE_CELLS.deds);
}

function resolveHeadingTitles(options, onlyDepartmentKey) {
  const titles = {};
  for (const dept of M.DEPARTMENTS) titles[dept.key] = dept.title;
  Object.assign(titles, options.departmentTitles || {});
  if (onlyDepartmentKey && options.onlyDepartmentTitle) {
    titles[onlyDepartmentKey] = options.onlyDepartmentTitle;
  }
  return titles;
}

function genericBlocksWithData(run) {
  const keys = Object.keys(run.departments || {})
    .filter((key) => key !== M.GENERIC_KEY && (run.departments[key] || []).length > 0);
  const known = M.DEPARTMENT_KEYS.filter((key) => keys.includes(key));
  const extra = keys.filter((key) => !M.DEPARTMENT_KEYS.includes(key)).sort();
  return [...known, ...extra];
}

function genericSummaryRenames(key, source) {
  const target = M.sheetNames(key, M.TEMPLATE_SHAPE_MULTI);
  const fromBlueprint = source
    ? { [source.wtax]: target.wtax, [source.pay]: target.pay, [source.deds]: target.deds }
    : {};
  return {
    WTAX: target.wtax,
    PAY: target.pay,
    DEDS: target.deds,
    ...sheetRenameMap('GEN.AD', key),
    ...fromBlueprint,
  };
}

function findSummaryTotalRow(sheet, startRow) {
  for (let r = startRow + 1; r <= startRow + 80; r++) {
    for (const col of ['D', 'E', 'F', 'G', 'H']) {
      const f = sheet.formulaAt(col + r);
      if (f && /^SUM\([A-Z]+\d+:[A-Z]+\d+\)$/i.test(f.replace(/\s/g, ''))) return r;
    }
  }
  return null;
}

function retargetSummaryTotals(sheet, firstDeptRow, lastDeptRow, totalRow) {
  const row = sheet.row(totalRow);
  if (!row) return;
  for (const cell of row.cells) {
    const f = cell.formula;
    if (!f || !/SUM\(/i.test(f)) continue;
    const next = f.replace(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/gi, (full, c1, r1, c2) => {
      if (Number(r1) === firstDeptRow) return `SUM(${c1}${firstDeptRow}:${c2}${lastDeptRow})`;
      return full;
    });
    if (next !== f) cell.setFormula(next);
  }
}

/**
 * SUMMARY still has Housing then Others with no GSL/GBK columns. After those two
 * were inserted on DEDS, the GSIS-loans subtotal in V would miss them unless we
 * add DEDS Q and R (the new columns) onto that SUM.
 */
function includeWideGsisLoansOnSummaryRow(summary, row, dedsSubtotal) {
  const housing = summary.formulaAt(`T${row}`) || '';
  const others = summary.formulaAt(`U${row}`) || '';
  const loans = summary.formulaAt(`V${row}`) || '';
  if (!housing || !loans) return;
  if (!/!P\d+/i.test(housing)) return;
  // Wide DEDS puts GSIS others at S (GSL/GBK occupy Q/R). Classic others is Q.
  if (!/!S\d+/i.test(others)) return;
  if (/!Q\d+/i.test(loans)) return;
  const sheetRef = (housing.match(/('[^']+'|[A-Za-z0-9_.]+)(!P\d+)/i) || [])[1];
  if (!sheetRef) return;
  const n = Number(dedsSubtotal);
  if (!n) return;
  summary.setFormula(`V${row}`, `${loans}+${sheetRef}!Q${n}+${sheetRef}!R${n}`);
}

/**
 * Writes one SUMMARY department line per cloned block, matching the original
 * 13-row layout: title in C, amount formulas pointing at that block's PAY/DEDS,
 * payroll numbers chained from B8. Unused leftover lines become "-". Extra
 * departments insert rows above the existing SUM total so that total still adds
 * every department.
 */
function expandGenericSummary(pkg, keys, geometry, titles, sourceSheets) {
  const summary = pkg.sheet('SUMMARY');
  const firstRow = geometry.summaryRow || 8;
  if (!summary.row(firstRow)) return;

  const needed = keys.length;
  let totalRow = findSummaryTotalRow(summary, firstRow);
  const lastNeeded = firstRow + needed - 1;
  if (totalRow && lastNeeded >= totalRow) {
    const insert = lastNeeded - totalRow + 1;
    summary.shiftRowsFrom(totalRow, insert);
    totalRow += insert;
  }

  // Duplicate the original department line first, then remap each copy so later
  // rows are not cloned from an already-rewritten first row.
  for (let i = 1; i < needed; i++) {
    const row = firstRow + i;
    summary.copyRow(firstRow, row);
    summary.addHorizontalMergesFromRow(firstRow, row);
  }

  for (let i = 0; i < needed; i++) {
    const row = firstRow + i;
    const key = keys[i];
    const renames = genericSummaryRenames(key, sourceSheets);
    const live = summary.row(row);
    if (live) {
      for (const cell of live.cells) {
        const f = cell.formula;
        if (f) cell.setFormula(renameSheetRefs(f, renames));
      }
    }
    includeWideGsisLoansOnSummaryRow(summary, row, geometry.dedsSubtotal);
    summary.setText(`C${row}`, departmentTitle(key, titles), `C${firstRow}`);
    if (i > 0) {
      const prev = firstRow + i - 1;
      summary.setFormula(
        `B${row}`,
        `LEFT(B${prev},8) & TEXT(RIGHT(B${prev},3) + 1,"000")`,
        `B${firstRow}`,
      );
    }
  }

  if (totalRow) {
    for (let row = lastNeeded + 1; row < totalRow; row++) {
      for (const col of SUMMARY_AMOUNT_COLS) {
        summary.setText(`${col}${row}`, '-', `${col}${firstRow}`);
      }
    }
    retargetSummaryTotals(summary, firstRow, lastNeeded, totalRow);
  }
}

/**
 * One WTAX / PAY / DEDS trio is filled in place for a single department, or
 * cloned into a named trio per department when the download is for all of them.
 */
function fillGenericAppendix33(run, options, layout, map, pkg, blueprintSheets) {
  const sheets = blueprintSheets || M.GENERIC_SHEETS;
  const geometry = genericGeometry(pkg, layout, sheets);
  const onlyDepartmentKey = options.onlyDepartmentKey
    ? String(options.onlyDepartmentKey).trim()
    : '';

  // Always clone named tabs (WTAX-CCJE, …) so a department download is not left
  // sitting on the blueprint's GEN.AD / WTAX names.
  return fillGenericAllDepartments(run, options, layout, map, pkg, geometry, sheets, onlyDepartmentKey);
}

function fillGenericAllDepartments(run, options, layout, map, pkg, geometry, sheets, onlyDepartmentKey) {
  let keys = genericBlocksWithData(run);
  if (onlyDepartmentKey) {
    keys = [onlyDepartmentKey];
    if (!(run.departments[onlyDepartmentKey] || []).length) {
      run.departments[onlyDepartmentKey] = flattenEmployees(run.departments);
    }
  }
  if (!keys.length) {
    throw new Appendix33MappingError([{ department: '(none)', count: 0 }]);
  }

  const overflows = keys
    .map((key) => ({
      department: key,
      needed: (run.departments[key] || []).length,
      capacity: geometry.capacity,
    }))
    .filter((o) => o.needed > o.capacity);
  if (overflows.length) throw new Appendix33CapacityError(overflows);

  for (const key of keys) generateDepartmentSheetsFromGeneric(pkg, key, sheets);

  for (const name of pkg.sheetNames()) pkg.sheet(name).normalizeFormulas();

  const activeDepts = keys.map((key) => ({ key, geometry, blueprintKey: null }));
  const titles = resolveHeadingTitles(options, onlyDepartmentKey);
  for (const dept of activeDepts) {
    fillDepartment(
      pkg,
      dept,
      run.departments[dept.key] || [],
      layout,
      map,
      run.daysInPeriod,
      M.TEMPLATE_SHAPE_MULTI,
      undefined,
      titles,
    );
  }
  writePeriodCells(pkg, run, activeDepts, M.TEMPLATE_SHAPE_MULTI);
  expandGenericSummary(pkg, keys, geometry, titles, sheets);

  const visible = ['SUMMARY'];
  for (const key of keys) {
    const names = M.sheetNames(key, M.TEMPLATE_SHAPE_MULTI);
    visible.push(names.wtax, names.pay, names.deds);
  }
  pkg.showOnlySheets(visible);
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
