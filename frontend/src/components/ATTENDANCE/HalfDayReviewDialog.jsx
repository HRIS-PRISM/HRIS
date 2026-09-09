import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  alpha,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  HALF_DAY_STATUS,
  DEDUCTION_SOURCE,
  computeSuggestedTardinessFromPunches,
  computeTardinessFromMaxAndRendered,
  getRowMaxRenderedTotal,
  getOfficialScheduleDisplay,
  getSuggestedHalfDayRenderedTotal,
  parseHrDurationToHhMmSs,
} from '../../utils/halfDayReview';

/* ── tiny helpers ─────────────────────────────────────────────────── */
const isEmpty = (v) => String(v ?? '').trim() === '';

const MonoChip = ({ value, label, color = '#6d2323', bg = 'rgba(109,35,35,0.07)', border = 'rgba(109,35,35,0.18)' }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.5,
    px: 0.9, py: 0.25, borderRadius: '5px',
    bgcolor: bg, border: `1px solid ${border}`,
  }}>
    {label && (
      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}:
      </Typography>
    )}
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: '.03em' }}>
      {value}
    </Typography>
  </Box>
);

const InputField = ({ label, required, value, onChange, placeholder, hint, hintChip, hintChipColor, hintChipBg, hintChipBorder, accentColor, accentBorder, multiline, minRows }) => (
  <Box>
    <Typography sx={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.07em',
      textTransform: 'uppercase', color: accentColor, mb: 0.6,
      display: 'flex', alignItems: 'center', gap: 0.4,
    }}>
      {label}
      {required && <Box component="span" sx={{ color: '#d32f2f', fontSize: '0.8rem', lineHeight: 1 }}>*</Box>}
    </Typography>
    <TextField
      size="small"
      fullWidth
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      multiline={multiline}
      minRows={minRows}
      inputProps={{ style: { fontFamily: !multiline ? 'monospace' : 'inherit', fontSize: '0.85rem', letterSpacing: !multiline ? '.04em' : 0 } }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px', fontSize: '0.85rem', bgcolor: '#fff',
          '& fieldset': { borderColor: accentBorder },
          '&:hover fieldset': { borderColor: accentColor },
          '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '1.5px' },
        },
      }}
    />
    {(hint || hintChip) && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.6, flexWrap: 'wrap' }}>
        {hint && <Typography sx={{ fontSize: '0.68rem', color: '#aaa' }}>{hint}</Typography>}
        {hintChip && (
          <MonoChip value={hintChip} color={hintChipColor} bg={hintChipBg} border={hintChipBorder} />
        )}
      </Box>
    )}
  </Box>
);

/* ── day-of-week helper ───────────────────────────────────────────── */
const getDayName = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  } catch { return ''; }
};

