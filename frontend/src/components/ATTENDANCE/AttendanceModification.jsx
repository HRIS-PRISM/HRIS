import API_BASE_URL from '../../apiConfig';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import useAttendanceRealtimeRefresh from '../../hooks/useAttendanceRealtimeRefresh';
import useAttendanceWorkflow from '../../hooks/useAttendanceWorkflow';
import AttendanceWorkflowNav from './AttendanceWorkflowNav';
import { navigateAttendanceWorkflow } from '../../utils/attendanceWorkflow';
import axios from 'axios';
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Chip,
  CircularProgress,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  alpha,
  styled,
  Card,
  Fab,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Paper,
  List,
  ListItemButton,
  Avatar,
  InputAdornment,
  IconButton,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  AccessTime,
  CalendarToday,
  ArrowBackIos,
  Clear,
  SaveAs,
  Refresh,
  Edit,
  FilterList,
  CheckCircle,
  CompareArrows,
  AdminPanelSettings,
  Cancel,
  VerifiedUser,
  Person,
  KeyboardArrowUp,
  EventNote,
  TableRows,
  AddCircleOutline,
  Close,
  ExpandMore,
  ExpandLess,
  Notes as NotesIcon,
  EditCalendar as EditCalendarIcon,
  EventAvailable,
  History,
  Comment,
  Restore,
  InfoOutlined,
  Male as MaleIcon,
  Female as FemaleIcon,
} from '@mui/icons-material';
import { DeptBadge, EmpCatBadge } from '../LEAVE/EARNINGS/RecordsList';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import {
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterDateControls,
  AttendanceFilterSummaryBox,
  filterPanelScrollSx,
  filterSidebarCardSx,
  attendanceMainPanelHeightSx,
  ATTENDANCE_COMPACT_PAGE_SX,
  MONTHS_SHORT,
  AttendanceEmployeeSearchSection,
  useAttendanceCompactPage,
} from './attendanceFilterLayout';
import AttendanceEmployeeSearchField from './AttendanceEmployeeSearchField';
import LoadingOverlay from '../LoadingOverlay';
import {
  buildAuditPeriodLabel,
  logAttendanceModificationSave,
  logAttendanceModificationView,
} from '../../utils/moduleEmployeeSearchAudit';

// ─── Poppins font import ───────────────────────────────────────────────────
const poppinsImport = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`;

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.055)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
  divider: 'rgba(0,0,0,0.08)',
  weekend: 'rgba(109,35,35,0.045)',
  noRecord: 'rgba(245,158,11,0.06)',
  noRecordBorder: 'rgba(245,158,11,0.25)',
  font: "'Poppins', sans-serif",
  autoFilled: 'rgba(109,35,35,0.07)',
  autoFilledBorder: 'rgba(109,35,35,0.35)',
};

/** Grid templates — minmax(0,…) prevents column bleed/overlap */
const RECORDS_ROW_GRID =
  'minmax(72px, 0.9fr) minmax(68px, 0.75fr) minmax(44px, 0.55fr) repeat(4, minmax(104px, 1.05fr)) minmax(120px, 1fr) minmax(130px, 1.1fr)';
const FULL_MONTH_ROW_GRID =
  '28px minmax(56px, 0.65fr) minmax(68px, 0.75fr) minmax(44px, 0.55fr) repeat(4, minmax(104px, 1.05fr)) minmax(120px, 1fr) minmax(130px, 1.1fr)';
const MOD_TABLE_MIN_WIDTH = 1048;

const rowHasOfficialSchedule = (record) =>
  !!(
    record?.officialTimeIN ||
    record?.officialTimeOUT ||
    record?.officialBreaktimeIN ||
    record?.officialBreaktimeOUT
  );

const canFullMonthAutoFill = (record, autoFilledRows) =>
  !!record?.date && !autoFilledRows.has(record.date);

/** Shown in EDIT REMARKS after force-sync from Device module */
const DEVICE_RESTORE_REMARK_PREFIX = 'Returned data from the device';
const DEVICE_RESTORE_REMARK_LEGACY_PREFIX = 'Returned to default';
const DEVICE_RESTORE_REMARK =
  'Returned data from the device · Device data restored';

/** Shown in EDIT REMARKS after punch status update in Attendance State */
const STATE_CORRECTION_REMARK_PREFIX = 'Updated in Attendance State';

const isDeviceRestoreRemark = (text) => {
  const trimmed = String(text || '').trim();
  return trimmed.startsWith(DEVICE_RESTORE_REMARK_PREFIX)
    || trimmed.startsWith(DEVICE_RESTORE_REMARK_LEGACY_PREFIX);
};

const isStateCorrectedRemark = (text) =>
  String(text || '').trim().startsWith(STATE_CORRECTION_REMARK_PREFIX)
  || String(text || '').trim().startsWith('Corrected in Attendance State');

const parseStateCorrectedRemark = (text) => {
  const full = String(text || '').trim();
  const updatedMatch = full.match(/punch status updated:\s*(.+)$/i);
  if (updatedMatch) {
    return { summary: updatedMatch[1].trim(), full };
  }
  const legacyMatch = full.match(/(?:Updated|Corrected) in Attendance State\s*[·•]\s*(.+)$/i);
  if (legacyMatch) {
    return { summary: legacyMatch[1].trim(), full };
  }
  return { summary: 'Status updated', full };
};

const REMARK_VARIANT_STYLES = {
  autofill: {
    color: T.accent,
    bg: T.accentFaint,
    border: T.accentBorder,
    icon: EventAvailable,
  },
  edit: {
    color: '#2e7d32',
    bg: alpha('#2e7d32', 0.06),
    border: alpha('#2e7d32', 0.22),
    icon: Comment,
  },
  state: {
    color: T.accent,
    bg: alpha(T.accent, 0.06),
    border: T.accentBorder,
    icon: AdminPanelSettings,
  },
  restore: {
    color: '#1976d2',
    bg: 'rgba(33,150,243,0.06)',
    border: 'rgba(33,150,243,0.22)',
    icon: Restore,
  },
};

/** Click to expand/collapse remark detail inline */
const CollapsibleRemarkDetail = ({ text, summary, variant = 'edit' }) => {
  const [open, setOpen] = useState(false);
  const full = String(text || '').trim();
  if (!full) return null;

  const style = REMARK_VARIANT_STYLES[variant] || REMARK_VARIANT_STYLES.edit;
  const Icon = style.icon;
  const preview = summary || (full.length > 32 ? `${full.slice(0, 32)}…` : full);

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%', mt: 0.2 }}>
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.35,
          borderRadius: '6px',
          bgcolor: style.bg,
          border: `1px solid ${style.border}`,
          cursor: 'pointer',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: alpha(style.color, 0.1) },
        }}
      >
        <Icon sx={{ fontSize: 11, color: style.color, flexShrink: 0 }} />
        <Typography
          sx={{
            fontSize: '0.62rem',
            fontWeight: 600,
            color: T.text,
            fontFamily: T.font,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
            fontStyle: variant === 'autofill' || variant === 'edit' ? 'italic' : 'normal',
          }}
        >
          {preview}
        </Typography>
        {open
          ? <ExpandLess sx={{ fontSize: 14, color: style.color, flexShrink: 0 }} />
          : <ExpandMore sx={{ fontSize: 14, color: style.color, flexShrink: 0 }} />}
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 0.35,
            px: 0.75,
            py: 0.5,
            borderRadius: '6px',
            bgcolor: style.bg,
            border: `1px solid ${style.border}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.62rem',
              color: T.text,
              fontFamily: T.font,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              fontStyle: variant === 'autofill' || variant === 'edit' ? 'italic' : 'normal',
            }}
          >
            {full}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

/** Inline status pill for the EMP # column */
const RowStatusPill = ({ icon: Icon, label, color, bg, border }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.35,
      px: 0.6,
      py: 0.15,
      borderRadius: '4px',
      bgcolor: bg,
      border: `1px solid ${border}`,
      width: 'fit-content',
    }}
  >
    <Icon sx={{ fontSize: 9, color }} />
    <Typography
      sx={{
        fontSize: '0.55rem',
        fontWeight: 700,
        color,
        letterSpacing: '0.03em',
        fontFamily: T.font,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Typography>
  </Box>
);

/** All row status chips shown under EMP # / STATUS */
const RecordStatusChips = ({
  isAutoFilled = false,
  isManual = false,
  rowDirty = false,
  rowSavedMod = false,
  isStateCorrected = false,
  isRestoredToDefault = false,
  showModifiedFromRemarks = false,
  showAutofillFromDb = false,
  compact = false,
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, ...(compact ? {} : { mt: 0.35 }) }}>
    {isAutoFilled && (
      <RowStatusPill icon={EventAvailable} label="FILLED" color={T.accent} bg={T.accentFaint} border={T.accentBorder} />
    )}
    {isManual && (
      <RowStatusPill icon={Edit} label="MANUAL ADD" color="#6a1b9a" bg={alpha('#7b1fa2', 0.1)} border={alpha('#7b1fa2', 0.28)} />
    )}
    {rowDirty && !isAutoFilled && (
      <RowStatusPill icon={Edit} label="UNSAVED" color="#e65100" bg={alpha('#e65100', 0.08)} border={alpha('#e65100', 0.3)} />
    )}
    {isStateCorrected && (
      <RowStatusPill icon={AdminPanelSettings} label="UPDATED FROM STATE" color={T.accent} bg={T.accentFaint} border={T.accentBorder} />
    )}
    {isRestoredToDefault && (
      <RowStatusPill icon={Restore} label="RESTORED DEVICE DATA" color="#1976d2" bg="rgba(33,150,243,0.08)" border="rgba(33,150,243,0.24)" />
    )}
    {rowSavedMod && !isAutoFilled && (
      <RowStatusPill icon={CheckCircle} label="MODIFIED" color="#2e7d32" bg={alpha('#2e7d32', 0.08)} border={alpha('#2e7d32', 0.25)} />
    )}
    {showModifiedFromRemarks && (
      <RowStatusPill icon={CheckCircle} label="MODIFIED" color="#2e7d32" bg={alpha('#2e7d32', 0.08)} border={alpha('#2e7d32', 0.25)} />
    )}
    {showAutofillFromDb && !isAutoFilled && (
      <RowStatusPill icon={EventAvailable} label="FILLED" color={T.accent} bg={T.accentFaint} border={T.accentBorder} />
    )}
  </Box>
);
const shimmerKf = `
${poppinsImport}
* { font-family: 'Poppins', sans-serif !important; }
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
@keyframes autoFillPulse {
  0%   { box-shadow: 0 0 0 0 rgba(109,35,35,0.35); }
  70%  { box-shadow: 0 0 0 8px rgba(109,35,35,0); }
  100% { box-shadow: 0 0 0 0 rgba(109,35,35,0); }
}`;

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

