import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  Chip,
  Paper,
  Collapse,
  Divider,
  styled,
  alpha,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  History as HistoryIcon,
} from '@mui/icons-material';
import axios from 'axios';

// ============================================
// HELPERS
// ============================================
const getStatusColor = (remaining, total) => {
  if (total === 0 || remaining === 0) return '#B71C1C';
  const pct = (remaining / total) * 100;
  if (pct > 50) return '#2E7D32';
  if (pct > 20) return '#EF6C00';
  return '#B71C1C';
};

const getStatusText = (remaining, total) => {
  if (total === 0) return 'Not available';
  if (remaining === 0) return 'Depleted';
  const pct = (remaining / total) * 100;
  if (pct > 50) return 'Available';
  if (pct > 20) return 'Running low';
  return 'Almost out';
};

const semOrder = (s) => {
  if (!s) return 0;
  const lower = s.toLowerCase();
  if (lower.includes('2nd')) return 2;
  if (lower.includes('1st')) return 1;
  return 0;
};

const periodLabel = (entry) => {
  if (!entry) return '';
  const yr = entry.period_year || '';
  const sem = entry.period_semester || '';
  return sem ? `${yr} ${sem}` : `${yr} Annual`;
};

/**
 * Groups raw per-period assignment rows by leave_code.
 * The most recent period = "current".
 * All older periods = "previous" → their remaining days sum = carried balance.
 */
const groupByLeaveCode = (rawAssignments) => {
  const byCode = {};
  rawAssignments.forEach((a) => {
    if (!byCode[a.code])
      byCode[a.code] = { code: a.code, name: a.name, entries: [] };
    byCode[a.code].entries.push(a);
  });

  return Object.values(byCode).map((group) => {
    const sorted = [...group.entries].sort((a, b) => {
      const yearDiff = (b.period_year || 0) - (a.period_year || 0);
      if (yearDiff !== 0) return yearDiff;
      return semOrder(b.period_semester) - semOrder(a.period_semester);
    });

    const current = sorted[0];
    const previousEntries = sorted.slice(1);

    const prevRemainingDays = previousEntries.reduce(
      (s, e) => s + e.remaining,
      0,
    );
    const prevTotalDays = previousEntries.reduce((s, e) => s + e.total, 0);
    const prevUsedDays = previousEntries.reduce((s, e) => s + e.used, 0);

    const currRemaining = current?.remaining ?? 0;
    const currTotal = current?.total ?? 0;
    const currUsed = current?.used ?? 0;
    const currAllocated = current?.allocated ?? currTotal;

    const grandTotal = currTotal + prevTotalDays;
    const grandRemaining = currRemaining + prevRemainingDays;
    const grandUsed = currUsed + prevUsedDays;

    return {
      code: group.code,
      name: group.name,
      current,
      previousEntries,
      currRemaining,
      currTotal,
      currUsed,
      currAllocated,
      prevRemainingDays,
      prevTotalDays,
      prevUsedDays,
      grandTotal,
      grandRemaining,
      grandUsed,
    };
  });
};

// ============================================
// PROGRESS BAR
// ============================================
const ProgressBar = styled(Box)(() => ({
  height: 6,
  backgroundColor: '#f0f0f0',
  borderRadius: 3,
  overflow: 'hidden',
}));

const ProgressFill = styled(Box)(({ width, color }) => ({
  height: '100%',
  width: `${Math.min(Math.max(width, 0), 100)}%`,
  backgroundColor: color,
  borderRadius: 3,
  transition: 'width 0.5s ease',
}));

