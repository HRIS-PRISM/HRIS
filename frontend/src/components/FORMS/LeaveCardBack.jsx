import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_LANDSCAPE_PRINTABLE_WIDTH_MM,
} from './FormPrintable';
import {
  Box,
  Fab,
  Tooltip,
  Zoom,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LoadingOverlay from '../LoadingOverlay';

const LeaveCardBack = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleBack = () => {
    navigate('/leave-card');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const printPage = async () => {
    if (!formRef.current) return;
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, {
        title: "Employee's Leave Card (Back)",
        orientation: 'landscape',
      });
    } catch (error) {
      console.error('Error printing form:', error);
      showSnackbar('Error printing form', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!formRef.current) return;
    try {
      setIsGenerating(true);
      await downloadFormHtml(
        formRef.current,
        `Leave-Card-Back-${new Date().toISOString().split('T')[0]}.pdf`,
        {
          title: "Employee's Leave Card (Back)",
          orientation: 'landscape',
        },
      );
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const pageStyle = {
    border: '1px solid black',
    padding: '0.25in',
    width: `${FORM_LANDSCAPE_PRINTABLE_WIDTH_MM}mm`,
    fontFamily: 'Arial, Helvetica, sans-serif',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  };

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
      <FormPrintStyles />
      <Box sx={{ width: '100%', overflow: 'auto', paddingBottom: '100px' }}>
        <main className="form-print-area" ref={formRef} style={{ marginTop: '30px' }}>
          <div className="form-print-scale">
            <div className="form-page" style={pageStyle}>
              <table
                style={{
                  border: '1px solid black',
                  borderCollapse: 'collapse',
                  width: '100%',
                  tableLayout: 'fixed',
                  margin: 'auto',
                }}
              >
                <tbody>
                  <tr>
                    <td
                      colSpan="3"
                      rowSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.25in',
                        fontSize: '90%',
                        textAlign: 'center',
                      }}
                    >
                      <b>PERIOD</b>
                    </td>
                    <td
                      colSpan="8"
                      rowSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.25in',
                        fontSize: '90%',
                        textAlign: 'center',
                      }}
                    >
                      <b>PARTICULARS</b>
                    </td>
                    <td
                      colSpan="10"
                      style={{
                        border: '1px solid black',
                        height: '0.25in',
                        fontSize: '90%',
                        textAlign: 'center',
                      }}
                    >
                      <b>VACATION LEAVE</b>
                    </td>
                    <td
                      colSpan="10"
                      style={{
                        border: '1px solid black',
                        height: '0.25in',
                        fontSize: '90%',
                        textAlign: 'center',
                      }}
                    >
                      <b>SICK LEAVE</b>
                    </td>
                    <td
                      colSpan="5"
                      rowSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.25in',
                        fontSize: '90%',
                        textAlign: 'center',
                      }}
                    >
                      <b>REMARKS</b>
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <b>EARNED</b>
                    </td>
                    <td
                      colSpan="3"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <b>
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/Pay
                      </b>
                    </td>
                    <td
                      colSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '70%',
                        textAlign: 'center',
                      }}
                    >
                      <b>BALANCE</b>
                    </td>
                    <td
                      colSpan="3"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <b>
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/o Pay
                      </b>
                    </td>
                    <td
                      colSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <b>EARNED</b>
                    </td>
                    <td
                      colSpan="3"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <b>
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/Pay
                      </b>
                    </td>
                    <td
                      colSpan="2"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '70%',
                        textAlign: 'center',
                      }}
                    >
                      <b>BALANCE</b>
                    </td>
                    <td
                      colSpan="3"
                      style={{
                        border: '1px solid black',
                        height: '0.5in',
                        fontSize: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <b>
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/o Pay
                      </b>
                    </td>
                  </tr>
                  {[...Array(29)].map((_, i) => (
                    <tr key={i}>
                      <td
                        colSpan="3"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="8"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="2"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="3"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="2"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="3"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="2"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="3"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="2"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="3"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        colSpan="5"
                        style={{
                          border: '1px solid black',
                          height: '0.25in',
                          fontSize: '80%',
                          textAlign: 'center',
                        }}
                      >
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </Box>

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
          <Tooltip title="Back to Front" placement="top">
            <Fab
              color="primary"
              aria-label="back"
              onClick={handleBack}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
            >
              <ArrowBackIosNewOutlinedIcon />
            </Fab>
          </Tooltip>
        </Zoom>

        <Zoom in style={{ transitionDelay: '100ms' }}>
          <Tooltip title="Print Form" placement="top">
            <Fab
              color="primary"
              aria-label="print"
              onClick={printPage}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
            >
              <PrintIcon />
            </Fab>
          </Tooltip>
        </Zoom>

        <Zoom in style={{ transitionDelay: '200ms' }}>
          <Tooltip title="Download PDF" placement="top">
            <Fab
              color="primary"
              aria-label="download"
              onClick={downloadPDF}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
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
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveCardBack;
