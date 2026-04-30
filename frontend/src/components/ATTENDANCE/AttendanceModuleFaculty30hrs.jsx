import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  InputAdornment,
  Avatar,
  IconButton,
  Tooltip,
  Fade,
  Alert,
  alpha,
  Chip,
  styled,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Collapse,
  Paper,
  Fab,
  Zoom,
  TextField,
  List,
  ListItemButton,
} from '@mui/material';
import {
  WorkHistory,
  Person,
  CalendarToday,
  Clear,
  SaveAs,
  Refresh,
  ExpandLess,
  ExpandMore,
  Schedule,
  Star,
  CreditScore,
  AccessTime,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  FilterList,
  KeyboardArrowUp,
  Search,
  SearchOutlined,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import useAttendanceRealtimeRefresh from '../../hooks/useAttendanceRealtimeRefresh';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import { computeAbsentDays } from './attendanceMetrics';
import {
  postAttendanceDevicePreflightNoSync,
  fetchAttendanceCalendarMaps,
  getLeaveStatusLabelForDate,
} from './attendanceLeaveIntegration';
import { getAuthHeaders } from '../../utils/auth';
import OverallAttendanceCompareModal from './OverallAttendanceCompareModal';
import {
  mergeOverallPayload,
  overallRecordsDiffer,
  OVERALL_COMPARE_FIELD_META,
} from './overallAttendanceMerge';

// ─── Theme tokens (unified with ViewAttendanceRecord) ──────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

// ─── Shimmer keyframes ─────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Shimmer bone ──────────────────────────────────────────────────────────
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe skeleton ────────────────────────────────────────────────────
const AttendanceFacultyWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          animation: 'blink 2s ease-in-out infinite',
        }}
      >
        <Box
          sx={{
            px: 4,
            py: 3,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.12)',
            }}
          />
          <Box>
            <Bone w={280} h={18} sx={{ mb: 1 }} />
            <Bone w={380} h={11} />
          </Box>
        </Box>
      </Box>
      {/* Controls */}
      <Box
        sx={{
          mb: 2,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          bgcolor: '#fff',
          animation: 'blink 2s ease-in-out 0.1s infinite',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: T.accentFaint,
            borderBottom: `1px solid ${T.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minHeight: 42,
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.2)',
            }}
          />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              />
            ))}
          </Box>
          <Box
            sx={{
              border: `2px dashed ${T.accentBorder}`,
              borderRadius: '8px',
              p: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 64,
                    height: 36,
                    borderRadius: '6px',
                    bgcolor: T.accentFaint,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Table */}
      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.09)',
          bgcolor: '#fff',
          animation: 'blink 2s ease-in-out 0.2s infinite',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: T.accent,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 2,
          }}
        >
          {[100, 80, 80, 80].map((w, i) => (
            <Box
              key={i}
              sx={{
                height: 10,
                width: w,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              px: 2.5,
              py: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 2,
              alignItems: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd,
            }}
          >
            <Bone w={120} h={12} />
            <Bone w={80} h={12} />
            <Bone w={80} h={12} />
            <Box
              sx={{
                width: 90,
                height: 24,
                borderRadius: '12px',
                bgcolor: T.accentFaint,
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Styled primitives ─────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

// ─── Panel header bar ──────────────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, rightContent }) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: T.accentFaint,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>
        {title}
      </Typography>
    </Box>
    {rightContent}
  </Box>
);

// ─── Native input ──────────────────────────────────────────────────────────
const NativeInput = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  icon,
}) => (
  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && (
      <Box
        sx={{
          position: 'absolute',
          left: 10,
          color: T.accentMid,
          display: 'flex',
          alignItems: 'center',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {icon}
      </Box>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        padding: icon ? '9px 13px 9px 34px' : '9px 13px',
        borderRadius: '8px',
        border: `1px solid ${T.accentBorder}`,
        fontSize: '0.875rem',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff',
        color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.target.style.borderColor = T.accent;
          e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`;
        }
      }}
      onBlur={(e) => {
        e.target.style.borderColor = T.accentBorder;
        e.target.style.boxShadow = 'none';
      }}
    />
  </Box>
);

// ─── Employee search (same behavior as AttendanceDevice) ───────────────────
const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const formatFullNameForSearch = (fullName) => {
  if (!fullName) return '';
  const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
  let suffix = '';
  if (suffixes.has(parts[parts.length - 1]?.toUpperCase())) suffix = parts.pop();
  if (parts.length === 1) return suffix ? `${parts[0]} ${suffix}` : parts[0];
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleFormatted = parts
    .slice(1, parts.length - 1)
    .map((m) => {
      const mm = String(m).replace(/\./g, '');
      return mm.length === 1 ? `${mm.toUpperCase()}.` : m;
    })
    .join(' ');
  const base = `${lastName}, ${firstName}${middleFormatted ? ` ${middleFormatted}` : ''}`;
  return suffix ? `${base} ${suffix}` : base;
};

