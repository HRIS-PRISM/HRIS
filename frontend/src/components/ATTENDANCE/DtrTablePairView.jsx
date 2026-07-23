import React from 'react';
import earistLogo from '../../assets/earistLogo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import {
  resolveDtrLateUndertimeDisplay,
  isDtrDateScheduledByOfficialTime,
  isDtrHalfDayLateUndertimePending,
} from '../../utils/dtrLateUndertimeFromOverall';
import { MODULE_TYPES } from '../../utils/halfDayReview';
import {
  DTR_WIDTH_IN,
  DTR_WM_INLINE_STYLE,
  DTR_NON_WORKING_DAY_LABEL,
  resolveDtrAmPmCellText,
  isDtrNonWorkingDayRow,
  toPhCalendarYmd,
  normRecordYmd,
  recordMatchesDay,
  formatTime,
  formatMonth,
  formatStartDate,
  formatEndDate,
  formatDtrLeaveLabel,
  findApprovedLeaveForDate,
  isDtrCalendarBannerRow,
} from '../../utils/dtrFormatHelpers';

// ─── Official-time helpers (ported from DailyTimeRecordOverall) ───────────
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

const buildRegularDaysOfficialLines = (officialTimesMap, formatTimeFn) => {
  const lines = [];
  let runStart = -1,
    runEnd = -1,
    runSeg = '';
  const flush = () => {
    if (runStart < 0) return;
    const label = formatRegularDayRangeLabel(
      REGULAR_WEEKDAY_KEYS[runStart],
      REGULAR_WEEKDAY_KEYS[runEnd],
    );
    if (label && runSeg) lines.push(`${label} ${runSeg}`);
    runStart = -1;
  };
  for (let i = 0; i < REGULAR_WEEKDAY_KEYS.length; i++) {
    const day = REGULAR_WEEKDAY_KEYS[i];
    const seg = buildOfficialTwoSegment(officialTimesMap[day], formatTimeFn);
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

const DTRColGroup = () => (
  <colgroup>
    <col style={{ width: '8%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '16%' }} />
    <col style={{ width: '14%' }} />
    <col style={{ width: '14%' }} />
  </colgroup>
);

const cellStyle = {
  border: '1px solid black',
  textAlign: 'center',
  padding: '0 1px',
  fontFamily: 'Arial,serif',
  fontSize: '10px',
  height: '16px',
  whiteSpace: 'nowrap',
};

const dtrRawEmpty = (v) =>
  v == null || (typeof v === 'string' && v.trim() === '');

export function DtrTableContainer({ children, watermark = true }) {
  return (
    <div className="table-container">
      <div className="table-wrapper" style={{ position: 'relative' }}>
        {watermark && (
          <img
            src={hrisLogo}
            alt="Watermark"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              opacity: 0.07,
              width: '80%',
              maxWidth: '600px',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

export default function DtrTablePairView({
  records,
  nameDisplay,
  officialTimesForUser = {},
  employeeNumber = null,
  dtrType = 'regular',
  startDate,
  endDate,
  selectedYear,
  selectedMonth,
  showOfficialTimeOnDtr = false,
  holidays = [],
  suspensions = [],
  approvedLeaves = [],
  computedLateForEmployee = {},
  halfDayDatesSet = new Set(),
  halfDayReviewByDate = {},
  computationModuleType = MODULE_TYPES.NON_TEACHING,
}) {
  const formattedStartDate = formatStartDate(startDate);
  const formattedEndDate = formatEndDate(endDate);

  const daysInSelectedMonth = (() => {
    if (selectedMonth == null || !Number.isFinite(selectedYear)) return 31;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  })();

  const isApprovedLeaveDate = (dateString) => {
    if (!dateString || !approvedLeaves.length) return false;
    const check = toPhCalendarYmd(dateString);
    if (!check) return false;
    return approvedLeaves.some((req) => {
      const dates = Array.isArray(req.leave_date)
        ? req.leave_date
        : String(req.leave_date)
            .split(',')
            .map((d) => d.trim());
      return dates.some((d) => toPhCalendarYmd(d) === check);
    });
  };

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

  const getDateIndicator = (dateString) => {
    if (!dateString) return null;
    const date = toPhCalendarYmd(dateString);
    if (!date) return null;
    const leaveReq = findApprovedLeaveForDate(date, approvedLeaves);
    if (leaveReq)
      return {
        type: 'leave',
        label: formatDtrLeaveLabel(leaveReq),
        bgColor: 'rgba(46,125,50,0.2)',
        textColor: '#000',
        borderColor: '#2e7d32',
      };
    const susp = suspensions.find((s) =>
      isDateInRange(date, s.date_start || s.date, s.date_end || s.date),
    );
    if (susp)
      return {
        type: 'suspension',
        label: 'SUSPENSION',
        bgColor: 'rgba(211,47,47,0.2)',
        textColor: '#000',
        borderColor: '#d32f2f',
      };
    const hol = holidays.find((h) =>
      isDateInRange(date, h.date_start || h.date, h.date_end || h.date),
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

  const getTimeFields = (record, type) => {
    if (!record)
      return { timeIN: '', breaktimeIN: '', breaktimeOUT: '', timeOUT: '' };
    switch (type) {
      case 'honorarium':
      case 'service-credit':
      case 'overtime':
        return {
          timeIN: record.specialTimeIN || '',
          breaktimeIN: '',
          breaktimeOUT: '',
          timeOUT: record.specialTimeOUT || '',
        };
      default:
        return {
          timeIN: record.timeIN || '',
          breaktimeIN: record.breaktimeIN || '',
          breaktimeOUT: record.breaktimeOUT || '',
          timeOUT: record.timeOUT || '',
        };
    }
  };

  const getRenderedTimeData = (record, type) => {
    if (!record) return { hours: '', minutes: '' };
    if (type === 'regular') {
      return {
        hours:
          record.hours != null && record.hours !== ''
            ? String(record.hours)
            : '',
        minutes:
          record.minutes != null && record.minutes !== ''
            ? String(record.minutes)
            : '',
      };
    }
    const mins = Number(record.minutes) || 0;
    return {
      hours: mins >= 60 ? String(Math.floor(mins / 60)) : '',
      minutes: mins % 60 > 0 ? String(mins % 60) : '',
    };
  };

  const renderDTRHeader = (
    headerNameDisplay,
    type = dtrType,
    officialTimes = {},
  ) => {
    const fs = '10px';

    const regularDaysLines = showOfficialTimeOnDtr
      ? buildRegularDaysOfficialLines(officialTimes, formatTime)
      : [];
    const saturdayOfficialText = showOfficialTimeOnDtr
      ? buildOfficialTwoSegment(officialTimes.Saturday, formatTime)
      : '';
    const regularBlockMinH =
      showOfficialTimeOnDtr && regularDaysLines.length > 0
        ? 14 + Math.max(0, regularDaysLines.length - 1) * 16
        : 14;

    return (
      <thead style={{ textAlign: 'center' }}>
        <tr>
          <td
            colSpan="7"
            style={{
              position: 'relative',
              padding: '25px 10px 0px 10px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '11px',
                fontFamily: 'Arial,"Times New Roman",serif',
                color: 'black',
                marginBottom: '2px',
              }}
            >
              Republic of the Philippines
            </div>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '3px',
              }}
            >
              <img
                src={earistLogo}
                alt="Logo"
                width="50"
                height="50"
                style={{ position: 'absolute', left: '10px' }}
              />
              <p
                style={{
                  margin: '0',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  fontFamily: 'Arial,"Times New Roman",serif',
                  lineHeight: '1.2',
                }}
              >
                EULOGIO "AMANG" RODRIGUEZ <br /> INSTITUTE OF SCIENCE &amp;
                TECHNOLOGY
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            style={{ textAlign: 'center', padding: '0px 5px 2px 5px' }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                margin: '0',
                fontFamily: 'Arial,serif',
              }}
            >
              Nagtahan, Sampaloc Manila
            </p>
          </td>
        </tr>
        <tr>
          <td colSpan="7" style={{ textAlign: 'center', padding: '2px 5px' }}>
            <p
              style={{
                fontSize: '8px',
                fontWeight: 'bold',
                margin: '0',
                fontFamily: 'Arial,serif',
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
            {type === 'service-credit' ? (
              <div style={{ textAlign: 'center' }}>
                <h4
                  style={{
                    fontFamily: 'Times New Roman,serif',
                    margin: '2px 0',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                >
                  DAILY TIME RECORD
                </h4>
                <div
                  style={{
                    fontFamily: 'Times New Roman,serif',
                    fontSize: '16px',
                    marginTop: '-2px',
                    fontWeight: 'bold',
                  }}
                >
                  SERVICE CREDITS
                </div>
              </div>
            ) : (
              <h4
                style={{
                  fontFamily: 'Times New Roman,serif',
                  textAlign: 'center',
                  margin: '2px 0',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {type === 'honorarium'
                  ? 'DAILY TIME RECORD - HONORARIUM'
                  : type === 'overtime'
                    ? 'DAILY TIME RECORD - OVERTIME'
                    : 'DAILY TIME RECORD'}
              </h4>
            )}
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
                  borderBottom: '1px solid black',
                  width: '100%',
                  margin: '2px 0 3px 0',
                }}
              />
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  fontFamily: 'Times New Roman',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {headerNameDisplay}
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
            style={{ padding: '2px 5px', lineHeight: '1.1', textAlign: 'left' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5px',
                fontFamily: 'Times New Roman,serif',
                fontSize: '10px',
              }}
            >
              <span style={{ marginRight: '6px' }}>Covered Dates:</span>
              <div
                style={{
                  fontWeight: 'bold',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontFamily: 'Times New Roman,serif',
                }}
              >
                {formattedStartDate} - {formattedEndDate}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            style={{ padding: '2px 5px', lineHeight: '1.2', textAlign: 'left' }}
          >
            <p
              style={{
                fontSize: '11px',
                margin: '0',
                paddingLeft: '5px',
                fontFamily: 'Times New Roman,serif',
              }}
            >
              For the month of: <b>{startDate ? formatMonth(startDate) : ''}</b>
            </p>
          </td>
        </tr>
        <tr>
          <td
            colSpan="7"
            style={{
              padding: '8px 5px 2px 5px',
              textAlign: 'left',
              fontSize: '10px',
              fontFamily: 'Arial,serif',
              lineHeight: '1.2',
            }}
          >
            Official hours for arrival (regular day) and departure
          </td>
        </tr>
        {Array.from({ length: 6 }, (_, i) => (
          <tr key={`e1-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        <tr>
          <td colSpan="7" style={{ padding: '2px 5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5%',
                minHeight: regularBlockMinH,
                fontFamily: 'Arial,serif',
                fontSize: '10px',
              }}
            >
              <span
                style={{ marginRight: '5px', flexShrink: 0, lineHeight: 1.2 }}
              >
                Regular Days:
              </span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1px solid black',
                  flexGrow: 1,
                  minWidth: '300px',
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
          <tr key={`e2-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        <tr>
          <td colSpan="7" style={{ padding: '2px 5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: '5%',
                minHeight:
                  showOfficialTimeOnDtr && saturdayOfficialText ? 26 : 20,
                fontFamily: 'Arial,serif',
                fontSize: '10px',
              }}
            >
              <span
                style={{ marginRight: '5px', flexShrink: 0, lineHeight: 1.2 }}
              >
                Saturdays:
              </span>
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: '1px solid black',
                  flexGrow: 1,
                  minWidth: '318px',
                  marginBottom: '2px',
                  paddingLeft: '4px',
                  paddingBottom: '1px',
                  fontSize: saturdayOfficialText ? '9px' : '10px',
                  lineHeight: 1.25,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {saturdayOfficialText}
              </span>
            </div>
          </td>
        </tr>
        {Array.from({ length: 2 }, (_, i) => (
          <tr key={`e3-${i}`}>
            <td colSpan="7"></td>
          </tr>
        ))}

        <tr>
          <th
            rowSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            DAY
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            A.M.
          </th>
          <th
            colSpan="2"
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            P.M.
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            Late
          </th>
          <th
            style={{
              border: '1px solid black',
              fontFamily: 'Arial,serif',
              fontSize: fs,
            }}
          >
            Undertime
          </th>
        </tr>
        <tr style={{ textAlign: 'center' }}>
          {['Arrival', 'Departure', 'Arrival', 'Departure', 'Min', 'Min'].map(
            (lbl, i) => (
              <td
                key={i}
                style={{
                  border: '1px solid black',
                  fontSize: '9px',
                  fontFamily: 'Arial,serif',
                }}
              >
                {lbl}
              </td>
            ),
          )}
        </tr>
      </thead>
    );
  };

  const renderDTRFooter = () => (
    <tr>
      <td colSpan="7" style={{ padding: '10px 5px' }}>
        <hr style={{ borderTop: '1px solid black', width: '100%' }} />
        <p
          style={{
            textAlign: 'justify',
            fontSize: '9px',
            lineHeight: '1.4',
            fontFamily: 'Times New Roman,serif',
            margin: '5px 0',
          }}
        >
          I CERTIFY on my honor that the above is a true and correct report
          <br />
          of the hours of work performed, record of which was made daily at
          <br />
          the time of arrival and at the time of departure from office.
        </p>
        <div
          style={{
            width: '50%',
            marginLeft: 'auto',
            textAlign: 'center',
            marginTop: '40px',
          }}
        >
          <hr style={{ borderTop: '1px solid black', margin: 0 }} />
          <p
            style={{
              fontSize: '9px',
              fontFamily: 'Arial,serif',
              margin: '5px 0 0 0',
            }}
          >
            Signature
          </p>
        </div>
        <div style={{ width: '100%', marginTop: '15px' }}>
          <hr
            style={{ borderTop: '1px solid black', width: '100%', margin: 0 }}
          />
          <hr
            style={{
              borderTop: '1px solid black',
              width: '100%',
              margin: '2px 0 0 0',
            }}
          />
          <p
            style={{
              paddingLeft: '30px',
              fontSize: '9px',
              fontFamily: 'Arial,serif',
              margin: '5px 0 0 0',
            }}
          >
            Verified as to prescribed office hours.
          </p>
        </div>
        <div
          style={{
            width: '80%',
            marginLeft: 'auto',
            marginTop: '15px',
            textAlign: 'center',
          }}
        >
          <hr style={{ borderTop: '1px solid black', margin: 0 }} />
          <p
            style={{
              fontSize: '9px',
              fontFamily: 'Times New Roman,serif',
              margin: '2px 0 0 0',
            }}
          >
            In-Charge
          </p>
          <p
            style={{ fontSize: '9px', fontFamily: 'Arial,serif', margin: '0' }}
          >
            (Signature Over Printed Name)
          </p>
        </div>
      </td>
    </tr>
  );

  const renderDtrAmPmWatermarkCell = (
    rawVal,
    displayText,
    rowTint,
    indicator,
    colKey,
  ) => {
    const { text, isWatermark } = resolveDtrAmPmCellText(
      rawVal,
      displayText,
      indicator,
    );
    return (
      <td
        key={colKey}
        style={{
          ...cellStyle,
          backgroundColor: rowTint,
          verticalAlign: 'middle',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <span style={isWatermark ? DTR_WM_INLINE_STYLE : undefined}>{text}</span>
      </td>
    );
  };

  const renderDTRRows = (
    sourceRecords,
    type,
    empNumber = null,
    officialTimes = {},
  ) =>
    Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const day = (i + 1).toString().padStart(2, '0');
      const record = sourceRecords.find((r) => recordMatchesDay(r, day));
      let fullDate = null;
      if (record?.date) fullDate = normRecordYmd(record.date);
      else if (startDate) {
        const [y, m] = startDate.split('-');
        fullDate = `${y}-${m}-${day}`;
      } else if (selectedMonth !== null) {
        fullDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${day}`;
      }
      const indicator = getDateIndicator(fullDate);
      const tf = getTimeFields(record, type);
      const rt = getRenderedTimeData(record, type);
      const rowTint = indicator
        ? indicator.bgColor.replace(/,\s*[\d.]+\)$/i, ', 0.08)')
        : 'transparent';
      const empKey = empNumber != null ? String(empNumber) : '';
      const computed =
        empKey && fullDate ? computedLateForEmployee[fullDate] || null : null;
      const isExcludedDay =
        indicator?.type === 'holiday' ||
        indicator?.type === 'suspension' ||
        indicator?.type === 'leave';
      const hasIncompletePunch = Boolean(
        record &&
        ((dtrRawEmpty(record?.timeIN) && !dtrRawEmpty(record?.timeOUT)) ||
          (!dtrRawEmpty(record?.timeIN) && dtrRawEmpty(record?.timeOUT))),
      );
      const isNotScheduledDay = !isDtrDateScheduledByOfficialTime({
        record,
        officialTimesByDay: officialTimes,
        fullDate,
      });
      const hasPeriodRecords = Array.isArray(sourceRecords) && sourceRecords.length > 0;
      const isPendingHalfDay = isDtrHalfDayLateUndertimePending({
        record,
        fullDate,
        reviewByDate: halfDayReviewByDate,
        moduleType: computationModuleType || MODULE_TYPES.NON_TEACHING,
      });
      const { lateDisplay, undertimeDisplay } =
        type !== 'regular'
          ? { lateDisplay: '', undertimeDisplay: '' }
          : resolveDtrLateUndertimeDisplay({
              computed,
              record: {
                ...record,
                hours: record?.hours || rt.hours,
                minutes: record?.minutes || rt.minutes,
              },
              isExcludedDay,
              hasIncompletePunch,
              isNotScheduledDay,
              isPendingHalfDay,
            });
      void halfDayDatesSet;
      const nonWorkingRowTint =
        isNotScheduledDay && !indicator
          ? 'rgba(128, 128, 128, 0.06)'
          : rowTint;
      if (isDtrCalendarBannerRow(indicator)) {
        return (
          <tr key={i}>
            <td
              style={{
                ...cellStyle,
                backgroundColor: rowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                backgroundColor: rowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={DTR_WM_INLINE_STYLE}>{indicator.label}</span>
            </td>
          </tr>
        );
      }
      if (
        isDtrNonWorkingDayRow({
          isNotScheduledDay,
          indicator,
          timeFields: tf,
          hasPeriodRecords,
        })
      ) {
        return (
          <tr key={i}>
            <td
              style={{
                ...cellStyle,
                backgroundColor: nonWorkingRowTint,
                position: 'relative',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
            </td>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                backgroundColor: nonWorkingRowTint,
                textAlign: 'center',
                verticalAlign: 'middle',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <span style={DTR_WM_INLINE_STYLE}>{DTR_NON_WORKING_DAY_LABEL}</span>
            </td>
          </tr>
        );
      }
      return (
        <tr key={i}>
          <td
            style={{
              ...cellStyle,
              backgroundColor: rowTint,
              position: 'relative',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{day}</div>
          </td>
          {type === 'regular' ? (
            <>
              {renderDtrAmPmWatermarkCell(
                tf.timeIN,
                formatTime(tf.timeIN || ''),
                rowTint,
                indicator,
                `r-${i}-0`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.breaktimeIN,
                formatTime(tf.breaktimeIN || ''),
                rowTint,
                indicator,
                `r-${i}-1`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.breaktimeOUT,
                formatTime(tf.breaktimeOUT || ''),
                rowTint,
                indicator,
                `r-${i}-2`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.timeOUT,
                formatTime(tf.timeOUT || ''),
                rowTint,
                indicator,
                `r-${i}-3`,
              )}
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span>{lateDisplay}</span>
              </td>
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span>{undertimeDisplay}</span>
              </td>
            </>
          ) : (
            <>
              {renderDtrAmPmWatermarkCell(
                tf.timeIN,
                formatTime(tf.timeIN || ''),
                rowTint,
                indicator,
                `o-${i}-0`,
              )}
              {renderDtrAmPmWatermarkCell(
                null,
                '',
                rowTint,
                indicator,
                `o-${i}-1`,
              )}
              {renderDtrAmPmWatermarkCell(
                null,
                '',
                rowTint,
                indicator,
                `o-${i}-2`,
              )}
              {renderDtrAmPmWatermarkCell(
                tf.timeOUT,
                formatTime(tf.timeOUT || ''),
                rowTint,
                indicator,
                `o-${i}-3`,
              )}
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span></span>
              </td>
              <td
                style={{
                  ...cellStyle,
                  backgroundColor: rowTint,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <span></span>
              </td>
            </>
          )}
        </tr>
      );
    });

  return (
    <div
      style={{
        display: 'flex',
        gap: '2%',
        width: DTR_WIDTH_IN,
        minWidth: '8.5in',
        margin: '0 auto',
        backgroundColor: 'white',
        position: 'relative',
        zIndex: 1,
      }}
      className="table-side-by-side"
    >
      {[0, 1].map((tIdx) => (
        <table
          key={tIdx}
          style={{
            position: 'relative',
            border: '1px solid black',
            borderCollapse: 'collapse',
            width: '49%',
            tableLayout: 'fixed',
          }}
          className="print-visible"
        >
          <DTRColGroup />
          {renderDTRHeader(nameDisplay, dtrType, officialTimesForUser)}
          <tbody>
            {renderDTRRows(
              records,
              dtrType,
              employeeNumber,
              officialTimesForUser,
            )}
            {renderDTRFooter()}
          </tbody>
        </table>
      ))}
    </div>
  );
}
