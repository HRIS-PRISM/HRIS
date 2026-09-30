import axios from 'axios';
import API_BASE_URL from '../apiConfig';

export const payrollAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

/**
 * Full row from GET /employment-category/:employeeNumber (joins employment_type_config).
 * `quiet=1` skips the per-lookup "view" audit entry — these are background eligibility
 * checks, not someone opening the employee's record.
 */
export async function fetchEmploymentCategoryRow(empNumber, getAuthHeaders = payrollAuthHeaders) {
  try {
    const cfg = getAuthHeaders();
    const response = await axios.get(
      `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${encodeURIComponent(empNumber)}`,
      { ...cfg, params: { ...(cfg?.params || {}), quiet: 1 } },
    );
    return response.data;
  } catch (error) {
    if (error?.response?.status !== 404) console.error('Error fetching employment category:', error);
    return null;
  }
}

/** employeeNumber → category row (null when none), looked up in parallel, once per employee. */
export async function fetchEmploymentCategoryRows(empNumbers, getAuthHeaders = payrollAuthHeaders) {
  const unique = [...new Set((empNumbers || []).map((e) => String(e ?? '').trim()).filter(Boolean))];
  const rows = await Promise.all(unique.map((e) => fetchEmploymentCategoryRow(e, getAuthHeaders)));
  return new Map(unique.map((e, i) => [e, rows[i]]));
}

/** The one employee identifier used for payroll records everywhere. */
export const recordEmployeeNumber = (record) =>
  String(record?.personID ?? record?.employeeNumber ?? '').trim();

/** True when the employee has an employment category on file. */
export const hasEmploymentCategory = (row) =>
  Boolean(row) && row.employmentCategory != null && row.employmentCategory !== '';

/** "Job Order - Undergraduate" / "Non-Academic | Job Order - Graduate" / "JO …" */
const JOB_ORDER_NAME = /\bjob[\s-]*order\b/i;

export async function fetchEmploymentCategory(empNumber, getAuthHeaders = payrollAuthHeaders) {
  const row = await fetchEmploymentCategoryRow(empNumber, getAuthHeaders);
  if (!row || row.employmentCategory == null || row.employmentCategory === '') return null;
  const n = Number(row.employmentCategory);
  return Number.isFinite(n) ? n : null;
}

/**
 * Job Order employment category (paid through Job Order payroll, never Regular payroll).
 *
 * Decided by the category's NAME as set up in Employment Category, so every Job Order
 * type counts — "Job Order - Graduate", "Job Order - Undergraduate" and any added later —
 * not by a hard-coded id. Kept for older data: legacy ids 0–1, a group named "JO"/"J0",
 * and a custom category written as Job Order.
 */
export function isJobOrderEmploymentCategory(row) {
  if (!hasEmploymentCategory(row)) return false;
  const names = [row.typeName, row.parentGroup, row.categoryLabel, row.customCategory]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);
  if (names.some((n) => JOB_ORDER_NAME.test(n))) return true;
  const group = String(row.parentGroup ?? '').trim().toUpperCase();
  if (group === 'JO' || group === 'J0') return true;
  // Legacy numeric codes (before Manage Types) — only when no named type is attached
  if (!row.typeName) {
    const id = Number(row.employmentCategory);
    if (id === 0 || id === 1) return true;
  }
  return false;
}

/**
 * Split attendance records by payroll type: Job Order vs Regular, plus records whose
 * employee has no employment category (cannot go to either payroll).
 * @returns {Promise<{ jobOrder: object[], regular: object[], missingCategory: object[], categoryByEmployee: Map }>}
 */
export async function classifyRecordsForPayroll(attendanceData, getAuthHeaders = payrollAuthHeaders) {
  const rows = Array.isArray(attendanceData) ? attendanceData : [];
  const categoryByEmployee = await fetchEmploymentCategoryRows(rows.map(recordEmployeeNumber), getAuthHeaders);
  const jobOrder = [];
  const regular = [];
  const missingCategory = [];
  for (const record of rows) {
    const cat = categoryByEmployee.get(recordEmployeeNumber(record));
    if (!hasEmploymentCategory(cat)) missingCategory.push(record);
    else if (isJobOrderEmploymentCategory(cat)) jobOrder.push(record);
    else regular.push(record);
  }
  return { jobOrder, regular, missingCategory, categoryByEmployee };
}

/** "Non-Academic | Job Order - Graduate" style label for messages. */
export const employmentCategoryLabel = (row) => {
  if (!row) return 'no employment category';
  if (row.categoryLabel) return row.categoryLabel;
  if (row.parentGroup && row.typeName) return `${row.parentGroup} | ${row.typeName}`;
  return row.typeName || row.customCategory || 'no employment category';
};

/**
 * Regular payroll: any employee with an employment category except Job Order.
 * @returns {{ filteredRecords: object[], invalidRecords: { employeeNumber: string, reason: string }[] }}
 */
export async function filterRecordsForRegularPayroll(attendanceData, getAuthHeaders = payrollAuthHeaders) {
  const { jobOrder, regular, missingCategory, categoryByEmployee } =
    await classifyRecordsForPayroll(attendanceData, getAuthHeaders);
  const invalidRecords = [
    ...missingCategory.map((r) => ({
      employeeNumber: recordEmployeeNumber(r),
      reason: 'No employment category — set it in Employment Category first',
    })),
    ...jobOrder.map((r) => ({
      employeeNumber: recordEmployeeNumber(r),
      reason: `Job Order (${employmentCategoryLabel(categoryByEmployee.get(recordEmployeeNumber(r)))}) — use Job Order payroll`,
    })),
  ];
  return { filteredRecords: regular, invalidRecords };
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
