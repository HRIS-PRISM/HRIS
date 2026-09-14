import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  CircularProgress,
  Collapse,
  Typography,
} from '@mui/material';
import { Assignment, ExpandLess, ExpandMore } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import API_BASE_URL from '../../apiConfig';

const T = {
  accent: '#6d2323',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentFaint: 'rgba(109,35,35,0.06)',
  faint: '#a0a0a0',
  muted: '#6b6b6b',
  divider: 'rgba(0,0,0,0.08)',
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

const fmt = (v) => {
  const s = String(v ?? '').trim();
  if (!s || s === '00:00:00') return '—';
  return s;
};

const hasSavedSummaryTotals = (row) => {
  if (!row || typeof row !== 'object') return false;
  const keys = [
    'overallRenderedOfficialTime',
    'overallRenderedOfficialTimeTardiness',
    'totalRenderedTimeMorning',
    'totalRenderedTimeAfternoon',
    'lateTotalTime',
  ];
  return keys.some((k) => {
    const v = row[k];
    return v != null && String(v).trim() !== '' && String(v).trim() !== '00:00:00';
  });
};

/**
 * Read-only attendance summary for DTR hub.
 * Shown only after Save to Summary from a computation module.
 */
const DtrSavedSummaryPanel = ({
  personID,
  startDate,
  endDate,
}) => {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState(null);

  const loadSummary = useCallback(async () => {
    if (!personID || !startDate || !endDate) {
      setRow(null);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: { personID, startDate, endDate },
          ...getAuthHeaders(),
        },
      );
      const list = Array.isArray(res.data) ? res.data : [];
      setRow(list[0] || null);
    } catch {
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [personID, startDate, endDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const handler = () => loadSummary();
    window.addEventListener('dtrComputedDailyLateUpdated', handler);
    return () => window.removeEventListener('dtrComputedDailyLateUpdated', handler);
  }, [loadSummary]);

  if (!personID || !startDate || !endDate) return null;
  if (loading && !hasSavedSummaryTotals(row)) return null;
  if (!hasSavedSummaryTotals(row) || !row) return null;

  return (
    <Box
      className="no-print"
      sx={{
        px: 2,
        pt: 1.5,
        pb: 0.5,
        flexShrink: 0,
        borderTop: `1px solid ${T.divider}`,
      }}
    >
      <Box
        sx={{
          mb: 1.5,
          borderRadius: '10px',
          border: `1px solid ${T.accentBorder}`,
          bgcolor: '#fff',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            bgcolor: T.accentFaint,
            borderBottom: open ? `1px solid ${T.accentBorder}` : 'none',
            cursor: 'pointer',
          }}
          onClick={() => setOpen((v) => !v)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Assignment sx={{ fontSize: 18, color: T.accent }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: T.accent }}>
                Attendance Summary
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontWeight: 600 }}>
                Saved from computation module — ready for payroll / earnings
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            {loading && <CircularProgress size={16} sx={{ color: T.accent }} />}
            {open ? (
              <ExpandLess sx={{ fontSize: 20, color: T.accent }} />
            ) : (
              <ExpandMore sx={{ fontSize: 20, color: T.accent }} />
            )}
          </Box>
        </Box>
        <Collapse in={open}>
          <Box sx={{ px: 1.75, py: 1.25 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr 1fr',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1,
              }}
            >
              {[
                {
                  label: 'Overall rendered',
                  value: fmt(row.overallRenderedOfficialTime),
                },
                {
                  label: 'Overall tardiness',
                  value: fmt(row.overallRenderedOfficialTimeTardiness),
                },
                {
                  label: 'Late total',
                  value: fmt(row.lateTotalTime || row._lateTotal),
                },
                {
                  label: 'Absent / half-day',
                  value: `${row.absentDays ?? row._absentTotalDays ?? 0} / ${row.halfDays ?? row._halfTotalDays ?? 0}`,
                },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    border: `1px solid ${alpha(T.accent, 0.1)}`,
                    bgcolor: alpha(T.accent, 0.03),
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: T.faint,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      mb: 0.35,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: T.accent,
                      fontFamily: 'monospace',
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default DtrSavedSummaryPanel;
