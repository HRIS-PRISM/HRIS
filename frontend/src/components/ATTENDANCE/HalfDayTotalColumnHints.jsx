import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const RENDERED_KEYS = new Set(['_totalRendered', '_rendered']);
const TARDINESS_KEYS = new Set(['_totalTardiness', '_tardiness']);

export function halfDayTotalColumnVariant(colKey) {
  if (RENDERED_KEYS.has(colKey)) return 'rendered';
  if (TARDINESS_KEYS.has(colKey)) return 'tardiness';
  return null;
}

const HEADER_NOTES = {
  rendered: 'Half day approved → HR rendered hours (earnings shortfall)',
  tardiness: 'Half day approved → shortfall in Overall & row total, not in Late Total',
};

const CELL_NOTES = {
  rendered: {
    approved: 'HR rendered — used for earnings only',
    suggested: 'Pending review — 00:00 until approved',
    rejected: 'From punches / schedule',
  },
  tardiness: {
    approved: 'Half day shortfall · in Overall, not Late Total',
    suggested: 'Punch tardiness · in Late Total until confirmed',
    rejected: 'Included in Late Total',
  },
};

/** Sticky column header with half-day policy subtitle. */
export function HalfDayTotalColumnHeader({ label, colKey }) {
  const variant = halfDayTotalColumnVariant(colKey);
  if (!variant) return label;

  const note = HEADER_NOTES[variant];
  return (
    <Tooltip title={note} placement="top" arrow>
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.35,
          maxWidth: 120,
          mx: 'auto',
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
          <span>{label}</span>
          <InfoOutlinedIcon sx={{ fontSize: 11, opacity: 0.85 }} />
        </Box>
        <Typography
          component="span"
          sx={{
            fontSize: '0.5rem',
            fontWeight: 600,
            lineHeight: 1.25,
            color: 'rgba(255,255,255,0.88)',
            textTransform: 'none',
            letterSpacing: 0,
            whiteSpace: 'normal',
            textAlign: 'center',
          }}
        >
          {variant === 'rendered'
            ? 'Half day: HR rendered'
            : 'Half day: not in Late Total'}
        </Typography>
      </Box>
    </Tooltip>
  );
}

/** Per-row note under Total Rendered / Total Tardiness when half-day applies. */
export function HalfDayTotalCellNote({ halfUi, colKey, halfDayColor = '#6a1b9a' }) {
  const variant = halfDayTotalColumnVariant(colKey);
  if (!variant || !halfUi) return null;

  const text = CELL_NOTES[variant]?.[halfUi];
  if (!text) return null;

  const color =
    halfUi === 'approved'
      ? halfDayColor
      : halfUi === 'rejected'
        ? '#6d2323'
        : '#7a4a00';

  return (
    <Typography
      sx={{
        fontSize: '0.58rem',
        fontWeight: 700,
        color,
        fontStyle: 'italic',
        lineHeight: 1.2,
        maxWidth: 130,
        whiteSpace: 'normal',
        textAlign: 'center',
      }}
    >
      {text}
    </Typography>
  );
}

/** Value + optional half-day note (+ optional HR note on tardiness). */
export function HalfDayTotalCellContent({
  value,
  halfUi,
  colKey,
  hrNote = null,
  halfDayColor = '#6a1b9a',
}) {
  const variant = halfDayTotalColumnVariant(colKey);
  const policyNote = variant ? (
    <HalfDayTotalCellNote halfUi={halfUi} colKey={colKey} halfDayColor={halfDayColor} />
  ) : null;
  const showHrNote =
    hrNote &&
    String(hrNote).trim() &&
    variant === 'tardiness' &&
    halfUi !== 'approved';

  if (!policyNote && !showHrNote) return value;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.15,
      }}
    >
      <span>{value}</span>
      {policyNote}
      {showHrNote && (
        <Tooltip title={String(hrNote)} placement="top" arrow>
          <Typography
            sx={{
              fontSize: '0.58rem',
              fontWeight: 600,
              color: 'rgba(109,35,35,0.65)',
              fontStyle: 'italic',
              maxWidth: 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {`Note: ${String(hrNote)}`}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
}
