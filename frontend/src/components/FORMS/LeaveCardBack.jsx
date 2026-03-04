import React from "react";
import Button from "@mui/material/Button";
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined';import { useNavigate } from "react-router-dom"; // Import useNavigate




const LeaveCardBack = () => {
    const handleBack = () => {
        navigate("/leave-card");
      };
   
    const navigate = useNavigate();
    return (
        <div style={{
            border: '1px solid black',
            padding: '0.25in',
            width: '11.25in',
            height: '9.25in',
            fontFamily: 'Arial, Helvetica, sans-serif',
            margin:'auto',
            marginTop:'50px',
            backgroungColor: '#ffffff'
            }}>
            <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '11in', tableLayout: 'fixed', margin: 'auto'}}>
                <tr>
                    <td colSpan="3" rowSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>PERIOD</b>
                    </td>
                    <td colSpan="8" rowSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>PARTICULARS</b>
                    </td>
                    <td colSpan="10" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>VACATION LEAVE</b>
                    </td>
                    <td colSpan="10" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
                        <b>SICK LEAVE</b>
                    </td>
                    <td colSpan="5" rowSpan="2" style={{border: '1px solid black', height: '0.25in', fontSize: '90%', textAlign: 'center'}}>
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
            </table>
            <Button
    variant="outline"
    endIcon={< ArrowBackIosNewOutlinedIcon/>}
    onClick={handleBack}
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
        Back
    </Button>    
            </div>


    );
};
export default LeaveCardBack;

