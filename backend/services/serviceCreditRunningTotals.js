const db = require("../db");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Current SC totals for employee + sc_type.
 * Prefers the latest ledger row when it looks like a full snapshot (earned ≥ 0, remaining ≥ 0).
 * Falls back to SUM() for legacy tail rows that store only deltas (e.g. negative remaining).
 */
function getServiceCreditRunningTotals(employeeNumber, scType, cb) {
  db.query(
    `SELECT earned_hours, used_hours, remaining_hours
     FROM service_credit
     WHERE employeeNumber = ? AND sc_type = ?
     ORDER BY id DESC
     LIMIT 1`,
    [employeeNumber, scType],
    (err, rows) => {
      if (err) return cb(err);
      const L = rows && rows[0];
      if (L) {
        const r = toNum(L.remaining_hours);
        const e = toNum(L.earned_hours);
        if (r >= 0 && e >= 0) {
          return cb(null, {
            earned: e,
            used: toNum(L.used_hours),
            remaining: r,
          });
        }
      }
      db.query(
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

module.exports = {
  getServiceCreditRunningTotals,
  loadScBalanceSummaryRows,
  toNum,
};
