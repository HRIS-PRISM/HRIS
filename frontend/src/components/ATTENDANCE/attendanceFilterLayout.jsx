import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  alpha,
  Chip,
} from '@mui/material';
import { FilterList, CalendarToday, PersonSearch } from '@mui/icons-material';

/** Shared theme tokens for attendance filter panels (matches AttendanceDevice). */
export const FILTER_T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  divider: 'rgba(0,0,0,0.08)',
};

export const MONTHS_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const filterScrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: FILTER_T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

export const filterCompactSelectSx = {
  borderRadius: '8px',
  fontSize: '0.76rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: FILTER_T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: FILTER_T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: FILTER_T.accent,
    borderWidth: '1.5px',
  },
  '& .MuiSelect-select': { py: '5px !important', fontSize: '0.76rem' },
};

/** Leaves room for app chrome + fixed footer when attendance pages scroll */
export const ATTENDANCE_PAGE_BOTTOM_PAD = { xs: 8, md: 10 };

/** Outer wrapper for viewport-locked pages — same width/position as before, no extra bottom pad. */
export const ATTENDANCE_COMPACT_PAGE_SX = {
  py: { xs: 1, md: 2 },
  mt: { xs: 0, md: -2 },
  mb: { xs: 1, md: 2 },
  width: '100vw',
  maxWidth: '100%',
  position: 'relative',
  left: '63%',
  transform: 'translateX(-61%)',
  px: { xs: 2, sm: 3, md: 6 },
};

/** Prevent page scroll on compact attendance layouts; panels scroll internally. */
export function useAttendanceCompactPage() {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      if (!prevHtml) document.documentElement.style.removeProperty('overflow');
      if (!prevBody) document.body.style.removeProperty('overflow');
    };
  }, []);
}

/** Keeps document scroll on attendance module pages (matches DTR pages). */
export const ATTENDANCE_PAGE_SCROLL_CSS = `
  html { overflow-y: auto; }
  body { min-height: 100vh; }
`;

/** Clear body scroll lock left by LoadingOverlay after fetch / when results appear. */
export function useAttendancePageScroll(loading, hasResults = false) {
  const unlockScroll = () => {
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  };

  useEffect(() => {
    if (!loading) unlockScroll();
  }, [loading]);

  useEffect(() => {
    if (hasResults) unlockScroll();
  }, [hasResults]);

  useEffect(() => () => unlockScroll(), []);
}

export const filterSidebarCardSx = {
  height: { xs: 'auto', lg: 'calc(100vh - 280px)' },
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const attendanceMainPanelHeightSx = {
  height: { xs: 'auto', lg: 'calc(100vh - 280px)' },
};

export const filterPanelBoxSx = {
  px: 2,
  py: 1,
  flexGrow: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

export const filterPanelScrollSx = {
  ...filterPanelBoxSx,
  overflowY: 'auto',
  ...filterScrollbarSx,
};

/** Standard "Attendance Filter" card header */
export const AttendanceFilterHeader = ({ title = 'Attendance Filter' }) => (
  <Box
    sx={{
      px: 2,
      py: 1,
      borderBottom: `1px solid ${FILTER_T.divider}`,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      bgcolor: FILTER_T.accentFaint,
      flexShrink: 0,
    }}
  >
    <FilterList sx={{ fontSize: 13, color: FILTER_T.accent }} />
    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: FILTER_T.accent }}>
      {title}
    </Typography>
  </Box>
);

/** Prominent employee search block — Step 1 before month/date filters */
export const AttendanceEmployeeSearchSection = ({ children, selected = false, sx = {} }) => (
  <Box
    sx={{
      mb: 1,
      p: 1.25,
      borderRadius: '12px',
      border: `2px solid ${selected ? FILTER_T.accent : alpha(FILTER_T.accent, 0.35)}`,
      bgcolor: selected ? alpha(FILTER_T.accent, 0.04) : alpha(FILTER_T.accent, 0.09),
      boxShadow: selected
        ? `inset 0 0 0 1px ${alpha(FILTER_T.accent, 0.08)}`
        : `0 0 0 4px ${alpha(FILTER_T.accent, 0.06)}`,
      ...sx,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Box
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: '5px',
            bgcolor: FILTER_T.accent,
            color: '#FEF9E1',
            fontSize: '0.58rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          STEP 1
        </Box>
        <PersonSearch sx={{ fontSize: 16, color: FILTER_T.accent, flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, color: FILTER_T.accent }}>
          Find Employee
        </Typography>
      </Box>
      {selected && (
        <Chip
          label="Selected"
          size="small"
          sx={{
            height: 22,
            fontSize: '0.62rem',
            fontWeight: 700,
            bgcolor: alpha('#2e7d32', 0.12),
            color: '#2e7d32',
            border: `1px solid ${alpha('#2e7d32', 0.25)}`,
          }}
        />
      )}
    </Box>
    <Typography sx={{ fontSize: '0.64rem', color: FILTER_T.muted, mb: 1, lineHeight: 1.45 }}>
      Search by name or employee number first. Use arrow keys and press Enter to select.
    </Typography>
    {children}
  </Box>
);

/** Compact section label */
export const AttendanceFilterSectionLabel = ({ icon: Icon, children, sx = {} }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, ...sx }}>
    <Icon sx={{ fontSize: 10, color: alpha(FILTER_T.accent, 0.45) }} />
    <Typography
      sx={{
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: alpha(FILTER_T.accent, 0.45),
      }}
    >
      {children}
    </Typography>
  </Box>
);

