import React from 'react';
import earistLogo from '../../assets/earistLogo.png';
import {
  resolveDtrLateUndertimeDisplay,
  isDtrDateScheduledByOfficialTime,
  isDtrHalfDayLateUndertimePending,
} from '../../utils/dtrLateUndertimeFromOverall';
import {
  MODULE_TYPES,
  getRowHalfDayUiStatus,
  getDtrHalfDayIndicator,
  getDtrAbsentIndicator,
  isDtrAbsentRow,
  resolveDtrRowIndicator,
  resolveDtrRowTint,
} from '../../utils/halfDayReview';
import {
  DTR_PRINTABLE_WIDTH_MM,
  DTR_PRINTABLE_HEIGHT_MM,
  DTR_SHEET_WIDTH_MM,
  DTR_CUT_GAP_MM,
  DTR_NON_WORKING_DAY_LABEL,
  DTR_ABSENT_LABEL,
  isDtrNonWorkingDayRow,
  getDtrUnscheduledWeekdayBanner,
  formatDtrLeaveLabel,
  findApprovedLeaveForDate,
  isDtrCalendarBannerRow,
  toPhCalendarYmd,
  recordMatchesDay,
  formatTime as defaultFormatTime,
  formatMonth,
  formatStartDate,
  formatEndDate,
  formatSuspensionEffectiveTime,
  getDtrWeekdayName,
} from '../../utils/dtrFormatHelpers';
import { calendarAppliesToBranch } from '../../constants/branches';

const emptyOfficialTime = (v) => {
  if (v == null) return true;
  const s = String(v).trim();
  return (
    !s ||
    s === '00:00:00 AM' ||
    s === '00:00:00 PM' ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'undefined'
  );
};

/** Whether honorarium / service-credit / overtime official times cover a day row. */
const isSpecialOfficialScheduled = (dayRow, type) => {
  if (!dayRow) return false;
  if (type === 'honorarium') {
    return (
      !emptyOfficialTime(dayRow.officialHonorariumTimeIN) &&
      !emptyOfficialTime(dayRow.officialHonorariumTimeOUT)
    );
  }
  if (type === 'service-credit') {
    return (
      !emptyOfficialTime(dayRow.officialServiceCreditTimeIN) &&
      !emptyOfficialTime(dayRow.officialServiceCreditTimeOUT)
    );
  }
  if (type === 'overtime') {
    return (
      !emptyOfficialTime(dayRow.officialOverTimeIN) &&
      !emptyOfficialTime(dayRow.officialOverTimeOUT)
    );
  }
  return false;
};

const REGULAR_WEEKDAY_KEYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

const REGULAR_DAY_ABBREV = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'Th',
  Friday: 'F',
};

export const DTR_LABELS = {
  regularDaysCaption: 'Regular Days:',
  saturdaysCaption: 'Saturdays:',
  lateHeader: 'Late',
  undertimeHeader: 'U-time',
  lateSubHeader: 'Hrs | Mins',
  undertimeSubHeader: 'Hrs | Mins',
};

const formatOfficialClock = (timeString, formatTimeFn) => {
  const s = formatTimeFn(timeString || '');
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (m) {
    const h = String(parseInt(m[1], 10)).padStart(2, '0');
    return `${h}:${m[2]} ${m[3].toUpperCase()}`;
  }
  return s;
};

const buildOfficialTwoSegment = (sched, formatTimeFn) => {
  if (!sched) return '';
  const tIn = formatOfficialClock(sched.officialTimeIN, formatTimeFn);
  const brOut = formatOfficialClock(sched.officialBreaktimeOUT, formatTimeFn);
  const brIn = formatOfficialClock(sched.officialBreaktimeIN, formatTimeFn);
  const tOut = formatOfficialClock(sched.officialTimeOUT, formatTimeFn);
  if (tIn && brOut && brIn && tOut)
    return `${tIn} to ${brOut} : ${brIn} to ${tOut}`;
  if (tIn && tOut) return `${tIn} to ${tOut}`;
  return '';
};

const formatRegularDayRangeLabel = (startDay, endDay) => {
  const a = REGULAR_DAY_ABBREV[startDay];
  const b = REGULAR_DAY_ABBREV[endDay];
  if (!a || !b) return '';
  if (startDay === endDay) return a;
  return `${a} - ${b}`;
};

const buildRegularDaysOfficialLines = (officialTimes, formatTimeFn) => {
  const lines = [];
  let runStart = -1;
  let runEnd = -1;
  let runSeg = '';

  const flush = () => {
    if (runStart < 0) return;
    const sDay = REGULAR_WEEKDAY_KEYS[runStart];
    const eDay = REGULAR_WEEKDAY_KEYS[runEnd];
    const label = formatRegularDayRangeLabel(sDay, eDay);
    if (label && runSeg) lines.push(`${label} ${runSeg}`);
    runStart = -1;
  };

  for (let i = 0; i < REGULAR_WEEKDAY_KEYS.length; i += 1) {
    const day = REGULAR_WEEKDAY_KEYS[i];
    const seg = buildOfficialTwoSegment(officialTimes[day], formatTimeFn);
    if (!seg) {
      flush();
      continue;
    }
    if (runStart < 0) {
      runStart = i;
      runEnd = i;
      runSeg = seg;
    } else if (seg === runSeg && runEnd === i - 1) {
      runEnd = i;
    } else {
      flush();
      runStart = i;
      runEnd = i;
      runSeg = seg;
    }
  }
  flush();
  return lines;
};

