import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 250;

/**
 * Socket.IO listeners for the Earnings screen: leave balances, SC/CTO, attendance summary,
 * payroll cross-links, and salary shortfall registry. All handlers share one debounced refresh.
 */
export function useEarningsRealtimeRefresh({
  socket,
  connected,
  onRefresh,
  selectedEmployeeNumber,
}) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  const selectedRef = useRef(selectedEmployeeNumber);
  useEffect(() => {
    selectedRef.current = selectedEmployeeNumber;
  }, [selectedEmployeeNumber]);

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;

    const bump = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const fn = onRefreshRef.current;
        if (typeof fn === "function") fn();
      }, DEBOUNCE_MS);
    };

    const onLeave = () => bump();

    const matchesSelected = (payload) => {
      const sel =
        selectedRef.current != null
          ? String(selectedRef.current).trim()
          : "";
      if (!sel) return true;
      const raw = [
        ...(Array.isArray(payload?.personIDs) ? payload.personIDs : []),
        ...(payload?.personID != null ? [payload.personID] : []),
        ...(payload?.employeeNumber != null ? [payload.employeeNumber] : []),
        ...(payload?.employee_number != null ? [payload.employee_number] : []),
      ];
      const ids = new Set(
        raw.map((x) => String(x).trim()).filter(Boolean),
      );
      if (ids.size === 0) return true;
      return ids.has(sel);
    };

    const onAttendanceChanged = (payload) => {
      if (!matchesSelected(payload)) return;
      bump();
    };

    const onEarningsOrPayroll = (payload) => {
      if (!matchesSelected(payload)) return;
      bump();
    };

    socket.on("leaveAssignmentChanged", onLeave);
    socket.on("leaveRequestChanged", onLeave);
    socket.on("attendanceChanged", onAttendanceChanged);
    socket.on("payrollChanged", onEarningsOrPayroll);
    socket.on("earningsChanged", onEarningsOrPayroll);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off("leaveAssignmentChanged", onLeave);
      socket.off("leaveRequestChanged", onLeave);
      socket.off("attendanceChanged", onAttendanceChanged);
      socket.off("payrollChanged", onEarningsOrPayroll);
      socket.off("earningsChanged", onEarningsOrPayroll);
    };
  }, [socket, connected]);
}
