// ─── PATCH NOTES ────────────────────────────────────────────────────────────
// 1. Academic Year auto-format: typing "2025" → blurs/Enter → "2025 - 2026"
// 2. View Schedule modal footer: removed Close button (left), moved Edit Schedule
//    button to the RIGHT side (alongside Save Changes / Close).
// 3. TimePickerField: segment-aware backspace/delete.
//    Cursor inside HH → only HH resets to "00"; inside MM → only MM; inside SS → only SS.
//    The rest of the time value is preserved.
// ────────────────────────────────────────────────────────────────────────────

import API_BASE_URL from '../../apiConfig';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import axios from 'axios';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useCRUDButtonStyles } from '../../hooks/useCRUDButtonStyles';

import {
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Avatar,
  Tooltip,
  Chip,
  Fade,
  Alert,
  useTheme,
  styled,
  Divider,
  CardHeader,
  Checkbox,
  Autocomplete,
  Select,
  MenuItem,
  Popover,
} from '@mui/material';
import { TablePagination } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Close,
  Schedule,
  UploadFile,
  FilterList,
  Person,
  AccessTime,
  CheckCircle,
  EventBusy,
  WarningAmber,
  Visibility,
  Add,
  Delete,
  ClearAll,
  Edit,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import CircularProgress from '@mui/material/CircularProgress';

// ─────────────────────────────────────────────────────────────────────────────
// TIME PICKER FIELD — segment-aware backspace/delete
// ─────────────────────────────────────────────────────────────────────────────

const _parseTimeString = (val) => {
  if (!val || String(val).trim() === '') return { digits: '', ampm: 'AM' };
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    const sec = match[3] || '00';
    return { digits: `${h}${m}${sec}`, ampm: (match[4] || 'AM').toUpperCase() };
  }
  return { digits: '', ampm: 'AM' };
};

// Format 6-digit string → "HH:MM:SS"
const _formatDigits = (d) => {
  // Always pad to 6 digits before slicing so every segment is exactly 2 chars.
  // Without this, a 5-digit string like "10000" produces "10:00:0" instead of "10:00:00".
  const clean = (d || '').replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
  if (!clean.replace(/0/g, '').length && (d || '') === '') return ''; // truly empty → show placeholder
  return `${clean.slice(0, 2)}:${clean.slice(2, 4)}:${clean.slice(4, 6)}`;
};

const _buildOutput = (digits, ampm) => {
  const clean = (digits || '').replace(/\D/g, '').padEnd(6, '0').slice(0, 6);
  return `${clean.slice(0, 2)}:${clean.slice(2, 4)}:${clean.slice(4, 6)} ${ampm}`;
};

const _HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
);
const _MINUTES = ['00', '15', '30', '45'];

const dedupeErrorMessages = (errors = [], primaryMessage = '') => {
  const primary = String(primaryMessage || '').trim();
  const seen = new Set();
  const out = [];

  for (const err of errors) {
    const msg = String(err?.message || '').trim();
    if (!msg) continue;
    if (primary && msg === primary) continue;
    if (seen.has(msg)) continue;
    seen.add(msg);
    out.push(err);
  }

  return out;
};

// Determine which segment (HH/MM/SS) a cursor position in "HH:MM:SS" belongs to.
// Returns 'hh' | 'mm' | 'ss'
const _segmentAtCursor = (cursorPos) => {
  // "HH:MM:SS"
  //  01 23 45 67  (index)
  if (cursorPos <= 2) return 'hh';
  if (cursorPos <= 5) return 'mm';
  return 'ss';
};

const TimePickerField = ({
  value,
  onChange,
  label,
  size = 'small',
  disabled = false,
  accentColor = '#6d2323',
}) => {
  const parsed = _parseTimeString(value);
  const [digits, setDigits] = useState(parsed.digits);
  const [ampm, setAmpm] = useState(parsed.ampm);
  const [anchorEl, setAnchorEl] = useState(null);
  const inputRef = useRef(null);
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      const p = _parseTimeString(value);
      setDigits(p.digits);
      setAmpm(p.ampm);
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emit = useCallback(
    (d, ap) => {
      const out = _buildOutput(d, ap);
      lastEmittedRef.current = out;
      onChange(out);
    },
    [onChange],
  );

  // ── Segment-aware keydown ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;

      const el = inputRef.current;
      if (!el) return;

      // cursor position in the *displayed* "HH:MM:SS" string
      const cursorPos = el.selectionStart ?? 0;
      const segment = _segmentAtCursor(cursorPos);

      // current digits (always 6 chars after padding)
      const d = (digits || '').replace(/\D/g, '').padEnd(6, '0').slice(0, 6);

      let newDigits;
      if (segment === 'hh') {
        newDigits = '00' + d.slice(2);
      } else if (segment === 'mm') {
        newDigits = d.slice(0, 2) + '00' + d.slice(4);
      } else {
        newDigits = d.slice(0, 4) + '00';
      }

      e.preventDefault(); // stop default which would clear whole field
      setDigits(newDigits);
      emit(newDigits, ampm);

      // Restore cursor to beginning of the cleared segment after re-render
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        const positions = { hh: 0, mm: 3, ss: 6 };
        const pos = positions[segment];
        inputRef.current.setSelectionRange(pos, pos + 2);
      });
    },
    [digits, ampm, emit],
  );

  const handleDigitInput = useCallback(
    (e) => {
      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
      setDigits(raw);
      emit(raw, ampm);
    },
    [ampm, emit],
  );

  const handleAmpmChange = useCallback(
    (e) => {
      const ap = e.target.value;
      setAmpm(ap);
      emit(digits, ap);
    },
    [digits, emit],
  );

  const handleClear = useCallback(() => {
    setDigits('');
    setAmpm('AM');
    lastEmittedRef.current = '';
    onChange('');
  }, [onChange]);

  const handleQuickPick = useCallback(
    (h, min, ap) => {
      const d = `${h}${min}00`;
      setDigits(d);
      setAmpm(ap);
      emit(d, ap);
      setAnchorEl(null);
    },
    [emit],
  );

  const displayValue = _formatDigits(digits);
  const isEmpty = digits === '' && (!value || value === '');

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 0.3, width: '100%' }}
    >
      <TextField
        inputRef={inputRef}
        size={size}
        label={label}
        placeholder="00:00:00"
        value={displayValue}
        onChange={handleDigitInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        inputProps={{ maxLength: 8 }}
        sx={{
          flex: 1,
          minWidth: 75,
          '& .MuiOutlinedInput-root': {
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            '&.Mui-focused fieldset': { borderColor: accentColor },
          },
          '& .MuiInputBase-input': {
            px: 1.25,
            py: 0.85,
            letterSpacing: '0.05em',
          },
          '& label.Mui-focused': { color: accentColor },
        }}
      />
      <Select
        size={size}
        value={ampm}
        onChange={handleAmpmChange}
        disabled={disabled}
        renderValue={(v) => v}
        sx={{
          fontSize: '0.78rem',
          fontWeight: 700,
          minWidth: 58,
          width: 58,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: accentColor,
          },
          color: ampm === 'AM' ? '#1565c0' : '#6d2323',
          '& .MuiSelect-select': { px: 1, py: 0.85, pr: '24px !important' },
          '& .MuiSelect-icon': { right: 2, fontSize: '1rem' },
        }}
      >
        <MenuItem
          value="AM"
          sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#1565c0' }}
        >
          AM
        </MenuItem>
        <MenuItem
          value="PM"
          sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#6d2323' }}
        >
          PM
        </MenuItem>
      </Select>
      <Tooltip title="Quick pick time">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              color: alpha(accentColor, 0.7),
              p: 0.5,
              '&:hover': {
                color: accentColor,
                bgcolor: alpha(accentColor, 0.08),
              },
            }}
          >
            <AccessTime fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {!isEmpty && (
        <Tooltip title="Clear time">
          <IconButton
            size="small"
            disabled={disabled}
            onClick={handleClear}
            sx={{
              color: alpha('#000', 0.35),
              p: 0.5,
              '&:hover': { color: '#c62828', bgcolor: alpha('#c62828', 0.08) },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disablePortal={false}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            border: `1px solid ${alpha(accentColor, 0.18)}`,
            p: 0,
            width: 300,
            maxWidth: 300,
            maxHeight: 340,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ bgcolor: accentColor, px: 2, py: 1, flexShrink: 0 }}>
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Quick Pick
          </Typography>
        </Box>
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {['AM', 'PM'].map((ap) => (
            <Box key={ap}>
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  bgcolor: ap === 'AM' ? '#e3f0fb' : '#f7f0f0',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: ap === 'AM' ? '#1565c0' : accentColor,
                    letterSpacing: '0.6px',
                  }}
                >
                  {ap}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '3px',
                  px: 1.25,
                  py: 0.75,
                }}
              >
                {_HOURS.map((h) =>
                  _MINUTES.map((min) => (
                    <Button
                      key={`${h}${min}${ap}`}
                      size="small"
                      onClick={() => handleQuickPick(h, min, ap)}
                      sx={{
                        minWidth: 0,
                        height: 26,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        px: 0,
                        borderRadius: 1,
                        textTransform: 'none',
                        bgcolor: alpha(
                          ap === 'AM' ? '#1565c0' : accentColor,
                          0.06,
                        ),
                        color: ap === 'AM' ? '#1565c0' : accentColor,
                        border: `1px solid ${alpha(ap === 'AM' ? '#1565c0' : accentColor, 0.18)}`,
                        '&:hover': {
                          bgcolor: alpha(
                            ap === 'AM' ? '#1565c0' : accentColor,
                            0.18,
                          ),
                          transform: 'scale(1.05)',
                        },
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {h}:{min}
                    </Button>
                  )),
                )}
              </Box>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            px: 2,
            py: 0.75,
            borderTop: `1px solid ${alpha(accentColor, 0.12)}`,
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
            bgcolor: '#fafafa',
          }}
        >
          <Button
            size="small"
            onClick={() => setAnchorEl(null)}
            sx={{
              fontSize: '0.72rem',
              color: '#555',
              textTransform: 'none',
              minWidth: 0,
              px: 1.5,
            }}
          >
            Close
          </Button>
        </Box>
      </Popover>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC YEAR FIELD — auto-format helper
// "2025" → "2025 - 2026"   |   "2025-2026" → "2025 - 2026"
// ─────────────────────────────────────────────────────────────────────────────

const autoFormatAcademicYear = (raw) => {
  if (!raw) return raw;
  const trimmed = raw.trim();

  // Already in "YYYY - YYYY" format → leave alone
  if (/^\d{4}\s*-\s*\d{4}$/.test(trimmed)) {
    // Normalise spacing
    return trimmed.replace(/\s*-\s*/, ' - ');
  }

  // Plain 4-digit year → append next year
  if (/^\d{4}$/.test(trimmed)) {
    const y = parseInt(trimmed, 10);
    return `${y} - ${y + 1}`;
  }

  return raw;
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

const formatDateOnly = (val) => {
  if (!val) return '—';
  const s = String(val);
  const dateOnly = s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateLong = (val) => {
  if (!val) return '';
  const s = String(val);
  const dateOnly = s.split('T')[0];
  let y, month, day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [yy, mm, dd] = dateOnly.split('-').map(Number);
    y = yy;
    day = dd;
    const months = [
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
    month = months[mm - 1] || '';
  } else {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return s;
    y = d.getFullYear();
    day = d.getDate();
    const months = [
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
    month = months[d.getMonth()] || '';
  }
  return month ? `${month} ${String(day).padStart(2, '0')}, ${y}` : String(val);
};

const normalizeDateStr = (val) => {
  if (!val) return '';
  const s = String(val).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
};

const parseTimeToMinutes = (str) => {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).trim();
  const match = s.match(
    /^\s*(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*\d{1,2})?\s*(AM|PM)\s*$/i,
  );
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  return hour * 60 + min;
};

const formatMinutesToTime = (m) => {
  if (m == null || m < 0 || m >= 24 * 60) return '';
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};

const getTimeSegmentsForRow = (row) => {
  const segments = [];
  const r = row || {};
  const timeIn = parseTimeToMinutes(r.officialTimeIN);
  const breakIn = parseTimeToMinutes(r.officialBreaktimeIN);
  const breakOut = parseTimeToMinutes(r.officialBreaktimeOUT);
  const timeOut = parseTimeToMinutes(r.officialTimeOUT);
  if (timeIn != null && timeOut != null && timeIn < timeOut) {
    if (
      breakIn != null &&
      breakOut != null &&
      breakIn > timeIn &&
      breakOut < timeOut &&
      breakIn < breakOut
    ) {
      if (timeIn < breakIn)
        segments.push({ start: timeIn, end: breakIn, label: 'Work Days' });
      if (breakOut < timeOut)
        segments.push({ start: breakOut, end: timeOut, label: 'Work Days' });
    } else {
      segments.push({ start: timeIn, end: timeOut, label: 'Work Days' });
    }
  }
  const honIn = parseTimeToMinutes(r.officialHonorariumTimeIN);
  const honOut = parseTimeToMinutes(r.officialHonorariumTimeOUT);
  if (
    honIn != null &&
    honOut != null &&
    honIn < honOut &&
    !(honIn === 0 && honOut === 12 * 60)
  )
    segments.push({ start: honIn, end: honOut, label: 'Honorarium' });
  const scIn = parseTimeToMinutes(r.officialServiceCreditTimeIN);
  const scOut = parseTimeToMinutes(r.officialServiceCreditTimeOUT);
  if (
    scIn != null &&
    scOut != null &&
    scIn < scOut &&
    !(scIn === 0 && scOut === 12 * 60)
  )
    segments.push({ start: scIn, end: scOut, label: 'Service Credits' });
  const otIn = parseTimeToMinutes(r.officialOverTimeIN);
  const otOut = parseTimeToMinutes(r.officialOverTimeOUT);
  if (
    otIn != null &&
    otOut != null &&
    otIn < otOut &&
    !(otIn === 0 && otOut === 12 * 60)
  )
    segments.push({ start: otIn, end: otOut, label: 'Overtime' });
  return segments;
};

const checkTimeOverlaps = (rows) => {
  if (!rows || !Array.isArray(rows)) return { valid: true };
  for (let i = 0; i < rows.length; i++) {
    const segments = getTimeSegmentsForRow(rows[i]);
    const day = rows[i].day || `Day ${i + 1}`;
    for (let a = 0; a < segments.length; a++) {
      for (let b = a + 1; b < segments.length; b++) {
        const sa = segments[a];
        const sb = segments[b];
        if (sa.start < sb.end && sb.start < sa.end) {
          return {
            valid: false,
            day,
            segmentA: { label: sa.label, start: sa.start, end: sa.end },
            segmentB: { label: sb.label, start: sb.start, end: sb.end },
          };
        }
      }
    }
  }
  return { valid: true };
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

const DAYS_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const makeDefaultRow = (employeeID, day) => ({
  employeeID,
  day,
  officialTimeIN: '08:00:00 AM',
  officialBreaktimeIN: '00:00:00 AM',
  officialBreaktimeOUT: '00:00:00 PM',
  officialTimeOUT: '05:00:00 PM',
  officialHonorariumTimeIN: '00:00:00 AM',
  officialHonorariumTimeOUT: '00:00:00 PM',
  officialServiceCreditTimeIN: '00:00:00 AM',
  officialServiceCreditTimeOUT: '00:00:00 AM',
  officialOverTimeIN: '00:00:00 AM',
  officialOverTimeOUT: '00:00:00 PM',
  breaktime: '',
});

const makeClearedRow = (employeeID, day) => ({
  employeeID,
  day,
  officialTimeIN: '',
  officialBreaktimeIN: '',
  officialBreaktimeOUT: '',
  officialTimeOUT: '',
  officialHonorariumTimeIN: '',
  officialHonorariumTimeOUT: '',
  officialServiceCreditTimeIN: '',
  officialServiceCreditTimeOUT: '',
  officialOverTimeIN: '',
  officialOverTimeOUT: '',
  breaktime: '',
});

// ─────────────────────────────────────────────────────────────────────────────
// DATA INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const computeChecksum = (data) => {
  const str = JSON.stringify(data);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { transform: 'translateY(-4px)' },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow:
    variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      variant === 'contained' ? '0 6px 20px rgba(254, 249, 225, 0.35)' : 'none',
  },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflow: 'auto',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
  maxHeight: '600px',
  '&::-webkit-scrollbar': { width: '8px', height: '8px' },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(254, 249, 225, 0.3)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(109, 35, 35, 0.4)',
    borderRadius: '4px',
    '&:hover': { background: 'rgba(109, 35, 35, 0.6)' },
  },
}));

