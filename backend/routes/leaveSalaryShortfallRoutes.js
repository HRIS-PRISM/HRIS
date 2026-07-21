const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { mirrorAttendanceSalaryShortfallToAuditTrail } = require("../services/leaveSalaryShortfallMirror");
const attendanceWriter = require("../services/attendanceResultWriter");
const { notifyEarningsChanged } = require("../socket/socketService");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * GET /api/leave-salary-shortfall?year=2026&month=1&employeeNumber=...
 * - rows: leave_salary_shortfall (legacy / unpaid-only rows)
 * - attendanceResults: attendance_result rows for the calendar month (primary registry data)
 * - salaryHalfDayPolicyLog: every half-day policy apply (VL / CTO / SALARY_DEDUCTION, etc.) in the period,
 *   with optional link to HALF_DAY_POLICY_SALARY mirror row when charge was salary (same matching rules as before).
 */
router.get("/", authenticateToken, (req, res) => {
  const { year, month, employeeNumber } = req.query;
  let q = `
    SELECT
      lss.*,
      pt.lastName AS emp_last_name,
      pt.firstName AS emp_first_name,
      pt.middleName AS emp_middle_name,
      CASE
        WHEN etc.id IS NOT NULL THEN CONCAT(etc.parentGroup, ' | ', etc.typeName)
        WHEN ec.customCategory IS NOT NULL AND TRIM(ec.customCategory) != '' THEN CONCAT('Other (', ec.customCategory, ')')
        ELSE 'Unassigned'
      END AS employment_category_label
    FROM leave_salary_shortfall lss
    LEFT JOIN person_table pt
      ON TRIM(CAST(pt.agencyEmployeeNum AS CHAR)) = TRIM(CAST(lss.employee_number AS CHAR))
    LEFT JOIN employment_category ec
      ON TRIM(CAST(ec.employeeNumber AS CHAR)) = TRIM(CAST(lss.employee_number AS CHAR))
    LEFT JOIN employment_type_config etc
      ON etc.id = ec.employmentCategory
    WHERE 1=1`;
  const params = [];
  if (employeeNumber) {
    q += ` AND lss.employee_number = ?`;
    params.push(String(employeeNumber).trim());
  }
  if (year != null && String(year).trim() !== "") {
    const y = parseInt(year, 10);
    if (Number.isFinite(y)) {
      q += ` AND lss.period_year = ?`;
      params.push(y);
    }
  }
  if (month != null && String(month).trim() !== "") {
    const m = parseInt(month, 10);
    if (Number.isFinite(m)) {
      q += ` AND lss.period_month = ?`;
      params.push(m);
    }
  }
  q += ` ORDER BY lss.created_at DESC, lss.id DESC LIMIT 1000`;

  db.query(q, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const baseRows = rows || [];

    let q2 = `
      SELECT
        ddl.id AS decision_log_id,
        ddl.employeeNumber AS employee_number,
        ddl.leave_date,
        ddl.decision,
        ddl.final_applied_json,
        ddl.created_at,
        pt.lastName AS emp_last_name,
        pt.firstName AS emp_first_name,
        pt.middleName AS emp_middle_name,
        CASE
          WHEN etc.id IS NOT NULL THEN CONCAT(etc.parentGroup, ' | ', etc.typeName)
          WHEN ec.customCategory IS NOT NULL AND TRIM(ec.customCategory) != '' THEN CONCAT('Other (', ec.customCategory, ')')
          ELSE 'Unassigned'
        END AS employment_category_label,
        lss_match.id AS shortfall_registry_id,
        lss_match.negative_balance_days AS registry_negative_balance_days,
        lss_match.shortfall_days AS registry_shortfall_days,
        lss_match.shortfall_hours AS registry_shortfall_hours
      FROM deduction_decision_log ddl
      LEFT JOIN person_table pt
        ON TRIM(CAST(pt.agencyEmployeeNum AS CHAR)) = TRIM(CAST(ddl.employeeNumber AS CHAR))
      LEFT JOIN employment_category ec
        ON TRIM(CAST(ec.employeeNumber AS CHAR)) = TRIM(CAST(ddl.employeeNumber AS CHAR))
      LEFT JOIN employment_type_config etc
        ON etc.id = ec.employmentCategory
      LEFT JOIN leave_salary_shortfall lss_match
        ON lss_match.id = (
          SELECT MAX(lss.id)
          FROM leave_salary_shortfall lss
          WHERE TRIM(CAST(lss.employee_number AS CHAR)) = TRIM(CAST(ddl.employeeNumber AS CHAR))
            AND lss.period_year = YEAR(ddl.leave_date)
            AND lss.period_month = MONTH(ddl.leave_date)
            AND TRIM(IFNULL(lss.entry_type, '')) = 'HALF_DAY_POLICY_SALARY'
            AND lss.remarks IS NOT NULL
            AND INSTR(lss.remarks, DATE_FORMAT(ddl.leave_date, '%Y-%m-%d')) > 0
        )
      WHERE ddl.decision_source = 'half_day_policy_manual_apply'
        AND ddl.decision IN ('accepted', 'overridden')
        AND ddl.leave_date IS NOT NULL`;
    const params2 = [];
    if (employeeNumber) {
      q2 += ` AND TRIM(CAST(ddl.employeeNumber AS CHAR)) = TRIM(?)`;
      params2.push(String(employeeNumber).trim());
    }
    if (year != null && String(year).trim() !== "") {
      const y = parseInt(year, 10);
      if (Number.isFinite(y)) {
        q2 += ` AND YEAR(ddl.leave_date) = ?`;
        params2.push(y);
      }
    }
    if (month != null && String(month).trim() !== "") {
      const m = parseInt(month, 10);
      if (Number.isFinite(m)) {
        q2 += ` AND MONTH(ddl.leave_date) = ?`;
        params2.push(m);
      }
    }
    q2 += `
      ORDER BY ddl.leave_date DESC, ddl.id DESC
      LIMIT 500`;

    db.query(q2, params2, (err2, logRows) => {
      if (err2) {
        console.error("[leave-salary-shortfall] salaryHalfDayPolicyLog:", err2.message);
        return res.json({ rows: baseRows, salaryHalfDayPolicyLog: [], attendanceResults: [] });
      }

      let yAr = null;
      let mAr = null;
      if (year != null && String(year).trim() !== "") yAr = parseInt(year, 10);
      if (month != null && String(month).trim() !== "") mAr = parseInt(month, 10);
      if (!Number.isFinite(yAr) || !Number.isFinite(mAr) || mAr < 1 || mAr > 12) {
        return res.json({
          rows: baseRows,
          salaryHalfDayPolicyLog: logRows || [],
          attendanceResults: [],
        });
      }
      const startAr = `${yAr}-${String(mAr).padStart(2, "0")}-01`;
      const lastD = new Date(yAr, mAr, 0).getDate();
      const endAr = `${yAr}-${String(mAr).padStart(2, "0")}-${String(lastD).padStart(2, "0")}`;
      let q3 = `
        SELECT
          ar.*,
          pt.lastName AS emp_last_name,
          pt.firstName AS emp_first_name,
          pt.middleName AS emp_middle_name,
          CASE
            WHEN etc.id IS NOT NULL THEN CONCAT(etc.parentGroup, ' | ', etc.typeName)
            WHEN ec.customCategory IS NOT NULL AND TRIM(ec.customCategory) != '' THEN CONCAT('Other (', ec.customCategory, ')')
            ELSE 'Unassigned'
          END AS employment_category_label
        FROM attendance_result ar
        LEFT JOIN person_table pt
          ON TRIM(CAST(pt.agencyEmployeeNum AS CHAR)) = TRIM(CAST(ar.employee_number AS CHAR))
        LEFT JOIN employment_category ec
          ON TRIM(CAST(ec.employeeNumber AS CHAR)) = TRIM(CAST(ar.employee_number AS CHAR))
        LEFT JOIN employment_type_config etc
          ON etc.id = ec.employmentCategory
        WHERE ar.result_date >= ? AND ar.result_date <= ?`;
      const params3 = [startAr, endAr];
      if (employeeNumber) {
        q3 += ` AND TRIM(CAST(ar.employee_number AS CHAR)) = TRIM(?)`;
        params3.push(String(employeeNumber).trim());
      }
      q3 += ` ORDER BY ar.result_date DESC, ar.id DESC LIMIT 2000`;

      db.query(q3, params3, (err3, arRows) => {
        if (err3) {
          if (!String(err3.message || "").includes("attendance_result")) {
            console.error("[leave-salary-shortfall] attendance_result:", err3.message);
          }
          return res.json({
            rows: baseRows,
            salaryHalfDayPolicyLog: logRows || [],
            attendanceResults: [],
          });
        }
        res.json({
          rows: baseRows,
          salaryHalfDayPolicyLog: logRows || [],
          attendanceResults: arRows || [],
        });
      });
    });
  });
});

