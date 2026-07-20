import React, { useRef, useState } from 'react';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

/* ── Shared page style (A4 landscape) ── */
const pageStyle = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  width: '277mm',
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
    {/* Title */}
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

    {/* Personal info — 3 columns */}
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

    {/* Main table */}
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
  const printRef  = useRef(null);
  const captureRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /* ── Native print ── */
  const printPage = () => {
    const content = document.getElementById('leave-card-content').innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Employee's Leave Card</title>
          <style>
            body { font-family: Arial; padding: 10px; }
            table { width: 100%; border-collapse: collapse; }
            @page { size: A4 landscape; margin: 0.3in; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  /* ── PDF download ── */
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
        width: 1123,   // A4 landscape @ 96dpi
        allowTaint: true,
      });

      el.style.position   = 'absolute';
      el.style.top        = '-10000px';
      el.style.left       = '-10000px';
      el.style.visibility = 'hidden';

      if (!canvas) throw new Error('Canvas generation failed');

      const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW  = pdf.internal.pageSize.getWidth();   // 297mm
      const pageH  = pdf.internal.pageSize.getHeight();  // 210mm
      const margin = 6;
      const imgW   = pageW - margin * 2;
      const imgData = canvas.toDataURL('image/png');

      /* Page 1 — front */
      const frontH = (canvas.height / 2 / canvas.width) * imgW * 2;
      pdf.addImage(imgData, 'PNG', margin, margin, imgW, frontH);

      /* Page 2 — back (second half of the canvas) */
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin - frontH, imgW, frontH * 2);

      pdf.save(`Leave-Card-${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Full page render (front + divider + back) ── */
  const renderContent = () => (
    <>
      {/* FRONT */}
      <div style={sideStyle}>
        <FrontContent />
      </div>

      {/* Cut line */}
      <div style={{
        textAlign: 'center',
        fontSize: '9px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#555',
        borderTop: '1px dashed #aaa',
        borderBottom: '1px dashed #aaa',
        padding: '1mm 0',
        margin: '3mm 0',
        letterSpacing: '2px',
      }}>
        ✂ &nbsp; FRONT — — — BACK &nbsp; ✂
      </div>

      {/* BACK */}
      <div style={sideStyle}>
        <BackContent />
      </div>
    </>
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', bgcolor: '#ffffff', position: 'relative' }}>
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>

        {/* ══ VISIBLE ══ */}
        <div
          ref={printRef}
          id="leave-card-content"
          style={{ ...pageStyle, marginTop: '30px', marginBottom: '20px' }}
        >
          {renderContent()}
        </div>

        {/* ══ HIDDEN CAPTURE (A4 landscape @ 96dpi = 1123px) ══ */}
        <div
          ref={captureRef}
          style={{
            ...pageStyle,
            width: '1123px',
            position: 'absolute',
            top: '-10000px',
            left: '-10000px',
            visibility: 'hidden',
            margin: '0',
          }}
        >
          {renderContent()}
        </div>
      </Box>

      {/* ══ Floating Action Buttons ══ */}
      <Box
        className="no-print forms-floating-actions"
        sx={{ position: 'fixed', bottom: '1in', right: 30, display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000 }}
      >
        <Zoom in style={{ transitionDelay: '0ms' }}>
          <Tooltip title="Print Form" placement="top">
            <Fab aria-label="print" onClick={printPage}
              sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}>
              <PrintIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>

        <Zoom in style={{ transitionDelay: '100ms' }}>
          <Tooltip title="Download PDF" placement="top">
            <Fab aria-label="download" onClick={downloadPDF}
              sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}>
              <PictureAsPdfIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>

      <LoadingOverlay open={isGenerating} message="Generating Document..." />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveCard;