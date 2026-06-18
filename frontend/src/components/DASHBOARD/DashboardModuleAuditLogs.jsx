import API_BASE_URL from '../../apiConfig';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Modal,
  Fade,
  Backdrop,
  CircularProgress,
  Alert,
  Card,
  styled,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  HistoryToggleOff,
  Close,
  NavigateBefore,
  NavigateNext,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import {
  getDashboardAuditChanges,
  getDashboardAuditOperation,
  formatDashboardAuditTime,
  buildDashboardAuditSentence,
} from '../../utils/dashboardAuditFormat';

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  headerGrad: 'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  divider: 'rgba(0,0,0,0.08)',
};

const LOGS_PER_PAGE = 8;

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
});

const kindMap = {
  create: { label: 'Created', color: '#2E7D32', bg: '#E8F5E9', Icon: AddIcon },
  update: { label: 'Updated', color: '#1565C0', bg: '#E3F2FD', Icon: EditIcon },
  delete: { label: 'Deleted', color: '#C62828', bg: '#FFEBEE', Icon: DeleteIcon },
  activity: { label: 'Activity', color: T.accent, bg: T.accentFaint, Icon: HistoryToggleOff },
};

const ChangeLines = ({ changes, operation }) => {
  if (!changes.length) return null;

  return (
    <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {changes.map((change, index) => (
        <Box
          key={`${change.field || change.label}-${index}`}
          sx={{
            px: 1.25,
            py: 0.85,
            borderRadius: 1.5,
            bgcolor: alpha(T.accent, 0.04),
            border: `1px solid ${T.accentBorder}`,
          }}
        >
          {change.label && (
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.faint, mb: 0.35, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {change.label}
            </Typography>
          )}
          {operation === 'create' && change.create_line && (
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#2E7D32', fontFamily: 'monospace' }}>
              {change.create_line}
            </Typography>
          )}
          {operation === 'update' && (
            <>
              {change.update_line && (
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1565C0', fontFamily: 'monospace' }}>
                  {change.update_line}
                </Typography>
              )}
              {change.diff_line && (
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: T.text, fontFamily: 'monospace', mt: 0.25 }}>
                  {change.diff_line}
                </Typography>
              )}
            </>
          )}
          {operation === 'delete' && change.delete_line && (
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#C62828', fontFamily: 'monospace' }}>
              {change.delete_line}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

const AuditLogsPanel = ({ open, onClose, logs, loading, error, moduleLabel, auditPage, setAuditPage }) => {
  const totalPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
  const paginated = logs.slice((auditPage - 1) * LOGS_PER_PAGE, auditPage * LOGS_PER_PAGE);

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition slots={{ backdrop: Backdrop }}>
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '94vw', sm: 620 },
            maxHeight: '90vh',
            outline: 'none',
          }}
        >
          <SectionCard sx={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HistoryToggleOff sx={{ fontSize: 18, color: '#fff' }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2 }} noWrap>
                    Audit Logs
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)' }}>
                    {logs.length > 0 ? `${logs.length} recorded action(s)` : `All activity on ${moduleLabel}`}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.75)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
                <Close sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>

            <Box sx={{ px: 3, py: 2.5, overflowY: 'auto', flexGrow: 1, bgcolor: T.accentFaint }}>
              {loading ? (
                <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={28} sx={{ color: T.accent }} />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
              ) : logs.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <HistoryToggleOff sx={{ fontSize: 36, color: alpha(T.accent, 0.2), mb: 1 }} />
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>No activity yet.</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Create, update, and delete actions will appear here.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {paginated.map((log) => {
                    const operation = getDashboardAuditOperation(log);
                    const { label, color, bg, Icon } = kindMap[operation] || kindMap.activity;
                    const changes = getDashboardAuditChanges(log);
                    const timeLabel = formatDashboardAuditTime(log);
                    const targetNum = log.targetEmployeeNumber;
                    const targetName = log.targetName?.trim();

                    return (
                      <Box
                        key={log.id}
                        sx={{
                          bgcolor: '#fff',
                          borderRadius: 2,
                          p: 2.5,
                          border: `1px solid ${T.accentBorder}`,
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.35, borderRadius: '6px', bgcolor: bg, border: `1px solid ${alpha(color, 0.2)}` }}>
                            <Icon sx={{ fontSize: 12, color }} />
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color }}>{label}</Typography>
                          </Box>
                          {timeLabel && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ScheduleIcon sx={{ fontSize: 11, color: T.faint }} />
                              <Typography sx={{ fontSize: '0.7rem', color: T.faint }}>{timeLabel}</Typography>
                            </Box>
                          )}
                        </Box>

                        {targetNum && (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.5, mb: 1, bgcolor: alpha('#1565C0', 0.05), borderRadius: 1.5, border: '1px solid rgba(21,101,192,0.15)' }}>
                            <PersonIcon sx={{ fontSize: 14, color: '#1565C0' }} />
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#1565C0' }}>
                              #{targetNum}{targetName ? ` | ${targetName.toUpperCase()}` : ''}
                            </Typography>
                          </Box>
                        )}

                        <Typography sx={{ fontSize: '0.84rem', color: T.text, lineHeight: 1.6 }}>
                          {buildDashboardAuditSentence(log)}
                        </Typography>

                        <ChangeLines changes={changes} operation={operation} />
                      </Box>
                    );
                  })}

                  {totalPages > 1 && (
                    <Box sx={{ mt: 1, pt: 2, borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
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
        </Box>
      </Fade>
    </Modal>
  );
};

const DashboardModuleAuditLogs = ({ tableName, moduleLabel }) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const socket = useSocket();

  const fetchLogs = useCallback(async () => {
    if (!tableName) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(
        `${API_BASE_URL}/dashboard-audit/logs?table=${encodeURIComponent(tableName)}`,
        getAuthHeaders(),
      );
      const sorted = (Array.isArray(res.data) ? res.data : []).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );
      setLogs(sorted);
      setAuditPage(1);
    } catch {
      setError('Failed to load audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  useEffect(() => {
    if (!socket || !open) return undefined;
    const handleNew = (entry) => {
      if (String(entry?.table_name || '') === tableName) {
        fetchLogs();
      }
    };
    socket.on('auditLogCreated', handleNew);
    return () => socket.off('auditLogCreated', handleNew);
  }, [socket, open, tableName, fetchLogs]);

  const label = useMemo(() => moduleLabel || tableName, [moduleLabel, tableName]);

  return (
    <>
      <Tooltip title="View audit logs">
        <AccentButton
          onClick={() => setOpen(true)}
          variant="outlined"
          startIcon={<HistoryToggleOff sx={{ fontSize: '15px !important' }} />}
          sx={{
            fontSize: '0.8rem',
            color: T.accent,
            borderColor: T.accentBorder,
            bgcolor: 'transparent',
            '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, transform: 'none' },
          }}
        >
          Audit Logs
        </AccentButton>
      </Tooltip>

      <AuditLogsPanel
        open={open}
        onClose={() => setOpen(false)}
        logs={logs}
        loading={loading}
        error={error}
        moduleLabel={label}
        auditPage={auditPage}
        setAuditPage={setAuditPage}
      />
    </>
  );
};

export default DashboardModuleAuditLogs;
