import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthHeaders } from '../utils/auth';
import usePageAccess from '../hooks/usePageAccess';
import {
  Typography,
  Grid,
  InputAdornment,
  Box,
  CircularProgress,
  Fade,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  ListSubheader,
  ListItemIcon,
  Tooltip,
  TextField,
  Tab,
  Tabs,
  Button,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  Checkbox,
  FormControlLabel,
  styled,
  alpha,
} from '@mui/material';
import {
  PersonOutline,
  EmailOutlined,
  BadgeOutlined,
  LockOutlined,
  PersonAddAlt1,
  CheckCircleOutline,
  ErrorOutline,
  WorkOutline,
  Business,
  AssignmentOutlined,
  AccountBalanceWallet,
  InfoOutlined,
  Circle,
  OpenInNew,
  CheckCircle,
  PersonAdd,
  Assignment,
  AutoAwesome,
} from '@mui/icons-material';
import axios from 'axios';

import AccessDenied from './AccessDenied';
import LoadingOverlay from './LoadingOverlay';

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKeyframes = `
@keyframes regShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes regPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
`;

const RegShim = ({ width = '100%', height = 16, borderRadius = 8, sx = {} }) => (
  <Box sx={{
    width, height, borderRadius: `${borderRadius}px`, flexShrink: 0,
    background: 'linear-gradient(90deg,rgba(137,68,68,0.08) 25%,rgba(137,68,68,0.20) 50%,rgba(137,68,68,0.08) 75%)',
    backgroundSize: '800px 100%',
    animation: 'regShimmer 1.5s infinite linear',
    ...sx,
  }} />
);

const useSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('systemSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {
      primaryColor: '#894444',
      secondaryColor: '#6d2323',
      accentColor: '#FEF9E1',
      textColor: '#FFFFFF',
      textPrimaryColor: '#6D2323',
      textSecondaryColor: '#FEF9E1',
      hoverColor: '#6D2323',
      backgroundColor: '#FFFFFF',
    };
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api')
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        if (response.data && typeof response.data === 'object') {
          setSettings(response.data);
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
        }
      } catch (e) {
        console.error('Error fetching system settings:', e);
      }
    };
    fetchSettings();
  }, []);

  return settings;
};

