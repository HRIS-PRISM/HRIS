/**
 * PDS1_2017.jsx
 * 2017 version differences vs 2025:
 *  - Date format: mm/dd/yyyy  (not dd/mm/yyyy)
 *  - Item 3 label shows (mm/dd/yyyy)
 *  - Children DOB label shows (mm/dd/yyyy)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PrintIcon from '@mui/icons-material/Print';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import AccessDenied from '../../AccessDenied';
import usePageAccess from '../../../hooks/usePageAccess';
import useProfileData from '../../../hooks/useProfileData';
import useProfileSections from '../../../hooks/useProfileSections';
import useActiveTemplate from '../../../hooks/useActiveTemplate';
import TemplateInfoBanner from '../../TemplateInfoBanner';

// ── 2017 uses mm/dd/yyyy ──────────────────────────────────────────────────────
const DATE_FORMAT = 'en-US'; // mm/dd/yyyy

const PDS1_2017 = () => {
  const navigate = useNavigate();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [personalInfo, setPersonalInfo] = useState(null);
  const [vocationalInfo, setVocationalInfo] = useState(null);
  const [collegeInfo, setCollegeInfo] = useState(null);
  const [graduateInfo, setGraduateInfo] = useState(null);
  const [children, setChildren] = useState([]);

  const { person, loading: profileLoading } = useProfileData();
  const { sections, loading: sectionsLoading } = useProfileSections();
  const { hasAccess, loading: accessLoading } = usePageAccess('pds1');
  const { template, loading: templateLoading, versionLabel, downloadTemplate } = useActiveTemplate();

  const [citizenshipType, setCitizenshipType] = useState('');
  const [dualCountry, setDualCountry] = useState('');

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedEmployeeNumber = localStorage.getItem('employeeNumber');
    if (storedRole && storedEmployeeNumber) {
      setEmployeeNumber(storedEmployeeNumber);
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (person) setPersonalInfo(person);
    if (sections) {
      if (sections.vocational?.length > 0) setVocationalInfo(sections.vocational[0]);
      if (sections.colleges?.length > 0) setCollegeInfo(sections.colleges[0]);
      if (sections.graduates?.length > 0) setGraduateInfo(sections.graduates[0]);
      setChildren(sections.children || []);
    }
  }, [person, sections]);

  const handleCheckboxChange = (e) => {
    const value = e.target.value;
    setCitizenshipType(value === citizenshipType ? '' : value);
    if (value !== 'dual') setDualCountry('');
  };

  // ── 2017: mm/dd/yyyy ────────────────────────────────────────────────────────
  const fmt = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString(DATE_FORMAT) : '';

  const childName = (c) =>
    c ? `${c.childrenLastName}, ${c.childrenFirstName}, ${c.childrenMiddleName}` : '';

  const countries = [
    'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria',
    'Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin',
    'Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso',
    'Burundi','Cambodia','Cameroon','Canada','Cape Verde','Chad','Chile','China','Colombia','Comoros',
    'Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Democratic Republic of the Congo','Denmark',
    'Djibouti','Dominica','Dominican Republic','East Timor','Ecuador','Egypt','El Salvador',
    'Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon',
    'Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau',
    'Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
    'Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait',
    'Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania',
    'Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands',
    'Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco',
    'Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger',
    'Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Panama',
    'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
    'Republic of the Congo','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia',
    'Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia',
    'Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands',
    'Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname',
    'Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo','Tonga',
    'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
    'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu',
    'Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
  ];

  if (accessLoading || profileLoading || sectionsLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6d2323' }}>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Personal Data Sheet (PDS1)."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  const cellGray = { fontSize: '58.6%', backgroundColor: 'lightgray', border: '1px solid black' };
  const cellWhite = { fontSize: '58.6%', border: '1px solid black' };

  return (
    <div id="print-section">
      <style>{`
        @media print {
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: fit-content; margin: 0; padding: 0; background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { size: legal portrait; margin: 0; }
        }
      `}</style>

      <TemplateInfoBanner template={template} downloadTemplate={downloadTemplate} loading={templateLoading} />

      <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'white' }}>
        <div style={{ overflow: 'hidden', padding: '0.25in', width: '8in' }}>
          <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '8in', tableLayout: 'fixed', marginTop: '-5px' }}>
            <tbody>
              <tr>
                <td colSpan="2" style={{ height: '0.1in', fontSize: '58.6%' }}><b><i>CS Form No. 212</i></b></td>
                {[...Array(13)].map((_, i) => <td key={i} colSpan="1" style={{ height: '0.1in', fontSize: '58.6%' }} />)}
              </tr>
              <tr>
                <td colSpan="2" style={{ height: '0.1in', fontSize: '58.6%' }}><b><i>{versionLabel}</i></b></td>
              </tr>
              <tr>
                <td colSpan="15" style={{ height: '0.1in' }}>
                  <h1 style={{ textAlign: 'center', marginTop: '-20px', marginBottom: '-10px' }}><b>PERSONAL DATA SHEET</b></h1>
                </td>
              </tr>
              <tr>
                <td colSpan="15" style={{ height: '0.3in', fontSize: '58.6%' }}>
                  <b><i>WARNING: Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative/criminal case/s against the person concerned.</i></b><br />
                  <b><i>READ THE ATTACHED GUIDE TO FILLING OUT THE PERSONAL DATA SHEET (PDS) BEFORE ACCOMPLISHING THE PDS FORMS.</i></b>
                </td>
              </tr>
              <tr>
                <td colSpan="11" style={{ height: '0.11in', fontSize: '58.6%' }}>
                  Print legibly. Tick appropriate boxes (□) and use separate sheet if necessary. Indicate N/A if not applicable. <b>DO NOT ABBREVIATE.</b>
                </td>
                <td colSpan="1" style={{ height: '0.11in', fontSize: '58.6%', backgroundColor: 'gray', border: '1px solid black' }}>1. CS ID No</td>
                <td colSpan="3" style={{ height: '0.11in', fontSize: '58.6%', textAlign: 'right', border: '1px solid black' }}>(Do not fill up. For CSC use only)</td>
              </tr>

              <tr><td colSpan="15" style={{ height: '0.2in', fontSize: '58.6%', backgroundColor: 'gray', color: 'white' }}><b><i>I. PERSONAL INFORMATION</i></b></td></tr>

              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.20in' }}>2. &emsp; SURNAME</td>
                <td colSpan="12" style={{ ...cellWhite, height: '0.20in' }}>{personalInfo?.lastName || ''}</td>
              </tr>
              <tr>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.20in' }}>&emsp;&emsp; FIRST NAME</td>
                <td colSpan="9" rowSpan="2" style={{ ...cellWhite, height: '0.20in' }}>{personalInfo?.firstName || ''}</td>
                <td colSpan="3" style={{ ...cellGray, height: '0.125in' }}><sup>NAME EXTENSION (JR, SR)</sup></td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.125in' }}><sup>{personalInfo?.nameExtension || ''}</sup></td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.125in' }}>&emsp;&emsp;MIDDLE NAME</td>
                <td colSpan="12" style={{ ...cellWhite, height: '0.125in' }}>{personalInfo?.middleName || ''}</td>
              </tr>

              {/* ── 2017: label says (mm/dd/yyyy) ── */}
              <tr>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.25in' }}>3.&emsp;DATE OF BIRTH<br /><p>&emsp;&emsp;(mm/dd/yyyy)</p></td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(personalInfo?.birthDate)}</td>
                <td colSpan="3" rowSpan="4" style={{ ...cellGray, height: '0.25in', verticalAlign: 'top' }}>
                  16.&emsp; CITIZENSHIP<br />&emsp;&emsp;If holder of dual citizenship,<br />&emsp;&emsp;please indicate the details
                </td>
                <td colSpan="5" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.citizenship || ''}</td>
              </tr>
              <tr>
                <td colSpan="5" style={{ ...cellWhite, height: '0.25in' }}>
                  <label style={{ marginRight: '1rem' }}><input type="checkbox" value="single" checked={citizenshipType === 'single'} onChange={handleCheckboxChange} /> Single</label>
                  <label><input type="checkbox" value="dual" checked={citizenshipType === 'dual'} onChange={handleCheckboxChange} /> Dual</label>
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>4.&emsp;PLACE OF BIRTH</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.placeOfBirth || ''}</td>
                <td colSpan="5" style={{ ...cellWhite, height: '0.25in', paddingTop: '4px' }}>
                  {citizenshipType === 'dual' && <label>If Dual Citizenship, select country:</label>}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>5.&emsp;SEX</td>
                <td colSpan="5" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.sex || ''}</td>
                <td>
                  {citizenshipType === 'dual' && (
                    <select value={dualCountry} onChange={(e) => setDualCountry(e.target.value)}
                      style={{ fontSize: '58.6%', border: 'none', outline: 'none', backgroundColor: 'transparent', width: '500%' }}>
                      <option value="">-- Select Country --</option>
                      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </td>
              </tr>

              <tr>
                <td colSpan="3" rowSpan="4" style={{ ...cellGray, height: '0.25in', verticalAlign: 'top' }}><br />6.&emsp;CIVIL STATUS</td>
                <td colSpan="4" rowSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.civilStatus || ''}</td>
                <td colSpan="2" rowSpan="6" style={{ ...cellGray, height: '0.25in', verticalAlign: 'top' }}><br />17.&emsp;RESIDENTIAL&emsp;&emsp;ADDRESS</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.15in', textAlign: 'center' }}>
                  {personalInfo?.residential_houseBlockLotNum || ''} &emsp;&emsp;&emsp;&emsp; {personalInfo?.residential_streetName || ''}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>House/Block/Lot No.</i></td>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Street</i></td>
              </tr>
              <tr>
                <td colSpan="6" style={{ ...cellWhite, height: '0.15in', textAlign: 'center' }}>
                  {personalInfo?.residential_subdivisionOrVillage || ''} &emsp;&emsp;&emsp;&emsp; {personalInfo?.residential_barangayName || ''}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Subdivision/Village</i></td>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Barangay</i></td>
              </tr>
              <tr>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.25in' }}>7.&emsp;HEIGHT (m)</td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.heightCm || ''}</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.15in', textAlign: 'center' }}>
                  {personalInfo?.residential_cityOrMunicipality || ''} &emsp;&emsp;&emsp;&emsp; {personalInfo?.residential_provinceName || ''}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>City/Municipality</i></td>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Province</i></td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>8.&emsp;WEIGHT (kg)</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.weightKg || ''}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>ZIP CODE</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.residential_zipcode || ''}</td>
              </tr>

              <tr>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.25in' }}>9.&emsp;BLOOD TYPE</td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.bloodType || ''}</td>
                <td colSpan="2" rowSpan="6" style={{ ...cellGray, height: '0.25in', verticalAlign: 'top' }}><br />18.&emsp;PERMANENT&emsp;&emsp;ADDRESS</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.15in', textAlign: 'center' }}>
                  {personalInfo?.permanent_houseBlockLotNum || ''} &emsp;&emsp;&emsp;&emsp; {personalInfo?.permanent_streetName || ''}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>House/Block/Lot No.</i></td>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Street</i></td>
              </tr>
              <tr>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.25in' }}>10.&emsp;GSIS ID NO.</td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.gsisNum || ''}</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.15in', textAlign: 'center' }}>
                  {personalInfo?.permanent_subdivisionOrVillage || ''} &emsp;&emsp;&emsp;&emsp; {personalInfo?.permanent_barangay || ''}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Subdivision/Village</i></td>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Barangay</i></td>
              </tr>
              <tr>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.25in' }}>11.&emsp;PAG-IBIG ID NO.</td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.pagibigNum || ''}</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.15in', textAlign: 'center' }}>
                  {personalInfo?.permanent_cityOrMunicipality || ''} &emsp;&emsp;&emsp;&emsp; {personalInfo?.permanent_provinceName || ''}
                </td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>City/Municipality</i></td>
                <td colSpan="3" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}><i>Province</i></td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>12.&emsp;PHILHEALTH NO.</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.philhealthNum || ''}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>ZIP CODE</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.permanent_zipcode || ''}</td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>13.&emsp;SSS NO.</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.sssNum || ''}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in' }}>19.&emsp;TELEPHONE NO.</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.telephone || ''}</td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>14.&emsp;TIN NO.</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.tinNum || ''}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in' }}>20.&emsp;MOBILE NO.</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.mobileNum || ''}</td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>15.&emsp;AGENCY EMPLOYEE NO.</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{employeeNumber}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in' }}>21. E-MAIL ADDRESS (if any)</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.emailAddress || ''}</td>
              </tr>

              <tr><td colSpan="15" style={{ height: '0.2in', fontSize: '58.6%', backgroundColor: 'gray', color: 'white' }}><b><i>II. FAMILY BACKGROUND</i></b></td></tr>

              {/* ── 2017: Children DOB label says (mm/dd/yyyy) ── */}
              <tr>
                <td colSpan="3" rowSpan="4" style={{ ...cellGray, height: '0.25in' }}>22.&emsp;SPOUSE'S SURNAME<br /><br />&emsp;&emsp; FIRST NAME<br /><br />&emsp;&emsp; MIDDLE NAME</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.spouseLastName || ''}</td>
                <td colSpan="4" style={{ ...cellGray, height: '0.25in' }}>23. NAME of CHILDREN (Write full name and list all)</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>DATE OF BIRTH<br />(mm/dd/yyyy)</td>
              </tr>
              <tr>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.125in' }}>{personalInfo?.spouseFirstName || ''}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.125in' }}>NAME EXTENSION (JR, SR)</td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.125in' }}>{childName(children[0])}</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellWhite, height: '0.125in' }}>{fmt(children[0]?.dateOfBirth)}</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ ...cellGray, height: '0.125in' }}>{personalInfo?.spouseNameExtension || ''}</td>
              </tr>
              <tr>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.spouseMiddleName || ''}</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[1])}</td>
                <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[1]?.dateOfBirth)}</td>
              </tr>

              {[
                { label: 'OCCUPATION', field: 'spouseOccupation', childIdx: 2 },
                { label: 'EMPLOYER/BUSINESS NAME', field: 'spouseEmployerBusinessName', childIdx: 3 },
                { label: 'BUSINESS ADDRESS', field: 'spouseBusinessAddress', childIdx: 4 },
                { label: 'TELEPHONE NO.', field: 'spouseTelephone', childIdx: 5 },
              ].map(({ label, field, childIdx }) => (
                <tr key={label}>
                  <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>{label}</td>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.[field] || ''}</td>
                  <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[childIdx])}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[childIdx]?.dateOfBirth)}</td>
                </tr>
              ))}

              <tr>
                <td colSpan="3" rowSpan="4" style={{ ...cellGray, height: '0.25in' }}>24. FATHER'S SURNAME<br /><br />&emsp;&emsp;FIRST NAME<br /><br />&emsp;&emsp;MIDDLE NAME</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.fatherLastName || ''}</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[6])}</td>
                <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[6]?.dateOfBirth)}</td>
              </tr>
              <tr>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.125in' }}>{personalInfo?.fatherFirstName || ''}</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.125in' }}>NAME EXTENSION (JR, SR)</td>
                <td colSpan="4" rowSpan="2" style={{ ...cellWhite, height: '0.125in' }}>{childName(children[7])}</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellWhite, height: '0.125in' }}>{fmt(children[7]?.dateOfBirth)}</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ ...cellGray, height: '0.125in' }}>{personalInfo?.fatherNameExtension || ''}</td>
              </tr>
              <tr>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.fatherMiddleName || ''}</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[8])}</td>
                <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[8]?.dateOfBirth)}</td>
              </tr>

              <tr>
                <td colSpan="9" style={{ ...cellGray, height: '0.25in' }}>25. MOTHER'S MAIDEN NAME</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[9])}</td>
                <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[9]?.dateOfBirth)}</td>
              </tr>
              <tr>
                <td colSpan="3" rowSpan="3" style={{ ...cellGray, height: '0.25in' }}>SURNAME<br /><br />FIRST NAME<br /><br />MIDDLE NAME</td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.motherMaidenLastName || ''}</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[10])}</td>
                <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[10]?.dateOfBirth)}</td>
              </tr>
              <tr>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.motherMaidenFirstName || ''}</td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>{childName(children[11])}</td>
                <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{fmt(children[11]?.dateOfBirth)}</td>
              </tr>
              <tr>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>{personalInfo?.motherMaidenMiddleName || ''}</td>
                <td colSpan="6" style={{ ...cellGray, height: '0.25in', color: 'red', textAlign: 'center' }}><b><i>(Continue on separate sheet if necessary)</i></b></td>
              </tr>

              <tr><td colSpan="15" style={{ height: '0.2in', fontSize: '58.6%', backgroundColor: 'gray', color: 'white' }}><b><i>III. EDUCATIONAL BACKGROUND</i></b></td></tr>
              <tr>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in' }}>26.</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>LEVEL</td>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>NAME OF SCHOOL<br />(Write in full)</td>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>BASIC EDUCATION/DEGREE/COURSE<br />(Write in full)</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>PERIOD OF<br />ATTENDANCE</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>HIGHEST LEVEL/<br />UNITS EARNED<br />(if not graduated)</td>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>YEAR<br />GRADUATED</td>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in', fontSize: '40%', textAlign: 'center' }}>SCHOLARSHIP/<br />ACADEMIC<br />HONORS<br />RECEIVED</td>
              </tr>
              <tr>
                <td colSpan="1" style={{ ...cellGray, height: '0.1in', textAlign: 'center' }}>From</td>
                <td colSpan="1" style={{ ...cellGray, height: '0.1in', textAlign: 'center' }}>To</td>
              </tr>

              {[
                { label: 'ELEMENTARY', name: personalInfo?.elementaryNameOfSchool, degree: personalInfo?.elementaryDegree, from: personalInfo?.elementaryPeriodFrom, to: personalInfo?.elementaryPeriodTo, highest: personalInfo?.elementaryHighestAttained, year: personalInfo?.elementaryYearGraduated, honors: personalInfo?.elementaryScholarshipAcademicHonorsReceived },
                { label: 'SECONDARY', name: personalInfo?.secondaryNameOfSchool, degree: personalInfo?.secondaryDegree, from: personalInfo?.secondaryPeriodFrom, to: personalInfo?.secondaryPeriodTo, highest: personalInfo?.secondaryHighestAttained, year: personalInfo?.secondaryYearGraduated, honors: personalInfo?.secondaryScholarshipAcademicHonorsReceived },
                { label: 'VOCATIONAL/TRADE COURSE', name: vocationalInfo?.vocationalNameOfSchool, degree: vocationalInfo?.vocationalDegree, from: vocationalInfo?.vocationalPeriodFrom, to: vocationalInfo?.vocationalPeriodTo, highest: vocationalInfo?.vocationalHighestAttained, year: vocationalInfo?.vocationalYearGraduated, honors: vocationalInfo?.vocationalScholarshipAcademicHonorsReceived },
                { label: 'COLLEGE', name: collegeInfo?.collegeNameOfSchool, degree: collegeInfo?.collegeDegree, from: collegeInfo?.collegePeriodFrom, to: collegeInfo?.collegePeriodTo, highest: collegeInfo?.collegeHighestAttained, year: collegeInfo?.collegeYearGraduated, honors: collegeInfo?.collegeScholarshipAcademicHonorsReceived },
                { label: 'GRADUATE STUDIES', name: graduateInfo?.graduateNameOfSchool, degree: graduateInfo?.graduateDegree, from: graduateInfo?.graduatePeriodFrom, to: graduateInfo?.graduatePeriodTo, highest: graduateInfo?.graduateHighestAttained, year: graduateInfo?.graduateYearGraduated, honors: graduateInfo?.graduateScholarshipAcademicHonorsReceived },
              ].map(({ label, name, degree, from, to, highest, year, honors }) => (
                <tr key={label}>
                  <td colSpan="3" style={{ ...cellGray, height: '0.25in' }}>{label}</td>
                  <td colSpan="3" style={{ ...cellWhite, height: '0.25in' }}>{name || ''}</td>
                  <td colSpan="3" style={{ ...cellWhite, height: '0.25in' }}>{degree || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in' }}>{from || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in' }}>{to || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{highest || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in' }}>{year || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in' }}>{honors || ''}</td>
                </tr>
              ))}

              <tr>
                <td colSpan="15" style={{ ...cellGray, height: '0.1in', color: 'red', textAlign: 'center' }}><b><i>(Continue on separate sheet if necessary)</i></b></td>
              </tr>
              <tr>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}><b><i>SIGNATURE</i></b></td>
                <td colSpan="6" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}><b><i>DATE</i></b></td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan="15" style={{ height: '0.1in', fontSize: '58.6%', border: '1px solid white', textAlign: 'right' }}>
                  <i>CS FORM 212 ({versionLabel}), Page 1 of 4</i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => window.print()} className="no-print"
        style={{ position: 'fixed', bottom: '60px', right: '30px', backgroundColor: '#6D2323', color: '#FFFFFF', padding: '14px 20px', border: 'none', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0px 4px 15px rgba(0,0,0,0.3)', zIndex: 9999 }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <PrintIcon style={{ fontSize: '24px' }} /> Save / Print
      </button>
    </div>
  );
};

export default PDS1_2017;