/**
 * POST /api/leave-salary-shortfall
 * Explicit attendance deduction charged to salary (no leave balance movement).
 * Zero / "No Deduction" lines are written only to attendance_result.
 */
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const emp = String(req.body.employeeNumber || req.body.employee_number || "").trim();
  const y = parseInt(req.body.periodYear ?? req.body.period_year, 10);
  const m = parseInt(req.body.periodMonth ?? req.body.period_month, 10);
  const shortfallDays = toNum(req.body.shortfallDays ?? req.body.shortfall_days);
  let leaveCode = String(req.body.leaveCode || req.body.leave_code || "SALARY").trim();
  if (leaveCode.length > 32) leaveCode = leaveCode.slice(0, 32);
  let entryType = req.body.entryType || req.body.entry_type || "ATTENDANCE_SALARY_DEDUCTION";
  entryType = String(entryType).trim().slice(0, 64) || "ATTENDANCE_SALARY_DEDUCTION";
  const remarks = req.body.remarks != null ? String(req.body.remarks).slice(0, 4000) : null;
  const referenceDate =
    req.body.referenceDate != null
      ? String(req.body.referenceDate).slice(0, 10)
      : req.body.reference_date != null
        ? String(req.body.reference_date).slice(0, 10)
        : null;

  if (!emp) return res.status(400).json({ error: "employeeNumber is required" });
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return res.status(400).json({ error: "Invalid period_year / period_month" });
  }
  const entryNorm = String(entryType || "").trim();
  const isNoDeductionManual = entryNorm === "No Deduction";
  if (shortfallDays < 0) {
    return res.status(400).json({ error: "shortfallDays cannot be negative" });
  }
  if (shortfallDays <= 0 && !isNoDeductionManual) {
    return res.status(400).json({
      error:
        "shortfallDays must be greater than zero, or set entryType to \"No Deduction\" for a zero audit line",
    });
  }

  if (isNoDeductionManual && shortfallDays <= 0) {
    try {
      await attendanceWriter.upsertManualZeroAudit({
        employee_number: emp,
        period_year: y,
        period_month: m,
        remarks,
      });
      try {
        notifyEarningsChanged("updated", {
          module: "salary-shortfall",
          employeeNumber: emp,
          period_year: y,
          period_month: m,
        });
      } catch (_e) {}
      return res.json({ ok: true, mode: "attendance_result_only" });
    } catch (e) {
      return res.status(500).json({ error: e.message || "attendance_result insert failed" });
    }
  }

  const shortfallDaysOut = shortfallDays;
  const shortfallHours = shortfallDaysOut * 8;
  const negativeBalanceDays = -shortfallDaysOut;

  try {
    const [ins] = await db.promise().query(
      `INSERT INTO leave_salary_shortfall (
        employee_number, period_year, period_month,
        negative_balance_days, shortfall_days, shortfall_hours,
        leave_code, entry_type, leave_earning_id, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [emp, y, m, negativeBalanceDays, shortfallDaysOut, shortfallHours, leaveCode, entryType, remarks],
    );
    const insertId = ins.insertId;
    try {
      await attendanceWriter.upsertFromManualShortfall({
        employee_number: emp,
        period_year: y,
        period_month: m,
        shortfall_hours: shortfallHours,
        leave_code: leaveCode,
        entry_type: entryType,
        remarks,
        lss_insert_id: insertId,
        reference_date: referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate) ? referenceDate : null,
      });
    } catch (e) {
      console.error("[leave-salary-shortfall] attendance_result (manual):", e.message);
    }
    mirrorAttendanceSalaryShortfallToAuditTrail({
      req,
      targetEmployeeNumber: emp,
      insertId,
      y,
      m,
      shortfallDays: shortfallDaysOut,
      shortfallHours,
      leaveCode,
      entryType,
      remarks,
    }).finally(() => {
      try {
        notifyEarningsChanged("created", {
          module: "salary-shortfall",
          employeeNumber: emp,
          period_year: y,
          period_month: m,
          id: insertId,
        });
      } catch (_e) {}
      res.json({ ok: true, id: insertId });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
