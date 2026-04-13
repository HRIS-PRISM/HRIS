import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  alpha,
  Card,
  Avatar,
  TextField,
  styled,
  Tab,
  Tabs,
} from '@mui/material';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  GroupAdd,
  CloudUpload,
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  FileUpload,
  People,
  AccountBalanceWallet,
  Business,
  AssignmentOutlined,
  CheckCircle,
  OpenInNew,
  Circle,
} from '@mui/icons-material';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent: '#6d2323',
  accentDark: '#5a1d1d',
  accentMid: '#8B4545',
  accentFaint: 'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a0a0a0',
  divider: 'rgba(0,0,0,0.08)',
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes blkShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blkBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        'linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)',
      backgroundSize: '800px 100%',
      animation: 'blkShimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
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
    return {};
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
const BulkRegisterWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        pt: 3,
        pb: 0,
        width: '100%',
        mx: 'auto',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
        minHeight: '100vh',
      }}
    >
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        <Box
          sx={{
            mb: 3,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '0.5px solid rgba(0,0,0,0.09)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            animation: 'blkBlink 2.2s ease-in-out infinite',
          }}
        >
          <Box
            sx={{
              px: 4,
              py: 3,
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  bgcolor: T.accentFaint,
                  flexShrink: 0,
                }}
              />
              <Box>
                <Bone w={220} h={22} r={6} sx={{ mb: 0.75 }} />
                <Bone w={340} h={12} r={4} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Bone w={60} h={28} r={6} />
              <Bone w={60} h={28} r={6} />
            </Box>
          </Box>
        </Box>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12}>
            <Box
              sx={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '0.5px solid rgba(0,0,0,0.09)',
                bgcolor: '#fff',
                animation: 'blkBlink 2.2s ease-in-out 0.05s infinite',
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.25,
                  bgcolor: T.accentFaint,
                  borderBottom: `1px solid ${T.divider}`,
                  minHeight: 42,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    bgcolor: T.accentBorder,
                  }}
                />
                <Bone w={180} h={11} r={4} />
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {[80, 110, 95, 120, 90, 100, 85].map((w, i) => (
                    <Bone key={i} w={w} h={24} r={6} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '0.5px solid rgba(0,0,0,0.09)',
                bgcolor: '#fff',
                animation: 'blkBlink 2.2s ease-in-out 0.08s infinite',
              }}
            >
              <Box
                sx={{
                  px: 3.5,
                  py: 2.5,
                  background: 'linear-gradient(135deg,#fdf5f5 0%,#f5e8e8 100%)',
                  borderBottom: `1px solid ${T.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      bgcolor: T.accentFaint,
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Bone w={200} h={18} r={6} sx={{ mb: 0.5 }} />
                    <Bone w={280} h={11} r={4} />
                  </Box>
                </Box>
                <Bone w={60} h={24} r={10} />
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ borderTop: `1px dashed ${T.divider}`, my: 1 }} />
                <Bone w={100} h={10} r={4} sx={{ mb: 1 }} />
                <Box
                  sx={{
                    height: 140,
                    borderRadius: '8px',
                    border: `2px dashed ${T.accentBorder}`,
                    bgcolor: T.accentFaint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Bone w={160} h={40} r={8} />
                </Box>
                <Box
                  sx={{
                    borderTop: `1px solid ${T.divider}`,
                    pt: 2.5,
                    mt: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Bone w="60%" h={10} r={4} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Bone w={80} h={44} r={8} />
                    <Bone w={200} h={44} r={8} />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  </>
);

// ─── Setup checklist items ────────────────────────────────────────────────────
const SETUP_ITEMS = [
  {
    key: 'remittance',
    label: 'Remittances',
    desc: 'Configure employee remittance settings',
    route: '/remittance-table',
    icon: AccountBalanceWallet,
  },
  {
    key: 'department',
    label: 'Department assignment',
    desc: 'Set up department designations',
    route: '/department-assignment',
    icon: Business,
  },
  {
    key: 'itemTable',
    label: 'Item table',
    desc: 'Configure Plantilla items',
    route: '/item-table',
    icon: AssignmentOutlined,
  },
];

const normalizeColumnKey = (key) =>
  String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const COLUMN_ALIASES = {
  firstName: ['firstname', 'first', 'givenname', 'given'],
  middleName: [
    'middlename',
    'middle',
    'middlenameinitial',
    'middleinitial',
    'mi',
  ],
  lastName: ['lastname', 'surname', 'familyname', 'last'],
  nameExtension: ['nameextension', 'suffix', 'extension', 'nameext'],
  email: ['email', 'emailaddress', 'mail'],
  employeeNumber: [
    'employeenumber',
    'employeeid',
    'employeeno',
    'empnumber',
    'empno',
    'idnumber',
  ],
  employmentCategory: [
    'employmentcategory',
    'category',
    'employmenttype',
    'employeecategory',
  ],
  password: ['password', 'passcode', 'passwd'],
  department: ['department', 'departmentcode', 'dept', 'deptcode'],
  customCategory: [
    'customcategory',
    'custom',
    'othercategory',
    'categorydescription',
  ],
};

const aliasToCanonical = Object.entries(COLUMN_ALIASES).reduce(
  (acc, [canonical, aliases]) => {
    aliases.forEach((alias) => {
      acc[alias] = canonical;
    });
    return acc;
  },
  {},
);

const normalizeRowKeys = (row) => {
  const normalized = {};
  Object.entries(row || {}).forEach(([rawKey, value]) => {
    const canonical = aliasToCanonical[normalizeColumnKey(rawKey)] || rawKey;
    if (normalized[canonical] === undefined) normalized[canonical] = value;
  });
  return normalized;
};

// ─── Main component ───────────────────────────────────────────────────────────
const BulkRegister = () => {
  useSystemSettings();

  // ── Styled components ─────────────────────────────────────────────────────
  const GlassCard = useMemo(
    () =>
      styled(Card)(() => ({
        borderRadius: 12,
        background: '#ffffff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
        border: '0.5px solid rgba(0,0,0,0.09)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 4px 20px rgba(109,35,35,0.10)' },
      })),
    [],
  );

  const ProfessionalButton = useMemo(
    () =>
      styled(Button)(({ variant: v }) => ({
        borderRadius: 8,
        fontWeight: 600,
        padding: '10px 22px',
        transition: 'all 0.18s ease',
        textTransform: 'none',
        fontSize: '0.9rem',
        letterSpacing: '0.015em',
        boxShadow:
          v === 'contained' ? '0 2px 10px rgba(109,35,35,0.28)' : 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow:
            v === 'contained' ? '0 4px 16px rgba(109,35,35,0.38)' : 'none',
        },
        '&:active': { transform: 'translateY(0)' },
      })),
    [],
  );

  const [users, setUsers] = useState([]);
  const [success, setSuccess] = useState([]);
  const [errors, setErrors] = useState([]);
  const [errMessage, setErrMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [completedSteps, setCompletedSteps] = useState({
    remittance: false,
    department: false,
    itemTable: false,
  });
  const [fieldRequirements, setFieldRequirements] = useState({
    firstName: true,
    lastName: true,
    email: true,
    employeeNumber: true,
    employmentCategory: true,
    password: true,
    middleName: false,
    nameExtension: false,
    department: false,
  });
  const [emailDomainRestricted, setEmailDomainRestricted] = useState(false);

  // ── Dynamic employment type configs ───────────────────────────────────────
  const [typeConfigs, setTypeConfigs] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = useMemo(
    () =>
      API_BASE_URL.includes('/api') ? API_BASE_URL : `${API_BASE_URL}/api`,
    [],
  );

  // ── Fetch type configs ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTypeConfigs = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const r = await axios.get(
          `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setTypeConfigs(r.data.flat || []);
      } catch {
        // non-fatal
      }
    };
    fetchTypeConfigs();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('setupCompletedSteps');
    if (saved) setCompletedSteps(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(
          `${apiBase}/system-settings/registration_field_requirements`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.setting_value) {
            try {
              setFieldRequirements(JSON.parse(data.setting_value));
            } catch {}
          }
          return;
        }
        if (res.status === 404) {
          const allSettingsRes = await fetch(`${apiBase}/system-settings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!allSettingsRes.ok) return;
          const allSettings = await allSettingsRes.json();
          const raw = allSettings?.registration_field_requirements;
          if (!raw) return;
          if (typeof raw === 'string') {
            try {
              setFieldRequirements(JSON.parse(raw));
            } catch {}
            return;
          }
          if (typeof raw === 'object') setFieldRequirements(raw);
        }
      } catch {}
    };
    run();
  }, [apiBase]);

  useEffect(() => {
    const run = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/email-domain-restriction`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEmailDomainRestricted(data.setting_value === true);
        }
      } catch {}
    };
    run();
  }, []);

  const { hasAccess, loading: accessLoading } = usePageAccess('bulk-register');

  // ── Build a map of typeName/parentGroup aliases → id for Excel matching ──
  // This lets Excel columns like "Academic | CAS" or just "CAS" resolve to a type id
  const buildCategoryIdFromText = useMemo(() => {
    return (categoryText) => {
      if (!categoryText) return null;
      const raw = categoryText.toString().trim();
      const lower = raw.toLowerCase();

      // 1. Direct id match (numeric)
      const numericId = parseInt(raw, 10);
      if (!isNaN(numericId) && typeConfigs.find((t) => t.id === numericId))
        return String(numericId);

      // 2. Exact "parentGroup | typeName" match
      const exactFull = typeConfigs.find(
        (t) =>
          `${t.parentGroup} | ${t.typeName}`.toLowerCase() === lower ||
          `${t.parentGroup}|${t.typeName}`.toLowerCase() ===
            lower.replace(/\s/g, ''),
      );
      if (exactFull) return String(exactFull.id);

      // 3. typeName-only match
      const typeNameMatch = typeConfigs.find(
        (t) => t.typeName.toLowerCase() === lower,
      );
      if (typeNameMatch) return String(typeNameMatch.id);

      // 4. Partial match on typeName
      const partialMatch = typeConfigs.find(
        (t) =>
          t.typeName.toLowerCase().includes(lower) ||
          lower.includes(t.typeName.toLowerCase()),
      );
      if (partialMatch) return String(partialMatch.id);

      return null;
    };
  }, [typeConfigs]);

  const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (emailDomainRestricted)
      return email.toLowerCase().endsWith('@earist.edu.ph');
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
        const worksheet = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
        );
        if (worksheet.length === 0) {
          setErrMessage('Excel file is empty.');
          return;
        }
        const normalizedWorksheet = worksheet.map(normalizeRowKeys);
        const requiredFields = [];
        if (fieldRequirements.firstName) requiredFields.push('firstName');
        if (fieldRequirements.lastName) requiredFields.push('lastName');
        if (fieldRequirements.email) requiredFields.push('email');
        if (fieldRequirements.employeeNumber)
          requiredFields.push('employeeNumber');
        if (fieldRequirements.employmentCategory)
          requiredFields.push('employmentCategory');
        if (fieldRequirements.password) requiredFields.push('password');
        if (fieldRequirements.department) requiredFields.push('department');
        const firstRow = normalizedWorksheet[0] || {};
        const missingFields = requiredFields.filter((f) => !(f in firstRow));
        if (missingFields.length > 0) {
          setErrMessage(
            `Missing required columns: ${missingFields.join(', ')}.`,
          );
          return;
        }
        const processedUsers = normalizedWorksheet.map((user) => {
          // Resolve employmentCategory: try dynamic type configs first, fall back to nothing
          let resolvedCategoryId = null;
          if (user.employmentCategory) {
            resolvedCategoryId = buildCategoryIdFromText(
              user.employmentCategory,
            );
          }

          let password = user.password?.toString().trim() || '';
          if (!password && user.lastName)
            password = user.lastName
              .toString()
              .trim()
              .toUpperCase()
              .replace(/\s+/g, '');
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
            customCategory: null,
          };
          if (resolvedCategoryId) {
            processedUser.employmentCategory = parseInt(resolvedCategoryId, 10);
          } else if (fieldRequirements.employmentCategory) {
            processedUser.employmentCategory = null;
          }
          return processedUser;
        });
        const validationErrors = [];
        processedUsers.forEach((user, index) => {
          const missing = [];
          if (fieldRequirements.firstName && !user.firstName)
            missing.push('firstName');
          if (fieldRequirements.lastName && !user.lastName)
            missing.push('lastName');
          if (fieldRequirements.email && !user.email) missing.push('email');
          if (fieldRequirements.employeeNumber && !user.employeeNumber)
            missing.push('employeeNumber');
          if (fieldRequirements.password && !user.password)
            missing.push('password');
          if (fieldRequirements.employmentCategory && !user.employmentCategory)
            missing.push('employmentCategory');
          if (fieldRequirements.department && !user.department)
            missing.push('department');
          if (missing.length)
            validationErrors.push(
              `Row ${index + 2}: Missing required fields: ${missing.join(', ')}`,
            );
          if (user.email && !validateEmail(user.email))
            validationErrors.push(
              `Row ${index + 2}: ${emailDomainRestricted ? 'Email must use @earist.edu.ph domain' : 'Invalid email format'}`,
            );
        });
        if (validationErrors.length > 0) {
          setErrMessage(
            `Validation errors found:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? '\n...and more' : ''}`,
          );
          return;
        }
        setUsers(processedUsers);
        setErrMessage('');
      } catch {
        setErrMessage(
          'Error parsing Excel file. Please check the file format.',
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRegister = async () => {
    if (users.length === 0) {
      setErrMessage('Please upload an Excel file first.');
      return;
    }
    setIsLoading(true);
    setErrMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/excel-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });
      if (!response.ok) {
        let errorMessage = 'Registration failed.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {}
        setErrMessage(errorMessage);
        setIsLoading(false);
        return;
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

  const handleClearAll = () => {
    setUsers([]);
    setSuccess([]);
    setErrors([]);
    setErrMessage('');
  };

  if (accessLoading) return <BulkRegisterWireframe />;

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

  // Build category value reference from dynamic type configs
  const categoryValueChips =
    typeConfigs.length > 0
      ? typeConfigs
          .filter((t) => t.isActive !== false)
          .map((t) => ({
            label: `"${t.parentGroup} | ${t.typeName}"`,
            color: t.colorHex || '#757575',
          }))
      : [
          { label: '"JO Graduate"', color: '#F97316' },
          { label: '"JO UnderGrad"', color: '#EF4444' },
          { label: '"Regular Non-Teaching"', color: '#16A34A' },
          { label: '"Regular Teaching (30Hrs)"', color: '#1D4ED8' },
          { label: '"Regular Designated (40Hrs)"', color: '#7C3AED' },
          { label: '"Other"', color: '#0D9488' },
        ];

  return (
    <Box
      sx={{
        pt: 3,
        pb: 0,
        width: '100%',
        mx: 'auto',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <style>{shimmerKf}</style>
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        {/* ── Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 3 }}>
            <GlassCard>
              <Box
                sx={{
                  px: 4,
                  py: 3,
                  background:
                    'linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    background: `radial-gradient(circle, ${T.accentFaint} 0%, transparent 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -25,
                    left: '30%',
                    width: 120,
                    height: 120,
                    background:
                      'radial-gradient(circle, rgba(109,35,35,0.04) 0%, transparent 70%)',
                  }}
                />
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  position="relative"
                  zIndex={1}
                >
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar
                      sx={{
                        bgcolor: T.accentFaint,
                        width: 52,
                        height: 52,
                        boxShadow: '0 4px 14px rgba(109,35,35,0.12)',
                      }}
                    >
                      <GroupAdd sx={{ fontSize: 26, color: T.accent }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.2,
                          color: T.accent,
                        }}
                      >
                        Bulk User Registration
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.75,
                          fontWeight: 400,
                          color: T.muted,
                          mt: 0.25,
                        }}
                      >
                        Register multiple employees at once using an Excel file
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tabs
                      value={
                        location.pathname === '/bulk-register'
                          ? 'bulk'
                          : 'single'
                      }
                      onChange={(_, value) =>
                        navigate(
                          value === 'bulk' ? '/bulk-register' : '/registration',
                        )
                      }
                      sx={{
                        minHeight: 36,
                        bgcolor: T.accentFaint,
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
                          color: T.muted,
                          '&.Mui-selected': {
                            bgcolor: T.accent,
                            color: '#fff',
                          },
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
                          color: T.muted,
                          '&.Mui-selected': {
                            bgcolor: T.accent,
                            color: '#fff',
                          },
                        }}
                      />
                    </Tabs>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Layout ── */}
        <Grid container spacing={3} alignItems="flex-start">
          {/* ── Excel Reference Section ── */}
          <Grid item xs={12}>
            <Fade in timeout={700}>
              <GlassCard>
                <Box sx={{ p: 3 }}>
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                      color: T.faint,
                      mb: 1.5,
                    }}
                  >
                    Excel column reference
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    <Grid item xs={12} md={4}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `1px solid ${T.accentBorder}`,
                          bgcolor: T.accentFaint,
                          borderLeft: `4px solid #dc2626`,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: T.text,
                              letterSpacing: '0.04em',
                            }}
                          >
                            Required columns
                          </Typography>
                          <Chip
                            label="Required"
                            size="small"
                            sx={{
                              height: 20,
                              bgcolor: 'rgba(220,38,38,0.10)',
                              color: '#b91c1c',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              border: '1px solid rgba(220,38,38,0.28)',
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 0.6,
                          }}
                        >
                          {requiredChips.map((f) => (
                            <Chip
                              key={f.key}
                              label={f.label}
                              size="small"
                              sx={{
                                width: '100%',
                                bgcolor: 'rgba(220,38,38,0.08)',
                                color: '#991b1b',
                                border: '1px solid rgba(220,38,38,0.24)',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                height: 22,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `1px solid ${T.accentBorder}`,
                          bgcolor: '#fafafa',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: T.text,
                              letterSpacing: '0.04em',
                            }}
                          >
                            Optional columns
                          </Typography>
                          <Chip
                            label="Optional"
                            size="small"
                            sx={{
                              height: 20,
                              bgcolor: T.accentFaint,
                              color: T.muted,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              border: `1px solid ${T.accentBorder}`,
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 0.6,
                          }}
                        >
                          {optionalChips.map((f) => (
                            <Chip
                              key={f.key}
                              label={f.label}
                              size="small"
                              variant="outlined"
                              sx={{
                                width: '100%',
                                borderColor: T.accentBorder,
                                color: T.accent,
                                fontSize: '0.68rem',
                                height: 22,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `1px solid ${T.accentBorder}`,
                          bgcolor: '#fafafa',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: T.text,
                              letterSpacing: '0.04em',
                            }}
                          >
                            Employment category values
                          </Typography>
                          {typeConfigs.length > 0 && (
                            <Chip
                              label="Dynamic"
                              size="small"
                              sx={{
                                height: 20,
                                bgcolor: alpha(T.accent, 0.1),
                                color: T.accent,
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                border: `1px solid ${T.accentBorder}`,
                              }}
                            />
                          )}
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            maxHeight: 100,
                            overflowY: 'auto',
                          }}
                        >
                          {categoryValueChips.map(({ label, color }) => (
                            <Chip
                              key={label}
                              label={label}
                              size="small"
                              sx={{
                                bgcolor: alpha(color, 0.08),
                                color,
                                border: `1px solid ${alpha(color, 0.22)}`,
                                fontSize: '0.67rem',
                                height: 22,
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Box>
                        {emailDomainRestricted && (
                          <Typography
                            sx={{ fontSize: '0.7rem', color: T.muted, mt: 1 }}
                          >
                            Email domain restricted to{' '}
                            <strong>@earist.edu.ph</strong>
                          </Typography>
                        )}
                        <Typography
                          sx={{ fontSize: '0.68rem', color: T.faint, mt: 0.75 }}
                        >
                          Use the exact <strong>Group | Type</strong> label or
                          just the type name. Password defaults to last name in
                          CAPS.
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>

          {/* ── Bulk upload form ── */}
          <Grid item xs={12}>
            <Fade in timeout={900}>
              <GlassCard>
                {/* Form header */}
                <Box
                  sx={{
                    px: 3.5,
                    py: 2.5,
                    background:
                      'linear-gradient(135deg, #fdf5f5 0%, #f5e8e8 100%)',
                    borderBottom: `1px solid ${T.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -25,
                      right: -25,
                      width: 110,
                      height: 110,
                      background: `radial-gradient(circle, ${T.accentFaint} 0%, transparent 70%)`,
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2.5,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: T.accentFaint,
                        width: 46,
                        height: 46,
                        boxShadow: '0 2px 8px rgba(109,35,35,0.12)',
                      }}
                    >
                      <GroupAdd sx={{ fontSize: 22, color: T.accent }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: T.accent,
                          lineHeight: 1.2,
                        }}
                      >
                        Register multiple users
                      </Typography>
                      <Typography variant="caption" sx={{ color: T.muted }}>
                        Upload an Excel file to register employees in bulk
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label="Bulk"
                    size="small"
                    sx={{
                      bgcolor: T.accentFaint,
                      color: T.accent,
                      fontWeight: 600,
                      border: `1px solid ${T.accentBorder}`,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                </Box>

                {/* Form body */}
                <Box sx={{ p: 3 }}>
                  {/* Divider */}
                  <Box sx={{ borderTop: `1px dashed ${T.divider}`, my: 1 }} />

                  {/* ── Upload zone ── */}
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                      color: T.faint,
                      mb: 1,
                    }}
                  >
                    Upload file
                  </Typography>

                  <Box
                    sx={{
                      p: 0.75,
                      borderRadius: 3,
                      border: `2px dashed ${T.accentBorder}`,
                      bgcolor: T.accentFaint,
                      textAlign: 'center',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        borderColor: T.accent,
                        bgcolor: 'rgba(109,35,35,0.08)',
                      },
                    }}
                  >
                    <FileUpload
                      sx={{ fontSize: 32, color: T.accentBorder, mb: 0.5 }}
                    />
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: T.text,
                        mb: 0.25,
                      }}
                    >
                      {users.length > 0
                        ? `${users.length} user${users.length !== 1 ? 's' : ''} ready to register`
                        : 'Choose an Excel file to upload'}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.72rem', color: T.faint, mb: 1 }}
                    >
                      Accepted formats: .xlsx, .xls
                    </Typography>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="bulk-file-upload"
                    />
                    <label htmlFor="bulk-file-upload">
                      <ProfessionalButton
                        component="span"
                        variant="contained"
                        startIcon={<CloudUpload />}
                        sx={{
                          bgcolor: T.accent,
                          color: '#fff',
                          '&:hover': { bgcolor: T.accentDark },
                          cursor: 'pointer',
                        }}
                      >
                        {users.length > 0 ? 'Replace file' : 'Choose file'}
                      </ProfessionalButton>
                    </label>
                  </Box>

                  {/* Loaded users banner */}
                  {users.length > 0 && (
                    <Fade in timeout={400}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          px: 2.5,
                          py: 1.5,
                          mt: 1.5,
                          borderRadius: 3,
                          border: '1px solid rgba(46,125,50,0.3)',
                          bgcolor: 'rgba(46,125,50,0.05)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2,
                            bgcolor: 'rgba(46,125,50,0.12)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <People sx={{ fontSize: 17, color: '#2E7D32' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#15803d',
                              lineHeight: 1.2,
                            }}
                          >
                            {users.length} user{users.length !== 1 ? 's' : ''}{' '}
                            loaded
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              color: 'rgba(21,128,61,0.7)',
                            }}
                          >
                            Ready to register — click the button below
                          </Typography>
                        </Box>
                        <Chip
                          icon={
                            <CheckCircleOutline
                              sx={{ fontSize: '13px !important' }}
                            />
                          }
                          label="Ready"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(46,125,50,0.10)',
                            color: '#2E7D32',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            height: 24,
                            border: '1px solid rgba(46,125,50,0.3)',
                            '& .MuiChip-icon': { color: '#2E7D32' },
                          }}
                        />
                      </Box>
                    </Fade>
                  )}

                  {/* ── Error alert ── */}
                  {errMessage && (
                    <Fade in>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.25,
                          p: 1.75,
                          mt: 2,
                          borderRadius: 3,
                          bgcolor: 'rgba(220,38,38,0.05)',
                          border: '1px solid rgba(220,38,38,0.22)',
                        }}
                      >
                        <ErrorOutline
                          sx={{
                            fontSize: 17,
                            color: '#dc2626',
                            mt: 0.1,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: '#991b1b',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {errMessage}
                        </Typography>
                      </Box>
                    </Fade>
                  )}

                  {/* ── Success results ── */}
                  {success.length > 0 && (
                    <Fade in timeout={400}>
                      <Box sx={{ mt: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1.25,
                            bgcolor: '#2E7D32',
                            borderRadius: '12px 12px 0 0',
                          }}
                        >
                          <CheckCircleOutline
                            sx={{ fontSize: 17, color: '#fff' }}
                          />
                          <Typography
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            Successful registrations ({success.length})
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            maxHeight: 200,
                            overflow: 'auto',
                            bgcolor: 'rgba(255,255,255,0.95)',
                            border: '1px solid rgba(46,125,50,0.2)',
                            borderRadius: '0 0 12px 12px',
                            p: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.75,
                          }}
                        >
                          {success.map((user, i) => (
                            <Box
                              key={i}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 1.5,
                                py: 1,
                                borderRadius: 2,
                                bgcolor: 'rgba(46,125,50,0.04)',
                                border: '1px solid rgba(46,125,50,0.12)',
                              }}
                            >
                              <Chip
                                label={user.employeeNumber}
                                size="small"
                                sx={{
                                  bgcolor: T.accent,
                                  color: '#fff',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                              <Typography
                                sx={{ fontSize: '0.8rem', color: T.text }}
                              >
                                {user.name}
                              </Typography>
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
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1.25,
                            bgcolor: '#dc2626',
                            borderRadius: '12px 12px 0 0',
                          }}
                        >
                          <ErrorOutline sx={{ fontSize: 17, color: '#fff' }} />
                          <Typography
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            Registration errors ({errors.length})
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            maxHeight: 200,
                            overflow: 'auto',
                            bgcolor: 'rgba(255,255,255,0.95)',
                            border: '1px solid rgba(220,38,38,0.2)',
                            borderRadius: '0 0 12px 12px',
                            p: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.75,
                          }}
                        >
                          {errors.slice(0, 10).map((err, i) => (
                            <Box
                              key={i}
                              sx={{
                                px: 1.5,
                                py: 1,
                                borderRadius: 2,
                                bgcolor: 'rgba(220,38,38,0.04)',
                                border: '1px solid rgba(220,38,38,0.12)',
                              }}
                            >
                              <Typography
                                sx={{ fontSize: '0.78rem', color: '#991b1b' }}
                              >
                                • {err}
                              </Typography>
                            </Box>
                          ))}
                          {errors.length > 10 && (
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                color: T.faint,
                                fontStyle: 'italic',
                                textAlign: 'center',
                                pt: 0.5,
                              }}
                            >
                              …and {errors.length - 10} more errors
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Fade>
                  )}

                  {/* ── Footer / actions ── */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pt: 1,
                      mt: 2,
                      borderTop: `1px solid ${T.divider}`,
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.72rem', color: T.faint }}>
                      Columns marked{' '}
                      <Box
                        component="span"
                        sx={{ color: '#c62828', fontWeight: 700 }}
                      >
                        *
                      </Box>{' '}
                      are required in the Excel file
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      {(users.length > 0 ||
                        success.length > 0 ||
                        errors.length > 0) && (
                        <ProfessionalButton
                          variant="outlined"
                          onClick={handleClearAll}
                          sx={{
                            borderColor: T.accentBorder,
                            color: T.muted,
                            '&:hover': {
                              borderColor: T.accent,
                              bgcolor: T.accentFaint,
                              color: T.accent,
                            },
                          }}
                        >
                          Clear
                        </ProfessionalButton>
                      )}
                      <ProfessionalButton
                        variant="contained"
                        disabled={isLoading || users.length === 0}
                        onClick={handleRegister}
                        startIcon={
                          isLoading ? (
                            <CircularProgress
                              size={16}
                              sx={{ color: '#fff' }}
                            />
                          ) : (
                            <CloudUpload />
                          )
                        }
                        sx={{
                          bgcolor: T.accent,
                          color: '#fff',
                          '&:hover': { bgcolor: T.accentDark },
                          '&:disabled': {
                            bgcolor: 'rgba(109,35,35,0.3)',
                            color: 'rgba(255,255,255,0.6)',
                          },
                        }}
                      >
                        {isLoading
                          ? `Registering ${users.length} users…`
                          : 'Upload & register users'}
                      </ProfessionalButton>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Fade>
          </Grid>
        </Grid>
      </Box>

      <LoadingOverlay
        open={isLoading}
        message={`Registering ${users.length} user${users.length !== 1 ? 's' : ''}…`}
      />
      <SuccessfulOverlay
        open={showSuccessOverlay}
        action="create"
        onClose={() => setShowSuccessOverlay(false)}
        showOkButton={true}
      />
    </Box>
  );
};

export default BulkRegister;
