/**
 * Field map for the EARIST Appendix 33 payroll template.
 *
 * Every Excel address the export knows about lives here. Nothing else in the codebase
 * should contain a cell reference, so a template change is a single-place edit.
 *
 * Row geometry is identical for all 13 department blocks:
 *   WTAX employee rows start at row 8, PAY at row 21, DEDS at row 20.
 *   wtaxRow = payRow - 13 and dedsRow = payRow - 1.
 * Per-department capacity and subtotal rows are not hardcoded here; they are read from
 * the master workbook into layout.json by scripts/inspectAppendix33.js.
 */

const WTAX_FIRST_ROW = 8;
const PAY_FIRST_ROW = 21;
const DEDS_FIRST_ROW = 20;

/** WTAX daily-rate formula: gross / daysInPeriod. Absence days are written to H, never here. */
const WTAX_DAILY_RATE_COL = 'G';

/**
 * The 13 department blocks, in the order they appear on the SUMMARY sheet.
 * `title` is the label the workbook already carries on SUMMARY column C; it is recorded
 * for validation only. The export does not write department titles, because they are
 * static template content and rewriting correct text can only make it wrong.
 */
const DEPARTMENTS = [
  { key: 'GEN.AD', title: 'GENERAL ADMINISTRATION', summaryRow: 8 },
  { key: 'AUX', title: 'AUXILIARY SERVICES', summaryRow: 9 },
  { key: 'CEN', title: 'COLLEGE OF ENGINEERING', summaryRow: 10 },
  { key: 'CIT', title: 'COLLEGE OF INDUSTRIAL TECHNOLOGY', summaryRow: 11 },
  { key: 'CBPA', title: 'COLLEGE OF BUSINESS AND PUBLIC ADMINISTRATION', summaryRow: 12 },
  { key: 'CAS', title: 'COLLEGE OF ARTS AND SCIENCES', summaryRow: 13 },
  { key: 'CAFA', title: 'COLLEGE OF ARCHITECTURE AND FINE ARTS', summaryRow: 14 },
  { key: 'CED', title: 'COLLEGE OF EDUCATION', summaryRow: 15 },
  { key: 'PE', title: 'PHYSICAL EDUCATION', summaryRow: 16 },
  { key: 'RESEARCH', title: 'RESEARCH SERVICES', summaryRow: 17 },
  { key: 'EXTENSION', title: 'EXTENSION SERVICES', summaryRow: 18 },
  { key: 'TEMPO', title: 'TEMPORARY EMPLOYEES', summaryRow: 19 },
  { key: 'CONTRACTUAL', title: 'CONTRACTUAL EMPLOYEES', summaryRow: 20 },
];

const DEPARTMENT_KEYS = DEPARTMENTS.map((d) => d.key);

/** @param {string} key @returns {{wtax:string, pay:string, deds:string}} */
function sheetNames(key) {
  return { wtax: `WTAX-${key}`, pay: `${key} - PAY`, deds: `${key} - DEDS` };
}

/** Contract field -> WTAX column. These are the only WTAX cells the export writes. */
const WTAX_INPUT_COLS = {
  name: 'C',
  position: 'D',
  employeeNumber: 'E',
  withholdingTax: 'F',
  lwopDays: 'H',
  lwopHours: 'J',
  lwopMinutes: 'L',
};

/** Contract field -> PAY column. F + G + H is the gross the sheet then computes in I. */
const PAY_INPUT_COLS = {
  rateNbc594: 'F',
  nbcDiffl597: 'G',
  increment: 'H',
};

/** Contract field -> DEDS column. */
const DEDS_INPUT_COLS = {
  gsisArrears: 'H',
  gsisSalaryLoan: 'I',
  gsisPolicyLoan: 'J',
  gfal: 'K',
  cpl: 'L',
  mpl: 'M',
  mplLite: 'N',
  emergencyLoan: 'O',
  gsisHousingLoan: 'P',
  gsisOthers: 'Q',
  pagibigFundCont: 'S',
  pagibig2: 'T',
  pagibigMpl: 'U',
  pagibigCalLoan: 'V',
  pagibigOthers: 'W',
  landbankSalaryLoan: 'Z',
  earistCreditCoop: 'AA',
  feu: 'AB',
  mtslaSalaryLoan: 'AC',
  otherDeds: 'AD',
};

/**
 * Columns carrying a per-employee formula. Used rows get these stamped from the
 * first-row pattern; unused rows get them cleared so a VLOOKUP over a blank name
 * cannot print #N/A.
 *
 * PAY W (EC) and Y (Pag-IBIG government share) are deliberately absent: they are
 * template constants (100 / 200 on the first row, then a =W21 chain) rather than
 * per-employee data, and the workbook owns them.
 */
