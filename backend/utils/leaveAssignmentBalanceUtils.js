/**
 * Mirrors frontend/src/components/LEAVE/leaveAssignmentBalanceUtils.js
 * so HR deductions, suggestions, and logs match Assignment Management balances.
 */

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const isCommutedLocked = (a) => {
  if (!a) return false;
  if (a.is_commuted === true || Number(a.commuted) === 1) return true;
  if (a.commutation_id != null) return true;
  const rem = toNum(a.remaining_hours);
  const used = toNum(a.used_hours);
  const tot = toNum(a.total_hours);
  return tot > 0 && rem <= 0 && used >= tot;
};

const normalizePeriodKey = (p) => {
  const yr =
    p?.period_year != null
      ? String(parseInt(String(p.period_year), 10) || "").trim()
      : "";
  const semRaw =
    p?.period_semester != null ? String(p.period_semester).trim() : "";
  const semNum = semRaw !== "" && /^[0-9]+$/.test(semRaw) ? parseInt(semRaw, 10) : NaN;
  const sem = Number.isFinite(semNum) ? String(semNum) : semRaw;
  return `${yr}|${sem}`;
};

const semOrder = (s) => {
  const raw = String(s ?? "").trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  if (raw.toLowerCase().includes("2nd")) return 2;
  if (raw.toLowerCase().includes("1st")) return 1;
  return 0;
};

const latestPeriodsByKey = (periods = []) => {
  const list = Array.isArray(periods) ? periods : [];
  const map = new Map();
  for (const a of list) {
    const key = normalizePeriodKey(a);
    const prev = map.get(key);
    const id = Number(a?.id);
    const prevId = Number(prev?.id);
    if (!prev || (Number.isFinite(id) && (!Number.isFinite(prevId) || id > prevId))) {
      map.set(key, a);
    }
  }
  return Array.from(map.values());
};

const sortPeriodsDesc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(b.period_semester) - semOrder(a.period_semester);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
  });

const getActivePeriods = (periods = []) =>
  latestPeriodsByKey(periods).filter((p) => !isCommutedLocked(p));

const getLatestPeriodSnapshot = (periods = []) => {
  const list = latestPeriodsByKey(periods);
  if (!list.length) return null;
  return sortPeriodsDesc(list)[0] ?? null;
};

const computeEffectiveRemaining = (assignment, usageRows = []) => {
  if (!assignment) return 0;
  const base = toNum(assignment.remaining_hours);
  const delta = (usageRows || [])
    .filter(
      (u) =>
        !u.voided_at &&
        Number(u.leave_assignment_id) === Number(assignment.id),
    )
    .reduce((s, u) => s + toNum(u.hours_delta), 0);
  return Math.max(0, base + delta);
};

const sumDedupedRemainingHours = (assignments, usageRows = []) =>
  getActivePeriods(assignments).reduce(
    (s, a) => s + computeEffectiveRemaining(a, usageRows),
    0,
  );

const semRank = (s) => {
  const raw = String(s ?? "").trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  const v = raw.toLowerCase();
  if (v.includes("2nd")) return 2;
  if (v.includes("1st")) return 1;
  return 0;
};

const isBeforePeriod = (row, targetYear, targetMonth) => {
  const y = Number(row?.period_year);
  const m = semRank(row?.period_semester ?? row?.period_month);
  const ty = parseInt(targetYear, 10);
  if (!Number.isFinite(ty)) return false;
  if (!Number.isFinite(y)) return true;
  if (y < ty) return true;
  if (y > ty) return false;
  const tm = targetMonth != null ? parseInt(targetMonth, 10) : NaN;
  if (!Number.isFinite(tm) || tm <= 0) return false;
  return m < tm;
};

/**
 * Carry-forward = effective remaining from the most-recent prior period only.
 * If that period was commuted, carry is 0 (do not fall back to older periods).
 */
const getPriorPeriodCarryForwardHours = (
  assignments = [],
  targetYear,
  targetMonth = null,
  usageRows = [],
) => {
  const periods = latestPeriodsByKey(assignments);
  if (!periods.length) return 0;

  const ty = parseInt(targetYear, 10);
  const tm =
    targetMonth != null && String(targetMonth).trim() !== ""
      ? parseInt(targetMonth, 10)
      : NaN;

  const prior = periods
    .filter((p) => {
      if (!Number.isFinite(ty)) return true;
      if (!Number.isFinite(tm) || tm <= 0) {
        return (Number(p.period_year) || 0) < ty;
      }
      return isBeforePeriod(p, ty, tm);
    })
    .sort((a, b) => {
      const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
      if (yd !== 0) return yd;
      const sd =
        semRank(b.period_semester ?? b.period_month) -
        semRank(a.period_semester ?? a.period_month);
      if (sd !== 0) return sd;
      return toNum(b.id) - toNum(a.id);
    })[0];

  if (!prior || isCommutedLocked(prior)) return 0;
  return computeEffectiveRemaining(prior, usageRows);
};

const queryAsync = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

/** Load assignments + usage ledger and compute carry-forward for a new period. */
const getPriorPeriodCarryForwardHoursForEmployee = async (
  db,
  employeeNumber,
  leaveCode,
  targetYear,
  targetMonth = null,
) => {
  const assignments = await queryAsync(
    db,
    `SELECT * FROM leave_assignment
     WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)`,
    [String(employeeNumber), String(leaveCode)],
  );
  if (!assignments.length) return 0;

  const ids = latestPeriodsByKey(assignments).map((a) => a.id).filter(Boolean);
  let usageRows = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    usageRows = await queryAsync(
      db,
      `SELECT * FROM leave_credit_usage
       WHERE leave_assignment_id IN (${placeholders}) AND voided_at IS NULL`,
      ids,
    );
  }

  return getPriorPeriodCarryForwardHours(
    assignments,
    targetYear,
    targetMonth,
    usageRows,
  );
};

/** Same balance as Assignment Management grid (latest active period only). */
const getLeaveTypeStatsActive = (assignments, usageRows = []) => {
  const empty = {
    remainingHours: 0,
    totalHours: 0,
    usedHours: 0,
    allocatedHours: 0,
    activeAssignmentId: null,
  };
  if (!assignments?.length) return empty;

  const sorted = sortPeriodsDesc(latestPeriodsByKey(assignments));
  if (!sorted.length) return empty;

  const active = sorted.find((a) => !isCommutedLocked(a)) ?? sorted[0];

  const remainingHours = isCommutedLocked(active)
    ? 0
    : computeEffectiveRemaining(active, usageRows);

  const totalHours = toNum(active.total_hours);
  const usedHours = toNum(active.used_hours);
  const carriedHours = toNum(active.carried_forward_hours);
  const allocatedHours =
    toNum(active.allocated_hours) || Math.max(0, totalHours - carriedHours);

  return {
    remainingHours,
    totalHours,
    usedHours,
    allocatedHours,
    activeAssignmentId: active.id != null ? Number(active.id) : null,
  };
};

module.exports = {
  toNum,
  isCommutedLocked,
  latestPeriodsByKey,
  sortPeriodsDesc,
  getActivePeriods,
  getLatestPeriodSnapshot,
  computeEffectiveRemaining,
  sumDedupedRemainingHours,
  getLeaveTypeStatsActive,
  semRank,
  isBeforePeriod,
  getPriorPeriodCarryForwardHours,
  getPriorPeriodCarryForwardHoursForEmployee,
};
