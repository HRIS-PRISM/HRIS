import React from "react";
import logo from "./logo.png";


const InServiceTraining = () =>{
    return (
        <div style={{
            border:'1px solid black',
            padding:'0.25in',
            width:'7.75in',
            height:'15in',
            fontFamily:'Arial, Helvetica, sans-serif',
            margin:'auto',
            marginTop:'50px',
            backgroundColor: '#ffffff'
        }}>
            <br />
            <br />
            <br />
            <br />
            <div style={{width:'5.25in', margin:'auto'}}>
                <div style={{position:'relative', top:'10px', float:'left'}}>
                    <img src={logo} alt="logo" height='100px'></img>
                </div>
                <div style={{position: 'relative', top: '20px', textAlign: 'center', float: 'right'}}>
                    <font size="3">Republic of the Philippines</font><br />
                    <b><font size="4">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
                    <b><font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
                    <font size="3">Nagtahan, Sampaloc, Manila</font>
                </div>
            </div>
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <div style={{border: '1px solid black', padding: '0.1in', width: '4in', textAlign: 'center', margin: 'auto'}}>
                <b><font size="4">REPORT ON IN-SERVICE TRAINING</font></b>
            </div>
            <br />
            <br />
            <div style={{textAlign: 'center', margin: 'auto'}}>
                Name: _______________________________&nbsp;&nbsp;&nbsp;Position: _________________________________
                <br />
                College/Office: _________________________&nbsp;&nbsp;&nbsp;Designation: ______________________________
                <br />
                -------------------------------------------------------------------------------------------------------------------------------------
                <br />
            </div>
            <br />


            <ol type="I">
            <li><b>GENERAL INFORMATION</b></li>
            <br />
            <ol type="1">
                <li>Title _____________________________________________________________________</li>
                <li>Sponsor __________________________________________________________________</li>
                <li>Venue ____________________________________________________________________</li>
                <li>Inclusive Dates _____________________________________________________________</li>
                <li>Authority: CHED/DECS/ASSN.MEMO No. __________________&nbsp;&nbsp;&nbsp;Date: ________________
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Officer Order No. _________________&nbsp;&nbsp;&nbsp;Date: ________________
                </li>
            </ol>
            <br />
                <li><b>HIGHLIGHTS</b> (Objectives, topics discussed, activities, outputs, etc.)</li>
                <li><b>PLANS</b> (What you will do to implement what you learned)</li>
                <li><b>RECOMMENDATION</b> (What you suggest to your College or the Institute to implement what you learned)</li>
                <li><b>ANNEXES</b> (Program, handouts, project proposals, etc.)</li>
                <br />
                <br />
                <br />
                <div style={{textAlign: 'center', float: 'right'}}>
                __________________________<br />
                Signature<br />
                Date: _____________________
                </div>
                <br />
                <br />
                <br />
                <br />
                &nbsp;&nbsp;NOTED:
                <br />
                <br />
                <br />
                <div style={{textAlign: 'center', float: 'left'}}>
                ___________________________<br />
                Dean/Director<br />
                Date: ______________________
                <br />
                <br />
                <br />
                <br />
                &nbsp;&nbsp;<b>ROGELIO T. MAMARADLO, Ed.D.</b><br />
                SUC President I
                <br />
                <br />
                <br />
                Date: ______________________
                </div>
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <br />
                <div style={{fontSize: '55%', float: 'right'}}>
                (NOTE: Use this page for Part I&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br />
                Use additional sheets for Part II-V)
                </div>
               
            </ol>




        </div>
    );
};
export default InServiceTraining;

