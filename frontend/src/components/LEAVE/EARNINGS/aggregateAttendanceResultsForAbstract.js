const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatNameSnNMi(row) {
  const sn = (row?.emp_last_name || "").trim();
  const n = (row?.emp_first_name || "").trim();
  const mid = (row?.emp_middle_name || "").trim();
  const mi = mid ? `${mid.charAt(0).toUpperCase()}.` : "";
  const right = [n, mi].filter(Boolean).join(" ");
  if (!sn && !right) return "—";
  return sn ? `${sn}, ${right}`.replace(/,\s*$/, "") : right;
}

function maxProcessedAt(rows) {
  let best = null;
  let bestT = -Infinity;
  for (const r of rows) {
    const pa = r.processed_at;
    if (pa == null || pa === "") continue;
    const t = new Date(pa).getTime();
    if (!Number.isNaN(t) && t >= bestT) {
      bestT = t;
      best = pa;
    }
  }
  return best;
}

/**
 * One merged-row-shaped summary per employee for the filter month (matches AR branch of buildMergedRows).
 * Keys: ar-summary-{emp}|{year}|{month}
 */
export function aggregateAttendanceResultsForAbstract(attendanceResults, year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return [];

  const groups = new Map();
  for (const r of attendanceResults || []) {
    const emp = String(r.employee_number ?? "").trim();
    if (!emp) continue;
    if (!groups.has(emp)) groups.set(emp, []);
    groups.get(emp).push(r);
  }

  const merged = [];
  for (const [emp, rows] of groups) {
    let sumUnpaid = 0;
    let sumPaid = 0;
    let sumLeave = 0;
    let sumOrig = 0;
    const leaveSet = new Set();
    const typeSet = new Set();
    const statusSet = new Set();
    const remarkChunks = [];

    for (const r of rows) {
      sumUnpaid += toNum(r.unpaid_hours);
      sumPaid += toNum(r.paid_hours);
      sumLeave += toNum(r.leave_hours_used);
      sumOrig += toNum(r.original_hours);
      const lu = r.leave_used != null ? String(r.leave_used).trim() : "";
      if (lu) leaveSet.add(lu);
      const st = r.source_type != null ? String(r.source_type).trim() : "";
      if (st) typeSet.add(st);
      const stat = r.status != null ? String(r.status).trim() : "";
      if (stat) statusSet.add(stat);
      if (r.remarks != null && String(r.remarks).trim()) remarkChunks.push(String(r.remarks).trim());
    }

    const isDeduction = sumUnpaid > 0;
    const first = rows[0];
    const key = `ar-summary-${emp}|${y}|${m}`;
    const periodLabel = `${MONTHS[m - 1]} ${y}`;
    const halfDayDate = `${y}-${String(m).padStart(2, "0")}-01`;

    const leaveCode =
      leaveSet.size === 0 ? "—" : leaveSet.size === 1 ? [...leaveSet][0] : [...leaveSet].sort().join(", ");

    let resultStatus = "—";
    if (statusSet.size === 1) resultStatus = [...statusSet][0];
    else if (statusSet.size > 1) resultStatus = "Multiple";

    const abstractSourceTypes = typeSet.size ? [...typeSet].sort().join(", ") : "—";
    const remarksJoined = remarkChunks.length ? [...new Set(remarkChunks)].join(" · ") : "";
    const abstractRemarksShort =
      remarkChunks.length === 0
        ? "—"
        : remarkChunks.length === 1
          ? remarkChunks[0].length > 80
            ? `${remarkChunks[0].slice(0, 77)}…`
            : remarkChunks[0]
          : `${rows.length} event(s)`;

    const abstractSourceRows = [...rows].sort((a, b) => {
      const d1 = a.result_date ? String(a.result_date).slice(0, 10) : "";
      const d2 = b.result_date ? String(b.result_date).slice(0, 10) : "";
      const cmp = d2.localeCompare(d1);
      if (cmp !== 0) return cmp;
      return toNum(b.id) - toNum(a.id);
    });

    merged.push({
      key,
      employeeNumber: emp,
      name: formatNameSnNMi(first),
      leaveCode,
      chargeTo: isDeduction ? "SALARY_DEDUCTION" : (leaveCode !== "—" ? leaveCode : "No salary deduction"),
      halfDayDate,
      period: periodLabel,
      periodYear: y,
      periodMonth: m,
      toSalaryDays: isDeduction ? Number((sumUnpaid / 8).toFixed(6)) : 0,
      hours: isDeduction ? sumUnpaid : sumLeave,
      unpaidHours: sumUnpaid,
      originalHours: sumOrig,
      leaveHoursUsed: sumLeave,
      paidHoursTotal: sumPaid,
      resultStatus,
      createdAt: maxProcessedAt(rows),
      isDeduction,
      source: "AR",
      abstractEventCount: rows.length,
      abstractSourceTypes,
      abstractRemarksShort,
      abstractRemarksTooltip: remarksJoined || abstractRemarksShort,
      abstractSourceRows,
    });
  }

  merged.sort((a, b) => {
    if (a.isDeduction !== b.isDeduction) return a.isDeduction ? -1 : 1;
    const c = String(b.employeeNumber).localeCompare(String(a.employeeNumber));
    if (c !== 0) return c;
    return 0;
  });

  return merged;
}
