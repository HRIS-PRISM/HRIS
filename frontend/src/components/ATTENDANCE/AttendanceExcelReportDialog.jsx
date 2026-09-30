import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Tooltip,
  CircularProgress,
  alpha,
  styled,
} from '@mui/material';
import { Close, Download as DownloadIcon } from '@mui/icons-material';

/**
 * "Download Excel Report" dialog — the same date-range + calendar picker as
 * Attendance State's report dialog. The caller passes every punch of the loaded
 * period (each with `_isoDate` YYYY-MM-DD and `_sortTs`) and gets back the
 * punches on the chosen dates, sorted, in `onDownload`.
 */

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover: 'rgba(109,35,35,0.10)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  divider: 'rgba(0,0,0,0.08)',
};

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

const dialogPaperSx = {
  borderRadius: '14px',
  overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(40,10,10,0.25)',
};

export const formatReportDate = (value) => {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return String(value);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const enumerateDates = (from, to) => {
  if (!from || !to || from > to) return [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const dates = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const monthsInRange = (startISO, endISO) => {
  if (!startISO || !endISO) return [];
  const [sy, sm] = startISO.split('-').map(Number);
  const [ey, em] = endISO.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const months = [];
  let year = sy;
  let month = sm - 1;
  let guard = 0; // a bad range can't spin forever
  while ((year < ey || (year === ey && month <= em - 1)) && guard < 60) {
    months.push({ year, month });
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    guard += 1;
  }
  return months;
};

const monthGrid = (year, month) => {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

const AttendanceExcelReportDialog = ({
  open,
  onClose,
  periodStart,
  periodEnd,
  records = [],
  loading = false,
  sortOrder = 'desc',
  onDownload,
}) => {
  const [fromDate, setFromDate] = useState(periodStart);
  const [toDate, setToDate] = useState(periodEnd);
  const [selected, setSelected] = useState([]);

  // Every time the dialog opens, start from the loaded period with nothing picked
  useEffect(() => {
    if (!open) return;
    setFromDate(periodStart);
    setToDate(periodEnd);
    setSelected([]);
  }, [open, periodStart, periodEnd]);

  const clamp = (v) => (!v ? '' : v < periodStart ? periodStart : v > periodEnd ? periodEnd : v);

  const handleFromChange = (e) => {
    const value = clamp(e.target.value);
    const nextTo = value && toDate && value > toDate ? value : toDate;
    setFromDate(value);
    setToDate(nextTo);
    setSelected((prev) => (value && nextTo ? prev.filter((d) => d >= value && d <= nextTo) : []));
  };

  const handleToChange = (e) => {
    const value = clamp(e.target.value);
    const nextFrom = value && fromDate && value < fromDate ? value : fromDate;
    setToDate(value);
    setFromDate(nextFrom);
    setSelected((prev) => (value && nextFrom ? prev.filter((d) => d >= nextFrom && d <= value) : []));
  };

  const rangeError = !fromDate || !toDate
    ? 'Choose a start and end date for the report.'
    : fromDate > toDate
      ? 'Report start date must be on or before the end date.'
      : '';
  const validationError = rangeError || (selected.length === 0 ? 'Select at least one date to include.' : '');

  const availableDates = useMemo(() => enumerateDates(fromDate, toDate), [fromDate, toDate]);
  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const countsByDate = useMemo(
    () => records.reduce((acc, r) => {
      if (r?._isoDate) acc[r._isoDate] = (acc[r._isoDate] || 0) + 1;
      return acc;
    }, {}),
    [records],
  );
  const allSelected = availableDates.length > 0 && selected.length === availableDates.length;

  const chosenRecords = useMemo(() => {
    if (validationError) return [];
    return records
      .filter((r) => selectedSet.has(r._isoDate))
      .sort((a, b) => {
        const diff = (a._sortTs ?? 0) - (b._sortTs ?? 0);
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [records, selectedSet, validationError, sortOrder]);

  const toggleDate = (date) => setSelected((prev) => (
    prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort()
  ));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, bgcolor: T.accent, display: 'flex', alignItems: 'center', gap: 1.25, color: '#FEF9E1' }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '9px', bgcolor: alpha('#fff', 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DownloadIcon sx={{ fontSize: 21 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: '#FEF9E1', fontWeight: 800, fontSize: '0.98rem' }}>Download Excel Report</Typography>
          <Typography sx={{ color: alpha('#FEF9E1', 0.8), fontSize: '0.72rem', mt: 0.25 }}>
            Choose the attendance dates to include in the Excel file.
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ ml: 'auto', color: alpha('#FEF9E1', 0.9), bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.18) } }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        <Box sx={{ p: 1.5, borderRadius: '10px', border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint, mb: 2 }}>
          <Typography sx={{ fontSize: '0.64rem', fontWeight: 800, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Loaded attendance period
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: T.muted, mt: 0.4 }}>
            {formatReportDate(periodStart)} to {formatReportDate(periodEnd)}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={22} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: '0.76rem', color: T.muted }}>Loading every punch in this period…</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 1 }}>
              <FieldInput
                label="From" type="date" size="small" value={fromDate} onChange={handleFromChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: periodStart || undefined, max: periodEnd || undefined, 'aria-label': 'Report range start date' }}
              />
              <Typography sx={{ fontSize: '0.75rem', color: T.muted, pt: 1.5 }}>to</Typography>
              <FieldInput
                label="To" type="date" size="small" value={toDate} onChange={handleToChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: periodStart || undefined, max: periodEnd || undefined, 'aria-label': 'Report range end date' }}
              />
            </Box>

            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.64rem', fontWeight: 800, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Select dates
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    onClick={allSelected ? () => setSelected([]) : () => setSelected(availableDates)}
                    disabled={availableDates.length === 0}
                    variant={allSelected ? 'contained' : 'outlined'}
                    size="small"
                    sx={{
                      textTransform: 'none', fontWeight: 700, fontSize: '0.68rem', py: 0.25, px: 1, borderRadius: '6px', minWidth: 0,
                      ...(allSelected
                        ? { color: '#fff', bgcolor: T.accent, boxShadow: 'none', '&:hover': { bgcolor: T.accentDark } }
                        : { color: T.accent, borderColor: alpha(T.accent, 0.4), '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }),
                    }}
                  >
                    {allSelected ? 'Selected All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={() => setSelected([])}
                    disabled={selected.length === 0}
                    variant="outlined"
                    size="small"
                    sx={{
                      color: T.muted, borderColor: alpha(T.muted, 0.35), textTransform: 'none', fontWeight: 700,
                      fontSize: '0.68rem', py: 0.25, px: 1, minWidth: 0, borderRadius: '6px',
                      '&:hover': { bgcolor: alpha(T.muted, 0.08), borderColor: T.muted },
                    }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '0.68rem', color: T.muted, mb: 1 }}>
                Click on the calendar to pick the dates you want.{selected.length === 0 ? ' Nothing is selected yet.' : ''}
              </Typography>

              <Box
                sx={{
                  maxHeight: 320, overflowY: 'auto', border: `1px solid ${T.accentBorder}`, borderRadius: '10px',
                  bgcolor: '#fafafa', p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.5,
                }}
              >
                {months.map(({ year, month }) => (
                  <Box key={`${year}-${month}`}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: T.accent, textAlign: 'center', mb: 0.6 }}>
                      {monthLabel(year, month)}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.4, mb: 0.4 }}>
                      {WEEKDAYS.map((wd) => (
                        <Typography key={wd} sx={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: T.faint, textTransform: 'uppercase' }}>
                          {wd}
                        </Typography>
                      ))}
                    </Box>
                    {monthGrid(year, month).map((week, wIdx) => (
                      <Box key={wIdx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.4, mb: 0.4 }}>
                        {week.map((date, dIdx) => {
                          if (!date) return <Box key={dIdx} />;
                          const selectable = date >= fromDate && date <= toDate;
                          const isSel = selectedSet.has(date);
                          const count = countsByDate[date] || 0;
                          return (
                            <Tooltip
                              key={date}
                              title={!selectable ? 'Outside the loaded period' : `${formatReportDate(date)} · ${count} punch${count === 1 ? '' : 'es'}`}
                            >
                              <Box
                                component="button"
                                type="button"
                                disabled={!selectable}
                                onClick={() => selectable && toggleDate(date)}
                                aria-pressed={isSel}
                                aria-label={`${isSel ? 'Deselect' : 'Select'} ${formatReportDate(date)}`}
                                sx={{
                                  width: '100%', aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', justifyContent: 'center', borderRadius: '8px',
                                  border: isSel ? `1.5px solid ${T.accent}` : '1px solid transparent',
                                  bgcolor: !selectable ? 'transparent' : isSel ? T.accent : '#fff',
                                  cursor: selectable ? 'pointer' : 'default', fontFamily: 'inherit',
                                  opacity: !selectable ? 0.3 : 1, transition: 'all 0.12s',
                                  '&:hover': selectable ? { borderColor: T.accent, bgcolor: isSel ? T.accentDark : T.accentFaint } : {},
                                }}
                              >
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: !selectable ? T.faint : isSel ? '#fff' : T.text }}>
                                  {Number(date.split('-')[2])}
                                </Typography>
                                {selectable && (
                                  <Box
                                    sx={{
                                      width: 4, height: 4, borderRadius: '50%', mt: 0.15,
                                      bgcolor: isSel ? 'rgba(255,255,255,0.85)' : count === 0 ? 'transparent' : T.accent,
                                    }}
                                  />
                                )}
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Typography sx={{ fontSize: '0.72rem', color: rangeError ? 'error.main' : T.muted, fontWeight: 600 }}>
                {validationError || `${selected.length} date${selected.length === 1 ? '' : 's'} selected · ${chosenRecords.length} matching punch${chosenRecords.length === 1 ? '' : 'es'}`}
              </Typography>
              <Button
                onClick={() => { setFromDate(periodStart); setToDate(periodEnd); setSelected([]); }}
                disabled={fromDate === periodStart && toDate === periodEnd && selected.length === 0}
                size="small"
                sx={{ color: T.accent, textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}
              >
                Use full period
              </Button>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, bgcolor: T.accentFaint, borderTop: `1px solid ${T.divider}` }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: T.accent, borderColor: alpha(T.accent, 0.35) }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onDownload?.(chosenRecords, { fromDate, toDate, selectedDates: [...selected] })}
          variant="contained"
          disabled={loading || Boolean(validationError) || chosenRecords.length === 0}
          startIcon={<DownloadIcon sx={{ fontSize: 21 }} />}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', bgcolor: T.accent, '&:hover': { bgcolor: T.accentDark } }}
        >
          Download Excel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttendanceExcelReportDialog;
