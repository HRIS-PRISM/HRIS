import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Autocomplete,
  TextField,
  Alert,
  Fade,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Paper,
  Tabs,
  Tab,
  Checkbox,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  EventNote as LeaveIcon,
  WorkHistory as SCIcon,
  AccessTime as CTOIcon,
  Close,
  Person as PersonIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  CalendarToday as CalIcon,
  MonetizationOn as EarnIcon,
  Pending as PendingIcon,
  Domain as DeptIcon,
  Work as WorkIcon,
  Today as DayIcon,
  Schedule as HourIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  AccessTimeFilled as LateIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  PersonOff as AbsentIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  DateRange as DateRangeIcon,
  EventAvailable as PresentIcon,
  Calculate as CalculateIcon,
  SwapHoriz as ConvertIcon,
  OpenInNew as OpenInNewIcon,
  RemoveCircleOutline as DeductIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { LeaveInputColumn } from './EARNINGS/LeaveEarnings';
import { SCInputColumn } from './EARNINGS/SCEarnings';
import { CTOInputColumn } from './EARNINGS/CTOEarnings';
import { AttendanceSummary } from './EARNINGS/AttendanceSummary';
import { RecordsList, DeptBadge, EmpCatBadge } from './EARNINGS/RecordsList';

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.12)",
  headerGrad: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider: "rgba(0,0,0,0.08)",
  surface: "#ffffff",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#888888",
  poppins: "'Poppins', sans-serif",
  statusPending: {
    bg: "rgba(0,0,0,0.04)",
    color: "#7a4a00",
    border: "rgba(0,0,0,0.12)",
  },
  statusApproved: {
    bg: "rgba(0,0,0,0.04)",
    color: "#1e4d20",
    border: "rgba(0,0,0,0.12)",
  },
  statusRejected: {
    bg: "rgba(0,0,0,0.04)",
    color: "#6b1a1a",
    border: "rgba(0,0,0,0.12)",
  },
};

const MONTHS = [
  { value: "1", label: "January", short: "Jan" },
  { value: "2", label: "February", short: "Feb" },
  { value: "3", label: "March", short: "Mar" },
  { value: "4", label: "April", short: "Apr" },
  { value: "5", label: "May", short: "May" },
  { value: "6", label: "June", short: "Jun" },
  { value: "7", label: "July", short: "Jul" },
  { value: "8", label: "August", short: "Aug" },
  { value: "9", label: "September", short: "Sep" },
  { value: "10", label: "October", short: "Oct" },
  { value: "11", label: "November", short: "Nov" },
  { value: "12", label: "December", short: "Dec" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

const getCalendarDays = (year, month) => new Date(year, month, 0).getDate();

const EARN_STATUS = {
  pending: { label: "Pending", ...T.statusPending, icon: PendingIcon },
  approved: { label: "Approved", ...T.statusApproved, icon: CheckIcon },
  rejected: { label: "Rejected", ...T.statusRejected, icon: WarnIcon },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All", color: "#555" },
  { value: "pending", label: "Pending", color: "#7a4a00" },
  { value: "approved", label: "Approved", color: "#1e4d20" },
  { value: "rejected", label: "Rejected", color: "#6b1a1a" },
];

const monthName = (m) =>
  MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
const monthShort = (m) =>
  MONTHS.find((x) => x.value === String(m))?.short || `M${m}`;
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toHours = (val, unit) => (unit === "days" ? val * 8 : val);
const fmtHrs = (h, unit) =>
  unit === "hours"
    ? `${toNum(h).toFixed(3)} hrs`
    : `${(toNum(h) / 8).toFixed(3)} days`;

const parseHHMM = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return (
      Number(parts[0]) +
      Number(parts[1] || 0) / 60 +
      Number(parts[2] || 0) / 3600
    );
  }
  return parseFloat(str) || 0;
};