const FORMULA_COLS = {
  wtax: ['G', 'I', 'K', 'M', 'N'],
  pay: ['C', 'D', 'E', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X'],
  deds: ['C', 'D', 'E', 'F', 'G', 'R', 'X', 'Y', 'AE', 'AF'],
};

/**
 * Columns on the chained constant pattern: a literal on the block's first row and a
 * reference to the row above on every row after it. B is the serial number (1, then
 * =+B21+1); PAY W and Y are the EC and Pag-IBIG government shares (100 / 200, then a
 * =W21 chain). The first row's literal is template content and is never overwritten.
 */
const CHAINED_CONST_COLS = {
  wtax: ['B'],
  pay: ['B', 'W', 'Y'],
  deds: ['B'],
};

/**
 * Canonical first-row formulas, keyed by department. Used when a pattern cell in the
 * master is empty (PE and TEMPO PAY column C were never given the name VLOOKUP) so
 * the filler can still stamp a correct row rather than leaving a blank name.
 *
 * Bodies are stored without a leading "=". Relative references are written for the
 * block's first employee row (WTAX 8 / PAY 21 / DEDS 20).
 *
 * @param {string} key template department key
 */
function firstRowFormulas(key) {
  const { wtax, pay, deds } = sheetNames(key);
  return {
    wtax: {
      I: 'ROUND(G8*H8,2)',
      K: 'ROUND(G8/8*J8,2)',
      M: 'ROUND(G8/8/60*L8,2)',
      N: 'I8+K8+M8',
    },
    pay: {
      C: `VLOOKUP(B21,'${wtax}'!B:N,2,0)`,
      D: `VLOOKUP(C21,'${wtax}'!C:O,2,0)`,
      E: `VLOOKUP(B21,'${wtax}'!B:N,4,0)`,
      I: 'SUM(F21:H21)',
      J: `'${wtax}'!N8`,
      K: 'ROUND(I21-J21,2)',
      L: `'${wtax}'!F8`,
      M: `'${deds}'!R20`,
      N: `'${deds}'!X20`,
      O: `'${deds}'!Y20`,
      P: `'${deds}'!AE20`,
      Q: 'ROUND(SUM(L21:P21),2)',
      R: 'K21-Q21',
      S: 'ROUND(R21/2,0)',
      T: 'R21-S21',
      U: 'B21',
      V: `ROUND('${pay}'!I21*0.12,2)`,
      X: `MIN((I21*0.05)-'${deds}'!Y20,2500)`,
    },
    deds: {
      C: `'${pay}'!C21`,
      D: `'${pay}'!D21`,
      E: `'${pay}'!E21`,
      F: `'${pay}'!L21`,
      G: `ROUND('${pay}'!I21*0.09,2)`,
      R: 'SUM(G20:Q20)',
      X: 'SUM(S20:W20)',
      Y: `MIN(ROUNDDOWN('${pay}'!I21*0.05/2,2),2500)`,
      AE: 'SUM(Z20:AD20)',
      AF: 'SUM(F20,R20,X20,Y20,AE20)',
    },
  };
}

/** Every employee-area column the export owns, per sheet. Anything here is stamped or cleared. */
const OWNED_COLS = {
  wtax: [...new Set([...FORMULA_COLS.wtax, ...Object.values(WTAX_INPUT_COLS)])],
  pay: [...new Set([...FORMULA_COLS.pay, ...Object.values(PAY_INPUT_COLS)])],
  deds: [...new Set([...FORMULA_COLS.deds, ...Object.values(DEDS_INPUT_COLS)])],
};

/** Period cells. Only genuinely period-dependent values are written. */
const PERIOD_CELLS = {
  payPeriodLabel: 'B10',      // every "<DEPT> - PAY" sheet
  payMonthCode: 'D12',        // every "<DEPT> - PAY" sheet
  quincenaSheet: 'GEN.AD - PAY',
  quincenaCell: 'B11',        // other departments reference this cell by formula
  summaryPeriod: 'SUMMARY!B2',
  summaryPayrollNo: 'SUMMARY!B8', // remaining payroll numbers are derived by formula
};

/**
 * department_table.code -> template department key.
 *
 * Only codes with an unambiguous counterpart are mapped. The live department_table
 * holds 13 codes but they are not the template's 13 blocks: six line up exactly, and
 * the rest have no counterpart in either direction. Rather than guess, unmapped codes
 * make the export fail loudly and name them, so nobody's pay silently vanishes from a
 * printed payroll.
 *
 * Unmapped department_table codes (need HR to say which block each belongs to, or
 * whether the template needs a new sheet group):
 *   CCJE - College of Criminal Justice Education
 *   CCS  - College of Computing Studies
 *   CHTM - College of Hospitality and Tourism Management
 *   GS   - Graduate School
 *   MIS  - Management Information System
 *   PMS  - Property Management Services
 *   HRM  - Human Resource Management
 *
 * Template blocks with no department_table counterpart:
 *   GEN.AD, AUX, PE, RESEARCH, EXTENSION - organisational units, not colleges
 *   TEMPO, CONTRACTUAL                   - employment categories, not departments;
 *                                          these are likely driven by employment_category
 *                                          rather than by the department column
 */
const DB_DEPT_TO_TEMPLATE = {
  CAS: 'CAS',
  CBPA: 'CBPA',
  CAFA: 'CAFA',
  CED: 'CED',
  CEN: 'CEN',
  CIT: 'CIT',
};

/**
 * employment_type_config.typeName -> template department key.
 *
 * These Appendix 33 blocks are employment categories / organisational units, not
 * college department codes. Mapping is by the Employment Category subcategory
 * (typeName), e.g. "General Administration" -> GEN.AD.
 */
const DB_EMP_TYPE_TO_TEMPLATE = {
  'General Administration': 'GEN.AD',
  Auxiliary: 'AUX',
  Temporary: 'TEMPO',
  Contractual: 'CONTRACTUAL',
  Research: 'RESEARCH',
  Extension: 'EXTENSION',
};

/**
 * payroll_processed column -> contract field.
 *
 * Columns left out on purpose:
 *   grossSalary, netSalary, totalGsisDeds, totalPagibigDeds, totalOtherDeds,
 *   totalDeductions, pay1st, pay2nd, pay1stCompute, pay2ndCompute, rtIns, ec,
 *   personalLifeRetIns, PhilHealthContribution
 *     - the workbook derives all of these, and leaving them as formulas is the
 *       cross-check that catches a calculation bug.
 *   rateNbc584, nbc594, tevl, dvlt, vlb, sss, rh, s
 *     - no column on Appendix 33.
 *   eal   - the template has a single "EMERGENCY LOAN (ELA)" column, already fed by
 *           emergencyLoan. HR needs to say whether eal is a second loan type or a
 *           duplicate before it is mapped.
 *   gsl, gbk, rel - meaning unknown; unmapped rather than guessed.
 * Mapping these later is a one-line change here.
 */
const DB_FIELD_TO_CONTRACT = {
  name: 'name',
  position: 'position',
  employeeNumber: 'employeeNumber',

  rateNbc594: 'rateNbc594',
  nbcDiffl597: 'nbcDiffl597',
  increment: 'increment',

  withholdingTax: 'withholdingTax',
  abs: 'lwopDays',
  h: 'lwopHours',
  m: 'lwopMinutes',

  gsisArrears: 'gsisArrears',
  gsisSalaryLoan: 'gsisSalaryLoan',
  gsisPolicyLoan: 'gsisPolicyLoan',
  gfal: 'gfal',
  cpl: 'cpl',
  mpl: 'mpl',
  mplLite: 'mplLite',
  emergencyLoan: 'emergencyLoan',

  pagibigFundCont: 'pagibigFundCont',
  pagibig2: 'pagibig2',
  multiPurpLoan: 'pagibigMpl',

  landbankSalaryLoan: 'landbankSalaryLoan',
  earistCreditCoop: 'earistCreditCoop',
  feu: 'feu',
  // "OTHERS (DISALLOWANCE/UNLIQ. CA/ETC.)" - unliquidated cash advance.
  liquidatingCash: 'otherDeds',
};

/** Contract fields with no payroll_processed source; always written as 0. */
const UNSOURCED_CONTRACT_FIELDS = [
  'gsisHousingLoan',   // DEDS P
  'gsisOthers',        // DEDS Q
  'pagibigCalLoan',    // DEDS V
  'pagibigOthers',     // DEDS W
  'mtslaSalaryLoan',   // DEDS AC
];

module.exports = {
  WTAX_FIRST_ROW,
  PAY_FIRST_ROW,
  DEDS_FIRST_ROW,
  WTAX_DAILY_RATE_COL,
  DEPARTMENTS,
  DEPARTMENT_KEYS,
  sheetNames,
  WTAX_INPUT_COLS,
  PAY_INPUT_COLS,
  DEDS_INPUT_COLS,
  FORMULA_COLS,
  CHAINED_CONST_COLS,
  firstRowFormulas,
  OWNED_COLS,
  PERIOD_CELLS,
  DB_DEPT_TO_TEMPLATE,
  DB_EMP_TYPE_TO_TEMPLATE,
  DB_FIELD_TO_CONTRACT,
  UNSOURCED_CONTRACT_FIELDS,
};
