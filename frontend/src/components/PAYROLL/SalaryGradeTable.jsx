import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Container,
  Typography,
  Chip,
  Grid,
  Paper,
  Box,
  InputAdornment,
  Fade,
  Backdrop,
  styled,
  alpha,
  Avatar,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TablePagination,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Upgrade,
  Search,
  Shortcut,
  Refresh,
  FilterList,
  ClearAll,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

const GlassCard = styled(Paper)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const ProfessionalButton = styled(Button)(({ theme, variant, color = 'primary' }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: '12px 24px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.025em',
  boxShadow: variant === 'contained' ? '0 4px 14px rgba(254, 249, 225, 0.25)' : 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? '0 6px 20px rgba(254, 249, 225, 0.35)' : 'none',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const ModernTextField = styled(TextField)(({ theme }) => ({
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

const ModernSelect = styled(FormControl)(({ theme }) => ({
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

const PremiumTableContainer = styled(Box)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(109, 35, 35, 0.06)',
  border: '1px solid rgba(109, 35, 35, 0.08)',
  backgroundColor: '#fff',
}));

const SalaryGradeTable = () => {
  const [salaryGrades, setSalaryGrades] = useState([]);
  const [newSalaryGrade, setNewSalaryGrade] = useState({
    effectivityDate: '2024',
    sg_number: '',
    step1: '',
    step2: '',
    step3: '',
    step4: '',
    step5: '',
    step6: '',
    step7: '',
    step8: '',
  });
  const [editSalaryGradeId, setEditSalaryGradeId] = useState(null);

  // --- FIXED FILTERS: three independent fields ---
  const [searchFilters, setSearchFilters] = useState({
    effectivityDate: '', // dropdown: exact year match
    sg_number: '',       // dropdown: exact SG match
    stepValue: '',       // text: search across any step value
  });

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const navigate = useNavigate();
  const { settings } = useSystemSettings();

  const primaryColor = settings.accentColor || '#FEF9E1';
  const secondaryColor = settings.backgroundColor || '#FFF8E7';
  const accentColor = settings.primaryColor || '#6d2323';
  const accentDark = settings.secondaryColor || '#8B3333';
  const textPrimaryColor = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor = settings.textSecondaryColor || '#FEF9E1';
  const hoverColor = settings.hoverColor || '#6D2323';

  const { hasAccess, loading: accessLoading } = usePageAccess('salary-grade');

  // Derive unique year and SG options from loaded data
  const yearOptions = useMemo(() => {
    const years = [...new Set(salaryGrades.map((r) => r.effectivityDate))].sort();
    // Also include generated years so the form dropdown is still fully populated
    const generated = generateYearOptions().map(String);
    const merged = [...new Set([...generated, ...years])].sort();
    return merged;
  }, [salaryGrades]);

  const sgOptionsFromData = useMemo(() => {
    return [...new Set(salaryGrades.map((r) => r.sg_number))];
  }, [salaryGrades]);

  // --- FIXED FILTER LOGIC ---
  const filteredGrades = useMemo(() => {
    const { effectivityDate, sg_number, stepValue } = searchFilters;
    return salaryGrades.filter((record) => {
      // Year filter — exact match from dropdown
      if (effectivityDate && record.effectivityDate !== effectivityDate) return false;

      // SG number filter — exact match from dropdown
      if (sg_number && record.sg_number !== sg_number) return false;

      // Step value filter — match any step that contains the search string
      if (stepValue) {
        const query = stepValue.toLowerCase().trim();
        const anyStepMatches = [...Array(8)].some((_, i) =>
          (record[`step${i + 1}`] ?? '').toString().toLowerCase().includes(query)
        );
        if (!anyStepMatches) return false;
      }

      return true;
    });
  }, [salaryGrades, searchFilters]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(0);
  }, [searchFilters]);

  // Paginated slice
  const paginatedGrades = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredGrades.slice(start, start + rowsPerPage);
  }, [filteredGrades, page, rowsPerPage]);

  function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 2020; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  }

  function generateSGOptions() {
    const options = [];
    for (let i = 1; i <= 33; i++) {
      options.push(i.toString());
    }
    options.push('Job Order(Graduated)');
    options.push('Job Order(Undergraduate)');
    return options;
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchSalaryGrades();
  }, []);

  const fetchSalaryGrades = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/SalaryGradeTable/salary-grade`,
        getAuthHeaders()
      );
      setSalaryGrades(response.data);
    } catch (error) {
      console.error('Error fetching salary grades:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Session expired. Please login again.');
      }
    }
  };

  usePayrollRealtimeRefresh(() => {
    fetchSalaryGrades();
  });

  const addSalaryGrade = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/SalaryGradeTable/salary-grade`,
        newSalaryGrade,
        getAuthHeaders()
      );
      setNewSalaryGrade({
        effectivityDate: '2024',
        sg_number: '',
        step1: '', step2: '', step3: '', step4: '',
        step5: '', step6: '', step7: '', step8: '',
      });
      fetchSalaryGrades();
    } catch (error) {
      console.error('Error adding salary grade:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Session expired. Please login again.');
      }
    }
  };

  const updateSalaryGrade = async (id) => {
    const updatedRecord = salaryGrades.find((rec) => rec.id === id);
    try {
      await axios.put(
        `${API_BASE_URL}/SalaryGradeTable/salary-grade/${id}`,
        updatedRecord,
        getAuthHeaders()
      );
      setEditSalaryGradeId(null);
      fetchSalaryGrades();
    } catch (error) {
      console.error('Error updating salary grade:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Session expired. Please login again.');
      }
    }
  };

  const deleteSalaryGrade = async (id) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/SalaryGradeTable/salary-grade/${id}`,
        getAuthHeaders()
      );
      fetchSalaryGrades();
    } catch (error) {
      console.error('Error deleting salary grade:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Session expired. Please login again.');
      }
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const str = (text ?? '').toString();
    const parts = str.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} style={{ backgroundColor: 'rgba(109, 35, 35, 0.2)' }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const clearFilters = () => {
    setSearchFilters({ effectivityDate: '', sg_number: '', stepValue: '' });
    setPage(0);
  };

  const hasActiveFilters =
    searchFilters.effectivityDate || searchFilters.sg_number || searchFilters.stepValue;

  // ACCESS CONTROL
  if (accessLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }
  if (!accessLoading && hasAccess !== true) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Salary Grade Table. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <Box sx={{
      py: 4,
      mt: -5,
      width: '1600px',
      mx: 'auto',
      overflow: 'hidden',
    }}>
      <Box sx={{ px: 6 }}>

        {/* ── HEADER ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
              '&:hover': { boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}` },
            }}>
              <Box sx={{
                p: 5,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: textPrimaryColor,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                  background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, ${alpha(accentColor, 0)} 70%)` }} />
                <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150,
                  background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0)} 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{
                      bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64,
                      boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}`
                    }}>
                      <Upgrade sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Tranche Salary Management
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: textPrimaryColor }}>
                        For Civilian Personnel of National Government
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => window.location.reload()}
                        sx={{
                          bgcolor: 'rgba(109,35,35,0.1)',
                          '&:hover': { bgcolor: 'rgba(109,35,35,0.2)' },
                          color: accentColor, width: 48, height: 48,
                        }}
                      >
                        <Refresh sx={{ fontSize: 24 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── ADD FORM ── */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
            <Box sx={{
              p: 4,
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}>
              <Upgrade sx={{ fontSize: '1.8rem', mr: 2 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Add New Salary Grade</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Fill in salary grade information</Typography>
              </Box>
            </Box>

            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                    Effectivity Date
                  </Typography>
                  <ModernSelect fullWidth variant="outlined">
                    <InputLabel id="effectivity-date-label">Year</InputLabel>
                    <Select
                      labelId="effectivity-date-label"
                      value={newSalaryGrade.effectivityDate}
                      onChange={(e) => setNewSalaryGrade({ ...newSalaryGrade, effectivityDate: e.target.value })}
                      label="Year"
                    >
                      {generateYearOptions().map((year) => (
                        <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                      ))}
                    </Select>
                  </ModernSelect>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                    Salary Grade Number
                  </Typography>
                  <ModernSelect fullWidth variant="outlined">
                    <InputLabel id="sg-number-label">Salary Grade</InputLabel>
                    <Select
                      labelId="sg-number-label"
                      value={newSalaryGrade.sg_number}
                      onChange={(e) => setNewSalaryGrade({ ...newSalaryGrade, sg_number: e.target.value })}
                      label="Salary Grade"
                      MenuProps={{ PaperProps: { sx: { width: '200px', maxHeight: '300px' } } }}
                    >
                      {generateSGOptions().map((sg) => (
                        <MenuItem key={sg} value={sg}>{sg}</MenuItem>
                      ))}
                    </Select>
                  </ModernSelect>
                </Grid>

                {[...Array(8)].map((_, i) => (
                  <Grid item xs={12} sm={6} md={3} key={i}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: accentColor }}>
                      Step {i + 1}
                    </Typography>
                    <ModernTextField
                      fullWidth
                      value={newSalaryGrade[`step${i + 1}`]}
                      onChange={(e) => setNewSalaryGrade({ ...newSalaryGrade, [`step${i + 1}`]: e.target.value })}
                    />
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <ProfessionalButton
                    onClick={addSalaryGrade}
                    variant="contained"
                    startIcon={<AddIcon />}
                    fullWidth
                    sx={{
                      py: 1.5,
                      fontSize: '1rem',
                      backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323',
                      color: settings.accentColor || '#FEF9E1',
                      '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' },
                    }}
                  >
                    Add Salary Grade
                  </ProfessionalButton>
                </Grid>
              </Grid>
            </Box>
          </GlassCard>
        </Fade>

        {/* ── SEARCH / FILTER BAR ── */}
        <Fade in timeout={900}>
          <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor, 0.1)}` }}>
            <Box sx={{
              p: 3,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}>
              {/* Left: filters */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flexGrow: 1 }}>
                <FilterList sx={{ color: accentColor, fontSize: 22 }} />

                {/* Filter by Year */}
                <ModernSelect size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="filter-year-label">Year</InputLabel>
                  <Select
                    labelId="filter-year-label"
                    value={searchFilters.effectivityDate}
                    onChange={(e) => setSearchFilters({ ...searchFilters, effectivityDate: e.target.value })}
                    label="Year"
                    size="small"
                  >
                    <MenuItem value=""><em>All Years</em></MenuItem>
                    {generateYearOptions().map((year) => (
                      <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                    ))}
                  </Select>
                </ModernSelect>

                {/* Filter by SG Number */}
                <ModernSelect size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="filter-sg-label">SG Number</InputLabel>
                  <Select
                    labelId="filter-sg-label"
                    value={searchFilters.sg_number}
                    onChange={(e) => setSearchFilters({ ...searchFilters, sg_number: e.target.value })}
                    label="SG Number"
                    size="small"
                    MenuProps={{ PaperProps: { sx: { maxHeight: '300px' } } }}
                  >
                    <MenuItem value=""><em>All Grades</em></MenuItem>
                    {generateSGOptions().map((sg) => (
                      <MenuItem key={sg} value={sg}>{sg}</MenuItem>
                    ))}
                  </Select>
                </ModernSelect>

                {/* Filter by Step Value */}
                <ModernTextField
                  label="Search Step Value"
                  size="small"
                  value={searchFilters.stepValue}
                  onChange={(e) => setSearchFilters({ ...searchFilters, stepValue: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: accentColor, fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: '200px' }}
                />

                {/* Result count chip */}
                {hasActiveFilters && (
                  <Chip
                    label={`${filteredGrades.length} result${filteredGrades.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                      bgcolor: alpha(accentColor, 0.1),
                      color: accentColor,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
                )}
              </Box>

              {/* Right: action buttons */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {hasActiveFilters && (
                  <Tooltip title="Clear All Filters">
                    <ProfessionalButton
                      onClick={clearFilters}
                      variant="outlined"
                      startIcon={<ClearAll />}
                      size="small"
                      sx={{
                        borderColor: accentColor,
                        color: accentColor,
                        py: 0.8,
                        fontSize: '0.85rem',
                        '&:hover': { backgroundColor: alpha(accentColor, 0.06) },
                      }}
                    >
                      Clear Filters
                    </ProfessionalButton>
                  </Tooltip>
                )}
                <ProfessionalButton
                  variant="contained"
                  startIcon={<Shortcut />}
                  onClick={() => navigate('/item-table')}
                  sx={{
                    backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323',
                    color: settings.accentColor || '#FEF9E1',
                    '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' },
                  }}
                >
                  Insert to Item Table
                </ProfessionalButton>
              </Box>
            </Box>
          </GlassCard>
        </Fade>

        {/* ── TABLE ── */}
        <Fade in timeout={1100}>
          <PremiumTableContainer>
            <Table sx={{ backgroundColor: '#fff' }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: accentColor }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Effectivity Date</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>SG Number</TableCell>
                  {[...Array(8)].map((_, i) => (
                    <TableCell key={i} sx={{ color: '#fff', fontWeight: 'bold' }}>Step {i + 1}</TableCell>
                  ))}
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Search sx={{ fontSize: 40, color: alpha(accentColor, 0.3) }} />
                        <Typography variant="h6" color={accentColor}>
                          {hasActiveFilters ? 'No records match your filters' : 'No records found'}
                        </Typography>
                        {hasActiveFilters && (
                          <Typography variant="body2" color="text.secondary">
                            Try adjusting or clearing your filters
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedGrades.map((record) => (
                    <TableRow key={record.id} sx={{ '&:hover': { backgroundColor: alpha(accentColor, 0.03) } }}>

                      {/* Effectivity Date cell */}
                      <TableCell>
                        {editSalaryGradeId === record.id ? (
                          <ModernSelect fullWidth variant="outlined" size="small">
                            <Select
                              value={record.effectivityDate}
                              onChange={(e) => {
                                const updated = { ...record, effectivityDate: e.target.value };
                                setSalaryGrades((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
                              }}
                              size="small"
                            >
                              {generateYearOptions().map((year) => (
                                <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                              ))}
                            </Select>
                          </ModernSelect>
                        ) : (
                          highlightText(record.effectivityDate, searchFilters.effectivityDate)
                        )}
                      </TableCell>

                      {/* SG Number cell */}
                      <TableCell>
                        {editSalaryGradeId === record.id ? (
                          <ModernSelect fullWidth variant="outlined" size="small">
                            <Select
                              value={record.sg_number}
                              onChange={(e) => {
                                const updated = { ...record, sg_number: e.target.value };
                                setSalaryGrades((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
                              }}
                              size="small"
                              MenuProps={{ PaperProps: { sx: { width: '200px', maxHeight: '300px' } } }}
                            >
                              {generateSGOptions().map((sg) => (
                                <MenuItem key={sg} value={sg}>{sg}</MenuItem>
                              ))}
                            </Select>
                          </ModernSelect>
                        ) : (
                          highlightText(record.sg_number, searchFilters.sg_number)
                        )}
                      </TableCell>

                      {/* Step cells */}
                      {[...Array(8)].map((_, i) => (
                        <TableCell key={i}>
                          {editSalaryGradeId === record.id ? (
                            <ModernTextField
                              size="small"
                              value={record[`step${i + 1}`]}
                              onChange={(e) => {
                                const updated = { ...record, [`step${i + 1}`]: e.target.value };
                                setSalaryGrades((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
                              }}
                            />
                          ) : (
                            highlightText(record[`step${i + 1}`], searchFilters.stepValue)
                          )}
                        </TableCell>
                      ))}

                      {/* Actions cell */}
                      <TableCell>
                        {editSalaryGradeId === record.id ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <ProfessionalButton
                              onClick={() => updateSalaryGrade(record.id)}
                              variant="contained"
                              startIcon={<SaveIcon />}
                              sx={{
                                backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323',
                                color: settings.accentColor || '#FEF9E1',
                                py: 0.5, fontSize: '0.8rem', minWidth: '80px',
                                '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' },
                              }}
                            >
                              Update
                            </ProfessionalButton>
                            <ProfessionalButton
                              onClick={() => setEditSalaryGradeId(null)}
                              variant="outlined"
                              startIcon={<CancelIcon />}
                              sx={{
                                borderColor: settings.cancelButtonColor || '#6c757d',
                                color: settings.cancelButtonColor || '#6c757d',
                                py: 0.5, fontSize: '0.8rem', minWidth: '80px',
                                '&:hover': {
                                  backgroundColor: alpha(settings.cancelButtonColor || '#6c757d', 0.1),
                                  borderColor: settings.cancelButtonHoverColor || '#5a6268',
                                  color: settings.cancelButtonHoverColor || '#5a6268',
                                },
                              }}
                            >
                              Cancel
                            </ProfessionalButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <ProfessionalButton
                              onClick={() => setEditSalaryGradeId(record.id)}
                              variant="contained"
                              startIcon={<EditIcon />}
                              sx={{
                                backgroundColor: settings.updateButtonColor || settings.primaryColor || '#6d2323',
                                color: settings.accentColor || '#FEF9E1',
                                py: 0.5, fontSize: '0.8rem', minWidth: '80px',
                                '&:hover': { backgroundColor: settings.updateButtonHoverColor || settings.hoverColor || '#a31d1d' },
                              }}
                            >
                              Edit
                            </ProfessionalButton>
                            <ProfessionalButton
                              onClick={() => deleteSalaryGrade(record.id)}
                              variant="outlined"
                              startIcon={<DeleteIcon />}
                              sx={{
                                borderColor: settings.deleteButtonColor || settings.primaryColor || '#6d2323',
                                color: settings.deleteButtonColor || settings.primaryColor || '#6d2323',
                                py: 0.5, fontSize: '0.8rem', minWidth: '80px',
                                '&:hover': {
                                  backgroundColor: alpha(settings.deleteButtonColor || settings.primaryColor || '#6d2323', 0.1),
                                  borderColor: settings.deleteButtonHoverColor || settings.hoverColor || '#a31d1d',
                                  color: settings.deleteButtonHoverColor || settings.hoverColor || '#a31d1d',
                                },
                              }}
                            >
                              Delete
                            </ProfessionalButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* ── PAGINATION ── */}
            <Divider />
            <TablePagination
              component="div"
              count={filteredGrades.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 20, 50]}
              sx={{
                borderTop: `1px solid ${alpha(accentColor, 0.1)}`,
                backgroundColor: alpha(primaryColor, 0.5),
                '.MuiTablePagination-toolbar': { px: 3 },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  color: accentColor,
                  fontWeight: 500,
                },
                '.MuiTablePagination-select': {
                  color: accentColor,
                  fontWeight: 600,
                },
                '.MuiTablePagination-actions button': {
                  color: accentColor,
                  '&:disabled': { color: alpha(accentColor, 0.3) },
                },
              }}
            />
          </PremiumTableContainer>
        </Fade>

      </Box>
    </Box>
  );
};

export default SalaryGradeTable;