const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

/**
 * GET /api/attendance-result?year=2026&month=5&employeeNumber=...
 * Rows in result_date range for calendar month; joins person for display names.
 */
router.get("/", authenticateToken, (req, res) => {
  const { year, month, employeeNumber } = req.query;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return res.status(400).json({ error: "Valid year and month (1-12) are required" });
  }
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let q = `
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
    WHERE ar.result_date >= ? AND ar.result_date <= ?
  `;
  const params = [start, end];
  if (employeeNumber != null && String(employeeNumber).trim() !== "") {
    q += ` AND TRIM(CAST(ar.employee_number AS CHAR)) = TRIM(?)`;
    params.push(String(employeeNumber).trim());
  }
  q += ` ORDER BY ar.result_date DESC, ar.id DESC LIMIT 2000`;

  db.query(q, params, (err, rows) => {
    if (err) {
      if (String(err.message || "").includes("attendance_result")) {
        return res.status(503).json({ error: "attendance_result table not available", detail: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ rows: rows || [], period: { year: y, month: m, start, end } });
  });
});

module.exports = router;
