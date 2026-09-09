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

const isPeriodVoided = (a) => !!(a?.voided_at);

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

/** Chronologically latest active period — skips voided/commuted heads so prior month reopens after void. */
const resolveCurrentDisplayPeriod = (periods = []) => {
  const sorted = sortPeriodsDesc(Array.isArray(periods) ? periods : []);
  return sorted.find((p) => !isPeriodVoided(p) && !isCommutedLocked(p)) ?? null;
};

const assertPeriodIsCurrentDisplay = (periodRow, allRows = []) => {
  const emp = periodRow?.employeeNumber;
  const leaveCode = periodRow?.leave_code;
  const siblings = (Array.isArray(allRows) ? allRows : []).filter(
    (r) =>
      String(r.employeeNumber) === String(emp) &&
      String(r.leave_code || "").trim() === String(leaveCode || "").trim(),
  );
  const display = latestPeriodsByKey(siblings);
  const latest = resolveCurrentDisplayPeriod(display);
  if (!latest) {
    return { ok: false, error: "No active leave assignment period found" };
  }
  if (normalizePeriodKey(periodRow) !== normalizePeriodKey(latest)) {
    return {
      ok: false,
      error: "Only the latest leave assignment period can be voided. Prior periods were superseded.",
    };
  }
  return { ok: true, latest };
};

const getActivePeriods = (periods = []) =>
  latestPeriodsByKey(periods).filter((p) => !isPeriodVoided(p) && !isCommutedLocked(p));

const getLatestPeriodSnapshot = (periods = []) => {
  const list = latestPeriodsByKey(periods);
  if (!list.length) return null;
  return resolveCurrentDisplayPeriod(list);
};

/**
 * FIXED: `assignment.remaining_hours` is already net of every posted
 * leave_credit_usage row — the backend recomputes it from the ledger
 * every time a deduction/restore is applied (see
 * refreshLeaveAssignmentCacheFromLedger in leaveCreditUsageService).
 *
 * Previously this function subtracted usageRows AGAIN on top of that
 * already-net value, which double-counted every HR-approved deduction
 * (e.g. a 5-day balance minus one approved 1-day request would show
 * 2.500 remaining instead of 3.750 — subtracting the same 1 day twice).
 *
 * usageRows is intentionally unused now. Kept as an accepted (ignored)
 * param so existing call sites that still pass it don't need to change.
 */
const computeEffectiveRemaining = (assignment, _usageRows = []) => {
  if (!assignment) return 0;
  if (isCommutedLocked(assignment)) return 0;
  if (isPeriodVoided(assignment)) return 0;
  return Math.max(0, toNum(assignment.remaining_hours));
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

/**
 * Most-recent assignment row strictly before target year/month.
 */
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
        if (isPeriodVoided(p) || isCommutedLocked(p)) return false;
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

/**
 * Opening balance for a new period = prior period's remaining_hours (running ledger).
 * Returns 0 if prior period was commuted, voided, or has no remaining.
 *
 * FIXED: `prior.total_hours` / `prior.used_hours` are already net of the
 * ledger (same reasoning as computeEffectiveRemaining above) — so the old
 * "postDed + usageDelta" math was double-subtracting every approved
 * deduction from the carry-forward opening balance too. This was the root
 * cause of leave types like SL showing a Current Balance that didn't match
 * the prior period's Remaining Balance, while VL happened to look fine
 * because it had no usage history to expose the double-subtraction.
 *
 * We now just read prior.remaining_hours directly, which already IS
 * "what's left in that prior period" (post-deduction + earned).
 *
 * usageRows is intentionally unused now. Kept as an accepted (ignored)
 * param so existing call sites that still pass it don't need to change.
 */
const getPriorPeriodOpeningBalance = (
  assignments = [],
  targetYear,
  targetMonth = null,
  _usageRows = [],
) => {
  const prior = findPriorPeriodSnapshot(assignments, targetYear, targetMonth);
  if (!prior || isCommutedLocked(prior) || isPeriodVoided(prior)) return 0;
  return Math.max(0, toNum(prior.remaining_hours));
};

const getPriorPeriodCarryForwardHours = getPriorPeriodOpeningBalance;

const queryAsync = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

/**
 * FIXED: previously this called getPriorPeriodOpeningBalance for the
 * "opening" amount (post-deduction only, since the old implementation
 * excluded earned hours) and then ADDED priorEarned on top. Now that
 * getPriorPeriodOpeningBalance reads prior.remaining_hours directly —
 * which already includes that prior period's earned balance
 * (remaining_hours = postDeduction + earnedBalance) — adding priorEarned
 * again would double-count it. So we just return the opening balance as-is.
 */
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

  return getPriorPeriodOpeningBalance(assignments, targetYear, targetMonth);
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
        if (isPeriodVoided(p) || isCommutedLocked(p)) return false;
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
      if (e.voided_at || Number(e.voided) === 1) return false;
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
  const voided = isPeriodVoided(period);
  const earnedBalance = voided ? 0 : getApprovedEarningsHoursForPeriod(earningsList, period);
  const remainingBalance = voided ? 0 : Math.max(0, postDeduction + earnedBalance);
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
       AND voided_at IS NULL AND COALESCE(voided, 0) = 0
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
       AND voided_at IS NULL AND COALESCE(voided, 0) = 0
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

  const active = sorted.find((a) => !isPeriodVoided(a) && !isCommutedLocked(a)) ?? sorted[0];

  const remainingHours = isCommutedLocked(active) || isPeriodVoided(active)
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

const LEAVE_LEDGER_ENTRY_LABELS = {
  period_open: "Period opened",
  allocation: "Credits assigned",
  deduction: "Leave deducted",
  restore: "Credits restored",
  earning: "Earnings credited",
  adjustment: "Balance adjusted",
  void: "Period voided",
};

const leaveUsageSourceLabel = (sourceType, remarks = "") => {
  const st = String(sourceType || "").trim().toUpperCase();
  if (st === "LEAVE_REQUEST") return "Leave request approved";
  if (st === "TARDINESS_DEDUCTION") return "Tardiness / undertime";
  if (st === "LEAVE_EARNING") return "Earnings adjustment";
  if (st === "ATTENDANCE") return "Attendance adjustment";
  if (st === "RESTORE") return "Credits restored";
  if (remarks) return String(remarks).slice(0, 80);
  return LEAVE_LEDGER_ENTRY_LABELS.adjustment;
};

/**
 * Build period transaction record for leave assignment (usage lines + earnings).
 */
const buildLeavePeriodTransactionHistory = (
  assignmentRows = [],
  usageRows = [],
  earningsRows = [],
  { employeeNumber, leave_code, period_year, period_semester } = {},
) => {
  const assignments = [...assignmentRows].sort((a, b) => toNum(a.id) - toNum(b.id));
  const activeAssignment =
    assignments.filter((a) => !isPeriodVoided(a) && !isCommutedLocked(a)).pop()
    || assignments.filter((a) => !isPeriodVoided(a)).pop()
    || assignments[assignments.length - 1]
    || null;

  const alloc = activeAssignment ? toNum(activeAssignment.allocated_hours) : 0;
  let used = 0;
  let earned = 0;

  const lines = [];

  if (activeAssignment) {
    lines.push({
      id: `open-${activeAssignment.id}`,
      line_type: "snapshot",
      entry_kind: "period_open",
      event_label: LEAVE_LEDGER_ENTRY_LABELS.period_open,
      created_at: activeAssignment.created_at || activeAssignment.approve_date || null,
      current_balance: alloc,
      deducted: 0,
      post_deduction: alloc,
      earned_balance: 0,
      remaining_balance: alloc,
      is_active: !isPeriodVoided(activeAssignment),
      is_voided: isPeriodVoided(activeAssignment),
    });
  }

  const events = [];
  (Array.isArray(usageRows) ? usageRows : []).forEach((row) => {
    events.push({ kind: "usage", row, at: row.created_at || "" });
  });
  (Array.isArray(earningsRows) ? earningsRows : [])
    .filter((e) => String(e.earn_status || "").toLowerCase() === "approved")
    .forEach((row) => {
      events.push({ kind: "earning", row, at: row.created_at || row.approved_at || "" });
    });

  events.sort((a, b) => {
    const ta = new Date(a.at).getTime() || 0;
    const tb = new Date(b.at).getTime() || 0;
    if (ta !== tb) return ta - tb;
    return toNum(a.row?.id) - toNum(b.row?.id);
  });

  for (const ev of events) {
    if (ev.kind === "usage") {
      const row = ev.row;
      const delta = toNum(row.hours_delta);
      if (Math.abs(delta) < 0.001) continue;
      if (String(row.source_type || "").toLowerCase() === "commutation") continue;

      if (delta < 0) used += -delta;
      else used = Math.max(0, used - delta);

      const postDed = Math.max(0, alloc - used);
      const rem = postDed + earned;

      lines.push({
        id: row.id,
        line_type: "usage",
        entry_kind: delta < 0 ? "deduction" : "restore",
        event_label: leaveUsageSourceLabel(row.source_type, row.remarks),
        source_type: row.source_type,
        created_at: row.created_at,
        voided_at: row.voided_at || null,
        current_balance: alloc,
        deducted: used,
        deducted_delta: delta < 0 ? -delta : 0,
        restore_delta: delta > 0 ? delta : 0,
        post_deduction: postDed,
        earned_balance: earned,
        remaining_balance: rem,
        is_active: !row.voided_at,
        is_voided: !!row.voided_at,
      });
    } else {
      const row = ev.row;
      const delta = toNum(row.earned_hours);
      if (Math.abs(delta) < 0.001) continue;
      earned += delta;
      const postDed = Math.max(0, alloc - used);
      const rem = postDed + earned;
      const voided = !!(row.voided_at || Number(row.voided) === 1);
      lines.push({
        id: `earn-${row.id}`,
        line_type: "earning",
        entry_kind: "earning",
        event_label: LEAVE_LEDGER_ENTRY_LABELS.earning,
        earn_status: row.earn_status,
        created_at: row.created_at || row.approved_at || null,
        voided_at: row.voided_at || null,
        earnings_delta: delta,
        post_deduction: postDed,
        earned_balance: earned,
        remaining_balance: rem,
        is_active: !voided,
        is_voided: voided,
      });
    }
  }

  assignments
    .filter((a) => isPeriodVoided(a))
    .forEach((a) => {
      lines.push({
        id: `void-${a.id}`,
        line_type: "snapshot",
        entry_kind: "void",
        event_label: LEAVE_LEDGER_ENTRY_LABELS.void,
        created_at: a.voided_at,
        voided_at: a.voided_at,
        current_balance: toNum(a.allocated_hours),
        deducted: toNum(a.used_hours),
        post_deduction: toNum(a.total_hours),
        earned_balance: 0,
        remaining_balance: 0,
        is_active: false,
        is_voided: true,
      });
    });

  const ledger_lines_active = lines.filter((l) => !l.is_voided);
  const ledger_lines_voided = lines.filter((l) => l.is_voided);

  return {
    employeeNumber,
    leave_code,
    period_year,
    period_semester,
    assignments,
    ledger_lines: ledger_lines_active,
    ledger_lines_active,
    ledger_lines_voided,
    voided_line_count: ledger_lines_voided.length,
    active_line_count: ledger_lines_active.length,
  };
};

const loadLeavePeriodHistoryAsync = async (
  db,
  employeeNumber,
  leaveCode,
  periodYear,
  periodSemester = null,
) => {
  const emp = String(employeeNumber || "").trim();
  const lc = String(leaveCode || "").trim();
  const py = periodYear;
  const semRaw = periodSemester != null ? String(periodSemester).trim() : "";
  const semNum = semRaw !== "" && /^\d+$/.test(semRaw) ? parseInt(semRaw, 10) : null;
  const semPad = semNum != null ? String(semNum).padStart(2, "0") : null;

  let assignSql = `SELECT * FROM leave_assignment
    WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?) AND period_year <=> ?`;
  const assignParams = [emp, lc, py];
  if (semNum != null) {
    assignSql += " AND period_semester <=> ?";
    assignParams.push(semNum);
  } else if (semRaw) {
    assignSql += " AND CAST(period_semester AS CHAR) <=> ?";
    assignParams.push(semRaw);
  }
  assignSql += " ORDER BY id ASC";

  const assignments = await queryAsync(db, assignSql, assignParams);
  const assignIds = assignments.map((a) => a.id).filter((id) => id != null);

  let usageRows = [];
  if (assignIds.length) {
    usageRows = await queryAsync(
      db,
      `SELECT * FROM leave_credit_usage
       WHERE leave_assignment_id IN (${assignIds.map(() => "?").join(",")})
       ORDER BY created_at ASC, id ASC`,
      assignIds,
    );
  }

  let earnSql = `SELECT * FROM leave_earnings
    WHERE employee_number = ? AND TRIM(leave_code) = TRIM(?) AND period_year <=> ?`;
  const earnParams = [emp, lc, py];
  if (semNum != null) {
    earnSql += " AND (period_month = ? OR period_month = ? OR period_month <=> ?)";
    earnParams.push(semNum, semPad, semNum);
  }
  earnSql += " ORDER BY id ASC";
  const earnings = await queryAsync(db, earnSql, earnParams);

  return buildLeavePeriodTransactionHistory(assignments, usageRows, earnings, {
    employeeNumber: emp,
    leave_code: lc,
    period_year: py,
    period_semester: semNum ?? periodSemester,
  });
};

module.exports = {
  toNum,
  isCommutedLocked,
  isPeriodVoided,
  resolveCurrentDisplayPeriod,
  assertPeriodIsCurrentDisplay,
  normalizePeriodKey,
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
  LEAVE_LEDGER_ENTRY_LABELS,
  buildLeavePeriodTransactionHistory,
  loadLeavePeriodHistoryAsync,
};