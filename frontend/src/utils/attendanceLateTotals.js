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
 * Late total for overall record: overall tardiness minus absent and approved half-day shortfall.
 */
export function computeLateTotalTimeFromTardiness(overallTardiness, buckets) {
  const overallSec = parseOfficialTimeToSeconds(overallTardiness);
  if (overallSec != null) {
    return formatOfficialAttendanceSeconds(
      Math.max(
        0,
        overallSec -
          (buckets?.absentSecTotal ?? 0) -
          (buckets?.halfDayShortfallSecTotal ?? 0),
      ),
    );
  }
  return buckets?.lateShortfallTime || '00:00:00';
}
