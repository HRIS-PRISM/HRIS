import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  Chip,
  Paper,
  Fade,
  Grid,
  FormControl,
  Tooltip,
  IconButton,
  Backdrop,
  Snackbar,
  Modal,
  styled,
  alpha,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  EventNote,
  FilterList as FilterIcon,
  EventAvailable as ReorderIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Refresh,
  AccessTime,
  CheckCircle,
  Block,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  WarningAmber as WarningIcon,
  AccountBalanceWallet as WalletIcon,
  HistoryToggleOff,
  Close as CloseIcon,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { MenuItem, Select, TextField, Card, CardContent } from '@mui/material';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import { jwtDecode } from 'jwt-decode';

import LoadingOverlay from '../LoadingOverlay';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import SuccessfulOverlay from '../SuccessfulOverlay';
import LeaveDatePicker from './LeaveDatePicker';
import { useSystemSettings } from '../../hooks/useSystemSettings';

// ─── Styled components ────────────────────────────────────────────────────────

const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 24px rgba(109,35,35,0.06)',
}));

const ProfessionalButton = styled(Button)(() => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
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
      backgroundColor: '#fff',
      boxShadow: '0 4px 20px rgba(109,35,35,0.12)',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const ModernSelect = styled(Select)(() => ({
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.9)',
  fontSize: '0.9rem',
  transition: 'all 0.3s ease',
  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
}));

const RecordCard = styled(Card)(() => ({
  borderRadius: 16,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid rgba(109,35,35,0.08)',
  boxShadow: '0 2px 12px rgba(109,35,35,0.04)',
  '&:hover': {
    boxShadow: '0 8px 28px rgba(109,35,35,0.12)',
    borderColor: 'rgba(109,35,35,0.18)',
    transform: 'translateY(-2px)',
  },
}));

const BalanceCard = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(109,35,35,0.08)',
  boxShadow: '0 2px 8px rgba(109,35,35,0.04)',
  transition: 'all 0.25s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 14px rgba(109,35,35,0.1)',
    borderColor: 'rgba(109,35,35,0.18)',
  },
}));

// ─── Shimmer / Wireframe ──────────────────────────────────────────────────────

