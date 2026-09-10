/**
 * Smoke tests for fillAppendix33: over-capacity, a short department, and a
 * department with zero employees this run.
 *
 *   node backend/scripts/smokeAppendix33.js
 */

const fs = require('fs');
const path = require('path');
const { fillAppendix33, Appendix33CapacityError, periodLabels } = require('../services/payrollTemplate/fillAppendix33');
const { XlsmPackage } = require('../services/payrollTemplate/xlsmPatcher');
const M = require('../services/payrollTemplate/appendix33Map');
const layout = require('../services/payrollTemplate/layout.json');

let failures = 0;
function check(label, ok, detail) {
  if (ok) console.log('  PASS  ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '  ' + detail : '')); }
  return ok;
}

function sampleEmployee(i) {
  return {
    name: `TEST, EMPLOYEE ${i}`,
    position: 'ADMIN. AIDE I',
    employeeNumber: String(1000 + i),
    rateNbc594: 20000 + i,
    nbcDiffl597: 0,
    increment: 0,
    withholdingTax: 100,
    lwopDays: 0,
    lwopHours: 0,
    lwopMinutes: 0,
    gsisArrears: 0,
    gsisSalaryLoan: 0,
    gsisPolicyLoan: 0,
    gfal: 0,
    cpl: 0,
    mpl: 50,
    mplLite: 0,
    emergencyLoan: 0,
    gsisHousingLoan: 0,
    gsisOthers: 0,
    pagibigFundCont: 200,
    pagibig2: 0,
    pagibigMpl: 0,
    pagibigCalLoan: 0,
    pagibigOthers: 0,
    landbankSalaryLoan: 0,
    earistCreditCoop: 0,
    feu: 100,
    mtslaSalaryLoan: 0,
    otherDeds: 0,
  };
}

function emptyDepartments() {
  const departments = {};
  for (const key of M.DEPARTMENT_KEYS) departments[key] = [];
  return departments;
}

function makeRun(departments, month = 1, year = 2026) {
  const { periodLabel, periodShort, daysInPeriod } = periodLabels(month, year);
  return {
    periodLabel,
    periodShort,
    monthCode: String(month).padStart(2, '0'),
    payrollNoSeed: '2026-01-014',
    quincena: '(1st Quincena)',
    daysInPeriod,
    departments,
  };
}

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

console.log('== 1. over-capacity department throws a named error ==');
{
  const peCap = layout.departments.PE.capacity;
  const departments = emptyDepartments();
  departments.PE = Array.from({ length: peCap + 1 }, (_, i) => sampleEmployee(i + 1));
  let threw = null;
  try {
    fillAppendix33(makeRun(departments));
  } catch (err) {
    threw = err;
  }
  check('throws Appendix33CapacityError', threw instanceof Appendix33CapacityError);
  check('names PE in overflows', Boolean(threw && threw.overflows && threw.overflows.some((o) => o.department === 'PE')));
  check('reports needed vs capacity', Boolean(threw && threw.overflows && threw.overflows[0].needed === peCap + 1 && threw.overflows[0].capacity === peCap));
}

console.log('\n== 2. short department writes N employees and clears the rest ==');
{
  const departments = emptyDepartments();
  departments.AUX = [sampleEmployee(1), sampleEmployee(2)];
  const buffer = fillAppendix33(makeRun(departments));
  const pkg = XlsmPackage.load(buffer);
  const names = M.sheetNames('AUX');
  const wtax = pkg.sheet(names.wtax);
  const pay = pkg.sheet(names.pay);
  const deds = pkg.sheet(names.deds);
  const cap = layout.departments.AUX.capacity;

  check('row 0 name written', outStr(wtax, 'C8') === 'TEST, EMPLOYEE 1');
  check('row 1 name written', outStr(wtax, 'C9') === 'TEST, EMPLOYEE 2');
  check('row 0 rate written', outNum(pay, 'F21') === 20001);
  check('row 0 feu written', outNum(deds, 'AB20') === 100);
  check('January LWOP daily rate uses /31', wtax.formulaAt('G8') === "'AUX - PAY'!I21/31");
  check('January row 1 LWOP daily rate uses /31', wtax.formulaAt('G9') === "'AUX - PAY'!I22/31");
  check('row 2 name cleared', outStr(wtax, 'C10') === '');
  check('row 2 VLOOKUP cleared', pay.formulaAt('C23') === null);
  check('last-row name cleared', outStr(wtax, 'C' + (M.WTAX_FIRST_ROW + cap - 1)) === '');
  check('last-row PAY formula cleared', pay.formulaAt('C' + (M.PAY_FIRST_ROW + cap - 1)) === null);

  const outPath = path.join(__dirname, '..', '..', 'tmp_appendix33_smoke.xlsm');
  fs.writeFileSync(outPath, buffer);
  console.log('  wrote ' + outPath);
}

console.log('\n== 3. PE missing-pattern fallback stamps the name VLOOKUP ==');
{
  const departments = emptyDepartments();
  departments.PE = [sampleEmployee(1)];
  const buffer = fillAppendix33(makeRun(departments));
  const pkg = XlsmPackage.load(buffer);
  const pay = pkg.sheet('PE - PAY');
  check('PE C21 is the name VLOOKUP', pay.formulaAt('C21') === "VLOOKUP(B21,'WTAX-PE'!B:N,2,0)");
  check('PE C22 is the shifted VLOOKUP', pay.formulaAt('C22') === null, 'unused row must stay clear');
}

console.log('\n== 4. zero-employee department leaves no employee values ==');
{
  const departments = emptyDepartments();
  const buffer = fillAppendix33(makeRun(departments));
  const pkg = XlsmPackage.load(buffer);
  const names = M.sheetNames('CEN');
  const wtax = pkg.sheet(names.wtax);
  const pay = pkg.sheet(names.pay);
  const cap = layout.departments.CEN.capacity;
  let leftover = 0;
  for (let i = 0; i < cap; i++) {
    if (outStr(wtax, 'C' + (M.WTAX_FIRST_ROW + i))) leftover++;
    if (outNum(pay, 'F' + (M.PAY_FIRST_ROW + i))) leftover++;
  }
  check('CEN block fully cleared', leftover === 0, leftover + ' leftover cells');
  check('fullCalcOnLoad set', /fullCalcOnLoad="1"/.test(pkg.text('xl/workbook.xml')));
}

console.log('\n== 5. February LWOP daily rate uses /28 ==');
{
  const departments = emptyDepartments();
  departments.AUX = [sampleEmployee(1), sampleEmployee(2)];
  const buffer = fillAppendix33(makeRun(departments, 2, 2026));
  const wtax = XlsmPackage.load(buffer).sheet('WTAX-AUX');
  check('February G8 is gross/28', wtax.formulaAt('G8') === "'AUX - PAY'!I21/28");
  check('February G9 is gross/28', wtax.formulaAt('G9') === "'AUX - PAY'!I22/28");
  check('February unused G10 has no formula', wtax.formulaAt('G10') === null);
}

console.log('\n' + (failures === 0 ? 'SMOKE TEST PASSED' : failures + ' FAILURES'));
process.exit(failures === 0 ? 0 : 1);
