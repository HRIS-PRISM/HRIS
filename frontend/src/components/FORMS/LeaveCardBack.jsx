import React, { useRef } from "react";
import Button from "@mui/material/Button";
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';




const LeaveCardBack = () => {
    const handleBack = () => {
        navigate("/leave-card");
      };
   
    const navigate = useNavigate();
    const printRef = useRef(null);

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
        el.style.width = '11.25in';
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
        el.style.backgroundColor = orig.backgroundColor || '';
        el.style.width = orig.width || '';
        el.style.visibility = orig.visibility || '';
        el.style.display = orig.display || '';
        el.style.position = orig.position || '';
        el.style.left = orig.left || '';
        el.style.zIndex = orig.zIndex || '';
        el.style.opacity = orig.opacity || '';
    };

    const printPage = async () => {
        if (!printRef.current) return;

        try {
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
        } catch (error) {
            console.error('Error generating print view:', error);
        }
    };

    const downloadPDF = async () => {
        if (!printRef.current) return;

        try {
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
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };
    return (
        <div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={printPage}>
                Print
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadPDF}>
                Download PDF
            </Button>
        </div>
        <div ref={printRef} style={{
            border: '1px solid black',
            padding: '0.25in',
            width: '11.25in',
            height: '9.25in',
            fontFamily: 'Arial, Helvetica, sans-serif',
            margin:'auto',
            marginTop:'50px',
            backgroungColor: '#ffffff'
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
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
            </table>
            <Button
    variant="outline"
    endIcon={< ArrowBackIosNewOutlinedIcon/>}
    onClick={handleBack}
    color="darkgray"
    sx={{
        position:'right',
        marginTop:'5.5px',
        right:'-.15in',
        '&hover':{
            backgroungColor:'black',
            color:'lightgray'
        }
    }}>
        Back
    </Button>    
            </div>
            </div>


    );
};
export default LeaveCardBack;

