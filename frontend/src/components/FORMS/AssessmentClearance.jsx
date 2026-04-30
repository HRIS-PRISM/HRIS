import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { getAuthHeaders } from '../../utils/auth';
import logo from './logo.png';
// Ensure this path matches where you saved the LoadingOverlay component above
import LoadingOverlay from '../LoadingOverlay';
import {
  Box,
  Button,
  Typography,
  Divider,
  Snackbar,
  Alert,
  Fab,
  Tooltip,
  Zoom
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const AssessmentClearance = () => {
  // Initial state is EMPTY for a standard layout (Blank Form)
  const [formData, setFormData] = useState({
    date: '',
    first_semester: false,
    second_semester: false,
    school_year_from: '',
    school_year_to: '',
    name: '',
    position: '',
    department: '',
    signature_type: '',
    college_dean: '',
    director_of_instruction: '',
    ecc_administrator: '',
    date_signed: '',
    email_address: '',
    telephone_cellphone: '',
    date_fully_accomplished: '',
    vacation_address: '',
    deadline_of_submission: '',
  });

  // State for the loading overlay during PDF generation
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const printRef = useRef(null);

  // --- CRUD LOGIC COMMENTED OUT ---
  /*
  const fetchRecords = async () => { ... };
  const handleSave = async () => { ... };
  const handleDelete = async () => { ... };
  */

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Capture helpers
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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

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
      
      const fileName = `Assessment-Clearance-Form-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    } finally {
      setIsGenerating(false); 
    }
  };

  const renderWithUnderline = (value, emptyLineWidth = '45px') => {
    if (value) {
      return (
        <span
          style={{
            display: 'inline-block',
            position: 'relative',
            textAlign: 'center',
            lineHeight: '1',
            paddingBottom: '2px',
          }}
        >
          <span style={{ display: 'block' }}>{value}</span>
          <span
            style={{
              display: 'block',
              width: '100%',
              height: '0.5px',
              backgroundColor: '#000000',
              marginTop: '1px',
            }}
          />
        </span>
      );
    }
    
    return (
      <span
        style={{
          display: 'inline-block',
          width: emptyLineWidth,
          borderBottom: '1px solid black',
        }}
      />
    );
  };

  const renderFormDisplay = () => {
    return (
      <div
        ref={printRef}
        className="print-content"
        style={{
          border: '1px solid black',
          padding: '0.2in',
          width: '8.27in',
          minHeight: '11.69in',
          fontFamily: 'Poppins, sans-serif',
          alignContent: 'center',
          margin: 'auto',
          marginTop: '20px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '5.25in', margin: 'auto' }}>
          <div style={{ width: '5.25in', margin: 'auto', textAlign: 'center' }}>
            <img
              src={logo}
              alt="Logo"
              height="90px"
              style={{ display: 'block', margin: '0 auto 10px auto' }}
            />
            <div style={{ textAlign: 'center' }}>
              <font size="3">Republic of the Philippines</font>
              <br />
              <b>
                <font size="4">EULOGIO "AMANG" RODRIGUEZ</font>
              </b>
              <br />
              <b>
                <font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font>
              </b>
              <br />
              <font size="3">Nagtahan, Sampaloc, Manila</font>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            {renderWithUnderline(formData.date, '200px')}
            <div style={{ marginTop: '2px', fontSize: '90%' }}>Date</div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <b>
              <i>
                <font size="4">ASSESSMENT CLEARANCE FOR PART-TIME FACULTY</font>
              </i>
            </b>
            <br />
            <br />1<sup>ST</sup>{' '}
            {formData.first_semester ? (
              '✓'
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  width: '45px',
                  borderBottom: '1px solid black',
                }}
              />
            )}{' '}
            2<sup>ND</sup>{' '}
            {formData.second_semester ? (
              '✓'
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  width: '45px',
                  borderBottom: '1px solid black',
                }}
              />
            )}{' '}
            Semester/School year{' '}
            {renderWithUnderline(formData.school_year_from, '45px')} -{' '}
            {renderWithUnderline(formData.school_year_to, '45px')}
            <br />
          </div>
        </div>
        <br />
        <table
          style={{
            border: '0px',
            borderCollapse: 'collapse',
            width: '7.75in',
            tableLayout: 'fixed',
            margin: 'auto',
          }}
        >
          <tr>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              {renderWithUnderline(formData.name, '100%')}
            </td>
            <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
              &nbsp;
            </td>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              {renderWithUnderline(formData.position, '100%')}
            </td>
            <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
              of
            </td>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              {renderWithUnderline(formData.department, '100%')}
            </td>
          </tr>
          <tr>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              Name
            </td>
            <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
              &nbsp;
            </td>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              Position
            </td>
            <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
              &nbsp;
            </td>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              Department
            </td>
          </tr>
        </table>
        <br />
        <br />
        <table
          style={{
            borderCollapse: 'collapse',
            width: '7.75in',
            tableLayout: 'fixed',
            margin: 'auto',
          }}
        >
          <tr>
            <td
              colSpan="13"
              style={{
                border: '1px solid black',
                height: '0.3in',
                fontSize: '90%',
                textAlign: 'center',
              }}
            >
              &nbsp;
            </td>
            <td
              colSpan="17"
              style={{
                border: '1px solid black',
                height: '0.3in',
                fontSize: '90%',
                textAlign: 'center',
              }}
            >
              <b>SIGNATURE</b>
            </td>
            <td
              colSpan="5"
              style={{
                border: '1px solid black',
                height: '0.3in',
                fontSize: '90%',
                textAlign: 'center',
              }}
            >
              <b>DATE SIGNED</b>
            </td>
          </tr>
          <tr>
            <td
              colSpan="13"
              style={{
                border: '1px solid black',
                height: '0.45in',
                fontSize: '85%',
                verticalAlign: 'top',
                padding: '5px',
              }}
            >
              <b>
                1.&nbsp;&nbsp;&nbsp;As to Area/College requirements.
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NBC 461/Research/Grade Sheets/
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MR/SALN&PDS/Liquidation
              </b>
            </td>
            <td
              colSpan="17"
              style={{
                border: '1px solid black',
                height: '0.45in',
                fontSize: '85%',
                textAlign: 'center',
                padding: '5px',
              }}
            >
              <br />
              <div style={{ fontWeight: 'bold', marginBottom: '4px', minHeight: '20px' }}>
                {formData.signature_type === 'college_dean'
                  ? formData.college_dean
                  : formData.signature_type === 'director_of_instruction'
                    ? formData.director_of_instruction
                    : formData.signature_type === 'ecc_administrator'
                      ? formData.ecc_administrator
                      : formData.college_dean ||
                        formData.director_of_instruction ||
                        formData.ecc_administrator}
              </div>
              <div
                style={{
                  width: '95%',
                  margin: '0 auto 8px',
                  borderBottom: '2px solid black',
                }}
              ></div>
              <b>COLLEGE DEAN</b> (for Faculty Assigned in Colleges)
              <br />
              <b>DIRECTOR OF INSTRUCTION</b> (for Gen. Ed. Faculty)
              <br />
              <b>ECC ADMINISTRATOR</b> (for ECC Faculty)
            </td>

            <td
              colSpan="5"
              style={{
                border: '1px solid black',
                height: '0.45in',
                textAlign: 'center',
              }}
            >
              {formData.date_signed}
            </td>
          </tr>
          <tr>
            <td
              colSpan="13"
              style={{
                border: '1px solid black',
                height: '0.45in',
                fontSize: '85%',
                verticalAlign: 'top',
                padding: '5px',
              }}
            >
              <b>2.&nbsp;&nbsp;&nbsp;Recommending Approval</b>
              <br />
            </td>
            <td
              colSpan="17"
              style={{
                border: '1px solid black',
                height: '0.45in',
                fontSize: '85%',
                textAlign: 'center',
                padding: '5px',
              }}
            >
              <br />
              <div
                style={{
                  width: '95%',
                  margin: '8px auto',
                  borderBottom: '2px solid black',
                }}
              ></div>
              <b>DR. ERIC C. MENDOZA</b>
              <br />
              Vice President for Academic Affairs
            </td>

            <td
              colSpan="5"
              style={{
                border: '1px solid black',
                height: '0.45in',
                textAlign: 'center',
              }}
            >
              &nbsp;
            </td>
          </tr>
          <tr>
            <td
              colSpan="13"
              style={{
                border: '1px solid black',
                height: '0.45in',
                fontSize: '85%',
                verticalAlign: 'top',
                padding: '5px',
              }}
            >
              <b>3.&nbsp;&nbsp;&nbsp;Approved</b>
              <br />
            </td>
            <td
              colSpan="17"
              style={{
                border: '1px solid black',
                height: '0.45in',
                fontSize: '85%',
                textAlign: 'center',
                padding: '5px',
              }}
            >
              <br />
              <div
                style={{
                  width: '95%',
                  margin: '8px auto',
                  borderBottom: '2px solid black',
                }}
              ></div>
              <b>Engr. ROGELIO T. MAMARADLO</b>
              <br />
              President
            </td>

            <td
              colSpan="5"
              style={{
                border: '1px solid black',
                height: '0.45in',
                textAlign: 'center',
              }}
            >
              &nbsp;
            </td>
          </tr>
        </table>
        <br />
        <table
          style={{
            border: '0px',
            borderCollapse: 'collapse',
            width: '7.75in',
            tableLayout: 'fixed',
            margin: 'auto',
          }}
        >
          {/* REMOVED GRAY BACKGROUND */}
          <tr>
            <td
              colSpan="32"
              style={{ height: '0.25in' }}
            >
              &nbsp;
            </td>
          </tr>
          <tr>
            <td
              colSpan="16"
              style={{ height: '0.4in', verticalAlign: 'bottom' }}
            >
              Email Address:{' '}
              <span
                style={{
                  display: 'inline-block',
                  width: '250px',
                  borderBottom: '1.5px solid black',
                  marginLeft: '6px',
                  paddingBottom: '2px',
                }}
              >
                {formData.email_address || '\u00A0'}
              </span>
            </td>

            <td
              colSpan="16"
              style={{ height: '0.4in', verticalAlign: 'bottom' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '6px',
                  width: '90%',
                }}
              >
                <span>Telephone/Cell Phone #:</span>

                <span
                  style={{
                    flex: 1,
                    borderBottom: '1.5px solid black',
                    paddingBottom: '2px',
                    MinWidth: '40px',
                  }}
                >
                  {formData.telephone_cellphone || '\u00A0'}
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td
              colSpan="10"
              style={{
                height: '0.6in',
                fontSize: '90%',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              <div
                style={{
                  width: ' 100%',
                  margin: '0 auto 6px',
                  borderBottom: '2px solid black',
                }}
              ></div>
              Signature of Faculty Member
            </td>

            <td
              colSpan="10"
              style={{
                height: '0.6in',
                fontSize: '90%',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              {renderWithUnderline(formData.date_fully_accomplished, '200px')}
              <br />
              Date Fully Accomplished
            </td>
            <td
              colSpan="12"
              style={{
                height: '0.6in',
                fontSize: '90%',
                textAlign: 'center',
                verticalAlign: 'bottom',
              }}
            >
              {renderWithUnderline(
                formData.vacation_address,
                '100%',
              )}
              <br />
              Vacation Address
            </td>
          </tr>
          <tr>
            <td
              colSpan="32"
              style={{ backgroundColor: 'white', height: '0.25in' }}
            >
              &nbsp;
            </td>
          </tr>
          {/* REMOVED GRAY BACKGROUND */}
          <tr>
            <td
              colSpan="32"
              style={{ height: '0.25in' }}
            >
              &nbsp;
            </td>
          </tr>
          <tr>
            <td colSpan="32" style={{ height: '0.35in', fontSize: '90%' }}>
              <b>
                DEADLINE OF SUBMISSION:{' '}
                {renderWithUnderline(formData.deadline_of_submission, '200px')}{' '}
              </b>
            </td>
          </tr>
          <tr>
            <td colSpan="2" style={{ height: '0.3in' }}>
              &nbsp;
            </td>
            <td colSpan="30" style={{ height: '0.3in', fontSize: '85%' }}>
              : Faculty
              <br />
              : HRMS
              <br />: FMS (2 copies) 1 photocopy
            </td>
          </tr>
        </table>
      </div>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      bgcolor: '#ffffff', 
      position: 'relative' 
    }}>
      
      <Box
        sx={{
          width: '100%',
          overflow: 'auto',
          paddingBottom: '100px',
        }}
      >
        {renderFormDisplay()}
      </Box>

      {/* Floating Action Buttons (Bottom Right - ROW) */}
      <Box className="no-print forms-floating-actions" sx={{position: 'fixed',
          bottom: '1in',
          right: 30,
          display: 'flex',
          flexDirection: 'row', 
          gap: 2,
          zIndex: 1000,
        }}
      >
        <Zoom in={true} style={{ transitionDelay: '0ms' }}>
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

        <Zoom in={true} style={{ transitionDelay: '100ms' }}>
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

      {/* This overlay now has the blur effect */}
      <LoadingOverlay open={isGenerating} message="Generating Document..." />

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

export default AssessmentClearance;