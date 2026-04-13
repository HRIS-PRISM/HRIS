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
} from '@mui/icons-material';
import axios from 'axios';

import AccessDenied from './AccessDenied';
import LoadingOverlay from './LoadingOverlay';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  divider:      'rgba(0,0,0,0.08)',
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes regShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes regBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
    backgroundSize: '800px 100%',
    animation: 'regShimmer 1.6s infinite linear',
    flexShrink: 0, ...sx,
  }} />
);

const useSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('systemSettings');
      if (stored) { const parsed = JSON.parse(stored); if (parsed && typeof parsed === 'object') return parsed; }
    } catch {}
    return {};
  });
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api') ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        if (response.data && typeof response.data === 'object') { setSettings(response.data); localStorage.setItem('systemSettings', JSON.stringify(response.data)); }
      } catch (e) { console.error('Error fetching system settings:', e); }
    };
    fetchSettings();
  }, []);
  return settings;
};

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const RegistrationWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 },
      mt: { xs: 0, md: -2 },
      mb: { xs: 1, md: 2 },
      width: '100vw', maxWidth: '100%',
      position: 'relative', left: '63%', transform: 'translateX(-61%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>
      <Box sx={{
        mb: 2, borderRadius: '12px', overflow: 'hidden',
        border: '0.5px solid rgba(0,0,0,0.09)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        bgcolor: '#fff',
        animation: 'regBlink 2.2s ease-in-out infinite',
      }}>
        <Box sx={{
          px: 4, py: 3,
          background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.08)', flexShrink: 0 }} />
            <Box>
              <Bone w={200} h={20} r={5} sx={{ mb: 0.75 }} />
              <Bone w={320} h={11} r={4} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'rgba(109,35,35,0.06)', borderRadius: 2, px: 0.5, py: 0.5 }}>
            <Bone w={54} h={28} r={6} />
            <Bone w={54} h={28} r={6} />
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} lg={3} sx={{ display: 'flex' }}>
          <Box sx={{
            width: '100%', display: 'flex', flexDirection: 'column',
            borderRadius: '12px', overflow: 'hidden',
            bgcolor: '#fff',
            border: '0.5px solid rgba(0,0,0,0.09)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            animation: 'regBlink 2.2s ease-in-out 0.05s infinite',
          }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(109,35,35,0.06)' }}>
              <Bone w={80} h={9} r={3} sx={{ mb: 0.6 }} />
              <Bone w={190} h={11} r={4} />
            </Box>
            <Box sx={{ p: 2.75, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ p: 1.9, borderRadius: 3, border: '1px solid rgba(109,35,35,0.14)', bgcolor: 'rgba(109,35,35,0.06)' }}>
                <Bone w={120} h={8} r={3} sx={{ mb: 0.9 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.35 }}>
                  {[0, 0.06, 0.12].map((delay, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, borderRadius: 3, border: '1px solid rgba(109,35,35,0.14)', bgcolor: '#fff', animation: `regBlink 2.2s ease-in-out ${delay}s infinite` }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.08)', flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}><Bone w="60%" h={11} r={4} sx={{ mb: 0.5 }} /><Bone w="85%" h={9} r={3} /></Box>
                      <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.14)' }} />
                    </Box>
                  ))}
                  <Box sx={{ mt: 0.25, p: 1.5, bgcolor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0' }}>
                    <Bone w="90%" h={9} r={3} sx={{ mb: 0.5 }} />
                    <Bone w="70%" h={9} r={3} />
                  </Box>
                </Box>
              </Box>
              <Box sx={{ p: 1.85, borderRadius: 3, border: '1px solid rgba(220,38,38,0.2)', bgcolor: 'rgba(220,38,38,0.04)' }}>
                <Bone w={150} h={8} r={3} sx={{ mb: 0.9 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.6 }}>
                  {[...Array(6)].map((_, i) => (
                    <Box key={i} sx={{ height: 22, borderRadius: 11, bgcolor: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.28)' }} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} lg={9} sx={{ display: 'flex' }}>
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', bgcolor: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', animation: 'regBlink 2.2s ease-in-out 0.08s infinite' }}>
            <Box sx={{ px: 3.5, pt: 2.25, pb: 1.9, background: 'linear-gradient(135deg, #fdf5f5 0%, #f5e8e8 100%)', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.25 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(109,35,35,0.08)', flexShrink: 0, mt: 0.15 }} />
                <Box><Bone w={170} h={18} r={5} sx={{ mb: 0.5 }} /><Bone w={240} h={11} r={4} /></Box>
              </Box>
              <Box sx={{ width: 56, height: 24, borderRadius: 10, mt: 0.3, bgcolor: 'rgba(109,35,35,0.08)', border: '1px solid rgba(109,35,35,0.14)' }} />
            </Box>
            <Box sx={{ p: 3 }}>
              <Bone w={140} h={9} r={4} sx={{ mb: 1.75 }} />
              <Grid container spacing={2}>
                {[3,3,4,2].map((sm, i) => (
                  <Grid item xs={12} sm={sm} key={i}>
                    <Box sx={{ height: 40, borderRadius: 2, border: '1px solid rgba(109,35,35,0.14)', bgcolor: '#fafafa' }} />
                  </Grid>
                ))}
                <Grid item xs={12}><Box sx={{ height: 40, borderRadius: 2, border: '1px solid rgba(109,35,35,0.14)', bgcolor: '#fafafa', mb: 0.5 }} /><Bone w={220} h={9} r={3} /></Grid>
              </Grid>
              <Box sx={{ borderTop: '1px dashed rgba(0,0,0,0.08)', my: 2.25 }} />
              <Bone w={155} h={9} r={4} sx={{ mb: 1.75 }} />
              <Grid container spacing={2.25}>
                {[4,4,4].map((sm, i) => (
                  <Grid item xs={12} sm={sm} key={i}>
                    <Box sx={{ height: 40, borderRadius: 2, border: '1px solid rgba(109,35,35,0.14)', bgcolor: '#fafafa' }} />
                  </Grid>
                ))}
                <Grid item xs={12} sx={{ mt: 0.35 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderRadius: 3, border: '1px dashed rgba(109,35,35,0.14)', bgcolor: 'rgba(109,35,35,0.06)' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.08)', flexShrink: 0 }} />
                    <Bone w={130} h={14} r={4} />
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ width: 44, height: 24, borderRadius: 10, bgcolor: 'rgba(109,35,35,0.06)', border: '1px solid rgba(109,35,35,0.14)', flexShrink: 0 }} />
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2.5, pt: 2.25, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 3 }}>
                  <Box sx={{ width: 18, height: 18, borderRadius: 1, border: '2px solid rgba(109,35,35,0.25)', flexShrink: 0, mt: 0.1 }} />
                  <Bone w="75%" h={11} r={4} />
                </Box>
                <Box sx={{ height: 58, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.18)' }} />
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

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
  useSystemSettings();

  // ── Styled components ─────────────────────────────────────────────────────
  const GlassCard = useMemo(() => styled(Card)(() => ({
    borderRadius: 12,
    background: '#ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
    border: '0.5px solid rgba(0,0,0,0.09)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': { boxShadow: '0 4px 20px rgba(109,35,35,0.10)' },
  })), []);

  const ProfessionalButton = useMemo(() => styled(Button)(({ variant: v }) => ({
    borderRadius: 8, fontWeight: 600, padding: '10px 22px',
    transition: 'all 0.18s ease',
    textTransform: 'none', fontSize: '0.9rem', letterSpacing: '0.015em',
    boxShadow: v === 'contained' ? '0 2px 10px rgba(109,35,35,0.28)' : 'none',
    '&:hover': { transform: 'translateY(-1px)', boxShadow: v === 'contained' ? '0 4px 16px rgba(109,35,35,0.38)' : 'none' },
    '&:active': { transform: 'translateY(0)' },
  })), []);

  const ModernTextField = useMemo(() => styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 8,
      transition: 'all 0.18s ease',
      backgroundColor: '#fafafa',
      '& fieldset': { borderColor: T.accentBorder },
      '&:hover': { backgroundColor: '#fff', '& fieldset': { borderColor: T.accentMid } },
      '&.Mui-focused': { backgroundColor: '#fff', boxShadow: '0 0 0 2px rgba(109,35,35,0.12)', '& fieldset': { borderColor: T.accent } },
    },
    '& .MuiInputLabel-root': { fontWeight: 500, '&.Mui-focused': { color: T.accent } },
    '& .MuiFormHelperText-root': { marginLeft: 0, fontSize: '0.72rem' },
    '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: T.faint },
  })), []);

  const [formData, setFormData]                             = useState(EMPTY_FORM);
  const [errMessage, setErrorMessage]                       = useState('');
  const [successMessage, setSuccessMessage]                 = useState('');
  const [isLoading, setIsLoading]                           = useState(false);
  const [isInformationConfirmed, setIsInformationConfirmed] = useState(false);
  const [completedSteps, setCompletedSteps]                 = useState({ remittance: false, department: false, itemTable: false });
  const [fieldRequirements, setFieldRequirements]           = useState({
    firstName: true, lastName: true, email: true, employeeNumber: true,
    employmentCategory: true, password: true, middleName: false, nameExtension: false, department: false,
  });
  const [emailDomainRestricted, setEmailDomainRestricted]   = useState(false);
  const [departmentCodes, setDepartmentCodes]               = useState([]);

  // ── Dynamic employment type configs ───────────────────────────────────────
  const [typeConfigs, setTypeConfigs]                       = useState([]);
  const [typeConfigsLoading, setTypeConfigsLoading]         = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const apiBase  = useMemo(() => (API_BASE_URL.includes('/api') ? API_BASE_URL : `${API_BASE_URL}/api`), []);

  // ── Fetch type configs ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTypeConfigs = async () => {
      setTypeConfigsLoading(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTypeConfigs(r.data.flat || []);
      } catch {
        // non-fatal — dropdown will show empty state
      } finally {
        setTypeConfigsLoading(false);
      }
    };
    fetchTypeConfigs();
  }, []);

  // ── Group active configs by parentGroup ───────────────────────────────────
  const groupedTypeConfigs = useMemo(() => {
    const grouped = {};
    typeConfigs.filter(t => t.isActive !== false).forEach(t => {
      if (!grouped[t.parentGroup]) grouped[t.parentGroup] = [];
      grouped[t.parentGroup].push(t);
    });
    return grouped;
  }, [typeConfigs]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousBodyOverflow; document.documentElement.style.overflow = previousHtmlOverflow; };
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
        if (res.ok) { const data = await res.json(); if (data?.setting_value) { try { setFieldRequirements(JSON.parse(data.setting_value)); } catch {} } return; }
        if (res.status === 404) {
          const allSettingsRes = await fetch(`${apiBase}/system-settings`, { headers: { Authorization: `Bearer ${token}` } });
          if (!allSettingsRes.ok) return;
          const allSettings = await allSettingsRes.json();
          const raw = allSettings?.registration_field_requirements;
          if (!raw) return;
          if (typeof raw === 'string') { try { setFieldRequirements(JSON.parse(raw)); } catch {} return; }
          if (typeof raw === 'object') setFieldRequirements(raw);
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
      // employmentCategory is now a type-config id (string) or ''
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
    const { firstName, lastName, email, employeeNumber, password, employmentCategory, department } = formData;
    const missing = [];
    if (fieldRequirements.firstName && !firstName)                         missing.push('First Name');
    if (fieldRequirements.lastName && !lastName)                           missing.push('Last Name');
    if (fieldRequirements.email && !email)                                 missing.push('Email');
    if (fieldRequirements.employeeNumber && !employeeNumber)               missing.push('Employee Number');
    if (fieldRequirements.password && !password)                           missing.push('Password');
    if (fieldRequirements.employmentCategory && !employmentCategory)       missing.push('Employment Category');
    if (fieldRequirements.department && !department)                       missing.push('Department');
    if (missing.length)                                                    { setErrorMessage(`Required fields missing: ${missing.join(', ')}.`); setSuccessMessage(''); return; }
    if (!isValidName(firstName))                                           { setErrorMessage('Enter a valid first name (2–50 letters).'); setSuccessMessage(''); return; }
    if (!isValidName(lastName))                                            { setErrorMessage('Enter a valid last name (2–50 letters).'); setSuccessMessage(''); return; }
    if (formData.middleName && !isValidName(formData.middleName))         { setErrorMessage('Enter a valid middle name (2–50 letters).'); setSuccessMessage(''); return; }
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))                      { setErrorMessage('Enter a valid email address.'); return; }
      if (emailDomainRestricted && !email.toLowerCase().endsWith('@earist.edu.ph')) { setErrorMessage('Email must use the @earist.edu.ph domain.'); return; }
    }
    setIsLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        ...getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          // Send the type-config id as employmentCategory so the backend can store it
          employmentCategory: formData.employmentCategory ? parseInt(formData.employmentCategory, 10) : '',
          customCategory: '',
        }),
      });
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

  if (accessLoading) return <RegistrationWireframe />;

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
    borderRadius: 8,
    backgroundColor: '#fafafa',
    transition: 'all 0.18s ease',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentBorder, borderRadius: 8 },
    '&:hover': { backgroundColor: '#fff', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accentMid } },
    '&.Mui-focused': { backgroundColor: '#fff', boxShadow: '0 0 0 2px rgba(109,35,35,0.12)', '& .MuiOutlinedInput-notchedOutline': { borderColor: T.accent } },
  };

  const selectControlSx = { '& .MuiInputLabel-root': { fontWeight: 500, '&.Mui-focused': { color: T.accent } } };

  const requiredInputLabels = [
    { key: 'firstName',          label: 'First Name'           },
    { key: 'lastName',           label: 'Last Name'            },
    { key: 'email',              label: 'Email'                },
    { key: 'employeeNumber',     label: 'Employee Number'      },
    { key: 'employmentCategory', label: 'Employment Category'  },
    { key: 'password',           label: 'Password'             },
    { key: 'department',         label: 'Department'           },
  ].filter((field) => fieldRequirements[field.key]);

  // Resolve selected type config for preview chip
  const selectedTypeCfg = formData.employmentCategory
    ? typeConfigs.find(t => String(t.id) === String(formData.employmentCategory))
    : null;

  return (
    <Box
      sx={{
        pt: 3, pb: 3,
        width: '100%', mx: 'auto', maxWidth: '100%',
        overflowX: 'hidden', overflowY: 'hidden',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        minHeight: '100vh', boxSizing: 'border-box',
      }}
    >
      <style>{shimmerKf}</style>
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>

        {/* ── Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 3 }}>
            <GlassCard>
              <Box sx={{
                px: 4, py: 3,
                background: 'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
                position: 'relative', overflow: 'hidden',
              }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `radial-gradient(circle, ${T.accentFaint} 0%, transparent 70%)` }} />
                <Box sx={{ position: 'absolute', bottom: -25, left: '30%', width: 120, height: 120, background: 'radial-gradient(circle, rgba(109,35,35,0.04) 0%, transparent 70%)' }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: T.accentFaint, width: 52, height: 52, boxShadow: '0 4px 14px rgba(109,35,35,0.12)' }}>
                      <PersonAdd sx={{ fontSize: 26, color: T.accent }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2, color: T.accent }}>User Registration</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 400, color: T.muted, mt: 0.25 }}>Register new employees and configure their initial access</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tabs
                      value={location.pathname === '/bulk-register' ? 'bulk' : 'single'}
                      onChange={(_, value) => navigate(value === 'bulk' ? '/bulk-register' : '/registration')}
                      sx={{
                        minHeight: 36, bgcolor: T.accentFaint, borderRadius: 2, px: 0.5,
                        '& .MuiTabs-indicator': { display: 'none' },
                      }}
                    >
                      <Tab value="single" label="Single" sx={{ minHeight: 30, py: 0.35, px: 1.4, textTransform: 'none', fontSize: '0.78rem', fontWeight: 700, borderRadius: 1.5, color: T.muted, '&.Mui-selected': { bgcolor: T.accent, color: '#fff' } }} />
                      <Tab value="bulk"   label="Bulk"   sx={{ minHeight: 30, py: 0.35, px: 1.4, textTransform: 'none', fontSize: '0.78rem', fontWeight: 700, borderRadius: 1.5, color: T.muted, '&.Mui-selected': { bgcolor: T.accent, color: '#fff' } }} />
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
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.faint, mb: 0.4 }}>
                        Next steps
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: T.text, lineHeight: 1.4, fontWeight: 400 }}>
                        Complete these after registering a user
                      </Typography>
                    </Box>
                  }
                  sx={{ bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, py: 1.75, px: 2.5 }}
                />
                <CardContent sx={{ p: 2.75, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ p: 1.9, borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.faint, mb: 0.9 }}>
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
                              border: `1px solid ${done ? 'rgba(46,125,50,0.3)' : T.accentBorder}`,
                              bgcolor: done ? 'rgba(46,125,50,0.04)' : '#fff',
                              cursor: 'pointer', transition: 'all 0.18s ease',
                              '&:hover': {
                                border: `1px solid ${done ? 'rgba(46,125,50,0.5)' : T.accent}`,
                                bgcolor: done ? 'rgba(46,125,50,0.08)' : T.accentFaint,
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <Box sx={{ width: 34, height: 34, borderRadius: 2, flexShrink: 0, bgcolor: done ? 'rgba(46,125,50,0.1)' : T.accentFaint, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon sx={{ fontSize: 17, color: done ? '#2E7D32' : T.accent }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: T.text, lineHeight: 1.3 }}>{item.label}</Typography>
                              <Typography sx={{ fontSize: '0.7rem', color: T.muted, mt: 0.2 }}>{item.desc}</Typography>
                            </Box>
                            {done
                              ? <CheckCircle sx={{ fontSize: 15, color: '#2E7D32', flexShrink: 0 }} />
                              : <OpenInNew sx={{ fontSize: 13, color: T.faint, flexShrink: 0 }} />
                            }
                          </Box>
                        );
                      })}
                      <Box sx={{ mt: 0.25, p: 1.5, bgcolor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0' }}>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                          <InfoOutlined sx={{ fontSize: 13, color: '#d97706', mt: 0.2, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.72rem', color: '#92400e', lineHeight: 1.5 }}>
                            All three tables must be configured for payroll records to function correctly.
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ p: 1.85, borderRadius: 3, border: '1px solid rgba(220,38,38,0.2)', bgcolor: 'rgba(220,38,38,0.04)' }}>
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
                            bgcolor: 'rgba(220,38,38,0.10)',
                            color: '#991b1b',
                            border: '1px solid rgba(220,38,38,0.28)',
                            fontSize: '0.68rem', fontWeight: 800, height: 22,
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
                <Box sx={{
                  px: 3.5, pt: 2.25, pb: 1.9,
                  background: 'linear-gradient(135deg, #fdf5f5 0%, #f5e8e8 100%)',
                  borderBottom: `1px solid ${T.divider}`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <Box sx={{ position: 'absolute', top: -25, right: -25, width: 110, height: 110, background: `radial-gradient(circle, ${T.accentFaint} 0%, transparent 70%)` }} />
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.25, position: 'relative', zIndex: 1 }}>
                    <Avatar sx={{ bgcolor: T.accentFaint, width: 44, height: 44, boxShadow: '0 2px 8px rgba(109,35,35,0.12)', mt: 0.15 }}>
                      <PersonAdd sx={{ fontSize: 22, color: T.accent }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: T.accent, lineHeight: 1.2 }}>Register new user</Typography>
                      <Typography variant="caption" sx={{ color: T.muted, display: 'block', mt: 0.35 }}>Add a single employee record with credentials</Typography>
                    </Box>
                  </Box>
                  <Chip label="Single" size="small" sx={{ bgcolor: T.accentFaint, color: T.accent, fontWeight: 600, border: `1px solid ${T.accentBorder}`, position: 'relative', zIndex: 1, mt: 0.3 }} />
                </Box>

                {/* Form body */}
                <Box component="form" onSubmit={handleRegister} sx={{ p: 3 }}>

                  {/* ── Personal Information ── */}
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.faint, mb: 1.75 }}>
                    Personal information
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    <Grid item xs={12} sm={3}>
                      <ModernTextField
                        name="firstName"
                        label={`First name${fieldRequirements.firstName ? ' *' : ''}`}
                        fullWidth size="small" placeholder="Juan"
                        value={formData.firstName} onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17 }} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <ModernTextField
                        name="middleName" label="Middle name"
                        fullWidth size="small" placeholder="Santos"
                        value={formData.middleName} onChange={handleChanges}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17 }} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <ModernTextField
                        name="lastName"
                        label={`Last name${fieldRequirements.lastName ? ' *' : ''}`}
                        fullWidth size="small" placeholder="Dela Cruz"
                        value={formData.lastName} onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17 }} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <FormControl fullWidth size="small" sx={selectControlSx}>
                        <InputLabel shrink sx={{ fontWeight: 500 }}>Ext.</InputLabel>
                        <Select
                          name="nameExtension" value={formData.nameExtension}
                          label="Ext." onChange={handleChanges}
                          displayEmpty notched sx={selectInnerSx}
                          renderValue={(val) => val || <span style={{ color: T.faint }}>None</span>}
                        >
                          <MenuItem value=""><em style={{ color: T.faint, fontSize: '0.85rem' }}>None</em></MenuItem>
                          {['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.875rem' }}>{v}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <ModernTextField
                        name="email"
                        label={`Email address${fieldRequirements.email ? ' *' : ''}`}
                        type="email" fullWidth size="small"
                        placeholder="e.g., jdelacruz@earist.edu.ph"
                        value={formData.email} onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        helperText={emailDomainRestricted ? 'Only @earist.edu.ph domain is accepted' : 'Enter a valid institutional email address'}
                        InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ fontSize: 17 }} /></InputAdornment> }}
                      />
                    </Grid>
                  </Grid>

                  {/* Divider */}
                  <Box sx={{ borderTop: `1px dashed ${T.divider}`, my: 2.25 }} />

                  {/* ── Employment Details ── */}
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.faint, mb: 1.75 }}>
                    Employment details
                  </Typography>

                  <Grid container spacing={2.25}>
                    {/* ── Dynamic Employment Category ── */}
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={selectControlSx}>
                        <InputLabel shrink sx={{ fontWeight: 500 }}>
                          {`Employment category${fieldRequirements.employmentCategory ? ' *' : ''}`}
                        </InputLabel>
                        {typeConfigsLoading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, border: `1px solid ${T.accentBorder}`, borderRadius: 2, bgcolor: '#fafafa', minHeight: 40 }}>
                            <CircularProgress size={14} sx={{ color: T.accent }} />
                            <Typography sx={{ fontSize: '0.8rem', color: T.faint }}>Loading…</Typography>
                          </Box>
                        ) : typeConfigs.length === 0 ? (
                          <Box sx={{ px: 1.5, py: 1, border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, bgcolor: alpha(T.accent, 0.02), minHeight: 40, display: 'flex', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: '0.75rem', color: T.muted, fontStyle: 'italic' }}>No categories configured</Typography>
                          </Box>
                        ) : (
                          <Select
                            name="employmentCategory"
                            value={formData.employmentCategory}
                            label={`Employment category${fieldRequirements.employmentCategory ? ' *' : ''}`}
                            onChange={handleChanges}
                            displayEmpty
                            notched
                            startAdornment={<InputAdornment position="start"><WorkOutline sx={{ fontSize: 17 }} /></InputAdornment>}
                            sx={selectInnerSx}
                            renderValue={(val) => {
                              if (!val) return <span style={{ color: T.faint }}>Select category</span>;
                              const found = typeConfigs.find(t => String(t.id) === String(val));
                              if (!found) return val;
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Circle sx={{ fontSize: 8, color: found.colorHex }} />
                                  <Typography sx={{ fontSize: '0.875rem' }}>{found.parentGroup} | {found.typeName}</Typography>
                                </Box>
                              );
                            }}
                          >
                            <MenuItem value="" disabled>
                              <Typography sx={{ color: T.faint, fontSize: '0.875rem' }}>Select category…</Typography>
                            </MenuItem>
                            {Object.entries(groupedTypeConfigs).flatMap(([group, items]) => [
                              <ListSubheader
                                key={`hdr-${group}`}
                                sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: alpha(T.accent, 0.55), lineHeight: '2em', bgcolor: T.accentFaint }}
                              >
                                {group}
                              </ListSubheader>,
                              ...items.map(item => (
                                <MenuItem key={item.id} value={String(item.id)} sx={{ py: 0.9, fontSize: '0.875rem' }}>
                                  <ListItemIcon sx={{ minWidth: 26, display: 'flex', alignItems: 'center' }}>
                                    <Circle sx={{ fontSize: 8, color: item.colorHex }} />
                                  </ListItemIcon>
                                  {item.typeName}
                                </MenuItem>
                              )),
                            ])}
                          </Select>
                        )}
                      </FormControl>
                      {/* Preview chip for selected type */}
                      {selectedTypeCfg && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, px: 1.25, py: 0.6, borderRadius: 2, bgcolor: alpha(selectedTypeCfg.colorHex, 0.07), border: `1px solid ${alpha(selectedTypeCfg.colorHex, 0.22)}` }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: selectedTypeCfg.colorHex, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: selectedTypeCfg.colorHex }}>
                            {selectedTypeCfg.parentGroup} | {selectedTypeCfg.typeName}
                          </Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <ModernTextField
                        name="employeeNumber"
                        label={`Employee number${fieldRequirements.employeeNumber ? ' *' : ''}`}
                        fullWidth size="small" placeholder="e.g., 2013-4410"
                        value={formData.employeeNumber} onChange={handleChanges}
                        InputLabelProps={{ required: false }}
                        helperText="e.g., 2013-4410 or 2013-4507M"
                        InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlined sx={{ fontSize: 17 }} /></InputAdornment> }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={selectControlSx}>
                        <InputLabel sx={{ fontWeight: 500 }}>{`Department${fieldRequirements.department ? ' *' : ''}`}</InputLabel>
                        <Select
                          name="department" value={formData.department}
                          label={`Department${fieldRequirements.department ? ' *' : ''}`}
                          onChange={handleChanges} displayEmpty
                          startAdornment={<InputAdornment position="start"><Business sx={{ fontSize: 17 }} /></InputAdornment>}
                          sx={selectInnerSx}
                          renderValue={(val) => val || <span style={{ color: T.faint }}>Select department</span>}
                        >
                          {departmentCodes.map((code) => (
                            <MenuItem key={code} value={code} sx={{ fontSize: '0.875rem' }}>{code}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* ── Auto-generated password banner ── */}
                    <Grid item xs={12} sx={{ mt: 0.35 }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        px: 2.5, py: 1.5, borderRadius: 3,
                        border: `1px dashed ${T.accentBorder}`,
                        bgcolor: T.accentFaint,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
                          <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(109,35,35,0.08)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LockOutlined sx={{ fontSize: 17, color: T.accent }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>Password</Typography>
                            <Typography sx={{ fontSize: '0.65rem', color: T.faint, fontWeight: 500, mt: 0.15 }}>From last name</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ width: '1px', height: 30, bgcolor: T.accentBorder, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {formData.password ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.2, py: 0.55, borderRadius: 1.5, bgcolor: 'rgba(46,125,50,0.10)', border: '1px solid rgba(46,125,50,0.3)' }}>
                              <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.9rem', fontWeight: 700, color: '#1a5e20', letterSpacing: '0.08em' }}>
                                {formData.password}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: '0.8rem', color: T.faint, fontStyle: 'italic' }}>
                              Enter a last name above to preview…
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          icon={<CheckCircleOutline sx={{ fontSize: '13px !important' }} />}
                          label="Auto" size="small"
                          sx={{ bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, fontSize: '0.68rem', flexShrink: 0, height: 24, border: `1px solid ${T.accentBorder}`, '& .MuiChip-icon': { color: T.accent } }}
                        />
                        <Tooltip title="Derived from last name — uppercase, no spaces. The employee can change this after their first login." placement="top" arrow>
                          <InfoOutlined sx={{ fontSize: 16, color: T.faint, cursor: 'help', flexShrink: 0 }} />
                        </Tooltip>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* ── Alerts ── */}
                  {errMessage && (
                    <Fade in>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: 1.75, mt: 2, borderRadius: 3, bgcolor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.22)' }}>
                        <ErrorOutline sx={{ fontSize: 17, color: '#dc2626', mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5 }}>{errMessage}</Typography>
                      </Box>
                    </Fade>
                  )}
                  {successMessage && (
                    <Fade in>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: 1.75, mt: 2, borderRadius: 3, bgcolor: 'rgba(46,125,50,0.05)', border: '1px solid rgba(46,125,50,0.22)' }}>
                        <CheckCircleOutline sx={{ fontSize: 17, color: '#2E7D32', mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#1a5e20', lineHeight: 1.5 }}>{successMessage}</Typography>
                      </Box>
                    </Fade>
                  )}

                  <Box sx={{ mt: 2.5, pt: 2.25, borderTop: `1px solid ${T.divider}` }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isInformationConfirmed}
                          onChange={(e) => setIsInformationConfirmed(e.target.checked)}
                          disabled={isLoading}
                          sx={{ p: 0.5, mr: 1, color: T.accentBorder, '&.Mui-checked': { color: T.accent } }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: '0.8rem', color: T.muted, lineHeight: 1.4 }}>
                          I certify that the employee information entered above is accurate, complete, and ready for official record.
                        </Typography>
                      }
                      sx={{ ml: 0, mr: 0, alignItems: 'center', '& .MuiFormControlLabel-label': { display: 'flex', alignItems: 'center' } }}
                    />

                    <Box sx={{ mt: 3 }}>
                      <ProfessionalButton
                        type="submit" variant="contained"
                        disabled={isLoading || !isInformationConfirmed}
                        startIcon={isLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PersonAddAlt1 />}
                        sx={{
                          width: '100%', minHeight: 58,
                          bgcolor: T.accent, color: '#fff',
                          '&:hover': { bgcolor: T.accentDark },
                          '&:disabled': { bgcolor: 'rgba(109,35,35,0.3)', color: 'rgba(255,255,255,0.6)' },
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