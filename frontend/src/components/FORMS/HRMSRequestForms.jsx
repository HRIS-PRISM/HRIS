import React, { useRef } from "react";
import logo from "./logo.png";
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


const HrmsRequestForms = () => {
  const printRef = useRef(null);

  const ensureCaptureStyles = (el) => {
    if (!el) return {};
    const orig = {
      backgroundColor: el.style.backgroundColor,
      width: el.style.width,
      visibility: el.style.visibility,
      display: el.style.display,
      position: el.style.position,
      left: el.style.left,
      zIndex: el.style.zIndex,
      opacity: el.style.opacity,
    };
    el.style.backgroundColor = '#ffffff';
    el.style.width = '8.27in';
    el.style.visibility = 'visible';
    el.style.display = 'block';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.zIndex = '10000';
    el.style.opacity = '1';
    return orig;
  };

  const restoreCaptureStyles = (el, orig) => {
    if (!el || !orig) return;
    el.style.backgroundColor = orig.backgroundColor || '';
    el.style.width = orig.width || '';
    el.style.visibility = orig.visibility || '';
    el.style.display = orig.display || '';
    el.style.position = orig.position || '';
    el.style.left = orig.left || '';
    el.style.zIndex = orig.zIndex || '';
    el.style.opacity = orig.opacity || '';
  };

  const printPage = async () => {
    if (!printRef.current) return;

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const orig = ensureCaptureStyles(printRef.current);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      restoreCaptureStyles(printRef.current, orig);

      const imgData = canvas.toDataURL('image/png');
      const formWidth = 8.27;
      const formHeight = 11.69;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - formWidth) / 2;
      const yOffset = (pageHeight - formHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, formWidth, formHeight);
      pdf.autoPrint();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Error generating print view:', error);
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'a4' });
      const orig = ensureCaptureStyles(printRef.current);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      restoreCaptureStyles(printRef.current, orig);

      const imgData = canvas.toDataURL('image/png');
      const formWidth = 8.27;
      const formHeight = 11.69;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const xOffset = (pageWidth - formWidth) / 2;
      const yOffset = (pageHeight - formHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, formWidth, formHeight);
      const fileName = `HRMS-Request-Form-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
<div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={printPage}>
          Print
        </Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadPDF}>
          Download PDF
        </Button>
      </div>
<div ref={printRef}>
      <div style ={{


        position: 'relative',
        paddingTop: '0.30in',
        left: '0px',
        border:'1px solid black',
        padding:'0.125in',
        width:'8.25in',
        height:'8.50in',
        fontFamily: 'Poppins, sans-serif',
        margin: 'auto',
        marginBottom: '0.30in',
        backgroundColor: '#ffffff'


      }}>
        <div style ={{
         
          border:'5px solid black',
          padding:'0.125in',
          width:'7.875in',
          height:'8in',
          margin: 'auto',


        }}>
          <div style={{
            width:'6.5in',
            margin:'auto',
          }}>
            <div style={{
              position:'relative',
              top:'5px',
              float:'left',}}>
                <img src={logo} alt="logo" style={{height:'100px'}}></img>
              </div>
              <div style={{position:'relative', top:'5px', left:'-1.5in', textAlign:'center', float:'right'}}>
                <font size="2">Republic of the Philippines</font> <br />
                <b><font size="3">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                <b><font size="3">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                <font size="2">Nagtahan, Sampaloc, Manila</font><br />
                <b><font size="1">6243-9467 Loc. 120</font></b><br />
                <b><font size="2">HUMAN RESOURCES MANAGEMENT SERVICES</font></b><br />
                <b><font size="2">REQUEST FORM</font></b>
              </div>
              <div style={{position:'relative', top:'5px', left:'3.5in', float:'right'}}>
                <img src={logo} alt="logo" style={{height:'100px'}}></img>
              </div>


              {/*DATE PART*/}
              <div style={{position:'relative', top: '180px', left: '-0.75in', width:'8in', height:'0.03in', backgroundColor:'black', margin:'auto', }} />
              <div style={{position: 'relative', top: '180px', left: '4in', float: 'right'}}>
                <b><font size="3">DATE:</font></b>
              </div>
              <div style={{position: 'relative', top: '201px', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto' }}/>
              <div style={{position: 'relative', top: '50px', right: '0.70in', width: '8in', float: 'left'}}>
                <b><font size="3">I. PRINTED NAME OF THE REQUESTING EMPLOYEE:{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      width: '500px',
                      borderBottom: '1px solid black',
                    }}
                  />
                </font></b>
              </div>
              <div style={{position: 'relative', top: '50px', left: '0.52in', float: 'right',}}>
              <b><font size="2">(Please use the back page if more than one employee)</font></b>
              </div>
              <div style={{position: 'relative', top: '285px', left: '-0.75in', width: '8in', height: '0.04in', backgroundColor: 'black', margin: 'auto' }}/>
              <div style={{position: 'relative', top: '60px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">II. ADDRESS:</font></b>
              </div>
              <div style={{position: 'relative', top: '45px', left: '1.80in', width: '8in', float: 'right'}}>
              <b><font size="3">
                <span
                  style={{
                    display: 'inline-block',
                    width: '500px',
                    borderBottom: '1px solid black',
                  }}
                />
                <br />
                <span
                  style={{
                    display: 'inline-block',
                    width: '500px',
                    borderBottom: '1px solid black',
                  }}
                />
              </font></b>
              </div>
              <div style={{position: 'relative', top: '350px', left: '-.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '60px', left: '-.70in', width: '8in', float: 'left'}}>
              <font size="3"><b>III. NATURE OF REQUEST:</b> <i>(Please check the appropriate box for your request)</i></font>
              </div>
              <div style={{position: 'relative', top: '70px', left: '.30in', width: '8in', float: 'left'}}>
              <font size="3">
              [ ]<b> Service Records</b> <br />
              [ ]<b> IPCR</b> <br />
              [ ]<b> DTR</b> <br />
              [ ]<b> 201 Files</b> <br />
              [ ]<b> Copy of Appointment</b> <br />
              </font>
              </div>
              <div style={{position: 'relative', top: '-50px', left: '4.3in', width: '8in', float: 'right'}}>
              <font size="3">
              [ ]<b> Certificate of Employment</b><br />
              [ ]<b> Personal Data Sheet</b><br />
              [ ]<b> Retirement Forms</b><br />
              [ ]<b> Authority to Travel (NOTE: 3 weeks before Travel)</b><br />
              [ ]<b> Service Credits/Travel Credits Balance</b><br />
              </font>
              </div>
              <div style={{position: 'relative', top: '-45px', left: '-0.50in', width: '8in', float: 'left'}}>
              <font size="3"><b>Other Documents</b><br />
              <i>Please specify:{' '}
                <span
                  style={{
                    display: 'inline-block',
                    width: '500px',
                    borderBottom: '1px solid black',
                  }}
                />
              </i></font>
              </div>
              <div style={{position: 'relative', top: '15.15cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top:'-28px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">IV. PURPOSE OF REQUEST:</font></b>
              </div>
              <div style={{position: 'relative', top: '-1cm', left: '3in', width: '8in', float: 'right'}}>
              <b><font size="3">
                <span
                  style={{
                    display: 'inline-block',
                    width: '400px',
                    borderBottom: '1px solid black',
                  }}
                />
              </font></b>
              </div>
              <div style={{position: 'relative', top: '16.45cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '-0.75cm', left: '-0.69in', width: '8in', float: 'left'}}>
              <b><font size="3">V. REQUESTED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-20px', left: '-0.75in', width: '4in', float: 'left', textAlign: 'center'}}>
              <font size="3"><b>
                <span
                  style={{
                    display: 'inline-block',
                    width: '300px',
                    borderBottom: '1px solid black',
                  }}
                />
              </b><br />(Name and Signature)</font>
              </div>
              <div style={{position: 'relative', top: '-2.60cm', left: '5.1in', width: '8in', float: 'right'}}>
              <b><font size="3">VI. RECEIVED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-90px', left: '0.8in', width: '4in', float: 'right', textAlign: 'center'}}>
              <font size="3"><b>
                <span
                  style={{
                    display: 'inline-block',
                    width: '300px',
                    borderBottom: '1px solid black',
                  }}
                />
              </b><br />(Name and Signature)</font>
              </div>
              <div style={{position: 'relative', top: '16.40cm', left: '0in', width: '0.03in', height: '0.75in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '-1.75cm', left: '-0.75in', width: '4in', float: 'left'}}>
              <font size="2">EARIST-QSF-HRMS-014</font>
              </div>


          </div>
        </div>
      </div>

      <div>
      <div style ={{


        position: 'relative',
        paddingTop: '0.30in',
        left: '0px',
        border:'1px solid black',
        padding:'0.125in',
        width:'8.25in',
        height:'8.50in',
        fontFamily: 'Poppins, sans-serif',
        margin: 'auto',
        marginBottom: '0.30in',
        backgroundColor: '#ffffff'


      }}>
        <div style ={{
         
          border:'5px solid black',
          padding:'0.125in',
          width:'7.875in',
          height:'8in',
          margin: 'auto',


        }}>
          <div style={{
            width:'6.5in',
            margin:'auto',
          }}>
            <div style={{
              position:'relative',
              top:'5px',
              float:'left',}}>
                <img src={logo} alt="logo" style={{height:'100px'}}></img>
              </div>
              <div style={{position:'relative', top:'5px', left:'-1.5in', textAlign:'center', float:'right'}}>
                <font size="2">Republic of the Philippines</font> <br />
                <b><font size="3">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                <b><font size="3">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                <font size="2">Nagtahan, Sampaloc, Manila</font><br />
                <b><font size="1">6243-9467 Loc. 120</font></b><br />
                <b><font size="2">HUMAN RESOURCES MANAGEMENT SERVICES</font></b><br />
                <b><font size="2">REQUEST FORM</font></b>
              </div>
              <div style={{position:'relative', top:'5px', left:'3.5in', float:'right'}}>
                <img src={logo} alt="logo" style={{height:'100px'}}></img>
              </div>


              {/*DATE PART*/}
              <div style={{position:'relative', top: '180px', left: '-0.75in', width:'8in', height:'0.03in', backgroundColor:'black', margin:'auto', }} />
              <div style={{position: 'relative', top: '180px', left: '4in', float: 'right'}}>
                <b><font size="3">DATE:</font></b>
              </div>
              <div style={{position: 'relative', top: '201px', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto' }}/>
              <div style={{position: 'relative', top: '50px', right: '0.70in', width: '8in', float: 'left'}}>
                <b><font size="3">I. PRINTED NAME OF THE REQUESTING EMPLOYEE:{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      width: '500px',
                      borderBottom: '1px solid black',
                    }}
                  />
                </font></b>
              </div>
              <div style={{position: 'relative', top: '50px', left: '0.52in', float: 'right',}}>
              <b><font size="2">(Please use the back page if more than one employee)</font></b>
              </div>
              <div style={{position: 'relative', top: '285px', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto' }}/>
              <div style={{position: 'relative', top: '60px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">II. ADDRESS:</font></b>
              </div>
              <div style={{position: 'relative', top: '45px', left: '1.80in', width: '8in', float: 'right'}}>
              <b><font size="3">
                <span
                  style={{
                    display: 'inline-block',
                    width: '500px',
                    borderBottom: '1px solid black',
                  }}
                />
                <br />
                <span
                  style={{
                    display: 'inline-block',
                    width: '500px',
                    borderBottom: '1px solid black',
                  }}
                />
              </font></b>
              </div>
              <div style={{position: 'relative', top: '350px', left: '-.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '60px', left: '-.70in', width: '8in', float: 'left'}}>
              <font size="3"><b>III. NATURE OF REQUEST:</b> <i>(Please check the appropriate box for your request)</i></font>
              </div>
              <div style={{position: 'relative', top: '70px', left: '.30in', width: '8in', float: 'left'}}>
              <font size="3">
              [ ]<b> Service Records</b> <br />
              [ ]<b> IPCR</b> <br />
              [ ]<b> DTR</b> <br />
              [ ]<b> 201 Files</b> <br />
              [ ]<b> Copy of Appointment</b> <br />
              </font>
              </div>
              <div style={{position: 'relative', top: '-50px', left: '4.3in', width: '8in', float: 'right'}}>
              <font size="3">
              [ ]<b> Certificate of Employment</b><br />
              [ ]<b> Personal Data Sheet</b><br />
              [ ]<b> Retirement Forms</b><br />
              [ ]<b> Authority to Travel (NOTE: 3 weeks before Travel)</b><br />
              [ ]<b> Service Credits/Travel Credits Balance</b><br />
              </font>
              </div>
              <div style={{position: 'relative', top: '-45px', left: '-0.50in', width: '8in', float: 'left'}}>
              <font size="3"><b>Other Documents</b><br />
              <i>Please specify:{' '}
                <span
                  style={{
                    display: 'inline-block',
                    width: '500px',
                    borderBottom: '1px solid black',
                  }}
                />
              </i></font>
              </div>
              <div style={{position: 'relative', top: '15.15cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top:'-28px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">IV. PURPOSE OF REQUEST:</font></b>
              </div>
              <div style={{position: 'relative', top: '-1cm', left: '3in', width: '8in', float: 'right'}}>
              <b><font size="3">
                <span
                  style={{
                    display: 'inline-block',
                    width: '400px',
                    borderBottom: '1px solid black',
                  }}
                />
              </font></b>
              </div>
              <div style={{position: 'relative', top: '16.45cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '-0.75cm', left: '-0.69in', width: '8in', float: 'left'}}>
              <b><font size="3">V. REQUESTED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-20px', left: '-0.75in', width: '4in', float: 'left', textAlign: 'center'}}>
              <font size="3"><b>
                <span
                  style={{
                    display: 'inline-block',
                    width: '300px',
                    borderBottom: '1px solid black',
                  }}
                />
              </b><br />(Name and Signature)</font>
              </div>
              <div style={{position: 'relative', top: '-2.60cm', left: '5.1in', width: '8in', float: 'right'}}>
              <b><font size="3">VI. RECEIVED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-90px', left: '0.8in', width: '4in', float: 'right', textAlign: 'center'}}>
              <font size="3"><b>
                <span
                  style={{
                    display: 'inline-block',
                    width: '300px',
                    borderBottom: '1px solid black',
                  }}
                />
              </b><br />(Name and Signature)</font>
              </div>
              <div style={{position: 'relative', top: '16.40cm', left: '0in', width: '0.03in', height: '0.75in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '-1.75cm', left: '-0.75in', width: '4in', float: 'left'}}>
              <font size="2">EARIST-QSF-HRMS-014</font>
              </div>


          </div>
        </div>
      </div>
</div>
</div>
 </div>
     
     


     


  );
};
export default HrmsRequestForms;

