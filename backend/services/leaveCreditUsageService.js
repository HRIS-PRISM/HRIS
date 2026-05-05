/**
 * Ledger-backed leave credit usage: hours_delta negative = consume, positive = restore.
 * leave_assignment.used_hours / remaining_hours are refreshed from SUM(-hours_delta) when ledger rows exist.
 */

const pool = require("../db");

const parseDbHours = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const s = String(val).trim();
  if (!s) return 0;
  if (s.includes(":")) {
    const [hh, mm, ss] = s.split(":");
    const h = Number(hh) || 0;
    const m = Number(mm) || 0;
    const sec = Number(ss) || 0;
    return h + m / 60 + sec / 3600;
  }
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const q = async (conn, sql, params = []) => {
  const [rows] = await conn.execute(sql, params);
  return rows;
};

const getPromiseConnection = async () => {
  const p = pool.promise();
  return p.getConnection();
};

/**
 * Recompute used_hours = SUM(-hours_delta) for non-voided lines; remaining = total_hours - used.
 * Skips if no active ledger rows (avoids zeroing legacy rows before backfill).
 */
const refreshLeaveAssignmentCacheFromLedger = async (conn, leaveAssignmentId) => {
  const id = parseInt(leaveAssignmentId, 10);
  if (!Number.isFinite(id)) return { skipped: true };

  const cntRows = await q(
    conn,
    `SELECT COUNT(*) AS c FROM leave_credit_usage
     WHERE leave_assignment_id = ? AND voided_at IS NULL`,
    [id],
  );
  const activeCount = parseInt(cntRows[0]?.c, 10) || 0;
  if (activeCount === 0) return { skipped: true };

  const laRows = await q(
    conn,
    `SELECT id, total_hours FROM leave_assignment WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!laRows.length) return { skipped: true };

  const total = Math.max(0, parseDbHours(laRows[0].total_hours));
  const sumRows = await q(
    conn,
    `SELECT COALESCE(SUM(-hours_delta), 0) AS u
     FROM leave_credit_usage
     WHERE leave_assignment_id = ? AND voided_at IS NULL`,
    [id],
  );
  const used = Math.max(0, parseDbHours(sumRows[0]?.u));
  const remaining = Math.max(0, total - used);

  await q(
    conn,
    `UPDATE leave_assignment SET used_hours = ?, remaining_hours = ? WHERE id = ?`,
    [used, remaining, id],
  );
  return { used, remaining, total };
};

const insertCreditUsageLine = async (conn, row) => {
  const {
    leave_assignment_id,
    employee_number,
    leave_code,
    period_year = null,
    period_month = null,
    hours_delta,
    source_type,
    source_id = null,
    remarks = null,
    metadata = null,
    created_by = null,
  } = row;

  const sid = source_id != null ? parseInt(source_id, 10) : null;
  const [result] = await conn.execute(
    `INSERT INTO leave_credit_usage (
      leave_assignment_id, employee_number, leave_code, period_year, period_month,
      hours_delta, source_type, source_id, remarks, metadata, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      leave_assignment_id,
      String(employee_number || ""),
      String(leave_code || ""),
      period_year,
      period_month,
      Number(hours_delta),
      String(source_type || "UNKNOWN"),
      Number.isFinite(sid) ? sid : null,
      remarks || null,
      metadata != null ? JSON.stringify(metadata) : null,
      created_by || null,
    ],
  );
  return result && result.insertId != null ? result.insertId : null;
};

/** Returns leave_assignment ids that had active lines before void. */
const voidCreditUsageBySource = async (conn, source_type, sourceId) => {
  const sid = parseInt(sourceId, 10);
  if (!String(source_type) || !Number.isFinite(sid)) return [];

  const before = await q(
    conn,
    `SELECT DISTINCT leave_assignment_id FROM leave_credit_usage
     WHERE source_type = ? AND source_id = ? AND voided_at IS NULL`,
    [String(source_type), sid],
  );
  const ids = (before || []).map((r) => r.leave_assignment_id);

  if (ids.length) {
    await q(
      conn,
      `UPDATE leave_credit_usage SET voided_at = NOW()
       WHERE source_type = ? AND source_id = ? AND voided_at IS NULL`,
      [String(source_type), sid],
    );
  }
  return ids;
};

const fetchLedgerSumForAssignment = async (conn, leaveAssignmentId) => {
  const id = parseInt(leaveAssignmentId, 10);
  if (!Number.isFinite(id)) return { activeLines: 0, usedFromLedger: 0 };
  const cntRows = await q(
    conn,
    `SELECT COUNT(*) AS c FROM leave_credit_usage
     WHERE leave_assignment_id = ? AND voided_at IS NULL`,
    [id],
  );
  const sumRows = await q(
    conn,
    `SELECT COALESCE(SUM(-hours_delta), 0) AS u
     FROM leave_credit_usage
     WHERE leave_assignment_id = ? AND voided_at IS NULL`,
    [id],
  );
  return {
    activeLines: parseInt(cntRows[0]?.c, 10) || 0,
    usedFromLedger: Math.max(0, parseDbHours(sumRows[0]?.u)),
  };
};

module.exports = {
  parseDbHours,
  getPromiseConnection,
  q,
  refreshLeaveAssignmentCacheFromLedger,
  insertCreditUsageLine,
  voidCreditUsageBySource,
  fetchLedgerSumForAssignment,
};
