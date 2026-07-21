const db = require("../db");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parse first YYYY-MM-DD from free text (remarks).
 */
function extractIsoDateFromText(text) {
  if (!text || typeof text !== "string") return null;
  const m = text.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Calendar anchor for a period-level earning when no date in remarks (end of month).
 */
function fallbackDateFromPeriod(periodYear, periodMonth) {
  const y = parseInt(periodYear, 10);
  const mo = parseInt(periodMonth, 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  const last = new Date(y, mo, 0).getDate();
  return `${y}-${String(mo).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function inferResultDate({ remarks, period_year, period_month, explicitDate }) {
  if (explicitDate) {
    const s = String(explicitDate).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const fromRemarks = extractIsoDateFromText(remarks);
  if (fromRemarks) return fromRemarks;
  return fallbackDateFromPeriod(period_year, period_month);
}

function mapLeaveUsed(leaveCode) {
  const c = String(leaveCode || "")
    .trim()
    .toUpperCase();
  if (!c) return "NONE";
  if (c === "HALF_DAY") return "NONE";
  return c.length > 32 ? c.slice(0, 32) : c;
}

function resolveSourceType(entryType, leaveCode) {
  const et = String(entryType || "").toUpperCase();
  if (et.includes("TARDINESS")) return "TARDINESS";
  return "ABSENT";
}

function resolveStatus(originalHours, unpaidHours) {
  const o = Math.max(0, toNum(originalHours));
  const u = Math.max(0, toNum(unpaidHours));
  if (o <= 0) return "ZERO";
  if (u <= 0) return "FULLY_COVERED";
  if (u >= o) return "UNPAID";
  return "PARTIAL";
}

/**
 * Upsert one attendance_result row (source_key must be globally unique).
 */
async function upsertAttendanceResult(payload) {
  const {
    employee_number,
    result_date,
    source_type,
    source_key,
    original_hours,
    leave_used,
    leave_hours_used,
    unpaid_hours,
    paid_hours,
    status,
    leave_earning_id = null,
    sc_earning_id = null,
    cto_earning_id = null,
    deduction_decision_log_id = null,
    remarks = null,
  } = payload;

  if (!employee_number || !result_date || !source_type || !source_key) {
    throw new Error("attendance_result: employee_number, result_date, source_type, source_key are required");
  }

  const sql = `
    INSERT INTO attendance_result (
      employee_number, result_date, source_type, source_key,
      original_hours, leave_used, leave_hours_used, unpaid_hours, paid_hours,
      status, leave_earning_id, sc_earning_id, cto_earning_id, deduction_decision_log_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      employee_number = VALUES(employee_number),
      result_date = VALUES(result_date),
      source_type = VALUES(source_type),
      original_hours = VALUES(original_hours),
      leave_used = VALUES(leave_used),
      leave_hours_used = VALUES(leave_hours_used),
      unpaid_hours = VALUES(unpaid_hours),
      paid_hours = VALUES(paid_hours),
      status = VALUES(status),
      leave_earning_id = VALUES(leave_earning_id),
      sc_earning_id = VALUES(sc_earning_id),
      cto_earning_id = VALUES(cto_earning_id),
      deduction_decision_log_id = VALUES(deduction_decision_log_id),
      remarks = VALUES(remarks),
      processed_at = CURRENT_TIMESTAMP
  `;

  const vals = [
    String(employee_number).trim(),
    result_date,
    source_type,
    String(source_key).slice(0, 160),
    toNum(original_hours),
    String(leave_used || "NONE").slice(0, 32),
    toNum(leave_hours_used),
    toNum(unpaid_hours),
    toNum(paid_hours),
    String(status || "ZERO").slice(0, 32),
    leave_earning_id != null ? parseInt(leave_earning_id, 10) : null,
    sc_earning_id != null ? parseInt(sc_earning_id, 10) : null,
    cto_earning_id != null ? parseInt(cto_earning_id, 10) : null,
    deduction_decision_log_id != null ? parseInt(deduction_decision_log_id, 10) : null,
    remarks != null ? String(remarks).slice(0, 4000) : null,
  ];

  await db.promise().query(sql, vals);
}

/**
 * After leave_earning deduction ledger commit (or no-allocation shortfall).
 */
async function upsertFromLeaveEarningDeduction({
  employee_number,
  leave_earning_id = null,
  leave_credit_usage_id = null,
  period_year,
  period_month,
  remarks,
  leave_code,
  entry_type,
  deduction_hours,
  shortfall_hours,
  explicit_result_date = null,
}) {
  const dh = Math.abs(toNum(deduction_hours));
  const sh = Math.max(0, toNum(shortfall_hours));
  const leavePortion = Math.max(0, dh - sh);
  const result_date =
    inferResultDate({
      remarks,
      period_year,
      period_month,
      explicitDate: explicit_result_date,
    }) || fallbackDateFromPeriod(period_year, period_month);
  if (!result_date) return;

  const leId = leave_earning_id != null ? parseInt(leave_earning_id, 10) : null;
  const lcuId = leave_credit_usage_id != null ? parseInt(leave_credit_usage_id, 10) : null;
  let source_key;
  if (Number.isFinite(leId)) {
    source_key = `LEAVE_EARNING:${leId}`;
  } else if (Number.isFinite(lcuId)) {
    source_key = `LEAVE_CREDIT_USAGE:${lcuId}`;
  } else {
    const emp = String(employee_number || "").trim();
    const y = parseInt(period_year, 10);
    const m = parseInt(period_month, 10);
    const lc = String(leave_code || "").trim();
    const et = String(entry_type || "").trim();
    source_key = `LEAVE_DEDUCTION_NA:${emp}:${Number.isFinite(y) ? y : ""}:${Number.isFinite(m) ? m : ""}:${lc}:${et}`;
  }
  const source_type = resolveSourceType(entry_type, leave_code);
  const status = resolveStatus(dh, sh);
  const lu = mapLeaveUsed(leave_code);
  const leave_used = sh >= dh ? "NONE" : lu;

  await upsertAttendanceResult({
    employee_number,
    result_date,
    source_type,
    source_key,
    original_hours: dh,
    leave_used,
    leave_hours_used: leavePortion,
    unpaid_hours: sh,
    paid_hours: leavePortion,
    status,
    leave_earning_id: Number.isFinite(leId) ? leId : null,
    remarks: remarks || null,
  });
}

/**
 * Service credit deduction: links to sc_earnings row when present, else to service_credit ledger snapshot.
 */
async function upsertFromScEarningDeduction({
  employee_number,
  sc_earning_id,
  service_credit_ledger_id,
  period_year,
  period_month,
  remarks,
  need_hours,
  shortfall_hours,
}) {
  const nh = Math.abs(toNum(need_hours));
  const sh = Math.max(0, toNum(shortfall_hours));
  const leavePortion = Math.max(0, nh - sh);
  const result_date =
    inferResultDate({ remarks, period_year, period_month }) ||
    fallbackDateFromPeriod(period_year, period_month);
  if (!result_date) return;

  const earnId = sc_earning_id != null ? parseInt(sc_earning_id, 10) : NaN;
  const ledId = service_credit_ledger_id != null ? parseInt(service_credit_ledger_id, 10) : NaN;
  let source_key;
  let scEarnCol = null;
  if (Number.isFinite(earnId) && earnId > 0) {
    source_key = `SC_EARNING:${earnId}`;
    scEarnCol = earnId;
  } else if (Number.isFinite(ledId) && ledId > 0) {
    source_key = `SC_SERVICE_CREDIT:${ledId}`;
    scEarnCol = null;
  } else {
    const ts = Date.now();
    source_key = `SC_DEDUCTION_DIRECT:${String(employee_number).trim()}:${period_year}:${period_month}:${ts}`;
    scEarnCol = null;
  }

  await upsertAttendanceResult({
    employee_number,
    result_date,
    source_type: "ABSENT",
    source_key,
    original_hours: nh,
    leave_used: "SC",
    leave_hours_used: leavePortion,
    unpaid_hours: sh,
    paid_hours: leavePortion,
    status: resolveStatus(nh, sh),
    sc_earning_id: scEarnCol,
    remarks: remarks || null,
  });
}

async function upsertFromCtoEarningDeduction({
  employee_number,
  cto_earning_id,
  cto_credit_ledger_id,
  cto_deduction_source_key,
  period_year,
  period_month,
  remarks,
  need_hours,
  shortfall_hours,
}) {
  const nh = Math.abs(toNum(need_hours));
  const sh = Math.max(0, toNum(shortfall_hours));
  const leavePortion = Math.max(0, nh - sh);
  const result_date =
    inferResultDate({ remarks, period_year, period_month }) ||
    fallbackDateFromPeriod(period_year, period_month);
  if (!result_date) return;

  const earnId = cto_earning_id != null ? parseInt(cto_earning_id, 10) : NaN;
  const ledId = cto_credit_ledger_id != null ? parseInt(cto_credit_ledger_id, 10) : NaN;
  let source_key;
  let ctoEarnCol = null;
  if (Number.isFinite(earnId) && earnId > 0) {
    source_key = `CTO_EARNING:${earnId}`;
    ctoEarnCol = earnId;
  } else if (Number.isFinite(ledId) && ledId > 0) {
    source_key = `CTO_SERVICE_CREDIT:${ledId}`;
    ctoEarnCol = null;
  } else if (cto_deduction_source_key != null && String(cto_deduction_source_key).trim() !== "") {
    const k = String(cto_deduction_source_key).trim().slice(0, 120);
    source_key = `CTO_DEDUCTION:${k}`;
    ctoEarnCol = null;
  } else {
    const ts = Date.now();
    source_key = `CTO_DEDUCTION_DIRECT:${String(employee_number).trim()}:${period_year}:${period_month}:${ts}`;
    ctoEarnCol = null;
  }

  await upsertAttendanceResult({
    employee_number,
    result_date,
    source_type: "ABSENT",
    source_key,
    original_hours: nh,
    leave_used: "CTO",
    leave_hours_used: leavePortion,
    unpaid_hours: sh,
    paid_hours: leavePortion,
    status: resolveStatus(nh, sh),
    cto_earning_id: ctoEarnCol,
    remarks: remarks || null,
  });
}

/**
 * Half-day policy: salary path (after DDL + optional LSS).
 */
async function upsertFromHalfDaySalary({
  employee_number,
  leave_date_only,
  hours,
  deduction_decision_log_id,
  remarks = null,
}) {
  const d = String(leave_date_only || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
  const h = Math.max(0, toNum(hours));
  const ddlId = parseInt(deduction_decision_log_id, 10);
  if (!Number.isFinite(ddlId) || ddlId <= 0) return;

  await upsertAttendanceResult({
    employee_number,
    result_date: d,
    source_type: "ABSENT",
    source_key: `HALF_DAY_DDL:${ddlId}`,
    original_hours: h,
    leave_used: "NONE",
    leave_hours_used: 0,
    unpaid_hours: h,
    paid_hours: 0,
    status: resolveStatus(h, h),
    deduction_decision_log_id: ddlId,
    remarks,
  });
}

/**
 * Half-day policy: charged to VL/SL/CTO (fully or partially covered by leave credits).
 */
async function upsertFromHalfDayLeaveCovered({
  employee_number,
  leave_date_only,
  hours,
  charge_to,
  deduction_decision_log_id,
  remarks = null,
}) {
  const d = String(leave_date_only || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
  const h = Math.max(0, toNum(hours));
  const ddlId = parseInt(deduction_decision_log_id, 10);
  if (!Number.isFinite(ddlId) || ddlId <= 0) return;

  await upsertAttendanceResult({
    employee_number,
    result_date: d,
    source_type: "ABSENT",
    source_key: `HALF_DAY_DDL:${ddlId}`,
    original_hours: h,
    leave_used: mapLeaveUsed(charge_to),
    leave_hours_used: h,
    unpaid_hours: 0,
    paid_hours: h,
    status: "FULLY_COVERED",
    deduction_decision_log_id: ddlId,
    remarks,
  });
}

/**
 * Manual POST /api/leave-salary-shortfall (explicit salary charge).
 */
async function upsertFromManualShortfall({
  employee_number,
  period_year,
  period_month,
  shortfall_hours,
  leave_code,
  entry_type,
  remarks,
  lss_insert_id,
  reference_date = null,
}) {
  const sh = Math.max(0, toNum(shortfall_hours));
  const result_date =
    inferResultDate({ remarks, period_year, period_month, explicitDate: reference_date }) ||
    fallbackDateFromPeriod(period_year, period_month);
  if (!result_date) return;

  const id = parseInt(lss_insert_id, 10);
  const source_key = Number.isFinite(id) && id > 0 ? `MANUAL_LSS:${id}` : `MANUAL_LSS:${employee_number}:${Date.now()}`;

  await upsertAttendanceResult({
    employee_number,
    result_date,
    source_type: "ABSENT",
    source_key,
    original_hours: sh,
    leave_used: mapLeaveUsed(leave_code),
    leave_hours_used: 0,
    unpaid_hours: sh,
    paid_hours: 0,
    status: sh > 0 ? "UNPAID" : "ZERO",
    remarks: remarks || null,
  });
}

/** Manual POST: "No Deduction" zero line — stored only in attendance_result. */
async function upsertManualZeroAudit({ employee_number, period_year, period_month, remarks }) {
  const crypto = require("crypto");
  const result_date = fallbackDateFromPeriod(period_year, period_month);
  if (!result_date) return;
  await upsertAttendanceResult({
    employee_number,
    result_date,
    source_type: "ABSENT",
    source_key: `MANUAL_AUDIT:${crypto.randomBytes(10).toString("hex")}`,
    original_hours: 0,
    leave_used: "NONE",
    leave_hours_used: 0,
    unpaid_hours: 0,
    paid_hours: 0,
    status: "ZERO",
    remarks: remarks != null ? String(remarks).slice(0, 4000) : "Manual no-deduction audit",
  });
}

async function voidAttendanceResultsForScDeduction({ sc_earning_id, service_credit_ledger_id } = {}) {
  const earnId = sc_earning_id != null ? parseInt(sc_earning_id, 10) : NaN;
  const ledId = service_credit_ledger_id != null ? parseInt(service_credit_ledger_id, 10) : NaN;
  if (Number.isFinite(earnId) && earnId > 0) {
    await new Promise((resolve, reject) => {
      db.query(
        `DELETE FROM attendance_result WHERE sc_earning_id = ? OR source_key = ?`,
        [earnId, `SC_EARNING:${earnId}`],
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }
  if (Number.isFinite(ledId) && ledId > 0) {
    await new Promise((resolve, reject) => {
      db.query(
        `DELETE FROM attendance_result WHERE source_key = ?`,
        [`SC_SERVICE_CREDIT:${ledId}`],
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }
}

async function voidAttendanceResultsForCtoDeduction({ cto_earning_id, cto_credit_ledger_id } = {}) {
  const earnId = cto_earning_id != null ? parseInt(cto_earning_id, 10) : NaN;
  const ledId = cto_credit_ledger_id != null ? parseInt(cto_credit_ledger_id, 10) : NaN;
  if (Number.isFinite(earnId) && earnId > 0) {
    await new Promise((resolve, reject) => {
      db.query(
        `DELETE FROM attendance_result WHERE cto_earning_id = ? OR source_key = ?`,
        [earnId, `CTO_EARNING:${earnId}`],
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }
  if (Number.isFinite(ledId) && ledId > 0) {
    await new Promise((resolve, reject) => {
      db.query(
        `DELETE FROM attendance_result WHERE source_key = ?`,
        [`CTO_SERVICE_CREDIT:${ledId}`],
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }
}

module.exports = {
  upsertAttendanceResult,
  upsertFromLeaveEarningDeduction,
  upsertFromScEarningDeduction,
  upsertFromCtoEarningDeduction,
  upsertFromHalfDaySalary,
  upsertFromHalfDayLeaveCovered,
  upsertFromManualShortfall,
  upsertManualZeroAudit,
  voidAttendanceResultsForScDeduction,
  voidAttendanceResultsForCtoDeduction,
  inferResultDate,
  extractIsoDateFromText,
};
