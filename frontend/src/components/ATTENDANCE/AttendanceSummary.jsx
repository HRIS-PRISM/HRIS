import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
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
  TableContainer,
  styled,
  Backdrop,
  CircularProgress,
  CardHeader,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Info,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Summarize,
  SummarizeOutlined,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import {
  useCRUDButtonStyles,
  useCRUDButtonStylesOutlined,
} from '../../hooks/useCRUDButtonStyles';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

// ─────────────────────────────────────────────
// WIREFRAME
// ─────────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes oaShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes oaPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Sk = ({ w = '100%', h = 14, r = 6, sx = {}, accent = '#6d2323' }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      flexShrink: 0,
      background: `linear-gradient(90deg,
        ${alpha(accent, 0.07)} 25%,
        ${alpha(accent, 0.18)} 50%,
        ${alpha(accent, 0.07)} 75%)`,
      backgroundSize: '900px 100%',
      animation: 'oaShimmer 1.6s infinite linear',
      ...sx,
    }}
  />
);

const Pl = ({ w, h, r = 4, color = 'rgba(109,35,35,0.08)', sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      bgcolor: color,
      flexShrink: 0,
      ...sx,
    }}
  />
);

const OverallAttendanceWireframe = ({
  accentColor = '#6d2323',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => {
  const ac = accentColor;
  const grad = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <Box
        sx={{
          py: { xs: 2, md: 4 },
          width: '100vw',
          mx: 'auto',
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          left: '53%',
          transform: 'translateX(-51%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        <Box
          sx={{
            mb: 4,
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${alpha(ac, 0.1)}`,
            boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
            animation: 'oaPulse 2.2s ease-in-out infinite',
          }}
        >
          <Box
            sx={{
              p: 5,
              background: grad,
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
                background: `radial-gradient(circle,${alpha(ac, 0.1)} 0%,${alpha(ac, 0)} 70%)`,
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Pl w={64} h={64} r="50%" color={alpha(ac, 0.13)} />
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <Sk w={260} h={26} r={6} accent={ac} />
                  <Sk w={360} h={13} r={4} accent={ac} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Sk w={130} h={26} r={13} accent={ac} />
                <Pl w={48} h={48} r="50%" color={alpha(ac, 0.12)} />
              </Box>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            mb: 4,
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${alpha(ac, 0.1)}`,
            boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
            animation: 'oaPulse 2.2s ease-in-out 0.08s infinite',
            bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
          }}
        >
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              {[0, 1, 2].map((fi) => (
                <Box key={fi} sx={{ flex: 1 }}>
                  <Sk w={100} h={12} r={3} accent={ac} sx={{ mb: '6px' }} />
                  <Box
                    sx={{
                      height: 56,
                      borderRadius: '12px',
                      border: `1px solid ${alpha(ac, 0.18)}`,
                      bgcolor: 'rgba(255,255,255,0.85)',
                    }}
                  />
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: `2px dashed ${alpha(ac, 0.2)}`,
                bgcolor: alpha(primaryColor, 0.3),
                mb: 4,
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
                {Array.from({ length: 12 }, (_, i) => (
                  <Sk key={i} w={64} h={44} r={10} accent={ac} />
                ))}
              </Box>
            </Box>
            <Box
              sx={{
                height: 48,
                borderRadius: '12px',
                bgcolor: alpha(ac, 0.85),
              }}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
};

// ─────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────
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
    variant === 'contained' ? '0 4px 14px rgba(254,249,225,0.25)' : 'none',
  '&:hover': { transform: 'translateY(-2px)' },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255,255,255,0.95)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255,255,255,1)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const PremiumTableCell = styled(TableCell)(
  ({ isHeader = false, bgColor = null }) => ({
    fontWeight: isHeader ? 600 : 500,
    padding: '12px 14px',
    borderBottom: isHeader
      ? '2px solid rgba(254,249,225,0.5)'
      : '1px solid rgba(109,35,35,0.06)',
    fontSize: '0.83rem',
    letterSpacing: '0.025em',
    backgroundColor: bgColor ? bgColor : 'transparent',
    whiteSpace: 'nowrap',
  }),
);

// ─────────────────────────────────────────────
// STYLED MODAL
// ─────────────────────────────────────────────
const StyledModal = ({
  open,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  showCancel = false,
  accentColor = '#6D2323',
  accentDark = '#8B3333',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
  textPrimaryColor = '#6D2323',
}) => {
  const typeConfig = {
    success: {
      icon: <CheckCircleIcon sx={{ fontSize: 30, color: '#2e7d32' }} />,
      avatarBg: 'rgba(46,125,50,0.15)',
      chipColor: '#2e7d32',
      chipBg: 'rgba(46,125,50,0.1)',
      label: 'Success',
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 30, color: '#92400e' }} />,
      avatarBg: 'rgba(146,64,14,0.15)',
      chipColor: '#92400e',
      chipBg: 'rgba(146,64,14,0.1)',
      label: 'Warning',
    },
    error: {
      icon: <ErrorIcon sx={{ fontSize: 30, color: '#991b1b' }} />,
      avatarBg: 'rgba(153,27,27,0.15)',
      chipColor: '#991b1b',
      chipBg: 'rgba(153,27,27,0.1)',
      label: 'Error',
    },
    info: {
      icon: <InfoIcon sx={{ fontSize: 30, color: textPrimaryColor }} />,
      avatarBg: alpha(accentColor, 0.14),
      chipColor: accentColor,
      chipBg: alpha(accentColor, 0.1),
      label: 'Notice',
    },
  };
  const cfg = typeConfig[type] || typeConfig.info;

  // Smart message parser
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
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: `0 32px 80px ${alpha(accentColor, 0.25)}, 0 8px 24px ${alpha(accentColor, 0.12)}`,
          border: `1px solid ${alpha(accentColor, 0.14)}`,
          bgcolor: primaryColor,
        },
      }}
    >
      {/* ── Full gradient header ── */}
      <Box
        sx={{
          px: 4,
          pt: 4,
          pb: 3.5,
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: '25%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(accentColor, 0.07)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Close button top-right */}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 2,
            color: textPrimaryColor,
            opacity: 0.45,
            '&:hover': { opacity: 1, bgcolor: alpha(accentColor, 0.1) },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Avatar + title */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Avatar
            sx={{
              bgcolor: cfg.avatarBg,
              width: 60,
              height: 60,
              boxShadow: `0 8px 24px ${alpha(accentColor, 0.18)}`,
              border: `2px solid ${alpha(accentColor, 0.1)}`,
            }}
          >
            {cfg.icon}
          </Avatar>
          <Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: textPrimaryColor,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </Typography>
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  bgcolor: cfg.chipBg,
                  color: cfg.chipColor,
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  height: 20,
                  borderRadius: '6px',
                  border: `1px solid ${alpha(cfg.chipColor, 0.2)}`,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: '0.78rem',
                color: alpha(textPrimaryColor, 0.5),
                fontWeight: 500,
              }}
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

      {/* ── Body — same primaryColor background, not white ── */}
      <Box
        sx={{
          px: 4,
          py: 3,
          bgcolor: alpha(primaryColor, 0.6),
          borderTop: `1px solid ${alpha(accentColor, 0.08)}`,
          borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
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
                  gap: 2,
                  mb: 1,
                  px: 2,
                  py: 1.25,
                  borderRadius: '12px',
                  bgcolor: 'rgba(255,255,255,0.75)',
                  border: `1px solid ${alpha(accentColor, 0.1)}`,
                  backdropFilter: 'blur(4px)',
                  boxShadow: `0 2px 8px ${alpha(accentColor, 0.06)}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    flexShrink: 0,
                    bgcolor: alpha(accentColor, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Person
                    sx={{ fontSize: 16, color: accentColor, opacity: 0.7 }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: textPrimaryColor,
                      lineHeight: 1.2,
                    }}
                  >
                    {empPart?.trim()}
                  </Typography>
                  {rest.length > 0 && (
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: alpha(textPrimaryColor, 0.55),
                        fontWeight: 500,
                        mt: 0.15,
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
                  px: 2,
                  py: 1.5,
                  borderRadius: '12px',
                  bgcolor: alpha(accentColor, 0.06),
                  border: `1px solid ${alpha(accentColor, 0.14)}`,
                  borderLeft: `4px solid ${alpha(accentColor, 0.5)}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.25,
                }}
              >
                <InfoIcon
                  sx={{
                    fontSize: 15,
                    color: accentColor,
                    opacity: 0.6,
                    mt: 0.2,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: alpha(textPrimaryColor, 0.75),
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
                fontSize: '0.9rem',
                color: alpha(textPrimaryColor, 0.8),
                lineHeight: 1.8,
                fontWeight: 500,
                mb: i < lines.length - 1 ? 1.25 : 0,
              }}
            >
              {line}
            </Typography>
          );
        })}
      </Box>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: 4,
          py: 2.5,
          bgcolor: alpha(primaryColor, 0.8),
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {showCancel && (
          <ProfessionalButton
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: alpha(accentColor, 0.3),
              color: textPrimaryColor,
              bgcolor: 'rgba(255,255,255,0.6)',
              '&:hover': {
                borderColor: accentColor,
                bgcolor: 'rgba(255,255,255,0.9)',
              },
            }}
          >
            Cancel
          </ProfessionalButton>
        )}
        <ProfessionalButton
          onClick={onConfirm || onClose}
          variant="contained"
          sx={{
            bgcolor: accentColor,
            color: primaryColor,
            boxShadow: `0 4px 16px ${alpha(accentColor, 0.4)}`,
            '&:hover': {
              bgcolor: accentDark,
              boxShadow: `0 6px 20px ${alpha(accentColor, 0.5)}`,
            },
          }}
        >
          {showCancel ? 'Confirm' : 'OK'}
        </ProfessionalButton>
      </Box>
    </Dialog>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const OverallAttendance = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const saveButtonStyles = useCRUDButtonStyles('save');
  const editButtonStyles = useCRUDButtonStyles('edit');
  const deleteButtonStyles = useCRUDButtonStylesOutlined('delete');
  const fetchAttendanceDataRef = useRef(null);
  const navigate = useNavigate();

  // Colors
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6D2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6D2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';

  // Access control
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('attendance-summary');

  useEffect(() => {
    if (!accessLoading) {
      console.log('AttendanceSummary Access Check:', {
        hasAccess,
        accessLoading,
        accessError,
        identifier: 'attendance-summary',
      });
    }
  }, [hasAccess, accessLoading, accessError]);

  // State
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingJO, setIsSubmittingJO] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showRegularConfirm, setShowRegularConfirm] = useState(false);
  const [confirmRegularChecked, setConfirmRegularChecked] = useState(false);
  const [processingOverlay, setProcessingOverlay] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [successOverlay, setSuccessOverlay] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState('');
  const [successAction, setSuccessAction] = useState('send');

  // Month picker state
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
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

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

  useEffect(() => {
    if (!accessLoading) setPageLoading(false);
  }, [accessLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log(
      'Token from localStorage:',
      token ? 'Token exists' : 'No token found',
    );
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  // Restore persisted inputs
  useEffect(() => {
    const storedEmployeeNumber = localStorage.getItem('employeeNumber');
    const storedStartDate = localStorage.getItem('startDate');
    const storedEndDate = localStorage.getItem('endDate');
    if (storedEmployeeNumber) setEmployeeNumber(storedEmployeeNumber);
    if (storedStartDate) setStartDate(storedStartDate);
    if (storedEndDate) setEndDate(storedEndDate);
  }, []);

  // ── Month picker handler ──────────────────────────────────────────────────
  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAttendanceData = async () => {
    console.log('Sending request with params: ', {
      personID: employeeNumber,
      startDate,
      endDate,
    });
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: { personID: employeeNumber, startDate, endDate },
          ...getAuthHeaders(),
        },
      );
      if (response.status === 200) {
        setAttendanceData(response.data.data);
      } else {
        console.error('Error: ', response.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showModal(
        'Data Retrieval Error',
        'Unable to retrieve attendance records. Please try again.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceDataRef.current = fetchAttendanceData;
  });

  // Realtime refresh
  useEffect(() => {
    if (!socket || !connected) return;
    const handleAttendanceChanged = (payload) => {
      const changedPersonIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID
          ? [payload.personID]
          : [];
      if (
        employeeNumber &&
        changedPersonIDs.length > 0 &&
        !changedPersonIDs.includes(employeeNumber)
      )
        return;
      if (employeeNumber && startDate && endDate)
        fetchAttendanceDataRef.current?.();
    };
    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [socket, connected, employeeNumber, startDate, endDate]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const updateRecord = async () => {
    if (!editRecord || !editRecord.totalRenderedTimeMorning) return;
    try {
      await axios.put(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/${editRecord.id}`,
        editRecord,
        getAuthHeaders(),
      );
      showModal(
        'Update Successful',
        'Record updated successfully.',
        'success',
        () => {
          fetchAttendanceData();
          window.location.reload();
          closeModal();
        },
      );
    } catch (error) {
      console.error('Error updating record:', error);
      showModal('Update Failed', 'Unable to update record.', 'error');
    }
    setEditRecord(null);
  };

  const deleteRecord = async (id, personID) => {
    showModal(
      'Confirm Deletion',
      `Delete attendance record for Employee ${personID}?`,
      'warning',
      async () => {
        try {
          await axios.delete(
            `${API_BASE_URL}/attendance/api/overall_attendance_record/${id}/${personID}`,
            getAuthHeaders(),
          );
          fetchAttendanceData();
          showModal(
            'Deleted Successfully',
            'Record removed from system.',
            'success',
          );
        } catch (error) {
          console.error('Delete failed:', error);
          const status = error.response?.status;
          const message =
            error.response?.data?.message ||
            error.response?.data?.error ||
            'Error';
          if (status === 404)
            showModal(
              'Not Found',
              'Record not found or already deleted.',
              'error',
            );
          else if (status === 401 || status === 403)
            showModal('Session Expired', 'Please log in again.', 'error');
          else showModal('Deletion Failed', `${message}`, 'error');
        }
      },
      true,
    );
  };

  // ── Payroll Regular ───────────────────────────────────────────────────────
  const submitToPayroll = async () => {
    if (isSubmitting) return;
    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setProcessingOverlay(true);
    setProcessingMessage('Submitting Regular payroll...');

    try {
      const filteredRecords = [],
        invalidRecords = [];
      for (const record of attendanceData) {
        const empNum = record.personID || record.employeeNumber;
        const employmentCategory = await fetchEmploymentCategory(empNum);
        if (employmentCategory === null) {
          invalidRecords.push({
            employeeNumber: empNum,
            reason: 'Employment category not found in system',
          });
          continue;
        }
        if (
          employmentCategory === 2 ||
          employmentCategory === 3 ||
          employmentCategory === 4
        )
          filteredRecords.push(record);
        else if (employmentCategory === 0 || employmentCategory === 1)
          invalidRecords.push({
            employeeNumber: empNum,
            reason: 'Job Order (JO)',
          });
        else
          invalidRecords.push({
            employeeNumber: empNum,
            reason: `Unknown employment category (${employmentCategory})`,
          });
      }

      if (invalidRecords.length > 0) {
        const invalidList = invalidRecords
          .map((r) => `${r.employeeNumber}: ${r.reason}`)
          .join('\n');
        if (filteredRecords.length === 0) {
          showModal(
            'Submission Blocked',
            `Employee(s) not eligible for Regular payroll:\n\n${invalidList}\n\nContact HR Department to update employment category.`,
            'warning',
          );
          setProcessingOverlay(false);
          setIsSubmitting(false);
          return;
        }
        showModal(
          'Confirm Submission',
          `${filteredRecords.length} eligible record(s)\n${invalidRecords.length} excluded\n\nProceed with submission?`,
          'warning',
          async () => {
            closeModal();
            await continuePayrollSubmission(filteredRecords);
          },
          true,
        );
        setProcessingOverlay(false);
        return;
      }

      await continuePayrollSubmission(filteredRecords);
    } catch (error) {
      console.error('Error submitting to payroll:', error);
      handleSubmissionError(error);
    } finally {
      setProcessingOverlay(false);
      setIsSubmitting(false);
    }
  };

  const continuePayrollSubmission = async (filteredRecords) => {
    try {
      const payload = filteredRecords.map((record) => ({
        employeeNumber: record.personID,
        startDate: record.startDate,
        endDate: record.endDate,
        overallRenderedOfficialTimeTardiness:
          record.overallRenderedOfficialTimeTardiness,
        department: record.code,
      }));

      const missingFields = payload.filter(
        (r) => !r.employeeNumber || !r.startDate || !r.endDate,
      );
      if (missingFields.length > 0) {
        showModal(
          'Validation Error',
          'Required fields missing. Check Employee Number, Start Date, and End Date.',
          'error',
        );
        setProcessingOverlay(false);
        return;
      }

      for (const payloadRecord of payload) {
        const { employeeNumber, startDate, endDate } = payloadRecord;
        try {
          const response = await axios.get(
            `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`,
            {
              ...getAuthHeaders(),
              params: { employeeNumber, startDate, endDate },
            },
          );
          if (response.data.exists) {
            showModal(
              'Duplicate Entry',
              `Payroll entry exists for Employee ${employeeNumber} (${startDate} to ${endDate}).`,
              'warning',
            );
            return;
          }
        } catch (duplicateCheckError) {
          console.error('Error checking for duplicates:', duplicateCheckError);
          showModal(
            'Validation Error',
            'Unable to verify existing records.',
            'error',
          );
          return;
        }
      }

      const submitResponse = await axios.post(
        `${API_BASE_URL}/PayrollRoute/add-rendered-time`,
        payload,
        getAuthHeaders(),
      );
      if (submitResponse.status === 200 || submitResponse.status === 201) {
        if (submitResponse.data.newCount === 0) {
          setProcessingOverlay(false);
          showModal(
            'Already Exists',
            'All records already exist in payroll processing. No new entries were added.',
            'warning',
          );
        } else {
          setProcessingOverlay(false);
          setSuccessAction('send');
          setSuccessRedirect('/payroll-table');
          setSuccessOverlay(true);
        }
      } else {
        throw new Error(`Unexpected response status: ${submitResponse.status}`);
      }
    } catch (error) {
      handleSubmissionError(error);
    }
  };

  const handleSubmissionError = (error) => {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        'Server error occurred';
      if (status === 409)
        showModal(
          'Duplicate Entry',
          'Record already exists in payroll.',
          'warning',
        );
      else if (status === 400) showModal('Invalid Data', message, 'error');
      else showModal('Server Error', `Error ${status}: ${message}`, 'error');
    } else if (error.request) {
      showModal(
        'Network Error',
        'Connection failed. Check internet connection.',
        'error',
      );
    } else {
      showModal('Submission Error', 'An unexpected error occurred.', 'error');
    }
  };

  // ── Payroll JO ────────────────────────────────────────────────────────────
  const submitPayrollJO = async () => {
    if (isSubmittingJO) return;
    if (!attendanceData || attendanceData.length === 0) {
      showModal('No Data', 'No attendance records available.', 'warning');
      return;
    }

    setIsSubmittingJO(true);
    setProcessingOverlay(true);
    setProcessingMessage('Submitting JO payroll...');

    try {
      const filteredRecords = [],
        invalidRecords = [];
      for (const record of attendanceData) {
        const empNum = record.personID || record.employeeNumber;
        const employmentCategory = await fetchEmploymentCategory(empNum);
        if (employmentCategory === null) {
          invalidRecords.push({
            employeeNumber: empNum,
            reason: 'Employment category not found in system',
          });
          continue;
        }
        if (employmentCategory === 0 || employmentCategory === 1)
          filteredRecords.push(record);
        else if (
          employmentCategory === 2 ||
          employmentCategory === 3 ||
          employmentCategory === 4
        )
          invalidRecords.push({
            employeeNumber: empNum,
            reason: 'Employment category is Regular',
          });
        else
          invalidRecords.push({
            employeeNumber: empNum,
            reason: `Unknown employment category (${employmentCategory})`,
          });
      }

      if (invalidRecords.length > 0) {
        const invalidList = invalidRecords
          .map((r) => `• Employee ${r.employeeNumber}: ${r.reason}`)
          .join('\n');
        if (filteredRecords.length === 0) {
          showModal(
            'Submission Blocked',
            `Employees not eligible for JO payroll:\n\n${invalidList}\n\nContact HR to update employment status.`,
            'warning',
          );
          setProcessingOverlay(false);
          setIsSubmittingJO(false);
          return;
        }
        showModal(
          'Confirm Submission',
          `${filteredRecords.length} eligible record(s)\n${invalidRecords.length} excluded\n\nProceed with submission?`,
          'warning',
          async () => {
            closeModal();
            await continuePayrollJOSubmission(filteredRecords);
          },
          true,
        );
        setProcessingOverlay(false);
        return;
      }

      await continuePayrollJOSubmission(filteredRecords);
    } catch (error) {
      console.error('Error submitting Payroll JO:', error);
      handlePayrollJOError(error);
    } finally {
      setProcessingOverlay(false);
      setIsSubmittingJO(false);
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
            {
              ...getAuthHeaders(),
              params: { employeeNumber: empNum, startDate, endDate },
            },
          );
          if (checkResponse.data && checkResponse.data.length > 0)
            duplicateRecords.push({
              employeeNumber: empNum,
              startDate,
              endDate,
            });
        } catch (checkError) {
          if (checkError.response?.status === 404) continue;
          console.warn(`Could not check duplicate for ${empNum}:`, checkError);
        }
      }

      if (duplicateRecords.length > 0) {
        const duplicateList = duplicateRecords
          .map(
            (r) =>
              `• Employee ${r.employeeNumber} (${r.startDate} to ${r.endDate})`,
          )
          .join('\n');
        showModal(
          'Duplicate Entries',
          `Records already exist:\n\n${duplicateList}`,
          'warning',
        );
        setProcessingOverlay(false);
        return;
      }

      let successCount = 0,
        failedRecords = [];
      for (const record of filteredRecords) {
        try {
          let rhHours = 0;
          if (record.overallRenderedOfficialTime) {
            const parts = record.overallRenderedOfficialTime.split(':');
            rhHours = parseInt(parts[0], 10) || 0;
          }
          let h = 0,
            m = 0,
            s = 0;
          if (record.overallRenderedOfficialTimeTardiness) {
            const tParts =
              record.overallRenderedOfficialTimeTardiness.split(':');
            h = parseInt(tParts[0], 10) || 0;
            m = parseInt(tParts[1], 10) || 0;
            s = parseInt(tParts[2], 10) || 0;
          }

          const payload = {
            employeeNumber: record.employeeNumber || record.personID,
            startDate: record.startDate,
            endDate: record.endDate,
            h,
            m,
            s,
            rh: rhHours,
            department: record.code,
          };
          console.log('Submitting JO payload:', payload);
          await axios.post(
            `${API_BASE_URL}/PayrollJORoutes/payroll-jo`,
            payload,
            getAuthHeaders(),
          );
          successCount++;
        } catch (recordError) {
          console.error(
            `Failed to submit record for ${record.personID}:`,
            recordError,
          );
          const errorMsg =
            recordError.response?.data?.message ||
            recordError.response?.data?.error ||
            'Unknown error';
          failedRecords.push({
            employeeNumber: record.personID || record.employeeNumber,
            error: errorMsg,
          });
        }
      }

      if (failedRecords.length > 0) {
        const failedList = failedRecords
          .map((r) => `• Employee ${r.employeeNumber}: ${r.error}`)
          .join('\n');
        if (successCount > 0)
          showModal(
            'Partial Success',
            `Submitted: ${successCount}\nFailed: ${failedRecords.length}\n\n${failedList}`,
            'warning',
          );
        else
          showModal(
            'Submission Failed',
            `All submissions failed:\n\n${failedList}`,
            'error',
          );
        setProcessingOverlay(false);
      } else {
        setProcessingOverlay(false);
        setSuccessAction('send');
        setSuccessRedirect('/payroll-jo');
        setSuccessOverlay(true);
      }
    } catch (error) {
      handlePayrollJOError(error);
    }
  };

  const handlePayrollJOError = (error) => {
    let errorMessage = 'Payroll JO submission failed.';
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        'Server error occurred';
      if (status === 409) errorMessage = `Duplicate entry: ${message}`;
      else if (status === 400) errorMessage = `Invalid data: ${message}`;
      else errorMessage = `Error ${status}: ${message}`;
    } else if (error.request) {
      errorMessage = 'Connection failed. Check internet connection.';
    }
    showModal('Submission Error', errorMessage, 'error');
  };

  const fetchEmploymentCategory = async (empNumber) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${empNumber}`,
        getAuthHeaders(),
      );
      return response.data.employmentCategory;
    } catch (error) {
      console.error('Error fetching employment category:', error);
      return null;
    }
  };

  // ── Access guards / wireframe ─────────────────────────────────────────────
  if (pageLoading || accessLoading)
    return (
      <OverallAttendanceWireframe
        accentColor={accentColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    );

  if (!accessLoading && hasAccess !== true)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Summary. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // Table column definitions
  const TABLE_COLUMNS = [
    { label: 'Department', key: 'code' },
    { label: 'Employee No.', key: 'personID' },
    { label: 'Start Date', key: 'startDate' },
    { label: 'End Date', key: 'endDate' },
    { label: 'Morning Hours', key: 'totalRenderedTimeMorning', accent: true },
    {
      label: 'Morning Tardiness',
      key: 'totalRenderedTimeMorningTardiness',
      accentDark: true,
    },
    {
      label: 'Afternoon Hours',
      key: 'totalRenderedTimeAfternoon',
      accent: true,
    },
    {
      label: 'Afternoon Tardiness',
      key: 'totalRenderedTimeAfternoonTardiness',
      accentDark: true,
    },
    { label: 'Honorarium', key: 'totalRenderedHonorarium', accent: true },
    {
      label: 'HN Tardiness',
      key: 'totalRenderedHonorariumTardiness',
      accentDark: true,
    },
    {
      label: 'Service Credit',
      key: 'totalRenderedServiceCredit',
      accent: true,
    },
    {
      label: 'SC Tardiness',
      key: 'totalRenderedServiceCreditTardiness',
      accentDark: true,
    },
    { label: 'Overtime', key: 'totalRenderedOvertime', accent: true },
    {
      label: 'OT Tardiness',
      key: 'totalRenderedOvertimeTardiness',
      accentDark: true,
    },
    {
      label: 'Overall Rendered',
      key: 'overallRenderedOfficialTime',
      highlight: true,
    },
    {
      label: 'Overall Tardiness',
      key: 'overallRenderedOfficialTimeTardiness',
      highlightDark: true,
    },
  ];

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          py: { xs: 2, md: 4 },
          width: '100vw',
          mx: 'auto',
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          left: '53%',
          transform: 'translateX(-51%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        {/* ── Hero Header ── */}
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
                      <SummarizeOutlined
                        sx={{ fontSize: 32, color: textPrimaryColor }}
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
                        Overall Attendance Report
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ opacity: 0.8, color: textPrimaryColor }}
                      >
                        Generate and review summary of overall attendance
                        records
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="System Generated"
                      size="small"
                      sx={{
                        bgcolor: alpha(accentColor, 0.15),
                        color: textPrimaryColor,
                        fontWeight: 500,
                      }}
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={fetchAttendanceData}
                        disabled={!employeeNumber || !startDate || !endDate}
                        sx={{
                          bgcolor: alpha(accentColor, 0.1),
                          '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                          color: textPrimaryColor,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Controls Card ── */}
        <Fade in timeout={700}>
          <GlassCard
            sx={{
              mb: 4,
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
            }}
          >
            <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
              {/* ── Input Fields ── */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                  {
                    label: 'Employee Number',
                    value: employeeNumber,
                    onChange: (e) => setEmployeeNumber(e.target.value),
                    type: 'text',
                    icon: <Person sx={{ color: textPrimaryColor }} />,
                  },
                  {
                    label: 'Start Date',
                    value: startDate,
                    onChange: (e) => setStartDate(e.target.value),
                    type: 'date',
                    icon: <CalendarToday sx={{ color: textPrimaryColor }} />,
                  },
                  {
                    label: 'End Date',
                    value: endDate,
                    onChange: (e) => setEndDate(e.target.value),
                    type: 'date',
                    icon: <CalendarToday sx={{ color: textPrimaryColor }} />,
                  },
                ].map(({ label, value, onChange, type, icon }) => (
                  <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}
                    >
                      {label}
                    </Typography>
                    <ModernTextField
                      type={type}
                      value={value}
                      onChange={onChange}
                      required
                      InputLabelProps={type === 'date' ? { shrink: true } : {}}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {icon}
                          </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3, borderColor: alpha(accentColor, 0.1) }} />

              {/* ── Month Picker ── */}
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: `2px dashed ${alpha(accentColor, 0.2)}`,
                    backgroundColor: alpha(primaryColor, 0.3),
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
                        variant="subtitle1"
                        sx={{
                          color: textPrimaryColor,
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                      >
                        Select Entire Month
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: alpha(textPrimaryColor, 0.7) }}
                      >
                        Choose a year, then click any month to auto-fill the
                        date range
                      </Typography>
                    </Box>
                    <FormControl sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                      <Select
                        value={selectedYear}
                        label="Year"
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setSelectedMonth(null);
                        }}
                        sx={{
                          backgroundColor: 'white',
                          borderRadius: 2,
                          fontWeight: 600,
                        }}
                      >
                        {yearOptions.map((y) => (
                          <MenuItem key={y} value={y}>
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
                      gap: 1,
                      justifyContent: 'center',
                    }}
                  >
                    {months.map((month, index) => {
                      const sel = selectedMonth === index;
                      return (
                        <ProfessionalButton
                          key={month}
                          variant={sel ? 'contained' : 'outlined'}
                          size="medium"
                          onClick={() => handleMonthClick(index)}
                          sx={{
                            borderColor: accentColor,
                            backgroundColor: sel ? accentColor : 'transparent',
                            color: sel ? textSecondaryColor : textPrimaryColor,
                            py: 1.5,
                            px: 4.5,
                            fontWeight: 600,
                            boxShadow: sel
                              ? `0 4px 12px ${alpha(accentColor, 0.3)}`
                              : 'none',
                          }}
                        >
                          {month}
                        </ProfessionalButton>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* ── Fetch Button ── */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ProfessionalButton
                  variant="contained"
                  onClick={fetchAttendanceData}
                  disabled={!employeeNumber || !startDate || !endDate}
                  startIcon={<Refresh />}
                  sx={{
                    py: 1.5,
                    px: 6,
                    bgcolor: accentColor,
                    color: primaryColor,
                    fontSize: '1rem',
                    '&:hover': { bgcolor: accentDark },
                  }}
                >
                  Fetch Attendance Records
                </ProfessionalButton>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* ── Loading Backdrop ── */}
        <Backdrop
          sx={{
            color: accentColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: accentColor }}>
              Fetching attendance records...
            </Typography>
          </Box>
        </Backdrop>

        {/* ── Results Table ── */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={500}>
            <GlassCard
              sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}
            >
              {/* Banner */}
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.8,
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: accentDark,
                    }}
                  >
                    Attendance Record Summary
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                  >
                    <b>{attendanceData.length}</b> Records Found
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    <Chip
                      icon={<CalendarToday />}
                      label={`${startDate} to ${endDate}`}
                      size="small"
                      sx={{
                        bgcolor: alpha(accentColor, 0.15),
                        color: accentColor,
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: alpha(accentColor, 0.15),
                    width: 80,
                    height: 80,
                    color: accentColor,
                  }}
                >
                  <Summarize sx={{ fontSize: 36 }} />
                </Avatar>
              </Box>

              {/* Table */}
              <Box sx={{ px: 2, pb: 1.5, pt: 1.5 }}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    border: `1px solid ${alpha(accentColor, 0.1)}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      overflowX: 'auto',
                      overflowY: 'auto',
                      maxHeight: 420,
                      scrollbarWidth: 'thin',
                      '&::-webkit-scrollbar': { height: 6, width: 6 },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(254,249,225,0.3)',
                        borderRadius: 4,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(109,35,35,0.4)',
                        borderRadius: 4,
                      },
                    }}
                  >
                    <Table
                      size="small"
                      sx={{
                        minWidth: TABLE_COLUMNS.reduce((s) => s + 140, 0) + 160,
                      }}
                    >
                      <TableHead>
                        <TableRow sx={{ height: 38 }}>
                          {TABLE_COLUMNS.map(
                            ({
                              label,
                              accent,
                              accentDark: adk,
                              highlight,
                              highlightDark,
                            }) => {
                              const bg = highlight
                                ? alpha(accentColor, 0.3)
                                : highlightDark
                                  ? alpha(accentColor, 0.4)
                                  : accent
                                    ? alpha(accentColor, 0.22)
                                    : adk
                                      ? alpha(accentColor, 0.32)
                                      : alpha(primaryColor, 0.92);
                              return (
                                <PremiumTableCell
                                  key={label}
                                  isHeader
                                  bgColor={bg}
                                  sx={{
                                    color: accentColor,
                                    minWidth: 140,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 2,
                                    py: 0.6,
                                    px: 1,
                                    fontSize: 14,
                                    fontWeight: 700,
                                  }}
                                >
                                  {label}
                                </PremiumTableCell>
                              );
                            },
                          )}
                          <PremiumTableCell
                            isHeader
                            bgColor={alpha(primaryColor, 0.92)}
                            sx={{
                              color: accentColor,
                              position: 'sticky',
                              top: 0,
                              zIndex: 2,
                              minWidth: 140,
                              py: 0.6,
                              px: 1,
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            Action
                          </PremiumTableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {attendanceData.map((record, index) => (
                          <TableRow
                            key={index}
                            sx={{
                              height: 36,
                              '&:nth-of-type(even)': {
                                bgcolor: alpha(primaryColor, 0.3),
                              },
                              '&:hover': { bgcolor: alpha(accentColor, 0.05) },
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {TABLE_COLUMNS.map(
                              ({
                                key,
                                accent,
                                accentDark: adk,
                                highlight,
                                highlightDark,
                              }) => {
                                const cellBg = highlight
                                  ? alpha(accentColor, 0.12)
                                  : highlightDark
                                    ? alpha(accentColor, 0.2)
                                    : accent
                                      ? alpha(accentColor, 0.07)
                                      : adk
                                        ? alpha(accentColor, 0.13)
                                        : null;
                                const isEditableKey = key !== 'code';
                                return (
                                  <PremiumTableCell
                                    key={key}
                                    bgColor={cellBg}
                                    sx={{
                                      py: 0.4,
                                      px: 1,
                                      fontSize: 15, // bigger data text
                                      fontWeight:
                                        highlight || highlightDark ? 700 : 500,
                                      textAlign:
                                        accent ||
                                        adk ||
                                        highlight ||
                                        highlightDark
                                          ? 'center'
                                          : 'left',
                                      fontFamily:
                                        accent ||
                                        adk ||
                                        highlight ||
                                        highlightDark
                                          ? 'monospace'
                                          : 'inherit',
                                      color:
                                        highlight || highlightDark
                                          ? accentColor
                                          : 'inherit',
                                    }}
                                  >
                                    {editRecord &&
                                    editRecord.id === record.id &&
                                    isEditableKey ? (
                                      <ModernTextField
                                        value={editRecord[key] ?? ''}
                                        onChange={(e) =>
                                          setEditRecord({
                                            ...editRecord,
                                            [key]: e.target.value,
                                          })
                                        }
                                        size="small"
                                        sx={{
                                          minWidth: 100,
                                          '& .MuiInputBase-root': {
                                            height: 30,
                                            fontSize: 14,
                                          },
                                        }}
                                      />
                                    ) : (
                                      record[key]
                                    )}
                                  </PremiumTableCell>
                                );
                              },
                            )}

                            <PremiumTableCell sx={{ py: 0.4, px: 1 }}>
                              {editRecord && editRecord.id === record.id ? (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                  }}
                                >
                                  <ProfessionalButton
                                    onClick={updateRecord}
                                    variant="contained"
                                    size="small"
                                    sx={{
                                      ...saveButtonStyles,
                                      py: 0.4,
                                      px: 1.2,
                                      fontSize: 12,
                                    }}
                                    startIcon={<SaveIcon />}
                                  >
                                    Save
                                  </ProfessionalButton>

                                  <ProfessionalButton
                                    onClick={() => setEditRecord(null)}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      borderColor: accentColor,
                                      color: accentColor,
                                      py: 0.4,
                                      px: 1.2,
                                      fontSize: 12,
                                      '&:hover': {
                                        backgroundColor: alpha(
                                          accentColor,
                                          0.08,
                                        ),
                                      },
                                    }}
                                    startIcon={<CancelIcon />}
                                  >
                                    Cancel
                                  </ProfessionalButton>
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                  }}
                                >
                                  <ProfessionalButton
                                    onClick={() => setEditRecord(record)}
                                    variant="contained"
                                    size="small"
                                    sx={{
                                      ...editButtonStyles,
                                      py: 0.4,
                                      px: 1.2,
                                      fontSize: 12,
                                    }}
                                    startIcon={<EditIcon />}
                                  >
                                    Edit
                                  </ProfessionalButton>

                                  <ProfessionalButton
                                    onClick={() =>
                                      deleteRecord(record.id, record.personID)
                                    }
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      ...deleteButtonStyles,
                                      py: 0.4,
                                      px: 1.2,
                                      fontSize: 12,
                                    }}
                                    startIcon={<DeleteIcon />}
                                  >
                                    Delete
                                  </ProfessionalButton>
                                </Box>
                              )}
                            </PremiumTableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* ── Empty state ── */}
        {attendanceData.length === 0 && !loading && (
          <Fade in timeout={500}>
            <GlassCard
              sx={{
                mb: 2,
                background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
                border: `1px solid ${alpha(accentColor, 0.1)}`,
              }}
            >
              <Box
                sx={{
                  p: 8,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: alpha(accentColor, 0.1),
                    width: 96,
                    height: 96,
                    mb: 3,
                  }}
                >
                  <Info sx={{ fontSize: 52, color: alpha(accentColor, 0.5) }} />
                </Avatar>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: alpha(accentColor, 0.7),
                    mb: 1,
                  }}
                >
                  No Records Found
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: alpha(accentColor, 0.45) }}
                >
                  Try adjusting your date range or search for a different
                  employee
                </Typography>
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* ── Action Buttons ── */}
        {attendanceData.length > 0 && (
          <Fade in timeout={900}>
            <Box>
              {/* Section label */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2.5,
                  px: 0.5,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    bgcolor: alpha(accentColor, 0.15),
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: alpha(textPrimaryColor, 0.5),
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Submit to Payroll
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    bgcolor: alpha(accentColor, 0.15),
                  }}
                />
              </Box>

              <Grid container spacing={3}>
                {/* ── Regular Payroll Card ── */}
                <Grid item xs={12} md={6}>
                  <Box
                    onClick={
                      !isSubmitting
                        ? () => setShowRegularConfirm(true)
                        : undefined
                    }
                    sx={{
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.65 : 1,
                      border: `2px solid ${alpha(accentColor, 0.25)}`,
                      background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: `0 8px 32px ${alpha(accentColor, 0.3)}`,
                      '&:hover': !isSubmitting
                        ? {
                            transform: 'translateY(-3px)',
                            boxShadow: `0 14px 40px ${alpha(accentColor, 0.45)}`,
                            border: `2px solid ${alpha(accentColor, 0.55)}`,
                          }
                        : {},
                      '&:active': !isSubmitting
                        ? { transform: 'translateY(-1px)' }
                        : {},
                    }}
                  >
                    {/* Decorative background circles */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -30,
                        right: -30,
                        width: 130,
                        height: 130,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.06)',
                        pointerEvents: 'none',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -20,
                        left: -20,
                        width: 90,
                        height: 90,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.04)',
                        pointerEvents: 'none',
                      }}
                    />

                    <Box
                      sx={{
                        p: 3.5,
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.15)',
                          width: 56,
                          height: 56,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                          flexShrink: 0,
                        }}
                      >
                        {isSubmitting ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: primaryColor }}
                          />
                        ) : (
                          <Assignment
                            sx={{ fontSize: 28, color: primaryColor }}
                          />
                        )}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            mb: 0.4,
                          }}
                        >
                          Regular Employees
                        </Typography>
                        <Typography
                          sx={{
                            color: '#fff',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            mb: 0.5,
                          }}
                        >
                          {isSubmitting
                            ? 'Submitting...'
                            : 'Submit Payroll Regular'}
                        </Typography>
                        <Typography
                          sx={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: '0.76rem',
                            fontWeight: 500,
                          }}
                        >
                          Permanent & contractual staff
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '1.6rem',
                          fontWeight: 300,
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        →
                      </Box>
                    </Box>

                    {/* Bottom accent strip */}
                    <Box
                      sx={{
                        height: 4,
                        background: `linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.35), rgba(255,255,255,0.15))`,
                      }}
                    />
                  </Box>
                </Grid>

                {/* ── JO Payroll Card ── */}
                <Grid item xs={12} md={6}>
                  <Box
                    onClick={!isSubmittingJO ? submitPayrollJO : undefined}
                    sx={{
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      cursor: isSubmittingJO ? 'not-allowed' : 'pointer',
                      opacity: isSubmittingJO ? 0.65 : 1,
                      border: `2px solid ${alpha(accentColor, 0.35)}`,
                      background: `rgba(${hexToRgb(primaryColor)}, 0.97)`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: `0 8px 32px ${alpha(accentColor, 0.12)}`,
                      '&:hover': !isSubmittingJO
                        ? {
                            transform: 'translateY(-3px)',
                            boxShadow: `0 14px 40px ${alpha(accentColor, 0.22)}`,
                            border: `2px solid ${alpha(accentColor, 0.6)}`,
                            background: `rgba(${hexToRgb(secondaryColor)}, 0.98)`,
                          }
                        : {},
                      '&:active': !isSubmittingJO
                        ? { transform: 'translateY(-1px)' }
                        : {},
                    }}
                  >
                    {/* Decorative background circles */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -30,
                        right: -30,
                        width: 130,
                        height: 130,
                        borderRadius: '50%',
                        bgcolor: alpha(accentColor, 0.05),
                        pointerEvents: 'none',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -20,
                        left: -20,
                        width: 90,
                        height: 90,
                        borderRadius: '50%',
                        bgcolor: alpha(accentColor, 0.04),
                        pointerEvents: 'none',
                      }}
                    />

                    <Box
                      sx={{
                        p: 3.5,
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: alpha(accentColor, 0.12),
                          width: 56,
                          height: 56,
                          border: `2px solid ${alpha(accentColor, 0.2)}`,
                          boxShadow: `0 4px 16px ${alpha(accentColor, 0.15)}`,
                          flexShrink: 0,
                        }}
                      >
                        {isSubmittingJO ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: accentColor }}
                          />
                        ) : (
                          <Assignment
                            sx={{ fontSize: 28, color: accentColor }}
                          />
                        )}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            color: alpha(textPrimaryColor, 0.55),
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            mb: 0.4,
                          }}
                        >
                          Job Order Employees
                        </Typography>
                        <Typography
                          sx={{
                            color: textPrimaryColor,
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            mb: 0.5,
                          }}
                        >
                          {isSubmittingJO
                            ? 'Submitting...'
                            : 'Submit Payroll JO'}
                        </Typography>
                        <Typography
                          sx={{
                            color: alpha(textPrimaryColor, 0.45),
                            fontSize: '0.76rem',
                            fontWeight: 500,
                          }}
                        >
                          Job order & project-based staff
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          color: alpha(accentColor, 0.3),
                          fontSize: '1.6rem',
                          fontWeight: 300,
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        →
                      </Box>
                    </Box>

                    {/* Bottom accent strip */}
                    <Box
                      sx={{
                        height: 4,
                        background: `linear-gradient(90deg, ${alpha(accentColor, 0.08)}, ${alpha(accentColor, 0.28)}, ${alpha(accentColor, 0.08)})`,
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}

        {/* ── Regular Payroll Confirmation Dialog ── */}
        <Dialog
          open={showRegularConfirm}
          onClose={() => {
            setShowRegularConfirm(false);
            setConfirmRegularChecked(false);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '2px solid #6D2323',
              overflow: 'hidden',
            },
          }}
        >
          <DialogTitle
            sx={{
              px: 3,
              pt: 2.5,
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderBottom: '3px solid #6D2323',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'rgba(109,35,35,0.08)',
                color: '#6D2323',
                width: 52,
                height: 52,
              }}
            >
              <Assignment sx={{ fontSize: 26 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 'bold', color: '#333' }}
              >
                Confirm Regular Payroll Submission
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Final confirmation required before submitting to Regular
                payroll.
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent
            sx={{ px: 4, pt: 5, pb: 3, backgroundColor: '#FFFFFF' }}
          >
            <Alert
              severity="info"
              icon={<InfoIcon />}
              sx={{
                mt: 2,
                mb: 3.5,
                borderRadius: 2,
                bgcolor: 'rgba(109,35,35,0.04)',
                border: '1px solid rgba(109,35,35,0.2)',
                '& .MuiAlert-icon': { color: '#6D2323', fontSize: 24 },
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 0.5, color: '#333' }}
              >
                {attendanceData.length} record(s) will be validated and
                submitted.
              </Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                Please ensure all attendance records are complete and accurate
                before continuing. This action will forward data to Regular
                payroll processing.
              </Typography>
            </Alert>
            <Box
              sx={{
                p: 2.5,
                bgcolor: '#f9f9f9',
                borderRadius: 2,
                border: `2px solid ${confirmRegularChecked ? '#6D2323' : '#e0e0e0'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                transition: 'all 0.2s ease',
                ...(confirmRegularChecked && {
                  bgcolor: 'rgba(109,35,35,0.04)',
                }),
              }}
            >
              <Checkbox
                checked={confirmRegularChecked}
                onChange={(e) => setConfirmRegularChecked(e.target.checked)}
                sx={{
                  color: '#6D2323',
                  '&.Mui-checked': { color: '#6D2323' },
                  mt: -0.5,
                }}
              />
              <Box>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}
                >
                  I confirm that I have reviewed all Regular payroll records.
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  All information for Regular employees is accurate and ready
                  for submission to payroll. I understand this action cannot be
                  undone.
                </Typography>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              px: 4,
              py: 3,
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
            }}
          >
            <ProfessionalButton
              variant="outlined"
              onClick={() => {
                setShowRegularConfirm(false);
                setConfirmRegularChecked(false);
              }}
              sx={{
                minWidth: 120,
                borderColor: '#6D2323',
                color: '#6D2323',
                fontWeight: 600,
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              variant="contained"
              disabled={!confirmRegularChecked || isSubmitting}
              onClick={async () => {
                setShowRegularConfirm(false);
                setConfirmRegularChecked(false);
                await submitToPayroll();
              }}
              sx={{
                minWidth: 160,
                bgcolor: '#6D2323',
                color: '#FEF9E1',
                fontWeight: 600,
                '&:hover': { bgcolor: '#8B3333' },
                '&:disabled': {
                  bgcolor: 'rgba(0,0,0,0.12)',
                  color: 'rgba(0,0,0,0.4)',
                },
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── StyledModal ── */}
        <StyledModal
          open={modal.open}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          onConfirm={modal.onConfirm}
          showCancel={modal.showCancel}
          accentColor={accentColor}
          accentDark={accentDark}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          textPrimaryColor={textPrimaryColor}
        />

        {/* ── Overlays ── */}
        <LoadingOverlay
          open={processingOverlay}
          message={processingMessage || 'Processing...'}
        />
        <SuccessfulOverlay
          open={successOverlay}
          action={successAction}
          showOkButton
          onClose={() => {
            setSuccessOverlay(false);
            if (successRedirect) navigate(successRedirect);
          }}
        />
      </Box>
    </Fade>
  );
};

export default OverallAttendance;
