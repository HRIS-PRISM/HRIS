import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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
  Alert,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Divider,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  LinearProgress,
  Tooltip,
} from '@mui/material';

import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  EventAvailable as ReorderIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  MonetizationOn as CommutationIcon,
  CheckCircle as CheckIcon,
  AutoFixHigh as AutoAssignIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Wc as GenderIcon,
  Warning as WarningIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const semOrder = (s) => {
  if (!s) return 0;
  const l = String(s).toLowerCase();
  if (l.includes('2nd')) return 2;
  if (l.includes('1st')) return 1;
  return 0;
};

const periodLabel = (year, sem) => {
  if (!year) return 'Unknown period';
  return sem ? `${year} ${sem}` : `${year}`;
};

const getStatusColor = (remaining, total) => {
  if (!total || total === 0) return '#9e9e9e';
  const pct = (remaining / total) * 100;
  if (pct > 50) return '#2e7d32';
  if (pct > 20) return '#ed6c02';
  return '#d32f2f';
};

const daysToHours = (days) => (parseFloat(days) || 0) * 8;
const hoursToDays = (hours) => ((hours || 0) / 8).toString();

const parseHoursToComponents = (hoursLike, hoursPerDay = 8) => {
  const hours = Math.max(0, toNum(hoursLike));
  const totalSeconds = Math.round(hours * 3600);
  const daySeconds = hoursPerDay * 3600;
  const days = Math.floor(totalSeconds / daySeconds);
  let rem = totalSeconds % daySeconds;
  const h = Math.floor(rem / 3600);
  rem %= 3600;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return { days, h, m, s };
};

const getLeaveLabel = (leaveCode, leaveTypes) => {
  if (!leaveCode) return '—';
  const found = Array.isArray(leaveTypes)
    ? leaveTypes.find((t) => t.leave_code === leaveCode)
    : null;
  const desc =
    found?.leave_description || found?.description || found?.leave_name || '';
  return desc ? `${leaveCode} — ${desc}` : `${leaveCode}`;
};

const isCommutedLocked = (row) =>
  toNum(row?.remaining_hours) === 0 &&
  toNum(row?.total_hours) > 0 &&
  toNum(row?.used_hours) > 0 &&
  toNum(row?.used_hours) >= toNum(row?.total_hours);

const getActivePeriods = (periods = []) =>
  (Array.isArray(periods) ? periods : []).filter((p) => !isCommutedLocked(p));

const getLeaveTypeStatsActive = (periods) =>
  getActivePeriods(periods).reduce(
    (s, p) => ({
      totalHours: s.totalHours + toNum(p.total_hours),
      usedHours: s.usedHours + toNum(p.used_hours),
      remainingHours: s.remainingHours + toNum(p.remaining_hours),
    }),
    { totalHours: 0, usedHours: 0, remainingHours: 0 },
  );

// ─────────────────────────────────────────────
// GENDER RESTRICTION HELPERS
// ─────────────────────────────────────────────
const getLeaveGenderRestriction = (leaveType) => {
  if (!leaveType?.gender_restriction) return null;
  return leaveType.gender_restriction.toLowerCase();
};

const isLeaveAllowedForGender = (leaveType, employeeGender) => {
  const restriction = getLeaveGenderRestriction(leaveType);
  if (!restriction) return true;
  if (!employeeGender) return false;
  const gLower = employeeGender.toLowerCase();
  if (restriction === 'male') return gLower === 'male' || gLower === 'm';
  if (restriction === 'female') return gLower === 'female' || gLower === 'f';
  return true;
};

const GenderBadge = ({ gender, light = false }) => {
  if (!gender) return null;
  const isMale = gender.toLowerCase() === 'male';
  if (light) {
    return (
      <Chip
        size="small"
        icon={
          isMale ? (
            <MaleIcon
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}
            />
          ) : (
            <FemaleIcon
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}
            />
          )
        }
        label={gender}
        sx={{
          height: 20,
          fontSize: '0.65rem',
          bgcolor: 'rgba(255,255,255,0.18)',
          color: '#fff',
          fontWeight: 900,
          border: '1px solid rgba(255,255,255,0.35)',
        }}
      />
    );
  }
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon
            style={{ fontSize: 11, color: isMale ? '#1565C0' : '#c2185b' }}
          />
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

// ─────────────────────────────────────────────
// REMAINING BALANCE DISPLAY COMPONENT
// ─────────────────────────────────────────────
const RemainingBalance = ({
  hoursLike,
  color,
  alignItems = 'flex-end',
  largeDays = false,
}) => {
  const { days, h, m, s } = parseHoursToComponents(hoursLike);
  const dayLabel = days === 1 ? 'day' : 'days';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems }}>
      <Typography
        sx={{
          fontWeight: 900,
          color: color || 'inherit',
          fontSize: largeDays ? '1.4rem' : '0.95rem',
          lineHeight: 1.2,
        }}
      >
        {days} {dayLabel}
      </Typography>
      <Typography
        sx={{
          fontWeight: 600,
          color: color || 'inherit',
          fontSize: '0.70rem',
          opacity: 0.75,
          lineHeight: 1.3,
        }}
      >
        &amp; {h}h, {m}m, {s}s
      </Typography>
    </Box>
  );
};

// ─────────────────────────────────────────────
// STAT PILL — used in employee cards
// ─────────────────────────────────────────────
const StatPill = ({ label, value, color = '#444' }) => (
  <Box
    sx={{
      px: 1.5,
      py: 1,
      bgcolor: '#faf9f8',
      borderRadius: '6px',
      textAlign: 'center',
      minWidth: 56,
    }}
  >
    <Typography
      sx={{
        fontWeight: 800,
        fontSize: '1rem',
        color,
        lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.58rem',
        color: '#aaa',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        mt: 0.3,
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─────────────────────────────────────────────
// STYLED HELPERS
// ─────────────────────────────────────────────
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background:
        'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109, 35, 35, 0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      overflow: 'visible',
      '&:hover': { boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)' },
      ...sx,
    }}
  >
    {children}
  </Card>
);

// ─────────────────────────────────────────────
// FIELD LABEL
// ─────────────────────────────────────────────
const FieldLabel = ({ children, endAdornment }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 24,
      mb: 0.75,
    }}
  >
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 900, color: '#6d2323', lineHeight: 1 }}
    >
      {children}
    </Typography>
    {endAdornment && <Box sx={{ flexShrink: 0 }}>{endAdornment}</Box>}
  </Box>
);

// ─────────────────────────────────────────────
// FIELD HELPER
// ─────────────────────────────────────────────
const FieldHelper = ({ children, color = '#888', strong = false }) => (
  <Box sx={{ minHeight: 20, mt: 0.5 }}>
    {children && (
      <Typography
        variant="caption"
        sx={{
          color,
          fontWeight: strong ? 900 : 700,
          display: 'block',
          lineHeight: 1.4,
        }}
      >
        {children}
      </Typography>
    )}
  </Box>
);

