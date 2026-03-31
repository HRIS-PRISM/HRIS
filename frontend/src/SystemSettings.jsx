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
  VerifiedUser as VerifiedUserIcon,
  AssignmentInd as AssignmentIndIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Lock as LockIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
} from '@mui/icons-material';
import axios from 'axios';

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
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

const BD     = "#e2e8f0";
const SUBTLE = "#f8fafc";
const MUTED  = "#64748b";
const TXT    = "#0f172a";

/* ── Styled components ──────────────────────────────────────────────────────── */

const GlassCard = styled(Card)(() => ({
  borderRadius: 8,
  background: '#ffffff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  border: `1px solid ${BD}`,
  overflow: 'visible',
  transition: 'box-shadow 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  },
}));

const ProfessionalButton = styled(Button)(({ variant: v }) => ({
  borderRadius: 6,
  fontWeight: 600,
  padding: '6px 12px',
  transition: 'all 0.15s ease',
  textTransform: 'none',
  fontSize: '0.75rem',
  letterSpacing: '0',
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
  '&:active': { transform: 'none' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 6,
    transition: 'border-color 0.15s ease',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: BD },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused': { boxShadow: 'none', backgroundColor: '#fff' },
  },
  '& .MuiInputLabel-root': { fontWeight: 500, color: MUTED, fontSize: '0.72rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: TXT },
  '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.15s ease' },
  '& .MuiInputBase-input': { fontSize: '0.78rem', py: '8px', px: '10px' },
}));

const ReadOnlyTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 6,
    backgroundColor: SUBTLE,
    cursor: 'not-allowed',
    '& fieldset': { borderStyle: 'dashed', borderColor: BD },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderStyle: 'dashed', borderColor: '#94a3b8' },
  },
  '& .MuiInputBase-input': { cursor: 'not-allowed', color: TXT, fontWeight: 500, fontSize: '0.78rem', py: '8px', px: '10px' },
  '& .MuiInputLabel-root': { fontWeight: 500, color: MUTED, fontSize: '0.72rem' },
}));

const ModernSelect = styled(Select)(() => ({
  borderRadius: 6,
  backgroundColor: '#fff',
  transition: 'border-color 0.15s ease',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: BD, transition: 'border-color 0.15s ease' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
  '& .MuiSelect-select': { fontSize: '0.78rem', py: '8px' },
}));

const PreviewBox = styled(Box)(({ gradient, bgcolor }) => ({
  width: '100%',
  height: 56,
  borderRadius: 6,
  background: gradient || bgcolor || '#888',
  border: `1px solid ${BD}`,
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
  fontSize: '0.52rem',
  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  position: 'relative',
  zIndex: 1,
}));

const ColorSwatch = styled(Box)(({ swatchcolor }) => ({
  width: '100%',
  height: 36,
  borderRadius: 6,
  background: swatchcolor,
  border: `1px solid ${BD}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  '&:hover': { borderColor: '#94a3b8' },
}));

const ColorPickerWrapper = styled(Box)(({ color }) => ({
  position: 'relative',
  width: '100%',
  height: 36,
  borderRadius: 6,
  background: color,
  border: `1px solid ${BD}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  transition: 'all 0.15s ease',
  '&:hover': {
    boxShadow: `0 2px 6px ${alpha(color || '#888', 0.3)}`,
    borderColor: '#94a3b8',
  },
}));

const cardContentSx = (accentColor) => ({ p: 2.5, bgcolor: accentColor || '#fff', overflow: 'visible' });

const sectionHeaderSx = () => ({
  bgcolor: '#fff',
  pb: 1,
  borderBottom: `1px solid ${BD}`,
  '& .MuiCardHeader-content': { flex: 1 },
});

/* ── Shimmer / Wireframe ─────────────────────────────────────────────────────── */

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
    <Shim w="100%" h={36} r={6} />
  </Box>
);

const FieldShim = ({ h = 36, labelW = '40%', delay = 0 }) => (
  <Box sx={{ animation: `ssPulse 2.2s ease-in-out ${delay}s infinite` }}>
    <Shim w={labelW} h={8} r={3} sx={{ mb: 0.35 }} />
    <Shim w="100%" h={h} r={6} />
  </Box>
);

