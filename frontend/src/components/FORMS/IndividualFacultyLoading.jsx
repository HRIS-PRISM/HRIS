import React, { useRef, useState } from 'react';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/* ── Style helpers ── */
const tbl = { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' };

const cell = (extra = {}) => ({
  padding: '2px 4px',
  verticalAlign: 'middle',
  fontSize: '10px',
  fontFamily: 'Arial, Helvetica, sans-serif',
  lineHeight: '1.3',
  textAlign: 'center',
  border: '1px solid #000',
  ...extra,
});

/* ── Reusable data rows for load tables ── */
const DataRows = ({ count = 7 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <tr key={i}>
        <td colSpan={3} style={cell({ height: '22px' })}>&nbsp;</td>
        <td colSpan={2} style={cell({ height: '22px' })}>&nbsp;</td>
        <td colSpan={4} style={cell({ height: '22px' })}>&nbsp;</td>
        <td colSpan={3} style={cell({ height: '22px' })}>&nbsp;</td>
        <td colSpan={3} style={cell({ height: '22px' })}>&nbsp;</td>
        <td colSpan={3} style={cell({ height: '22px' })}>&nbsp;</td>
      </tr>
    ))}
  </>
);

/* ── Reusable load table ── */
const LoadTable = ({ title }) => (
  <>
    <div
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        fontWeight: 'bold',
        marginBottom: '4px',
      }}
    >
      {title}
    </div>
    <table style={tbl}>
      <colgroup>
        {/* 18 virtual cols mapped to 6 logical cols */}
        <col style={{ width: '10%' }} />  {/* NO. OF UNITS (cols 1-3) */}
        <col />
        <col />
        <col style={{ width: '10%' }} />  {/* CODE (cols 4-5) */}
        <col />
        <col style={{ width: '28%' }} />  {/* SUBJECT DESCRIPTION (cols 6-9) */}
        <col />
        <col />
        <col />
        <col style={{ width: '17%' }} />  {/* TIME (cols 10-12) */}
        <col />
        <col />
        <col style={{ width: '15%' }} />  {/* NO. OF STUDENTS (cols 13-15) */}
        <col />
        <col />
        <col style={{ width: '20%' }} />  {/* REMARKS (cols 16-18) */}
        <col />
        <col />
      </colgroup>
      <tbody>
        <tr style={{ height: '32px' }}>
          <td colSpan={3} style={cell({ fontWeight: 'bold' })}>NO. OF UNITS</td>
          <td colSpan={2} style={cell({ fontWeight: 'bold' })}>CODE</td>
          <td colSpan={4} style={cell({ fontWeight: 'bold' })}>SUBJECT<br />DESCRIPTION</td>
          <td colSpan={3} style={cell({ fontWeight: 'bold' })}>TIME</td>
          <td colSpan={3} style={cell({ fontWeight: 'bold' })}>NO. OF<br />STUDENTS</td>
          <td colSpan={3} style={cell({ fontWeight: 'bold' })}>REMARKS</td>
        </tr>
        <DataRows count={7} />
      </tbody>
    </table>
  </>
);

/* ════════════════════════════════════════════════════════════
   IndividualFacultyLoading component
════════════════════════════════════════════════════════════ */
const IndividualFacultyLoading = () => {
  const printRef = useRef(null);
  const captureRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /* ── Native print ── */
  const printPage = () => {
    const content = document.getElementById('individual-faculty-loading-content').innerHTML;
    const printWindow = window.open('', '', 'width=900,height=650');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Individual Faculty Loading Summary</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            @page { size: A4 portrait; margin: 0.4in; }
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

  /* ── PDF download ── */
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
        width: 794, // A4 portrait @ 96dpi
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

      pdf.save(`Individual-Faculty-Loading-${new Date().toISOString().split('T')[0]}.pdf`);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Shared form style ── */
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
      {/* ══ FORM NUMBER ══ */}
      <div
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9px',
          marginBottom: '4px',
        }}
      >
        HRD FORM 009
      </div>

      {/* ══ HEADER ══ */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'Arial, Helvetica, sans-serif',
          lineHeight: '1.5',
          marginBottom: '10px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
          EULOGIO "AMANG" RODRIGUEZ<br />
          INSTITUTE OF SCIENCE AND TECHNOLOGY<br />
          Nagtahan, Sampaloc, Manila
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          HUMAN RESOURCES MANAGEMENT OFFICE
        </div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>
          INDIVIDUAL FACULTY LOADING SUMMARY<br />
          SCHOOL YR _______
        </div>
      </div>

      {/* ══ INFO FIELDS ══ */}
      <table style={{ ...{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }, marginBottom: '12px' }}>
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          <tr style={{ height: '22px' }}>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              _________________________________
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              _________________________________
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textAlign: 'center',
                fontWeight: 'bold',
                paddingBottom: '4px',
              }}
            >
              SURNAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MIDDLE NAME
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textAlign: 'center',
                fontWeight: 'bold',
                paddingBottom: '4px',
              }}
            >
              PLANTILLA POSITION
            </td>
          </tr>
          <tr style={{ height: '22px' }}>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              _________________________________
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              _________________________________
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textAlign: 'center',
                fontWeight: 'bold',
                paddingBottom: '4px',
              }}
            >
              COLLEGE
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textAlign: 'center',
                fontWeight: 'bold',
                paddingBottom: '4px',
              }}
            >
              OFFICIAL TIME - 1ST SEM
            </td>
          </tr>
          <tr style={{ height: '22px' }}>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              _________________________________
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              _________________________________
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              FIELD OF SPECIALIZATION
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              OFFICIAL TIME - 2ND SEM
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ LOAD TABLES ══ */}
      <div style={{ marginBottom: '10px' }}>
        <LoadTable title="FIRST SEMESTER REGULAR LOADS" />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <LoadTable title="SECOND SEMESTER REGULAR LOADS" />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <LoadTable title="OTHER LOADS PART TIME/SERVICE CREDITS/HONORARIUM/SATURDAY OPPORTUNITY PROG." />
      </div>

      {/* ══ SIGNATURES ══ */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                fontWeight: 'bold',
                paddingBottom: '16px',
              }}
            >
              SUBMITTED BY:
            </td>
            <td
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                fontWeight: 'bold',
                paddingBottom: '16px',
              }}
            >
              CERTIFIED CORRECT
            </td>
          </tr>
          <tr>
            <td style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10px', textAlign: 'center' }}>
              <div
                style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '3px',
                }}
              >
                SIGNATURE OVER PRINTED NAME
              </div>
            </td>
            <td style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10px', textAlign: 'center' }}>
              <div
                style={{
                  borderTop: '1px solid #000',
                  width: '80%',
                  margin: '0 auto',
                  paddingTop: '3px',
                }}
              >
                DEAN
              </div>
            </td>
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
          id="individual-faculty-loading-content"
          style={{ ...formStyle, marginTop: '30px' }}
        >
          {renderFormContent()}
        </div>

        {/* ══ HIDDEN CAPTURE CONTAINER (A4 landscape @ 96dpi) ══ */}
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

export default IndividualFacultyLoading;