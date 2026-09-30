import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  IconButton,
  InputAdornment,
  alpha,
  styled,
  CircularProgress,
  Select,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Assignment,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked,
  ArrowBack,
  ArrowForward,
  Search,
} from '@mui/icons-material';

/** Card shell shared by the attendance modules (matches their SectionCard). */
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const PanelHeader = ({ T, icon: Icon, title, rightContent }) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: T.accentFaint,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>
        {title}
      </Typography>
    </Box>
    {rightContent}
  </Box>
);

export const pad2 = (n) => String(n).padStart(2, '0');

/**
 * person_table row → "LAST, First M." — the same LAST, First format the DTR
 * employee cards and search field use, so names read consistently everywhere.
 * Returns '' when the row carries no name parts at all.
 */
export const rosterDisplayName = (p) => {
  if (!p || typeof p !== 'object') return '';
  // Some rows already carry a composed name — use it as-is.
  const prebuilt = String(p.fullName || p.name || '').trim();
  if (prebuilt) return prebuilt;
  const last = String(p.lastName || '').trim();
  const first = String(p.firstName || '').trim();
  const middle = String(p.middleName || '').trim();
  const ext = String(p.nameExtension || '').trim();
  const rest = [first, middle].filter(Boolean).join(' ');
  const core = last ? `${last.toUpperCase()}${rest ? `, ${rest}` : ''}` : rest;
  return [core, ext].filter(Boolean).join(' ').trim();
};

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Right-hand employee roster sidebar, shared by the attendance computation
 * modules (Non-Teaching and Faculty Designated) so both feel identical.
 *
 * Unlike the Official Time "Setup by month" card, "done" here means the employee
 * already has an attendance summary saved for the month
 * (overall_attendance_record), not merely an official-time schedule. Employees
 * with no official time for the month are flagged, because the module cannot
 * compute anything for them.
 */
