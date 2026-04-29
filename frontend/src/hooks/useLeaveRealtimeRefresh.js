import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Re-fetch leave-related screens when assignments or requests change (Socket.IO).
 *
 * @param {(payload?: unknown) => void} refreshFn
 * @param {number} [debounceMs=200]
 */
export default function useLeaveRealtimeRefresh(refreshFn, debounceMs = 200) {
  const { socket, connected } = useSocket();
  const refreshRef = useRef(refreshFn);

  useEffect(() => {
    refreshRef.current = refreshFn;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    let t = null;
    const handler = (payload) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (typeof refreshRef.current === 'function') refreshRef.current(payload);
      }, debounceMs);
    };
    socket.on('leaveAssignmentChanged', handler);
    socket.on('leaveRequestChanged', handler);
    return () => {
      if (t) clearTimeout(t);
      socket.off('leaveAssignmentChanged', handler);
      socket.off('leaveRequestChanged', handler);
    };
  }, [socket, connected, debounceMs]);
}
