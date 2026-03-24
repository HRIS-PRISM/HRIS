import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import LoadingOverlay from './LoadingOverlay';
import SuccessfulOverlay from './SuccessfulOverlay';
import {
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Fade,
  Divider,
  alpha,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  TextField,
  styled,
  Tooltip,
} from '@mui/material';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  GroupAdd,
  CloudUpload,
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  FileUpload,
  People,
  ArrowBack,
  AccountBalanceWallet,
  Business,
  AssignmentOutlined,
  PersonAdd,
  CheckCircle,
  OpenInNew,
} from '@mui/icons-material';

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKeyframes = `
@keyframes blkShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blkPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
`;

const BlkShim = ({ width = '100%', height = 16, borderRadius = 8, sx = {} }) => (
  <Box sx={{
    width, height, borderRadius: `${borderRadius}px`, flexShrink: 0,
    background: 'linear-gradient(90deg,rgba(137,68,68,0.08) 25%,rgba(137,68,68,0.20) 50%,rgba(137,68,68,0.08) 75%)',
    backgroundSize: '800px 100%',
    animation: 'blkShimmer 1.5s infinite linear',
    ...sx,
  }} />
);

// ─── System settings hook ─────────────────────────────────────────────────────
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

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const BulkRegisterWireframe = ({ settings }) => {
  const p  = settings?.primaryColor || '#894444';
  const ac = settings?.accentColor  || '#FEF9E1';

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box sx={{ py: 3, width: '100vw', mx: 'auto', maxWidth: '100%', overflow: 'hidden', position: 'relative', left: '50%', transform: 'translateX(-50%)', minHeight: '92vh' }}>
        <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
          {/* Header shimmer */}
          <Box sx={{ mb: 3, borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, boxShadow: `0 8px 40px ${alpha(p, 0.08)}`, animation: 'blkPulse 2.2s ease-in-out infinite' }}>
            <Box sx={{ px: 4, py: 3, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: alpha(p, 0.12), flexShrink: 0 }} />
                  <Box><BlkShim width={220} height={22} borderRadius={6} sx={{ mb: 0.75 }} /><BlkShim width={320} height={12} borderRadius={4} /></Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}><BlkShim width={80} height={26} borderRadius={14} /><BlkShim width={160} height={40} borderRadius={12} /></Box>
              </Box>
            </Box>
          </Box>
          <Grid container spacing={3}>
            {/* Left shimmer */}
            <Grid item xs={12} lg={3}>
              <Box sx={{ borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: 'blkPulse 2.2s ease-in-out 0.05s infinite' }}>
                <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${alpha(p, 0.08)}`, bgcolor: alpha(ac, 0.5) }}><BlkShim width={120} height={10} borderRadius={4} sx={{ mb: 0.6 }} /><BlkShim width={190} height={11} borderRadius={4} /></Box>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[0, 0.06, 0.12].map((delay, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, borderRadius: 3, border: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.4), animation: `blkPulse 2.2s ease-in-out ${delay}s infinite` }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: alpha(p, 0.1), flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}><BlkShim width="60%" height={11} borderRadius={4} sx={{ mb: 0.5 }} /><BlkShim width="85%" height={10} borderRadius={3} /></Box>
                      <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: alpha(p, 0.1) }} />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            {/* Right shimmer */}
            <Grid item xs={12} lg={9}>
              <Box sx={{ borderRadius: 20, overflow: 'hidden', background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: 'blkPulse 2.2s ease-in-out 0.08s infinite' }}>
                <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, borderBottom: `1px solid ${alpha(p, 0.1)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}><Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: alpha(p, 0.12), flexShrink: 0 }} /><Box><BlkShim width={180} height={18} borderRadius={6} sx={{ mb: 0.5 }} /><BlkShim width={260} height={11} borderRadius={4} /></Box></Box>
                  <BlkShim width={65} height={24} borderRadius={14} />
                </Box>
                <Box sx={{ p: 3 }}>
                  <BlkShim width={160} height={10} borderRadius={4} sx={{ mb: 1.75 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {[80, 110, 95, 120, 90].map((w, i) => <BlkShim key={i} width={w} height={24} borderRadius={12} />)}
                  </Box>
                  <Box sx={{ borderTop: `1px dashed ${alpha(p, 0.15)}`, my: 2.25 }} />
                  <Box sx={{ height: 140, borderRadius: 3, border: `2px dashed ${alpha(p, 0.2)}`, bgcolor: alpha(p, 0.03), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BlkShim width={120} height={40} borderRadius={12} />
                  </Box>
                  <Box sx={{ borderTop: `1px solid ${alpha(p, 0.08)}`, pt: 2.5, mt: 2.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <BlkShim width="60%" height={44} borderRadius={12} />
                    <BlkShim width="38%" height={44} borderRadius={12} />
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

// ─── Setup checklist items ────────────────────────────────────────────────────
const SETUP_ITEMS = [
  { key: 'remittance', label: 'Remittances',          desc: 'Configure employee remittance settings', route: '/remittance-table',     icon: AccountBalanceWallet },
  { key: 'department', label: 'Department assignment', desc: 'Set up department designations',        route: '/department-assignment', icon: Business },
  { key: 'itemTable',  label: 'Item table',            desc: 'Configure Plantilla items',             route: '/item-table',            icon: AssignmentOutlined },
];

// ─── Main component ───────────────────────────────────────────────────────────
const BulkRegister = () => {
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

  // State
  const [users, setUsers]                             = useState([]);
  const [success, setSuccess]                         = useState([]);
  const [errors, setErrors]                           = useState([]);
  const [errMessage, setErrMessage]                   = useState('');
  const [isLoading, setIsLoading]                     = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay]   = useState(false);
  const [completedSteps, setCompletedSteps]           = useState({ remittance: false, department: false, itemTable: false });
  const [fieldRequirements, setFieldRequirements]     = useState({
    firstName: true, lastName: true, email: true, employeeNumber: true,
    employmentCategory: true, password: true, middleName: false, nameExtension: false, department: false,
  });
  const [emailDomainRestricted, setEmailDomainRestricted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('setupCompletedSteps');
    if (saved) setCompletedSteps(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/system-settings/registration_field_requirements`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data?.setting_value) { try { setFieldRequirements(JSON.parse(data.setting_value)); } catch {} }
        }
      } catch {}
    };
    run();
  }, []);

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

  const { hasAccess, loading: accessLoading } = usePageAccess('bulk-register');

  // Helpers
  const mapEmploymentCategory = (categoryText) => {
    if (!categoryText) return null;
    const categoryLower = categoryText.toString().trim().toLowerCase();
    const categoryMap = {
      'jo graduate': '0', 'jo graduated': '0', 'job order graduate': '0', 'graduate': '0', 'graduated': '0',
      'jo undergrad': '1', 'jo undergraduate': '1', 'job order undergrad': '1', 'undergrad': '1', 'undergraduate': '1',
      'regular non-teaching': '2', 'regular nonteaching': '2', 'non-teaching': '2', 'nonteaching': '2',
      'regular teaching (30hrs)': '3', 'regular teaching 30hrs': '3', 'teaching 30hrs': '3', 'teaching (30hrs)': '3', '30hrs': '3', '30 hrs': '3',
      'regular designated (40hrs)': '4', 'regular designated 40hrs': '4', 'designated 40hrs': '4', 'designated (40hrs)': '4', '40hrs': '4', '40 hrs': '4',
      'other': '5', 'custom': '5',
    };
    return categoryMap[categoryLower] || null;
  };

  const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (emailDomainRestricted) return email.toLowerCase().endsWith('@earist.edu.ph');
    return true;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (worksheet.length === 0) { setErrMessage('Excel file is empty.'); return; }

        const requiredFields = [];
        if (fieldRequirements.firstName)          requiredFields.push('firstName');
        if (fieldRequirements.lastName)           requiredFields.push('lastName');
        if (fieldRequirements.email)              requiredFields.push('email');
        if (fieldRequirements.employeeNumber)     requiredFields.push('employeeNumber');
        if (fieldRequirements.employmentCategory) requiredFields.push('employmentCategory');
        if (fieldRequirements.password)           requiredFields.push('password');
        if (fieldRequirements.department)         requiredFields.push('department');

        const missingFields = requiredFields.filter((f) => !(f in worksheet[0]));
        if (missingFields.length > 0) { setErrMessage(`Missing required columns: ${missingFields.join(', ')}.`); return; }

        const processedUsers = worksheet.map((user) => {
          let employmentCategoryValue = user.employmentCategory ? mapEmploymentCategory(user.employmentCategory) : null;
          let password = user.password?.toString().trim() || '';
          if (!password && user.lastName) password = user.lastName.toString().trim().toUpperCase().replace(/\s+/g, '');
          let employeeNumber = user.employeeNumber?.toString().trim() || '';
          if (employeeNumber) employeeNumber = employeeNumber.replace(/-/g, '');
          const processedUser = {
            firstName: user.firstName?.toString().trim() || '',
            middleName: user.middleName?.toString().trim() || null,
            lastName: user.lastName?.toString().trim() || '',
            nameExtension: user.nameExtension?.toString().trim() || null,
            email: user.email?.toString().trim() || '',
            employeeNumber,
            password,
            role: 'staff',
            access_level: 'user',
            department: user.department?.toString().trim() || null,
            customCategory: user.customCategory?.toString().trim() || null,
          };
          if (['0','1','2','3','4','5'].includes(employmentCategoryValue)) {
            processedUser.employmentCategory = employmentCategoryValue;
          } else if (fieldRequirements.employmentCategory) {
            processedUser.employmentCategory = null;
          }
          return processedUser;
        });

        const validationErrors = [];
        processedUsers.forEach((user, index) => {
          const missing = [];
          if (fieldRequirements.firstName && !user.firstName)                                                   missing.push('firstName');
          if (fieldRequirements.lastName && !user.lastName)                                                     missing.push('lastName');
          if (fieldRequirements.email && !user.email)                                                           missing.push('email');
          if (fieldRequirements.employeeNumber && !user.employeeNumber)                                         missing.push('employeeNumber');
          if (fieldRequirements.password && !user.password)                                                     missing.push('password');
          if (fieldRequirements.employmentCategory && !user.employmentCategory)                                 missing.push('employmentCategory');
          if (fieldRequirements.department && !user.department)                                                 missing.push('department');
          if (missing.length) validationErrors.push(`Row ${index + 2}: Missing required fields: ${missing.join(', ')}`);
          if (user.employmentCategory && !['0','1','2','3','4','5'].includes(user.employmentCategory))          validationErrors.push(`Row ${index + 2}: Invalid employmentCategory`);
          if (user.employmentCategory === '5' && (!user.customCategory || user.customCategory.trim() === ''))  validationErrors.push(`Row ${index + 2}: customCategory required when category is "Other"`);
          if (user.email && !validateEmail(user.email))                                                         validationErrors.push(`Row ${index + 2}: ${emailDomainRestricted ? 'Email must use @earist.edu.ph domain' : 'Invalid email format'}`);
        });

        if (validationErrors.length > 0) {
          setErrMessage(`Validation errors found:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? '\n...and more' : ''}`);
          return;
        }
        setUsers(processedUsers);
        setErrMessage('');
      } catch {
        setErrMessage('Error parsing Excel file. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRegister = async () => {
    if (users.length === 0) { setErrMessage('Please upload an Excel file first.'); return; }
    setIsLoading(true); setErrMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/excel-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });
      if (!response.ok) {
        let errorMessage = 'Registration failed.';
        try { const errorData = await response.json(); errorMessage = errorData.message || errorMessage; } catch {}
        setErrMessage(errorMessage); setIsLoading(false); return;
      }
      const result = await response.json();
      setSuccess(result.successful || []);
      setErrors(result.errors || []);
      setIsLoading(false);
      if (result.successful?.length > 0) setShowSuccessOverlay(true);
    } catch (err) {
      setIsLoading(false);
      setErrMessage(`Something went wrong: ${err.message}`);
    }
  };

  const handleClearAll = () => { setUsers([]); setSuccess([]); setErrors([]); setErrMessage(''); };

  if (accessLoading) return <BulkRegisterWireframe settings={settings} />;

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Bulk User Registration. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const requiredChips = [
    { key: 'firstName', label: 'firstName' },
    { key: 'lastName', label: 'lastName' },
    { key: 'email', label: 'email' },
    { key: 'employeeNumber', label: 'employeeNumber' },
    { key: 'employmentCategory', label: 'employmentCategory' },
    { key: 'password', label: 'password' },
    { key: 'department', label: 'department' },
  ].filter((f) => fieldRequirements[f.key]);

  const optionalChips = [
    { key: 'firstName', label: 'firstName' },
    { key: 'lastName', label: 'lastName' },
    { key: 'email', label: 'email' },
    { key: 'employeeNumber', label: 'employeeNumber' },
    { key: 'employmentCategory', label: 'employmentCategory' },
    { key: 'password', label: 'password' },
    { key: 'department', label: 'department' },
    { key: 'middleName', label: 'middleName' },
    { key: 'nameExtension', label: 'nameExtension' },
    { key: 'customCategory', label: 'customCategory' },
  ].filter((f) => !fieldRequirements[f.key]);

  return (
    <Box sx={{ pt: 3, pb: 0, width: '100vw', mx: 'auto', maxWidth: '100%', overflow: 'hidden', position: 'relative', left: '50%', transform: 'translateX(-50%)' }}>
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
                      <GroupAdd sx={{ fontSize: 26, color: p }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2, color: p }}>Bulk User Registration</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 400, color: tp, mt: 0.25 }}>Register multiple employees at once using an Excel file</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip label="Bulk Registration" size="small" sx={{ bgcolor: alpha(p, 0.15), color: p, fontWeight: 500 }} />
                    <ProfessionalButton
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      onClick={() => navigate('/registration')}
                      sx={{ borderColor: p, color: p, '&:hover': { borderColor: s, bgcolor: alpha(p, 0.08) } }}
                    >
                      Single Registration
                    </ProfessionalButton>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Two-column layout ── */}
        <Grid container spacing={3} alignItems="flex-start">

          {/* ── LEFT: Setup checklist ── */}
          <Grid item xs={12} lg={3}>
            <Fade in timeout={700}>
              <GlassCard>
                <CardHeader
                  title={
                    <Box>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: alpha(tp, 0.5), mb: 0.4 }}>
                        Pre-setup checklist
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: tp, lineHeight: 1.4, fontWeight: 400 }}>
                        Configure these before registering users
                      </Typography>
                    </Box>
                  }
                  sx={{ bgcolor: alpha(ac, 0.5), borderBottom: `1px solid ${alpha(p, 0.08)}`, py: 1.75, px: 2.5 }}
                />
                <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                          cursor: 'pointer', transition: 'all 0.2s ease',
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
                </CardContent>
              </GlassCard>
            </Fade>
          </Grid>

          {/* ── RIGHT: Bulk upload form ── */}
          <Grid item xs={12} lg={9}>
            <Fade in timeout={900}>
              <GlassCard>
                {/* Form header */}
                <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, borderBottom: `1px solid ${alpha(p, 0.1)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: -25, right: -25, width: 110, height: 110, background: `radial-gradient(circle, ${alpha(p, 0.07)} 0%, transparent 70%)` }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                    <Avatar sx={{ bgcolor: alpha(p, 0.15), width: 46, height: 46, boxShadow: `0 4px 14px ${alpha(p, 0.15)}` }}>
                      <GroupAdd sx={{ fontSize: 22, color: p }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: p, lineHeight: 1.2 }}>Register multiple users</Typography>
                      <Typography variant="caption" sx={{ color: tp, opacity: 0.7 }}>Upload an Excel file to register employees in bulk</Typography>
                    </Box>
                  </Box>
                  <Chip label="Bulk" size="small" sx={{ bgcolor: alpha(p, 0.15), color: p, fontWeight: 600, position: 'relative', zIndex: 1 }} />
                </Box>

                {/* Form body */}
                <Box sx={{ p: 3 }}>

                  {/* ── Column reference ── */}
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(tp, 0.45), mb: 1.75 }}>
                    Excel column reference
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.4) }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: tp, mb: 1, letterSpacing: '0.04em' }}>Required columns</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                          {requiredChips.map((f) => (
                            <Chip key={f.key} label={f.label} size="small" sx={{ bgcolor: p, color: ac, fontSize: '0.68rem', fontWeight: 600, height: 22 }} />
                          ))}
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.4) }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: tp, mb: 1, letterSpacing: '0.04em' }}>Optional columns</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                          {optionalChips.map((f) => (
                            <Chip key={f.key} label={f.label} size="small" variant="outlined" sx={{ borderColor: alpha(p, 0.4), color: p, fontSize: '0.68rem', height: 22 }} />
                          ))}
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
  <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.3) }}>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: tp, mb: 1, letterSpacing: '0.04em' }}>Employment category values</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {[
        { label: '"JO Graduate"', color: '#F97316' },
        { label: '"JO UnderGrad"', color: '#EF4444' },
        { label: '"Regular Non-Teaching"', color: '#16A34A' },
        { label: '"Regular Teaching (30Hrs)"', color: '#1D4ED8' },
        { label: '"Regular Designated (40Hrs)"', color: '#7C3AED' },
        { label: '"Other"', color: '#0D9488' },
      ].map(({ label, color }) => (
        <Chip
          key={label}
          label={label}
          size="small"
          sx={{ bgcolor: alpha(color, 0.1), color, border: `1px solid ${alpha(color, 0.25)}`, fontSize: '0.67rem', height: 22, fontWeight: 600 }}
        />
      ))}
    </Box>
    {emailDomainRestricted && (
      <Typography sx={{ fontSize: '0.7rem', color: alpha(tp, 0.6), mt: 1 }}>
        Email domain restricted to <strong>@earist.edu.ph</strong>
      </Typography>
    )}
    <Typography sx={{ fontSize: '0.68rem', color: alpha(tp, 0.5), mt: 0.75 }}>
      Password defaults to last name in CAPS. "Other" requires a <strong>customCategory</strong> column.
    </Typography>
  </Box>
