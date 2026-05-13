import React, { useRef, useState } from 'react';
import logo from './logo.png';
import LoadingOverlay from '../LoadingOverlay';
import { Box, Fab, Tooltip, Zoom, Snackbar, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

/*
  PRINT STRATEGY — why window.print() instead of html2canvas:
  ─────────────────────────────────────────────────────────────
  html2canvas takes a pixel snapshot at a fixed viewport size
  and scales it to fit the PDF page — so the content shrinks or
  grows depending on your monitor resolution and browser zoom,
  causing the "size changes on print" bug you saw.

  window.print() hands the DOM directly to the browser's print
  engine, which re-lays it out at the exact paper size you pick
  (A4, Legal, Letter, etc.). No pixels, no scaling, no surprises.

  For PDF download we still use html2canvas + jsPDF, but we
  temporarily set the form to a known pixel width (794px = A4
  at 96 dpi) before capturing so it is always consistent.
*/

/* ── Inject @media print styles once ── */
const PRINT_STYLE_ID = 'leave-form-print-style';
const injectPrintStyles = () => {
  if (document.getElementById(PRINT_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;

  style.textContent = `
@media print {

  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  html,
  body {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    background: white;
  }

  .forms-floating-actions,
  .MuiSnackbar-root,
  .MuiBackdrop-root,
  .no-print {
    display: none !important;
  }

  #leave-form-content {
    width: 190mm !important;
    min-height: 277mm !important;

    margin: 0 auto !important;

    padding: 5mm !important;

    background: white !important;

    border: 1px solid #000 !important;

    box-sizing: border-box !important;

    zoom: 1 !important;
    transform: scale(1) !important;
  }

  table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  tr {
    page-break-inside: avoid !important;
  }
}
`;

  document.head.appendChild(style);
};

const Leave = () => {
  const printRef = useRef(null);
  const captureRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  /* ── Native print — browser handles all scaling ── */
  const printPage = () => {
    const content = document.getElementById('leave-form-content').innerHTML;

    const printWindow = window.open('', '', 'width=900,height=650');

    printWindow.document.write(`
    <html>
      <head>
        <title>Print Leave Form</title>

        <style>
          body {
            font-family: Arial;
            padding: 20px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          @page {
            size: A4;
            margin: 0.4in;
          }
        </style>
      </head>

      <body>
        ${content}
      </body>
    </html>
  `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  /* ── PDF download — capture from dedicated container ── */
  const downloadPDF = async () => {
    if (!captureRef.current) return;
    try {
      setIsGenerating(true);

      const el = captureRef.current;

      // Temporarily make visible for capture
      el.style.position = 'relative';
      el.style.top = '0';
      el.style.left = '0';
      el.style.visibility = 'visible';

      // Wait for layout to settle
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        allowTaint: true,
      });

      // Hide it again
      el.style.position = 'absolute';
      el.style.top = '-10000px';
      el.style.left = '-10000px';
      el.style.visibility = 'hidden';

      if (!canvas) {
        throw new Error('Canvas generation failed');
      }

      // Build A4 PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageH = pdf.internal.pageSize.getHeight(); // 297 mm
      const margin = 8; // mm
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      const imgData = canvas.toDataURL('image/png');

      let yPos = margin;
      let remainingH = imgH;

      // Handle multi-page if content is taller than one page
      const usableH = pageH - margin * 2;
      while (remainingH > 0) {
        const sliceH = Math.min(remainingH, usableH);
        pdf.addImage(imgData, 'PNG', margin, yPos, imgW, imgH);
        remainingH -= usableH;
        if (remainingH > 0) {
          pdf.addPage();
          yPos = margin - (imgH - sliceH);
        }
      }

      pdf.save(
        `Application-for-Leave-${new Date().toISOString().split('T')[0]}.pdf`,
      );
      showSnackbar('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showSnackbar('Error generating PDF: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Form style — no fixed pixel width, uses % so it adapts ── */
  const formStyle = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10px',

    width: '190mm', // FIXED PRINTABLE WIDTH
    minHeight: '277mm',

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
    /* ── Outer wrapper: white, no gray ── */
    <Box
      id="leave-print-root"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#ffffff', // ← was #f0f0f0, now white
        position: 'relative',
      }}
    >
      <Box sx={{ width: '100%', overflowX: 'auto', paddingBottom: '100px' }}>
        {/* ══ VISIBLE FORM FOR SCREEN ══ */}
        <div
          ref={printRef}
          id="leave-form-content"
          className="print-content"
          style={formStyle}
        >
          {renderFormContent()}
        </div>

        {/* ══ HIDDEN CAPTURE CONTAINER (A4-optimized) ══ */}
        <div
          ref={captureRef}
          id="leave-form-content-capture"
          style={{
            ...formStyle,
            width: '794px', // Lock to A4 width @ 96 dpi
            position: 'absolute',
            top: '-10000px',
            left: '-10000px',
            border: '1px solid #000',
            padding: '8px',
            backgroundColor: '#ffffff',
            margin: '0',
          }}
        >
          {renderFormContent()}
        </div>
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
