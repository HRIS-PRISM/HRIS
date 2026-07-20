import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../../utils/auth';
import {
  Box,
  Typography,
  Card,
  Chip,
  CircularProgress,
  Fade,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  TextField,
  TablePagination,
  Tooltip,
  Avatar,
  IconButton,
  Dialog,
  Alert,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
  Assignment as AssignmentIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  TableChart as TableChartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Block as BlockIcon,
  Close as CloseIcon,
  EventBusy as EventBusyIcon,
  Info as InfoIcon,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';

/** Match absence rows to `employeeNames` keys (trimmed string). */
function normalizeEmployeeKey(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

/** Leave GET already joins `person_table`; also works for `/person_table/:id` rows. */
function displayNameFromPersonOrLeaveRow(row) {
  if (!row || typeof row !== 'object') return '';
  const full = row.fullName != null ? String(row.fullName).trim() : '';
  if (full) return full;
  const parts = [
    row.firstName,
    row.middleName,
    row.lastName,
    row.nameExtension,
  ].map((x) => (x != null ? String(x).trim() : '')).filter(Boolean);
  return parts.join(' ').trim();
}

// ─── Theme tokens (unified with other modules) ────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  headerGrad:   'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  awolRow:      'rgba(254,226,226,0.45)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
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
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const PanelHeader = ({ icon: Icon, title, rightContent }) => (
  <Box sx={{
    px: 2.5, py: 1.5,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${T.divider}`,
    bgcolor: T.accentFaint,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>{title}</Typography>
    </Box>
    {rightContent}
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
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        padding: icon ? '9px 13px 9px 34px' : '9px 13px',
        borderRadius: '8px',
        border: `1px solid ${T.accentBorder}`,
        fontSize: '0.875rem',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.18s',
        background: disabled ? '#f5f5f5' : '#fff',
        color: T.text,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}}
      onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = 'none'; }}
    />
  </Box>
);

// ─── Status / Type badge configs ──────────────────────────────────────────────
const absenceTypeConfig = {
  AWOL:            { label: 'AWOL',           color: '#b91c1c', bg: '#fee2e2', border: '#fecaca', dot: '#ef4444' },
  'Vacation Leave':{ label: 'Vacation Leave', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  'Sick Leave':    { label: 'Sick Leave',     color: '#92400e', bg: '#fefce8', border: '#fef08a', dot: '#eab308' },
};

const statusConfig = {
  Approved:    { label: 'Approved',    color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', icon: CheckCircleIcon },
  Pending:     { label: 'Pending',     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', icon: AccessTimeIcon  },
  Disapproved: { label: 'Disapproved', color: '#991b1b', bg: '#fee2e2', border: '#fecaca', dot: '#ef4444', icon: BlockIcon       },
};

const TypeBadge = ({ type }) => {
  const cfg = absenceTypeConfig[type] || absenceTypeConfig['Sick Leave'];
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', px: '10px', py: '2px', borderRadius: '99px', bgcolor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</Typography>
    </Box>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig['Pending'];
  const Icon = cfg.icon;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', px: '10px', py: '2px', borderRadius: '99px', bgcolor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</Typography>
    </Box>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon: Icon }) => (
  <Box sx={{
    flex: 1, minWidth: 130,
    p: 2, borderRadius: '10px',
    bgcolor: '#fff',
    border: `1px solid ${T.accentBorder}`,
    display: 'flex', flexDirection: 'column', gap: 0.5,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</Typography>
      {Icon && <Icon sx={{ fontSize: 16, color: alpha(color, 0.4) }} />}
    </Box>
    <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
  </Box>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ open, onClose, record, employeeNames }) => {
  if (!record) return null;
  const empName = employeeNames[record.employeeNumber] || record.employeeName || '—';
  const typeCfg = absenceTypeConfig[record.absenceType] || absenceTypeConfig['Sick Leave'];
  const stCfg   = statusConfig[record.status]          || statusConfig['Pending'];
  const StIcon  = stCfg.icon;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle,${alpha(T.accent,0.1)} 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: T.accent, opacity: 0.5, '&:hover': { opacity: 1 } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: alpha(T.accent, 0.12), width: 46, height: 46, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 800, fontSize: '1rem' }}>
            {(empName.split(' ').map(n => n[0]).join('').slice(0, 2) || '?').toUpperCase()}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.accent, lineHeight: 1.2 }}>{empName}</Typography>
            <Typography sx={{ fontSize: '0.74rem', color: T.faint, fontWeight: 500 }}>{record.employeeNumber} · {record.department}</Typography>
          </Box>
        </Box>
      </Box>
      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[
          { label: 'Date',         value: record.date },
          { label: 'Absence Type', value: <TypeBadge type={record.absenceType} /> },
          { label: 'Status',       value: <StatusBadge status={record.status} /> },
          { label: 'Remarks',      value: record.remarks || '—' },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${T.divider}` }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.muted }}>{label}</Typography>
            <Box sx={{ textAlign: 'right' }}>
              {typeof value === 'string'
                ? <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }}>{value}</Typography>
                : value}
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer' }}>
          Close
        </button>
      </Box>
    </Dialog>
  );
};