const hoursToHHMM = (h) => {
  const total = Math.round(h * 3600);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const hrsToHMS = (h) => {
  const totalSec = Math.round(Math.abs(h) * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes emFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes attPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
`;

const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Conversion defaults ──────────────────────────────────────────────────────
const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "8hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));
const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "6hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));
const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute",
  day_type: "minute",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));
const DEFAULT_LWP_TABLE = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  e: Number(((i + 1) * 0.04167).toFixed(3)),
}));
const DEFAULT_ABS_TABLE = [
  { a: 0.5, e: 1.229 },
  { a: 1.0, e: 1.208 },
  { a: 1.5, e: 1.188 },
  { a: 2.0, e: 1.167 },
  { a: 2.5, e: 1.146 },
  { a: 3.0, e: 1.125 },
  { a: 3.5, e: 1.104 },
  { a: 4.0, e: 1.083 },
  { a: 4.5, e: 1.063 },
  { a: 5.0, e: 1.042 },
  { a: 5.5, e: 1.021 },
  { a: 6.0, e: 1.0 },
  { a: 6.5, e: 0.979 },
  { a: 7.0, e: 0.958 },
  { a: 7.5, e: 0.938 },
  { a: 8.0, e: 0.917 },
  { a: 8.5, e: 0.854 },
  { a: 9.0, e: 0.833 },
  { a: 9.5, e: 0.875 },
  { a: 10.0, e: 0.833 },
  { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 },
  { a: 11.5, e: 0.771 },
  { a: 12.0, e: 0.75 },
  { a: 12.5, e: 0.729 },
  { a: 13.0, e: 0.708 },
  { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 },
  { a: 14.5, e: 0.646 },
  { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 },
  { a: 16.0, e: 0.583 },
  { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 },
  { a: 17.5, e: 0.521 },
  { a: 18.0, e: 0.5 },
  { a: 18.5, e: 0.479 },
  { a: 19.0, e: 0.458 },
  { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 },
  { a: 20.5, e: 0.396 },
  { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 },
  { a: 22.0, e: 0.333 },
  { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 },
  { a: 23.5, e: 0.271 },
  { a: 24.0, e: 0.25 },
  { a: 24.5, e: 0.229 },
  { a: 25.0, e: 0.208 },
  { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 },
  { a: 26.5, e: 0.146 },
  { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 },
  { a: 28.0, e: 0.083 },
  { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 },
  { a: 29.5, e: 0.021 },
];

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

const EarningsWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -5 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Header card skeleton */}
      <Box
        sx={{
          mb: 0,
          borderRadius: '12px 12px 0 0',
          overflow: 'hidden',
          border: `1px solid rgba(109,35,35,0.12)`,
          animation: 'blink 2s ease-in-out infinite',
        }}
      >
        {/* Gradient top bar */}
        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)', flexShrink: 0 }} />
            <Box>
              <Bone w={220} h={16} sx={{ mb: 1 }} />
              <Bone w={340} h={10} />
            </Box>
          </Box>
          <Bone w={140} h={30} r={8} />
        </Box>

        {/* Employee selector row */}
        <Box
          sx={{
            px: 4, py: 2,
            bgcolor: 'rgba(109,35,35,0.05)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.15)', flexShrink: 0 }} />
          <Bone w={240} h={32} r={8} sx={{ flex: 1, maxWidth: 340 }} />
          <Bone w={160} h={32} r={8} />
          <Bone w={260} h={28} r={8} sx={{ ml: 'auto' }} />
        </Box>

        {/* Tab row */}
        <Box
          sx={{
            background: 'linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)',
            px: 1, pt: 0.75, pb: 0,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 0.5,
          }}
        >
          {[100, 130, 180].map((w, i) => (
            <Box
              key={i}
              sx={{
                px: 2.5, py: 1.1,
                borderRadius: '8px 8px 0 0',
                bgcolor: i === 0 ? 'rgba(255,255,255,0.95)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: i === 0 ? 'rgba(109,35,35,0.2)' : 'rgba(255,255,255,0.25)' }} />
              <Bone
                w={w}
                h={11}
                sx={{
                  background: i === 0
                    ? `linear-gradient(90deg, rgba(109,35,35,0.1) 25%, rgba(109,35,35,0.2) 50%, rgba(109,35,35,0.1) 75%)`
                    : `linear-gradient(90deg, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.15) 75%)`,
                  backgroundSize: '800px 100%',
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* 3-column body */}
      <Box
        sx={{
          borderRadius: '0 0 12px 12px',
          border: `1px solid rgba(109,35,35,0.12)`,
          borderTop: 'none',
          overflow: 'hidden',
          bgcolor: '#fff',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          height: 'calc(100vh - 340px)',
          minHeight: 480,
          animation: 'blink 2s ease-in-out 0.1s infinite',
        }}
      >
        {/* Col 1 — Attendance */}
        <Box sx={{ borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* col header */}
          <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
            <Bone w={160} h={10} />
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* summary card skeleton */}
            <Box sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', height: 72 }}>
                <Box sx={{ width: 52, bgcolor: 'rgba(109,35,35,0.04)', borderRight: '1px solid rgba(0,0,0,0.07)' }} />
                <Box sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, justifyContent: 'center', borderRight: '1px solid rgba(0,0,0,0.07)' }}>
                  <Bone w="70%" h={18} />
                  <Bone w="50%" h={10} />
                </Box>
                <Box sx={{ width: 48, bgcolor: 'rgba(0,0,0,0.02)', borderRight: '1px solid rgba(0,0,0,0.07)' }} />
                <Box sx={{ flex: 1, bgcolor: 'rgba(46,125,50,0.04)' }} />
              </Box>
            </Box>
            {/* edit record skeleton */}
            <Box sx={{ borderRadius: 1.5, border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, py: 0.85, bgcolor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Bone w={90} h={10} />
                <Bone w={40} h={22} r={6} />
              </Box>
              <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {[1, 2].map((i) => (
                  <Box key={i} sx={{ borderRadius: 1.5, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <Box sx={{ px: 1, py: 0.4, bgcolor: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <Bone w="60%" h={8} />
                    </Box>
                    <Box sx={{ p: 1 }}>
                      <Bone w="80%" h={16} />
                      <Bone w="50%" h={9} sx={{ mt: 0.5 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            {/* deduction receipt skeleton */}
            <Box sx={{ borderRadius: 1.5, border: '1px solid rgba(109,35,35,0.15)', overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(109,35,35,0.06)', borderBottom: '1px solid rgba(109,35,35,0.1)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
                <Bone w={180} h={9} />
              </Box>
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ borderRadius: 1.25, border: '1px solid rgba(109,35,35,0.12)', overflow: 'hidden' }}>
                  {[80, 120, 100].map((w, i) => (
                    <Box key={i} sx={{ px: 1.25, py: 0.85, borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Bone w={w} h={10} />
                      <Bone w={50} h={13} r={4} />
                    </Box>
                  ))}
                </Box>
                <Bone w="100%" h={30} r={6} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Col 2 — Input */}
        <Box sx={{ borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
            <Bone w={180} h={10} />
          </Box>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1 }}>
            <Bone w="55%" h={10} />
            {[1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25, py: 0.85,
                  borderRadius: 1.5,
                  border: '1px solid rgba(0,0,0,0.08)',
                  bgcolor: 'rgba(0,0,0,0.01)',
                }}
              >
                <Box>
                  <Bone w={80} h={11} sx={{ mb: 0.5 }} />
                  <Bone w={120} h={8} />
                </Box>
                <Bone w={80} h={32} r={6} />
              </Box>
            ))}
          </Box>
          <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Bone w="100%" h={32} r={8} />
            <Bone w="100%" h={36} r={8} />
          </Box>
        </Box>

        {/* Col 3 — Records */}
        <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
            <Bone w={150} h={10} />
          </Box>
          {/* type filter bar */}
          <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(109,35,35,0.02)', display: 'flex', gap: 0.75, flexShrink: 0 }}>
            {[50, 55, 40, 55].map((w, i) => <Bone key={i} w={w} h={20} r={20} />)}
          </Box>
          {/* status filter bar */}
          <Box sx={{ px: 1.5, py: 0.6, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(0,0,0,0.015)', display: 'flex', gap: 0.75, flexShrink: 0 }}>
            {[60, 65, 68, 65].map((w, i) => <Bone key={i} w={w} h={18} r={20} />)}
          </Box>
          {/* record rows */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pt: 1.25, pb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.08)',
                  bgcolor: '#fff',
                  animation: `blink 1.6s ease-in-out ${i * 0.1}s infinite`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    <Bone w={40} h={16} r={20} />
                    <Bone w={80} h={14} />
                    <Bone w={55} h={16} r={20} />
                  </Box>
                  <Bone w={55} h={22} r={6} />
                </Box>
                <Bone w="35%" h={18} sx={{ mb: 0.5 }} />
                <Bone w="60%" h={9} />
              </Box>
            ))}
          </Box>
          {/* pagination */}
          <Box sx={{ px: 1.5, py: 0.85, borderTop: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(0,0,0,0.015)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Bone w={120} h={10} />
            <Box sx={{ display: 'flex', gap: 0.4 }}>
              {[1, 2, 3, 4].map((i) => <Bone key={i} w={20} h={20} r={4} />)}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Styled components ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  overflow: "hidden",
  background: T.surface,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

// ─── Result Pill ──────────────────────────────────────────────────────────────
const ResultPill = ({ label, value, primary = false }) => (
  <Box
    sx={{
      flex: 1,
      py: 1,
      px: 0.75,
      borderRadius: "8px",
      textAlign: "center",
      bgcolor: primary ? T.accent : "rgba(109,35,35,0.06)",
      border: `1px solid ${primary ? T.accent : "rgba(109,35,35,0.14)"}`,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.56rem",
        fontWeight: 700,
        color: primary ? "rgba(255,255,255,0.6)" : alpha(T.accent, 0.5),
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        mb: 0.4,
        fontFamily: T.poppins,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontWeight: 900,
        fontSize: primary ? "1.05rem" : "0.95rem",
        color: primary ? "#fff" : T.accent,
        lineHeight: 1,
        fontFamily: T.poppins,
      }}
    >
      {value}
    </Typography>
  </Box>
);

// ─── Clearable Int Field ──────────────────────────────────────────────────────
const ClearableIntField = ({
  value,
  onChange,
  placeholder,
  min = 0,
  max,
  widgetInputSx,
}) => {
  const [draft, setDraft] = useState(null);
  const displayVal = draft !== null ? draft : value === 0 ? "" : String(value);
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? String(min)}
      value={displayVal}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const num = parseInt(raw, 10);
        if (!isNaN(num)) {
          let c = Math.max(num, min);
          if (max !== undefined) c = Math.min(c, max);
          onChange(c);
        }
      }}
      onFocus={(e) => {
        setDraft(value === 0 ? "" : String(value));
        e.target.select();
      }}
      onBlur={() => {
        let num = parseInt(draft ?? "", 10);
        if (isNaN(num)) num = min;
        if (max !== undefined) num = Math.min(num, max);
        num = Math.max(num, min);
        onChange(num);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={widgetInputSx?.__raw}
    />
  );
};

// ─── Clearable Decimal Field ──────────────────────────────────────────────────
const ClearableDecimalField = ({
  value,
  onChange,
  placeholder,
  min = 0,
  max,
  step = 0.5,
  snapToStep = false,
  widgetInputSx,
}) => {
  const [draft, setDraft] = useState(null);
  const displayVal = draft !== null ? draft : value === 0 ? "" : String(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? "0"}
      value={displayVal}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          let c = Math.max(num, min);
          if (max !== undefined) c = Math.min(c, max);
          onChange(c);
        }
      }}
      onFocus={(e) => {
        setDraft(value === 0 ? "" : String(value));
        e.target.select();
      }}
      onBlur={() => {
        let num = parseFloat(draft ?? "") || 0;
        if (snapToStep && step) num = Math.round(num / step) * step;
        if (max !== undefined) num = Math.min(num, max);
        num = Math.max(num, min);
        onChange(num);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={widgetInputSx?.__raw}
    />
  );
};

// ─── Floating Conversion Widget ───────────────────────────────────────────────
const FloatingConversionWidget = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hours8Table, setHours8Table] = useState(DEFAULT_HOURS_8);
  const [hours6Table, setHours6Table] = useState(DEFAULT_HOURS_6);
  const [minutesTable, setMinutesTable] = useState(DEFAULT_MINUTES);
  const [lwpTable, setLwpTable] = useState(DEFAULT_LWP_TABLE);
  const [absTable, setAbsTable] = useState(DEFAULT_ABS_TABLE);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [whMode, setWhMode] = useState("forward");
  const [whDayType, setWhDayType] = useState("8hr");
  const [whHours, setWhHours] = useState(0);
  const [whMinutes, setWhMinutes] = useState(0);
  const [revInput, setRevInput] = useState("");
  const [revDraft, setRevDraft] = useState(null);
  const [lcDays, setLcDays] = useState(1);
  const [lcAbs, setLcAbs] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [whRes, lcRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/working-hours/rates`),
          axios.get(`${API_BASE_URL}/api/working-hours/leave-credits/rates`),
        ]);
        if (whRes.status === "fulfilled") {
          const d = whRes.value.data;
          const ensureHours = (rows, dayType, fallback) => {
            const byHour = new Map(
              (rows || []).map((r) => [Number(r.rate_value), r]),
            );
            const baseRate = Number(
              byHour.get(1)?.decimal_equivalent ?? fallback,
            );
            return Array.from({ length: 8 }, (_, i) => {
              const h = i + 1;
              const found = byHour.get(h);
              return found
                ? {
                    ...found,
                    rate_type: "hour",
                    day_type: dayType,
                    rate_value: h,
                    decimal_equivalent: sanitizeDecimal(
                      found.decimal_equivalent,
                    ),
                  }
                : {
                    rate_type: "hour",
                    day_type: dayType,
                    rate_value: h,
                    decimal_equivalent: sanitizeDecimal(h * baseRate),
                  };
            });
          };
          if (Array.isArray(d.hours8) && d.hours8.length > 0)
            setHours8Table(ensureHours(d.hours8, "8hr", 0.125));
          if (Array.isArray(d.hours6) && d.hours6.length > 0)
            setHours6Table(ensureHours(d.hours6, "6hr", 0.167));
          if (Array.isArray(d.minutes) && d.minutes.length === 60)
            setMinutesTable(d.minutes);
        }
        if (lcRes.status === "fulfilled") {
          const d = lcRes.value.data;
          if (Array.isArray(d.lwp) && d.lwp.length === 30) setLwpTable(d.lwp);
          if (Array.isArray(d.abs) && d.abs.length >= 1) setAbsTable(d.abs);
        }
      } catch {
        /* keep defaults */
      }
      setRatesLoaded(true);
    })();
  }, []);

  const activeHoursTable = whDayType === "6hr" ? hours6Table : hours8Table;

  const whResult = useMemo(() => {
    const defaultHourlyRate = whDayType === "6hr" ? 0.167 : 0.125;
    const hourlyRate = Number(
      activeHoursTable.find((h) => h.rate_value === 1)?.decimal_equivalent ??
        defaultHourlyRate,
    );
    const hEntry = activeHoursTable.find((h) => h.rate_value === whHours);
    const mEntry = minutesTable.find((m) => m.rate_value === whMinutes);
    const hDec =
      whHours === 0
        ? 0
        : Number(
            (hEntry?.decimal_equivalent ?? whHours * hourlyRate).toFixed(3),
          );
    const mDec = whMinutes === 0 ? 0 : (mEntry?.decimal_equivalent ?? 0);
    return { hDec, mDec, total: Number((hDec + mDec).toFixed(3)) };
  }, [whHours, whMinutes, whDayType, activeHoursTable, minutesTable]);

  const reverseConvertLocal = useCallback(
    (totalDecimal) => {
      const defaultRate = whDayType === "6hr" ? 0.167 : 0.125;
      let bestH = 0,
        bestM = 0,
        bestDiff = Infinity;
      for (let h = 0; h <= 8; h++) {
        const hEntry =
          h === 0 ? null : activeHoursTable.find((r) => r.rate_value === h);
        const hDec =
          h === 0
            ? 0
            : Number(
                (hEntry?.decimal_equivalent ?? h * defaultRate).toFixed(3),
              );
        const remainder = Number((totalDecimal - hDec).toFixed(4));
        if (remainder < -0.0015) continue;
        if (remainder <= 0.0015) {
          const diff = Math.abs(remainder);
          if (diff < bestDiff) {
            bestH = h;
            bestM = 0;
            bestDiff = diff;
          }
        } else {
          const mEntry = minutesTable.reduce((best, r) => {
            const d = Math.abs(r.decimal_equivalent - remainder);
            return best === null ||
              d < Math.abs(best.decimal_equivalent - remainder)
              ? r
              : best;
          }, null);
          if (mEntry) {
            const diff = Math.abs(mEntry.decimal_equivalent - remainder);
            if (diff < bestDiff) {
              bestH = h;
              bestM = mEntry.rate_value;
              bestDiff = diff;
            }
          }
        }
      }
      return { hours: bestH, minutes: bestM };
    },
    [whDayType, activeHoursTable, minutesTable],
  );

  const revTotal = parseFloat(revInput) || 0;
  const revResult = useMemo(
    () =>
      whMode === "reverse"
        ? reverseConvertLocal(revTotal)
        : { hours: 0, minutes: 0 },
    [whMode, revTotal, reverseConvertLocal],
  );

  const lcResult = useMemo(() => {
    const daysEntry = lwpTable.find((r) => r.d === lcDays);
    const earned = daysEntry
      ? daysEntry.e
      : parseFloat((lcDays * 0.04167).toFixed(3));
    const absEntry =
      lcAbs > 0 ? absTable.find((r) => Math.abs(r.a - lcAbs) < 0.001) : null;
    const absEarned = absEntry ? absEntry.e : earned;
    return { earned, absEarned };
  }, [lcDays, lcAbs, lwpTable, absTable]);

  const inputLabelSx = {
    fontSize: "0.62rem",
    fontWeight: 700,
    color: alpha(T.accent, 0.45),
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    mb: 0.5,
    fontFamily: T.poppins,
    display: "block",
  };
  const inputStyle = {
    width: "100%",
    height: 34,
    borderRadius: 7,
    fontSize: "0.82rem",
    fontWeight: 700,
    color: T.text,
    padding: "6px 10px",
    border: `1px solid rgba(109,35,35,0.14)`,
    outline: "none",
    backgroundColor: "#fff",
    fontFamily: T.poppins,
    boxSizing: "border-box",
  };
  const toggleGroupSx = {
    "& .MuiToggleButton-root": {
      px: 1.1,
      py: 0.2,
      border: `1px solid rgba(109,35,35,0.14)`,
      fontSize: "0.62rem",
      fontWeight: 700,
      color: T.muted,
      fontFamily: T.poppins,
      minHeight: 26,
      "&.Mui-selected": {
        bgcolor: T.accent,
        color: "#fff",
        borderColor: T.accent,
      },
    },
  };
  const dayTypeToggleSx = {
    "& .MuiToggleButton-root": {
      px: 1.25,
      py: 0.2,
      border: `1px solid rgba(109,35,35,0.14)`,
      fontSize: "0.68rem",
      fontWeight: 700,
      color: T.muted,
      fontFamily: T.poppins,
      minHeight: 26,
      "&.Mui-selected": {
        bgcolor: T.accent,
        color: "#fff",
        borderColor: T.accent,
      },
    },
  };

  return (
    <>
      <Tooltip title="Quick Conversion Tool" placement="left">
        <Box
          onClick={() => setOpen((v) => !v)}
          sx={{
            position: "fixed",
            bottom: 60,
            right: 10,
            zIndex: 9999,
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: open ? T.accentDark : T.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${alpha(T.accent, 0.45)}`,
            transition: "all 0.2s ease",
            "&:hover": { bgcolor: T.accentDark, transform: "scale(1.08)" },
          }}
        >
          {open ? (
            <Close sx={{ fontSize: 20 }} />
          ) : (
            <CalculateIcon sx={{ fontSize: 22 }} />
          )}
        </Box>
      </Tooltip>
      <Collapse in={open} timeout={200}>
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            bottom: 125,
            right: 32,
            zIndex: 9998,
            width: 310,
            borderRadius: "12px",
            border: `1px solid rgba(109,35,35,0.14)`,
            boxShadow: `0 8px 32px ${alpha(T.accent, 0.18)}, 0 2px 8px rgba(0,0,0,0.08)`,
            overflow: "hidden",
            fontFamily: T.poppins,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              background: T.headerGrad,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ConvertIcon
                sx={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }}
              />
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: T.poppins,
                }}
              >
                Quick Converter
              </Typography>
              {!ratesLoaded && (
                <CircularProgress
                  size={10}
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                />
              )}
            </Box>
            <Button
              onClick={() => {
                window.location.href = "/working-hours";
              }}
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.75)",
                textTransform: "none",
                fontFamily: T.poppins,
                px: 1,
                py: 0.25,
                borderRadius: "5px",
                minWidth: 0,
                border: "1px solid rgba(255,255,255,0.25)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)", color: "#fff" },
              }}
            >
              View Tables
            </Button>
          </Box>
          <Box
            sx={{
              borderBottom: `1px solid rgba(109,35,35,0.14)`,
              bgcolor: "rgba(109,35,35,0.06)",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="fullWidth"
              sx={{
                minHeight: 36,
                "& .MuiTab-root": {
                  minHeight: 36,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "none",
                  fontFamily: T.poppins,
                  color: T.muted,
                  py: 0,
                  "&.Mui-selected": { color: T.accent },
                },
                "& .MuiTabs-indicator": { bgcolor: T.accent, height: 2 },
              }}
            >
              <Tab label="Working Hours" />
              <Tab label="Leave Credits" />
            </Tabs>
          </Box>
          <Box
            sx={{
              display: activeTab === 0 ? "flex" : "none",
              p: 1.75,
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 0.75,
                flexWrap: "wrap",
              }}
            >
              <ToggleButtonGroup
                value={whDayType}
                exclusive
                onChange={(_, v) => v && setWhDayType(v)}
                size="small"
                sx={dayTypeToggleSx}
              >
                <ToggleButton value="8hr">8-hr</ToggleButton>
                <ToggleButton value="6hr">6-hr</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={whMode}
                exclusive
                onChange={(_, v) => v && setWhMode(v)}
                size="small"
                sx={toggleGroupSx}
              >
                <ToggleButton value="forward">H:M → Dec</ToggleButton>
                <ToggleButton value="reverse">Dec → H:M</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {whMode === "forward" && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={inputLabelSx}>Hours</Typography>
                    <ClearableIntField
                      value={whHours}
                      onChange={setWhHours}
                      placeholder="0"
                      min={0}
                      widgetInputSx={{ __raw: inputStyle }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={inputLabelSx}>Minutes (0–59)</Typography>
                    <ClearableIntField
                      value={whMinutes}
                      onChange={setWhMinutes}
                      placeholder="0"
                      min={0}
                      max={59}
                      widgetInputSx={{ __raw: inputStyle }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  <ResultPill
                    label="Hours"
                    value={Number(whResult.hDec).toFixed(3)}
                  />
                  <ResultPill
                    label="Total"
                    value={whResult.total.toFixed(3)}
                    primary
                  />
                  <ResultPill
                    label="Mins."
                    value={Number(whResult.mDec).toFixed(3)}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    p: "6px 10px",
                    borderRadius: "7px",
                    bgcolor: "rgba(109,35,35,0.06)",
                    border: `1px solid rgba(109,35,35,0.14)`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.68rem",
                      color: T.muted,
                      fontWeight: 600,
                      fontFamily: T.poppins,
                    }}
                  >
                    Equivalent:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: T.accent,
                      fontFamily: T.poppins,
                    }}
                  >
                    {whHours}h {whMinutes}m = {whResult.total.toFixed(3)}
                  </Typography>
                  <Chip
                    label={whDayType}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      bgcolor: T.accent,
                      color: "#fff",
                      fontFamily: T.poppins,
                    }}
                  />
                </Box>
              </>
            )}
            {whMode === "reverse" && (
              <>
                <Box>
                  <Typography sx={inputLabelSx}>
                    Decimal total (e.g. 0.875)
                  </Typography>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.000"
                    value={revDraft !== null ? revDraft : revInput}
                    onChange={(e) => {
                      setRevDraft(e.target.value);
                      const n = parseFloat(e.target.value);
                      if (Number.isFinite(n) && n >= 0) setRevInput(String(n));
                    }}
                    onFocus={() => setRevDraft(revInput)}
                    onBlur={() => {
                      const n = parseFloat(revDraft ?? "");
                      setRevInput(
                        Number.isFinite(n) && n >= 0 ? String(n) : "",
                      );
                      setRevDraft(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 0.6 }}>
                  <ResultPill label="Hours" value={`${revResult.hours}h`} />
                  <ResultPill label="Minutes" value={`${revResult.minutes}m`} />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    p: "9px 12px",
                    borderRadius: "9px",
                    bgcolor: T.accent,
                    border: `1px solid ${T.accent}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      color: "rgba(255,255,255,0.78)",
                      fontWeight: 600,
                      fontFamily: T.poppins,
                    }}
                  >
                    Converted:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 850,
                      color: "#fff",
                      fontFamily: T.poppins,
                    }}
                  >
                    {revTotal.toFixed(3)} ≈ {revResult.hours}h{" "}
                    {revResult.minutes}m
                  </Typography>
                  <Chip
                    label={whDayType}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: "#fff",
                      color: T.accent,
                      fontFamily: T.poppins,
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
          <Box
            sx={{
              display: activeTab === 1 ? "flex" : "none",
              p: 1.75,
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
            >
              <Box>
                <Typography sx={inputLabelSx}>LWP Days (1–30)</Typography>
                <ClearableIntField
                  value={lcDays}
                  onChange={(v) => setLcDays(Math.min(30, Math.max(1, v || 1)))}
                  placeholder="1"
                  min={1}
                  max={30}
                  widgetInputSx={{ __raw: inputStyle }}
                />
              </Box>
              <Box>
                <Typography sx={inputLabelSx}>Abs w/o Pay (0–29.5)</Typography>
                <ClearableDecimalField
                  value={lcAbs}
                  onChange={setLcAbs}
                  placeholder="0"
                  min={0}
                  max={29.5}
                  step={0.5}
                  snapToStep
                  widgetInputSx={{ __raw: inputStyle }}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <ResultPill
                label="LWP Earned"
                value={lcResult.earned.toFixed(3)}
                primary
              />
              <ResultPill
                label="Abs w/o Pay Earned"
                value={lcResult.absEarned.toFixed(3)}
              />
            </Box>
            <Box
              sx={{
                p: "6px 10px",
                borderRadius: "7px",
                bgcolor: "rgba(109,35,35,0.06)",
                border: `1px solid rgba(109,35,35,0.14)`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: T.muted,
                  fontWeight: 600,
                  fontFamily: T.poppins,
                  textAlign: "center",
                }}
              >
                Earned at <strong style={{ color: T.accent }}>1.250/mo</strong>{" "}
                · Absents w/o pay reduce credits
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: "0.62rem",
                color: T.faint,
                textAlign: "center",
                fontFamily: T.poppins,
              }}
            >
              For the full absence deduction table, click{" "}
              <strong style={{ color: T.accent }}>View Tables</strong> above.
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
};

