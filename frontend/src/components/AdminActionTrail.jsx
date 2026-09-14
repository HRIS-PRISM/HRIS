import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  alpha,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Backdrop,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Home,
  History,
  Search as SearchIcon,
  Close as CloseIcon,
  Security,
  AdminPanelSettings,
} from '@mui/icons-material';
import { getUserInfo } from '../utils/auth';
import AccessDenied from './AccessDenied';
import { useSocket } from '../contexts/SocketContext';

/* ── Design tokens (aligned with PagesList / UsersList) ── */
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  rowOdd: 'rgba(109,35,35,0.025)',
  rowHover: 'rgba(109,35,35,0.055)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  surface: '#ffffff',
};

const BD = T.accentBorder;
const SUBTLE = 'rgba(109,35,35,0.03)';

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: `0.5px solid ${T.accentBorder}`,
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
};

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const roleLabel = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'superadmin') return 'Superadmin';
  if (r === 'administrator' || r === 'admin') return 'Administrator';
  return role || '—';
};

const formatModuleName = (tableName) => {
  if (!tableName) return '—';
  return String(tableName)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getActionColor = (action) => {
  if (!action) return T.accent;
  const a = action.toUpperCase();
  if (['DELETE', 'REMOVE', 'DESTROY'].some((k) => a.includes(k)))
    return '#c62828';
  if (['UPDATE', 'EDIT', 'MODIFY', 'CHANGE'].some((k) => a.includes(k)))
    return '#1565c0';
  if (['VIEW', 'OPEN', 'READ'].some((k) => a.includes(k))) return '#00838f';
  if (['CREATE', 'ADD', 'INSERT', 'REGISTER'].some((k) => a.includes(k)))
    return '#2e7d32';
  return T.accent;
};

const headCellSx = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.6rem',
  fontWeight: 700,
  color: alpha(T.accent, 0.5),
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  borderBottom: `2px solid ${alpha(T.accent, 0.12)}`,
  bgcolor: '#fafafa',
  py: 0.75,
  px: 2,
  whiteSpace: 'nowrap',
};

