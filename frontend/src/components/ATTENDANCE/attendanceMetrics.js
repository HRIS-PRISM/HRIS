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

export function computeAbsentDays(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let count = 0;
  for (const r of list) {
    if (!hasOfficialSchedule(r)) continue;
    if (hasNoPunches(r)) count += 1;
  }
  return count;
}