const AttendanceRosterSidebar = ({
  themeT,
  year,
  month,
  onShiftMonth,
  rows,
  loading,
  error,
  filter,
  onFilter,
  query,
  onQuery,
  department,
  onDepartment,
  departments,
  onSelectEmployee,
  selectedEmployeeNumber,
  doneCount = 0,
  totalCount = 0,
}) => {
  // Callers pass different-sized theme objects: the computation modules carry the
  // full status palette (tardiness / rendered / absent / halfDay / …), while
  // Attendance Summary only defines the flat tokens. Normalize here so a partial
  // theme degrades to the accent color instead of throwing on `T.tardiness.color`.
  const T = themeT || {};
  const warnColor = T.tardiness?.color || T.accent || '#b71c1c';

  const PAGE_SIZE = 12;
  const listRef = useRef(null);
  const [page, setPage] = useState(0);
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const monthLabel = `${MONTH_NAMES_FULL[month - 1] || ''} ${year}`;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = rows.length === 0 ? 0 : safePage * PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query, filter, department, year, month]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [safePage, query, filter, department]);

  return (
    <SectionCard
      sx={{
        // Capped to the viewport so the roster scrolls inside its own card and
        // keeps pace with the sticky sidebar column.
        height: 'calc(100vh - 190px)',
        minHeight: 420,
        maxHeight: 'calc(100vh - 190px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <PanelHeader
        T={T}
        icon={Assignment}
        title="Employees this month"
        rightContent={
          <Box
            component="span"
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              bgcolor:
                doneCount === totalCount && totalCount > 0
                  ? alpha('#2e7d32', 0.12)
                  : alpha(T.accent, 0.1),
              color:
                doneCount === totalCount && totalCount > 0 ? '#2e7d32' : T.accent,
              border: `0.5px solid ${
                doneCount === totalCount && totalCount > 0
                  ? 'rgba(46,125,50,0.28)'
                  : T.accentBorder
              }`,
              borderRadius: '9px',
              px: 0.9,
              py: 0.2,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '…' : `${doneCount}/${totalCount}`}
          </Box>
        }
      />
      <Box
        sx={{
          px: 1.75,
          pt: 1.5,
          pb: 1.25,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.15,
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onShiftMonth(-1)}
            aria-label="Previous month"
            sx={{
              width: 28,
              height: 28,
              color: T.accent,
              border: `1px solid ${T.accentBorder}`,
              borderRadius: 1.25,
              '&:hover': { bgcolor: T.accentFaint },
            }}
          >
            <ArrowBack sx={{ fontSize: 14 }} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: T.accent,
                letterSpacing: '0.01em',
                lineHeight: 1.2,
              }}
            >
              {monthLabel}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.62rem',
                color: T.faint,
                fontWeight: 600,
                lineHeight: 1.2,
                mt: 0.15,
              }}
            >
              Check means summary already saved
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => onShiftMonth(1)}
            aria-label="Next month"
            sx={{
              width: 28,
              height: 28,
              color: T.accent,
              border: `1px solid ${T.accentBorder}`,
              borderRadius: 1.25,
              '&:hover': { bgcolor: T.accentFaint },
            }}
          >
            <ArrowForward sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: T.muted }}>
              {totalCount === 0
                ? 'No employees loaded'
                : `${doneCount} of ${totalCount} already saved`}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: pct === 100 && totalCount > 0 ? '#2e7d32' : T.accent,
              }}
            >
              {pct}%
            </Typography>
          </Box>
          <Box
            sx={{
              height: 6,
              borderRadius: 99,
              bgcolor: 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${pct}%`,
                height: '100%',
                bgcolor: pct === 100 && totalCount > 0 ? '#2e7d32' : T.accent,
                transition: 'width 0.25s ease',
              }}
            />
          </Box>
        </Box>

        <TextField
          size="small"
          placeholder="Search name or number"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: T.faint }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: '0.78rem',
              bgcolor: '#fff',
              '&:hover fieldset': { borderColor: T.accent },
              '&.Mui-focused fieldset': { borderColor: T.accent },
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 0.6 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'done', label: 'Saved' },
            { key: 'missing', label: 'Not yet' },
          ].map(({ key, label }) => {
            const active = filter === key;
            return (
              <Button
                key={key}
                size="small"
                onClick={() => onFilter(key)}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  px: 0.5,
                  py: 0.35,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '7px',
                  color: active ? '#fff' : T.accent,
                  bgcolor: active ? T.accent : 'transparent',
                  border: `1px solid ${active ? T.accent : T.accentBorder}`,
                  '&:hover': { bgcolor: active ? T.accentDark : T.accentFaint },
                }}
              >
                {label}
              </Button>
            );
          })}
        </Box>

        {departments.length > 0 && (
          <Select
            size="small"
            displayEmpty
            value={department}
            onChange={(e) => onDepartment(e.target.value)}
            sx={{
              fontSize: '0.75rem',
              borderRadius: '8px',
              bgcolor: '#fff',
              '& .MuiSelect-select': { py: 0.7 },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.accent },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.78rem' }}>
              All departments
            </MenuItem>
            {departments.map((d) => (
              <MenuItem key={d} value={d} sx={{ fontSize: '0.78rem' }}>
                {d}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { background: '#d0b8b8', borderRadius: '4px' },
        }}
      >

        {loading ? (
          <Box sx={{ py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <CircularProgress size={18} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: '0.78rem', color: T.muted }}>
              Loading employees…
            </Typography>
          </Box>
        ) : error ? (
          <Typography sx={{ px: 2, py: 3, fontSize: '0.78rem', color: '#c62828' }}>
            {error}
          </Typography>
        ) : rows.length === 0 ? (
          <Typography
            sx={{ px: 2, py: 3, fontSize: '0.78rem', color: T.faint, fontStyle: 'italic' }}
          >
            No employees match this month view.
          </Typography>
        ) : (
          pageRows.map((row) => {
            const selected =
              String(selectedEmployeeNumber || '') === String(row.employeeNumber || '');
            // Title is the name; the number already sits on the sub-line below,
            // so it is never repeated here.
            const name = row.fullName || `#${row.employeeNumber}`;
            return (
              <Box
                key={row.employeeNumber}
                onClick={() => onSelectEmployee(row)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectEmployee(row);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${T.divider}`,
                  bgcolor: selected ? alpha(T.accent, 0.07) : 'transparent',
                  borderLeft: selected ? `3px solid ${T.accent}` : '3px solid transparent',
                  '&:hover': { bgcolor: T.accentFaint },
                }}
              >
                <Tooltip
                  title={
                    row.saved
                      ? 'Summary already saved for this month'
                      : 'Not saved for this month'
                  }
                >
                  <Box sx={{ mt: 0.15, flexShrink: 0, display: 'flex' }}>
                    {row.saved ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ fontSize: 18, color: '#c4a0a0' }} />
                    )}
                  </Box>
                </Tooltip>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Tooltip title={name} placement="top" arrow>
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: T.text,
                        lineHeight: 1.25,
                      }}
                      noWrap
                    >
                      {name}
                    </Typography>
                  </Tooltip>
                  <Tooltip
                    title={`#${row.employeeNumber}${
                      row.department ? ` · ${row.department}` : ''
                    }`}
                    placement="top"
                    arrow
                  >
                    <Typography
                      sx={{ fontSize: '0.68rem', color: T.muted, mt: 0.15 }}
                      noWrap
                    >
                      #{row.employeeNumber}
                      {row.department ? ` · ${row.department}` : ''}
                    </Typography>
                  </Tooltip>
                  <Typography
                    sx={{
                      fontSize: '0.66rem',
                      color: row.saved ? '#2e7d32' : T.faint,
                      fontWeight: row.saved ? 700 : 500,
                      mt: 0.2,
                    }}
                    noWrap
                  >
                    {row.saved
                      ? 'Summary saved for this month'
                      : 'Not computed for this month'}
                  </Typography>
                  {!row.hasOfficialTime && (
                    <Typography
                      sx={{
                        fontSize: '0.64rem',
                        color: warnColor,
                        fontWeight: 700,
                        mt: 0.2,
                      }}
                      noWrap
                    >
                      No official time — cannot compute
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>


      {!loading && !error && rows.length > 0 && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${T.divider}`,
            px: 1,
            py: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.5,
            bgcolor: '#fafafa',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: T.muted,
              whiteSpace: 'nowrap',
            }}
          >
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, rows.length)} of{' '}
            {rows.length}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <IconButton
              size="small"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
              sx={{
                width: 26,
                height: 26,
                color: T.accent,
                '&.Mui-disabled': { color: T.faint },
              }}
            >
              <ArrowBack sx={{ fontSize: 14 }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: T.accent,
                minWidth: 42,
                textAlign: 'center',
              }}
            >
              {safePage + 1}/{pageCount}
            </Typography>
            <IconButton
              size="small"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
              sx={{
                width: 26,
                height: 26,
                color: T.accent,
                '&.Mui-disabled': { color: T.faint },
              }}
            >
              <ArrowForward sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>
      )}
    </SectionCard>
  );
};

export default AttendanceRosterSidebar;

