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
import LoadingOverlay from '../LoadingOverlay';

const LocatorSlip = () => {
    const printRef = useRef(null);
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

    // RAW PRINT using window.print() with CSS
const printPage = async () => {
    if (!printRef.current) return;
    try {
        setIsGenerating(true);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.27, 11.69] });

        const el = printRef.current;
        const orig = {
            position: el.style.position,
            left: el.style.left,
            width: el.style.width,
            backgroundColor: el.style.backgroundColor,
        };
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        el.style.width = '8.27in';
        el.style.backgroundColor = '#ffffff';

        await new Promise((r) => setTimeout(r, 150));

        const canvas = await html2canvas(el, {
            scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        });

        el.style.position = orig.position || '';
        el.style.left = orig.left || '';
        el.style.width = orig.width || '';
        el.style.backgroundColor = orig.backgroundColor || '';

        const imgData = canvas.toDataURL('image/png');
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
        
        // Auto-trigger print dialog instead of saving
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
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.27, 11.69] });

            const el = printRef.current;
            const orig = {
                position: el.style.position,
                left: el.style.left,
                width: el.style.width,
                backgroundColor: el.style.backgroundColor,
            };
            el.style.position = 'fixed';
            el.style.left = '-9999px';
            el.style.width = '8.27in';
            el.style.backgroundColor = '#ffffff';

            await new Promise((r) => setTimeout(r, 150));

            const canvas = await html2canvas(el, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });

            el.style.position = orig.position || '';
            el.style.left = orig.left || '';
            el.style.width = orig.width || '';
            el.style.backgroundColor = orig.backgroundColor || '';

            const imgData = canvas.toDataURL('image/png');
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
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

    const slipContent = (isHRMDS = false) => (
        <div style={{
            width: '8.27in',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            padding: '0.5in 0.75in 0.4in 0.75in',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            pageBreakInside: 'avoid',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <img src={logo} alt="logo" style={{ height: '80px', marginRight: '20px' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '10pt' }}>Republic of the Philippines</div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
                    <div style={{ fontSize: '10pt' }}>Nagtahan, Sampaloc, Manila</div>
                </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11pt', fontWeight: 'bold', textDecoration: 'underline' }}>LOCATOR SLIP</span>
            </div>

            {/* Date */}
            <div style={{ textAlign: 'right', marginBottom: '10px', fontSize: '10pt' }}>
                Date: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
            </div>

            {/* Fields */}
            <div style={{ fontSize: '10pt', lineHeight: '2' }}>
                <div>
                    NAME: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span>
                    &nbsp;&nbsp; POSITION: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
                </div>
                <div>
                    PURPOSE: Official <span style={{ display: 'inline-block', minWidth: '50px' }}></span>
                    Personal <span style={{ display: 'inline-block', minWidth: '50px' }}></span>
                    Designation: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '180px' }}></span>
                </div>
                <div>
                    DESTINATION: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '350px' }}></span>
                </div>
                <div>
                    Time of Departure: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '120px' }}></span>
                    &nbsp;&nbsp; Time of Arrival: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '120px' }}></span>
                </div>
                <div>
                    REASONS: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '350px' }}></span>
                </div>
                <div>
                    <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '450px' }}></span>
                </div>
            </div>

            {/* Approved */}
            <div style={{ textAlign: 'right', marginTop: '20px', fontSize: '10pt' }}>
                APPROVED:<br /><br />
                <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span><br />
                <span style={{ paddingLeft: '20px' }}>Dean/Head of Office</span>
            </div>

            {/* HRMDS Copy label */}
            {isHRMDS && (
                <div style={{ marginTop: '10px', fontSize: '9pt' }}>HRMDS Copy</div>
            )}
        </div>
    );

    return (
        <>
            {/* Print CSS */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .divider-line {
                        border-top: 1px dashed #999 !important;
                    }
                }
            `}</style>

            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                minHeight: '100vh', 
                bgcolor: '#f0f0f0', 
                position: 'relative' 
            }}>
                <Box sx={{ width: '100%', overflow: 'auto', paddingBottom: '100px' }}>
                    <div ref={printRef} id="print-area" style={{ backgroundColor: '#ffffff', width: '8.27in', margin: 'auto' }}>
                        
                        {/* Slip 1 */}
                        {slipContent(false)}

                        {/* Divider */}
                        <div className="divider-line" style={{ borderTop: '1px dashed #aaa', margin: '0 0.75in' }}></div>

                        {/* Slip 2 - HRMDS Copy */}
                        {slipContent(true)}

                        {/* Certification */}
                        <div style={{
                            padding: '0.3in 0.75in',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            fontSize: '10pt',
                            backgroundColor: '#ffffff',
                            borderTop: '1px dashed #aaa'
                        }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px', fontSize: '11pt' }}>
                                C E R T I F I C A T I O N
                            </div>
                            <div style={{ lineHeight: '2' }}>
                                &emsp;&emsp;This is to certify that Mr./Mrs./Miss{' '}
                                <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '250px' }}></span>
                                {' '}appeared on this date for said purpose.
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                <div>Date: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span></div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span><br />
                                    NAME/POSITION
                                </div>
                            </div>
                        </div>

                    </div>
                </Box>

                {/* FAB Buttons */}
                <Box className="no-print" sx={{ position: 'fixed', bottom: 60, right: 30, display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000 }}>
                    <Zoom in={true}>
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

export default LocatorSlip;