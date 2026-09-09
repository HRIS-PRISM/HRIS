import {
  parseOfficialTimeToSeconds,
  formatOfficialAttendanceSeconds,
} from './officialAttendanceFromDailyRows';

/** Sum HH:MM:SS duration strings (ignores null/invalid). */
export function sumHmsDurationStrings(values) {
  let total = 0;
  (values || []).forEach((v) => {
    const sec = parseOfficialTimeToSeconds(v);
    if (sec != null) total += sec;
  });
  return formatOfficialAttendanceSeconds(total);
}

/**
 * Late Total: punch / reject late only (excludes absent + half-day shortfall).
 * Those feed Overall Tardiness (= Absent + Half + Late).
 */
export function computeLateTotalTimeFromTardiness(_overallTardiness, buckets) {
  const fromBuckets = buckets?.lateShortfallTime;
  if (fromBuckets != null && String(fromBuckets).trim() !== '') {
    return fromBuckets;
  }
  const display = buckets?.lateTotalDisplayTime;
  if (display != null && String(display).trim() !== '') {
    return display;
  }
  return '00:00:00';
}

/**
 * Overall tardiness = Absent + Half day shortfall + Late Total (whole summary).
 * Row Total Tardiness column sums to this same value.
 */
export function computeOverallTardinessFromBuckets(buckets) {
  if (buckets?.overallShortfallSecTotal != null) {
    return formatOfficialAttendanceSeconds(buckets.overallShortfallSecTotal);
  }
  return sumHmsDurationStrings([
    buckets?.absentTime,
    buckets?.halfDayShortfallTime,
    buckets?.lateShortfallTime,
  ]);
}

/** Apply bucket-based late + overall totals (optional row sum for table footers). */
export function applyBucketAttendanceTotals(base, buckets, { rowTardinessSum } = {}) {
  const lateTotalTime = computeLateTotalTimeFromTardiness(null, buckets);
  const overallTardiness = computeOverallTardinessFromBuckets(buckets);
  return {
    ...base,
    absentDays: buckets?.absentDays ?? base?.absentDays,
    halfDays: buckets?.halfDays ?? base?.halfDays,
    absentTime: buckets?.absentTime ?? base?.absentTime,
    halfDayShortfallTime: buckets?.halfDayShortfallTime ?? base?.halfDayShortfallTime,
    lateTotalTime,
    overallTardiness,
    overallShortfallTime: buckets?.overallShortfallTime ?? overallTardiness,
    ...(rowTardinessSum != null ? { rowTardinessSum } : {}),
  };
}
