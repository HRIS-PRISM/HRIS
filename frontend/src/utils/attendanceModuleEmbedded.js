import { useEffect, useRef } from 'react';

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

/**
 * Auto-seed + search for modules embedded in the DTR hub drawer.
 * Re-runs when employee/period changes or refreshEpoch bumps (e.g. after OT/Modification save).
 */
export const useEmbeddedModuleAutoSearch = ({
  embedded,
  initialContext,
  accessLoading = false,
  hasAccess = true,
  refreshEpoch = 0,
  setEmployeeNumber,
  setEmployeeDisplayName,
  setStartDate,
  setEndDate,
  setSelectedYear,
  setSelectedMonth,
  runSearchRef,
}) => {
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!embedded) return;
    if (accessLoading || hasAccess === false) return;
    if (!initialContext) return;

    const emp = String(initialContext.employeeNumber || '').trim();
    const sd = initialContext.startDate || '';
    const ed = initialContext.endDate || '';
    if (!emp || !sd || !ed) return;

    const key = `${emp}|${sd}|${ed}|r${refreshEpoch}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    seedEmbeddedModuleContext({
      initialContext,
      setEmployeeNumber,
      setEmployeeDisplayName,
      setStartDate,
      setEndDate,
      setSelectedYear,
      setSelectedMonth,
    });

    // Let React commit seeded state, then search with the latest handleSubmit.
    const t = setTimeout(() => {
      runSearchRef.current?.();
    }, 50);
    return () => clearTimeout(t);
  }, [
    embedded,
    initialContext,
    accessLoading,
    hasAccess,
    refreshEpoch,
    setEmployeeNumber,
    setEmployeeDisplayName,
    setStartDate,
    setEndDate,
    setSelectedYear,
    setSelectedMonth,
    runSearchRef,
  ]);
};

/** Parent DTR hub shows save confirmation — avoid duplicate success toasts in the drawer. */
export const notifyModuleSaveSuccess = (embedded, showSnackbar, message) => {
  if (embedded) return;
  showSnackbar(message, 'success');
};
