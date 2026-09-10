/**
 * Data contract between payroll calculation and the Appendix 33 Excel export.
 *
 * The export never reads the database and never recomputes payroll. It receives an
 * Appendix33Run and writes those numbers into the template's input cells. Anything the
 * template can derive itself is deliberately absent from this contract and stays a
 * formula in the workbook, which gives a free cross-check: if Excel's subtotal disagrees
 * with what the system reports, that is a bug surfacing itself.
 *
 * Computed by the workbook, never sent here:
 *   gross (PAY I = SUM(F:H)), GSIS personal share (DEDS G = gross * 0.09),
 *   PhilHealth personal share (DEDS Y), every subtotal and grand total,
 *   net amount due, 1st/2nd pay, and the government-share columns.
 */

/**
 * One employee's row across the three sheets of a department block.
 * Every numeric field is a plain Number; null/undefined is written as a blank cell.
 *
 * @typedef {Object} Appendix33Employee
 *
 * @property {string} name            WTAX column C. "SURNAME, FIRSTNAME M." as printed.
 * @property {string} position        WTAX column D.
 * @property {string} employeeNumber  WTAX column E.
 *
 * @property {number} rateNbc594      PAY column F. Labelled "NBC 597 (2nd Tranche)" on the
 *                                    sheet; F + G + H must equal the employee's gross.
 * @property {number} nbcDiffl597     PAY column G, "Diff'l".
 * @property {number} increment       PAY column H, "Step Increment".
 *
 * @property {number} withholdingTax  WTAX column F.
 * @property {number} lwopDays        WTAX column H. Absence days; the sheet applies the rate.
 * @property {number} lwopHours       WTAX column J.
 * @property {number} lwopMinutes     WTAX column L.
 *
 * @property {number} gsisArrears        DEDS H
 * @property {number} gsisSalaryLoan     DEDS I
 * @property {number} gsisPolicyLoan     DEDS J
 * @property {number} gfal               DEDS K
 * @property {number} cpl                DEDS L
 * @property {number} mpl                DEDS M
 * @property {number} mplLite            DEDS N
 * @property {number} emergencyLoan      DEDS O  "EMERGENCY LOAN (ELA)"
 * @property {number} gsisHousingLoan    DEDS P
 * @property {number} gsisOthers         DEDS Q
 *
 * @property {number} pagibigFundCont    DEDS S
 * @property {number} pagibig2           DEDS T
 * @property {number} pagibigMpl         DEDS U
 * @property {number} pagibigCalLoan     DEDS V
 * @property {number} pagibigOthers      DEDS W
 *
 * @property {number} landbankSalaryLoan DEDS Z
 * @property {number} earistCreditCoop   DEDS AA
 * @property {number} feu                DEDS AB
 * @property {number} mtslaSalaryLoan    DEDS AC
 * @property {number} otherDeds          DEDS AD  "OTHERS (DISALLOWANCE/UNLIQ. CA/ETC.)"
 */

/**
 * One export run: a single pay period across all department blocks.
 *
 * @typedef {Object} Appendix33Run
 * @property {string} periodLabel   PAY B10 / SUMMARY B2, e.g. "For the period JANUARY 1-31, 2026".
 * @property {string} periodShort   SUMMARY B2, e.g. "JANUARY 1-31, 2026".
 * @property {string} monthCode     PAY D12, zero padded month, e.g. "01".
 * @property {string} payrollNoSeed SUMMARY B8. Every other department's payroll number is
 *                                  derived from this by formula.
 * @property {string} quincena      GEN.AD - PAY B11, e.g. "(1st Quincena)". Other departments
 *                                  reference the GEN.AD cell.
 * @property {number} daysInPeriod  Calendar days in the pay month. WTAX G is stamped as
 *                                  gross / daysInPeriod (28 in February, 31 in January).
 * @property {Object.<string, Appendix33Employee[]>} departments
 *                                  Keyed by template department key (GEN.AD, AUX, ...).
 *                                  A missing or empty array clears that department's block.
 */

/** Numeric fields, in the order they are documented above. Used to normalise input. */
const NUMERIC_FIELDS = [
  'rateNbc594', 'nbcDiffl597', 'increment',
  'withholdingTax', 'lwopDays', 'lwopHours', 'lwopMinutes',
  'gsisArrears', 'gsisSalaryLoan', 'gsisPolicyLoan', 'gfal', 'cpl',
  'mpl', 'mplLite', 'emergencyLoan', 'gsisHousingLoan', 'gsisOthers',
  'pagibigFundCont', 'pagibig2', 'pagibigMpl', 'pagibigCalLoan', 'pagibigOthers',
  'landbankSalaryLoan', 'earistCreditCoop', 'feu', 'mtslaSalaryLoan', 'otherDeds',
];

const TEXT_FIELDS = ['name', 'position', 'employeeNumber'];

/**
 * Coerce a DB value to a Number. MySQL DECIMAL columns arrive as strings, and the
 * legacy payroll tables store formatted values like "1,540.24" in some rows.
 * Anything unparseable becomes 0 so a bad cell can never poison a subtotal.
 *
 * @param {unknown} value
 * @returns {number}
 */
function toAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalise a loosely typed row into an Appendix33Employee: text fields trimmed to
 * strings, every numeric field present and finite.
 *
 * @param {Object} row
 * @returns {Appendix33Employee}
 */
function normaliseEmployee(row) {
  const out = {};
  for (const f of TEXT_FIELDS) {
    out[f] = row[f] === null || row[f] === undefined ? '' : String(row[f]).trim();
  }
  for (const f of NUMERIC_FIELDS) {
    out[f] = toAmount(row[f]);
  }
  return out;
}

module.exports = { NUMERIC_FIELDS, TEXT_FIELDS, toAmount, normaliseEmployee };
