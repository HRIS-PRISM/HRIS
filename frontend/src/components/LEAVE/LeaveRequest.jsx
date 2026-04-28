import API_BASE_URL from '../../apiConfig';
import React, {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  useRef,
} from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import {
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Modal,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Fade,
  Divider,
  TablePagination,
  CircularProgress,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Checkbox,
  Slide,
  Paper,
  Card,
  Autocomplete,
  Avatar,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  EventAvailable as ReorderIcon,
  Refresh,
  Person as PersonIcon,
  CalendarMonth,
  CheckCircle,
  Cancel as CancelIcon,
  AccessTime,
  Block,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Business as BusinessIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  DoneAll as DoneAllIcon,
  ThumbDown as ThumbDownIcon,
  HistoryToggleOff,
  Schedule as ScheduleIcon,
  TableRows as TableRowsIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorOutlineIcon,
  HelpOutline as HelpOutlineIcon,
  Lock as LockIcon,
  Work as WorkIcon,
  FilterAlt as FilterAltIcon,
  ManageSearch as ManageSearchIcon,
  OpenInFull as OpenInFullIcon,
  FullscreenExit as FullscreenExitIcon,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';

import SuccessfulOverlay from '../SuccessfulOverlay';
import LoadingOverlay from '../LoadingOverlay';
import LeaveDatePickerModal from './LeaveDatePicker';
import LeaveCredits from './LeaveCredits';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven: '#ffffff',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
};

const TX_LOGS_PER_PAGE = 5;

// ─── Styled primitives ─────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: T.text },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

// ─── Shimmer ───────────────────────────────────────────────────────────────────
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