const lruShimmerKeyframes = `
@keyframes lruShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes lruPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const SkeletonBox = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  sx = {},
}) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: `${borderRadius}px`,
      background:
        'linear-gradient(90deg,rgba(109,35,35,0.08) 25%,rgba(109,35,35,0.18) 50%,rgba(109,35,35,0.08) 75%)',
      backgroundSize: '800px 100%',
      animation: 'lruShimmer 1.5s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

const LeaveRequestWireframe = ({
  accentColor = '#6d2323',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => (
  <>
    <style>{lruShimmerKeyframes}</style>
    <Box
      sx={{
        py: 4,
        mt: -5,
        width: '100vw',
        maxWidth: '100%',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 }, mx: 'auto', maxWidth: '1800px' }}>
        {/* ── Header skeleton ── */}
        <Box
          sx={{
            mb: 4,
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${alpha(accentColor, 0.1)}`,
            animation: 'lruPulse 2s ease-in-out infinite',
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
            {/* radial decorations */}
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                bgcolor: alpha(accentColor, 0.06),
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
                bgcolor: alpha(accentColor, 0.04),
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha(accentColor, 0.12),
                    mr: 4,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <SkeletonBox
                    width={260}
                    height={28}
                    borderRadius={6}
                    sx={{ mb: 1.5 }}
                  />
                  <SkeletonBox width={220} height={14} borderRadius={4} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SkeletonBox width={120} height={24} borderRadius={12} />
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: alpha(accentColor, 0.1),
                  }}
                />
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: alpha(accentColor, 0.1),
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Balances skeleton — compact horizontal chips ── */}
        <Box
          sx={{
            mb: 4,
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${alpha(accentColor, 0.1)}`,
            animation: 'lruPulse 2s ease-in-out 0.07s infinite',
          }}
        >
          {/* section header */}
          <Box
            sx={{
              p: 3,
              pl: 4,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: alpha(accentColor, 0.12),
                flexShrink: 0,
              }}
            />
            <Box>
              <SkeletonBox
                width={150}
                height={16}
                borderRadius={4}
                sx={{ mb: 0.5 }}
              />
              <SkeletonBox width={200} height={11} borderRadius={3} />
            </Box>
          </Box>
          {/* compact balance chips */}
          <Box sx={{ p: 3, bgcolor: alpha(primaryColor, 0.4) }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {[...Array(6)].map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1,
                    borderRadius: '10px',
                    bgcolor: 'rgba(255,255,255,0.8)',
                    border: `1px solid ${alpha(accentColor, 0.08)}`,
                    animation: `lruPulse 2s ease-in-out ${i * 0.06}s infinite`,
                    minWidth: 160,
                  }}
                >
                  <Box>
                    <SkeletonBox
                      width={60}
                      height={10}
                      borderRadius={3}
                      sx={{ mb: 0.5 }}
                    />
                    <SkeletonBox width={80} height={16} borderRadius={3} />
                  </Box>
                  <Box
                    sx={{
                      ml: 'auto',
                      width: 40,
                      height: 4,
                      bgcolor: '#e0e0e0',
                      borderRadius: 2,
                      alignSelf: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${40 + i * 10}%`,
                        bgcolor: alpha('#2E7D32', 0.4),
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ── Two-column skeleton ── */}
        <Grid container spacing={4}>
          {/* Left: Form */}
          <Grid item xs={12} lg={6}>
            <Box
              sx={{
                borderRadius: '20px',
                overflow: 'hidden',
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                animation: 'lruPulse 2s ease-in-out 0.10s infinite',
              }}
            >
              {/* panel header */}
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: alpha(accentColor, 0.12),
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <SkeletonBox
                    width={200}
                    height={16}
                    borderRadius={4}
                    sx={{ mb: 0.75 }}
                  />
                  <SkeletonBox width={175} height={11} borderRadius={3} />
                </Box>
              </Box>
              {/* form fields */}
              <Box
                sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                {[
                  'Employee Number',
                  'Leave Type',
                  'Leave Date(s)',
                  'Selected Dates',
                ].map((_, i) => (
                  <Box key={i}>
                    <SkeletonBox
                      width={i === 2 ? 100 : i === 3 ? 110 : 130}
                      height={12}
                      borderRadius={3}
                      sx={{ mb: 1 }}
                    />
                    <Box
                      sx={{
                        height: i === 3 ? 56 : 44,
                        borderRadius: '12px',
                        border: `1px solid ${alpha(accentColor, 0.15)}`,
                        bgcolor: 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        gap: 1,
                      }}
                    >
                      {i === 2 && (
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '4px',
                            bgcolor: alpha(accentColor, 0.15),
                          }}
                        />
                      )}
                      <SkeletonBox
                        width={i === 2 ? 130 : '50%'}
                        height={12}
                        borderRadius={3}
                      />
                    </Box>
                  </Box>
                ))}
                {/* Submit button */}
                <Box
                  sx={{
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: alpha(accentColor, 0.15),
                    mt: 1,
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Right: Records */}
          <Grid item xs={12} lg={6}>
            <Box
              sx={{
                borderRadius: '20px',
                overflow: 'hidden',
                border: `1px solid ${alpha(accentColor, 0.1)}`,
                animation: 'lruPulse 2s ease-in-out 0.13s infinite',
              }}
            >
              {/* panel header + filters */}
              <Box
                sx={{
                  p: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: alpha(accentColor, 0.12),
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <SkeletonBox
                        width={195}
                        height={16}
                        borderRadius={4}
                        sx={{ mb: 0.75 }}
                      />
                      <SkeletonBox width={90} height={11} borderRadius={3} />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '4px',
                        bgcolor: alpha(accentColor, 0.15),
                      }}
                    />
                    <SkeletonBox width={35} height={12} borderRadius={3} />
                    {[120, 130, 120].map((w, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: w,
                          height: 36,
                          borderRadius: '12px',
                          border: `1px solid ${alpha(accentColor, 0.15)}`,
                          bgcolor: 'rgba(255,255,255,0.9)',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Record rows — matching real card layout: type | date | submitted | status + cancel */}
              <Box
                sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {[...Array(3)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      borderRadius: '16px',
                      border: `1px solid ${alpha(accentColor, 0.08)}`,
                      p: 3,
                      bgcolor: 'rgba(255,255,255,0.6)',
                      boxShadow: '0 2px 12px rgba(109,35,35,0.04)',
                      animation: `lruPulse 2s ease-in-out ${i * 0.07}s infinite`,
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      {/* Leave Type col */}
                      <Grid item xs={12} md={3}>
                        <SkeletonBox
                          width="55%"
                          height={9}
                          borderRadius={3}
                          sx={{ mb: 0.75 }}
                        />
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '4px',
                              bgcolor: alpha(accentColor, 0.15),
                            }}
                          />
                          <SkeletonBox
                            width={44}
                            height={13}
                            borderRadius={3}
                          />
                        </Box>
                        <SkeletonBox width="75%" height={9} borderRadius={3} />
                      </Grid>

                      {/* Leave Date col */}
                      <Grid item xs={6} md={2}>
                        <SkeletonBox
                          width="60%"
                          height={9}
                          borderRadius={3}
                          sx={{ mb: 0.75 }}
                        />
                        <SkeletonBox width="90%" height={13} borderRadius={3} />
                      </Grid>

                      {/* Submitted col */}
                      <Grid item xs={6} md={3}>
                        <SkeletonBox
                          width="50%"
                          height={9}
                          borderRadius={3}
                          sx={{ mb: 0.75 }}
                        />
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 13,
                              height: 13,
                              borderRadius: '50%',
                              bgcolor: alpha(accentColor, 0.12),
                            }}
                          />
                          <SkeletonBox
                            width="70%"
                            height={11}
                            borderRadius={3}
                          />
                        </Box>
                      </Grid>

                      {/* Status col */}
                      <Grid item xs={6} md={2}>
                        <SkeletonBox
                          width="45%"
                          height={9}
                          borderRadius={3}
                          sx={{ mb: 0.75 }}
                        />
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '8px',
                            height: 28,
                            bgcolor:
                              i === 0
                                ? '#FFF8E1'
                                : i === 1
                                  ? '#E3F2FD'
                                  : '#E8F5E9',
                            border: `1px solid ${alpha(i === 0 ? '#F57C00' : i === 1 ? '#1565C0' : '#2E7D32', 0.2)}`,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor:
                                i === 0
                                  ? alpha('#F57C00', 0.4)
                                  : i === 1
                                    ? alpha('#1565C0', 0.4)
                                    : alpha('#2E7D32', 0.4),
                            }}
                          />
                          <SkeletonBox
                            width={58}
                            height={10}
                            borderRadius={3}
                          />
                        </Box>
                      </Grid>

                      {/* Cancel col — only on first (pending) row */}
                      <Grid item xs={6} md={2}>
                        {i === 0 && (
                          <Box
                            sx={{
                              width: 72,
                              height: 32,
                              borderRadius: '10px',
                              border: `1.5px solid ${alpha('#C62828', 0.3)}`,
                              bgcolor: alpha('#C62828', 0.04),
                            }}
                          />
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  </>
);

// ─── LeaveRequestUser ─────────────────────────────────────────────────────────

const LeaveRequestUser = () => {
  const { hasAccess, loading: accessLoading } =
    usePageAccess('leave-request-user');

  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);
  const fetchTransactionRef = useRef(null);
  const fetchAssignmentsRef = useRef(null);
  const transactionOpenRef = useRef(false);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [newLeaveRequest, setNewLeaveRequest] = useState({
    leave_code: '',
    leave_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [personID, setPersonID] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [transactionLogsModalOpen, setTransactionLogsModalOpen] =
    useState(false);
  const [transactionLogs, setTransactionLogs] = useState([]);
  const [transactionLogsLoading, setTransactionLogsLoading] = useState(false);
  const [transactionLogsError, setTransactionLogsError] = useState('');
  const [auditLogPage, setAuditLogPage] = useState(1);
  const AUDIT_LOGS_PER_PAGE = 5;
  const [selectedDates, setSelectedDates] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [balanceAlertOpen, setBalanceAlertOpen] = useState(false);
  const [balanceAlertDetail, setBalanceAlertDetail] = useState('');
  const [unavailableDatesAlertOpen, setUnavailableDatesAlertOpen] =
    useState(false);
  const [unavailableDatesAlertDetail, setUnavailableDatesAlertDetail] =
    useState('');

  const [pageLoading, setPageLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const { settings } = useSystemSettings();
  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isSickLeave = () => {
    const t = leaveTypes.find(
      (x) => x.leave_code === newLeaveRequest.leave_code,
    );
    if (!t) return false;
    return (
      (t.leave_code || '').toLowerCase().includes('sl') ||
      (t.leave_code || '').toLowerCase().includes('sick') ||
      (t.leave_description || '').toLowerCase().includes('sick')
    );
  };

  const groupedBalances = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const code = a.leave_code;
      const desc =
        leaveTypes.find((lt) => lt.leave_code === code)?.leave_description ||
        code;
      if (!map[code]) map[code] = { code, description: desc, totalHours: 0 };
      map[code].totalHours += parseFloat(a.remaining_hours || 0);
    });
    return Object.values(map).map((b) => ({
      ...b,
      totalDays: (b.totalHours / 8).toFixed(1),
    }));
  }, [assignments, leaveTypes]);

  const getAllocatedRemainingDays = () => {
    if (!newLeaveRequest.leave_code || !assignments.length) return null;
    const allocated = assignments
      .filter(
        (a) =>
          a.leave_code === newLeaveRequest.leave_code &&
          (a.carried_forward_hours === null ||
            Number(a.carried_forward_hours) === 0),
      )
      .sort((a, b) => {
        if (b.period_year !== a.period_year)
          return b.period_year - a.period_year;
        const semVal = (s) => {
          if (!s) return 0;
          if (s.includes('2nd')) return 2;
          if (s.includes('1st')) return 1;
          return 0;
        };
        return semVal(b.period_semester) - semVal(a.period_semester);
      })[0];
    if (!allocated) return null;
    return (parseFloat(allocated.remaining_hours) || 0) / 8;
  };

  const months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Immediate Supervisor Approved' },
    { value: '2', label: 'HR Approved' },
    { value: '3', label: 'Denied' },
    { value: '4', label: 'Cancelled' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setPersonID(jwtDecode(token).employeeNumber);
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!personID || initialLoadDone.current) return;
    initialLoadDone.current = true;
    const init = async () => {
      await Promise.allSettled([
        fetchLeaveRequests(),
        fetchLeaveTypes(),
        fetchAssignments(),
      ]);
      setTimeout(() => setPageLoading(false), 350);
    };
    init();
  }, [personID]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshRef.current = fetchLeaveRequests;
  });
  useEffect(() => {
    fetchTransactionRef.current = fetchTransactionLogs;
  });
  useEffect(() => {
    fetchAssignmentsRef.current = fetchAssignments;
  });
  useEffect(() => {
    transactionOpenRef.current = transactionLogsModalOpen;
  }, [transactionLogsModalOpen]);

  useEffect(() => {
    if (!socket || !connected) return;
    const handleReq = () => {
      refreshRef.current?.();
      fetchAssignmentsRef.current?.();
      fetchTransactionRef.current?.();
    };
    const handleAssign = () => {
      fetchAssignmentsRef.current?.();
      refreshRef.current?.();
      fetchTransactionRef.current?.();
    };
    socket.on('leaveRequestChanged', handleReq);
    socket.on('leaveAssignmentChanged', handleAssign);
    return () => {
      socket.off('leaveRequestChanged', handleReq);
      socket.off('leaveAssignmentChanged', handleAssign);
    };
  }, [socket, connected]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/${personID}`,
        getAuthHeaders(),
      );
      setLeaveRequests(res.data);
    } catch (e) {
      console.error('Error fetching leave requests:', e);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_table`,
        getAuthHeaders(),
      );
      setLeaveTypes(res.data);
    } catch (e) {
      console.error('Error fetching leave types:', e);
    }
  };

  const fetchAssignments = async () => {
    if (!personID) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
        getAuthHeaders(),
      );
      const mine = (Array.isArray(res.data) ? res.data : []).filter(
        (a) => a.employeeNumber?.toString() === personID?.toString(),
      );
      setAssignments(mine);
    } catch (e) {
      console.error('Error fetching assignments:', e);
    }
  };

  const fetchTransactionLogs = async () => {
    if (!personID) return;
    setTransactionLogsLoading(true);
    setTransactionLogsError('');
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/transactions/${personID}`,
        getAuthHeaders(),
      );
      setTransactionLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching transaction logs:', e);
      setTransactionLogsError('Failed to load transaction logs.');
      setTransactionLogs([]);
    } finally {
      setTransactionLogsLoading(false);
    }
  };

  useEffect(() => {
    if (transactionLogsModalOpen) fetchTransactionLogs();
  }, [transactionLogsModalOpen, personID]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!newLeaveRequest.leave_code) {
      alert('Please select a leave type.');
      return;
    }
    if (!selectedDates.length) {
      alert('Please pick at least one leave date.');
      return;
    }
    const unavailableDates = selectedDates.filter((date) =>
      leaveRequests.some((req) => {
        const reqDates = (req.leave_date || '').split(',').map((s) => s.trim());
        return reqDates.includes(date) && String(req.status) === '2';
      }),
    );
    if (unavailableDates.length > 0) {
      setUnavailableDatesAlertDetail(
        `One or more selected dates are unavailable due to existing HR-approved leave. Please change your selection.`,
      );
      setUnavailableDatesAlertOpen(true);
      return;
    }
    const remainingDays = getAllocatedRemainingDays();
    if (remainingDays !== null && selectedDates.length > remainingDays) {
      const typeName =
        leaveTypes.find((t) => t.leave_code === newLeaveRequest.leave_code)
          ?.leave_description || newLeaveRequest.leave_code;
      setBalanceAlertDetail(
        `You are requesting ${selectedDates.length} day(s) of "${typeName}" but only have ${remainingDays.toFixed(1)} allocated day(s) remaining.`,
      );
      setBalanceAlertOpen(true);
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_request`,
        {
          employeeNumber: personID,
          leave_code: newLeaveRequest.leave_code,
          leave_dates: selectedDates,
          status: '0',
        },
        getAuthHeaders(),
      );
      setSuccessAction('Leave Request Submitted Successfully');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      await fetchLeaveRequests();
      await fetchAssignments();
      setNewLeaveRequest({ leave_code: '', leave_date: '' });
      setSelectedDates([]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 400) {
        setBalanceAlertDetail(err.response?.data?.detail || errMsg);
        setBalanceAlertOpen(true);
      } else alert('Error submitting leave request: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setNewLeaveRequest((prev) => ({ ...prev, [field]: value }));
    if (field === 'leave_code') setSelectedDates([]);
  };

  const getLeaveTypeInfo = (leaveDesc) =>
    leaveTypes.find((t) => t.leave_description === leaveDesc) || {
      leave_description: leaveDesc,
    };

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests
      .filter((request) => {
        if (monthFilter) {
          const m = String(
            new Date(request.leave_date).getMonth() + 1,
          ).padStart(2, '0');
          if (m !== monthFilter) return false;
        }
        if (leaveTypeFilter && request.leave_code !== leaveTypeFilter)
          return false;
        if (statusFilter && String(request.status) !== statusFilter)
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.leave_date) - new Date(a.leave_date));
  }, [leaveRequests, monthFilter, leaveTypeFilter, statusFilter]);

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?'))
      return;
    try {
      const req = leaveRequests.find((r) => r.id === id);
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_request/${id}`,
        {
          employeeNumber: req.employeeNumber,
          leave_code: req.leave_code,
          leave_date: req.leave_date,
          status: 4,
        },
        getAuthHeaders(),
      );
      setSuccessAction('Request Cancelled Successfully');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
      await fetchLeaveRequests();
      await fetchAssignments();
    } catch (err) {
      alert(
        'Error cancelling request: ' +
          (err.response?.data?.error || err.message),
      );
    }
  };

  const getStatusInfo = (status) =>
    ({
      0: {
        label: 'Pending',
        sublabel: '',
        color: '#F57C00',
        bg: '#FFF8E1',
        icon: AccessTime,
      },
      1: {
        label: 'Supervisor Approved',
        sublabel: 'Pending HR',
        color: '#1565C0',
        bg: '#E3F2FD',
        icon: CheckCircle,
      },
      2: {
        label: 'HR Approved',
        sublabel: '',
        color: '#2E7D32',
        bg: '#E8F5E9',
        icon: CheckCircle,
      },
      3: {
        label: 'Denied',
        sublabel: '',
        color: '#C62828',
        bg: '#FFEBEE',
        icon: Block,
      },
      4: {
        label: 'Cancelled',
        sublabel: '',
        color: '#757575',
        bg: '#FAFAFA',
        icon: CancelIcon,
      },
    })[String(status)] || {
      label: 'Unknown',
      sublabel: '',
      color: '#757575',
      bg: '#FAFAFA',
      icon: AccessTime,
    };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const s = Array.isArray(d) ? d[0] : d.split(',')[0].trim();
    const [y, m, day] = s.split('-');
    return new Date(y, m - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionMessage = (message) => {
    const safeMessage = message || 'No message';
    const lower = safeMessage.toLowerCase();
    const highlights = [];
    if (lower.includes('immediate supervisor'))
      highlights.push({ pattern: /\bapprove\b/gi, color: '#1565C0' });
    else if (lower.includes('hr') && lower.includes('approve'))
      highlights.push({ pattern: /\bapprove\b/gi, color: '#2E7D32' });
    else if (lower.includes('rejected'))
      highlights.push({ pattern: /\brejected\b/gi, color: '#C62828' });
    else if (lower.includes('requested'))
      highlights.push({ pattern: /\brequested\b/gi, color: '#D4A017' });
    if (!highlights.length) return safeMessage;
    let rendered = [safeMessage];
    highlights.forEach(({ pattern, color }, idx) => {
      rendered = rendered.flatMap((part, partIdx) => {
        if (typeof part !== 'string') return [part];
        const chunks = part.split(pattern);
        const matches = part.match(pattern) || [];
        if (!matches.length) return [part];
        const out = [];
        chunks.forEach((chunk, i) => {
          if (chunk) out.push(chunk);
          if (i < matches.length)
            out.push(
              <Box
                component="span"
                key={`hl-${idx}-${partIdx}-${i}`}
                sx={{ color, fontWeight: 700 }}
              >
                {matches[i]}
              </Box>,
            );
        });
        return out;
      });
    });
    return <>{rendered}</>;
  };

  const remainingDays = getAllocatedRemainingDays();
  const isOverBalance =
    remainingDays !== null && selectedDates.length > remainingDays;

  const [inlineLeaveTypeError, setInlineLeaveTypeError] = React.useState('');
  const [inlineSelectedDatesError, setInlineSelectedDatesError] =
    React.useState('');

  React.useEffect(() => {
    setInlineLeaveTypeError('');
    setInlineSelectedDatesError('');
    if (newLeaveRequest.leave_code) {
      const hasAllocation = assignments.some(
        (a) =>
          a.leave_code === newLeaveRequest.leave_code &&
          parseFloat(a.allocated_hours || 0) > 0,
      );
      if (!hasAllocation)
        setInlineLeaveTypeError(
          `This request cannot be processed due to insufficient leave balance.`,
        );
      if (remainingDays !== null && selectedDates.length > remainingDays)
        setInlineSelectedDatesError(
          `You requested ${selectedDates.length} day(s) but only have ${remainingDays.toFixed(1)} allocated day(s) remaining.`,
        );
    }
  }, [
    newLeaveRequest.leave_code,
    groupedBalances,
    remainingDays,
    selectedDates,
    leaveTypes,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessLoading) {
    return (
      <LeaveRequestWireframe
        accentColor={accentColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    );
  }

  if (!hasAccess) return <AccessDenied />;

  // ── Wireframe skeleton ────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <LeaveRequestWireframe
        accentColor={accentColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    );
  }

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          py: 4,
          mt: -5,
          width: '100vw',
          mx: 'auto',
          maxWidth: '100%',
          overflow: 'hidden',
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Box
          sx={{ px: { xs: 2, sm: 3, md: 6 }, mx: 'auto', maxWidth: '1800px' }}
        >
          <Backdrop
            sx={{ color: primaryColor, zIndex: (t) => t.zIndex.drawer + 1 }}
            open={loading}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress color="inherit" size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
                Submitting...
              </Typography>
            </Box>
          </Backdrop>

          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />

          {/* Snackbar: unavailable dates */}
          <Snackbar
            open={unavailableDatesAlertOpen}
            onClose={() => setUnavailableDatesAlertOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={5000}
            sx={{ zIndex: 9999, mb: { xs: 8, sm: 10, md: 12 } }}
          >
            <Alert
              severity="error"
              onClose={() => setUnavailableDatesAlertOpen(false)}
              icon={<WarningIcon fontSize="inherit" />}
              sx={{
                width: '100%',
                maxWidth: 420,
                borderRadius: 3,
                background: '#C62828',
                color: '#fff',
                boxShadow: '0 8px 32px rgba(198,40,40,0.18)',
                border: '1.5px solid #C62828',
                '& .MuiAlert-message': { width: '100%' },
                '& .MuiTypography-root': { color: '#fff' },
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                Unavailable Leave Date(s)
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.95 }}>
                {unavailableDatesAlertDetail}
              </Typography>
            </Alert>
          </Snackbar>

          {/* Snackbar: balance alert */}
          <Snackbar
            open={balanceAlertOpen}
            onClose={() => setBalanceAlertOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ top: { xs: 32, sm: 48 }, zIndex: 9999 }}
          >
            <Alert
              severity="error"
              onClose={() => setBalanceAlertOpen(false)}
              icon={<WarningIcon fontSize="inherit" />}
              sx={{
                width: '100%',
                maxWidth: 520,
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(198,40,40,0.25)',
                border: '1.5px solid rgba(198,40,40,0.3)',
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                Insufficient Leave Balance
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {balanceAlertDetail}
              </Typography>
            </Alert>
          </Snackbar>

          {/* ── Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard
                sx={{ border: `1px solid ${alpha(accentColor, 0.1)}` }}
              >
                <Box
                  sx={{
                    p: 5,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: accentColor,
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
                      background:
                        'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: '30%',
                      width: 150,
                      height: 150,
                      background:
                        'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)',
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
                        <EventNote sx={{ color: accentColor, fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h4"
                          component="h1"
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            lineHeight: 1.2,
                            color: accentColor,
                          }}
                        >
                          Employee Leave Request
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            opacity: 0.8,
                            fontWeight: 400,
                            color: accentDark,
                          }}
                        >
                          Submit and view your leave requests
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Button
                        onClick={() => {
                          setTransactionLogsModalOpen(true);
                          setAuditLogPage(1);
                        }}
                        startIcon={<HistoryToggleOff />}
                        sx={{
                          bgcolor: alpha(accentColor, 0.1),
                          '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                          color: accentColor,
                          borderRadius: 3,
                          px: 2,
                          py: 1,
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Transaction Logs
                      </Button>
                      <Tooltip title="Refresh Data">
                        <IconButton
                          onClick={() => window.location.reload()}
                          sx={{
                            bgcolor: alpha(accentColor, 0.1),
                            '&:hover': { bgcolor: alpha(accentColor, 0.2) },
                            color: accentColor,
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

          {/* ── Leave Balances ── */}
          <Fade in timeout={600}>
            <GlassCard
              sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}
            >
              <Box
                sx={{
                  p: 3,
                  pl: 4,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: alpha(accentColor, 0.12),
                    width: 36,
                    height: 36,
                    mr: 2,
                  }}
                >
                  <WalletIcon sx={{ color: accentColor, fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: accentColor,
                      lineHeight: 1.2,
                    }}
                  >
                    Your Leave Balances
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: accentDark, opacity: 0.8 }}
                  >
                    Remaining leave credits per type
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ p: 3, bgcolor: alpha(primaryColor, 0.4) }}>
                {groupedBalances.length === 0 ? (
                  <Typography align="center" sx={{ py: 3, color: '#666' }}>
                    No balance information available.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {groupedBalances.map((balance) => {
                      const maxAssignment = assignments
                        .filter((a) => a.leave_code === balance.code)
                        .reduce((max, a) => {
                          const days = parseFloat(a.allocated_hours || 0) / 8;
                          return days > max ? days : max;
                        }, 0);
                      const pct =
                        maxAssignment > 0
                          ? Math.min(
                              100,
                              (balance.totalDays / maxAssignment) * 100,
                            )
                          : 0;
                      const barColor =
                        pct > 60 ? '#2E7D32' : pct > 30 ? '#F57C00' : '#C62828';
                      return (
                        <BalanceCard key={balance.code}>
                          {/* left: code chip + description */}
                          <Box>
                            <Chip
                              label={balance.code}
                              size="small"
                              sx={{
                                bgcolor: alpha(accentColor, 0.1),
                                color: accentColor,
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 20,
                                mb: 0.5,
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                color: '#666',
                                fontSize: '0.72rem',
                                maxWidth: 110,
                                lineHeight: 1.3,
                              }}
                            >
                              {balance.description}
                            </Typography>
                          </Box>
                          {/* divider */}
                          <Box
                            sx={{
                              width: '1px',
                              height: 32,
                              bgcolor: alpha(accentColor, 0.12),
                              flexShrink: 0,
                            }}
                          />
                          {/* right: days + bar */}
                          <Box>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: textPrimaryColor,
                                fontSize: '1rem',
                                lineHeight: 1,
                              }}
                            >
                              {balance.totalDays}
                              <Typography
                                component="span"
                                sx={{
                                  color: '#999',
                                  fontWeight: 400,
                                  fontSize: '0.75rem',
                                  ml: 0.5,
                                }}
                              >
                                / {maxAssignment.toFixed(1)} d
                              </Typography>
                            </Typography>
                            <Box
                              sx={{
                                mt: 0.75,
                                height: 3,
                                width: 72,
                                bgcolor: '#e8e8e8',
                                borderRadius: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  bgcolor: barColor,
                                  borderRadius: 2,
                                  transition: 'width 0.6s ease',
                                }}
                              />
                            </Box>
                          </Box>
                        </BalanceCard>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </GlassCard>
          </Fade>

          {/* ── Two column row ── */}
          <Grid container spacing={4}>
            {/* Left: Submit Form */}
            <Grid item xs={12} lg={6}>
              <Fade in timeout={700}>
                <GlassCard
                  sx={{
                    height: '100%',
                    border: `1px solid ${alpha(accentColor, 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      p: 4,
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      color: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: alpha(accentColor, 0.12),
                        width: 40,
                        height: 40,
                        mr: 2,
                      }}
                    >
                      <PersonIcon sx={{ color: accentColor, fontSize: 22 }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: accentColor,
                          lineHeight: 1.2,
                        }}
                      >
                        Submit New Leave Request
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: accentDark, opacity: 0.8 }}
                      >
                        Fill in the details to request leave
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                      {/* Employee Number */}
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                        >
                          Employee Number
                        </Typography>
                        <ModernTextField
                          value={personID}
                          disabled
                          fullWidth
                          size="small"
                          sx={{
                            '& .MuiInputBase-input.Mui-disabled': {
                              WebkitTextFillColor: '#333',
                            },
                          }}
                        />
                      </Grid>

                      {/* Leave Type */}
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                        >
                          Leave Type{' '}
                          <Box component="span" sx={{ color: '#C62828' }}>
                            *
                          </Box>
                        </Typography>
                        <FormControl fullWidth size="small">
                          <ModernSelect
                            value={newLeaveRequest.leave_code}
                            onChange={(e) =>
                              handleChange('leave_code', e.target.value)
                            }
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em style={{ color: '#999' }}>
                                Select Leave Type
                              </em>
                            </MenuItem>
                            {leaveTypes.map((type) => (
                              <MenuItem key={type.id} value={type.leave_code}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  <Chip
                                    label={type.leave_code}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(accentColor, 0.1),
                                      color: accentColor,
                                      fontWeight: 700,
                                      fontSize: '0.7rem',
                                      height: 20,
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {type.leave_description}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </ModernSelect>
                        </FormControl>
                        {inlineLeaveTypeError && (
                          <Alert
                            severity="error"
                            icon={<WarningIcon fontSize="inherit" />}
                            sx={{
                              mt: 1,
                              fontSize: '0.85rem',
                              py: 0.5,
                              px: 2,
                              borderRadius: 2,
                              bgcolor: 'rgba(198,40,40,0.06)',
                              border: '1px solid rgba(198,40,40,0.2)',
                            }}
                          >
                            {inlineLeaveTypeError}
                          </Alert>
                        )}
                      </Grid>

                      {/* Insufficient balance warning */}
                      {newLeaveRequest.leave_code &&
                        remainingDays !== null &&
                        isOverBalance && (
                          <Grid item xs={12}>
                            <Box
                              sx={{
                                px: 2,
                                py: 1.5,
                                borderRadius: 2,
                                bgcolor: 'rgba(198,40,40,0.06)',
                                border: '1.5px solid rgba(198,40,40,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                              }}
                            >
                              <WarningIcon
                                sx={{
                                  color: '#C62828',
                                  fontSize: 20,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: '#C62828' }}
                              >
                                {`Insufficient balance — you have ${remainingDays.toFixed(1)} day(s) but selected ${selectedDates.length}.`}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                      {/* Leave Dates */}
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                        >
                          Leave Date(s){' '}
                          <Box component="span" sx={{ color: '#C62828' }}>
                            *
                          </Box>
                        </Typography>
                        <ProfessionalButton
                          variant="outlined"
                          onClick={() => setDateModalOpen(true)}
                          startIcon={<CalendarIcon />}
                          fullWidth
                          disabled={remainingDays === 0}
                          sx={{
                            height: 48,
                            border: `1.5px solid ${isOverBalance ? '#C62828' : accentColor}`,
                            color: isOverBalance ? '#C62828' : accentColor,
                            justifyContent: 'flex-start',
                            bgcolor: alpha(
                              isOverBalance ? '#C62828' : accentColor,
                              0.04,
                            ),
                            '&:hover': {
                              bgcolor: alpha(
                                isOverBalance ? '#C62828' : accentColor,
                                0.08,
                              ),
                              border: `1.5px solid ${isOverBalance ? '#C62828' : accentColor}`,
                            },
                          }}
                        >
                          {selectedDates.length > 0
                            ? `${selectedDates.length} date(s) selected`
                            : 'Pick Leave Dates'}
                        </ProfessionalButton>
                        <LeaveDatePicker
                          open={dateModalOpen}
                          onClose={() => {
                            setNewLeaveRequest((prev) => ({
                              ...prev,
                              leave_date: selectedDates.join(','),
                            }));
                            setDateModalOpen(false);
                          }}
                          selectedDates={selectedDates}
                          setSelectedDates={setSelectedDates}
                          accentColor={accentColor}
                          accentDark={accentDark}
                          primaryColor={primaryColor}
                          secondaryColor={secondaryColor}
                          allowPastDates={isSickLeave()}
                          leaveType={newLeaveRequest.leave_code}
                          leaveRequests={leaveRequests}
                          maxSelectableDates={remainingDays}
                        />
                        {isSickLeave() && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#1565C0',
                              mt: 0.5,
                              display: 'block',
                              fontStyle: 'italic',
                            }}
                          >
                            * Past dates allowed for sick leave
                          </Typography>
                        )}
                      </Grid>

                      {/* Selected dates display */}
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mb: 1, color: accentColor }}
                        >
                          Selected Dates
                        </Typography>
                        <Box
                          sx={{
                            minHeight: 56,
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1,
                            p: 2,
                            border: `1px solid ${alpha(isOverBalance ? '#C62828' : accentColor, 0.2)}`,
                            borderRadius: 3,
                            backgroundColor: alpha(primaryColor, 0.5),
                          }}
                        >
                          {selectedDates.length > 0 ? (
                            selectedDates.map((date) => {
                              const isHRApproved = leaveRequests.some((req) => {
                                const reqDates = (req.leave_date || '')
                                  .split(',')
                                  .map((s) => s.trim());
                                return (
                                  reqDates.includes(date) &&
                                  String(req.status) === '2'
                                );
                              });
                              const chip = (
                                <Chip
                                  key={date}
                                  label={formatDateDisplay(date)}
                                  onDelete={
                                    isHRApproved
                                      ? undefined
                                      : () =>
                                          setSelectedDates((prev) =>
                                            prev.filter((d) => d !== date),
                                          )
                                  }
                                  sx={{
                                    bgcolor: isHRApproved
                                      ? alpha('#C62828', 0.12)
                                      : alpha('#2E7D32', 0.12),
                                    color: isHRApproved ? '#C62828' : '#2E7D32',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    height: 30,
                                    border: `1px solid ${alpha(isHRApproved ? '#C62828' : '#2E7D32', 0.25)}`,
                                  }}
                                  disabled={isHRApproved}
                                />
                              );
                              return isHRApproved ? (
                                <Tooltip
                                  key={date}
                                  title="This date is unavailable. An HR-approved leave has already been scheduled."
                                  arrow
                                >
                                  <span>{chip}</span>
                                </Tooltip>
                              ) : (
                                chip
                              );
                            })
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: '#aaa', fontStyle: 'italic' }}
                            >
                              No dates selected
                            </Typography>
                          )}
                        </Box>
                      </Grid>

                      {/* Submit button */}
                      <Grid item xs={12}>
                        <ProfessionalButton
                          onClick={handleAdd}
                          variant="contained"
                          startIcon={
                            isOverBalance ? <WarningIcon /> : <AddIcon />
                          }
                          fullWidth
                          disabled={isOverBalance || remainingDays === 0}
                          sx={{
                            py: 1.5,
                            fontSize: '1rem',
                            mt: 1,
                            backgroundColor:
                              isOverBalance || remainingDays === 0
                                ? '#ccc'
                                : accentColor,
                            color:
                              isOverBalance || remainingDays === 0
                                ? '#666'
                                : textSecondaryColor,
                            boxShadow:
                              isOverBalance || remainingDays === 0
                                ? 'none'
                                : `0 4px 14px ${alpha(accentColor, 0.35)}`,
                            '&:hover': {
                              backgroundColor:
                                isOverBalance || remainingDays === 0
                                  ? '#ccc'
                                  : accentDark,
                              boxShadow:
                                isOverBalance || remainingDays === 0
                                  ? 'none'
                                  : `0 6px 20px ${alpha(accentColor, 0.45)}`,
                            },
                            '&:disabled': {
                              backgroundColor: '#ccc !important',
                              color: '#666 !important',
                            },
                          }}
                        >
                          {remainingDays === 0
                            ? 'No Balance — Cannot Submit'
                            : isOverBalance
                              ? 'Insufficient Balance — Cannot Submit'
                              : 'Submit Leave Request'}
                        </ProfessionalButton>
                      </Grid>
                    </Grid>
                  </Box>
                </GlassCard>
              </Fade>
            </Grid>

            {/* Right: Records */}
            <Grid item xs={12} lg={6}>
              <Fade in timeout={900}>
                <GlassCard
                  sx={{
                    height: '100%',
                    border: `1px solid ${alpha(accentColor, 0.1)}`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box
                    sx={{
                      p: 4,
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
                    }}
                  >
                    {/* Row 1 — title + subtitle */}
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: alpha(accentColor, 0.12),
                          width: 40,
                          height: 40,
                          mr: 2,
                        }}
                      >
                        <ReorderIcon
                          sx={{ color: accentColor, fontSize: 22 }}
                        />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: accentColor,
                            lineHeight: 1.2,
                          }}
                        >
                          My Leave Request Records
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: accentDark, opacity: 0.8 }}
                        >
                          {filteredLeaveRequests.length} record(s) found
                        </Typography>
                      </Box>
                    </Box>

                    {/* Filters */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <FilterIcon sx={{ fontSize: 18, color: accentColor }} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: accentColor,
                            fontSize: '0.8rem',
                          }}
                        >
                          Filter:
                        </Typography>
                      </Box>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <ModernSelect
                          value={monthFilter}
                          onChange={(e) => setMonthFilter(e.target.value)}
                          displayEmpty
                          renderValue={(v) =>
                            v
                              ? months.find((m) => m.value === v)?.label
                              : 'Month'
                          }
                        >
                          {months.map((m) => (
                            <MenuItem key={m.value} value={m.value}>
                              {m.label}
                            </MenuItem>
                          ))}
                        </ModernSelect>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <ModernSelect
                          value={leaveTypeFilter}
                          onChange={(e) => setLeaveTypeFilter(e.target.value)}
                          displayEmpty
                          renderValue={(v) => v || 'Leave Type'}
                        >
                          <MenuItem value="">
                            <em>All Types</em>
                          </MenuItem>
                          {leaveTypes.map((t) => (
                            <MenuItem key={t.id} value={t.leave_code}>
                              {t.leave_code}
                            </MenuItem>
                          ))}
                        </ModernSelect>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <ModernSelect
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          displayEmpty
                          renderValue={(v) =>
                            v
                              ? statusOptions.find((s) => s.value === v)?.label
                              : 'Status'
                          }
                        >
                          {statusOptions.map((s) => (
                            <MenuItem key={s.value} value={s.value}>
                              {s.label}
                            </MenuItem>
                          ))}
                        </ModernSelect>
                      </FormControl>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 4,
                      flexGrow: 1,
                      maxHeight: 480,
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': { width: 6 },
                      '&::-webkit-scrollbar-track': {
                        background: alpha(primaryColor, 0.5),
                        borderRadius: 3,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: alpha(accentColor, 0.4),
                        borderRadius: 3,
                        '&:hover': { background: accentColor },
                      },
                    }}
                  >
                    {filteredLeaveRequests.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <EventNote
                          sx={{
                            fontSize: 56,
                            color: alpha(accentColor, 0.2),
                            mb: 2,
                          }}
                        />
                        <Typography
                          variant="h6"
                          sx={{
                            color: alpha(accentColor, 0.6),
                            fontWeight: 600,
                          }}
                        >
                          No Leave Requests Found
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: '#999', mt: 1 }}
                        >
                          {monthFilter || leaveTypeFilter || statusFilter
                            ? 'Try adjusting your filters'
                            : 'Submit your first request using the form'}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        {filteredLeaveRequests.map((leaveRequest) => {
                          const typeInfo = getLeaveTypeInfo(
                            leaveRequest.leave_description,
                          );
                          const statusInfo = getStatusInfo(leaveRequest.status);
                          const canCancel = String(leaveRequest.status) === '0';
                          const StatusIcon = statusInfo.icon;
                          return (
                            <RecordCard key={leaveRequest.id}>
                              <CardContent
                                sx={{ p: 3, '&:last-child': { pb: 3 } }}
                              >
                                <Grid container spacing={2} alignItems="center">
                                  {/* Leave type */}
                                  <Grid item xs={12} md={3}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#999',
                                        display: 'block',
                                        mb: 0.5,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontSize: '0.7rem',
                                      }}
                                    >
                                      Leave Type
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 0.25,
                                      }}
                                    >
                                      <EventNote
                                        sx={{
                                          fontSize: 16,
                                          color: accentColor,
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 700,
                                          color: accentColor,
                                        }}
                                      >
                                        {typeInfo.leave_code ||
                                          leaveRequest.leave_code}
                                      </Typography>
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#777',
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      {typeInfo.leave_description}
                                    </Typography>
                                  </Grid>

                                  {/* Leave date */}
                                  <Grid item xs={6} md={2}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#999',
                                        display: 'block',
                                        mb: 0.5,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontSize: '0.7rem',
                                      }}
                                    >
                                      Leave Date
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600, color: '#333' }}
                                    >
                                      {formatDate(leaveRequest.leave_date)}
                                    </Typography>
                                  </Grid>

                                  {/* Submitted */}
                                  <Grid item xs={6} md={3}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#999',
                                        display: 'block',
                                        mb: 0.5,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontSize: '0.7rem',
                                      }}
                                    >
                                      Submitted
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                      }}
                                    >
                                      <ScheduleIcon
                                        sx={{ fontSize: 14, color: '#aaa' }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 500,
                                          color: '#555',
                                          fontSize: '0.82rem',
                                        }}
                                      >
                                        {leaveRequest.created_at
                                          ? new Date(
                                              leaveRequest.created_at,
                                            ).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                            })
                                          : 'N/A'}
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  {/* Status + Cancel aligned in one row */}
                                  <Grid item xs={12} md={4}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#999',
                                        display: 'block',
                                        mb: 0.5,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontSize: '0.7rem',
                                      }}
                                    >
                                      Status
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 0.75,
                                          px: 1.5,
                                          py: 0.5,
                                          borderRadius: 2,
                                          bgcolor: statusInfo.bg,
                                          border: `1px solid ${alpha(statusInfo.color, 0.2)}`,
                                        }}
                                      >
                                        <StatusIcon
                                          sx={{
                                            fontSize: 14,
                                            color: statusInfo.color,
                                          }}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 600,
                                            color: statusInfo.color,
                                            fontSize: '0.78rem',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {statusInfo.label}
                                        </Typography>
                                      </Box>
                                      {canCancel && (
                                        <ProfessionalButton
                                          size="small"
                                          variant="outlined"
                                          onClick={() =>
                                            handleCancelRequest(leaveRequest.id)
                                          }
                                          sx={{
                                            color: '#C62828',
                                            borderColor: alpha('#C62828', 0.3),
                                            fontSize: '0.75rem',
                                            py: 0.5,
                                            px: 1.5,
                                            minWidth: 0,
                                            '&:hover': {
                                              backgroundColor: alpha(
                                                '#C62828',
                                                0.08,
                                              ),
                                              borderColor: '#C62828',
                                            },
                                          }}
                                        >
                                          Cancel
                                        </ProfessionalButton>
                                      )}
                                    </Box>
                                    {statusInfo.sublabel && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: '#888',
                                          display: 'block',
                                          mt: 0.25,
                                        }}
                                      >
                                        {statusInfo.sublabel}
                                      </Typography>
                                    )}
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </RecordCard>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </GlassCard>
              </Fade>
            </Grid>
          </Grid>

          {/* ── Transaction Logs Modal ── */}
          <Modal
            open={transactionLogsModalOpen}
            onClose={() => setTransactionLogsModalOpen(false)}
          >
            <Fade in={transactionLogsModalOpen}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: { xs: '92%', sm: '85%', md: 680 },
                  maxHeight: '85vh',
                  bgcolor: '#fff',
                  border: `1px solid ${alpha(accentColor, 0.15)}`,
                  boxShadow: `0 24px 64px ${alpha(accentColor, 0.25)}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* ── Modal Header ── */}
                <Box
                  sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${alpha(accentColor, 0.12)}`,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(accentColor, 0.12),
                        width: 40,
                        height: 40,
                      }}
                    >
                      <HistoryToggleOff
                        sx={{ color: accentColor, fontSize: 22 }}
                      />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: accentColor,
                          lineHeight: 1.2,
                        }}
                      >
                        Transaction Logs
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: accentDark, opacity: 0.75 }}
                      >
                        {transactionLogs.length > 0
                          ? `${transactionLogs.length} recorded action(s)`
                          : 'All activity on your leave requests'}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setTransactionLogsModalOpen(false)}
                    sx={{
                      color: accentColor,
                      '&:hover': { bgcolor: alpha(accentColor, 0.08) },
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>

                {/* ── Modal Body ── */}
                <Box
                  sx={{
                    p: 3,
                    overflowY: 'auto',
                    flexGrow: 1,
                    bgcolor: alpha(primaryColor, 0.25),
                    '&::-webkit-scrollbar': { width: 5 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                      background: alpha(accentColor, 0.25),
                      borderRadius: 3,
                    },
                  }}
                >
                  {transactionLogsLoading ? (
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      {[...Array(AUDIT_LOGS_PER_PAGE)].map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            border: `1px solid ${alpha(accentColor, 0.08)}`,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                            animation: 'lruPulse 1.6s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 1.25,
                            }}
                          >
                            <Box
                              sx={{
                                height: 20,
                                width: 90,
                                borderRadius: 1,
                                bgcolor: alpha(accentColor, 0.08),
                              }}
                            />
                            <Box
                              sx={{
                                height: 12,
                                width: 110,
                                borderRadius: 1,
                                bgcolor: alpha(accentColor, 0.05),
                              }}
                            />
                          </Box>
                          <Box
                            sx={{
                              height: 14,
                              width: '80%',
                              borderRadius: 1,
                              bgcolor: alpha(accentColor, 0.06),
                              mb: 0.75,
                            }}
                          />
                          <Box
                            sx={{
                              height: 14,
                              width: '55%',
                              borderRadius: 1,
                              bgcolor: alpha(accentColor, 0.04),
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : transactionLogsError ? (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      {transactionLogsError}
                    </Alert>
                  ) : transactionLogs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <HistoryToggleOff
                        sx={{
                          fontSize: 52,
                          color: alpha(accentColor, 0.2),
                          mb: 2,
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{ color: '#888', fontWeight: 500 }}
                      >
                        No activity yet.
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#bbb' }}>
                        Actions on your leave requests will appear here.
                      </Typography>
                    </Box>
                  ) : (
                    (() => {
                      const totalPages = Math.ceil(
                        transactionLogs.length / AUDIT_LOGS_PER_PAGE,
                      );
                      const paginated = transactionLogs.slice(
                        (auditLogPage - 1) * AUDIT_LOGS_PER_PAGE,
                        auditLogPage * AUDIT_LOGS_PER_PAGE,
                      );

                      return (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                          }}
                        >
                          {paginated.map((log) => {
                            const loggedAt =
                              log.created_at ||
                              log.createdAt ||
                              log.date_created ||
                              log.timestamp;
                            const raw = (log.message || '').trim();
                            const lower = raw.toLowerCase();
                            const actor =
                              log.actor ||
                              log.performed_by ||
                              log.action_by ||
                              null;
                            const eventType =
                              log.event_type || log.action || null;

                            /* ── Classify ── */
                            let kind = 'activity';
                            if (
                              lower.includes('hr') &&
                              lower.includes('approv')
                            )
                              kind = 'hr_approved';
                            else if (
                              (lower.includes('immediate supervisor') ||
                                lower.includes('supervisor')) &&
                              lower.includes('approv')
                            )
                              kind = 'supervisor_approved';
                            else if (lower.includes('approv'))
                              kind = 'approved';
                            else if (
                              lower.includes('reject') ||
                              lower.includes('denied') ||
                              lower.includes('deny')
                            )
                              kind = 'denied';
                            else if (lower.includes('cancel'))
                              kind = 'cancelled';
                            else if (
                              lower.includes('deleted') ||
                              lower.includes('delete') ||
                              lower.includes('removed')
                            )
                              kind = 'deleted';
                            else if (
                              lower.includes('reversed') ||
                              lower.includes('reversal') ||
                              (lower.includes('restored') &&
                                lower.includes('balance'))
                            )
                              kind = 'reversal';
                            else if (
                              lower.includes('tardiness') ||
                              (lower.includes('deducted') &&
                                lower.includes('hrs'))
                            )
                              kind = 'deduction';
                            else if (
                              lower.includes('credit') &&
                              (lower.includes('added') ||
                                lower.includes('monthly'))
                            )
                              kind = 'credit_added';
                            else if (
                              lower.includes('balance') &&
                              (lower.includes('remaining') ||
                                lower.includes('adjusted') ||
                                lower.includes('deduction'))
                            )
                              kind = 'balance_update';
                            else if (
                              lower.includes('assigned') &&
                              (lower.includes('leave') || lower.includes('hrs'))
                            )
                              kind = 'assigned';
                            else if (
                              lower.includes('submit') ||
                              lower.includes('request') ||
                              lower.includes('filed')
                            )
                              kind = 'submitted';
                            else if (lower.includes('pending'))
                              kind = 'pending';
                            if (eventType) {
                              const et = eventType.toLowerCase();
                              if (et.includes('submit')) kind = 'submitted';
                              else if (
                                et.includes('approve') &&
                                et.includes('hr')
                              )
                                kind = 'hr_approved';
                              else if (et.includes('approve'))
                                kind = 'approved';
                              else if (
                                et.includes('reject') ||
                                et.includes('den')
                              )
                                kind = 'denied';
                              else if (et.includes('cancel'))
                                kind = 'cancelled';
                            }

                            const kindMap = {
                              submitted: {
                                label: 'Submitted',
                                color: accentColor,
                                bg: alpha(accentColor, 0.08),
                                Icon: AddIcon,
                              },
                              pending: {
                                label: 'Pending',
                                color: '#F57C00',
                                bg: '#FFF8E1',
                                Icon: AccessTime,
                              },
                              supervisor_approved: {
                                label: 'Supervisor Approved',
                                color: '#1565C0',
                                bg: '#E3F2FD',
                                Icon: CheckCircle,
                              },
                              hr_approved: {
                                label: 'HR Approved',
                                color: '#2E7D32',
                                bg: '#E8F5E9',
                                Icon: CheckCircle,
                              },
                              approved: {
                                label: 'Approved',
                                color: '#2E7D32',
                                bg: '#E8F5E9',
                                Icon: CheckCircle,
                              },
                              denied: {
                                label: 'Denied',
                                color: '#C62828',
                                bg: '#FFEBEE',
                                Icon: Block,
                              },
                              cancelled: {
                                label: 'Cancelled',
                                color: '#757575',
                                bg: '#F5F5F5',
                                Icon: CancelIcon,
                              },
                              deleted: {
                                label: 'Deleted',
                                color: '#C62828',
                                bg: '#FFEBEE',
                                Icon: Block,
                              },
                              reversal: {
                                label: 'VL Reversal',
                                color: '#B71C1C',
                                bg: '#FFEBEE',
                                Icon: Block,
                              },
                              deduction: {
                                label: 'Deduction',
                                color: '#E65100',
                                bg: '#FFF3E0',
                                Icon: AccessTime,
                              },
                              credit_added: {
                                label: 'Credit Added',
                                color: '#2E7D32',
                                bg: '#E8F5E9',
                                Icon: AddIcon,
                              },
                              balance_update: {
                                label: 'Balance Update',
                                color: '#1565C0',
                                bg: '#E3F2FD',
                                Icon: WalletIcon,
                              },
                              assigned: {
                                label: 'Leave Assigned',
                                color: '#1565C0',
                                bg: '#E3F2FD',
                                Icon: AddIcon,
                              },
                              activity: {
                                label: 'Activity',
                                color: '#546E7A',
                                bg: '#ECEFF1',
                                Icon: ScheduleIcon,
                              },
                            };
                            const { label, color, bg, Icon } =
                              kindMap[kind] || kindMap.activity;

                            /* ── Privacy helper: strip "Full Name (ID)" → "employee ID" ── */
                            const stripNamesFromMessage = (text) => {
                              if (!text) return '';
                              return text.replace(
                                /[A-Z][a-zA-ZÀ-ÿ'.\-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ'.\-]+)+\s*\((\w+)\)/g,
                                (_, id) => `employee ${id}`,
                              );
                            };

                            /* Extract employee-number-only label from an actor string */
                            const safeActorLabel = (() => {
                              if (!actor) return null;
                              const idInParens = actor.match(/\((\d{5,})\)/);
                              if (idInParens)
                                return `employee ${idInParens[1]}`;
                              if (/^\d{5,}$/.test(actor.trim()))
                                return actor.trim();
                              const bareId = actor.match(/\b(\d{5,})\b/);
                              if (bareId) return `employee ${bareId[1]}`;
                              return null; // name-only actor — hide for privacy
                            })();

                            /* ── Sentence builder ── */
                            const buildSentence = () => {
                              const codeMatch = raw.match(/\b([A-Z]{2,4})\b/);
                              const leaveCode = codeMatch
                                ? codeMatch[1]
                                : 'leave';
                              const isoDate = raw.match(/\d{4}-\d{2}-\d{2}/);
                              const dateHint = isoDate
                                ? formatDate(isoDate[0])
                                : null;
                              const actorLabel = safeActorLabel
                                ? `by ${safeActorLabel}`
                                : kind === 'hr_approved'
                                  ? 'by HR'
                                  : kind === 'supervisor_approved'
                                    ? 'by your Immediate Supervisor'
                                    : '';
                              switch (kind) {
                                case 'submitted':
                                  return dateHint
                                    ? `You filed a ${leaveCode} request for ${dateHint}.`
                                    : `You submitted a ${leaveCode} leave request.`;
                                case 'supervisor_approved':
                                  return dateHint
                                    ? `Your ${leaveCode} request for ${dateHint} was approved by your Immediate Supervisor.`
                                    : `Your ${leaveCode} leave request was approved by your Immediate Supervisor.`;
                                case 'hr_approved':
                                  return dateHint
                                    ? `Your ${leaveCode} request for ${dateHint} was fully approved by HR.`
                                    : `Your ${leaveCode} leave request was fully approved by HR.`;
                                case 'approved':
                                  return `Your ${leaveCode} leave request was approved${actorLabel ? ` ${actorLabel}` : ''}.`;
                                case 'denied':
                                  return dateHint
                                    ? `Your ${leaveCode} request for ${dateHint} was denied${actorLabel ? ` ${actorLabel}` : ''}.`
                                    : `Your ${leaveCode} leave request was denied${actorLabel ? ` ${actorLabel}` : ''}.`;
                                case 'cancelled':
                                  return dateHint
                                    ? `You cancelled your ${leaveCode} request for ${dateHint}.`
                                    : `Your ${leaveCode} leave request was cancelled.`;
                                case 'deleted': {
                                  if (lower.includes('payroll'))
                                    return `A payroll record was deleted by Admin/HR. Your VL monthly credit has been reversed and your balance adjusted.`;
                                  return dateHint
                                    ? `Your ${leaveCode} record for ${dateHint} was deleted by Admin/HR.`
                                    : `A record was deleted by Admin/HR.`;
                                }
                                case 'reversal': {
                                  const creditMatch = raw.match(
                                    /\+?\s*([\d.]+)\s*hrs?\s*(has been\s*)?reversed/i,
                                  );
                                  const fromMatch = raw.match(
                                    /from\s+([\d.]+)\s*hrs?/i,
                                  );
                                  const toMatch =
                                    raw.match(/to\s+([\d.]+)\s*hrs?/i);
                                  const creditAmt = creditMatch
                                    ? creditMatch[1]
                                    : null;
                                  if (creditAmt && fromMatch && toMatch)
                                    return `VL credit of \u221210 hrs reversed. VL balance restored from ${fromMatch[1]} to ${toMatch[1]} hrs.`.replace(
                                      '10',
                                      creditAmt,
                                    );
                                  if (fromMatch && toMatch)
                                    return `VL balance restored from ${fromMatch[1]} to ${toMatch[1]} hrs.`;
                                  return `Your VL credit was reversed as a result of a payroll record deletion.`;
                                }
                                case 'deduction': {
                                  const hrsMatch =
                                    raw.match(/([\d.]+)\s*hrs?/i);
                                  if (lower.includes('tardiness'))
                                    return `Tardiness deduction of ${hrsMatch ? hrsMatch[1] : ''} hrs applied to your VL balance.`;
                                  return `A deduction was applied to your leave balance.`;
                                }
                                case 'credit_added': {
                                  const addHrs =
                                    raw.match(/\+([\d.]+)\s*hrs?/i);
                                  const fromHrs = raw.match(
                                    /from\s+([\d.]+)\s*hrs?/i,
                                  );
                                  const toHrs =
                                    raw.match(/to\s+([\d.]+)\s*hrs?/i);
                                  if (fromHrs && toHrs)
                                    return `Monthly VL credit of +${addHrs ? addHrs[1] : ''} hrs added. Balance updated from ${fromHrs[1]} hrs to ${toHrs[1]} hrs.`;
                                  return `Monthly VL credit${addHrs ? ` of +${addHrs[1]} hrs` : ''} was added to your balance.`;
                                }
                                case 'balance_update': {
                                  const remMatch = raw.match(
                                    /([\d.]+)\s*hrs?\s*remaining/i,
                                  );
                                  if (remMatch)
                                    return `Your VL balance after deduction is ${remMatch[1]} hrs.`;
                                  return `Your leave balance has been updated.`;
                                }
                                case 'pending':
                                  return `Your ${leaveCode} leave request is pending approval.`;
                                case 'assigned': {
                                  const assignMatch = raw.match(
                                    /assigned\s+(.+?)\s*\(/i,
                                  );
                                  const leaveTypeName = assignMatch
                                    ? assignMatch[1].trim()
                                    : leaveCode;
                                  const assignerIdMatch =
                                    raw.match(/\((\d{5,})\)/);
                                  const assignerId = assignerIdMatch
                                    ? assignerIdMatch[1]
                                    : safeActorLabel || 'HR';
                                  return `${leaveTypeName} was credited to your account by employee ${assignerId}.`;
                                }
                                default: {
                                  const sanitized = stripNamesFromMessage(raw);
                                  return (
                                    sanitized.charAt(0).toUpperCase() +
                                    sanitized.slice(1) +
                                    (sanitized.endsWith('.') ? '' : '.')
                                  );
                                }
                              }
                            };

                            /* ── Timestamp ── */
                            const timeLabel = (() => {
                              if (!loggedAt) return null;
                              const d = new Date(loggedAt);
                              return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                            })();

                            return (
                              <Box
                                key={`log-${log.id}`}
                                sx={{
                                  bgcolor: '#fff',
                                  border: `1px solid ${alpha(color, 0.18)}`,
                                  borderLeft: `4px solid ${color}`,
                                  borderRadius: 2,
                                  p: 2.5,
                                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                                  transition: 'box-shadow 0.2s ease',
                                  '&:hover': {
                                    boxShadow: `0 4px 16px ${alpha(color, 0.12)}`,
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1,
                                    flexWrap: 'wrap',
                                    gap: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.6,
                                      px: 1.25,
                                      py: 0.35,
                                      borderRadius: '6px',
                                      bgcolor: bg,
                                      border: `1px solid ${alpha(color, 0.2)}`,
                                    }}
                                  >
                                    <Icon sx={{ fontSize: 13, color }} />
                                    <Typography
                                      sx={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color,
                                        lineHeight: 1,
                                      }}
                                    >
                                      {label}
                                    </Typography>
                                  </Box>
                                  {timeLabel && (
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                      }}
                                    >
                                      <ScheduleIcon
                                        sx={{ fontSize: 12, color: '#c0c0c0' }}
                                      />
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: '#b0b0b0',
                                          fontSize: '0.72rem',
                                        }}
                                      >
                                        {timeLabel}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: '0.88rem',
                                    color: '#2c2c2c',
                                    lineHeight: 1.65,
                                    fontWeight: 400,
                                  }}
                                >
                                  {buildSentence()}
                                </Typography>
                                {safeActorLabel && (
                                  <Box
                                    sx={{
                                      mt: 0.75,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                    }}
                                  >
                                    <PersonIcon
                                      sx={{ fontSize: 13, color: '#bbb' }}
                                    />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: '#aaa',
                                        fontSize: '0.72rem',
                                      }}
                                    >
                                      Action by: {safeActorLabel}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}

                          {/* ── Pagination ── */}
                          {totalPages > 1 && (
                            <Box
                              sx={{
                                mt: 1,
                                pt: 2,
                                borderTop: `1px solid ${alpha(accentColor, 0.1)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              {/* Page info */}
                              <Typography
                                variant="caption"
                                sx={{ color: '#aaa', fontSize: '0.75rem' }}
                              >
                                Showing{' '}
                                {(auditLogPage - 1) * AUDIT_LOGS_PER_PAGE + 1}–
                                {Math.min(
                                  auditLogPage * AUDIT_LOGS_PER_PAGE,
                                  transactionLogs.length,
                                )}{' '}
                                of {transactionLogs.length}
                              </Typography>

                              {/* Page buttons */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                {/* Prev */}
                                <IconButton
                                  size="small"
                                  disabled={auditLogPage === 1}
                                  onClick={() => setAuditLogPage((p) => p - 1)}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '8px',
                                    border: `1px solid ${alpha(accentColor, auditLogPage === 1 ? 0.1 : 0.25)}`,
                                    color:
                                      auditLogPage === 1 ? '#ccc' : accentColor,
                                    '&:hover': {
                                      bgcolor: alpha(accentColor, 0.06),
                                    },
                                  }}
                                >
                                  <Box
                                    component="span"
                                    sx={{
                                      fontSize: '1rem',
                                      lineHeight: 1,
                                      fontWeight: 600,
                                    }}
                                  >
                                    ‹
                                  </Box>
                                </IconButton>

                                {/* Numbered pages */}
                                {Array.from(
                                  { length: totalPages },
                                  (_, i) => i + 1,
                                ).map((page) => (
                                  <IconButton
                                    key={page}
                                    size="small"
                                    onClick={() => setAuditLogPage(page)}
                                    sx={{
                                      width: 30,
                                      height: 30,
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight:
                                        page === auditLogPage ? 700 : 400,
                                      bgcolor:
                                        page === auditLogPage
                                          ? accentColor
                                          : 'transparent',
                                      color:
                                        page === auditLogPage ? '#fff' : '#666',
                                      border: `1px solid ${page === auditLogPage ? accentColor : alpha(accentColor, 0.15)}`,
                                      '&:hover': {
                                        bgcolor:
                                          page === auditLogPage
                                            ? accentColor
                                            : alpha(accentColor, 0.06),
                                      },
                                    }}
                                  >
                                    {page}
                                  </IconButton>
                                ))}

                                {/* Next */}
                                <IconButton
                                  size="small"
                                  disabled={auditLogPage === totalPages}
                                  onClick={() => setAuditLogPage((p) => p + 1)}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '8px',
                                    border: `1px solid ${alpha(accentColor, auditLogPage === totalPages ? 0.1 : 0.25)}`,
                                    color:
                                      auditLogPage === totalPages
                                        ? '#ccc'
                                        : accentColor,
                                    '&:hover': {
                                      bgcolor: alpha(accentColor, 0.06),
                                    },
                                  }}
                                >
                                  <Box
                                    component="span"
                                    sx={{
                                      fontSize: '1rem',
                                      lineHeight: 1,
                                      fontWeight: 600,
                                    }}
                                  >
                                    ›
                                  </Box>
                                </IconButton>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      );
                    })()
                  )}
                </Box>
              </Box>
            </Fade>
          </Modal>

          {/* Scroll to Top FAB */}
          <Fade in={showScrollTop}>
            <Box
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: accentColor,
                color: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${alpha(accentColor, 0.4)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: accentDark,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.5)}`,
                },
              }}
            >
              <KeyboardArrowUp />
            </Box>
          </Fade>
        </Box>
      </Box>
    </Fade>
  );
};

export default LeaveRequestUser;
