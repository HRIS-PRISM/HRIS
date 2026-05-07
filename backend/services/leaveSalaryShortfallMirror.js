const db = require("../db");
const { logAudit } = require("../middleware/auth");

/**
 * After INSERT into leave_salary_shortfall: transaction_table + audit_log (leave_transaction).
 * earnings_audit_log is reserved for leave / SC / CTO ledger rows only (see earningsRoutes auditEarning).
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
    const et = String(entryType || "");
    const noCharge = et === "No Deduction";
    const amountPart = noCharge
      ? `0d (0 hrs) — no salary deduction [${et || "No Deduction"}]`
      : `${Number(shortfallDays).toFixed(3)}d (${Number(shortfallHours).toFixed(3)} hrs)`;
    const txMsg = noCharge
      ? `Recorded salary shortfall registry (audit): ${amountPart} for employee ${targetEmployeeNumber} — ${leaveCode} period ${periodLabel}.${remarks ? ` ${remarks}` : ""}`
      : `Recorded attendance salary charge: ${amountPart} for employee ${targetEmployeeNumber} — ${leaveCode} [${et}] period ${periodLabel}.${remarks ? ` ${remarks}` : ""}`;

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
              noCharge ? "Salary shortfall registry (no deduction)" : "Attendance salary deduction applied",
              "leave_transaction",
              result.insertId,
              targetEmployeeNumber,
              detailsJson,
            );
          } catch (e) {
            console.error("[leave-salary-shortfall] audit_log:", e.message);
          }
        }
        resolve();
      },
    );
  });
}

module.exports = { mirrorAttendanceSalaryShortfallToAuditTrail };
