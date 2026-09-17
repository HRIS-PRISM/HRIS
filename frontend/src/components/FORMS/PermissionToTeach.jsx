import React, { useState, useRef } from 'react';
import logo from './logo.png';
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
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_PRINTABLE_WIDTH_MM,
} from './FormPrintable';

const PermissionToTeach = () => {
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
      await printFormHtml(formRef.current, { title: 'Permission To Teach' });
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
        `Permission-To-Teach-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'Permission To Teach' },
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
    <Box sx={{
      display: 'flex', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      bgcolor: '#ffffff', 
      position: 'relative'
    }}>
      <Box sx={{ width: '100%', overflow: 'auto', paddingBottom: '100px' }}>
        <main className="form-print-area" ref={formRef}>
          <div className="form-print-scale">
            <div
              className="form-page"
              style={{
                padding: '0.25in',
                width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
                margin: '0 auto',
                marginTop: '30px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
          <div style={{ padding: '0.25in', width: '100%', margin: 'auto', maxWidth: `${FORM_PRINTABLE_WIDTH_MM - 12}mm` }}>
            <div style={{ width: '7.5in', margin: 'auto' }}>
              <div style={{ position: 'relative', top: '0px', float: 'left' }}>
                <img src={logo} height="100px" alt="Logo" />
              </div>
              <div style={{ position: 'relative', top: '20px', textAlign: 'center', float: 'right' }}>
                <font size="3">
                  Republic of the Philippines
                  <br />
                  <b>EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY</b>
                  <br />
                  Nagtahan, Sampaloc, Manila
                  <br />
                  Tel. No. 714-7178
                </font>
              </div>
            </div>

            <div style={{ position: 'relative', top: '70px', left: '-100px', textAlign: 'center', float: 'left' }}>
              ______________
              <br />
              Date
            </div>

            <div style={{ position: 'relative', top: '120px', left: '0px', float: 'left' }}>
              <b>
                The President
                <br />
                EARIST, Manila
              </b>
              <br />
              <br />
              <br />
              Sir/Madam:
              <br />
              <br />
              In connection with Dept. MC No. 17, s. 1986, I have the honor to request permission to teach after
              <br />
              office hours. In connection with this, I am submitting the following data or information about myself.
              <br />
              <br />
              <font size="2">Part 1</font>
              <br />

              <table style={{ border: '1px solid black', borderCollapse: 'collapse', width: '7.5in', tableLayout: 'fixed' }}>
                <tr>
                  <td colSpan="11" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}>
                    Name:{' '}
                    <span style={{ borderBottom: '1px solid black', minWidth: '300px', display: 'inline-block', margin: '0 4px' }}></span>
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Surname &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; First Name
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Middle Name
                  </td>
                  <td colSpan="5" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', verticalAlign: 'top' }}>
                    Civil Status:{' '}
                    <span style={{ borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', margin: '0 4px' }}></span>
                    <br />
                  </td>
                </tr>
                <tr>
                  <td colSpan="8" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}>Position:</td>
                  <td colSpan="8" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}>Actual Salary per Annum:</td>
                </tr>
                <tr>
                  <td colSpan="16" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}>School/Office where employed:</td>
                </tr>
                <tr>
                  <td colSpan="16" style={{ height: '0.6in', fontSize: '80%', border: '1px solid black' }}>
                    Nature of Duties: ___________________________________________________________________________________
                    <br />
                    _________________________________________________________________________________________________
                    <br />
                    _________________________________________________________________________________________________
                    <br />
                    <br />
                  </td>
                </tr>
              </table>

              <br />
              <font size="2">Part 2</font>
              <br />

              <table style={{ border: '1px solid black', borderCollapse: 'collapse', width: '7.5in', tableLayout: 'fixed' }}>
                <tr>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>Educational Qualification</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>Name of School</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>Degree</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>Year Completed</td>
                </tr>
                <tr>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}><i>Other Special Trainings:</i></td>
                  <td colSpan="12" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}>&nbsp;</td>
                </tr>
              </table>

              <br />
              <font size="2">Part 3</font>
              <br />

              <table style={{ border: '1px solid black', borderCollapse: 'collapse', width: '7.5in', tableLayout: 'fixed' }}>
                <tr>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center', verticalAlign: 'top' }}>
                    Nature of teaching job<br />(College/University)<br />
                  </td>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center', verticalAlign: 'top' }}>
                    Subject to be<br />taught<br />
                  </td>
                  <td colSpan="2" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center', verticalAlign: 'top' }}>
                    Time<br /><br />
                  </td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center', verticalAlign: 'top' }}>
                    Teaching Load for the<br />Semester (School)<br />
                  </td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center', verticalAlign: 'top' }}>
                    Total No. of hours to be<br />spent in outside<br />teaching
                  </td>
                </tr>
                <tr>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="2" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="2" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="2" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black' }}></td>
                  <td colSpan="3" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="2" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                  <td colSpan="4" style={{ height: '0.2in', fontSize: '80%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                </tr>
              </table>

              <br />
              <br />

              <span style={{ borderBottom: '1px solid black', minWidth: '250px', display: 'inline-block', margin: '4px 0' }}></span>
              <br />
              Signature of Teacher Over Printed Name
              <br />
              <br />
              <br />

              <div style={{ position: 'relative', left: '-25px', width: '8in', margin: 'auto', textAlign: 'center' }}>
                <font size="2">
                  <i>I hereby certify that Mr./Ms./Mrs. ________________________________ is physically fit for the teaching job.</i>
                  <br />
                  <br />
                  <span style={{ borderBottom: '1px solid black', minWidth: '250px', display: 'inline-block', margin: '4px 0' }}></span>
                  <br />
                  Signature of the Government Physician
                  <br />
                  <br />
                  <br />
                  <b><i>Recommending Approval:</i></b>
                  <br />
                  <br />
                  <span style={{ borderBottom: '1px solid black', minWidth: '250px', display: 'inline-block', margin: '4px 0' }}></span>
                  <br />
                  Signature of the College Dean
                  <br />
                  <br />
                  <br />
                  <i>Note: Attached request of the ________________________________ in accordance with DECS Order No. 64, s. 1962</i>
                </font>
              </div>
            </div>
          </div>
            </div>
          </div>
        </main>

        {/* Floating Action Buttons */}
        <Box className="no-print forms-floating-actions" sx={{position: 'fixed',
          bottom: '1in',
          right: 30,
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          zIndex: 1000,
        }}>
          <Zoom in={true} style={{ transitionDelay: '0ms' }}>
            <Tooltip title="Print Form" placement="top">
              <Fab
                color="primary"
                aria-label="print"
                onClick={printPage}
                sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}
              >
                <PrintIcon />
              </Fab>
            </Tooltip>
          </Zoom>

          <Zoom in={true} style={{ transitionDelay: '100ms' }}>
            <Tooltip title="Download PDF" placement="top">
              <Fab
                color="primary"
                aria-label="download"
                onClick={downloadPDF}
                sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}
              >
                <PictureAsPdfIcon />
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
    </Box>
    </>
  );
};

export default PermissionToTeach;