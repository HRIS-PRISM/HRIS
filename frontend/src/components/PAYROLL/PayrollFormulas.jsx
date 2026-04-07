import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress,
  Dialog, IconButton, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Checkbox,
  Divider, alpha, Grid, Tabs, Tab, InputAdornment, List,
  ListItemButton, ListItemText, Card, Fade,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Calculate as CalculateIcon, Edit as EditIcon, Delete as DeleteIcon,
  Add as AddIcon, Refresh as RefreshIcon, Save as SaveIcon,
  Cancel as CancelIcon, Search as SearchIcon, Clear as ClearIcon,
  Backspace as BackspaceIcon, ArrowForwardIos as ArrowForwardIosIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

const T = {
  accent:       '#6d2323',
  accentDark:   '#5a1d1d',
  accentMid:    '#8B4545',
  accentFaint:  'rgba(109,35,35,0.06)',
  accentBorder: 'rgba(109,35,35,0.14)',
  accentHover:  'rgba(109,35,35,0.10)',
  headerGrad:   'linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)',
  rowEven:      '#ffffff',
  rowOdd:       'rgba(109,35,35,0.025)',
  rowHover:     'rgba(109,35,35,0.055)',
  text:         '#1a1a1a',
  muted:        '#6b6b6b',
  faint:        '#a0a0a0',
  surface:      '#ffffff',
  divider:      'rgba(0,0,0,0.08)',
};

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)',
  border: '0.5px solid rgba(0,0,0,0.09)',
  overflow: 'hidden',
  background: '#ffffff',
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '0.01em',
  transition: 'all 0.18s ease',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(0)' },
});

const FieldInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    fontSize: '0.875rem',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: T.accentBorder },
    '&:hover fieldset': { borderColor: T.accent },
    '&.Mui-focused fieldset': { borderColor: T.accent, borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.accent },
});

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em',
      textTransform: 'uppercase', color: alpha(T.accent, 0.45),
    }}>
      {children}
    </Typography>
  </Box>
);

const PAYROLL_FIELDS = [
  { value: 'rateNbc584',             label: 'Basic Rate (NBC 584)',               category: 'Salary'     },
  { value: 'rateNbc594',             label: 'Basic Rate (NBC 594)',               category: 'Salary'     },
  { value: 'nbc594',                 label: 'NBC 594',                            category: 'Salary'     },
  { value: 'nbcDiffl597',            label: 'NBC Adjustment',                     category: 'Salary'     },
  { value: 'increment',              label: 'Salary Increment',                   category: 'Salary'     },
  { value: 'h',                      label: 'Hours Worked',                       category: 'Time'       },
  { value: 'm',                      label: 'Minutes Worked',                     category: 'Time'       },
  { value: 's',                      label: 'Seconds Worked',                     category: 'Time'       },
  { value: 'gsisSalaryLoan',         label: 'GSIS Salary Loan',                   category: 'Loans'      },
  { value: 'gsisPolicyLoan',         label: 'GSIS Policy Loan',                   category: 'Loans'      },
  { value: 'gsisArrears',            label: 'GSIS Arrears',                       category: 'Loans'      },
  { value: 'cpl',                    label: 'CPL',                                category: 'Loans'      },
  { value: 'mpl',                    label: 'MPL',                                category: 'Loans'      },
  { value: 'eal',                    label: 'EAL',                                category: 'Loans'      },
  { value: 'mplLite',                label: 'MPL Lite',                           category: 'Loans'      },
  { value: 'emergencyLoan',          label: 'Emergency Loan',                     category: 'Loans'      },
  { value: 'pagibigFundCont',        label: 'Pag-IBIG Contribution',              category: 'Government' },
  { value: 'pagibig2',               label: 'Pag-IBIG 2',                         category: 'Government' },
  { value: 'multiPurpLoan',          label: 'Multi-Purpose Loan',                 category: 'Loans'      },
  { value: 'liquidatingCash',        label: 'Liquidating Cash',                   category: 'Other'      },
  { value: 'landbankSalaryLoan',     label: 'Landbank Salary Loan',               category: 'Loans'      },
  { value: 'earistCreditCoop',       label: 'EARIST Credit Coop',                 category: 'Other'      },
  { value: 'feu',                    label: 'FEU',                                category: 'Other'      },
  { value: 'withholdingTax',         label: 'Withholding Tax',                    category: 'Government' },
  { value: 'PhilHealthContribution', label: 'PhilHealth',                         category: 'Government' },
  { value: 'ec',                     label: 'EC',                                 category: 'Other'      },
];

