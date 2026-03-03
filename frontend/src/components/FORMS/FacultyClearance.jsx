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
// Adjust this path to where you saved your LoadingOverlay component
import LoadingOverlay from '../LoadingOverlay';

const FacultyClearance = () => {
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
        el.style.width = '8.27in'; // A4 Width
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
            
            const fileName = `Faculty-Clearance-${new Date().toISOString().split('T')[0]}.pdf`;
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
            
            {/* Main Content Container */}
            <Box sx={{ width: '100%', overflow: 'auto', paddingBottom: '100px' }}>
                
                {/* Printable Area */}
                <div ref={printRef} style={{
                    border: '1px solid black',
                    padding: '0.5in', 
                    width: '8.27in', // Standard A4 width
                    minHeight: '11.69in', // Standard A4 height
                    height: 'auto', // Allows expansion if content is long
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    margin: 'auto',
                    marginTop: '30px',
                    display: 'block',
                    boxSizing: 'border-box', 
                    backgroundColor: '#ffffff'
                }}>

                    {/* Header Section */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
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

                    {/* Title Section */}
                    <div style={{ 
                        textAlign: 'center', 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        marginBottom: '40px', 
                        textTransform: 'uppercase'
                    }}>
                        Faculty Clearance for Detailed Academic Holders
                    </div>

                    {/* Table 1: Certification Text */}
                    <table style={{ border: '0px', borderCollapse: 'collapse', width: '7.2in', tableLayout: 'fixed', margin: 'auto' }}>
                        <tbody>
                            <tr>
                                <td colSpan="4" style={{ height: '0.5in', verticalAlign: 'top' }}>
                                    &nbsp;
                                </td>
                                <td colSpan="36" style={{ height: '0.5in', verticalAlign: 'top' }}>
                                    This is to certify that due to the closing of <b><i><u>School Year</u></i></b> __________
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
                                    ______________________
                                </td>
                                <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                                <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
                                    ______________________
                                </td>
                                <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
                                    of
                                </td>
                                <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
                                    ____________________
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
                                    Name
                                </td>
                                <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                                <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
                                    Position
                                </td>
                                <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                                <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
                                    Department
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="40" style={{ height: '0.25in' }}>
                                    of the Eulogio "Amang" Rodriguez Institute of Science and Technology, is cleared of all accountabilities<br />
                                    as herein enumerated insofar as the Institute is concerned as of ____________________. This Faculty<br />
                                    Clearance is for the <b><i>70 Days Proportional Vacation Pay (PVP)</i></b> salary claim only. <b>(TO BE ACCOMPLISHED IN 4 COPIES)</b>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <br />

                    {/* Table 2: Signatories */}
                    <table style={{ borderCollapse: 'collapse', width: '7.2in', tableLayout: 'fixed', margin: 'auto' }}>
                        <tbody>
                            <tr>
                                <td colSpan="13" style={{ border: '1px solid black', height: '0.3in', fontSize: '90%', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                                <td colSpan="17" style={{ border: '1px solid black', height: '0.3in', fontSize: '90%', textAlign: 'center' }}>
                                    <b>SIGNATURE</b>
                                </td>
                                <td colSpan="5" style={{ border: '1px solid black', height: '0.3in', fontSize: '90%', textAlign: 'center' }}>
                                    <b>DATE SIGNED</b>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="13" style={{ border: '1px solid black', height: '0.5in', fontSize: '90%', verticalAlign: 'top' }}>
                                    <b>1.&nbsp;&nbsp;&nbsp;As to Area/College requirements.<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                        NBC 461/Research/Grade Sheets/<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                        MR/SALN&PDS/Liquidation </b>
                                    <br />
                                    <br />
                                    <br />
                                </td>
                                <td colSpan="17" style={{ border: '1px solid black', height: '0.5in', fontSize: '90%', textAlign: 'center' }}>
                                    <br />
                                    <br />
                                    <br />
                                    _________________________________________<br />
                                    <b>COLLEGE DEAN</b> (for Faculty Assigned in Colleges)<br />
                                    <b>DIRECTOR OF INSTRUCTION</b> (for Gen. Ed. Faculty)<br />
                                    <b>ECC ADMINISTRATOR</b> (for ECC Faculty)
                                </td>
                                <td colSpan="5" style={{ border: '1px solid black', height: '0.5in', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="13" style={{ border: '1px solid black', height: '0.5in', fontSize: '90%', verticalAlign: 'top' }}>
                                    <b>2.&nbsp;&nbsp;&nbsp;Recommending Approval</b> <br />
                                    <br />
                                    <br />
                                    <br />
                                    <br />
                                </td>
                                <td colSpan="17" style={{ border: '1px solid black', height: '0.5in', fontSize: '90%', textAlign: 'center' }}>
                                    <br />
                                    <br />
                                    <br />
                                    _________________________________________<br />
                                    <b>DR. ERIC C. MENDOZA</b><br />
                                    Vice President for Academic Affairs
                                </td>
                                <td colSpan="5" style={{ border: '1px solid black', height: '0.5in', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="13" style={{ border: '1px solid black', height: '0.5in', fontSize: '90%', verticalAlign: 'top' }}>
                                    <b>3.&nbsp;&nbsp;&nbsp;Approved </b> <br />
                                    <br />
                                    <br />
                                    <br />
                                    <br />
                                </td>
                                <td colSpan="17" style={{ border: '1px solid black', height: '0.5in', fontSize: '90%', textAlign: 'center' }}>
                                    <br />
                                    <br />
                                    <br />
                                    _________________________________________<br />
                                    <b>Engr. ROGELIO T. MAMARADLO</b><br />
                                    President
                                </td>
                                <td colSpan="5" style={{ border: '1px solid black', height: '0.5in', textAlign: 'center' }}>
                                    &nbsp;
                                </td>
                            </tr>
                        </tbody>
                    </table>  
                    <br />
                    
                    {/* Table 3: Bottom Section */}
                    <table style={{ border: '0px', borderCollapse: 'collapse', width: '7.2in', tableLayout: 'fixed', margin: 'auto' }}>
                        <tbody>
                            {/* REMOVED GRAY BACKGROUND */}
                            <tr>
                                <td colSpan="32" style={{ height: '0.25in' }}>
                                    &nbsp;
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="16" style={{ height: '0.4in', verticalAlign: 'bottom' }}>
                                    Email Address: __________________________
                                </td>
                                <td colSpan="16" style={{ height: '0.4in', verticalAlign: 'bottom' }}>
                                    Telephone/Cell Phone #: ___________________
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="10" style={{ height: '0.6in', fontSize: '90%', textAlign: 'center', verticalAlign: 'bottom' }}>
                                    ________________________<br />
                                    Signature of Faculty Member
                                </td>
                                <td colSpan="10" style={{ height: '0.6in', fontSize: '90%', textAlign: 'center', verticalAlign: 'bottom' }}>
                                    ________________________<br />
                                    Date Fully Accomplished
                                </td>
                                <td colSpan="12" style={{ height: '0.6in', fontSize: '90%', textAlign: 'center', verticalAlign: 'bottom' }}>
                                    ______________________________<br />
                                    Vacation Address
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="32" style={{ backgroundColor: 'white', height: '0.25in' }}>
                                    &nbsp;
                                </td>
                            </tr>
                            {/* REMOVED GRAY BACKGROUND */}
                            <tr>
                                <td colSpan="32" style={{ height: '0.25in' }}>
                                    &nbsp;
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="32" style={{ height: '0.4in' }}>
                                    <b>DEADLINE OF SUBMISSION: ______________________________ </b>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="2" style={{ height: '0.4in' }}>
                                    &nbsp;
                                </td>
                                <td colSpan="30" style={{ height: '0.4in' }}>
                                    : Faculty<br />
                                    : HRMS<br />
                                    : FMS (2 copies) 1 photocopy
                                </td>
                            </tr>
                        </tbody>
                    </table>

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

export default FacultyClearance;