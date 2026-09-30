import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Dialog, DialogContent, DialogActions, IconButton, Tooltip,
  CircularProgress, Alert, alpha,
} from '@mui/material';
import {
  WarningAmber as WarningIcon, Close, DeleteOutline as DeleteIcon, CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import API_BASE_URL from '../../apiConfig';

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  warn: '#9a6700',
  warnBg: 'rgba(154,103,0,0.07)',
  warnBorder: 'rgba(154,103,0,0.28)',
  ok: '#2e7d32',
  danger: '#c62828',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  divider: 'rgba(0,0,0,0.08)',
};

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
});

/**
 * Warning for duplicate department assignments — an employee with more than one
 * assignment row, or with a variant employee number (e.g. "22415839-M" next to
 * "22415839"). Duplicates make other screens (e.g. Job Order payroll) pick the wrong
 * department or list the employee twice. Shows a banner when any exist and a review
 * dialog that marks the row in use and lets the extras be removed. Nothing is removed
 * without an explicit click.
 *
 * @param {*} refreshKey  change to reload (pass the loaded assignments)
 * @param {() => void} onChanged  called after a row is removed so the page reloads
 */
export default function DuplicateAssignmentsWarning({ refreshKey, onChanged }) {
  const [state, setState] = useState({ loading: false, duplicates: [], extraRows: 0, error: '' });
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(null); // row id or `all:<employee>`
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment-duplicates`, authHeaders());
      setState({
        loading: false,
        duplicates: Array.isArray(r.data?.duplicates) ? r.data.duplicates : [],
        extraRows: Number(r.data?.extraRows) || 0,
        error: '',
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e?.response?.data?.error || 'Could not check for duplicates.' }));
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const removeRows = async (rows, key) => {
    setRemoving(key);
    setActionError('');
    try {
      for (const row of rows) {
        await axios.delete(`${API_BASE_URL}/api/department-assignment/${row.id}`, authHeaders());
      }
      await load();
      onChanged?.();
    } catch (e) {
      setActionError(e?.response?.data?.error || e?.response?.data?.message || 'Could not remove the duplicate entry.');
    } finally {
      setRemoving(null);
    }
  };

  const { duplicates, extraRows } = state;
  if (!duplicates.length) return null;

  return (
    <>
      {/* Banner */}
      <Box
        sx={{
          mb: 2, px: 2, py: 1.25, borderRadius: '12px',
          border: `1px solid ${T.warnBorder}`, bgcolor: T.warnBg,
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        }}
      >
        <WarningIcon sx={{ fontSize: 22, color: T.warn }} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ fontSize: '0.84rem', fontWeight: 800, color: T.warn }}>
            {duplicates.length} employee{duplicates.length === 1 ? ' has' : 's have'} duplicate department assignments
            {' '}({extraRows} extra {extraRows === 1 ? 'entry' : 'entries'})
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: T.muted, lineHeight: 1.45 }}>
            An employee should have one assignment. Duplicates — including variant numbers like “22415839-M” —
            can show the wrong department or list the employee twice in payroll.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          onClick={() => setOpen(true)}
          sx={{
            textTransform: 'none', fontWeight: 700, fontSize: '0.76rem', borderRadius: '8px',
            bgcolor: T.warn, boxShadow: 'none', '&:hover': { bgcolor: '#7a5200', boxShadow: 'none' },
          }}
        >
          Review duplicates
        </Button>
      </Box>

      {/* Review dialog */}
      <Dialog open={open} onClose={() => !removing && setOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '14px', overflow: 'hidden' } }}>
        <Box sx={{ px: 2.5, py: 2, bgcolor: T.accent, color: '#FEF9E1', display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <WarningIcon sx={{ fontSize: 22 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', color: '#FEF9E1' }}>Duplicate department assignments</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: alpha('#FEF9E1', 0.8) }}>
              Keep the entry marked “In use”; remove the extras. Removing only deletes that assignment entry.
            </Typography>
          </Box>
          <IconButton onClick={() => !removing && setOpen(false)} size="small"
            sx={{ ml: 'auto', color: alpha('#FEF9E1', 0.9), bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.18) } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: 2.5, py: 2, bgcolor: '#faf8f8' }}>
          {actionError && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.78rem' }}>{actionError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {duplicates.map((d) => {
              const extras = d.rows.filter((r) => !r.keep);
              const allKey = `all:${d.employeeNumber}`;
              return (
                <Box key={d.employeeNumber} sx={{ border: `1px solid ${T.divider}`, borderRadius: '12px', bgcolor: '#fff', overflow: 'hidden' }}>
                  <Box sx={{ px: 1.75, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${T.divider}` }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontSize: '0.84rem', fontWeight: 800, color: T.text }}>{d.name || 'Unknown employee'}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                        #{d.employeeNumber} · {d.rows.length} entries
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      disabled={Boolean(removing) || extras.length === 0}
                      onClick={() => removeRows(extras, allKey)}
                      startIcon={removing === allKey ? <CircularProgress size={12} /> : <DeleteIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', color: T.danger, '&:hover': { bgcolor: 'rgba(198,40,40,0.06)' } }}
                    >
                      Remove {extras.length} extra{extras.length === 1 ? '' : 's'}
                    </Button>
                  </Box>
                  {d.rows.map((r) => (
                    <Box key={r.id} sx={{
                      px: 1.75, py: 0.75, display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) auto', gap: 1.5, alignItems: 'center',
                      borderBottom: `1px solid ${T.divider}`, '&:last-of-type': { borderBottom: 'none' },
                      bgcolor: r.keep ? 'rgba(46,125,50,0.04)' : 'transparent',
                    }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: r.registered ? T.text : T.danger, fontVariantNumeric: 'tabular-nums' }}>
                          {r.employeeNumber}
                        </Typography>
                        {!r.registered && (
                          <Typography sx={{ fontSize: '0.64rem', color: T.danger, fontWeight: 600 }}>Not a registered employee number</Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: '0.76rem', color: T.text }}>
                        <Box component="span" sx={{ color: T.faint, fontSize: '0.64rem', mr: 0.5 }}>DEPT</Box>{r.code || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.76rem', color: T.text }} noWrap>
                        <Box component="span" sx={{ color: T.faint, fontSize: '0.64rem', mr: 0.5 }}>BUDGET</Box>{r.budgetCode || '—'}
                      </Typography>
                      {r.keep ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.25, borderRadius: '10px', bgcolor: 'rgba(46,125,50,0.1)', color: T.ok, fontSize: '0.68rem', fontWeight: 800 }}>
                          <CheckCircleIcon sx={{ fontSize: 13 }} /> In use
                        </Box>
                      ) : (
                        <Tooltip title="Remove this duplicate entry">
                          <span>
                            <IconButton
                              size="small"
                              disabled={Boolean(removing)}
                              onClick={() => removeRows([r], r.id)}
                              sx={{ color: T.danger, '&:hover': { bgcolor: 'rgba(198,40,40,0.08)' } }}
                            >
                              {removing === r.id ? <CircularProgress size={14} /> : <DeleteIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}` }}>
          <Button onClick={() => setOpen(false)} disabled={Boolean(removing)}
            sx={{ textTransform: 'none', fontWeight: 700, color: T.accent }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
