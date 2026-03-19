import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  Modal,
  IconButton,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import {
  MonetizationOn as CommutationIcon,
  Search as SearchIcon,
  Close,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  AccessTime as ClockIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ─────────────────────────────────────────────
// SHARED STYLED COMPONENTS
// ─────────────────────────────────────────────
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background:
        'linear-gradient(135deg,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109,35,35,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      overflow: 'visible',
      '&:hover': { boxShadow: '0 12px 40px rgba(109,35,35,0.12)' },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const InfoRow = ({ label, value, color }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: 0.75,
      borderBottom: '1px solid rgba(0,0,0,0.05)',
    }}
  >
    <Typography variant="caption" sx={{ color: '#888', fontWeight: 700 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: 800, color: color || '#333' }}
    >
      {value}
    </Typography>
  </Box>
);

// ─────────────────────────────────────────────
// WIREFRAME SHIMMER KEYFRAMES
// ─────────────────────────────────────────────
const lcShimmerKeyframes = `
@keyframes lcShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes lcPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const LCSkeletonBox = ({
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
      animation: 'lcShimmer 1.5s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─────────────────────────────────────────────
// LEAVE COMMUTATION WIREFRAME
// ─────────────────────────────────────────────
const LeaveCommutationWireframe = () => (
  <>
    <style>{lcShimmerKeyframes}</style>
    {/* Root box matches main component exactly */}
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
      {/* ── Hero Header skeleton ── */}
      <Box
        sx={{
          mb: 4,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(109,35,35,0.1)',
          animation: 'lcPulse 2s ease-in-out infinite',
        }}
      >
        <Box
          sx={{
            p: 5,
            background: 'linear-gradient(135deg,#FFFFFF 0%,#F5F5F5 100%)',
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
              <LCSkeletonBox
                width={280}
                height={28}
                borderRadius={6}
                sx={{ mb: 1.5 }}
              />
              <LCSkeletonBox width={460} height={14} borderRadius={4} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Stats Row skeleton ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { avatarColor: 'rgba(109,35,35,0.12)', labelW: 100 },
          { avatarColor: 'rgba(21,101,192,0.12)', labelW: 80 },
          { avatarColor: 'rgba(46,125,50,0.12)', labelW: 140 },
          { avatarColor: 'rgba(237,108,2,0.12)', labelW: 150 },
        ].map(({ avatarColor, labelW }, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Box
              sx={{
                borderRadius: '12px',
                border: '1px solid rgba(109,35,35,0.08)',
                bgcolor: '#fff',
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                animation: `lcPulse 2s ease-in-out ${i * 0.08}s infinite`,
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  bgcolor: avatarColor,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <LCSkeletonBox
                  width={52}
                  height={22}
                  borderRadius={4}
                  sx={{ mb: 0.75 }}
                />
                <LCSkeletonBox width={labelW} height={10} borderRadius={3} />
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ── Records Table skeleton ── */}
      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(109,35,35,0.1)',
          bgcolor: '#fff',
          animation: 'lcPulse 2s ease-in-out 0.2s infinite',
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg,#FFFFFF 0%,#F5F5F5 100%)',
            borderBottom: '1px solid rgba(109,35,35,0.08)',
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
              <LCSkeletonBox
                width={210}
                height={16}
                borderRadius={4}
                sx={{ mb: 0.75 }}
              />
              <LCSkeletonBox width={130} height={11} borderRadius={3} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box
              sx={{
                width: 260,
                height: 40,
                borderRadius: '8px',
                border: '1px solid rgba(109,35,35,0.15)',
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: 'rgba(109,35,35,0.12)',
                  flexShrink: 0,
                }}
              />
              <LCSkeletonBox width="55%" height={11} borderRadius={3} />
            </Box>
            <Box
              sx={{
                width: 150,
                height: 40,
                borderRadius: '8px',
                border: '1px solid rgba(109,35,35,0.15)',
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
              }}
            >
              <LCSkeletonBox width="65%" height={11} borderRadius={3} />
            </Box>
          </Box>
        </Box>

        {/* Column headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1fr 1fr 1.3fr 1fr',
            gap: 2,
            px: 4,
            py: 1.5,
            bgcolor: 'rgba(109,35,35,0.04)',
            borderBottom: '1px solid rgba(109,35,35,0.08)',
          }}
        >
          {[100, 75, 60, 150, 55].map((w, i) => (
            <LCSkeletonBox key={i} width={w} height={10} borderRadius={3} />
          ))}
        </Box>

        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <Box
            key={i}
            sx={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1fr 1fr 1.3fr 1fr',
              gap: 2,
              px: 4,
              py: 2.25,
              alignItems: 'center',
              borderBottom: i < 7 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              bgcolor: i % 2 === 0 ? '#fff' : 'rgba(109,35,35,0.012)',
              animation: `lcPulse 2s ease-in-out ${i * 0.06}s infinite`,
            }}
          >
            {/* Employee */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  bgcolor: 'rgba(109,35,35,0.15)',
                  flexShrink: 0,
                }}
              />
              <Box>
                <LCSkeletonBox
                  width={130}
                  height={12}
                  borderRadius={3}
                  sx={{ mb: 0.5 }}
                />
                <LCSkeletonBox width={72} height={9} borderRadius={2} />
              </Box>
            </Box>
            {/* Leave Code chip */}
            <Box
              sx={{
                width: 48,
                height: 24,
                borderRadius: '6px',
                bgcolor: 'rgba(109,35,35,0.08)',
                border: '1px solid rgba(109,35,35,0.12)',
              }}
            />
            {/* Period */}
            <LCSkeletonBox width={64} height={11} borderRadius={3} />
            {/* Days/Hours */}
            <Box>
              <LCSkeletonBox
                width={95}
                height={14}
                borderRadius={3}
                sx={{ mb: 0.4 }}
              />
              <LCSkeletonBox width={60} height={9} borderRadius={2} />
            </Box>
            {/* Date */}
            <Box>
              <LCSkeletonBox
                width={78}
                height={11}
                borderRadius={3}
                sx={{ mb: 0.4 }}
              />
              <LCSkeletonBox width={54} height={9} borderRadius={2} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const LeaveCommutation = () => {
  const { hasAccess, loading: accessLoading } =
    usePageAccess('leave-commutation');

  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeave, setFilterLeave] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editApprovedBy, setEditApprovedBy] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/commutationRoute/leave_commutation`,
      );
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch commutation records:', e);
      setRecords([]);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const leaveCodes = [...new Set(records.map((r) => r.leave_code))]
    .filter(Boolean)
    .sort();

  const filtered = records.filter((r) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      (r.fullName?.toLowerCase() || '').includes(search) ||
      (r.employeeNumber?.toString() || '').includes(search) ||
      (r.leave_code?.toLowerCase() || '').includes(search);
    const matchLeave = filterLeave === 'all' || r.leave_code === filterLeave;
    return matchSearch && matchLeave;
  });

  const stats = {
    total: records.length,
    totalDays: records.reduce((s, r) => s + toNum(r.commuted_days), 0),
    totalHours: records.reduce((s, r) => s + toNum(r.commuted_hours), 0),
    employees: new Set(records.map((r) => r.employeeNumber)).size,
  };

  const openRecord = (rec) => {
    setSelectedRecord(rec);
    setEditApprovedBy(rec.approved_by || '');
    setEditRemarks(rec.remarks || '');
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleUpdate = async () => {
    if (!selectedRecord) return;
    try {
      await axios.put(
        `${API_BASE_URL}/commutationRoute/leave_commutation/${selectedRecord.id}`,
        {
          approved_by: editApprovedBy,
          remarks: editRemarks,
        },
      );
      setSuccess('Record updated successfully');
      setIsEditing(false);
      await fetchRecords();
      const res = await axios.get(
        `${API_BASE_URL}/commutationRoute/leave_commutation`,
      );
      const updated = (res.data || []).find((r) => r.id === selectedRecord.id);
      if (updated) setSelectedRecord(updated);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to update: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm('Delete this commutation record? This cannot be undone.')
    )
      return;
    try {
      await axios.delete(
        `${API_BASE_URL}/commutationRoute/leave_commutation/${id}`,
      );
      setSelectedRecord(null);
      await fetchRecords();
    } catch (e) {
      setError('Failed to delete: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleClose = () => {
    setSelectedRecord(null);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (accessLoading) return <LeaveCommutationWireframe />;

  if (!hasAccess) return <AccessDenied />;

  if (pageLoading) return <LeaveCommutationWireframe />;

  return (
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
      {/* ── Hero Header ── */}
      <GlassCard sx={{ mb: 4, overflow: 'hidden', position: 'relative' }}>
        <Box
          sx={{
            p: 5,
            background: 'linear-gradient(135deg,#FFFFFF 0%,#F5F5F5 100%)',
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
                'radial-gradient(circle,rgba(109,35,35,0.1) 0%,rgba(109,35,35,0) 70%)',
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
                'radial-gradient(circle,rgba(109,35,35,0.08) 0%,rgba(109,35,35,0) 70%)',
            }}
          />
          <Box
            display="flex"
            alignItems="center"
            position="relative"
            zIndex={1}
          >
            <Avatar
              sx={{
                bgcolor: 'rgba(109,35,35,0.15)',
                mr: 4,
                width: 64,
                height: 64,
                boxShadow: '0 8px 24px rgba(109,35,35,0.15)',
              }}
            >
              <CommutationIcon sx={{ color: '#6d2323', fontSize: 32 }} />
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
                Leave Commutation
              </Typography>
              <Typography
                variant="body1"
                sx={{ opacity: 0.85, fontWeight: 700, color: '#8B3333' }}
              >
                Administrative Panel • Manage commuted leave hours converted
                from remaining balances
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* ── Stats Row ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          {
            label: 'Total Records',
            value: stats.total,
            color: '#6d2323',
            icon: <HistoryIcon />,
          },
          {
            label: 'Employees',
            value: stats.employees,
            color: '#1565c0',
            icon: <PersonIcon />,
          },
          {
            label: 'Total Days Commuted',
            value: stats.totalDays.toFixed(2),
            color: '#2e7d32',
            icon: <CalendarIcon />,
          },
          {
            label: 'Total Hours Commuted',
            value: stats.totalHours.toFixed(2),
            color: '#ed6c02',
            icon: <ClockIcon />,
          },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <GlassCard>
              <Box
                sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <Avatar
                  sx={{
                    bgcolor: `${color}18`,
                    width: 52,
                    height: 52,
                    boxShadow: `0 4px 12px ${color}25`,
                  }}
                >
                  {React.cloneElement(icon, { sx: { color, fontSize: 26 } })}
                </Avatar>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color,
                      fontSize: '1.5rem',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#888', fontWeight: 700, letterSpacing: 0.2 }}
                  >
                    {label}
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      {/* ── Records Table ── */}
      <GlassCard sx={{ mb: { xs: 6, md: 10 }, overflow: 'visible' }}>
        {/* Toolbar */}
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg,#FFFFFF 0%,#F5F5F5 100%)',
            borderBottom: '1px solid rgba(109,35,35,0.08)',
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
              sx={{
                bgcolor: 'rgba(109,35,35,0.15)',
                width: 56,
                height: 56,
                boxShadow: '0 4px 12px rgba(109,35,35,0.15)',
              }}
            >
              <CommutationIcon sx={{ color: '#6d2323', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, color: '#6d2323' }}
              >
                Commutation Records
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#8B3333', fontWeight: 800, opacity: 0.85 }}
              >
                {filtered.length} of {records.length}{' '}
                {records.length === 1 ? 'record' : 'records'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              placeholder="Search employee or leave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                minWidth: 260,
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
                    <SearchIcon sx={{ color: '#6d2323', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel
                sx={{
                  color: '#6d2323',
                  fontWeight: 700,
                  '&.Mui-focused': { color: '#6d2323' },
                }}
              >
                Leave Type
              </InputLabel>
              <Select
                value={filterLeave}
                onChange={(e) => setFilterLeave(e.target.value)}
                label="Leave Type"
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
                  },
                }}
              >
                <MenuItem value="all">All Types</MenuItem>
                {leaveCodes.map((lc) => (
                  <MenuItem key={lc} value={lc}>
                    {lc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <CardContent sx={{ p: 0, overflow: 'visible' }}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  bgcolor: 'rgba(109,35,35,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CommutationIcon
                  sx={{ fontSize: 52, color: 'rgba(109,35,35,0.25)' }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ color: '#6d2323', fontWeight: 900, mb: 1 }}
              >
                {records.length === 0
                  ? 'No Commutation Records Yet'
                  : 'No Matching Records'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#888',
                  fontWeight: 700,
                  maxWidth: 420,
                  mx: 'auto',
                }}
              >
                {records.length === 0
                  ? 'Commutation records will appear here once an admin commutes leave from the Leave Assignment module.'
                  : 'Try adjusting your search or filter criteria.'}
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Column Headers */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1fr 1fr 1.3fr 1fr',
                  gap: 2,
                  px: 4,
                  py: 1.5,
                  bgcolor: 'rgba(109,35,35,0.04)',
                  borderBottom: '1px solid rgba(109,35,35,0.08)',
                }}
              >
                {[
                  'Employee',
                  'Leave Code',
                  'Period',
                  'Days / Hours Commuted',
                  'Date',
                ].map((h) => (
                  <Typography
                    key={h}
                    variant="caption"
                    sx={{
                      fontWeight: 900,
                      color: '#6d2323',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      fontSize: '0.68rem',
                    }}
                  >
                    {h}
                  </Typography>
                ))}
              </Box>

              {/* Rows */}
              {filtered.map((rec, idx) => (
                <Box
                  key={rec.id}
                  onClick={() => openRecord(rec)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1fr 1.3fr 1fr',
                    gap: 2,
                    px: 4,
                    py: 2.25,
                    cursor: 'pointer',
                    alignItems: 'center',
                    borderBottom:
                      idx < filtered.length - 1
                        ? '1px solid rgba(0,0,0,0.05)'
                        : 'none',
                    bgcolor: idx % 2 === 0 ? '#fff' : 'rgba(109,35,35,0.012)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(109,35,35,0.05)',
                      transform: 'translateX(3px)',
                      boxShadow: 'inset 3px 0 0 #6d2323',
                    },
                  }}
                >
                  {/* Employee */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: '#6d2323',
                        width: 38,
                        height: 38,
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        borderRadius: '8px',
                      }}
                    >
                      {(
                        rec.firstName?.[0] ||
                        rec.fullName?.[0] ||
                        '?'
                      ).toUpperCase()}
                      {(rec.lastName?.[0] || '').toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: '#1a1a1a',
                          lineHeight: 1.25,
                        }}
                      >
                        {rec.fullName || rec.employeeNumber}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#aaa', fontWeight: 600 }}
                      >
                        #{rec.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Leave Code */}
                  <Chip
                    label={rec.leave_code}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(109,35,35,0.08)',
                      color: '#6d2323',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      width: 'fit-content',
                      borderRadius: '6px',
                      border: '1px solid rgba(109,35,35,0.15)',
                    }}
                  />

                  {/* Period */}
                  <Typography
                    variant="body2"
                    sx={{ color: '#555', fontWeight: 700 }}
                  >
                    {rec.period_year}
                    {rec.period_semester ? ` ${rec.period_semester}` : ''}
                  </Typography>

                  {/* Days / Hours */}
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: '#6d2323',
                        fontSize: '1rem',
                        lineHeight: 1.25,
                      }}
                    >
                      {toNum(rec.commuted_days).toFixed(2)} days
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: '#999', fontWeight: 700 }}
                    >
                      {toNum(rec.commuted_hours).toFixed(2)} hrs
                    </Typography>
                  </Box>

                  {/* Date */}
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: '#555', fontWeight: 700 }}
                    >
                      {rec.commuted_at_fmt?.split(' ')[0] || '—'}
                    </Typography>
                    {rec.commuted_by && (
                      <Typography
                        variant="caption"
                        sx={{ color: '#aaa', fontWeight: 600 }}
                      >
                        by {rec.commuted_by}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </GlassCard>

      {/* ── Detail / Edit Modal ── */}
      <Modal
        open={!!selectedRecord}
        onClose={handleClose}
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
            width: '90%',
            maxWidth: 580,
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
        >
          {selectedRecord && (
            <>
              {/* Modal Header */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)',
                  color: '#fff',
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '16px 16px 0 0',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    background:
                      'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)',
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      width: 52,
                      height: 52,
                    }}
                  >
                    <CommutationIcon sx={{ fontSize: 26 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 900, lineHeight: 1.2 }}
                    >
                      Commutation Record #{selectedRecord.id}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ opacity: 0.85, fontWeight: 700 }}
                    >
                      {selectedRecord.fullName || selectedRecord.employeeNumber}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {!isEditing && (
                    <>
                      <Tooltip title="Edit remarks / approved by">
                        <IconButton
                          onClick={() => setIsEditing(true)}
                          sx={{ color: '#fff' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete record">
                        <IconButton
                          onClick={() => handleDelete(selectedRecord.id)}
                          sx={{ color: '#ffcdd2' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
                    <Close />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ p: 3 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    {success}
                  </Alert>
                )}

                {/* Commuted Amount highlight */}
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 2,
                    background:
                      'linear-gradient(135deg,rgba(109,35,35,0.06) 0%,rgba(109,35,35,0.02) 100%)',
                    border: '1px solid rgba(109,35,35,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#888',
                        fontWeight: 800,
                        display: 'block',
                        mb: 0.25,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: '0.65rem',
                      }}
                    >
                      Total Commuted
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: '#6d2323',
                        fontSize: '2rem',
                        lineHeight: 1,
                      }}
                    >
                      {toNum(selectedRecord.commuted_days).toFixed(2)}
                      <Typography
                        component="span"
                        sx={{ fontSize: '1rem', fontWeight: 700, ml: 0.75 }}
                      >
                        days
                      </Typography>
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: '#999', fontWeight: 700 }}
                    >
                      {toNum(selectedRecord.commuted_hours).toFixed(2)} hours
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#888',
                        display: 'block',
                        mb: 0.5,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontSize: '0.65rem',
                      }}
                    >
                      Period
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: '#333',
                        fontSize: '1.1rem',
                      }}
                    >
                      {selectedRecord.period_year}
                      {selectedRecord.period_semester
                        ? ` ${selectedRecord.period_semester}`
                        : ' Annual'}
                    </Typography>
                    <Chip
                      label={selectedRecord.leave_code}
                      size="small"
                      sx={{
                        mt: 0.75,
                        bgcolor: 'rgba(109,35,35,0.1)',
                        color: '#6d2323',
                        fontWeight: 900,
                        borderRadius: '6px',
                        border: '1px solid rgba(109,35,35,0.2)',
                      }}
                    />
                  </Box>
                </Box>

                {/* Details */}
                <Box
                  sx={{
                    bgcolor: 'rgba(109,35,35,0.02)',
                    borderRadius: 2,
                    border: '1px solid rgba(109,35,35,0.08)',
                    p: 2.5,
                    mb: 3,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 900,
                      color: '#6d2323',
                      mb: 1.5,
                      letterSpacing: 0.2,
                    }}
                  >
                    Commutation Details
                  </Typography>
                  <InfoRow
                    label="Employee #"
                    value={selectedRecord.employeeNumber}
                  />
                  <InfoRow
                    label="Full Name"
                    value={selectedRecord.fullName || '—'}
                  />
                  <InfoRow
                    label="Leave Code"
                    value={selectedRecord.leave_code}
                  />
                  <InfoRow
                    label="Leave Type"
                    value={selectedRecord.leave_description || '—'}
                  />
                  <InfoRow
                    label="Commuted On"
                    value={selectedRecord.commuted_at_fmt || '—'}
                  />
                  <InfoRow
                    label="Commuted By"
                    value={selectedRecord.commuted_by || '—'}
                  />
                </Box>

                <Divider sx={{ my: 2.5 }}>
                  <Chip
                    label="Notes & Approval"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(109,35,35,0.08)',
                      color: '#6d2323',
                      fontWeight: 800,
                      border: '1px solid rgba(109,35,35,0.15)',
                    }}
                  />
                </Divider>

                {/* Editable fields */}
                {isEditing ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Approved By"
                        value={editApprovedBy}
                        onChange={(e) => setEditApprovedBy(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '& fieldset': {
                              borderColor: 'rgba(109,35,35,0.2)',
                            },
                            '&:hover fieldset': { borderColor: '#6d2323' },
                            '&.Mui-focused fieldset': {
                              borderColor: '#6d2323',
                            },
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#6d2323',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Remarks"
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '& fieldset': {
                              borderColor: 'rgba(109,35,35,0.2)',
                            },
                            '&:hover fieldset': { borderColor: '#6d2323' },
                            '&.Mui-focused fieldset': {
                              borderColor: '#6d2323',
                            },
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#6d2323',
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Box
                    sx={{
                      bgcolor: 'rgba(109,35,35,0.02)',
                      borderRadius: 2,
                      border: '1px solid rgba(109,35,35,0.08)',
                      p: 2,
                    }}
                  >
                    <InfoRow
                      label="Approved By"
                      value={selectedRecord.approved_by || '—'}
                    />
                    <InfoRow
                      label="Remarks"
                      value={selectedRecord.remarks || '—'}
                    />
                  </Box>
                )}

                {/* Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1.5,
                    mt: 3,
                  }}
                >
                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => {
                          setIsEditing(false);
                          setError('');
                        }}
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                          borderColor: '#6d2323',
                          color: '#6d2323',
                          borderRadius: 2,
                          fontWeight: 900,
                          px: 3,
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.05)' },
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdate}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        sx={{
                          bgcolor: '#6d2323',
                          color: '#fff',
                          borderRadius: 2,
                          fontWeight: 900,
                          px: 3,
                          boxShadow: '0 4px 12px rgba(109,35,35,0.3)',
                          '&:hover': { bgcolor: '#5a1d1d' },
                        }}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleClose}
                      variant="outlined"
                      sx={{
                        borderColor: '#6d2323',
                        color: '#6d2323',
                        borderRadius: 2,
                        fontWeight: 900,
                        px: 3,
                        '&:hover': { bgcolor: 'rgba(109,35,35,0.05)' },
                      }}
                    >
                      Close
                    </Button>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default LeaveCommutation;
