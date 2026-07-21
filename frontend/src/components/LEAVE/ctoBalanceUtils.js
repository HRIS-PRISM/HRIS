/**
 * CTO balance utilities — mirrors serviceCreditBalanceUtils for CTO.
 */

export const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const normalizeCtoPeriodKey = (p) => {
  const yr =
    p?.period_year != null
      ? String(parseInt(String(p.period_year), 10) || "").trim()
      : "";
  const mRaw = p?.period_month != null ? String(p.period_month).trim() : "";
  const mNum = mRaw !== "" && /^[0-9]+$/.test(mRaw) ? parseInt(mRaw, 10) : NaN;
  const m = Number.isFinite(mNum) ? String(mNum) : mRaw;
  return `${yr}|${m}`;
};

export const normalizeCtoPeriodMonth = (month) => {
  if (month == null || month === "") return "";
  const n = parseInt(month, 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? String(n) : String(month).trim();
};

/** Numeric month for period equality checks; null = annual / no month. */
const ctoPeriodMonthMatchValue = (pm) => {
  const s = normalizeCtoPeriodMonth(pm);
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

const semOrder = (s) => {
  const raw = String(s ?? "").trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const isCtoPeriodVoided = (period) => !!(period?.voided_at);

export const isCtoCommutedLocked = (period) =>
  !!(period?.commuted) || Number(period?.commuted) === 1;

/** True when a newer calendar period exists in the display list (balance rolled forward). */
export const isCtoPeriodSuperseded = (period, displayRecords = []) => {
  if (!period) return false;
  const latest = resolveCtoCurrentDisplayPeriod(displayRecords);
  if (!latest) return false;
  return normalizeCtoPeriodKey(period) !== normalizeCtoPeriodKey(latest);
};

/** Chronologically latest active period — skips voided/commuted heads so prior month reopens after void. */
export const resolveCtoCurrentDisplayPeriod = (displayRecords = []) => {
  const sorted = sortCtoPeriodsDesc(Array.isArray(displayRecords) ? displayRecords : []);
  return sorted.find((p) => !isCtoPeriodVoided(p) && !isCtoCommutedLocked(p)) ?? null;
};

const CTO_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ctoPeriodMonthName = (month) => {
  const m = parseInt(month, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return "";
  return CTO_MONTH_NAMES[m - 1] || "";
};

/** Next newer period that received this period's balance (sorted desc list). */
export const getCtoPeriodForwardTarget = (period, displayRecords = []) => {
  if (!period) return null;
  const sorted = sortCtoPeriodsDesc(Array.isArray(displayRecords) ? displayRecords : []);
  const idx = sorted.findIndex(
    (p) => normalizeCtoPeriodKey(p) === normalizeCtoPeriodKey(period),
  );
  if (idx <= 0) return null;
  return sorted[idx - 1] ?? null;
};

/** e.g. "January" or "2026" when the next period has no month. */
export const getCtoPeriodForwardToLabel = (period, displayRecords = []) => {
  const target = getCtoPeriodForwardTarget(period, displayRecords);
  if (!target) return null;
  const mo = ctoPeriodMonthName(target.period_month);
  if (mo) return mo;
  if (target.period_year != null) return String(target.period_year);
  return null;
};

export const latestCtoPeriodsByKey = (periods = []) => {
  const list = (Array.isArray(periods) ? periods : []).filter(
    (p) => !isCtoPeriodVoided(p) && !isCtoCommutedLocked(p) && !isCtoEarningLedgerRow(p),
  );
  const map = new Map();
  for (const row of list) {
    const key = normalizeCtoPeriodKey(row);
    const prev = map.get(key);
    const id = Number(row?.id);
    const prevId = Number(prev?.id);
    if (!prev || (Number.isFinite(id) && (!Number.isFinite(prevId) || id > prevId))) {
      map.set(key, row);
    }
  }
  return Array.from(map.values());
};

/** Latest row per period key including voided rows (for display / transparency). */
export const latestCtoPeriodsByKeyForDisplay = (periods = []) => {
  const list = Array.isArray(periods) ? periods : [];
  const map = new Map();
  for (const row of list) {
    const key = normalizeCtoPeriodKey(row);
    const prev = map.get(key);
    const id = Number(row?.id);
    const prevId = Number(prev?.id);
    if (!prev || (Number.isFinite(id) && (!Number.isFinite(prevId) || id > prevId))) {
      map.set(key, row);
    }
  }
  return Array.from(map.values());
};

/** Pick display/save head when legacy duplicate stubs exist (newer id but zero used). */
export const pickActiveCtoPeriodSnapshot = (rows = []) => {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!list.length) return null;
  const byId = list.reduce((best, r) => (!best || toNum(r.id) > toNum(best.id) ? r : best));
  const byUsed = list.reduce((best, r) =>
    (!best || toNum(r.used_hours) > toNum(best.used_hours) ? r : best),
  );
  if (Number(byId.id) === Number(byUsed.id)) return byId;
  return {
    ...byId,
    used_hours: byUsed.used_hours,
    total_hours: byUsed.total_hours,
    remaining_hours: byUsed.remaining_hours,
  };
};

/**
 * UI display rows: one card per calendar period.
 * - Active month: latest non-voided snapshot (undo voids appear only in OT history panel).
 * - Fully voided/commuted month (Void period): latest voided/commuted row for audit.
 */
export const ctoRecordsForDisplay = (periods = []) => {
  const list = Array.isArray(periods) ? periods : [];
  const byKey = new Map();
  for (const row of list) {
    const key = normalizeCtoPeriodKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const display = [];
  for (const rows of byKey.values()) {
    const activeRows = rows.filter((r) => !isCtoPeriodVoided(r) && !isCtoCommutedLocked(r));
    if (activeRows.length > 0) {
      display.push(pickActiveCtoPeriodSnapshot(activeRows));
      continue;
    }
    const latest = rows.reduce((best, r) => (toNum(r.id) > toNum(best?.id) ? r : best));
    if (latest) display.push(latest);
  }

  return sortCtoPeriodsDesc(display);
};

export const sortCtoPeriodsDesc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(b.period_month) - semOrder(a.period_month);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
  });

export const sortCtoPeriodsAsc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(a.period_year) || 0) - (Number(b.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(a.period_month) - semOrder(b.period_month);
    if (sd !== 0) return sd;
    return toNum(a.id) - toNum(b.id);
  });

export const isCtoEarningVoided = (earning) =>
  !!(earning?.voided_at) || Number(earning?.voided) === 1;

export const ctoEarningPeriodKeyMatches = (earning, period) => {
  if (!earning || !period) return false;
  const ey = String(parseInt(String(earning.period_year), 10) || "");
  const py = String(parseInt(String(period.period_year), 10) || "");
  if (!ey || !py || ey !== py) return false;

  const emRaw = earning.period_month != null ? String(earning.period_month).trim() : "";
  const em = emRaw !== "" && /^\d+$/.test(emRaw) ? String(parseInt(emRaw, 10)) : emRaw;
  const pmRaw = period.period_month;
  const pm =
    pmRaw != null && String(pmRaw).trim() !== ""
      ? /^\d+$/.test(String(pmRaw).trim())
        ? String(parseInt(String(pmRaw), 10))
        : String(pmRaw).trim()
      : "";

  if (!pm && !em) return true;
  if (!pm || !em) return false;
  return em === pm;
};

export const ctoEarningMatchesPeriod = (earning, period) => {
  if (!earning || !period) return false;
  if (isCtoEarningVoided(earning)) return false;
  if (
    period.employeeNumber != null &&
    String(earning.employee_number) !== String(period.employeeNumber)
  ) {
    return false;
  }
  return ctoEarningPeriodKeyMatches(earning, period);
};

export const filterApprovedCtoEarningsForPeriod = (earningsList, period) => {
  if (!period) return [];
  const list = Array.isArray(earningsList) ? earningsList : [];
  return list.filter((e) => {
    if (isCtoEarningVoided(e)) return false;
    if (e.earn_status !== "approved") return false;
    if (
      period.employeeNumber != null &&
      String(e.employee_number) !== String(period.employeeNumber)
    ) {
      return false;
    }
    return ctoEarningMatchesPeriod(e, period);
  });
};

export const getApprovedCtoEarningsHoursForPeriod = (earningsList, period) => {
  if (!period) return 0;
  return filterApprovedCtoEarningsForPeriod(earningsList, period).reduce(
    (s, e) => s + toNum(e.earned_hours),
    0,
  );
};

export const filterVoidedCtoEarningsForPeriod = (earningsList, period) => {
  if (!period) return [];
  const list = Array.isArray(earningsList) ? earningsList : [];
  return list.filter((e) => {
    if (!isCtoEarningVoided(e)) return false;
    if (e.earn_status !== "approved") return false;
    if (
      period.employeeNumber != null &&
      String(e.employee_number) !== String(period.employeeNumber)
    ) {
      return false;
    }
    return ctoEarningPeriodKeyMatches(e, period);
  });
};

export const getVoidedCtoEarningsHoursForPeriod = (earningsList, period) => {
  if (!period) return 0;
  return filterVoidedCtoEarningsForPeriod(earningsList, period).reduce(
    (s, e) => s + toNum(e.earned_hours),
    0,
  );
};

/** Commuted amount from leave_commutation join (mirrors Leave Assignment getCommutedHours). */
export const getCtoCommutedHours = (period) => {
  if (!period) return 0;
  const hrs = toNum(period.commuted_hours);
  if (hrs > 0) return hrs;
  const days = toNum(period.commuted_days);
  if (days > 0) return days * 8;
  return 0;
};

export const computeCtoBalances = (period, { earningsList, chainRecords } = {}) => {
  const isVoided = isCtoPeriodVoided(period);
  const isCommuted = isCtoCommutedLocked(period);
  const previousBalance = chainRecords?.length
    ? getPriorPeriodCtoCarryForward(
        chainRecords,
        earningsList,
        period?.period_year,
        period?.period_month,
      )
    : toNum(period?.carried_forward_hours);
  const ctoCreditsEarned = toNum(period?.ot_hours);
  const otEarned = toNum(period?.earned_hours);
  const totalCtoCredits = Math.max(0, previousBalance + ctoCreditsEarned);
  const usedHrs = toNum(period?.used_hours);
  const totalHours = Math.max(0, toNum(period?.total_hours) || otEarned - usedHrs);
  const earnedBalance = isVoided ? 0 : getApprovedCtoEarningsHoursForPeriod(earningsList, period);
  const voidedEarnedBalance = getVoidedCtoEarningsHoursForPeriod(earningsList, period);

  if (isCommuted) {
    const storedUsed = toNum(period?.used_hours);
    const commutedHrs = getCtoCommutedHours(period) || totalCtoCredits;
    const displayUsedHrs =
      commutedHrs > 0 && storedUsed >= commutedHrs
        ? Math.max(0, storedUsed - commutedHrs)
        : storedUsed;
    return {
      previousBalance,
      ctoCreditsEarned,
      totalCtoCredits,
      otEarned,
      usedHrs: displayUsedHrs,
      totalHours: 0,
      earnedBalance: 0,
      voidedEarnedBalance: 0,
      isVoided,
      isCommuted,
      remainingBalance: 0,
      commutedHrs,
      carriedHrs: previousBalance,
      earnedHrs: 0,
      remHrs: 0,
      adjustedHrs: 0,
    };
  }

  const remainingBalance = isVoided
    ? 0
    : Math.max(0, totalHours + earnedBalance);

  return {
    previousBalance,
    ctoCreditsEarned,
    totalCtoCredits,
    otEarned,
    usedHrs,
    totalHours,
    earnedBalance,
    voidedEarnedBalance,
    isVoided,
    isCommuted,
    remainingBalance,
    commutedHrs: 0,
    carriedHrs: previousBalance,
    // Legacy aliases
    earnedHrs: earnedBalance,
    remHrs: remainingBalance,
    adjustedHrs: totalHours,
  };
};

export const getCtoDisplayRemainingHours = (period, earningsList = []) => {
  if (!period || isCtoPeriodVoided(period) || isCtoCommutedLocked(period)) return 0;
  return computeCtoBalances(period, { earningsList }).remainingBalance;
};

const isBeforeCtoPeriod = (row, targetYear, targetMonth) => {
  const y = Number(row?.period_year);
  const m = semOrder(row?.period_month);
  const ty = parseInt(targetYear, 10);
  if (!Number.isFinite(ty)) return false;
  if (!Number.isFinite(y)) return true;
  if (y < ty) return true;
  if (y > ty) return false;
  const tm = targetMonth != null ? parseInt(targetMonth, 10) : NaN;
  if (!Number.isFinite(tm) || tm <= 0) return false;
  return m < tm;
};

export const getCtoPeriodHeadForKey = (records = [], periodYear, periodMonth) => {
  const key = normalizeCtoPeriodKey({ period_year: periodYear, period_month: periodMonth });
  const heads = latestCtoPeriodsByKeyForDisplay(records || []);
  return heads.find((r) => normalizeCtoPeriodKey(r) === key) || null;
};

export const isCtoPeriodKeyClosed = (records = [], periodYear, periodMonth) => {
  const head = getCtoPeriodHeadForKey(records, periodYear, periodMonth);
  if (!head) return false;
  return isCtoPeriodVoided(head) || isCtoCommutedLocked(head);
};

export const isCtoPeriodChronologicallyAfter = (anchorPeriod, targetYear, targetMonth) => {
  if (!anchorPeriod) return false;
  const sameKey =
    normalizeCtoPeriodKey(anchorPeriod) ===
    normalizeCtoPeriodKey({ period_year: targetYear, period_month: targetMonth });
  if (sameKey) return false;
  return isBeforeCtoPeriod(anchorPeriod, targetYear, targetMonth);
};

export const assertCtoPeriodAssignableForCredits = (records = [], periodYear, periodMonth) => {
  const filtered = records || [];

  if (isCtoPeriodKeyClosed(filtered, periodYear, periodMonth)) {
    return {
      ok: false,
      error: "This period is voided or commuted and cannot receive new credits.",
    };
  }

  const display = ctoRecordsForDisplay(filtered);
  const current = resolveCtoCurrentDisplayPeriod(display);
  const targetKey = normalizeCtoPeriodKey({ period_year: periodYear, period_month: periodMonth });

  if (!current) return { ok: true };

  if (normalizeCtoPeriodKey(current) === targetKey) {
    if (isCtoPeriodVoided(current) || isCtoCommutedLocked(current)) {
      return {
        ok: false,
        error: "This period is voided or commuted and cannot receive new credits.",
      };
    }
    return { ok: true };
  }

  if (isCtoPeriodChronologicallyAfter(current, periodYear, periodMonth)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "Only the current active period can receive new credits.",
  };
};

const findPriorCtoPeriodSnapshot = (records = [], targetYear, targetMonth = null) => {
  // Include commuted rows so we can stop carry (Leave Assignment pattern).
  const periods = latestCtoPeriodsByKeyForDisplay(records);
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
        return isBeforeCtoPeriod(p, ty, tm);
      })
      .sort((a, b) => {
        const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
        if (yd !== 0) return yd;
        const sd = semOrder(b.period_month) - semOrder(a.period_month);
        if (sd !== 0) return sd;
        return toNum(b.id) - toNum(a.id);
      })[0] ?? null
  );
};

