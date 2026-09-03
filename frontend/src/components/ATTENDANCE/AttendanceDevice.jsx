import API_BASE_URL from '../../apiConfig';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import {
  Box,
  Typography,
  Alert,
  Collapse,
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
  Checkbox,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  Tabs,
  Tab,
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
  Male as MaleIcon,
  Female as FemaleIcon,
  Lock,
  Sync,
  Restore,
  TableChart as TableChartIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
} from 'recharts';
import { DeptBadge, EmpCatBadge } from '../LEAVE/EARNINGS/RecordsList';
import { Grid } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import { navigateAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import { COMPUTATION_TYPE_TO_MODULE_ID } from '../../utils/attendanceHubFlow';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import {
  AttendanceFilterDateControls,
  MONTHS_SHORT,
  AttendanceEmployeeSearchSection,
  ATTENDANCE_COMPACT_PAGE_SX,
  attendanceMainPanelHeightSx,
  useAttendanceCompactPage,
} from './attendanceFilterLayout';
import AttendanceEmployeeSearchField from './AttendanceEmployeeSearchField';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';


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

const CHART_COLORS = ['#6d2323', '#2563eb', '#059669', '#c2410c', '#7c3aed', '#92400e', '#0369a1', '#8B4545'];

const getRecordDayLabel = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return 'Unknown';
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

const COMPLETENESS_COLORS = {
  Complete: '#059669',
  'Missing Time In': '#ef4444',
  'Missing Time Out': '#f59e0b',
  'No Punches': '#94a3b8',
};

const ChartCard = ({ title, subtitle, children }) => (
  <Box sx={{
    flex: '1 1 340px', minWidth: 280, p: 2, borderRadius: '10px',
    bgcolor: '#fff', border: `1px solid ${T.accentBorder}`,
    display: 'flex', flexDirection: 'column', gap: 0.75,
  }}>
    <Box>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: T.accent }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ fontSize: '0.68rem', color: T.faint, mt: 0.2 }}>{subtitle}</Typography>
      )}
    </Box>
    <Box sx={{ width: '100%', height: 260 }}>{children}</Box>
  </Box>
);

const chartTooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: `1px solid ${T.accentBorder}`,
    fontSize: '0.75rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
};

