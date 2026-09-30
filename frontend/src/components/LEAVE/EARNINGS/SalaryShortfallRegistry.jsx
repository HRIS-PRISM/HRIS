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
    Checkbox,
    Tooltip,
    IconButton,
    TablePagination,
  } from "@mui/material";
  import { alpha } from "@mui/material/styles";
  import {
    Refresh as RefreshIcon,
    InfoOutlined as InfoOutlinedIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    MoneyOff as ShortfallIcon,
  } from "@mui/icons-material";

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
  /** What kind of attendance gap an entry charged: Absence, Tardiness, Half day or Manual. */
  export function deductionKindOf({ sourceKey, sourceType, leaveCode, entryType, remarks, fromHalfDayLog }) {
    const key = String(sourceKey || "").toUpperCase();
    const st = String(sourceType || "").toUpperCase();
    const code = String(leaveCode || "").toUpperCase();
    const et = String(entryType || "").toUpperCase();
    const rm = String(remarks || "").toLowerCase();
    if (fromHalfDayLog || key.startsWith("HALF_DAY") || et.includes("HALF_DAY") || rm.includes("half-day") || rm.includes("half day")) return "Half day";
    if (st.includes("TARD") || code === "TARDINESS" || et.includes("TARDINESS") || rm.includes("tardiness")) return "Tardiness";
    if (key.startsWith("MANUAL")) return "Manual";
    if (st === "ABSENT" || code === "ABSENCE" || et.includes("ABSENCE") || et.includes("ATTENDANCE") || rm.includes("absence")) return "Absence";
    return "Other";
  }

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
        // "active" | "voided" | "missing" (server: the deduction/earning it came from)
        sourceState: r.source_state || "active",
        coveredBy: r.leave_used ? String(r.leave_used).toUpperCase() : null,
        kind: deductionKindOf({ sourceKey: r.source_key, sourceType: r.source_type, remarks: r.remarks }),
        remarks: r.remarks || "",
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
        kind: deductionKindOf({ leaveCode: r.leave_code, entryType: r.entry_type, remarks: r.remarks }),
        remarks: r.remarks || "",
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
        kind: "Half day",
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

  // ── Shared look (matches the Abstract tab) ────────────────────────────────────
  const S = {
    text: "#1a1a1a",
    faint: "#8a8a8a",
    deduction: "#b3261e",
    covered: "#1e6b22",
    voided: "#9e9e9e",
    childBg: "#fcfbfb",
  };
  const rowTone = (isDeduction, allVoided) => (allVoided ? S.voided : isDeduction ? S.deduction : S.covered);

  /** Rounded status pill with a dot — same as the Abstract cards. */
  function StatusPill({ label, color, tip }) {
    const pill = (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: "2px", borderRadius: "12px", bgcolor: alpha(color, 0.09), border: `1px solid ${alpha(color, 0.25)}`, maxWidth: "100%" }}>
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
        <Typography noWrap sx={{ fontSize: "0.66rem", fontWeight: 700, color, fontFamily: T.poppins }}>{label}</Typography>
      </Box>
    );
    return tip ? <Tooltip title={tip}>{pill}</Tooltip> : pill;
  }

  const initialsOf = (name) =>
    String(name || "?").replace(/[^A-Za-z ,]/g, "").split(/[ ,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  const baseCell = {
    fontFamily: T.poppins,
    fontSize: "0.76rem",
    color: S.text,
    py: 1,
    borderBottom: `1px solid ${T.divider}`,
    verticalAlign: "middle",
  };
  const numCell = { textAlign: "right", fontVariantNumeric: "tabular-nums" };

  // ── Row component (one entry) ─────────────────────────────────────────────────
  export function MergedRow({
    row,
    showPayrollColumn = false,
    payrollChecked,
    onPayrollToggle,
    onPayroll,
    payrollChecking,
    asChild = false,
  }) {
    const isVoided = row.sourceState === "voided" || row.sourceState === "missing";
    const tone = rowTone(row.isDeduction, isVoided);
    const chipLabel = isVoided
      ? "Voided"
      : row.isDeduction
        ? "Salary deduction"
        : `Covered by ${coveredByLabel(row.coveredBy || row.leaveCode)}`;
    const chipTip = isVoided
      ? row.sourceState === "missing"
        ? "Voided — the deduction this entry came from no longer exists."
        : "Voided — the deduction or earning this entry came from was voided."
      : "";

    const cellSx = {
      ...baseCell,
      ...(asChild ? { bgcolor: S.childBg, fontSize: "0.72rem", py: 0.75 } : {}),
      ...(isVoided ? { color: S.faint } : {}),
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
      <TableRow sx={{ "&:hover td": { bgcolor: asChild ? "#f7f4f4" : "rgba(0,0,0,0.015)" } }}>
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
                    sx={{ p: 0.5, color: T.accent, "&.Mui-checked": { color: T.accent }, "&.Mui-disabled": { opacity: 0.45 } }}
                  />
                </span>
              </Tooltip>
            ) : (
              <Typography sx={{ fontSize: "0.65rem", color: S.faint }}>—</Typography>
            )}
          </TableCell>
        )}
        <TableCell sx={{ ...cellSx, pl: asChild ? 7.5 : 2 }}>
          {asChild ? (
            <Typography sx={{ fontSize: "0.72rem", color: S.faint, fontFamily: T.poppins }}>↳ entry</Typography>
          ) : (
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: T.poppins }}>{row.name}</Typography>
              <Typography sx={{ fontSize: "0.68rem", color: S.faint, fontFamily: T.poppins }}>#{row.employeeNumber}</Typography>
            </Box>
          )}
        </TableCell>
        <TableCell sx={cellSx}>
          <KindChip kind={row.kind || "Other"} tip={row.remarks || ""} />
        </TableCell>
        <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{row.leaveCode}</TableCell>
        <TableCell sx={{ ...cellSx, fontVariantNumeric: "tabular-nums" }}>{row.halfDayDate || "—"}</TableCell>
        <TableCell sx={cellSx}>
          <StatusPill label={chipLabel} color={tone} tip={chipTip} />
        </TableCell>
        <TableCell sx={{ ...cellSx, ...numCell, fontWeight: row.isDeduction ? 700 : 400, color: isVoided ? S.faint : row.isDeduction ? S.deduction : S.faint }}>
          {row.toSalaryDays != null && row.isDeduction ? row.toSalaryDays.toFixed(3) : "—"}
        </TableCell>
        <TableCell sx={{ ...cellSx, ...numCell, fontWeight: 600, ...(isVoided ? { textDecoration: "line-through" } : {}) }}>
          {row.hours != null ? row.hours.toFixed(3) : "—"}
        </TableCell>
        <TableCell sx={{ ...cellSx, fontSize: "0.68rem", color: S.faint }}>
          {fmtWhen(row.createdAt)}
        </TableCell>
      </TableRow>
    );
  }

  const KIND_STYLE = {
    Absence: { bg: "#fdeaed", fg: "#b4283f" },
    Tardiness: { bg: "#fdebc8", fg: "#8a5d06" },
    "Half day": { bg: "rgba(124,58,237,0.12)", fg: "#6d28d9" },
    Manual: { bg: "rgba(0,0,0,0.06)", fg: "#555" },
    Other: { bg: "rgba(0,0,0,0.06)", fg: "#555" },
  };
  export function KindChip({ kind, count, tip }) {
    const st = KIND_STYLE[kind] || KIND_STYLE.Other;
    const chip = (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: 0.9, py: "2px", borderRadius: "6px", fontSize: "0.64rem", fontWeight: 700, fontFamily: T.poppins, bgcolor: st.bg, color: st.fg, whiteSpace: "nowrap" }}>
        {kind}
        {count != null && (
          <Box component="span" sx={{ px: 0.5, borderRadius: "4px", bgcolor: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>{count}</Box>
        )}
      </Box>
    );
    return tip ? <Tooltip title={tip}>{chip}</Tooltip> : chip;
  }

  const COVER_LABELS = { VL: "VL", SL: "SL", SC: "SC", CTO: "CTO" };
  /** "VL" → "VL"; unknown or empty → "Leave". */
  export function coveredByLabel(code) {
    const c = String(code || "").trim().toUpperCase();
    return COVER_LABELS[c] || (c && c !== "—" && c !== "NONE" ? c : "Leave");
  }
  const rowIsVoided = (r) => r.sourceState === "voided" || r.sourceState === "missing";

  /**
   * One summary row per employee with a dropdown for their individual entries.
   * Totals and "Covered by" use active entries only; voided entries are counted separately.
   */
  /** [[employeeNumber, entries[]], …] in first-seen order. */
  export function groupByEmployee(rows) {
    const map = new Map();
    for (const r of rows) {
      const k = String(r.employeeNumber || "").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return [...map.entries()];
  }

  /** Entries shown in an open dropdown before "Show all". */
  const CHILD_PREVIEW = 15;

  /** Table columns (Employee combines Emp # and Name). */
  const COLUMN_COUNT = 8;

  export function EmployeeGroupRows({ groups }) {
    const [open, setOpen] = useState({});
    const [showAll, setShowAll] = useState({});

    return groups.map(([emp, list]) => {
      const active = list.filter((r) => !rowIsVoided(r));
      const voidedCount = list.length - active.length;
      const isDeduction = list[0]?.isDeduction;
      const allVoided = active.length === 0;
      const tone = rowTone(isDeduction, allVoided);
      const pools = [...new Set(active.map((r) => coveredByLabel(r.coveredBy || r.leaveCode)))];
      const dates = list.map((r) => r.halfDayDate).filter(Boolean).sort();
      const hours = active.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
      const toSalary = active.reduce((sum, r) => sum + (Number(r.toSalaryDays) || 0), 0);
      const latest = list.map((r) => r.createdAt).filter(Boolean).sort().pop();
      const kindCounts = ["Absence", "Tardiness", "Half day", "Manual", "Other"]
        .map((k) => [k, active.filter((r) => (r.kind || "Other") === k).length])
        .filter(([, n]) => n > 0);
      const isOpen = Boolean(open[emp]);
      const toggle = () => setOpen((o) => ({ ...o, [emp]: !o[emp] }));
      const statusLabel = allVoided
        ? "Voided"
        : isDeduction
          ? "Salary deduction"
          : `Covered by ${pools.join(", ")}`;
      const name = list[0]?.name;
      const cellSx = { ...baseCell, ...(isOpen ? { bgcolor: alpha(tone, 0.035) } : {}) };

      return (
        <React.Fragment key={emp}>
          <TableRow
            hover
            onClick={toggle}
            sx={{ cursor: "pointer", "&:hover td": { bgcolor: alpha(tone, 0.04) } }}
          >
            {/* Employee — coloured left edge shows the row type */}
            <TableCell sx={{ ...cellSx, pl: 1, boxShadow: `inset 4px 0 0 ${tone}` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <IconButton
                  size="small"
                  aria-label={isOpen ? `Hide entries for ${emp}` : `Show entries for ${emp}`}
                  aria-expanded={isOpen}
                  onClick={(e) => { e.stopPropagation(); toggle(); }}
                  sx={{ p: 0.25, ml: 0.5, color: S.faint }}
                >
                  {isOpen ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
                </IconButton>
                <Box sx={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, bgcolor: alpha(tone, 0.1), color: tone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 800, fontFamily: T.poppins }}>
                  {initialsOf(name)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 700, color: S.text, fontFamily: T.poppins, maxWidth: 200 }}>{name || "—"}</Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: S.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>#{emp}</Typography>
                </Box>
              </Box>
            </TableCell>
            <TableCell sx={cellSx}>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {kindCounts.length ? kindCounts.map(([k, n]) => <KindChip key={k} kind={k} count={n} />) : "—"}
              </Box>
            </TableCell>
            <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{pools.join(" · ") || "—"}</TableCell>
            <TableCell sx={cellSx}>
              <Typography sx={{ fontSize: "0.76rem", fontWeight: 600, fontFamily: T.poppins }}>
                {list.length} {list.length === 1 ? "entry" : "entries"}
              </Typography>
              {dates.length > 0 && (
                <Typography sx={{ fontSize: "0.66rem", color: S.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
                  {dates[0]}{dates.length > 1 && dates[dates.length - 1] !== dates[0] ? ` → ${dates[dates.length - 1]}` : ""}
                </Typography>
              )}
            </TableCell>
            <TableCell sx={cellSx}>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                <StatusPill label={statusLabel} color={tone} />
                {voidedCount > 0 && !allVoided && (
                  <Box component="span" sx={{ px: 0.75, borderRadius: "5px", bgcolor: "rgba(0,0,0,0.06)", fontSize: "0.6rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>
                    {voidedCount} voided
                  </Box>
                )}
              </Box>
            </TableCell>
            <TableCell sx={{ ...cellSx, ...numCell, fontWeight: 800, fontSize: "0.84rem", color: isDeduction && !allVoided ? S.deduction : S.faint }}>
              {isDeduction ? toSalary.toFixed(3) : "—"}
            </TableCell>
            <TableCell sx={{ ...cellSx, ...numCell, fontWeight: 700 }}>{hours.toFixed(3)}</TableCell>
            <TableCell sx={{ ...cellSx, fontSize: "0.68rem", color: S.faint }}>{fmtWhen(latest)}</TableCell>
          </TableRow>
          {isOpen &&
            (showAll[emp] ? list : list.slice(0, CHILD_PREVIEW)).map((r) => (
              <MergedRow key={r.key} row={r} showPayrollColumn={false} asChild />
            ))}
          {isOpen && list.length > CHILD_PREVIEW && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0.5, pl: 7.5, bgcolor: S.childBg, borderBottom: `1px solid ${T.divider}` }}>
                <Button
                  size="small"
                  onClick={() => setShowAll((o) => ({ ...o, [emp]: !o[emp] }))}
                  sx={{ textTransform: "none", fontFamily: T.poppins, fontSize: "0.68rem", fontWeight: 700, color: T.accent }}
                >
                  {showAll[emp] ? "Show fewer" : `Show all ${list.length} entries`}
                </Button>
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      );
    });
  }

  // ── Section divider row ───────────────────────────────────────────────────────
  export function DividerRow({ label, count, colSpan = COLUMN_COUNT, color = S.faint }) {
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          sx={{ py: 0.75, px: 2, bgcolor: "#faf8f8", borderBottom: `1px solid ${T.divider}` }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: color }} />
            <Typography sx={{ fontFamily: T.poppins, fontSize: "0.64rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color }}>
              {label}
            </Typography>
            <Box sx={{ px: 0.75, borderRadius: "10px", bgcolor: alpha(color, 0.1), fontSize: "0.62rem", fontWeight: 800, color, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
              {count}
            </Box>
          </Box>
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

    // ── Pagination by employee (one summary row = one item) ──
    const deductionGroups = useMemo(() => groupByEmployee(deductionRows), [deductionRows]);
    const coveredGroups = useMemo(() => groupByEmployee(coveredRows), [coveredRows]);
    const allGroups = useMemo(
      () => [
        ...deductionGroups.map((g) => ({ section: "deduction", g })),
        ...coveredGroups.map((g) => ({ section: "covered", g })),
      ],
      [deductionGroups, coveredGroups],
    );
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    useEffect(() => {
      setPage(0);
    }, [employee?.employeeNumber, year, month]);
    useEffect(() => {
      const last = Math.max(0, Math.ceil(allGroups.length / rowsPerPage) - 1);
      if (page > last) setPage(last);
    }, [allGroups.length, rowsPerPage, page]);
    const pageItems = allGroups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const pageDeductionGroups = pageItems.filter((x) => x.section === "deduction").map((x) => x.g);
    const pageCoveredGroups = pageItems.filter((x) => x.section === "covered").map((x) => x.g);

    const headCell = {
      fontFamily: T.poppins,
      fontSize: "0.6rem",
      fontWeight: 700,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: S.faint,
      bgcolor: "#fff",
      py: 1,
      borderBottom: `1px solid ${T.divider}`,
      whiteSpace: "nowrap",
    };

    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "#fff", fontFamily: T.poppins }}>
        {/* ── Header: title + summary numbers ── */}
        <Box
          sx={{
            px: 2.5, py: 1.75, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap",
            borderBottom: `1px solid ${T.divider}`,
            background: "linear-gradient(180deg, rgba(109,35,35,0.035) 0%, #fff 100%)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: "10px", bgcolor: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${alpha(T.accent, 0.25)}` }}>
              <ShortfallIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: S.text, fontFamily: T.poppins, lineHeight: 1.2 }}>
                Salary Shortfall
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: S.faint, fontFamily: T.poppins }}>
                {filterSummary} — absences and tardiness, and whether leave credits covered them
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "stretch", gap: 1 }}>
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5 }}>
                <CircularProgress size={16} sx={{ color: T.accent }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>Loading…</Typography>
              </Box>
            ) : (
              [
                { label: "Employees", value: allGroups.length, color: S.text },
                { label: "Deductions", value: deductionRows.length, color: S.deduction },
                { label: "Covered", value: coveredRows.length, color: S.covered },
              ].map((s) => (
                <Box key={s.label} sx={{ minWidth: 84, px: 1.5, py: 0.75, borderRadius: "10px", border: `1px solid ${T.divider}`, bgcolor: "#fff" }}>
                  <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: s.color, fontFamily: T.poppins, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: S.faint, fontFamily: T.poppins, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {s.label}
                  </Typography>
                </Box>
              ))
            )}
            <Tooltip title="Refresh">
              <span style={{ display: "flex" }}>
                <IconButton
                  onClick={fetchRows}
                  disabled={loading}
                  sx={{ alignSelf: "center", border: `1px solid ${T.divider}`, borderRadius: "8px", color: T.muted, "&:hover": { color: T.accent, borderColor: alpha(T.accent, 0.3), bgcolor: alpha(T.accent, 0.05) } }}
                >
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* ── One-line note ── */}
        <Box sx={{ px: 2.5, py: 0.9, display: "flex", alignItems: "center", gap: 0.75, borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
          <InfoOutlinedIcon sx={{ fontSize: 15, color: alpha(T.accent, 0.6), flexShrink: 0 }} />
          <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.45 }}>
            Unpaid totals come from <strong>attendance_result</strong>; older shortfall rows show only when not superseded.
            Queue salary deductions for payroll from the <strong>Abstract</strong> tab.
          </Typography>
        </Box>

        {/* ── Error ── */}
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mt: 1.25, fontSize: "0.74rem", py: 0.25, borderRadius: "10px" }}>
            {error}
          </Alert>
        )}

        {/* ── Empty state ── */}
        {isEmpty && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 3, py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: alpha(T.accent, 0.06), display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 30, color: alpha(T.accent, 0.4) }} />
            </Box>
            <Typography sx={{ fontSize: "0.92rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, mb: 0.5 }}>
              No records for {filterSummary}
            </Typography>
            <Typography sx={{ fontSize: "0.76rem", color: S.faint, fontFamily: T.poppins }}>
              No salary deductions or leave-covered absences were found.
            </Typography>
          </Box>
        )}

        {/* ── Table ── */}
        {!isEmpty && (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "#faf8f8", p: 2 }}>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                flex: 1,
                minHeight: 0,
                border: `1px solid ${T.divider}`,
                borderRadius: "12px",
                maxHeight: { md: "calc(100vh - 420px)" },
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
                <TableHead>
                  <TableRow>
                    {[
                      { h: "Employee", sx: { pl: 2, minWidth: 230 } },
                      { h: "Type" },
                      { h: "Leave / covered by" },
                      { h: "Entries / date" },
                      { h: "Status" },
                      { h: "To salary (d)", sx: { textAlign: "right" } },
                      { h: "Hours", sx: { textAlign: "right" } },
                      { h: "Updated" },
                    ].map(({ h, sx }) => (
                      <TableCell key={h} sx={{ ...headCell, ...sx }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={COLUMN_COUNT} align="center" sx={{ py: 5, borderBottom: "none" }}>
                        <CircularProgress size={22} sx={{ color: T.accent }} />
                      </TableCell>
                    </TableRow>
                  ) : mergedRows.length === 0 ? null : (
                    <>
                      {pageDeductionGroups.length > 0 && (
                        <>
                          <DividerRow label="Salary deductions" count={deductionRows.length} color={S.deduction} />
                          <EmployeeGroupRows groups={pageDeductionGroups} />
                        </>
                      )}
                      {pageCoveredGroups.length > 0 && (
                        <>
                          <DividerRow label="Covered by leave credits" count={coveredRows.length} color={S.covered} />
                          <EmployeeGroupRows groups={pageCoveredGroups} />
                        </>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {!loading && allGroups.length > 0 && (
              <TablePagination
                component="div"
                count={allGroups.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Employees per page:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count} employees`}
                sx={{
                  flexShrink: 0,
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiInputBase-root": { fontFamily: T.poppins, fontSize: "0.74rem" },
                }}
              />
            )}
          </Box>
        )}
      </Box>
    );
  }
