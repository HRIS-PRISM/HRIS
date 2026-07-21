/**
 * One-time backfill: service_credit running-ledger semantics.
 *
 * Usage:
 *   node backend/scripts/backfill_sc_running_ledger_balances.js          # dry-run
 *   node backend/scripts/backfill_sc_running_ledger_balances.js --apply  # write
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../db");
const {
  toNum,
  latestScPeriodsByKey,
  sortScPeriodsAsc,
  recomputeScLedgerFields,
  isScEarningLedgerRow,
  getScDisplayRemainingHours,
} = require("../utils/serviceCreditBalanceUtils");

const APPLY = process.argv.includes("--apply");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const main = async () => {
  const allRows = await queryAsync(
    `SELECT * FROM service_credit ORDER BY employeeNumber, sc_type, period_year, id`,
  );
  const earnings = await queryAsync(
    `SELECT * FROM sc_earnings WHERE earn_status = 'approved' AND voided_at IS NULL`,
  );

  const earningLedgerIds = allRows.filter(isScEarningLedgerRow).map((r) => r.id);
  if (APPLY && earningLedgerIds.length) {
    const ph = earningLedgerIds.map(() => "?").join(",");
    await queryAsync(
      `UPDATE service_credit SET voided_at = NOW() WHERE id IN (${ph}) AND voided_at IS NULL`,
      earningLedgerIds,
    );
    console.log(`Voided ${earningLedgerIds.length} legacy sc_earning ledger rows.`);
  } else if (earningLedgerIds.length) {
    console.log(`Would void ${earningLedgerIds.length} legacy sc_earning ledger rows.`);
  }

  const activeRows = allRows.filter((r) => !r.voided_at && !isScEarningLedgerRow(r));

  const byKey = new Map();
  for (const r of activeRows) {
    const k = `${r.employeeNumber}|${r.sc_type || "non_commutative"}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }

  let updateCount = 0;
  const diffs = [];

  for (const [, rows] of byKey.entries()) {
    const snapshots = sortScPeriodsAsc(latestScPeriodsByKey(rows));
    let priorRemaining = 0;

    for (const period of snapshots) {
      const empEarnings = earnings.filter(
        (e) =>
          String(e.employee_number) === String(period.employeeNumber) &&
          String(e.sc_type || "non_commutative") === String(period.sc_type || "non_commutative"),
      );

      const idx = snapshots.indexOf(period);
      let otEarned = toNum(period.earned_hours);

      // Deduction snapshot rows may store cumulative earned — prefer OT from rows with OT input
      if (toNum(period.total_ot_hours) <= 0 && otEarned > priorRemaining + 0.001) {
        const otRows = rows.filter(
          (r) =>
            normalizePeriodKey(r) === normalizePeriodKey(period) &&
            toNum(r.total_ot_hours) > 0 &&
            !isScEarningLedgerRow(r),
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

      const recomputed = recomputeScLedgerFields(working, empEarnings);
      const displayRem = getScDisplayRemainingHours(
        { ...working, ...recomputed },
        empEarnings,
      );

      const changed =
        Math.abs(toNum(period.total_hours) - recomputed.total_hours) > 0.001 ||
        Math.abs(toNum(period.remaining_hours) - recomputed.remaining_hours) > 0.001 ||
        Math.abs(toNum(period.earned_hours) - recomputed.earned_hours) > 0.001 ||
        toNum(period.earning_status) !== recomputed.earning_status;

      if (changed) {
        diffs.push({
          id: period.id,
          employee: period.employeeNumber,
          period: `${period.period_year}/${period.period_month ?? "annual"}`,
          before: {
            earned: period.earned_hours,
            total: period.total_hours,
            remaining: period.remaining_hours,
          },
          after: recomputed,
          displayRemaining: displayRem,
        });

        if (APPLY) {
          await queryAsync(
            `UPDATE service_credit SET
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

    const empNum = rows[0]?.employeeNumber;
    const scType = rows[0]?.sc_type || "non_commutative";
    const empEarningsAll = earnings.filter(
      (e) =>
        String(e.employee_number) === String(empNum) &&
        String(e.sc_type || "non_commutative") === String(scType),
    );
    if (APPLY && empEarningsAll.length) {
      const ids = empEarningsAll.map((e) => e.id);
      const ph = ids.map(() => "?").join(",");
      await queryAsync(
        `UPDATE sc_earnings SET is_applied = 1 WHERE id IN (${ph}) AND earn_status = 'approved'`,
        ids,
      );
    }
  }

  console.log(APPLY ? "APPLY mode" : "DRY-RUN mode");
  console.log(`Groups processed: ${byKey.size}`);
  console.log(`Rows with diffs: ${diffs.length}`);
  if (diffs.length) {
    console.log("Sample diffs (up to 10):");
    diffs.slice(0, 10).forEach((d) => console.log(JSON.stringify(d)));
  }
  if (APPLY) console.log(`Rows updated: ${updateCount}`);
  else console.log("Re-run with --apply to persist changes.");
  process.exit(0);
};

const normalizePeriodKey = (p) => {
  const yr = p?.period_year != null ? String(parseInt(String(p.period_year), 10) || "") : "";
  const mRaw = p?.period_month != null ? String(p.period_month).trim() : "";
  const mNum = mRaw !== "" && /^[0-9]+$/.test(mRaw) ? parseInt(mRaw, 10) : NaN;
  const m = Number.isFinite(mNum) ? String(mNum) : mRaw;
  return `${yr}|${m}`;
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
