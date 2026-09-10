const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { XlsmPackage } = require('../services/payrollTemplate/xlsmPatcher');

const masterPath = path.join(__dirname, '..', 'templates', 'EARIST_Appendix33.xlsm');
const pkg = XlsmPackage.load(fs.readFileSync(masterPath));

for (const dept of ['PE', 'TEMPO', 'AUX', 'RESEARCH', 'CONTRACTUAL']) {
  const s = pkg.sheet(`${dept} - PAY`);
  const raw = [];
  for (const r of [21, 22, 23, 24]) {
    const c = s.cell('C' + r);
    raw.push(`C${r}: ` + (c ? c.toXml() : '(absent)'));
  }
  console.log(`--- MASTER ${dept} - PAY (pre-normalize) ---`);
  raw.forEach((x) => console.log('  ' + x));
}

console.log('\n--- original January file, same cells ---');
const wb = XLSX.readFile('C:\\Users\\Admin\\Downloads\\JANUARY 2026 Regular Salary (Acad & Non-Acad) Payroll.xlsm', { cellFormula: true });
for (const dept of ['PE', 'TEMPO']) {
  const sh = wb.Sheets[`${dept} - PAY`];
  for (const r of [21, 22, 23, 24]) {
    const c = sh['C' + r];
    console.log(`  ${dept} C${r}: ` + (c ? JSON.stringify({ f: c.f, v: c.v, t: c.t }) : '(absent)'));
  }
}

console.log('\n--- TEMPLATE.xlsm (Phase 0 source), same cells ---');
const wb2 = XLSX.readFile('C:\\Users\\Admin\\Downloads\\TEMPLATE.xlsm', { cellFormula: true });
for (const dept of ['PE', 'TEMPO']) {
  const sh = wb2.Sheets[`${dept} - PAY`];
  for (const r of [21, 22, 23, 24]) {
    const c = sh['C' + r];
    console.log(`  ${dept} C${r}: ` + (c ? JSON.stringify({ f: c.f, v: c.v, t: c.t }) : '(absent)'));
  }
}

// Which FORMULA_COLS cells are missing a formula on rows 21/22 of each PAY sheet in the master?
const M = require('../services/payrollTemplate/appendix33Map');
console.log('\n--- master: FORMULA_COLS cells with no formula on the pattern rows ---');
for (const dept of M.DEPARTMENTS) {
  const gaps = [];
  const checks = [
    ['pay', pkg.sheet(M.sheetNames(dept.key).pay), M.PAY_FIRST_ROW],
    ['wtax', pkg.sheet(M.sheetNames(dept.key).wtax), M.WTAX_FIRST_ROW],
    ['deds', pkg.sheet(M.sheetNames(dept.key).deds), M.DEDS_FIRST_ROW],
  ];
  for (const [kind, sheet, first] of checks) {
    for (const col of M.FORMULA_COLS[kind]) {
      for (const off of [0, 1]) {
        if (sheet.formulaAt(col + (first + off)) === null) gaps.push(`${kind}:${col}${first + off}`);
      }
    }
  }
  if (gaps.length) console.log(`  ${dept.key}: ${gaps.join(', ')}`);
}
