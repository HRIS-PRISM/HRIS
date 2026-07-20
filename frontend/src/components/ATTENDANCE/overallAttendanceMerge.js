/** Helpers for comparing and merging overall_attendance_record payloads. */

export const OVERALL_TIME_FIELD_KEYS = [
  'totalRenderedTimeMorning',
  'totalRenderedTimeMorningTardiness',
  'totalRenderedTimeAfternoon',
  'totalRenderedTimeAfternoonTardiness',
  'totalRenderedHonorarium',
  'totalRenderedHonorariumTardiness',
  'totalRenderedServiceCredit',
  'totalRenderedServiceCreditTardiness',
  'totalRenderedOvertime',
  'totalRenderedOvertimeTardiness',
  'overallRenderedOfficialTime',
  'overallRenderedOfficialTimeTardiness',
];

// Finalized absence / half-day breakdown fields persisted in overall_attendance_record
export const OVERALL_ABSENCE_FIELD_KEYS = [
  'absentDays',
  'halfDays',
  'absentTime',
  'halfDayShortfallTime',
  'lateTotalTime',
  'absentDates',
  'halfDayDates',
  'half_day_review',
  'daily_late_undertime',
  'computation_module_type',
];

export const OVERALL_COMPARE_FIELD_META = [
  { key: 'totalRenderedTimeMorning', label: 'Morning — rendered' },
  { key: 'totalRenderedTimeMorningTardiness', label: 'Morning — tardiness' },
  { key: 'totalRenderedTimeAfternoon', label: 'Afternoon — rendered' },
  { key: 'totalRenderedTimeAfternoonTardiness', label: 'Afternoon — tardiness' },
  { key: 'totalRenderedHonorarium', label: 'Honorarium — rendered' },
  { key: 'totalRenderedHonorariumTardiness', label: 'Honorarium — tardiness' },
  { key: 'totalRenderedServiceCredit', label: 'Service credit — rendered' },
  { key: 'totalRenderedServiceCreditTardiness', label: 'Service credit — tardiness' },
  { key: 'totalRenderedOvertime', label: 'Overtime — rendered' },
  { key: 'totalRenderedOvertimeTardiness', label: 'Overtime — tardiness' },
  { key: 'overallRenderedOfficialTime', label: 'Overall — rendered' },
  { key: 'overallRenderedOfficialTimeTardiness', label: 'Overall — tardiness' },
];

export const OVERALL_COMPARE_FIELD_KEYS = OVERALL_COMPARE_FIELD_META.map((f) => f.key);

export function timeToSec(hms) {
  if (hms == null || hms === '') return 0;
  const str = String(hms).trim();
  if (!str) return 0;
  const parts = str.split(':').map((p) => Number(p));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return 0;
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 3600 + m * 60 + s;
}

export function hmsRoughlyEqual(a, b, toleranceSec = 1) {
  return Math.abs(timeToSec(a) - timeToSec(b)) <= toleranceSec;
}

/** Normalize API/UI dates to YYYY-MM-DD for period matching. */
export function normalizeOverallPeriodYmd(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

/** Match overall_attendance_record for the exact period being saved (not overlapping ranges). */
export function findExactOverallRecord(rows, startDate, endDate) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const sd = normalizeOverallPeriodYmd(startDate);
  const ed = normalizeOverallPeriodYmd(endDate);
  return (
    rows.find(
      (r) =>
        normalizeOverallPeriodYmd(r.startDate) === sd &&
        normalizeOverallPeriodYmd(r.endDate) === ed,
    ) ?? null
  );
}

/** True when the row has saved summary totals (not a daily-late stub with null/zero times only). */
export function hasOverallSummaryTotals(row) {
  if (!row) return false;
  return OVERALL_TIME_FIELD_KEYS.some((key) => {
    const v = row[key];
    if (v == null || v === '') return false;
    const str = String(v).trim();
    if (!str || str === '—') return false;
    return timeToSec(str) > 0;
  });
}

/**
 * True when saved vs proposed differ on totals shown in the compare modal.
 */
export function hasOverallCompareFieldConflicts(
  saved,
  proposed,
  keys = OVERALL_COMPARE_FIELD_KEYS,
) {
  if (!saved || !proposed) return false;
  return keys.some((key) => {
    const sv = saved[key] ?? '00:00:00';
    const pv = proposed[key] ?? '00:00:00';
    return !hmsRoughlyEqual(sv, pv);
  });
}

/**
 * How save should treat an existing overall row for this employee/period.
 * @returns {'post'|'fill-stub'|'duplicate-info'|'auto-update'|'compare'}
 */
export function classifyOverallSave(existingList, startDate, endDate, proposed) {
  const existing = findExactOverallRecord(existingList, startDate, endDate);
  if (!existing) return { action: 'post', existing: null };
  if (!hasOverallSummaryTotals(existing)) return { action: 'fill-stub', existing };
  if (!overallRecordsDiffer(existing, proposed)) return { action: 'duplicate-info', existing };
  if (!hasOverallCompareFieldConflicts(existing, proposed)) {
    return { action: 'auto-update', existing };
  }
  return { action: 'compare', existing };
}