const AttendanceSearchWireframe = () => (
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
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box>
            <Bone w={280} h={18} sx={{ mb: 1 }} />
            <Bone w={380} h={11} />
          </Box>
        </Box>
      </Box>
      <Grid container spacing={2}>
        {[3, 9].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box
              sx={{
                borderRadius: '12px',
                border: '0.5px solid rgba(0,0,0,0.09)',
                bgcolor: '#fff',
                overflow: 'hidden',
                animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`,
                height: 'calc(100vh - 280px)',
              }}
            >
              <Box
                sx={{
                  px: 2.5, py: 1.25, bgcolor: T.accentFaint,
                  borderBottom: `1px solid ${T.divider}`,
                  display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 42,
                }}
              >
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
                <Bone w={lg === 3 ? 140 : 220} h={12} />
              </Box>
              {lg === 3 ? (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i}>
                      <Bone w={120} h={10} sx={{ mb: 1 }} />
                      <Box sx={{ height: 38, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                    <Bone w={160} h={11} />
                  </Box>
                  <Box sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accent, display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.6fr 1.2fr 1.2fr 1.2fr 1.2fr 1.1fr 1.1fr', gap: 1.5 }}>
                    {[100, 70, 55, 90, 90, 90, 90, 75, 75].map((w, i) => (
                      <Box key={i} sx={{ height: 9, width: w, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.22)' }} />
                    ))}
                  </Box>
                  {[...Array(7)].map((_, i) => (
                    <Box key={i} sx={{ px: 2.5, py: 1.5, display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.6fr 1.2fr 1.2fr 1.2fr 1.2fr 1.1fr 1.1fr', gap: 1.5, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd }}>
                      <Bone w={90} h={12} />
                      <Bone w={70} h={12} />
                      <Bone w={55} h={12} />
                      {[0, 1, 2, 3].map((ci) => (
                        <Box key={ci} sx={{ height: 36, borderRadius: '6px', border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }} />
                      ))}
                      <Box sx={{ height: 22, borderRadius: '5px', bgcolor: T.accentFaint }} />
                      <Box sx={{ height: 22, borderRadius: '5px', bgcolor: 'rgba(46,125,50,0.06)' }} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
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
  fontFamily: "'Poppins', sans-serif",
});

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    backgroundColor: '#fff',
    transition: 'border-color 0.18s',
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent },
  },
  '& label.Mui-focused': { color: T.accent },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 8, height: 8 },
  '&::-webkit-scrollbar-thumb': { bgcolor: alpha(T.accent, 0.35), borderRadius: 4 },
  '&::-webkit-scrollbar-track': { bgcolor: alpha(T.accent, 0.06) },
  scrollbarWidth: 'thin',
  scrollbarColor: `${alpha(T.accent, 0.35)} ${alpha(T.accent, 0.06)}`,
};

const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: T.accentFaint, minHeight: 42, flexShrink: 0 }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>{title}</Typography>
    {right && (<><Box sx={{ flex: 1 }} />{right}</>)}
  </Box>
);

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45), fontFamily: T.font }}>
      {children}
    </Typography>
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
      type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%', padding: icon ? '9px 13px 9px 34px' : '9px 13px',
        borderRadius: '8px', border: `1px solid ${T.accentBorder}`,
        fontSize: '0.875rem', outline: 'none', fontFamily: T.font,
        boxSizing: 'border-box', transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff', color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={(e) => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={(e) => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

// ─── Auto-colon Time Input (display HH:MM; store HH:MM:00 for API) ─────────
const digitsOnly = (str) => (str || '').replace(/\D/g, '');
const formatTimeDigits = (digits) => {
  const d = digits.slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
};
/** Strip seconds from displayed time labels (e.g. "06:04:00 AM" → "06:04 AM"). */
const displayTimeNoSeconds = (val) => {
  if (!val || String(val).trim() === '') return val || '';
  return String(val).replace(/(\d{1,2}:\d{2}):\d{2}/, '$1');
};
const parseStoredTime = (val) => {
  if (!val || String(val).trim() === '') return { digits: '', ampm: 'AM' };
  const str = String(val).trim().toUpperCase();
  let ampm = 'AM';
  let timePart = str;
  if (str.endsWith(' PM')) { ampm = 'PM'; timePart = str.slice(0, -3).trim(); }
  else if (str.endsWith(' AM')) { ampm = 'AM'; timePart = str.slice(0, -3).trim(); }
  else if (str.endsWith('PM')) { ampm = 'PM'; timePart = str.slice(0, -2).trim(); }
  else if (str.endsWith('AM')) { ampm = 'AM'; timePart = str.slice(0, -2).trim(); }
  else { const hm = str.match(/^(\d{1,2}):/); if (hm) ampm = parseInt(hm[1], 10) >= 12 ? 'PM' : 'AM'; }
  // Keep HHMM only — ignore seconds from stored HH:MM:SS values
  return { digits: digitsOnly(timePart).slice(0, 4), ampm };
};
const buildStoredTime = (digits, ampm) => {
  if (!digits) return '';
  const formatted = formatTimeDigits(digits);
  // Persist with :00 when HH:MM is complete so backend stays HH:MM:SS
  const withSeconds = digits.length >= 4 ? `${formatted}:00` : formatted;
  return `${withSeconds} ${ampm}`;
};

const TimeInput = ({ value, onChange, unsaved, savedMod, isNewRow, autoFilled }) => {
  const { digits: initDigits, ampm: initAmPm } = parseStoredTime(value);
  const [localDigits, setLocalDigits] = useState(initDigits);
  const [ampm, setAmPm] = useState(initAmPm);
  useEffect(() => { const { digits, ampm: ap } = parseStoredTime(value); setLocalDigits(digits); setAmPm(ap); }, [value]);

  const borderColor = unsaved ? '#e65100' : savedMod ? '#2e7d32' : autoFilled ? T.accent : isNewRow ? 'rgba(245,158,11,0.4)' : T.accentBorder;
  const bgColor = unsaved ? 'rgba(230,81,0,0.04)' : savedMod ? 'rgba(46,125,50,0.04)' : autoFilled ? T.accentFaint : isNewRow ? 'rgba(245,158,11,0.04)' : '#fff';

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') { e.preventDefault(); const nd = localDigits.slice(0, -1); setLocalDigits(nd); onChange({ target: { value: buildStoredTime(nd, ampm) } }); return; }
    if (e.key === 'Delete') { e.preventDefault(); setLocalDigits(''); onChange({ target: { value: '' } }); return; }
    if (/^\d$/.test(e.key)) { e.preventDefault(); if (localDigits.length >= 4) return; const nd = localDigits + e.key; setLocalDigits(nd); onChange({ target: { value: buildStoredTime(nd, ampm) } }); }
  };
  const toggleAmPm = () => { const n = ampm === 'AM' ? 'PM' : 'AM'; setAmPm(n); onChange({ target: { value: buildStoredTime(localDigits, n) } }); };
  const clearTime = () => {
    if (!localDigits) return;
    setLocalDigits('');
    onChange({ target: { value: '' } });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <input
        type="text" value={formatTimeDigits(localDigits)} onKeyDown={handleKeyDown} onChange={() => {}} placeholder="HH:MM"
        style={{ width: '62px', padding: '6px 7px', borderRadius: '6px 0 0 6px', border: `1.5px solid ${borderColor}`, borderRight: 'none', fontSize: '0.76rem', outline: 'none', fontFamily: 'monospace', fontWeight: 600, boxSizing: 'border-box', background: bgColor, color: T.text, transition: 'border-color 0.15s', letterSpacing: '0.04em', caretColor: T.accent }}
        onFocus={(e) => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
        onBlur={(e) => { e.target.style.borderColor = borderColor; e.target.style.boxShadow = 'none'; }}
      />
      <button type="button" onClick={toggleAmPm} title={`Click to switch to ${ampm === 'AM' ? 'PM' : 'AM'}`}
        style={{ width: '30px', padding: '6px 3px', borderRadius: 0, border: `1.5px solid ${borderColor}`, borderRight: 'none', fontSize: '0.65rem', fontWeight: 800, fontFamily: T.font, cursor: 'pointer', background: ampm === 'AM' ? 'rgba(25,118,210,0.10)' : 'rgba(198,40,40,0.10)', color: ampm === 'AM' ? '#1565c0' : '#b71c1c', transition: 'all 0.15s', letterSpacing: '0.03em', userSelect: 'none', lineHeight: 1, boxSizing: 'border-box' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = ampm === 'AM' ? 'rgba(25,118,210,0.18)' : 'rgba(198,40,40,0.18)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ampm === 'AM' ? 'rgba(25,118,210,0.10)' : 'rgba(198,40,40,0.10)'; }}
      >{ampm}</button>
      <button
        type="button"
        onClick={clearTime}
        disabled={!localDigits}
        title="Clear time"
        aria-label="Clear time"
        style={{
          width: '22px',
          padding: '6px 0',
          borderRadius: '0 6px 6px 0',
          border: `1.5px solid ${borderColor}`,
          fontSize: '0.7rem',
          fontWeight: 800,
          fontFamily: T.font,
          cursor: localDigits ? 'pointer' : 'default',
          background: localDigits ? 'rgba(183,28,28,0.06)' : bgColor,
          color: localDigits ? '#b71c1c' : alpha(T.text, 0.28),
          transition: 'all 0.15s',
          lineHeight: 1,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: localDigits ? 1 : 0.55,
        }}
        onMouseEnter={(e) => {
          if (!localDigits) return;
          e.currentTarget.style.background = 'rgba(183,28,28,0.14)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = localDigits ? 'rgba(183,28,28,0.06)' : bgColor;
        }}
      >
        <Close sx={{ fontSize: 12 }} />
      </button>
    </Box>
  );
};
const MemoTimeInput = memo(TimeInput);

// ─── Helper: check if a record has incomplete time fields ──────────────────
const isIncompleteRecord = (record) => {
  const fields = ['timeIN', 'breaktimeIN', 'breaktimeOUT', 'timeOUT'];
  const filled = fields.filter((f) => record[f] && String(record[f]).trim() !== '');
  if (filled.length === 0) return false;
  return filled.length < 4;
};

// ─── Fill Break helpers — used by the new "Fill Break" row action ─────────
const BREAK_IN_DEFAULT = '12:00:00 PM';
const BREAK_OUT_DEFAULT = '01:00:00 PM';
const isNoBreakValue = (v) => !v || String(v).trim() === '';

// TimeInput cluster = HH:MM (62) + AM/PM (30) + clear (22)
const TIME_INPUT_CLUSTER_PX = 62 + 30 + 22;
// Row grid uses gap={1.25} → 10px with default MUI spacing
const ROW_GRID_GAP_PX = 10;
/**
 * Width from start of BRK IN column through BRK OUT's X button:
 * half of the 2-col span + half gap + one time-input cluster.
 */
const FILL_BREAK_WIDTH = `calc(50% + ${ROW_GRID_GAP_PX / 2}px + ${TIME_INPUT_CLUSTER_PX}px)`;

/** Pill button — spans BRK IN + BRK OUT when both break fields are empty */
const FillBreakBtn = ({ onClick }) => (
  <Tooltip title="Auto-fill Break In (12:00 PM) & Break Out (1:00 PM)" placement="top">
    <Box sx={{ width: '100%', display: 'block' }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          background: 'rgba(106,31,138,0.08)',
          border: '1px solid rgba(106,31,138,0.32)',
          borderRadius: '6px',
          padding: '5px 10px',
          cursor: 'pointer',
          color: '#6a1f8a',
          fontSize: '0.62rem',
          fontWeight: 800,
          fontFamily: T.font,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'background-color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(106,31,138,0.16)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(106,31,138,0.08)'; }}
      >
        <AccessTime sx={{ fontSize: 11 }} />
        Fill Break
      </button>
    </Box>
  </Tooltip>
);

// ─── OrigValueRow — for auto-fill, always show what was there before ───────
const OrigValueRow = ({ origVal, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2 }}>
    <History sx={{ fontSize: 9, color: color || T.accentMid, flexShrink: 0 }} />
    <Typography sx={{ fontSize: '0.6rem', color: color || T.accentMid, fontFamily: 'monospace', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
      orig: {displayTimeNoSeconds(origVal) || '—'}
    </Typography>
  </Box>
);

// ─── Fill Note Cell — auto-fill button + auto-fill remarks ────────────────
const FillNoteCell = ({
  showFillButton,
  onAutoFill,
  isAutoFilled,
  pendingAutofillRemarks,
  savedAutofillRemarks,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.25, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
    {showFillButton && (
      <Tooltip title="Auto-fill all times from official schedule (overwrites existing)" placement="top">
        <button
          type="button"
          onClick={onAutoFill}
          style={{
            background: T.accent,
            border: 'none',
            borderRadius: '6px',
            padding: '5px 8px',
            cursor: 'pointer',
            color: '#FEF9E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            fontSize: '0.62rem',
            fontWeight: 800,
            fontFamily: T.font,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            boxShadow: `0 2px 6px rgba(109,35,35,0.3)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
        >
          <EventAvailable sx={{ fontSize: 11, flexShrink: 0 }} />
          Fill Schd.
        </button>
      </Tooltip>
    )}
    {isAutoFilled && pendingAutofillRemarks && (
      <CollapsibleRemarkDetail variant="autofill" text={pendingAutofillRemarks} />
    )}
    {!isAutoFilled && savedAutofillRemarks && (
      <CollapsibleRemarkDetail variant="autofill" text={savedAutofillRemarks} />
    )}
  </Box>
);

// ─── Edit Note Cell — modification remarks; system notes use compact chips ───
const EditNoteCell = ({ savedRemarks, wasModified }) => {
  const text = String(savedRemarks || '').trim();
  if (!text) return null;

  if (isStateCorrectedRemark(text)) {
    const { summary, full } = parseStateCorrectedRemark(text);
    return (
      <Box sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', pt: 0.25 }}>
        <CollapsibleRemarkDetail variant="state" summary={summary} text={full} />
      </Box>
    );
  }

  if (isDeviceRestoreRemark(text)) {
    return (
      <Box sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', pt: 0.25 }}>
        <CollapsibleRemarkDetail variant="restore" summary="Returned data from the device" text={text} />
      </Box>
    );
  }

  if (!wasModified) return null;

  return (
    <Box sx={{ pt: 0.25, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <CollapsibleRemarkDetail variant="edit" text={text} />
    </Box>
  );
};

// ─── RecordsRow ────────────────────────────────────────────────────────────
const RecordsRow = memo(function RecordsRow({
  record,
  savedRecord,
  baselineRecord,
  index,
  everModifiedFields,
  onFieldChange,
  autoFilledRows,
  onAutoFill,
  onFillBreak,
}) {
  const rowKey = `${record.personID}-${record.date}`;
  const isAutoFilled = autoFilledRows.has(rowKey);
  const autoFillMeta = autoFilledRows.get(rowKey);

  const rowDirty = isDirty(record, savedRecord);
  const rowEverModified = EDITABLE_FIELDS.some((f) =>
    everModifiedFields.has(`${record.personID}-${record.date}-${f}`)
  );
  const rowSavedMod = !rowDirty && rowEverModified;
  const isManual = record.manualEntry === 1;
  const hasOfficialTimes = record.officialTimeIN || record.officialTimeOUT || record.officialBreaktimeIN || record.officialBreaktimeOUT;

  const savedRemarks = record.remarks || '';
  const savedAutofillRemarks = record.autofill_remarks || '';
  const pendingAutofillRemarks = autoFillMeta?.remarks || '';
  const isRestoredToDefault = isDeviceRestoreRemark(savedRemarks);
  const isStateCorrected = isStateCorrectedRemark(savedRemarks);

  // Fill Break — only offer it when the row isn't auto-filled and both break
  // fields are currently empty (nothing to overwrite/lose).
  const breakBothEmpty = isNoBreakValue(record.breaktimeIN) && isNoBreakValue(record.breaktimeOUT);
  const showFillBreak = !isAutoFilled && breakBothEmpty;

  const leftBorder = isStateCorrected ? `2px solid ${T.accent}` : isAutoFilled ? `3px solid ${T.accent}` : isRestoredToDefault ? '2px solid #1976d2' : rowDirty ? '3px solid #e65100' : rowSavedMod ? '3px solid #2e7d32' : isManual ? '3px solid #7b1fa2' : '3px solid transparent';
  const rowBg = isStateCorrected ? alpha(T.accent, 0.02) : isAutoFilled ? T.accentFaint : isRestoredToDefault ? 'rgba(33,150,243,0.03)' : rowDirty ? alpha('#e65100', 0.04) : rowSavedMod ? alpha('#2e7d32', 0.04) : isManual ? alpha('#7b1fa2', 0.04) : index % 2 === 0 ? '#fff' : T.rowOdd;

  return (
    <Box sx={{ borderBottom: `1px solid ${T.divider}`, borderLeft: leftBorder, transition: 'background 0.13s', bgcolor: rowBg, '&:hover': { bgcolor: isAutoFilled ? alpha(T.accent, 0.09) : T.rowHover }, minWidth: 0, animation: isAutoFilled ? 'autoFillPulse 0.6s ease-out' : 'none' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: RECORDS_ROW_GRID, px: 2, py: 1, gap: 1.25, alignItems: 'center', minWidth: MOD_TABLE_MIN_WIDTH }}>
        {/* Employee ID + Status */}
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.78rem', color: T.text, fontFamily: T.font }}>
            {record.personID}
          </Typography>
          <RecordStatusChips
            isAutoFilled={isAutoFilled}
            isManual={isManual}
            rowDirty={rowDirty}
            rowSavedMod={rowSavedMod && !isRestoredToDefault && !isStateCorrected}
            isStateCorrected={isStateCorrected}
            isRestoredToDefault={isRestoredToDefault}
            showModifiedFromRemarks={
              !rowDirty && !isAutoFilled && !rowSavedMod && !!record.remarks
              && !isRestoredToDefault && !isStateCorrected
            }
            showAutofillFromDb={!rowDirty && !isAutoFilled && !!record.autofill_remarks}
          />
        </Box>
        {/* Date */}
        <Typography sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 500, fontFamily: T.font, pt: 0.25 }}>{record.date}</Typography>
        {/* Day */}
        <Typography sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 500, fontFamily: T.font, pt: 0.25 }}>{record.Day}</Typography>

        {/* Time fields */}
        {EDITABLE_FIELDS.map((field) => {
          const unsaved = savedRecord && (record[field] || '') !== (savedRecord[field] || '');
          const savedMod = !unsaved && everModifiedFields.has(`${record.personID}-${record.date}-${field}`);
          const baselineVal = baselineRecord?.[field] || '';
          const currentVal = record[field] || '';
          const origVal = autoFillMeta?.originalValues?.[field];
          // FIX 3: suppress "was:" when row is auto-filled — "orig:" already covers it
          const showWas = !isAutoFilled && baselineVal && baselineVal !== currentVal;
          const isBreakField = field === 'breaktimeIN' || field === 'breaktimeOUT';
          // When both breaks are empty, cover BRK IN + BRK OUT up to the clear (X) edge
          if (showFillBreak && isBreakField) {
            if (field === 'breaktimeIN') return null;
            return (
              <Box
                key="fill-break"
                sx={{
                  // Records grid: emp | date | day | timeIN | brkIN | brkOUT | timeOUT | …
                  gridColumn: '5 / 7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  minWidth: 0,
                }}
              >
                <Box sx={{ width: FILL_BREAK_WIDTH, maxWidth: '100%' }}>
                  <FillBreakBtn onClick={() => onFillBreak(index)} />
                </Box>
              </Box>
            );
          }
          return (
            <Box key={field}>
              <MemoTimeInput
                value={currentVal}
                onChange={(e) => onFieldChange(index, field, e.target.value)}
                unsaved={unsaved}
                savedMod={savedMod}
                autoFilled={isAutoFilled}
              />
              {showWas && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.3 }}>
                  <History sx={{ fontSize: 9, color: unsaved ? '#e65100' : T.faint, flexShrink: 0 }} />
                  <Typography sx={{
                    fontSize: '0.6rem',
                    fontFamily: 'monospace',
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap',
                    color: unsaved ? '#e65100' : T.faint,
                    fontWeight: unsaved ? 700 : 400,
                  }}>
                    {`was: ${displayTimeNoSeconds(baselineVal)}`}
                  </Typography>
                </Box>
              )}
              {isAutoFilled && origVal !== undefined && origVal !== currentVal && (
                <OrigValueRow origVal={origVal} color={T.accentMid} />
              )}
            </Box>
          );
        })}

        {/* FILL NOTE */}
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          <FillNoteCell
            showFillButton={!!hasOfficialTimes && !isAutoFilled}
            onAutoFill={() => onAutoFill(index)}
            isAutoFilled={isAutoFilled}
            pendingAutofillRemarks={pendingAutofillRemarks}
            savedAutofillRemarks={savedAutofillRemarks}
          />
        </Box>

        {/* EDIT NOTE */}
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          <EditNoteCell
            savedRemarks={savedRemarks}
            wasModified={(rowEverModified || rowDirty || !!savedRemarks) && !isStateCorrected}
          />
        </Box>
      </Box>
    </Box>
  );
});

