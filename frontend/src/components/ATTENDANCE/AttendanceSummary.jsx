import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Collapse,
  Checkbox,
  Backdrop,
  Tooltip,
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
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Person,
  CalendarToday,
  Refresh,
  FilterList,
  Assignment,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import { ATTENDANCE_PAGE_BOTTOM_PAD } from './attendanceFilterLayout';
import {
  fetchEmploymentCategoryRow,
  isJobOrderEmploymentCategory,
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
  divider:      'rgba(0,0,0,0.08)',
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Shimmer bone ─────────────────────────────────────────────────────────────
const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const OverallAttendanceWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '53%', transform: 'translateX(-51%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box><Bone w={260} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
        </Box>
      </Box>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.1s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 42 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {[1,2,3].map(i => <Box key={i} sx={{ flex: 1, height: 40, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />)}
          </Box>
          <Box sx={{ border: `2px dashed ${T.accentBorder}`, borderRadius: '8px', p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {Array.from({ length: 12 }).map((_, i) => <Box key={i} sx={{ width: 64, height: 36, borderRadius: '6px', bgcolor: T.accentFaint }} />)}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.2s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
          {[100, 80, 80, 80].map((w, i) => <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)' }} />)}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd }}>
            <Bone w={120} h={12} /><Bone w={80} h={12} /><Bone w={80} h={12} /><Box sx={{ width: 90, height: 24, borderRadius: '12px', bgcolor: T.accentFaint }} />
          </Box>
        ))}
      </Box>
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

const PanelHeader = ({ icon: Icon, title, rightContent }) => (
  <Box sx={{
    px: 2.5, py: 1.5,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${T.divider}`,
    bgcolor: T.accentFaint,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>{title}</Typography>
    </Box>
    {rightContent}
  </Box>
);

const NativeInput = ({ value, onChange, type = 'text', placeholder, disabled, icon }) => (
  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && (
      <Box sx={{ position: 'absolute', left: 10, color: T.accentMid, display: 'flex', alignItems: 'center', zIndex: 1, pointerEvents: 'none' }}>
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
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

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
      display: 'flex', alignItems: 'center', gap: '4px',
      fontSize: '0.72rem', fontWeight: 700,
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: `0.5px solid rgba(0,0,0,0.09)`, bgcolor: '#fff' } }}>
      <Box sx={{ px: 3, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent,0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.45, '&:hover': { opacity: 1, bgcolor: T.accentFaint } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: cfg.avatarBg, width: 48, height: 48, border: `1px solid ${T.accentBorder}` }}>
            {cfg.icon}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: T.accent, lineHeight: 1.2 }}>{title}</Typography>
              <Chip label={cfg.label} size="small" sx={{ bgcolor: alpha(cfg.labelColor, 0.1), color: cfg.labelColor, fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.07em', textTransform: 'uppercase', height: 18, borderRadius: '5px', border: `1px solid ${alpha(cfg.labelColor, 0.2)}` }} />
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}` }}>
        {lines.map((line, i) => {
          if (isListItem(line)) {
            const clean = line.replace(/^[•\-]\s*/, '');
            const [empPart, ...rest] = clean.split(':');
            return (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, px: 1.5, py: 1, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '6px', flexShrink: 0, bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Person sx={{ fontSize: 14, color: T.accent, opacity: 0.7 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{empPart?.trim()}</Typography>
                  {rest.length > 0 && <Typography sx={{ fontSize: '0.74rem', color: T.muted, fontWeight: 500, mt: 0.1 }}>{rest.join(':').trim()}</Typography>}
                </Box>
              </Box>
            );
          }
          if (isNote(line)) {
            return (
              <Box key={i} sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderLeft: `4px solid ${alpha(T.accent, 0.5)}`, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 13, color: T.accent, opacity: 0.6, mt: 0.2, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 600, lineHeight: 1.65 }}>{line}</Typography>
              </Box>
            );
          }
          return (
            <Typography key={i} sx={{ fontSize: '0.88rem', color: T.muted, lineHeight: 1.8, fontWeight: 500, mb: i < lines.length - 1 ? 1 : 0 }}>{line}</Typography>
          );
        })}
      </Box>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {showCancel && (
          <RowBtn icon={null} label="Cancel" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={onClose} />
        )}
        <button
          onClick={onConfirm || onClose}
          style={{
            background: T.accent, color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem',
            fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.accent; }}
        >
          {showCancel ? 'Confirm' : 'OK'}
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Payroll Confirmation Dialog ──────────────────────────────────────────────
const PayrollConfirmDialog = ({ open, onClose, onConfirm, title, subtitle, recordCount, recordLabel, isSubmitting }) => {
  const [checked, setChecked] = useState(false);
  useEffect(() => { if (!open) setChecked(false); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: `0.5px solid rgba(0,0,0,0.09)`, bgcolor: '#fff' } }}>
      <Box sx={{ px: 3, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent,0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.45, '&:hover': { opacity: 1, bgcolor: T.accentFaint } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: T.accentFaint, width: 48, height: 48, border: `1px solid ${T.accentBorder}` }}>
            <Assignment sx={{ fontSize: 22, color: T.accent }} />
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: T.accent, lineHeight: 1.2 }}>{title}</Typography>
              <Chip label="Confirmation" size="small" sx={{ bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.07em', textTransform: 'uppercase', height: 18, borderRadius: '5px', border: `1px solid ${T.accentBorder}` }} />
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}` }}>
        <Typography sx={{ fontSize: '0.88rem', color: T.muted, lineHeight: 1.8, fontWeight: 500, mb: 2 }}>
          {subtitle || 'The following records are pending submission. Verify all entries are accurate before proceeding.'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, px: 1.5, py: 1.25, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '6px', flexShrink: 0, bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Assignment sx={{ fontSize: 16, color: T.accent }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Records for Submission</Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
              {recordCount} {recordCount === 1 ? 'Record' : 'Records'} — {recordLabel}
            </Typography>
          </Box>
        </Box>
        <Box
          onClick={() => setChecked(p => !p)}
          sx={{
            p: 2, borderRadius: '8px', cursor: 'pointer',
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
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <RowBtn icon={null} label="Cancel" color={T.muted} hoverBg="rgba(0,0,0,0.05)" onClick={onClose} />
        <button
          disabled={!checked || isSubmitting}
          onClick={() => { onClose(); onConfirm(); }}
          style={{
            background: !checked || isSubmitting ? alpha(T.accent, 0.3) : T.accent,
            color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem',
            fontFamily: 'inherit',
            cursor: !checked || isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => { if (checked && !isSubmitting) e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={e => { if (checked && !isSubmitting) e.currentTarget.style.background = T.accent; }}
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
// The detail groups (Morning, Afternoon, etc.) are collapsed by default and
// sit to the right — users expand them only when needed.
const COLUMN_GROUPS = [
  {
    key: 'core',
    label: 'Core',
    alwaysVisible: true,
    headerBg: T.accentDark,
    columns: [
      { label: 'Department',   key: 'code' },
      { label: 'Employee No.', key: 'personID' },
      { label: 'Start Date',   key: 'startDate' },
      { label: 'End Date',     key: 'endDate' },
    ],
  },
  // ── Key summary columns — always visible, no scrolling needed ──────────────
  {
    key: 'overall',
    label: 'Overall',
    headerBg: '#0f4a26',
    columns: [
      { label: 'Overall Rendered',  key: 'overallRenderedOfficialTime',          group: 'overall' },
      { label: 'Overall Tardiness', key: 'overallRenderedOfficialTimeTardiness', group: 'overallTard' },
      { label: 'Late Total',        key: '_lateTotal',                           group: 'tardiness' },
    ],
  },
  {
    key: 'absence',
    label: 'Absence',
    headerBg: '#6a1b9a',
    columns: [
      { label: 'Half Day Total', key: '_halfTotalDays',   group: 'halfday' },
      { label: 'Absent Total',   key: '_absentTotalDays', group: 'absent' },
    ],
  },
  // ── Detail groups — collapsed by default, expand on demand ─────────────────
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
      { label: 'HN Tardiness', key: 'totalRenderedHonorariumTardiness', group: 'tardiness' },
    ],
  },
  {
    key: 'serviceCredit',
    label: 'Service Credit',
    headerBg: '#6b21a8',
    columns: [
      { label: 'Service Credit', key: 'totalRenderedServiceCredit',          group: 'rendered' },
      { label: 'SC Tardiness',   key: 'totalRenderedServiceCreditTardiness', group: 'tardiness' },
    ],
  },
  {
    key: 'overtime',
    label: 'Overtime',
    headerBg: '#92400e',
    columns: [
      { label: 'Overtime',     key: 'totalRenderedOvertime',          group: 'rendered' },
      { label: 'OT Tardiness', key: 'totalRenderedOvertimeTardiness', group: 'tardiness' },
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
  const [loading, setLoading]               = useState(false);
  const [pageLoading, setPageLoading]       = useState(true);
  const [processingOverlay, setProcessingOverlay] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [successOverlay, setSuccessOverlay]       = useState(false);
  const [successRedirect, setSuccessRedirect]     = useState('');
  const [successAction, setSuccessAction]         = useState('send');
  const resultsRef = useRef(null);

  // ── Collapsible column groups ─────────────────────────────────────────────
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
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
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

  // Restore inputs from workflow navigation only (not logged-in user localStorage).
  useEffect(() => {
    const st = location.state;
    const inWorkflow = st?.fromAttendanceWorkflow === true || st?.fromDevice === true;
    if (!inWorkflow) return;

    const en = st?.employeeNumber != null ? String(st.employeeNumber).trim() : '';
    if (!en) return;

    setEmployeeNumber(en);
    if (st.startDate) setStartDate(String(st.startDate).slice(0, 10));
    if (st.endDate) setEndDate(String(st.endDate).slice(0, 10));
  }, [location.key]);

  // ── Month picker ──────────────────────────────────────────────────────────
  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAttendanceData = async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() },
      );
      if (response.status === 200) {
        const overallRows = response.data.data;

        const buildBucketStringsFromStored = (r) => {
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

          return { absentDisplay, halfDayStr };
        };

        setAttendanceData(
          (Array.isArray(overallRows) ? overallRows : []).map((r) => {
            const stored = buildBucketStringsFromStored(r);
            const overallSaved = r.overallRenderedOfficialTimeTardiness;
            const savedTrim =
              overallSaved != null && String(overallSaved).trim() !== ''
                ? String(overallSaved).trim()
                : '';
            let lateTotalResolved;
            if (r?.lateTotalTime != null && String(r.lateTotalTime).trim() !== '') {
              lateTotalResolved = String(r.lateTotalTime).trim();
            } else {
              lateTotalResolved = savedTrim || '';
            }
            return {
              ...r,
              _absentTotalDays: stored.absentDisplay ?? null,
              _halfTotalDays:   stored.halfDayStr    ?? null,
              _lateTotal:       lateTotalResolved,
            };
          }),
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

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const updateRecord = async () => {
    if (!editRecord || !editRecord.totalRenderedTimeMorning) return;
    try {
      await axios.put(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/${editRecord.id}`,
        editRecord,
        getAuthHeaders(),
      );
      showModal('Update Successful', 'Record updated successfully.', 'success', () => {
        fetchAttendanceData();
        window.location.reload();
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

  const goToEarningsForRegularPayroll = () => {
    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning');
      return;
    }
    navigate('/earnings-management', {
      state: {
        fromAttendanceSummaryRegular: true,
        payrollAttendanceRecords: attendanceData.map((r) => ({
          ...r,
          overallRenderedOfficialTimeTardiness:
            r.overallRenderedOfficialTimeTardiness != null &&
            String(r.overallRenderedOfficialTimeTardiness).trim() !== ''
              ? r.overallRenderedOfficialTimeTardiness
              : r._lateTotal != null && String(r._lateTotal).trim() !== ''
                ? r._lateTotal
                : '',
        })),
      },
    });
  };

  // ── Payroll JO ────────────────────────────────────────────────────────────
  const submitPayrollJO = async () => {
    if (isSubmittingJO) return;
    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning'); return;
    }
    setIsSubmittingJO(true);
    setProcessingOverlay(true);
    setProcessingMessage('Submitting JO payroll...');
    try {
      const filteredRecords = [], invalidRecords = [];
      for (const record of attendanceData) {
        const empNum = record.personID || record.employeeNumber;
        const catRow = await fetchEmploymentCategoryRow(empNum);
        if (!catRow || catRow.employmentCategory == null || catRow.employmentCategory === '') {
          invalidRecords.push({ employeeNumber: empNum, reason: 'Employment category not found in system' });
          continue;
        }
        if (isJobOrderEmploymentCategory(catRow)) filteredRecords.push(record);
        else
          invalidRecords.push({
            employeeNumber: empNum,
            reason: 'Not Job Order (J0) — use Regular payroll for this employment category',
          });
      }

      if (invalidRecords.length > 0) {
        if (filteredRecords.length === 0) {
          showModal(
            'Submission Blocked — Job Order Payroll',
            `The following employee(s) could not be processed for Job Order (JO) Payroll submission:\n\n${invalidRecords.map(r => `• Employee ${r.employeeNumber}: ${r.reason}`).join('\n')}\n\nPlease verify and update the employment status on record before resubmitting.`,
            'warning',
          );
          setProcessingOverlay(false); setIsSubmittingJO(false); return;
        }
        showModal(
          'Confirm Submission',
          `${filteredRecords.length} eligible record(s)\n${invalidRecords.length} excluded\n\nProceed with submission?`,
          'warning',
          async () => { closeModal(); await continuePayrollJOSubmission(filteredRecords); },
          true,
        );
        setProcessingOverlay(false); return;
      }
      await continuePayrollJOSubmission(filteredRecords);
    } catch (error) {
      console.error('Error submitting Payroll JO:', error);
      handlePayrollJOError(error);
    } finally {
      setProcessingOverlay(false); setIsSubmittingJO(false);
    }
  };

  const continuePayrollJOSubmission = async (filteredRecords) => {
    try {
      const duplicateRecords = [];
      for (const record of filteredRecords) {
        const empNum = record.personID || record.employeeNumber;
        const { startDate, endDate } = record;
        try {
          const checkResponse = await axios.get(
            `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
            { ...getAuthHeaders(), params: { employeeNumber: empNum, startDate, endDate } },
          );
          if (checkResponse.data && checkResponse.data.length > 0)
            duplicateRecords.push({ employeeNumber: empNum, startDate, endDate });
        } catch (checkError) {
          if (checkError.response?.status === 404) continue;
          console.warn(`Could not check duplicate for ${empNum}:`, checkError);
        }
      }

      if (duplicateRecords.length > 0) {
        showModal(
          'Duplicate Entries — Job Order Payroll',
          `The system has detected existing Job Order Payroll records for the specified period:\n\n${duplicateRecords.map(r => `• Employee ${r.employeeNumber}: ${r.startDate} → ${r.endDate}`).join('\n')}\n\nPlease verify and review the existing entries before resubmitting.`,
          'warning',
        );
        setProcessingOverlay(false); return;
      }

      let successCount = 0, failedRecords = [];
      for (const record of filteredRecords) {
        try {
          let rhHours = 0;
          if (record.overallRenderedOfficialTime) {
            const parts = record.overallRenderedOfficialTime.split(':');
            rhHours = parseInt(parts[0], 10) || 0;
          }
          let h = 0, m = 0, s = 0;
          const tardStr =
            record.overallRenderedOfficialTimeTardiness != null &&
            String(record.overallRenderedOfficialTimeTardiness).trim() !== ''
              ? record.overallRenderedOfficialTimeTardiness
              : record._lateTotal != null && String(record._lateTotal).trim() !== ''
                ? record._lateTotal
                : '';
          if (tardStr) {
            const tParts = String(tardStr).split(':');
            h = parseInt(tParts[0], 10) || 0;
            m = parseInt(tParts[1], 10) || 0;
            s = parseInt(tParts[2], 10) || 0;
          }
          const payload = {
            employeeNumber: record.employeeNumber || record.personID,
            startDate: record.startDate,
            endDate: record.endDate,
            h, m, s, rh: rhHours,
            department: record.code,
          };
          console.log('Submitting JO payload:', payload);
          await axios.post(`${API_BASE_URL}/PayrollJORoutes/payroll-jo`, payload, getAuthHeaders());
          successCount++;
        } catch (recordError) {
          console.error(`Failed to submit record for ${record.personID}:`, recordError);
          const errorMsg = recordError.response?.data?.message || recordError.response?.data?.error || 'Unknown error';
          failedRecords.push({ employeeNumber: record.personID || record.employeeNumber, error: errorMsg });
        }
      }

      if (failedRecords.length > 0) {
        const failedList = failedRecords.map(r => `• Employee ${r.employeeNumber}: ${r.error}`).join('\n');
        if (successCount > 0)
          showModal('Partial Success', `Submitted: ${successCount}\nFailed: ${failedRecords.length}\n\n${failedList}`, 'warning');
        else
          showModal('Submission Failed', `All submissions failed:\n\n${failedList}`, 'error');
        setProcessingOverlay(false);
      } else {
        setProcessingOverlay(false);
        setSuccessAction('send'); setSuccessRedirect('/payroll-jo'); setSuccessOverlay(true);
      }
    } catch (error) { handlePayrollJOError(error); }
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

  // ── Cell color / bg helpers ───────────────────────────────────────────────
  const getCellColor = (group) => {
    if (group === 'rendered')    return '#166534';
    if (group === 'tardiness')   return '#991b1b';
    if (group === 'halfday')     return '#8B5E00';
    if (group === 'absent')      return '#6a1b9a';
    if (group === 'overall')     return '#166534';
    if (group === 'overallTard') return '#991b1b';
    return T.text;
  };

  const getCellBg = (group, isEven) => {
    if (group === 'rendered')    return isEven ? 'rgba(21,128,61,0.05)'  : 'rgba(21,128,61,0.09)';
    if (group === 'tardiness')   return isEven ? 'rgba(153,27,27,0.04)'  : 'rgba(153,27,27,0.08)';
    if (group === 'halfday')     return isEven ? 'rgba(139,94,0,0.05)'   : 'rgba(139,94,0,0.09)';
    if (group === 'absent')      return isEven ? 'rgba(106,27,154,0.05)' : 'rgba(106,27,154,0.09)';
    if (group === 'overall')     return isEven ? 'rgba(21,128,61,0.09)'  : 'rgba(21,128,61,0.14)';
    if (group === 'overallTard') return isEven ? 'rgba(153,27,27,0.09)'  : 'rgba(153,27,27,0.14)';
    return isEven ? '#fff' : T.rowOdd;
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

  // ── Group toggle row height (px) — used for sticky offset of col-label row ─
  const GROUP_ROW_H = 30;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        pb: ATTENDANCE_PAGE_BOTTOM_PAD,
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '53%',
        transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{shimmerKf}</style>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <SummarizeOutlined sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Overall Attendance Report
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                  Generate and review summary of overall attendance records
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
                  <CheckCircleIcon sx={{ fontSize: 12 }} /> System Generated
                </Typography>
              </Box>
              <button
                onClick={fetchAttendanceData}
                disabled={!employeeNumber || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: '8px', padding: '7px 10px',
                  cursor: (!employeeNumber || !startDate || !endDate) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  color: T.accent, fontSize: '0.75rem', fontWeight: 700,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  opacity: (!employeeNumber || !startDate || !endDate) ? 0.5 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}
              >
                <Refresh sx={{ fontSize: 15 }} /> Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            {/* Input row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Employee Number
                </Typography>
                <NativeInput
                  value={employeeNumber}
                  onChange={e => setEmployeeNumber(e.target.value)}
                  placeholder="Employee number"
                  icon={<Person sx={{ fontSize: 16 }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Start Date
                </Typography>
                <NativeInput
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15 }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  End Date
                </Typography>
                <NativeInput
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15 }} />}
                />
              </Box>
            </Box>

            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />

            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FilterList sx={{ fontSize: 13 }} /> Quick Date Selection
            </Typography>

            {/* Month picker */}
            <Box sx={{ p: 2.5, borderRadius: 2, border: `2px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, mb: 0.3 }}>Select Entire Month</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>Choose a year, then click any month to set the date range</Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={e => { setSelectedYear(e.target.value); setSelectedMonth(null); }}
                    sx={{ bgcolor: '#fff', borderRadius: 2, fontWeight: 600, fontSize: '0.85rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder } }}
                  >
                    {yearOptions.map(y => <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthClick(index)}
                      style={{
                        background: sel ? T.accent : '#fff',
                        border: `1px solid ${sel ? T.accent : T.accentBorder}`,
                        borderRadius: '6px', padding: '7px 14px',
                        cursor: 'pointer',
                        color: sel ? '#fff' : T.accent,
                        fontSize: '0.75rem', fontWeight: 700,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                        boxShadow: sel ? `0 2px 8px ${alpha(T.accent, 0.25)}` : 'none',
                        letterSpacing: '0.04em',
                      }}
                      onMouseEnter={e => { if (!sel) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; }}}
                      onMouseLeave={e => { if (!sel) { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = T.accentBorder; }}}
                    >
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>

            {/* Search button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <RowBtn
                icon={loading ? <CircularProgress size={12} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 13 }} />}
                label={loading ? 'Loading…' : 'Fetch Records'}
                color={T.accent}
                hoverBg={T.accentFaint}
                disabled={!employeeNumber || !startDate || !endDate || loading}
                onClick={fetchAttendanceData}
              />
            </Box>
          </Box>
        </SectionCard>

        {/* ── Loading indicator ── */}
        {loading && (
          <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Fetching attendance records…</Typography>
          </Box>
        )}

        {/* ── Results Table ── */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={400}>
            <SectionCard ref={resultsRef} sx={{ mb: 2 }}>
              <PanelHeader
                icon={Summarize}
                title={`Records${employeeNumber ? ` for ${employeeNumber}` : ''}`}
                rightContent={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                      {startDate} → {endDate}
                    </Typography>
                    <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {attendanceData.length} {attendanceData.length === 1 ? 'record' : 'records'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              <Box sx={{ px: 2.5, py: 2.5 }}>
                <Box sx={{ position: 'relative', borderRadius: '8px', border: `1px solid ${T.accentBorder}`, overflow: 'hidden' }}>
                  <Box sx={{
                    overflowX: 'auto', overflowY: 'auto', maxHeight: 500,
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { height: 6, width: 6 },
                    '&::-webkit-scrollbar-track': { background: T.accentFaint, borderRadius: 4 },
                    '&::-webkit-scrollbar-thumb': { background: T.accentMid, borderRadius: 4 },
                  }}>
                    {/*
                      minWidth calculation: count total visible leaf columns.
                      Collapsed groups contribute 0 visible columns but 1 zero-width cell,
                      so we only sum widths of expanded group columns.
                    */}
                    <Table sx={{
                      minWidth: COLUMN_GROUPS.reduce((sum, grp) => {
                        const isCollapsed = !grp.alwaysVisible && collapsedGroups.has(grp.key);
                        return sum + (isCollapsed ? 0 : grp.columns.length * 140);
                      }, 160),
                      borderCollapse: 'collapse',
                    }}>
                      <TableHead>

                        {/* ── Row 1: Group toggle headers ── */}
                        <TableRow>
                          {COLUMN_GROUPS.map(grp => {
                            const isCore      = grp.alwaysVisible;
                            const isCollapsed = !isCore && collapsedGroups.has(grp.key);
                            const colSpan = isCollapsed ? 1 : grp.columns.length;

                            return (
                              <TableCell
                                key={grp.key}
                                colSpan={colSpan}
                                onClick={isCore ? undefined : () => toggleGroup(grp.key)}
                                sx={{
                                  position: 'sticky', top: 0, zIndex: 3,
                                  background: grp.headerBg,
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  py: 0.65,
                                  px: 1,
                                  height: `${GROUP_ROW_H}px`,
                                  cursor: isCore ? 'default' : 'pointer',
                                  borderBottom: `1px solid rgba(255,255,255,0.12)`,
                                  borderRight: `2px solid rgba(255,255,255,0.22)`,
                                  whiteSpace: 'nowrap',
                                  userSelect: 'none',
                                  transition: 'opacity 0.15s, background 0.15s',
                                  '&:hover': isCore ? {} : { opacity: 0.85 },
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  {!isCore && (
                                    isCollapsed
                                      ? <KeyboardArrowRightIcon sx={{ fontSize: 13, opacity: 0.9 }} />
                                      : <KeyboardArrowDownIcon  sx={{ fontSize: 13, opacity: 0.9 }} />
                                  )}
                                  <span>{grp.label}</span>
                                  {!isCore && !isCollapsed && (
                                    <Box component="span" sx={{
                                      fontSize: '0.52rem',
                                      bgcolor: 'rgba(255,255,255,0.18)',
                                      borderRadius: '3px',
                                      px: 0.5, py: 0.1,
                                      ml: 0.25,
                                    }}>
                                      hide
                                    </Box>
                                  )}
                                  {!isCore && isCollapsed && (
                                    <Box component="span" sx={{
                                      fontSize: '0.52rem',
                                      bgcolor: 'rgba(255,255,255,0.18)',
                                      borderRadius: '3px',
                                      px: 0.5, py: 0.1,
                                      ml: 0.25,
                                    }}>
                                      show
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                            );
                          })}

                          {/* Actions group header */}
                          <TableCell sx={{
                            position: 'sticky', top: 0, right: 0, zIndex: 5,
                            background: T.accentDark,
                            color: '#fff',
                            textAlign: 'center',
                            fontSize: '0.62rem', fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            py: 0.65, px: 1,
                            height: `${GROUP_ROW_H}px`,
                            borderBottom: `1px solid rgba(255,255,255,0.12)`,
                            boxShadow: `-10px 0 12px -12px rgba(0,0,0,0.5)`,
                            whiteSpace: 'nowrap',
                          }}>
                            Actions
                          </TableCell>
                        </TableRow>

                        {/* ── Row 2: Column labels — mirrors Row 1 cell-for-cell ── */}
                        {/*                                                           */}
                        {/*  KEY FIX: we iterate COLUMN_GROUPS (same as Row 1),      */}
                        {/*  not visibleColumns. For each collapsed group we place    */}
                        {/*  one zero-width placeholder so both rows stay in sync.    */}
                        <TableRow>
                          {COLUMN_GROUPS.map(grp => {
                            const isCore      = grp.alwaysVisible;
                            const isCollapsed = !isCore && collapsedGroups.has(grp.key);

                            if (isCollapsed) {
                              // One invisible placeholder cell — keeps column count
                              // in sync with Row 1's single collapsed toggle cell.
                              return (
                                <TableCell
                                  key={grp.key + '_lbl_placeholder'}
                                  sx={{
                                    padding: 0,
                                    width: 0,
                                    minWidth: 0,
                                    maxWidth: 0,
                                    overflow: 'hidden',
                                    position: 'sticky',
                                    top: GROUP_ROW_H,
                                    zIndex: 2,
                                    background: grp.headerBg,
                                    borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
                                  }}
                                />
                              );
                            }

                            // Expanded group — render one labelled cell per column
                            return grp.columns.map(({ label, key, group }) => (
                              <TableCell key={key} sx={{
                                minWidth: 140,
                                textAlign: 'center',
                                position: 'sticky',
                                top: GROUP_ROW_H,
                                zIndex: 2,
                                fontSize: '0.63rem',
                                fontWeight: 700,
                                py: 0.9, px: 1.75,
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
                                color: '#fff',
                                background: getColHeaderBg(group),
                              }}>
                                {label}
                              </TableCell>
                            ));
                          })}

                          {/* Actions column label */}
                          <TableCell sx={{
                            minWidth: 160, textAlign: 'center',
                            position: 'sticky', top: GROUP_ROW_H, right: 0, zIndex: 4,
                            fontSize: '0.63rem', fontWeight: 700,
                            py: 0.9, px: 1.75, whiteSpace: 'nowrap',
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
                            color: '#fff', background: T.accentDark,
                            boxShadow: `-10px 0 12px -12px ${alpha('#000', 0.5)}`,
                          }}>
                            &nbsp;
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {attendanceData.map((record, index) => {
                          const isEven = index % 2 === 0;
                          return (
                            <TableRow
                              key={index}
                              sx={{
                                '&:hover td:not(.actions-col)': { bgcolor: `${T.rowHover} !important` },
                              }}
                            >
                              {/* ── KEY FIX: iterate COLUMN_GROUPS, not visibleColumns ── */}
                              {COLUMN_GROUPS.flatMap(grp => {
                                const isCore      = grp.alwaysVisible;
                                const isCollapsed = !isCore && collapsedGroups.has(grp.key);

                                if (isCollapsed) {
                                  // Zero-width placeholder to mirror Row 1 collapsed cell
                                  return (
                                    <TableCell
                                      key={grp.key + '_data_placeholder_' + index}
                                      sx={{
                                        padding: 0,
                                        width: 0,
                                        minWidth: 0,
                                        maxWidth: 0,
                                        overflow: 'hidden',
                                        borderBottom: `1px solid ${T.divider}`,
                                      }}
                                    />
                                  );
                                }

                                // Expanded group — render one data cell per column
                                return grp.columns.map(({ key, group }) => {
                                  const isDateListCol = key === '_absentTotalDays' || key === '_halfTotalDays';
                                  const displayVal = record[key];
                                  return (
                                    <TableCell key={key} sx={{
                                      fontSize: '0.8rem',
                                      fontFamily: group ? 'monospace' : 'inherit',
                                      borderBottom: `1px solid ${T.divider}`,
                                      px: 1.75, py: 1,
                                      textAlign: 'center',
                                      whiteSpace: isDateListCol ? 'normal' : 'nowrap',
                                      maxWidth: isDateListCol ? 300 : undefined,
                                      lineHeight: isDateListCol ? 1.35 : undefined,
                                      fontWeight: group ? 700 : 500,
                                      color: getCellColor(group),
                                      bgcolor: getCellBg(group, isEven),
                                      transition: 'background-color 0.12s',
                                    }}>
                                      {editRecord && editRecord.id === record.id && key !== 'code' && !String(key).startsWith('_') ? (
                                        <input
                                          value={editRecord[key] ?? ''}
                                          onChange={e => setEditRecord({ ...editRecord, [key]: e.target.value })}
                                          style={{
                                            width: '110px', padding: '4px 8px', borderRadius: '5px',
                                            border: `1px solid ${T.accentBorder}`, fontSize: '0.8rem',
                                            fontFamily: 'monospace', outline: 'none',
                                            background: '#fff', color: T.text,
                                          }}
                                          onFocus={e => { e.target.style.borderColor = T.accent; }}
                                          onBlur={e => { e.target.style.borderColor = T.accentBorder; }}
                                        />
                                      ) : isDateListCol && displayVal != null && String(displayVal).trim() !== '' ? (
                                        <Tooltip title={String(displayVal)} placement="top" enterDelay={300}>
                                          <span style={{ cursor: 'default' }}>{displayVal}</span>
                                        </Tooltip>
                                      ) : (
                                        displayVal
                                      )}
                                    </TableCell>
                                  );
                                });
                              })}

                              {/* Actions cell — sticky right, always opaque */}
                              <TableCell
                                className="actions-col"
                                sx={{
                                  position: 'sticky',
                                  right: 0,
                                  zIndex: 3,
                                  borderBottom: `1px solid ${T.divider}`,
                                  px: 1.5,
                                  py: 0.75,
                                  bgcolor: '#fff !important',
                                  transition: 'background-color 0.12s',
                                  boxShadow: `-10px 0 12px -12px ${alpha('#000', 0.35)}`,
                                }}
                              >
                                {editRecord && editRecord.id === record.id ? (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                    <RowBtn
                                      icon={<SaveIcon sx={{ fontSize: 11 }} />}
                                      label="Save"
                                      color="#166534"
                                      hoverBg="rgba(21,128,61,0.08)"
                                      onClick={updateRecord}
                                    />
                                    <RowBtn
                                      icon={<CancelIcon sx={{ fontSize: 11 }} />}
                                      label="Cancel"
                                      color={T.muted}
                                      hoverBg="rgba(0,0,0,0.05)"
                                      onClick={() => setEditRecord(null)}
                                    />
                                  </Box>
                                ) : (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                    <RowBtn
                                      icon={<EditIcon sx={{ fontSize: 11 }} />}
                                      label="Edit"
                                      color={T.accent}
                                      hoverBg={T.accentFaint}
                                      onClick={() => setEditRecord(record)}
                                    />
                                    <RowBtn
                                      icon={<DeleteIcon sx={{ fontSize: 11 }} />}
                                      label="Delete"
                                      color="#991b1b"
                                      hoverBg="rgba(153,27,27,0.07)"
                                      onClick={() => deleteRecord(record.id, record.personID)}
                                    />
                                  </Box>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>

                {/* Footer legend */}
                <Box sx={{ pt: 1.5, display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(21,128,61,0.1)',   border: '1px solid rgba(21,128,61,0.3)'   }} />, label: 'Rendered time' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(153,27,27,0.08)',  border: '1px solid rgba(153,27,27,0.3)'   }} />, label: 'Tardiness' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(139,94,0,0.09)',   border: '1px solid rgba(139,94,0,0.3)'    }} />, label: 'Half day' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(106,27,154,0.10)', border: '1px solid rgba(106,27,154,0.30)' }} />, label: 'Absences' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(21,128,61,0.14)',  border: '1px solid rgba(21,128,61,0.4)'   }} />, label: 'Overall rendered' },
                    { icon: <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(153,27,27,0.14)',  border: '1px solid rgba(153,27,27,0.4)'   }} />, label: 'Overall tardiness' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      {item.icon}
                      <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Fade>
        )}

        {/* ── Empty state ── */}
        {attendanceData.length === 0 && !loading && (
          <SectionCard sx={{ mb: 2 }}>
            <Box sx={{ p: 7, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <Summarize sx={{ fontSize: 36, color: alpha(T.accent, 0.35) }} />
              </Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: alpha(T.accent, 0.65), mb: 0.5 }}>No Records Found</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: T.faint }}>
                Enter an employee number and date range, then click Fetch Records
              </Typography>
            </Box>
          </SectionCard>
        )}

        {/* ── Submit to Payroll Section ── */}
        {attendanceData.length > 0 && (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: 0.5 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: T.accentBorder }} />
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
                  Payroll routing
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: T.accentBorder }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Regular Payroll Card */}
                <Box
                  onClick={goToEarningsForRegularPayroll}
                  sx={{
                    flex: 1, minWidth: 260, position: 'relative',
                    borderRadius: '12px', overflow: 'hidden',
                    cursor: 'pointer',
                    border: `1.5px solid ${alpha(T.accent, 0.3)}`,
                    background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`,
                    transition: 'all 0.22s ease',
                    boxShadow: `0 4px 20px ${alpha(T.accent, 0.25)}`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 32px ${alpha(T.accent, 0.4)}`,
                    },
                    '&:active': { transform: 'translateY(0)' },
                  }}
                >
                  <Box sx={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                  <Box sx={{ position: 'absolute', bottom: -16, left: -16, width: 70, height: 70, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                  <Box sx={{ p: 2.5, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Assignment sx={{ fontSize: 22, color: '#fff' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
                        Regular employees
                      </Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.2, mb: 0.2 }}>
                        Continue to Earnings Management
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 500 }}>
                        Leave deductions and SC/CTO are applied there; regular payroll is submitted only after that step.
                      </Typography>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.4rem', fontWeight: 300, lineHeight: 1, flexShrink: 0 }}>→</Typography>
                  </Box>
                  <Box sx={{ height: 3, background: 'linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.3),rgba(255,255,255,0.1))' }} />
                </Box>

                {/* JO Payroll Card */}
                <Box
                  onClick={!isSubmittingJO ? () => setShowJOConfirm(true) : undefined}
                  sx={{
                    flex: 1, minWidth: 260, position: 'relative',
                    borderRadius: '12px', overflow: 'hidden',
                    cursor: isSubmittingJO ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingJO ? 0.65 : 1,
                    border: `1.5px solid ${T.accentBorder}`,
                    background: '#fff',
                    transition: 'all 0.22s ease',
                    boxShadow: `0 4px 20px ${alpha(T.accent, 0.07)}`,
                    '&:hover': !isSubmittingJO ? {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 32px ${alpha(T.accent, 0.15)}`,
                      border: `1.5px solid ${alpha(T.accent, 0.4)}`,
                      background: 'linear-gradient(135deg,#fdf5f5 0%,#f5e8e8 100%)',
                    } : {},
                    '&:active': !isSubmittingJO ? { transform: 'translateY(0)' } : {},
                  }}
                >
                  <Box sx={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', bgcolor: T.accentFaint, pointerEvents: 'none' }} />
                  <Box sx={{ position: 'absolute', bottom: -16, left: -16, width: 70, height: 70, borderRadius: '50%', bgcolor: T.accentFaint, pointerEvents: 'none' }} />
                  <Box sx={{ p: 2.5, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isSubmittingJO
                        ? <CircularProgress size={20} sx={{ color: T.accent }} />
                        : <Assignment sx={{ fontSize: 22, color: T.accent }} />}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: T.faint, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.3 }}>
                        Job Order Employees
                      </Typography>
                      <Typography sx={{ color: T.accent, fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.2, mb: 0.2 }}>
                        {isSubmittingJO ? 'Submitting...' : 'Submit Payroll JO'}
                      </Typography>
                      <Typography sx={{ color: T.faint, fontSize: '0.72rem', fontWeight: 500 }}>
                        Job order & project-based staff
                      </Typography>
                    </Box>
                    <Typography sx={{ color: T.accentBorder, fontSize: '1.4rem', fontWeight: 300, lineHeight: 1, flexShrink: 0 }}>→</Typography>
                  </Box>
                  <Box sx={{ height: 3, background: `linear-gradient(90deg,${alpha(T.accent,0.06)},${alpha(T.accent,0.22)},${alpha(T.accent,0.06)})` }} />
                </Box>
              </Box>
            </Box>
          </Fade>
        )}

        {/* ── JO Confirm Dialog ── */}
        <PayrollConfirmDialog
          open={showJOConfirm}
          onClose={() => setShowJOConfirm(false)}
          onConfirm={submitPayrollJO}
          title="Job Order Payroll Submission"
          subtitle="The following records are pending submission to Job Order Payroll. Verify all entries are accurate before proceeding."
          recordCount={attendanceData.length}
          recordLabel="Job Order Payroll"
          isSubmitting={isSubmittingJO}
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