// Totals exactly 100% so the fixed layout gives the Late / U-time columns a
// predictable width instead of leaving the browser to redistribute leftovers.
const buildDtrColgroup = (wideDayCol = false) => (
  <colgroup>
    {/* Days — widen when a partial-suspension label (e.g. SUSP 3:00 PM) is shown */}
    <col style={{ width: wideDayCol ? '14%' : '8%' }} />
    <col style={{ width: wideDayCol ? '14.5%' : '15.5%' }} />
    <col style={{ width: wideDayCol ? '14.5%' : '15.5%' }} />
    <col style={{ width: wideDayCol ? '14.5%' : '15.5%' }} />
    <col style={{ width: wideDayCol ? '14.5%' : '15.5%' }} />
    <col style={{ width: wideDayCol ? '14%' : '15%' }} />
    <col style={{ width: wideDayCol ? '14%' : '15%' }} />
  </colgroup>
);

// Padding is deliberately tight: a 31-day month plus header and footer must fit
// the printable height at 1:1, otherwise the print fit-scaler shrinks the whole
// DTR and leaves unused margins on the sides. The table stretches these rows
// back out to fill the page for shorter months.
const DEFAULT_CELL_STYLE = {
  border: '1px solid black',
  textAlign: 'center',
  padding: '2px',
  fontFamily: 'Arial,serif',
  fontSize: '10px',
  height: '16px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  boxSizing: 'border-box',
  letterSpacing: '-0.3px',
};

const DAY_CELL_STACK_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1px',
  lineHeight: 1.15,
  width: '100%',
  minWidth: 0,
};

const DAY_LABEL_STYLE = {
  fontSize: '10px',
  lineHeight: 1.15,
};

const PARTIAL_SUSP_LABEL_STYLE = {
  fontSize: '6px',
  fontWeight: 700,
  color: '#b71c1c',
  lineHeight: 1.15,
  letterSpacing: '0',
  whiteSpace: 'nowrap',
};

const dtrRawEmpty = (v) =>
  v == null || (typeof v === 'string' && v.trim() === '');