/** Native year dropdown — Device style */
export const AttendanceFilterYearSelect = ({
  value,
  onChange,
  yearOptions,
  sx = {},
}) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: '100%',
      padding: '5px 8px',
      borderRadius: '6px',
      border: `1px solid ${FILTER_T.accentBorder}`,
      fontSize: '0.74rem',
      outline: 'none',
      fontFamily: 'inherit',
      background: '#fff',
      color: FILTER_T.text,
      cursor: 'pointer',
      ...sx,
    }}
  >
    {yearOptions.map((y) => (
      <option key={y} value={y}>{y}</option>
    ))}
  </select>
);

const QUICK_DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last15', label: 'Last 15 Days' },
  { value: 'last30', label: 'Last 30 Days' },
];

/** Quick dates MUI Select */
export const AttendanceFilterQuickSelect = ({ onChange, value = '' }) => (
  <FormControl size="small" fullWidth>
    <Select
      value={value}
      displayEmpty
      onChange={(e) => onChange(e.target.value)}
      sx={{
        ...filterCompactSelectSx,
        '& .MuiSelect-select': { py: '5px !important', fontSize: '0.72rem' },
      }}
      renderValue={() => 'Quick Dates'}
    >
      {QUICK_DATE_OPTIONS.map(({ value: v, label }) => (
        <MenuItem key={v} value={v} sx={{ fontSize: '0.76rem' }}>{label}</MenuItem>
      ))}
    </Select>
  </FormControl>
);

/** Year + Quick dates side by side */
export const AttendanceFilterYearQuickRow = ({
  selectedYear,
  onYearChange,
  yearOptions,
  onQuickDate,
  quickValue = '',
}) => (
  <Box sx={{ display: 'flex', gap: '6px', mb: 1 }}>
    <Box sx={{ flex: 1 }}>
      <AttendanceFilterSectionLabel icon={CalendarToday}>Year</AttendanceFilterSectionLabel>
      <AttendanceFilterYearSelect
        value={selectedYear}
        onChange={onYearChange}
        yearOptions={yearOptions}
      />
    </Box>
    <Box sx={{ flex: 1 }}>
      <AttendanceFilterSectionLabel icon={CalendarToday}>Quick</AttendanceFilterSectionLabel>
      <AttendanceFilterQuickSelect onChange={onQuickDate} value={quickValue} />
    </Box>
  </Box>
);

/** Month label row with optional clear */
export const AttendanceFilterMonthHeader = ({ onClear, showClear = false }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <CalendarToday sx={{ fontSize: 10, color: alpha(FILTER_T.accent, 0.45) }} />
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: alpha(FILTER_T.accent, 0.45),
        }}
      >
        Month
      </Typography>
    </Box>
    {showClear && onClear && (
      <Box
        onClick={onClear}
        sx={{
          fontSize: '0.62rem',
          color: FILTER_T.accent,
          cursor: 'pointer',
          fontWeight: 700,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        Clear
      </Box>
    )}
  </Box>
);

/** Compact 4-column month grid — outlined default, contained when selected */
export const monthGridContainerSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '4px',
  mb: 1.25,
};

export const getMonthGridCellSx = (isSelected) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 26,
  height: 26,
  px: 0.4,
  borderRadius: '5px',
  cursor: 'pointer',
  boxSizing: 'border-box',
  border: `1px solid ${isSelected ? FILTER_T.accent : alpha(FILTER_T.accent, 0.38)}`,
  bgcolor: isSelected ? FILTER_T.accent : '#fff',
  transition: 'all 0.12s ease',
  '&:hover': isSelected
    ? { bgcolor: FILTER_T.accentDark }
    : { bgcolor: FILTER_T.accentFaint, borderColor: FILTER_T.accent },
});

export const monthGridLabelSx = (isSelected) => ({
  fontSize: '0.64rem',
  fontWeight: isSelected ? 700 : 600,
  color: isSelected ? '#fff' : FILTER_T.accent,
  lineHeight: 1,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  userSelect: 'none',
});

