import React from 'react';
import logo from './logo.png';
import Button from "@mui/material/Button";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useNavigate } from "react-router-dom"; // Import useNavigate




 
const Clearance = () => {
    const handleNext = () => {
        navigate("/clearance-back");
      };
   
    const navigate = useNavigate();


   
   
return (


    <div
      style={{
        border: "1px solid black",
        padding: "0.25in",
        width: "8in",
        height: "15.5in",
        fontFamily: "Poppins, sans-serif",
        alignContent:'center',
        margin: 'auto',
        marginTop: '50px',
        backgroundColor: '#ffffff',
      }}
    >
      <span style={{ fontSize: "2", fontWeight: "bold", fontStyle: "italic"}}>
        CS Form No. 7
        <br />
        Revised 2018
      </span>


      <div style={{ width: "5.25in", margin: "auto" }}>
        <div style={{ position: "relative", top: "10px", float: "left" }}>
          <img src= {logo} alt="Logo" height="90px" />
        </div>


        <div style={{position: 'relative', top: '15px', textAlign: 'center', float: 'right'}}>
            <font size="3">Republic of the Philippines</font><br />
            <b><font size="4">EULOGIO "AMANG" RODRIGUEZ</font></b><br />
            <b><font size="4">INSTITUTE OF SCIENCE AND TECHNOLOGY</font></b><br />
            <font size="3">Nagtahan, Sampaloc, Manila</font>
        </div>
      </div>
      <tbody>
 
      <div style={{padding: '0.1in', width: '4in', textAlign: 'center', margin: 'auto'}}>
        <font size="5">CLEARANCE FORM</font><br />
        <font size="2"><i>(Instructions at the back)</i></font>
    </div>


          <table style={{border:'3px solid black', borderCollapse:'collapse', width:'8in', tableLayout:'fixed'}}>
          <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black' }}>
            I
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black' }}>
            PURPOSE
            </td>
        </tr>
    <tr>
            <td colSpan="12" style={{height: '0.1in', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="10" style={{height: '0.1in', border: '0px solid black', textAlign: 'center'}}>
            ______________________________<br />
            Date of Filing
            </td>
        </tr>
        <tr>
            <td colSpan="2" rowSpan="3" style={{height: '0.1in', border: '0px 0px 1px 0px solid black', verticalAlign: 'top'}}>
            <br />
            TO:
            </td>
            <td colSpan="20" style={{height: '0.1in', border: '0px 0px 1px 0px solid black'}}>
            <br />
            <b><u>EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY</u></b><br />
            I hereby request clearance from money, property and work-related accountabilities for:
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{verticalAlign: 'top'}}>
            Purpose:
            </td>
            <td colSpan="4">
            [ ] Transfer<br />
            [ ] Retirement
            </td>
            <td colSpan="4">
            [ ] Resignation<br />
            [ ] Leave
            </td>
            <td colSpan="9">
            [ ] Other Mode of Separation:<br />
            &nbsp;&nbsp;&nbsp; Please specify: ________________
            </td>
           
        </tr>
        <tr>
            <td colSpan="20" style={{height: '0.1in',}}>
            <br />
            Date of Effectivity: ____________________________________________________
            <br />
            </td>
        </tr>
        <tr>
            <td colSpan="12" style={{height: '0.1in', border: '1px solid black'}}>
            <br />
            Office of Assignment: __________________________
            <br />
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Position/SG/Step: __________________________
            </td>
            <td colSpan="10" style={{height: '0.1in', border: '1px solid black', textAlign: 'center'}}>
            <br />
            ______________________________<br />
            Name and Signature of Employee
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '1px',  fontSize: '0%', backgroundColor:'black', border: '0px solid white'}}>          
            </td>
        </tr>      
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            II
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            CLEARANCE FROM WORK-RELATED ACCOUNTABILITIES
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '0.1in', fontSize: '85%', border: '0px solid black', textAlign: 'center'}}>
            We hereby certify that this employee is cleared/not cleared of work-related accountabilities from this Unit/Office/Dept.
            </td>
        </tr>
        <tr>
            <td colSpan="11" style={{height: '0.1in', border: '0px solid black', textAlign: 'center'}}>
            <br />
            ______________________________<br />
            Immediate Supervisor
            </td>
            <td colSpan="11" style={{height: '0.1in', border: '0px solid black', textAlign: 'center'}}>
            <br />
            ______________________________<br />
            Head of Office
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '1px', fontSize: '0%', backgroundColor:'black', border: '0px solid white'}}>          
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            III
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            CLEARANCE FROM MONEY AND PROPERTY ACCOUNTABILITIES
            </td>
        </tr>
        <tr>
            <td colSpan="8" style={{height: '0.1in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            Name of Unit/Office/Department
            </td>
            <td colSpan="2" style={{height: '0.1in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            Cleared
            </td>
            <td colSpan="2" style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
            Not Cleared
            </td>
            <td colSpan="6" style={{height: '0.1in', fontSize: '85%', border: '1px solid black', textAlign: 'center'}}>
            Name of Clearing Officer/Official
            </td>
            <td colSpan="4" style={{height: '0.1in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            Signature
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 1px 1px 0px solid black'}}>
            1.
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 0px 1px 1px solid black'}}>
            <i>Administrative Services</i>
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.1in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.1in', fontSize: '90%', border: '0px solid black'}}>
            a.
            </td>
            <td colSpan="6" style={{height: '0.1in', fontSize: '75%', border: '0px solid black'}}>
            Supply and Property Procurement and<br />
            Management Services
            </td>
            <td colSpan="2" style={{height: '0.1in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.1in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.1in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            <b>DR. HIROMI T. KIKUCHI</b>
            </td>
            <td colSpan="4" style={{height: '0.1in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.1in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.1in', fontSize: '90%', border: '0px solid black'}}>
            b.
            </td>
            <td colSpan="6" style={{height: '0.1in', fontSize: '75%', border: '0px solid black'}}>
            Human Resource Welfare & Assistance
            </td>
            <td colSpan="2" style={{height: '0.1in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.1in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.1in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            <b>AMPARO M. MORALES</b>
            </td>
            <td colSpan="4" style={{height: '0.1in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            c.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Agency-accredited Union/Cooperative
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            <b>PERFITA NATAL</b>
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 1px 1px 0px solid black'}}>
            2.
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 0px 1px 1px solid black'}}>
            <i>Library</i>
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            a.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Legal Office Library
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            &nbsp;
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            b.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Library Services
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            <b>CARINA ROMAQUIN</b>
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 1px 1px 0px solid black'}}>
            3.
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 0px 1px 1px solid black'}}>
            <i>Finance and Assets Management</i>
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            a.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Financial Services
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            <b>DR. YOLANDA A. LARA</b>
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            b.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Transaction, Processing & Billing Services
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            &nbsp;
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            c.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Payroll & Services
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            &nbsp;
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 1px 1px 0px solid black'}}>
            4.
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px 0px 1px 1px solid black'}}>
            <i>Professional and Institutional Development</i>
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            a.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Scholarship Services
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            &nbsp;
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '1px', fontSize: '0%', backgroundColor:'black', border: '0px solid white'}}>          
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            IV
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            CERTIFICATION OF NO PENDING ADMINISTRATIVE CASE
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="1" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            a.
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '75%', border: '0px solid black'}}>
            Internal Affairs Office/Legal Affairs Office
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="2" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="6" style={{height: '0.3in', fontSize: '90%', border: '1px solid black', textAlign: 'center'}}>
            <b>DR. GIOVANNI L. AHUNIN</b>
            </td>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '1px solid black'}}>
            &nbsp;
            </td>
        </tr>
        <tr style={{border: '1px solid black'}}>
            <td colSpan="4" style={{height: '0.3in', fontSize: '90%', border: '0px solid black'}}>
            &nbsp;
            </td>
            <td colSpan="18" style={{height: '0.5in', fontSize: '90%', border: '0px solid black'}}>
            [ ]&nbsp;&nbsp;&nbsp;&nbsp;with pending administrative case<br />
            [ ]&nbsp;&nbsp;&nbsp;&nbsp;with ongoing investigation (no formal charge yet)<br />
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '1px', fontSize: '0%', backgroundColor:'black', border: '0px solid white'}}>          
            </td>
        </tr>
        <tr>
            <td colSpan="1" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            V
            </td>
            <td colSpan="21" style={{height: '0.1in', backgroundColor:'lightgray', border: '1px solid black'}}>
            CERTIFICATION
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '0.8in', fontSize: '80%'}}>
            I hereby certify that this employee is cleared of work-related, money and property accountabilities from this agency. This certification<br />
            includes no pending administrative case from this agency.<br />
            <br />
            </td>
        </tr>
        <tr>
            <td colSpan="22" style={{height: '0.4in', fontSize: '80%', textAlign: 'center'}}>
            <b><u>DR. ROGELIO T. MAMARADLO</u></b><br />
            Signature over Printed Name of Agency Head
            </td>
        </tr>      




      </table>
      </tbody>
       {/* Next Button */}
     <Button
     variant="contained"
     endIcon={<NavigateNextIcon />}
     onClick={handleNext}
     color="darkgray"
     sx={{
        position:'right',
        marginTop: '10px',
        marginLeft: '7in',
        '&:hover': {
            backgroundColor: 'black',
            color: 'lightgray'}
       
       
     }}
   
   >
     Next
   </Button>
    </div>


   
   
    );
};


   
export default Clearance;



