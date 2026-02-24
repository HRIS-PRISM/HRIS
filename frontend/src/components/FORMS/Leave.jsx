import React from "react";
import logo from './logo.png';

const Leave = () => {
	return (
		<div style= {{
			padding: "0.35in",
			width: "100%",
			maxWidth: "8.27in",
			fontFamily: "Arial, Helvetica, sans-serif",
			alignContent:'center',
			margin: 'auto',
			marginTop: '50px',
			height: "11.69in",
			backgroundColor: '#ffffff',
			marginBottom: '10%'
		}}> 
			{/*START DIV */}
		 	<div style={{width: "100%", display: "flex", height: "0.25in", alignItems: "center", marginBottom: "-10px"}}>
				<div style={{width: "90%"}}>
					<div>
						<font size="1.3">
							<b><i>Civil Service Form No. 6</i></b>
						</font>
					</div>
					<div style={{marginTop: "-5px"}}>
						<font size="1.3">
							<b><i>Revised 2020</i></b>
						</font>
					</div>
				</div>
				<div style={{
					marginTop: "15px",
					fontSize: "14px"
				}}>
					<b>ANNEX A</b>
				</div>
			</div>
			<div style={{width: '100%', margin: 'auto', display: "flex", alignItems: "center", height: "0.9in"}}>
				<div style={{position: 'relative', top: '10px', display: "flex", height: '0.9in', width: "2.6in"}}>
					<img src= {logo} alt="Logo" height="90px" style={{position: 'absolute', right: '-0.25in'}}/>
				</div>
				<div style={{position: 'relative', top: '10px', textAlign: 'center', width: "3.8in", background: '', fontSize: "13px", letterSpacing: '-0.5px',}}>
					<font>Republic of the Philippines<br />
					<b>EULOGIO "AMANG" RODRIGUEZ</b><br />
					<b>INSTITUTE OF SCIENCE AND TECHNOLOGY</b><br />
					Nagtahan, Sampaloc, Manila</font>
				</div>
				<div style={{display: 'flex', width: '2.6in', justifyContent: 'right'}}>
					<div style={{
						marginTop: '10px',
						marginRight: '30px',
						border: '1px dotted black',
						padding: '0.1in 0.2in',
						scale: '0.7',
						letterSpacing: '-0.5px',
						wordSpacing: '1px'}}> 
						<font size="2">Stamp of Date of Receipt</font>
					</div>
				</div>
			</div>
			<div style={{padding: '0.2in', width: '4in', textAlign: 'center', margin: 'auto', height: '0.2in', fontSize: "22px", fontWeight: "bold"}}>
				<font>APPLICATION FOR LEAVE</font>
			</div>
			<table style={{border: '1px solid black', borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed'}}>
				<tr style={{border: '1px solid black'}}>
					<td colSpan="1" style={{height: '0.45in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						1.
					</td>
					<td colSpan="8" style={{height: '0.45in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						OFFICE/DEPARTMENT
					</td>
					<td colSpan="3" style={{height: '0.45in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						2. NAME:
					</td>
					<td colSpan="4" style={{height: '0.45in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						(Last)
					</td>
					<td colSpan="4" style={{height: '0.45in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						(First)
					</td>
					<td colSpan="4" style={{height: '0.45in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						(Middle)
					</td>
				</tr>
				<tr style={{border: '1px solid black'}}>
					<td colSpan="1" style={{height: '0.35in', fontSize: '80%', border: '0px', paddingTop: "6px"}}>
						3.
					</td>
					<td colSpan="8" style={{height: '0.35in', fontSize: '80%', border: '0px', paddingTop: "6px"}}>
						DATE OF FILING:
					</td>
					<td colSpan="9" style={{height: '0.35in', fontSize: '80%', border: '0px', paddingTop: "6px"}}>
						4. POSITION:
					</td>
					<td colSpan="6" style={{height: '0.35in', fontSize: '80%', border: '0px', paddingTop: "6px"}}>
						5. SALARY:
					</td>
				</tr>
				<tr style={{border: '1px solid black'}}>
					<td colSpan="24" style={{height: '0.25in', fontSize: '80%', border: '0px', textAlign: 'center'}}>
						<div style={{borderTop: "1px solid black",}}></div>
						<div style={{margin: "6px 0px", fontWeight: "600"}}>6. DETAILS OF APPLICATION</div>
						<div style={{borderTop: "1px solid black"}}></div>
					</td>
				</tr>
				<tr style={{border: '0px'}}>
					<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						6.A
					</td>
					<td colSpan="12.5" style={{height: '0.1in', fontSize: '80%', borderRight: '1px solid black', verticalAlign: 'top', paddingTop: "6px"}}>
						TYPE OF LEAVE TO BE AVAILED OF
					</td>
					<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						6.B
					</td>
					<td colSpan="10.5" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						DETAILS OF LEAVE
					</td>
				</tr>
				<tr style={{border: '0px'}}>
					<td colSpan="12" style={{height: '0.4in', fontSize: '70%', letterSpacing: '-0.5px', borderRight: '1px solid black', verticalAlign: 'top', paddingTop: "0.5rem", lineHeight: "1rem"}}>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "12px"}}>
								Vacation Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px"}}>
								(Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Mandatory/Forced Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Sick Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Maternity Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(R.A. No. 11210/IRR issued by CSC, DOLE and SSS)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Paternity Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(R.A. No. 8187/CSC MC No. 71, s. 1998, as amended)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-2px", marginLeft: "3px", fontSize: "12px"}}>
								Special Privilege Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-2px", marginLeft: "3px", fontSize: "12px"}}>
								Solo Parent Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(R.A. No. 8972/CSC MC No. 8, s. 2004)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-2px", marginLeft: "3px", fontSize: "12px"}}>
								Study Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								10-Day VAWC Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(R.A. No. 9262/CSC MC No. 15, s. 2005)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Rehabilitation Privilege
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Special Emergency (Calamity) Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(R.A. No. 9710/CSC MC No. 25, s. 2010)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Special Leave Benefits for Women
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(CSC MC No. 2, s. 2012, as amended)
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center'}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{marginTop: "-1px", marginLeft: "3px", fontSize: "12px"}}>
								Adoption Leave
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px", marginLeft: "2px"}}>
								(R.A. No. 8552)
							</div>
						</div>
						<br />
						<i style={{fontSize: "12px"}}>Others:</i><br />
						<div style={{height: "10px"}}></div>
						__________________________________________<br />
					</td>
					<td colSpan="10" style={{height: '0.4in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
						
						<div style={{fontStyle: "italic", letterSpacing: "-0.3px", wordSpacing: "2px", fontSize: "11px", marginTop: "9px"}}>In case of Vacation/Special Privilege Leave:</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "4px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Within the Philippines
							</div>
							<div style={{ fontSize: "9px", marginTop: "1px"}}>
								______________________________________
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Abroad (Specify)
							</div>
							<div style={{ fontSize: "8px", marginTop: "1px"}}>
								________________________________________________
							</div>
						</div>
						<div style={{fontStyle: "italic", letterSpacing: "-0.3px", wordSpacing: "2px", fontSize: "11px", marginTop: "9px"}}>In case of Sick Leave:</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								In Hospital (Specify Illness)
							</div>
							<div style={{ fontSize: "8px", marginTop: "1px"}}>
								____________________________________
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Out Patient (Specify Illness)
							</div>
							<div style={{ fontSize: "8px", marginTop: "1px"}}>
								___________________________________
							</div>
						</div>
						<div style={{ fontSize: "8px", marginTop: "7px"}}>
							______________________________________________________________________
						</div>
						<div style={{fontStyle: "italic", letterSpacing: "-0.3px", wordSpacing: "2px", fontSize: "11px", marginTop: "9px"}}>In case of Special Leave Benefits for Women:</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "10px"}}>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								(Specify Illness)
							</div>
							<div style={{ fontSize: "8px", marginTop: "1px"}}>
								____________________________________________________
							</div>
						</div>
						<div style={{ fontSize: "8px", marginTop: "8px"}}>
							_____________________________________________________________________
						</div>
						<div style={{fontStyle: "italic", letterSpacing: "-0.3px", wordSpacing: "2px", fontSize: "11.5px", marginTop: "9px"}}>In case of Study Leave:</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Completion of Master's Degree
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								BAR/Board Examination Review
							</div>
						</div>
						<div style={{fontStyle: "italic", letterSpacing: "-0.3px", wordSpacing: "2px", fontSize: "11.5px", marginTop: "9px"}}>Other purpose:</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Monetization of Leave Credits
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px", marginBottom: "4px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Terminal Leave
							</div>
						</div>
					</td>
				</tr>
				<tr style={{borderTop: '1px solid black'}}>
					<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						6.C
					</td>
					<td colSpan="12.5" style={{height: '0.1in', fontSize: '80%', borderRight: '1px solid black', verticalAlign: 'top', paddingTop: "6px"}}>
						NUMBER OF WORKING DAYS APPLIED FOR
					</td>
					<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						6.D
					</td>
					<td colSpan="10.5" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						COMMUTATION
					</td>
				</tr>
				<tr style={{border: '0px'}}>
					<td colSpan="12" style={{height: '0.4in', fontSize: '70%', letterSpacing: '-0.5px', borderRight: '1px solid black', verticalAlign: 'top', paddingTop: "0.5rem", lineHeight: "1rem"}}>
						<div style={{ fontSize: "9px", marginTop: "-1px"}}>
							________________________________________________________________
						</div>
						<div style={{ fontSize: "12px", marginTop: "5px"}}>
							INCLUSIVE DATES
						</div>
						<div style={{ fontSize: "9px", marginTop: "8px", marginBottom: "17px"}}>
							________________________________________________________________
						</div>
					</td>
					<td colSpan="10" style={{height: '0.4in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Not Requested
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								Requested
							</div>
						</div>
						<div style={{ fontSize: "9px", marginTop: "8px"}}>
							__________________________________________________________________
						</div>
						<div style={{margin: "0px 2px", fontSize: "12px", textAlign: "center"}}>
							(Signature of Applicant)
						</div>
					</td>
				</tr>
				<tr style={{border: '1px solid black'}}>
					<td colSpan="24" style={{height: '0.25in', fontSize: '80%', border: '0px', textAlign: 'center'}}>
						<div style={{borderTop: "1px solid black",}}></div>
						<div style={{margin: "6px 0px", fontWeight: "600"}}>7. DETAILS OF ACTION ON APPLICATION</div>
						<div style={{borderTop: "1px solid black"}}></div>
					</td>
				</tr>
				<tr style={{border: '0px'}}>
					<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						7.A
					</td>
					<td colSpan="12.5" style={{height: '0.1in', fontSize: '80%', borderRight: '1px solid black', verticalAlign: 'top', paddingTop: "6px"}}>
						CERTIFICATION OF LEAVE CREDITS
					</td>
					<td colSpan="1" rowSpan="2" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						7.B
					</td>
					<td colSpan="10.5" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						RECOMMENDATION
					</td>
				</tr>
				<tr style={{border: '0px'}}>
					<td colSpan="12" style={{height: '0.1in', fontSize: '80%', borderRight: '1px solid black', verticalAlign: 'top', textAlign: 'center'}}>
						<div style={{fontStyle: "italic", letterSpacing: "-0.3px", wordSpacing: "2px", fontSize: "11px", marginTop: "7px"}}>As of _____________________________</div>
						<div style={{width: '3.5in', marginTop: "6px"}}>
							<table style={{border: '1px solid black', borderCollapse: 'collapse', width: '3.9in', tableLayout: 'fixed'}}>
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
						</div>
						<div style={{ fontSize: "9px", marginTop: "8px", marginLeft: "-20px"}}>
							___________________________________________________________________________
						</div>
						<div style={{margin: "0px 2px", fontSize: "11px", textAlign: "center", marginRight: "20px"}}>
							(Authorized Officer)
						</div>
					</td>
					<td colSpan="10" style={{height: '0.1in', fontSize: '80%', border: '0px', verticalAlign: 'top'}}>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								For approval
							</div>
						</div>
						<div style={{display: "flex", alignItems: 'center', marginLeft: "-4px", marginTop: "3px"}}>
							<div>
								<input type="checkbox" name="" id="" /> 
							</div>
							<div style={{margin: "0px 2px", fontSize: "11px"}}>
								For disapproval, due to _____________________________
							</div>
						</div>
						<div style={{marginLeft: "18px", marginTop: "-2px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<div style={{marginLeft: "18px", marginTop: "2px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<div style={{marginLeft: "18px", marginTop: "2px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<br />
						<div style={{marginLeft: "18px", marginTop: "5px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<div style={{margin: "0px 2px", fontSize: "11px", textAlign: "center", marginRight: "20px"}}>
							(Immediate Supervisor)
						</div>
						<div style={{marginLeft: "18px", marginTop: "15px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<div style={{margin: "0px 2px", fontSize: "11px", textAlign: "center", marginRight: "20px"}}>
							(Authorized Officer)
						</div>
					</td>
				</tr>
				<tr style={{borderTop: '1px solid black'}}>
					<td colSpan="1" rowspan="2" style={{ fontSize: '80%', border: '0px', paddingTop: "6px", verticalAlign: 'top'}}>
						7.C
					</td>
					<td colSpan="12" style={{ fontSize: '80%', paddingTop: "6px", border: '0px', verticalAlign: 'top'}}>
						APPROVED FOR:<br />
						<div style={{marginTop: "5px"}}></div>
						________ days with pay<br />
						________ days without pay<br />
						________ others (Specify)<br />
					</td>
					<td colSpan="1" rowspan="2" style={{ fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						7.D
					</td>
					<td colSpan="10" style={{fontSize: '80%', border: '0px', verticalAlign: 'top', paddingTop: "6px"}}>
						DISAPPROVED DUE TO:<br />
						<div style={{marginLeft: "18px", marginTop: "2px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<div style={{marginLeft: "18px", marginTop: "2px", fontSize: "11px"}}>
							________________________________________________
						</div>
						<div style={{marginLeft: "18px", marginTop: "2px", fontSize: "11px"}}>
							________________________________________________
						</div>
					</td>
				</tr>
				<tr style={{border: 'none'}}>
					<td colSpan="22" style={{textAlign: "center", fontSize: "11px"}}>
						<div style={{marginTop: "25px"}}></div>
						<font size="2">______________________________<br />
						(Authorized Official)</font>
						<div style={{marginTop: "5px"}}></div>
					</td>
				</tr>
			</table>

		</div>
	);
};

export default Leave;