</Grid>
                  </Grid>

                  {/* ── Category hint ── */}
                  {/* <Box sx={{ mt: 1.5, mb: 0.5, p: 1.75, borderRadius: 3, border: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.3) }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: tp, mb: 0.75 }}>Employment category values</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {[
                        { label: '"JO Graduate"', color: '#F97316' },
                        { label: '"JO UnderGrad"', color: '#EF4444' },
                        { label: '"Regular Non-Teaching"', color: '#16A34A' },
                        { label: '"Regular Teaching (30Hrs)"', color: '#1D4ED8' },
                        { label: '"Regular Designated (40Hrs)"', color: '#7C3AED' },
                        { label: '"Other"', color: '#0D9488' },
                      ].map(({ label, color }) => (
                        <Chip
                          key={label}
                          label={label}
                          size="small"
                          sx={{ bgcolor: alpha(color, 0.1), color, border: `1px solid ${alpha(color, 0.25)}`, fontSize: '0.67rem', height: 22, fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                    {emailDomainRestricted && (
                      <Typography sx={{ fontSize: '0.7rem', color: alpha(tp, 0.6), mt: 1 }}>
                        Email domain restricted to <strong>@earist.edu.ph</strong>
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.68rem', color: alpha(tp, 0.5), mt: 0.75 }}>
                      Password auto-set to last name in CAPS (no spaces) if not provided. "Other" category requires a <strong>customCategory</strong> column.
                    </Typography>
                  </Box> */}

                  {/* Divider */}
                  <Box sx={{ borderTop: `1px dashed ${alpha(p, 0.15)}`, my: 1 }} />

                  {/* ── Upload zone ── */}
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(tp, 0.45), mb: 1 }}>
                    Upload file
                  </Typography>

                  <Box
                    sx={{
                      p: 1, borderRadius: 3, border: `2px dashed ${alpha(p, 0.25)}`,
                      bgcolor: alpha(ac, 0.25), textAlign: 'center',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: alpha(p, 0.5), bgcolor: alpha(ac, 0.4) },
                    }}
                  >
                    <FileUpload sx={{ fontSize: 44, color: alpha(p, 0.45), mb: 1 }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: tp, mb: 0.5 }}>
                      {users.length > 0
                        ? `${users.length} user${users.length !== 1 ? 's' : ''} ready to register`
                        : 'Choose an Excel file to upload'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: alpha(tp, 0.5), mb: 2 }}>
                      Accepted formats: .xlsx, .xls
                    </Typography>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} id="bulk-file-upload" />
                    <label htmlFor="bulk-file-upload">
                      <ProfessionalButton
                        component="span"
                        variant="contained"
                        startIcon={<CloudUpload />}
                        sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s }, cursor: 'pointer' }}
                      >
                        {users.length > 0 ? 'Replace file' : 'Choose file'}
                      </ProfessionalButton>
                    </label>
                  </Box>

                  {/* Loaded users banner */}
                  {users.length > 0 && (
                    <Fade in timeout={400}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, mt: 1.5, borderRadius: 3, border: `1px solid ${alpha('#16a34a', 0.3)}`, bgcolor: alpha('#16a34a', 0.05) }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: alpha('#16a34a', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <People sx={{ fontSize: 17, color: '#16a34a' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', lineHeight: 1.2 }}>
                            {users.length} user{users.length !== 1 ? 's' : ''} loaded
                          </Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: alpha('#15803d', 0.7) }}>Ready to register — click the button below</Typography>
                        </Box>
                        <Chip
                          icon={<CheckCircleOutline sx={{ fontSize: '13px !important' }} />}
                          label="Ready"
                          size="small"
                          sx={{ bgcolor: alpha('#16a34a', 0.1), color: '#16a34a', fontWeight: 700, fontSize: '0.68rem', height: 24, '& .MuiChip-icon': { color: '#16a34a' } }}
                        />
                      </Box>
                    </Fade>
                  )}

                  {/* ── Error alert ── */}
                  {errMessage && (
                    <Fade in>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, p: 1.75, mt: 2, borderRadius: 3, bgcolor: alpha('#dc2626', 0.05), border: `1px solid ${alpha('#dc2626', 0.25)}` }}>
                        <ErrorOutline sx={{ fontSize: 17, color: '#dc2626', mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{errMessage}</Typography>
                      </Box>
                    </Fade>
                  )}

                  {/* ── Success results ── */}
                  {success.length > 0 && (
                    <Fade in timeout={400}>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: '#16a34a', borderRadius: '12px 12px 0 0' }}>
                          <CheckCircleOutline sx={{ fontSize: 17, color: '#fff' }} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Successful registrations ({success.length})</Typography>
                        </Box>
                        <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'rgba(255,255,255,0.8)', borderRadius: '0 0 12px 12px', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          {success.map((user, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: alpha('#16a34a', 0.05), border: `1px solid ${alpha('#16a34a', 0.15)}` }}>
                              <Chip label={user.employeeNumber} size="small" sx={{ bgcolor: p, color: ac, fontWeight: 600, fontSize: '0.7rem', height: 20 }} />
                              <Typography sx={{ fontSize: '0.8rem', color: tp }}>{user.name}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Fade>
                  )}

                  {/* ── Error results ── */}
                  {errors.length > 0 && (
                    <Fade in timeout={400}>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: '#dc2626', borderRadius: '12px 12px 0 0' }}>
                          <ErrorOutline sx={{ fontSize: 17, color: '#fff' }} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Registration errors ({errors.length})</Typography>
                        </Box>
                        <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'rgba(255,255,255,0.8)', borderRadius: '0 0 12px 12px', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          {errors.slice(0, 10).map((err, i) => (
                            <Box key={i} sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: alpha('#dc2626', 0.05), border: `1px solid ${alpha('#dc2626', 0.15)}` }}>
                              <Typography sx={{ fontSize: '0.78rem', color: '#991b1b' }}>• {err}</Typography>
                            </Box>
                          ))}
                          {errors.length > 10 && (
                            <Typography sx={{ fontSize: '0.75rem', color: alpha(tp, 0.5), fontStyle: 'italic', textAlign: 'center', pt: 0.5 }}>
                              …and {errors.length - 10} more errors
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Fade>
                  )}

                  {/* ── Footer / actions ── */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, mt: 2, borderTop: `1px solid ${alpha(p, 0.1)}`, flexWrap: 'wrap', gap: 2 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: alpha(tp, 0.5) }}>
                      Columns marked{' '}
                      <Box component="span" sx={{ color: p, fontWeight: 700 }}>*</Box>
                      {' '}are required in the Excel file
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      {(users.length > 0 || success.length > 0 || errors.length > 0) && (
                        <ProfessionalButton
                          variant="outlined"
                          onClick={handleClearAll}
                          sx={{ borderColor: alpha(p, 0.4), color: alpha(tp, 0.6), '&:hover': { borderColor: p, bgcolor: alpha(p, 0.05) } }}
                        >
                          Clear
                        </ProfessionalButton>
                      )}
                      <ProfessionalButton
                        variant="contained"
                        disabled={isLoading || users.length === 0}
                        onClick={handleRegister}
                        startIcon={isLoading ? <CircularProgress size={16} sx={{ color: ac }} /> : <CloudUpload />}
                        sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s }, '&:disabled': { bgcolor: alpha(p, 0.4), color: alpha(ac, 0.7) } }}
                      >
                        {isLoading ? `Registering ${users.length} users…` : 'Upload & register users'}
                      </ProfessionalButton>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>
      </Box>

      <LoadingOverlay open={isLoading} message={`Registering ${users.length} user${users.length !== 1 ? 's' : ''}…`} />
      <SuccessfulOverlay open={showSuccessOverlay} action="create" onClose={() => setShowSuccessOverlay(false)} showOkButton={true} />
    </Box>
  );
};

export default BulkRegister;