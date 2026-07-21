function empty(v) {
  return v == null || String(v).trim() === "";
}

function hasOfficialSchedule(row) {
  const offIn = row?.officialTimeIN;
  const offOut = row?.officialTimeOUT;
  return (
    !empty(offIn) &&
    !empty(offOut) &&
    String(offIn).trim() !== "00:00:00 AM" &&
    String(offOut).trim() !== "00:00:00 PM"
  );
}

function hasNoPunches(row) {
  const ti = row?.timeIN;
  const bi = row?.breaktimeIN;
  const bo = row?.breaktimeOUT;
  const to = row?.timeOUT;
  return empty(ti) && empty(bi) && empty(bo) && empty(to);
}

/**
 * @param {object[]} rows - attendance rows from API
 * @param {Record<string, unknown>} [leaveByDate] - keys YYYY-MM-DD for HR-approved leave (same as /api/leaves)
 */
export function computeAbsentDays(rows, leaveByDate = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const leave =
    leaveByDate && typeof leaveByDate === "object" ? leaveByDate : {};
  let count = 0;
  for (const r of list) {
    if (!hasOfficialSchedule(r)) continue;
    if (leave[r.date]) continue;
    if (hasNoPunches(r)) count += 1;
  }
  return count;
}

