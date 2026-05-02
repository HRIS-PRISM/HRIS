import API_BASE_URL from '../../apiConfig';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Chip,
  CircularProgress,
  Fade,
  FormControl,
  Select,
  MenuItem,
  Snackbar,
  alpha,
  styled,
  Card,
  Button,
  Fab,
  Zoom,
  Avatar,
  Checkbox,
  Dialog,
  LinearProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  Paper,
  List,
  ListItemButton,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Info,
  Refresh,
  ArrowBackIos,
  Clear,
  KeyboardArrowUp,
  FilterList,
  NewReleases,
  Send,
  People,
  Assignment,
  ArrowBack,
  ArrowForward,
  SearchOutlined,
  ExpandMore,
  ExpandLess,
  Close,
} from '@mui/icons-material';
import { Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─── Theme tokens ──────────────────────────────────────────────────────────
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
const ViewAttendanceWireframe = () => (
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
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${T.accentBorder}`,
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
            justifyContent: 'space-between',
            gap: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'rgba(109,35,35,0.12)',
              }}
            />
            <Box>
              <Bone w={280} h={18} sx={{ mb: 1 }} />
              <Bone w={380} h={11} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 136,
                height: 28,
                borderRadius: 10,
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
              }}
            />
            <Box
              sx={{
                width: 110,
                height: 28,
                borderRadius: 10,
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
              }}
            />
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
              }}
            />
          </Box>
        </Box>
      </Box>
      {/* Two-column */}
      <Grid container spacing={2}>
        {[3, 9].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${T.accentBorder}`,
                bgcolor: '#fff',
                overflow: 'hidden',
                animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`,
                height: 'calc(100vh - 280px)',
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  borderBottom: `1px solid ${T.divider}`,
                  bgcolor: T.accentFaint,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'rgba(109,35,35,0.12)',
                  }}
                />
                <Bone w={lg === 3 ? 140 : 220} h={12} />
              </Box>
              {lg === 3 ? (
                <Box
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5,
                  }}
                >
                  {[100, 160, 120, 140].map((w, i) => (
                    <Box key={i}>
                      <Bone w={w} h={10} sx={{ mb: 1 }} />
                      <Box
                        sx={{
                          height: 38,
                          borderRadius: 2,
                          border: `1px solid ${T.accentBorder}`,
                          bgcolor: '#fafafa',
                        }}
                      />
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 52,
                          height: 34,
                          borderRadius: '6px',
                          bgcolor: T.accentFaint,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                  }}
                >
                  <Box
                    sx={{
                      px: 3,
                      py: 1.8,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: T.accentFaint,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: 'rgba(109,35,35,0.12)',
                        }}
                      />
                      <Bone w={160} h={11} />
                    </Box>
                    <Box
                      sx={{
                        width: 120,
                        height: 30,
                        borderRadius: 1.5,
                        border: `1px solid ${T.accentBorder}`,
                        bgcolor: '#fafafa',
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.1,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: T.accent,
                      display: 'grid',
                      gridTemplateColumns: '0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr',
                      gap: 1,
                    }}
                  >
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          height: 9,
                          borderRadius: 4,
                          bgcolor: 'rgba(255,255,255,0.36)',
                        }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ px: 2.5, py: 1.2, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr',
                          gap: 1,
                          py: 0.45,
                        }}
                      >
                        {Array.from({ length: 10 }).map((__, j) => (
                          <Bone key={j} h={10} />
                        ))}
                      </Box>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      px: 3,
                      py: 1.2,
                      borderTop: `1px solid ${T.divider}`,
                      bgcolor: T.accentFaint,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Bone w={180} h={10} />
                    <Bone w={140} h={10} />
                    <Bone w={200} h={10} />
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Styled components ─────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

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

// Compact label for the left panel
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
    <Icon sx={{ fontSize: 10, color: alpha(T.accent, 0.45) }} />
    <Typography
      sx={{
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: alpha(T.accent, 0.45),
      }}
    >
      {children}
    </Typography>
  </Box>
);

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const selectSx = {
  borderRadius: '8px',
  fontSize: '0.82rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: T.accent,
    borderWidth: '1.5px',
  },
};

// Compact select sx for sidebar
const compactSelectSx = {
  ...selectSx,
  fontSize: '0.76rem',
  '& .MuiSelect-select': { py: '5px !important', fontSize: '0.76rem' },
};

// ─── Row action button ─────────────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '6px',
      padding: '4px 10px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.72rem',
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

// ─── Uncategorized badge ───────────────────────────────────────────────────
const UncategorizedBadge = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 1.25,
      py: 0.3,
      borderRadius: '12px',
      bgcolor: 'rgba(244,67,54,0.10)',
      border: '1px solid rgba(244,67,54,0.28)',
    }}
  >
    <Cancel sx={{ fontSize: 11, color: '#f44336' }} />
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#f44336' }}>
      Uncategorized
    </Typography>
  </Box>
);

// ─── Time cell renderer ────────────────────────────────────────────────────
const TimeCell = ({ time, isUncategorized }) => {
  const formatted = formatTime(time);
  if (formatted)
    return (
      <Typography sx={{ fontSize: '0.78rem', color: '#1a1a1a' }}>
        {formatted}
      </Typography>
    );
  if (isUncategorized) return <UncategorizedBadge />;
  return (
    <Typography sx={{ fontSize: '0.75rem', color: '#a0a0a0' }}>—</Typography>
  );
};

// ─── Utility functions ─────────────────────────────────────────────────────
const formatTime = (time) => {
  if (!time) return null;
  if (time.includes('AM') || time.includes('PM')) {
    const [hour, minute, second] = time.split(/[: ]/);
    return `${hour.padStart(2, '0')}:${minute}:${second} ${time.slice(-2)}`;
  }
  const [hour, minute, second] = time.split(':');
  const hour24 = parseInt(hour, 10);
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minute}:${second} ${hour24 < 12 ? 'AM' : 'PM'}`;
};

const getDayOfWeek = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });

