export const DTR_WIDTH_IN = '8.7in';

/** html2canvas often under-renders faint text; bump contrast on the cloned DOM used for capture */
export const enhanceDtrWatermarksInClone = (clonedDoc) => {
  if (!clonedDoc?.querySelectorAll) return;
  clonedDoc.querySelectorAll('.dtr-cell-watermark span').forEach((el) => {
    el.style.setProperty('color', 'rgba(0,0,0,0.55)');
    el.style.setProperty('opacity', '1');
  });
};

/** YYYY-MM-DD as a Philippines calendar day */
export const toPhCalendarYmd = (value) => {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const da = parts.find((p) => p.type === 'day')?.value;
    if (y && mo && da) return `${y}-${mo}-${da}`;
  } catch {
    /* ignore */
  }
  return s.split('T')[0];
};

export const normRecordYmd = (dateVal) => toPhCalendarYmd(dateVal);

export const recordMatchesDay = (record, dayPadded) => {
  const ymd = normRecordYmd(record?.date);
  if (!ymd || dayPadded.length !== 2) return false;
  return ymd.endsWith(`-${dayPadded}`);
};

export const formatFullName = (user = {}) => {
  const last = (
    user.lastName ||
    user.surname ||
    user.familyName ||
    ''
  ).trim();
  const first = (user.firstName || user.givenName || '').trim();
  const middleRaw = (user.middleName || user.middleInitial || '').trim();
  const capitalize = (s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  const middle = middleRaw ? `${middleRaw.charAt(0).toUpperCase()}.` : '';
  const lastPart = last ? last.toUpperCase() : '';
  const firstPart = first ? capitalize(first) : '';
  return (
    `${lastPart}${lastPart && firstPart ? ', ' : ''}${firstPart}${middle ? ' ' + middle : ''}`.trim() ||
    user.fullName ||
    user.displayName ||
    'Unknown'
  );
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  const normalized = String(timeString).replace(/\s+/g, ' ').trim();
  return normalized.replace(/^(\d{1,2}:\d{2}):\d{2}(\s?[AP]M)?$/i, '$1$2');
};

export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTHS_UPPER = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

export const formatMonth = (dateString) => {
  if (!dateString) return '';
  const m = parseInt(dateString.split('T')[0].split('-')[1]) - 1;
  return MONTHS_UPPER[m] || '';
};

export const formatStartDate = (dateString) => {
  if (!dateString) return '';
  const [, m, d] = dateString.split('T')[0].split('-');
  return `${MONTHS_LONG[parseInt(m) - 1]} ${parseInt(d)}`;
};

export const formatEndDate = (dateString) => {
  if (!dateString) return '';
  const [y, , d] = dateString.split('T')[0].split('-');
  return `${parseInt(d)}, ${y}`;
};

export const filterByDtrType = (data, type) => {
  if (type === 'regular') return data.filter((r) => r.timeIN || r.timeOUT);
  if (type === 'service-credit')
    return data.filter(
      (r) =>
        r.specialType === 'SERVICE' && (r.specialTimeIN || r.specialTimeOUT),
    );
  if (type === 'honorarium')
    return data.filter(
      (r) =>
        r.specialType === 'HONORARIUM' &&
        (r.specialTimeIN || r.specialTimeOUT),
    );
  if (type === 'overtime')
    return data.filter(
      (r) =>
        r.specialType === 'OVERTIME' && (r.specialTimeIN || r.specialTimeOUT),
    );
  return data;
};
