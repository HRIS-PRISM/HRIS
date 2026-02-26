import React, { useRef } from "react";
import logo from './logo.png'
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


const FacultyClearance70Days = () => {
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
            const fileName = `Faculty-Clearance-70Days-${new Date().toISOString().split('T')[0]}.pdf`;
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
        <div
        ref={printRef}
        style={{
          border: "1px solid black",
          padding: "0.25in",
          width: "8in",
          fontFamily: "Arial, Helvetica, sans-serif",
          alignContent:'center',
          margin: 'auto',
          marginTop: '50px',
          backgroundColor: '#ffffff'
        }}
      >
                <div style={{width:'5.12in', margin:'auto'}}>
                <br />
                <br />
                <div style={{position:'relative', top:'10px', float:'left'}}>
                <img src={logo} alt="Logo" height="100px" />
                </div>
                    <div style={{position: 'relative', top: '20px', textAlign: 'center', float: 'right', }}>
                        <font size="3">Republic of the Philippines</font><br />
                        <b><font size="4">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                        <b><font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                        <font size="3">Nagtahan, Sampaloc, Manila</font>
                    </div>
                               
                    <div style={{width: '10in', position: 'relative', top: '80px', left: '-225px', textAlign: 'center', margin: 'auto'}}>
                        <b><font size="4">FACULTY CLEARANCE FOR 70 DAYS PROPORTIONAL VACATION (PVP)</font>  </b> <br />
                        (___________ to ___________)
                        <br />
                    </div>
                    <br />
                    <br />
                    <br />
                    <br />
                    <br />
                    <br />
                   
                </div>


                    <tbody>
                    <table style={{border: '0px', borderCollapse: 'collapse', width: '8in', tableLayout: 'fixed', margin: 'auto'}}>
                <tr>
                    <td colSpan="4" style={{height: '0.5in', verticalAlign: 'top'}}>
                        &nbsp;
                    </td>
                    <td colSpan="36" style={{height: '0.5in', verticalAlign: 'top'}}>
                        This is to certify that due to the closing of <b><i><u>School Year</u></i></b> __________
                    </td>
                </tr>
                <tr>
                    <td colSpan="12" style={{height: '0.25in', textAlign: 'center'}}>
                        ______________________
                    </td>
                    <td colSpan="2" style={{height: '0.25in', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="12" style={{height: '0.25in', textAlign: 'center'}}>
                        ______________________
                    </td>
                    <td colSpan="2" style={{height: '0.25in', textAlign: 'center'}}>
                        of
                    </td>
                    <td colSpan="12" style={{height: '0.25in', textAlign: 'center'}}>
                        ____________________
                    </td>
                </tr>
                <tr>
                    <td colSpan="12" style={{height: '0.25in', textAlign: 'center'}}>
                        Name
                    </td>
                    <td colSpan="2" style={{height: '0.25in', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="12" style={{height: '0.25in', textAlign: 'center'}}>
                        Position
                    </td>
                    <td colSpan="2" style={{height: '0.25in', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="12" style={{height: '0.25in', textAlign: 'center'}}>
                        Department
                    </td>
                </tr>
                <tr>
                    <td colSpan="40" style={{height: '0.25in'}}>
                        of the Eulogio "Amang" Rodriguez Istitute of Science and Technology, is cleared of all accountabilities<br />
                        as herein enumerated insofar as the Institute is concerned as of ____________________. This Faculty<br />
                        Clearance is for the <b><i>70 Days Proportional Vacation Pay (PVP)</i></b> salary claim only. <b>(TO BE ACCOMPLISHED IN 4 COPIES)</b>
                    </td>
                </tr>
                </table>


                <br />
                <table style={{borderCollapse: 'collapse', width: '7.5in', tableLayout: 'fixed', margin: 'auto'}}>
                <tr>
                    <td colSpan="13" style={{border: '1px solid black', height: '0.3in', fontSize: '90%', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                    <td colSpan="17" style={{border: '1px solid black', height: '0.3in', fontSize: '90%', textAlign: 'center'}}>
                        <b>SIGNATURE</b>
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.3in', fontSize: '90%', textAlign: 'center'}}>
                        <b>DATE SIGNED</b>
                    </td>
                </tr>
                <tr>
                    <td colSpan="13" style={{border: '1px solid black', height: '0.5in', fontSize: '90%', verticalAlign: 'top'}}>
                        <b>1.&nbsp;&nbsp;&nbsp;As to Area/College requirements.<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        NBC 461/Research/Grade Sheets/<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        MR/SALN&PDS/Liquidation </b>
                        <br />
                        <br />
                        <br />
                    </td>
                    <td colSpan="17" style={{border: '1px solid black', height: '0.5in', fontSize: '90%', textAlign: 'center'}}>
                        <br />
                        <br />
                        <br />
                        _________________________________________<br />
                        <b>COLLEGE DEAN</b> (for Faculty Assigned in Colleges)<br />
                        <b>DIRECTOR OF INSTRUCTION</b> (for Gen. Ed. Faculty)<br />
                        <b>ECC ADMINISTRATOR</b> (for ECC Faculty)
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.5in', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="13" style={{border: '1px solid black', height: '0.5in', fontSize: '90%', verticalAlign: 'top'}}>
                        <b>2.&nbsp;&nbsp;&nbsp;Recommending Approval</b> <br />
                        <br />
                        <br />
                        <br />
                        <br />
                    </td>
                    <td colSpan="17" style={{border: '1px solid black', height: '0.5in', fontSize: '90%', textAlign: 'center'}}>
                        <br />
                        <br />
                        <br />
                        _________________________________________<br />
                        <b>DR. ERIC C. MENDOZA</b><br />
                        Vice President for Academic Affairs
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.5in', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="13" style={{border: '1px solid black', height: '0.5in', fontSize: '90%', verticalAlign: 'top'}}>
                        <b>3.&nbsp;&nbsp;&nbsp;Approved </b> <br />
                        <br />
                        <br />
                        <br />
                        <br />
                    </td>
                    <td colSpan="17" style={{border: '1px solid black', height: '0.5in', fontSize: '90%', textAlign: 'center'}}>
                        <br />
                        <br />
                        <br />
                        _________________________________________<br />
                        <b>Engr. ROGELIO T. MAMARADLO</b><br />
                        President
                    </td>
                    <td colSpan="5" style={{border: '1px solid black', height: '0.5in', textAlign: 'center'}}>
                        &nbsp;
                    </td>
                </tr>
            </table>  
            <br />
            <table style={{border: '0px', borderCollapse: 'collapse', width: '7.5in', tableLayout: 'fixed', margin: 'auto'}}>
                <tr>
                    <td colSpan="32" style={{backgroundColor:'gray', height: '0.25in'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="16" style={{height: '0.4in', verticalAlign: 'bottom'}}>
                        Email Address: __________________________
                    </td>
                    <td colSpan="16" style={{height: '0.4in', verticalAlign: 'bottom'}}>
                        Telephone/Cell Phone #: ___________________
                    </td>
                </tr>
                <tr>
                    <td colSpan="10" style={{height: '0.6in', fontSize: '90%', textAlign: 'center', verticalAlign: 'bottom'}}>
                        ________________________<br />
                        Signature of Faculty Member
                    </td>
                    <td colSpan="10" style={{height: '0.6in', fontSize: '90%', textAlign: 'center', verticalAlign: 'bottom'}}>
                        ________________________<br />
                        Date Fully Accomplished
                    </td>
                    <td colSpan="12" style={{height: '0.6in', fontSize: '90%', textAlign: 'center', verticalAlign: 'bottom'}}>
                        ______________________________<br />
                        Vacation Address
                    </td>
                </tr>
                <tr>
                    <td colSpan="32" style={{backgroundColor:'white', height: '0.25in'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="32" style={{backgroundColor:'gray', height: '0.25in'}}>
                        &nbsp;
                    </td>
                </tr>
                <tr>
                    <td colSpan="32" style={{height: '0.4in'}}>
                        <b>DEADLINE OF SUBMISSION: ______________________________ </b>
                    </td>
                </tr>
                <tr>
            <td colSpan="2" style={{height: '0.4in'}}>
                &nbsp;
            </td>
            <td colSpan="30" style={{height: '0.4in'}}>
                : Faculty<br />
                : HRMS<br />
                : FMS (2 copies) 1 photocopy
            </td>
        </tr>
    </table>
                    </tbody>
                       






        </div>
        </div>
    );
};
export default FacultyClearance70Days;