const dtrWmSpanStyle = {
  fontSize: '8.5px',
  fontWeight: 700,
  fontFamily: 'Arial, "Times New Roman", serif',
  color: 'rgba(0,0,0,0.48)',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  lineHeight: 1,
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

const scopeForModuleType = (mod) => {
  if (mod === MODULE_TYPES.NON_TEACHING) return 'non_teaching';
  if (
    mod === MODULE_TYPES.FACULTY_30HRS ||
    mod === MODULE_TYPES.DESIGNATED_40HRS
  ) {
    return 'academic';
  }
  return null;
};

const scopeForEmploymentCategory = (cat) => {
  if (cat == null || cat === '') return null;
  const n = Number(cat);
  if (n === 3 || n === 4) return 'academic';
  if (n === 0 || n === 1 || n === 2) return 'non_teaching';
  return null;
};

const suspensionAppliesToScope = (susp, employeeScope) => {
  if (!susp) return false;
  const scope = susp.personnel_scope || 'all';
  if (scope === 'all') return true;
  if (!employeeScope) return false;
  return scope === employeeScope;
};

/** Prefer exact-scope match over "all", then newer id. */
const pickSuspensionForEmployee = (list, employeeScope) => {
  const matches = (list || []).filter((s) =>
    suspensionAppliesToScope(s, employeeScope),
  );
  if (!matches.length) return null;
  matches.sort((a, b) => {
    const aExact =
      employeeScope && (a.personnel_scope || 'all') === employeeScope ? 1 : 0;
    const bExact =
      employeeScope && (b.personnel_scope || 'all') === employeeScope ? 1 : 0;
    if (bExact !== aExact) return bExact - aExact;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
  return matches[0];
};

const expectedYmdForDay = (dayPadded, startDate, selectedYear, selectedMonth) => {
  if (startDate && /^\d{4}-\d{2}/.test(String(startDate))) {
    const [y, m] = String(startDate).split('-');
    if (y && m) return `${y}-${m}-${dayPadded}`;
  }
  if (selectedMonth != null && Number.isFinite(selectedYear)) {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${dayPadded}`;
  }
  return null;
};

/**
 * Reusable Daily Time Record layout — single source of truth for screen preview
 * and print/PDF output. Pass employee and attendance data as props; no hardcoded
 * records inside the template.
 */
export default function DTRTemplate({
  employeeName = '',
  records = [],
  officialTime = {},
  showOfficialTimeOnDtr = false,
  startDate = '',
  endDate = '',
  selectedYear,
  selectedMonth = null,
  holidays = [],
  suspensions = [],
  approvedLeaves = [],
  computedLateByDate = {},
  suggestedHalfDayDatesSet = new Set(),
  halfDayReviewByDate = {},
  computationModuleType,
  employeeScope = null,
  employmentCategory = null,
  /** When passed (including null), holidays/suspensions are campus-filtered. Omit to show all. */
  employeeBranch,
  formatTime = defaultFormatTime,
  keyPrefix = 'dtr',
  cellStyle = DEFAULT_CELL_STYLE,
  className = 'table-side-by-side',
  /** 'regular' | 'honorarium' | 'service-credit' | 'overtime' */
  dtrType = 'regular',
}) {
  const isSpecialDtr = dtrType !== 'regular';

  const dtrTitle =
    dtrType === 'honorarium'
      ? 'DAILY TIME RECORD - HONORARIUM'
      : dtrType === 'overtime'
        ? 'DAILY TIME RECORD - OVERTIME'
        : 'DAILY TIME RECORD';

  const officialHoursCaption =
    dtrType === 'honorarium'
      ? 'Official hours for honorarium (arrival and departure)'
      : dtrType === 'overtime'
        ? 'Official hours for overtime (arrival and departure)'
        : dtrType === 'service-credit'
          ? 'Official hours for service credits (arrival and departure)'
          : 'Official hours for arrival (regular day) and departure';

  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate = formatEndDate(endDate);

  const daysInSelectedMonth = (() => {
    if (selectedMonth == null || !Number.isFinite(selectedYear)) return 31;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  })();

  const isDateInRange = (date, s, e) => {
    if (!date) return false;
    const d = toPhCalendarYmd(date);
    if (!d) return false;
    const st = s != null && s !== '' ? toPhCalendarYmd(s) : null;
    const en = e != null && e !== '' ? toPhCalendarYmd(e) : null;
    if (st && en) return d >= st && d <= en;
    if (st) return d >= st;
    if (en) return d <= en;
    return false;
  };

  const resolvedEmployeeScope =
    employeeScope ||
    scopeForModuleType(computationModuleType) ||
    scopeForEmploymentCategory(employmentCategory);

  const matchesCalendarBranch = (entry) =>
    employeeBranch === undefined
      ? true
      : calendarAppliesToBranch(entry, employeeBranch);

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = toPhCalendarYmd(dateString);
    if (!date) return null;
    // Suspension before leave so a work-suspension day stays visible after
    // approved leave loads (same order as the hub DTR).
    const matchingSuspensions = suspensions.filter(
      (s) =>
        isDateInRange(date, s.date_start || s.date, s.date_end || s.date) &&
        matchesCalendarBranch(s),
    );
    const susp = pickSuspensionForEmployee(
      matchingSuspensions,
      resolvedEmployeeScope,
    );
    if (susp) {
      const suspensionType = susp.suspension_type || 'whole_day';
      const isPartial = suspensionType === 'partial_day' && susp.effective_time;
      return {
        type: 'suspension',
        suspensionType,
        effectiveTime: susp.effective_time || null,
        label: isPartial
          ? `SUSPENSION FROM ${formatSuspensionEffectiveTime(susp.effective_time)}`
          : 'SUSPENSION',
        bgColor: 'rgba(211,47,47,0.2)',
        textColor: '#000',
        borderColor: '#d32f2f',
      };
    }
    const leaveReq = findApprovedLeaveForDate(date, approvedLeaves);
    if (leaveReq)
      return {
        type: 'leave',
        label: formatDtrLeaveLabel(leaveReq),
        bgColor: 'rgba(46,125,50,0.2)',
        textColor: '#000',
        borderColor: '#2e7d32',
      };
    const hol = holidays.find(
      (h) =>
        isDateInRange(date, h.date_start || h.date, h.date_end || h.date) &&
        matchesCalendarBranch(h),
    );
    if (hol)
      return {
        type: 'holiday',
        label: 'HOLIDAY',
        bgColor: 'rgba(237,108,2,0.25)',
        textColor: '#000',
        borderColor: '#ed6c02',
      };
    return null;
  };

  const needsWideDayCol = (() => {
    for (let i = 0; i < daysInSelectedMonth; i++) {
      const day = String(i + 1).padStart(2, '0');
      const ymd = expectedYmdForDay(
        day,
        startDate,
        selectedYear,
        selectedMonth,
      );
      const ind = getDateIndicator(ymd);
      if (
        ind?.type === 'suspension' &&
        ind?.suspensionType === 'partial_day'
      ) {
        return true;
      }
    }
    return false;
  })();

  const getDtrHeaderData = () => {
    const regularDaysLines = showOfficialTimeOnDtr
      ? buildRegularDaysOfficialLines(officialTime, formatTime)
      : [];
    const saturdayOfficialText = showOfficialTimeOnDtr
      ? buildOfficialTwoSegment(officialTime.Saturday, formatTime)
      : '';
    const regularBlockMinH =
      showOfficialTimeOnDtr && regularDaysLines.length > 0
        ? 14 + Math.max(0, regularDaysLines.length - 1) * 16
        : 14;
    return {
      regularDaysLines,
      saturdayOfficialText,
      regularBlockMinH,
    };
  };

  const renderHeader = () => {
    const {
      regularDaysLines,
      saturdayOfficialText,
      regularBlockMinH,
    } = getDtrHeaderData();
    return (
      <thead style={{ textAlign: 'center' }}>
        <tr>
          <td
            colSpan="7"
            className="dtr-header-top-cell"
            style={{
              position: 'relative',
              padding: '6px 4px 2px 4px',
              textAlign: 'center',
            }}
          >
            {/*
              Text is centered on the full DTR width (same axis as
              "DAILY TIME RECORD"). Logo is absolute on the left so it sits
              beside the institute lines without shifting the text off-center.
            */}
            <img
              src={earistLogo}
              alt="Logo"
              width="48"
              height="48"
              style={{
                position: 'absolute',
                left: '0px',
                top: '20px',
                width: '48px',
                height: '48px',
                display: 'block',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '12px',
                fontFamily: 'Arial,"Times New Roman",serif',
                color: 'black',
                marginBottom: '1px',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              Republic of the Philippines
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                fontFamily: 'Arial,"Times New Roman",serif',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              EULOGIO &quot;AMANG&quot; RODRIGUEZ
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                fontFamily: 'Arial,"Times New Roman",serif',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              INSTITUTE OF SCIENCE &amp; TECHNOLOGY
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                margin: '2px 0 0 0',
                fontFamily: 'Arial,serif',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              Nagtahan, Sampaloc Manila
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px' }}>
            <p
              style={{
                fontSize: '8px',
                margin: '0',
                fontFamily: 'Times New Roman,serif',
              }}
            >
              Civil Service Form No. 48
            </p>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            style={{
              textAlign: 'center',
              padding: '2px 5px',
              lineHeight: '1.2',
            }}
          >
            <h4
              style={{
                fontFamily: 'Times New Roman,serif',
                textAlign: 'center',
                margin: '2px 0',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {dtrTitle}
            </h4>
            {dtrType === 'service-credit' ? (
              <div
                style={{
                  fontFamily: 'Times New Roman,serif',
                  fontSize: '16px',
                  marginTop: '-2px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                SERVICE CREDITS
              </div>
            ) : null}
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            style={{
              paddingTop: '10px',
              paddingBottom: '5px',
              lineHeight: '1.1',
              verticalAlign: 'top',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                margin: '0 auto',
                fontFamily: 'Arial,serif',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  fontFamily: 'Times New Roman',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {employeeName}
              </div>
              <div
                style={{
                  borderBottom: '1px solid black',
                  width: '100%',
                  margin: '2px 0 3px 0',
                }}
              />
              <div
                style={{
                  fontSize: '9px',
                  textAlign: 'center',
                  fontFamily: 'Times New Roman',
                }}
              >
                NAME
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            className="dtr-meta-cell"
            style={{
              padding: '4px 8px 2px 8px',
              lineHeight: '1.2',
              textAlign: 'left',
              fontWeight: 400,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                fontFamily: 'Times New Roman,serif',
                fontSize: '10px',
                fontWeight: 400,
                width: '100%',
              }}
            >
              <span
                style={{
                  marginRight: '6px',
                  flexShrink: 0,
                  fontWeight: 400,
                }}
              >
                Covered Dates:
              </span>
              <span
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  fontWeight: 400,
                  textAlign: 'left',
                  fontSize: '10px',
                  fontFamily: 'Times New Roman,serif',
                  borderBottom: '1px solid black',
                  paddingBottom: '1px',
                }}
              >
                {formattedStartDate} - {formattedEndDate}
              </span>
            </div>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            className="dtr-meta-cell"
            style={{
              padding: '2px 8px',
              lineHeight: '1.2',
              textAlign: 'left',
              fontWeight: 400,
            }}
          >
            <p
              style={{
                fontSize: '11px',
                margin: '0',
                fontFamily: 'Times New Roman,serif',
                fontWeight: 400,
              }}
            >
              For the month of: {startDate ? formatMonth(startDate) : ''}
            </p>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            style={{
              padding: '8px 8px 2px 8px',
              textAlign: 'left',
              fontSize: '10px',
              fontFamily: 'Arial,serif',
              lineHeight: '1.2',
            }}
          >
            {officialHoursCaption}
          </td>
        </tr>
        <tr>
          <td colSpan="7" style={{ padding: '2px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                minHeight: regularBlockMinH,
                fontFamily: 'Arial,serif',
                fontSize: '10px',
              }}
            >
              <span
                style={{ marginRight: '5px', flexShrink: 0, lineHeight: 1.2 }}
              >
                {DTR_LABELS.regularDaysCaption}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1px solid black',
                  flexGrow: 1,
                  minWidth: 0,
                  marginBottom: '2px',
                  paddingLeft: '4px',
                  paddingBottom: '1px',
                  fontSize: regularDaysLines.length > 0 ? '9px' : '10px',
                  lineHeight: 1.35,
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {regularDaysLines.map((line, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 ? <br /> : null}
                    {line}
                  </React.Fragment>
                ))}
              </span>
            </div>
          </td>
        </tr>
        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`e2${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}
        <tr>
          <td colSpan="7" style={{ padding: '2px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                minHeight:
                  showOfficialTimeOnDtr && saturdayOfficialText ? 26 : 20,
                fontFamily: 'Arial,serif',
                fontSize: '10px',
              }}
            >
              <span
                style={{ marginRight: '5px', flexShrink: 0, lineHeight: 1.2 }}
              >
                {DTR_LABELS.saturdaysCaption}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1px solid black',
                  flexGrow: 1,
                  minWidth: 0,
                  marginBottom: '2px',
                  paddingLeft: '4px',
                  paddingBottom: '1px',
                  fontSize: saturdayOfficialText ? '9px' : '10px',
                  lineHeight: 1.25,
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {saturdayOfficialText}
              </span>
            </div>
          </td>
        </tr>
        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`e3${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}
        <tr>
          <th
            rowSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Times New Roman,serif',
              fontSize: '12px',
              fontWeight: 'normal',
            }}
          >
            DAY
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Times New Roman,serif',
              fontSize: '18px',
              fontWeight: 'normal',
            }}
          >
            A.M.
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Times New Roman,serif',
              fontSize: '18px',
              fontWeight: 'normal',
            }}
          >
            P.M.
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Times New Roman,serif',
              fontSize: '12px',
              fontWeight: 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {DTR_LABELS.lateHeader}
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Times New Roman,serif',
              fontSize: '12px',
              fontWeight: 'normal',
              // Must stay on a single line — the narrow column would otherwise
              // break "U-time" across two rows.
              whiteSpace: 'nowrap',
            }}
          >
            {DTR_LABELS.undertimeHeader}
          </th>
        </tr>
        <tr style={{ textAlign: 'center' }}>
          {[
            'Arrival',
            'Departure',
            'Arrival',
            'Departure',
            DTR_LABELS.lateSubHeader,
            DTR_LABELS.undertimeSubHeader,
          ].map((label, i) => (
            <td
              key={i}
              style={{
                border: '1px solid black',
                fontSize: '9px',
                fontFamily: 'Arial,serif',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </td>
          ))}
        </tr>
      </thead>
    );
  };

  const renderDtrAmPmWatermarkCell = (
    rawVal,
    displayText,
    rowTint,
    indicator,
    colKey,
    styleObj,
  ) => {
    const calendarWm =
      indicator?.label &&
      (indicator.type === 'leave' ||
        indicator.type === 'holiday' ||
        (indicator.type === 'suspension' &&
          indicator.suspensionType !== 'partial_day'));
    const showWm = Boolean(calendarWm || (indicator && dtrRawEmpty(rawVal)));
    return (
      <td
        key={colKey}
        style={{
          ...styleObj,
          backgroundColor: rowTint,
          position: 'relative',
          verticalAlign: 'middle',
          overflow: styleObj?.overflow ?? 'visible',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {showWm && (
          <div
            className="dtr-cell-watermark"
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <span style={dtrWmSpanStyle}>{indicator.label}</span>
          </div>
        )}
        <span
          className="dtr-actual-time"
          style={{
            position: 'relative',
            zIndex: 1,
            visibility: calendarWm ? 'hidden' : 'visible',
          }}
        >
          {calendarWm ? '' : displayText}
        </span>
      </td>
    );
  };

  const renderDayNumberCell = (
    dayLabel,
    styleObj,
    rowTint,
    partialSuspLabel = null,
  ) => (
    <td
      style={{
        ...styleObj,
        backgroundColor: rowTint,
        position: 'relative',
        // Let the Days column show the full SUSP label; width comes from colgroup.
        ...(partialSuspLabel
          ? {
              height: 'auto',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              verticalAlign: 'middle',
            }
          : null),
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div style={DAY_CELL_STACK_STYLE}>
        <div style={DAY_LABEL_STYLE}>{dayLabel}</div>
        {partialSuspLabel ? (
          <div style={PARTIAL_SUSP_LABEL_STYLE}>{partialSuspLabel}</div>
        ) : null}
      </div>
    </td>
  );

  const hasScheduleForUser = Object.values(officialTime || {}).some(
    (sched) =>
      !emptyOfficialTime(sched?.officialTimeIN) &&
      !emptyOfficialTime(sched?.officialTimeOUT),
  );
  const moduleType = computationModuleType || MODULE_TYPES.NON_TEACHING;

  const renderTableRows = (styleObj, rowKeyPrefix) =>
    Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const dayNum = i + 1;
      const day = dayNum.toString().padStart(2, '0');
      const dayLabel = String(dayNum);
      const expectedYmd = expectedYmdForDay(
        day,
        startDate,
        selectedYear,
        selectedMonth,
      );
      const record = records.find((r) =>
        expectedYmd
          ? toPhCalendarYmd(r?.date) === expectedYmd
          : r?.date && recordMatchesDay(r, day),
      );
      const fullDate = record?.date
        ? toPhCalendarYmd(record.date) || expectedYmd
        : expectedYmd;
      const dateIndicator = getDateIndicator(fullDate);

      const isPartialSuspensionRow =
        dateIndicator?.type === 'suspension' &&
        dateIndicator?.suspensionType === 'partial_day';

      const isNotScheduledDay = (() => {
        if (isSpecialDtr) {
          const dayName = getDtrWeekdayName(fullDate);
          const dayOfficial = dayName ? officialTime?.[dayName] : null;
          if (isSpecialOfficialScheduled(dayOfficial, dtrType)) return false;
          const anySpecial = Object.values(officialTime || {}).some((row) =>
            isSpecialOfficialScheduled(row, dtrType),
          );
          if (anySpecial) return true;
        }
        return !isDtrDateScheduledByOfficialTime({
          record,
          officialTimesByDay: officialTime,
          fullDate,
        });
      })();
      const hasPeriodRecords =
        (Array.isArray(records) && records.length > 0) ||
        Boolean(startDate && endDate);
      // Special DTRs only punch IN/OUT — map into the shared empty-punch helpers.
      const timeFields = isSpecialDtr
        ? {
            timeIN: record?.specialTimeIN,
            breaktimeIN: null,
            breaktimeOUT: null,
            timeOUT: record?.specialTimeOUT,
          }
        : {
            timeIN: record?.timeIN,
            breaktimeIN: record?.breaktimeIN,
            breaktimeOUT: record?.breaktimeOUT,
            timeOUT: record?.timeOUT,
          };
      const dayName = getDtrWeekdayName(fullDate);
      const suppressScheduleBanners = !isSpecialDtr && !hasScheduleForUser;
      const rowForStatus = {
        ...(record || {}),
        date: fullDate || record?.date,
        timeIN: timeFields.timeIN,
        breaktimeIN: timeFields.breaktimeIN,
        breaktimeOUT: timeFields.breaktimeOUT,
        timeOUT: timeFields.timeOUT,
      };
      const rowIsAbsent =
        !isSpecialDtr &&
        !suppressScheduleBanners &&
        !isPartialSuspensionRow &&
        isDtrAbsentRow({
          record: rowForStatus,
          dateIndicator,
          isNotScheduledDay,
          moduleType,
          hasPeriodRecords,
        });
      const halfUi =
        !isSpecialDtr && !dateIndicator && !rowIsAbsent
          ? getRowHalfDayUiStatus(rowForStatus, halfDayReviewByDate, moduleType)
          : null;
      const halfDayIndicator = halfUi ? getDtrHalfDayIndicator(halfUi) : null;
      const absentIndicator = rowIsAbsent ? getDtrAbsentIndicator() : null;
      const indicator = isPartialSuspensionRow
        ? null
        : resolveDtrRowIndicator(dateIndicator, {
            absentIndicator,
            halfDayIndicator,
          });
      let rowTint = resolveDtrRowTint(dateIndicator, {
        absentIndicator,
        halfDayIndicator,
        suggestedHalfDay:
          halfUi === 'suggested' ||
          Boolean(fullDate && suggestedHalfDayDatesSet.has(fullDate)),
      });
      if (isPartialSuspensionRow) {
        rowTint = 'rgba(211,47,47,0.06)';
      }
      const isNonWorkingDayRow =
        !isPartialSuspensionRow &&
        !suppressScheduleBanners &&
        isDtrNonWorkingDayRow({
          isNotScheduledDay,
          indicator: dateIndicator,
          timeFields,
          hasPeriodRecords,
          fullDate,
          dayName,
        });
      const unscheduledWeekdayLabel =
        isPartialSuspensionRow || suppressScheduleBanners
          ? ''
          : getDtrUnscheduledWeekdayBanner({
              isNotScheduledDay,
              indicator: dateIndicator,
              timeFields,
              hasPeriodRecords,
              fullDate,
              dayName,
            });
      const nonWorkingRowTint =
        isNonWorkingDayRow || unscheduledWeekdayLabel
          ? 'rgba(128, 128, 128, 0.06)'
          : rowTint;

      // Shared by regular + honorarium / service-credit / overtime:
      // HOLIDAY, ON LEAVE / leave type, SUSPENSION, NON-WORKING DAY, weekday banners.
      if (isDtrCalendarBannerRow(dateIndicator) && !isPartialSuspensionRow) {
        return (
          <tr key={`${rowKeyPrefix}-${i}`} className="dtr-day-row">
            <td
              style={{
                ...styleObj,
                backgroundColor: rowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontSize: '10px' }}>{dayLabel}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...styleObj,
                backgroundColor: rowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={dtrWmSpanStyle}>{dateIndicator.label}</span>
            </td>
          </tr>
        );
      }
      if (isNonWorkingDayRow) {
        return (
          <tr key={`${rowKeyPrefix}-${i}`} className="dtr-day-row">
            <td
              style={{
                ...styleObj,
                backgroundColor: nonWorkingRowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontSize: '10px' }}>{dayLabel}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...styleObj,
                backgroundColor: nonWorkingRowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={dtrWmSpanStyle}>{DTR_NON_WORKING_DAY_LABEL}</span>
            </td>
          </tr>
        );
      }
      if (unscheduledWeekdayLabel) {
        return (
          <tr key={`${rowKeyPrefix}-${i}`} className="dtr-day-row">
            <td
              style={{
                ...styleObj,
                backgroundColor: nonWorkingRowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontSize: '10px' }}>{dayLabel}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...styleObj,
                backgroundColor: nonWorkingRowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={dtrWmSpanStyle}>{unscheduledWeekdayLabel}</span>
            </td>
          </tr>
        );
      }
      if (rowIsAbsent) {
        return (
          <tr key={`${rowKeyPrefix}-${i}`} className="dtr-day-row">
            <td
              style={{
                ...styleObj,
                backgroundColor: rowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontSize: '10px' }}>{dayLabel}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...styleObj,
                backgroundColor: rowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={dtrWmSpanStyle}>{DTR_ABSENT_LABEL}</span>
            </td>
          </tr>
        );
      }

      // Honorarium / Service Credits / Overtime: specialTimeIN/OUT + hours/minutes.
      if (isSpecialDtr) {
        const hoursVal =
          record?.hours != null && record.hours !== ''
            ? String(record.hours)
            : '';
        const minutesVal =
          record?.minutes != null && record.minutes !== ''
            ? String(record.minutes)
            : '';
        const cellIndicator = isPartialSuspensionRow ? null : indicator;
        const partialSuspLabel = isPartialSuspensionRow
          ? dateIndicator.label
          : null;
        return (
          <tr key={`${rowKeyPrefix}-${i}`} className="dtr-day-row">
            {renderDayNumberCell(
              dayLabel,
              styleObj,
              rowTint,
              partialSuspLabel,
            )}
            {renderDtrAmPmWatermarkCell(
              record?.specialTimeIN,
              formatTime(record?.specialTimeIN || ''),
              rowTint,
              cellIndicator,
              `${rowKeyPrefix}-${i}-0`,
              styleObj,
            )}
            {renderDtrAmPmWatermarkCell(
              null,
              '',
              rowTint,
              cellIndicator,
              `${rowKeyPrefix}-${i}-1`,
              styleObj,
            )}
            {renderDtrAmPmWatermarkCell(
              null,
              '',
              rowTint,
              cellIndicator,
              `${rowKeyPrefix}-${i}-2`,
              styleObj,
            )}
            {renderDtrAmPmWatermarkCell(
              record?.specialTimeOUT,
              formatTime(record?.specialTimeOUT || ''),
              rowTint,
              cellIndicator,
              `${rowKeyPrefix}-${i}-3`,
              styleObj,
            )}
            <td
              style={{
                ...styleObj,
                backgroundColor: rowTint,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span>{hoursVal}</span>
            </td>
            <td
              style={{
                ...styleObj,
                backgroundColor: rowTint,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span>{minutesVal}</span>
            </td>
          </tr>
        );
      }

      const cellIndicator = isPartialSuspensionRow ? null : indicator;
      const partialSuspLabel = isPartialSuspensionRow
        ? `SUSP ${formatSuspensionEffectiveTime(dateIndicator.effectiveTime)}`
        : null;
      const computed = computedLateByDate[fullDate];
      const isExcludedDay =
        dateIndicator?.type === 'holiday' ||
        (dateIndicator?.type === 'suspension' && !isPartialSuspensionRow) ||
        dateIndicator?.type === 'leave';
      const hasIncompletePunch = Boolean(
        record &&
        ((dtrRawEmpty(record?.timeIN) && !dtrRawEmpty(record?.timeOUT)) ||
          (!dtrRawEmpty(record?.timeIN) && dtrRawEmpty(record?.timeOUT))),
      );
      const isPendingHalfDay = isDtrHalfDayLateUndertimePending({
        record,
        fullDate,
        reviewByDate: halfDayReviewByDate,
        moduleType,
      });
      const { lateDisplay, undertimeDisplay } = resolveDtrLateUndertimeDisplay({
        computed,
        record,
        isExcludedDay,
        hasIncompletePunch,
        isNotScheduledDay,
        isPendingHalfDay,
      });
      return (
        <tr key={`${rowKeyPrefix}-${i}`} className="dtr-day-row">
          {renderDayNumberCell(
            dayLabel,
            styleObj,
            rowTint,
            partialSuspLabel,
          )}
          {renderDtrAmPmWatermarkCell(
            record?.timeIN,
            formatTime(record?.timeIN || ''),
            rowTint,
            cellIndicator,
            `${rowKeyPrefix}-${i}-0`,
            styleObj,
          )}
          {renderDtrAmPmWatermarkCell(
            record?.breaktimeIN,
            formatTime(record?.breaktimeIN || ''),
            rowTint,
            cellIndicator,
            `${rowKeyPrefix}-${i}-1`,
            styleObj,
          )}
          {renderDtrAmPmWatermarkCell(
            record?.breaktimeOUT,
            formatTime(record?.breaktimeOUT || ''),
            rowTint,
            cellIndicator,
            `${rowKeyPrefix}-${i}-2`,
            styleObj,
          )}
          {renderDtrAmPmWatermarkCell(
            record?.timeOUT,
            formatTime(record?.timeOUT || ''),
            rowTint,
            cellIndicator,
            `${rowKeyPrefix}-${i}-3`,
            styleObj,
          )}
          <td
            style={{
              ...styleObj,
              backgroundColor: rowTint,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <span className="dtr-computed-late">{lateDisplay}</span>
          </td>
          <td
            style={{
              ...styleObj,
              backgroundColor: rowTint,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <span className="dtr-computed-undertime">{undertimeDisplay}</span>
          </td>
        </tr>
      );
    });

  const renderTableFooter = () => (
    <tr className="dtr-footer-row">
      <td colSpan="7" style={{ padding: '10px 6px 8px 6px' }}>
        <hr style={{ borderTop: '2px solid black', width: '100%', margin: 0 }} />
        <p
          style={{
            textAlign: 'justify',
            fontSize: '11px',
            lineHeight: '1.45',
            fontFamily: 'Times New Roman,serif',
            margin: '10px 0 0 0',
          }}
        >
          I CERTIFY on my honor that the above is a true and correct report of
          the hours of work performed, record of which was made daily at the
          time of arrival and at the time of departure from office.
        </p>
        <div
          style={{
            width: '55%',
            marginLeft: 'auto',
            textAlign: 'center',
            marginTop: '22px',
          }}
        >
          <hr style={{ borderTop: '1px solid black', margin: 0 }} />
          <p
            style={{
              fontSize: '11px',
              fontFamily: 'Times New Roman,serif',
              margin: '6px 0 0 0',
            }}
          >
            Signature
          </p>
        </div>
        <div style={{ width: '100%', marginTop: '18px' }}>
          <hr
            style={{ borderTop: '1px solid black', width: '100%', margin: 0 }}
          />
          <hr
            style={{
              borderTop: '1px solid black',
              width: '100%',
              margin: '3px 0 0 0',
            }}
          />
          <p
            style={{
              fontSize: '10px',
              fontFamily: 'Arial, serif',
              margin: '10px 0 0 0',
              textAlign: 'center',
            }}
          >
            Verified as to prescribed office hours.
          </p>
        </div>
        <div
          style={{
            width: '55%',
            marginLeft: 'auto',
            marginTop: '28px',
            textAlign: 'center',
          }}
        >
          <hr style={{ borderTop: '1px solid black', margin: 0 }} />
          <p
            style={{
              fontSize: '9px',
              fontFamily: 'Times New Roman,serif',
              margin: '6px 0 0 0',
            }}
          >
            In-Charge
          </p>
          <p
            style={{
              fontSize: '9px',
              fontFamily: 'Arial,serif',
              margin: '2px 0 0 0',
            }}
          >
            (Signature Over Printed Name)
          </p>
        </div>
      </td>
    </tr>
  );

  const pageWidth = `${DTR_PRINTABLE_WIDTH_MM}mm`;
  const pageHeight = `${DTR_PRINTABLE_HEIGHT_MM}mm`;
  const sheetWidth = `${DTR_SHEET_WIDTH_MM}mm`;

  return (
    <div
      className={`dtr-page ${className}`}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        width: pageWidth,
        minWidth: pageWidth,
        height: pageHeight,
        minHeight: pageHeight,
        margin: '0 auto',
        backgroundColor: 'white',
        boxSizing: 'border-box',
      }}
    >
      {[0, 1].flatMap((tableIdx) => {
        const sheet = (
          <div
            key={`sheet-${tableIdx}`}
            className="dtr-sheet"
            style={{
              flex: `0 0 ${sheetWidth}`,
              width: sheetWidth,
              minWidth: sheetWidth,
              height: pageHeight,
              boxSizing: 'border-box',
            }}
          >
            <table
              className="dtr-table"
              style={{
                border: 'none',
                borderCollapse: 'collapse',
                width: '100%',
                height: '100%',
                tableLayout: 'fixed',
              }}
            >
              {buildDtrColgroup(needsWideDayCol)}
              {renderHeader()}
              <tbody className="dtr-body">
                {renderTableRows(cellStyle, `${keyPrefix}${tableIdx}`)}
              </tbody>
              <tfoot className="dtr-footer">{renderTableFooter()}</tfoot>
            </table>
          </div>
        );
        if (tableIdx === 0) return [sheet];
        return [
          <div
            key="dtr-cut-gap"
            className="dtr-cut-gap"
            aria-hidden="true"
            style={{
              flex: `0 0 ${DTR_CUT_GAP_MM}mm`,
              width: `${DTR_CUT_GAP_MM}mm`,
              minWidth: `${DTR_CUT_GAP_MM}mm`,
              height: pageHeight,
            }}
          />,
          sheet,
        ];
      })}
    </div>
  );
}
