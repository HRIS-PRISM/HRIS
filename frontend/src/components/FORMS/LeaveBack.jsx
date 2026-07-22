import React, { useEffect, useRef } from "react";
import { Box, Fab, Tooltip, Zoom } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

const CHROME_STYLE_ID = "leave-back-chrome-hide";
const PRINT_STYLE_ID = "leave-back-print-style";

/** Hide app header/sidebar/footer while this form page is open. */
const injectChromeHide = () => {
  let style = document.getElementById(CHROME_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = CHROME_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    .MuiAppBar-root { display: none !important; }
    .MuiDrawer-root { display: none !important; }
    footer { display: none !important; }
    main {
      margin-left: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    main > .MuiToolbar-root { display: none !important; }
    body { background: #fff !important; }
  `;
};

const removeChromeHide = () => {
  document.getElementById(CHROME_STYLE_ID)?.remove();
};

/** Same print strategy as Leave.jsx — A4 with even margins. */
const injectPrintStyles = () => {
  let style = document.getElementById(PRINT_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    document.head.appendChild(style);
  }
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
  .no-print,
  .MuiAppBar-root,
  .MuiDrawer-root,
  footer,
  main > .MuiToolbar-root {
    display: none !important;
  }

  main {
    margin: 0 !important;
    margin-left: 0 !important;
    padding: 0 !important;
  }

  #leave-back-content {
    width: 190mm !important;
    min-height: 277mm !important;
    margin: 0 auto !important;
    padding: 5mm !important;
    background: white !important;
    border: none !important;
    box-sizing: border-box !important;
    zoom: 1 !important;
    transform: scale(1) !important;
  }
}
`;
};

const removePrintStyles = () => {
  document.getElementById(PRINT_STYLE_ID)?.remove();
};

/* Same printable frame as Leave.jsx */
const formStyle = {
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "7.2pt",
  lineHeight: 1.25,
  width: "190mm",
  minHeight: "277mm",
  margin: "0 auto",
  border: "none",
  padding: "5mm",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const titleBoxStyle = {
  border: "1px solid black",
  padding: "2mm",
  textAlign: "center",
  fontSize: "11pt",
  marginBottom: "3mm",
  flexShrink: 0,
};

const columnsStyle = {
  display: "flex",
  gap: "4mm",
  flex: 1,
  minHeight: 0,
};

const colStyle = {
  flex: 1,
  minWidth: 0,
};

const footerStyle = {
  flexShrink: 0,
  marginTop: "3mm",
  paddingTop: "2mm",
  borderTop: "1px solid #000",
  fontSize: "7pt",
  lineHeight: 1.3,
};

const LeaveBack = () => {
  const printRef = useRef(null);

  useEffect(() => {
    injectChromeHide();
    injectPrintStyles();
    return () => {
      removeChromeHide();
      removePrintStyles();
    };
  }, []);

  /** Native print via clean window — same approach as Leave.jsx */
  const printPage = () => {
    const el = document.getElementById("leave-back-content");
    if (!el) return;
    const content = el.innerHTML;

    const printWindow = window.open("", "", "width=900,height=650");
    if (!printWindow) return;

    printWindow.document.write(`
    <html>
      <head>
        <title>Print Leave Form (Back)</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .page {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 7.2pt;
            line-height: 1.25;
            width: 190mm;
            min-height: 277mm;
            margin: 0 auto;
            border: none;
            padding: 5mm;
            background: #fff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          @page {
            size: A4 portrait;
            margin: 0.4in;
          }
        </style>
      </head>
      <body>
        <div class="page">${content}</div>
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

  const renderFormContent = () => (
    <>
      <div style={titleBoxStyle}>
        <b>INSTRUCTIONS AND REQUIREMENTS</b>
      </div>

      <div style={columnsStyle}>
        <div style={colStyle}>
          Application for any type of leave shall be made on this form and{" "}
          <b>
            <u>to be accomplished at least in duplicate</u>
          </b>{" "}
          with documentary requirements, as follows:
          <br />
          <br />
          <b>1.&nbsp;&nbsp;Vacation leave*</b>
          <br />
          It shall be filed five (5) days in advance, whenever possible, of the
          effective date of such leave. Vacation leave within the Philippines or
          abroad shall be indicated in the form for purposes of securing travel
          authority and completing clearance from money and work accountabilities.
          <br />
          <br />
          <b>2.&nbsp;&nbsp;Mandatory/Forced leave</b>
          <br />
          Annual five-day vacation leave shall be forfeited if not taken during the
          year. In case the scheduled leave has been cancelled in the exigency of
          the service by the head of agency, it shall no longer be deducted from
          the accumulated vacation leave. Availment of one (1) day or more Vacation
          Leave (VL) shall be considered for complying the mandatory/forced leave
          subject to the conditions under Section 25, Rule XVI of the Omnibus Rules
          Implementing E.O. No. 292.
          <br />
          <br />
          <b>3.&nbsp;&nbsp;Sick leave*</b>
          <ul style={{ margin: "2px 0 6px 18px", padding: 0 }}>
            <li>It shall be filed immediately upon employee&apos;s return from such leave.</li>
            <li>
              If filed in advance or exceeding five (5) days, application shall be
              accompanied by a <u>medical certificate</u>. In case medical
              consultation was not availed of, an <u>affidavit</u> should be
              executed by an applicant.
            </li>
          </ul>
          <b>4.&nbsp;&nbsp;Maternity leave* - 105 days</b>
          <ul style={{ margin: "2px 0 6px 18px", padding: 0 }}>
            <li>
              Proof of pregnancy e.g. ultrasound, doctor&apos;s certificate on the
              expected date of delivery
            </li>
            <li>
              Accomplished Notice of Allocation of Maternity Leave Credits (CS Form
              No. 6a), if needed
            </li>
            <li>
              Seconded female employees shall enjoy maternity leave with full pay in
              the recipient agency.
            </li>
          </ul>
          <b>5.&nbsp;&nbsp;Paternity leave - 7 days</b>
          <br />
          Proof of child&apos;s delivery e.g. birth certificate, medical certificate
          and marriage contract
          <br />
          <br />
          <b>6.&nbsp;&nbsp;Special privilege leave - 3 days</b>
          <br />
          It shall be filed/approved for at least one (1) week prior to availment,
          except on emergency cases. Special privilege leave within the Philippines
          or abroad shall be indicated in the form for purposes of securing travel
          authority and completing clearance from money and work accountabilities.
          <br />
          <br />
          <b>7.&nbsp;&nbsp;Solo Parent leave - 7 days</b>
          <br />
          It shall be filed in advance or whenever possible five (5) days before
          going on such leave with updated Solo Parent Identification Card.
          <br />
          <br />
          <b>8.&nbsp;&nbsp;Study leave* - up to 6 months</b>
          <ul style={{ margin: "2px 0 6px 18px", padding: 0 }}>
            <li>Shall meet the agency&apos;s internal requirements, if any;</li>
            <li>
              Contract between the agency head or authorized representative and the
              employee concerned.
            </li>
          </ul>
          <b>9.&nbsp;&nbsp;VAWC leave* - 10 days</b>
          <ul style={{ margin: "2px 0 0 18px", padding: 0 }}>
            <li>
              It shall be filed in advance or immediately upon the woman
              employee&apos;s return from such leave.
            </li>
            <li>
              It shall be accompanied by any of the following supporting documents:
              <ol type="a" style={{ margin: "2px 0 0 16px", padding: 0 }}>
                <li>Barangay Protection Order (BPO) obtained from the barangay;</li>
                <li>
                  Temporary/Permanent Protection Order (TPO/PPO) obtained from the
                  court;
                </li>
                <li>
                  If the protection order is not yet issued by the barangay or the
                  court, a certification issued by the Punong Barangay/Kagawad or
                  Prosecutor or the Clerk of Court that the application for the BPO,
                  TPO or PPO has been filed with the said office shall be sufficient
                  to support the application for the ten-day leave; or
                </li>
                <li>
                  In the absence of the BPO/TPO/PPO or the certification, a police
                  report specifying the details of the occurrence of violence on the
                  victim and a medical certificate may be considered, at the
                  discretion of the immediate supervisor of the woman employee
                  concerned.
                </li>
              </ol>
            </li>
          </ul>
        </div>

        <div style={colStyle}>
          <b>10.&nbsp;&nbsp;Rehabilitation leave* - up to 6 months</b>
          <ul style={{ margin: "2px 0 6px 18px", padding: 0 }}>
            <li>
              Application shall be made within one (1) week from the time of the
              accident except when a longer period is warranted.
            </li>
            <li>
              Letter request supported by relevant reports such as the police
              report, if any,
            </li>
            <li>
              Medical certificate on the nature of the injuries, the course of
              treatment involved, and the need to undergo rest, recuperation, and
              rehabilitation, as the case may be.
            </li>
            <li>
              Written concurrence of a government physician should be obtained
              relative to the recommendation if the attending physician is a private
              practitioner, particularly on the duration of the period of
              rehabilitation.
            </li>
          </ul>
          <b>11.&nbsp;&nbsp;Special leave benefits for women* - up to 2 months</b>
          <ul style={{ margin: "2px 0 6px 18px", padding: 0 }}>
            <li>
              The application may be filed in advance, that is, at least five (5)
              days prior to the scheduled date of the gynecological surgery that
              will be undergone by the employee. In case of emergency, the
              application for special leave shall be filed immediately upon
              employee&apos;s return but during confinement the agency shall be
              notified of said surgery.
            </li>
            <li>
              The application shall be accompanied by a medical certificate filled
              out by the proper medical authorities, e.g. the attending surgeon
              accompanied by a clinical summary reflecting the gynecological
              disorder which shall be addressed or was addressed by the said
              surgery; the histopathological report, the operative technique used
              for the surgery; the duration of the surgery including the
              peri-operative period (period of confinement around surgery); as well
              as the employee&apos;s estimated period of recuperation for the same.
            </li>
          </ul>
          <b>12.&nbsp;&nbsp;Special Emergency (Calamity) leave - up to 5 days</b>
          <ul style={{ margin: "2px 0 6px 18px", padding: 0 }}>
            <li>
              The special emergency leave can be applied for a maximum of five (5)
              straight working days or staggered basis within thirty (30) days from
              the actual occurrence of the natural calamity/disaster. Said privilege
              shall be enjoyed once a year, not in every instance of calamity or
              disaster.
            </li>
            <li>
              The head of office shall take full responsibility for the grant of
              special emergency leave and verification of the employee&apos;s
              eligibility to be granted thereof. Said verification shall include:
              validation of place of residence based on latest available records of
              the affected employee; verification that the place of residence is
              covered in the declaration of calamity area by the proper government
              agency; and such other proofs as may be necessary.
            </li>
          </ul>
          <b>13.&nbsp;&nbsp;Monetization of leave credits</b>
          <br />
          Application for monetization of fifty percent (50%) or more of the
          accumulated leave credits shall be accompanied by letter request in the
          head of the agency stating the valid and justifiable reasons.
          <br />
          <br />
          <b>14.&nbsp;&nbsp;Terminal leave*</b>
          <br />
          Proof of employee&apos;s resignation or retirement or separation from the
          service.
          <br />
          <br />
          <b>15.&nbsp;&nbsp;Adoption Leave</b>
          <ul style={{ margin: "2px 0 0 18px", padding: 0 }}>
            <li>
              Application for adoption leave shall be filed with an authenticated
              copy of the Pre-Adoptive Placement Authority issued by the Department
              of Social Welfare and Development (DSWD).
            </li>
          </ul>
        </div>
      </div>

      <div style={footerStyle}>
        *For leave of absence for thirty (30) calendar days or more and terminal
        leave, application shall be accompanied by a{" "}
        <u>clearance from money, property and work-related accountabilities</u>{" "}
        (pursuant to CSC Memorandum Circular No. 2, s. 1985).
      </div>
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#ffffff",
        position: "relative",
      }}
    >
      <Box sx={{ width: "100%", overflowX: "auto", paddingBottom: "100px" }}>
        <div
          ref={printRef}
          id="leave-back-content"
          className="print-content"
          style={formStyle}
        >
          {renderFormContent()}
        </div>
      </Box>

      <Box
        className="no-print forms-floating-actions"
        sx={{
          position: "fixed",
          bottom: "1in",
          right: 30,
          display: "flex",
          flexDirection: "row",
          gap: 2,
          zIndex: 1000,
        }}
      >
        <Zoom in style={{ transitionDelay: "0ms" }}>
          <Tooltip title="Print Form" placement="top">
            <Fab
              aria-label="print"
              onClick={printPage}
              sx={{
                bgcolor: "#6D2323",
                "&:hover": { bgcolor: "#8a4747" },
                width: 56,
                height: 56,
              }}
            >
              <PrintIcon sx={{ color: "#fff" }} />
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>
    </Box>
  );
};

export default LeaveBack;
