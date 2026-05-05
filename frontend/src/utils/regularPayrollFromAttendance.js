import axios from 'axios';
import API_BASE_URL from '../apiConfig';

export const payrollAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

/** Full row from GET /employment-category/:employeeNumber (joins employment_type_config). */
export async function fetchEmploymentCategoryRow(empNumber, getAuthHeaders = payrollAuthHeaders) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${empNumber}`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching employment category:', error);
    return null;
  }
}

export async function fetchEmploymentCategory(empNumber, getAuthHeaders = payrollAuthHeaders) {
  const row = await fetchEmploymentCategoryRow(empNumber, getAuthHeaders);
  if (!row || row.employmentCategory == null || row.employmentCategory === '') return null;
  const n = Number(row.employmentCategory);
  return Number.isFinite(n) ? n : null;
}

/**
 * Job Order (excluded from regular payroll): legacy numeric codes 0–1, or Manage Types group "J0".
 */
export function isJobOrderEmploymentCategory(row) {
  if (!row || row.employmentCategory == null || row.employmentCategory === '') return false;
  const id = Number(row.employmentCategory);
  if (id === 0 || id === 1) return true;
  const pg = String(row.parentGroup ?? '')
    .trim()
    .toUpperCase();
  return pg === 'J0';
}

/**
 * Regular payroll: any assigned employment_type_config id except Job Order (see isJobOrderEmploymentCategory).
 * @returns {{ filteredRecords: object[], invalidRecords: { employeeNumber: string, reason: string }[] }}
 */
export async function filterRecordsForRegularPayroll(attendanceData, getAuthHeaders = payrollAuthHeaders) {
  const filteredRecords = [];
  const invalidRecords = [];
  const rows = Array.isArray(attendanceData) ? attendanceData : [];
  for (const record of rows) {
    const empNum = record.personID || record.employeeNumber;
    const catRow = await fetchEmploymentCategoryRow(empNum, getAuthHeaders);
    if (!catRow || catRow.employmentCategory == null || catRow.employmentCategory === '') {
      invalidRecords.push({ employeeNumber: empNum, reason: 'Employment category not found in system' });
      continue;
    }
    if (isJobOrderEmploymentCategory(catRow)) {
      invalidRecords.push({ employeeNumber: empNum, reason: 'Job Order (JO)' });
      continue;
    }
    filteredRecords.push(record);
  }
  return { filteredRecords, invalidRecords };
}

/**
 * Duplicate check + POST to regular payroll processing.
 * @param {{ mergeAbsIntoExisting?: boolean }} [options] When true, skips the duplicate GET check so the server can
 *   insert a new row or merge additional `abs` into an existing payroll row (ABSTRACT incremental sends).
 * @returns {Promise<{ ok: true, newCount?: number } | { ok: false, code: string, message: string, status?: number }>}
 */
export async function postRegularPayrollSubmission(
  filteredRecords,
  getAuthHeaders = payrollAuthHeaders,
  options = {},
) {
  const { mergeAbsIntoExisting = false } = options;
  const payload = filteredRecords.map((record) => {
    const emp = record.personID ?? record.employeeNumber;
    const base = {
      employeeNumber: emp,
      startDate: record.startDate,
      endDate: record.endDate,
      overallRenderedOfficialTimeTardiness: record.overallRenderedOfficialTimeTardiness,
      department: record.code,
    };
    if (typeof record.name === 'string' && record.name.trim()) {
      base.name = record.name.trim();
    }
    if (record.abs != null && record.abs !== '') {
      const a = Number(record.abs);
      if (Number.isFinite(a)) base.abs = a;
    }
    return base;
  });

  const missingFields = payload.filter((r) => !r.employeeNumber || !r.startDate || !r.endDate);
  if (missingFields.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Required fields missing. Check Employee Number, Start Date, and End Date.',
    };
  }

  if (!mergeAbsIntoExisting) {
    for (const payloadRecord of payload) {
      const { employeeNumber, startDate, endDate } = payloadRecord;
      try {
        const response = await axios.get(`${API_BASE_URL}/PayrollRoute/payroll-with-remittance`, {
          ...getAuthHeaders(),
          params: { employeeNumber, startDate, endDate },
        });
        if (response.data.exists) {
          return {
            ok: false,
            code: 'DUPLICATE',
            message: `Payroll entry exists for Employee ${employeeNumber} (${startDate} to ${endDate}).`,
          };
        }
      } catch (duplicateCheckError) {
        console.error('Error checking for duplicates:', duplicateCheckError);
        return { ok: false, code: 'CHECK_FAILED', message: 'Unable to verify existing records.' };
      }
    }
  }

  try {
    const submitResponse = await axios.post(
      `${API_BASE_URL}/PayrollRoute/add-rendered-time`,
      payload,
      getAuthHeaders(),
    );
    if (submitResponse.status === 200 || submitResponse.status === 201) {
      if (submitResponse.data.newCount === 0) {
        return {
          ok: false,
          code: 'NONE_ADDED',
          message: 'All records already exist in payroll processing. No new entries were added.',
        };
      }
      return { ok: true, newCount: submitResponse.data.newCount };
    }
    return {
      ok: false,
      code: 'UNEXPECTED',
      message: `Unexpected response status: ${submitResponse.status}`,
    };
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message || error.response.data?.error || 'Server error occurred';
      return { ok: false, code: `HTTP_${status}`, message, status };
    }
    if (error.request) {
      return { ok: false, code: 'NETWORK', message: 'Connection failed. Check internet connection.' };
    }
    return { ok: false, code: 'UNKNOWN', message: 'An unexpected error occurred.' };
  }
}
