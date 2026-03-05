import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { getAuthHeaders } from '../../utils/auth';
import { useSocket } from '../../contexts/SocketContext';
import logo from './logo.png';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PrintIcon from '@mui/icons-material/Print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const AssessmentClearance = () => {
  const { socket, connected } = useSocket();
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

  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const printRef = useRef(null);

  // Fetch all records
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/assessment-clearance`,
        getAuthHeaders(),
      );
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
      showSnackbar('Failed to fetch records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Live refresh when other users change records
  useEffect(() => {
    if (!socket || !connected) return;

    const handleChanged = (data) => {
      // Another admin created/updated/deleted a record; refresh list
      // data: { action, id, timestamp }
      fetchRecords();
    };

    socket.on('assessmentClearanceChanged', handleChanged);
    return () => {
      socket.off('assessmentClearanceChanged', handleChanged);
    };
  }, [socket, connected]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record.id);
    // Determine signature type based on which field has data
    let signatureType = '';
    if (record.college_dean) signatureType = 'college_dean';
    else if (record.director_of_instruction)
      signatureType = 'director_of_instruction';
    else if (record.ecc_administrator) signatureType = 'ecc_administrator';

    setFormData({
      date: record.date || '',
      first_semester: record.first_semester === 1,
      second_semester: record.second_semester === 1,
      school_year_from: record.school_year_from || '',
      school_year_to: record.school_year_to || '',
      name: record.name || '',
      position: record.position || '',
      department: record.department || '',
      signature_type: signatureType,
      college_dean: record.college_dean || '',
      director_of_instruction: record.director_of_instruction || '',
      ecc_administrator: record.ecc_administrator || '',
      date_signed: record.date_signed || '',
      email_address: record.email_address || '',
      telephone_cellphone: record.telephone_cellphone || '',
      date_fully_accomplished: record.date_fully_accomplished || '',
      vacation_address: record.vacation_address || '',
      deadline_of_submission: record.deadline_of_submission || '',
    });
  };

  const handleNewRecord = () => {
    setSelectedRecord(null);
    setFormData({
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
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (selectedRecord) {
        // Update existing record
        await axios.put(
          `${API_BASE_URL}/api/assessment-clearance/${selectedRecord}`,
          formData,
          getAuthHeaders(),
        );
        showSnackbar('Record updated successfully', 'success');
      } else {
        // Create new record
        await axios.post(
          `${API_BASE_URL}/api/assessment-clearance`,
          formData,
          getAuthHeaders(),
        );
        showSnackbar('Record created successfully', 'success');
      }
      await fetchRecords();
      handleNewRecord();
    } catch (error) {
      console.error('Error saving record:', error);
      showSnackbar('Failed to save record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(
        `${API_BASE_URL}/api/assessment-clearance/${deleteDialog.id}`,
        getAuthHeaders(),
      );
      showSnackbar('Record deleted successfully', 'success');
      await fetchRecords();
      if (selectedRecord === deleteDialog.id) {
        handleNewRecord();
      }
      setDeleteDialog({ open: false, id: null });
    } catch (error) {
      console.error('Error deleting record:', error);
      showSnackbar('Failed to delete record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Capture helpers (similar to DailyTimeRecord.jsx)
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
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      // Ensure capture-friendly styles
      const orig = ensureCaptureStyles(printRef.current);

      // Wait for styles to apply
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
      showSnackbar('Error generating print view', 'error');
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'a4',
      });

      const orig = ensureCaptureStyles(printRef.current);

      // Wait for styles to apply
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
      const fileName = `Assessment-Clearance-${formData.name || 'Form'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showSnackbar('Error generating PDF', 'error');
    }
  };

  // Helper function to render text with underline only when data exists
  const renderWithUnderline = (
    value,
    placeholder = '________________________',
  ) => {
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
    return placeholder;
  };

  // Render the form display (left side)
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
          <br />
          <br />
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
            {renderWithUnderline(formData.date, '__________________')}
            <div style={{ marginTop: '2px', fontSize: '90%' }}>Date</div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <b>
              <i>
                <font size="4">ASSESSMENT CLEARANCE FOR PART-TIME FACULTY</font>
              </i>
            </b>
            <br />
            <br />1<sup>ST</sup> {formData.first_semester ? '✓' : '____'} 2
            <sup>ND</sup> {formData.second_semester ? '✓' : '____'}{' '}
            Semester/School year{' '}
            {renderWithUnderline(formData.school_year_from, '_____')} -{' '}
            {renderWithUnderline(formData.school_year_to, '______')}
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
              {renderWithUnderline(formData.name)}
            </td>
            <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
              &nbsp;
            </td>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              {renderWithUnderline(formData.position)}
            </td>
            <td colSpan="2" style={{ height: '0.25in', textAlign: 'center' }}>
              of
            </td>
            <td colSpan="12" style={{ height: '0.25in', textAlign: 'center' }}>
              {renderWithUnderline(formData.department)}
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
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
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
              {renderWithUnderline(formData.date_signed, '')}
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
          <tr>
            <td
              colSpan="32"
              style={{ backgroundColor: 'gray', height: '0.25in' }}
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
                    flex: 1, // fills remaining space
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
              {renderWithUnderline(
                formData.date_fully_accomplished,
                '________________________',
              )}
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
                '______________________________',
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
          <tr>
            <td
              colSpan="32"
              style={{ backgroundColor: 'gray', height: '0.25in' }}
            >
              &nbsp;
            </td>
          </tr>
          <tr>
            <td colSpan="32" style={{ height: '0.35in', fontSize: '90%' }}>
              <b>
                DEADLINE OF SUBMISSION:{' '}
                {renderWithUnderline(
                  formData.deadline_of_submission,
                  '______________________________',
                )}{' '}
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
    <Box sx={{ display: 'flex', gap: 2, p: 2, minHeight: '100vh' }}>
      {/* Left Side - Form Display */}
      <Box
        sx={{
          flex: '1 1 60%',
          overflow: 'auto',
          maxHeight: '100vh',
          position: 'relative',
        }}
      >
        <Box
          className="no-print"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            display: 'flex',
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={printPage}
            sx={{
              backgroundColor: '#6D2323',
              '&:hover': {
                backgroundColor: '#8a4747',
              },
            }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={downloadPDF}
            sx={{
              backgroundColor: '#6D2323',
              '&:hover': {
                backgroundColor: '#8a4747',
              },
            }}
          >
            Download PDF
          </Button>
        </Box>
        {renderFormDisplay()}
      </Box>

      {/* Right Side - Input Form and Records List */}
      <Box
        className="no-print"
        sx={{
          flex: '1 1 40%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Form Inputs */}
        <Paper elevation={3} sx={{ p: 3 }} className="no-print">
          <Typography variant="h6" gutterBottom>
            {selectedRecord ? 'Edit Record' : 'New Record'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.first_semester}
                    onChange={handleInputChange}
                    name="first_semester"
                  />
                }
                label="1st Semester"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.second_semester}
                    onChange={handleInputChange}
                    name="second_semester"
                  />
                }
                label="2nd Semester"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="School Year From"
                name="school_year_from"
                value={formData.school_year_from}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="School Year To"
                name="school_year_to"
                value={formData.school_year_to}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 'bold' }}
              >
                1. Signatures Section
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Signature Type</InputLabel>
                <Select
                  value={formData.signature_type}
                  onChange={handleInputChange}
                  name="signature_type"
                  label="Select Signature Type"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="college_dean">
                    College Dean (for Faculty Assigned in Colleges)
                  </MenuItem>
                  <MenuItem value="director_of_instruction">
                    Director of Instruction (for Gen. Ed. Faculty)
                  </MenuItem>
                  <MenuItem value="ecc_administrator">
                    ECC Administrator (for ECC Faculty)
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.signature_type === 'college_dean' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="College Dean Signature/Name"
                  name="college_dean"
                  value={formData.college_dean}
                  onChange={handleInputChange}
                  placeholder="Enter College Dean signature or name"
                />
              </Grid>
            )}
            {formData.signature_type === 'director_of_instruction' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Director of Instruction Signature/Name"
                  name="director_of_instruction"
                  value={formData.director_of_instruction}
                  onChange={handleInputChange}
                  placeholder="Enter Director of Instruction signature or name"
                />
              </Grid>
            )}
            {formData.signature_type === 'ecc_administrator' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ECC Administrator Signature/Name"
                  name="ecc_administrator"
                  value={formData.ecc_administrator}
                  onChange={handleInputChange}
                  placeholder="Enter ECC Administrator signature or name"
                />
              </Grid>
            )}
            {formData.signature_type && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Date Signed"
                  name="date_signed"
                  value={formData.date_signed}
                  onChange={handleInputChange}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                name="email_address"
                type="email"
                value={formData.email_address}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telephone/Cell Phone #"
                name="telephone_cellphone"
                value={formData.telephone_cellphone}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date Fully Accomplished"
                name="date_fully_accomplished"
                value={formData.date_fully_accomplished}
                onChange={handleInputChange}
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vacation Address"
                name="vacation_address"
                value={formData.vacation_address}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deadline of Submission"
                name="deadline_of_submission"
                value={formData.deadline_of_submission}
                onChange={handleInputChange}
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={loading}
                  fullWidth
                >
                  {selectedRecord ? 'Update' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={handleNewRecord}
                  disabled={loading}
                  fullWidth
                >
                  New
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Records List */}
        <Paper
          elevation={3}
          sx={{ p: 2, flex: 1, overflow: 'auto' }}
          className="no-print"
        >
          <Typography variant="h6" gutterBottom>
            Records
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {loading && records.length === 0 ? (
            <Typography>Loading...</Typography>
          ) : records.length === 0 ? (
            <Typography color="text.secondary">No records found</Typography>
          ) : (
            <List>
              {records.map((record) => (
                <ListItem
                  key={record.id}
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        onClick={() => handleSelectRecord(record)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() =>
                          setDeleteDialog({ open: true, id: record.id })
                        }
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                  disablePadding
                >
                  <ListItemButton
                    selected={selectedRecord === record.id}
                    onClick={() => handleSelectRecord(record)}
                  >
                    <ListItemText
                      primary={record.name || `Record #${record.id}`}
                      secondary={`${record.date || 'No date'} - ${record.department || 'No department'}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this record? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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
