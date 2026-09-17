import React, { useRef, useState } from 'react';
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
  const formRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const printPage = async () => {
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, { title: 'Print Individual Faculty Loading Summary' });
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
        `Individual-Faculty-Loading-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'Individual Faculty Loading Summary' },
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

export default IndividualFacultyLoading;