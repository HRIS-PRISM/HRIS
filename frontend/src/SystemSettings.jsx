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

const ModernSelect = styled(Select)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      transform: 'translateY(-1px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 20px rgba(254, 249, 225, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const ColorPreviewBox = styled(Box)(({ theme, color }) => ({
  mt: 1,
  p: 2,
  bgcolor: color,
  borderRadius: 12,
  textAlign: 'center',
  color: (color === '#FEF9E1' || color === '#FFFFFF') ? '#000' : '#fff',
  fontWeight: 'bold',
  border: color === '#FFFFFF',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.8,
    transform: 'scale(1.02)',
    transition: 'all 0.2s ease'
  }
}));

const LogoPreviewBox = styled(Box)(({ theme }) => ({
  mt: 2,
  p: 2,
  border: '2px dashed rgba(109, 35, 35, 0.2)',
  borderRadius: 12,
  textAlign: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.5)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.2s ease'
  }
}));

const GradientColorPicker = styled(Box)(({ theme, color, hoverColor }) => ({
  position: 'relative',
  width: '100%',
  height: 80,
  borderRadius: 12,
  background: `linear-gradient(135deg, ${color} 0%, ${hoverColor || color} 100%)`,
  border: '2px solid rgba(109, 35, 35, 0.2)',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    border: '2px solid rgba(109, 35, 35, 0.6)',
    boxShadow: '0 6px 18px rgba(109, 35, 35, 0.2), inset 0 0 0 1px rgba(255,255,255,0.3)',
  },
}));

const ColorPickerButton = styled(Box)(({ theme, color }) => ({
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
    '&::after': {
      opacity: 1,
    },
  },
  '&:active': {
    transform: 'translateY(0) scale(0.98)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${alpha(color, 0.8)} 0%, ${alpha(color, 0.4)} 100%)`,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
}));