/* ── punch display helper ─────────────────────────────────────────── */
const punchVal = (v) => {
  if (!v || String(v).trim() === '' || String(v).trim() === '—' || String(v).includes('00:00:00 AM') || String(v).includes('00:00:00 PM')) return null;
  return String(v).trim();
};

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */
export default function HalfDayReviewDialog({ open, mode, row, moduleType, themeT, onClose, onConfirm }) {
  const T = themeT;
  const isApprove = mode === 'approve';

  /* colours per mode */
  const C = isApprove
    ? {
        accent: '#5a2d9a',
        accentDark: '#3d1d6e',
        accentFaint: 'rgba(90,45,154,0.07)',
        accentBorder: 'rgba(90,45,154,0.22)',
        accentMid: '#7c5ab8',
        headerBg: 'linear-gradient(135deg,#f8f5ff 0%,#ede8ff 100%)',
        iconBg: 'rgba(90,45,154,0.12)',
        iconBorder: 'rgba(90,45,154,0.22)',
        badgeBg: 'rgba(90,45,154,0.10)',
        badgeColor: '#5a2d9a',
        badgeBorder: 'rgba(90,45,154,0.22)',
        monoColor: '#5a2d9a',
        monoBg: 'rgba(90,45,154,0.07)',
        monoBorder: 'rgba(90,45,154,0.18)',
        closeBg: 'rgba(90,45,154,0.10)',
        closeColor: '#5a2d9a',
        btnBg: '#5a2d9a',
        btnHover: '#3d1d6e',
        divider: 'rgba(90,45,154,0.10)',
        sectionColor: '#7c5ab8',
        renderedBg: 'rgba(27,94,32,0.08)',
        renderedBorder: 'rgba(27,94,32,0.25)',
        renderedColor: '#1b5e20',
      }
    : {
        accent: '#6d2323',
        accentDark: '#5a1d1d',
        accentFaint: 'rgba(109,35,35,0.06)',
        accentBorder: 'rgba(109,35,35,0.22)',
        accentMid: '#8B4545',
        headerBg: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
        iconBg: 'rgba(109,35,35,0.12)',
        iconBorder: 'rgba(109,35,35,0.18)',
        badgeBg: 'rgba(109,35,35,0.10)',
        badgeColor: '#6d2323',
        badgeBorder: 'rgba(109,35,35,0.22)',
        monoColor: '#6d2323',
        monoBg: 'rgba(109,35,35,0.07)',
        monoBorder: 'rgba(109,35,35,0.18)',
        closeBg: 'rgba(109,35,35,0.10)',
        closeColor: '#6d2323',
        btnBg: '#6d2323',
        btnHover: '#5a1d1d',
        divider: 'rgba(109,35,35,0.10)',
        sectionColor: '#8B4545',
        renderedBg: 'rgba(27,94,32,0.08)',
        renderedBorder: 'rgba(27,94,32,0.25)',
        renderedColor: '#1b5e20',
      };

  /* derived from row */
  const suggested = row ? computeSuggestedTardinessFromPunches(row, moduleType) : {};
  const maxOfficialTotal = row ? getRowMaxRenderedTotal(row, moduleType) : '00:00:00';
  const officialSchedule = row ? getOfficialScheduleDisplay(row, moduleType) : null;
  const officialHalfSuggestion = row ? getSuggestedHalfDayRenderedTotal(row) : '00:00:00';
  const timeIN = row ? punchVal(row.timeIN) : null;
  const timeOUT = row ? punchVal(row.timeOUT) : null;
  const showMorningField = Boolean(timeIN);
  const showAfternoonField = Boolean(timeOUT);
  const dayName = row ? getDayName(row.date) : '';
  const detectedSide =
    timeIN && timeOUT
      ? 'Shortfall vs official schedule'
      : timeIN && !timeOUT
        ? 'Time IN only'
        : !timeIN && timeOUT
          ? 'Time OUT only'
          : 'No punches';

  const applyRenderedSuggestion = () => {
    setRenderedTouched(true);
    if (showMorningField) {
      setRenderedMorning(officialHalfSuggestion);
    } else {
      setRenderedMorning('');
    }
    if (showAfternoonField) {
      setRenderedAfternoon(officialHalfSuggestion);
    } else {
      setRenderedAfternoon('');
    }
  };

  /* state */
  const [renderedMorning, setRenderedMorning] = useState('');
  const [renderedAfternoon, setRenderedAfternoon] = useState('');
  const [renderedTouched, setRenderedTouched] = useState(false);
  const [hrTardinessTotal, setHrTardinessTotal] = useState('');
  const [hrTardinessTouched, setHrTardinessTouched] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !row) return;
    setRenderedMorning('');
    setRenderedAfternoon('');
    setRenderedTouched(false);
    setHrTardinessTotal(suggested.suggestedTardinessRegular || '');
    setHrTardinessTouched(false);
    setNote('');
  }, [open, row, moduleType]);

  /* approve: compute max per-segment from row */
  const maxAM = row?.formattedFacultyMaxRenderedTimeAM || '00:00:00';
  const maxPM = row?.formattedFacultyMaxRenderedTimePM || '00:00:00';

  /* total rendered preview */
  const totalRenderedPreview = useMemo(() => {
    const toSec = (t) => {
      if (!t || t === '00:00:00') return 0;
      const p = String(t).split(':').map(Number);
      return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
    };
    const normAM = renderedMorning.trim() ? parseHrDurationToHhMmSs(renderedMorning.trim()) : null;
    const normPM = renderedAfternoon.trim() ? parseHrDurationToHhMmSs(renderedAfternoon.trim()) : null;
    const total = toSec(normAM) + toSec(normPM);
    if (total === 0) return null;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [renderedMorning, renderedAfternoon]);

  /* guards */
  const canConfirmApprove =
    renderedTouched &&
    ((showMorningField && !isEmpty(renderedMorning)) ||
      (showAfternoonField && !isEmpty(renderedAfternoon)));
  const canConfirmReject = hrTardinessTouched && !isEmpty(hrTardinessTotal);

  /* submit */
  const handleConfirm = () => {
    if (!row) return;
    const date = String(row.date).slice(0, 10);
    if (isApprove) {
      if (!canConfirmApprove) return;
      const normAM = renderedMorning.trim() ? parseHrDurationToHhMmSs(renderedMorning.trim()) : null;
      const normPM = renderedAfternoon.trim() ? parseHrDurationToHhMmSs(renderedAfternoon.trim()) : null;
      const toSec = (t) => { if (!t) return 0; const p = t.split(':').map(Number); return p[0]*3600+p[1]*60+(p[2]||0); };
      const totalSec = toSec(normAM) + toSec(normPM);
      const h = Math.floor(totalSec/3600), m2 = Math.floor((totalSec%3600)/60), s2 = totalSec%60;
      const trimmed = `${String(h).padStart(2,'0')}:${String(m2).padStart(2,'0')}:${String(s2).padStart(2,'0')}`;
      onConfirm({
        date,
        status: HALF_DAY_STATUS.APPROVED,
        detectedReason: 'xor_punch',
        note: note.trim(),
        renderedTotal: trimmed,
        renderedRegular: trimmed,
        renderedMorning: normAM,
        renderedAfternoon: normPM,
        deductionSource: DEDUCTION_SOURCE.EARNINGS,
      });
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
        deductionSource: DEDUCTION_SOURCE.ATTENDANCE,
      });
    }
    onClose();
  };

  if (!row) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          overflow: 'hidden',
          border: '0.5px solid rgba(0,0,0,0.10)',
          bgcolor: '#fff',
          boxShadow: '0 8px 40px rgba(0,0,0,0.13)',
        },
      }}
    >
      {/* ── HEADER ── */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2, background: C.headerBg, position: 'relative' }}>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute', top: 12, right: 12,
            width: 26, height: 26, borderRadius: '50%',
            bgcolor: C.closeBg, color: C.closeColor,
            '&:hover': { bgcolor: alpha(C.accent, 0.18) },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* icon circle */}
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            bgcolor: C.iconBg, border: `1px solid ${C.iconBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isApprove ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="14" height="14" rx="3" stroke={C.accent} strokeWidth="1.8" />
                <polyline points="6.5,10 9,12.5 14,7" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="4" y1="4" x2="16" y2="16" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
                <line x1="16" y1="4" x2="4" y2="16" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: C.accent, lineHeight: 1.2 }}>
                {isApprove ? 'Confirm half day' : 'Not a half day'}
              </Typography>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25,
                borderRadius: '20px', bgcolor: C.badgeBg, border: `1px solid ${C.badgeBorder}`,
              }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: C.badgeColor, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {isApprove ? 'Approve' : 'Reject'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: C.accentMid, fontWeight: 600, fontFamily: 'monospace' }}>
              {row.date}{dayName ? ` · ${dayName}` : ''}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── BODY ── */}
      <Box sx={{ px: 2.5, pt: 2, pb: 0 }}>

        {/* punch info row — both modes */}
        <Box sx={{
          display: 'flex', alignItems: 'stretch', gap: 0,
          bgcolor: C.accentFaint, border: `1px solid ${C.accentBorder}`,
          borderRadius: '9px', overflow: 'hidden', mb: 2,
        }}>
          {[
            { label: 'Punch IN', val: timeIN },
            { label: 'Punch OUT', val: timeOUT },
            isApprove
              ? { label: 'Detected', val: detectedSide, isTag: true }
              : { label: 'Suggested tardiness', val: suggested.suggestedTardinessRegular || '00:00:00', isRed: true },
          ].map((item, i, arr) => (
            <Box
              key={item.label}
              sx={{
                flex: 1, px: 1.25, py: 1,
                borderRight: i < arr.length - 1 ? `1px solid ${C.accentBorder}` : 'none',
                display: 'flex', flexDirection: 'column', gap: 0.3,
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#999', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                {item.label}
              </Typography>
              {item.isTag ? (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', px: 0.75, py: 0.2,
                  borderRadius: '4px', bgcolor: C.badgeBg, border: `1px solid ${C.badgeBorder}`,
                  width: 'fit-content',
                }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: C.accent }}>
                    {item.val}
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{
                  fontSize: '0.78rem', fontWeight: 700, fontFamily: 'monospace',
                  color: item.val ? (item.isRed ? '#b71c1c' : '#1a1a1a') : '#aaa',
                }}>
                  {item.val || '— missing'}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* official schedule — single row */}
        {officialSchedule?.hasSchedule && (
          <Box sx={{
            display: 'flex',
            alignItems: 'stretch',
            bgcolor: 'rgba(27,94,32,0.05)',
            border: '1px solid rgba(27,94,32,0.22)',
            borderRadius: '9px',
            overflow: 'hidden',
            mb: 2,
          }}>
            {[
              { label: 'Official IN', val: officialSchedule.officialTimeIN },
              { label: 'Break IN', val: officialSchedule.officialBreaktimeIN },
              { label: 'Break OUT', val: officialSchedule.officialBreaktimeOUT },
              { label: 'Official OUT', val: officialSchedule.officialTimeOUT },
            ].map((item, i, arr) => (
              <Box
                key={item.label}
                sx={{
                  flex: 1,
                  px: 1.25,
                  py: 1,
                  borderRight: i < arr.length - 1 ? '1px solid rgba(27,94,32,0.15)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.3,
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#2e7d32', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, fontFamily: 'monospace', color: item.val ? '#1a1a1a' : '#aaa' }}>
                  {item.val || '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* description */}
        <Typography sx={{ fontSize: '0.8rem', color: '#6b6b6b', lineHeight: 1.7, mb: isApprove ? 1.25 : 2 }}>
          {isApprove
            ? 'Enter rendered hours worked. The deficiency will be deducted in Earnings Management (leave credits).'
            : <>This day will <Box component="strong" sx={{ color: C.accent }}>not</Box> be counted as a half day. Enter total tardiness to add to Late Total (no leave credit deduction).</>}
        </Typography>

        {isApprove && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              py: 0.75,
              fontSize: '0.78rem',
              lineHeight: 1.55,
              borderRadius: '8px',
              bgcolor: 'rgba(90,45,154,0.06)',
              color: '#3d1d6e',
              border: '1px solid rgba(90,45,154,0.22)',
              '& .MuiAlert-icon': { color: '#5a2d9a' },
            }}
          >
            <strong>Tardiness will not be included</strong> in Total Tardiness, Late Total, or the DTR late column for this day.
          </Alert>
        )}

        {/* ── APPROVE fields ── */}
        {isApprove && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              pb: 0.6,
              borderBottom: `1px solid ${C.divider}`,
            }}>
              <Typography sx={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.07em',
                textTransform: 'uppercase', color: C.sectionColor,
              }}>
                Rendered time (HR override)
              </Typography>
              <button
                type="button"
                onClick={applyRenderedSuggestion}
                style={{
                  background: '#5a2d9a',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                Use suggestion ({officialHalfSuggestion})
              </button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: showMorningField && showAfternoonField ? '1fr 1fr' : '1fr',
                gap: 1.5,
              }}
            >
              {showMorningField && (
                <InputField
                  label="AM Rendered"
                  value={renderedMorning}
                  onChange={(e) => { setRenderedTouched(true); setRenderedMorning(e.target.value); }}
                  placeholder="HH:MM:SS"
                  hint={officialHalfSuggestion !== '00:00:00' ? 'Suggestion (½ of AM+PM official):' : 'Max:'}
                  hintChip={officialHalfSuggestion || maxAM}
                  hintChipColor={C.monoColor}
                  hintChipBg={C.monoBg}
                  hintChipBorder={C.monoBorder}
                  accentColor={C.accent}
                  accentBorder={C.accentBorder}
                />
              )}
              {showAfternoonField && (
                <InputField
                  label="PM Rendered"
                  value={renderedAfternoon}
                  onChange={(e) => { setRenderedTouched(true); setRenderedAfternoon(e.target.value); }}
                  placeholder="HH:MM:SS"
                  hint={officialHalfSuggestion !== '00:00:00' ? 'Suggestion (½ of AM+PM official):' : 'Max:'}
                  hintChip={officialHalfSuggestion || maxPM}
                  hintChipColor={C.monoColor}
                  hintChipBg={C.monoBg}
                  hintChipBorder={C.monoBorder}
                  accentColor={C.accent}
                  accentBorder={C.accentBorder}
                />
              )}
            </Box>

            {/* total rendered summary */}
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 1.5, py: 1, borderRadius: '8px',
              bgcolor: totalRenderedPreview ? C.renderedBg : 'rgba(0,0,0,0.03)',
              border: `1px solid ${totalRenderedPreview ? C.renderedBorder : 'rgba(0,0,0,0.08)'}`,
            }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: totalRenderedPreview ? C.renderedColor : '#aaa' }}>
                Total rendered
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'monospace', color: totalRenderedPreview ? C.renderedColor : '#ccc' }}>
                {totalRenderedPreview || '—'}
              </Typography>
            </Box>
            {totalRenderedPreview && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.68rem', color: '#888' }}>
                  Earnings shortfall (reference only):
                </Typography>
                <MonoChip
                  value={computeTardinessFromMaxAndRendered(maxOfficialTotal, totalRenderedPreview)}
                  color={C.monoColor}
                  bg={C.monoBg}
                  border={C.monoBorder}
                />
              </Box>
            )}
          </Box>
        )}

        {/* ── REJECT fields ── */}
        {!isApprove && (
          <InputField
            label="Total tardiness (HR)"
            required
            value={hrTardinessTotal}
            onChange={(e) => { setHrTardinessTouched(true); setHrTardinessTotal(e.target.value); }}
            placeholder="HH:MM:SS"
            hint="Reference from punches:"
            hintChip={suggested.suggestedTardinessRegular || '00:00:00'}
            hintChipColor={C.monoColor}
            hintChipBg={C.monoBg}
            hintChipBorder={C.monoBorder}
            accentColor={C.accent}
            accentBorder={C.accentBorder}
          />
        )}

        {/* ── note ── */}
        <Box sx={{ mt: 2 }}>
          <InputField
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for this decision…"
            accentColor="#aaa"
            accentBorder="rgba(0,0,0,0.15)"
            multiline
            minRows={2}
          />
        </Box>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{
        px: 2.5, py: 1.75, mt: 2,
        display: 'flex', justifyContent: 'flex-end', gap: 1,
        borderTop: '1px solid rgba(0,0,0,0.07)',
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: '8px', padding: '8px 18px', fontSize: '0.82rem',
            fontWeight: 700, color: '#888', cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isApprove ? !canConfirmApprove : !canConfirmReject}
          style={{
            background: (isApprove ? !canConfirmApprove : !canConfirmReject) ? '#ccc' : C.btnBg,
            border: 'none', borderRadius: '8px', padding: '8px 22px',
            fontSize: '0.82rem', fontWeight: 700, color: '#fff',
            cursor: (isApprove ? !canConfirmApprove : !canConfirmReject) ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            if (isApprove ? canConfirmApprove : canConfirmReject)
              e.currentTarget.style.background = C.btnHover;
          }}
          onMouseLeave={(e) => {
            if (isApprove ? canConfirmApprove : canConfirmReject)
              e.currentTarget.style.background = C.btnBg;
          }}
        >
          {isApprove ? 'Confirm half day' : 'Mark as not half day'}
        </button>
      </Box>
    </Dialog>
  );
}