// ─── Column Header ─────────────────────────────────────────────────────────────
const ColHeader = ({ icon: Icon, label, color = T.accent, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 1.5,
      py: 1,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "rgba(0,0,0,0.02)",
      flexShrink: 0,
    }}
  >
    <Icon sx={{ fontSize: 13, color }} />
    <Typography
      sx={{
        fontSize: "0.65rem",
        fontWeight: 800,
        color,
        fontFamily: T.poppins,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        flex: 1,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

// ─── Month/Year Navigator ─────────────────────────────────────────────────────
const MonthYearNavigator = ({ year, month, onChange }) => {
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);
  const prevMonth = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };
  const yearOptions = Array.from(
    { length: 10 },
    (_, i) => now.getFullYear() - 5 + i,
  );
  const calDays = getCalendarDays(year, month);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
      }}
    >
      <FormControl size="small" sx={{ minWidth: 86 }}>
        <Select
          value={year}
          onChange={(e) => onChange(Number(e.target.value), month)}
          sx={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: T.accent,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: T.accentBorder,
            },
            bgcolor: "#fff",
            borderRadius: 2,
          }}
        >
          {yearOptions.map((y) => (
            <MenuItem
              key={y}
              value={y}
              sx={{
                fontSize: "0.8rem",
                fontWeight: y === now.getFullYear() ? 700 : 400,
              }}
            >
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <IconButton
          size="small"
          onClick={prevMonth}
          sx={{ color: T.accent, p: 0.5 }}
        >
          <PrevIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value={month}
            onChange={(e) => onChange(year, Number(e.target.value))}
            sx={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: isCurrent ? "#fff" : T.accent,
              bgcolor: isCurrent ? T.accent : "#fff",
              borderRadius: 2,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isCurrent ? T.accent : T.accentBorder,
              },
              "& .MuiSelect-icon": { color: isCurrent ? "#fff" : T.accent },
            }}
          >
            {MONTHS.map((m) => (
              <MenuItem
                key={m.value}
                value={Number(m.value)}
                sx={{ fontSize: "0.8rem" }}
              >
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          size="small"
          onClick={nextMonth}
          disabled={isFuture}
          sx={{ color: isFuture ? T.faint : T.accent, p: 0.5 }}
        >
          <NextIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      {!isCurrent && (
        <Tooltip title="Go to current month">
          <IconButton
            size="small"
            onClick={() => onChange(now.getFullYear(), now.getMonth() + 1)}
            sx={{ color: T.accent, p: 0.5 }}
          >
            <CalIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
      {isCurrent && (
        <Chip
          label="Now"
          size="small"
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            bgcolor: alpha(T.accent, 0.1),
            color: T.accent,
            border: `1px solid ${T.accentBorder}`,
          }}
        />
      )}
      <Chip
        icon={<DateRangeIcon style={{ fontSize: 11, color: "#555" }} />}
        label={`${calDays} cal. days`}
        size="small"
        sx={{
          height: 20,
          fontSize: "0.62rem",
          fontWeight: 600,
          bgcolor: "rgba(0,0,0,0.05)",
          color: "#444",
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      />
    </Box>
  );
};


const fetchAttendanceForEmployee = async (
  employeeNumber,
  year,
  month,
  token,
) => {
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const headers = { Authorization: `Bearer ${token}` };
  let earningsData = null;
  try {
    const r = await axios.get(
      `${API_BASE_URL}/api/earnings/attendance/${employeeNumber}?year=${year}&month=${month}`,
      { headers },
    );
    earningsData = r.data;
  } catch {}
  if (earningsData?.summary) return earningsData;
  const attempts = [
    { s: startOfMonth, e: endOfMonth },
    {
      s: `${year}-${String(month).padStart(2, "0")}-01`,
      e: (() => {
        const d = new Date(year, month, 5);
        return d.toISOString().split("T")[0];
      })(),
    },
  ];
  for (const { s, e } of attempts) {
    try {
      const r2 = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: { personID: employeeNumber, startDate: s, endDate: e },
          headers,
        },
      );
      const rows = r2.data?.data || (Array.isArray(r2.data) ? r2.data : []);
      if (rows.length > 0)
        return {
          ...(earningsData || {}),
          summary: rows[0],
          stats: earningsData?.stats || {},
          dailyRecords: earningsData?.dailyRecords || [],
        };
    } catch {}
  }
  return earningsData;
};

// ─── Leave Input Column ────────────────────────────────────────────────────────

const TABS = [
  { id: "leave", label: "Leaves", shortLabel: "Leave", icon: LeaveIcon },
  { id: "sc", label: "Service Credit", shortLabel: "SC", icon: SCIcon },
  {
    id: "cto",
    label: "Compensatory Time Off",
    shortLabel: "CTO",
    icon: CTOIcon,
  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const EarningsManagement = () => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deptMap, setDeptMap] = useState({});
  const [empCatMap, setEmpCatMap] = useState({});
  const [typeConfigs, setTypeConfigs] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [unit, setUnit] = useState("days");
  const [pageLoading, setPageLoading] = useState(true);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [balanceKey, setBalanceKey] = useState(0);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttLoading] = useState(false);
  const [vlReceiptRefreshKey, setVlReceiptRefreshKey] = useState(0);

  const handleMonthChange = useCallback((y, m) => {
    setPeriodYear(y);
    setPeriodMonth(m);
  }, []);
  const handleBalanceChanged = useCallback(
    () => setBalanceKey((k) => k + 1),
    [],
  );
  const handleRecordsRefresh = useCallback(
    () => setRecordsRefreshKey((k) => k + 1),
    [],
  );

  const fetchAttendance = useCallback(async () => {
    if (!selectedEmployee) {
      setAttendanceData(null);
      return;
    }
    setAttLoading(true);
    const token = localStorage.getItem("token");
    setAttendanceData(
      await fetchAttendanceForEmployee(
        selectedEmployee.employeeNumber,
        periodYear,
        periodMonth,
        token,
      ),
    );
    setAttLoading(false);
  }, [selectedEmployee, periodYear, periodMonth]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const h = { Authorization: `Bearer ${token}` };
        const [usersRes, personsRes, deptRes, empCatRes, typeConfigRes] =
          await Promise.allSettled([
            axios.get(`${API_BASE_URL}/users`, { headers: h }),
            axios.get(`${API_BASE_URL}/personalinfo/person_table`, {
              headers: h,
            }),
            axios.get(`${API_BASE_URL}/api/department-assignment`, {
              headers: h,
            }),
            axios.get(
              `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
              { headers: h },
            ),
            axios.get(
              `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`,
              { headers: h },
            ),
          ]);
        let usersData = [];
        if (usersRes.status === "fulfilled") {
          const d = usersRes.value.data;
          usersData = Array.isArray(d) ? d : d?.users || d?.data || [];
        }
        const sexMap = {};
        if (personsRes.status === "fulfilled") {
          const list = Array.isArray(personsRes.value.data)
            ? personsRes.value.data
            : personsRes.value.data?.data || [];
          list.forEach((p) => {
            const num =
              p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString();
            if (num)
              sexMap[num] = {
                firstName: p.firstName,
                middleName: p.middleName,
                lastName: p.lastName,
              };
          });
        }
        setEmployees(
          usersData.map((u) => {
            const num = u.employeeNumber?.toString();
            return { ...u, ...(num ? sexMap[num] || {} : {}) };
          }),
        );
        if (deptRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(deptRes.value.data) ? deptRes.value.data : []).forEach(
            (item) => {
              if (item.employeeNumber && item.code)
                map[String(item.employeeNumber)] = item.code;
            },
          );
          setDeptMap(map);
        }
        if (empCatRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(empCatRes.value.data)
            ? empCatRes.value.data
            : []
          ).forEach((item) => {
            if (!item.employeeNumber) return;
            const label =
              item.parentGroup && item.typeName
                ? `${item.parentGroup} | ${item.typeName}`
                : item.categoryLabel || "";
            if (label)
              map[String(item.employeeNumber)] = {
                label,
                colorHex: item.colorHex || "#757575",
                parentGroup: item.parentGroup,
                typeName: item.typeName,
              };
          });
          setEmpCatMap(map);
        }
        if (typeConfigRes.status === "fulfilled")
          setTypeConfigs(typeConfigRes.value.data?.flat || []);
      } catch (e) {
        console.error(e);
      }
      setPageLoading(false);
    })();
  }, []);

  const buildDisplayName = (e) => {
    const last = (e?.lastName || "").trim();
    const first = (e?.firstName || "").trim();
    const mid = (e?.middleName || "").trim();
    if (!last && !first)
      return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    return last
      ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(" ")}`
      : [first, mid].filter(Boolean).join(" ");
  };

  const groupedTypeConfigs = useMemo(() => {
    const g = {};
    typeConfigs
      .filter((t) => t.isActive)
      .forEach((t) => {
        if (!g[t.parentGroup]) g[t.parentGroup] = [];
        g[t.parentGroup].push(t);
      });
    return g;
  }, [typeConfigs]);

  const employeeOptions = useMemo(() => {
    let list = employees
      .map((e) => ({
        ...e,
        _displayName: buildDisplayName(e),
        _searchKey:
          `${buildDisplayName(e)} ${e.employeeNumber || ""}`.toLowerCase(),
        _sortLast: (e.lastName || "").toLowerCase(),
      }))
      .sort((a, b) => a._sortLast.localeCompare(b._sortLast));
    if (catFilter) {
      const [filterType, filterValue] = catFilter.split("||");
      list = list.filter((emp) => {
        const cat = empCatMap[String(emp.employeeNumber)];
        if (!cat) return false;
        if (filterType === "group") return cat.parentGroup === filterValue;
        const [pg, tn] = filterValue.split("|");
        return cat.parentGroup === pg && cat.typeName === tn;
      });
    }
    return list;
  }, [employees, empCatMap, catFilter]);

if (pageLoading) return <EarningsWireframe />;

  const deptCode = selectedEmployee
    ? deptMap[String(selectedEmployee.employeeNumber)]
    : null;
  const empCat = selectedEmployee
    ? empCatMap[String(selectedEmployee.employeeNumber)]
    : null;
  const sharedTabProps = {
    employee: selectedEmployee,
    deptMap,
    empCatMap,
    unit,
    year: periodYear,
    month: periodMonth,
  };

  return (
    <Box sx={{ fontFamily: T.poppins }}>
      <style>{globalCss}</style>

      {/* ── Header card ── */}
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
          pt: { xs: 2, md: 4 },
          pb: 0,
          mt: { xs: 0, md: -5 },
        }}
      >
        <SectionCard sx={{ borderRadius: "12px 12px 0 0" }}>
          {/* Gradient header */}
          <Box
            sx={{
              px: 4,
              py: 2,
              background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle,rgba(109,35,35,0.08) 0%,transparent 70%)",
              }}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  bgcolor: alpha(T.accent, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EarnIcon sx={{ fontSize: 18, color: T.accent }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.2,
                    fontFamily: T.poppins,
                  }}
                >
                  Earnings Management
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: T.accentMid,
                    fontWeight: 600,
                    fontFamily: T.poppins,
                  }}
                >
                  Earned Leave · Service Credits (SC) · Compensatory Time Off
                  (CTO)
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: T.faint,
                  fontFamily: T.poppins,
                }}
              >
                Input in:
              </Typography>
              <ToggleButtonGroup
                value={unit}
                exclusive
                onChange={(_, v) => v && setUnit(v)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    px: 1.25,
                    py: 0.25,
                    border: `1px solid ${T.accentBorder}`,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: T.muted,
                    fontFamily: T.poppins,
                    "&.Mui-selected": {
                      bgcolor: T.accent,
                      color: "#fff",
                      borderColor: T.accent,
                    },
                  },
                }}
              >
                <ToggleButton value="hours">
                  <HourIcon sx={{ fontSize: 12, mr: 0.4 }} />
                  Hours
                </ToggleButton>
                <ToggleButton value="days">
                  <DayIcon sx={{ fontSize: 12, mr: 0.4 }} />
                  Days
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Employee selector row */}
          <Box
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: T.accentFaint,
              borderBottom: `1px solid ${T.divider}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexWrap: "wrap",
              }}
            >
              <PersonIcon
                sx={{ fontSize: 14, color: T.accent, flexShrink: 0 }}
              />
              <Autocomplete
                value={selectedEmployee}
                onChange={(_, v) => setSelectedEmployee(v)}
                options={employeeOptions}
                autoHighlight
                getOptionLabel={(o) =>
                  `${o._displayName} (${o.employeeNumber})`
                }
                filterOptions={(opts, { inputValue: iv }) => {
                  const q = iv.toLowerCase().trim();
                  return (
                    !q
                      ? opts
                      : opts.filter((o) => (o._searchKey || "").includes(q))
                  ).slice(0, 80);
                }}
                isOptionEqualToValue={(o, v) =>
                  o.employeeNumber === v.employeeNumber
                }
                noOptionsText="No employees found"
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  const initials =
                    `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() ||
                    "?";
                  const dc = deptMap[option.employeeNumber?.toString()];
                  const ec = empCatMap[option.employeeNumber?.toString()];
                  return (
                    <li key={key} {...rest}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: T.accent,
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            borderRadius: "4px",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              fontFamily: T.poppins,
                              fontSize: "0.8rem",
                            }}
                          >
                            {option._displayName}
                          </Typography>
                          <Box
                            sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: T.faint, fontFamily: T.poppins }}
                            >
                              #{option.employeeNumber}
                            </Typography>
                            {dc && <DeptBadge code={dc} />}
                            {ec && (
                              <EmpCatBadge
                                label={ec.label}
                                colorHex={ec.colorHex}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <FieldInput
                    {...params}
                    size="small"
                    placeholder="Search employee by name or number…"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#fff",
                        borderRadius: 2,
                      },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon
                            sx={{ fontSize: 14, color: T.muted, mr: 0.4 }}
                          />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: 2,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                      border: `1px solid ${T.accentBorder}`,
                    },
                  },
                }}
                sx={{ flex: 1, maxWidth: 340 }}
              />
              {/* Category filter */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <FilterIcon sx={{ fontSize: 13, color: T.accent }} />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={catFilter}
                    onChange={(e) => {
                      setCatFilter(e.target.value);
                      setSelectedEmployee(null);
                    }}
                    displayEmpty
                    sx={{
                      fontSize: "0.76rem",
                      bgcolor: "#fff",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: catFilter ? T.accent : T.accentBorder,
                      },
                      color: catFilter ? T.accent : T.faint,
                      fontWeight: catFilter ? 700 : 400,
                    }}
                    renderValue={(val) => {
                      if (!val)
                        return (
                          <Typography
                            sx={{ fontSize: "0.76rem", color: T.faint }}
                          >
                            All Categories
                          </Typography>
                        );
                      const [ft, fv] = val.split("||");
                      if (ft === "group")
                        return (
                          <Typography
                            sx={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: T.accent,
                            }}
                          >
                            {fv}
                          </Typography>
                        );
                      const [, tn] = fv.split("|");
                      return (
                        <Typography
                          sx={{
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            color: T.accent,
                          }}
                        >
                          {tn}
                        </Typography>
                      );
                    }}
                  >
                    <MenuItem value="">
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                        All Categories
                      </Typography>
                    </MenuItem>
                    {Object.entries(groupedTypeConfigs).flatMap(
                      ([group, items]) => [
                        <MenuItem
                          key={`gh-${group}`}
                          value={`group||${group}`}
                          sx={{ py: 0.6, bgcolor: alpha(T.accent, 0.04) }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: T.accent,
                            }}
                          >
                            {group} (all)
                          </Typography>
                        </MenuItem>,
                        ...items.map((item) => (
                          <MenuItem
                            key={`t-${item.id}`}
                            value={`type||${item.parentGroup}|${item.typeName}`}
                            sx={{ py: 0.4, pl: 3 }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.6,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: item.colorHex,
                                }}
                              />
                              <Typography sx={{ fontSize: "0.76rem" }}>
                                {item.typeName}
                              </Typography>
                            </Box>
                          </MenuItem>
                        )),
                      ],
                    )}
                  </Select>
                </FormControl>
                {catFilter && (
                  <Tooltip title="Clear filter">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCatFilter("");
                        setSelectedEmployee(null);
                      }}
                      sx={{ p: 0.3, color: T.accent }}
                    >
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {/* Month/Year Navigator */}
              <Box sx={{ ml: "auto" }}>
                <MonthYearNavigator
                  year={periodYear}
                  month={periodMonth}
                  onChange={handleMonthChange}
                />
              </Box>
              {/* Selected employee chip */}
              {selectedEmployee && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    pl: 1,
                    borderLeft: `1px solid ${T.divider}`,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: T.accent,
                      fontSize: "0.58rem",
                      fontWeight: 800,
                      borderRadius: "4px",
                    }}
                  >
                    {`${selectedEmployee.lastName?.[0] || ""}${selectedEmployee.firstName?.[0] || ""}`.toUpperCase() ||
                      "?"}
                  </Avatar>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: T.text,
                        fontFamily: T.poppins,
                        lineHeight: 1,
                      }}
                    >
                      {`${(selectedEmployee.lastName || "").toUpperCase()}, ${selectedEmployee.firstName || ""}`.trim()}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.35 }}>
                      {deptCode && <DeptBadge code={deptCode} />}
                      {empCat && (
                        <EmpCatBadge
                          label={empCat.label}
                          colorHex={empCat.colorHex}
                        />
                      )}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedEmployee(null)}
                    sx={{
                      color: T.faint,
                      p: 0.2,
                      "&:hover": { color: T.accent },
                    }}
                  >
                    <Close sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              )}
            </Box>
            {catFilter && (
              <Typography
                sx={{
                  mt: 0.6,
                  fontSize: "0.66rem",
                  color: T.muted,
                  fontFamily: T.poppins,
                }}
              >
                Showing {employeeOptions.length} employee
                {employeeOptions.length !== 1 ? "s" : ""} in selected category
              </Typography>
            )}
          </Box>

          {/* Tab row */}
          <Box
            sx={{
              background: T.headerGrad,
              px: { xs: 0, sm: 1 },
              pt: 0.75,
              pb: 0,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            {TABS.map((t, idx) => {
              const Icon = t.icon;
              const isActive = idx === activeTab;
              return (
                <Box
                  key={t.id}
                  onClick={() => setActiveTab(idx)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: { xs: 1.5, sm: 2.5 },
                    py: 0.85,
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: "8px 8px 0 0",
                    transition: "background 0.15s",
                    bgcolor: isActive
                      ? "rgba(255,255,255,0.97)"
                      : "transparent",
                    "&:hover": isActive
                      ? {}
                      : { bgcolor: "rgba(255,255,255,0.1)" },
                    "&::after": isActive
                      ? {
                          content: '""',
                          position: "absolute",
                          bottom: -1,
                          left: 0,
                          right: 0,
                          height: 2,
                          bgcolor: "rgba(255,255,255,0.97)",
                        }
                      : {},
                  }}
                >
                  <Icon
                    sx={{
                      fontSize: 13,
                      color: isActive ? T.accent : "rgba(255,255,255,0.6)",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.73rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.accent : "rgba(255,255,255,0.7)",
                      fontFamily: T.poppins,
                      whiteSpace: "nowrap",
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    {t.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.73rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.accent : "rgba(255,255,255,0.7)",
                      fontFamily: T.poppins,
                      whiteSpace: "nowrap",
                      display: { xs: "block", sm: "none" },
                    }}
                  >
                    {t.shortLabel}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      </Box>

      {/* ── 3-Column Content ── */}
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
          pb: 4,
        }}
      >
        <SectionCard sx={{ borderRadius: "0 0 12px 12px", borderTop: "none" }}>
          <Fade
            in
            key={`${activeTab}-${periodYear}-${periodMonth}`}
            timeout={250}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                height: "calc(100vh - 340px)",
                minHeight: 480,
                overflow: "hidden",
              }}
            >
              {/* Column 1: Attendance */}
              <Box
                sx={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
      <AttendanceSummary
  employee={selectedEmployee}
  year={periodYear}
  month={periodMonth}
  attendanceData={attendanceData}
  attendanceLoading={attendanceLoading}
  onRefresh={fetchAttendance}
  onRecordsRefresh={handleRecordsRefresh}
  empCat={empCat}
  vlReceiptRefreshKey={vlReceiptRefreshKey}
  balanceRefreshKey={balanceKey}   // ← add this
/>
              </Box>
              {/* Column 2: Input Earnings */}
              <Box
                sx={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {activeTab === 0 && (
                  <LeaveInputColumn
                    {...sharedTabProps}
                    onBalanceChanged={handleBalanceChanged}
                    refreshKey={balanceKey}
                    onRecordsRefresh={handleRecordsRefresh}
                  />
                )}
                {activeTab === 1 && (
                  <SCInputColumn
                    {...sharedTabProps}
                    onRecordsRefresh={handleRecordsRefresh}
                  />
                )}
                {activeTab === 2 && (
                  <CTOInputColumn
                    {...sharedTabProps}
                    onRecordsRefresh={handleRecordsRefresh}
                  />
                )}
              </Box>
              {/* Column 3: Records Earnings*/}
              <Box
                sx={{
                  borderRight: `1px solid ${T.divider}`,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <RecordsList
                  employeeNumber={selectedEmployee?.employeeNumber}
                  type={TABS[activeTab].id}
                  unit={unit}
                  refreshKey={recordsRefreshKey}
                  year={periodYear}
                  month={periodMonth}
                  onApproved={handleBalanceChanged}
                  standalone
                  onStatusChange={() => setVlReceiptRefreshKey((k) => k + 1)}
                />
              </Box>
            </Box>
          </Fade>
        </SectionCard>
      </Box>

      <FloatingConversionWidget />
    </Box>
  );
};

export default EarningsManagement;