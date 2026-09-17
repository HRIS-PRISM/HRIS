import React, { useRef, useState } from 'react';
import logo from './logo.png';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  FormPrintStyles,
  printFormHtml,
  downloadFormHtml,
  FORM_PRINTABLE_WIDTH_MM,
} from './FormPrintable';

/* ─────────────────────────────────────────────────────────────
   Column proportions (%) derived directly from xlsx col widths
────────────────────────────────────────────────────────────── */
const COLS_PCT = [
  '1.8%',
  '2.5%',
  '20.6%',
  '10.65%', // ← col 3 — now equal to col 4
  '10.65%', // ← col 4 — now equal to col 3
  '9.3%',
  '3.5%',
  '4.9%',
  '36.1%',  // ← absorbs the difference to keep total 100%
];

/* ── Style helpers ── */
const tbl = { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' };

const cell = (extra = {}) => ({
  padding: '2px 4px',
  verticalAlign: 'top',
  fontSize: '10px',
  fontFamily: 'Arial, Helvetica, sans-serif',
  lineHeight: '1.3',
  ...extra,
});

const bL = { borderLeft: '1px solid #000' };
const bR = { borderRight: '1px solid #000' };
const bT = { borderTop: '1px solid #000' };
const bB = { borderBottom: '1px solid #000' };
const bDT = { borderTop: '2.5px double #000' };
const bDB = { borderBottom: '2.5px double #000' };
const b = (...args) => Object.assign({}, ...args);

/* ── Shared colgroup ── */
const Colgroup = () => (
  <colgroup>
    {COLS_PCT.map((w, i) => (
      <col key={i} style={{ width: w }} />
    ))}
  </colgroup>
);

/* ── Shared spacer row ── */
const SpacerRow = ({ h = '2px' }) => (
  <tr style={{ height: h }}>
    <td style={bL} />
    <td colSpan={5} />
    <td style={bL} />
    <td colSpan={2} style={bR} />
  </tr>
);

/* ── Leave type data ── */
const LEAVE_TYPES = [
  {
    title: 'Vacation Leave',
    ref: '(Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    title: 'Mandatory/Forced Leave',
    ref: '(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    title: 'Sick Leave',
    ref: '(Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    title: 'Maternity Leave',
    ref: '(R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)',
  },
  {
    title: 'Paternity Leave',
    ref: '(R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)',
  },
  {
    title: 'Special Privilege Leave',
    ref: '(Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    title: 'Solo Parent Leave',
    ref: '(R.A. No. 8972 / CSC MC No. 8, s. 2004)',
  },
  {
    title: 'Study Leave',
    ref: '(Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    title: '10-Day VAWC Leave',
    ref: '(R.A. No. 9262 / CSC MC No. 15, s. 2005)',
  },
  {
    title: 'Rehabilitation Privilege',
    ref: '(Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
  },
  {
    title: 'Special Leave Benefits for Women',
    ref: '(R.A. No. 9710 / CSC MC No. 25, s. 2010)',
  },
  {
    title: 'Special Emergency (Calamity) Leave',
    ref: '(CSC MC No. 2, s. 2012, as amended)',
  },
  {
    title: 'Adoption Leave',
    ref: '(R.A. No. 8552)',
  },
];

const LEAVE_DETAILS = [
  { italic: true, text: 'In case of Vacation/Special Privilege Leave:' },
  {
    italic: false,
    text: '☐ Within the Philippines __________________________',
  },
  {
    italic: false,
    text: '☐ Abroad (Specify) ________________________________',
  },
  { italic: true, text: 'In case of Sick Leave:' },
  {
    italic: false,
    text: '☐ In Hospital (Specify Illness) _____________________',
  },
  {
    italic: false,
    text: '☐ Out Patient (Specify Illness) ____________________',
  },
  { italic: false, text: '_____________________________________________' },
  { italic: true, text: 'In case of Special Leave Benefits for Women:' },
  {
    italic: false,
    text: '(Specify Illness) ___________________________________',
  },
  { italic: false, text: '_____________________________________________' },
  { italic: true, text: 'In case of Study Leave:' },
  { italic: false, text: "☐ Completion of Master's Degree" },
  { italic: false, text: '☐ BAR/Board Examination Review' },
];

/* ── Leave rows block ── */
const LeaveRows = () => (
  <table style={tbl}>
    <Colgroup />
    <tbody>
      {LEAVE_TYPES.map((leave, i) => (
        <React.Fragment key={i}>
          <tr>
            <td style={cell(bL)} />
            <td style={cell({ verticalAlign: 'middle', textAlign: 'center' })}>
              ☐
            </td>
            <td colSpan={4} style={cell({ verticalAlign: 'middle' })}>
              <div
                style={{
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '10px',
                  }}
                >
                  {leave.title}
                </span>

                <span
                  style={{
                    fontFamily: 'Arial Narrow, Arial, sans-serif',
                    fontSize: '8px',
                  }}
                >
                  {leave.ref}
                </span>
              </div>{' '}
            </td>
            <td style={cell(bL)} />
            <td
              colSpan={2}
              style={cell(
                b(bR, {
                  fontStyle: LEAVE_DETAILS[i]?.italic ? 'italic' : 'normal',
                  verticalAlign: 'middle',
                }),
              )}
            >
              {LEAVE_DETAILS[i]?.text || ''}
            </td>
          </tr>
          <SpacerRow />
        </React.Fragment>
      ))}

      {/* Others */}
      <tr>
        <td style={cell(bL)} />
        <td colSpan={5} style={cell({ fontStyle: 'italic' })}>
          Others:
        </td>
        <td style={cell(bL)} />
        <td colSpan={2} style={cell(b(bR, { fontStyle: 'italic' }))}>
          Other purpose:
        </td>
      </tr>
      <SpacerRow />

      <tr>
        <td style={cell(bL)} />
        <td colSpan={5} style={cell()}>
          _____________________________________
        </td>
        <td style={cell(bL)} />
        <td colSpan={2} style={cell(bR)}>
          &nbsp;&nbsp;☐ Monetization of Leave Credits
        </td>
      </tr>
      <SpacerRow />

      <tr>
        <td style={cell(bL)} />
        <td colSpan={5} />
        <td style={cell(bL)} />
        <td colSpan={2} style={cell(bR)}>
          &nbsp;&nbsp;☐ Terminal Leave
        </td>
      </tr>
      <tr style={{ height: '8px' }}>
        <td style={bL} />
        <td colSpan={5} />
        <td style={bL} />
        <td colSpan={2} style={bR} />
      </tr>
    </tbody>
  </table>
);

/* ════════════════════════════════════════════════════════════
   Main Leave component
════════════════════════════════════════════════════════════ */

const Leave = () => {
  const formRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  const printPage = async () => {
    if (!formRef.current) return;
    try {
      setIsGenerating(true);
      await printFormHtml(formRef.current, { title: 'Application for Leave' });
    } catch (err) {
      console.error('Error printing form:', err);
      showSnackbar('Error printing form: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!formRef.current) return;
    try {
      setIsGenerating(true);
      await downloadFormHtml(
        formRef.current,
        `Application-for-Leave-${new Date().toISOString().split('T')[0]}.pdf`,
        { title: 'Application for Leave' },
      );
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formStyle = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10px',
    width: `${FORM_PRINTABLE_WIDTH_MM}mm`,
    margin: '0 auto',
    border: '1px solid #000',
    padding: '5mm',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  /* ── Render form content (used in both visible and capture containers) ── */
  const renderFormContent = () => (
    <>
      {/* ══════════════════════ HEADER ══════════════════════ */}
      <table style={tbl}>
        <Colgroup />
        <tbody>
          <tr style={{ height: '44px' }}>
            <td
              colSpan={8}
              style={cell({
                verticalAlign: 'top',
                fontSize: '9px',
                fontFamily: 'Arial, sans-serif',
              })}
            >
              <strong>
                <em>
                  Civil Service Form No. 6<br />
                  Revised 2020
                </em>
              </strong>
            </td>
            <td
              style={cell({
                textAlign: 'center',
                verticalAlign: 'bottom',
                fontSize: '9px',
                fontFamily: 'Arial, sans-serif',
              })}
            >
              <strong>ANNEX A</strong>
            </td>
          </tr>

          <tr style={{ height: '50px' }}>
            <td
              colSpan={8}
              style={cell({
                position: 'relative',
                verticalAlign: 'middle',
                padding: '0',
              })}
            >
              {/* Logo — absolutely positioned so it doesn't shift the center */}
              <img
                src={logo}
                alt="EARIST Logo"
                style={{
                  height: '70px',
                  position: 'absolute',
                  left: '150px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />

              {/* Text centered relative to the full cell width */}
              <div
                style={{
                  textAlign: 'center',
                  lineHeight: '1.6',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginRight: '-250px',
                }}
              >
                Republic of the Philippines
                <br />
                EULOGIO "AMANG" RODRIGUEZ
                <br />
                <div style={{ whiteSpace: 'nowrap' }}>
                  INSTITUTE OF SCIENCE AND TECHNOLOGY
                </div>
                Nagtahan, Sampaloc, Manila
              </div>
            </td>

            {/* Stamp box — separate td */}
            <td
              style={cell({
                verticalAlign: 'top',
                paddingTop: '10px',
                textAlign: 'center',
              })}
            >
              <div
                style={{
                  display: 'inline-block',
                  border: '1px solid #000',
                  padding: '0px 2px',
                  fontSize: '8px',
                  fontFamily: 'Arial Narrow, Arial, sans-serif',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                Stamp of Date of Receipt
              </div>
            </td>
          </tr>

          <tr style={{ height: '40px' }}>
            <td
              colSpan={9}
              style={cell({
                textAlign: 'center',
                verticalAlign: 'middle',
                fontSize: '18px',
                fontWeight: 'bold',
              })}
            >
              APPLICATION FOR LEAVE
            </td>
          </tr>

          <tr>
            <td colSpan={4} style={cell(b(bT, bL, { fontSize: '10px' }))}>
              1.&nbsp;&nbsp; OFFICE/DEPARTMENT
            </td>
            <td colSpan={5} style={cell(b(bT, bR, { fontSize: '10px' }))}>
              2.&nbsp; NAME :&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Last)
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              (First)
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              (Middle)
            </td>
          </tr>

          <tr style={{ height: '24px' }}>
            <td colSpan={4} style={b(bB, bL,  { padding: '2px' })}>
              &nbsp;
            </td>
            <td colSpan={5} style={b(bB, bR, { padding: '2px' })}>
              &nbsp;
            </td>
          </tr>

        <tr style={{ height: '26px' }}>
  <td colSpan={4} style={cell(b(bT, bL, { fontSize: '10px', verticalAlign: 'middle', paddingTop: '10px'}))}>
    3.&nbsp;&nbsp; DATE OF FILING &nbsp;______________
  </td>
  <td colSpan={5} style={cell(b(bT, bR, { fontSize: '10px', verticalAlign: 'middle', paddingTop: '10px'}))}>
    4.&nbsp;&nbsp; POSITION
    &nbsp;______________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    5.&nbsp; SALARY &nbsp;_______________
  </td>
</tr>
          <tr style={{ height: '10px' }}>
            <td style={bL} />
            <td colSpan={7} />
            <td style={bR} />
          </tr>

          <tr style={{ height: '26px' }}>
            <td
              colSpan={9}
              style={cell(
                b(bDT, bDB, bL, bR, {
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }),
              )}
            >
              6.&nbsp; DETAILS OF APPLICATION
            </td>
          </tr>

          <tr style={{ height: '22px' }}>
            <td colSpan={6} style={cell(b(bDT, bL, { fontSize: '10px' }))}>
              6.A&nbsp; TYPE OF LEAVE TO BE AVAILED OF
            </td>
            <td colSpan={3} style={cell(b(bDT, bL, bR, { fontSize: '10px' }))}>
              6.B&nbsp; DETAILS OF LEAVE
            </td>
          </tr>

          <tr style={{ height: '8px' }}>
            <td style={bL} />
            <td colSpan={5} />
            <td style={bL} />
            <td colSpan={2} style={bR} />
          </tr>
        </tbody>
      </table>

      {/* ══════════════════════ LEAVE TYPE ROWS ══════════════════════ */}
      <LeaveRows />

      {/* ══════════════════════ 6C / 6D ══════════════════════ */}
      <table style={tbl}>
        <Colgroup />
        <tbody>
         <tr style={{ height: '20px' }}>
  <td colSpan={6} style={cell(b(bDT, bL, bR, { fontSize: '10px' }))}>
    6.C&nbsp; NUMBER OF WORKING DAYS APPLIED FOR
  </td>
  <td colSpan={3} style={cell(b(bDT, bL, bR, { fontSize: '10px' }))}>
    6.D&nbsp; COMMUTATION
  </td>
</tr>

          <SpacerRow />

          <tr style={{ height: '18px' }}>
            <td style={cell(bL)} />
            <td colSpan={5} style={cell()}>
              ________________________________________
            </td>
            <td colSpan={3} style={cell(b(bL, bR))}>
              &nbsp;&nbsp;☐ Not Requested
            </td>
          </tr>

          <SpacerRow />

          <tr style={{ height: '18px' }}>
            <td style={cell(bL)} />
            <td />
            <td colSpan={4} style={cell()}>
              INCLUSIVE DATES
            </td>
            <td colSpan={3} style={cell(b(bL, bR))}>
              &nbsp;&nbsp;☐ Requested
            </td>
          </tr>

          <tr style={{ height: '12px' }}>
            <td style={cell(bL)} />
            <td colSpan={5} style={cell()}>
              ________________________________________
            </td>
            <td colSpan={3} style={cell(b(bL, bR))} />
          </tr>

   <tr style={{ height: '26px' }}>
  <td colSpan={6} style={cell(b(bL, bR))} />
  <td
    colSpan={3}
    style={cell(
      b(bL, bR, {
        textAlign: 'center',
        verticalAlign: 'bottom',
        fontSize: '10px',
      }),
    )}
  >
    <div style={{
      borderTop: '1px solid #000',
      width: '60%',
      margin: '0 auto',
      paddingTop: '5px',
    }}>
      (Signature of Applicant)
    </div>
  </td>
</tr>
        </tbody>
      </table>

      {/* ══════════════════════ SECTION 7 ══════════════════════ */}
      <table style={tbl}>
        <Colgroup />
        <tbody>
          <tr style={{ height: '26px' }}>
            <td
              colSpan={9}
              style={cell(
                b(bDT, bDB, bL, bR, {
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }),
              )}
            >
              7.&nbsp; DETAILS OF ACTION ON APPLICATION
            </td>
          </tr>

          <tr style={{ height: '22px' }}>
            <td colSpan={6} style={cell(b(bDT, bL, { fontSize: '10px' }))}>
              7.A&nbsp; CERTIFICATION OF LEAVE CREDITS
            </td>
            <td colSpan={3} style={cell(b(bDT, bL, bR, { fontSize: '10px' }))}>
              7.B&nbsp; RECOMMENDATION
            </td>
          </tr>

          {/* ── 6px spacer ── */}
<tr style={{ height: '6px' }}>
  <td style={bL} />
  <td colSpan={5} />
  <td style={bL} />
  <td colSpan={2} style={bR} />
</tr>

          <tr style={{ height: '18px'}}>
            <td style={cell(bL)} />
            <td />
            <td colSpan={4} style={cell()}>
              As of _______________________
            </td>
            <td colSpan={3} style={cell(b(bL, bR))}>
              &nbsp;&nbsp;☐ For approval
            </td>
          </tr>

          <SpacerRow />


{/* Header row */}
<tr style={{ height: '12px' }}>
  <td style={cell(bL)} />
  <td />
  <td
    style={{
      border: '1px solid #000',
      textAlign: 'center',
      fontSize: '9px',
      padding: '1px',
    }}
  >
    &nbsp;
  </td>
  <td
    style={{
      border: '1px solid #000',
      textAlign: 'center',
      fontSize: '9px',
      padding: '1px',
      width: '60px',
    }}
  >
    Vacation Leave
  </td>
  <td
    style={{
      border: '1px solid #000',
      textAlign: 'center',
      fontSize: '9px',
      padding: '1px',
      width: '60px',
    }}
  >
    Sick Leave
  </td>
  <td style={bR} />
<td colSpan={3} style={cell(b(bL, bR, { fontSize: '10px' }))}>
  &nbsp;&nbsp;☐ For disapproval due to _____________________________
</td>
</tr>

{/* Total Earned */}
<tr style={{ height: '14px' }}>
  <td style={cell(bL)} />
  <td />
  <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '9px', fontStyle: 'italic', padding: '1px' }}>
    Total Earned
  </td>
  <td style={{ border: '1px solid #000', padding: '1px', width: '60px' }}>&nbsp;</td>
  <td style={{ border: '1px solid #000', padding: '1px', width: '60px' }}>&nbsp;</td>
  <td style={bR} />
<td colSpan={3} style={cell(b(bL, bR, { fontSize: '9px', paddingLeft: '20px' }))}>
  _____________________________________________________
</td>
</tr>

{/* Less this application */}
<tr style={{ height: '14px' }}>
  <td style={cell(bL)} />
  <td />
  <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '9px', fontStyle: 'italic', padding: '1px' }}>
    Less this application
  </td>
  <td style={{ border: '1px solid #000', padding: '1px', width: '60px' }}>&nbsp;</td>
  <td style={{ border: '1px solid #000', padding: '1px', width: '60px' }}>&nbsp;</td>
  <td style={bR} />
<td colSpan={3} style={cell(b(bL, bR, { fontSize: '9px', paddingLeft: '20px' }))}>
  _____________________________________________________
</td>
</tr>

{/* Balance */}
<tr style={{ height: '14px' }}>
  <td style={cell(bL)} />
  <td />
  <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '9px', fontStyle: 'italic', padding: '1px' }}>
    Balance
  </td>
  <td style={{ border: '1px solid #000', padding: '1px', width: '60px' }}>&nbsp;</td>
  <td style={{ border: '1px solid #000', padding: '1px', width: '60px' }}>&nbsp;</td>
  <td style={bR} />
<td colSpan={3} style={cell(b(bL, bR, { fontSize: '9px', paddingLeft: '20px' }))}>
  _____________________________________________________
</td>
</tr>


<tr style={{ height: '45px' }}>
  <td style={cell(bL)} />
  <td />
  <td
    colSpan={3}
    style={{
      textAlign: 'center',
      verticalAlign: 'bottom',
      fontSize: '9px',
      padding: '1px',
    }}
  >
    <div style={{
      borderTop: '1px solid #000',
      width: '80%',
      margin: '0 auto',
      paddingTop: '2px',
    }}>
      (Authorized Officer)
    </div>
  </td>
  <td />
  <td
    colSpan={3}
    style={cell(
      b(bL, bR, {
        textAlign: 'center',
        verticalAlign: 'bottom',
        fontSize: '9px',
      }),
    )}
  >
<div style={{
  borderTop: '1px solid #000',
  width: '80%',
  margin: '0 auto',
  marginTop: '-20px',  
}}>
  (Immediate Supervisor)
</div>
  </td>
</tr>

<SpacerRow />

<tr style={{ height: '30px' }}>
  <td style={cell(bL)} />
  <td colSpan={4} />
  <td />
  <td
    colSpan={3}
    style={cell(
      b(bL, bR, {
        textAlign: 'center',
        verticalAlign: 'bottom',
        fontSize: '9px',
      }),
    )}
  >
    <div style={{
      borderTop: '1px solid #000',
      width: '80%',
      margin: '0 auto',
      paddingTop: '2px',
    }}>
      (Authorized Officer)
    </div>
  </td>
</tr>

          <tr style={{ height: '22px' }}>
  <td colSpan={6} style={cell(b(bDT, bL, { fontSize: '10px' }))}>
    7.C&nbsp; APPROVED FOR:
  </td>
  <td colSpan={3} style={cell(b(bDT, bR, { fontSize: '10px' }))}>
    7.D&nbsp;&nbsp; DISAPPROVED DUE TO:
  </td>
</tr>

          <tr style={{ height: '18px' }}>
            <td style={cell(bL)} />
            <td />
            <td colSpan={4} style={cell()}>
              _______ days with pay
            </td>
            <td colSpan={3} style={cell(b( bR, { fontSize: '10px' }))}>
              &nbsp;&nbsp;___________________________________________
            </td>
          </tr>
          <tr style={{ height: '18px' }}>
            <td style={cell(bL)} />
            <td />
            <td colSpan={4} style={cell()}>
              _______ days without pay
            </td>
            <td colSpan={3} style={cell(b( bR, { fontSize: '10px' }))}>
              &nbsp;&nbsp;___________________________________________
            </td>
          </tr>
          <tr style={{ height: '18px' }}>
            <td style={cell(bL)} />
            <td />
            <td colSpan={4} style={cell()}>
              _______ others (Specify)
            </td>
            <td colSpan={3} style={cell(b( bR, { fontSize: '10px' }))}>
              &nbsp;&nbsp;___________________________________________
            </td>
          </tr>

<tr style={{ height: '50px' }}>
  <td
    colSpan={9}
    style={cell(
      b(bB, bL, bR, {
        textAlign: 'center',
        verticalAlign: 'middle',
        fontWeight: 'bold',
      }),
    )}
  >
    _________________________________
    <br />
    (Authorized Official)
  </td>
</tr>
        </tbody>
      </table>
    </>
  );

  return (
    <Box
      id="leave-print-root"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#ffffff',
        position: 'relative',
      }}
    >
      <FormPrintStyles />
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>
        <main className="form-print-area" ref={formRef}>
          <div className="form-print-scale">
            <div className="form-page" id="leave-form-content" style={formStyle}>
              {renderFormContent()}
            </div>
          </div>
        </main>
      </Box>

      {/* ══ Floating Action Buttons ══ */}
      <Box
        className="no-print forms-floating-actions"
        sx={{
          position: 'fixed',
          bottom: '1in',
          right: 30,
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          zIndex: 1000,
        }}
      >
        <Zoom in style={{ transitionDelay: '0ms' }}>
          <Tooltip title="Print Form" placement="top">
            <Fab
              aria-label="print"
              onClick={printPage}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
            >
              <PrintIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>

        <Zoom in style={{ transitionDelay: '100ms' }}>
          <Tooltip title="Download PDF" placement="top">
            <Fab
              aria-label="download"
              onClick={downloadPDF}
              sx={{
                bgcolor: '#6D2323',
                '&:hover': { bgcolor: '#8a4747' },
                width: 56,
                height: 56,
              }}
            >
              <PictureAsPdfIcon sx={{ color: '#fff' }} />
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>

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

export default Leave;
