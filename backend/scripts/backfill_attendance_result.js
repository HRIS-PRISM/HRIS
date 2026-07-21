/**
 * One-time: seed attendance_result from historical leave_salary_shortfall rows
 * with positive shortfall_hours (excludes "No Deduction" audit lines).
 * Uses source_key LEGACY_LSS:{id} so reruns are idempotent.
 *
 * Run from backend/:  node scripts/backfill_attendance_result.js
 * Requires: attendance_result table (migration or index.js bootstrap).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../db");
const {
  upsertAttendanceResult,
  inferResultDate,
  extractIsoDateFromText,
} = require("../services/attendanceResultWriter");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function mapLeaveUsed(code) {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  return c.length > 32 ? c.slice(0, 32) : c || "NONE";
}

function resolveStatus(originalHours, unpaidHours) {
  const o = Math.max(0, toNum(originalHours));
  const u = Math.max(0, toNum(unpaidHours));
  if (o <= 0) return "ZERO";
  if (u <= 0) return "FULLY_COVERED";
  if (u >= o) return "UNPAID";
  return "PARTIAL";
}

(async () => {
  let done = 0;
  let skipped = 0;
  let errors = 0;
  try {
    const [rows] = await db.promise().query(
      `SELECT lss.*
       FROM leave_salary_shortfall lss
       WHERE lss.shortfall_hours > 0
         AND TRIM(IFNULL(lss.entry_type, '')) <> 'No Deduction'
       ORDER BY lss.id ASC`,
    );

    for (const lss of rows || []) {
      const sourceKey = `LEGACY_LSS:${lss.id}`;
      const [exRows] = await db.promise().query(
        `SELECT id FROM attendance_result WHERE source_key = ? LIMIT 1`,
        [sourceKey],
      );
      if (exRows && exRows[0]) {
        skipped++;
        continue;
      }

      let resultDate = null;
      if (lss.reference_date) {
        const s = String(lss.reference_date).slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !s.startsWith("0000")) resultDate = s;
      }
      if (!resultDate) resultDate = extractIsoDateFromText(lss.remarks);
      if (!resultDate) {
        resultDate = inferResultDate({
          remarks: lss.remarks,
          period_year: lss.period_year,
          period_month: lss.period_month,
        });
      }
      if (!resultDate) {
        skipped++;
        continue;
      }

      const policyH = lss.policy_hours != null ? toNum(lss.policy_hours) : 0;
      const unpaid = toNum(lss.shortfall_hours);
      const original = policyH > 0 ? policyH : Math.max(unpaid, toNum(lss.shortfall_days) * 8);
      const leaveHours = Math.max(0, original - unpaid);
      const leaveUsed = unpaid >= original ? "NONE" : mapLeaveUsed(lss.leave_code);

      try {
        await upsertAttendanceResult({
          employee_number: String(lss.employee_number || "").trim(),
          result_date: resultDate,
          source_type: "ABSENT",
          source_key: sourceKey,
          original_hours: original,
          leave_used: leaveUsed,
          leave_hours_used: leaveHours,
          unpaid_hours: unpaid,
          paid_hours: leaveHours,
          status: resolveStatus(original, unpaid),
          leave_earning_id: lss.leave_earning_id != null ? parseInt(lss.leave_earning_id, 10) : null,
          remarks: lss.remarks != null ? String(lss.remarks).slice(0, 4000) : `Backfill from leave_salary_shortfall id=${lss.id}`,
        });
        done++;
      } catch (e) {
        errors++;
        console.error(`[backfill] id=${lss.id}:`, e.message);
      }
    }

    console.log(`attendance_result backfill: inserted/updated ${done}, skipped ${skipped}, errors ${errors}`);
  } catch (e) {
    console.error("[backfill] fatal:", e.message);
    process.exitCode = 1;
  } finally {
    db.end(() => process.exit(process.exitCode || 0));
  }
})();
