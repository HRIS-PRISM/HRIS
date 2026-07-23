-- DTR batch print performance indexes (run once).
-- If an index already exists, skip that statement or drop the old index first.

CREATE INDEX idx_attendancerecord_date_person ON attendancerecord (date, personID);
CREATE INDEX idx_attendancerecord_person_date ON attendancerecord (personID, date);

CREATE INDEX idx_officialtime_employee_dates ON officialtime (employeeID, startDate, endDate);

CREATE INDEX idx_person_table_agency_employee_num ON person_table (agencyEmployeeNum);

CREATE INDEX idx_attendancerecordinfo_personid ON attendancerecordinfo (PersonID);

CREATE INDEX idx_overall_attendance_period_person
  ON overall_attendance_record (startDate, endDate, personID);

CREATE INDEX idx_department_assignment_employee ON department_assignment (employeeNumber);

-- Supervisor DTR employee list (filter by department code)
CREATE INDEX idx_department_assignment_code_employee
  ON department_assignment (code, employeeNumber);

-- Approved leaves for DTR watermark (status + employee)
CREATE INDEX idx_leave_request_status_employee
  ON leave_request (status, employeeNumber);
