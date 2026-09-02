import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Realtime raw device attendance rows from AttendanceRecordInfo.
 *
 * Events:
 * - attendanceRecordInfoInserted: emitted after new raw punches are detected
 * - attendanceRecordInfo:latest: response event when no ack callback is used
 *
 * @param {(payload: object) => void} onInserted
 * @param {object} options
 * @param {boolean} [options.fetchLatestOnConnect=true]
 * @param {number} [options.latestLimit=100]
 */
export default function useAttendanceRecordInfoSocket(onInserted, options = {}) {
  const { socket, connected } = useSocket();
  const onInsertedRef = useRef(onInserted);
  const optionsRef = useRef(options);

  useEffect(() => {
    onInsertedRef.current = onInserted;
  });

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!socket || !connected) return;

    const handleInserted = (payload) => {
      if (typeof onInsertedRef.current === 'function') {
        onInsertedRef.current(payload);
      }
    };

    socket.on('attendanceRecordInfoInserted', handleInserted);

    const opts = optionsRef.current || {};
    if (opts.fetchLatestOnConnect !== false) {
      socket.emit(
        'attendanceRecordInfo:getLatest',
        { limit: opts.latestLimit || 100 },
        (response) => {
          if (response?.ok && typeof onInsertedRef.current === 'function') {
            onInsertedRef.current({
              action: 'latest',
              records: response.records || [],
              count: response.count || 0,
              timestamp: response.timestamp,
            });
          }
        },
      );
    }

    return () => {
      socket.off('attendanceRecordInfoInserted', handleInserted);
    };
  }, [socket, connected]);
}
