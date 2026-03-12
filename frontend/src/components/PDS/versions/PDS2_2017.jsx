/**
 * PDS2_2017.jsx
 * 2017 differences vs 2025:
 *  - HAS: MONTHLY SALARY column
 *  - HAS: SALARY/JOB/PAY GRADE (if applicable) & STEP (Format "00-0") / INCREMENT column
 *  - Date format: mm/dd/yyyy
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PrintIcon from '@mui/icons-material/Print';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import AccessDenied from '../../AccessDenied';
import usePageAccess from '../../../hooks/usePageAccess';
import useProfileSections from '../../../hooks/useProfileSections';
import useActiveTemplate from '../../../hooks/useActiveTemplate';
import TemplateInfoBanner from '../../TemplateInfoBanner';

const DATE_FORMAT = 'en-US'; // mm/dd/yyyy

const PDS2_2017 = () => {
  const navigate = useNavigate();
  const [eligibilityInfo, setEligibilityInfo] = useState([]);
  const [workExperience, setWorkExperience] = useState([]);
  const { sections, loading: sectionsLoading } = useProfileSections();
  const { hasAccess, loading: accessLoading } = usePageAccess('pds2');
  const { template, loading: templateLoading, versionLabel, downloadTemplate } = useActiveTemplate();

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedEmpNum = localStorage.getItem('employeeNumber');
    if (!storedRole || !storedEmpNum) navigate('/');
  }, [navigate]);

  useEffect(() => {
    if (!sections) return;
    setEligibilityInfo(sections.eligibilities || []);
    setWorkExperience(sections.workExperiences || []);
  }, [sections]);

  const normEligibility = [...eligibilityInfo.filter(Boolean)];
  while (normEligibility.length < 7) normEligibility.push(null);

  const normWork = [...workExperience.filter(Boolean)];
  while (normWork.length < 26) normWork.push(null);

  const fmt = (d) => d ? new Date(d).toLocaleDateString(DATE_FORMAT) : '';

  if (accessLoading || sectionsLoading) {
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
    return <AccessDenied title="Access Denied" message="You do not have permission to access PDS2." returnPath="/admin-home" returnButtonText="Return to Home" />;
  }

  const cellGray = { fontSize: '62.5%', backgroundColor: 'lightgray', border: '1px solid black' };
  const cellWhite = { fontSize: '58%', border: '1px solid black' };

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
        <div style={{ overflow: 'hidden', padding: '0.25in', width: '8in', height: '13.1in' }}>
          <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '8in', tableLayout: 'fixed' }}>
            <tbody>
              <tr><td colSpan="18" style={{ height: '0.2in', fontSize: '72.5%', backgroundColor: 'gray', color: 'white' }}><b><i>IV. CIVIL SERVICE ELIGIBILITY</i></b></td></tr>
              <tr>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in' }}>27.</td>
                <td colSpan="5" rowSpan="2" style={{ ...cellGray, height: '0.3in', fontSize: '58%', textAlign: 'center' }}>CAREER SERVICE/ RA 1080 (BOARD/ BAR) UNDER<br />SPECIAL LAWS/ CES/ CSEE<br />BARANGAY ELIGIBILITY / DRIVER'S LICENSE</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>RATING<br />(If Applicable)</td>
                <td colSpan="2" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>DATE OF<br />EXAMINATION /<br />CONFERMENT</td>
                <td colSpan="5" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>PLACE OF EXAMINATION / CONFERMENT</td>
                <td colSpan="3" style={{ ...cellGray, height: '0.11in', fontSize: '55%', textAlign: 'center' }}>LICENSE (if applicable)</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ ...cellGray, height: '0.2in', textAlign: 'center' }}>NUMBER</td>
                <td colSpan="1" style={{ ...cellGray, height: '0.2in', textAlign: 'center' }}>Date of<br />Validity</td>
              </tr>

              {normEligibility.map((e, i) => (
                <tr key={i}>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.25in', fontSize: '62.5%' }}>{e?.eligibilityName || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{e?.eligibilityRating || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{e?.eligibilityDateOfExam || ''}</td>
                  <td colSpan="5" style={{ ...cellWhite, height: '0.25in', fontSize: '62.5%' }}>{e?.eligibilityPlaceOfExam || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.25in' }}>{e?.licenseNumber || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.25in' }}>{e?.DateOfValidity || ''}</td>
                </tr>
              ))}

              <tr><td colSpan="18" style={{ ...cellGray, height: '0.11in', fontSize: '55%', color: 'red', textAlign: 'center' }}><b><i>(Continue on separate sheet if necessary)</i></b></td></tr>

              {/* V. WORK EXPERIENCE — 2017 has Monthly Salary + Pay Grade */}
              <tr><td colSpan="18" style={{ height: '0.55in', fontSize: '70%', backgroundColor: 'gray', color: 'white' }}>
                <b><i>V. WORK EXPERIENCE<br />(Include private employment. Start from your recent work) Description of duties should be indicated in the attached Work Experience sheet.</i></b>
              </td></tr>

              <tr>
                <td colSpan="1" rowSpan="2" style={{ ...cellGray, height: '0.3in' }}>28.</td>
                <td colSpan="3" rowSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>INCLUSIVE DATES<br />(mm/dd/yyyy)</td>
                <td colSpan="4" rowSpan="3" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>POSITION TITLE<br />(Write in full/Do not abbreviate)</td>
                <td colSpan="4" rowSpan="3" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>DEPARTMENT / AGENCY / OFFICE / COMPANY<br />(Write in full/Do not abbreviate)</td>
                {/* ── 2017 exclusive columns ── */}
                <td colSpan="1" rowSpan="3" style={{ ...cellGray, height: '0.3in', fontSize: '50%', textAlign: 'center' }}>MONTHLY<br />SALARY</td>
                <td colSpan="2" rowSpan="3" style={{ ...cellGray, height: '0.3in', fontSize: '50%', textAlign: 'center' }}>SALARY/ JOB/<br />PAY GRADE (if<br />applicable)&<br />STEP (Format<br />"00-0")/<br />INCREMENT</td>
                <td colSpan="2" rowSpan="3" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>STATUS OF<br />APPOINTMENT</td>
                <td colSpan="1" rowSpan="3" style={{ ...cellGray, height: '0.3in', fontSize: '55%', textAlign: 'center' }}>GOV'T<br />SERVICE<br />(Y/N)</td>
              </tr>
              <tr></tr>
              <tr>
                <td colSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>From</td>
                <td colSpan="2" style={{ ...cellGray, height: '0.3in', textAlign: 'center' }}>To</td>
              </tr>

              {normWork.map((w, i) => (
                <tr key={i}>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.3in', fontSize: '62.5%' }}>{fmt(w?.workDateFrom)}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.3in' }}>{fmt(w?.workDateTo)}</td>
                  <td colSpan="4" style={{ ...cellWhite, height: '0.3in' }}>{w?.workPositionTitle || ''}</td>
                  <td colSpan="4" style={{ ...cellWhite, height: '0.3in', fontSize: '62.5%' }}>{w?.workCompany || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.3in' }}>{w?.workMonthlySalary || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.3in' }}>{w?.SalaryJobOrPayGrade || ''}</td>
                  <td colSpan="2" style={{ ...cellWhite, height: '0.3in' }}>{w?.StatusOfAppointment || ''}</td>
                  <td colSpan="1" style={{ ...cellWhite, height: '0.3in' }}>{w?.isGovtService || ''}</td>
                </tr>
              ))}

              <tr><td colSpan="18" style={{ ...cellGray, height: '0.11in', fontSize: '55%', color: 'red', textAlign: 'center' }}><b><i>(Continue on separate sheet if necessary)</i></b></td></tr>
              <tr>
                <td colSpan="4" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}><b><i>SIGNATURE</i></b></td>
                <td colSpan="7" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
                <td colSpan="3" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}><b><i>DATE</i></b></td>
                <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan="18" style={{ height: '0.11in', fontSize: '50%', border: '1px solid white', textAlign: 'right' }}>
                  <i>CS FORM 212 ({versionLabel}), Page 2 of 4</i>
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

export default PDS2_2017;