const DeviceInsightsCharts = ({ viewMode, data, emptyHint }) => {
  if (!data?.hasData) {
    return (
      <Box sx={{ flexGrow: 1, py: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <InsightsIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.25) }} />
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>No data to visualize</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: T.faint, maxWidth: 360 }}>{emptyHint}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, ...scrollbarSx }}>
      <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>{data.subtitle}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignContent: 'flex-start' }}>
        {viewMode === 'single' ? (
          <>
            <ChartCard title="Punch Completeness" subtitle="Pie · time in / time out status">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byCompleteness} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {data.byCompleteness.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <RechartTooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Special Types" subtitle="Pie · regular vs special attendance">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.bySpecialType} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {data.bySpecialType.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <RechartTooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Admin Modified vs Device" subtitle="Bar · locked rows">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byModified} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <RechartTooltip {...chartTooltipStyle} />
                  <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                    {data.byModified.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            {data.byDay?.length > 0 && (
              <ChartCard title="By Day of Week" subtitle="Bar · punch days">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <RechartTooltip {...chartTooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || _} />
                    <Bar dataKey="value" name="Days" fill={T.accentMid} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </>
        ) : (
          <>
            <ChartCard title="Record Status" subtitle="Pie · has device records vs none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byRecordStatus} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {data.byRecordStatus.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <RechartTooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Records per User" subtitle="Bar · volume buckets">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byVolume} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <RechartTooltip {...chartTooltipStyle} />
                  <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                    {data.byVolume.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            {data.byDepartment?.length > 0 && (
              <ChartCard title="By Department" subtitle="Bar · top departments">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byDepartment} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                    <RechartTooltip {...chartTooltipStyle} />
                    <Bar dataKey="value" name="Users" fill={T.accent} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

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

// ─── Missing time IN/OUT badge ───────────────────────────────────────────
const NO_TIME_IN_LABEL = 'No TimeIN';
const NO_TIME_OUT_LABEL = 'No TimeOUT';

const MissingTimeBadge = ({ label }) => (
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
    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#f44336', lineHeight: 1.2 }}>
      {label}
    </Typography>
  </Box>
);

// ─── Time cell renderer ────────────────────────────────────────────────────
const TimeCell = ({ time, isUncategorized, missingLabel }) => {
  const formatted = formatTime(time);
  if (formatted)
    return (
      <Typography sx={{ fontSize: '0.78rem', color: '#1a1a1a' }}>
        {formatted}
      </Typography>
    );
  if (isUncategorized) return <MissingTimeBadge label={missingLabel} />;
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

const formatModifiedAt = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isManuallyLocked = (record) => Number(record?.manually_modified) === 1;

const makeRecordKey = (personID, date) => `${personID}::${date}`;

const parseRecordKey = (key) => {
  const sep = String(key).indexOf('::');
  if (sep === -1) return { personID: key, date: '' };
  return { personID: key.slice(0, sep), date: key.slice(sep + 2) };
};

/** Grid columns: checkbox + data columns */
const RECORDS_GRID_COLS =
  '32px 0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr';

const formatModifierLabel = (modifiedBy, modifiedByName) => {
  const num = String(modifiedBy || '').trim();
  const name = String(modifiedByName || '').trim();
  if (name && num) return `By ${name} (#${num})`;
  if (name) return `By ${name}`;
  if (num) return `By #${num}`;
  return null;
};

const LockStatusChip = ({ modifiedBy, modifiedByName, modifiedAt }) => {
  const [open, setOpen] = useState(false);
  const modifierLabel = formatModifierLabel(modifiedBy, modifiedByName);

  return (
    <Box sx={{ mt: 0.35, width: 'fit-content', maxWidth: '100%' }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.35,
          px: 0.65,
          py: 0.2,
          borderRadius: open ? '6px 6px 0 0' : '6px',
          bgcolor: 'rgba(33,150,243,0.10)',
          border: '1px solid rgba(33,150,243,0.22)',
          cursor: 'pointer',
          width: 'fit-content',
          userSelect: 'none',
          '&:hover': { bgcolor: 'rgba(33,150,243,0.14)' },
        }}
      >
        <Lock sx={{ fontSize: 10, color: '#1976d2' }} />
        <Typography
          sx={{
            fontSize: '0.58rem',
            fontWeight: 700,
            color: '#1976d2',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Locked
        </Typography>
        {open ? (
          <ExpandLess sx={{ fontSize: 13, color: '#1976d2' }} />
        ) : (
          <ExpandMore sx={{ fontSize: 13, color: '#1976d2' }} />
        )}
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box
          sx={{
            px: 0.75,
            py: 0.55,
            borderRadius: '0 0 6px 6px',
            border: '1px solid rgba(33,150,243,0.22)',
            borderTop: 'none',
            bgcolor: 'rgba(33,150,243,0.06)',
            maxWidth: 200,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.58rem',
              fontWeight: 700,
              color: '#1565c0',
              lineHeight: 1.35,
              mb: 0.35,
            }}
          >
            Admin modified · Sync paused
          </Typography>
          {modifierLabel && (
            <Typography sx={{ fontSize: '0.55rem', color: '#1976d2', lineHeight: 1.35 }}>
              {modifierLabel}
            </Typography>
          )}
          {modifiedAt && (
            <Typography sx={{ fontSize: '0.55rem', color: '#1565c0', lineHeight: 1.35 }}>
              {formatModifiedAt(modifiedAt)}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

const RestoredStatusChip = () => {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mt: 0.35, width: 'fit-content', maxWidth: '100%' }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.35,
          px: 0.65,
          py: 0.2,
          borderRadius: open ? '6px 6px 0 0' : '6px',
          bgcolor: 'rgba(76,175,80,0.10)',
          border: '1px solid rgba(76,175,80,0.22)',
          cursor: 'pointer',
          width: 'fit-content',
          userSelect: 'none',
          '&:hover': { bgcolor: 'rgba(76,175,80,0.14)' },
        }}
      >
        <Restore sx={{ fontSize: 10, color: '#2e7d32' }} />
        <Typography
          sx={{
            fontSize: '0.58rem',
            fontWeight: 700,
            color: '#2e7d32',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Restored
        </Typography>
        {open ? (
          <ExpandLess sx={{ fontSize: 13, color: '#2e7d32' }} />
        ) : (
          <ExpandMore sx={{ fontSize: 13, color: '#2e7d32' }} />
        )}
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box
          sx={{
            px: 0.75,
            py: 0.55,
            borderRadius: '0 0 6px 6px',
            border: '1px solid rgba(76,175,80,0.22)',
            borderTop: 'none',
            bgcolor: 'rgba(76,175,80,0.06)',
            maxWidth: 160,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.58rem',
              fontWeight: 700,
              color: '#2e7d32',
              lineHeight: 1.35,
            }}
          >
            Returned data from the device
          </Typography>
          <Typography sx={{ fontSize: '0.55rem', color: '#388e3c', lineHeight: 1.35, mt: 0.25 }}>
            Device data restored. Admin remarks cleared.
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

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

const buildDisplayName = (e) => {
  const last = (e?.lastName || '').trim();
  const first = (e?.firstName || '').trim();
  const mid = (e?.middleName || '').trim();
  if (!last && !first) {
    const raw = String(e?.fullName || '').trim();
    if (raw.includes(',')) return raw;
    const fromFull = formatFullName(raw);
    if (fromFull) return fromFull;
    return e?.employeeNumber ? `#${e.employeeNumber}` : '';
  }
  return last
    ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(' ')}`
    : [first, mid].filter(Boolean).join(' ');
};

const getEmployeeInitials = (e) =>
  `${e?.lastName?.[0] || ''}${e?.firstName?.[0] || ''}`.toUpperCase() || '?';

const GenderBadge = ({ gender }) => {
  if (!gender) return null;
  const isMale = String(gender).trim().toLowerCase() === 'male';
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon style={{ fontSize: 11, color: '#1565C0' }} />
        ) : (
          <FemaleIcon style={{ fontSize: 11, color: '#c2185b' }} />
        )
      }
      label={gender}
      sx={{
        height: 18,
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: 0.3,
        bgcolor: isMale ? 'rgba(21,101,192,0.08)' : 'rgba(194,24,91,0.08)',
        color: isMale ? '#1565C0' : '#c2185b',
        border: `1px solid ${isMale ? 'rgba(21,101,192,0.25)' : 'rgba(194,24,91,0.25)'}`,
        borderRadius: '4px',
      }}
    />
  );
};

const EmployeeProfileRow = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
  avatarSize = 30,
}) => {
  if (!employee) return null;
  const num = String(employee.employeeNumber ?? '').trim();
  const initials = getEmployeeInitials(employee);
  const name = buildDisplayName(employee);
  const dc = deptMap[num];
  const ec = empCatMap[num];
  const gender = sexMap[num] || employee.sex || employee.gender;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Avatar
        sx={{
          width: avatarSize,
          height: avatarSize,
          bgcolor: T.accent,
          fontSize: avatarSize <= 30 ? '0.65rem' : '0.8rem',
          fontWeight: 800,
          borderRadius: avatarSize <= 30 ? '4px' : '8px',
          flexShrink: 0,
        }}
      >
        {initials}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: avatarSize <= 30 ? '0.78rem' : '0.84rem',
            color: T.text,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.45,
            flexWrap: 'wrap',
            mt: 0.25,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: T.faint, fontSize: '0.65rem', whiteSpace: 'nowrap' }}
          >
            #{num}
          </Typography>
          {gender && <GenderBadge gender={gender} />}
          {dc && <DeptBadge code={dc} />}
          {ec && (
            <EmpCatBadge label={ec.label} colorHex={ec.colorHex} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const EmployeeProfileCard = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
  loading = false,
}) => {
  if (!employee) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: `1px solid ${T.accentBorder}`,
        bgcolor: '#fafafa',
      }}
    >
      <EmployeeProfileRow
        employee={employee}
        deptMap={deptMap}
        empCatMap={empCatMap}
        sexMap={sexMap}
        avatarSize={44}
      />
      {loading && (
        <CircularProgress size={14} sx={{ color: T.accent, flexShrink: 0 }} />
      )}
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const ViewAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const renderSubmitToAttendanceNav = () => (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.5,
        rowGap: 0.5,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          color: T.muted,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          mr: 0.25,
        }}
      >
        Submit to DTR
      </Typography>
      {[
        { icon: People, label: 'Non-teaching', type: 'NONTEACHING' },
        { icon: AccessTime, label: 'Faculty 30 hrs', type: 'FACULTY_30' },
        { icon: Assignment, label: 'Faculty designated', type: 'FACULTY_DESIGNATED' },
      ].map(({ icon: Icon, label, type }) => (
        <Button
          key={type}
          variant="contained"
          size="small"
          startIcon={<Icon sx={{ fontSize: 14 }} />}
          onClick={() => goToComputationModule(type)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.68rem',
            py: 0.35,
            px: 1.1,
            minHeight: 28,
            bgcolor: T.accent,
            color: '#FEF9E1',
            boxShadow: `0 2px 8px ${alpha(T.accent, 0.32)}`,
            '&:hover': {
              bgcolor: T.accentDark,
              boxShadow: `0 3px 10px ${alpha(T.accent, 0.42)}`,
            },
          }}
        >
          {label}
        </Button>
      ))}
    </Box>
  );

  const [personID, setPersonID] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState([]);
  const [personName, setPersonName] = useState('');
  const [empCatMap, setEmpCatMap] = useState({});
  const [sexMap, setSexMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

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
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const trimmedSearch = debouncedSearch.trim();

  const [loadPhase, setLoadPhase] = useState('');

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsRowsPerPage, setRecordsRowsPerPage] = useState(50);
  const [restoringKey, setRestoringKey] = useState(null);
  const [recentlyRestoredKeys, setRecentlyRestoredKeys] = useState(() => new Set());
  const [selectedLockedRows, setSelectedLockedRows] = useState(() => new Set());
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [registeredEmployeeSet, setRegisteredEmployeeSet] = useState(() => new Set());
  // Top-level page tabs: "device" (Device Record — filter + table/insights) vs "facial" (Facial Live list only)
  const [topTab, setTopTab] = useState('device');
  // Sub-tab within the Device Record tab
  const [deviceViewTab, setDeviceViewTab] = useState('table');
  const [deviceAttendanceRows, setDeviceAttendanceRows] = useState([]);
  const [loadingDeviceAttendance, setLoadingDeviceAttendance] = useState(false);
  const [deviceAttendanceSearch, setDeviceAttendanceSearch] = useState('');
  const [deviceAttendancePage, setDeviceAttendancePage] = useState(1);
  const [deviceAttendanceRowsPerPage, setDeviceAttendanceRowsPerPage] = useState(25);

  const fetchRecordsRef = useRef(null);
  const fetchAllUsersDTRRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const requestedTab = location.state?.activeTab || params.get('tab');
    if (requestedTab === 'device-list') {
      setTopTab('facial');
    } else if (['table', 'insights'].includes(requestedTab)) {
      setTopTab('device');
      setDeviceViewTab(requestedTab);
    }
    if (['single', 'multiple'].includes(location.state?.viewMode)) {
      setViewMode(location.state.viewMode);
    }
  }, [location.key, location.search, location.state]);

  // Returning to Device via workflow Back — clear filters; admin must search again.
  useLayoutEffect(() => {
    if (location.state?.workflowNavDirection !== 'back') return;
    setPersonID('');
    setSelectedEmployee(null);
    setPersonName('');
    setStartDate('');
    setEndDate('');
    setRecords([]);
    setHasSearchedSingle(false);
    setSelectedMonth(null);
    setError('');
  }, [location.key, location.state?.workflowNavDirection]);

  const {
    prevStep,
    nextStep,
    goPrevious,
    goNext,
  } = useAttendanceWorkflow('device', {
    employeeNumber: personID,
    fullName: personName,
    startDate,
    endDate,
  });

  useAttendanceCompactPage();

  const { hasAccess, loading: accessLoading } =
    usePageAccess('view-attendance');

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthsShort = MONTHS_SHORT;

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

  const buildDeviceAuditPayload = (button, overrides = {}) => {
    const monthLabel =
      selectedMonth != null
        ? `${monthsShort[selectedMonth]} ${selectedYear}`
        : startDate && endDate
          ? `${startDate} – ${endDate}`
          : null;
    return {
      auditButton: button,
      targetEmployeeName: personName || null,
      monthLabel,
      searchQuery: overrides.searchQuery ?? null,
      ...overrides,
    };
  };

  useEffect(() => {
    if (!accessLoading) setPageLoading(false);
  }, [accessLoading]);

  useEffect(() => {
    if (accessLoading || hasAccess === false) return;
    let cancelled = false;
    (async () => {
      try {
        const [assignRes, empCatRes, personsRes, usersRes] = await Promise.allSettled([
          axios.get(
            `${API_BASE_URL}/api/department-assignment`,
            getAuthHeaders(),
          ),
          axios.get(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
            getAuthHeaders(),
          ),
          axios.get(
            `${API_BASE_URL}/personalinfo/person_table`,
            getAuthHeaders(),
          ),
          axios.get(
            `${API_BASE_URL}/users`,
            getAuthHeaders(),
          ),
        ]);
        if (cancelled) return;
        if (assignRes.status === 'fulfilled') {
          const map = {};
          (Array.isArray(assignRes.value.data) ? assignRes.value.data : []).forEach(
            (a) => {
              if (!a?.employeeNumber) return;
              map[String(a.employeeNumber)] = a.code || '';
            },
          );
          setDepartmentAssignmentsMap(map);
        }
        if (empCatRes.status === 'fulfilled') {
          const map = {};
          (Array.isArray(empCatRes.value.data) ? empCatRes.value.data : []).forEach(
            (item) => {
              if (!item.employeeNumber) return;
              const label =
                item.parentGroup && item.typeName
                  ? `${item.parentGroup} | ${item.typeName}`
                  : item.categoryLabel || '';
              if (label) {
                map[String(item.employeeNumber)] = {
                  label,
                  colorHex: item.colorHex || '#757575',
                };
              }
            },
          );
          setEmpCatMap(map);
        }
        if (personsRes.status === 'fulfilled') {
          const list = Array.isArray(personsRes.value.data)
            ? personsRes.value.data
            : personsRes.value.data?.data || [];
          const gMap = {};
          list.forEach((p) => {
            const num =
              p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString();
            if (num && p.sex) gMap[num] = p.sex;
          });
          setSexMap(gMap);
        }
        if (usersRes.status === 'fulfilled') {
          const list = Array.isArray(usersRes.value.data)
            ? usersRes.value.data
            : usersRes.value.data?.data || [];
          const next = new Set();
          list.forEach((u) => {
            const num = String(u?.employeeNumber ?? '').trim();
            if (num) next.add(num);
          });
          setRegisteredEmployeeSet(next);
        }
      } catch (err) {
        console.error('Error loading employee reference data:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, hasAccess]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (registeredEmployeeSet.size === 0) return;
    setRecords((prev) =>
      prev.filter((r) =>
        registeredEmployeeSet.has(String(r?.PersonID ?? r?.personID ?? '').trim()),
      ),
    );
    setAllUsersDTR((prev) =>
      prev.filter((u) =>
        registeredEmployeeSet.has(String(u?.employeeNumber ?? '').trim()),
      ),
    );
  }, [registeredEmployeeSet]);

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
      return map;
    } catch (err) {
      console.error('Error fetching departments/assignments:', err);
      setDepartments([]);
      setDepartmentAssignmentsMap({});
      showSnackbar('Failed to load departments for filtering', 'warning');
      return {};
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

  const filteredDeviceAttendanceRows = useMemo(() => {
    const q = deviceAttendanceSearch.trim().toLowerCase();
    if (!q) return deviceAttendanceRows;
    return deviceAttendanceRows.filter((row) =>
      [
        row.employeeNumber,
        row.fullName,
        row.department,
        row.date,
        row.day,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [deviceAttendanceRows, deviceAttendanceSearch]);

  const deviceAttendanceTotalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(filteredDeviceAttendanceRows.length / deviceAttendanceRowsPerPage),
      ),
    [filteredDeviceAttendanceRows.length, deviceAttendanceRowsPerPage],
  );

  const paginatedDeviceAttendanceRows = useMemo(() => {
    const start = (deviceAttendancePage - 1) * deviceAttendanceRowsPerPage;
    return filteredDeviceAttendanceRows.slice(
      start,
      start + deviceAttendanceRowsPerPage,
    );
  }, [
    filteredDeviceAttendanceRows,
    deviceAttendancePage,
    deviceAttendanceRowsPerPage,
  ]);

  const goToDeviceAttendancePage = (page) =>
    setDeviceAttendancePage(
      Math.min(Math.max(1, page), deviceAttendanceTotalPages),
    );

  useEffect(() => {
    if (deviceAttendancePage > deviceAttendanceTotalPages) {
      setDeviceAttendancePage(deviceAttendanceTotalPages);
    }
  }, [deviceAttendancePage, deviceAttendanceTotalPages]);

  const fetchRecords = async (showLoading = true, auditPayload = null) => {
    if (!personID || !startDate || !endDate) return;
    const pid = String(personID).trim();
    if (registeredEmployeeSet.size > 0 && !registeredEmployeeSet.has(pid)) {
      setRecords([]);
      setError('This employee is not in the Users list. Device records are only shown for registered HRIS users.');
      showSnackbar('Employee not found in Users list — records excluded.', 'warning');
      return;
    }
    if (showLoading) {
      setLoading(true);
      setLoadPhase('Loading attendance records…');
      setSuccessOverlayOpen(false);
    }
    setError('');
    try {
      const body = {
        personID,
        startDate,
        endDate,
        syncDeviceToRecords: true,
      };
      if (auditPayload?.auditButton) {
        Object.assign(body, auditPayload);
      }
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/all-attendance`,
        body,
        getAuthHeaders(),
      );
      const payload = res.data;
      const recs = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.records)
          ? payload.records
          : [];
      const sync = payload?.sync;
      // Keep only punches that belong to a Users-list employee
      const matchedRecs =
        registeredEmployeeSet.size > 0
          ? recs.filter((r) =>
              registeredEmployeeSet.has(String(r?.PersonID ?? r?.personID ?? pid).trim()),
            )
          : recs;
      setRecords(matchedRecs);
      if (matchedRecs.length > 0) {
        const apiName = matchedRecs[0].PersonName || '';
        setPersonName(apiName);
        setSelectedEmployee((prev) => {
          if (prev) return { ...prev, fullName: apiName || prev.fullName };
          if (personID) return { employeeNumber: personID, fullName: apiName };
          return prev;
        });
        const saved = sync?.saved ?? 0;
        const updated = sync?.updated ?? 0;
        const failed = sync?.failed ?? 0;
        if (sync?.enabled && (saved > 0 || updated > 0)) {
          showSnackbar(
            `Loaded ${matchedRecs.length} records — saved ${saved}, updated ${updated} in database`,
            'success',
          );
        } else if (sync?.enabled && failed > 0) {
          const errHint = sync?.errors?.[0]?.error || 'database write failed';
          showSnackbar(
            `Loaded ${matchedRecs.length} device records but failed to save (${failed}): ${errHint}`,
            'error',
          );
        } else {
          showSnackbar(`Loaded ${matchedRecs.length} records`, 'success');
        }
      } else {
        setPersonName('');
        showSnackbar('No records found for this period', 'info');
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError('Failed to fetch attendance records. Please try again.');
      showSnackbar('Failed to fetch attendance records', 'error');
    } finally {
      if (showLoading) {
        setLoading(false);
        setLoadPhase('');
      }
    }
  };

  const handleForceSync = async (syncPersonID, syncDate) => {
    const key = makeRecordKey(syncPersonID, syncDate);
    setRestoringKey(key);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/force-sync-from-device`,
        { personID: syncPersonID, date: syncDate },
        getAuthHeaders(),
      );
      await fetchRecords(false);
      setSelectedLockedRows((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      if (res.data?.restoredFromManual) {
        setRecentlyRestoredKeys((prev) => new Set([...prev, key]));
        setTimeout(() => {
          setRecentlyRestoredKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, 12000);
      }
      showSnackbar(
        res.data?.message || 'Row restored from device data',
        'success',
      );
    } catch (err) {
      console.error('Force sync from device failed:', err);
      showSnackbar(
        err.response?.data?.error || 'Failed to restore from device',
        'error',
      );
    } finally {
      setRestoringKey(null);
    }
  };

  const markRecentlyRestored = (keys) => {
    if (!keys?.length) return;
    setRecentlyRestoredKeys((prev) => new Set([...prev, ...keys]));
    setTimeout(() => {
      setRecentlyRestoredKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    }, 12000);
  };

  const handleBulkForceSync = async () => {
    if (selectedLockedRows.size === 0) return;
    setBulkRestoring(true);
    try {
      const rows = [...selectedLockedRows].map((key) => parseRecordKey(key));
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/bulk-force-sync-from-device`,
        { rows },
        getAuthHeaders(),
      );
      const { restored = 0, failed = 0, restoredRows = [], message } = res.data || {};
      await fetchRecords(false);
      setSelectedLockedRows(new Set());
      const restoredKeys = restoredRows.map((r) =>
        makeRecordKey(r.personID, r.date),
      );
      markRecentlyRestored(
        restoredKeys.filter((_, i) => restoredRows[i]?.restoredFromManual),
      );
      if (failed > 0 && restored === 0) {
        const errHint = res.data?.errors?.[0]?.error || 'Some rows could not be restored';
        showSnackbar(errHint, 'error');
      } else {
        showSnackbar(
          message || `Restored ${restored} row(s)${failed ? `, ${failed} failed` : ''}`,
          failed > 0 ? 'warning' : 'success',
        );
      }
    } catch (err) {
      console.error('Bulk force sync failed:', err);
      showSnackbar(
        err.response?.data?.error || 'Bulk restore failed',
        'error',
      );
    } finally {
      setBulkRestoring(false);
    }
  };

  const toggleLockedRowSelection = (key, checked) => {
    setSelectedLockedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSelectAllLockedInPeriod = () => {
    setSelectedLockedRows(
      new Set(
        records
          .filter((r) => isManuallyLocked(r))
          .map((r) => makeRecordKey(r.PersonID, r.Date)),
      ),
    );
  };

  const handleClearLockedSelection = () => setSelectedLockedRows(new Set());

  const fetchAllUsersDTR = async (opts = {}) => {
    const { syncDevice = true } = opts;
    if (!startDate || !endDate) {
      showSnackbar('Please select a month first', 'warning');
      return;
    }
    setLoadingAllUsers(true);
    if (syncDevice) {
      setLoadPhase('Syncing device records to database…');
    } else {
      setLoadPhase('Refreshing employee list…');
    }
    try {
      if (syncDevice) {
        const bulkRes = await axios.post(
          `${API_BASE_URL}/attendance/api/bulk-auto-save`,
          { startDate, endDate },
          getAuthHeaders(),
        );
        const bulkMsg = bulkRes.data?.message;
        if (bulkMsg) showSnackbar(bulkMsg, 'success');
      }
      setLoadPhase('Loading employee list…');
      const [usersRes, summaryRes] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/attendance/api/all-device-users`,
          getAuthHeaders(),
        ),
        axios.post(
          `${API_BASE_URL}/attendance/api/device-attendance-summary`,
          { startDate, endDate },
          getAuthHeaders(),
        ),
      ]);

      let users = usersRes.data || [];
      if (registeredEmployeeSet.size > 0) {
        users = users.filter((u) =>
          registeredEmployeeSet.has(String(u?.PersonID ?? '').trim()),
        );
      }
      const summaryRows = Array.isArray(summaryRes.data)
        ? summaryRes.data
        : [];

      let dm = departmentAssignmentsMap || {};
      if (
        departmentCodeFilter &&
        Object.keys(dm).length === 0 &&
        !loadingDepartments
      ) {
        dm = await fetchDepartmentsAndAssignments();
      }
      if (departmentCodeFilter) {
        users = users.filter((u) => {
          const dc = dm[String(u?.PersonID ?? '')] || '';
          if (departmentCodeFilter === '__UNASSIGNED__') return !dc;
          return dc === departmentCodeFilter;
        });
      }

      const countByPerson = new Map();
      for (const row of summaryRows) {
        const pid = row?.PersonID;
        if (pid == null || pid === '') continue;
        const pidStr = String(pid).trim();
        if (registeredEmployeeSet.size > 0 && !registeredEmployeeSet.has(pidStr)) continue;
        countByPerson.set(pidStr, Number(row.recordsCount) || 0);
      }

      const all = users.map((user) => {
        const empNo = user?.PersonID;
        const dn = user?.PersonName || empNo || 'Unknown';
        const n = countByPerson.get(String(empNo)) ?? 0;
        return {
          employeeNumber: empNo,
          firstName: dn.split(' ')[0],
          lastName: dn.split(' ').slice(1).join(' '),
          fullName: dn,
          recordsCount: n,
          hasRecords: n > 0,
        };
      });

      all.sort((a, b) =>
        (a.lastName || '')
          .toUpperCase()
          .localeCompare((b.lastName || '').toUpperCase()),
      );
      setAllUsersDTR(all);
      const withRecs = all.filter((u) => u.hasRecords).length;
      showSnackbar(
        `Loaded ${all.length} registered users (${withRecs} with device records in this period)`,
        'success',
      );
    } catch (err) {
      console.error('Error fetching all users DTR:', err);
      showSnackbar(
        'Error fetching users: ' + (err.response?.data?.error || err.message),
        'error',
      );
    } finally {
      setLoadingAllUsers(false);
      setLoadPhase('');
    }
  };

  const fetchDeviceAttendanceList = async () => {
    setLoadingDeviceAttendance(true);
    setLoadPhase(
      startDate && endDate
        ? 'Loading device attendance list...'
        : 'Loading latest device attendance list...',
    );
    try {
      const res = await axios.post(
        `${API_BASE_URL}/attendance/api/device-attendance-list`,
        {
          startDate: startDate || null,
          endDate: endDate || null,
          limit: 1000,
        },
        getAuthHeaders(),
      );
      const rows = Array.isArray(res.data?.records) ? res.data.records : [];
      setDeviceAttendanceRows(rows);
      setDeviceAttendancePage(1);
    } catch (err) {
      console.error('Error fetching device attendance list:', err);
      showSnackbar(
        err.response?.data?.error || 'Failed to load device attendance list',
        'error',
      );
    } finally {
      setLoadingDeviceAttendance(false);
      setLoadPhase('');
    }
  };

  useEffect(() => {
    if (topTab !== 'facial' || accessLoading || hasAccess === false) {
      return;
    }
    fetchDeviceAttendanceList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab, startDate, endDate, accessLoading, hasAccess]);

  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
    fetchAllUsersDTRRef.current = fetchAllUsersDTR;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;
    const handleAttendanceChanged = (payload) => {
      // Never re-run bulk-auto-save from sockets — soft-refresh summary only
      if (payload?.light) return;
      const action = payload?.action;
      if (
        action === 'leaves-fetched' ||
        action === 'holidays-fetched' ||
        action === 'suspensions-fetched' ||
        action === 'dtr-printed' ||
        action === 'overall-daily-late-updated' ||
        action === 'overall-daily-late-created'
      ) {
        return;
      }
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
      debounceTimer = setTimeout(
        () => fetchAllUsersDTRRef.current?.({ syncDevice: false }),
        1200,
      );
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
        {
          personID,
          startDate,
          endDate,
          ...buildDeviceAuditPayload('View in DTR Module'),
        },
        getAuthHeaders(),
      );
      if (res.data.success) {
        showSnackbar(res.data.message, 'success');
        navigateAttendanceWorkflow(navigate, 'dtr', {
          employeeNumber: personID,
          fullName: personName,
          startDate,
          endDate,
        });
      }
    } catch (err) {
      showSnackbar(
        err.response?.data?.message || 'Failed to view to DTR',
        'error',
      );
    }
  };

  const handleGoToState = () => {
    if (!personID || !startDate || !endDate) {
      showSnackbar('Please fill in all fields first', 'warning');
      return;
    }
    navigateAttendanceWorkflow(navigate, 'state', {
      employeeNumber: personID,
      fullName: personName,
      startDate,
      endDate,
    });
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
        {
          userIDs: sel.map((u) => u.employeeNumber),
          startDate,
          endDate,
          ...buildDeviceAuditPayload(`View DTR (${sel.length} selected)`),
        },
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

  // Computation-type mismatch guard dialog
  const [computationChangeDialog, setComputationChangeDialog] = useState({ open: false, existingType: null, newType: null, path: null });

const COMPUTATION_TYPE_LABELS = {
  NONTEACHING: 'Non-Teaching',
  FACULTY_30: 'Faculty 30 hrs',
  FACULTY_DESIGNATED: 'Faculty designated',
};

const COMPUTATION_BUTTON_LABELS = {
  NONTEACHING: 'Non-teaching',
  FACULTY_30: 'Faculty 30 hrs',
  FACULTY_DESIGNATED: 'Faculty designated',
};

const goToComputationModule = async (selectedComputationType) => {
  if (!personID || !startDate || !endDate) {
    showSnackbar('Please fill in all fields first', 'warning');
    return;
  }

  const auditButtonLabel =
    COMPUTATION_BUTTON_LABELS[selectedComputationType] ||
    selectedComputationType;

  try {
    const res = await axios.get(`${API_BASE_URL}/api/attendance-computation-view-state`, {
      params: { employeeNumber: personID, periodStart: startDate, periodEnd: endDate },
      ...getAuthHeaders(),
    });
    const existingType = res.data?.selectedComputationType ?? res.data?.row?.selected_computation_type ?? null;
    if (existingType && existingType !== selectedComputationType) {
      setComputationChangeDialog({
        open: true,
        existingType: COMPUTATION_TYPE_LABELS[existingType] || existingType,
        newType: COMPUTATION_TYPE_LABELS[selectedComputationType] || selectedComputationType,
        rawNewType: selectedComputationType,
        auditButtonLabel,
        employeeName: personName || 'this employee',
      });
      return;
    }
    await proceedToComputationModule(selectedComputationType, auditButtonLabel);
  } catch (err) {
    console.error('Error checking computation view state:', err);
    showSnackbar('Failed to check saved computation type', 'error');
  }
};

  const proceedToComputationModule = async (
    selectedComputationType,
    auditButtonLabel,
  ) => {
    try {
      await axios.post(`${API_BASE_URL}/api/attendance-computation-view-state`, {
        employeeNumber: personID,
        periodStart: startDate,
        periodEnd: endDate,
        selectedComputationType,
        ...buildDeviceAuditPayload(auditButtonLabel),
      }, getAuthHeaders());
      const targetModuleId =
        COMPUTATION_TYPE_TO_MODULE_ID[selectedComputationType] || 'non_teaching';
      navigateAttendanceWorkflow(
        navigate,
        'dtr',
        {
          employeeNumber: personID,
          fullName: personName,
          startDate,
          endDate,
        },
        {
          openComputationModule: targetModuleId,
          fromDevice: true,
        },
      );
    } catch (err) {
      console.error('Error saving computation selection:', err);
      showSnackbar('Failed to save computation selection', 'error');
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
    fetchRecords(
      true,
      buildDeviceAuditPayload('Fetch Records', {
        searchQuery: employeeSearchQuery.trim() || personID,
      }),
    );
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

  const missingTimeInCount = useMemo(
    () =>
      records.filter((r) => {
        const hasAnyTime = r.Time1 || r.Time2 || r.Time3 || r.Time4;
        return hasAnyTime && !r.Time1;
      }).length,
    [records],
  );

  const missingTimeOutCount = useMemo(
    () =>
      records.filter((r) => {
        const hasAnyTime = r.Time1 || r.Time2 || r.Time3 || r.Time4;
        return hasAnyTime && !r.Time4;
      }).length,
    [records],
  );

  const lockedRowCount = useMemo(
    () => records.filter((r) => isManuallyLocked(r)).length,
    [records],
  );

  const deviceInsightsData = useMemo(() => {
    if (viewMode === 'single') {
      if (!records.length) return { hasData: false };

      const completenessMap = {
        Complete: 0,
        'Missing Time In': 0,
        'Missing Time Out': 0,
        'No Punches': 0,
      };
      const specialMap = {};
      const dayMap = {};
      const modMap = { 'Admin Modified': 0, 'Device Only': 0 };

      records.forEach((r) => {
        const hasIn = !!r.Time1;
        const hasOut = !!r.Time4;
        const hasAny = !!(r.Time1 || r.Time2 || r.Time3 || r.Time4);
        if (!hasAny) completenessMap['No Punches'] += 1;
        else if (hasIn && hasOut) completenessMap.Complete += 1;
        else if (!hasIn) completenessMap['Missing Time In'] += 1;
        else if (!hasOut) completenessMap['Missing Time Out'] += 1;

        const st = (r.specialType && String(r.specialType).trim()) || 'Regular';
        specialMap[st] = (specialMap[st] || 0) + 1;

        const day = getRecordDayLabel(r.Date);
        dayMap[day] = (dayMap[day] || 0) + 1;

        if (isManuallyLocked(r)) modMap['Admin Modified'] += 1;
        else modMap['Device Only'] += 1;
      });

      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return {
        hasData: true,
        subtitle: `Based on ${records.length} device record${records.length === 1 ? '' : 's'} for registered users only`,
        byCompleteness: Object.entries(completenessMap)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value, fill: COMPLETENESS_COLORS[name] || T.accent })),
        bySpecialType: Object.entries(specialMap)
          .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] })),
        byModified: Object.entries(modMap)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({
            name,
            value,
            fill: name === 'Admin Modified' ? '#1976d2' : T.accentMid,
          })),
        byDay: dayOrder
          .filter((d) => dayMap[d])
          .map((name) => ({ name: name.slice(0, 3), fullName: name, value: dayMap[name] })),
      };
    }

    if (!filteredUsers.length) return { hasData: false };

    const statusMap = { 'Has Records': 0, 'No Records': 0 };
    const deptMap = {};
    const volumeMap = { '0': 0, '1–5': 0, '6–15': 0, '16+': 0 };

    filteredUsers.forEach((u) => {
      const n = u.recordsCount || 0;
      if (n > 0) statusMap['Has Records'] += 1;
      else statusMap['No Records'] += 1;

      const dept = departmentAssignmentsMap?.[String(u.employeeNumber)] || 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;

      if (n === 0) volumeMap['0'] += 1;
      else if (n <= 5) volumeMap['1–5'] += 1;
      else if (n <= 15) volumeMap['6–15'] += 1;
      else volumeMap['16+'] += 1;
    });

    return {
      hasData: true,
      subtitle: `Based on ${filteredUsers.length} registered user${filteredUsers.length === 1 ? '' : 's'} from Users list · ${startDate || '—'} to ${endDate || '—'}`,
      byRecordStatus: Object.entries(statusMap)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name,
          value,
          fill: name === 'Has Records' ? '#059669' : '#94a3b8',
        })),
      byDepartment: Object.entries(deptMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      byVolume: Object.entries(volumeMap)
        .filter(([, v]) => v > 0)
        .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    };
  }, [viewMode, records, filteredUsers, departmentAssignmentsMap, startDate, endDate]);

  const recordsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / recordsRowsPerPage)),
    [records.length, recordsRowsPerPage],
  );

  const paginatedRecords = useMemo(() => {
    const s = (recordsPage - 1) * recordsRowsPerPage;
    return records.slice(s, s + recordsRowsPerPage);
  }, [records, recordsPage, recordsRowsPerPage]);

  const lockedRowsOnPage = useMemo(
    () => paginatedRecords.filter((r) => isManuallyLocked(r)),
    [paginatedRecords],
  );

  const selectedLockedOnPageCount = useMemo(() => {
    let c = 0;
    for (const r of lockedRowsOnPage) {
      if (selectedLockedRows.has(makeRecordKey(r.PersonID, r.Date))) c++;
    }
    return c;
  }, [lockedRowsOnPage, selectedLockedRows]);

  const handleSelectAllLockedOnPage = (checked) => {
    setSelectedLockedRows((prev) => {
      const next = new Set(prev);
      for (const record of lockedRowsOnPage) {
        const key = makeRecordKey(record.PersonID, record.Date);
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  useEffect(() => {
    setSelectedLockedRows((prev) => {
      const validKeys = new Set(
        records
          .filter((r) => isManuallyLocked(r))
          .map((r) => makeRecordKey(r.PersonID, r.Date)),
      );
      const next = new Set();
      for (const key of prev) {
        if (validKeys.has(key)) next.add(key);
      }
      return next;
    });
  }, [records]);

  useEffect(() => {
    setRecordsPage(1);
  }, [records.length, personID, startDate, endDate]);

  const goToRecordsPage = (p) =>
    setRecordsPage(
      Math.min(Math.max(1, p), recordsTotalPages),
    );

  const displayEmployee = useMemo(() => {
    if (selectedEmployee?.employeeNumber) return selectedEmployee;
    if (!personID) return null;
    return {
      employeeNumber: personID,
      fullName: personName || '',
      lastName: '',
      firstName: '',
    };
  }, [selectedEmployee, personID, personName]);

  const handleEmployeeSelect = (emp, num) => {
    if (emp && typeof emp === 'object') {
      setSelectedEmployee(emp);
      setPersonID(String(emp.employeeNumber || num || ''));
      setPersonName(buildDisplayName(emp));
    } else {
      setSelectedEmployee(null);
      setPersonID(num || '');
      if (!num) setPersonName('');
    }
    setHasSearchedSingle(false);
    setRecords([]);
  };

  const clearSingleEmployee = () => {
    setPersonID('');
    setSelectedEmployee(null);
    setPersonName('');
    setHasSearchedSingle(false);
    setRecords([]);
  };

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
                setDeviceViewTab('table');
                setRecords([]);
                clearSingleEmployee();
                setAllUsersDTR([]);
                setSelectedUsers(new Set());
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

      {viewMode === 'single' && (
        <Box sx={{ mb: 0.75 }}>
          <AttendanceEmployeeSearchSection selected={Boolean(displayEmployee)}>
            <AttendanceEmployeeSearchField
              searchApi="users"
              value={personID}
              selectedEmployee={selectedEmployee}
              onSearchQueryChange={setEmployeeSearchQuery}
              onSelectEmployee={handleEmployeeSelect}
              onClear={() => handleEmployeeSelect(null, '')}
              deptMap={departmentAssignmentsMap}
              empCatMap={empCatMap}
              sexMap={sexMap}
            />
          </AttendanceEmployeeSearchSection>
          {displayEmployee && (
            <Box sx={{ mb: 0.75 }}>
              <EmployeeProfileCard
                employee={displayEmployee}
                deptMap={departmentAssignmentsMap}
                empCatMap={empCatMap}
                sexMap={sexMap}
                loading={loading}
              />
            </Box>
          )}
        </Box>
      )}

      <AttendanceFilterDateControls
        selectedYear={selectedYear}
        onYearChange={(e) => {
          setSelectedYear(parseInt(e.target.value));
          setSelectedMonth(null);
          setHasSearchedSingle(false);
          setRecords([]);
          if (viewMode === 'single') setPersonName('');
          showSnackbar('Year changed — select a month to load records.', 'info');
        }}
        yearOptions={yearOptions}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
        onMonthClear={() => {
          setSelectedMonth(null);
          setStartDate('');
          setEndDate('');
          setRecords([]);
          if (viewMode === 'single') setPersonName('');
          setAllUsersDTR([]);
          setHasSearchedSingle(false);
        }}
        onQuickDate={handleQuickDateSelect}
        months={monthsShort}
      />

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
                ? 'Aggregating device punches for the selected period…'
                : 'Use filters on the right to narrow the list.'}
            </Typography>
          </Box>
        </>
      )}

      {/* ── Single mode extras ── */}
      {viewMode === 'single' && (
        <Box>
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
            <Typography sx={{ fontSize: '0.68rem', color: T.muted, mt: 0.25, lineHeight: 1.2 }}>
              {loading
                ? 'Fetching attendance data...'
                : hasSearchedSingle
                  ? 'Search complete.'
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

        <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
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
                <AttendanceWorkflowNav
                  inline
                  prevStep={prevStep}
                  nextStep={nextStep}
                  onPrevious={goPrevious}
                  onNext={goNext}
                />
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
                    onClick={() => {
                      if (topTab === 'facial') {
                        fetchDeviceAttendanceList();
                        return;
                      }
                      viewMode === 'single' ? fetchRecords(true) : fetchAllUsersDTR();
                    }}
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
            {/* LEFT: Sidebar — hidden on the Facial (Live) tab since it auto-fetches live device data */}
            {topTab !== 'facial' && (
              <Grid item xs={12} lg={3}>
                <SectionCard
                  sx={{
                    ...attendanceMainPanelHeightSx,
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
            )}

            {/* RIGHT: Content — expands to full width when the sidebar is hidden */}
            <Grid item xs={12} lg={topTab === 'facial' ? 12 : 9}>
              <SectionCard
                sx={{
                  ...attendanceMainPanelHeightSx,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* ── Top-level page tabs: Device Record | Facial (Live) ── */}
                <Box sx={{ borderBottom: `1px solid ${T.divider}`, flexShrink: 0, bgcolor: '#fff' }}>
                  <Tabs
                    value={topTab}
                    onChange={(_, v) => setTopTab(v)}
                    sx={{
                      minHeight: 42,
                      px: 1,
                      '& .MuiTabs-indicator': { bgcolor: T.accent, height: 3, borderRadius: '3px 3px 0 0' },
                      '& .MuiTab-root': {
                        minHeight: 42,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: T.faint,
                        '&.Mui-selected': { color: T.accent, fontWeight: 800 },
                      },
                    }}
                  >
                    <Tab value="device" icon={<TableChartIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Device Record" />
                    <Tab value="facial" icon={<AccessTime sx={{ fontSize: 16 }} />} iconPosition="start" label="Facial (Live)" />
                  </Tabs>

                  {/* Sub-tabs (Table | Insights) — only within the Device Record tab */}
                  {topTab === 'device' && (
                    <Tabs
                      value={deviceViewTab}
                      onChange={(_, v) => setDeviceViewTab(v)}
                      sx={{
                        minHeight: 36,
                        px: 2,
                        borderTop: `1px solid ${T.divider}`,
                        bgcolor: T.accentFaint,
                        '& .MuiTabs-indicator': { bgcolor: T.accent, height: 2, borderRadius: '2px 2px 0 0' },
                        '& .MuiTab-root': {
                          minHeight: 36,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.76rem',
                          color: T.muted,
                          '&.Mui-selected': { color: T.accent, fontWeight: 800 },
                        },
                      }}
                    >
                      <Tab value="table" icon={<TableChartIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Table" />
                      <Tab value="insights" icon={<InsightsIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Insights" />
                    </Tabs>
                  )}
                </Box>

                {/* ── FACIAL (LIVE) TAB — no attendance filter, no table/insights sub-tabs ── */}
                {topTab === 'facial' && (
                  <>
                    <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                          <AccessTime sx={{ fontSize: 15, color: T.accent }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>Device Attendance List</Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: T.faint }}>
                              {startDate && endDate ? `${startDate} to ${endDate}` : 'Latest device attendance days'}
                            </Typography>
                          </Box>
                          <Box sx={{ px: 1.5, py: 0.3, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, flexShrink: 0 }}>
                            <Typography sx={{ fontSize: '0.7rem', color: T.accent, fontWeight: 700 }}>{filteredDeviceAttendanceRows.length} records</Typography>
                          </Box>
                        </Box>
                        <Tooltip title="Reload device attendance list" placement="top">
                          <span>
                            <IconButton
                              size="small"
                              onClick={fetchDeviceAttendanceList}
                              disabled={loadingDeviceAttendance}
                              sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 32, height: 32, '&:hover': { bgcolor: alpha(T.accent, 0.15) }, '&:disabled': { opacity: 0.4 } }}
                            >
                              {loadingDeviceAttendance ? <CircularProgress size={14} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: alpha(T.accent, 0.02), flexShrink: 0 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FieldInput
                          size="small"
                          placeholder="Search employee number, name, department, date..."
                          value={deviceAttendanceSearch}
                          onChange={(e) => {
                            setDeviceAttendanceSearch(e.target.value);
                            setDeviceAttendancePage(1);
                          }}
                          sx={{ flex: 1, minWidth: 240 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchOutlined sx={{ fontSize: 16, color: T.muted }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <FormControl size="small" sx={{ minWidth: 94 }}>
                          <Select
                            value={deviceAttendanceRowsPerPage}
                            onChange={(e) => {
                              setDeviceAttendanceRowsPerPage(Number(e.target.value));
                              setDeviceAttendancePage(1);
                            }}
                            sx={selectSx}
                          >
                            {[10, 25, 50, 100].map((n) => (
                              <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem' }}>{n} rows</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
                          {[{ label: '<<', fn: () => goToDeviceAttendancePage(1), dis: deviceAttendancePage === 1 }, { label: '<', fn: () => goToDeviceAttendancePage(deviceAttendancePage - 1), dis: deviceAttendancePage === 1 }].map(({ label, fn, dis }) => (
                            <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                              <Typography sx={{ fontSize: '0.72rem', lineHeight: 1 }}>{label}</Typography>
                            </IconButton>
                          ))}
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, minWidth: 60, textAlign: 'center' }}>
                            {deviceAttendancePage} / {deviceAttendanceTotalPages}
                          </Typography>
                          {[{ label: '>', fn: () => goToDeviceAttendancePage(deviceAttendancePage + 1), dis: deviceAttendancePage === deviceAttendanceTotalPages }, { label: '>>', fn: () => goToDeviceAttendancePage(deviceAttendanceTotalPages), dis: deviceAttendancePage === deviceAttendanceTotalPages }].map(({ label, fn, dis }) => (
                            <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                              <Typography sx={{ fontSize: '0.72rem', lineHeight: 1 }}>{label}</Typography>
                            </IconButton>
                          ))}
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto', ...scrollbarSx }}>
                      <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%', minWidth: 1180 }}>
                        <TableHead>
                          <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: T.accent, color: '#fff', fontWeight: 700, fontSize: '0.7rem', py: 1.15 } }}>
                            {['Employee No.', 'Full Name', 'Department', 'Date', 'Day', 'Time In', 'Brk In', 'Brk Out', 'Time Out', 'Special Time In', 'Special Time Out'].map((h) => (
                              <TableCell key={h} sx={{ width: h === 'Full Name' ? 210 : h === 'Department' ? 115 : 104 }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedDeviceAttendanceRows.map((row, idx) => (
                            <TableRow key={`${row.employeeNumber}-${row.date}-${idx}`} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : T.rowOdd, '&:hover': { bgcolor: T.rowHover }, transition: 'background 0.1s' }}>
                              <TableCell sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 700 }}>#{row.employeeNumber}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', color: T.text, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.fullName || 'Unknown'}</TableCell>
                              <TableCell>{row.department ? <DeptBadge code={row.department} /> : <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontStyle: 'italic' }}>Unassigned</Typography>}</TableCell>
                              <TableCell sx={{ fontSize: '0.76rem', color: T.text }}>{row.date || '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.76rem', color: T.muted }}>{row.day || '-'}</TableCell>
                              {[row.timeIn, row.breakIn, row.breakOut, row.timeOut, row.specialTimeIn, row.specialTimeOut].map((value, cellIdx) => (
                                <TableCell key={cellIdx} sx={{ fontSize: '0.76rem', color: value ? T.text : T.faint, fontWeight: value ? 600 : 400 }}>{value || '-'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {!loadingDeviceAttendance && paginatedDeviceAttendanceRows.length === 0 && (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <AccessTime sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>No device attendance found</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Select another period or clear the search field.</Typography>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>
                        {filteredDeviceAttendanceRows.length > 0
                          ? `Showing ${Math.min(filteredDeviceAttendanceRows.length, (deviceAttendancePage - 1) * deviceAttendanceRowsPerPage + 1)}-${Math.min(filteredDeviceAttendanceRows.length, deviceAttendancePage * deviceAttendanceRowsPerPage)} of ${filteredDeviceAttendanceRows.length}`
                          : '0 records'}
                      </Typography>
                    </Box>
                  </>
                )}

                {topTab === 'device' && viewMode === 'single' && deviceViewTab === 'table' && (
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
                        </Box>
                        {records.length > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {missingTimeInCount > 0 && (
                              <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: 'rgba(244,67,54,0.10)', border: '1px solid rgba(244,67,54,0.28)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Cancel sx={{ fontSize: 11, color: '#f44336' }} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#f44336', fontWeight: 700 }}>
                                  {missingTimeInCount} {NO_TIME_IN_LABEL}
                                </Typography>
                              </Box>
                            )}
                            {missingTimeOutCount > 0 && (
                              <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: 'rgba(244,67,54,0.10)', border: '1px solid rgba(244,67,54,0.28)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Cancel sx={{ fontSize: 11, color: '#f44336' }} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#f44336', fontWeight: 700 }}>
                                  {missingTimeOutCount} {NO_TIME_OUT_LABEL}
                                </Typography>
                              </Box>
                            )}
                            {lockedRowCount > 0 && (
                              <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: 'rgba(33,150,243,0.10)', border: '1px solid rgba(33,150,243,0.28)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Lock sx={{ fontSize: 11, color: '#1976d2' }} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#1976d2', fontWeight: 700 }}>
                                  {lockedRowCount} Admin Modified
                                </Typography>
                              </Box>
                            )}
                            {selectedLockedRows.size > 0 && (
                              <AccentButton
                                variant="contained"
                                size="small"
                                startIcon={
                                  bulkRestoring ? (
                                    <CircularProgress size={13} sx={{ color: '#fff' }} />
                                  ) : (
                                    <Sync sx={{ fontSize: '13px !important' }} />
                                  )
                                }
                                disabled={bulkRestoring || restoringKey !== null}
                                onClick={handleBulkForceSync}
                                sx={{
                                  fontSize: '0.78rem',
                                  bgcolor: '#1976d2',
                                  color: '#fff',
                                  boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
                                  '&:hover': { bgcolor: '#1565c0' },
                                }}
                              >
                                Restore Selected ({selectedLockedRows.size})
                              </AccentButton>
                            )}
                            <AccentButton
                              variant="contained"
                              size="small"
                              startIcon={<Assignment sx={{ fontSize: '13px !important' }} />}
                              onClick={handleGoToState}
                              sx={{ fontSize: '0.78rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`, '&:hover': { bgcolor: T.accentDark } }}
                            >
                              Go to Attendance State
                            </AccentButton>
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
                                gridTemplateColumns: lockedRowCount > 0 ? RECORDS_GRID_COLS : '0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr',
                                px: 2.5,
                                py: 1.25,
                                bgcolor: T.accent,
                                gap: 1,
                                position: 'sticky',
                                top: 0,
                                zIndex: 2,
                                minWidth: lockedRowCount > 0 ? 932 : 900,
                                alignItems: 'center',
                              }}
                            >
                              {lockedRowCount > 0 && (
                                <Checkbox
                                  size="small"
                                  checked={
                                    lockedRowsOnPage.length > 0 &&
                                    selectedLockedOnPageCount === lockedRowsOnPage.length
                                  }
                                  indeterminate={
                                    selectedLockedOnPageCount > 0 &&
                                    selectedLockedOnPageCount < lockedRowsOnPage.length
                                  }
                                  disabled={lockedRowsOnPage.length === 0}
                                  onChange={(e) => handleSelectAllLockedOnPage(e.target.checked)}
                                  sx={{
                                    color: 'rgba(255,255,255,0.7)',
                                    p: 0,
                                    '&.Mui-checked': { color: '#fff' },
                                    '&.MuiCheckbox-indeterminate': { color: '#fff' },
                                  }}
                                />
                              )}
                              {['EMP ID', 'DATE', 'DAY', 'TIME IN', 'BREAK IN', 'BREAK OUT', 'TIME OUT', 'SPECIAL TYPE', 'SP. IN', 'SP. OUT'].map((h) => (
                                <Typography key={h} sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em' }}>
                                  {h}
                                </Typography>
                              ))}
                            </Box>
                            <Box
                              sx={{
                                px: 2.5,
                                py: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 1,
                                borderBottom: `1px solid ${T.divider}`,
                                bgcolor: alpha(T.accent, 0.02),
                              }}
                            >
                              <Typography sx={{ fontSize: '0.72rem', color: T.muted, mr: 'auto' }}>
                                {records.length > recordsRowsPerPage
                                  ? `Showing ${(recordsPage - 1) * recordsRowsPerPage + 1}–${Math.min(records.length, recordsPage * recordsRowsPerPage)} of ${records.length}`
                                  : `${records.length} row${records.length === 1 ? '' : 's'}`}
                              </Typography>
                              {lockedRowCount > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                  <Typography
                                    component="button"
                                    type="button"
                                    onClick={handleSelectAllLockedInPeriod}
                                    sx={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: '#1976d2',
                                      bgcolor: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      p: 0,
                                      fontFamily: 'inherit',
                                      '&:hover': { textDecoration: 'underline' },
                                    }}
                                  >
                                    Select all {lockedRowCount} locked
                                  </Typography>
                                  {selectedLockedRows.size > 0 && (
                                    <>
                                      <Typography sx={{ fontSize: '0.68rem', color: T.faint }}>·</Typography>
                                      <Typography
                                        component="button"
                                        type="button"
                                        onClick={handleClearLockedSelection}
                                        sx={{
                                          fontSize: '0.68rem',
                                          fontWeight: 600,
                                          color: T.muted,
                                          bgcolor: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          p: 0,
                                          fontFamily: 'inherit',
                                          '&:hover': { textDecoration: 'underline' },
                                        }}
                                      >
                                        Clear ({selectedLockedRows.size})
                                      </Typography>
                                    </>
                                  )}
                                </Box>
                              )}
                              <FormControl size="small" sx={{ minWidth: 92 }}>
                                <Select
                                  value={recordsRowsPerPage}
                                  onChange={(e) => {
                                    setRecordsRowsPerPage(Number(e.target.value));
                                    setRecordsPage(1);
                                  }}
                                  sx={selectSx}
                                >
                                  {[25, 50, 100, 200].map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '0.82rem' }}>{n} / page</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              {recordsTotalPages > 1 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  {[{ label: '«', fn: () => goToRecordsPage(1), dis: recordsPage === 1 }, { label: '‹', fn: () => goToRecordsPage(recordsPage - 1), dis: recordsPage === 1 }].map(({ label, fn, dis }) => (
                                    <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                                      <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{label}</Typography>
                                    </IconButton>
                                  ))}
                                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, minWidth: 56, textAlign: 'center' }}>
                                    {recordsPage} / {recordsTotalPages}
                                  </Typography>
                                  {[{ label: '›', fn: () => goToRecordsPage(recordsPage + 1), dis: recordsPage === recordsTotalPages }, { label: '»', fn: () => goToRecordsPage(recordsTotalPages), dis: recordsPage === recordsTotalPages }].map(({ label, fn, dis }) => (
                                    <IconButton key={label} size="small" onClick={fn} disabled={dis} sx={{ width: 28, height: 28, color: T.accent, border: `1px solid ${T.accentBorder}`, borderRadius: '6px', '&:disabled': { opacity: 0.35 } }}>
                                      <Typography sx={{ fontSize: '0.8rem', lineHeight: 1 }}>{label}</Typography>
                                    </IconButton>
                                  ))}
                                </Box>
                              )}
                            </Box>
                            <Box sx={{ overflowX: 'auto' }}>
                              {paginatedRecords.map((record, index) => {
                                const globalIndex = (recordsPage - 1) * recordsRowsPerPage + index;
                                const hasTimeIn = !!record.Time1;
                                const hasBreakIn = !!record.Time3;
                                const hasBreakOut = !!record.Time2;
                                const hasTimeOut = !!record.Time4;
                                const hasAnyTime = hasTimeIn || hasBreakIn || hasBreakOut || hasTimeOut;
                                const timeInUncategorized = hasAnyTime && !hasTimeIn;
                                const timeOutUncategorized = hasAnyTime && !hasTimeOut;
                                const hasAnyUncategorized = timeInUncategorized || timeOutUncategorized;
                                const isLocked = isManuallyLocked(record);
                                const rowRestoreKey = makeRecordKey(record.PersonID, record.Date);
                                const wasRecentlyRestored = recentlyRestoredKeys.has(rowRestoreKey);
                                const isRowSelected = selectedLockedRows.has(rowRestoreKey);

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

                                const rowBg = isLocked
                                  ? 'rgba(33, 150, 243, 0.06)'
                                  : wasRecentlyRestored
                                    ? 'rgba(76, 175, 80, 0.06)'
                                    : hasAnyUncategorized
                                      ? 'rgba(244,67,54,0.03)'
                                      : globalIndex % 2 === 0
                                        ? '#fff'
                                        : T.rowOdd;
                                const rowHoverBg = isLocked
                                  ? 'rgba(33, 150, 243, 0.10)'
                                  : wasRecentlyRestored
                                    ? 'rgba(76, 175, 80, 0.10)'
                                    : hasAnyUncategorized
                                      ? 'rgba(244,67,54,0.07)'
                                      : T.rowHover;

                                return (
                                  <Box
                                    key={`${record.PersonID}-${record.Date}-${globalIndex}`}
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: lockedRowCount > 0 ? RECORDS_GRID_COLS : '0.8fr 1fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr 1fr 1fr 1fr',
                                      px: 2.5,
                                      py: 1.5,
                                      gap: 1,
                                      alignItems: 'center',
                                      minWidth: lockedRowCount > 0 ? 932 : 900,
                                      bgcolor: rowBg,
                                      borderBottom: isLocked
                                        ? '1px solid rgba(33,150,243,0.18)'
                                        : wasRecentlyRestored
                                          ? '1px solid rgba(76,175,80,0.22)'
                                          : hasAnyUncategorized
                                            ? '1px solid rgba(244,67,54,0.12)'
                                            : `1px solid ${T.divider}`,
                                      transition: 'background 0.12s',
                                      '&:hover': { bgcolor: rowHoverBg },
                                      '&:last-child': { borderBottom: 'none' },
                                    }}
                                  >
                                    {lockedRowCount > 0 && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isLocked ? (
                                          <Checkbox
                                            size="small"
                                            checked={isRowSelected}
                                            disabled={bulkRestoring}
                                            onChange={(e) =>
                                              toggleLockedRowSelection(rowRestoreKey, e.target.checked)
                                            }
                                            sx={{
                                              p: 0,
                                              color: '#1976d2',
                                              '&.Mui-checked': { color: '#1976d2' },
                                            }}
                                          />
                                        ) : null}
                                      </Box>
                                    )}
                                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{record.PersonID}</Typography>
                                    <Box>
                                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text }}>{record.Date}</Typography>
                                      {isLocked && (
                                        <LockStatusChip
                                          modifiedBy={record.modified_by}
                                          modifiedByName={record.modified_by_name}
                                          modifiedAt={record.modified_at}
                                        />
                                      )}
                                      {!isLocked && wasRecentlyRestored && <RestoredStatusChip />}
                                    </Box>
                                    <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>{getDayOfWeek(record.Date)}</Typography>
                                    <TimeCell time={record.Time1} isUncategorized={timeInUncategorized} missingLabel={NO_TIME_IN_LABEL} />
                                    <TimeCell time={record.Time3} isUncategorized={false} />
                                    <TimeCell time={record.Time2} isUncategorized={false} />
                                    <TimeCell time={record.Time4} isUncategorized={timeOutUncategorized} missingLabel={NO_TIME_OUT_LABEL} />
                                    <Box>{specialTypeBadge || <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>—</Typography>}</Box>
                                    <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{record.Time5 ? formatTime(record.Time5) : '—'}</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.35 }}>
                                      <Typography sx={{ fontSize: '0.78rem', color: T.text }}>{record.Time6 ? formatTime(record.Time6) : '—'}</Typography>
                                      {isLocked && (
                                        <Tooltip title="Restore raw device data for this day" placement="left" arrow>
                                          <span>
                                            <RowBtn
                                              icon={<Sync sx={{ fontSize: 11 }} />}
                                              label="Restore"
                                              color="#1976d2"
                                              hoverBg="rgba(33,150,243,0.08)"
                                              disabled={
                                                bulkRestoring ||
                                                restoringKey === rowRestoreKey
                                              }
                                              onClick={() => handleForceSync(record.PersonID, record.Date)}
                                            />
                                          </span>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        </Fade>
                      )}
                    </Box>

                    {/* Footer legend + submit to attendance modules */}
                    {records.length > 0 && (
                      <Box
                        sx={{
                          px: 2,
                          py: 0.65,
                          borderTop: `1px solid ${T.divider}`,
                          bgcolor: T.accentFaint,
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          columnGap: 1.5,
                          rowGap: 0.65,
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1.25,
                            alignItems: 'center',
                            minWidth: 0,
                            flex: '1 1 auto',
                          }}
                        >
                          {[
                            {
                              icon: CheckCircle,
                              color: '#4caf50',
                              label: 'Auto-saved',
                              show: true,
                            },
                            {
                              icon: Info,
                              color: T.accent,
                              label: '12h format',
                              show: true,
                            },
                            {
                              icon: Cancel,
                              color: '#f44336',
                              label: NO_TIME_IN_LABEL,
                              show: true,
                            },
                            {
                              icon: Cancel,
                              color: '#f44336',
                              label: NO_TIME_OUT_LABEL,
                              show: true,
                            },
                            {
                              icon: Lock,
                              color: '#1976d2',
                              label: 'Locked',
                              show: lockedRowCount > 0,
                            },
                            {
                              icon: Restore,
                              color: '#2e7d32',
                              label: 'Restored',
                              show: true,
                            },
                          ]
                            .filter((item) => item.show)
                            .map((item, i) => {
                              const Icon = item.icon;
                              return (
                                <Box
                                  key={i}
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.35,
                                  }}
                                >
                                  <Icon sx={{ fontSize: 11, color: item.color }} />
                                  <Typography
                                    sx={{
                                      fontSize: '0.62rem',
                                      color: T.faint,
                                      lineHeight: 1,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {item.label}
                                  </Typography>
                                </Box>
                              );
                            })}
                        </Box>
                        <Box
                          sx={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            ml: { xs: 0, md: 1 },
                          }}
                        >
                          {renderSubmitToAttendanceNav()}
                        </Box>
                      </Box>
                    )}
                  </>
                )}

                {topTab === 'device' && viewMode === 'single' && deviceViewTab === 'insights' && (
                  <DeviceInsightsCharts
                    viewMode="single"
                    data={deviceInsightsData}
                    emptyHint={
                      !hasSearchedSingle || !personID
                        ? 'Select a registered employee and fetch records to see insights.'
                        : 'No device records for this registered user in the selected period.'
                    }
                  />
                )}

                {/* ── ALL USERS VIEW — TABLE ── */}
                {topTab === 'device' && viewMode === 'multiple' && deviceViewTab === 'table' && (
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
                              <Refresh sx={{ fontSize: 16 }} />
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
                                        onClick={() => navigateAttendanceWorkflow(navigate, 'dtr', {
                                          employeeNumber: user.employeeNumber,
                                          fullName: user.fullName,
                                          startDate,
                                          endDate,
                                        })}
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

                        {/* Footer: selection, submit-to modules, pagination */}
                        <Box
                          sx={{
                            px: 3,
                            py: 1.25,
                            borderTop: `1px solid ${T.divider}`,
                            bgcolor: T.accentFaint,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            rowGap: 1.25,
                            flexShrink: 0,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              flexShrink: 0,
                            }}
                          >
                            <AccentButton
                              variant="text"
                              size="small"
                              onClick={() => handleSelectAll(selectedCountInFiltered !== filteredUsers.length)}
                              sx={{ color: T.accent, fontSize: '0.75rem', '&:hover': { bgcolor: T.accentFaint, transform: 'none' }, '&:active': { transform: 'none' } }}
                            >
                              {selectedCountInFiltered === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
                            </AccentButton>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: 1.5,
                              flex: '1 1 auto',
                              justifyContent: 'center',
                              minWidth: 0,
                            }}
                          >
                            {renderSubmitToAttendanceNav()}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: T.muted,
                              flexShrink: 0,
                              ml: { xs: 0, md: 'auto' },
                            }}
                          >
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
                          <People sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                          {!startDate || !endDate ? 'Select a month first' : 'No data loaded'}
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

                {topTab === 'device' && viewMode === 'multiple' && deviceViewTab === 'insights' && (
                  <DeviceInsightsCharts
                    viewMode="multiple"
                    data={deviceInsightsData}
                    emptyHint={
                      !startDate || !endDate
                        ? 'Select a month and load all users to see insights.'
                        : allUsersDTR.length === 0
                          ? 'Click Load All Users — only employees in the Users list are included.'
                          : 'No registered users match your current filters.'
                    }
                  />
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
        {/* Computation type mismatch dialog */}
        <Dialog
          open={computationChangeDialog.open}
          onClose={() => setComputationChangeDialog((p) => ({ ...p, open: false }))}
          aria-labelledby="computation-type-mismatch-title"
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '12px',
              overflow: 'hidden',
              border: `1.5px solid ${T.accentBorder}`,
              boxShadow: `0 20px 60px ${alpha(T.accent, 0.22)}`,
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              position: 'relative',
              overflow: 'hidden',
              borderBottom: `1px solid ${T.accentBorder}`,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: alpha(T.accent, 0.12),
                border: `1.5px solid ${T.accentBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}
            >
              <WarningAmberRoundedIcon sx={{ fontSize: 22, color: T.accent }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
              <Typography
                id="computation-type-mismatch-title"
                sx={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.25, color: T.accent }}
              >
                Computation type mismatch
              </Typography>
              <Typography sx={{ fontSize: '0.76rem', color: T.accentMid, lineHeight: 1.45, mt: 0.4, fontWeight: 600 }}>
                A different type was previously saved for this employee and period.
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setComputationChangeDialog((p) => ({ ...p, open: false }))}
              aria-label="Close"
              sx={{ color: T.accentMid, p: '4px', zIndex: 1, '&:hover': { bgcolor: alpha(T.accent, 0.08) } }}
            >
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Body */}
          <DialogContent sx={{ px: 3, pt: 2.5, pb: 2, bgcolor: '#fff' }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: '10px',
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
                mb: 2.5,
              }}
            >
              <Typography sx={{ fontSize: '0.8rem', color: T.text, lineHeight: 1.6 }}>
                Records for{' '}
                <Box component="span" sx={{ fontWeight: 800, color: T.accent }}>
                  {computationChangeDialog.employeeName || 'this employee'}
                </Box>{' '}
                in this period were first saved as{' '}
                <Chip
                  label={computationChangeDialog.existingType || '—'}
                  size="small"
                  sx={{
                    height: 22,
                    mx: 0.25,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: alpha(T.accent, 0.1),
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                  }}
                />
                . Switching will overwrite that with{' '}
                <Chip
                  label={computationChangeDialog.newType || '—'}
                  size="small"
                  sx={{
                    height: 22,
                    mx: 0.25,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: T.accent,
                    color: '#FEF9E1',
                    border: `1px solid ${T.accentDark}`,
                  }}
                />
                .
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 1.5 }}>
              {/* Previously saved */}
              <Box
                sx={{
                  py: 1.75,
                  px: 1.25,
                  borderRadius: '10px',
                  bgcolor: '#fafafa',
                  border: `1px solid ${T.divider}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    color: T.faint,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Previously saved
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${T.accentBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 18, color: T.accentMid }} />
                </Box>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.muted, lineHeight: 1.3 }}>
                  {computationChangeDialog.existingType || '—'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accentMid }}>
                <ArrowForward sx={{ fontSize: 20 }} />
              </Box>

              {/* Switching to */}
              <Box
                sx={{
                  py: 1.75,
                  px: 1.25,
                  borderRadius: '10px',
                  bgcolor: T.accentFaint,
                  border: `2px solid ${T.accent}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  textAlign: 'center',
                  boxShadow: `0 4px 14px ${alpha(T.accent, 0.12)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    color: T.accent,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                  }}
                >
                  Switching to
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: T.accent,
                    border: `1px solid ${T.accentDark}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AccessTime sx={{ fontSize: 18, color: '#FEF9E1' }} />
                </Box>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: T.accent, lineHeight: 1.3 }}>
                  {computationChangeDialog.newType || '—'}
                </Typography>
              </Box>
            </Box>
          </DialogContent>

          {/* Actions */}
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              borderTop: `1px solid ${T.divider}`,
              gap: 1.5,
              bgcolor: '#fff',
            }}
          >
            <Button
              onClick={() => setComputationChangeDialog((p) => ({ ...p, open: false }))}
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: T.muted,
                px: 2,
                '&:hover': { bgcolor: alpha(T.accent, 0.06), color: T.accent },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                const next = { ...computationChangeDialog };
                setComputationChangeDialog((p) => ({ ...p, open: false }));
                await proceedToComputationModule(
                  next.rawNewType,
                  next.auditButtonLabel ||
                    COMPUTATION_BUTTON_LABELS[next.rawNewType] ||
                    next.rawNewType,
                );
              }}
              sx={{
                fontSize: '0.8rem',
                fontWeight: 700,
                px: 2.5,
                borderRadius: '8px',
                bgcolor: T.accent,
                color: '#FEF9E1',
                boxShadow: `0 4px 14px ${alpha(T.accent, 0.28)}`,
                '&:hover': { bgcolor: T.accentDark, boxShadow: `0 6px 18px ${alpha(T.accent, 0.35)}` },
              }}
            >
              Yes, switch &amp; continue
            </Button>
          </DialogActions>
        </Dialog>
        <LoadingOverlay
          open={loading || loadingAllUsers}
          message={
            loadingAllUsers
              ? `Loading all users — ${loadPhase || 'Please wait…'}`
              : personName
                ? `Loading attendance — ${personName}…`
                : loadPhase || 'Loading attendance…'
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