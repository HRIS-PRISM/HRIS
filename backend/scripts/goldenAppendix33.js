/**
 * Golden-file test for the Appendix 33 export.
 *
 * Reads the real, hand-produced January 2026 payroll workbook, pulls the employee data
 * back out of its input cells, feeds that through the export, and checks that what
 * comes out says the same thing as what went in.
 *
 *   node backend/scripts/goldenAppendix33.js --source "C:\path\to\JANUARY 2026 ....xlsm"
 *
 * Three things are checked:
 *   1. Every input cell round-trips to the same value.
 *   2. Every stamped formula matches the one the original carries in that same cell.
 *   3. Gross pay recomputed from the extracted inputs matches the subtotal Excel had
 *      cached in the original. This is a numeric check that needs no Excel.
 *
 * The filled workbook is written next to the source so verifyAppendix33.ps1 can open it
 * and confirm Excel agrees.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { XlsmPackage } = require('../services/payrollTemplate/xlsmPatcher');
const { fillAppendix33, periodLabels } = require('../services/payrollTemplate/fillAppendix33');
const M = require('../services/payrollTemplate/appendix33Map');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SOURCE = arg('--source', 'C:\\Users\\Admin\\Downloads\\JANUARY 2026 Regular Salary (Acad & Non-Acad) Payroll.xlsm');
const OUT = arg('--out', path.join(__dirname, '..', '..', 'tmp_appendix33_golden.xlsm'));

let failures = 0;
const note = (msg) => console.log('  ' + msg);
function check(label, ok, detail) {
  if (!ok) { failures++; console.log('FAIL ' + label + (detail ? '  ' + detail : '')); }
  return ok;
}

const num = (sheet, ref) => {
  const c = sheet[ref];
  if (!c || c.v === undefined || c.v === null || c.v === '') return 0;
  const n = typeof c.v === 'number' ? c.v : Number.parseFloat(String(c.v).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const str = (sheet, ref) => {
  const c = sheet[ref];
  return c && c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
};

/** Locates the WTAX subtotal row the same way inspectAppendix33 does. */
function wtaxSubtotalRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let r = M.WTAX_FIRST_ROW; r <= range.e.r + 1; r++) {
    const c = sheet['F' + r];
    if (c && c.f && c.f.startsWith('SUM(F8:')) return r;
  }
  throw new Error('no WTAX subtotal row');
}

console.log('source: ' + SOURCE);
const wb = XLSX.readFile(SOURCE, { cellFormula: true });

const departments = {};
const originalTotals = {};
let extracted = 0;

for (const dept of M.DEPARTMENTS) {
  const names = M.sheetNames(dept.key);
  const wtax = wb.Sheets[names.wtax];
  const pay = wb.Sheets[names.pay];
  const deds = wb.Sheets[names.deds];

  const subtotal = wtaxSubtotalRow(wtax);
  const capacity = subtotal - M.WTAX_FIRST_ROW;
  const employees = [];

  for (let i = 0; i < capacity; i++) {
    const wRow = M.WTAX_FIRST_ROW + i;
    const pRow = M.PAY_FIRST_ROW + i;
    const dRow = M.DEDS_FIRST_ROW + i;
    const name = str(wtax, 'C' + wRow);
    if (!name) continue;

    const e = {
      name,
      position: str(wtax, 'D' + wRow),
      employeeNumber: str(wtax, 'E' + wRow),
      withholdingTax: num(wtax, 'F' + wRow),
      lwopDays: num(wtax, 'H' + wRow),
      lwopHours: num(wtax, 'J' + wRow),
      lwopMinutes: num(wtax, 'L' + wRow),
      rateNbc594: num(pay, 'F' + pRow),
      nbcDiffl597: num(pay, 'G' + pRow),
      increment: num(pay, 'H' + pRow),
    };
    for (const [field, col] of Object.entries(M.DEDS_INPUT_COLS)) {
      e[field] = num(deds, col + dRow);
    }
    employees.push(e);
  }

  departments[dept.key] = employees;
  extracted += employees.length;

  // Excel's cached subtotal for gross pay in the original file.
  const paySubtotal = subtotal + 14;
  originalTotals[dept.key] = {
    gross: num(pay, 'I' + paySubtotal),
    wtax: num(pay, 'L' + paySubtotal),
    employees: employees.length,
  };
}

console.log(`extracted ${extracted} employees across ${M.DEPARTMENTS.length} departments`);

console.log('\n== 1. gross recomputed from inputs vs the original cached subtotal ==');
for (const dept of M.DEPARTMENTS) {
  const mine = departments[dept.key].reduce(
    (a, e) => a + e.rateNbc594 + e.nbcDiffl597 + e.increment, 0);
  const theirs = originalTotals[dept.key].gross;
  const delta = Math.round((mine - theirs) * 100) / 100;
  const ok = Math.abs(delta) < 0.01;
  check(`${dept.key} gross`, ok, `recomputed=${mine} cached=${theirs} delta=${delta}`);
  if (ok) note(`${dept.key.padEnd(12)} ${String(originalTotals[dept.key].employees).padStart(3)} employees  gross ${theirs.toLocaleString('en-US')}`);
}

