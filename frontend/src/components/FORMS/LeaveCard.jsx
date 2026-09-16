import React, { useRef, useState } from 'react';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  FormPrintStyles,
  printFormHtmlPages,
  downloadFormHtmlPages,
  FORM_LANDSCAPE_PRINTABLE_WIDTH_MM,
} from './FormPrintable';

/* ── Style helpers ── */
const tbl = { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' };
const cellC = (extra = {}) => ({
  border: '1px solid black',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  ...extra,
});

/* ── Shared page style (A4 landscape printable width) ── */
const pageStyle = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  width: `${FORM_LANDSCAPE_PRINTABLE_WIDTH_MM}mm`,
  margin: '0 auto',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};

const sideStyle = {
  width: '100%',
  border: '1px solid black',
  padding: '6mm',
  boxSizing: 'border-box',
};

/* ── Data rows shared by both sides ── */
const DataRows = ({ count, firstLabel = '' }) =>
  [...Array(count)].map((_, i) => (
    <tr key={i}>
      <td colSpan={3} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={8} style={cellC({ height: '0.25in' })}>
        {i === 0 && firstLabel ? <b>{firstLabel}</b> : ''}
      </td>
      <td colSpan={2} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={3} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={2} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={3} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={2} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={3} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={2} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={3} style={cellC({ height: '0.25in' })}>&nbsp;</td>
      <td colSpan={5} style={cellC({ height: '0.25in' })}>&nbsp;</td>
    </tr>
  ));

/* ── Table header shared by both sides ── */
const TableHeader = () => (
  <>
    <tr>
      <td colSpan={3} rowSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>PERIOD</td>
      <td colSpan={8} rowSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>PARTICULARS</td>
      <td colSpan={10} style={cellC({ height: '0.25in', fontWeight: 'bold' })}>VACATION LEAVE</td>
      <td colSpan={10} style={cellC({ height: '0.25in', fontWeight: 'bold' })}>SICK LEAVE</td>
      <td colSpan={5} rowSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>REMARKS</td>
    </tr>
    <tr>
      <td colSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>EARNED</td>
      <td colSpan={3} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>Absence<br />Undertime<br />W/Pay</td>
      <td colSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>BALANCE</td>
      <td colSpan={3} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>Absence<br />Undertime<br />W/o Pay</td>
      <td colSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>EARNED</td>
      <td colSpan={3} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>Absence<br />Undertime<br />W/Pay</td>
      <td colSpan={2} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>BALANCE</td>
      <td colSpan={3} style={cellC({ height: '0.5in', fontWeight: 'bold' })}>Absence<br />Undertime<br />W/o Pay</td>
    </tr>
  </>
);

/* ── LINE helper ── */
const lineStyle = { borderBottom: '1px solid black', display: 'inline-block', width: '100%' };

/* ════════════════════════════════════════
   FRONT content
════════════════════════════════════════ */
const FrontContent = () => (
  <>
    <div style={{
      textAlign: 'center',
      marginBottom: '14px',
      fontSize: '16px',
      fontWeight: 'bold',
      textDecoration: 'underline',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      EMPLOYEE'S LEAVE CARD
    </div>

    {[
      [{ label: 'Name' }, { label: 'Civil Status' }, { label: 'GSIS Policy No.' }],
      [{ label: 'Position' }, { label: 'Entrance to Duty' }, { label: 'TIN No.' }],
      [{ label: 'Status' }, { label: 'Unit' }, { label: "Nat'l Ref. Card No." }],
    ].map((row, ri) => (
      <div key={ri} style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
        marginBottom: ri === 2 ? '14px' : '8px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
      }}>
        {row.map((col, ci) => (
          <div key={ci} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px', whiteSpace: 'nowrap' }}>{col.label}:</span>
            <span style={lineStyle} />
          </div>
        ))}
      </div>
    ))}

    <div style={{ borderBottom: '1px solid black', marginBottom: '10px' }} />

    <table style={tbl}>
      <tbody>
        <TableHeader />
        <DataRows count={21} firstLabel="BAL. BROUGHT FORWARD" />
      </tbody>
    </table>
  </>
);

/* ════════════════════════════════════════
   BACK content
════════════════════════════════════════ */
const BackContent = () => (
  <table style={tbl}>
    <tbody>
      <TableHeader />
      <DataRows count={29} />
    </tbody>
  </table>
);

/* ════════════════════════════════════════
   Main Component
════════════════════════════════════════ */
const LeaveCard = () => {
  const frontRef = useRef(null);
  const backRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const getPageHtmls = () =>
    [frontRef.current, backRef.current]
      .map((el) => el?.querySelector('.form-page')?.outerHTML)
      .filter(Boolean);

  const printPage = async () => {
    const pages = getPageHtmls();
    if (!pages.length) return;
    try {
      setIsGenerating(true);
      await printFormHtmlPages(pages, {
        title: "Employee's Leave Card",
        orientation: 'landscape',
      });
    } catch (err) {
      console.error('Error printing form:', err);
      showSnackbar('Error printing form: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    const pages = getPageHtmls();
    if (!pages.length) return;
    try {
      setIsGenerating(true);
      await downloadFormHtmlPages(
        pages,
        `Leave-Card-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: "Employee's Leave Card", orientation: 'landscape' },
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
    <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', bgcolor: '#ffffff', position: 'relative' }}>
      <FormPrintStyles />
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px', marginTop: '30px' }}>
        <main className="form-print-area" ref={frontRef} style={{ marginBottom: '12px' }}>
          <div className="form-print-scale">
            <div className="form-page" style={pageStyle}>
              <div style={sideStyle}>
                <FrontContent />
              </div>
            </div>
          </div>
        </main>

        <div
          className="no-print"
          style={{
            textAlign: 'center',
            fontSize: '9px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#555',
            borderTop: '1px dashed #aaa',
            borderBottom: '1px dashed #aaa',
            padding: '1mm 0',
            margin: '3mm auto',
            letterSpacing: '2px',
            maxWidth: `${FORM_LANDSCAPE_PRINTABLE_WIDTH_MM}mm`,
          }}
        >
          FRONT — — — BACK
        </div>

        <main className="form-print-area" ref={backRef} style={{ marginBottom: '20px' }}>
          <div className="form-print-scale">
            <div className="form-page" style={pageStyle}>
              <div style={sideStyle}>
                <BackContent />
              </div>
            </div>
          </div>
        </main>
      </Box>

      <Box
        className="no-print forms-floating-actions"
        sx={{ position: 'fixed', bottom: '1in', right: 30, display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000 }}
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

export default LeaveCard;
