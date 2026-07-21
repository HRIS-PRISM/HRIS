import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Subscribe to `attendanceChanged` and debounce-refetch attendance UIs.
 *
 * @param {() => void} refreshFn
 * @param {object} [options]
 * @param {string|number|null|undefined} [options.personId] — optional filter (employee # as string)
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 * @param {boolean} [options.requireDateRange] — if true, skip when startDate/endDate missing
 * @param {'strict'|'loose'} [options.matchMode='strict'] — strict: DTR-style (needs targets or bulk); loose: refresh when empty IDs too (summary-style)
 * @param {number} [options.debounceMs=150]
 */
export default function useAttendanceRealtimeRefresh(refreshFn, options = {}) {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(refreshFn);
  const optionsRef = useRef(options);

  useEffect(() => {
    refreshRef.current = refreshFn;
  });

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;

    const handleAttendanceChanged = (payload) => {
      if (payload?.action === 'dtr-printed') return;
      // Daily late/undertime upsert on load only updates DTR JSON — not device/calendar data.
      if (
        payload?.action === 'overall-daily-late-updated' ||
        payload?.action === 'overall-daily-late-created'
      ) {
        return;
      }
      const scope = payload?.scope;
      if (scope === 'suspensions' || scope === 'leaves' || scope === 'holiday') return;

      const o = optionsRef.current || {};
      if (o.requireDateRange && (!o.startDate || !o.endDate)) return;

      const changedIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID != null
          ? [payload.personID]
          : [];
      const isBulk = payload?.action === 'bulk-auto-sync';
      const matchMode = o.matchMode || 'strict';
      const pid =
        o.personId != null && o.personId !== '' ? String(o.personId) : '';

      if (matchMode === 'strict') {
        if (changedIDs.length === 0 && !isBulk) return;
        if (
          pid &&
          changedIDs.length > 0 &&
          !changedIDs.some((id) => String(id) === pid)
        ) {
          return;
        }
      } else {
        if (
          pid &&
          changedIDs.length > 0 &&
          !changedIDs.some((id) => String(id) === pid)
        ) {
          return;
        }
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (typeof refreshRef.current === 'function') refreshRef.current();
      }, o.debounceMs ?? 150);
    };

    socket.on('attendanceChanged', handleAttendanceChanged);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off('attendanceChanged', handleAttendanceChanged);
    };
  }, [socket, connected]);
}
