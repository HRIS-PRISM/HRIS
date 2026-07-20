/**
 * Backfill: restore used_hours on commuted service_credit rows.
 * Legacy commute incorrectly added the remaining OT balance into used_hours.
 *
 * Usage:
 *   node backend/scripts/backfill_sc_commute_used_hours.js          # dry-run
 *   node backend/scripts/backfill_sc_commute_used_hours.js --apply  # write
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../db");
const {
  toNum,
  refreshScPeriodLedgerOnRow,
  isScCommutedLocked,
} = require("../utils/serviceCreditBalanceUtils");

const APPLY = process.argv.includes("--apply");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const main = async () => {
  const rows = await queryAsync(
    `SELECT sc.*,
            lc.commuted_hours,
            lc.commuted_days
     FROM service_credit sc
     LEFT JOIN (
       SELECT service_credit_id,
              MAX(commuted_hours) AS commuted_hours,
              MAX(commuted_days) AS commuted_days
       FROM leave_commutation
       WHERE status != 3 AND service_credit_id IS NOT NULL
       GROUP BY service_credit_id
     ) lc ON lc.service_credit_id = sc.id
     WHERE sc.commuted = 1 AND sc.voided_at IS NULL`,
  );

  if (!rows.length) {
    console.log("No commuted service_credit rows found.");
    process.exit(0);
  }

  let fixed = 0;
  for (const row of rows) {
    if (!isScCommutedLocked(row)) continue;

    let commuteHrs = toNum(row.commuted_hours);
    if (commuteHrs <= 0) {
      const days = toNum(row.commuted_days);
      if (days > 0) commuteHrs = days * 8;
    }
    if (commuteHrs <= 0) {
      const usage = await queryAsync(
        `SELECT hours_applied FROM service_credit_usage
         WHERE service_credit_id = ? AND action = 'commute'
         ORDER BY id DESC LIMIT 1`,
        [row.id],
      );
      commuteHrs = toNum(usage[0]?.hours_applied);
    }

    const storedUsed = toNum(row.used_hours);
    const correctedUsed =
      commuteHrs > 0 && storedUsed >= commuteHrs
        ? Math.max(0, storedUsed - commuteHrs)
        : storedUsed;

    if (Math.abs(correctedUsed - storedUsed) < 0.001) {
      console.log(`[skip] id=${row.id} emp=${row.employeeNumber} used_hours already correct (${storedUsed})`);
      continue;
    }

    console.log(
      `[fix] id=${row.id} emp=${row.employeeNumber} period=${row.period_year}-${row.period_month ?? "annual"} ` +
        `used_hours ${storedUsed} -> ${correctedUsed} (commuted ${commuteHrs} hrs)`,
    );

    if (APPLY) {
      await queryAsync(`UPDATE service_credit SET used_hours = ? WHERE id = ?`, [
        correctedUsed,
        row.id,
      ]);
      await refreshScPeriodLedgerOnRow(db, { ...row, used_hours: correctedUsed, commuted: 1 });
      await queryAsync(`UPDATE service_credit SET remaining_hours = 0 WHERE id = ? AND commuted = 1`, [
        row.id,
      ]);
    }
    fixed += 1;
  }

  console.log(`${APPLY ? "Applied" : "Would apply"} ${fixed} correction(s).`);
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