// ─── FullMonthRow ──────────────────────────────────────────────────────────
const FullMonthRow = memo(function FullMonthRow({
  record,
  savedRow,
  baselineRow,
  index,
  fullEverModified,
  onFieldChange,
  autoFilledRows,
  onAutoFill,
  onFillBreak,
  selected = false,
  onToggleSelect,
  canSelectForFill = false,
}) {
  const rowKey = record.date;
  const isAutoFilled = autoFilledRows.has(rowKey);
  const autoFillMeta = autoFilledRows.get(rowKey);

  const weekend = isWeekend(record.Day);
  const rowDirty = !record.isNew && isDirty(record, savedRow);
  const rowEverModified = !record.isNew && EDITABLE_FIELDS.some((f) =>
    fullEverModified.has(`${record.date}-${f}`)
  );
  const rowSavedMod = !record.isNew && !rowDirty && rowEverModified;
  const hasTyped = record.isNew && hasAnyTime(record);

  const hasOfficialTimes = rowHasOfficialSchedule(record);
  const showAutoFill = hasOfficialTimes && !isAutoFilled;

  const savedRemarks = record.remarks || '';
  const savedAutofillRemarks = record.autofill_remarks || '';
  const pendingAutofillRemarks = autoFillMeta?.remarks || '';
  const isRestoredToDefault = isDeviceRestoreRemark(savedRemarks);
  const isStateCorrected = isStateCorrectedRemark(savedRemarks);

  // Fill Break — only offer it when the row isn't auto-filled and both break
  // fields are currently empty (nothing to overwrite/lose).
  const breakBothEmpty = isNoBreakValue(record.breaktimeIN) && isNoBreakValue(record.breaktimeOUT);
  const showFillBreak = !isAutoFilled && breakBothEmpty;

  const leftBorder = isStateCorrected ? `2px solid ${T.accent}` : isAutoFilled ? `3px solid ${T.accent}` : isRestoredToDefault ? '2px solid #1976d2' : rowDirty ? '3px solid #e65100' : rowSavedMod ? '3px solid #2e7d32' : hasTyped ? '3px solid #f59e0b' : '3px solid transparent';
  const rowBg = isStateCorrected ? alpha(T.accent, 0.02) : isAutoFilled ? T.accentFaint : isRestoredToDefault ? 'rgba(33,150,243,0.03)' : rowDirty ? alpha('#e65100', 0.04) : rowSavedMod ? alpha('#2e7d32', 0.04) : record.isNew ? T.noRecord : weekend ? T.weekend : index % 2 === 0 ? '#fff' : T.rowOdd;

  return (
    <Box sx={{ borderBottom: `1px solid ${T.divider}`, borderLeft: leftBorder, transition: 'background 0.13s', bgcolor: rowBg, '&:hover': { bgcolor: isAutoFilled ? alpha(T.accent, 0.09) : T.rowHover }, minWidth: 0, animation: isAutoFilled ? 'autoFillPulse 0.6s ease-out' : 'none' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: FULL_MONTH_ROW_GRID, px: 2, py: 1, gap: 1.25, alignItems: 'center', minWidth: MOD_TABLE_MIN_WIDTH }}>
        {/* Select */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Tooltip
            title={
              canSelectForFill
                ? 'Select for bulk auto-fill'
                : 'Already auto-filled'
            }
            placement="top"
          >
            <span>
              <Checkbox
                size="small"
                checked={selected}
                disabled={!canSelectForFill}
                onChange={() => onToggleSelect?.(record.date)}
                sx={{
                  p: 0,
                  color: T.accentBorder,
                  '&.Mui-checked': { color: T.accent },
                  '&.Mui-disabled': { opacity: 0.35 },
                }}
              />
            </span>
          </Tooltip>
        </Box>
        {/* Status */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, alignItems: 'center' }}>
          {record.isNew ? (
            <RowStatusPill icon={InfoOutlined} label="NO REC" color="#92400e" bg={alpha('#f59e0b', 0.14)} border={alpha('#f59e0b', 0.35)} />
          ) : (
            <RowStatusPill icon={CheckCircle} label="HAS REC" color="#1b5e20" bg={alpha('#2e7d32', 0.1)} border={alpha('#2e7d32', 0.25)} />
          )}
          <RecordStatusChips
            compact
            isAutoFilled={isAutoFilled}
            rowDirty={rowDirty}
            rowSavedMod={rowSavedMod && !isRestoredToDefault && !isStateCorrected}
            isStateCorrected={isStateCorrected}
            isRestoredToDefault={isRestoredToDefault}
            showModifiedFromRemarks={
              !record.isNew && !rowDirty && !isAutoFilled && !rowSavedMod && !!record.remarks
              && !isRestoredToDefault && !isStateCorrected
            }
            showAutofillFromDb={!record.isNew && !rowDirty && !isAutoFilled && !!record.autofill_remarks}
          />
        </Box>
        {/* Date */}
        <Typography sx={{ fontSize: '0.76rem', color: weekend ? T.accentMid : T.muted, fontWeight: weekend ? 700 : 500, fontFamily: T.font, pt: 0.25 }}>{record.date}</Typography>
        {/* Day */}
        <Typography sx={{ fontSize: '0.76rem', color: T.muted, fontWeight: 500, fontFamily: T.font, pt: 0.25 }}>{record.Day}</Typography>

        {/* Time fields */}
        {EDITABLE_FIELDS.map((field) => {
          const unsaved = !record.isNew && savedRow && (record[field] || '') !== (savedRow[field] || '');
          const savedMod = !record.isNew && !unsaved && fullEverModified.has(`${record.date}-${field}`);
          const baselineVal = baselineRow?.[field] || '';
          const currentVal = record[field] || '';
          const origVal = autoFillMeta?.originalValues?.[field];
          // FIX 3: suppress "was:" when row is auto-filled — "orig:" already covers it
          const showWas = !record.isNew && !isAutoFilled && baselineVal && baselineVal !== currentVal;
          const isBreakField = field === 'breaktimeIN' || field === 'breaktimeOUT';
          // When both breaks are empty, cover BRK IN + BRK OUT up to the clear (X) edge
          if (showFillBreak && isBreakField) {
            if (field === 'breaktimeIN') return null;
            return (
              <Box
                key="fill-break"
                sx={{
                  // Full-month grid: select | status | date | day | timeIN | brkIN | brkOUT | timeOUT | …
                  gridColumn: '6 / 8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  minWidth: 0,
                }}
              >
                <Box sx={{ width: FILL_BREAK_WIDTH, maxWidth: '100%' }}>
                  <FillBreakBtn onClick={() => onFillBreak(index)} />
                </Box>
              </Box>
            );
          }
          return (
            <Box key={field}>
              <MemoTimeInput
                value={currentVal}
                onChange={(e) => onFieldChange(index, field, e.target.value)}
                unsaved={unsaved}
                savedMod={savedMod}
                isNewRow={record.isNew}
                autoFilled={isAutoFilled}
              />
              {showWas && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.3 }}>
                  <History sx={{ fontSize: 9, color: unsaved ? '#e65100' : T.faint, flexShrink: 0 }} />
                  <Typography sx={{
                    fontSize: '0.6rem',
                    fontFamily: 'monospace',
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap',
                    color: unsaved ? '#e65100' : T.faint,
                    fontWeight: unsaved ? 700 : 400,
                  }}>
                    {`was: ${displayTimeNoSeconds(baselineVal)}`}
                  </Typography>
                </Box>
              )}
              {isAutoFilled && origVal !== undefined && origVal !== currentVal && (
                <OrigValueRow origVal={origVal} color={T.accentMid} />
              )}
            </Box>
          );
        })}

        {/* FILL NOTE */}
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          <FillNoteCell
            showFillButton={!!showAutoFill}
            onAutoFill={() => onAutoFill(index)}
            isAutoFilled={isAutoFilled}
            pendingAutofillRemarks={pendingAutofillRemarks}
            savedAutofillRemarks={savedAutofillRemarks}
          />
        </Box>

        {/* EDIT NOTE */}
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          <EditNoteCell
            savedRemarks={savedRemarks}
            wasModified={(rowEverModified || rowDirty || (record.isNew && hasAnyTime(record)) || !!savedRemarks) && !isStateCorrected}
          />
        </Box>
      </Box>
    </Box>
  );
});

const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: 'transparent', border: `1px solid ${color}40`, borderRadius: '6px', padding: '4px 10px', cursor: disabled ? 'default' : 'pointer', color, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, fontFamily: T.font, transition: 'background-color 0.15s, border-color 0.15s', whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1 }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

const HeaderActionBtn = ({ icon, label, onClick, disabled = false, variant = 'outlined' }) => {
  const isContained = variant === 'contained';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: isContained
          ? (disabled ? alpha(T.accent, 0.35) : T.accent)
          : (disabled ? '#fafafa' : '#fff'),
        border: isContained ? 'none' : `1px solid ${disabled ? T.divider : T.accent}`,
        borderRadius: '8px',
        padding: '7px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: isContained ? '#FEF9E1' : (disabled ? T.faint : T.accent),
        fontSize: '0.75rem',
        fontWeight: 700,
        fontFamily: T.font,
        transition: 'all 0.15s',
        boxShadow: isContained && !disabled ? `0 2px 8px ${alpha(T.accent, 0.28)}` : 'none',
        whiteSpace: 'nowrap',
        opacity: disabled && !isContained ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (isContained) e.currentTarget.style.backgroundColor = T.accentDark;
        else {
          e.currentTarget.style.backgroundColor = T.accentFaint;
          e.currentTarget.style.borderColor = T.accentDark;
        }
      }}
      onMouseLeave={(e) => {
        if (isContained) {
          e.currentTarget.style.backgroundColor = disabled ? alpha(T.accent, 0.35) : T.accent;
        } else {
          e.currentTarget.style.backgroundColor = disabled ? '#fafafa' : '#fff';
          e.currentTarget.style.borderColor = disabled ? T.divider : T.accent;
        }
      }}
    >
      {icon}{label}
    </button>
  );
};

const TabBtn = ({ active, icon: Icon, label, badge, onClick }) => (
  <button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px 8px 0 0', border: `1px solid ${active ? T.accentBorder : 'transparent'}`, borderBottom: active ? '1px solid #fff' : `1px solid ${T.divider}`, background: active ? '#fff' : 'transparent', cursor: 'pointer', color: active ? T.accent : T.muted, fontSize: '0.78rem', fontWeight: active ? 800 : 600, fontFamily: T.font, marginBottom: active ? '-1px' : '0', transition: 'all 0.15s ease', position: 'relative', zIndex: active ? 2 : 1 }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accentFaint; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent'; } }}
  >
    <Icon sx={{ fontSize: 13 }} />
    {label}
    {badge != null && (
      <Box sx={{ px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: active ? T.accent : 'rgba(0,0,0,0.1)', color: active ? '#fff' : T.muted, fontSize: '0.65rem', fontWeight: 800, lineHeight: 1.6, minWidth: 18, textAlign: 'center' }}>
        {badge}
      </Box>
    )}
  </button>
);

