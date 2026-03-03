import React, { useState, useRef } from 'react';
import logo from './logo.png';
import Button from "@mui/material/Button";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
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
} from "@mui/material";
// Adjust this path to where you saved your LoadingOverlay component
import LoadingOverlay from '../LoadingOverlay';

const Clearance = () => {
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
        navigate("/clearance-back");
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Capture helpers (Copied from AssessmentClearance for robustness)
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
        el.style.width = '8.5in'; // Specific to Legal size
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

            // Keep the Legal format [8.5, 13] specific to this form
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });

            const orig = ensureCaptureStyles(printRef.current);
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(printRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });

            restoreCaptureStyles(printRef.current, orig);

            const imgData = canvas.toDataURL('image/png');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Clearance form is full page, so 0, 0 offset
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
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

            // Keep the Legal format [8.5, 13] specific to this form
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });

            const orig = ensureCaptureStyles(printRef.current);
            await new Promise((resolve) => setTimeout(resolve, 100));

            const canvas = await html2canvas(printRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });

            restoreCaptureStyles(printRef.current, orig);

            const imgData = canvas.toDataURL('image/png');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            
            const fileName = `Clearance-Form-${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            showSnackbar('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            showSnackbar('Error generating PDF', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    /* ── Style helpers ── */
    const cellBase   = { fontSize: '11px', padding: '3px 5px' };
    const clearCell  = { ...cellBase, border: '1px solid black' };
    const noBorder   = { ...cellBase, border: '0px' };
    const grayHeader = { ...cellBase, backgroundColor: 'lightgray', border: '1px solid black', fontWeight: 'bold' };
    const divider    = { height: '2px', fontSize: '0%', backgroundColor: 'black', border: '0px', padding: 0 };

    const subRows = [
        {
            section: '1', label: 'Administrative Services', items: [
                { letter: 'a.', name: 'Supply and Property Procurement and Management Services', officer: 'DR. HIROMI T. KIKUCHI' },
                { letter: 'b.', name: 'Human Resource Welfare & Assistance',                    officer: 'AMPARO M. MORALES' },
                { letter: 'c.', name: 'Agency-accredited Union/Cooperative',                    officer: 'PERFITA NATAL' },
            ],
        },
        {
            section: '2', label: 'Library', items: [
                { letter: 'a.', name: 'Legal Office Library', officer: '' },
                { letter: 'b.', name: 'Library Services',     officer: 'CARINA ROMAQUIN' },
            ],
        },
        {
            section: '3', label: 'Finance and Assets Management', items: [
                { letter: 'a.', name: 'Financial Services',                          officer: 'DR. YOLANDA A. LARA' },
                { letter: 'b.', name: 'Transaction, Processing & Billing Services',  officer: '' },
                { letter: 'c.', name: 'Payroll & Services',                          officer: '' },
            ],
        },
        {
            section: '4', label: 'Professional and Institutional Development', items: [
                { letter: 'a.', name: 'Scholarship Services', officer: '' },
            ],
        },
    ];

    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            minHeight: '100vh', 
            bgcolor: '#ffffff', // White background to match other form
            position: 'relative' 
        }}>
            <Box sx={{ width: '100%', overflow: 'auto', paddingBottom: '100px' }}>
                
                {/* ══════════════════════════════════════════
                    PRINTABLE AREA
                ══════════════════════════════════════════ */}
                <div
                    ref={printRef}
                    style={{
                        width: '8.5in',
                        minHeight: '13in',
                        padding: '0.25in 0.3in',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '11px',
                        backgroundColor: '#ffffff',
                        margin: 'auto',
                        marginTop: '30px',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* CS Form label */}
                    <div style={{ fontSize: '10px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '6px' }}>
                        CS Form No. 7<br />Revised 2018
                    </div>

                    {/* ── Header: logo LEFT + text RIGHT, whole block centered ── */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '18px',
                        marginBottom: '6px',
                        marginLeft: '-1.1in',
                    }}>
                        {/* Logo */}
                        <img src={logo} alt="Logo" style={{ height: '90px', width: 'auto' }} />

                        {/* Institution text — centered within its column */}
                        <div style={{ textAlign: 'center', lineHeight: '1.6' }}>
                            <div style={{ fontSize: '12px' }}>Republic of the Philippines</div>
                            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
                            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
                            <div style={{ fontSize: '12px' }}>Nagtahan, Sampaloc, Manila</div>
                        </div>
                    </div>

                    {/* Form title */}
                    <div style={{ textAlign: 'center', marginBottom: '6px', lineHeight: '1.5' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>CLEARANCE FORM</div>
                        <div style={{ fontSize: '10px', fontStyle: 'italic' }}>(Instructions at the back)</div>
                    </div>

                    {/* ── Main table ── */}
                    <table style={{ border: '2px solid black', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>

                        {/* ── SECTION I ── */}
                        <tr>
                            <td colSpan="1"  style={grayHeader}>I</td>
                            <td colSpan="21" style={grayHeader}>PURPOSE</td>
                        </tr>
                        <tr>
                            <td colSpan="12" style={noBorder}>&nbsp;</td>
                            <td colSpan="10" style={{ ...noBorder, textAlign: 'center', paddingBottom: '4px' }}>
                                <span style={{ display: 'inline-block', width: '90%', borderBottom: '1px solid black' }} />
                                <br />Date of Filing
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" rowSpan="3" style={{ ...noBorder, verticalAlign: 'top' }}>
                                <br />TO:
                            </td>
                            <td colSpan="20" style={noBorder}>
                                <br />
                                <b><u>EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY</u></b><br />
                                I hereby request clearance from money, property and work-related accountabilities for:
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="3" style={{ ...noBorder, verticalAlign: 'top' }}>Purpose:</td>
                            <td colSpan="4" style={noBorder}>[ ] Transfer<br />[ ] Retirement</td>
                            <td colSpan="4" style={noBorder}>[ ] Resignation<br />[ ] Leave</td>
                            <td colSpan="9" style={noBorder}>
                                [ ] Other Mode of Separation:<br />
                                &nbsp;&nbsp;&nbsp;Please specify:{' '}
                                <span style={{ display: 'inline-block', width: '55%', borderBottom: '1px solid black' }} />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="20" style={noBorder}>
                                <br />Date of Effectivity:{' '}
                                <span style={{ display: 'inline-block', width: '74%', borderBottom: '1px solid black' }} />
                                <br />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="12" style={{ ...clearCell, padding: '7px 6px' }}>
                                Office of Assignment:{' '}
                                <span style={{ display: 'inline-block', width: '58%', borderBottom: '1px solid black' }} />
                                <br /><br />
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Position/SG/Step:{' '}
                                <span style={{ display: 'inline-block', width: '60%', borderBottom: '1px solid black' }} />
                            </td>
                            <td colSpan="10" style={{ ...clearCell, textAlign: 'center', padding: '7px 6px' }}>
                                <br />
                                <span style={{ display: 'inline-block', width: '85%', borderBottom: '1px solid black' }} />
                                <br />Name and Signature of Employee
                            </td>
                        </tr>
                        <tr><td colSpan="22" style={divider}></td></tr>

                        {/* ── SECTION II ── */}
                        <tr>
                            <td colSpan="1"  style={grayHeader}>II</td>
                            <td colSpan="21" style={grayHeader}>CLEARANCE FROM WORK-RELATED ACCOUNTABILITIES</td>
                        </tr>
                        <tr>
                            <td colSpan="22" style={{ ...noBorder, textAlign: 'center', fontSize: '10px' }}>
                                We hereby certify that this employee is cleared/not cleared of work-related accountabilities from this Unit/Office/Dept.
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="11" style={{ ...noBorder, textAlign: 'center', padding: '10px 4px' }}>
                                <span style={{ display: 'inline-block', width: '80%', borderBottom: '1px solid black' }} />
                                <br />Immediate Supervisor
                            </td>
                            <td colSpan="11" style={{ ...noBorder, textAlign: 'center', padding: '10px 4px' }}>
                                <span style={{ display: 'inline-block', width: '80%', borderBottom: '1px solid black' }} />
                                <br />Head of Office
                            </td>
                        </tr>
                        <tr><td colSpan="22" style={divider}></td></tr>

                        {/* ── SECTION III ── */}
                        <tr>
                            <td colSpan="1"  style={grayHeader}>III</td>
                            <td colSpan="21" style={grayHeader}>CLEARANCE FROM MONEY AND PROPERTY ACCOUNTABILITIES</td>
                        </tr>
                        {/* Column headers */}
                        <tr>
                            <td colSpan="8"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Name of Unit/Office/Department</td>
                            <td colSpan="2"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Cleared</td>
                            <td colSpan="2"  style={{ ...clearCell, textAlign: 'center', fontSize: '9px'  }}>Not Cleared</td>
                            <td colSpan="6"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Name of Clearing Officer/Official</td>
                            <td colSpan="4"  style={{ ...clearCell, textAlign: 'center', fontSize: '10px' }}>Signature</td>
                        </tr>

                        {/* Sub-sections */}
                        {subRows.map(({ section, label, items }) => (
                            <React.Fragment key={section}>
                                <tr>
                                    <td colSpan="1"  style={{ ...grayHeader, fontWeight: 'normal' }}>{section}.</td>
                                    <td colSpan="21" style={{ ...grayHeader, fontWeight: 'normal' }}><i>{label}</i></td>
                                </tr>
                                {items.map(({ letter, name, officer }) => (
                                    <tr key={letter}>
                                        <td colSpan="1" style={noBorder}>&nbsp;</td>
                                        <td colSpan="1" style={noBorder}>{letter}</td>
                                        <td colSpan="6" style={{ ...noBorder, fontSize: '10px' }}>{name}</td>
                                        <td colSpan="2" style={clearCell}>&nbsp;</td>
                                        <td colSpan="2" style={clearCell}>&nbsp;</td>
                                        <td colSpan="6" style={{ ...clearCell, textAlign: 'center' }}>
                                            {officer ? <b>{officer}</b> : <>&nbsp;</>}
                                        </td>
                                        <td colSpan="4" style={clearCell}>&nbsp;</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                        <tr><td colSpan="22" style={divider}></td></tr>

                        {/* ── SECTION IV ── */}
                        <tr>
                            <td colSpan="1"  style={grayHeader}>IV</td>
                            <td colSpan="21" style={grayHeader}>CERTIFICATION OF NO PENDING ADMINISTRATIVE CASE</td>
                        </tr>
                        <tr>
                            <td colSpan="1" style={noBorder}>&nbsp;</td>
                            <td colSpan="1" style={noBorder}>a.</td>
                            <td colSpan="6" style={{ ...noBorder, fontSize: '10px' }}>Internal Affairs Office/Legal Affairs Office</td>
                            <td colSpan="2" style={clearCell}>&nbsp;</td>
                            <td colSpan="2" style={clearCell}>&nbsp;</td>
                            <td colSpan="6" style={{ ...clearCell, textAlign: 'center' }}><b>DR. GIOVANNI L. AHUNIN</b></td>
                            <td colSpan="4" style={clearCell}>&nbsp;</td>
                        </tr>
                        <tr>
                            <td colSpan="4" style={noBorder}>&nbsp;</td>
                            <td colSpan="18" style={{ ...noBorder, fontSize: '10px', padding: '5px 4px' }}>
                                [ ]&nbsp;&nbsp;&nbsp;&nbsp;with pending administrative case<br />
                                [ ]&nbsp;&nbsp;&nbsp;&nbsp;with ongoing investigation (no formal charge yet)
                            </td>
                        </tr>
                        <tr><td colSpan="22" style={divider}></td></tr>

                        {/* ── SECTION V ── */}
                        <tr>
                            <td colSpan="1"  style={grayHeader}>V</td>
                            <td colSpan="21" style={grayHeader}>CERTIFICATION</td>
                        </tr>
                        <tr>
                            <td colSpan="22" style={{ ...noBorder, fontSize: '10px', lineHeight: '1.7', padding: '8px 5px' }}>
                                I hereby certify that this employee is cleared of work-related, money and property accountabilities from this agency. This certification
                                includes no pending administrative case from this agency.<br /><br />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="22" style={{ ...noBorder, fontSize: '10px', textAlign: 'center', padding: '6px 5px' }}>
                                <b><u>DR. ROGELIO T. MAMARADLO</u></b><br />
                                Signature over Printed Name of Agency Head
                            </td>
                        </tr>

                    </table>
                </div>
                {/* ══ END of printable area ══ */}

                {/* REMOVED THE STATIC NEXT BUTTON FROM HERE */}
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
                            <NavigateNextIcon />
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

export default Clearance;