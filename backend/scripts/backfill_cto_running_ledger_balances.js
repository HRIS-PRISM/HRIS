/**
 * One-time backfill: cto_credit running-ledger semantics.
 *
 * Usage:
 *   node backend/scripts/backfill_cto_running_ledger_balances.js          # dry-run
 *   node backend/scripts/backfill_cto_running_ledger_balances.js --apply  # write
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../db");
const {
  toNum,
  latestCtoPeriodsByKey,
  sortCtoPeriodsAsc,
  recomputeCtoLedgerFields,
  isCtoEarningLedgerRow,
  getCtoDisplayRemainingHours,
  normalizeCtoPeriodKey,
} = require("../utils/ctoBalanceUtils");

const APPLY = process.argv.includes("--apply");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const main = async () => {
  const allRows = await queryAsync(
    `SELECT * FROM cto_credit ORDER BY employeeNumber, period_year, id`,
  );
  const earnings = await queryAsync(
    `SELECT * FROM cto_earnings WHERE earn_status = 'approved' AND voided_at IS NULL`,
  );

  const earningLedgerIds = allRows.filter(isCtoEarningLedgerRow).map((r) => r.id);
  if (APPLY && earningLedgerIds.length) {
    const ph = earningLedgerIds.map(() => "?").join(",");
    await queryAsync(
      `UPDATE cto_credit SET voided_at = NOW() WHERE id IN (${ph}) AND voided_at IS NULL`,
      earningLedgerIds,
    );
    console.log(`Voided ${earningLedgerIds.length} legacy cto_earning ledger rows.`);
  } else if (earningLedgerIds.length) {
    console.log(`Would void ${earningLedgerIds.length} legacy cto_earning ledger rows.`);
  }

  const activeRows = allRows.filter((r) => !r.voided_at && !isCtoEarningLedgerRow(r));

  const byEmp = new Map();
  for (const r of activeRows) {
    const k = String(r.employeeNumber);
    if (!byEmp.has(k)) byEmp.set(k, []);
    byEmp.get(k).push(r);
  }

  let updateCount = 0;
  const diffs = [];

  for (const [, rows] of byEmp.entries()) {
    const snapshots = sortCtoPeriodsAsc(latestCtoPeriodsByKey(rows));
    let priorRemaining = 0;

    for (const period of snapshots) {
      const empEarnings = earnings.filter(
        (e) => String(e.employee_number) === String(period.employeeNumber),
      );

      const idx = snapshots.indexOf(period);
      let otEarned = toNum(period.earned_hours);

      if (toNum(period.ot_hours) <= 0 && otEarned > priorRemaining + 0.001) {
        const otRows = rows.filter(
          (r) =>
            normalizeCtoPeriodKey(r) === normalizeCtoPeriodKey(period) &&
            toNum(r.ot_hours) > 0 &&
            !isCtoEarningLedgerRow(r),
        );
        if (otRows.length) {
          otEarned = Math.max(...otRows.map((r) => toNum(r.earned_hours)));
        }
      }

      const carried = idx === 0 ? toNum(period.carried_forward_hours) : priorRemaining;
      const earnedWithCarry = idx === 0 ? otEarned : Math.max(otEarned, carried);
      const used = toNum(period.used_hours);
      const working = {
        ...period,
        earned_hours: earnedWithCarry,
        used_hours: used,
        carried_forward_hours: idx === 0 ? carried : priorRemaining,
      };

      const recomputed = recomputeCtoLedgerFields(working, empEarnings);
      const displayRem = getCtoDisplayRemainingHours(
        { ...working, ...recomputed },
        empEarnings,
      );

      const changed =
        Math.abs(toNum(period.total_hours) - recomputed.total_hours) > 0.001 ||
        Math.abs(toNum(period.remaining_hours) - recomputed.remaining_hours) > 0.001 ||
        Math.abs(toNum(period.earned_hours) - recomputed.earned_hours) > 0.001 ||
        Math.abs(toNum(period.carried_forward_hours) - working.carried_forward_hours) > 0.001 ||
        toNum(period.earning_status) !== recomputed.earning_status;

      if (changed) {
        diffs.push({
          id: period.id,
          employee: period.employeeNumber,
          period: `${period.period_year}/${period.period_month ?? "annual"}`,
          before: {
            earned: period.earned_hours,
            carry: period.carried_forward_hours,
            total: period.total_hours,
            remaining: period.remaining_hours,
          },
          after: { ...recomputed, carried_forward_hours: working.carried_forward_hours },
          displayRemaining: displayRem,
        });

        if (APPLY) {
          await queryAsync(
            `UPDATE cto_credit SET
               earned_hours = ?, used_hours = ?, total_hours = ?, remaining_hours = ?,
               carried_forward_hours = ?, earning_status = ?
             WHERE id = ?`,
            [
              recomputed.earned_hours,
              recomputed.used_hours,
              recomputed.total_hours,
              recomputed.remaining_hours,
              working.carried_forward_hours,
              recomputed.earning_status,
              period.id,
            ],
          );
          updateCount++;
        }
      }

      priorRemaining = displayRem;
    }
  }

  if (APPLY) {
    try {
      const commuted = await queryAsync(
        `SELECT lc.id AS commutation_id, lc.employeeNumber, lc.period_year, lc.period_semester,
                lc.commuted_hours, c.id AS cto_credit_id
         FROM leave_commutation lc
         LEFT JOIN cto_credit c ON c.id = lc.cto_credit_id
         WHERE lc.leave_code = 'CTO' AND lc.status != 3`,
      );
      for (const row of commuted) {
        if (row.cto_credit_id) {
          await queryAsync(
            `UPDATE cto_credit SET commuted = 1, remaining_hours = 0 WHERE id = ?`,
            [row.cto_credit_id],
          );
        }
      }
      console.log(`Marked ${commuted.length} CTO commutation link(s) commuted where possible.`);
    } catch (e) {
      console.warn("Commutation backfill skipped:", e.message);
    }
  }

  console.log(APPLY ? `Updated ${updateCount} period head(s).` : `Would update ${diffs.length} period head(s).`);
  if (diffs.length && !APPLY) {
    console.log("Sample diffs:", JSON.stringify(diffs.slice(0, 5), null, 2));
  }
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
