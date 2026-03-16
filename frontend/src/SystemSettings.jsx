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

// ── Styled components ────────────────────────────────────────────────────────

const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 40px color-mix(in srgb, var(--primary, #894444) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary, #894444) 10%, transparent)',
  overflow: 'visible',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: '0 12px 48px color-mix(in srgb, var(--primary, #894444) 15%, transparent)',
    transform: 'translateY(-4px)',
  },
}));

const ProfessionalButton = styled(Button)(({ variant: v }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow: v === 'contained' ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: v === 'contained' ? '0 6px 20px rgba(0,0,0,0.2)' : 'none',
  },
  '&:active': { transform: 'translateY(0)' },
}));

const ModernTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
    '&.Mui-focused': {
      boxShadow: '0 4px 20px color-mix(in srgb, var(--primary, #894444) 12%, transparent)',
      backgroundColor: '#fff',
    },
  },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const ReadOnlyTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    cursor: 'not-allowed',
    '& fieldset': { borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
    '&.Mui-focused fieldset': { borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.25)' },
  },
  '& .MuiInputBase-input': { cursor: 'not-allowed', color: 'rgba(0,0,0,0.45)' },
  '& .MuiInputLabel-root': { fontWeight: 500 },
}));

const ModernSelect = styled(Select)(() => ({
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.8)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
  '&.Mui-focused': { backgroundColor: '#fff' },
}));

const PreviewBox = styled(Box)(({ gradient, bgcolor }) => ({
  width: '100%',
  height: 100,
  borderRadius: 12,
  background: gradient || bgcolor || '#888',
  border: '2px solid color-mix(in srgb, var(--primary, #894444) 15%, transparent)',
  boxShadow: '0 4px 20px rgba(109,35,35,0.18)',
  transition: 'all 0.4s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
}));

const PreviewLabel = styled(Typography)(() => ({
  color: '#fff',
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase',
  fontSize: '0.72rem',
  textShadow: '0 1px 6px rgba(0,0,0,0.45)',
  position: 'relative',
  zIndex: 1,
}));

const ColorSwatch = styled(Box)(({ swatchcolor }) => ({
  width: '100%',
  height: 56,
  borderRadius: 10,
  background: swatchcolor,
  border: '2px solid rgba(109, 35, 35, 0.30)',
  boxShadow: '0 2px 8px rgba(109, 35, 35, 0.15), inset 0 0 0 1px rgba(255,255,255,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    border: '2px solid rgba(109, 35, 35, 0.6)',
    boxShadow: '0 6px 18px rgba(109, 35, 35, 0.2), inset 0 0 0 1px rgba(255,255,255,0.3)',
  },
}));

const ColorPickerWrapper = styled(Box)(({ color }) => ({
  position: 'relative',
  width: '100%',
  height: 56,
  borderRadius: 12,
  background: color,
  border: `2px solid ${alpha(color || '#888', 0.35)}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 20px ${alpha(color || '#888', 0.45)}`,
    borderColor: color,
  },
  '&:active': { transform: 'translateY(0) scale(0.98)' },
}));

const cardContentSx = (accentColor) => ({ p: 4, bgcolor: accentColor, overflow: 'visible' });

const sectionHeaderSx = (primaryColor, accentColor) => ({
  bgcolor: alpha(accentColor, 0.35),
  pb: 2,
  borderBottom: `1px solid ${alpha(primaryColor, 0.15)}`,
});

// ── Shimmer / Wireframe ───────────────────────────────────────────────────────

const ssKeyframes = `
@keyframes ssShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes ssPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
`;

const Shim = ({ w = '100%', h = 16, r = 8, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: `${r}px`, flexShrink: 0,
    background: 'linear-gradient(90deg,rgba(137,68,68,0.07) 25%,rgba(137,68,68,0.18) 50%,rgba(137,68,68,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'ssShimmer 1.6s infinite linear',
    ...sx,
  }} />
);

const SwatchShim = ({ delay = 0 }) => (
  <Box sx={{ animation: `ssPulse 2.2s ease-in-out ${delay}s infinite` }}>
    <Shim w="55%" h={13} r={4} sx={{ mb: 0.75 }} />
    <Shim w="100%" h={56} r={10} />
  </Box>
);

