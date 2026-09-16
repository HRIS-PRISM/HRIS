import React, { useRef, useState } from 'react';
import logo from './logo.png';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_PRINTABLE_WIDTH_MM,
} from './FormPrintable';

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
  const formRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () =>
    setSnackbar((s) => ({ ...s, open: false }));

  const printPage = async () => {
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, { title: 'HRMS Request Form' });
    } catch (err) {
      console.error('Error printing form:', err);
      showSnackbar('Error printing form: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setIsGenerating(true);
      await downloadFormHtml(
        formRef.current,
        `HRMS-Request-Form-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'HRMS Request Form' },
      );
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
    <FormPrintStyles />
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
        <main className="form-print-area" ref={formRef}>
          <div className="form-print-scale">
            <div
              className="form-page"
              style={{
                ...pageStyle,
                width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
                marginTop: '20px',
                marginBottom: '20px',
              }}
            >
              <div style={halfStyle}>
                <FormContent />
              </div>
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
          </div>
        </main>
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
    </>
  );
};

export default HrmsRequestForms;