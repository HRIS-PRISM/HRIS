import React, { useState, useRef } from 'react';
import logo from './logo.png';
import {
  Box,
  Fab,
  Tooltip,
  Zoom,
  Snackbar,
  Alert,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LoadingOverlay from '../LoadingOverlay';
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_PRINTABLE_WIDTH_MM,
} from './FormPrintable';

const SubjectStillToBeTaken = () => {
  const formRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const printPage = async () => {
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, { title: 'Subject Still To Be Taken' });
    } catch (error) {
      console.error('Error printing form:', error);
      showSnackbar('Error printing form', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setIsGenerating(true);
      await downloadFormHtml(
        formRef.current,
        `Subject-Still-To-Be-Taken-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'Subject Still To Be Taken' },
      );
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
    <FormPrintStyles />
    <Box sx={{ position: 'relative' }}>
      <main className="form-print-area" ref={formRef}>
        <div className="form-print-scale">
          <div
            className="form-page"
            style={{
              width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
              margin: '0 auto',
              marginTop: '40px',
              fontFamily: 'Arial, Helvetica, sans-serif',
              backgroundColor: '#ffffff',
              padding: '0.5in 0.6in',
              boxSizing: 'border-box',
            }}
          >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <img src={logo} height={80} alt="Logo" style={{ marginRight: '20px' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '10pt' }}>Republic of the Philippines</div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
            <div style={{ fontSize: '10pt' }}>Nagtahan, Sampaloc, Manila</div>
          </div>
        </div>

        {/* Date */}
        <div style={{ textAlign: 'right', fontSize: '10pt', marginBottom: '16px' }}>
          <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '180px' }}></span><br />
          Date
        </div>

        {/* Addressee */}
        <div style={{ fontSize: '10pt', marginBottom: '12px' }}>
          <b>ROGELIO T. MAMARADLO, <em>Ed. D.</em></b><br />
          President<br />
          EARIST, Manila
        </div>

        {/* Sir */}
        <div style={{ fontSize: '10pt', marginBottom: '10px' }}>
          <b>Sir:</b>
        </div>

        {/* Body */}
        <div style={{ fontSize: '10pt', marginBottom: '12px', lineHeight: '1.8' }}>
          &nbsp;&nbsp;&nbsp;&nbsp;I have the honor to request permission to study in{' '}
          <span style={{ borderBottom: '1px solid black', minWidth: '220px', display: 'inline-block' }}></span><br />
          <span style={{ borderBottom: '1px solid black', minWidth: '180px', display: 'inline-block' }}></span>{' '}
          beginning{' '}
          <span style={{ borderBottom: '1px solid black', minWidth: '160px', display: 'inline-block' }}></span>{' '}
          outside of my Official time.
        </div>

        {/* Course */}
        <div style={{ textAlign: 'center', fontSize: '10pt', marginBottom: '8px' }}>
          <b>COURSE:</b>{' '}
          <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block' }}></span>
        </div>

        {/* Subjects Still To Be Taken Title */}
        <div style={{ textAlign: 'center', fontSize: '10pt', marginBottom: '8px' }}>
          <b><u>SUBJECTS STILL TO BE TAKEN</u></b>
        </div>

        {/* Subjects Table */}
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontSize: '10pt', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', width: '30%' }}><u>Subjects</u></td>
              <td style={{ textAlign: 'center', width: '20%' }}><u>Units</u></td>
              <td style={{ textAlign: 'center', width: '30%' }}><u>Subjects</u></td>
              <td style={{ textAlign: 'center', width: '20%' }}><u>Units</u></td>
            </tr>
            {[...Array(3)].map((_, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', paddingTop: '6px' }}>
                  <span style={{ borderBottom: '1px solid black', minWidth: '150px', display: 'inline-block' }}></span>
                </td>
                <td style={{ textAlign: 'center', paddingTop: '6px' }}>
                  <span style={{ borderBottom: '1px solid black', minWidth: '60px', display: 'inline-block' }}></span>
                </td>
                <td style={{ textAlign: 'center', paddingTop: '6px' }}>
                  <span style={{ borderBottom: '1px solid black', minWidth: '150px', display: 'inline-block' }}></span>
                </td>
                <td style={{ textAlign: 'center', paddingTop: '6px' }}>
                  <span style={{ borderBottom: '1px solid black', minWidth: '60px', display: 'inline-block' }}></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures row */}
        <table style={{ width: '100%', tableLayout: 'fixed', fontSize: '10pt', borderCollapse: 'collapse' }}>
          <tbody>
            {/* Very truly yours */}
            <tr>
              <td style={{ width: '50%' }}>&nbsp;</td>
              <td style={{ width: '50%' }}>Very truly yours,</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td style={{ paddingTop: '24px', textAlign: 'center' }}>
                <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block' }}></span><br />
                Signature Over Printed Name<br /><br />
                <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block' }}></span><br />
                Position
              </td>
            </tr>

            {/* Recommending Approval */}
            <tr>
              <td style={{ paddingTop: '20px' }}>RECOMMENDING APPROVAL:</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '24px', textAlign: 'center' }}>
                <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block' }}></span><br />
                Department Head/Area Chairman
              </td>
              <td>&nbsp;</td>
            </tr>

            {/* Approved */}
            <tr>
              <td style={{ paddingTop: '20px' }}>&nbsp;</td>
              <td style={{ paddingTop: '20px' }}>APPROVED:</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '24px', textAlign: 'center' }}>
                <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block' }}></span><br />
                Dean
              </td>
              <td>&nbsp;</td>
            </tr>

            {/* President */}
            <tr>
              <td>&nbsp;</td>
              <td style={{ paddingTop: '24px', textAlign: 'center' }}>
                <b>ROGELIO T. MAMARADLO</b><br />
                SUC President
              </td>
            </tr>
          </tbody>
        </table>
          </div>
        </div>
      </main>

      {/* Floating Action Buttons */}
      <Box className="no-print forms-floating-actions" sx={{position: 'fixed', bottom: 30, right: 30,
        display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000,
      }}>
        <Zoom in={true} style={{ transitionDelay: '0ms' }}>
          <Tooltip title="Print Form" placement="top">
            <Fab onClick={printPage} sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}>
              <PrintIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>
        <Zoom in={true} style={{ transitionDelay: '100ms' }}>
          <Tooltip title="Download PDF" placement="top">
            <Fab onClick={downloadPDF} sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}>
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
    </>
  );
};

export default SubjectStillToBeTaken;