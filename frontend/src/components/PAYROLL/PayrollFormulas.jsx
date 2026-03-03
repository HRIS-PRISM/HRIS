import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  alpha,
  Grid,
  Tabs,
  Tab,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  HelpOutline as HelpOutlineIcon,
  Clear as ClearIcon,
  Backspace as BackspaceIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
} from '@mui/icons-material';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

// --- Data Definitions ---

const PAYROLL_FIELDS = [
  { value: 'rateNbc584', label: 'Basic Rate (NBC 584)', category: 'Salary' },
  { value: 'rateNbc594', label: 'Basic Rate (NBC 594)', category: 'Salary' },
  { value: 'nbc594', label: 'NBC 594', category: 'Salary' },
  { value: 'nbcDiffl597', label: 'NBC Adjustment', category: 'Salary' },
  { value: 'increment', label: 'Salary Increment', category: 'Salary' },
  { value: 'h', label: 'Hours Worked', category: 'Time' },
  { value: 'm', label: 'Minutes Worked', category: 'Time' },
  { value: 's', label: 'Seconds Worked', category: 'Time' },
  { value: 'gsisSalaryLoan', label: 'GSIS Salary Loan', category: 'Loans' },
  { value: 'gsisPolicyLoan', label: 'GSIS Policy Loan', category: 'Loans' },
  { value: 'gsisArrears', label: 'GSIS Arrears', category: 'Loans' },
  { value: 'cpl', label: 'CPL', category: 'Loans' },
  { value: 'mpl', label: 'MPL', category: 'Loans' },
  { value: 'eal', label: 'EAL', category: 'Loans' },
  { value: 'mplLite', label: 'MPL Lite', category: 'Loans' },
  { value: 'emergencyLoan', label: 'Emergency Loan', category: 'Loans' },
  {
    value: 'pagibigFundCont',
    label: 'Pag-IBIG Contribution',
    category: 'Government',
  },
  { value: 'pagibig2', label: 'Pag-IBIG 2', category: 'Government' },
  { value: 'multiPurpLoan', label: 'Multi-Purpose Loan', category: 'Loans' },
  { value: 'liquidatingCash', label: 'Liquidating Cash', category: 'Other' },
  {
    value: 'landbankSalaryLoan',
    label: 'Landbank Salary Loan',
    category: 'Loans',
  },
  { value: 'earistCreditCoop', label: 'EARIST Credit Coop', category: 'Other' },
  { value: 'feu', label: 'FEU', category: 'Other' },
  { value: 'withholdingTax', label: 'Withholding Tax', category: 'Government' },
  {
    value: 'PhilHealthContribution',
    label: 'PhilHealth',
    category: 'Government',
  },
  { value: 'ec', label: 'EC', category: 'Other' },
];

const CALCULATED_FIELDS = [
  { value: 'grossSalary', label: 'Gross Salary', category: 'Calculated' },
  { value: 'abs', label: 'Absence Deductions', category: 'Calculated' },
  { value: 'netSalary', label: 'Net Salary', category: 'Calculated' },
  {
    value: 'personalLifeRetIns',
    label: 'Personal Life Retirement Insurance',
    category: 'Calculated',
  },
  {
    value: 'totalGsisDeds',
    label: 'Total GSIS Deductions',
    category: 'Calculated',
  },
  {
    value: 'totalPagibigDeds',
    label: 'Total Pag-IBIG Deductions',
    category: 'Calculated',
  },
  {
    value: 'totalOtherDeds',
    label: 'Total Other Deductions',
    category: 'Calculated',
  },
  {
    value: 'totalDeductions',
    label: 'Total Deductions',
    category: 'Calculated',
  },
];

const OPERATORS = [
  { value: '+', label: 'Add', symbol: '+' },
  { value: '-', label: 'Subtract', symbol: '−' },
  { value: '*', label: 'Multiply', symbol: '×' },
  { value: '/', label: 'Divide', symbol: '÷' },
  { value: '(', label: 'Open Parenthesis', symbol: '(' },
  { value: ')', label: 'Close Parenthesis', symbol: ')' },
];

