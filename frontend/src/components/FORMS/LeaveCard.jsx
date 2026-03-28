import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Box, 
  Fab, 
  Tooltip, 
  Zoom, 
  Snackbar, 
  Alert 
} from '@mui/material';
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
// Adjust this path to where you saved the LoadingOverlay component
import LoadingOverlay from '../LoadingOverlay';

const LeaveCard = () => {
  const navigate = useNavigate();
  const printRef = useRef(null);

  // State for Loading Overlay and Notifications
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleNext = () => {
    navigate('/leave-card-back');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const ensureCaptureStyles = (el) => {
    if (!el) return {};
    const orig = {
      backgroundColor: el.style.backgroundColor,
      width: el.style.width,
      visibility: el.style.visibility,
      display: el.style.display,
      position: el.style.position,
      left: el.style.left,
      zIndex: el.style.zIndex,
      opacity: el.style.opacity,
    };
    el.style.backgroundColor = '#ffffff';
    el.style.width = '11.25in'; // Specific landscape width
    el.style.visibility = 'visible';
    el.style.display = 'block';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.zIndex = '10000';
    el.style.opacity = '1';
    return orig;
  };

  const restoreCaptureStyles = (el, orig) => {
    if (!el || !orig) return;
    try {
        el.style.backgroundColor = orig.backgroundColor || '';
        el.style.width = orig.width || '';
        el.style.visibility = orig.visibility || '';
        el.style.display = orig.display || '';
        el.style.position = orig.position || '';
        el.style.left = orig.left || '';
        el.style.zIndex = orig.zIndex || '';
        el.style.opacity = orig.opacity || '';
    } catch (e) {
        /* noop */
    }
  };

  const printPage = async () => {
    if (!printRef.current) return;

    try {
      setIsGenerating(true);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'a4',
      });
      const orig = ensureCaptureStyles(printRef.current);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      restoreCaptureStyles(printRef.current, orig);

      const imgData = canvas.toDataURL('image/png');
      const formWidth = 11.25;
      const formHeight = 9.25;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / formWidth, pageHeight / formHeight);
      const renderWidth = formWidth * ratio;
      const renderHeight = formHeight * ratio;
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
      pdf.autoPrint();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
      
      showSnackbar('Print view generated', 'success');
    } catch (error) {
      console.error('Error generating print view:', error);
      showSnackbar('Error generating print view', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;

    try {
      setIsGenerating(true);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'a4',
      });
      const orig = ensureCaptureStyles(printRef.current);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      restoreCaptureStyles(printRef.current, orig);

      const imgData = canvas.toDataURL('image/png');
      const formWidth = 11.25;
      const formHeight = 9.25;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / formWidth, pageHeight / formHeight);
      const renderWidth = formWidth * ratio;
      const renderHeight = formHeight * ratio;
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
      const fileName = `Leave-Card-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper style for input lines
  const lineStyle = {
    borderBottom: '1px solid black',
    display: 'inline-block',
    width: '100%',
  };

  return (
    <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        bgcolor: '#ffffff', 
        position: 'relative' 
    }}>
        <Box sx={{ width: '100%', overflow: 'auto', paddingBottom: '100px' }}>
            
            {/* Print Area */}
            <div
                ref={printRef}
                style={{
                border: '1px solid black',
                padding: '0.25in',
                width: '11.25in',
                height: '9.25in',
                fontFamily: 'Arial, Helvetica, sans-serif',
                margin: 'auto',
                marginTop: '30px',
                display: 'block',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                }}
            >
                {/* Title */}
                <div
                style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                }}
                >
                EMPLOYEE'S LEAVE CARD
                </div>

                {/* Personal Info Section - 3 Columns using Flexbox */}
                <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    gap: '10px',
                }}
                >
                {/* Col 1 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Name:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                {/* Col 2 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Civil Status:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                {/* Col 3 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    GSIS Policy No.:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                </div>

                <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    gap: '10px',
                }}
                >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Position:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Entrance to Duty:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    TIN No.:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                </div>

                <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    gap: '10px',
                }}
                >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Status:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Unit:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    Nat'l Ref. Card No.:
                    </span>
                    <span style={lineStyle}></span>
                </div>
                </div>

                {/* Separator Line */}
                <div
                style={{ borderBottom: '1px solid black', marginBottom: '10px' }}
                ></div>

                {/* Main Table */}
                <table
                style={{
                    border: '1px solid black',
                    borderCollapse: 'collapse',
                    width: '100%',
                    tableLayout: 'fixed',
                    fontSize: '11px',
                }}
                >
                <tbody>
                    {/* Header Row 1 */}
                    <tr>
                    <td
                        colSpan="3"
                        rowSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        PERIOD
                    </td>
                    <td
                        colSpan="8"
                        rowSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        PARTICULARS
                    </td>
                    <td
                        colSpan="10"
                        style={{
                        border: '1px solid black',
                        height: '0.25in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        VACATION LEAVE
                    </td>
                    <td
                        colSpan="10"
                        style={{
                        border: '1px solid black',
                        height: '0.25in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        SICK LEAVE
                    </td>
                    <td
                        colSpan="5"
                        rowSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        REMARKS
                    </td>
                    </tr>
                    {/* Header Row 2 */}
                    <tr>
                    <td
                        colSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        EARNED
                    </td>
                    <td
                        colSpan="3"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/Pay
                    </td>
                    <td
                        colSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        BALANCE
                    </td>
                    <td
                        colSpan="3"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/o Pay
                    </td>
                    <td
                        colSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        EARNED
                    </td>
                    <td
                        colSpan="3"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/Pay
                    </td>
                    <td
                        colSpan="2"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        BALANCE
                    </td>
                    <td
                        colSpan="3"
                        style={{
                        border: '1px solid black',
                        height: '0.5in',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        }}
                    >
                        Absence
                        <br />
                        Undertime
                        <br />
                        W/o Pay
                    </td>
                    </tr>

                    {/* Data Rows */}
                    {[...Array(21)].map((_, i) => (
                    <tr key={i}>
                        <td
                        colSpan="3"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="8"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        >
                        {i === 0 ? <b>BAL. BROUGHT FORWARD</b> : ''}
                        </td>
                        <td
                        colSpan="2"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="3"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="2"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="3"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="2"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="3"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="2"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="3"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                        <td
                        colSpan="5"
                        style={{
                            border: '1px solid black',
                            height: '0.25in',
                            textAlign: 'center',
                        }}
                        ></td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </Box>

        {/* Floating Action Buttons (Bottom Right - ROW) */}
        <Box className="no-print forms-floating-actions" sx={{position: 'fixed',
                bottom: '1in',
                right: 30,
                display: 'flex',
                flexDirection: 'row', 
                gap: 2,
                zIndex: 1000,
            }}
        >
            {/* 1. Next Button */}
            <Zoom in={true} style={{ transitionDelay: '0ms' }}>
                <Tooltip title="Next Page" placement="top">
                    <Fab 
                        color="primary" 
                        aria-label="next" 
                        onClick={handleNext}
                        sx={{ 
                            bgcolor: '#6D2323', 
                            '&:hover': { bgcolor: '#8a4747' },
                            width: 56,
                            height: 56
                        }}
                    >
                        <ArrowForwardIosOutlinedIcon />
                    </Fab>
                </Tooltip>
            </Zoom>

            {/* 2. Print Button */}
            <Zoom in={true} style={{ transitionDelay: '100ms' }}>
                <Tooltip title="Print Form" placement="top">
                    <Fab 
                        color="primary" 
                        aria-label="print" 
                        onClick={printPage}
                        sx={{ 
                            bgcolor: '#6D2323', 
                            '&:hover': { bgcolor: '#8a4747' },
                            width: 56,
                            height: 56
                        }}
                    >
                        <PrintIcon />
                    </Fab>
                </Tooltip>
            </Zoom>

            {/* 3. Download PDF Button */}
            <Zoom in={true} style={{ transitionDelay: '200ms' }}>
                <Tooltip title="Download PDF" placement="top">
                    <Fab 
                        color="primary" 
                        aria-label="download" 
                        onClick={downloadPDF}
                        sx={{ 
                            bgcolor: '#6D2323', 
                            '&:hover': { bgcolor: '#8a4747' },
                            width: 56,
                            height: 56
                        }}
                    >
                        <PictureAsPdfIcon />
                    </Fab>
                </Tooltip>
            </Zoom>
        </Box>

        {/* Loading Overlay with Blur */}
        <LoadingOverlay open={isGenerating} message="Generating Document..." />

        {/* Snackbar for notifications */}
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
export default LeaveCard;