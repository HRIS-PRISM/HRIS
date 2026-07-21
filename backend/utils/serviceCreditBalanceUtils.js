/**
 * Mirrors frontend/src/components/LEAVE/serviceCreditBalanceUtils.js
 */

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeScPeriodKey = (p) => {
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

const isScCommutedLocked = (period) =>
  !!(period?.commuted) || Number(period?.commuted) === 1;

const isScPeriodVoided = (period) => !!(period?.voided_at);

const pickActiveScPeriodSnapshot = (rows = []) => {
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

const scRecordsForDisplay = (periods = [], scType = "non_commutative") => {
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

const isScPeriodSuperseded = (period, displayRecords = []) => {
  if (!period) return false;
  const latest = resolveScCurrentDisplayPeriod(displayRecords);
  if (!latest) return false;
  return normalizeScPeriodKey(period) !== normalizeScPeriodKey(latest);
};

const resolveScCurrentDisplayPeriod = (displayRecords = []) => {
  const sorted = sortScPeriodsDesc(Array.isArray(displayRecords) ? displayRecords : []);
  return sorted.find((p) => !isScPeriodVoided(p) && !isScCommutedLocked(p)) ?? null;
};

const assertScPeriodIsCurrentDisplay = (periodRow, allRows = []) => {
  const scType = periodRow?.sc_type || "non_commutative";
  const display = scRecordsForDisplay(allRows, scType);
  const latest = resolveScCurrentDisplayPeriod(display);
  if (!latest) return { ok: false, error: "No active service credit period found" };
  if (normalizeScPeriodKey(periodRow) !== normalizeScPeriodKey(latest)) {
    return {
      ok: false,
      error: "Only the latest service credit period can be modified. Prior periods were superseded.",
    };
  }
  return { ok: true, latest };
};

const latestScPeriodsByKey = (periods = []) => {
  const list = (Array.isArray(periods) ? periods : []).filter(
    (p) => !p?.voided_at && !isScCommutedLocked(p),
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

const latestScPeriodsByKeyForDisplay = (periods = []) => {
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

const sortScPeriodsDesc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(b.period_year) || 0) - (Number(a.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(b.period_month) - semOrder(a.period_month);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
  });

const sortScPeriodsAsc = (periods) =>
  [...periods].sort((a, b) => {
    const yd = (Number(a.period_year) || 0) - (Number(b.period_year) || 0);
    if (yd !== 0) return yd;
    const sd = semOrder(a.period_month) - semOrder(b.period_month);
    if (sd !== 0) return sd;
    return toNum(a.id) - toNum(b.id);
  });

const isScEarningVoided = (earning) =>
  !!(earning?.voided_at) || Number(earning?.voided) === 1;

const scEarningMatchesPeriod = (earning, period) => {
  if (!earning || !period) return false;
  if (isScEarningVoided(earning)) return false;
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

const filterApprovedScEarningsForPeriod = (earningsList, period) => {
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
    if (
      period.sc_type != null &&
      String(e.sc_type || "non_commutative") !== String(period.sc_type || "non_commutative")
    ) {
      return false;
    }
    return scEarningMatchesPeriod(e, period);
  });
};

const getApprovedScEarningsHoursForPeriod = (earningsList, period) => {
  if (!period) return 0;
  return filterApprovedScEarningsForPeriod(earningsList, period).reduce(
    (s, e) => s + toNum(e.earned_hours),
    0,
  );
};

const getScCommutedHours = (period) => {
  if (!period) return 0;
  const hrs = toNum(period.commuted_hours);
  if (hrs > 0) return hrs;
  const days = toNum(period.commuted_days);
  if (days > 0) return days * 8;
  return 0;
};

const computeScBalances = (period, { earningsList } = {}) => {
  const isCommuted = isScCommutedLocked(period);
  const otEarned = toNum(period?.earned_hours);
  const usedHrs = toNum(period?.used_hours);
  const totalHours = Math.max(0, toNum(period?.total_hours) || otEarned - usedHrs);
  const earnedBalance = getApprovedScEarningsHoursForPeriod(earningsList, period);

  if (isCommuted) {
    const commutedHrs = getScCommutedHours(period) || Math.max(0, totalHours + earnedBalance);
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

const getScDisplayRemainingHours = (period, earningsList = []) => {
  if (!period || period.voided_at || isScCommutedLocked(period)) return 0;
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

const getScPeriodHeadForKey = (
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

const isScPeriodKeyClosed = (
  records = [],
  periodYear,
  periodMonth,
  scType = "non_commutative",
) => {
  const head = getScPeriodHeadForKey(records, periodYear, periodMonth, scType);
  if (!head) return false;
  return isScPeriodVoided(head) || isScCommutedLocked(head);
};

const isScPeriodChronologicallyAfter = (anchorPeriod, targetYear, targetMonth) => {
  if (!anchorPeriod) return false;
  const sameKey =
    normalizeScPeriodKey(anchorPeriod) ===
    normalizeScPeriodKey({ period_year: targetYear, period_month: targetMonth });
  if (sameKey) return false;
  return isBeforeScPeriod(anchorPeriod, targetYear, targetMonth);
};

const assertScPeriodAssignableForCredits = (
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

const getPriorPeriodScSnapshot = (records = [], targetYear, targetMonth = null) => {
  const prior = findPriorScPeriodSnapshot(records, targetYear, targetMonth);
  if (!prior || isScPeriodVoided(prior) || isScCommutedLocked(prior)) return null;
  return prior;
};

const getPriorPeriodScCarryForward = (records = [], earningsList = [], targetYear, targetMonth = null) => {
  const prior = getPriorPeriodScSnapshot(records, targetYear, targetMonth);
  if (!prior) return 0;
  return getScDisplayRemainingHours(prior, earningsList);
};

const recomputeScLedgerFields = (period, earningsList = []) => {
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

const isScEarningLedgerRow = (row) => {
  const r = String(row?.remarks || "");
  return /\bsc_earning:\d+\b/i.test(r) && !/\bsc_earning_reversal:/i.test(r);
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

const hasApprovedScEarningsForPeriod = async (db, period) => {
  if (!period) return false;
  const sem = period.period_month != null ? parseInt(period.period_month, 10) : null;
  const rows = await queryAsync(
    db,
    `SELECT COUNT(*) AS c FROM sc_earnings
     WHERE employee_number = ? AND sc_type = ?
       AND earn_status = 'approved' AND voided_at IS NULL AND (voided IS NULL OR voided = 0)
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))`,
    [
      String(period.employeeNumber),
      String(period.sc_type || "non_commutative"),
      period.period_year,
      sem,
      sem,
    ],
  );
  return Number(rows[0]?.c) > 0;
};

const recomputeScLedgerFieldsAsync = async (db, period) => {
  const sem = period.period_month != null ? parseInt(period.period_month, 10) : null;
  const earnings = await queryAsync(
    db,
    `SELECT * FROM sc_earnings
     WHERE employee_number = ? AND sc_type = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))`,
    [
      String(period.employeeNumber),
      String(period.sc_type || "non_commutative"),
      period.period_year,
      sem,
      sem,
    ],
  );
  return recomputeScLedgerFields(period, earnings);
};

const findLatestScPeriodRow = async (db, employeeNumber, scType, periodYear, periodMonth) => {
  const pm = periodMonth != null && String(periodMonth).trim() !== "" ? parseInt(periodMonth, 10) : null;
  const rows = await queryAsync(
    db,
    `SELECT * FROM service_credit
     WHERE employeeNumber = ? AND sc_type = ? AND voided_at IS NULL
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))
     ORDER BY id DESC LIMIT 1`,
    [String(employeeNumber), String(scType || "non_commutative"), periodYear, pm, pm],
  );
  return rows[0] || null;
};

const refreshScPeriodLedgerOnRow = async (db, periodRow) => {
  const ledger = await recomputeScLedgerFieldsAsync(db, periodRow);
  await execAsync(
    db,
    `UPDATE service_credit SET
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

const restoreScPeriodUsedHoursAsync = async (db, periodRow, hoursToRestore) => {
  const hrs = Math.max(0, toNum(hoursToRestore));
  if (hrs <= 0 || !periodRow?.id) return periodRow;
  const newUsed = Math.max(0, toNum(periodRow.used_hours) - hrs);
  await execAsync(db, `UPDATE service_credit SET used_hours = ? WHERE id = ?`, [newUsed, periodRow.id]);
  const updated = { ...periodRow, used_hours: newUsed };
  await refreshScPeriodLedgerOnRow(db, updated);
  return updated;
};

/** Reverse one SC deduction usage row and void its ledger snapshot. */
const reverseScDeductionUsageAsync = async (db, usageRow, periodRow) => {
  const applyHrs = toNum(usageRow?.hours_applied);
  const usageId = usageRow?.id ?? usageRow?.usage_id;
  const ledgerId = usageRow?.service_credit_id;
  if (applyHrs > 0 && periodRow) {
    await restoreScPeriodUsedHoursAsync(db, periodRow, applyHrs);
  }
  if (usageId) {
    await execAsync(db, `DELETE FROM service_credit_usage WHERE id = ?`, [usageId]);
  }
  if (ledgerId) {
    await execAsync(db, `UPDATE service_credit SET voided_at = NOW() WHERE id = ? AND voided_at IS NULL`, [ledgerId]);
  }
  return applyHrs;
};

/** Soft-void an approved SC deduction sc_earnings row and restore period used_hours. */
const reverseScDeductionEarningAsync = async (db, deductionRec) => {
  if (!deductionRec?.id) return 0;
  const id = deductionRec.id;
  if (isScEarningVoided(deductionRec)) return 0;
  const mark = `sc_earning:${id}`;
  const applyHrs = Math.abs(toNum(deductionRec.earned_hours));
  const periodRow = await findLatestScPeriodRow(
    db,
    deductionRec.employee_number,
    deductionRec.sc_type || "non_commutative",
    deductionRec.period_year,
    deductionRec.period_month,
  );

  const usageRows = await queryAsync(
    db,
    `SELECT u.* FROM service_credit_usage u
     WHERE u.employeeNumber = ?
       AND (u.remarks = ? OR u.remarks LIKE ?)`,
    [String(deductionRec.employee_number), mark, `${mark} ·%`],
  );

  let restored = 0;
  if (usageRows.length) {
    for (const u of usageRows) {
      restored += await reverseScDeductionUsageAsync(db, u, periodRow);
    }
  } else if (periodRow && applyHrs > 0) {
    await restoreScPeriodUsedHoursAsync(db, periodRow, applyHrs);
    restored = applyHrs;
  }

  await execAsync(
    db,
    `UPDATE sc_earnings SET voided_at = NOW(), voided = 1, is_applied = 0 WHERE id = ?`,
    [id],
  );
  return restored;
};

/**
 * Reverse all SC attendance deductions for a period (sc_earnings DEDUCTION + direct ledger).
 * Called when voiding positive earnings so balances can be deducted again.
 */
const reverseScPeriodAttendanceDeductionsAsync = async (
  db,
  employeeNumber,
  scType,
  periodYear,
  periodMonth,
) => {
  const pm = periodMonth != null && String(periodMonth).trim() !== "" ? parseInt(periodMonth, 10) : null;
  const periodRow = await findLatestScPeriodRow(db, employeeNumber, scType, periodYear, periodMonth);

  const deductionEarnings = await queryAsync(
    db,
    `SELECT * FROM sc_earnings
     WHERE employee_number = ? AND sc_type = ?
       AND period_year = ?
       AND (period_month = ? OR (? IS NULL AND period_month IS NULL))
       AND UPPER(COALESCE(entry_type, '')) = 'DEDUCTION'
       AND earn_status = 'approved'
       AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [String(employeeNumber), String(scType || "non_commutative"), periodYear, pm, pm],
  );

  let totalRestored = 0;
  const voidedEarningIds = [];
  for (const row of deductionEarnings) {
    totalRestored += await reverseScDeductionEarningAsync(db, row);
    voidedEarningIds.push(row.id);
  }

  const directUsage = await queryAsync(
    db,
    `SELECT u.*, sc.id AS ledger_id
     FROM service_credit_usage u
     INNER JOIN service_credit sc ON sc.id = u.service_credit_id
     WHERE u.employeeNumber = ?
       AND sc.period_year = ?
       AND (sc.period_month = ? OR (? IS NULL AND sc.period_month IS NULL))
       AND sc.voided_at IS NULL
       AND u.action = 'offset'
       AND (u.remarks LIKE 'sc_direct_deduction:%' OR u.remarks LIKE 'sc_earning:%')`,
    [String(employeeNumber), periodYear, pm, pm],
  );

  const voidedLedgerIds = [];
  for (const u of directUsage) {
    totalRestored += await reverseScDeductionUsageAsync(
      db,
      { ...u, service_credit_id: u.ledger_id || u.service_credit_id },
      periodRow,
    );
    if (u.ledger_id) voidedLedgerIds.push(u.ledger_id);
  }

  if (periodRow) {
    await refreshScPeriodLedgerOnRow(db, periodRow);
  }

  return { totalRestored, voidedEarningIds, voidedLedgerIds };
};

const loadScChainContextAsync = async (db, employeeNumber, scType) => {
  const emp = String(employeeNumber || "").trim();
  const st = String(scType || "non_commutative");
  const periods = await queryAsync(
    db,
    `SELECT * FROM service_credit WHERE employeeNumber = ? AND sc_type = ? AND voided_at IS NULL`,
    [emp, st],
  );
  const earnings = await queryAsync(
    db,
    `SELECT * FROM sc_earnings
     WHERE employee_number = ? AND sc_type = ? AND voided_at IS NULL AND (voided IS NULL OR voided = 0)`,
    [emp, st],
  );
  return { periods, earnings };
};

/** SC hours from OT entry this period (ledger earned minus carry). */
const periodOtScHours = (row) => {
  const carry = toNum(row?.carried_forward_hours);
  const earned = toNum(row?.earned_hours);
  return Math.max(0, earned - carry);
};

const SC_ENTRY_DELTA_RE = /sc_entry_delta_hours:([0-9.]+)/i;

const parseScEntryDeltaHours = (remarks) => {
  const m = String(remarks || "").match(SC_ENTRY_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

const stampScEntryDeltaRemarks = (remarks, deltaHours) => {
  const hrs = toNum(deltaHours);
  if (hrs <= 0) return remarks || null;
  const base = String(remarks || "")
    .replace(/\s*·?\s*sc_entry_delta_hours:[0-9.]+\s*/gi, "")
    .trim();
  const tag = `sc_entry_delta_hours:${hrs}`;
  return base ? `${base} · ${tag}` : tag;
};

const SC_USED_DELTA_RE = /sc_used_delta_hours:([0-9.]+)/i;

const parseScUsedDeltaHours = (remarks) => {
  const m = String(remarks || "").match(SC_USED_DELTA_RE);
  if (!m) return null;
  const n = toNum(m[1]);
  return n > 0 ? n : null;
};

const stampScUsedDeltaRemarks = (remarks, deltaHours) => {
  const hrs = toNum(deltaHours);
  if (hrs <= 0) return remarks || null;
  const base = String(remarks || "")
    .replace(/\s*·?\s*sc_used_delta_hours:[0-9.]+\s*/gi, "")
    .trim();
  const tag = `sc_used_delta_hours:${hrs}`;
  return base ? `${base} · ${tag}` : tag;
};

const computeScUsedDelta = (row, prev, rows, idx) => {
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

/** True when snapshot represents an OT increment (undo-eligible), not a deduction-only line. */
const isScOtUndoableSnapshot = (row, prev, rows, idx) => {
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

/** Display delta: stamped at insert, else vs previous non-voided snapshot in period. */
const computeScSnapshotDelta = (row, prev, rows, idx) => {
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

const SC_UNDO_MAX_PER_PERIOD = 5;

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

const parseAuditDetailsJson = (detailsJson) => {
  if (detailsJson == null || detailsJson === "") return null;
  if (typeof detailsJson === "object") return detailsJson;
  try {
    return JSON.parse(String(detailsJson));
  } catch {
    return null;
  }
};

const auditDetailsMatchScPeriod = (detailsJson, periodYear, periodMonth, scType) => {
  const d = parseAuditDetailsJson(detailsJson);
  if (!d) return false;
  if (String(d.sc_type || "non_commutative") !== String(scType || "non_commutative")) return false;
  if (String(parseInt(String(d.period_year), 10) || "") !== String(parseInt(String(periodYear), 10) || "")) {
    return false;
  }
  const wantPm = normalizeScPeriodMonth(periodMonth);
  const dPm = normalizeScPeriodMonth(d.period_month);
  if (wantPm == null && dPm == null) return true;
  return wantPm === dPm;
};

/** Count undo-entry clicks since the last full void-period for this employee + period. */
const countScUndoClicksUsedAsync = async (db, employeeNumber, periodYear, periodMonth, scType) => {
  const emp = String(employeeNumber || "").trim();
  const rows = await queryAsync(
    db,
    `SELECT action, details_json, timestamp
     FROM audit_log
     WHERE table_name = 'service_credit'
       AND targetEmployeeNumber = ?
       AND action IN ('undo entry', 'voided current period')
     ORDER BY timestamp ASC`,
    [emp],
  );

  let resetAfter = null;
  for (const row of rows) {
    if (row.action !== "voided current period") continue;
    if (!auditDetailsMatchScPeriod(row.details_json, periodYear, periodMonth, scType)) continue;
    resetAfter = row.timestamp;
  }

  let used = 0;
  for (const row of rows) {
    if (row.action !== "undo entry") continue;
    if (!auditDetailsMatchScPeriod(row.details_json, periodYear, periodMonth, scType)) continue;
    if (resetAfter && new Date(row.timestamp) <= new Date(resetAfter)) continue;
    used += 1;
  }
  return used;
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
      otEarned: toNum(row.earned_hours),
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

const sortLedgerLines = (lines) =>
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

/**
 * Build per-snapshot OT deltas for one period (includes voided rows for audit).
 */
const buildScPeriodSnapshotHistory = (
  allPeriodRows,
  earningsList,
  { employeeNumber, periodYear, periodMonth, scType, undoClicksUsed = 0, chainRecords = [] } = {},
) => {
  const rows = (Array.isArray(allPeriodRows) ? allPeriodRows : [])
    .filter((r) => scPeriodKeyMatches(r, employeeNumber, periodYear, periodMonth, scType))
    .sort((a, b) => toNum(a.id) - toNum(b.id));

  const activeRows = rows.filter((r) => !r.voided_at && !isScCommutedLocked(r));
  const latestActiveId = activeRows.length
    ? Math.max(...activeRows.map((r) => toNum(r.id)))
    : null;
  const undoClicksRemaining = Math.max(0, SC_UNDO_MAX_PER_PERIOD - toNum(undoClicksUsed));
  const canUndoPeriod = undoClicksRemaining > 0 && activeRows.length > 1;

  const chain = chainRecords.length ? chainRecords : rows;

  const snapshots = rows.map((row, idx) => {
    const prev = idx > 0 ? rows[idx - 1] : null;
    const rowId = toNum(row.id);
    const isActive = latestActiveId != null && rowId === latestActiveId;
    const scDelta = computeScSnapshotDelta(row, prev, rows, idx);
    const usedDelta = computeScUsedDelta(row, prev, rows, idx);
    const prevForOt = rows
      .slice(0, idx)
      .filter((r) => !r?.voided_at && !isScCommutedLocked(r))
      .pop() || prev;
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
    sortLedgerLines([...activeSnapshotLines, ...activeEarningLines]),
  );
  const ledger_lines_voided = enrichScLedgerEarningBalances(
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

/**
 * Align carried_forward_hours / earned_hours when a period was auto-created (e.g. attendance deduction)
 * without a manual Service Credits OT entry.
 */
const syncScPeriodCarryWithContextAsync = async (db, periodRow, periods, earnings) => {
  if (!periodRow?.id) return periodRow;
  const expectedCarry = getPriorPeriodScCarryForward(
    periods,
    earnings,
    periodRow.period_year,
    periodRow.period_month,
  );
  const hasManualOt = toNum(periodRow.total_ot_hours) > 0;
  const otSc = hasManualOt ? periodOtScHours(periodRow) : 0;
  const expectedEarned = expectedCarry + otSc;
  const needsRepair =
    toNum(periodRow.carried_forward_hours) !== expectedCarry ||
    toNum(periodRow.earned_hours) !== expectedEarned ||
    (!hasManualOt && toNum(periodRow.total_ot_hours) !== 0);

  if (!needsRepair) return periodRow;

  const working = {
    ...periodRow,
    carried_forward_hours: expectedCarry,
    earned_hours: expectedEarned,
    total_ot_hours: hasManualOt ? toNum(periodRow.total_ot_hours) : 0,
  };
  const ledger = recomputeScLedgerFields(working, earnings);
  await execAsync(
    db,
    `UPDATE service_credit SET
       carried_forward_hours = ?, earned_hours = ?, total_hours = ?, remaining_hours = ?,
       earning_status = ?, used_hours = ?, total_ot_hours = ?
     WHERE id = ?`,
    [
      ledger.carried_forward_hours,
      ledger.earned_hours,
      ledger.total_hours,
      ledger.remaining_hours,
      ledger.earning_status,
      ledger.used_hours,
      working.total_ot_hours,
      periodRow.id,
    ],
  );
  const updated = await queryAsync(db, `SELECT * FROM service_credit WHERE id = ?`, [periodRow.id]);
  return updated[0] || periodRow;
};

/** Re-align active snapshot carry/earned after undo voids the latest row. */
const repairScSnapshotAfterUndo = async (db, periodRow) => {
  if (!periodRow?.id) return periodRow;
  const emp = String(periodRow.employeeNumber || "").trim();
  const st = String(periodRow.sc_type || "non_commutative");
  const { periods, earnings } = await loadScChainContextAsync(db, emp, st);
  return syncScPeriodCarryWithContextAsync(db, periodRow, periods, earnings);
};

const syncScPeriodCarryAsync = async (db, periodRow) => {
  if (!periodRow?.id) return periodRow;
  const { periods, earnings } = await loadScChainContextAsync(
    db,
    periodRow.employeeNumber,
    periodRow.sc_type,
  );
  return syncScPeriodCarryWithContextAsync(db, periodRow, periods, earnings);
};

/** Sync carry-forward for all active periods — one chain load, chronological pass. */
const syncScEmployeeCarriesAsync = async (db, employeeNumber, scType) => {
  const emp = String(employeeNumber || "").trim();
  const st = String(scType || "non_commutative");
  let { periods, earnings } = await loadScChainContextAsync(db, emp, st);
  const snapshots = sortScPeriodsAsc(latestScPeriodsByKey(periods));
  for (const periodRow of snapshots) {
    const updated = await syncScPeriodCarryWithContextAsync(db, periodRow, periods, earnings);
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

const loadScPeriodHistoryAsync = async (db, employeeNumber, periodYear, periodMonth, scType, undoClicksUsed = null) => {
  const emp = String(employeeNumber || "").trim();
  const py = periodYear;
  const pm =
    periodMonth != null && String(periodMonth).trim() !== ""
      ? parseInt(String(periodMonth), 10)
      : null;
  const st = scType || "non_commutative";

  let periodSql = `SELECT * FROM service_credit
                   WHERE employeeNumber = ? AND sc_type = ? AND period_year = ?`;
  const periodParams = [emp, st, py];
  if (pm != null) {
    periodSql += " AND period_month = ?";
    periodParams.push(pm);
  } else {
    periodSql += " AND period_month IS NULL";
  }
  periodSql += " ORDER BY id ASC";

  let earnSql = `SELECT * FROM sc_earnings
                 WHERE employee_number = ? AND sc_type = ? AND period_year = ?`;
  const earnParams = [emp, st, py];
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
      : await countScUndoClicksUsedAsync(db, emp, py, pm, st);

  const [periodRows, earnings, chainCtx] = await Promise.all([
    queryAsync(db, periodSql, periodParams),
    queryAsync(db, earnSql, earnParams),
    loadScChainContextAsync(db, emp, st),
  ]);

  return buildScPeriodSnapshotHistory(periodRows, earnings, {
    employeeNumber: emp,
    periodYear: py,
    periodMonth: pm,
    scType: st,
    undoClicksUsed: used,
    chainRecords: chainCtx.periods || [],
  });
};

/** Append-only ledger snapshot (OT add, deduction, action). */
const appendScLedgerSnapshotAsync = async (db, baseRow, ledger, { remarks = null, stampUsedDelta = null, stampScDelta = null } = {}) => {
  let finalRemarks = remarks || null;
  if (stampUsedDelta != null && toNum(stampUsedDelta) > 0) {
    finalRemarks = stampScUsedDeltaRemarks(finalRemarks, stampUsedDelta);
  }
  if (stampScDelta != null && toNum(stampScDelta) > 0) {
    finalRemarks = stampScEntryDeltaRemarks(finalRemarks, stampScDelta);
  }

  const insert = await execAsync(
    db,
    `INSERT INTO service_credit
      (employeeNumber, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours,
       earned_hours, total_hours, carried_forward_hours, remaining_hours, used_hours, earning_status,
       period_year, period_month, remarks, emp_category_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      baseRow.employeeNumber,
      baseRow.sc_type || "non_commutative",
      toNum(baseRow.ot_hours_regular),
      toNum(baseRow.ot_hours_holiday),
      toNum(baseRow.ot_hours_night_diff),
      toNum(baseRow.total_ot_hours),
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
  const rows = await queryAsync(db, `SELECT * FROM service_credit WHERE id = ?`, [insert.insertId]);
  return rows[0];
};

/** In-memory carry/earned alignment before append (no UPDATE — avoids duplicate superseded rows). */
const alignScPeriodBaseForAppend = (periodRow, periods, earnings) => {
  if (!periodRow) return periodRow;
  const expectedCarry = getPriorPeriodScCarryForward(
    periods,
    earnings,
    periodRow.period_year,
    periodRow.period_month,
  );
  const hasManualOt = toNum(periodRow.total_ot_hours) > 0;
  const otSc = hasManualOt ? periodOtScHours(periodRow) : 0;
  const expectedEarned = expectedCarry + otSc;
  return {
    ...periodRow,
    carried_forward_hours: expectedCarry,
    earned_hours: expectedEarned,
    total_ot_hours: hasManualOt ? toNum(periodRow.total_ot_hours) : 0,
    used_hours: toNum(periodRow.used_hours),
  };
};

/** Skip duplicate deduction append (same period, hours, and remarks). */
const findExistingScDeductionSnapshotAsync = async (
  db,
  employeeNumber,
  scType,
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
    `SELECT sc.* FROM service_credit sc
     WHERE sc.employeeNumber = ? AND sc.sc_type = ? AND sc.period_year = ?
       AND (sc.period_month = ? OR (? IS NULL AND sc.period_month IS NULL))
       AND sc.voided_at IS NULL
     ORDER BY sc.id DESC`,
    [emp, String(scType || "non_commutative"), periodYear, pm, pm],
  );

  const remarkKey = String(remarks || "").trim();
  const earningIdMatch = remarkKey.match(/sc_earning:(\d+)/);

  for (const row of rows) {
    const stamped = parseScUsedDeltaHours(row.remarks);
    if (stamped == null || Math.abs(stamped - hrs) > 0.001) continue;
    if (!remarkKey) return row;
    const rowRemarks = String(row.remarks || "");
    if (rowRemarks.includes(remarkKey)) return row;
    if (earningIdMatch && rowRemarks.includes(`sc_earning:${earningIdMatch[1]}`)) return row;
  }

  const usageRows = await queryAsync(
    db,
    `SELECT sc.* FROM service_credit_usage u
     INNER JOIN service_credit sc ON sc.id = u.service_credit_id
     WHERE u.employeeNumber = ? AND sc.sc_type = ? AND sc.period_year = ?
       AND (sc.period_month = ? OR (? IS NULL AND sc.period_month IS NULL))
       AND u.action = 'offset' AND ABS(u.hours_applied - ?) < 0.001
       AND sc.voided_at IS NULL
     ORDER BY sc.id DESC LIMIT 1`,
    [emp, String(scType || "non_commutative"), periodYear, pm, pm, hrs],
  );
  return usageRows[0] || null;
};

const createScPeriodRowAsync = async (db, rec) => {
  const { periods, earnings } = await loadScChainContextAsync(
    db,
    rec.employee_number,
    rec.sc_type,
  );
  const carry = getPriorPeriodScCarryForward(
    periods,
    earnings,
    rec.period_year,
    rec.period_month,
  );
  const pm = rec.period_month != null ? parseInt(rec.period_month, 10) : null;
  const working = {
    employeeNumber: rec.employee_number,
    sc_type: rec.sc_type || "non_commutative",
    earned_hours: carry,
    used_hours: 0,
    carried_forward_hours: carry,
    period_year: rec.period_year,
    period_month: pm,
  };
  const ledger = recomputeScLedgerFields(working, earnings);
  const insert = await execAsync(
    db,
    `INSERT INTO service_credit
      (employeeNumber, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours,
       earned_hours, total_hours, carried_forward_hours, remaining_hours, used_hours, earning_status,
       period_year, period_month, emp_category_snapshot)
     VALUES (?, ?, 0, 0, 0, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    [
      rec.employee_number,
      rec.sc_type || "non_commutative",
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
  const rows = await queryAsync(db, `SELECT * FROM service_credit WHERE id = ?`, [insert.insertId]);
  return rows[0];
};

const ensureScPeriodRowAsync = async (db, rec) => {
  const existing = await findLatestScPeriodRow(
    db,
    rec.employee_number,
    rec.sc_type || "non_commutative",
    rec.period_year,
    rec.period_month,
  );
  if (existing) return syncScPeriodCarryAsync(db, existing);
  return createScPeriodRowAsync(db, rec);
};

module.exports = {
  toNum,
  normalizeScPeriodKey,
  latestScPeriodsByKey,
  sortScPeriodsDesc,
  sortScPeriodsAsc,
  scEarningMatchesPeriod,
  filterApprovedScEarningsForPeriod,
  getApprovedScEarningsHoursForPeriod,
  getScCommutedHours,
  computeScBalances,
  getScDisplayRemainingHours,
  isScCommutedLocked,
  isScPeriodSuperseded,
  resolveScCurrentDisplayPeriod,
  scRecordsForDisplay,
  assertScPeriodIsCurrentDisplay,
  assertScPeriodAssignableForCredits,
  isScPeriodKeyClosed,
  getPriorPeriodScCarryForward,
  getPriorPeriodScSnapshot,
  recomputeScLedgerFields,
  recomputeScLedgerFieldsAsync,
  hasApprovedScEarningsForPeriod,
  findLatestScPeriodRow,
  isScEarningLedgerRow,
  refreshScPeriodLedgerOnRow,
  restoreScPeriodUsedHoursAsync,
  reverseScDeductionEarningAsync,
  reverseScPeriodAttendanceDeductionsAsync,
  loadScChainContextAsync,
  syncScPeriodCarryAsync,
  syncScEmployeeCarriesAsync,
  loadScPeriodHistoryAsync,
  createScPeriodRowAsync,
  ensureScPeriodRowAsync,
  queryAsync,
  execAsync,
  periodOtScHours,
  SC_UNDO_MAX_PER_PERIOD,
  scPeriodKeyMatches,
  countScUndoClicksUsedAsync,
  buildScPeriodSnapshotHistory,
  filterScEarningsForPeriodDisplay,
  parseScEntryDeltaHours,
  stampScEntryDeltaRemarks,
  parseScUsedDeltaHours,
  stampScUsedDeltaRemarks,
  computeScSnapshotDelta,
  computeScUsedDelta,
  isScOtUndoableSnapshot,
  appendScLedgerSnapshotAsync,
  alignScPeriodBaseForAppend,
  findExistingScDeductionSnapshotAsync,
  repairScSnapshotAfterUndo,
  syncScPeriodCarryWithContextAsync,
};
