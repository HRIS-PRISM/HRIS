import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessfulOverlay from './SuccessfulOverlay';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Alert,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Tooltip,
  Avatar,
  Fade,
  Backdrop,
  styled,
  alpha,
  CardHeader,
  TablePagination,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Portal,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  Group,
  Description,
  Warning,
  CheckCircle,
  Error,
  Person,
  FilterList,
  Refresh,
  SupervisorAccount,
  AdminPanelSettings,
  Work,
  Info,
  Category,
  Assignment,
  Assessment,
  Payment,
  Description as FormIcon,
  Folder,
  FolderSpecial,
  EventNote,
} from '@mui/icons-material';
import AccessDenied from './AccessDenied';
import axios from 'axios';
import { getComponentInfo } from '../utils/componentMapping';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
};

const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#894444',
    secondaryColor: '#6d2323',
    accentColor: '#FEF9E1',
    textColor: '#FFFFFF',
    textPrimaryColor: '#6D2323',
    textSecondaryColor: '#FEF9E1',
    hoverColor: '#6D2323',
    backgroundColor: '#FFFFFF',
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('systemSettings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        if (parsed && typeof parsed === 'object') setSettings(parsed);
      } catch (e) {
        console.error('Error parsing stored settings:', e);
      }
    }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api')
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        const res = await axios.get(url, getAuthHeaders());
        if (res.data && typeof res.data === 'object') {
          setSettings(res.data);
          localStorage.setItem('systemSettings', JSON.stringify(res.data));
        }
      } catch (e) {
        console.error('Error fetching system settings:', e);
      }
    };
    fetchSettings();
  }, []);

  return settings;
};

