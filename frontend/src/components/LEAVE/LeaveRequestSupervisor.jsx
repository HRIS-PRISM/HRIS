/**
 * SupervisorLeaveApproval.jsx
 * Supervisor-facing dashboard — view and approve/deny leave requests
 * for employees within the supervisor's assigned department(s).
 */

import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Grid, Modal, IconButton, CircularProgress, Card, Typography,
  Fade, Avatar, Tooltip, Button, TextField, Chip, Slide,
  ToggleButton, ToggleButtonGroup, FormControl, Select, MenuItem,
  TablePagination, Checkbox, Alert, Divider,
} from '@mui/material';
import {
  Close, EventNote, Search as SearchIcon, Refresh,
  Person as PersonIcon, CalendarMonth, CheckCircle,
  Cancel as CancelIcon, AccessTime, Block, Domain as DomainIcon,
  CheckBox as CheckBoxIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  ViewList as ViewListIcon, ViewModule as ViewModuleIcon,
  DoneAll as DoneAllIcon, ThumbDown as ThumbDownIcon,
  HistoryToggleOff, Schedule as ScheduleIcon,
  SupervisorAccount as SupervisorIcon, Lock as LockIcon,
  Badge as BadgeIcon, Group as GroupIcon, HelpOutline as HelpOutlineIcon,
  ErrorOutline as ErrorOutlineIcon, Warning as WarningIcon,
  NavigateBefore, NavigateNext,
  ManageSearch as ManageSearchIcon, FilterAlt as FilterAltIcon,
  OpenInFull as OpenInFullIcon, FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useSocket } from '../../contexts/SocketContext';
import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import usePageAccess from '../../hooks/usePageAccess';
import { normalizeRole } from '../../utils/pageAccessUtils';
import { getUserInfo } from '../../utils/auth';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

const getSupervisorEmployeeNumber = () => {
  const fromToken = getUserInfo()?.employeeNumber;
  const fromStorage = localStorage.getItem('employeeNumber');
  const resolved = fromToken || fromStorage;
  return resolved ? String(resolved).trim() : null;
};

const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ? String(payload.role) : null;
  } catch { return null; }
};

// ── Theme ──────────────────────────────────────────────────────────────────────
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

const TX_PER_PAGE = 5;

const allStatusOptions = [
  { value: '0', label: 'Pending Review',                 short: 'Pending',     color: '#F57C00', bg: '#FFF3E0', icon: AccessTime  },
  { value: '1', label: 'Immediate Supervisor Approved',   short: 'Supervisor',  color: '#1565C0', bg: '#E3F2FD', icon: CheckCircle },
  { value: '2', label: 'HR Approved',                     short: 'HR Approved', color: '#2E7D32', bg: '#E8F5E9', icon: CheckCircle },
  { value: '3', label: 'Denied',                          short: 'Denied',      color: '#C62828', bg: '#FFEBEE', icon: Block       },
  { value: '4', label: 'Cancelled',                       short: 'Cancelled',   color: '#757575', bg: '#F5F5F5', icon: CancelIcon  },
];

// ── Shimmer / Wireframe ────────────────────────────────────────────────────────
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
      width: w,
      ...sx,
    }}
  />
);