export const getPriorPeriodCtoSnapshot = (
  records = [],
  targetYear,
  targetMonth = null,
) => {
  const prior = findPriorCtoPeriodSnapshot(records, targetYear, targetMonth);
  if (!prior || isCtoPeriodVoided(prior) || isCtoCommutedLocked(prior)) return null;
  return prior;
};

export const getPriorPeriodCtoCarryForward = (
  records = [],
  earningsList = [],
  targetYear,
  targetMonth = null,
) => {
  const prior = getPriorPeriodCtoSnapshot(records, targetYear, targetMonth);
  if (!prior) return 0;
  return getCtoDisplayRemainingHours(prior, earningsList);
};

export const getCtoEmployeeDisplayRemaining = (records = [], earningsList = []) => {
  const display = ctoRecordsForDisplay(records);
  const latest = resolveCtoCurrentDisplayPeriod(display);
  if (!latest) return 0;
  return getCtoDisplayRemainingHours(latest, earningsList);
};

export const recomputeCtoLedgerFields = (period, earningsList = []) => {
  const otEarned = toNum(period?.earned_hours);
  const used = Math.max(0, toNum(period?.used_hours));
  const total = Math.max(0, otEarned - used);
  const remaining = isCtoCommutedLocked(period) ? 0 : total;
  const earningStatus = getApprovedCtoEarningsHoursForPeriod(earningsList, period) > 0 ? 1 : 0;
  return {
    earned_hours: otEarned,
    used_hours: used,
    total_hours: total,
    remaining_hours: remaining,
    earning_status: earningStatus,
    carried_forward_hours: toNum(period?.carried_forward_hours),
  };
};

