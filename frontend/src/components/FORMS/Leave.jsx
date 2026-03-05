import React from "react";
import logo from './logo.png';

const Leave = () => {
    return (
        <div style= {{
            border: "1px solid black",
            padding: "0.25in",
            width: "8in",
            height:'16.6in',
            fontFamily: "Arial, Helvetica, sans-serif",
            alignContent:'center',
            margin: 'auto',
            marginTop: '50px',
			backgroundColor: '#ffffff'
        }}> 
        {/*START DIV */}
        <div style={{ 
            border: '1px dotted black',
            padding: '0.1in', 
            width: '1.5in', 
            position: 'relative',
            top: '25px', 
            right: '5px',
            textAlign: 'center', 
            float: 'right'}}> 
            <font size="1">Stamp of Date of Receipt</font>
        </div>
        <font size="2"><b><i>Civil Service Form No. 6<br />
        Revised 2020</i></b></font>
        <div style={{
            position: 'relative', 
            top: '-20px', 
            right: '-160px', 
            float: 'right'}}>
        <font size="2"><b>ANNEX A</b></font>
        </div>
        <div style={{width: '4.5in', margin: 'auto'}}>
		<div style={{position: 'relative', top: '10px', float: 'left'}}>
			<img src= {logo} alt="Logo" height="90px" />
		</div>
		<div style={{position: 'relative', top: '15px', textAlign: 'center', float: 'right'}}>
			<font size="3">Republic of the Philippines<br />
			<b>EULOGIO "AMANG" RODRIGUEZ</b><br />
			<b>INSTITUTE OF SCIENCE AND TECHNOLOGY</b><br />
			Nagtahan, Sampaloc, Manila</font>
		</div>
	</div>
    <br />
	<br />
	<br />
	<br />
	<br />
    <br />
    <div style={{padding: '0.1in', width: '4in', textAlign: 'center', margin: 'auto'}}>
		<font size="5">APPLICATION FOR LEAVE</font><br />
		<br />
	</div>
    <table style={{border: '1px solid black', borderCollapse: 'collapse', width: '8in', tableLayout: 'fixed'}}>
    <tr style={{border: '1px solid black'}}>
			<td colSpan="1" style={{height: '0.35in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				1.
			</td>
			<td colSpan="8" style={{height: '0.35in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				OFFICE/DEPARTMENT
			</td>
			<td colSpan="3" style={{height: '0.35in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				2. NAME
			</td>
			<td colSpan="4" style={{height: '0.35in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				(Last)
			</td>
			<td colSpan="4" style={{height: '0.35in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				(First)
			</td>
			<td colSpan="4" style={{height: '0.35in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				(Middle)
			</td>
		</tr>
        		<tr style={{border: '1px solid black'}}>
			<td colSpan="1" style={{height: '0.35in', fontSize: '80%', border: '0px'}}>
				3.
			</td>
			<td colSpan="8" style={{height: '0.35in', fontSize: '80%', border: '0px'}}>
				DATE OF FILING ______________
			</td>
			<td colSpan="9" style={{height: '0.35in', fontSize: '80%', border: '0px'}}>
				4. POSITION __________________
			</td>
			<td colSpan="6" style={{height: '0.35in', fontSize: '80%', border: '0px'}}>
				5. SALARY _____________
			</td>
		</tr>
        <tr style={{border: '1px solid black'}}>
			<td colSpan="24" style={{height: '0.25in', fontSize: '80%', border: '0px', textAlign: 'center'}}>
				<b>6. DETAILS OF APPLICATION</b>
			</td>
		</tr>
        		<tr style={{border: '0px'}}>
			<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				6.
			</td>
			<td colSpan="12" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				A TYPE OF LEAVE TO BE AVAILED OF
			</td>
			<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				6.
			</td>
			<td colSpan="10" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				B DETAILS OF LEAVE
			</td>
		</tr>
        		<tr style={{border: '0px'}}>
			<td colSpan="12" style={{height: '0.4in', fontSize: '70%', border: '0px', verticalAlign: 'top'}}>
				<br />
				[ ] Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)<br /><br />
				[ ] Mandatory/Forced Leave (Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)<br /><br />
				[ ] Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)<br /><br />
				[ ] Maternity Leave (R.A. No. 11210/IRR issued by CSC, DOLE and SSS)<br /><br />
				[ ] Paternity Leave (R.A. No. 8187/CSC MC No. 71, s. 1998, as amended)<br /><br />
				[ ] Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)<br /><br />
				[ ] Solo Parent Leave (R.A. No. 8972/CSC MC No. 8, s. 2004)<br /><br />
				[ ] Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)<br /><br />
				[ ] 10-Day VAWC Leave (R.A. No. 9262/CSC MC No. 15, s. 2005)<br /><br />
				[ ] Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)<br /><br />
				[ ] Special Leave Benefits for Women (R.A. No. 9710/CSC MC No. 25, s. 2010)<br /><br />
				[ ] Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)<br /><br />
				[ ] Adoption Leave (R.A. No. 8552)<br /><br />
				<i>Others:</i><br />
				__________________________________________<br />
			</td>
			<td colSpan="10" style={{height: '0.4in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				<i>In case of Vacation/Special Privilege Leave:</i><br /><br />
				[ ] Within the Philippines _______________________<br /><br />
				[ ] Abroad (Specify) ___________________________<br />
				<br />
				<i>In case of Sick Leave:</i><br /><br />
				[ ] In Hospital (Specify Illness) __________________<br /><br />
				[ ] Out Patient (Specify Illness) __________________<br />
				___________________________________________<br />
				<br />
				<i>In case of Special Leave Benefits for Women:</i><br /><br />
				(Specify Illness) _____________________________<br />
				___________________________________________<br />
				<br />
				<i>In case of Study Leave:</i><br /><br />
				[ ] Completion of Master's Degree<br /><br />
				[ ] BAR/Board Examination Review<br />
				<br />
				<i>Other purpose:</i><br /><br />
				[ ] Monetization of Leave Credits<br /><br />
				[ ] Terminal Leave<br />
				<br />
			</td>
		</tr>
        		<tr style={{border: '1px solid black'}}>
			<td colSpan="1" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				6.
			</td>
			<td colSpan="12" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				C NUMBER OF WORKING DAYS APPLIED FOR<br />
				________________________________________<br /><br />
				&nbsp;&nbsp;&nbsp;
				INCLUSIVE DATES<br />
				________________________________________<br /><br />
			</td>
			<td colSpan="1" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				6.
			</td>
			<td colSpan="10" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				D COMMUTATION<br />
				[ ] Not Required<br />
				<br />
				[ ] Required<br />
				<br />
				&nbsp;&nbsp;&nbsp;&nbsp;
				__________________________________
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				(Signature of Applicant)<br />
			</td>
		</tr>
        		<tr style={{border: '1px solid black'}}>
			<td colSpan="24" style={{height: '0.25in', fontSize: '80%', border: '0px', textAlign: 'center'}}>
				<b>7. DETAILS OF ACTION ON APPLICATION</b>
			</td>
		</tr>
        		<tr style={{border: '0px'}}>
			<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				7.
			</td>
			<td colSpan="12" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				A CERTIFICATION OF LEAVE CREDITS<br />
			</td>
			<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				7.
			</td>
			<td colSpan="10" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				B RECOMMENDATION<br />
			</td>
		</tr>
        		<tr style={{border: '0px'}}>
			<td colSpan="12" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', textAlign: 'center'}}>
				As of ____________________<br />
				<br />
				<div style={{width: '3.5in'}}>
					<table style={{border: '1px solid black', borderCollapse: 'collapse', width: '3.5in', tableLayout: 'fixed'}}>
						<tr>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							Vacation Leave
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							Sick Leave
							</td>
						</tr>
						<tr>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							<i>Total Earned</i>
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
						</tr>
						<tr>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							<i>Less this application</i>
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
						</tr>
						<tr>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							<i>Balance</i>
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
							<td style={{height: '0.1in', fontSize: '75%', border: '1px solid black', textAlign: 'center'}}>
							&nbsp;
							</td>
						</tr>
					</table>
					<br />
					_________________________<br />
					(Authorized Officer)<br />
				</div>
			</td>
			<td colSpan="10" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				[ ] For approval<br /><br />
				[ ] For disapproval, due to _________________<br />
				______________________________________<br />
				______________________________________<br />
				______________________________________<br /><br />
				______________________________________<br />
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				(Immediate Supervisor)<br />
				______________________________________<br />
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				(Authorized Officer)
			</td>
		</tr>
		<tr style={{border: '1px solid black'}}>
			<td colSpan="1" rowspan="2" style={{height: '1.8in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				7.
			</td>
			<td colSpan="12" style={{height: '1.4in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				C APPROVED FOR:<br /><br />
				________ days with pay<br />
				________ days without pay<br />
				________ others (Specify)<br />
			</td>
			<td colSpan="1" rowspan="2" style={{height: '1.4in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				7.
			</td>
			<td colSpan="10" style={{height: '1.4in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
				D DISAPPROVED DUE TO:<br /><br />
				______________________________________<br />
				______________________________________<br />
				______________________________________<br />
			</td>
		</tr>
    </table>
    <div style={{position: 'relative', top: '-0.7in', textAlign: 'center', margin:'auto'}}>
	<font size="2">______________________________<br />
	(Authorized Official)</font>
	</div>
        </div>

    );
};

export default Leave;