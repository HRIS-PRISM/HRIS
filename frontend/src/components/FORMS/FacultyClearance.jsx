import React, { useRef, useState } from 'react';
import logo from './logo.png';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/* ── Style helpers (mirrors Leave.jsx) ── */
const tbl = { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' };

const cell = (extra = {}) => ({
  padding: '2px 4px',
  verticalAlign: 'top',
  fontSize: '10px',
  fontFamily: 'Arial, Helvetica, sans-serif',
  lineHeight: '1.3',
  ...extra,
});

const bL = { borderLeft: '1px solid #000' };
const bR = { borderRight: '1px solid #000' };
const bT = { borderTop: '1px solid #000' };
const bB = { borderBottom: '1px solid #000' };
const bAll = { border: '1px solid #000' };
const b = (...args) => Object.assign({}, ...args);

/* ════════════════════════════════════════════════════════════
   FacultyClearance component
════════════════════════════════════════════════════════════ */
const FacultyClearance = () => {
  const printRef = useRef(null);
  const captureRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /* ── Native print (mirrors Leave.jsx) ── */
  const printPage = () => {
    const content = document.getElementById('faculty-clearance-content').innerHTML;
    const printWindow = window.open('', '', 'width=900,height=650');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Faculty Clearance</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            @page { size: A4; margin: 0.4in; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  /* ── PDF download (mirrors Leave.jsx) ── */
  const downloadPDF = async () => {
    if (!captureRef.current) return;
    try {
      setIsGenerating(true);

      const el = captureRef.current;
      el.style.position = 'relative';
      el.style.top = '0';
      el.style.left = '0';
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

      el.style.position = 'absolute';
      el.style.top = '-10000px';
      el.style.left = '-10000px';
      el.style.visibility = 'hidden';

      if (!canvas) throw new Error('Canvas generation failed');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      const imgData = canvas.toDataURL('image/png');

      let yPos = margin;
      let remainingH = imgH;
      const usableH = pageH - margin * 2;

      while (remainingH > 0) {
        const sliceH = Math.min(remainingH, usableH);
        pdf.addImage(imgData, 'PNG', margin, yPos, imgW, imgH);
        remainingH -= usableH;
        if (remainingH > 0) {
          pdf.addPage();
          yPos = margin - (imgH - sliceH);
        }
      }

      pdf.save(`Faculty-Clearance-${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Shared form style (mirrors Leave.jsx) ── */
  const formStyle = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10px',
    width: '190mm',
    minHeight: '277mm',
    margin: '0 auto',
    border: '1px solid #000',
    padding: '5mm',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  /* ── Form content ── */
  const renderFormContent = () => (
    <>
      {/* ══════════════════════ HEADER ══════════════════════ */}
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: '6px', minHeight: '90px' }}>
        {/* Logo — absolutely positioned left, does NOT affect text centering */}
        <img
          src={logo}
          alt="EARIST Logo"
          style={{
            height: '80px',
            width: 'auto',
            position: 'absolute',
            left: '100px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
        {/* Text centered relative to the full container width */}
        <div style={{ lineHeight: '1.6', fontFamily: 'Arial, Helvetica, sans-serif', paddingTop: '4px' }}>
          <div style={{ fontSize: '10px' }}>Republic of the Philippines</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
          <div style={{ fontSize: '10px' }}>Nagtahan, Sampaloc, Manila</div>
        </div>
      </div>

      {/* ══════════════════════ TITLE ══════════════════════ */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          margin: '10px 0 14px',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        Faculty Clearance for Detailed Academic Holders
      </div>

      {/* ══════════════════════ CERTIFICATION TEXT ══════════════════════ */}
      <table style={{ ...tbl, marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td
              colSpan={3}
              style={cell({
                fontSize: '10px',
                lineHeight: '1.8',
                paddingBottom: '6px',
              })}
            >
              This is to certify that due to the closing of{' '}
              <strong>
                <em>
                  <u>School Year</u>
                </em>
              </strong>{' '}
              __________
            </td>
          </tr>

          {/* Name / Position / Department line */}
          <tr>
            <td style={cell({ textAlign: 'center', width: '33%' })}>
              ______________________________
            </td>
            <td style={cell({ textAlign: 'center', width: '4%' })}>&nbsp;</td>
            <td style={cell({ textAlign: 'center', width: '30%' })}>
              ______________________________
            </td>
            <td style={cell({ textAlign: 'center', width: '4%' })}>of</td>
            <td style={cell({ textAlign: 'center', width: '29%' })}>
              ____________________________
            </td>
          </tr>
          <tr>
            <td style={cell({ textAlign: 'center', fontSize: '9px' })}>Name</td>
            <td />
            <td style={cell({ textAlign: 'center', fontSize: '9px' })}>Position</td>
            <td />
            <td style={cell({ textAlign: 'center', fontSize: '9px' })}>Department</td>
          </tr>

          <tr>
            <td
              colSpan={5}
              style={cell({
                fontSize: '10px',
                lineHeight: '1.8',
                paddingTop: '6px',
              })}
            >
              of the Eulogio "Amang" Rodriguez Institute of Science and Technology, is cleared of
              all accountabilities as herein enumerated insofar as the Institute is concerned as
              of ____________________. This Faculty Clearance is for the{' '}
              <strong>
                <em>70 Days Proportional Vacation Pay (PVP)</em>
              </strong>{' '}
              salary claim only.{' '}
              <strong>(TO BE ACCOMPLISHED IN 4 COPIES)</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════ SIGNATORIES TABLE ══════════════════════ */}
      <table style={{ ...tbl, marginBottom: '10px' }}>
        <colgroup>
          <col style={{ width: '45%' }} />
          <col style={{ width: '42%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <tbody>
          {/* Header */}
          <tr style={{ height: '28px' }}>
            <td style={cell(b(bAll, { textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }))}>
              &nbsp;
            </td>
            <td style={cell(b(bAll, { textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }))}>
              SIGNATURE
            </td>
            <td style={cell(b(bAll, { textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }))}>
              DATE SIGNED
            </td>
          </tr>

          {/* Row 1 */}
          <tr>
            <td style={cell(b(bAll, { verticalAlign: 'top', lineHeight: '1.5' }))}>
              <strong>
                1.&nbsp;&nbsp;&nbsp;As to Area/College requirements.<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NBC 461/Research/Grade Sheets/<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MR/SALN&amp;PDS/Liquidation
              </strong>
              <br /><br /><br />
            </td>
            <td style={cell(b(bAll, { textAlign: 'center', verticalAlign: 'bottom', lineHeight: '1.5' }))}>
              <br /><br /><br />
              _________________________________________<br />
              <strong>COLLEGE DEAN</strong> (for Faculty Assigned in Colleges)<br />
              <strong>DIRECTOR OF INSTRUCTION</strong> (for Gen. Ed. Faculty)<br />
              <strong>ECC ADMINISTRATOR</strong> (for ECC Faculty)
            </td>
            <td style={cell(b(bAll, { textAlign: 'center' }))}>
              &nbsp;
            </td>
          </tr>

          {/* Row 2 */}
          <tr>
            <td style={cell(b(bAll, { verticalAlign: 'top' }))}>
              <strong>2.&nbsp;&nbsp;&nbsp;Recommending Approval</strong>
              <br /><br /><br /><br />
            </td>
            <td style={cell(b(bAll, { textAlign: 'center', verticalAlign: 'bottom', lineHeight: '1.5' }))}>
              <br /><br /><br />
              _________________________________________<br />
              <strong>DR. ERIC C. MENDOZA</strong><br />
              Vice President for Academic Affairs
            </td>
            <td style={cell(b(bAll, { textAlign: 'center' }))}>
              &nbsp;
            </td>
          </tr>

          {/* Row 3 */}
          <tr>
            <td style={cell(b(bAll, { verticalAlign: 'top' }))}>
              <strong>3.&nbsp;&nbsp;&nbsp;Approved</strong>
              <br /><br /><br /><br />
            </td>
            <td style={cell(b(bAll, { textAlign: 'center', verticalAlign: 'bottom', lineHeight: '1.5' }))}>
              <br /><br /><br />
              _________________________________________<br />
              <strong>Engr. ROGELIO T. MAMARADLO</strong><br />
              President
            </td>
            <td style={cell(b(bAll, { textAlign: 'center' }))}>
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════ BOTTOM SECTION ══════════════════════ */}
      <table style={{ ...tbl, marginTop: '6px' }}>
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          <tr style={{ height: '28px' }}>
            <td style={cell({ verticalAlign: 'bottom' })}>
              Email Address: __________________________
            </td>
            <td style={cell({ verticalAlign: 'bottom' })}>
              Telephone/Cell Phone #: ___________________
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tbl, marginTop: '8px' }}>
        <colgroup>
          <col style={{ width: '33%' }} />
          <col style={{ width: '33%' }} />
          <col style={{ width: '34%' }} />
        </colgroup>
        <tbody>
          <tr style={{ height: '50px' }}>
            <td style={cell({ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px' })}>
              <div
                style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '3px',
                }}
              >
                Signature of Faculty Member
              </div>
            </td>
            <td style={cell({ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px' })}>
              <div
                style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '3px',
                }}
              >
                Date Fully Accomplished
              </div>
            </td>
            <td style={cell({ textAlign: 'center', verticalAlign: 'bottom', fontSize: '9px' })}>
              <div
                style={{
                  borderTop: '1px solid #000',
                  width: '85%',
                  margin: '0 auto',
                  paddingTop: '3px',
                }}
              >
                Vacation Address
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: '12px' }} />

      <div
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          fontWeight: 'bold',
          marginBottom: '6px',
        }}
      >
        DEADLINE OF SUBMISSION: ______________________________
      </div>

      <table style={tbl}>
        <colgroup>
          <col style={{ width: '6%' }} />
          <col style={{ width: '94%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={cell()}>:</td>
            <td style={cell()}>Faculty</td>
          </tr>
          <tr>
            <td style={cell()}>:</td>
            <td style={cell()}>HRMS</td>
          </tr>
          <tr>
            <td style={cell()}>:</td>
            <td style={cell()}>FMS (2 copies) 1 photocopy</td>
          </tr>
        </tbody>
      </table>
    </>
  );

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

        {/* ══ VISIBLE FORM ══ */}
        <div
          ref={printRef}
          id="faculty-clearance-content"
          style={{ ...formStyle, marginTop: '30px' }}
        >
          {renderFormContent()}
        </div>

        {/* ══ HIDDEN CAPTURE CONTAINER (A4-optimized) ══ */}
        <div
          ref={captureRef}
          style={{
            ...formStyle,
            width: '794px',
            position: 'absolute',
            top: '-10000px',
            left: '-10000px',
            border: '1px solid #000',
            padding: '8px',
            backgroundColor: '#ffffff',
            margin: '0',
          }}
        >
          {renderFormContent()}
        </div>
      </Box>

      {/* ══ Floating Action Buttons ══ */}
      <Box
        className="no-print forms-floating-actions"
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
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
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
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
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

export default FacultyClearance;