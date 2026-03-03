import React, { useState, useRef } from "react";
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

const IndividualFacultyLoading = () => {
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
            const fileName = `Individual-Faculty-Loading-${new Date().toISOString().split('T')[0]}.pdf`;
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
                    <div style={{ fontSize: '10px', marginBottom: '10px' }}>HRD FORM 009</div>

                    {/* Header Section */}
                    <div style={{ textAlign: 'center', marginBottom: '20px', lineHeight: '1.2' }}>
                        <div style={{ fontSize: '14px' }}>Republic of the Philippines</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            EULOGIO "AMANG" RODRIGUEZ
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            INSTITUTE OF SCIENCE AND TECHNOLOGY
                        </div>
                        <div style={{ fontSize: '14px' }}>Nagtahan, Sampaloc, Manila</div>
                        
                        <div style={{ marginTop: '15px', fontSize: '14px', fontWeight: 'bold' }}>
                            HUMAN RESOURCES MANAGEMENT OFFICE
                        </div>
                        
                        <div style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold', textDecoration: 'underline' }}>
                            INDIVIDUAL FACULTY LOADING SUMMARY
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '5px' }}>
                            SCHOOL YR _______
                        </div>
                    </div>

                    {/* Top Info Section: Flexbox for two columns */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ width: '48%', textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px solid black', marginBottom: '2px' }}>&nbsp;</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SURNAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MIDDLE NAME</div>
                            <div style={{ borderBottom: '1px solid black', margin: '10px 0 2px 0' }}>&nbsp;</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>COLLEGE</div>
                            <div style={{ borderBottom: '1px solid black', marginBottom: '2px' }}>&nbsp;</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>FIELD OF SPECIALIZATION</div>
                        </div>
                        <div style={{ width: '48%', textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px solid black', marginBottom: '2px' }}>&nbsp;</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>PLANTILLA POSITION</div>
                            <div style={{ borderBottom: '1px solid black', margin: '10px 0 2px 0' }}>&nbsp;</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>OFFICIAL TIME - 1ST SEM</div>
                            <div style={{ borderBottom: '1px solid black', marginBottom: '2px' }}>&nbsp;</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>OFFICIAL TIME - 2ND SEM</div>
                        </div>
                    </div>

                    <div style={{ width: '7.2in', margin: 'auto' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>FIRST SEMESTER REGULAR LOADS</div>
                        <table style={{ border: '1px solid black', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                            <tbody>
                                <tr>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>NO. OF UNITS</b></td>
                                    <td colSpan="2" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>CODE</b></td>
                                    <td colSpan="4" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>SUBJECT<br />DESCRIPTION</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>TIME</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>NO. OF<br />STUDENTS</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>REMARKS</b></td>
                                </tr>
                                {[...Array(7)].map((_, i) => (
                                    <tr key={`fs1-${i}`}>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="2" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="4" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <br />
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>SECOND SEMESTER REGULAR LOADS</div>
                        <table style={{ border: '1px solid black', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                            <tbody>
                                <tr>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>NO. OF UNITS</b></td>
                                    <td colSpan="2" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>CODE</b></td>
                                    <td colSpan="4" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>SUBJECT<br />DESCRIPTION</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>TIME</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>NO. OF<br />STUDENTS</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>REMARKS</b></td>
                                </tr>
                                {[...Array(7)].map((_, i) => (
                                    <tr key={`ss1-${i}`}>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="2" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="4" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <br />
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>
                            OTHER LOADS PART TIME/SERVICE CREDITS/HONORARIUM/SATURDAY OPPORTUNITY PROG.
                        </div>
                        <table style={{ border: '1px solid black', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                            <tbody>
                                <tr>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>NO. OF UNITS</b></td>
                                    <td colSpan="2" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>CODE</b></td>
                                    <td colSpan="4" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>SUBJECT<br />DESCRIPTION</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>TIME</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>NO. OF<br />STUDENTS</b></td>
                                    <td colSpan="3" style={{ height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}><b>REMARKS</b></td>
                                </tr>
                                {[...Array(7)].map((_, i) => (
                                    <tr key={`ol1-${i}`}>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="2" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="4" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                        <td colSpan="3" style={{ height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <br />
                        <br />

                        {/* Footer Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ width: '48%', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '40px' }}>SUBMITTED BY:</div>
                                <div style={{ borderBottom: '1px solid black', marginBottom: '2px' }}>&nbsp;</div>
                                <div style={{ fontSize: '12px' }}>SIGNATURE OVER PRINTED NAME</div>
                            </div>
                            <div style={{ width: '48%', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '40px' }}>CERTIFIED CORRECT</div>
                                <div style={{ borderBottom: '1px solid black', marginBottom: '2px' }}>&nbsp;</div>
                                <div style={{ fontSize: '12px' }}>DEAN</div>
                            </div>
                        </div>
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

export default IndividualFacultyLoading;