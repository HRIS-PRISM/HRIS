/**

 * Detect / repair ledger field mismatches on active service_credit period rows.

 * Carry-forward and earned_hours are validated via chronological chain sync

 * (getPriorPeriodScCarryForward + periodOtScHours), not bare recomputeScLedgerFields.

 *

 * Usage:

 *   node backend/scripts/reconcile_sc_period_snapshots.js          # dry-run

 *   node backend/scripts/reconcile_sc_period_snapshots.js --apply  # write fixes

 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../db");

const {

  toNum,

  latestScPeriodsByKey,

  recomputeScLedgerFields,

  isScEarningLedgerRow,

  queryAsync,

  getPriorPeriodScCarryForward,

  periodOtScHours,

  sortScPeriodsAsc,

  loadScChainContextAsync,

  syncScEmployeeCarriesAsync,

} = require("../utils/serviceCreditBalanceUtils");



const APPLY = process.argv.includes("--apply");



const expectedLedgerForPeriod = (periodRow, periods, earnings) => {

  const expectedCarry = getPriorPeriodScCarryForward(

    periods,

    earnings,

    periodRow.period_year,

    periodRow.period_month,

  );

  const hasManualOt = toNum(periodRow.total_ot_hours) > 0;

  const otSc = hasManualOt ? periodOtScHours(periodRow) : 0;

  const expectedEarned = expectedCarry + otSc;

  const working = {

    ...periodRow,

    carried_forward_hours: expectedCarry,

    earned_hours: expectedEarned,

    total_ot_hours: hasManualOt ? toNum(periodRow.total_ot_hours) : 0,

  };

  return recomputeScLedgerFields(working, earnings);

};



const main = async () => {

  const allRows = await queryAsync(

    db,

    `SELECT * FROM service_credit WHERE voided_at IS NULL ORDER BY employeeNumber, sc_type, period_year, id`,

  );



  const activeRows = allRows.filter((r) => !isScEarningLedgerRow(r));

  const byEmpType = new Map();

  for (const row of activeRows) {

    const k = `${row.employeeNumber}|${row.sc_type || "non_commutative"}`;

    if (!byEmpType.has(k)) byEmpType.set(k, []);

    byEmpType.get(k).push(row);

  }



  const mismatches = [];

  let fixCount = 0;



  for (const [key] of byEmpType.entries()) {

    const [emp, scType] = key.split("|");

    const { periods: chainPeriods, earnings } = await loadScChainContextAsync(db, emp, scType);

    let periods = [...chainPeriods];

    const snapshots = sortScPeriodsAsc(latestScPeriodsByKey(periods.filter((r) => !r.voided_at)));



    for (const period of snapshots) {

      const ledger = expectedLedgerForPeriod(period, periods, earnings);

      const fields = [

        "earned_hours",

        "used_hours",

        "total_hours",

        "remaining_hours",

        "carried_forward_hours",

        "earning_status",

      ];

      const diff = {};

      for (const f of fields) {

        if (toNum(period[f]) !== toNum(ledger[f])) {

          diff[f] = { db: toNum(period[f]), expected: toNum(ledger[f]) };

        }

      }

      if (Object.keys(diff).length === 0) continue;



      mismatches.push({

        id: period.id,

        employeeNumber: period.employeeNumber,

        period_year: period.period_year,

        period_month: period.period_month,

        diff,

      });

    }



    if (APPLY && snapshots.length) {

      const synced = await syncScEmployeeCarriesAsync(db, emp, scType);

      if (synced > 0) fixCount += synced;

    }

  }



  const checked = [...byEmpType.values()].reduce(

    (n, rows) => n + latestScPeriodsByKey(rows).length,

    0,

  );



  console.log(`Active period snapshots checked: ${checked}`);

  console.log(`Mismatches found: ${mismatches.length}`);

  if (mismatches.length) {

    mismatches.slice(0, 50).forEach((m) => {

      console.log(

        `  id=${m.id} emp=${m.employeeNumber} ${m.period_year}-${m.period_month ?? "—"}`,

        JSON.stringify(m.diff),

      );

    });

    if (mismatches.length > 50) console.log(`  … and ${mismatches.length - 50} more`);

  }

  if (APPLY) {

    console.log(`Synced carry chain for ${fixCount} period row(s).`);

  } else if (mismatches.length) {

    console.log("Dry-run only. Re-run with --apply to write fixes via syncScEmployeeCarriesAsync.");

  }

};



main()

  .then(() => process.exit(0))

  .catch((e) => {

    console.error(e);

    process.exit(1);

  });

