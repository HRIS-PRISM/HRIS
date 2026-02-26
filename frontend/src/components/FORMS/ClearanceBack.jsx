import React, { useRef } from "react";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


const ClearanceBack = () => {
    const handleBack = () => {
        navigate("/clearance");
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
            const fileName = `Clearance-Back-${new Date().toISOString().split('T')[0]}.pdf`;
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
            padding: '0.25in',
            width: '8in',
            height: '10.5in',
            fontFamily: 'Arial, Helvetica, sans-serif',
            alignContent: 'center',
            margin: 'auto',
            marginTop: '50px',
            backgroundColor: '#ffffff'
        }}>
            <font size="4">


            <i> INSTRUCTIONS: </i>
            <br />
            <br />


            <ol type="1">
                <li style={{textAlign: "justify", width: "100%"}}>Employees who are retiring, being separated, transferring to other agencies,
                leaving the Philippines and going on leave of absence <b>for more than 30 days</b> shall prepare this form in quadruplicate.<br /><br />
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>This clearance should be duly accomplished before paying the last salary or
                any money due the employees. (Specify which type of clearance: maternity leave, retirement, transfer, etc.)<br /><br />
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>If the employees are cleared from a unit/office/department, the
                clearing/authorized official may attach to this clearance the pertinent
                documents that shall prove that the employees are cleared of any obligation or
                accountability from their office, if any, and tick the box under the "Cleared"
                column before affixing their signatures.<br /><br />
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>If the employees appear to have uncleared accountability/ies from a
                unit/office/department, the clearing/authorized official shall attach to this
                clearance the pertinent document/s that shall prove that the employees have
                remaining obligation or accountability from their office further indicating the
                necessary action/s that the employee must satisfy in order to be cleared, and
                tick the box under the "Uncleared" column. The clearing/authorized official
                must only sign this clearance corresponding to their name once the employee
                have complied the necessary requirements and cleared of all the obligation/s
                and accountability/ies from their office. They must also tick the box under the
                "Cleared" column.<br /><br />              
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>The HRMO shall distribute copies of approved clearance as follows: original to
                the employee; duplicate to be attached to the payroll or voucher; triplicate to
                human resource unit file; and fourth copy to accounting/auditing office.<br /><br />
                </li>
                <li>Processing of clearance certificate shall follow the order of number indicated.</li><br /><br />
            </ol>
            </font>
            <div style={{fontSize: '75%', float: 'right'}}>
                <i>Page 2 of 2</i>
            </div>
            {/* Next Button */}
     <Button
     variant="contained"
     startIcon={<ArrowBackIcon />}
     onClick={handleBack}
     color="darkgray"
     sx={{
        position:'right',
        marginTop: '10px',


        '&:hover': {
            backgroundColor: 'black',
            color: 'lightgray'}
       
       
     }}
   
   >
   Back
   </Button>
        </div>
        </div>
    );
};


export default ClearanceBack;



