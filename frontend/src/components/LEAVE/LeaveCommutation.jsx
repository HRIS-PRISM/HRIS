import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Typography, Box, Card, CardContent, Avatar, Chip, Modal, IconButton,
  TextField, Button, Grid, Divider, Alert, InputAdornment, Select,
  MenuItem, FormControl, InputLabel, Tooltip,
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

// ─── helpers ────────────────────────────────────────────────
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const GlassCard = ({ children, sx = {} }) => (
  <Card sx={{
    background: 'linear-gradient(135deg,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.85) 100%)',
    backdropFilter: 'blur(10px)', borderRadius: 3,
    border: '1px solid rgba(109,35,35,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease', overflow: 'visible',
    '&:hover': { boxShadow: '0 12px 40px rgba(109,35,35,0.12)' }, ...sx,
  }}>
    {children}
  </Card>
);

const InfoRow = ({ label, value, color }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
    <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, color: color || '#333' }}>{value}</Typography>
  </Box>
);

// ─── Main Component ──────────────────────────────────────────
const LeaveCommutation = () => {
  const [records, setRecords]               = useState([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterLeave, setFilterLeave]       = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing]           = useState(false);
  const [editApprovedBy, setEditApprovedBy] = useState('');
  const [editRemarks, setEditRemarks]       = useState('');
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/commutationRoute/leave_commutation`);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch commutation records:', e);
      setRecords([]);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const leaveCodes = [...new Set(records.map((r) => r.leave_code))].filter(Boolean).sort();

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
    total:      records.length,
    totalDays:  records.reduce((s, r) => s + toNum(r.commuted_days), 0),
    totalHours: records.reduce((s, r) => s + toNum(r.commuted_hours), 0),
    employees:  new Set(records.map((r) => r.employeeNumber)).size,
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
      await axios.put(`${API_BASE_URL}/commutationRoute/leave_commutation/${selectedRecord.id}`, {
        approved_by: editApprovedBy,
        remarks: editRemarks,
      });
      setSuccess('Record updated successfully');
      setIsEditing(false);
      await fetchRecords();
      const res = await axios.get(`${API_BASE_URL}/commutationRoute/leave_commutation`);
      const updated = (res.data || []).find((r) => r.id === selectedRecord.id);
      if (updated) setSelectedRecord(updated);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Failed to update: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this commutation record? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/commutationRoute/leave_commutation/${id}`);
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

  return (
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: '100%', maxWidth: '100%', mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>

      {/* Hero Header */}
      <GlassCard sx={{ mb: 4 }}>
        <Box sx={{ p: 5, background: 'linear-gradient(135deg,#FFFFFF 0%,#F5F5F5 100%)', color: '#6d2323', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle,rgba(109,35,35,0.1) 0%,rgba(109,35,35,0) 70%)' }} />
          <Box display="flex" alignItems="center" position="relative" zIndex={1}>
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.15)', mr: 4, width: 64, height: 64, boxShadow: '0 8px 24px rgba(109,35,35,0.15)' }}>
              <CommutationIcon sx={{ color: '#6d2323', fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: '#6d2323' }}>
                Leave Commutation
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8, color: '#8B3333' }}>
                Administrative Panel • Manage commuted leave hours converted from remaining balances
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* Stats Row — no status, just totals */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total Records',        value: stats.total,                   color: '#6d2323', icon: <HistoryIcon /> },
          { label: 'Employees',            value: stats.employees,               color: '#1565c0', icon: <PersonIcon /> },
          { label: 'Total Days Commuted',  value: stats.totalDays.toFixed(2),    color: '#2e7d32', icon: <CalendarIcon /> },
          { label: 'Total Hours Commuted', value: stats.totalHours.toFixed(2),   color: '#ed6c02', icon: <ClockIcon /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <GlassCard>
              <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${color}18`, width: 48, height: 48 }}>
                  {React.cloneElement(icon, { sx: { color, fontSize: 24 } })}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 800, color, fontSize: '1.4rem', lineHeight: 1 }}>{value}</Typography>
                  <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>{label}</Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      {/* Records Table */}
      <GlassCard>
        <Box sx={{
          p: 3, background: 'linear-gradient(135deg,#FFFFFF 0%,#F5F5F5 100%)',
          borderBottom: '1px solid rgba(109,35,35,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(109,35,35,0.12)', width: 48, height: 48 }}>
              <CommutationIcon sx={{ color: '#6d2323', fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#6d2323' }}>Commutation Records</Typography>
              <Typography variant="body2" sx={{ color: '#8B3333', opacity: 0.8 }}>
                {filtered.length} of {records.length} records
              </Typography>
            </Box>
          </Box>

          {/* Filters — search + leave type only */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small" placeholder="Search employee or leave..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#6d2323', fontSize: 18 }} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Leave Type</InputLabel>
              <Select value={filterLeave} onChange={(e) => setFilterLeave(e.target.value)} label="Leave Type" sx={{ borderRadius: 2 }}>
                <MenuItem value="all">All Types</MenuItem>
                {leaveCodes.map((lc) => <MenuItem key={lc} value={lc}>{lc}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <CommutationIcon sx={{ fontSize: 64, color: 'rgba(109,35,35,0.2)', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6d2323', fontWeight: 700, mb: 1 }}>
                {records.length === 0 ? 'No Commutation Records Yet' : 'No Matching Records'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                {records.length === 0
                  ? 'Commutation records will appear here once an admin commutes leave from the Leave Assignment module.'
                  : 'Try adjusting your search or filter criteria.'}
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Table Header — 5 cols, no Status */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.3fr 1fr', gap: 2, px: 3, py: 1.5, bgcolor: 'rgba(109,35,35,0.04)', borderBottom: '1px solid rgba(109,35,35,0.08)' }}>
                {['Employee', 'Leave Code', 'Period', 'Days / Hours Commuted', 'Date'].map((h) => (
                  <Typography key={h} variant="caption" sx={{ fontWeight: 700, color: '#6d2323', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>{h}</Typography>
                ))}
              </Box>

              {filtered.map((rec, idx) => (
                <Box
                  key={rec.id}
                  onClick={() => openRecord(rec)}
                  sx={{
                    display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.3fr 1fr', gap: 2,
                    px: 3, py: 2, cursor: 'pointer', alignItems: 'center',
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    bgcolor: idx % 2 === 0 ? '#fff' : 'rgba(109,35,35,0.01)',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(109,35,35,0.04)', transform: 'translateX(2px)' },
                  }}
                >
                  {/* Employee */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#6d2323', width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700 }}>
                      {(rec.firstName?.[0] || '?')}{(rec.lastName?.[0] || '')}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#333', lineHeight: 1.2 }}>
                        {rec.fullName || rec.employeeNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>#{rec.employeeNumber}</Typography>
                    </Box>
                  </Box>

                  {/* Leave Code */}
                  <Chip
                    label={rec.leave_code} size="small"
                    sx={{ bgcolor: 'rgba(109,35,35,0.08)', color: '#6d2323', fontWeight: 700, fontSize: '0.75rem', width: 'fit-content' }}
                  />

                  {/* Period */}
                  <Typography variant="body2" sx={{ color: '#555', fontWeight: 600 }}>
                    {rec.period_year}{rec.period_semester ? ` ${rec.period_semester}` : ''}
                  </Typography>

                  {/* Days / Hours */}
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: '#6d2323', fontSize: '1rem', lineHeight: 1.2 }}>
                      {toNum(rec.commuted_days).toFixed(2)} days
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      {toNum(rec.commuted_hours).toFixed(2)} hrs
                    </Typography>
                  </Box>

                  {/* Date + by */}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#555', fontWeight: 600 }}>
                      {rec.commuted_at_fmt?.split(' ')[0] || '—'}
                    </Typography>
                    {rec.commuted_by && (
                      <Typography variant="caption" sx={{ color: '#aaa' }}>by {rec.commuted_by}</Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </GlassCard>

      {/* Detail / Edit Modal */}
      <Modal open={!!selectedRecord} onClose={handleClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ backgroundColor: '#fff', borderRadius: 4, width: '90%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          {selectedRecord && (
            <>
              {/* Modal Header */}
              <Box sx={{ background: 'linear-gradient(135deg,#6D2323 0%,#8B4545 100%)', color: '#fff', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <CommutationIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Commutation Record #{selectedRecord.id}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>{selectedRecord.fullName || selectedRecord.employeeNumber}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!isEditing && (
                    <>
                      <Tooltip title="Edit remarks / approved by">
                        <IconButton onClick={() => setIsEditing(true)} sx={{ color: '#fff' }}><EditIcon /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete record">
                        <IconButton onClick={() => handleDelete(selectedRecord.id)} sx={{ color: '#ffcdd2' }}><DeleteIcon /></IconButton>
                      </Tooltip>
                    </>
                  )}
                  <IconButton onClick={handleClose} sx={{ color: '#fff' }}><Close /></IconButton>
                </Box>
              </Box>

              <Box sx={{ p: 3 }}>
                {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

                {/* Commuted Amount highlight box */}
                <Box sx={{
                  mb: 3, p: 2.5, borderRadius: 2,
                  background: 'linear-gradient(135deg,rgba(109,35,35,0.06) 0%,rgba(109,35,35,0.02) 100%)',
                  border: '1px solid rgba(109,35,35,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, display: 'block', mb: 0.25 }}>
                      Total Commuted
                    </Typography>
                    <Typography sx={{ fontWeight: 800, color: '#6d2323', fontSize: '1.8rem', lineHeight: 1 }}>
                      {toNum(selectedRecord.commuted_days).toFixed(2)}
                      <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 600, ml: 0.5 }}>days</Typography>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      {toNum(selectedRecord.commuted_hours).toFixed(2)} hours
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>Period</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>
                      {selectedRecord.period_year}{selectedRecord.period_semester ? ` ${selectedRecord.period_semester}` : ' Annual'}
                    </Typography>
                    <Chip
                      label={selectedRecord.leave_code} size="small"
                      sx={{ mt: 0.5, bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 700 }}
                    />
                  </Box>
                </Box>

                {/* Details */}
                <Box sx={{ bgcolor: 'rgba(109,35,35,0.02)', borderRadius: 2, border: '1px solid rgba(109,35,35,0.08)', p: 2, mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6d2323', mb: 1.5 }}>Commutation Details</Typography>
                  <InfoRow label="Employee #"  value={selectedRecord.employeeNumber} />
                  <InfoRow label="Full Name"   value={selectedRecord.fullName || '—'} />
                  <InfoRow label="Leave Code"  value={selectedRecord.leave_code} />
                  <InfoRow label="Leave Type"  value={selectedRecord.leave_description || '—'} />
                  <InfoRow label="Commuted On" value={selectedRecord.commuted_at_fmt || '—'} />
                  <InfoRow label="Commuted By" value={selectedRecord.commuted_by || '—'} />
                </Box>

                <Divider sx={{ my: 2 }}>
                  <Chip label="Notes & Approval" size="small" sx={{ bgcolor: 'rgba(109,35,35,0.1)', color: '#6d2323', fontWeight: 600 }} />
                </Divider>

                {/* Editable: approved by + remarks only — NO status */}
                {isEditing ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Approved By" value={editApprovedBy}
                        onChange={(e) => setEditApprovedBy(e.target.value)}
                        fullWidth size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Remarks" value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        fullWidth size="small" multiline rows={3}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Box>
                    <InfoRow label="Approved By" value={selectedRecord.approved_by || '—'} />
                    <InfoRow label="Remarks"     value={selectedRecord.remarks || '—'} />
                  </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                  {isEditing ? (
                    <>
                      <Button onClick={() => { setIsEditing(false); setError(''); }} variant="outlined" startIcon={<CancelIcon />} sx={{ borderColor: '#6d2323', color: '#6d2323', borderRadius: 2 }}>Cancel</Button>
                      <Button onClick={handleUpdate} variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: '#6d2323', color: '#fff', borderRadius: 2, '&:hover': { bgcolor: '#5a1d1d' } }}>Save</Button>
                    </>
                  ) : (
                    <Button onClick={handleClose} variant="outlined" sx={{ borderColor: '#6d2323', color: '#6d2323', borderRadius: 2 }}>Close</Button>
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