const PremiumTableCell = styled(TableCell)(({ isHeader }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: '18px 20px',
  borderBottom: isHeader
    ? '2px solid rgba(254, 249, 225, 0.5)'
    : '1px solid rgba(109, 35, 35, 0.06)',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  minWidth: '120px',
  whiteSpace: 'nowrap',
}));

// ─────────────────────────────────────────────────────────────────────────────
// TAMPER WARNING BANNER
// ─────────────────────────────────────────────────────────────────────────────

const TamperWarningBanner = ({ onRestore }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      bgcolor: '#7a0000',
      color: '#fff',
      px: 3,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      borderBottom: '3px solid #ff4444',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <WarningAmber sx={{ color: '#ffd180', fontSize: 22 }} />
      <Box>
        <Typography
          sx={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.2 }}
        >
          ⚠ Data Tampering Detected
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', opacity: 0.85, mt: 0.25 }}>
          Schedule data was modified outside the application. Displaying last
          verified data from server.
        </Typography>
      </Box>
    </Box>
    <Button
      variant="outlined"
      size="small"
      onClick={onRestore}
      sx={{
        borderColor: '#ffd180',
        color: '#ffd180',
        fontWeight: 700,
        textTransform: 'none',
        fontSize: '0.8rem',
        flexShrink: 0,
        ml: 2,
        '&:hover': {
          bgcolor: 'rgba(255,209,128,0.15)',
          borderColor: '#ffd180',
        },
      }}
    >
      Restore from Server
    </Button>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// VIEW MODE TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