// ─── Wireframe Skeleton ───────────────────────────────────────────────────────
const AbsencesReportWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, width: '100vw', maxWidth: '100%', position: 'relative', left: '53%', transform: 'translateX(-51%)', px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Box><Bone w={260} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        {[1,2,3,4].map(i => <Box key={i} sx={{ flex: 1, height: 80, borderRadius: '10px', bgcolor: '#fff', border: `1px solid ${T.accentBorder}`, animation: `blink 2s ease-in-out ${i * 0.1}s infinite` }} />)}
      </Box>
      <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff', animation: 'blink 2s ease-in-out 0.2s infinite' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}><Bone w={180} h={12} /></Box>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(i => <Box key={i} sx={{ flex: 1, height: 36, borderRadius: '8px', bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />)}
        </Box>
      </Box>
      <Box sx={{ mt: 2, borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)', bgcolor: '#fff' }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent }}><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array(7).fill(0).map((_, i) => <Box key={i} sx={{ height: 10, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)' }} />)}
        </Box></Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: i % 2 === 0 ? '#fff' : T.rowOdd }}>
            {Array(7).fill(0).map((_, j) => <Bone key={j} h={12} w={j === 6 ? '60%' : '80%'} />)}
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AbsencesReport = () => {
  const [absences,       setAbsences]       = useState([]);
  const [leaveRequests,  setLeaveRequests]  = useState([]);
  const [leaveTypes,     setLeaveTypes]     = useState([]);
  const [employeeNames,  setEmployeeNames]  = useState({});
  const [departments,    setDepartments]    = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [pageLoading,    setPageLoading]    = useState(true);

  // Filters
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [searchName,     setSearchName]     = useState('');
  const [searchEmpNum,   setSearchEmpNum]   = useState('');
  const [deptFilter,     setDeptFilter]     = useState('all');
  const [typeFilter,     setTypeFilter]     = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');

  // Table
  const [page,           setPage]           = useState(0);
  const [rowsPerPage,    setRowsPerPage]    = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailOpen,     setDetailOpen]     = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaveRes, typeRes, attendanceAbsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/leaveRoute/leave_request`, getAuthHeaders()),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_table`,   getAuthHeaders()),
        axios.get(`${API_BASE_URL}/attendance/api/overall_attendance_absences`, getAuthHeaders()),
      ]);

      const requests = Array.isArray(leaveRes.data) ? leaveRes.data : [];
      const types    = Array.isArray(typeRes.data)  ? typeRes.data  : [];
      setLeaveTypes(types);
      setLeaveRequests(requests);

      const attendanceAbs = Array.isArray(attendanceAbsRes.data?.data) ? attendanceAbsRes.data.data : [];

      // Employee display names: seed from leave list (API joins person_table), then fetch gaps
      // (AWOL-only employees never appear on leave requests but still need names).
      const names = {};
      const deptSet = new Set();

      requests.forEach((r) => {
        const key = normalizeEmployeeKey(r.employeeNumber ?? r.employeeId ?? r.employee_id);
        if (!key) return;
        const label = displayNameFromPersonOrLeaveRow(r);
        if (label) names[key] = label;
      });

      const needFetch = new Set();
      requests.forEach((r) => {
        const key = normalizeEmployeeKey(r.employeeNumber ?? r.employeeId ?? r.employee_id);
        if (key && !names[key]) needFetch.add(key);
      });
      attendanceAbs.forEach((a) => {
        const key = normalizeEmployeeKey(a.employeeNumber);
        if (key && !names[key]) needFetch.add(key);
      });

      await Promise.all(
        [...needFetch].map(async (emp) => {
          try {
            const res = await axios.get(
              `${API_BASE_URL}/personalinfo/person_table/${encodeURIComponent(emp)}`,
              getAuthHeaders(),
            );
            const label = displayNameFromPersonOrLeaveRow(res.data) || 'Unknown';
            names[emp] = label;
            const agency = normalizeEmployeeKey(res.data?.agencyEmployeeNum);
            if (agency && agency !== emp) names[agency] = label;
            const pid = res.data?.id;
            if (pid != null && String(pid) !== emp) names[String(pid)] = label;
            if (res.data?.department) deptSet.add(res.data.department);
          } catch {
            names[emp] = 'Unknown';
          }
        }),
      );

      setEmployeeNames(names);

      // Try to fetch departments from employees or a separate endpoint
      try {
        const deptRes = await axios.get(`${API_BASE_URL}/department`, getAuthHeaders());
        const deptList = Array.isArray(deptRes.data) ? deptRes.data.map(d => d.name || d.department || d).filter(Boolean) : [];
        if (deptList.length) setDepartments(deptList);
        else setDepartments([...deptSet]);
      } catch {
        setDepartments([...deptSet]);
      }

      // Convert leave requests to absence records
      const absenceRecords = [];
      const leaveByEmpDate = new Map();
      requests.forEach(req => {
        const empKey = normalizeEmployeeKey(req.employeeNumber ?? req.employeeId ?? req.employee_id);
        if (!empKey) return;
        const dates = Array.isArray(req.leave_date)
          ? req.leave_date
          : String(req.leave_date || '').split(',').map(s => s.trim()).filter(Boolean);

        const leaveType = types.find(t => t.leave_code === req.leave_code);
        const desc = leaveType?.leave_description || req.leave_code || '';

        // Map leave request status to absence status
        const statusMap = { '0': 'Pending', '1': 'Pending', '2': 'Approved', '3': 'Disapproved', '4': 'Disapproved' };
        const absStatus = statusMap[String(req.status)] || 'Pending';

        // Determine absence type
        let absType = 'Sick Leave';
        const dl = desc.toLowerCase();
        const cl = (req.leave_code || '').toLowerCase();
        if (dl.includes('vacation') || dl.includes('annual') || cl.includes('vl')) absType = 'Vacation Leave';
        else if (dl.includes('sick') || cl.includes('sl')) absType = 'Sick Leave';
        else absType = desc || 'Sick Leave';

        dates.forEach(date => {
          const rec = {
            id:             `${req.id}-${date}`,
            requestId:      req.id,
            employeeNumber: empKey,
            department:     req.department || req.code || '—',
            date,
            absenceType:    absType,
            status:         absStatus,
            remarks:        req.remarks || (absStatus === 'Approved' ? 'Pre-approved leave' : '—'),
            rawStatus:      String(req.status),
          };
          absenceRecords.push(rec);
          // Keep the best (non-disapproved) record if duplicates exist
          const k = `${rec.employeeNumber}|${rec.date}`;
          const prev = leaveByEmpDate.get(k);
          if (!prev) leaveByEmpDate.set(k, rec);
          else {
            const rank = (s) => (s === 'Approved' ? 3 : s === 'Pending' ? 2 : 1);
            if (rank(rec.status) >= rank(prev.status)) leaveByEmpDate.set(k, rec);
          }
        });
      });

      // Add attendance absences as AWOL only when no leave request exists for same employee+date.
      attendanceAbs.forEach((a) => {
        const employeeNumber = normalizeEmployeeKey(a.employeeNumber);
        const date = String(a.date || '');
        if (!employeeNumber || !date) return;
        const k = `${employeeNumber}|${date}`;
        if (leaveByEmpDate.has(k)) return; // leave filed for that absence date
        absenceRecords.push({
          id:             `awol-${employeeNumber}-${date}`,
          requestId:      null,
          employeeNumber,
          department:     a.department || '—',
          date,
          absenceType:    'AWOL',
          status:         'Pending',
          remarks:        'No leave filed',
          rawStatus:      '0',
        });
      });

      // Sort by date descending
      absenceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAbsences(absenceRecords);

    } catch (err) {
      console.error('AbsencesReport fetch error:', err);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return absences.filter(r => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo   && r.date > dateTo)   return false;
      if (deptFilter !== 'all' && r.department !== deptFilter) return false;
      if (typeFilter !== 'all' && r.absenceType !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      const name = (employeeNames[r.employeeNumber] || '').toLowerCase();
      if (searchName   && !name.includes(searchName.toLowerCase())                                      ) return false;
      if (searchEmpNum && !r.employeeNumber.toLowerCase().includes(searchEmpNum.toLowerCase())) return false;
      return true;
    });
  }, [absences, dateFrom, dateTo, deptFilter, typeFilter, statusFilter, searchName, searchEmpNum, employeeNames]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    filtered.length,
    awol:     filtered.filter(r => r.absenceType === 'AWOL').length,
    approved: filtered.filter(r => r.status === 'Approved').length,
    pending:  filtered.filter(r => r.status === 'Pending').length,
  }), [filtered]);

  // ── Unique values for filters ─────────────────────────────────────────────
  const absenceTypes = useMemo(() => [...new Set(absences.map(r => r.absenceType))], [absences]);

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setSearchName(''); setSearchEmpNum('');
    setDeptFilter('all'); setTypeFilter('all'); setStatusFilter('all');
    setPage(0);
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  if (pageLoading) return <AbsencesReportWireframe />;

  const formatDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const TABLE_COLS = [
    { key: 'employeeNumber', label: 'Emp No.',       w: 110 },
    { key: 'name',           label: 'Employee Name', w: 180 },
    { key: 'department',     label: 'Department',    w: 140 },
    { key: 'date',           label: 'Date',          w: 130 },
    { key: 'absenceType',    label: 'Type',          w: 160 },
    { key: 'status',         label: 'Status',        w: 130 },
    { key: 'remarks',        label: 'Remarks',       w: 200 },
  ];

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '53%',
        transform: 'translateX(-51%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{shimmerKf}</style>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #absences-printable, #absences-printable * { visibility: visible; }
            #absences-printable { position: absolute; top: 0; left: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, position: 'relative', zIndex: 1 }}>
              {/* Seal */}
              <Box sx={{
                width: 52, height: 52, borderRadius: '50%',
                border: `2px solid ${T.accent}`, bgcolor: alpha(T.accent, 0.07),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <EventBusyIcon sx={{ fontSize: 26, color: T.accent, opacity: 0.8 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, mb: 0.25 }}>
                  Human Resource Information System
                </Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Absences Report
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                  List of employee absences including AWOL, leave, and approved absences
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.65rem', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Generated</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text }}>{today}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Refresh">
                  <IconButton
                    size="small"
                    onClick={fetchData}
                    disabled={loading}
                    sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}
                  >
                    {loading ? <CircularProgress size={14} sx={{ color: T.accent }} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print Report">
                  <IconButton
                    size="small"
                    onClick={handlePrint}
                    sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, '&:hover': { bgcolor: alpha(T.accent, 0.14) } }}
                  >
                    <PrintIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Stat Cards ── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }} className="no-print">
          <StatCard label="Total Incidents"  value={stats.total}    color={T.accent}  icon={AssignmentIcon}  />
          <StatCard label="AWOL"             value={stats.awol}     color="#dc2626"   icon={WarningIcon}     />
          <StatCard label="Approved Leaves"  value={stats.approved} color="#059669"   icon={CheckCircleIcon} />
          <StatCard label="Pending"          value={stats.pending}  color="#d97706"   icon={AccessTimeIcon}  />
        </Box>

        {/* ── Filter Panel ── */}
        <SectionCard sx={{ mb: 2 }} className="no-print">
          <PanelHeader
            icon={FilterListIcon}
            title="Report Filters"
            rightContent={
              <button
                onClick={clearFilters}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.faint, fontSize: '0.72rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Clear All
              </button>
            }
          />
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Date From */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Date From</Typography>
                <NativeInput type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />} />
              </Box>
              {/* Date To */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Date To</Typography>
                <NativeInput type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />} />
              </Box>
              {/* Name search */}
              <Box sx={{ flex: '1 1 160px', minWidth: 160 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Employee Name</Typography>
                <NativeInput value={searchName} onChange={e => { setSearchName(e.target.value); setPage(0); }} placeholder="Search name..." icon={<PersonIcon sx={{ fontSize: 14 }} />} />
              </Box>
              {/* Emp No. search */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Employee No.</Typography>
                <NativeInput value={searchEmpNum} onChange={e => { setSearchEmpNum(e.target.value); setPage(0); }} placeholder="EMP-XXX..." />
              </Box>
              {/* Department */}
              <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Department</Typography>
                <FormControl fullWidth size="small">
                  <Select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(0); }}
                    sx={{ borderRadius: '8px', fontSize: '0.875rem', bgcolor: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' } }}>
                    <MenuItem value="all" sx={{ fontSize: '0.875rem' }}>All Departments</MenuItem>
                    {departments.map(d => <MenuItem key={d} value={d} sx={{ fontSize: '0.875rem' }}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              {/* Type */}
              <Box sx={{ flex: '1 1 140px', minWidth: 140 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Absence Type</Typography>
                <FormControl fullWidth size="small">
                  <Select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
                    sx={{ borderRadius: '8px', fontSize: '0.875rem', bgcolor: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' } }}>
                    <MenuItem value="all" sx={{ fontSize: '0.875rem' }}>All Types</MenuItem>
                    {absenceTypes.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.875rem' }}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              {/* Status */}
              <Box sx={{ flex: '1 1 130px', minWidth: 130 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.faint, mb: 0.5 }}>Status</Typography>
                <FormControl fullWidth size="small">
                  <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                    sx={{ borderRadius: '8px', fontSize: '0.875rem', bgcolor: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent, borderWidth: '1.5px' } }}>
                    <MenuItem value="all"         sx={{ fontSize: '0.875rem' }}>All Status</MenuItem>
                    <MenuItem value="Approved"    sx={{ fontSize: '0.875rem' }}>Approved</MenuItem>
                    <MenuItem value="Pending"     sx={{ fontSize: '0.875rem' }}>Pending</MenuItem>
                    <MenuItem value="Disapproved" sx={{ fontSize: '0.875rem' }}>Disapproved</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Data Table ── */}
        <SectionCard id="absences-printable">

          {/* Toolbar */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }} className="no-print">
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <SearchIcon sx={{ position: 'absolute', left: 10, fontSize: 15, color: T.faint, pointerEvents: 'none' }} />
              <input
                placeholder="Search records..."
                value={searchName}
                onChange={e => { setSearchName(e.target.value); setPage(0); }}
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, width: 220, fontSize: '0.8rem', border: `1px solid ${T.accentBorder}`, borderRadius: '6px', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.borderColor = T.accent; }}
                onBlur={e => { e.target.style.borderColor = T.accentBorder; }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {loading && <CircularProgress size={14} sx={{ color: T.accent }} />}
              <Typography sx={{ fontSize: '0.78rem', color: T.faint, fontWeight: 600 }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>

          {/* Print-only header */}
          <Box sx={{ display: 'none', '@media print': { display: 'block' }, px: 3, py: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: T.accent }}>Absences Report</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>Generated: {today}</Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Typography sx={{ fontSize: '0.75rem' }}>Total: <strong>{stats.total}</strong></Typography>
              <Typography sx={{ fontSize: '0.75rem' }}>AWOL: <strong>{stats.awol}</strong></Typography>
              <Typography sx={{ fontSize: '0.75rem' }}>Approved: <strong>{stats.approved}</strong></Typography>
              <Typography sx={{ fontSize: '0.75rem' }}>Pending: <strong>{stats.pending}</strong></Typography>
            </Box>
          </Box>

          {/* Table scroll */}
          <Box sx={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto', scrollbarWidth: 'thin', '&::-webkit-scrollbar': { height: 5, width: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 3 } }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 900 }}>
              <thead>
                <tr>
                  {TABLE_COLS.map(col => (
                    <th key={col.key} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#fff', whiteSpace: 'nowrap',
                      background: T.accent,
                      borderBottom: `2px solid ${alpha(T.accent, 0.4)}`,
                      position: 'sticky', top: 0, zIndex: 10,
                      minWidth: col.w,
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '60px 16px', textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <EventBusyIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.25) }} />
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>
                          {absences.length === 0 ? 'No absence records found' : 'No records match your filters'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                          {absences.length === 0 ? 'Data is pulled from Leave Requests and attendance saved from Non-Teaching, Faculty Designated, and Faculty 30hrs modules.' : 'Try adjusting your filter criteria.'}
                        </Typography>
                      </Box>
                    </td>
                  </tr>
                ) : paged.map((rec, idx) => {
                  const isAWOL   = rec.absenceType === 'AWOL';
                  const isEven   = idx % 2 === 0;
                  const rowBg    = isAWOL ? T.awolRow : isEven ? T.rowEven : T.rowOdd;
                  const empName  = employeeNames[rec.employeeNumber] || '—';
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => { setSelectedRecord(rec); setDetailOpen(true); }}
                      style={{ borderBottom: `1px solid ${T.divider}`, background: rowBg, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.rowHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                    >
                      {/* Emp No. */}
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.72rem', color: T.accent, fontWeight: 700 }}>
                        {rec.employeeNumber}
                      </td>
                      {/* Name */}
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: T.text }}>{empName}</td>
                      {/* Department */}
                      <td style={{ padding: '10px 16px', color: T.muted }}>{rec.department}</td>
                      {/* Date */}
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: T.muted }}>{formatDate(rec.date)}</td>
                      {/* Type */}
                      <td style={{ padding: '10px 16px' }}><TypeBadge type={rec.absenceType} /></td>
                      {/* Status */}
                      <td style={{ padding: '10px 16px' }}><StatusBadge status={rec.status} /></td>
                      {/* Remarks */}
                      <td style={{ padding: '10px 16px', color: T.muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={rec.remarks || '—'} placement="top">
                          <span>{rec.remarks || '—'}</span>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ background: alpha(T.accent, 0.05), borderTop: `2px solid ${T.accentBorder}` }}>
                    <td colSpan={7} style={{ padding: '10px 16px', fontSize: '0.75rem', fontWeight: 700, color: T.muted }}>
                      Total: {filtered.length} record{filtered.length !== 1 ? 's' : ''}&nbsp;|&nbsp;AWOL: {stats.awol}&nbsp;|&nbsp;Approved: {stats.approved}&nbsp;|&nbsp;Pending: {stats.pending}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Box>

          {/* Pagination */}
          {filtered.length > 0 && (
            <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }} className="no-print">
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
                sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }}
              />
            </Box>
          )}
        </SectionCard>

        {/* ── Signature Card (for print) ── */}
        <SectionCard sx={{ mt: 2, display: 'none', '@media print': { display: 'block' } }}>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.faint, mb: 2 }}>Certification</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
              {['Prepared by:', 'Verified by:', 'Noted by:'].map(role => (
                <Box key={role}>
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint, mb: 3 }}>{role}</Typography>
                  <Box sx={{ borderBottom: `1px solid #475569`, mb: 0.5 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>Signature over Printed Name</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>Designation / Date</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </SectionCard>

        {/* ── Source info ── */}
        <Box sx={{ mt: 1.5, px: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }} className="no-print">
          <InfoIcon sx={{ fontSize: 13, color: T.faint }} />
          <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>
            AWOL dates follow <strong>absent dates saved</strong> from <strong>Non-Teaching</strong>, <strong>Faculty Designated</strong>, and <strong>Faculty 30hrs</strong> attendance modules (plus <strong>Leave Request Management</strong>). Click any row to view details.
          </Typography>
        </Box>

        {/* ── Detail Modal ── */}
        <DetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          record={selectedRecord}
          employeeNames={employeeNames}
        />
      </Box>
    </Fade>
  );
};

export default AbsencesReport;