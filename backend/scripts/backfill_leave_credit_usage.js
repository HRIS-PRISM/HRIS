/**
 * One-time: seed leave_credit_usage from existing leave_assignment.used_hours
 * so ledger-driven refresh does not zero balances.
 *
 * Run from backend/:  node scripts/backfill_leave_credit_usage.js
 * Requires: migration create_leave_credit_usage.sql applied.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const {
  getPromiseConnection,
  insertCreditUsageLine,
  refreshLeaveAssignmentCacheFromLedger,
  parseDbHours,
} = require("../services/leaveCreditUsageService");

(async () => {
  const conn = await getPromiseConnection();
  let inserted = 0;
  let skipped = 0;
  try {
    const [rows] = await conn.execute(
      `SELECT id, employeeNumber, leave_code, period_year, period_semester, used_hours
       FROM leave_assignment`,
    );
    for (const r of rows) {
      const used = parseDbHours(r.used_hours);
      if (!used || used <= 0) {
        skipped++;
        continue;
      }
      const [cntRows] = await conn.execute(
        `SELECT COUNT(*) AS c FROM leave_credit_usage
         WHERE leave_assignment_id = ? AND voided_at IS NULL`,
        [r.id],
      );
      if ((cntRows[0]?.c || 0) > 0) {
        skipped++;
        continue;
      }
      let pm = null;
      if (r.period_semester != null && String(r.period_semester).trim() !== "") {
        const n = parseInt(String(r.period_semester).replace(/\D/g, "") || "0", 10);
        pm = Number.isFinite(n) && n > 0 ? n : null;
      }
      await insertCreditUsageLine(conn, {
        leave_assignment_id: r.id,
        employee_number: r.employeeNumber,
        leave_code: r.leave_code,
        period_year: r.period_year != null ? parseInt(r.period_year, 10) : null,
        period_month: pm,
        hours_delta: -used,
        source_type: "LEGACY_OPENING",
        source_id: null,
        remarks: "Backfill from leave_assignment.used_hours before ledger rollout",
        created_by: "backfill_leave_credit_usage.js",
      });
      await refreshLeaveAssignmentCacheFromLedger(conn, r.id);
      inserted++;
    }
    console.log(JSON.stringify({ ok: true, inserted, skipped, totalRows: rows.length }, null, 2));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    conn.release();
  }
})();
