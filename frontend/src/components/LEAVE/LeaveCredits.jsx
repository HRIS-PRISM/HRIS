import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  Chip,
  Paper,
  styled,
  alpha,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  TrendingUp,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';

// ============================================
// COMPACT VERSION - For Admin (simple chips)
// ============================================
const CompactView = ({ credits, loading, accentColor }) => {
  if (loading) {
    return <CircularProgress size={16} sx={{ color: accentColor }} />;
  }

  if (credits.length === 0) {
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
      {credits.map((c, i) => {
        const hasBalance = c.remaining > 0;
        const color = hasBalance ? '#2e7d32' : '#d32f2f';

        return (
          <Chip
            key={i}
            label={`${c.code}: ${c.remaining.toFixed(1)} days`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: alpha(color, 0.1),
              color: color,
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
// PROGRESS BAR COMPONENT
// ============================================
const ProgressBar = styled(Box)(({ theme }) => ({
  height: 8,
  backgroundColor: '#f5f5f5',
  borderRadius: 4,
  overflow: 'hidden',
}));

const ProgressFill = styled(Box)(({ theme, width, color }) => ({
  height: '100%',
  width: `${width}%`,
  backgroundColor: color,
  borderRadius: 4,
  transition: 'width 0.5s ease',
}));

// ============================================
// FULL VERSION - For User (detailed panel with container)
// ============================================
const FullView = ({
  credits,
  loading,
  error,
  onRetry,
  accentColor,
  accentDark,
  primaryColor,
}) => {
  const getStatusColor = (remaining, total) => {
    if (total === 0 || remaining === 0) return '#B71C1C';
    const percent = (remaining / total) * 100;
    if (percent > 50) return '#2E7D32';
    if (percent > 20) return '#EF6C00';
    return '#B71C1C';
  };

  const getStatusText = (remaining, total) => {
    if (total === 0) return 'Not available';
    if (remaining === 0) return 'No days left';
    if (remaining === total) return 'Full balance';
    const percent = (remaining / total) * 100;
    if (percent > 50) return 'Available';
    if (percent > 20) return 'Running low';
    return 'Almost out';
  };

  const totalRemaining = credits.reduce((sum, c) => sum + c.remaining, 0);

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={28} sx={{ color: accentColor }} />
        <Typography variant="body2" sx={{ mt: 1.5, color: '#666' }}>
          Loading leave credits...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
        <Button onClick={onRetry} size="small" sx={{ ml: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (credits.length === 0) {
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
  }

  const groupedCredits = credits.reduce((acc, credit) => {
    if (!acc[credit.code]) {
      acc[credit.code] = [];
    }
    acc[credit.code].push(credit);
    return acc;
  }, {});

  const creditGroups = Object.keys(groupedCredits).map((code) => {
    const semesterOrder = {
      '2nd semester': 2,
      '1st semester': 1,
      '2nd': 2,
      '1st': 1,
      '': 0,
      null: 0,
    };

    const items = groupedCredits[code].slice().sort((a, b) => {
      if ((b.periodYear || 0) !== (a.periodYear || 0)) {
        return (b.periodYear || 0) - (a.periodYear || 0);
      }
      return (
        (semesterOrder[b.periodSemester] || 0) -
        (semesterOrder[a.periodSemester] || 0)
      );
    });

    const latest = items[0];

    // Current period data (latest)
    const currentTotal = latest?.total || 0;
    const currentRemaining = latest?.remaining || 0;
    const currentUsed = latest?.used || 0;
    const currentAllocated = latest?.allocated || 0;

    // Previous periods data (old/carried)
    const previousRemaining = items
      .slice(1)
      .reduce((sum, item) => sum + (item.remaining || 0), 0);

    // Combined data
    const total = currentTotal + previousRemaining;
    const remaining = currentRemaining + previousRemaining;
    const carriedForward = previousRemaining;

    return {
      code,
      name: items[0]?.name || code,
      total,
      used: currentUsed,
      remaining,
      carriedForward,
      allocated: currentAllocated,
      latest,
    };
  });

  return (
    <>
      {/* Total Summary Box */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0.03)} 100%)`,
          borderRadius: 3,
          p: 3,
          mb: 3,
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
              {totalRemaining.toFixed(1)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>
              days remaining
            </Typography>
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: alpha(accentColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle sx={{ fontSize: 28, color: accentColor }} />
          </Box>
        </Box>
      </Paper>

      {/* Leave Types Container Box */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(accentColor, 0.08)}`,
          overflow: 'hidden',
        }}
      >
        {/* Container Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: alpha(accentColor, 0.04),
            borderBottom: `1px solid ${alpha(accentColor, 0.08)}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: accentColor }}
          >
            Leave Type Balances
          </Typography>
        </Box>

        {/* Leave Types List */}
        <Box sx={{ p: 2 }}>
          {creditGroups.map((group, index) => {
            const statusColor = getStatusColor(group.remaining, group.total);
            const statusText = getStatusText(group.remaining, group.total);
            const percent =
              group.total > 0 ? (group.remaining / group.total) * 100 : 0;
            const latest = group.latest;
            const hasCarryForward = group.carriedForward > 0;
            const periodLabel = latest?.periodYear
              ? `${latest.periodYear}${latest.periodSemester ? ` • ${latest.periodSemester}` : ' • Annual'}`
              : 'No period';

            return (
              <Box
                key={group.code}
                sx={{
                  p: 2,
                  mb: index < creditGroups.length - 1 ? 2 : 0,
                  borderRadius: 2,
                  bgcolor: '#FAFAFA',
                  border: `1px solid ${alpha(accentColor, 0.06)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(accentColor, 0.12),
                    bgcolor: '#FFF',
                  },
                }}
              >
                {/* Header Row - Shows combined total */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: '#333' }}
                    >
                      {group.code}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {group.name}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', ml: 2, flexShrink: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: statusColor,
                        lineHeight: 1,
                      }}
                    >
                      {group.remaining.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      total days left
                    </Typography>
                  </Box>
                </Box>

                {/* Current Period Label */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    {periodLabel}
                  </Typography>
                  <Chip
                    label={
                      hasCarryForward
                        ? 'Carried Balance + Current'
                        : 'Current Allocation'
                    }
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      bgcolor: hasCarryForward
                        ? 'rgba(46, 125, 50, 0.12)'
                        : 'rgba(25, 118, 210, 0.12)',
                      color: hasCarryForward ? '#2E7D32' : '#1976d2',
                    }}
                  />
                </Box>

                {/* Breakdown: Carried + Current */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mb: 1.5,
                    p: 1,
                    bgcolor: 'rgba(0,0,0,0.02)',
                    borderRadius: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: '#2E7D32', fontWeight: 600 }}
                    >
                      Carried Balance (Old):
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: '#2E7D32', fontWeight: 700 }}
                    >
                      {group.carriedForward.toFixed(1)}d
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: '#1976d2', fontWeight: 600 }}
                    >
                      Current Allocation:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: '#1976d2', fontWeight: 700 }}
                    >
                      {group.latest?.remaining.toFixed(1)}d of{' '}
                      {group.latest?.total.toFixed(1)}d
                    </Typography>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <ProgressBar>
                  <ProgressFill width={percent} color={statusColor} />
                </ProgressBar>

                {/* Footer Row - Used from current period */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: '#888', fontWeight: 500 }}
                  >
                    Used (Current): {group.used.toFixed(1)}d
                  </Typography>
                  <Chip
                    label={statusText}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      bgcolor: alpha(statusColor, 0.1),
                      color: statusColor,
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </>
  );
};

// ============================================
// MAIN COMPONENT - Handles both views
// ============================================
const LeaveCredits = ({
  personID,
  compact = false, // true = Admin view (chips), false = User view (panel)
  accentColor = '#6d2323',
  accentDark = '#8B3333',
  primaryColor = '#FEF9E1',
  secondaryColor = '#FFF8E7',
}) => {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);

  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCredits = async () => {
    if (!personID) return;

    setLoading(true);
    setError('');

    try {
      // Fetch both leave_table (for names) and leave_assignment (for actual credits)
      const [typesRes, assignmentsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaveRoute/leave_table`),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`),
      ]);

      // Filter assignments for this specific employee
      const userAssignments = assignmentsRes.data.filter(
        (a) => a.employeeNumber?.toString() === personID?.toString(),
      );

      // Build credits data from leave_assignment table
      // leave_assignment has: leave_code, total_hours, remaining_hours, used_hours, carried_forward_hours, allocated_hours
      const data = userAssignments.map((assignment) => {
        // Find the leave type name from leave_table
        const leaveType = typesRes.data.find(
          (lt) => lt.leave_code === assignment.leave_code,
        );

        // Convert hours to days (8 hours = 1 day)
        const totalDays = (parseFloat(assignment.total_hours) || 0) / 8;
        const usedDays = (parseFloat(assignment.used_hours) || 0) / 8;
        const remainingDays = (parseFloat(assignment.remaining_hours) || 0) / 8;
        const carriedForwardDays =
          (parseFloat(assignment.carried_forward_hours) || 0) / 8;
        const allocatedDays = (parseFloat(assignment.allocated_hours) || 0) / 8;

        console.log(`🔍 Leave Assignment for ${assignment.leave_code}:`, {
          raw: assignment,
          carriedForwardHours: assignment.carried_forward_hours,
          allocatedHours: assignment.allocated_hours,
          carriedForwardDays,
          allocatedDays,
        });

        return {
          code: assignment.leave_code,
          name: leaveType?.leave_description || assignment.leave_code,
          total: totalDays,
          used: usedDays,
          remaining: remainingDays,
          carriedForward: carriedForwardDays,
          allocated: allocatedDays,
          periodYear: assignment.period_year,
          periodSemester: assignment.period_semester,
        };
      });

      console.log('📊 Final credits data:', data);
      setCredits(data);
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

  // Keep latest fetch function for Socket.IO handler
  useEffect(() => {
    refreshRef.current = fetchCredits;
  });

  // Realtime: refresh when anyone changes leave assignments
  useEffect(() => {
    if (!socket || !connected) return;

    const handleRefresh = () => {
      console.log(
        '[LeaveCredits] Received leaveAssignmentChanged event, refreshing...',
      );
      if (refreshRef.current) {
        refreshRef.current();
      }
    };

    socket.on('leaveAssignmentChanged', handleRefresh);

    return () => {
      socket.off('leaveAssignmentChanged', handleRefresh);
    };
  }, [socket, connected]);

  // ============================================
  // COMPACT VIEW - Just chips (for Admin)
  // ============================================
  if (compact) {
    return (
      <CompactView
        credits={credits}
        loading={loading}
        accentColor={accentColor}
      />
    );
  }

  // ============================================
  // FULL VIEW - Panel with details (for User)
  // ============================================
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
          p: 3,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}
          >
            <CalendarIcon sx={{ fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Your Leave Balance
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Available leave days remaining
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        <FullView
          credits={credits}
          loading={loading}
          error={error}
          onRetry={fetchCredits}
          accentColor={accentColor}
          accentDark={accentDark}
          primaryColor={primaryColor}
        />
      </Box>
    </Paper>
  );
};

export default LeaveCredits;
