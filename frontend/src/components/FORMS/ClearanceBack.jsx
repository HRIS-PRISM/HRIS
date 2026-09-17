import React, { useState, useRef } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useNavigate } from "react-router-dom";
import { 
  Box, 
  Fab, 
  Tooltip, 
  Zoom, 
  Snackbar, 
  Alert 
} from "@mui/material";
import LoadingOverlay from '../LoadingOverlay';
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_PRINTABLE_WIDTH_MM,
} from './FormPrintable';

const ClearanceBack = () => {
    const navigate = useNavigate();
    const formRef = useRef(null);

    // State for Loading Overlay and Notifications
    const [isGenerating, setIsGenerating] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleBack = () => {
        navigate("/clearance");
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const printPage = async () => {
        try {
            setIsGenerating(true);
            await printFormHtml(formRef.current, { title: 'Clearance Back' });
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
                `Clearance-Back-${new Date().toISOString().split('T')[0]}.pdf`,
                { title: 'Clearance Back' },
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
            flexDirection: 'column', 
            alignItems: 'center', 
            minHeight: '100vh', 
            bgcolor: '#ffffff', 
            position: 'relative',
            paddingBottom: '80px' 
        }}>
            <Box sx={{ width: '100%' }}>
                {/* ══════════════════════════════════════════
                    PRINTABLE AREA
                ══════════════════════════════════════════ */}
                <main className="form-print-area" ref={formRef}>
                  <div className="form-print-scale">
                    <div
                      className="form-page"
                      style={{
                        padding: '0.35in 0.4in',
                        width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
                        margin: '0 auto',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        marginTop: '30px',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                    {/* Instructions heading */}
                    <p style={{ fontSize: '14px', fontStyle: 'italic', fontWeight: 'bold', marginBottom: '12px' }}>
                        INSTRUCTIONS:
                    </p>

                    {/* Instruction list */}
                    <ol
                        type="1"
                        style={{
                            fontSize: '13px',
                            lineHeight: '1.85',
                            paddingLeft: '1.2em',
                            margin: 0,
                        }}
                    >
                        <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
                            Employees who are retiring, being separated, transferring to other agencies,
                            leaving the Philippines and going on leave of absence{' '}
                            <b>for more than 30 days</b> shall prepare this form in quadruplicate.
                        </li>

                        <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
                            This clearance should be duly accomplished before paying the last salary or
                            any money due the employees. (Specify which type of clearance: maternity
                            leave, retirement, transfer, etc.)
                        </li>

                        <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
                            If the employees are cleared from a unit/office/department, the
                            clearing/authorized official may attach to this clearance the pertinent
                            documents that shall prove that the employees are cleared of any obligation or
                            accountability from their office, if any, and tick the box under the
                            "Cleared" column before affixing their signatures.
                        </li>

                        <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
                            If the employees appear to have uncleared accountability/ies from a
                            unit/office/department, the clearing/authorized official shall attach to this
                            clearance the pertinent document/s that shall prove that the employees have
                            remaining obligation or accountability from their office further indicating the
                            necessary action/s that the employee must satisfy in order to be cleared, and
                            tick the box under the "Uncleared" column. The clearing/authorized official
                            must only sign this clearance corresponding to their name once the employee
                            have complied the necessary requirements and cleared of all the obligation/s
                            and accountability/ies from their office. They must also tick the box under
                            the "Cleared" column.
                        </li>

                        <li style={{ textAlign: 'justify', marginBottom: '14px' }}>
                            The HRMO shall distribute copies of approved clearance as follows: original to
                            the employee; duplicate to be attached to the payroll or voucher; triplicate
                            to human resource unit file; and fourth copy to accounting/auditing office.
                        </li>

                        <li style={{ textAlign: 'justify' }}>
                            Processing of clearance certificate shall follow the order of number indicated.
                        </li>
                    </ol>

                    {/* Page label */}
                    <div style={{ fontSize: '11px', fontStyle: 'italic', textAlign: 'right', marginTop: '20px' }}>
                        Page 2 of 2
                    </div>
                    </div>
                  </div>
                </main>
                {/* ══ END of printable area ══ */}
            </Box>

            {/* Floating Action Buttons (Bottom Right) */}
            <Box className="no-print forms-floating-actions" sx={{position: 'fixed',
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
                            <ArrowBackIcon />
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
        </>
    );
};

export default ClearanceBack;