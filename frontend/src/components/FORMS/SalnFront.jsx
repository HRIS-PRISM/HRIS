import React, { useState, useRef } from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
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

const SalnFront = () => {
  const navigate = useNavigate();
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

  const handleNext = () => {
    navigate('/saln-back');
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
      const fileName = `SALN-Front-${new Date().toISOString().split('T')[0]}.pdf`;
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
      <div
        style={{
          padding: '0.25in',
          width: '8in',
          height: '13in',
          margin: 'auto',
          marginTop: '50px',
          marginBottom: '15%',
        }}
      >
        <table
          ref={printRef}
          style={{
            border: '1px solid white',
            borderCollapse: 'collapse',
            fontFamily: 'Arial, Helvetica, sans-serif',
            width: '7.5in',
            tableLayout: 'fixed',
            backgroundColor: '#ffffff',
          }}
        >
          <tr>
            <td colSpan="15" style={{ height: '0.1in', fontSize: '72.5%' }}>
              &nbsp;
            </td>
            <td colSpan="5" style={{ height: '0.1in', fontSize: '72.5%' }}>
              Revised as of January 2015
              <br />
              Per CSC Resolution No. 1500088
              <br />
              Promulgated on January 23, 2015
              <br />
              &nbsp;
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '110%', textAlign: 'center' }}>
              <b>SWORN STATEMENT OF ASSETS, LIABILITIES AND NET WORTH</b>
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '90%', textAlign: 'center' }}>
              As of ________________________
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '72.5%', textAlign: 'center' }}>
              &emsp;&emsp;(Required by R.A. 6713)
              <br /><br />
              <b>Note:</b>{' '}
              <i>Husband and wife who are both public officials and employees may file the required statements jointly or separately.</i>
            </td>
          </tr>
          <tr>
            <td colSpan="4" style={{ height: '0.2in', fontSize: '90%', textAlign: 'center' }}>&nbsp;</td>
            <td colSpan="4" style={{ height: '0.2in', fontSize: '90%', textAlign: 'center' }}>[ ] <i>Joint Filing</i></td>
            <td colSpan="4" style={{ height: '0.2in', fontSize: '90%', textAlign: 'center' }}>[ ] <i>Separate Filing</i></td>
            <td colSpan="4" style={{ height: '0.2in', fontSize: '90%', textAlign: 'center' }}>[ ] <i>Not Applicable</i></td>
            <td colSpan="4" style={{ height: '0.2in', fontSize: '90%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="3" style={{ height: '0.1in', fontSize: '80%', textAlign: 'left' }}>
              <br /><br /><b>DECLARANT:</b><br /><br /><br /><b>ADDRESS:</b><br /><br /><br /><b>SPOUSE:</b><br /><br /><br />
            </td>
            <td colSpan="8" style={{ height: '0.1in', fontSize: '80%', textAlign: 'left' }}>
              <br /><br />
              &emsp; ________________________________________<br />
              &emsp;&emsp;&emsp;(Family Name)&emsp;&emsp;&emsp;(First Name)&emsp;&emsp;(M.I.)<br /><br />
              &emsp; ________________________________________<br />
              &emsp; ________________________________________<br /><br />
              &emsp; ________________________________________<br />
              &emsp;&emsp;&emsp;(Family Name)&emsp;&emsp;&emsp;(First Name)&emsp;&emsp;(M.I.)<br /><br />
            </td>
            <td colSpan="4" style={{ height: '0.1in', fontSize: '80%', textAlign: 'left' }}>
              <br /><br />
              &emsp;<b>POSITION:</b><br />
              &emsp;<b>AGENCY/OFFICE:</b><br />
              &emsp;<b>OFFICE ADDRESS:</b><br /><br /><br />
              &emsp;<b>POSITION:</b><br />
              &emsp;<b>AGENCY/OFFICE:</b><br />
              &emsp;<b>OFFICE ADDRESS:</b><br /><br />
            </td>
            <td colSpan="6" style={{ height: '0.1in', fontSize: '80%', textAlign: 'left' }}>
              <br /><br />
              _______________________________<br />
              _______________________________<br />
              _______________________________<br />
              _______________________________<br /><br />
              _______________________________<br />
              _______________________________<br />
              _______________________________<br />
              _______________________________<br />
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '0%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.05in', fontSize: '0%', backgroundColor: 'black', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '0%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '95%', textAlign: 'center' }}>
              <b><u>UNMARRIED CHILDREN BELOW EIGHTEEN (18) YEARS OF AGE LIVING IN DECLARANT'S HOUSEHOLD</u></b>
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '0%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="10" style={{ height: '0.1in', fontSize: '72.5%', textAlign: 'center' }}><b>NAME</b></td>
            <td colSpan="6" style={{ height: '0.1in', fontSize: '72.5%', textAlign: 'center' }}><b>DATE OF BIRTH</b></td>
            <td colSpan="4" style={{ height: '0.1in', fontSize: '72.5%', textAlign: 'center' }}><b>AGE</b></td>
          </tr>
          <tr>
            <td colSpan="10" style={{ height: '0.1in', fontSize: '62.5%', textAlign: 'center' }}>
              <br />________________________________________________<br /><br />
              ________________________________________________<br /><br />
              ________________________________________________<br /><br />
              ________________________________________________<br /><br />
            </td>
            <td colSpan="6" style={{ height: '0.1in', fontSize: '62.5%', textAlign: 'center' }}>
              <br />____________________________________<br /><br />
              ____________________________________<br /><br />
              ____________________________________<br /><br />
              ____________________________________<br /><br />
            </td>
            <td colSpan="4" style={{ height: '0.1in', fontSize: '62.5%', textAlign: 'center' }}>
              <br />________________________<br /><br />
              ________________________<br /><br />
              ________________________<br /><br />
              ________________________<br /><br />
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '0%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.05in', fontSize: '0%', backgroundColor: 'black', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '0%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '95%', textAlign: 'center' }}>
              <b><u>ASSETS, LIABILITIES AND NETWORTH</u></b><br />
              <i>(Including those of the spouse and unmarried children below eighteen (18)<br />years of age living in declarant's household)</i>
              <br /><br />
            </td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '0%', textAlign: 'center' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan="20" style={{ height: '0.1in', fontSize: '95%', textAlign: 'left' }}>
              <b>1.&emsp;ASSETS<br /><br />&emsp;&emsp;a.&emsp;Real Properties*</b>
            </td>
          </tr>

          <table style={{ borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '7.5in', tableLayout: 'fixed' }}>
            <tr style={{ backgroundColor: 'lightgray' }}>
              <td colSpan="5" rowSpan="2" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>DESCRIPTION</b><br /><br />(e.g. lot, house and<br />lot, condominium<br />and improvements)
              </td>
              <td colSpan="5" rowSpan="2" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>KIND</b><br /><br />(e.g. residential,<br />commercial, industrial,<br />agricultural and mixed<br />use)
              </td>
              <td colSpan="5" rowSpan="2" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>EXACT<br /><br />LOCATION</b>
              </td>
              <td colSpan="3" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>ASSESSED<br /><br />VALUE</b>
              </td>
              <td colSpan="4" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>CURRENT FAIR<br /><br />MARKET VALUE</b>
              </td>
              <td colSpan="5" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>ACQUISITION</b>
              </td>
              <td colSpan="4" rowSpan="2" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>ACQUISITION<br /><br />COST</b>
              </td>
            </tr>
            <tr style={{ backgroundColor: 'lightgray' }}>
              <td colSpan="7" style={{ border: '1px solid black', fontSize: '60%', textAlign: 'center', verticalAlign: 'top' }}>
                (As found in the Tax Declaration of<br />Real Property)
              </td>
              <td colSpan="2" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}><b>YEAR</b></td>
              <td colSpan="3" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}><b>MONTH</b></td>
            </tr>
            {[...Array(4)].map((_, i) => (
              <tr key={i}>
                <td colSpan="5" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="5" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="5" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="3" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="4" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="2" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="3" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="4" style={{ border: '1px solid black', height: '0.45in', fontSize: '0%' }}>&nbsp;</td>
              </tr>
            ))}
            <tr>
              <td colSpan="24" style={{ border: 0, height: '0.1in', fontSize: '0%' }}>&nbsp;</td>
              <td colSpan="7" style={{ border: 0, height: '0.1in', fontSize: '90%' }}><b>Subtotal:</b> _____________</td>
            </tr>
            <tr>
              <td colSpan="31" style={{ height: '0.1in', fontSize: '95%', textAlign: 'left' }}>
                <b>&emsp;&emsp;b.&emsp;Personal Properties*</b>
              </td>
            </tr>
            <tr style={{ backgroundColor: 'lightgray' }}>
              <td colSpan="18" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>DESCRIPTION</b>
              </td>
              <td colSpan="9" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>YEAR ACQUIRED</b>
              </td>
              <td colSpan="4" style={{ border: '1px solid black', fontSize: '72.5%', textAlign: 'center', verticalAlign: 'top' }}>
                <br /><b>ACQUISITION<br /><b>COST/AMOUNT</b></b>
              </td>
            </tr>
            {[...Array(4)].map((_, i) => (
              <tr key={i}>
                <td colSpan="18" style={{ border: '1px solid black', height: '0.25in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="9" style={{ border: '1px solid black', height: '0.25in', fontSize: '0%' }}>&nbsp;</td>
                <td colSpan="4" style={{ border: '1px solid black', height: '0.25in', fontSize: '0%' }}>&nbsp;</td>
              </tr>
            ))}
            <tr>
              <td colSpan={24} style={{ border: 0, height: '0.1in', fontSize: '0%' }}>&nbsp;</td>
              <td colSpan={7} style={{ border: 0, height: '0.1in', fontSize: '90%' }}><b>Subtotal:</b> _____________</td>
            </tr>
            <tr>
              <td colSpan={20} style={{ border: 0, height: '0.1in', fontSize: '90%' }}>
                <i>* Additional sheet/s may be used, if necessary.</i>
              </td>
              <td colSpan={11} style={{ border: 0, height: '0.1in', fontSize: '90%' }}>
                <b>&nbsp;&nbsp;TOTAL ASSETS (a+b): _____________</b>
              </td>
            </tr>
            <tr>
              <td colSpan={31} style={{ border: 0, height: '0.1in', fontSize: '90%', textAlign: 'center' }}>
                <br /><i>Page 1 of ____</i>
              </td>
            </tr>
          </table>

          <tr>
            <td colSpan="20" style={{ paddingTop: '10px' }}>
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={handleNext}
                sx={{ '&:hover': { backgroundColor: 'black', color: 'lightgray' } }}
              >
                Next
              </Button>
            </td>
          </tr>
        </table>
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

export default SalnFront;