import React, { useState, useRef } from 'react';
import logo from './logo.png';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Box,
  Fab,
  Tooltip,
  Zoom,
  Snackbar,
  Alert,
} from '@mui/material';
import LoadingOverlay from '../LoadingOverlay';

/* ─────────────────────────────────────────────────────────────
   Constants
────────────────────────────────────────────────────────────── */
const FONT   = 'Arial, Helvetica, sans-serif';
const PAGE_W = '8.5in';
const PAGE_H = '13in';
const PAD    = '0.25in 0.3in';

/* ─────────────────────────────────────────────────────────────
   Style helpers
────────────────────────────────────────────────────────────── */
const cellBase   = { fontSize: '11px', padding: '3px 5px', fontFamily: FONT };
const clearCell  = { ...cellBase, border: '1px solid black' };
const noBorder   = { ...cellBase, border: '0px' };
const grayHeader = { ...cellBase, backgroundColor: 'lightgray', border: '1px solid black', fontWeight: 'bold' };
const divider    = { height: '2px', fontSize: '0%', backgroundColor: 'black', border: '0px', padding: 0 };

/* ─────────────────────────────────────────────────────────────
   Data
────────────────────────────────────────────────────────────── */
const subRows = [
  {
    section: '1', label: 'Administrative Services', items: [
      { letter: 'a.', name: 'Supply and Property Procurement and Management Services', officer: 'DR. HIROMI T. KIKUCHI' },
      { letter: 'b.', name: 'Human Resource Welfare & Assistance',                    officer: 'AMPARO M. MORALES'    },
      { letter: 'c.', name: 'Agency-accredited Union/Cooperative',                    officer: 'PERFITA NATAL'        },
    ],
  },
  {
    section: '2', label: 'Library', items: [
      { letter: 'a.', name: 'Legal Office Library', officer: ''               },
      { letter: 'b.', name: 'Library Services',     officer: 'CARINA ROMAQUIN' },
    ],
  },
  {
    section: '3', label: 'Finance and Assets Management', items: [
      { letter: 'a.', name: 'Financial Services',                         officer: 'DR. YOLANDA A. LARA' },
      { letter: 'b.', name: 'Transaction, Processing & Billing Services', officer: ''                    },
      { letter: 'c.', name: 'Payroll & Services',                         officer: ''                    },
    ],
  },
  {
    section: '4', label: 'Professional and Institutional Development', items: [
      { letter: 'a.', name: 'Scholarship Services', officer: '' },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   Print-style injection
────────────────────────────────────────────────────────────── */
const PRINT_STYLE_ID = 'clearance-print-style';
const injectPrintStyles = () => {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
@media print {
  @page { size: 8.5in 13in portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: white; }
  .clearance-floating-actions, .MuiSnackbar-root, .MuiBackdrop-root, .no-print {
    display: none !important;
  }
  .clearance-page {
    width: 8.5in !important;
    min-height: 13in !important;
    page-break-after: always;
    background: white !important;
    box-sizing: border-box !important;
  }
  .clearance-page:last-child { page-break-after: auto; }
  table { width: 100% !important; border-collapse: collapse !important; }
  tr { page-break-inside: avoid !important; }
}
`;
  document.head.appendChild(style);
};

/* ─────────────────────────────────────────────────────────────
   FRONT page content
────────────────────────────────────────────────────────────── */
const FrontPage = () => (
  <div
    className="clearance-page"
    style={{
      width: PAGE_W,
      minHeight: PAGE_H,
      padding: PAD,
      fontFamily: FONT,
      fontSize: '11px',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
    }}
  >
    {/* CS Form label */}
    <div style={{ fontSize: '10px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '6px' }}>
      CS Form No. 7<br />Revised 2018
    </div>

    {/* Header */}
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '18px',
      marginBottom: '6px',
      marginLeft: '-1.1in',
    }}>
      <img src={logo} alt="Logo" style={{ height: '90px', width: 'auto' }} />
      <div style={{ textAlign: 'center', lineHeight: '1.6' }}>
        <div style={{ fontSize: '12px' }}>Republic of the Philippines</div>
        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
        <div style={{ fontSize: '12px' }}>Nagtahan, Sampaloc, Manila</div>
      </div>
    </div>

    {/* Title */}
    <div style={{ textAlign: 'center', marginBottom: '6px', lineHeight: '1.5' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>CLEARANCE FORM</div>
      <div style={{ fontSize: '10px', fontStyle: 'italic' }}>(Instructions at the back)</div>
    </div>

    {/* Main table */}
    <table style={{ border: '2px solid black', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>

      {/* SECTION I */}
      <tbody>
        <tr>
          <td colSpan="1"  style={grayHeader}>I</td>
          <td colSpan="21" style={grayHeader}>PURPOSE</td>
        </tr>
        <tr>
          <td colSpan="12" style={noBorder}>&nbsp;</td>
          <td colSpan="10" style={{ ...noBorder, textAlign: 'center', paddingBottom: '4px' }}>
            <span style={{ display: 'inline-block', width: '90%', borderBottom: '1px solid black' }} />
            <br />Date of Filing
          </td>
        </tr>
        <tr>
          <td colSpan="2" rowSpan="3" style={{ ...noBorder, verticalAlign: 'top' }}>
            <br />TO:
          </td>
          <td colSpan="20" style={noBorder}>
            <br />
            <b><u>EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY</u></b><br />
            I hereby request clearance from money, property and work-related accountabilities for:
          </td>
        </tr>
        <tr>
          <td colSpan="3" style={{ ...noBorder, verticalAlign: 'top' }}>Purpose:</td>
          <td colSpan="4" style={noBorder}>[ ] Transfer<br />[ ] Retirement</td>
          <td colSpan="4" style={noBorder}>[ ] Resignation<br />[ ] Leave</td>
          <td colSpan="9" style={noBorder}>
            [ ] Other Mode of Separation:<br />
            &nbsp;&nbsp;&nbsp;Please specify:{' '}
            <span style={{ display: 'inline-block', width: '55%', borderBottom: '1px solid black' }} />
          </td>
        </tr>
        <tr>
          <td colSpan="20" style={noBorder}>
            <br />Date of Effectivity:{' '}
            <span style={{ display: 'inline-block', width: '74%', borderBottom: '1px solid black' }} />
            <br />
          </td>
        </tr>
        <tr>
          <td colSpan="12" style={{ ...clearCell, padding: '7px 6px' }}>
            Office of Assignment:{' '}
            <span style={{ display: 'inline-block', width: '58%', borderBottom: '1px solid black' }} />
            <br /><br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Position/SG/Step:{' '}
            <span style={{ display: 'inline-block', width: '60%', borderBottom: '1px solid black' }} />
          </td>
          <td colSpan="10" style={{ ...clearCell, textAlign: 'center', padding: '7px 6px' }}>
            <br />
            <span style={{ display: 'inline-block', width: '85%', borderBottom: '1px solid black' }} />
            <br />Name and Signature of Employee
          </td>
        </tr>
        <tr><td colSpan="22" style={divider} /></tr>

        {/* SECTION II */}
        <tr>
          <td colSpan="1"  style={grayHeader}>II</td>
          <td colSpan="21" style={grayHeader}>CLEARANCE FROM WORK-RELATED ACCOUNTABILITIES</td>
        </tr>
        <tr>
          <td colSpan="22" style={{ ...noBorder, textAlign: 'center', fontSize: '10px' }}>
            We hereby certify that this employee is cleared/not cleared of work-related accountabilities from this Unit/Office/Dept.
          </td>
        </tr>
        <tr>
          <td colSpan="11" style={{ ...noBorder, textAlign: 'center', padding: '10px 4px' }}>
            <span style={{ display: 'inline-block', width: '80%', borderBottom: '1px solid black' }} />
            <br />Immediate Supervisor
          </td>
          <td colSpan="11" style={{ ...noBorder, textAlign: 'center', padding: '10px 4px' }}>
            <span style={{ display: 'inline-block', width: '80%', borderBottom: '1px solid black' }} />
            <br />Head of Office
          </td>
        </tr>
        <tr><td colSpan="22" style={divider} /></tr>

        {/* SECTION III */}
        <tr>
          <td colSpan="1"  style={grayHeader}>III</td>
          <td colSpan="21" style={grayHeader}>CLEARANCE FROM MONEY AND PROPERTY ACCOUNTABILITIES</td>
        </tr>
        <tr>
          <td colSpan="8"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Name of Unit/Office/Department</td>
          <td colSpan="2"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Cleared</td>
          <td colSpan="2"  style={{ ...clearCell, textAlign: 'center', fontSize: '9px'  }}>Not Cleared</td>
          <td colSpan="6"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Name of Clearing Officer/Official</td>
          <td colSpan="4"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Signature</td>
        </tr>

        {subRows.map(({ section, label, items }) => (
          <React.Fragment key={section}>
            <tr>
              <td colSpan="1"  style={{ ...grayHeader, fontWeight: 'normal' }}>{section}.</td>
              <td colSpan="21" style={{ ...grayHeader, fontWeight: 'normal' }}><i>{label}</i></td>
            </tr>
            {items.map(({ letter, name, officer }) => (
              <tr key={letter}>
                <td colSpan="1" style={noBorder}>&nbsp;</td>
                <td colSpan="1" style={noBorder}>{letter}</td>
                <td colSpan="6" style={{ ...noBorder, fontSize: '10px' }}>{name}</td>
                <td colSpan="2" style={clearCell}>&nbsp;</td>
                <td colSpan="2" style={clearCell}>&nbsp;</td>
                <td colSpan="6" style={{ ...clearCell, textAlign: 'center' }}>
                  {officer ? <b>{officer}</b> : <>&nbsp;</>}
                </td>
                <td colSpan="4" style={clearCell}>&nbsp;</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
        <tr><td colSpan="22" style={divider} /></tr>

        {/* SECTION IV */}
        <tr>
          <td colSpan="1"  style={grayHeader}>IV</td>
          <td colSpan="21" style={grayHeader}>CERTIFICATION OF NO PENDING ADMINISTRATIVE CASE</td>
        </tr>
        <tr>
          <td colSpan="1" style={noBorder}>&nbsp;</td>
          <td colSpan="1" style={noBorder}>a.</td>
          <td colSpan="6" style={{ ...noBorder, fontSize: '10px' }}>Internal Affairs Office/Legal Affairs Office</td>
          <td colSpan="2" style={clearCell}>&nbsp;</td>
          <td colSpan="2" style={clearCell}>&nbsp;</td>
          <td colSpan="6" style={{ ...clearCell, textAlign: 'center' }}><b>DR. GIOVANNI L. AHUNIN</b></td>
          <td colSpan="4" style={clearCell}>&nbsp;</td>
        </tr>
        <tr>
          <td colSpan="4" style={noBorder}>&nbsp;</td>
          <td colSpan="18" style={{ ...noBorder, fontSize: '10px', padding: '5px 4px' }}>
            [ ]&nbsp;&nbsp;&nbsp;&nbsp;with pending administrative case<br />
            [ ]&nbsp;&nbsp;&nbsp;&nbsp;with ongoing investigation (no formal charge yet)
          </td>
        </tr>
        <tr><td colSpan="22" style={divider} /></tr>

        {/* SECTION V */}
        <tr>
          <td colSpan="1"  style={grayHeader}>V</td>
          <td colSpan="21" style={grayHeader}>CERTIFICATION</td>
        </tr>
        <tr>
          <td colSpan="22" style={{ ...noBorder, fontSize: '10px', lineHeight: '1.7', padding: '8px 5px' }}>
            I hereby certify that this employee is cleared of work-related, money and property accountabilities from this agency. This certification
            includes no pending administrative case from this agency.<br /><br />
          </td>
        </tr>
        <tr>
          <td colSpan="22" style={{ ...noBorder, fontSize: '10px', textAlign: 'center', padding: '6px 5px' }}>
            <b><u>DR. ROGELIO T. MAMARADLO</u></b><br />
            Signature over Printed Name of Agency Head
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   BACK page content
────────────────────────────────────────────────────────────── */
const BackPage = () => (
  <div
    className="clearance-page"
    style={{
      width: PAGE_W,
      minHeight: PAGE_H,
      padding: '0.35in 0.4in',
      fontFamily: FONT,
      fontSize: '11px',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
    }}
  >
    <p style={{ fontSize: '14px', fontStyle: 'italic', fontWeight: 'bold', marginBottom: '12px' }}>
      INSTRUCTIONS:
    </p>

    <ol type="1" style={{ fontSize: '13px', lineHeight: '1.85', paddingLeft: '1.2em', margin: 0 }}>
      <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
        Employees who are retiring, being separated, transferring to other agencies, leaving the Philippines and going on leave of absence{' '}
        <b>for more than 30 days</b> shall prepare this form in quadruplicate.
      </li>
      <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
        This clearance should be duly accomplished before paying the last salary or any money due the employees.
        (Specify which type of clearance: maternity leave, retirement, transfer, etc.)
      </li>
      <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
        If the employees are cleared from a unit/office/department, the clearing/authorized official may attach to this clearance
        the pertinent documents that shall prove that the employees are cleared of any obligation or accountability from their office,
        if any, and tick the box under the "Cleared" column before affixing their signatures.
      </li>
      <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
        If the employees appear to have uncleared accountability/ies from a unit/office/department, the clearing/authorized official
        shall attach to this clearance the pertinent document/s that shall prove that the employees have remaining obligation or
        accountability from their office further indicating the necessary action/s that the employee must satisfy in order to be cleared,
        and tick the box under the "Uncleared" column. The clearing/authorized official must only sign this clearance corresponding to
        their name once the employee have complied the necessary requirements and cleared of all the obligation/s and accountability/ies
        from their office. They must also tick the box under the "Cleared" column.
      </li>
      <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
        The HRMO shall distribute copies of approved clearance as follows: original to the employee; duplicate to be attached to the
        payroll or voucher; triplicate to human resource unit file; and fourth copy to accounting/auditing office.
      </li>
      <li style={{ textAlign: 'justify' }}>
        Processing of clearance certificate shall follow the order of number indicated.
      </li>
    </ol>

    <div style={{ fontSize: '11px', fontStyle: 'italic', textAlign: 'right', marginTop: '20px' }}>
      Page 2 of 2
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════ */
const Clearance = () => {
  const frontRef   = useRef(null);
  const backRef    = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar       = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /* ── Shared: capture one ref to canvas ── */
  const captureToCanvas = async (el) => {
    const orig = {
      position:   el.style.position,
      left:       el.style.left,
      top:        el.style.top,
      visibility: el.style.visibility,
      width:      el.style.width,
    };

    // Pin to a known pixel width matching 8.5in @ 96dpi = 816px
    el.style.position   = 'fixed';
    el.style.left       = '-9999px';
    el.style.top        = '0';
    el.style.visibility = 'visible';
    el.style.width      = '816px';

    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(el, {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#ffffff',
      logging:         false,
      width:           816,
      allowTaint:      true,
    });

    // Restore
    el.style.position   = orig.position;
    el.style.left       = orig.left;
    el.style.top        = orig.top;
    el.style.visibility = orig.visibility;
    el.style.width      = orig.width;

    return canvas;
  };

  /* ── Print — opens a new window with both pages ── */
  const printPage = () => {
    injectPrintStyles();
    const frontHtml = document.getElementById('clearance-front').innerHTML;
    const backHtml  = document.getElementById('clearance-back').innerHTML;

    const win = window.open('', '', 'width=1000,height=800');
    win.document.write(`
      <html>
        <head>
          <title>Clearance Form</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: white; }
            .page { width: 8.5in; min-height: 13in; padding: 0.25in 0.3in; page-break-after: always; }
            .page:last-child { page-break-after: auto; }
            table { width: 100%; border-collapse: collapse; }
            @page { size: 8.5in 13in portrait; margin: 0; }
          </style>
        </head>
        <body>
          <div class="page">${frontHtml}</div>
          <div class="page">${backHtml}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  /* ── PDF — 2 pages: front + back ── */
  const downloadPDF = async () => {
    if (!frontRef.current || !backRef.current) return;
    try {
      setIsGenerating(true);

      const [frontCanvas, backCanvas] = await Promise.all([
        captureToCanvas(frontRef.current),
        captureToCanvas(backRef.current),
      ]);

      // Legal: 8.5 × 13 inches
      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
      const pw     = pdf.internal.pageSize.getWidth();
      const ph     = pdf.internal.pageSize.getHeight();

      // Page 1 — front
      pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);

      // Page 2 — back
      pdf.addPage();
      pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);

      pdf.save(`Clearance-Form-${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('PDF downloaded successfully (2 pages)', 'success');
    } catch (err) {
      console.error('PDF error:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Page separator label ── */
  const PageLabel = ({ text }) => (
    <div style={{
      width:       '8.5in',
      margin:      '0 auto',
      padding:     '6px 0',
      textAlign:   'center',
      fontSize:    '11px',
      fontFamily:  FONT,
      fontWeight:  'bold',
      color:       '#555',
      borderTop:   '2px dashed #aaa',
      borderBottom:'2px dashed #aaa',
      letterSpacing: '1px',
    }}>
      {text}
    </div>
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', bgcolor: '#ffffff', position: 'relative' }}>
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>

        {/* ══ PAGE 1 — FRONT ══ */}
        <PageLabel text="PAGE 1 — FRONT" />
        <div ref={frontRef} id="clearance-front">
          <FrontPage />
        </div>

        {/* ══ PAGE 2 — BACK ══ */}
        <PageLabel text="PAGE 2 — BACK (Instructions)" />
        <div ref={backRef} id="clearance-back">
          <BackPage />
        </div>

      </Box>

      {/* ══ Floating Action Buttons ══ */}
      <Box
        className="no-print clearance-floating-actions"
        sx={{ position: 'fixed', bottom: '1in', right: 30, display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000 }}
      >
        <Zoom in style={{ transitionDelay: '0ms' }}>
          <Tooltip title="Print Form (2 pages)" placement="top">
            <Fab
              aria-label="print"
              onClick={printPage}
              sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}
            >
              <PrintIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>

        <Zoom in style={{ transitionDelay: '100ms' }}>
          <Tooltip title="Download PDF (2 pages)" placement="top">
            <Fab
              aria-label="download"
              onClick={downloadPDF}
              sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}
            >
              <PictureAsPdfIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>

      <LoadingOverlay open={isGenerating} message="Generating Document..." />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Clearance;