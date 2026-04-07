import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SuccessfulOverlay from "./SuccessfulOverlay";
import {
  TextField, Button, Box, Typography,
  Table, TableBody, TableCell,
  TableHead, TableRow, CircularProgress, InputAdornment,
  IconButton, Avatar, Chip, TablePagination,
  Fade, Tooltip, alpha, Card, Tabs, Tab,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Search,
  Refresh,
  LockReset as LockResetIcon,
  WarningAmberRounded,
  ArrowBack as ArrowBackIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import { getAuthHeaders } from "../utils/auth";

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

// ─── Styled primitives ─────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
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

// ─── Shimmer ───────────────────────────────────────────────────────────────────
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
    background: 'linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.6s infinite linear',
    flexShrink: 0,
    ...sx,
  }} />
);

const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '63%', transform: 'translateX(-61%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.accentBorder}`, animation: 'blink 2s ease-in-out infinite' }}>
        <Box sx={{ p: 3.5, background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
            <Box><Bone w={200} h={18} sx={{ mb: 1 }} /><Bone w={320} h={11} /></Box>
          </Box>
          <Bone w={120} h={32} r={8} />
        </Box>
      </Box>
      <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff', overflow: 'hidden', animation: 'blink 2s ease-in-out 0.1s infinite', height: 'calc(100vh - 200px)' }}>
        <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.12)' }} />
          <Bone w={160} h={13} />
        </Box>
        <Box sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Bone w={40} h={40} r="50%" />
              <Box sx={{ flex: 1 }}><Bone w="60%" h={12} sx={{ mb: 1 }} /><Bone w="40%" h={10} /></Box>
              <Bone w={80} h={32} r={8} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const ResetPassword = () => {
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(false);
  const [resetting, setResetting]         = useState({});
  const [errMessage, setError]            = useState('');
  const [successOpen, setSuccessOpen]     = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(10);
  const [searchTerm, setSearchTerm]       = useState('');
  const [activeSection, setSection]       = useState('all');
  const navigate = useNavigate();

  const properUsers     = useMemo(() => users.filter((u) => u.fullName?.trim()), [users]);
  const incompleteUsers = useMemo(() => users.filter((u) => !u.fullName?.trim()), [users]);

  const sourceUsers = useMemo(() => {
    if (activeSection === 'accounts')   return properUsers;
    if (activeSection === 'incomplete') return incompleteUsers;
    return users;
  }, [activeSection, users, properUsers, incompleteUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return sourceUsers;
    return sourceUsers.filter((u) =>
      (u.fullName || '').toLowerCase().includes(term) ||
      (u.email    || '').toLowerCase().includes(term) ||
      String(u.employeeNumber || '').includes(term),
    );
  }, [searchTerm, sourceUsers]);

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/search`, { method: 'GET', headers: getAuthHeaders().headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.error || 'Failed to fetch users'); setUsers([]); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setError('Something went wrong while fetching users.'); setUsers([]); }
    finally { setLoading(false); }
  };

  const handleReset = async (employeeNumber) => {
    setResetting((p) => ({ ...p, [employeeNumber]: true }));
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: 'POST',
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeNumber }),
      });
      const data = await res.json();
      if (res.ok) { setSuccessAction('reset'); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000); }
      else { setError(data.error || 'Failed to reset password'); }
    } catch { setError('Something went wrong while resetting password.'); }
    finally { setResetting((p) => ({ ...p, [employeeNumber]: false })); }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (!parts.length) return '?';
    return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getRoleStyle = (role = '') => {
    switch ((role || '').toLowerCase()) {
      case 'superadmin':    return { color: T.accent,    bg: T.accentFaint           };
      case 'administrator': return { color: T.accentMid, bg: 'rgba(139,69,69,0.08)' };
      case 'technical':     return { color: '#1565C0',   bg: '#E3F2FD'              };
      case 'staff':         return { color: '#2E7D32',   bg: '#E8F5E9'              };
      default:              return { color: T.muted,     bg: 'rgba(0,0,0,0.05)'     };
    }
  };

  const paged = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading && users.length === 0) return <Wireframe />;

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%', transform: 'translateX(-61%)',
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{shimmerKf}</style>
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        {/* ── Error banner ── */}
        {errMessage && (
          <Box sx={{
            mb: 2, px: 3, py: 1.5, borderRadius: 2,
            bgcolor: '#FFEBEE', border: '1px solid rgba(198,40,40,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
          }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#C62828', fontWeight: 600 }}>{errMessage}</Typography>
            <AccentButton onClick={() => setError('')} size="small" variant="outlined"
              sx={{ fontSize: '0.72rem', borderColor: 'rgba(198,40,40,0.3)', color: '#C62828', px: 1.5, py: 0.3, '&:hover': { bgcolor: 'rgba(198,40,40,0.06)', transform: 'none' } }}>
              Dismiss
            </AccentButton>
          </Box>
        )}

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
              <LockResetIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                  Password Management
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  Administrative Panel • Resets a user's password to their surname (ALL CAPS)
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              {[
                { label: `${users.length} total`,             color: T.accent  },
                { label: `${properUsers.length} complete`,    color: '#2E7D32' },
                { label: `${incompleteUsers.length} missing`, color: '#F57C00' },
              ].map(({ label, color }) => (
                <Box key={label} sx={{ px: 2, py: 0.6, borderRadius: 6, bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.22)}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{label}</Typography>
                </Box>
              ))}
              <Tooltip title="Refresh">
                <IconButton onClick={fetchUsers} disabled={loading}
                  sx={{ width: 34, height: 34, border: `1px solid ${T.accentBorder}`, borderRadius: 2, bgcolor: '#fff', '&:hover': { borderColor: T.accent, color: T.accent } }}>
                  {loading ? <CircularProgress size={14} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
              
            </Box>
          </Box>
        </SectionCard>

        {/* ── Table card ── */}
        <SectionCard sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>

          {/* Toolbar */}
          <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>

            {/* Title row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ViewListIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: T.text }}>
                  Account Records
                </Typography>
                {activeSection === 'incomplete' && incompleteUsers.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.3, bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.3)', borderRadius: 20 }}>
                    <WarningAmberRounded sx={{ fontSize: 11, color: '#F57C00' }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#F57C00' }}>
                      {incompleteUsers.length} missing names
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                {filteredUsers.length} of {sourceUsers.length} shown
              </Typography>
            </Box>

            {/* Filter tabs */}
            <Tabs
              value={activeSection}
              onChange={(_, v) => { setSection(v); setSearchTerm(''); setPage(0); }}
              sx={{
                mb: 1.5, minHeight: 32,
                '& .MuiTabs-indicator': { backgroundColor: T.accent, height: 2.5, borderRadius: '2px 2px 0 0' },
              }}
            >
              {[
                { key: 'all',        label: 'All',        count: users.length           },
                { key: 'accounts',   label: 'Complete',   count: properUsers.length     },
                { key: 'incomplete', label: 'Incomplete', count: incompleteUsers.length },
              ].map((t) => (
                <Tab
                  key={t.key}
                  value={t.key}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <span>{t.label}</span>
                      <Box sx={{
                        px: 0.9, py: 0.1, borderRadius: '20px', lineHeight: 1,
                        bgcolor: activeSection === t.key ? alpha(T.accent, 0.12) : 'rgba(0,0,0,0.06)',
                      }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: activeSection === t.key ? T.accent : T.faint }}>
                          {t.count}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{
                    minHeight: 32, py: 0.5, px: 1.5, fontSize: '0.75rem', fontWeight: 600,
                    textTransform: 'none', color: T.muted,
                    '&.Mui-selected': { color: T.accent, fontWeight: 700 },
                    '&:hover': { color: T.accent, bgcolor: T.accentFaint },
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </Tabs>

            {/* Search */}
            <FieldInput
              size="small" fullWidth
              placeholder="Search by name, email, or employee number…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 15, color: T.muted }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Incomplete notice */}
          {activeSection === 'incomplete' && incompleteUsers.length > 0 && (
            <Box sx={{ px: 3.5, py: 1.25, bgcolor: '#FFF8E1', borderBottom: 'l1px solid rgba(245,124,0,0.18)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberRounded sx={{ fontSize: 13, color: '#F57C00', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.72rem', color: '#7c4300', fontStyle: 'italic' }}>
                These accounts are missing a full name. They can still have their password reset, but should be updated in employee records.
              </Typography>
            </Box>
          )}

          {/* Table */}
          <Box sx={{
            flexGrow: 1, overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
          }}>
            {paged.length === 0 ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                  <LockResetIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                </Box>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                  {users.length === 0 ? 'No users found' : 'No records match your search'}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>
                  {searchTerm ? 'Try a different name, email, or employee number.' : 'No users available in this section.'}
                </Typography>
              </Box>
            ) : (
              <Table sx={{ minWidth: 680 }}>
                <TableHead sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <TableRow>
                    {['Emp. No', 'Full Name', 'Email', 'Role', 'Action'].map((h, i) => (
                      <TableCell key={h} sx={{
                        fontSize: '0.62rem', fontWeight: 700, color: T.accent,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        borderBottom: `2px solid ${T.accentBorder}`,
                        bgcolor: alpha(T.accent, 0.03),
                        py: 1.5, px: 2.5, whiteSpace: 'nowrap',
                        textAlign: i === 4 ? 'center' : 'left',
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((user, idx) => {
                    const isIncomplete = !user.fullName?.trim();
                    const roleStyle    = getRoleStyle(user.role);
                    const initials     = isIncomplete ? '?' : getInitials(user.fullName);
                    return (
                      <TableRow key={user.employeeNumber} sx={{
                        bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                        transition: 'background 0.12s ease',
                        '&:hover': { bgcolor: T.rowHover },
                        borderBottom: `1px solid ${T.divider}`,
                      }}>
                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, fontFamily: 'monospace' }}>
                            #{user.employeeNumber}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{
                              width: 36, height: 36, fontSize: '0.78rem', fontWeight: 700,
                              bgcolor: isIncomplete ? alpha('#F57C00', 0.15) : alpha(T.accent, 0.12),
                              color:   isIncomplete ? '#F57C00' : T.accent,
                              border: `2px solid ${isIncomplete ? alpha('#F57C00', 0.2) : T.accentBorder}`,
                            }}>
                              {initials}
                            </Avatar>
                            {isIncomplete ? (
                              <Box>
                                <Typography sx={{ fontSize: '0.8rem', fontStyle: 'italic', color: T.faint }}>No name on record</Typography>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.25, px: 1, py: 0.15, bgcolor: '#FFF3E0', border: '1px solid rgba(245,124,0,0.25)', borderRadius: 10 }}>
                                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 900, color: '#F57C00', letterSpacing: '0.06em' }}>MISSING</Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{user.fullName}</Typography>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Box sx={{ px: 1.25, py: 0.35, bgcolor: T.accentFaint, borderRadius: 1.5, border: `1px solid ${T.accentBorder}`, display: 'inline-block', maxWidth: 240 }}>
                            <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {user.email || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ px: 2.5, py: 1.75 }}>
                          <Chip
                            label={(user.role || 'N/A').toUpperCase()}
                            size="small"
                            sx={{
                              height: 20, fontSize: '0.62rem', fontWeight: 700,
                              bgcolor: roleStyle.bg, color: roleStyle.color,
                              border: `1px solid ${alpha(roleStyle.color, 0.25)}`,
                              borderRadius: '4px',
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ px: 2.5, py: 1.75, textAlign: 'center' }}>
                          <AccentButton
                            variant="contained"
                            size="small"
                            disabled={resetting[user.employeeNumber] || !user.email}
                            onClick={() => handleReset(user.employeeNumber)}
                            startIcon={
                              resetting[user.employeeNumber]
                                ? <CircularProgress size={11} sx={{ color: '#fff' }} />
                                : <LockResetIcon sx={{ fontSize: '13px !important' }} />
                            }
                            sx={{
                              fontSize: '0.72rem', px: 1.5, height: 28,
                              bgcolor: T.accent, color: '#fff',
                              boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
                              '&:hover': { bgcolor: T.accentDark },
                              '&:disabled': { bgcolor: '#ddd !important', color: '#999 !important', boxShadow: 'none !important', transform: 'none !important' },
                            }}
                          >
                            {resetting[user.employeeNumber] ? 'Resetting…' : 'Reset'}
                          </AccentButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}>
              <TablePagination
                component="div"
                count={filteredUsers.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', fontWeight: 600 } }}
              />
            </Box>
          )}
        </SectionCard>
      </Box>
    </Fade>
  );
};

export default ResetPassword;