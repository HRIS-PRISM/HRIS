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

const InServiceTraining = () => {
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
        el.style.width = '8.27in';
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

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
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
            const formWidth = 8.27;
            const formHeight = 11.69;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const xOffset = (pageWidth - formWidth) / 2;
            const yOffset = (pageHeight - formHeight) / 2;
            
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, formWidth, formHeight);
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

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
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
            const formWidth = 8.27;
            const formHeight = 11.69;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const xOffset = (pageWidth - formWidth) / 2;
            const yOffset = (pageHeight - formHeight) / 2;
            
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, formWidth, formHeight);
            
            const fileName = `In-Service-Training-${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
            showSnackbar('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            showSnackbar('Error generating PDF', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // Reusable style for input lines
    const inputLineStyle = { 
        borderBottom: '1px solid black', 
        display: 'inline-block', 
        width: '200px', 
        marginLeft: '5px' 
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
                    padding: '0.5in',
                    width: '8.27in', 
                    minHeight: '11.69in', 
                    height: 'auto', 
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    margin: 'auto',
                    marginTop: '30px',
                    display: 'block',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                }}>

                    {/* Header Section */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '25px' }}>
                        <div style={{ marginRight: '15px' }}>
                            <img src={logo} alt="Logo" style={{ height: '90px', width: 'auto' }} />
                        </div>
                        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
                            <div style={{ fontSize: '14px' }}>Republic of the Philippines</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                EULOGIO "AMANG" RODRIGUEZ
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                INSTITUTE OF SCIENCE AND TECHNOLOGY
                            </div>
                            <div style={{ fontSize: '14px' }}>Nagtahan, Sampaloc, Manila</div>
                        </div>
                    </div>

                    {/* Form Title */}
                    <div style={{ border: '2px solid black', padding: '10px', width: 'fit-content', margin: '0 auto 30px auto', textAlign: 'center' }}>
                        <b style={{ fontSize: '18px' }}>REPORT ON IN-SERVICE TRAINING</b>
                    </div>

                    {/* Personal Info Section */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span>Name:</span>
                                <span style={{ ...inputLineStyle, width: '250px' }}></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span>Position:</span>
                                <span style={{ ...inputLineStyle, width: '250px' }}></span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span>College/Office:</span>
                                <span style={{ ...inputLineStyle, width: '250px' }}></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span>Designation:</span>
                                <span style={{ ...inputLineStyle, width: '250px' }}></span>
                            </div>
                        </div>
                        <div style={{ width: '100%', borderBottom: '1px solid black', marginBottom: '20px', marginTop: '10px' }}></div>
                    </div>

                    {/* Main Content List */}
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        <ol type="I" style={{ paddingLeft: '20px' }}>
                            <li style={{ fontWeight: 'bold' }}>GENERAL INFORMATION</li>
                            <br />
                            <ol type="1" style={{ paddingLeft: '40px' }}>
                                <li style={{ marginBottom: '5px' }}>
                                    Title: <span style={{ ...inputLineStyle, width: '400px' }}></span>
                                </li>
                                <li style={{ marginBottom: '5px' }}>
                                    Sponsor: <span style={{ ...inputLineStyle, width: '400px' }}></span>
                                </li>
                                <li style={{ marginBottom: '5px' }}>
                                    Venue: <span style={{ ...inputLineStyle, width: '400px' }}></span>
                                </li>
                                <li style={{ marginBottom: '5px' }}>
                                    Inclusive Dates: <span style={{ ...inputLineStyle, width: '300px' }}></span>
                                </li>
                                <li>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                        <span>Authority:</span>
                                        <span style={{ ...inputLineStyle, width: '50px' }}></span>
                                        <span style={{ margin: '0 5px' }}>CHED/DECS/ASSN.MEMO No.</span>
                                        <span style={{ ...inputLineStyle, width: '120px' }}></span>
                                        <span style={{ margin: '0 5px' }}>Date:</span>
                                        <span style={{ ...inputLineStyle, width: '100px' }}></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginLeft: '68px' }}>Officer Order No.</span>
                                        <span style={{ ...inputLineStyle, width: '120px' }}></span>
                                        <span style={{ margin: '0 5px' }}>Date:</span>
                                        <span style={{ ...inputLineStyle, width: '100px' }}></span>
                                    </div>
                                </li>
                            </ol>
                            <br />
                            <li style={{ fontWeight: 'bold' }}>HIGHLIGHTS (Objectives, topics discussed, activities, outputs, etc.)</li>
                            <br />
                            <li style={{ fontWeight: 'bold' }}>PLANS (What you will do to implement what you learned)</li>
                            <br />
                            <li style={{ fontWeight: 'bold' }}>RECOMMENDATION (What you suggest to your College or the Institute to implement what you learned)</li>
                            <br />
                            <li style={{ fontWeight: 'bold' }}>ANNEXES (Program, handouts, project proposals, etc.)</li>
                        </ol>
                    </div>

                    {/* Signature Section */}
                    <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {/* Faculty Signature */}
                        <div style={{ textAlign: 'center', alignSelf: 'flex-end', width: '250px' }}>
                            <div style={{ borderBottom: '1px solid black', marginBottom: '5px' }}></div>
                            <div>Signature</div>
                            <div style={{ marginTop: '15px' }}>Date: <span style={{ ...inputLineStyle, width: '120px' }}></span></div>
                        </div>

                        {/* Noted By Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            
                            {/* Dean/Director */}
                            <div style={{ textAlign: 'center', width: '250px' }}>
                                <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>NOTED:</div>
                                <div style={{ borderBottom: '1px solid black', marginBottom: '5px' }}></div>
                                <div>Dean/Director</div>
                                <div style={{ marginTop: '15px' }}>Date: <span style={{ ...inputLineStyle, width: '120px' }}></span></div>
                            </div>

                            {/* President */}
                            <div style={{ textAlign: 'center', width: '250px' }}>
                                <div style={{ borderBottom: '1px solid black', marginBottom: '5px' }}></div>
                                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>ROGELIO T. MAMARADLO, Ed.D.</div>
                                <div style={{ fontSize: '13px' }}>SUC President I</div>
                                <div style={{ marginTop: '15px' }}>Date: <span style={{ ...inputLineStyle, width: '120px' }}></span></div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <div style={{ marginTop: '30px', fontSize: '10px', textAlign: 'right' }}>
                        (NOTE: Use this page for Part I&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br />
                        Use additional sheets for Part II-V)
                    </div>

                </div>
            </Box>

            {/* Floating Action Buttons (Bottom Right) */}
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
export default InServiceTraining;