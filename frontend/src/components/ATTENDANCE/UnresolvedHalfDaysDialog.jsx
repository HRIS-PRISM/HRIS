import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  CalendarToday,
} from '@mui/icons-material';
import { FILTER_T as DEFAULT_T } from './attendanceFilterLayout';

export const parseUnresolvedHalfDayDateParts = (iso) => {
  const raw = String(iso ?? '').slice(0, 10);
  if (!raw) return { iso: raw, longLabel: raw };
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return { iso: raw, longLabel: raw };
  const longLabel = parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
  return { iso: raw, longLabel };
};

const UnresolvedHalfDaysDialog = ({ dates, onClose, themeT = DEFAULT_T }) => {
  const T = themeT;
  const open = Array.isArray(dates) && dates.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: `0 24px 48px ${alpha(T.accent, 0.2)}`,
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: T.accent,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '10px',
            bgcolor: alpha('#fff', 0.14),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WarningIcon sx={{ fontSize: 22, color: '#FEF9E1' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
          <Typography sx={{ color: '#FEF9E1', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>
            Unresolved Half Days
          </Typography>
          <Typography sx={{ color: alpha('#FEF9E1', 0.82), fontSize: '0.74rem', mt: 0.35 }}>
            Review required before saving to summary.
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: alpha('#FEF9E1', 0.9),
            bgcolor: alpha('#fff', 0.1),
            '&:hover': { bgcolor: alpha('#fff', 0.18) },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 1.5, lineHeight: 1.6 }}>
          The following dates are flagged as half days but have not been reviewed yet:
        </Typography>

        <Box
          sx={{
            mx: -2.5,
            mb: 1.5,
            borderLeft: `1px solid ${T.accentBorder}`,
            borderRight: `1px solid ${T.accentBorder}`,
            borderTop: `1px solid ${T.accentBorder}`,
            borderBottom: `1px solid ${T.accentBorder}`,
          }}
        >
          {(dates || []).map((d, index) => {
            const { iso, longLabel } = parseUnresolvedHalfDayDateParts(d);
            return (
              <Box
                key={d}
                sx={{
                  bgcolor: T.accentFaint,
                  ...(index > 0 ? { borderTop: `1px solid ${T.accentBorder}` } : {}),
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 2.5,
                    py: 0.85,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 13, color: T.accentMid, flexShrink: 0 }} />
                  <Typography
                    component="div"
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: T.text,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Box component="span" sx={{ fontWeight: 700 }}>{iso}</Box>
                    <Box component="span" sx={{ color: T.faint, mx: 0.75 }}>|</Box>
                    <Box component="span" sx={{ color: T.muted }}>{longLabel}</Box>
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            px: 1.25,
            py: 1,
            borderRadius: '8px',
            bgcolor: '#fafafa',
            borderLeft: `3px solid ${alpha(T.accent, 0.45)}`,
            border: `1px solid ${T.divider}`,
            mb: 2,
          }}
        >
          <InfoIcon sx={{ fontSize: 13, color: T.accentMid, mt: 0.2, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.75rem', color: T.muted, lineHeight: 1.55 }}>
            Approve or deny each half day (enter rendered time or tardiness) before saving to summary or proceeding to the next step.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: T.accentFaint,
          borderTop: `1px solid ${T.divider}`,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: T.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 24px',
            fontWeight: 700,
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentDark; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
        >
          OK
        </button>
      </Box>
    </Dialog>
  );
};

export default UnresolvedHalfDaysDialog;
