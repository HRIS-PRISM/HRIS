import React from 'react';
import { Box, Typography, Tooltip, alpha } from '@mui/material';
import { Place } from '@mui/icons-material';
import { branchLabel, normalizeBranchCode } from '../../constants/branches';

/** Colours per campus (users.branch codes: 0 = Manila, 1 = Cavite). */
const BRANCH_COLORS = { 0: '#6d2323', 1: '#1565c0' };

/** "Manila" / "Cavite" / "Unknown" for a punch's Branch code. */
export const punchBranchLabel = (branch) => {
  const code = normalizeBranchCode(branch);
  return code === null ? 'Unknown' : branchLabel(code);
};

/** "Manila · Back Gate" — for reports and plain-text places. */
export const punchSourceText = (record) => {
  const device = String(record?.DeviceName || '').trim();
  const branch = punchBranchLabel(record?.Branch);
  return device ? `${branch} · ${device}` : branch;
};

/**
 * Where a punch was recorded: the campus (branch) pill — same shape as the
 * Status pill beside it — with the biometric device name next to it, so an
 * employee can tell a punch is really theirs.
 */
const AttendanceBranchSource = ({ record }) => {
  const code = normalizeBranchCode(record?.Branch);
  const device = String(record?.DeviceName || '').trim();
  const color = code === null ? '#9e9e9e' : BRANCH_COLORS[code] || '#6d2323';
  const tip = device
    ? `Recorded on "${device}" — ${punchBranchLabel(code)} campus`
    : 'No device information for this punch';

  return (
    <Tooltip title={tip} placement="top">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.25,
            py: 0.4,
            borderRadius: '12px',
            bgcolor: alpha(color, 0.08),
            border: `1px solid ${alpha(color, 0.25)}`,
            flexShrink: 0,
          }}
        >
          <Place sx={{ fontSize: 13, color }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color, lineHeight: 1.2 }}>
            {punchBranchLabel(code)}
          </Typography>
        </Box>
        {device && (
          <Typography noWrap sx={{ fontSize: '0.72rem', fontWeight: 500, color: '#6b6b6b', minWidth: 0 }}>
            {device}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default AttendanceBranchSource;
