import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  Avatar,
  IconButton,
  Fade,
  alpha,
  Chip,
  styled,
  CircularProgress,
  Select,
  MenuItem,
  ListSubheader,
  Dialog,
  Drawer,
  Checkbox,
  Tooltip,
  TextField,
  InputAdornment,
  Grid,
  Button,
} from '@mui/material';
import {
  Summarize,
  SummarizeOutlined,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Person,
  CalendarToday,
  Refresh,
  ViewColumn,
  Assignment,
  Groups as GroupsIcon,
  ChevronRight as ChevronRightIcon,
  Search,
  Business as BusinessIcon,
  CategoryOutlined as CategoryIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import {
  ATTENDANCE_COMPACT_PAGE_SX,
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterYearQuickRow,
  AttendanceFilterMonthHeader,
  AttendanceFilterMonthGrid,
  AttendanceFilterSummaryBox,
  AttendanceFilterToggleRow,
  applyQuickDateRange,
  filterCompactSelectSx,
  filterSidebarCardSx,
  filterPanelScrollSx,
  attendanceMainPanelHeightSx,
} from './attendanceFilterLayout';
import {
  classifyRecordsForPayroll,
  employmentCategoryLabel as payrollCategoryLabel,
  recordEmployeeNumber,
} from '../../utils/regularPayrollFromAttendance';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import {
  useCRUDButtonStyles,
  useCRUDButtonStylesOutlined,
} from '../../hooks/useCRUDButtonStyles';
import usePageAccess from '../../hooks/usePageAccess';
import useAttendanceRealtimeRefresh from '../../hooks/useAttendanceRealtimeRefresh';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import AttendanceRosterSidebar, { pad2, rosterDisplayName } from './AttendanceRosterSidebar';
import { resolveAttendanceModuleFromEmployment } from '../../utils/earningsEmpCatRules';
import DepartmentAutocomplete from '../shared/DepartmentAutocomplete';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  page:         '#f7f3f2',
  divider:      'rgba(0,0,0,0.08)',
  // Status tokens shared with AttendanceRosterSidebar and the table pills.
  tardiness:    { bg: 'rgba(153,27,27,0.08)',  color: '#991b1b', border: 'rgba(153,27,27,0.25)' },
  rendered:     { bg: 'rgba(21,128,61,0.09)',  color: '#166534', border: 'rgba(21,128,61,0.4)'  },
  absent:       { bg: 'rgba(106,27,154,0.10)', color: '#6a1b9a', border: 'rgba(106,27,154,0.30)' },
  halfDay:      { bg: 'rgba(139,94,0,0.09)',   color: '#8B5E00', border: 'rgba(139,94,0,0.3)'    },
  holiday:      { bg: 'rgba(245,124,0,0.10)',  color: '#f57c00', border: 'rgba(245,124,0,0.3)'   },
  leave:        { bg: 'rgba(46,125,50,0.10)',  color: '#2e7d32', border: 'rgba(46,125,50,0.3)'    },
  suspended:    { bg: 'rgba(211,47,47,0.10)',  color: '#d32f2f', border: 'rgba(211,47,47,0.3)'    },
};

// ─── Layout constants ─────────────────────────────────────────────────────────
// Mirrors AttendanceDevice.jsx so the two attendance pages read as one system:
// 12px cards, a light hairline, and the same soft shadow.
const R = { card: '12px', panel: '10px', control: '8px', pill: 999 };
const SHADOW_CARD = '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)';
const HAIRLINE = '0.5px solid rgba(0,0,0,0.09)';
const NAME_COL_W = 250;
const ACTIONS_COL_W = 170;
// Light panel header tint, shared by the filter panel and the page header.
const PANEL_HEADER_BG = 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)';
// Compact text/date field — same size as the shared filter selects.
const compactFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '6px', fontSize: '0.74rem', bgcolor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: '1.5px' },
  },
  '& .MuiOutlinedInput-input': { py: '6px', px: 1 },
};
// Outlined accent button — same as the Excel/Print buttons on Attendance State.
const outlinedBtnSx = {
  textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: '6px',
  color: T.accent, borderColor: alpha(T.accent, 0.35), bgcolor: '#fff', boxShadow: 'none',
  '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent },
};
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Page-level CSS (animations + keyboard focus) ─────────────────────────────
const pageCss = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
.oa-btn:focus-visible {
  outline: 2px solid ${T.accent};
  outline-offset: 2px;
}
.oa-input:focus {
  border-color: ${T.accent} !important;
  box-shadow: 0 0 0 3px rgba(109,35,35,0.18);
}
@media (prefers-reduced-motion: reduce) {
  .oa-anim { animation: none !important; }
}`;

// ─── Small helpers ────────────────────────────────────────────────────────────
const getInitials = (name) => {
  const parts = String(name || '')
    .replace(/[^A-Za-z\s,.-]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length === 0) return '#';
  return (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
};

const hasValue = (v) => v != null && String(v).trim() !== '';
const hasNonZeroTime = (v) => hasValue(v) && /[1-9]/.test(String(v));

const monthRange = (year, monthIndex) => ({
  start: new Date(Date.UTC(year, monthIndex, 1)).toISOString().substring(0, 10),
  end:   new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().substring(0, 10),
});

// ─── Employment category helpers ─────────────────────────────────────────────
// `resolveAttendanceModuleFromEmployment` is the single source of truth for the
// module mapping — reused here rather than reimplemented.
const MODULE_LABELS = {
  DESIGNATED_40HRS: 'Faculty · 40 hrs (Designated)',
  FACULTY_30HRS:    'Faculty · 30 hrs',
  NON_TEACHING:     'Non-Teaching / Job Order',
};
const UNCLASSIFIED_LABEL = 'Other / Unclassified';
const MODULE_ORDER = ['DESIGNATED_40HRS', 'FACULTY_30HRS', 'NON_TEACHING'];

/** Picker value namespace so a module bucket and a category never collide. */
const CAT_TOKEN = {
  module:   (k) => `M:${k}`,
  unclass:  'U',
  category: (label) => `C:${label}`,
};

/** Human label for a resolved module key, including the unclassified bucket. */
const moduleLabel = (key) => (key && MODULE_LABELS[key]) || UNCLASSIFIED_LABEL;

// ─── Shimmer bone ─────────────────────────────────────────────────────────────
// Single light variant — the page no longer has dark surfaces to sit on.
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box className="oa-anim" sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

// ─── Wireframe skeleton (mirrors the real layout: header · filter · records) ──
const OverallAttendanceWireframe = () => (
  <>
    <style>{pageCss}</style>
    <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
      <Box className="oa-anim" sx={{ borderRadius: R.card, overflow: 'hidden', border: HAIRLINE, bgcolor: '#fff', boxShadow: SHADOW_CARD, mb: 2, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: PANEL_HEADER_BG, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: R.panel, bgcolor: T.accentFaint }} />
            <Box><Bone w={230} h={18} sx={{ mb: 1 }} /><Bone w={300} h={10} /></Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.25 }}><Bone w={120} h={32} r={6} /><Bone w={36} h={36} r={18} /></Box>
        </Box>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={3}>
          <Box className="oa-anim" sx={{ borderRadius: R.card, overflow: 'hidden', border: HAIRLINE, bgcolor: '#fff', boxShadow: SHADOW_CARD, height: { xs: 480, lg: 'calc(100vh - 280px)' }, animation: 'blink 2s ease-in-out 0.1s infinite' }}>
            <Box sx={{ px: 2, py: 1, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}><Bone w={110} h={10} /></Box>
            <Box sx={{ px: 2, py: 1.25 }}>
              <Box sx={{ display: 'flex', gap: '6px', mb: 1.25 }}>
                <Box sx={{ flex: 1, height: 28, borderRadius: '6px', border: `1px solid ${T.accentBorder}` }} />
                <Box sx={{ flex: 1, height: 28, borderRadius: '6px', border: `1px solid ${T.accentBorder}` }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', mb: 1.5 }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Box key={i} sx={{ height: 26, borderRadius: '5px', border: `1px solid ${T.accentBorder}` }} />
                ))}
              </Box>
              {[0, 1, 2, 3].map((i) => (
                <Box key={i} sx={{ mb: 1.25 }}>
                  <Bone w={80} h={8} sx={{ mb: 0.75 }} />
                  <Box sx={{ height: 30, borderRadius: '6px', border: `1px solid ${T.accentBorder}` }} />
                </Box>
              ))}
              <Box sx={{ height: 30, borderRadius: '6px', bgcolor: T.accent, opacity: 0.85 }} />
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} lg={9}>
          <Box className="oa-anim" sx={{ borderRadius: R.card, overflow: 'hidden', border: HAIRLINE, bgcolor: '#fff', boxShadow: SHADOW_CARD, height: { xs: 480, lg: 'calc(100vh - 280px)' }, animation: 'blink 2s ease-in-out 0.2s infinite' }}>
            <Box sx={{ px: 3, py: 2, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'flex', justifyContent: 'space-between' }}>
              <Bone w={170} h={14} /><Bone w={260} h={28} r={6} />
            </Box>
            <Box sx={{ px: 2.5, py: 1.4, bgcolor: T.accent, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 2 }}>
              {[0, 1, 2, 3, 4].map((i) => <Box key={i} sx={{ height: 8, width: 70, borderRadius: 4, bgcolor: alpha('#fff', 0.35) }} />)}
            </Box>
            {[...Array(6)].map((_, i) => (
              <Box key={i} sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 2, alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: T.accentFaint }} /><Bone w={120} h={12} />
                </Box>
                <Bone w={70} h={22} r={11} /><Bone w={70} h={12} /><Bone w={70} h={12} /><Bone w={70} h={22} r={8} />
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});





const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    className="oa-btn"
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: `1px solid ${color}40`,
      borderRadius: '8px',
      padding: '6px 12px',
      cursor: disabled ? 'default' : 'pointer',
      color,
      display: 'flex', alignItems: 'center', gap: '5px',
      fontSize: '0.74rem', fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background-color 0.15s, border-color 0.15s',
      whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; }}}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

// Row action button with its icon and a visible word (Edit / Delete / Save / Cancel).
const IconAction = ({ icon, label, onClick, color, hoverBg }) => (
  <button
    className="oa-btn"
    aria-label={label}
    onClick={onClick}
    style={{
      height: 28, padding: '0 10px', borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
      background: 'transparent', color,
      border: `1px solid ${color}40`,
      cursor: 'pointer', fontFamily: 'inherit',
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
      transition: 'background-color 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

const PrimaryBtn = ({ icon, label, onClick, disabled = false }) => (
  <button
    className="oa-btn"
    onClick={onClick}
    disabled={disabled}
    style={{
      background: T.accent,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontWeight: 700,
      fontSize: '0.8rem',
      fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      boxShadow: disabled ? 'none' : `0 8px 16px -10px ${alpha(T.accent, 0.8)}`,
      transition: 'background 0.15s',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = T.accentDark; }}
    onMouseLeave={e => { e.currentTarget.style.background = T.accent; }}
  >
    {icon}{label}
  </button>
);




// One figure in the summary strip: number first, label under it.
// Trailing head-count shown on each employment-category option. Right-aligned
// so a long category name truncates instead of pushing the number off-row.
const CategoryCount = ({ count }) => (
  <Box
    component="span"
    sx={{
      flexShrink: 0,
      minWidth: 22,
      textAlign: 'center',
      px: 0.6,
      py: 0.1,
      borderRadius: 999,
      fontSize: '0.68rem',
      fontWeight: 800,
      fontVariantNumeric: 'tabular-nums',
      color: T.accent,
      bgcolor: T.accentFaint,
      border: `1px solid ${T.accentBorder}`,
    }}
  >
    {count}
  </Box>
);


// ─── Shared dialog header ─────────────────────────────────────────────────────
const DialogHeader = ({ icon, accentColor, title, chipLabel, onClose }) => (
  <Box sx={{
    position: 'relative',
    px: 3, py: 2.25,
    bgcolor: '#fff',
    borderBottom: `1px solid ${T.divider}`,
    borderLeft: `5px solid ${accentColor}`,
  }}>
    <IconButton
      size="small"
      onClick={onClose}
      aria-label="Close dialog"
      sx={{ position: 'absolute', top: 12, right: 12, color: T.muted, '&:hover': { bgcolor: T.accentFaint } }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 4 }}>
      <Avatar variant="rounded" sx={{ bgcolor: T.accentFaint, width: 44, height: 44, borderRadius: R.panel, border: `1px solid ${T.accentBorder}` }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', color: T.text, lineHeight: 1.25 }}>{title}</Typography>
          <Chip label={chipLabel} size="small" sx={{ bgcolor: alpha(accentColor, 0.1), color: accentColor, fontWeight: 700, fontSize: '0.66rem', height: 20, borderRadius: '6px' }} />
        </Box>
        <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Typography>
      </Box>
    </Box>
  </Box>
);

const dialogPaperSx = { borderRadius: '14px', overflow: 'hidden', border: HAIRLINE, bgcolor: '#fff', boxShadow: '0 30px 70px -20px rgba(40,10,10,0.45)' };

// ─── Styled Modal ─────────────────────────────────────────────────────────────
const StyledModal = ({ open, onClose, title, message, type = 'info', onConfirm, showCancel = false }) => {
  const typeConfig = {
    success: { icon: <CheckCircleIcon sx={{ fontSize: 26, color: '#2e7d32' }} />, avatarBg: 'rgba(46,125,50,0.12)', label: 'Success', labelColor: '#2e7d32' },
    warning: { icon: <WarningIcon sx={{ fontSize: 26, color: '#92400e' }} />,      avatarBg: 'rgba(146,64,14,0.12)',  label: 'Warning', labelColor: '#92400e' },
    error:   { icon: <ErrorIcon sx={{ fontSize: 26, color: '#991b1b' }} />,        avatarBg: 'rgba(153,27,27,0.12)', label: 'Error',   labelColor: '#991b1b' },
    info:    { icon: <InfoIcon sx={{ fontSize: 26, color: T.accent }} />,          avatarBg: T.accentFaint,          label: 'Notice',  labelColor: T.accent },
  };
  const cfg = typeConfig[type] || typeConfig.info;
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const isListItem = (l) => l.startsWith('•') || l.startsWith('-') || /^\d{5,}/.test(l) || /^Employee\s+\d/.test(l);
  const isNote = (l) => /^(contact|please|this action|note:|important)/i.test(l);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogHeader
        icon={cfg.icon}
        accentColor={cfg.labelColor}
        title={title}
        chipLabel={cfg.label}
        onClose={onClose}
      />
      <Box sx={{ px: 3, py: 2.5, maxHeight: '55vh', overflowY: 'auto' }}>
        {lines.map((line, i) => {
          if (isListItem(line)) {
            const clean = line.replace(/^[•\-]\s*/, '');
            const [empPart, ...rest] = clean.split(':');
            return (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, px: 1.5, py: 1, borderRadius: R.panel, bgcolor: T.page, border: `1px solid ${T.accentBorder}` }}>
                <Box sx={{ width: 30, height: 30, borderRadius: R.control, flexShrink: 0, bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Person sx={{ fontSize: 15, color: T.accent, opacity: 0.75 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.25 }}>{empPart?.trim()}</Typography>
                  {rest.length > 0 && <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 500, mt: 0.1 }}>{rest.join(':').trim()}</Typography>}
                </Box>
              </Box>
            );
          }
          if (isNote(line)) {
            return (
              <Box key={i} sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: R.panel, bgcolor: T.accentFaint, borderLeft: `4px solid ${alpha(T.accent, 0.5)}`, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 14, color: T.accent, opacity: 0.65, mt: 0.25, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 600, lineHeight: 1.65 }}>{line}</Typography>
              </Box>
            );
          }
          return (
            <Typography key={i} sx={{ fontSize: '0.88rem', color: T.muted, lineHeight: 1.75, fontWeight: 500, mb: i < lines.length - 1 ? 1 : 0 }}>{line}</Typography>
          );
        })}
      </Box>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${T.divider}`, bgcolor: T.page }}>
        {showCancel && (
          <RowBtn icon={null} label="Cancel" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={onClose} />
        )}
        <PrimaryBtn label={showCancel ? 'Confirm' : 'OK'} onClick={onConfirm || onClose} />
      </Box>
    </Dialog>
  );
};

