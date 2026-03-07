import API_BASE_URL from '../../apiConfig';
import { jwtDecode } from 'jwt-decode';
import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Dialog } from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import WorkIcon from '@mui/icons-material/Work';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import logo from '../../assets/logo.png';
import hrisLogo from '../../assets/hrisLogo.png';
import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import usePayrollRealtimeRefresh from '../../hooks/usePayrollRealtimeRefresh';

/* ─── Scoped CSS (matches 1st code exactly) ─────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

  .ps-wrap * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; }

  .ps-wrap {
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    min-height: 100vh;
    display: block;
    padding: 2rem 1rem;
    color: #1a1a1a;
  }

  .ps-container {
    width: 100%;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: stretch;
    margin: 0 auto;
  }

  /* Glass card — fixed size always, never shifts */
  .ps-glass {
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.8);
    border-radius: 24px;
    box-shadow: 0 10px 40px rgba(109,35,35,0.15);
    padding: 2rem;
    overflow: hidden;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
    min-height: 320px;
    height: auto;
  }

  /* Lock controls box height so layout never jumps */
  .ps-controls {
    border-top: 1px solid rgba(0,0,0,0.05);
    padding-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 220px;
  }

  .ps-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .ps-title-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ps-icon-box {
    color: white;
    padding: 12px;
    border-radius: 16px;
    font-size: 2rem;
    display: flex;
    align-items: center;
    box-shadow: 0 4px 12px rgba(109,35,35,0.3);
  }

  .ps-title { font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
  .ps-subtitle { font-size: 0.9rem; color: #6c757d; margin-top: 4px; }

  .ps-refresh-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    background: white;
    border: 1px solid;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s ease;
  }


  .ps-row { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-end; }

  .ps-input-group { display: flex; flex-direction: column; gap: 0.5rem; min-width: 200px; flex: 1; }

  .ps-label {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ps-input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid rgba(109,35,35,0.2);
    background: rgba(255,255,255,0.9);
    font-size: 0.95rem;
    font-weight: 500;
    font-family: 'Poppins', sans-serif;
    outline: none;
    transition: all 0.3s ease;
  }

  .ps-input:disabled {
    background: rgba(230,230,230,0.5);
    color: #6c757d;
    cursor: not-allowed;
    border-color: transparent;
  }

  .ps-select {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid rgba(109,35,35,0.2);
    background: rgba(255,255,255,0.9);
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'Poppins', sans-serif;
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236d2323' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 18px;
    transition: all 0.3s ease;
  }

  /* Month grid */
  .ps-month-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .ps-month-btn {
    background: rgba(255,255,255,0.6);
    border-radius: 8px;
    padding: 12px 0;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
  }

  .ps-month-btn:hover {
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  /* Payslip paper */
  .ps-paper-wrap { display: flex; justify-content: center; }

  .ps-paper {
    background: white;
    width: 100%;
    max-width: 900px;
    padding: 2.5rem;
    border: 2px solid #000;
    box-shadow: 0 20px 60px rgba(0,0,0,0.1);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .ps-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
  }

  .ps-slip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    border-bottom: 2px solid #000;
    padding-bottom: 1rem;
    position: relative;
    z-index: 1;
  }

  .ps-slip-header-center { text-align: center; }
  .ps-slip-header-center h2 { font-size: 0.9rem; font-style: italic; margin-bottom: 4px; }
  .ps-slip-header-center h1 { font-size: 1.1rem; font-weight: 800; text-transform: uppercase; line-height: 1.2; margin-bottom: 4px; }
  .ps-slip-header-center p  { font-size: 0.8rem; }

  .ps-logo { height: 60px; width: auto; }

  .ps-table { width: 100%; border: 2px solid black; border-bottom: none; position: relative; z-index: 1; }

  .ps-table-row { display: flex; border-bottom: 1px solid black; }

  .ps-table-label {
    width: 35%;
    padding: 10px 12px;
    font-weight: 700;
    font-size: 0.85rem;
    border-right: 1px solid black;
    color: #333;
  }

  .ps-table-value {
    flex: 1;
    padding: 10px 12px;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    text-align: right;
  }

  .ps-footer {
    margin-top: auto;
    padding-top: 2rem;
    position: relative;
    z-index: 1;
  }

  .ps-certified { font-size: 0.85rem; margin-bottom: 0.5rem; }
  .ps-signatory { font-weight: 800; text-decoration: underline; margin-bottom: 2px; font-size: 0.85rem; }
  .ps-signatory-role { font-size: 0.85rem; }

  /* Floating download FAB */
  .ps-fab-btn {
    position: fixed;
    bottom: 90px;
    right: 28px;
    z-index: 1200;
    color: white;
    border: none;
    padding: 14px 22px;
    border-radius: 50px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 8px 24px rgba(109,35,35,0.45);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    font-family: 'Poppins', sans-serif;
    white-space: nowrap;
  }

  .ps-fab-btn:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.04);
    box-shadow: 0 14px 30px rgba(109,35,35,0.5);
  }

  .ps-fab-btn:disabled {
    background: #6c757d !important;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .ps-fab-label { font-family: 'Poppins', sans-serif; font-size: 0.9rem; font-weight: 600; }

  /* Loading state */
  .ps-state-msg {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
    background: rgba(255,255,255,0.5);
    border-radius: 16px;
    border: 1px dashed;
  }

  @media (max-width: 480px) { .ps-month-grid { grid-template-columns: repeat(3, 1fr); } }
`;

const Payslip = forwardRef(({ employee }, ref) => {
  const payslipRef = ref || useRef();

  const [allPayroll,      setAllPayroll]      = useState([]);
  const [displayEmployee, setDisplayEmployee] = useState(employee || null);
  const [loading,         setLoading]         = useState(!employee);
  const [error,           setError]           = useState('');
  const [sending,         setSending]         = useState(false);
  const [modal,           setModal]           = useState({ open: false, type: 'success', message: '' });
  const [selectedMonth,   setSelectedMonth]   = useState(null);
  const [selectedYear,    setSelectedYear]    = useState(new Date().getFullYear());
  const [hasSearched,     setHasSearched]     = useState(false);
  const [personID,        setPersonID]        = useState('');

  const monthsShort = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const years = Array.from({ length: 2060 - 1990 + 1 }, (_, i) => 1990 + i);

  const { settings } = useSystemSettings();

  // System settings colors — matches doc 3 mapping exactly
  const primaryColor      = settings.accentColor      || '#FEF9E1'; // Cards color
  const secondaryColor    = settings.backgroundColor  || '#FFF8E7'; // Background
  const accent            = settings.primaryColor     || '#6d2323'; // Primary accent
  const dark              = settings.secondaryColor   || '#8B3333'; // Darker accent
  const textPrimaryColor  = settings.textPrimaryColor || '#6d2323';
  const textSecondaryColor= settings.textSecondaryColor || '#FEF9E1';
  const hoverColor        = settings.hoverColor       || '#6D2323';

  const { hasAccess, loading: accessLoading } = usePageAccess('payslip');

  // ── Auth ─────────────────────────────────────────────────────────────────
  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPayrollData = async () => {
    if (!personID) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
        getAuthHeaders()
      );
      setAllPayroll(res.data);
      setDisplayEmployee(null);
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setError('Failed to fetch payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  usePayrollRealtimeRefresh(() => { if (!employee) fetchPayrollData(); });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try { setPersonID(jwtDecode(token).employeeNumber); }
      catch (e) { console.error('Token decode error:', e); }
    }
  }, []);

  useEffect(() => { if (!employee) fetchPayrollData(); }, [employee, personID]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const handleMonthSelect = (idx) => {
    setSelectedMonth(idx);
    const result = allPayroll.filter((emp) => {
      if (!emp.startDate) return false;
      const d = new Date(emp.startDate);
      return (
        emp.employeeNumber?.toString() === personID.toString() &&
        d.getMonth()    === idx &&
        d.getFullYear() === selectedYear
      );
    });
    setDisplayEmployee(result.length > 0 ? result[0] : null);
    setHasSearched(true);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (selectedMonth !== null) {
      const result = allPayroll.filter((emp) => {
        if (!emp.startDate) return false;
        const d = new Date(emp.startDate);
        return (
          emp.employeeNumber?.toString() === personID.toString() &&
          d.getMonth()    === selectedMonth &&
          d.getFullYear() === year
        );
      });
      setDisplayEmployee(result.length > 0 ? result[0] : null);
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────────
  const fmt = (v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n !== 0
      ? `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : '—';
  };

  const fmtDays = (v) => {
    const h = Number(v);
    if (!isNaN(h) && h > 0) {
      const d = Math.floor(h / 8);
      const r = (h % 8).toFixed(1);
      return `${d} days${parseFloat(r) > 0 ? ` & ${r} hrs` : ''}`;
    }
    return '—';
  };

  const getPeriod = (s, e) => {
    if (!s || !e) return '—';
    const sd = new Date(s), ed = new Date(e);
    return `${sd.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${sd.getDate()}-${ed.getDate()} ${ed.getFullYear()}`;
  };

  const getSurname = (name) => {
    if (!name) return 'EARIST';
    const p = name.trim().split(' ');
    return p[p.length - 1] || 'EARIST';
  };

  const fmtFilename = (s) => {
    if (!s) return 'Unknown';
    const d = new Date(s);
    return `${d.toLocaleString('en-US', { month: 'long' })}_${d.getFullYear()}`;
  };

  // ── Build rows (same order as 1st code) ──────────────────────────────────
  const buildRows = (data) => {
    if (!data) return [];
    const isJO = (data.employmentCategory ?? -1) === 0;

    const base = [
      { label: 'PERIOD:',          value: getPeriod(data.startDate, data.endDate) },
      { label: 'EMPLOYEE NUMBER:', value: data.employeeNumber && parseFloat(data.employeeNumber) !== 0 ? `${parseFloat(data.employeeNumber)}` : '—' },
      { label: 'NAME:',            value: data.name || '—' },
      { label: 'GROSS SALARY:',    value: fmt(data.grossSalary) },
      { label: 'RENDERED DAYS:',   value: fmtDays(data.rh) },
    ];

    if (isJO) return [
      ...base,
      { label: 'SSS:',              value: fmt(data.sss) },
      { label: 'PAG-IBIG:',        value: fmt(data.pagibigFundCont) },
      { label: 'TOTAL DEDUCTIONS:', value: fmt(data.totalDeductions) },
      { label: 'NET SALARY:',       value: fmt(data.netSalary) },
    ];

    return [
      ...base,
      { label: 'ABS:',                 value: fmt(data.abs) },
      { label: 'WITHHOLDING TAX:',     value: fmt(data.withholdingTax) },
      { label: 'L.RET:',               value: fmt(data.personalLifeRetIns) },
      { label: 'GSIS SALARY LOAN:',    value: fmt(data.gsisSalaryLoan) },
      { label: 'POLICY LOAN:',         value: fmt(data.gsisPolicyLoan) },
      { label: 'HOUSING LOAN:',        value: fmt(data.gsisHousingLoan) },
      { label: 'GSIS ARREARS:',        value: fmt(data.gsisArrears) },
      { label: 'GFAL:',               value: fmt(data.gfal) },
      { label: 'CPL:',                value: fmt(data.cpl) },
      { label: 'MPL:',                value: fmt(data.mpl) },
      { label: 'MPL LITE:',           value: fmt(data.mplLite) },
      { label: 'ELA:',                value: fmt(data.ela) },
      { label: 'SSS:',                value: fmt(data.sss) },
      { label: 'PAG-IBIG:',           value: fmt(data.pagibigFundCont) },
      { label: 'PHILHEALTH:',         value: fmt(data.PhilHealthContribution) },
      { label: "PHILHEALTH (DIFF'L):", value: fmt(data.philhealthDiff) },
      { label: 'PAG-IBIG 2:',         value: fmt(data.pagibig2) },
      { label: 'LBP LOAN:',           value: fmt(data.lbpLoan) },
      { label: 'MTSLAI:',             value: fmt(data.mtslai) },
      { label: 'ECC:',                value: fmt(data.ecc) },
      { label: 'TO BE REFUNDED:',     value: fmt(data.toBeRefunded) },
      { label: 'FEU:',                value: fmt(data.feu) },
      { label: 'ESLAI:',              value: fmt(data.eslai) },
      { label: 'TOTAL DEDUCTIONS:',   value: fmt(data.totalDeductions) },
      { label: 'NET SALARY:',         value: fmt(data.netSalary) },
      { label: '1ST QUINCENA:',       value: fmt(data.pay1st) },
      { label: '2ND QUINCENA:',       value: fmt(data.pay2nd) },
    ];
  };

  // ── PDF Download (3-up landscape, same as 2nd code) ──────────────────────
  const downloadPDF = async () => {
    if (!displayEmployee) return;
    setSending(true);

    const currentStart = new Date(displayEmployee.startDate);
    const cm = currentStart.getMonth();
    const cy = currentStart.getFullYear();

    const monthsToGet = [0, 1, 2].map((i) => {
      const d = new Date(cy, cm - i, 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
    });

    const records = monthsToGet.map(({ month, year, label }) => ({
      label,
      payroll: allPayroll.find(
        (p) =>
          p.employeeNumber === displayEmployee.employeeNumber &&
          new Date(p.startDate).getMonth()    === month &&
          new Date(p.startDate).getFullYear() === year
      ),
    }));

    // A3 landscape = 420 x 297 mm — gives ~126mm per payslip column (vs 89mm on A4)
    const pdf = new jsPDF('l', 'mm', 'a3');
    const pw  = pdf.internal.pageSize.getWidth();
    const ph  = pdf.internal.pageSize.getHeight();
    const m = 8, g = 6;
    const sw = (pw - 2 * m - 2 * g) / 3;
    const sh = ph - 2 * m;
    const pos = [m, m + sw + g, m + 2 * sw + 2 * g];

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;top:0;width:1200px;background:#fff;';
    document.body.appendChild(wrap);

    for (let i = 0; i < records.length; i++) {
      const { payroll, label } = records[i];
      let imgData;

      if (payroll) {
        // Clone the visible payslip ref for capture
        setDisplayEmployee(payroll);
        await new Promise((r) => setTimeout(r, 300));
        const clone = payslipRef.current.cloneNode(true);
        clone.style.cssText = 'width:1200px;overflow:hidden;';
        wrap.innerHTML = '';
        wrap.appendChild(clone);
        const canvas = await html2canvas(clone, {
          scale: 2, useCORS: true,
          width: 1200, height: 2200,
          windowWidth: 1200, windowHeight: 2200,
          logging: false,
        });
        imgData = canvas.toDataURL('image/png');
      } else {
        const pc  = document.createElement('canvas');
        pc.width = 1200; pc.height = 2200;
        const ctx = pc.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1200, 2200);
        ctx.fillStyle = accent; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center';
        ctx.fillText('No Data', 600, 1050); ctx.font = '32px Arial';
        ctx.fillText(`for ${label}`, 600, 1120);
        imgData = pc.toDataURL('image/png');
      }

      pdf.addImage(imgData, 'PNG', pos[i], m, sw, sh);
    }

    document.body.removeChild(wrap);
    pdf.save(`${getSurname(displayEmployee.name)}_${fmtFilename(displayEmployee.startDate)}.pdf`);
    setDisplayEmployee(employee || (allPayroll.find(p => p.employeeNumber === displayEmployee.employeeNumber) || null));
    setSending(false);
    setModal({ open: true, type: 'success', action: 'download' });
  };

  // ── Access guards ─────────────────────────────────────────────────────────
  if (accessLoading) return (
    <Box display="flex" flexDirection="column" alignItems="center" py={8}>
      <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
      <span style={{ color: '#6d2323', fontFamily: 'Poppins,sans-serif', fontSize: '1.1rem' }}>
        Loading access information...
      </span>
    </Box>
  );

  if (!accessLoading && hasAccess !== true) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Payslip. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const rows = buildRows(displayEmployee);

  return (
    <>
      {/* Inject scoped CSS */}
      <style>{css}</style>

      <div className="ps-wrap" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
        <div className="ps-container">

          <LoadingOverlay open={loading} message="Please wait..." />

          {/* ══ GLASS CARD ════════════════════════════════════════════════ */}
          <div className="ps-glass" style={{ background: `rgba(255,255,255,0.75)`, border: `1px solid ${primaryColor}` }}>

            {/* Title + Refresh */}
            <div className="ps-header-row">
              <div className="ps-title-group">
                <div className="ps-icon-box" style={{ background: accent, color: textSecondaryColor }}>
                  <WorkIcon style={{ fontSize: '2rem' }} />
                </div>
                <div>
                  <h1 className="ps-title" style={{ color: accent }}>Employee Payslip Record</h1>
                  <p className="ps-subtitle">View and download employee payslip</p>
                </div>
              </div>

              <button
                className="ps-refresh-btn"
                style={{ color: accent, borderColor: accent, background: primaryColor }}
                onClick={() => window.location.reload()}
              >
                <Refresh style={{ fontSize: '1.1rem' }} /> Refresh
              </button>
            </div>

            {/* Controls */}
            <div className="ps-controls">

              {/* Employee Number + Year */}
              <div className="ps-row">
                <div className="ps-input-group">
                  <label className="ps-label" style={{ color: accent }}>Employee Number</label>
                  <input
                    className="ps-input"
                    type="text"
                    value={personID}
                    disabled
                    style={{ color: accent }}
                  />
                </div>

                <div className="ps-input-group">
                  <label className="ps-label" style={{ color: accent }}>Filter By Year</label>
                  <select
                    className="ps-select"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    style={{ color: accent }}
                  >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Month Grid */}
              <div className="ps-input-group">
                <label className="ps-label" style={{ color: accent }}>Filter By Month</label>
                <div className="ps-month-grid">
                  {monthsShort.map((m, idx) => (
                    <button
                      key={m}
                      className="ps-month-btn"
                      onClick={() => handleMonthSelect(idx)}
                      style={{
                        border: idx === selectedMonth
                          ? `1px solid ${accent}`
                          : '1px solid rgba(109,35,35,0.1)',
                        background: idx === selectedMonth ? accent : 'rgba(255,255,255,0.6)',
                        color: idx === selectedMonth ? '#fff' : accent,
                        boxShadow: idx === selectedMonth ? `0 4px 12px rgba(109,35,35,0.3)` : 'none',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
          {/* ══ END GLASS CARD ════════════════════════════════════════════ */}

          {error && (
            <div style={{ color: 'red', padding: '1rem', background: '#fff3f3', borderRadius: '8px', border: '1px solid red' }}>
              {error}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="ps-state-msg" style={{ borderColor: accent, display: 'block' }}>
              <CircularProgress sx={{ color: accent, mb: 1 }} size={36} />
              <p style={{ fontFamily: 'Poppins,sans-serif' }}>Fetching payroll records...</p>
            </div>
          )}

          {/* ══ PAYSLIP PAPER (exact 1st code layout) ═════════════════════ */}
          {!loading && !error && displayEmployee && (
            <div className="ps-paper-wrap">
              <div className="ps-paper" ref={payslipRef}>

                {/* Watermark */}
                <img src={hrisLogo} className="ps-watermark" alt="Watermark" />

                {/* Payslip Header */}
                <div className="ps-slip-header" style={{ background: `linear-gradient(to right, ${accent}, ${dark})`, borderBottom: `2px solid ${accent}` }}>
                  <img src={logo} className="ps-logo" alt="EARIST Logo" />
                  <div className="ps-slip-header-center" style={{ color: textSecondaryColor }}>
                    <h2>Republic of the Philippines</h2>
                    <h1>EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY</h1>
                    <p>Nagtahan, Sampaloc Manila</p>
                  </div>
                  <img src={hrisLogo} className="ps-logo" alt="HRIS Logo" />
                </div>

                {/* Data rows — single column, exactly as original */}
                <div className="ps-table">
                  {rows.map((row, idx) => (
                    <div className="ps-table-row" key={idx}>
                      <div className="ps-table-label" style={{ color: textPrimaryColor }}>{row.label}</div>
                      <div className="ps-table-value" style={{ color: '#1a1a1a' }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="ps-footer" style={{ textAlign: 'center' }}>
                  <p className="ps-certified">Certified Correct:</p>
                  <p className="ps-signatory">GIOVANNI L. AHUNIN</p>
                  <p className="ps-signatory-role">Director, Administrative Services</p>
                </div>

              </div>
            </div>
          )}

          {/* No data messages */}
          {!loading && !error && !displayEmployee && selectedMonth !== null && (
            <div className="ps-state-msg" style={{ borderColor: accent, background: primaryColor, display: 'block' }}>
              <p style={{ fontFamily: 'Poppins,sans-serif', color: accent }}>
                There's no payslip saved for the month of <b>{monthsShort[selectedMonth]}</b>.
              </p>
            </div>
          )}

          {!loading && !error && !displayEmployee && selectedMonth === null && hasSearched && (
            <div className="ps-state-msg" style={{ borderColor: accent, background: primaryColor, display: 'block' }}>
              <p style={{ fontFamily: 'Poppins,sans-serif', color: accent }}>
                Please select a month to view your payslip.
              </p>
            </div>
          )}

          {/* ══ DOWNLOAD BUTTON ═══════════════════════════════════════════ */}
          {!loading && displayEmployee && (
            <button
              className="ps-fab-btn"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, ${dark} 100%)`, color: textSecondaryColor }}
              onClick={downloadPDF}
              disabled={sending}
              title="Download Payslip PDF"
            >
              {sending
                ? <><CircularProgress size={20} sx={{ color: '#fff' }} /><span className="ps-fab-label">Processing...</span></>
                : <><Download style={{ fontSize: '1.4rem' }} /><span className="ps-fab-label">Download PDF</span></>
              }
            </button>
          )}

        </div>
      </div>

      {/* Dialog */}
      <Dialog open={modal.open} onClose={() => setModal({ ...modal, open: false })}>
        <SuccessfulOverlay
          open={modal.open && modal.type === 'success'}
          action={modal.action}
          onClose={() => setModal({ ...modal, open: false })}
        />
        {modal.type === 'error' && (
          <Box sx={{ color: 'red', p: 3 }}>{modal.message || 'An error occurred'}</Box>
        )}
      </Dialog>
    </>
  );
});

export default Payslip;