const AdminActionTrail = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const info = getUserInfo();
    setUserRole(String(info?.role || '').toLowerCase());
  }, []);

  const canAccess = userRole === 'superadmin' || userRole === 'technical';

  const loadLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const params = {};
        if (actionFilter.trim()) params.action = actionFilter.trim();
        if (moduleFilter.trim()) params.module = moduleFilter.trim();
        if (employeeFilter.trim()) params.employeeNumber = employeeFilter.trim();
        if (roleFilter.trim()) params.actor_role = roleFilter.trim();
        if (dateFilter) {
          params.dateFrom = dateFilter;
          params.dateTo = dateFilter;
        }
        const response = await axios.get(`${API_BASE_URL}/admin-action-trail`, {
          ...getAuthHeaders(),
          params,
        });
        setLogs(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error loading admin action trail:', error);
        setLogs([]);
        setToast({
          message:
            error?.response?.data?.error ||
            'Failed to load admin action trail',
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [actionFilter, moduleFilter, employeeFilter, roleFilter, dateFilter],
  );

  useEffect(() => {
    if (!userRole) return;
    if (!canAccess) {
      setLoading(false);
      return;
    }
    loadLogs();
  }, [userRole, canAccess, loadLogs]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, moduleFilter, employeeFilter, roleFilter, dateFilter]);

  useEffect(() => {
    if (!socket || !canAccess) return;
    const handleNew = (newLog) => {
      setLogs((prev) => {
        if (prev.some((l) => l.id === newLog.id)) return prev;
        return [newLog, ...prev];
      });
    };
    socket.on('adminActionTrailCreated', handleNew);
    return () => socket.off('adminActionTrailCreated', handleNew);
  }, [socket, canAccess]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const uniqueActions = useMemo(
    () =>
      [...new Set(logs.map((l) => l.action).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b)),
      ),
    [logs],
  );

  const uniqueModules = useMemo(
    () =>
      [...new Set(logs.map((l) => l.table_name).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b)),
      ),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter && String(log.action || '') !== actionFilter) return false;
      if (moduleFilter && String(log.table_name || '') !== moduleFilter)
        return false;
      if (employeeFilter) {
        const q = employeeFilter.toLowerCase();
        const emp = String(log.employeeNumber || '').toLowerCase();
        const name = String(log.actorName || '').toLowerCase();
        if (!emp.includes(q) && !name.includes(q)) return false;
      }
      if (
        roleFilter &&
        String(log.actor_role || '').toLowerCase() !== roleFilter.toLowerCase()
      ) {
        return false;
      }
      if (dateFilter) {
        const ts = log.timestamp ? new Date(log.timestamp) : null;
        if (!ts || Number.isNaN(ts.getTime())) return false;
        if (ts.toISOString().slice(0, 10) !== dateFilter) return false;
      }
      return true;
    });
  }, [
    logs,
    actionFilter,
    moduleFilter,
    employeeFilter,
    roleFilter,
    dateFilter,
  ]);

  const pagedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

  const handleExport = () => {
    let csv =
      'Timestamp,Employee Number,Actor Name,Actor Role,Action,Table Name,Record ID,Target Employee,Target Name\n';
    filteredLogs.forEach((log) => {
      const timestamp = new Date(log.timestamp || log.created_at).toLocaleString();
      csv += `"${timestamp}","${log.employeeNumber || ''}","${log.actorName || ''}","${log.actor_role || ''}","${log.action || ''}","${log.table_name || ''}","${log.record_id || ''}","${log.targetEmployeeNumber || ''}","${log.targetName || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-action-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setToast({ message: 'Export downloaded', type: 'success' });
  };

  if (userRole && !canAccess) {
    return (
      <AccessDenied
        title="Access Denied"
        message="Only superadmin and technical roles can view the Admin Action Trail."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  if (!userRole) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={28} sx={{ color: T.accent }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        // UsersList shell, with a bit more right inset so it isn't edge-flush
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw',
        maxWidth: 'none',
        position: 'relative',
        left: '63%',
        transform: 'translateX(-61%)',
        pl: { xs: 2, sm: 3, md: 5 },
        pr: { xs: 3, sm: 5, md: 10 },
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 160px)',
      }}
    >
      <style>{GLOBAL_CSS}</style>

      <Backdrop
        open={!!toast}
        sx={{ zIndex: 9999, backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.5)' }}
        onClick={() => setToast(null)}
      >
        <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 360, maxWidth: 520 }}>
          {toast && (
            <Alert
              severity={toast.type === 'error' ? 'error' : 'success'}
              sx={{
                borderRadius: 3,
                boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                fontSize: '1rem',
                p: 2.5,
                '& .MuiAlert-message': { fontWeight: 600 },
              }}
              onClose={() => setToast(null)}
            >
              {toast.message}
            </Alert>
          )}
        </Box>
      </Backdrop>

      {/* Hero */}
      <SectionCard sx={{ mb: 1.5, flexShrink: 0, width: '100%' }}>
        <Box
          sx={{
            px: 4,
            py: 1.5,
            background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            flexWrap: 'wrap',
            gap: 1.5,
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
                background:
                  'radial-gradient(circle,rgba(109,35,35,0.1) 0%,transparent 70%)',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Security sx={{ fontSize: 28, color: T.accent }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.2,
                  }}
                >
                  Admin Action Trail
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: T.accentMid,
                    fontWeight: 600,
                    opacity: 0.9,
                  }}
                >
                  Superadmin and administrator actions only · read-only
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  borderRadius: 6,
                  bgcolor: alpha(T.accent, 0.09),
                  border: `1px solid ${alpha(T.accent, 0.18)}`,
                }}
              >
                <Typography
                  sx={{ fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}
                >
                  {filteredLogs.length} log
                  {filteredLogs.length !== 1 ? 's' : ''}
                </Typography>
              </Box>

              <Tooltip title="Home">
                <IconButton
                  size="small"
                  onClick={() => navigate('/admin-home')}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${alpha(T.accent, 0.18)}`,
                    borderRadius: 1.5,
                    color: T.accent,
                    '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                  }}
                >
                  <Home sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  onClick={() => loadLogs(true)}
                  disabled={loading || refreshing}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: alpha(T.accent, 0.08),
                    border: `1px solid ${alpha(T.accent, 0.18)}`,
                    borderRadius: 1.5,
                    color: T.accent,
                    '&:hover': { bgcolor: alpha(T.accent, 0.14) },
                  }}
                >
                  {loading || refreshing ? (
                    <CircularProgress size={14} sx={{ color: T.accent }} />
                  ) : (
                    <RefreshIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </Tooltip>

              <AccentButton
                size="small"
                variant="contained"
                startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                onClick={handleExport}
                sx={{
                  fontSize: '0.78rem',
                  bgcolor: T.accent,
                  color: '#fff',
                  boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                  '&:hover': { bgcolor: T.accentDark },
                }}
              >
                Export
              </AccentButton>
            </Box>
          </Box>
        </SectionCard>

        {/* Records */}
        <SectionCard
          sx={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.25,
              borderBottom: `1px solid ${BD}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: SUBTLE,
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <SearchIcon
              sx={{ color: alpha(T.accent, 0.4), fontSize: 17, flexShrink: 0 }}
            />
            <FieldInput
              size="small"
              placeholder="Search employee # or name…"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              sx={{ minWidth: 180, flex: 1, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              InputProps={{
                endAdornment: employeeFilter ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setEmployeeFilter('')}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            <FieldInput
              select
              size="small"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            >
              <MenuItem value="">All Actions</MenuItem>
              {uniqueActions.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </FieldInput>
            <FieldInput
              select
              size="small"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            >
              <MenuItem value="">All Modules</MenuItem>
              {uniqueModules.map((m) => (
                <MenuItem key={m} value={m}>
                  {formatModuleName(m)}
                </MenuItem>
              ))}
            </FieldInput>
            <FieldInput
              select
              size="small"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="superadmin">Superadmin</MenuItem>
              <MenuItem value="administrator">Administrator</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </FieldInput>
            <FieldInput
              type="date"
              size="small"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {loading && !logs.length ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    border: `2px solid ${alpha(T.accent, 0.15)}`,
                    borderTopColor: T.accent,
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    mx: 'auto',
                    mb: 2,
                  }}
                />
                <Typography
                  sx={{ color: T.muted, fontWeight: 500, fontSize: '0.84rem' }}
                >
                  Loading admin action trail…
                </Typography>
              </Box>
            ) : (
              <Table stickyHeader size="small" sx={{ width: '100%', minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    {['When', 'Actor', 'Role', 'Action', 'Module', 'Target', 'Summary'].map(
                      (h) => (
                        <TableCell key={h} sx={headCellSx}>
                          {h}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                        <History
                          sx={{
                            fontSize: 40,
                            color: alpha(T.accent, 0.25),
                            mb: 1,
                          }}
                        />
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: T.accent,
                            fontSize: '0.9rem',
                          }}
                        >
                          No admin actions found
                        </Typography>
                        <Typography
                          sx={{ color: T.muted, fontSize: '0.78rem', mt: 0.5 }}
                        >
                          Superadmin and administrator actions will appear here
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedLogs.map((log) => {
                      const actionColor = getActionColor(log.action);
                      return (
                        <TableRow
                          key={log.id}
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: T.rowOdd },
                            '&:hover': { bgcolor: T.rowHover },
                            transition: 'background-color 0.12s ease',
                            borderBottom: `1px solid ${alpha(T.accent, 0.06)}`,
                          }}
                        >
                          <TableCell sx={{ px: 2, py: 1.1, whiteSpace: 'nowrap' }}>
                            <Typography
                              sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.7rem',
                                color: T.muted,
                                fontWeight: 500,
                              }}
                            >
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                color: T.text,
                                lineHeight: 1.2,
                              }}
                            >
                              {log.actorName || '—'}
                            </Typography>
                            <Typography
                              sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.65rem',
                                color: T.faint,
                              }}
                            >
                              #{log.employeeNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Chip
                              size="small"
                              icon={
                                <AdminPanelSettings
                                  sx={{ fontSize: '13px !important' }}
                                />
                              }
                              label={roleLabel(log.actor_role)}
                              sx={{
                                height: 22,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: alpha(T.accent, 0.08),
                                color: T.accent,
                                border: `1px solid ${alpha(T.accent, 0.15)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                px: 1,
                                py: 0.2,
                                borderRadius: '20px',
                                bgcolor: alpha(actionColor, 0.08),
                                border: `1px solid ${alpha(actionColor, 0.2)}`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: actionColor,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {String(log.action || '—').toUpperCase()}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Typography
                              sx={{ fontSize: '0.78rem', color: T.text, fontWeight: 500 }}
                            >
                              {formatModuleName(log.table_name)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1 }}>
                            <Typography sx={{ fontSize: '0.78rem', color: T.text }}>
                              {log.targetName || log.targetEmployeeNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.1, maxWidth: 280 }}>
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                color: T.muted,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {`${String(log.action || 'Action')} on ${formatModuleName(
                                log.table_name,
                              )}${log.record_id ? ` #${log.record_id}` : ''}`}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </Box>

          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              flexShrink: 0,
              borderTop: `1px solid ${BD}`,
              bgcolor: SUBTLE,
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows':
                {
                  fontSize: '0.78rem',
                  color: T.muted,
                },
            }}
          />
        </SectionCard>
    </Box>
  );
};

export default AdminActionTrail;
