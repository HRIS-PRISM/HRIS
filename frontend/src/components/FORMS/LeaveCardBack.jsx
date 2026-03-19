import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
// Adjust this path to where you saved the LoadingOverlay component
import LoadingOverlay from '../LoadingOverlay';

const LeaveCardBack = () => {
    const navigate = useNavigate();
    const printRef = useRef(null);

    // State for Loading Overlay and Notifications
    const [isGenerating, setIsGenerating] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleBack = () => {
        navigate("/leave-card");
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
        el.style.width = '11.25in'; // Landscape width
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

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'a4' });
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

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'a4' });
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
            const fileName = `Leave-Card-Back-${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
            showSnackbar('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            showSnackbar('Error generating PDF', 'error');
        } finally {
            setIsGenerating(false);
        }
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
                
                <div ref={printRef} style={{
                    border: '1px solid black',
                    padding: '0.25in',
                    width: '11.25in',
                    height: '9.25in',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    margin: 'auto',
                    marginTop: '30px',
                    backgroundColor: '#ffffff' // Fixed typo 'backgroungColor'
                }}>
                    <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '11in', tableLayout: 'fixed', margin: 'auto'}}>
                        <tr>
                            <td colSpan="3" rowSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                                <b>PERIOD</b>
                            </td>
                            <td colSpan="8" rowSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                                <b>PARTICULARS</b>
                            </td>
                            <td colSpan="10" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                                <b>VACATION LEAVE</b>
                            </td>
                            <td colSpan="10" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                                <b>SICK LEAVE</b>
                            </td>
                            <td colSpan="5" rowSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                                <b>REMARKS</b>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                                <b>EARNED</b>
                            </td>
                            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                                <b>Absence<br />Undertime<br />W/Pay</b>
                            </td>
                            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '70%', textAlign: 'center'}}>
                                <b>BALANCE</b>
                            </td>
                            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                                <b>Absence<br />Undertime<br />W/o Pay</b>
                            </td>
                            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                                <b>EARNED</b>
                            </td>
                            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                                <b>Absence<br />Undertime<br />W/Pay</b>
                            </td>
                            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '70%', textAlign: 'center'}}>
                                <b>BALANCE</b>
                            </td>
                            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                                <b>Absence<br />Undertime<br />W/o Pay</b>
                            </td>
                        </tr>
                        {/* Row 3-24 (Empty Rows) */}
                        {[...Array(29)].map((_, i) => (
                            <tr key={i}>
                                <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                                <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>&nbsp;</td>
                            </tr>
                        ))}
                    </table>
                </div>
            </Box>

            {/* Floating Action Buttons (Bottom Right - ROW) */}
            <Box
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
                {/* 1. Back Button */}
                <Zoom in={true} style={{ transitionDelay: '0ms' }}>
                    <Tooltip title="Back to Front" placement="top">
                        <Fab 
                            color="primary" 
                            aria-label="back" 
                            onClick={handleBack}
                            sx={{ 
                                bgcolor: '#6D2323', 
                                '&:hover': { bgcolor: '#8a4747' },
                                width: 56,
                                height: 56
                            }}
                        >
                            <ArrowBackIosNewOutlinedIcon />
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

export default LeaveCardBack;