import React from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  TableCell,
  Tooltip,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
        minWidth: 52,
        width: 52,
        maxWidth: 52,
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
 * Body: checkbox to confirm half day (opens dialog). Checked when resolved (confirmed or not half day).
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
  const resolved = halfUi === 'approved' || halfUi === 'rejected';
  const pending = halfUi === 'suggested';
  const showCell = pending || resolved;

  const checkboxColor =
    halfUi === 'rejected'
      ? '#546e7a'
      : T.halfDay?.color || '#6a1b9a';

  const checkboxTitle =
    halfUi === 'approved'
      ? 'Half day confirmed for this period'
      : halfUi === 'rejected'
        ? 'Not a half day — resolved'
        : 'Confirm as half day — enter rendered time to count';

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
        minWidth: 52,
        width: 52,
        maxWidth: 52,
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
            gap: 0.25,
          }}
        >
          <Tooltip title={checkboxTitle}>
            <span>
              <Checkbox
                size="small"
                checked={resolved}
                disabled={resolved}
                onChange={(e) => {
                  if (pending && e.target.checked) {
                    onApproveClick(row);
                  }
                }}
                sx={{
                  p: 0.25,
                  color: checkboxColor,
                  '&.Mui-checked': { color: checkboxColor },
                  '&.Mui-disabled': { color: checkboxColor, opacity: 0.85 },
                }}
              />
            </span>
          </Tooltip>
          {pending && (
            <Tooltip title="Not a half day — count as tardiness only">
              <IconButton
                size="small"
                onClick={() => onRejectClick(row)}
                sx={{
                  p: 0.2,
                  color: T.accent,
                  '&:hover': { bgcolor: T.accentFaint },
                }}
                aria-label="Not a half day"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
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
        minWidth: 52,
        width: 52,
        py: 1.25,
      }}
    />
  );
}
