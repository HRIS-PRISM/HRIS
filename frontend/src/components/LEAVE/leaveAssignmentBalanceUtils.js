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
  const semRaw = p?.period_semester != null ? String(p.period_semester).trim() : '';
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
    const sd = semOrder(b.period_semester) - semOrder(a.period_semester);
    if (sd !== 0) return sd;
    return toNum(b.id) - toNum(a.id);
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
  const base  = toNum(assignment.remaining_hours);
  const delta = (usageRows || [])
    .filter((u) => !u.voided_at && Number(u.leave_assignment_id) === Number(assignment.id))
    .reduce((s, u) => s + toNum(u.hours_delta), 0);
  return Math.max(0, base + delta);
};

export const sumDedupedRemainingHours = (assignments, usageRows = []) =>
  getActivePeriods(assignments).reduce(
    (s, a) => s + computeEffectiveRemaining(a, usageRows),
    0,
  );

export const getLeaveTypeStatsActive = (assignments, usageRows = []) => {
  const empty = { remainingHours: 0, totalHours: 0, usedHours: 0, allocatedHours: 0 };
  if (!assignments?.length) return empty;

  const sorted = sortPeriodsDesc(latestPeriodsByKey(assignments));
  if (!sorted.length) return empty;

  const active = sorted.find((a) => !isCommutedLocked(a)) ?? sorted[0];

  const remainingHours = isCommutedLocked(active)
    ? 0
    : computeEffectiveRemaining(active, usageRows);

  const totalHours     = toNum(active.total_hours);
  const usedHours      = toNum(active.used_hours);
  const carriedHours   = toNum(active.carried_forward_hours);
  const allocatedHours =
    toNum(active.allocated_hours) || Math.max(0, totalHours - carriedHours);

  return { remainingHours, totalHours, usedHours, allocatedHours };
};