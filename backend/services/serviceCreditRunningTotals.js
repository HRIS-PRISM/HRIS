const db = require("../db");
const {
  toNum,
  latestScPeriodsByKey,
  sortScPeriodsDesc,
  getScDisplayRemainingHours,
  computeScBalances,
  queryAsync,
  scRecordsForDisplay,
  resolveScCurrentDisplayPeriod,
} = require("../utils/serviceCreditBalanceUtils");

/**
 * Load approved sc_earnings for an employee + sc_type.
 */
function loadScEarningsForType(employeeNumber, scType, cb) {
  db.query(
    `SELECT * FROM sc_earnings
     WHERE employee_number = ? AND sc_type = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [String(employeeNumber), String(scType || "non_commutative")],
    (err, rows) => cb(err, rows || []),
  );
}

/**
 * Current SC totals for employee + sc_type (display remaining from latest active period).
 */
function getServiceCreditRunningTotals(employeeNumber, scType, cb) {
  const emp = String(employeeNumber || "").trim();
  const st = String(scType || "non_commutative");
  if (!emp) return cb(null, { earned: 0, used: 0, remaining: 0 });

  db.query(
    `SELECT * FROM service_credit
     WHERE employeeNumber = ? AND sc_type = ? AND voided_at IS NULL
     ORDER BY id DESC`,
    [emp, st],
    (err, rows) => {
      if (err) return cb(err);
      const list = rows || [];
      if (!list.length) return cb(null, { earned: 0, used: 0, remaining: 0 });

      loadScEarningsForType(emp, st, (errE, earnings) => {
        if (errE) return cb(errE);

        const periods = sortScPeriodsDesc(latestScPeriodsByKey(list));
        const active = periods[0];
        if (!active) return cb(null, { earned: 0, used: 0, remaining: 0 });

        const bal = computeScBalances(active, { earningsList: earnings });
        cb(null, {
          earned: bal.otEarned + bal.earnedBalance,
          used: bal.usedHrs,
          remaining: bal.remainingBalance,
          periodRow: active,
        });
      });
    },
  );
}

/** Rows shaped like sc_balance_summary for API compatibility. */
function loadScBalanceSummaryRows(employeeNumber, year, month, cb) {
  db.query(
    `SELECT DISTINCT sc_type FROM service_credit WHERE employeeNumber = ? AND voided_at IS NULL`,
    [employeeNumber],
    (err, types) => {
      if (err) return cb(err, []);
      const list = (types || []).map((t) => t.sc_type);
      const rows = [];
      let i = 0;
      const next = () => {
        if (i >= list.length) return cb(null, rows);
        const st = list[i++];
        getServiceCreditRunningTotals(employeeNumber, st, (e2, cur) => {
          if (e2) return cb(e2, []);
          rows.push({
            employee_number: employeeNumber,
            sc_type: st,
            period_year: year != null ? parseInt(year, 10) : null,
            period_month: month != null ? parseInt(month, 10) : null,
            total_earned_hours: cur.earned,
            remaining_hours: cur.remaining,
            used_hours: cur.used,
          });
          next();
        });
      };
      next();
    },
  );
}

/** Sum display remaining across all sc_type buckets. */
function getScRemainingHoursTotal(employeeNumber, cb) {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return cb(null, 0);
  db.query(
    `SELECT DISTINCT sc_type FROM service_credit WHERE employeeNumber = ? AND voided_at IS NULL`,
    [emp],
    (err, types) => {
      if (err) return cb(err);
      const list = (types || []).map((t) => t.sc_type).filter(Boolean);
      if (!list.length) return cb(null, 0);
      let total = 0;
      let i = 0;
      const next = () => {
        if (i >= list.length) return cb(null, total);
        const st = list[i++];
        getServiceCreditRunningTotals(emp, st, (e2, cur) => {
          if (e2) return cb(e2);
          total += toNum(cur?.remaining);
          next();
        });
      };
      next();
    },
  );
}

/** Sum display remaining across all periods for one sc_type (employee modal footer). */
async function getScEmployeeDisplayRemainingAsync(dbConn, employeeNumber, scType = "non_commutative") {
  const emp = String(employeeNumber || "").trim();
  const rows = await queryAsync(
    dbConn,
    `SELECT * FROM service_credit WHERE employeeNumber = ? AND sc_type = ? AND voided_at IS NULL`,
    [emp, String(scType)],
  );
  const earnings = await queryAsync(
    dbConn,
    `SELECT * FROM sc_earnings WHERE employee_number = ? AND sc_type = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [emp, String(scType)],
  );
  const display = scRecordsForDisplay(rows, String(scType));
  const latest = resolveScCurrentDisplayPeriod(display);
  if (!latest) return 0;
  return getScDisplayRemainingHours(latest, earnings);
}

module.exports = {
  getServiceCreditRunningTotals,
  getScRemainingHoursTotal,
  loadScBalanceSummaryRows,
  getScEmployeeDisplayRemainingAsync,
  toNum,
};