export const AttendanceFilterMonthGrid = ({
  months = MONTHS_SHORT,
  selectedMonth,
  onMonthClick,
  sx = {},
}) => (
  <Box sx={{ ...monthGridContainerSx, ...sx }}>
    {months.map((m, idx) => {
      const isSelected = selectedMonth === idx;
      const label = String(m).toUpperCase();
      return (
        <Box
          key={`${label}-${idx}`}
          onClick={() => onMonthClick(idx)}
          sx={getMonthGridCellSx(isSelected)}
        >
          <Typography sx={monthGridLabelSx(isSelected)}>
            {label}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

/** Compact summary box at bottom of filter panel */
export const AttendanceFilterSummaryBox = ({ title = 'Summary', primary, secondary }) => (
  <Box
    sx={{
      px: 1.25,
      py: 1,
      borderRadius: 1.5,
      bgcolor: FILTER_T.accentFaint,
      border: `1px solid ${FILTER_T.accentBorder}`,
    }}
  >
    <Typography
      sx={{
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: alpha(FILTER_T.accent, 0.65),
        mb: 0.3,
        lineHeight: 1,
      }}
    >
      {title}
    </Typography>
    {primary && (
      <Typography
        sx={{
          fontSize: '0.84rem',
          fontWeight: 800,
          color: FILTER_T.text,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {primary}
      </Typography>
    )}
    {secondary && (
      <Typography
        sx={{
          fontSize: '0.68rem',
          color: FILTER_T.muted,
          mt: 0.25,
          lineHeight: 1.2,
        }}
      >
        {secondary}
      </Typography>
    )}
  </Box>
);

/** Horizontal toggle pills (e.g. View Mode) */
export const AttendanceFilterToggleRow = ({ options, value, onChange }) => (
  <Box sx={{ display: 'flex', gap: '4px', mb: 1.25 }}>
    {options.map(({ val, label }) => {
      const isActive = value === val;
      return (
        <Box
          key={val}
          onClick={() => onChange(val)}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1,
            py: 0.6,
            borderRadius: '6px',
            cursor: 'pointer',
            border: `1px solid ${isActive ? FILTER_T.accent : FILTER_T.accentBorder}`,
            bgcolor: isActive ? FILTER_T.accent : 'transparent',
            transition: 'all 0.14s ease',
            '&:hover': isActive
              ? {}
              : { bgcolor: FILTER_T.accentFaint, border: `1px solid ${FILTER_T.accent}` },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#fff' : FILTER_T.text,
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {label}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

/** Full filter card body wrapper (for top-stacked filter cards) */
export const AttendanceFilterCardBody = ({ children, scroll = false }) => (
  <Box sx={scroll ? { ...filterPanelScrollSx, px: 2, py: 1 } : filterPanelBoxSx}>
    {children}
  </Box>
);

/** Apply quick date preset to start/end state setters */
export const applyQuickDateRange = (value, setStartDate, setEndDate, setSelectedMonth) => {
  if (!value) return;
  const today = new Date();
  const formattedToday = today.toISOString().substring(0, 10);
  const setRange = (s, e) => {
    setStartDate(s);
    setEndDate(e);
    if (setSelectedMonth) setSelectedMonth(null);
  };
  switch (value) {
    case 'today':
      setRange(formattedToday, formattedToday);
      break;
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = y.toISOString().substring(0, 10);
      setRange(s, s);
      break;
    }
    case 'last7': {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setRange(d.toISOString().substring(0, 10), formattedToday);
      break;
    }
    case 'last15': {
      const d = new Date(today);
      d.setDate(d.getDate() - 15);
      setRange(d.toISOString().substring(0, 10), formattedToday);
      break;
    }
    case 'last30': {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      setRange(d.toISOString().substring(0, 10), formattedToday);
      break;
    }
    default:
      break;
  }
};

/** Year + Quick + Month grid — standard date filter block */
export const AttendanceFilterDateControls = ({
  selectedYear,
  onYearChange,
  yearOptions,
  selectedMonth,
  onMonthClick,
  onMonthClear,
  onQuickDate,
  quickValue = '',
  months = MONTHS_SHORT,
}) => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.85 }}>
      <Box
        sx={{
          px: 0.75,
          py: 0.2,
          borderRadius: '5px',
          bgcolor: alpha(FILTER_T.accent, 0.12),
          color: FILTER_T.accent,
          fontSize: '0.58rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}
      >
        STEP 2
      </Box>
      <Typography sx={{ fontSize: '0.64rem', color: FILTER_T.muted, fontWeight: 600, lineHeight: 1.3 }}>
        Choose year and month after selecting an employee
      </Typography>
    </Box>
    <AttendanceFilterYearQuickRow
      selectedYear={selectedYear}
      onYearChange={onYearChange}
      yearOptions={yearOptions}
      onQuickDate={onQuickDate}
      quickValue={quickValue}
    />
    <AttendanceFilterMonthHeader
      onClear={onMonthClear}
      showClear={selectedMonth !== null && selectedMonth !== undefined}
    />
    <AttendanceFilterMonthGrid
      months={months}
      selectedMonth={selectedMonth}
      onMonthClick={onMonthClick}
    />
  </>
);