const EmployeeSearchField = ({
  value,
  onSelectEmployeeNumber,
  disabled = false,
}) => {
  const [query, setQuery] = useState(value || '');
  const [debouncedQuery, setDebouncedQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
    setDebouncedQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    axios
      .get(`${API_BASE_URL}/users/search`, {
        params: { q },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setResults(list.slice(0, 20));
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        setResults([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, open]);

  const queueSearch = (nextValue) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(nextValue);
      setOpen(true);
    }, 220);
  };

  const handleInputChange = (e) => {
    const next = e.target.value;
    onSelectEmployeeNumber(next);
    setQuery(next);
    queueSearch(next);
  };
  const handleSelect = (emp) => {
    const num = emp?.employeeNumber ? String(emp.employeeNumber) : '';
    onSelectEmployeeNumber(num);
    setQuery(num);
    setDebouncedQuery(num);
    setOpen(false);
  };
  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setOpen(false);
    onSelectEmployeeNumber('');
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <FieldInput
        fullWidth
        size="small"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Type name or employee number..."
        disabled={disabled}
        autoComplete="off"
        inputProps={{ autoComplete: 'new-password' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined sx={{ color: T.muted, fontSize: 16 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={14} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <CloseIcon sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
      />
      {open && (
        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            maxHeight: 280,
            overflow: 'auto',
            borderRadius: '10px',
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 2.5,
              }}
            >
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>
                Searching...
              </Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding>
              {results.map((emp) => (
                <ListItemButton
                  key={emp.employeeNumber}
                  onClick={() => handleSelect(emp)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderBottom: `1px solid ${T.divider}`,
                    '&:hover': { bgcolor: T.accentFaint },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.83rem',
                        fontWeight: 700,
                        color: T.text,
                        lineHeight: 1.2,
                      }}
                    >
                      {formatFullNameForSearch(emp.fullName)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                      #{emp.employeeNumber}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 2.5, textAlign: 'center' }}>
              <Typography
                sx={{
                  fontSize: '0.78rem',
                  color: T.faint,
                  fontStyle: 'italic',
                }}
              >
                {query.trim().length >= 2
                  ? `No registered user found for "${query.trim()}"`
                  : 'Type at least 2 characters to search users'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Row action button ─────────────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '8px',
      padding: '9px 18px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.85rem',
      fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background-color 0.15s, border-color 0.15s',
      whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = hoverBg;
        e.currentTarget.style.borderColor = color;
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = `${color}40`;
    }}
  >
    {icon}
    {label}
  </button>
);

// ─── Quick filter button ───────────────────────────────────────────────────
const QuickBtn = ({ label, icon, onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? T.accent : 'transparent',
      border: `1px solid ${active ? T.accent : T.accentBorder}`,
      borderRadius: '6px',
      padding: '6px 14px',
      cursor: 'pointer',
      color: active ? '#fff' : T.accent,
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '0.78rem',
      fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = T.accentFaint;
        e.currentTarget.style.borderColor = T.accent;
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = T.accentBorder;
      }
    }}
  >
    {icon}
    {label}
  </button>
);

// ─── Compact table cell ────────────────────────────────────────────────────
const CompactTableCell = styled(TableCell)(({ isHeader }) => ({
  fontWeight: isHeader ? 700 : 500,
  padding: '10px 14px',
  borderBottom: `1px solid ${T.divider}`,
  fontSize: isHeader ? '0.65rem' : '0.8rem',
  letterSpacing: isHeader ? '0.08em' : '0.01em',
  color: isHeader ? '#fff' : T.text,
  whiteSpace: 'nowrap',
}));

// ─── Grace period constant ─────────────────────────────────────────────────
const GRACE_PERIOD_MS = 15 * 60 * 1000;

// ─── Tab definitions ───────────────────────────────────────────────────────
const VIEW_TABS = [
  {
    key: 'regular',
    label: 'Regular Time',
    icon: <Schedule sx={{ fontSize: 14 }} />,
  },
  {
    key: 'honorarium',
    label: 'Honorarium',
    icon: <Star sx={{ fontSize: 14 }} />,
  },
  {
    key: 'serviceCredit',
    label: 'Service Credit',
    icon: <CreditScore sx={{ fontSize: 14 }} />,
  },
  {
    key: 'overtime',
    label: 'Overtime',
    icon: <AccessTime sx={{ fontSize: 14 }} />,
  },
];

// ─── Column definitions ────────────────────────────────────────────────────
const TAB_COLUMNS = {
  honorarium: [
    { label: 'Date', key: 'date', minWidth: 120, group: 'meta' },
    { label: 'Day', key: 'day', minWidth: 90, group: 'meta' },
    {
      label: 'Time IN',
      key: '_hnTimeIN',
      minWidth: 140,
      group: 'actual',
      dividerBefore: true,
    },
    { label: 'Time OUT', key: '_hnTimeOUT', minWidth: 140, group: 'actual' },
    {
      label: 'Official Time IN',
      key: 'officialHonorariumTimeIN',
      minWidth: 150,
      group: 'official',
      dividerBefore: true,
    },
    {
      label: 'Official Time OUT',
      key: 'officialHonorariumTimeOUT',
      minWidth: 150,
      group: 'official',
    },
    {
      label: 'Rendered',
      key: '_hnRendered',
      minWidth: 130,
      group: 'calc',
      dividerBefore: true,
    },
    { label: 'Tardiness', key: '_hnTardiness', minWidth: 130, group: 'tard' },
  ],
  serviceCredit: [
    { label: 'Date', key: 'date', minWidth: 120, group: 'meta' },
    { label: 'Day', key: 'day', minWidth: 90, group: 'meta' },
    {
      label: 'Time IN',
      key: '_scTimeIN',
      minWidth: 140,
      group: 'actual',
      dividerBefore: true,
    },
    { label: 'Time OUT', key: '_scTimeOUT', minWidth: 140, group: 'actual' },
    {
      label: 'Official Time IN',
      key: 'officialServiceCreditTimeIN',
      minWidth: 150,
      group: 'official',
      dividerBefore: true,
    },
    {
      label: 'Official Time OUT',
      key: 'officialServiceCreditTimeOUT',
      minWidth: 150,
      group: 'official',
    },
    {
      label: 'Rendered',
      key: '_scRendered',
      minWidth: 130,
      group: 'calc',
      dividerBefore: true,
    },
    { label: 'Tardiness', key: '_scTardiness', minWidth: 130, group: 'tard' },
  ],
  overtime: [
    { label: 'Date', key: 'date', minWidth: 120, group: 'meta' },
    { label: 'Day', key: 'day', minWidth: 90, group: 'meta' },
    {
      label: 'Time IN',
      key: '_otTimeIN',
      minWidth: 140,
      group: 'actual',
      dividerBefore: true,
    },
    { label: 'Time OUT', key: '_otTimeOUT', minWidth: 140, group: 'actual' },
    {
      label: 'Official Time IN',
      key: 'officialOverTimeIN',
      minWidth: 150,
      group: 'official',
      dividerBefore: true,
    },
    {
      label: 'Official Time OUT',
      key: 'officialOverTimeOUT',
      minWidth: 150,
      group: 'official',
    },
    {
      label: 'Rendered',
      key: '_otRendered',
      minWidth: 130,
      group: 'calc',
      dividerBefore: true,
    },
    { label: 'Tardiness', key: '_otTardiness', minWidth: 130, group: 'tard' },
  ],
};

const REGULAR_COLS = [
  { label: 'Date', minWidth: 120, group: 'meta' },
  { label: 'Day', minWidth: 90, group: 'meta' },
  { label: 'Time IN', minWidth: 140, group: 'actual', dividerBefore: true },
  { label: 'Time OUT', minWidth: 140, group: 'actual' },
  {
    label: 'Official Time IN',
    minWidth: 150,
    group: 'official',
    dividerBefore: true,
  },
  { label: 'Official Time OUT', minWidth: 150, group: 'official' },
  { label: 'Rendered', minWidth: 130, group: 'calc', dividerBefore: true },
  { label: 'Tardiness', minWidth: 130, group: 'tard' },
];

// ─── getCellValue ──────────────────────────────────────────────────────────
const getCellValue = (row, colKey, isFurlough = false) => {
  const NA = '00:00:00';
  const isNA = (v) =>
    !v || v === '00:00:00 AM' || v === '00:00:00 PM' || v === '00:00:00';
  const getSpecialTime = (expectedType, timeField) => {
    if (row.specialType === expectedType && row[timeField])
      return row[timeField];
    return NA;
  };
  switch (colKey) {
    case '_hnTimeIN':
      return isNA(row.officialHonorariumTimeIN)
        ? NA
        : getSpecialTime('HONORARIUM', 'specialTimeIN');
    case '_hnTimeOUT':
      return isNA(row.officialHonorariumTimeOUT)
        ? NA
        : getSpecialTime('HONORARIUM', 'specialTimeOUT');
    case '_hnRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeHN ||
          row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTimeHN;
      return isNA(row.officialHonorariumTimeIN) ||
        isNA(row.officialHonorariumTimeOUT) ||
        row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTimeHN;
    case '_hnTardiness':
      if (isFurlough) return '00:00:00';
      return isNA(row.officialHonorariumTimeIN) ||
        isNA(row.officialHonorariumTimeOUT) ||
        row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedfinalcalcFacultyHN;
    case '_scTimeIN':
      return isNA(row.officialServiceCreditTimeIN)
        ? NA
        : getSpecialTime('SERVICE', 'specialTimeIN');
    case '_scTimeOUT':
      return isNA(row.officialServiceCreditTimeOUT)
        ? NA
        : getSpecialTime('SERVICE', 'specialTimeOUT');
    case '_scRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeSC ||
          row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTimeSC;
      return isNA(row.officialServiceCreditTimeIN) ||
        isNA(row.officialServiceCreditTimeOUT) ||
        row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTimeSC;
    case '_scTardiness':
      if (isFurlough) return '00:00:00';
      return isNA(row.officialServiceCreditTimeIN) ||
        isNA(row.officialServiceCreditTimeOUT) ||
        row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedfinalcalcFacultySC;
    case '_otTimeIN':
      return isNA(row.officialOverTimeIN)
        ? NA
        : getSpecialTime('OVERTIME', 'specialTimeIN');
    case '_otTimeOUT':
      return isNA(row.officialOverTimeOUT)
        ? NA
        : getSpecialTime('OVERTIME', 'specialTimeOUT');
    case '_otRendered':
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeOT ||
          row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTimeOT;
      return isNA(row.officialOverTimeIN) ||
        isNA(row.officialOverTimeOUT) ||
        row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTimeOT;
    case '_otTardiness':
      if (isFurlough) return '00:00:00';
      return isNA(row.officialOverTimeIN) ||
        isNA(row.officialOverTimeOUT) ||
        row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedfinalcalcFacultyOT;
    case 'officialHonorariumTimeIN':
    case 'officialHonorariumTimeOUT':
    case 'officialServiceCreditTimeIN':
    case 'officialServiceCreditTimeOUT':
    case 'officialOverTimeIN':
    case 'officialOverTimeOUT':
      return isNA(row[colKey]) ? NA : row[colKey];
    default:
      return row[colKey] ?? '—';
  }
};

// ─── Floating Totals Bar ───────────────────────────────────────────────────
const FloatingTotalsBar = ({
  totals,
  visible,
  onSave,
  saving,
  activeTab,
  startDate,
  endDate,
}) => {
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;

  const items = [
    {
      label: 'Regular Rendered',
      value: totals.regularRendered,
      group: 'regular',
    },
    {
      label: 'Absent Days',
      value: totals.absentDays,
      group: 'regular',
    },
    {
      label: 'Regular Tardiness',
      value: totals.regularTardiness,
      group: 'regular',
    },
    { label: 'HN Rendered', value: totals.hnRendered, group: 'honorarium' },
    { label: 'HN Tardiness', value: totals.hnTardiness, group: 'honorarium' },
    { label: 'SC Rendered', value: totals.scRendered, group: 'serviceCredit' },
    {
      label: 'SC Tardiness',
      value: totals.scTardiness,
      group: 'serviceCredit',
    },
    { label: 'OT Rendered', value: totals.otRendered, group: 'overtime' },
    { label: 'OT Tardiness', value: totals.otTardiness, group: 'overtime' },
  ];

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Paper
        elevation={12}
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          minWidth: 340,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          mx: 'auto',
          boxShadow: `0 8px 40px ${alpha(T.accent, 0.35)}, 0 2px 10px ${alpha(T.accent, 0.12)}`,
          border: `1.5px solid ${T.accentBorder}`,
          bgcolor: '#fff',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.25s ease',
          mt: 2,
          mb: 2,
        }}
      >
      {/* Bar header */}
      <Box
        onClick={() => setExpanded((p) => !p)}
        sx={{
          px: 2.5,
          py: 1.25,
          background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <WorkHistory sx={{ color: '#fff', fontSize: 14 }} />
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.74rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Attendance Summary
          </Typography>
          {startDate && endDate && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1,
                py: 0.2,
                borderRadius: '5px',
                bgcolor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Typography
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.67rem',
                  fontFamily: 'monospace',
                }}
              >
                {startDate} – {endDate}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              if (!saving) onSave();
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              px: 1.25,
              py: 0.6,
              borderRadius: '8px',
              bgcolor: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.18s ease',
              '&:hover': !saving ? { bgcolor: 'rgba(255,255,255,0.20)' } : {},
            }}
          >
            {saving ? (
              <CircularProgress size={14} sx={{ color: '#fff' }} />
            ) : (
              <SaveAs sx={{ color: '#fff', fontSize: 16 }} />
            )}
            <Typography
              sx={{
                fontSize: '0.68rem',
                color: '#fff',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Typography>
          </Box>
          {expanded ? (
            <ExpandMore fontSize="small" />
          ) : (
            <ExpandLess fontSize="small" />
          )}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 0.75,
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            overflow: 'hidden',
            '&::-webkit-scrollbar-thumb': {
              background: T.accentBorder,
              borderRadius: 2,
            },
          }}
        >
          {items.map(({ label, value, group }) => {
            const isActive = group === activeTab;
            const isTard = label.includes('Tardiness');
            return (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 0,
                  flex: '1 1 0',
                  px: 1.2,
                  py: 1.1,
                  borderRadius: '8px',
                  bgcolor: isActive
                    ? isTard
                      ? 'rgba(153,27,27,0.12)'
                      : T.accentFaint
                    : isTard
                      ? 'rgba(153,27,27,0.05)'
                      : T.accentFaint,
                  border: `1px solid ${isActive ? T.accent : T.accentBorder}`,
                  boxShadow: isActive
                    ? `0 0 10px ${alpha(T.accent, 0.22)}`
                    : 'none',
                  transform: isActive ? 'translateY(-2px) scale(1.03)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.25,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    color: isActive ? T.accent : T.faint,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: isActive ? '1.1rem' : '1.02rem',
                    fontWeight: 800,
                    color: isTard ? '#991b1b' : '#166534',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label === 'Absent Days'
                    ? String(Number.isFinite(Number(value)) ? Number(value) : 0)
                    : value || '00:00:00'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Collapse>
      </Paper>
    </Box>
  );
};

// ─── Sticky Scrollbar ──────────────────────────────────────────────────────
const StickyScrollbar = ({ innerRef }) => {
  const proxyRef = useRef(null);
  const ghostRef = useRef(null);
  const syncingRef = useRef(false);
  useEffect(() => {
    const inner = innerRef.current;
    const proxy = proxyRef.current;
    const ghost = ghostRef.current;
    if (!inner || !proxy || !ghost) return;
    const updateWidth = () => {
      ghost.style.width = inner.scrollWidth + 'px';
    };
    const ro = new ResizeObserver(updateWidth);
    ro.observe(inner);
    updateWidth();
    const onInnerScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      proxy.scrollLeft = inner.scrollLeft;
      syncingRef.current = false;
    };
    const onProxyScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      inner.scrollLeft = proxy.scrollLeft;
      syncingRef.current = false;
    };
    inner.addEventListener('scroll', onInnerScroll);
    proxy.addEventListener('scroll', onProxyScroll);
    return () => {
      inner.removeEventListener('scroll', onInnerScroll);
      proxy.removeEventListener('scroll', onProxyScroll);
      ro.disconnect();
    };
  }, [innerRef]);
  return (
    <Box
      ref={proxyRef}
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 10,
        overflowX: 'auto',
        overflowY: 'hidden',
        height: 16,
        bgcolor: '#fff',
        borderTop: `1px solid ${T.divider}`,
        '&::-webkit-scrollbar': { height: 12 },
        '&::-webkit-scrollbar-track': {
          background: T.accentFaint,
          borderRadius: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          background: T.accentMid,
          borderRadius: 4,
          '&:hover': { background: T.accent },
        },
      }}
    >
      <Box ref={ghostRef} sx={{ height: 1 }} />
    </Box>
  );
};