const Wireframe = () => (
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
      {/* Page Header skeleton */}
      <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.06)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Bone w={240} h={18} sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                <Bone w={280} h={11} />
                <Box sx={{ width: 80, height: 20, borderRadius: 6, bgcolor: 'rgba(109,35,35,0.08)', border: `1px solid ${T.accentBorder}` }} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ width: 90, height: 30, borderRadius: 6, bgcolor: 'rgba(245,124,0,0.1)', border: '1px solid rgba(245,124,0,0.25)' }} />
            <Box sx={{ width: 90, height: 30, borderRadius: 6, bgcolor: 'rgba(109,35,35,0.08)', border: `1px solid ${T.accentBorder}` }} />
            <Box sx={{ width: 130, height: 34, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.12)' }} />
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)' }} />
          </Box>
        </Box>
      </Box>

      {/* Department chips skeleton */}
      <Box sx={{ mb: 1.5, display: 'flex', gap: 0.75 }}>
        {[80, 110, 95].map((w, i) => (
          <Box key={i} sx={{ width: w, height: 28, borderRadius: 6, bgcolor: 'rgba(109,35,35,0.06)', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          {/* Records card skeleton */}
          <Box sx={{ borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: 'blink 2s ease-in-out 0.05s infinite', height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar skeleton */}
            <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 17, height: 17, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.2)' }} />
                  <Bone w={200} h={13} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 80, height: 28, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${T.accentBorder}` }} />
                  <Box sx={{ width: 60, height: 28, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff' }} />
                </Box>
              </Box>
              {/* Search bar skeleton */}
              <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', mb: 1.5 }} />
              {/* Status filter pills skeleton */}
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {[80, 90, 95, 100, 85].map((w, i) => (
                  <Box key={i} sx={{ flex: 1, height: 30, borderRadius: 1.5, bgcolor: i === 0 ? 'rgba(109,35,35,0.15)' : 'transparent', border: `1.5px solid ${i === 0 ? T.accent : T.accentBorder}` }} />
                ))}
              </Box>
            </Box>

            {/* Card grid skeleton */}
            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
              <Grid container spacing={1.5}>
                {[...Array(8)].map((_, i) => (
                  <Grid item xs={12} sm={4} md={3} key={i} sx={{ display: 'flex' }}>
                    <Box sx={{ width: '100%', p: 2, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 0.75, animation: 'blink 2s ease-in-out infinite', animationDelay: `${i * 0.07}s` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.1)' }} />
                        <Bone w={60} h={9} />
                        <Box sx={{ ml: 'auto', width: 50, height: 18, borderRadius: 1, bgcolor: 'rgba(109,35,35,0.06)', border: `0.5px solid ${T.accentBorder}` }} />
                      </Box>
                      <Bone w="75%" h={12} sx={{ mb: 0.25 }} />
                      <Bone w="90%" h={10} sx={{ mb: 0.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Bone w={80} h={9} />
                        <Box sx={{ width: 65, height: 20, borderRadius: '4px', bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.25)' }} />
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ── Styled ─────────────────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8, textTransform: 'none', fontWeight: 600,
  fontSize: '0.875rem', letterSpacing: '0.01em', transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const StatusPill = ({ status }) => {
  const opt  = allStatusOptions.find((o) => o.value === String(status)) || allStatusOptions[0];
  const Icon = opt.icon;
  return (
    <Chip size="small" icon={<Icon style={{ fontSize: 11, color: opt.color }} />} label={opt.short}
      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: opt.bg, color: opt.color, border: `1px solid ${alpha(opt.color, 0.25)}`, borderRadius: '4px', '& .MuiChip-icon': { ml: '4px' } }} />
  );
};

const RoleBadge = ({ role }) => {
  const label = (role || 'Supervisor').trim() || 'Supervisor';
  const cfg = { Dean: { color: '#6d2323', bg: 'rgba(109,35,35,0.08)' }, 'Department Head': { color: '#1B5E20', bg: 'rgba(27,94,32,0.08)' }, Supervisor: { color: '#1565C0', bg: 'rgba(21,101,192,0.08)' } };
  const c   = cfg[label] || { color: '#5D4037', bg: 'rgba(93,64,55,0.08)' };
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.3, borderRadius: 6, bgcolor: c.bg }}>
      <BadgeIcon sx={{ fontSize: 11, color: c.color }} />
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: c.color }}>{label}</Typography>
    </Box>
  );
};

// ── Confirm Modal ──────────────────────────────────────────────────────────────
const ConfirmModal = ({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm',
  confirmColor = T.accent, confirmHoverColor = T.accentDark,
  icon: Icon = HelpOutlineIcon, iconColor = T.accent, iconBg = T.accentFaint,
  loading = false,
}) => (
  <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 1400 }}>
    <Fade in={open}>
      <Box sx={{ width: '100%', maxWidth: 420, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', bgcolor: T.surface, display: 'flex', flexDirection: 'column' }}>
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
          <AccentButton onClick={onClose} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
            Cancel
          </AccentButton>
          <AccentButton onClick={onConfirm} variant="contained" disabled={loading}
            startIcon={loading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : null}
            sx={{ fontSize: '0.8rem', bgcolor: confirmColor, color: '#fff', boxShadow: `0 2px 10px ${alpha(confirmColor, 0.32)}`, '&:hover': { bgcolor: confirmHoverColor }, '&:disabled': { bgcolor: '#ddd' } }}>
            {loading ? 'Processing…' : confirmLabel}
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ── Detail Modal ───────────────────────────────────────────────────────────────
const DetailModal = ({ open, onClose, request, supervisorCtx, onAction, actionLoading }) => {
  const [denialReason, setDenialReason] = useState('');
  const [showDenial,   setShowDenial]   = useState(false);

  useEffect(() => { if (!open) { setDenialReason(''); setShowDenial(false); } }, [open]);

  if (!request) return null;

  const isLocked    = ['1', '2', '3', '4'].includes(String(request.status));
  const isPending   = String(request.status) === '0';
  const leaveDates  = Array.isArray(request.leave_date)
    ? request.leave_date
    : String(request.leave_date || '').split(',').map((s) => s.trim()).filter(Boolean);
  const formatDate  = (s) => { const [y, m, d] = s.split('-'); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  const currentOpt  = allStatusOptions.find((o) => o.value === String(request.status)) || allStatusOptions[0];
  const CurrentIcon = currentOpt.icon;

  return (
    <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Fade in={open}>
        <Box sx={{ width: '100%', maxWidth: 560, maxHeight: '92vh', borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', bgcolor: T.surface, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EventNote sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }}>Leave Request Details</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>#{request.employeeNumber} • {request.employeeName || '—'}</Typography>
                  <Chip size="small" icon={<CurrentIcon style={{ fontSize: 10, color: currentOpt.color }} />} label={currentOpt.short}
                    sx={{ height: 16, fontSize: '0.62rem', bgcolor: alpha(currentOpt.color, 0.15), color: '#fff', fontWeight: 600 }} />
                </Box>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)' }}><Close sx={{ fontSize: 17 }} /></IconButton>
          </Box>

          {/* Body */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2, ...scrollbarSx }}>
            {/* Info grid */}
            <Grid container spacing={1.5}>
              <Grid item xs={12}>
                <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mb: 0.5 }}>Employee</Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.accent }}>#{request.employeeNumber}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: T.text }}>{request.employeeName || '—'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mb: 0.5 }}>Leave Type</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ px: 0.85, py: 0.2, borderRadius: 1, bgcolor: 'rgba(109,35,35,0.08)', border: `0.5px solid ${T.accentBorder}` }}>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.accent }}>{request.leave_code}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text }}>{request.leave_description || request.leave_code}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mb: 0.5 }}>Duration</Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>{leaveDates.length} day(s)</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mb: 0.75 }}>Leave date(s)</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                    {leaveDates.map((d) => (
                      <Box key={d} sx={{ px: 1, py: 0.35, borderRadius: 1, bgcolor: 'rgba(109,35,35,0.08)', border: `0.5px solid ${T.accentBorder}` }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.accent }}>{formatDate(d)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mb: 0.5 }}>Department</Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text }}>{request.departmentCode || '—'}</Typography>
                  {request.departmentDescription && <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>{request.departmentDescription}</Typography>}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.7rem', color: T.muted, mb: 0.5 }}>Filed on</Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text }}>
                    {request.created_at ? new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: T.divider }} />

            {/* Status section */}
            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: alpha(T.accent, 0.55), textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>Current Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2, bgcolor: alpha(currentOpt.color, 0.06), border: `1px solid ${alpha(currentOpt.color, 0.2)}` }}>
                <CurrentIcon sx={{ fontSize: 20, color: currentOpt.color }} />
                <Box>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: currentOpt.color }}>{currentOpt.label}</Typography>
                  {isLocked && !isPending && (
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                      {String(request.status) === '1' ? 'Awaiting final HR approval.' : String(request.status) === '2' ? 'Fully approved by HR.' : 'No further actions available.'}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Supervisor action note */}
            {supervisorCtx && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(45,90,142,0.04)', border: `1px solid ${T.accentBorder}` }}>
                <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                  Acting as <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{supervisorCtx.departments[0]?.role || 'Supervisor'}</Box> for{' '}
                  {supervisorCtx.departments.map((d) => d.description || d.code).join(', ')}
                </Typography>
              </Box>
            )}

            {/* Denial reason input */}
            {isPending && showDenial && (
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#C62828', mb: 0.75 }}>
                  Reason for Denial <Box component="span" sx={{ color: T.faint, fontWeight: 400 }}>(optional)</Box>
                </Typography>
                <FieldInput fullWidth multiline minRows={2} size="small"
                  value={denialReason} onChange={(e) => setDenialReason(e.target.value)}
                  placeholder="Provide a reason for denying this request…" />
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
            <AccentButton onClick={onClose} variant="outlined" sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { transform: 'none' } }}>Close</AccentButton>
            {isPending && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {showDenial ? (
                  <>
                    <AccentButton onClick={() => setShowDenial(false)} variant="outlined"
                      sx={{ fontSize: '0.8rem', borderColor: T.accentBorder, color: T.muted, '&:hover': { transform: 'none' } }}>
                      Back
                    </AccentButton>
                    <AccentButton onClick={() => onAction(request, 3, denialReason)} variant="contained" disabled={actionLoading}
                      startIcon={actionLoading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <ThumbDownIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{ fontSize: '0.8rem', bgcolor: '#C62828', color: '#fff', '&:hover': { bgcolor: '#b71c1c' }, '&:disabled': { bgcolor: '#ddd' } }}>
                      Confirm Denial
                    </AccentButton>
                  </>
                ) : (
                  <>
                    <AccentButton onClick={() => setShowDenial(true)} variant="outlined" disabled={actionLoading}
                      startIcon={<ThumbDownIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{ fontSize: '0.8rem', borderColor: '#e57373', color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.06)', borderColor: '#c62828', transform: 'none' } }}>
                      Deny
                    </AccentButton>
                    <AccentButton onClick={() => onAction(request, 1, '')} variant="contained" disabled={actionLoading}
                      startIcon={actionLoading ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <CheckCircle sx={{ fontSize: '14px !important' }} />}
                      sx={{ fontSize: '0.8rem', bgcolor: '#1565C0', color: '#fff', boxShadow: `0 2px 10px ${alpha('#1565C0', 0.32)}`, '&:hover': { bgcolor: '#0D47A1' }, '&:disabled': { bgcolor: '#ddd' } }}>
                      Approve
                    </AccentButton>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

// ── Transaction log helpers ────────────────────────────────────────────────────
const getLogTimeLabel = (log) => {
  const loggedAt = log.created_at || log.createdAt || log.timestamp;
  if (!loggedAt) return null;
  const d = new Date(loggedAt);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const getTxKind = (log) => {
  const m = (log.message || '').toLowerCase();
  if (m.includes('bulk')) return 'bulk';
  if (m.includes('denied') || m.includes('deny') || m.includes('reject')) return 'denied';
  if (m.includes('cancel')) return 'cancelled';
  if (m.includes('hr') && m.includes('approv')) return 'hr_approved';
  if ((m.includes('supervisor') || m.includes('immediate')) && m.includes('approv')) return 'supervisor_approved';
  if (m.includes('approv')) return 'approved';
  if (m.includes('submit') || m.includes('request') || m.includes('filed')) return 'submitted';
  if (m.includes('pending')) return 'pending';
  return 'activity';
};

const kindMap = {
  submitted:           { label: 'Submitted',          color: T.accent,  bg: T.accentFaint, Icon: EventNote    },
  pending:             { label: 'Pending',             color: '#F57C00', bg: '#FFF8E1',     Icon: AccessTime   },
  supervisor_approved: { label: 'Supervisor Approved', color: '#1565C0', bg: '#E3F2FD',     Icon: CheckCircle  },
  hr_approved:         { label: 'HR Approved',         color: '#2E7D32', bg: '#E8F5E9',     Icon: CheckCircle  },
  approved:            { label: 'Approved',            color: '#2E7D32', bg: '#E8F5E9',     Icon: CheckCircle  },
  denied:              { label: 'Denied',              color: '#C62828', bg: '#FFEBEE',     Icon: Block        },
  cancelled:           { label: 'Cancelled',           color: '#757575', bg: '#F5F5F5',     Icon: CancelIcon   },
  bulk:                { label: 'Bulk Action',         color: '#E65100', bg: '#FFF3E0',     Icon: DoneAllIcon  },
  activity:            { label: 'Activity',            color: '#546E7A', bg: '#ECEFF1',     Icon: ScheduleIcon },
};

const buildTxSentence = (log) => {
  const raw = (log.message || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1) + (raw.endsWith('.') ? '' : '.');
};

const renderTxSentence = (log) => {
  const sentence = buildTxSentence(log);
  const empName  = log.employeeName || null;
  const empNum   = log.employeeNumber || log.employee_id || null;
  const candidates = [];
  if (empName) candidates.push(empName);
  if (empNum) { candidates.push(`#${empNum}`); candidates.push(String(empNum)); }
  const found = candidates.filter((term) => sentence.includes(term)).sort((a, b) => sentence.indexOf(a) - sentence.indexOf(b));

  if (!found.length) {
    return <Typography sx={{ fontSize: '0.86rem', fontWeight: 400, color: T.text, lineHeight: 1.6 }}>{sentence}</Typography>;
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
    <Typography component="p" sx={{ fontSize: '0.86rem', color: T.text, lineHeight: 1.6, m: 0 }}>
      {segments.map((seg, i) =>
        seg.bold
          ? <Box key={i} component="span" sx={{ fontWeight: 900, color: T.text }}>{seg.text}</Box>
          : <Box key={i} component="span" sx={{ fontWeight: 400 }}>{seg.text}</Box>
      )}
    </Typography>
  );
};

// ── Transaction Logs Surface (panel or modal) ──────────────────────────────────
const TransactionLogsSurface = ({
  variant, logs, totalCount, filteredTotal, loading, error,
  auditPage, setAuditPage,
  searchTerm, setSearchTerm, actionFilter, setActionFilter,
  deptFilter, setDeptFilter, deptOptions,
  onClose, onOpenModal, onExpandPanel,
}) => {
  const isPanel    = variant === 'panel';
  const totalPages = Math.max(1, Math.ceil(Math.max(filteredTotal, 0) / TX_PER_PAGE));
  const paginated  = logs.slice((auditPage - 1) * TX_PER_PAGE, auditPage * TX_PER_PAGE);

  return (
    <SectionCard sx={isPanel ? { height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' } : { width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', flexShrink: 0, gap: 2 }}>
        <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1, minWidth: 0 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HistoryToggleOff sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2, mb: 0.3 }} noWrap>Department Transaction Logs</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
              {filteredTotal > 0 ? `${filteredTotal} of ${totalCount} recorded action(s)` : 'All activity on department leave requests'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', position: 'relative', zIndex: 1, justifyContent: 'flex-end' }}>
          {isPanel ? (
            <AccentButton onClick={onOpenModal} variant="outlined" startIcon={<OpenInFullIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.76rem', color: '#fff', borderColor: 'rgba(255,255,255,0.24)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.35)', transform: 'none' } }}>
              Compact modal
            </AccentButton>
          ) : (
            <AccentButton onClick={onExpandPanel} variant="outlined" startIcon={<OpenInFullIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.76rem', color: '#fff', borderColor: 'rgba(255,255,255,0.24)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.35)', transform: 'none' } }}>
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
              <FieldInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search employee, action, or department…" size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { pl: 1.5 } }} />
            </Box>
            <AccentButton onClick={() => setSearchTerm('')} variant="outlined" startIcon={<FilterAltIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.74rem', color: T.accent, borderColor: T.accentBorder, bgcolor: '#fff', '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}>
              Clear
            </AccentButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {[{ label: 'All actions', value: 'all' }, { label: 'Submitted', value: 'submitted' }, { label: 'Supervisor', value: 'supervisor_approved' }, { label: 'HR approved', value: 'hr_approved' }, { label: 'Denied', value: 'denied' }, { label: 'Cancelled', value: 'cancelled' }, { label: 'Bulk', value: 'bulk' }].map((opt) => (
              <Box key={opt.value} onClick={() => setActionFilter(opt.value)}
                sx={{ px: 1.35, py: 0.45, borderRadius: 999, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${actionFilter === opt.value ? T.accent : T.accentBorder}`, color: actionFilter === opt.value ? '#fff' : T.accent, bgcolor: actionFilter === opt.value ? T.accent : '#fff', transition: 'all 0.15s ease', '&:hover': { bgcolor: actionFilter === opt.value ? T.accentDark : T.accentFaint } }}>
                {opt.label}
              </Box>
            ))}
          </Box>
          {deptOptions?.length > 1 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Box onClick={() => setDeptFilter('all')}
                sx={{ px: 1.35, py: 0.45, borderRadius: 999, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${deptFilter === 'all' ? T.accent : T.accentBorder}`, color: deptFilter === 'all' ? '#fff' : T.accent, bgcolor: deptFilter === 'all' ? T.accent : '#fff', transition: 'all 0.15s ease', '&:hover': { bgcolor: deptFilter === 'all' ? T.accentDark : T.accentFaint } }}>
                All departments
              </Box>
              {deptOptions.map((d) => (
                <Box key={d.code} onClick={() => setDeptFilter(d.code)}
                  sx={{ px: 1.35, py: 0.45, borderRadius: 999, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${deptFilter === d.code ? T.accent : T.accentBorder}`, color: deptFilter === d.code ? '#fff' : T.accent, bgcolor: deptFilter === d.code ? T.accent : '#fff', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { bgcolor: deptFilter === d.code ? T.accentDark : T.accentFaint } }}>
                  <DomainIcon sx={{ fontSize: 11 }} />{d.description || d.code}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ px: 3, py: 2.5, overflowY: 'auto', flexGrow: 1, bgcolor: T.accentFaint, ...scrollbarSx }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[...Array(TX_PER_PAGE)].map((_, i) => (
              <Box key={i} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${T.accentBorder}`, animation: 'blink 1.6s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}>
                <Bone w={90} h={16} sx={{ mb: 1 }} /><Bone w="80%" h={12} sx={{ mb: 0.75 }} /><Bone w="55%" h={12} />
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
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>{totalCount === 0 ? 'No activity yet.' : 'No logs match your filters.'}</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>{totalCount === 0 ? 'Actions on department leave requests will appear here.' : 'Try a different search or filter.'}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {paginated.map((log) => {
              const kind = getTxKind(log);
              const { label, color, bg, Icon } = kindMap[kind] || kindMap.activity;
              const timeLabel = getLogTimeLabel(log);
              const empNum    = log.employeeNumber || log.employee_id;
              const empName   = log.employeeName;
              return (
                <Box key={`log-${log.id}`}
                  sx={{ bgcolor: '#fff', borderRadius: 2, p: 2.5, border: `1px solid ${T.accentBorder}`, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', '&:hover': { boxShadow: `0 4px 12px ${alpha(color, 0.12)}` } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.35, borderRadius: '6px', bgcolor: bg, border: `1px solid ${alpha(color, 0.2)}` }}>
                      <Icon sx={{ fontSize: 12, color }} /><Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color, lineHeight: 1 }}>{label}</Typography>
                    </Box>
                    {timeLabel && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 11, color: T.faint }} /><Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{timeLabel}</Typography>
                      </Box>
                    )}
                  </Box>
                  {(empNum || log.departmentCode) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                      {log.departmentCode && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.1, py: 0.32, borderRadius: '6px', bgcolor: alpha(T.accent, 0.05), border: `1px solid ${T.accentBorder}` }}>
                          <DomainIcon sx={{ fontSize: 11, color: T.accent }} />
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.accent, lineHeight: 1 }}>{log.departmentCode}</Typography>
                        </Box>
                      )}
                      {empNum && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.5, bgcolor: alpha('#1565C0', 0.05), borderRadius: 1.5, border: '1px solid rgba(21,101,192,0.15)' }}>
                          <PersonIcon sx={{ fontSize: 14, color: '#1565C0', flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1565C0', lineHeight: 1 }}>
                            {empNum} {empName && '| '}{empName && empName.toUpperCase()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                  {renderTxSentence(log)}
                </Box>
              );
            })}
            {totalPages > 1 && (
              <Box sx={{ mt: 1, pt: 2, borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                <IconButton size="small" disabled={auditPage === 1} onClick={() => setAuditPage((p) => p - 1)}
                  sx={{ width: 32, height: 32, borderRadius: 1.5, border: `1px solid ${auditPage === 1 ? T.divider : T.accentBorder}`, color: auditPage === 1 ? T.faint : T.accent }}>
                  <NavigateBefore sx={{ fontSize: 16 }} />
                </IconButton>
                <Box sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent, px: 1.25, py: 0.45, borderRadius: 1.5, bgcolor: '#fff', border: `1px solid ${T.accentBorder}` }}>
                  Page {auditPage} of {totalPages}
                </Box>
                <IconButton size="small" disabled={auditPage === totalPages} onClick={() => setAuditPage((p) => p + 1)}
                  sx={{ width: 32, height: 32, borderRadius: 1.5, border: `1px solid ${auditPage === totalPages ? T.divider : T.accentBorder}`, color: auditPage === totalPages ? T.faint : T.accent }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SupervisorLeaveApproval = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess('leave-request-supervisor');
  const { socket, connected } = useSocket();
  const refreshRef            = useRef(null);

  const supervisorEmpNum = getSupervisorEmployeeNumber();
  const userRole = getUserRole();

  const [supervisorCtx,   setSupervisorCtx]   = useState(null);
  const [ctxLoading,      setCtxLoading]       = useState(true);
  const [requests,        setRequests]         = useState([]);
  const [loading,         setLoading]          = useState(true);
  const [actionLoading,   setActionLoading]    = useState(false);
  const [searchTerm,      setSearchTerm]       = useState('');
  const [statusFilter,    setStatusFilter]     = useState('all');
  const [deptFilter,      setDeptFilter]       = useState('all');
  const [viewMode,        setViewMode]         = useState('grid');
  const [viewRequest,     setViewRequest]      = useState(null);
  const [page,            setPage]             = useState(0);
  const [rowsPerPage,     setRowsPerPage]      = useState(12);
  const [selectMode,      setSelectMode]       = useState(false);
  const [selectedIds,     setSelectedIds]      = useState([]);
  const [bulkLoading,     setBulkLoading]      = useState(false);
  const [successOpen,     setSuccessOpen]      = useState(false);
  const [successAction,   setSuccessAction]    = useState('status');

  const [txModalOpen,     setTxModalOpen]      = useState(false);
  const [txPanelOpen,     setTxPanelOpen]      = useState(false);
  const [txLogs,          setTxLogs]           = useState([]);
  const [txLoading,       setTxLoading]        = useState(false);
  const [txError,         setTxError]          = useState('');
  const [txSearchTerm,    setTxSearchTerm]     = useState('');
  const [txActionFilter,  setTxActionFilter]   = useState('all');
  const [txDeptFilter,    setTxDeptFilter]     = useState('all');
  const [txPage,          setTxPage]           = useState(1);

  const [confirmModal,    setConfirmModal]     = useState({
    open: false, title: '', message: '', confirmLabel: 'Confirm',
    confirmColor: T.accent, confirmHoverColor: T.accentDark,
    icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint,
    loading: false, onConfirm: () => {},
  });

  const showConfirm  = (opts) => setConfirmModal({
    open: true, title: '', message: '', confirmLabel: 'Confirm',
    confirmColor: T.accent, confirmHoverColor: T.accentDark,
    icon: HelpOutlineIcon, iconColor: T.accent, iconBg: T.accentFaint,
    loading: false, onConfirm: () => {}, ...opts,
  });
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, open: false, loading: false }));

  const fetchContext = useCallback(async () => {
    setCtxLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/api/supervisor-leave/context/me`, getAuthHeaders());
      const data = r.data || { isSupervisor: false, departments: [] };
      setSupervisorCtx(data);
      return data;
    } catch {
      setSupervisorCtx({ isSupervisor: false, departments: [] });
      return null;
    } finally {
      setCtxLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (deptFilter   !== 'all') params.set('departmentCode', deptFilter);
      const r = await axios.get(`${API_BASE_URL}/api/supervisor-leave/requests/me?${params.toString()}`, getAuthHeaders());
      setRequests(Array.isArray(r.data) ? r.data : []);
    } catch { setRequests([]); } finally { setLoading(false); }
  }, [statusFilter, deptFilter]);

  const fetchTxLogs = useCallback(async () => {
    if (!supervisorEmpNum) return;
    setTxLoading(true); setTxError('');
    try {
      const params = new URLSearchParams();
      if (txDeptFilter !== 'all') {
        params.set('departmentCode', txDeptFilter);
      } else if (supervisorCtx?.departments?.length) {
        const deptCodes = supervisorCtx.departments.map((d) => d.code);
        if (deptCodes.length > 0) params.set('departmentCodes', deptCodes.join(','));
      }
      const r = await axios.get(`${API_BASE_URL}/api/supervisor-leave/transactions/me?${params.toString()}`, getAuthHeaders());
      setTxLogs(Array.isArray(r.data) ? r.data : []);
    } catch { setTxError('Failed to load transaction logs.'); } finally { setTxLoading(false); }
  }, [supervisorEmpNum, supervisorCtx, txDeptFilter]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ctx = await fetchContext();
      if (cancelled) return;
      if (ctx?.isSupervisor || ctx?.departments?.length > 0) {
        window.dispatchEvent(new CustomEvent('pageAccessUpdated', {
          detail: { employeeNumber: ctx.supervisorEmployeeNumber || supervisorEmpNum },
        }));
      }
      await fetchRequests();
    };
    load();
    return () => { cancelled = true; };
  }, [fetchContext, fetchRequests, supervisorEmpNum, statusFilter, deptFilter]);
  useEffect(() => { refreshRef.current = fetchRequests; });
  useEffect(() => {
    if (!socket || !connected) return;
    const handler = () => refreshRef.current?.();
    socket.on('leaveRequestChanged', handler);
    return () => socket.off('leaveRequestChanged', handler);
  }, [socket, connected]);
  useEffect(() => { if (txModalOpen || txPanelOpen) fetchTxLogs(); }, [txModalOpen, txPanelOpen, fetchTxLogs]);
  useEffect(() => { setTxPage(1); }, [txSearchTerm, txActionFilter, txDeptFilter]);
  useEffect(() => { setPage(0); }, [searchTerm, statusFilter, deptFilter]);

  const actingSupervisorEmp =
    supervisorCtx?.supervisorEmployeeNumber || supervisorEmpNum;

  const handleAction = async (req, newStatus, remarks = '') => {
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/supervisor-leave/action/${req.id}`, {
        newStatus, supervisorEmployeeNumber: actingSupervisorEmp, remarks,
      }, getAuthHeaders());
      setViewRequest(null);
      setSuccessAction('status'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000);
      fetchRequests();
      if (txModalOpen || txPanelOpen) fetchTxLogs();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update leave request.');
    } finally { setActionLoading(false); }
  };

  const handleBulkAction = (newStatus) => {
    if (!selectedIds.length) return;
    const label = newStatus === 1 ? 'Supervisor Approve' : 'Deny';
    showConfirm({
      title:        `Bulk ${label}`,
      message:      `Apply "${label}" to ${selectedIds.length} selected request(s)?`,
      confirmLabel: label,
      confirmColor: newStatus === 1 ? '#1565C0' : '#C62828',
      confirmHoverColor: newStatus === 1 ? '#0D47A1' : '#B71C1C',
      icon:         newStatus === 1 ? DoneAllIcon : ThumbDownIcon,
      iconColor:    newStatus === 1 ? '#1565C0' : '#C62828',
      iconBg:       newStatus === 1 ? '#E3F2FD' : '#FFEBEE',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        setBulkLoading(true);
        try {
          await axios.put(`${API_BASE_URL}/api/supervisor-leave/bulk-action`, {
            ids: selectedIds, newStatus, supervisorEmployeeNumber: actingSupervisorEmp,
          }, getAuthHeaders());
          setSuccessAction('bulk'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000);
          setSelectedIds([]); setSelectMode(false); fetchRequests();
          if (txModalOpen || txPanelOpen) fetchTxLogs();
        } catch (e) { alert(e.response?.data?.error || 'Bulk action failed.'); }
        finally { setBulkLoading(false); closeConfirm(); }
      },
    });
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return requests.filter((r) => {
      if (!s) return true;
      return (r.employeeName || '').toLowerCase().includes(s) || (r.employeeNumber || '').toString().toLowerCase().includes(s);
    });
  }, [requests, searchTerm]);

  const paged      = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const pendingCnt = requests.filter((r) => String(r.status) === '0').length;
  const isLocked   = (r) => ['1', '2', '3', '4'].includes(String(r.status));

  const handleSelectRequest = (id) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const handleSelectAll     = () => setSelectedIds(selectedIds.length === paged.filter((r) => !isLocked(r)).length ? [] : paged.filter((r) => !isLocked(r)).map((r) => r.id));

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const s   = Array.isArray(d) ? d[0] : d.split(',')[0];
    const [y, m, day] = s.trim().split('-');
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const deptOptions = useMemo(() => {
    if (!supervisorCtx?.departments) return [];
    return supervisorCtx.departments;
  }, [supervisorCtx]);

  const filteredTxLogs = useMemo(() => {
    const search = txSearchTerm.toLowerCase().trim();
    return txLogs.filter((log) => {
      const kind = getTxKind(log);
      if (txActionFilter !== 'all' && kind !== txActionFilter) return false;
      if (!search) return true;
      const empNum  = String(log.employeeNumber || log.employee_id || '').toLowerCase();
      const empName = String(log.employeeName || '').toLowerCase();
      const message = String(log.message || '').toLowerCase();
      const dept    = String(log.departmentCode || '').toLowerCase();
      const label   = String(kindMap[kind]?.label || '').toLowerCase();
      return [empNum, empName, message, dept, label].some((v) => v.includes(search));
    });
  }, [txLogs, txSearchTerm, txActionFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(Math.max(filteredTxLogs.length, 0) / TX_PER_PAGE));
    if (txPage > maxPage) setTxPage(maxPage);
  }, [txPage, filteredTxLogs.length]);

  // Show wireframe while loading initial data
  if (accessLoading || ctxLoading || loading) return <Wireframe />;

  const normalizedRole = normalizeRole(userRole);
  const isTechAdmin = ['superadmin', 'technical', 'administrator'].includes(normalizedRole);
  const isAssignedSupervisor =
    supervisorCtx?.isSupervisor === true ||
    (Array.isArray(supervisorCtx?.departments) && supervisorCtx.departments.length > 0);
  // Match sidebar: page_access is granted only via Supervisor Assignment; context/me re-checks supervisor_assignment by employeeNumber.
  const hasPermission =
    isTechAdmin || isAssignedSupervisor || hasAccess === true;

  if (!hasPermission) {
    return <AccessDenied title="Access Denied" message="You do not have permission to access Supervisor Leave Approval. You must be assigned as a supervisor in Supervisor Assignment. Contact your HR administrator if you believe this is an error." returnPath="/home" returnButtonText="Return to Home" />;
  }

  return (
    <Fade in timeout={400}>
      <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '63%', transform: 'translateX(-61%)', px: { xs: 2, sm: 3, md: 6 } }}>
        <LoadingOverlay open={actionLoading || bulkLoading} message="Processing…" />
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
        <ConfirmModal {...confirmModal} onClose={closeConfirm} />

        {/* Page Header */}
        <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.12) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <SupervisorIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Supervisor Leave Approval</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    {supervisorCtx?.departments?.map((d) => d.description || d.code).join(' · ') || 'Loading departments…'}
                  </Typography>
                  {supervisorCtx?.departments?.[0]?.role && <RoleBadge role={supervisorCtx.departments[0].role} />}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              {pendingCnt > 0 && (
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.3)' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: '#E65100', fontWeight: 700 }}>{pendingCnt} pending</Typography>
                </Box>
              )}
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.8rem', color: T.accent, fontWeight: 700 }}>{requests.length} total</Typography>
              </Box>
              <AccentButton onClick={() => { setTxModalOpen(true); setTxPage(1); }} variant="contained"
                startIcon={<HistoryToggleOff sx={{ fontSize: '15px !important' }} />}
                sx={{ fontSize: '0.8rem', bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}>
                Transaction Logs
              </AccentButton>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchRequests} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, '&:hover': { bgcolor: alpha(T.accent, 0.15) } }}>
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* Department chips */}
        {supervisorCtx?.departments?.length > 1 && (
          <Box sx={{ mb: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Box onClick={() => setDeptFilter('all')}
              sx={{ px: 1.5, py: 0.45, borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, bgcolor: deptFilter === 'all' ? T.accent : '#fff', color: deptFilter === 'all' ? '#fff' : T.accent, border: `1px solid ${deptFilter === 'all' ? T.accent : T.accentBorder}`, transition: 'all 0.15s' }}>
              All Departments
            </Box>
            {deptOptions.map((d) => (
              <Box key={d.code} onClick={() => setDeptFilter(d.code)}
                sx={{ px: 1.5, py: 0.45, borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, bgcolor: deptFilter === d.code ? T.accent : '#fff', color: deptFilter === d.code ? '#fff' : T.accent, border: `1px solid ${deptFilter === d.code ? T.accent : T.accentBorder}`, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DomainIcon sx={{ fontSize: 12 }} />{d.description || d.code}
              </Box>
            ))}
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            {txPanelOpen ? (
              <TransactionLogsSurface variant="panel"
                logs={filteredTxLogs} totalCount={txLogs.length} filteredTotal={filteredTxLogs.length}
                loading={txLoading} error={txError}
                auditPage={txPage} setAuditPage={setTxPage}
                searchTerm={txSearchTerm} setSearchTerm={setTxSearchTerm}
                actionFilter={txActionFilter} setActionFilter={setTxActionFilter}
                deptFilter={txDeptFilter} setDeptFilter={setTxDeptFilter}
                deptOptions={deptOptions}
                onClose={() => setTxPanelOpen(false)}
                onOpenModal={() => { setTxPanelOpen(false); setTxModalOpen(true); setTxPage(1); }}
                onExpandPanel={() => {}}
              />
            ) : (
              <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
                {/* Toolbar */}
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EventNote sx={{ fontSize: 17, color: T.accent }} />
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>Department Leave Requests</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Tooltip title={selectMode ? 'Exit Selection' : 'Select Multiple'}>
                        <AccentButton onClick={() => { setSelectMode(!selectMode); setSelectedIds([]); }} size="small" variant={selectMode ? 'contained' : 'outlined'}
                          startIcon={selectMode ? <CheckBoxIcon sx={{ fontSize: '13px !important' }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: '13px !important' }} />}
                          sx={{ fontSize: '0.72rem', px: 1.25, py: 0.35, height: 28, bgcolor: selectMode ? T.accent : 'transparent', color: selectMode ? '#fff' : T.accent, borderColor: T.accentBorder, '&:hover': { transform: 'none' } }}>
                          {selectMode ? 'Cancel' : 'Select'}
                        </AccentButton>
                      </Tooltip>
                      <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                        sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, '&.Mui-selected': { bgcolor: T.accentFaint, color: T.accent } } }}>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="list"><ViewListIcon  sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    <AccentButton onClick={() => { setTxPanelOpen(true); setTxModalOpen(false); setTxPage(1); }} variant="outlined"
                      startIcon={<OpenInFullIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{ fontSize: '0.74rem', px: 1.25, py: 0.35, height: 28, color: T.accent, borderColor: T.accentBorder, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' } }}>
                      Open audit module
                    </AccentButton>
                    <Typography sx={{ fontSize: '0.74rem', color: T.muted }}>Search and filter department logs without leaving this page.</Typography>
                  </Box>

                  <FieldInput size="small" placeholder="Search by name or employee ID…" value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} fullWidth sx={{ mb: 1.5 }}
                    InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }} />

                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {[
                      { label: `All (${requests.length})`,   value: 'all', color: T.accent   },
                      { label: `Pending (${pendingCnt})`,    value: '0',   color: '#F57C00'  },
                      { label: `Approved (${requests.filter((r) => String(r.status) === '1').length})`, value: '1', color: '#1565C0' },
                      { label: `HR Approv. (${requests.filter((r) => String(r.status) === '2').length})`, value: '2', color: '#2E7D32' },
                      { label: `Denied (${requests.filter((r) => String(r.status) === '3').length})`, value: '3', color: '#C62828' },
                    ].map((f) => (
                      <Box key={f.value} onClick={() => { setStatusFilter(f.value); setPage(0); }}
                        sx={{ flex: 1, minWidth: 80, textAlign: 'center', py: 0.6, borderRadius: 1.5, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, lineHeight: 1.3, bgcolor: statusFilter === f.value ? f.color : 'transparent', color: statusFilter === f.value ? '#fff' : f.color, border: `1.5px solid ${f.color}`, transition: 'all 0.15s', '&:hover': { bgcolor: statusFilter === f.value ? f.color : alpha(f.color, 0.1) } }}>
                        {f.label}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Records */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, ...scrollbarSx }}>
                  {paged.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <EventNote sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                        {requests.length === 0 ? 'No leave requests in your department(s)' : 'No records match your filters'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Adjust your filters or check back later.</Typography>
                    </Box>
                  ) : viewMode === 'grid' ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paged.map((req) => {
                        const locked     = isLocked(req);
                        const isPending  = String(req.status) === '0';
                        const isSelected = selectedIds.includes(req.id);
                        return (
                          <Grid item xs={12} sm={4} md={3} key={req.id} sx={{ display: 'flex' }}>
                            <Box onClick={() => { if (selectMode && !locked) handleSelectRequest(req.id); else setViewRequest(req); }}
                              sx={{ width: '100%', display: 'flex', flexDirection: 'column', p: 2, borderRadius: 2, cursor: 'pointer', opacity: locked && !isPending ? 0.65 : 1, bgcolor: isSelected ? T.accentFaint : '#fff', border: isSelected ? `1.5px solid ${T.accent}` : isPending ? `1px solid rgba(245,124,0,0.35)` : `1px solid ${T.accentBorder}`, position: 'relative', transition: 'all 0.13s', '&:hover': { bgcolor: T.rowHover, borderColor: T.accent } }}>
                              {isPending && !selectMode && (
                                <Box sx={{ position: 'absolute', top: -1, left: 12, width: 3, height: '100%', borderRadius: '0 0 2px 2px', bgcolor: '#F57C00', opacity: 0.7 }} />
                              )}
                              {selectMode && !locked && (<Checkbox checked={isSelected} onChange={() => handleSelectRequest(req.id)} onClick={(e) => e.stopPropagation()} sx={{ position: 'absolute', top: 4, right: 4, p: 0, color: T.accent, '&.Mui-checked': { color: T.accent } }} size="small" />)}
                              {locked && !isPending && (<Box sx={{ position: 'absolute', top: 6, right: 6 }}><LockIcon sx={{ fontSize: 11, color: T.faint }} /></Box>)}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 12, color: T.faint }} />
                                <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{req.employeeNumber}</Typography>
                                {req.departmentCode && <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint }}><DomainIcon sx={{ fontSize: 10, color: T.accent }} /><Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent }}>{req.departmentCode}</Typography></Box>}
                              </Box>
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, mb: 0.25 }} noWrap>{req.employeeName || '—'}</Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: T.muted, mb: 1, flexGrow: 1 }}>
                                applied for <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{req.leave_description || req.leave_code}</Box>
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarMonth sx={{ fontSize: 11, color: T.faint }} /><Typography sx={{ fontSize: '0.7rem', color: T.muted }}>{formatDate(req.leave_date)}</Typography></Box>
                                <StatusPill status={req.status} />
                              </Box>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <>
                      <Box sx={{ px: 1.5, py: 1, display: 'grid', gridTemplateColumns: '110px 1fr 110px 130px 100px 80px', gap: 1, alignItems: 'center', bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1 }}>
                        {['Emp. No', 'Employee', 'Department', 'Leave Type', 'Date', 'Status'].map((col) => (
                          <Typography key={col} sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col}</Typography>
                        ))}
                      </Box>
                      {paged.map((req, idx) => {
                        const locked     = isLocked(req);
                        const isPending  = String(req.status) === '0';
                        const isSelected = selectedIds.includes(req.id);
                        return (
                          <Box key={req.id} onClick={() => { if (selectMode && !locked) handleSelectRequest(req.id); else setViewRequest(req); }}
                            sx={{ px: 1.5, py: 1.25, display: 'grid', gridTemplateColumns: '110px 1fr 110px 130px 100px 80px', gap: 1, alignItems: 'center', borderRadius: 1.5, cursor: 'pointer', bgcolor: isSelected ? T.accentFaint : idx % 2 === 0 ? T.rowEven : T.rowOdd, border: isSelected ? `1px solid ${T.accent}` : isPending ? `1px solid rgba(245,124,0,0.2)` : '1px solid transparent', '&:hover': { bgcolor: T.rowHover } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {selectMode && !locked && (<Checkbox checked={isSelected} onChange={() => handleSelectRequest(req.id)} onClick={(e) => e.stopPropagation()} sx={{ p: 0, mr: 0.5, color: T.accent, '&.Mui-checked': { color: T.accent } }} size="small" />)}
                              <Typography sx={{ fontSize: '0.75rem', color: T.muted }}>{req.employeeNumber}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }} noWrap>{req.employeeName || '—'}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <DomainIcon sx={{ fontSize: 12, color: T.muted }} />
                              <Typography sx={{ fontSize: '0.75rem', color: T.muted }} noWrap>{req.departmentCode || '—'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ px: 0.85, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `0.5px solid ${T.accentBorder}` }}>
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

                {/* Bulk toolbar */}
                {selectMode && (
                  <Slide direction="up" in={selectMode} mountOnEnter unmountOnExit>
                    <Box sx={{ px: 3, py: 1.75, borderTop: `2px solid ${T.accent}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox checked={selectedIds.length === paged.filter((r) => !isLocked(r)).length && paged.filter((r) => !isLocked(r)).length > 0}
                          indeterminate={selectedIds.length > 0 && selectedIds.length < paged.filter((r) => !isLocked(r)).length}
                          onChange={handleSelectAll}
                          sx={{ color: T.accent, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: T.accent } }} size="small" />
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.accent }}>
                          {selectedIds.length === 0 ? 'Select pending requests' : `${selectedIds.length} selected`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <AccentButton onClick={() => handleBulkAction(1)} disabled={selectedIds.length === 0 || bulkLoading} variant="contained" size="small"
                          startIcon={bulkLoading ? <CircularProgress size={11} /> : <DoneAllIcon sx={{ fontSize: '13px !important' }} />}
                          sx={{ fontSize: '0.72rem', px: 1.25, height: 28, bgcolor: '#1565C0', '&:hover': { bgcolor: '#0D47A1' }, '&:disabled': { bgcolor: '#ccc' } }}>
                          Bulk Approve
                        </AccentButton>
                        <AccentButton onClick={() => handleBulkAction(3)} disabled={selectedIds.length === 0 || bulkLoading} variant="contained" size="small"
                          startIcon={bulkLoading ? <CircularProgress size={11} /> : <ThumbDownIcon sx={{ fontSize: '13px !important' }} />}
                          sx={{ fontSize: '0.72rem', px: 1.25, height: 28, bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' }, '&:disabled': { bgcolor: '#ccc' } }}>
                          Bulk Deny
                        </AccentButton>
                      </Box>
                    </Box>
                  </Slide>
                )}

                {filtered.length > 0 && (
                  <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}>
                    <TablePagination component="div" count={filtered.length} page={page}
                      onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                      rowsPerPageOptions={[12, 24, 48]}
                      sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }} />
                  </Box>
                )}
              </SectionCard>
            )}
          </Grid>
        </Grid>

        {/* Transaction Logs Modal */}
        <Modal open={txModalOpen} onClose={() => setTxModalOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          <Fade in={txModalOpen}>
            <Box sx={{ width: '100%', maxWidth: 620 }}>
              <TransactionLogsSurface variant="modal"
                logs={filteredTxLogs} totalCount={txLogs.length} filteredTotal={filteredTxLogs.length}
                loading={txLoading} error={txError}
                auditPage={txPage} setAuditPage={setTxPage}
                searchTerm={txSearchTerm} setSearchTerm={setTxSearchTerm}
                actionFilter={txActionFilter} setActionFilter={setTxActionFilter}
                deptFilter={txDeptFilter} setDeptFilter={setTxDeptFilter}
                deptOptions={deptOptions}
                onClose={() => setTxModalOpen(false)}
                onOpenModal={() => { setTxPanelOpen(false); setTxModalOpen(true); setTxPage(1); }}
                onExpandPanel={() => { setTxPanelOpen(true); setTxModalOpen(false); setTxPage(1); }}
              />
            </Box>
          </Fade>
        </Modal>

        {/* Detail Modal */}
        <DetailModal
          open={!!viewRequest} onClose={() => setViewRequest(null)}
          request={viewRequest} supervisorCtx={supervisorCtx}
          onAction={handleAction} actionLoading={actionLoading}
        />
      </Box>
    </Fade>
  );
};

export default SupervisorLeaveApproval;