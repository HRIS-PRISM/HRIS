const db = require("../db");
const {
  toNum,
  latestCtoPeriodsByKey,
  sortCtoPeriodsDesc,
  getCtoDisplayRemainingHours,
  computeCtoBalances,
  queryAsync,
  ctoRecordsForDisplay,
  resolveCtoCurrentDisplayPeriod,
} = require("../utils/ctoBalanceUtils");

function loadCtoEarnings(employeeNumber, cb) {
  db.query(
    `SELECT * FROM cto_earnings
     WHERE employee_number = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [String(employeeNumber)],
    (err, rows) => cb(err, rows || []),
  );
}

/**
 * Current CTO totals for employee (display remaining from latest active period).
 */
function getCtoCreditRunningTotals(employeeNumber, cb) {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return cb(null, { earned: 0, used: 0, remaining: 0 });

  db.query(
    `SELECT * FROM cto_credit
     WHERE employeeNumber = ? AND voided_at IS NULL
     ORDER BY id DESC`,
    [emp],
    (err, rows) => {
      if (err) return cb(err);
      const list = rows || [];
      if (!list.length) return cb(null, { earned: 0, used: 0, remaining: 0 });

      loadCtoEarnings(emp, (errE, earnings) => {
        if (errE) return cb(errE);

        const periods = sortCtoPeriodsDesc(latestCtoPeriodsByKey(list));
        const active = periods[0];
        if (!active) return cb(null, { earned: 0, used: 0, remaining: 0 });

        const bal = computeCtoBalances(active, { earningsList: earnings });
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

function loadCtoBalanceSummaryRows(employeeNumber, year, month, cb) {
  getCtoCreditRunningTotals(employeeNumber, (err, cur) => {
    if (err) return cb(err, []);
    cb(null, [
      {
        employee_number: employeeNumber,
        period_year: year != null ? parseInt(year, 10) : null,
        period_month: month != null ? parseInt(month, 10) : null,
        total_earned_hours: cur.earned,
        remaining_hours: cur.remaining,
        used_hours: cur.used,
      },
    ]);
  });
}

function getCtoRemainingHoursTotal(employeeNumber, cb) {
  getCtoCreditRunningTotals(employeeNumber, (err, cur) => {
    if (err) return cb(err);
    cb(null, toNum(cur?.remaining));
  });
}

async function getCtoEmployeeDisplayRemainingAsync(dbConn, employeeNumber) {
  const emp = String(employeeNumber || "").trim();
  const rows = await queryAsync(
    dbConn,
    `SELECT * FROM cto_credit WHERE employeeNumber = ? AND voided_at IS NULL`,
    [emp],
  );
  const earnings = await queryAsync(
    dbConn,
    `SELECT * FROM cto_earnings WHERE employee_number = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [emp],
  );
  const display = ctoRecordsForDisplay(rows);
  const latest = resolveCtoCurrentDisplayPeriod(display);
  if (!latest) return 0;
  return getCtoDisplayRemainingHours(latest, earnings);
}

module.exports = {
  getCtoCreditRunningTotals,
  getCtoRemainingHoursTotal,
  loadCtoBalanceSummaryRows,
  getCtoEmployeeDisplayRemainingAsync,
  toNum,
};
