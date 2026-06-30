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
  const semSource = p?.period_semester ?? p?.period_month;
  const semRaw = semSource != null ? String(semSource).trim() : "";
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
    const sd = semOrder(b.period_semester ?? b.period_month) - semOrder(a.period_semester ?? a.period_month);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
  });

const sortPeriodsAsc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(a.period_year) || 0) - (Number(b.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(a.period_semester ?? a.period_month) - semOrder(b.period_semester ?? b.period_month);
    if (sd !== 0) return sd;
    return toNum(a.id) - toNum(b.id);
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
  if (isCommutedLocked(assignment)) return 0;
  const base = toNum(assignment.remaining_hours);
  const delta = (usageRows || [])
    .filter(
      (u) =>
        !u.voided_at &&
        Number(u.leave_assignment_id) === Number(assignment.id),
    )
    .filter((u) => String(u.source_type || "").toLowerCase() !== "commutation")
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

const isAfterPeriod = (row, targetYear, targetMonth) => {
  const y = Number(row?.period_year);
  const m = semRank(row?.period_semester ?? row?.period_month);
  const ty = parseInt(targetYear, 10);
  if (!Number.isFinite(ty)) return false;
  if (!Number.isFinite(y)) return false;
  if (y > ty) return true;
  if (y < ty) return false;
  const tm = targetMonth != null ? parseInt(targetMonth, 10) : NaN;
  if (!Number.isFinite(tm) || tm <= 0) return false;
  return m > tm;
};

const findPriorPeriodSnapshot = (assignments = [], targetYear, targetMonth = null) => {
  const periods = latestPeriodsByKey(assignments);
  if (!periods.length) return null;

  const ty = parseInt(targetYear, 10);
  const tm =
    targetMonth != null && String(targetMonth).trim() !== ""
      ? parseInt(targetMonth, 10)
      : NaN;

  return (
    periods
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
      })[0] ?? null
  );
};

const getPriorPeriodOpeningBalance = (
  assignments = [],
  targetYear,
  targetMonth = null,
  usageRows = [],
) => {
  const prior = findPriorPeriodSnapshot(assignments, targetYear, targetMonth);
  if (!prior || isCommutedLocked(prior)) return 0;
  const postDed = Math.max(
    0,
    toNum(prior.total_hours) || toNum(prior.allocated_hours) - toNum(prior.used_hours),
  );
  const usageDelta = (usageRows || [])
    .filter(
      (u) =>
        !u.voided_at &&
        Number(u.leave_assignment_id) === Number(prior.id),
    )
    .filter((u) => String(u.source_type || "").toLowerCase() !== "commutation")
    .reduce((s, u) => s + toNum(u.hours_delta), 0);
  return Math.max(0, postDed + usageDelta);
};

const getPriorPeriodCarryForwardHours = getPriorPeriodOpeningBalance;

const queryAsync = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

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

  const opening = getPriorPeriodOpeningBalance(
    assignments,
    targetYear,
    targetMonth,
    usageRows,
  );
  const ty = parseInt(targetYear, 10);
  const tm =
    targetMonth != null && String(targetMonth).trim() !== ""
      ? parseInt(targetMonth, 10)
      : NaN;
  const prior = findPriorPeriodSnapshot(assignments, ty, tm);
  if (!prior || isCommutedLocked(prior)) return opening;
  const priorEarned = await getApprovedEarningsSumForAssignment(db, prior);
  return opening + priorEarned;
};

const getPriorPeriodSnapshotForEmployee = async (
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
  if (!assignments.length) return null;

  const periods = latestPeriodsByKey(assignments);
  const ty = parseInt(targetYear, 10);
  const tm =
    targetMonth != null && String(targetMonth).trim() !== ""
      ? parseInt(targetMonth, 10)
      : NaN;

  return (
    periods
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
      })[0] ?? null
  );
};

