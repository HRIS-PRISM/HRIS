import React, { useRef, useState } from 'react';
import logo from './logo.png';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const AssessmentClearance = () => {
  const captureRef = useRef(null);

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
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const baseFormStyle = {
    width: '190mm',
    minHeight: '277mm',
    margin: '0 auto',
    padding: '5mm',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '9px',
    color: '#000000',
  };

  const screenFormStyle = {
    ...baseFormStyle,
    border: '1px solid #000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    marginTop: '20px',
    marginBottom: '20px',
  };

  const captureFormStyle = {
    ...baseFormStyle,
    width: '794px',
    border: 'none',
    boxShadow: 'none',
    margin: 0,
    padding: '8px',
    position: 'absolute',
    top: '-10000px',
    left: '-10000px',
    visibility: 'hidden',
  };

  const tableStyle = {
    borderCollapse: 'collapse',
    width: '100%',
    tableLayout: 'fixed',
  };

  const borderedCell = (extra = {}) => ({
    border: '1px solid #000',
    padding: '3px 4px',
    fontSize: '9px',
    lineHeight: '1.2',
    verticalAlign: 'middle',
    fontFamily: 'Arial, Helvetica, sans-serif',
    ...extra,
  });

  const printPage = () => {
    const content = document.getElementById('assessment-clearance-content')?.innerHTML;
    if (!content) return;

    const printWindow = window.open('', '', 'width=900,height=650');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Assessment Clearance</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
            }

            .assessment-print-wrapper {
              width: 190mm;
              min-height: 277mm;
              margin: 0 auto;
              padding: 5mm;
              box-sizing: border-box;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9px;
              color: #000;
              overflow: hidden;
              border: none !important;
              box-shadow: none !important;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            tr {
              page-break-inside: avoid;
            }

            * {
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>

        <body>
          <div class="assessment-print-wrapper">
            ${content}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const downloadPDF = async () => {
    if (!captureRef.current) return;

    try {
      setIsGenerating(true);

      const el = captureRef.current;

      el.style.position = 'relative';
      el.style.top = '0';
      el.style.left = '0';
      el.style.visibility = 'visible';

      await new Promise((resolve) => setTimeout(resolve, 300));

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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 8;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

      pdf.save(
        `Assessment-Clearance-${new Date().toISOString().split('T')[0]}.pdf`,
      );

      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormContent = () => (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '82px',
          marginTop: '2px',
        }}
      >
        <img
          src={logo}
          alt="Logo"
          style={{
            position: 'absolute',
            left: '108px',
            top: '0px',
            width: '68px',
            height: '68px',
            objectFit: 'contain',
          }}
        />

        <div
          style={{
            textAlign: 'center',
            lineHeight: '1.2',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          <div style={{ fontSize: '10px' }}>Republic of the Philippines</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
            EULOGIO "AMANG" RODRIGUEZ
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
            INSTITUTE OF SCIENCE AND TECHNOLOGY
          </div>
          <div style={{ fontSize: '10px' }}>Nagtahan, Sampaloc, Manila</div>
        </div>

        <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '9px' }}>
          __________________
          <br />
          Date
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '6px' }}>
        <strong>
          <em style={{ fontSize: '11px' }}>
            ASSESSMENT CLEARANCE FOR PART-TIME FACULTY
          </em>
        </strong>

        <br />
        <br />

        <span style={{ fontSize: '9px' }}>
          1<sup>ST</sup> ____ 2<sup>ND</sup> ____ Semester/School year _____ - ______
        </span>
      </div>

      <table style={{ ...tableStyle, marginTop: '22px' }}>
        <tbody>
          <tr>
            <td colSpan="12" style={{ height: '0.2in', textAlign: 'center' }}>
              ________________________
            </td>
            <td colSpan="2">&nbsp;</td>
            <td colSpan="12" style={{ textAlign: 'center' }}>
              ________________________
            </td>
            <td colSpan="2" style={{ textAlign: 'center' }}>
              of
            </td>
            <td colSpan="12" style={{ textAlign: 'center' }}>
              ________________________
            </td>
          </tr>

          <tr>
            <td colSpan="12" style={{ textAlign: 'center' }}>
              Name
            </td>
            <td colSpan="2">&nbsp;</td>
            <td colSpan="12" style={{ textAlign: 'center' }}>
              Position
            </td>
            <td colSpan="2">&nbsp;</td>
            <td colSpan="12" style={{ textAlign: 'center' }}>
              Department
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tableStyle, marginTop: '18px' }}>
        <tbody>
          <tr>
            <td colSpan="13" style={borderedCell({ height: '0.22in', textAlign: 'center' })}>
              &nbsp;
            </td>
            <td colSpan="17" style={borderedCell({ textAlign: 'center', fontWeight: 'bold' })}>
              SIGNATURE
            </td>
            <td colSpan="5" style={borderedCell({ textAlign: 'center', fontWeight: 'bold' })}>
              DATE SIGNED
            </td>
          </tr>

          <tr>
            <td colSpan="13" style={borderedCell({ height: '0.68in', verticalAlign: 'top' })}>
              <strong>
                1.&nbsp;&nbsp;&nbsp;As to Area/College requirements.
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NBC 461/Research/Grade Sheets/
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MR/SALN&PDS/Liquidation
              </strong>
            </td>

            <td colSpan="17" style={borderedCell({ textAlign: 'center' })}>
              <br />
              _________________________________
              <br />
              <strong>COLLEGE DEAN</strong> (for Faculty Assigned in Colleges)
              <br />
              <strong>DIRECTOR OF INSTRUCTION</strong> (for Gen. Ed. Faculty)
              <br />
              <strong>ECC ADMINISTRATOR</strong> (for ECC Faculty)
            </td>

            <td colSpan="5" style={borderedCell({ textAlign: 'center' })}>
              &nbsp;
            </td>
          </tr>

          <tr>
            <td colSpan="13" style={borderedCell({ height: '0.58in', verticalAlign: 'top' })}>
              <strong>2.&nbsp;&nbsp;&nbsp;Recommending Approval</strong>
            </td>

            <td colSpan="17" style={borderedCell({ textAlign: 'center' })}>
              <br />
              _________________________________
              <br />
              <strong>DR. ERIC C. MENDOZA</strong>
              <br />
              Vice President for Academic Affairs
            </td>

            <td colSpan="5" style={borderedCell({ textAlign: 'center' })}>
              &nbsp;
            </td>
          </tr>

          <tr>
            <td colSpan="13" style={borderedCell({ height: '0.58in', verticalAlign: 'top' })}>
              <strong>3.&nbsp;&nbsp;&nbsp;Approved</strong>
            </td>

            <td colSpan="17" style={borderedCell({ textAlign: 'center' })}>
              <br />
              _________________________________
              <br />
              <strong>Engr. ROGELIO T. MAMARADLO</strong>
              <br />
              President
            </td>

            <td colSpan="5" style={borderedCell({ textAlign: 'center' })}>
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...tableStyle, marginTop: '10px' }}>
        <tbody>
          <tr>
            <td colSpan="32" style={{ backgroundColor: '#bfbfbf', height: '0.12in' }}>
              &nbsp;
            </td>
          </tr>

          <tr>
            <td
              colSpan="16"
              style={{
                height: '0.22in',
                verticalAlign: 'bottom',
                fontSize: '8px',
                padding: '2px 4px',
              }}
            >
              Email Address:
              <span style={{ marginLeft: '5px' }}>
                __________________________
              </span>
            </td>

            <td
              colSpan="16"
              style={{
                height: '0.22in',
                verticalAlign: 'bottom',
                fontSize: '8px',
                padding: '2px 4px',
              }}
            >
              Telephone/Cell Phone #:
              <span style={{ marginLeft: '5px' }}>
                ___________________
              </span>
            </td>
          </tr>

          <tr>
            <td
              colSpan="10"
              style={{
                height: '0.38in',
                fontSize: '8px',
                textAlign: 'center',
                verticalAlign: 'bottom',
                lineHeight: '1.1',
              }}
            >
              ________________________
              <br />
              Signature of Faculty Member
            </td>

            <td
              colSpan="10"
              style={{
                height: '0.38in',
                fontSize: '8px',
                textAlign: 'center',
                verticalAlign: 'bottom',
                lineHeight: '1.1',
              }}
            >
              ________________________
              <br />
              Date Fully Accomplished
            </td>

            <td
              colSpan="12"
              style={{
                height: '0.38in',
                fontSize: '8px',
                textAlign: 'center',
                verticalAlign: 'bottom',
                lineHeight: '1.1',
              }}
            >
              ______________________________
              <br />
              Vacation Address
            </td>
          </tr>

          <tr>
            <td colSpan="32" style={{ height: '0.08in' }}>
              &nbsp;
            </td>
          </tr>

          <tr>
            <td colSpan="32" style={{ backgroundColor: '#bfbfbf', height: '0.12in' }}>
              &nbsp;
            </td>
          </tr>

          <tr>
            <td
              colSpan="32"
              style={{
                height: '0.22in',
                fontSize: '8px',
                paddingTop: '4px',
              }}
            >
              <strong>
                DEADLINE OF SUBMISSION: ______________________________
              </strong>
            </td>
          </tr>

          <tr>
            <td colSpan="2" style={{ height: '0.18in' }}>
              &nbsp;
            </td>

            <td
              colSpan="30"
              style={{
                height: '0.18in',
                lineHeight: '1.15',
                fontSize: '8px',
              }}
            >
              : Faculty
              <br />
              : HRMS
              <br />
              : FMS (2 copies) 1 photocopy
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
        bgcolor: '#f5f5f5',
        position: 'relative',
      }}
    >
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>
        <div id="assessment-clearance-content" style={screenFormStyle}>
          {renderFormContent()}
        </div>

        <div ref={captureRef} style={captureFormStyle}>
          {renderFormContent()}
        </div>
      </Box>

      <Box
        className="no-print forms-floating-actions"
        sx={{
          position: 'fixed',
          bottom: '1in',
          right: 30,
          display: 'flex',
          gap: 2,
          zIndex: 1000,
        }}
      >
        <Zoom in>
          <Tooltip title="Print Form" placement="top">
            <Fab
              onClick={printPage}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
              }}
            >
              <PrintIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>

        <Zoom in>
          <Tooltip title="Download PDF" placement="top">
            <Fab
              onClick={downloadPDF}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
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
        <Alert
          severity={snackbar.severity}
          onClose={handleCloseSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AssessmentClearance;