/**
 * Leave assignment rows are append-only snapshots. Summing raw `remaining_hours`
 * double-counts superseded rows in the same period. Use latest row per period,
 * drop commuted-locked rows, then aggregate — same rules as Leave Assignment records UI.
 */

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const isCommutedLocked = (row) =>
  toNum(row?.remaining_hours) === 0 &&
  toNum(row?.total_hours) > 0 &&
  toNum(row?.used_hours) > 0 &&
  toNum(row?.used_hours) >= toNum(row?.total_hours);

export const normalizePeriodKey = (p) => {
  const y = p?.period_year != null ? String(parseInt(String(p.period_year), 10) || "").trim() : "";
  const semRaw = p?.period_semester != null ? String(p.period_semester).trim() : "";
  const semNum = semRaw !== "" && /^[0-9]+$/.test(semRaw) ? parseInt(semRaw, 10) : NaN;
  const sem = Number.isFinite(semNum) ? String(semNum) : semRaw;
  return `${y}|${sem}`;
};

export const latestPeriodsByKey = (periods = []) => {
  const list = Array.isArray(periods) ? periods : [];
  const m = new Map();
  for (const p of list) {
    const key = normalizePeriodKey(p);
    const prev = m.get(key);
    const id = Number(p?.id);
    const prevId = Number(prev?.id);
    if (!prev || (Number.isFinite(id) && (!Number.isFinite(prevId) || id > prevId))) {
      m.set(key, p);
    }
  }
  return Array.from(m.values());
};

export const getActivePeriods = (periods = []) => latestPeriodsByKey(periods).filter((p) => !isCommutedLocked(p));

export const getLeaveTypeStatsActive = (periods) =>
  getActivePeriods(periods).reduce(
    (s, p) => ({
      totalHours: s.totalHours + toNum(p.total_hours),
      usedHours: s.usedHours + toNum(p.used_hours),
      remainingHours: s.remainingHours + toNum(p.remaining_hours),
    }),
    { totalHours: 0, usedHours: 0, remainingHours: 0 },
  );

/** Remaining hours for one leave type: deduped by period, excludes commuted-locked, summed across periods. */
export const sumDedupedRemainingHours = (rows) => getLeaveTypeStatsActive(rows).remainingHours;

export const getLatestPeriodSnapshot = (periods = []) => {
  const list = latestPeriodsByKey(periods);
  if (!list.length) return null;
  const periodSortValue = (p) => {
    const y = toNum(p?.period_year);
    const semRaw = p?.period_semester != null ? String(p.period_semester).trim() : "";
    const semNum = semRaw !== "" && /^[0-9]+$/.test(semRaw) ? parseInt(semRaw, 10) : NaN;
    const m = Number.isFinite(semNum) ? semNum : 0;
    const id = toNum(p?.id);
    return { y, m, id };
  };
  return [...list].sort((a, b) => {
    const A = periodSortValue(a);
    const B = periodSortValue(b);
    if (B.y !== A.y) return B.y - A.y;
    if (B.m !== A.m) return B.m - A.m;
    return B.id - A.id;
  })[0];
};