const FieldShim = ({ h = 56, labelW = '40%', delay = 0 }) => (
  <Box sx={{ animation: `ssPulse 2.2s ease-in-out ${delay}s infinite` }}>
    <Shim w={labelW} h={13} r={4} sx={{ mb: 0.5 }} />
    <Shim w="100%" h={h} r={12} />
  </Box>
);

const WireCard = ({ children, delay = 0, sx: extraSx = {} }) => (
  <Box sx={{
    borderRadius: '20px', overflow: 'hidden',
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(137,68,68,0.10)',
    boxShadow: '0 8px 40px rgba(137,68,68,0.06)',
    height: '100%',
    animation: `ssPulse 2.2s ease-in-out ${delay}s infinite`,
    ...extraSx,
  }}>
    <Box sx={{
      px: 3, py: 2.5,
      background: 'rgba(137,68,68,0.04)',
      borderBottom: '1px solid rgba(137,68,68,0.08)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.10)', flexShrink: 0 }} />
      <Box sx={{ flexGrow: 1 }}>
        <Shim w="45%" h={18} r={5} sx={{ mb: 0.75 }} />
        <Shim w="72%" h={12} r={4} />
      </Box>
      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.08)', flexShrink: 0 }} />
    </Box>
    <Box sx={{ p: 4 }}>{children}</Box>
  </Box>
);