const WireCard = ({ children, delay = 0, sx: extraSx = {} }) => (
  <Box sx={{
    borderRadius: 8, overflow: 'hidden',
    background: '#fff', border: `1px solid ${BD}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    height: '100%',
    animation: `ssPulse 2.2s ease-in-out ${delay}s infinite`,
    ...extraSx,
  }}>
    <Box sx={{
      px: 2.5, py: 1.5,
      borderBottom: `1px solid ${BD}`,
      display: 'flex', alignItems: 'center', gap: 1,
    }}>
      <Box sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: SUBTLE, border: `1px solid ${BD}`, flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1 }}>
        <Shim w="38%" h={10} r={3} sx={{ mb: 0.35 }} />
        <Shim w="58%" h={7} r={2} />
      </Box>
    </Box>
    <Box sx={{ p: 2.5 }}>{children}</Box>
  </Box>
);

const SystemSettingWireframe = () => (
  <>
    <style>{GLOBAL_CSS}</style>
    <Box sx={{ py: 3, minHeight: '100vh' }}>
      <Box sx={{ mb: 2.5, px: 3 }}>
        <Box sx={{
          borderRadius: 8, overflow: 'hidden', background: '#fff',
          border: `1px solid ${BD}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          animation: 'ssPulse 2.2s ease-in-out infinite',
        }}>
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: SUBTLE, border: `1px solid ${BD}`, flexShrink: 0 }} />
            <Box>
              <Shim w={160} h={16} r={3} sx={{ mb: 0.5 }} />
              <Shim w={220} h={9} r={2} />
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0}>
                <Grid container spacing={1.5}>
                  {[0,1,2,3,4,5,6].map((i) => (
                    <Grid item xs={12} sm={6} key={i}><SwatchShim delay={i * 0.04} /></Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0.05}>
                <Shim w="100%" h={56} r={6} sx={{ mb: 2 }} />
                <Grid container spacing={1.5}>
                  {[0,1].map((i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <SwatchShim delay={0.05 + i * 0.03} />
                      <Shim w="65%" h={7} r={2} sx={{ mt: 0.35 }} />
                    </Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0.08}>
                <Grid container spacing={2}>
                  {[0,1].map((g) => (
                    <Grid item xs={12} key={g}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.35 }}>
                        {Array.from({ length: g === 0 ? 3 : 2 }).map((_, j) => (
                          <Box key={j} sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: SUBTLE, border: `1px solid ${BD}`, flexShrink: 0 }} />
                        ))}
                        <Shim w="28%" h={9} r={2} />
                      </Box>
                      <Shim w="52%" h={7} r={2} sx={{ mb: 1.5 }} />
                      <Shim w="100%" h={48} r={6} sx={{ mb: 1.5 }} />
                      <Grid container spacing={1.5}>
                        <Grid item xs={6}><SwatchShim delay={0.08 + g * 0.04} /></Grid>
                        <Grid item xs={6}><SwatchShim delay={0.12 + g * 0.04} /></Grid>
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0.11}>
                <Grid container spacing={1.5}>
                  {[0,1,2,3,4].map((i) => (
                    <Grid item xs={12} sm={6} key={i}><SwatchShim delay={i * 0.04} /></Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <WireCard delay={0.03}>
              <Grid container spacing={2}>
                {[0,1].map((i) => (
                  <Grid item xs={12} key={i}>
                    <Shim w="32%" h={10} r={3} sx={{ mb: 1 }} />
                    <Shim w="100%" h={36} r={6} sx={{ mb: 1.5 }} />
                    <Box sx={{ p: 1.5, border: `1px dashed ${BD}`, borderRadius: 2, display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: SUBTLE, border: `1px solid ${BD}` }} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </WireCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <WireCard delay={0.06}>
              <Grid container spacing={2}>
                <Grid item xs={12}><FieldShim h={64} labelW="36%" delay={0} /></Grid>
                <Grid item xs={12}><FieldShim h={48} labelW="32%" delay={0.03} /></Grid>
                <Grid item xs={12}><FieldShim h={36} labelW="42%" delay={0.05} /></Grid>
                <Grid item xs={12}><FieldShim h={36} labelW="28%" delay={0.07} /></Grid>
              </Grid>
            </WireCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <WireCard delay={0.09}>
              <Grid container spacing={2}>
                <Grid item xs={12}><FieldShim h={36} labelW="26%" delay={0} /></Grid>
                <Grid item xs={12}><FieldShim h={64} labelW="22%" delay={0.03} /></Grid>
                <Grid item xs={12}><FieldShim h={36} labelW="38%" delay={0.05} /></Grid>
                <Grid item xs={12}><FieldShim h={36} labelW="28%" delay={0.07} /></Grid>
                <Grid item xs={12}><FieldShim h={36} labelW="32%" delay={0.09} /></Grid>
                <Grid item xs={12}>
                  <Shim w="100%" h={40} r={6} sx={{ bgcolor: 'rgba(30,41,59,0.06)', background: 'none', animation: 'none' }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 1.5, border: `1px solid ${BD}`, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.35 }}>
                    <Shim w="28%" h={7} r={2} />
                    <Shim w="38%" h={12} r={3} />
                    <Shim w="32%" h={7} r={2} />
                  </Box>
                </Grid>
              </Grid>
            </WireCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  </>
);

// ── Default values ────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const isLightColor = (hex = '#000') => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
};

// ── Color picker sub-components ───────────────────────────────────────────────
const ColorPickerItem = ({ label, field, value, onChange }) => {
  const color = value || '#888888';
  const light = isLightColor(color);
  return (
    <Box>
      <Typography variant="caption" sx={{ mb: 0.35, display: 'block', color: MUTED, fontWeight: 500, fontSize: '0.65rem' }}>{label}</Typography>
      <Box sx={{ position: 'relative' }}>
        <ColorSwatch swatchcolor={color}>
          <Typography variant="caption" sx={{
            fontWeight: 600, pointerEvents: 'none',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
            color: light ? 'rgba(0,0,0,0.6)' : '#fff',
          }}>{color}</Typography>
        </ColorSwatch>
        <input type="color" value={color} onChange={(e) => onChange(field, e.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
      </Box>
    </Box>
  );
};

const ColorInput = ({ label, field, value, onChange }) => {
  const color = value || '#888888';
  return (
    <Box>
      <Typography variant="caption" sx={{ mb: 0.35, display: 'block', fontWeight: 500, fontSize: '0.65rem', color: MUTED }}>{label}</Typography>
      <ColorPickerWrapper color={color}>
        <input type="color" value={color} onChange={(e) => onChange(field, e.target.value)} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
        <Typography variant="caption" sx={{
          color: '#fff', fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)', zIndex: 1, pointerEvents: 'none',
        }}>{color}</Typography>
      </ColorPickerWrapper>
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
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

  const SectionHeader = ({ icon: Icon, title, subtitle, onReset, resetTitle }) => (
    <CardHeader
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: alpha(s.primaryColor, 0.08), width: 30, height: 30, '& .MuiSvgIcon-root': { fontSize: 15, color: s.primaryColor } }}><Icon /></Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 600, color: TXT, fontSize: '0.8rem', lineHeight: 1.3 }}>{title}</Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.65rem', lineHeight: 1.3 }}>{subtitle}</Typography>
          </Box>
          {onReset && (
            <Tooltip title={resetTitle || 'Reset to default'}>
              <IconButton onClick={onReset} size="small" sx={{ color: MUTED, '&:hover': { color: TXT, bgcolor: SUBTLE }, transition: 'all 0.15s ease' }}>
                <UndoIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      }
      sx={sectionHeaderSx()}
    />
  );

  return (
    <Box sx={{ py: 3, minHeight: '100vh', pb: 12 }}>
      <style>{GLOBAL_CSS}</style>

      {/* Page Header */}
      <Box sx={{ mb: 2.5, px: 3 }}>
        <GlassCard sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: { xs: 2.5, md: 3 }, bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(s.primaryColor, 0.08), width: 40, height: 40, '& .MuiSvgIcon-root': { fontSize: 20, color: s.primaryColor } }}>
                <SettingsIcon />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, lineHeight: 1.2, color: TXT, letterSpacing: '-0.02em', fontSize: '1.1rem' }}>System Settings</Typography>
                <Typography sx={{ color: MUTED, fontSize: '0.75rem' }}>Customize the appearance and behavior of your HRIS system</Typography>
              </Box>
            </Box>
          </Box>
        </GlassCard>
      </Box>

      <Box sx={{ px: 3 }}>
        <Grid container spacing={2}>

          {/* Color Palette */}
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <GlassCard sx={{ width: '100%' }}>
              <SectionHeader icon={PaletteIcon} title="Color Palette" subtitle="Core colors used throughout the system"
                onReset={() => { setSettings((prev) => ({ ...prev, ...originalColors })); setSnackbar({ open: true, message: 'Colors reset to original values!', severity: 'success' }); }}
                resetTitle="Reset colors to original values" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Header & Footer', field: 'secondaryColor' },
                    { label: 'Sidebar, Buttons & Containers', field: 'primaryColor' },
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
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Sidebar Gradient */}
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <GlassCard sx={{ width: '100%' }}>
              <SectionHeader icon={GradientIcon} title="Sidebar Gradient" subtitle="Top-to-bottom gradient for the navigation sidebar"
                onReset={() => { setSettings((prev) => ({ ...prev, primaryColor: '#1e293b', sidebarGradientEnd: '#0f172a' })); setSnackbar({ open: true, message: 'Sidebar gradient reset to default!', severity: 'success' }); }}
                resetTitle="Reset sidebar gradient to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <PreviewBox gradient={`linear-gradient(180deg, ${s.primaryColor} 0%, ${s.sidebarGradientEnd || '#0f172a'} 100%)`} sx={{ mb: 2 }}>
                  <PreviewLabel>SIDEBAR PREVIEW</PreviewLabel>
                </PreviewBox>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <ColorPickerItem label="Gradient Start (Top)" field="primaryColor" value={s.primaryColor} onChange={setField} />
                    <Typography variant="caption" sx={{ mt: 0.35, display: 'block', color: MUTED, fontSize: '0.58rem' }}>Also applies to buttons & containers</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <ColorPickerItem label="Gradient End (Bottom)" field="sidebarGradientEnd" value={s.sidebarGradientEnd} onChange={setField} />
                    <Typography variant="caption" sx={{ mt: 0.35, display: 'block', color: MUTED, fontSize: '0.58rem' }}>Bottom color of the sidebar</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Action Button Colors */}
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <GlassCard sx={{ width: '100%' }}>
              <SectionHeader icon={ColorLensIcon} title="Action Button Colors" subtitle="Action and destructive button color sets"
                onReset={() => { setSettings((prev) => ({ ...prev, actionButtonColor: '#1e293b', actionButtonHoverColor: '#334155', destructiveButtonColor: '#64748b', destructiveButtonHoverColor: '#475569' })); setSnackbar({ open: true, message: 'Button colors reset to default!', severity: 'success' }); }}
                resetTitle="Reset button colors to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={2}>
                  {[
                    { description: 'Add · Edit · View', icons: [<AddIcon sx={{ fontSize: 13 }} />, <EditIcon sx={{ fontSize: 13 }} />, <VisibilityIcon sx={{ fontSize: 13 }} />], colorField: 'actionButtonColor', hoverField: 'actionButtonHoverColor' },
                    { description: 'Delete · Cancel', icons: [<DeleteIcon sx={{ fontSize: 13 }} />, <CancelIcon sx={{ fontSize: 13 }} />], colorField: 'destructiveButtonColor', hoverField: 'destructiveButtonHoverColor' },
                  ].map(({ description, icons, colorField, hoverField }) => (
                    <Grid item xs={12} key={colorField}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.15 }}>
                        {icons.map((icon, i) => <Box key={i} sx={{ color: s[colorField], display: 'flex' }}>{icon}</Box>)}
                      </Box>
                      <Typography variant="caption" sx={{ mb: 1, display: 'block', color: MUTED, fontSize: '0.6rem' }}>{description}</Typography>
                      <PreviewBox gradient={`linear-gradient(135deg, ${s[colorField]} 0%, ${s[hoverField]} 100%)`} sx={{ mb: 1.5, height: 44 }}>
                        <PreviewLabel>NORMAL → HOVER</PreviewLabel>
                      </PreviewBox>
                      <Grid container spacing={1.5}>
                        <Grid item xs={6}><ColorInput label="Normal" field={colorField} value={s[colorField]} onChange={setField} /></Grid>
                        <Grid item xs={6}><ColorInput label="Hover" field={hoverField} value={s[hoverField]} onChange={setField} /></Grid>
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Modal Colors */}
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <GlassCard sx={{ width: '100%' }}>
              <SectionHeader icon={WindowIcon} title="Modal Colors" subtitle="Colors used in popup dialogs"
                onReset={() => { setSettings((prev) => ({ ...prev, modalBackgroundColor: '#FFFFFF', modalHeaderColor: '#1e293b', modalHeaderTextColor: '#FFFFFF', modalBodyTextColor: '#334155', modalBorderColor: '#1e293b' })); setSnackbar({ open: true, message: 'Modal colors reset to default!', severity: 'success' }); }}
                resetTitle="Reset modal colors to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
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
              </CardContent>
            </GlassCard>
          </Grid>

          {/* ── Logos ── */}
          <Grid item xs={12} md={4}>
            <GlassCard sx={{ height: '100%' }}>
              <SectionHeader icon={ImageIcon} title="Logos" subtitle="Upload institution and system logos" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Institution Logo', field: 'institutionLogo', btnLabel: 'Upload Institution Logo', placeholderIcon: BusinessIcon },
                    { label: 'HRIS Logo', field: 'hrisLogo', btnLabel: 'Upload HRIS Logo', placeholderIcon: SettingsIcon },
                  ].map(({ label, field, btnLabel, placeholderIcon: PlaceholderIcon }) => (
                    <Grid item xs={12} key={field}>
                      <Typography sx={{ mb: 0.75, fontWeight: 600, color: TXT, fontSize: '0.78rem' }}>{label}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <ProfessionalButton variant="outlined" component="label" startIcon={<UploadIcon sx={{ fontSize: 14 }} />}
                          sx={{ flexGrow: 1, borderColor: BD, color: TXT, '&:hover': { backgroundColor: SUBTLE, borderColor: '#94a3b8' } }}>
                          {btnLabel}
                          <input type="file" hidden accept=".jpg,.jpeg,.png" onChange={(e) => handleLogoUpload(field, e)} />
                        </ProfessionalButton>
                        {s[field] && (
                          <Tooltip title={`Remove ${label}`}>
                            <ProfessionalButton variant="outlined" onClick={() => handleLogoRemove(field)}
                              sx={{ minWidth: 'auto', px: 1, borderColor: alpha('#dc2626', 0.4), color: '#dc2626', '&:hover': { backgroundColor: alpha('#dc2626', 0.06), borderColor: '#dc2626' } }}>
                              <RemoveCircleOutlineIcon sx={{ fontSize: 14 }} />
                            </ProfessionalButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Box sx={{ mt: 1.5, p: 1.5, border: `1px dashed ${BD}`, borderRadius: 2, textAlign: 'center', bgcolor: SUBTLE, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        {s[field] ? (
                          <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <img src={s[field]} alt={`${label} Preview`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />
                            <Box onClick={() => handleLogoRemove(field)}
                              sx={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0)', cursor: 'pointer', transition: 'background 0.2s ease', '&:hover': { bgcolor: 'rgba(220,38,38,0.5)' }, '& .remove-icon': { opacity: 0, transition: 'opacity 0.2s ease' }, '&:hover .remove-icon': { opacity: 1 } }}>
                              <Box className="remove-icon" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.15 }}>
                                <DeleteIcon sx={{ color: '#fff', fontSize: 20 }} />
                                <Typography sx={{ color: '#fff', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Remove</Typography>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          <Avatar sx={{ width: 72, height: 72, bgcolor: '#fff', border: `1px solid ${BD}`, '& .MuiSvgIcon-root': { fontSize: 30, color: '#cbd5e1' } }}>
                            <PlaceholderIcon />
                          </Avatar>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Institution Information */}
          <Grid item xs={12} md={4}>
            <GlassCard sx={{ height: '100%' }}>
              <SectionHeader icon={BusinessIcon} title="Institution Info" subtitle="Configure institution details shown on payslips and documents"
                onReset={() => { setSettings((prev) => ({ ...prev, institutionName: DEFAULT_SETTINGS.institutionName, institutionAddress: DEFAULT_SETTINGS.institutionAddress, institutionAbbreviation: DEFAULT_SETTINGS.institutionAbbreviation })); setSnackbar({ open: true, message: 'Institution info reset to default!', severity: 'success' }); }}
                resetTitle="Reset institution info to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Institution Name', field: 'institutionName', icon: BusinessIcon, multiline: true, rows: 2 },
                    { label: 'Institution Address', field: 'institutionAddress', icon: LocationOnIcon, multiline: true, rows: 2 },
                    { label: 'Institution Abbreviation', field: 'institutionAbbreviation', icon: BusinessIcon },
                  ].map(({ label, field, icon: Icon, multiline, rows }) => (
                    <Grid item xs={12} key={field}>
                      <ModernTextField fullWidth label={label} value={s[field] || ''} onChange={(e) => setField(field, e.target.value)} multiline={multiline} rows={rows || 1}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment> }} />
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
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Footer & Certifier */}
          <Grid item xs={12} md={4}>
            <GlassCard sx={{ height: '100%' }}>
              <SectionHeader icon={DescriptionIcon} title="Footer & Certifier" subtitle="Configure footer text, copyright, email, and certifier"
                onReset={() => { setSettings((prev) => ({ ...prev, certifierName: DEFAULT_SETTINGS.certifierName, certifierPosition: DEFAULT_SETTINGS.certifierPosition, adminEmail: DEFAULT_SETTINGS.adminEmail, footerText: DEFAULT_SETTINGS.footerText, copyrightSymbol: DEFAULT_SETTINGS.copyrightSymbol })); setSnackbar({ open: true, message: 'Footer & certifier info reset to default!', severity: 'success' }); }}
                resetTitle="Reset footer & certifier to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontWeight: 500, color: MUTED, fontSize: '0.72rem' }}>Copyright Symbol</InputLabel>
                      <ModernSelect value={s.copyrightSymbol} label="Copyright Symbol" onChange={(e) => handleSymbolChange(e.target.value)}
                        startAdornment={<InputAdornment position="start"><DescriptionIcon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment>}
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: BD } }}>
                        {copyrightSymbols.map((sym) => <MenuItem key={sym.value} value={sym.value} sx={{ color: TXT, fontSize: '0.75rem' }}>{sym.label}</MenuItem>)}
                      </ModernSelect>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Footer Text" value={s.footerText} onChange={(e) => handleFooterTextChange(e.target.value)} multiline rows={2}
                      InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment> }} />
                    <Typography variant="caption" sx={{ mt: 0.35, display: 'block', color: MUTED, fontSize: '0.58rem' }}>Symbol is automatically prepended.</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Admin Contact Email" value={s.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} type="email"
                      InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment> }}
                      helperText={<Typography variant="caption" sx={{ color: MUTED, fontSize: '0.58rem' }}>Used for the Gmail icon link in the footer.</Typography>} />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.5, borderTop: `1px solid ${BD}` }}>
                      <AssignmentIndIcon sx={{ color: s.primaryColor, fontSize: 16 }} />
                      <Typography sx={{ fontWeight: 600, color: TXT, fontSize: '0.72rem' }}>Payslip Certifier</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: MUTED, fontSize: '0.58rem' }}>Name and position printed at the bottom of every payslip</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Certifier Name" value={s.certifierName || ''} onChange={(e) => setField('certifierName', e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Certifier Position" value={s.certifierPosition || ''} onChange={(e) => setField('certifierPosition', e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon sx={{ color: MUTED, fontSize: 16 }} /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12}>
                    <PreviewBox bgcolor={s.secondaryColor} sx={{ height: 40, gap: 0.5 }}>
                      <PreviewLabel sx={{ fontSize: '0.46rem', textAlign: 'center', px: 1.5, flexGrow: 1 }}>{s.footerText}</PreviewLabel>
                      <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1, flexShrink: 0 }}>
                        <EmailIcon sx={{ fontSize: 9, color: '#fff' }} />
                      </Box>
                    </PreviewBox>
                    <Typography variant="caption" sx={{ mt: 0.35, display: 'block', color: MUTED, fontSize: '0.58rem', textAlign: 'center' }}>Footer preview</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 1.5, border: `1px solid ${BD}`, borderRadius: 2, textAlign: 'center', bgcolor: '#fff' }}>
                      <Typography sx={{ fontSize: '0.58rem', color: MUTED, mb: 0.15, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Certified Correct</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: TXT }}>{s.certifierName || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: MUTED, fontWeight: 500, mt: 0.1 }}>{s.certifierPosition || '—'}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 0.35, display: 'block', color: MUTED, fontSize: '0.58rem', textAlign: 'center' }}>Payslip footer preview</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

        </Grid>
      </Box>

      {/* ── Floating Action Bar ─────────────────────────────────────────────── */}
      <Box sx={{
        position: 'fixed', bottom: 60, right: 28, zIndex: 1200,
        display: 'flex', alignItems: 'center', gap: 0.75,
        px: 1.5, py: 0.75,
        borderRadius: 6,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        border: `1px solid ${BD}`,
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)' },
      }}>
        <Typography variant="caption" sx={{ color: MUTED, fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.03em', textTransform: 'uppercase', userSelect: 'none' }}>
          System Settings
        </Typography>
        <Box sx={{ width: '1px', height: 16, bgcolor: BD, mx: 0.15 }} />
        <ProfessionalButton variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 13 }} />}
          onClick={() => setConfirmResetOpen(true)} disabled={saving} size="small"
          sx={{ borderColor: BD, color: MUTED, py: '4px', px: '8px', '&:hover': { backgroundColor: SUBTLE, borderColor: '#94a3b8', color: TXT } }}>
          Reset
        </ProfessionalButton>
        <ProfessionalButton variant="contained"
          startIcon={saving ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: 13 }} />}
          onClick={handleSave} disabled={saving} size="small"
          sx={{ bgcolor: s.primaryColor, color: '#fff', py: '4px', px: '12px', '&:hover': { bgcolor: s.secondaryColor } }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </ProfessionalButton>
      </Box>

      {/* Saving backdrop */}
      <Backdrop sx={{ bgcolor: 'rgba(15,23,42,0.4)', zIndex: (t) => t.zIndex.drawer + 1 }} open={saving}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={32} thickness={3.5} sx={{ color: '#fff' }} />
          <Typography variant="body2" sx={{ mt: 1.5, color: '#fff', fontWeight: 500, fontSize: '0.78rem' }}>Saving settings...</Typography>
        </Box>
      </Backdrop>

      {/* Confirm reset dialog */}
      <Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' } }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: s.primaryColor, display: 'flex', alignItems: 'center', gap: 1, borderRadius: '8px 8px 0 0' }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 26, height: 26 }}>
            <RefreshIcon sx={{ color: '#fff', fontSize: 14 }} />
          </Avatar>
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.84rem' }}>Confirm Reset</Typography>
        </Box>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ color: TXT, fontSize: '0.78rem', lineHeight: 1.6 }}>Are you sure you want to reset all settings to their defaults? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 0.75 }}>
          <ProfessionalButton variant="outlined" onClick={() => setConfirmResetOpen(false)} sx={{ borderColor: BD, color: MUTED, '&:hover': { backgroundColor: SUBTLE, color: TXT } }}>Cancel</ProfessionalButton>
          <ProfessionalButton variant="contained" onClick={() => { setConfirmResetOpen(false); executeReset(); }} sx={{ bgcolor: s.primaryColor, color: '#fff', '&:hover': { bgcolor: s.secondaryColor } }}>Reset Defaults</ProfessionalButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 500, fontSize: '0.75rem' }} icon={snackbar.severity === 'success' ? <CheckCircle /> : <ErrorIcon />}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSetting;