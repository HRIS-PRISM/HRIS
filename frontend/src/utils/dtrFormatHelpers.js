export const DTR_WIDTH_IN = '8.7in';

export const DTR_NON_WORKING_DAY_LABEL = 'NON-WORKING DAY';

export const DTR_ABSENT_LABEL = 'ABSENT';

export const DTR_CELL_WATERMARK_LABELS = [
  'HOLIDAY',
  'ON LEAVE',
  'SUSPENSION',
  DTR_ABSENT_LABEL,
  'HALF DAY',
  'NOT HALF DAY',
  DTR_NON_WORKING_DAY_LABEL,
];

export const isDtrCellWatermarkText = (text) => {
  const t = String(text || '').trim().toUpperCase();
  if (!t) return false;
  if (DTR_CELL_WATERMARK_LABELS.includes(t)) return true;
  // Leave types e.g. VACATION LEAVE, SICK LEAVE
  return /\bLEAVE\b/.test(t);
};

/** Leave / holiday / suspension → one merged banner row (like NON-WORKING DAY). */
export const isDtrCalendarBannerRow = (indicator) =>
  Boolean(
    indicator?.label &&
      (indicator.type === 'leave' ||
        indicator.type === 'holiday' ||
        indicator.type === 'suspension'),
  );

export const dtrTimeValueEmpty = (v) =>
  v == null || (typeof v === 'string' && v.trim() === '');

/**
 * Unscheduled day (e.g. weekend) with no punches → NON-WORKING DAY merged row.
 * Only when the period has attendance/schedule context (`hasPeriodRecords`).
 * With no data at all, keep the blank 6-column DTR grid.
 */
export const isDtrNonWorkingDayRow = ({
  isNotScheduledDay,
  indicator,
  timeFields,
  hasPeriodRecords = true,
}) => {
  if (!hasPeriodRecords) return false;
  if (!isNotScheduledDay || indicator?.label) return false;
  const { timeIN, breaktimeIN, breaktimeOUT, timeOUT } = timeFields || {};
  return (
    dtrTimeValueEmpty(timeIN) &&
    dtrTimeValueEmpty(breaktimeIN) &&
    dtrTimeValueEmpty(breaktimeOUT) &&
    dtrTimeValueEmpty(timeOUT)
  );
};

export const resolveDtrAmPmCellText = (rawVal, displayText, indicator) => {
  // Leave / holiday / suspension always win — do not show official-time autofill punches
  if (
    indicator?.label &&
    (indicator.type === 'leave' ||
      indicator.type === 'holiday' ||
      indicator.type === 'suspension')
  ) {
    return { text: indicator.label, isWatermark: true };
  }
  if (!dtrTimeValueEmpty(rawVal)) {
    return { text: displayText, isWatermark: false };
  }
  if (indicator?.label) {
    return { text: indicator.label, isWatermark: true };
  }
  return { text: '', isWatermark: false };
};

export const DTR_WM_INLINE_STYLE = {
  fontSize: '8.5px',
  fontWeight: 700,
  fontFamily: 'Arial, "Times New Roman", serif',
  color: '#555555',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  lineHeight: 1,
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

/** @deprecated Overlay watermarks — kept for legacy DTR pages still using .dtr-cell-watermark */
export const enhanceDtrWatermarksInClone = (clonedDoc) => {
  if (!clonedDoc?.querySelectorAll) return;
  clonedDoc.querySelectorAll('.dtr-cell-watermark').forEach((wm) => {
    wm.style.setProperty('position', 'absolute');
    wm.style.setProperty('left', '0');
    wm.style.setProperty('top', '0');
    wm.style.setProperty('right', '0');
    wm.style.setProperty('bottom', '0');
    wm.style.setProperty('display', 'flex');
    wm.style.setProperty('align-items', 'center');
    wm.style.setProperty('justify-content', 'center');
    wm.style.setProperty('z-index', '2');
    wm.style.setProperty('pointer-events', 'none');
    wm.style.setProperty('visibility', 'visible');
    wm.style.setProperty('opacity', '1');
    wm.style.setProperty('overflow', 'visible');
    wm.style.setProperty('-webkit-print-color-adjust', 'exact');
    wm.style.setProperty('print-color-adjust', 'exact');
  });
  clonedDoc.querySelectorAll('.dtr-cell-watermark span').forEach((el) => {
    el.style.setProperty('color', '#555555');
    el.style.setProperty('-webkit-text-fill-color', '#555555');
    el.style.setProperty('opacity', '1');
    el.style.setProperty('visibility', 'visible');
    el.style.setProperty('font-size', '8.5px');
    el.style.setProperty('font-weight', '700');
    el.style.setProperty('font-family', 'Arial, "Times New Roman", serif');
    el.style.setProperty('letter-spacing', '0.05em');
    el.style.setProperty('white-space', 'nowrap');
    el.style.setProperty('line-height', '1');
    el.style.setProperty('-webkit-print-color-adjust', 'exact');
    el.style.setProperty('print-color-adjust', 'exact');
  });
  clonedDoc.querySelectorAll('td').forEach((td) => {
    if (td.querySelector('.dtr-cell-watermark')) {
      td.style.setProperty('overflow', 'visible');
      td.style.setProperty('position', 'relative');
    }
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

/** Label for DTR leave watermark (e.g. Vacation Leave, Sick Leave). */
export const formatDtrLeaveLabel = (leaveReq) => {
  const desc = String(
    leaveReq?.leave_description || leaveReq?.title || leaveReq?.label || '',
  ).trim();
  const code = String(leaveReq?.leave_code || '').trim();
  if (desc) return desc.toUpperCase();
  if (code) return code.toUpperCase();
  return 'ON LEAVE';
};

/** Find HR-approved leave covering YYYY-MM-DD from leave_request rows. */
export const findApprovedLeaveForDate = (dateString, approvedLeaves) => {
  const check = toPhCalendarYmd(dateString);
  if (!check || !Array.isArray(approvedLeaves) || !approvedLeaves.length)
    return null;
  return (
    approvedLeaves.find((req) => {
      const dates = Array.isArray(req.leave_date)
        ? req.leave_date
        : String(req.leave_date || '')
            .split(',')
            .map((d) => d.trim());
      return dates.some((d) => toPhCalendarYmd(d) === check);
    }) || null
  );
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

/** Safe filename — strips characters invalid on Windows/macOS */
export const sanitizePdfFileName = (name) =>
  String(name || 'DTR')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * PDF name: SURNAME, F. M. - FEBRUARY.pdf
 * e.g. DELA CRUZ, J. R. - FEBRUARY.pdf
 */
export const formatDtrPdfFileName = (user = {}, startDate) => {
  const last = (
    user.lastName ||
    user.surname ||
    user.familyName ||
    ''
  )
    .trim()
    .toUpperCase();
  const first = (user.firstName || user.givenName || '').trim();
  const middleRaw = (user.middleName || user.middleInitial || '').trim();

  let namePart = '';
  if (last) {
    const firstInit = first ? `${first.charAt(0).toUpperCase()}.` : '';
    const middleInit = middleRaw ? `${middleRaw.charAt(0).toUpperCase()}.` : '';
    namePart = last;
    if (firstInit) namePart += `, ${firstInit}`;
    if (middleInit) namePart += ` ${middleInit}`;
  } else {
    namePart = String(
      user.fullName || user.displayName || user.name || 'DTR',
    ).trim();
    if (/^[0-9a-f-]{36}$/i.test(namePart)) namePart = 'DTR';
  }

  const month = formatMonth(startDate) || 'DTR';
  const base = sanitizePdfFileName(`${namePart} - ${month}`);
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
};

/** Combined multi-employee DTR PDF */
export const formatDtrBulkPdfFileName = (startDate) => {
  const month = formatMonth(startDate) || 'DTR';
  return sanitizePdfFileName(`DTR BATCH - ${month}.pdf`);
};

/** Open PDF for print/save-as-PDF with a proper filename instead of a blob UUID */
export const openPdfBlobForPrint = (pdf, fileName) => {
  const safeName = fileName.toLowerCase().endsWith('.pdf')
    ? fileName
    : `${fileName}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], safeName, { type: 'application/pdf' });
  const url = URL.createObjectURL(file);
  const win = window.open(url, '_blank');
  if (win) {
    const title = safeName.replace(/\.pdf$/i, '');
    const timer = setInterval(() => {
      try {
        if (win.document) {
          win.document.title = title;
          clearInterval(timer);
        }
      } catch {
        /* cross-origin while PDF loads */
      }
    }, 100);
    setTimeout(() => clearInterval(timer), 5000);
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
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