const earningMatchesPeriod = (earning, period) => {
  if (!earning || !period) return false;
  const ey = String(parseInt(String(earning.period_year), 10) || "");
  const py = String(parseInt(String(period.period_year), 10) || "");
  if (!ey || !py || ey !== py) return false;
  const emRaw = earning.period_month != null ? String(earning.period_month).trim() : "";
  const em = emRaw !== "" && /^\d+$/.test(emRaw) ? String(parseInt(emRaw, 10)) : emRaw;
  const pmRaw = period.period_semester ?? period.period_month;
  const pms =
    pmRaw != null && String(pmRaw).trim() !== ""
      ? /^\d+$/.test(String(pmRaw).trim())
        ? String(parseInt(String(pmRaw), 10))
        : String(pmRaw).trim()
      : "";
  if (!pms && !em) return true;
  if (!pms || !em) return false;
  return em === pms;
};

const getApprovedEarningsHoursForPeriod = (earningsList, period, { appliedOnly = false } = {}) => {
  if (!period) return 0;
  const list = Array.isArray(earningsList) ? earningsList : [];
  return list
    .filter((e) => {
      if (e.earn_status !== "approved") return false;
      if (appliedOnly && Number(e.is_applied) !== 1) return false;
      return earningMatchesPeriod(e, period);
    })
    .reduce((s, e) => s + toNum(e.earned_hours), 0);
};

const computeAssignmentBalances = (period, { earningsList } = {}) => {
  const usedHrs = toNum(period?.used_hours);
  const currentBalance = toNum(period?.allocated_hours);
  const postDeduction = Math.max(0, toNum(period?.total_hours) || currentBalance - usedHrs);
  const earnedBalance = getApprovedEarningsHoursForPeriod(earningsList, period);
  const remainingBalance = Math.max(0, postDeduction + earnedBalance);
  return {
    currentBalance,
    usedHrs,
    postDeduction,
    earnedBalance,
    remainingBalance,
    carriedHrs: currentBalance,
    adjustedHrs: postDeduction,
    earnedHrs: earnedBalance,
    remHrs: remainingBalance,
  };
};

const getApprovedEarningsSumForAssignment = async (db, assignment) => {
  if (!assignment) return 0;
  const sem = assignment.period_semester ?? assignment.period_month;
  const semPad = sem != null ? String(sem).padStart(2, "0") : null;
  const rows = await queryAsync(
    db,
    `SELECT COALESCE(SUM(earned_hours), 0) AS s FROM leave_earnings
     WHERE employee_number = ? AND TRIM(leave_code) = TRIM(?)
       AND earn_status = 'approved'
       AND period_year = ?
       AND (period_month = ? OR period_month = ? OR (? IS NULL AND period_month IS NULL))`,
    [
      String(assignment.employeeNumber),
      String(assignment.leave_code),
      assignment.period_year,
      sem,
      semPad,
      sem,
    ],
  );
  return toNum(rows[0]?.s);
};

const hasApprovedEarningsForPeriod = async (db, assignment) => {
  const sum = await getApprovedEarningsSumForAssignment(db, assignment);
  return sum > 0;
};

const getAppliedEarningsForAssignment = async (db, assignment) => {
  if (!assignment) return 0;
  const sem = assignment.period_semester ?? assignment.period_month;
  const semPad = sem != null ? String(sem).padStart(2, "0") : null;
  const rows = await queryAsync(
    db,
    `SELECT COALESCE(SUM(earned_hours), 0) AS s FROM leave_earnings
     WHERE employee_number = ? AND TRIM(leave_code) = TRIM(?)
       AND earn_status = 'approved' AND COALESCE(is_applied, 0) = 1
       AND period_year = ?
       AND (period_month = ? OR period_month = ? OR (? IS NULL AND period_month IS NULL))`,
    [
      String(assignment.employeeNumber),
      String(assignment.leave_code),
      assignment.period_year,
      sem,
      semPad,
      sem,
    ],
  );
  return toNum(rows[0]?.s);
};

const recomputeAssignmentLedgerFields = async (db, assignment, usedHours = null) => {
  const alloc = toNum(assignment.allocated_hours);
  const used = usedHours != null ? Math.max(0, toNum(usedHours)) : toNum(assignment.used_hours);
  const carry = toNum(assignment.carried_forward_hours);
  const total = Math.max(0, alloc - used);
  const remaining = total;
  const earningStatus = (await hasApprovedEarningsForPeriod(db, assignment)) ? 1 : 0;
  return {
    allocated_hours: alloc,
    carried_forward_hours: carry,
    used_hours: used,
    total_hours: total,
    remaining_hours: remaining,
    earning_status: earningStatus,
  };
};

