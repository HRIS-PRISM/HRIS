import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Stack,
  Box,
  Typography,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  defaultMergeChoice,
  hmsRoughlyEqual,
} from './overallAttendanceMerge';

const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  text: '#1a1a1a',
  muted: '#4b5563',
  faint: '#6b7280',
  surface: '#ffffff',
  blush: '#faf5f5',
  blushDeep: '#f3e8e8',
  divider: '#e5e7eb',
  poppins: "'Poppins', sans-serif",
  conflictBg: 'rgba(109,35,35,0.06)',
  conflictBgStrong: 'rgba(109,35,35,0.1)',
  conflictBorder: '#6d2323',
};

const thCellSx = {
  py: 1.25,
  px: 1.5,
  bgcolor: `${T.accent} !important`,
  color: '#fff !important',
  borderBottom: `2px solid ${T.accentDark}`,
  verticalAlign: 'bottom',
};

const thTitleSx = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#fff',
  fontFamily: T.poppins,
  lineHeight: 1.25,
};

const thHintSx = {
  fontSize: '0.65rem',
  color: 'rgba(255,255,255,0.72)',
  fontFamily: T.poppins,
  mt: 0.15,
};

const MODULE_DISPLAY_NAMES = {
  NON_TEACHING: 'Non-Teaching',
  FACULTY_30HRS: 'Faculty 30 Hours',
  DESIGNATED_40HRS: 'Faculty Designated',
};

function moduleDisplayName(code) {
  if (!code) return 'Unknown module';
  const key = String(code).trim().toUpperCase();
  return MODULE_DISPLAY_NAMES[key] || String(code).replace(/_/g, ' ');
}

const COPY = {
  duplicate: {
    title: 'Summary already exists',
    keepAllSaved: 'Keep All from Summary',
    useAllProposed: 'Use All from this Module',
    goBack: 'Go back',
    confirm: 'Confirm update',
    showDiffsOnly: 'Conflicts only',
    unlockTooltip: 'Choose Keep All from Summary or Use All from this Module first.',
    footerIdle: 'Review the differences below, then choose which totals to apply.',
    footerKept: 'All rows will keep the totals already in Attendance Summary.',
    footerOverwrite: 'All rows will use this module\'s totals and replace Summary.',
    compareHint: 'Review only — use the buttons below to choose which totals to apply.',
  },
  earnings: {
    title: 'Review summary edit',
    keepAllSaved: 'Revert all to current',
    useAllProposed: 'Apply all your edits',
    useAllTertiary: 'Apply all suggested',
    goBack: 'Cancel',
    confirm: 'Save changes',
    showDiffsOnly: 'Changed fields only',
    unlockTooltip: 'Choose a bulk action below first.',
    footerIdle: 'Choose a bulk action below, then save.',
    footerKept: 'Current summary values will be kept.',
    footerOverwrite: 'Your selections will update the summary record.',
  },
};

function parseFieldLabel(label) {
  const parts = String(label || '').split(' — ');
  if (parts.length >= 2) {
    return { group: parts[0].trim(), metric: parts.slice(1).join(' — ').trim() };
  }
  return { group: 'Other', metric: label };
}

function formatPeriod(savedRow) {
  const sd = savedRow?.startDate;
  const ed = savedRow?.endDate;
  if (!sd || !ed) return 'this period';
  const clip = (d) => String(d).trim().slice(0, 10);
  return `${clip(sd)} to ${clip(ed)}`;
}

function fieldHasDiff(key, savedRow, proposedRecord, tertiaryRecord, hasTertiary) {
  const sv = savedRow?.[key] ?? '00:00:00';
  const pv = proposedRecord?.[key] ?? '00:00:00';
  if (!hmsRoughlyEqual(sv, pv)) return true;
  if (hasTertiary) {
    const tv = tertiaryRecord?.[key] ?? '00:00:00';
    if (!hmsRoughlyEqual(sv, tv)) return true;
  }
  return false;
}

function initialChoice(key, savedRow, proposedRecord, tertiaryRecord) {
  const sv = savedRow?.[key] ?? '00:00:00';
  const pv = proposedRecord?.[key] ?? '00:00:00';
  const tv = tertiaryRecord?.[key];
  return defaultMergeChoice(sv, pv, tv);
}

const timeSx = {
  fontFamily: 'Consolas, "Courier New", monospace',
  fontWeight: 700,
  fontSize: '0.9rem',
  lineHeight: 1.2,
};

/**
 * @param {'duplicate'|'earnings'} [mode]
 * @param {string} [currentModuleType]
 */
export default function OverallAttendanceCompareModal({
  open,
  onClose,
  onConfirm,
  savedRow,
  proposedRecord,
  fields,
  tertiaryRecord = null,
  mode: modeProp,
  currentModuleType = null,
  title: titleProp,
}) {
  const [choices, setChoices] = useState({});
  const [bulkChoice, setBulkChoice] = useState(null);
  const [hasChosen, setHasChosen] = useState(false);
  const [onlyDiffs, setOnlyDiffs] = useState(true);

  const hasTertiary = tertiaryRecord && Object.keys(tertiaryRecord).length > 0;
  const isDuplicate = modeProp === 'duplicate' || (!modeProp && !hasTertiary);
  const mode = isDuplicate ? 'duplicate' : 'earnings';
  const copy = COPY[mode];
  const colCount = hasTertiary ? 4 : 3;
  const saveUnlocked = isDuplicate ? bulkChoice != null : hasChosen;

  const periodLabel = formatPeriod(savedRow);
  const employeeLabel = savedRow?.personID ? String(savedRow.personID) : null;
  const savedModuleName = moduleDisplayName(savedRow?.computation_module_type);
  const currentModuleName = moduleDisplayName(
    currentModuleType || proposedRecord?.computation_module_type,
  );

  useEffect(() => {
    if (!open || !savedRow || !proposedRecord || !fields?.length) return;
    const next = {};
    fields.forEach(({ key }) => {
      next[key] = isDuplicate ? 'saved' : initialChoice(key, savedRow, proposedRecord, tertiaryRecord);
    });
    setChoices(next);
    setBulkChoice(null);
    setHasChosen(false);
    setOnlyDiffs(true);
  }, [open, savedRow, proposedRecord, tertiaryRecord, fields, isDuplicate]);

  const diffCount = useMemo(() => {
    if (!fields?.length) return 0;
    return fields.filter(({ key }) =>
      fieldHasDiff(key, savedRow, proposedRecord, tertiaryRecord, hasTertiary),
    ).length;
  }, [fields, savedRow, proposedRecord, tertiaryRecord, hasTertiary]);

  const visibleFields = useMemo(() => {
    if (!fields?.length) return [];
    if (!onlyDiffs) return fields;
    return fields.filter(({ key }) =>
      fieldHasDiff(key, savedRow, proposedRecord, tertiaryRecord, hasTertiary),
    );
  }, [fields, onlyDiffs, savedRow, proposedRecord, tertiaryRecord, hasTertiary]);

  const groupedRows = useMemo(() => {
    const groups = new Map();
    visibleFields.forEach((field) => {
      const { group, metric } = parseFieldLabel(field.label);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ ...field, metric });
    });
    return Array.from(groups.entries());
  }, [visibleFields]);

  const allChoicesSaved = !isDuplicate && fields.length > 0 && fields.every(({ key }) => choices[key] === 'saved');
  const allChoicesProposed = !isDuplicate && fields.length > 0 && fields.every(({ key }) => choices[key] === 'proposed');
  const allChoicesTertiary = hasTertiary && !isDuplicate && fields.length > 0 && fields.every(({ key }) => choices[key] === 'tertiary');

  const handleConfirm = () => {
    if (!saveUnlocked) return;
    const finalChoices = isDuplicate
      ? Object.fromEntries(fields.map(({ key }) => [key, bulkChoice]))
      : choices;
    onConfirm(finalChoices);
  };

  const applyBulkPreset = (which) => {
    if (isDuplicate) {
      setBulkChoice(which);
      return;
    }
    const next = {};
    fields.forEach(({ key }) => { next[key] = which; });
    setChoices(next);
    setHasChosen(true);
  };

  if (!fields?.length) return null;

  const dialogTitle = titleProp || copy.title;
  const savedColTitle = isDuplicate ? `Summary (${savedModuleName})` : 'Current summary';
  const proposedColTitle = isDuplicate ? `This module (${currentModuleName})` : 'Your edit';

  const footerMessage = isDuplicate
    ? (bulkChoice == null
      ? copy.footerIdle
      : bulkChoice === 'saved'
        ? copy.footerKept
        : copy.footerOverwrite)
    : (allChoicesProposed ? copy.footerOverwrite : copy.footerKept);

  const HeaderIcon = isDuplicate ? WarningAmberOutlinedIcon : EditNoteOutlinedIcon;

  const choiceBtnSx = {
    fontSize: '0.85rem',
    py: 1.15,
    px: 3,
    minHeight: 44,
    flex: 1,
    textTransform: 'none',
    fontWeight: 700,
    fontFamily: T.poppins,
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  };

  const choiceBtnOutlined = {
    ...choiceBtnSx,
    borderWidth: 2,
    borderColor: alpha(T.accent, 0.35),
    color: T.accent,
    bgcolor: '#fff',
    '&:hover': { bgcolor: T.blush, borderColor: T.accent },
  };

  const choiceBtnActive = {
    ...choiceBtnSx,
    bgcolor: T.accent,
    color: '#fff',
    border: `2px solid ${T.accent}`,
    boxShadow: `0 4px 14px ${alpha(T.accent, 0.32)}`,
    '&:hover': { bgcolor: T.accentDark },
  };

  const ReadOnlyValueCell = ({ value, highlight }) => (
    <TableCell
      align="center"
      sx={{
        py: 1.25,
        px: 1.5,
        borderBottom: `1px solid ${T.divider}`,
        bgcolor: highlight ? alpha(T.accent, 0.1) : 'transparent',
        boxShadow: highlight ? `inset 0 0 0 2px ${T.accent}` : 'none',
      }}
    >
      <Typography sx={{ ...timeSx, color: highlight ? T.accentDark : T.text }}>
        {value ?? '—'}
      </Typography>
    </TableCell>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: 'min(90vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          fontFamily: T.poppins,
          border: `1px solid ${T.divider}`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ px: 2.5, py: 2, flexShrink: 0, borderBottom: `1px solid ${T.divider}`, bgcolor: T.surface }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '10px', bgcolor: T.blushDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HeaderIcon sx={{ color: T.accent, fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: T.text, lineHeight: 1.3, fontFamily: T.poppins }}>
                {dialogTitle}
              </Typography>
              {isDuplicate ? (
                <Typography sx={{ fontSize: '0.8rem', color: T.muted, mt: 0.5, lineHeight: 1.5, fontFamily: T.poppins }}>
                  {periodLabel}
                  {employeeLabel ? ` · Employee ${employeeLabel}` : ''}
                  {' · '}
                  <strong>{diffCount} conflict{diffCount === 1 ? '' : 's'}</strong>
                </Typography>
              ) : (
                <Typography sx={{ fontSize: '0.8rem', color: T.muted, mt: 0.5, fontFamily: T.poppins }}>
                  {diffCount} changed field{diffCount === 1 ? '' : 's'}
                </Typography>
              )}
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose} sx={{ color: T.faint, '&:hover': { bgcolor: '#f3f4f6' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {isDuplicate ? (
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '8px', bgcolor: T.blush, border: `1px solid ${alpha(T.accent, 0.18)}`, borderLeft: `4px solid ${T.accent}` }}>
            <Typography sx={{ fontSize: '0.8rem', color: T.muted, lineHeight: 1.55, fontFamily: T.poppins }}>
              Attendance Summary already has totals for this period, saved from{' '}
              <strong style={{ color: T.accent }}>{savedModuleName}</strong>. You are saving from{' '}
              <strong style={{ color: T.accent }}>{currentModuleName}</strong>.
              {' '}Choose one option below — the table is for review only.
            </Typography>
          </Box>
        ) : null}

        <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'flex-end' }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={onlyDiffs}
                onChange={(e) => setOnlyDiffs(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: T.accent },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: alpha(T.accent, 0.4) },
                }}
              />
            }
            label={<Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.poppins }}>{copy.showDiffsOnly}</Typography>}
            sx={{ m: 0 }}
          />
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: T.surface }}>
          {visibleFields.length === 0 ? (
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.85rem', color: T.muted, fontFamily: T.poppins }}>
                No conflicting fields. Turn off &ldquo;{copy.showDiffsOnly}&rdquo; to review all fields.
              </Typography>
            </Box>
          ) : (
            <>
              {isDuplicate ? (
                <Box sx={{ px: 2.5, py: 1, bgcolor: '#f3f4f6', borderBottom: `1px solid ${T.divider}` }}>
                  <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontFamily: T.poppins, textAlign: 'center' }}>
                    {copy.compareHint}
                  </Typography>
                </Box>
              ) : null}
              <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-head': { bgcolor: `${T.accent} !important`, color: '#fff !important' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...thCellSx, width: hasTertiary ? '34%' : '40%', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff !important', fontFamily: T.poppins }}>
                      Field
                    </TableCell>
                    <TableCell align="center" sx={{ ...thCellSx, width: hasTertiary ? '22%' : '30%' }}>
                      <Typography sx={thTitleSx}>{savedColTitle}</Typography>
                      <Typography sx={thHintSx}>Already in Summary</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ ...thCellSx, width: hasTertiary ? '22%' : '30%' }}>
                      <Typography sx={thTitleSx}>{proposedColTitle}</Typography>
                      <Typography sx={thHintSx}>From this module</Typography>
                    </TableCell>
                    {hasTertiary ? (
                      <TableCell align="center" sx={{ ...thCellSx, width: '22%' }}>
                        <Typography sx={thTitleSx}>Suggested</Typography>
                        <Typography sx={thHintSx}>From records</Typography>
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedRows.map(([groupName, rows], groupIdx) => (
                    <Fragment key={groupName}>
                      <TableRow>
                        <TableCell colSpan={colCount} sx={{ py: 0.75, px: 2, bgcolor: '#f3f4f6', borderBottom: `1px solid ${T.divider}`, borderTop: groupIdx > 0 ? `1px solid ${T.divider}` : 'none' }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, fontFamily: T.poppins }}>
                            {groupName}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {rows.map(({ key, metric }) => {
                        const sv = savedRow?.[key] ?? '—';
                        const pv = proposedRecord?.[key] ?? '—';
                        const tv = hasTertiary ? (tertiaryRecord[key] ?? '—') : null;
                        const isConflict = fieldHasDiff(key, savedRow, proposedRecord, tertiaryRecord, hasTertiary);
                        const highlightSaved = isDuplicate && bulkChoice === 'saved';
                        const highlightProposed = isDuplicate && bulkChoice === 'proposed';

                        return (
                          <TableRow
                            key={key}
                            sx={{
                              bgcolor: isConflict ? T.conflictBg : T.surface,
                              borderLeft: isConflict ? `4px solid ${T.conflictBorder}` : '4px solid transparent',
                            }}
                          >
                            <TableCell sx={{ py: 1, px: 2, borderBottom: `1px solid ${T.divider}` }}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text, fontFamily: T.poppins, textTransform: 'capitalize' }}>
                                  {metric}
                                </Typography>
                                {isConflict ? (
                                  <Chip label="Conflict" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: T.conflictBgStrong, color: T.accent, border: `1px solid ${alpha(T.accent, 0.25)}`, fontFamily: T.poppins }} />
                                ) : null}
                              </Stack>
                            </TableCell>
                            <ReadOnlyValueCell value={sv} highlight={highlightSaved} />
                            <ReadOnlyValueCell value={pv} highlight={highlightProposed} />
                            {hasTertiary ? <ReadOnlyValueCell value={tv} highlight={false} /> : null}
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Box>

        <Box sx={{ flexShrink: 0, px: 2.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: bulkChoice === 'proposed' ? T.blush : '#f9fafb' }}>
          <Typography sx={{ fontSize: '0.78rem', color: bulkChoice === 'proposed' ? T.accentDark : T.muted, fontFamily: T.poppins, mb: 1.5, fontWeight: bulkChoice ? 600 : 500, lineHeight: 1.45, textAlign: 'center' }}>
            {footerMessage}
          </Typography>

          {isDuplicate ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 1.75, maxWidth: 640, mx: 'auto' }}>
              <Button variant="outlined" onClick={() => applyBulkPreset('saved')} sx={bulkChoice === 'saved' ? choiceBtnActive : choiceBtnOutlined}>
                {copy.keepAllSaved}
              </Button>
              <Button variant="outlined" onClick={() => applyBulkPreset('proposed')} sx={bulkChoice === 'proposed' ? choiceBtnActive : choiceBtnOutlined}>
                {copy.useAllProposed}
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ mb: 1.75 }}>
              <Button variant="outlined" onClick={() => applyBulkPreset('saved')} sx={allChoicesSaved ? choiceBtnActive : choiceBtnOutlined}>{copy.keepAllSaved}</Button>
              <Button variant="outlined" onClick={() => applyBulkPreset('proposed')} sx={allChoicesProposed ? choiceBtnActive : choiceBtnOutlined}>{copy.useAllProposed}</Button>
              {hasTertiary ? (
                <Button variant="outlined" onClick={() => applyBulkPreset('tertiary')} sx={allChoicesTertiary ? choiceBtnActive : choiceBtnOutlined}>{copy.useAllTertiary}</Button>
              ) : null}
            </Stack>
          )}

          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ ...choiceBtnOutlined, flex: 'none', minWidth: 120, px: 2.5 }}
            >
              {copy.goBack}
            </Button>
            <Tooltip title={saveUnlocked ? '' : copy.unlockTooltip} placement="top">
              <span>
                <Button
                  variant="contained"
                  disabled={!saveUnlocked}
                  onClick={handleConfirm}
                  sx={{
                    ...choiceBtnActive,
                    flex: 'none',
                    minWidth: 160,
                    px: 2.5,
                    '&.Mui-disabled': { bgcolor: alpha(T.accent, 0.35), color: '#fff', boxShadow: 'none' },
                  }}
                >
                  {copy.confirm}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
