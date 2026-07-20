const db = require("../db");
const { getCtoCreditRunningTotals } = require("./ctoCreditRunningTotals");

/**
 * Append-only CTO ledger row + cto_usage (same semantics as earningsRoutes applyCtoDeductionLedger).
 * Used by half-day policy when charge_to = CTO so deductions are auditable like attendance/earnings CTO.
 */
function appendCtoDeductionSnapshotRow(
  {
    employeeNumber,
    needHours,
    period_year,
    period_month,
    expiry_date = null,
    remarksForLedger = null,
    emp_category_snapshot = null,
    usageDateUsed = null,
    usageAction = "offset",
  },
  cb,
) {
  const emp = String(employeeNumber || "").trim();
  const need = Math.abs(Number(needHours) || 0);
  if (!emp || need <= 1e-9) {
    return cb(null, {
      deducted: 0,
      ctoShortfallHrs: need,
      totalRemBefore: 0,
      snapRem: 0,
      newCtoCreditId: null,
      usageId: null,
    });
  }

  getCtoCreditRunningTotals(emp, (errSum, cur) => {
    if (errSum) return cb(errSum);
    const totalRemBefore = cur.remaining;
    const totalEarned = cur.earned;
    const usedBefore = cur.used;
    const applyHrs = Math.min(need, Math.max(0, totalRemBefore));
    const ctoShortfallHrs = Math.max(0, need - totalRemBefore);
    if (applyHrs <= 1e-9) {
      return cb(null, {
        deducted: 0,
        ctoShortfallHrs: need,
        totalRemBefore,
        snapRem: totalRemBefore,
        newCtoCreditId: null,
        usageId: null,
      });
    }
    const snapUsed = usedBefore + applyHrs;
    const snapRem = totalRemBefore - applyHrs;

    db.query(
      `INSERT INTO cto_credit
        (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours, period_year, period_month, expiry_date, remarks, emp_category_snapshot)
       VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp,
        totalEarned,
        snapRem,
        snapUsed,
        period_year,
        period_month,
        expiry_date,
        remarksForLedger,
        emp_category_snapshot,
      ],
      (errIns, insRes) => {
        if (errIns) return cb(errIns);
        const newId = insRes.insertId;
        const usageRemark = remarksForLedger || `cto_policy_ledger:${newId}`;
        db.query(
          `INSERT INTO cto_usage (cto_credit_id, employeeNumber, action, hours_applied, date_used, remarks)
           VALUES (?,?,?,?,?,?)`,
          [newId, emp, usageAction, applyHrs, usageDateUsed, usageRemark],
          (errU, insU) => {
            if (errU) return cb(errU);
            cb(null, {
              deducted: applyHrs,
              ctoShortfallHrs,
              totalRemBefore,
              snapRem,
              newCtoCreditId: newId,
              usageId: insU && insU.insertId != null ? insU.insertId : null,
            });
          },
        );
      },
    );
  });
}

function appendCtoDeductionSnapshotRowAsync(opts) {
  return new Promise((resolve, reject) => {
    appendCtoDeductionSnapshotRow(opts, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

module.exports = {
  appendCtoDeductionSnapshotRow,
  appendCtoDeductionSnapshotRowAsync,
};
