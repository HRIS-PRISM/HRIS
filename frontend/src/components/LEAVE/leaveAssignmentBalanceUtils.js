export const toNum = (v) => {

  if (v === null || v === undefined || v === '') return 0;

  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));

  return Number.isFinite(n) ? n : 0;

};



// Priority: explicit flag → commutation_id presence → legacy heuristic

export const isCommutedLocked = (a) => {

  if (!a) return false;

  if (a.is_commuted === true || Number(a.commuted) === 1) return true;

  if (a.commutation_id != null) return true;

  const rem = toNum(a.remaining_hours);

  const used = toNum(a.used_hours);

  const tot  = toNum(a.total_hours);

  return tot > 0 && rem <= 0 && used >= tot;

};



export const normalizePeriodKey = (p) => {

  const yr = p?.period_year != null

    ? String(parseInt(String(p.period_year), 10) || '').trim()

    : '';

  const semSource = p?.period_semester ?? p?.period_month;

  const semRaw = semSource != null ? String(semSource).trim() : '';

  const semNum = semRaw !== '' && /^[0-9]+$/.test(semRaw) ? parseInt(semRaw, 10) : NaN;

  const sem = Number.isFinite(semNum) ? String(semNum) : semRaw;

  return `${yr}|${sem}`;

};



const semOrder = (s) => {

  const raw = String(s ?? '').trim();

  if (!raw) return 0;

  if (/^\d+$/.test(raw)) { const n = parseInt(raw, 10); return Number.isFinite(n) ? n : 0; }

  if (raw.toLowerCase().includes('2nd')) return 2;

  if (raw.toLowerCase().includes('1st')) return 1;

  return 0;

};



// Deduplicate by (period_year, period_semester), keeping highest id per key.

export const latestPeriodsByKey = (periods = []) => {

  const list = Array.isArray(periods) ? periods : [];

  const map = new Map();

  for (const a of list) {

    const key    = normalizePeriodKey(a);

    const prev   = map.get(key);

    const id     = Number(a?.id);

    const prevId = Number(prev?.id);

    if (!prev || (Number.isFinite(id) && (!Number.isFinite(prevId) || id > prevId))) {

      map.set(key, a);

    }

  }

  return Array.from(map.values());

};



// Sort newest-first: year desc → semester desc → id desc.

export const sortPeriodsDesc = (periods) =>

  [...periods].sort((a, b) => {

    const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);

    if (yd !== 0) return yd;

    const sd = semOrder(b.period_semester ?? b.period_month) - semOrder(a.period_semester ?? a.period_month);

    if (sd !== 0) return sd;

    return toNum(b.id) - toNum(a.id);

  });



export const sortPeriodsAsc = (periods) =>

  [...periods].sort((a, b) => {

    const yd = (Number(a.period_year) || 0) - (Number(b.period_year) || 0);

    if (yd !== 0) return yd;

    const sd = semOrder(a.period_semester ?? a.period_month) - semOrder(b.period_semester ?? b.period_month);

    if (sd !== 0) return sd;

    return toNum(a.id) - toNum(b.id);

  });



export const getActivePeriods = (periods = []) =>

  latestPeriodsByKey(periods).filter((p) => !isCommutedLocked(p));



export const getLatestPeriodSnapshot = (periods = []) => {

  const list = latestPeriodsByKey(periods);

  if (!list.length) return null;

  return sortPeriodsDesc(list)[0] ?? null;

};



export const computeEffectiveRemaining = (assignment, usageRows = []) => {

  if (!assignment) return 0;

  if (isCommutedLocked(assignment)) return 0;

  const base  = toNum(assignment.remaining_hours);

  const delta = (usageRows || [])

    .filter((u) => !u.voided_at && Number(u.leave_assignment_id) === Number(assignment.id))

    .filter((u) => String(u.source_type || '').toLowerCase() !== 'commutation')

    .reduce((s, u) => s + toNum(u.hours_delta), 0);

  return Math.max(0, base + delta);

};



export const sumDedupedRemainingHours = (assignments, usageRows = []) =>

  getActivePeriods(assignments).reduce(

    (s, a) => s + computeEffectiveRemaining(a, usageRows),

    0,

  );



/** Numeric month/semester rank for period ordering (mirrors earnings roll-forward). */

export const semRank = (s) => {

  const raw = String(s ?? '').trim();

  if (!raw) return 0;

  if (/^\d+$/.test(raw)) {

    const n = parseInt(raw, 10);

    return Number.isFinite(n) ? n : 0;

  }

  const v = raw.toLowerCase();

  if (v.includes('2nd')) return 2;

  if (v.includes('1st')) return 1;

  return 0;

};



export const isBeforePeriod = (row, targetYear, targetMonth) => {

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



export const isAfterPeriod = (row, targetYear, targetMonth) => {

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

  const tm = targetMonth != null && String(targetMonth).trim() !== ''

    ? parseInt(targetMonth, 10)

    : NaN;



  return periods

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

      const sd = semRank(b.period_semester ?? b.period_month)

        - semRank(a.period_semester ?? a.period_month);

      if (sd !== 0) return sd;

      return toNum(b.id) - toNum(a.id);

    })[0] ?? null;

};



/**

 * Opening balance for a new period = prior period remaining_hours (running ledger).

 * Returns 0 if prior period was commuted or has no remaining.

 */

export const getPriorPeriodOpeningBalance = (

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

    .filter((u) => String(u.source_type || '').toLowerCase() !== 'commutation')

    .reduce((s, u) => s + toNum(u.hours_delta), 0);

  return Math.max(0, postDed + usageDelta);

};



/**

 * Prior period opening + approved earnings for that prior period (matches backend carry-forward).

 */

export const getPriorPeriodCarryForwardHours = (

  assignments = [],

  targetYear,

  targetMonth = null,

  usageRows = [],

  earningsList = [],

) => {

  const opening = getPriorPeriodOpeningBalance(

    assignments,

    targetYear,

    targetMonth,

    usageRows,

  );

  const prior = getPriorPeriodSnapshot(assignments, targetYear, targetMonth);

  if (!prior) return opening;

  const priorEarned = filterApprovedEarningsForPeriod(earningsList, prior)

    .reduce((s, e) => s + toNum(e.earned_hours), 0);

  return Math.max(0, opening + priorEarned);

};



/** Prior period row used for opening balance (null if none or commuted). */

export const getPriorPeriodSnapshot = (

  assignments = [],

  targetYear,

  targetMonth = null,

) => {

  const prior = findPriorPeriodSnapshot(assignments, targetYear, targetMonth);

  if (!prior || isCommutedLocked(prior)) return null;

  return prior;

};



/** Match a leave_earnings row to a leave_assignment period (year + month/semester). */

export const earningMatchesPeriod = (earning, period) => {

  if (!earning || !period) return false;

  const ey = String(parseInt(String(earning.period_year), 10) || '');

  const py = String(parseInt(String(period.period_year), 10) || '');

  if (!ey || !py || ey !== py) return false;

  const emRaw = earning.period_month != null ? String(earning.period_month).trim() : '';

  const em = emRaw !== '' && /^\d+$/.test(emRaw) ? String(parseInt(emRaw, 10)) : emRaw;

  const pmRaw = period.period_semester ?? period.period_month;

  const pms = pmRaw != null && String(pmRaw).trim() !== ''

    ? (/^\d+$/.test(String(pmRaw).trim()) ? String(parseInt(String(pmRaw), 10)) : String(pmRaw).trim())

    : '';

  if (!pms && !em) return true;

  if (!pms || !em) return false;

  return em === pms;

};



/** Approved earnings hours for one period — Earned Balance column source of truth. */

export const getApprovedEarningsHoursForPeriod = (earningsList, period, { appliedOnly = false } = {}) => {

  if (!period) return 0;

  const list = Array.isArray(earningsList) ? earningsList : [];

  return list

    .filter((e) => {

      if (e.earn_status !== 'approved') return false;

      if (appliedOnly && Number(e.is_applied) !== 1) return false;

      return earningMatchesPeriod(e, period);

    })

    .reduce((s, e) => s + toNum(e.earned_hours), 0);

};



/**

 * Running-ledger balance breakdown for one assignment period.

 * allocated_hours = Current Balance; total_hours = Post-Deduction; remaining = total + earned.

 */

