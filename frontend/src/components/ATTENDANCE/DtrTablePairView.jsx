import React from 'react';
import { MODULE_TYPES } from '../../utils/halfDayReview';
import DTRTemplate from './DTRTemplate';

export function DtrTableContainer({ children }) {
  return (
    <div className="table-container">
      <div className="table-wrapper" style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Thin adapter around DTRTemplate for callers that still use the older
 * DtrTablePairView prop names.
 */
export default function DtrTablePairView({
  records,
  nameDisplay,
  officialTimesForUser = {},
  dtrType = 'regular',
  startDate,
  endDate,
  selectedYear,
  selectedMonth,
  showOfficialTimeOnDtr = false,
  holidays = [],
  suspensions = [],
  approvedLeaves = [],
  computedLateForEmployee = {},
  halfDayDatesSet = new Set(),
  halfDayReviewByDate = {},
  computationModuleType = MODULE_TYPES.NON_TEACHING,
  employeeScope = null,
  employmentCategory = null,
  employeeBranch,
  formatTime,
}) {
  return (
    <DTRTemplate
      employeeName={nameDisplay}
      records={records}
      officialTime={officialTimesForUser}
      showOfficialTimeOnDtr={showOfficialTimeOnDtr}
      startDate={startDate}
      endDate={endDate}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      holidays={holidays}
      suspensions={suspensions}
      approvedLeaves={approvedLeaves}
      computedLateByDate={computedLateForEmployee}
      suggestedHalfDayDatesSet={halfDayDatesSet}
      halfDayReviewByDate={halfDayReviewByDate}
      computationModuleType={computationModuleType}
      employeeScope={employeeScope}
      employmentCategory={employmentCategory}
      employeeBranch={employeeBranch}
      dtrType={dtrType}
      {...(formatTime ? { formatTime } : {})}
    />
  );
}
