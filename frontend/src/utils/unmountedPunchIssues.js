/**
 * Punches that never land on the printed DTR.
 * Mount rules match restoreSingleRowFromDevice:
 * first Time IN (1), first Break OUT (2), first Break IN (3), last Time OUT (4).
 * Hints are display-only — never auto-saved.
 */

const SLOT_LABEL = {
  1: 'Time IN',
  2: 'Break Time OUT',
  3: 'Break Time IN',
  4: 'Time OUT',
  5: 'Special Time IN',
  6: 'Special Time OUT',
};

const STATUS_LABEL = {
  1: 'Time IN',
  2: 'Breaktime OUT',
  3: 'Breaktime IN',
  4: 'Time OUT',
  5: 'Special Time IN',
  6: 'Special Time OUT',
};

const FIRST_WINS = new Set([1, 2, 3]);

export function punchStatusLabel(state) {
  const n = Number(state) || 0;
  return STATUS_LABEL[n] || 'Uncategorized';
}

export function punchIsoDate(record) {
  if (record?._isoDate) return record._isoDate;
  const ts = Number(record?.AttendanceDateTime);
  if (Number.isFinite(ts) && ts > 0) {
    return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  }
  const raw = String(record?.Date || '').trim();
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const mdy = raw.split('/');
  if (mdy.length === 3 && mdy[2]) {
    const [month, day, year] = mdy;
    if (year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return '';
}

export function punchSortTs(record) {
  if (Number.isFinite(record?._sortTs) && record._sortTs > 0) return record._sortTs;
  const ts = Number(record?.AttendanceDateTime);
  if (Number.isFinite(ts) && ts > 0) return ts;
  return 0;
}

export function punchTimeLabel(record) {
  const direct = String(record?.Time || '').trim();
  if (direct) return direct;
  const ts = Number(record?.AttendanceDateTime);
  if (!Number.isFinite(ts) || ts <= 0) return '';
  return new Date(ts).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function punchRowKey(record) {
  if (record?._rowKey) return record._rowKey;
  return `${record?.AttendanceDateTime ?? ''}|${record?.PersonID ?? ''}|${record?.Date ?? ''}|${record?.Time ?? ''}`;
}

function dateLabelFor(record, iso) {
  if (record?._dateLabel) return record._dateLabel;
  if (!iso) return String(record?.Date || '');
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function clockTimeKey(record) {
  const label = punchTimeLabel(record)
    .replace(/[\s\u00a0\u202f]+/g, '')
    .replace(/\./g, '')
    .trim()
    .toLowerCase();
  if (label) return label;

  const ts = punchSortTs(record);
  if (!ts) return '';
  return new Date(ts)
    .toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    .replace(/[\s\u00a0\u202f]+/g, '')
    .replace(/\./g, '')
    .trim()
    .toLowerCase();
}

/** Same displayed clock time is one tap, even if the device stored it more than once. */
function sameClockTime(a, b) {
  const left = clockTimeKey(a);
  const right = clockTimeKey(b);
  if (left && right) return left === right;
  return punchSortTs(a) > 0 && punchSortTs(a) === punchSortTs(b);
}

function makeIssue(record, iso, reason, kind) {
  const state = Number(record?.AttendanceState) || 0;
  return {
    rowKey: punchRowKey(record),
    personID: String(record?.PersonID ?? '').trim(),
    date: iso,
    dateLabel: dateLabelFor(record, iso),
    time: punchTimeLabel(record),
    state,
    statusLabel: punchStatusLabel(state),
    reason,
    kind,
    sortTs: punchSortTs(record),
  };
}

/**
 * @param {Array<object>} records raw or enriched device punches
 * @returns {Array<object>} punches that will not appear on the printed DTR
 */
export function detectUnmountedPunches(records) {
  const byDay = new Map();
  (Array.isArray(records) ? records : []).forEach((record) => {
    const iso = punchIsoDate(record);
    const personID = String(record?.PersonID ?? '').trim();
    const key = `${personID}|${iso || 'unknown'}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(record);
  });

  const issues = [];
  byDay.forEach((dayRecords, key) => {
    const iso = key.split('|').slice(1).join('|');
    const sorted = [...dayRecords].sort((a, b) => punchSortTs(a) - punchSortTs(b));
    const byState = new Map();
    sorted.forEach((record) => {
      const state = Number(record?.AttendanceState) || 0;
      if (!byState.has(state)) byState.set(state, []);
      byState.get(state).push(record);
    });

    const breakIns = byState.get(3) || [];
    const breakOuts = byState.get(2) || [];
    const lunchMisclick =
      breakOuts.length === 0 &&
      breakIns.some((record) => !sameClockTime(record, breakIns[0]));

    const warnedTimes = new Set();
    const warnOnce = (record, reason, kind) => {
      const timeKey = clockTimeKey(record) || `ts:${punchSortTs(record)}`;
      const warnKey = `${Number(record?.AttendanceState) || 0}|${timeKey}`;
      if (warnedTimes.has(warnKey)) return;
      warnedTimes.add(warnKey);
      issues.push(makeIssue(record, iso === 'unknown' ? '' : iso, reason, kind));
    };

    sorted.forEach((record) => {
      const state = Number(record?.AttendanceState) || 0;
      if (state < 1 || state > 6) {
        warnOnce(record, 'Uncategorized — not on DTR', 'uncategorized');
        return;
      }
      const group = byState.get(state) || [];
      const distinctTimes = new Set(group.map((item) => clockTimeKey(item)).filter(Boolean));
      if (distinctTimes.size < 2) return;
      const mounted = FIRST_WINS.has(state) ? group[0] : state === 4 ? group[group.length - 1] : null;
      if (!mounted || record === mounted || sameClockTime(record, mounted)) return;
      const label = SLOT_LABEL[state] || punchStatusLabel(state);
      const reason =
        state === 3 && lunchMisclick
          ? 'Will not print — extra Break Time IN. Likely Break Time OUT.'
          : `Extra ${label} — not on DTR`;
      warnOnce(record, reason, 'duplicate');
    });
  });

  return issues.sort((a, b) => a.sortTs - b.sortTs || String(a.personID).localeCompare(String(b.personID)));
}

export function indexUnmountedIssues(issues) {
  const map = new Map();
  (issues || []).forEach((issue) => {
    if (issue?.rowKey) map.set(issue.rowKey, issue);
  });
  return map;
}

export function filterUnmountedIssuesByPeriod(issues, startDate, endDate) {
  const from = String(startDate || '').slice(0, 10);
  const to = String(endDate || '').slice(0, 10);
  if (!from || !to) return issues || [];
  return (issues || []).filter((issue) => {
    if (!issue?.date) return true;
    return issue.date >= from && issue.date <= to;
  });
}
