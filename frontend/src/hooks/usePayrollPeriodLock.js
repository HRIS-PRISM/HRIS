import { useState, useCallback, useEffect } from "react";
import usePayrollRealtimeRefresh from "./usePayrollRealtimeRefresh";
import {
  fetchPayrollExistingPeriodKeySet,
  isEmployeePeriodInPayrollProcessing,
} from "../utils/payrollPeriodLock";

export default function usePayrollPeriodLock() {
  const [payrollKeySet, setPayrollKeySet] = useState(() => new Set());

  const refreshPayrollKeys = useCallback(async () => {
    try {
      const keys = await fetchPayrollExistingPeriodKeySet();
      setPayrollKeySet(keys);
    } catch {
      setPayrollKeySet(new Set());
    }
  }, []);

  useEffect(() => {
    refreshPayrollKeys();
  }, [refreshPayrollKeys]);

  usePayrollRealtimeRefresh(refreshPayrollKeys);

  // Re-fetch when returning to this tab (delete in Payroll Processing may not have fired socket).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshPayrollKeys();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshPayrollKeys]);

  const isPeriodLockedForPayroll = useCallback(
    (employeeNumber, year, month) =>
      isEmployeePeriodInPayrollProcessing(employeeNumber, year, month, payrollKeySet),
    [payrollKeySet],
  );

  return { payrollKeySet, isPeriodLockedForPayroll, refreshPayrollKeys };
}
