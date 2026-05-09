const db = require("../db");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Current CTO totals for an employee (all cto_credit rows).
 *
 * Ledger semantics (aligned with service_credit / earnings SC flow):
 * - Deduction rows store a full snapshot (cumulative earned, used, remaining).
 * - Earn rows from earnings approval store: earned_hours = this transaction only,
 *   remaining_hours = balance after the earn, used_hours = 0 (cumulative used unchanged on the row).
 *
 * Totals: remaining from latest row; cumulative used = latest.used if > 0 else most recent older row
 * with used_hours > 0; cumulative earned = remaining + used.
 */
function getCtoCreditRunningTotals(employeeNumber, cb) {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return cb(null, { earned: 0, used: 0, remaining: 0 });

  db.query(
    `SELECT id, earned_hours, used_hours, remaining_hours
     FROM cto_credit
     WHERE employeeNumber = ?
     ORDER BY id DESC
     LIMIT 1`,
    [emp],
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
           FROM cto_credit
           WHERE employeeNumber = ?`,
          [emp],
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
         FROM cto_credit
         WHERE employeeNumber = ? AND id < ? AND used_hours > 0
         ORDER BY id DESC
         LIMIT 1`,
        [emp, L.id],
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

module.exports = {
  getCtoCreditRunningTotals,
  toNum,
};
