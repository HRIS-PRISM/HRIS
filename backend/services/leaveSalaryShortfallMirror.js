const db = require("../db");
const { logAudit } = require("../middleware/auth");

/**
 * After INSERT into leave_salary_shortfall: transaction_table + audit_log + earnings_audit_log.
 * Shared by POST /api/leave-salary-shortfall and leave deduction approval shortfall rows.
 */
function mirrorAttendanceSalaryShortfallToAuditTrail({
  req,
  targetEmployeeNumber,
  insertId,
  y,
  m,
  shortfallDays,
  shortfallHours,
  leaveCode,
  entryType,
  remarks,
}) {
  return new Promise((resolve) => {
    const actor = req.user?.employeeNumber ? String(req.user.employeeNumber) : null;
    const periodLabel = `${y}-${String(m).padStart(2, "0")}`;
    const txMsg = `Recorded attendance salary charge: ${Number(shortfallDays).toFixed(3)}d (${Number(shortfallHours).toFixed(3)} hrs) for employee ${targetEmployeeNumber} — ${leaveCode} [${entryType}] period ${periodLabel}.${remarks ? ` ${remarks}` : ""}`;

    const runEarningsAudit = () => {
      let payloadStr = null;
      try {
        payloadStr = JSON.stringify({
          employee_number: targetEmployeeNumber,
          period_year: y,
          period_month: m,
          shortfall_days: shortfallDays,
          shortfall_hours: shortfallHours,
          leave_code: leaveCode,
          entry_type: entryType,
          remarks,
          leave_salary_shortfall_id: insertId,
        });
      } catch {
        payloadStr = null;
      }
      db.query(
        `INSERT INTO earnings_audit_log (earning_type, earning_id, action, old_status, new_status, actor, notes, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "leave_salary_shortfall",
          parseInt(insertId, 10),
          "attendance_salary_apply",
          null,
          "posted",
          actor,
          `${leaveCode} → salary (${Number(shortfallDays).toFixed(3)}d)`,
          payloadStr,
        ],
        (e2) => {
          if (e2) {
            console.error("[leave-salary-shortfall] earnings_audit_log:", e2.message);
          }
          resolve();
        },
      );
    };

    db.query(
      "INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)",
      [targetEmployeeNumber, txMsg],
      (err, result) => {
        if (err) {
          console.error("[leave-salary-shortfall] transaction_table:", err.message);
        } else if (result?.insertId != null) {
          try {
            const detailsJson = JSON.stringify({
              message: txMsg,
              leave_salary_shortfall_id: insertId,
              shortfall_days: shortfallDays,
              shortfall_hours: shortfallHours,
              leave_code: leaveCode,
              entry_type: entryType,
              period_year: y,
              period_month: m,
            });
            logAudit(
              { employeeNumber: actor || targetEmployeeNumber },
              "Attendance salary deduction applied",
              "leave_transaction",
              result.insertId,
              targetEmployeeNumber,
              detailsJson,
            );
          } catch (e) {
            console.error("[leave-salary-shortfall] audit_log:", e.message);
          }
        }
        runEarningsAudit();
      },
    );
  });
}

module.exports = { mirrorAttendanceSalaryShortfallToAuditTrail };
