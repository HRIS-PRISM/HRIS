import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Alert,
  Stack,
  Box,
  Typography,
  Paper,
  Chip,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  defaultMergeChoice,
  hmsRoughlyEqual,
} from './overallAttendanceMerge';

const ACCENT = '#6d2323';

/**
 * @param {boolean} open
 * @param {function} onClose
 * @param {function} onConfirm — (choices: Record<string, 'saved'|'proposed'|'tertiary'>) => void
 * @param {object} savedRow — existing DB row
 * @param {object} proposedRecord — new totals from module or form (same keys as saved)
 * @param {Array<{key: string, label: string}>} fields — which keys to compare
 * @param {object|null} tertiaryRecord — optional "suggested from daily/leave" (earnings); keys subset of fields
 * @param {string} title
 */
export default function OverallAttendanceCompareModal({
  open,
  onClose,
  onConfirm,
  savedRow,
  proposedRecord,
  fields,
  tertiaryRecord = null,
  title = 'Compare summary before saving',
}) {
  const [choices, setChoices] = useState({});
  /** Save stays disabled until user clicks Keep all / Use all (any preset). */
  const [saveUnlocked, setSaveUnlocked] = useState(false);

  useEffect(() => {
    if (!open || !savedRow || !proposedRecord || !fields?.length) return;
    const next = {};
    fields.forEach(({ key }) => {
      const sv = savedRow[key] ?? '00:00:00';
      const pv = proposedRecord[key] ?? '00:00:00';
      const tv = tertiaryRecord?.[key];
      next[key] = defaultMergeChoice(sv, pv, tv);
    });
    setChoices(next);
    setSaveUnlocked(false);
  }, [open, savedRow, proposedRecord, tertiaryRecord, fields]);

  const hasTertiary = tertiaryRecord && Object.keys(tertiaryRecord).length > 0;

  const handleConfirm = () => {
    if (!saveUnlocked) return;
    onConfirm(choices);
  };

  const applyBulkPreset = (which) => {
    const next = {};
    fields.forEach(({ key }) => {
      next[key] = which;
    });
    setChoices(next);
    setSaveUnlocked(true);
  };

  if (!fields?.length) return null;

  const ValuePanel = ({
    choiceKey,
    rowKey,
    value,
    header,
    subtitle,
    icon: Icon,
    palette,
  }) => {
    const selected = choices[rowKey] === choiceKey;
    return (
      <Paper
        elevation={0}
        onClick={() => setChoices((c) => ({ ...c, [rowKey]: choiceKey }))}
        sx={{
          flex: 1,
          minWidth: 0,
          p: 0.65,
          cursor: 'pointer',
          borderRadius: 1,
          border: '1.5px solid',
          borderColor: selected ? palette.borderStrong : palette.border,
          bgcolor: selected ? palette.bgSelected : palette.bg,
          boxShadow: selected ? `0 0 0 1px ${alpha(palette.borderStrong, 0.35)}` : 'none',
          transition: 'border-color 0.12s, background-color 0.12s',
          '&:hover': {
            borderColor: palette.borderStrong,
            bgcolor: palette.bgHover,
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.25}>
          <Stack direction="row" alignItems="center" spacing={0.4} sx={{ minWidth: 0 }}>
            <Icon sx={{ fontSize: 13, color: palette.icon, opacity: 0.9, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  display: 'block',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: palette.heading,
                  fontSize: '0.58rem',
                  lineHeight: 1.15,
                }}
              >
                {header}
              </Typography>
              <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', lineHeight: 1.15 }}>
                {subtitle}
              </Typography>
            </Box>
          </Stack>
          {selected ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: ACCENT, flexShrink: 0 }} />
          ) : null}
        </Stack>
        <Typography
          component="div"
          sx={{
            mt: 0.35,
            fontFamily: 'Consolas, "Courier New", monospace',
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
            color: 'text.primary',
            textAlign: 'center',
            py: 0.15,
          }}
        >
          {value ?? '—'}
        </Typography>
      </Paper>
    );
  };

  const palettes = {
    saved: {
      bg: alpha('#000', 0.03),
      bgHover: alpha('#000', 0.05),
      bgSelected: alpha(ACCENT, 0.06),
      border: alpha('#000', 0.1),
      borderStrong: alpha(ACCENT, 0.45),
      heading: '#424242',
      icon: '#616161',
    },
    proposed: {
      bg: alpha('#e65100', 0.05),
      bgHover: alpha('#e65100', 0.08),
      bgSelected: alpha('#e65100', 0.12),
      border: alpha('#e65100', 0.22),
      borderStrong: '#e65100',
      heading: '#bf360c',
      icon: '#e65100',
    },
    tertiary: {
      bg: alpha('#1565c0', 0.05),
      bgHover: alpha('#1565c0', 0.08),
      bgSelected: alpha('#1565c0', 0.12),
      border: alpha('#1565c0', 0.22),
      borderStrong: '#1565c0',
      heading: '#0d47a1',
      icon: '#1565c0',
    },
  };

  const VsDivider = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.1,
        flexShrink: 0,
        color: 'text.disabled',
      }}
    >
      <ChevronRightIcon sx={{ fontSize: 16 }} />
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: 'min(88vh, 640px)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1,
          px: 1.5,
          flexShrink: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(ACCENT, 0.04),
        }}
      >
        <CompareArrowsIcon sx={{ color: ACCENT, fontSize: 22 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.15, lineHeight: 1.3 }}>
            Click a column per field to fine-tune. Use <strong>Keep all</strong> / <strong>Use all</strong> below to unlock save.
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Scrollable comparison grid */}
        <Box
          sx={{
            overflow: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
            px: 1.5,
            pt: 1,
            pb: 0.5,
          }}
        >
          <Alert severity="info" sx={{ py: 0.25, px: 1, mb: 1, borderRadius: 1, '& .MuiAlert-message': { py: 0.5 } }}>
            <Typography sx={{ fontSize: '0.68rem', lineHeight: 1.45 }}>
              Stored vs new{hasTertiary ? ' vs suggested from records' : ''}. Pick per row, then a bulk preset to confirm.
            </Typography>
          </Alert>

          <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip size="small" label="Saved" sx={{ height: 20, fontSize: '0.6rem', bgcolor: palettes.saved.bg, border: `1px solid ${palettes.saved.border}` }} />
            <Chip size="small" label={hasTertiary ? 'Yours' : 'New'} sx={{ height: 20, fontSize: '0.6rem', bgcolor: palettes.proposed.bg, border: `1px solid ${palettes.proposed.border}` }} />
            {hasTertiary ? (
              <Chip size="small" label="Suggested" sx={{ height: 20, fontSize: '0.6rem', bgcolor: palettes.tertiary.bg, border: `1px solid ${palettes.tertiary.border}` }} />
            ) : null}
          </Stack>

          <Stack spacing={1.1}>
            {fields.map(({ key, label }) => {
              const sv = savedRow?.[key] ?? '—';
              const pv = proposedRecord?.[key] ?? '—';
              const tv = hasTertiary ? (tertiaryRecord[key] ?? '—') : null;
              const diffSp = !hmsRoughlyEqual(sv, pv);
              const diffSt = hasTertiary && !hmsRoughlyEqual(sv, tv);

              return (
                <Box key={key}>
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      mb: 0.45,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    {label}
                    {(diffSp || diffSt) && (
                      <Chip label="Diff" size="small" color="warning" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700 }} />
                    )}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="stretch"
                    spacing={0}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 0.65, sm: 0 },
                    }}
                  >
                    <ValuePanel
                      choiceKey="saved"
                      rowKey={key}
                      value={sv}
                      header="Saved"
                      subtitle="Stored"
                      icon={SaveOutlinedIcon}
                      palette={palettes.saved}
                    />
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
                      <VsDivider />
                    </Box>
                    <ValuePanel
                      choiceKey="proposed"
                      rowKey={key}
                      value={pv}
                      header={hasTertiary ? 'Yours' : 'New'}
                      subtitle={hasTertiary ? 'Your edit' : 'Screen'}
                      icon={FiberNewOutlinedIcon}
                      palette={palettes.proposed}
                    />
                    {hasTertiary ? (
                      <>
                        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
                          <VsDivider />
                        </Box>
                        <ValuePanel
                          choiceKey="tertiary"
                          rowKey={key}
                          value={tv}
                          header="Sugg."
                          subtitle="Recalc"
                          icon={InsightsOutlinedIcon}
                          palette={palettes.tertiary}
                        />
                      </>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Sticky footer: bulk presets always visible + actions */}
        <Box
          sx={{
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha('#000', 0.025),
            px: 1.5,
            py: 1,
          }}
        >
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', mb: 0.6 }}>
            Step 1 — Apply to all rows (required to save)
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ gap: 0.75, mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => applyBulkPreset('saved')}
              startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{ fontSize: '0.72rem', py: 0.35, textTransform: 'none' }}
            >
              Keep all saved
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => applyBulkPreset('proposed')}
              startIcon={<FiberNewOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{ fontSize: '0.72rem', py: 0.35, textTransform: 'none' }}
            >
              {hasTertiary ? 'Use all yours' : 'Use all new'}
            </Button>
            {hasTertiary ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyBulkPreset('tertiary')}
                startIcon={<InsightsOutlinedIcon sx={{ fontSize: 16 }} />}
                sx={{ fontSize: '0.72rem', py: 0.35, textTransform: 'none' }}
              >
                Use all suggested
              </Button>
            ) : null}
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
            <Button size="small" onClick={onClose} color="inherit" sx={{ fontSize: '0.75rem', textTransform: 'none' }}>
              Cancel
            </Button>
            <Tooltip
              title={saveUnlocked ? '' : 'Choose Keep all saved, Use all new, or Use all suggested first.'}
              placement="top"
            >
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!saveUnlocked}
                  onClick={handleConfirm}
                  sx={{
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    bgcolor: ACCENT,
                    '&:hover': { bgcolor: '#5a1d1d' },
                    '&.Mui-disabled': { bgcolor: alpha(ACCENT, 0.35), color: '#fff' },
                  }}
                >
                  Save with selected values
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
