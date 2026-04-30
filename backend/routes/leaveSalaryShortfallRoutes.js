const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { mirrorAttendanceSalaryShortfallToAuditTrail } = require("../services/leaveSalaryShortfallMirror");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * GET /api/leave-salary-shortfall?year=2026&month=1&employeeNumber=...
 * Lists rows charged to salary when leave deductions exceeded available balance.
 * Joins person + employment category for display.
 */
router.get("/", authenticateToken, requireAdmin, (req, res) => {
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
    res.json({ rows: rows || [] });
  });
});

/**
 * POST /api/leave-salary-shortfall
 * Explicit attendance deduction charged to salary (no leave balance movement).
 */
router.post("/", authenticateToken, requireAdmin, (req, res) => {
  const emp = String(req.body.employeeNumber || req.body.employee_number || "").trim();
  const y = parseInt(req.body.periodYear ?? req.body.period_year, 10);
  const m = parseInt(req.body.periodMonth ?? req.body.period_month, 10);
  const shortfallDays = toNum(req.body.shortfallDays ?? req.body.shortfall_days);
  let leaveCode = String(req.body.leaveCode || req.body.leave_code || "SALARY").trim();
  if (leaveCode.length > 32) leaveCode = leaveCode.slice(0, 32);
  let entryType = req.body.entryType || req.body.entry_type || "ATTENDANCE_SALARY_DEDUCTION";
  entryType = String(entryType).trim().slice(0, 64) || "ATTENDANCE_SALARY_DEDUCTION";
  const remarks = req.body.remarks != null ? String(req.body.remarks).slice(0, 4000) : null;

  if (!emp) return res.status(400).json({ error: "employeeNumber is required" });
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return res.status(400).json({ error: "Invalid period_year / period_month" });
  }
  if (shortfallDays <= 0) return res.status(400).json({ error: "shortfallDays must be greater than zero" });

  const shortfallHours = shortfallDays * 8;
  const negativeBalanceDays = -shortfallDays;

  db.query(
    `INSERT INTO leave_salary_shortfall (
      employee_number, period_year, period_month,
      negative_balance_days, shortfall_days, shortfall_hours,
      leave_code, entry_type, leave_earning_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [emp, y, m, negativeBalanceDays, shortfallDays, shortfallHours, leaveCode, entryType, remarks],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const insertId = result.insertId;
      mirrorAttendanceSalaryShortfallToAuditTrail({
        req,
        targetEmployeeNumber: emp,
        insertId,
        y,
        m,
        shortfallDays,
        shortfallHours,
        leaveCode,
        entryType,
        remarks,
      }).finally(() => {
        res.json({ ok: true, id: insertId });
      });
    },
  );
});

module.exports = router;
