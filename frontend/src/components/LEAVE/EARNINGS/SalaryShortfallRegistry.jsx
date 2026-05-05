import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Checkbox,
  Tooltip,
} from "@mui/material";
import { Refresh as RefreshIcon, InfoOutlined as InfoOutlinedIcon } from "@mui/icons-material";

const T = {
  accent: "#6d2323",
  muted: "#555555",
  faint: "#888888",
  divider: "rgba(0,0,0,0.08)",
  poppins: "'Poppins', sans-serif",
  salaryBg: "rgba(198,40,40,0.06)",
  salaryText: "#7b1a1a",
  salaryBorder: "rgba(198,40,40,0.15)",
  salaryChipBg: "rgba(198,40,40,0.1)",
  salaryChipColor: "#7b1a1a",
  salaryChipBorder: "rgba(198,40,40,0.28)",
  coveredBg: "rgba(46,125,50,0.06)",
  coveredText: "#1b5e20",
  coveredBorder: "rgba(46,125,50,0.15)",
  coveredChipBg: "rgba(46,125,50,0.1)",
  coveredChipColor: "#1b5e20",
  coveredChipBorder: "rgba(46,125,50,0.28)",
  dividerRowBg: "rgba(0,0,0,0.03)",
};

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function parseFinalAppliedHours(jsonStr) {
  if (!jsonStr || typeof jsonStr !== "string") return null;
  try {
    const o = JSON.parse(jsonStr);
    const h = o?.applied_hours ?? o?.appliedHours;
    const n = Number(h);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

function parseChargeTo(jsonStr, leaveCodeFallback) {
  if (jsonStr && typeof jsonStr === "string") {
    try {
      const o = JSON.parse(jsonStr);
      const c = o?.charge_to ?? o?.chargeTo;
      if (c != null && String(c).trim()) return String(c).trim();
    } catch { /* ignore */ }
  }
  if (leaveCodeFallback != null && String(leaveCodeFallback).trim()) return String(leaveCodeFallback).trim();
  return "—";
}

function isSalaryDeduction(entryType, chargeTo) {
  const et = String(entryType || "").trim();
  const ct = String(chargeTo || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (et === "No Deduction") return false;
  if (ct === "SALARY_DEDUCTION") return true;
  if (et && et !== "No Deduction") return true;
  return false;
}

function formatNameSnNMi(row) {
  const sn = (row?.emp_last_name || "").trim();
  const n = (row?.emp_first_name || "").trim();
  const mid = (row?.emp_middle_name || "").trim();
  const mi = mid ? `${mid.charAt(0).toUpperCase()}.` : "";
  const right = [n, mi].filter(Boolean).join(" ");
  if (!sn && !right) return "—";
  return sn ? `${sn}, ${right}`.replace(/,\s*$/, "") : right;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Calendar month bounds for payroll (matches shortfall period / filter month). */
export function getPayrollPeriodBounds(row, filterYear, filterMonth) {
  let y = row.periodYear;
  let m = row.periodMonth;
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const fy = parseInt(filterYear, 10);
    const fm = parseInt(filterMonth, 10);
    if (Number.isFinite(fy) && Number.isFinite(fm) && fm >= 1 && fm <= 12) {
      y = fy;
      m = fm;
    } else if (row.halfDayDate) {
      const d = new Date(`${row.halfDayDate}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        y = d.getFullYear();
        m = d.getMonth() + 1;
      }
    }
  }
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const emp = String(row.employeeNumber ?? "").trim();
  if (!emp) return null;
  return { startDate, endDate, payrollKey: `${emp}|${startDate}|${endDate}` };
}

/** Days to charge salary for a registry row (matches table "To salary (d)" / hours÷8). */
export function registryContributionDays(row) {
  if (!row?.isDeduction) return 0;
  if (row.source === "AR" && row.unpaidHours != null) {
    const u = Number(row.unpaidHours);
    if (Number.isFinite(u) && u > 0) return u / 8;
  }
  if (row.toSalaryDays != null && row.toSalaryDays !== "") {
    const n = Number(row.toSalaryDays);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (row.hours != null && row.hours !== "") {
    const h = Number(row.hours);
    if (Number.isFinite(h) && h > 0) return h / 8;
  }
  return 0;
}

export async function fetchOverallAttendanceRow(employeeNumber, monthStart, monthEnd, targetStart, targetEnd) {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const { data } = await axios.get(`${API_BASE_URL}/attendance/api/overall_attendance_record`, {
    headers,
    params: { personID: employeeNumber, startDate: monthStart, endDate: monthEnd },
  });
  const list = data?.data;
  if (!Array.isArray(list) || list.length === 0) return null;
  const exact = list.find((r) => r.startDate === targetStart && r.endDate === targetEnd);
  const row = exact || (list.length === 1 ? list[0] : null);
  if (!row) return null;
  return {
    personID: String(row.personID ?? employeeNumber),
    startDate: row.startDate,
    endDate: row.endDate,
    overallRenderedOfficialTimeTardiness: row.overallRenderedOfficialTimeTardiness,
    code: row.code,
  };
}

// ── Merged row shape ──────────────────────────────────────────────────────────
// We combine section A rows and section B rows into one flat list, then sort:
//   salary-deduction rows first, covered rows second.
// Source field helps avoid showing duplicates: a B row that has a registry ID
// is already represented by its A row — we skip it.
export function buildMergedRows(sectionARows, sectionBRows, attendanceResults = []) {
  const merged = [];

  const arKeys = new Set((attendanceResults || []).map((x) => x.source_key).filter(Boolean));
  const arLeaveEarnIds = new Set(
    (attendanceResults || [])
      .filter((x) => x.leave_earning_id != null)
      .map((x) => Number(x.leave_earning_id)),
  );
  const arDdlIds = new Set(
    (attendanceResults || [])
      .filter((x) => x.deduction_decision_log_id != null)
      .map((x) => Number(x.deduction_decision_log_id)),
  );

  (attendanceResults || []).forEach((r) => {
    const unpaid = toNum(r.unpaid_hours);
    const isDeduction = unpaid > 0;
    const rd = r.result_date ? String(r.result_date).slice(0, 10) : null;
    let periodYear = null;
    let periodMonth = null;
    if (rd) {
      const d = new Date(`${rd}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        periodYear = d.getFullYear();
        periodMonth = d.getMonth() + 1;
      }
    }
    merged.push({
      key: `ar-${r.id}`,
      employeeNumber: r.employee_number,
      name: formatNameSnNMi(r),
      leaveCode: (r.leave_used || "—").toString(),
      chargeTo: isDeduction ? "SALARY_DEDUCTION" : String(r.leave_used || "No salary deduction"),
      halfDayDate: rd,
      period:
        periodYear != null && periodMonth != null
          ? `${MONTHS[periodMonth - 1]} ${periodYear}`
          : "—",
      periodYear,
      periodMonth,
      toSalaryDays: unpaid > 0 ? Number((unpaid / 8).toFixed(6)) : 0,
      hours: isDeduction ? unpaid : toNum(r.leave_hours_used),
      unpaidHours: unpaid,
      originalHours: toNum(r.original_hours),
      leaveHoursUsed: toNum(r.leave_hours_used),
      resultStatus: r.status || "—",
      createdAt: r.processed_at,
      isDeduction,
      source: "AR",
    });
  });

  // Legacy LSS rows (skip if superseded by attendance_result)
  sectionARows.forEach((r) => {
    const leId = r.leave_earning_id != null ? Number(r.leave_earning_id) : null;
    if (leId != null && Number.isFinite(leId) && arLeaveEarnIds.has(leId)) return;
    if (arKeys.has(`MANUAL_LSS:${r.id}`)) return;
    const isDeduction = String(r.entry_type || "").trim() !== "No Deduction";
    merged.push({
      key: `a-${r.id}`,
      employeeNumber: r.employee_number,
      name: formatNameSnNMi(r),
      leaveCode: r.leave_code || "—",
      chargeTo: isDeduction ? "SALARY_DEDUCTION" : "No salary deduction",
      halfDayDate: r.leave_date ? String(r.leave_date).slice(0, 10) : null,
      period: `${MONTHS[(parseInt(r.period_month, 10) || 1) - 1]} ${r.period_year}`,
      periodYear: parseInt(r.period_year, 10) || null,
      periodMonth: parseInt(r.period_month, 10) || null,
      toSalaryDays: toNum(r.shortfall_days),
      hours: toNum(r.shortfall_hours),
      createdAt: r.created_at,
      isDeduction,
      source: "A",
    });
  });

  // Add B rows that have NO registry link (i.e. not already in A)
  sectionBRows.forEach((r) => {
    const ddlId = r.decision_log_id != null ? Number(r.decision_log_id) : null;
    if (ddlId != null && Number.isFinite(ddlId) && arDdlIds.has(ddlId)) return;

    const regId = r.shortfall_registry_id != null ? Number(r.shortfall_registry_id) : null;
    const hasReg = regId != null && Number.isFinite(regId) && regId > 0;
    if (hasReg) return; // already represented by its A row

    const chargeTo = parseChargeTo(r.final_applied_json, r.leave_code);
    const hrs = parseFinalAppliedHours(r.final_applied_json);
    const isDeduction = String(chargeTo || "").toUpperCase().replace(/\s+/g, "_") === "SALARY_DEDUCTION";

    let periodYear = null;
    let periodMonth = null;
    if (r.leave_date) {
      const d = new Date(`${String(r.leave_date).slice(0, 10)}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        periodYear = d.getFullYear();
        periodMonth = d.getMonth() + 1;
      }
    }

    merged.push({
      key: `b-${r.decision_log_id}`,
      employeeNumber: r.employee_number,
      name: formatNameSnNMi(r),
      leaveCode: r.leave_code || "—",
      chargeTo: isDeduction ? "SALARY_DEDUCTION" : chargeTo,
      halfDayDate: r.leave_date ? String(r.leave_date).slice(0, 10) : null,
      period: null,
      periodYear,
      periodMonth,
      toSalaryDays: null,
      hours: hrs,
      createdAt: r.created_at,
      isDeduction,
      source: "B",
    });
  });

  // Sort: salary deductions first, then covered rows; within each group by date desc
  merged.sort((a, b) => {
    if (a.isDeduction !== b.isDeduction) return a.isDeduction ? -1 : 1;
    const da = a.halfDayDate || a.createdAt || "";
    const db = b.halfDayDate || b.createdAt || "";
    return db.localeCompare(da);
  });

  return merged;
}

// ── Row component ─────────────────────────────────────────────────────────────
export function MergedRow({
  row,
  showPayrollColumn = false,
  payrollChecked,
  onPayrollToggle,
  onPayroll,
  payrollChecking,
}) {
  const bg = row.isDeduction ? T.salaryBg : T.coveredBg;
  const textColor = row.isDeduction ? T.salaryText : T.coveredText;
  const chipBg = row.isDeduction ? T.salaryChipBg : T.coveredChipBg;
  const chipColor = row.isDeduction ? T.salaryChipColor : T.coveredChipColor;
  const chipBorder = row.isDeduction ? T.salaryChipBorder : T.coveredChipBorder;
  const chipLabel = row.isDeduction ? "Salary deduction" : "No salary deduction";

  const cellSx = {
    fontFamily: T.poppins,
    fontSize: "0.72rem",
    bgcolor: bg,
    color: textColor,
    borderBottom: `1px solid ${row.isDeduction ? T.salaryBorder : T.coveredBorder}`,
  };

  const showPayrollCol = row.isDeduction;
  const checkboxDisabled = !showPayrollCol || onPayroll || payrollChecking;
  const checkboxChecked = onPayroll || payrollChecked;
  const checkboxTitle = !showPayrollCol
    ? "Only salary-deduction rows can be queued for payroll."
    : onPayroll
      ? "Already in payroll processing for this period."
      : payrollChecking
        ? "Checking payroll…"
        : "Select to include when sending to payroll";

  return (
    <TableRow>
      {showPayrollColumn && (
        <TableCell sx={{ ...cellSx, width: 44, textAlign: "center", py: 0.25 }}>
          {showPayrollCol ? (
            <Tooltip title={checkboxTitle}>
              <span>
                <Checkbox
                  size="small"
                  checked={checkboxChecked}
                  disabled={checkboxDisabled}
                  onChange={() => onPayrollToggle?.(row.key)}
                  sx={{ p: 0.5, color: T.accent, "&.Mui-disabled": { opacity: 0.45 } }}
                />
              </span>
            </Tooltip>
          ) : (
            <Typography sx={{ fontSize: "0.65rem", color: T.faint }}>—</Typography>
          )}
        </TableCell>
      )}
      <TableCell sx={cellSx}>{row.employeeNumber}</TableCell>
      <TableCell sx={{ ...cellSx, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {row.name}
      </TableCell>
      <TableCell sx={cellSx}>{row.leaveCode}</TableCell>
      <TableCell sx={cellSx}>
        {row.halfDayDate || "—"}
      </TableCell>
      <TableCell sx={cellSx}>
        <Chip
          label={chipLabel}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.58rem",
            fontWeight: 800,
            fontFamily: T.poppins,
            bgcolor: chipBg,
            color: chipColor,
            border: `1px solid ${chipBorder}`,
          }}
        />
      </TableCell>
      <TableCell sx={{ ...cellSx, fontWeight: row.isDeduction ? 700 : 400 }}>
        {row.toSalaryDays != null
          ? row.isDeduction
            ? row.toSalaryDays.toFixed(3)
            : "—"
          : "—"}
      </TableCell>
      <TableCell sx={{ ...cellSx, fontWeight: row.isDeduction ? 700 : 400 }}>
        {row.hours != null ? row.hours.toFixed(3) : "—"}
      </TableCell>
      <TableCell sx={{ ...cellSx, fontSize: "0.68rem", color: T.faint }}>
        {fmtWhen(row.createdAt)}
      </TableCell>
    </TableRow>
  );
}

// ── Divider row ───────────────────────────────────────────────────────────────
export function DividerRow({ label, count, colSpan = 9 }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        sx={{
          fontFamily: T.poppins,
          fontSize: "0.62rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          py: 0.6,
          px: 1.5,
          bgcolor: T.dividerRowBg,
          color: T.faint,
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        {label}
        <Chip
          label={count}
          size="small"
          sx={{
            ml: 1,
            height: 16,
            fontSize: "0.58rem",
            fontWeight: 800,
            fontFamily: T.poppins,
            bgcolor: "rgba(0,0,0,0.06)",
            color: T.muted,
          }}
        />
      </TableCell>
    </TableRow>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SalaryShortfallRegistry({ employee, year, month }) {
  const [rows, setRows] = useState([]);
  const [attendanceResults, setAttendanceResults] = useState([]);
  const [salaryPolicyLog, setSalaryPolicyLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filterSummary = useMemo(() => {
    const m = Math.min(Math.max(parseInt(month, 10) || 1, 1), 12);
    const mo = MONTHS[m - 1] || "";
    const y = year != null && year !== "" ? String(year) : "—";
    const empPart = employee?.employeeNumber
      ? `Employee #${employee.employeeNumber}`
      : "All employees";
    return `${mo} ${y} · ${empPart}`;
  }, [employee?.employeeNumber, year, month]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    setSalaryPolicyLog([]);
    const token = localStorage.getItem("token");
    try {
      const params = { year, month };
      if (employee?.employeeNumber) params.employeeNumber = employee.employeeNumber;
      const { data } = await axios.get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setAttendanceResults(Array.isArray(data?.attendanceResults) ? data.attendanceResults : []);
      const log = data?.salaryHalfDayPolicyLog ?? data?.salaryHalfDayWithoutRegistry ?? [];
      setSalaryPolicyLog(Array.isArray(log) ? log : []);
    } catch (e) {
      setRows([]);
      setAttendanceResults([]);
      setSalaryPolicyLog([]);
      setError(
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        "Failed to load salary shortfall records",
      );
    } finally {
      setLoading(false);
    }
  }, [employee?.employeeNumber, year, month]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const mergedRows = useMemo(
    () => buildMergedRows(rows, salaryPolicyLog, attendanceResults),
    [rows, salaryPolicyLog, attendanceResults],
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
        bgcolor: "rgba(109,35,35,0.03)",
        borderRadius: "0 8px 8px 0",
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
              Salary shortfall registry
            </Typography>
            {deductionRows.length > 0 && !loading && (
              <Chip
                label={`${deductionRows.length} salary deduction${deductionRows.length === 1 ? "" : "s"}`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  fontFamily: T.poppins,
                  bgcolor: T.salaryChipBg,
                  color: T.salaryChipColor,
                  border: `1px solid ${T.salaryChipBorder}`,
                }}
              />
            )}
            {coveredRows.length > 0 && !loading && (
              <Chip
                label={`${coveredRows.length} covered by leave`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  fontFamily: T.poppins,
                  bgcolor: T.coveredChipBg,
                  color: T.coveredChipColor,
                  border: `1px solid ${T.coveredChipBorder}`,
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, mt: 0.35 }}>
            Filter: <strong>{filterSummary}</strong>
            {" · "}
            Unpaid totals use <strong>attendance_result</strong>; legacy shortfall rows appear only if not superseded.
            {" "}
            Use the <strong>ABSTRACT</strong> tab to queue <strong>attendance_result</strong> salary deductions for payroll.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            startIcon={loading ? <CircularProgress size={11} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={fetchRows}
            disabled={loading}
            sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", fontFamily: T.poppins, color: T.accent }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: "0.72rem", py: 0.25 }}>
          {error}
        </Alert>
      )}

      {/* ── Empty state ── */}
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
            No records for this filter
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, mt: 0.5, lineHeight: 1.55 }}>
            No salary deductions or leave-covered absences found for <strong>{filterSummary}</strong>.
          </Typography>
        </Alert>
      )}

      {/* ── Legend ── */}
      {!isEmpty && !loading && (
        <Box sx={{ display: "flex", gap: 2, mb: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: T.salaryBg, border: `1px solid ${T.salaryChipBorder}` }} />
            <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins }}>
              Salary deduction — absent, no leave credits left
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: T.coveredBg, border: `1px solid ${T.coveredChipBorder}` }} />
            <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins }}>
              No salary deduction — absent, leave credits absorbed it
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Table ── */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: `1px solid ${T.divider}`,
          borderRadius: 1.5,
          flex: 1,
          maxHeight: { md: "calc(100vh - 380px)" },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {["Emp #", "Name", "Leave", "Half-day date", "Status", "To salary (d)", "Hours", "Created"].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.62rem",
                    fontFamily: T.poppins,
                    bgcolor: "rgba(109,35,35,0.06)",
                    color: T.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
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
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} sx={{ color: T.accent }} />
                </TableCell>
              </TableRow>
            ) : mergedRows.length === 0 ? null : (
              <>
                {deductionRows.length > 0 && (
                  <>
                    <DividerRow label="Salary deductions" count={deductionRows.length} colSpan={8} />
                    {deductionRows.map((r) => (
                      <MergedRow key={r.key} row={r} showPayrollColumn={false} />
                    ))}
                  </>
                )}
                {coveredRows.length > 0 && (
                  <>
                    <DividerRow label="Covered by leave credits" count={coveredRows.length} colSpan={8} />
                    {coveredRows.map((r) => (
                      <MergedRow key={r.key} row={r} showPayrollColumn={false} />
                    ))}
                  </>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}