/** Backfill carry-forward on rows created empty (e.g. via earnings auto-create). */
const repairPeriodCarryForwardIfEmpty = async (db, assignment) => {
  if (!assignment) return assignment;
  if (toNum(assignment.allocated_hours) > 0 || toNum(assignment.carried_forward_hours) > 0) {
    return assignment;
  }
  const sem = assignment.period_semester ?? assignment.period_month;
  const semNum =
    sem != null && String(sem).trim() !== "" ? parseInt(String(sem), 10) : null;
  const targetMonth = Number.isFinite(semNum) && semNum > 0 ? semNum : null;
  const carryForward = await getPriorPeriodCarryForwardHoursForEmployee(
    db,
    assignment.employeeNumber,
    assignment.leave_code,
    assignment.period_year,
    targetMonth,
  );
  if (carryForward <= 0) return assignment;
  return {
    ...assignment,
    allocated_hours: carryForward,
    carried_forward_hours: carryForward,
  };
};

const buildNewPeriodAssignmentFields = async (
  db,
  {
    employeeNumber,
    leave_code,
    period_year,
    period_semester,
    allocated_hours,
    used_hours = 0,
  },
) => {
  const semNum =
    period_semester != null && String(period_semester).trim() !== ""
      ? parseInt(String(period_semester), 10)
      : null;
  const targetMonth = Number.isFinite(semNum) && semNum > 0 ? semNum : null;

  const carryForward = await getPriorPeriodCarryForwardHoursForEmployee(
    db,
    employeeNumber,
    leave_code,
    period_year,
    targetMonth,
  );

  let allocated = carryForward;
  if (
    allocated_hours !== undefined &&
    allocated_hours !== null &&
    String(allocated_hours).trim() !== ""
  ) {
    allocated = Math.max(0, toNum(allocated_hours), carryForward);
  }

  const used = Math.max(0, toNum(used_hours));
  const working = {
    employeeNumber,
    leave_code,
    allocated_hours: allocated,
    used_hours: used,
    period_year,
    period_semester,
    carried_forward_hours: carryForward,
  };
  return recomputeAssignmentLedgerFields(db, working, used);
};

/**
 * Active leave_assignment row for deductions — latest non-commuted period with balance.
 * Skips empty auto-created rows (allocated=0, remaining=0) when a real assignment exists.
 */
const resolveActiveAssignmentForDeduction = async (db, employeeNumber, leaveCode) => {
  const assignments = await queryAsync(
    db,
    `SELECT * FROM leave_assignment
     WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)`,
    [String(employeeNumber), String(leaveCode)],
  );
  if (!assignments.length) return null;
  const active = sortPeriodsDesc(getActivePeriods(assignments));
  if (!active.length) return null;
  const withBalance = active.filter(
    (a) => toNum(a.allocated_hours) > 0 || toNum(a.remaining_hours) > 0,
  );
  return withBalance[0] ?? active[0] ?? null;
};

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
  const allocatedHours = toNum(active.allocated_hours);

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
  sortPeriodsAsc,
  getActivePeriods,
  getLatestPeriodSnapshot,
  computeEffectiveRemaining,
  sumDedupedRemainingHours,
  getLeaveTypeStatsActive,
  semRank,
  isBeforePeriod,
  isAfterPeriod,
  getPriorPeriodOpeningBalance,
  getPriorPeriodCarryForwardHours,
  getPriorPeriodCarryForwardHoursForEmployee,
  getPriorPeriodSnapshotForEmployee,
  earningMatchesPeriod,
  getApprovedEarningsHoursForPeriod,
  computeAssignmentBalances,
  getAppliedEarningsForAssignment,
  getApprovedEarningsSumForAssignment,
  hasApprovedEarningsForPeriod,
  recomputeAssignmentLedgerFields,
  repairPeriodCarryForwardIfEmpty,
  buildNewPeriodAssignmentFields,
  resolveActiveAssignmentForDeduction,
};
