import React, { useRef, useState } from 'react';
import logo from './logo.png';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/* ─────────────────────────────────────────────────────────────
   Constants
────────────────────────────────────────────────────────────── */
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const FONT_SIZE_SM  = '8px';
const FONT_SIZE_MD  = '10px';
const FONT_SIZE_LG  = '12px';
const FONT_SIZE_XL  = '14px';

/* ─────────────────────────────────────────────────────────────
   Style helpers
────────────────────────────────────────────────────────────── */
const tbl = { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' };

const cell = (extra = {}) => ({
  padding: '3px 5px',
  verticalAlign: 'top',
  fontSize: FONT_SIZE_MD,
  fontFamily: FONT_FAMILY,
  lineHeight: '1.4',
  ...extra,
});

const b = (...args) => Object.assign({}, ...args);
const bL  = { borderLeft:   '1px solid #000' };
const bR  = { borderRight:  '1px solid #000' };
const bT  = { borderTop:    '1px solid #000' };
const bB  = { borderBottom: '1px solid #000' };
const bDT = { borderTop:    '2.5px double #000' };
const bDB = { borderBottom: '2.5px double #000' };
const bAll = b(bL, bR, bT, bB);

/* ─────────────────────────────────────────────────────────────
   Page style — one A4 sheet containing BOTH form copies
────────────────────────────────────────────────────────────── */
const pageStyle = {
  fontFamily:      FONT_FAMILY,
  fontSize:        FONT_SIZE_MD,
  width:           '190mm',
  margin:          '0 auto',
  backgroundColor: '#fff',
  boxSizing:       'border-box',
};

/* Each half takes roughly half the A4 height */
const halfStyle = {
  width:      '100%',
  border:     '2px solid #000',
  padding:    '4mm',
  boxSizing:  'border-box',
};

/* ─────────────────────────────────────────────────────────────
   Shared colgroup — two equal halves
────────────────────────────────────────────────────────────── */
const Colgroup2 = () => (
  <colgroup>
    <col style={{ width: '50%' }} />
    <col style={{ width: '50%' }} />
  </colgroup>
);

/* ─────────────────────────────────────────────────────────────
   Checkbox label
────────────────────────────────────────────────────────────── */
const Chk = ({ label }) => (
  <div style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZE_MD, marginBottom: '3px' }}>
    <span style={{ marginRight: '5px' }}>&#9633;</span>
    <strong>{label}</strong>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Horizontal rule substitute (full-width, zoom-stable)
────────────────────────────────────────────────────────────── */
const HRule = ({ style = {} }) => (
  <tr>
    <td
      colSpan={99}
      style={{ padding: 0, lineHeight: 0, height: '1px', backgroundColor: '#000', ...style }}
    />
  </tr>
);

/* ─────────────────────────────────────────────────────────────
   Spacer row
────────────────────────────────────────────────────────────── */
const Spacer = ({ h = '6px' }) => (
  <tr>
    <td colSpan={99} style={b(bL, bR, { padding: 0, height: h })} />
  </tr>
);