const FUNCTIONS = [
  { value: 'Math.floor', label: 'Round Down', description: '3.7 → 3' },
  { value: 'Math.ceil', label: 'Round Up', description: '3.2 → 4' },
  { value: 'Math.round', label: 'Round', description: '3.5 → 4' },
];

const PERCENTAGES = [
  { label: '5%', value: '0.05' },
  { label: '9%', value: '0.09' },
  { label: '12%', value: '0.12' },
];

// --- Main Component ---

const PayrollFormulas = () => {
  const { settings } = useSystemSettings();
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null);
  const [formulaName, setFormulaName] = useState('');
  const [formulaDescription, setFormulaDescription] = useState('');
  const [formulaInput, setFormulaInput] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationChecked, setVerificationChecked] = useState(false);
  
  // Modal State for Tabs/Categories
  const [modalTabValue, setModalTabValue] = useState(0); // 0: Fields, 1: Operators/Funcs
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [originalFormula, setOriginalFormula] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  useEffect(() => {
    fetchFormulas();
  }, []);

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/payroll-formulas`,
        getAuthHeaders()
      );
      setFormulas(response.data);
    } catch (error) {
      console.error('Error fetching formulas:', error);
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => {
    fetchFormulas();
  });

  const formatFormulaForDisplay = (formula) => {
    if (!formula) return '';
    let simple = formula
      .replace(/parseFloat\s*\(/g, '')
      .replace(/parseFloat\(item\.(\w+)\s*\|\|\s*0\)/g, '$1')
      .replace(/parseFloat\((\w+)\s*\|\|\s*0\)/g, '$1')
      .replace(/parseFloat\(([^)]+)\)/g, '$1')
      .replace(/item\.(\w+)/g, '$1')
      .replace(/\s*\|\|\s*0/g, '')
      .replace(/Math\.floor/g, 'Round Down')
      .replace(/Math\.ceil/g, 'Round Up')
      .replace(/Math\.round/g, 'Round')
      .replace(/\?[^:]*:/g, '')
      .replace(/\?/g, '')
      .replace(/:/g, '')
      .replace(/\((\w+)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/\s*\+\s*/g, ' + ')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\s*\*\s*/g, ' * ')
      .replace(/\s*\/\s*/g, ' / ')
      .trim();
    return simple;
  };

  const handleEdit = (formula) => {
    setEditingFormula(formula);
    setFormulaName(formula.formula_key);
    setFormulaDescription(formula.description || '');
    const simpleFormula = formatFormulaForDisplay(formula.formula_expression);
    setFormulaInput(simpleFormula);
    setOriginalFormula(simpleFormula);
    setOriginalDescription(formula.description || '');
    setVerificationChecked(false);
    setSelectedCategory('All');
    setModalTabValue(0);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingFormula(null);
    setFormulaName('');
    setFormulaDescription('');
    setFormulaInput('');
    setOriginalFormula('');
    setOriginalDescription('');
    setVerificationChecked(false);
    setSelectedCategory('All');
    setModalTabValue(0);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const simpleExpression = formulaInput.trim();

      if (editingFormula) {
        await axios.put(
          `${API_BASE_URL}/api/payroll-formulas/${formulaName}`,
          {
            formula_expression: simpleExpression,
            description: formulaDescription,
          },
          getAuthHeaders()
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/payroll-formulas`,
          {
            formula_key: formulaName,
            formula_expression: simpleExpression,
            description: formulaDescription,
          },
          getAuthHeaders()
        );
      }
      await fetchFormulas();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving formula:', error);
      alert(error.response?.data?.error || 'Error saving formula');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formulaKey) => {
    if (window.confirm(`Are you sure you want to delete "${formulaKey}"?`)) {
      try {
        setLoading(true);
        await axios.delete(
          `${API_BASE_URL}/api/payroll-formulas/${formulaKey}`,
          getAuthHeaders()
        );
        await fetchFormulas();
      } catch (error) {
        console.error('Error deleting formula:', error);
        alert('Error deleting formula');
      } finally {
        setLoading(false);
      }
    }
  };

  const insertIntoFormula = (text) => {
    const current = formulaInput.trim();
    const newValue = current ? `${current} ${text}` : text;
    setFormulaInput(newValue);
  };

  const handleBackspace = () => {
    setFormulaInput((prev) => prev.slice(0, -1).trimEnd());
  };

  const hasChanged =
    editingFormula &&
    (formulaInput !== originalFormula ||
      formulaDescription !== originalDescription);

  const categories = [
    'All',
    'Salary',
    'Time',
    'Loans',
    'Government',
    'Calculated',
    'Other',
  ];

  const allFields = [...PAYROLL_FIELDS, ...CALCULATED_FIELDS];
  const filteredFields =
    selectedCategory === 'All'
      ? allFields
      : allFields.filter((f) => f.category === selectedCategory);

  const filteredFormulas = formulas.filter(
    (formula) =>
      formula.formula_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (formula.description || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const paginatedFormulas = filteredFormulas.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // --- Helper Components for Modal ---

  const OperatorButton = ({ op }) => (
    <Button
      key={op.value}
      variant="contained"
      onClick={() => insertIntoFormula(op.value)}
      sx={{
        minWidth: 45,
        height: 45,
        bgcolor: '#ef5350', // Red 400
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        '&:hover': { bgcolor: '#e53935', transform: 'translateY(-1px)' },
      }}
      title={op.label}
    >
      {op.symbol}
    </Button>
  );

  const FunctionChip = ({ func }) => (
    <Tooltip key={func.value} title={func.description} arrow>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertIntoFormula(`${func.value}(`)}
        sx={{
          borderColor: '#66bb6a',
          color: '#2e7d32',
          fontWeight: 500,
          '&:hover': { bgcolor: alpha('#66bb6a', 0.1) },
        }}
      >
        {func.label}
      </Button>
    </Tooltip>
  );

  const PercentageChip = ({ pct }) => (
    <Button
      size="small"
      variant="outlined"
      onClick={() => insertIntoFormula(`* ${pct.value}`)}
      sx={{
        borderColor: '#ffa726',
        color: '#ef6c00',
        fontWeight: 500,
        '&:hover': { bgcolor: alpha('#ffa726', 0.1) },
      }}
    >
      {pct.label}
    </Button>
  );

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: settings.backgroundColor }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${settings.backgroundColor} 100%)`,
            borderRadius: 3,
            border: `1px solid ${alpha(settings.primaryColor, 0.2)}`,
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
          >
            <Box display="flex" alignItems="center" gap={2.5}>
              <Avatar
                sx={{
                  bgcolor: settings.primaryColor,
                  width: 64,
                  height: 64,
                  boxShadow: `0 8px 16px ${alpha(settings.primaryColor, 0.3)}`,
                }}
              >
                <CalculateIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: settings.textPrimaryColor,
                    letterSpacing: '-0.5px',
                  }}
                >
                  Payroll Calculation Engine
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: settings.textPrimaryColor,
                    opacity: 0.8,
                    mt: 0.5,
                  }}
                >
                  Configure, manage, and audit payroll computation logic
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1.5}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchFormulas}
                disabled={loading}
                sx={{
                  borderColor: settings.primaryColor,
                  color: settings.textPrimaryColor,
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    borderColor: settings.secondaryColor,
                    bgcolor: alpha(settings.primaryColor, 0.08),
                  },
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreate}
                sx={{
                  bgcolor: settings.primaryColor,
                  color: settings.accentColor,
                  fontWeight: 700,
                  px: 3,
                  boxShadow: `0 4px 12px ${alpha(settings.primaryColor, 0.3)}`,
                  '&:hover': {
                    bgcolor: settings.secondaryColor,
                    boxShadow: `0 6px 16px ${alpha(settings.primaryColor, 0.4)}`,
                  },
                }}
              >
                New Formula
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search formulas by name or description..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: settings.primaryColor }} />
              </InputAdornment>
            ),
            sx: {
              bgcolor: settings.accentColor,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(settings.primaryColor, 0.2),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(settings.primaryColor, 0.5),
              },
            },
          }}
          sx={{ maxWidth: 600 }}
        />
      </Box>

      {/* Data Table */}
      <Paper
        elevation={2}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${alpha(settings.primaryColor, 0.1)}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6, flex: 1 }}>
            <CircularProgress sx={{ color: settings.primaryColor }} />
          </Box>
        ) : (
          <>
            {/* FIX APPLIED HERE: minHeight prevents the table from shrinking/jumping */}
            <TableContainer sx={{ minHeight: 600 }}>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: alpha(settings.primaryColor, 0.05),
                      borderBottom: `2px solid ${settings.primaryColor}`,
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: settings.textPrimaryColor,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Formula Key
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: settings.textPrimaryColor,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Description
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: settings.textPrimaryColor,
                        fontSize: '0.95rem',
                        py: 2,
                      }}
                    >
                      Logic Preview
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: settings.textPrimaryColor,
                        fontSize: '0.95rem',
                        py: 2,
                        textAlign: 'center',
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedFormulas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <CalculateIcon
                            sx={{
                              fontSize: 48,
                              color: alpha(settings.textPrimaryColor, 0.2),
                              mb: 1,
                            }}
                          />
                          <Typography
                            variant="h6"
                            sx={{
                              color: settings.textPrimaryColor,
                              opacity: 0.6,
                            }}
                          >
                            {searchTerm
                              ? 'No formulas match your search'
                              : 'No formulas configured yet'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedFormulas.map((formula) => (
                      <TableRow
                        key={formula.id}
                        hover
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            color: settings.primaryColor,
                            fontFamily: 'monospace',
                            fontSize: '1rem',
                          }}
                        >
                          {formula.formula_key}
                        </TableCell>
                        <TableCell
                          sx={{ color: settings.textPrimaryColor, maxWidth: 250 }}
                        >
                          {formula.description || (
                            <span
                              style={{
                                color: alpha(settings.textPrimaryColor, 0.4),
                                fontStyle: 'italic',
                              }}
                            >
                              No description
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              bgcolor: alpha(settings.primaryColor, 0.05),
                              px: 2,
                              py: 1,
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              color: settings.textPrimaryColor,
                              maxWidth: 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              border: `1px dashed ${alpha(
                                settings.primaryColor,
                                0.3
                              )}`,
                            }}
                            title={formatFormulaForDisplay(
                              formula.formula_expression
                            )}
                          >
                            {formatFormulaForDisplay(formula.formula_expression)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              justifyContent: 'center',
                            }}
                          >
                            <Tooltip title="Edit Formula" arrow>
                              <IconButton
                                onClick={() => handleEdit(formula)}
                                sx={{
                                  color: settings.primaryColor,
                                  bgcolor: alpha(settings.primaryColor, 0.05),
                                  '&:hover': {
                                    bgcolor: alpha(settings.primaryColor, 0.15),
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Formula" arrow>
                              <IconButton
                                onClick={() =>
                                  handleDelete(formula.formula_key)
                                }
                                sx={{
                                  color: '#d32f2f',
                                  bgcolor: alpha('#d32f2f', 0.05),
                                  '&:hover': { bgcolor: alpha('#d32f2f', 0.15) },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredFormulas.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{
                borderTop: `1px solid ${alpha(settings.primaryColor, 0.1)}`,
              }}
            />
          </>
        )}
      </Paper>

      {/* Enhanced Modal - Split Pane Design */}
      <Dialog
        open={showModal}
        onClose={() => !loading && setShowModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: '90vh',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Modal Header */}
        <DialogTitle
          sx={{
            bgcolor: settings.primaryColor,
            color: settings.accentColor,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
            px: 3,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: alpha('#fff', 0.2),
                color: 'inherit',
              }}
            >
              <CalculateIcon fontSize="small" />
            </Avatar>
            <span>
              {editingFormula ? 'Edit Calculation Logic' : 'Create New Formula'}
            </span>
          </Box>
          <IconButton
            onClick={() => setShowModal(false)}
            sx={{ color: 'inherit' }}
            disabled={loading}
          >
            <CancelIcon />
          </IconButton>
        </DialogTitle>

        {/* Modal Content - Grid Layout */}
        <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
          <Grid container sx={{ height: '100%' }}>
            {/* LEFT COLUMN: TOOLBOX */}
            <Grid
              item
              xs={12}
              md={4}
              sx={{
                bgcolor: alpha(settings.primaryColor, 0.03),
                borderRight: `1px solid ${alpha(settings.primaryColor, 0.1)}`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              {/* Toolbox Tabs */}
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: '#fff',
                }}
              >
                <Tabs
                  value={modalTabValue}
                  onChange={(e, newVal) => setModalTabValue(newVal)}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  <Tab label="Fields" />
                  <Tab label="Operators" />
                </Tabs>
              </Box>

              {/* Toolbox Content */}
              <Box sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {modalTabValue === 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Category Filters */}
                    <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #eee' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                        FILTER BY CATEGORY
                      </Typography>
                      <ToggleButtonGroup
                        value={selectedCategory}
                        exclusive
                        onChange={(e, value) => value && setSelectedCategory(value)}
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.5,
                        }}
                      >
                        {categories.map((cat) => (
                          <ToggleButton
                            key={cat}
                            value={cat}
                            size="small"
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.7rem',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              border: '1px solid rgba(0,0,0,0.12)',
                              '&.Mui-selected': {
                                bgcolor: settings.primaryColor,
                                color: '#fff',
                                borderColor: settings.primaryColor,
                              },
                            }}
                          >
                            {cat}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Box>

                    {/* Fields List - Scrollable */}
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                      <List sx={{ p: 0 }}>
                        {filteredFields.map((field) => (
                          <ListItemButton
                            key={field.value}
                            onClick={() => insertIntoFormula(field.value)}
                            sx={{
                              py: 1.5,
                              px: 2,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': { borderBottom: 'none' },
                              '&:hover': {
                                bgcolor: alpha(settings.primaryColor, 0.08),
                              },
                            }}
                            title={`Insert: ${field.value}`}
                          >
                            <ListItemText
                              primary={field.label}
                              secondary={field.category}
                              primaryTypographyProps={{
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: 'text.primary',
                              }}
                              secondaryTypographyProps={{
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            />
                            <ArrowForwardIosIcon
                              sx={{ fontSize: 14, color: 'text.disabled', opacity: 0.5 }}
                            />
                          </ListItemButton>
                        ))}
                        {filteredFields.length === 0 && (
                          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                            No fields found in this category.
                          </Box>
                        )}
                      </List>
                    </Box>
                  </Box>
                )}

                {modalTabValue === 1 && (
                  <Box sx={{ p: 2, overflowY: 'auto' }}>
                    {/* Math Operators */}
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}
                    >
                      Basic Math
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      {OPERATORS.map((op) => (
                        <OperatorButton key={op.value} op={op} />
                      ))}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Functions */}
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 'bold', mb: 1.5 }}
                    >
                      Rounding Functions
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                      {FUNCTIONS.map((func) => (
                        <FunctionChip key={func.value} func={func} />
                      ))}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Percentages */}
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 'bold', mb: 1.5 }}
                    >
                      Common Rates
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {PERCENTAGES.map((pct) => (
                        <PercentageChip key={pct.value} pct={pct} />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* RIGHT COLUMN: WORKSPACE */}
            <Grid
              item
              xs={12}
              md={8}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                bgcolor: '#fff',
              }}
            >
              {/* Metadata Section */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Formula Name (Key)"
                  value={formulaName}
                  onChange={(e) => setFormulaName(e.target.value)}
                  disabled={!!editingFormula}
                  placeholder="e.g., grossSalary"
                  helperText="Unique identifier for the system"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { fontWeight: 500, fontFamily: 'monospace' },
                  }}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={formulaDescription}
                  onChange={(e) => setFormulaDescription(e.target.value)}
                  placeholder="Describe what this formula calculates..."
                  multiline
                  rows={2}
                />
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Editor Section */}
              <Box sx={{ mt: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 'bold', color: 'text.secondary' }}
                  >
                    FORMULA EDITOR
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<BackspaceIcon />}
                      onClick={handleBackspace}
                      color="secondary"
                    >
                      Backspace
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ClearIcon />}
                      onClick={() => setFormulaInput('')}
                      color="error"
                    >
                      Clear
                    </Button>
                  </Box>
                </Box>

                {/* Code-like Input */}
                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={10}
                  value={formulaInput}
                  onChange={(e) => setFormulaInput(e.target.value)}
                  placeholder="Start typing or click items from the left..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"Fira Code", "Roboto Mono", monospace',
                      fontSize: '1rem',
                      lineHeight: 1.6,
                      bgcolor: alpha('#000', 0.02),
                      alignItems: 'flex-start',
                    },
                    mb: 2,
                  }}
                  InputProps={{
                    sx: { borderRadius: 2 },
                  }}
                />

                {/* Visual Preview Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: alpha(settings.secondaryColor, 0.05),
                    border: `1px solid ${alpha(settings.secondaryColor, 0.2)}`,
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      display: 'block',
                      mb: 1,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Human Readable Preview
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'sans-serif',
                      color: settings.textPrimaryColor,
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      wordBreak: 'break-word',
                    }}
                  >
                    {formulaInput ? (
                      formulaInput
                        .replace(/\+/g, ' + ')
                        .replace(/-/g, ' - ')
                        .replace(/\*/g, ' × ')
                        .replace(/\//g, ' ÷ ')
                    ) : (
                      <span style={{ opacity: 0.5, fontStyle: 'italic' }}>
                        No logic entered yet...
                      </span>
                    )}
                  </Typography>
                </Paper>
              </Box>

              {/* Verification Warning */}
              {editingFormula && hasChanged && (
                <Box
                  sx={{
                    mt: 'auto',
                    p: 2,
                    bgcolor: '#fff3cd',
                    borderRadius: 2,
                    border: '1px solid #ffc107',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Checkbox
                    checked={verificationChecked}
                    onChange={(e) => setVerificationChecked(e.target.checked)}
                    sx={{ color: '#856404', '&.Mui-checked': { color: '#856404' } }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: '#856404' }}
                  >
                    I confirm this modification is correct and I want to update the
                    existing formula.
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        {/* Modal Footer */}
        <DialogActions
          sx={{
            p: 2,
            bgcolor: alpha(settings.primaryColor, 0.03),
            borderTop: `1px solid ${alpha(settings.primaryColor, 0.1)}`,
          }}
        >
          <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
          <Button
            onClick={() => setShowModal(false)}
            disabled={loading}
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              mr: 1,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              loading ||
              !formulaName ||
              !formulaDescription ||
              !formulaInput ||
              (editingFormula && hasChanged && !verificationChecked)
            }
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{
              bgcolor: settings.primaryColor,
              color: settings.accentColor,
              fontWeight: 700,
              px: 4,
              py: 1,
              '&:hover': { bgcolor: settings.secondaryColor },
              '&:disabled': {
                bgcolor: alpha(settings.textPrimaryColor, 0.2),
                color: alpha(settings.textPrimaryColor, 0.5),
              },
            }}
          >
            {loading ? 'Saving...' : 'Save Formula'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollFormulas;