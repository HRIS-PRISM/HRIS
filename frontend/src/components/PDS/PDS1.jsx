import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import PrintIcon from '@mui/icons-material/Print';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AccessDenied from '../AccessDenied';
import usePageAccess from '../../hooks/usePageAccess';
import useProfileData from '../../hooks/useProfileData';
import useProfileSections from '../../hooks/useProfileSections';

const PDS1 = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState(''); // State for employee number
  const [personalInfo, setPersonalInfo] = useState(null); // To store fetched personal info
  const [vocationalInfo, setVocationalInfo] = useState(null);
  const [collegeInfo, setcollegeInfo] = useState(null);
  const [childrenInfo1, setchildrenInfo1] = useState(null);
  const [childrenInfo2, setchildrenInfo2] = useState(null);
  const [childrenInfo3, setchildrenInfo3] = useState(null);
  const [childrenInfo4, setchildrenInfo4] = useState(null);
  const [childrenInfo5, setchildrenInfo5] = useState(null);
  const [childrenInfo6, setchildrenInfo6] = useState(null);
  const [childrenInfo7, setchildrenInfo7] = useState(null);
  const [childrenInfo8, setchildrenInfo8] = useState(null);
  const [childrenInfo9, setchildrenInfo9] = useState(null);
  const [childrenInfo10, setchildrenInfo10] = useState(null);
  const [childrenInfo11, setchildrenInfo11] = useState(null);
  const [childrenInfo12, setchildrenInfo12] = useState(null);
  const [graduateInfo, setGraduateInfo] = useState(null);

  const { person, loading: profileLoading } = useProfileData();
  const { sections, loading: sectionsLoading } = useProfileSections();

  const { hasAccess, loading: accessLoading, error: accessError } = usePageAccess('pds1');

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
    if (!person && !sections) return;

    if (person) {
      setPersonalInfo(person);
    }

    if (sections) {
      if (sections.vocational && sections.vocational.length > 0) {
        setVocationalInfo(sections.vocational[0]);
      }

      if (sections.colleges && sections.colleges.length > 0) {
        setcollegeInfo(sections.colleges[0]);
      }

      const children = sections.children || [];
      setchildrenInfo1(children[0] || null);
      setchildrenInfo2(children[1] || null);
      setchildrenInfo3(children[2] || null);
      setchildrenInfo4(children[3] || null);
      setchildrenInfo5(children[4] || null);
      setchildrenInfo6(children[5] || null);
      setchildrenInfo7(children[6] || null);
      setchildrenInfo8(children[7] || null);
      setchildrenInfo9(children[8] || null);
      setchildrenInfo10(children[9] || null);
      setchildrenInfo11(children[10] || null);
      setchildrenInfo12(children[11] || null);

      if (sections.graduates && sections.graduates.length > 0) {
        setGraduateInfo(sections.graduates[0]);
      }
    }
  }, [person, sections]);

  const countries = [
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Cape Verde',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czech Republic',
    'Democratic Republic of the Congo',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'East Timor',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Eswatini',
    'Ethiopia',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Ivory Coast',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Korea',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Republic of the Congo',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Korea',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Taiwan',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Vatican City',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia',
    'Zimbabwe',
  ];

  const [citizenshipType, setCitizenshipType] = useState('');
  const [dualCountry, setDualCountry] = useState('');

  const handleCheckboxChange = (e) => {
    const value = e.target.value;
    setCitizenshipType(value === citizenshipType ? '' : value);
    if (value !== 'dual') setDualCountry('');
  };

  if (accessLoading || profileLoading || sectionsLoading) {
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
        message="You do not have permission to access Personal Data Sheet (PDS1). Contact your administrator to request access."
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
            height: 'fit-content',
          }}
        >
          <table
            style={{
              border: '1px solid black',
              borderCollapse: 'collapse',
              fontFamily: 'Arial, Helvetica, sans-serif',
              width: '8in',
              tableLayout: 'fixed',
              marginTop: '-5px',
            }}
          >
            <tbody>
              <tr>
                <td colSpan="2" style={{ height: '0.1in', fontSize: '58.6%' }}>
                  <b>
                    <i>CS Form No. 212</i>
                  </b>
                </td>

                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
                <td
                  colSpan="1"
                  style={{ height: '0.1in', fontSize: '58.6%' }}
                ></td>
              </tr>

              <tr>
                <td colSpan="2" style={{ height: '0.1in', fontSize: '58.6%' }}>
                  <b>
                    {' '}
                    <i> Revised 2025</i>
                  </b>
                </td>
              </tr>

              <tr>
                <td colSpan="15" style={{ height: '0.1in' }}>
                  <h1
                    style={{
                      textAlign: 'center',
                      marginTop: '-20px',
                      marginBottom: '-10px',
                    }}
                  >
                    <b>PERSONAL DATA SHEET</b>
                  </h1>
                </td>
              </tr>

              <tr>
                <td colSpan="15" style={{ height: '0.3in', fontSize: '58.6%' }}>
                  <b>
                    {' '}
                    <i>
                      {' '}
                      WARNING: Any misrepresentation made in the Personal Data
                      Sheet and the Work Experience Sheet shall cause the filing
                      of administrative/criminal case/s{' '}
                    </i>
                  </b>{' '}
                  <br></br>
                  <b>
                    {' '}
                    <i> against the person concerned.</i>
                  </b>
                  <br></br>
                  <b>
                    {' '}
                    <i>
                      {' '}
                      READ THE ATTACHED GUIDE TO FILLING OUT THE PERSONAL DATA
                      SHEET (PDS) BEFORE ACCOMPLISHING THE PDS FORMS.
                    </i>
                  </b>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="11"
                  style={{ height: '0.11in', fontSize: '58.6%' }}
                >
                  Print legibly. Tick appropriate boxes (□) and use separate
                  sheet if necessary. Indicate N/A if not applicable.{' '}
                  <b> DO NOT ABBREVIATE.</b>
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.11in',
                    fontSize: '58.6%',
                    backgroundColor: 'gray',
                    border: '1px solid black',
                  }}
                >
                  1. CS ID No
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.11in',
                    fontSize: '58.6%',
                    textAlign: 'right',
                    border: ' 1px solid black',
                    color: 'dark-gray',
                  }}
                >
                  (Do not fill up. For CSC use only)
                </td>
              </tr>

              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.2in',
                    fontSize: '58.6%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    {' '}
                    <i> I. PERSONAL INFORMATION</i>
                  </b>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.20in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 0px 1px solid black',
                  }}
                >
                  2. &emsp; SURNAME
                </td>
                <td
                  colSpan="12"
                  style={{
                    height: '0.20in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    padding: '0',
                  }}
                >
                  {personalInfo ? personalInfo.lastName : ''}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.20in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '0px 1px 0px 1px solid black',
                  }}
                >
                  &emsp;&emsp; FIRST NAME
                </td>
                <td
                  colSpan="9"
                  rowSpan="2"
                  style={{
                    height: '0.20in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.firstName : ''}
                </td>

                <td
                  colSpan="3"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px 1px 0px 1px solid black',
                    backgroundColor: 'lightgray',
                  }}
                >
                  <sup>NAME EXTENSION (JR, SR) </sup>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px 1px 0px 1px solid black',
                    backgroundColor: 'lightgray',
                  }}
                >
                  <sup> {personalInfo ? personalInfo.firstName : ''}</sup>{' '}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '0px 1px 1px 1px solid black',
                  }}
                >
                  &emsp;&emsp;MIDDLE NAME
                </td>
                <td
                  colSpan="12"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.middleName : ''}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  3.&emsp;DATE OF BIRTH <br></br>
                  <p> &emsp;&emsp;(dd/mm/yyyy) </p>
                </td>

                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo?.birthDate
                    ? new Date(personalInfo.birthDate).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>

                <td
                  colSpan="3"
                  rowSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    verticalAlign: 'top',
                  }}
                >
                  16.&emsp; CITIZENSHIP <br />
                  &emsp;&emsp;If holder of dual citizenship, <br />
                  &emsp;&emsp;please indicate the details
                </td>

                <td
                  colSpan="5"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.citizenship : ''}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="5"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  <label style={{ marginRight: '1rem' }}>
                    <input
                      type="checkbox"
                      name="config"
                      value="single"
                      checked={citizenshipType === 'single'}
                      onChange={handleCheckboxChange}
                    />{' '}
                    Single
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="config"
                      value="dual"
                      checked={citizenshipType === 'dual'}
                      onChange={handleCheckboxChange}
                    />{' '}
                    Dual
                  </label>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  4.&emsp;PLACE OF BIRTH
                </td>

                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.placeOfBirth : ''}
                </td>

                <td
                  colSpan="5"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    paddingTop: '4px',
                  }}
                >
                  {citizenshipType === 'dual' && (
                    <label style={{ marginRight: '10px' }}>
                      If Dual Citizenship, select country:
                    </label>
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  5.&emsp;SEX
                </td>
                <td
                  colSpan="5"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.sex : ''}
                </td>

                <td>
                  {citizenshipType === 'dual' && (
                    <select
                      value={dualCountry}
                      onChange={(e) => setDualCountry(e.target.value)}
                      style={{
                        fontSize: '58.6%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        textAlignLast: 'left',
                        width: '500%',
                      }}
                    >
                      <option value="">-- Select Country --</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    verticalAlign: 'top',
                  }}
                >
                  <br />
                  6.&emsp;CIVIL STATUS
                </td>
                <td
                  colSpan="4"
                  rowSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.civilStatus : ''}
                </td>
                <td
                  colSpan="2"
                  rowSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    verticalAlign: 'top',
                  }}
                >
                  <br />
                  17.&emsp;RESIDENTIAL&emsp;&emsp;ADDRESS
                </td>

                <td
                  colSpan="6"
                  style={{
                    height: '0.15in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    textAlign: 'center',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '2em',
                  }}
                >
                  {personalInfo
                    ? personalInfo.residential_houseBlockLotNum
                    : ''}{' '}
                  &emsp; &emsp; &emsp; &emsp;{' '}
                  {personalInfo ? personalInfo.residential_streetName : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray white black black',
                    textAlign: 'center',
                  }}
                >
                  <i>House/Block/Lot No.</i>
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray white black black',
                    textAlign: 'center',
                  }}
                >
                  <i>Street</i>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="6"
                  style={{
                    height: '0.15in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  {personalInfo
                    ? personalInfo.residential_subdivisionOrVillage
                    : ''}{' '}
                  &emsp;&emsp;&emsp;&emsp;{' '}
                  {personalInfo ? personalInfo.residential_barangayName : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black white',
                    textAlign: 'center',
                  }}
                >
                  <i>Subdivision/Village</i>
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black white',
                    textAlign: 'center',
                  }}
                >
                  <i>Barangay</i>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  7.&emsp;HEIGHT (m)
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.heightCm : ''}
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.15in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  {personalInfo
                    ? personalInfo.residential_cityOrMunicipality
                    : ''}{' '}
                  &emsp; &emsp;&emsp;&emsp;{' '}
                  {personalInfo ? personalInfo.residential_provinceName : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  <i>City/Municipality</i>
                </td>

                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  <i>Province</i>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  8.&emsp;WEIGHT (kg)
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.weightKg : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black black gray black',
                    textAlign: 'center',
                  }}
                >
                  ZIP CODE
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.residential_zipcode : ''}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  9.&emsp;BLOOD TYPE
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.bloodType : ''}
                </td>
                <td
                  colSpan="2"
                  rowSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    verticalAlign: 'top',
                  }}
                >
                  <br />
                  18.&emsp;PERMANENT &emsp;&emsp; ADDRESS
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.15in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  {personalInfo ? personalInfo.permanent_houseBlockLotNum : ''}{' '}
                  &emsp; &emsp;&emsp;&emsp;{' '}
                  {personalInfo ? personalInfo.permanent_streetName : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray white black black',
                    textAlign: 'center',
                  }}
                >
                  <i>House/Block/Lot No.</i>
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray white black black',
                    textAlign: 'center',
                  }}
                >
                  <i>Street</i>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  10.&emsp;GSIS ID NO.
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.gsisNum : ''}
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.15in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  {personalInfo
                    ? personalInfo.permanent_subdivisionOrVillage
                    : ''}{' '}
                  &emsp; &emsp;&emsp;&emsp;{' '}
                  {personalInfo ? personalInfo.permanent_barangay : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  <i>Subdivision/Village</i>
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  <i>Barangay</i>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  11.&emsp;PAG-IBIG ID NO.
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.pagibigNum : ''}
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.15in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  {personalInfo
                    ? personalInfo.permanent_cityOrMunicipality
                    : ''}{' '}
                  &emsp; &emsp;&emsp;&emsp;{' '}
                  {personalInfo ? personalInfo.permanent_provinceName : ''}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  <i>City/Municipality</i>
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  <i>Province</i>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  12.&emsp;PHILHEALTH NO.
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.philhealthNum : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid gray black black black',
                    textAlign: 'center',
                  }}
                >
                  ZIP CODE
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.permanent_zipcode : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  13.&emsp;SSS NO.
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.sssNum : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  19.&emsp;TELEPHONE NO.
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.telephone : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  14.&emsp;TIN NO.
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.tinNum : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  20.&emsp;MOBILE NO.
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.mobileNum : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  15.&emsp;AGENCY EMPLOYEE NO.
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {employeeNumber}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  21. E-MAIL ADDRESS (if any)
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.emailAddress : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.2in',
                    fontSize: '58.6%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    <i>II. FAMILY BACKGROUND</i>
                  </b>
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  rowSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  22.&emsp;SPOUSE'S SURNAME
                  <br />
                  <br />
                  &emsp;&emsp; FIRST NAME
                  <br />
                  <br />
                  &emsp;&emsp; MIDDLE NAME
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseLastName : ''}
                </td>

                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  23. NAME of CHILDREN (Write full name and list all)
                </td>

                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  DATE OF BIRTH
                  <br />
                  (dd/mm/yyyy)
                </td>
              </tr>
              <tr>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseFirstName : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 0px 1px solid black',
                  }}
                >
                  NAME EXTENSION (JR, SR)
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo1 ? childrenInfo1.childrenLastName : ''},{' '}
                  {childrenInfo1 ? childrenInfo1.childrenFirstName : ''},{' '}
                  {childrenInfo1 ? childrenInfo1.childrenMiddleName : ''}
                </td>
                <td
                  colSpan="2"
                  rowSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo1?.dateOfBirth
                    ? new Date(childrenInfo1.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '0px 1px 1px 1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseNameExtension : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseMiddleName : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo2 ? childrenInfo2.childrenLastName : ''},{' '}
                  {childrenInfo2 ? childrenInfo2.childrenFirstName : ''},{' '}
                  {childrenInfo2 ? childrenInfo2.childrenMiddleName : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo2?.dateOfBirth
                    ? new Date(childrenInfo2.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  OCCUPATION
                  <br />
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseOccupation : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo3
                    ? `${childrenInfo3.childrenLastName}, ${childrenInfo3.childrenFirstName}, ${childrenInfo3.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo3?.dateOfBirth
                    ? new Date(childrenInfo3.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  EMPLOYER/BUSINESS NAME
                  <br />
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseEmployerBusinessName : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo4
                    ? `${childrenInfo4.childrenLastName}, ${childrenInfo4.childrenFirstName}, ${childrenInfo4.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo4?.dateOfBirth
                    ? new Date(childrenInfo4.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  BUSINESS ADDRESS
                  <br />
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseBusinessAddress : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo5
                    ? `${childrenInfo5.childrenLastName}, ${childrenInfo5.childrenFirstName}, ${childrenInfo5.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo5?.dateOfBirth
                    ? new Date(childrenInfo5.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  TELEPHONE NO.
                  <br />
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.spouseTelephone : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo6
                    ? `${childrenInfo6.childrenLastName}, ${childrenInfo6.childrenFirstName}, ${childrenInfo6.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo6?.dateOfBirth
                    ? new Date(childrenInfo6.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  rowSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  24. FATHER'S SURNAME
                  <br />
                  <br />
                  &emsp;&emsp;FIRST NAME
                  <br />
                  <br />
                  &emsp;&emsp;MIDDLE NAME
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.fatherLastName : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo7
                    ? `${childrenInfo7.childrenLastName}, ${childrenInfo7.childrenFirstName}, ${childrenInfo7.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo7?.dateOfBirth
                    ? new Date(childrenInfo7.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.fatherFirstName : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 0px 1px solid black',
                  }}
                >
                  NAME EXTENSION (JR, SR)
                </td>
                <td
                  colSpan="4"
                  rowSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo8
                    ? `${childrenInfo8.childrenLastName}, ${childrenInfo8.childrenFirstName}, ${childrenInfo8.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  rowSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo8?.dateOfBirth
                    ? new Date(childrenInfo8.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="2"
                  style={{
                    height: '0.125in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '0px 1px 1px 1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.fatherNameExtension : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.fatherMiddleName : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo9
                    ? `${childrenInfo9.childrenLastName}, ${childrenInfo9.childrenFirstName}, ${childrenInfo9.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo9?.dateOfBirth
                    ? new Date(childrenInfo9.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="9"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 0px 1px solid black',
                  }}
                >
                  25. MOTHER'S MAIDEN NAME
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo10
                    ? `${childrenInfo10.childrenLastName}, ${childrenInfo10.childrenFirstName}, ${childrenInfo10.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo10?.dateOfBirth
                    ? new Date(childrenInfo10.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  rowSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '0px 1px 1px 1px solid black',
                  }}
                >
                  SURNAME
                  <br />
                  <br />
                  FIRST NAME
                  <br />
                  <br />
                  MIDDLE NAME
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.motherMaidenLastName : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo11
                    ? `${childrenInfo11.childrenLastName}, ${childrenInfo11.childrenFirstName}, ${childrenInfo11.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo11?.dateOfBirth
                    ? new Date(childrenInfo11.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.motherMaidenFirstName : ''}
                </td>
                <td
                  colSpan="4"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo12
                    ? `${childrenInfo12.childrenLastName}, ${childrenInfo12.childrenFirstName}, ${childrenInfo12.childrenMiddleName}`
                    : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {childrenInfo12?.dateOfBirth
                    ? new Date(childrenInfo12.dateOfBirth).toLocaleDateString(
                        'en-GB'
                      )
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.motherMaidenFirstName : ''}
                </td>
                <td
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
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
                    fontSize: '58.6%',
                    backgroundColor: 'gray',
                    color: 'white',
                  }}
                >
                  <b>
                    <i>III. EDUCATIONAL BACKGROUND</i>
                  </b>
                </td>
              </tr>
              <tr>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px 1px 1px 0px solid black',
                  }}
                >
                  26.
                </td>
                <td
                  colSpan="2"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px 0px 1px 1px solid black',
                    textAlign: 'center',
                  }}
                >
                  LEVEL
                </td>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  NAME OF SCHOOL
                  <br />
                  (Write in full)
                </td>
                <td
                  colSpan="3"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  BASIC EDUCATION/DEGREE/COURSE
                  <br />
                  (Write in full)
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  PERIOD OF
                  <br />
                  ATTENDANCE
                </td>
                <td
                  colSpan="2"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  HIGHEST LEVEL/
                  <br />
                  UNITS EARNED
                  <br />
                  (if not graduated)
                </td>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  YEAR
                  <br />
                  GRADUATED
                </td>
                <td
                  colSpan="1"
                  rowSpan="2"
                  style={{
                    height: '0.3in',
                    fontSize: '40%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  SCHOLARSHIP/
                  <br />
                  ACADEMIC
                  <br />
                  HONORS
                  <br />
                  RECEIVED
                </td>
              </tr>
              <tr>
                <td
                  colSpan="1"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
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
                    height: '0.1in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                    textAlign: 'center',
                  }}
                >
                  To
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  ELEMENTARY
                  <br />
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.elementaryNameOfSchool : ''}
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.elementaryDegree : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.elementaryPeriodFrom : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.elementaryPeriodTo : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.elementaryHighestAttained : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.elementaryYearGraduated : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo
                    ? personalInfo.elementaryScholarshipAcademicHonorsReceived
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  SECONDARY
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.secondaryNameOfSchool : ''}
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.secondaryDegree : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.secondaryPeriodFrom : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.secondaryPeriodTo : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.secondaryHighestAttained : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo ? personalInfo.secondaryYearGraduated : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {personalInfo
                    ? personalInfo.secondaryScholarshipAcademicHonorsReceived
                    : ''}
                </td>
              </tr>

              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  VOCATIONAL/TRADE COURSE
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo ? vocationalInfo.vocationalNameOfSchool : ''}
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo ? vocationalInfo.vocationalDegree : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo ? vocationalInfo.vocationalPeriodFrom : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo ? vocationalInfo.vocationalPeriodTo : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo
                    ? vocationalInfo.vocationalHighestAttained
                    : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo ? vocationalInfo.vocationalYearGraduated : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {vocationalInfo
                    ? vocationalInfo.vocationalScholarshipAcademicHonorsReceived
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  COLLEGE
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo ? collegeInfo.collegeNameOfSchool : ''}
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo ? collegeInfo.collegeDegree : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo ? collegeInfo.collegePeriodFrom : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo ? collegeInfo.collegePeriodTo : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo ? collegeInfo.collegeHighestAttained : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo ? collegeInfo.collegeYearGraduated : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {collegeInfo
                    ? collegeInfo.collegeScholarshipAcademicHonorsReceived
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    backgroundColor: 'lightgray',
                    border: '1px solid black',
                  }}
                >
                  GRADUATE STUDIES
                  <br />
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo ? graduateInfo.graduateNameOfSchool : ''}
                </td>
                <td
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo ? graduateInfo.graduateDegree : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo ? graduateInfo.graduatePeriodFrom : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo ? graduateInfo.graduatePeriodTo : ''}
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo ? graduateInfo.graduateHighestAttained : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo ? graduateInfo.graduateYearGraduated : ''}
                </td>
                <td
                  colSpan="1"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  {graduateInfo
                    ? graduateInfo.graduateScholarshipAcademicHonorsReceived
                    : ''}
                </td>
              </tr>
              <tr>
                <td
                  colSpan="15"
                  style={{
                    height: '0.1in',
                    fontSize: '58.6%',
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
                  colSpan="3"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
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
                  colSpan="6"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
                    border: '1px solid black',
                  }}
                >
                  &nbsp;
                </td>
                <td
                  colSpan="2"
                  style={{
                    height: '0.25in',
                    fontSize: '58.6%',
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
                    fontSize: '58.6%',
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
                    height: '0.1in',
                    fontSize: '58.6%',
                    border: '1px solid white',
                    textAlign: 'right',
                  }}
                >
                  <i>CS FORM 212 (Revised 2025), Page 1 of 4</i>
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

export default PDS1;
