import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { buildOfficialTimeDayMap } from './officialTimeDayMap';

const BATCH_CHUNK = 200;
/** Parallel official-time batch chunk requests. */
const BATCH_CONCURRENCY = 4;

/**
 * Fetch official time schedules for many employees in few HTTP calls.
 * @returns {Promise<Record<string, Record<string, object>>>} byEmployee → day → schedule
 */
export async function fetchOfficialTimesBatch(
  employeeNumbers,
  periodStart,
  periodEnd,
  getAuthHeaders,
) {
  const ids = [
    ...new Set((employeeNumbers || []).map((n) => String(n).trim()).filter(Boolean)),
  ];
  if (!ids.length) return {};

  const timesMap = {};
  ids.forEach((id) => {
    timesMap[id] = {};
  });

  const chunks = [];
  for (let i = 0; i < ids.length; i += BATCH_CHUNK) {
    chunks.push(ids.slice(i, i + BATCH_CHUNK));
  }

  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    const group = chunks.slice(i, i + BATCH_CONCURRENCY);
    await Promise.all(
      group.map(async (chunk) => {
        try {
          const res = await axios.post(
            `${API_BASE_URL}/officialtimetable/batch`,
            {
              employeeNumbers: chunk,
              startDate: periodStart,
              endDate: periodEnd,
              skipAudit: true,
            },
            getAuthHeaders(),
          );
          const byEmployee = res.data?.byEmployee || {};
          Object.entries(byEmployee).forEach(([empID, rows]) => {
            timesMap[empID] = buildOfficialTimeDayMap(rows, periodStart, periodEnd);
          });
        } catch (err) {
          console.warn('fetchOfficialTimesBatch chunk failed:', err?.message || err);
          chunk.forEach((empID) => {
            if (!timesMap[empID]) timesMap[empID] = {};
          });
        }
      }),
    );
  }

  return timesMap;
}
