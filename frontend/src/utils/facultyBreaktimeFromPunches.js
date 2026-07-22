/**
 * Faculty attendance: autofill break punches from official/device schedule
 * only when the matching time IN / time OUT punch exists.
 */

export function isEmptyAttendanceClock(t) {
  return !t || t === '00:00:00 AM' || t === '00:00:00 PM' || t === '00:00:00';
}

export function isEmptyAttendancePunch(t) {
  return isEmptyAttendanceClock(t);
}

function resolveScheduleBreak(official, device) {
  // Prefer the real device/Modification punch so hub edits are not hidden
  // behind official lunch times (which also skews Designated half-day math).
  if (!isEmptyAttendanceClock(device)) return device;
  if (!isEmptyAttendanceClock(official)) return official;
  return null;
}

/**
 * @returns {{
 *   noTimeIn: boolean,
 *   noTimeOut: boolean,
 *   scheduleBreakIn: string|null,
 *   scheduleBreakOut: string|null,
 *   effectiveBreaktimeIN: string|null,
 *   effectiveBreaktimeOUT: string|null,
 *   displayBreaktimeIN: string,
 *   displayBreaktimeOUT: string,
 * }}
 */
export function applyFacultyPunchGatedBreaktimes({
  timeIN,
  timeOUT,
  breaktimeIN,
  breaktimeOUT,
  officialBreaktimeIN,
  officialBreaktimeOUT,
}) {
  const noTimeIn = isEmptyAttendancePunch(timeIN);
  const noTimeOut = isEmptyAttendancePunch(timeOUT);

  const scheduleBreakIn = resolveScheduleBreak(
    officialBreaktimeIN,
    breaktimeIN,
  );
  const scheduleBreakOut = resolveScheduleBreak(
    officialBreaktimeOUT,
    breaktimeOUT,
  );

  const effectiveBreaktimeIN = noTimeIn ? null : scheduleBreakIn;
  const effectiveBreaktimeOUT = noTimeOut ? null : scheduleBreakOut;

  const displayBreaktimeIN = effectiveBreaktimeIN ?? '—';
  const displayBreaktimeOUT = effectiveBreaktimeOUT ?? '—';

  return {
    noTimeIn,
    noTimeOut,
    scheduleBreakIn,
    scheduleBreakOut,
    effectiveBreaktimeIN,
    effectiveBreaktimeOUT,
    displayBreaktimeIN,
    displayBreaktimeOUT,
  };
}
