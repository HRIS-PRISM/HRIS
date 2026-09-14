/**
 * Reads the Appendix 33 master workbook and regenerates layout.json.
 *
 * Run this after any change to backend/templates/EARIST_Appendix33.xlsm and commit the
 * refreshed layout.json alongside it:
 *
 *   node backend/scripts/inspectAppendix33.js
 *   node backend/scripts/inspectAppendix33.js --check   # verify only, non-zero on drift
 *
 * As well as recording capacity and subtotal rows, this validates the assumptions the
 * export relies on: the three sheets of a block stay row-aligned, SUMMARY points at the
 * subtotal rows, and appendix33Map's column lists actually cover every formula cell in
 * the employee area.
 */

const fs = require('fs');
const path = require('path');
const { XlsmPackage } = require('../services/payrollTemplate/xlsmPatcher');
const { colToIndex } = require('../services/payrollTemplate/formulaTranslate');
const M = require('../services/payrollTemplate/appendix33Map');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'EARIST_Appendix33.xlsm');
const LAYOUT_PATH = path.join(__dirname, '..', 'services', 'payrollTemplate', 'layout.json');

/** Finds the subtotal row: the first cell in `col` whose formula sums from `firstRow`. */
function findSubtotalRow(sheet, col, firstRow) {
  const needle = `SUM(${col}${firstRow}:`;
  for (let r = firstRow; r <= firstRow + 600; r++) {
    const f = sheet.formulaAt(`${col}${r}`);
    if (f && f.startsWith(needle)) return r;
  }
  throw new Error(`${sheet.name}: no subtotal row with ${needle}`);
}

function buildLayout(pkg, problems) {
  const departments = {};

  for (const dept of M.DEPARTMENTS) {
    const names = M.sheetNames(dept.key);
    const wtax = pkg.sheet(names.wtax);
    const pay = pkg.sheet(names.pay);
    const deds = pkg.sheet(names.deds);

    const wtaxSubtotal = findSubtotalRow(wtax, 'F', M.WTAX_FIRST_ROW);
    const paySubtotal = findSubtotalRow(pay, 'F', M.PAY_FIRST_ROW);
    const dedsSubtotal = findSubtotalRow(deds, 'F', M.DEDS_FIRST_ROW);
    const capacity = wtaxSubtotal - M.WTAX_FIRST_ROW;

    if (paySubtotal !== wtaxSubtotal + 14) {
      problems.push(`${dept.key}: PAY subtotal ${paySubtotal}, expected ${wtaxSubtotal + 14}`);
    }
    if (dedsSubtotal !== wtaxSubtotal + 13) {
      problems.push(`${dept.key}: DEDS subtotal ${dedsSubtotal}, expected ${wtaxSubtotal + 13}`);
    }

    // SUMMARY must read this department's subtotal rows.
    const summary = pkg.sheet('SUMMARY');
    const grossRef = summary.formulaAt(`D${dept.summaryRow}`);
    const wantGross = `'${names.pay}'!I${paySubtotal}`;
    if (grossRef !== wantGross) {
      problems.push(`${dept.key}: SUMMARY!D${dept.summaryRow} is ${grossRef}, expected ${wantGross}`);
    }
    const gsisRef = summary.formulaAt(`H${dept.summaryRow}`);
    const wantGsis = `'${names.deds}'!G${dedsSubtotal}`;
    if (gsisRef !== wantGsis) {
      problems.push(`${dept.key}: SUMMARY!H${dept.summaryRow} is ${gsisRef}, expected ${wantGsis}`);
    }

    const title = summary.cell(`C${dept.summaryRow}`);
    const titleText = title ? (/<t[^>]*>([\s\S]*?)<\/t>/.exec(title.inner) || [, null])[1] : null;
    if (titleText && titleText !== dept.title) {
      problems.push(`${dept.key}: SUMMARY!C${dept.summaryRow} reads "${titleText}", map says "${dept.title}"`);
    }

    checkColumnCoverage(wtax, 'wtax', M.WTAX_FIRST_ROW, capacity, M.WTAX_INPUT_COLS, problems, dept.key);
    checkColumnCoverage(pay, 'pay', M.PAY_FIRST_ROW, capacity, M.PAY_INPUT_COLS, problems, dept.key);
    checkColumnCoverage(deds, 'deds', M.DEDS_FIRST_ROW, capacity, M.DEDS_INPUT_COLS, problems, dept.key);

    checkPatternRows(wtax, 'wtax', M.WTAX_FIRST_ROW, problems, dept.key);
    checkPatternRows(pay, 'pay', M.PAY_FIRST_ROW, problems, dept.key);
    checkPatternRows(deds, 'deds', M.DEDS_FIRST_ROW, problems, dept.key);

    departments[dept.key] = {
      capacity,
      wtaxSubtotal,
      paySubtotal,
      dedsSubtotal,
      summaryRow: dept.summaryRow,
    };
  }

  return departments;
}

