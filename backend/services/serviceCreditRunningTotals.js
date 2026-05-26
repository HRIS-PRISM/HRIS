const db = require("../db");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Current SC totals for employee + sc_type.
 *
 * Ledger semantics:
 * - Deduction / adjustment rows may store a full snapshot (earned, used, remaining all cumulative).
 * - Earn rows from earnings approval store: earned_hours = this transaction only, remaining_hours =
 *   balance after the earn, used_hours = 0 (cumulative used is unchanged; not duplicated on the row).
 *
 * Totals: remaining is always read from the latest row. Cumulative used is the latest row's used_hours
 * if > 0, else the most recent older row with used_hours > 0. Cumulative earned = remaining + used.
 */
function getServiceCreditRunningTotals(employeeNumber, scType, cb) {
  db.query(
    `SELECT id, earned_hours, used_hours, remaining_hours
     FROM service_credit
     WHERE employeeNumber = ? AND sc_type = ?
     ORDER BY id DESC
     LIMIT 1`,
    [employeeNumber, scType],
    (err, rows) => {
      if (err) return cb(err);
      const L = rows && rows[0];
      if (!L) return cb(null, { earned: 0, used: 0, remaining: 0 });

      const remaining = toNum(L.remaining_hours);
      if (remaining < 0) {
        return db.query(
          `SELECT COALESCE(SUM(earned_hours), 0) AS earned,
                  COALESCE(SUM(used_hours), 0) AS used,
                  COALESCE(SUM(remaining_hours), 0) AS remaining
           FROM service_credit
           WHERE employeeNumber = ? AND sc_type = ?`,
          [employeeNumber, scType],
          (e2, sumRows) => {
            if (e2) return cb(e2);
            const s = sumRows && sumRows[0];
            cb(null, {
              earned: toNum(s?.earned),
              used: toNum(s?.used),
              remaining: toNum(s?.remaining),
            });
          },
        );
      }

      let used = toNum(L.used_hours);
      const finish = () => {
        const earned = remaining + used;
        cb(null, { earned, used, remaining });
      };

      if (used > 0) {
        return finish();
      }

      db.query(
        `SELECT used_hours
         FROM service_credit
         WHERE employeeNumber = ? AND sc_type = ? AND id < ? AND used_hours > 0
         ORDER BY id DESC
         LIMIT 1`,
        [employeeNumber, scType, L.id],
        (e2, urows) => {
          if (e2) return cb(e2);
          if (urows && urows[0] && toNum(urows[0].used_hours) > 0) {
            used = toNum(urows[0].used_hours);
          }
          finish();
        },
      );
    },
  );
}

/** Rows shaped like `sc_balance_summary` for API compatibility (period_* echo request filter). */
function loadScBalanceSummaryRows(employeeNumber, year, month, cb) {
  db.query(
    `SELECT DISTINCT sc_type FROM service_credit WHERE employeeNumber = ?`,
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

/** Sum remaining across all sc_type buckets (matches GET /api/earnings/sc/:emp/balance). */
function getScRemainingHoursTotal(employeeNumber, cb) {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return cb(null, 0);
  db.query(
    `SELECT DISTINCT sc_type FROM service_credit WHERE employeeNumber = ?`,
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

module.exports = {
  getServiceCreditRunningTotals,
  getScRemainingHoursTotal,
  loadScBalanceSummaryRows,
  toNum,
};