const formatFullName = (fullName) => {
  if (!fullName) return '';
  const cleaned = String(fullName).trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
  let suffix = '';
  if (suffixes.has(parts[parts.length - 1]?.toUpperCase()))
    suffix = parts.pop();
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

const highlightMatch = (text, q) => {
  const query = (q || '').trim();
  if (!query || !text) return text;
  const s = String(text);
  const idx = s.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {s.slice(0, idx)}
      <span
        style={{
          backgroundColor: '#ffeb3b',
          color: '#000',
          padding: '0 3px',
          borderRadius: 2,
        }}
      >
        {s.slice(idx, idx + query.length)}
      </span>
      {s.slice(idx + query.length)}
    </span>
  );
};

// ─── Employee search field ─────────────────────────────────────────────────
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
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Name or employee no..."
        disabled={disabled}
        autoComplete="off"
        inputProps={{ autoComplete: 'new-password', style: { fontSize: '0.76rem', padding: '5px 8px' } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#fff',
            '& fieldset': { borderColor: T.accentBorder },
            '&:hover fieldset': { borderColor: T.accent },
            '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined sx={{ color: T.muted, fontSize: 14 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={12} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.2 }}>
                  <Close sx={{ fontSize: 12, color: T.faint }} />
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
            maxHeight: 240,
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
                py: 2,
              }}
            >
              <CircularProgress size={14} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: '0.76rem', color: T.muted }}>
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
                    py: 0.75,
                    px: 1.5,
                    borderBottom: `1px solid ${T.divider}`,
                    '&:hover': { bgcolor: T.accentFaint },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                      {formatFullName(emp.fullName)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: T.muted }}>
                      #{emp.employeeNumber}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontStyle: 'italic' }}>
                {query.trim().length >= 2
                  ? `No user found for "${query.trim()}"`
                  : 'Type at least 2 characters'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const ViewAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  const [personID, setPersonID] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [personName, setPersonName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // ── Unified overlay (matches AllAttendanceRecord) ──
  const [successOverlayOpen, setSuccessOverlayOpen] = useState(false);

  const [allUsersDTR, setAllUsersDTR] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [viewMode, setViewMode] = useState('single');
  const [selectedMonth, setSelectedMonth] = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [departments, setDepartments] = useState([]);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [departmentCodeFilter, setDepartmentCodeFilter] = useState('');
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordFilter, setRecordFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearchedSingle, setHasSearchedSingle] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const trimmedSearch = debouncedSearch.trim();

  const [progressTotal, setProgressTotal] = useState(0);
  const [progressDone, setProgressDone] = useState(0);
  const [loadPhase, setLoadPhase] = useState('');

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);
  const progressDoneRef = useRef(0);
  const progressRafRef = useRef(null);

  const { hasAccess, loading: accessLoading } =
    usePageAccess('view-attendance');

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  useEffect(() => {
    if (!accessLoading) setPageLoading(false);
  }, [accessLoading]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (progressRafRef.current) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
  }, []);

  const fetchDepartmentsAndAssignments = async () => {
    setLoadingDepartments(true);
    try {
      const [deptRes, assignRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders()),
        axios.get(
          `${API_BASE_URL}/api/department-assignment`,
          getAuthHeaders(),
        ),
      ]);
      const deptList = Array.isArray(deptRes.data) ? deptRes.data : [];
      deptList.sort((a, b) =>
        String(a?.code || '').localeCompare(String(b?.code || '')),
      );
      setDepartments(deptList);
      const map = {};
      (Array.isArray(assignRes.data) ? assignRes.data : []).forEach((a) => {
        if (!a?.employeeNumber) return;
        map[String(a.employeeNumber)] = a.code || '';
      });
      setDepartmentAssignmentsMap(map);
    } catch (err) {
      console.error('Error fetching departments/assignments:', err);
      setDepartments([]);
      setDepartmentAssignmentsMap({});
      showSnackbar('Failed to load departments for filtering', 'warning');
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (viewMode !== 'multiple') return;
    fetchDepartmentsAndAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const filteredUsers = useMemo(() => {
    const searchableUsers = allUsersDTR.map((u) => ({
      ...u,
      _searchText:
        `${u.fullName || ''} ${u.lastName || ''} ${u.employeeNumber || ''}`.toLowerCase(),
      _formattedFullName: formatFullName(u.fullName),
    }));

    let f = searchableUsers;
    if (recordFilter === 'has') f = f.filter((u) => (u.recordsCount || 0) > 0);
    else if (recordFilter === 'no')
      f = f.filter((u) => (u.recordsCount || 0) === 0);
    if (departmentCodeFilter) {
      f = f.filter((u) => {
        const dc = departmentAssignmentsMap?.[u.employeeNumber] || '';
        if (departmentCodeFilter === '__UNASSIGNED__') return !dc;
        return dc === departmentCodeFilter;
      });
    }
    if (!trimmedSearch) return f;
    const q = trimmedSearch.toLowerCase();
    return f.filter((u) => u._searchText.includes(q));
  }, [
    allUsersDTR,
    recordFilter,
    departmentCodeFilter,
    departmentAssignmentsMap,
    trimmedSearch,
  ]);

  const selectedCountInFiltered = useMemo(() => {
    let c = 0;
    for (const u of filteredUsers) if (selectedUsers.has(u.employeeNumber)) c++;
    return c;
  }, [filteredUsers, selectedUsers]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage)),
    [filteredUsers.length, rowsPerPage],
  );
  const paginatedUsers = useMemo(() => {
    const s = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(s, s + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);
  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) {
      setLoading(true);
      setSuccessOverlayOpen(false);
    }
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/all-attendance`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );
      const recs = Array.isArray(res.data) ? res.data : [];
      setRecords(recs);
      if (recs.length > 0) {
        setPersonName(recs[0].PersonName);
        showSnackbar(`Loaded ${recs.length} records`, 'success');
        if (showLoading) setSuccessOverlayOpen(true);
      } else {
        setPersonName('');
        showSnackbar('No records found for this period', 'info');
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError('Failed to fetch attendance records. Please try again.');
      showSnackbar('Failed to fetch attendance records', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchAllUsersDTR = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select a month first', 'warning');
      return;
    }
    setLoadingAllUsers(true);
    setProgressDone(0);
    progressDoneRef.current = 0;
    if (progressRafRef.current) {
      window.cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    setProgressTotal(0);
    setLoadPhase('Loading employee list…');
    try {
      const usersRes = await axios.get(
        `${API_BASE_URL}/attendance/api/all-device-users`,
        getAuthHeaders(),
      );
      let users = usersRes.data || [];
      if (
        departmentCodeFilter &&
        Object.keys(departmentAssignmentsMap || {}).length === 0 &&
        !loadingDepartments
      )
        await fetchDepartmentsAndAssignments();
      if (departmentCodeFilter) {
        const dm = departmentAssignmentsMap || {};
        users = users.filter((u) => {
          const dc = dm[String(u?.PersonID ?? '')] || '';
          if (departmentCodeFilter === '__UNASSIGNED__') return !dc;
          return dc === departmentCodeFilter;
        });
      }
      setProgressTotal(users.length);
      setProgressDone(0);
      progressDoneRef.current = 0;
      const dtrPromises = users.map(async (user) => {
        const empNo = user?.PersonID;
        const dn = user?.PersonName || empNo || 'Unknown';
        try {
          const dr = await axios.post(
            `${API_BASE_URL}/attendance/api/all-attendance`,
            { personID: empNo, startDate, endDate },
            getAuthHeaders(),
          );
          const dd = Array.isArray(dr.data) ? dr.data : [];
          return {
            employeeNumber: empNo,
            firstName: dn.split(' ')[0],
            lastName: dn.split(' ').slice(1).join(' '),
            fullName: dn,
            recordsCount: dd.length,
            hasRecords: dd.length > 0,
          };
        } catch {
          return {
            employeeNumber: empNo,
            firstName: dn.split(' ')[0],
            lastName: dn.split(' ').slice(1).join(' '),
            fullName: dn,
            recordsCount: 0,
            hasRecords: false,
          };
        } finally {
          progressDoneRef.current += 1;
          if (!progressRafRef.current) {
            progressRafRef.current = window.requestAnimationFrame(() => {
              setProgressDone(progressDoneRef.current);
              progressRafRef.current = null;
            });
          }
        }
      });
      const all = await Promise.all(dtrPromises);
      if (progressRafRef.current) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
      setProgressDone(progressDoneRef.current);
      all.sort((a, b) =>
        (a.lastName || '')
          .toUpperCase()
          .localeCompare((b.lastName || '').toUpperCase()),
      );
      setAllUsersDTR(all);
      const totalRecs = all.reduce((s, u) => s + (u.recordsCount || 0), 0);
      const withRecs = all.filter((u) => u.hasRecords).length;
      showSnackbar(
        `Loaded ${all.length} employees (${withRecs} with records)`,
        'success',
      );
      if (totalRecs > 0) {
        setModalMessage(
          `Successfully auto-saved ${totalRecs} attendance records for ${withRecs} employees to the database.`,
        );
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Error fetching all users DTR:', err);
      showSnackbar(
        'Error fetching users: ' + (err.response?.data?.error || err.message),
        'error',
      );
    } finally {
      if (progressRafRef.current) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
      setProgressDone(progressDoneRef.current);
      setLoadingAllUsers(false);
      setLoadPhase('');
    }
  };

  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
    fetchAllUsersDTRRef.current = fetchAllUsersDTR;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;
    const handleAttendanceChanged = (payload) => {
      const ids = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID
          ? [payload.personID]
          : [];
      if (viewMode === 'single') {
        if (personID && ids.length > 0 && !ids.includes(personID)) return;
        if (personID && startDate && endDate && hasSearchedSingle)
          fetchRecordsRef.current?.(false);
        return;
      }
      if (!startDate || !endDate || allUsersDTR.length === 0) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchAllUsersDTRRef.current?.(), 150);
    };
    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [
    socket,
    connected,
    viewMode,
    personID,
    startDate,
    endDate,
    allUsersDTR.length,
    hasSearchedSingle,
  ]);

  const handleSendToDTR = async () => {
    if (!personID || !startDate || !endDate) {
      showSnackbar('Please fill in all fields first', 'warning');
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/send-to-dtr`,
        { personID, startDate, endDate },
        getAuthHeaders(),
      );
      if (res.data.success) {
        showSnackbar(res.data.message, 'success');
        navigate('/daily_time_record_faculty', {
          state: {
            employeeNumber: personID,
            fullName: personName,
            startDate,
            endDate,
          },
        });
      }
    } catch (err) {
      showSnackbar(
        err.response?.data?.message || 'Failed to view to DTR',
        'error',
      );
    }
  };

  const handleBulkSendToDTR = async () => {
    const sel = filteredUsers.filter((u) =>
      selectedUsers.has(u.employeeNumber),
    );
    if (sel.length === 0) {
      showSnackbar('Please select at least one user', 'warning');
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/bulk-send-to-dtr`,
        { userIDs: sel.map((u) => u.employeeNumber), startDate, endDate },
        getAuthHeaders(),
      );
      if (res.data.success) {
        showSnackbar(res.data.message, 'success');
        navigate('/daily_time_record_faculty', {
          state: { users: sel, startDate, endDate, isBulk: true },
        });
      }
    } catch (err) {
      showSnackbar(
        err.response?.data?.message || 'Failed to view DTR',
        'error',
      );
    }
  };

  const handleUserSelect = (empNo) =>
    setSelectedUsers((p) => {
      const n = new Set(p);
      n.has(empNo) ? n.delete(empNo) : n.add(empNo);
      return n;
    });
  const handleSelectAll = (checked) =>
    checked
      ? setSelectedUsers(new Set(filteredUsers.map((u) => u.employeeNumber)))
      : setSelectedUsers(new Set());

  const handleSingleSearch = () => {
    if (!personID || !startDate || !endDate) {
      showSnackbar(
        'Please enter an employee number and select a month before searching.',
        'warning',
      );
      return;
    }
    setHasSearchedSingle(true);
    fetchRecords(true);
  };

  // Month click — shared for both modes
  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
    if (viewMode === 'single') {
      setHasSearchedSingle(false);
      setRecords([]);
      setPersonName('');
    }
  };

  // Quick date helpers
  const setQuickDate = (s, e) => {
    setStartDate(s);
    setEndDate(e);
    setSelectedMonth(null);
    if (viewMode === 'single') {
      setHasSearchedSingle(false);
      setRecords([]);
      setPersonName('');
    }
  };

  const handleQuickDateSelect = (value) => {
    if (!value) return;
    if (value === 'today') {
      setQuickDate(formattedToday, formattedToday);
      return;
    }
    if (value === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = y.toISOString().substring(0, 10);
      setQuickDate(s, s);
      return;
    }
    if (value === 'last7') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setQuickDate(d.toISOString().substring(0, 10), formattedToday);
      return;
    }
    if (value === 'last15') {
      const d = new Date(today);
      d.setDate(d.getDate() - 15);
      setQuickDate(d.toISOString().substring(0, 10), formattedToday);
      return;
    }
    if (value === 'last30') {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      setQuickDate(d.toISOString().substring(0, 10), formattedToday);
    }
  };

  const uncategorizedRowCount = useMemo(
    () =>
      records.filter((r) => {
        const t1 = !!r.Time1;
        const t2 = !!r.Time2;
        const t3 = !!r.Time3;
        const t4 = !!r.Time4;
        const hasAnyTime = t1 || t2 || t3 || t4;
        return hasAnyTime && (!t1 || !t4);
      }).length,
    [records],
  );

  // ── Guards ──
  if (pageLoading || accessLoading) return <ViewAttendanceWireframe />;
  if (hasAccess === false)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Device Attendance Records."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // ─── Left panel content — compact, no scroll ──────────────────────────
  const renderLeftPanel = () => (
    <Box
      sx={{
        px: 2,
        py: 1,
        flexGrow: 1,
        overflow: 'hidden', // NO scroll
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* View Mode toggle */}
      <FormSectionLabel icon={People}>View Mode</FormSectionLabel>
      <Box sx={{ display: 'flex', gap: '4px', mb: 1.25 }}>
        {[
          { val: 'single', label: 'Single User' },
          { val: 'multiple', label: 'All Users' },
        ].map(({ val, label }) => {
          const isActive = viewMode === val;
          return (
            <Box
              key={val}
              onClick={() => {
                setViewMode(val);
                setRecords([]);
                setPersonName('');
                setAllUsersDTR([]);
                setSelectedUsers(new Set());
                setHasSearchedSingle(false);
              }}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1,
                py: 0.6,
                borderRadius: '6px',
                cursor: 'pointer',
                border: `1px solid ${isActive ? T.accent : T.accentBorder}`,
                bgcolor: isActive ? T.accent : 'transparent',
                transition: 'all 0.14s ease',
                '&:hover': isActive ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accent}` },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : T.text,
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

      {/* Year + Quick Dates inline */}
      <Box sx={{ display: 'flex', gap: '6px', mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <FormSectionLabel icon={CalendarToday}>Year</FormSectionLabel>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(parseInt(e.target.value));
              setSelectedMonth(null);
              setHasSearchedSingle(false);
              setRecords([]);
              setPersonName('');
              showSnackbar('Year changed — select a month to load records.', 'info');
            }}
            style={{
              width: '100%',
              padding: '5px 8px',
              borderRadius: '6px',
              border: `1px solid ${T.accentBorder}`,
              fontSize: '0.74rem',
              outline: 'none',
              fontFamily: 'inherit',
              background: '#fff',
              color: T.text,
              cursor: 'pointer',
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Box>
        <Box sx={{ flex: 1 }}>
          <FormSectionLabel icon={AccessTime}>Quick</FormSectionLabel>
          <FormControl size="small" fullWidth>
            <Select
              value=""
              displayEmpty
              onChange={(e) => handleQuickDateSelect(e.target.value)}
              sx={{
                ...compactSelectSx,
                '& .MuiSelect-select': { py: '5px !important', fontSize: '0.72rem' },
              }}
              renderValue={() => 'Quick Dates'}
            >
              <MenuItem value="today" sx={{ fontSize: '0.76rem' }}>Today</MenuItem>
              <MenuItem value="yesterday" sx={{ fontSize: '0.76rem' }}>Yesterday</MenuItem>
              <MenuItem value="last7" sx={{ fontSize: '0.76rem' }}>Last 7 Days</MenuItem>
              <MenuItem value="last15" sx={{ fontSize: '0.76rem' }}>Last 15 Days</MenuItem>
              <MenuItem value="last30" sx={{ fontSize: '0.76rem' }}>Last 30 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Month label row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarToday sx={{ fontSize: 10, color: alpha(T.accent, 0.45) }} />
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45) }}>
            Month
          </Typography>
        </Box>
        {selectedMonth !== null && (
          <Box
            onClick={() => {
              setSelectedMonth(null);
              setStartDate('');
              setEndDate('');
              setRecords([]);
              setPersonName('');
              setAllUsersDTR([]);
              setHasSearchedSingle(false);
            }}
            sx={{ fontSize: '0.62rem', color: T.accent, cursor: 'pointer', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
          >
            Clear
          </Box>
        )}
      </Box>

      {/* Month grid — compact */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '4px',
          mb: 1.25,
        }}
      >
        {monthsShort.map((m, idx) => {
          const isSelected = selectedMonth === idx;
          return (
            <Box
              key={m}
              onClick={() => handleMonthClick(idx)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 28,
                px: 0.5,
                py: 0.4,
                borderRadius: '5px',
                cursor: 'pointer',
                border: `1px solid ${isSelected ? T.accent : T.accentBorder}`,
                bgcolor: isSelected ? T.accent : 'transparent',
                transition: 'all 0.14s ease',
                '&:hover': isSelected ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accent}` },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? '#fff' : T.text,
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                }}
              >
                {m}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ── Multiple mode extras ── */}
      {viewMode === 'multiple' && (
        <>
          <FormSectionLabel icon={FilterList}>Department</FormSectionLabel>
          <Box sx={{ mb: 0.75 }}>
            <FormControl fullWidth size="small" disabled={loadingDepartments}>
              <Select
                value={departmentCodeFilter}
                onChange={(e) => { setDepartmentCodeFilter(e.target.value); setCurrentPage(1); }}
                displayEmpty
                sx={compactSelectSx}
              >
                <MenuItem value="" sx={{ fontSize: '0.76rem' }}>All Departments</MenuItem>
                <MenuItem value="__UNASSIGNED__" sx={{ fontSize: '0.76rem' }}>Unassigned</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id ?? d.code} value={d.code} sx={{ fontSize: '0.76rem' }}>
                    {d.code}{d.description ? ` — ${d.description}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={fetchAllUsersDTR}
            disabled={loadingAllUsers || !startDate || !endDate}
            startIcon={
              loadingAllUsers
                ? <CircularProgress size={12} sx={{ color: '#fff' }} />
                : <People sx={{ fontSize: '14px !important' }} />
            }
            sx={{
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.74rem',
              py: 0.6,
              mb: 0.75,
              bgcolor: T.accent,
              color: '#fff',
              boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
              '&:hover': { bgcolor: T.accentDark },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {loadingAllUsers ? 'Loading…' : 'Load All Users'}
          </Button>

          {/* Batch summary — compact */}
          <Box sx={{ px: 1.25, py: 1, borderRadius: 1.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.65), mb: 0.3, lineHeight: 1 }}>
              Batch Summary
            </Typography>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 800, color: T.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loadingAllUsers
                ? `${loadPhase || 'Loading…'}`
                : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'employee' : 'employees'} found`}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: T.muted, mt: 0.25, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loadingAllUsers
                ? `${progressDone} / ${progressTotal} processed`
                : 'Use filters on the right to narrow the list.'}
            </Typography>
          </Box>
        </>
      )}

      {/* ── Single mode extras ── */}
      {viewMode === 'single' && (
        <Box>
          <FormSectionLabel icon={SearchOutlined}>Employee</FormSectionLabel>
          <Box sx={{ mb: 0.75 }}>
            <EmployeeSearchField
              value={personID}
              onSelectEmployeeNumber={(next) => {
                setPersonID(next);
                setHasSearchedSingle(false);
                setRecords([]);
                setPersonName('');
              }}
            />
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSingleSearch}
            startIcon={<Search sx={{ fontSize: '14px !important' }} />}
            sx={{
              borderRadius: '6px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.74rem',
              py: 0.6,
              mb: 0.75,
              bgcolor: T.accent,
              color: '#fff',
              boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
              '&:hover': { bgcolor: T.accentDark },
            }}
          >
            Fetch Records
          </Button>

          {/* Record summary — compact */}
          <Box sx={{ px: 1.25, py: 1, borderRadius: 1.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.65), mb: 0.3, lineHeight: 1 }}>
              Record Summary
            </Typography>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
              {loading
                ? 'Loading records...'
                : hasSearchedSingle
                  ? `${records.length} ${records.length === 1 ? 'record' : 'records'} found`
                  : 'No records loaded'}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: T.muted, mt: 0.25, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading
                ? 'Fetching attendance data...'
                : hasSearchedSingle
                  ? personName ? `Results for ${personName}` : 'Search complete.'
                  : 'Select month and fetch records.'}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box>
        <style>{shimmerKf}</style>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%', fontWeight: 600 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Batch Success Modal (multiple-user flow) */}
        <Dialog
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            }}
          >
            <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#4caf50' }}>
              <CheckCircle sx={{ fontSize: 36, color: '#fff' }} />
            </Avatar>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: T.accent, mb: 1.5 }}>
              Records Auto-Saved Successfully!
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: T.muted, mb: 3, lineHeight: 1.6 }}>
              {modalMessage}
            </Typography>
            <AccentButton
              variant="contained"
              onClick={() => setShowSuccessModal(false)}
              sx={{
                bgcolor: T.accent,
                color: '#fff',
                boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                '&:hover': { bgcolor: T.accentDark },
              }}
            >
              OK
            </AccentButton>
          </Box>
        </Dialog>

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
          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 4,
                py: 3,
                background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                <Search sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Device Attendance Records
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    Administrative Panel • Auto-saved records from biometric devices
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha('#4caf50', 0.12), border: '1px solid rgba(76,175,80,0.25)' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircle sx={{ fontSize: 12 }} /> Auto-Save Enabled
                  </Typography>
                </Box>
                {viewMode === 'single' && records.length > 0 && (
                  <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                    <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                      {records.length} records
                    </Typography>
                  </Box>
                )}
                {viewMode === 'multiple' && allUsersDTR.length > 0 && (
                  <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                    <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                      {allUsersDTR.length} employees
                    </Typography>
                  </Box>
                )}
                <Tooltip title="Refresh">
                  <IconButton
                    onClick={() => viewMode === 'single' ? fetchRecords(true) : fetchAllUsersDTR()}
                    sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}
                  >
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* Error alert */}
          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>
              {error}
            </Alert>
          </Collapse>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>
            {/* LEFT: Sidebar */}
            <Grid item xs={12} lg={3}>
              <SectionCard
                sx={{
                  height: { xs: 'auto', lg: 'calc(100vh - 280px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: T.accentFaint,
                    flexShrink: 0,
                  }}
                >
                  <FilterList sx={{ fontSize: 13, color: T.accent }} />
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>
                    Attendance Filter
                  </Typography>
                </Box>
                {renderLeftPanel()}
              </SectionCard>
            </Grid>

            {/* RIGHT: Content */}
            <Grid item xs={12} lg={9}>
              <SectionCard
                sx={{
                  height: { xs: 'auto', lg: 'calc(100vh - 280px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* ── SINGLE USER VIEW ── */}
                {viewMode === 'single' && (
                  <>
                    {/* Toolbar */}
                    <Box
                      sx={{
                        px: 3,
                        py: 2,
                        borderBottom: `1px solid ${T.divider}`,
                        bgcolor: T.accentFaint,
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Assignment sx={{ fontSize: 15, color: T.accent }} />
                          <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                            Attendance Records
                          </Typography>
                          {personName && hasSearchedSingle && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: T.faint }} />
                              <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>
                                {personName}
                              </Typography>
                              {selectedMonth !== null && (
                                <Box sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '5px', px: '6px', py: '2px' }}>
                                  {monthsShort[selectedMonth]}
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                        {records.length > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {uncategorizedRowCount > 0 && (
                              <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: 'rgba(244,67,54,0.10)', border: '1px solid rgba(244,67,54,0.28)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Cancel sx={{ fontSize: 11, color: '#f44336' }} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#f44336', fontWeight: 700 }}>
                                  {uncategorizedRowCount} Uncategorized
                                </Typography>
                              </Box>
                            )}
                            <AccentButton
                              variant="contained"
                              size="small"
                              startIcon={<Send sx={{ fontSize: '13px !important' }} />}
                              onClick={handleSendToDTR}
                              sx={{ fontSize: '0.78rem', bgcolor: '#2e7d32', color: '#fff', boxShadow: `0 2px 8px rgba(46,125,50,0.3)`, '&:hover': { bgcolor: '#1b5e20' } }}
                            >
                              View in DTR Module
                            </AccentButton>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Records area */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative', ...scrollbarSx }}>
                      {!hasSearchedSingle || !personID ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <Person sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                            Select an Employee & Period
                          </Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                            {!personID
                              ? 'Enter an employee number and select a month from the left panel.'
                              : 'Click Fetch Records to load attendance data.'}
                          </Typography>
                        </Box>
                      ) : records.length === 0 && !loading ? (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                            No records found
                          </Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                            Try adjusting your date range or employee number.
                          </Typography>
                        </Box>
                      ) : (
                        <Fade in timeout={250}>
                          <Box>
                            {/* Column headers */}
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr',
                                px: 2.5,
                                py: 1.25,
                                bgcolor: T.accent,
                                gap: 1,
                                position: 'sticky',
                                top: 0,
                                zIndex: 2,
                                minWidth: 900,
                              }}
                            >
                              {['EMP ID', 'DATE', 'DAY', 'TIME IN', 'BREAK IN', 'BREAK OUT', 'TIME OUT', 'SPECIAL TYPE', 'SP. IN', 'SP. OUT'].map((h) => (
                                <Typography key={h} sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em' }}>
                                  {h}
                                </Typography>
                              ))}
                            </Box>
                            <Box sx={{ overflowX: 'auto' }}>
                              {records.map((record, index) => {
                                const hasTimeIn = !!record.Time1;
                                const hasBreakIn = !!record.Time3;
                                const hasBreakOut = !!record.Time2;
                                const hasTimeOut = !!record.Time4;
                                const hasAnyTime = hasTimeIn || hasBreakIn || hasBreakOut || hasTimeOut;
                                const timeInUncategorized = hasAnyTime && !hasTimeIn;
                                const timeOutUncategorized = hasAnyTime && !hasTimeOut;
                                const hasAnyUncategorized = timeInUncategorized || timeOutUncategorized;

                                let specialTypeBadge = null;
                                if (record.Time5 || record.Time6) {
                                  const type = record.specialType || 'UNCATEGORIZED';
                                  const typeLabels = { HONORARIUM: 'Honorarium', SERVICE: 'Service Credit', OVERTIME: 'Overtime', UNCATEGORIZED: 'Uncategorized' };
                                  const colors = { HONORARIUM: '#4CAF50', SERVICE: '#2196F3', OVERTIME: '#FF9800', UNCATEGORIZED: '#9E9E9E' };
                                  const bc = colors[type] || colors.UNCATEGORIZED;
                                  specialTypeBadge = (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.3, borderRadius: '10px', bgcolor: alpha(bc, 0.12), border: `1px solid ${alpha(bc, 0.3)}` }}>
                                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: bc }}>
                                        {typeLabels[type] || 'Uncategorized'}
                                      </Typography>
                                    </Box>
                                  );
                                }

                                return (
                                  <Box
                                    key={index}
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: '0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr',
                                      px: 2.5,
                                      py: 1.5,
                                      gap: 1,
                                      alignItems: 'center',
                                      minWidth: 900,
                                      bgcolor: hasAnyUncategorized ? 'rgba(244,67,54,0.03)' : index % 2 === 0 ? '#fff' : T.rowOdd,
                                      borderBottom: hasAnyUncategorized ? '1px solid rgba(244,67,54,0.12)' : `1px solid ${T.divider}`,
                                      transition: 'background 0.12s',
                                      '&:hover': { bgcolor: hasAnyUncategorized ? 'rgba(244,67,54,0.07)' : T.rowHover },
                                      '&:last-child': { borderBottom: 'none' },
                                    }}
                                  >
                                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{record.PersonID}</Typography>
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text }}>{record.Date}</Typography>
                                    <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>{getDayOfWeek(record.Date)}</Typography>
                                    <TimeCell time={record.Time1} isUncategorized={timeInUncategorized} />
                                    <TimeCell time={record.Time3} isUncategorized={false} />
                                    <TimeCell time={record.Time2} isUncategorized={false} />
                                    <TimeCell time={record.Time4} isUncategorized={timeOutUncategorized} />
                                    <Box>{specialTypeBadge || <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>—</Typography>}</Box>
                                    <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{record.Time5 ? formatTime(record.Time5) : '—'}</Typography>
                                    <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{record.Time6 ? formatTime(record.Time6) : '—'}</Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        </Fade>
                      )}
                    </Box>

                    {/* Footer legend */}
                    {records.length > 0 && (
                      <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                        {[
                          { icon: <CheckCircle sx={{ fontSize: 13, color: '#4caf50' }} />, label: 'Auto-saved from biometric device' },
                          { icon: <Info sx={{ fontSize: 13, color: T.accent }} />, label: 'Times in 12-hour format' },
                          { icon: <Cancel sx={{ fontSize: 13, color: '#f44336' }} />, label: 'Uncategorized — scanned but no button pressed' },
                        ].map((item, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                            {item.icon}
                            <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )}

                {/* ── ALL USERS VIEW ── */}
                {viewMode === 'multiple' && (
                  <>
                    {/* Toolbar */}
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <People sx={{ fontSize: 15, color: T.accent }} />
                          <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>All Users DTR</Typography>
                          {allUsersDTR.length > 0 && (
                            <Box sx={{ px: 1.5, py: 0.3, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: '0.7rem', color: T.accent, fontWeight: 700 }}>
                                {filteredUsers.length} users
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Reload all users" placement="top">
                            <IconButton
                              size="small"
                              onClick={fetchAllUsersDTR}
                              disabled={loadingAllUsers || !startDate || !endDate}
                              sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 32, height: 32, '&:hover': { bgcolor: alpha(T.accent, 0.15) }, '&:disabled': { opacity: 0.4 } }}
                            >
                              {loadingAllUsers ? <CircularProgress size={14} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </Tooltip>
                          {selectedCountInFiltered > 0 && (
                            <AccentButton
                              variant="contained"
                              size="small"
                              startIcon={<Send sx={{ fontSize: '13px !important' }} />}
                              onClick={handleBulkSendToDTR}
                              sx={{ fontSize: '0.78rem', bgcolor: '#2e7d32', color: '#fff', boxShadow: `0 2px 8px rgba(46,125,50,0.3)`, '&:hover': { bgcolor: '#1b5e20' } }}
                            >
                              View DTR ({selectedCountInFiltered})
                            </AccentButton>
                          )}
                        </Box>
                      </Box>
                      {loadingAllUsers && (
                        <Box sx={{ mt: 1.5 }}>
                          <LinearProgress sx={{ height: 3, borderRadius: 2, bgcolor: alpha(T.accent, 0.1), '& .MuiLinearProgress-bar': { bgcolor: T.accent } }} />
                          <Typography sx={{ fontSize: '0.68rem', color: T.faint, mt: 0.4 }}>{loadPhase}</Typography>
                        </Box>
                      )}
                    </Box>

                    {allUsersDTR.length > 0 ? (
                      <>
                        {/* Filters bar */}
                        <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: alpha(T.accent, 0.02), flexShrink: 0 }}>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <FieldInput
                              size="small"
                              placeholder="Search by name or employee number…"
                              value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                              sx={{ flex: 1, minWidth: 200 }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchOutlined sx={{ fontSize: 16, color: T.muted }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                              <Select value={recordFilter} onChange={(e) => { setRecordFilter(e.target.value); setCurrentPage(1); }} sx={selectSx} displayEmpty>
                                <MenuItem value="all" sx={{ fontSize: '0.82rem' }}>All Records</MenuItem>
                                <MenuItem value="has" sx={{ fontSize: '0.82rem' }}>Has Records</MenuItem>
                                <MenuItem value="no" sx={{ fontSize: '0.82rem' }}>No Records</MenuItem>
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                              <Select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} sx={selectSx}>
                                {[10, 20, 50, 100].map((n) => (
                                  <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem' }}>{n} rows</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
                              {[{ label: '«', fn: () => goToPage(1), dis: currentPage === 1 }, { label: '‹', fn: () => goToPage(currentPage - 1), dis: currentPage === 1 }].map(({ label, fn, dis }) => (
                                <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                                  <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{label}</Typography>
                                </IconButton>
                              ))}
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, minWidth: 60, textAlign: 'center' }}>
                                {currentPage} / {totalPages}
                              </Typography>
                              {[{ label: '›', fn: () => goToPage(currentPage + 1), dis: currentPage === totalPages }, { label: '»', fn: () => goToPage(totalPages), dis: currentPage === totalPages }].map(({ label, fn, dis }) => (
                                <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                                  <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{label}</Typography>
                                </IconButton>
                              ))}
                            </Box>
                          </Box>
                        </Box>

                        {/* Table */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto', ...scrollbarSx }}>
                          <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 700 }}>
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: T.accent, color: '#fff', fontWeight: 700, fontSize: '0.75rem', py: 1.25 } }}>
                                <TableCell padding="checkbox" sx={{ width: 48 }}>
                                  <Checkbox
                                    checked={selectedCountInFiltered === filteredUsers.length && filteredUsers.length > 0}
                                    indeterminate={selectedCountInFiltered > 0 && selectedCountInFiltered < filteredUsers.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                                  />
                                </TableCell>
                                {['Emp. No.', 'Full Name', 'Department', 'Records', 'Status', 'Action'].map((h) => (
                                  <TableCell key={h} sx={{ minWidth: h === 'Full Name' ? 180 : 80 }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paginatedUsers.map((user, idx) => {
                                const isSelected = selectedUsers.has(user.employeeNumber);
                                const dept = departmentAssignmentsMap?.[user.employeeNumber] || '';
                                return (
                                  <TableRow
                                    key={user.employeeNumber}
                                    sx={{ bgcolor: isSelected ? alpha(T.accent, 0.06) : idx % 2 === 0 ? '#fff' : T.rowOdd, '&:hover': { bgcolor: T.rowHover }, transition: 'background 0.1s' }}
                                  >
                                    <TableCell padding="checkbox">
                                      <Checkbox checked={isSelected} onChange={() => handleUserSelect(user.employeeNumber)} sx={{ '&.Mui-checked': { color: T.accent } }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>#{user.employeeNumber}</TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {trimmedSearch ? highlightMatch(user._formattedFullName, trimmedSearch) : user._formattedFullName}
                                    </TableCell>
                                    <TableCell>
                                      {dept ? (
                                        <Box sx={{ px: 1.2, py: 0.3, borderRadius: 1, bgcolor: alpha(T.accent, 0.07), border: `1px solid ${T.accentBorder}`, display: 'inline-block' }}>
                                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.accent }}>{dept}</Typography>
                                        </Box>
                                      ) : (
                                        <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontStyle: 'italic' }}>Unassigned</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}>{user.recordsCount || 0}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.3, borderRadius: '12px', bgcolor: user.hasRecords ? 'rgba(76,175,80,0.1)' : T.accentFaint, border: `1px solid ${user.hasRecords ? 'rgba(76,175,80,0.25)' : T.accentBorder}` }}>
                                        {user.hasRecords ? <CheckCircle sx={{ fontSize: 11, color: '#4caf50' }} /> : <Cancel sx={{ fontSize: 11, color: T.faint }} />}
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: user.hasRecords ? '#2e7d32' : T.faint }}>
                                          {user.hasRecords ? 'Auto-Saved' : 'No Records'}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <RowBtn
                                        icon={<Send sx={{ fontSize: 11 }} />}
                                        label="View DTR"
                                        color="#2e7d32"
                                        hoverBg="rgba(46,125,50,0.08)"
                                        disabled={!user.hasRecords}
                                        onClick={() => navigate('/daily_time_record_faculty', { state: { employeeNumber: user.employeeNumber, fullName: user.fullName, startDate, endDate } })}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          {paginatedUsers.length === 0 && (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                                {allUsersDTR.length === 0 ? 'No data loaded' : 'No users match your filters'}
                              </Typography>
                              <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                                {allUsersDTR.length === 0 ? 'Click Load All Users in the left panel.' : 'Try adjusting the search or filters.'}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {/* Footer */}
                        <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, flexShrink: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccentButton
                              variant="text"
                              size="small"
                              onClick={() => handleSelectAll(selectedCountInFiltered !== filteredUsers.length)}
                              sx={{ color: T.accent, fontSize: '0.75rem', '&:hover': { bgcolor: T.accentFaint, transform: 'none' }, '&:active': { transform: 'none' } }}
                            >
                              {selectedCountInFiltered === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
                            </AccentButton>
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>
                            {filteredUsers.length > 0
                              ? `Showing ${Math.min(filteredUsers.length, (currentPage - 1) * rowsPerPage + 1)}–${Math.min(filteredUsers.length, currentPage * rowsPerPage)} of ${filteredUsers.length}`
                              : '0 users'}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      /* Empty state */
                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                          {loadingAllUsers ? <CircularProgress sx={{ color: T.accent }} /> : <People sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />}
                        </Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                          {loadingAllUsers ? loadPhase || 'Loading records…' : !startDate || !endDate ? 'Select a month first' : 'No data loaded'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                          {!startDate || !endDate
                            ? 'Pick a year and month from the left panel, then click Load All Users.'
                            : 'Click Load All Users in the left panel to fetch records.'}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        </Box>

        {/* Scroll to top FAB */}
        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{ position: 'fixed', bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

        {/* ── Unified overlays ── */}
        <LoadingOverlay
          open={loading || loadingAllUsers}
          message={
            loadingAllUsers
              ? progressTotal > 0
                ? `Loading all users — ${progressDone} / ${progressTotal}`
                : `Loading all users — ${loadPhase || 'Please wait…'}`
              : personName
                ? `Loading attendance — ${personName}…`
                : 'Loading attendance…'
          }
        />
        <SuccessfulOverlay
          open={successOverlayOpen}
          onClose={() => setSuccessOverlayOpen(false)}
          message="Attendance records loaded"
        />
      </Box>
    </Fade>
  );
};

export default ViewAttendanceRecord;