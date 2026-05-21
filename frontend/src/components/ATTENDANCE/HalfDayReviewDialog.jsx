import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  alpha,
} from '@mui/material';
import {
  HALF_DAY_STATUS,
  computeSuggestedTardinessFromPunches,
  computeApprovedTardinessFromRendered,
  getRowMaxRenderedTotal,
  parseHrDurationToHhMmSs,
} from '../../utils/halfDayReview';

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontSize: '0.85rem' },
};

/**
 * Confirm: HR enters total rendered → total tardiness from official max minus rendered.
 * Not half day: HR enters total tardiness only.
 */
export default function HalfDayReviewDialog({
  open,
  mode,
  row,
  moduleType,
  themeT,
  onClose,
  onConfirm,
}) {
  const T = themeT;
  const isApprove = mode === 'approve';

  const suggested = row
    ? computeSuggestedTardinessFromPunches(row, moduleType)
    : {};

  const [renderedTotal, setRenderedTotal] = useState('');
  const [renderedTouched, setRenderedTouched] = useState(false);
  const [hrTardinessTotal, setHrTardinessTotal] = useState('');
  const [hrTardinessTouched, setHrTardinessTouched] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !row) return;
    setRenderedTotal('');
    setRenderedTouched(false);
    setHrTardinessTotal('');
    setHrTardinessTouched(false);
    setNote('');
  }, [open, row, moduleType]);

  const maxOfficialTotal = row ? getRowMaxRenderedTotal(row, moduleType) : '00:00:00';

  const renderedEntered = String(renderedTotal ?? '').trim() !== '';
  const showTardinessPreview = isApprove && renderedTouched && renderedEntered;

  const normalizedRendered = renderedEntered
    ? parseHrDurationToHhMmSs(renderedTotal.trim())
    : null;

  const previewTardiness = (() => {
    if (!showTardinessPreview || !normalizedRendered) return null;
    const computed = computeApprovedTardinessFromRendered(
      row,
      { renderedTotal: normalizedRendered },
      moduleType,
    );
    return (
      computed?.computedTardinessTotal ||
      computed?.computedTardinessRegular ||
      '00:00:00'
    );
  })();

  const canConfirmApprove = renderedTouched && renderedEntered;
  const canConfirmReject = hrTardinessTouched && String(hrTardinessTotal ?? '').trim() !== '';

  const handleConfirm = () => {
    if (!row) return;
    const date = String(row.date).slice(0, 10);
    if (isApprove) {
      if (!canConfirmApprove) return;
      const trimmed = parseHrDurationToHhMmSs(renderedTotal.trim());
      const entry = {
        date,
        status: HALF_DAY_STATUS.APPROVED,
        detectedReason: 'xor_punch',
        note: note.trim(),
        renderedTotal: trimmed,
        renderedRegular: trimmed,
        renderedMorning: null,
        renderedAfternoon: null,
        ...computeApprovedTardinessFromRendered(row, { renderedTotal: trimmed }, moduleType),
      };
      onConfirm(entry);
    } else {
      if (!canConfirmReject) return;
      const trimmedTard = hrTardinessTotal.trim();
      onConfirm({
        date,
        status: HALF_DAY_STATUS.REJECTED,
        detectedReason: 'xor_punch',
        note: note.trim(),
        suggestedTardinessMorning: suggested.suggestedTardinessMorning,
        suggestedTardinessAfternoon: suggested.suggestedTardinessAfternoon,
        suggestedTardinessRegular: suggested.suggestedTardinessRegular,
        hrTardinessTotal: trimmedTard,
        hrTardinessRegular: trimmedTard,
        hrTardinessMorning: null,
        hrTardinessAfternoon: null,
      });
    }
    onClose();
  };

  if (!row) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: T.accent }}>
        {isApprove ? 'Confirm as half day' : 'Not a half day'} — {row.date}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.8rem', color: T.muted, mb: 2 }}>
          {isApprove
            ? 'Enter total rendered for the day (e.g. 5 or 5:00:00 = 5 hours). Tardiness = official schedule for the day minus rendered (e.g. 10h − 5h = 5h).'
            : 'Do not count this day as a half day. Enter total tardiness to apply for this date.'}
        </Typography>

        {isApprove && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label="Total rendered to count"
              value={renderedTotal}
              onChange={(e) => {
                setRenderedTouched(true);
                setRenderedTotal(e.target.value);
              }}
              placeholder="e.g. 5 or 05:00:00 (hours)"
              size="small"
              fullWidth
              required
              sx={fieldSx}
              helperText={
                normalizedRendered && showTardinessPreview
                  ? `Counted as ${normalizedRendered} rendered`
                  : 'Required — use hours (5) or HH:MM:SS'
              }
            />
            <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>
              Max official (schedule for day): {maxOfficialTotal || '—'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: showTardinessPreview
                  ? T.tardiness?.color || '#b71c1c'
                  : T.faint,
              }}
            >
              Total tardiness preview:{' '}
              {showTardinessPreview ? previewTardiness : '— enter rendered above'}
            </Typography>
          </Box>
        )}

        {!isApprove && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label="Total tardiness (HR)"
              value={hrTardinessTotal}
              onChange={(e) => {
                setHrTardinessTouched(true);
                setHrTardinessTotal(e.target.value);
              }}
              placeholder="HH:MM:SS (required)"
              size="small"
              fullWidth
              required
              sx={fieldSx}
              helperText={`Suggested from punches (reference only): ${suggested.suggestedTardinessRegular || '00:00:00'}`}
            />
          </Box>
        )}

        <TextField
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 2, ...fieldSx }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: T.muted }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isApprove ? !canConfirmApprove : !canConfirmReject}
          sx={{
            bgcolor: isApprove ? T.halfDay?.color || '#6a1b9a' : T.accent,
            '&:hover': {
              bgcolor: isApprove
                ? alpha(T.halfDay?.color || '#6a1b9a', 0.85)
                : T.accentDark,
            },
          }}
        >
          {isApprove ? 'Confirm half day' : 'Apply as tardiness only'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
