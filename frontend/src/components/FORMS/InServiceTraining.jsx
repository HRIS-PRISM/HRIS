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

/* ════════════════════════════════════════════════════════════
   InServiceTraining component
════════════════════════════════════════════════════════════ */
const InServiceTraining = () => {
  const formRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const printPage = async () => {
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, { title: 'Print Report on In-Service Training' });
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
        `In-Service-Training-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'Report on In-Service Training' },
      );
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

  const line = (width = '200px') => ({
    borderBottom: '1px solid black',
    display: 'inline-block',
    width,
    marginLeft: '5px',
  });

  /* ── Form content ── */
  const renderFormContent = () => (
    <>
      {/* ══ HEADER ══ */}
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: '10px', minHeight: '90px' }}>
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
        <div style={{ lineHeight: '1.6', fontFamily: 'Arial, Helvetica, sans-serif', paddingTop: '4px' }}>
          <div style={{ fontSize: '10px' }}>Republic of the Philippines</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
          <div style={{ fontSize: '10px' }}>Nagtahan, Sampaloc, Manila</div>
        </div>
      </div>

      {/* ══ FORM TITLE ══ */}
      <div
        style={{
          border: '2px solid black',
          padding: '6px 14px',
          width: 'fit-content',
          margin: '0 auto 16px auto',
          textAlign: 'center',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          fontWeight: 'bold',
        }}
      >
        REPORT ON IN-SERVICE TRAINING
      </div>

      {/* ══ PERSONAL INFO ══ */}
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          tableLayout: 'fixed',
          marginBottom: '6px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
        }}
      >
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          <tr style={{ height: '24px' }}>
            <td style={{ verticalAlign: 'bottom', paddingBottom: '2px' }}>
              Name: <span style={line('200px')} />
            </td>
            <td style={{ verticalAlign: 'bottom', paddingBottom: '2px' }}>
              Position: <span style={line('200px')} />
            </td>
          </tr>
          <tr style={{ height: '24px' }}>
            <td style={{ verticalAlign: 'bottom', paddingBottom: '2px' }}>
              College/Office: <span style={line('180px')} />
            </td>
            <td style={{ verticalAlign: 'bottom', paddingBottom: '2px' }}>
              Designation: <span style={line('180px')} />
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ borderBottom: '1px solid black', marginBottom: '12px' }} />

      {/* ══ MAIN CONTENT LIST ══ */}
      <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', lineHeight: '1.8' }}>
        <ol type="I" style={{ paddingLeft: '20px', margin: 0 }}>

          <li style={{ fontWeight: 'bold', marginBottom: '6px' }}>GENERAL INFORMATION</li>
          <ol type="1" style={{ paddingLeft: '30px', fontWeight: 'normal', marginBottom: '10px' }}>
            <li style={{ marginBottom: '4px' }}>
              Title: <span style={line('350px')} />
            </li>
            <li style={{ marginBottom: '4px' }}>
              Sponsor: <span style={line('330px')} />
            </li>
            <li style={{ marginBottom: '4px' }}>
              Venue: <span style={line('340px')} />
            </li>
            <li style={{ marginBottom: '4px' }}>
              Inclusive Dates: <span style={line('290px')} />
            </li>
            <li style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px', marginBottom: '4px' }}>
                <span>Authority:</span>
                <span style={line('40px')} />
                <span style={{ margin: '0 4px' }}>CHED/DECS/ASSN.MEMO No.</span>
                <span style={line('90px')} />
                <span style={{ margin: '0 4px' }}>Date:</span>
                <span style={line('80px')} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingLeft: '60px' }}>
                <span>Officer Order No.</span>
                <span style={line('90px')} />
                <span style={{ margin: '0 4px' }}>Date:</span>
                <span style={line('80px')} />
              </div>
            </li>
          </ol>

          <li style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            HIGHLIGHTS (Objectives, topics discussed, activities, outputs, etc.)
          </li>

          <li style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            PLANS (What you will do to implement what you learned)
          </li>

          <li style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            RECOMMENDATION (What you suggest to your College or the Institute to implement what you learned)
          </li>

          <li style={{ fontWeight: 'bold' }}>
            ANNEXES (Program, handouts, project proposals, etc.)
          </li>
        </ol>
      </div>

      {/* ══ SIGNATURE SECTION ══ */}
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          tableLayout: 'fixed',
          marginTop: '30px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
        }}
      >
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '40%' }} />
        </colgroup>
        <tbody>
          {/* Faculty signature — right-aligned */}
          <tr>
            <td />
            <td />
            <td style={{ textAlign: 'center', paddingBottom: '4px' }}>
              <div style={{ borderTop: '1px solid #000', width: '90%', margin: '0 auto', paddingTop: '3px' }}>
                Signature
              </div>
            </td>
          </tr>
          <tr style={{ height: '20px' }}>
            <td />
            <td />
            <td style={{ textAlign: 'center' }}>
              Date: <span style={line('100px')} />
            </td>
          </tr>

          {/* Spacer */}
          <tr style={{ height: '24px' }}><td colSpan={3} /></tr>

          {/* NOTED row */}
          <tr>
            <td style={{ fontWeight: 'bold', paddingBottom: '30px' }}>NOTED:</td>
            <td />
            <td />
          </tr>

          {/* Dean / President signatures */}
          <tr>
            <td style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', width: '90%', margin: '0 auto', paddingTop: '3px' }}>
                Dean/Director
              </div>
            </td>
            <td />
            <td style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', width: '90%', margin: '0 auto', paddingTop: '3px' }}>
                <strong>ROGELIO T. MAMARADLO, Ed.D.</strong>
              </div>
              <div>SUC President I</div>
            </td>
          </tr>
          <tr style={{ height: '20px' }}>
            <td style={{ textAlign: 'center' }}>
              Date: <span style={line('100px')} />
            </td>
            <td />
            <td style={{ textAlign: 'center' }}>
              Date: <span style={line('100px')} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ FOOTER NOTE ══ */}
      <div
        style={{
          marginTop: '20px',
          fontSize: '9px',
          textAlign: 'right',
          fontFamily: 'Arial, Helvetica, sans-serif',
          lineHeight: '1.5',
        }}
      >
        (NOTE: Use this page for Part I<br />
        Use additional sheets for Part II–V)
      </div>
    </>
  );

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
                ...formStyle,
                width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
                marginTop: '30px',
              }}
            >
              {renderFormContent()}
            </div>
          </div>
        </main>
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
    </>
  );
};

export default InServiceTraining;