/* ─────────────────────────────────────────────────────────────
   Print-style injection (same pattern as Leave)
────────────────────────────────────────────────────────────── */
const PRINT_STYLE_ID = 'hrms-form-print-style';
const injectPrintStyles = () => {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
@media print {
  @page { size: A4 portrait; margin: 10mm; }
  html, body { width: 210mm; margin: 0; padding: 0; background: white; }
  .hrms-floating-actions, .MuiSnackbar-root, .MuiBackdrop-root, .no-print {
    display: none !important;
  }
  #hrms-form-content {
    width: 190mm !important;
    margin: 0 auto !important;
    background: white !important;
    box-sizing: border-box !important;
    zoom: 1 !important;
    transform: scale(1) !important;
  }
  table { width: 100% !important; border-collapse: collapse !important; }
  tr { page-break-inside: avoid !important; }
}
`;
  document.head.appendChild(style);
};

/* ═══════════════════════════════════════════════════════════
   Form Content (rendered once visible, once in capture clone)
═══════════════════════════════════════════════════════════ */
const FormContent = () => (
  <>
    {/* ══ HEADER ══ */}
    <table style={tbl}>
      <tbody>
        {/* Logo row */}
        <tr>
          <td colSpan={2} style={{ padding: '4px 0 6px', textAlign: 'center' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '15%', verticalAlign: 'middle', textAlign: 'left', padding: '0 4px' }}>
                    <img src={logo} alt="EARIST Logo" style={{ height: '80px' }} />
                  </td>
                  <td style={{ width: '70%', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ fontFamily: FONT_FAMILY, lineHeight: '1.6' }}>
                      <div style={{ fontSize: FONT_SIZE_MD }}>Republic of the Philippines</div>
                      <div style={{ fontSize: FONT_SIZE_LG, fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
                      <div style={{ fontSize: FONT_SIZE_LG, fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
                      <div style={{ fontSize: FONT_SIZE_MD }}>Nagtahan, Sampaloc, Manila</div>
                      <div style={{ fontSize: FONT_SIZE_SM, fontWeight: 'bold' }}>6243-9467 Loc. 120</div>
                      <div style={{ fontSize: FONT_SIZE_MD, fontWeight: 'bold' }}>HUMAN RESOURCES MANAGEMENT SERVICES</div>
                      <div style={{ fontSize: FONT_SIZE_MD, fontWeight: 'bold' }}>REQUEST FORM</div>
                    </div>
                  </td>
                  <td style={{ width: '15%', verticalAlign: 'middle', textAlign: 'right', padding: '0 4px' }}>
                    <img src={logo} alt="EARIST Logo" style={{ height: '80px' }} />
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>

    {/* ══ MAIN BORDERED CONTENT ══ */}
    <table style={b(tbl, { border: '3px solid #000' })}>
      <tbody>

        {/* DATE row */}
        <tr style={bT}>
          <td colSpan={2} style={cell(b(bL, bR, bT, bB, { textAlign: 'right', fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            DATE: ____________________
          </td>
        </tr>

        {/* Section I */}
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, bB, { fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            I.&nbsp; PRINTED NAME OF THE REQUESTING EMPLOYEE:&nbsp;
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '200px' }}>&nbsp;</span>
            &nbsp;&nbsp;
            <span style={{ fontSize: FONT_SIZE_SM, fontWeight: 'normal', fontStyle: 'italic' }}>
              (Please use the back page if more than one employee)
            </span>
          </td>
        </tr>

        {/* Section II */}
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, bB, { fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            II.&nbsp; ADDRESS:
          </td>
        </tr>
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, bB, { fontSize: FONT_SIZE_MD, paddingTop: '2px' }))}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', minHeight: '18px' }}>&nbsp;</div>
            <div style={{ borderBottom: '1px solid #000', minHeight: '18px' }}>&nbsp;</div>
          </td>
        </tr>

        {/* Section III header */}
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, bB, { fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            III.&nbsp; NATURE OF REQUEST:&nbsp;
            <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>
              (Please check the appropriate box for your request)
            </span>
          </td>
        </tr>

        {/* Checkboxes — two-column */}
        <tr>
          <td style={cell(b(bL, bB, { verticalAlign: 'top' }))}>
            <Chk label="Service Records" />
            <Chk label="IPCR" />
            <Chk label="DTR" />
            <Chk label="201 Files" />
            <Chk label="Copy of Appointment" />
          </td>
          <td style={cell(b(bL, bR, bB, { verticalAlign: 'top' }))}>
            <Chk label="Certificate of Employment" />
            <Chk label="Personal Data Sheet" />
            <Chk label="Retirement Forms" />
            <Chk label="Authority to Travel (NOTE: 3 weeks before Travel)" />
            <Chk label="Service Credits/Travel Credits Balance" />
          </td>
        </tr>

        {/* Other documents */}
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, bB, { fontSize: FONT_SIZE_MD }))}>
            <strong>Other Documents</strong><br />
            <span style={{ fontStyle: 'italic' }}>
              Please specify: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '240px' }}>&nbsp;</span>
            </span>
          </td>
        </tr>

        {/* Section IV */}
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, bB, { fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            IV.&nbsp; PURPOSE OF REQUEST:&nbsp;
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '280px' }}>&nbsp;</span>
          </td>
        </tr>

        {/* Section V & VI */}
        <tr>
          <td style={cell(b(bL, bB, { fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            V.&nbsp; REQUESTED BY:
          </td>
          <td style={cell(b(bL, bR, bB, { fontWeight: 'bold', fontSize: FONT_SIZE_MD }))}>
            VI.&nbsp; RECEIVED BY:
          </td>
        </tr>

        {/* Signature lines */}
        <tr>
          <td style={cell(b(bL, bB, { textAlign: 'center', paddingTop: '40px', fontSize: FONT_SIZE_MD }))}>
            <div style={{
              borderTop: '1px solid #000',
              width: '70%',
              margin: '0 auto',
              paddingTop: '4px',
            }}>
              (Name and Signature)
            </div>
          </td>
          <td style={cell(b(bL, bR, bB, { textAlign: 'center', paddingTop: '40px', fontSize: FONT_SIZE_MD }))}>
            <div style={{
              borderTop: '1px solid #000',
              width: '70%',
              margin: '0 auto',
              paddingTop: '4px',
            }}>
              (Name and Signature)
            </div>
          </td>
        </tr>

        {/* Footer code */}
        <tr>
          <td colSpan={2} style={cell(b(bL, bR, { fontSize: FONT_SIZE_SM, paddingTop: '8px' }))}>
            EARIST-QSF-HRMS-014
          </td>
        </tr>

      </tbody>
    </table>
  </>
);

/* ═══════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════ */
const HrmsRequestForms = () => {
  const printRef   = useRef(null);
  const captureRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () =>
    setSnackbar((s) => ({ ...s, open: false }));

  /* ── Print ── */
  const printPage = () => {
    injectPrintStyles();
    const content = document.getElementById('hrms-form-content').innerHTML;
    const printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`
      <html>
        <head>
          <title>HRMS Request Form</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            @page { size: A4; margin: 0.4in; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  /* ── PDF Download ── */
  const downloadPDF = async () => {
    if (!captureRef.current) return;
    try {
      setIsGenerating(true);
      const el = captureRef.current;

      el.style.position   = 'relative';
      el.style.top        = '0';
      el.style.left       = '0';
      el.style.visibility = 'visible';

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        allowTaint: true,
      });

      el.style.position   = 'absolute';
      el.style.top        = '-10000px';
      el.style.left       = '-10000px';
      el.style.visibility = 'hidden';

      if (!canvas) throw new Error('Canvas generation failed');

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW  = pdf.internal.pageSize.getWidth();
      const margin = 8;
      const imgW   = pageW - margin * 2;
      const imgH   = (canvas.height / canvas.width) * imgW;
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
      pdf.save(`HRMS-Request-Form-${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#ffffff',
        position: 'relative',
      }}
    >
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>

        {/* ══ SINGLE A4 PAGE — 2 forms stacked ══ */}
        <div
          ref={printRef}
          id="hrms-form-content"
          style={{ ...pageStyle, marginTop: '20px', marginBottom: '20px' }}
        >
          <div style={halfStyle}>
            <FormContent />
          </div>
          {/* Scissor cut line between the two copies */}
          <div style={{
            textAlign: 'center',
            fontSize: FONT_SIZE_SM,
            fontFamily: FONT_FAMILY,
            color: '#555',
            borderTop: '1px dashed #aaa',
            borderBottom: '1px dashed #aaa',
            padding: '1mm 0',
            margin: '2mm 0',
            letterSpacing: '2px',
          }}>
            ✂ &nbsp; CUT HERE &nbsp; ✂
          </div>
          <div style={halfStyle}>
            <FormContent />
          </div>
        </div>

        {/* ══ HIDDEN CAPTURE CONTAINER (A4 @ 96dpi = 794px) ══ */}
        <div
          ref={captureRef}
          style={{
            ...pageStyle,
            width: '794px',
            position: 'absolute',
            top: '-10000px',
            left: '-10000px',
            visibility: 'hidden',
            margin: '0',
          }}
        >
          <div style={{ ...halfStyle, border: '2px solid #000' }}>
            <FormContent />
          </div>
          <div style={{
            textAlign: 'center',
            fontSize: '8px',
            color: '#555',
            borderTop: '1px dashed #aaa',
            borderBottom: '1px dashed #aaa',
            padding: '2px 0',
            margin: '4px 0',
            letterSpacing: '2px',
          }}>
            ✂ &nbsp; CUT HERE &nbsp; ✂
          </div>
          <div style={{ ...halfStyle, border: '2px solid #000' }}>
            <FormContent />
          </div>
        </div>
      </Box>

      {/* ══ Floating Action Buttons ══ */}
      <Box
        className="no-print hrms-floating-actions"
        sx={{
          position: 'fixed',
          bottom: '1in',
          right: 30,
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          zIndex: 1000,
        }}
      >
        <Zoom in style={{ transitionDelay: '0ms' }}>
          <Tooltip title="Print Form" placement="top">
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
          <Tooltip title="Download PDF" placement="top">
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

export default HrmsRequestForms;