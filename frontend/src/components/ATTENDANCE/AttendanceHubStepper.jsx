import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CheckCircle } from '@mui/icons-material';
import { HUB_WORKFLOW_STEPS } from '../../utils/attendanceHubFlow';

const T = {
  accent: '#6d2323',
  accentBorder: 'rgba(109,35,35,0.14)',
  faint: '#a0a0a0',
  muted: '#6b6b6b',
};

const AttendanceHubStepper = ({ currentStepId = 'dtr', compact = false }) => {
  const currentIdx = HUB_WORKFLOW_STEPS.findIndex((s) => s.id === currentStepId);
  const activeIdx = currentIdx >= 0 ? currentIdx : 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 0.5 : 0.75,
        flexWrap: 'wrap',
        rowGap: 0.5,
      }}
    >
      {HUB_WORKFLOW_STEPS.map((step, idx) => {
        const done = idx < activeIdx;
        const active = idx === activeIdx;
        return (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <Box
                sx={{
                  width: compact ? 14 : 22,
                  height: 2,
                  borderRadius: 1,
                  bgcolor: done ? alpha(T.accent, 0.45) : alpha(T.accent, 0.12),
                  flexShrink: 0,
                }}
              />
            )}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                px: compact ? 0.85 : 1.1,
                py: compact ? 0.35 : 0.45,
                borderRadius: '999px',
                border: `1px solid ${
                  active ? T.accent : done ? alpha(T.accent, 0.35) : T.accentBorder
                }`,
                bgcolor: active
                  ? alpha(T.accent, 0.1)
                  : done
                    ? alpha(T.accent, 0.05)
                    : '#fff',
              }}
            >
              <Box
                sx={{
                  width: compact ? 18 : 20,
                  height: compact ? 18 : 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: compact ? '0.62rem' : '0.68rem',
                  fontWeight: 800,
                  color: active || done ? T.accent : T.faint,
                  bgcolor: active
                    ? alpha(T.accent, 0.14)
                    : done
                      ? alpha(T.accent, 0.08)
                      : alpha(T.faint, 0.08),
                }}
              >
                {done ? (
                  <CheckCircle sx={{ fontSize: compact ? 13 : 14, color: T.accent }} />
                ) : (
                  idx + 1
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: compact ? '0.64rem' : '0.72rem',
                  fontWeight: active ? 800 : 600,
                  color: active ? T.accent : done ? T.muted : T.faint,
                  whiteSpace: 'nowrap',
                }}
              >
                {compact ? step.shortLabel : step.label}
              </Typography>
            </Box>
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default AttendanceHubStepper;