// ============================================
// SINGLE LEAVE GROUP CARD
// ============================================
const LeaveGroupCard = ({ group, accentColor }) => {
  const [expanded, setExpanded] = useState(false);

  const hasPrevious = group.previousEntries.length > 0;
  const statusColor = getStatusColor(group.currRemaining, group.currTotal);
  const statusText = getStatusText(group.currRemaining, group.currTotal);
  const currPct =
    group.currTotal > 0 ? (group.currRemaining / group.currTotal) * 100 : 0;

  const currColor = getStatusColor(group.currRemaining, group.currTotal);
  const prevColor = group.prevRemainingDays > 0 ? '#EF6C00' : '#9e9e9e';

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(accentColor, 0.1)}`,
        bgcolor: '#FAFAFA',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': { borderColor: alpha(accentColor, 0.2), bgcolor: '#fff' },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* ── Title row ── */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1.25,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
              }}
            >
              <Typography
                sx={{ fontWeight: 800, color: '#2a2a2a', fontSize: '0.85rem' }}
              >
                {group.code}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: '#888', fontSize: '0.72rem' }}
              >
                {group.name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right', ml: 2, flexShrink: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                color: statusColor,
                lineHeight: 1,
                fontSize: '1.15rem',
              }}
            >
              {group.currRemaining.toFixed(3)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#aaa', fontSize: '0.68rem' }}
            >
              / {group.currTotal.toFixed(3)} days current
            </Typography>
          </Box>
        </Box>

        {/* ── Two-column breakdown: Carried Balance | Current Period ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: hasPrevious ? '1fr 1px 1fr' : '1fr',
            borderRadius: 1.5,
            border: `1px solid ${alpha(accentColor, 0.08)}`,
            overflow: 'hidden',
            bgcolor: '#fff',
            mb: 1.25,
          }}
        >
          {/* LEFT – Carried Balance (sum of all previous period remainders) */}
          {hasPrevious && (
            <>
              <Box sx={{ p: 1.25, bgcolor: alpha(prevColor, 0.04) }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: '#888',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    mb: 0.5,
                  }}
                >
                  Carried Balance
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: prevColor,
                    fontSize: '1.05rem',
                    lineHeight: 1,
                  }}
                >
                  {group.prevRemainingDays.toFixed(3)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: '#bbb', fontSize: '0.63rem' }}
                >
                  days · {group.previousEntries.length} prev. period
                  {group.previousEntries.length !== 1 ? 's' : ''}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#999',
                    fontSize: '0.6rem',
                    fontStyle: 'italic',
                    display: 'block',
                    mt: 0.5,
                  }}
                >
                  (For reference only—cannot be deducted)
                </Typography>
              </Box>

              {/* Thin separator */}
              <Box sx={{ bgcolor: alpha(accentColor, 0.08) }} />
            </>
          )}

          {/* RIGHT – Current Period */}
          <Box sx={{ p: 1.25, bgcolor: alpha(currColor, 0.03) }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#888',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Current Period
              </Typography>
              {group.current?.period_year && (
                <Chip
                  label={periodLabel(group.current)}
                  size="small"
                  sx={{
                    height: 15,
                    fontSize: '0.57rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(46,125,50,0.15)', // Green background
                    color: '#2E7D32', // Green text
                    '& .MuiChip-label': { px: 0.6 },
                  }}
                />
              )}
            </Box>
            <Typography
              sx={{
                fontWeight: 800,
                color: currColor,
                fontSize: '1.05rem',
                lineHeight: 1,
              }}
            >
              {group.currRemaining.toFixed(3)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#bbb', fontSize: '0.63rem' }}
            >
              of {group.currAllocated.toFixed(3)} allocated
            </Typography>
          </Box>
        </Box>

        {/* Overall progress bar */}
        <ProgressBar>
          <ProgressFill width={currPct} color={statusColor} />
        </ProgressBar>

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: '#bbb', fontSize: '0.68rem' }}
            >
              Used: {group.currUsed.toFixed(3)} d
            </Typography>
            {hasPrevious && (
              <Box
                onClick={() => setExpanded((v) => !v)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  cursor: 'pointer',
                  color: alpha(accentColor, 0.55),
                  '&:hover': { color: accentColor },
                }}
              >
                <HistoryIcon sx={{ fontSize: 12 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.67rem', fontWeight: 700 }}
                >
                  History
                </Typography>
                {expanded ? (
                  <ExpandLess sx={{ fontSize: 12 }} />
                ) : (
                  <ExpandMore sx={{ fontSize: 12 }} />
                )}
              </Box>
            )}
          </Box>
          <Chip
            label={statusText}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              fontWeight: 700,
              bgcolor: alpha(statusColor, 0.1),
              color: statusColor,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Box>
      </Box>

      {/* ── Previous periods detail (collapsed by default) ── */}
      {hasPrevious && (
        <Collapse in={expanded}>
          <Divider sx={{ borderColor: alpha(accentColor, 0.07) }} />
          <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(accentColor, 0.015) }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#999',
                fontSize: '0.63rem',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                display: 'block',
                mb: 1,
              }}
            >
              Previous Periods
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {group.previousEntries.map((entry, i) => {
                const c = getStatusColor(entry.remaining, entry.total);
                return (
                  <Box
                    key={i}
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(c, 0.2)}`,
                      bgcolor: alpha(c, 0.04),
                      minWidth: 90,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: '#666',
                        fontSize: '0.63rem',
                        display: 'block',
                      }}
                    >
                      {periodLabel(entry)}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        sx={{ fontWeight: 800, color: c, fontSize: '0.88rem' }}
                      >
                        {entry.remaining.toFixed(3)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#ccc', fontSize: '0.63rem' }}
                      >
                        /{entry.total.toFixed(3)}d
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#bbb', fontSize: '0.6rem' }}
                    >
                      used {entry.used.toFixed(3)}d
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

// ============================================
// COMPACT VIEW – Admin chips
// ============================================
const CompactView = ({ rawCredits, loading, accentColor }) => {
  if (loading)
    return <CircularProgress size={16} sx={{ color: accentColor }} />;

  const grouped = groupByLeaveCode(rawCredits);

  if (grouped.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: '#999' }}>
        No leave credits assigned
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        alignItems: 'center',
      }}
    >
      {grouped.map((g, i) => {
        const color = g.grandRemaining > 0 ? '#2e7d32' : '#d32f2f';
        return (
          <Chip
            key={i}
            label={`${g.code}: ${g.grandRemaining.toFixed(3)} days`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: alpha(color, 0.1),
              color,
              border: `1px solid ${alpha(color, 0.3)}`,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        );
      })}
    </Box>
  );
};

