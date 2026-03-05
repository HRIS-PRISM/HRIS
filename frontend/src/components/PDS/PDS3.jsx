import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PrintIcon from '@mui/icons-material/Print';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import useProfileSections from '../../hooks/useProfileSections';
import { getAuthHeaders } from '../../utils/auth';

const PDS3 = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [voluntaryWorkInfo, setVoluntaryWorkInfo] = useState([]);
  const [learningDevelopmentInfo, setLearningDevelopmentInfo] = useState([]);
  const [otherInformationInfo, setOtherInformationInfo] = useState([]);
  const { sections } = useProfileSections();

  //ACCESSING
  // Dynamic page access control using component identifier
  // The identifier 'pds3' should match the component_identifier in the pages table
  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('pds3');
  // ACCESSING END

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedEmployeeNumber = localStorage.getItem('employeeNumber');

    console.log('Stored Role:', storedRole);
    console.log('Stored Employee Number:', storedEmployeeNumber);

    if (storedRole && storedEmployeeNumber) {
      setRole(storedRole);
      setEmployeeNumber(storedEmployeeNumber);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Fetch voluntary work using consolidated route and filter by employeeNumber
  useEffect(() => {
    if (!employeeNumber) return;

    const fetchVoluntaryWorkData = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/VoluntaryRoute/voluntary-work`,
          getAuthHeaders()
        );

        const allRecords = response.data || [];
        const employeeRecords = allRecords.filter(
          (item) => String(item.person_id) === String(employeeNumber)
        );

        // PDS layout shows 7 rows; take first 7 here, normalization will pad remaining
        setVoluntaryWorkInfo(employeeRecords.slice(0, 7));
      } catch (error) {
        console.error('Error loading voluntary work data:', error);
      }
    };

    fetchVoluntaryWorkData();
  }, [employeeNumber]);

  // Use consolidated profile sections (same as PDS2/Profile) for L&D and Other Information
  useEffect(() => {
    if (!sections) return;

    setLearningDevelopmentInfo(sections.learningDevelopment || []);
    setOtherInformationInfo(sections.otherInformation || []);
  }, [sections]);

  // Normalize data
  const normalizedVoluntaryWork = [...voluntaryWorkInfo.filter((e) => e !== null)];
  while (normalizedVoluntaryWork.length < 7) normalizedVoluntaryWork.push(null);

  const normalizedLearningDevelopment = [
    ...learningDevelopmentInfo.filter((e) => e !== null),
  ];
  while (normalizedLearningDevelopment.length < 21)
    normalizedLearningDevelopment.push(null);

  const normalizedOtherInformation = [
    ...otherInformationInfo.filter((e) => e !== null),
  ];
  while (normalizedOtherInformation.length < 7)
    normalizedOtherInformation.push(null);

  // ACCESSING 2
  // Loading state
  if (accessLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>
            Loading access information...
          </Typography>
        </Box>
      </Container>
    );
  }
  // Access denied state - Now using the reusable component
  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Personal Data Sheet (PDS3). Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }
  //ACCESSING END2

  return (
    <div id="print-section">
      <style>
        {`
          @media print {
            html, body {
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
              .no-print {
              display: none !important;
              height: 100vh;
              overflow: hidden;
              }
            }
     
            body * {
              visibility: hidden;
            }
     
            #print-section, #print-section * {
              visibility: visible;
            }
     
            #print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: fit-content;
              margin: 0;
              margin-bottom: 0;
              padding: 0;
              background-color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              transform: scale(1);
              transform-origin: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
     
            .print-button {
              display: none;
            }
     
            @page {
              size: legal portrait;
              margin: 0;
            }
          }
        `}
      </style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{ padding: '0.25in', width: '8in', height: '12.9in' }}
        >
          <table
            style={{
              border: '1px solid black',
              borderCollapse: 'collapse',
              fontFamily: 'Arial, Helvetica, sans-serif',
              width: '8in',
              tableLayout: 'fixed',
            }}
          >
            <tbody>
              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.2in',
                    fontSize: '72.5%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    <i>
                      VI. VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT
                      / PEOPLE / VOLUNTARY ORGANIZATION/S
                    </i>
                  </b>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 1px 0px solid black',
                  }}
                >
                  29.
                </td>
                <td
                  colSpan="6"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  NAME & ADDRESS OF ORGANIZATION
                  <br />
                  (Write in full)
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.2in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  INCLUSIVE DATES
                  <br />
                  (dd/mm/yyyy)
                </td>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '50%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  NUMBER OF
                  <br />
                  HOURS
                </td>
                <td
                  colSpan="5"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  POSITION / NATURE OF WORK
                </td>
              </tr>

              <tr>
                <td
                  colSpan="1"
                  style={{
                    height: '0.11in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  From
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.11in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  To
                </td>
              </tr>
              {normalizedVoluntaryWork.map((voluntarywork, index) => (
                <tr key={index}>
                  <td
                    colSpan="7"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {voluntarywork ? voluntarywork.nameAndAddress : ''}
                  </td>

                  <td
                    colSpan="1"
                    style={{
                      height: '0.3in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {voluntarywork?.dateFrom
                      ? new Date(
                          voluntarywork.dateFrom
                        ).toLocaleDateString('en-GB')
                      : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.3in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {voluntarywork?.dateTo
                      ? new Date(
                          voluntarywork.dateTo
                        ).toLocaleDateString('en-GB')
                      : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.3in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {voluntarywork ? voluntarywork.numberOfHours : ''}
                  </td>
                  <td
                    colSpan="5"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {voluntarywork ? voluntarywork.natureOfWork : ''}
                  </td>
                </tr>
              ))}

              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.11in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    color: 'red',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  <b>
                    <i>(Continue on separate sheet if necessary)</i>
                  </b>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.2in',
                    fontSize: '72.5%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    <i>
                      VII. LEARNING AND DEVELOPMENT (L&D) INTERVENTIONS/TRAINING
                      PROGRAMS ATTENDED
                    </i>
                  </b>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.5in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 1px 0px solid black',
                  }}
                >
                  30.
                </td>
                <td
                  colSpan="6"
                  rowSpan="2"
                  style={{
                    height: '0.5in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  TITLE OF LEARNING AND DEVELOPMENT
                  INTERVENTIONS/TRAINING PROGRAMS
                  <br />
                  (Write in full)
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.4in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  INCLUSIVE DATES OF
                  <br />
                  ATTENDANCE
                  <br />
                  (dd/mm/yyyy)
                </td>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.5in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  NUMBER OF
                  <br />
                  HOURS
                </td>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.5in',
                    fontSize: '50%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  Type of LD
                  <br />
                  ( Managerial/ Supervisory/
                  <br />
                  Technical/etc)
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.5in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  CONDUCTED/ SPONSORED BY
                  <br />
                  (Write in full)
                </td>
              </tr>

              <tr>
                <td
                  colSpan="1"
                  style={{
                    height: '0.11in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  From
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.11in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  To
                </td>
              </tr>
              {normalizedLearningDevelopment.map((learningdevelopment, index) => (
                <tr key={index}>
                  <td
                    colSpan="7"
                    style={{
                      height: '0.25in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {learningdevelopment ? learningdevelopment.titleOfProgram : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.25in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {learningdevelopment && learningdevelopment.dateFrom
                      ? new Date(
                          learningdevelopment.dateFrom
                        ).toLocaleDateString('en-GB')
                      : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.25in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {learningdevelopment && learningdevelopment.dateTo
                      ? new Date(
                          learningdevelopment.dateTo
                        ).toLocaleDateString('en-GB')
                      : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.25in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {learningdevelopment ? learningdevelopment.numberOfHours : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.25in',
                      fontSize: '55%',
                      border: '1px solid black',
                    }}
                  >
                    {learningdevelopment
                      ? learningdevelopment.typeOfLearningDevelopment
                      : ''}
                  </td>
                  <td
                    colSpan="4"
                    style={{
                      height: '0.25in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {learningdevelopment ? learningdevelopment.conductedSponsored : ''}
                  </td>
                </tr>
              ))}

              <tr>
                <td
                  colSpan="1"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 1px 0px solid black',
                  }}
                >
                  31.
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  SPECIAL SKILLS and HOBBIES
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  32.
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  NON-ACADEMIC DISTINCTIONS / RECOGNITION
                  <br />
                  (Write in full)
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 1px 0px solid black',
                  }}
                >
                  33.
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  MEMBERSHIP IN ASSOCIATION/ORGANIZATION
                  <br />
                  (Write in full)
                </td>
              </tr>

              {normalizedOtherInformation.map((otherinformation, index) => (
                <tr key={index}>
                  <td
                    colSpan="4"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {otherinformation ? otherinformation.specialSkills : ''}
                  </td>
                  <td
                    colSpan="7"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {otherinformation
                      ? otherinformation.nonAcademicDistinctions
                      : ''}
                  </td>
                  <td
                    colSpan="4"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {otherinformation ? otherinformation.membershipInAssociation : ''}
                  </td>
                </tr>
              ))}

              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.11in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    color: 'red',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  <b>
                    <i>(Continue on separate sheet if necessary)</i>
                  </b>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  <b>
                    <i>SIGNATURE</i>
                  </b>
                </td>
                <td
                  colSpan="5"
                  style={{
                    height: '0.25in',
                    fontSize: '62.5%',
                    border: '1px solid black',
                  }}
                >
                  &nbsp;
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  <b>
                    <i>DATE</i>
                  </b>
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '62.5%',
                    border: '1px solid black',
                  }}
                >
                  &nbsp;
                </td>
              </tr>
              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.11in',
                    fontSize: '50%',
                    border: '1px solid white',
                    textAlign: 'right',
                  }}
                >
                  <i>CS FORM 212 (Revised 2025), Page 3 of 4</i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
<button
  onClick={() => window.print()}
  className="no-print"
  style={{
    position: 'fixed',
    bottom: '60px',
    right: '30px',
    backgroundColor: '#6D2323',
    color: '#FFFFFF',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '50px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)',
    zIndex: 9999,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0px 6px 20px rgba(0, 0, 0, 0.4)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = '0px 4px 15px rgba(0, 0, 0, 0.3)';
  }}
>
  <PrintIcon style={{ fontSize: '24px' }} />
  Save / Print
</button>
    </div>
  );
};

export default PDS3;


