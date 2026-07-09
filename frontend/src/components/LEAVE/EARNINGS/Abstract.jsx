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
import { alpha } from "@mui/material/styles";
import {
  Refresh as RefreshIcon,
  InfoOutlined as InfoOutlinedIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  ViewStream as AbstractTabIcon,
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
import usePayrollRealtimeRefresh from "../../../hooks/usePayrollRealtimeRefresh";

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

// ─── Shared header cell style ─────────────────────────────────────────────────

const thSx = {
  fontWeight: 700,
  fontSize: "0.63rem",
  fontFamily: T.poppins,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  py: 1.25,
  px: 1.5,
  bgcolor: "rgba(109,35,35,0.07)",
  color: T.muted,
  borderBottom: `1px solid rgba(109,35,35,0.14)`,
  whiteSpace: "nowrap",
  // CRITICAL: must be static so the nested table's th doesn't fight the outer stickyHeader
  position: "sticky",
  top: 0,
  zIndex: 2,
};

// ─── Audit table header cell — NOT sticky ────────────────────────────────────
const auditThSx = {
  fontSize: "0.62rem",
  fontWeight: 700,
  fontFamily: T.poppins,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: T.faint,
  bgcolor: "#f4f4f4",
  py: 0.75,
  px: 1.5,
  borderBottom: `1px solid ${T.divider}`,
  whiteSpace: "nowrap",
  // NO position sticky — nested sticky causes misalignment/clipping
  position: "static",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

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

export function Abstract({ employee, year, month, manualRows = [] }) {
  const [sentToPayrollKeys, setSentToPayrollKeys] = useState(() => new Set());
  const [selectedPayrollKeys, setSelectedPayrollKeys] = useState(() => new Set());
  const [submittingPayroll, setSubmittingPayroll] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [auditExpandedKeys, setAuditExpandedKeys] = useState(() => new Set());
  const [payrollExistingPeriodKeys, setPayrollExistingPeriodKeys] = useState(() => new Set());
  const [refreshingKeys, setRefreshingKeys] = useState(false);

  useEffect(() => {
    setSentToPayrollKeys(new Set());
    setSelectedPayrollKeys(new Set());
    setAuditExpandedKeys(new Set());
  }, [employee?.employeeNumber, year, month]);

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

  // Rows are added exclusively via the "Add to Abstract" button (see EarningsManagement.js),
  // which fetches real attendance_result data (or stages a zero-deduction placeholder) and
  // passes the result down as `manualRows`. Abstract.js no longer auto-fetches or merges
  // attendance_result rows on its own — nothing appears here without an explicit click.
  const displayRows = manualRows;

  const deductionRows = useMemo(() => displayRows.filter((r) => r.isDeduction), [displayRows]);
  const coveredRows   = useMemo(() => displayRows.filter((r) => !r.isDeduction), [displayRows]);
  const isEmpty = displayRows.length === 0;

  const isRowAlreadySent = useCallback(
    (row) => sentToPayrollKeys.has(row.key),
    [sentToPayrollKeys],
  );
  // Works for manual rows too — they carry employeeNumber/periodYear/periodMonth
  // in the same shape getPayrollPeriodBounds() expects, so no special-casing needed.
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
          const b = getPayrollPeriodBounds(r, year, month);
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
  }, [displayRows, selectedPayrollKeys, isRowAlreadySent, isRowAlreadyInPayrollProcessing, year, month]);

  // 15 cols: checkbox + audit + 13 data cols
  const TABLE_COL_SPAN = 15;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: T.poppins }}>

      {/* ── Column header ── */}
      <ColHeader icon={AbstractTabIcon} label="Abstract · attendance_result">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {displayRows.length > 0 && (
            <>
              <StatPill value={displayRows.length} label="records" />
              <StatPill value={deductionRows.length} label="deductions" accent />
              <StatPill value={coveredRows.length} label="covered" />
            </>
          )}
        </Box>
      </ColHeader>

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
              Nothing staged for payroll yet
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: T.muted, lineHeight: 1.55, fontFamily: T.poppins }}>
              <strong>ABSTRACT</strong> only shows rows that were explicitly staged for{" "}
              <strong>{filterSummary}</strong> — nothing is added automatically, even if the
              employee has attendance deductions on record.
              {" "}Go to the <strong>Leave/SC/CTO</strong> tabs, select the employee and period, and
              use the <strong>Add to Abstract</strong> button below the Earnings Records panel to
              stage them here — whether they have a deduction to post or none at all.
            </Typography>
          </Alert>
        </Box>
      )}

      {/* ── Table ── */}
      <Box sx={{ flex: 1, overflow: "hidden", px: 2, pt: 1.5, pb: 2, minHeight: 0 }}>
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: `0.5px solid ${T.accentBorder}`,
            borderRadius: "10px",
            height: "100%",
            // Single scroll container — the outer wrapper scrolls, inner tables do NOT
            overflow: "auto",
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              tableLayout: "fixed",
              minWidth: 1560,
              // Collapse so rows share borders cleanly
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <TableHead>
              <TableRow>
                {/* Checkbox */}
                <TableCell sx={{ ...thSx, width: 44, textAlign: "center", px: 1 }}>
                  <Tooltip title="Select all eligible rows">
                    <Checkbox
                      size="small"
                      checked={headerCheckboxState.checked}
                      indeterminate={headerCheckboxState.indeterminate}
                      onChange={(e) => toggleSelectAllEligible(e.target.checked)}
                      disabled={eligiblePayrollRows.length === 0}
                      sx={{
                        p: 0,
                        color: alpha(T.accent, 0.4),
                        "&.Mui-checked": { color: T.accent },
                        "&.MuiCheckbox-indeterminate": { color: T.accent },
                        "&.Mui-disabled": { color: "rgba(0,0,0,0.2)" },
                      }}
                    />
                  </Tooltip>
                </TableCell>

                {/* Audit expand */}
                <TableCell sx={{ ...thSx, width: 44, textAlign: "center", px: 0.5 }}>
                  Audit
                </TableCell>

                {/* Data cols */}
                {[
                  { h: "Emp #",      w: "5.5%" },
                  { h: "Name",       w: "11%"  },
                  { h: "Type",       w: "7.5%" },
                  { h: "Leave",      w: "5%"   },
                  { h: "Period",     w: "8.5%" },
                  { h: "Status",     w: "9%"   },
                  { h: "Days",       w: "5.5%" },
                  { h: "Orig. hrs",  w: "5.5%" },
                  { h: "Leave hrs",  w: "6%"   },
                  { h: "Unpaid hrs", w: "6%",  highlight: true },
                  { h: "Paid hrs",   w: "5.5%" },
                  { h: "Remarks",    w: "13%"  },
                  { h: "Created at", w: "8%"   },
                ].map(({ h, w, highlight }) => (
                  <TableCell
                    key={h}
                    sx={{
                      ...thSx,
                      width: w,
                      ...(highlight && {
                        bgcolor: T.accent,
                        color: "#fff",
                        borderLeft: "none",
                        borderRight: "none",
                        letterSpacing: "0.08em",
                      }),
                    }}
                  >
                    {highlight ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <PaymentIcon sx={{ fontSize: 11, color: "#fff", opacity: 0.85 }} />
                        <span>{h}</span>
                      </Box>
                    ) : h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {displayRows.length === 0 ? null : (
                displayRows.map((merged) => {
                  const rowKey    = merged.key;
                  const isDed     = merged.isDeduction;
                  const isManual  = !!merged.isManual;
                  const sent      = sentToPayrollKeys.has(rowKey);
                  const payrollDone = isRowAlreadyInPayrollProcessing(merged);
                  const auditOpen = auditExpandedKeys.has(rowKey);
                  const sourceRows = Array.isArray(merged.abstractSourceRows) ? merged.abstractSourceRows : [];

                  const bg      = isManual ? T.manualBg      : (isDed ? T.salaryBg       : T.coveredBg);
                  const fgColor = isManual ? T.manualText    : (isDed ? T.salaryText      : T.coveredText);
                  const bord    = isManual ? T.manualBorder  : (isDed ? T.salaryBorder    : T.coveredBorder);
                  const chipBg  = isManual ? T.manualChipBg  : (isDed ? T.salaryChipBg   : T.coveredChipBg);
                  const chipFg  = isManual ? T.manualChipColor : (isDed ? T.salaryChipColor : T.coveredChipColor);
                  const chipBd  = isManual ? T.manualChipBorder : (isDed ? T.salaryChipBorder : T.coveredChipBorder);

                  const cellSx = {
                    fontFamily: T.poppins,
                    fontSize: "0.78rem",
                    bgcolor: bg,
                    color: fgColor,
                    borderBottom: `1px solid ${bord}`,
                    py: 1.1,
                    px: 1.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    // No position override — inherit table layout
                  };

                  const remarksTip = merged.abstractRemarksTooltip || "—";

                  return (
                    <Fragment key={rowKey}>
                      {/* ── Summary row ── */}
                      <TableRow
                        sx={{
                          "&:hover td": { filter: "brightness(0.97)", transition: "filter 0.12s" },
                        }}
                      >
                        {/* Checkbox / status indicator */}
                        <TableCell sx={{ ...cellSx, textAlign: "center", px: 1 }}>
                          {sent ? (
                            <Tooltip title="Sent to payroll this session.">
                              <Chip
                                label="✓"
                                size="small"
                                sx={{
                                  height: 18, minWidth: 18, fontSize: "0.62rem", fontWeight: 800,
                                  bgcolor: T.sentChipBg, color: T.sentChipColor,
                                  border: `1px solid ${T.sentChipBorder}`, fontFamily: T.poppins,
                                  "& .MuiChip-label": { px: 0.5 },
                                }}
                              />
                            </Tooltip>
                          ) : payrollDone ? (
                            <Tooltip title="Already in Payroll Processing for this period. Remove it there to re-send.">
                              <Chip
                                label="In payroll"
                                size="small"
                                sx={{
                                  height: 18, fontSize: "0.58rem", fontWeight: 700,
                                  bgcolor: T.payrollDoneBg, color: T.payrollDoneColor,
                                  border: `1px solid ${T.payrollDoneBorder}`, fontFamily: T.poppins,
                                  "& .MuiChip-label": { px: 0.5 },
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
                                color: alpha(T.accent, 0.3),
                                "&.Mui-checked": { color: T.accent },
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Audit expand chevron */}
                        <TableCell sx={{ ...cellSx, textAlign: "center", px: 0.5 }}>
                          <Tooltip title={
                            sourceRows.length === 0
                              ? "No source rows to inspect (manually added)."
                              : auditOpen ? "Collapse source rows" : "Expand source rows"
                          }>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => toggleAuditExpand(rowKey)}
                                disabled={sourceRows.length === 0}
                                sx={{
                                  p: 0.25,
                                  color: T.faint,
                                  transform: auditOpen ? "rotate(180deg)" : "none",
                                  transition: "transform 0.18s ease",
                                  "&:hover": { color: T.accent, bgcolor: "transparent" },
                                  "&.Mui-disabled": { color: "rgba(0,0,0,0.15)" },
                                }}
                              >
                                <ExpandMoreIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={{ ...cellSx, fontWeight: 600, color: T.text }}>
                          {merged.employeeNumber ?? "—"}
                        </TableCell>

                        <TableCell sx={{ ...cellSx, color: T.text }}>
                          <Tooltip title={merged.name ?? "—"} placement="top-start">
                            <span>{merged.name ?? "—"}</span>
                          </Tooltip>
                        </TableCell>

                        {/* Type with dot indicator */}
                        <TableCell sx={cellSx}>
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                            <Box sx={{
                              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                              bgcolor: isManual ? "#1565c0" : (isDed ? T.accent : "#2e7d32"),
                            }} />
                            <span style={{ color: T.muted }}>{merged.abstractSourceTypes ?? "—"}</span>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ ...cellSx, color: T.muted }}>{merged.leaveCode ?? "—"}</TableCell>
                        <TableCell sx={{ ...cellSx, color: T.muted }}>{merged.period ?? "—"}</TableCell>

                        {/* Status chip */}
                        <TableCell sx={cellSx}>
                          <Box
                            sx={{
                              display: "inline-block",
                              px: 0.9, py: 0.2,
                              borderRadius: "5px",
                              border: `1px solid ${chipBd}`,
                              bgcolor: chipBg,
                            }}
                          >
                            <Typography sx={{
                              fontSize: "0.65rem", fontWeight: 700, color: chipFg,
                              fontFamily: T.poppins, lineHeight: 1, letterSpacing: "0.03em",
                            }}>
                              {String(merged.resultStatus ?? "—").replace(/_/g, " ")}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Days — prominent */}
                        <TableCell sx={{
                          ...cellSx,
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          color: isManual ? "#0d47a1" : (isDed ? T.accent : "#1e6b22"),
                        }}>
                          {displayDaysFromMerged(merged)}
                        </TableCell>

                        <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.originalHours).toFixed(3)}</TableCell>
                        <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.leaveHoursUsed).toFixed(3)}</TableCell>
                        {/* ── Unpaid hrs — THE payroll submission field ── */}
                        <TableCell sx={{
                          ...cellSx,
                          bgcolor: toNum(merged.unpaidHours) > 0
                            ? "rgba(109,35,35,0.10)"
                            : "rgba(0,0,0,0.025)",
                          px: 1,
                          textAlign: "center",
                        }}>
                          <Box sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            px: 1.2,
                            py: 0.35,
                            borderRadius: "6px",
                            bgcolor: toNum(merged.unpaidHours) > 0 ? T.accent : "transparent",
                            minWidth: 52,
                          }}>
                            <Typography sx={{
                              fontSize: "0.82rem",
                              fontWeight: 800,
                              fontFamily: T.poppins,
                              color: toNum(merged.unpaidHours) > 0 ? "#fff" : T.faint,
                              lineHeight: 1,
                              letterSpacing: "0.02em",
                            }}>
                              {toNum(merged.unpaidHours).toFixed(3)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, color: T.muted }}>{toNum(merged.paidHoursTotal).toFixed(3)}</TableCell>

                        <TableCell sx={{ ...cellSx, color: T.muted, maxWidth: 0 }}>
                          <Tooltip title={remarksTip} placement="top-start">
                            <span>{merged.abstractRemarksShort ?? "—"}</span>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={{ ...cellSx, color: T.faint }}>{fmtCreatedAt(merged.createdAt)}</TableCell>
                      </TableRow>

                      {/* ── Audit drawer ── */}
                      {auditOpen && sourceRows.length > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={TABLE_COL_SPAN}
                            sx={{
                              // Zero padding so the inner box controls all spacing
                              p: "0 !important",
                              borderBottom: `1px solid ${T.divider}`,
                              bgcolor: "#f8f8f8",
                              // No overflow:hidden here — let the inner box breathe
                            }}
                          >
                            <Box
                              sx={{
                                // Left margin aligns content past checkbox (44) + audit (44) cols = 88px
                                ml: "88px",
                                mr: 2,
                                my: 1.5,
                                borderRadius: "8px",
                                border: `0.5px solid ${T.divider}`,
                                overflow: "hidden",
                                bgcolor: "#fff",
                              }}
                            >
                              {/* Drawer label */}
                              <Box
                                sx={{
                                  px: 2, py: 0.85,
                                  borderBottom: `0.5px solid ${T.divider}`,
                                  bgcolor: "#f4f4f4",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography sx={{
                                  fontSize: "0.65rem", fontWeight: 700, color: T.muted,
                                  fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em",
                                }}>
                                  Source rows
                                </Typography>
                                <Box sx={{
                                  px: 0.75, py: 0.15, borderRadius: "4px",
                                  bgcolor: T.accentFaint, border: `0.5px solid ${T.accentBorder}`,
                                }}>
                                  <Typography sx={{
                                    fontSize: "0.6rem", fontWeight: 700, color: T.accent,
                                    fontFamily: T.poppins, lineHeight: 1.4,
                                  }}>
                                    {sourceRows.length} attendance_result {sourceRows.length === 1 ? "row" : "rows"}
                                  </Typography>
                                </Box>
                              </Box>

                              {/*
                                CRITICAL FIX:
                                - No stickyHeader on the nested Table
                                - auditThSx uses position: "static" (not sticky)
                                - tableLayout: "auto" so columns size to content
                                - No minWidth that would push past the container
                              */}
                              <Table
                                size="small"
                                sx={{
                                  tableLayout: "auto",
                                  width: "100%",
                                  borderCollapse: "collapse",
                                }}
                              >
                                <TableHead>
                                  <TableRow>
                                    {[
                                      "ID", "Date", "Type", "Leave",
                                      "Status", "Days", "Unpaid hrs",
                                      "Paid hrs", "Remarks", "Processed at",
                                    ].map((h) => (
                                      <TableCell key={h} sx={auditThSx}>{h}</TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {sourceRows.map((ar, arIdx) => {
                                    const arDed = toNum(ar.unpaid_hours) > 0;
                                    const rmk = ar.remarks != null && String(ar.remarks).trim() !== ""
                                      ? String(ar.remarks) : "—";
                                    const dt = ar.result_date ? String(ar.result_date).slice(0, 10) : "—";

                                    const arCell = {
                                      fontSize: "0.75rem",
                                      fontFamily: T.poppins,
                                      color: T.muted,
                                      py: 1,
                                      px: 1.5,
                                      bgcolor: "#fff",
                                      borderBottom: `0.5px solid ${T.divider}`,
                                    };

                                    return (
                                      <TableRow
                                        key={`${rowKey}-ar-${ar.id ?? arIdx}-${arIdx}`}
                                        sx={{
                                          "&:last-child td": { borderBottom: "none" },
                                          "&:hover td": {
                                            bgcolor: "rgba(0,0,0,0.018)",
                                            transition: "background 0.1s",
                                          },
                                        }}
                                      >
                                        <TableCell sx={{ ...arCell, color: T.text, fontWeight: 600 }}>
                                          {ar.id ?? "—"}
                                        </TableCell>
                                        <TableCell sx={arCell}>{dt}</TableCell>
                                        <TableCell sx={arCell}>{ar.source_type ?? "—"}</TableCell>
                                        <TableCell sx={arCell}>{ar.leave_used ?? "—"}</TableCell>
                                        <TableCell sx={{
                                          ...arCell,
                                          color: arDed ? T.accent : "#1e6b22",
                                          fontWeight: 600,
                                        }}>
                                          {String(ar.status ?? "—").replace(/_/g, " ")}
                                        </TableCell>
                                        <TableCell sx={{
                                          ...arCell,
                                          fontWeight: 700,
                                          color: arDed ? T.accent : "#1e6b22",
                                        }}>
                                          {displayDaysRawAttendanceRow(ar)}
                                        </TableCell>
                                        {/* Unpaid hrs — highlighted to match summary column */}
                                        <TableCell sx={{
                                          ...arCell,
                                          bgcolor: toNum(ar.unpaid_hours) > 0
                                            ? "rgba(109,35,35,0.07)"
                                            : "rgba(0,0,0,0.015)",
                                          px: 1,
                                          textAlign: "center",
                                        }}>
                                          <Box sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: "5px",
                                            bgcolor: toNum(ar.unpaid_hours) > 0 ? T.accent : "transparent",
                                            minWidth: 44,
                                          }}>
                                            <Typography sx={{
                                              fontSize: "0.75rem",
                                              fontWeight: 700,
                                              fontFamily: T.poppins,
                                              color: toNum(ar.unpaid_hours) > 0 ? "#fff" : T.faint,
                                              lineHeight: 1,
                                            }}>
                                              {toNum(ar.unpaid_hours).toFixed(3)}
                                            </Typography>
                                          </Box>
                                        </TableCell>
                                        <TableCell sx={arCell}>
                                          {toNum(ar.paid_hours).toFixed(3)}
                                        </TableCell>
                                        <TableCell sx={{
                                          ...arCell,
                                          // Allow wrapping in the remarks column
                                          whiteSpace: "normal",
                                          wordBreak: "break-word",
                                          maxWidth: 280,
                                        }}>
                                          <Tooltip title={rmk} placement="top-start">
                                            <span>{rmk.length > 120 ? `${rmk.slice(0, 117)}…` : rmk}</span>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ ...arCell, color: T.faint, whiteSpace: "nowrap" }}>
                                          {fmtCreatedAt(ar.processed_at)}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
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
      </Box>

      {/* ── Snackbar ── */}
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