const PagesList = () => {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [pageDescription, setPageDescription] = useState('');
  const [pageGroups, setPageGroups] = useState([]);
  const [pageName, setPageName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [componentIdentifier, setComponentIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePageId, setDeletePageId] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [roleChecked, setRoleChecked] = useState(false);

  const navigate = useNavigate();
  const settings = useSystemSettings();

  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
    setRoleChecked(true);
  }, []);

  // ── Styled components ──
  const GlassCard = useMemo(
    () =>
      styled(Card)(() => ({
        borderRadius: 20,
        background: `${settings?.accentColor || '#FEF9E1'}F2`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 40px ${settings?.primaryColor || '#894444'}14`,
        border: `1px solid ${settings?.primaryColor || '#894444'}1A`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: `0 12px 48px ${settings?.primaryColor || '#894444'}26`,
          transform: 'translateY(-4px)',
        },
      })),
    [settings],
  );

  const ProfessionalButton = useMemo(
    () =>
      styled(Button)(({ variant }) => ({
        borderRadius: 12,
        fontWeight: 600,
        padding: '12px 24px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        textTransform: 'none',
        fontSize: '0.95rem',
        letterSpacing: '0.025em',
        boxShadow:
          variant === 'contained'
            ? `0 4px 14px ${settings?.primaryColor || '#894444'}40`
            : 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow:
            variant === 'contained'
              ? `0 6px 20px ${settings?.primaryColor || '#894444'}59`
              : 'none',
        },
        '&:active': { transform: 'translateY(0)' },
      })),
    [settings],
  );

  const ModernTextField = useMemo(
    () =>
      styled(TextField)(() => ({
        '& .MuiOutlinedInput-root': {
          borderRadius: 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: 'rgba(255,255,255,0.8)',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: 'rgba(255,255,255,0.95)',
          },
          '&.Mui-focused': {
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
            backgroundColor: 'rgba(255,255,255,1)',
          },
        },
        '& .MuiInputLabel-root': { fontWeight: 500 },
      })),
    [settings],
  );

  const PremiumTableContainer = useMemo(
    () =>
      styled(TableContainer)(() => ({
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `0 4px 24px ${settings?.primaryColor || '#894444'}0F`,
        border: `1px solid ${settings?.primaryColor || '#894444'}14`,
        maxHeight: '600px',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': {
          background: alpha(settings?.accentColor || '#FEF9E1', 0.3),
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(settings?.primaryColor || '#894444', 0.3),
          borderRadius: '4px',
        },
      })),
    [settings],
  );

  const PremiumTableCell = useMemo(
    () =>
      styled(TableCell)(({ isHeader = false }) => ({
        fontWeight: isHeader ? 600 : 500,
        padding: '18px 20px',
        borderBottom: isHeader
          ? `2px solid ${settings?.primaryColor || '#894444'}4D`
          : `1px solid ${settings?.primaryColor || '#894444'}0F`,
        fontSize: '0.95rem',
        letterSpacing: '0.025em',
      })),
    [settings],
  );

  const descriptionOptions = [
    'General',
    'System Administration',
    'Registration',
    'Information Management',
    'Attendance Management',
    'Payroll Management',
    'Leave Management',
    'Form',
    'Pages Management',
    'Personal Data Sheets',
  ];

  // Access Groups = the roles that will receive this page on "Grant Role Access"
  const accessGroupOptions = [
    'superadmin',
    'administrator',
    'technical',
    'staff',
  ];

  const isSuperAdmin = userRole === 'superadmin' || userRole === 'technical';

  useEffect(() => {
    if (isSuperAdmin && roleChecked) fetchPages();
  }, [isSuperAdmin, roleChecked]);

  useEffect(() => {
    const filtered = pages.filter((pg) => {
      const matchesSearch =
        (pg.page_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pg.page_description || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (pg.page_url || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(pg.id || '').includes(searchTerm);
      const matchesDescription = descriptionFilter
        ? (pg.page_description || '').toLowerCase() ===
          descriptionFilter.toLowerCase()
        : true;
      return matchesSearch && matchesDescription;
    });
    setFilteredPages(filtered);
    setPage(0);
  }, [searchTerm, descriptionFilter, pages]);

  const fetchPages = async (isManualRefresh = false) => {
    setLoading(true);
    if (isManualRefresh) setRefreshing(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/pages`, {
        method: 'GET',
        ...getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const sorted = data.sort((a, b) => a.id - b.id);
        setPages(sorted);
        setFilteredPages(sorted);
      } else {
        const err = await response.json();
        setErrorMessage(err.error || 'Failed to fetch pages');
      }
    } catch (e) {
      console.error('Error fetching pages:', e);
      setErrorMessage('Error fetching pages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessOpen(false);

    if (
      !pageName.trim() ||
      !pageDescription.trim() ||
      pageGroups.length === 0
    ) {
      setErrorMessage(
        'Page name, description, and at least one access group are required',
      );
      setLoading(false);
      return;
    }

    const pageData = {
      page_name: pageName.trim(),
      page_description: pageDescription.trim(),
      page_url: pageUrl.trim() || null,
      page_group: pageGroups.join(','),
      component_identifier: componentIdentifier.trim() || null,
    };

    try {
      const url = currentPageId
        ? `${API_BASE_URL}/pages/${currentPageId}`
        : `${API_BASE_URL}/pages`;
      const method = currentPageId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        ...getAuthHeaders(),
        body: JSON.stringify(pageData),
      });
      const responseData = await response.json();
      if (response.ok) {
        setSuccessAction(currentPageId ? 'edit' : 'create');
        setSuccessOpen(true);
        await fetchPages();
        if (currentPageId) setEditDialog(false);
        else setAddDialog(false);
        resetForm();
      } else {
        setErrorMessage(
          responseData.error ||
            `Failed to ${currentPageId ? 'update' : 'create'} page`,
        );
      }
    } catch (e) {
      console.error('Error saving page:', e);
      setErrorMessage('Network error occurred while saving page');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPageId(null);
    setPageName('');
    setPageDescription('');
    setPageUrl('');
    setComponentIdentifier('');
    setPageGroups([]);
  };

  const cancelEdit = () => {
    resetForm();
    setEditDialog(false);
    setSuccessOpen(false);
    setErrorMessage('');
  };
  const cancelAdd = () => {
    resetForm();
    setAddDialog(false);
    setSuccessOpen(false);
    setErrorMessage('');
  };

  const handleEdit = (pg) => {
    setCurrentPageId(pg.id);
    setPageName(pg.page_name || '');
    setPageDescription(pg.page_description || '');
    setComponentIdentifier(pg.component_identifier || '');
    setPageUrl(pg.page_url || '');
    setPageGroups(
      pg.page_group ? pg.page_group.split(',').map((g) => g.trim()) : [],
    );
    setEditDialog(true);
    setSuccessOpen(false);
    setErrorMessage('');
  };

  const handleDeleteConfirm = (id) => {
    setDeletePageId(id);
    setDeleteConfirmed(false);
    setDeleteDialog(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${deletePageId}`, {
        method: 'DELETE',
        ...getAuthHeaders(),
      });
      if (response.ok) {
        setSuccessAction('delete');
        setSuccessOpen(true);
        await fetchPages();
      } else {
        const err = await response.json();
        setErrorMessage(err.error || 'Failed to delete page');
      }
    } catch (e) {
      console.error('Error deleting page:', e);
      setErrorMessage('Error deleting page');
    } finally {
      setLoading(false);
      setDeleteDialog(false);
      setDeletePageId(null);
      setDeleteConfirmed(false);
    }
  };

  const getDescriptionColor = (description) => {
    const p = settings?.primaryColor || '#894444';
    const s = settings?.secondaryColor || '#6d2323';
    switch (description?.toLowerCase()) {
      case 'general':
        return {
          sx: { bgcolor: alpha(p, 0.15), color: p },
          icon: <Category />,
        };
      case 'system administration':
        return {
          sx: { bgcolor: alpha(p, 0.15), color: p },
          icon: <Category />,
        };
      case 'registration':
        return {
          sx: { bgcolor: alpha(s, 0.15), color: s },
          icon: <Assignment />,
        };
      case 'information management':
        return { sx: { bgcolor: alpha(p, 0.1), color: p }, icon: <Info /> };
      case 'attendance management':
        return {
          sx: { bgcolor: alpha(p, 0.12), color: p },
          icon: <Assessment />,
        };
      case 'payroll management':
        return { sx: { bgcolor: alpha(s, 0.12), color: s }, icon: <Payment /> };
      case 'leave management':
        return {
          sx: { bgcolor: alpha(p, 0.12), color: p },
          icon: <EventNote />,
        };
      case 'form':
        return {
          sx: { bgcolor: alpha(p, 0.08), color: p },
          icon: <FormIcon />,
        };
      case 'pages management':
        return {
          sx: { bgcolor: alpha(p, 0.18), color: p },
          icon: <FolderSpecial />,
        };
      case 'personal data sheets':
        return { sx: { bgcolor: alpha(s, 0.18), color: s }, icon: <Folder /> };
      default:
        return {
          sx: { bgcolor: alpha(p, 0.1), color: p },
          icon: <Description />,
        };
    }
  };

  const getGroupColor = (group) => {
    const p = settings?.primaryColor || '#894444';
    const s = settings?.secondaryColor || '#6d2323';
    switch (group?.toLowerCase()) {
      case 'superadmin':
        return { sx: { color: p }, icon: <SupervisorAccount /> };
      case 'administrator':
        return { sx: { color: s }, icon: <AdminPanelSettings /> };
      case 'technical':
        return { sx: { color: '#2196f3' }, icon: <AdminPanelSettings /> };
      case 'staff':
        return { sx: { color: p }, icon: <Work /> };
      default:
        return { sx: { color: p }, icon: <Person /> };
    }
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };
  const paginatedPages = filteredPages.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const p = settings?.primaryColor || '#894444';
  const s = settings?.secondaryColor || '#6d2323';
  const ac = settings?.accentColor || '#FEF9E1';
  const tp = settings?.textPrimaryColor || '#6D2323';

  // Shared form fields used by both Add and Edit dialogs
  const renderFormFields = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ModernTextField
          fullWidth
          label="Page Name"
          value={pageName}
          onChange={(e) => setPageName(e.target.value)}
          placeholder="e.g., dashboard, users, reports"
          sx={{ mt: 2 }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <ModernTextField
          select
          fullWidth
          label="Page Description"
          value={pageDescription}
          onChange={(e) => setPageDescription(e.target.value)}
          sx={{ mt: 2 }}
        >
          {descriptionOptions.map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </ModernTextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <ModernTextField
          fullWidth
          label="Page URL"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          placeholder="e.g., /dashboard, /users"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <ModernTextField
          fullWidth
          label="Component Identifier"
          value={componentIdentifier}
          onChange={(e) => setComponentIdentifier(e.target.value)}
          placeholder="e.g., pds1, registration, users-list"
          helperText={
            componentIdentifier && getComponentInfo(componentIdentifier)
              ? `Connected to: ${getComponentInfo(componentIdentifier).componentName}`
              : componentIdentifier
                ? 'No component mapping found for this identifier'
                : 'Unique identifier for dynamic page access (optional)'
          }
          InputProps={{
            endAdornment: componentIdentifier ? (
              getComponentInfo(componentIdentifier) ? (
                <CheckCircle sx={{ color: p, ml: 1 }} />
              ) : (
                <Warning sx={{ color: '#ff9800', ml: 1 }} />
              )
            ) : null,
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel
            sx={{ fontWeight: 500, color: p, '&.Mui-focused': { color: p } }}
          >
            Access Groups
          </InputLabel>
          <Select
            multiple
            value={pageGroups}
            onChange={(e) => setPageGroups(e.target.value)}
            label="Access Groups"
            sx={{
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
              '&.Mui-focused': {
                boxShadow: `0 4px 20px ${p}40`,
                backgroundColor: 'rgba(255,255,255,1)',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(p, 0.3),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(p, 0.5),
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: p,
              },
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((v) => (
                  <Chip
                    key={v}
                    label={v.toUpperCase()}
                    size="small"
                    sx={{ bgcolor: alpha(p, 0.15), color: p, fontWeight: 600 }}
                  />
                ))}
              </Box>
            )}
          >
            {accessGroupOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText sx={{ color: alpha(p, 0.7), fontSize: '0.8rem' }}>
            Roles checked here will receive this page when "Grant Role Access"
            is triggered in User Management
          </FormHelperText>
        </FormControl>
      </Grid>
    </Grid>
  );

  if (!roleChecked) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 8,
        }}
      >
        <CircularProgress sx={{ color: p, mb: 2 }} />
        <Typography variant="h6" sx={{ color: p }}>
          Verifying access permissions...
        </Typography>
      </Box>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AccessDenied
        title="Access Required"
        message="Page Management is restricted to Technical users only."
        returnPath="/users-list"
        returnButtonText="Return to User Management"
      />
    );
  }

  return (
    <Box
      sx={{
        py: 4,
        borderRadius: '14px',
        width: '100vw',
        mx: 'auto',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
        minHeight: '92vh',
      }}
    >
      <Box sx={{ px: 6, mx: 'auto', maxWidth: '1600px' }}>
        {/* ── Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
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
                    background: `radial-gradient(circle, ${alpha(p, 0.1)} 0%, transparent 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: '30%',
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(p, 0.08)} 0%, transparent 70%)`,
                  }}
                />
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  position="relative"
                  zIndex={1}
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: alpha(p, 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(p, 0.15)}`,
                      }}
                    >
                      <SupervisorAccount sx={{ fontSize: 32, color: p }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: p,
                        }}
                      >
                        Page Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ opacity: 0.8, fontWeight: 400, color: tp }}
                      >
                        Manage system pages — Access Groups control which roles
                        receive pages on Grant
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={`${pages.length} Pages`}
                      size="small"
                      sx={{
                        bgcolor: alpha(p, 0.15),
                        color: p,
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <Tooltip title="Refresh Pages">
                      <IconButton
                        onClick={() => fetchPages(true)}
                        disabled={loading}
                        sx={{
                          bgcolor: alpha(p, 0.1),
                          '&:hover': { bgcolor: alpha(p, 0.2) },
                          color: p,
                          width: 48,
                          height: 48,
                          '&:disabled': {
                            bgcolor: alpha(p, 0.05),
                            color: alpha(p, 0.3),
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={24} sx={{ color: p }} />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
                    </Tooltip>
                    <ProfessionalButton
                      variant="contained"
                      startIcon={<Group />}
                      onClick={() => navigate('/users-list')}
                      sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}
                    >
                      User Access
                    </ProfessionalButton>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Success Overlay ── */}
        <Portal>
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />
        </Portal>

        {/* ── Error Alert ── */}
        {errorMessage && (
          <Backdrop
            open
            sx={{
              zIndex: 9999,
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
            onClick={() => setErrorMessage('')}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{ minWidth: '400px', maxWidth: '600px' }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                    fontSize: '1.1rem',
                    p: 3,
                    '& .MuiAlert-message': { fontWeight: 500 },
                    '& .MuiAlert-icon': { fontSize: '2rem' },
                  }}
                  icon={<Error />}
                  onClose={() => setErrorMessage('')}
                >
                  {errorMessage}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* ── Search & Filter ── */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(ac, 0.8), color: tp }}>
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: 600, color: tp }}
                    >
                      Search & Filter
                    </Typography>
                    <Typography variant="body2" sx={{ color: tp }}>
                      Find and filter pages by various criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(ac, 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(p, 0.1)}`,
              }}
            />
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <ModernTextField
                    fullWidth
                    label="Search Pages"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, description, URL, or ID"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <ModernTextField
                    select
                    fullWidth
                    label="Filter by Description"
                    value={descriptionFilter}
                    onChange={(e) => setDescriptionFilter(e.target.value)}
                  >
                    <MenuItem value="">All Descriptions</MenuItem>
                    {descriptionOptions.map((o) => (
                      <MenuItem key={o} value={o}>
                        {o}
                      </MenuItem>
                    ))}
                  </ModernTextField>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* ── Loading Backdrop ── */}
        <Backdrop
          sx={{ color: ac, zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading && !refreshing}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: ac }}>
              Loading pages...
            </Typography>
          </Box>
        </Backdrop>

        {/* ── Pages Table ── */}
        {!loading && (
          <Fade in timeout={900}>
            <GlassCard>
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${alpha(p, 0.1)}`,
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: p }}>
                    Pages List
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: tp }}>
                    {searchTerm
                      ? `Showing ${filteredPages.length} of ${pages.length} pages matching "${searchTerm}"`
                      : `Total: ${pages.length} registered pages`}
                  </Typography>
                </Box>
                <ProfessionalButton
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddDialog(true)}
                  sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}
                >
                  Add New Page
                </ProfessionalButton>
              </Box>

              <PremiumTableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 1200 }}>
                  <TableHead sx={{ bgcolor: alpha(ac, 0.7) }}>
                    <TableRow>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, width: '50px' }}
                      >
                        ID
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, width: '150px' }}
                      >
                        <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Page Name
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, width: '180px' }}
                      >
                        Page Description
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, width: '150px' }}
                      >
                        URL
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, width: '190px' }}
                      >
                        <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Component Identifier
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, width: '260px' }}
                      >
                        <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Access Groups
                        <Tooltip title="Roles listed here will receive this page when 'Grant Role Access' is triggered in User Management.">
                          <Info
                            sx={{
                              ml: 1,
                              fontSize: 15,
                              verticalAlign: 'middle',
                              opacity: 0.55,
                              cursor: 'help',
                            }}
                          />
                        </Tooltip>
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: tp, textAlign: 'center', width: '120px' }}
                      >
                        Actions
                      </PremiumTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPages.length > 0 ? (
                      paginatedPages.map((pg) => (
                        <TableRow
                          key={pg.id}
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: alpha(ac, 0.3) },
                            '&:hover': { bgcolor: alpha(p, 0.05) },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {/* ID */}
                          <PremiumTableCell sx={{ fontWeight: 600, color: tp }}>
                            {pg.id}
                          </PremiumTableCell>

                          {/* Page Name */}
                          <PremiumTableCell>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600, color: tp }}
                            >
                              {pg.page_name}
                            </Typography>
                          </PremiumTableCell>

                          {/* Page Description */}
                          <PremiumTableCell>
                            <Chip
                              label={pg.page_description}
                              size="small"
                              icon={
                                getDescriptionColor(pg.page_description).icon
                              }
                              sx={{
                                ...getDescriptionColor(pg.page_description).sx,
                                fontWeight: 600,
                                padding: '4px 8px',
                              }}
                            />
                          </PremiumTableCell>

                          {/* URL */}
                          <PremiumTableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                color: tp,
                                bgcolor: alpha(p, 0.05),
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                display: 'inline-block',
                              }}
                            >
                              {pg.page_url || 'N/A'}
                            </Typography>
                          </PremiumTableCell>

                          {/* Component Identifier */}
                          <PremiumTableCell>
                            {pg.component_identifier ? (
                              <Tooltip
                                title={
                                  getComponentInfo(pg.component_identifier) ? (
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600, mb: 0.5 }}
                                      >
                                        Connected Component:
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        display="block"
                                      >
                                        <strong>Name:</strong>{' '}
                                        {
                                          getComponentInfo(
                                            pg.component_identifier,
                                          ).componentName
                                        }
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        display="block"
                                      >
                                        <strong>Path:</strong>{' '}
                                        {
                                          getComponentInfo(
                                            pg.component_identifier,
                                          ).componentPath
                                        }
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        display="block"
                                      >
                                        <strong>Route:</strong>{' '}
                                        {
                                          getComponentInfo(
                                            pg.component_identifier,
                                          ).routePath
                                        }
                                      </Typography>
                                    </Box>
                                  ) : (
                                    'No component mapping found'
                                  )
                                }
                                arrow
                              >
                                <Chip
                                  label={pg.component_identifier}
                                  size="small"
                                  icon={
                                    getComponentInfo(
                                      pg.component_identifier,
                                    ) ? (
                                      <CheckCircle />
                                    ) : (
                                      <Warning />
                                    )
                                  }
                                  sx={{
                                    bgcolor: getComponentInfo(
                                      pg.component_identifier,
                                    )
                                      ? alpha(p, 0.15)
                                      : alpha('#ff9800', 0.15),
                                    color: getComponentInfo(
                                      pg.component_identifier,
                                    )
                                      ? p
                                      : '#ff9800',
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    cursor: 'help',
                                    '&:hover': {
                                      bgcolor: getComponentInfo(
                                        pg.component_identifier,
                                      )
                                        ? alpha(p, 0.25)
                                        : alpha('#ff9800', 0.25),
                                    },
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <Chip
                                label="Not Set"
                                size="small"
                                icon={<Error />}
                                sx={{
                                  bgcolor: alpha('#9e9e9e', 0.15),
                                  color: '#9e9e9e',
                                  fontWeight: 600,
                                  fontStyle: 'italic',
                                }}
                              />
                            )}
                          </PremiumTableCell>

                          {/* Access Groups — controls default grant per role */}
                          <PremiumTableCell>
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                                maxWidth: '260px',
                              }}
                            >
                              {pg.page_group ? (
                                pg.page_group.split(',').map((group, idx) => (
                                  <Chip
                                    key={idx}
                                    label={group.trim().toUpperCase()}
                                    size="small"
                                    variant="outlined"
                                    icon={getGroupColor(group.trim()).icon}
                                    sx={{
                                      borderColor: getGroupColor(group.trim())
                                        .sx.color,
                                      color: getGroupColor(group.trim()).sx
                                        .color,
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      fontSize: '0.75rem',
                                      bgcolor: 'transparent',
                                    }}
                                  />
                                ))
                              ) : (
                                <Chip
                                  label="No roles assigned"
                                  size="small"
                                  sx={{
                                    bgcolor: alpha('#9e9e9e', 0.1),
                                    color: '#9e9e9e',
                                    fontStyle: 'italic',
                                    fontSize: '0.75rem',
                                  }}
                                />
                              )}
                            </Box>
                          </PremiumTableCell>

                          {/* Actions */}
                          <PremiumTableCell sx={{ textAlign: 'center' }}>
                            <Tooltip title="Edit Page">
                              <IconButton
                                onClick={() => handleEdit(pg)}
                                sx={{
                                  color: p,
                                  mr: 1,
                                  '&:hover': { bgcolor: alpha(p, 0.1) },
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Page">
                              <IconButton
                                onClick={() => handleDeleteConfirm(pg.id)}
                                sx={{
                                  color: '#000000',
                                  '&:hover': { bgcolor: alpha('#000000', 0.1) },
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </PremiumTableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{ textAlign: 'center', py: 8 }}
                        >
                          <Info
                            sx={{ fontSize: 80, color: alpha(p, 0.3), mb: 3 }}
                          />
                          <Typography
                            variant="h5"
                            color={alpha(p, 0.6)}
                            gutterBottom
                            sx={{ fontWeight: 600 }}
                          >
                            No Pages Found
                          </Typography>
                          <Typography variant="body1" color={alpha(p, 0.4)}>
                            {searchTerm
                              ? 'Try adjusting your search criteria'
                              : 'No pages registered yet'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>

              {filteredPages.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                  <TablePagination
                    component="div"
                    count={filteredPages.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    sx={{
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows':
                        { color: tp, fontWeight: 600 },
                    }}
                  />
                </Box>
              )}
            </GlassCard>
          </Fade>
        )}

        {/* ── Edit Dialog ── */}
        <Dialog
          open={editDialog}
          onClose={cancelEdit}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Edit sx={{ fontSize: 30 }} />
              Edit Page
            </Box>
            <IconButton onClick={cancelEdit} sx={{ color: ac }}>
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>{renderFormFields()}</form>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: alpha(ac, 0.5) }}>
            <ProfessionalButton
              onClick={cancelEdit}
              startIcon={<Cancel />}
              variant="outlined"
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleSubmit}
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}
            >
              {loading ? 'Updating...' : 'Update Page'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Add Dialog ── */}
        <Dialog
          open={addDialog}
          onClose={cancelAdd}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, bgcolor: ac } }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Add sx={{ fontSize: 30 }} />
              Add New Page
            </Box>
            <IconButton onClick={cancelAdd} sx={{ color: ac }}>
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>{renderFormFields()}</form>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: alpha(ac, 0.5) }}>
            <ProfessionalButton
              onClick={cancelAdd}
              startIcon={<Cancel />}
              variant="outlined"
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleSubmit}
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{ bgcolor: p, color: ac, '&:hover': { bgcolor: s } }}
            >
              {loading ? 'Creating...' : 'Create Page'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* ── Delete Dialog ── */}
        <Dialog
          open={deleteDialog}
          onClose={() => {
            setDeleteDialog(false);
            setDeleteConfirmed(false);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 4, bgcolor: ac, overflow: 'hidden' },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
              color: ac,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              fontWeight: 700,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                background: `radial-gradient(circle, ${alpha('#ffffff', 0.1)} 0%, transparent 70%)`,
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Avatar
                sx={{ bgcolor: alpha('#ffffff', 0.2), width: 48, height: 48 }}
              >
                <Warning sx={{ fontSize: 28, color: ac }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Confirm Deletion
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.9, fontSize: '0.85rem' }}
                >
                  This action requires confirmation
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => {
                setDeleteDialog(false);
                setDeleteConfirmed(false);
              }}
              sx={{
                color: ac,
                position: 'relative',
                zIndex: 1,
                '&:hover': { bgcolor: alpha('#ffffff', 0.1) },
              }}
            >
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha(p, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <Error sx={{ fontSize: 48, color: p }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ color: tp, fontWeight: 600, mb: 1.5 }}
              >
                Are you sure you want to delete this page?
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: alpha(tp, 0.7), mb: 3, lineHeight: 1.6 }}
              >
                This action cannot be undone. Deleting this page will
                permanently remove it from the system and revoke all associated
                user access permissions.
              </Typography>
            </Box>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: alpha(p, 0.08),
                border: `2px solid ${alpha(p, 0.2)}`,
                transition: 'all 0.3s ease',
                ...(deleteConfirmed && {
                  bgcolor: alpha(p, 0.12),
                  border: `2px solid ${p}`,
                }),
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    sx={{
                      color: p,
                      '&.Mui-checked': { color: p },
                      '& .MuiSvgIcon-root': { fontSize: 28 },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      color: tp,
                      fontSize: '1rem',
                      fontWeight: deleteConfirmed ? 600 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    I understand this action cannot be undone
                  </Typography>
                }
                sx={{ m: 0, alignItems: 'center' }}
              />
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: 3,
              bgcolor: alpha(ac, 0.5),
              borderTop: `1px solid ${alpha(p, 0.1)}`,
              gap: 2,
            }}
          >
            <ProfessionalButton
              onClick={() => {
                setDeleteDialog(false);
                setDeleteConfirmed(false);
              }}
              variant="outlined"
              fullWidth
              sx={{
                borderColor: p,
                color: p,
                '&:hover': { borderColor: s, bgcolor: alpha(p, 0.05) },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleDelete}
              variant="contained"
              fullWidth
              disabled={loading || !deleteConfirmed}
              startIcon={
                loading ? (
                  <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                ) : (
                  <Delete />
                )
              }
              sx={{
                bgcolor: deleteConfirmed ? p : alpha(p, 0.3),
                color: '#ffffff',
                '&:hover': { bgcolor: deleteConfirmed ? s : alpha(p, 0.3) },
                '&:disabled': {
                  bgcolor: alpha(p, 0.2),
                  color: alpha('#ffffff', 0.5),
                },
              }}
            >
              {loading ? 'Deleting...' : 'Delete Page'}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PagesList;
