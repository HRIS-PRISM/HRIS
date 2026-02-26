import React, { useRef } from "react";
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


const IndividualFacultyLoading = () => {
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
        } catch (error) {
            console.error('Error generating print view:', error);
        }
    };

    const downloadPDF = async () => {
        if (!printRef.current) return;

        try {
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
            <div ref={printRef}>
            <div style={{
                border:'1px solid black',
                padding:'0.25in',
                width:'7.75in',
                height:'15.25in',
                fontFamily:'Arial, Helvetica, sans-serif',
                margin:'auto',
                marginTop:'50px',
                backgroundColor: '#ffffff'
            }}>
            <font size="2">HRD FORM 009</font>
                <div style={{width: '4in', textAlign: 'center', margin: 'auto'}}>
                    <font size="3"><b>EULOGIO "AMANG" RODRIGUEZ<br />
                    INSTITUTE OF SCIENCE AND TECHNOLOGY<br />
                    Nagtahan, Sampaloc, Manila<br /><br /></b></font>
                    <font size="2">HUMAN RESOURCES MANAGEMENT OFFICE<br /><br /></font>
                    <font size="3"><b>INDIVIDUAL FACULTY LOADING SUMMARY<br />
                    SCHOOL YR _______</b></font>
                </div>
            <br />
            <div style={{width: '3.5in', textAlign: 'center', float: 'left'}}>
                _________________________________<br />
                <b>SURNAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MIDDLE NAME</b><br />
                _________________________________<br />
                <b>COLLEGE</b> <br />
                _________________________________<br />
                <b>FIELD OF SPECIALIZATION</b>
                </div>
                <div style={{width: '3.5in', textAlign: 'center', float: 'right'}}>
                    _________________________________<br />
                    <b>PLANTILLA POSITION</b><br />
                    _________________________________<br />
                    <b>OFFICIAL TIME - 1ST SEM</b> <br />
                    _________________________________<br />
                    <b>OFFICIAL TIME - 2ND SEM</b>
                </div>
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <div style={{width: '7.25in', margin: 'auto'}}>
            <font size="2"><b>FIRST SEMESTER REGULAR LOADS</b></font>
            <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '7.25in', tableLayout: 'fixed'}}>
                <tr>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>NO. OF UNITS</b>
                    </td>
                    <td colSpan="2" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>CODE</b>
                    </td>
                    <td colSpan="4" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>SUBJECT<br />DESCRIPTION</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>TIME</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>NO. OF<br />STUDENTS</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>REMARKS</b>
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
            </table>
            <br />
            <br />
            <font size="2"><b>SECOND SEMESTER REGULAR LOADS</b></font>
            <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '7.25in', tableLayout: 'fixed'}}>
                <tr>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>NO. OF UNITS</b>
                    </td>
                    <td colSpan="2" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>CODE</b>
                    </td>
                    <td colSpan="4" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>SUBJECT<br />DESCRIPTION</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>TIME</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>NO. OF<br />STUDENTS</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>REMARKS</b>
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
            </table>
            <br />
            <br />
            <font size="2"><b>OTHER LOADS PART TIME/SERVICE CREDITS/HONORARIUM/SATURDAY OPPORTUNITY PROG.</b></font>
            <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '7.25in', tableLayout: 'fixed'}}>
                <tr>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>NO. OF UNITS</b>
                    </td>
                    <td colSpan="2" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>CODE</b>
                    </td>
                    <td colSpan="4" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>SUBJECT<br />DESCRIPTION</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>TIME</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>NO. OF<br />STUDENTS</b>
                    </td>
                    <td colSpan="3" style={{height: '0.35in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        <b>REMARKS</b>
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="2" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="4" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="3" style={{height: '0.25in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
            </table>
            <br />
            <br />
            <div style={{width: '3.5in', fontSize: '90%', float: 'left'}}>
            <b>SUBMITTED BY:</b>
            </div>
            <div style={{width: '3.5in', fontSize: '90%', float: 'right'}}>
            <b>CERTIFIED CORRECT</b>
            </div>
            <br />
            <br />
            <div style={{width: '3.5in', textAlign: 'center', float: 'left'}}>
            _________________________________<br />
            SIGNATURE OVER PRINTED NAME
            </div>
            <div style={{width: '3.5in', textAlign: 'center', float: 'right'}}>
            _________________________________<br />
            DEAN
            </div>
            </div>
        </div>
        </div>
        </div>
       
    );
};
export default IndividualFacultyLoading;

