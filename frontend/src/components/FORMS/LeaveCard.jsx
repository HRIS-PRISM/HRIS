import React from "react";
import { Button } from "@mui/material";
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined';import { useNavigate} from "react-router-dom";


const LeaveCard = () => {
    const handleNext = () => {
        navigate("/leave-card-back")
    };


    const navigate = useNavigate();


    return (
        <div style={{
            border:'1px solid black',
            Padding:'0.25in',
            width:'11.25in',
            height:'9.25in',
            fontFamily:'Arial, Helvetica, sans-serif',
            margin:'auto',
            marginTop:'50px',
            backgroundColor: '#ffffff'
        }}>
            <table style={{border: '0px', borderCollapse: 'collapse', width: '11in', tableLayout: 'fixed', margin: 'auto'}}>
                <tr>
                    <td colSpan="36" style={{height: '0.75in', fontSize: '150%', textAlign: 'center'}}>
                        <b><u>EMPLOYEE'S LEAVE CARD</u></b><br />
                    </td>
                </tr>
                <tr>
                    <td colSpan="14" style={{height: '0.25in'}}>
                        <b>Name</b> ________________________________
                    </td>
                    <td colSpan="11" style={{height: '0.25in'}}>
                        <b>Civil Status</b> ____________________
                    </td>
                    <td colSpan="11" style={{height: '0.25in'}}>
                        <b>GSIS Policy No.</b> ____________________
                    </td>
                </tr>
                <tr>
                    <td colSpan="14" style={{height: '0.25in'}}>
                        <b>Position</b> ______________________________
                    </td>
                    <td colSpan="11" style={{height: '0.25in'}}>
                        <b>Entrance to Duty</b> _______________
                    </td>
                    <td colSpan="11" style={{height: '0.25in'}}>
                        <b>TIN No.</b> ___________________________
                    </td>
                </tr>
                <tr>
                    <td colSpan="14" style={{height: '0.25in'}}>
                        <b>Status</b> ________________________________
                    </td>
                    <td colSpan="11" style={{height: '0.25in'}}>
                        <b>Unit</b> __________________________
                    </td>
                    <td colSpan="11" style={{height: '0.25in'}}>
                        <b>National Reference Card No.</b> _________
                    </td>
                </tr>
            </table>
            <br />
            <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '11in', tableLayout: 'fixed', margin: 'auto'}}>
                <tr>
                    <td colSpan="3" rowspan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>PERIOD</b>
                    </td>
                    <td colSpan="8" rowspan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>PARTICULARS</b>
                    </td>
                    <td colSpan="10" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>VACATION LEAVE</b>
                    </td>
                    <td colSpan="10" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>SICK LEAVE</b>
                    </td>
                    <td colSpan="5" rowspan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>REMARKS</b>
                    </td>
                </tr>
                <tr>
            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                <b>EARNED</b>
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                <b>Absence<br />Undertime<br />W/Pay</b>
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '70%', textAlign: 'center'}}>
                <b>BALANCE</b>
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                <b>Absence<br />Undertime<br />W/o Pay</b>
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                <b>EARNED</b>
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                <b>Absence<br />Undertime<br />W/Pay</b>
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.5in', fontSize: '70%', textAlign: 'center'}}>
                <b>BALANCE</b>
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.5in', fontSize: '80%', textAlign: 'center'}}>
                <b>Absence<br />Undertime<br />W/o Pay</b>
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                <b>BAL. BROUGHT FORWARD</b>
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
        <tr>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="8" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                <b>BAL. BROUGHT FORWARD</b>
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="3" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
            <td colSpan="5" style={{border: '1px solid black', height: '0.25in', fontSize: '80%', textAlign: 'center'}}>
                &nbsp;
            </td>
        </tr>
    </table>
    <Button
    variant="outline"
    endIcon={< ArrowForwardIosOutlinedIcon/>}
    onClick={handleNext}
    color="darkgray"
    sx={{
        position:'right',
        marginTop:'5.5px',
        right:'-.15in',
        '&hover':{
            backgroungColor:'black',
            color:'lightgray'
        }
    }}>
        Next
    </Button>
        </div>


    );
};
export default LeaveCard;