// ─── Wireframe ─────────────────────────────────────────────────────────────────
const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${T.accentBorder}`,
          animation: 'blink 2s ease-in-out infinite',
        }}
      >
        <Box
          sx={{
            p: 3.5,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Bone w={220} h={18} sx={{ mb: 1 }} />
              <Bone w={360} h={11} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Bone w={160} h={32} r={8} />
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)' }} />
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3}>
  {/* Left column (1/3 width, lg=4) */}
  <Grid item xs={12} lg={4}>
    <Box
      sx={{
        borderRadius: 3,
        border: `1px solid ${T.accentBorder}`,
        bgcolor: '#fff',
        overflow: 'hidden',
        animation: `blink 2s ease-in-out 0s infinite`,
        height: 'calc(100vh - 280px)',
      }}
    >
      {/* header */}
      <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
        <Bone w={180} h={13} />
      </Box>

      {/* content */}
      <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {[100, 160, 120, 140, 110].map((w, i) => (
          <Box key={i}>
            <Bone w={w} h={10} sx={{ mb: 1 }} />
            <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
          </Box>
        ))}
      </Box>
    </Box>
  </Grid>

  {/* Right column (2/3 width, lg=8) */}
  <Grid item xs={12} lg={8}>
    <Box
      sx={{
        borderRadius: 3,
        border: `1px solid ${T.accentBorder}`,
        bgcolor: '#fff',
        overflow: 'hidden',
        animation: `blink 2s ease-in-out 0.1s infinite`,
        height: 'calc(100vh - 280px)',
      }}
    >
      {/* header */}
      <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
        <Bone w={240} h={13} />
      </Box>

      {/* content */}
      <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {[200, 160, 180, 140, 150, 170].map((w, i) => (
          <Box key={i}>
            <Bone w={w} h={10} sx={{ mb: 1 }} />
            <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
          </Box>
        ))}
      </Box>
    </Box>
  </Grid>
</Grid>
    </Box>
  </>
);

// ─── Status config ─────────────────────────────────────────────────────────────
const statusOptions = [
  { value: '0', label: 'Pending Review',                  short: 'Pending',    color: '#F57C00', bg: '#FFF3E0', icon: AccessTime  },
  { value: '1', label: 'Immediate Supervisor Approved',   short: 'Supervisor', color: '#1565C0', bg: '#E3F2FD', icon: CheckCircle },
  { value: '2', label: 'HR Approved',                     short: 'HR Approved',color: '#2E7D32', bg: '#E8F5E9', icon: CheckCircle },
  { value: '3', label: 'Denied',                          short: 'Denied',     color: '#C62828', bg: '#FFEBEE', icon: Block       },
];

const allStatusOptions = [
  { value: '0', label: 'Pending Review',                  short: 'Pending',    color: '#F57C00', bg: '#FFF3E0', icon: AccessTime  },
  { value: '1', label: 'Immediate Supervisor Approved',   short: 'Supervisor', color: '#1565C0', bg: '#E3F2FD', icon: CheckCircle },
  { value: '2', label: 'HR Approved',                     short: 'HR Approved',color: '#2E7D32', bg: '#E8F5E9', icon: CheckCircle },
  { value: '3', label: 'Denied',                          short: 'Denied',     color: '#C62828', bg: '#FFEBEE', icon: Block       },
  { value: '4', label: 'Cancelled',                       short: 'Cancelled',  color: '#757575', bg: '#F5F5F5', icon: CancelIcon  },
];

const selectSx = {
  borderRadius: '8px',
  fontSize: '0.875rem',
  bgcolor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' },
};

// ─── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const opt = allStatusOptions.find((o) => o.value === String(status)) || allStatusOptions[0];
  const Icon = opt.icon;
  return (
    <Chip
      size="small"
      icon={<Icon style={{ fontSize: 11, color: opt.color }} />}
      label={opt.short}
      sx={{
        height: 20,
        fontSize: '0.7rem',
        fontWeight: 600,
        bgcolor: opt.bg,
        color: opt.color,
        border: `1px solid ${alpha(opt.color, 0.25)}`,
        borderRadius: '4px',
        '& .MuiChip-icon': { ml: '4px' },
      }}
    />
  );
};

// ─── Generic Confirmation Modal ────────────────────────────────────────────────
const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = T.accent,
  confirmHoverColor = T.accentDark,
  icon: Icon = HelpOutlineIcon,
  iconColor = T.accent,
  iconBg = T.accentFaint,
  loading = false,
}) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1400 }}>
    <Fade in={open}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          bgcolor: T.surface,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.93rem' }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: T.text, lineHeight: 1.65, pt: 0.5 }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
          <AccentButton
            onClick={onClose}
            variant="outlined"
            sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
          >
            Cancel
          </AccentButton>
          <AccentButton
            onClick={onConfirm}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : null}
            sx={{ fontSize: '0.8rem', bgcolor: confirmColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(confirmColor, 0.32)}`, '&:hover': { bgcolor: confirmHoverColor }, '&:disabled': { bgcolor: '#ddd' } }}
          >
            {loading ? 'Processing…' : confirmLabel}
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Error / Info Modal ────────────────────────────────────────────────────────
const ErrorModal = ({ open, onClose, title, message, icon: Icon = ErrorOutlineIcon, iconColor = '#C62828', iconBg = '#FFEBEE' }) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1500 }}>
    <Fade in={open}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          bgcolor: T.surface,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(180deg,${iconColor} 0%,${alpha(iconColor, 0.82)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.93rem' }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: T.text, lineHeight: 1.65, pt: 0.5 }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end' }}>
          <AccentButton
            onClick={onClose}
            variant="contained"
            sx={{ fontSize: '0.8rem', bgcolor: iconColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(iconColor, 0.3)}`, '&:hover': { bgcolor: alpha(iconColor, 0.85) } }}
          >
            Understood
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Section label used inside form panels ─────────────────────────────────────
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em',
      textTransform: 'uppercase', color: alpha(T.accent, 0.45),
    }}>
      {children}
    </Typography>
  </Box>
);

const getLogTimeLabel = (log) => {
  const loggedAt = log.created_at || log.createdAt || log.timestamp;
  if (!loggedAt) return null;
  const d = new Date(loggedAt);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const normalizeLeaveCategory = (leaveType = {}) => {
  const text = `${leaveType.leave_description || leaveType.leave_code || ''}`.toLowerCase();
  if (text.includes('sick')) return 'Sick Leave';
  if (text.includes('vacation') || text.includes('annual')) return 'Vacation Leave';
  if (text.includes('emergency')) return 'Emergency Leave';
  if (text.includes('maternity')) return 'Maternity Leave';
  if (text.includes('paternity')) return 'Paternity Leave';
  if (text.includes('bereavement')) return 'Bereavement Leave';
  return leaveType.leave_description || leaveType.leave_code || 'Other Leave Types';
};

const getLogLeaveType = (log, leaveTypes = []) => {
  const message = `${log?.message || ''}`.toLowerCase();
  if (!message) return null;
  const sorted = [...leaveTypes].sort((a, b) => {
    const aLen = `${a.leave_description || a.leave_code || ''}`.length;
    const bLen = `${b.leave_description || b.leave_code || ''}`.length;
    return bLen - aLen;
  });
  return sorted.find((leaveType) => {
    const description = `${leaveType.leave_description || ''}`.toLowerCase();
    const code = `${leaveType.leave_code || ''}`.toLowerCase();
    return (description && message.includes(description)) || (code && message.includes(code));
  }) || null;
};

const getLogLeaveCategory = (log, leaveTypes = []) => normalizeLeaveCategory(getLogLeaveType(log, leaveTypes) || {});

const TransactionLogsSurface = ({
  variant,
  logs,
  totalCount,
  filteredTotal,
  loading,
  error,
  employeeNames,
  leaveTypes,
  auditPage,
  setAuditPage,
  searchTerm,
  setSearchTerm,
  actionFilter,
  setActionFilter,
  leaveFilter,
  setLeaveFilter,
  kindMap,
  getTxKind,
  renderTxSentence,
  onClose,
  onOpenModal,
  onExpandPanel,
}) => {
  const isPanel = variant === 'panel';
  const totalPages = Math.max(1, Math.ceil(Math.max(filteredTotal, 0) / TX_LOGS_PER_PAGE));
  const paginated = logs.slice((auditPage - 1) * TX_LOGS_PER_PAGE, auditPage * TX_LOGS_PER_PAGE);
  const leaveFilterOptions = ['all', ...new Map(leaveTypes.map((leaveType) => [normalizeLeaveCategory(leaveType), normalizeLeaveCategory(leaveType)])).keys()];

  return (
    <SectionCard
      sx={
        isPanel
          ? { height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }
          : { width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
      }
    >
      <Box
        sx={{
          px: 3.5,
          py: 2.5,
          background: T.headerGrad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          gap: 2,
        }}
      >
        <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1, minWidth: 0 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HistoryToggleOff sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }} noWrap>
              Transaction Logs
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
              {filteredTotal > 0 ? `${filteredTotal} of ${totalCount} recorded action(s)` : 'All activity on leave requests'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', position: 'relative', zIndex: 1, justifyContent: 'flex-end' }}>
          {isPanel ? (
            <AccentButton
              onClick={onOpenModal}
              variant="outlined"
              startIcon={<OpenInFullIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.76rem', color: '#fff', borderColor: 'rgba(255,255,255,0.24)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.35)', transform: 'none' } }}
            >
              Compact modal
            </AccentButton>
          ) : (
            <AccentButton
              onClick={onExpandPanel}
              variant="outlined"
              startIcon={<OpenInFullIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.76rem', color: '#fff', borderColor: 'rgba(255,255,255,0.24)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.35)', transform: 'none' } }}
            >
              Full panel
            </AccentButton>
          )}
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            {isPanel ? <FullscreenExitIcon sx={{ fontSize: 17 }} /> : <Close sx={{ fontSize: 17 }} />}
          </IconButton>
        </Box>
      </Box>

      {isPanel && (
        <Box sx={{ px: 3, py: 2, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <ManageSearchIcon sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: T.faint, pointerEvents: 'none' }} />
              <FieldInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee, action, or leave type…"
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { pl: 1.5 } }}
              />
            </Box>
            <AccentButton
              onClick={() => setSearchTerm('')}
              variant="outlined"
              startIcon={<FilterAltIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.74rem', color: T.accent, borderColor: T.accentBorder, bgcolor: '#fff', '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}
            >
              Clear
            </AccentButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {[
              { label: 'All actions', value: 'all' },
              { label: 'Submitted', value: 'submitted' },
              { label: 'Supervisor', value: 'supervisor_approved' },
              { label: 'HR approved', value: 'hr_approved' },
              { label: 'Denied', value: 'denied' },
              { label: 'Cancelled', value: 'cancelled' },
              { label: 'Deleted', value: 'deleted' },
            ].map((opt) => (
              <Box
                key={opt.value}
                onClick={() => setActionFilter(opt.value)}
                sx={{
                  px: 1.35,
                  py: 0.45,
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: `1px solid ${actionFilter === opt.value ? T.accent : T.accentBorder}`,
                  color: actionFilter === opt.value ? '#fff' : T.accent,
                  bgcolor: actionFilter === opt.value ? T.accent : '#fff',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: actionFilter === opt.value ? T.accentDark : T.accentFaint },
                }}
              >
                {opt.label}
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {leaveFilterOptions.map((category, index) => {
              const label = category === 'all' ? 'All leave types' : category;
              return (
                <Box
                  key={`${category}-${index}`}
                  onClick={() => setLeaveFilter(category)}
                  sx={{
                    px: 1.35,
                    py: 0.45,
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: `1px solid ${leaveFilter === category ? T.accent : T.accentBorder}`,
                    color: leaveFilter === category ? '#fff' : T.accent,
                    bgcolor: leaveFilter === category ? T.accent : '#fff',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: leaveFilter === category ? T.accentDark : T.accentFaint },
                  }}
                >
                  {label}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          px: 3,
          py: 2.5,
          overflowY: 'auto',
          flexGrow: 1,
          bgcolor: T.accentFaint,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[...Array(TX_LOGS_PER_PAGE)].map((_, i) => (
              <Box key={i} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${T.accentBorder}`, animation: 'blink 1.6s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}>
                <Bone w={90} h={16} sx={{ mb: 1 }} />
                <Bone w="80%" h={12} sx={{ mb: 0.75 }} />
                <Bone w="55%" h={12} />
              </Box>
            ))}
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        ) : filteredTotal === 0 ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <HistoryToggleOff sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
            </Box>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>
              {totalCount === 0 ? 'No activity yet.' : 'No logs match your filters.'}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
              {totalCount === 0 ? 'Actions on leave requests will appear here.' : 'Try a different search or leave-type filter.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {paginated.map((log) => {
              const kind = getTxKind(log);
              const { label, color, bg, Icon } = kindMap[kind] || kindMap.activity;
              const timeLabel = getLogTimeLabel(log);
              const leaveType = getLogLeaveType(log, leaveTypes);
              const leaveCategory = getLogLeaveCategory(log, leaveTypes);
              const logEmpNum = log.employee_id || log.employeeNumber;
              const logEmpName = logEmpNum ? employeeNames[logEmpNum] : null;

              return (
                <Box
                  key={`log-${log.id}`}
                  sx={{
                    bgcolor: '#fff',
                    borderRadius: 2,
                    p: 2.5,
                    border: `1px solid ${T.accentBorder}`,
                    borderLeft: `4px solid ${color}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    '&:hover': { boxShadow: `0 4px 12px ${alpha(color, 0.12)}` },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.35, borderRadius: '6px', bgcolor: bg, border: `1px solid ${alpha(color, 0.2)}` }}>
                        <Icon sx={{ fontSize: 12, color }} />
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color, lineHeight: 1 }}>{label}</Typography>
                      </Box>
                    </Box>
                    {timeLabel && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 11, color: T.faint }} />
                        <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{timeLabel}</Typography>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.1, py: 0.32, borderRadius: '6px', bgcolor: alpha(T.accent, 0.05), border: `1px solid ${T.accentBorder}` }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.accent, lineHeight: 1 }}>
                        {leaveType?.leave_description || leaveCategory}
                      </Typography>
                    </Box>

                    {logEmpNum && (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.5, bgcolor: alpha('#1565C0', 0.05), borderRadius: 1.5, border: '1px solid rgba(21,101,192,0.15)' }}>
                        <PersonIcon sx={{ fontSize: 14, color: '#1565C0', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1565C0', lineHeight: 1 }}>
                          {logEmpNum} {logEmpName && logEmpName !== 'Unknown' && '| '}{logEmpName && logEmpName !== 'Unknown' && logEmpName.toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {renderTxSentence(log)}
                </Box>
              );
            })}

            {totalPages > 1 && (
              <Box sx={{ mt: 1, pt: 2, borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                <IconButton
                  size="small"
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage((p) => p - 1)}
                  sx={{ width: 32, height: 32, borderRadius: 1.5, border: `1px solid ${auditPage === 1 ? T.divider : T.accentBorder}`, color: auditPage === 1 ? T.faint : T.accent }}
                  title="Previous logs"
                >
                  <NavigateBefore sx={{ fontSize: 16 }} />
                </IconButton>
                <Box sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, px: 1.25, py: 0.45, borderRadius: 1.5, bgcolor: '#fff', border: `1px solid ${T.accentBorder}` }}>
                  Page {auditPage} of {totalPages}
                </Box>
                <IconButton
                  size="small"
                  disabled={auditPage === totalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  sx={{ width: 32, height: 32, borderRadius: 1.5, border: `1px solid ${auditPage === totalPages ? T.divider : T.accentBorder}`, color: auditPage === totalPages ? T.faint : T.accent }}
                  title="Next logs"
                >
                  <NavigateNext sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </SectionCard>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const LeaveRequest = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess('leave-request');
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);

  const [leaveRequests, setLeaveRequests]   = useState([]);
  const [leaveTypes, setLeaveTypes]         = useState([]);
  const [employeeNames, setEmployeeNames]   = useState({});
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [newRequest, setNewRequest]         = useState({ employeeNumber: '', leave_code: '', leave_date: '', status: '0' });
  const [editRequest, setEditRequest]       = useState(null);
  const [originalRequest, setOriginalRequest] = useState(null);
  const [isEditing, setIsEditing]           = useState(false);
  const [searchTerm, setSearchTerm]         = useState('');
  const deferredSearch                      = useDeferredValue(searchTerm);
  const [loading, setLoading]               = useState(false);
  const [pageLoading, setPageLoading]       = useState(true);
  const [successOpen, setSuccessOpen]       = useState(false);
  const [successAction, setSuccessAction]   = useState('');
  const [dateModalOpen, setDateModalOpen]   = useState(false);
  const [selectedDates, setSelectedDates]   = useState([]);
  const [leaveBalance, setLeaveBalance]     = useState({ loading: false, availableHours: null, error: '' });
  const [page, setPage]                     = useState(0);
  const [rowsPerPage, setRowsPerPage]       = useState(12);
  const [statusFilter, setStatusFilter]     = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [dateFiledFilter, setDateFiledFilter] = useState('');
  const [viewMode, setViewMode]             = useState('grid');
  const [selectMode, setSelectMode]         = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [bulkLoading, setBulkLoading]       = useState(false);
  const [txModalOpen, setTxModalOpen]       = useState(false);
  const [txPanelOpen, setTxPanelOpen]       = useState(false);
  const [txLogs, setTxLogs]                 = useState([]);
  const [txLoading, setTxLoading]           = useState(false);
  const [txError, setTxError]               = useState('');
  const [auditPage, setAuditPage]           = useState(1);
  const [txSearchTerm, setTxSearchTerm]     = useState('');
  const [txActionFilter, setTxActionFilter] = useState('all');
  const [txLeaveFilter, setTxLeaveFilter]   = useState('all');
  const AUDIT_PER_PAGE = TX_LOGS_PER_PAGE;

  const [errorModal, setErrorModal]     = useState({ open: false, title: '', message: '', iconColor: '#C62828', iconBg: '#FFEBEE', icon: ErrorOutlineIcon });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {} });

  const showError   = (title, message, opts = {}) => setErrorModal({ open: true, title, message, iconColor: '#C62828', iconBg: '#FFEBEE', icon: ErrorOutlineIcon, ...opts });
  const closeError  = () => setErrorModal((p) => ({ ...p, open: false }));
  const showConfirm = (opts) => setConfirmModal({ open: true, title: '', message: '', confirmLabel: 'Confirm', confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {}, ...opts });
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, open: false, loading: false }));

  const userRole = useMemo(() => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.role || payload.userRole || '').toLowerCase();
  } catch { return ''; }
}, []);

const isPrivilegedRole = ['admin', 'superadmin', 'technical'].includes(userRole);

  useEffect(() => { setPage(0); }, [deferredSearch, statusFilter, leaveTypeFilter, dateRangeFilter, dateFiledFilter]);

  useEffect(() => {
    const init = async () => { await fetchAll(); setPageLoading(false); };
    init();
  }, []); // eslint-disable-line

  useEffect(() => { refreshRef.current = fetchAll; });

  useEffect(() => {
    if (!socket || !connected) return;
    const handler = () => refreshRef.current?.();
    socket.on('leaveRequestChanged', handler);
    return () => socket.off('leaveRequestChanged', handler);
  }, [socket, connected]);

  // ── Leave balance preview (admin submit form) ────────────────────────────────
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!newRequest.employeeNumber || !newRequest.leave_code) {
        setLeaveBalance({ loading: false, availableHours: null, error: '' });
        return;
      }
      setLeaveBalance((p) => ({ ...p, loading: true, error: '' }));
      try {
        const creditsRes = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`, getAuthHeaders());
        const assignment = Array.isArray(creditsRes.data)
          ? creditsRes.data
          : (creditsRes.data?.assignments || []);

        const matches = assignment.filter(
          (a) =>
            a.employeeNumber?.toString() === newRequest.employeeNumber?.toString() &&
            a.leave_code === newRequest.leave_code,
        );

        const available = matches.reduce((sum, row) => {
          const rowAvail =
            parseFloat(
              row.remaining_hours ??
                ((parseFloat(row.allocated_hours) || 0) - (parseFloat(row.used_hours) || 0)),
            ) || 0;
          return sum + rowAvail;
        }, 0);

        if (!alive) return;
        setLeaveBalance({ loading: false, availableHours: available, error: '' });
      } catch (e) {
        if (!alive) return;
        setLeaveBalance({ loading: false, availableHours: null, error: 'Failed to load leave balance preview.' });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [newRequest.employeeNumber, newRequest.leave_code]);

  const fetchAll = async () => {
    try {
      const [reqRes, typeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaveRoute/leave_request`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_table`, getAuthHeaders()),
      ]);
      setLeaveRequests(reqRes.data);
      setLeaveTypes(typeRes.data);

      const names = {};
      const empNums = [...new Set(reqRes.data.map((r) => r.employeeNumber))];
      await Promise.all(empNums.map(async (emp) => {
        try {
          const res = await axios.get(`${API_BASE_URL}/personalinfo/person_table/${emp}`, getAuthHeaders());
          names[emp] = [res.data.firstName, res.data.lastName].filter(Boolean).join(' ') || 'Unknown';
        } catch { names[emp] = 'Unknown'; }
      }));
      setEmployeeNames(names);

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const [usersRes, personalRes] = await Promise.allSettled([
            axios.get(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_BASE_URL}/personalinfo/person_table`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          let usersData = [];
          if (usersRes.status === 'fulfilled') {
            const d = usersRes.value.data;
            if (Array.isArray(d)) usersData = d;
            else if (d?.users) usersData = d.users;
            else if (d?.data) usersData = d.data;
          }
          const sexMap = {};
          if (personalRes.status === 'fulfilled') {
            const pd = personalRes.value.data;
            const personalList = Array.isArray(pd) ? pd : pd?.data || pd?.personalInfo || [];
            personalList.forEach((p) => {
              const empNum = p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString() || p.employee_number?.toString();
              const sex = p.sex || p.gender || p.Sex || p.Gender;
              if (empNum && sex) sexMap[empNum] = sex;
            });
          }
          const options = usersData
            .map((u) => {
              const empNum = u.employeeNumber?.toString() || u.employee_number?.toString();
              const fullName = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
              return {
                employeeNumber: empNum,
                fullName,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                sex: (empNum ? sexMap[empNum] : null) || u.sex || u.gender || null,
                _searchKey: `${fullName} ${empNum}`.toLowerCase(),
              };
            })
            .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
          setEmployeeOptions(options);
        } catch (e) {
          console.error('Failed to fetch employee list for autocomplete', e);
        }
      }
    } catch (e) { console.error(e); }
  };

  const isSickLeave = (code) => {
    const t = leaveTypes.find((x) => x.leave_code === code);
    if (!t) return false;
    return (t.leave_code || '').toLowerCase().includes('sl') || (t.leave_description || '').toLowerCase().includes('sick');
  };

  const handleAdd = async () => {
    if (!newRequest.employeeNumber || !newRequest.leave_code || !newRequest.leave_date) {
      showError('Missing Required Fields', 'Please fill in all required fields: Employee Number, Leave Type, and Leave Date(s) before submitting.', { icon: WarningIcon, iconColor: '#F57C00', iconBg: '#FFF3E0' });
      return;
    }
    const leaveDates = Array.isArray(newRequest.leave_date)
      ? newRequest.leave_date
      : newRequest.leave_date.split(',').filter((d) => d.trim());
    const hoursRequested = leaveDates.length * 8;

    let creditsOk = true;
    let creditMsg = '';
    try {
      const creditsRes = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`, getAuthHeaders());
      // Backend returns an array; older code expected { assignments: [...] }.
      const assignment = Array.isArray(creditsRes.data)
        ? creditsRes.data
        : (creditsRes.data?.assignments || []);
      // Same employee + leave_code can have multiple leave_assignment rows (e.g. per period_year).
      // Backend POST uses total remaining across all rows (getTotalRemainingHours); match that here
      // instead of assignment.find(), which would only use the first row (often an older period with 0 remaining).
      const matches = assignment.filter(
        (a) => a.employeeNumber?.toString() === newRequest.employeeNumber?.toString() && a.leave_code === newRequest.leave_code,
      );
      if (!matches.length) {
        creditsOk = false;
        creditMsg = `No leave assignment found for Employee #${newRequest.employeeNumber} under leave code "${newRequest.leave_code}".\n\nPlease assign leave credits first.`;
      } else {
        // Prefer remaining_hours (server-authoritative) per row; sum across periods like the API balance check.
        const available = matches.reduce((sum, row) => {
          const rowAvail = parseFloat(row.remaining_hours ?? ((parseFloat(row.allocated_hours) || 0) - (parseFloat(row.used_hours) || 0))) || 0;
          return sum + rowAvail;
        }, 0);
        if (available < hoursRequested) {
          creditsOk = false;
          creditMsg = `Insufficient leave balance for this request.\n\nRequested: ${(hoursRequested / 8).toFixed(3)} day(s) (${hoursRequested} hrs)\nAvailable: ${(available / 8).toFixed(3)} day(s) (${available.toFixed(3)} hrs)\n\nPlease select fewer dates or choose a different leave type.`;
        }
      }
    } catch (e) { console.error(e); }

    if (!creditsOk) {
      showError('Insufficient Leave Balance', creditMsg, { icon: ErrorOutlineIcon, iconColor: '#C62828', iconBg: '#FFEBEE' });
      return;
    }

    const leaveName = leaveTypes.find((t) => t.leave_code === newRequest.leave_code)?.leave_description || newRequest.leave_code;
    showConfirm({
      title: 'Confirm Leave Request',
      message: `Submit a leave request for Employee #${newRequest.employeeNumber}?\n\nLeave Type: ${leaveName}\nDuration: ${leaveDates.length} day(s)`,
      confirmLabel: 'Submit Request',
      confirmColor: T.accent,
      confirmHoverColor: T.accentDark,
      icon: AddIcon,
      iconColor: T.accent,
      iconBg: T.accentFaint,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        setLoading(true);
        try {
          await axios.post(
            `${API_BASE_URL}/leaveRoute/leave_request`,
            { employeeNumber: newRequest.employeeNumber, leave_code: newRequest.leave_code, leave_dates: leaveDates, status: Number(newRequest.status) },
            getAuthHeaders(),
          );
          setNewRequest({ employeeNumber: '', leave_code: '', leave_date: '', status: '0' });
          setSelectedDates([]);
          setSuccessAction('adding');
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          fetchAll();
        } catch (e) {
          const specificError =
            e.response?.data?.detail ||
            e.response?.data?.error ||
            e.response?.data?.message ||
            e.message;
          showError('Submission Failed', specificError);
        } finally {
          setLoading(false);
          closeConfirm();
        }
      },
    });
  };

  const handleUpdate = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_request/${editRequest.id}`,
        { employeeNumber: editRequest.employeeNumber, leave_code: editRequest.leave_code, leave_date: editRequest.leave_date, status: Number(editRequest.status) },
        getAuthHeaders(),
      );
      closeModal();
      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      fetchAll();
    } catch { showError('Update Failed', 'An error occurred while updating the leave request. Please try again.'); }
  };

  const handleDelete = (id, status) => {
    if (String(status) === '4') {
      showError('Cannot Delete', 'Cancelled leave requests cannot be deleted.', { icon: LockIcon, iconColor: '#757575', iconBg: '#F5F5F5' });
      return;
    }
    showConfirm({
      title: 'Delete Leave Request',
      message: 'Are you sure you want to permanently delete this leave request? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: '#C62828',
      confirmHoverColor: '#B71C1C',
      icon: DeleteIcon,
      iconColor: '#C62828',
      iconBg: '#FFEBEE',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          await axios.delete(`${API_BASE_URL}/leaveRoute/leave_request/${id}`, getAuthHeaders());
          closeModal();
          setSuccessAction('delete');
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          fetchAll();
        } catch { showError('Delete Failed', 'An error occurred while deleting the leave request. Please try again.'); }
        finally { closeConfirm(); }
      },
    });
  };

  const handleBulkStatusUpdate = (newStatus) => {
    if (selectedRequests.length === 0) {
      showError('No Selection', 'Please select at least one leave request before performing a bulk action.', { icon: WarningIcon, iconColor: '#F57C00', iconBg: '#FFF3E0' });
      return;
    }
    const label = statusOptions.find((o) => o.value === String(newStatus))?.label || 'Unknown';
    showConfirm({
      title: 'Bulk Status Update',
      message: `Update ${selectedRequests.length} request(s) to "${label}"?\n\nThis will apply the status change to all selected records.`,
      confirmLabel: `Set to ${label.split(' ')[0]}`,
      confirmColor: newStatus === 1 ? '#1565C0' : newStatus === 2 ? '#2E7D32' : '#C62828',
      confirmHoverColor: newStatus === 1 ? '#0D47A1' : newStatus === 2 ? '#1B5E20' : '#B71C1C',
      icon: newStatus === 2 ? DoneAllIcon : newStatus === 3 ? ThumbDownIcon : CheckCircle,
      iconColor: newStatus === 1 ? '#1565C0' : newStatus === 2 ? '#2E7D32' : '#C62828',
      iconBg: newStatus === 1 ? '#E3F2FD' : newStatus === 2 ? '#E8F5E9' : '#FFEBEE',
      onConfirm: async () => {
        setBulkLoading(true);
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          await axios.put(`${API_BASE_URL}/leaveRoute/leave_request/bulk-update`, { ids: selectedRequests, status: newStatus }, getAuthHeaders());
          setSuccessAction('bulk');
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          setSelectedRequests([]);
          setSelectMode(false);
          fetchAll();
        } catch (e) { showError('Bulk Update Failed', 'Error updating requests: ' + (e.response?.data?.error || e.message)); }
        finally { setBulkLoading(false); closeConfirm(); }
      },
    });
  };

  const closeModal = () => { setEditRequest(null); setOriginalRequest(null); setIsEditing(false); };
  const hasChanges = () =>
    !editRequest || !originalRequest
      ? false
      : editRequest.employeeNumber !== originalRequest.employeeNumber ||
        editRequest.leave_code !== originalRequest.leave_code ||
        editRequest.leave_date !== originalRequest.leave_date ||
        editRequest.status !== originalRequest.status;

  const isRecordLocked = (req) => ['2', '3', '4'].includes(String(req?.status));

  const toggleSelectMode = () => { setSelectMode(!selectMode); setSelectedRequests([]); };
  const handleSelectRequest = (id) => setSelectedRequests((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  const handleSelectAll = () => setSelectedRequests(selectedRequests.length === paged.length ? [] : paged.map((r) => r.id));

  const fetchTxLogs = async () => {
    setTxLoading(true);
    setTxError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_request/transactions`, getAuthHeaders());
      const sorted = (Array.isArray(res.data) ? res.data : []).sort(
        (a, b) => new Date(b.created_at || b.createdAt || b.timestamp) - new Date(a.created_at || a.createdAt || a.timestamp),
      );
      
      // Fetch employee names for any employees in the transaction logs that we don't have yet
      const empNums = [...new Set(sorted.map((log) => log.employee_id || log.employeeNumber).filter(Boolean))];
      const newNames = { ...employeeNames };
      
      await Promise.all(empNums.map(async (emp) => {
        if (!newNames[emp]) {
          try {
            const nameRes = await axios.get(`${API_BASE_URL}/personalinfo/person_table/${emp}`, getAuthHeaders());
            const firstName = nameRes.data.firstName || '';
            const middleName = nameRes.data.middleName || '';
            const lastName = nameRes.data.lastName || '';
            
            // Format: LASTNAME, FIRSTNAME MIDDLEINITIAL
            const middleInitial = middleName ? middleName.charAt(0) + '.' : '';
            const formatted = `${lastName}, ${firstName} ${middleInitial}`.replace(/\s+/g, ' ').trim();
            newNames[emp] = formatted || 'Unknown';
          } catch {
            newNames[emp] = 'Unknown';
          }
        }
      }));
      
      setEmployeeNames(newNames);
      setTxLogs(sorted);
      setAuditPage(1);
    } catch (e) {
      console.error(e);
      setTxError('Failed to load transaction logs.');
      setTxLogs([]);
    } finally { setTxLoading(false); }
  };

  useEffect(() => { if (txModalOpen || txPanelOpen) fetchTxLogs(); }, [txModalOpen, txPanelOpen]); // eslint-disable-line

  useEffect(() => {
    setAuditPage(1);
  }, [txSearchTerm, txActionFilter, txLeaveFilter]);

  // ── Filtering ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = new Date();
    const [ty, tm, td] = [now.getFullYear(), now.getMonth(), now.getDate()];
    const todayTime = new Date(ty, tm, td).getTime();
    const last7Time = new Date(ty, tm, td - 6).getTime();

    let data = leaveRequests;
    if (dateRangeFilter !== 'all') {
      data = data.filter((r) => {
        const raw = Array.isArray(r.leave_date) ? r.leave_date[0] : String(r.leave_date || '').split(',')[0].trim();
        if (!raw) return false;
        const [ly, lm, ld] = raw.split('-').map(Number);
        const lt = new Date(ly, lm - 1, ld).getTime();
        if (dateRangeFilter === 'today' && lt !== todayTime) return false;
        if (dateRangeFilter === 'last7' && (lt < last7Time || lt > todayTime)) return false;
        if (dateRangeFilter === 'monthly' && (ly !== ty || lm - 1 !== tm)) return false;
        return true;
      });
    }
    if (dateFiledFilter) {
      data = data.filter((r) => {
        const raw = r.created_at || r.createdAt || r.dateSubmitted;
        if (!raw) return false;
        const s = new Date(String(raw).replace(' ', 'T'));
        const [fy, fm, fd] = dateFiledFilter.split('-').map(Number);
        return s.getFullYear() === fy && s.getMonth() + 1 === fm && s.getDate() === fd;
      });
    }
    if (statusFilter !== 'all') data = data.filter((r) => String(r.status) === statusFilter);
    if (leaveTypeFilter !== 'all') data = data.filter((r) => r.leave_code === leaveTypeFilter);
    const s = (deferredSearch || '').toLowerCase().trim();
    if (s)
      data = data.filter(
        (r) =>
          (employeeNames[r.employeeNumber] || '').toLowerCase().includes(s) ||
          (r.employeeNumber || '').toLowerCase().includes(s),
      );
    return data;
  }, [leaveRequests, deferredSearch, employeeNames, statusFilter, leaveTypeFilter, dateRangeFilter, dateFiledFilter]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const counts = {
    all: leaveRequests.length,
    '0': leaveRequests.filter((r) => String(r.status) === '0').length,
    '1': leaveRequests.filter((r) => String(r.status) === '1').length,
    '2': leaveRequests.filter((r) => String(r.status) === '2').length,
    '3': leaveRequests.filter((r) => String(r.status) === '3').length,
  };

  const getType = (c) => leaveTypes.find((t) => t.leave_code === c) || { leave_description: c };
  const formatDate = (d) => {
    if (!d) return 'N/A';
    const s = Array.isArray(d) ? d[0] : d.split(',')[0];
    const [y, m, day] = s.trim().split('-');
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatDateRange = (d) => {
    if (!d) return 'N/A';
    const dates = (Array.isArray(d) ? d : d.split(',').map((s) => s.trim())).filter(Boolean);
    if (!dates.length) return 'N/A';
    const fmt = (s) => {
      const [y, m, day] = s.trim().split('-');
      return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (dates.length === 1) return `on ${fmt(dates[0])}`;
    const sorted = [...dates].sort();
    return `${fmt(sorted[0])} – ${fmt(sorted[sorted.length - 1])}`;
  };

  const leaveDatesForNew = useMemo(() => {
    const raw = newRequest.leave_date;
    const dates = Array.isArray(raw)
      ? raw
      : String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return dates.length ? dates : selectedDates;
  }, [newRequest.leave_date, selectedDates]);

  const hoursRequested = useMemo(() => leaveDatesForNew.length * 8, [leaveDatesForNew.length]);
  const balanceAvailableHours = leaveBalance.availableHours ?? null;
  const noBalance =
    balanceAvailableHours !== null &&
    !leaveBalance.loading &&
    newRequest.employeeNumber &&
    newRequest.leave_code &&
    balanceAvailableHours <= 0;
  const isOverBalance =
    balanceAvailableHours !== null &&
    !leaveBalance.loading &&
    newRequest.employeeNumber &&
    newRequest.leave_code &&
    hoursRequested > 0 &&
    balanceAvailableHours < hoursRequested;

  const canAdd =
    !loading &&
    newRequest.employeeNumber &&
    newRequest.leave_code &&
    newRequest.leave_date &&
    !leaveBalance.loading &&
    !noBalance &&
    !isOverBalance;

  // ── Tx log helpers ─────────────────────────────────────────────────────────────
  const buildTxSentence = (log) => {
    const raw = (log.message || '').trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1) + (raw.endsWith('.') ? '' : '.');
  };

  const renderTxSentence = (log) => {
    const sentence = buildTxSentence(log);
    const empNum = log.employee_id || log.employeeNumber;
    const empName = empNum ? employeeNames[empNum] : null;

    const candidates = [];
    if (empName && empName !== 'Unknown') candidates.push(empName);
    if (empNum) {
      candidates.push(`#${empNum}`);
      candidates.push(empNum);
    }

    const found = candidates
      .filter((term) => sentence.includes(term))
      .sort((a, b) => sentence.indexOf(a) - sentence.indexOf(b));

    if (!found.length) {
      return (
        <Typography sx={{ fontSize: '0.86rem', fontWeight: 400, color: T.text, lineHeight: 1.6 }}>
          {sentence}
        </Typography>
      );
    }

    const segments = [];
    let remaining = sentence;

    found.forEach((term) => {
      const idx = remaining.indexOf(term);
      if (idx === -1) return;
      if (idx > 0) segments.push({ text: remaining.slice(0, idx), bold: false });
      segments.push({ text: remaining.slice(idx, idx + term.length), bold: true });
      remaining = remaining.slice(idx + term.length);
    });

    if (remaining) segments.push({ text: remaining, bold: false });

    return (
      <Typography
        component="p"
        sx={{ fontSize: '0.86rem', color: T.text, lineHeight: 1.6, m: 0 }}
      >
        {segments.map((seg, i) =>
          seg.bold ? (
            <Box key={i} component="span" sx={{ fontWeight: 900, color: T.text }}>
              {seg.text}
            </Box>
          ) : (
            <Box key={i} component="span" sx={{ fontWeight: 400 }}>
              {seg.text}
            </Box>
          ),
        )}
      </Typography>
    );
  };

  const getTxKind = (log) => {
    const lower = (log.message || '').toLowerCase();
    if (lower.includes('deleted')) return 'deleted';
    if (lower.includes('reversed') || lower.includes('reversal')) return 'reversal';
    if (lower.includes('hr') && lower.includes('approv')) return 'hr_approved';
    if ((lower.includes('supervisor') || lower.includes('immediate')) && lower.includes('approv')) return 'supervisor_approved';
    if (lower.includes('approv')) return 'approved';
    if (lower.includes('reject') || lower.includes('denied') || lower.includes('deny')) return 'denied';
    if (lower.includes('cancel')) return 'cancelled';
    if (lower.includes('submit') || lower.includes('request') || lower.includes('filed')) return 'submitted';
    if (lower.includes('pending')) return 'pending';
    return 'activity';
  };

  const kindMap = {
    submitted:           { label: 'Submitted',           color: T.accent,  bg: T.accentFaint, Icon: AddIcon         },
    pending:             { label: 'Pending',              color: '#F57C00', bg: '#FFF8E1',     Icon: AccessTime      },
    supervisor_approved: { label: 'Supervisor Approved',  color: '#1565C0', bg: '#E3F2FD',     Icon: CheckCircle     },
    hr_approved:         { label: 'HR Approved',          color: '#2E7D32', bg: '#E8F5E9',     Icon: CheckCircle     },
    approved:            { label: 'Approved',             color: '#2E7D32', bg: '#E8F5E9',     Icon: CheckCircle     },
    denied:              { label: 'Denied',               color: '#C62828', bg: '#FFEBEE',     Icon: Block           },
    cancelled:           { label: 'Cancelled',            color: '#757575', bg: '#F5F5F5',     Icon: CancelIcon      },
    deleted:             { label: 'Deleted',              color: '#C62828', bg: '#FFEBEE',     Icon: DeleteIcon      },
    reversal:            { label: 'VL Reversal',          color: '#B71C1C', bg: '#FFEBEE',     Icon: Block           },
    activity:            { label: 'Activity',             color: '#546E7A', bg: '#ECEFF1',     Icon: ScheduleIcon    },
  };

  const filteredTxLogs = useMemo(() => {
    const search = txSearchTerm.toLowerCase().trim();
    return txLogs.filter((log) => {
      const kind = getTxKind(log);
      if (txActionFilter !== 'all' && kind !== txActionFilter) return false;

      const leaveCategory = getLogLeaveCategory(log, leaveTypes);
      if (txLeaveFilter !== 'all' && leaveCategory !== txLeaveFilter) return false;

      if (!search) return true;

      const logEmpNum = String(log.employee_id || log.employeeNumber || '').toLowerCase();
      const employeeLabel = logEmpNum ? String(employeeNames[logEmpNum] || employeeNames[String(log.employee_id || log.employeeNumber || '')] || '').toLowerCase() : '';
      const message = String(log.message || '').toLowerCase();
      const leaveType = getLogLeaveType(log, leaveTypes);
      const leaveText = `${leaveType?.leave_code || ''} ${leaveType?.leave_description || ''}`.toLowerCase();
      const actionLabel = String(kindMap[kind]?.label || '').toLowerCase();

      return [logEmpNum, employeeLabel, message, leaveText, leaveCategory.toLowerCase(), actionLabel].some((value) => value.includes(search));
    });
  }, [txLogs, txSearchTerm, txActionFilter, txLeaveFilter, leaveTypes, employeeNames, kindMap]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(Math.max(filteredTxLogs.length, 0) / AUDIT_PER_PAGE));
    if (auditPage > maxPage) setAuditPage(maxPage);
  }, [auditPage, filteredTxLogs.length]);

  if (accessLoading) return <Wireframe />;
  if (!hasAccess) return <AccessDenied />;
  if (pageLoading) return <Wireframe />;

  // ── Selected employee object (for preview pill) ────────────────────────────
  const selectedEmployeeObj = employeeOptions.find((o) => o.employeeNumber === newRequest.employeeNumber) || null;

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
        }}
      >
        <LoadingOverlay open={loading} message="Processing leave request…" />
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        <ErrorModal
          open={errorModal.open}
          onClose={closeError}
          title={errorModal.title}
          message={errorModal.message}
          icon={errorModal.icon}
          iconColor={errorModal.iconColor}
          iconBg={errorModal.iconBg}
        />
        <ConfirmModal
          open={confirmModal.open}
          onClose={closeConfirm}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          confirmHoverColor={confirmModal.confirmHoverColor}
          icon={confirmModal.icon}
          iconColor={confirmModal.iconColor}
          iconBg={confirmModal.iconBg}
          loading={confirmModal.loading}
        />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 4, py: 3,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <ReorderIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                  Leave Request Management
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  Administrative Panel • Submit and manage employee leave requests
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>
                  {leaveRequests.length} {leaveRequests.length === 1 ? 'record' : 'records'}
                </Typography>
              </Box>
              <AccentButton
                onClick={() => { setTxModalOpen(true); setAuditPage(1); }}
                variant="contained"
                startIcon={<HistoryToggleOff sx={{ fontSize: '15px !important' }} />}
                sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
              >
                Transaction Logs
              </AccentButton>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Two-column layout ── */}
        <Grid container spacing={2}>

          {/* ── LEFT: Add New Request ── */}
          <Grid item xs={12} lg={4}>
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

              {/* Panel header */}
              <Box sx={{
                px: 3.5, py: 1.25,
                borderBottom: `1px solid ${T.divider}`,
                display: 'flex', alignItems: 'center', gap: 1.5,
                bgcolor: T.accentFaint,
              }}>
                <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>
                  Add New Leave Request
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                  <Box component="span" sx={{ color: '#c62828' }}>*</Box> required
                </Typography>
              </Box>

              {/* Scrollable body */}
              <Box
                sx={{
                  px: 3.5, py: 3, flexGrow: 1, overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 0,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                }}
              >
                {/* ── SECTION: Employee ── */}
                <FormSectionLabel icon={PersonIcon}>Employee</FormSectionLabel>

                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                    Search Employee <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                  </Typography>
                  <Autocomplete
                    value={selectedEmployeeObj}
                    onChange={(e, v) => {
                      setNewRequest({ ...newRequest, employeeNumber: v?.employeeNumber || '' });
                      setSelectedDates([]);
                    }}
                    options={employeeOptions}
                    autoHighlight
                    getOptionLabel={(o) =>
                      o.fullName ? `${o.fullName} (${o.employeeNumber || ''})` : ''
                    }
                    isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                    filterOptions={(options, { inputValue }) => {
                      const s = inputValue.toLowerCase().trim();
                      if (!s) return options.slice(0, 80);
                      return options
                        .filter((o) => (o._searchKey || '').includes(s))
                        .slice(0, 80);
                    }}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      const initials = (
                        `${option.firstName?.[0] || ''}${option.lastName?.[0] || ''}`
                      ).toUpperCase() || (option.fullName?.[0] || '?').toUpperCase();
                      return (
                        <li key={key} {...rest}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.72rem', bgcolor: T.accent, color: '#fff', fontWeight: 700 }}>
                              {initials}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{option.fullName}</Typography>
                              <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>{option.employeeNumber}</Typography>
                            </Box>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <FieldInput
                        {...params}
                        fullWidth
                        size="small"
                        placeholder="Search name or employee ID…"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <PersonIcon sx={{ fontSize: 15, color: T.muted }} />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    sx={{ width: '100%' }}
                    noOptionsText="No employees found"
                  />
                </Box>

                {/* Employee preview pill — only show when selected */}
                {selectedEmployeeObj ? (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 1.75, py: 1.25, mb: 2.5,
                    borderRadius: 2, bgcolor: T.accentFaint,
                    border: `1px solid ${T.accentBorder}`,
                  }}>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: alpha(T.accent, 0.15), fontSize: '0.78rem', color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                      {`${selectedEmployeeObj.firstName?.[0] || ''}${selectedEmployeeObj.lastName?.[0] || ''}`.toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>
                        {selectedEmployeeObj.fullName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>
                        #{selectedEmployeeObj.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2,
                    py: 1.5, mb: 2.5, bgcolor: alpha(T.accent, 0.02),
                  }}>
                    <Typography sx={{ fontSize: '0.75rem', color: T.faint, fontStyle: 'italic' }}>
                      No employee selected yet
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                {/* ── SECTION: Leave Details ── */}
                <FormSectionLabel icon={WorkIcon}>Leave Details</FormSectionLabel>

                {/* Leave Type */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                    Leave Type <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={newRequest.leave_code}
                      onChange={(e) => { setNewRequest({ ...newRequest, leave_code: e.target.value }); setSelectedDates([]); }}
                      displayEmpty
                      sx={selectSx}
                      renderValue={(v) =>
                        v ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.accent }}>{v}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.875rem' }}>
                              {leaveTypes.find((t) => t.leave_code === v)?.leave_description || ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: '0.875rem', color: T.faint }}>Select leave type…</Typography>
                        )
                      }
                    >
                      <MenuItem value=""><em>Select Leave Type</em></MenuItem>
                      {leaveTypes.map((t) => (
                        <MenuItem key={t.id} value={t.leave_code}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: T.accent }}>{t.leave_code}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.875rem' }}>{t.leave_description}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Leave Date(s) */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>
                    Leave Date(s) <Box component="span" sx={{ color: '#c62828' }}>*</Box>
                  </Typography>
                  <AccentButton
                    variant="outlined"
                    onClick={() => setDateModalOpen(true)}
                    fullWidth
                    startIcon={<CalendarMonth sx={{ fontSize: '15px !important' }} />}
                    sx={{
                      height: 40, border: `1.5px solid ${T.accentBorder}`,
                      color: selectedDates.length ? T.accent : T.muted,
                      justifyContent: 'flex-start', px: 1.5,
                      bgcolor: selectedDates.length ? T.accentFaint : '#fff',
                      '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent, transform: 'none' },
                    }}
                  >
                    <Typography sx={{ fontSize: '0.875rem' }}>
                      {selectedDates.length > 0 ? `${selectedDates.length} date(s) selected` : 'Select leave dates…'}
                    </Typography>
                  </AccentButton>
                  {isSickLeave(newRequest.leave_code) && (
                    <Typography sx={{ fontSize: '0.68rem', color: '#1565C0', mt: 0.5, fontStyle: 'italic' }}>
                      * Past dates allowed for sick leave
                    </Typography>
                  )}
                  <LeaveDatePickerModal
                    open={dateModalOpen}
                    onClose={() => { setNewRequest({ ...newRequest, leave_date: selectedDates.join(',') }); setDateModalOpen(false); }}
                    selectedDates={selectedDates}
                    setSelectedDates={setSelectedDates}
                    accentColor={T.accent}
                    accentDark={T.accentDark}
                    primaryColor="#fdf5f5"
                    secondaryColor="#f0dede"
                    allowPastDates={isSickLeave(newRequest.leave_code)}
                    adminOverride={isPrivilegedRole} 
                  />
                </Box>

                {/* Balance warning (like LeaveRequestUser.jsx) */}
                {(newRequest.employeeNumber && newRequest.leave_code) && (
                  <Box sx={{ mb: 2 }}>
                    {leaveBalance.loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={14} />
                        <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                          Checking leave balance…
                        </Typography>
                      </Box>
                    ) : leaveBalance.error ? (
                      <Alert severity="warning" sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                        {leaveBalance.error}
                      </Alert>
                    ) : (leaveBalance.availableHours !== null) ? (
                      (noBalance || isOverBalance) ? (
                        <Alert severity="error" sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                          {noBalance
                            ? `No Balance — Cannot Submit (${(leaveBalance.availableHours / 8).toFixed(3)} day(s) available)`
                            : `Insufficient Balance — Requested ${(hoursRequested / 8).toFixed(3)} day(s), Available ${(leaveBalance.availableHours / 8).toFixed(3)} day(s)`}
                        </Alert>
                      ) : (
                        <Alert severity="success" sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>
                          {`Balance OK — ${(leaveBalance.availableHours / 8).toFixed(3)} day(s) available`}
                        </Alert>
                      )
                    ) : null}
                  </Box>
                )}


                {/* Submit */}
                <Box sx={{ mt: 'auto' }}>
                  <AccentButton
                    onClick={handleAdd}
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
                    disabled={!canAdd}
                    sx={{
                      height: 42, bgcolor: canAdd ? T.accent : '#d0d0d0', color: canAdd ? '#fff' : '#888',
                      boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : 'none',
                      '&:hover': { bgcolor: canAdd ? T.accentDark : '#d0d0d0', boxShadow: canAdd ? `0 4px 16px ${alpha(T.accent, 0.38)}` : 'none' },
                      '&:disabled': { bgcolor: '#d0d0d0 !important', color: '#888 !important', boxShadow: 'none !important', transform: 'none !important' },
                    }}
                  >
                    {loading
                      ? 'Submitting…'
                      : noBalance
                        ? 'No Balance — Cannot Submit'
                        : isOverBalance
                          ? 'Insufficient Balance'
                          : 'Add Leave Request'}
                  </AccentButton>
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* ── RIGHT: Records ── */}
          <Grid item xs={12} lg={8}>
            {txPanelOpen ? (
              <TransactionLogsSurface
                variant="panel"
                logs={filteredTxLogs}
                totalCount={txLogs.length}
                filteredTotal={filteredTxLogs.length}
                loading={txLoading}
                error={txError}
                employeeNames={employeeNames}
                leaveTypes={leaveTypes}
                auditPage={auditPage}
                setAuditPage={setAuditPage}
                searchTerm={txSearchTerm}
                setSearchTerm={setTxSearchTerm}
                actionFilter={txActionFilter}
                setActionFilter={setTxActionFilter}
                leaveFilter={txLeaveFilter}
                setLeaveFilter={setTxLeaveFilter}
                kindMap={kindMap}
                getTxKind={getTxKind}
                renderTxSentence={renderTxSentence}
                onClose={() => setTxPanelOpen(false)}
                onOpenModal={() => { setTxPanelOpen(false); setTxModalOpen(true); setAuditPage(1); }}
                onExpandPanel={() => {}}
              />
            ) : (
            <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
              {/* Records header / toolbar */}
              <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>

                {/* Title row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TableRowsIcon sx={{ fontSize: 17, color: T.accent }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                      Leave Request Records
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title={selectMode ? 'Exit Selection Mode' : 'Select Multiple'}>
                      <AccentButton
                        onClick={toggleSelectMode}
                        size="small"
                        variant={selectMode ? 'contained' : 'outlined'}
                        startIcon={
                          selectMode
                            ? <CheckBoxIcon sx={{ fontSize: '13px !important' }} />
                            : <CheckBoxOutlineBlankIcon sx={{ fontSize: '13px !important' }} />
                        }
                        sx={{
                          fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28,
                          bgcolor: selectMode ? T.accent : 'transparent',
                          color: selectMode ? '#fff' : T.accent,
                          borderColor: T.accentBorder,
                          '&:hover': { bgcolor: selectMode ? T.accentDark : T.accentFaint, borderColor: T.accent, transform: 'none' },
                        }}
                      >
                        {selectMode ? 'Cancel' : 'Select'}
                      </AccentButton>
                    </Tooltip>
                    <ToggleButtonGroup
                      value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                      sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent } } }}
                    >
                      <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                      <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <AccentButton
                    onClick={() => { setTxPanelOpen(true); setTxModalOpen(false); setAuditPage(1); }}
                    variant="outlined"
                    startIcon={<OpenInFullIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ fontSize: '0.74rem', px: 1.25, py: 0.35, height: 28, color: T.accent, borderColor: T.accentBorder, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}
                  >
                    Open audit module
                  </AccentButton>
                  <Typography sx={{ fontSize: '0.74rem', color: T.muted }}>
                    Search and filter logs without leaving this page.
                  </Typography>
                </Box>

                {/* Date range + Leave type + Date filed */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Today', value: 'today' },
                    { label: 'Last 7d', value: 'last7' },
                    { label: 'This Month', value: 'monthly' },
                  ].map((range) => (
                    <Box
                      key={range.value}
                      onClick={() => setDateRangeFilter(range.value)}
                      sx={{
                        px: 1.5, py: 0.4, borderRadius: 1.5, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                        bgcolor: dateRangeFilter === range.value ? T.accent : 'transparent',
                        color: dateRangeFilter === range.value ? '#fff' : T.accent,
                        border: `1px solid ${dateRangeFilter === range.value ? T.accent : T.accentBorder}`,
                        '&:hover': { bgcolor: dateRangeFilter === range.value ? T.accentDark : T.accentHover },
                        transition: 'all 0.15s',
                      }}
                    >
                      {range.label}
                    </Box>
                  ))}
                  <Box sx={{ flex: 1 }} />
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={leaveTypeFilter}
                      onChange={(e) => { setLeaveTypeFilter(e.target.value); setPage(0); }}
                      displayEmpty
                      sx={{ ...selectSx, fontSize: '0.78rem' }}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      {leaveTypes.map((t) => (
                        <MenuItem key={t.leave_code} value={t.leave_code}>
                          {t.leave_code} — {t.leave_description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FieldInput
                    type="date" size="small" label="Date Filed" value={dateFiledFilter}
                    onChange={(e) => { setDateFiledFilter(e.target.value); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: new Date().toISOString().split('T')[0] }}
                    sx={{ minWidth: 150 }}
                  />
                </Box>

                {/* Search */}
                <FieldInput
                  size="small"
                  placeholder="Search by name or employee ID…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  sx={{ mb: 1.5 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 15, color: T.muted }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Status filter pills */}
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  {[
                    { label: `All (${counts.all})`,        value: 'all', color: T.accent  },
                    { label: `Pending (${counts['0']})`,   value: '0',   color: '#F57C00' },
                    { label: `Supervisor (${counts['1']})`,value: '1',   color: '#1565C0' },
                    { label: `HR (${counts['2']})`,        value: '2',   color: '#2E7D32' },
                    { label: `Denied (${counts['3']})`,    value: '3',   color: '#C62828' },
                  ].map((f) => (
                    <Box
                      key={f.value}
                      onClick={() => { setStatusFilter(f.value); setPage(0); }}
                      sx={{
                        flex: 1, textAlign: 'center', py: 0.6, borderRadius: 1.5, cursor: 'pointer',
                        fontSize: '0.68rem', fontWeight: 700, lineHeight: 1.3,
                        bgcolor: statusFilter === f.value ? f.color : 'transparent',
                        color: statusFilter === f.value ? '#fff' : f.color,
                        border: `1.5px solid ${f.color}`,
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: statusFilter === f.value ? f.color : alpha(f.color, 0.1) },
                      }}
                    >
                      {f.label}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Records list */}
              <Box
                sx={{
                  flexGrow: 1, overflowY: 'auto', p: 2,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                }}
              >
                {paged.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <EventNote sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                      {leaveRequests.length === 0 ? 'No leave requests yet' : 'No records match your search'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                      {leaveRequests.length === 0 ? 'Use the form on the left to add a request.' : 'Try a different filter or search term.'}
                    </Typography>
                  </Box>
                ) : viewMode === 'grid' ? (
                  <Grid container spacing={1.5} alignItems="stretch">
                    {paged.map((req) => {
                      const type = getType(req.leave_code);
                      const locked = isRecordLocked(req);
                      const isSelected = selectedRequests.includes(req.id);
                      return (
                        <Grid item xs={12} sm={3} key={req.id} sx={{ display: 'flex' }}>
                          <Box
                            onClick={() => {
                              if (selectMode && !locked) { handleSelectRequest(req.id); }
                              else { setEditRequest({ ...req }); setOriginalRequest({ ...req }); setIsEditing(false); }
                            }}
                            sx={{
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              p: 2, borderRadius: 2, cursor: 'pointer',
                              opacity: locked ? 0.62 : 1,
                              bgcolor: isSelected ? T.accentFaint : '#fff',
                              border: isSelected ? `1.5px solid ${T.accent}` : `1px solid ${T.accentBorder}`,
                              position: 'relative', transition: 'all 0.13s',
                              '&:hover': { bgcolor: T.rowHover, borderColor: T.accent },
                            }}
                          >
                            {selectMode && !locked && (
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleSelectRequest(req.id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ position: 'absolute', top: 4, right: 4, p: 0, color: T.accent, '&.Mui-checked': { color: T.accent } }}
                                size="small"
                              />
                            )}
                            {locked && (
                              <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                                <LockIcon sx={{ fontSize: 11, color: T.faint }} />
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <PersonIcon sx={{ fontSize: 12, color: T.faint }} />
                              <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{req.employeeNumber}</Typography>
                            </Box>

                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, mb: 0.25 }} noWrap>
                              {employeeNames[req.employeeNumber] || 'Loading…'}
                            </Typography>

                            <Typography sx={{ fontSize: '0.75rem', color: T.muted, mb: 1, flexGrow: 1 }}>
                              applied for{' '}
                              <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>
                                {type.leave_description || req.leave_code}
                              </Box>
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonth sx={{ fontSize: 11, color: T.faint }} />
                                <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>{formatDateRange(req.leave_date)}</Typography>
                              </Box>
                              <StatusPill status={req.status} />
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                ) : (
                  <>
                    <Box
                      sx={{
                        px: 1.5, py: 1,
                        display: 'grid', gridTemplateColumns: '110px 1fr 130px 100px 80px',
                        gap: 1, alignItems: 'center',
                        bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1,
                      }}
                    >
                      {['Emp. No', 'Employee', 'Leave Type', 'Date', 'Status'].map((col) => (
                        <Typography key={col} sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {col}
                        </Typography>
                      ))}
                    </Box>
                    {paged.map((req, idx) => {
                      const type = getType(req.leave_code);
                      const locked = isRecordLocked(req);
                      const isSelected = selectedRequests.includes(req.id);
                      return (
                        <Box
                          key={req.id}
                          onClick={() => {
                            if (selectMode && !locked) handleSelectRequest(req.id);
                            else { setEditRequest({ ...req }); setOriginalRequest({ ...req }); setIsEditing(false); }
                          }}
                          sx={{
                            px: 1.5, py: 1.25,
                            display: 'grid', gridTemplateColumns: '110px 1fr 130px 100px 80px',
                            gap: 1, alignItems: 'center', borderRadius: 1.5, cursor: 'pointer',
                            opacity: locked ? 0.62 : 1,
                            bgcolor: isSelected ? T.accentFaint : idx % 2 === 0 ? T.rowEven : T.rowOdd,
                            border: isSelected ? `1px solid ${T.accent}` : '1px solid transparent',
                            transition: 'background 0.13s ease',
                            '&:hover': { bgcolor: T.rowHover },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {selectMode && !locked && (
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleSelectRequest(req.id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0, mr: 0.5, color: T.accent, '&.Mui-checked': { color: T.accent } }}
                                size="small"
                              />
                            )}
                            <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>{req.employeeNumber}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }} noWrap>
                            {employeeNames[req.employeeNumber] || 'Loading…'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.accent }}>{req.leave_code}</Typography>
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', color: T.muted }} noWrap>{formatDate(req.leave_date)}</Typography>
                          <StatusPill status={req.status} />
                        </Box>
                      );
                    })}
                  </>
                )}
              </Box>

              {/* Bulk action toolbar */}
              {selectMode && (
                <Slide direction="up" in={selectMode} mountOnEnter unmountOnExit>
                  <Box
                    sx={{
                      px: 3, py: 1.75, borderTop: `2px solid ${T.accent}`,
                      bgcolor: T.accentFaint, display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox
                        checked={selectedRequests.length === paged.length && paged.length > 0}
                        indeterminate={selectedRequests.length > 0 && selectedRequests.length < paged.length}
                        onChange={handleSelectAll}
                        sx={{ color: T.accent, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: T.accent } }}
                        size="small"
                      />
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.accent }}>
                        {selectedRequests.length === 0 ? 'Select items' : `${selectedRequests.length} selected`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {[
                        { label: 'Supervisor', status: 1, color: '#1565C0', hov: '#0D47A1', Icon: CheckCircle  },
                        { label: 'HR Approve', status: 2, color: '#2E7D32', hov: '#1B5E20', Icon: DoneAllIcon  },
                        { label: 'Deny',       status: 3, color: '#C62828', hov: '#B71C1C', Icon: ThumbDownIcon },
                      ].map(({ label, status, color, hov, Icon }) => (
                        <AccentButton
                          key={label}
                          onClick={() => handleBulkStatusUpdate(status)}
                          disabled={selectedRequests.length === 0 || bulkLoading}
                          variant="contained"
                          size="small"
                          startIcon={bulkLoading ? <CircularProgress size={11} /> : <Icon sx={{ fontSize: '13px !important' }} />}
                          sx={{ fontSize: '0.72rem', px: 1.25, height: 28, bgcolor: color, '&:hover': { bgcolor: hov }, '&:disabled': { bgcolor: '#ccc' } }}
                        >
                          {label}
                        </AccentButton>
                      ))}
                    </Box>
                  </Box>
                </Slide>
              )}

              {/* Pagination */}
              {filtered.length > 0 && (
                <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}>
                  <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                    rowsPerPageOptions={[12, 24, 48]}
                    sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }}
                  />
                </Box>
              )}
            </SectionCard>
            )}
          </Grid>
        </Grid>

        {/* ── Transaction Logs Modal ── */}
        <Modal open={txModalOpen} onClose={() => setTxModalOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in={txModalOpen}>
            <Box sx={{ width: '100%', maxWidth: 620 }}>
              <TransactionLogsSurface
                variant="modal"
                logs={filteredTxLogs}
                totalCount={txLogs.length}
                filteredTotal={filteredTxLogs.length}
                loading={txLoading}
                error={txError}
                employeeNames={employeeNames}
                leaveTypes={leaveTypes}
                auditPage={auditPage}
                setAuditPage={setAuditPage}
                searchTerm={txSearchTerm}
                setSearchTerm={setTxSearchTerm}
                actionFilter={txActionFilter}
                setActionFilter={setTxActionFilter}
                leaveFilter={txLeaveFilter}
                setLeaveFilter={setTxLeaveFilter}
                kindMap={kindMap}
                getTxKind={getTxKind}
                renderTxSentence={renderTxSentence}
                onClose={() => setTxModalOpen(false)}
                onOpenModal={() => { setTxPanelOpen(false); setTxModalOpen(true); setAuditPage(1); }}
                onExpandPanel={() => { setTxPanelOpen(true); setTxModalOpen(false); setAuditPage(1); }}
              />
            </Box>
          </Fade>
        </Modal>

        {/* ── Edit / View Modal ── */}
        <Modal open={!!editRequest} onClose={closeModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in={!!editRequest}>
            <Box
              sx={{
                width: '100%', maxWidth: 600, maxHeight: '90vh',
                borderRadius: 3, overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                bgcolor: T.surface, display: 'flex', flexDirection: 'column',
              }}
            >
              {editRequest && (
                <>
                  <Box
                    sx={{
                      px: 3.5, py: 2.5, background: T.headerGrad,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      position: 'relative', overflow: 'hidden', flexShrink: 0,
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EventNote sx={{ fontSize: 18, color: '#fff' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }}>
                          {isEditing ? 'Edit Leave Request' : 'Leave Request Details'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
                            #{editRequest.employeeNumber} • {employeeNames[editRequest.employeeNumber] || '—'}
                          </Typography>
                          {!isEditing && <Chip label="View mode" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }} />}
                          {isEditing && <Chip label="Editing" size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: 'rgba(255,200,0,0.22)', color: '#ffe082', fontWeight: 600 }} />}
                        </Box>
                      </Box>
                    </Box>
                    <IconButton onClick={closeModal} size="small" sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                      <Close sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>

                  <Box
                    sx={{
                      px: 3.5, py: 3, overflowY: 'auto', flexGrow: 1,
                      '&::-webkit-scrollbar': { width: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
                    }}
                  >
                    {String(editRequest.status) === '2' && (
                      <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, border: `1px solid ${alpha('#2E7D32', 0.25)}`, bgcolor: '#E8F5E9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha('#2E7D32', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <LockIcon sx={{ fontSize: 15, color: '#2E7D32' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2E7D32', mb: 0.3 }}>HR Approved — Record Locked</Typography>
                          <Typography sx={{ fontSize: '0.76rem', color: '#388E3C', lineHeight: 1.55 }}>
                            This leave request has been approved by HR. It is now final and cannot be edited or deleted.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {String(editRequest.status) === '4' && (
                      <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, border: `1px solid ${alpha('#757575', 0.25)}`, bgcolor: '#F5F5F5', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha('#757575', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <LockIcon sx={{ fontSize: 15, color: '#757575' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#616161', mb: 0.3 }}>Cancelled by Employee — Record Locked</Typography>
                          <Typography sx={{ fontSize: '0.76rem', color: '#757575', lineHeight: 1.55 }}>
                            This leave request was cancelled by the employee. It is final and cannot be edited or deleted.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {String(editRequest.status) === '3' && (
                      <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, border: `1px solid ${alpha('#C62828', 0.25)}`, bgcolor: '#FFEBEE', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha('#C62828', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <LockIcon sx={{ fontSize: 15, color: '#C62828' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#C62828', mb: 0.3 }}>Denied — Record Locked</Typography>
                          <Typography sx={{ fontSize: '0.76rem', color: '#B71C1C', lineHeight: 1.55 }}>
                            This leave request has been denied. It is now final and cannot be edited or deleted.
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Divider sx={{ mb: 2.5, borderColor: T.divider }} />

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={5}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Employee Number</Typography>
                        {isEditing && !isRecordLocked(editRequest) ? (
                          <FieldInput value={editRequest.employeeNumber} onChange={(e) => setEditRequest({ ...editRequest, employeeNumber: e.target.value })} fullWidth size="small" />
                        ) : (
                          <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>#{editRequest.employeeNumber}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>{employeeNames[editRequest.employeeNumber]}</Typography>
                          </Box>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={7}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Leave Type</Typography>
                        {isEditing && !isRecordLocked(editRequest) ? (
                          <FormControl fullWidth size="small">
                            <Select value={editRequest.leave_code} onChange={(e) => setEditRequest({ ...editRequest, leave_code: e.target.value })} displayEmpty sx={selectSx}>
                              <MenuItem value=""><em>Select Type</em></MenuItem>
                              {leaveTypes.map((t) => (
                                <MenuItem key={t.id} value={t.leave_code}>{t.leave_code} — {t.leave_description}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{getType(editRequest.leave_code).leave_description}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>Code: {editRequest.leave_code}</Typography>
                          </Box>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Leave Date</Typography>
                        {isEditing && !isRecordLocked(editRequest) ? (
                          <FieldInput type="date" value={editRequest.leave_date?.split(',')[0] || ''} onChange={(e) => setEditRequest({ ...editRequest, leave_date: e.target.value })} fullWidth size="small" />
                        ) : (
                          <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: '0.82rem', color: T.text }}>{formatDate(editRequest.leave_date)}</Typography>
                          </Box>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.accent, mb: 0.75 }}>Status</Typography>
                        <FormControl fullWidth size="small" disabled={isRecordLocked(editRequest)}>
                          <Select
                            value={String(editRequest.status)}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              setEditRequest((prev) => ({ ...prev, status: newStatus }));
                              if (!isEditing) {
                                const statusObj = allStatusOptions.find((o) => o.value === newStatus);
                                showConfirm({
                                  title: 'Confirm Status Update',
                                  message: `Are you sure you want to update the status to "${statusObj.label}"?`,
                                  confirmLabel: 'Update Status',
                                  confirmColor: statusObj.color || T.accent,
                                  confirmHoverColor: alpha(statusObj.color || T.accent, 0.8),
                                  icon: statusObj.icon || HelpOutlineIcon,
                                  iconColor: statusObj.color || T.accent,
                                  iconBg: statusObj.bg || T.accentFaint,
                                  onConfirm: async () => {
                                    setConfirmModal((p) => ({ ...p, loading: true }));
                                    try {
                                      await axios.put(
                                        `${API_BASE_URL}/leaveRoute/leave_request/${editRequest.id}`,
                                        { ...editRequest, status: Number(newStatus) },
                                        getAuthHeaders(),
                                      );
                                      setOriginalRequest((prev) => ({ ...prev, status: newStatus }));
                                      setSuccessAction('status');
                                      setSuccessOpen(true);
                                      setTimeout(() => setSuccessOpen(false), 2000);
                                      fetchAll();
                                      closeConfirm();
                                      closeModal();
                                    } catch {
                                      setEditRequest((prev) => ({ ...prev, status: originalRequest.status }));
                                      showError('Update Failed', 'Could not update status.');
                                      closeConfirm();
                                    }
                                  },
                                  onClose: () => {
                                    setEditRequest((prev) => ({ ...prev, status: originalRequest.status }));
                                    closeConfirm();
                                  },
                                });
                              }
                            }}
                            sx={selectSx}
                            renderValue={(v) => {
                              const opt = allStatusOptions.find((o) => o.value === v);
                              const Icon = opt?.icon;
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {Icon && <Icon sx={{ fontSize: 14, color: opt.color }} />}
                                  <Typography sx={{ fontWeight: 600, color: opt?.color, fontSize: '0.875rem' }}>{opt?.label}</Typography>
                                </Box>
                              );
                            }}
                          >
                            {statusOptions.map((o) => (
                              <MenuItem key={o.value} value={o.value} sx={{ py: 1.25 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: o.color }} />
                                  <Typography sx={{ fontSize: '0.875rem' }}>{o.label}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, p: 2.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: T.accent, mb: 1.5 }}>Employee Leave Balance</Typography>
                      <LeaveCredits personID={editRequest.employeeNumber} compact accentColor={T.accent} />
                    </Box>
                  </Box>

                  <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0 }}>
                    {!isEditing ? (
                      <>
                        <AccentButton
                          onClick={() => handleDelete(editRequest.id, editRequest.status)}
                          disabled={isRecordLocked(editRequest)}
                          variant="outlined"
                          startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', borderColor: '#e57373', color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.04)', borderColor: '#c62828', transform: 'none' }, '&:disabled': { borderColor: '#ccc', color: '#ccc' } }}
                        >
                          Delete
                        </AccentButton>
                        <AccentButton
                          onClick={() => setIsEditing(true)}
                          disabled={isRecordLocked(editRequest)}
                          variant="contained"
                          startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#ddd' } }}
                        >
                          Edit Record
                        </AccentButton>
                      </>
                    ) : (
                      <>
                        <AccentButton
                          onClick={() => { setEditRequest({ ...originalRequest }); setIsEditing(false); }}
                          variant="outlined"
                          startIcon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                        >
                          Cancel
                        </AccentButton>
                        <AccentButton
                          onClick={handleUpdate}
                          disabled={!hasChanges()}
                          variant="contained"
                          startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
                        >
                          Save Changes
                        </AccentButton>
                      </>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>
      </Box>
    </Fade>
  );
};

export default LeaveRequest;