// ─── Styled Modal ──────────────────────────────────────────────────────────
const StyledModal = ({
  open,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  showCancel = false,
}) => {
  const typeConfig = {
    success: {
      icon: <CheckCircleIcon sx={{ fontSize: 26, color: '#2e7d32' }} />,
      avatarBg: 'rgba(46,125,50,0.12)',
      label: 'Success',
      labelColor: '#2e7d32',
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 26, color: '#92400e' }} />,
      avatarBg: 'rgba(146,64,14,0.12)',
      label: 'Warning',
      labelColor: '#92400e',
    },
    error: {
      icon: <ErrorIcon sx={{ fontSize: 26, color: '#991b1b' }} />,
      avatarBg: 'rgba(153,27,27,0.12)',
      label: 'Error',
      labelColor: '#991b1b',
    },
    info: {
      icon: <InfoIcon sx={{ fontSize: 26, color: T.accent }} />,
      avatarBg: T.accentFaint,
      label: 'Notice',
      labelColor: T.accent,
    },
  };
  const cfg = typeConfig[type] || typeConfig.info;
  const lines = message
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const isListItem = (l) =>
    l.startsWith('•') ||
    l.startsWith('-') ||
    /^\d{5,}/.test(l) ||
    /^Employee\s+\d/.test(l);
  const isNote = (l) =>
    /^(contact|please|this action|note:|important)/i.test(l);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          overflow: 'hidden',
          border: `0.5px solid rgba(0,0,0,0.09)`,
          bgcolor: '#fff',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 3,
          background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: T.accent,
            opacity: 0.45,
            '&:hover': { opacity: 1, bgcolor: T.accentFaint },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Avatar
            sx={{
              bgcolor: cfg.avatarBg,
              width: 48,
              height: 48,
              border: `1px solid ${T.accentBorder}`,
            }}
          >
            {cfg.icon}
          </Avatar>
          <Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: T.accent,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  bgcolor: alpha(cfg.labelColor, 0.1),
                  color: cfg.labelColor,
                  fontWeight: 700,
                  fontSize: '0.62rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  height: 18,
                  borderRadius: '5px',
                  border: `1px solid ${alpha(cfg.labelColor, 0.2)}`,
                }}
              />
            </Box>
            <Typography
              sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500 }}
            >
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderTop: `1px solid ${T.divider}`,
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        {lines.map((line, i) => {
          if (isListItem(line)) {
            const clean = line.replace(/^[•\-]\s*/, '');
            const [empPart, ...rest] = clean.split(':');
            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: '8px',
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    flexShrink: 0,
                    bgcolor: alpha(T.accent, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Person
                    sx={{ fontSize: 14, color: T.accent, opacity: 0.7 }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {empPart?.trim()}
                  </Typography>
                  {rest.length > 0 && (
                    <Typography
                      sx={{
                        fontSize: '0.74rem',
                        color: T.muted,
                        fontWeight: 500,
                        mt: 0.1,
                      }}
                    >
                      {rest.join(':').trim()}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }
          if (isNote(line)) {
            return (
              <Box
                key={i}
                sx={{
                  mt: 1.5,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: '8px',
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  borderLeft: `4px solid ${alpha(T.accent, 0.5)}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                <InfoIcon
                  sx={{
                    fontSize: 13,
                    color: T.accent,
                    opacity: 0.6,
                    mt: 0.2,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: T.muted,
                    fontWeight: 600,
                    lineHeight: 1.65,
                  }}
                >
                  {line}
                </Typography>
              </Box>
            );
          }
          return (
            <Typography
              key={i}
              sx={{
                fontSize: '0.88rem',
                color: T.muted,
                lineHeight: 1.8,
                fontWeight: 500,
                mb: i < lines.length - 1 ? 1 : 0,
              }}
            >
              {line}
            </Typography>
          );
        })}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        {showCancel && (
          <RowBtn
            icon={null}
            label="Cancel"
            color={T.muted}
            hoverBg="rgba(0,0,0,0.05)"
            onClick={onClose}
          />
        )}
        <button
          onClick={onConfirm || onClose}
          style={{
            background: T.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 24px',
            fontWeight: 700,
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.accentDark;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.accent;
          }}
        >
          {showCancel ? 'Confirm' : 'OK'}
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceModuleFaculty = () => {
  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate] = useState({});
  const [holidayByDate, setHolidayByDate] = useState({});
  const { settings } = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNoOfficialTimeModal, setShowNoOfficialTimeModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('regular');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();

  const resultsRef = useRef(null);
  const tableBodyRef = useRef(null);

  // ── Virtualized row rendering (keeps the DOM light for large ranges) ──
  const ROW_HEIGHT = 44;
  const OVERSCAN_ROWS = 10;
  const rafScrollRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);

  const onTableScroll = useCallback((e) => {
    const nextTop = e.currentTarget.scrollTop || 0;
    if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
    rafScrollRef.current = requestAnimationFrame(() => setScrollTop(nextTop));
  }, []);

  useEffect(() => {
    const el = tableBodyRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight || 500);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tableBodyRef]);

  const { hasAccess, loading: accessLoading } = usePageAccess(
    'attendance-module-faculty',
  );

  const currentYear = new Date().getFullYear();
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  const [modal, setModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
  });
  const showModal = (
    title,
    message,
    type = 'info',
    onConfirm = null,
    showCancel = false,
  ) => setModal({ open: true, title, message, type, onConfirm, showCancel });
  const closeModal = () => setModal((p) => ({ ...p, open: false }));

  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingSavedOverall, setPendingSavedOverall] = useState(null);
  const [pendingProposedOverall, setPendingProposedOverall] = useState(null);

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => {
    if (!accessLoading) setPageLoading(false);
  }, [accessLoading]);

  useEffect(() => {
    const en = localStorage.getItem('attendanceFaculty30EmployeeNumber');
    const sd = localStorage.getItem('attendanceFaculty30StartDate');
    const ed = localStorage.getItem('attendanceFaculty30EndDate');
    if (en) setEmployeeNumber(en);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
  }, []);

  useEffect(() => {
    if (attendanceData.length === 0) return;
    const timer = setTimeout(() => {
      if (resultsRef.current)
        resultsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [attendanceData]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isFurloughDate = (date, suspMap, leaveMap, holidayMap) =>
    Boolean(suspMap?.[date] || leaveMap?.[date] || holidayMap?.[date]);

  const handleSubmit = async () => {
    localStorage.setItem('attendanceFaculty30EmployeeNumber', employeeNumber);
    localStorage.setItem('attendanceFaculty30StartDate', startDate);
    localStorage.setItem('attendanceFaculty30EndDate', endDate);
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [deviceRows, maps] = await Promise.all([
        postAttendanceDevicePreflightNoSync({
          apiBaseUrl: API_BASE_URL,
          getAuthHeaders,
          personID: employeeNumber,
          startDate,
          endDate,
        }),
        fetchAttendanceCalendarMaps({
          apiBaseUrl: API_BASE_URL,
          getAuthHeaders,
          startDate,
          endDate,
          personId: employeeNumber,
        }),
      ]);
      if (deviceRows.length === 0) {
        setAttendanceData([]);
        setSuspensionByDate({});
        setLeaveByDate({});
        setHolidayByDate({});
        showModal(
          'No Device Records Found',
          'No biometric device records were found for this employee within the selected date range.\n\nPlease verify the employee number and date range, or check if the attendance device has synced.\n\nPress OK to open Attendance Device.',
          'warning',
          () => {
            closeModal();
            navigate('/view_attendance');
          },
        );
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/attendance/api/attendance`,
        {
          params: { personId: employeeNumber, startDate, endDate },
          ...getAuthHeaders(),
        },
      );
      const rawRows = Array.isArray(response.data) ? response.data : [];
      if (rawRows.length === 0) {
        setAttendanceData([]);
        setSuspensionByDate({});
        setLeaveByDate({});
        setHolidayByDate({});
        showModal(
          'No Official Time Schedule',
          `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no matching attendance/official schedule rows exist for this period.\n\nPlease set up the official time schedule in the Official Time Management module before generating attendance records.\n\nPress OK to open Official Time Management.`,
          'warning',
          () => {
            closeModal();
            navigate('/official_time');
          },
        );
        return;
      }
      const dateOnly = (val) => (val ? String(val).split('T')[0] : '');
      const byDateRange = rawRows.filter((row) => {
        const d = dateOnly(row.date),
          start = dateOnly(row.startDate),
          end = dateOnly(row.endDate);
        if (!d) return true;
        if (!start || !end) return true;
        return d >= start && d <= end;
      });
      const seen = new Set();
      const onePerDate = byDateRange.filter((row) => {
        const d = dateOnly(row.date);
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      });
      const hasOfficialTime = onePerDate.some(
        (row) =>
          row.officialTimeIN &&
          row.officialTimeOUT &&
          row.officialTimeIN !== '00:00:00 AM' &&
          row.officialTimeOUT !== '00:00:00 AM',
      );
      if (onePerDate.length === 0) {
        setAttendanceData([]);
        setSuspensionByDate({});
        setLeaveByDate({});
        setHolidayByDate({});
        showModal(
          'No Official Time Schedule',
          `Device records were found for this employee (${deviceRows.length} day${deviceRows.length !== 1 ? 's' : ''}), but no rows remained after filtering for this period.\n\nPlease verify official time and date range.\n\nPress OK to open Official Time Management.`,
          'warning',
          () => {
            closeModal();
            navigate('/official_time');
          },
        );
        return;
      }
      if (!hasOfficialTime) {
        setShowNoOfficialTimeModal(true);
        return;
      }

      const processedData = onePerDate.map((row) => {
        const {
          timeIN,
          timeOUT,
          officialTimeIN,
          officialTimeOUT,
          officialHonorariumTimeIN,
          officialHonorariumTimeOUT,
          officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT,
          officialOverTimeIN,
          officialOverTimeOUT,
        } = row;
        const startDateFaculty = new Date(`01/01/2000 ${timeIN}`);
        const endDateFaculty = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFaculty = new Date(
          `01/01/2000 ${officialTimeIN}`,
        );
        const endOfficialTimeFaculty = new Date(
          `01/01/2000 ${officialTimeOUT}`,
        );
        const midnightFaculty = new Date(`01/01/2000 00:00:00 AM`);
        const timeinfaculty =
          startDateFaculty > endOfficialTimeFaculty
            ? midnightFaculty
            : startDateFaculty < startOfficialTimeFaculty
              ? startOfficialTimeFaculty
              : startDateFaculty;
        const timeoutfaculty =
          timeinfaculty === midnightFaculty
            ? midnightFaculty
            : endDateFaculty < endOfficialTimeFaculty
              ? endDateFaculty
              : endOfficialTimeFaculty;
        const diffMs = timeoutfaculty - timeinfaculty;
        const formattedFacultyRenderedTime = [
          Math.floor(diffMs / 3600000),
          Math.floor((diffMs % 3600000) / 60000),
          Math.floor((diffMs % 60000) / 1000),
        ]
          .map((x) => String(x).padStart(2, '0'))
          .join(':');
        const diffMsFaculty = endOfficialTimeFaculty - startOfficialTimeFaculty;
        const formattedFacultyMaxRenderedTime = [
          Math.floor(diffMsFaculty / 3600000),
          Math.floor((diffMsFaculty % 3600000) / 60000),
          Math.floor((diffMsFaculty % 60000) / 1000),
        ]
          .map((x) => String(x).padStart(2, '0'))
          .join(':');
        const finalcalcMs =
          new Date(`01/01/2000 ${formattedFacultyMaxRenderedTime}`) -
          new Date(`01/01/2000 ${formattedFacultyRenderedTime}`);
        const formattedfinalcalcFaculty = [
          Math.floor(finalcalcMs / 3600000),
          Math.floor((finalcalcMs % 3600000) / 60000),
          Math.floor((finalcalcMs % 60000) / 1000),
        ]
          .map((x) => String(x).padStart(2, '0'))
          .join(':');

        const calcSeg = (tIn, tOut, offIn, offOut) => {
          const s = new Date(`01/01/2000 ${tIn}`);
          const e = new Date(`01/01/2000 ${tOut}`);
          const os = new Date(`01/01/2000 ${offIn}`);
          const oe = new Date(`01/01/2000 ${offOut}`);
          const mid = new Date(`01/01/2000 00:00:00 AM`);
          const msToHHMMSS = (ms) => {
            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
          };
          if (os.getTime() === mid.getTime() || oe.getTime() === mid.getTime())
            return {
              rendered: '00:00:00',
              maxRendered: '00:00:00',
              tardiness: '00:00:00',
            };
          if (!tIn || !tOut || isNaN(s.getTime()) || isNaN(e.getTime()))
            return {
              rendered: '00:00:00',
              maxRendered: msToHHMMSS(oe - os),
              tardiness: msToHHMMSS(oe - os),
            };
          const isWithinGrace = s > os && s - os <= GRACE_PERIOD_MS;
          const effectiveStart = isWithinGrace ? os : s;
          const clampedStart = effectiveStart > os ? effectiveStart : os;
          const clampedEnd = e < oe ? e : oe;
          const diffMs =
            clampedEnd > clampedStart ? clampedEnd - clampedStart : 0;
          const offDiffMs = oe - os;
          const tardMs = Math.max(0, offDiffMs - diffMs);
          return {
            rendered: msToHHMMSS(diffMs),
            maxRendered: msToHHMMSS(offDiffMs),
            tardiness: msToHHMMSS(tardMs),
          };
        };

        const hnTIn =
          row.specialType === 'HONORARIUM' && row.specialTimeIN
            ? row.specialTimeIN
            : timeIN;
        const hnTOut =
          row.specialType === 'HONORARIUM' && row.specialTimeOUT
            ? row.specialTimeOUT
            : timeOUT;
        const scTIn =
          row.specialType === 'SERVICE' && row.specialTimeIN
            ? row.specialTimeIN
            : timeIN;
        const scTOut =
          row.specialType === 'SERVICE' && row.specialTimeOUT
            ? row.specialTimeOUT
            : timeOUT;
        const otTIn =
          row.specialType === 'OVERTIME' && row.specialTimeIN
            ? row.specialTimeIN
            : timeIN;
        const otTOut =
          row.specialType === 'OVERTIME' && row.specialTimeOUT
            ? row.specialTimeOUT
            : timeOUT;

        const hn = calcSeg(
          hnTIn,
          hnTOut,
          officialHonorariumTimeIN,
          officialHonorariumTimeOUT,
        );
        const sc = calcSeg(
          scTIn,
          scTOut,
          officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT,
        );
        const ot = calcSeg(
          otTIn,
          otTOut,
          officialOverTimeIN,
          officialOverTimeOUT,
        );

        return {
          ...row,
          formattedfinalcalcFaculty,
          formattedFacultyRenderedTime,
          formattedFacultyMaxRenderedTime,
          formattedFacultyRenderedTimeHN: hn.rendered,
          formattedFacultyMaxRenderedTimeHN: hn.maxRendered,
          formattedfinalcalcFacultyHN: hn.tardiness,
          formattedFacultyRenderedTimeSC: sc.rendered,
          formattedFacultyMaxRenderedTimeSC: sc.maxRendered,
          formattedfinalcalcFacultySC: sc.tardiness,
          formattedFacultyRenderedTimeOT: ot.rendered,
          formattedFacultyMaxRenderedTimeOT: ot.maxRendered,
          formattedfinalcalcFacultyOT: ot.tardiness,
        };
      });

      setSuspensionByDate(maps.suspensionByDate);
      setLeaveByDate(maps.leaveByDate);
      setHolidayByDate(maps.holidayByDate);
      setAttendanceData(processedData);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      const msg = 'Failed to fetch attendance data. Please try again.';
      setError(msg);
      showSnackbar(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const getStatusLabelForDate = useCallback(
    (date) =>
      getLeaveStatusLabelForDate(date, {
        suspensionByDate,
        holidayByDate,
        leaveByDate,
      }),
    [suspensionByDate, holidayByDate, leaveByDate],
  );

  const getStatusStyle = (label) => {
    if (label === 'WORK SUSPENDED')
      return {
        bgcolor: alpha('#d32f2f', 0.12),
        color: '#d32f2f',
        border: `1px solid ${alpha('#d32f2f', 0.4)}`,
      };
    if (label === 'HOLIDAY')
      return {
        bgcolor: alpha('#f57c00', 0.12),
        color: '#f57c00',
        border: `1px solid ${alpha('#f57c00', 0.4)}`,
      };
    if (label === 'ON LEAVE')
      return {
        bgcolor: alpha('#2e7d32', 0.12),
        color: '#2e7d32',
        border: `1px solid ${alpha('#2e7d32', 0.4)}`,
      };
    return {};
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const sumTimeRows = useCallback((rows, getTime) => {
    let totalSeconds = 0;
    rows.forEach((row) => {
      const t = getTime(row) || '00:00:00';
      const [h, m, s] = t.split(':').map(Number);
      if (!isNaN(h)) totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600),
      mm = Math.floor((totalSeconds % 3600) / 60),
      ss = totalSeconds % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }, []);

  const totals = React.useMemo(() => {
    if (!attendanceData.length) return {};
    const absentDays = computeAbsentDays(attendanceData, leaveByDate);
    const regularRendered = sumTimeRows(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTime ||
          row.formattedFacultyMaxRenderedTime === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTime;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTime === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTime;
    });
    const regularTardiness = sumTimeRows(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFaculty === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTime
        : row.formattedfinalcalcFaculty;
    });
    const hnRendered = sumTimeRows(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeHN ||
          row.formattedFacultyMaxRenderedTimeHN === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTimeHN;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimeHN === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTimeHN;
    });
    const hnTardiness = sumTimeRows(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultyHN === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeHN
        : row.formattedfinalcalcFacultyHN;
    });
    const scRendered = sumTimeRows(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeSC ||
          row.formattedFacultyMaxRenderedTimeSC === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTimeSC;
      return !row.officialTimeSC ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimeSC === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTimeSC;
    });
    const scTardiness = sumTimeRows(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultySC === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeSC
        : row.formattedfinalcalcFacultySC;
    });
    const otRendered = sumTimeRows(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough)
        return !row.formattedFacultyMaxRenderedTimeOT ||
          row.formattedFacultyMaxRenderedTimeOT === 'NaN:NaN:NaN'
          ? '00:00:00'
          : row.formattedFacultyMaxRenderedTimeOT;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedFacultyRenderedTimeOT === 'NaN:NaN:NaN'
        ? '00:00:00'
        : row.formattedFacultyRenderedTimeOT;
    });
    const otTardiness = sumTimeRows(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN ||
        !row.timeOUT ||
        row.formattedfinalcalcFacultyOT === 'NaN:NaN:NaN'
        ? row.formattedFacultyMaxRenderedTimeOT
        : row.formattedfinalcalcFacultyOT;
    });
    return {
      absentDays,
      regularRendered,
      regularTardiness,
      hnRendered,
      hnTardiness,
      scRendered,
      scTardiness,
      otRendered,
      otTardiness,
    };
  }, [attendanceData, sumTimeRows, getStatusLabelForDate, leaveByDate]);

  const getTabTotalsValues = (tab) => {
    switch (tab) {
      case 'regular':
        return [totals.regularRendered, totals.regularTardiness];
      case 'honorarium':
        return [totals.hnRendered, totals.hnTardiness];
      case 'serviceCredit':
        return [totals.scRendered, totals.scTardiness];
      case 'overtime':
        return [totals.otRendered, totals.otTardiness];
      default:
        return [];
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const navigateToOverallAttendanceSummary = useCallback(() => {
    const en = String(employeeNumber ?? '').trim();
    if (en) localStorage.setItem('employeeNumber', en);
    if (startDate) localStorage.setItem('startDate', startDate);
    if (endDate) localStorage.setItem('endDate', endDate);
    navigate('/attendance_summary', {
      state: { employeeNumber: en, startDate, endDate },
    });
  }, [employeeNumber, startDate, endDate, navigate]);

  const buildOverallRecordPayload = () => ({
    personID: employeeNumber,
    startDate,
    endDate,
    totalRenderedTimeMorning: '00:00:00',
    totalRenderedTimeMorningTardiness: '00:00:00',
    totalRenderedTimeAfternoon: '00:00:00',
    totalRenderedTimeAfternoonTardiness: '00:00:00',
    totalRenderedHonorarium: totals.hnRendered,
    totalRenderedHonorariumTardiness: totals.hnTardiness,
    totalRenderedServiceCredit: totals.scRendered,
    totalRenderedServiceCreditTardiness: totals.scTardiness,
    totalRenderedOvertime: totals.otRendered,
    totalRenderedOvertimeTardiness: totals.otTardiness,
    overallRenderedOfficialTime: totals.regularRendered,
    overallRenderedOfficialTimeTardiness: totals.regularTardiness,
  });

  const putMergedOverall = async (mergedPayload, recordId) => {
    await axios.put(
      `${API_BASE_URL}/attendance/api/overall_attendance_record/${recordId}`,
      mergedPayload,
      getAuthHeaders(),
    );
    showSnackbar('Attendance summary updated from your choices.', 'success');
    setTimeout(() => navigateToOverallAttendanceSummary(), 1500);
  };

  const saveOverallAttendance = async () => {
    const record = buildOverallRecordPayload();
    setSaving(true);
    try {
      const dup = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: { personID: employeeNumber, startDate, endDate },
          ...getAuthHeaders(),
        },
      );
      const existingList = dup.data?.data || [];
      if (existingList.length) {
        const existing = existingList[0];
        if (!overallRecordsDiffer(existing, record)) {
          showSnackbar('Summary already matches these totals. No changes to save.', 'info');
          return;
        }
        setPendingSavedOverall(existing);
        setPendingProposedOverall(record);
        setCompareOpen(true);
        return;
      }
    } catch (e) {
      console.error('Duplicate-check failed:', e);
      showModal(
        'Verification Failed',
        'Could not verify existing records. Saving has been aborted.\n\nPlease try again or contact your administrator.',
        'error',
      );
      return;
    } finally {
      setSaving(false);
    }

    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/overall_attendance`,
        record,
        getAuthHeaders(),
      );
      showSnackbar(
        response.data.message || 'Attendance record saved successfully!',
        'success',
      );
      setTimeout(() => navigateToOverallAttendanceSummary(), 1500);
    } catch (err) {
      console.error('Error saving overall attendance:', err);
      showSnackbar('Failed to save attendance record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useAttendanceRealtimeRefresh(
    useCallback(() => {
      if (!employeeNumber || !startDate || !endDate) return;
      handleSubmitRef.current();
    }, [employeeNumber, startDate, endDate]),
    {
      personId: employeeNumber,
      startDate,
      endDate,
      requireDateRange: true,
      matchMode: 'strict',
    },
  );

  const handleCompareClose = () => {
    setCompareOpen(false);
    setPendingSavedOverall(null);
    setPendingProposedOverall(null);
  };

  const handleCompareConfirm = async (choices) => {
    if (!pendingSavedOverall?.id || !pendingProposedOverall) {
      handleCompareClose();
      return;
    }
    setCompareOpen(false);
    setSaving(true);
    try {
      const merged = mergeOverallPayload({
        savedRow: pendingSavedOverall,
        proposed: pendingProposedOverall,
        choices,
        personID: employeeNumber,
        startDate,
        endDate,
      });
      await putMergedOverall(merged, pendingSavedOverall.id);
    } catch (err) {
      console.error('Error updating overall attendance:', err);
      showSnackbar(err.response?.data?.message || 'Failed to update attendance record.', 'error');
    } finally {
      setSaving(false);
      setPendingSavedOverall(null);
      setPendingProposedOverall(null);
    }
  };

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setEmployeeNumber('');
    setStartDate('');
    setEndDate('');
    setAttendanceData([]);
    setError('');
    setSuccess('');
    setSelectedMonth(null);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Guards ────────────────────────────────────────────────────────────────
  if (pageLoading || accessLoading) return <AttendanceFacultyWireframe />;
  if (hasAccess === false)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Module for Faculty (30 hours). Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  const columns = activeTab !== 'regular' ? TAB_COLUMNS[activeTab] : null;
  const tabTotals = getTabTotalsValues(activeTab);

  // ─── Table cell builder ────────────────────────────────────────────────────
  const buildCell = (content, group, isEven, dividerBefore = false) => (
    <TableCell
      sx={{
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        borderBottom: `1px solid ${T.divider}`,
        borderLeft:
          group === 'actual'
            ? `3px solid ${alpha(T.accent, 0.4)}`
            : dividerBefore
              ? `2px solid ${T.accentBorder}`
              : 'none',
        px: 1.75,
        py: 1,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        fontWeight:
          group === 'calc' || group === 'tard' || group === 'actual'
            ? 700
            : 400,
        color:
          group === 'calc'
            ? '#166534'
            : group === 'tard'
              ? '#991b1b'
              : group === 'official'
                ? '#374151'
                : '#111827',
        bgcolor:
          group === 'actual'
            ? isEven
              ? alpha(T.accent, 0.07)
              : alpha(T.accent, 0.12)
            : group === 'calc'
              ? isEven
                ? 'rgba(21,128,61,0.05)'
                : 'rgba(21,128,61,0.09)'
              : group === 'tard'
                ? isEven
                  ? 'rgba(153,27,27,0.04)'
                  : 'rgba(153,27,27,0.08)'
                : isEven
                  ? '#fff'
                  : T.rowOdd,
        transition: 'background-color 0.12s',
        'tr:hover &': { bgcolor: T.rowHover + ' !important' },
      }}
    >
      {content}
    </TableCell>
  );

  // ─── Two-row sticky header builder ────────────────────────────────────────
  const groupSpans = [
    { label: '', span: 2, group: 'meta' },
    {
      label: 'Employee Device Records',
      span: 2,
      group: 'actual',
      dividerBefore: true,
    },
    {
      label: 'Official Schedule',
      span: 2,
      group: 'official',
      dividerBefore: true,
    },
    { label: 'Rendered', span: 1, group: 'calc', dividerBefore: true },
    { label: 'Tardiness', span: 1, group: 'tard' },
  ];

  const hBg = (g) =>
    g === 'actual'
      ? alpha(T.accent, 0.12)
      : g === 'official'
        ? alpha(T.accent, 0.05)
        : g === 'calc'
          ? 'rgba(21,128,61,0.09)'
          : g === 'tard'
            ? 'rgba(153,27,27,0.09)'
            : alpha(T.accent, 0.03);
  const hBg2 = (g) =>
    g === 'actual'
      ? alpha(T.accent, 0.08)
      : g === 'official'
        ? alpha(T.accent, 0.03)
        : g === 'calc'
          ? 'rgba(21,128,61,0.06)'
          : g === 'tard'
            ? 'rgba(153,27,27,0.06)'
            : alpha(T.accent, 0.02);

  const buildTwoRowHead = (cols) => (
    <TableHead>
      <TableRow>
        {groupSpans.map(({ label, span, group, dividerBefore }, gi) => (
          <TableCell
            key={gi}
            colSpan={span}
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.62rem',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              py: 0.85,
              px: 1.75,
              whiteSpace: 'nowrap',
              position: 'sticky',
              top: 0,
              zIndex: 3,
              borderBottom: `1px solid ${T.accentBorder}`,
              borderLeft: dividerBefore
                ? `2px solid ${alpha(T.accent, 0.3)}`
                : 'none',
              bgcolor: hBg(group),
              color:
                group === 'actual'
                  ? T.accent
                  : group === 'calc'
                    ? '#166534'
                    : group === 'tard'
                      ? '#991b1b'
                      : 'transparent',
            }}
          >
            {label}
          </TableCell>
        ))}
      </TableRow>
      <TableRow>
        {cols.map(({ label, minWidth, group, dividerBefore }) => (
          <TableCell
            key={label}
            sx={{
              minWidth: minWidth || 120,
              textAlign: 'center',
              position: 'sticky',
              top: 32,
              zIndex: 2,
              fontSize: '0.65rem',
              fontWeight: 700,
              py: 0.85,
              px: 1.75,
              whiteSpace: 'nowrap',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
              borderLeft: dividerBefore
                ? `2px solid ${alpha(T.accent, 0.3)}`
                : 'none',
              bgcolor: hBg2(group),
              color: '#fff',
              background:
                group === 'actual'
                  ? T.accent
                  : group === 'calc'
                    ? '#166534'
                    : group === 'tard'
                      ? '#991b1b'
                      : group === 'official'
                        ? T.accentMid
                        : T.accentDark,
            }}
          >
            {label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: '100vw',
          maxWidth: '100%',
          position: 'relative',
          left: '63%',
          transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
          pb: attendanceData.length > 0 ? '160px' : undefined,
        }}
      >
        <style>{shimmerKf}</style>

        {/* ── Snackbar ── */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              width: '100%',
              fontWeight: 600,
              backgroundColor:
                snackbar.severity === 'success' ? '#4caf50' : undefined,
              color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              '& .MuiAlert-icon': {
                color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip
                  label={`${snackbarCountdown}s`}
                  size="small"
                  sx={{
                    backgroundColor:
                      snackbar.severity === 'success'
                        ? 'rgba(255,255,255,0.3)'
                        : undefined,
                    color:
                      snackbar.severity === 'success' ? '#ffffff' : undefined,
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
          </Alert>
        </Snackbar>

        <LoadingOverlay open={loading} message="Fetching attendance records…" />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                borderRadius: '50%',
                background:
                  'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)',
              }}
            />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <WorkHistory sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.25,
                  }}
                >
                  Attendance Records (30hrs)
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: T.accentMid,
                    fontWeight: 600,
                  }}
                >
                  30hrs · Job Order (JO) Faculty · Generate and review
                  attendance records
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  borderRadius: 5,
                  bgcolor: alpha('#4caf50', 0.12),
                  border: '1px solid rgba(76,175,80,0.25)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: '#2e7d32',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 12 }} /> 30hrs | JO
                </Typography>
              </Box>
              <button
                onClick={handleSubmit}
                disabled={!employeeNumber || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '8px',
                  padding: '7px 10px',
                  cursor:
                    !employeeNumber || !startDate || !endDate
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: T.accent,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  opacity: !employeeNumber || !startDate || !endDate ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08);
                }}
              >
                <Refresh sx={{ fontSize: 15 }} /> Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Alerts ── */}
        <Collapse in={!!error}>
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}
          >
            {error}
          </Alert>
        </Collapse>
        <Collapse in={!!success}>
          <Alert
            severity="success"
            onClose={() => setSuccess('')}
            sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}
          >
            {success}
          </Alert>
        </Collapse>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            {/* Input row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: T.accent,
                    mb: 0.6,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Employee Number
                </Typography>
                <EmployeeSearchField
                  value={employeeNumber}
                  onSelectEmployeeNumber={setEmployeeNumber}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: T.accent,
                    mb: 0.6,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Start Date
                </Typography>
                <NativeInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15 }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: T.accent,
                    mb: 0.6,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  End Date
                </Typography>
                <NativeInput
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15 }} />}
                />
              </Box>
            </Box>

            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />

            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: T.accent,
                mb: 1.25,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <FilterList sx={{ fontSize: 13 }} />
              Quick Date Selection
            </Typography>

            {/* Month picker */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: `2px dashed ${T.accentBorder}`,
                bgcolor: T.accentFaint,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: T.accent,
                      mb: 0.3,
                    }}
                  >
                    Select Entire Month
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                    Choose a year, then click any month to set the date range
                  </Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Year
                  </InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedMonth(null);
                      showSnackbar(
                        'Year changed — please click a month to load records.',
                        'info',
                      );
                    }}
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: 2,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: T.accentBorder,
                      },
                    }}
                  >
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  justifyContent: 'center',
                }}
              >
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthClick(index)}
                      style={{
                        background: sel ? T.accent : '#fff',
                        border: `1px solid ${sel ? T.accent : T.accentBorder}`,
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: 'pointer',
                        color: sel ? '#fff' : T.accent,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                        boxShadow: sel
                          ? `0 2px 8px ${alpha(T.accent, 0.25)}`
                          : 'none',
                        letterSpacing: '0.04em',
                      }}
                      onMouseEnter={(e) => {
                        if (!sel) {
                          e.currentTarget.style.backgroundColor = T.accentFaint;
                          e.currentTarget.style.borderColor = T.accent;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!sel) {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.borderColor = T.accentBorder;
                        }
                      }}
                    >
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>

            {/* Clear + Search */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <RowBtn
                icon={<Clear sx={{ fontSize: 13 }} />}
                label="Clear All Filters"
                color="#C62828"
                hoverBg="rgba(198,40,40,0.08)"
                onClick={handleClearFilters}
              />
              <RowBtn
                icon={
                  loading ? (
                    <CircularProgress size={12} sx={{ color: T.accent }} />
                  ) : (
                    <Search sx={{ fontSize: 13 }} />
                  )
                }
                label={loading ? 'Loading…' : 'Search Records'}
                color={T.accent}
                hoverBg={T.accentFaint}
                disabled={!employeeNumber || !startDate || !endDate || loading}
                onClick={handleSubmit}
              />
            </Box>
          </Box>
        </SectionCard>

        {/* ── Results Card ── */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={400}>
            <SectionCard ref={resultsRef} sx={{ mb: 2 }}>
              <PanelHeader
                icon={Assignment}
                title={`Records for ${employeeNumber}`}
                rightContent={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                      {startDate} → {endDate}
                    </Typography>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.3,
                        borderRadius: 5,
                        bgcolor: alpha(T.accent, 0.1),
                        border: `1px solid ${alpha(T.accent, 0.18)}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          color: T.accent,
                          fontWeight: 700,
                        }}
                      >
                        {attendanceData.length}{' '}
                        {attendanceData.length === 1 ? 'record' : 'records'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              {/* Tab switcher */}
              <Box sx={{ px: 2.5, pt: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    border: `1px solid ${T.accentBorder}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    mb: 2,
                  }}
                >
                  {VIEW_TABS.map(({ key, label, icon }, i, arr) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      style={{
                        flex: 1,
                        border: 'none',
                        borderRight:
                          i < arr.length - 1
                            ? `1px solid ${T.accentBorder}`
                            : 'none',
                        borderRadius: 0,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        background:
                          activeTab === key ? T.accent : 'transparent',
                        color: activeTab === key ? '#fff' : T.accent,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== key)
                          e.currentTarget.style.backgroundColor = T.accentFaint;
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== key)
                          e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </Box>
              </Box>

              {/* Table */}
              <Box sx={{ px: 2.5, pb: 2.5 }}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: '8px',
                    border: `1px solid ${T.accentBorder}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    ref={tableBodyRef}
                    onScroll={onTableScroll}
                    sx={{
                      overflowX: 'auto',
                      overflowY: 'auto',
                      maxHeight: 500,
                      scrollbarWidth: 'thin',
                      '&::-webkit-scrollbar': { height: 6, width: 6 },
                      '&::-webkit-scrollbar-track': {
                        background: T.accentFaint,
                        borderRadius: 4,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: T.accentMid,
                        borderRadius: 4,
                      },
                    }}
                  >
                    {/* REGULAR TAB */}
                    {activeTab === 'regular' && (
                      <Table
                        sx={{
                          minWidth: REGULAR_COLS.reduce(
                            (s, c) => s + (c.minWidth || 120),
                            0,
                          ),
                          borderCollapse: 'collapse',
                        }}
                      >
                        {buildTwoRowHead(REGULAR_COLS)}
                        <TableBody>
                          {(() => {
                            const total = attendanceData.length;
                            const start = Math.max(
                              0,
                              Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
                            );
                            const end = Math.min(
                              total,
                              Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) +
                                OVERSCAN_ROWS,
                            );
                            const topH = start * ROW_HEIGHT;
                            const bottomH = (total - end) * ROW_HEIGHT;
                            const visible = attendanceData.slice(start, end);

                            return (
                              <>
                                {topH > 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={8}
                                      sx={{
                                        p: 0,
                                        borderBottom: 'none',
                                        height: topH,
                                      }}
                                    />
                                  </TableRow>
                                )}

                                {visible.map((row, vi) => {
                                  const index = start + vi;
                                  const statusLabel = getStatusLabelForDate(row.date);
                                  const isFurlough = Boolean(statusLabel);
                                  const isEven = index % 2 === 0;
                                  return (
                                    <TableRow
                                      key={row.date || index}
                                      sx={{
                                        '&:hover td': {
                                          bgcolor: `${T.rowHover} !important`,
                                        },
                                      }}
                                    >
                                      <TableCell
                                        sx={{
                                          fontSize: '0.8rem',
                                          fontWeight: 600,
                                          color: T.text,
                                          bgcolor: isEven ? '#fff' : T.rowOdd,
                                          borderBottom: `1px solid ${T.divider}`,
                                          px: 1.75,
                                          py: 1,
                                          whiteSpace: 'nowrap',
                                          textAlign: 'center',
                                          transition: 'background-color 0.12s',
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 0.3,
                                          }}
                                        >
                                          <span>{row.date}</span>
                                          {statusLabel && (
                                            <Chip
                                              size="small"
                                              label={statusLabel}
                                              sx={{
                                                fontWeight: 700,
                                                fontSize: '0.62rem',
                                                height: 16,
                                                ...getStatusStyle(statusLabel),
                                              }}
                                            />
                                          )}
                                        </Box>
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontSize: '0.8rem',
                                          color: T.muted,
                                          bgcolor: isEven ? '#fff' : T.rowOdd,
                                          borderBottom: `1px solid ${T.divider}`,
                                          px: 1.75,
                                          py: 1,
                                          textAlign: 'center',
                                          transition: 'background-color 0.12s',
                                        }}
                                      >
                                        {row.day}
                                      </TableCell>
                                      {buildCell(
                                        row.timeIN || '—',
                                        'actual',
                                        isEven,
                                        true,
                                      )}
                                      {buildCell(row.timeOUT || '—', 'actual', isEven)}
                                      {buildCell(
                                        row.officialTimeIN || '—',
                                        'official',
                                        isEven,
                                        true,
                                      )}
                                      {buildCell(
                                        row.officialTimeOUT || '—',
                                        'official',
                                        isEven,
                                      )}
                                      {buildCell(
                                        isFurlough
                                          ? !row.formattedFacultyMaxRenderedTime ||
                                            row.formattedFacultyMaxRenderedTime ===
                                              'NaN:NaN:NaN'
                                            ? '00:00:00'
                                            : row.formattedFacultyMaxRenderedTime
                                          : !row.officialTimeIN ||
                                              !row.timeOUT ||
                                              row.formattedFacultyRenderedTime ===
                                                'NaN:NaN:NaN'
                                            ? '00:00:00'
                                            : row.formattedFacultyRenderedTime,
                                        'calc',
                                        isEven,
                                        true,
                                      )}
                                      {buildCell(
                                        isFurlough
                                          ? '00:00:00'
                                          : !row.officialTimeIN ||
                                              !row.timeOUT ||
                                              row.formattedfinalcalcFaculty ===
                                                'NaN:NaN:NaN'
                                            ? row.formattedFacultyMaxRenderedTime
                                            : row.formattedfinalcalcFaculty,
                                        'tard',
                                        isEven,
                                      )}
                                    </TableRow>
                                  );
                                })}

                                {bottomH > 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={8}
                                      sx={{
                                        p: 0,
                                        borderBottom: 'none',
                                        height: bottomH,
                                      }}
                                    />
                                  </TableRow>
                                )}
                              </>
                            );
                          })()}
                          {/* Totals row */}
                          <TableRow
                            sx={{
                              bgcolor: T.accentFaint,
                              borderTop: `2px solid ${T.accentBorder}`,
                            }}
                          >
                            <TableCell
                              colSpan={6}
                              sx={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                color: T.faint,
                                textAlign: 'right',
                                pr: 2.5,
                                py: 1.25,
                                borderBottom: 'none',
                              }}
                            >
                              Overall Rendered Time ({startDate} – {endDate})
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: '#166534',
                                textAlign: 'center',
                                py: 1.25,
                                borderBottom: 'none',
                                borderLeft: `2px solid ${T.accentBorder}`,
                                bgcolor: 'rgba(21,128,61,0.07)',
                              }}
                            >
                              {totals.regularRendered || '00:00:00'}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: '#991b1b',
                                textAlign: 'center',
                                py: 1.25,
                                borderBottom: 'none',
                                bgcolor: 'rgba(153,27,27,0.07)',
                              }}
                            >
                              {totals.regularTardiness || '00:00:00'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}

                    {/* HN / SC / OT TABS */}
                    {activeTab !== 'regular' && columns && (
                      <Table
                        sx={{
                          minWidth: columns.reduce(
                            (s, c) => s + (c.minWidth || 120),
                            0,
                          ),
                          borderCollapse: 'collapse',
                        }}
                      >
                        {buildTwoRowHead(columns)}
                        <TableBody>
                          {(() => {
                            const total = attendanceData.length;
                            const start = Math.max(
                              0,
                              Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
                            );
                            const end = Math.min(
                              total,
                              Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) +
                                OVERSCAN_ROWS,
                            );
                            const topH = start * ROW_HEIGHT;
                            const bottomH = (total - end) * ROW_HEIGHT;
                            const visible = attendanceData.slice(start, end);

                            return (
                              <>
                                {topH > 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={columns.length}
                                      sx={{
                                        p: 0,
                                        borderBottom: 'none',
                                        height: topH,
                                      }}
                                    />
                                  </TableRow>
                                )}

                                {visible.map((row, vi) => {
                                  const ri = start + vi;
                                  const isFurlough = Boolean(
                                    getStatusLabelForDate(row.date),
                                  );
                                  const isEven = ri % 2 === 0;
                                  return (
                                    <TableRow
                                      key={row.date || ri}
                                      sx={{
                                        '&:hover td': {
                                          bgcolor: `${T.rowHover} !important`,
                                        },
                                      }}
                                    >
                                      {columns.map(
                                        ({ key, group, dividerBefore: db }) => {
                                          if (key === 'date') {
                                            const statusLabel = getStatusLabelForDate(
                                              row.date,
                                            );
                                            return (
                                              <TableCell
                                                key={key}
                                                sx={{
                                                  fontSize: '0.8rem',
                                                  fontWeight: 600,
                                                  color: T.text,
                                                  bgcolor: isEven ? '#fff' : T.rowOdd,
                                                  borderBottom: `1px solid ${T.divider}`,
                                                  px: 1.75,
                                                  py: 1,
                                                  whiteSpace: 'nowrap',
                                                  textAlign: 'center',
                                                  transition:
                                                    'background-color 0.12s',
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 0.3,
                                                  }}
                                                >
                                                  <span>{row.date}</span>
                                                  {statusLabel && (
                                                    <Chip
                                                      size="small"
                                                      label={statusLabel}
                                                      sx={{
                                                        fontWeight: 700,
                                                        fontSize: '0.62rem',
                                                        height: 16,
                                                        ...getStatusStyle(statusLabel),
                                                      }}
                                                    />
                                                  )}
                                                </Box>
                                              </TableCell>
                                            );
                                          }
                                          if (key === 'day') {
                                            return (
                                              <TableCell
                                                key={key}
                                                sx={{
                                                  fontSize: '0.8rem',
                                                  color: T.muted,
                                                  bgcolor: isEven ? '#fff' : T.rowOdd,
                                                  borderBottom: `1px solid ${T.divider}`,
                                                  px: 1.75,
                                                  py: 1,
                                                  textAlign: 'center',
                                                  transition:
                                                    'background-color 0.12s',
                                                }}
                                              >
                                                {row.day}
                                              </TableCell>
                                            );
                                          }
                                          return (
                                            <React.Fragment key={key}>
                                              {buildCell(
                                                getCellValue(row, key, isFurlough),
                                                group,
                                                isEven,
                                                db,
                                              )}
                                            </React.Fragment>
                                          );
                                        },
                                      )}
                                    </TableRow>
                                  );
                                })}

                                {bottomH > 0 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={columns.length}
                                      sx={{
                                        p: 0,
                                        borderBottom: 'none',
                                        height: bottomH,
                                      }}
                                    />
                                  </TableRow>
                                )}
                              </>
                            );
                          })()}
                          {/* Totals row */}
                          <TableRow
                            sx={{
                              bgcolor: T.accentFaint,
                              borderTop: `2px solid ${T.accentBorder}`,
                            }}
                          >
                            <TableCell
                              colSpan={6}
                              sx={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                color: T.faint,
                                textAlign: 'right',
                                pr: 2.5,
                                py: 1.25,
                                borderBottom: 'none',
                              }}
                            >
                              Overall Rendered Time ({startDate} – {endDate})
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: '#166534',
                                textAlign: 'center',
                                py: 1.25,
                                borderBottom: 'none',
                                borderLeft: `2px solid ${T.accentBorder}`,
                                bgcolor: 'rgba(21,128,61,0.07)',
                              }}
                            >
                              {tabTotals[0] || '00:00:00'}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: '#991b1b',
                                textAlign: 'center',
                                py: 1.25,
                                borderBottom: 'none',
                                bgcolor: 'rgba(153,27,27,0.07)',
                              }}
                            >
                              {tabTotals[1] || '00:00:00'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </Box>

                {/* Footer legend */}
                <Box
                  sx={{
                    px: 0,
                    pt: 1.5,
                    display: 'flex',
                    gap: 2.5,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {[
                    {
                      icon: (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '2px',
                            bgcolor: alpha(T.accent, 0.12),
                            border: `1px solid ${alpha(T.accent, 0.3)}`,
                          }}
                        />
                      ),
                      label: 'Employee device punch-in/out',
                    },
                    {
                      icon: (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '2px',
                            bgcolor: 'rgba(21,128,61,0.1)',
                            border: '1px solid rgba(21,128,61,0.3)',
                          }}
                        />
                      ),
                      label: 'Computed rendered time',
                    },
                    {
                      icon: (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '2px',
                            bgcolor: 'rgba(153,27,27,0.08)',
                            border: '1px solid rgba(153,27,27,0.3)',
                          }}
                        />
                      ),
                      label: 'Computed tardiness',
                    },
                  ].map((item, i) => (
                    <Box
                      key={i}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}
                    >
                      {item.icon}
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Fade>
        )}

        {/* ── Floating Totals + Save Bar ── */}
        <FloatingTotalsBar
          totals={totals}
          visible={attendanceData.length > 0}
          onSave={saveOverallAttendance}
          saving={saving}
          activeTab={activeTab}
          startDate={startDate}
          endDate={endDate}
        />

        {/* ── No Official Time Modal ── */}
        <Dialog
          open={showNoOfficialTimeModal}
          onClose={() => setShowNoOfficialTimeModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '12px',
              border: '0.5px solid rgba(0,0,0,0.09)',
            },
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 3,
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{ bgcolor: alpha('#ff9800', 0.15), width: 48, height: 48 }}
            >
              <WorkHistory sx={{ fontSize: 24, color: '#ff9800' }} />
            </Avatar>
            <Box>
              <Typography
                sx={{ fontWeight: 800, fontSize: '1.05rem', color: T.accent }}
              >
                No Official Time Schedule
              </Typography>
              <Typography sx={{ fontSize: '0.74rem', color: T.faint }}>
                Employee #{employeeNumber}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}` }}>
            <Alert
              severity="warning"
              sx={{ mb: 2, borderRadius: 2, fontSize: '0.82rem' }}
            >
              Cannot generate attendance records. This employee needs an
              official time schedule set up first.
            </Alert>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
              }}
            >
              <Typography
                sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.accent }}
              >
                Please set up the official time schedule in the Official Time
                Management module.
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              gap: 1,
              justifyContent: 'flex-end',
              borderTop: `1px solid ${T.divider}`,
            }}
          >
            <RowBtn
              icon={null}
              label="Close"
              color={T.muted}
              hoverBg="rgba(0,0,0,0.05)"
              onClick={() => setShowNoOfficialTimeModal(false)}
            />
            <button
              onClick={() => {
                setShowNoOfficialTimeModal(false);
                navigate('/official_time');
              }}
              style={{
                background: T.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.accentDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.accent;
              }}
            >
              Setup Official Time
            </button>
          </Box>
        </Dialog>

        {/* ── Styled Modal ── */}
        <StyledModal
          open={modal.open}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onConfirm={modal.onConfirm}
          showCancel={modal.showCancel}
        />

        <OverallAttendanceCompareModal
          open={compareOpen}
          onClose={handleCompareClose}
          onConfirm={handleCompareConfirm}
          savedRow={pendingSavedOverall}
          proposedRecord={pendingProposedOverall}
          fields={OVERALL_COMPARE_FIELD_META}
          title="Compare saved summary vs new totals"
        />

        {/* ── Scroll to Top FAB ── */}
        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 45,
              zIndex: 1000,
              bgcolor: T.accent,
              color: '#fff',
              '&:hover': { bgcolor: T.accentDark },
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
            }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>
      </Box>
    </Fade>
  );
};

export default AttendanceModuleFaculty;
