import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { payrollAuthHeaders } from "./regularPayrollFromAttendance";
import { getPayrollPeriodBounds } from "../components/LEAVE/EARNINGS/SalaryShortfallRegistry";

export function normalizePayrollDate(d) {
  if (d == null || d === "") return "";
  const s = String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return s.trim();
  const [, y, mo, day] = m;
  return `${y}-${String(parseInt(mo, 10)).padStart(2, "0")}-${String(parseInt(day, 10)).padStart(2, "0")}`;
}

export function employeeNumberKeyVariants(emp) {
  const t = String(emp ?? "").trim();
  if (!t) return [];
  const out = new Set([t]);
  const n = Number(t);
  if (Number.isFinite(n)) out.add(String(n));
  const noLeading = t.replace(/^0+/, "");
  if (noLeading && noLeading !== t) out.add(noLeading);
  if (noLeading && Number.isFinite(Number(noLeading))) out.add(String(Number(noLeading)));
  return [...out];
}

export function buildPayrollExistingPeriodKeySet(data) {
  const set = new Set();
  const list = Array.isArray(data) ? data : [];
  for (const item of list) {
    if (!item) continue;
    const sd = normalizePayrollDate(item.startDate);
    const ed = normalizePayrollDate(item.endDate);
    if (!sd || !ed) continue;
    for (const ek of employeeNumberKeyVariants(item.employeeNumber)) {
      set.add(`${ek}|${sd}|${ed}`);
    }
  }
  return set;
}

export async function fetchPayrollExistingPeriodKeySet() {
  const { data } = await axios.get(
    `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`,
    payrollAuthHeaders(),
  );
  return buildPayrollExistingPeriodKeySet(data);
}

/** True when employee + calendar month already exists in Payroll Processing. */
export function isEmployeePeriodInPayrollProcessing(employeeNumber, year, month, payrollKeySet) {
  const emp = String(employeeNumber ?? "").trim();
  if (!emp || !payrollKeySet?.size) return false;
  const py = parseInt(String(year), 10);
  const pm = parseInt(String(month), 10);
  const bounds = getPayrollPeriodBounds(
    { employeeNumber: emp, periodYear: py, periodMonth: pm },
    py,
    pm,
  );
  if (!bounds) return false;
  const sd = normalizePayrollDate(bounds.startDate);
  const ed = normalizePayrollDate(bounds.endDate);
  if (!sd || !ed) return false;
  for (const ek of employeeNumberKeyVariants(emp)) {
    if (payrollKeySet.has(`${ek}|${sd}|${ed}`)) return true;
  }
  return false;
}

export const PAYROLL_LOCK_TOOLTIP =
  "Already sent to payroll processing. Remove the entry from Payroll Processing to void.";
