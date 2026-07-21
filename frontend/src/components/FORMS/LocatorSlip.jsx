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

/* ─────────────────────────────────────────────────────────────
   Shared font constants — matches Leave component standard
────────────────────────────────────────────────────────────── */
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const FONT_SIZE_NORMAL = '10pt';
const FONT_SIZE_SMALL  = '10px';
const FONT_SIZE_TITLE  = '12pt';
const FONT_SIZE_HEADER = '11pt';

/* ─────────────────────────────────────────────────────────────
   Form style — fixed printable width, matches Leave approach
────────────────────────────────────────────────────────────── */
const formStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE_SMALL,
  width: '190mm',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const LocatorSlip = () => {
  const printRef  = useRef(null);
  const captureRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar        = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /* ── Native print — browser handles all scaling, same as Leave ── */
  const printPage = () => {
    const content = document.getElementById('locator-slip-content').innerHTML;
    const printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Locator Slip</title>
          <style>
            body {
              font-family: ${FONT_FAMILY};
              padding: 20px;
              background: #fff;
            }
            @page {
              size: A4 portrait;
              margin: 0.4in;
            }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  /* ── PDF download — capture from dedicated hidden container, same as Leave ── */
  const downloadPDF = async () => {
    if (!captureRef.current) return;
    try {
      setIsGenerating(true);
      const el = captureRef.current;

      // Temporarily make visible for capture
      el.style.position   = 'relative';
      el.style.top        = '0';
      el.style.left       = '0';
      el.style.visibility = 'visible';

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        allowTaint: true,
      });

      // Hide again
      el.style.position   = 'absolute';
      el.style.top        = '-10000px';
      el.style.left       = '-10000px';
      el.style.visibility = 'hidden';

      if (!canvas) throw new Error('Canvas generation failed');

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW  = pdf.internal.pageSize.getWidth();
      const pageH  = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW   = pageW - margin * 2;
      const imgH   = (canvas.height / canvas.width) * imgW;
      const imgData = canvas.toDataURL('image/png');

      let yPos       = margin;
      let remainingH = imgH;
      const usableH  = pageH - margin * 2;

      while (remainingH > 0) {
        const sliceH = Math.min(remainingH, usableH);
        pdf.addImage(imgData, 'PNG', margin, yPos, imgW, imgH);
        remainingH -= usableH;
        if (remainingH > 0) {
          pdf.addPage();
          yPos = margin - (imgH - sliceH);
        }
      }

      const fileName = `Locator-Slip-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Slip content — rendered for both visible + capture containers ── */
  const slipContent = (isHRMDS = false) => (
    <div style={{
      width: '100%',
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE_NORMAL,
      padding: '0.5in 0.75in 0.4in 0.75in',
      boxSizing: 'border-box',
      backgroundColor: '#ffffff',
      pageBreakInside: 'avoid',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <img src={logo} alt="logo" style={{ height: '80px', marginRight: '20px' }} />
        <div style={{ textAlign: 'center', flex: 1, fontFamily: FONT_FAMILY }}>
          <div style={{ fontSize: FONT_SIZE_SMALL }}>Republic of the Philippines</div>
          <div style={{ fontSize: FONT_SIZE_TITLE, fontWeight: 'bold' }}>EULOGIO "AMANG" RODRIGUEZ</div>
          <div style={{ fontSize: FONT_SIZE_TITLE, fontWeight: 'bold' }}>INSTITUTE OF SCIENCE AND TECHNOLOGY</div>
          <div style={{ fontSize: FONT_SIZE_SMALL }}>Nagtahan, Sampaloc, Manila</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: FONT_SIZE_HEADER, fontWeight: 'bold', textDecoration: 'underline', fontFamily: FONT_FAMILY }}>
          LOCATOR SLIP
        </span>
      </div>

      {/* Date */}
      <div style={{ textAlign: 'right', marginBottom: '10px', fontSize: FONT_SIZE_SMALL, fontFamily: FONT_FAMILY }}>
        Date: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
      </div>

      {/* Fields */}
      <div style={{ fontSize: FONT_SIZE_SMALL, lineHeight: '2', fontFamily: FONT_FAMILY }}>
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
      <div style={{ textAlign: 'right', marginTop: '20px', fontSize: FONT_SIZE_SMALL, fontFamily: FONT_FAMILY }}>
        APPROVED:<br /><br />
        <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span><br />
        <span style={{ paddingLeft: '20px', fontFamily: FONT_FAMILY }}>Dean/Head of Office</span>
      </div>

      {/* HRMDS Copy label */}
      {isHRMDS && (
        <div style={{ marginTop: '10px', fontSize: FONT_SIZE_SMALL, fontFamily: FONT_FAMILY }}>
          HRMDS Copy
        </div>
      )}
    </div>
  );

  /* ── Full printable content block ── */
  const renderFormContent = () => (
    <>
      {/* Slip 1 */}
      {slipContent(false)}

      {/* Divider */}
      <div className="divider-line" style={{ borderTop: '1px dashed #aaa', margin: '0 0.75in' }} />

      {/* Slip 2 - HRMDS Copy */}
      {slipContent(true)}

      {/* Certification */}
      <div style={{
        padding: '0.3in 0.75in',
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE_SMALL,
        backgroundColor: '#ffffff',
        borderTop: '1px dashed #aaa',
      }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px', fontSize: FONT_SIZE_HEADER, fontFamily: FONT_FAMILY }}>
          C E R T I F I C A T I O N
        </div>
        <div style={{ lineHeight: '2', fontFamily: FONT_FAMILY }}>
          &emsp;&emsp;This is to certify that Mr./Mrs./Miss{' '}
          <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '250px' }}></span>
          {' '}appeared on this date for said purpose.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontFamily: FONT_FAMILY }}>
          <div>
            Date: <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '150px' }}></span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px' }}></span><br />
            NAME/POSITION
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Print CSS — same pattern as Leave */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          #locator-slip-content, #locator-slip-content * { visibility: visible; }
          #locator-slip-content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
          .divider-line { border-top: 1px dashed #999 !important; }
        }
      `}</style>

      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', bgcolor: '#ffffff', position: 'relative' }}>
        <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>

          {/* ══ VISIBLE FORM FOR SCREEN ══ */}
          <div
            ref={printRef}
            id="locator-slip-content"
            style={formStyle}
          >
            {renderFormContent()}
          </div>

          {/* ══ HIDDEN CAPTURE CONTAINER (A4-optimized, same as Leave) ══ */}
          <div
            ref={captureRef}
            style={{
              ...formStyle,
              width: '794px',       // Lock to A4 width @ 96 dpi
              position: 'absolute',
              top: '-10000px',
              left: '-10000px',
              visibility: 'hidden',
              border: 'none',
              padding: '8px',
              margin: '0',
            }}
          >
            {renderFormContent()}
          </div>

        </Box>

        {/* FAB Buttons */}
        <Box
          className="no-print forms-floating-actions"
          sx={{ position: 'fixed', bottom: '1in', right: 30, display: 'flex', flexDirection: 'row', gap: 2, zIndex: 1000 }}
        >
          <Zoom in style={{ transitionDelay: '0ms' }}>
            <Tooltip title="Print Form" placement="top">
              <Fab
                aria-label="print"
                onClick={printPage}
                sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}
              >
                <PrintIcon sx={{ color: '#fff' }} />
              </Fab>
            </Tooltip>
          </Zoom>
          <Zoom in style={{ transitionDelay: '100ms' }}>
            <Tooltip title="Download PDF" placement="top">
              <Fab
                aria-label="download"
                onClick={downloadPDF}
                sx={{ bgcolor: '#6D2323', '&:hover': { bgcolor: '#8a4747' }, width: 56, height: 56 }}
              >
                <PictureAsPdfIcon sx={{ color: '#fff' }} />
              </Fab>
            </Tooltip>
          </Zoom>
        </Box>

        <LoadingOverlay open={isGenerating} message="Generating Document..." />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default LocatorSlip;