/**
 * One-time backfill: convert leave_assignment rows to running-ledger semantics.
 *
 * Usage:
 *   node backend/scripts/backfill_running_ledger_balances.js          # dry-run (default)
 *   node backend/scripts/backfill_running_ledger_balances.js --apply  # write changes
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../db");
const {
  toNum,
  isCommutedLocked,
  latestPeriodsByKey,
  sortPeriodsAsc,
  earningMatchesPeriod,
} = require("../utils/leaveAssignmentBalanceUtils");

const APPLY = process.argv.includes("--apply");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const main = async () => {
  const assignments = await queryAsync(
    `SELECT * FROM leave_assignment ORDER BY employeeNumber, leave_code, period_year, id`,
  );
  const earnings = await queryAsync(
    `SELECT * FROM leave_earnings WHERE earn_status = 'approved'`,
  );

  const byKey = new Map();
  for (const a of assignments) {
    const k = `${a.employeeNumber}|${a.leave_code}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(a);
  }

  let updateCount = 0;
  const diffs = [];

  for (const [key, rows] of byKey.entries()) {
    const snapshots = sortPeriodsAsc(latestPeriodsByKey(rows));
    let priorRemaining = 0;

    for (const period of snapshots) {
      const empEarnings = earnings.filter(
        (e) =>
          String(e.employee_number) === String(period.employeeNumber) &&
          String(e.leave_code).trim() === String(period.leave_code).trim(),
      );
      const periodEarned = empEarnings
        .filter((e) => earningMatchesPeriod(e, period))
        .reduce((s, e) => s + toNum(e.earned_hours), 0);

      const used = toNum(period.used_hours);
      let allocated;
      let total;
      let remaining;
      let earningStatus;

      if (isCommutedLocked(period)) {
        allocated = toNum(period.allocated_hours);
        total = Math.max(0, allocated - used);
        remaining = 0;
        earningStatus = periodEarned > 0 ? 1 : 0;
        priorRemaining = 0;
      } else {
        const idx = snapshots.indexOf(period);
        allocated = idx === 0 ? toNum(period.allocated_hours) : priorRemaining;
        total = Math.max(0, allocated - used);
        remaining = Math.max(0, total + periodEarned);
        earningStatus = periodEarned > 0 ? 1 : 0;
        priorRemaining = remaining;
      }

      const changed =
        Math.abs(toNum(period.allocated_hours) - allocated) > 0.001 ||
        Math.abs(toNum(period.total_hours) - total) > 0.001 ||
        Math.abs(toNum(period.remaining_hours) - remaining) > 0.001 ||
        toNum(period.carried_forward_hours) !== 0;

      if (changed) {
        diffs.push({
          id: period.id,
          employeeNumber: period.employeeNumber,
          leave_code: period.leave_code,
          period: `${period.period_year}/${period.period_semester}`,
          before: {
            allocated: period.allocated_hours,
            total: period.total_hours,
            remaining: period.remaining_hours,
            carried: period.carried_forward_hours,
          },
          after: { allocated, total, remaining, carried: 0 },
        });

        if (APPLY) {
          await queryAsync(
            `UPDATE leave_assignment SET
               allocated_hours = ?, total_hours = ?, remaining_hours = ?,
               carried_forward_hours = 0, earning_status = ?
             WHERE id = ?`,
            [allocated, total, remaining, earningStatus, period.id],
          );
          updateCount++;
        }
      } else if (APPLY && toNum(period.carried_forward_hours) !== 0) {
        await queryAsync(
          `UPDATE leave_assignment SET carried_forward_hours = 0, earning_status = ? WHERE id = ?`,
          [earningStatus, period.id],
        );
        updateCount++;
      }
    }

    const empEarningsAll = earnings.filter(
      (e) =>
        String(e.employee_number) === String(key.split("|")[0]) &&
        String(e.leave_code).trim() === String(key.split("|")[1]).trim(),
    );
    if (APPLY && empEarningsAll.length) {
      const ids = empEarningsAll.map((e) => e.id);
      const placeholders = ids.map(() => "?").join(",");
      await queryAsync(
        `UPDATE leave_earnings SET is_applied = 1 WHERE id IN (${placeholders}) AND earn_status = 'approved'`,
        ids,
      );
    }
  }

  console.log(APPLY ? "APPLY mode" : "DRY-RUN mode");
  console.log(`Groups processed: ${byKey.size}`);
  console.log(`Assignment rows with diffs: ${diffs.length}`);
  if (diffs.length) {
    console.log("Sample diffs (up to 10):");
    diffs.slice(0, 10).forEach((d) => console.log(JSON.stringify(d)));
  }
  if (APPLY) {
    console.log(`Rows updated: ${updateCount}`);
  } else {
    console.log("Re-run with --apply to persist changes.");
  }
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