// ─── Helpers ───────────────────────────────────────────────────────────────
const deepClone = (arr) => arr.map((r) => ({ ...r }));
const EDITABLE_FIELDS = ['timeIN', 'breaktimeIN', 'breaktimeOUT', 'timeOUT'];
const FIELD_LABELS = { timeIN: 'Time IN', breaktimeIN: 'Breaktime IN', breaktimeOUT: 'Breaktime OUT', timeOUT: 'Time OUT' };
const getChanges = (current, saved) => {
  if (!saved) return [];
  return EDITABLE_FIELDS.filter((f) => (current[f] || '') !== (saved[f] || '')).map((f) => ({ field: f, label: FIELD_LABELS[f], before: saved[f] || '—', after: current[f] || '—' }));
};
const isDirty = (current, saved) => { if (!saved) return false; return EDITABLE_FIELDS.some((f) => (current[f] || '') !== (saved[f] || '')); };
const buildModificationChangeSummary = (entries) =>
  (entries || [])
    .filter((e) => e.changes?.length)
    .map((e) => {
      const detail = e.changes
        .map((c) => `${c.label} ${c.before} → ${c.after}`)
        .join(', ');
      return `${e.date}: ${detail}`;
    })
    .join(' · ');
const isWeekend = (dayName) => dayName === 'Saturday' || dayName === 'Sunday';
const hasAnyTime = (record) => EDITABLE_FIELDS.some((f) => record[f] && String(record[f]).trim() !== '');
const getEmployeeIdentifier = (emp) => {
  if (!emp || typeof emp !== 'object') return '';
  const raw = emp.personID ?? emp.PersonID ?? emp.employeeNum ?? emp.employeeNumber ?? emp.agencyEmployeeNum ?? '';
  return String(raw).trim();
};

const toProfileEmployee = (emp) => {
  if (!emp) return null;
  const num = getEmployeeIdentifier(emp);
  return { ...emp, employeeNumber: num };
};