const RegistrationWireframe = ({ settings }) => {
  const p  = settings?.primaryColor  || '#894444';
  const ac = settings?.accentColor   || '#FEF9E1';

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box sx={{
        py: 3,
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${alpha(ac, 0.12)} 0%, ${alpha(ac, 0.28)} 100%)`,
      }}>
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
          <Box sx={{ mb: 3, borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, boxShadow: `0 8px 40px ${alpha(p, 0.08)}`, animation: 'regPulse 2.2s ease-in-out infinite' }}>
            <Box sx={{ px: 4, py: 3, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: alpha(p, 0.12), flexShrink: 0 }} />
                  <Box><RegShim width={200} height={22} borderRadius={6} sx={{ mb: 0.75 }} /><RegShim width={300} height={12} borderRadius={4} /></Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}><RegShim width={70} height={26} borderRadius={14} /><RegShim width={150} height={40} borderRadius={12} /></Box>
              </Box>
            </Box>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={3}>
              <Box sx={{ borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: 'regPulse 2.2s ease-in-out 0.05s infinite' }}>
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${alpha(p, 0.08)}`, bgcolor: alpha(ac, 0.5) }}><RegShim width={120} height={10} borderRadius={4} sx={{ mb: 0.6 }} /><RegShim width={190} height={11} borderRadius={4} /></Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[0, 0.06, 0.12].map((delay, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, borderRadius: 3, border: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.4), animation: `regPulse 2.2s ease-in-out ${delay}s infinite` }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: alpha(p, 0.1), flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}><RegShim width="60%" height={11} borderRadius={4} sx={{ mb: 0.5 }} /><RegShim width="85%" height={10} borderRadius={3} /></Box>
                      <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: alpha(p, 0.1) }} />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} lg={9}>
              <Box sx={{ borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: 'regPulse 2.2s ease-in-out 0.08s infinite' }}>
                <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, borderBottom: `1px solid ${alpha(p, 0.1)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}><Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: alpha(p, 0.12), flexShrink: 0 }} /><Box><RegShim width={150} height={18} borderRadius={6} sx={{ mb: 0.5 }} /><RegShim width={230} height={11} borderRadius={4} /></Box></Box>
                  <RegShim width={65} height={24} borderRadius={14} />
                </Box>
                <Box sx={{ p: 3 }}>
                  <RegShim width={125} height={10} borderRadius={4} sx={{ mb: 1.75 }} />
                  <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    {[3, 3, 4, 2].map((cols, i) => (<Grid item xs={12} sm={cols} key={i}><Box sx={{ height: 38, borderRadius: 3, border: `1px solid ${alpha(p, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} /></Grid>))}
                    <Grid item xs={12}><Box sx={{ height: 38, borderRadius: 3, border: `1px solid ${alpha(p, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} /></Grid>
                  </Grid>
                  <Box sx={{ borderTop: `1px dashed ${alpha(p, 0.15)}`, my: 2.25 }} />
                  <RegShim width={140} height={10} borderRadius={4} sx={{ mb: 1.75 }} />
                  <Grid container spacing={2}>
                    {[4, 4, 4].map((cols, i) => (<Grid item xs={12} sm={cols} key={i}><Box sx={{ height: 38, borderRadius: 3, border: `1px solid ${alpha(p, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)' }} /></Grid>))}
                    <Grid item xs={12}><Box sx={{ height: 50, borderRadius: 3, border: `1px dashed ${alpha(p, 0.2)}`, bgcolor: alpha(p, 0.04) }} /></Grid>
                  </Grid>
                  <Box sx={{ borderTop: `1px solid ${alpha(p, 0.08)}`, pt: 2.5, mt: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <RegShim width={170} height={10} borderRadius={4} />
                    <RegShim width={140} height={38} borderRadius={12} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

const SETUP_ITEMS = [
  { key: 'remittance', label: 'Remittances',          desc: 'Set up employee remittance details',    route: '/remittance-table',     icon: AccountBalanceWallet },
  { key: 'department', label: 'Department assignment', desc: 'Add and manage departments',            route: '/department-assignment', icon: Business },
  { key: 'itemTable',  label: 'Item table',            desc: 'Set up Plantilla items',                route: '/item-table',            icon: AssignmentOutlined },
];

const EMPTY_FORM = {
  firstName: '', middleName: '', lastName: '', nameExtension: '',
  email: '', employeeNumber: '', password: '',
  employmentCategory: '', customCategory: '', department: '',
};

const Registration = () => {
  const settings = useSystemSettings();
  const p  = settings?.primaryColor     || '#894444';
  const s  = settings?.secondaryColor   || '#6d2323';
  const ac = settings?.accentColor      || '#FEF9E1';
  const tp = settings?.textPrimaryColor || '#6D2323';

  const GlassCard = useMemo(() => styled(Card)(() => ({
    borderRadius: 20,
    background: `${ac}F2`,
    backdropFilter: 'blur(10px)',
    boxShadow: `0 8px 40px ${alpha(p, 0.08)}`,
    border: `1px solid ${alpha(p, 0.1)}`,
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': { boxShadow: `0 12px 48px ${alpha(p, 0.16)}`, transform: 'translateY(-4px)' },
  })), [p, ac]);

  const ProfessionalButton = useMemo(() => styled(Button)(({ variant: v }) => ({
    borderRadius: 12, fontWeight: 600, padding: '10px 22px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textTransform: 'none', fontSize: '0.9rem', letterSpacing: '0.025em',
    boxShadow: v === 'contained' ? `0 4px 14px ${alpha(p, 0.4)}` : 'none',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: v === 'contained' ? `0 6px 20px ${alpha(p, 0.55)}` : 'none' },
    '&:active': { transform: 'translateY(0)' },
  })), [p]);

  const ModernTextField = useMemo(() => styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 12,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backgroundColor: 'rgba(255,255,255,0.8)',
      '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255,255,255,0.95)' },
      '&.Mui-focused': { transform: 'translateY(-1px)', boxShadow: `0 4px 20px ${alpha(p, 0.4)}`, backgroundColor: 'rgba(255,255,255,1)' },
    },
    '& .MuiInputLabel-root': { fontWeight: 500 },
    '& .MuiFormHelperText-root': { marginLeft: 0, fontSize: '0.72rem' },
  })), [p]);

  const [formData, setFormData]                   = useState(EMPTY_FORM);
  const [errMessage, setErrorMessage]             = useState('');
  const [successMessage, setSuccessMessage]       = useState('');
  const [isLoading, setIsLoading]                 = useState(false);
  const [isInformationConfirmed, setIsInformationConfirmed] = useState(false);
  const [completedSteps, setCompletedSteps]       = useState({ remittance: false, department: false, itemTable: false });
  const [fieldRequirements, setFieldRequirements] = useState({
    firstName: true, lastName: true, email: true, employeeNumber: true,
    employmentCategory: true, password: true, middleName: false, nameExtension: false, department: false,
  });
  const [emailDomainRestricted, setEmailDomainRestricted] = useState(false);
  const [departmentCodes, setDepartmentCodes]             = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = useMemo(
    () => (API_BASE_URL.includes('/api') ? API_BASE_URL : `${API_BASE_URL}/api`),
    []
  );

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('setupCompletedSteps');
    if (saved) setCompletedSteps(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${apiBase}/system-settings/registration_field_requirements`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data?.setting_value) { try { setFieldRequirements(JSON.parse(data.setting_value)); } catch {} }
          return;
        }

        if (res.status === 404) {
          // Fallback to full settings endpoint when the single key row does not exist yet.
          const allSettingsRes = await fetch(`${apiBase}/system-settings`, { headers: { Authorization: `Bearer ${token}` } });
          if (!allSettingsRes.ok) return;

          const allSettings = await allSettingsRes.json();
          const raw = allSettings?.registration_field_requirements;
          if (!raw) return;

          if (typeof raw === 'string') {
            try { setFieldRequirements(JSON.parse(raw)); } catch {}
            return;
          }

          if (typeof raw === 'object') {
            setFieldRequirements(raw);
          }
        }
      } catch {}
    };
    run();
  }, [apiBase]);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/email-domain-restriction`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setEmailDomainRestricted(data.setting_value === true); }
      } catch {}
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/department-table`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setDepartmentCodes(data.map((d) => d.code)); }
      } catch {}
    };
    run();
  }, []);

  const { hasAccess, loading: accessLoading } = usePageAccess('registration');

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev };
      if (name === 'employmentCategory') {
        const parsed = value === '' ? '' : Number(value);
        next.employmentCategory = parsed;
        if (parsed !== 5) next.customCategory = '';
        return next;
      }
      next[name] = value;
      if (name === 'lastName') next.password = value.toUpperCase().replace(/\s+/g, '');
      return next;
    });
  };

  const isValidName = (n) => {
    if (!n || n.trim().length < 2 || n.trim().length > 50) return false;
    return /^[a-zA-Z\s'-]+$/.test(n.trim());
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, employeeNumber, password, employmentCategory, customCategory, department } = formData;
    const missing = [];
    if (fieldRequirements.firstName && !firstName)                                   missing.push('First Name');
    if (fieldRequirements.lastName && !lastName)                                     missing.push('Last Name');
    if (fieldRequirements.email && !email)                                           missing.push('Email');
    if (fieldRequirements.employeeNumber && !employeeNumber)                         missing.push('Employee Number');
    if (fieldRequirements.password && !password)                                     missing.push('Password');
    if (fieldRequirements.employmentCategory && employmentCategory === '')           missing.push('Employment Category');
    if (fieldRequirements.department && !department)                                 missing.push('Department');
    if (employmentCategory === 5 && !customCategory.trim())                          missing.push('Custom Category Description');
    if (missing.length)                                                              { setErrorMessage(`Required fields missing: ${missing.join(', ')}.`); setSuccessMessage(''); return; }
    if (!isValidName(firstName))                                                     { setErrorMessage('Enter a valid first name (2–50 letters).'); setSuccessMessage(''); return; }
    if (!isValidName(lastName))                                                      { setErrorMessage('Enter a valid last name (2–50 letters).'); setSuccessMessage(''); return; }
    if (formData.middleName && !isValidName(formData.middleName))                   { setErrorMessage('Enter a valid middle name (2–50 letters).'); setSuccessMessage(''); return; }
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))                                { setErrorMessage('Enter a valid email address.'); return; }
      if (emailDomainRestricted && !email.toLowerCase().endsWith('@earist.edu.ph')) { setErrorMessage('Email must use the @earist.edu.ph domain.'); return; }
    }
    setIsLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/register`, { method: 'POST', ...getAuthHeaders(), body: JSON.stringify(formData) });
      if (res.ok) {
        setTimeout(() => {
          setIsLoading(false);
          setSuccessMessage('User registered successfully. Login credentials have been sent to their email address.');
          setTimeout(() => setSuccessMessage(''), 5000);
          setFormData(EMPTY_FORM);
          setIsInformationConfirmed(false);
        }, 500);
      } else {
        const err = await res.json();
        setIsLoading(false);
        setErrorMessage(err.error || 'Registration failed. Please try again.');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('A network error occurred. Please try again.');
    }
  };

  if (accessLoading) return <RegistrationWireframe settings={settings} />;

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access User Registration. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const selectInnerSx = {
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& .MuiOutlinedInput-notchedOutline': { borderRadius: 3 },
    '&:hover': { transform: 'translateY(-1px)', backgroundColor: 'rgba(255,255,255,0.95)' },
    '&.Mui-focused': { transform: 'translateY(-1px)', boxShadow: `0 4px 20px ${alpha(p, 0.4)}`, backgroundColor: 'rgba(255,255,255,1)' },
  };

  const selectControlSx = { '& .MuiInputLabel-root': { fontWeight: 500 } };

  const requiredInputLabels = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'employeeNumber', label: 'Employee Number' },
    { key: 'employmentCategory', label: 'Employment Category' },
    { key: 'password', label: 'Password' },
    { key: 'department', label: 'Department' },
  ].filter((field) => fieldRequirements[field.key]);

  return (
    <Box
      sx={{
        pt: 3,
        pb: 3,
        width: '100%',
        mx: 'auto',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // ── KEY FIX: fill the full remaining viewport height ──
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${alpha(ac, 0.12)} 0%, ${alpha(ac, 0.28)} 100%)`,
      }}
    >
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>

        {/* ── Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 3 }}>
            <GlassCard>
              <Box sx={{ px: 4, py: 3, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `radial-gradient(circle, ${alpha(p, 0.1)} 0%, transparent 70%)` }} />
                <Box sx={{ position: 'absolute', bottom: -25, left: '30%', width: 120, height: 120, background: `radial-gradient(circle, ${alpha(p, 0.07)} 0%, transparent 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: alpha(p, 0.15), width: 52, height: 52, boxShadow: `0 6px 20px ${alpha(p, 0.15)}` }}>
                      <PersonAdd sx={{ fontSize: 26, color: p }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2, color: p }}>User Registration</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 400, color: tp, mt: 0.25 }}>Register new employees and configure their initial access</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tabs
                      value={location.pathname === '/bulk-register' ? 'bulk' : 'single'}
                      onChange={(_, value) => navigate(value === 'bulk' ? '/bulk-register' : '/registration')}
                      sx={{
                        minHeight: 36,
                        bgcolor: alpha(p, 0.08),
                        borderRadius: 2,
                        px: 0.5,
                        '& .MuiTabs-indicator': { display: 'none' },
                      }}
                    >
                      <Tab
                        value="single"
                        label="Single"
                        sx={{
                          minHeight: 30,
                          py: 0.35,
                          px: 1.4,
                          textTransform: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 1.5,
                          color: alpha(tp, 0.75),
                          '&.Mui-selected': { bgcolor: p, color: ac },
                        }}
                      />
                      <Tab
                        value="bulk"
                        label="Bulk"
                        sx={{
                          minHeight: 30,
                          py: 0.35,
                          px: 1.4,
                          textTransform: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 1.5,
                          color: alpha(tp, 0.75),
                          '&.Mui-selected': { bgcolor: p, color: ac },
                        }}
                      />
                    </Tabs>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Two-column layout ── */}
        <Grid container spacing={3} alignItems="stretch">

          {/* ── LEFT: Setup checklist ── */}
          <Grid item xs={12} lg={3} sx={{ display: 'flex' }}>
            <Fade in timeout={700} style={{ width: '100%' }}>
              <GlassCard sx={{ width: '100%' }}>
                <CardHeader
                  title={
                    <Box>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: alpha(tp, 0.5), mb: 0.4 }}>
                        Next steps


                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: tp, lineHeight: 1.4, fontWeight: 400 }}>
