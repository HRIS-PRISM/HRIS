import API_BASE_URL from './apiConfig';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CircularProgress,
  CardHeader,
  Avatar,
  Tooltip,
  IconButton,
  InputAdornment,
  alpha,
  styled,
  Backdrop,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogContent,
  DialogActions,
  Collapse,
  Fade,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Palette as PaletteIcon,
  Image as ImageIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  CheckCircle,
  Error as ErrorIcon,
  Undo as UndoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  ColorLens as ColorLensIcon,
  Gradient as GradientIcon,
  Email as EmailIcon,
  Window as WindowIcon,
  AssignmentInd as AssignmentIndIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Lock as LockIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
} from '@mui/icons-material';
import axios from 'axios';

/* ─────────────────────────────────────────────────────────────────────────────
   THEME TOKENS  (mirrors PDSTemplates T object)
───────────────────────────────────────────────────────────────────────────── */
const T = {
  accent:       '#1e293b',
  accentDark:   '#0f172a',
  accentMid:    '#334155',
  accentFaint:  'rgba(30,41,59,0.05)',
  accentBorder: 'rgba(30,41,59,0.14)',
  accentHover:  'rgba(30,41,59,0.09)',
  rowOdd:       'rgba(30,41,59,0.025)',
  rowHover:     'rgba(30,41,59,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

/* ─── Global font import ──────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes ssShimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes ssPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }
  * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
`;

/* ─── Styled components ───────────────────────────────────────────────────── */

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#fff',
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  boxShadow: 'none',
  '&:hover':  { transform: 'translateY(-1px)', boxShadow: 'none' },
  '&:active': { transform: 'translateY(0)', boxShadow: 'none' },
});

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    backgroundColor: '#fff',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: T.accent },
  },
  '& .MuiInputLabel-root': { fontWeight: 500, color: T.muted, fontSize: '0.72rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
  '& .MuiInputBase-input': { fontSize: '0.82rem' },
}));

const ReadOnlyTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.025)',
    '& fieldset': { borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.15)' },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderStyle: 'dashed', borderColor: '#94a3b8' },
  },
  '& .MuiInputBase-input': { cursor: 'not-allowed', color: T.text, fontWeight: 500, fontSize: '0.82rem' },
  '& .MuiInputLabel-root': { fontWeight: 500, color: T.muted, fontSize: '0.72rem' },
}));

const ModernSelect = styled(Select)(() => ({
  borderRadius: 8,
  backgroundColor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.15)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
  '& .MuiSelect-select': { fontSize: '0.82rem' },
}));

const PreviewBox = styled(Box)(({ gradient, bgcolor }) => ({
  width: '100%',
  height: 52,
  borderRadius: 8,
  background: gradient || bgcolor || '#888',
  border: '0.5px solid rgba(0,0,0,0.09)',
  transition: 'background 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
}));

const PreviewLabel = styled(Typography)(() => ({
  color: '#fff',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontSize: '0.5rem',
  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  position: 'relative',
  zIndex: 1,
}));

const ColorSwatch = styled(Box)(({ swatchcolor }) => ({
  width: '100%',
  height: 34,
  borderRadius: 8,
  background: swatchcolor,
  border: '0.5px solid rgba(0,0,0,0.09)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  '&:hover': { borderColor: 'rgba(0,0,0,0.2)' },
}));

const ColorPickerWrapper = styled(Box)(({ color }) => ({
  position: 'relative',
  width: '100%',
  height: 34,
  borderRadius: 8,
  background: color,
  border: '0.5px solid rgba(0,0,0,0.09)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  transition: 'all 0.15s ease',
  '&:hover': {
    borderColor: 'rgba(0,0,0,0.2)',
  },
}));

/* ─── Shimmer Wireframe ───────────────────────────────────────────────────── */

const Shim = ({ w = '100%', h = 10, r = 4, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: `${r}px`, flexShrink: 0,
    background: 'linear-gradient(90deg,rgba(30,41,59,0.05) 25%,rgba(30,41,59,0.12) 50%,rgba(30,41,59,0.05) 75%)',
    backgroundSize: '800px 100%',
    animation: 'ssShimmer 1.6s infinite linear',
    ...sx,
  }} />
);

const SwatchShim = ({ delay = 0 }) => (
  <Box sx={{ animation: `ssPulse 2.2s ease-in-out ${delay}s infinite` }}>
    <Shim w="50%" h={8} r={3} sx={{ mb: 0.4 }} />
    <Shim w="100%" h={34} r={8} />
  </Box>
);

const FieldShim = ({ h = 36, labelW = '40%', delay = 0 }) => (
  <Box sx={{ animation: `ssPulse 2.2s ease-in-out ${delay}s infinite` }}>
    <Shim w={labelW} h={8} r={3} sx={{ mb: 0.35 }} />
    <Shim w="100%" h={h} r={8} />
  </Box>
);

const WireCard = ({ children, delay = 0 }) => (
  <Box sx={{
    borderRadius: 12, overflow: 'hidden',
    background: '#fff',
    border: '0.5px solid rgba(0,0,0,0.09)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    height: '100%',
    animation: `ssPulse 2.2s ease-in-out ${delay}s infinite`,
  }}>
    <Box sx={{
      px: 2.5, py: 1.25,
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      bgcolor: T.accentFaint,
      display: 'flex', alignItems: 'center', gap: 1,
      minHeight: 42,
    }}>
      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'rgba(30,41,59,0.2)' }} />
      <Shim w="45%" h={10} r={3} />
    </Box>
    <Box sx={{ p: 2.5 }}>{children}</Box>
  </Box>
);

const SystemSettingWireframe = () => (
  <>
    <style>{GLOBAL_CSS}</style>
    <Box sx={{ py: 3, minHeight: '100vh' }}>
      <Box sx={{ mb: 2, px: 3 }}>
        <Box sx={{
          borderRadius: 12, overflow: 'hidden', background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.09)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          animation: 'ssPulse 2.2s ease-in-out infinite',
        }}>
          <Box sx={{ px: 4, py: 3, background: 'linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)', display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(30,41,59,0.12)' }} />
            <Box>
              <Shim w={200} h={16} r={3} sx={{ mb: 0.5 }} />
              <Shim w={320} h={10} r={2} />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3 }}>
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={12} md={3} key={i} sx={{ display: 'flex' }}>
              <Box sx={{ width: '100%' }}>
                <WireCard delay={i * 0.05}>
                  <Grid container spacing={1.5}>
                    {Array.from({ length: i === 2 ? 4 : i === 3 ? 5 : 7 }).map((_, j) => (
                      <Grid item xs={12} sm={6} key={j}><SwatchShim delay={j * 0.04} /></Grid>
                    ))}
                  </Grid>
                </WireCard>
              </Box>
            </Grid>
          ))}
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} md={4} key={`b${i}`}>
              <WireCard delay={0.1 + i * 0.05}>
                <Grid container spacing={2}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Grid item xs={12} key={j}><FieldShim h={j === 0 ? 64 : 36} delay={j * 0.04} /></Grid>
                  ))}
                </Grid>
              </WireCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  </>
);

/* ─── Default values ──────────────────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  primaryColor:                '#1e293b',
  secondaryColor:              '#334155',
  accentColor:                 '#FFFFFF',
  textColor:                   '#FFFFFF',
  textPrimaryColor:            '#0f172a',
  textSecondaryColor:          '#FFFFFF',
  hoverColor:                  '#0f172a',
  backgroundColor:             '#FFFFFF',
  sidebarGradientEnd:          '#0f172a',
  institutionLogo:             '',
  hrisLogo:                    '',
  institutionName:             'Institution Name',
  institutionAddress:          'Institute Address',
  systemName:                  'Human Resources Information System',
  institutionAbbreviation:     'INST ABBREV',
  footerText:                  '2026 - HUMAN RESOURCES INFORMATION SYSTEM.  ALL RIGHTS RESERVED.',
  copyrightSymbol:             '©',
  enableWatermark:             true,
  actionButtonColor:           '#1e293b',
  actionButtonHoverColor:      '#334155',
  destructiveButtonColor:      '#64748b',
  destructiveButtonHoverColor: '#475569',
  modalBackgroundColor:        '#FFFFFF',
  modalHeaderColor:            '#1e293b',
  modalHeaderTextColor:        '#FFFFFF',
  modalBodyTextColor:          '#334155',
  modalBorderColor:            '#1e293b',
  adminEmail:                  'hrinformationsystemhris@gmail.com',
  certifierName:               'Default Certifier',
  certifierPosition:           'Default Position',
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const isLightColor = (hex = '#000') => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
};

/* ─── Shared panel header (mirrors PDSTemplates PanelHeader) ──────────────── */
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: 'flex', alignItems: 'center', gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: T.accent }}>
      {title}
    </Typography>
    {right && <><Box sx={{ flex: 1 }} />{right}</>}
  </Box>
);

