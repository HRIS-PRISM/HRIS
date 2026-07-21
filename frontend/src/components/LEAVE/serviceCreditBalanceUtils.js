/**
 * Service credit balance utilities — mirrors leaveAssignmentBalanceUtils for SC.
 */

export const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const normalizeScPeriodKey = (p) => {
  const yr =
    p?.period_year != null
      ? String(parseInt(String(p.period_year), 10) || "").trim()
      : "";
  const mRaw = p?.period_month != null ? String(p.period_month).trim() : "";
  const mNum = mRaw !== "" && /^[0-9]+$/.test(mRaw) ? parseInt(mRaw, 10) : NaN;
  const m = Number.isFinite(mNum) ? String(mNum) : mRaw;
  return `${yr}|${m}`;
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

export const isScPeriodVoided = (period) => !!(period?.voided_at);

export const isScCommutedLocked = (period) =>
  !!(period?.commuted) || Number(period?.commuted) === 1;

/** True when a newer calendar period exists in the display list (balance rolled forward). */
export const isScPeriodSuperseded = (period, displayRecords = []) => {
  if (!period) return false;
  const latest = resolveScCurrentDisplayPeriod(displayRecords);
  if (!latest) return false;
  return normalizeScPeriodKey(period) !== normalizeScPeriodKey(latest);
};

/** Chronologically latest active period — skips voided/commuted heads so prior month reopens after void. */
export const resolveScCurrentDisplayPeriod = (displayRecords = []) => {
  const sorted = sortScPeriodsDesc(Array.isArray(displayRecords) ? displayRecords : []);
  return sorted.find((p) => !isScPeriodVoided(p) && !isScCommutedLocked(p)) ?? null;
};

const SC_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const scPeriodMonthName = (month) => {
  const m = parseInt(month, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return "";
  return SC_MONTH_NAMES[m - 1] || "";
};

/** Next newer period that received this period's balance (sorted desc list). */
export const getScPeriodForwardTarget = (period, displayRecords = []) => {
  if (!period) return null;
  const sorted = sortScPeriodsDesc(Array.isArray(displayRecords) ? displayRecords : []);
  const idx = sorted.findIndex(
    (p) => normalizeScPeriodKey(p) === normalizeScPeriodKey(period),
  );
  if (idx <= 0) return null;
  return sorted[idx - 1] ?? null;
};

/** e.g. "January" or "2026" when the next period has no month. */
export const getScPeriodForwardToLabel = (period, displayRecords = []) => {
  const target = getScPeriodForwardTarget(period, displayRecords);
  if (!target) return null;
  const mo = scPeriodMonthName(target.period_month);
  if (mo) return mo;
  if (target.period_year != null) return String(target.period_year);
  return null;
};

export const latestScPeriodsByKey = (periods = []) => {
  const list = (Array.isArray(periods) ? periods : []).filter(
    (p) => !isScPeriodVoided(p) && !isScCommutedLocked(p),
  );
  const map = new Map();
  for (const row of list) {
    const key = normalizeScPeriodKey(row);
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
export const latestScPeriodsByKeyForDisplay = (periods = []) => {
  const list = Array.isArray(periods) ? periods : [];
  const map = new Map();
  for (const row of list) {
    const key = normalizeScPeriodKey(row);
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
export const pickActiveScPeriodSnapshot = (rows = []) => {
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
export const scRecordsForDisplay = (periods = [], scType = "non_commutative") => {
  const list = (Array.isArray(periods) ? periods : []).filter(
    (r) => r && String(r.sc_type || "non_commutative") === String(scType || "non_commutative"),
  );
  const byKey = new Map();
  for (const row of list) {
    const key = normalizeScPeriodKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const display = [];
  for (const rows of byKey.values()) {
    const activeRows = rows.filter((r) => !isScPeriodVoided(r) && !isScCommutedLocked(r));
    if (activeRows.length > 0) {
      display.push(pickActiveScPeriodSnapshot(activeRows));
      continue;
    }
    const latest = rows.reduce((best, r) => (toNum(r.id) > toNum(best?.id) ? r : best));
    if (latest) display.push(latest);
  }

  return sortScPeriodsDesc(display);
};

export const sortScPeriodsDesc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(b.period_month) - semOrder(a.period_month);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
  });

export const sortScPeriodsAsc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(a.period_year) || 0) - (Number(b.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(a.period_month) - semOrder(b.period_month);
    if (sd !== 0) return sd;
    return toNum(a.id) - toNum(b.id);
  });

export const isScEarningVoided = (earning) =>
  !!(earning?.voided_at) || Number(earning?.voided) === 1;

export const scEarningPeriodKeyMatches = (earning, period) => {
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

export const scEarningMatchesPeriod = (earning, period) => {
  if (!earning || !period) return false;
  if (isScEarningVoided(earning)) return false;
  if (
    period.employeeNumber != null &&
    String(earning.employee_number) !== String(period.employeeNumber)
  ) {
    return false;
  }
  if (
    period.sc_type != null &&
    String(earning.sc_type || "non_commutative") !== String(period.sc_type || "non_commutative")
  ) {
    return false;
  }
  return scEarningPeriodKeyMatches(earning, period);
};

export const filterApprovedScEarningsForPeriod = (earningsList, period) => {
  if (!period) return [];
  const list = Array.isArray(earningsList) ? earningsList : [];
  return list.filter((e) => {
    if (isScEarningVoided(e)) return false;
    if (e.earn_status !== "approved") return false;
    if (
      period.employeeNumber != null &&
      String(e.employee_number) !== String(period.employeeNumber)
    ) {
      return false;
    }
    if (period.sc_type != null && String(e.sc_type || "non_commutative") !== String(period.sc_type || "non_commutative")) {
      return false;
    }
    return scEarningMatchesPeriod(e, period);
  });
};

export const getApprovedScEarningsHoursForPeriod = (earningsList, period) => {
  if (!period) return 0;
  return filterApprovedScEarningsForPeriod(earningsList, period).reduce(
    (s, e) => s + toNum(e.earned_hours),
    0,
  );
};

export const filterVoidedScEarningsForPeriod = (earningsList, period) => {
  if (!period) return [];
  const list = Array.isArray(earningsList) ? earningsList : [];
  return list.filter((e) => {
    if (!isScEarningVoided(e)) return false;
    if (e.earn_status !== "approved") return false;
    if (
      period.employeeNumber != null &&
      String(e.employee_number) !== String(period.employeeNumber)
    ) {
      return false;
    }
    if (
      period.sc_type != null &&
      String(e.sc_type || "non_commutative") !== String(period.sc_type || "non_commutative")
    ) {
      return false;
    }
    return scEarningPeriodKeyMatches(e, period);
  });
};

export const getVoidedScEarningsHoursForPeriod = (earningsList, period) => {
  if (!period) return 0;
  return filterVoidedScEarningsForPeriod(earningsList, period).reduce(
    (s, e) => s + toNum(e.earned_hours),
    0,
  );
};

/** Commuted amount from leave_commutation join (mirrors Leave Assignment getCommutedHours). */
export const getScCommutedHours = (period) => {
  if (!period) return 0;
  const hrs = toNum(period.commuted_hours);
  if (hrs > 0) return hrs;
  const days = toNum(period.commuted_days);
  if (days > 0) return days * 8;
  return 0;
};

export const computeScBalances = (period, { earningsList, chainRecords } = {}) => {
  const isVoided = isScPeriodVoided(period);
  const isCommuted = isScCommutedLocked(period);
  const previousBalance = chainRecords?.length
    ? getPriorPeriodScCarryForward(
        chainRecords,
        earningsList,
        period?.period_year,
        period?.period_month,
      )
    : toNum(period?.carried_forward_hours);
  const serviceCreditsEarned = toNum(period?.total_ot_hours);
  const otEarned = toNum(period?.earned_hours);
  const totalServiceCredits = Math.max(0, previousBalance + serviceCreditsEarned);
  const usedHrs = toNum(period?.used_hours);
  const totalHours = Math.max(0, toNum(period?.total_hours) || otEarned - usedHrs);
  const earnedBalance = isVoided ? 0 : getApprovedScEarningsHoursForPeriod(earningsList, period);
  const voidedEarnedBalance = getVoidedScEarningsHoursForPeriod(earningsList, period);

  if (isCommuted) {
    const storedUsed = toNum(period?.used_hours);
    const commutedHrs = getScCommutedHours(period) || totalServiceCredits;
    const displayUsedHrs =
      commutedHrs > 0 && storedUsed >= commutedHrs
        ? Math.max(0, storedUsed - commutedHrs)
        : storedUsed;
    return {
      previousBalance,
      serviceCreditsEarned,
      totalServiceCredits,
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
    serviceCreditsEarned,
    totalServiceCredits,
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

export const getScDisplayRemainingHours = (period, earningsList = []) => {
  if (!period || isScPeriodVoided(period) || isScCommutedLocked(period)) return 0;
  return computeScBalances(period, { earningsList }).remainingBalance;
};

const isBeforeScPeriod = (row, targetYear, targetMonth) => {
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

/** Latest display head for a period key (includes commuted/voided). */
export const getScPeriodHeadForKey = (
  records = [],
  periodYear,
  periodMonth,
  scType = "non_commutative",
) => {
  const key = normalizeScPeriodKey({ period_year: periodYear, period_month: periodMonth });
  const st = String(scType || "non_commutative");
  const heads = latestScPeriodsByKeyForDisplay(
    (records || []).filter((r) => String(r.sc_type || "non_commutative") === st),
  );
  return heads.find((r) => normalizeScPeriodKey(r) === key) || null;
};

export const isScPeriodKeyClosed = (
  records = [],
  periodYear,
  periodMonth,
  scType = "non_commutative",
) => {
  const head = getScPeriodHeadForKey(records, periodYear, periodMonth, scType);
  if (!head) return false;
  return isScPeriodVoided(head) || isScCommutedLocked(head);
};

/** True when target period is strictly after anchor (different period key). */
export const isScPeriodChronologicallyAfter = (anchorPeriod, targetYear, targetMonth) => {
  if (!anchorPeriod) return false;
  const sameKey =
    normalizeScPeriodKey(anchorPeriod) ===
    normalizeScPeriodKey({ period_year: targetYear, period_month: targetMonth });
  if (sameKey) return false;
  return isBeforeScPeriod(anchorPeriod, targetYear, targetMonth);
};

/** Block assign when period is commuted or superseded. Voided periods remain assignable if no newer period exists. */
export const assertScPeriodAssignableForCredits = (
  records = [],
  periodYear,
  periodMonth,
  scType = "non_commutative",
) => {
  const st = String(scType || "non_commutative");
  const filtered = (records || []).filter(
    (r) => String(r.sc_type || "non_commutative") === st,
  );

  if (isScPeriodKeyClosed(filtered, periodYear, periodMonth, st)) {
    return {
      ok: false,
      error: "This period is voided or commuted and cannot receive new credits.",
    };
  }

  const display = scRecordsForDisplay(filtered, st);
  const current = resolveScCurrentDisplayPeriod(display);
  const targetKey = normalizeScPeriodKey({ period_year: periodYear, period_month: periodMonth });

  if (!current) return { ok: true };

  if (normalizeScPeriodKey(current) === targetKey) {
    if (isScPeriodVoided(current) || isScCommutedLocked(current)) {
      return {
        ok: false,
        error: "This period is voided or commuted and cannot receive new credits.",
      };
    }
    return { ok: true };
  }

  if (isScPeriodChronologicallyAfter(current, periodYear, periodMonth)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "Only the current active period can receive new credits.",
  };
};

const findPriorScPeriodSnapshot = (records = [], targetYear, targetMonth = null) => {
  // Include commuted rows so we can stop carry (Leave Assignment pattern).
  const periods = latestScPeriodsByKeyForDisplay(records);
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
        return isBeforeScPeriod(p, ty, tm);
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

export const getPriorPeriodScSnapshot = (
  records = [],
  targetYear,
  targetMonth = null,
) => {
  const prior = findPriorScPeriodSnapshot(records, targetYear, targetMonth);
  if (!prior || isScPeriodVoided(prior) || isScCommutedLocked(prior)) return null;
  return prior;
};

export const getPriorPeriodScCarryForward = (
  records = [],
  earningsList = [],
  targetYear,
  targetMonth = null,
) => {
  const prior = getPriorPeriodScSnapshot(records, targetYear, targetMonth);
  if (!prior) return 0;
  return getScDisplayRemainingHours(prior, earningsList);
};

export const getScEmployeeDisplayRemaining = (records = [], earningsList = []) => {
  const display = scRecordsForDisplay(records);
  const latest = resolveScCurrentDisplayPeriod(display);
  if (!latest) return 0;
  return getScDisplayRemainingHours(latest, earningsList);
};

export const recomputeScLedgerFields = (period, earningsList = []) => {
  const otEarned = toNum(period?.earned_hours);
  const used = Math.max(0, toNum(period?.used_hours));
  const total = Math.max(0, otEarned - used);
  const remaining = isScCommutedLocked(period) ? 0 : total;
  const earningStatus = getApprovedScEarningsHoursForPeriod(earningsList, period) > 0 ? 1 : 0;
  return {
    earned_hours: otEarned,
    used_hours: used,
    total_hours: total,
    remaining_hours: remaining,
    earning_status: earningStatus,
    carried_forward_hours: toNum(period?.carried_forward_hours),
  };
};

/** Rows inserted only from sc_earnings approval (legacy double-count). */
export const isScEarningLedgerRow = (row) => {
  const r = String(row?.remarks || "");
  return /\bsc_earning:\d+\b/i.test(r) && !/\bsc_earning_reversal:/i.test(r);
};

/** SC hours from OT entry this period (ledger earned minus carry). */
export const periodOtScHours = (row) => {
  const carry = toNum(row?.carried_forward_hours);
  const earned = toNum(row?.earned_hours);
  return Math.max(0, earned - carry);
};

const SC_ENTRY_DELTA_RE = /sc_entry_delta_hours:([0-9.]+)/i;

/** Parse immutable entry delta stamped on INSERT (remarks). */
export const parseScEntryDeltaHours = (remarks) => {
  const m = String(remarks || "").match(SC_ENTRY_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

/** Display delta: stamped at insert, else vs previous non-voided snapshot in period. */
export const computeScSnapshotDelta = (row, prev, rows, idx) => {
  const stamped = parseScEntryDeltaHours(row?.remarks);
  if (stamped != null) return stamped;

  const prevNonVoided = rows
    .slice(0, idx)
    .filter((r) => !r?.voided_at && !isScCommutedLocked(r))
    .pop();
  const prevForDelta = prevNonVoided || prev;
  if (!prevForDelta) return periodOtScHours(row);
  return Math.max(0, periodOtScHours(row) - periodOtScHours(prevForDelta));
};

const SC_USED_DELTA_RE = /sc_used_delta_hours:([0-9.]+)/i;

export const parseScUsedDeltaHours = (remarks) => {
  const m = String(remarks || "").match(SC_USED_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

export const computeScUsedDelta = (row, prev, rows, idx) => {
  const stamped = parseScUsedDeltaHours(row?.remarks);
  if (stamped != null) return stamped;
  const prevNonVoided = rows
    .slice(0, idx)
    .filter((r) => !r?.voided_at && !isScCommutedLocked(r))
    .pop();
  const prevForDelta = prevNonVoided || prev;
  if (!prevForDelta) return toNum(row?.used_hours);
  return Math.max(0, toNum(row.used_hours) - toNum(prevForDelta.used_hours));
};

export const isScOtUndoableSnapshot = (row, prev, rows, idx) => {
  if (!row || row.voided_at) return false;
  const scDelta = computeScSnapshotDelta(row, prev, rows, idx);
  if (scDelta > 0) return true;
  if (parseScEntryDeltaHours(row?.remarks) != null) return true;
  const prevNv = rows
    .slice(0, idx)
    .filter((r) => !r?.voided_at && !isScCommutedLocked(r))
    .pop();
  return toNum(row.total_ot_hours) > toNum(prevNv?.total_ot_hours);
};

export const SC_LEDGER_ENTRY_LABELS = {
  period_open: "Period open",
  ot_add: "OT added",
  deduction: "Deduction",
  adjustment: "Adjustment",
  earning: "Earning",
  earning_deduction: "Earning deduction",
};

export const SC_UNDO_MAX_PER_PERIOD = 5;

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

const normalizeScPeriodMonth = (pm) => {
  if (pm == null || String(pm).trim() === "") return null;
  const n = parseInt(String(pm), 10);
  return Number.isFinite(n) ? n : null;
};

const scPeriodKeyMatches = (row, employeeNumber, periodYear, periodMonth, scType) => {
  if (!row) return false;
  const emp = String(employeeNumber || "").trim();
  if (String(row.employeeNumber || row.employee_number || "").trim() !== emp) return false;
  if (String(row.sc_type || "non_commutative") !== String(scType || "non_commutative")) return false;
  if (String(parseInt(String(row.period_year), 10) || "") !== String(parseInt(String(periodYear), 10) || "")) {
    return false;
  }
  const wantPm = normalizeScPeriodMonth(periodMonth);
  const rowPm = normalizeScPeriodMonth(row.period_month);
  if (wantPm == null && rowPm == null) return true;
  return wantPm === rowPm;
};

const filterScEarningsForPeriodDisplay = (earningsList, employeeNumber, periodYear, periodMonth, scType) => {
  const emp = String(employeeNumber || "").trim();
  const py = String(parseInt(String(periodYear), 10) || "");
  const pm = normalizeScPeriodMonth(periodMonth);
  return (Array.isArray(earningsList) ? earningsList : []).filter((e) => {
    if (String(e.employee_number || "").trim() !== emp) return false;
    if (String(e.sc_type || "non_commutative") !== String(scType || "non_commutative")) return false;
    if (String(parseInt(String(e.period_year), 10) || "") !== py) return false;
    const ePm = normalizeScPeriodMonth(e.period_month);
    if (pm == null && ePm == null) return true;
    return pm === ePm;
  });
};

/** Stored snapshot values for voided/commuted audit rows (computeScBalances zeros active balances). */
const scSnapshotAuditFlow = (row, flow) => {
  if (row?.voided_at) {
    const carry = toNum(row.carried_forward_hours);
    const ot = toNum(row.total_ot_hours);
    return {
      ...flow,
      previousBalance: carry,
      serviceCreditsEarned: ot,
      totalServiceCredits: Math.max(0, carry + ot),
      usedHrs: toNum(row.used_hours),
      totalHours: toNum(row.total_hours),
      earnedBalance: 0,
      voidedEarnedBalance: 0,
      remainingBalance: toNum(row.remaining_hours),
      isVoided: true,
    };
  }
  if (isScCommutedLocked(row)) {
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

const mapScEarningLedgerLine = (e) => {
  const hrs = toNum(e.earned_hours);
  const isDed = String(e.entry_type || "").toUpperCase() === "DEDUCTION";
  const voided = isScEarningVoided(e);
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

const sortScLedgerLines = (lines) =>
  [...lines].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });

/** Annotate earning rows with post-deduction delta and running remaining after latest snapshot. */
const enrichScLedgerEarningBalances = (lines) => {
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

/** Build per-snapshot OT deltas for one period (client-side fallback / display). */
export const buildScPeriodSnapshotHistory = (
  allPeriodRows,
  earningsList,
  { employeeNumber, periodYear, periodMonth, scType, undoClicksUsed = 0, chainRecords = [] } = {},
) => {
  const rows = (Array.isArray(allPeriodRows) ? allPeriodRows : [])
    .filter((r) => scPeriodKeyMatches(r, employeeNumber, periodYear, periodMonth, scType))
    .sort((a, b) => toNum(a.id) - toNum(b.id));

  const activeRows = rows.filter((r) => !isScPeriodVoided(r) && !isScCommutedLocked(r));
  const latestActiveId = activeRows.length
    ? Math.max(...activeRows.map((r) => toNum(r.id)))
    : null;
  const undoClicksRemaining = Math.max(0, SC_UNDO_MAX_PER_PERIOD - toNum(undoClicksUsed));
  const canUndoPeriod = undoClicksRemaining > 0 && activeRows.length > 1;
  const chain = chainRecords.length ? chainRecords : rows;

  const snapshots = rows.map((row, idx) => {
    const prev = idx > 0 ? rows[idx - 1] : null;
    const scDelta = computeScSnapshotDelta(row, prev, rows, idx);
    const usedDelta = computeScUsedDelta(row, prev, rows, idx);
    const prevForOt = rows
      .slice(0, idx)
      .filter((r) => !r?.voided_at && !isScCommutedLocked(r))
      .pop() || prev;
    const rowId = toNum(row.id);
    const isActive = latestActiveId != null && rowId === latestActiveId;
    const flowRaw = computeScBalances(row, { earningsList, chainRecords: chain });
    const flow = scSnapshotAuditFlow(row, flowRaw);
    const isOtEntry = isScOtUndoableSnapshot(row, prev, rows, idx);
    const rowCommuted = isScCommutedLocked(row);
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
      sc_type: row.sc_type || "non_commutative",
      period_year: row.period_year,
      period_month: row.period_month,
      ot_hours_regular: toNum(row.ot_hours_regular),
      ot_hours_holiday: toNum(row.ot_hours_holiday),
      ot_hours_night_diff: toNum(row.ot_hours_night_diff),
      total_ot_hours: toNum(row.total_ot_hours),
      earned_hours: toNum(row.earned_hours),
      carried_forward_hours: toNum(row.carried_forward_hours),
      remaining_hours: toNum(row.remaining_hours),
      voided_at: row.voided_at || null,
      commuted: row.commuted,
      remarks: row.remarks || null,
      created_at: row.created_at || row.updated_at || null,
      sc_delta: scDelta,
      used_delta: displayUsedDelta,
      entry_sc_hours: parseScEntryDeltaHours(row.remarks) ?? scDelta,
      entry_used_hours: rowCommuted ? 0 : (parseScUsedDeltaHours(row.remarks) ?? usedDelta),
      entry_kind,
      previous_balance: flow.previousBalance,
      service_credits_earned: flow.serviceCreditsEarned,
      total_service_credits: flow.totalServiceCredits,
      used_hours: flow.usedHrs,
      post_deduction: flow.totalHours,
      remaining_balance: flow.remainingBalance,
      approved_earnings: flow.earnedBalance,
      ot_delta_regular: toNum(row.ot_hours_regular) - (prevForOt ? toNum(prevForOt.ot_hours_regular) : 0),
      ot_delta_holiday: toNum(row.ot_hours_holiday) - (prevForOt ? toNum(prevForOt.ot_hours_holiday) : 0),
      ot_delta_night_diff: toNum(row.ot_hours_night_diff) - (prevForOt ? toNum(prevForOt.ot_hours_night_diff) : 0),
      is_active: isActive,
      is_voided: !!row.voided_at,
      is_ot_entry: isOtEntry,
      can_undo: isActive && canUndoPeriod && isOtEntry,
    };
  });

  const periodEarnings = filterScEarningsForPeriodDisplay(
    earningsList,
    employeeNumber,
    periodYear,
    periodMonth,
    scType,
  );

  const activeSnapshotLines = dedupeSupersededDeductionSnapshots(
    snapshots.filter((s) => !s.is_voided),
  );
  const voidedSnapshotLines = dedupeVoidedSnapshotLines(snapshots.filter((s) => s.is_voided));
  const activeEarningLines = periodEarnings
    .filter((e) => !isScEarningVoided(e) && toNum(e.earned_hours) !== 0 && String(e.entry_type || "").toUpperCase() !== "DEDUCTION")
    .map(mapScEarningLedgerLine);
  const voidedEarningLines = periodEarnings
    .filter((e) => isScEarningVoided(e) && String(e.entry_type || "").toUpperCase() !== "DEDUCTION")
    .map(mapScEarningLedgerLine);

  const ledger_lines_active = enrichScLedgerEarningBalances(
    sortScLedgerLines([...activeSnapshotLines, ...activeEarningLines]),
  );
  const ledger_lines_voided = enrichScLedgerEarningBalances(
    sortScLedgerLines([...voidedSnapshotLines, ...voidedEarningLines]),
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
    is_voided: isScEarningVoided(e),
  }));

  return {
    employeeNumber,
    period_year: periodYear,
    period_month: periodMonth,
    sc_type: scType || "non_commutative",
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
