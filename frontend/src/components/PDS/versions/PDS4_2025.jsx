/**
 * PDS4_2025.jsx
 * 2025 differences vs 2017:
 *  - References section: "OFFICE / RESIDENTIAL ADDRESS" and "CONTACT NO. AND/OR EMAIL"
 *  - Photo box: "Passport-sized unfiltered digital picture taken within the last 6 months 4.5 cm. X 3.5 cm"
 *  - Government ID label: "Government Issued ID (i.e.Passport, GSIS, SSS, PRC, Driver's License, etc.) PLEASE INDICATE ID Number and Date of Issuance"
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PrintIcon from '@mui/icons-material/Print';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import AccessDenied from '../../AccessDenied';
import usePageAccess from '../../../hooks/usePageAccess';
import useActiveTemplate from '../../../hooks/useActiveTemplate';
import TemplateInfoBanner from '../../TemplateInfoBanner';

const PDS4_2025 = () => {
  const navigate = useNavigate();
  const { hasAccess, loading: accessLoading } = usePageAccess('pds4');
  const { template, loading: templateLoading, versionLabel, downloadTemplate } = useActiveTemplate();

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const storedEmpNum = localStorage.getItem('employeeNumber');
    if (!storedRole || !storedEmpNum) navigate('/');
  }, [navigate]);

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
    return <AccessDenied title="Access Denied" message="You do not have permission to access PDS4." returnPath="/admin-home" returnButtonText="Return to Home" />;
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
        <div style={{ overflow: 'hidden', padding: '0.25in', width: '8in', height: 'fit-content' }}>
          <thead>
            <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '8in', tableLayout: 'fixed', marginTop: '-5px' }}>
              <tbody>
                <tr>
                  <td colSpan="12" style={{ ...cellGray, height: '1.1in' }}>
                    34.&emsp;&emsp;Are you related by consanguinity or affinity to the appointing or recommending authority, or to the<br />
                    &emsp;&emsp;&emsp; chief of bureau or office or to the person who has immediate supervision over you in the Office,<br />
                    &emsp;&emsp;&emsp; Bureau or Department where you will be apppointed,<br /><br />
                    &emsp;&emsp;&emsp; a. within the third degree?<br /><br />
                    &emsp;&emsp;&emsp; b. within the fourth degree (for Local Government Unit - Career Employees)?<br /><br /><br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '1.1in' }}>
                    <br /><br /><br />
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No
                    <br /><br /><br /><br />
                    &emsp;&emsp;If YES, give details:<br />&emsp;&emsp;_________________________<br />
                  </td>
                </tr>

                <tr>
                  <td colSpan="12" rowSpan="2" style={{ ...cellGray, height: '1.5in' }}>
                    35.&emsp;&emsp;a. Have you ever been found guilty of any administrative offense?<br /><br /><br /><br /><br /><br />
                    &emsp;&emsp;&emsp; b. Have you been criminally charged before any court?<br /><br /><br /><br /><br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.75in' }}>
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details:<br />&emsp;&emsp;_________________________
                  </td>
                </tr>
                <tr>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.85in' }}>
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details:<br /><br />
                    &emsp;&emsp;&emsp;&emsp;&emsp;Date Filed: _____________<br />
                    &emsp;&emsp;Status of Case/s: _____________
                  </td>
                </tr>

                <tr>
                  <td colSpan="12" style={{ ...cellGray, height: '0.6in' }}>
                    <br />36.&emsp;&emsp;Have you ever been convicted of any crime or violation of any law, decree, ordinance or<br />
                    &emsp;&emsp;&emsp; regulation by any court or tribunal?<br /><br /><br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.6in' }}>
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details:<br />&emsp;&emsp;_________________________
                  </td>
                </tr>

                <tr>
                  <td colSpan="12" style={{ ...cellGray, height: '0.6in' }}>
                    <br />37.&emsp;&emsp;Have you ever been separated from the service in any of the following modes: resignation,<br />
                    &emsp;&emsp;&emsp; retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased<br />
                    &emsp;&emsp;&emsp; out (abolition) in the public or private sector?<br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.6in' }}>
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details:<br />&emsp;&emsp;_________________________
                  </td>
                </tr>

                <tr>
                  <td colSpan="12" style={{ ...cellGray, height: '1.05in' }}>
                    38.&emsp;&emsp;a. Have you ever been a candidate in a national or local election held within the last year (except<br />
                    &emsp;&emsp;&emsp; Barangay election)?<br /><br /><br />
                    &emsp;&emsp;&emsp; b. Have you resigned from the government service during the three (3)-month period before the<br />
                    &emsp;&emsp;&emsp; last election to promote/actively campaign for a national or local candidate?<br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '1.1in' }}>
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details: _____________________<br /><br />
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details: _____________________<br />
                  </td>
                </tr>

                <tr>
                  <td colSpan="12" style={{ ...cellGray, height: '0.6in' }}>
                    <br />39.&emsp;&emsp;Have you acquired the status of an immigrant or permanent resident of another country?<br /><br /><br /><br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '0.6in' }}>
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, give details (country):<br />&emsp;&emsp;_________________________
                  </td>
                </tr>

                <tr>
                  <td colSpan="12" style={{ ...cellGray, height: '1in' }}>
                    40. &emsp;&emsp; Pursuant to: (a) Indigenous People's Act (RA 8371); (b) Magna Carta for Disabled Persons (RA<br />
                    &emsp;&emsp;&emsp; 7277); and (c) Solo Parents Welfare Act of 2000 (RA 8972), please answer the following items:<br /><br />
                    &emsp;&emsp;&emsp; a. Are you a member of any indigenous group?<br /><br /><br />
                    &emsp;&emsp;&emsp; b. Are you a person with disability?<br /><br /><br />
                    &emsp;&emsp;&emsp; c. Are you a solo parent?<br /><br /><br /><br />
                  </td>
                  <td colSpan="6" style={{ ...cellWhite, height: '1.1in' }}>
                    <br /><br /><br /><br />
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br /><br />
                    &emsp;&emsp;If YES, please specify: _____________________<br /><br /><br />
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br />
                    &emsp;&emsp;If YES, please specify ID No:&emsp;&emsp;____________<br /><br /><br />
                    &emsp; <input type="checkbox" /> Yes &emsp; <input type="checkbox" /> No<br />
                    &emsp;&emsp;If YES, please specify Id No:&emsp;&emsp;____________<br />
                  </td>
                </tr>

                {/* ── 41. REFERENCES — 2025 uses OFFICE/RESIDENTIAL ADDRESS + CONTACT NO. AND/OR EMAIL ── */}
                <tr>
                  <td colSpan="14" style={{ ...cellGray, height: '0.25in' }}>
                    41.&emsp;&emsp; REFERENCES <span style={{ color: 'red' }}>(Person not related by consanguinity or affinity to applicant/appointee)</span>
                  </td>
                  {/* ── 2025 photo box ── */}
                  <td colSpan="4" rowSpan="6" style={{ ...cellWhite, height: '0.1in', textAlign: 'center' }}>
                    <div style={{ border: '1px solid black', width: '3.5cm', height: '4.5cm', position: 'relative', left: '17.5px', top: '7.5px', textAlign: 'center' }}>
                      <br />
                      Passport-sized unfiltered<br />
                      digital picture taken within<br />
                      the last 6 months<br />
                      4.5 cm. X 3.5 cm<br />
                    </div>
                    <br />PHOTO<br />
                  </td>
                </tr>
                <tr>
                  <td colSpan="7" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>NAME</td>
                  {/* ── 2025 column headers ── */}
                  <td colSpan="4" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>OFFICE / RESIDENTIAL ADDRESS</td>
                  <td colSpan="3" style={{ ...cellGray, height: '0.25in', textAlign: 'center' }}>CONTACT NO. AND/OR EMAIL</td>
                </tr>
                {[0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan="7" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
                    <td colSpan="4" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
                    <td colSpan="3" style={{ ...cellWhite, height: '0.25in' }}>&nbsp;</td>
                  </tr>
                ))}

                <tr>
                  <td colSpan="14" style={{ ...cellGray, height: '0.6in' }}>
                    42.&emsp;&emsp;I declare under oath that I have personally accomplished this Personal Data Sheet which is a true, correct and<br />
                    &emsp;&emsp;&emsp; complete statement pursuant to the provisions of pertinent laws, rules and regulations of the Republic of the<br />
                    &emsp;&emsp;&emsp; Philippines. I authorize the agency head/authorized representative to verify/validate the contents stated herein.<br />
                    &emsp;&emsp;&emsp; I agree that any misrepresentation made in this document and its attachments shall cause the filing of<br />
                    &emsp;&emsp;&emsp; administrative/criminal case/s against me.
                  </td>
                </tr>

                <tr>
                  <td colSpan="18" style={{ height: '1.50in', fontSize: '50%', border: '0px 1px 0px 1px solid black' }}>
                    <div style={{ position: 'relative', top: '0.06in', float: 'left' }}>
                      <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '2.9in', height: '1.1in', tableLayout: 'fixed' }}>
                        <tbody>
                          <tr><td style={{ height: '0.35in', fontSize: '50.5%', backgroundColor: 'lightgray', border: '1px solid black', textAlign: 'center' }}>
                            Government Issued ID (i.e.Passport, GSIS, SSS, PRC, Driver's<br />License, etc.) PLEASE INDICATE ID Number and Date of Issuance
                          </td></tr>
                          <tr><td style={{ height: '0.25in', fontSize: '58%', border: '1px solid black' }}>&emsp;Government Issued ID:</td></tr>
                          <tr><td style={{ height: '0.25in', fontSize: '58%', border: '1px solid black' }}>&emsp;ID/License/Passport No:</td></tr>
                          <tr><td style={{ height: '0.25in', fontSize: '58%', border: '1px solid black' }}>&emsp;Date/Place of Issuance:</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ position: 'relative', top: '0.08in', left: '0.3in', float: 'left' }}>
                      <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '2.9in', height: '1.1in', tableLayout: 'fixed' }}>
                        <tbody>
                          <tr><td style={{ height: '0.6in', fontSize: '58%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td></tr>
                          <tr><td style={{ height: '0.11in', fontSize: '58%', backgroundColor: 'lightgray', border: '1px solid black', textAlign: 'center' }}>
                            Signature (wet signature/e-signature/digital certificate)
                          </td></tr>
                          <tr><td style={{ height: '0.2in', fontSize: '58%', border: '1px solid black' }}>&nbsp;</td></tr>
                          <tr><td style={{ height: '0.11in', fontSize: '58%', backgroundColor: 'lightgray', border: '1px solid black', textAlign: 'center' }}>Date Accomplished</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ position: 'relative', top: '-0.05in', left: '-0.15in', float: 'right' }}>
                      <table style={{ border: '1px solid black', borderCollapse: 'collapse', fontFamily: 'Arial, Helvetica, sans-serif', width: '1.5in', height: '1.1in', tableLayout: 'fixed' }}>
                        <tbody>
                          <tr><td style={{ height: '1.1in', fontSize: '58%', border: '1px solid black', textAlign: 'center' }}>&nbsp;</td></tr>
                          <tr><td style={{ height: '0.2in', fontSize: '58%', backgroundColor: 'lightgray', border: '1px solid black', textAlign: 'center' }}>Right Thumbmark</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>

                <tr><td colSpan="18" style={{ height: '1px', fontSize: '0%', backgroundColor: 'black', border: '0px solid white' }}></td></tr>
                <tr>
                  <td colSpan="18" style={{ height: '0.2in', fontSize: '62.5%', border: '1px 1px 0px 1px solid black', textAlign: 'center' }}>
                    <br />SUBSCRIBED AND SWORN to before me this ____________ , affiant exhibiting his/her validly issued government ID as indicated above.<br /><br />
                  </td>
                </tr>
                <tr>
                  <td colSpan="6" rowSpan="3" style={{ height: '1in', fontSize: '62.5%', border: '0px 1px 1px 1px solid black' }}>&nbsp;</td>
                  <td colSpan="6" style={{ height: '0.6in', fontSize: '62.5%', border: '1px solid black' }}>&nbsp;</td>
                  <td colSpan="6" rowSpan="3" style={{ height: '0.6in', fontSize: '62.5%', border: '0px 1px 1px 1px solid black' }}>&nbsp;</td>
                </tr>
                <tr>
                  <td colSpan="6" style={{ height: '0.11in', fontSize: '62.5%', backgroundColor: 'lightgray', border: '1px solid black', textAlign: 'center' }}>Person Administering Oath</td>
                </tr>
                <tr>
                  <td colSpan="6" style={{ height: '0.11in', fontSize: '62.5%', border: '1px solid white', textAlign: 'center' }}>&nbsp;</td>
                </tr>
                <tr><td colSpan="18" style={{ height: '1px', fontSize: '0%', backgroundColor: 'black', border: '0px solid white' }}>&nbsp;</td></tr>
                <tr>
                  <td colSpan="18" style={{ height: '0.11in', fontSize: '50%', border: '1px solid white', textAlign: 'right' }}>
                    <i>CS FORM 212 ({versionLabel}), Page 4 of 4</i>
                  </td>
                </tr>
              </tbody>
            </table>
          </thead>
        </div>
      </div>

      <button onClick={() => window.print()} className="no-print"
        style={{ position: 'fixed', bottom: '60px', right: '30px', backgroundColor: '#6D2323', color: '#FFFFFF', padding: '14px 20px', border: 'none', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0px 4px 15px rgba(0,0,0,0.3)', zIndex: 9999 }}>
        <PrintIcon style={{ fontSize: '24px' }} /> Save / Print
      </button>
    </div>
  );
};

export default PDS4_2025;