/**
 * Every formula cell in the employee area must be a column the export stamps, and no
 * input column may carry a formula. If either is violated the export would leave a
 * stale or broken cell behind.
 */
/**
 * Row 1 and row 2 of a block are the formula pattern the filler stamps down.
 * Every FORMULA_COLS cell on those two rows must carry a formula; a gap here
 * would leave later employee rows without that computation.
 */
function checkPatternRows(sheet, kind, firstRow, problems, deptKey) {
  const fallback = M.firstRowFormulas(deptKey)[kind] || {};
  for (const col of M.FORMULA_COLS[kind]) {
    for (const off of [0, 1]) {
      const ref = col + (firstRow + off);
      if (sheet.formulaAt(ref) === null && !fallback[col]) {
        problems.push(`${deptKey} ${kind}: pattern cell ${ref} has no formula`);
      }
    }
  }
}

function checkColumnCoverage(sheet, kind, firstRow, capacity, inputCols, problems, deptKey) {
  const stamped = new Set(M.FORMULA_COLS[kind].map(colToIndex));
  const chained = new Set(M.CHAINED_CONST_COLS[kind].map(colToIndex));
  const inputs = new Set(Object.values(inputCols).map(colToIndex));
  const seenUnknown = new Set();

  for (let i = 0; i < capacity; i++) {
    const row = sheet.row(firstRow + i);
    if (!row) continue;
    for (const cell of row.cells) {
      const hasFormula = cell.formula !== null;
      if (hasFormula && inputs.has(cell.col)) {
        problems.push(`${deptKey} ${kind}: input cell ${cell.ref} carries a formula`);
      }
      if (hasFormula && !stamped.has(cell.col) && !chained.has(cell.col)) {
        const label = `${deptKey} ${kind}: formula in unmapped column ${cell.ref}`;
        if (!seenUnknown.has(cell.col)) { seenUnknown.add(cell.col); problems.push(label); }
      }
    }
  }
}

function inspectAndWriteLayout(templatePath = TEMPLATE_PATH) {
  const pkg = XlsmPackage.load(fs.readFileSync(templatePath));
  const problems = [];
  const departments = buildLayout(pkg, problems);
  const layout = {
    generatedFrom: 'templates/EARIST_Appendix33.xlsm',
    wtaxFirstRow: M.WTAX_FIRST_ROW,
    payFirstRow: M.PAY_FIRST_ROW,
    dedsFirstRow: M.DEDS_FIRST_ROW,
    totalCapacity: Object.values(departments).reduce((a, d) => a + d.capacity, 0),
    departments,
  };
  if (problems.length) {
    const err = new Error(problems.join('; '));
    err.problems = problems;
    err.layout = layout;
    throw err;
  }
  fs.writeFileSync(LAYOUT_PATH, JSON.stringify(layout, null, 2) + '\n');
  return layout;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const pkg = XlsmPackage.load(fs.readFileSync(TEMPLATE_PATH));

  const problems = [];
  const departments = buildLayout(pkg, problems);

  const layout = {
    generatedFrom: 'templates/EARIST_Appendix33.xlsm',
    wtaxFirstRow: M.WTAX_FIRST_ROW,
    payFirstRow: M.PAY_FIRST_ROW,
    dedsFirstRow: M.DEDS_FIRST_ROW,
    totalCapacity: Object.values(departments).reduce((a, d) => a + d.capacity, 0),
    departments,
  };

  for (const [key, d] of Object.entries(departments)) {
    console.log(`${key.padEnd(12)} capacity ${String(d.capacity).padStart(3)}  subtotals W${d.wtaxSubtotal} P${d.paySubtotal} D${d.dedsSubtotal}`);
  }
  console.log(`total capacity ${layout.totalCapacity}`);

  if (problems.length) {
    console.error('\nPROBLEMS:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  const serialised = JSON.stringify(layout, null, 2) + '\n';
  if (checkOnly) {
    const current = fs.existsSync(LAYOUT_PATH) ? fs.readFileSync(LAYOUT_PATH, 'utf8') : '';
    if (current !== serialised) {
      console.error('\nlayout.json is out of date; re-run without --check');
      process.exit(1);
    }
    console.log('\nlayout.json matches the master');
    return;
  }

  fs.writeFileSync(LAYOUT_PATH, serialised);
  console.log(`\nwrote ${path.relative(path.join(__dirname, '..'), LAYOUT_PATH)}`);
}

if (require.main === module) main();

module.exports = { inspectAndWriteLayout, TEMPLATE_PATH, LAYOUT_PATH };