const SystemSettingWireframe = () => (
  <>
    <style>{ssKeyframes}</style>
    <Box sx={{ py: 4, borderRadius: '14px', minHeight: '100vh' }}>
      <Box sx={{ mb: 4, px: 3 }}>
        <Box sx={{
          borderRadius: '20px', overflow: 'hidden',
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(137,68,68,0.10)',
          boxShadow: '0 8px 40px rgba(137,68,68,0.06)',
          animation: 'ssPulse 2.2s ease-in-out infinite',
        }}>
          <Box sx={{
            p: 5,
            background: 'linear-gradient(135deg,rgba(137,68,68,0.14) 0%,rgba(109,35,35,0.20) 60%,rgba(58,15,15,0.26) 100%)',
            position: 'relative',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
                <Box>
                  <Shim w={240} h={30} r={6} sx={{ mb: 1.5 }} />
                  <Shim w={330} h={14} r={4} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ px: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0}>
                <Grid container spacing={2.5}>
                  {[0,1,2,3,4,5,6].map((i) => (
                    <Grid item xs={12} sm={6} key={i}><SwatchShim delay={i * 0.05} /></Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0.08}>
                <Shim w="100%" h={100} r={12} sx={{ mb: 3 }} />
                <Grid container spacing={2.5}>
                  {[0,1].map((i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <SwatchShim delay={0.08 + i * 0.05} />
                      <Shim w="80%" h={11} r={3} sx={{ mt: 0.75 }} />
                    </Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0.12}>
                <Grid container spacing={4}>
                  {[0,1].map((g) => (
                    <Grid item xs={12} key={g}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                        {Array.from({ length: g === 0 ? 3 : 2 }).map((_, j) => (
                          <Box key={j} sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.12)', flexShrink: 0 }} />
                        ))}
                        <Shim w="35%" h={14} r={4} />
                      </Box>
                      <Shim w="68%" h={11} r={3} sx={{ mb: 2 }} />
                      <Shim w="100%" h={90} r={12} sx={{ mb: 2.5 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}><SwatchShim delay={0.12 + g * 0.07} /></Grid>
                        <Grid item xs={6}><SwatchShim delay={0.16 + g * 0.07} /></Grid>
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <WireCard delay={0.16}>
                <Grid container spacing={2.5}>
                  {[0,1,2,3,4].map((i) => (
                    <Grid item xs={12} sm={6} key={i}><SwatchShim delay={i * 0.05} /></Grid>
                  ))}
                </Grid>
              </WireCard>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <WireCard delay={0.05}>
              <Grid container spacing={3}>
                {[0,1].map((i) => (
                  <Grid item xs={12} key={i}>
                    <Shim w="40%" h={18} r={5} sx={{ mb: 1.5 }} />
                    <Box sx={{ height: 48, borderRadius: 12, border: '1px solid rgba(137,68,68,0.22)', bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 1.5, px: 2, mb: 2 }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.15)', flexShrink: 0 }} />
                      <Shim w="50%" h={13} r={4} />
                    </Box>
                    <Box sx={{ p: 2, border: '2px dashed rgba(137,68,68,0.20)', borderRadius: 3, display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ width: 110, height: 110, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.08)' }} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </WireCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <WireCard delay={0.09}>
              <Grid container spacing={3}>
                <Grid item xs={12}><FieldShim h={96} labelW="42%" delay={0} /></Grid>
                <Grid item xs={12}><FieldShim h={72} labelW="38%" delay={0.04} /></Grid>
                <Grid item xs={12}><FieldShim h={56} labelW="50%" delay={0.07} /></Grid>
                <Grid item xs={12}>
                  <Shim w="30%" h={13} r={4} sx={{ mb: 0.5 }} />
                  <Box sx={{ height: 72, borderRadius: 12, border: '1.5px dashed rgba(137,68,68,0.22)', bgcolor: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', px: 2, gap: 1.5 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.10)', flexShrink: 0 }} />
                    <Shim w="58%" h={13} r={4} />
                    <Box sx={{ ml: 'auto', width: 18, height: 18, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />
                  </Box>
                </Grid>
              </Grid>
            </WireCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <WireCard delay={0.13}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Shim w="35%" h={13} r={4} sx={{ mb: 0.5 }} />
                  <Box sx={{ height: 56, borderRadius: 12, border: '1px solid rgba(137,68,68,0.22)', bgcolor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', px: 2, gap: 1.5 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.12)', flexShrink: 0 }} />
                    <Shim w="42%" h={13} r={4} />
                    <Box sx={{ ml: 'auto', width: 16, height: 16, borderRadius: 2, bgcolor: 'rgba(137,68,68,0.15)', flexShrink: 0 }} />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <FieldShim h={96} labelW="28%" delay={0.04} />
                  <Shim w="74%" h={11} r={3} sx={{ mt: 1 }} />
                </Grid>
                <Grid item xs={12}>
                  <FieldShim h={56} labelW="44%" delay={0.06} />
                  <Shim w="58%" h={11} r={3} sx={{ mt: 0.6 }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: '1px solid rgba(137,68,68,0.10)' }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(137,68,68,0.12)', flexShrink: 0 }} />
                    <Shim w="36%" h={14} r={4} />
                  </Box>
                  <Shim w="65%" h={11} r={3} sx={{ mt: 0.5 }} />
                </Grid>
                <Grid item xs={12}><FieldShim h={56} labelW="34%" delay={0.08} /></Grid>
                <Grid item xs={12}><FieldShim h={56} labelW="38%" delay={0.10} /></Grid>
                <Grid item xs={12}>
                  <Box sx={{ height: 72, borderRadius: 12, bgcolor: 'rgba(137,68,68,0.20)', display: 'flex', alignItems: 'center', px: 2, gap: 1, animation: 'ssPulse 2.2s ease-in-out 0.1s infinite' }}>
                    <Shim w="75%" h={10} r={3} sx={{ background: 'rgba(255,255,255,0.22)', backgroundSize: '800px 100%', animation: 'none' }} />
                    <Box sx={{ ml: 'auto', width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.75 }}>
                    <Shim w="52%" h={11} r={3} />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 2.5, border: '1.5px solid rgba(137,68,68,0.15)', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Shim w="38%" h={12} r={3} />
                    <Shim w="55%" h={20} r={5} />
                    <Shim w="42%" h={13} r={3} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.75 }}>
                    <Shim w="44%" h={11} r={3} />
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
  primaryColor:                '#894444',
  secondaryColor:              '#6d2323',
  accentColor:                 '#FFFFFF',
  textColor:                   '#FFFFFF',
  textPrimaryColor:            '#6D2323',
  textSecondaryColor:          '#FFFFFF',
  hoverColor:                  '#512424',
  backgroundColor:             '#FFFFFF',
  sidebarGradientEnd:          '#3a0f0f',
  institutionLogo:             '',
  hrisLogo:                    '',
  institutionName:             'Institution Name',
  institutionAddress:          'Institute Address',
  systemName:                  'Human Resources Information System',
  institutionAbbreviation:     'INST ABBREV',
  footerText:                  '2026 - HUMAN RESOURCES INFORMATION SYSTEM.  ALL RIGHTS RESERVED.',
  copyrightSymbol:             '©',
  enableWatermark:             true,
  actionButtonColor:           '#6d2323',
  actionButtonHoverColor:      '#a31d1d',
  destructiveButtonColor:      '#6c757d',
  destructiveButtonHoverColor: '#5a6268',
  modalBackgroundColor:        '#FFFFFF',
  modalHeaderColor:            '#6d2323',
  modalHeaderTextColor:        '#FFFFFF',
  modalBodyTextColor:          '#333333',
  modalBorderColor:            '#894444',
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
const ColorPickerItem = ({ label, field, value, onChange, textPrimaryColor }) => {
  const color = value || '#888888';
  const light = isLightColor(color);
  return (
    <Box>
      <Typography variant="caption" sx={{ mb: 0.75, display: 'block', color: textPrimaryColor, fontWeight: 600, opacity: 0.8 }}>{label}</Typography>
      <Box sx={{ position: 'relative' }}>
        <ColorSwatch swatchcolor={color}>
          <Typography variant="caption" sx={{ fontWeight: 700, pointerEvents: 'none', color: light ? 'rgba(0,0,0,0.75)' : '#fff', textShadow: light ? '0 1px 2px rgba(255,255,255,0.6)' : '0 1px 3px rgba(0,0,0,0.55)' }}>{color}</Typography>
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
      <Typography variant="caption" sx={{ mb: 0.75, display: 'block', fontWeight: 600, opacity: 0.8 }}>{label}</Typography>
      <ColorPickerWrapper color={color}>
        <input type="color" value={color} onChange={(e) => onChange(field, e.target.value)} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.5)', zIndex: 1, pointerEvents: 'none' }}>{color}</Typography>
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

  // ── NEW: Remove logo handler ──────────────────────────────────────────────
  const handleLogoRemove = (field) => {
    setField(field, '');
  };

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: alpha(s.primaryColor, 0.12), color: s.textPrimaryColor }}><Icon /></Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: s.textPrimaryColor }}>{title}</Typography>
            <Typography variant="body2" sx={{ color: s.textPrimaryColor, opacity: 0.7 }}>{subtitle}</Typography>
          </Box>
          {onReset && (
            <Tooltip title={resetTitle || 'Reset to default'}>
              <IconButton onClick={onReset} sx={{ color: s.textPrimaryColor, backgroundColor: alpha(s.primaryColor, 0.08), '&:hover': { backgroundColor: alpha(s.primaryColor, 0.18), transform: 'scale(1.05)' }, transition: 'all 0.2s ease' }}>
                <UndoIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      }
      sx={sectionHeaderSx(s.primaryColor, s.accentColor)}
    />
  );

  return (
    <Box sx={{ py: 4, borderRadius: '14px', minHeight: '100vh', pb: 14, '--primary': s.primaryColor, '--secondary': s.secondaryColor, '--accent': s.accentColor, '--text-primary': s.textPrimaryColor }}>

      {/* Page Header */}
      <Box sx={{ mb: 4, px: 3 }}>
        <GlassCard sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 5, background: `linear-gradient(135deg, ${s.primaryColor} 0%, ${s.secondaryColor} 60%, ${s.sidebarGradientEnd || '#3a0f0f'} 100%)`, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
            <Box sx={{ position: 'absolute', bottom: -40, left: '25%', width: 180, height: 180, background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
            <Box sx={{ position: 'absolute', top: '50%', right: '15%', width: 100, height: 100, background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', borderRadius: '50%', transform: 'translateY(-50%)' }} />
            <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', mr: 4, width: 64, height: 64, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '2px solid rgba(255,255,255,0.25)' }}>
                  <SettingsIcon sx={{ fontSize: 32, color: '#fff' }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.2, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>System Settings</Typography>
                  <Typography variant="body1" sx={{ opacity: 0.8, color: '#fff' }}>Customize the appearance and behavior of your HRIS system</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </GlassCard>
      </Box>

      <Box sx={{ px: 3 }}>
        <Grid container spacing={3}>

          {/* Color Palette */}
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <GlassCard sx={{ width: '100%' }}>
              <SectionHeader icon={PaletteIcon} title="Color Palette" subtitle="Core colors used throughout the system"
                onReset={() => { setSettings((prev) => ({ ...prev, ...originalColors })); setSnackbar({ open: true, message: 'Colors reset to original values!', severity: 'success' }); }}
                resetTitle="Reset colors to original values" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={2.5}>
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
                      <ColorPickerItem label={label} field={field} value={s[field]} onChange={setField} textPrimaryColor={s.textPrimaryColor} />
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
                onReset={() => { setSettings((prev) => ({ ...prev, primaryColor: '#894444', sidebarGradientEnd: '#3a0f0f' })); setSnackbar({ open: true, message: 'Sidebar gradient reset to default!', severity: 'success' }); }}
                resetTitle="Reset sidebar gradient to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <PreviewBox gradient={`linear-gradient(180deg, ${s.primaryColor} 0%, ${s.sidebarGradientEnd || '#3a0f0f'} 100%)`} sx={{ mb: 3 }}>
                  <PreviewLabel>SIDEBAR PREVIEW</PreviewLabel>
                </PreviewBox>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <ColorPickerItem label="Gradient Start (Top)" field="primaryColor" value={s.primaryColor} onChange={setField} textPrimaryColor={s.textPrimaryColor} />
                    <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: s.textPrimaryColor, opacity: 0.55 }}>Also applies to buttons &amp; containers</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <ColorPickerItem label="Gradient End (Bottom)" field="sidebarGradientEnd" value={s.sidebarGradientEnd} onChange={setField} textPrimaryColor={s.textPrimaryColor} />
                    <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: s.textPrimaryColor, opacity: 0.55 }}>Bottom color of the sidebar</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Action Button Colors */}
          <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
            <GlassCard sx={{ width: '100%' }}>
              <SectionHeader icon={ColorLensIcon} title="Action Button Colors" subtitle="Action buttons (Add, Edit, View) share one set — Destructive buttons (Delete, Cancel) share another"
                onReset={() => { setSettings((prev) => ({ ...prev, actionButtonColor: '#6d2323', actionButtonHoverColor: '#a31d1d', destructiveButtonColor: '#6c757d', destructiveButtonHoverColor: '#5a6268' })); setSnackbar({ open: true, message: 'Button colors reset to default!', severity: 'success' }); }}
                resetTitle="Reset button colors to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={4}>
                  {[
                    { description: 'Add / Create · Edit / Update · View / Read', icons: [<AddIcon fontSize="small" />, <EditIcon fontSize="small" />, <VisibilityIcon fontSize="small" />], colorField: 'actionButtonColor', hoverField: 'actionButtonHoverColor' },
                    { description: 'Delete · Cancel', icons: [<DeleteIcon fontSize="small" />, <CancelIcon fontSize="small" />], colorField: 'destructiveButtonColor', hoverField: 'destructiveButtonHoverColor' },
                  ].map(({ description, icons, colorField, hoverField }) => (
                    <Grid item xs={12} key={colorField}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        {icons.map((icon, i) => <Box key={i} sx={{ color: s[colorField] }}>{icon}</Box>)}
                      </Box>
                      <Typography variant="caption" sx={{ mb: 2, display: 'block', color: s.textPrimaryColor, opacity: 0.65 }}>{description}</Typography>
                      <PreviewBox gradient={`linear-gradient(135deg, ${s[colorField]} 0%, ${s[hoverField]} 100%)`} sx={{ mb: 2.5, height: 90 }}>
                        <PreviewLabel>NORMAL → HOVER PREVIEW</PreviewLabel>
                      </PreviewBox>
                      <Grid container spacing={2}>
                        <Grid item xs={6}><ColorInput label="Normal Color" field={colorField} value={s[colorField]} onChange={setField} /></Grid>
                        <Grid item xs={6}><ColorInput label="Hover Color" field={hoverField} value={s[hoverField]} onChange={setField} /></Grid>
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
              <SectionHeader icon={WindowIcon} title="Modal Colors" subtitle="Colors used in popup dialogs and modal windows"
                onReset={() => { setSettings((prev) => ({ ...prev, modalBackgroundColor: '#FFFFFF', modalHeaderColor: '#6d2323', modalHeaderTextColor: '#FFFFFF', modalBodyTextColor: '#333333', modalBorderColor: '#894444' })); setSnackbar({ open: true, message: 'Modal colors reset to default!', severity: 'success' }); }}
                resetTitle="Reset modal colors to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={2.5}>
                  {[
                    { label: 'Modal Background', field: 'modalBackgroundColor' },
                    { label: 'Header Background', field: 'modalHeaderColor' },
                    { label: 'Header Text', field: 'modalHeaderTextColor' },
                    { label: 'Body Text', field: 'modalBodyTextColor' },
                    { label: 'Border / Accent', field: 'modalBorderColor' },
                  ].map(({ label, field }) => (
                    <Grid item xs={12} sm={6} key={field}>
                      <ColorPickerItem label={label} field={field} value={s[field]} onChange={setField} textPrimaryColor={s.textPrimaryColor} />
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
                <Grid container spacing={3}>
                  {[
                    { label: 'Institution Logo', field: 'institutionLogo', btnLabel: 'Upload Institution Logo', placeholderIcon: BusinessIcon },
                    { label: 'HRIS Logo', field: 'hrisLogo', btnLabel: 'Upload HRIS Logo', placeholderIcon: SettingsIcon },
                  ].map(({ label, field, btnLabel, placeholderIcon: PlaceholderIcon }) => (
                    <Grid item xs={12} key={field}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={700} sx={{ color: s.textPrimaryColor }}>{label}</Typography>

                      {/* Upload + Remove buttons row */}
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <ProfessionalButton
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          sx={{ flexGrow: 1, borderColor: s.primaryColor, color: s.textPrimaryColor, '&:hover': { backgroundColor: alpha(s.primaryColor, 0.1) } }}
                        >
                          {btnLabel}
                          <input type="file" hidden accept=".jpg,.jpeg,.png" onChange={(e) => handleLogoUpload(field, e)} />
                        </ProfessionalButton>

                        {s[field] && (
                          <Tooltip title={`Remove ${label}`}>
                            <ProfessionalButton
                              variant="outlined"
                              onClick={() => handleLogoRemove(field)}
                              sx={{
                                minWidth: 'auto',
                                px: 1.5,
                                borderColor: alpha('#d32f2f', 0.5),
                                color: '#d32f2f',
                                '&:hover': {
                                  backgroundColor: alpha('#d32f2f', 0.08),
                                  borderColor: '#d32f2f',
                                },
                              }}
                            >
                              <RemoveCircleOutlineIcon fontSize="small" />
                            </ProfessionalButton>
                          </Tooltip>
                        )}
                      </Box>

                      {/* Logo preview */}
                      <Box sx={{ mt: 2, p: 2, border: `2px dashed ${alpha(s.primaryColor, 0.25)}`, borderRadius: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        {s[field] ? (
                          <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <img src={s[field]} alt={`${label} Preview`} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: '50%' }} />
                            {/* Overlay remove button on hover */}
                            <Box
                              onClick={() => handleLogoRemove(field)}
                              sx={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0)', cursor: 'pointer',
                                transition: 'background 0.25s ease',
                                '&:hover': { bgcolor: 'rgba(211,47,47,0.55)' },
                                '& .remove-icon': { opacity: 0, transition: 'opacity 0.25s ease' },
                                '&:hover .remove-icon': { opacity: 1 },
                              }}
                            >
                              <Box className="remove-icon" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                <DeleteIcon sx={{ color: '#fff', fontSize: 28 }} />
                                <Typography sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Remove</Typography>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          <Avatar sx={{ width: 110, height: 110, bgcolor: alpha(s.primaryColor, 0.1), border: `2px solid ${alpha(s.primaryColor, 0.2)}` }}>
                            <PlaceholderIcon sx={{ fontSize: 52, color: alpha(s.primaryColor, 0.4) }} />
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
                <Grid container spacing={3}>
                  {[
                    { label: 'Institution Name', field: 'institutionName', icon: BusinessIcon, multiline: true, rows: 3 },
                    { label: 'Institution Address', field: 'institutionAddress', icon: LocationOnIcon, multiline: true, rows: 2 },
                    { label: 'Institution Abbreviation', field: 'institutionAbbreviation', icon: BusinessIcon },
                  ].map(({ label, field, icon: Icon, multiline, rows }) => (
                    <Grid item xs={12} key={field}>
                      <ModernTextField fullWidth label={label} value={s[field] || ''} onChange={(e) => setField(field, e.target.value)} multiline={multiline} rows={rows || 1}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Icon sx={{ color: s.primaryColor }} /></InputAdornment> }}
                        InputLabelProps={{ style: { color: s.textPrimaryColor } }} />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <ReadOnlyTextField fullWidth label="System Name" value={s.systemName || ''} multiline rows={2}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <InputAdornment position="start"><SettingsIcon sx={{ color: alpha(s.primaryColor, 0.4) }} /></InputAdornment>,
                        endAdornment: <InputAdornment position="end"><Tooltip title="This field is locked and cannot be edited"><LockIcon sx={{ color: 'rgba(0,0,0,0.3)', fontSize: 18 }} /></Tooltip></InputAdornment>,
                      }} />
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Footer & Certifier */}
          <Grid item xs={12} md={4}>
            <GlassCard sx={{ height: '100%' }}>
              <SectionHeader icon={DescriptionIcon} title="Footer & Certifier" subtitle="Configure footer text, copyright, contact email, and payslip certifier details"
                onReset={() => { setSettings((prev) => ({ ...prev, certifierName: DEFAULT_SETTINGS.certifierName, certifierPosition: DEFAULT_SETTINGS.certifierPosition, adminEmail: DEFAULT_SETTINGS.adminEmail, footerText: DEFAULT_SETTINGS.footerText, copyrightSymbol: DEFAULT_SETTINGS.copyrightSymbol })); setSnackbar({ open: true, message: 'Footer & certifier info reset to default!', severity: 'success' }); }}
                resetTitle="Reset footer & certifier to default" />
              <CardContent sx={cardContentSx(s.accentColor)}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ fontWeight: 500, color: s.textPrimaryColor }}>Copyright Symbol</InputLabel>
                      <ModernSelect value={s.copyrightSymbol} label="Copyright Symbol" onChange={(e) => handleSymbolChange(e.target.value)}
                        startAdornment={<InputAdornment position="start"><DescriptionIcon sx={{ color: s.primaryColor }} /></InputAdornment>}
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(s.textPrimaryColor, 0.3) } }}>
                        {copyrightSymbols.map((sym) => <MenuItem key={sym.value} value={sym.value} sx={{ color: s.textPrimaryColor }}>{sym.label}</MenuItem>)}
                      </ModernSelect>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Footer Text" value={s.footerText} onChange={(e) => handleFooterTextChange(e.target.value)} multiline rows={3}
                      InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon sx={{ color: s.primaryColor }} /></InputAdornment> }}
                      InputLabelProps={{ style: { color: s.textPrimaryColor } }} />
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: s.textPrimaryColor, opacity: 0.65 }}>The selected symbol is automatically prepended to your footer text.</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Admin Contact Email" value={s.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} type="email"
                      InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: s.primaryColor }} /></InputAdornment> }}
                      InputLabelProps={{ style: { color: s.textPrimaryColor } }}
                      helperText={<Typography variant="caption" sx={{ color: s.textPrimaryColor, opacity: 0.65 }}>Used for the Gmail icon link in the footer.</Typography>} />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: `1px solid ${alpha(s.primaryColor, 0.15)}` }}>
                      <AssignmentIndIcon sx={{ color: s.primaryColor, fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: s.textPrimaryColor, letterSpacing: '0.04em' }}>Payslip Certifier</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: s.textPrimaryColor, opacity: 0.6 }}>Name and position printed at the bottom of every payslip</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Certifier Name" value={s.certifierName || ''} onChange={(e) => setField('certifierName', e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ color: s.primaryColor }} /></InputAdornment> }}
                      InputLabelProps={{ style: { color: s.textPrimaryColor } }} />
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Certifier Position" value={s.certifierPosition || ''} onChange={(e) => setField('certifierPosition', e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon sx={{ color: s.primaryColor }} /></InputAdornment> }}
                      InputLabelProps={{ style: { color: s.textPrimaryColor } }} />
                  </Grid>
                  <Grid item xs={12}>
                    <PreviewBox bgcolor={s.secondaryColor} sx={{ height: 72, gap: 1 }}>
                      <PreviewLabel sx={{ fontSize: '0.62rem', textAlign: 'center', px: 2, letterSpacing: 1, flexGrow: 1 }}>{s.footerText}</PreviewLabel>
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5, flexShrink: 0 }}>
                        <EmailIcon sx={{ fontSize: 14, color: '#fff' }} />
                      </Box>
                    </PreviewBox>
                    <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: s.textPrimaryColor, opacity: 0.55, textAlign: 'center' }}>Footer preview — email icon links to {s.adminEmail || 'admin@example.com'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2.5, border: `1.5px solid ${alpha(s.primaryColor, 0.2)}`, borderRadius: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.6)' }}>
                      <Typography sx={{ fontSize: '12px', color: '#555', mb: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Certified Correct</Typography>
                      <Typography sx={{ fontSize: '15px', fontWeight: 900, color: '#1a1a1a' }}>{s.certifierName || '—'}</Typography>
                      <Typography sx={{ fontSize: '12px', color: '#444', fontWeight: 600, mt: 0.3 }}>{s.certifierPosition || '—'}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: s.textPrimaryColor, opacity: 0.55, textAlign: 'center' }}>Payslip footer preview</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

        </Grid>
      </Box>

      {/* ── Floating Action Bar ─────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 60,
          right: 32,
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.5,
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          boxShadow: `0 8px 40px rgba(0,0,0,0.18), 0 2px 12px ${alpha(s.primaryColor, 0.25)}`,
          border: `1px solid ${alpha(s.primaryColor, 0.18)}`,
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: `0 12px 48px rgba(0,0,0,0.22), 0 4px 16px ${alpha(s.primaryColor, 0.32)}`,
          },
        }}
      >
        {/* Subtle label */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(s.textPrimaryColor, 0.55),
            fontWeight: 600,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            mr: 0.5,
            userSelect: 'none',
          }}
        >
          System Settings
        </Typography>

        <Box sx={{ width: '1px', height: 28, bgcolor: alpha(s.primaryColor, 0.2), mx: 0.5 }} />

        <ProfessionalButton
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => setConfirmResetOpen(true)}
          disabled={saving}
          size="small"
          sx={{
            borderColor: alpha(s.primaryColor, 0.45),
            color: s.textPrimaryColor,
            fontSize: '0.82rem',
            py: '7px',
            px: '14px',
            '&:hover': {
              backgroundColor: alpha(s.primaryColor, 0.07),
              borderColor: s.primaryColor,
            },
          }}
        >
          Reset
        </ProfessionalButton>

        <ProfessionalButton
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} sx={{ color: s.primaryColor }} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          size="small"
          sx={{
            bgcolor: s.primaryColor,
            color: '#fff',
            fontSize: '0.82rem',
            py: '7px',
            px: '18px',
            fontWeight: 800,
            '&:hover': { bgcolor: s.secondaryColor },
            boxShadow: `0 4px 14px ${alpha(s.primaryColor, 0.45)}`,
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </ProfessionalButton>
      </Box>

      {/* Saving backdrop */}
      <Backdrop sx={{ color: s.accentColor, zIndex: (t) => t.zIndex.drawer + 1 }} open={saving}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: s.accentColor }}>Saving settings...</Typography>
        </Box>
      </Backdrop>

      {/* Confirm reset dialog */}
      <Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' } }}>
        <Box sx={{ px: 3, py: 2, background: `linear-gradient(135deg, ${s.primaryColor} 0%, ${s.secondaryColor} 100%)`, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 36, height: 36 }}>
            <RefreshIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Avatar>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Confirm Reset</Typography>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ color: '#333', fontSize: '0.95rem' }}>Are you sure you want to reset all settings to their defaults? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <ProfessionalButton variant="outlined" onClick={() => setConfirmResetOpen(false)} sx={{ borderColor: s.primaryColor, color: s.primaryColor, '&:hover': { backgroundColor: alpha(s.primaryColor, 0.08) } }}>Cancel</ProfessionalButton>
          <ProfessionalButton variant="contained" onClick={() => { setConfirmResetOpen(false); executeReset(); }} sx={{ bgcolor: s.primaryColor, color: '#fff', '&:hover': { bgcolor: s.secondaryColor } }}>Reset Defaults</ProfessionalButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 3, '& .MuiAlert-message': { fontWeight: 500 } }} icon={snackbar.severity === 'success' ? <CheckCircle /> : <ErrorIcon />}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSetting;