export const computeAssignmentBalances = (period, { earningsList } = {}) => {

  const usedHrs = toNum(period?.used_hours);

  const currentBalance = toNum(period?.allocated_hours);

  const postDeduction = Math.max(0, toNum(period?.total_hours) || (currentBalance - usedHrs));

  const earnedBalance = getApprovedEarningsHoursForPeriod(earningsList, period);

  const remainingBalance = Math.max(0, postDeduction + earnedBalance);



  return {

    currentBalance,

    usedHrs,

    postDeduction,

    earnedBalance,

    remainingBalance,

    // Legacy aliases for gradual migration

    carriedHrs: currentBalance,

    adjustedHrs: postDeduction,

    earnedHrs: earnedBalance,

    remHrs: remainingBalance,

  };

};



export const filterApprovedEarningsForPeriod = (earningsList, period) => {

  if (!period) return [];

  const list = Array.isArray(earningsList) ? earningsList : [];

  return list.filter((e) => {

    if (e.earn_status !== "approved") return false;

    if (

      period.employeeNumber != null &&

      String(e.employee_number) !== String(period.employeeNumber)

    ) return false;

    if (

      period.leave_code != null &&

      String(e.leave_code).trim() !== String(period.leave_code).trim()

    ) return false;

    return earningMatchesPeriod(e, period);

  });

};



/** Display remaining = post-deduction + approved earnings for that period (from leave_earnings). */

export const getDisplayRemainingHours = (period, earningsList = []) => {

  if (!period || isCommutedLocked(period)) return 0;

  const matched = filterApprovedEarningsForPeriod(earningsList, period);

  return computeAssignmentBalances(period, { earningsList: matched }).remainingBalance;

};



/**

 * Remaining balance for the Assign Leave form.

 * Existing period row: post-deduction + approved earnings for that row.

 * New period (no row yet): prior carry-forward + approved earnings for the target period.

 */

export const getAssignFormRemainingHours = ({

  existingPeriod = null,

  carryOverHours = 0,

  earningsList = [],

  targetYear = null,

  targetMonth = null,

  employeeNumber = null,

  leaveCode = null,

} = {}) => {

  if (existingPeriod) {

    return getDisplayRemainingHours(existingPeriod, earningsList);

  }



  const carry = Math.max(0, toNum(carryOverHours));

  const ty = targetYear != null ? parseInt(String(targetYear), 10) : NaN;

  const tm = targetMonth != null && String(targetMonth).trim() !== ''

    ? parseInt(String(targetMonth), 10)

    : NaN;



  if (!Number.isFinite(ty) || !Number.isFinite(tm) || tm <= 0) {

    return carry;

  }



  const pseudoPeriod = {

    period_year: ty,

    period_semester: tm,

    period_month: tm,

    employeeNumber,

    leave_code: leaveCode,

  };



  const earned = filterApprovedEarningsForPeriod(earningsList, pseudoPeriod)

    .reduce((s, e) => s + toNum(e.earned_hours), 0);



  return Math.max(0, carry + earned);

};



/** Latest active period display remaining for one leave type. */

export const getLeaveTypeDisplayRemaining = (periods = [], earningsList = []) => {

  const deduped = latestPeriodsByKey(periods);

  if (!deduped.length) return 0;

  const sorted = sortPeriodsDesc(deduped);

  const active = sorted.find((p) => !isCommutedLocked(p)) ?? sorted[0];

  if (!active) return 0;

  return getDisplayRemainingHours(active, earningsList);

};



export const getLeaveTypeStatsActive = (assignments, usageRows = [], earningsList = []) => {

  const empty = { remainingHours: 0, totalHours: 0, usedHours: 0, allocatedHours: 0 };

  if (!assignments?.length) return empty;



  const sorted = sortPeriodsDesc(latestPeriodsByKey(assignments));

  if (!sorted.length) return empty;



  const active = sorted.find((a) => !isCommutedLocked(a)) ?? sorted[0];



  const remainingHours = isCommutedLocked(active)

    ? 0

    : earningsList?.length

      ? getDisplayRemainingHours(active, earningsList)

      : computeEffectiveRemaining(active, usageRows);



  const totalHours     = toNum(active.total_hours);

  const usedHours      = toNum(active.used_hours);

  const allocatedHours = toNum(active.allocated_hours);



  return { remainingHours, totalHours, usedHours, allocatedHours };

};


