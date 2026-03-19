/**
 * PDS3_2025.jsx
 * 2025 differences vs 2017:
 *  - Date format: dd/mm/yyyy
 *  - Signature area says: (wet signature/e-signature/digital certificate)
 */
import API_BASE_URL from '../../../apiConfig';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PrintIcon from '@mui/icons-material/Print';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import AccessDenied from '../../AccessDenied';
import usePageAccess from '../../../hooks/usePageAccess';
import useProfileSections from '../../../hooks/useProfileSections';
import { getAuthHeaders } from '../../../utils/auth';
import useActiveTemplate from '../../../hooks/useActiveTemplate';
import TemplateInfoBanner from '../../TemplateInfoBanner';

const DATE_FORMAT = 'en-GB'; // dd/mm/yyyy

const PDS3_2025 = () => {
  const navigate = useNavigate();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [voluntaryWork, setVoluntaryWork] = useState([]);
  const [learningDev, setLearningDev] = useState([]);
  const [otherInfo, setOtherInfo] = useState([]);
  const { sections } = useProfileSections();
  const { hasAccess, loading: accessLoading } = usePageAccess('pds3');
  const { template, loading: templateLoading, versionLabel, downloadTemplate } = useActiveTemplate();

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const empNum = localStorage.getItem('employeeNumber');
    if (storedRole && empNum) { setEmployeeNumber(empNum); } else { navigate('/'); }
  }, [navigate]);

  useEffect(() => {
    if (!employeeNumber) return;
    axios.get(`${API_BASE_URL}/VoluntaryRoute/voluntary-work`, getAuthHeaders())
      .then((res) => {
        const records = (res.data || []).filter((r) => String(r.person_id) === String(employeeNumber));
        setVoluntaryWork(records.slice(0, 7));
      })
      .catch((err) => console.error('Voluntary work load error:', err));
  }, [employeeNumber]);

  useEffect(() => {
    if (!sections) return;
    setLearningDev(sections.learningDevelopment || []);
    setOtherInfo(sections.otherInformation || []);
  }, [sections]);

  const normVW = [...voluntaryWork.filter(Boolean)];
  while (normVW.length < 7) normVW.push(null);
  const normLD = [...learningDev.filter(Boolean)];
  while (normLD.length < 21) normLD.push(null);
  const normOI = [...otherInfo.filter(Boolean)];
  while (normOI.length < 7) normOI.push(null);

  const fmt = (d) => d ? new Date(d).toLocaleDateString(DATE_FORMAT) : '';

  if (accessLoading) {
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
    return <AccessDenied title="Access Denied" message="You do not have permission to access PDS3." returnPath="/admin-home" returnButtonText="Return to Home" />;
  }

  const cellGray = { fontSize: '62.5%', backgroundColor: 'lightgray', border: '1px solid black' };
  const cellWhite = { fontSize: '62.5%', border: '1px solid black' };

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
        <div style={{ padding: '0.25in', width: '8in', height: '12.9in' }}>
          <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '8in', tableLayout: 'fixed' }}>
            <tbody>
              {/* VI. VOLUNTARY WORK */}
              <tr><td colSpan="15" style={{ height: '0.2in', fontSize: '72.5%', backgroundColor: 'gray', color: 'white' }}><b><i>VI. VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT / PEOPLE / VOLUNTARY ORGANIZATION/S</i></b></td></tr>
              <tr>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in' }}>29.</td>
                <td colSpan="6" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>NAME & ADDRESS OF ORGANIZATION<br />(Write in full)</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.2in', textAlign: 'center' }}>INCLUSIVE DATES<br />(dd/mm/yyyy)</td>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in', fontSize: '50%', textAlign: 'center' }}>NUMBER OF<br />HOURS</td>
                <td colSpan="5" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>POSITION / NATURE OF WORK</td>
              </tr>
              <tr>
                <td colSpan="1" style={{ ...cellGray, height: '0.11in', textAlign: 'center' }}>From</td>
                <td colSpan="1" style={{ ...cellGray, height: '0.11in', textAlign: 'center' }}>To</td>
              </tr>
              {normVW.map((vw, i) => (
                <tr key={i}>
                  <td colSpan="7" style={{ ...cellWhite, height: '0.3in' }}>{vw?.nameAndAddress || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.3in', fontSize: '55%' }}>{fmt(vw?.dateFrom)}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.3in', fontSize: '55%' }}>{fmt(vw?.dateTo)}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.3in', fontSize: '55%' }}>{vw?.numberOfHours || ''}</td>
                  <td colSpan="5" style={{ ...cellWhite, height: '0.3in' }}>{vw?.natureOfWork || ''}</td>
                </tr>
              ))}
              <tr><td colSpan="15" style={{ ...cellGray, height: '0.11in', fontSize: '55%', color: 'red', textAlign: 'center' }}><b><i>(Continue on separate sheet if necessary)</i></b></td></tr>

              {/* VII. LEARNING AND DEVELOPMENT */}
              <tr><td colSpan="15" style={{ height: '0.2in', fontSize: '72.5%', backgroundColor: 'gray', color: 'white' }}><b><i>VII. LEARNING AND DEVELOPMENT (L&D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED</i></b></td></tr>
              <tr>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.5in' }}>30.</td>
                <td colSpan="6" rowSpan="2" style={{ ...cellGray, height: '0.5in', textAlign: 'center' }}>TITLE OF LEARNING AND DEVELOPMENT INTERVENTIONS/TRAINING PROGRAMS<br />(Write in full)</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.4in', fontSize: '55%', textAlign: 'center' }}>INCLUSIVE DATES OF<br />ATTENDANCE<br />(dd/mm/yyyy)</td>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.5in', fontSize: '55%', textAlign: 'center' }}>NUMBER OF<br />HOURS</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellGray, height: '0.5in', fontSize: '50%', textAlign: 'center' }}>Type of LD<br />(Managerial/ Supervisory/<br />Technical/etc)</td>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.5in', textAlign: 'center' }}>CONDUCTED/ SPONSORED BY<br />(Write in full)</td>
              </tr>
              <tr>
                <td colSpan="1" style={{ ...cellGray, height: '0.11in', textAlign: 'center' }}>From</td>
                <td colSpan="1" style={{ ...cellGray, height: '0.11in', textAlign: 'center' }}>To</td>
              </tr>
              {normLD.map((ld, i) => (
                <tr key={i}>
                  <td colSpan="7" style={{ ...cellWhite, height: '0.25in' }}>{ld?.titleOfProgram || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in', fontSize: '55%' }}>{fmt(ld?.dateFrom)}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in', fontSize: '55%' }}>{fmt(ld?.dateTo)}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in', fontSize: '55%' }}>{ld?.numberOfHours || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.25in', fontSize: '55%' }}>{ld?.typeOfLearningDevelopment || ''}</td>
                  <td colSpan="3" style={{ ...cellWhite, height: '0.25in' }}>{ld?.conductedSponsored || ''}</td>
                </tr>
              ))}

              {/* VIII. OTHER INFORMATION */}
              <tr>
                <td colSpan="1" style={{ ...cellGray, height: '0.3in' }}>31.</td>
                <td colSpan="3" style={{ ...cellGray, height: '0.3in', fontSize: '55%', textAlign: 'center' }}>SPECIAL SKILLS and HOBBIES</td>
                <td colSpan="1" style={{ ...cellGray, height: '0.3in' }}>32.</td>
                <td colSpan="6" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>NON-ACADEMIC DISTINCTIONS / RECOGNITION<br />(Write in full)</td>
                <td colSpan="1" style={{ ...cellGray, height: '0.3in' }}>33.</td>
                <td colSpan="3" style={{ ...cellGray, height: '0.3in', fontSize: '55%', textAlign: 'center' }}>MEMBERSHIP IN ASSOCIATION/ORGANIZATION<br />(Write in full)</td>
              </tr>
              {normOI.map((oi, i) => (
                <tr key={i}>
                  <td colSpan="4" style={{ ...cellWhite, height: '0.3in' }}>{oi?.specialSkills || ''}</td>
                  <td colSpan="7" style={{ ...cellWhite, height: '0.3in' }}>{oi?.nonAcademicDistinctions || ''}</td>
                  <td colSpan="4" style={{ ...cellWhite, height: '0.3in' }}>{oi?.membershipInAssociation || ''}</td>
                </tr>
              ))}

              <tr><td colSpan="15" style={{ ...cellGray, height: '0.11in', fontSize: '55%', color: 'red', textAlign: 'center' }}><b><i>(Continue on separate sheet if necessary)</i></b></td></tr>

              {/* ── 2025: signature label includes e-signature/digital certificate ── */}
              <tr>
                <td colSpan="4" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>
                  <b><i>SIGNATURE</i></b><br />
                  <span style={{ fontSize: '50%' }}>(wet signature/e-signature/digital certificate)</span>
                </td>
                <td colSpan="5" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}><b><i>DATE</i></b></td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan="15" style={{ height: '0.11in', fontSize: '50%', border: '1px solid white', textAlign: 'right' }}>
                  <i>CS FORM 212 ({versionLabel}), Page 3 of 4</i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => window.print()} className="no-print"
        style={{ position: 'fixed', bottom: '60px', right: '30px', backgroundColor: '#6D2323', color: '#FFFFFF', padding: '14px 20px', border: 'none', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0px 4px 15px rgba(0,0,0,0.3)', zIndex: 9999 }}>
        <PrintIcon style={{ fontSize: '24px' }} /> Save / Print
      </button>
    </div>
  );
};

export default PDS3_2025;