const SystemSetting = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#894444',
    secondaryColor: '#6d2323',
    accentColor: '#FEF9E1',
    textColor: '#FFFFFF',
    textPrimaryColor: '#6D2323',
    textSecondaryColor: '#FEF9E1',
    hoverColor: '#6D2323',
    backgroundColor: '#FFFFFF',
    institutionLogo: '',
    hrisLogo: '',
    institutionName: 'Eulogio "Amang" Rodriguez Institute of Science and Technology',
    systemName: 'Human Resources Information System',
    institutionAbbreviation: 'EARIST',
    footerText: '2025 EARIST Manila - Human Resources Information System. All rights Reserved.',
    copyrightSymbol: '©',
    enableWatermark: true,
    // CRUD Button Colors
    createButtonColor: '#6d2323',
    createButtonHoverColor: '#a31d1d',
    readButtonColor: '#6d2323',
    readButtonHoverColor: '#a31d1d',
    updateButtonColor: '#6d2323',
    updateButtonHoverColor: '#a31d1d',
    deleteButtonColor: '#6d2323',
    deleteButtonHoverColor: '#a31d1d',
    cancelButtonColor: '#6c757d',
    cancelButtonHoverColor: '#5a6268',
  });

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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const url = API_BASE_URL.includes('/api') 
        ? `${API_BASE_URL}/system-settings`
        : `${API_BASE_URL}/api/system-settings`;
      
      console.log('Fetching from:', url); 
      const response = await axios.get(url);
      const fetchedSettings = response.data;
      setSettings(fetchedSettings);
      
      const colorFields = [
        'primaryColor', 'secondaryColor', 'accentColor', 'textColor',
        'textPrimaryColor', 'textSecondaryColor', 'hoverColor', 'backgroundColor',
        'createButtonColor', 'createButtonHoverColor',
        'readButtonColor', 'readButtonHoverColor',
        'updateButtonColor', 'updateButtonHoverColor',
        'deleteButtonColor', 'deleteButtonHoverColor',
        'cancelButtonColor', 'cancelButtonHoverColor'
      ];
      const originalColorValues = {};
      colorFields.forEach(field => {
        originalColorValues[field] = fetchedSettings[field];
      });
      setOriginalColors(originalColorValues);
    } catch (error) {
      console.error('Error fetching settings:', error);
      console.error('Full error:', error.response || error); 
      setSnackbar({
        open: true,
        message: 'Error loading settings. Using default values.',
        severity: 'error',
      });
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({
          ...settings,
          [field]: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const url = API_BASE_URL.includes('/api') 
        ? `${API_BASE_URL}/system-settings`
        : `${API_BASE_URL}/api/system-settings`;
      
      await axios.put(url, settings);
      localStorage.setItem('systemSettings', JSON.stringify(settings));
      
      setSnackbar({
        open: true,
        message: 'Settings saved successfully! Reloading page...',
        severity: 'success',
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Full error:', error.response || error);
      setSnackbar({
        open: true,
        message: 'Error saving settings. Please try again.',
        severity: 'error',
      });
      setSaving(false);
    }
  };

  const executeReset = async () => {
    try {
      setSaving(true);
      const url = API_BASE_URL.includes('/api') 
        ? `${API_BASE_URL}/system-settings/reset`
        : `${API_BASE_URL}/api/system-settings/reset`;
      
      await axios.post(url);
      localStorage.removeItem('systemSettings');
      
      setSnackbar({
        open: true,
        message: 'Settings reset successfully! Reloading page...',
        severity: 'success',
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      console.error('Full error:', error.response || error);
      setSnackbar({
        open: true,
        message: 'Error resetting settings. Please try again.',
        severity: 'error',
      });
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfirmResetOpen(true);
  };

  const handleConfirmReset = async () => {
    setConfirmResetOpen(false);
    await executeReset();
  };

  const handleCancelReset = () => {
    setConfirmResetOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleColorReset = () => {
    setSettings({
      ...settings,
      ...originalColors
    });
    setSnackbar({
      open: true,
      message: 'Colors reset to original values!',
      severity: 'success',
    });
  };

  const handleCRUDColorReset = () => {
    const defaultCRUDColors = {
      createButtonColor: '#6d2323',
      createButtonHoverColor: '#a31d1d',
      readButtonColor: '#6d2323',
      readButtonHoverColor: '#a31d1d',
      updateButtonColor: '#6d2323',
      updateButtonHoverColor: '#a31d1d',
      deleteButtonColor: '#6d2323',
      deleteButtonHoverColor: '#a31d1d',
      cancelButtonColor: '#6c757d',
      cancelButtonHoverColor: '#5a6268',
    };
    setSettings({
      ...settings,
      ...defaultCRUDColors
    });
    setSnackbar({
      open: true,
      message: 'CRUD button colors reset to default!',
      severity: 'success',
    });
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 50%, ${settings.primaryColor} 100%)`,
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} thickness={4} sx={{ color: settings.accentColor }} />
          <Typography variant="h6" sx={{ mt: 2, color: settings.accentColor }}>
            Loading system settings...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      py: 4,
      borderRadius: '14px',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4, px: 3 }}>
        <GlassCard>
          <Box
            sx={{
              p: 5,
              background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.backgroundColor} 100%)`,
              color: settings.textPrimaryColor,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)',
              }}
            />
            
            <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
              <Box display="flex" alignItems="center">
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(109,35,35,0.15)', 
                    mr: 4, 
                    width: 64,
                    height: 64,
                    boxShadow: '0 8px 24px rgba(109,35,35,0.15)'
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 32, color: settings.textPrimaryColor }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: settings.textPrimaryColor }}>
                    System Settings
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: settings.textPrimaryColor }}>
                    Customize the appearance and behavior of your HRIS system
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={2}>
                <ProfessionalButton
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  disabled={saving}
                  sx={{
                    borderColor: settings.primaryColor,
                    color: settings.textPrimaryColor,
                    '&:hover': {
                      backgroundColor: alpha(settings.primaryColor, 0.1),
                    }
                  }}
                >
                  Reset to Default
                </ProfessionalButton>
                <ProfessionalButton
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    bgcolor: settings.primaryColor,
                    color: settings.accentColor,
                    '&:hover': { bgcolor: settings.secondaryColor }
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </ProfessionalButton>
              </Box>
            </Box>
          </Box>
        </GlassCard>
      </Box>

      <Box sx={{ px: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <GlassCard sx={{ overflow: 'visible' }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(settings.accentColor, 0.8), color: settings.textPrimaryColor }}>
                      <PaletteIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: settings.textPrimaryColor }}>
                        Color Palette
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ color: settings.textPrimaryColor }}>
                        Customize the colors used throughout the system
                      </Typography>
                    </Box>
                    <Tooltip title="Reset colors to original values">
                      <IconButton
                        onClick={handleColorReset}
                        sx={{
                          color: settings.textPrimaryColor,
                          backgroundColor: alpha(settings.accentColor, 0.3),
                          '&:hover': {
                            backgroundColor: alpha(settings.accentColor, 0.5),
                            transform: 'scale(1.05)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <UndoIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ 
                  bgcolor: alpha(settings.accentColor, 0.5), 
                  pb: 2,
                  borderBottom: '1px solid rgba(109,35,35,0.1)'
                }}
              />
              <CardContent sx={{ p: 4, bgcolor: (settings.accentColor), overflow: 'visible' }}>
                <Grid container spacing={3}>
                  {[
                    { label: 'Header | Footer Color', field: 'secondaryColor' },
                    { label: 'Sidebar | Buttons | Containers', field: 'primaryColor' },
                    { label: 'Cards', field: 'accentColor' },
                    { label: 'Hover', field: 'hoverColor' },
                    { label: 'Background', field: 'backgroundColor' },
                    { label: 'Primary Text Color', field: 'textPrimaryColor' },
                    { label: 'Secondary Text Color', field: 'textSecondaryColor' }
                  ].map(({ label, field }) => (
                    <Grid item xs={12} sm={6} key={field}>
                      <Box sx={{ position: 'relative', zIndex: 1000, overflow: 'visible' }}>
                        <ModernTextField
                          fullWidth
                          label={label}
                          type="color"
                          value={settings[field]}
                          onChange={(e) => handleColorChange(field, e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& input[type="color"]': {
                              cursor: 'pointer',
                              height: 56,
                              zIndex: 1001,
                              position: 'relative',
                            },
                            '& .MuiInputLabel-root': {
                              cursor: 'pointer',
                              color: settings.textPrimaryColor,
                            },
                            '& .MuiOutlinedInput-root': {
                              cursor: 'pointer',
                              zIndex: 1000,
                              position: 'relative',
                            }
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Logo Upload */}
          <Grid item xs={12} md={6}>
            <GlassCard>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(settings.accentColor, 0.8), color: settings.textPrimaryColor }}>
                      <ImageIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: settings.textPrimaryColor }}>
                        Logos
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ color: settings.textPrimaryColor }}>
                        Upload institution and system logos
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  bgcolor: alpha(settings.accentColor, 0.5), 
                  pb: 2,
                  borderBottom: '1px solid rgba(109,35,35,0.1)'
                }}
              />
              <CardContent sx={{ p: 4, bgcolor: (settings.accentColor) }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ color: settings.textPrimaryColor }}>
                      Institution Logo
                    </Typography>
                    <ProfessionalButton
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{
                        borderColor: settings.primaryColor,
                        color: settings.textPrimaryColor,
                        '&:hover': {
                          backgroundColor: alpha(settings.primaryColor, 0.1),
                        }
                      }}
                    >
                      Upload Institution Logo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('institutionLogo', e)}
                      />
                    </ProfessionalButton>
                    {settings.institutionLogo && (
                      <LogoPreviewBox>
                        <img
                          src={settings.institutionLogo}
                          alt="Institution Logo Preview"
                          style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain' }}
                        />
                      </LogoPreviewBox>
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ color: settings.textPrimaryColor }}>
                      HRIS Logo
                    </Typography>
                    <ProfessionalButton
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{
                        borderColor: settings.primaryColor,
                        color: settings.textPrimaryColor,
                        '&:hover': {
                          backgroundColor: alpha(settings.primaryColor, 0.1),
                        }
                      }}
                    >
                      Upload HRIS Logo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('hrisLogo', e)}
                      />
                    </ProfessionalButton>
                    {settings.hrisLogo && (
                      <LogoPreviewBox>
                        <img
                          src={settings.hrisLogo}
                          alt="HRIS Logo Preview"
                          style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain' }}
                        />
                      </LogoPreviewBox>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Institution Information*/}
          <Grid item xs={12} md={6}>
            <GlassCard>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(settings.accentColor, 0.8), color: settings.textPrimaryColor }}>
                      <BusinessIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: settings.textPrimaryColor }}>
                        Institution Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ color: settings.textPrimaryColor }}>
                        Configure institution details
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  bgcolor: alpha(settings.accentColor, 0.5), 
                  pb: 2,
                  borderBottom: '1px solid rgba(109,35,35,0.1)'
                }}
              />
              <CardContent sx={{ p: 4, bgcolor: (settings.accentColor) }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <ModernTextField
                      fullWidth
                      label="Institution Name"
                      value={settings.institutionName}
                      onChange={(e) => handleTextChange('institutionName', e.target.value)}
                      multiline
                      rows={1}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon sx={{ color: settings.primaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{
                        style: { color: settings.textPrimaryColor }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <ModernTextField
                      fullWidth
                      label="System Name"
                      value={settings.systemName}
                      onChange={(e) => handleTextChange('systemName', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SettingsIcon sx={{ color: settings.primaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{
                        style: { color: settings.textPrimaryColor }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <ModernTextField
                      fullWidth
                      label="Institution Abbreviation"
                      value={settings.institutionAbbreviation}
                      onChange={(e) => handleTextChange('institutionAbbreviation', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon sx={{ color: settings.primaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{
                        style: { color: settings.textPrimaryColor }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Footer Settings */}
          <Grid item xs={12} md={6}>
            <GlassCard>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(settings.accentColor, 0.8), color: settings.textPrimaryColor }}>
                      <DescriptionIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: settings.textPrimaryColor }}>
                        Footer Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ color: settings.textPrimaryColor }}>
                        Configure footer text and options
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  bgcolor: alpha(settings.accentColor, 0.5), 
                  pb: 2,
                  borderBottom: '1px solid rgba(109,35,35,0.1)'
                }}
              />
              <CardContent sx={{ p: 4, bgcolor: (settings.accentColor) }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="copyright-symbol-label" sx={{ fontWeight: 500, color: settings.textPrimaryColor }}>
                        Copyright Symbol
                      </InputLabel>
                      <ModernSelect
                        labelId="copyright-symbol-label"
                        id="copyright-symbol"
                        value={settings.copyrightSymbol}
                        label="Copyright Symbol"
                        onChange={(e) => handleSymbolChange(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            <DescriptionIcon sx={{ color: settings.primaryColor }} />
                          </InputAdornment>
                        }
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha(settings.textPrimaryColor, 0.3),
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: alpha(settings.textPrimaryColor, 0.5),
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: settings.primaryColor,
                          },
                        }}
                      >
                        {copyrightSymbols.map((symbol) => (
                          <MenuItem key={symbol.value} value={symbol.value} sx={{ color: settings.textPrimaryColor }}>
                            {symbol.label}
                          </MenuItem>
                        ))}
                      </ModernSelect>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <ModernTextField
                      fullWidth
                      label="Footer Text"
                      value={settings.footerText}
                      onChange={(e) => handleFooterTextChange(e.target.value)}
                      multiline
                      rows={1}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <DescriptionIcon sx={{ color: settings.primaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{
                        style: { color: settings.textPrimaryColor }
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: settings.textPrimaryColor, opacity: 0.7 }}>
                      The selected symbol will be automatically added to the beginning of your footer text
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* CRUD Button Colors */}
          <Grid item xs={12}>
            <GlassCard sx={{ overflow: 'visible' }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(settings.accentColor, 0.8), color: settings.textPrimaryColor }}>
                      <ColorLensIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: settings.textPrimaryColor }}>
                        CRUD Button Colors
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ color: settings.textPrimaryColor }}>
                        Customize colors for Create, Read, Update, Delete, and Cancel buttons across all components
                      </Typography>
                    </Box>
                    <Tooltip title="Reset CRUD button colors to default">
                      <IconButton
                        onClick={handleCRUDColorReset}
                        sx={{
                          color: settings.textPrimaryColor,
                          backgroundColor: alpha(settings.accentColor, 0.3),
                          '&:hover': {
                            backgroundColor: alpha(settings.accentColor, 0.5),
                            transform: 'scale(1.05)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <UndoIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ 
                  bgcolor: alpha(settings.accentColor, 0.5), 
                  pb: 2,
                  borderBottom: '1px solid rgba(109,35,35,0.1)'
                }}
              />
              <CardContent sx={{ p: 4, bgcolor: (settings.accentColor), overflow: 'visible' }}>
                <Grid container spacing={2} sx={{ display: 'flex', flexWrap: { xs: 'wrap', sm: 'wrap', md: 'nowrap' }, alignItems: 'stretch' }}>
                  {[
                    { 
                      label: 'Create Button', 
                      icon: <AddIcon />,
                      colorField: 'createButtonColor', 
                      hoverField: 'createButtonHoverColor',
                      defaultColor: '#6d2323',
                      defaultHover: '#a31d1d'
                    },
                    { 
                      label: 'Read/View Button', 
                      icon: <VisibilityIcon />,
                      colorField: 'readButtonColor', 
                      hoverField: 'readButtonHoverColor',
                      defaultColor: '#6d2323',
                      defaultHover: '#a31d1d'
                    },
                    { 
                      label: 'Update/Edit Button', 
                      icon: <EditIcon />,
                      colorField: 'updateButtonColor', 
                      hoverField: 'updateButtonHoverColor',
                      defaultColor: '#6d2323',
                      defaultHover: '#a31d1d'
                    },
                    { 
                      label: 'Delete Button', 
                      icon: <DeleteIcon />,
                      colorField: 'deleteButtonColor', 
                      hoverField: 'deleteButtonHoverColor',
                      defaultColor: '#6d2323',
                      defaultHover: '#a31d1d'
                    },
                    { 
                      label: 'Cancel Button', 
                      icon: <CancelIcon />,
                      colorField: 'cancelButtonColor', 
                      hoverField: 'cancelButtonHoverColor',
                      defaultColor: '#6c757d',
                      defaultHover: '#5a6268'
                    },
                  ].map(({ label, icon, colorField, hoverField, defaultColor, defaultHover }) => (
                    <Grid item xs={12} sm={6} md={true} key={colorField} sx={{ flex: { md: '1 1 0%' }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ position: 'relative', zIndex: 1000, overflow: 'visible', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: settings.textPrimaryColor, display: 'flex', alignItems: 'center', gap: 1 }}>
                          {icon}
                          {label}
                        </Typography>
                        
                        {/* Gradient Preview */}
                        <GradientColorPicker
                          color={settings[colorField] || defaultColor}
                          hoverColor={settings[hoverField] || defaultHover}
                          onClick={() => {
                            const input = document.getElementById(`${colorField}-input`);
                            if (input) input.click();
                          }}
                          sx={{ mb: 2 }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              color: '#fff',
                              fontWeight: 600,
                              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              zIndex: 1,
                              pointerEvents: 'none',
                            }}
                          >
                            Preview
                          </Box>
                        </GradientColorPicker>

                        {/* Color Picker for Normal State */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: settings.textPrimaryColor, opacity: 0.8 }}>
                            Normal Color
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <ColorPickerButton
                              color={settings[colorField] || defaultColor}
                              onClick={() => {
                                const input = document.getElementById(`${colorField}-input`);
                                if (input) input.click();
                              }}
                              sx={{ flex: 1 }}
                            >
                              <input
                                id={`${colorField}-input`}
                                type="color"
                                value={settings[colorField] || defaultColor}
                                onChange={(e) => handleColorChange(colorField, e.target.value)}
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  opacity: 0,
                                  cursor: 'pointer',
                                  zIndex: 2,
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#fff',
                                  fontWeight: 600,
                                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                  zIndex: 1,
                                  pointerEvents: 'none',
                                }}
                              >
                                {settings[colorField] || defaultColor}
                              </Typography>
                            </ColorPickerButton>
                          </Box>
                        </Box>

                        {/* Color Picker for Hover State */}
                        <Box sx={{ mt: 'auto' }}>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: settings.textPrimaryColor, opacity: 0.8 }}>
                            Hover Color
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <ColorPickerButton
                              color={settings[hoverField] || defaultHover}
                              onClick={() => {
                                const input = document.getElementById(`${hoverField}-input`);
                                if (input) input.click();
                              }}
                              sx={{ flex: 1 }}
                            >
                              <input
                                id={`${hoverField}-input`}
                                type="color"
                                value={settings[hoverField] || defaultHover}
                                onChange={(e) => handleColorChange(hoverField, e.target.value)}
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  opacity: 0,
                                  cursor: 'pointer',
                                  zIndex: 2,
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#fff',
                                  fontWeight: 600,
                                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                  zIndex: 1,
                                  pointerEvents: 'none',
                                }}
                              >
                                {settings[hoverField] || defaultHover}
                              </Typography>
                            </ColorPickerButton>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

        </Grid>
      </Box>

      <Backdrop
        sx={{ color: settings.accentColor, zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={saving}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: s.accentColor }}>Saving settings...</Typography>
        </Box>
      </Backdrop>

      <Dialog
        open={confirmResetOpen}
        onClose={handleCancelReset}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.backgroundColor} 100%)`,
            boxShadow: '0 8px 40px rgba(109, 35, 35, 0.15)',
          }
        }}
      >
        <DialogTitle sx={{ color: settings.textPrimaryColor, fontWeight: 700 }}>
          Confirm Reset
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: settings.textPrimaryColor }}>
            Are you sure you want to reset all settings to default?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <ProfessionalButton
            variant="outlined"
            onClick={handleCancelReset}
            sx={{
              borderColor: settings.primaryColor,
              color: settings.textPrimaryColor,
              '&:hover': { backgroundColor: alpha(settings.primaryColor, 0.1) }
            }}
          >
            Cancel
          </ProfessionalButton>
          <ProfessionalButton
            variant="contained"
            onClick={handleConfirmReset}
            sx={{ bgcolor: settings.primaryColor, color: settings.accentColor, '&:hover': { bgcolor: settings.secondaryColor } }}
          >
            Reset
          </ProfessionalButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            borderRadius: 3,
            '& .MuiAlert-message': { fontWeight: 500 }
          }}
          icon={snackbar.severity === 'success' ? <CheckCircle /> : <ErrorIcon />}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSetting;