/* ─── Color picker sub-components ────────────────────────────────────────── */
const ColorPickerItem = ({ label, field, value, onChange }) => {
  const color = value || '#888888';
  const light = isLightColor(color);
  return (
    <Box>
      <Typography sx={{ mb: 0.4, display: 'block', color: T.muted, fontWeight: 600, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</Typography>
      <Box sx={{ position: 'relative' }}>
        <ColorSwatch swatchcolor={color}>
          <Typography sx={{
            fontWeight: 600, pointerEvents: 'none',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
            color: light ? 'rgba(0,0,0,0.6)' : '#fff',
          }}>{color}</Typography>
        </ColorSwatch>
        <input type="color" value={color} onChange={(e) => onChange(field, e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
      </Box>
    </Box>
  );
};

const ColorInput = ({ label, field, value, onChange }) => {
  const color = value || '#888888';
  return (
    <Box>
      <Typography sx={{ mb: 0.4, display: 'block', fontWeight: 600, fontSize: '0.65rem', color: T.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</Typography>
      <ColorPickerWrapper color={color}>
        <input type="color" value={color} onChange={(e) => onChange(field, e.target.value)}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
        <Typography sx={{
          color: '#fff', fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)', zIndex: 1, pointerEvents: 'none',
        }}>{color}</Typography>
      </ColorPickerWrapper>
    </Box>
  );
};

/* ─── Section header with optional reset ─────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, subtitle, onReset, resetTitle, accentColor }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: 'flex', alignItems: 'center', gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: accentColor || T.accent }} />
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: accentColor || T.accent, lineHeight: 1.3 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: T.faint, fontSize: '0.68rem', lineHeight: 1.3 }}>{subtitle}</Typography>}
    </Box>
    {onReset && (
      <Tooltip title={resetTitle || 'Reset to default'}>
        <IconButton onClick={onReset} size="small"
          sx={{ color: T.muted, '&:hover': { color: T.accent, bgcolor: T.accentHover }, transition: 'all 0.15s ease', width: 26, height: 26 }}>
          <UndoIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
    )}
  </Box>
);

/* ─── Main component ──────────────────────────────────────────────────────── */
const SystemSetting = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalColors, setOriginalColors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const s = settings;

  const copyrightSymbols = [
    { value: '©', label: '© Copyright' },
    { value: '℗', label: '℗ Sound Recording' },
    { value: '®', label: '® Registered' },
    { value: '™', label: '™ Trademark' },
    { value: '℠', label: '℠ Service Mark' },
    { value: '§', label: '§ Section' },
    { value: '¶', label: '¶ Paragraph' },
    { value: '*', label: '* Asterisk' },
  ];

  useEffect(() => { fetchSettings(); }, []);
  useEffect(() => { localStorage.removeItem('systemSettings'); }, []);

  const MIGRATED_FIELDS = {
    accentColor:        { from: '#FEF9E1', to: '#FFFFFF' },
    textSecondaryColor: { from: '#FEF9E1', to: '#FFFFFF' },
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const url = API_BASE_URL.includes('/api') ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
      const response = await axios.get(url);
      const fetched = { ...response.data };
      Object.entries(MIGRATED_FIELDS).forEach(([field, { from, to }]) => {
        if (fetched[field] && fetched[field].toUpperCase() === from.toUpperCase()) fetched[field] = to;
      });
      const stored = localStorage.getItem('systemSettings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          let needsUpdate = false;
          Object.entries(MIGRATED_FIELDS).forEach(([field, { from, to }]) => {
            if (parsed[field] && parsed[field].toUpperCase() === from.toUpperCase()) { parsed[field] = to; needsUpdate = true; }
          });
          if (needsUpdate) localStorage.setItem('systemSettings', JSON.stringify(parsed));
        } catch { localStorage.removeItem('systemSettings'); }
      }
      setSettings((prev) => ({ ...prev, ...fetched }));
      const colorFields = ['primaryColor','secondaryColor','accentColor','textColor','textPrimaryColor','textSecondaryColor','hoverColor','backgroundColor','sidebarGradientEnd','actionButtonColor','actionButtonHoverColor','destructiveButtonColor','destructiveButtonHoverColor','modalBackgroundColor','modalHeaderColor','modalHeaderTextColor','modalBodyTextColor','modalBorderColor'];
      const orig = {};
      colorFields.forEach((f) => { orig[f] = fetched[f] || DEFAULT_SETTINGS[f]; });
      setOriginalColors(orig);
    } catch {
      setSnackbar({ open: true, message: 'Error loading settings. Using default values.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const setField = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));

  const handleSymbolChange = (value) => {
    const clean = s.footerText.replace(/^[©℗®™℠§¶*]\s*/, '');
    setSettings((prev) => ({ ...prev, copyrightSymbol: value, footerText: `${value} ${clean}` }));
  };

  const handleFooterTextChange = (value) => {
    const clean = value.replace(/^[©℗®™℠§¶*]\s*/, '');
    setField('footerText', `${s.copyrightSymbol} ${clean}`);
  };

  const handleLogoUpload = (field, event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setField(field, reader.result);
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = (field) => { setField(field, ''); };

  const handleSave = async () => {
    try {
      setSaving(true);
      const url = API_BASE_URL.includes('/api') ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
      await axios.put(url, settings);
      localStorage.setItem('systemSettings', JSON.stringify(settings));
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setSnackbar({ open: true, message: 'Error saving settings. Please try again.', severity: 'error' });
      setSaving(false);
    }
  };

  const executeReset = async () => {
    try {
      setSaving(true);
      const url = API_BASE_URL.includes('/api') ? `${API_BASE_URL}/system-settings/reset` : `${API_BASE_URL}/api/system-settings/reset`;
      await axios.post(url);
      localStorage.removeItem('systemSettings');
      setSnackbar({ open: true, message: 'Settings reset successfully!', severity: 'success' });
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setSnackbar({ open: true, message: 'Error resetting settings. Please try again.', severity: 'error' });
      setSaving(false);
    }
  };

  if (loading) return <SystemSettingWireframe />;

  return (
    <Fade in timeout={400}>
      <Box sx={{ py: 1, minHeight: '100vh', pb: 12 }}>
        <style>{GLOBAL_CSS}</style>

        {/* ── Page header (matches PDSTemplates gradient header) ── */}
        <Box sx={{ mb: 2, px: 3 }}>
          <SectionCard>
            <Box sx={{
              px: 4, py: 3,
              background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,41,59,0.08) 0%,transparent 70%)' }} />
              <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(30,41,59,0.05) 0%,transparent 70%)' }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                <SettingsIcon sx={{ fontSize: 28, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                    System Settings
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 600 }}>
                    Administrative Panel · Customize appearance and behavior of your HRIS system
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{
                  px: 2, py: 0.6, borderRadius: 5,
                  bgcolor: alpha(T.accent, 0.08),
                  border: `1px solid ${alpha(T.accent, 0.16)}`,
                }}>
                  <Typography sx={{ fontSize: '0.75rem', color: T.accent, fontWeight: 700 }}>
                    7 sections
                  </Typography>
                </Box>
              </Box>
            </Box>
          </SectionCard>
        </Box>

        <Box sx={{ px: 3 }}>
          <Grid container spacing={2}>

            {/* ── Color Palette ── */}
            <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
              <SectionCard sx={{ width: '100%' }}>
                <SectionHeader icon={PaletteIcon} title="Color Palette" subtitle="Core colors used throughout the system"
                  onReset={() => { setSettings((prev) => ({ ...prev, ...originalColors })); setSnackbar({ open: true, message: 'Colors reset to original values!', severity: 'success' }); }}
                  resetTitle="Reset colors to original values" />
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Header & Footer', field: 'secondaryColor' },
                      { label: 'Sidebar & Buttons', field: 'primaryColor' },
                      { label: 'Cards Background', field: 'accentColor' },
                      { label: 'Hover State', field: 'hoverColor' },
                      { label: 'Page Background', field: 'backgroundColor' },
                      { label: 'Primary Text', field: 'textPrimaryColor' },
                      { label: 'Secondary Text', field: 'textSecondaryColor' },
                    ].map(({ label, field }) => (
                      <Grid item xs={12} sm={6} key={field}>
                        <ColorPickerItem label={label} field={field} value={s[field]} onChange={setField} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── Sidebar Gradient ── */}
            <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
              <SectionCard sx={{ width: '100%' }}>
                <SectionHeader icon={GradientIcon} title="Sidebar Gradient" subtitle="Top-to-bottom navigation gradient"
                  onReset={() => { setSettings((prev) => ({ ...prev, primaryColor: '#1e293b', sidebarGradientEnd: '#0f172a' })); setSnackbar({ open: true, message: 'Sidebar gradient reset to default!', severity: 'success' }); }}
                  resetTitle="Reset sidebar gradient to default" />
                <Box sx={{ p: 2.5 }}>
                  <PreviewBox gradient={`linear-gradient(180deg, ${s.primaryColor} 0%, ${s.sidebarGradientEnd || '#0f172a'} 100%)`} sx={{ mb: 2 }}>
                    <PreviewLabel>SIDEBAR PREVIEW</PreviewLabel>
                  </PreviewBox>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerItem label="Gradient Start (Top)" field="primaryColor" value={s.primaryColor} onChange={setField} />
                      <Typography sx={{ mt: 0.4, display: 'block', color: T.faint, fontSize: '0.6rem' }}>Also applies to buttons &amp; containers</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerItem label="Gradient End (Bottom)" field="sidebarGradientEnd" value={s.sidebarGradientEnd} onChange={setField} />
                      <Typography sx={{ mt: 0.4, display: 'block', color: T.faint, fontSize: '0.6rem' }}>Bottom color of the sidebar</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── Action Button Colors ── */}
            <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
              <SectionCard sx={{ width: '100%' }}>
                <SectionHeader icon={ColorLensIcon} title="Action Button Colors" subtitle="Action and destructive button sets"
                  onReset={() => { setSettings((prev) => ({ ...prev, actionButtonColor: '#1e293b', actionButtonHoverColor: '#334155', destructiveButtonColor: '#64748b', destructiveButtonHoverColor: '#475569' })); setSnackbar({ open: true, message: 'Button colors reset to default!', severity: 'success' }); }}
                  resetTitle="Reset button colors to default" />
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    {[
                      { description: 'Add · Edit · View', icons: [<AddIcon sx={{ fontSize: 13 }} />, <EditIcon sx={{ fontSize: 13 }} />, <VisibilityIcon sx={{ fontSize: 13 }} />], colorField: 'actionButtonColor', hoverField: 'actionButtonHoverColor' },
                      { description: 'Delete · Cancel', icons: [<DeleteIcon sx={{ fontSize: 13 }} />, <CancelIcon sx={{ fontSize: 13 }} />], colorField: 'destructiveButtonColor', hoverField: 'destructiveButtonHoverColor' },
                    ].map(({ description, icons, colorField, hoverField }) => (
                      <Grid item xs={12} key={colorField}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.15 }}>
                          {icons.map((icon, i) => <Box key={i} sx={{ color: s[colorField], display: 'flex' }}>{icon}</Box>)}
                        </Box>
                        <Typography sx={{ mb: 1, display: 'block', color: T.faint, fontSize: '0.62rem' }}>{description}</Typography>
                        <PreviewBox gradient={`linear-gradient(135deg, ${s[colorField]} 0%, ${s[hoverField]} 100%)`} sx={{ mb: 1.5, height: 40 }}>
                          <PreviewLabel>NORMAL → HOVER</PreviewLabel>
                        </PreviewBox>
                        <Grid container spacing={1.5}>
                          <Grid item xs={6}><ColorInput label="Normal" field={colorField} value={s[colorField]} onChange={setField} /></Grid>
                          <Grid item xs={6}><ColorInput label="Hover" field={hoverField} value={s[hoverField]} onChange={setField} /></Grid>
                        </Grid>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── Modal Colors ── */}
            <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
              <SectionCard sx={{ width: '100%' }}>
                <SectionHeader icon={WindowIcon} title="Modal Colors" subtitle="Colors used in popup dialogs"
                  onReset={() => { setSettings((prev) => ({ ...prev, modalBackgroundColor: '#FFFFFF', modalHeaderColor: '#1e293b', modalHeaderTextColor: '#FFFFFF', modalBodyTextColor: '#334155', modalBorderColor: '#1e293b' })); setSnackbar({ open: true, message: 'Modal colors reset to default!', severity: 'success' }); }}
                  resetTitle="Reset modal colors to default" />
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Modal Background', field: 'modalBackgroundColor' },
                      { label: 'Header Background', field: 'modalHeaderColor' },
                      { label: 'Header Text', field: 'modalHeaderTextColor' },
                      { label: 'Body Text', field: 'modalBodyTextColor' },
                      { label: 'Border / Accent', field: 'modalBorderColor' },
                    ].map(({ label, field }) => (
                      <Grid item xs={12} sm={6} key={field}>
                        <ColorPickerItem label={label} field={field} value={s[field]} onChange={setField} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── Logos ── */}
            <Grid item xs={12} md={4}>
              <SectionCard sx={{ height: '100%' }}>
                <SectionHeader icon={ImageIcon} title="Logos" subtitle="Upload institution and system logos" />
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2.5}>
                    {[
                      { label: 'Institution Logo', field: 'institutionLogo', btnLabel: 'Upload Institution Logo', placeholderIcon: BusinessIcon },
                      { label: 'HRIS Logo', field: 'hrisLogo', btnLabel: 'Upload HRIS Logo', placeholderIcon: SettingsIcon },
                    ].map(({ label, field, btnLabel, placeholderIcon: PlaceholderIcon }) => (
                      <Grid item xs={12} key={field}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: T.text, fontSize: '0.8rem' }}>{label}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.75 }}>
                          <AccentButton variant="outlined" component="label"
                            startIcon={<UploadIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                              flexGrow: 1, height: 36,
                              borderColor: T.accentBorder, color: T.accent,
                              '&:hover': { backgroundColor: T.accentFaint, borderColor: T.accent, transform: 'none' },
                            }}>
                            {btnLabel}
                            <input type="file" hidden accept=".jpg,.jpeg,.png" onChange={(e) => handleLogoUpload(field, e)} />
                          </AccentButton>
                          {s[field] && (
                            <Tooltip title={`Remove ${label}`}>
                              <AccentButton variant="outlined" onClick={() => handleLogoRemove(field)}
                                sx={{
                                  minWidth: 'auto', px: 1, height: 36,
                                  borderColor: 'rgba(220,38,38,0.3)', color: '#dc2626',
                                  '&:hover': { backgroundColor: 'rgba(220,38,38,0.06)', borderColor: '#dc2626', transform: 'none' },
                                }}>
                                <RemoveCircleOutlineIcon sx={{ fontSize: 14 }} />
                              </AccentButton>
                            </Tooltip>
                          )}
                        </Box>
                        <Box sx={{
                          mt: 1.25, p: 1.5,
                          border: `1px dashed ${T.accentBorder}`,
                          borderRadius: 2, textAlign: 'center',
                          bgcolor: T.accentFaint,
                          display: 'flex', justifyContent: 'center',
                        }}>
                          {s[field] ? (
                            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                              <img src={s[field]} alt={`${label} Preview`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />
                              <Box onClick={() => handleLogoRemove(field)}
                                sx={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0)', cursor: 'pointer', transition: 'background 0.2s ease', '&:hover': { bgcolor: 'rgba(220,38,38,0.5)' }, '& .remove-icon': { opacity: 0, transition: 'opacity 0.2s ease' }, '&:hover .remove-icon': { opacity: 1 } }}>
                                <Box className="remove-icon" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.15 }}>
                                  <DeleteIcon sx={{ color: '#fff', fontSize: 20 }} />
                                  <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Remove</Typography>
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <Avatar sx={{ width: 72, height: 72, bgcolor: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', '& .MuiSvgIcon-root': { fontSize: 30, color: '#cbd5e1' } }}>
                              <PlaceholderIcon />
                            </Avatar>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── Institution Information ── */}
            <Grid item xs={12} md={4}>
              <SectionCard sx={{ height: '100%' }}>
                <SectionHeader icon={BusinessIcon} title="Institution Info" subtitle="Details shown on payslips and documents"
                  onReset={() => { setSettings((prev) => ({ ...prev, institutionName: DEFAULT_SETTINGS.institutionName, institutionAddress: DEFAULT_SETTINGS.institutionAddress, institutionAbbreviation: DEFAULT_SETTINGS.institutionAbbreviation })); setSnackbar({ open: true, message: 'Institution info reset to default!', severity: 'success' }); }}
                  resetTitle="Reset institution info to default" />
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    {[
                      { label: 'Institution Name', field: 'institutionName', icon: BusinessIcon, multiline: true, rows: 2 },
                      { label: 'Institution Address', field: 'institutionAddress', icon: LocationOnIcon, multiline: true, rows: 2 },
                      { label: 'Institution Abbreviation', field: 'institutionAbbreviation', icon: BusinessIcon },
                    ].map(({ label, field, icon: Icon, multiline, rows }) => (
                      <Grid item xs={12} key={field}>
                        <ModernTextField fullWidth label={label} value={s[field] || ''} onChange={(e) => setField(field, e.target.value)} multiline={multiline} rows={rows || 1}
                          InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment> }} />
                      </Grid>
                    ))}
                    <Grid item xs={12}>
                      <ReadOnlyTextField fullWidth label="System Name" value={s.systemName || ''} multiline rows={2}
                        InputProps={{
                          readOnly: true,
                          startAdornment: <InputAdornment position="start"><SettingsIcon sx={{ color: '#cbd5e1', fontSize: 16 }} /></InputAdornment>,
                          endAdornment: <InputAdornment position="end"><Tooltip title="This field is locked"><LockIcon sx={{ color: '#cbd5e1', fontSize: 14 }} /></Tooltip></InputAdornment>,
                        }} />
                    </Grid>
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── Footer & Certifier ── */}
            <Grid item xs={12} md={4}>
              <SectionCard sx={{ height: '100%' }}>
                <SectionHeader icon={DescriptionIcon} title="Footer & Certifier" subtitle="Footer text, copyright, email, and certifier"
                  onReset={() => { setSettings((prev) => ({ ...prev, certifierName: DEFAULT_SETTINGS.certifierName, certifierPosition: DEFAULT_SETTINGS.certifierPosition, adminEmail: DEFAULT_SETTINGS.adminEmail, footerText: DEFAULT_SETTINGS.footerText, copyrightSymbol: DEFAULT_SETTINGS.copyrightSymbol })); setSnackbar({ open: true, message: 'Footer & certifier info reset to default!', severity: 'success' }); }}
                  resetTitle="Reset footer & certifier to default" />
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ fontWeight: 500, color: T.muted, fontSize: '0.72rem' }}>Copyright Symbol</InputLabel>
                        <ModernSelect value={s.copyrightSymbol} label="Copyright Symbol" onChange={(e) => handleSymbolChange(e.target.value)}
                          startAdornment={<InputAdornment position="start"><DescriptionIcon sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment>}>
                          {copyrightSymbols.map((sym) => <MenuItem key={sym.value} value={sym.value} sx={{ color: T.text, fontSize: '0.78rem' }}>{sym.label}</MenuItem>)}
                        </ModernSelect>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <ModernTextField fullWidth label="Footer Text" value={s.footerText} onChange={(e) => handleFooterTextChange(e.target.value)} multiline rows={2}
                        InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment> }} />
                      <Typography sx={{ mt: 0.4, display: 'block', color: T.faint, fontSize: '0.6rem' }}>Symbol is automatically prepended.</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <ModernTextField fullWidth label="Admin Contact Email" value={s.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} type="email"
                        InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment> }}
                        helperText={<Typography variant="caption" sx={{ color: T.faint, fontSize: '0.6rem' }}>Used for the Gmail icon link in the footer.</Typography>} />
                    </Grid>

                    {/* Certifier divider */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.5, borderTop: `1px solid ${T.divider}` }}>
                        <AssignmentIndIcon sx={{ color: T.accent, fontSize: 15 }} />
                        <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: '0.72rem' }}>Payslip Certifier</Typography>
                      </Box>
                      <Typography sx={{ color: T.faint, fontSize: '0.62rem' }}>Name and position printed at the bottom of every payslip</Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <ModernTextField fullWidth label="Certifier Name" value={s.certifierName || ''} onChange={(e) => setField('certifierName', e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={12}>
                      <ModernTextField fullWidth label="Certifier Position" value={s.certifierPosition || ''} onChange={(e) => setField('certifierPosition', e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon sx={{ color: T.muted, fontSize: 16 }} /></InputAdornment> }} />
                    </Grid>

                    {/* Footer preview */}
                    <Grid item xs={12}>
                      <PreviewBox bgcolor={s.secondaryColor} sx={{ height: 38, gap: 0.5 }}>
                        <PreviewLabel sx={{ fontSize: '0.44rem', textAlign: 'center', px: 1.5, flexGrow: 1 }}>{s.footerText}</PreviewLabel>
                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1, flexShrink: 0 }}>
                          <EmailIcon sx={{ fontSize: 9, color: '#fff' }} />
                        </Box>
                      </PreviewBox>
                      <Typography sx={{ mt: 0.4, display: 'block', color: T.faint, fontSize: '0.6rem', textAlign: 'center' }}>Footer preview</Typography>
                    </Grid>

                    {/* Certifier preview */}
                    <Grid item xs={12}>
                      <Box sx={{ p: 1.5, border: `0.5px solid ${T.divider}`, borderRadius: 2, textAlign: 'center', bgcolor: '#fff' }}>
                        <Typography sx={{ fontSize: '0.58rem', color: T.faint, mb: 0.15, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Certified Correct</Typography>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.text }}>{s.certifierName || '—'}</Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: T.muted, fontWeight: 500, mt: 0.1 }}>{s.certifierPosition || '—'}</Typography>
                      </Box>
                      <Typography sx={{ mt: 0.4, display: 'block', color: T.faint, fontSize: '0.6rem', textAlign: 'center' }}>Payslip footer preview</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </SectionCard>
            </Grid>

          </Grid>
        </Box>

        {/* ── Floating Action Bar (structure unchanged, style unified) ── */}
        <Box sx={{
          position: 'fixed', bottom: 60, right: 28, zIndex: 1200,
          display: 'flex', alignItems: 'center', gap: 0.75,
          px: 1.5, py: 0.75,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
          border: '0.5px solid rgba(0,0,0,0.09)',
          transition: 'box-shadow 0.2s ease',
          '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.1)' },
        }}>
          <Typography sx={{ color: T.muted, fontWeight: 600, fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase', userSelect: 'none' }}>
            System Settings
          </Typography>
          <Box sx={{ width: '1px', height: 16, bgcolor: T.divider, mx: 0.25 }} />

          {/* Reset — ghost/outlined, clearly secondary */}
          <AccentButton
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: '13px !important' }} />}
            onClick={() => setConfirmResetOpen(true)}
            disabled={saving}
            size="small"
            sx={{
              height: 30, px: 1.25,
              borderColor: 'rgba(220,38,38,0.35)',
              color: '#dc2626',
              fontSize: '0.72rem',
              '&:hover': {
                backgroundColor: 'rgba(220,38,38,0.06)',
                borderColor: '#dc2626',
                transform: 'none',
              },
            }}
          >
            Reset
          </AccentButton>

          {/* Save — solid filled, primary action */}
          <AccentButton
            variant="contained"
            startIcon={saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '13px !important' }} />}
            onClick={handleSave}
            disabled={saving}
            size="small"
            sx={{
              height: 30, px: 1.5,
              bgcolor: T.accent,
              color: '#fff',
              fontSize: '0.72rem',
              boxShadow: `0 2px 10px ${alpha(T.accent, 0.28)}`,
              '&:hover': { bgcolor: T.accentDark, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`, transform: 'translateY(-1px)' },
              '&:disabled': { bgcolor: '#d8d8d8 !important', color: '#999 !important', boxShadow: 'none !important', transform: 'none !important' },
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </AccentButton>
        </Box>

        {/* ── Saving backdrop ── */}
        <Backdrop sx={{ bgcolor: 'rgba(15,23,42,0.4)', zIndex: (t) => t.zIndex.drawer + 1 }} open={saving}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={32} thickness={3.5} sx={{ color: '#fff' }} />
            <Typography sx={{ mt: 1.5, color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}>Saving settings…</Typography>
          </Box>
        </Backdrop>

        {/* ── Confirm reset dialog ── */}
        <Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '0.5px solid rgba(0,0,0,0.09)', overflow: 'hidden' } }}>
          <Box sx={{
            px: 2.5, py: 1.5,
            bgcolor: T.accent,
            display: 'flex', alignItems: 'center', gap: 1,
          }}>
            <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshIcon sx={{ color: '#fff', fontSize: 14 }} />
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem' }}>Confirm Reset</Typography>
          </Box>
          <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ color: T.text, fontSize: '0.82rem', lineHeight: 1.6 }}>
              Are you sure you want to reset all settings to their defaults? This cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2, gap: 0.75 }}>
            <AccentButton variant="outlined" onClick={() => setConfirmResetOpen(false)}
              sx={{ borderColor: T.accentBorder, color: T.muted, '&:hover': { backgroundColor: T.accentFaint, color: T.text, transform: 'none' } }}>
              Cancel
            </AccentButton>
            <AccentButton variant="contained" onClick={() => { setConfirmResetOpen(false); executeReset(); }}
              sx={{ bgcolor: T.accent, color: '#fff', '&:hover': { bgcolor: T.accentDark } }}>
              Reset Defaults
            </AccentButton>
          </DialogActions>
        </Dialog>

        {/* ── Snackbar ── */}
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity}
            sx={{ width: '100%', borderRadius: 2, fontWeight: 500, fontSize: '0.78rem' }}
            icon={snackbar.severity === 'success' ? <CheckCircle /> : <ErrorIcon />}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default SystemSetting;