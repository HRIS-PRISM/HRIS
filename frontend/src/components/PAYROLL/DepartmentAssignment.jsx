import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Box, Grid, Modal, IconButton, CircularProgress, Snackbar, Alert,
  Paper, ToggleButton, ToggleButtonGroup, List, ListItem, Card,
  Typography, Fade, Avatar, Tooltip, Button, TextField, Chip, Checkbox, MenuItem, Pagination,
  Radio, RadioGroup, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon, Close,
  Search as SearchIcon, ViewList as ViewListIcon, ViewModule as ViewModuleIcon,
  Domain as DomainIcon, Person as PersonIcon,
  ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
  Refresh, People as PeopleIcon, ArrowBack as ArrowBackIcon,
  Reorder, Category as CategoryIcon, InfoOutlined as InfoOutlinedIcon,
  CheckBox as CheckBoxIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckCircle as CheckCircleIcon, ErrorOutline as ErrorOutlineIcon, HelpOutline as HelpOutlineIcon,
  Check as CheckIcon, Remove as RemoveIcon, Badge as BadgeIcon,
} from '@mui/icons-material';

import AccessDenied from '../AccessDenied';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import usePageAccess from '../../hooks/usePageAccess';
import DuplicateAssignmentsWarning from './DuplicateAssignmentsWarning';
import { styled, alpha } from '@mui/material/styles';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';
import { sortEmployeesByLastName } from '../../utils/sortEmployeesByLastName';

// ── Design tokens ─────────────────────────────────────────────
// Same maroon identity as before, with a calmer neutral scale around it so the
// accent is reserved for actions, selection and hierarchy.
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentDeep:   '#3f1414',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.045)',
  accentSoft:   'rgba(109,35,35,0.08)',
  accentBorder: 'rgba(109,35,35,0.16)',
  accentHover:  'rgba(109,35,35,0.09)',
  headerGrad:   'linear-gradient(135deg,#5a1d1d 0%,#6d2323 55%,#7a2c2c 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.02)',
  rowHover:     'rgba(109,35,35,0.05)',
  text:         '#1f1a1a',
  muted:        '#6b6262',
  faint:        '#a39a9a',
  surface:      '#ffffff',
  divider:      'rgba(60,30,30,0.08)',
  hairline:     'rgba(60,30,30,0.06)',
  canvas:       '#faf7f7',
  canvasDeep:   '#f4eeee',
  gold:         '#8a6100',
  goldBg:       'rgba(184,134,11,0.09)',
  goldBorder:   'rgba(184,134,11,0.28)',
  warn:         '#b45309',
  warnBg:       'rgba(180,83,9,0.08)',
  warnBorder:   'rgba(180,83,9,0.28)',
  ok:           '#2e7d32',
  okBg:         'rgba(46,125,50,0.08)',
  okBorder:     'rgba(46,125,50,0.28)',
  danger:       '#c62828',
  ring:         '0 0 0 3px rgba(109,35,35,0.14)',
  lift:         '0 1px 2px rgba(60,20,20,0.05), 0 12px 32px -8px rgba(60,20,20,0.10)',
  soft:         '0 1px 2px rgba(60,20,20,0.05)',
  pop:          '0 4px 6px -2px rgba(60,20,20,0.06), 0 16px 40px -8px rgba(60,20,20,0.18)',
};

// Radius scale: containers > controls > small elements
const R = { panel: 3, control: 1.25, item: 1.75, tag: 1 };

const pageWrapSx = {
  py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
  width: '100vw', maxWidth: '100%',
  position: 'relative', left: '63%', transform: 'translateX(-61%)',
  px: { xs: 2, sm: 3, md: 6 },
};

const panelHeight = 'calc(100vh - 280px)';

// ── Shimmer wireframe ─────────────────────────────────────────
const shimmerKeyframes = `
@keyframes daShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes daPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg, rgba(109,35,35,0.06) 25%, rgba(109,35,35,0.13) 50%, rgba(109,35,35,0.06) 75%)`,
    backgroundSize: '800px 100%',
    animation: 'daShimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

const wireCardSx = {
  borderRadius: R.panel, border: `1px solid ${T.divider}`, bgcolor: '#fff',
  boxShadow: T.soft, animation: 'daPulse 2s ease-in-out infinite',
};

const DeptWireframe = () => (
  <>
    <style>{shimmerKeyframes}</style>
    <Box sx={pageWrapSx}>
      {/* Header bone */}
      <Box sx={{ ...wireCardSx, mb: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.12)', flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Bone w={260} h={18} sx={{ mb: 1 }} />
            <Bone w={380} h={11} />
          </Box>
          <Bone w={110} h={34} r={8} />
          <Bone w={38} h={38} r={8} />
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Left — assign form */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ ...wireCardSx, height: panelHeight, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 1.75, borderBottom: `1px solid ${T.divider}`, bgcolor: T.canvas, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Bone w={28} h={28} r={8} />
              <Bone w={160} h={12} />
            </Box>
            <Box sx={{ px: 3, pt: 2.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Bone w={120} h={10} sx={{ mb: 0.75 }} />
                <Box sx={{ height: 38, borderRadius: R.control, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Bone w={80} h={10} />
                  <Bone w={60} h={26} r={8} />
                </Box>
                <Box sx={{ height: 38, borderRadius: R.control, border: `1px solid ${T.accentBorder}`, bgcolor: '#fafafa' }} />
              </Box>
            </Box>
            <Box sx={{ px: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75, overflow: 'hidden', pb: 2 }}>
              {[...Array(6)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.25, py: 0.85, borderRadius: R.item, border: `1px solid ${T.hairline}`, bgcolor: '#fafafa' }}>
                  <Bone w={18} h={18} r={3} />
                  <Bone w={28} h={28} r="50%" />
                  <Box sx={{ flex: 1 }}>
                    <Bone w={`${55 + (i % 3) * 15}%`} h={10} sx={{ mb: 0.5 }} />
                    <Bone w="35%" h={8} />
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${T.divider}`, bgcolor: T.canvas }}>
              <Box sx={{ height: 40, borderRadius: R.control, bgcolor: 'rgba(109,35,35,0.20)' }} />
            </Box>
          </Box>
        </Grid>

        {/* Right — records */}
        <Grid item xs={12} lg={7}>
          <Box sx={{ ...wireCardSx, height: panelHeight, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.canvas }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Bone w={28} h={28} r={8} />
                  <Bone w={160} h={14} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Bone w={70} h={24} r={12} />
                  <Bone w={64} h={28} r={6} />
                </Box>
              </Box>
              <Box sx={{ height: 38, borderRadius: R.control, border: `1px solid ${T.accentBorder}`, bgcolor: '#fff' }} />
            </Box>
            <Box sx={{ flex: 1, p: 2, overflow: 'hidden' }}>
              <Grid container spacing={1.5}>
                {[...Array(10)].map((_, i) => (
                  <Grid item xs={6} sm={4} md={2.4} key={i}>
                    <Box sx={{ p: '14px 16px 14px 18px', borderRadius: R.item, border: `1px solid ${T.hairline}`, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                          <Bone w={`${50 + (i % 4) * 10}%`} h={12} sx={{ mb: 0.5 }} />
                          <Bone w="65%" h={8} />
                        </Box>
                        <Bone w={28} h={28} r={8} />
                      </Box>
                      <Bone w="40%" h={14} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

const SectionCard = styled(Card)({
  borderRadius: 16,
  boxShadow: T.lift,
  border: `1px solid ${T.divider}`,
  overflow: 'hidden',
  background: T.surface,
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 10,
    fontSize: '0.855rem',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accentMid },
    '&.Mui-focused': { boxShadow: T.ring },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
    '&.Mui-error fieldset': { borderColor: T.danger },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
  '& .MuiFormHelperText-root': { marginLeft: 2, fontSize: '0.7rem', lineHeight: 1.4 },
});

const AccentButton = styled(Button)({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.855rem',
  letterSpacing: '0.005em',
  boxShadow: 'none',
  transition: 'background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, color 0.15s ease',
  '&:hover': { boxShadow: 'none' },
  '&:focus-visible': { boxShadow: T.ring },
});

const scrollbarSx = {
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(109,35,35,0.22)', borderRadius: 3 },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(109,35,35,0.4)' },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
};

const dropdownSx = (maxHeight = 220) => ({
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1400, maxHeight, overflow: 'auto',
  mt: 0.75, borderRadius: 2, border: `1px solid ${T.accentBorder}`, boxShadow: T.pop, bgcolor: '#fff',
  ...scrollbarSx,
});

/** Dropdown-style fields (department code, budget target) show a pointer, like a select. */
const dropdownFieldSx = {
  '& .MuiOutlinedInput-root, & .MuiOutlinedInput-input': { cursor: 'pointer' },
  '& .Mui-disabled, & .Mui-disabled .MuiOutlinedInput-input': { cursor: 'default' },
};

const optionItemSx = {
  py: 0.9, px: 1.5, cursor: 'pointer',
  borderBottom: `1px solid ${T.hairline}`,
  '&:last-of-type': { borderBottom: 'none' },
  '&:hover': { bgcolor: T.accentFaint },
};

const sortByLastName = (arr) => sortEmployeesByLastName(arr, (a) => a.name || a);

// ── Small shared building blocks ──────────────────────────────

/** Rounded square icon tile used in panel headers and cards. */
const IconTile = ({ children, size = 30, tone = 'accent', sx = {} }) => (
  <Box sx={{
    width: size, height: size, borderRadius: 1.5, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    bgcolor: tone === 'gold' ? T.goldBg : T.accentSoft,
    color: tone === 'gold' ? T.gold : T.accent,
    ...sx,
  }}>
    {children}
  </Box>
);

/** Panel header bar shared by both main panels. */
const PanelHeader = ({ icon, title, hint, children, sx = {} }) => (
  <Box sx={{
    px: 3, py: 1.75, borderBottom: `1px solid ${T.divider}`, bgcolor: T.canvas, flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: 1.5, ...sx,
  }}>
    <IconTile size={30}>{icon}</IconTile>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{title}</Typography>
      {hint && <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.2 }}>{hint}</Typography>}
    </Box>
    {children && <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>}
  </Box>
);

/** Numbered field label — the form is a real sequence (employee → department → budget). */
const StepLabel = ({ n, children, required = false, action = null }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.85 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{
        width: 20, height: 20, borderRadius: '50%', bgcolor: T.accent, color: '#fff',
        fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>{n}</Box>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.text }}>
        {children}{required && <Box component="span" sx={{ color: T.danger, ml: 0.4 }}>*</Box>}
      </Typography>
    </Box>
    {action}
  </Box>
);

/** Field label used in the detail view. */
const FieldLabel = ({ children }) => (
  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.muted, mb: 1 }}>{children}</Typography>
);

/** Person chip card used after choosing an employee. */
const EmployeeCard = ({ name, number, trailing = null, size = 34 }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.5, p: '10px 12px',
    borderRadius: R.item, border: `1px solid ${T.accentBorder}`,
    borderLeft: `3px solid ${T.accent}`, bgcolor: T.accentFaint,
  }}>
    <Avatar sx={{ width: size, height: size, bgcolor: T.accent, color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: '0.84rem', fontWeight: 700, color: T.text }}>{name}</Typography>
      <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>#{number}</Typography>
    </Box>
    {trailing}
  </Box>
);

// ── Budget target kinds (payroll charge) ──────────────────────
// The Appendix 33 layout carries two axes of tabs, so the budget target — the tab
// an employee's pay is charged to — can point at either one: a department, or an
// employment category. Both are chosen from that layout's allow-list.
const BUDGET_TARGET_DEPARTMENT = 'department';
const BUDGET_TARGET_CATEGORY = 'employment_category';

const budgetTargetKind = (kind) => (
  String(kind || '').trim().toLowerCase() === BUDGET_TARGET_CATEGORY
    ? BUDGET_TARGET_CATEGORY
    : BUDGET_TARGET_DEPARTMENT
);

const isCategoryTarget = (kind) => budgetTargetKind(kind) === BUDGET_TARGET_CATEGORY;

const budgetTargetNoun = (kind) => (isCategoryTarget(kind) ? 'employment category' : 'department');

/** Short tag for compact chips, e.g. "Budget (Dept): CEN" or "Budget (Category): Non-Teaching". */
const budgetChipLabel = (code, kind) => (
  isCategoryTarget(kind) ? `Budget (Category): ${code}` : `Budget (Dept): ${code}`
);

/** Configured colour value (Employment Category's colorHex) — hex only, else the accent. */
const hexColor = (value, fallback = '#6d2323') => {
  const v = String(value || '').trim();
  return /^#[0-9A-Fa-f]{3,8}$/.test(v) ? v : fallback;
};

/** Appendix 33 layout keys are type names, so strip the "Group | " prefix of a stored label. */
const categoryMatchKey = (value) => {
  const v = String(value || '').trim().toUpperCase();
  const sep = v.indexOf('|');
  return sep > -1 ? v.slice(sep + 1).trim() : v;
};

/**
 * Budget filter key = the Appendix 33 tab a budget lands in. Category targets are
 * matched by type name only (as the export does), so every group's "Tempo" shares
 * one key; department targets are keyed by code.
 */
const budgetFilterKey = (code, kind) => (
  isCategoryTarget(kind) ? `cat:${categoryMatchKey(code)}` : `dept:${String(code || '').trim().toUpperCase()}`
);

/** Sentinel for "the value is empty" in the records filter dropdowns. */
const NO_FILTER = '__none__';

const goldChipSx = {
  height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: T.goldBg, color: T.gold,
  border: `1px solid ${T.goldBorder}`, borderRadius: R.tag, '& .MuiChip-label': { px: 0.9 },
};

// ── Setup status (is the department code / budget target filled in?) ──
const SETUP_COMPLETE = 'complete';
const SETUP_DEPT_ONLY = 'dept_only';
const SETUP_BUDGET_ONLY = 'budget_only';
const SETUP_NONE = 'none';
const SETUP_INCOMPLETE = 'incomplete'; // filter-only: anything but complete

const setupStatusOf = (code, budgetCode) => {
  const d = Boolean(String(code || '').trim());
  const b = Boolean(String(budgetCode || '').trim());
  if (d && b) return SETUP_COMPLETE;
  if (d) return SETUP_DEPT_ONLY;
  if (b) return SETUP_BUDGET_ONLY;
  return SETUP_NONE;
};

const setupTone = (status) => (
  status === SETUP_COMPLETE ? T.ok : status === SETUP_NONE ? T.faint : T.warn
);

/** One "is it set?" flag — a pill (or a lettered dot when compact). */
const SetFlag = ({ on, label, letter, compact = false }) => (
  <Tooltip title={`${label} ${on ? 'set' : 'not set'}`}>
    {compact ? (
      <Box sx={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.58rem', fontWeight: 800, fontFamily: (theme) => theme.typography.fontFamily,
        bgcolor: on ? T.okBg : 'transparent',
        color: on ? T.ok : T.faint,
        border: `1px ${on ? 'solid' : 'dashed'} ${on ? T.okBorder : T.faint}`,
      }}>{letter}</Box>
    ) : (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.75, height: 20, borderRadius: R.tag, flexShrink: 0, fontFamily: (theme) => theme.typography.fontFamily,
        fontSize: '0.64rem', fontWeight: 700,
        bgcolor: on ? T.okBg : 'transparent',
        color: on ? T.ok : T.faint,
        border: `1px ${on ? 'solid' : 'dashed'} ${on ? T.okBorder : 'rgba(0,0,0,0.18)'}`,
      }}>
        {on ? <CheckIcon sx={{ fontSize: 11 }} /> : <RemoveIcon sx={{ fontSize: 11 }} />}
        {label}
      </Box>
    )}
  </Tooltip>
);

/** Department-code + budget-target flags for one employee. */
const SetupFlags = ({ code, budgetCode, compact = false }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
    <SetFlag on={Boolean(String(code || '').trim())} label="Department" letter="D" compact={compact} />
    <SetFlag on={Boolean(String(budgetCode || '').trim())} label="Budget" letter="B" compact={compact} />
  </Box>
);

// ── Appendix 33 export indicator ──────────────────────────────
// status: 'allowed' | 'blocked' | 'unknown' | 'nobudget' (no Budget Department set,
// so the employee is left out of the export) | null (nothing to show)
const APPENDIX33_BADGE = {
  allowed: { color: T.ok, bg: T.okBg, border: T.okBorder, Icon: CheckCircleIcon, label: 'Appendix 33' },
  blocked: { color: T.warn, bg: T.warnBg, border: T.warnBorder, Icon: ErrorOutlineIcon, label: 'Not in Appendix 33' },
  nobudget: { color: T.muted, bg: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.12)', Icon: RemoveIcon, label: 'Not exported' },
  unknown: { color: T.faint, bg: 'transparent', border: T.divider, Icon: HelpOutlineIcon, label: 'Appendix 33 ?' },
};

const appendix33Tip = (status) => {
  if (status === 'allowed') return 'This budget is allowed in the Appendix 33 payroll layout, so the export charges this tab.';
  if (status === 'blocked') return 'This budget is not enabled in the Appendix 33 payroll layout, so the export has no tab to charge it to until it is allowed there.';
  if (status === 'nobudget') return 'No Budget Department set — this employee is left out of the Appendix 33 export until one is set.';
  return 'The Appendix 33 layout has not loaded yet.';
};

const Appendix33Badge = ({ status, compact = false }) => {
  const cfg = status && APPENDIX33_BADGE[status];
  if (!cfg) return null;
  const { Icon } = cfg;
  return (
    <Tooltip title={appendix33Tip(status)}>
      {compact ? (
        <Icon sx={{ fontSize: 16, color: cfg.color, flexShrink: 0 }} />
      ) : (
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.8, height: 22, borderRadius: R.tag, flexShrink: 0, fontFamily: (theme) => theme.typography.fontFamily,
          fontSize: '0.66rem', fontWeight: 700, whiteSpace: 'nowrap',
          color: cfg.color, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`,
        }}>
          <Icon sx={{ fontSize: 12 }} />
          {cfg.label}
        </Box>
      )}
    </Tooltip>
  );
};