Complete these after registering a user                      </Typography>
                    </Box>
                  }
                  sx={{ bgcolor: alpha(ac, 0.5), borderBottom: `1px solid ${alpha(p, 0.08)}`, py: 1.75, px: 2.5 }}
                />
                <CardContent sx={{ p: 2.75, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ p: 1.9, borderRadius: 3, border: `1px solid ${alpha(p, 0.12)}`, bgcolor: alpha(ac, 0.35) }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: alpha(tp, 0.6), mb: 0.9 }}>
                      After registration
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.35 }}>
                      {SETUP_ITEMS.map((item) => {
                        const done = completedSteps[item.key];
                        const Icon = item.icon;
                        return (
                          <Box
                            key={item.key}
                            onClick={() => navigate(item.route)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.25,
                              p: 1.5, borderRadius: 3,
                              border: `1px solid ${done ? alpha('#16a34a', 0.3) : alpha(p, 0.12)}`,
                              bgcolor: done ? alpha('#16a34a', 0.05) : alpha(ac, 0.4),
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                border: `1px solid ${done ? alpha('#16a34a', 0.5) : alpha(p, 0.3)}`,
                                bgcolor: done ? alpha('#16a34a', 0.08) : alpha(p, 0.05),
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <Box sx={{ width: 34, height: 34, borderRadius: 2, flexShrink: 0, bgcolor: done ? alpha('#16a34a', 0.1) : alpha(p, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon sx={{ fontSize: 17, color: done ? '#16a34a' : p }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: tp, lineHeight: 1.3 }}>{item.label}</Typography>
                              <Typography sx={{ fontSize: '0.7rem', color: alpha(tp, 0.55), mt: 0.2 }}>{item.desc}</Typography>
                            </Box>
                            {done
                              ? <CheckCircle sx={{ fontSize: 15, color: '#16a34a', flexShrink: 0 }} />
                              : <OpenInNew sx={{ fontSize: 13, color: alpha(p, 0.35), flexShrink: 0 }} />
                            }
                          </Box>
                        );
                      })}

                      <Box sx={{ mt: 0.25, p: 1.5, bgcolor: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.25)}`, borderLeft: `3px solid #f59e0b`, borderRadius: '0 8px 8px 0' }}>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                          <InfoOutlined sx={{ fontSize: 13, color: '#d97706', mt: 0.2, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.72rem', color: '#92400e', lineHeight: 1.5 }}>
                            All three tables must be configured for payroll records to function correctly.
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 1.1, p: 1.85, borderRadius: 3, border: `1px solid ${alpha('#dc2626', 0.28)}`, bgcolor: alpha('#dc2626', 0.06) }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#991b1b', mb: 0.75 }}>
                      Important required inputs
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.6 }}>
                      {requiredInputLabels.map((field) => (
                        <Chip
                          key={field.key}
                          label={field.label}
                          size="small"
                          sx={{
                            width: '100%',
                            bgcolor: alpha('#dc2626', 0.12),
                            color: '#991b1b',
                            border: `1px solid ${alpha('#dc2626', 0.32)}`,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            height: 22,
                            '& .MuiChip-label': { px: 0.8, textAlign: 'center', width: '100%' },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </GlassCard>
            </Fade>
          </Grid>

          {/* ── RIGHT: Registration form ── */}
          <Grid item xs={12} lg={9} sx={{ display: 'flex' }}>
            <Fade in timeout={900} style={{ width: '100%' }}>
              <GlassCard sx={{ width: '100%' }}>
                {/* Form header */}
                <Box sx={{ px: 3.5, pt: 2.25, pb: 1.9, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, borderBottom: `1px solid ${alpha(p, 0.1)}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: -25, right: -25, width: 110, height: 110, background: `radial-gradient(circle, ${alpha(p, 0.07)} 0%, transparent 70%)` }} />
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.25, position: 'relative', zIndex: 1 }}>
                    <Avatar sx={{ bgcolor: alpha(p, 0.15), width: 44, height: 44, boxShadow: `0 4px 14px ${alpha(p, 0.15)}`, mt: 0.15 }}>
                      <PersonAdd sx={{ fontSize: 22, color: p }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: p, lineHeight: 1.2 }}>Register new user</Typography>
                      <Typography variant="caption" sx={{ color: tp, opacity: 0.7, display: 'block', mt: 0.35 }}>Add a single employee record with credentials</Typography>
                    </Box>
                  </Box>
                  <Chip label="Single" size="small" sx={{ bgcolor: alpha(p, 0.15), color: p, fontWeight: 600, position: 'relative', zIndex: 1, mt: 0.3 }} />
                </Box>

                {/* Form body */}
                <Box component="form" onSubmit={handleRegister} sx={{ p: 3 }}>

                  {/* ── Personal Information ── */}
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(tp, 0.45), mb: 1.75 }}>
                    Personal information
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    <Grid item xs={12} sm={3}>
                      <ModernTextField
                        name="firstName"
                        label={`First name${fieldRequirements.firstName ? ' *' : ''}`}
                        fullWidth size="small"
                        placeholder="Juan"
                        value={formData.firstName}
                        onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <ModernTextField
                        name="middleName"
                        label="Middle name"
                        fullWidth size="small"
                        placeholder="Santos"
                        value={formData.middleName}
                        onChange={handleChanges}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <ModernTextField
                        name="lastName"
                        label={`Last name${fieldRequirements.lastName ? ' *' : ''}`}
                        fullWidth size="small"
                        placeholder="Dela Cruz"
                        value={formData.lastName}
                        onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <FormControl fullWidth size="small" sx={selectControlSx}>
                        <InputLabel shrink sx={{ fontWeight: 500 }}>Ext.</InputLabel>
                        <Select
                          name="nameExtension"
                          value={formData.nameExtension}
                          label="Ext."
                          onChange={handleChanges}
                          displayEmpty
                          notched
                          sx={selectInnerSx}
                          renderValue={(val) => val || <span style={{ color: '#9CA3AF' }}>None</span>}
                        >
                          <MenuItem value=""><em style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>None</em></MenuItem>
                          <MenuItem value="Jr." sx={{ fontSize: '0.875rem' }}>Jr.</MenuItem>
                          <MenuItem value="Sr." sx={{ fontSize: '0.875rem' }}>Sr.</MenuItem>
                          <MenuItem value="II" sx={{ fontSize: '0.875rem' }}>II</MenuItem>
                          <MenuItem value="III" sx={{ fontSize: '0.875rem' }}>III</MenuItem>
                          <MenuItem value="IV" sx={{ fontSize: '0.875rem' }}>IV</MenuItem>
                          <MenuItem value="V" sx={{ fontSize: '0.875rem' }}>V</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Email full width */}
                    <Grid item xs={12}>
                      <ModernTextField
                        name="email"
                        label={`Email address${fieldRequirements.email ? ' *' : ''}`}
                        type="email"
                        fullWidth size="small"
                        placeholder="e.g., jdelacruz@earist.edu.ph"
                        value={formData.email}
                        onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        helperText={emailDomainRestricted ? 'Only @earist.edu.ph domain is accepted' : 'Enter a valid institutional email address'}
                        InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment> }}
                      />
                    </Grid>
                  </Grid>

                  {/* Divider */}
                  <Box sx={{ borderTop: `1px dashed ${alpha(p, 0.15)}`, my: 2.25 }} />

                  {/* ── Employment Details ── */}
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(tp, 0.45), mb: 1.75 }}>
                    Employment details
                  </Typography>

                  <Grid container spacing={2.25}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={selectControlSx}>
                        <InputLabel sx={{ fontWeight: 500 }}>
                          {`Employment category${fieldRequirements.employmentCategory ? ' *' : ''}`}
                        </InputLabel>
                        <Select
                          name="employmentCategory"
                          value={formData.employmentCategory}
                          label={`Employment category${fieldRequirements.employmentCategory ? ' *' : ''}`}
                          onChange={handleChanges}
                          displayEmpty
                          startAdornment={<InputAdornment position="start"><WorkOutline sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment>}
                          sx={selectInnerSx}
                          renderValue={(val) => {
                            if (val === '') return <span style={{ color: '#9CA3AF' }}>Select category</span>;
                            const map = { 0: 'Graduate (JO)', 1: 'UnderGrad (JO)', 2: 'Non-Teaching', 3: 'Teaching (30 hrs)', 4: 'Designated (40 hrs)', 5: 'Other…' };
                            return map[val] || val;
                          }}
                        >
                          <ListSubheader sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(tp, 0.45), lineHeight: '2rem' }}>Job Order</ListSubheader>
                          <MenuItem value={0} sx={{ fontSize: '0.875rem' }}><ListItemIcon sx={{ minWidth: 24 }}><Circle sx={{ fontSize: 10, color: '#F97316' }} /></ListItemIcon>Graduate</MenuItem>
                          <MenuItem value={1} sx={{ fontSize: '0.875rem' }}><ListItemIcon sx={{ minWidth: 24 }}><Circle sx={{ fontSize: 10, color: '#EF4444' }} /></ListItemIcon>UnderGrad</MenuItem>
                          <ListSubheader sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(tp, 0.45), lineHeight: '2rem' }}>Regular</ListSubheader>
                          <MenuItem value={2} sx={{ fontSize: '0.875rem' }}><ListItemIcon sx={{ minWidth: 24 }}><Circle sx={{ fontSize: 10, color: '#16A34A' }} /></ListItemIcon>Non-Teaching</MenuItem>
                          <MenuItem value={3} sx={{ fontSize: '0.875rem' }}><ListItemIcon sx={{ minWidth: 24 }}><Circle sx={{ fontSize: 10, color: '#1D4ED8' }} /></ListItemIcon>Teaching (30 hrs)</MenuItem>
                          <MenuItem value={4} sx={{ fontSize: '0.875rem' }}><ListItemIcon sx={{ minWidth: 24 }}><Circle sx={{ fontSize: 10, color: '#7C3AED' }} /></ListItemIcon>Designated (40 hrs)</MenuItem>
                          <ListSubheader sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(tp, 0.45), lineHeight: '2rem' }}>Other</ListSubheader>
                          <MenuItem value={5} sx={{ fontSize: '0.875rem' }}><ListItemIcon sx={{ minWidth: 24 }}><Circle sx={{ fontSize: 10, color: '#0D9488' }} /></ListItemIcon>Other — specify below</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <ModernTextField
                        name="employeeNumber"
                        label={`Employee number${fieldRequirements.employeeNumber ? ' *' : ''}`}
                        fullWidth size="small"
                        placeholder="e.g., 2013-4410"
                        value={formData.employeeNumber}
                        onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        helperText="e.g., 2013-4410 or 2013-4507M"
                        InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlined sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment> }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={selectControlSx}>
                        <InputLabel sx={{ fontWeight: 500 }}>
                          {`Department${fieldRequirements.department ? ' *' : ''}`}
                        </InputLabel>
                        <Select
                          name="department"
                          value={formData.department}
                          label={`Department${fieldRequirements.department ? ' *' : ''}`}
                          onChange={handleChanges}
                          displayEmpty
                          startAdornment={<InputAdornment position="start"><Business sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment>}
                          sx={selectInnerSx}
                          renderValue={(val) => val || <span style={{ color: '#9CA3AF' }}>Select department</span>}
                        >
                          {departmentCodes.map((code) => (
                            <MenuItem key={code} value={code} sx={{ fontSize: '0.875rem' }}>{code}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Custom category — only when "Other" is selected */}
                    {formData.employmentCategory === 5 && (
                      <Fade in timeout={200}>
                        <Grid item xs={12}>
                          <ModernTextField
                            name="customCategory"
                            label="Category description *"
                            fullWidth size="small"
                            placeholder="e.g., Part-timer, OJT, Consultant"
                            value={formData.customCategory}
                            onChange={handleChanges}
                            inputProps={{ maxLength: 100 }}
                            helperText={`${formData.customCategory.length}/100 characters`}
                            InputProps={{ startAdornment: <InputAdornment position="start"><WorkOutline sx={{ fontSize: 17, color: alpha(p, 0.45) }} /></InputAdornment> }}
                          />
                        </Grid>
                      </Fade>
                    )}

                    {/* ── Auto-generated password banner ── */}
                    <Grid item xs={12} sx={{ mt: 0.35 }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        px: 2.5, py: 1.5,
                        borderRadius: 3,
                        border: `1px dashed ${alpha(p, 0.3)}`,
                        bgcolor: alpha(p, 0.04),
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
                          <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: alpha(p, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LockOutlined sx={{ fontSize: 17, color: p }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: tp, lineHeight: 1.2 }}>Password</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.15 }}>
                              <Typography sx={{ fontSize: '0.65rem', color: alpha(tp, 0.5), fontWeight: 500 }}>From last name</Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ width: '1px', height: 30, bgcolor: alpha(p, 0.15), flexShrink: 0 }} />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {formData.password ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.2, py: 0.55, borderRadius: 1.5, bgcolor: alpha('#16a34a', 0.12), border: `1px solid ${alpha('#16a34a', 0.35)}` }}>
                              <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.9rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em' }}>
                                {formData.password}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: '0.8rem', color: alpha(tp, 0.38), fontStyle: 'italic' }}>
                              Enter a last name above to preview…
                            </Typography>
                          )}
                        </Box>

                        <Chip
                          icon={<CheckCircleOutline sx={{ fontSize: '13px !important' }} />}
                          label="Auto"
                          size="small"
                          sx={{ bgcolor: alpha(p, 0.1), color: p, fontWeight: 700, fontSize: '0.68rem', flexShrink: 0, height: 24, '& .MuiChip-icon': { color: p } }}
                        />

                        <Tooltip title="Derived from last name — uppercase, no spaces. The employee can change this after their first login." placement="top" arrow>
                          <InfoOutlined sx={{ fontSize: 16, color: alpha(tp, 0.3), cursor: 'help', flexShrink: 0 }} />
                        </Tooltip>
                      </Box>
                    </Grid>

                  </Grid>

                  {/* ── Alerts ── */}
                  {errMessage && (
                    <Fade in>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: 1.75, mt: 2, borderRadius: 3, bgcolor: alpha('#dc2626', 0.05), border: `1px solid ${alpha('#dc2626', 0.25)}` }}>
                        <ErrorOutline sx={{ fontSize: 17, color: '#dc2626', mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5 }}>{errMessage}</Typography>
                      </Box>
                    </Fade>
                  )}
                  {successMessage && (
                    <Fade in>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: 1.75, mt: 2, borderRadius: 3, bgcolor: alpha('#16a34a', 0.05), border: `1px solid ${alpha('#16a34a', 0.25)}` }}>
                        <CheckCircleOutline sx={{ fontSize: 17, color: '#16a34a', mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#15803d', lineHeight: 1.5 }}>{successMessage}</Typography>
                      </Box>
                    </Fade>
                  )}

                  <Box sx={{ mt: 2.5, pt: 2.25, borderTop: `1px solid ${alpha(p, 0.1)}` }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isInformationConfirmed}
                          onChange={(e) => setIsInformationConfirmed(e.target.checked)}
                          disabled={isLoading}
                          sx={{
                            p: 0.5,
                            mr: 1,
                            color: alpha(p, 0.55),
                            '&.Mui-checked': { color: p },
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: '0.8rem', color: tp, lineHeight: 1.4 }}>
                          I certify that the employee information entered above is accurate, complete, and ready for official record.
                        </Typography>
                      }
                      sx={{
                        ml: 0,
                        mr: 0,
                        alignItems: 'center',
                        '& .MuiFormControlLabel-label': {
                          display: 'flex',
                          alignItems: 'center',
                        },
                      }}
                    />

                    <Box sx={{ mt: 3 }}>
                      <ProfessionalButton
                        type="submit"
                        variant="contained"
                        disabled={isLoading || !isInformationConfirmed}
                        startIcon={isLoading ? <CircularProgress size={16} sx={{ color: ac }} /> : <PersonAddAlt1 />}
                        sx={{
                          width: '100%',
                          minHeight: 58,
                          bgcolor: p,
                          color: ac,
                          '&:hover': { bgcolor: s },
                          '&:disabled': { bgcolor: alpha(p, 0.4), color: alpha(ac, 0.7) },
                        }}
                      >
                        {isLoading ? 'Registering…' : 'Register User'}
                      </ProfessionalButton>
                    </Box>
                  </Box>

                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>
      </Box>

      <LoadingOverlay open={isLoading} message="Registering user…" />
    </Box>
  );
};

export default Registration;