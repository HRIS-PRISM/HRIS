import React, { useState, useRef } from 'react';
import logo from './logo.png';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Box,
  Fab,
  Tooltip,
  Zoom,
  Snackbar,
  Alert,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LoadingOverlay from '../LoadingOverlay';

const ScholarshipAgreement = () => {
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

  const printPage = async () => {
    if (!printRef.current) return;
    try {
      setIsGenerating(true);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
      const el = printRef.current;
      const orig = {
        position: el.style.position,
        left: el.style.left,
        width: el.style.width,
        backgroundColor: el.style.backgroundColor,
      };
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.width = '8.5in';
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
      const formWidth = 8.5;
      const formHeight = 13;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / formWidth, pageHeight / formHeight);
      const renderWidth = formWidth * ratio;
      const renderHeight = formHeight * ratio;
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
      const el = printRef.current;
      const orig = {
        position: el.style.position,
        left: el.style.left,
        width: el.style.width,
        backgroundColor: el.style.backgroundColor,
      };
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.width = '8.5in';
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
      const formWidth = 8.5;
      const formHeight = 13;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / formWidth, pageHeight / formHeight);
      const renderWidth = formWidth * ratio;
      const renderHeight = formHeight * ratio;
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
      const fileName = `Scholarship-Agreement-${new Date().toISOString().split('T')[0]}.pdf`;
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
    <Box sx={{ position: 'relative' }}>
      {/* printRef on wrapper div, no border */}
      <div
        ref={printRef}
        style={{
          padding: '0.25in',
          width: '8in',
          minHeight: '13in',
          fontFamily: 'Arial, Helvetica, sans-serif',
          margin: 'auto',
          marginTop: '50px',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ padding: '0.25in', width: '7.5in', margin: 'auto' }}>
          <div style={{ width: '7.5in', margin: 'auto' }}>
            <div style={{ position: 'relative', top: '0px', float: 'left' }}>
              <img src={logo} alt="Logo" height="100px" />
            </div>
            <div style={{ position: 'relative', top: '20px', textAlign: 'center', float: 'right' }}>
              <p style={{ fontSize: '3', margin: 0 }}>Republic of the Philippines</p>
              <p style={{ fontSize: '4', fontWeight: 'bold', margin: 0 }}>
                EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY
              </p>
              <p style={{ fontSize: '4', margin: 0 }}>Nagtahan, Sampaloc, Manila</p>
              <p style={{ fontSize: '3', margin: 0 }}>Tel. No. 714-7178</p>
            </div>
          </div>
          <div style={{ position: 'relative', top: '50px', width: '7.5in', textAlign: 'center', margin: 'auto', display: 'flex', flexDirection: 'column', marginTop: '-19px' }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px' }}>SCHOLARSHIP AGREEMENT</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '-5px' }}>Scholarship Study Leave With Pay</p>
          </div>
          <div style={{ position: 'relative', top: '100px', left: '-10px', width: '7.75in', margin: 'auto', marginTop: '-29px' }}>
            <p style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap' }}>
              &emsp;&emsp;&emsp;I <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block', margin: '0 4px' }}></span>, in consideration of the scholarship, fellowship, training or study
            </p>
            <p style={{ marginTop: '-14px', display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap' }}>
              grant granted to me by the <span style={{ borderBottom: '1px solid black', minWidth: '300px', display: 'inline-block', margin: '0 4px' }}></span> under
            </p>
            <p style={{ marginTop: '-10px', display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap' }}>
              <span style={{ borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block', margin: '0 4px' }}></span> and of payment of my salary by the Republic of the Philippines
            </p>
            <p style={{ textIndent: '3em', marginTop: '-19px', marginBottom: '-10px' }}><sup>(type of scholarship)</sup></p>
            <p style={{ marginTop: '5px', marginBottom: '-10px' }}>
              during the period of such scholarship, fellowship, training or study grant, do hereby agree, acknowledge, understand and accept;
            </p><br />

            <ol type="a">
              <li>To keep up with the necessary standards of scholarship or accomplishment;</li><br />
              <li>To live up to the terms and conditions of this grant;</li><br />
              <li>To conduct myself in such a manner as not to bring disgrace or dishonor to myself and/or to my country;</li><br />
              <li>To return immediately upon the termination of my scholarship, fellowship, training or study grant;</li><br />
              <li>
                To serve the office which sends me abroad or any other government offices or instrumentality as<br />
                the exigencies of the service may require, along the field of my specialist or training, for a period<br />
                of not less than 3 years for every year of my fellowship or training or a fraction thereof not less<br />
                than on 3 years;
              </li><br />
              <li>
                To refund in full to the financing agency or office of the Philippine Government such amount or<br />
                amounts as may have been defrayed for my transportation, salary, allowances and other<br />
                expenses incident to my scholarship, fellowship, training or study grant for;<br /><br />
                <ol type="1">
                  <li>
                    Failure to render, in full or in part, the required length of service referred to in sub-paragraph<br />
                    (c) above on account of voluntary resignation, retirement, separation from the service<br />
                    through my own fault or other causes within my control;
                  </li><br />
                  <li>
                    My having been recalled following cancellation of scholarship, fellowship, training or study
                    grant due to my own fault or willful neglect pursuant to Section 11, or
                  </li><br />
                  <li>Violation of any provisions of this order.</li>
                </ol>
              </li>
            </ol>
            <br />
            <p style={{ marginTop: '-10px', display: 'flex', alignItems: 'baseline', flexWrap: 'nowrap' }}>
              &emsp;&emsp;&emsp; In witness hereof, I have hereunder set my hand this <span style={{ borderBottom: '1px solid black', minWidth: '60px', display: 'inline-block', margin: '0 4px' }}></span> day of <span style={{ borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', margin: '0 4px' }}></span> 20<span style={{ borderBottom: '1px solid black', minWidth: '40px', display: 'inline-block', margin: '0 4px' }}></span>, Manila, Philippines.
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', top: '125px', left: '-50px', textAlign: 'center', float: 'right' }}>
          <p style={{ marginTop: '-15px', borderBottom: '1px solid black', minWidth: '200px', display: 'inline-block' }}></p>
          <p style={{ marginTop: '5px' }}>(Name & Signature of Scholar)</p>
        </div>

        <div style={{ position: 'relative', top: '225px', left: '25px', float: 'left' }}>
          <b>ATTESTED BY:</b>
        </div>

        <div style={{ position: 'relative', top: '300px', left: '-25px', textAlign: 'center', float: 'left' }}>
          <b>ROGELIO T. MAMARADLO</b>
          <p style={{ marginTop: '-4px' }}>SUC President I</p>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <Box sx={{
        position: 'fixed', bottom: 30, right: 30,
        display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000,
      }}>
        <Zoom in={true} style={{ transitionDelay: '0ms' }}>
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
  );
};

export default ScholarshipAgreement;