export function overallRecordsDiffer(saved, proposed, keys = OVERALL_TIME_FIELD_KEYS) {
  if (!saved || !proposed) return true;
  const timeDiff = keys.some((key) => {
    const sv = saved[key] ?? '00:00:00';
    const pv = proposed[key] ?? '00:00:00';
    return !hmsRoughlyEqual(sv, pv);
  });
  if (timeDiff) return true;

  // If the module computed finalized absence fields, treat them as part of identity too.
  // This prevents "Duplicate" false-positives when rendered/tardiness matches but
  // absent/half-day classification differs.
  return OVERALL_ABSENCE_FIELD_KEYS.some((key) => {
    if (!(key in proposed)) return false;
    const sv = saved[key];
    const pv = proposed[key];
    if (key === 'absentDays' || key === 'halfDays') return Number(sv ?? 0) !== Number(pv ?? 0);
    if (key === 'half_day_review' || key === 'daily_late_undertime') {
      return JSON.stringify(sv ?? null) !== JSON.stringify(pv ?? null);
    }
    if (key === 'lateTotalTime') {
      return !hmsRoughlyEqual(sv, pv);
    }
    return String(sv ?? '').trim() !== String(pv ?? '').trim();
  });
}

export function mergeOverallPayload({
  savedRow,
  proposed,
  tertiaryRecord = null,
  choices,
  personID,
  startDate,
  endDate,
  keys = OVERALL_TIME_FIELD_KEYS,
}) {
  const out = { personID, startDate, endDate };
  for (const key of keys) {
    const pick = choices[key] || 'proposed';
    if (pick === 'saved') {
      out[key] = savedRow[key] ?? '00:00:00';
    } else if (pick === 'tertiary') {
      out[key] = tertiaryRecord?.[key] ?? savedRow[key] ?? '00:00:00';
    } else {
      out[key] = proposed[key] ?? '00:00:00';
    }
  }
  out.overallTotalOfficialSchedule =
    savedRow?.overallTotalOfficialSchedule ??
    proposed?.overallTotalOfficialSchedule ??
    null;

  // Persist module-derived absent/half-day breakdown (summary should not recompute).
  OVERALL_ABSENCE_FIELD_KEYS.forEach((k) => {
    if (proposed && Object.prototype.hasOwnProperty.call(proposed, k)) out[k] = proposed[k];
    else if (savedRow && Object.prototype.hasOwnProperty.call(savedRow, k)) out[k] = savedRow[k];
  });
  return out;
}

/** Default per-field choice for compare modal (supports optional tertiary / recalculated). */
/** Full PUT body: every time column from `raw`, with optional overrides (HH:MM:SS strings). */
export function buildOverallPutPayloadFromRow(raw, overrides = {}) {
  if (!raw) return null;
  const out = {
    personID: raw.personID,
    startDate: raw.startDate,
    endDate: raw.endDate,
  };
  for (const key of OVERALL_TIME_FIELD_KEYS) {
    out[key] =
      overrides[key] !== undefined && overrides[key] !== null
        ? overrides[key]
        : (raw[key] ?? '00:00:00');
  }
  out.overallTotalOfficialSchedule =
    overrides.overallTotalOfficialSchedule !== undefined
      ? overrides.overallTotalOfficialSchedule
      : (raw.overallTotalOfficialSchedule ?? null);
  return out;
}

const EARNINGS_SUMMARY_KEYS = [
  'overallRenderedOfficialTime',
  'overallRenderedOfficialTimeTardiness',
];

/** Merge only overall rendered/tardiness choices for earnings summary PUT (full row preserved). */
export function mergeEarningsSummaryChoices(savedRow, formProposal, tertiaryRecord, choices) {
  const base = buildOverallPutPayloadFromRow(savedRow, {});
  EARNINGS_SUMMARY_KEYS.forEach((key) => {
    const pick = choices[key] || 'proposed';
    if (pick === 'saved') base[key] = savedRow[key] ?? '00:00:00';
    else if (pick === 'tertiary') {
      base[key] = tertiaryRecord?.[key] ?? savedRow[key] ?? '00:00:00';
    } else {
      base[key] = formProposal[key] ?? savedRow[key] ?? '00:00:00';
    }
  });
  return base;
}

export function defaultMergeChoice(savedVal, proposedVal, tertiaryVal) {
  const hasTertiary = tertiaryVal != null && tertiaryVal !== undefined;
  if (
    hasTertiary &&
    !hmsRoughlyEqual(savedVal, tertiaryVal) &&
    hmsRoughlyEqual(savedVal, proposedVal)
  ) {
    return 'tertiary';
  }
  if (!hmsRoughlyEqual(savedVal, proposedVal)) return 'proposed';
  if (hasTertiary && !hmsRoughlyEqual(savedVal, tertiaryVal)) return 'tertiary';
  return 'saved';
}
