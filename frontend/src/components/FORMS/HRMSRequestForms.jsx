import React from "react";
import logo from "./logo.png";


const HrmsRequestForms = () => {


  return (
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
                <b><font size="3">I. PRINTED NAME OF THE REQUESTING EMPLOYEE: _____________________________________</font></b>
              </div>
              <div style={{position: 'relative', top: '50px', left: '0.52in', float: 'right',}}>
              <b><font size="2">(Please use the back page if more than one employee)</font></b>
              </div>
              <div style={{position: 'relative', top: '285px', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto' }}/>
              <div style={{position: 'relative', top: '60px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">II. ADDRESS:</font></b>
              </div>
              <div style={{position: 'relative', top: '45px', left: '1.80in', width: '8in', float: 'right'}}>
              <b><font size="3">_______________________________________________<br />
              _______________________________________________</font></b>
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
              <i>Please specify: ______________________________________________</i></font>
              </div>
              <div style={{position: 'relative', top: '15.15cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top:'-28px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">IV. PURPOSE OF REQUEST:</font></b>
              </div>
              <div style={{position: 'relative', top: '-1cm', left: '3in', width: '8in', float: 'right'}}>
              <b><font size="3">______________________________________</font></b>
              </div>
              <div style={{position: 'relative', top: '16.45cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '-0.75cm', left: '-0.69in', width: '8in', float: 'left'}}>
              <b><font size="3">V. REQUESTED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-20px', left: '-0.75in', width: '4in', float: 'left', textAlign: 'center'}}>
              <font size="3"><b>_______________________</b><br />(Name and Signature)</font>
              </div>
              <div style={{position: 'relative', top: '-2.60cm', left: '5.1in', width: '8in', float: 'right'}}>
              <b><font size="3">VI. RECEIVED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-90px', left: '0.8in', width: '4in', float: 'right', textAlign: 'center'}}>
              <font size="3"><b>________________________</b><br />(Name and Signature)</font>
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
                <b><font size="3">I. PRINTED NAME OF THE REQUESTING EMPLOYEE: _____________________________________</font></b>
              </div>
              <div style={{position: 'relative', top: '50px', left: '0.52in', float: 'right',}}>
              <b><font size="2">(Please use the back page if more than one employee)</font></b>
              </div>
              <div style={{position: 'relative', top: '285px', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto' }}/>
              <div style={{position: 'relative', top: '60px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">II. ADDRESS:</font></b>
              </div>
              <div style={{position: 'relative', top: '45px', left: '1.80in', width: '8in', float: 'right'}}>
              <b><font size="3">_______________________________________________<br />
              _______________________________________________</font></b>
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
              <i>Please specify: ______________________________________________</i></font>
              </div>
              <div style={{position: 'relative', top: '15.15cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top:'-28px', left: '-0.70in', width: '8in', float: 'left'}}>
              <b><font size="3">IV. PURPOSE OF REQUEST:</font></b>
              </div>
              <div style={{position: 'relative', top: '-1cm', left: '3in', width: '8in', float: 'right'}}>
              <b><font size="3">______________________________________</font></b>
              </div>
              <div style={{position: 'relative', top: '16.45cm', left: '-0.75in', width: '8in', height: '0.03in', backgroundColor: 'black', margin: 'auto'}}/>
              <div style={{position: 'relative', top: '-0.75cm', left: '-0.69in', width: '8in', float: 'left'}}>
              <b><font size="3">V. REQUESTED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-20px', left: '-0.75in', width: '4in', float: 'left', textAlign: 'center'}}>
              <font size="3"><b>_______________________</b><br />(Name and Signature)</font>
              </div>
              <div style={{position: 'relative', top: '-2.60cm', left: '5.1in', width: '8in', float: 'right'}}>
              <b><font size="3">VI. RECEIVED BY:</font></b>
              </div>
              <div style={{position: 'relative', top: '-90px', left: '0.8in', width: '4in', float: 'right', textAlign: 'center'}}>
              <font size="3"><b>________________________</b><br />(Name and Signature)</font>
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
     
     


     


  );
};
export default HrmsRequestForms;