// ─────────────────────────────────────────────
// DAYS INPUT FIELD
// ─────────────────────────────────────────────
const DaysInputField = ({
  label,
  value,
  onChange,
  color = '#6d2323',
  bgColor = 'transparent',
  borderColor,
  helperText,
  isAutoFilled = false,
  disabled = false,
  readOnly = false,
}) => {
  const hours = daysToHours(value);
  const bc =
    borderColor || (isAutoFilled ? 'rgba(46,125,50,0.5)' : `${color}30`);
  return (
    <Box>
      <TextField
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        fullWidth
        size="medium"
        disabled={disabled}
        InputProps={{
          readOnly,
          startAdornment: (
            <InputAdornment position="start">
              <CalendarIcon sx={{ color, fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Typography
                variant="caption"
                sx={{ color: '#888', fontWeight: 800, whiteSpace: 'nowrap' }}
              >
                = {hours} hrs
              </Typography>
            </InputAdornment>
          ),
        }}
        inputProps={{ min: 0, step: 0.5 }}
        variant={readOnly ? 'standard' : 'outlined'}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: isAutoFilled ? 'rgba(46,125,50,0.03)' : bgColor,
            '& fieldset': {
              borderColor: bc,
              borderWidth: isAutoFilled ? 2 : 1,
            },
            '&:hover fieldset': { borderColor: color },
            '&.Mui-focused fieldset': { borderColor: color, borderWidth: 2 },
          },
          '& .MuiInputBase-input': { color, fontWeight: 800 },
          '& .MuiInputLabel-root': { color },
          '& .MuiInputLabel-root.Mui-focused': { color },
          ...(readOnly && {
            '& .MuiInputBase-input': { color: '#333', fontWeight: 800 },
          }),
        }}
      />
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: isAutoFilled ? '#2E7D32' : '#888',
            mt: 0.5,
            display: 'block',
            fontWeight: isAutoFilled ? 800 : 600,
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────
// CARRY FORWARD SUMMARY PANEL
// ─────────────────────────────────────────────
const CarryForwardSummary = ({
  leaveCode,
  employeeAssignments,
  commutedDays,
}) => {
  if (!leaveCode || !employeeAssignments?.length) return null;
  const allRows = employeeAssignments.filter((a) => a.leave_code === leaveCode);
  if (!allRows.length) return null;

  const sorted = [...allRows].sort((a, b) => {
    const yearDiff = (b.period_year || 0) - (a.period_year || 0);
    if (yearDiff !== 0) return yearDiff;
    return semOrder(b.period_semester) - semOrder(a.period_semester);
  });

  const totalRemainingHours = sorted.reduce(
    (s, r) => s + toNum(r.remaining_hours),
    0,
  );
  const hasCommuted = toNum(commutedDays) > 0;
  const effectiveCarryDays = hasCommuted
    ? toNum(commutedDays)
    : totalRemainingHours / 8;
  const hasBalance = effectiveCarryDays > 0;

  return (
    <Box
      sx={{
        border: '1px solid rgba(109, 35, 35, 0.12)',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fafafa',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: 'rgba(109, 35, 35, 0.05)',
          borderBottom: '1px solid rgba(109, 35, 35, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <HistoryIcon sx={{ fontSize: 16, color: '#6d2323' }} />
        <Typography
          sx={{
            fontWeight: 900,
            color: '#6d2323',
            fontSize: '0.82rem',
            letterSpacing: 0.2,
          }}
        >
          Leave History — {leaveCode}
        </Typography>
        <Typography sx={{ color: '#999', fontSize: '0.75rem', ml: 0.5 }}>
          ({sorted.length} {sorted.length === 1 ? 'period' : 'periods'} on
          record)
        </Typography>
        {hasCommuted && (
          <Chip
            label="Has Commutation"
            size="small"
            icon={<CommutationIcon style={{ fontSize: 12 }} />}
            sx={{
              ml: 'auto',
              height: 22,
              fontSize: '0.65rem',
              bgcolor: 'rgba(109,35,35,0.1)',
              color: '#6d2323',
              fontWeight: 900,
            }}
          />
        )}
      </Box>
      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            maxHeight: 160,
            overflowY: 'auto',
            pr: 1,
          }}
        >
          {sorted.map((row, idx) => {
            const remHrs = toNum(row.remaining_hours);
            const usedHrs = toNum(row.used_hours);
            const totalHrs = toNum(row.total_hours);
            const remDays = remHrs / 8;
            const usedDays = usedHrs / 8;
            const totalDays = totalHrs / 8;
            const isFullyUsed =
              totalHrs > 0 && usedHrs >= totalHrs && remHrs <= 0;
            const pct =
              totalHrs > 0 ? Math.min((usedHrs / totalHrs) * 100, 100) : 0;
            const barColor = isFullyUsed
              ? '#2E7D32'
              : getStatusColor(remHrs, totalHrs);
            const label = periodLabel(row.period_year, row.period_semester);
            const isLatest = idx === 0;
            const isCommuted =
              remHrs === 0 &&
              toNum(row.used_hours) === totalHrs &&
              hasCommuted &&
              isLatest;
            return (
              <Box
                key={row.id}
                sx={{
                  py: 0.6,
                  borderBottom:
                    idx < sorted.length - 1
                      ? '1px solid rgba(0,0,0,0.06)'
                      : 'none',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: '#2c2c2c',
                        fontSize: '0.78rem',
                      }}
                    >
                      {label}
                    </Typography>
                    {isLatest && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.2,
                          borderRadius: 1,
                          bgcolor: 'rgba(109,35,35,0.07)',
                          border: '1px solid rgba(109,35,35,0.15)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            color: '#6d2323',
                            letterSpacing: 0.3,
                          }}
                        >
                          MOST RECENT
                        </Typography>
                      </Box>
                    )}
                    {isCommuted && (
                      <Chip
                        label="COMMUTED"
                        size="small"
                        icon={<CommutationIcon style={{ fontSize: 11 }} />}
                        sx={{
                          height: 20,
                          fontSize: '0.62rem',
                          bgcolor: 'rgba(109,35,35,0.12)',
                          color: '#6d2323',
                          fontWeight: 900,
                        }}
                      />
                    )}
                  </Box>
                  {remHrs <= 0 ? (
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: barColor,
                        fontSize: '0.82rem',
                      }}
                    >
                      No balance left
                    </Typography>
                  ) : (
                    <RemainingBalance
                      hoursLike={remHrs}
                      color={barColor}
                      alignItems="flex-end"
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    position: 'relative',
                    height: 6,
                    bgcolor: 'rgba(0,0,0,0.07)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    mb: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${pct}%`,
                      bgcolor: barColor,
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography sx={{ fontSize: '0.68rem', color: '#888' }}>
                    {remHrs <= 0
                      ? isCommuted
                        ? 'Commuted to carry-forward'
                        : 'Fully used'
                      : `${remDays.toFixed(1)} days available`}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: '#aaa' }}>
                    {usedDays.toFixed(1)} used · {totalDays.toFixed(1)} total
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: hasBalance
            ? hasCommuted
              ? 'rgba(109,35,35,0.04)'
              : 'rgba(46,125,50,0.04)'
            : 'rgba(0,0,0,0.02)',
          borderTop: `1px solid ${hasBalance ? (hasCommuted ? 'rgba(109,35,35,0.14)' : 'rgba(46,125,50,0.14)') : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '0.82rem',
              color: hasBalance
                ? hasCommuted
                  ? '#6d2323'
                  : '#2E7D32'
                : '#888',
              mb: 0.25,
            }}
          >
            {hasBalance
              ? hasCommuted
                ? 'Carried balance sourced from commutation record.'
                : 'Unused leave days will be carried over.'
              : 'No unused leave days to carry over.'}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#777' }}>
            {hasBalance
              ? 'The "Carried Balance" field above is filled automatically.'
              : 'The employee has used all allocated leave for previous periods.'}
          </Typography>
        </Box>
        {hasBalance && (
          <Box
            sx={{
              flexShrink: 0,
              textAlign: 'center',
              px: 2.5,
              py: 1,
              bgcolor: hasCommuted
                ? 'rgba(109,35,35,0.09)'
                : 'rgba(46,125,50,0.09)',
              border: `1px solid ${hasCommuted ? 'rgba(109,35,35,0.2)' : 'rgba(46,125,50,0.2)'}`,
              borderRadius: 2,
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: hasCommuted ? '#6d2323' : '#2E7D32',
                fontSize: '1.5rem',
                lineHeight: 1,
              }}
            >
              {effectiveCarryDays.toFixed(1)}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.68rem',
                color: hasCommuted ? '#8B4545' : '#4a9d55',
                fontWeight: 900,
                mt: 0.25,
              }}
            >
              days to carry forward
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────
// COMMUTE CONFIRM DIALOG
// ─────────────────────────────────────────────
const CommuteDialog = ({ open, period, onClose, onConfirm, loading }) => {
  const remainingDays = toNum(period?.remaining_hours) / 8;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}
        >
          <CommutationIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Commute Leave Balance
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 800 }}>
            This action cannot be undone
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box
          sx={{
            bgcolor: 'rgba(109,35,35,0.04)',
            marginTop: '30px',
            border: '1px solid rgba(109,35,35,0.12)',
            borderRadius: 2,
            p: 2,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 900, color: '#6d2323', mb: 1.5 }}
          >
            Summary
          </Typography>
          {[
            ['Employee', period?.fullName || period?.employeeNumber],
            ['Leave Code', period?.leave_code],
            [
              'Period',
              periodLabel(period?.period_year, period?.period_semester),
            ],
            [
              'Days to Commute',
              `${remainingDays.toFixed(2)} days (${toNum(period?.remaining_hours).toFixed(2)} hrs)`,
            ],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.5,
                borderBottom: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: '#888', fontWeight: 900 }}
              >
                {label}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 900, color: '#333' }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2, mt: '30px' }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            You are about to commute the remaining leave balance for this
            period.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
            Once confirmed, all remaining hours will be moved to Leave
            Commutation and this assignment will be cleared.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: '#6d2323',
            color: '#6d2323',
            borderRadius: 2,
            fontWeight: 900,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          startIcon={<CommutationIcon />}
          sx={{
            bgcolor: '#6d2323',
            color: '#fff',
            borderRadius: 2,
            '&:hover': { bgcolor: '#5a1d1d' },
            fontWeight: 900,
          }}
        >
          {loading ? 'Processing…' : 'Confirm Commutation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─────────────────────────────────────────────
// BULK AUTO-ASSIGN DIALOG
// ─────────────────────────────────────────────
const BulkAutoAssignDialog = ({
  open,
  onClose,
  leaveTypes,
  assignments,
  employees,
  commutationMap = {},
  onSuccess,
}) => {
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState(null);

  const employeesWithAssignments = useMemo(() => {
    const empNums = [
      ...new Set(assignments.map((a) => a.employeeNumber?.toString())),
    ];
    return empNums.map((num) => {
      const empInfo = employees.find(
        (e) => e.employeeNumber?.toString() === num,
      );
      return {
        employeeNumber: num,
        fullName: empInfo?.fullName || num,
        sex: empInfo?.sex || empInfo?.gender || null,
      };
    });
  }, [assignments, employees]);

  const preview = useMemo(() => {
    if (!selectedLeaveTypes.length)
      return { total: 0, skipped: 0, toCreate: 0, byLeave: [] };
    let toCreate = 0;
    let toSkip = 0;
    const byLeave = selectedLeaveTypes.map((lt) => {
      const restriction = getLeaveGenderRestriction(lt);
      let eligible = employeesWithAssignments.filter((emp) =>
        isLeaveAllowedForGender(lt, emp.sex),
      );
      let skippedForThisType = 0;
      let createdForThisType = 0;
      eligible.forEach((emp) => {
        const alreadyExists = assignments.some(
          (a) =>
            a.employeeNumber?.toString() === emp.employeeNumber &&
            a.leave_code === lt.leave_code &&
            a.period_year?.toString() === targetYear.toString(),
        );
        if (alreadyExists) {
          skippedForThisType++;
        } else {
          createdForThisType++;
        }
      });
      toCreate += createdForThisType;
      toSkip += skippedForThisType;
      return {
        code: lt.leave_code,
        desc: lt.leave_description,
        restriction,
        eligible: eligible.length,
        toCreate: createdForThisType,
        toSkip: skippedForThisType,
      };
    });
    return { total: toCreate + toSkip, toCreate, skipped: toSkip, byLeave };
  }, [selectedLeaveTypes, employeesWithAssignments, assignments, targetYear]);

  const pendingCommutations = useMemo(() => {
    const seen = new Set();
    const warnings = [];

    assignments.forEach((a) => {
      if (a.period_year?.toString() === targetYear.toString()) return;
      if (toNum(a.remaining_hours) <= 0) return;

      const mapKey = `${a.employeeNumber}_${a.leave_code}`;
      if (toNum(commutationMap[mapKey]) > 0) return;

      if (seen.has(mapKey)) return;
      seen.add(mapKey);

      const totalRemainingDays =
        assignments
          .filter(
            (x) =>
              x.employeeNumber?.toString() === a.employeeNumber?.toString() &&
              x.leave_code === a.leave_code &&
              x.period_year?.toString() !== targetYear.toString(),
          )
          .reduce((s, x) => s + toNum(x.remaining_hours), 0) / 8;

      const empInfo = employees.find(
        (e) => e.employeeNumber?.toString() === a.employeeNumber?.toString(),
      );
      warnings.push({
        employeeNumber: a.employeeNumber,
        fullName: a.fullName || empInfo?.fullName || a.employeeNumber,
        leaveCode: a.leave_code,
        remainingDays: totalRemainingDays,
      });
    });

    return warnings;
  }, [assignments, commutationMap, targetYear, employees]);

  const handleRun = async () => {
    if (!selectedLeaveTypes.length) return;
    if (pendingCommutations.length > 0) return;
    setRunning(true);
    setProgress(0);
    setResults(null);

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const total = preview.toCreate;

    for (let ltIdx = 0; ltIdx < selectedLeaveTypes.length; ltIdx++) {
      const lt = selectedLeaveTypes[ltIdx];
      const eligible = employeesWithAssignments.filter((emp) =>
        isLeaveAllowedForGender(lt, emp.sex),
      );

      for (let eIdx = 0; eIdx < eligible.length; eIdx++) {
        const emp = eligible[eIdx];
        const alreadyExists = assignments.some(
          (a) =>
            a.employeeNumber?.toString() === emp.employeeNumber &&
            a.leave_code === lt.leave_code &&
            a.period_year?.toString() === targetYear.toString(),
        );
        if (alreadyExists) {
          skipped++;
          continue;
        }

        setProgressMsg(`Creating ${lt.leave_code} for ${emp.fullName}…`);

        try {
          const mapKey = `${emp.employeeNumber}_${lt.leave_code}`;
          const commutedDays = toNum(commutationMap[mapKey]);

          let carriedForwardHours = 0;
          if (commutedDays > 0) {
            carriedForwardHours = commutedDays * 8;
          } else {
            const prevAssignments = assignments.filter(
              (a) =>
                a.employeeNumber?.toString() === emp.employeeNumber &&
                a.leave_code === lt.leave_code,
            );
            carriedForwardHours = prevAssignments.reduce(
              (s, a) => s + toNum(a.remaining_hours),
              0,
            );
          }

          await axios.post(
            `${API_BASE_URL}/leaveRoute/leave_assignment`,
            {
              leave_code: lt.leave_code,
              employeeNumber: emp.employeeNumber,
              total_hours: 0,
              carried_forward_hours: carriedForwardHours,
              allocated_hours: 0,
              period_year: parseInt(targetYear, 10),
              period_semester: null,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            },
          );
          created++;
        } catch {
          errors++;
        }

        const done = created + errors;
        setProgress(total > 0 ? Math.round((done / total) * 100) : 100);
      }
    }

    setRunning(false);
    setProgress(100);
    setProgressMsg('');
    setResults({ created, skipped, errors });
    onSuccess?.();
  };

  const handleClose = () => {
    if (running) return;
    setResults(null);
    setProgress(0);
    setProgressMsg('');
    setSelectedLeaveTypes([]);
    onClose();
  };

  const toggleLeaveType = (lt) => {
    setSelectedLeaveTypes((prev) =>
      prev.find((x) => x.leave_code === lt.leave_code)
        ? prev.filter((x) => x.leave_code !== lt.leave_code)
        : [...prev, lt],
    );
  };

  const selectAll = () => setSelectedLeaveTypes([...leaveTypes]);
  const clearAll = () => setSelectedLeaveTypes([]);

  const yearOptions = [];
  for (
    let y = new Date().getFullYear() - 2;
    y <= new Date().getFullYear() + 5;
    y++
  )
    yearOptions.push(y);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}
          >
            <AutoAssignIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Reset to Default (Existing Only)
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.85, fontWeight: 700 }}
            >
              Auto-create assignments for all {employeesWithAssignments.length}{' '}
              employees who already have records
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={running}
          sx={{ color: '#fff' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, overflowY: 'auto' }}>
        {results ? (
          <Box>
            <Alert
              severity={results.errors > 0 ? 'warning' : 'success'}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Bulk Assignment Complete
              </Typography>
              <Typography variant="body2">
                Created: <strong>{results.created}</strong> assignments
              </Typography>
              <Typography variant="body2">
                Skipped (already exists): <strong>{results.skipped}</strong>
              </Typography>
              {results.errors > 0 && (
                <Typography variant="body2">
                  Errors: <strong>{results.errors}</strong>
                </Typography>
              )}
            </Alert>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                New credits were set to <strong>0 days</strong> as default.
                Carried balance was <strong>auto-filled</strong> from each
                employee's commutation record or prior remaining balance. Adjust
                new credits individually as needed.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: '#6d2323',
                  mb: 1.5,
                  fontSize: '0.9rem',
                }}
              >
                1. Select Target Period Year
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  disabled={running}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(109,35,35,0.3)',
                    },
                  }}
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}{' '}
                      {y === new Date().getFullYear()
                        ? '(Current)'
                        : y === new Date().getFullYear() + 1
                          ? '(Next Year)'
                          : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{ fontWeight: 900, color: '#6d2323', fontSize: '0.9rem' }}
                >
                  2. Select Leave Types to Auto-Assign
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={selectAll}
                    disabled={running}
                    sx={{
                      color: '#6d2323',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={clearAll}
                    disabled={running}
                    sx={{ color: '#888', fontWeight: 900, fontSize: '0.72rem' }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>

              {(() => {
                const noGenderCount = employeesWithAssignments.filter(
                  (e) => !e.sex,
                ).length;
                const hasGenderRestricted = leaveTypes.some((lt) =>
                  getLeaveGenderRestriction(lt),
                );
                return noGenderCount > 0 && hasGenderRestricted ? (
                  <Alert
                    severity="warning"
                    icon={<WarningIcon sx={{ fontSize: 18 }} />}
                    sx={{ mb: 2, borderRadius: 2, py: 0.5 }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      <strong>
                        {noGenderCount} employee{noGenderCount > 1 ? 's' : ''}
                      </strong>{' '}
                      have no gender recorded in Personal Info.
                      Gender-restricted leave types will be{' '}
                      <strong>skipped</strong> for those employees. Please
                      update their records in <em>Personal Information</em> to
                      include them.
                    </Typography>
                  </Alert>
                ) : null;
              })()}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {leaveTypes.map((lt) => {
                  const isSelected = !!selectedLeaveTypes.find(
                    (x) => x.leave_code === lt.leave_code,
                  );
                  const restriction = getLeaveGenderRestriction(lt);
                  return (
                    <Tooltip
                      key={lt.leave_code}
                      title={
                        restriction
                          ? `${restriction === 'male' ? 'Male only' : 'Female only'} — will only assign to eligible gender`
                          : 'All genders'
                      }
                    >
                      <Chip
                        label={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            {restriction === 'male' && (
                              <MaleIcon
                                sx={{
                                  fontSize: 13,
                                  color: isSelected ? '#fff' : '#1565C0',
                                }}
                              />
                            )}
                            {restriction === 'female' && (
                              <FemaleIcon
                                sx={{
                                  fontSize: 13,
                                  color: isSelected ? '#fff' : '#C2185B',
                                }}
                              />
                            )}
                            {lt.leave_code}
                          </Box>
                        }
                        onClick={() => !running && toggleLeaveType(lt)}
                        sx={{
                          cursor: running ? 'not-allowed' : 'pointer',
                          bgcolor: isSelected
                            ? '#6d2323'
                            : 'rgba(109,35,35,0.07)',
                          color: isSelected ? '#fff' : '#6d2323',
                          fontWeight: 900,
                          border: `1px solid ${isSelected ? '#6d2323' : 'rgba(109,35,35,0.2)'}`,
                          '&:hover': {
                            bgcolor: isSelected
                              ? '#5a1d1d'
                              : 'rgba(109,35,35,0.15)',
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>

            {pendingCommutations.length > 0 && (
              <Box
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  border: '1.5px solid #e65100',
                  bgcolor: 'rgba(230,81,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: 'rgba(230,81,0,0.1)',
                    borderBottom: '1px solid rgba(230,81,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                  }}
                >
                  <WarningIcon sx={{ fontSize: 20, color: '#e65100' }} />
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: '#e65100',
                      fontSize: '0.88rem',
                    }}
                  >
                    Action required — {pendingCommutations.length} pending
                    commutation{pendingCommutations.length > 1 ? 's' : ''} must
                    be resolved first
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#bf360c',
                      fontWeight: 800,
                      display: 'block',
                      mb: 1.25,
                      lineHeight: 1.6,
                    }}
                  >
                    The employees below still have{' '}
                    <strong>remaining leave hours from prior periods</strong>{' '}
                    that have not been transferred to Leave Commutation. Close
                    this dialog, open each employee record, and click{' '}
                    <strong>"Transfer to Leave Commutation"</strong> on the
                    outstanding periods before running auto-assign.
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    {pendingCommutations.map((w, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.6,
                          px: 1.5,
                          borderRadius: 1,
                          bgcolor: 'rgba(230,81,0,0.06)',
                          border: '1px solid rgba(230,81,0,0.14)',
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 900,
                              color: '#bf360c',
                            }}
                          >
                            {w.fullName}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.7rem',
                              color: '#999',
                              fontWeight: 700,
                            }}
                          >
                            #{w.employeeNumber}
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Chip
                            label={w.leaveCode}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              bgcolor: 'rgba(230,81,0,0.12)',
                              color: '#e65100',
                              fontWeight: 900,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: '0.78rem',
                              fontWeight: 900,
                              color: '#e65100',
                            }}
                          >
                            {w.remainingDays.toFixed(1)} days untransferred
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            {selectedLeaveTypes.length > 0 && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(109,35,35,0.03)',
                  border: '1px solid rgba(109,35,35,0.12)',
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: '#6d2323',
                    mb: 1.5,
                    fontSize: '0.85rem',
                  }}
                >
                  Preview
                </Typography>
                <Box
                  sx={{ display: 'flex', gap: 3, mb: 1.5, flexWrap: 'wrap' }}
                >
                  {[
                    [`${employeesWithAssignments.length}`, 'Total Employees'],
                    [`${preview.toCreate}`, 'Will Create'],
                    [`${preview.skipped}`, 'Already Exists (Skip)'],
                  ].map(([val, label]) => (
                    <Box key={label} sx={{ textAlign: 'center' }}>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: '1.3rem',
                          color: '#6d2323',
                          lineHeight: 1,
                        }}
                      >
                        {val}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          color: '#888',
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ maxHeight: 160, overflowY: 'auto' }}>
                  {preview.byLeave.map((bl) => (
                    <Box
                      key={bl.code}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.4,
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {bl.restriction === 'male' && (
                          <MaleIcon sx={{ fontSize: 14, color: '#1565C0' }} />
                        )}
                        {bl.restriction === 'female' && (
                          <FemaleIcon sx={{ fontSize: 14, color: '#C2185B' }} />
                        )}
                        {!bl.restriction && (
                          <GenderIcon sx={{ fontSize: 14, color: '#888' }} />
                        )}
                        <Typography
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#333',
                          }}
                        >
                          {bl.code} — {bl.desc}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={`${bl.toCreate} new`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            bgcolor: 'rgba(46,125,50,0.1)',
                            color: '#2e7d32',
                            fontWeight: 900,
                          }}
                        />
                        {bl.toSkip > 0 && (
                          <Chip
                            label={`${bl.toSkip} skip`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              bgcolor: 'rgba(0,0,0,0.05)',
                              color: '#888',
                              fontWeight: 900,
                            }}
                          />
                        )}
                        {bl.restriction && (
                          <Chip
                            label={`${bl.eligible} eligible`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              bgcolor:
                                bl.restriction === 'male'
                                  ? 'rgba(21,101,192,0.1)'
                                  : 'rgba(194,24,91,0.1)',
                              color:
                                bl.restriction === 'male'
                                  ? '#1565C0'
                                  : '#C2185B',
                              fontWeight: 900,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Alert
                  severity="info"
                  sx={{ mt: 1.5, py: 0.5, borderRadius: 1.5 }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    New credits default to <strong>0 days</strong> — adjust
                    individually after running. Carried balance will be{' '}
                    <strong>auto-filled</strong> from each employee's
                    commutation record or previous remaining balance.
                  </Typography>
                </Alert>
              </Box>
            )}

            {running && (
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: '#6d2323',
                      fontWeight: 800,
                    }}
                  >
                    {progressMsg}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.75rem', color: '#888', fontWeight: 800 }}
                  >
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    borderRadius: 2,
                    height: 8,
                    bgcolor: 'rgba(109,35,35,0.1)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#6d2323' },
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{ p: 2.5, gap: 1, borderTop: '1px solid rgba(0,0,0,0.08)' }}
      >
        {results ? (
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              bgcolor: '#6d2323',
              color: '#fff',
              borderRadius: 2,
              fontWeight: 900,
              '&:hover': { bgcolor: '#5a1d1d' },
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button
              onClick={handleClose}
              disabled={running}
              variant="outlined"
              sx={{
                borderColor: '#6d2323',
                color: '#6d2323',
                borderRadius: 2,
                fontWeight: 900,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRun}
              disabled={
                running ||
                !selectedLeaveTypes.length ||
                preview.toCreate === 0 ||
                pendingCommutations.length > 0
              }
              variant="contained"
              startIcon={running ? null : <RunIcon />}
              sx={{
                bgcolor: '#6d2323',
                color: '#fff',
                borderRadius: 2,
                fontWeight: 900,
                '&:hover': { bgcolor: '#5a1d1d' },
                '&:disabled': { bgcolor: '#ccc', color: '#666' },
              }}
            >
              {running
                ? `Running… (${progress}%)`
                : pendingCommutations.length > 0
                  ? `Resolve ${pendingCommutations.length} pending commutation${pendingCommutations.length > 1 ? 's' : ''} first`
                  : `Run Auto-Assign (${preview.toCreate} records)`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ─────────────────────────────────────────────
// WIREFRAME SHIMMER KEYFRAMES
// ─────────────────────────────────────────────
const laShimmerKeyframes = `
@keyframes laShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes laPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const LASkeletonBox = ({
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
      animation: 'laShimmer 1.5s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─────────────────────────────────────────────
// LEAVE ASSIGNMENT WIREFRAME
// ─────────────────────────────────────────────
const LeaveAssignmentWireframe = () => (
  <>
    <style>{laShimmerKeyframes}</style>
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: '100%',
        maxWidth: '100%',
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          mb: 4,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(109,35,35,0.1)',
          animation: 'laPulse 2s ease-in-out infinite',
        }}
      >
        <Box
          sx={{
            p: 5,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
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
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.06)',
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
              bgcolor: 'rgba(109,35,35,0.04)',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(109,35,35,0.12)',
                mr: 4,
                flexShrink: 0,
              }}
            />
            <Box>
              <LASkeletonBox
                width={320}
                height={28}
                borderRadius={6}
                sx={{ mb: 1.5 }}
              />
              <LASkeletonBox width={420} height={14} borderRadius={4} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mb: 4,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(109,35,35,0.1)',
          animation: 'laPulse 2s ease-in-out 0.08s infinite',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'rgba(109,35,35,0.1)',
              flexShrink: 0,
            }}
          />
          <Box>
            <LASkeletonBox
              width={220}
              height={16}
              borderRadius={4}
              sx={{ mb: 0.75 }}
            />
            <LASkeletonBox width={310} height={11} borderRadius={3} />
          </Box>
        </Box>
        <Box sx={{ p: 4 }}>
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} md={i < 3 ? 4 : 3} key={i}>
                <LASkeletonBox
                  width={130}
                  height={11}
                  borderRadius={3}
                  sx={{ mb: 1.5 }}
                />
                <Box
                  sx={{
                    height: 56,
                    borderRadius: '8px',
                    border: '1px solid rgba(109,35,35,0.15)',
                    bgcolor: 'rgba(255,255,255,0.8)',
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      <Box
        sx={{
          mb: 4,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(109,35,35,0.1)',
          animation: 'laPulse 2s ease-in-out 0.16s infinite',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'rgba(109,35,35,0.12)',
                flexShrink: 0,
              }}
            />
            <Box>
              <LASkeletonBox
                width={210}
                height={16}
                borderRadius={4}
                sx={{ mb: 0.75 }}
              />
              <LASkeletonBox width={195} height={11} borderRadius={3} />
            </Box>
          </Box>
          <Box
            sx={{
              width: 300,
              height: 40,
              borderRadius: '8px',
              border: '1px solid rgba(109,35,35,0.15)',
              bgcolor: '#fff',
            }}
          />
        </Box>
        <Box sx={{ p: 4 }}>
          <Grid container spacing={2}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Box
                  sx={{
                    border: '1.5px solid rgba(109,35,35,0.12)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    bgcolor: '#fff',
                    animation: `laPulse 2s ease-in-out ${i * 0.07}s infinite`,
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      borderBottom: '1px solid rgba(109,35,35,0.08)',
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        bgcolor: 'rgba(109,35,35,0.15)',
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <LASkeletonBox
                        width="75%"
                        height={13}
                        borderRadius={3}
                        sx={{ mb: 0.6 }}
                      />
                      <LASkeletonBox width="50%" height={10} borderRadius={3} />
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      gap: 1,
                      bgcolor: '#faf9f8',
                    }}
                  >
                    {[0, 1, 2].map((j) => (
                      <Box
                        key={j}
                        sx={{
                          flex: j === 2 ? 1 : undefined,
                          minWidth: j < 2 ? 56 : undefined,
                          px: 1.5,
                          py: 1,
                          bgcolor: j === 2 ? '#fff' : '#faf9f8',
                          borderRadius: '6px',
                          textAlign: 'center',
                        }}
                      >
                        <LASkeletonBox
                          width="60%"
                          height={14}
                          borderRadius={3}
                          sx={{ mb: 0.5, mx: 'auto' }}
                        />
                        <LASkeletonBox
                          width="70%"
                          height={9}
                          borderRadius={2}
                          sx={{ mx: 'auto' }}
                        />
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <LASkeletonBox
                      width={70}
                      height={9}
                      borderRadius={2}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                      {[45, 38, 42].slice(0, (i % 3) + 1).map((w, k) => (
                        <Box
                          key={k}
                          sx={{
                            width: w,
                            height: 20,
                            borderRadius: '4px',
                            bgcolor: 'rgba(109,35,35,0.07)',
                            border: '1px solid rgba(109,35,35,0.1)',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Box>
  </>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const LeaveAssignment = () => {
  const { hasAccess, loading: accessLoading } =
    usePageAccess('leave-assignment');

  const [assignments, setAssignments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [newAssignment, setNewAssignment] = useState({
    leave_code: '',
    employeeNumber: '',
    total_hours: '',
    carried_forward_days: '0',
    allocated_days: '',
    period_year: new Date().getFullYear().toString(),
  });

  const [editAssignment, setEditAssignment] = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [error, setError] = useState('');
  const [isCarryForwardAutoSuggested, setIsCarryForwardAutoSuggested] =
    useState(false);

  const [employeeLeavesModalOpen, setEmployeeLeavesModalOpen] = useState(false);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState(null);
  const [selectedLeaveTypeInModal, setSelectedLeaveTypeInModal] =
    useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState([]);

  const [editCarriedDays, setEditCarriedDays] = useState('0');
  const [editAllocatedDays, setEditAllocatedDays] = useState('0');

  const [commuteDialogOpen, setCommuteDialogOpen] = useState(false);
  const [commutePeriod, setCommutePeriod] = useState(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteSuccess, setCommuteSuccess] = useState('');

  const [commutationMap, setCommutationMap] = useState({});

  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsRowsPerPage, setRecordsRowsPerPage] = useState(12);

  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchAssignments(),
        fetchLeaveTypes(),
        fetchEmployees(),
        fetchAllCommutations(),
      ]);
      setPageLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    setRecordsPage(0);
  }, [searchTerm]);

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.map((e) => {
      const name = (
        e?.fullName || `${e?.firstName || ''} ${e?.lastName || ''}`.trim()
      ).trim();
      const empNo = (e?.employeeNumber || '').toString().trim();
      return { ...e, _searchKey: `${name} ${empNo}`.toLowerCase() };
    });
  }, [employees]);

  const selectedEmployeeGender = useMemo(() => {
    if (!selectedEmployee) return null;
    return selectedEmployee.sex || selectedEmployee.gender || null;
  }, [selectedEmployee]);

  const filteredLeaveTypesForNew = useMemo(() => {
    if (!leaveTypes.length) return leaveTypes;
    return leaveTypes.filter((lt) =>
      isLeaveAllowedForGender(lt, selectedEmployeeGender),
    );
  }, [leaveTypes, selectedEmployeeGender]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber || !newAssignment.leave_code) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: '0' }));
      return;
    }
    const empNum = selectedEmployee.employeeNumber?.toString();
    const lc = newAssignment.leave_code;
    const mapKey = `${empNum}_${lc}`;
    const empAssignments = assignments.filter(
      (a) => a.employeeNumber?.toString() === empNum,
    );
    setEmployeeAssignments(empAssignments);
    const leaveRows = empAssignments.filter((a) => a.leave_code === lc);
    if (!leaveRows.length) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: '0' }));
      return;
    }
    const commutedDays = toNum(commutationMap[mapKey]);
    if (commutedDays > 0) {
      setNewAssignment((prev) => ({
        ...prev,
        carried_forward_days: commutedDays.toString(),
      }));
      setIsCarryForwardAutoSuggested(true);
    } else {
      const totalRemainingHours = leaveRows.reduce(
        (s, r) => s + toNum(r.remaining_hours),
        0,
      );
      const totalRemainingDays = totalRemainingHours / 8;
      setNewAssignment((prev) => ({
        ...prev,
        carried_forward_days: totalRemainingDays.toString(),
      }));
      setIsCarryForwardAutoSuggested(totalRemainingDays > 0);
    }
  }, [selectedEmployee, newAssignment.leave_code, assignments, commutationMap]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) {
      setEmployeeAssignments([]);
      return;
    }
    setEmployeeAssignments(
      assignments.filter(
        (a) =>
          a.employeeNumber?.toString() ===
          selectedEmployee.employeeNumber?.toString(),
      ),
    );
  }, [selectedEmployee, assignments]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
      );
      setAssignments(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch {
      setAssignments([]);
      setError('Failed to fetch assignments');
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`);
      setLeaveTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLeaveTypes([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setEmployees([]);
        return;
      }

      const [usersRes, personalRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/personalinfo/person_table`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
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
        const personalList = Array.isArray(pd)
          ? pd
          : pd?.data || pd?.personalInfo || [];
        personalList.forEach((p) => {
          const empNum =
            p.agencyEmployeeNum?.toString() ||
            p.employeeNumber?.toString() ||
            p.employee_number?.toString();
          const sex = p.sex || p.gender || p.Sex || p.Gender;
          if (empNum && sex) sexMap[empNum] = sex;
        });
      }

      const merged = usersData.map((u) => {
        const empNum =
          u.employeeNumber?.toString() || u.employee_number?.toString();
        const sexFromPersonal = empNum ? sexMap[empNum] : null;
        return { ...u, sex: sexFromPersonal || u.sex || u.gender || null };
      });

      setEmployees(merged);
    } catch {
      setEmployees([]);
    }
  };

  const fetchAllCommutations = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/commutationRoute/leave_commutation`,
      );
      const records = Array.isArray(res.data) ? res.data : [];
      const map = {};
      records
        .filter((r) => r.status === 0 || r.status === 1)
        .forEach((r) => {
          const key = `${r.employeeNumber}_${r.leave_code}`;
          map[key] = (map[key] || 0) + toNum(r.commuted_days);
        });
      setCommutationMap(map);
    } catch {
      /* non-fatal */
    }
  };

  const openCommuteDialog = (period) => {
    setCommutePeriod(period);
    setCommuteDialogOpen(true);
    setCommuteSuccess('');
  };

  const handleCommute = async () => {
    if (!commutePeriod) return;
    setCommuteLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/commutationRoute/leave_commutation/commute/${commutePeriod.id}`,
        { commuted_by: token ? 'admin' : null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCommuteDialogOpen(false);
      setCommuteLoading(false);
      setCommuteSuccess(
        `Successfully commuted ${(toNum(commutePeriod.remaining_hours) / 8).toFixed(2)} days.`,
      );
      await fetchAssignments();
      await fetchAllCommutations();
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(
          `${API_BASE_URL}/leaveRoute/leave_assignment`,
        );
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter(
          (a) =>
            a.employeeNumber?.toString() ===
            selectedEmployeeLeaves.employeeNumber?.toString(),
        );
        const grouped = empData.reduce((acc, a) => {
          if (!acc[a.leave_code])
            acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
          acc[a.leave_code].periods.push(a);
          return acc;
        }, {});
        setSelectedEmployeeLeaves((prev) => ({
          ...prev,
          leaveTypes: Object.values(grouped),
        }));
        if (selectedLeaveTypeInModal) {
          const refreshedLT = grouped[selectedLeaveTypeInModal.leave_code];
          if (refreshedLT) setSelectedLeaveTypeInModal(refreshedLT);
        }
      }
      if (editAssignment) {
        setEditAssignment((prev) => ({
          ...prev,
          remaining_hours: 0,
          used_hours: prev.total_hours,
        }));
      }
      setTimeout(() => setCommuteSuccess(''), 4000);
    } catch (e) {
      setCommuteLoading(false);
      setError('Commutation failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const isDuplicateAssignment = (
    employeeNumber,
    leaveCode,
    periodYear,
    excludeId = null,
  ) => {
    if (!employeeNumber || !leaveCode) return false;
    const emp = employeeNumber?.toString();
    const py =
      periodYear !== undefined && periodYear !== null
        ? periodYear?.toString()
        : new Date().getFullYear().toString();
    return assignments.some((a) => {
      if (excludeId && String(a.id) === String(excludeId)) return false;
      return (
        a.employeeNumber?.toString() === emp &&
        a.leave_code === leaveCode &&
        a.period_year?.toString() === py
      );
    });
  };

  const handleAdd = async () => {
    const employeeNumber = selectedEmployee?.employeeNumber?.toString().trim();
    const leaveCode = newAssignment.leave_code;
    const carriedHours = daysToHours(newAssignment.carried_forward_days);
    const allocatedHours = daysToHours(newAssignment.allocated_days);

    if (!employeeNumber || !leaveCode) {
      setError('Please select an employee and leave type');
      return;
    }
    if (!allocatedHours || allocatedHours <= 0) {
      setError('Please enter valid allocation days (must be greater than 0)');
      return;
    }
    if (
      isDuplicateAssignment(
        employeeNumber,
        leaveCode,
        newAssignment.period_year,
      )
    ) {
      setError(
        'This employee already has an assignment for this leave type and period',
      );
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
        {
          leave_code: leaveCode,
          employeeNumber,
          total_hours: allocatedHours,
          carried_forward_hours: carriedHours,
          allocated_hours: allocatedHours,
          period_year:
            parseInt(newAssignment.period_year, 10) || new Date().getFullYear(),
          period_semester: null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      setSelectedEmployee(null);
      setNewAssignment({
        leave_code: '',
        employeeNumber: '',
        total_hours: '',
        carried_forward_days: '0',
        allocated_days: '',
        period_year: new Date().getFullYear().toString(),
      });
      setIsCarryForwardAutoSuggested(false);
      await fetchAssignments();
      await fetchAllCommutations();
      setTimeout(() => {
        setLoading(false);
        setSuccessAction('adding');
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 250);
    } catch (error) {
      setError(
        'Error adding assignment: ' +
          (error.response?.data?.error || error.message),
      );
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const assignmentId = editAssignment?.id;
    const employeeNumber = editAssignment?.employeeNumber?.toString().trim();
    const leaveCode = editAssignment?.leave_code;
    const carriedHours = daysToHours(editCarriedDays);
    const allocatedHours = daysToHours(editAllocatedDays);
    // remaining = new allocation minus whatever has already been used
    const usedHours = toNum(editAssignment.used_hours);
    const remainingHours = Math.max(0, allocatedHours - usedHours);

    if (!assignmentId) {
      setError('Error: Assignment ID is missing.');
      return;
    }
    if (!employeeNumber || !leaveCode) {
      setError('Please fill in all required fields');
      return;
    }
    if (
      isDuplicateAssignment(
        employeeNumber,
        leaveCode,
        editAssignment.period_year,
        editAssignment.id,
      )
    ) {
      setError(
        'This employee already has an assignment for this leave type and period',
      );
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_assignment/${assignmentId}`,
        {
          leave_code: leaveCode,
          employeeNumber,
          total_hours: allocatedHours,
          remaining_hours: remainingHours,
          carried_forward_hours: carriedHours,
          allocated_hours: allocatedHours,
          period_year:
            parseInt(editAssignment.period_year, 10) ||
            new Date().getFullYear(),
          period_semester: null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        },
      );
      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError('');

      // Refresh assignments then update the open modal panels so period cards show fresh data
      await fetchAssignments();

      if (selectedEmployeeLeaves) {
        const updated = await axios.get(
          `${API_BASE_URL}/leaveRoute/leave_assignment`,
        );
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter(
          (a) =>
            a.employeeNumber?.toString() ===
            selectedEmployeeLeaves.employeeNumber?.toString(),
        );
        const grouped = empData.reduce((acc, a) => {
          if (!acc[a.leave_code])
            acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
          acc[a.leave_code].periods.push(a);
          return acc;
        }, {});
        setSelectedEmployeeLeaves((prev) => ({
          ...prev,
          leaveTypes: Object.values(grouped),
        }));
        if (selectedLeaveTypeInModal) {
          const refreshedLT = grouped[selectedLeaveTypeInModal.leave_code];
          if (refreshedLT) setSelectedLeaveTypeInModal(refreshedLT);
        }
      }

      setSuccessAction('edit');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 500);
    } catch (error) {
      setError(
        'Error updating assignment: ' +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment?'))
      return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError('');
      setEmployeeLeavesModalOpen(false);
      setSelectedEmployeeLeaves(null);
      setSelectedLeaveTypeInModal(null);
      await fetchAssignments();
      setSuccessAction('delete');
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 1000);
    } catch (error) {
      setError(
        'Error deleting assignment: ' +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment });
    setOriginalAssignment({ ...assignment });
    setEditCarriedDays(hoursToDays(assignment.carried_forward_hours));
    setEditAllocatedDays(hoursToDays(assignment.allocated_hours));
    setIsEditing(false);
    setError('');
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setError('');
  };
  const handleCancelEdit = () => {
    setEditAssignment({ ...originalAssignment });
    setEditCarriedDays(hoursToDays(originalAssignment.carried_forward_hours));
    setEditAllocatedDays(hoursToDays(originalAssignment.allocated_hours));
    setIsEditing(false);
    setError('');
  };
  const handleBackToPeriods = () => {
    setEditAssignment(null);
    setOriginalAssignment(null);
    setIsEditing(false);
    setError('');
  };
  const handleCloseModal = () => {
    setEditAssignment(null);
    setOriginalAssignment(null);
    setIsEditing(false);
    setError('');
    setEmployeeLeavesModalOpen(false);
    setSelectedEmployeeLeaves(null);
    setSelectedLeaveTypeInModal(null);
  };

  const filteredAssignments = assignments.filter((a) => {
    const search = searchTerm.toLowerCase();
    return (
      (a.fullName?.toLowerCase() || '').includes(search) ||
      (a.employeeNumber?.toString().toLowerCase() || '').includes(search) ||
      (a.leave_code?.toString().toLowerCase() || '').includes(search)
    );
  });

  const getEmployeeInfo = (empNum) =>
    employees.find(
      (e) => e.employeeNumber?.toString() === empNum?.toString(),
    ) || { fullName: empNum || 'Unknown' };

  const groupedByEmployee = filteredAssignments.reduce((acc, a) => {
    const empNum = a.employeeNumber?.toString() || 'Unknown';
    if (!acc[empNum]) {
      const info = getEmployeeInfo(empNum);
      acc[empNum] = {
        employeeNumber: empNum,
        fullName: info.fullName || empNum,
        firstName: info.firstName,
        lastName: info.lastName,
        leaveTypes: {},
      };
    }
    const lc = a.leave_code;
    if (!acc[empNum].leaveTypes[lc])
      acc[empNum].leaveTypes[lc] = { leave_code: lc, periods: [] };
    acc[empNum].leaveTypes[lc].periods.push(a);
    return acc;
  }, {});

  const employeeGroups = Object.values(groupedByEmployee)
    .map((emp) => ({ ...emp, leaveTypes: Object.values(emp.leaveTypes) }))
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  const paginatedEmployeeGroups = useMemo(() => {
    const start = recordsPage * recordsRowsPerPage;
    return employeeGroups.slice(start, start + recordsRowsPerPage);
  }, [employeeGroups, recordsPage, recordsRowsPerPage]);

  const selectedLeaveAssignments = newAssignment.leave_code
    ? employeeAssignments.filter(
        (a) => a.leave_code === newAssignment.leave_code,
      )
    : [];

  const mapKey = selectedEmployee
    ? `${selectedEmployee.employeeNumber}_${newAssignment.leave_code}`
    : '';
  const commutedDaysForNew = toNum(commutationMap[mapKey]);
  const carriedHoursNew = daysToHours(newAssignment.carried_forward_days);
  const allocatedHoursNew = daysToHours(newAssignment.allocated_days);
  const totalHoursNew = allocatedHoursNew;
  const totalDaysNew = totalHoursNew / 8;
  const canCommute = (period) => toNum(period?.remaining_hours) > 0;

  const selectedLeaveTypeObj = leaveTypes.find(
    (lt) => lt.leave_code === newAssignment.leave_code,
  );
  const leaveGenderRestriction = selectedLeaveTypeObj
    ? getLeaveGenderRestriction(selectedLeaveTypeObj)
    : null;
  const genderMismatch =
    leaveGenderRestriction &&
    selectedEmployeeGender &&
    !isLeaveAllowedForGender(selectedLeaveTypeObj, selectedEmployeeGender);

  if (accessLoading) return <LeaveAssignmentWireframe />;

  if (!hasAccess) return <AccessDenied />;

  if (pageLoading) return <LeaveAssignmentWireframe />;

  return (
    <>
      {/* ─── Main scrollable content ─── */}
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
        <LoadingOverlay
          open={loading}
          message="Processing leave assignment..."
        />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />

        <CommuteDialog
          open={commuteDialogOpen}
          period={commutePeriod}
          onClose={() => setCommuteDialogOpen(false)}
          onConfirm={handleCommute}
          loading={commuteLoading}
        />

        <BulkAutoAssignDialog
          open={bulkAssignOpen}
          onClose={() => setBulkAssignOpen(false)}
          leaveTypes={leaveTypes}
          assignments={assignments}
          employees={employees}
          commutationMap={commutationMap}
          onSuccess={async () => {
            await fetchAssignments();
          }}
        />

        {/* Hero Header */}
        <GlassCard sx={{ mb: 4, overflow: 'hidden', position: 'relative' }}>
          <Box
            sx={{
              p: 5,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
              color: '#6d2323',
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
                    bgcolor: 'rgba(109,35,35,0.15)',
                    mr: 4,
                    width: 64,
                    height: 64,
                    boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
                  }}
                >
                  <EventNote sx={{ color: '#6d2323', fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 900,
                      mb: 1,
                      lineHeight: 1.2,
                      color: '#6d2323',
                    }}
                  >
                    Leave Assignment Management
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ opacity: 0.85, fontWeight: 700, color: '#8B3333' }}
                  >
                    Administrative Panel • Assign leave types and manage leave
                    credits
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </GlassCard>

        {/* Add Assignment Section */}
        <GlassCard sx={{ mb: 4 }}>
          <Box
            sx={{
              p: 4,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
              color: '#6d2323',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <EventNote sx={{ fontSize: '1.8rem', mr: 2 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Assign Leave to Employee
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.9, fontWeight: 800 }}
              >
                Select an employee and assign leave credits for this period
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}
            {commuteSuccess && (
              <Alert
                severity="success"
                icon={<CheckIcon />}
                sx={{ mb: 3, borderRadius: 2 }}
              >
                {commuteSuccess}
              </Alert>
            )}
            {genderMismatch && (
              <Alert
                severity="warning"
                icon={<WarningIcon />}
                sx={{ mb: 3, borderRadius: 2 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  Gender mismatch:{' '}
                  <strong>{selectedLeaveTypeObj?.leave_description}</strong> is
                  restricted to <strong>{leaveGenderRestriction}</strong>{' '}
                  employees, but this employee's gender is{' '}
                  <strong>{selectedEmployeeGender}</strong>.
                </Typography>
              </Alert>
            )}

            <Grid container spacing={3} alignItems="flex-end">
              {/* Employee Select */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <FieldLabel>Select Employee *</FieldLabel>
                  <Autocomplete
                    value={selectedEmployee}
                    onChange={(e, v) => {
                      setSelectedEmployee(v);
                      setError('');
                      setNewAssignment((prev) => ({
                        ...prev,
                        leave_code: '',
                        carried_forward_days: '0',
                        total_hours: '',
                        allocated_days: '',
                      }));
                    }}
                    options={employeeOptions}
                    autoHighlight
                    limitTags={1}
                    getOptionLabel={(o) =>
                      `${o.fullName || `${o.firstName || ''} ${o.lastName || ''}`.trim()} (${o.employeeNumber})`
                    }
                    filterOptions={(options, { inputValue }) => {
                      const s = inputValue.toLowerCase().trim();
                      return options
                        .filter((o) => (o._searchKey || '').includes(s))
                        .slice(0, 80);
                    }}
                    isOptionEqualToValue={(o, v) =>
                      o.employeeNumber === v.employeeNumber
                    }
                    noOptionsText="No employees found"
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      const name =
                        option.fullName ||
                        `${option.firstName || ''} ${option.lastName || ''}`.trim();
                      const initials =
                        `${option.firstName?.[0] || ''}${option.lastName?.[0] || ''}`.toUpperCase() ||
                        '?';
                      const gender = option.sex || option.gender;
                      return (
                        <li key={key} {...rest}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: '#6d2323',
                                fontSize: '0.8rem',
                              }}
                            >
                              {initials}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700 }}
                              >
                                {name}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#888', fontWeight: 600 }}
                                >
                                  {option.employeeNumber}
                                </Typography>
                                {gender && <GenderBadge gender={gender} />}
                              </Box>
                            </Box>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Type employee name or number..."
                        size="medium"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '& fieldset': {
                              borderColor: 'rgba(109,35,35,0.2)',
                            },
                            '&:hover fieldset': { borderColor: '#6d2323' },
                            '&.Mui-focused fieldset': {
                              borderColor: '#6d2323',
                              borderWidth: 2,
                            },
                          },
                        }}
                      />
                    )}
                    sx={{ width: '100%' }}
                  />
                  <Box sx={{ minHeight: 24, mt: 0.75 }}>
                    {selectedEmployee && selectedEmployeeGender && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: '#888', fontWeight: 700 }}
                        >
                          Gender:
                        </Typography>
                        <GenderBadge gender={selectedEmployeeGender} />
                        <Typography
                          variant="caption"
                          sx={{ color: '#aaa', fontWeight: 600 }}
                        >
                          {filteredLeaveTypesForNew.length < leaveTypes.length
                            ? `(${leaveTypes.length - filteredLeaveTypesForNew.length} type(s) hidden)`
                            : '(all types available)'}
                        </Typography>
                      </Box>
                    )}
                    {selectedEmployee && !selectedEmployeeGender && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <WarningIcon sx={{ fontSize: 14, color: '#e65100' }} />
                        <Typography
                          variant="caption"
                          sx={{ color: '#e65100', fontWeight: 700 }}
                        >
                          No gender on file — gender-restricted types hidden.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Leave Type */}
              <Grid item xs={12} md={5}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <FieldLabel
                    endAdornment={
                      selectedEmployee && selectedEmployeeGender ? (
                        <Tooltip
                          title={`Showing gender-appropriate types for ${selectedEmployeeGender}`}
                        >
                          <GenderIcon
                            sx={{ fontSize: 15, color: '#aaa', cursor: 'help' }}
                          />
                        </Tooltip>
                      ) : null
                    }
                  >
                    Leave Type *
                  </FieldLabel>
                  <FormControl>
                    <Select
                      value={newAssignment.leave_code || ''}
                      displayEmpty
                      size="medium"
                      onChange={(e) => {
                        setNewAssignment((prev) => ({
                          ...prev,
                          leave_code: e.target.value,
                        }));
                        setError('');
                      }}
                      startAdornment={
                        <InputAdornment position="start" sx={{ ml: 1 }}>
                          <WorkIcon sx={{ color: '#6d2323' }} />
                        </InputAdornment>
                      }
                      sx={{
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(109,35,35,0.2)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6d2323',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6d2323',
                          borderWidth: 2,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Choose a leave type...</em>
                      </MenuItem>
                      {filteredLeaveTypesForNew.map((type) => {
                        const restriction = getLeaveGenderRestriction(type);
                        return (
                          <MenuItem
                            key={type.id || type.leave_code}
                            value={type.leave_code}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 900 }}
                              >
                                {getLeaveLabel(type.leave_code, leaveTypes)}
                              </Typography>
                              {restriction === 'male' && (
                                <MaleIcon
                                  sx={{
                                    fontSize: 16,
                                    color: '#1565C0',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              {restriction === 'female' && (
                                <FemaleIcon
                                  sx={{
                                    fontSize: 16,
                                    color: '#C2185B',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <Box
                    sx={{
                      minHeight: 24,
                      mt: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {leaveGenderRestriction && newAssignment.leave_code && (
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        {leaveGenderRestriction === 'male' ? (
                          <MaleIcon sx={{ fontSize: 13, color: '#1565C0' }} />
                        ) : (
                          <FemaleIcon sx={{ fontSize: 13, color: '#C2185B' }} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color:
                              leaveGenderRestriction === 'male'
                                ? '#1565C0'
                                : '#C2185B',
                          }}
                        >
                          {leaveGenderRestriction === 'male'
                            ? 'Male employees only'
                            : 'Female employees only'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Carry-Over */}
              <Grid item xs={12} md={3}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <FieldLabel
                    endAdornment={
                      <Chip
                        label={
                          commutedDaysForNew > 0
                            ? 'From Commutation'
                            : 'From History'
                        }
                        size="small"
                        icon={
                          commutedDaysForNew > 0 ? (
                            <CommutationIcon style={{ fontSize: 11 }} />
                          ) : undefined
                        }
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          bgcolor:
                            commutedDaysForNew > 0
                              ? 'rgba(109,35,35,0.1)'
                              : 'rgba(46,125,50,0.1)',
                          color: commutedDaysForNew > 0 ? '#6d2323' : '#2E7D32',
                          fontWeight: 900,
                        }}
                      />
                    }
                  >
                    Carry-Over
                  </FieldLabel>
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${commutedDaysForNew > 0 ? 'rgba(109,35,35,0.3)' : 'rgba(46,125,50,0.3)'}`,
                      bgcolor:
                        commutedDaysForNew > 0
                          ? 'rgba(109,35,35,0.04)'
                          : 'rgba(46,125,50,0.04)',
                      px: 2,
                      height: 50,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {commutedDaysForNew > 0 ? (
                        <CommutationIcon
                          sx={{ color: '#6d2323', fontSize: 17 }}
                        />
                      ) : (
                        <CalendarIcon sx={{ color: '#2E7D32', fontSize: 17 }} />
                      )}
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: commutedDaysForNew > 0 ? '#6d2323' : '#2E7D32',
                          fontSize: '1.05rem',
                        }}
                      >
                        {parseFloat(newAssignment.carried_forward_days) || 0}{' '}
                        days
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#888', fontWeight: 900 }}
                    >
                      = {carriedHoursNew} hrs
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      minHeight: 24,
                      mt: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: commutedDaysForNew > 0 ? '#6d2323' : '#2E7D32',
                      }}
                    >
                      {commutedDaysForNew > 0
                        ? 'Auto-filled from commutation'
                        : 'No carry-over'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* New Credits */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <FieldLabel>New Credits (This Period) *</FieldLabel>
                  <DaysInputField
                    value={newAssignment.allocated_days}
                    onChange={(days) => {
                      setNewAssignment((prev) => ({
                        ...prev,
                        allocated_days: days,
                      }));
                      setError('');
                    }}
                    color="#1976d2"
                  />
                  <FieldHelper color="#1976d2" strong>
                    Credits for this period only
                  </FieldHelper>
                </Box>
              </Grid>

              {/* Period Year */}
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <FieldLabel>Period Year</FieldLabel>
                  <TextField
                    type="number"
                    value={newAssignment.period_year}
                    onChange={(e) =>
                      setNewAssignment((prev) => ({
                        ...prev,
                        period_year: e.target.value,
                      }))
                    }
                    placeholder="Year..."
                    fullWidth
                    size="medium"
                    inputProps={{ min: 2020, max: 2030 }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' },
                        '&:hover fieldset': { borderColor: '#6d2323' },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6d2323',
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                  <FieldHelper>e.g., 2024, 2025</FieldHelper>
                </Box>
              </Grid>

              {/* This Period Total */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <FieldLabel>This Period Total</FieldLabel>
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: '2px solid rgba(109,35,35,0.3)',
                      bgcolor: '#f5f5f5',
                      px: 2,
                      height: 50,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: '#6d2323',
                        fontSize: '1rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(Number.isFinite(totalDaysNew)
                        ? totalDaysNew
                        : 0
                      ).toFixed(1)}{' '}
                      days
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: '#999',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {totalHoursNew || 0} hrs
                    </Typography>
                  </Box>
                  <FieldHelper color="#6d2323" strong>
                    Credits for this period only
                  </FieldHelper>
                </Box>
              </Grid>

              {/* Assign Button */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ minHeight: 24, mb: 0.75 }} />
                  <Button
                    onClick={handleAdd}
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<AddIcon />}
                    disabled={
                      loading ||
                      !selectedEmployee ||
                      !newAssignment.leave_code ||
                      !allocatedHoursNew
                    }
                    sx={{
                      height: 56,
                      borderRadius: 2,
                      fontWeight: 900,
                      backgroundColor:
                        !selectedEmployee ||
                        !newAssignment.leave_code ||
                        !allocatedHoursNew
                          ? '#cccccc'
                          : '#6D2323',
                      color:
                        !selectedEmployee ||
                        !newAssignment.leave_code ||
                        !allocatedHoursNew
                          ? '#666'
                          : '#FFF',
                      boxShadow:
                        !selectedEmployee ||
                        !newAssignment.leave_code ||
                        !allocatedHoursNew
                          ? 'none'
                          : '0 4px 12px rgba(109,35,35,0.3)',
                      '&:hover': {
                        backgroundColor:
                          !selectedEmployee ||
                          !newAssignment.leave_code ||
                          !allocatedHoursNew
                            ? '#cccccc'
                            : '#5a1d1d',
                      },
                      '&:disabled': {
                        backgroundColor: '#cccccc !important',
                        color: '#666 !important',
                      },
                    }}
                  >
                    {loading ? 'Adding...' : 'Assign'}
                  </Button>
                  <FieldHelper> </FieldHelper>
                </Box>
              </Grid>
            </Grid>

            {/* Carry Forward Summary */}
            {selectedEmployee && newAssignment.leave_code && (
              <Box sx={{ mt: 3 }}>
                {selectedLeaveAssignments.length > 0 ? (
                  <CarryForwardSummary
                    leaveCode={newAssignment.leave_code}
                    employeeAssignments={employeeAssignments}
                    commutedDays={commutedDaysForNew}
                  />
                ) : (
                  <Alert
                    severity="info"
                    icon={<EventNote />}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: 'rgba(109,35,35,0.04)',
                      border: '1px solid rgba(109,35,35,0.12)',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 900, color: '#6d2323' }}
                    >
                      No previous assignments found
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: '#666', fontWeight: 700 }}
                    >
                      First time assigning{' '}
                      <strong>{newAssignment.leave_code}</strong> to this
                      employee. No carry-over.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>
        </GlassCard>

        {/* Records Section */}
        <GlassCard sx={{ mb: { xs: 6, md: 10 }, overflow: 'visible' }}>
          <Box
            sx={{
              p: 4,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
              color: '#6d2323',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{ bgcolor: 'rgba(109,35,35,0.15)', width: 56, height: 56 }}
              >
                <ReorderIcon sx={{ fontSize: 28, color: '#6d2323' }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 900, color: '#6d2323' }}
                >
                  Leave Assignment Records
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.85, color: '#8B3333', fontWeight: 800 }}
                >
                  {employeeGroups.length}{' '}
                  {employeeGroups.length === 1 ? 'employee' : 'employees'} ·{' '}
                  {filteredAssignments.length}{' '}
                  {filteredAssignments.length === 1
                    ? 'assignment'
                    : 'assignments'}
                </Typography>
              </Box>
            </Box>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search by name or employee number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#fff',
                  '& fieldset': { borderColor: 'rgba(109,35,35,0.2)' },
                  '&:hover fieldset': { borderColor: '#6d2323' },
                  '&.Mui-focused fieldset': { borderColor: '#6d2323' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#6d2323' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <CardContent sx={{ p: 4, overflow: 'visible' }}>
            {filteredAssignments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <EventNote
                  sx={{ fontSize: 56, color: 'rgba(109,35,35,0.3)', mb: 2 }}
                />
                <Typography
                  variant="h6"
                  sx={{ color: '#6D2323', fontWeight: 900, mb: 1 }}
                >
                  {assignments.length === 0
                    ? 'No Leave Assignments Found'
                    : 'No Matching Records'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#888',
                    maxWidth: 400,
                    mx: 'auto',
                    fontWeight: 800,
                  }}
                >
                  {assignments.length === 0
                    ? 'Assign leave credits using the form above.'
                    : 'Try adjusting your search.'}
                </Typography>
              </Box>
            ) : (
              <>
                <Grid container spacing={2}>
                  {paginatedEmployeeGroups.map((employeeGroup) => {
                    const allActivePeriods = employeeGroup.leaveTypes.flatMap(
                      (lt) => getActivePeriods(lt.periods),
                    );
                    const totalHours = allActivePeriods.reduce(
                      (s, p) => s + toNum(p.total_hours),
                      0,
                    );
                    const usedHours = allActivePeriods.reduce(
                      (s, p) => s + toNum(p.used_hours),
                      0,
                    );
                    const remainingHours = allActivePeriods.reduce(
                      (s, p) => s + toNum(p.remaining_hours),
                      0,
                    );
                    const overallColor = getStatusColor(
                      remainingHours,
                      totalHours,
                    );
                    const empInfo = getEmployeeInfo(
                      employeeGroup.employeeNumber,
                    );
                    const empGender = empInfo?.sex || empInfo?.gender;
                    const initials =
                      `${employeeGroup.firstName?.[0] || ''}${employeeGroup.lastName?.[0] || ''}`.toUpperCase() ||
                      employeeGroup.fullName?.[0] ||
                      '?';

                    return (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        lg={3}
                        key={employeeGroup.employeeNumber}
                      >
                        <Box
                          onClick={() => {
                            setSelectedEmployeeLeaves(employeeGroup);
                            setSelectedLeaveTypeInModal(null);
                            setEmployeeLeavesModalOpen(true);
                          }}
                          sx={{
                            border: '1.5px solid rgba(109,35,35,0.15)',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            bgcolor: '#ffffff',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: '#6d2323',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 24px rgba(109,35,35,0.12)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              px: 2,
                              py: 1.75,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              borderBottom: '1px solid rgba(109,35,35,0.1)',
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: '#6d2323',
                                width: 40,
                                height: 40,
                                fontSize: '0.8rem',
                                fontWeight: 900,
                                borderRadius: '8px',
                              }}
                            >
                              {initials}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: '#1a1a1a',
                                  fontSize: '0.85rem',
                                  lineHeight: 1.25,
                                  mb: 0.2,
                                }}
                                noWrap
                              >
                                {employeeGroup.fullName}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: '0.68rem',
                                    color: '#aaa',
                                    fontWeight: 600,
                                  }}
                                >
                                  #{employeeGroup.employeeNumber}
                                </Typography>
                                {empGender && (
                                  <GenderBadge gender={empGender} />
                                )}
                              </Box>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              px: 2,
                              py: 1.5,
                              display: 'flex',
                              gap: 1,
                              bgcolor: '#faf9f8',
                            }}
                          >
                            <StatPill
                              label="Total"
                              value={(totalHours / 8).toFixed(1)}
                              color="#1a1a1a"
                            />
                            <StatPill
                              label="Used"
                              value={(usedHours / 8).toFixed(1)}
                              color="#c25b00"
                            />
                            <Box
                              sx={{
                                flex: 1,
                                px: 1.5,
                                py: 1,
                                bgcolor: '#ffffff',
                                border: `1.5px solid ${overallColor}30`,
                                borderRadius: '6px',
                                textAlign: 'center',
                              }}
                            >
                              <RemainingBalance
                                hoursLike={remainingHours}
                                color={overallColor}
                                alignItems="center"
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.58rem',
                                  color: '#aaa',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                  mt: 0.3,
                                }}
                              >
                                Left
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                color: '#aaa',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                mb: 0.75,
                              }}
                            >
                              Leave Credits
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 0.6,
                                flexWrap: 'wrap',
                              }}
                            >
                              {employeeGroup.leaveTypes.map((lt) => {
                                const activeStats = getLeaveTypeStatsActive(
                                  lt.periods,
                                );
                                const key = `${employeeGroup.employeeNumber}_${lt.leave_code}`;
                                const commutedDays = toNum(commutationMap[key]);
                                const displayDays =
                                  commutedDays > 0
                                    ? commutedDays
                                    : activeStats.remainingHours / 8;
                                const sc =
                                  commutedDays > 0
                                    ? '#6d2323'
                                    : getStatusColor(
                                        activeStats.remainingHours,
                                        activeStats.totalHours,
                                      );
                                return (
                                  <Box
                                    key={lt.leave_code}
                                    title={
                                      commutedDays > 0
                                        ? 'Carried balance from commutation'
                                        : 'Remaining balance'
                                    }
                                    sx={{
                                      px: 1,
                                      py: 0.3,
                                      borderRadius: '4px',
                                      bgcolor: `${sc}10`,
                                      border: `1px solid ${sc}30`,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: sc,
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {lt.leave_code} {displayDays.toFixed(1)}d
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                <Box
                  sx={{ mt: 3, borderTop: '1px solid rgba(0,0,0,0.06)', pt: 1 }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Box sx={{ width: '100%', maxWidth: 520 }}>
                      <TablePagination
                        component="div"
                        count={employeeGroups.length}
                        page={recordsPage}
                        onPageChange={(e, newPage) => setRecordsPage(newPage)}
                        rowsPerPage={recordsRowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRecordsRowsPerPage(parseInt(e.target.value, 10));
                          setRecordsPage(0);
                        }}
                        rowsPerPageOptions={[8, 12, 16, 24, 32, 48]}
                        labelRowsPerPage="Rows per page"
                        sx={{
                          '& .MuiTablePagination-toolbar': { px: 0 },
                          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                            { fontWeight: 900, color: '#6d2323' },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </CardContent>
        </GlassCard>

        {/* Employee Leaves Modal */}
        <Modal
          open={employeeLeavesModalOpen}
          onClose={() => {
            setEmployeeLeavesModalOpen(false);
            setSelectedEmployeeLeaves(null);
            setSelectedLeaveTypeInModal(null);
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Box
            sx={{
              backgroundColor: '#fff',
              borderRadius: 4,
              width: '95%',
              maxWidth: '1100px',
              height: '85vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {selectedEmployeeLeaves && (
              <>
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, #6D2323 0%, #8B4545 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexShrink: 0,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha('#ffffff', 0.2),
                      color: '#ffffff',
                      width: 56,
                      height: 56,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 'bold',
                          color: '#ffffff',
                          lineHeight: 1.1,
                        }}
                        noWrap
                      >
                        {selectedEmployeeLeaves.fullName}
                      </Typography>
                      {(() => {
                        const info = getEmployeeInfo(
                          selectedEmployeeLeaves.employeeNumber,
                        );
                        const g = info?.sex || info?.gender;
                        return g ? <GenderBadge gender={g} light /> : null;
                      })()}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ color: '#ffffff', opacity: 0.9 }}
                    >
                      Employee ID: {selectedEmployeeLeaves.employeeNumber} •{' '}
                      {selectedEmployeeLeaves.leaveTypes.length} Leave Type(s)
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => {
                      setEmployeeLeavesModalOpen(false);
                      setSelectedEmployeeLeaves(null);
                      setSelectedLeaveTypeInModal(null);
                    }}
                    variant="outlined"
                    size="small"
                    startIcon={<ChevronLeftIcon />}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.4)',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        borderColor: '#fff',
                      },
                    }}
                  >
                    Back
                  </Button>
                  <IconButton
                    onClick={() => {
                      setEmployeeLeavesModalOpen(false);
                      setSelectedEmployeeLeaves(null);
                      setSelectedLeaveTypeInModal(null);
                    }}
                    sx={{ color: '#fff' }}
                  >
                    <Close />
                  </IconButton>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
                    minHeight: 0,
                  }}
                >
                  <Box
                    sx={{
                      borderRight: {
                        xs: 'none',
                        md: '1px solid rgba(0,0,0,0.08)',
                      },
                      p: 2.5,
                      overflowY: 'auto',
                      minHeight: 0,
                      bgcolor: 'rgba(0,0,0,0.015)',
                    }}
                  >
                    <Typography
                      sx={{ fontWeight: 900, color: '#6d2323', mb: 1 }}
                    >
                      Leave Types
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#777',
                        display: 'block',
                        mb: 2,
                        fontWeight: 800,
                      }}
                    >
                      Click a leave type to view periods on the right.
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.25,
                      }}
                    >
                      {selectedEmployeeLeaves.leaveTypes.map((lt) => {
                        const stats = getLeaveTypeStatsActive(lt.periods);
                        const sc = getStatusColor(
                          stats.remainingHours,
                          stats.totalHours,
                        );
                        const isActive =
                          selectedLeaveTypeInModal?.leave_code ===
                          lt.leave_code;
                        const ltObj = leaveTypes.find(
                          (x) => x.leave_code === lt.leave_code,
                        );
                        const restriction = ltObj
                          ? getLeaveGenderRestriction(ltObj)
                          : null;
                        return (
                          <Box
                            key={lt.leave_code}
                            onClick={() => setSelectedLeaveTypeInModal(lt)}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              cursor: 'pointer',
                              border: isActive
                                ? `2px solid ${sc}`
                                : `1px solid ${sc}40`,
                              bgcolor: isActive ? `${sc}10` : '#fff',
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: `0 6px 18px ${sc}25`,
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              {restriction === 'male' && (
                                <MaleIcon
                                  sx={{ fontSize: 14, color: '#1565C0' }}
                                />
                              )}
                              {restriction === 'female' && (
                                <FemaleIcon
                                  sx={{ fontSize: 14, color: '#C2185B' }}
                                />
                              )}
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  color: '#6d2323',
                                  lineHeight: 1.15,
                                }}
                              >
                                {getLeaveLabel(lt.leave_code, leaveTypes)}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mt: 1,
                              }}
                            >
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#888',
                                    display: 'block',
                                    fontWeight: 900,
                                  }}
                                >
                                  Available Balance
                                </Typography>
                                <RemainingBalance
                                  hoursLike={stats.remainingHours}
                                  color={sc}
                                  alignItems="flex-start"
                                />
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#888',
                                    display: 'block',
                                    fontWeight: 900,
                                  }}
                                >
                                  Credits / Used
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 900, color: '#555' }}
                                >
                                  {(stats.totalHours / 8).toFixed(1)}d /{' '}
                                  {(stats.usedHours / 8).toFixed(1)}d
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                mt: 1.25,
                                pt: 1.25,
                                borderTop: '1px solid rgba(0,0,0,0.06)',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: '#888', fontWeight: 900 }}
                              >
                                {lt.periods.length} period(s)
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Box sx={{ p: 2.5, overflowY: 'auto', minHeight: 0 }}>
                    {!selectedLeaveTypeInModal ? (
                      <Box
                        sx={{
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
                          <EventNote
                            sx={{
                              fontSize: 58,
                              color: 'rgba(109,35,35,0.22)',
                              mb: 1.5,
                            }}
                          />
                          <Typography
                            sx={{ fontWeight: 900, color: '#6d2323', mb: 1 }}
                          >
                            Select a leave type
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: '#777', fontWeight: 800 }}
                          >
                            Choose a leave type on the left to see per-period
                            credits, usage, and remaining balance.
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Box
                          sx={{
                            mb: 2,
                            p: 2,
                            borderRadius: 2.5,
                            border: '1px solid rgba(109,35,35,0.12)',
                            bgcolor: 'rgba(109,35,35,0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{ fontWeight: 900, color: '#6d2323' }}
                            >
                              {getLeaveLabel(
                                selectedLeaveTypeInModal.leave_code,
                                leaveTypes,
                              )}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: '#666', fontWeight: 800 }}
                            >
                              Period breakdown — use Edit to modify, Transfer to
                              commute
                            </Typography>
                          </Box>
                          <Chip
                            label={`${selectedLeaveTypeInModal.periods.length} period(s)`}
                            sx={{
                              bgcolor: 'rgba(109,35,35,0.12)',
                              color: '#6d2323',
                              fontWeight: 900,
                            }}
                          />
                        </Box>

                        {commuteSuccess && (
                          <Alert
                            severity="success"
                            icon={<CheckIcon />}
                            sx={{ mb: 2, borderRadius: 2 }}
                          >
                            {commuteSuccess}
                          </Alert>
                        )}

                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          {[...selectedLeaveTypeInModal.periods]
                            .sort((a, b) => {
                              if (b.period_year !== a.period_year)
                                return b.period_year - a.period_year;
                              return (
                                semOrder(b.period_semester) -
                                semOrder(a.period_semester)
                              );
                            })
                            .map((period, index) => {
                              const sc = getStatusColor(
                                period.remaining_hours,
                                period.total_hours,
                              );
                              const isLatest = index === 0;
                              const isLocked = isCommutedLocked(period);
                              return (
                                <Box
                                  key={period.id}
                                  sx={{
                                    borderRadius: 2,
                                    border: isLatest
                                      ? '2px solid #2E7D32'
                                      : '1px solid rgba(109,35,35,0.15)',
                                    bgcolor: isLatest
                                      ? 'rgba(46,125,50,0.06)'
                                      : '#fff',
                                    position: 'relative',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {isLatest && (
                                    <Chip
                                      label="Latest (Most Recent)"
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        bgcolor: '#2E7D32',
                                        color: '#fff',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        height: 24,
                                      }}
                                    />
                                  )}
                                  <Box
                                    sx={{
                                      p: 2.5,
                                      opacity: isLocked ? 0.85 : 1,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        mb: 1.5,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          p: 1,
                                          borderRadius: 1.5,
                                          bgcolor: `${sc}20`,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontWeight: 900,
                                            color: sc,
                                            fontSize: '0.9rem',
                                          }}
                                        >
                                          {periodLabel(
                                            period.period_year,
                                            period.period_semester,
                                          )}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                          sx={{
                                            fontWeight: 900,
                                            color: '#6d2323',
                                            mb: 0.3,
                                          }}
                                        >
                                          {periodLabel(
                                            period.period_year,
                                            period.period_semester,
                                          )}
                                        </Typography>
                                        {isLocked && (
                                          <Chip
                                            size="small"
                                            icon={
                                              <CommutationIcon
                                                style={{ fontSize: 11 }}
                                              />
                                            }
                                            label="Commuted (Locked)"
                                            sx={{
                                              height: 20,
                                              fontSize: '0.65rem',
                                              bgcolor: 'rgba(109,35,35,0.12)',
                                              color: '#6d2323',
                                              fontWeight: 900,
                                            }}
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                    {isLocked && (
                                      <Alert
                                        severity="info"
                                        sx={{
                                          borderRadius: 2,
                                          mb: 1.75,
                                          bgcolor: 'rgba(109,35,35,0.04)',
                                          border:
                                            '1px solid rgba(109,35,35,0.12)',
                                        }}
                                      >
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 800,
                                            color: '#6d2323',
                                          }}
                                        >
                                          Note: Commuted periods are locked and
                                          can no longer be edited or deleted.
                                        </Typography>
                                      </Alert>
                                    )}
                                    <Box
                                      sx={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                          'repeat(4, 1fr) 1.25fr',
                                        gap: 1,
                                      }}
                                    >
                                      {[
                                        [
                                          'New Credits',
                                          toNum(period.allocated_hours) / 8,
                                          '#6d2323',
                                          'rgba(109,35,35,0.05)',
                                        ],
                                        [
                                          'Used',
                                          toNum(period.used_hours) / 8,
                                          '#ed6c02',
                                          'rgba(237,108,2,0.05)',
                                        ],
                                        [
                                          'Available',
                                          toNum(period.remaining_hours) / 8,
                                          sc,
                                          `${sc}15`,
                                        ],
                                        [
                                          'Total',
                                          toNum(period.total_hours) / 8,
                                          '#2E7D32',
                                          'rgba(46,125,50,0.05)',
                                        ],
                                      ].map(([label, val, color, bg]) => (
                                        <Box
                                          key={label}
                                          sx={{
                                            textAlign: 'center',
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: bg,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              color: '#888',
                                              display: 'block',
                                              mb: 0.3,
                                              fontSize: '0.6rem',
                                              fontWeight: 900,
                                            }}
                                          >
                                            {label}
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontWeight: 900,
                                              color,
                                              fontSize: '0.92rem',
                                            }}
                                          >
                                            {Number(val).toFixed(1)}d
                                          </Typography>
                                        </Box>
                                      ))}
                                      <Box
                                        sx={{
                                          textAlign: 'center',
                                          p: 1,
                                          borderRadius: 1,
                                          bgcolor:
                                            toNum(
                                              period.carried_forward_hours,
                                            ) > 0
                                              ? 'rgba(46,125,50,0.08)'
                                              : 'rgba(0,0,0,0.03)',
                                          border:
                                            toNum(
                                              period.carried_forward_hours,
                                            ) > 0
                                              ? '1.5px solid rgba(46,125,50,0.3)'
                                              : '1.5px dashed rgba(0,0,0,0.12)',
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color:
                                              toNum(
                                                period.carried_forward_hours,
                                              ) > 0
                                                ? '#2E7D32'
                                                : '#aaa',
                                            display: 'block',
                                            mb: 0.3,
                                            fontSize: '0.6rem',
                                            fontWeight: 900,
                                          }}
                                        >
                                          Carry-Over
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontWeight: 900,
                                            color:
                                              toNum(
                                                period.carried_forward_hours,
                                              ) > 0
                                                ? '#2E7D32'
                                                : '#bbb',
                                            fontSize: '0.92rem',
                                          }}
                                        >
                                          {(
                                            toNum(
                                              period.carried_forward_hours,
                                            ) / 8
                                          ).toFixed(1)}
                                          d
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: '0.55rem',
                                            color: '#777',
                                            fontWeight: 900,
                                            mt: 0.25,
                                          }}
                                        >
                                          (info only)
                                        </Typography>
                                      </Box>
                                    </Box>
                                    {isLocked && (
                                      <Box
                                        sx={{
                                          mt: 1.5,
                                          pt: 1.5,
                                          borderTop:
                                            '1px solid rgba(109,35,35,0.1)',
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: '#8B3333',
                                            fontWeight: 900,
                                          }}
                                        >
                                          This period is commuted and locked.
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                  <Box
                                    sx={{
                                      borderTop:
                                        '1px solid rgba(109,35,35,0.1)',
                                      px: 2.5,
                                      py: 1.5,
                                      bgcolor: canCommute(period)
                                        ? 'rgba(109,35,35,0.02)'
                                        : 'rgba(0,0,0,0.02)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 2,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{ color: '#777', fontWeight: 900 }}
                                    >
                                      {canCommute(period)
                                        ? `${(toNum(period.remaining_hours) / 8).toFixed(2)} days available to commute`
                                        : 'No remaining balance to commute'}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                      }}
                                    >
                                      {!isLocked && (
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(period);
                                            setIsEditing(true);
                                          }}
                                          variant="outlined"
                                          size="small"
                                          startIcon={<EditIcon />}
                                          sx={{
                                            borderRadius: 2,
                                            fontWeight: 900,
                                            fontSize: '0.75rem',
                                            borderColor: '#6d2323',
                                            color: '#6d2323',
                                            '&:hover': {
                                              bgcolor: 'rgba(109,35,35,0.06)',
                                            },
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openCommuteDialog({
                                            ...period,
                                            fullName:
                                              selectedEmployeeLeaves.fullName,
                                          });
                                        }}
                                        disabled={!canCommute(period)}
                                        variant={
                                          canCommute(period)
                                            ? 'contained'
                                            : 'outlined'
                                        }
                                        size="small"
                                        startIcon={<CommutationIcon />}
                                        sx={{
                                          borderRadius: 2,
                                          fontWeight: 900,
                                          fontSize: '0.75rem',
                                          bgcolor: canCommute(period)
                                            ? '#6d2323'
                                            : 'transparent',
                                          color: canCommute(period)
                                            ? '#fff'
                                            : '#aaa',
                                          borderColor: canCommute(period)
                                            ? '#6d2323'
                                            : '#ccc',
                                          '&:hover': {
                                            bgcolor: canCommute(period)
                                              ? '#5a1d1d'
                                              : 'transparent',
                                          },
                                          '&:disabled': {
                                            bgcolor: '#f5f5f5 !important',
                                            color: '#ccc !important',
                                            borderColor: '#eee !important',
                                          },
                                        }}
                                      >
                                        {canCommute(period)
                                          ? 'Transfer to Leave Commutation'
                                          : 'Already Commuted'}
                                      </Button>
                                    </Box>
                                  </Box>
                                </Box>
                              );
                            })}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Modal>

        {/* Edit Assignment Modal */}
        <Modal
          open={!!editAssignment}
          onClose={handleCloseModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              backgroundColor: '#fff',
              borderRadius: 4,
              width: '90%',
              maxWidth: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {editAssignment &&
              (() => {
                const isEditLocked = isCommutedLocked(editAssignment);
                return (
                  <>
                    <Box
                      sx={{
                        background:
                          'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)',
                        color: '#fff',
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            width: 48,
                            height: 48,
                          }}
                        >
                          <EditIcon sx={{ fontSize: 24 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900 }}>
                            Edit Leave Assignment
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ opacity: 0.85, fontWeight: 900 }}
                          >
                            {editAssignment.fullName ||
                              editAssignment.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        onClick={handleCloseModal}
                        sx={{ color: '#fff' }}
                      >
                        <Close />
                      </IconButton>
                    </Box>

                    <Box sx={{ p: 3 }}>
                      {error && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                          {error}
                        </Alert>
                      )}
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Employee Number
                          </Typography>
                          <TextField
                            value={editAssignment.employeeNumber || ''}
                            onChange={(e) =>
                              setEditAssignment({
                                ...editAssignment,
                                employeeNumber: e.target.value,
                              })
                            }
                            fullWidth
                            size="medium"
                            variant="outlined"
                            sx={{
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                              '& .MuiInputBase-input': {
                                color: '#000',
                                fontWeight: 900,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Leave Type
                          </Typography>
                          <FormControl fullWidth>
                            <Select
                              value={editAssignment.leave_code || ''}
                              onChange={(e) =>
                                setEditAssignment({
                                  ...editAssignment,
                                  leave_code: e.target.value,
                                })
                              }
                              displayEmpty
                              sx={{ borderRadius: 2 }}
                            >
                              <MenuItem value="">
                                <em>Select Leave Type</em>
                              </MenuItem>
                              {leaveTypes.map((t) => (
                                <MenuItem
                                  key={t.id || t.leave_code}
                                  value={t.leave_code}
                                >
                                  {getLeaveLabel(t.leave_code, leaveTypes)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Carried Forward Days
                          </Typography>
                          <DaysInputField
                            value={editCarriedDays}
                            onChange={setEditCarriedDays}
                            label="Carried Days"
                            color="#2E7D32"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Allocated Days (New Credits)
                          </Typography>
                          <DaysInputField
                            value={editAllocatedDays}
                            onChange={setEditAllocatedDays}
                            label="Allocated Days"
                            color="#1976d2"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Total Hours
                          </Typography>
                          <TextField
                            type="number"
                            value={toNum(editAssignment.total_hours)}
                            fullWidth
                            variant="standard"
                            InputProps={{
                              readOnly: true,
                              disableUnderline: true,
                              endAdornment: (
                                <InputAdornment position="end">
                                  hrs
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              '& .MuiInputBase-input': {
                                color: '#000',
                                fontWeight: 900,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Used Hours
                          </Typography>
                          <TextField
                            type="number"
                            value={toNum(editAssignment.used_hours)}
                            fullWidth
                            variant="standard"
                            InputProps={{
                              readOnly: true,
                              disableUnderline: true,
                              endAdornment: (
                                <InputAdornment position="end">
                                  hrs
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              '& .MuiInputBase-input': {
                                color: '#000',
                                fontWeight: 900,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 900, mb: 1, color: '#6d2323' }}
                          >
                            Remaining Hours
                          </Typography>
                          <TextField
                            type="number"
                            value={toNum(editAssignment.remaining_hours)}
                            onChange={(e) =>
                              setEditAssignment({
                                ...editAssignment,
                                remaining_hours:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            fullWidth
                            size="medium"
                            variant="outlined"
                            inputProps={{ min: 0, step: 1 }}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  hrs
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': { borderRadius: 2 },
                              '& .MuiInputBase-input': {
                                color: '#000',
                                fontWeight: 900,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Alert
                            severity="info"
                            sx={{
                              borderRadius: 2,
                              backgroundColor: 'rgba(109,35,35,0.04)',
                              border: '1px solid rgba(109,35,35,0.12)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#555',
                                fontWeight: 900,
                                display: 'block',
                                mb: 0.5,
                              }}
                            >
                              Remaining Balance
                            </Typography>
                            <RemainingBalance
                              hoursLike={toNum(editAssignment.remaining_hours)}
                              color={getStatusColor(
                                toNum(editAssignment.remaining_hours),
                                toNum(editAssignment.total_hours),
                              )}
                              alignItems="flex-start"
                              largeDays
                            />
                          </Alert>
                        </Grid>
                      </Grid>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          mt: 4,
                          gap: 2,
                        }}
                      >
                        {isEditLocked ? (
                          <Alert
                            severity="info"
                            sx={{
                              borderRadius: 2,
                              bgcolor: 'rgba(109,35,35,0.04)',
                              border: '1px solid rgba(109,35,35,0.12)',
                              width: '100%',
                            }}
                          >
                            <Typography sx={{ fontWeight: 900 }}>
                              Locked: This record is already commuted.
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, mt: 0.5 }}
                            >
                              To add credits for this leave type, create a new
                              assignment for a new period.
                            </Typography>
                          </Alert>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleDelete(editAssignment.id)}
                              variant="outlined"
                              startIcon={<DeleteIcon />}
                              sx={{
                                borderColor: '#d32f2f',
                                color: '#d32f2f',
                                borderRadius: 2,
                                px: 3,
                                fontWeight: 900,
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              onClick={handleCloseModal}
                              variant="outlined"
                              startIcon={<CancelIcon />}
                              sx={{
                                color: '#6d2323',
                                borderColor: '#6d2323',
                                borderRadius: 2,
                                px: 3,
                                fontWeight: 900,
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleUpdate}
                              variant="contained"
                              startIcon={<SaveIcon />}
                              sx={{
                                bgcolor: '#6D2323',
                                color: '#FFF',
                                borderRadius: 2,
                                px: 3,
                                '&:hover': { bgcolor: '#5a1d1d' },
                                fontWeight: 900,
                              }}
                            >
                              Save Changes
                            </Button>
                          </>
                        )}
                      </Box>
                    </Box>
                  </>
                );
              })()}
          </Box>
        </Modal>
      </Box>

      {/* ── Floating Action Button — outside transform Box so position:fixed works correctly ── */}
      <Tooltip
        title={`Auto-assign leave types to all ${[...new Set(assignments.map((a) => a.employeeNumber))].length} employees with existing records`}
        placement="left"
      >
        <Button
          onClick={() => setBulkAssignOpen(true)}
          variant="contained"
          startIcon={<AutoAssignIcon />}
          sx={{
            position: 'fixed',
            bottom: 70,
            right: 32,
            zIndex: 1200,
            bgcolor: '#6d2323',
            color: '#fff',
            borderRadius: 3,
            fontWeight: 900,
            px: 3,
            py: 1.5,
            fontSize: '0.875rem',
            boxShadow: '0 6px 20px rgba(109,35,35,0.45)',
            whiteSpace: 'nowrap',
            '&:hover': {
              bgcolor: '#5a1d1d',
              boxShadow: '0 8px 28px rgba(109,35,35,0.55)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Reset to Default
        </Button>
      </Tooltip>
    </>
  );
};

export default LeaveAssignment;