// ============================================
// FULL VIEW – User panel
// ============================================
const FullView = ({
  rawCredits,
  loading,
  error,
  onRetry,
  accentColor,
  accentDark,
}) => {
  const grouped = groupByLeaveCode(rawCredits);
  const totalRemaining = grouped.reduce((sum, g) => sum + g.currRemaining, 0);

  if (loading)
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={28} sx={{ color: accentColor }} />
        <Typography variant="body2" sx={{ mt: 1.5, color: '#666' }}>
          Loading leave credits...
        </Typography>
      </Box>
    );

  if (error)
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
        <Button onClick={onRetry} size="small" sx={{ ml: 1 }}>
          Retry
        </Button>
      </Alert>
    );

  if (grouped.length === 0)
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CalendarIcon
          sx={{ fontSize: 40, color: alpha(accentColor, 0.25), mb: 1 }}
        />
        <Typography variant="body2" sx={{ color: '#666' }}>
          No leave credits assigned
        </Typography>
        <Typography variant="caption" sx={{ color: '#999' }}>
          Contact HR for assistance
        </Typography>
      </Box>
    );

  return (
    <>
      {/* Summary banner */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0.03)} 100%)`,
          borderRadius: 3,
          p: 2.5,
          mb: 2.5,
          border: `1px solid ${alpha(accentColor, 0.12)}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{ color: '#666', fontWeight: 500, display: 'block', mb: 0.5 }}
            >
              Total Available Days
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, color: accentColor, lineHeight: 1 }}
            >
              {totalRemaining.toFixed(3)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>
              days remaining (all types &amp; periods)
            </Typography>
          </Box>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: alpha(accentColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle sx={{ fontSize: 26, color: accentColor }} />
          </Box>
        </Box>
      </Paper>

      {/* Leave type cards */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(accentColor, 0.08)}`,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            bgcolor: alpha(accentColor, 0.04),
            borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: accentColor, fontSize: '0.82rem' }}
          >
            Leave Type Balances
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: '#bbb', fontSize: '0.7rem' }}
          >
            {grouped.length} type{grouped.length !== 1 ? 's' : ''} · click
            History to see periods
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {grouped.map((g, i) => (
            <LeaveGroupCard key={i} group={g} accentColor={accentColor} />
          ))}
        </Box>
      </Paper>
    </>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const LeaveCredits = ({
  personID,
  compact = false,
  accentColor = '#6d2323',
  accentDark = '#8B3333',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => {
  const [rawCredits, setRawCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCredits = async () => {
    if (!personID) return;
    setLoading(true);
    setError('');
    try {
      const [typesRes, assignmentsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaveRoute/leave_table`),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`),
      ]);

      const userAssignments = assignmentsRes.data.filter(
        (a) => a.employeeNumber?.toString() === personID?.toString(),
      );

      // One entry per assignment row (one row = one period)
      const data = userAssignments.map((a) => {
        const leaveType = typesRes.data.find(
          (lt) => lt.leave_code === a.leave_code,
        );
        return {
          code: a.leave_code,
          name: leaveType?.leave_description || a.leave_code,
          total: (parseFloat(a.total_hours) || 0) / 8,
          used: (parseFloat(a.used_hours) || 0) / 8,
          remaining: (parseFloat(a.remaining_hours) || 0) / 8,
          allocated:
            (parseFloat(a.allocated_hours) || parseFloat(a.total_hours) || 0) /
            8,
          carried_forward: (parseFloat(a.carried_forward_hours) || 0) / 8,
          period_year: a.period_year ?? null,
          period_semester: a.period_semester ?? null,
        };
      });

      setRawCredits(data);
    } catch (e) {
      console.error('Error fetching credits:', e);
      setError('Could not load leave credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [personID]);

  if (compact) {
    return (
      <CompactView
        rawCredits={rawCredits}
        loading={loading}
        accentColor={accentColor}
      />
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        background: '#fff',
        borderRadius: 4,
        border: '1px solid rgba(0,0,0,0.08)',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
          p: 2.5,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 42, height: 42 }}
          >
            <CalendarIcon sx={{ fontSize: 21 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Your Leave Balance
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Available leave days remaining
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5 }}>
        <FullView
          rawCredits={rawCredits}
          loading={loading}
          error={error}
          onRetry={fetchCredits}
          accentColor={accentColor}
          accentDark={accentDark}
        />
      </Box>
    </Paper>
  );
};

export default LeaveCredits;