const buildDisplayName = (e) => {
  const last = (e?.lastName || '').trim();
  const first = (e?.firstName || '').trim();
  const mid = (e?.middleName || '').trim();
  if (!last && !first) {
    const raw = String(e?.name || e?.fullName || '').trim();
    if (!raw) {
      const num = getEmployeeIdentifier(e);
      return num ? `#${num}` : '';
    }
    if (raw.includes(',')) return raw;
    return raw;
  }
  return last
    ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(' ')}`
    : [first, mid].filter(Boolean).join(' ');
};

const getEmployeeInitials = (e) => {
  const last = e?.lastName?.[0];
  const first = e?.firstName?.[0];
  if (last || first) {
    return `${last || ''}${first || ''}`.toUpperCase() || '?';
  }
  const nm = String(e?.name || e?.fullName || '').trim();
  if (!nm) return '?';
  const parts = nm.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return nm[0]?.toUpperCase() || '?';
};

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
  const num = getEmployeeIdentifier(employee);
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
            fontFamily: T.font,
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
            sx={{ color: T.faint, fontSize: '0.65rem', whiteSpace: 'nowrap', fontFamily: T.font }}
          >
            #{num}
          </Typography>
          {gender && <GenderBadge gender={gender} />}
          {dc && <DeptBadge code={dc} />}
          {ec && <EmpCatBadge label={ec.label} colorHex={ec.colorHex} />}
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

// ─── Remarks Dialog (for auto-fill) ────────────────────────────────────────
const RemarksDialog = ({ open, onClose, onConfirm, date, isNew, bulkCount = 0 }) => {
  const [remarks, setRemarks] = useState('');
  useEffect(() => { if (open) setRemarks(''); }, [open]);
  const canConfirm = remarks.trim().length > 0;
  const isBulk = bulkCount > 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${T.accentBorder}`, boxShadow: `0 20px 60px ${alpha(T.accent, 0.22)}`, fontFamily: T.font } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 3, py: 2.5, background: `linear-gradient(135deg, #4a0e0e 0%, ${T.accent} 50%, ${T.accentMid} 100%)`, display: 'flex', alignItems: 'center', gap: 2, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(254,249,225,0.1) 0%,transparent 70%)' }} />
          <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(254,249,225,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(254,249,225,0.3)', flexShrink: 0, zIndex: 1 }}>
            <EventAvailable sx={{ fontSize: 22, color: '#FEF9E1' }} />
          </Box>
          <Box sx={{ zIndex: 1 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FEF9E1', lineHeight: 1.2, fontFamily: T.font }}>
              {isBulk ? `Auto-Fill ${bulkCount} Days` : 'Auto-Fill Official Time'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(254,249,225,0.75)', mt: 0.3, fontFamily: T.font }}>
              {isBulk
                ? `${bulkCount} selected days — bulk schedule fill`
                : `${date} — ${isNew ? 'Create new record' : 'Override all time fields'}`}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: '#FFFDF5' }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
          <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 2, fontFamily: T.font, lineHeight: 1.6 }}>
            {isBulk ? (
              <>This will <strong>overwrite all four time fields</strong> on <strong>{bulkCount} selected days</strong>, using each day&apos;s official schedule. One reason will apply to all selected rows (e.g. PVP / leave with pay).</>
            ) : (
              <>This will <strong>overwrite all four time fields</strong> (Time IN, Breaktime IN, Breaktime OUT, Time OUT) using the employee&apos;s official schedule for this date. Please provide a reason below.</>
            )}
          </Typography>
          <Box sx={{ p: 2, borderRadius: '8px', border: `1.5px solid ${remarks.trim() ? T.accentBorder : alpha(T.accent, 0.12)}`, bgcolor: remarks.trim() ? T.accentFaint : '#fff', transition: 'all 0.2s' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <NotesIcon sx={{ fontSize: 14, color: remarks.trim() ? T.accent : T.faint }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: remarks.trim() ? T.accent : T.faint, fontFamily: T.font, transition: 'color 0.2s' }}>
                Reason / Remarks <span style={{ color: '#C62828' }}>*</span>
              </Typography>
            </Box>
            <textarea
              value={remarks} onChange={(e) => setRemarks(e.target.value)}
              placeholder="Describe the reason for this auto-fill (e.g. missed punch, system error, schedule override…)"
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${remarks.trim() ? T.accentBorder : alpha(T.accent, 0.18)}`, fontSize: '0.82rem', fontFamily: T.font, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#fff', color: T.text, transition: 'border-color 0.18s', lineHeight: 1.6 }}
              onFocus={(e) => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
              onBlur={(e) => { e.target.style.borderColor = remarks.trim() ? T.accentBorder : alpha(T.accent, 0.18); e.target.style.boxShadow = 'none'; }}
            />
            {!remarks.trim() && <Typography sx={{ fontSize: '0.68rem', color: '#C62828', mt: 0.5, fontFamily: T.font }}>A reason is required to proceed.</Typography>}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FFFDF5', borderTop: `1px solid ${T.divider}`, gap: 1.5 }}>
        <RowBtn icon={<Cancel sx={{ fontSize: 13 }} />} label="Cancel" onClick={onClose} color="#C62828" hoverBg="rgba(198,40,40,0.08)" />
        <button
          onClick={() => canConfirm && onConfirm(remarks.trim())} disabled={!canConfirm}
          style={{ flex: 1, background: canConfirm ? `linear-gradient(135deg, #4a0e0e 0%, ${T.accent} 100%)` : 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: canConfirm ? 'pointer' : 'not-allowed', color: canConfirm ? '#FEF9E1' : 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, fontFamily: T.font, transition: 'all 0.18s', boxShadow: canConfirm ? `0 4px 14px ${alpha(T.accent, 0.35)}` : 'none' }}
          onMouseEnter={(e) => { if (canConfirm) e.currentTarget.style.background = `linear-gradient(135deg, #3a0a0a 0%, ${T.accentDark} 100%)`; }}
          onMouseLeave={(e) => { if (canConfirm) e.currentTarget.style.background = `linear-gradient(135deg, #4a0e0e 0%, ${T.accent} 100%)`; }}
        >
          <EventAvailable sx={{ fontSize: 15 }} />
          Confirm Auto-Fill
        </button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Authorization Dialog ──────────────────────────────────────────────────
const AuthorizationDialog = ({
  open,
  onClose,
  onConfirm,
  records,
  savedRecords,
  isFullMonth = false,
  autoFilledRowKeys = new Map(),
  isFullMonthTab = false,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [remarks, setRemarks] = useState('');
  useEffect(() => { if (open) { setAcknowledged(false); setShowDiff(true); setRemarks(''); } }, [open]);

  const changedRows = isFullMonth
    ? (records || [])
        .filter((rec) => {
          if (rec.isNew) return hasAnyTime(rec);
          const saved = (savedRecords || []).find((s) => s.date === rec.date);
          return saved && isDirty(rec, saved);
        })
        .map((rec) => {
          const key = rec.date;
          const isAutoFilled = autoFilledRowKeys.has(key);
          if (rec.isNew) {
            return {
              date: rec.date, day: rec.Day, isInsert: true, _isAutoFilled: isAutoFilled,
              changes: EDITABLE_FIELDS
                .filter((f) => rec[f] && String(rec[f]).trim() !== '')
                .map((f) => ({ label: FIELD_LABELS[f], before: '—', after: rec[f] || '—' })),
            };
          }
          const saved = (savedRecords || []).find((s) => s.date === rec.date);
          return { date: rec.date, day: rec.Day, isInsert: false, _isAutoFilled: isAutoFilled, changes: getChanges(rec, saved) };
        })
        .filter((r) => r.changes.length > 0)
    : (savedRecords || [])
        .map((saved, idx) => {
          const current = records[idx];
          if (!current) return null;
          const key = `${current.personID}-${current.date}`;
          const isAutoFilled = autoFilledRowKeys.has(key);
          const changes = getChanges(current, saved);
          if (changes.length === 0) return null;
          return { date: saved.date, day: saved.Day, isInsert: false, _isAutoFilled: isAutoFilled, changes };
        })
        .filter(Boolean);

  const allAutoFilled = changedRows.length > 0 && changedRows.every((r) => r._isAutoFilled);
  const remarksRequired = !allAutoFilled;
  const canConfirm = acknowledged && changedRows.length > 0 && (!remarksRequired || remarks.trim().length > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${alpha(T.accent, 0.2)}`, boxShadow: `0 20px 60px ${alpha(T.accent, 0.25)}`, fontFamily: T.font } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 3, py: 2.5, background: `linear-gradient(135deg, #4a0e0e 0%, ${T.accent} 50%, ${T.accentMid} 100%)`, display: 'flex', alignItems: 'center', gap: 2, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(254,249,225,0.1) 0%,transparent 70%)' }} />
          <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(254,249,225,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(254,249,225,0.3)', flexShrink: 0, zIndex: 1 }}>
            <AdminPanelSettings sx={{ fontSize: 22, color: '#FEF9E1' }} />
          </Box>
          <Box sx={{ zIndex: 1 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FEF9E1', lineHeight: 1.2, fontFamily: T.font }}>Confirm Modification</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(254,249,225,0.75)', mt: 0.3, fontFamily: T.font }}>
              {isFullMonth ? 'Full month attendance modification (includes new insertions)' : 'Attendance record modification'}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: '#FFFDF5' }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Box onClick={() => setShowDiff((p) => !p)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', px: 2, py: 1.25, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, '&:hover': { bgcolor: 'rgba(109,35,35,0.10)' }, transition: 'all 0.18s' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CompareArrows sx={{ fontSize: 16, color: T.accent }} />
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.accent, fontFamily: T.font }}>Pending Changes Summary</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.7rem', color: T.faint, fontFamily: T.font }}>{showDiff ? 'Hide ▲' : 'Show ▼'}</Typography>
          </Box>
          <Collapse in={showDiff}>
            <Box sx={{ mt: 1.5, maxHeight: 260, overflowY: 'auto', borderRadius: '8px', border: `1px solid ${T.accentBorder}` }}>
              {changedRows.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 36, mb: 1 }} />
                  <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontFamily: T.font }}>No changes detected.</Typography>
                </Box>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Date', 'Day', 'Type', 'Field', 'Before', 'After'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, color: T.accent, fontSize: '0.72rem', bgcolor: T.accentFaint, py: 1, letterSpacing: '0.05em', fontFamily: T.font }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changedRows.flatMap((row, ri) =>
                      row.changes.map((ch, ci) => (
                        <TableRow key={`${ri}-${ci}`} sx={{ '&:nth-of-type(even)': { bgcolor: 'rgba(109,35,35,0.02)' } }}>
                          {ci === 0 && (
                            <>
                              <TableCell rowSpan={row.changes.length} sx={{ fontWeight: 600, color: T.accent, borderRight: `1px solid ${T.divider}`, verticalAlign: 'top', pt: 1.5, fontSize: '0.78rem', fontFamily: T.font }}>{row.date}</TableCell>
                              <TableCell rowSpan={row.changes.length} sx={{ color: T.muted, borderRight: `1px solid ${T.divider}`, verticalAlign: 'top', pt: 1.5, fontSize: '0.78rem', fontFamily: T.font }}>{row.day}</TableCell>
                              <TableCell rowSpan={row.changes.length} sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: '4px', bgcolor: row.isInsert ? alpha('#f59e0b', 0.12) : alpha(T.accent, 0.08), border: `1px solid ${row.isInsert ? alpha('#f59e0b', 0.3) : T.accentBorder}` }}>
                                  <Typography sx={{ fontSize: '0.67rem', fontWeight: 800, color: row.isInsert ? '#b45309' : T.accent, fontFamily: T.font }}>{row.isInsert ? 'NEW' : 'EDIT'}</Typography>
                                </Box>
                              </TableCell>
                            </>
                          )}
                          <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text, fontFamily: T.font }}>{ch.label}</TableCell>
                          <TableCell><Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: '4px', bgcolor: alpha('#d32f2f', 0.08), border: `1px solid ${alpha('#d32f2f', 0.2)}` }}><Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#b71c1c', fontFamily: 'monospace' }}>{ch.before}</Typography></Box></TableCell>
                          <TableCell><Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: '4px', bgcolor: alpha('#2e7d32', 0.08), border: `1px solid ${alpha('#2e7d32', 0.2)}` }}><Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#1b5e20', fontFamily: 'monospace' }}>{ch.after}</Typography></Box></TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </Box>

        {/* ── Remarks box ── */}
        <Box sx={{ px: 3, pt: 1.5, pb: 1 }}>
          <Box sx={{ p: 2, borderRadius: '8px', border: `1.5px solid ${remarks.trim() ? T.accentBorder : alpha(T.accent, 0.12)}`, bgcolor: remarks.trim() ? T.accentFaint : '#fff', transition: 'all 0.25s ease' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <NotesIcon sx={{ fontSize: 14, color: remarks.trim() ? T.accent : T.faint }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: remarks.trim() ? T.accent : T.faint, fontFamily: T.font, transition: 'color 0.2s' }}>
                Remarks / Reason for modification{' '}
                {remarksRequired
                  ? <span style={{ color: '#C62828' }}>*</span>
                  : <span style={{ color: T.faint, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — auto-fill notes already recorded)</span>
                }
              </Typography>
            </Box>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                remarksRequired
                  ? 'Describe the reason for this attendance adjustment (required)…'
                  : 'Add an optional note, or leave blank — each auto-fill already has its own remark…'
              }
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${remarks.trim() ? T.accentBorder : alpha(T.accent, 0.18)}`, fontSize: '0.82rem', fontFamily: T.font, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#fff', color: T.text, transition: 'border-color 0.18s', lineHeight: 1.6 }}
              onFocus={(e) => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
              onBlur={(e) => { e.target.style.borderColor = remarks.trim() ? T.accentBorder : alpha(T.accent, 0.18); e.target.style.boxShadow = 'none'; }}
            />
            {remarksRequired && !remarks.trim() && (
              <Typography sx={{ fontSize: '0.68rem', color: '#C62828', mt: 0.5, fontFamily: T.font }}>
                A reason is required before saving.
              </Typography>
            )}
            {!remarksRequired && (
              <Typography sx={{ fontSize: '0.68rem', color: T.accentMid, mt: 0.5, fontFamily: T.font }}>
                Each auto-filled row already has its fill remark recorded individually.
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── Acknowledgement checkbox ── */}
        <Box sx={{ px: 3, pt: 1, pb: 2.5 }}>
          <Box sx={{ p: 2, borderRadius: '8px', border: `1.5px solid ${acknowledged ? alpha('#2e7d32', 0.35) : T.accentBorder}`, bgcolor: acknowledged ? alpha('#2e7d32', 0.04) : T.accentFaint, transition: 'all 0.25s ease' }}>
            <FormControlLabel
              control={<Checkbox checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} sx={{ color: T.accent, '&.Mui-checked': { color: '#2e7d32' }, '& .MuiSvgIcon-root': { fontSize: 20 } }} />}
              label={<Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: T.text, lineHeight: 1.6, fontFamily: T.font }}>I hereby confirm that the above attendance records are accurate and formally authorize the requested modifications. I acknowledge full responsibility for the accuracy and validity of these changes.</Typography>}
              sx={{ alignItems: 'flex-start', '& .MuiFormControlLabel-label': { mt: 0.3 } }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FFFDF5', borderTop: `1px solid ${T.divider}`, gap: 1.5 }}>
        <RowBtn icon={<Cancel sx={{ fontSize: 13 }} />} label="Cancel" onClick={onClose} color="#C62828" hoverBg="rgba(198,40,40,0.08)" />
        <button
          onClick={() => onConfirm(remarks.trim())} disabled={!canConfirm}
          style={{ flex: 1, background: canConfirm ? 'linear-gradient(135deg,#2e7d32 0%,#388e3c 100%)' : 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: canConfirm ? 'pointer' : 'not-allowed', color: canConfirm ? '#fff' : 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, fontFamily: T.font, transition: 'all 0.18s', boxShadow: canConfirm ? '0 4px 14px rgba(46,125,50,0.3)' : 'none' }}
          onMouseEnter={(e) => { if (canConfirm) e.currentTarget.style.background = 'linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%)'; }}
          onMouseLeave={(e) => { if (canConfirm) e.currentTarget.style.background = 'linear-gradient(135deg,#2e7d32 0%,#388e3c 100%)'; }}
        >
          <VerifiedUser sx={{ fontSize: 15 }} />
          Confirm &amp; Save Changes
        </button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
/** @param {{ embedded?: boolean, initialContext?: object|null, onClose?: () => void }} props */
const AttendanceSearch = ({
  embedded = false,
  initialContext = null,
  onClose,
} = {}) => {
  const { settings } = useSystemSettings();
  const navigate = useNavigate();
  const INITIAL_VISIBLE_ROWS = 60;
  const VISIBLE_ROWS_STEP = 60;

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { hasAccess, loading: accessLoading } = usePageAccess('search-attendance');

  const seedEmpNum = String(initialContext?.employeeNumber || '').trim();
  const seedStart = initialContext?.startDate || '';
  const seedEnd = initialContext?.endDate || '';

  const [personID, setPersonID] = useState(seedEmpNum);
  const [startDate, setStartDate] = useState(seedStart);
  const [endDate, setEndDate] = useState(seedEnd);
  const [selectedYear, setSelectedYear] = useState(() => {
    if (initialContext?.selectedYear != null) return initialContext.selectedYear;
    if (seedStart) {
      const y = Number(String(seedStart).slice(0, 4));
      return Number.isFinite(y) ? y : new Date().getFullYear();
    }
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialContext?.selectedMonth != null) return initialContext.selectedMonth;
    if (seedStart) {
      const m = Number(String(seedStart).slice(5, 7)) - 1;
      return Number.isFinite(m) && m >= 0 && m <= 11 ? m : null;
    }
    return null;
  });
  const [selectedEmployee, setSelectedEmployee] = useState(() =>
    initialContext?.employee ? toProfileEmployee(initialContext.employee) : null,
  );
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [empCatMap, setEmpCatMap] = useState({});
  const [sexMap, setSexMap] = useState({});
  const [quickDatePreset, setQuickDatePreset] = useState('');
  const [activeTab, setActiveTab] = useState('records');
  const [records, setRecords] = useState([]);
  const [savedRecords, setSavedRecords] = useState([]);
  const [everModifiedFields, setEverModifiedFields] = useState(new Set());
  const [modifiedRowKeys, setModifiedRowKeys] = useState(new Set());
  const [fullRecords, setFullRecords] = useState([]);
  const [savedFullRecords, setSavedFullRecords] = useState([]);
  const [fullEverModified, setFullEverModified] = useState(new Set());
  const [fullModifiedRowKeys, setFullModifiedRowKeys] = useState(new Set());

  // ── Keyed baseline Maps — immune to array-index misalignment ──────────────
  const [baselineRecordsMap, setBaselineRecordsMap] = useState(new Map());
  const [baselineFullMap,    setBaselineFullMap]    = useState(new Map());

  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [recordsVisibleCount, setRecordsVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  const [fullVisibleCount, setFullVisibleCount] = useState(INITIAL_VISIBLE_ROWS);

  const [autoFilledRecordsRows, setAutoFilledRecordsRows] = useState(new Map());
  const [autoFilledFullRows, setAutoFilledFullRows] = useState(new Map());
  const [selectedFullMonthDates, setSelectedFullMonthDates] = useState(new Set());
  const [pendingAutoFill, setPendingAutoFill] = useState(null);
  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [pendingAutoFillDate, setPendingAutoFillDate] = useState('');
  const [pendingIsNew, setPendingIsNew] = useState(false);
  const [pendingAutoFillBulkCount, setPendingAutoFillBulkCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittedID, setSubmittedID] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const resultsRef = useRef(null);
  const fullResultsRef = useRef(null);
  const recordsControllerRef = useRef(null);
  const fullControllerRef = useRef(null);
  const recordsCacheRef = useRef(new Map());
  const fullCacheRef = useRef(new Map());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = MONTHS_SHORT;

  const visibleRecords = useMemo(() => records.slice(0, recordsVisibleCount), [records, recordsVisibleCount]);
  const visibleFullRecords = useMemo(() => fullRecords.slice(0, fullVisibleCount), [fullRecords, fullVisibleCount]);

  const fillableFullMonthDates = useMemo(
    () => fullRecords.filter((r) => canFullMonthAutoFill(r, autoFilledFullRows)).map((r) => r.date),
    [fullRecords, autoFilledFullRows],
  );

  const selectedFillableCount = useMemo(
    () => fillableFullMonthDates.filter((d) => selectedFullMonthDates.has(d)).length,
    [fillableFullMonthDates, selectedFullMonthDates],
  );

  const allFillableSelected =
    fillableFullMonthDates.length > 0 &&
    fillableFullMonthDates.every((d) => selectedFullMonthDates.has(d));

  const someFillableSelected =
    fillableFullMonthDates.some((d) => selectedFullMonthDates.has(d)) && !allFillableSelected;

  const handleWorkflowHydrate = useCallback((payload) => {
    setPersonID(payload.employeeNumber);
    setStartDate(payload.startDate);
    setEndDate(payload.endDate);
    if (payload.selectedYear != null) setSelectedYear(payload.selectedYear);
    if (payload.selectedMonth != null) setSelectedMonth(payload.selectedMonth);
    setSubmittedID(payload.employeeNumber);
    setHasSearched(true);
  }, []);

  const {
    prevStep,
    nextStep,
    goPrevious,
    goNext,
  } = useAttendanceWorkflow('modification', {
    employeeNumber: personID,
    startDate,
    endDate,
    onHydrate: handleWorkflowHydrate,
  });

  useAttendanceCompactPage();

  const handleGoToOverallDTR = () => {
    if (!personID || !startDate || !endDate) {
      setError('Please choose an employee and period first.');
      return;
    }
    const fullName = selectedEmployee
      ? String(selectedEmployee.name || selectedEmployee.fullName || '').trim()
      : '';
    navigateAttendanceWorkflow(navigate, 'dtr', {
      employeeNumber: personID,
      fullName,
      startDate,
      endDate,
    });
  };

  const showSnackbar = (message, severity = 'success') => { setSnackbar({ open: true, message, severity }); setSnackbarCountdown(6); };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0) timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });

  useEffect(() => {
    if (accessLoading || hasAccess === false) return;
    let cancelled = false;
    (async () => {
      try {
        const [assignRes, empCatRes, personsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders()),
          axios.get(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
            getAuthHeaders(),
          ),
          axios.get(`${API_BASE_URL}/personalinfo/person_table`, getAuthHeaders()),
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

  const getModificationTargetUsername = useCallback(() => {
    const u = selectedEmployee?.username;
    if (u) return String(u).trim();
    return String(submittedID || personID || '').trim();
  }, [selectedEmployee, submittedID, personID]);

  const getModificationMonthLabel = useCallback(
    () =>
      buildAuditPeriodLabel({
        selectedMonth,
        monthNames: months,
        selectedYear,
        startDate,
        endDate,
      }),
    [selectedMonth, selectedYear, startDate, endDate],
  );

  const auditModificationView = useCallback(
    (recordsCount, viewType = 'records') => {
      const targetId = String(submittedID || personID || '').trim();
      if (!targetId || !startDate || !endDate) return;
      logAttendanceModificationView({
        targetEmployeeNumber: targetId,
        targetUsername: getModificationTargetUsername(),
        periodStart: startDate,
        periodEnd: endDate,
        monthLabel: getModificationMonthLabel(),
        recordsCount,
        viewType,
      });
    },
    [
      submittedID,
      personID,
      startDate,
      endDate,
      getModificationTargetUsername,
      getModificationMonthLabel,
    ],
  );

  // ── fetchRecords ──────────────────────────────────────────────────────────
  const fetchRecords = async (
    showLoading = true,
    { force = false, preserveBaseline = false, auditView = false } = {},
  ) => {
    if (!personID || !startDate || !endDate) return;
    const normalizedPersonID = String(personID || '').trim();
    const cacheKey = `${normalizedPersonID}|${startDate}|${endDate}`;
    setSubmittedID(normalizedPersonID);
    setHasSearched(true);
    if (!force && recordsCacheRef.current.has(cacheKey)) {
      const cached = recordsCacheRef.current.get(cacheKey) || [];
      setRecords(cached); setSavedRecords(deepClone(cached));
      if (!preserveBaseline) {
        const bm = new Map();
        (cached || []).forEach((r) => bm.set(`${r.personID}-${r.date}`, { ...r }));
        setBaselineRecordsMap(bm);
      }
      setLoadedTabs((prev) => new Set([...prev, 'records']));
      if (auditView) auditModificationView((cached || []).length, 'records');
      setLoading(false); return;
    }
    if (recordsControllerRef.current) recordsControllerRef.current.abort();
    const controller = new AbortController();
    recordsControllerRef.current = controller;
    if (showLoading) setLoading(true);
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/attendance/api/view-attendance`, { personID: normalizedPersonID, startDate, endDate }, { ...getAuthHeaders(), signal: controller.signal });
      const fetched = response.data;
      recordsCacheRef.current.set(cacheKey, fetched);
      if (recordsCacheRef.current.size > 20) { const firstKey = recordsCacheRef.current.keys().next().value; recordsCacheRef.current.delete(firstKey); }
      setRecords(fetched); setSavedRecords(deepClone(fetched));
      if (!preserveBaseline) {
        // ── Fresh load: build keyed baseline Map, reset session state ─────────
        const bm = new Map();
        fetched.forEach((r) => bm.set(`${r.personID}-${r.date}`, { ...r }));
        setBaselineRecordsMap(bm);
        setEverModifiedFields(new Set());
        setModifiedRowKeys(new Set());

        // FIX 1 & 2: Seed autoFilledRecordsRows from DB on fresh load so that
        // rows with autofill_remarks are correctly marked as already auto-filled.
        // This prevents the "Fill Official Schd." button from reappearing after
        // a page reload and eliminates the doubled "was:" hint.
        const autoFilledSeed = new Map();
        fetched.forEach((r) => {
          if (r.autofill_remarks) {
            const key = `${r.personID}-${r.date}`;
            autoFilledSeed.set(key, { remarks: r.autofill_remarks, originalValues: {} });
          }
        });
        setAutoFilledRecordsRows(autoFilledSeed);
      } else {
        // ── Post-save / socket refresh: NEVER reset baseline or auto-fill Map.
        // Only add new entries from DB for rows that have autofill_remarks but
        // aren't already tracked in the in-memory Map (handles page reload case).
        setAutoFilledRecordsRows((prev) => {
          const next = new Map(prev);
          fetched.forEach((rec) => {
            if (rec.autofill_remarks) {
              const key = `${rec.personID}-${rec.date}`;
              if (!next.has(key)) {
                next.set(key, { remarks: rec.autofill_remarks, originalValues: {} });
              }
            }
          });
          return next;
        });
      }
      setLoadedTabs((prev) => new Set([...prev, 'records']));
      if (auditView) auditModificationView(fetched.length, 'records');
      if (fetched.length > 0) requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      const msg = 'Failed to fetch attendance records. Please try again.';
      setError(msg); showSnackbar(msg, 'error');
    } finally { if (showLoading && recordsControllerRef.current === controller) setLoading(false); }
  };

  // ── fetchFullRecords ──────────────────────────────────────────────────────
  const fetchFullRecords = async (
    showLoading = true,
    { force = false, preserveBaseline = false, auditView = false } = {},
  ) => {
    if (!personID || !startDate || !endDate) return;
    const normalizedPersonID = String(personID || '').trim();
    const cacheKey = `${normalizedPersonID}|${startDate}|${endDate}`;
    setSubmittedID(normalizedPersonID);
    setHasSearched(true);
    if (!force && fullCacheRef.current.has(cacheKey)) {
      const cached = fullCacheRef.current.get(cacheKey) || [];
      setFullRecords(cached); setSavedFullRecords(deepClone(cached));
      if (!preserveBaseline) {
        const bm = new Map();
        (cached || []).forEach((r) => bm.set(r.date, { ...r }));
        setBaselineFullMap(bm);
      }
      setLoadedTabs((prev) => new Set([...prev, 'fullMonth']));
      if (auditView) auditModificationView((cached || []).length, 'full_month');
      setLoading(false); return;
    }
    if (fullControllerRef.current) fullControllerRef.current.abort();
    const controller = new AbortController();
    fullControllerRef.current = controller;
    if (showLoading) setLoading(true);
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/attendance/api/view-attendance-full`, { personID: normalizedPersonID, startDate, endDate }, { ...getAuthHeaders(), signal: controller.signal });
      const fetched = response.data;
      fullCacheRef.current.set(cacheKey, fetched);
      if (fullCacheRef.current.size > 20) { const firstKey = fullCacheRef.current.keys().next().value; fullCacheRef.current.delete(firstKey); }
      setFullRecords(fetched); setSavedFullRecords(deepClone(fetched));
      setSelectedFullMonthDates(new Set());
      if (!preserveBaseline) {
        // ── Fresh load: build keyed baseline Map, reset session state ─────────
        const bm = new Map();
        fetched.forEach((r) => bm.set(r.date, { ...r }));
        setBaselineFullMap(bm);
        setFullModifiedRowKeys(new Set());

        // FIX 1 & 2: Seed autoFilledFullRows from DB on fresh load so that
        // rows with autofill_remarks are correctly marked as already auto-filled.
        // This prevents the "Fill Official Schd." button from reappearing after
        // a page reload and eliminates the doubled "was:" hint.
        const autoFilledSeed = new Map();
        fetched.forEach((r) => {
          if (r.autofill_remarks) {
            autoFilledSeed.set(r.date, { remarks: r.autofill_remarks, originalValues: {} });
          }
        });
        setAutoFilledFullRows(autoFilledSeed);
      } else {
        // ── Post-save / socket refresh: NEVER reset baseline or auto-fill Map.
        setAutoFilledFullRows((prev) => {
          const next = new Map(prev);
          fetched.forEach((rec) => {
            if (rec.autofill_remarks) {
              if (!next.has(rec.date)) {
                next.set(rec.date, { remarks: rec.autofill_remarks, originalValues: {} });
              }
            }
          });
          return next;
        });
      }
      setLoadedTabs((prev) => new Set([...prev, 'fullMonth']));
      if (auditView) auditModificationView(fetched.length, 'full_month');
      if (fetched.length > 0) requestAnimationFrame(() => fullResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      const msg = 'Failed to fetch full-month attendance records. Please try again.';
      setError(msg); showSnackbar(msg, 'error');
    } finally { if (showLoading && fullControllerRef.current === controller) setLoading(false); }
  };

  useEffect(() => {
    if (!personID || !startDate || !endDate) return;
    setRecords([]); setSavedRecords([]); setEverModifiedFields(new Set()); setModifiedRowKeys(new Set());
    setFullRecords([]); setSavedFullRecords([]); setFullEverModified(new Set()); setFullModifiedRowKeys(new Set());
    setBaselineRecordsMap(new Map()); setBaselineFullMap(new Map());
    setLoadedTabs(new Set());
    setRecordsVisibleCount(INITIAL_VISIBLE_ROWS); setFullVisibleCount(INITIAL_VISIBLE_ROWS);
    setAutoFilledRecordsRows(new Map()); setAutoFilledFullRows(new Map());
    setSelectedFullMonthDates(new Set());
    setHasSearched(true); setSubmittedID(String(personID || '').trim());
    const timer = setTimeout(() => {
      if (activeTab === 'records') fetchRecords(true, { force: true, auditView: true });
      else fetchFullRecords(true, { force: true, auditView: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [personID, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecordsRef = useRef(fetchRecords);
  const fetchFullRecordsRef = useRef(fetchFullRecords);
  const activeTabRef = useRef(activeTab);
  useEffect(() => { fetchRecordsRef.current = fetchRecords; fetchFullRecordsRef.current = fetchFullRecords; activeTabRef.current = activeTab; });

  useAttendanceRealtimeRefresh(
    useCallback(() => {
      if (!personID || !startDate || !endDate) return;
      if (activeTabRef.current === 'records') {
        fetchRecordsRef.current(false, { force: true, preserveBaseline: true });
      } else {
        fetchFullRecordsRef.current(false, { force: true, preserveBaseline: true });
      }
    }, [personID, startDate, endDate]),
    { personId: personID, startDate, endDate, requireDateRange: true, matchMode: 'strict' },
  );

  useEffect(() => { return () => { recordsControllerRef.current?.abort(); fullControllerRef.current?.abort(); }; }, []);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'records') setRecordsVisibleCount(INITIAL_VISIBLE_ROWS);
    if (tab === 'fullMonth') setFullVisibleCount(INITIAL_VISIBLE_ROWS);
    if (!personID || !startDate || !endDate) return;
    if (tab === 'records' && !loadedTabs.has('records')) fetchRecords(true);
    if (tab === 'fullMonth' && !loadedTabs.has('fullMonth')) fetchFullRecords(true);
  };

  const handleRefresh = () => {
    if (activeTab === 'records') { setLoadedTabs((prev) => { const s = new Set(prev); s.delete('records'); return s; }); fetchRecords(true, { force: true }); }
    else { setLoadedTabs((prev) => { const s = new Set(prev); s.delete('fullMonth'); return s; }); fetchFullRecords(true, { force: true }); }
  };

  // ── Save: Records-only ───────────────────────────────────────────────────
  const saveAll = async (remarks = '') => {
    setAuthDialogOpen(false);
    try {
      setLoading(true); setError(''); setSuccess('');

      const changedRowKeys = new Set();
      const changeEntries = [];
      records.forEach((rec, i) => {
        if (isDirty(rec, savedRecords[i])) {
          changedRowKeys.add(`${rec.personID}-${rec.date}`);
          changeEntries.push({
            date: rec.date,
            changes: getChanges(rec, savedRecords[i]),
          });
        }
      });
      const changesSummary = buildModificationChangeSummary(changeEntries);

      const modSet = new Set(everModifiedFields);
      records.forEach((rec, i) => {
        EDITABLE_FIELDS.forEach((f) => {
          if ((rec[f] || '') !== (savedRecords[i]?.[f] || '')) {
            modSet.add(`${rec.personID}-${rec.date}-${f}`);
          }
        });
      });

      const recordsWithAutofill = records.map((rec) => {
        const key = `${rec.personID}-${rec.date}`;
        const meta = autoFilledRecordsRows.get(key);
        return {
          ...rec,
          autofill_remarks: meta?.remarks || rec.autofill_remarks || null,
          _rowChanged: changedRowKeys.has(key),
        };
      });

      const response = await axios.put(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { records: recordsWithAutofill, remarks, changedRowKeys: Array.from(changedRowKeys) },
        getAuthHeaders(),
      );
      const msg = response.data.message || 'Records saved successfully!';
      setSuccess(msg); showSnackbar(msg, 'success');

      const newModifiedRowKeys = new Set(modifiedRowKeys);
      changedRowKeys.forEach((k) => newModifiedRowKeys.add(k));

      await fetchRecords(false, { force: true, preserveBaseline: true });

      setEverModifiedFields(modSet);
      setModifiedRowKeys(newModifiedRowKeys);

      if (changeEntries.length > 0) {
        const targetId = String(submittedID || personID || '').trim();
        logAttendanceModificationSave({
          targetEmployeeNumber: targetId,
          targetUsername: getModificationTargetUsername(),
          periodStart: startDate,
          periodEnd: endDate,
          monthLabel: getModificationMonthLabel(),
          rowsChanged: changeEntries.length,
          changesSummary,
          saveRemarks: remarks || null,
          viewType: 'records',
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save records. Please try again.';
      setError(msg); showSnackbar(msg, 'error');
    } finally { setLoading(false); }
  };

  // ── Save: Full-month ─────────────────────────────────────────────────────
  const saveFullMonth = async (remarks = '') => {
    setAuthDialogOpen(false);
    const toSave = fullRecords.filter((rec) => {
      if (rec.isNew) return hasAnyTime(rec);
      const saved = savedFullRecords.find((s) => s.date === rec.date);
      return saved && isDirty(rec, saved);
    });
    if (toSave.length === 0) { showSnackbar('No changes to save.', 'info'); return; }

    const changedDateKeys = new Set(toSave.map((r) => r.date));

    // FIX: changeEntries / changesSummary were previously referenced further
    // below (inside logAttendanceModificationSave) WITHOUT ever being defined
    // in this function's scope. That caused a ReferenceError to be thrown
    // AFTER the PUT request had already succeeded and records had already been
    // refreshed — so the save actually went through, but the thrown error was
    // caught by the catch block below and displayed as "Failed to save
    // records..." even though nothing failed. Building them here (mirroring
    // saveAll) fixes the false failure message.
    const changeEntries = toSave.map((rec) => {
      if (rec.isNew) {
        return {
          date: rec.date,
          changes: EDITABLE_FIELDS
            .filter((f) => rec[f] && String(rec[f]).trim() !== '')
            .map((f) => ({ field: f, label: FIELD_LABELS[f], before: '—', after: rec[f] })),
        };
      }
      const saved = savedFullRecords.find((s) => s.date === rec.date);
      return { date: rec.date, changes: getChanges(rec, saved) };
    });
    const changesSummary = buildModificationChangeSummary(changeEntries);

    const modSet = new Set(fullEverModified);
    toSave.forEach((rec) => {
      EDITABLE_FIELDS.forEach((f) => {
        if (rec[f] && String(rec[f]).trim() !== '') modSet.add(`${rec.date}-${f}`);
      });
    });

    try {
      setLoading(true); setError(''); setSuccess('');
      const toSaveWithAutofill = toSave.map((rec) => {
        const meta = autoFilledFullRows.get(rec.date);
        return { ...rec, autofill_remarks: meta?.remarks || rec.autofill_remarks || null };
      });
      const response = await axios.put(
        `${API_BASE_URL}/attendance/api/view-attendance-full`,
        { records: toSaveWithAutofill, remarks, changedDateKeys: Array.from(changedDateKeys) },
        getAuthHeaders(),
      );
      const msg = response.data.message || 'Records saved successfully!';
      setSuccess(msg); showSnackbar(msg, 'success');

      const newFullModifiedRowKeys = new Set(fullModifiedRowKeys);
      changedDateKeys.forEach((k) => newFullModifiedRowKeys.add(k));

      await fetchFullRecords(false, { force: true, preserveBaseline: true });

      setFullEverModified(modSet);
      setFullModifiedRowKeys(newFullModifiedRowKeys);

      const targetId = String(submittedID || personID || '').trim();
      logAttendanceModificationSave({
        targetEmployeeNumber: targetId,
        targetUsername: getModificationTargetUsername(),
        periodStart: startDate,
        periodEnd: endDate,
        monthLabel: getModificationMonthLabel(),
        rowsChanged: changeEntries.length,
        changesSummary,
        saveRemarks: remarks || null,
        viewType: 'full_month',
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save records. Please try again.';
      setError(msg); showSnackbar(msg, 'error');
    } finally { setLoading(false); }
  };

  const handleInputChange = useCallback((index, field, value) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleFullInputChange = useCallback((index, field, value) => {
    setFullRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // ── Fill Break — Records tab. Fills Break In (12:00 PM) & Break Out
  // (1:00 PM) in one atomic state update so both fields are guaranteed to be
  // applied together (avoids the "only the last field change sticks" issue
  // that using handleInputChange twice in a row would otherwise cause).
  const handleFillBreakRecords = useCallback((index) => {
    setRecords((prev) => {
      const updated = [...prev];
      const rec = updated[index];
      if (!rec) return prev;
      const breakIn = isNoBreakValue(rec.breaktimeIN) ? BREAK_IN_DEFAULT : rec.breaktimeIN;
      const breakOut = isNoBreakValue(rec.breaktimeOUT) ? BREAK_OUT_DEFAULT : rec.breaktimeOUT;
      updated[index] = { ...rec, breaktimeIN: breakIn, breaktimeOUT: breakOut };
      return updated;
    });
  }, []);

  // ── Fill Break — Full Month tab. Same atomic-update approach as above.
  const handleFillBreakFull = useCallback((index) => {
    setFullRecords((prev) => {
      const updated = [...prev];
      const rec = updated[index];
      if (!rec) return prev;
      const breakIn = isNoBreakValue(rec.breaktimeIN) ? BREAK_IN_DEFAULT : rec.breaktimeIN;
      const breakOut = isNoBreakValue(rec.breaktimeOUT) ? BREAK_OUT_DEFAULT : rec.breaktimeOUT;
      updated[index] = { ...rec, breaktimeIN: breakIn, breaktimeOUT: breakOut };
      return updated;
    });
  }, []);

  const handleAutoFillClickRecords = useCallback((index) => {
    const record = records[index]; if (!record) return;
    setPendingAutoFill({ index, tab: 'records' });
    setPendingAutoFillDate(record.date || '');
    setPendingIsNew(false);
    setPendingAutoFillBulkCount(0);
    setRemarksDialogOpen(true);
  }, [records]);

  const handleAutoFillClickFull = useCallback((index) => {
    const record = fullRecords[index]; if (!record) return;
    setPendingAutoFill({ index, tab: 'fullMonth' });
    setPendingAutoFillDate(record.date || '');
    setPendingIsNew(record.isNew || false);
    setPendingAutoFillBulkCount(0);
    setRemarksDialogOpen(true);
  }, [fullRecords]);

  const handleToggleFullMonthSelect = useCallback((date) => {
    setSelectedFullMonthDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const handleSelectAllFillableFullMonth = useCallback(() => {
    setSelectedFullMonthDates((prev) => {
      const allSelected =
        fillableFullMonthDates.length > 0 &&
        fillableFullMonthDates.every((d) => prev.has(d));
      return allSelected ? new Set() : new Set(fillableFullMonthDates);
    });
  }, [fillableFullMonthDates]);

  const handleBulkAutoFillClickFull = useCallback(() => {
    const dates = fillableFullMonthDates.filter((d) => selectedFullMonthDates.has(d));
    if (!dates.length) {
      showSnackbar('Select at least one day.', 'warning');
      return;
    }
    setPendingAutoFill({ tab: 'fullMonth', bulk: true, dates });
    setPendingAutoFillDate(dates.length === 1 ? dates[0] : `${dates[0]} … ${dates[dates.length - 1]}`);
    setPendingIsNew(false);
    setPendingAutoFillBulkCount(dates.length);
    setRemarksDialogOpen(true);
  }, [fillableFullMonthDates, selectedFullMonthDates, showSnackbar]);

  const handleAutoFillConfirm = useCallback((remarks) => {
    setRemarksDialogOpen(false);
    if (!pendingAutoFill) return;
    const { index, tab, bulk, dates } = pendingAutoFill;

    if (tab === 'records') {
      const record = records[index]; if (!record) return;
      const originalValues = {};
      EDITABLE_FIELDS.forEach((f) => { originalValues[f] = record[f] || ''; });
      const updated = [...records];
      const filled = { ...record };
      filled.timeIN       = record.officialTimeIN      || '';
      filled.breaktimeIN  = record.officialBreaktimeIN  || '';
      filled.breaktimeOUT = record.officialBreaktimeOUT || '';
      filled.timeOUT      = record.officialTimeOUT      || '';
      updated[index] = filled;
      setRecords(updated);
      const key = `${record.personID}-${record.date}`;
      setAutoFilledRecordsRows((prev) => new Map([...prev, [key, { remarks, originalValues }]]));
      showSnackbar(`Auto-filled times for ${record.date}. Click Save to persist.`, 'info');
    } else if (bulk && Array.isArray(dates) && dates.length > 0) {
      const updated = [...fullRecords];
      let filledCount = 0;
      const filledDates = [];
      dates.forEach((date) => {
        const rowIndex = updated.findIndex((r) => r.date === date);
        if (rowIndex === -1) return;
        const record = updated[rowIndex];
        const originalValues = {};
        EDITABLE_FIELDS.forEach((f) => { originalValues[f] = record[f] || ''; });
        updated[rowIndex] = {
          ...record,
          timeIN: record.officialTimeIN || '',
          breaktimeIN: record.officialBreaktimeIN || '',
          breaktimeOUT: record.officialBreaktimeOUT || '',
          timeOUT: record.officialTimeOUT || '',
        };
        filledDates.push({ date, originalValues });
        filledCount += 1;
      });
      setFullRecords(updated);
      setAutoFilledFullRows((prev) => {
        const next = new Map(prev);
        filledDates.forEach(({ date, originalValues }) => {
          next.set(date, { remarks, originalValues });
        });
        return next;
      });
      setSelectedFullMonthDates(new Set());
      showSnackbar(
        filledCount > 0
          ? `Auto-filled ${filledCount} day(s). Click Save to persist.`
          : 'No rows were auto-filled.',
        filledCount > 0 ? 'info' : 'warning',
      );
    } else {
      const record = fullRecords[index]; if (!record) return;
      const originalValues = {};
      EDITABLE_FIELDS.forEach((f) => { originalValues[f] = record[f] || ''; });
      const updated = [...fullRecords];
      const filled = { ...record };
      filled.timeIN       = record.officialTimeIN      || '';
      filled.breaktimeIN  = record.officialBreaktimeIN  || '';
      filled.breaktimeOUT = record.officialBreaktimeOUT || '';
      filled.timeOUT      = record.officialTimeOUT      || '';
      updated[index] = filled;
      setFullRecords(updated);
      setAutoFilledFullRows((prev) => new Map([...prev, [record.date, { remarks, originalValues }]]));
      showSnackbar(`Auto-filled times for ${record.date}. Click Save to persist.`, 'info');
    }
    setPendingAutoFill(null);
    setPendingAutoFillBulkCount(0);
  }, [pendingAutoFill, records, fullRecords, showSnackbar]);

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex); setQuickDatePreset('');
  };

  const handleQuickDatePresetChange = (value) => {
    setQuickDatePreset(value); if (!value) return;
    const setRange = (start, end) => { setStartDate(start); setEndDate(end); setSelectedMonth(null); };
    switch (value) {
      case 'today': setRange(formattedToday, formattedToday); break;
      case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); const s = y.toISOString().substring(0, 10); setRange(s, s); break; }
      case 'last7': { const d = new Date(today); d.setDate(d.getDate() - 7); setRange(d.toISOString().substring(0, 10), formattedToday); break; }
      case 'last15': { const d = new Date(today); d.setDate(d.getDate() - 15); setRange(d.toISOString().substring(0, 10), formattedToday); break; }
      case 'last30': { const d = new Date(today); d.setMonth(d.getMonth() - 1); setRange(d.toISOString().substring(0, 10), formattedToday); break; }
      default: break;
    }
  };

  const handleClearFilters = () => {
    setPersonID(''); setSelectedEmployee(null); setStartDate(''); setEndDate('');
    setRecords([]); setSavedRecords([]); setEverModifiedFields(new Set()); setModifiedRowKeys(new Set());
    setFullRecords([]); setSavedFullRecords([]); setFullEverModified(new Set()); setFullModifiedRowKeys(new Set());
    setBaselineRecordsMap(new Map()); setBaselineFullMap(new Map());
    setError(''); setSuccess(''); setSelectedMonth(null); setQuickDatePreset('');
    setLoadedTabs(new Set()); setRecordsVisibleCount(INITIAL_VISIBLE_ROWS); setFullVisibleCount(INITIAL_VISIBLE_ROWS);
    setSubmittedID(''); setHasSearched(false); setLoading(false);
    setAutoFilledRecordsRows(new Map()); setAutoFilledFullRows(new Map());
    setSelectedFullMonthDates(new Set());
    recordsCacheRef.current.clear(); fullCacheRef.current.clear();
    recordsControllerRef.current?.abort(); fullControllerRef.current?.abort();
  };

  const recordsCount = records.length;
  const fullDaysCount = fullRecords.length;
  const missingCount = fullRecords.filter((r) => r.isNew).length;

  const displayEmployee = useMemo(() => {
    if (selectedEmployee) return toProfileEmployee(selectedEmployee);
    const id = String(submittedID || personID || '').trim();
    if (!id) return null;
    return { employeeNumber: id, name: '' };
  }, [selectedEmployee, submittedID, personID]);

  if (pageLoading || accessLoading) return <AttendanceSearchWireframe />;
  if (hasAccess === false)
    return <AccessDenied title="Access Denied" message="You do not have permission to access Attendance Modification. Contact your administrator to request access." returnPath="/admin-home" returnButtonText="Return to Home" />;

  // ─── Left sidebar panel ────────────────────────────────────────────────
  const renderLeftPanel = () => (
    <Box sx={filterPanelScrollSx}>
      <AttendanceEmployeeSearchSection selected={Boolean(selectedEmployee)}>
        <AttendanceEmployeeSearchField
          searchApi="remittance"
          browseOnFocus
          selectedEmployee={selectedEmployee}
          value={personID}
          onSelect={(emp) => {
            const resolvedEmployeeId = getEmployeeIdentifier(emp);
            setSelectedEmployee(toProfileEmployee(emp));
            setPersonID(resolvedEmployeeId);
          }}
          onClear={() => { setSelectedEmployee(null); setPersonID(''); }}
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

      <AttendanceFilterDateControls
        selectedYear={selectedYear}
        onYearChange={(e) => {
          setSelectedYear(parseInt(e.target.value));
          setSelectedMonth(null);
          showSnackbar('Year changed — please click a month to load records.', 'info');
        }}
        yearOptions={yearOptions}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
        onMonthClear={() => { setSelectedMonth(null); setStartDate(''); setEndDate(''); }}
        onQuickDate={handleQuickDatePresetChange}
        quickValue={quickDatePreset}
        months={months}
      />

      <AttendanceFilterSummaryBox
        title="Summary"
        primary={loading ? 'Loading…' : hasSearched ? `${recordsCount} records` : 'No data loaded'}
        secondary={startDate && endDate ? `${startDate} → ${endDate}` : 'Select a period'}
      />
      {hasSearched && fullDaysCount > 0 && activeTab === 'fullMonth' && (
        <Typography sx={{ fontSize: '0.68rem', color: missingCount > 0 ? '#b45309' : '#2e7d32', mt: 0.5, fontFamily: T.font }}>
          {missingCount > 0 ? `${missingCount} missing days` : 'All days accounted for'}
        </Typography>
      )}
      {hasSearched && (recordsCount > 0 || fullDaysCount > 0) && (
        <Box sx={{ mt: 1 }}>
          <AttendanceFilterSectionLabel icon={CalendarToday}>Custom Range</AttendanceFilterSectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: alpha(T.accent, 0.55), mb: 0.3, fontFamily: T.font, letterSpacing: '0.06em', textTransform: 'uppercase' }}>From</Typography>
              <NativeInput type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setQuickDatePreset(''); setSelectedMonth(null); }} style={{ width: '100%' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: alpha(T.accent, 0.55), mb: 0.3, fontFamily: T.font, letterSpacing: '0.06em', textTransform: 'uppercase' }}>To</Typography>
              <NativeInput type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setQuickDatePreset(''); setSelectedMonth(null); }} style={{ width: '100%' }} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  // ─── Right panel content ───────────────────────────────────────────────
  const renderRightPanel = () => {
    if (!hasSearched || !submittedID || !startDate || !endDate) {
      return (
        <Box sx={{ py: 10, textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Person sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
          </Box>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5, fontFamily: T.font }}>Select an Employee &amp; Period</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontFamily: T.font }}>Choose an employee, then pick a month or date range from the left panel.</Typography>
        </Box>
      );
    }

    const recordsColumns = ['EMP #', 'DATE', 'DAY', 'TIME IN', 'BRK IN', 'BRK OUT', 'TIME OUT', 'FILL REMARKS', 'EDIT REMARKS'];
    const fullColumns    = ['', 'STATUS', 'DATE', 'DAY', 'TIME IN', 'BRK IN', 'BRK OUT', 'TIME OUT', 'FILL REMARKS', 'EDIT REMARKS'];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        {/* Tab bar */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, px: 2, pt: 1.5, borderBottom: `1px solid ${T.divider}`, flexShrink: 0, minWidth: 0 }}>
          <TabBtn active={activeTab === 'records'} icon={TableRows} label="Device Records" badge={recordsCount > 0 ? recordsCount : null} onClick={() => handleTabSwitch('records')} />
          <TabBtn active={activeTab === 'fullMonth'} icon={EventNote} label="Full Month Records" badge={fullDaysCount > 0 ? fullDaysCount : null} onClick={() => handleTabSwitch('fullMonth')} />
          {activeTab === 'fullMonth' && missingCount > 0 && (
            <Box sx={{ ml: 1, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.3, borderRadius: 5, bgcolor: alpha('#f59e0b', 0.12), border: `1px solid ${alpha('#f59e0b', 0.3)}` }}>
              <AddCircleOutline sx={{ fontSize: 12, color: '#b45309' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', fontFamily: T.font }}>{missingCount} missing {missingCount === 1 ? 'day' : 'days'}</Typography>
            </Box>
          )}
          {!embedded && (
            <Box sx={{ ml: 'auto', mb: 0.5, display: 'flex', alignItems: 'center' }}>
              <HeaderActionBtn
                variant="contained"
                icon={<AccessTime sx={{ fontSize: 15 }} />}
                label="Go to DTR Overall"
                onClick={handleGoToOverallDTR}
                disabled={!personID || !startDate || !endDate}
              />
            </Box>
          )}
        </Box>

        {/* ── Records-only tab ── */}
        {activeTab === 'records' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
            {recordsCount > 0 && (
              <Box sx={{ px: 2.5, py: 0.75, bgcolor: '#fafafa', borderBottom: `1px solid ${T.divider}`, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                {[{ color: '#e65100', label: 'Unsaved' }, { color: '#2e7d32', label: 'Saved mod' }, { color: '#7b1fa2', label: 'Admin added' }, { color: T.accent, label: 'Auto-filled' }].map(({ color, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.65rem', color: T.faint, fontFamily: T.font }}>{label}</Typography>
                  </Box>
                ))}
                <Typography sx={{ fontSize: '0.64rem', color: T.faint, fontStyle: 'italic', ml: 'auto', fontFamily: T.font }}>
                 Type digits · Click AM/PM to toggle · Fill = auto-fill · Fill Break = quick 12PM–1PM break · "was:" = original DB value · Click remarks to expand
                </Typography>
              </Box>
            )}
            <Box ref={resultsRef} sx={{ flexGrow: 1, flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'auto', ...scrollbarSx }}>
              {recordsCount > 0 && (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: RECORDS_ROW_GRID,
                  px: 2,
                  py: 1.1,
                  bgcolor: T.accent,
                  gap: 1.25,
                  minWidth: MOD_TABLE_MIN_WIDTH,
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                }}>
                  {recordsColumns.map((col, i) => (
                    <Typography key={col} sx={{ color: i >= 7 ? (i === 7 ? '#ffd080' : '#a0e8b0') : '#FEF9E1', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.07em', fontFamily: T.font }}>{col}</Typography>
                  ))}
                </Box>
              )}
              {recordsCount === 0 && !loading ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <EventNote sx={{ fontSize: 36, color: T.accentBorder, mb: 1 }} />
                  <Typography sx={{ fontSize: '0.84rem', color: T.muted, fontFamily: T.font }}>No records found for this employee and date range.</Typography>
                </Box>
              ) : (
                visibleRecords.map((record, index) => (
                  <RecordsRow
                    key={`${record.personID}-${record.date}-${index}`}
                    record={record}
                    savedRecord={savedRecords[index]}
                    baselineRecord={baselineRecordsMap.get(`${record.personID}-${record.date}`)}
                    index={index}
                    everModifiedFields={everModifiedFields}
                    onFieldChange={handleInputChange}
                    autoFilledRows={autoFilledRecordsRows}
                    onAutoFill={handleAutoFillClickRecords}
                    onFillBreak={handleFillBreakRecords}
                  />
                ))
              )}
              {records.length > recordsVisibleCount && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'center', borderTop: `1px solid ${T.divider}` }}>
                  <button type="button" onClick={() => setRecordsVisibleCount((p) => Math.min(records.length, p + VISIBLE_ROWS_STEP))}
                    style={{ background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', color: T.accent, fontSize: '0.74rem', fontWeight: 700, fontFamily: T.font }}>
                    Load more ({records.length - recordsVisibleCount} remaining)
                  </button>
                </Box>
              )}
            </Box>
            {recordsCount > 0 && (
              <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setAuthDialogOpen(true)} disabled={loading}
                  style={{ background: loading ? T.accentFaint : T.accent, border: `1px solid ${loading ? T.accentBorder : T.accent}`, borderRadius: '6px', padding: '5px 12px', cursor: loading ? 'not-allowed' : 'pointer', color: loading ? T.accentMid : '#fff', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, fontFamily: T.font, transition: 'all 0.15s', opacity: loading ? 0.65 : 1 }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accentDark; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accent; }}
                >
                  <SaveAs sx={{ fontSize: 13 }} />
                  Save Changes
                </button>
              </Box>
            )}
          </Box>
        )}

        {/* ── Full Month tab ── */}
        {activeTab === 'fullMonth' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <EventNote sx={{ fontSize: 14, color: T.accent }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, fontFamily: T.font }}>Full Month</Typography>
                {fullDaysCount > 0 && (
                  <Box sx={{ px: 1.25, py: 0.25, borderRadius: '5px', bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}` }}>
                    <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700, fontFamily: T.font }}>{fullDaysCount - missingCount} / {fullDaysCount} days</Typography>
                  </Box>
                )}
                {missingCount > 0 && (
                  <Box sx={{ px: 1.25, py: 0.25, borderRadius: '5px', bgcolor: alpha('#f59e0b', 0.12), border: `1px solid ${alpha('#f59e0b', 0.3)}` }}>
                    <Typography sx={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, fontFamily: T.font }}>{missingCount} no record</Typography>
                  </Box>
                )}
              </Box>
              {fullDaysCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.font }}>
                    {selectedFillableCount > 0
                      ? `${selectedFillableCount} selected`
                      : `${fillableFullMonthDates.length} fillable`}
                  </Typography>
                  {selectedFillableCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFullMonthDates(new Set())}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${T.accentBorder}`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        color: T.accent,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        fontFamily: T.font,
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBulkAutoFillClickFull}
                    disabled={selectedFillableCount === 0}
                    style={{
                      background: selectedFillableCount > 0 ? T.accent : T.accentFaint,
                      border: `1px solid ${selectedFillableCount > 0 ? T.accent : T.accentBorder}`,
                      borderRadius: '6px',
                      padding: '5px 12px',
                      cursor: selectedFillableCount > 0 ? 'pointer' : 'not-allowed',
                      color: selectedFillableCount > 0 ? '#FEF9E1' : T.accentMid,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      fontFamily: T.font,
                      opacity: selectedFillableCount > 0 ? 1 : 0.65,
                    }}
                  >
                    <EventAvailable sx={{ fontSize: 14 }} />
                    Fill Selected ({selectedFillableCount})
                  </button>
                </Box>
              )}
            </Box>

            {fullDaysCount > 0 && (
              <Box sx={{ px: 2.5, py: 0.75, bgcolor: '#fafafa', borderBottom: `1px solid ${T.divider}`, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                {[{ color: '#f59e0b', label: 'No record' }, { color: '#e65100', label: 'Unsaved' }, { color: '#2e7d32', label: 'Saved mod' }, { color: T.accentMid, label: 'Weekend' }, { color: T.accent, label: 'Auto-filled' }].map(({ color, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.65rem', color: T.faint, fontFamily: T.font }}>{label}</Typography>
                  </Box>
                ))}
                <Typography sx={{ fontSize: '0.64rem', color: T.faint, fontStyle: 'italic', ml: 'auto', fontFamily: T.font }}>
                  Select rows for bulk fill (PVP / leave with pay) · Fill = auto-fill · Fill Break = quick 12PM–1PM break
                </Typography>
              </Box>
            )}
            <Box ref={fullResultsRef} sx={{ flexGrow: 1, flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'auto', ...scrollbarSx }}>
              {fullDaysCount > 0 && (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: FULL_MONTH_ROW_GRID,
                  px: 2,
                  py: 1.1,
                  bgcolor: T.accent,
                  gap: 1.25,
                  minWidth: MOD_TABLE_MIN_WIDTH,
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                }}>
                  {fullColumns.map((col, i) => (
                    i === 0 ? (
                      <Box key="select-all" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tooltip title="Select all fillable days" placement="top">
                          <Checkbox
                            size="small"
                            checked={allFillableSelected}
                            indeterminate={someFillableSelected}
                            disabled={fillableFullMonthDates.length === 0}
                            onChange={handleSelectAllFillableFullMonth}
                            sx={{
                              p: 0,
                              color: 'rgba(254,249,225,0.55)',
                              '&.Mui-checked': { color: '#FEF9E1' },
                              '&.MuiCheckbox-indeterminate': { color: '#FEF9E1' },
                            }}
                          />
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography
                        key={col}
                        sx={{
                          color: i >= 8 ? (i === 8 ? '#ffd080' : '#a0e8b0') : '#FEF9E1',
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          fontFamily: T.font,
                        }}
                      >
                        {col}
                      </Typography>
                    )
                  ))}
                </Box>
              )}
              {fullDaysCount === 0 && !loading ? (
                <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <EventNote sx={{ fontSize: 36, color: T.accentBorder }} />
                  <Typography sx={{ fontSize: '0.84rem', color: T.muted, fontFamily: T.font }}>No calendar data loaded yet.</Typography>
                  <button onClick={() => fetchFullRecords(true, { force: true, auditView: true })} style={{ background: T.accent, border: 'none', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', color: '#FEF9E1', fontSize: '0.8rem', fontWeight: 700, fontFamily: T.font }}>Load Full Month</button>
                </Box>
              ) : (
                visibleFullRecords.map((record, index) => (
                  <FullMonthRow
                    key={`${record.date}-${index}`}
                    record={record}
                    savedRow={savedFullRecords[index]}
                    baselineRow={baselineFullMap.get(record.date)}
                    index={index}
                    fullEverModified={fullEverModified}
                    onFieldChange={handleFullInputChange}
                    autoFilledRows={autoFilledFullRows}
                    onAutoFill={handleAutoFillClickFull}
                    onFillBreak={handleFillBreakFull}
                    selected={selectedFullMonthDates.has(record.date)}
                    onToggleSelect={handleToggleFullMonthSelect}
                    canSelectForFill={canFullMonthAutoFill(record, autoFilledFullRows)}
                  />
                ))
              )}
              {fullRecords.length > fullVisibleCount && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'center', borderTop: `1px solid ${T.divider}` }}>
                  <button type="button" onClick={() => setFullVisibleCount((p) => Math.min(fullRecords.length, p + VISIBLE_ROWS_STEP))}
                    style={{ background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', color: T.accent, fontSize: '0.74rem', fontWeight: 700, fontFamily: T.font }}>
                    Load more ({fullRecords.length - fullVisibleCount} remaining)
                  </button>
                </Box>
              )}
            </Box>

            {fullDaysCount > 0 && (
              <Box sx={{ px: 2.5, py: 1, bgcolor: T.accentFaint, borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <AddCircleOutline sx={{ fontSize: 12, color: T.accentMid }} />
                <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontFamily: T.font }}>
                  Select multiple <strong style={{ color: '#92400e' }}>NO REC</strong> or existing rows, then use <strong style={{ color: T.accent }}>Fill Selected</strong> for PVP / leave-with-pay batches. Individual rows still have <strong style={{ color: '#1565c0' }}>Fill Schd.</strong>
                </Typography>
              </Box>
            )}

            {fullDaysCount > 0 && (
              <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setAuthDialogOpen(true)} disabled={loading}
                  style={{ background: loading ? T.accentFaint : T.accent, border: `1px solid ${loading ? T.accentBorder : T.accent}`, borderRadius: '6px', padding: '5px 12px', cursor: loading ? 'not-allowed' : 'pointer', color: loading ? T.accentMid : '#fff', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, fontFamily: T.font, transition: 'all 0.15s', opacity: loading ? 0.65 : 1 }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accentDark; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accent; }}
                >
                  <SaveAs sx={{ fontSize: 13 }} />
                  Save Changes
                </button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────
  const root = (
      <Box
        sx={{
          fontFamily: T.font,
          ...(embedded
            ? {
                height: '100%',
                width: '100%',
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#f7f8fa',
              }
            : {}),
        }}
      >
        <style>{shimmerKf}</style>

        <RemarksDialog
          open={remarksDialogOpen}
          onClose={() => {
            setRemarksDialogOpen(false);
            setPendingAutoFill(null);
            setPendingAutoFillBulkCount(0);
          }}
          onConfirm={handleAutoFillConfirm}
          date={pendingAutoFillDate}
          isNew={pendingIsNew}
          bulkCount={pendingAutoFillBulkCount}
        />

        <AuthorizationDialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          onConfirm={activeTab === 'records' ? saveAll : saveFullMonth}
          records={activeTab === 'records' ? records : fullRecords}
          savedRecords={activeTab === 'records' ? savedRecords : savedFullRecords}
          isFullMonth={activeTab === 'fullMonth'}
          autoFilledRowKeys={activeTab === 'records' ? autoFilledRecordsRows : autoFilledFullRows}
          isFullMonthTab={activeTab === 'fullMonth'}
        />

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled"
            sx={{ width: '100%', fontWeight: 600, fontFamily: T.font, backgroundColor: snackbar.severity === 'success' ? '#4caf50' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, '& .MuiAlert-icon': { color: snackbar.severity === 'success' ? '#ffffff' : undefined } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small" sx={{ backgroundColor: snackbar.severity === 'success' ? 'rgba(255,255,255,0.3)' : undefined, color: snackbar.severity === 'success' ? '#ffffff' : undefined, fontWeight: 700, fontFamily: T.font }} />
              )}
            </Box>
          </Alert>
        </Snackbar>

        <LoadingOverlay open={loading} message={activeTab === 'fullMonth' ? 'Loading full month attendance…' : 'Loading attendance records…'} />

        <Box
          sx={
            embedded
              ? {
                  height: '100%',
                  width: '100%',
                  maxWidth: '100%',
                  p: 1.75,
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: 0,
                }
              : ATTENDANCE_COMPACT_PAGE_SX
          }
        >
          {/* Page Header */}
          {embedded ? (
            <Box
              sx={{
                flexShrink: 0,
                mb: 1.25,
                px: 1.75,
                py: 1.1,
                borderRadius: '10px',
                border: `1px solid ${T.accentBorder}`,
                background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                minWidth: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Edit sx={{ fontSize: 20, color: T.accent, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: T.accent, lineHeight: 1.15, fontFamily: T.font }}>
                    Attendance Modification
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '0.68rem', color: T.accentMid, fontWeight: 600, fontFamily: T.font }}>
                    Edit records without leaving DTR
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                <HeaderActionBtn
                  variant="outlined"
                  icon={<Refresh sx={{ fontSize: 15 }} />}
                  label="Refresh"
                  onClick={handleRefresh}
                  disabled={!personID || !startDate || !endDate}
                />
                {typeof onClose === 'function' && (
                  <Tooltip title="Close panel">
                    <IconButton
                      onClick={onClose}
                      aria-label="Close modification panel"
                      sx={{
                        color: '#fff',
                        bgcolor: T.accent,
                        width: 34,
                        height: 34,
                        border: `1px solid ${T.accentDark}`,
                        boxShadow: `0 2px 6px ${alpha(T.accent, 0.35)}`,
                        '&:hover': {
                          bgcolor: T.accentDark,
                          boxShadow: `0 3px 10px ${alpha(T.accent, 0.45)}`,
                        },
                      }}
                    >
                      <Close sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ) : (
          <SectionCard sx={{ mb: 2, flexShrink: 0 }}>
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
                gap: 1.5,
              }}
            >
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1, minWidth: 0 }}>
                <Edit sx={{ fontSize: 30, color: T.accent, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25, fontFamily: T.font }}>
                    Attendance Management
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600, fontFamily: T.font }}>
                    Admin Portal · Review and manage attendance records
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative', zIndex: 1, flexShrink: 0 }}>
                <AttendanceWorkflowNav
                  inline
                  prevStep={prevStep}
                  nextStep={nextStep}
                  onPrevious={goPrevious}
                  onNext={goNext}
                />
                <HeaderActionBtn
                  variant="outlined"
                  icon={<EditCalendarIcon sx={{ fontSize: 15 }} />}
                  label="Adjustment Report"
                  onClick={() => navigate('/attendance-adjustment-reports')}
                />
                <HeaderActionBtn
                  variant="outlined"
                  icon={<Refresh sx={{ fontSize: 15 }} />}
                  label="Refresh"
                  onClick={handleRefresh}
                  disabled={!personID || !startDate || !endDate}
                />
              </Box>
            </Box>
          </SectionCard>
          )}

          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem', fontFamily: T.font, flexShrink: 0 }}>{error}</Alert>
          </Collapse>
          <Collapse in={!!success}>
            <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem', fontFamily: T.font, flexShrink: 0 }}>{success}</Alert>
          </Collapse>

          {embedded ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 1.5,
                overflow: 'hidden',
              }}
            >
              <SectionCard
                sx={{
                  width: { xs: '100%', md: 300 },
                  flex: { xs: '0 0 auto', md: '0 0 300px' },
                  flexShrink: 0,
                  maxHeight: { xs: 240, md: '100%' },
                  height: { xs: 'auto', md: '100%' },
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <AttendanceFilterHeader />
                {renderLeftPanel()}
              </SectionCard>
              <SectionCard
                sx={{
                  flex: '1 1 0%',
                  minWidth: 0,
                  minHeight: 0,
                  height: { xs: 'auto', md: '100%' },
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {renderRightPanel()}
              </SectionCard>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} lg={3}>
                <SectionCard sx={filterSidebarCardSx}>
                  <AttendanceFilterHeader />
                  {renderLeftPanel()}
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={9}>
                <SectionCard sx={{ ...attendanceMainPanelHeightSx, display: 'flex', flexDirection: 'column' }}>
                  {renderRightPanel()}
                </SectionCard>
              </Grid>
            </Grid>
          )}
        </Box>

        {!embedded && (
          <Zoom in={showScrollTop}>
            <Fab size="small" sx={{ position: 'fixed', bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <KeyboardArrowUp />
            </Fab>
          </Zoom>
        )}
      </Box>
  );

  if (embedded) return root;

  return (
    <Fade in timeout={400}>
      {root}
    </Fade>
  );
};

export default AttendanceSearch;