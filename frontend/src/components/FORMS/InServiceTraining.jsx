import React, { useRef } from "react";
import logo from "./logo.png";
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


const InServiceTraining = () =>{
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
            const fileName = `In-Service-Training-${new Date().toISOString().split('T')[0]}.pdf`;
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
            border:'1px solid black',
            padding:'0.25in',
            width:'7.75in',
            height:'15in',
            fontFamily:'Arial, Helvetica, sans-serif',
            margin:'auto',
            marginTop:'50px',
            backgroundColor: '#ffffff'
        }}>
            <br />
            <br />
            <br />
            <br />
            <div style={{width:'5.25in', margin:'auto'}}>
                <div style={{position:'relative', top:'10px', float:'left'}}>
                    <img src={logo} alt="logo" height='100px'></img>
                </div>
                <div style={{position: 'relative', top: '20px', textAlign: 'center', float: 'right'}}>
                    <font size="3">Republic of the Philippines</font><br />
                    <b><font size="4">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                    <b><font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                    <font size="3">Nagtahan, Sampaloc, Manila</font>
                </div>
            </div>
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <div style={{border: '1px solid black', padding: '0.1in', width: '4in', textAlign: 'center', margin: 'auto'}}>
                <b><font size="4">REPORT ON IN-SERVICE TRAINING</font></b>
            </div>
            <br />
            <br />
            <div style={{textAlign: 'center', margin: 'auto'}}>
                Name: _______________________________&nbsp;&nbsp;&nbsp;Position: _________________________________
                <br />
                College/Office: _________________________&nbsp;&nbsp;&nbsp;Designation: ______________________________
                <br />
                -------------------------------------------------------------------------------------------------------------------------------------
                <br />
            </div>
            <br />


            <ol type="I">
            <li><b>GENERAL INFORMATION</b></li>
            <br />
            <ol type="1">
                <li>Title _____________________________________________________________________</li>
                <li>Sponsor __________________________________________________________________</li>
                <li>Venue ____________________________________________________________________</li>
                <li>Inclusive Dates _____________________________________________________________</li>
                <li>Authority: CHED/DECS/ASSN.MEMO No. __________________&nbsp;&nbsp;&nbsp;Date: ________________
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Officer Order No. _________________&nbsp;&nbsp;&nbsp;Date: ________________
                </li>
            </ol>
            <br />
                <li><b>HIGHLIGHTS</b> (Objectives, topics discussed, activities, outputs, etc.)</li>
                <li><b>PLANS</b> (What you will do to implement what you learned)</li>
                <li><b>RECOMMENDATION</b> (What you suggest to your College or the Institute to implement what you learned)</li>
                <li><b>ANNEXES</b> (Program, handouts, project proposals, etc.)</li>
                <br />
                <br />
                <br />
                <div style={{textAlign: 'center', float: 'right'}}>
                __________________________<br />
                Signature<br />
                Date: _____________________
                </div>
                <br />
                <br />
                <br />
                <br />
                &nbsp;&nbsp;NOTED:
                <br />
                <br />
                <br />
                <div style={{textAlign: 'center', float: 'left'}}>
                ___________________________<br />
                Dean/Director<br />
                Date: ______________________
                <br />
                <br />
                <br />
                <br />
                &nbsp;&nbsp;<b>ROGELIO T. MAMARADLO, Ed.D.</b><br />
                SUC President I
                <br />
                <br />
                <br />
                Date: ______________________
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
                <br />
                <br />
                <br />
                <br />
                <br />
                <div style={{fontSize: '55%', float: 'right'}}>
                (NOTE: Use this page for Part I&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br />
                Use additional sheets for Part II-V)
                </div>
               
            </ol>




        </div>
        </div>
    );
};
export default InServiceTraining;

