import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessfulOverlay from './SuccessfulOverlay';
import {
  Container,
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
  Breadcrumbs,
  Link,
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
  Pages,
  Security,
  Group,
  Description,
  Warning,
  CheckCircle,
  Error,
  Home,
  Person,
  ViewList,
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
import usePageAccess from '../hooks/usePageAccess';

// Get auth headers function
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
};

// Get user role from token
const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    // Parse JWT token to get user role
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

// System Settings Hook (from AdminHome)
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
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          setSettings(parsedSettings);
        }
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api') 
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        
        const response = await axios.get(url, getAuthHeaders());
        if (response.data && typeof response.data === 'object') {
          setSettings(response.data);
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error fetching system settings:', error);
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
  const [successAction, setSuccessAction] = useState("");
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

  // Check user role on component mount
  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
    setRoleChecked(true);
  }, []);

  // Use system settings
  const settings = useSystemSettings();
  
  // Memoize styled components to prevent recreation on every render
  const GlassCard = useMemo(() => styled(Card)(({ theme }) => ({
    borderRadius: 20,
    background: `${settings?.accentColor || '#FEF9E1'}F2`,
    backdropFilter: "blur(10px)",
    boxShadow: `0 8px 40px ${settings?.primaryColor || '#894444'}14`,
    border: `1px solid ${settings?.primaryColor || '#894444'}1A`,
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      boxShadow: `0 12px 48px ${settings?.primaryColor || '#894444'}26`,
      transform: "translateY(-4px)",
    },
  })), [settings]);

  const ProfessionalButton = useMemo(() => styled(Button)(({ theme, variant }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: "12px 24px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none",
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
    boxShadow: variant === "contained" ? `0 4px 14px ${settings?.primaryColor || '#894444'}40` : "none",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: variant === "contained" ? `0 6px 20px ${settings?.primaryColor || '#894444'}59` : "none",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  })), [settings]);

  const ModernTextField = useMemo(() => styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      "&:hover": {
        transform: "translateY(-1px)",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
      },
      "&.Mui-focused": {
        transform: "translateY(-1px)",
        boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
        backgroundColor: "rgba(255, 255, 255, 1)",
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 500,
    },
  })), [settings]);

  const PremiumTableContainer = useMemo(() => styled(TableContainer)(({ theme }) => ({
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: `0 4px 24px ${settings?.primaryColor || '#894444'}0F`,
    border: `1px solid ${settings?.primaryColor || '#894444'}14`,
    maxHeight: '600px',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: alpha(settings?.accentColor || '#FEF9E1', 0.3),
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: alpha(settings?.primaryColor || '#894444', 0.3),
      borderRadius: '4px',
      '&:hover': {
        background: alpha(settings?.primaryColor || '#894444', 0.5),
      },
    },
  })), [settings]);

  const PremiumTableCell = useMemo(() => styled(TableCell)(({ theme, isHeader = false }) => ({
    fontWeight: isHeader ? 600 : 500,
    padding: "18px 20px",
    borderBottom: isHeader
      ? `2px solid ${settings?.primaryColor || '#894444'}4D`
      : `1px solid ${settings?.primaryColor || '#894444'}0F`,
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
  })), [settings]);

  // Page description options for dropdown
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
    'Personal Data Sheets'
  ];

  // Access group options for multi-select
  const accessGroupOptions = [
    'superadmin',
    'administrator',
    'technical',
    'staff'
  ];

  // Check if user is superadmin or technical
  const isSuperAdmin = userRole === 'superadmin' || userRole === 'technical';

  useEffect(() => {
    if (isSuperAdmin && roleChecked) {
      fetchPages();
    }
  }, [isSuperAdmin, roleChecked]);

  useEffect(() => {
    const filtered = pages.filter((pg) => {
      const matchesSearch =
        (pg.page_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pg.page_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pg.page_url || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(pg.id || '').includes(searchTerm);

      const matchesDescription = descriptionFilter
        ? (pg.page_description || '').toLowerCase() === descriptionFilter.toLowerCase()
        : true;

      return matchesSearch && matchesDescription;
    });

    setFilteredPages(filtered);
    setPage(0);
  }, [searchTerm, descriptionFilter, pages]);

  const fetchPages = async (isManualRefresh = false) => {
    setLoading(true);
    if (isManualRefresh) {
      setRefreshing(true);
    }
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/pages`, {
        method: 'GET',
        ...getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const sortedPages = data.sort((a, b) => a.id - b.id);
        setPages(sortedPages);
        setFilteredPages(sortedPages);

        // Note: Success overlay removed from refresh - it should only show for actual CRUD operations
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to fetch pages');
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
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

    if (!pageName.trim() || !pageDescription.trim() || pageGroups.length === 0) {
      setErrorMessage('Page name, description, and at least one access group are required');
      setLoading(false);
      return;
    }

    const pageData = {
      page_name: pageName.trim(),
      page_description: pageDescription.trim(),
      page_url: pageUrl.trim() || null,
      page_group: pageGroups.join(','), // Join array into comma-separated string
      component_identifier: componentIdentifier.trim() || null,
    };

    try {
      const url = currentPageId
        ? `${API_BASE_URL}/pages/${currentPageId}`
        : `${API_BASE_URL}/pages`;

      const method = currentPageId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        ...getAuthHeaders(),
        body: JSON.stringify(pageData),
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccessAction(currentPageId ? "edit" : "create");
        setSuccessOpen(true);
        await fetchPages();
        if (currentPageId) {
          setEditDialog(false);
        } else {
          setAddDialog(false);
        }
        resetForm();
      } else {
        setErrorMessage(
          responseData.error ||
            `Failed to ${currentPageId ? 'update' : 'create'} page`
        );
      }
    } catch (error) {
      console.error('Error saving page:', error);
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
    // Split comma-separated groups into an array
    const groups = pg.page_group ? pg.page_group.split(',').map(g => g.trim()) : [];
    setPageGroups(groups);
    setEditDialog(true);
    setSuccessOpen(false);
    setErrorMessage('');
  };

  const handleDeleteConfirm = (id) => {
    setDeletePageId(id);
    setDeleteConfirmed(false); // Reset checkbox when opening dialog
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
        setSuccessAction("delete");
        setSuccessOpen(true);
        await fetchPages();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to delete page');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      setErrorMessage('Error deleting page');
    } finally {
      setLoading(false);
      setDeleteDialog(false);
      setDeletePageId(null);
      setDeleteConfirmed(false); // Reset checkbox after deletion
    }
  };

  const getDescriptionColor = (description) => {
    switch (description?.toLowerCase()) {
      case 'general':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.15), color: settings?.primaryColor || '#894444' },
          icon: <Category />,
        };
        case 'system administration':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.15), color: settings?.primaryColor || '#894444' },
          icon: <Category />,
        };
      case 'registration':
        return {
          sx: { bgcolor: alpha(settings?.secondaryColor || '#6d2323', 0.15), color: settings?.secondaryColor || '#6d2323' },
          icon: <Assignment />,
        };
      case 'information management':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.1), color: settings?.primaryColor || '#894444' },
          icon: <Info />,
        };
      case 'attendance management':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.12), color: settings?.primaryColor || '#894444' },
          icon: <Assessment />,
        };
      case 'payroll management':
        return {
          sx: { bgcolor: alpha(settings?.secondaryColor || '#6d2323', 0.12), color: settings?.secondaryColor || '#6d2323' },
          icon: <Payment />,
        };
      case 'leave management':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.12), color: settings?.primaryColor || '#894444' },
          icon: <EventNote />,
        };
      case 'form':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.08), color: settings?.primaryColor || '#894444' },
          icon: <FormIcon />,
        };
      case 'pages management':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.18), color: settings?.primaryColor || '#894444' },
          icon: <FolderSpecial />,
        };
      case 'personal data sheets':
        return {
          sx: { bgcolor: alpha(settings?.secondaryColor || '#6d2323', 0.18), color: settings?.secondaryColor || '#6d2323' },
          icon: <Folder />,
        };
      default:
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.1), color: settings?.primaryColor || '#894444' },
          icon: <Description />,
        };
    }
  };

  const getGroupColor = (group) => {
    switch (group?.toLowerCase()) {
      case 'superadmin':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.15), color: settings?.primaryColor || '#894444' },
          icon: <SupervisorAccount />,
        };
      case 'administrator':
        return {
          sx: { bgcolor: alpha(settings?.secondaryColor || '#6d2323', 0.15), color: settings?.secondaryColor || '#6d2323' },
          icon: <AdminPanelSettings />,
        };
      case 'technical':
        return {
          sx: { bgcolor: alpha('#2196f3', 0.15), color: '#2196f3' },
          icon: <AdminPanelSettings />,
        };
      case 'staff':
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.1), color: settings?.primaryColor || '#894444' },
          icon: <Work />,
        };
      default:
        return {
          sx: { bgcolor: alpha(settings?.primaryColor || '#894444', 0.1), color: settings?.primaryColor || '#894444' },
          icon: <Person />,
        };
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedPages = filteredPages.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Loading state
  if (!roleChecked) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress sx={{ color: settings?.primaryColor || '#894444', mb: 2 }} />
          <Typography variant="h6" sx={{ color: settings?.primaryColor || '#894444' }}>
            Verifying access permissions...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Access denied state
  if (!isSuperAdmin) {
    return (
      <AccessDenied
        title="Access Required"
        message="Page Management is restricted to Technical users only. You do not have sufficient privileges to access this feature."
        returnPath="/users-list"
        returnButtonText="Return to User Management"
      />
    );
  }

  return (
    <Box
      sx={{
        py: 4,
        borderRadius: "14px",
        width: "100vw",
        mx: "auto",
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        left: "50%",
        transform: "translateX(-50%)",
        minHeight: "92vh",
      }}
    >
      <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${settings?.accentColor || '#FEF9E1'} 0%, ${alpha(settings?.accentColor || '#FEF9E1', 0.9)} 100%)`,
                  color: settings?.primaryColor || '#894444',
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    background: `radial-gradient(circle, ${alpha(settings?.primaryColor || '#894444', 0.1)} 0%, ${alpha(settings?.primaryColor || '#894444', 0)} 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -30,
                    left: "30%",
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(settings?.primaryColor || '#894444', 0.08)} 0%, ${alpha(settings?.primaryColor || '#894444', 0)} 70%)`,
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
                        bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(settings?.primaryColor || '#894444', 0.15)}`,
                      }}
                    >
                      <SupervisorAccount sx={{ fontSize: 32, color: settings?.primaryColor || '#894444' }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: settings?.primaryColor || '#894444',
                        }}
                      >
                        Page Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: settings?.textPrimaryColor || '#6D2323',
                        }}
                      >
                        Superadmin only: Manage system pages and access groups
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={`${pages.length} Pages`}
                      size="small"
                      sx={{
                        bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                        color: settings?.primaryColor || '#894444',
                        fontWeight: 500,
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                    <Tooltip title="Refresh Pages">
                      <IconButton
                        onClick={() => fetchPages(true)}
                        disabled={loading}
                        sx={{
                          bgcolor: alpha(settings?.primaryColor || '#894444', 0.1),
                          "&:hover": { bgcolor: alpha(settings?.primaryColor || '#894444', 0.2) },
                          color: settings?.primaryColor || '#894444',
                          width: 48,
                          height: 48,
                          "&:disabled": {
                            bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                            color: alpha(settings?.primaryColor || '#894444', 0.3),
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: settings?.primaryColor || '#894444' }}
                          />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
                    </Tooltip>

                    <ProfessionalButton
                      variant="contained"
                      startIcon={<Group />}
                      onClick={() => navigate('/users-list')}
                      sx={{
                        bgcolor: settings?.primaryColor || '#894444',
                        color: settings?.accentColor || '#FEF9E1',
                        "&:hover": {
                          bgcolor: settings?.secondaryColor || '#6d2323',
                        },
                      }}
                    >
                      User Access
                    </ProfessionalButton>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Success Overlay - Rendered via Portal for full-screen coverage */}
        <Portal>
          <SuccessfulOverlay 
            open={successOpen} 
            action={successAction} 
            onClose={() => setSuccessOpen(false)} 
          />
        </Portal>

        {/* Error Alert - Center Modal Overlay */}
        {errorMessage && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => setErrorMessage("")}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "relative",
                  minWidth: "400px",
                  maxWidth: "600px",
                }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.4)",
                    fontSize: "1.1rem",
                    p: 3,
                    "& .MuiAlert-message": { fontWeight: 500 },
                    "& .MuiAlert-icon": { fontSize: "2rem" },
                  }}
                  icon={<Error />}
                  onClose={() => setErrorMessage("")}
                >
                  {errorMessage}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* Search & Filter */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.8),
                      color: settings?.textPrimaryColor || '#6D2323',
                    }}
                  >
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: 600, color: settings?.textPrimaryColor || '#6D2323' }}
                    >
                      Search & Filter
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ color: settings?.textPrimaryColor || '#6D2323' }}
                    >
                      Find and filter pages by various criteria
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.1)}`,
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
                    {descriptionOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </ModernTextField>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: settings?.accentColor || '#FEF9E1',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading && !refreshing}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: settings?.accentColor || '#FEF9E1' }}>
              Loading pages...
            </Typography>
          </Box>
        </Backdrop>

        {/* Pages Table */}
        {!loading && (
          <Fade in timeout={900}>
            <GlassCard>
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${settings?.accentColor || '#FEF9E1'} 0%, ${alpha(settings?.accentColor || '#FEF9E1', 0.9)} 100%)`,
                  color: settings?.primaryColor || '#894444',
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.1)}`,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 600, color: settings?.primaryColor || '#894444' }}
                  >
                    Pages List
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.8, color: settings?.textPrimaryColor || '#6D2323' }}
                  >
                    {searchTerm
                      ? `Showing ${filteredPages.length} of ${pages.length} pages matching "${searchTerm}"`
                      : `Total: ${pages.length} registered pages`}
                  </Typography>
                </Box>
                <ProfessionalButton
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddDialog(true)}
                  sx={{
                    bgcolor: settings?.primaryColor || '#894444',
                    color: settings?.accentColor || '#FEF9E1',
                    "&:hover": {
                      bgcolor: settings?.secondaryColor || '#6d2323',
                    },
                  }}
                >
                  Add New Page
                </ProfessionalButton>
              </Box>

              <PremiumTableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 1200 }}>
                  <TableHead sx={{ bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.7) }}>
                    <TableRow>
                      <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: '50px' }}>
                        ID
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: '150px' }}>
                        <Description sx={{ mr: 1, verticalAlign: "middle" }} />
                        Page Name
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: '180px' }}>
                        Page Description
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: '150px' }}>
                        URL
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: '180px' }}>
                        <Assignment sx={{ mr: 1, verticalAlign: "middle" }} />
                        Component Identifier
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: '250px' }}>
                        <Group sx={{ mr: 1, verticalAlign: "middle" }} />
                        Access Groups
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: settings?.textPrimaryColor || '#6D2323', textAlign: "center", width: '120px' }}
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
                            "&:nth-of-type(even)": {
                              bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.3),
                            },
                            "&:hover": { bgcolor: alpha(settings?.primaryColor || '#894444', 0.05) },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <PremiumTableCell
                            sx={{ fontWeight: 600, color: settings?.textPrimaryColor || '#6D2323' }}
                          >
                            {pg.id}
                          </PremiumTableCell>

                          <PremiumTableCell>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600, color: settings?.textPrimaryColor || '#6D2323' }}
                            >
                              {pg.page_name}
                            </Typography>
                          </PremiumTableCell>

                          <PremiumTableCell sx={{ color: settings?.textPrimaryColor || '#6D2323' }}>
                            <Chip
                              label={pg.page_description}
                              size="small"
                              icon={getDescriptionColor(pg.page_description).icon}
                              sx={{
                                ...getDescriptionColor(pg.page_description).sx,
                                fontWeight: 600,
                                padding: "4px 8px",
                              }}
                            />
                          </PremiumTableCell>

                          <PremiumTableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: "monospace",
                                color: settings?.textPrimaryColor || '#6D2323',
                                bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                display: "inline-block",
                              }}
                            >
                              {pg.page_url || "N/A"}
                            </Typography>
                          </PremiumTableCell>

                          <PremiumTableCell>
                            {pg.component_identifier ? (
                              <Tooltip
                                title={
                                  getComponentInfo(pg.component_identifier) ? (
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        Connected Component:
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Name:</strong> {getComponentInfo(pg.component_identifier).componentName}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Path:</strong> {getComponentInfo(pg.component_identifier).componentPath}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        <strong>Route:</strong> {getComponentInfo(pg.component_identifier).routePath}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    "No component mapping found"
                                  )
                                }
                                arrow
                              >
                                <Chip
                                  label={pg.component_identifier}
                                  size="small"
                                  icon={getComponentInfo(pg.component_identifier) ? <CheckCircle /> : <Warning />}
                                  sx={{
                                    bgcolor: getComponentInfo(pg.component_identifier)
                                      ? alpha(settings?.primaryColor || '#894444', 0.15)
                                      : alpha('#ff9800', 0.15),
                                    color: getComponentInfo(pg.component_identifier)
                                      ? settings?.primaryColor || '#894444'
                                      : '#ff9800',
                                    fontWeight: 600,
                                    fontFamily: "monospace",
                                    cursor: "help",
                                    "&:hover": {
                                      bgcolor: getComponentInfo(pg.component_identifier)
                                        ? alpha(settings?.primaryColor || '#894444', 0.25)
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
                                  fontStyle: "italic",
                                }}
                              />
                            )}
                          </PremiumTableCell>

                          <PremiumTableCell>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxWidth: '250px' }}>
                              {pg.page_group && pg.page_group.split(",").map((group, index) => (
                                <Chip
                                  key={index}
                                  label={group.trim().toUpperCase()}
                                  size="small"
                                  variant="outlined"
                                  icon={getGroupColor(group.trim()).icon}
                                  sx={{
                                    borderColor: getGroupColor(group.trim()).sx.color,
                                    color: getGroupColor(group.trim()).sx.color,
                                    fontWeight: 600,
                                    padding: "2px 6px",
                                    fontSize: "0.75rem",
                                    bgcolor: 'transparent',
                                  }}
                                />
                              ))}
                            </Box>
                          </PremiumTableCell>

                          <PremiumTableCell sx={{ textAlign: "center" }}>
                            <Tooltip title="Edit Page">
                              <IconButton
                                onClick={() => handleEdit(pg)}
                                sx={{
                                  color: settings?.primaryColor || '#894444',
                                  mr: 1,
                                  "&:hover": {
                                    bgcolor: alpha(settings?.primaryColor || '#894444', 0.1),
                                  },
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete Page">
                              <IconButton
                                onClick={() => handleDeleteConfirm(pg.id)}
                                sx={{
                                  color: "#000000",
                                  "&:hover": {
                                    bgcolor: alpha("#000000", 0.1),
                                  },
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
                          sx={{ textAlign: "center", py: 8 }}
                        >
                          <Box sx={{ textAlign: "center" }}>
                            <Info
                              sx={{
                                fontSize: 80,
                                color: alpha(settings?.primaryColor || '#894444', 0.3),
                                mb: 3,
                              }}
                            />
                            <Typography
                              variant="h5"
                              color={alpha(settings?.primaryColor || '#894444', 0.6)}
                              gutterBottom
                              sx={{ fontWeight: 600 }}
                            >
                              No Pages Found
                            </Typography>
                            <Typography
                              variant="body1"
                              color={alpha(settings?.primaryColor || '#894444', 0.4)}
                            >
                              {searchTerm
                                ? "Try adjusting your search criteria"
                                : "No pages registered yet"}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>

              {/* Pagination */}
              {filteredPages.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
                  <TablePagination
                    component="div"
                    count={filteredPages.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    sx={{
                      "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                        {
                          color: settings?.textPrimaryColor || '#6D2323',
                          fontWeight: 600,
                        },
                    }}
                  />
                </Box>
              )}
            </GlassCard>
          </Fade>
        )}

        {/* Edit Page Dialog */}
        <Dialog
          open={editDialog}
          onClose={cancelEdit}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              bgcolor: settings?.accentColor || '#FEF9E1',
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${settings?.primaryColor || '#894444'} 0%, ${settings?.secondaryColor || '#6d2323'} 100%)`,
              color: settings?.accentColor || '#FEF9E1',
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 3,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Edit sx={{ fontSize: 30 }} />
              Edit Page
            </Box>
            <IconButton onClick={cancelEdit} sx={{ color: settings?.accentColor || '#FEF9E1' }}>
              <Cancel />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
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
                    {descriptionOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
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
                        ? "No component mapping found for this identifier"
                        : "Unique identifier for dynamic page access (optional)"
                    }
                    InputProps={{
                      endAdornment: componentIdentifier && getComponentInfo(componentIdentifier) ? (
                        <CheckCircle sx={{ color: settings?.primaryColor || '#894444', ml: 1 }} />
                      ) : componentIdentifier ? (
                        <Warning sx={{ color: '#ff9800', ml: 1 }} />
                      ) : null,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel
                      sx={{
                        fontWeight: 500,
                        color: settings?.primaryColor || '#894444',
                        "&.Mui-focused": { color: settings?.primaryColor || '#894444' },
                      }}
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
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                        },
                        "&.Mui-focused": {
                          boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
                          backgroundColor: "rgba(255, 255, 255, 1)",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(settings?.primaryColor || '#894444', 0.3),
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(settings?.primaryColor || '#894444', 0.5),
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: settings?.primaryColor || '#894444',
                        },
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={value.toUpperCase()}
                              size="small"
                              sx={{
                                bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                                color: settings?.primaryColor || '#894444',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {accessGroupOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText sx={{ color: alpha(settings?.primaryColor || '#894444', 0.7), fontSize: "0.8rem" }}>
                      You can select multiple access groups
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            </form>
          </DialogContent>

          <DialogActions sx={{ p: 3, bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5) }}>
            <ProfessionalButton
              onClick={cancelEdit}
              startIcon={<Cancel />}
              variant="outlined"
              sx={{
                borderColor: settings?.primaryColor || '#894444',
                color: settings?.primaryColor || '#894444',
                "&:hover": {
                  borderColor: settings?.secondaryColor || '#6d2323',
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleSubmit}
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{
                bgcolor: settings?.primaryColor || '#894444',
                color: settings?.accentColor || '#FEF9E1',
                "&:hover": {
                  bgcolor: settings?.secondaryColor || '#6d2323',
                },
              }}
            >
              {loading ? "Updating..." : "Update Page"}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* Add Page Dialog */}
        <Dialog
          open={addDialog}
          onClose={cancelAdd}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              bgcolor: settings?.accentColor || '#FEF9E1',
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${settings?.primaryColor || '#894444'} 0%, ${settings?.secondaryColor || '#6d2323'} 100%)`,
              color: settings?.accentColor || '#FEF9E1',
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 3,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Add sx={{ fontSize: 30 }} />
              Add New Page
            </Box>
            <IconButton onClick={cancelAdd} sx={{ color: settings?.accentColor || '#FEF9E1' }}>
              <Cancel />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
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
                    {descriptionOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
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
                        ? "No component mapping found for this identifier"
                        : "Unique identifier for dynamic page access (optional)"
                    }
                    InputProps={{
                      endAdornment: componentIdentifier && getComponentInfo(componentIdentifier) ? (
                        <CheckCircle sx={{ color: settings?.primaryColor || '#894444', ml: 1 }} />
                      ) : componentIdentifier ? (
                        <Warning sx={{ color: '#ff9800', ml: 1 }} />
                      ) : null,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel
                      sx={{
                        fontWeight: 500,
                        color: settings?.primaryColor || '#894444',
                        "&.Mui-focused": { color: settings?.primaryColor || '#894444' },
                      }}
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
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                        },
                        "&.Mui-focused": {
                          boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
                          backgroundColor: "rgba(255, 255, 255, 1)",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(settings?.primaryColor || '#894444', 0.3),
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: alpha(settings?.primaryColor || '#894444', 0.5),
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: settings?.primaryColor || '#894444',
                        },
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={value.toUpperCase()}
                              size="small"
                              sx={{
                                bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                                color: settings?.primaryColor || '#894444',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {accessGroupOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText sx={{ color: alpha(settings?.primaryColor || '#894444', 0.7), fontSize: "0.8rem" }}>
                      You can select multiple access groups
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            </form>
          </DialogContent>

          <DialogActions sx={{ p: 3, bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5) }}>
            <ProfessionalButton
              onClick={cancelAdd}
              startIcon={<Cancel />}
              variant="outlined"
              sx={{
                borderColor: settings?.primaryColor || '#894444',
                color: settings?.primaryColor || '#894444',
                "&:hover": {
                  borderColor: settings?.secondaryColor || '#6d2323',
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleSubmit}
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{
                bgcolor: settings?.primaryColor || '#894444',
                color: settings?.accentColor || '#FEF9E1',
                "&:hover": {
                  bgcolor: settings?.secondaryColor || '#6d2323',
                },
              }}
            >
              {loading ? "Creating..." : "Create Page"}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => {
            setDeleteDialog(false);
            setDeleteConfirmed(false);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              bgcolor: settings?.accentColor || '#FEF9E1',
              overflow: 'hidden',
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${settings?.primaryColor || '#894444'} 0%, ${settings?.secondaryColor || '#6d2323'} 100%)`,
              color: settings?.accentColor || '#FEF9E1',
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 3,
              fontWeight: 700,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                background: `radial-gradient(circle, ${alpha('#ffffff', 0.1)} 0%, transparent 70%)`,
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
              <Avatar
                sx={{
                  bgcolor: alpha('#ffffff', 0.2),
                  width: 48,
                  height: 48,
                }}
              >
                <Warning sx={{ fontSize: 28, color: settings?.accentColor || '#FEF9E1' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Confirm Deletion
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.85rem" }}>
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
                color: settings?.accentColor || '#FEF9E1',
                position: "relative",
                zIndex: 1,
                "&:hover": {
                  bgcolor: alpha('#ffffff', 0.1),
                },
              }}
            >
              <Cancel />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 3,
                }}
              >
                <Error sx={{ fontSize: 48, color: settings?.primaryColor || '#894444' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: settings?.textPrimaryColor || '#6D2323',
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                Are you sure you want to delete this page?
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: alpha(settings?.textPrimaryColor || '#6D2323', 0.7),
                  mb: 3,
                  lineHeight: 1.6,
                }}
              >
                This action cannot be undone. Deleting this page will permanently remove it
                from the system and revoke all associated user access permissions.
              </Typography>
            </Box>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: alpha(settings?.primaryColor || '#894444', 0.08),
                border: `2px solid ${alpha(settings?.primaryColor || '#894444', 0.2)}`,
                transition: "all 0.3s ease",
                ...(deleteConfirmed && {
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.12),
                  border: `2px solid ${settings?.primaryColor || '#894444'}`,
                }),
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    sx={{
                      color: settings?.primaryColor || '#894444',
                      '&.Mui-checked': {
                        color: settings?.primaryColor || '#894444',
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: 28,
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      color: settings?.textPrimaryColor || '#6D2323',
                      fontSize: "1rem",
                      fontWeight: deleteConfirmed ? 600 : 500,
                      transition: "all 0.2s ease",
                    }}
                  >
                    I understand this action cannot be undone
                  </Typography>
                }
                sx={{
                  m: 0,
                  alignItems: "center",
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: 3,
              bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5),
              borderTop: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.1)}`,
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
                borderColor: settings?.primaryColor || '#894444',
                color: settings?.primaryColor || '#894444',
                "&:hover": {
                  borderColor: settings?.secondaryColor || '#6d2323',
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                },
              }}
            >
              Cancel
            </ProfessionalButton>
            <ProfessionalButton
              onClick={handleDelete}
              variant="contained"
              fullWidth
              disabled={loading || !deleteConfirmed}
              startIcon={loading ? <CircularProgress size={20} sx={{ color: "#ffffff" }} /> : <Delete />}
              sx={{
                bgcolor: deleteConfirmed
                  ? settings?.primaryColor || '#894444'
                  : alpha(settings?.primaryColor || '#894444', 0.3),
                color: "#ffffff",
                "&:hover": {
                  bgcolor: deleteConfirmed
                    ? settings?.secondaryColor || '#6d2323'
                    : alpha(settings?.primaryColor || '#894444', 0.3),
                },
                "&:disabled": {
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.2),
                  color: alpha("#ffffff", 0.5),
                },
              }}
            >
              {loading ? "Deleting..." : "Delete Page"}
            </ProfessionalButton>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PagesList;