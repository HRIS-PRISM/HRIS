import React from "react";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom"; // Import useNavigate


const ClearanceBack = () => {
    const handleBack = () => {
        navigate("/clearance");
      };
   
    const navigate = useNavigate();


    return (
        <div style={{
            padding: '0.25in',
            width: '8in',
            height: '10.5in',
            fontFamily: 'Arial, Helvetica, sans-serif',
            alignContent: 'center',
            margin: 'auto',
            marginTop: '50px',
            backgroundColor: '#ffffff'
        }}>
            <font size="4">


            <i> INSTRUCTIONS: </i>
            <br />
            <br />


            <ol type="1">
                <li style={{textAlign: "justify", width: "100%"}}>Employees who are retiring, being separated, transferring to other agencies,
                leaving the Philippines and going on leave of absence <b>for more than 30 days</b> shall prepare this form in quadruplicate.<br /><br />
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>This clearance should be duly accomplished before paying the last salary or
                any money due the employees. (Specify which type of clearance: maternity leave, retirement, transfer, etc.)<br /><br />
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>If the employees are cleared from a unit/office/department, the
                clearing/authorized official may attach to this clearance the pertinent
                documents that shall prove that the employees are cleared of any obligation or
                accountability from their office, if any, and tick the box under the "Cleared"
                column before affixing their signatures.<br /><br />
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>If the employees appear to have uncleared accountability/ies from a
                unit/office/department, the clearing/authorized official shall attach to this
                clearance the pertinent document/s that shall prove that the employees have
                remaining obligation or accountability from their office further indicating the
                necessary action/s that the employee must satisfy in order to be cleared, and
                tick the box under the "Uncleared" column. The clearing/authorized official
                must only sign this clearance corresponding to their name once the employee
                have complied the necessary requirements and cleared of all the obligation/s
                and accountability/ies from their office. They must also tick the box under the
                "Cleared" column.<br /><br />              
                </li>
                <li style={{textAlign: "justify", width: "100%"}}>The HRMO shall distribute copies of approved clearance as follows: original to
                the employee; duplicate to be attached to the payroll or voucher; triplicate to
                human resource unit file; and fourth copy to accounting/auditing office.<br /><br />
                </li>
                <li>Processing of clearance certificate shall follow the order of number indicated.</li><br /><br />
            </ol>
            </font>
            <div style={{fontSize: '75%', float: 'right'}}>
                <i>Page 2 of 2</i>
            </div>
            {/* Next Button */}
     <Button
     variant="contained"
     startIcon={<ArrowBackIcon />}
     onClick={handleBack}
     color="darkgray"
     sx={{
        position:'right',
        marginTop: '10px',


        '&:hover': {
            backgroundColor: 'black',
            color: 'lightgray'}
       
       
     }}
   
   >
    Back
   </Button>
        </div>
    );
};


export default ClearanceBack;



