/**
 * CTO balance utilities — mirrors serviceCreditBalanceUtils (no sc_type dimension).
 * Frontend mirror: frontend/src/components/LEAVE/ctoBalanceUtils.js
 */

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeCtoPeriodKey = (p) => {
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

const isCtoCommutedLocked = (period) =>
  !!(period?.commuted) || Number(period?.commuted) === 1;

const isCtoPeriodVoided = (period) => !!(period?.voided_at);

const pickActiveCtoPeriodSnapshot = (rows = []) => {
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

const ctoRecordsForDisplay = (periods = []) => {
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

const isCtoPeriodSuperseded = (period, displayRecords = []) => {
  if (!period) return false;
  const latest = resolveCtoCurrentDisplayPeriod(displayRecords);
  if (!latest) return false;
  return normalizeCtoPeriodKey(period) !== normalizeCtoPeriodKey(latest);
};

const resolveCtoCurrentDisplayPeriod = (displayRecords = []) => {
  const sorted = sortCtoPeriodsDesc(Array.isArray(displayRecords) ? displayRecords : []);
  return sorted.find((p) => !isCtoPeriodVoided(p) && !isCtoCommutedLocked(p)) ?? null;
};

const assertCtoPeriodIsCurrentDisplay = (periodRow, allRows = []) => {
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

const latestCtoPeriodsByKey = (periods = []) => {
  const list = (Array.isArray(periods) ? periods : []).filter(
    (p) => !p?.voided_at && !isCtoCommutedLocked(p) && !isCtoEarningLedgerRow(p),
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

const latestCtoPeriodsByKeyForDisplay = (periods = []) => {
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

const sortCtoPeriodsDesc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(b.period_month) - semOrder(a.period_month);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
  });

const sortCtoPeriodsAsc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(a.period_year) || 0) - (Number(b.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(a.period_month) - semOrder(b.period_month);
    if (sd !== 0) return sd;
    return toNum(a.id) - toNum(b.id);
  });

const isCtoEarningVoided = (earning) =>
  !!(earning?.voided_at) || Number(earning?.voided) === 1;

const ctoEarningMatchesPeriod = (earning, period) => {
  if (!earning || !period) return false;
  if (isCtoEarningVoided(earning)) return false;
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

const filterApprovedCtoEarningsForPeriod = (earningsList, period) => {
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

const getApprovedCtoEarningsHoursForPeriod = (earningsList, period) => {
  if (!period) return 0;
  return filterApprovedCtoEarningsForPeriod(earningsList, period).reduce(
    (s, e) => s + toNum(e.earned_hours),
    0,
  );
};

const getCtoCommutedHours = (period) => {
  if (!period) return 0;
  const hrs = toNum(period.commuted_hours);
  if (hrs > 0) return hrs;
  const days = toNum(period.commuted_days);
  if (days > 0) return days * 8;
  return 0;
};

const computeCtoBalances = (period, { earningsList } = {}) => {
  const isCommuted = isCtoCommutedLocked(period);
  const otEarned = toNum(period?.earned_hours);
  const usedHrs = toNum(period?.used_hours);
  const totalHours = Math.max(0, toNum(period?.total_hours) || otEarned - usedHrs);
  const earnedBalance = getApprovedCtoEarningsHoursForPeriod(earningsList, period);

  if (isCommuted) {
    const commutedHrs = getCtoCommutedHours(period) || Math.max(0, totalHours + earnedBalance);
    return {
      otEarned,
      usedHrs,
      totalHours: 0,
      earnedBalance: 0,
      remainingBalance: 0,
      commutedHrs,
      carriedHrs: toNum(period?.carried_forward_hours),
      earnedHrs: 0,
      remHrs: 0,
      adjustedHrs: 0,
    };
  }

  const remainingBalance = period?.voided_at
    ? 0
    : Math.max(0, totalHours + earnedBalance);

  return {
    otEarned,
    usedHrs,
    totalHours,
    earnedBalance,
    remainingBalance,
    commutedHrs: 0,
    carriedHrs: toNum(period?.carried_forward_hours),
    earnedHrs: earnedBalance,
    remHrs: remainingBalance,
    adjustedHrs: totalHours,
  };
};

const getCtoDisplayRemainingHours = (period, earningsList = []) => {
  if (!period || period.voided_at || isCtoCommutedLocked(period)) return 0;
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

const getCtoPeriodHeadForKey = (records = [], periodYear, periodMonth) => {
  const key = normalizeCtoPeriodKey({ period_year: periodYear, period_month: periodMonth });
  const heads = latestCtoPeriodsByKeyForDisplay(records || []);
  return heads.find((r) => normalizeCtoPeriodKey(r) === key) || null;
};

const isCtoPeriodKeyClosed = (records = [], periodYear, periodMonth) => {
  const head = getCtoPeriodHeadForKey(records, periodYear, periodMonth);
  if (!head) return false;
  return isCtoPeriodVoided(head) || isCtoCommutedLocked(head);
};

const isCtoPeriodChronologicallyAfter = (anchorPeriod, targetYear, targetMonth) => {
  if (!anchorPeriod) return false;
  const sameKey =
    normalizeCtoPeriodKey(anchorPeriod) ===
    normalizeCtoPeriodKey({ period_year: targetYear, period_month: targetMonth });
  if (sameKey) return false;
  return isBeforeCtoPeriod(anchorPeriod, targetYear, targetMonth);
};

const assertCtoPeriodAssignableForCredits = (records = [], periodYear, periodMonth) => {
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

const getPriorPeriodCtoSnapshot = (records = [], targetYear, targetMonth = null) => {
  const prior = findPriorCtoPeriodSnapshot(records, targetYear, targetMonth);
  if (!prior || isCtoPeriodVoided(prior) || isCtoCommutedLocked(prior)) return null;
  return prior;
};

const getPriorPeriodCtoCarryForward = (records = [], earningsList = [], targetYear, targetMonth = null) => {
  const prior = getPriorPeriodCtoSnapshot(records, targetYear, targetMonth);
  if (!prior) return 0;
  return getCtoDisplayRemainingHours(prior, earningsList);
};

const recomputeCtoLedgerFields = (period, earningsList = []) => {
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

const isCtoEarningLedgerRow = (row) => {
  const r = String(row?.remarks || "");
  return /\bcto_earning:\d+\b/i.test(r) && !/\bcto_earning_reversal:/i.test(r);
};

const queryAsync = (dbConn, sql, params = []) => {
  if (dbConn && typeof dbConn.execute === "function") {
    const ret = dbConn.execute(sql, params);
    if (ret && typeof ret.then === "function") {
      return ret.then(([rows]) => rows || []);
    }
  }
  return new Promise((resolve, reject) => {
    dbConn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
};

const execAsync = (dbConn, sql, params = []) => {
  if (dbConn && typeof dbConn.execute === "function") {
    const ret = dbConn.execute(sql, params);
    if (ret && typeof ret.then === "function") {
      return ret.then(([result]) => result);
    }
  }
  return new Promise((resolve, reject) => {
    dbConn.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
};

const hasApprovedCtoEarningsForPeriod = async (db, period) => {
  if (!period) return false;
  const sem = period.period_month != null ? parseInt(period.period_month, 10) : null;
  const rows = await queryAsync(
    db,
    `SELECT COUNT(*) AS c FROM cto_earnings
     WHERE employee_number = ?
       AND earn_status = 'approved' AND voided_at IS NULL AND (voided IS NULL OR voided = 0)
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))`,
    [String(period.employeeNumber), period.period_year, sem, sem],
  );
  return Number(rows[0]?.c) > 0;
};

const recomputeCtoLedgerFieldsAsync = async (db, period) => {
  const sem = period.period_month != null ? parseInt(period.period_month, 10) : null;
  const earnings = await queryAsync(
    db,
    `SELECT * FROM cto_earnings
     WHERE employee_number = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))`,
    [String(period.employeeNumber), period.period_year, sem, sem],
  );
  return recomputeCtoLedgerFields(period, earnings);
};

const findLatestCtoPeriodRow = async (db, employeeNumber, periodYear, periodMonth) => {
  const pm = periodMonth != null && String(periodMonth).trim() !== "" ? parseInt(periodMonth, 10) : null;
  const rows = await queryAsync(
    db,
    `SELECT * FROM cto_credit
     WHERE employeeNumber = ? AND voided_at IS NULL
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))
     ORDER BY id DESC`,
    [String(employeeNumber), periodYear, pm, pm],
  );
  return rows.find((r) => !isCtoEarningLedgerRow(r)) || null;
};

const refreshCtoPeriodLedgerOnRow = async (db, periodRow) => {
  const ledger = await recomputeCtoLedgerFieldsAsync(db, periodRow);
  await execAsync(
    db,
    `UPDATE cto_credit SET
       total_hours = ?, remaining_hours = ?, earning_status = ?,
       earned_hours = ?, used_hours = ?, carried_forward_hours = ?
     WHERE id = ?`,
    [
      ledger.total_hours,
      ledger.remaining_hours,
      ledger.earning_status,
      ledger.earned_hours,
      ledger.used_hours,
      ledger.carried_forward_hours,
      periodRow.id,
    ],
  );
  return ledger;
};

const restoreCtoPeriodUsedHoursAsync = async (db, periodRow, hoursToRestore) => {
  const hrs = Math.max(0, toNum(hoursToRestore));
  if (hrs <= 0 || !periodRow?.id) return periodRow;
  const newUsed = Math.max(0, toNum(periodRow.used_hours) - hrs);
  await execAsync(db, `UPDATE cto_credit SET used_hours = ? WHERE id = ?`, [newUsed, periodRow.id]);
  const updated = { ...periodRow, used_hours: newUsed };
  await refreshCtoPeriodLedgerOnRow(db, updated);
  return updated;
};

/** Reverse one CTO deduction usage row and void its ledger snapshot. */
const reverseCtoDeductionUsageAsync = async (db, usageRow, periodRow) => {
  const applyHrs = toNum(usageRow?.hours_applied);
  const usageId = usageRow?.id ?? usageRow?.usage_id;
  const ledgerId = usageRow?.cto_credit_id;
  if (applyHrs > 0 && periodRow) {
    await restoreCtoPeriodUsedHoursAsync(db, periodRow, applyHrs);
  }
  if (usageId) {
    await execAsync(db, `DELETE FROM cto_usage WHERE id = ?`, [usageId]);
  }
  if (ledgerId) {
    await execAsync(db, `UPDATE cto_credit SET voided_at = NOW() WHERE id = ? AND voided_at IS NULL`, [ledgerId]);
  }
  return applyHrs;
};

/** Soft-void an approved CTO deduction cto_earnings row and restore period used_hours. */
const reverseCtoDeductionEarningAsync = async (db, deductionRec) => {
  if (!deductionRec?.id) return 0;
  const id = deductionRec.id;
  if (isCtoEarningVoided(deductionRec)) return 0;
  const mark = `cto_earning:${id}`;
  const applyHrs = Math.abs(toNum(deductionRec.earned_hours));
  const periodRow = await findLatestCtoPeriodRow(
    db,
    deductionRec.employee_number,
    deductionRec.period_year,
    deductionRec.period_month,
  );

  const usageRows = await queryAsync(
    db,
    `SELECT u.* FROM cto_usage u
     WHERE u.employeeNumber = ?
       AND (u.remarks = ? OR u.remarks LIKE ?)`,
    [String(deductionRec.employee_number), mark, `${mark} ·%`],
  );

  let restored = 0;
  if (usageRows.length) {
    for (const u of usageRows) {
      restored += await reverseCtoDeductionUsageAsync(db, u, periodRow);
    }
  } else if (periodRow && applyHrs > 0) {
    await restoreCtoPeriodUsedHoursAsync(db, periodRow, applyHrs);
    restored = applyHrs;
  }

  await execAsync(
    db,
    `UPDATE cto_earnings SET voided_at = NOW(), voided = 1, is_applied = 0 WHERE id = ?`,
    [id],
  );
  return restored;
};

/**
 * Reverse all CTO attendance deductions for a period (cto_earnings DEDUCTION + direct ledger).
 * Called when voiding positive earnings so balances can be deducted again.
 */
const reverseCtoPeriodAttendanceDeductionsAsync = async (
  db,
  employeeNumber,
  periodYear,
  periodMonth,
) => {
  const pm = periodMonth != null && String(periodMonth).trim() !== "" ? parseInt(periodMonth, 10) : null;
  const periodRow = await findLatestCtoPeriodRow(db, employeeNumber, periodYear, periodMonth);

  const deductionEarnings = await queryAsync(
    db,
    `SELECT * FROM cto_earnings
     WHERE employee_number = ?
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))
       AND UPPER(COALESCE(entry_type, '')) = 'DEDUCTION'
       AND earn_status = 'approved'
       AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [String(employeeNumber), periodYear, pm, pm],
  );

  let totalRestored = 0;
  const voidedEarningIds = [];
  for (const row of deductionEarnings) {
    totalRestored += await reverseCtoDeductionEarningAsync(db, row);
    voidedEarningIds.push(row.id);
  }

  const directUsage = await queryAsync(
    db,
    `SELECT u.*, sc.id AS ledger_id
     FROM cto_usage u
     INNER JOIN cto_credit sc ON sc.id = u.cto_credit_id
     WHERE u.employeeNumber = ?
       AND sc.period_year = ?
       AND (sc.period_month = ? OR (? IS NULL AND sc.period_month IS NULL))
       AND sc.voided_at IS NULL
       AND u.action = 'offset'
       AND (u.remarks LIKE 'cto_direct_deduction:%' OR u.remarks LIKE 'cto_earning:%')`,
    [String(employeeNumber), periodYear, pm, pm],
  );

  const voidedLedgerIds = [];
  for (const u of directUsage) {
    totalRestored += await reverseCtoDeductionUsageAsync(
      db,
      { ...u, cto_credit_id: u.ledger_id || u.cto_credit_id },
      periodRow,
    );
    if (u.ledger_id) voidedLedgerIds.push(u.ledger_id);
  }

  if (periodRow) {
    await refreshCtoPeriodLedgerOnRow(db, periodRow);
  }

  return { totalRestored, voidedEarningIds, voidedLedgerIds };
};

const loadCtoChainContextAsync = async (db, employeeNumber) => {
  const emp = String(employeeNumber || "").trim();
  const periods = await queryAsync(
    db,
    `SELECT * FROM cto_credit WHERE employeeNumber = ? AND voided_at IS NULL`,
    [emp],
  );
  const earnings = await queryAsync(
    db,
    `SELECT * FROM cto_earnings
     WHERE employee_number = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [emp],
  );
  return { periods, earnings };
};

/** CTO hours from OT entry this period (ledger earned minus carry). */
const periodOtCtoHours = (row) => {
  const carry = toNum(row?.carried_forward_hours);
  const earned = toNum(row?.earned_hours);
  return Math.max(0, earned - carry);
};

const CTO_ENTRY_DELTA_RE = /cto_entry_delta_hours:([0-9.]+)/i;

const parseCtoEntryDeltaHours = (remarks) => {
  const m = String(remarks || "").match(CTO_ENTRY_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

const stampCtoEntryDeltaRemarks = (remarks, deltaHours) => {
  const hrs = toNum(deltaHours);
  if (hrs <= 0) return remarks || null;
  const base = String(remarks || "")
    .replace(/\s*·?\s*cto_entry_delta_hours:[0-9.]+\s*/gi, "")
    .trim();
  const tag = `cto_entry_delta_hours:${hrs}`;
  return base ? `${base} · ${tag}` : tag;
};

const CTO_USED_DELTA_RE = /cto_used_delta_hours:([0-9.]+)/i;

const parseCtoUsedDeltaHours = (remarks) => {
  const m = String(remarks || "").match(CTO_USED_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

const stampCtoUsedDeltaRemarks = (remarks, deltaHours) => {
  const hrs = toNum(deltaHours);
  if (hrs <= 0) return remarks || null;
  const base = String(remarks || "")
    .replace(/\s*·?\s*cto_used_delta_hours:[0-9.]+\s*/gi, "")
    .trim();
  const tag = `cto_used_delta_hours:${hrs}`;
  return base ? `${base} · ${tag}` : tag;
};

const computeCtoUsedDelta = (row, prev, rows, idx) => {
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

/** True when snapshot represents an OT increment (undo-eligible), not a deduction-only line. */
const isCtoOtUndoableSnapshot = (row, prev, rows, idx) => {
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

/** Display delta: stamped at insert, else vs previous non-voided snapshot in period. */
const computeCtoSnapshotDelta = (row, prev, rows, idx) => {
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

const CTO_UNDO_MAX_PER_PERIOD = 5;

/** Collapse consecutive duplicate deduction snapshots (legacy double-apply). */
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

/** Dedupe duplicate deductions within each void batch (voided_at group). */
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

const normalizeCtoPeriodMonth = (pm) => {
  if (pm == null || String(pm).trim() === "") return null;
  const n = parseInt(String(pm), 10);
  return Number.isFinite(n) ? n : null;
};

const ctoPeriodKeyMatches = (row, employeeNumber, periodYear, periodMonth) => {
  if (!row) return false;
  const emp = String(employeeNumber || "").trim();
  if (String(row.employeeNumber || row.employee_number || "").trim() !== emp) return false;
  if (String(parseInt(String(row.period_year), 10) || "") !== String(parseInt(String(periodYear), 10) || "")) {
    return false;
  }
  const wantPm = normalizeCtoPeriodMonth(periodMonth);
  const rowPm = normalizeCtoPeriodMonth(row.period_month);
  if (wantPm == null && rowPm == null) return true;
  return wantPm === rowPm;
};

const parseAuditDetailsJson = (detailsJson) => {
  if (detailsJson == null || detailsJson === "") return null;
  if (typeof detailsJson === "object") return detailsJson;
  try {
    return JSON.parse(String(detailsJson));
  } catch {
    return null;
  }
};

const auditDetailsMatchCtoPeriod = (detailsJson, periodYear, periodMonth) => {
  const d = parseAuditDetailsJson(detailsJson);
  if (!d) return false;
  if (String(parseInt(String(d.period_year), 10) || "") !== String(parseInt(String(periodYear), 10) || "")) {
    return false;
  }
  const wantPm = normalizeCtoPeriodMonth(periodMonth);
  const dPm = normalizeCtoPeriodMonth(d.period_month);
  if (wantPm == null && dPm == null) return true;
  return wantPm === dPm;
};

/** Count undo-entry clicks since the last full void-period for this employee + period. */
const countCtoUndoClicksUsedAsync = async (db, employeeNumber, periodYear, periodMonth) => {
  const emp = String(employeeNumber || "").trim();
  const rows = await queryAsync(
    db,
    `SELECT action, details_json, timestamp
     FROM audit_log
     WHERE table_name = 'cto_credit'
       AND targetEmployeeNumber = ?
       AND action IN ('undo entry', 'voided current period')
     ORDER BY timestamp ASC`,
    [emp],
  );

  let resetAfter = null;
  for (const row of rows) {
    if (row.action !== "voided current period") continue;
    if (!auditDetailsMatchCtoPeriod(row.details_json, periodYear, periodMonth)) continue;
    resetAfter = row.timestamp;
  }

  let used = 0;
  for (const row of rows) {
    if (row.action !== "undo entry") continue;
    if (!auditDetailsMatchCtoPeriod(row.details_json, periodYear, periodMonth)) continue;
    if (resetAfter && new Date(row.timestamp) <= new Date(resetAfter)) continue;
    used += 1;
  }
  return used;
};

const filterCtoEarningsForPeriodDisplay = (earningsList, employeeNumber, periodYear, periodMonth) => {
  const emp = String(employeeNumber || "").trim();
  const py = String(parseInt(String(periodYear), 10) || "");
  const pm = normalizeCtoPeriodMonth(periodMonth);
  return (Array.isArray(earningsList) ? earningsList : []).filter((e) => {
    if (String(e.employee_number || "").trim() !== emp) return false;
    if (String(parseInt(String(e.period_year), 10) || "") !== py) return false;
    const ePm = normalizeCtoPeriodMonth(e.period_month);
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
      otEarned: toNum(row.earned_hours),
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

const sortLedgerLines = (lines) =>
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

/**
 * Build per-snapshot OT deltas for one period (includes voided rows for audit).
 */
const buildCtoPeriodSnapshotHistory = (
  allPeriodRows,
  earningsList,
  { employeeNumber, periodYear, periodMonth, undoClicksUsed = 0, chainRecords = [] } = {},
) => {
  const rows = (Array.isArray(allPeriodRows) ? allPeriodRows : [])
    .filter((r) => ctoPeriodKeyMatches(r, employeeNumber, periodYear, periodMonth))
    .filter((r) => !isCtoEarningLedgerRow(r))
    .sort((a, b) => toNum(a.id) - toNum(b.id));

  const activeRows = rows.filter((r) => !r.voided_at && !isCtoCommutedLocked(r));
  const latestActiveId = activeRows.length
    ? Math.max(...activeRows.map((r) => toNum(r.id)))
    : null;
  const undoClicksRemaining = Math.max(0, CTO_UNDO_MAX_PER_PERIOD - toNum(undoClicksUsed));
  const canUndoPeriod = undoClicksRemaining > 0 && activeRows.length > 1;

  const chain = chainRecords.length ? chainRecords : rows;

  const snapshots = rows.map((row, idx) => {
    const prev = idx > 0 ? rows[idx - 1] : null;
    const rowId = toNum(row.id);
    const isActive = latestActiveId != null && rowId === latestActiveId;
    const ctoDelta = computeCtoSnapshotDelta(row, prev, rows, idx);
    const usedDelta = computeCtoUsedDelta(row, prev, rows, idx);
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
    sortLedgerLines([...activeSnapshotLines, ...activeEarningLines]),
  );
  const ledger_lines_voided = enrichCtoLedgerEarningBalances(
    sortLedgerLines([...voidedSnapshotLines, ...voidedEarningLines]),
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

/**
 * Align carried_forward_hours / earned_hours when a period was auto-created (e.g. attendance deduction)
 * without a manual CTO OT entry.
 */
const syncCtoPeriodCarryWithContextAsync = async (db, periodRow, periods, earnings) => {
  if (!periodRow?.id) return periodRow;
  const expectedCarry = getPriorPeriodCtoCarryForward(
    periods,
    earnings,
    periodRow.period_year,
    periodRow.period_month,
  );
  const hasManualOt = toNum(periodRow.ot_hours) > 0;
  const otSc = hasManualOt ? periodOtCtoHours(periodRow) : 0;
  const expectedEarned = expectedCarry + otSc;
  const needsRepair =
    toNum(periodRow.carried_forward_hours) !== expectedCarry ||
    toNum(periodRow.earned_hours) !== expectedEarned ||
    (!hasManualOt && toNum(periodRow.ot_hours) !== 0);

  if (!needsRepair) return periodRow;

  const working = {
    ...periodRow,
    carried_forward_hours: expectedCarry,
    earned_hours: expectedEarned,
    ot_hours: hasManualOt ? toNum(periodRow.ot_hours) : 0,
  };
  const ledger = recomputeCtoLedgerFields(working, earnings);
  await execAsync(
    db,
    `UPDATE cto_credit SET
       carried_forward_hours = ?, earned_hours = ?, total_hours = ?, remaining_hours = ?,
       earning_status = ?, used_hours = ?, ot_hours = ?
     WHERE id = ?`,
    [
      ledger.carried_forward_hours,
      ledger.earned_hours,
      ledger.total_hours,
      ledger.remaining_hours,
      ledger.earning_status,
      ledger.used_hours,
      working.ot_hours,
      periodRow.id,
    ],
  );
  const updated = await queryAsync(db, `SELECT * FROM cto_credit WHERE id = ?`, [periodRow.id]);
  return updated[0] || periodRow;
};

/** Re-align active snapshot carry/earned after undo voids the latest row. */
const repairCtoSnapshotAfterUndo = async (db, periodRow) => {
  if (!periodRow?.id) return periodRow;
  const emp = String(periodRow.employeeNumber || "").trim();
  const { periods, earnings } = await loadCtoChainContextAsync(db, emp);
  return syncCtoPeriodCarryWithContextAsync(db, periodRow, periods, earnings);
};

const syncCtoPeriodCarryAsync = async (db, periodRow) => {
  if (!periodRow?.id) return periodRow;
  const { periods, earnings } = await loadCtoChainContextAsync(db, periodRow.employeeNumber);
  return syncCtoPeriodCarryWithContextAsync(db, periodRow, periods, earnings);
};

/** Sync carry-forward for all active periods — one chain load, chronological pass. */
const syncCtoEmployeeCarriesAsync = async (db, employeeNumber) => {
  const emp = String(employeeNumber || "").trim();
  let { periods, earnings } = await loadCtoChainContextAsync(db, emp);
  const snapshots = sortCtoPeriodsAsc(latestCtoPeriodsByKey(periods));
  for (const periodRow of snapshots) {
    const updated = await syncCtoPeriodCarryWithContextAsync(db, periodRow, periods, earnings);
    if (updated?.id) {
      const idx = periods.findIndex((p) => Number(p.id) === Number(updated.id));
      if (idx >= 0) {
        periods[idx] = updated;
      } else {
        periods.push(updated);
      }
    }
  }
  return snapshots.length;
};

const loadCtoPeriodHistoryAsync = async (db, employeeNumber, periodYear, periodMonth, undoClicksUsed = null) => {
  const emp = String(employeeNumber || "").trim();
  const py = periodYear;
  const pm =
    periodMonth != null && String(periodMonth).trim() !== ""
      ? parseInt(String(periodMonth), 10)
      : null;

  let periodSql = `SELECT * FROM cto_credit
                   WHERE employeeNumber = ?  AND period_year = ?`;
  const periodParams = [emp, py];
  if (pm != null) {
    periodSql += " AND period_month = ?";
    periodParams.push(pm);
  } else {
    periodSql += " AND period_month IS NULL";
  }
  periodSql += " ORDER BY id ASC";

  let earnSql = `SELECT * FROM cto_earnings
                 WHERE employee_number = ? AND period_year = ?`;
  const earnParams = [emp, py];
  if (pm != null) {
    earnSql += " AND period_month = ?";
    earnParams.push(pm);
  } else {
    earnSql += " AND period_month IS NULL";
  }
  earnSql += " ORDER BY id ASC";

  const used =
    undoClicksUsed != null
      ? toNum(undoClicksUsed)
      : await countCtoUndoClicksUsedAsync(db, emp, py, pm);

  const [periodRows, earnings, chainCtx] = await Promise.all([
    queryAsync(db, periodSql, periodParams),
    queryAsync(db, earnSql, earnParams),
    loadCtoChainContextAsync(db, emp),
  ]);

  return buildCtoPeriodSnapshotHistory(periodRows, earnings, {
    employeeNumber: emp,
    periodYear: py,
    periodMonth: pm,
    undoClicksUsed: used,
    chainRecords: chainCtx.periods || [],
  });
};

/** Append-only ledger snapshot (OT add, deduction, action). */
const appendCtoLedgerSnapshotAsync = async (db, baseRow, ledger, { remarks = null, stampUsedDelta = null, stampCtoDelta = null } = {}) => {
  let finalRemarks = remarks || null;
  if (stampUsedDelta != null && toNum(stampUsedDelta) > 0) {
    finalRemarks = stampCtoUsedDeltaRemarks(finalRemarks, stampUsedDelta);
  }
  if (stampCtoDelta != null && toNum(stampCtoDelta) > 0) {
    finalRemarks = stampCtoEntryDeltaRemarks(finalRemarks, stampCtoDelta);
  }

  const insert = await execAsync(
    db,
    `INSERT INTO cto_credit
      (employeeNumber, ot_hours, earned_hours, total_hours, carried_forward_hours, remaining_hours, used_hours, earning_status,
       period_year, period_month, remarks, emp_category_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      baseRow.employeeNumber,
      toNum(baseRow.ot_hours),
      ledger.earned_hours,
      ledger.total_hours,
      ledger.carried_forward_hours,
      ledger.remaining_hours,
      ledger.used_hours,
      ledger.earning_status,
      baseRow.period_year,
      baseRow.period_month != null ? parseInt(baseRow.period_month, 10) : null,
      finalRemarks,
      baseRow.emp_category_snapshot || null,
    ],
  );
  const rows = await queryAsync(db, `SELECT * FROM cto_credit WHERE id = ?`, [insert.insertId]);
  return rows[0];
};

/** In-memory carry/earned alignment before append (no UPDATE — avoids duplicate superseded rows). */
const alignCtoPeriodBaseForAppend = (periodRow, periods, earnings) => {
  if (!periodRow) return periodRow;
  const expectedCarry = getPriorPeriodCtoCarryForward(
    periods,
    earnings,
    periodRow.period_year,
    periodRow.period_month,
  );
  const hasManualOt = toNum(periodRow.ot_hours) > 0;
  const otSc = hasManualOt ? periodOtCtoHours(periodRow) : 0;
  const expectedEarned = expectedCarry + otSc;
  return {
    ...periodRow,
    carried_forward_hours: expectedCarry,
    earned_hours: expectedEarned,
    ot_hours: hasManualOt ? toNum(periodRow.ot_hours) : 0,
    used_hours: toNum(periodRow.used_hours),
  };
};

/** Skip duplicate deduction append (same period, hours, and remarks). */
const findExistingCtoDeductionSnapshotAsync = async (
  db,
  employeeNumber,
  periodYear,
  periodMonth,
  applyHrs,
  remarks,
) => {
  const emp = String(employeeNumber || "").trim();
  const pm = periodMonth != null && String(periodMonth).trim() !== "" ? parseInt(periodMonth, 10) : null;
  const hrs = toNum(applyHrs);
  if (hrs <= 0) return null;

  const rows = await queryAsync(
    db,
    `SELECT sc.* FROM cto_credit sc
     WHERE sc.employeeNumber = ? AND sc.period_year = ?
       AND (sc.period_month = ? OR (? IS NULL AND sc.period_month IS NULL))
       AND sc.voided_at IS NULL
     ORDER BY sc.id DESC`,
    [emp, periodYear, pm, pm],
  );

  const remarkKey = String(remarks || "").trim();
  const earningIdMatch = remarkKey.match(/cto_earning:(\d+)/);

  for (const row of rows) {
    const stamped = parseCtoUsedDeltaHours(row.remarks);
    if (stamped == null || Math.abs(stamped - hrs) > 0.001) continue;
    if (!remarkKey) return row;
    const rowRemarks = String(row.remarks || "");
    if (rowRemarks.includes(remarkKey)) return row;
    if (earningIdMatch && rowRemarks.includes(`cto_earning:${earningIdMatch[1]}`)) return row;
  }

  const usageRows = await queryAsync(
    db,
    `SELECT sc.* FROM cto_usage u
     INNER JOIN cto_credit sc ON sc.id = u.cto_credit_id
     WHERE u.employeeNumber = ? AND sc.period_year = ?
       AND (sc.period_month = ? OR (? IS NULL AND sc.period_month IS NULL))
       AND u.action = 'offset' AND ABS(u.hours_applied - ?) < 0.001
       AND sc.voided_at IS NULL
     ORDER BY sc.id DESC LIMIT 1`,
    [emp, periodYear, pm, pm, hrs],
  );
  return usageRows[0] || null;
};

const createCtoPeriodRowAsync = async (db, rec) => {
  const { periods, earnings } = await loadCtoChainContextAsync(db, rec.employee_number);
  const carry = getPriorPeriodCtoCarryForward(
    periods,
    earnings,
    rec.period_year,
    rec.period_month,
  );
  const pm = rec.period_month != null ? parseInt(rec.period_month, 10) : null;
  const working = {
    employeeNumber: rec.employee_number,
    earned_hours: carry,
    used_hours: 0,
    carried_forward_hours: carry,
    period_year: rec.period_year,
    period_month: pm,
  };
  const ledger = recomputeCtoLedgerFields(working, earnings);
  const insert = await execAsync(
    db,
    `INSERT INTO cto_credit
      (employeeNumber, ot_hours, earned_hours, total_hours, carried_forward_hours, remaining_hours, used_hours, earning_status,
       period_year, period_month, emp_category_snapshot)
     VALUES (?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    [
      rec.employee_number,
      ledger.earned_hours,
      ledger.total_hours,
      ledger.carried_forward_hours,
      ledger.remaining_hours,
      ledger.earning_status,
      rec.period_year,
      pm,
      rec.emp_category_snapshot || null,
    ],
  );
  const rows = await queryAsync(db, `SELECT * FROM cto_credit WHERE id = ?`, [insert.insertId]);
  return rows[0];
};

const ensureCtoPeriodRowAsync = async (db, rec) => {
  const existing = await findLatestCtoPeriodRow(db, rec.employee_number, rec.period_year, rec.period_month);
  if (existing) return syncCtoPeriodCarryAsync(db, existing);
  return createCtoPeriodRowAsync(db, rec);
};

module.exports = {
  toNum,
  normalizeCtoPeriodKey,
  latestCtoPeriodsByKey,
  sortCtoPeriodsDesc,
  sortCtoPeriodsAsc,
  ctoEarningMatchesPeriod,
  filterApprovedCtoEarningsForPeriod,
  getApprovedCtoEarningsHoursForPeriod,
  getCtoCommutedHours,
  computeCtoBalances,
  getCtoDisplayRemainingHours,
  isCtoCommutedLocked,
  isCtoPeriodSuperseded,
  resolveCtoCurrentDisplayPeriod,
  ctoRecordsForDisplay,
  assertCtoPeriodIsCurrentDisplay,
  assertCtoPeriodAssignableForCredits,
  isCtoPeriodKeyClosed,
  getPriorPeriodCtoCarryForward,
  getPriorPeriodCtoSnapshot,
  recomputeCtoLedgerFields,
  recomputeCtoLedgerFieldsAsync,
  hasApprovedCtoEarningsForPeriod,
  findLatestCtoPeriodRow,
  isCtoEarningLedgerRow,
  refreshCtoPeriodLedgerOnRow,
  restoreCtoPeriodUsedHoursAsync,
  reverseCtoDeductionEarningAsync,
  reverseCtoPeriodAttendanceDeductionsAsync,
  loadCtoChainContextAsync,
  syncCtoPeriodCarryAsync,
  syncCtoEmployeeCarriesAsync,
  loadCtoPeriodHistoryAsync,
  createCtoPeriodRowAsync,
  ensureCtoPeriodRowAsync,
  queryAsync,
  execAsync,
  periodOtCtoHours,
  CTO_UNDO_MAX_PER_PERIOD,
  ctoPeriodKeyMatches,
  countCtoUndoClicksUsedAsync,
  buildCtoPeriodSnapshotHistory,
  filterCtoEarningsForPeriodDisplay,
  parseCtoEntryDeltaHours,
  stampCtoEntryDeltaRemarks,
  parseCtoUsedDeltaHours,
  stampCtoUsedDeltaRemarks,
  computeCtoSnapshotDelta,
  computeCtoUsedDelta,
  isCtoOtUndoableSnapshot,
  appendCtoLedgerSnapshotAsync,
  alignCtoPeriodBaseForAppend,
  findExistingCtoDeductionSnapshotAsync,
  repairCtoSnapshotAfterUndo,
  syncCtoPeriodCarryWithContextAsync,
};