/** Rows inserted only from cto_earnings approval (legacy double-count). */
export const isCtoEarningLedgerRow = (row) => {
  const r = String(row?.remarks || "");
  return /\bcto_earning:\d+\b/i.test(r) && !/\bcto_earning_reversal:/i.test(r);
};

/** CTO hours from OT entry this period (ledger earned minus carry). */
export const periodOtCtoHours = (row) => {
  const carry = toNum(row?.carried_forward_hours);
  const earned = toNum(row?.earned_hours);
  return Math.max(0, earned - carry);
};

const CTO_ENTRY_DELTA_RE = /cto_entry_delta_hours:([0-9.]+)/i;

/** Parse immutable entry delta stamped on INSERT (remarks). */
export const parseCtoEntryDeltaHours = (remarks) => {
  const m = String(remarks || "").match(CTO_ENTRY_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

/** Display delta: stamped at insert, else vs previous non-voided snapshot in period. */
export const computeCtoSnapshotDelta = (row, prev, rows, idx) => {
  const stamped = parseCtoEntryDeltaHours(row?.remarks);
  if (stamped != null) return stamped;

  const prevNonVoided = rows
    .slice(0, idx)
    .filter((r) => !r?.voided_at && !isCtoCommutedLocked(r))
    .pop();
  const prevForDelta = prevNonVoided || prev;
  if (!prevForDelta) return periodOtCtoHours(row);
  return Math.max(0, periodOtCtoHours(row) - periodOtCtoHours(prevForDelta));
};

const CTO_USED_DELTA_RE = /cto_used_delta_hours:([0-9.]+)/i;

export const parseCtoUsedDeltaHours = (remarks) => {
  const m = String(remarks || "").match(CTO_USED_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

export const computeCtoUsedDelta = (row, prev, rows, idx) => {
  const stamped = parseCtoUsedDeltaHours(row?.remarks);
  if (stamped != null) return stamped;
  const prevNonVoided = rows
    .slice(0, idx)
    .filter((r) => !r?.voided_at && !isCtoCommutedLocked(r))
    .pop();
  const prevForDelta = prevNonVoided || prev;
  if (!prevForDelta) return toNum(row?.used_hours);
  return Math.max(0, toNum(row.used_hours) - toNum(prevForDelta.used_hours));
};

export const isCtoOtUndoableSnapshot = (row, prev, rows, idx) => {
  if (!row || row.voided_at || isCtoEarningLedgerRow(row)) return false;
  const scDelta = computeCtoSnapshotDelta(row, prev, rows, idx);
  if (scDelta > 0) return true;
  if (parseCtoEntryDeltaHours(row?.remarks) != null) return true;
  const prevNv = rows
    .slice(0, idx)
    .filter((r) => !r?.voided_at && !isCtoCommutedLocked(r))
    .pop();
  return toNum(row.ot_hours) > toNum(prevNv?.ot_hours);
};

export const CTO_LEDGER_ENTRY_LABELS = {
  period_open: "Period open",
  ot_add: "OT added",
  deduction: "Deduction",
  adjustment: "Adjustment",
  earning: "Earning",
  earning_deduction: "Earning deduction",
};

export const CTO_UNDO_MAX_PER_PERIOD = 5;

const dedupeSupersededDeductionSnapshots = (snapshots = []) => {
  const out = [];
  let i = 0;
  while (i < snapshots.length) {
    const s = snapshots[i];
    if (s.entry_kind === "deduction" && !s.is_active) {
      let j = i + 1;
      while (
        j < snapshots.length &&
        snapshots[j].entry_kind === "deduction" &&
        Math.abs(toNum(s.used_delta) - toNum(snapshots[j].used_delta)) < 0.001 &&
        Math.abs(toNum(s.post_deduction) - toNum(snapshots[j].post_deduction)) < 0.001
      ) {
        j += 1;
      }
      if (j > i + 1) {
        out.push(snapshots[j - 1]);
        i = j;
        continue;
      }
    }
    out.push(s);
    i += 1;
  }
  return out;
};

const voidedSnapshotBatchKey = (row) => {
  const va = row?.voided_at;
  if (!va) return `row-${row?.id}`;
  const d = new Date(va);
  return Number.isNaN(d.getTime()) ? `row-${row?.id}` : d.toISOString().slice(0, 19);
};

const dedupeVoidedSnapshotLines = (snapshots = []) => {
  const batches = new Map();
  for (const s of snapshots) {
    const key = voidedSnapshotBatchKey(s);
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(s);
  }
  const out = [];
  for (const batch of batches.values()) {
    const sorted = [...batch].sort((a, b) => toNum(a.id) - toNum(b.id));
    out.push(...dedupeSupersededDeductionSnapshots(sorted));
  }
  return out.sort((a, b) => toNum(a.id) - toNum(b.id));
};

const ctoPeriodKeyMatches = (row, employeeNumber, periodYear, periodMonth) => {
  if (!row) return false;
  const emp = String(employeeNumber || "").trim();
  if (String(row.employeeNumber || row.employee_number || "").trim() !== emp) return false;
  if (String(parseInt(String(row.period_year), 10) || "") !== String(parseInt(String(periodYear), 10) || "")) {
    return false;
  }
  const wantPm = ctoPeriodMonthMatchValue(periodMonth);
  const rowPm = ctoPeriodMonthMatchValue(row.period_month);
  if (wantPm == null && rowPm == null) return true;
  return wantPm === rowPm;
};

const filterCtoEarningsForPeriodDisplay = (earningsList, employeeNumber, periodYear, periodMonth) => {
  const emp = String(employeeNumber || "").trim();
  const py = String(parseInt(String(periodYear), 10) || "");
  const pm = ctoPeriodMonthMatchValue(periodMonth);
  return (Array.isArray(earningsList) ? earningsList : []).filter((e) => {
    if (String(e.employee_number || "").trim() !== emp) return false;
    if (String(parseInt(String(e.period_year), 10) || "") !== py) return false;
    const ePm = ctoPeriodMonthMatchValue(e.period_month);
    if (pm == null && ePm == null) return true;
    return pm === ePm;
  });
};

/** Stored snapshot values for voided/commuted audit rows (computeCtoBalances zeros active balances). */
const ctoSnapshotAuditFlow = (row, flow) => {
  if (row?.voided_at) {
    const carry = toNum(row.carried_forward_hours);
    const ot = toNum(row.ot_hours);
    return {
      ...flow,
      previousBalance: carry,
      ctoCreditsEarned: ot,
      totalCtoCredits: Math.max(0, carry + ot),
      usedHrs: toNum(row.used_hours),
      totalHours: toNum(row.total_hours),
      earnedBalance: 0,
      voidedEarnedBalance: 0,
      remainingBalance: toNum(row.remaining_hours),
      isVoided: true,
    };
  }
  if (isCtoCommutedLocked(row)) {
    return {
      ...flow,
      usedHrs: toNum(row.used_hours),
      totalHours: 0,
      earnedBalance: 0,
      remainingBalance: flow.commutedHrs || 0,
    };
  }
  return flow;
};

const mapCtoEarningLedgerLine = (e) => {
  const hrs = toNum(e.earned_hours);
  const isDed = String(e.entry_type || "").toUpperCase() === "DEDUCTION";
  const voided = isCtoEarningVoided(e);
  return {
    id: `earning-${e.id}`,
    line_type: "earning",
    earning_id: e.id,
    entry_kind: isDed ? "earning_deduction" : "earning",
    created_at: e.approved_at || e.created_at || e.voided_at || null,
    voided_at: e.voided_at || null,
    remarks: e.remarks || null,
    approved_earnings_delta: Math.abs(hrs),
    earn_status: e.earn_status,
    entry_type: e.entry_type,
    is_voided: voided,
    can_undo: false,
    is_active: false,
  };
};

const sortCtoLedgerLines = (lines) =>
  [...lines].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });

/** Annotate earning rows with post-deduction delta and running remaining after latest snapshot. */
const enrichCtoLedgerEarningBalances = (lines) => {
  let basePostDed = 0;
  let earningsAccum = 0;

  return lines.map((line) => {
    if (line.line_type === "snapshot") {
      basePostDed = toNum(line.post_deduction);
      earningsAccum = 0;
      return line;
    }
    if (line.line_type === "earning") {
      const delta = toNum(line.approved_earnings_delta);
      const isDed = line.entry_kind === "earning_deduction";
      const signedDelta = isDed ? -delta : delta;
      earningsAccum += signedDelta;
      return {
        ...line,
        earnings_delta: Math.abs(signedDelta),
        earnings_delta_prefix: isDed ? "−" : "+",
        remaining_balance: Math.max(0, basePostDed + earningsAccum),
      };
    }
    return line;
  });
};

export const isPerMonthCtoTracking = (periodMonth) => Boolean(normalizeCtoPeriodMonth(periodMonth));

/** Latest active ledger row per employee + period (for save/update targeting). */
export const findLatestCtoForPeriod = (records, employeeNumber, periodYear, periodMonth) => {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return null;
  const key = normalizeCtoPeriodKey({ period_year: periodYear, period_month: periodMonth });
  const matches = (records || []).filter(
    (r) =>
      String(r.employeeNumber) === emp &&
      !isCtoPeriodVoided(r) &&
      !isCtoCommutedLocked(r) &&
      normalizeCtoPeriodKey(r) === key,
  );
  if (!matches.length) return null;
  return pickActiveCtoPeriodSnapshot(matches);
};

/** Per-month: one ledger row per month. No month: update existing CTO for employee/year. */
export const findCtoSaveTarget = (records, employeeNumber, periodYear, periodMonth) => {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return null;
  const py = parseInt(periodYear, 10) || 0;

  if (isPerMonthCtoTracking(periodMonth)) {
    return findLatestCtoForPeriod(records, emp, py, periodMonth);
  }

  const chain = (records || []).filter(
    (r) =>
      String(r.employeeNumber) === emp &&
      !isCtoPeriodVoided(r) &&
      !isCtoCommutedLocked(r),
  );
  if (!chain.length) return null;

  const noMonthForYear = chain.filter(
    (r) => !normalizeCtoPeriodMonth(r.period_month) && toNum(r.period_year) === py,
  );
  if (noMonthForYear.length) {
    return [...noMonthForYear].sort((a, b) => toNum(b.id) - toNum(a.id))[0];
  }

  const sameYear = chain.filter((r) => toNum(r.period_year) === py);
  const pool = sameYear.length ? sameYear : chain;
  return [...pool].sort((a, b) => toNum(b.id) - toNum(a.id))[0];
};

export const assertCtoPeriodIsCurrentDisplay = (periodRow, allRows = []) => {
  const display = ctoRecordsForDisplay(allRows);
  const latest = resolveCtoCurrentDisplayPeriod(display);
  if (!latest) return { ok: false, error: "No active CTO period found" };
  if (normalizeCtoPeriodKey(periodRow) !== normalizeCtoPeriodKey(latest)) {
    return {
      ok: false,
      error: "Only the latest CTO period can be modified. Prior periods were superseded.",
    };
  }
  return { ok: true, latest };
};

export const getCtoEmployeeLedgerSummary = (records, earningsList = []) => {
  const remaining = getCtoEmployeeDisplayRemaining(records, earningsList);
  return { remaining, earnedForColor: remaining };
};

export const buildCtoPeriodSnapshotHistory = (
  allPeriodRows,
  earningsList,
  { employeeNumber, periodYear, periodMonth, undoClicksUsed = 0, chainRecords = [] } = {},
) => {
  const rows = (Array.isArray(allPeriodRows) ? allPeriodRows : [])
    .filter((r) => ctoPeriodKeyMatches(r, employeeNumber, periodYear, periodMonth))
    .filter((r) => !isCtoEarningLedgerRow(r))
    .sort((a, b) => toNum(a.id) - toNum(b.id));

  const activeRows = rows.filter((r) => !isCtoPeriodVoided(r) && !isCtoCommutedLocked(r));
  const latestActiveId = activeRows.length
    ? Math.max(...activeRows.map((r) => toNum(r.id)))
    : null;
  const undoClicksRemaining = Math.max(0, CTO_UNDO_MAX_PER_PERIOD - toNum(undoClicksUsed));
  const canUndoPeriod = undoClicksRemaining > 0 && activeRows.length > 1;
  const chain = chainRecords.length ? chainRecords : rows;

  const snapshots = rows.map((row, idx) => {
    const prev = idx > 0 ? rows[idx - 1] : null;
    const ctoDelta = computeCtoSnapshotDelta(row, prev, rows, idx);
    const usedDelta = computeCtoUsedDelta(row, prev, rows, idx);
    const rowId = toNum(row.id);
    const isActive = latestActiveId != null && rowId === latestActiveId;
    const flowRaw = computeCtoBalances(row, { earningsList, chainRecords: chain });
    const flow = ctoSnapshotAuditFlow(row, flowRaw);
    const isOtEntry = isCtoOtUndoableSnapshot(row, prev, rows, idx);
    const rowCommuted = isCtoCommutedLocked(row);
    const isDeductionEntry = usedDelta > 0 && !isOtEntry && !rowCommuted;
    let entry_kind = "period_open";
    if (isDeductionEntry) entry_kind = "deduction";
    else if (isOtEntry) entry_kind = "ot_add";
    else if (idx > 0) entry_kind = "adjustment";

    const displayUsedDelta = rowCommuted ? 0 : usedDelta;

    return {
      id: row.id,
      line_type: "snapshot",
      employeeNumber: row.employeeNumber,
      period_year: row.period_year,
      period_month: row.period_month,
      ot_hours: toNum(row.ot_hours),
      earned_hours: toNum(row.earned_hours),
      carried_forward_hours: toNum(row.carried_forward_hours),
      remaining_hours: toNum(row.remaining_hours),
      voided_at: row.voided_at || null,
      commuted: row.commuted,
      remarks: row.remarks || null,
      created_at: row.created_at || row.updated_at || null,
      cto_delta: ctoDelta,
      used_delta: displayUsedDelta,
      entry_cto_hours: parseCtoEntryDeltaHours(row.remarks) ?? ctoDelta,
      entry_used_hours: rowCommuted ? 0 : (parseCtoUsedDeltaHours(row.remarks) ?? usedDelta),
      entry_kind,
      previous_balance: flow.previousBalance,
      cto_credits_earned: flow.ctoCreditsEarned,
      total_cto_credits: flow.totalCtoCredits,
      used_hours: flow.usedHrs,
      post_deduction: flow.totalHours,
      remaining_balance: flow.remainingBalance,
      approved_earnings: flow.earnedBalance,
      is_active: isActive,
      is_voided: !!row.voided_at,
      is_ot_entry: isOtEntry,
      can_undo: isActive && canUndoPeriod && isOtEntry,
    };
  });

  const periodEarnings = filterCtoEarningsForPeriodDisplay(earningsList, employeeNumber, periodYear, periodMonth);

  const activeSnapshotLines = dedupeSupersededDeductionSnapshots(
    snapshots.filter((s) => !s.is_voided),
  );
  const voidedSnapshotLines = dedupeVoidedSnapshotLines(snapshots.filter((s) => s.is_voided));
  const activeEarningLines = periodEarnings
    .filter((e) => !isCtoEarningVoided(e) && toNum(e.earned_hours) !== 0 && String(e.entry_type || "").toUpperCase() !== "DEDUCTION")
    .map(mapCtoEarningLedgerLine);
  const voidedEarningLines = periodEarnings
    .filter((e) => isCtoEarningVoided(e) && String(e.entry_type || "").toUpperCase() !== "DEDUCTION")
    .map(mapCtoEarningLedgerLine);

  const ledger_lines_active = enrichCtoLedgerEarningBalances(
    sortCtoLedgerLines([...activeSnapshotLines, ...activeEarningLines]),
  );
  const ledger_lines_voided = enrichCtoLedgerEarningBalances(
    sortCtoLedgerLines([...voidedSnapshotLines, ...voidedEarningLines]),
  );
  const ledger_lines = ledger_lines_active;

  const earnings = periodEarnings.map((e) => ({
    id: e.id,
    earned_hours: toNum(e.earned_hours),
    earn_status: e.earn_status,
    entry_type: e.entry_type,
    remarks: e.remarks,
    voided_at: e.voided_at || null,
    voided: e.voided,
    is_voided: isCtoEarningVoided(e),
  }));

  return {
    employeeNumber,
    period_year: periodYear,
    period_month: periodMonth,
    snapshots,
    ledger_lines,
    ledger_lines_active,
    ledger_lines_voided,
    voided_line_count: ledger_lines_voided.length,
    earnings,
    active_snapshot_count: activeRows.length,
    undo_clicks_used: toNum(undoClicksUsed),
    undo_clicks_remaining: undoClicksRemaining,
    can_undo: canUndoPeriod,
    latest_active_id: latestActiveId,
  };
};