/**
 * Sentence under a budget field saying whether the employee will be in the
 * Appendix 33 export. A blocked budget target is already explained by the field's
 * own warning, so only the allowed / no-budget cases speak here.
 */
const Appendix33Note = ({ status, target, noun }) => {
  if (!status || status === 'unknown' || status === 'blocked') return null;
  const allowed = status === 'allowed';
  const text = allowed
    ? `“${target}” is allowed in the Appendix 33 payroll — the export charges this ${noun}.`
    : 'No Budget Department yet — this employee will be left out of the Appendix 33 export until one is set.';
  const Icon = allowed ? CheckCircleIcon : ErrorOutlineIcon;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6, mt: 0.75, ml: 0.5 }}>
      <Icon sx={{ fontSize: 14, mt: '1px', color: allowed ? T.ok : T.warn, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.7rem', color: allowed ? T.ok : T.warn, lineHeight: 1.45 }}>{text}</Typography>
    </Box>
  );
};

// ── Dept Code Autocomplete ────────────────────────────────────
const DeptCodeAutocomplete = ({ value, onChange, departmentList = [], placeholder = 'Type or select department code…', disabled = false }) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = departmentList.filter(
    (d) => d.code.toLowerCase().includes(query.toLowerCase()) || (d.description || '').toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={ref}>
      <FieldInput value={query} onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder={placeholder} disabled={disabled} fullWidth autoComplete="off" size="small" sx={dropdownFieldSx}
        InputProps={{
          startAdornment: <DomainIcon sx={{ color: T.muted, mr: 1, fontSize: 16 }} />,
          endAdornment: <IconButton size="small" sx={{ color: T.muted }} onClick={() => setOpen((p) => !p)} disabled={disabled}>{open ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}</IconButton>,
        }} />
      {open && !disabled && (
        <Paper elevation={0} sx={dropdownSx(220)}>
          {filtered.length > 0 ? (
            <List dense disablePadding>
              {filtered.map((dept) => (
                <ListItem key={dept.code} button onClick={() => { setQuery(dept.code); onChange(dept.code); setOpen(false); }} sx={optionItemSx}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <IconTile size={24} sx={{ borderRadius: 1 }}><DomainIcon sx={{ fontSize: 14 }} /></IconTile>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{dept.code}</Typography>
                      {dept.description && <Typography sx={{ fontSize: '0.7rem', color: T.muted }} noWrap>{dept.description}</Typography>}
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: T.faint }}>
                {query ? `No match for "${query}" — you can still use it` : 'No department codes found'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Budget Target Autocomplete (Appendix 33 allow-list only) ──
// The payroll charge can point at either axis of the Appendix 33 layout, so the
// options are the allow-listed values of the selected kind: departments come from
// that layout, employment categories from the Employment Category set-up. A
// manually typed value is displayed long enough to explain the problem, but cannot
// be saved until it is corrected.
const BudgetTargetAutocomplete = ({
  value,
  onChange,
  kind = BUDGET_TARGET_DEPARTMENT,
  options = [],
  scopesLoaded = false,
  scopesLoading = false,
  scopesError = '',
  placeholder = '',
  disabled = false,
}) => {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const targetKind = budgetTargetKind(kind);
  const category = isCategoryTarget(targetKind);

  useEffect(() => { setQuery(value || ''); }, [value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = query.toLowerCase();
  const filtered = options.filter(
    (d) => String(d.code || '').toLowerCase().includes(q)
      || String(d.label || '').toLowerCase().includes(q)
      || String(d.description || '').toLowerCase().includes(q),
  );
  const trimmedValue = String(value || '').trim();
  // Options shown only for information (selectable: false) never validate
  const allowedSet = new Set(
    options.filter((d) => d.selectable !== false)
      .map((d) => String(d.code || '').trim().toUpperCase()).filter(Boolean),
  );
  // Alternate accepted shapes (e.g. a bare employment type name saved earlier)
  const altSet = new Set(
    options.map((d) => (d.altKey ? String(d.altKey).trim().toUpperCase() : '')).filter(Boolean),
  );
  const isAllowedSelection = !trimmedValue
    || allowedSet.has(trimmedValue.toUpperCase())
    || altSet.has(trimmedValue.toUpperCase());
  const validationError = scopesLoaded && !isAllowedSelection
    ? (category
      ? `"${trimmedValue}" is not configured in Employment Category.`
      : `"${trimmedValue}" is not enabled in the Appendix 33 layout's department tab.`)
    : (scopesError && trimmedValue ? scopesError : '');

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={ref}>
      <FieldInput
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        autoComplete="off"
        size="small"
        sx={dropdownFieldSx}
        error={Boolean(validationError)}
        helperText={validationError}
        InputProps={{
          startAdornment: category
            ? <CategoryIcon sx={{ color: T.muted, mr: 1, fontSize: 16 }} />
            : <DomainIcon sx={{ color: T.muted, mr: 1, fontSize: 16 }} />,
          endAdornment: (
            <IconButton
              size="small"
              sx={{ color: trimmedValue ? T.danger : T.muted }}
              disabled={disabled || !trimmedValue}
              title={trimmedValue ? 'Clear budget override' : 'Open suggestions'}
              onClick={() => {
                if (trimmedValue) {
                  setQuery('');
                  onChange('');
                  setOpen(false);
                } else {
                  setOpen((p) => !p);
                }
              }}
            >
              {trimmedValue
                ? <Close sx={{ fontSize: 16 }} />
                : (open ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />)}
            </IconButton>
          ),
        }}
      />
      {open && !disabled && (
        <Paper elevation={0} sx={dropdownSx(220)}>
          {filtered.length > 0 ? (
            <List dense disablePadding>
              {filtered.map((dept) => (
                <ListItem
                  key={dept.code}
                  button
                  aria-disabled={dept.selectable === false}
                  onClick={() => {
                    if (dept.selectable === false) return; // shown for information only
                    setQuery(dept.code); onChange(dept.code); setOpen(false);
                  }}
                  sx={dept.selectable === false
                    ? { ...optionItemSx, cursor: 'not-allowed', opacity: 0.6, '&:hover': { bgcolor: 'transparent' } }
                    : optionItemSx}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, width: '100%' }}>
                    <IconTile size={24} tone="gold" sx={{ borderRadius: 1 }}>
                      {category ? <CategoryIcon sx={{ fontSize: 14 }} /> : <DomainIcon sx={{ fontSize: 14 }} />}
                    </IconTile>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                        {dept.colorHex && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: hexColor(dept.colorHex), flexShrink: 0 }} />}
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }} noWrap>{dept.label || dept.code}</Typography>
                      </Box>
                      {dept.description && <Typography sx={{ fontSize: '0.7rem', color: T.muted }} noWrap>{dept.description}</Typography>}
                    </Box>
                    {dept.appendix33 && <Box sx={{ ml: 'auto', pl: 1 }}><Appendix33Badge status={dept.appendix33} /></Box>}
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: T.faint }}>
                {scopesError
                  ? (category
                    ? `${scopesError} Refresh and try again.`
                    : 'Could not load the allowed departments from the Appendix 33 layout. Refresh and try again.')
                  : scopesLoading
                    ? (category ? 'Loading the Employment Category set-up…' : 'Loading allowed departments…')
                    : scopesLoaded
                      ? (query
                        ? (category
                          ? `No configured employment category matches "${query}"`
                          : `No allowed department matches "${query}"`)
                        : (category
                          ? 'No employment categories are configured in Employment Category'
                          : 'No departments are enabled in the Appendix 33 layout'))
                      : (category
                        ? 'Waiting for the Employment Category set-up…'
                        : 'Waiting for the Appendix 33 department configuration…')}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Budget Target Kind (radio buttons) ────────────────────────
// A plain choice of how the budget is assigned: by department tab or by
// employment-category tab. Switching kinds changes the option list below, so the
// caller clears the chosen value on change.
const BudgetKindToggle = ({ value, onChange, disabled = false }) => {
  const current = budgetTargetKind(value);
  const labelSx = { fontSize: '0.78rem', fontWeight: 600, color: T.text, cursor: disabled ? 'default' : 'pointer', userSelect: 'none' };
  const radioSx = { p: 0.5, color: T.accentBorder, '&.Mui-checked': { color: T.accent } };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
      <Typography sx={{ fontSize: '0.74rem', fontWeight: 600, color: T.muted }}>Assign by:</Typography>
      <RadioGroup
        row
        aria-label="Assign budget by"
        value={current}
        onChange={(e) => { if (e.target.value !== current) onChange(e.target.value); }}
        sx={{ gap: 1.5 }}
      >
        <FormControlLabel
          value={BUDGET_TARGET_DEPARTMENT}
          disabled={disabled}
          control={<Radio size="small" sx={radioSx} />}
          label="Department"
          sx={{ m: 0, cursor: disabled ? 'default' : 'pointer', '& .MuiFormControlLabel-label': labelSx }}
        />
        <FormControlLabel
          value={BUDGET_TARGET_CATEGORY}
          disabled={disabled}
          control={<Radio size="small" sx={radioSx} />}
          label="Employment Category"
          sx={{ m: 0, cursor: disabled ? 'default' : 'pointer', '& .MuiFormControlLabel-label': labelSx }}
        />
      </RadioGroup>
    </Box>
  );
};

/** Employee number followed by their employment category (colour dot + label). */
const EmpNumberLine = ({ number, category, fontSize = '0.72rem' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
    <Typography sx={{ fontSize, color: T.muted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>#{number}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
      <Box sx={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        bgcolor: category?.label ? hexColor(category.colorHex) : 'transparent',
        border: category?.label ? 'none' : `1px dashed ${T.faint}`,
      }} />
      <Typography noWrap sx={{ fontSize, color: category?.label ? T.text : T.faint, fontStyle: category?.label ? 'normal' : 'italic' }}>
        {category?.label || 'No employment category'}
      </Typography>
    </Box>
  </Box>
);

// ── Single Employee Autocomplete ──────────────────────────────
const SingleEmployeeAutocomplete = ({ value, onChange, selectedEmployee, onEmployeeSelect, placeholder = 'Search employee…', disabled = false, empCatLabels = {} }) => {
  const [query, setQuery]     = useState('');
  const [employees, setEmps]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debRef                = useRef(null);
  const ref                   = useRef(null);

  useEffect(() => { if (value && !selectedEmployee) fetchById(value); }, [value]); // eslint-disable-line
  useEffect(() => { if (selectedEmployee) setQuery(selectedEmployee.name || ''); else if (!value) setQuery(''); }, [selectedEmployee, value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const search    = async (q)   => { setLoading(true); try { const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search?sort=surname&q=${encodeURIComponent(q)}`, getAuthHeaders()); setEmps(r.data); } catch { setEmps([]); } finally { setLoading(false); } };
  const fetchAll  = async ()    => { setLoading(true); try { const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search?sort=surname`, getAuthHeaders()); setEmps(r.data); } catch { setEmps([]); } finally { setLoading(false); } };
  const fetchById = async (num) => { try { const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${num}`, getAuthHeaders()); onEmployeeSelect(r.data); setQuery(r.data.name || ''); } catch { /* silent */ } };

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={ref}>
      <FieldInput value={query}
        onChange={(e) => {
          const v = e.target.value; setQuery(v); setOpen(true);
          if (selectedEmployee && v !== selectedEmployee.name) { onEmployeeSelect(null); onChange(''); }
          clearTimeout(debRef.current);
          debRef.current = setTimeout(() => { if (v.trim().length >= 2) search(v); else if (!v.trim()) fetchAll(); else setEmps([]); }, 300);
        }}
        onFocus={() => { setOpen(true); if (!employees.length && !loading) { query.length >= 2 ? search(query) : fetchAll(); } }}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder={placeholder} disabled={disabled} fullWidth autoComplete="off" size="small"
        InputProps={{
          startAdornment: <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 16 }} />,
          endAdornment: <IconButton size="small" sx={{ color: T.muted }} onClick={() => { if (!open) { setOpen(true); if (!employees.length && !loading) fetchAll(); } else setOpen(false); }}>{open ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}</IconButton>,
        }} />
      {open && (
        <Paper elevation={0} sx={dropdownSx(260)}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, gap: 1 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} /><Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Loading…</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem key={emp.employeeNumber} button onClick={() => { onEmployeeSelect(emp); setQuery(emp.name); setOpen(false); onChange(emp.employeeNumber); }}
                  sx={{ ...optionItemSx, py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.72rem', bgcolor: T.accent, color: '#fff', fontWeight: 700 }}>{emp.name?.charAt(0)?.toUpperCase() || '?'}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>{emp.surnameFirst || emp.name}</Typography>
                      <EmpNumberLine number={emp.employeeNumber} category={empCatLabels[String(emp.employeeNumber ?? '').trim()]} />
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: T.faint }}>{query.length >= 2 ? `No employees found for "${query}"` : 'Type to search or scroll to browse'}</Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Dept Grid Card ────────────────────────────────────────────
const DeptCard = ({ department, onClick }) => (
  <Box
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    sx={{
      position: 'relative', p: '14px 16px 14px 18px', borderRadius: R.item, cursor: 'pointer',
      bgcolor: '#fff', border: `1px solid ${T.divider}`, boxShadow: T.soft,
      display: 'flex', flexDirection: 'column', gap: 1.25, overflow: 'hidden', outline: 'none',
      transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
      '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: alpha(T.accent, 0.22), transition: 'background-color 0.15s ease' },
      '&:hover': { bgcolor: T.accentFaint, borderColor: T.accentBorder, boxShadow: `0 6px 18px -6px ${alpha(T.accent, 0.22)}` },
      '&:hover::before': { bgcolor: T.accent },
      '&:focus-visible': { boxShadow: T.ring, borderColor: T.accent },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, color: T.text, lineHeight: 1.2, letterSpacing: '-0.005em' }} noWrap>{department.code}</Typography>
        {department.description && <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.3 }} noWrap>{department.description}</Typography>}
      </Box>
      <IconTile size={28}><DomainIcon sx={{ fontSize: 15 }} /></IconTile>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pt: 1, borderTop: `1px solid ${T.hairline}` }}>
      <PeopleIcon sx={{ fontSize: 14, color: T.faint }} />
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: T.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{department.employees.length}</Typography>
      <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>{department.employees.length === 1 ? 'employee' : 'employees'}</Typography>
    </Box>
  </Box>
);

// ── Dept List Row ─────────────────────────────────────────────
const DeptRow = ({ department, index, onClick }) => (
  <Box
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    sx={{
      px: 2, py: 1.25, display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center',
      borderRadius: R.control, cursor: 'pointer', bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd, outline: 'none',
      borderLeft: '3px solid transparent', transition: 'background-color 0.13s ease, border-color 0.13s ease',
      '&:hover': { bgcolor: T.rowHover, borderLeftColor: T.accent },
      '&:focus-visible': { boxShadow: T.ring, borderLeftColor: T.accent },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <IconTile size={26} sx={{ borderRadius: 1 }}><DomainIcon sx={{ fontSize: 14 }} /></IconTile>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: T.text }} noWrap>{department.code}</Typography>
        {department.description && <Typography sx={{ fontSize: '0.7rem', color: T.muted }} noWrap>{department.description}</Typography>}
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.25, borderRadius: R.tag, bgcolor: T.accentFaint }}>
      <PeopleIcon sx={{ fontSize: 13, color: T.faint }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: T.accent, fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'right' }}>
        {department.employees.length}
      </Typography>
    </Box>
  </Box>
);

// ── Modal Header ──────────────────────────────────────────────
const ModalHeader = ({ title, subtitle, chips = [], onBack, onClose }) => (
  <Box sx={{ px: 3.5, py: 2.25, background: T.headerGrad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ width: 42, height: 42, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', borderRadius: 2, border: '1px solid rgba(255,255,255,0.18)' }}>
        <DomainIcon sx={{ fontSize: 21 }} />
      </Avatar>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.02rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.005em' }}>{title}</Typography>
          {chips.map((c) => <Chip key={c} label={c} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, borderRadius: R.tag, border: '1px solid rgba(255,255,255,0.22)' }} />)}
        </Box>
        {subtitle && <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)', mt: 0.3 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {onBack && <IconButton onClick={onBack} size="small" sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}><ArrowBackIcon sx={{ fontSize: 18 }} /></IconButton>}
      <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}><Close sx={{ fontSize: 18 }} /></IconButton>
    </Box>
  </Box>
);

// ════════════════════════════════════════════════════════════
// ── Main Component
// ════════════════════════════════════════════════════════════
const DepartmentAssignment = () => {
  const { settings } = useSystemSettings();

  const [data, setData]                     = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);

  const [selectedCode, setSelectedCode]     = useState('');
  const [assignBudgetCode, setAssignBudgetCode] = useState('');
  // Kind of payroll charge target: 'department' or 'employment_category'
  const [assignBudgetType, setAssignBudgetType] = useState(BUDGET_TARGET_DEPARTMENT);
  const [appendix33DeptScopes, setAppendix33DeptScopes] = useState([]);
  const [appendix33EmpTypeScopes, setAppendix33EmpTypeScopes] = useState([]);
  // Employment Category set-up — the module's own list (Manage Types / Assign
  // Categories in EmployeeCategory.js), the source for the category choice.
  const [empTypeConfigs, setEmpTypeConfigs] = useState([]);
  const [empTypeLoaded, setEmpTypeLoaded] = useState(false);
  const [empTypeLoading, setEmpTypeLoading] = useState(true);
  const [empTypeError, setEmpTypeError] = useState('');
  const [appendix33ScopesLoaded, setAppendix33ScopesLoaded] = useState(false);
  const [appendix33ScopesLoading, setAppendix33ScopesLoading] = useState(true);
  const [appendix33ScopesError, setAppendix33ScopesError] = useState('');
  const [singleEmployee, setSingleEmployee] = useState(null);
  const [singleEmpNum, setSingleEmpNum]     = useState('');

  const [selectMode, setSelectMode]         = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empList, setEmpList]               = useState([]);
  const [empListLoading, setEmpListLoading] = useState(false);
  const [employeeQueue, setEmployeeQueue]   = useState([]);
  const empDebRef                           = useRef(null);
  const recordsScrollRef                    = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  // Record filters — employment category (the employee's own), department and
  // budget target. The category labels come from the Employment Category module.
  const [empCatLabels, setEmpCatLabels] = useState({});
  const [filterEmpCat, setFilterEmpCat] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterBudget, setFilterBudget] = useState('');
  // Progress filters — whether the department code / budget are filled in, and
  // whether the resulting payroll charge is allowed in Appendix 33.
  const [filterSetup, setFilterSetup] = useState('');
  const [filterExport, setFilterExport] = useState('');
  // Every employee (assigned or not) with their current department code / budget
  const [statusRows, setStatusRows] = useState([]);
  // Employees view pagination
  const [empPage, setEmpPage] = useState(0);
  const [empPageSize, setEmpPageSize] = useState(25);
  const [loading, setLoading]       = useState(false);
  const [viewMode, setViewMode]     = useState('employees');
  const [snackbar, setSnackbar]     = useState({ open: false, message: '', severity: 'success' });
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('create');

  // Modal state
  const [modalOpen, setModalOpen]                       = useState(false);
  const [selectedDepartment, setSelectedDepartment]     = useState(null);
  const [deptEmpDetails, setDeptEmpDetails]             = useState({});
  const [editAssignment, setEditAssignment]             = useState(null);
  const [originalAssignment, setOriginalAssignment]     = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [modalMemberSearch, setModalMemberSearch]       = useState('');
  const [isEditingModal, setIsEditingModal]             = useState(false);

  const showSnackbar = (msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev });
  // Surface the real cause (server down, validation error) instead of a generic message
  const describeRequestError = (err, fallback) => {
    if (!err?.response) return 'Cannot reach the server. Check that the backend is running, then try again.';
    const d = err.response.data;
    return (typeof d === 'string' && d) || d?.error || d?.message || fallback;
  };
  const { hasAccess, loading: accessLoading } = usePageAccess('department-assignment');

  useEffect(() => { fetchAssignments(); fetchDepartmentList(); fetchAppendix33DeptScopes(); fetchEmploymentTypeConfig(); fetchEmploymentCategoryLabels(); }, []);
  useEffect(() => { if (selectMode) fetchEmpList(''); }, [selectMode]); // eslint-disable-line
  // A new search or filter starts the Employees view on its first page
  useEffect(() => { setEmpPage(0); }, [searchTerm, filterEmpCat, filterDept, filterBudget, filterSetup, filterExport, empPageSize]);

  const fetchAssignments = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders());
      setData(Array.isArray(r.data) ? r.data : []);
    } catch { showSnackbar('Failed to fetch department assignments.', 'error'); }
    fetchAssignmentStatus();
  };

  // All employees + their assignment, including those never assigned. On failure
  // the Employees view falls back to the assignment records alone.
  const fetchAssignmentStatus = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment-status`, getAuthHeaders());
      setStatusRows(Array.isArray(r.data) ? r.data : []);
    } catch { setStatusRows([]); }
  };

  const fetchDepartmentList = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/department-table`, getAuthHeaders());
      setDepartmentList(Array.isArray(r.data) ? r.data : []);
    } catch { /* silent */ }
  };

  // Appendix 33 allow-list: the only tabs an export can be charged to (same source
  // as the Appendix 33 download modal's "Include" options). Both axes are loaded so
  // the budget target can point at a department or at an employment category.
  const fetchAppendix33DeptScopes = async () => {
    setAppendix33ScopesLoading(true);
    setAppendix33ScopesError('');
    try {
      const r = await axios.get(
        `${API_BASE_URL}/PayrollExportRoute/export-appendix33/scopes`,
        getAuthHeaders(),
      );
      const list = Array.isArray(r.data?.departments) ? r.data.departments : [];
      const empTypeList = Array.isArray(r.data?.employmentTypes) ? r.data.employmentTypes : [];
      setAppendix33DeptScopes(list.map((d) => ({ code: d.code, description: d.description || d.code })));
      setAppendix33EmpTypeScopes(empTypeList.map((d) => ({
        code: d.typeName,
        description: d.parentGroup || 'Employment category',
      })));
      setAppendix33ScopesLoaded(true);
    } catch {
      setAppendix33DeptScopes([]);
      setAppendix33ScopesLoaded(false);
      setAppendix33ScopesError('Could not load the allowed departments from the Appendix 33 layout.');
    } finally {
      setAppendix33ScopesLoading(false);
    }
  };

  // Employment Category set-up: every configured type from EmployeeCategory.js
  // (GET /employment-type-config — { flat, grouped }), so the budget target can
  // offer the same categories the Employment Category module maintains. This is
  // the list EmploymentCategoryHrPanel's categoryLabel/colorHex are built from.
  const fetchEmploymentTypeConfig = async () => {
    setEmpTypeLoading(true);
    setEmpTypeError('');
    try {
      const r = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`,
        getAuthHeaders(),
      );
      const flat = Array.isArray(r.data?.flat) ? r.data.flat : [];
      setEmpTypeConfigs(flat);
      setEmpTypeLoaded(true);
    } catch {
      setEmpTypeConfigs([]);
      setEmpTypeLoaded(false);
      setEmpTypeError('Could not load the Employment Category set-up.');
    } finally {
      setEmpTypeLoading(false);
    }
  };

  // Employee -> employment category label + colour, straight from the Employment
  // Category module (GET /employment-category). Powers the category filter and
  // every category chip on this page.
  const fetchEmploymentCategoryLabels = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, getAuthHeaders());
      const map = {};
      (Array.isArray(r.data) ? r.data : []).forEach((row) => {
        if (!row?.employeeNumber) return;
        const label = row.parentGroup && row.typeName
          ? `${row.parentGroup} | ${row.typeName}`
          : (row.categoryLabel || '');
        map[String(row.employeeNumber).trim()] = { label, colorHex: row.colorHex || '' };
      });
      setEmpCatLabels(map);
    } catch { /* silent — filters simply stay unpopulated */ }
  };

  const fetchEmpList = async (q) => {
    setEmpListLoading(true);
    try {
      const url = q.trim().length >= 2
        ? `${API_BASE_URL}/Remittance/employees/search?sort=surname&q=${encodeURIComponent(q)}`
        : `${API_BASE_URL}/Remittance/employees/search?sort=surname`;
      const r = await axios.get(url, getAuthHeaders());
      setEmpList(r.data);
    } catch { setEmpList([]); } finally { setEmpListLoading(false); }
  };

  usePayrollRealtimeRefresh(() => { fetchAssignments(); fetchDepartmentList(); fetchAppendix33DeptScopes(); fetchEmploymentTypeConfig(); fetchEmploymentCategoryLabels(); });

  const appendix33DeptCodeSet = useMemo(
    () => new Set(appendix33DeptScopes.map((d) => String(d.code || '').trim().toUpperCase()).filter(Boolean)),
    [appendix33DeptScopes],
  );

  // Employment categories enabled in the same layout — the other axis of tabs
  const appendix33EmpTypeNameSet = useMemo(
    () => new Set(appendix33EmpTypeScopes.map((d) => String(d.code || '').trim().toUpperCase()).filter(Boolean)),
    [appendix33EmpTypeScopes],
  );

  /**
   * Employment Category options straight from the Employment Category set-up,
   * labelled and coloured the way EmploymentCategoryHrPanel shows them:
   * "<parentGroup> | <typeName>" (the module's categoryLabel) plus colorHex.
   * That label is the value stored as the budget target.
   */
  const empTypeOptions = useMemo(() => {
    const active = empTypeConfigs.filter((t) => Number(t.isActive) === 1);
    // The export charges a category by its type name only, so the same type name
    // under several groups (e.g. "Tempo" in Academic 30 and Academic 40) is one
    // Appendix 33 block — say so on each of those options.
    const groupsByType = new Map();
    active.forEach((t) => {
      const key = String(t.typeName || '').trim().toUpperCase();
      if (!groupsByType.has(key)) groupsByType.set(key, []);
      if (t.parentGroup) groupsByType.get(key).push(t.parentGroup);
    });
    return active
      .map((t) => {
        const label = t.parentGroup ? `${t.parentGroup} | ${t.typeName}` : t.typeName;
        const others = (groupsByType.get(String(t.typeName || '').trim().toUpperCase()) || [])
          .filter((g) => g !== t.parentGroup);
        return {
          code: label,
          label,
          description: others.length
            ? `${t.parentGroup || ''} · same Appendix 33 block as ${others.map((g) => `${g} | ${t.typeName}`).join(', ')}`
            : (t.parentGroup || ''),
          colorHex: t.colorHex || '',
          // rows saved before the label was adopted hold the bare type name
          altKey: String(t.typeName || '').trim().toUpperCase(),
          // shown on the option: can the Appendix 33 export charge this category?
          appendix33: !appendix33ScopesLoaded
            ? 'unknown'
            : (appendix33EmpTypeNameSet.has(label.trim().toUpperCase())
              || appendix33EmpTypeNameSet.has(categoryMatchKey(label)) ? 'allowed' : 'blocked'),
        };
      });
  }, [empTypeConfigs, appendix33ScopesLoaded, appendix33EmpTypeNameSet]);

  const empTypeNameSet = useMemo(
    () => new Set(empTypeOptions.map((o) => String(o.code || '').trim().toUpperCase()).filter(Boolean)),
    [empTypeOptions],
  );

  // Bare type names accepted as well, so an already-saved value still validates
  const empTypeBareSet = useMemo(
    () => new Set(empTypeOptions.map((o) => o.altKey).filter(Boolean)),
    [empTypeOptions],
  );

  // ── Record filters (employment category / department / budget target) ──────
  const empCatFilterOptions = useMemo(() => {
    const seen = new Map();
    departmentData.forEach((d) => d.employees.forEach((emp) => {
      const cfg = empCatLabels[String(emp.employeeNumber ?? '')];
      const l = cfg?.label || '';
      if (l && !seen.has(l)) seen.set(l, cfg.colorHex || '');
    }));
    return [...seen.entries()]
      .map(([label, colorHex]) => ({ label, colorHex }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [departmentData, empCatLabels]);

  // One option per Appendix 33 tab: category targets are grouped by type name, so
  // e.g. "Academic - 30 Hours | Tempo" and "Academic - 40 Hours | Tempo" are one
  // "Tempo" option — the export puts both in the same TEMPO tab.
  const budgetFilterOptions = useMemo(() => {
    const byKey = new Map();
    departmentData.forEach((d) => d.employees.forEach((emp) => {
      const c = String(emp.budgetCode || '').trim();
      if (!c) return;
      const kind = budgetTargetKind(emp.budgetType);
      const key = budgetFilterKey(c, kind);
      if (!byKey.has(key)) {
        const sep = c.lastIndexOf('|');
        byKey.set(key, {
          key,
          kind,
          code: c, // a representative stored value, for the Appendix 33 status
          name: isCategoryTarget(kind) && sep > -1 ? c.slice(sep + 1).trim() : c,
          groups: [],
        });
      }
      if (isCategoryTarget(kind)) {
        const sep = c.lastIndexOf('|');
        const group = sep > -1 ? c.slice(0, sep).trim() : '';
        const opt = byKey.get(key);
        if (group && !opt.groups.includes(group)) opt.groups.push(group);
      }
    }));
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [departmentData]);

  const deptFilterOptions = useMemo(
    () => departmentData.map((d) => d.code).sort((a, b) => String(a).localeCompare(String(b))),
    [departmentData],
  );

  /**
   * One row per employee — assigned or not — with their department code and
   * budget target. When an employee has several assignment rows, the most
   * complete one wins.
   */
  const employeeStatusList = useMemo(() => {
    const byNum = new Map();
    const score = (e) => (e.code ? 2 : 0) + (e.budgetCode ? 1 : 0) + (e.assignmentId ? 0.5 : 0);
    const add = (row) => {
      const num = String(row?.employeeNumber ?? '').trim();
      if (!num) return;
      const prev = byNum.get(num);
      const entry = {
        employeeNumber: num,
        name: prev?.name || row.name || '',
        lastName: prev?.lastName || row.lastName || '',
        // "Surname, FirstName, Middle" — the Employees view shows and sorts by this
        surnameFirst: prev?.surnameFirst || row.surnameFirst || '',
        assignmentId: row.assignmentId ?? row.id ?? null,
        code: String(row.code || '').trim(),
        budgetCode: String(row.budgetCode || '').trim(),
        budgetType: budgetTargetKind(row.budgetType),
      };
      if (!prev || score(entry) > score(prev)) byNum.set(num, entry);
    };
    statusRows.forEach(add);
    data.forEach(add); // covers anyone the status endpoint missed (or if it failed)
    // Surname A–Z (the util reads the surname before the comma), then first name
    return sortEmployeesByLastName([...byNum.values()], (e) => e.surnameFirst || e.name);
  }, [statusRows, data]);

  const employeeStatusByNum = useMemo(
    () => new Map(employeeStatusList.map((e) => [e.employeeNumber, e])),
    [employeeStatusList],
  );

  /** Can the Appendix 33 export charge this target? null when there is no target. */
  const appendix33StatusOf = (code, kind) => {
    const v = String(code || '').trim();
    if (!v) return null;
    if (!appendix33ScopesLoaded) return 'unknown';
    if (isCategoryTarget(kind)) {
      return appendix33EmpTypeNameSet.has(v.toUpperCase()) || appendix33EmpTypeNameSet.has(categoryMatchKey(v))
        ? 'allowed' : 'blocked';
    }
    return appendix33DeptCodeSet.has(v.toUpperCase()) ? 'allowed' : 'blocked';
  };

  /**
   * Export status of an assignment. The Appendix 33 export only includes employees
   * with a Budget Department set, so no budget means "not exported" — the department
   * alone is not enough.
   */
  const chargeStatusOf = (a) => (
    String(a?.budgetCode || '').trim()
      ? appendix33StatusOf(a.budgetCode, a.budgetType)
      : 'nobudget'
  );

  /** The per-employee dropdown filters, shared by the department and employee views. */
  const passesRecordFilters = (emp) => {
    if (filterBudget) {
      const b = String(emp.budgetCode || '').trim();
      if (filterBudget === NO_FILTER) {
        if (b !== '') return false;
      } else if (!b || budgetFilterKey(b, emp.budgetType) !== filterBudget) {
        return false;
      }
    }
    if (filterEmpCat) {
      const l = empCatLabels[String(emp.employeeNumber ?? '')]?.label || '';
      if (filterEmpCat === NO_FILTER ? l !== '' : l !== filterEmpCat) return false;
    }
    if (filterSetup) {
      const s = setupStatusOf(emp.code, emp.budgetCode);
      if (filterSetup === SETUP_INCOMPLETE ? s === SETUP_COMPLETE : s !== filterSetup) return false;
    }
    if (filterExport && chargeStatusOf(emp) !== filterExport) return false;
    return true;
  };

  /** Assignments kept by the dropdowns — the text search runs on top of this. */
  const visibleData = departmentData
    .filter((d) => !filterDept || d.code === filterDept)
    .map((d) => ({ ...d, employees: d.employees.filter(passesRecordFilters) }))
    .filter((d) => d.employees.length > 0);

  /**
   * Department budget options: the Appendix 33 allow-list (selectable), then the
   * remaining departments from the Department table, listed only so it is clear
   * they are not enabled in Appendix 33 (the backend rejects them anyway).
   */
  const deptBudgetOptions = [
    ...appendix33DeptScopes.map((d) => ({ ...d, appendix33: 'allowed' })),
    ...(appendix33ScopesLoaded
      ? departmentList
        .filter((d) => d.code && !appendix33DeptCodeSet.has(String(d.code).trim().toUpperCase()))
        .map((d) => ({
          code: d.code,
          description: `${d.description ? `${d.description} · ` : ''}enable it in the Appendix 33 layout to use it`,
          appendix33: 'blocked',
          selectable: false,
        }))
      : []),
  ];

  /** Option list of the selected budget target kind. */
  const budgetOptionsFor = (kind) => (isCategoryTarget(kind) ? empTypeOptions : deptBudgetOptions);
  /** Per-kind fetch state, so the field validates against its own list. */
  const budgetLoadedFor = (kind) => (isCategoryTarget(kind) ? empTypeLoaded : appendix33ScopesLoaded);
  const budgetLoadingFor = (kind) => (isCategoryTarget(kind) ? empTypeLoading : appendix33ScopesLoading);
  const budgetErrorFor = (kind) => (isCategoryTarget(kind) ? empTypeError : appendix33ScopesError);

  // Two different questions per kind: the set-up decides what may be saved, the
  // Appendix 33 layout decides whether the export will honour it — so a category
  // that is configured but not enabled in the layout warns instead of blocking.
  const getBudgetScopeWarning = (code, kind) => {
    const v = String(code || '').trim();
    if (!v) return '';

    if (isCategoryTarget(kind)) {
      if (empTypeError || !empTypeLoaded) return empTypeError || 'Waiting for the Employment Category set-up to load.';
      if (!empTypeNameSet.has(v.toUpperCase()) && !empTypeBareSet.has(v.toUpperCase())) {
        return `“${v}” is not configured in Employment Category.`;
      }
      // The layout is keyed by type name, while the stored value is the module's
      // "Group | Type" label — compare both shapes.
      const exportEnabled = appendix33EmpTypeNameSet.has(v.toUpperCase())
        || appendix33EmpTypeNameSet.has(categoryMatchKey(v));
      if (appendix33ScopesLoaded && !exportEnabled) {
        return `“${v}” is configured in Employment Category, but not enabled in the Appendix 33 layout’s employment-category tab, so this payroll charge will have no effect on the export until it is allowed there.`;
      }
      return '';
    }

    if (appendix33ScopesError) return appendix33ScopesError;
    if (!appendix33ScopesLoaded) return 'Waiting for the Appendix 33 department configuration to load.';
    if (!appendix33DeptCodeSet.has(v.toUpperCase())) {
      return `“${v}” is not enabled in the Appendix 33 layout’s department tab, so this payroll charge will have no effect on the export until it is allowed there.`;
    }
    return '';
  };

  const isBudgetTargetAllowed = (code, kind) => {
    const v = String(code || '').trim();
    if (!v) return true;
    if (isCategoryTarget(kind)) {
      if (empTypeError || !empTypeLoaded) return false;
      return empTypeNameSet.has(v.toUpperCase()) || empTypeBareSet.has(v.toUpperCase());
    }
    if (appendix33ScopesError || !appendix33ScopesLoaded) return false;
    return appendix33DeptCodeSet.has(v.toUpperCase());
  };

  useEffect(() => {
    const descMap = {};
    departmentList.forEach((d) => { descMap[d.code] = d.description || ''; });
    const grouped = data.reduce((acc, a) => {
      const code = a.code || 'Unassigned';
      if (!acc[code]) acc[code] = { code, description: descMap[code] || '', employees: [] };
      acc[code].employees.push({ ...a, budgetType: budgetTargetKind(a.budgetType) });
      return acc;
    }, {});
    setDepartmentData(
      Object.values(grouped).map((dept) => ({
        ...dept,
        description: descMap[dept.code] || dept.description || '',
        employees: sortByLastName(dept.employees),
      }))
    );
  }, [data, departmentList]);

  const selectedNums = new Set(employeeQueue.map((e) => String(e.employeeNumber)));

  const toggleEmp = (emp) => {
    const num = String(emp.employeeNumber);
    setEmployeeQueue((prev) => selectedNums.has(num) ? prev.filter((e) => String(e.employeeNumber) !== num) : [...prev, emp]);
  };

  const handleSelectAll = () =>
    setEmployeeQueue((prev) => {
      const existing = new Map(prev.map((e) => [String(e.employeeNumber), e]));
      empList.forEach((e) => existing.set(String(e.employeeNumber), e));
      return [...existing.values()];
    });

  const handleDeselectAll = () =>
    setEmployeeQueue((prev) => prev.filter((e) => !empList.find((x) => String(x.employeeNumber) === String(e.employeeNumber))));

  const exitSelectMode = () => { setSelectMode(false); setEmpSearchQuery(''); setEmpList([]); setEmployeeQueue([]); };

  const handleAssign = async () => {
    const toAssign = selectMode ? employeeQueue : singleEmployee ? [singleEmployee] : [];
    if (toAssign.length === 0) { showSnackbar('Please select at least one employee', 'error'); return; }
    // Either field may be used on its own — department only, budget target only, or both
    if (!selectedCode && !assignBudgetCode) {
      showSnackbar('Choose a Department and/or a Budget Department.', 'error');
      return;
    }
    const budgetWarning = getBudgetScopeWarning(assignBudgetCode, assignBudgetType);
    if (budgetWarning || !isBudgetTargetAllowed(assignBudgetCode, assignBudgetType)) {
      showSnackbar(
        budgetWarning || `Choose an allowed ${isCategoryTarget(assignBudgetType) ? 'Employment Category' : 'Budget Department'} from the Appendix 33 layout.`,
        'error',
      );
      return;
    }
    setLoading(true);
    let ok = 0, updated = 0, fail = 0, firstError = '';
    for (const emp of toAssign) {
      try {
        const r = await axios.post(
          `${API_BASE_URL}/api/department-assignment`,
          { code: selectedCode, budgetCode: assignBudgetCode, budgetType: assignBudgetType, employeeNumber: emp.employeeNumber, name: emp.name },
          getAuthHeaders(),
        );
        if (r.data?.updated) updated++;   // an existing record was updated instead of a new one
        ok++;
      } catch (err) {
        fail++;
        if (!firstError) firstError = err?.response?.data?.error || '';
      }
    }
    setLoading(false);
    setSingleEmployee(null); setSingleEmpNum('');
    exitSelectMode();
    setSelectedCode('');
    setAssignBudgetCode('');
    setAssignBudgetType(BUDGET_TARGET_DEPARTMENT);
    fetchAssignments();
    if (fail === 0) {
      if (ok > 1) setSuccessAction('bulk');
      else setSuccessAction(updated > 0 ? 'edit' : 'create');
      setSuccessOpen(true);
    } else showSnackbar(`${ok} saved, ${fail} failed.${firstError ? ` ${firstError}` : ''}`, 'warning');
  };

  const handleUpdate = async () => {
    if (!editAssignment) return;
    const budgetWarning = getBudgetScopeWarning(editAssignment.budgetCode, editAssignment.budgetType);
    if (budgetWarning || !isBudgetTargetAllowed(editAssignment.budgetCode, editAssignment.budgetType)) {
      showSnackbar(
        budgetWarning || `Choose an allowed ${isCategoryTarget(editAssignment.budgetType) ? 'Employment Category' : 'Budget Department'} from the Appendix 33 layout.`,
        'error',
      );
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/api/department-assignment/${editAssignment.id}`, editAssignment, getAuthHeaders());
      setSuccessAction('edit');
      setSuccessOpen(true);
      await fetchAssignments();
      const res = await axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders());
      const all = Array.isArray(res.data) ? res.data : [];
      if (selectedDepartment) {
        setSelectedDepartment((p) => ({
          ...p,
          employees: sortByLastName(all.filter((a) => a.code === selectedDepartment.code)),
        }));
      }
      setOriginalAssignment({ ...editAssignment });
      setIsEditingModal(false);
    } catch (err) { showSnackbar(describeRequestError(err, 'Failed to update assignment.'), 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/department-assignment/${id}`, getAuthHeaders());
      setSuccessAction('delete');
      setSuccessOpen(true);
      await fetchAssignments();
      if (selectedDepartment) {
        const updated = selectedDepartment.employees.filter((e) => e.id !== id);
        setSelectedDepartment((p) => ({ ...p, employees: updated }));
        if (editAssignment?.id === id) {
          setEditAssignment(null);
          setOriginalAssignment(null);
          setSelectedEditEmployee(null);
          setIsEditingModal(false);
        }
      }
    } catch (err) { showSnackbar(describeRequestError(err, 'Failed to delete assignment.'), 'error'); }
  };

  const handleOpenModal = async (department, focusAssignment = null) => {
    setSelectedDepartment(department);
    setEditAssignment(null);
    setOriginalAssignment(null);
    setSelectedEditEmployee(null);
    setIsEditingModal(false);
    setModalMemberSearch('');
    setModalOpen(true);

    const map = {};
    await Promise.all(department.employees.map(async (a) => {
      if (!a.employeeNumber) return;
      try {
        const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${a.employeeNumber}`, getAuthHeaders());
        map[a.employeeNumber] = r.data;
      } catch {
        map[a.employeeNumber] = { employeeNumber: a.employeeNumber, name: a.name || 'Unknown' };
      }
    }));
    setDeptEmpDetails(map);

    // Auto-select the searched member, otherwise the first member
    if (department.employees.length > 0) {
      const first = (focusAssignment && department.employees.find((e) => e.id === focusAssignment.id)) || department.employees[0];
      setEditAssignment({ ...first });
      setOriginalAssignment({ ...first });
      if (first.employeeNumber) {
        try {
          const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${first.employeeNumber}`, getAuthHeaders());
          setSelectedEditEmployee(r.data);
        } catch { setSelectedEditEmployee(null); }
      }
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditAssignment(null);
    setOriginalAssignment(null);
    setSelectedEditEmployee(null);
    setSelectedDepartment(null);
    setDeptEmpDetails({});
    setModalMemberSearch('');
    setIsEditingModal(false);
  };

  const hasChanges = () =>
    editAssignment && originalAssignment &&
    (editAssignment.code !== originalAssignment.code ||
      (editAssignment.budgetCode || '') !== (originalAssignment.budgetCode || '') ||
      budgetTargetKind(editAssignment.budgetType) !== budgetTargetKind(originalAssignment.budgetType) ||
      editAssignment.employeeNumber !== originalAssignment.employeeNumber);

  // ── Access guard ─────────────────────────────────────────────
  if (accessLoading) return <DeptWireframe />;
  if (hasAccess === false) return <AccessDenied title="Access Denied" message="You do not have permission to access Department Assignment." returnPath="/admin-home" returnButtonText="Return to Home" />;

  const hasRecordFilters = Boolean(filterEmpCat || filterDept || filterBudget || filterSetup || filterExport);
  const clearRecordFilters = () => {
    setFilterEmpCat(''); setFilterDept(''); setFilterBudget(''); setFilterSetup(''); setFilterExport('');
  };

  // ── Employees view: every employee with their setup progress ──
  const setupCounts = employeeStatusList.reduce((acc, e) => {
    acc[setupStatusOf(e.code, e.budgetCode)] += 1;
    return acc;
  }, { [SETUP_COMPLETE]: 0, [SETUP_DEPT_ONLY]: 0, [SETUP_BUDGET_ONLY]: 0, [SETUP_NONE]: 0 });
  const setupTotal = employeeStatusList.length;

  const filteredEmployeeStatus = employeeStatusList.filter((e) => {
    if (filterDept && (e.code || 'Unassigned') !== filterDept) return false;
    if (!passesRecordFilters(e)) return false;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [e.name, e.surnameFirst, e.employeeNumber, e.code, e.budgetCode]
      .some((v) => String(v || '').toLowerCase().includes(term));
  });

  // Only one page of rows is rendered — drawing every employee (each with its
  // tooltips) at once is what made the view lag.
  const empPageCount = Math.max(1, Math.ceil(filteredEmployeeStatus.length / empPageSize));
  const empPageSafe = Math.min(empPage, empPageCount - 1);
  const empPageStart = empPageSafe * empPageSize;
  const pagedEmployeeStatus = filteredEmployeeStatus.slice(empPageStart, empPageStart + empPageSize);

  /** Open an employee from the Employees view: their record if assigned, else the assign form. */
  const openEmployeeStatus = (e) => {
    if (e.assignmentId) {
      const dept = departmentData.find((d) => d.code === (e.code || 'Unassigned'));
      const assignment = dept?.employees.find((a) => a.id === e.assignmentId);
      if (dept && assignment) { handleOpenModal(dept, assignment); return; }
    }
    exitSelectMode();
    setSingleEmployee({ employeeNumber: e.employeeNumber, name: e.name });
    setSingleEmpNum(e.employeeNumber);
    showSnackbar(`${e.name || `#${e.employeeNumber}`} is loaded in the assign form.`, 'info');
  };

  const filteredDepartmentData = visibleData.filter((d) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (d.code?.toLowerCase() || '').includes(term) || (d.description?.toLowerCase() || '').includes(term) ||
           d.employees.some((e) => (e.name?.toLowerCase() || '').includes(term) || (e.employeeNumber?.toString() || '').includes(term));
  });

  // Employee-level matches so users can find a person without opening each department
  const employeeSearchTerm = searchTerm.trim().toLowerCase();
  const matchedEmployees = employeeSearchTerm
    ? visibleData.flatMap((d) => d.employees
        .filter((e) => (e.name?.toLowerCase() || '').includes(employeeSearchTerm) || (e.employeeNumber?.toString().toLowerCase() || '').includes(employeeSearchTerm))
        .map((e) => ({ assignment: e, department: d })))
    : [];

  const filteredModalMembers = selectedDepartment ? selectedDepartment.employees.filter((emp) => {
    const detail = deptEmpDetails[emp.employeeNumber];
    const name   = (detail?.name || emp.name || '').toLowerCase();
    const num    = (emp.employeeNumber?.toString() || '').toLowerCase();
    const term   = modalMemberSearch.toLowerCase();
    return !term || name.includes(term) || num.includes(term);
  }) : [];

  const selectedDeptObj = departmentList.find((d) => d.code === selectedCode);
  const assignBudgetAllowed = isBudgetTargetAllowed(assignBudgetCode, assignBudgetType);
  const assignBudgetWarning = getBudgetScopeWarning(assignBudgetCode, assignBudgetType);
  const canAssign       = (selectMode ? employeeQueue.length > 0 : !!singleEmployee) && assignBudgetAllowed
                          && Boolean(selectedCode || assignBudgetCode);
  const assignCount     = selectMode ? employeeQueue.length : singleEmployee ? 1 : 0;

  const editBudgetWarning = editAssignment ? getBudgetScopeWarning(editAssignment.budgetCode, editAssignment.budgetType) : '';

  // What the single chosen employee already has, so re-assigning is a deliberate overwrite
  const singleCurrent = singleEmployee ? employeeStatusByNum.get(String(singleEmployee.employeeNumber)) : null;

  // Appendix 33 indicator for what each form would save. A blank budget in the
  // assign form keeps an existing one, so only warn when there is none to keep.
  const assignKeepsBudget = !String(assignBudgetCode || '').trim() && !selectMode && Boolean(singleCurrent?.budgetCode);
  const assignChargeStatus = assignKeepsBudget
    ? null
    : chargeStatusOf({ code: selectedCode, budgetCode: assignBudgetCode, budgetType: assignBudgetType });
  const editChargeStatus = editAssignment ? chargeStatusOf(editAssignment) : null;

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Fade in timeout={400}>
        <Box sx={pageWrapSx}>

          {/* Page Header */}
          <SectionCard sx={{ mb: 2, position: 'relative' }}>
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${T.accent}, ${T.accentDark})` }} />
            <Box sx={{ pl: 4.5, pr: 4, py: 2.5, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Avatar sx={{ width: 48, height: 48, background: T.headerGrad, color: '#fff', borderRadius: 2, boxShadow: `0 6px 16px -4px ${alpha(T.accent, 0.45)}` }}>
                  <DomainIcon sx={{ fontSize: 25 }} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: T.accent, lineHeight: 1.2, mb: 0.4, letterSpacing: '-0.015em' }}>Department Assignment Management</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: T.muted, fontWeight: 500 }}>Administrative Panel • Assign and manage employee department records</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, px: 2, py: 0.75, borderRadius: R.control, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '1.1rem', color: T.accent, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{data.length}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: T.muted, fontWeight: 600 }}>{data.length === 1 ? 'assignment' : 'assignments'}</Typography>
                </Box>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={() => { fetchAssignments(); fetchDepartmentList(); fetchAppendix33DeptScopes(); fetchEmploymentTypeConfig(); fetchEmploymentCategoryLabels(); }} sx={{ border: `1px solid ${T.accentBorder}`, borderRadius: R.control, color: T.accent, width: 40, height: 40, '&:hover': { bgcolor: T.accentHover }, '&:focus-visible': { boxShadow: T.ring } }}>
                    <Refresh sx={{ fontSize: 19 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* Duplicate assignments (e.g. "22415839" and "22415839-M") — warn + review */}
          <DuplicateAssignmentsWarning refreshKey={data} onChanged={fetchAssignments} />

          <Grid container spacing={2}>
            {/* LEFT: Assign Form */}
            <Grid item xs={12} lg={5}>
              <SectionCard sx={{ height: panelHeight, display: 'flex', flexDirection: 'column' }}>
                <PanelHeader icon={<AddIcon sx={{ fontSize: 17 }} />} title="Assign to Department" hint="Employee, then department, then budget charge" />

                <Box sx={{ px: 3, pt: 2, pb: 1, flexShrink: 0 }}>
                  {/* 1. Employee — chosen first so the department and the budget charge
                      are picked for a known person. */}
                  <StepLabel
                    n={1}
                    required
                    action={
                      <AccentButton size="small" variant={selectMode ? 'contained' : 'outlined'}
                        onClick={() => { if (selectMode) exitSelectMode(); else { setSelectMode(true); setSingleEmployee(null); setSingleEmpNum(''); } }}
                        startIcon={selectMode ? <CheckBoxIcon sx={{ fontSize: '14px !important' }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ fontSize: '0.72rem', px: 1.4, py: 0.3, height: 28, bgcolor: selectMode ? T.accent : 'transparent', color: selectMode ? '#fff' : T.accent, borderColor: T.accentBorder, '&:hover': { bgcolor: selectMode ? T.accentDark : T.accentFaint, borderColor: T.accent } }}>
                        {selectMode ? 'Cancel' : 'Select multiple'}
                      </AccentButton>
                    }
                  >
                    Employee
                  </StepLabel>

                  {!selectMode && (
                    <Box>
                      <SingleEmployeeAutocomplete value={singleEmpNum} onChange={setSingleEmpNum} selectedEmployee={singleEmployee} onEmployeeSelect={setSingleEmployee} placeholder="Search employee to assign…" empCatLabels={empCatLabels} />
                      {singleEmployee && (
                        <Box sx={{ mt: 1 }}>
                          <EmployeeCard
                            name={singleEmployee.name}
                            number={singleEmployee.employeeNumber}
                            trailing={
                              <>
                                {selectedCode && <Chip label={`→ ${selectedCode}`} size="small" sx={{ fontSize: '0.66rem', height: 20, bgcolor: alpha(T.accent, 0.08), color: T.accent, fontWeight: 700, borderRadius: R.tag }} />}
                                <IconButton size="small" onClick={() => { setSingleEmployee(null); setSingleEmpNum(''); }} sx={{ color: T.danger, width: 24, height: 24, '&:hover': { bgcolor: 'rgba(198,40,40,0.1)' } }}>
                                  <Close sx={{ fontSize: 13 }} />
                                </IconButton>
                              </>
                            }
                          />
                          {singleCurrent && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, ml: 0.5, flexWrap: 'wrap' }}>
                              <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>Currently:</Typography>
                              <SetupFlags code={singleCurrent.code} budgetCode={singleCurrent.budgetCode} />
                              {singleCurrent.code && <Typography sx={{ fontSize: '0.7rem', color: T.text, fontWeight: 600 }}>{singleCurrent.code}</Typography>}
                              {singleCurrent.budgetCode && <Chip label={budgetChipLabel(singleCurrent.budgetCode, singleCurrent.budgetType)} size="small" sx={{ ...goldChipSx, height: 20 }} />}
                              <Appendix33Badge status={chargeStatusOf(singleCurrent)} />
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {selectMode && (
                    <Box>
                      <FieldInput value={empSearchQuery}
                        onChange={(e) => { const v = e.target.value; setEmpSearchQuery(v); clearTimeout(empDebRef.current); empDebRef.current = setTimeout(() => fetchEmpList(v), 300); }}
                        placeholder="Search employees…" fullWidth autoComplete="off" size="small"
                        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: T.muted, mr: 0.75 }} /> }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, px: 0.25 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: T.muted }}>
                          {empList.length} result{empList.length !== 1 ? 's' : ''}
                          {employeeQueue.length > 0 && <Box component="span" sx={{ ml: 0.75, fontWeight: 700, color: T.accent }}>· {employeeQueue.length} selected</Box>}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Box onClick={handleSelectAll} sx={{ px: 1.25, py: 0.35, borderRadius: R.tag, fontSize: '0.7rem', fontWeight: 700, color: T.accent, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.13s', '&:hover': { bgcolor: T.accentHover } }}>Select all</Box>
                          <Box onClick={handleDeselectAll} sx={{ px: 1.25, py: 0.35, borderRadius: R.tag, fontSize: '0.7rem', fontWeight: 700, color: T.muted, bgcolor: 'rgba(0,0,0,0.03)', border: `1px solid ${T.divider}`, cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.13s, color 0.13s', '&:hover': { bgcolor: 'rgba(0,0,0,0.07)', color: T.danger } }}>Deselect all</Box>
                        </Box>
                      </Box>
                    </Box>
                  )}

                </Box>

                {selectMode && (
                  <Box sx={{ px: 3, pb: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {empListLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1 }}>
                        <CircularProgress size={16} sx={{ color: T.accent }} />
                        <Typography sx={{ fontSize: '0.8rem', color: T.muted }}>Loading…</Typography>
                      </Box>
                    ) : empList.length === 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, borderRadius: R.item, border: `1.5px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
                        <Typography sx={{ fontSize: '0.8rem', color: T.faint }}>No employees found</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.4, ...scrollbarSx }}>
                        {empList.map((emp) => {
                          const isSel = selectedNums.has(String(emp.employeeNumber));
                          return (
                            <Box key={emp.employeeNumber} onClick={() => toggleEmp(emp)}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.25, py: 0.85, borderRadius: R.item, cursor: 'pointer', bgcolor: isSel ? T.accentFaint : 'transparent', border: 'none', borderLeft: `3px solid ${isSel ? T.accent : 'transparent'}`, transition: 'background-color 0.13s, border-color 0.13s', '&:hover': { bgcolor: isSel ? T.accentHover : 'rgba(0,0,0,0.03)' }, flexShrink: 0 }}>
                              <Checkbox checked={isSel} onChange={() => toggleEmp(emp)} onClick={(e) => e.stopPropagation()} size="small" sx={{ p: 0, color: T.accentBorder, '&.Mui-checked': { color: T.accent }, flexShrink: 0 }} />
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: isSel ? T.accent : 'rgba(0,0,0,0.08)', color: isSel ? '#fff' : T.muted, fontWeight: 700, transition: 'all 0.15s', flexShrink: 0 }}>{emp.name?.charAt(0)?.toUpperCase() || '?'}</Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography noWrap sx={{ fontSize: '0.8rem', fontWeight: 700, color: isSel ? T.accent : T.text }}>{emp.surnameFirst || emp.name}</Typography>
                                <EmpNumberLine number={emp.employeeNumber} category={empCatLabels[String(emp.employeeNumber ?? '').trim()]} fontSize="0.68rem" />
                              </Box>
                              {(() => {
                                const cur = employeeStatusByNum.get(String(emp.employeeNumber));
                                return <SetupFlags code={cur?.code} budgetCode={cur?.budgetCode} compact />;
                              })()}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}

                {/* 2 & 3. Where the assignment goes: the department, then the optional
                    payroll charge — which points at a department or an employment category. */}
                <Box sx={{ px: 3, pt: 2, pb: 2, flexShrink: 0, borderTop: `1px solid ${T.divider}`, mt: 1, overflowY: 'auto', maxHeight: selectMode ? '48%' : 'none', ...scrollbarSx }}>
                  <StepLabel n={2}>Department Code</StepLabel>
                  <DeptCodeAutocomplete value={selectedCode} onChange={setSelectedCode} departmentList={departmentList} />
                  {selectedDeptObj?.description && (
                    <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.6, ml: 0.5 }}>{selectedDeptObj.description}</Typography>
                  )}

                  <Box sx={{ mt: 2.25 }}>
                    <StepLabel n={3}>Budget Department (payroll charge)</StepLabel>
                    {/* The charge can point at either axis of the Appendix 33 layout */}
                    <BudgetKindToggle
                      value={assignBudgetType}
                      onChange={(v) => { setAssignBudgetType(v); setAssignBudgetCode(''); }}
                    />
                    <BudgetTargetAutocomplete
                      value={assignBudgetCode}
                      onChange={setAssignBudgetCode}
                      kind={assignBudgetType}
                      options={budgetOptionsFor(assignBudgetType)}
                      scopesLoaded={budgetLoadedFor(assignBudgetType)}
                      scopesLoading={budgetLoadingFor(assignBudgetType)}
                      scopesError={budgetErrorFor(assignBudgetType)}
                      placeholder=""
                    />
                    {assignBudgetWarning && (
                      <Typography sx={{ fontSize: '0.7rem', color: T.warn, mt: 0.75, ml: 0.5, lineHeight: 1.45 }}>
                        {assignBudgetWarning}
                      </Typography>
                    )}
                    <Appendix33Note
                      status={assignChargeStatus}
                      target={assignBudgetCode}
                      noun={budgetTargetNoun(assignBudgetType)}
                     
                    />

                    {/* Instructions for the 2 budget choices offered by the toggle above */}
                    <Box sx={{ mt: 1.25, p: '12px 14px', borderRadius: R.item, border: `1px solid ${T.divider}`, bgcolor: T.canvas }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 15, color: T.accent }} />
                        <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: T.accent }}>
                          The 2 budget choices
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: T.muted, lineHeight: 1.5 }}>
                          <Box component="span" sx={{ fontWeight: 700, color: T.text }}>1 · Department</Box> — charges the pay to another office tab (e.g. an employee in CAS charged to CEN).
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: T.muted, lineHeight: 1.5 }}>
                          <Box component="span" sx={{ fontWeight: 700, color: T.text }}>2 · Employment Category</Box> — charges the pay to a category tab (e.g. Non-Teaching).
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: T.muted, lineHeight: 1.5 }}>
                          <Box component="span" sx={{ fontWeight: 700, color: T.text }}>Leave blank</Box> — the employee is <b>not included</b> in the Appendix 33 export until a budget is set.
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: T.muted, lineHeight: 1.5 }}>
                          <Box component="span" sx={{ fontWeight: 700, color: T.text }}>Already assigned?</Box> — a field left blank keeps what the employee already has, so you can set the department and the budget in separate steps. To clear a value, open the employee’s record and use Edit.
                        </Typography>
                      </Box>
                      {/* <Typography sx={{ fontSize: '0.67rem', color: T.faint, mt: 0.85, pt: 0.85, borderTop: `1px solid ${T.hairline}`, lineHeight: 1.5 }}>
                        Choosing above swaps the list. Departments come from the Appendix 33 layout; employment categories come from the Employment Category set-up (same list as the Employee Category module). Only targets enabled in the Appendix 33 layout change the export, and this field never changes the department the employee is assigned to.
                      </Typography> */}
                    </Box>
                  </Box>
                </Box>

                {!selectMode && <Box sx={{ flex: 1 }} />}

                <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${T.divider}`, bgcolor: T.canvas, flexShrink: 0 }}>
                  <AccentButton onClick={handleAssign} variant="contained"
                    startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddIcon sx={{ fontSize: '16px !important' }} />}
                    fullWidth disabled={loading || !canAssign}
                    sx={{ height: 42, background: T.headerGrad, color: '#fff', '&:hover': { background: T.accentDark }, '&:disabled': { background: `${alpha(T.accent, 0.35)} !important`, color: '#fff !important' } }}>
                    {loading ? 'Assigning…' : `Assign ${assignCount > 0 ? `${assignCount} ` : ''}Employee${assignCount !== 1 ? 's' : ''}`}
                  </AccentButton>
                </Box>
              </SectionCard>
            </Grid>

            {/* RIGHT: Records */}
            <Grid item xs={12} lg={7}>
              <SectionCard sx={{ height: panelHeight, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.canvas, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <IconTile size={30}><Reorder sx={{ fontSize: 17 }} /></IconTile>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>Department Records</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box sx={{ px: 1.5, py: 0.45, borderRadius: R.control, bgcolor: '#fff', border: `1px solid ${T.accentBorder}` }}>
                        <Typography sx={{ fontSize: '0.72rem', color: T.accent, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {viewMode === 'employees'
                            ? `${filteredEmployeeStatus.length} employee${filteredEmployeeStatus.length !== 1 ? 's' : ''}`
                            : `${filteredDepartmentData.length} dept${filteredDepartmentData.length !== 1 ? 's' : ''}`}
                          {hasRecordFilters ? ' · filtered' : ''}
                        </Typography>
                      </Box>
                      <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                        sx={{ p: '3px', bgcolor: T.canvasDeep, borderRadius: 1.25, gap: '3px',
                          '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '7px !important', m: 0 },
                          '& .MuiToggleButton-root': { px: 1, py: 0.35, color: T.muted, '&:hover': { bgcolor: T.accentHover }, '&.Mui-selected': { bgcolor: '#fff', color: T.accent, boxShadow: T.soft }, '&.Mui-selected:hover': { bgcolor: '#fff' } } }}>
                        <ToggleButton value="employees" aria-label="Employees view" title="Employees — who already has a department code and budget"><BadgeIcon sx={{ fontSize: 15 }} /></ToggleButton>
                        <ToggleButton value="grid" aria-label="Grid view" title="Departments — grid"><ViewModuleIcon sx={{ fontSize: 15 }} /></ToggleButton>
                        <ToggleButton value="list" aria-label="List view" title="Departments — list"><ViewListIcon sx={{ fontSize: 15 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  {/* Record filters: employment category / department / budget target */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FieldInput select size="small" label="Employment category"
                      value={filterEmpCat} onChange={(e) => setFilterEmpCat(e.target.value)}
                      sx={{ flex: 1, minWidth: 150 }}>
                      <MenuItem value="">All employment categories</MenuItem>
                      <MenuItem value={NO_FILTER}>Not set</MenuItem>
                      {empCatFilterOptions.map((o) => (
                        <MenuItem key={o.label} value={o.label} sx={{ gap: 0.75 }}>
                          {o.colorHex && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: hexColor(o.colorHex), flexShrink: 0 }} />}
                          {o.label}
                        </MenuItem>
                      ))}
                    </FieldInput>
                    <FieldInput select size="small" label="Department"
                      value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                      sx={{ flex: 1, minWidth: 130 }}>
                      <MenuItem value="">All departments</MenuItem>
                      {deptFilterOptions.map((c) => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </FieldInput>
                    <FieldInput select size="small" label="Budget department"
                      value={filterBudget} onChange={(e) => setFilterBudget(e.target.value)}
                      SelectProps={{
                        renderValue: (v) => {
                          if (v === NO_FILTER) return 'No budget (not exported)';
                          const opt = budgetFilterOptions.find((o) => o.key === v);
                          return opt ? budgetChipLabel(opt.name, opt.kind) : '';
                        },
                      }}
                      sx={{ flex: 1.2, minWidth: 170 }}>
                      <MenuItem value="">All budget targets</MenuItem>
                      <MenuItem value={NO_FILTER}>No budget (not exported)</MenuItem>
                      {budgetFilterOptions.map((b) => (
                        <MenuItem key={b.key} value={b.key} sx={{ gap: 0.75 }}>
                          <Appendix33Badge status={appendix33StatusOf(b.code, b.kind)} compact />
                          <Box sx={{ minWidth: 0 }}>
                            {budgetChipLabel(b.name, b.kind)}
                            {b.groups.length > 1 && (
                              <Typography component="span" sx={{ display: 'block', fontSize: '0.68rem', color: T.muted, lineHeight: 1.3 }}>
                                {b.groups.join(' + ')} · one Appendix 33 tab
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </FieldInput>
                    <FieldInput select size="small" label="Setup status"
                      value={filterSetup} onChange={(e) => setFilterSetup(e.target.value)}
                      sx={{ flex: 1.2, minWidth: 170 }}>
                      <MenuItem value="">All statuses</MenuItem>
                      <MenuItem value={SETUP_COMPLETE}>Done — department &amp; budget set</MenuItem>
                      <MenuItem value={SETUP_INCOMPLETE}>Not done yet (anything missing)</MenuItem>
                      <MenuItem value={SETUP_DEPT_ONLY}>Department set, budget not set</MenuItem>
                      <MenuItem value={SETUP_BUDGET_ONLY}>Budget set, department not set</MenuItem>
                      <MenuItem value={SETUP_NONE}>Nothing set</MenuItem>
                    </FieldInput>
                    <FieldInput select size="small" label="Appendix 33"
                      value={filterExport} onChange={(e) => setFilterExport(e.target.value)}
                      sx={{ flex: 1, minWidth: 150 }}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="allowed">Allowed in Appendix 33</MenuItem>
                      <MenuItem value="blocked">Not in Appendix 33</MenuItem>
                      <MenuItem value="nobudget">Not exported (no budget)</MenuItem>
                    </FieldInput>
                    {hasRecordFilters && (
                      <Tooltip title="Clear filters">
                        <IconButton
                          size="small"
                          onClick={clearRecordFilters}
                          sx={{ color: T.danger, border: `1px solid ${T.divider}`, borderRadius: R.control, width: 32, height: 32 }}
                        >
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  <FieldInput size="small" placeholder="Search by department code, description, or employee name…"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} fullWidth
                    InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: T.muted, mr: 0.75 }} /> }} />
                </Box>

                <Box ref={recordsScrollRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#fff', ...scrollbarSx }}>
                  {viewMode !== 'employees' && matchedEmployees.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, color: T.accent }} />
                        <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: T.accent }}>
                          Matching Employees ({matchedEmployees.length})
                        </Typography>
                      </Box>
                      <Box sx={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${T.divider}`, borderRadius: R.item, boxShadow: T.soft, ...scrollbarSx }}>
                        {matchedEmployees.map(({ assignment, department }) => (
                          <Box
                            key={assignment.id}
                            onClick={() => handleOpenModal(department, assignment)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, cursor: 'pointer', borderBottom: `1px solid ${T.hairline}`, transition: 'background-color 0.13s', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: T.rowHover } }}
                          >
                            <Avatar sx={{ width: 30, height: 30, bgcolor: alpha(T.accent, 0.1), color: T.accent, fontSize: '0.72rem', fontWeight: 700 }}>
                              {(assignment.name || '?').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}>{assignment.name || 'Unknown'}</Typography>
                              <Typography noWrap sx={{ fontSize: '0.7rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>#{assignment.employeeNumber}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                              <Tooltip title={department.description || department.code}>
                                <Chip label={department.code} size="small" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(T.accent, 0.08), color: T.accent, borderRadius: R.tag, '& .MuiChip-label': { px: 0.9 } }} />
                              </Tooltip>
                              {assignment.budgetCode && (
                                <Tooltip title={isCategoryTarget(assignment.budgetType) ? 'Budget target: employment category' : 'Budget target: department'}>
                                  <Chip label={budgetChipLabel(assignment.budgetCode, assignment.budgetType)} size="small" sx={goldChipSx} />
                                </Tooltip>
                              )}
                              <Appendix33Badge status={chargeStatusOf(assignment)} compact />
                              <SetupFlags code={assignment.code} budgetCode={assignment.budgetCode} compact />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {viewMode === 'employees' ? (
                    <>
                      {/* Progress summary — each part filters the list */}
                      <Box sx={{ mb: 1.5, p: '10px 14px', borderRadius: R.item, border: `1px solid ${T.divider}`, bgcolor: T.canvas }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text }}>
                            {setupCounts[SETUP_COMPLETE]} of {setupTotal} employees done
                            <Box component="span" sx={{ fontWeight: 500, color: T.muted }}> — department code and budget both set</Box>
                          </Typography>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: T.ok, fontVariantNumeric: 'tabular-nums' }}>
                            {setupTotal ? Math.round((setupCounts[SETUP_COMPLETE] / setupTotal) * 100) : 0}%
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: T.canvasDeep, mb: 1 }}>
                          {[SETUP_COMPLETE, SETUP_DEPT_ONLY, SETUP_BUDGET_ONLY].map((s) => (
                            <Box key={s} sx={{ width: `${setupTotal ? (setupCounts[s] / setupTotal) * 100 : 0}%`, bgcolor: s === SETUP_COMPLETE ? T.ok : alpha(T.warn, s === SETUP_DEPT_ONLY ? 0.7 : 0.45) }} />
                          ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {[
                            [SETUP_COMPLETE, 'Done'],
                            [SETUP_DEPT_ONLY, 'Budget not set'],
                            [SETUP_BUDGET_ONLY, 'Department not set'],
                            [SETUP_NONE, 'Nothing set'],
                          ].map(([s, label]) => {
                            const active = filterSetup === s;
                            return (
                              <Box key={s} role="button" tabIndex={0}
                                onClick={() => setFilterSetup(active ? '' : s)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterSetup(active ? '' : s); } }}
                                sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.3, borderRadius: R.tag, cursor: 'pointer', userSelect: 'none',
                                  fontSize: '0.7rem', fontWeight: 700,
                                  color: active ? '#fff' : setupTone(s),
                                  bgcolor: active ? setupTone(s) : '#fff',
                                  border: `1px solid ${active ? setupTone(s) : T.divider}`,
                                  '&:hover': { borderColor: setupTone(s) },
                                  '&:focus-visible': { boxShadow: T.ring, outline: 'none' },
                                }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: active ? '#fff' : setupTone(s) }} />
                                {label}
                                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>{setupCounts[s]}</Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>

                      {filteredEmployeeStatus.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: T.muted, mb: 0.5 }}>No employees match</Typography>
                          <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>Try a different filter or search term.</Typography>
                        </Box>
                      ) : (
                        <>
                          <Box sx={{ px: 2, py: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,1.4fr) auto', gap: 1.5, alignItems: 'center', bgcolor: T.canvas, borderRadius: R.control, border: `1px solid ${T.hairline}`, mb: 1 }}>
                            {['Employee', 'Department', 'Budget', 'Appendix 33'].map((col) => (
                              <Typography key={col} sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.muted }}>{col}</Typography>
                            ))}
                          </Box>
                          {pagedEmployeeStatus.map((e, i) => {
                            const s = setupStatusOf(e.code, e.budgetCode);
                            const notSet = <Typography sx={{ fontSize: '0.72rem', color: T.faint, fontStyle: 'italic' }}>Not set</Typography>;
                            return (
                              <Box key={e.employeeNumber} role="button" tabIndex={0}
                                onClick={() => openEmployeeStatus(e)}
                                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openEmployeeStatus(e); } }}
                                title={e.assignmentId ? 'Open this assignment' : 'Load into the assign form'}
                                sx={{
                                  px: 2, py: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,1.4fr) auto', gap: 1.5, alignItems: 'center',
                                  borderRadius: R.control, cursor: 'pointer', outline: 'none',
                                  bgcolor: i % 2 === 0 ? T.rowEven : T.rowOdd,
                                  borderLeft: `3px solid ${setupTone(s)}`,
                                  transition: 'background-color 0.13s ease',
                                  '&:hover': { bgcolor: T.rowHover },
                                  '&:focus-visible': { boxShadow: T.ring },
                                }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                                  <SetupFlags code={e.code} budgetCode={e.budgetCode} compact />
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.text }}>{e.surnameFirst || e.name || 'Unknown'}</Typography>
                                    <Typography noWrap sx={{ fontSize: '0.68rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>#{e.employeeNumber}</Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  {e.code
                                    ? <Chip label={e.code} size="small" sx={{ height: 22, maxWidth: '100%', fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(T.accent, 0.08), color: T.accent, borderRadius: R.tag, '& .MuiChip-label': { px: 0.9 } }} />
                                    : notSet}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  {e.budgetCode
                                    ? <Chip label={budgetChipLabel(e.budgetCode, e.budgetType)} size="small" sx={{ ...goldChipSx, maxWidth: '100%' }} />
                                    : notSet}
                                </Box>
                                <Box sx={{ minWidth: 118, display: 'flex', justifyContent: 'flex-start' }}>
                                  {chargeStatusOf(e)
                                    ? <Appendix33Badge status={chargeStatusOf(e)} />
                                    : <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>—</Typography>}
                                </Box>
                              </Box>
                            );
                          })}
                        </>
                      )}
                    </>
                  ) : filteredDepartmentData.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: T.accentFaint, border: `1px dashed ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <DomainIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.35) }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: T.muted, mb: 0.5 }}>{data.length === 0 ? 'No assignments yet' : 'No departments match your search'}</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: T.faint }}>{data.length === 0 ? 'Use the form on the left to assign employees.' : 'Try a different search term.'}</Typography>
                    </Box>
                  ) : viewMode === 'grid' ? (
                    <Grid container spacing={1.5}>
                      {filteredDepartmentData.map((dept) => (
                        <Grid item xs={6} sm={4} md={2.4} key={dept.code}>
                          <DeptCard department={dept} onClick={() => handleOpenModal(dept)} />
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <>
                      <Box sx={{ px: 2, py: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center', bgcolor: T.canvas, borderRadius: R.control, border: `1px solid ${T.hairline}`, mb: 1 }}>
                        {['Department', 'Employees'].map((col) => (
                          <Typography key={col} sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.muted }}>{col}</Typography>
                        ))}
                      </Box>
                      {filteredDepartmentData.map((dept, i) => <DeptRow key={dept.code} department={dept} index={i} onClick={() => handleOpenModal(dept)} />)}
                    </>
                  )}
                </Box>

                {viewMode === 'employees' && filteredEmployeeStatus.length > 0 && (
                  <Box sx={{
                    px: 2.5, py: 1, borderTop: `1px solid ${T.divider}`, bgcolor: T.canvas, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                        {empPageStart + 1}–{empPageStart + pagedEmployeeStatus.length} of {filteredEmployeeStatus.length}
                      </Typography>
                      <FieldInput select size="small" value={empPageSize}
                        onChange={(ev) => setEmpPageSize(Number(ev.target.value))}
                        sx={{ width: 92, '& .MuiOutlinedInput-root': { fontSize: '0.75rem' }, '& .MuiSelect-select': { py: 0.5 } }}
                        inputProps={{ 'aria-label': 'Rows per page' }}>
                        {[25, 50, 100].map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
                      </FieldInput>
                    </Box>
                    <Pagination
                      count={empPageCount}
                      page={empPageSafe + 1}
                      onChange={(_, p) => {
                        setEmpPage(p - 1);
                        if (recordsScrollRef.current) recordsScrollRef.current.scrollTop = 0;
                      }}
                      size="small"
                      siblingCount={1}
                      sx={{
                        '& .MuiPaginationItem-root': { fontSize: '0.75rem', fontWeight: 600, color: T.muted },
                        '& .MuiPaginationItem-root.Mui-selected': { bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } },
                      }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* ══════════════════════════════════════════════════
              SPLIT-VIEW MODAL
          ══════════════════════════════════════════════════ */}
          <Modal
            open={modalOpen}
            onClose={handleCloseModal}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
            slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(30,10,10,0.5)', backdropFilter: 'blur(3px)' } } }}
          >
            <Fade in={modalOpen}>
              <Box
                sx={{
                  width: '95%',
                  maxWidth: '1100px',
                  height: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 32px 80px rgba(40,10,10,0.32)',
                  outline: 'none',
                  bgcolor: T.surface,
                }}
              >
                {selectedDepartment && (
                  <>
                    {/* Header */}
                    <ModalHeader
                      title={selectedDepartment.description || selectedDepartment.code}
                      chips={[selectedDepartment.code]}
                      subtitle={`${selectedDepartment.employees.length} ${selectedDepartment.employees.length === 1 ? 'member' : 'members'}`}
                      onClose={handleCloseModal}
                    />

                    {/* Split Body */}
                    <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden', bgcolor: '#fff' }}>

                      {/* ── Left Panel: Member List ── */}
                      <Box
                        sx={{
                          width: 300,
                          flexShrink: 0,
                          borderRight: `1px solid ${T.divider}`,
                          display: 'flex',
                          flexDirection: 'column',
                          bgcolor: T.canvas,
                        }}
                      >
                        <Box sx={{ p: 2, borderBottom: `1px solid ${T.divider}` }}>
                          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: T.text, mb: 1 }}>
                            Members
                          </Typography>
                          <FieldInput
                            size="small"
                            placeholder="Search members…"
                            value={modalMemberSearch}
                            onChange={(e) => setModalMemberSearch(e.target.value)}
                            fullWidth
                            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: T.muted, mr: 0.75 }} /> }}
                          />
                        </Box>

                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1, ...scrollbarSx }}>
                          {selectedDepartment.employees.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.82rem', color: T.faint }}>
                                No employees assigned.
                              </Typography>
                            </Box>
                          ) : filteredModalMembers.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.82rem', color: T.faint }}>
                                No matches found.
                              </Typography>
                            </Box>
                          ) : (
                            filteredModalMembers.map((emp) => {
                              const detail = deptEmpDetails[emp.employeeNumber];
                              const displayName = detail?.name || emp.name || 'Unknown';
                              const isSelected = editAssignment?.id === emp.id;
                              return (
                                <Box
                                  key={emp.id}
                                  onClick={async () => {
                                    setEditAssignment({ ...emp });
                                    setOriginalAssignment({ ...emp });
                                    setIsEditingModal(false);
                                    if (emp.employeeNumber) {
                                      try {
                                        const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${emp.employeeNumber}`, getAuthHeaders());
                                        setSelectedEditEmployee(r.data);
                                      } catch { setSelectedEditEmployee(null); }
                                    }
                                  }}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: R.item,
                                    mb: 0.5,
                                    cursor: 'pointer',
                                    border: `1px solid ${isSelected ? T.accentBorder : 'transparent'}`,
                                    borderLeft: `3px solid ${isSelected ? T.accent : 'transparent'}`,
                                    bgcolor: isSelected ? '#fff' : 'transparent',
                                    boxShadow: isSelected ? T.soft : 'none',
                                    transition: 'background-color 0.13s, border-color 0.13s, box-shadow 0.13s',
                                    '&:hover': { bgcolor: isSelected ? '#fff' : T.rowHover },
                                  }}
                                >
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      bgcolor: isSelected ? T.accent : 'rgba(0,0,0,0.08)',
                                      color: isSelected ? '#fff' : T.muted,
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      flexShrink: 0,
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    {displayName.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? T.accent : T.text }}>
                                      {displayName}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                                      #{emp.employeeNumber}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Appendix33Badge status={chargeStatusOf(emp)} compact />
                                    <SetupFlags code={emp.code} budgetCode={emp.budgetCode} compact />
                                  </Box>
                                </Box>
                              );
                            })
                          )}
                        </Box>
                      </Box>

                      {/* ── Right Panel: Detail / Edit Form ── */}
                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                        {editAssignment ? (
                          <>
                            {/* Fields */}
                            <Box sx={{ flexGrow: 1, overflowY: 'auto', ...scrollbarSx }}>

                              {/* ── Employee Hero Banner ── */}
                              <Box sx={{
                                px: 4, py: 3.25,
                                background: `linear-gradient(180deg, ${T.canvas} 0%, #fff 100%)`,
                                borderBottom: `1px solid ${T.divider}`,
                                display: 'flex', alignItems: 'center', gap: 3,
                              }}>
                                <Avatar sx={{
                                  width: 64, height: 64,
                                  background: T.headerGrad, color: '#fff',
                                  fontSize: '1.5rem', fontWeight: 700,
                                  flexShrink: 0,
                                  border: '3px solid #fff',
                                  boxShadow: `0 6px 18px ${alpha(T.accent, 0.3)}`,
                                }}>
                                  {(selectedEditEmployee?.name || editAssignment.name || '?').charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: T.accent, lineHeight: 1.2, mb: 0.6, letterSpacing: '-0.01em' }} noWrap>
                                    {selectedEditEmployee?.name || editAssignment.name || 'Unknown'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                      label={`#${editAssignment.employeeNumber}`}
                                      size="small"
                                      icon={<PersonIcon sx={{ fontSize: '12px !important', color: `${T.accent} !important` }} />}
                                      sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(T.accent, 0.08), color: T.accent, border: `1px solid ${alpha(T.accent, 0.2)}`, borderRadius: R.tag, '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                    {editAssignment.code && (
                                      <Chip
                                        label={editAssignment.code}
                                        size="small"
                                        icon={<DomainIcon sx={{ fontSize: '12px !important', color: `${T.accentMid} !important` }} />}
                                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(T.accent, 0.05), color: T.accentMid, border: `1px solid ${alpha(T.accent, 0.15)}`, borderRadius: R.tag, '& .MuiChip-label': { px: 0.75 } }}
                                      />
                                    )}
                                    {(() => {
                                      // The employee's own employment category (Employment Category module)
                                      const cat = empCatLabels[String(editAssignment.employeeNumber ?? '').trim()];
                                      const color = cat?.label ? hexColor(cat.colorHex) : T.faint;
                                      return (
                                        <Tooltip title="Employment category">
                                          <Chip
                                            label={cat?.label || 'No employment category'}
                                            size="small"
                                            icon={<Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cat?.label ? color : 'transparent', border: cat?.label ? 'none' : `1px dashed ${T.faint}`, ml: '8px !important' }} />}
                                            sx={{
                                              height: 22, fontSize: '0.68rem', fontWeight: 700, borderRadius: R.tag,
                                              bgcolor: cat?.label ? alpha(color, 0.08) : 'transparent',
                                              color: cat?.label ? T.text : T.faint,
                                              fontStyle: cat?.label ? 'normal' : 'italic',
                                              border: `1px ${cat?.label ? 'solid' : 'dashed'} ${cat?.label ? alpha(color, 0.35) : 'rgba(0,0,0,0.18)'}`,
                                              '& .MuiChip-label': { px: 0.75 },
                                            }}
                                          />
                                        </Tooltip>
                                      );
                                    })()}
                                    {editAssignment.budgetCode && (
                                      <Chip
                                        label={budgetChipLabel(editAssignment.budgetCode, editAssignment.budgetType)}
                                        size="small"
                                        icon={isCategoryTarget(editAssignment.budgetType)
                                          ? <CategoryIcon sx={{ fontSize: '12px !important', color: `${T.gold} !important` }} />
                                          : <DomainIcon sx={{ fontSize: '12px !important', color: `${T.gold} !important` }} />}
                                        sx={goldChipSx}
                                      />
                                    )}
                                    <Appendix33Badge status={chargeStatusOf(originalAssignment || editAssignment)} />
                                    <SetupFlags code={(originalAssignment || editAssignment).code} budgetCode={(originalAssignment || editAssignment).budgetCode} />
                                  </Box>
                                </Box>
                              </Box>

                              {/* ── Info Sections ── */}
                              <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3.25 }}>

                                {/* Department Code field */}
                                <Box>
                                  <FieldLabel>Department Code</FieldLabel>
                                  {isEditingModal ? (
                                    <Box>
                                      <DeptCodeAutocomplete
                                        value={editAssignment.code || ''}
                                        onChange={(val) => setEditAssignment((p) => ({ ...p, code: val }))}
                                        departmentList={departmentList}
                                      />
                                      {editAssignment.code && departmentList.find((d) => d.code === editAssignment.code)?.description && (
                                        <Typography sx={{ fontSize: '0.72rem', color: T.muted, mt: 0.6, ml: 0.5 }}>
                                          {departmentList.find((d) => d.code === editAssignment.code).description}
                                        </Typography>
                                      )}
                                    </Box>
                                  ) : (
                                    <Box sx={{
                                      p: '14px 18px', borderRadius: R.item,
                                      bgcolor: T.accentFaint,
                                      border: `1px solid ${T.accentBorder}`,
                                      borderLeft: `3px solid ${T.accent}`,
                                      display: 'flex', alignItems: 'center', gap: 2,
                                    }}>
                                      <IconTile size={38}><DomainIcon sx={{ fontSize: 19 }} /></IconTile>
                                      <Box>
                                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: T.accent, lineHeight: 1.2 }}>
                                          {editAssignment.code || 'Not set'}
                                        </Typography>
                                        {departmentList.find((d) => d.code === editAssignment.code)?.description && (
                                          <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, mt: 0.2 }}>
                                            {departmentList.find((d) => d.code === editAssignment.code).description}
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  )}
                                </Box>

                                {/* Budget Department field */}
                                <Box>
                                  <FieldLabel>Budget Department (Payroll Charge)</FieldLabel>
                                  {isEditingModal ? (
                                    <Box>
                                      <BudgetKindToggle
                                        value={editAssignment.budgetType}
                                        onChange={(v) => setEditAssignment((p) => ({
                                          ...p,
                                          budgetCode: '',
                                          budgetType: v,
                                        }))}
                                      />
                                      <BudgetTargetAutocomplete
                                        value={editAssignment.budgetCode || ''}
                                        onChange={(val) => setEditAssignment((p) => ({ ...p, budgetCode: val }))}
                                        kind={editAssignment.budgetType}
                                        options={budgetOptionsFor(editAssignment.budgetType)}
                                        scopesLoaded={budgetLoadedFor(editAssignment.budgetType)}
                                        scopesLoading={budgetLoadingFor(editAssignment.budgetType)}
                                        scopesError={budgetErrorFor(editAssignment.budgetType)}
                                        placeholder=""
                                      />
                                      {editBudgetWarning && (
                                        <Typography sx={{ fontSize: '0.7rem', color: T.warn, mt: 0.75, ml: 0.5, lineHeight: 1.45 }}>
                                          {editBudgetWarning}
                                        </Typography>
                                      )}
                                      <Appendix33Note
                                        status={editChargeStatus}
                                        target={editAssignment.budgetCode}
                                        noun={budgetTargetNoun(editAssignment.budgetType)}
                                       
                                      />
                                      <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.85, ml: 0.5, lineHeight: 1.5 }}>
                                        Optional. Two choices: <b>Department</b> (charge the pay to another office tab) or <b>Employment Category</b> (charge the pay to a category tab from the Employment Category set-up). This employee’s department above stays unchanged, and leaving it blank uses the department above.
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Box>
                                      <Box sx={{
                                        p: '14px 18px', borderRadius: R.item,
                                        bgcolor: editAssignment.budgetCode ? T.goldBg : '#fafafa',
                                        border: `1px solid ${editAssignment.budgetCode ? T.goldBorder : T.divider}`,
                                        display: 'flex', alignItems: 'center', gap: 2,
                                      }}>
                                        <IconTile size={38} tone="gold">
                                          {isCategoryTarget(editAssignment.budgetType)
                                            ? <CategoryIcon sx={{ fontSize: 19 }} />
                                            : <DomainIcon sx={{ fontSize: 19 }} />}
                                        </IconTile>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: editAssignment.budgetCode ? T.gold : T.muted, lineHeight: 1.2 }}>
                                            {editAssignment.budgetCode || 'Not set'}
                                          </Typography>
                                          <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.2 }}>
                                            {editAssignment.budgetCode
                                              ? `Pay is charged to this ${budgetTargetNoun(editAssignment.budgetType)} in the exported payroll`
                                              : 'No budget set — left out of the Appendix 33 export'}
                                          </Typography>
                                        </Box>
                                        <Appendix33Badge status={editChargeStatus} />
                                      </Box>
                                      {editBudgetWarning && (
                                        <Typography sx={{ fontSize: '0.75rem', color: T.warn, mt: 0.85, ml: 0.5, lineHeight: 1.45 }}>
                                          {editBudgetWarning}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                </Box>

                                {/* Employee field */}
                                <Box>
                                  <FieldLabel>Employee</FieldLabel>
                                  {isEditingModal ? (
                                    <Box>
                                      <SingleEmployeeAutocomplete
                                        value={editAssignment.employeeNumber || ''}
                                        onChange={(num) => setEditAssignment((p) => ({ ...p, employeeNumber: num }))}
                                        selectedEmployee={selectedEditEmployee}
                                        onEmployeeSelect={setSelectedEditEmployee}
                                        empCatLabels={empCatLabels}
                                      />
                                      {selectedEditEmployee && (
                                        <Box sx={{ mt: 1.5 }}>
                                          <EmployeeCard
                                            name={selectedEditEmployee.name}
                                            number={editAssignment.employeeNumber}
                                            trailing={
                                              <IconButton size="small" onClick={() => { setSelectedEditEmployee(null); setEditAssignment((p) => ({ ...p, employeeNumber: '' })); }} sx={{ color: T.danger, width: 24, height: 24, '&:hover': { bgcolor: 'rgba(198,40,40,0.1)' } }}>
                                                <Close sx={{ fontSize: 13 }} />
                                              </IconButton>
                                            }
                                          />
                                        </Box>
                                      )}
                                    </Box>
                                  ) : (
                                    <Box sx={{
                                      p: '14px 18px', borderRadius: R.item,
                                      bgcolor: '#fafafa',
                                      border: `1px solid ${T.divider}`,
                                      display: 'flex', alignItems: 'center', gap: 2,
                                    }}>
                                      <Avatar sx={{ width: 42, height: 42, bgcolor: T.accent, color: '#fff', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0 }}>
                                        {(selectedEditEmployee?.name || editAssignment.name || '?').charAt(0).toUpperCase()}
                                      </Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography noWrap sx={{ fontSize: '0.95rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                                          {selectedEditEmployee?.name || editAssignment.name || 'Unknown'}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', color: T.muted, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                                          Employee #{editAssignment.employeeNumber}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}
                                </Box>

                              </Box>
                            </Box>

                            {/* Footer Actions */}
                            <Box sx={{
                              px: 4, py: 2,
                              borderTop: `1px solid ${T.divider}`,
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: 1.5,
                              bgcolor: T.canvas,
                            }}>
                              {isEditingModal ? (
                                <>
                                  <AccentButton
                                    onClick={() => { setIsEditingModal(false); setEditAssignment({ ...originalAssignment }); setSelectedEditEmployee(null); }}
                                    variant="outlined"
                                    startIcon={<CancelIcon sx={{ fontSize: '15px !important' }} />}
                                    sx={{ fontSize: '0.82rem', px: 2, borderColor: T.accentBorder, color: T.muted, bgcolor: '#fff', '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                                  >
                                    Cancel
                                  </AccentButton>
                                  <AccentButton
                                    onClick={handleUpdate}
                                    variant="contained"
                                    startIcon={<SaveIcon sx={{ fontSize: '15px !important' }} />}
                                    disabled={!hasChanges() || !isBudgetTargetAllowed(editAssignment.budgetCode, editAssignment.budgetType)}
                                    sx={{ fontSize: '0.82rem', px: 2.25, bgcolor: '#639922', color: '#fff', '&:hover': { bgcolor: '#3B6D11' }, '&:disabled': { bgcolor: '#b9c7a5 !important', color: '#fff !important' } }}
                                  >
                                    Save Changes
                                  </AccentButton>
                                </>
                              ) : (
                                <>
                                  <AccentButton
                                    onClick={() => handleDelete(editAssignment.id)}
                                    variant="outlined"
                                    startIcon={<DeleteIcon sx={{ fontSize: '15px !important' }} />}
                                    sx={{ fontSize: '0.82rem', px: 2, bgcolor: '#fff', borderColor: '#e57373', color: T.danger, '&:hover': { bgcolor: 'rgba(198,40,40,0.06)', borderColor: T.danger } }}
                                  >
                                    Delete
                                  </AccentButton>
                                  <AccentButton
                                    onClick={() => setIsEditingModal(true)}
                                    variant="contained"
                                    startIcon={<EditIcon sx={{ fontSize: '15px !important' }} />}
                                    sx={{ fontSize: '0.82rem', px: 2.25, background: T.headerGrad, color: '#fff', '&:hover': { background: T.accentDark } }}
                                  >
                                    Edit
                                  </AccentButton>
                                </>
                              )}
                            </Box>
                          </>
                        ) : (
                          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 4 }}>
                            <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: T.accentFaint, border: `1px dashed ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <PersonIcon sx={{ fontSize: 28, color: alpha(T.accent, 0.35) }} />
                            </Box>
                            <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: T.muted }}>No member selected</Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: T.faint, textAlign: 'center' }}>
                              Select a member from the list to view their assignment details.
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>

            </Fade>
          </Modal>

          <LoadingOverlay open={loading} message="Processing assignment…" />
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />

          <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: T.pop }}>{snackbar.message}</Alert>
          </Snackbar>
        </Box>
      </Fade>
    </>
  );
};

export default DepartmentAssignment;