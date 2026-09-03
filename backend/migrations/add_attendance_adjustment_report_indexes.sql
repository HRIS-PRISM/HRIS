-- Attendance Adjustment Report performance indexes (run once).
-- Skip any statement if the index already exists.

-- Main report: dateFrom / dateTo / personID on attendance_adjustment_log
CREATE INDEX idx_aal_originaldate_person
  ON attendance_adjustment_log (originalDate, personID);

CREATE INDEX idx_aal_person_originaldate
  ON attendance_adjustment_log (personID, originalDate);

CREATE INDEX idx_aal_adjusted_at
  ON attendance_adjustment_log (adjustedAt);

CREATE INDEX idx_aal_adjustment_type
  ON attendance_adjustment_log (adjustmentType);

CREATE INDEX idx_aal_operation_type
  ON attendance_adjustment_log (operationType);

-- Device Insights: date-scoped scans on AttendanceRecordInfo
CREATE INDEX idx_ari_attendance_datetime
  ON AttendanceRecordInfo (AttendanceDateTime);

CREATE INDEX idx_ari_datetime_person
  ON AttendanceRecordInfo (AttendanceDateTime, PersonID);