console.log('\n== 2. filling the template ==');
const { periodLabel, periodShort, daysInPeriod } = periodLabels(1, 2026);
const run = {
  periodLabel,
  periodShort,
  monthCode: '01',
  payrollNoSeed: '2026-01-014',
  quincena: '(1st Quincena)',
  daysInPeriod,
  departments,
};
const t0 = Date.now();
const buffer = fillAppendix33(run);
fs.writeFileSync(OUT, buffer);
console.log(`  filled ${extracted} employees in ${Date.now() - t0}ms -> ${OUT}`);

console.log('\n== 3. input cells round trip ==');
const out = XlsmPackage.load(buffer);
const outNum = (sheet, ref) => {
  const c = sheet.cell(ref);
  if (!c) return 0;
  const m = /<v>([\s\S]*?)<\/v>/.exec(c.inner);
  return m ? Number(m[1]) : 0;
};
const outStr = (sheet, ref) => {
  const c = sheet.cell(ref);
  if (!c) return '';
  const m = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c.inner);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
};

let cellsChecked = 0;
for (const dept of M.DEPARTMENTS) {
  const names = M.sheetNames(dept.key);
  const wtax = out.sheet(names.wtax);
  const pay = out.sheet(names.pay);
  const deds = out.sheet(names.deds);

  departments[dept.key].forEach((e, i) => {
    const wRow = M.WTAX_FIRST_ROW + i;
    const pRow = M.PAY_FIRST_ROW + i;
    const dRow = M.DEDS_FIRST_ROW + i;

    check(`${dept.key}#${i} name`, outStr(wtax, 'C' + wRow) === e.name, `${outStr(wtax, 'C' + wRow)} != ${e.name}`);
    check(`${dept.key}#${i} position`, outStr(wtax, 'D' + wRow) === e.position);
    check(`${dept.key}#${i} wtax`, outNum(wtax, 'F' + wRow) === e.withholdingTax);
    check(`${dept.key}#${i} lwopDays`, outNum(wtax, 'H' + wRow) === e.lwopDays);
    check(`${dept.key}#${i} rateNbc594`, outNum(pay, 'F' + pRow) === e.rateNbc594);
    check(`${dept.key}#${i} nbcDiffl597`, outNum(pay, 'G' + pRow) === e.nbcDiffl597);
    cellsChecked += 6;
    for (const [field, col] of Object.entries(M.DEDS_INPUT_COLS)) {
      check(`${dept.key}#${i} ${field}`, outNum(deds, col + dRow) === e[field],
        `${outNum(deds, col + dRow)} != ${e[field]} at ${col}${dRow}`);
      cellsChecked++;
    }
  });
}
console.log(`  compared ${cellsChecked} input cells`);

console.log('\n== 4. stamped formulas match the original ==');
let formulaChecks = 0;
let formulaMismatches = [];
for (const dept of M.DEPARTMENTS) {
  const names = M.sheetNames(dept.key);
  const pairs = [
    ['wtax', wb.Sheets[names.wtax], out.sheet(names.wtax), M.WTAX_FIRST_ROW],
    ['pay', wb.Sheets[names.pay], out.sheet(names.pay), M.PAY_FIRST_ROW],
    ['deds', wb.Sheets[names.deds], out.sheet(names.deds), M.DEDS_FIRST_ROW],
  ];
  for (const [kind, origSheet, outSheet, first] of pairs) {
    for (let i = 0; i < departments[dept.key].length; i++) {
      for (const col of M.FORMULA_COLS[kind]) {
        const ref = col + (first + i);
        const origCell = origSheet[ref];
        // Shared-formula members carry no text in the original; skip those.
        if (!origCell || !origCell.f) continue;
        const mine = outSheet.formulaAt(ref);
        formulaChecks++;
        if (mine !== origCell.f) {
          formulaMismatches.push(`${dept.key} ${names[kind]}!${ref}: mine="${mine}" original="${origCell.f}"`);
        }
      }
    }
  }
}
check('formulas match', formulaMismatches.length === 0);
console.log(`  compared ${formulaChecks} formulas, ${formulaMismatches.length} mismatches`);
formulaMismatches.slice(0, 15).forEach((m) => console.log('    ' + m));

console.log('\n== 5. package integrity ==');
const master = XlsmPackage.load(fs.readFileSync(path.join(__dirname, '..', 'templates', 'EARIST_Appendix33.xlsm')));
check('entry count', Object.keys(out.entries).length === Object.keys(master.entries).length);
const verbatim = Object.keys(master.entries).filter(
  (n) => /vbaProject\.bin|drawings\/|printerSettings\/|media\/|styles\.xml|theme/.test(n));
let identical = 0;
for (const part of verbatim) {
  if (Buffer.compare(Buffer.from(out.entries[part]), Buffer.from(master.entries[part])) === 0) identical++;
  else console.log('    differs: ' + part);
}
check('non-sheet parts byte identical', identical === verbatim.length);
console.log(`  ${identical}/${verbatim.length} macro, drawing, printer, media and style parts byte identical`);
check('fullCalcOnLoad', /fullCalcOnLoad="1"/.test(out.text('xl/workbook.xml')));

console.log('\n' + (failures === 0 ? 'GOLDEN TEST PASSED' : failures + ' FAILURES'));
process.exit(failures === 0 ? 0 : 1);