const ViewToggle = ({
  value,
  onChange,
  accentColor,
  primaryColor,
  textPrimaryColor,
}) => {
  const options = [
    {
      key: 'single',
      label: 'Single Employee',
      icon: <Person sx={{ fontSize: 18 }} />,
    },
    {
      key: 'allUsers',
      label: 'All Users',
      icon: <PeopleIcon sx={{ fontSize: 18 }} />,
    },
  ];
  return (
    <Box
      sx={{
        display: 'flex',
        border: `2px solid ${alpha(accentColor, 0.3)}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: alpha(accentColor, 0.05),
      }}
    >
      {options.map(({ key, label, icon }) => {
        const active = value === key;
        return (
          <Button
            key={key}
            onClick={() => onChange(key)}
            startIcon={icon}
            disableElevation
            sx={{
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: active ? 700 : 500,
              fontSize: '0.88rem',
              px: 2.5,
              py: 1.2,
              bgcolor: active ? accentColor : 'transparent',
              color: active ? primaryColor : textPrimaryColor,
              borderRight:
                key === 'single'
                  ? `1px solid ${alpha(accentColor, 0.25)}`
                  : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: active ? accentColor : alpha(accentColor, 0.12),
              },
            }}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE TIME TABLE ROWS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ScheduleTimeRows = ({
  records,
  onChangeRecord,
  scheduleView,
  readOnly = false,
}) => {
  const TIME_FIELDS = {
    workDays: [
      { key: 'officialTimeIN', label: 'Time In' },
      { key: 'officialBreaktimeIN', label: 'Break In' },
      { key: 'officialBreaktimeOUT', label: 'Break Out' },
      { key: 'officialTimeOUT', label: 'Time Out' },
    ],
    honorarium: [
      { key: 'officialHonorariumTimeIN', label: 'Honorarium In' },
      { key: 'officialHonorariumTimeOUT', label: 'Honorarium Out' },
    ],
    serviceCredits: [
      { key: 'officialServiceCreditTimeIN', label: 'Service Credit In' },
      { key: 'officialServiceCreditTimeOUT', label: 'Service Credit Out' },
    ],
    overtime: [
      { key: 'officialOverTimeIN', label: 'Overtime In' },
      { key: 'officialOverTimeOUT', label: 'Overtime Out' },
    ],
  };
  const fields = TIME_FIELDS[scheduleView] || TIME_FIELDS.workDays;
  return (
    <>
      <TableHead>
        <TableRow sx={{ bgcolor: '#6d2323' }}>
          <TableCell
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.8rem',
              py: 1.25,
              width: 100,
            }}
          >
            Day
          </TableCell>
          {fields.map((f) => (
            <TableCell
              key={f.key}
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 1.25,
                minWidth: 200,
              }}
            >
              {f.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map((record, index) => (
          <TableRow
            key={record.day || index}
            sx={{
              '&:nth-of-type(even)': { bgcolor: '#faf5f5' },
              '&:hover': { bgcolor: '#f5ecec' },
            }}
          >
            <TableCell
              sx={{
                fontWeight: 600,
                color: '#1a1a1a',
                fontSize: '0.85rem',
                py: 0.75,
              }}
            >
              {record.day}
            </TableCell>
            {fields.map((f) => (
              <TableCell key={f.key} sx={{ py: 0.6, minWidth: 200 }}>
                {readOnly ? (
                  <Typography
                    sx={{
                      color: '#1a1a1a',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {record[f.key] || '—'}
                  </Typography>
                ) : (
                  <TimePickerField
                    value={record[f.key] || ''}
                    onChange={(val) => onChangeRecord(index, f.key, val)}
                    accentColor="#6d2323"
                  />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const OfficialTimeForm = () => {
  const { settings } = useSystemSettings();

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6D2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6D2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';

  const { hasAccess, loading: accessLoading } = usePageAccess('official-time');

  const [viewMode, setViewMode] = useState('single');
  const showSingleView = viewMode === 'single';
  const showAllUsers = viewMode === 'allUsers';
  const setShowAllUsers = useCallback((val) => {
    setViewMode(
      typeof val === 'function'
        ? (prev) => (val(prev === 'allUsers') ? 'allUsers' : 'single')
        : val
          ? 'allUsers'
          : 'single',
    );
  }, []);

  const [employeeID, setEmployeeID] = useState('');
  const [records, setRecords] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [found, setFound] = useState(false);

  const [file, setFile] = useState(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [previewViewScheduleView, setPreviewViewScheduleView] =
    useState('workDays');

  const [checkingOverlap, setCheckingOverlap] = useState(false);

  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const saveInFlightRef = useRef(false);

  const serverRecordsRef = useRef([]);
  const checksumRef = useRef(null);
  const [tamperDetected, setTamperDetected] = useState(false);
  const tamperCheckIntervalRef = useRef(null);

  const stampServerRecords = useCallback((data) => {
    const clean = deepClone(data);
    serverRecordsRef.current = clean;
    checksumRef.current = computeChecksum(clean);
    setTamperDetected(false);
  }, []);

  const runIntegrityCheck = useCallback((liveRecords) => {
    if (!checksumRef.current || !serverRecordsRef.current.length) return;
    const liveChecksum = computeChecksum(liveRecords);
    if (liveChecksum !== checksumRef.current) {
      setTamperDetected(true);
      setRecords(deepClone(serverRecordsRef.current));
    }
  }, []);

  useEffect(() => {
    if (tamperCheckIntervalRef.current)
      clearInterval(tamperCheckIntervalRef.current);
    if (!serverRecordsRef.current.length) return;
    tamperCheckIntervalRef.current = setInterval(() => {
      setRecords((current) => {
        runIntegrityCheck(current);
        return current;
      });
    }, 3000);
    return () => clearInterval(tamperCheckIntervalRef.current);
  }, [runIntegrityCheck]);

  const handleRestoreFromServer = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/officialtimetable/${trimmedId}`,
        getAuthHeaders(),
      );
      const fresh =
        res.data.length > 0 ? res.data : buildDefaultRecords(trimmedId);
      stampServerRecords(fresh);
      setRecords(deepClone(fresh));
      setFound(res.data.length > 0);
    } catch (err) {
      console.error('Restore failed:', err);
    } finally {
      setLoading(false);
      setTamperDetected(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeID]);

  const allUsers_state = useState([]);
  const [allUsers, setAllUsers] = allUsers_state;
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsersPage, setAllUsersPage] = useState(0);
  const [allUsersRowsPerPage, setAllUsersRowsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [settingDefault, setSettingDefault] = useState(false);

  const [draftAcademicYear, setDraftAcademicYear] = useState('');
  const [draftSemester, setDraftSemester] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftStatus, setDraftStatus] = useState('active');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalRecords, setModalRecords] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningOverlap, setWarningOverlap] = useState(null);
  const [isBulkSchedule, setIsBulkSchedule] = useState(false);
  const [bulkScheduleBlocks, setBulkScheduleBlocks] = useState([]);
  const [bulkTargetEmployees, setBulkTargetEmployees] = useState([]);
  const [showBulkBlocksModal, setShowBulkBlocksModal] = useState(false);
  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [viewScheduleInfo, setViewScheduleInfo] = useState(null);
  const [viewScheduleRecords, setViewScheduleRecords] = useState([]);
  const [scheduleView, setScheduleView] = useState('workDays');
  const [viewScheduleView, setViewScheduleView] = useState('workDays');
  const [viewScheduleEmployeeName, setViewScheduleEmployeeName] = useState('');

  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [pendingBulkSubmit, setPendingBulkSubmit] = useState(false);

  const [isEditingViewSchedule, setIsEditingViewSchedule] = useState(false);
  const [editViewRecords, setEditViewRecords] = useState([]);
  const [editViewScheduleView, setEditViewScheduleView] = useState('workDays');
  const [editViewSaving, setEditViewSaving] = useState(false);
  const [editViewEndDate, setEditViewEndDate] = useState('');

  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadAcknowledgeChecked, setUploadAcknowledgeChecked] =
    useState(false);

  // ── helpers ───────────────────────────────────────────────────────────────

  const showToast = useCallback((msg) => {
    setSuccessAction(msg);
    setSuccessOpen(true);
    setTimeout(() => setSuccessOpen(false), 3000);
  }, []);

  const buildDefaultRecords = useCallback(
    (empId) => DAYS_ORDER.map((day) => makeDefaultRow(empId, day)),
    [],
  );

  const resolveEmployeeName = useCallback(
    (empId) => {
      const found = allUsers.find(
        (u) => String(u.employeeNumber) === String(empId),
      );
      return found?.fullName || '';
    },
    [allUsers],
  );

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/officialtime/users-status`,
        getAuthHeaders(),
      );
      setAllUsers(response.data || []);
      setAllUsersPage(0);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Error fetching users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  const handleClearModalTimes = useCallback(() => {
    const fieldsByView = {
      workDays: [
        'officialTimeIN',
        'officialBreaktimeIN',
        'officialBreaktimeOUT',
        'officialTimeOUT',
      ],
      honorarium: ['officialHonorariumTimeIN', 'officialHonorariumTimeOUT'],
      serviceCredits: [
        'officialServiceCreditTimeIN',
        'officialServiceCreditTimeOUT',
      ],
      overtime: ['officialOverTimeIN', 'officialOverTimeOUT'],
    };
    const fields = fieldsByView[scheduleView] || [];
    setModalRecords((prev) =>
      prev.map((row) => {
        const updated = { ...row };
        fields.forEach((f) => {
          updated[f] = '';
        });
        return updated;
      }),
    );
  }, [scheduleView]);

  const handleResetModalToDefault = useCallback(() => {
    const trimmedId = String(employeeID || '').trim();
    setModalRecords(DAYS_ORDER.map((day) => makeDefaultRow(trimmedId, day)));
  }, [employeeID]);

  const handleStartEditViewSchedule = useCallback(() => {
    setEditViewRecords(deepClone(viewScheduleRecords));
    setEditViewScheduleView(viewScheduleView);
    setEditViewEndDate(normalizeDateStr(viewScheduleInfo?.endDate) || '');
    setIsEditingViewSchedule(true);
  }, [viewScheduleRecords, viewScheduleView, viewScheduleInfo]);

  const handleCancelEditViewSchedule = useCallback(() => {
    setIsEditingViewSchedule(false);
    setEditViewRecords([]);
    setEditViewEndDate('');
  }, []);

  const handleSaveEditedSchedule = useCallback(async () => {
    if (!viewScheduleInfo) return;
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) {
      showToast('Employee ID is missing.');
      return;
    }

    const newEndDate =
      editViewEndDate || normalizeDateStr(viewScheduleInfo.endDate);
    const origStartDate = normalizeDateStr(viewScheduleInfo.startDate);
    if (newEndDate && origStartDate && newEndDate < origStartDate) {
      showToast('End date cannot be before start date.');
      return;
    }

    const overlapResult = checkTimeOverlaps(editViewRecords);
    if (!overlapResult.valid) {
      const a = overlapResult.segmentA;
      const b = overlapResult.segmentB;
      setWarningMessage(
        `Time overlap on ${overlapResult.day}: ${a.label} (${formatMinutesToTime(a.start)} – ${formatMinutesToTime(a.end)}) overlaps with ${b.label} (${formatMinutesToTime(b.start)} – ${formatMinutesToTime(b.end)}). Please adjust the schedule so times do not overlap.`,
      );
      setWarningOverlap(overlapResult.overlap || null);
      setShowWarningModal(true);
      return;
    }

    setEditViewSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/officialtimetable/${trimmedId}`,
        {
          startDate: viewScheduleInfo.startDate,
          endDate: newEndDate || viewScheduleInfo.endDate,
          origEndDate: normalizeDateStr(viewScheduleInfo.endDate),
          records: editViewRecords,
        },
        getAuthHeaders(),
      );
      showToast('Official time updated successfully.');
      setIsEditingViewSchedule(false);
      setEditViewRecords([]);
      setEditViewEndDate('');

      const res = await axios.get(
        `${API_BASE_URL}/officialtimetable/${trimmedId}`,
        getAuthHeaders(),
      );
      const allRows = res.data || [];
      stampServerRecords(allRows);
      setRecords(deepClone(allRows));
      setFound(allRows.length > 0);

      const normStart = normalizeDateStr(viewScheduleInfo.startDate);
      const normEnd = normalizeDateStr(newEndDate || viewScheduleInfo.endDate);
      const updatedRows = allRows.filter(
        (r) =>
          normalizeDateStr(r.startDate) === normStart &&
          normalizeDateStr(r.endDate) === normEnd,
      );
      setViewScheduleRecords(updatedRows);
      setViewScheduleInfo((prev) =>
        prev ? { ...prev, endDate: newEndDate || prev.endDate } : prev,
      );
    } catch (err) {
      console.error('Error updating official time:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Error updating schedule.';
      setWarningMessage(msg);
      setWarningOverlap(err.response?.data?.overlap || null);
      setShowWarningModal(true);
    } finally {
      setEditViewSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewScheduleInfo,
    employeeID,
    editViewRecords,
    editViewEndDate,
    showToast,
    stampServerRecords,
  ]);

  // ── search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) {
      showToast('Please enter an Employee ID.');
      return;
    }
    setHasSearched(true);
    setLoading(true);
    setRecords([]);
    setFound(false);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/officialtimetable/${trimmedId}`,
        getAuthHeaders(),
      );
      const data =
        res.data.length > 0 ? res.data : buildDefaultRecords(trimmedId);
      stampServerRecords(data);
      setRecords(deepClone(data));
      setFound(res.data.length > 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Error fetching records.');
    } finally {
      setLoading(false);
    }
  }, [employeeID, buildDefaultRecords, showToast, stampServerRecords]);

  // ── auto-save ─────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (index, field, value) => {
      setRecords((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        if (!isBulkSchedule) {
          if (autoSaveTimeoutRef.current)
            clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = setTimeout(() => {
            autoSaveRecords(updated);
          }, 1500);
        }
        return updated;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [isBulkSchedule],
  );

  const autoSaveRecords = useCallback(
    async (recordsToSave) => {
      const trimmedId = String(employeeID || '').trim();
      if (!trimmedId || !recordsToSave || recordsToSave.length === 0) return;
      if (!draftStartDate || !draftEndDate) return;
      if (saveInFlightRef.current) return;

      const overlapResult = checkTimeOverlaps(recordsToSave);
      if (!overlapResult.valid) {
        const a = overlapResult.segmentA;
        const b = overlapResult.segmentB;
        setWarningMessage(
          `Time overlap on ${overlapResult.day}: ${a.label} overlaps with ${b.label}. Adjust schedule so times do not overlap.`,
        );
        setShowWarningModal(true);
        return;
      }

      setAutoSaving(true);
      saveInFlightRef.current = true;
      try {
        const academicYearForBackend =
          [draftAcademicYear, draftSemester].filter(Boolean).join(' ').trim() ||
          null;
        await axios.post(
          `${API_BASE_URL}/officialtimetable`,
          {
            employeeID: trimmedId,
            academicYear: academicYearForBackend,
            startDate: draftStartDate,
            endDate: draftEndDate,
            status: draftStatus || 'active',
            records: recordsToSave,
          },
          getAuthHeaders(),
        );
        setLastSaved(new Date());
        setFound(true);
        stampServerRecords(recordsToSave);
      } catch (err) {
        console.error('Error auto-saving records:', err);
      } finally {
        setAutoSaving(false);
        saveInFlightRef.current = false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      employeeID,
      draftAcademicYear,
      draftSemester,
      draftStartDate,
      draftEndDate,
      draftStatus,
      stampServerRecords,
    ],
  );

  // ── create schedule modal ─────────────────────────────────────────────────

  const openCreateScheduleModal = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!trimmedId) {
      showToast('Please enter Employee Number.');
      return;
    }

    setIsBulkSchedule(false);
    setBulkTargetEmployees([]);
    setBulkScheduleBlocks([]);
    setScheduleView('workDays');

    if (hasSearched && records.length === 0) {
      // Still require period fields before opening modal
      if (!draftAcademicYear || !draftSemester) {
        showToast('Please fill Academic Year and Semester first.');
        return;
      }
      if (!draftStartDate || !draftEndDate) {
        showToast('Please fill Start Date and End Date first.');
        return;
      }
      if (new Date(draftStartDate) > new Date(draftEndDate)) {
        showToast('Start date must be on or before End date.');
        return;
      }
      setModalRecords(buildDefaultRecords(trimmedId));
      setShowScheduleModal(true);
      return;
    }
    let existingRecords = [];
    try {
      const res = await axios.get(
        `${API_BASE_URL}/officialtimetable/${trimmedId}`,
        getAuthHeaders(),
      );
      existingRecords = res.data || [];
    } catch {
      existingRecords = [];
    }

    const byKey = new Map();
    for (const r of existingRecords) {
      const key = `${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
      if (!byKey.has(key))
        byKey.set(key, { startDate: r.startDate, endDate: r.endDate });
    }
    const draftStart = new Date(draftStartDate).getTime();
    const draftEnd = new Date(draftEndDate).getTime();
    const hasConflict = Array.from(byKey.values()).some((existing) => {
      const exStart = existing.startDate
        ? new Date(existing.startDate).getTime()
        : 0;
      const exEnd = existing.endDate ? new Date(existing.endDate).getTime() : 0;
      return exStart < draftEnd && exEnd > draftStart;
    });
    if (hasConflict) {
      setShowConflictModal(true);
      return;
    }

    const sevenRows = DAYS_ORDER.map((day) => {
      const r = existingRecords.find((x) => x.day === day);
      return r
        ? { ...r, employeeID: trimmedId }
        : makeDefaultRow(trimmedId, day);
    });
    setModalRecords(sevenRows);
    setShowScheduleModal(true);
  }, [
    employeeID,
    hasSearched,
    records,
    draftAcademicYear,
    draftSemester,
    draftStartDate,
    draftEndDate,
    buildDefaultRecords,
    showToast,
  ]);

  // ── modal record change ───────────────────────────────────────────────────

  const handleModalRecordChange = useCallback((index, field, value) => {
    setModalRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // ── submit from modal ─────────────────────────────────────────────────────

  const handleSubmitFromModal = useCallback(async () => {
    const trimmedId = String(employeeID || '').trim();
    if (!isBulkSchedule) {
      if (!trimmedId || !draftStartDate || !draftEndDate) {
        showToast('Employee Number, Start date and End date are required.');
        return;
      }
      if (new Date(draftStartDate) > new Date(draftEndDate)) {
        showToast('Start date must be on or before end date.');
        return;
      }
    }

    const sevenRows = DAYS_ORDER.map((day) => {
      const r = modalRecords.find((x) => x.day === day);
      return r ? { ...r, day } : makeDefaultRow(trimmedId, day);
    });

    setCheckingOverlap(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const overlapResult = checkTimeOverlaps(sevenRows);
    setCheckingOverlap(false);

    if (!overlapResult.valid) {
      const a = overlapResult.segmentA;
      const b = overlapResult.segmentB;
      setWarningMessage(
        `Time overlap on ${overlapResult.day}: ${a.label} (${formatMinutesToTime(a.start)} – ${formatMinutesToTime(a.end)}) overlaps with ${b.label} (${formatMinutesToTime(b.start)} – ${formatMinutesToTime(b.end)}). Please adjust the schedule so Work Days, Honorarium, Service Credits, and Overtime do not overlap.`,
      );
      setShowWarningModal(true);
      return;
    }

    if (isBulkSchedule && bulkTargetEmployees.length > 1) {
      setPendingBulkSubmit(true);
      setShowBulkConfirmModal(true);
      return;
    }

    await executeSave(sevenRows, trimmedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    employeeID,
    isBulkSchedule,
    draftStartDate,
    draftEndDate,
    modalRecords,
    bulkTargetEmployees,
    showToast,
  ]);

  const executeSave = useCallback(
    async (sevenRows, trimmedId) => {
      saveInFlightRef.current = true;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      setSaving(true);
      try {
        if (isBulkSchedule) {
          const payload = {
            employeeIDs: bulkTargetEmployees,
            blocks: bulkScheduleBlocks,
            records: sevenRows,
          };
          const res = await axios.post(
            `${API_BASE_URL}/officialtime/bulk-schedules`,
            payload,
            { ...getAuthHeaders(), timeout: 30000 },
          );
          const totalUsersInserted = Math.round(
            (res.data.totalInserted || 0) / 7,
          );
          showToast(
            `Bulk schedules processed. Inserted ${totalUsersInserted} users.`,
          );
          await fetchAllUsers();
        } else {
          const academicYearForBackend =
            [draftAcademicYear, draftSemester]
              .filter(Boolean)
              .join(' ')
              .trim() || null;
          await axios.post(
            `${API_BASE_URL}/officialtimetable`,
            {
              employeeID: trimmedId,
              academicYear: academicYearForBackend,
              startDate: draftStartDate,
              endDate: draftEndDate,
              status: draftStatus || 'active',
              records: sevenRows,
            },
            { ...getAuthHeaders(), timeout: 30000 },
          );
          setLastSaved(new Date());
          showToast('Official time saved successfully.');
          stampServerRecords(sevenRows);
          await handleSearch();
        }
        setShowScheduleModal(false);
        setIsBulkSchedule(false);
        setBulkScheduleBlocks([]);
        setBulkTargetEmployees([]);
      } catch (err) {
        console.error('Error saving data:', err);
        const msg =
          err.code === 'ECONNABORTED' || err.message?.includes('timeout')
            ? 'Request timed out. Please try again.'
            : err.response?.status === 409
              ? err.response?.data?.message ||
                'This date range overlaps an existing schedule. Choose different dates.'
              : err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Error saving records.';
        setWarningMessage(msg);
        setWarningOverlap(err.response?.data?.overlap || null);
        setShowWarningModal(true);
      } finally {
        setSaving(false);
        saveInFlightRef.current = false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      isBulkSchedule,
      bulkTargetEmployees,
      bulkScheduleBlocks,
      draftAcademicYear,
      draftSemester,
      draftStartDate,
      draftEndDate,
      draftStatus,
      fetchAllUsers,
      handleSearch,
      showToast,
      stampServerRecords,
    ],
  );

  // ── upload ────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!file) {
      showToast('Please select a file!');
      return;
    }
    if (uploading) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time/validate`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );
      const response = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );
      if (response.data.records && response.data.records.length > 0) {
        setPreviewRecords(response.data.records);
        setPreviewViewScheduleView('workDays');
        setShowPreviewModal(true);
        const uploadedEmpId = String(
          response.data.records[0]?.employeeID || '',
        ).trim();
        if (uploadedEmpId) {
          setEmployeeID(uploadedEmpId);
          setHasSearched(true);
          try {
            const refreshed = await axios.get(
              `${API_BASE_URL}/officialtimetable/${uploadedEmpId}`,
              getAuthHeaders(),
            );
            if (Array.isArray(refreshed.data) && refreshed.data.length > 0) {
              stampServerRecords(refreshed.data);
              setRecords(deepClone(refreshed.data));
              setFound(true);
            } else {
              const defaults = buildDefaultRecords(uploadedEmpId);
              stampServerRecords(defaults);
              setRecords(deepClone(defaults));
              setFound(false);
            }
          } catch (e) {
            console.error('Error refreshing schedules after upload:', e);
          }
        }
      }
      showToast(
        `${response.data.message} (Inserted: ${response.data.inserted}, Updated: ${response.data.updated})`,
      );
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response?.status === 400 &&
          'Check file format: use .xlsx, include employeeID, day, effective_from, effective_until.') ||
        (error.response?.status === 409 &&
          'Date range overlaps an existing schedule.') ||
        error.message ||
        'Upload failed!';
      setWarningOverlap(error.response?.data?.overlap || null);
      setWarningMessage(message);
      setShowWarningModal(true);
    } finally {
      setUploading(false);
    }
  }, [file, uploading, buildDefaultRecords, showToast, stampServerRecords]);

  // ── all users panel ───────────────────────────────────────────────────────

  const handleSetDefaultForSelected = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('Please select at least one user.');
      return;
    }
    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: Array.from(selectedUsers) },
        getAuthHeaders(),
      );
      const insertedUsers =
        response.data.insertedUsers ??
        Math.floor((response.data.inserted || 0) / 7);
      const skipped = response.data.skipped || 0;
      showToast(
        `Default official time set for ${insertedUsers} users.${skipped ? ` (Skipped: ${skipped})` : ''}`,
      );
      await fetchAllUsers();
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Error setting default official time:', error);
      showToast('Error setting default official time.');
    } finally {
      setSettingDefault(false);
    }
  }, [selectedUsers, fetchAllUsers, showToast]);

  const handleSetDefaultForAll = useCallback(async () => {
    const usersWithoutDefault = allUsers
      .filter((u) => !u.hasDefaultOfficialTime)
      .map((u) => u.employeeNumber);
    if (usersWithoutDefault.length === 0) {
      showToast('All users already have default official time.');
      return;
    }
    setSettingDefault(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/officialtime/set-default-for-users`,
        { employeeNumbers: usersWithoutDefault },
        getAuthHeaders(),
      );
      const insertedUsers =
        response.data.insertedUsers ??
        Math.floor((response.data.inserted || 0) / 7);
      const skipped = response.data.skipped || 0;
      showToast(
        `Default official time set for ${insertedUsers} users.${skipped ? ` (Skipped: ${skipped})` : ''}`,
      );
      await fetchAllUsers();
    } catch (error) {
      console.error('Error setting default official time:', error);
      showToast('Error setting default official time.');
    } finally {
      setSettingDefault(false);
    }
  }, [allUsers, fetchAllUsers, showToast]);

  const handleUserSelect = useCallback((empNumber) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(empNumber)) newSet.delete(empNumber);
      else newSet.add(empNumber);
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked, filtered) => {
    if (checked)
      setSelectedUsers(new Set(filtered.map((u) => u.employeeNumber)));
    else setSelectedUsers(new Set());
  }, []);

  const getFilteredUsers = useCallback(() => {
    if (!searchQuery.trim()) return allUsers.slice();
    const q = searchQuery.toLowerCase();
    return allUsers.filter((user) => {
      const full = (user.fullName || '').toLowerCase();
      const emp = (user.employeeNumber || '').toLowerCase();
      return full.includes(q) || emp.includes(q);
    });
  }, [allUsers, searchQuery]);

  const filteredAllUsers = useMemo(
    () => getFilteredUsers(),
    [getFilteredUsers],
  );
  const paginatedAllUsers = useMemo(() => {
    const start = allUsersPage * allUsersRowsPerPage;
    return filteredAllUsers.slice(start, start + allUsersRowsPerPage);
  }, [filteredAllUsers, allUsersPage, allUsersRowsPerPage]);

  // ── bulk blocks modal ─────────────────────────────────────────────────────

  const openBulkBlocksModalForSelected = useCallback(() => {
    if (selectedUsers.size === 0) {
      showToast('Please select at least one user.');
      return;
    }
    setBulkScheduleBlocks([
      {
        id: `${Date.now()}-${Math.random()}`,
        academicYear: '',
        semester: '',
        startDate: '',
        endDate: '',
      },
    ]);
    setBulkTargetEmployees(Array.from(selectedUsers));
    setShowBulkBlocksModal(true);
  }, [selectedUsers, showToast]);

  const openBulkBlocksModalForAllMissing = useCallback(() => {
    const usersWithoutDefault = allUsers
      .filter((u) => !u.hasDefaultOfficialTime)
      .map((u) => u.employeeNumber);
    if (usersWithoutDefault.length === 0) {
      showToast('All users already have default official time.');
      return;
    }
    setBulkScheduleBlocks([
      {
        id: `${Date.now()}-${Math.random()}`,
        academicYear: '',
        semester: '',
        startDate: '',
        endDate: '',
      },
    ]);
    setBulkTargetEmployees(usersWithoutDefault);
    setShowBulkBlocksModal(true);
  }, [allUsers, showToast]);

  const handleConfirmBulkBlocks = useCallback(() => {
    const block = bulkScheduleBlocks[0];
    if (!block) return;

    const cleaned = {
      ...block,
      academicYear: String(block.academicYear || '').trim(),
      semester: String(block.semester || '').trim(),
      startDate: String(block.startDate || '').trim(),
      endDate: String(block.endDate || '').trim(),
    };

    if (
      !cleaned.academicYear ||
      !cleaned.semester ||
      !cleaned.startDate ||
      !cleaned.endDate
    ) {
      showToast('Please complete all fields before proceeding.');
      return;
    }

    setBulkScheduleBlocks([cleaned]);
    setIsBulkSchedule(true);
    setDraftAcademicYear(cleaned.academicYear);
    setDraftSemester(cleaned.semester);
    setDraftStartDate(cleaned.startDate);
    setDraftEndDate(cleaned.endDate);

    const empId = String(bulkTargetEmployees[0] || '');
    setEmployeeID(empId);
    setModalRecords(DAYS_ORDER.map((day) => makeDefaultRow(empId, day)));
    setScheduleView('workDays');
    setShowBulkBlocksModal(false);
    setShowScheduleModal(true);
  }, [bulkScheduleBlocks, bulkTargetEmployees, showToast]);
  // ── employee ID change ────────────────────────────────────────────────────

  const handleEmployeeIDChange = useCallback(
    (value) => {
      if (value === '' || /^\d+$/.test(value)) {
        setEmployeeID(value);
        if (value !== employeeID) {
          setRecords([]);
          setHasSearched(false);
          setFound(false);
          setDraftAcademicYear('');
          setDraftSemester('');
          setDraftStartDate('');
          setDraftEndDate('');
          setLastSaved(null);
          serverRecordsRef.current = [];
          checksumRef.current = null;
          setTamperDetected(false);
        }
      }
    },
    [employeeID],
  );

  const handleAnalyzeFile = async () => {
    if (!file) {
      showToast('Please select a file first.');
      return;
    }
    if (analyzing || confirming) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadAcknowledgeChecked(false);
    setAnalyzing(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time/validate`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );
      // Success — show preview modal
      setAnalyzeResult({ ok: true, ...res.data });
      setShowAnalyzeModal(true);
    } catch (error) {
      const data = error.response?.data || {};
      const message = data.message || error.message || 'Validation failed.';
      // Show error in the same preview modal so user sees full detail
      setAnalyzeResult({
        ok: false,
        message,
        timeErrors: data.timeErrors || [],
        allErrors: data.allErrors || [],
        skippedRows: data.skippedRows || [],
        warnings: data.warnings || [],
        overlap: data.overlap || null,
      });
      setShowAnalyzeModal(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!file || confirming || !uploadAcknowledgeChecked) return;

    const formData = new FormData();
    formData.append('file', file);

    setConfirming(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );

      setShowAnalyzeModal(false);
      setAnalyzeResult(null);
      setUploadAcknowledgeChecked(false);

      if (response.data.records?.length > 0) {
        setPreviewRecords(response.data.records);
        setPreviewViewScheduleView('workDays');
        setShowPreviewModal(true);

        const uploadedEmpId = String(
          response.data.records[0]?.employeeID || '',
        ).trim();
        if (uploadedEmpId) {
          setEmployeeID(uploadedEmpId);
          setHasSearched(true);
          try {
            const refreshed = await axios.get(
              `${API_BASE_URL}/officialtimetable/${uploadedEmpId}`,
              getAuthHeaders(),
            );
            if (Array.isArray(refreshed.data) && refreshed.data.length > 0) {
              stampServerRecords(refreshed.data);
              setRecords(deepClone(refreshed.data));
              setFound(true);
            } else {
              const defaults = buildDefaultRecords(uploadedEmpId);
              stampServerRecords(defaults);
              setRecords(deepClone(defaults));
              setFound(false);
            }
          } catch (e) {
            console.error('Error refreshing after upload:', e);
          }
        }
      }

      const warnings = response.data.warnings || [];
      showToast(
        `Upload complete! Inserted: ${response.data.inserted} rows.` +
          (warnings.length
            ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})`
            : ''),
      );
      setFile(null);
    } catch (error) {
      const data = error.response?.data || {};
      const message = data.message || error.message || 'Upload failed.';
      setWarningMessage(message);
      setWarningOverlap(data.overlap || null);
      setShowWarningModal(true);
      setShowAnalyzeModal(false);
      setUploadAcknowledgeChecked(false);
    } finally {
      setConfirming(false);
    }
  };

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (showAllUsers) {
      fetchAllUsers();
      setSelectedUsers(new Set());
    }
    setAllUsersPage(0);
  }, [showAllUsers, fetchAllUsers]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (tamperCheckIntervalRef.current)
        clearInterval(tamperCheckIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, [employeeID]);

  // ── derived values ────────────────────────────────────────────────────────

  const previewScheduleInfo =
    previewRecords.length > 0
      ? {
          academicYear: previewRecords[0].academicYear,
          startDate: previewRecords[0].startDate,
          endDate: previewRecords[0].endDate,
          status: previewRecords[0].status || 'active',
        }
      : null;

  // ── access guard ──────────────────────────────────────────────────────────

  if (accessLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Official Time Form. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {tamperDetected && (
        <TamperWarningBanner onRestore={handleRestoreFromServer} />
      )}

      <LoadingOverlay
        open={loading || checkingOverlap || saving || uploading}
        message={
          checkingOverlap
            ? 'Checking schedule for conflicts...'
            : uploading
              ? 'Uploading...'
              : saving
                ? 'Saving...'
                : 'Loading...'
        }
      />

      <Box
        sx={{
          py: 4,
          borderRadius: '14px',
          width: '100vw',
          mx: 'auto',
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          mt: tamperDetected ? '56px' : 0,
          transition: 'margin-top 0.2s ease',
        }}
      >
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
          {/* ── Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard
                sx={{
                  background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                  boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    p: 5,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: textPrimaryColor,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: 200,
                      height: 200,
                      background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, transparent 70%)`,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: '30%',
                      width: 150,
                      height: 150,
                      background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, transparent 70%)`,
                    }}
                  />
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    position="relative"
                    zIndex={1}
                  >
                    <Box display="flex" alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: alpha(accentColor, 0.15),
                          mr: 4,
                          width: 64,
                          height: 64,
                          boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}`,
                        }}
                      >
                        <Schedule
                          sx={{ color: textPrimaryColor, fontSize: 32 }}
                        />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h4"
                          component="h1"
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            lineHeight: 1.2,
                            color: textPrimaryColor,
                          }}
                        >
                          Official Time Schedule
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            opacity: 0.8,
                            fontWeight: 400,
                            color: textPrimaryColor,
                          }}
                        >
                          Manage and update official time schedules for
                          employees
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <ViewToggle
                        value={viewMode}
                        onChange={setViewMode}
                        accentColor={accentColor}
                        primaryColor={primaryColor}
                        textPrimaryColor={textPrimaryColor}
                      />
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* ════════════ SINGLE EMPLOYEE VIEW ════════════ */}
          {showSingleView && (
            <Fade in timeout={400} key="single-view">
              <GlassCard
                sx={{
                  mb: 4,
                  background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                  boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  {/* ── Section 1: Employee & Schedule Period ── */}
                  <Box sx={{ p: 3 }}>
                    <Typography
                      sx={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: alpha(textPrimaryColor, 0.5),
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: accentColor,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      Step 1 — Employee &amp; schedule period
                    </Typography>

                    {/* 🔥 FIELDS + ACTIONS IN ONE ROW */}
                    <Grid container spacing={1.5} alignItems="center">
                      {/* LEFT SIDE — FIELDS */}
                      <Grid item xs={12} md={9}>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} sm={6} md={3}>
                            <ModernTextField
                              fullWidth
                              label="Employee Number"
                              value={employeeID}
                              onChange={(e) =>
                                handleEmployeeIDChange(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (
                                  !/[0-9]/.test(e.key) &&
                                  ![
                                    'Backspace',
                                    'Delete',
                                    'ArrowLeft',
                                    'ArrowRight',
                                    'Tab',
                                  ].includes(e.key)
                                )
                                  e.preventDefault();
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Person
                                      sx={{
                                        color: textPrimaryColor,
                                        fontSize: 18,
                                      }}
                                    />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <ModernTextField
                              fullWidth
                              label="Academic Year"
                              placeholder="e.g. 2025"
                              value={draftAcademicYear}
                              onChange={(e) =>
                                setDraftAcademicYear(e.target.value)
                              }
                              onBlur={(e) => {
                                const formatted = autoFormatAcademicYear(
                                  e.target.value,
                                );
                                if (formatted !== e.target.value)
                                  setDraftAcademicYear(formatted);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const formatted = autoFormatAcademicYear(
                                    e.target.value,
                                  );
                                  setDraftAcademicYear(formatted);
                                  e.target.blur();
                                }
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Autocomplete
                              freeSolo
                              options={[
                                '1st Semester',
                                '2nd Semester',
                                'Summer',
                                'Vacation',
                                'Christmas break',
                                'Midyear',
                                'Enrollment period',
                              ]}
                              value={draftSemester || null}
                              onInputChange={(_, value) =>
                                setDraftSemester(value ?? '')
                              }
                              onChange={(_, value) =>
                                setDraftSemester(
                                  typeof value === 'string' ? value : '',
                                )
                              }
                              renderInput={(params) => (
                                <ModernTextField
                                  {...params}
                                  label="Semester"
                                  placeholder="e.g. 1st Semester"
                                />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={1.5}>
                            <ModernTextField
                              fullWidth
                              label="Start Date"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              value={draftStartDate}
                              onChange={(e) =>
                                setDraftStartDate(e.target.value)
                              }
                            />
                          </Grid>

                          <Grid item xs={12} sm={6} md={1.5}>
                            <ModernTextField
                              fullWidth
                              label="End Date"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              value={draftEndDate}
                              onChange={(e) => setDraftEndDate(e.target.value)}
                            />
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* RIGHT SIDE — ACTION BUTTONS */}
                      <Grid item xs={12} md={3}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            height: '100%',
                            width: '100%',
                          }}
                        >
                          {/* Search button (fixed size) */}
                          <ProfessionalButton
                            variant="outlined"
                            onClick={handleSearch}
                            startIcon={<SearchIcon />}
                            disabled={!String(employeeID || '').trim()}
                            sx={{
                              borderColor: accentColor,
                              color: accentColor,
                              borderRadius: '8px',
                              minWidth: '110px',
                              whiteSpace: 'nowrap',
                              '&:hover': {
                                bgcolor: alpha(accentColor, 0.08),
                                borderColor: accentColor,
                              },
                            }}
                          >
                            Search
                          </ProfessionalButton>

                          {/* 🔥 Create button (fills remaining space) */}
                          <ProfessionalButton
                            fullWidth
                            variant="contained"
                            onClick={openCreateScheduleModal}
                            disabled={
                              !String(employeeID || '').trim() ||
                              ((!hasSearched || records.length > 0) &&
                                (!draftAcademicYear ||
                                  !draftSemester ||
                                  !draftStartDate ||
                                  !draftEndDate))
                            }
                            startIcon={<Schedule />}
                            sx={{
                              flex: 1, // 🔥 THIS MAKES IT EXPAND
                              bgcolor: accentColor,
                              color: primaryColor,
                              borderRadius: '20px',
                              px: 2,
                              fontWeight: 600,
                              boxShadow: `0 2px 10px ${alpha(accentColor, 0.35)}`,
                              '&:hover': {
                                bgcolor: accentDark,
                                boxShadow: `0 4px 14px ${alpha(accentColor, 0.45)}`,
                              },
                            }}
                          >
                            Create Schedule
                          </ProfessionalButton>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ borderColor: alpha(accentColor, 0.1) }} />

                  {/* ── Section 2: Excel Upload (optional) ── */}
                  <Box sx={{ p: 3 }}>
                    <Typography
                      sx={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: alpha(textPrimaryColor, 0.5),
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: accentColor,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      Step 2 — Excel upload
                      <Box
                        component="span"
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 400,
                          color: alpha(textPrimaryColor, 0.35),
                          textTransform: 'none',
                          letterSpacing: 0,
                          ml: 0.5,
                        }}
                      >
                        (optional)
                      </Box>
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'wrap',
                      }}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        id="upload-button"
                        style={{ display: 'none' }}
                        onChange={(e) => setFile(e.target.files[0] || null)}
                      />
                      <label htmlFor="upload-button">
                        <ProfessionalButton
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUploadIcon />}
                          sx={{
                            borderColor: accentColor,
                            color: textPrimaryColor,
                            '&:hover': {
                              backgroundColor: alpha(accentColor, 0.1),
                            },
                          }}
                        >
                          Choose file
                        </ProfessionalButton>
                      </label>

                      {file && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: alpha(textPrimaryColor, 0.7),
                            bgcolor: alpha(accentColor, 0.06),
                            border: `0.5px solid ${alpha(accentColor, 0.2)}`,
                            borderRadius: 1.5,
                            px: 1.25,
                            py: 0.5,
                            fontSize: '0.8rem',
                          }}
                        >
                          {file.name}
                        </Typography>
                      )}

                      {/* Validate button — primary action */}
                      <ProfessionalButton
                        variant="contained"
                        onClick={handleAnalyzeFile}
                        disabled={!file || analyzing || confirming}
                        startIcon={
                          analyzing ? (
                            <CircularProgress
                              size={15}
                              sx={{ color: '#fff' }}
                            />
                          ) : (
                            <SearchIcon />
                          )
                        }
                        sx={{
                          bgcolor: accentColor,
                          color: primaryColor,
                          '&:hover': { bgcolor: accentDark },
                        }}
                      >
                        {analyzing ? 'Validating…' : 'Validate'}
                      </ProfessionalButton>

                      <Typography
                        variant="caption"
                        sx={{
                          color: alpha(textPrimaryColor, 0.4),
                          fontSize: '0.72rem',
                        }}
                      >
                        Accepts .xlsx / .xls — columns: employeeID, day,
                        startDate, endDate, time fields
                      </Typography>
                    </Box>

                    {/* Inline hint about the 2-step flow */}
                    {file && !analyzing && (
                      <Box
                        sx={{
                          mt: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: alpha(accentColor, 0.5),
                            display: 'inline-block',
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            color: alpha(textPrimaryColor, 0.5),
                          }}
                        >
                          Click <strong>Validate</strong> to preview and validate
                          your file before uploading. No data will be changed
                          until you confirm.
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ borderColor: alpha(accentColor, 0.1) }} />

                  {/* ── Section 3: Existing Schedules ── */}
                  {hasSearched && (
                    <Box sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        {records.length > 0 ? (
                          <CheckCircle
                            sx={{ color: '#2e7d32', fontSize: 16 }}
                          />
                        ) : (
                          <EventBusy
                            sx={{
                              color: alpha(textPrimaryColor, 0.4),
                              fontSize: 16,
                            }}
                          />
                        )}
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color:
                              records.length > 0
                                ? '#2e7d32'
                                : alpha(textPrimaryColor, 0.5),
                            textTransform: 'uppercase',
                            letterSpacing: '0.6px',
                          }}
                        >
                          Existing schedules
                        </Typography>
                        {records.length > 0 &&
                          (() => {
                            const byKey = new Map();
                            for (const r of records || []) {
                              const key = `${r.academicYear ?? ''}|${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
                              if (!byKey.has(key)) byKey.set(key, true);
                            }
                            const count = byKey.size;
                            return (
                              <Box
                                component="span"
                                sx={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  bgcolor: 'rgba(46,125,50,0.1)',
                                  color: '#2e7d32',
                                  border: '0.5px solid rgba(46,125,50,0.3)',
                                  borderRadius: '9px',
                                  px: 0.9,
                                  py: 0.2,
                                }}
                              >
                                {count}
                              </Box>
                            );
                          })()}
                      </Box>

                      {(() => {
                        const byKey = new Map();
                        for (const r of records || []) {
                          const key = `${r.academicYear ?? ''}|${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
                          if (!byKey.has(key))
                            byKey.set(key, {
                              academicYear: r.academicYear,
                              startDate: r.startDate,
                              endDate: r.endDate,
                              status: r.status,
                            });
                        }
                        const validSchedules = Array.from(byKey.values())
                          .filter(
                            (v) =>
                              normalizeDateStr(v.startDate) ||
                              normalizeDateStr(v.endDate),
                          )
                          .sort((a, b) => {
                            const aActive =
                              String(a.status || 'active').toLowerCase() ===
                              'active';
                            const bActive =
                              String(b.status || 'active').toLowerCase() ===
                              'active';
                            return (bActive ? 1 : 0) - (aActive ? 1 : 0);
                          });

                        if (
                          records.length === 0 ||
                          validSchedules.length === 0
                        ) {
                          return (
                            <Box
                              sx={{
                                py: 2.5,
                                px: 2,
                                bgcolor: alpha(accentColor, 0.04),
                                borderRadius: 1.5,
                                border: `1px dashed ${alpha(accentColor, 0.25)}`,
                                textAlign: 'center',
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: textPrimaryColor,
                                  fontWeight: 500,
                                }}
                              >
                                No existing record for this employee.
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: alpha(textPrimaryColor, 0.6),
                                  mt: 0.5,
                                  fontSize: '0.82rem',
                                }}
                              >
                                Use "Create new schedule" above to get started.
                              </Typography>
                            </Box>
                          );
                        }

                        return (
                          <Box
                            sx={{
                              border: `0.5px solid ${alpha(accentColor, 0.18)}`,
                              borderRadius: 1.5,
                              overflow: 'hidden',
                              bgcolor: alpha(accentColor, 0.03),
                            }}
                          >
                            {validSchedules.map((v, idx) => {
                              const isActive =
                                String(v.status || 'active').toLowerCase() ===
                                'active';
                              const openView = () => {
                                const normStart = normalizeDateStr(v.startDate);
                                const normEnd = normalizeDateStr(v.endDate);
                                const rows = (records || []).filter(
                                  (r) =>
                                    normalizeDateStr(r.startDate) ===
                                      normStart &&
                                    normalizeDateStr(r.endDate) === normEnd,
                                );
                                setViewScheduleInfo({
                                  academicYear: v.academicYear,
                                  startDate: v.startDate,
                                  endDate: v.endDate,
                                  status: v.status,
                                });
                                setViewScheduleRecords(rows);
                                setViewScheduleView('workDays');
                                setViewScheduleEmployeeName(
                                  resolveEmployeeName(employeeID),
                                );
                                setShowViewScheduleModal(true);
                              };
                              return (
                                <Box
                                  key={idx}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    px: 2,
                                    py: 1.25,
                                    borderBottom:
                                      idx < validSchedules.length - 1
                                        ? `0.5px solid ${alpha(accentColor, 0.12)}`
                                        : 'none',
                                    '&:hover': {
                                      bgcolor: alpha(accentColor, 0.04),
                                    },
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  {/* Icon */}
                                  <Box
                                    sx={{
                                      width: 30,
                                      height: 30,
                                      borderRadius: 1.5,
                                      bgcolor: isActive
                                        ? alpha(accentColor, 0.1)
                                        : alpha(accentColor, 0.04),
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Schedule
                                      sx={{
                                        fontSize: 15,
                                        color: isActive
                                          ? accentColor
                                          : alpha(textPrimaryColor, 0.35),
                                      }}
                                    />
                                  </Box>

                                  {/* Info */}
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: textPrimaryColor,
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {v.academicYear || '—'}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: '0.75rem',
                                        color: alpha(textPrimaryColor, 0.6),
                                        mt: 0.2,
                                      }}
                                    >
                                      {formatDateLong(v.startDate) ||
                                        formatDateOnly(v.startDate)}{' '}
                                      –{' '}
                                      {formatDateLong(v.endDate) ||
                                        formatDateOnly(v.endDate)}
                                    </Typography>
                                  </Box>

                                  {/* Badge */}
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      px: 1,
                                      py: 0.3,
                                      borderRadius: '9px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      border: '0.5px solid',
                                      ...(isActive
                                        ? {
                                            bgcolor: 'rgba(46,125,50,0.08)',
                                            color: '#2e7d32',
                                            borderColor: 'rgba(46,125,50,0.3)',
                                          }
                                        : {
                                            bgcolor: 'rgba(237,108,2,0.08)',
                                            color: '#b45309',
                                            borderColor: 'rgba(237,108,2,0.3)',
                                          }),
                                    }}
                                  >
                                    {isActive && (
                                      <Box
                                        component="span"
                                        sx={{
                                          width: 5,
                                          height: 5,
                                          borderRadius: '50%',
                                          bgcolor: '#2e7d32',
                                          display: 'inline-block',
                                        }}
                                      />
                                    )}
                                    {isActive ? 'Active' : 'Inactive'}
                                  </Box>

                                  {/* View button */}
                                  <Tooltip title="View schedule">
                                    <IconButton
                                      size="small"
                                      onClick={openView}
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        border: `0.5px solid ${alpha(accentColor, 0.2)}`,
                                        borderRadius: 1.5,
                                        color: alpha(textPrimaryColor, 0.5),
                                        bgcolor: 'transparent',
                                        '&:hover': {
                                          borderColor: accentColor,
                                          color: accentColor,
                                          bgcolor: alpha(accentColor, 0.06),
                                        },
                                      }}
                                    >
                                      <Visibility sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              );
                            })}
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* ════════════ ALL USERS VIEW ════════════ */}
          {showAllUsers && (
            <Fade in timeout={400} key="all-users-view">
              <GlassCard
                sx={{
                  mb: 4,
                  background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                  boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    p: 4,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: textPrimaryColor,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 600, mb: 0.5, color: textPrimaryColor }}
                    >
                      All Users — Official Time Status
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.8, color: textPrimaryColor }}
                    >
                      View and manage official time schedules for all users
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: alpha(accentColor, 0.15),
                      width: 64,
                      height: 64,
                    }}
                  >
                    <PeopleIcon
                      sx={{ fontSize: 32, color: textPrimaryColor }}
                    />
                  </Avatar>
                </Box>

                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      mb: 3,
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <ModernTextField
                      fullWidth
                      placeholder="Search by name or employee number..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setAllUsersPage(0);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: textPrimaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <ProfessionalButton
                      variant="contained"
                      onClick={openBulkBlocksModalForSelected}
                      disabled={selectedUsers.size === 0 || settingDefault}
                      startIcon={<CheckCircleIcon />}
                      sx={{
                        bgcolor: accentColor,
                        color: primaryColor,
                        minWidth: 220,
                        flexShrink: 0,
                      }}
                    >
                      Bulk Create (Selected: {selectedUsers.size})
                    </ProfessionalButton>
                    <ProfessionalButton
                      variant="outlined"
                      onClick={openBulkBlocksModalForAllMissing}
                      disabled={
                        settingDefault ||
                        allUsers.filter((u) => !u.hasDefaultOfficialTime)
                          .length === 0
                      }
                      sx={{
                        borderColor: accentColor,
                        color: textPrimaryColor,
                        minWidth: 220,
                        flexShrink: 0,
                        '&:hover': { backgroundColor: alpha(accentColor, 0.1) },
                      }}
                    >
                      Bulk Create (All Missing)
                    </ProfessionalButton>
                  </Box>

                  {loadingUsers ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                    >
                      <CircularProgress sx={{ color: accentColor }} />
                    </Box>
                  ) : (
                    <>
                      <PremiumTableContainer>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <PremiumTableCell
                                sx={{ bgcolor: alpha(primaryColor, 0.9) }}
                              >
                                <Tooltip
                                  title={`Select all ${paginatedAllUsers.length} rows on this page`}
                                >
                                  <Checkbox
                                    checked={
                                      paginatedAllUsers.length > 0 &&
                                      paginatedAllUsers.every((u) =>
                                        selectedUsers.has(u.employeeNumber),
                                      )
                                    }
                                    indeterminate={
                                      paginatedAllUsers.some((u) =>
                                        selectedUsers.has(u.employeeNumber),
                                      ) &&
                                      !paginatedAllUsers.every((u) =>
                                        selectedUsers.has(u.employeeNumber),
                                      )
                                    }
                                    onChange={(e) =>
                                      handleSelectAll(
                                        e.target.checked,
                                        paginatedAllUsers,
                                      )
                                    }
                                    sx={{
                                      color: '#fff',
                                      '&.Mui-checked': { color: '#fff' },
                                      '&.MuiCheckbox-indeterminate': {
                                        color: '#fff',
                                      },
                                    }}
                                  />
                                </Tooltip>
                              </PremiumTableCell>
                              {[
                                'Employee Number',
                                'Name',
                                'Department',
                                'Academic Year',
                                'Status',
                                'Start Date',
                                'End Date',
                              ].map((h) => (
                                <PremiumTableCell
                                  key={h}
                                  isHeader
                                  sx={{
                                    color: accentColor,
                                    bgcolor: alpha(primaryColor, 0.9),
                                  }}
                                >
                                  {h}
                                </PremiumTableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedAllUsers.map((user) => (
                              <TableRow
                                key={user.employeeNumber}
                                sx={{
                                  '&:nth-of-type(even)': {
                                    bgcolor: alpha(primaryColor, 0.3),
                                  },
                                  '&:hover': {
                                    bgcolor: alpha(accentColor, 0.05),
                                  },
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <PremiumTableCell>
                                  <Checkbox
                                    checked={selectedUsers.has(
                                      user.employeeNumber,
                                    )}
                                    onChange={() =>
                                      handleUserSelect(user.employeeNumber)
                                    }
                                    sx={{ color: accentColor }}
                                  />
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.employeeNumber}
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.fullName || 'N/A'}
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.department || '—'}
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.academicYear || '—'}
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.hasDefaultOfficialTime ? (
                                    <Chip
                                      icon={<CheckCircleIcon />}
                                      label="Has Schedule"
                                      size="small"
                                      sx={{
                                        bgcolor: alpha('#4caf50', 0.1),
                                        color: '#2e7d32',
                                        border: '1px solid #c8e6c9',
                                      }}
                                    />
                                  ) : (
                                    <Chip
                                      icon={<CancelIcon />}
                                      label="No Schedule"
                                      size="small"
                                      sx={{
                                        bgcolor: alpha('#f44336', 0.1),
                                        color: '#c62828',
                                        border: '1px solid #ffcdd2',
                                      }}
                                    />
                                  )}
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.startDate
                                    ? formatDateOnly(user.startDate)
                                    : '—'}
                                </PremiumTableCell>
                                <PremiumTableCell>
                                  {user.endDate
                                    ? formatDateOnly(user.endDate)
                                    : '—'}
                                </PremiumTableCell>
                              </TableRow>
                            ))}
                            {filteredAllUsers.length === 0 && (
                              <TableRow>
                                <PremiumTableCell
                                  colSpan={8}
                                  align="center"
                                  sx={{ py: 4 }}
                                >
                                  <Typography sx={{ color: accentColor }}>
                                    {searchQuery
                                      ? 'No users found matching your search.'
                                      : 'No users found.'}
                                  </Typography>
                                </PremiumTableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </PremiumTableContainer>
                      <Box
                        sx={{
                          borderTop: `1px solid ${alpha(primaryColor, 0.2)}`,
                        }}
                      >
                        <TablePagination
                          component="div"
                          count={filteredAllUsers.length}
                          page={allUsersPage}
                          onPageChange={(_, newPage) =>
                            setAllUsersPage(newPage)
                          }
                          rowsPerPage={allUsersRowsPerPage}
                          onRowsPerPageChange={(e) => {
                            setAllUsersRowsPerPage(
                              parseInt(e.target.value, 10),
                            );
                            setAllUsersPage(0);
                          }}
                          rowsPerPageOptions={[10, 20, 30, 50]}
                          labelRowsPerPage="Rows per page:"
                          labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} of ${count}`
                          }
                          sx={{
                            '& .MuiTablePagination-toolbar': { minHeight: 56 },
                          }}
                        />
                      </Box>
                    </>
                  )}
                </CardContent>
              </GlassCard>
            </Fade>
          )}

          {/* ─────────────────────────────────────────────────────────────
              DIALOGS
          ───────────────────────────────────────────────────────────── */}

          {/* ════ Create / Bulk Schedule ════ */}
          <Dialog
            open={showScheduleModal}
            onClose={() => {
              if (saving) return;
              setShowScheduleModal(false);
              setIsBulkSchedule(false);
              setBulkTargetEmployees([]);
              setBulkScheduleBlocks([]);
            }}
            maxWidth="xl"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 2,
                overflow: 'hidden',
                width: isBulkSchedule ? '90vw' : '75vw',
                maxWidth: isBulkSchedule ? '90vw' : '75vw',
              },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minWidth: 0,
                }}
              >
                <Schedule sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {isBulkSchedule
                      ? 'Create Bulk Schedule — Step 2 of 2'
                      : 'Create New Schedule'}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.78rem',
                      mt: 0.25,
                      lineHeight: 1.3,
                    }}
                  >
                    {isBulkSchedule
                      ? `Setting time schedule for ${bulkTargetEmployees.length} employee${bulkTargetEmployees.length !== 1 ? 's' : ''}`
                      : (() => {
                          const id = String(employeeID || '').trim();
                          const name = resolveEmployeeName(id);
                          return id
                            ? name
                              ? `${id} — ${name}`
                              : `Employee No. ${id}`
                            : 'No employee selected';
                        })()}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  if (saving) return;
                  setShowScheduleModal(false);
                  setIsBulkSchedule(false);
                  setBulkTargetEmployees([]);
                  setBulkScheduleBlocks([]);
                }}
                disabled={saving}
                sx={{
                  color: '#fff',
                  ml: 1,
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
                aria-label="Close"
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            {/* Stepper — bulk only */}
            {isBulkSchedule && (
              <Box
                sx={{
                  bgcolor: '#f7f0f0',
                  borderBottom: '1px solid #e2cece',
                  px: 3,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* Step 1 — done */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#a08080',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle sx={{ color: '#fff', fontSize: 14 }} />
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          color: '#a08080',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Done
                      </Typography>
                      <Typography
                        sx={{ fontSize: '0.82rem', color: '#a08080' }}
                      >
                        Define schedule period
                      </Typography>
                    </Box>
                  </Box>
                  {/* Progress line — fully filled */}
                  <Box
                    sx={{
                      flex: 1,
                      height: 2,
                      mx: 1.5,
                      borderRadius: 1,
                      bgcolor: '#6d2323',
                    }}
                  />
                  {/* Step 2 — active */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#6d2323',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        2
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          color: '#6d2323',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Current
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          color: '#1a1a1a',
                          fontWeight: 600,
                        }}
                      >
                        Set time schedule
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Two-column body for bulk, single column otherwise */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isBulkSchedule ? '220px 1fr' : '1fr',
              }}
            >
              {/* Left sidebar — employee list (bulk only) */}
              {isBulkSchedule && (
                <Box
                  sx={{
                    borderRight: '0.5px solid #ede0e0',
                    px: 1.75,
                    py: 2,
                    bgcolor: '#faf9f8',
                    overflowY: 'auto',
                    maxHeight: 560,
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': {
                      background: '#f0e8e8',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#d0b8b8',
                      borderRadius: '4px',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mb: 1.25,
                    }}
                  >
                    Employees ({bulkTargetEmployees.length})
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}
                  >
                    {bulkTargetEmployees.map((empId) => {
                      const u = allUsers.find(
                        (u) => String(u.employeeNumber) === String(empId),
                      );
                      const initials = (u?.fullName || String(empId))
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
                      return (
                        <Box
                          key={empId}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1,
                            py: 0.75,
                            bgcolor: '#fff',
                            border: '0.5px solid #e8d8d8',
                            borderRadius: '4px',
                            minWidth: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: '#ede0e0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: '#6d2323',
                              }}
                            >
                              {initials}
                            </Typography>
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#1a1a1a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {u?.fullName || empId}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.68rem',
                                color: '#999',
                                lineHeight: 1.2,
                              }}
                            >
                              {empId}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Right — main content */}
              <Box
                sx={{
                  bgcolor: '#fff',
                  px: 3,
                  pt: 2.5,
                  pb: 0,
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Schedule period — neutral read-only (bulk only) */}
                {isBulkSchedule && (
                  <Box
                    sx={{
                      border: '0.5px solid #e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      mb: 2.5,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: '#f5f5f5',
                        borderBottom: '0.5px solid #e0e0e0',
                        px: 2,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#555',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Schedule period
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          color: '#999',
                          fontStyle: 'italic',
                        }}
                      >
                        Read only — set in previous step
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 1.5,
                      }}
                    >
                      {[
                        { label: 'Academic year', value: draftAcademicYear },
                        { label: 'Semester', value: draftSemester },
                        {
                          label: 'Start date',
                          value:
                            formatDateLong(draftStartDate) ||
                            formatDateOnly(draftStartDate),
                        },
                        {
                          label: 'End date',
                          value:
                            formatDateLong(draftEndDate) ||
                            formatDateOnly(draftEndDate),
                        },
                      ].map(({ label, value }) => (
                        <Box key={label}>
                          <Typography
                            sx={{
                              fontSize: '0.62rem',
                              color: '#999',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              mb: 0.25,
                            }}
                          >
                            {label}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: '#1a1a1a',
                            }}
                          >
                            {value || '—'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Schedule period — non-bulk editable fields */}
                {!isBulkSchedule && (
                  <Box
                    sx={{
                      bgcolor: '#f7f0f0',
                      border: '1px solid #e2cece',
                      borderRadius: 1.5,
                      p: 2,
                      mb: 2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#6d2323',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        mb: 1.5,
                      }}
                    >
                      Schedule Period
                    </Typography>
                    <Grid container spacing={1.5}>
                      {[
                        {
                          label: 'Academic Year',
                          value: draftAcademicYear,
                          setter: setDraftAcademicYear,
                          placeholder: 'e.g. 2025-2026',
                        },
                        {
                          label: 'Semester',
                          value: draftSemester,
                          setter: setDraftSemester,
                          placeholder: 'e.g. 1st Semester',
                        },
                      ].map(({ label, value, setter, placeholder }) => (
                        <Grid item xs={6} sm={3} key={label}>
                          <TextField
                            fullWidth
                            size="small"
                            label={label}
                            placeholder={placeholder}
                            value={value || ''}
                            onChange={(e) => setter(e.target.value || '')}
                            onBlur={(e) => {
                              if (label === 'Academic Year') {
                                const formatted = autoFormatAcademicYear(
                                  e.target.value,
                                );
                                if (formatted !== e.target.value)
                                  setter(formatted);
                              }
                            }}
                            sx={{
                              bgcolor: '#fff',
                              '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                              },
                              '& label.Mui-focused': { color: '#6d2323' },
                            }}
                          />
                        </Grid>
                      ))}
                      {[
                        {
                          label: 'Start Date',
                          value: draftStartDate,
                          setter: setDraftStartDate,
                        },
                        {
                          label: 'End Date',
                          value: draftEndDate,
                          setter: setDraftEndDate,
                        },
                      ].map(({ label, value, setter }) => (
                        <Grid item xs={6} sm={3} key={label}>
                          <TextField
                            fullWidth
                            size="small"
                            label={label}
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={value || ''}
                            onChange={(e) => setter(e.target.value || '')}
                            sx={{
                              bgcolor: '#fff',
                              '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                              },
                              '& label.Mui-focused': { color: '#6d2323' },
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* Tab bar + clear/reset buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      border: '1px solid #d0b8b8',
                      borderRadius: 1,
                      overflow: 'hidden',
                      flex: 1,
                      minWidth: 280,
                    }}
                  >
                    {[
                      { key: 'workDays', label: 'Work Days' },
                      { key: 'honorarium', label: 'Honorarium' },
                      { key: 'serviceCredits', label: 'Service Credits' },
                      { key: 'overtime', label: 'Overtime' },
                    ].map(({ key, label }, i, arr) => (
                      <Button
                        key={key}
                        onClick={() => setScheduleView(key)}
                        disableElevation
                        fullWidth
                        sx={{
                          borderRadius: 0,
                          textTransform: 'none',
                          fontWeight: scheduleView === key ? 700 : 400,
                          fontSize: '0.82rem',
                          py: 0.9,
                          bgcolor: scheduleView === key ? '#6d2323' : '#fff',
                          color: scheduleView === key ? '#fff' : '#444',
                          borderRight:
                            i < arr.length - 1 ? '1px solid #d0b8b8' : 'none',
                          '&:hover': {
                            bgcolor:
                              scheduleView === key ? '#5a1c1c' : '#f7f0f0',
                          },
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Tooltip
                      title={`Clear all times on the "${scheduleView}" tab`}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleClearModalTimes}
                        startIcon={<ClearAll fontSize="small" />}
                        sx={{
                          borderColor: '#d0b8b8',
                          color: '#6d2323',
                          fontWeight: 600,
                          textTransform: 'none',
                          fontSize: '0.78rem',
                          px: 1.5,
                          py: 0.7,
                          '&:hover': {
                            bgcolor: '#f7f0f0',
                            borderColor: '#6d2323',
                          },
                        }}
                      >
                        Clear Tab
                      </Button>
                    </Tooltip>
                    <Tooltip title="Reset all times back to default (8:00 AM – 5:00 PM)">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleResetModalToDefault}
                        sx={{
                          borderColor: '#d0b8b8',
                          color: '#555',
                          fontWeight: 600,
                          textTransform: 'none',
                          fontSize: '0.78rem',
                          px: 1.5,
                          py: 0.7,
                          '&:hover': {
                            bgcolor: '#f5f5f5',
                            borderColor: '#555',
                          },
                        }}
                      >
                        Reset to Default
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Time table */}
                <TableContainer
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1.5,
                    overflow: 'auto',
                    mb: 3,
                    '&::-webkit-scrollbar': { height: '6px' },
                    '&::-webkit-scrollbar-track': {
                      background: '#f7f0f0',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#d0b8b8',
                      borderRadius: '4px',
                    },
                  }}
                >
                  <Table
                    size="small"
                    sx={{ minWidth: isBulkSchedule ? 600 : 'auto' }}
                  >
                    <ScheduleTimeRows
                      records={modalRecords}
                      onChangeRecord={handleModalRecordChange}
                      scheduleView={scheduleView}
                      readOnly={false}
                    />
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                {isBulkSchedule && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowScheduleModal(false);
                      setShowBulkBlocksModal(true);
                    }}
                    startIcon={<ArrowBack fontSize="small" />}
                    sx={{
                      borderColor: '#6d2323',
                      color: '#6d2323',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#f7f0f0' },
                    }}
                  >
                    Back to Period Setup
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (saving) return;
                    setShowScheduleModal(false);
                    setIsBulkSchedule(false);
                    setBulkTargetEmployees([]);
                    setBulkScheduleBlocks([]);
                  }}
                  disabled={saving}
                  sx={{
                    borderColor: '#ccc',
                    color: '#444',
                    fontWeight: 600,
                    textTransform: 'none',
                    minWidth: 90,
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleSubmitFromModal}
                  disabled={saving}
                  startIcon={
                    saving ? (
                      <CircularProgress size={15} sx={{ color: '#fff' }} />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  sx={{
                    bgcolor: '#6d2323',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'none',
                    minWidth: 140,
                    '&:hover': { bgcolor: '#5a1c1c' },
                    '&.Mui-disabled': { bgcolor: '#c0a0a0', color: '#fff' },
                  }}
                >
                  {saving ? 'Saving…' : 'Save Schedule'}
                </Button>
              </Box>
            </Box>
          </Dialog>

          {/* Bulk Confirmation */}
          <Dialog
            open={showBulkConfirmModal}
            onClose={() => {
              setShowBulkConfirmModal(false);
              setPendingBulkSubmit(false);
            }}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
              <Typography
                sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}
              >
                Confirm Bulk Schedule
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', px: 3, pt: 3, pb: 2 }}>
              <Typography
                sx={{ color: '#1a1a1a', lineHeight: 1.7, fontSize: '0.93rem' }}
              >
                You are about to create schedules for{' '}
                <Box
                  component="span"
                  sx={{ fontWeight: 700, color: '#6d2323' }}
                >
                  {bulkTargetEmployees.length} employee
                  {bulkTargetEmployees.length !== 1 ? 's' : ''}
                </Box>{' '}
                across{' '}
                <Box
                  component="span"
                  sx={{ fontWeight: 700, color: '#6d2323' }}
                >
                  {bulkScheduleBlocks.length} block
                  {bulkScheduleBlocks.length !== 1 ? 's' : ''}
                </Box>
                .
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: '#fff9f0',
                  border: '1px solid #f5d89a',
                  borderRadius: 1.5,
                }}
              >
                <Typography
                  sx={{
                    color: '#7a5000',
                    fontSize: '0.82rem',
                    lineHeight: 1.55,
                  }}
                >
                  ⚠ Existing active schedules for these employees will be set to
                  inactive. This cannot be undone.
                </Typography>
              </Box>
              <Typography sx={{ color: '#555', mt: 2, fontSize: '0.88rem' }}>
                Are you sure you want to proceed?
              </Typography>
            </Box>
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1.5,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => {
                  setShowBulkConfirmModal(false);
                  setPendingBulkSubmit(false);
                }}
                sx={{
                  borderColor: '#ccc',
                  color: '#444',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f5f5f5' },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={async () => {
                  setShowBulkConfirmModal(false);
                  setPendingBulkSubmit(false);
                  const trimmedId = String(employeeID || '').trim();
                  const sevenRows = DAYS_ORDER.map((day) => {
                    const r = modalRecords.find((x) => x.day === day);
                    return r ? { ...r, day } : makeDefaultRow(trimmedId, day);
                  });
                  await executeSave(sevenRows, trimmedId);
                }}
                sx={{
                  bgcolor: '#6d2323',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 120,
                  '&:hover': { bgcolor: '#5a1c1c' },
                }}
              >
                Yes, Proceed
              </Button>
            </Box>
          </Dialog>

          {/* Schedule Date Conflict */}
          <Dialog
            open={showConflictModal}
            onClose={() => setShowConflictModal(false)}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
              <Typography
                sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}
              >
                Schedule Conflict
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 2 }}>
              <Typography
                sx={{ color: '#1a1a1a', lineHeight: 1.7, fontSize: '0.93rem' }}
              >
                A schedule already exists for this employee during the selected
                dates:
              </Typography>
              <Box
                sx={{
                  mt: 1.5,
                  mb: 2,
                  px: 2,
                  py: 1.25,
                  bgcolor: '#f7f0f0',
                  border: '1px solid #d0b8b8',
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Schedule
                  sx={{ color: '#6d2323', fontSize: 16, flexShrink: 0 }}
                />
                <Typography
                  sx={{ fontWeight: 700, color: '#6d2323', fontSize: '0.9rem' }}
                >
                  {formatDateLong(draftStartDate) ||
                    formatDateOnly(draftStartDate)}
                  {' — '}
                  {formatDateLong(draftEndDate) || formatDateOnly(draftEndDate)}
                </Typography>
              </Box>
              <Typography
                sx={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.6 }}
              >
                Please choose a different date range that does not overlap with
                an existing schedule.
              </Typography>
            </Box>
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="contained"
                disableElevation
                onClick={() => setShowConflictModal(false)}
                sx={{
                  bgcolor: '#6d2323',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 80,
                  '&:hover': { bgcolor: '#5a1c1c' },
                }}
              >
                Got It
              </Button>
            </Box>
          </Dialog>

          {/* Bulk Schedule Blocks — redesigned */}
          <Dialog
            open={showBulkBlocksModal}
            onClose={() => setShowBulkBlocksModal(false)}
            maxWidth={false}
            PaperProps={{
              sx: {
                borderRadius: 2,
                overflow: 'hidden',
                width: 720,
                maxWidth: 720,
              },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PeopleIcon
                  sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    Create Bulk Schedule — Step 1 of 2
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '0.78rem',
                      mt: 0.25,
                    }}
                  >
                    Define schedule period for {bulkTargetEmployees.length}{' '}
                    selected employee
                    {bulkTargetEmployees.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => setShowBulkBlocksModal(false)}
                sx={{
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
                aria-label="Close"
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            {/* Stepper */}
            <Box
              sx={{
                bgcolor: '#f7f0f0',
                borderBottom: '1px solid #e2cece',
                px: 3,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Step 1 — active */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flex: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: '#6d2323',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      1
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: '#6d2323',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Current
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        color: '#1a1a1a',
                        fontWeight: 600,
                      }}
                    >
                      Define schedule period
                    </Typography>
                  </Box>
                </Box>

                {/* Progress line */}
                <Box
                  sx={{
                    flex: 1,
                    height: 2,
                    mx: 1.5,
                    borderRadius: 1,
                    background:
                      'linear-gradient(90deg, #6d2323 0%, #e0c8c8 100%)',
                  }}
                />

                {/* Step 2 — pending */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flex: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: '#fff',
                      border: '1.5px solid #d0b8b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#a08080',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      2
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: '#a08080',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Next
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#a08080' }}>
                      Set time schedule
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Body */}
            <Box sx={{ px: 3, pt: 2.5, pb: 0, bgcolor: '#fff' }}>
              {/* Selected employees — 2 per row */}
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#6d2323',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                }}
              >
                Selected employees ({bulkTargetEmployees.length})
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0.75,
                  mb: 2.5,
                  maxHeight: 200,
                  overflowY:
                    bulkTargetEmployees.length > 6 ? 'auto' : 'visible',
                  pr: bulkTargetEmployees.length > 6 ? 0.5 : 0,
                  '&::-webkit-scrollbar': { width: '5px' },
                  '&::-webkit-scrollbar-track': {
                    background: '#f7f0f0',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#d0b8b8',
                    borderRadius: '4px',
                  },
                }}
              >
                {bulkTargetEmployees.map((empId) => {
                  const u = allUsers.find(
                    (u) => String(u.employeeNumber) === String(empId),
                  );
                  const initials = (u?.fullName || String(empId))
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <Box
                      key={empId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.85,
                        bgcolor: '#faf5f5',
                        border: '0.5px solid #e8d8d8',
                        borderRadius: '4px',
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: '#f0e4e4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#6d2323',
                          }}
                        >
                          {initials}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: '#1a1a1a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {empId}
                          {u?.fullName ? ` — ${u.fullName}` : ''}
                        </Typography>
                        {u?.department && (
                          <Typography
                            sx={{
                              fontSize: '0.7rem',
                              color: '#888',
                              lineHeight: 1.2,
                            }}
                          >
                            {u.department}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Divider sx={{ mb: 2.5, borderColor: '#ede0e0' }} />

              {/* Schedule period form */}
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#6d2323',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                }}
              >
                Schedule period
              </Typography>
              <Box
                sx={{
                  border: '0.5px solid #e0d0d0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    bgcolor: '#f7f0f0',
                    px: 2,
                    py: 1.25,
                    borderBottom: '0.5px solid #e0d0d0',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#1a1a1a',
                    }}
                  >
                    Period details
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Academic year"
                        placeholder="e.g. 2025 - 2026"
                        value={bulkScheduleBlocks[0]?.academicYear || ''}
                        onChange={(e) =>
                          setBulkScheduleBlocks((prev) =>
                            prev.map((b, i) =>
                              i === 0
                                ? { ...b, academicYear: e.target.value }
                                : b,
                            ),
                          )
                        }
                        onBlur={(e) => {
                          const formatted = autoFormatAcademicYear(
                            e.target.value,
                          );
                          if (formatted !== e.target.value)
                            setBulkScheduleBlocks((prev) =>
                              prev.map((b, i) =>
                                i === 0 ? { ...b, academicYear: formatted } : b,
                              ),
                            );
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                            borderColor: '#6d2323',
                          },
                          '& label.Mui-focused': { color: '#6d2323' },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Autocomplete
                        freeSolo
                        options={[
                          '1st Semester',
                          '2nd Semester',
                          'Summer',
                          'Vacation',
                          'Christmas break',
                          'Midyear',
                          'Enrollment period',
                        ]}
                        value={bulkScheduleBlocks[0]?.semester || ''}
                        onInputChange={(_, value) =>
                          setBulkScheduleBlocks((prev) =>
                            prev.map((b, i) =>
                              i === 0 ? { ...b, semester: value ?? '' } : b,
                            ),
                          )
                        }
                        onChange={(_, value) =>
                          setBulkScheduleBlocks((prev) =>
                            prev.map((b, i) =>
                              i === 0
                                ? {
                                    ...b,
                                    semester:
                                      typeof value === 'string' ? value : '',
                                  }
                                : b,
                            ),
                          )
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Semester"
                            placeholder="e.g. 1st Semester"
                            sx={{
                              '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                              },
                              '& label.Mui-focused': { color: '#6d2323' },
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Start date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={bulkScheduleBlocks[0]?.startDate || ''}
                        onChange={(e) =>
                          setBulkScheduleBlocks((prev) =>
                            prev.map((b, i) =>
                              i === 0 ? { ...b, startDate: e.target.value } : b,
                            ),
                          )
                        }
                        sx={{
                          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                            borderColor: '#6d2323',
                          },
                          '& label.Mui-focused': { color: '#6d2323' },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="End date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={bulkScheduleBlocks[0]?.endDate || ''}
                        onChange={(e) =>
                          setBulkScheduleBlocks((prev) =>
                            prev.map((b, i) =>
                              i === 0 ? { ...b, endDate: e.target.value } : b,
                            ),
                          )
                        }
                        sx={{
                          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                            borderColor: '#6d2323',
                          },
                          '& label.Mui-focused': { color: '#6d2323' },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1.5,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setShowBulkBlocksModal(false)}
                sx={{
                  borderColor: '#ccc',
                  color: '#444',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f5f5f5' },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={handleConfirmBulkBlocks}
                disabled={
                  !bulkScheduleBlocks[0]?.academicYear ||
                  !bulkScheduleBlocks[0]?.semester ||
                  !bulkScheduleBlocks[0]?.startDate ||
                  !bulkScheduleBlocks[0]?.endDate ||
                  !bulkTargetEmployees.length
                }
                endIcon={<ArrowForward fontSize="small" />}
                sx={{
                  bgcolor: '#6d2323',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 200,
                  '&:hover': { bgcolor: '#5a1c1c' },
                  '&.Mui-disabled': { bgcolor: '#d0b8b8', color: '#fff' },
                }}
              >
                Next: Set Time Schedule
              </Button>
            </Box>
          </Dialog>

          {/* Warning / Error */}
          <Dialog
            open={showWarningModal}
            onClose={() => {
              setShowWarningModal(false);
              setWarningOverlap(null);
            }}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
              <Typography
                sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}
              >
                {warningOverlap
                  ? 'Time Schedule Conflict Detected'
                  : 'Cannot Save'}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 2 }}>
              {warningOverlap ? (
                <Box>
                  <Typography
                    sx={{
                      color: '#1a1a1a',
                      fontSize: '0.93rem',
                      mb: 2,
                      lineHeight: 1.65,
                    }}
                  >
                    Two time blocks overlap on{' '}
                    <Box
                      component="span"
                      sx={{ fontWeight: 700, color: '#6d2323' }}
                    >
                      {warningOverlap.day}
                    </Box>
                    {warningOverlap.employeeID &&
                      warningOverlap.employeeID !== 'multiple' && (
                        <>
                          {' '}
                          for employee{' '}
                          <Box
                            component="span"
                            sx={{ fontWeight: 700, color: '#6d2323' }}
                          >
                            {warningOverlap.employeeID}
                          </Box>
                        </>
                      )}
                    :
                  </Typography>
                  <Box
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: '#f7f0f0',
                        px: 2,
                        py: 1.5,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: '#6d2323',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {warningOverlap.segmentA?.label || 'Block A'}
                      </Box>
                      <Typography
                        sx={{
                          color: '#444',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        overlaps with
                      </Typography>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: '#1a1a1a',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {warningOverlap.segmentB?.label || 'Block B'}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: '#fff',
                        borderTop: '1px solid #f0e0e0',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.85rem', color: '#444' }}>
                        Overlapping period:{' '}
                        <Box
                          component="span"
                          sx={{ fontWeight: 700, color: '#6d2323' }}
                        >
                          {warningOverlap.overlap?.periodText || '—'}
                        </Box>
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    sx={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.6 }}
                  >
                    Please go back and adjust the time entries so that Work
                    Days, Honorarium, Service Credits, and Overtime do not
                    overlap.
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    color: '#1a1a1a',
                    lineHeight: 1.7,
                    fontSize: '0.93rem',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {warningMessage}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="contained"
                disableElevation
                onClick={() => {
                  setShowWarningModal(false);
                  setWarningOverlap(null);
                }}
                sx={{
                  bgcolor: '#6d2323',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 90,
                  '&:hover': { bgcolor: '#5a1c1c' },
                }}
              >
                OK, Go Back
              </Button>
            </Box>
          </Dialog>

          {/* ════ View Schedule (read-only / editable for Active) ════
              CHANGES:
              - Footer left side: REMOVED Close button (was "Close" for non-editing)
              - Footer right side: Edit Schedule button now lives here (alongside Save/Cancel)
          */}
          <Dialog
            open={showViewScheduleModal}
            onClose={() => {
              setShowViewScheduleModal(false);
              setIsEditingViewSchedule(false);
              setEditViewRecords([]);
              setEditViewEndDate('');
            }}
            maxWidth="xl"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minWidth: 0,
                }}
              >
                {isEditingViewSchedule ? (
                  <Edit sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }} />
                ) : (
                  <Visibility
                    sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }}
                  />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {isEditingViewSchedule
                      ? 'Edit Official Time Schedule'
                      : 'View Official Time Schedule'}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.78rem',
                      mt: 0.25,
                    }}
                  >
                    {(() => {
                      const id = String(employeeID || '').trim();
                      const name =
                        viewScheduleEmployeeName || resolveEmployeeName(id);
                      return id
                        ? name
                          ? `${id} — ${name}`
                          : `Employee No. ${id}`
                        : 'Employee schedule';
                    })()}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  setShowViewScheduleModal(false);
                  setIsEditingViewSchedule(false);
                  setEditViewRecords([]);
                  setEditViewEndDate('');
                }}
                sx={{
                  color: '#fff',
                  ml: 1,
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
                aria-label="Close"
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 0 }}>
              {viewScheduleInfo && (
                <>
                  {/* Schedule info header */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 3,
                      mb: 2.5,
                      p: 2,
                      bgcolor: '#f7f0f0',
                      border: '1px solid #e2cece',
                      borderRadius: 1.5,
                      alignItems: 'flex-end',
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#6d2323',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Academic Year
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: '#1a1a1a',
                          fontSize: '0.88rem',
                          mt: 0.25,
                        }}
                      >
                        {viewScheduleInfo.academicYear || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#6d2323',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Start Date
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: '#1a1a1a',
                          fontSize: '0.88rem',
                          mt: 0.25,
                        }}
                      >
                        {formatDateLong(viewScheduleInfo.startDate) ||
                          formatDateOnly(viewScheduleInfo.startDate)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#6d2323',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          mb: 0.5,
                        }}
                      >
                        End Date
                        {isEditingViewSchedule && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.75,
                              fontSize: '0.65rem',
                              color: '#2e7d32',
                              fontWeight: 600,
                              textTransform: 'none',
                              letterSpacing: 0,
                            }}
                          >
                            (editable)
                          </Box>
                        )}
                      </Typography>
                      {isEditingViewSchedule ? (
                        <TextField
                          size="small"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={editViewEndDate}
                          onChange={(e) => setEditViewEndDate(e.target.value)}
                          inputProps={{
                            min:
                              normalizeDateStr(viewScheduleInfo.startDate) ||
                              undefined,
                          }}
                          sx={{
                            bgcolor: '#fff',
                            minWidth: 160,
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.85rem',
                              '&.Mui-focused fieldset': {
                                borderColor: '#6d2323',
                              },
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#6d2323',
                            },
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: '#1a1a1a',
                            fontSize: '0.88rem',
                          }}
                        >
                          {formatDateLong(viewScheduleInfo.endDate) ||
                            formatDateOnly(viewScheduleInfo.endDate)}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#6d2323',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {(() => {
                          const isActive =
                            String(
                              viewScheduleInfo.status || 'active',
                            ).toLowerCase() === 'active';
                          return (
                            <Box
                              component="span"
                              sx={{
                                px: 1.25,
                                py: 0.3,
                                borderRadius: 1,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                bgcolor: isActive ? '#e8f5e9' : '#fff9f0',
                                color: isActive ? '#2e7d32' : '#7a5000',
                                border: '1px solid',
                                borderColor: isActive ? '#c8e6c9' : '#f5d89a',
                              }}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Box>
                          );
                        })()}
                      </Box>
                    </Box>
                  </Box>

                  {/* Tab bar */}
                  <Box
                    sx={{
                      display: 'flex',
                      border: '1px solid #d0b8b8',
                      borderRadius: 1,
                      overflow: 'hidden',
                      mb: 2,
                    }}
                  >
                    {[
                      { key: 'workDays', label: 'Work Days' },
                      { key: 'honorarium', label: 'Honorarium' },
                      { key: 'serviceCredits', label: 'Service Credits' },
                      { key: 'overtime', label: 'Overtime' },
                    ].map(({ key, label }, i, arr) => {
                      const activeKey = isEditingViewSchedule
                        ? editViewScheduleView
                        : viewScheduleView;
                      const setActiveKey = isEditingViewSchedule
                        ? setEditViewScheduleView
                        : setViewScheduleView;
                      return (
                        <Button
                          key={key}
                          onClick={() => setActiveKey(key)}
                          disableElevation
                          fullWidth
                          sx={{
                            borderRadius: 0,
                            textTransform: 'none',
                            fontWeight: activeKey === key ? 700 : 400,
                            fontSize: '0.82rem',
                            py: 0.9,
                            bgcolor: activeKey === key ? '#6d2323' : '#fff',
                            color: activeKey === key ? '#fff' : '#444',
                            borderRight:
                              i < arr.length - 1 ? '1px solid #d0b8b8' : 'none',
                            '&:hover': {
                              bgcolor:
                                activeKey === key ? '#5a1c1c' : '#f7f0f0',
                            },
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </Box>

                  {/* Time table */}
                  <TableContainer
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      mb: 3,
                    }}
                  >
                    <Table size="small">
                      {isEditingViewSchedule ? (
                        <ScheduleTimeRows
                          records={[...editViewRecords].sort(
                            (a, b) =>
                              DAYS_ORDER.indexOf(a.day || '') -
                              DAYS_ORDER.indexOf(b.day || ''),
                          )}
                          onChangeRecord={(index, field, value) => {
                            const sorted = [...editViewRecords].sort(
                              (a, b) =>
                                DAYS_ORDER.indexOf(a.day || '') -
                                DAYS_ORDER.indexOf(b.day || ''),
                            );
                            const day = sorted[index]?.day;
                            setEditViewRecords((prev) =>
                              prev.map((r) =>
                                r.day === day ? { ...r, [field]: value } : r,
                              ),
                            );
                          }}
                          scheduleView={editViewScheduleView}
                          readOnly={false}
                        />
                      ) : (
                        <ScheduleTimeRows
                          records={[...viewScheduleRecords].sort(
                            (a, b) =>
                              DAYS_ORDER.indexOf(a.day || '') -
                              DAYS_ORDER.indexOf(b.day || ''),
                          )}
                          onChangeRecord={() => {}}
                          scheduleView={viewScheduleView}
                          readOnly
                        />
                      )}
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>

            {/* ── Footer — Edit Schedule button is now on the RIGHT ── */}
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              {isEditingViewSchedule ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleCancelEditViewSchedule}
                    disabled={editViewSaving}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#666',
                      color: '#444',
                      '&:hover': { bgcolor: '#f5f5f5' },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={
                      editViewSaving ? (
                        <CircularProgress size={16} sx={{ color: '#fff' }} />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    onClick={handleSaveEditedSchedule}
                    disabled={editViewSaving}
                    sx={{
                      bgcolor: '#6d2323',
                      color: '#fff',
                      fontWeight: 700,
                      textTransform: 'none',
                      minWidth: 130,
                      '&:hover': { bgcolor: '#5a1c1c' },
                    }}
                  >
                    {editViewSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setShowViewScheduleModal(false)}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#ccc',
                      color: '#444',
                      '&:hover': { bgcolor: '#f5f5f5' },
                    }}
                  >
                    Close
                  </Button>
                  {/* Edit Schedule only shows for Active schedules */}
                  {viewScheduleInfo &&
                    String(
                      viewScheduleInfo.status || 'active',
                    ).toLowerCase() === 'active' && (
                      <Button
                        variant="contained"
                        disableElevation
                        startIcon={<Edit />}
                        onClick={handleStartEditViewSchedule}
                        sx={{
                          fontWeight: 700,
                          textTransform: 'none',
                          bgcolor: '#6d2323',
                          color: '#fff',
                          '&:hover': { bgcolor: '#5a1c1c' },
                        }}
                      >
                        Edit Schedule
                      </Button>
                    )}
                </>
              )}
            </Box>
          </Dialog>

          {/* Upload Preview */}
          <Dialog
            open={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            maxWidth="xl"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            <Box
              sx={{
                bgcolor: '#6d2323',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minWidth: 0,
                }}
              >
                <Visibility
                  sx={{ color: '#fff', fontSize: 20, flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    Upload Preview
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.78rem',
                      mt: 0.25,
                    }}
                  >
                    {previewRecords.length > 0 && previewRecords[0].employeeID
                      ? (() => {
                          const id = String(previewRecords[0].employeeID);
                          const u = allUsers.find(
                            (u) => String(u.employeeNumber) === id,
                          );
                          return u
                            ? `${id} — ${u.fullName}`
                            : `Employee No. ${id}`;
                        })()
                      : 'Uploaded schedule data'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => setShowPreviewModal(false)}
                sx={{
                  color: '#fff',
                  ml: 1,
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
                aria-label="Close"
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ bgcolor: '#fff', px: 3, pt: 2.5, pb: 0 }}>
              {previewScheduleInfo && (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 3,
                      mb: 2.5,
                      p: 2,
                      bgcolor: '#f7f0f0',
                      border: '1px solid #e2cece',
                      borderRadius: 1.5,
                    }}
                  >
                    {[
                      {
                        label: 'Academic Year',
                        value: previewScheduleInfo.academicYear || '—',
                      },
                      {
                        label: 'Start Date',
                        value:
                          formatDateLong(previewScheduleInfo.startDate) ||
                          formatDateOnly(previewScheduleInfo.startDate),
                      },
                      {
                        label: 'End Date',
                        value:
                          formatDateLong(previewScheduleInfo.endDate) ||
                          formatDateOnly(previewScheduleInfo.endDate),
                      },
                    ].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#6d2323',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: '#1a1a1a',
                            fontSize: '0.88rem',
                            mt: 0.25,
                          }}
                        >
                          {value}
                        </Typography>
                      </Box>
                    ))}
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#6d2323',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Box
                          component="span"
                          sx={{
                            px: 1.25,
                            py: 0.3,
                            borderRadius: 1,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            bgcolor: '#e8f5e9',
                            color: '#2e7d32',
                            border: '1px solid #c8e6c9',
                          }}
                        >
                          Active
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      border: '1px solid #d0b8b8',
                      borderRadius: 1,
                      overflow: 'hidden',
                      mb: 2,
                    }}
                  >
                    {[
                      { key: 'workDays', label: 'Work Days' },
                      { key: 'honorarium', label: 'Honorarium' },
                      { key: 'serviceCredits', label: 'Service Credits' },
                      { key: 'overtime', label: 'Overtime' },
                    ].map(({ key, label }, i, arr) => (
                      <Button
                        key={key}
                        onClick={() => setPreviewViewScheduleView(key)}
                        disableElevation
                        fullWidth
                        sx={{
                          borderRadius: 0,
                          textTransform: 'none',
                          fontWeight:
                            previewViewScheduleView === key ? 700 : 400,
                          fontSize: '0.82rem',
                          py: 0.9,
                          bgcolor:
                            previewViewScheduleView === key
                              ? '#6d2323'
                              : '#fff',
                          color:
                            previewViewScheduleView === key ? '#fff' : '#444',
                          borderRight:
                            i < arr.length - 1 ? '1px solid #d0b8b8' : 'none',
                          '&:hover': {
                            bgcolor:
                              previewViewScheduleView === key
                                ? '#5a1c1c'
                                : '#f7f0f0',
                          },
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </Box>

                  <TableContainer
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      mb: 3,
                    }}
                  >
                    <Table size="small">
                      <ScheduleTimeRows
                        records={[...previewRecords].sort(
                          (a, b) =>
                            DAYS_ORDER.indexOf(a.day || '') -
                            DAYS_ORDER.indexOf(b.day || ''),
                        )}
                        onChangeRecord={() => {}}
                        scheduleView={previewViewScheduleView}
                        readOnly
                      />
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="contained"
                disableElevation
                onClick={() => setShowPreviewModal(false)}
                sx={{
                  bgcolor: '#6d2323',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 80,
                  '&:hover': { bgcolor: '#5a1c1c' },
                }}
              >
                Close
              </Button>
            </Box>
          </Dialog>

          <Dialog
            open={showAnalyzeModal}
            onClose={() => {
              if (confirming) return;
              setShowAnalyzeModal(false);
              setAnalyzeResult(null);
              setUploadAcknowledgeChecked(false);
            }}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
          >
            {/* Header */}
            <Box
              sx={{
                bgcolor: analyzeResult?.ok ? '#6d2323' : '#b45309',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {analyzeResult?.ok ? (
                  <CheckCircle sx={{ color: '#a8e6a3', fontSize: 20 }} />
                ) : (
                  <WarningAmber sx={{ color: '#ffd180', fontSize: 20 }} />
                )}
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {analyzeResult?.ok
                      ? 'Validation Complete — Ready to Upload'
                      : 'Validation Failed — Action Required'}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '0.78rem',
                      mt: 0.25,
                    }}
                  >
                    {analyzeResult?.ok
                      ? 'Review the schedule details below before confirming the upload.'
                      : 'Review the validation warnings below, fix your file, then re-upload.'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  if (confirming) return;
                  setShowAnalyzeModal(false);
                  setAnalyzeResult(null);
                  setUploadAcknowledgeChecked(false);
                }}
                disabled={confirming}
                sx={{
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box
              sx={{
                bgcolor: '#fff',
                px: 3,
                pt: 2.5,
                pb: 1,
                maxHeight: '65vh',
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-thumb': {
                  background: '#d0b8b8',
                  borderRadius: '4px',
                },
              }}
            >
              {analyzeResult?.ok ? (
                <>
                  {/* ── SUCCESS: Schedule blocks found ── */}
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#6d2323',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mb: 1,
                    }}
                  >
                    Schedules to be uploaded (
                    {analyzeResult.schedules?.length || 0} block
                    {analyzeResult.schedules?.length !== 1 ? 's' : ''})
                  </Typography>

                  <Box
                    sx={{
                      border: '0.5px solid #e0d0d0',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      mb: 2.5,
                    }}
                  >
                    {/* Column headers */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.2fr 1fr 1fr 60px',
                        bgcolor: '#f7f0f0',
                        borderBottom: '0.5px solid #e0d0d0',
                        px: 2,
                        py: 1,
                      }}
                    >
                      {[
                        'Employee ID',
                        'Academic Year',
                        'Start Date',
                        'End Date',
                        'Rows',
                      ].map((h) => (
                        <Typography
                          key={h}
                          sx={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#6d2323',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          {h}
                        </Typography>
                      ))}
                    </Box>
                    {(analyzeResult.schedules || []).map((s, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1.2fr 1fr 1fr 60px',
                          px: 2,
                          py: 1.1,
                          bgcolor: idx % 2 === 0 ? '#fff' : '#faf5f5',
                          borderBottom:
                            idx < (analyzeResult.schedules?.length || 0) - 1
                              ? '0.5px solid #f0e8e8'
                              : 'none',
                          alignItems: 'center',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.83rem',
                            fontWeight: 600,
                            color: '#1a1a1a',
                          }}
                        >
                          {s.employeeID}
                        </Typography>
                        <Typography sx={{ fontSize: '0.83rem', color: '#333' }}>
                          {s.academicYear || '—'}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.83rem',
                            color: '#333',
                            fontFamily: 'monospace',
                          }}
                        >
                          {s.startDate}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.83rem',
                            color: '#333',
                            fontFamily: 'monospace',
                          }}
                        >
                          {s.endDate}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: '#e8f5e9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#2e7d32',
                              }}
                            >
                              {s.rows}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* ── Status change notice ── */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.25,
                      p: 1.75,
                      mb: 2,
                      bgcolor: '#fff9f0',
                      border: '1px solid #f5d89a',
                      borderRadius: '6px',
                    }}
                  >
                    <WarningAmber
                      sx={{
                        color: '#b45309',
                        fontSize: 18,
                        flexShrink: 0,
                        mt: 0.1,
                      }}
                    />
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#7a5000',
                          mb: 0.4,
                        }}
                      >
                        Status Change Notice
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          color: '#7a5000',
                          lineHeight: 1.6,
                        }}
                      >
                        All <strong>existing active schedules</strong> for the
                        employees listed above will be set to{' '}
                        <strong>Inactive</strong>. The uploaded schedules will
                        be set to <strong>Active</strong>. This cannot be undone
                        automatically — previous data remains in the database
                        but will be inactive.
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      p: 1.25,
                      mb: 2,
                      bgcolor: '#fff',
                      border: '1px solid #e7d4d4',
                      borderRadius: '6px',
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={uploadAcknowledgeChecked}
                      onChange={(e) =>
                        setUploadAcknowledgeChecked(e.target.checked)
                      }
                      sx={{ color: '#6d2323', mt: '-2px' }}
                    />
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        color: '#4a1c1c',
                        lineHeight: 1.55,
                      }}
                    >
                      I confirm that I reviewed this upload and understand that
                      current active schedules for listed employees will be set
                      to Inactive before the new schedules are activated.
                    </Typography>
                  </Box>

                  {/* ── Warnings (skipped rows, status overrides, audit truncation) ── */}
                  {(analyzeResult.warnings || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#b45309',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mb: 0.75,
                        }}
                      >
                        Warnings ({analyzeResult.warnings.length})
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid #f5d89a',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        {analyzeResult.warnings.map((w, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1,
                              px: 1.75,
                              py: 0.9,
                              bgcolor: idx % 2 === 0 ? '#fffdf5' : '#fff9f0',
                              borderBottom:
                                idx < analyzeResult.warnings.length - 1
                                  ? '0.5px solid #f5e8c0'
                                  : 'none',
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: '#b45309',
                                mt: 0.7,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: '0.79rem',
                                color: '#7a5000',
                                lineHeight: 1.55,
                              }}
                            >
                              {w}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                <>
                  {(() => {
                    const uniqueValidationErrors = dedupeErrorMessages(
                      analyzeResult?.allErrors || [],
                      analyzeResult?.message || '',
                    );

                    return (
                      <>
                  {/* ── ERRORS ── */}
                  {analyzeResult?.message && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.25,
                        p: 1.75,
                        mb: 2.5,
                        bgcolor: '#fff9f0',
                        border: '1px solid #f5d89a',
                        borderRadius: '6px',
                      }}
                    >
                      <WarningAmber
                        sx={{
                          color: '#b45309',
                          fontSize: 18,
                          flexShrink: 0,
                          mt: 0.1,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.83rem',
                          color: '#7a5000',
                          lineHeight: 1.6,
                        }}
                      >
                        {analyzeResult?.message}
                      </Typography>
                    </Box>
                  )}

                  {/* Time errors */}
                  {(analyzeResult?.timeErrors || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#c62828',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mb: 0.75,
                        }}
                      >
                        Time Format Errors ({analyzeResult.timeErrors.length})
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid #ffcdd2',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        {analyzeResult.timeErrors.map((e, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              px: 1.75,
                              py: 0.85,
                              bgcolor: idx % 2 === 0 ? '#fff' : '#fff5f5',
                              borderBottom:
                                idx < analyzeResult.timeErrors.length - 1
                                  ? '0.5px solid #ffcdd2'
                                  : 'none',
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: '#7a0000',
                              }}
                            >
                              Row {e.row} — {e.employeeID} ({e.day}) — {e.field}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                color: '#c62828',
                                mt: 0.2,
                              }}
                            >
                              {e.reason}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* All errors (overlap, date conflicts) */}
                  {uniqueValidationErrors.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          p: 1.2,
                          mb: 1,
                          bgcolor: '#fff3db',
                          border: '1px solid #f0c36d',
                          borderRadius: '6px',
                        }}
                      >
                        <WarningAmber
                          sx={{ color: '#b45309', fontSize: 16, mt: 0.1 }}
                        />
                        <Box>
                          <Typography
                            sx={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              color: '#8a4b00',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              mb: 0.25,
                            }}
                          >
                            Most Important Issue
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.79rem',
                              color: '#7a5000',
                              lineHeight: 1.5,
                              fontWeight: 700,
                            }}
                          >
                            {uniqueValidationErrors[0]?.message}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#b45309',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mb: 0.75,
                        }}
                      >
                        Validation Warnings ({uniqueValidationErrors.length})
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid #f5d89a',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        {uniqueValidationErrors.map((e, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              px: 1.75,
                              py: 0.85,
                              bgcolor:
                                idx === 0
                                  ? '#fff3db'
                                  : idx % 2 === 0
                                    ? '#fffdf5'
                                    : '#fff9f0',
                              borderLeft:
                                idx === 0
                                  ? '3px solid #d97706'
                                  : '3px solid transparent',
                              borderBottom:
                                idx < uniqueValidationErrors.length - 1
                                  ? '0.5px solid #f5e8c0'
                                  : 'none',
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.78rem',
                                color: '#7a5000',
                                lineHeight: 1.55,
                                fontWeight: idx === 0 ? 700 : 500,
                              }}
                            >
                              {e.message}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Skipped rows */}
                  {(analyzeResult?.skippedRows || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#b45309',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          mb: 0.75,
                        }}
                      >
                        Skipped Rows ({analyzeResult.skippedRows.length})
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid #f5d89a',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        {analyzeResult.skippedRows.map((r, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              px: 1.75,
                              py: 0.75,
                              bgcolor: idx % 2 === 0 ? '#fffdf5' : '#fff9f0',
                              borderBottom:
                                idx < analyzeResult.skippedRows.length - 1
                                  ? '0.5px solid #f5e8c0'
                                  : 'none',
                            }}
                          >
                            <Typography
                              sx={{ fontSize: '0.78rem', color: '#7a5000' }}
                            >
                              Row {r.row}
                              {r.employeeID ? ` — ${r.employeeID}` : ''}
                              {r.day ? ` (${r.day})` : ''}: {r.reason}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                      </>
                    );
                  })()}
                </>
              )}
            </Box>

            {/* Footer */}
            <Box
              sx={{
                borderTop: '1px solid #e0e0e0',
                bgcolor: '#fafafa',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Button
                variant="outlined"
                onClick={() => {
                  setShowAnalyzeModal(false);
                  setAnalyzeResult(null);
                  setUploadAcknowledgeChecked(false);
                }}
                disabled={confirming}
                sx={{
                  borderColor: '#ccc',
                  color: '#444',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f5f5f5' },
                }}
              >
                {analyzeResult?.ok ? 'Cancel' : 'Close'}
              </Button>

              {analyzeResult?.ok && (
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleConfirmUpload}
                  disabled={confirming || !uploadAcknowledgeChecked}
                  startIcon={
                    confirming ? (
                      <CircularProgress size={15} sx={{ color: '#fff' }} />
                    ) : (
                      <CloudUploadIcon />
                    )
                  }
                  sx={{
                    bgcolor: '#6d2323',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'none',
                    minWidth: 180,
                    '&:hover': { bgcolor: '#5a1c1c' },
                    '&.Mui-disabled': { bgcolor: '#c0a0a0', color: '#fff' },
                  }}
                >
                  {confirming ? 'Uploading…' : 'Confirm & Upload'}
                </Button>
              )}
            </Box>
          </Dialog>

          <SuccessfulOverlay open={successOpen} action={successAction} />
        </Box>
      </Box>
    </>
  );
};

export default OfficialTimeForm;
