import React from 'react';
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  TableCell,
  Tooltip,
  alpha,
} from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

export const HALF_DAY_RESOLVED_BORDER = '#546e7a';

/** Row highlight for half-day Review / Resolved column (attendance modules only). */
export function getHalfDayReviewRowChrome(halfUi, themeT) {
  if (halfUi === 'approved' || halfUi === 'suggested') {
    return {
      rowBg: themeT.halfDay?.bg,
      rowBorder: `3px solid ${themeT.halfDay?.border}`,
    };
  }
  if (halfUi === 'rejected') {
    return {
      rowBg: alpha(themeT.accent || '#6d2323', 0.06),
      rowBorder: `3px solid ${HALF_DAY_RESOLVED_BORDER}`,
    };
  }
  return { rowBg: undefined, rowBorder: '3px solid transparent' };
}

const ResolvedStatusChip = ({ label, color, bg, border }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      height: 22,
      maxWidth: '100%',
      fontSize: '0.58rem',
      fontWeight: 800,
      letterSpacing: '.03em',
      color,
      bgcolor: bg,
      border: `1px solid ${border}`,
      '& .MuiChip-label': { px: 0.6, lineHeight: 1.2 },
    }}
  />
);

/** Sticky header: half-day resolved column (left of Date). */
export function HalfDayApproveHeaderCell({ themeT }) {
  const T = themeT;
  return (
    <TableCell
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 3,
        bgcolor: T.accent,
        fontWeight: 700,
        fontSize: '0.65rem',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#fff',
        textAlign: 'center',
        px: 0.5,
        py: 1,
        minWidth: 64,
        width: 64,
        maxWidth: 64,
        borderBottom: `2px solid ${T.accentBorder}`,
        borderRight: `1px solid rgba(255,255,255,0.15)`,
        verticalAlign: 'bottom',
        lineHeight: 1.2,
      }}
    >
      Resolved
    </TableCell>
  );
}

/**
 * Body: pending → approve checkbox + deny; resolved → status chip only (no repeat actions).
 */
export function HalfDayApproveBodyCell({
  row,
  halfUi,
  isEven,
  themeT,
  rowBorder,
  onApproveClick,
  onRejectClick,
}) {
  const T = themeT;
  const baseBg = isEven ? '#fff' : T.rowOdd;
  const pending = halfUi === 'suggested';
  const showCell = pending || halfUi === 'approved' || halfUi === 'rejected';

  return (
    <TableCell
      sx={{
        bgcolor: baseBg,
        borderBottom: `1px solid ${T.divider}`,
        borderRight: `1px solid ${T.divider}`,
        borderLeft: rowBorder,
        px: 0.5,
        py: 0.5,
        verticalAlign: 'middle',
        textAlign: 'center',
        minWidth: 64,
        width: 64,
        maxWidth: 64,
        transition: 'background-color 0.12s',
        'tr:hover &': { bgcolor: `${T.rowHover} !important` },
      }}
    >
      {showCell ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.25,
            minHeight: 36,
          }}
        >
          {halfUi === 'approved' && (
            <Tooltip title="Half day approved — tardiness excluded; deduct in Earnings">
              <span>
                <ResolvedStatusChip
                  label="Approved"
                  color="#1b5e20"
                  bg="rgba(27,94,32,0.10)"
                  border="rgba(27,94,32,0.35)"
                />
              </span>
            </Tooltip>
          )}
          {halfUi === 'rejected' && (
            <Tooltip title="Not a half day — tardiness applied in attendance">
              <span>
                <ResolvedStatusChip
                  label="Denied"
                  color={T.accent || '#6d2323'}
                  bg={alpha(T.accent || '#6d2323', 0.08)}
                  border={T.accentBorder || 'rgba(109,35,35,0.22)'}
                />
              </span>
            </Tooltip>
          )}
          {pending && (
            <>
              <Tooltip title="Approve half day — enter rendered time">
                <span>
                  <Checkbox
                    size="small"
                    checked={false}
                    onChange={(e) => {
                      if (e.target.checked) onApproveClick(row);
                    }}
                    sx={{
                      p: 0.25,
                      color: T.halfDay?.color || '#6a1b9a',
                      '&.Mui-checked': { color: T.halfDay?.color || '#6a1b9a' },
                    }}
                  />
                </span>
              </Tooltip>
              <Tooltip title="Deny half day — enter tardiness for Late Total">
                <IconButton
                  size="small"
                  onClick={() => onRejectClick(row)}
                  sx={{
                    p: 0.2,
                    color: T.accent,
                    '&:hover': { bgcolor: T.accentFaint },
                  }}
                  aria-label="Deny half day"
                >
                  <CancelOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ) : null}
    </TableCell>
  );
}

/** Empty cell for totals rows under Approve column. */
export function HalfDayApproveTotalsCell({ isEven, themeT }) {
  const T = themeT;
  return (
    <TableCell
      sx={{
        bgcolor: '#fafafa',
        borderBottom: 'none',
        borderRight: `1px solid ${T.divider}`,
        minWidth: 64,
        width: 64,
        py: 1.25,
      }}
    />
  );
}
