import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Tooltip,
  Snackbar,
  Checkbox,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  TablePagination,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Refresh as RefreshIcon,
  InfoOutlined as InfoOutlinedIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  ViewStream as AbstractTabIcon,
  Search as SearchIcon,
  FilterAltOff as FilterAltOffIcon,
  Download as DownloadIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import {
  payrollAuthHeaders,
  filterRecordsForRegularPayroll,
  postRegularPayrollSubmission,
} from "../../../utils/regularPayrollFromAttendance";
import {
  getPayrollPeriodBounds,
  registryContributionDays,
  fetchOverallAttendanceRow,
} from "./SalaryShortfallRegistry";
import { aggregateAttendanceResultsForAbstract, isAttendanceRowVoided } from "./aggregateAttendanceResultsForAbstract";
import AbstractVoidDialog from "./AbstractVoidDialog";

/** Leave codes (not SC/CTO/salary) charged by an employee row's active entries — what Void can roll back. */
/** Void rolls back a whole year: locked when any month of that year is in Payroll Processing. */
const employeeYearInPayroll = (payrollKeys, employeeNumber, year) => {
  const emp = String(employeeNumber ?? "").trim();
  const y = parseInt(year, 10);
  if (!emp || !Number.isFinite(y) || !payrollKeys?.size) return false;
  const variants = [...new Set([emp, emp.replace(/^0+/, "") || emp])];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    const key = `${y}-${mm}-01|${y}-${mm}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    if (variants.some((v) => payrollKeys.has(`${v}|${key}`))) return true;
  }
  return false;
};

const NOT_LEAVE_CODES = ["SC", "CTO", "NONE", "SALARY", "SALARY_DEDUCTION", "ABSENCE", "ABSENT", "TARDINESS", "HALF_DAY", "UNPAID", "—"];
const voidableLeaveCodes = (sourceRows) =>
  [...new Set(
    (sourceRows || [])
      // Only entries where leave credits were actually used (salary-charged rows carry labels
      // like "TARDINESS" in leave_used, which are not leave types).
      .filter((r) => !isAttendanceRowVoided(r) && Number(r.leave_hours_used) > 0)
      .map((r) => String(r.leave_used || "").trim().toUpperCase())
      .filter((c) => c && !NOT_LEAVE_CODES.includes(c)),
  )].sort();
import usePayrollRealtimeRefresh from "../../../hooks/usePayrollRealtimeRefresh";
import { downloadAbstractFormExcel } from "../../../utils/abstractTemplateExport";
import { excelExporterName } from "../../../utils/styledExcelExport";
import { getUserInfo } from "../../../utils/auth";

const WH = 8;

const MONTH_ABBR = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.12)",
  headerGrad: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider: "rgba(0,0,0,0.08)",
  surface: "#ffffff",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#888888",
  poppins: "'Poppins', sans-serif",
  salaryBg: "rgba(109,35,35,0.035)",
  salaryText: "#6d2323",
  salaryBorder: "rgba(109,35,35,0.10)",
  salaryChipBg: "rgba(109,35,35,0.08)",
  salaryChipColor: "#6d2323",
  salaryChipBorder: "rgba(109,35,35,0.22)",
  coveredBg: "rgba(46,125,50,0.04)",
  coveredText: "#1e4d20",
  coveredBorder: "rgba(46,125,50,0.10)",
  coveredChipBg: "rgba(46,125,50,0.08)",
  coveredChipColor: "#1e4d20",
  coveredChipBorder: "rgba(46,125,50,0.28)",
  // ── Manual "Add to Abstract" rows — distinct blue tint ──
  manualBg: "rgba(21,101,192,0.045)",
  manualText: "#0d47a1",
  manualBorder: "rgba(21,101,192,0.14)",
  manualChipBg: "rgba(21,101,192,0.09)",
  manualChipColor: "#0d47a1",
  manualChipBorder: "rgba(21,101,192,0.26)",
  sentChipBg: "rgba(21,101,192,0.08)",
  sentChipColor: "#1565c0",
  sentChipBorder: "rgba(21,101,192,0.22)",
  payrollDoneBg: "rgba(46,125,50,0.08)",
  payrollDoneColor: "#1b5e20",
  payrollDoneBorder: "rgba(27,94,32,0.25)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtCreatedAt(v) {
  if (v == null || v === "") return "—";
  let s = String(v);
  if (s.includes("T")) s = s.replace("T", " ").slice(0, 19);
  else if (s.length > 19) s = s.slice(0, 19);
  return s.trim() || "—";
}

function displayDaysFromMerged(row) {
  const deduct = toNum(row.unpaidHours) > 0;
  const h = deduct ? toNum(row.unpaidHours) : toNum(row.paidHoursTotal);
  return `${(h / WH).toFixed(3)}d`;
}

/** Card summary status (colour + words) for an Abstract employee row. */
function abstractStatusMeta(row, isManual) {
  if (row.allVoided) return { label: "Voided", color: "#9e9e9e" };
  if (isManual) return { label: "Manually staged", color: "#1565c0" };
  const s = String(row.resultStatus || "").toUpperCase();
  if (s === "FULLY_COVERED") return { label: "Fully covered", color: "#1e6b22" };
  if (s === "PARTIAL" || s === "PARTIALLY_COVERED") return { label: "Partially covered", color: "#9a6700" };
  if (s === "UNPAID") return { label: "Salary deduction", color: "#b3261e" };
  if (s === "MULTIPLE") return { label: "Mixed coverage", color: "#9a6700" };
  return { label: String(row.resultStatus || "—").replace(/_/g, " "), color: "#6b6b6b" };
}

/** ABSENT → Absent, TARDINESS → Tardiness, HALF_DAY → Half day. */
function prettySourceType(t) {
  const s = String(t || "").trim();
  if (!s) return "—";
  const w = s.replace(/_/g, " ").toLowerCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function displayDaysRawAttendanceRow(r) {
  const deduct = toNum(r.unpaid_hours) > 0;
  const h = deduct ? toNum(r.unpaid_hours) : toNum(r.paid_hours);
  return `${(h / WH).toFixed(3)}d`;
}

function normalizePayrollDate(d) {
  if (d == null || d === "") return "";
  const s = String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return s.trim();
  const [, y, mo, day] = m;
  return `${y}-${String(parseInt(mo, 10)).padStart(2, "0")}-${String(parseInt(day, 10)).padStart(2, "0")}`;
}

function employeeNumberKeyVariants(emp) {
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

function buildPayrollExistingPeriodKeySet(data) {
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

function abstractRowHasPayrollForPeriod(row, filterYear, filterMonth, payrollKeySet) {
  const b = getPayrollPeriodBounds(row, filterYear, filterMonth);
  if (!b) return false;
  const sd = normalizePayrollDate(b.startDate);
  const ed = normalizePayrollDate(b.endDate);
  if (!sd || !ed) return false;
  for (const ek of employeeNumberKeyVariants(row.employeeNumber)) {
    if (payrollKeySet.has(`${ek}|${sd}|${ed}`)) return true;
  }
  return false;
}

// Best-effort extraction of a row's period year/month, tolerant of whatever
// shape the row was staged with (explicit periodYear/periodMonth, plain
// year/month, or only a human-readable "period" label like "Jun 2026").
function getRowPeriodYearMonth(row) {
  if (!row) return { y: null, m: null };
  if (row.periodYear != null && row.periodMonth != null) {
    return { y: Number(row.periodYear), m: Number(row.periodMonth) };
  }
  if (row.year != null && row.month != null) {
    return { y: Number(row.year), m: Number(row.month) };
  }
  const s = String(row.period ?? "");
  const yearMatch = s.match(/(20\d{2}|19\d{2})/);
  const y = yearMatch ? Number(yearMatch[1]) : null;
  let m = null;
  for (let i = 0; i < MONTH_ABBR.length; i++) {
    if (s.toLowerCase().includes(MONTH_ABBR[i].toLowerCase())) {
      m = i + 1;
      break;
    }
  }
  return { y, m };
}

// ─── Shared header cell style ─────────────────────────────────────────────────

const ColHeader = ({ icon: Icon, label, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 2,
      py: 1.1,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "rgba(0,0,0,0.02)",
      flexShrink: 0,
    }}
  >
    {Icon && <Icon sx={{ fontSize: 13, color: T.accent }} />}
    <Typography
      sx={{
        fontSize: "0.65rem",
        fontWeight: 800,
        color: T.accent,
        fontFamily: T.poppins,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        flex: 1,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

const StatPill = ({ label, value, accent = false }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.6,
      px: 1.1,
      py: 0.45,
      borderRadius: "20px",
      bgcolor: accent ? alpha(T.accent, 0.08) : "rgba(0,0,0,0.04)",
      border: `1px solid ${accent ? T.accentBorder : "rgba(0,0,0,0.09)"}`,
    }}
  >
    <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: accent ? T.accent : T.faint, fontFamily: T.poppins, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: "0.58rem", fontWeight: 500, color: T.faint, fontFamily: T.poppins, lineHeight: 1 }}>
      {label}
    </Typography>
  </Box>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ABSTRACT_BATCH_KEY = "hris.abstractExcelYearBatch.v1";
const ABSTRACT_PREPARED_BY_KEY = "hris.abstractPreparedBy.v1";
const DEFAULT_PREPARED_TITLE = "In-Charge, Attendance Section";

function defaultPreparedName() {
  try {
    const saved = JSON.parse(localStorage.getItem(ABSTRACT_PREPARED_BY_KEY) || "null");
    if (saved?.name) return String(saved.name);
  } catch {
    /* ignore */
  }
  const info = getUserInfo() || {};
  const fromParts = [info.firstName, info.middleName, info.lastName, info.nameExtension]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  return fromParts || excelExporterName(info) || "";
}

function defaultPreparedTitle() {
  try {
    const saved = JSON.parse(localStorage.getItem(ABSTRACT_PREPARED_BY_KEY) || "null");
    if (saved?.title) return String(saved.title);
  } catch {
    /* ignore */
  }
  return DEFAULT_PREPARED_TITLE;
}

function readAbstractYearBatches() {
  try {
    if (typeof localStorage === "undefined") return {};
    const parsed = JSON.parse(localStorage.getItem(ABSTRACT_BATCH_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAbstractYearBatch(year, batch) {
  if (typeof localStorage === "undefined") return;
  const all = readAbstractYearBatches();
  all[String(year)] = batch;
  localStorage.setItem(ABSTRACT_BATCH_KEY, JSON.stringify(all));
}

function mergeAbstractYearBatch(year, exportMonth, payloads) {
  const y = Number(year);
  const current = Math.min(Math.max(Number(exportMonth) || 1, 1), 12);
  const touched = payloads
    .filter((item) => Number(item.year) === y)
    .map((item) => Math.min(Math.max(Number(item.month) || current, 1), 12));
  const minTouched = Math.min(current, ...touched);
  const maxTouched = Math.max(current, ...touched);
  const all = readAbstractYearBatches();
  let batch = all[String(y)];
  if (!batch || typeof batch !== "object") {
    batch = { startMonth: minTouched, throughMonth: maxTouched, months: {} };
  } else {
    batch.startMonth = Math.min(Number(batch.startMonth) || minTouched, minTouched);
    batch.throughMonth = Math.max(Number(batch.throughMonth) || maxTouched, maxTouched);
    batch.months = batch.months && typeof batch.months === "object" ? batch.months : {};
  }
  payloads.forEach((item) => {
    if (Number(item.year) !== y) return;
    batch.months[String(item.month)] = item;
  });
  writeAbstractYearBatch(y, batch);
  const months = [];
  for (let month = batch.startMonth; month <= batch.throughMonth; month += 1) {
    months.push(batch.months[String(month)] || { year: y, month, employees: [] });
  }
  return months;
}

/** Employee numbers compare without spaces or leading zeros ("020134507" = "20134507"). */
function normEmpNo(v) {
  const t = String(v ?? "").trim();
  return t.replace(/^0+(?=\d)/, "") || t;
}

/**
 * Departments (Department Table), who is assigned where (Department Assignment),
 * employment categories (Employment Category setup) and who is in each one.
 */
async function loadExportDirectory() {
  const [tableRes, assignRes, typeRes, catRes] = await Promise.allSettled([
    axios.get(`${API_BASE_URL}/api/department-table`, payrollAuthHeaders()),
    axios.get(`${API_BASE_URL}/api/department-assignment`, payrollAuthHeaders()),
    axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`, payrollAuthHeaders()),
    axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, payrollAuthHeaders()),
  ]);
  const ok = (r) => (r.status === "fulfilled" ? r.value.data : null);
  const departments = (Array.isArray(ok(tableRes)) ? ok(tableRes) : [])
    .filter((d) => d.code)
    .map((d) => ({ value: String(d.code).trim().toUpperCase(), code: String(d.code).trim(), description: String(d.description || "").trim() }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const deptByEmp = {};
  (Array.isArray(ok(assignRes)) ? ok(assignRes) : []).forEach((a) => {
    if (!a.employeeNumber || !a.code) return;
    const k = normEmpNo(a.employeeNumber);
    (deptByEmp[k] ||= new Set()).add(String(a.code).trim().toUpperCase());
  });
  const typeData = ok(typeRes);
  const flat = Array.isArray(typeData?.flat) ? typeData.flat : Array.isArray(typeData) ? typeData : [];
  const categories = flat
    .filter((t) => t.id != null && Number(t.isActive ?? 1) !== 0)
    .map((t) => ({ value: String(t.id), label: [t.parentGroup, t.typeName].filter(Boolean).join(" | ") }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const catByEmp = {};
  (Array.isArray(ok(catRes)) ? ok(catRes) : []).forEach((c) => {
    if (!c.employeeNumber || c.employmentCategory == null) return;
    catByEmp[normEmpNo(c.employeeNumber)] = String(c.employmentCategory);
  });
  const failed = [tableRes, assignRes, typeRes, catRes].some((r) => r.status !== "fulfilled");
  return { loaded: true, failed, departments, deptByEmp, categories, catByEmp };
}

function rowMatchesExportPeriod(row, year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return true;
  const period = getRowPeriodYearMonth(row);
  return Number(period.y || y) === y && Number(period.m || m) === m;
}

export function Abstract({
  employee,
  year,
  month,
  manualRows = [],
}) {
  const [sentToPayrollKeys, setSentToPayrollKeys] = useState(() => new Set());
  const [selectedPayrollKeys, setSelectedPayrollKeys] = useState(() => new Set());
  const [submittingPayroll, setSubmittingPayroll] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [auditExpandedKeys, setAuditExpandedKeys] = useState(() => new Set());
  const [payrollExistingPeriodKeys, setPayrollExistingPeriodKeys] = useState(() => new Set());
  const [refreshingKeys, setRefreshingKeys] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [preparedName, setPreparedName] = useState("");
  const [preparedTitle, setPreparedTitle] = useState(DEFAULT_PREPARED_TITLE);
  const [exportBy, setExportBy] = useState("department");
  const [exportSelection, setExportSelection] = useState("");
  const [exportDirectory, setExportDirectory] = useState({ loaded: false, failed: false, departments: [], deptByEmp: {}, categories: [], catByEmp: {} });
  const [exportScope, setExportScope] = useState("deductions");

  // ── Filter state: search by employee # / name, plus optional year & month ──
  // These are independent of the `employee`/`year`/`month` props passed down
  // from the parent — they let the abstract show ALL staged records (across
  // every employee/period ever added this session) and narrow that view down
  // on demand, rather than being locked to whatever was last selected upstream.
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  // ── Fetch persisted attendance_result records from database ──
  const [fetchedRows, setFetchedRows] = useState([]);
  /** Row being voided (opens AbstractVoidDialog) and a counter to reload rows after a void. */
  const [voidTarget, setVoidTarget] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingFetch, setLoadingFetch] = useState(false);

  useEffect(() => {
    setSentToPayrollKeys(new Set());
    setSelectedPayrollKeys(new Set());
    setAuditExpandedKeys(new Set());
  }, [employee?.employeeNumber, year, month]);

  // Fetch attendance_result records from database for the selected period
  useEffect(() => {
    if (!year || !month) {
      setFetchedRows([]);
      return;
    }

    const fetchAttendanceResultsFromDB = async () => {
      setLoadingFetch(true);
      try {
        const url = API_BASE_URL.includes('/api')
          ? `${API_BASE_URL}/attendance-result`
          : `${API_BASE_URL}/api/attendance-result`;
        const { data } = await axios.get(url, {
          params: { year: String(year), month: String(month) },
          ...payrollAuthHeaders(),
        });
        setFetchedRows(data.rows || []);
      } catch (err) {
        console.error("Failed to fetch attendance_result rows:", err);
        setFetchedRows([]);
      } finally {
        setLoadingFetch(false);
      }
    };

    fetchAttendanceResultsFromDB();
  }, [year, month, reloadKey]);

  const fetchPayrollExistingPeriodKeys = useCallback(async () => {
    setRefreshingKeys(true);
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`,
        payrollAuthHeaders(),
      );
      setPayrollExistingPeriodKeys(buildPayrollExistingPeriodKeySet(data));
    } catch {
      setPayrollExistingPeriodKeys(new Set());
    } finally {
      setRefreshingKeys(false);
    }
  }, []);

  usePayrollRealtimeRefresh(fetchPayrollExistingPeriodKeys);

  useEffect(() => {
    fetchPayrollExistingPeriodKeys();
  }, [fetchPayrollExistingPeriodKeys]);

  const toggleAuditExpand = useCallback((summaryKey) => {
    setAuditExpandedKeys((prev) => {
      const n = new Set(prev);
      if (n.has(summaryKey)) n.delete(summaryKey);
      else n.add(summaryKey);
      return n;
    });
  }, []);

  const filterSummary = useMemo(() => {
    const m = Math.min(Math.max(parseInt(month, 10) || 1, 1), 12);
    const mo = MONTH_ABBR[m - 1] || "";
    const y = year != null && year !== "" ? String(year) : "—";
    const empPart = employee?.employeeNumber
      ? `Employee #${employee.employeeNumber}`
      : "All employees";
    return `${mo} ${y} · ${empPart}`;
  }, [employee?.employeeNumber, year, month]);

  // Combine fetched attendance_result rows with manually added rows
  // Fetched rows are transformed/aggregated to match the structure of manualRows
  const allAbstractRows = useMemo(() => {
    const aggregated = aggregateAttendanceResultsForAbstract(fetchedRows, year, month);
    
    // Create a Set of keys from manualRows to avoid duplicates
    const manualKeys = new Set(manualRows.map(r => r.key));
    
    // Add aggregated rows that aren't already in manualRows
    const combined = [...manualRows];
    for (const row of aggregated) {
      if (!manualKeys.has(row.key)) {
        combined.push(row);
      }
    }
    
    return combined;
  }, [fetchedRows, manualRows, year, month]);

  // which fetches real attendance_result data (or stages a zero-deduction placeholder) and
  // passes the result down as `manualRows`. Abstract.js now also auto-fetches persisted
  // attendance_result rows on mount/period-change and merges them with manual rows.
  //
  // Combined rows include both manually added (this session) and database-persisted records.
  // The filter bar below (search / year / month) narrows that full set down;
  // leaving all three filters at their defaults shows everything staged so far.
  const hasActiveFilter = searchQuery.trim() !== "" || filterYear !== "all" || filterMonth !== "all";

  const displayRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q && filterYear === "all" && filterMonth === "all") return allAbstractRows;
    return allAbstractRows.filter((r) => {
      if (q) {
        const empStr = String(r.employeeNumber ?? "").toLowerCase();
        const nameStr = String(r.name ?? "").toLowerCase();
        if (!empStr.includes(q) && !nameStr.includes(q)) return false;
      }
      if (filterYear !== "all" || filterMonth !== "all") {
        const { y, m } = getRowPeriodYearMonth(r);
        if (filterYear !== "all" && String(y ?? "") !== String(filterYear)) return false;
        if (filterMonth !== "all" && String(m ?? "") !== String(filterMonth)) return false;
      }
      return true;
    });
  }, [allAbstractRows, searchQuery, filterYear, filterMonth]);

  // Distinct years present across every staged row, so the year dropdown only
  // ever offers choices that actually exist (plus whatever period the parent
  // currently has selected, so it's always available even before rows for it exist).
  const availableYears = useMemo(() => {
    const set = new Set();
    allAbstractRows.forEach((r) => {
      const { y } = getRowPeriodYearMonth(r);
      if (y) set.add(y);
    });
    if (year != null && year !== "") set.add(Number(year));
    return [...set].sort((a, b) => b - a);
  }, [allAbstractRows, year]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterYear("all");
    setFilterMonth("all");
  }, []);

  // Effective period used for payroll-bound lookups: respects an active
  // year/month filter, otherwise falls back to whatever the parent selected.
  const effectiveYear = filterYear !== "all" ? filterYear : year;
  const effectiveMonth = filterMonth !== "all" ? filterMonth : month;

  // ── Pagination (display only: filters, Select all, payroll send and export use every filtered row) ──
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterYear, filterMonth, year, month, employee?.employeeNumber]);
  useEffect(() => {
    const last = Math.max(0, Math.ceil(displayRows.length / rowsPerPage) - 1);
    if (page > last) setPage(last);
  }, [displayRows.length, rowsPerPage, page]);
  const pagedRows = useMemo(
    () => displayRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [displayRows, page, rowsPerPage],
  );

  const deductionRows = useMemo(() => displayRows.filter((r) => r.isDeduction), [displayRows]);
  const coveredRows   = useMemo(() => displayRows.filter((r) => !r.isDeduction), [displayRows]);
  const isEmpty = allAbstractRows.length === 0;
  const isFilteredEmpty = !isEmpty && displayRows.length === 0;

  const isRowAlreadySent = useCallback(
    (row) => sentToPayrollKeys.has(row.key),
    [sentToPayrollKeys],
  );
  // Works for manual rows too — they carry employeeNumber/periodYear/periodMonth
  // in the same shape getPayrollPeriodBounds() expects, so no special-casing needed.
  const isRowAlreadyInPayrollProcessing = useCallback(
    (row) => abstractRowHasPayrollForPeriod(row, effectiveYear, effectiveMonth, payrollExistingPeriodKeys),
    [payrollExistingPeriodKeys, effectiveYear, effectiveMonth],
  );

  const togglePayrollSelect = useCallback((rowKey) => {
    setSelectedPayrollKeys((prev) => {
      const n = new Set(prev);
      if (n.has(rowKey)) n.delete(rowKey);
      else n.add(rowKey);
      return n;
    });
  }, []);

  const eligiblePayrollRows = useMemo(
    () => displayRows.filter((r) => !isRowAlreadySent(r) && !isRowAlreadyInPayrollProcessing(r)),
    [displayRows, isRowAlreadySent, isRowAlreadyInPayrollProcessing],
  );

  useEffect(() => {
    setSelectedPayrollKeys((prev) => {
      const next = new Set();
      let changed = false;
      for (const k of prev) {
        const row = displayRows.find((r) => r.key === k);
        if (!row) { changed = true; continue; }
        if (isRowAlreadyInPayrollProcessing(row)) { changed = true; continue; }
        next.add(k);
      }
      return changed ? next : prev;
    });
  }, [displayRows, isRowAlreadyInPayrollProcessing]);

  const headerCheckboxState = useMemo(() => {
    const keys = eligiblePayrollRows.map((r) => r.key);
    const n = keys.length;
    const selected = keys.filter((k) => selectedPayrollKeys.has(k)).length;
    return { checked: n > 0 && selected === n, indeterminate: selected > 0 && selected < n };
  }, [eligiblePayrollRows, selectedPayrollKeys]);

  const toggleSelectAllEligible = useCallback(
    (checked) => {
      if (checked) setSelectedPayrollKeys(new Set(eligiblePayrollRows.map((r) => r.key)));
      else setSelectedPayrollKeys(new Set());
    },
    [eligiblePayrollRows],
  );

  const selectAllEligiblePayroll = useCallback(() => {
    setSelectedPayrollKeys(new Set(eligiblePayrollRows.map((r) => r.key)));
  }, [eligiblePayrollRows]);

  const clearPayrollSelection = useCallback(() => setSelectedPayrollKeys(new Set()), []);

  const selectedEligibleCount = useMemo(() => {
    let n = 0;
    for (const key of selectedPayrollKeys) {
      const row = displayRows.find((x) => x.key === key);
      if (row && !isRowAlreadySent(row) && !isRowAlreadyInPayrollProcessing(row)) n += 1;
    }
    return n;
  }, [selectedPayrollKeys, displayRows, isRowAlreadySent, isRowAlreadyInPayrollProcessing]);

  const handleSendToPayroll = useCallback(async () => {
    const picked = displayRows.filter(
      (r) =>
        selectedPayrollKeys.has(r.key) &&
        !isRowAlreadySent(r) &&
        !isRowAlreadyInPayrollProcessing(r),
    );
    if (picked.length === 0) {
      setSnackbar({ open: true, severity: "warning", message: "Select at least one row you have not already sent in this session." });
      return;
    }
    const byPeriod = new Map();
    for (const r of picked) {
      const b = getPayrollPeriodBounds(r, effectiveYear, effectiveMonth);
      if (!b) continue;
      const u = `${b.startDate}|${b.endDate}`;
      const emp = String(r.employeeNumber).trim();
      if (!byPeriod.has(emp)) byPeriod.set(emp, new Set());
      byPeriod.get(emp).add(u);
    }
    setSubmittingPayroll(true);
    try {
      const attendancePayloads = [];
      const missing = [];
      for (const [emp, periodSet] of byPeriod) {
        for (const periodStr of periodSet) {
          const [startDate, endDate] = periodStr.split("|");
          const oar = await fetchOverallAttendanceRow(emp, startDate, endDate, startDate, endDate);
          if (!oar) { missing.push(`${emp} (${startDate} → ${endDate})`); continue; }
          attendancePayloads.push(oar);
        }
      }
      if (missing.length > 0) {
        setSnackbar({ open: true, severity: "error", message: `No overall attendance record for: ${missing.join("; ")}` });
        return;
      }
      const uniquePayload = [];
      const seen = new Set();
      for (const p of attendancePayloads) {
        const k = `${p.personID}|${p.startDate}|${p.endDate}`;
        if (seen.has(k)) continue;
        seen.add(k);
        uniquePayload.push(p);
      }
      // Manual rows carry isDeduction:false, so registryContributionDays() returns 0
      // for them automatically — they simply contribute nothing to `abs` here, which
      // is exactly the "no deduction" behavior we want.
      for (const p of uniquePayload) {
        const emp = String(p.personID).trim();
        let sumAbs = 0;
        let nameFromRegistry = null;
        for (const r of picked) {
          if (String(r.employeeNumber).trim() !== emp) continue;
          const b = getPayrollPeriodBounds(r, effectiveYear, effectiveMonth);
          if (!b || b.startDate !== p.startDate || b.endDate !== p.endDate) continue;
          sumAbs += registryContributionDays(r);
          if (!nameFromRegistry && r.name) nameFromRegistry = r.name;
        }
        if (sumAbs > 0) p.abs = Number(sumAbs.toFixed(6));
        if (nameFromRegistry) p.name = nameFromRegistry;
      }
      const { filteredRecords, invalidRecords } = await filterRecordsForRegularPayroll(uniquePayload, payrollAuthHeaders);
      if (filteredRecords.length === 0) {
        setSnackbar({
          open: true,
          severity: "error",
          message: invalidRecords.length > 0
            ? invalidRecords.map((x) => `${x.employeeNumber}: ${x.reason}`).join("\n")
            : "No eligible employees for regular payroll (check employment category).",
        });
        return;
      }
      if (invalidRecords.length > 0) {
        setSnackbar({ open: true, severity: "warning", message: `Skipped ${invalidRecords.length} employee(s). Submitting ${filteredRecords.length} eligible record(s).` });
      }
      const result = await postRegularPayrollSubmission(filteredRecords, payrollAuthHeaders, { mergeAbsIntoExisting: true });
      if (!result.ok) {
        setSnackbar({ open: true, severity: "error", message: result.message || "Payroll submission failed." });
        return;
      }
      setSentToPayrollKeys((prev) => {
        const n = new Set(prev);
        for (const r of picked) n.add(r.key);
        return n;
      });
      setSnackbar({
        open: true,
        severity: "success",
        message: result.newCount != null ? `Payroll updated (${result.newCount} change(s)).` : "Submitted to payroll processing.",
      });
      setSelectedPayrollKeys(new Set());
    } catch (e) {
      setSnackbar({ open: true, severity: "error", message: e.response?.data?.error || e.message || "Request failed." });
    } finally {
      setSubmittingPayroll(false);
    }
  }, [displayRows, selectedPayrollKeys, isRowAlreadySent, isRowAlreadyInPayrollProcessing, effectiveYear, effectiveMonth]);

  const periodAbstractRows = useMemo(
    () => allAbstractRows.filter((row) => rowMatchesExportPeriod(row, effectiveYear, effectiveMonth)),
    [allAbstractRows, effectiveYear, effectiveMonth],
  );
  const exportPeriodLabel = useMemo(() => {
    const m = Math.min(Math.max(Number(effectiveMonth) || Number(month) || 1, 1), 12);
    const y = effectiveYear || year || "";
    return `${MONTH_ABBR[m - 1]} ${y}`.trim();
  }, [effectiveMonth, effectiveYear, month, year]);

  // Load departments / categories and their members each time the dialog opens.
  useEffect(() => {
    if (!exportDialogOpen) return undefined;
    let alive = true;
    loadExportDirectory()
      .then((dir) => alive && setExportDirectory(dir))
      .catch(() => alive && setExportDirectory((d) => ({ ...d, loaded: true, failed: true })));
    return () => { alive = false; };
  }, [exportDialogOpen]);

  /** True when the row's employee is assigned to that department code / category id. */
  const rowInSelection = useCallback((row, by, value) => {
    const k = normEmpNo(row.employeeNumber);
    if (by === "category") return exportDirectory.catByEmp[k] === value;
    return Boolean(exportDirectory.deptByEmp[k]?.has(value));
  }, [exportDirectory]);

  const exportDepartmentOptions = useMemo(
    () => exportDirectory.departments.map((d) => ({
      value: d.value,
      label: d.description ? `${d.code} — ${d.description}` : d.code,
      header: d.description || d.code,
      count: periodAbstractRows.filter((row) => rowInSelection(row, "department", d.value)).length,
    })),
    [exportDirectory, periodAbstractRows, rowInSelection],
  );
  const exportCategoryOptions = useMemo(
    () => exportDirectory.categories.map((c) => ({
      value: c.value,
      label: c.label,
      header: c.label,
      count: periodAbstractRows.filter((row) => rowInSelection(row, "category", c.value)).length,
    })),
    [exportDirectory, periodAbstractRows, rowInSelection],
  );
  const exportSelectionOptions = exportBy === "category" ? exportCategoryOptions : exportDepartmentOptions;
  const selectedExportOption = exportSelectionOptions.find((o) => o.value === exportSelection) || null;

  const rowsMatchingSelection = useMemo(() => {
    if (!exportSelection) return [];
    return periodAbstractRows.filter((row) => rowInSelection(row, exportBy, exportSelection));
  }, [periodAbstractRows, exportBy, exportSelection, rowInSelection]);

  const exportPreviewRows = useMemo(() => {
    const rows = exportScope === "deductions"
      ? rowsMatchingSelection.filter((row) => row.isDeduction)
      : rowsMatchingSelection;
    return [...rows].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }),
    );
  }, [rowsMatchingSelection, exportScope]);

  const openExportDialog = useCallback(() => {
    if (periodAbstractRows.length === 0) {
      setSnackbar({
        open: true,
        severity: "error",
        message: "No employees in this period to export.",
      });
      return;
    }
    setPreparedName(defaultPreparedName());
    setPreparedTitle(defaultPreparedTitle());
    setExportBy("department");
    setExportSelection("");
    setExportScope("deductions");
    setExportDialogOpen(true);
  }, [periodAbstractRows]);

  const handleExportExcel = useCallback(async () => {
    const selected = String(selectedExportOption?.header || "").trim();
    if (!exportSelection || !selected) {
      setSnackbar({
        open: true,
        severity: "error",
        message: exportBy === "category"
          ? "Select an employment category first."
          : "Select a department first.",
      });
      return;
    }
    const picked = exportPreviewRows;
    if (!picked.length) {
      setSnackbar({
        open: true,
        severity: "error",
        message: exportScope === "deductions"
          ? "No employees with deductions match that selection."
          : "No employees with records match that selection.",
      });
      return;
    }
    const preparedBy = {
      name: String(preparedName || "").trim() || defaultPreparedName(),
      title: String(preparedTitle || "").trim() || DEFAULT_PREPARED_TITLE,
    };
    if (!preparedBy.name) {
      setSnackbar({ open: true, severity: "error", message: "Enter who prepared this abstract." });
      return;
    }
    setExportingExcel(true);
    try {
      try {
        localStorage.setItem(ABSTRACT_PREPARED_BY_KEY, JSON.stringify(preparedBy));
      } catch {
        /* ignore */
      }
      const formName = (name) => {
        const text = String(name || "").trim();
        if (!text || text === "—") return "";
        const comma = text.indexOf(",");
        if (comma < 0) return text.toUpperCase();
        return `${text.slice(0, comma).toUpperCase()},${text.slice(comma + 1)}`;
      };
      const formatSourceDate = (value) => {
        const match = String(value || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return "";
        return `${Number(match[2])}/${Number(match[3])}/${match[1]}`;
      };
      const inclusiveDates = (row) => {
        const sources = Array.isArray(row.abstractSourceRows) ? row.abstractSourceRows : [];
        const remarks = [...new Set(
          sources
            .map((source) => String(source.remarks || "").trim())
            .filter((text) => text && text !== "—"),
        )];
        if (remarks.length) return remarks.join("\n");
        const dates = [...new Set(sources.map((source) => formatSourceDate(source.result_date)).filter(Boolean))];
        if (dates.length) return dates.join("; ");
        const tip = String(row.abstractRemarksTooltip || row.abstractRemarksShort || "").trim();
        return tip && tip !== "—" ? tip : "";
      };
      const splitHours = (hours) => {
        const minutes = Math.round(toNum(hours) * 60);
        const dayMinutes = WH * 60;
        return {
          dd: Math.floor(minutes / dayMinutes),
          hh: Math.floor((minutes % dayMinutes) / 60),
          mm: minutes % 60,
        };
      };

      // The letter header must be the department or category the user picked,
      // not the template default (GENERAL ADMINISTRATION).
      const subject = selected.toUpperCase();
      const byMonth = new Map();
      picked.forEach((row) => {
        const period = getRowPeriodYearMonth(row);
        const y = period.y || Number(year);
        const m = period.m || Number(month);
        if (!y || !m) return;
        const key = `${y}-${m}`;
        if (!byMonth.has(key)) byMonth.set(key, { year: y, month: m, employees: [] });
        byMonth.get(key).employees.push({
          name: formName(row.name),
          dates: inclusiveDates(row),
          officialTime: "",
          department: subject,
          subject,
          ...splitHours(row.unpaidHours),
        });
      });

      const currentMonths = [...byMonth.values()].sort((a, b) => a.year - b.year || a.month - b.month);
      if (!currentMonths.length) {
        setSnackbar({ open: true, severity: "error", message: "These rows have no month to export." });
        return;
      }
      const start = currentMonths[0];
      const end = currentMonths[currentMonths.length - 1];
      const fileLabel = start.month === end.month
        ? `${MONTH_ABBR[(end.month || 1) - 1]} ${end.year}`
        : `${MONTH_ABBR[(start.month || 1) - 1]}-${MONTH_ABBR[(end.month || 1) - 1]} ${end.year}`;
      const safeSubject = subject.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
      await downloadAbstractFormExcel({
        filename: `Non Teaching ABSTRACT ${fileLabel} - ${safeSubject}.xlsx`,
        months: currentMonths,
        preparedBy,
      });
      setExportDialogOpen(false);
      setSnackbar({
        open: true,
        severity: "success",
        message: `Abstract Excel downloaded (${picked.length} employee${picked.length === 1 ? "" : "s"}).`,
      });
    } catch (err) {
      console.error("Abstract Excel export failed:", err);
      setSnackbar({ open: true, severity: "error", message: "Failed to generate Excel export." });
    } finally {
      setExportingExcel(false);
    }
  }, [exportPreviewRows, exportBy, exportSelection, selectedExportOption, exportScope, month, year, preparedName, preparedTitle]);
  // 15 cols: checkbox + audit + 13 data cols

  const filterInputSx = {
    fontFamily: T.poppins,
    "& .MuiOutlinedInput-root": {
      fontSize: "0.75rem",
      fontFamily: T.poppins,
      bgcolor: "#fff",
      borderRadius: "8px",
      "& fieldset": { borderColor: T.accentBorder },
      "&:hover fieldset": { borderColor: T.accentMid },
      "&.Mui-focused fieldset": { borderColor: T.accent },
    },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: T.poppins }}>

      {/* ── Column header ── */}
      <ColHeader icon={AbstractTabIcon} label="Abstract · attendance_result">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {(allAbstractRows.length > 0 || loadingFetch) && (
            <>
              {loadingFetch && <CircularProgress size={16} sx={{ color: T.accent }} />}
              {!loadingFetch && (
                <>
                  <StatPill
                    value={hasActiveFilter ? `${displayRows.length}/${allAbstractRows.length}` : displayRows.length}
                    label="records"
                  />
                  <StatPill value={deductionRows.length} label="deductions" accent />
                  <StatPill value={coveredRows.length} label="covered" />
                </>
              )}
            </>
          )}
        </Box>
      </ColHeader>

      {/* ── Filter bar: search employee, filter by year/month, view all ── */}
      {allAbstractRows.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: `1px solid ${T.divider}`,
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <TextField
            size="small"
            placeholder="Search employee # or name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ ...filterInputSx, minWidth: 220, flex: "1 1 220px" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: T.faint }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ ...filterInputSx, minWidth: 110 }}>
            <Select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px" }}
            >
              <MenuItem value="all">All years</MenuItem>
              {availableYears.map((y) => (
                <MenuItem key={y} value={String(y)}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ ...filterInputSx, minWidth: 130 }}>
            <Select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              displayEmpty
              sx={{ borderRadius: "8px" }}
            >
              <MenuItem value="all">All months</MenuItem>
              {MONTH_ABBR.map((mo, idx) => (
                <MenuItem key={mo} value={String(idx + 1)}>{mo}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasActiveFilter && (
            <Button
              size="small"
              onClick={clearFilters}
              startIcon={<FilterAltOffIcon sx={{ fontSize: 14 }} />}
              sx={{
                fontSize: "0.72rem", fontWeight: 600, textTransform: "none",
                fontFamily: T.poppins, color: T.muted, borderRadius: "8px",
                px: 1.25, py: 0.5, border: `1px solid ${T.divider}`, bgcolor: "#fff",
                "&:hover": { bgcolor: "rgba(0,0,0,0.03)", borderColor: "rgba(0,0,0,0.15)" },
              }}
            >
              Reset filters
            </Button>
          )}
        </Box>
      )}

      {/* ── Toolbar ── */}
      <Box
        sx={{
          px: 2,
          py: 1.1,
          borderBottom: `1px solid ${T.divider}`,
          bgcolor: T.accentFaint,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {/* Legend */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {[
            { color: T.accent, label: "Salary deduction" },
            { color: "#2e7d32", label: "Covered by leave" },
            { color: "#1565c0", label: "Manually added" },
          ].map(({ color, label }) => (
            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.55 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins, fontWeight: 600 }}>
                {label}
              </Typography>
            </Box>
          ))}
          <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>
            {filterSummary}
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {displayRows.length > 0 && (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={
                  submittingPayroll
                    ? <CircularProgress size={11} sx={{ color: "#fff" }} />
                    : <PaymentIcon sx={{ fontSize: 14 }} />
                }
                onClick={handleSendToPayroll}
                disabled={submittingPayroll || selectedEligibleCount === 0}
                sx={{
                  fontSize: "0.72rem", fontWeight: 700, textTransform: "none",
                  fontFamily: T.poppins, bgcolor: T.accent, borderRadius: "8px",
                  px: 1.5, py: 0.5, boxShadow: "none", transition: "all 0.18s ease",
                  "&:hover": { bgcolor: T.accentDark, boxShadow: "none", transform: "translateY(-1px)" },
                  "&:active": { transform: "translateY(0)" },
                  "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.35), color: "#fff" },
                }}
              >
                {submittingPayroll ? "Submitting…" : `Send to payroll (${selectedEligibleCount})`}
              </Button>

              <Button
                size="small"
                onClick={selectAllEligiblePayroll}
                disabled={eligiblePayrollRows.length === 0}
                sx={{
                  fontSize: "0.72rem", fontWeight: 600, textTransform: "none",
                  fontFamily: T.poppins, color: T.accent, borderRadius: "8px",
                  px: 1.25, py: 0.5, border: `1px solid ${T.accentBorder}`, bgcolor: "#fff",
                  "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                  "&.Mui-disabled": { color: T.faint, borderColor: T.divider },
                }}
              >
                Select all
              </Button>

              <Button
                size="small"
                onClick={clearPayrollSelection}
                disabled={selectedPayrollKeys.size === 0}
                sx={{
                  fontSize: "0.72rem", fontWeight: 600, textTransform: "none",
                  fontFamily: T.poppins, color: T.muted, borderRadius: "8px",
                  px: 1.25, py: 0.5, border: `1px solid ${T.divider}`, bgcolor: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.03)", borderColor: "rgba(0,0,0,0.15)" },
                  "&.Mui-disabled": { color: T.faint, borderColor: T.divider },
                }}
              >
                Clear
              </Button>
            </>
          )}

          <Tooltip title={periodAbstractRows.length === 0 ? "No employees in this period to export" : "Export this month by department or employment category"}>
            <span>
              <Button
                size="small"
                startIcon={
                  exportingExcel
                    ? <CircularProgress size={11} sx={{ color: "#fff" }} />
                    : <DownloadIcon sx={{ fontSize: 14 }} />
                }
                onClick={openExportDialog}
                disabled={exportingExcel || periodAbstractRows.length === 0}
                sx={{
                  fontSize: "0.72rem", fontWeight: 700, textTransform: "none",
                  fontFamily: T.poppins, color: "#fff", borderRadius: "8px",
                  px: 1.25, py: 0.5, bgcolor: T.accent, boxShadow: "none",
                  "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
                  "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.35), color: "#fff" },
                }}
              >
                Excel
              </Button>
            </span>
          </Tooltip>

          <Button
            size="small"
            startIcon={
              refreshingKeys
                ? <CircularProgress size={11} sx={{ color: T.accent }} />
                : <RefreshIcon sx={{ fontSize: 14 }} />
            }
            onClick={() => { fetchPayrollExistingPeriodKeys(); }}
            disabled={refreshingKeys}
            sx={{
              fontSize: "0.72rem", fontWeight: 600, textTransform: "none",
              fontFamily: T.poppins, color: T.muted, borderRadius: "8px",
              px: 1.25, py: 0.5, border: `1px solid ${T.divider}`, bgcolor: "#fff",
              "&:hover": { bgcolor: "rgba(0,0,0,0.03)", color: T.accent, borderColor: T.accentBorder },
              "&.Mui-disabled": { color: T.faint },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* ── Alerts ── */}

      {isEmpty && (
        <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
          <Alert
            severity="info"
            icon={<InfoOutlinedIcon sx={{ fontSize: 20 }} />}
            sx={{
              alignItems: "flex-start", fontFamily: T.poppins,
              borderRadius: 1.75, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: T.accent, fontFamily: T.poppins, mb: 0.3 }}>
              No attendance_result records for this period
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: T.muted, lineHeight: 1.55, fontFamily: T.poppins }}>
              Nothing in <strong>attendance_result</strong> for <strong>{filterSummary}</strong>. 
              Use the Salary Shortfall tab for the full merged registry. The ABSTRACT tab automatically 
              shows all persisted <strong>attendance_result</strong> records once they are created.
            </Typography>
          </Alert>
        </Box>
      )}

      {isFilteredEmpty && (
        <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
          <Alert
            severity="info"
            icon={<InfoOutlinedIcon sx={{ fontSize: 20 }} />}
            sx={{
              alignItems: "center", fontFamily: T.poppins,
              borderRadius: 1.75, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint,
            }}
            action={
              <Button size="small" onClick={clearFilters} sx={{ fontFamily: T.poppins, textTransform: "none", fontWeight: 700, color: T.accent }}>
                Reset filters
              </Button>
            }
          >
            <Typography sx={{ fontSize: "0.75rem", color: T.muted, fontFamily: T.poppins }}>
              No records match your search / year / month filter. {allAbstractRows.length} record(s) found in total.
            </Typography>
          </Alert>
        </Box>
      )}

      {/* ── Employee cards ── */}
      <Box sx={{ flex: 1, overflow: "hidden", px: 2, pt: 1.5, pb: 2, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {displayRows.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, pb: 1, flexShrink: 0 }}>
            <Tooltip title="Select all eligible rows">
              <span>
                <Checkbox
                  size="small"
                  checked={headerCheckboxState.checked}
                  indeterminate={headerCheckboxState.indeterminate}
                  onChange={(e) => toggleSelectAllEligible(e.target.checked)}
                  disabled={eligiblePayrollRows.length === 0}
                  sx={{ p: 0, color: alpha(T.accent, 0.4), "&.Mui-checked": { color: T.accent }, "&.MuiCheckbox-indeterminate": { color: T.accent }, "&.Mui-disabled": { color: "rgba(0,0,0,0.2)" } }}
                />
              </span>
            </Tooltip>
            <Typography sx={{ fontSize: "0.74rem", color: T.muted, fontFamily: T.poppins }}>
              Select all eligible · {displayRows.length} employee row{displayRows.length === 1 ? "" : "s"}
            </Typography>
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.25, pr: 0.5 }}>
          {pagedRows.map((merged) => {
            const rowKey    = merged.key;
            const isDed     = merged.isDeduction;
            const isManual  = !!merged.isManual;
            const sent      = sentToPayrollKeys.has(rowKey);
            const payrollDone = isRowAlreadyInPayrollProcessing(merged);
            const open      = auditExpandedKeys.has(rowKey);
            const sourceRows = Array.isArray(merged.abstractSourceRows) ? merged.abstractSourceRows : [];
            const origH   = toNum(merged.originalHours);
            const leaveH  = toNum(merged.leaveHoursUsed);
            const unpaidH = toNum(merged.unpaidHours);
            const status  = abstractStatusMeta(merged, isManual);
            const bigColor = merged.allVoided ? T.faint : isManual ? "#0d47a1" : isDed ? T.accent : "#1e6b22";

            const voidCodes = voidableLeaveCodes(sourceRows);
            const voidReason = isManual
              ? "Manually staged row — nothing to void."
              : payrollDone || employeeYearInPayroll(payrollExistingPeriodKeys, merged.employeeNumber, merged.periodYear)
                ? "A month of this year is already in Payroll Processing, so it cannot be voided. Remove it there first."
                : voidCodes.length === 0
                  ? "No active leave deductions to void (SC/CTO are voided from their own records)."
                  : "";

            const metricRows = [
              { label: "Original", h: origH },
              { label: "Leave-covered", h: leaveH },
              { label: "Unpaid", h: unpaidH, strong: unpaidH > 0 },
            ];
            const numCell = { fontFamily: T.poppins, fontSize: "0.8rem", color: T.text, textAlign: "right", fontVariantNumeric: "tabular-nums", py: 1.1, borderBottom: `1px solid ${T.divider}` };
            const lblCell = { fontFamily: T.poppins, fontSize: "0.8rem", color: T.muted, py: 1.1, borderBottom: `1px solid ${T.divider}` };
            const headCell = { fontFamily: T.poppins, fontSize: "0.62rem", fontWeight: 700, color: `${T.muted} !important`, bgcolor: "transparent !important", letterSpacing: "0.06em", textTransform: "uppercase", py: 0.9, borderBottom: `1px solid ${T.divider}` };

            return (
              <Box key={rowKey} sx={{ border: `1px solid ${T.divider}`, borderRadius: "12px", bgcolor: "#fff", flexShrink: 0, overflow: "hidden", opacity: merged.allVoided ? 0.75 : 1 }}>
                {/* Summary */}
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => toggleAuditExpand(rowKey)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAuditExpand(rowKey); } }}
                  sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, px: 2, py: 1.5, cursor: "pointer", "&:hover": { bgcolor: "rgba(0,0,0,0.015)" }, "&:focus-visible": { outline: `2px solid ${T.accent}`, outlineOffset: -2 } }}
                >
                  <Box onClick={(e) => e.stopPropagation()} sx={{ pt: 0.25, flexShrink: 0 }}>
                    {sent ? (
                      <Tooltip title="Sent to payroll this session.">
                        <Chip label="✓ Sent" size="small" sx={{ height: 20, fontSize: "0.6rem", fontWeight: 700, bgcolor: T.sentChipBg, color: T.sentChipColor, border: `1px solid ${T.sentChipBorder}`, fontFamily: T.poppins }} />
                      </Tooltip>
                    ) : payrollDone ? (
                      <Tooltip title="Already in Payroll Processing for this period. Remove it there to re-send.">
                        <Chip label="In payroll" size="small" sx={{ height: 20, fontSize: "0.6rem", fontWeight: 700, bgcolor: T.payrollDoneBg, color: T.payrollDoneColor, border: `1px solid ${T.payrollDoneBorder}`, fontFamily: T.poppins }} />
                      </Tooltip>
                    ) : (
                      <Checkbox
                        size="small"
                        checked={selectedPayrollKeys.has(rowKey)}
                        onChange={() => togglePayrollSelect(rowKey)}
                        inputProps={{ "aria-label": `Select ${merged.name || merged.employeeNumber}` }}
                        sx={{ p: 0, color: alpha(T.accent, 0.35), "&.Mui-checked": { color: T.accent } }}
                      />
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }} noWrap>
                      {merged.name ?? "—"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>
                      #{merged.employeeNumber ?? "—"}{merged.period ? ` · ${merged.period}` : ""}{merged.createdAt ? ` · ${fmtCreatedAt(merged.createdAt)}` : ""}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 0.75, rowGap: 0.25, mt: 0.75 }}>
                      <Typography component="span" sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>
                        {merged.leaveCode ?? "—"}
                      </Typography>
                      <Typography component="span" sx={{ fontSize: "0.78rem", color: T.faint }}>·</Typography>
                      <Typography component="span" sx={{ fontSize: "0.78rem", fontWeight: 600, color: status.color, fontFamily: T.poppins }}>
                        {status.label}
                      </Typography>
                      {!merged.allVoided && (
                        <>
                          <Typography component="span" sx={{ fontSize: "0.78rem", color: T.faint }}>·</Typography>
                          <Typography component="span" sx={{ fontSize: "0.78rem", fontWeight: 600, fontFamily: T.poppins, color: unpaidH > 0 ? "#b3261e" : "#1e6b22" }}>
                            {unpaidH > 0 ? `${unpaidH.toFixed(3)} hrs unpaid` : "no salary deduction"}
                          </Typography>
                        </>
                      )}
                      {!merged.allVoided && merged.voidedCount > 0 && (
                        <Tooltip title={`${merged.voidedCount} entr${merged.voidedCount === 1 ? "y was" : "ies were"} voided and ${merged.voidedCount === 1 ? "is" : "are"} not counted.`}>
                          <Box component="span" sx={{ px: 0.75, borderRadius: "5px", bgcolor: "rgba(0,0,0,0.06)", fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>
                            {merged.voidedCount} voided
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    <Tooltip title={voidReason || "Roll back this employee's deductions and earnings for the leave (same as Leave Assignment → Void)."}>
                      <span onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="small"
                          disabled={Boolean(voidReason)}
                          onClick={() =>
                            setVoidTarget({
                              employeeNumber: merged.employeeNumber,
                              name: merged.name,
                              year: merged.periodYear,
                              leaveCodes: voidCodes,
                              hasScCto: sourceRows.some((r) => !isAttendanceRowVoided(r) && ["SC", "CTO"].includes(String(r.leave_used || "").toUpperCase())),
                            })
                          }
                          startIcon={<BlockIcon sx={{ fontSize: "13px !important" }} />}
                          sx={{ minWidth: 0, px: 1, py: 0.2, fontSize: "0.66rem", fontWeight: 700, textTransform: "none", fontFamily: T.poppins, color: "#c62828", "&:hover": { bgcolor: "rgba(198,40,40,0.06)" } }}
                        >
                          Void
                        </Button>
                      </span>
                    </Tooltip>
                    <Box sx={{ textAlign: "right", minWidth: 64 }}>
                      <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: bigColor, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                        {displayDaysFromMerged(merged)}
                      </Typography>
                      <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>
                        {isDed ? "unpaid" : "covered"}
                      </Typography>
                    </Box>
                    <ExpandMoreIcon sx={{ fontSize: 18, color: T.faint, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }} />
                  </Box>
                </Box>

                {/* Details */}
                {open && (
                  <Box sx={{ borderTop: `1px dashed ${T.divider}`, px: { xs: 2, md: 4.5 }, pt: 1.25, pb: 1.75 }}>
                    <Table size="small" sx={{ tableLayout: "fixed", mb: sourceRows.length ? 1.5 : 0 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...headCell, width: "50%" }}>Metric</TableCell>
                          <TableCell sx={{ ...headCell, textAlign: "right" }}>Hours</TableCell>
                          <TableCell sx={{ ...headCell, textAlign: "right" }}>Days</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metricRows.map((m) => (
                          <TableRow key={m.label}>
                            <TableCell sx={lblCell}>{m.label}</TableCell>
                            <TableCell sx={{ ...numCell, fontWeight: m.strong ? 700 : 400, color: m.strong ? "#b3261e" : T.text }}>{m.h.toFixed(3)}</TableCell>
                            <TableCell sx={{ ...numCell, fontWeight: m.strong ? 700 : 400, color: m.strong ? "#b3261e" : T.text }}>{(m.h / WH).toFixed(3)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {sourceRows.length > 0 ? (
                      <>
                        <Typography sx={{ fontSize: "0.66rem", fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: T.poppins, mb: 0.5 }}>
                          Source events
                        </Typography>
                        <Table size="small" sx={{ tableLayout: "fixed" }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ ...headCell, width: "25%" }}>Type</TableCell>
                              <TableCell sx={{ ...headCell, width: "16%" }}>Leave</TableCell>
                              <TableCell sx={{ ...headCell, width: "22%" }}>Date</TableCell>
                              <TableCell sx={{ ...headCell, textAlign: "right" }}>Days</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sourceRows.map((ar, i) => {
                              const voided = isAttendanceRowVoided(ar);
                              const rmk = ar.remarks != null && String(ar.remarks).trim() !== "" ? String(ar.remarks) : "";
                              return (
                                <TableRow key={`${rowKey}-ev-${ar.id ?? i}-${i}`} sx={{ "&:last-child td": { borderBottom: "none" } }}>
                                  <TableCell sx={{ ...lblCell, color: voided ? T.faint : T.text }}>{prettySourceType(ar.source_type)}</TableCell>
                                  <TableCell sx={{ ...lblCell, color: voided ? T.faint : T.text }}>{ar.leave_used ?? "—"}</TableCell>
                                  <TableCell sx={{ ...lblCell, color: voided ? T.faint : T.text }}>{ar.result_date ? String(ar.result_date).slice(0, 10) : "—"}</TableCell>
                                  <TableCell sx={{ ...numCell, verticalAlign: "top" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.75 }}>
                                      {voided && (
                                        <Tooltip title={ar.source_state === "missing" ? "Voided — the deduction this entry came from no longer exists." : "Voided — the deduction or earning this entry came from was voided."}>
                                          <Box component="span" sx={{ px: 0.75, borderRadius: "5px", bgcolor: "rgba(0,0,0,0.06)", fontSize: "0.6rem", fontWeight: 700, color: T.muted }}>Voided</Box>
                                        </Tooltip>
                                      )}
                                      <Box component="span" sx={{ textDecoration: voided ? "line-through" : "none", color: voided ? T.faint : T.text }}>
                                        {displayDaysRawAttendanceRow(ar).replace(/d$/, "")}
                                      </Box>
                                    </Box>
                                    {rmk && (
                                      <Tooltip title={rmk} placement="top-end">
                                        <Typography sx={{ fontSize: "0.66rem", color: T.faint, fontFamily: T.poppins, mt: 0.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {rmk}
                                        </Typography>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: "0.74rem", color: T.faint, fontFamily: T.poppins }}>
                        Manually staged — no attendance source events.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
        {displayRows.length > 0 && (
          <TablePagination
            component="div"
            count={displayRows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Rows per page:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count} employee rows`}
            sx={{
              flexShrink: 0,
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiInputBase-root": { fontFamily: T.poppins, fontSize: "0.74rem" },
            }}
          />
        )}
      </Box>

      {/* ── Export filters + prepared by ── */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => { if (!exportingExcel) setExportDialogOpen(false); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px" } }}
      >
        <DialogTitle
          sx={{
            fontFamily: T.poppins,
            fontWeight: 700,
            fontSize: "0.95rem",
            color: T.accent,
            pb: 0.5,
          }}
        >
          Export Abstract
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontFamily: T.poppins, mb: 1.5, lineHeight: 1.5 }}>
            {exportPeriodLabel} abstract. Choose one department or one employment category. The letter header uses that name, not a default department.
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={exportBy}
            disabled={exportingExcel}
            onChange={(_, next) => {
              if (!next) return;
              setExportBy(next);
              setExportSelection("");
            }}
            sx={{
              mb: 1.5,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontFamily: T.poppins,
                fontSize: "0.75rem",
                fontWeight: 700,
                px: 1.5,
                color: T.muted,
                borderColor: T.accentBorder,
                "&.Mui-selected": {
                  color: "#fff",
                  bgcolor: T.accent,
                  "&:hover": { bgcolor: T.accentDark },
                },
              },
            }}
          >
            <ToggleButton value="department">Department</ToggleButton>
            <ToggleButton value="category">Employment Category</ToggleButton>
          </ToggleButtonGroup>
          <Autocomplete
            size="small"
            options={exportSelectionOptions}
            value={selectedExportOption}
            onChange={(_, next) => setExportSelection(next?.value || "")}
            isOptionEqualToValue={(o, v) => o.value === v.value}
            getOptionLabel={(o) => o?.label || ""}
            loading={!exportDirectory.loaded}
            disabled={exportingExcel}
            renderOption={(props, o) => (
              <li {...props} key={o.value}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Typography sx={{ fontSize: "0.8rem", fontFamily: T.poppins, color: o.count ? T.text : T.faint, flex: 1, minWidth: 0 }} noWrap>
                    {o.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.66rem", fontFamily: T.poppins, fontWeight: 700, color: o.count ? T.accent : T.faint, whiteSpace: "nowrap" }}>
                    {o.count ? `${o.count} with records` : "no records"}
                  </Typography>
                </Box>
              </li>
            )}
            noOptionsText={!exportDirectory.loaded ? "Loading…" : exportBy === "category" ? "No employment categories set up" : "No departments in the Department Table"}
            renderInput={(params) => (
              <TextField
                {...params}
                label={exportBy === "category" ? "Employment Category" : "Department"}
                placeholder={exportBy === "category" ? "Select an employment category" : "Select a department"}
              />
            )}
            sx={{ ...filterInputSx, mb: 1.5 }}
          />
          <RadioGroup
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value)}
            sx={{ mb: 1.25 }}
          >
            <FormControlLabel
              value="deductions"
              disabled={exportingExcel}
              control={<Radio size="small" sx={{ color: T.accent, "&.Mui-checked": { color: T.accent } }} />}
              label="Only employees with deductions"
              sx={{ "& .MuiFormControlLabel-label": { fontFamily: T.poppins, fontSize: "0.75rem" } }}
            />
            <FormControlLabel
              value="all"
              disabled={exportingExcel}
              control={<Radio size="small" sx={{ color: T.accent, "&.Mui-checked": { color: T.accent } }} />}
              label={`All employees under this ${exportBy === "category" ? "employment category" : "department"}`}
              sx={{ "& .MuiFormControlLabel-label": { fontFamily: T.poppins, fontSize: "0.75rem" } }}
            />
          </RadioGroup>
          <Box
            sx={{
              mb: 1.75,
              border: `1px solid ${T.accentBorder}`,
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 1.5, py: 1, bgcolor: exportPreviewRows.length ? T.accentFaint : "rgba(0,0,0,0.03)" }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: exportSelection && exportPreviewRows.length ? T.accent : T.muted, fontFamily: T.poppins }}>
                {!exportSelection
                  ? "Select a department or employment category to see who has records."
                  : exportPreviewRows.length
                    ? `${exportPreviewRows.length} employee${exportPreviewRows.length === 1 ? "" : "s"} with records will be exported.`
                    : "No employees with records match this selection."}
              </Typography>
              {exportSelection ? (
                <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, mt: 0.35 }}>
                  Letter header: {String(selectedExportOption?.header || "").toUpperCase()}
                  {rowsMatchingSelection.length !== exportPreviewRows.length
                    ? ` · ${rowsMatchingSelection.length} in this ${exportBy === "category" ? "category" : "department"}, ${exportPreviewRows.length} with deductions`
                    : ""}
                </Typography>
              ) : null}
            </Box>
            {exportPreviewRows.length > 0 && (
              <Box sx={{ maxHeight: 180, overflow: "auto" }}>
                {exportPreviewRows.map((row) => (
                  <Box
                    key={row.key}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.7,
                      borderTop: `1px solid ${T.divider}`,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: T.text, fontFamily: T.poppins, lineHeight: 1.3 }} noWrap>
                        {row.name || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>
                        #{row.employeeNumber}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={row.isDeduction ? "Deduction" : "No deduction"}
                      sx={{
                        height: 20,
                        fontSize: "0.62rem",
                        fontFamily: T.poppins,
                        fontWeight: 700,
                        bgcolor: row.isDeduction ? T.salaryChipBg : T.coveredChipBg,
                        color: row.isDeduction ? T.salaryChipColor : T.coveredChipColor,
                        border: `1px solid ${row.isDeduction ? T.salaryChipBorder : T.coveredChipBorder}`,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontFamily: T.poppins, mb: 1.75, lineHeight: 1.5 }}>
            This name appears under Prepared by on every letter page. It defaults to the admin who is exporting.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            value={preparedName}
            onChange={(e) => setPreparedName(e.target.value)}
            placeholder="e.g. Maria Angelyca Lumpayao"
            sx={{ ...filterInputSx, mb: 1.5 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !exportingExcel && exportPreviewRows.length) handleExportExcel();
            }}
          />
          <TextField
            fullWidth
            size="small"
            label="Position / designation"
            value={preparedTitle}
            onChange={(e) => setPreparedTitle(e.target.value)}
            placeholder={DEFAULT_PREPARED_TITLE}
            sx={filterInputSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setExportDialogOpen(false)}
            disabled={exportingExcel}
            sx={{ textTransform: "none", color: T.muted, fontFamily: T.poppins }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExportExcel}
            disabled={exportingExcel || !String(preparedName || "").trim() || exportPreviewRows.length === 0}
            sx={{
              textTransform: "none",
              fontFamily: T.poppins,
              fontWeight: 700,
              bgcolor: T.accent,
              boxShadow: "none",
              "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
              "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.35), color: "#fff" },
            }}
          >
            {exportingExcel ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : "Export Excel"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <AbstractVoidDialog
        open={Boolean(voidTarget)}
        target={voidTarget}
        onClose={() => setVoidTarget(null)}
        onDone={() => setReloadKey((k) => k + 1)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", fontFamily: T.poppins, fontSize: "0.78rem", borderRadius: "10px" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}