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

const RequestForID = () => {
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 11] });
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
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 11] });
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
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      const fileName = `Request-For-ID-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const slip = () => (
    <div style={{
      width: '6.5in',
      fontFamily: 'Arial, Helvetica, sans-serif',
      margin: 'auto',
      backgroundColor: '#ffffff',
      padding: '0.4in 0.5in',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <img src={logo} height={75} alt="Logo" style={{ marginRight: '16px' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '10pt' }}>Republic of the Philippines</div>
          <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
          <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
          <div style={{ fontSize: '10pt' }}>Nagtahan, Sampaloc, Manila</div>
        </div>
      </div>

      {/* Table */}
      <table style={{
        border: '1px solid black',
        borderCollapse: 'collapse',
        width: '100%',
        tableLayout: 'fixed',
        fontSize: '9pt',
      }}>
        {/* Title Row */}
        <tr>
          <td colSpan="3" style={{ border: '1px solid black', height: '0.3in', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt' }}>
            REQUEST FOR ID
          </td>
          <td style={{ border: '1px solid black', height: '0.3in', fontSize: '8pt', verticalAlign: 'top', padding: '2px 4px' }}>
            DEPT./OFFICE
          </td>
        </tr>
        {/* Name / Position / ID No */}
        <tr>
          <td colSpan="2" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>NAME:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>POSITION:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>ID No:</td>
        </tr>
        {/* TIN / Pag-ibig / GSIS BP / Blood Type */}
        <tr>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>TIN No:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>Pag-Ibig No:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>GSIS BP No:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>BLOOD TYPE:</td>
        </tr>
        {/* Philhealth / GSIS SSS / Sex */}
        <tr>
          <td colSpan="2" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>PHILHEALTH No:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>GSIS ID No/SSS No:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>SEX:</td>
        </tr>
        {/* Home Address / Tel / DOB */}
        <tr>
          <td colSpan="2" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>HOME ADDRESS:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>TELEPHONE/CELLPHONE No:</td>
          <td style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>DATE OF BIRTH:</td>
        </tr>
        {/* Address continuation */}
        <tr>
          <td colSpan="4" style={{ border: '1px solid black', height: '0.3in' }}>&nbsp;</td>
        </tr>
        {/* Divider */}
        <tr>
          <td colSpan="4" style={{ height: '2px', backgroundColor: 'black', border: 'none', padding: 0 }}></td>
        </tr>
        {/* Emergency */}
        <tr>
          <td colSpan="4" style={{ border: '1px solid black', height: '0.3in', fontWeight: 'bold', fontSize: '10pt', padding: '2px 4px' }}>
            IN CASE OF EMERGENCY, PLEASE NOTIFY:
          </td>
        </tr>
        <tr>
          <td colSpan="2" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>NAME:</td>
          <td colSpan="2" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>RELATIONSHIP:</td>
        </tr>
        <tr>
          <td colSpan="4" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>ADDRESS:</td>
        </tr>
        <tr>
          <td colSpan="4" style={{ border: '1px solid black', height: '0.3in' }}>&nbsp;</td>
        </tr>
        <tr>
          <td colSpan="4" style={{ border: '1px solid black', height: '0.3in', verticalAlign: 'top', padding: '2px 4px' }}>TELEPHONE/CELLPHONE No:</td>
        </tr>
      </table>

      {/* Signature */}
      <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '9pt' }}>Certified Correct:</div>
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '10pt' }}>
        <b>AMPARO M. MORALES, RGC, RPm</b><br />Chief, HRMS
      </div>
    </div>
  );

  return (
    <Box sx={{
      width: '100%',
      minHeight: '100vh',
      overflow: 'auto',
      backgroundColor: '#f0f0f0',
      paddingBottom: '120px',
      position: 'relative',
    }}>
      <div ref={printRef} style={{ backgroundColor: '#ffffff', paddingTop: '30px', paddingBottom: '30px' }}>
        {slip()}
        <div style={{ borderTop: '1px dashed #aaa', margin: '10px auto', width: '6.5in' }} />
        {slip()}
      </div>

      {/* Floating Action Buttons */}
      <Box className="no-print forms-floating-actions" sx={{position: 'fixed', bottom: 30, right: 30,
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

export default RequestForID;