const CALCULATED_FIELDS = [
  { value: 'grossSalary',        label: 'Gross Salary',                       category: 'Calculated' },
  { value: 'abs',                label: 'Absence Deductions',                 category: 'Calculated' },
  { value: 'netSalary',          label: 'Net Salary',                         category: 'Calculated' },
  { value: 'personalLifeRetIns', label: 'Personal Life Retirement Insurance', category: 'Calculated' },
  { value: 'totalGsisDeds',      label: 'Total GSIS Deductions',              category: 'Calculated' },
  { value: 'totalPagibigDeds',   label: 'Total Pag-IBIG Deductions',          category: 'Calculated' },
  { value: 'totalOtherDeds',     label: 'Total Other Deductions',             category: 'Calculated' },
  { value: 'totalDeductions',    label: 'Total Deductions',                   category: 'Calculated' },
];

const OPERATORS = [
  { value: '+', label: 'Add',               symbol: '+' },
  { value: '-', label: 'Subtract',          symbol: '−' },
  { value: '*', label: 'Multiply',          symbol: '×' },
  { value: '/', label: 'Divide',            symbol: '÷' },
  { value: '(', label: 'Open Parenthesis',  symbol: '(' },
  { value: ')', label: 'Close Parenthesis', symbol: ')' },
];

const FUNCTIONS = [
  { value: 'Math.floor', label: 'Round Down', description: '3.7 → 3' },
  { value: 'Math.ceil',  label: 'Round Up',   description: '3.2 → 4' },
  { value: 'Math.round', label: 'Round',      description: '3.5 → 4' },
];

const PERCENTAGES = [
  { label: '5%',  value: '0.05' },
  { label: '9%',  value: '0.09' },
  { label: '12%', value: '0.12' },
];

const CATEGORIES = ['All', 'Salary', 'Time', 'Loans', 'Government', 'Calculated', 'Other'];

const scrollSx = {
  overflowY: 'auto',
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: T.accentBorder, borderRadius: 2 },
};

const PayrollFormulas = () => {
  const [formulas,            setFormulas]            = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [showModal,           setShowModal]           = useState(false);
  const [editingFormula,      setEditingFormula]      = useState(null);
  const [formulaName,         setFormulaName]         = useState('');
  const [formulaDescription,  setFormulaDescription]  = useState('');
  const [formulaInput,        setFormulaInput]        = useState('');
  const [searchTerm,          setSearchTerm]          = useState('');
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [modalTabValue,       setModalTabValue]       = useState(0);
  const [selectedCategory,    setSelectedCategory]    = useState('All');
  const [originalFormula,     setOriginalFormula]     = useState('');
  const [originalDescription, setOriginalDescription] = useState('');

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  useEffect(() => { fetchFormulas(); }, []);

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/payroll-formulas`, getAuthHeaders());
      setFormulas(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { fetchFormulas(); });

  const formatForDisplay = (formula) => {
    if (!formula) return '';
    return formula
      .replace(/parseFloat\s*\(/g, '')
      .replace(/parseFloat\(item\.(\w+)\s*\|\|\s*0\)/g, '$1')
      .replace(/parseFloat\((\w+)\s*\|\|\s*0\)/g, '$1')
      .replace(/parseFloat\(([^)]+)\)/g, '$1')
      .replace(/item\.(\w+)/g, '$1')
      .replace(/\s*\|\|\s*0/g, '')
      .replace(/Math\.floor/g, 'Round Down')
      .replace(/Math\.ceil/g,  'Round Up')
      .replace(/Math\.round/g, 'Round')
      .replace(/\?[^:]*:/g, '').replace(/\?/g, '').replace(/:/g, '')
      .replace(/\((\w+)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/\s*\+\s*/g, ' + ').replace(/\s*-\s*/g, ' - ')
      .replace(/\s*\*\s*/g, ' * ').replace(/\s*\/\s*/g, ' / ')
      .trim();
  };

  const openEdit = (formula) => {
    setEditingFormula(formula);
    setFormulaName(formula.formula_key);
    setFormulaDescription(formula.description || '');
    const simple = formatForDisplay(formula.formula_expression);
    setFormulaInput(simple);
    setOriginalFormula(simple);
    setOriginalDescription(formula.description || '');
    setVerificationChecked(false);
    setSelectedCategory('All');
    setModalTabValue(0);
    setShowModal(true);
  };

  const openCreate = () => {
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
      const expr = formulaInput.trim();
      if (editingFormula) {
        await axios.put(
          `${API_BASE_URL}/api/payroll-formulas/${formulaName}`,
          { formula_expression: expr, description: formulaDescription },
          getAuthHeaders(),
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/payroll-formulas`,
          { formula_key: formulaName, formula_expression: expr, description: formulaDescription },
          getAuthHeaders(),
        );
      }
      await fetchFormulas();
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.error || 'Error saving formula');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`Delete "${key}"?`)) return;
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/api/payroll-formulas/${key}`, getAuthHeaders());
      await fetchFormulas();
    } catch {
      alert('Error deleting formula');
    } finally {
      setLoading(false);
    }
  };

  const insert = (text) =>
    setFormulaInput((p) => (p.trim() ? `${p.trim()} ${text}` : text));

  const hasChanged =
    editingFormula &&
    (formulaInput !== originalFormula || formulaDescription !== originalDescription);

  const canSave =
    !loading && formulaName && formulaDescription && formulaInput &&
    !(editingFormula && hasChanged && !verificationChecked);

  const allFields      = [...PAYROLL_FIELDS, ...CALCULATED_FIELDS];
  const filteredFields = selectedCategory === 'All'
    ? allFields
    : allFields.filter((f) => f.category === selectedCategory);

  const filteredFormulas = formulas.filter(
    (f) =>
      f.formula_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: '100vw',
          maxWidth: '100%',
          position: 'relative',
          left: '63%',
          transform: 'translateX(-61%)',
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4, py: 2.5,
              background: 'linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.1) 0%,transparent 70%)' }} />
            <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
              <CalculateIcon sx={{ fontSize: 28, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.2 }}>
                  Payroll Formula Management                
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                  Configuration Panel • Manage payroll computation logic
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: '0.78rem', color: T.accent, fontWeight: 700 }}>
                  {formulas.length} {formulas.length === 1 ? 'formula' : 'formulas'}
                </Typography>
              </Box>
              <AccentButton
                onClick={fetchFormulas} disabled={loading} variant="outlined"
                startIcon={<RefreshIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ fontSize: '0.78rem', height: 32, borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}
              >
                Refresh
              </AccentButton>
              <AccentButton
                onClick={openCreate} variant="contained"
                startIcon={<AddIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ fontSize: '0.78rem', height: 32, bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark } }}
              >
                New Formula
              </AccentButton>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Table Card ── */}
        <SectionCard sx={{ height: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}>

          {/* Toolbar */}
          <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <CalculateIcon sx={{ fontSize: 14, color: T.accent }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent }}>
              Formula Records
            </Typography>
            <Box sx={{ flex: 1 }} />
            <FieldInput
              size="small"
              placeholder="Search by name or description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ maxWidth: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 14, color: T.muted }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.8rem', height: 34 },
              }}
            />
          </Box>

          {/* Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, flex: 1 }}>
              <CircularProgress sx={{ color: T.accent }} size={28} />
            </Box>
          ) : (
            <Box sx={{ flex: 1, ...scrollSx }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: alpha(T.accent, 0.04), borderBottom: `2px solid ${T.accent}` } }}>
                    {['Formula Key', 'Description', 'Logic Preview', 'Actions'].map((col, i) => (
                      <TableCell
                        key={col}
                        align={i === 3 ? 'center' : 'left'}
                        sx={{ fontWeight: 700, color: T.text, fontSize: '0.7rem', py: 1.25, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFormulas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 10, border: 0 }}>
                        <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: T.accentFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                          <CalculateIcon sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: T.muted, mb: 0.5 }}>
                          {searchTerm ? 'No formulas match your search' : 'No formulas configured yet'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: T.faint }}>
                          {searchTerm ? 'Try a different search term.' : 'Click "New Formula" to get started.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFormulas.map((formula, idx) => (
                      <TableRow
                        key={formula.id}
                        sx={{
                          bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                          '&:hover': { bgcolor: T.rowHover },
                          transition: 'background 0.13s ease',
                          '&:last-child td': { border: 0 },
                        }}
                      >
                        <TableCell sx={{ py: 1.1, whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: 1.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: T.accent }}>
                              {formula.formula_key}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ py: 1.1, color: T.muted, fontSize: '0.8rem', maxWidth: 220 }}>
                          {formula.description || (
                            <Typography component="span" sx={{ color: T.faint, fontStyle: 'italic', fontSize: '0.75rem' }}>
                              No description
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ py: 1.1, maxWidth: 380 }}>
                          <Box
                            title={formatForDisplay(formula.formula_expression)}
                            sx={{
                              px: 1.25, py: 0.5, borderRadius: 1.5,
                              bgcolor: alpha(T.accent, 0.03),
                              border: `1px dashed ${T.accentBorder}`,
                              fontFamily: 'monospace', fontSize: '0.75rem',
                              color: T.text, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {formatForDisplay(formula.formula_expression)}
                          </Box>
                        </TableCell>

                        <TableCell align="center" sx={{ py: 1.1, whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Edit" arrow>
                              <IconButton
                                onClick={() => openEdit(formula)} size="small"
                                sx={{ color: T.accent, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: 1.5, p: 0.5, '&:hover': { bgcolor: T.accentHover } }}
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" arrow>
                              <IconButton
                                onClick={() => handleDelete(formula.formula_key)} size="small"
                                sx={{ color: '#c62828', bgcolor: 'rgba(198,40,40,0.05)', border: '1px solid rgba(198,40,40,0.15)', borderRadius: 1.5, p: 0.5, '&:hover': { bgcolor: 'rgba(198,40,40,0.1)' } }}
                              >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </SectionCard>

        {/* ── Formula Modal ── */}
        <Dialog
          open={showModal}
          onClose={() => !loading && setShowModal(false)}
          maxWidth="lg" fullWidth
          PaperProps={{
            sx: { borderRadius: 3, height: '90vh', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
          }}
        >
          {/* Modal header */}
          <Box
            sx={{
              px: 3.5, py: 2,
              background: T.headerGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden', flexShrink: 0,
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalculateIcon sx={{ fontSize: 17, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.93rem', lineHeight: 1.2, mb: 0.2 }}>
                  {editingFormula ? 'Edit Calculation Logic' : 'Create New Formula'}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>
                  {editingFormula ? `Editing: ${editingFormula.formula_key}` : 'Define a new payroll computation rule'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setShowModal(false)} disabled={loading} size="small"
              sx={{ color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            >
              <CancelIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>

          {/* Modal body */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <Grid container sx={{ height: '100%' }}>

              {/* LEFT — Toolbox */}
              <Grid item xs={12} md={4} sx={{ bgcolor: alpha(T.accent, 0.02), borderRight: `1px solid ${T.divider}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ borderBottom: `1px solid ${T.divider}`, bgcolor: '#fff', flexShrink: 0 }}>
                  <Tabs
                    value={modalTabValue}
                    onChange={(_, v) => setModalTabValue(v)}
                    variant="fullWidth"
                    sx={{
                      minHeight: 40,
                      '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', minHeight: 40 },
                      '& .Mui-selected': { color: `${T.accent} !important` },
                      '& .MuiTabs-indicator': { bgcolor: T.accent },
                    }}
                  >
                    <Tab label="Fields" />
                    <Tab label="Operators" />
                  </Tabs>
                </Box>

                {modalTabValue === 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <Box sx={{ p: 1.5, bgcolor: '#fff', borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45), mb: 0.75 }}>
                        Filter by Category
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {CATEGORIES.map((cat) => (
                          <Box
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            sx={{
                              px: 1, py: 0.2, borderRadius: 1.5, cursor: 'pointer',
                              fontSize: '0.68rem', fontWeight: 600,
                              bgcolor: selectedCategory === cat ? T.accent : 'transparent',
                              color: selectedCategory === cat ? '#fff' : T.accent,
                              border: `1px solid ${selectedCategory === cat ? T.accent : T.accentBorder}`,
                              transition: 'all 0.15s',
                              '&:hover': { bgcolor: selectedCategory === cat ? T.accentDark : T.accentHover },
                            }}
                          >
                            {cat}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, ...scrollSx }}>
                      <List sx={{ p: 0 }} dense>
                        {filteredFields.map((field) => (
                          <ListItemButton
                            key={field.value}
                            onClick={() => insert(field.value)}
                            sx={{
                              py: 0.9, px: 2,
                              borderBottom: `1px solid ${T.divider}`,
                              '&:last-child': { borderBottom: 'none' },
                              '&:hover': { bgcolor: T.accentFaint },
                            }}
                          >
                            <ListItemText
                              primary={field.label}
                              secondary={field.category}
                              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.82rem', color: T.text }}
                              secondaryTypographyProps={{ fontSize: '0.65rem', color: T.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}
                            />
                            <ArrowForwardIosIcon sx={{ fontSize: 10, color: T.faint }} />
                          </ListItemButton>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}

                {modalTabValue === 1 && (
                  <Box sx={{ p: 2, flex: 1, ...scrollSx }}>
                    <FormSectionLabel icon={FunctionsIcon}>Basic Math</FormSectionLabel>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75, mb: 2.5 }}>
                      {OPERATORS.map((op) => (
                        <AccentButton
                          key={op.value}
                          onClick={() => insert(op.value)}
                          variant="contained"
                          sx={{ height: 40, minWidth: 0, bgcolor: T.accent, color: '#fff', fontWeight: 800, fontSize: '1.05rem', boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`, '&:hover': { bgcolor: T.accentDark } }}
                          title={op.label}
                        >
                          {op.symbol}
                        </AccentButton>
                      ))}
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: T.divider }} />

                    <FormSectionLabel icon={FunctionsIcon}>Rounding Functions</FormSectionLabel>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
                      {FUNCTIONS.map((func) => (
                        <Tooltip key={func.value} title={func.description} arrow>
                          <AccentButton
                            size="small" variant="outlined"
                            onClick={() => insert(`${func.value}(`)}
                            sx={{ fontSize: '0.75rem', borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}
                          >
                            {func.label}
                          </AccentButton>
                        </Tooltip>
                      ))}
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: T.divider }} />

                    <FormSectionLabel icon={FunctionsIcon}>Common Rates</FormSectionLabel>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {PERCENTAGES.map((pct) => (
                        <AccentButton
                          key={pct.value} size="small" variant="outlined"
                          onClick={() => insert(`* ${pct.value}`)}
                          sx={{ fontSize: '0.75rem', borderColor: T.accentBorder, color: T.accent, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent } }}
                        >
                          {pct.label}
                        </AccentButton>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {/* RIGHT — Workspace */}
              <Grid
                item xs={12} md={8}
                sx={{ p: 3, display: 'flex', flexDirection: 'column', ...scrollSx, bgcolor: '#fff' }}
              >
                <FormSectionLabel icon={CalculateIcon}>Formula Identity</FormSectionLabel>
                <FieldInput
                  fullWidth label="Formula Key" size="small"
                  value={formulaName}
                  onChange={(e) => setFormulaName(e.target.value)}
                  disabled={!!editingFormula}
                  placeholder="e.g. grossSalary"
                  helperText="Unique identifier used by the system"
                  sx={{ mb: 1.5, '& .MuiInputBase-input': { fontFamily: 'monospace', fontWeight: 600 } }}
                />
                <FieldInput
                  fullWidth label="Description" size="small"
                  value={formulaDescription}
                  onChange={(e) => setFormulaDescription(e.target.value)}
                  placeholder="Describe what this formula calculates…"
                  multiline rows={2}
                  sx={{ mb: 2.5 }}
                />

                <Divider sx={{ mb: 2.5, borderColor: T.divider }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <FormSectionLabel icon={FunctionsIcon}>Formula Editor</FormSectionLabel>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <AccentButton
                      size="small" variant="outlined"
                      startIcon={<BackspaceIcon sx={{ fontSize: '12px !important' }} />}
                      onClick={() => setFormulaInput((p) => p.slice(0, -1).trimEnd())}
                      sx={{ fontSize: '0.7rem', height: 26, borderColor: T.accentBorder, color: T.muted, '&:hover': { borderColor: T.accent, color: T.accent, bgcolor: T.accentFaint } }}
                    >
                      Backspace
                    </AccentButton>
                    <AccentButton
                      size="small" variant="outlined"
                      startIcon={<ClearIcon sx={{ fontSize: '12px !important' }} />}
                      onClick={() => setFormulaInput('')}
                      sx={{ fontSize: '0.7rem', height: 26, borderColor: 'rgba(198,40,40,0.3)', color: '#c62828', '&:hover': { bgcolor: 'rgba(198,40,40,0.05)', borderColor: '#c62828' } }}
                    >
                      Clear
                    </AccentButton>
                  </Box>
                </Box>

                <FieldInput
                  fullWidth multiline minRows={5} maxRows={9}
                  value={formulaInput}
                  onChange={(e) => setFormulaInput(e.target.value)}
                  placeholder="Start typing or click fields from the left panel…"
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"Fira Code","Roboto Mono",monospace',
                      fontSize: '0.9rem', lineHeight: 1.6,
                      bgcolor: alpha(T.accent, 0.015),
                      alignItems: 'flex-start',
                    },
                  }}
                />

                <Box sx={{ p: 2, borderRadius: 2, mb: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: alpha(T.accent, 0.45), mb: 0.75 }}>
                    Human Readable Preview
                  </Typography>
                  <Typography sx={{ fontFamily: 'sans-serif', color: T.text, fontSize: '0.95rem', fontWeight: 500, wordBreak: 'break-word' }}>
                    {formulaInput
                      ? formulaInput.replace(/\+/g, ' + ').replace(/-/g, ' - ').replace(/\*/g, ' × ').replace(/\//g, ' ÷ ')
                      : <Box component="span" sx={{ opacity: 0.4, fontStyle: 'italic' }}>No logic entered yet…</Box>
                    }
                  </Typography>
                </Box>

                {editingFormula && hasChanged && (
                  <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: '#fff8e1', border: '1px solid rgba(255,160,0,0.4)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Checkbox
                      checked={verificationChecked}
                      onChange={(e) => setVerificationChecked(e.target.checked)}
                      size="small"
                      sx={{ color: '#e65100', '&.Mui-checked': { color: '#e65100' }, p: 0 }}
                    />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#e65100', lineHeight: 1.5 }}>
                      I confirm this modification is correct and want to update the existing formula.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Modal footer */}
          <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: 'flex', justifyContent: 'flex-end', gap: 1.25, flexShrink: 0 }}>
            <AccentButton
              onClick={() => setShowModal(false)} disabled={loading} variant="outlined"
              sx={{ fontSize: '0.78rem', height: 34, borderColor: T.accentBorder, color: T.muted, '&:hover': { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
            >
              Cancel
            </AccentButton>
            <AccentButton
              onClick={handleSave} disabled={!canSave} variant="contained"
              startIcon={loading ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <SaveIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '0.78rem', height: 34, px: 2.5, bgcolor: T.accent, color: '#fff', boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, '&:hover': { bgcolor: T.accentDark }, '&:disabled': { bgcolor: '#ddd', color: '#aaa', boxShadow: 'none', transform: 'none' } }}
            >
              {loading ? 'Saving…' : 'Save Formula'}
            </AccentButton>
          </Box>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default PayrollFormulas;