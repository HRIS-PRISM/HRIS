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
            border: '1px solid black',
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
                <li>Employees who are retiring, being separated, transferring to other agencies,<br />
                leaving the Philippines and going on leave of absence <b>for more than 30 days</b><br />
                shall prepare this form in quadruplicate.<br /><br />
                </li>
                <li>This clearance should be duly accomplished before paying the last salary or<br />
                any money due the employees. (Specify which type of clearance: maternity<br />
                leave, retirement, transfer, etc.)<br /><br />
                </li>
                <li>If the employees are cleared from a unit/office/department, the<br />
                clearing/authorized official may attach to this clearance the pertinent<br />
                documents that shall prove that the employees are cleared of any obligation or<br />
                accountability from their office, if any, and tick the box under the "Cleared"<br />
                column before affixing their signatures.<br /><br />
                </li>
                <li>If the employees appear to have uncleared accountability/ies from a<br />
                unit/office/department, the clearing/authorized official shall attach to this<br />
                clearance the pertinent document/s that shall prove that the employees have<br />
                remaining obligation or accountability from their office further indicating the<br />
                necessary action/s that the employee must satisfy in order to be cleared, and<br />
                tick the box under the "Uncleared" column. The clearing/authorized official<br />
                must only sign this clearance corresponding to their name once the employee<br />
                have complied the necessary requirements and cleared of all the obligation/s<br />
                and accountability/ies from their office. They must also tick the box under the<br />
                "Cleared" column.<br /><br />              
                </li>
                <li>The HRMO shall distribute copies of approved clearance as follows: original to<br />
                the employee; duplicate to be attached to the payroll or voucher; triplicate to<br />
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