// ─── Payroll Confirmation Dialog ──────────────────────────────────────────────
const PayrollConfirmDialog = ({
  open, onClose, onConfirm, title, subtitle, recordCount, recordLabel, isSubmitting,
  /** Records that will NOT be submitted (other payroll type / no category). */
  excludedCount = 0,
  excludedNote = '',
  /** Categories still being checked — counts are not final yet. */
  checking = false,
}) => {
  const nothingToSubmit = !checking && recordCount === 0;
  const [checked, setChecked] = useState(false);
  useEffect(() => { if (!open) setChecked(false); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogHeader
        icon={<Assignment sx={{ fontSize: 22, color: T.accent }} />}
        accentColor={T.accent}
        title={title}
        chipLabel="Confirmation"
        onClose={onClose}
      />
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: '0.88rem', color: T.muted, lineHeight: 1.75, fontWeight: 500, mb: 2 }}>
          {subtitle || 'The following records are pending submission. Verify all entries are accurate before proceeding.'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, px: 1.75, py: 1.25, borderRadius: R.panel, bgcolor: T.page, border: `1px solid ${T.accentBorder}` }}>
          <Box sx={{ width: 34, height: 34, borderRadius: R.control, flexShrink: 0, bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Assignment sx={{ fontSize: 17, color: T.accent }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, lineHeight: 1.3 }}>Records for submission</Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: T.text, lineHeight: 1.25 }}>
              {checking
                ? 'Checking employment categories…'
                : `${recordCount} ${recordCount === 1 ? 'Record' : 'Records'} — ${recordLabel}`}
            </Typography>
            {!checking && excludedCount > 0 && (
              <Typography sx={{ fontSize: '0.72rem', color: '#9a6700', fontWeight: 600, mt: 0.3 }}>
                {excludedCount} excluded — {excludedNote}
              </Typography>
            )}
          </Box>
        </Box>
        {nothingToSubmit && (
          <Box sx={{ mb: 2, px: 1.75, py: 1.25, borderRadius: R.panel, bgcolor: 'rgba(154,103,0,0.07)', border: '1px solid rgba(154,103,0,0.25)' }}>
            <Typography sx={{ fontSize: '0.78rem', color: '#7a5200', fontWeight: 600, lineHeight: 1.5 }}>
              None of the loaded employees can be submitted here. {excludedNote}
            </Typography>
          </Box>
        )}
        <Box
          onClick={() => setChecked(p => !p)}
          sx={{
            p: 2, borderRadius: R.panel, cursor: 'pointer',
            border: `2px solid ${checked ? T.accent : T.accentBorder}`,
            bgcolor: checked ? T.accentFaint : '#fff',
            display: 'flex', alignItems: 'flex-start', gap: 1,
            transition: 'all 0.18s ease',
          }}
        >
          <Checkbox
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            onClick={e => e.stopPropagation()}
            size="small"
            sx={{ color: alpha(T.accent, 0.4), '&.Mui-checked': { color: T.accent }, mt: -0.4, p: 0.4 }}
          />
          <Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, mb: 0.3, lineHeight: 1.3 }}>
              I confirm all records have been reviewed and are accurate.
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 500, lineHeight: 1.55 }}>
              This action will submit the records to payroll processing and cannot be undone.
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: `1px solid ${T.divider}`, bgcolor: T.page }}>
        <RowBtn icon={null} label="Cancel" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={onClose} />
        <button
          className="oa-btn"
          disabled={!checked || isSubmitting || checking || nothingToSubmit}
          onClick={() => { onClose(); onConfirm(); }}
          style={{
            background: !checked || isSubmitting || checking || nothingToSubmit ? alpha(T.accent, 0.3) : T.accent,
            color: '#fff', border: 'none', borderRadius: '8px',
            padding: '9px 24px', fontWeight: 700, fontSize: '0.8rem',
            fontFamily: 'inherit',
            cursor: !checked || isSubmitting || checking || nothingToSubmit ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => { if (checked && !isSubmitting && !checking && !nothingToSubmit) e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={e => { if (checked && !isSubmitting && !checking && !nothingToSubmit) e.currentTarget.style.background = T.accent; }}
        >
          {isSubmitting ? <><CircularProgress size={12} sx={{ color: '#fff' }} /> Submitting…</> : 'Submit'}
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Column group definitions ─────────────────────────────────────────────────
// ORDER MATTERS for UX: Core → Overall → Absence are placed first so the most
// important columns are immediately visible without horizontal scrolling.
// The detail groups (Morning, Afternoon, etc.) are hidden by default and
// sit to the right — users turn them on from the column chips when needed.
const COLUMN_GROUPS = [
  {
    key: 'core',
    label: 'Core',
    alwaysVisible: true,
    headerBg: T.accentDark,
    columns: [
      { label: 'Employee',      key: '_fullName' },
      { label: 'Department',   key: 'code' },
      { label: 'Employee No.', key: 'personID' },
      { label: 'Start Date',   key: 'startDate' },
      { label: 'End Date',     key: 'endDate' },
    ],
  },
  // ── Key summary columns — always visible, no scrolling needed ──────────────
  {
    key: 'overall',
    label: 'Totals',
    headerBg: '#0f4a26',
    columns: [
      { label: 'Total Rendered',    key: 'overallRenderedOfficialTime',          group: 'overall' },
      { label: 'Total Tardiness',  key: 'overallRenderedOfficialTimeTardiness', group: 'overallTard' },
      { label: 'Total Late',        key: '_lateTotal',                           group: 'tardiness' },
    ],
  },
  {
    key: 'absence',
    label: 'Absences',
    headerBg: '#6a1b9a',
    columns: [
      { label: 'Half Days',      key: '_halfTotalDays',   group: 'halfday' },
      { label: 'Days Absent',    key: '_absentTotalDays', group: 'absent' },
    ],
  },
  // ── Detail groups — hidden by default, toggle on demand ────────────────────
  {
    key: 'morning',
    label: 'Morning',
    headerBg: '#166534',
    columns: [
      { label: 'Morning Hours',     key: 'totalRenderedTimeMorning',          group: 'rendered' },
      { label: 'Morning Tardiness', key: 'totalRenderedTimeMorningTardiness', group: 'tardiness' },
    ],
  },
  {
    key: 'afternoon',
    label: 'Afternoon',
    headerBg: '#166534',
    columns: [
      { label: 'Afternoon Hours',     key: 'totalRenderedTimeAfternoon',          group: 'rendered' },
      { label: 'Afternoon Tardiness', key: 'totalRenderedTimeAfternoonTardiness', group: 'tardiness' },
    ],
  },
  {
    key: 'honorarium',
    label: 'Honorarium',
    headerBg: '#0369a1',
    columns: [
      { label: 'Honorarium',   key: 'totalRenderedHonorarium',          group: 'rendered' },
      { label: 'Honorarium Tardiness', key: 'totalRenderedHonorariumTardiness', group: 'tardiness' },
    ],
  },
  {
    key: 'serviceCredit',
    label: 'Service Credit',
    headerBg: '#6b21a8',
    columns: [
      { label: 'Service Credit', key: 'totalRenderedServiceCredit',          group: 'rendered' },
      { label: 'Service Credit Tardiness',   key: 'totalRenderedServiceCreditTardiness', group: 'tardiness' },
    ],
  },
  {
    key: 'overtime',
    label: 'Overtime',
    headerBg: '#92400e',
    columns: [
      { label: 'Overtime',     key: 'totalRenderedOvertime',          group: 'rendered' },
      { label: 'Overtime Tardiness', key: 'totalRenderedOvertimeTardiness', group: 'tardiness' },
    ],
  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const OverallAttendance = () => {
  const { settings } = useSystemSettings();
  const saveButtonStyles = useCRUDButtonStyles('save');
  const editButtonStyles = useCRUDButtonStyles('edit');
  const deleteButtonStyles = useCRUDButtonStylesOutlined('delete');
  const fetchInFlightRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [showJOConfirm, setShowJOConfirm] = useState(false);

  // Access control
  const { hasAccess, loading: accessLoading, error: accessError } = usePageAccess('attendance-summary');

  useEffect(() => {
    if (!accessLoading) {
      console.log('AttendanceSummary Access Check:', { hasAccess, accessLoading, accessError, identifier: 'attendance-summary' });
    }
  }, [hasAccess, accessLoading, accessError]);

  // State
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [editRecord, setEditRecord]         = useState(null);
  const [isSubmittingJO, setIsSubmittingJO] = useState(false);
  // Loaded records split by payroll type (Job Order / Regular / no category) — known
  // before either payroll button is used, so each button only sends its own employees.
  const [payrollEligibility, setPayrollEligibility] = useState({
    loading: false, jobOrder: [], regular: [], missingCategory: [], categoryByEmployee: new Map(),
  });
  const [loading, setLoading]               = useState(false);
  const [pageLoading, setPageLoading]       = useState(true);
  const [processingOverlay, setProcessingOverlay] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [successOverlay, setSuccessOverlay]       = useState(false);
  const [successRedirect, setSuccessRedirect]     = useState('');
  const [successAction, setSuccessAction]         = useState('send');
  const resultsRef = useRef(null);

  // ── Results-level search (client-side over the fetched period) ────────────
  // Lets one bulk fetch cover a whole month, then narrow by name / number
  // without another round trip.
  const [resultQuery, setResultQuery] = useState('');

  // ── Department scope (server-side query dimension) ───────────────────────
  // Blank = every department. When set, the bulk endpoint only returns records
  // for that department, so "show me everyone in this department" is one click
  // instead of searching employee by employee.
  const [department, setDepartment] = useState('');

  // ── Employment category scope ───────────────────────────────────────────
  // Holds a CAT_TOKEN: a whole module bucket ("M:…"), the unclassified bucket
  // ("U"), or one specific employment category ("C:<categoryLabel>").
  // Blank = everyone. Applied client-side because the module bucket is derived
  // by resolveAttendanceModuleFromEmployment — duplicating that mapping in SQL
  // would create a second source of truth to keep in sync.
  const [employmentCategory, setEmploymentCategory] = useState('');
  // The label is stored alongside the token on purpose. Deriving it from the
  // current option list meant that whenever the selected option disappeared
  // (roster month changed, department narrowed, records refetched) the lookup
  // returned '' and the picker rendered the raw internal token — "C:Academic |
  // 40 Hours" — while the scope readout silently dropped the category even
  // though the table was still filtered by it.
  const [employmentCategoryLabel, setEmploymentCategoryLabel] = useState('');

  // employeeNumber → { categoryLabel, module }. Fetched once (categories don't
  // vary by period) and shared by the roster and the results table.
  const [catByEmp, setCatByEmp] = useState({});

  // ── Employee roster (slide-over drawer) ───────────────────────────────
  // Same roster as the computation modules, minus the per-module employment
  // filter: Attendance Summary covers every module at once, so the list shows
  // everyone the user can see and flags who has no saved summary for the month.
  const nowForRoster = new Date();
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterYear, setRosterYear] = useState(nowForRoster.getFullYear());
  const [rosterMonth, setRosterMonth] = useState(nowForRoster.getMonth() + 1);
  const [rosterRows, setRosterRows] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState('all');
  // 'Active' (default) shows only active employees; 'all' lists everyone, active first.
  const [rosterStatus, setRosterStatus] = useState('Active');
  const [rosterDepartment, setRosterDepartment] = useState('');
  const rosterReqRef = useRef(0);

  // ── Column group visibility ───────────────────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState(
    new Set(['morning', 'afternoon', 'honorarium', 'serviceCredit', 'overtime'])
  );
  const toggleGroup = (key) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Month picker state
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear]   = useState(currentYear);
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null, showCancel: false });
  const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false) =>
    setModal({ open: true, title, message, type, onConfirm, showCancel });
  const closeModal = () => setModal(p => ({ ...p, open: false }));

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  // ── Roster fetch ───────────────────────────────────────────────────────
  // Two parallel calls: the roster itself (month-coverage, already scoped to
  // admins + the supervisor's own departments) and person_table to backfill
  // names that the coverage LEFT JOIN leaves empty. A third batched call then
  // marks who already has a saved summary for the month, so "Not yet" is a
  // real answer to "whose records am I still missing?".
  const fetchRoster = useCallback(async () => {
    const reqId = ++rosterReqRef.current;
    setRosterLoading(true);
    setRosterError('');
    const year = rosterYear;
    const month = rosterMonth;
    const monthStart = `${year}-${pad2(month)}-01`;
    const monthEnd = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
    try {
      const [coverageRes, personRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/officialtime/month-coverage`, {
          ...getAuthHeaders(),
          params: { year, month },
        }),
        axios
          .get(`${API_BASE_URL}/personalinfo/person_table`, getAuthHeaders())
          .catch(() => ({ data: [] })),
      ]);
      if (reqId !== rosterReqRef.current) return;

      const employees = Array.isArray(coverageRes.data?.employees)
        ? coverageRes.data.employees
        : [];

      // employeeNumber → name. month-coverage builds fullName from a LEFT JOIN
      // on person_table, so it comes back blank whenever that join misses; this
      // is the same table the DTR hub reads, so it covers those cases.
      const nameByEmp = {};
      const personList = Array.isArray(personRes.data)
        ? personRes.data
        : personRes.data?.data || [];
      personList.forEach((p) => {
        const num = String(
          p?.agencyEmployeeNum ?? p?.employeeNumber ?? '',
        ).trim();
        if (!num) return;
        const name = rosterDisplayName(p);
        if (name) nameByEmp[num] = name;
      });

      // Who already has a summary row for this exact month?
      let savedSet = new Set();
      if (employees.length > 0) {
        try {
          const savedRes = await axios.post(
            `${API_BASE_URL}/attendance/api/overall_attendance_record/daily-late-undertime/batch`,
            {
              startDate: monthStart,
              endDate: monthEnd,
              employeeNumbers: employees.map((e) => e.employeeNumber),
            },
            getAuthHeaders(),
          );
          if (reqId !== rosterReqRef.current) return;
          const meta = savedRes.data?.metaByEmployee || {};
          savedSet = new Set(Object.keys(meta).map((k) => String(k).trim()));
        } catch {
          // Status is a nicety — a failure here must not blank the roster.
          if (reqId !== rosterReqRef.current) return;
        }
      }

      setRosterRows(
        employees.map((e) => {
          const key = String(e.employeeNumber).trim();
          return {
            employeeNumber: e.employeeNumber,
            // Prefer the coverage name, fall back to person_table. Last resort
            // is the number, so a row is never blank.
            fullName:
              String(e.fullName || '').trim() ||
              nameByEmp[key] ||
              `#${key}`,
            department: e.department || '',
            status: e.status || 'Default',
            hasOfficialTime: Boolean(e.covered),
            saved: savedSet.has(key),
          };
        }),
      );
    } catch (err) {
      if (reqId !== rosterReqRef.current) return;
      setRosterRows([]);
      setRosterError("Couldn't load the employee list.");
      console.error('Attendance Summary roster fetch failed:', err);
    } finally {
      if (reqId === rosterReqRef.current) setRosterLoading(false);
    }
  }, [rosterYear, rosterMonth]);

  useEffect(() => {
    if (accessLoading || hasAccess !== true) return;
    fetchRoster();
  }, [fetchRoster, accessLoading, hasAccess]);

  // ── Employment category lookup (once) ─────────────────────────────────
  // Categories are per-employee master data, not period data, so this never
  // needs to refetch. Failure is non-fatal: the picker simply offers only the
  // module buckets it can still derive.
  useEffect(() => {
    if (accessLoading || hasAccess !== true) return;
    let cancelled = false;
    axios
      .get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, getAuthHeaders())
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        const map = {};
        rows.forEach((c) => {
          const num = String(c?.employeeNumber ?? '').trim();
          if (!num) return;
          const label = String(c?.categoryLabel || '').trim();
          map[num] = {
            categoryLabel: label && label !== 'Unassigned' ? label : '',
            module: resolveAttendanceModuleFromEmployment({
              parentGroup: c?.parentGroup,
              typeName: c?.typeName,
              label,
              categoryLabel: label,
            }) || null,
          };
        });
        setCatByEmp(map);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Employment category lookup failed; category filter may be incomplete:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, [accessLoading, hasAccess]);

  // Month nav keeps year+month together — stepping back from January has to
  // roll into the previous year, which a pair of independent setters would get
  // wrong. Derive both from one Date instead.
  const shiftRosterMonth = useCallback((delta) => {
    const next = new Date(rosterYear, rosterMonth - 1 + delta, 1);
    setRosterYear(next.getFullYear());
    setRosterMonth(next.getMonth() + 1);
  }, [rosterYear, rosterMonth]);

  const rosterDepartments = useMemo(
    () => [...new Set(rosterRows.map((r) => r.department).filter(Boolean))].sort(),
    [rosterRows],
  );

  // employeeNumber → employment category metadata, tolerant of a missing entry.
  const categoryFor = useCallback(
    (empNum) => catByEmp[String(empNum ?? '').trim()] || null,
    [catByEmp],
  );

  // Picker options, grouped by attendance module with the individual
  // employment categories nested underneath.
  //
  // Two fixes over the previous version:
  //  1. The pool is the roster UNION the records actually loaded, mirroring how
  //     departmentOptions already works. Reading the roster alone left the
  //     picker permanently disabled whenever month-coverage returned nothing,
  //     even with plenty of records on screen.
  //  2. Counts honour the selected department, so the numbers predict what a
  //     fetch will actually return instead of describing the whole workforce.
  // Employees with no resolvable module (and no category row at all) land in
  // the "Other / Unclassified" bucket, so the counts still reconcile with the
  // number of employees behind them.
  const categoryGroups = useMemo(() => {
    const pool = new Map();
    const add = (num, departmentLabel) => {
      const k = String(num || '').trim();
      if (!k) return;
      if (!pool.has(k)) pool.set(k, String(departmentLabel || ''));
    };
    rosterRows.forEach((r) => add(r.employeeNumber, r.department));
    attendanceData.forEach((r) => add(r.personID || r.employeeNumber, r._department));

    const scoped = department
      ? [...pool.entries()].filter(([, dept]) => dept === department)
      : [...pool.entries()];

    const byModule = new Map();
    scoped.forEach(([num]) => {
      const c = catByEmp[num] || { categoryLabel: '', module: null };
      const modKey = c.module || null;
      if (!byModule.has(modKey)) {
        byModule.set(modKey, { moduleKey: modKey, count: 0, cats: new Map() });
      }
      const g = byModule.get(modKey);
      g.count += 1;
      if (c.categoryLabel) {
        g.cats.set(c.categoryLabel, (g.cats.get(c.categoryLabel) || 0) + 1);
      }
    });

    const ordered = [
      ...MODULE_ORDER.filter((k) => byModule.has(k)),
      ...(byModule.has(null) ? [null] : []),
    ];
    return ordered.map((modKey) => {
      const g = byModule.get(modKey);
      const token = modKey ? CAT_TOKEN.module(modKey) : CAT_TOKEN.unclass;
      return {
        moduleKey: modKey,
        label: moduleLabel(modKey),
        token,
        count: g.count,
        categories: [...g.cats.entries()]
          .map(([label, count]) => ({ label, count, token: CAT_TOKEN.category(label) }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      };
    });
  }, [catByEmp, rosterRows, attendanceData, department]);

  /** Does one loaded record fall inside the selected category scope? */
  const matchesEmploymentCategory = useCallback((row) => {
    if (!employmentCategory) return true;
    const c = categoryFor(row.personID || row.employeeNumber);
    const modKey = c?.module || null;
    if (employmentCategory === CAT_TOKEN.unclass) return modKey === null;
    if (employmentCategory.startsWith('M:')) {
      return modKey === employmentCategory.slice(2);
    }
    if (employmentCategory.startsWith('C:')) {
      return c?.categoryLabel === employmentCategory.slice(2);
    }
    return true;
  }, [employmentCategory, categoryFor]);

  /** Human label for a category token, or '' when it is no longer an option. */
  const findCategoryLabel = useCallback((token) => {
    if (!token) return '';
    for (const g of categoryGroups) {
      if (g.token === token) return g.label;
      const hit = g.categories.find((c) => c.token === token);
      if (hit) return hit.label;
    }
    return '';
  }, [categoryGroups]);

  /**
   * Set the category scope, capturing the label at pick time. The stored label
   * is what the field and the scope readout render, so neither can fall back to
   * the raw internal token.
   */
  const handleCategoryChange = useCallback((token) => {
    setEmploymentCategory(token);
    setEmploymentCategoryLabel(findCategoryLabel(token));
    setResultQuery('');
  }, [findCategoryLabel]);

  // A category picked under one scope can vanish when the scope changes (e.g.
  // "Faculty · 30 hrs" has no one in the newly selected department). Left in
  // place it would filter the table down to nothing with no obvious way back,
  // so drop the selection once it is no longer a valid option.
  useEffect(() => {
    if (!employmentCategory) return;
    if (categoryGroups.length === 0) return;
    if (findCategoryLabel(employmentCategory)) return;
    setEmploymentCategory('');
    setEmploymentCategoryLabel('');
    setResultQuery('');
  }, [categoryGroups, employmentCategory, findCategoryLabel]);

  // Employees in the chosen status scope; with "Everyone", active employees come first.
  const scopedRosterRows = useMemo(() => {
    if (rosterStatus === 'Active') return rosterRows.filter((r) => r.status === 'Active');
    const rank = (r) => (r.status === 'Active' ? 0 : r.status === 'Inactive' ? 2 : 1);
    return [...rosterRows].sort((a, b) => rank(a) - rank(b));
  }, [rosterRows, rosterStatus]);

  const visibleRosterRows = useMemo(() => {
    let list = scopedRosterRows;
    if (rosterDepartment) list = list.filter((r) => r.department === rosterDepartment);
    if (rosterFilter === 'done') list = list.filter((r) => r.saved);
    else if (rosterFilter === 'missing') list = list.filter((r) => !r.saved);
    const q = rosterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          String(r.fullName || '').toLowerCase().includes(q) ||
          String(r.employeeNumber || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [scopedRosterRows, rosterDepartment, rosterFilter, rosterQuery]);

  const rosterSummary = useMemo(() => ({
    done: scopedRosterRows.filter((r) => r.saved).length,
    total: scopedRosterRows.length,
    activeCount: rosterRows.filter((r) => r.status === 'Active').length,
    allCount: rosterRows.length,
  }), [scopedRosterRows, rosterRows]);

  /** Load a roster employee into the module, switching the period to that month. */
  const selectRosterEmployee = useCallback((row) => {
    const num = String(row.employeeNumber || '').trim();
    if (!num) return;
    const year = rosterYear;
    const month = rosterMonth;
    setEmployeeNumber(num);
    setStartDate(`${year}-${pad2(month)}-01`);
    setEndDate(`${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`);
    setSelectedYear(year);
    setSelectedMonth(month - 1);
    setResultQuery('');
  }, [rosterYear, rosterMonth]);

  // Restore inputs from workflow / Earnings navigation only (not logged-in user localStorage).
  useEffect(() => {
    const st = location.state;
    const inWorkflow =
      st?.fromAttendanceWorkflow === true ||
      st?.fromDevice === true ||
      st?.fromEarnings === true;
    if (!inWorkflow) return;

    const en = st?.employeeNumber != null ? String(st.employeeNumber).trim() : '';
    if (!en) return;

    setEmployeeNumber(en);
    if (st.startDate) setStartDate(String(st.startDate).slice(0, 10));
    if (st.endDate) setEndDate(String(st.endDate).slice(0, 10));
    if (st.selectedYear != null) setSelectedYear(Number(st.selectedYear));
    if (st.selectedMonth != null) {
      const m = Number(st.selectedMonth);
      // Earnings uses 1–12; Attendance Summary month picker uses 0–11
      setSelectedMonth(m >= 1 && m <= 12 ? m - 1 : m);
    }
  }, [location.key]);

  // ── Month picker ──────────────────────────────────────────────────────────
  // `year` defaults to the selected year; the stepper passes an explicit year so
  // stepping across December/January lands in the right one.
  const handleMonthClick = (monthIndex, year = selectedYear) => {
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end   = new Date(Date.UTC(year, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  /**
   * Normalizes one `overall_attendance_record` row into the shape the table
   * renders: absent/half-day bucket strings (time + day count + date list) and a
   * resolved Late Total. Shared by the single-employee and bulk endpoints so
   * both views render identically.
   */
  const mapSummaryRow = (r) => {
    const aDays  = r?.absentDays;
    const hDays  = r?.halfDays;
    const aTime  = r?.absentTime;
    const hTime  = r?.halfDayShortfallTime;
    const aDates = r?.absentDates;
    const hDates = r?.halfDayDates;

    const absentLine =
      aTime != null && aDays != null ? `${aTime} (${aDays}d)` :
      aTime != null ? String(aTime) :
      aDays != null ? `00:00:00 (${aDays}d)` : null;
    const halfLine =
      hTime != null && hDays != null ? `${hTime}${Number(hDays) > 0 ? ` (${hDays}d)` : ''}` :
      hTime != null ? String(hTime) :
      hDays != null ? `00:00:00${Number(hDays) > 0 ? ` (${hDays}d)` : ''}` : null;

    const absentDisplay =
      absentLine
        ? (aDates != null && String(aDates).trim() !== '' ? `${absentLine} · ${String(aDates).trim()}` : absentLine)
        : null;
    const halfDayStr =
      halfLine
        ? (hDates != null && String(hDates).trim() !== '' ? `${halfLine} · ${String(hDates).trim()}` : halfLine)
        : null;

    let lateTotalResolved;
    if (r?.lateTotalTime != null && String(r.lateTotalTime).trim() !== '') {
      lateTotalResolved = String(r.lateTotalTime).trim();
    } else {
      // Do not fall back to overall tardiness (that includes absent + half day)
      lateTotalResolved = '';
    }

    const personID = String(r?.personID ?? r?.employeeNumber ?? '').trim();
    const name = rosterDisplayName(r);
    // Prefer the human-readable department name so the picker, the toolbar and
    // the roster all speak the same language; fall back to the code.
    const deptLabel = String(r?.departmentName ?? '').trim() || String(r?.code ?? '').trim();

    return {
      ...r,
      personID,
      employeeNumber: r?.employeeNumber ?? personID,
      // Composed client-side so the table can show a real name. Falls back to
      // the number so a row is never blank.
      _fullName: name || (personID ? `#${personID}` : ''),
      _department: deptLabel,
      _absentTotalDays: absentDisplay ?? null,
      _halfTotalDays:   halfDayStr    ?? null,
      _lateTotal:       lateTotalResolved,
    };
  };

  const fetchAttendanceData = async () => {
    if (fetchInFlightRef.current) return;
    if (!startDate || !endDate) return;
    fetchInFlightRef.current = true;
    setLoading(true);
    try {
      // Employee number is optional: blank means "every employee whose summary
      // overlaps this period", which is the bulk endpoint. With a number we
      // keep the original single-employee request for exact parity.
      const person = String(employeeNumber || '').trim();
      const dept = String(department || '').trim();
      const response = await axios.get(
        person
          ? `${API_BASE_URL}/attendance/api/overall_attendance_record`
          : `${API_BASE_URL}/attendance/api/overall_attendance_record/bulk`,
        {
          params: {
            personID: person || undefined,
            // Department only applies to the bulk (all-employees) view.
            department: !person && dept ? dept : undefined,
            startDate,
            endDate,
          },
          ...getAuthHeaders(),
        },
      );
      if (response.status === 200) {
        const overallRows = response.data.data;

        setAttendanceData(
          (Array.isArray(overallRows) ? overallRows : []).map(mapSummaryRow),
        );
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        console.error('Error: ', response.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showModal('Data Retrieval Error', 'Unable to retrieve attendance records. Please try again.', 'error');
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  };

  const fetchAttendanceDataRef = useRef(fetchAttendanceData);
  useEffect(() => { fetchAttendanceDataRef.current = fetchAttendanceData; });

  const handleWorkflowHydrate = useCallback((payload) => {
    const en = String(payload.employeeNumber || '').trim();
    setEmployeeNumber(en);
    setStartDate(payload.startDate);
    setEndDate(payload.endDate);
    if (payload.selectedYear != null) setSelectedYear(payload.selectedYear);
    if (payload.selectedMonth != null) setSelectedMonth(payload.selectedMonth);
    setTimeout(() => {
      fetchAttendanceDataRef.current?.();
    }, 300);
  }, []);

  const {
    prevStep,
    nextStep,
    goPrevious,
    goNext,
  } = useAttendanceWorkflow('summary', {
    employeeNumber,
    startDate,
    endDate,
    onHydrate: handleWorkflowHydrate,
  });

  useAttendanceRealtimeRefresh(fetchAttendanceData, {
    personId: employeeNumber,
    startDate,
    endDate,
    requireDateRange: true,
    matchMode: 'strict',
    debounceMs: 500,
  });

  // ── Results filtering (client-side over the fetched period) ─────────────
  // The bulk endpoint already narrowed the set by department, so the only
  // remaining client-side filter is the free-text search.
  const resultDepartments = useMemo(
    () =>
      [
        ...new Set(
          attendanceData
            .map((r) => r._department)
            .filter(Boolean)
            .map((d) => String(d)),
        ),
      ].sort(),
    [attendanceData],
  );

  const filteredAttendanceData = useMemo(() => {
    // Department is already applied server-side; the category scope and the
    // free-text search are applied here.
    const scoped = employmentCategory
      ? attendanceData.filter(matchesEmploymentCategory)
      : attendanceData;
    const q = resultQuery.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (r) =>
        String(r._fullName || '').toLowerCase().includes(q) ||
        String(r.personID || r.employeeNumber || '')
          .toLowerCase()
          .includes(q) ||
        String(r._department || '').toLowerCase().includes(q) ||
        String(categoryFor(r.personID || r.employeeNumber)?.categoryLabel || '')
          .toLowerCase()
          .includes(q),
    );
  }, [attendanceData, resultQuery, employmentCategory, matchesEmploymentCategory, categoryFor]);

  // Options for the department picker: what the roster can see (always scoped
  // to the user's own departments) unioned with whatever the loaded records
  // show, so the picker still works if the roster is empty or on a different
  // month than the selected period.
  const departmentOptions = useMemo(() => {
    const set = new Set();
    rosterDepartments.forEach(d => { if (d) set.add(String(d)); });
    resultDepartments.forEach(d => { if (d) set.add(String(d)); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rosterDepartments, resultDepartments]);

  // Headline numbers for the summary strip. Employees are distinct people (one
  // employee can have more than one summary row per period); the other three
  // count records that actually carry late time, absences, or half days.
  const resultStats = useMemo(() => ({
    records: attendanceData.length,
    employees: new Set(
      attendanceData
        .map((r) => String(r.personID || r.employeeNumber || '').trim())
        .filter(Boolean),
    ).size,
    departments: resultDepartments.length,
    late: attendanceData.filter((r) => hasNonZeroTime(r._lateTotal)).length,
    absent: attendanceData.filter((r) => Number(r.absentDays) > 0).length,
    halfDay: attendanceData.filter((r) => Number(r.halfDays) > 0).length,
  }), [attendanceData, resultDepartments]);

  // ── Payroll eligibility (Job Order vs Regular) ─────────────────────────────
  // Classified as soon as records load, so the buttons and the confirm dialog show
  // the real counts before anything is clicked.
  const eligibilityRunRef = useRef(0);
  useEffect(() => {
    const runId = ++eligibilityRunRef.current;
    if (!attendanceData.length) {
      setPayrollEligibility({ loading: false, jobOrder: [], regular: [], missingCategory: [], categoryByEmployee: new Map() });
      return;
    }
    setPayrollEligibility((p) => ({ ...p, loading: true }));
    classifyRecordsForPayroll(attendanceData, getAuthHeaders)
      .then((res) => {
        if (runId === eligibilityRunRef.current) setPayrollEligibility({ loading: false, ...res });
      })
      .catch(() => {
        if (runId === eligibilityRunRef.current) setPayrollEligibility((p) => ({ ...p, loading: false }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceData]);

  /** "• Employee 2013…: reason" lines for the excluded employees of one payroll type. */
  const describeExcluded = (records, reasonFor) =>
    records.map((r) => `• Employee ${recordEmployeeNumber(r)}: ${reasonFor(r)}`).join('\n');
  const categoryOf = (record, categoryByEmployee) =>
    payrollCategoryLabel(categoryByEmployee.get(recordEmployeeNumber(record)));

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const updateRecord = async () => {
    if (!editRecord || !editRecord.totalRenderedTimeMorning) return;
    try {
      await axios.put(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/${editRecord.id}`,
        editRecord,
        getAuthHeaders(),
      );
      // Refresh the table in place — a full page reload lost the filters and scroll.
      fetchAttendanceData();
      showModal('Update Successful', 'Record updated successfully.', 'success', () => {
        closeModal();
      });
    } catch (error) {
      console.error('Error updating record:', error);
      showModal('Update Failed', 'Unable to update record.', 'error');
    }
    setEditRecord(null);
  };

  const deleteRecord = async (id, personID) => {
    showModal('Confirm Deletion', `Delete attendance record for Employee ${personID}?`, 'warning', async () => {
      try {
        await axios.delete(
          `${API_BASE_URL}/attendance/api/overall_attendance_record/${id}/${personID}`,
          getAuthHeaders(),
        );
        fetchAttendanceData();
        showModal('Deleted Successfully', 'Record removed from system.', 'success');
      } catch (error) {
        console.error('Delete failed:', error);
        const status  = error.response?.status;
        const message = error.response?.data?.message || error.response?.data?.error || 'Error';
        if (status === 404)                       showModal('Not Found', 'Record not found or already deleted.', 'error');
        else if (status === 401 || status === 403) showModal('Session Expired', 'Please log in again.', 'error');
        else                                       showModal('Deletion Failed', `${message}`, 'error');
      }
    }, true);
  };

  const withLateTotal = (r) => ({
    ...r,
    overallRenderedOfficialTimeTardiness:
      r.overallRenderedOfficialTimeTardiness != null &&
      String(r.overallRenderedOfficialTimeTardiness).trim() !== ''
        ? r.overallRenderedOfficialTimeTardiness
        : r._lateTotal != null && String(r._lateTotal).trim() !== ''
          ? r._lateTotal
          : '',
  });

  // ── Regular payroll → Earnings Management ─────────────────────────────────
  // Job Order employees are paid through Job Order payroll, so they can never be
  // routed here. Checked fresh on click (not only from the cached classification).
  const [checkingRegular, setCheckingRegular] = useState(false);
  const goToEarningsForRegularPayroll = async () => {
    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning');
      return;
    }
    if (checkingRegular) return;
    setCheckingRegular(true);
    let classified;
    try {
      classified = await classifyRecordsForPayroll(attendanceData, getAuthHeaders);
    } catch (e) {
      console.error('Employment category check failed:', e);
      showModal('Check Failed', 'Could not verify the employees’ employment categories. Please try again.', 'error');
      setCheckingRegular(false);
      return;
    }
    setCheckingRegular(false);
    const { jobOrder, regular, missingCategory, categoryByEmployee } = classified;

    const excludedText = [
      describeExcluded(jobOrder, (r) => `Job Order (${categoryOf(r, categoryByEmployee)}) — use Submit Payroll JO`),
      describeExcluded(missingCategory, () => 'No employment category — set it in Employment Category first'),
    ].filter(Boolean).join('\n');

    const go = (records) => navigate('/earnings-management', {
      state: {
        fromAttendanceSummaryRegular: true,
        payrollAttendanceRecords: records.map(withLateTotal),
      },
    });

    if (regular.length === 0) {
      showModal(
        'Not Allowed — Regular Payroll',
        `These employees cannot go through Regular payroll (Earnings Management):\n\n${excludedText}\n\nJob Order employees are paid through Job Order payroll.`,
        'warning',
      );
      return;
    }
    if (jobOrder.length > 0 || missingCategory.length > 0) {
      showModal(
        'Some Employees Excluded',
        `${regular.length} Regular record(s) will continue to Earnings Management.\n${jobOrder.length + missingCategory.length} excluded:\n\n${excludedText}\n\nContinue with the Regular records only?`,
        'warning',
        () => { closeModal(); go(regular); },
        true,
      );
      return;
    }
    go(regular);
  };

  // ── Payroll JO ────────────────────────────────────────────────────────────
  /** "21:54" / "21:54:30" → { h, m, s } (whole numbers, never negative). */
  const parseHms = (value) => {
    const parts = String(value ?? '').trim().split(':');
    const n = (i) => Math.max(0, parseInt(parts[i], 10) || 0);
    return parts.length && parts[0] !== '' ? { h: n(0), m: n(1), s: n(2) } : { h: 0, m: 0, s: 0 };
  };

  const submitPayrollJO = async () => {
    if (isSubmittingJO) return;
    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning'); return;
    }
    setIsSubmittingJO(true);
    setProcessingOverlay(true);
    setProcessingMessage('Checking employment categories...');
    try {
      const { jobOrder, regular, missingCategory, categoryByEmployee } =
        await classifyRecordsForPayroll(attendanceData, getAuthHeaders);

      const excludedText = [
        describeExcluded(regular, (r) => `Not a Job Order category (${categoryOf(r, categoryByEmployee)}) — use Regular · Earnings Management`),
        describeExcluded(missingCategory, () => 'No employment category — set it in Employment Category first'),
      ].filter(Boolean).join('\n');

      if (jobOrder.length === 0) {
        showModal(
          'Submission Blocked — Job Order Payroll',
          `The following employee(s) could not be processed for Job Order Payroll submission:\n\n${excludedText}\n\nOnly employees with a Job Order employment category can be submitted here. Check their category in Employment Category.`,
          'warning',
        );
        return;
      }
      if (regular.length > 0 || missingCategory.length > 0) {
        setProcessingOverlay(false);
        showModal(
          'Confirm Submission',
          `${jobOrder.length} Job Order record(s) will be submitted.\n${regular.length + missingCategory.length} excluded:\n\n${excludedText}\n\nProceed with the Job Order records only?`,
          'warning',
          async () => { closeModal(); await continuePayrollJOSubmission(jobOrder); },
          true,
        );
        return;
      }
      await continuePayrollJOSubmission(jobOrder);
    } catch (error) {
      console.error('Error submitting Payroll JO:', error);
      handlePayrollJOError(error);
    } finally {
      setProcessingOverlay(false); setIsSubmittingJO(false);
    }
  };

  /** Submits Job Order records. Holds the "Submitting…" lock itself, so it is safe to
   *  call from the partial-confirm modal as well as directly. */
  const continuePayrollJOSubmission = async (filteredRecords) => {
    setIsSubmittingJO(true);
    setProcessingOverlay(true);
    setProcessingMessage('Checking for existing payroll entries...');
    try {
      // Same test the server applies: ANY payroll row (Job Order or Regular) for the
      // employee + period blocks a new one. Checked in parallel.
      const checks = await Promise.all(filteredRecords.map(async (record) => {
        const empNum = recordEmployeeNumber(record);
        const { startDate, endDate } = record;
        try {
          const res = await axios.get(
            `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
            { ...getAuthHeaders(), params: { employeeNumber: empNum, startDate, endDate } },
          );
          const hit = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
          return hit ? { employeeNumber: empNum, startDate, endDate, payrollType: hit.payrollType || 'Payroll' } : null;
        } catch (checkError) {
          if (checkError.response?.status !== 404) console.warn(`Could not check duplicate for ${empNum}:`, checkError);
          return null;
        }
      }));
      const duplicateRecords = checks.filter(Boolean);

      if (duplicateRecords.length > 0) {
        showModal(
          'Duplicate Entries — Job Order Payroll',
          `These employees already have a payroll entry for the period:\n\n${duplicateRecords.map(r => `• Employee ${r.employeeNumber}: ${r.startDate} → ${r.endDate} (existing ${r.payrollType} payroll)`).join('\n')}\n\nRemove or review the existing entry in payroll processing before resubmitting.`,
          'warning',
        );
        return;
      }

      setProcessingMessage('Submitting JO payroll...');
      let successCount = 0;
      const failedRecords = [];
      for (const record of filteredRecords) {
        const empNum = recordEmployeeNumber(record);
        try {
          // Rendered time goes as hours + minutes + seconds, so 21:54 is not cut to 21 h
          // and under an hour (0:45) is still accepted.
          const rendered = parseHms(record.overallRenderedOfficialTime);
          const tardiness = parseHms(withLateTotal(record).overallRenderedOfficialTimeTardiness);
          const payload = {
            employeeNumber: empNum,
            startDate: record.startDate,
            endDate: record.endDate,
            h: tardiness.h, m: tardiness.m, s: tardiness.s,
            rh: rendered.h, rm: rendered.m, rs: rendered.s,
            department: record.code,
          };
          await axios.post(`${API_BASE_URL}/PayrollJORoutes/payroll-jo`, payload, getAuthHeaders());
          successCount++;
        } catch (recordError) {
          console.error(`Failed to submit record for ${empNum}:`, recordError);
          const errorMsg = recordError.response?.data?.error || recordError.response?.data?.message || 'Unknown error';
          failedRecords.push({ employeeNumber: empNum, error: errorMsg });
        }
      }

      if (failedRecords.length > 0) {
        const failedList = failedRecords.map(r => `• Employee ${r.employeeNumber}: ${r.error}`).join('\n');
        if (successCount > 0)
          showModal('Partial Success', `Submitted: ${successCount}\nFailed: ${failedRecords.length}\n\n${failedList}`, 'warning');
        else
          showModal('Submission Failed', `All submissions failed:\n\n${failedList}`, 'error');
      } else {
        setSuccessAction('send'); setSuccessRedirect('/payroll-jo'); setSuccessOverlay(true);
      }
    } catch (error) {
      handlePayrollJOError(error);
    } finally {
      setProcessingOverlay(false);
      setIsSubmittingJO(false);
    }
  };

  const handlePayrollJOError = (error) => {
    let errorMessage = 'Payroll JO submission failed.';
    if (error.response) {
      const status  = error.response.status;
      const message = error.response.data?.message || error.response.data?.error || 'Server error occurred';
      if (status === 409)      errorMessage = `Duplicate entry: ${message}`;
      else if (status === 400) errorMessage = `Invalid data: ${message}`;
      else                     errorMessage = `Error ${status}: ${message}`;
    } else if (error.request) {
      errorMessage = 'Connection failed. Check internet connection.';
    }
    showModal('Submission Error', errorMessage, 'error');
  };

  // ── Access guards / wireframe ─────────────────────────────────────────────
  if (pageLoading || accessLoading) return <OverallAttendanceWireframe />;
  if (!accessLoading && hasAccess !== true)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Summary. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // ── Cell color / header helpers ───────────────────────────────────────────
  const getCellColor = (group) => {
    if (group === 'rendered')    return '#166534';
    if (group === 'tardiness')   return '#991b1b';
    if (group === 'halfday')     return '#8B5E00';
    if (group === 'absent')      return '#6a1b9a';
    if (group === 'overall')     return '#166534';
    if (group === 'overallTard') return '#991b1b';
    return T.text;
  };

  // Soft pill behind each time value (status tokens, slightly stronger for the
  // two "overall" columns so they read as the headline numbers).
  const getPillStyle = (group) => {
    if (group === 'rendered')    return { bg: T.rendered.bg,   color: T.rendered.color,   border: alpha(T.rendered.color, 0.18) };
    if (group === 'tardiness')   return { bg: T.tardiness.bg,  color: T.tardiness.color,  border: alpha(T.tardiness.color, 0.18) };
    if (group === 'halfday')     return { bg: T.halfDay.bg,    color: T.halfDay.color,    border: alpha(T.halfDay.color, 0.2) };
    if (group === 'absent')      return { bg: T.absent.bg,     color: T.absent.color,     border: alpha(T.absent.color, 0.2) };
    if (group === 'overall')     return { bg: 'rgba(21,128,61,0.15)', color: '#166534', border: 'rgba(21,128,61,0.35)' };
    if (group === 'overallTard') return { bg: 'rgba(153,27,27,0.14)', color: '#991b1b', border: 'rgba(153,27,27,0.32)' };
    return null;
  };

  const getColHeaderBg = (group) => {
    if (group === 'rendered')    return '#166534';
    if (group === 'tardiness')   return '#991b1b';
    if (group === 'halfday')     return '#8B5E00';
    if (group === 'absent')      return '#6a1b9a';
    if (group === 'overall')     return '#0f4a26';
    if (group === 'overallTard') return '#6b0f0f';
    return T.accentDark;
  };

  // Flat list of the columns currently shown (core + any group toggled on).
  const visibleColumns = COLUMN_GROUPS.flatMap((grp) =>
    !grp.alwaysVisible && collapsedGroups.has(grp.key)
      ? []
      : grp.columns.map((c) => ({ ...c, grp })),
  );
  const tableMinWidth = visibleColumns.reduce(
    (sum, c) => sum + (c.key === '_fullName' ? NAME_COL_W : 140),
    ACTIONS_COL_W,
  );

  const trimmedEmployee = String(employeeNumber || '').trim();
  const canFetch = Boolean(startDate && endDate) && !loading;

  const monthSpan = selectedMonth != null ? monthRange(selectedYear, selectedMonth) : null;
  const isMonthPeriod = Boolean(monthSpan && startDate === monthSpan.start && endDate === monthSpan.end);
  const periodTitle = isMonthPeriod
    ? `${MONTH_FULL[selectedMonth]} ${selectedYear}`
    : (startDate && endDate ? 'Custom range' : 'Select a period');

  // One-line description of the group the fetch will return, so the two scope
  // pickers and the optional employee number always read as one coherent query.
  const scopeParts = [
    department ? department : null,
    employmentCategoryLabel ? employmentCategoryLabel : null,
  ].filter(Boolean);
  const scopeSentence = scopeParts.length
    ? `Showing every employee in ${scopeParts.join(' · ')} for this date range`
    : 'Showing every employee with a record in this date range';

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER — control rail (left) + workspace (right)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={150}>
      <Box>
        <style>{pageCss}</style>

        <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 4, py: 3,
                background: PANEL_HEADER_BG,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 2, flexWrap: 'wrap',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                <SummarizeOutlined sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Overall Attendance Report
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    Administrative Panel - Review attendance summaries and send them to payroll
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                <AttendanceWorkflowNav
                  inline
                  prevStep={prevStep}
                  nextStep={nextStep}
                  onPrevious={goPrevious}
                  onNext={goNext}
                />
                {attendanceData.length > 0 && (
                  <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                    <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                      {attendanceData.length} records
                    </Typography>
                  </Box>
                )}
                <Tooltip title={`Open the list of ${rosterStatus === 'Active' ? 'active employees' : 'all employees'} and see whose summary is already saved for this month`}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<GroupsIcon sx={{ fontSize: '16px !important' }} />}
                    onClick={() => setRosterOpen(true)}
                    sx={{
                      textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: '6px',
                      px: 1.75, py: 0.7,
                      bgcolor: T.accent, color: '#fff',
                      boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
                      '&:hover': { bgcolor: T.accentDark },
                    }}
                  >
                    Employee Checklist
                    {rosterSummary.total > 0 && (
                      <Box component="span" sx={{
                        ml: 1, px: 0.9, py: 0.1, borderRadius: 999,
                        bgcolor: '#fff', color: T.accent,
                        fontSize: '0.68rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      }}>
                        {rosterSummary.done}/{rosterSummary.total} done
                      </Box>
                    )}
                  </Button>
                </Tooltip>
                <Tooltip title="Reload records">
                  <span>
                    <IconButton
                      onClick={fetchAttendanceData}
                      disabled={!startDate || !endDate || loading}
                      sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}
                    >
                      <Refresh sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>

            {/* LEFT: Filter */}
            <Grid item xs={12} lg={3}>
              <SectionCard sx={filterSidebarCardSx}>
                <AttendanceFilterHeader />
                <Box sx={filterPanelScrollSx}>
                  <AttendanceFilterYearQuickRow
                    selectedYear={selectedYear}
                    onYearChange={(e) => { setSelectedYear(parseInt(e.target.value, 10)); setSelectedMonth(null); }}
                    yearOptions={yearOptions}
                    onQuickDate={(v) => applyQuickDateRange(v, setStartDate, setEndDate, setSelectedMonth)}
                  />
                  <AttendanceFilterMonthHeader
                    showClear={selectedMonth !== null && selectedMonth !== undefined}
                    onClear={() => { setSelectedMonth(null); setStartDate(''); setEndDate(''); }}
                  />
                  <AttendanceFilterMonthGrid
                    selectedMonth={selectedMonth}
                    onMonthClick={(idx) => handleMonthClick(idx)}
                  />

                  <AttendanceFilterSectionLabel icon={CalendarToday}>Date range</AttendanceFilterSectionLabel>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', mb: 1.25 }}>
                    <TextField
                      size="small" type="date" value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      inputProps={{ 'aria-label': 'Start date' }}
                      sx={compactFieldSx}
                    />
                    <TextField
                      size="small" type="date" value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      inputProps={{ 'aria-label': 'End date' }}
                      sx={compactFieldSx}
                    />
                  </Box>

                  <AttendanceFilterSectionLabel icon={BusinessIcon}>Department</AttendanceFilterSectionLabel>
                  <DepartmentAutocomplete
                    value={department}
                    disabled={Boolean(trimmedEmployee)}
                    onChange={v => { setDepartment(v); setResultQuery(''); }}
                    departments={departmentOptions}
                    allLabel="All departments"
                    fontSize="0.76rem"
                    sx={{ mb: 1.25 }}
                    inputSx={{ ...filterCompactSelectSx, py: '1px !important' }}
                  />

                  <AttendanceFilterSectionLabel icon={CategoryIcon}>Employment category</AttendanceFilterSectionLabel>
                  <Select
                    size="small"
                    fullWidth
                    displayEmpty
                    value={employmentCategory}
                    disabled={Boolean(trimmedEmployee) || categoryGroups.length === 0}
                    onChange={e => handleCategoryChange(e.target.value)}
                    renderValue={(v) => (v ? employmentCategoryLabel || 'Selected category' : 'All employment categories')}
                    MenuListProps={{ dense: true }}
                    sx={{ ...filterCompactSelectSx, mb: 1.25 }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>All employment categories</MenuItem>
                    {categoryGroups.map(g => (
                      <React.Fragment key={g.token}>
                        <ListSubheader
                          sx={{
                            bgcolor: 'transparent',
                            lineHeight: '28px',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            color: T.muted,
                            borderTop: `1px solid ${T.divider}`,
                            py: 0,
                          }}
                        >
                          {g.label}
                        </ListSubheader>
                        <MenuItem value={g.token} sx={{ fontSize: '0.78rem', fontWeight: 700, minHeight: 32 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 700, noWrap: true }}>
                              {g.label}
                            </Typography>
                            <CategoryCount count={g.count} />
                          </Box>
                        </MenuItem>
                        {g.categories.map(c => (
                          <MenuItem key={c.token} value={c.token} sx={{ fontSize: '0.76rem', pl: 3.5, minHeight: 30 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                              <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.76rem', noWrap: true }}>
                                {c.label}
                              </Typography>
                              <CategoryCount count={c.count} />
                            </Box>
                          </MenuItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </Select>

                  <AttendanceFilterSectionLabel icon={Person}>Employee number (optional)</AttendanceFilterSectionLabel>
                  <TextField
                    size="small"
                    fullWidth
                    value={employeeNumber}
                    onChange={e => setEmployeeNumber(e.target.value)}
                    placeholder="Leave blank for everyone"
                    sx={{ ...compactFieldSx, mb: 0.75 }}
                  />
                  <Typography sx={{ fontSize: '0.64rem', color: T.muted, mb: 1.25, lineHeight: 1.45 }}>
                    {trimmedEmployee
                      ? `Only employee ${trimmedEmployee} will be shown — department and category are ignored.`
                      : `${scopeSentence}.`}
                  </Typography>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={fetchAttendanceData}
                    disabled={!canFetch}
                    startIcon={loading
                      ? <CircularProgress size={13} sx={{ color: '#fff' }} />
                      : <Search sx={{ fontSize: '14px !important' }} />}
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
                      '&.Mui-disabled': { bgcolor: alpha(T.accent, 0.35), color: '#fff' },
                    }}
                  >
                    {loading ? 'Loading…' : 'Fetch Records'}
                  </Button>

                  <AttendanceFilterSummaryBox
                    title="Record Summary"
                    primary={
                      loading
                        ? 'Loading records...'
                        : attendanceData.length > 0
                          ? `${resultStats.records} ${resultStats.records === 1 ? 'record' : 'records'} · ${resultStats.employees} ${resultStats.employees === 1 ? 'employee' : 'employees'}`
                          : 'No records loaded'
                    }
                    secondary={
                      startDate && endDate ? `${periodTitle} · ${startDate} → ${endDate}` : 'Select a month, then fetch records.'
                    }
                  />
                </Box>
              </SectionCard>
            </Grid>

            {/* RIGHT: Records */}
            <Grid item xs={12} lg={9}>
              <SectionCard ref={resultsRef} sx={{ ...attendanceMainPanelHeightSx, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Toolbar */}
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Assignment sx={{ fontSize: 15, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                        Attendance Summaries
                      </Typography>
                      {startDate && endDate && (
                        <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600 }} noWrap>
                          {periodTitle} · {startDate} → {endDate}
                        </Typography>
                      )}
                    </Box>
                    {attendanceData.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600 }}>
                          {filteredAttendanceData.length === attendanceData.length
                            ? `${attendanceData.length} ${attendanceData.length === 1 ? 'record' : 'records'}`
                            : `${filteredAttendanceData.length} of ${attendanceData.length} records`}
                        </Typography>
                        <TextField
                          size="small"
                          placeholder="Search name, number, or department"
                          value={resultQuery}
                          onChange={e => setResultQuery(e.target.value)}
                          sx={{ width: 260, ...compactFieldSx }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search sx={{ fontSize: 15, color: T.faint }} />
                              </InputAdornment>
                            ),
                            endAdornment: resultQuery ? (
                              <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setResultQuery('')} aria-label="Clear search" sx={{ p: 0.25 }}>
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </InputAdornment>
                            ) : null,
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Column groups + quick stats */}
                {attendanceData.length > 0 && !loading && (
                  <Box sx={{
                    px: 3, py: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap',
                    borderBottom: `1px solid ${T.divider}`, flexShrink: 0,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
                        <ViewColumn sx={{ fontSize: 13, color: alpha(T.accent, 0.55) }} />
                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.55) }}>
                          Show columns
                        </Typography>
                      </Box>
                      {COLUMN_GROUPS.filter(g => !g.alwaysVisible).map(grp => {
                        const on = !collapsedGroups.has(grp.key);
                        return (
                          <Box
                            key={grp.key}
                            role="button"
                            aria-pressed={on}
                            onClick={() => toggleGroup(grp.key)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 0.4,
                              px: 1, py: 0.4, borderRadius: '6px', cursor: 'pointer',
                              border: `1px solid ${on ? T.accent : T.accentBorder}`,
                              bgcolor: on ? T.accent : '#fff',
                              transition: 'all 0.14s ease',
                              '&:hover': on ? { bgcolor: T.accentDark } : { bgcolor: T.accentFaint, borderColor: T.accent },
                            }}
                          >
                            {on && <CheckIcon sx={{ fontSize: 12, color: '#fff' }} />}
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: on ? 700 : 600, color: on ? '#fff' : T.accent, lineHeight: 1 }}>
                              {grp.label}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      {[
                        { label: 'late', value: resultStats.late, color: T.tardiness.color },
                        { label: 'absent', value: resultStats.absent, color: T.absent.color },
                        { label: 'half day', value: resultStats.halfDay, color: T.halfDay.color },
                      ].map(s => (
                        <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: s.color }} />
                          <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600 }}>
                            <Box component="span" sx={{ color: T.text, fontWeight: 800 }}>{s.value}</Box> {s.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Records area */}
                <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                  {loading ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <CircularProgress size={32} sx={{ color: T.accent, mb: 2 }} />
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>
                        Loading attendance summaries…
                      </Typography>
                    </Box>
                  ) : attendanceData.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <Summarize sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                        Select a Period
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                        Choose a month from the left panel, then click Fetch Records.
                      </Typography>
                    </Box>
                  ) : filteredAttendanceData.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <InfoIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                        No matching records
                      </Typography>
                      <Typography
                        onClick={() => setResultQuery('')}
                        sx={{ fontSize: '0.78rem', color: T.accent, fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      >
                        Clear search
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{
                      flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      '&::-webkit-scrollbar': { height: 6, width: 6 },
                      '&::-webkit-scrollbar-track': { background: T.accentFaint },
                      '&::-webkit-scrollbar-thumb': { background: T.accentMid, borderRadius: 4 },
                    }}>
                      <Table sx={{ minWidth: tableMinWidth, borderCollapse: 'separate', borderSpacing: 0 }}>
                        <TableHead>
                          <TableRow>
                            {visibleColumns.map(({ label, key, group, grp }) => {
                              const isNameCol = key === '_fullName';
                              const tone = group ? getColHeaderBg(group) : grp.headerBg;
                              return (
                                <TableCell
                                  key={key}
                                  sx={{
                                    position: 'sticky', top: 0,
                                    ...(isNameCol ? { left: 0, zIndex: 4, boxShadow: '10px 0 12px -12px rgba(0,0,0,0.5)' } : { zIndex: 2 }),
                                    minWidth: isNameCol ? NAME_COL_W : 140,
                                    textAlign: isNameCol ? 'left' : 'center',
                                    bgcolor: T.accent,
                                    borderBottom: `3px solid ${tone === T.accentDark ? T.accentDark : tone}`,
                                    px: isNameCol ? 2 : 1.75, py: 1.1,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {!grp.alwaysVisible && (
                                    <Typography sx={{ fontSize: '0.54rem', fontWeight: 700, color: '#fff', opacity: 0.7, lineHeight: 1.2, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                                      {grp.label}
                                    </Typography>
                                  )}
                                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                                    {label}
                                  </Typography>
                                </TableCell>
                              );
                            })}
                            <TableCell sx={{
                              position: 'sticky', top: 0, right: 0, zIndex: 4,
                              minWidth: ACTIONS_COL_W, textAlign: 'center',
                              bgcolor: T.accent,
                              borderBottom: `3px solid ${T.accentDark}`,
                              px: 1.5, py: 1.1,
                              boxShadow: '-10px 0 12px -12px rgba(0,0,0,0.5)',
                            }}>
                              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Actions</Typography>
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {filteredAttendanceData.map((record, index) => {
                            const isEditing = Boolean(editRecord && editRecord.id === record.id);
                            return (
                              <TableRow
                                key={index}
                                sx={{
                                  '&:hover td:not(.actions-col):not(.name-col)': { bgcolor: T.rowHover },
                                  '&:hover td.name-col': { bgcolor: '#f8f0f0' },
                                }}
                              >
                                {visibleColumns.map(({ key, group }) => {
                                  const isDateListCol = key === '_absentTotalDays' || key === '_halfTotalDays';
                                  const isNameCol = key === '_fullName';
                                  const displayVal = record[key];
                                  const filled = hasValue(displayVal);
                                  const canEditCell = isEditing && key !== 'code' && !String(key).startsWith('_');
                                  const pill = group ? getPillStyle(group) : null;

                                  let content;
                                  if (canEditCell) {
                                    content = (
                                      <input
                                        className="oa-input"
                                        value={editRecord[key] ?? ''}
                                        onChange={e => setEditRecord({ ...editRecord, [key]: e.target.value })}
                                        style={{
                                          width: '110px', padding: '5px 8px', borderRadius: '7px',
                                          border: `1px solid ${T.accentBorder}`, fontSize: '0.8rem',
                                          fontFamily: 'monospace', outline: 'none',
                                          background: '#fff', color: T.text,
                                        }}
                                      />
                                    );
                                  } else if (isNameCol) {
                                    content = (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                        <Avatar sx={{
                                          width: 32, height: 32, fontSize: '0.7rem', fontWeight: 800,
                                          bgcolor: T.accentFaint, color: T.accent,
                                          border: `1px solid ${T.accentBorder}`,
                                        }}>
                                          {getInitials(displayVal)}
                                        </Avatar>
                                        <Typography noWrap sx={{ fontSize: '0.84rem', fontWeight: 700, color: T.text, maxWidth: NAME_COL_W - 72 }}>
                                          {filled ? displayVal : '—'}
                                        </Typography>
                                      </Box>
                                    );
                                  } else if (key === 'code') {
                                    content = filled ? (
                                      <Box component="span" sx={{
                                        display: 'inline-block', px: 1.2, py: 0.3,
                                        borderRadius: R.pill, fontSize: '0.72rem', fontWeight: 700,
                                        color: T.accent, bgcolor: T.accentFaint,
                                        border: `1px solid ${T.accentBorder}`,
                                      }}>
                                        {displayVal}
                                      </Box>
                                    ) : <Box component="span" sx={{ color: T.faint }}>—</Box>;
                                  } else if (pill) {
                                    if (!filled) {
                                      content = <Box component="span" sx={{ color: T.faint, fontWeight: 500 }}>—</Box>;
                                    } else {
                                      const inner = (
                                        <Box component="span" sx={{
                                          display: 'inline-block',
                                          px: 1.1, py: 0.4,
                                          borderRadius: isDateListCol ? '9px' : '8px',
                                          bgcolor: pill.bg, color: pill.color,
                                          border: `1px solid ${pill.border}`,
                                          fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem',
                                          whiteSpace: isDateListCol ? 'normal' : 'nowrap',
                                          lineHeight: isDateListCol ? 1.35 : 1.4,
                                          cursor: isDateListCol ? 'default' : undefined,
                                        }}>
                                          {displayVal}
                                        </Box>
                                      );
                                      content = isDateListCol ? (
                                        <Tooltip title={String(displayVal)} placement="top" enterDelay={300}>
                                          {inner}
                                        </Tooltip>
                                      ) : inner;
                                    }
                                  } else {
                                    content = filled ? displayVal : <Box component="span" sx={{ color: T.faint, fontWeight: 500 }}>—</Box>;
                                  }

                                  return (
                                    <TableCell
                                      key={key}
                                      className={isNameCol ? 'name-col' : undefined}
                                      sx={{
                                        fontSize: '0.8rem',
                                        fontVariantNumeric: 'tabular-nums',
                                        borderBottom: `1px solid ${T.divider}`,
                                        px: isNameCol ? 2 : 1.75, py: 1.15,
                                        textAlign: isNameCol ? 'left' : 'center',
                                        whiteSpace: isDateListCol ? 'normal' : 'nowrap',
                                        maxWidth: isDateListCol ? 300 : undefined,
                                        fontWeight: 500,
                                        color: key === 'personID' ? T.muted : getCellColor(group),
                                        bgcolor: isEditing && !isNameCol ? T.accentFaint : undefined,
                                        transition: 'background-color 0.12s',
                                        ...(isNameCol ? {
                                          position: 'sticky', left: 0, zIndex: 1,
                                          minWidth: NAME_COL_W,
                                          bgcolor: isEditing ? '#f8f0f0' : '#fff',
                                          boxShadow: '10px 0 12px -12px rgba(0,0,0,0.25)',
                                        } : {}),
                                      }}
                                    >
                                      {content}
                                    </TableCell>
                                  );
                                })}

                                {/* Actions cell — sticky right, always opaque */}
                                <TableCell
                                  className="actions-col"
                                  sx={{
                                    position: 'sticky',
                                    right: 0,
                                    zIndex: 3,
                                    minWidth: ACTIONS_COL_W,
                                    borderBottom: `1px solid ${T.divider}`,
                                    px: 1.5,
                                    py: 0.9,
                                    bgcolor: isEditing ? '#f8f0f0' : '#fff',
                                    boxShadow: '-10px 0 12px -12px rgba(0,0,0,0.3)',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'center' }}>
                                    {isEditing ? (
                                      <>
                                        <IconAction
                                          icon={<SaveIcon sx={{ fontSize: 13 }} />}
                                          label="Save"
                                          color="#166534"
                                          hoverBg="rgba(21,128,61,0.08)"
                                          onClick={updateRecord}
                                        />
                                        <IconAction
                                          icon={<CancelIcon sx={{ fontSize: 13 }} />}
                                          label="Cancel"
                                          color={T.muted}
                                          hoverBg="rgba(0,0,0,0.05)"
                                          onClick={() => setEditRecord(null)}
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <IconAction
                                          icon={<EditIcon sx={{ fontSize: 13 }} />}
                                          label="Edit"
                                          color={T.accent}
                                          hoverBg={T.accentFaint}
                                          onClick={() => setEditRecord(record)}
                                        />
                                        <IconAction
                                          icon={<DeleteIcon sx={{ fontSize: 13 }} />}
                                          label="Delete"
                                          color="#991b1b"
                                          hoverBg="rgba(153,27,27,0.07)"
                                          onClick={() => deleteRecord(record.id, record.personID)}
                                        />
                                      </>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Box>

                {attendanceData.length > 0 && !loading && (
                  <>
                    {/* Legend */}
                    <Box sx={{ px: 3, py: 0.9, borderTop: `1px solid ${T.divider}`, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                      {[
                        { bg: T.rendered.bg, border: T.rendered.border, label: 'Rendered time' },
                        { bg: T.tardiness.bg, border: T.tardiness.border, label: 'Tardiness' },
                        { bg: T.halfDay.bg, border: T.halfDay.border, label: 'Half day' },
                        { bg: T.absent.bg, border: T.absent.border, label: 'Absences' },
                      ].map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: item.bg, border: `1px solid ${item.border}` }} />
                          <Typography sx={{ fontSize: '0.68rem', color: T.muted }}>{item.label}</Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Send to payroll */}
                    <Box sx={{
                      px: 3, py: 1.25,
                      borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap',
                    }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                          Send to payroll
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontWeight: 600 }}>
                          {payrollEligibility.loading
                            ? 'Checking employment categories…'
                            : `${payrollEligibility.jobOrder.length} Job Order · ${payrollEligibility.regular.length} Regular${payrollEligibility.missingCategory.length ? ` · ${payrollEligibility.missingCategory.length} no category` : ''}`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Job Order staff go straight to Job Order payroll">
                          <span>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setShowJOConfirm(true)}
                              disabled={isSubmittingJO}
                              startIcon={isSubmittingJO
                                ? <CircularProgress size={13} sx={{ color: T.accent }} />
                                : <Assignment sx={{ fontSize: '14px !important' }} />}
                              sx={outlinedBtnSx}
                            >
                              {isSubmittingJO ? 'Submitting…' : 'Submit Payroll JO'}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            !payrollEligibility.loading && payrollEligibility.regular.length === 0
                              ? 'Not available: none of the loaded employees has a Regular employment category. Job Order employees are paid through Submit Payroll JO.'
                              : 'Regular staff go to Earnings Management first (leave deductions, SC/CTO), then to payroll. Job Order employees are never sent here.'
                          }
                        >
                          <span>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={goToEarningsForRegularPayroll}
                              disabled={checkingRegular || (!payrollEligibility.loading && payrollEligibility.regular.length === 0)}
                              endIcon={<ChevronRightIcon sx={{ fontSize: '16px !important' }} />}
                              sx={{
                                textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: '6px',
                                bgcolor: T.accent, color: '#fff',
                                boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
                                '&:hover': { bgcolor: T.accentDark },
                                '&.Mui-disabled': { bgcolor: alpha(T.accent, 0.35), color: '#fff' },
                              }}
                            >
                              {checkingRegular ? 'Checking categories…' : 'Regular · Earnings Management'}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  </>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        </Box>

        {/* ═════════════ Employee roster drawer ═════════════ */}
        <Drawer
          anchor="right"
          open={rosterOpen}
          onClose={() => setRosterOpen(false)}
          // Sit between the app bar (62px) and footer (48px), same as the DTR hub drawer.
          sx={{ zIndex: 1200 }}
          PaperProps={{
            sx: {
              top: { xs: 0, sm: '62px' },
              bottom: { xs: 0, sm: '48px' },
              height: { xs: '100%', sm: 'auto' },
              maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 110px)' },
              width: { xs: '100%', sm: 400 },
              borderRadius: { xs: 0, sm: '14px 0 0 14px' },
              bgcolor: T.page,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          }}
        >
          <Box sx={{
            px: 2.5, py: 2,
            bgcolor: '#fff',
            borderBottom: `1px solid ${T.divider}`,
            borderLeft: `5px solid ${T.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: R.panel, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GroupsIcon sx={{ fontSize: 21, color: T.accent }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.98rem', fontWeight: 800, lineHeight: 1.2, color: T.text }}>Employee Checklist</Typography>
                <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 500 }}>
                  See whose summary is saved · click a name to load it
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setRosterOpen(false)}
              aria-label="Close employee list"
              sx={{ color: T.muted, '&:hover': { bgcolor: T.accentFaint } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ px: 1.5, pt: 1.5, bgcolor: T.page }}>
            <AttendanceFilterToggleRow
              options={[
                { val: 'Active', label: `Active employees (${rosterSummary.activeCount})` },
                { val: 'all', label: `Everyone (${rosterSummary.allCount})` },
              ]}
              value={rosterStatus}
              onChange={setRosterStatus}
            />
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 0 }}>
            <AttendanceRosterSidebar
              themeT={T}
              year={rosterYear}
              month={rosterMonth}
              onShiftMonth={shiftRosterMonth}
              rows={visibleRosterRows}
              loading={rosterLoading}
              error={rosterError}
              filter={rosterFilter}
              onFilter={setRosterFilter}
              query={rosterQuery}
              onQuery={setRosterQuery}
              department={rosterDepartment}
              onDepartment={setRosterDepartment}
              departments={rosterDepartments}
              onSelectEmployee={(row) => { selectRosterEmployee(row); setRosterOpen(false); }}
              selectedEmployeeNumber={employeeNumber}
              doneCount={rosterSummary.done}
              totalCount={rosterSummary.total}
            />
          </Box>
        </Drawer>

        {/* ── JO Confirm Dialog ── */}
        <PayrollConfirmDialog
          open={showJOConfirm}
          onClose={() => setShowJOConfirm(false)}
          onConfirm={submitPayrollJO}
          title="Job Order Payroll Submission"
          subtitle="The following records are pending submission to Job Order Payroll. Verify all entries are accurate before proceeding."
          recordCount={payrollEligibility.jobOrder.length}
          recordLabel="Job Order Payroll"
          isSubmitting={isSubmittingJO}
          checking={payrollEligibility.loading}
          excludedCount={payrollEligibility.regular.length + payrollEligibility.missingCategory.length}
          excludedNote={[
            payrollEligibility.regular.length ? `${payrollEligibility.regular.length} not a Job Order category (use Regular · Earnings Management)` : '',
            payrollEligibility.missingCategory.length ? `${payrollEligibility.missingCategory.length} with no employment category` : '',
          ].filter(Boolean).join('; ')}
        />

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

        {/* ── Overlays ── */}
        <LoadingOverlay open={processingOverlay} message={processingMessage || 'Processing...'} />
        <SuccessfulOverlay
          open={successOverlay}
          action={successAction}
          showOkButton
          onClose={() => { setSuccessOverlay(false); if (successRedirect) navigate(successRedirect); }}
        />
      </Box>
    </Fade>
  );
};

export default OverallAttendance;