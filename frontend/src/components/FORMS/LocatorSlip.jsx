import React, { useState, useRef } from "react";
import logo from "./logo.png";
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_PRINTABLE_WIDTH_MM,
} from './FormPrintable';
import { 
  Box, 
  Fab, 
  Tooltip, 
  Zoom, 
  Snackbar, 
  Alert 
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LoadingOverlay from '../LoadingOverlay';

/* ─────────────────────────────────────────────────────────────
   Shared font constants — matches Leave component standard
────────────────────────────────────────────────────────────── */
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const FONT_SIZE_NORMAL = '10pt';
const FONT_SIZE_SMALL  = '10px';
const FONT_SIZE_TITLE  = '12pt';
const FONT_SIZE_HEADER = '11pt';

/* ─────────────────────────────────────────────────────────────
   Form style — fixed printable width, matches Leave approach
────────────────────────────────────────────────────────────── */
const formStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE_SMALL,
  width: '190mm',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const LocatorSlip = () => {
  const formRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar        = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const printPage = async () => {
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, { title: 'Print Locator Slip' });
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
        `Locator-Slip-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'Locator Slip' },
      );
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Slip content — rendered for both visible + capture containers ── */
  const slipContent = (isHRMDS = false) => (
    <div style={{
      width: '100%',
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE_NORMAL,
      padding: '0.5in 0.75in 0.4in 0.75in',
      boxSizing: 'border-box',
      backgroundColor: '#ffffff',
      pageBreakInside: 'avoid',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <img src={logo} alt="logo" style={{ height: '80px', marginRight: '20px' }} />
        <div style={{ textAlign: 'center', flex: 1, fontFamily: FONT_FAMILY }}>
          <div style={{ fontSize: FONT_SIZE_SMALL }}>Republic of the Philippines</div>
          <div style={{ fontSize: FONT_SIZE_TITLE, fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
          <div style={{ fontSize: FONT_SIZE_TITLE, fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
          <div style={{ fontSize: FONT_SIZE_SMALL }}>Nagtahan, Sampaloc, Manila</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: FONT_SIZE_HEADER, fontWeight: 'bold', textDecoration: 'underline', fontFamily: FONT_FAMILY }}>
          LOCATOR SLIP
        </span>
      </div>

      {/* Date */}
      <div style={{ textAlign: 'right', marginBottom: '10px', fontSize: FONT_SIZE_SMALL, fontFamily: FONT_FAMILY }}>
        Date: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
      </div>

      {/* Fields */}
      <div style={{ fontSize: FONT_SIZE_SMALL, lineHeight: '2', fontFamily: FONT_FAMILY }}>
        <div>
          NAME: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span>
          &nbsp;&nbsp; POSITION: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
        </div>
        <div>
          PURPOSE: Official <span style={{ display: 'inline-block', minWidth: '50px' }}></span>
          Personal <span style={{ display: 'inline-block', minWidth: '50px' }}></span>
          Designation: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '180px' }}></span>
        </div>
        <div>
          DESTINATION: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '350px' }}></span>
        </div>
        <div>
          Time of Departure: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '120px' }}></span>
          &nbsp;&nbsp; Time of Arrival: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '120px' }}></span>
        </div>
        <div>
          REASONS: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '350px' }}></span>
        </div>
        <div>
          <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '450px' }}></span>
        </div>
      </div>

      {/* Approved */}
      <div style={{ textAlign: 'right', marginTop: '20px', fontSize: FONT_SIZE_SMALL, fontFamily: FONT_FAMILY }}>
        APPROVED:<br /><br />
        <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span><br />
        <span style={{ paddingLeft: '20px', fontFamily: FONT_FAMILY }}>Dean/Head of Office</span>
      </div>

      {/* HRMDS Copy label */}
      {isHRMDS && (
        <div style={{ marginTop: '10px', fontSize: FONT_SIZE_SMALL, fontFamily: FONT_FAMILY }}>
          HRMDS Copy
        </div>
      )}
    </div>
  );

  /* ── Full printable content block ── */
  const renderFormContent = () => (
    <>
      {/* Slip 1 */}
      {slipContent(false)}

      {/* Divider */}
      <div className="divider-line" style={{ borderTop: '1px dashed #aaa', margin: '0 0.75in' }} />

      {/* Slip 2 - HRMDS Copy */}
      {slipContent(true)}

      {/* Certification */}
      <div style={{
        padding: '0.3in 0.75in',
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE_SMALL,
        backgroundColor: '#ffffff',
        borderTop: '1px dashed #aaa',
      }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px', fontSize: FONT_SIZE_HEADER, fontFamily: FONT_FAMILY }}>
          C E R T I F I C A T I O N
        </div>
        <div style={{ lineHeight: '2', fontFamily: FONT_FAMILY }}>
          &emsp;&emsp;This is to certify that Mr./Mrs./Miss{' '}
          <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '250px' }}></span>
          {' '}appeared on this date for said purpose.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontFamily: FONT_FAMILY }}>
          <div>
            Date: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span><br />
            NAME/POSITION
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <FormPrintStyles />

      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', bgcolor: '#ffffff', position: 'relative' }}>
        <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>
          <main className="form-print-area" ref={formRef}>
            <div className="form-print-scale">
              <div
                className="form-page"
                style={{
                  ...formStyle,
                  width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
                }}
              >
                {renderFormContent()}
              </div>
            </div>
          </main>
        </Box>

        {/* FAB Buttons */}
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
    </>
  );
};

export default LocatorSlip;