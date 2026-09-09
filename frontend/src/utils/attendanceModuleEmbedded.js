/** Shared layout + seed helpers for attendance modules embedded in DTR drawers. */
export const ATTENDANCE_EMBEDDED_ROOT_SX = {
  height: '100%',
  width: '100%',
  maxWidth: '100%',
  p: 1.5,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
  position: 'relative',
  left: 0,
  transform: 'none',
};

export const seedEmbeddedModuleContext = ({
  initialContext,
  setEmployeeNumber,
  setEmployeeDisplayName,
  setStartDate,
  setEndDate,
  setSelectedYear,
  setSelectedMonth,
}) => {
  if (!initialContext) return false;
  const emp = String(initialContext.employeeNumber || '').trim();
  if (!emp) return false;
  setEmployeeNumber(emp);
  setEmployeeDisplayName(
    initialContext.fullName ||
      initialContext.employeeName ||
      initialContext.employee?.fullName ||
      initialContext.employee?.name ||
      '',
  );
  if (initialContext.startDate) setStartDate(initialContext.startDate);
  if (initialContext.endDate) setEndDate(initialContext.endDate);
  if (initialContext.selectedYear != null) setSelectedYear(initialContext.selectedYear);
  if (initialContext.selectedMonth != null) setSelectedMonth(initialContext.selectedMonth);
  return true;
};

/** Parent DTR hub shows save confirmation — avoid duplicate success toasts in the drawer. */
export const notifyModuleSaveSuccess = (embedded, showSnackbar, message) => {
  if (embedded) return;
  showSnackbar(message, 'success');
};
