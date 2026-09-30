/**
 * Ledger-backed leave credit usage: hours_delta negative = consume, positive = restore.
 * leave_assignment.used_hours / remaining_hours refreshed from ledger (running-ledger model).
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
 * Applied, approved, non-voided POSITIVE earnings for the assignment's period, read on
 * `conn` so uncommitted changes in the caller's transaction are visible. Negative earning
 * rows (deductions) are excluded: they are applied through leave_credit_usage, so adding
 * them here would subtract them twice.
 */
const sumAppliedEarningsForAssignment = async (conn, assignment) => {
  const sem = assignment.period_semester ?? null;
  const semStr = sem != null && String(sem).trim() !== "" ? String(sem).trim() : null;
  const semPad = semStr != null ? semStr.padStart(2, "0") : null;
  const rows = await q(
    conn,
    `SELECT COALESCE(SUM(earned_hours), 0) AS s FROM leave_earnings
     WHERE employee_number = ? AND TRIM(leave_code) = TRIM(?)
       AND earn_status = 'approved' AND COALESCE(is_applied, 0) = 1
       AND voided_at IS NULL AND COALESCE(voided, 0) = 0
       AND earned_hours > 0
       AND period_year <=> ?
       AND (period_month = ? OR period_month = ? OR (? IS NULL AND period_month IS NULL))
     LOCK IN SHARE MODE`,
    [
      String(assignment.employeeNumber),
      String(assignment.leave_code),
      assignment.period_year ?? null,
      semStr,
      semPad,
      semStr,
    ],
  );
  return Math.max(0, parseDbHours(rows[0]?.s));
};

/**
 * Running ledger refresh (always runs, including when every ledger line has been voided,
 * so the cache never keeps a stale used_hours):
 *   used_hours      = SUM(-hours_delta) excluding commutation
 *   total_hours     = allocated_hours - used_hours
 *   remaining_hours = total_hours + applied approved earnings for period
 */
const refreshLeaveAssignmentCacheFromLedger = async (conn, leaveAssignmentId) => {
  const id = parseInt(leaveAssignmentId, 10);
  if (!Number.isFinite(id)) return { skipped: true };

  // Locking reads throughout: they see the latest committed rows (e.g. a period row created
  // by another connection after this transaction's snapshot) and serialize concurrent refreshes.
  const laRows = await q(
    conn,
    `SELECT * FROM leave_assignment WHERE id = ? LIMIT 1 FOR UPDATE`,
    [id],
  );
  if (!laRows.length) return { skipped: true };

  const assignment = laRows[0];
  if (Number(assignment.commuted) === 1) {
    return { skipped: true, commuted: true };
  }

  const alloc = Math.max(0, parseDbHours(assignment.allocated_hours));
  const sumRows = await q(
    conn,
    `SELECT COUNT(*) AS line_count, COALESCE(SUM(CASE WHEN voided_at IS NULL THEN -hours_delta ELSE 0 END), 0) AS u
     FROM leave_credit_usage
     WHERE leave_assignment_id = ?
       AND LOWER(source_type) <> 'commutation'
     LOCK IN SHARE MODE`,
    [id],
  );
  // A period that has never had a ledger line predates the ledger: keep its stored
  // used_hours instead of resetting it to 0 (which would inflate the balance).
  const hasLedgerHistory = (parseInt(sumRows[0]?.line_count, 10) || 0) > 0;
  const used = hasLedgerHistory
    ? Math.max(0, parseDbHours(sumRows[0]?.u))
    : Math.max(0, parseDbHours(assignment.used_hours));
  const total = Math.max(0, alloc - used);
  const earned = await sumAppliedEarningsForAssignment(conn, assignment);
  const remaining = Math.max(0, total + earned);

  await q(
    conn,
    `UPDATE leave_assignment SET used_hours = ?, total_hours = ?, remaining_hours = ?, earning_status = ? WHERE id = ?`,
    [used, total, remaining, earned > 0 ? 1 : Number(assignment.earning_status) || 0, id],
  );
  return { used, remaining, total, allocated: alloc };
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
     WHERE leave_assignment_id = ? AND voided_at IS NULL
       AND LOWER(source_type) <> 'commutation'`,
    [id],
  );
  const sumRows = await q(
    conn,
    `SELECT COALESCE(SUM(-hours_delta), 0) AS u
     FROM leave_credit_usage
     WHERE leave_assignment_id = ? AND voided_at IS NULL
       AND LOWER(source_type) <> 'commutation'`,
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
  sumAppliedEarningsForAssignment,
  insertCreditUsageLine,
  voidCreditUsageBySource,
  fetchLedgerSumForAssignment,
};
