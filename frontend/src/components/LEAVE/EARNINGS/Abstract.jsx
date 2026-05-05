import React, { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Tooltip,
  Snackbar,
  Checkbox,
  IconButton,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  InfoOutlined as InfoOutlinedIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
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
import { aggregateAttendanceResultsForAbstract } from "./aggregateAttendanceResultsForAbstract";
import usePayrollRealtimeRefresh from "../../../hooks/usePayrollRealtimeRefresh";

const WH = 8;

const T = {
  accent: "#a32d2d",
  muted: "#555555",
  faint: "#888888",
  divider: "rgba(0,0,0,0.08)",
  poppins: "'Poppins', sans-serif",
  salaryBg: "rgba(250,174,122,0.06)",
  salaryText: "#a32d2d",
  salaryBorder: "rgba(163,45,45,0.12)",
  salaryChipBg: "#faeeda",
  salaryChipColor: "#854f0b",
  salaryChipBorder: "#ef9f27",
  coveredBg: "rgba(97,168,68,0.05)",
  coveredText: "#3b6d11",
  coveredBorder: "rgba(59,109,17,0.12)",
  coveredChipBg: "#eaf3de",
  coveredChipColor: "#3b6d11",
  coveredChipBorder: "#97c459",
  sentChipBg: "#e6f1fb",
  sentChipColor: "#185fa5",
  sentChipBorder: "#85b7eb",
  payrollDoneChipBg: "rgba(46,125,50,0.12)",
  payrollDoneChipColor: "#1b5e20",
  payrollDoneChipBorder: "rgba(27,94,32,0.35)",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

function displayDaysRawAttendanceRow(r) {
  const deduct = toNum(r.unpaid_hours) > 0;
  const h = deduct ? toNum(r.unpaid_hours) : toNum(r.paid_hours);
  return `${(h / WH).toFixed(3)}d`;
}

/** Normalize YYYY-M-D to YYYY-MM-DD so API vs UI keys match. */
function normalizePayrollDate(d) {
  if (d == null || d === "") return "";
  const s = String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return s.trim();
  const [, y, mo, day] = m;
  return `${y}-${String(parseInt(mo, 10)).padStart(2, "0")}-${String(parseInt(day, 10)).padStart(2, "0")}`;
}

/**
 * Match payroll rows to Abstract rows even when one side uses "12345" vs 12345 or leading zeros.
 */
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

/**
 * Any row in Payroll Processing for this employee + pay period (Processed or not).
 * If the row is deleted, it disappears from GET payroll-with-remittance and Abstract unlocks.
 */
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

/**
 * ABSTRACT — attendance_result only: review unpaid leave outcomes and send selected
 * salary-deduction lines to regular payroll processing (same flow as former registry toolbar).
 */
export function Abstract({ employee, year, month }) {
  const [attendanceResults, setAttendanceResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Row keys already submitted this session — one summary row per employee per period (server merges `abs`). */
  const [sentToPayrollKeys, setSentToPayrollKeys] = useState(() => new Set());
  const [selectedPayrollKeys, setSelectedPayrollKeys] = useState(() => new Set());
  const [submittingPayroll, setSubmittingPayroll] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  /** Summary row keys with attendance_result audit trail expanded */
  const [auditExpandedKeys, setAuditExpandedKeys] = useState(() => new Set());
  /** Employee # + pay period keys present in Payroll Processing (any status). */
  const [payrollExistingPeriodKeys, setPayrollExistingPeriodKeys] = useState(() => new Set());

  useEffect(() => {
    setSentToPayrollKeys(new Set());
    setSelectedPayrollKeys(new Set());
    setAuditExpandedKeys(new Set());
  }, [employee?.employeeNumber, year, month]);

  const fetchPayrollExistingPeriodKeys = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/PayrollRoute/payroll-with-remittance`,
        payrollAuthHeaders(),
      );
      setPayrollExistingPeriodKeys(buildPayrollExistingPeriodKeySet(data));
    } catch {
      setPayrollExistingPeriodKeys(new Set());
    }
  }, []);

  usePayrollRealtimeRefresh(fetchPayrollExistingPeriodKeys);

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
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1] || "";
    const y = year != null && year !== "" ? String(year) : "—";
    const empPart = employee?.employeeNumber
      ? `Employee #${employee.employeeNumber}`
      : "All employees";
    return `${mo} ${y} · ${empPart}`;
  }, [employee?.employeeNumber, year, month]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const params = { year, month };
      if (employee?.employeeNumber) params.employeeNumber = employee.employeeNumber;
      const { data } = await axios.get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setAttendanceResults(Array.isArray(data?.attendanceResults) ? data.attendanceResults : []);
    } catch (e) {
      setAttendanceResults([]);
      setError(
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        "Failed to load attendance results",
      );
    } finally {
      setLoading(false);
    }
  }, [employee?.employeeNumber, year, month]);

  useEffect(() => {
    fetchRows();
    fetchPayrollExistingPeriodKeys();
  }, [fetchRows, fetchPayrollExistingPeriodKeys]);

  const mergedRows = useMemo(
    () => aggregateAttendanceResultsForAbstract(attendanceResults, year, month),
    [attendanceResults, year, month],
  );

  const deductionRows = useMemo(
    () => mergedRows.filter((r) => r.isDeduction),
    [mergedRows],
  );
  const coveredRows = useMemo(
    () => mergedRows.filter((r) => !r.isDeduction),
    [mergedRows],
  );
  const isEmpty = !loading && !error && mergedRows.length === 0;

  const isRowAlreadySent = useCallback(
    (row) => sentToPayrollKeys.has(row.key),
    [sentToPayrollKeys],
  );

  const isRowAlreadyInPayrollProcessing = useCallback(
    (row) => abstractRowHasPayrollForPeriod(row, year, month, payrollExistingPeriodKeys),
    [payrollExistingPeriodKeys, year, month],
  );

  const togglePayrollSelect = useCallback((rowKey) => {
    setSelectedPayrollKeys((prev) => {
      const n = new Set(prev);
      if (n.has(rowKey)) n.delete(rowKey);
      else n.add(rowKey);
      return n;
    });
  }, []);

  /** Summary rows that can still be queued for payroll (not sent this session, no row in Payroll Processing for this period). */
  const eligiblePayrollRows = useMemo(
    () =>
      mergedRows.filter((r) => !isRowAlreadySent(r) && !isRowAlreadyInPayrollProcessing(r)),
    [mergedRows, isRowAlreadySent, isRowAlreadyInPayrollProcessing],
  );

  useEffect(() => {
    setSelectedPayrollKeys((prev) => {
      const next = new Set();
      let changed = false;
      for (const k of prev) {
        const row = mergedRows.find((r) => r.key === k);
        if (!row) {
          changed = true;
          continue;
        }
        if (isRowAlreadyInPayrollProcessing(row)) {
          changed = true;
          continue;
        }
        next.add(k);
      }
      return changed ? next : prev;
    });
  }, [mergedRows, isRowAlreadyInPayrollProcessing]);

  const headerCheckboxState = useMemo(() => {
    const keys = eligiblePayrollRows.map((r) => r.key);
    const n = keys.length;
    const selected = keys.filter((k) => selectedPayrollKeys.has(k)).length;
    return {
      checked: n > 0 && selected === n,
      indeterminate: selected > 0 && selected < n,
    };
  }, [eligiblePayrollRows, selectedPayrollKeys]);

  const toggleSelectAllEligible = useCallback(
    (checked) => {
      if (checked) {
        setSelectedPayrollKeys(new Set(eligiblePayrollRows.map((r) => r.key)));
      } else {
        setSelectedPayrollKeys(new Set());
      }
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
      const row = mergedRows.find((x) => x.key === key);
      if (row && !isRowAlreadySent(row) && !isRowAlreadyInPayrollProcessing(row)) n += 1;
    }
    return n;
  }, [selectedPayrollKeys, mergedRows, isRowAlreadySent, isRowAlreadyInPayrollProcessing]);

  const handleSendToPayroll = useCallback(async () => {
    const picked = mergedRows.filter(
      (r) =>
        selectedPayrollKeys.has(r.key) &&
        !isRowAlreadySent(r) &&
        !isRowAlreadyInPayrollProcessing(r),
    );
    if (picked.length === 0) {
      setSnackbar({
        open: true,
        severity: "warning",
        message:
          "Select at least one row you have not already sent in this session (✓ sent rows are skipped).",
      });
      return;
    }
    const byPeriod = new Map();
    for (const r of picked) {
      const b = getPayrollPeriodBounds(r, year, month);
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
          if (!oar) {
            missing.push(`${emp} (${startDate} → ${endDate})`);
            continue;
          }
          attendancePayloads.push(oar);
        }
      }
      if (missing.length > 0) {
        setSnackbar({
          open: true,
          severity: "error",
          message: `No overall attendance record for: ${missing.join("; ")}`,
        });
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
      for (const p of uniquePayload) {
        const emp = String(p.personID).trim();
        let sumAbs = 0;
        let nameFromRegistry = null;
        for (const r of picked) {
          if (String(r.employeeNumber).trim() !== emp) continue;
          const b = getPayrollPeriodBounds(r, year, month);
          if (!b || b.startDate !== p.startDate || b.endDate !== p.endDate) continue;
          sumAbs += registryContributionDays(r);
          if (!nameFromRegistry && r.name) nameFromRegistry = r.name;
        }
        if (sumAbs > 0) {
          p.abs = Number(sumAbs.toFixed(6));
        }
        if (nameFromRegistry) {
          p.name = nameFromRegistry;
        }
      }
      const { filteredRecords, invalidRecords } = await filterRecordsForRegularPayroll(
        uniquePayload,
        payrollAuthHeaders,
      );
      if (filteredRecords.length === 0) {
        setSnackbar({
          open: true,
          severity: "error",
          message:
            invalidRecords.length > 0
              ? invalidRecords.map((x) => `${x.employeeNumber}: ${x.reason}`).join("\n")
              : "No eligible employees for regular payroll (check employment category).",
        });
        return;
      }
      if (invalidRecords.length > 0) {
        setSnackbar({
          open: true,
          severity: "warning",
          message: `Skipped ${invalidRecords.length} employee(s). Submitting ${filteredRecords.length} eligible record(s).`,
        });
      }
      const result = await postRegularPayrollSubmission(filteredRecords, payrollAuthHeaders, {
        mergeAbsIntoExisting: true,
      });
      if (!result.ok) {
        setSnackbar({
          open: true,
          severity: "error",
          message: result.message || "Payroll submission failed.",
        });
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
        message:
          result.newCount != null
            ? `Payroll updated (${result.newCount} change(s)).`
            : "Submitted to payroll processing.",
      });
      setSelectedPayrollKeys(new Set());
    } catch (e) {
      setSnackbar({
        open: true,
        severity: "error",
        message: e.response?.data?.error || e.message || "Request failed.",
      });
    } finally {
      setSubmittingPayroll(false);
    }
  }, [mergedRows, selectedPayrollKeys, isRowAlreadySent, isRowAlreadyInPayrollProcessing, year, month]);

  const TABLE_COL_SPAN = 14;

  const cellWrapSx = {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "visible",
    textOverflow: "clip",
  };

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 1.5 },
        py: 1.5,
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: `4px solid ${T.accent}`,
        bgcolor: "rgba(163,45,45,0.03)",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins }}>
            Abstract
          </Typography>
          <Chip
            label="attendance_result"
            size="small"
            sx={{
              height: 22,
              fontSize: "0.69rem",
              fontWeight: 500,
              fontFamily: T.poppins,
              bgcolor: "#fcebeb",
              color: T.accent,
              border: `0.5px solid #f09595`,
            }}
          />
          {!loading && (
            <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontFamily: T.poppins }}>
              {mergedRows.length} records · {deductionRows.length} deduction{deductionRows.length === 1 ? "" : "s"} ·{" "}
              {coveredRows.length} covered
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {mergedRows.length > 0 && !loading && (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={submittingPayroll ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <PaymentIcon sx={{ fontSize: 16 }} />}
                onClick={handleSendToPayroll}
                disabled={submittingPayroll || selectedEligibleCount === 0}
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textTransform: "none",
                  fontFamily: T.poppins,
                  bgcolor: T.accent,
                  border: `0.5px solid ${T.accent}`,
                  "&:hover": { bgcolor: "#7a1f1f" },
                  "&:disabled": { bgcolor: T.accent, opacity: 0.4 },
                }}
              >
                Send to payroll ({selectedEligibleCount})
              </Button>
              <Button
                size="small"
                onClick={selectAllEligiblePayroll}
                disabled={eligiblePayrollRows.length === 0}
                sx={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "none", fontFamily: T.poppins, border: `0.5px solid ${T.divider}` }}
              >
                Select all
              </Button>
              <Button
                size="small"
                onClick={clearPayrollSelection}
                disabled={selectedPayrollKeys.size === 0}
                sx={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "none", fontFamily: T.poppins, border: `0.5px solid ${T.divider}` }}
              >
                Clear
              </Button>
            </>
          )}
          <Button
            size="small"
            startIcon={loading ? <CircularProgress size={11} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              fetchRows();
              fetchPayrollExistingPeriodKeys();
            }}
            disabled={loading}
            sx={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "none", fontFamily: T.poppins, border: `0.5px solid ${T.divider}` }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.75,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.65 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#e24b4a", flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins }}>
              Salary deduction
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.65 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#639922", flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins }}>
              Covered by leave
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins }}>
          {filterSummary}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: "0.72rem", py: 0.25 }}>
          {error}
        </Alert>
      )}

      {isEmpty && (
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon sx={{ fontSize: 22 }} />}
          sx={{
            mb: 1.25,
            alignItems: "flex-start",
            fontFamily: T.poppins,
            border: `1px solid ${T.divider}`,
            bgcolor: "rgba(255,255,255,0.85)",
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: T.accent, fontFamily: T.poppins }}>
            No attendance_result rows for this filter
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, mt: 0.5, lineHeight: 1.55 }}>
            Nothing in <strong>attendance_result</strong> for <strong>{filterSummary}</strong>. Use the Salary Shortfall tab for the full merged registry.
          </Typography>
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: `0.5px solid ${T.divider}`,
          borderRadius: 2,
          flex: 1,
          maxHeight: { md: "calc(100vh - 380px)" },
          overflow: "auto",
        }}
      >
        <Table size="small" stickyHeader sx={{ tableLayout: "fixed", minWidth: 1580 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: "0.69rem",
                  fontFamily: T.poppins,
                  bgcolor: T.accent,
                  color: "#fff",
                  width: 40,
                  textAlign: "center",
                  borderBottom: `0.5px solid ${T.divider}`,
                  py: 1,
                }}
              >
                <Tooltip title="Select all eligible: not sent this session and no Payroll Processing row for that employee number and pay period.">
                  <Checkbox
                    size="small"
                    checked={headerCheckboxState.checked}
                    indeterminate={headerCheckboxState.indeterminate}
                    onChange={(e) => toggleSelectAllEligible(e.target.checked)}
                    disabled={eligiblePayrollRows.length === 0}
                    sx={{
                      p: 0,
                      color: "rgba(255,255,255,0.92)",
                      "&.Mui-checked": { color: "#fff" },
                      "&.MuiCheckbox-indeterminate": { color: "#fff" },
                      "&.Mui-disabled": { color: "rgba(255,255,255,0.35)" },
                    }}
                  />
                </Tooltip>
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: "0.69rem",
                  fontFamily: T.poppins,
                  bgcolor: T.accent,
                  color: "#fff",
                  width: 36,
                  textAlign: "center",
                  borderBottom: `0.5px solid ${T.divider}`,
                  py: 1,
                }}
              >
                <Tooltip title="Each row: expand to see attendance_result audit trail.">
                  <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, fontFamily: T.poppins, lineHeight: 1.2 }}>
                    Audit
                  </Typography>
                </Tooltip>
              </TableCell>
              {[
                { h: "Emp #", w: "7%" },
                { h: "Name", w: "14%" },
                { h: "Type" },
                { h: "Leave" },
                { h: "Date" },
                { h: "Status" },
                { h: "Days" },
                { h: "Orig. hrs" },
                { h: "Leave hrs" },
                { h: "Unpaid hrs" },
                { h: "Paid hrs" },
                { h: "Remarks", w: "18%" },
                { h: "Created at" },
              ].map(({ h, w }) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 500,
                    fontSize: "0.69rem",
                    fontFamily: T.poppins,
                    bgcolor: "rgba(0,0,0,0.04)",
                    color: T.faint,
                    borderBottom: `0.5px solid ${T.divider}`,
                    py: 1,
                    ...(w ? { width: w } : {}),
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={TABLE_COL_SPAN} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} sx={{ color: T.accent }} />
                </TableCell>
              </TableRow>
            ) : mergedRows.length === 0 ? null : (
              mergedRows.map((merged) => {
                const rowKey = merged.key;
                const isDed = merged.isDeduction;
                const sent = sentToPayrollKeys.has(rowKey);
                const payrollDone = isRowAlreadyInPayrollProcessing(merged);
                const auditOpen = auditExpandedKeys.has(rowKey);
                const sourceRows = Array.isArray(merged.abstractSourceRows) ? merged.abstractSourceRows : [];
                const bg = isDed ? T.salaryBg : T.coveredBg;
                const fg = isDed ? T.salaryText : T.coveredText;
                const bord = isDed ? T.salaryBorder : T.coveredBorder;
                const chipBg = isDed ? T.salaryChipBg : T.coveredChipBg;
                const chipFg = isDed ? T.salaryChipColor : T.coveredChipColor;
                const chipBd = isDed ? T.salaryChipBorder : T.coveredChipBorder;
                const cellSx = {
                  fontFamily: T.poppins,
                  fontSize: "0.75rem",
                  bgcolor: bg,
                  color: fg,
                  borderBottom: `0.5px solid ${bord}`,
                  py: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                };
                const remarksTip = merged.abstractRemarksTooltip || "—";

                return (
                  <Fragment key={rowKey}>
                  <TableRow
                    sx={{
                      "&:last-child td": { borderBottom: "none" },
                      "&:hover td": {
                        bgcolor: isDed ? "rgba(163,45,45,0.07)" : "rgba(59,109,17,0.07)",
                      },
                    }}
                  >
                    <TableCell sx={{ ...cellSx, textAlign: "center", width: 40 }}>
                      {sent ? (
                        <Chip
                          label="✓ sent"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.625rem",
                            fontWeight: 500,
                            bgcolor: T.sentChipBg,
                            color: T.sentChipColor,
                            border: `0.5px solid ${T.sentChipBorder}`,
                          }}
                        />
                      ) : payrollDone ? (
                        <Tooltip title="This employee number already has a row in Payroll Processing for this pay period (by start/end dates). Remove it there to send again from Abstract.">
                          <Chip
                            label="In payroll"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.6rem",
                              fontWeight: 600,
                              bgcolor: T.payrollDoneChipBg,
                              color: T.payrollDoneChipColor,
                              border: `0.5px solid ${T.payrollDoneChipBorder}`,
                              maxWidth: 96,
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Checkbox
                          size="small"
                          checked={selectedPayrollKeys.has(rowKey)}
                          onChange={() => togglePayrollSelect(rowKey)}
                          sx={{
                            p: 0,
                            color: isDed ? T.accent : T.coveredText,
                            "&.Mui-checked": { color: isDed ? T.accent : T.coveredText },
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: "center", width: 36, px: 0.25 }}>
                      <Tooltip title={auditOpen ? "Hide audit trail" : "Show attendance_result rows (audit trail)"}>
                        <IconButton
                          size="small"
                          onClick={() => toggleAuditExpand(rowKey)}
                          aria-expanded={auditOpen}
                          aria-label={auditOpen ? "Collapse audit trail" : "Expand audit trail"}
                          sx={{
                            p: 0.25,
                            color: fg,
                            transform: auditOpen ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s",
                          }}
                        >
                          <ExpandMoreIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, ...cellWrapSx, fontWeight: 600 }}>
                      <Tooltip title={String(merged.employeeNumber ?? "")}>
                        <span>{merged.employeeNumber ?? "—"}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, ...cellWrapSx, color: T.muted }}>
                      <Tooltip title={merged.name ?? "—"}>
                        <span>{merged.name ?? "—"}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.65 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: isDed ? "#e24b4a" : "#639922",
                            flexShrink: 0,
                          }}
                        />
                        <span>{merged.abstractSourceTypes ?? "—"}</span>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{merged.leaveCode ?? "—"}</TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{merged.period ?? "—"}</TableCell>
                    <TableCell sx={cellSx}>
                      <Chip
                        label={String(merged.resultStatus ?? "—").replace(/_/g, " ")}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.625rem",
                          fontWeight: 500,
                          bgcolor: chipBg,
                          color: chipFg,
                          border: `0.5px solid ${chipBd}`,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        fontWeight: 600,
                        color: isDed ? T.accent : T.coveredText,
                      }}
                    >
                      {displayDaysFromMerged(merged)}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.originalHours).toFixed(3)}</TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.leaveHoursUsed).toFixed(3)}</TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.unpaidHours).toFixed(3)}</TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.paidHoursTotal).toFixed(3)}</TableCell>
                    <TableCell
                      sx={{
                        ...cellSx,
                        color: T.muted,
                        whiteSpace: "nowrap",
                        maxWidth: 0,
                      }}
                    >
                      <Tooltip title={remarksTip} placement="top-start">
                        <span>{merged.abstractRemarksShort ?? "—"}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: T.muted }}>{fmtCreatedAt(merged.createdAt)}</TableCell>
                  </TableRow>
                  {auditOpen && sourceRows.length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={TABLE_COL_SPAN}
                        sx={{
                          py: 0,
                          px: 1,
                          borderBottom: `0.5px solid ${T.divider}`,
                          bgcolor: isDed ? "rgba(163,45,45,0.04)" : "rgba(59,109,17,0.04)",
                          verticalAlign: "top",
                        }}
                      >
                        <Box sx={{ py: 1.25, pl: 5 }}>
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              fontFamily: T.poppins,
                              color: T.muted,
                              mb: 0.75,
                            }}
                          >
                            attendance_result audit · {sourceRows.length} line{sourceRows.length === 1 ? "" : "s"}
                          </Typography>
                          <TableContainer component={Paper} elevation={0} sx={{ border: `0.5px solid ${T.divider}`, maxHeight: 280 }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 720 }}>
                              <TableHead>
                                <TableRow>
                                  {["ID", "Date", "Type", "Leave", "Status", "Days", "Unpaid", "Paid", "Remarks", "Processed"].map((h) => (
                                    <TableCell
                                      key={h}
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.65rem",
                                        fontFamily: T.poppins,
                                        bgcolor: "rgba(0,0,0,0.06)",
                                        py: 0.5,
                                      }}
                                    >
                                      {h}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {sourceRows.map((ar, arIdx) => {
                                  const arDed = toNum(ar.unpaid_hours) > 0;
                                  const arBg = arDed ? "rgba(250,174,122,0.08)" : "rgba(97,168,68,0.08)";
                                  const rmk = ar.remarks != null && String(ar.remarks).trim() !== "" ? String(ar.remarks) : "—";
                                  const dt = ar.result_date ? String(ar.result_date).slice(0, 10) : "—";
                                  return (
                                    <TableRow key={`${rowKey}-ar-${ar.id ?? arIdx}-${arIdx}`}>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {ar.id ?? "—"}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>{dt}</TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {ar.source_type ?? "—"}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {ar.leave_used ?? "—"}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {String(ar.status ?? "—").replace(/_/g, " ")}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, fontWeight: 600, bgcolor: arBg, py: 0.5 }}>
                                        {displayDaysRawAttendanceRow(ar)}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {toNum(ar.unpaid_hours).toFixed(3)}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {toNum(ar.paid_hours).toFixed(3)}
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          fontSize: "0.68rem",
                                          fontFamily: T.poppins,
                                          bgcolor: arBg,
                                          py: 0.5,
                                          maxWidth: 220,
                                          whiteSpace: "normal",
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        <Tooltip title={rmk} placement="top-start">
                                          <span>{rmk.length > 120 ? `${rmk.slice(0, 117)}…` : rmk}</span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.68rem", fontFamily: T.poppins, bgcolor: arBg, py: 0.5 }}>
                                        {fmtCreatedAt(ar.processed_at)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", fontFamily: T.poppins, fontSize: "0.8rem" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
