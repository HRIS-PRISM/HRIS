import React, { useState, useRef } from "react";
import logo from "./logo.png";
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
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
// Adjust this path to where you saved the LoadingOverlay component
import LoadingOverlay from '../LoadingOverlay';

const LocatorSlip = () => {
    const printRef = useRef(null);

    // State for Loading Overlay and Notifications
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
        // Use Legal width to ensure it captures correctly on the canvas
        el.style.width = '8.5in'; 
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
            
            // Set PDF to Legal Size (8.5 x 13)
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
            
            const orig = ensureCaptureStyles(printRef.current);
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(printRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });
            restoreCaptureStyles(printRef.current, orig);

            const imgData = canvas.toDataURL('image/png');
            
            // Define Form Size (Legal)
            const formWidth = 8.5;
            const formHeight = 13;
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate ratio to fit form onto page (Safe Scaling)
            const ratio = Math.min(pageWidth / formWidth, pageHeight / formHeight);
            const renderWidth = formWidth * ratio;
            const renderHeight = formHeight * ratio;
            
            // Center the image
            const xOffset = (pageWidth - renderWidth) / 2;
            const yOffset = (pageHeight - renderHeight) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');
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
            
            // Set PDF to Legal Size (8.5 x 13)
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
            
            const orig = ensureCaptureStyles(printRef.current);
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(printRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });
            restoreCaptureStyles(printRef.current, orig);

            const imgData = canvas.toDataURL('image/png');
            
            const formWidth = 8.5;
            const formHeight = 13;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const ratio = Math.min(pageWidth / formWidth, pageHeight / formHeight);
            const renderWidth = formWidth * ratio;
            const renderHeight = formHeight * ratio;
            
            const xOffset = (pageWidth - renderWidth) / 2;
            const yOffset = (pageHeight - renderHeight) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
            const fileName = `Locator-Slip-${new Date().toISOString().split('T')[0]}.pdf`;
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
                <div ref={printRef} style={{ width: '100%', height: '100%' }}>
                    
                    {/* --- CONTENT WRAPPER (FIXED LEGAL SIZE) --- */}
                    <div style={{
                        width: '8.5in',
                        minHeight: '13in', // Legal Height
                        margin: 'auto',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column', // Stacks boxes vertically
                        backgroundColor: '#ffffff'
                    }}>
                        
                        {/* --- BOX 1 --- */}
                        <div style={{
                            border:'1px solid black',
                            padding:'1in',
                            width:'6.25in',
                            height:'5.5in',
                            fontFamily:'Arial, Helvetica, sans-serif',
                            margin:'auto',
                            backgroundColor: '#ffffff',
                            flexShrink: 0 // Prevent shrinking
                        }}>
                            <div style={{width: '5.25in', margin: 'auto'}}>
                                <div style={{position: 'relative', top: '-50px', float: 'left'}}>
                                    <img src={logo} alt="logo" height='100px'></img>
                                </div>
                                <div style={{position: 'relative', top: '-40px', textAlign: 'center', float: 'right'}}>
                                    <font size="3">Republic of the Philippines</font><br />
                                    <b><font size="4">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                                    <b><font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                                    <font size="3">Nagtahan, Sampaloc, Manila</font>
                                </div>
                                <div style={{position: 'relative', top: '-20px', left: '-1.5in', width: '7.75in', textAlign: 'center', float: 'left'}}>
                                    <font size="3"><b><u>LOCATOR SLIP</u></b></font><br />
                                </div>
                                <div style={{position: 'relative', top: '-5px', left: '3.5in', width: '5in', float: 'right'}}>
                                    <font size="3">Date: __________________</font><br />
                                </div>
                                <div style={{position: 'relative', top: '20px', left: '-0.75in', width: '7.75in', float: 'left'}}>
                                    <font size="3">
                                        NAME: <span style={{borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block', margin: '0 4px'}}></span> POSITION: <span style={{borderBottom: '1px solid black', minWidth: '150px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        PURPOSE: Official _______ Personal _______ Designation: <span style={{borderBottom: '1px solid black', minWidth: '180px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        DESTINATION: <span style={{borderBottom: '1px solid black', minWidth: '300px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        Time of Departure: <span style={{borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', margin: '0 4px'}}></span> Time of Arrival: <span style={{borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', margin: '0 4px'}}></span> <br />
                                        REASONS: <span style={{borderBottom: '1px solid black', minWidth: '300px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        <span style={{borderBottom: '1px solid black', minWidth: '400px', display: 'inline-block', margin: '4px 0'}}></span><br />
                                    </font>
                                </div>
                                <div style={{position: 'relative', top: '35px', left: '3in', width: '5in', float: 'right'}}>
                                    <font size="3">APPROVED:<br /><br />
                                        <span style={{borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block', margin: '4px 0'}}></span><br />
                                        &emsp;&emsp;&emsp;&emsp;Dean/Head of Office</font>
                                </div>
                            </div>
                        </div>

                        {/* --- BOX 2 --- */}
                        <div style={{
                            border:'1px solid black',
                            padding:'1in',
                            width:'6.25in',
                            height:'5.5in',
                            fontFamily:'Arial, Helvetica, sans-serif',
                            margin:'auto',
                            backgroundColor: '#ffffff',
                            flexShrink: 0 // Prevent shrinking
                        }}>
                            <div style={{width: '5.25in', margin: 'auto'}}>
                                <div style={{position: 'relative', top: '-50px', float: 'left'}}>
                                    <img src={logo} alt="logo" height='100px'></img>
                                </div>
                                <div style={{position: 'relative', top: '-40px', textAlign: 'center', float: 'right'}}>
                                    <font size="3">Republic of the Philippines</font><br />
                                    <b><font size="4">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                                    <b><font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                                    <font size="3">Nagtahan, Sampaloc, Manila</font>
                                </div>
                                <div style={{position: 'relative', top: '-20px', left: '-1.5in', width: '7.75in', textAlign: 'center', float: 'left'}}>
                                    <font size="3"><b><u>LOCATOR SLIP</u></b></font><br />
                                </div>
                                <div style={{position: 'relative', top: '-5px', left: '3.5in', width: '5in', float: 'right'}}>
                                    <font size="3">Date: __________________</font><br />
                                </div>
                                <div style={{position: 'relative', top: '20px', left: '-0.75in', width: '7.75in', float: 'left'}}>
                                    <font size="3">
                                        NAME: <span style={{borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block', margin: '0 4px'}}></span> POSITION: <span style={{borderBottom: '1px solid black', minWidth: '150px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        PURPOSE: Official _______ Personal _______ Designation: <span style={{borderBottom: '1px solid black', minWidth: '180px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        DESTINATION: <span style={{borderBottom: '1px solid black', minWidth: '300px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        Time of Departure: <span style={{borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', margin: '0 4px'}}></span> Time of Arrival: <span style={{borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', margin: '0 4px'}}></span> <br />
                                        REASONS: <span style={{borderBottom: '1px solid black', minWidth: '300px', display: 'inline-block', margin: '0 4px'}}></span><br />
                                        <span style={{borderBottom: '1px solid black', minWidth: '400px', display: 'inline-block', margin: '4px 0'}}></span><br />
                                    </font>
                                </div>
                                <div style={{position: 'relative', top: '35px', left: '3in', width: '5in', float: 'right'}}>
                                    <font size="3">APPROVED:<br /><br />
                                        <span style={{borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block', margin: '4px 0'}}></span><br />
                                        &emsp;&emsp;&emsp;&emsp;Dean/Head of Office</font>
                                </div>
                                <div style={{position: 'relative', top: '-480px', left: '-0.75in', width: '7.75in', float: 'left'}}>
                                    <font size="2">HRMDS Copy</font>
                                </div>
                            </div>
                        </div>

                        {/* --- FOOTER CERTIFICATION --- */}
                        <div style={{border: '1px solid black', padding: '0.5in', width: '7.25in', height: '1.3in', fontFamily: 'Arial, Helvetica, sans-serif', margin:'auto', flexShrink: 0}}>
                            <div style={{position: 'relative', top: '-25px', left: '0in;', width: '7.75in', textAlign: 'center', float: 'left'}}>
                                <font size="3"><b>C E R T I F I C A T I O N</b></font>      
                            </div>
                            <div style={{position: 'relative', top: '-5px', left: '0in;', width: '7.75in', float: 'left'}}>
                                <font size="3">
                                    &emsp;&emsp;&emsp;&emsp;This is to certify that Mr./Mrs./Miss _________________________________________<br />
                                    appeared on this date for said purpose.<br /><br />
                                    Date: ________________
                                </font>    
                            </div>
                            <div style={{position: 'relative', top: '-25px', left: '2.1in', width: '5in', float: 'right'}}>
                                <font size="3">_____________________________<br />
                                    &emsp;&emsp;&emsp;&emsp;NAME/POSITION</font>
                            </div>  
                        </div>
                    </div>
                    {/* --- CONTENT END --- */}
                </div>
            </Box>

            {/* Floating Action Buttons (Bottom Right) */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 30,
                    right: 30,
                    display: 'flex',
                    flexDirection: 'row', 
                    gap: 2,
                    zIndex: 1000,
                }}
            >
                <Zoom in={true} style={{ transitionDelay: '0ms' }}>
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

                <Zoom in={true} style={{ transitionDelay: '100ms' }}>
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
export default LocatorSlip;