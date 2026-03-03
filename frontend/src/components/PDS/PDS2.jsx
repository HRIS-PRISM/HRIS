import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import PrintIcon from '@mui/icons-material/Print';
import { Box, Container, CircularProgress } from '@mui/material';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import useProfileSections from '../../hooks/useProfileSections';

const PDS2 = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [eligibilityInfo, setEligibilityInfo] = useState([]);
  const [workexperience, setWorkExperienceInfo] = useState([]);
  const { sections, loading: sectionsLoading } = useProfileSections();

  const {
    hasAccess,
    loading: accessLoading,
    error: accessError,
  } = usePageAccess('pds2');

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

  useEffect(() => {
    if (!sections) return;

    const eligibilities = sections.eligibilities || [];
    setEligibilityInfo(eligibilities);

    const work = sections.workExperiences || [];
    setWorkExperienceInfo(work);
  }, [sections]);

  const normalizedEligibility = [...eligibilityInfo.filter((e) => e !== null)];
  while (normalizedEligibility.length < 7) normalizedEligibility.push(null);

  const normalizedWorkExperience = [
    ...workexperience.filter((e) => e !== null),
  ];
  while (normalizedWorkExperience.length < 26)
    normalizedWorkExperience.push(null);

  if (accessLoading || sectionsLoading) {
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
        message="You do not have permission to access Personal Data Sheet (PDS2). Contact your administrator to request access."
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
          style={{
            overflow: 'hidden',
            padding: '0.25in',
            width: '8in',
            height: '13.1in',
          }}
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
                  colSpan="18"
                  style={{
                    height: '0.2in',
                    fontSize: '72.5%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    <i>IV. CIVIL SERVICE ELIGIBILITY</i>
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
                  27.
                </td>
                <td
                  colSpan="5"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  CAREER SERVICE/ RA 1080 (BOARD/ BAR) UNDER <br></br>
                  SPECIAL LAWS/ CES/ CSEE <br></br>
                  BARANGAY ELIGIBILITY / DRIVER'S LICENSE
                </td>
                <td
                  colSpan="2"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  RATING <br></br>
                  (If Applicable)
                </td>
                <td
                  colSpan="2"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  DATE OF <br></br>
                  EXAMINATION / <br></br>
                  CONFERMENT
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
                  PLACE OF EXAMINATION / CONFERMENT
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.11in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  LICENSE (if applicable)
                </td>
              </tr>
              <tr>
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
                  NUMBER
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.2in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  Date of <br></br>
                  Validity
                </td>
              </tr>

              {normalizedEligibility.map((eligibility, index) => (
                <tr key={index}>
                  <td
                    colSpan="6"
                    style={{
                      height: '0.25in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {eligibility ? eligibility.eligibilityName : ''}
                  </td>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.25in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {eligibility ? eligibility.eligibilityRating : ''}
                  </td>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.25in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {eligibility ? eligibility.eligibilityDateOfExam : ''}
                  </td>
                  <td
                    colSpan="5"
                    style={{
                      height: '0.25in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {eligibility ? eligibility.eligibilityPlaceOfExam : ''}
                  </td>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.25in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {eligibility ? eligibility.licenseNumber : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.25in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {eligibility ? eligibility.DateOfValidity : ''}
                  </td>
                </tr>
              ))}

              <tr>
                <td
                  colSpan="18"
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
                  colSpan="18"
                  style={{
                    height: '0.55in',
                    fontSize: '70%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    {' '}
                    <i>
                      V. WORK EXPERIENCE <br></br>
                      (Include private employment. Start from your recent work)
                      Description of duties should be indicated in the attached
                      Work Experience sheet.
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
                  28.
                </td>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  INCLUSIVE DATES <br></br>
                  (dd/mm/yyyy)
                </td>
                <td
                  colSpan="4"
                  rowSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  POSITION TITLE <br></br>
                  (Write in full/Do not abbreviate)
                </td>
                <td
                  colSpan="4"
                  rowSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  DEPARTMENT / AGENCY / OFFICE / COMPANY <br></br>
                  (Write in full/Do not abbreviate)
                </td>
                <td
                  colSpan="1"
                  rowSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '58%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  MONTHLY <br></br>
                  SALARY
                </td>
                <td
                  colSpan="2"
                  rowSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '50%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  SALARY/ JOB/ <br></br>
                  PAY GRADE (if <br></br>
                  applicable)& <br></br>
                  STEP (Format <br></br>
                  "00-0")/ <br></br>
                  INCREMENT
                </td>
                <td
                  colSpan="2"
                  rowSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  STATUS OF <br></br>
                  APPOINTMENT
                </td>
                <td
                  colSpan="1"
                  rowSpan="3"
                  style={{
                    height: '0.3in',
                    fontSize: '55%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  GOV'T <br></br>
                  SERVICE <br></br>
                  (Y/N)
                </td>
              </tr>
              <tr></tr>
              <tr>
                <td
                  colSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  From
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '62.5%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  To
                </td>
              </tr>

              {normalizedWorkExperience.map((workexperience, index) => (
                <tr key={index}>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience?.workDateFrom
                      ? new Date(
                          workexperience.workDateFrom
                        ).toLocaleDateString('en-GB')
                      : ''}
                  </td>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.3in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience?.workDateTo
                      ? new Date(workexperience.workDateTo).toLocaleDateString(
                          'en-GB'
                        )
                      : ''}
                  </td>
                  <td
                    colSpan="4"
                    style={{
                      height: '0.3in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience ? workexperience.workPositionTitle : ''}
                  </td>
                  <td
                    colSpan="4"
                    style={{
                      height: '0.3in',
                      fontSize: '62.5%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience ? workexperience.workCompany : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.3in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience ? workexperience.workMonthlySalary : ''}
                  </td>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.3in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience ? workexperience.SalaryJobOrPayGrade : ''}
                  </td>
                  <td
                    colSpan="2"
                    style={{
                      height: '0.3in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience ? workexperience.StatusOfAppointment : ''}
                  </td>
                  <td
                    colSpan="1"
                    style={{
                      height: '0.3in',
                      fontSize: '58%',
                      border: '1px solid black',
                    }}
                  >
                    {workexperience ? workexperience.isGovtService : ''}
                  </td>
                </tr>
              ))}

              <tr>
                <td
                  colSpan="18"
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
                    <i>SIGNATURE</i>{' '}
                  </b>
                </td>
                <td
                  colSpan="7"
                  style={{
                    height: '0.25in',
                    fontSize: '62.5%',
                    border: '1px solid black',
                  }}
                >
                  &nbsp;
                </td>
                <td
                  colSpan="3"
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
                  colSpan="18"
                  style={{
                    height: '0.11in',
                    fontSize: '50%',
                    border: '1px solid white',
                    textAlign: 'right',
                  }}
                >
                  <i>CS FORM 212 (Revised 2025), Page 2 of 4</i>
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

export default PDS2;
