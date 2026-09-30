// ─── CTODeductionReceipt.jsx — Updated ───────────────────────────────────────
// Changes:
//  1. Step 1 cards are now collapsible dropdown panels (accordion-style)
//  2. Step 2 number circle is now visible (#2)
//  3. Step 3 restyled to match Step 1/2 aesthetics
//  4. AttendanceSummary tip text is compact/professional (applied via prop pattern)
//  5. Half-day/absent info is shown in EditModal via a tip banner
//  FIX: VL is now force-injected into absenceOptionsUi and tardinessOptionsUi
//       so employees without VL in /api/deductions/options still see it as an option.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import { isScEarningVoided } from "../serviceCreditBalanceUtils";
import {
  D,
  DeductionDialog,
  DSection,
  EmployeeStrip,
  Tag,
  StatRow,
  AmountLine,
  BalanceAfter,
  NoteToggle,
  ConfirmBlock,
  DialogFooter,
  hoursToClock,
} from "./DeductionDialogKit";
import { applyCategoryToDeductionOptions } from "../../../utils/cscLeaveRules";
import {
  employmentCategoryAllowsCompensatoryTimeOff,
  employmentCategoryLabel,
} from "../../../utils/earningsEmpCatRules";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Alert,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Collapse,
  Checkbox,
  FormControlLabel,
  InputLabel,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  WorkHistory as SCIcon,
  AccessTime as CTOIcon,
  Close,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  Refresh as RefreshIcon,
  RemoveCircleOutline as DeductIcon,
  Receipt as ReceiptIcon,
  Policy as PolicyIcon,
  MoneyOff as MoneyOffIcon,
  InfoOutlined as InfoOutlinedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  EventNote as LeaveIcon,
  Pending as PendingIcon,
  Save as SaveIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from "@mui/icons-material";
import { useOfficialAttendanceMetrics } from "./useOfficialAttendanceMetrics";
import { listAbsentDatesFromDailyRows } from "../../../utils/officialAttendanceFromDailyRows";
import {
  fetchDeductionCreditSnapshots,
  getDeductionSourceBalanceDays,
  isDeductionSourceSufficient,
  canApplyAttendanceDeductionToCreditSource,
} from "../../../utils/deductionSourceBalances";

/** Skip sentinel */
const DEDUCTION_SKIP_VALUE = "__DEDUCTION_SKIP__";
const NO_ABSENCES_RECORDED_MESSAGE = "No absences — no deduction.";

const isDeductionSkipSource = (v) => String(v ?? "").trim() === DEDUCTION_SKIP_VALUE;

const humanizeDeductionCharge = (src) => {
  if (isDeductionSkipSource(src)) return "Skipped";
  const u = String(src ?? "").trim().toUpperCase();
  if (u === "SALARY_DEDUCTION") return "Salary";
  return u || "—";
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.12)",
  balOk: "#2e7d32",
  balBad: "#c62828",
  headerGrad: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider: "rgba(0,0,0,0.08)",
  surface: "#ffffff",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#888888",
  poppins: "'Poppins', sans-serif",
};

const MONTHS = [
  { value: "1", label: "January" },{ value: "2", label: "February" },
  { value: "3", label: "March" },{ value: "4", label: "April" },
  { value: "5", label: "May" },{ value: "6", label: "June" },
  { value: "7", label: "July" },{ value: "8", label: "August" },
  { value: "9", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
];

const monthName = (m) => MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;

/** Balance pill shown beside a charge option (null balance → no pill). */
const BalancePill = ({ text, color }) => (
  <Box component="span" sx={{ px: 0.75, py: "1px", borderRadius: 99, fontSize: "0.62rem", fontWeight: 700, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums", color, bgcolor: `${color}14`, flexShrink: 0 }}>
    {text}
  </Box>
);

/**
 * Compact "charged to" picker: caption above, borderless-card select with the option's balance as a pill.
 * describe(o) → { text, color } for the pill, or null for none.
 */
const ChargeSourceField = ({ id, label, value, onChange, disabled, options, skipValue, describe }) => {
  const selected = options.find((o) => o.value === value);
  const pill = selected && selected.value !== skipValue ? describe(selected) : null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="label" htmlFor={id} sx={{ display: "block", mb: 0.4, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: T.faint, fontFamily: T.poppins }}>
        {label}
      </Typography>
      <Select
        id={id}
        fullWidth
        size="small"
        displayEmpty
        value={value}
        onChange={onChange}
        disabled={disabled}
        renderValue={() => (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, minWidth: 0 }}>
            <Typography component="span" sx={{ fontSize: "0.74rem", fontWeight: 600, fontFamily: T.poppins, color: selected && selected.value !== skipValue ? T.text : T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected?.label || "Select…"}
            </Typography>
            {pill && <BalancePill text={pill.text} color={pill.color} />}
          </Box>
        )}
        sx={{
          borderRadius: "8px",
          bgcolor: "#fff",
          fontFamily: T.poppins,
          "& .MuiSelect-select": { py: "6px", pl: "10px" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: T.divider },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: 1 },
          "& .MuiSvgIcon-root": { fontSize: 18, color: T.faint },
        }}
      >
        {options.map((o) => {
          if (o.value === skipValue) {
            return (
              <MenuItem key={o.value} value={o.value}>
                <Typography sx={{ fontSize: "0.74rem", fontFamily: T.poppins, color: T.muted }}>{o.label}</Typography>
              </MenuItem>
            );
          }
          const p = describe(o);
          return (
            <MenuItem key={o.value} value={o.value} sx={{ py: 0.6 }}>
              <Box sx={{ width: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, width: "100%" }}>
                  <Typography sx={{ fontSize: "0.74rem", fontFamily: T.poppins, flex: 1, minWidth: 0 }}>{o.label}</Typography>
                  {p && <BalancePill text={p.text} color={p.color} />}
                </Box>
                {o.existingBalanceOnly && (
                  <Typography sx={{ fontSize: "0.62rem", color: "#8a5d06", fontFamily: T.poppins, whiteSpace: "normal" }}>Existing balance only · not earned by this category</Typography>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Select>
      {selected?.existingBalanceOnly && (
        <Typography sx={{ mt: 0.5, fontSize: "0.64rem", color: "#8a5d06", fontFamily: T.poppins, lineHeight: 1.35 }}>
          {selected.categoryNote}
        </Typography>
      )}
    </Box>
  );
};
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const parseHHMM = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return Number(parts[0]) + Number(parts[1] || 0) / 60 + Number(parts[2] || 0) / 3600;
  }
  return parseFloat(str) || 0;
};

const hoursToHHMM = (h) => {
  const total = Math.round(h * 3600);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
};
const hrsToHMS = (h) => hoursToHHMM(Math.abs(h));

const normalizeHalfDayDateKey = (d) => {
  const s = String(d ?? "").trim().split("T")[0];
  const parts = s.split("-").filter(Boolean);
  if (parts.length !== 3) return s;
  const y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), day = parseInt(parts[2], 10);
  if (![y,mo,day].every((n) => Number.isFinite(n))) return s;
  return `${y}-${String(mo).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
};

const formatHalfDayHeading = (iso) => {
  if (!iso) return "";
  try {
    const s = String(iso);
    const d = new Date(s.includes("T") ? s : `${s.slice(0,10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  } catch { return String(iso); }
};

const fmtDays3 = (n, { allowNegZero = true } = {}) => {
  const fixed = Number(toNum(n).toFixed(3));
  const safe = (!allowNegZero && Object.is(fixed, -0)) ? 0 : fixed;
  return `${safe.toFixed(3)} d`;
};

// ─── StepNum ──────────────────────────────────────────────────────────────────
const StepNum = ({ n, done = false }) => (
  <Box sx={{
    width: 20, height: 20, borderRadius: "50%",
    bgcolor: done ? "#2e7d32" : T.accent,
    color: "#fff",
    fontSize: "0.68rem", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, fontFamily: T.poppins,
    boxShadow: `0 1px 4px ${alpha(done ? "#2e7d32" : T.accent, 0.35)}`,
  }}>
    {done ? <CheckIcon sx={{ fontSize: 11 }} /> : n}
  </Box>
);

// ─── SBadge ───────────────────────────────────────────────────────────────────
const SBadge = ({ label, approved }) => (
  <Chip size="small" label={label || (approved ? "Applied" : "Pending")}
    sx={{
      height: 16, fontSize: "0.56rem", fontWeight: 700,
      bgcolor: approved ? "rgba(46,125,50,0.14)" : "rgba(255,160,0,0.14)",
      color: approved ? "#1b5e20" : "#7a4a00",
      border: `1px solid ${approved ? "rgba(46,125,50,0.28)" : "rgba(255,160,0,0.28)"}`,
    }}
  />
);

// ─── R (receipt row) ──────────────────────────────────────────────────────────
const R = ({ label, value, valueColor, sub, bold, faded }) => (
  <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", opacity: faded ? 0.5 : 1, mb: 0.4 }}>
    <Box sx={{ flex:1, minWidth:0 }}>
      <Typography sx={{ fontSize: bold ? "0.67rem" : "0.65rem", fontWeight: bold ? 700 : 500, color: "#2a2a2a", fontFamily: T.poppins, lineHeight: 1.4 }}>
        {label}
      </Typography>
      {sub && <Typography sx={{ fontSize:"0.57rem", color: T.faint, fontFamily: T.poppins, lineHeight:1.3, mt:0.1 }}>{sub}</Typography>}
    </Box>
    {value !== undefined && (
      <Typography sx={{ fontSize: bold ? "0.82rem" : "0.7rem", fontWeight: bold ? 900 : 600, color: valueColor || "#1a1a1a", fontFamily: T.poppins, ml:1, flexShrink:0, lineHeight:1.4 }}>
        {value}
      </Typography>
    )}
  </Box>
);

// ─── BalanceFooter ────────────────────────────────────────────────────────────
const BalanceFooter = ({ bal, label }) => {
  const color = bal < 0 ? "#c62828" : bal === 0 ? "#7a4a00" : "#1e4d20";
  return (
    <Box sx={{ px:1.25, py:0.85, borderTop:"1.5px solid rgba(109,35,35,0.14)",
      bgcolor: bal < 0 ? "rgba(198,40,40,0.05)" : bal === 0 ? "rgba(122,74,0,0.05)" : "rgba(30,77,32,0.05)",
      display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      {label && <Typography sx={{ fontSize:"0.62rem", fontWeight:700, color:"#555", fontFamily:T.poppins, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</Typography>}
      <Typography sx={{ fontSize:"0.8rem", fontWeight:900, color, fontFamily:T.poppins, ml:"auto" }}>{bal.toFixed(3)} d</Typography>
    </Box>
  );
};

// ─── CollapsibleLedger ────────────────────────────────────────────────────────
const CollapsibleLedger = ({
  title, valueLabel, valueColor, statusBadge, outline, children, footer, defaultOpen = false,
  open: openProp, onToggle,
}) => {
  const [openState, setOpenState] = useState(defaultOpen);
  // Controlled when `open` is passed, so side-by-side ledgers can open together.
  const open = openProp ?? openState;
  const toggle = () => (onToggle ? onToggle(!open) : setOpenState((p) => !p));

  const borderColor =
    outline === "success" ? "rgba(46,125,50,0.45)"
    : outline === "warning" ? "rgba(230,81,0,0.38)"
    : "rgba(0,0,0,0.1)";
  const headerBg =
    outline === "success" ? "rgba(46,125,50,0.07)"
    : outline === "warning" ? "rgba(230,81,0,0.06)"
    : "rgba(0,0,0,0.025)";

  return (
    <Box sx={{ border:`1px solid ${borderColor}`, borderRadius:1.5, overflow:"hidden", flex:1, minWidth:0, bgcolor:"#fff", display:"flex", flexDirection:"column" }}>
      <Box
        onClick={toggle}
        sx={{
          px:1.4, py:0.9, bgcolor:headerBg,
          borderBottom: open ? `1px solid ${borderColor}` : "none",
          display:"flex", alignItems:"center", gap:1,
          cursor:"pointer", userSelect:"none", transition:"background 0.14s",
          "&:hover": { bgcolor: open ? headerBg : "rgba(0,0,0,0.04)" },
        }}
      >
        <Box sx={{ flex:1, minWidth:0 }}>
          <Typography sx={{ fontSize:"0.7rem", fontWeight:700, color:T.text, fontFamily:T.poppins, lineHeight:1.2 }}>
            {title}
          </Typography>
        </Box>
        {statusBadge && <Box sx={{ flexShrink:0 }}>{statusBadge}</Box>}
        <Typography sx={{ fontSize:"0.85rem", fontWeight:900, color:valueColor||T.text, fontFamily:T.poppins, flexShrink:0, mr:0.5 }}>
          {valueLabel}
        </Typography>
        {open
          ? <ExpandLessIcon sx={{ fontSize:15, color:T.faint, flexShrink:0 }} />
          : <ExpandMoreIcon sx={{ fontSize:15, color:T.faint, flexShrink:0 }} />
        }
      </Box>
      {/* Body stretches to the card height so the footer (new balance) sits at the bottom, level with its neighbour. */}
      <Collapse
        in={open}
        sx={{
          flex: open ? 1 : "none",
          display: "flex",
          flexDirection: "column",
          "& > .MuiCollapse-wrapper": { flex: 1, display: "flex" },
          "& .MuiCollapse-wrapperInner": { flex: 1, display: "flex", flexDirection: "column" },
        }}
      >
        <Box sx={{ flex:1, display:"flex", flexDirection:"column" }}>
          <Box sx={{ px:"11px", py:"8px", flex:1 }}>{children}</Box>
          {footer && <Box sx={{ flexShrink:0 }}>{footer}</Box>}
        </Box>
      </Collapse>
    </Box>
  );
};

// ─── Main CTODeductionReceipt ─────────────────────────────────────────────────
const LEAVE_OVERLAY = {
  border: "rgba(21,101,192,0.35)",
  bg: "rgba(21,101,192,0.08)",
  color: "#1565C0",
};

const resolveHalfDayLeaveOverlay = (dateKey, leaveByDate, filedLeaveByDate) => {
  const hr = leaveByDate?.[dateKey];
  if (hr) {
    const title = hr.title || hr.label || "Leave";
    return {
      kind: "on_leave",
      label: "On Leave",
      detail: title,
      sub: "HR-approved leave — deduct via Leave Request, not earnings",
    };
  }
  const filed = filedLeaveByDate?.[dateKey];
  if (filed) {
    const desc = filed.leave_description || filed.leave_code || "Leave";
    const code = filed.leave_code ? ` (${filed.leave_code})` : "";
    return {
      kind: "on_leave",
      label: "On Leave",
      detail: `${desc}${code}`,
      sub: `${filed.statusLabel || "Leave filed"} — use Leave Request module`,
    };
  }
  return null;
};

const CTODeductionReceipt = ({
  employee, attendanceData, year, month, onDeductSuccess, refreshKey, empCat,
  onDeductHalfDayVLRequested, halfDayDeductDate, halfDayPendingDates,
  deductedVlHalfDates = [], leaveByDate = {}, filedLeaveByDate = {},
  metricsTardinessHrs, metricsAbsentDays,
  cscCategory = null, onStatusChange = null,
}) => {
  const [absenceDeductionOptions, setAbsenceDeductionOptions] = useState([]);
  const [tardinessDeductionOptions, setTardinessDeductionOptions] = useState([]);
  const [absenceSource, setAbsenceSource] = useState("CTO");
  const [tardinessSource, setTardinessSource] = useState("VL");
  const [deductionOptionsLoading, setDeductionOptionsLoading] = useState(false);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeductionAcknowledged, setConfirmDeductionAcknowledged] = useState(false);
  const [salaryOnlyModalOpen, setSalaryOnlyModalOpen] = useState(false);
  const [salaryOnlySubmitting, setSalaryOnlySubmitting] = useState(false);
  const [salaryOnlyModalError, setSalaryOnlyModalError] = useState("");
  const [deductSource, setDeductSource] = useState(null);
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState("");
  const [deductSuccess, setDeductSuccess] = useState("");
  const [remark, setRemark] = useState("");
  const [policySelection, setPolicySelection] = useState(null);
  const [ctoBalance, setCtoBalance] = useState(null);
  const [vlBalance, setVlBalance] = useState(null);
  const [scBuffer, setScBuffer] = useState(0);
  const [balLoading, setBalLoading] = useState(false);
  /** Absence and tardiness offset cards open/close together so their balances line up. */
  const [offsetsOpen, setOffsetsOpen] = useState(false);
  const [existingCtoDeductions, setExistingCtoDeductions] = useState([]);
  const [existingTardinessDeductions, setExistingTardinessDeductions] = useState([]);
  const [existingAbsenceLeaveDeductions, setExistingAbsenceLeaveDeductions] = useState([]);
  const [existingScDeductions, setExistingScDeductions] = useState([]);
  const [deductionsLoading, setDeductionsLoading] = useState(false);
  const [periodSalaryShortfallRows, setPeriodSalaryShortfallRows] = useState([]);

  // ── Fetch balances ──────────────────────────────────────────────────────────
  const fetchBalances = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) { setCtoBalance(null); setVlBalance(null); setScBuffer(0); setAssignmentMap({}); return; }
    if (!silent) setBalLoading(true);
    const token = localStorage.getItem("token");
    try {
      const snapshots = await fetchDeductionCreditSnapshots(employee.employeeNumber, token);
      const map =
        snapshots?.assignmentMap && typeof snapshots.assignmentMap === "object"
          ? snapshots.assignmentMap
          : {};
      setAssignmentMap(map);
      setVlBalance(toNum(map?.VL?.remaining_hours) / 8);
      setCtoBalance(toNum(snapshots?.ctoRemainingHours) / 8);
      setScBuffer(toNum(snapshots?.scRemainingHours) / 8);
    } catch {
      setAssignmentMap({});
      setCtoBalance(0);
      setVlBalance(0);
      setScBuffer(0);
    } finally {
      if (!silent) setBalLoading(false);
    }
  }, [employee]);

  // ── Fetch existing deductions ───────────────────────────────────────────────
  const fetchExistingDeductions = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) {
      setExistingCtoDeductions([]); setExistingTardinessDeductions([]);
      setExistingAbsenceLeaveDeductions([]); setExistingScDeductions([]);
      return;
    }
    if (!silent) setDeductionsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [ctoRes, leaveRes, scRes, tardPostedRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_credit_usage/tardiness_posted`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { employeeNumber: employee.employeeNumber, period_year: year, period_month: month },
        }),
      ]);
      const ctoEarn = ctoRes.status==="fulfilled" ? ctoRes.value.data?.earnings||[] : [];
      const ctoLedger = ctoRes.status==="fulfilled" ? ctoRes.value.data?.ledger_cto_deductions||[] : [];
      setExistingCtoDeductions([
        // Voided rows (e.g. rolled back by Leave Assignment → Void) no longer cover anything.
        ...ctoEarn.filter((e) => e.entry_type==="DEDUCTION" && e.earn_status!=="rejected" && !isScEarningVoided(e)),
        ...ctoLedger,
      ]);
      const postedHours = tardPostedRes.status==="fulfilled" ? toNum(tardPostedRes.value.data?.posted_hours) : 0;
      const lastLeaveCode = tardPostedRes.status==="fulfilled" && tardPostedRes.value.data?.last_leave_code
        ? String(tardPostedRes.value.data.last_leave_code).trim() : "";
      const leaveAll = leaveRes.status==="fulfilled" ? leaveRes.value.data?.earnings||[] : [];
      const pendingTardiness = leaveAll.filter((e)=>e.entry_type==="TARDINESS_DEDUCTION"&&e.earn_status==="pending"&&!isScEarningVoided(e));
      const syntheticTard = postedHours>1e-9 ? [{
        id:`lcu-tard-all-${year}-${month}`, employee_number:employee.employeeNumber,
        leave_code:lastLeaveCode||"VL", earned_hours:-postedHours,
        period_year:parseInt(year,10), period_month:parseInt(month,10),
        entry_type:"TARDINESS_DEDUCTION", earn_status:"approved",
        remarks:"Tardiness offset (leave credit ledger)", _ledgerTardinessSynthetic:true,
      }] : [];
      setExistingTardinessDeductions([...pendingTardiness,...syntheticTard]);
      setExistingAbsenceLeaveDeductions(
        leaveRes.status==="fulfilled"
          ? (leaveRes.value.data?.earnings||[]).filter((e)=>e.entry_type==="DEDUCTION"&&e.earn_status!=="rejected"&&!isScEarningVoided(e)&&String(e.remarks||"").includes("Absence offset"))
          : []
      );
      const scEarn = scRes.status==="fulfilled" ? scRes.value.data?.earnings||[] : [];
      const scLedger = scRes.status==="fulfilled" ? scRes.value.data?.ledger_sc_deductions||[] : [];
      setExistingScDeductions([
        ...scEarn.filter(
          (e) =>
            e.entry_type === "DEDUCTION" &&
            e.earn_status !== "rejected" &&
            !isScEarningVoided(e),
        ),
        ...scLedger,
      ]);
    } catch {
      setExistingCtoDeductions([]); setExistingTardinessDeductions([]);
      setExistingAbsenceLeaveDeductions([]); setExistingScDeductions([]);
    } finally { if (!silent) setDeductionsLoading(false); }
  }, [employee, year, month]);

  useEffect(() => { fetchBalances({silent:false}); fetchExistingDeductions({silent:false}); }, [fetchBalances, fetchExistingDeductions]);
  useEffect(() => {
    if (refreshKey===0||!employee) return;
    fetchBalances({silent:true}); fetchExistingDeductions({silent:true});
  }, [refreshKey, employee, fetchBalances, fetchExistingDeductions]);

  const fetchPeriodSalaryShortfall = useCallback(async () => {
    if (!employee?.employeeNumber) { setPeriodSalaryShortfallRows([]); return; }
    const token = localStorage.getItem("token");
    try {
      const {data} = await axios.get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers:{Authorization:`Bearer ${token}`},
        params:{employeeNumber:String(employee.employeeNumber).trim(),year,month},
      });
      setPeriodSalaryShortfallRows(Array.isArray(data?.rows)?data.rows:[]);
    } catch { setPeriodSalaryShortfallRows([]); }
  }, [employee?.employeeNumber,year,month]);

  useEffect(()=>{fetchPeriodSalaryShortfall();},[fetchPeriodSalaryShortfall]);
  useEffect(()=>{if(refreshKey===0||!employee?.employeeNumber)return;fetchPeriodSalaryShortfall();},[refreshKey,fetchPeriodSalaryShortfall,employee?.employeeNumber]);

  // ── Deduction options ───────────────────────────────────────────────────────
  useEffect(()=>{
    let alive=true;
    (async()=>{
      if(!employee?.employeeNumber){setAbsenceDeductionOptions([]);setTardinessDeductionOptions([]);return;}
      setDeductionOptionsLoading(true);
      const token=localStorage.getItem("token");
      const headers={Authorization:`Bearer ${token}`};
      const emp=String(employee.employeeNumber).trim();
      try{
        const[absRes,tarRes]=await Promise.all([
          axios.get(`${API_BASE_URL}/api/deductions/options`,{params:{employeeNumber:emp,context:"ABSENCE",hasLeaveForm:"true"},headers}),
          axios.get(`${API_BASE_URL}/api/deductions/options`,{params:{employeeNumber:emp,context:"TARDINESS",hasLeaveForm:"true"},headers}),
        ]);
        if(!alive)return;
        setAbsenceDeductionOptions(Array.isArray(absRes.data?.options)?absRes.data.options:[]);
        setTardinessDeductionOptions(Array.isArray(tarRes.data?.options)?tarRes.data.options:[]);
      }catch{if(alive){setAbsenceDeductionOptions([]);setTardinessDeductionOptions([]);}}
      finally{if(alive)setDeductionOptionsLoading(false);}
    })();
    return()=>{alive=false;};
  },[employee?.employeeNumber]);

  useEffect(()=>{
    if(refreshKey===0||!employee?.employeeNumber)return;
    let alive=true;
    (async()=>{
      const token=localStorage.getItem("token");
      const headers={Authorization:`Bearer ${token}`};
      const emp=String(employee.employeeNumber).trim();
      try{
        const[absRes,tarRes]=await Promise.all([
          axios.get(`${API_BASE_URL}/api/deductions/options`,{params:{employeeNumber:emp,context:"ABSENCE",hasLeaveForm:"true"},headers}),
          axios.get(`${API_BASE_URL}/api/deductions/options`,{params:{employeeNumber:emp,context:"TARDINESS",hasLeaveForm:"true"},headers}),
        ]);
        if(!alive)return;
        setAbsenceDeductionOptions(Array.isArray(absRes.data?.options)?absRes.data.options:[]);
        setTardinessDeductionOptions(Array.isArray(tarRes.data?.options)?tarRes.data.options:[]);
      }catch{}
    })();
    return()=>{alive=false;};
  },[refreshKey,employee?.employeeNumber]);

  const empCatAllowsCto=employmentCategoryAllowsCompensatoryTimeOff(empCat);
  const empCatDisplay=employmentCategoryLabel(empCat);

  /** Current balance (days) of an option, so pools the category does not earn stay usable while they have a balance. */
  const optionBalanceDays=useCallback((value)=>getDeductionSourceBalanceDays(value,{
    assignmentMap,
    scRemainingHours:toNum(scBuffer)*8,
    ctoRemainingHours:toNum(ctoBalance)*8,
    salaryFallbackDays:null,
  }),[assignmentMap,scBuffer,ctoBalance]);

  // ── FIX: Force VL into absence options (alongside existing SC injection) ────
  const absenceOptionsUi=useMemo(()=>{
    const list=Array.isArray(absenceDeductionOptions)?[...absenceDeductionOptions]:[];
    // Force SC if missing
    if(!list.some((o)=>String(o?.value||"").toUpperCase()==="SC"))
      list.unshift({value:"SC",label:"Service Credit (SC)",leave_type_id:null});
    // Force VL if missing
    if(!list.some((o)=>String(o?.value||"").toUpperCase()==="VL"))
      list.unshift({value:"VL",label:"Vacation Leave (VL)",leave_type_id:null});
    const sal=list.filter((o)=>String(o?.value||"").toUpperCase()==="SALARY_DEDUCTION");
    const rest=list.filter((o)=>String(o?.value||"").toUpperCase()!=="SALARY_DEDUCTION");
    const skipOpt={value:DEDUCTION_SKIP_VALUE,label:"Select...",leave_type_id:null};
    // Category first (earned pools), then pools with an existing balance only (flagged).
    return applyCategoryToDeductionOptions([skipOpt,...rest,...sal],cscCategory,"absence",optionBalanceDays);
  },[absenceDeductionOptions,cscCategory,optionBalanceDays]);

  // ── FIX: Force SC + VL into tardiness options ───────────────────────────────
  const tardinessOptionsUi=useMemo(()=>{
    const list=Array.isArray(tardinessDeductionOptions)?[...tardinessDeductionOptions]:[];
    // Force SC if missing
    if(!list.some((o)=>String(o?.value||"").toUpperCase()==="SC"))
      list.unshift({value:"SC",label:"Service Credit (SC)",leave_type_id:null});
    // Force VL if missing
    if(!list.some((o)=>String(o?.value||"").toUpperCase()==="VL"))
      list.unshift({value:"VL",label:"Vacation Leave (VL)",leave_type_id:null});
    const sal=list.filter((o)=>String(o?.value||"").toUpperCase()==="SALARY_DEDUCTION");
    const rest=list.filter((o)=>String(o?.value||"").toUpperCase()!=="SALARY_DEDUCTION");
    const skipOpt={value:DEDUCTION_SKIP_VALUE,label:"Select...",leave_type_id:null};
    return applyCategoryToDeductionOptions([skipOpt,...rest,...sal],cscCategory,"tardiness",optionBalanceDays);
  },[tardinessDeductionOptions,cscCategory,optionBalanceDays]);

  useEffect(()=>{
    if(!absenceOptionsUi.length)return;
    setAbsenceSource((prev)=>{
      if(absenceOptionsUi.some((o)=>o.value===prev))return prev;
      const nonSkip=absenceOptionsUi.find((o)=>o.value!=="SALARY_DEDUCTION"&&o.value!==DEDUCTION_SKIP_VALUE&&!o.existingBalanceOnly)
        ||absenceOptionsUi.find((o)=>o.value!=="SALARY_DEDUCTION"&&o.value!==DEDUCTION_SKIP_VALUE);
      return nonSkip?.value||absenceOptionsUi.find((o)=>o.value!==DEDUCTION_SKIP_VALUE)?.value||absenceOptionsUi[0].value;
    });
  },[absenceOptionsUi]);

  useEffect(()=>{
    if(!tardinessOptionsUi.length)return;
    setTardinessSource((prev)=>{
      if(tardinessOptionsUi.some((o)=>o.value===prev))return prev;
      const vlOpt=tardinessOptionsUi.find((o)=>String(o?.value||"").toUpperCase()==="VL"&&!o.existingBalanceOnly);
      if(vlOpt&&vlOpt.value!==DEDUCTION_SKIP_VALUE)return vlOpt.value;
      const nonSkip=tardinessOptionsUi.find((o)=>o.value!=="SALARY_DEDUCTION"&&o.value!==DEDUCTION_SKIP_VALUE&&!o.existingBalanceOnly)
        ||tardinessOptionsUi.find((o)=>o.value!=="SALARY_DEDUCTION"&&o.value!==DEDUCTION_SKIP_VALUE);
      return nonSkip?.value||tardinessOptionsUi.find((o)=>o.value!==DEDUCTION_SKIP_VALUE)?.value||tardinessOptionsUi[0].value;
    });
  },[tardinessOptionsUi]);

  // ── Derived numbers ─────────────────────────────────────────────────────────
  const officialStart=attendanceData?.summary?.startDate||attendanceData?.period?.start;
  const officialEnd=attendanceData?.summary?.endDate||attendanceData?.period?.end;
  // Reload the live attendance/leave calendar whenever HR-approved leave changes (socket refresh).
  const approvedLeaveKey=useMemo(()=>Object.entries(filedLeaveByDate||{}).filter(([,v])=>Number(v?.status)===2).map(([d])=>d).sort().join(","),[filedLeaveByDate]);
  const{absentDays:absentDaysOfficial,lateHrs:lateHrsOfficial,loading:officialMetricsLoading,rows:officialRows,calendarMaps:officialCalendarMaps}=useOfficialAttendanceMetrics({
    employeeNumber:employee?.employeeNumber,startDate:officialStart,endDate:officialEnd,refreshKey:approvedLeaveKey,
  });
  const canTrustOfficialMetrics=!officialMetricsLoading&&Boolean(officialStart&&officialEnd&&employee?.employeeNumber);
  const absentDaysDerived = canTrustOfficialMetrics ? absentDaysOfficial : toNum(attendanceData?.stats?.absent_days);
  const savedAbsentDays = metricsAbsentDays != null && Number.isFinite(Number(metricsAbsentDays))
    ? Math.max(0, Number(metricsAbsentDays))
    : null;
  // The saved Attendance Summary is a snapshot. A leave HR-approved after it was saved still
  // shows as an absence there, and the leave request already deducted that day, so those
  // days are not charged again here. A leave cancelled after the save shows the opposite
  // gap; that needs the summary re-saved (flagged below, never charged silently).
  const absenceReconcile=useMemo(()=>{
    if(savedAbsentDays==null||!canTrustOfficialMetrics||!Array.isArray(officialRows))return{coveredDates:[],skipDays:0,missingDays:0};
    const mapsNoLeave={suspensionByDate:officialCalendarMaps?.suspensionByDate||{},holidayByDate:officialCalendarMaps?.holidayByDate||{},leaveByDate:{}};
    const approved=new Set([...Object.keys(officialCalendarMaps?.leaveByDate||{}),...Object.entries(filedLeaveByDate||{}).filter(([,v])=>Number(v?.status)===2).map(([d])=>d)]);
    const coveredDates=listAbsentDatesFromDailyRows(officialRows,mapsNoLeave).filter((d)=>approved.has(d));
    const gap=savedAbsentDays-toNum(absentDaysOfficial);
    return{
      coveredDates,
      skipDays:Math.min(coveredDates.length,Math.max(0,gap)),
      missingDays:Math.max(0,-gap),
    };
  },[savedAbsentDays,canTrustOfficialMetrics,officialRows,officialCalendarMaps,filedLeaveByDate,absentDaysOfficial]);
  const absentDays = savedAbsentDays != null
    ? Math.max(0, savedAbsentDays - absenceReconcile.skipDays)
    : absentDaysDerived;
  const tardHrsFromSummary=attendanceData?.summary?parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness):0;
  const tardHrsAdjustedSummary=Math.max(0,tardHrsFromSummary-absentDays*8);
  const tardHrsDerived=Math.max(lateHrsOfficial>0?lateHrsOfficial:0,tardHrsAdjustedSummary);
  const tardHrs=metricsTardinessHrs!=null&&Number.isFinite(Number(metricsTardinessHrs))?Math.max(0,Number(metricsTardinessHrs)):tardHrsDerived;
  const tardDays=tardHrs/8;

  const isScTardinessDeductionRow=(e)=>String(e?.remarks||"").includes("Tardiness deduction");
  const postedTardinessScDays=existingScDeductions.filter(isScTardinessDeductionRow).reduce((s,e)=>s+Math.abs(toNum(e.earned_hours))/8,0);
  const alreadyScDeductedAbsenceOnly=existingScDeductions.filter((e)=>!isScTardinessDeductionRow(e)).reduce((s,e)=>s+Math.abs(toNum(e.earned_hours))/8,0);
  const alreadyCtoDeducted=existingCtoDeductions.reduce((s,e)=>s+Math.abs(toNum(e.earned_hours))/8,0);
  const alreadyAbsenceFromLeave=existingAbsenceLeaveDeductions.reduce((s,e)=>s+Math.abs(toNum(e.earned_hours))/8,0);
  const existingCtoTardinessDeductions=existingCtoDeductions.filter((e)=>String(e.remarks||"").includes("Tardiness deduction"));
  const totalTardPostedLeave=existingTardinessDeductions.reduce((s,e)=>s+Math.abs(toNum(e.earned_hours))/8,0);
  const postedTardinessCtoDays=existingCtoTardinessDeductions.reduce((s,e)=>s+Math.abs(toNum(e.earned_hours))/8,0);
  const totalTardPostedLeaveAndCto=Number((totalTardPostedLeave+postedTardinessCtoDays+postedTardinessScDays).toFixed(6));
  const postedTardinessLeaveCode=(()=>{
    const c=String(existingTardinessDeductions[0]?.leave_code||"").trim().toUpperCase();
    return c||"VL";
  })();
  const scActuallyCovered=Number(Math.min(alreadyScDeductedAbsenceOnly,absentDays).toFixed(3));
  const absenceAfterSc=Number(Math.max(0,absentDays-scActuallyCovered).toFixed(3));
  const remainingAbsence=Number(Math.max(0,absenceAfterSc-alreadyCtoDeducted-alreadyAbsenceFromLeave).toFixed(3));
  const remainingTardiness=Number(Math.max(0,tardDays-totalTardPostedLeaveAndCto).toFixed(3));

  const postedSalaryAbsenceDays=useMemo(()=>periodSalaryShortfallRows.filter((r)=>String(r.leave_code||"").toUpperCase()==="ABSENCE"&&String(r.entry_type||"").toUpperCase()==="ATTENDANCE_SALARY_DEDUCTION").reduce((s,r)=>s+toNum(r.shortfall_days),0),[periodSalaryShortfallRows]);
  const postedSalaryTardinessDays=useMemo(()=>periodSalaryShortfallRows.filter((r)=>String(r.leave_code||"").toUpperCase()==="TARDINESS"&&String(r.entry_type||"").toUpperCase()==="TARDINESS_SALARY_DEDUCTION").reduce((s,r)=>s+toNum(r.shortfall_days),0),[periodSalaryShortfallRows]);
  const remainingAbsenceForSalaryApply=Number(Math.max(0,remainingAbsence-postedSalaryAbsenceDays).toFixed(6));
  const remainingTardinessForSalaryApply=Number(Math.max(0,remainingTardiness-postedSalaryTardinessDays).toFixed(6));

  const tardinessSalaryFullyRecovered=tardDays>0.0001&&postedSalaryTardinessDays>1e-9&&remainingTardinessForSalaryApply<=1e-5;
  const absenceSalaryFullyRecovered=absentDays>0.0001&&postedSalaryAbsenceDays>1e-9&&remainingAbsenceForSalaryApply<=1e-5;
  const tardinessFullyDeducted=tardDays>0.0001&&(totalTardPostedLeaveAndCto>=tardDays-0.0001||remainingTardinessForSalaryApply<=1e-5);
  const absenceCoveredBySC=absentDays>0&&scActuallyCovered>=absentDays;
  const absenceFullyDeducted=absentDays>0&&absenceAfterSc>0&&remainingAbsence<=0.0001;

  const absencePending=existingCtoDeductions.some((e)=>e.earn_status==="pending")||existingAbsenceLeaveDeductions.some((e)=>e.earn_status==="pending");
  const absenceApproved=existingCtoDeductions.some((e)=>e.earn_status==="approved")||existingAbsenceLeaveDeductions.some((e)=>e.earn_status==="approved");
  const scPending=existingScDeductions.some((e)=>e.earn_status==="pending");
  const scApproved=existingScDeductions.some((e)=>e.earn_status==="approved");
  const existingScTardinessDeductions=existingScDeductions.filter(isScTardinessDeductionRow);
  const tardinessPending=existingTardinessDeductions.some((e)=>e.earn_status==="pending")||existingCtoTardinessDeductions.some((e)=>e.earn_status==="pending")||existingScTardinessDeductions.some((e)=>e.earn_status==="pending");
  const tardinessApproved=existingTardinessDeductions.some((e)=>e.earn_status==="approved")||existingCtoTardinessDeductions.some((e)=>e.earn_status==="approved")||existingScTardinessDeductions.some((e)=>e.earn_status==="approved");

  /** Actual charge source once tardiness has been posted (overrides dropdown default VL). */
  const postedTardinessChargeSource=(()=>{
    if(postedTardinessScDays>1e-9)return"SC";
    if(postedTardinessCtoDays>1e-9)return"CTO";
    if(tardinessSalaryFullyRecovered||postedSalaryTardinessDays>1e-9)return"SALARY_DEDUCTION";
    if(totalTardPostedLeave>1e-9)return postedTardinessLeaveCode||"VL";
    return null;
  })();
  const tardinessDisplaySource=postedTardinessChargeSource||tardinessSource;

  const ctoBal=ctoBalance!==null?ctoBalance:0;
  const vlBal=vlBalance!==null?vlBalance:0;

  const deductionCreditCtxAbsence=useMemo(()=>({assignmentMap,scRemainingHours:toNum(scBuffer)*8,ctoRemainingHours:toNum(ctoBal)*8,salaryFallbackDays:null}),[assignmentMap,scBuffer,ctoBal]);
  const deductionCreditCtxTardiness=useMemo(()=>({assignmentMap,scRemainingHours:toNum(scBuffer)*8,ctoRemainingHours:toNum(ctoBal)*8,salaryFallbackDays:vlBal}),[assignmentMap,scBuffer,ctoBal,vlBal]);

  const absenceIsSkipped=isDeductionSkipSource(absenceSource);
  const tardinessIsSkipped=isDeductionSkipSource(tardinessSource);

  const tardBalDays=(()=>{
    if(isDeductionSkipSource(tardinessSource))return vlBal;
    const code=String(tardinessSource||"").toUpperCase();
    if(!code||code==="SALARY_DEDUCTION")return vlBal;
    const d=getDeductionSourceBalanceDays(tardinessSource,deductionCreditCtxTardiness);
    return d!=null&&Number.isFinite(d)?d:0;
  })();

  const newCtoBalance=Number((ctoBal-(String(absenceSource).toUpperCase()==="CTO"?remainingAbsence:0)).toFixed(3));
  const absenceAmountForSource=remainingAbsence>0?remainingAbsence:absentDays;
  const newScBalance=Number((scBuffer-absenceAmountForSource).toFixed(3));
  const newScBalanceAfterAbsence=Number((scBuffer-remainingAbsence).toFixed(3));
  const newCtoBalanceOverride=Number((ctoBal-absenceAmountForSource).toFixed(3));
  const allowScNegZero=ctoBal<=0;

  const bothDone=(absentDays===0||absenceCoveredBySC||absenceFullyDeducted||remainingAbsenceForSalaryApply<=1e-5)&&(tardDays===0||tardinessFullyDeducted||remainingTardinessForSalaryApply<=1e-5);
  const showScWarningButtons=scBuffer>0&&absentDays>0&&!absenceCoveredBySC&&alreadyScDeductedAbsenceOnly<absentDays;

  const willApplyAbsence=!absenceIsSkipped&&absenceSource!=="SALARY_DEDUCTION"&&remainingAbsence>0&&canApplyAttendanceDeductionToCreditSource(absenceSource,remainingAbsence,deductionCreditCtxAbsence);
  // Posting order is absences first, then tardiness (handleDeduct). When both hit the same pool,
  // tardiness is charged against what is left after the absence, not the opening balance.
  const absenceChargedToTardinessPool=willApplyAbsence&&!tardinessIsSkipped&&String(absenceSource||"").toUpperCase()===String(tardinessSource||"").toUpperCase()?remainingAbsence:0;
  const tardinessNeedOnPool=remainingTardiness+absenceChargedToTardinessPool;
  const willApplyTardiness=!tardinessIsSkipped&&tardinessSource!=="SALARY_DEDUCTION"&&remainingTardiness>0&&canApplyAttendanceDeductionToCreditSource(tardinessSource,tardinessNeedOnPool,deductionCreditCtxTardiness);
  const tardPoolBeforeTardiness=Number((tardBalDays-absenceChargedToTardinessPool).toFixed(3));
  const newTardLeaveBalance=Number((tardPoolBeforeTardiness-(tardinessIsSkipped?0:remainingTardiness)).toFixed(3));
  const newVlBalance=newTardLeaveBalance;
  const willApplyAbsenceToSalary=!absenceIsSkipped&&String(absenceSource||"").toUpperCase()==="SALARY_DEDUCTION"&&remainingAbsenceForSalaryApply>1e-5&&absentDays>0&&!absenceCoveredBySC&&!absenceFullyDeducted&&!(absencePending||absenceApproved);
  const willApplyTardinessToSalary=!tardinessIsSkipped&&String(tardinessSource||"").toUpperCase()==="SALARY_DEDUCTION"&&remainingTardinessForSalaryApply>1e-5&&tardDays>0.0001&&!tardinessFullyDeducted&&!(tardinessPending||tardinessApproved);
  const lockedAbsenceUi=absencePending||absenceApproved||scPending||scApproved;
  const lockedTardinessUi=tardinessPending||tardinessApproved;

  const showStep2AccountsCard=(absentDays>0&&!absenceCoveredBySC&&!absenceFullyDeducted&&remainingAbsenceForSalaryApply>1e-5&&!(absencePending||absenceApproved))||(tardDays>0.0001&&!tardinessFullyDeducted);
  const anyNonSalaryApplyUi=(willApplyAbsence&&!lockedAbsenceUi)||(willApplyTardiness&&!lockedTardinessUi);
  const anySalaryApplyUi=(willApplyAbsenceToSalary&&!lockedAbsenceUi)||(willApplyTardinessToSalary&&!lockedTardinessUi);
  const applyIsSalaryOnly=!showScWarningButtons&&anySalaryApplyUi&&!anyNonSalaryApplyUi;
  const canDeductNormal=willApplyAbsence||willApplyTardiness;

  const absenceCreditSelectedButBlocked=!absenceIsSkipped&&remainingAbsence>1e-5&&String(absenceSource||"").toUpperCase()!=="SALARY_DEDUCTION"&&!(absencePending||absenceApproved)&&!absenceCoveredBySC&&!absenceFullyDeducted&&!canApplyAttendanceDeductionToCreditSource(absenceSource,remainingAbsence,deductionCreditCtxAbsence);
  const tardinessCreditSelectedButBlocked=!tardinessIsSkipped&&remainingTardiness>1e-5&&String(tardinessSource||"").toUpperCase()!=="SALARY_DEDUCTION"&&!(tardinessPending||tardinessApproved)&&!tardinessFullyDeducted&&!canApplyAttendanceDeductionToCreditSource(tardinessSource,remainingTardiness,deductionCreditCtxTardiness);
  const showDeductFromSalaryButton=(absenceCreditSelectedButBlocked&&remainingAbsenceForSalaryApply>1e-5)||(tardinessCreditSelectedButBlocked&&remainingTardinessForSalaryApply>1e-5);

  const salaryModalAbsenceDays=absenceCreditSelectedButBlocked&&remainingAbsenceForSalaryApply>1e-5?remainingAbsenceForSalaryApply:0;
  const salaryModalTardinessDays=tardinessCreditSelectedButBlocked&&remainingTardinessForSalaryApply>1e-5?remainingTardinessForSalaryApply:0;
  const salaryModalTotalDays=Number((salaryModalAbsenceDays+salaryModalTardinessDays).toFixed(6));
  const salaryModalTotalHrs=salaryModalTotalDays*8;

  const isLoading=balLoading||deductionsLoading||deductionOptionsLoading;

  const halfDayRows=useMemo(()=>{
    if(Array.isArray(halfDayPendingDates)){
      const fromArr=halfDayPendingDates.filter(Boolean);
      if(fromArr.length)return[...new Set(fromArr.map(normalizeHalfDayDateKey))].filter(Boolean).sort();
      return[];
    }
    return halfDayDeductDate?[normalizeHalfDayDateKey(halfDayDeductDate)]:[];
  },[halfDayPendingDates,halfDayDeductDate]);

  const halfDayDeductedSet=useMemo(()=>new Set((deductedVlHalfDates||[]).map(normalizeHalfDayDateKey).filter(Boolean)),[deductedVlHalfDates]);
  const halfDayLeaveOverlayFor=useCallback((d)=>resolveHalfDayLeaveOverlay(normalizeHalfDayDateKey(d),leaveByDate,filedLeaveByDate),[leaveByDate,filedLeaveByDate]);
  const halfDayPendingCount=useMemo(()=>halfDayRows.filter((d)=>{const k=normalizeHalfDayDateKey(d);if(halfDayDeductedSet.has(k))return false;if(halfDayLeaveOverlayFor(d))return false;return true;}).length,[halfDayRows,halfDayDeductedSet,halfDayLeaveOverlayFor]);
  useEffect(()=>{
    if(typeof onStatusChange!=="function")return;
    onStatusChange({
      loading:isLoading,
      remainingAbsenceDays:remainingAbsenceForSalaryApply,
      remainingTardinessDays:remainingTardinessForSalaryApply,
      halfDayPending:halfDayPendingCount,
      awaitingApproval:absencePending||tardinessPending,
    });
  },[onStatusChange,isLoading,remainingAbsenceForSalaryApply,remainingTardinessForSalaryApply,halfDayPendingCount,absencePending,tardinessPending]);
  const halfDayOnLeaveCount=useMemo(()=>halfDayRows.filter((d)=>!halfDayDeductedSet.has(normalizeHalfDayDateKey(d))&&halfDayLeaveOverlayFor(d)).length,[halfDayRows,halfDayDeductedSet,halfDayLeaveOverlayFor]);

  useEffect(()=>{ if(showScWarningButtons)setPolicySelection("sc"); else setPolicySelection(null); },[showScWarningButtons]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openConfirm=(source)=>{ setDeductSource(source); setDeductError(""); setRemark(""); setConfirmDeductionAcknowledged(false); setConfirmOpen(true); };
  const closeConfirm=()=>{ setConfirmOpen(false); setDeductSource(null); setDeductError(""); setRemark(""); setConfirmDeductionAcknowledged(false); };

  const handleDeduct=async()=>{
    if(!employee||!confirmDeductionAcknowledged)return;
    setDeducting(true); setDeductError("");
    const token=localStorage.getItem("token");
    const headers={Authorization:`Bearer ${token}`};
    const approveIfId=async(kind,id)=>{ const nid=Number(id); if(!Number.isFinite(nid)||nid<=0)return; await axios.patch(`${API_BASE_URL}/api/earnings/${kind}/${nid}/approve`,{},{headers}); };
    try{
      if(deductSource==="sc"){
        if(!canApplyAttendanceDeductionToCreditSource("SC",absenceAmountForSource,deductionCreditCtxAbsence)){setDeductError("Service Credit has no usable balance. Use Salary Deduction instead.");setDeducting(false);return;}
        const{data}=await axios.post(`${API_BASE_URL}/api/earnings/sc`,{employeeNumber:employee.employeeNumber,sc_type:"non_commutative",earned_hours:-(absenceAmountForSource*8),total_ot_hours:0,period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`SC-first policy: ${absenceAmountForSource.toFixed(3)}d absence offset from SC for ${monthName(month)} ${year}`},{headers});
        await approveIfId("sc",data?.id);
      }else if(deductSource==="cto"){
        if(!canApplyAttendanceDeductionToCreditSource("CTO",absenceAmountForSource,deductionCreditCtxAbsence)){setDeductError("CTO has no usable balance. Use Salary Deduction instead.");setDeducting(false);return;}
        const{data}=await axios.post(`${API_BASE_URL}/api/earnings/cto`,{employeeNumber:employee.employeeNumber,ot_hours:0,earned_hours:-(absenceAmountForSource*8),period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`CTO override: ${absenceAmountForSource.toFixed(3)}d absence offset from CTO for ${monthName(month)} ${year}`},{headers});
        await approveIfId("cto",data?.id);
      }else{
        const absCode=String(absenceSource||"").toUpperCase();
        const tardCodePre=String(tardinessSource||"").toUpperCase();
        if(deductSource==="normal"&&remainingAbsence>1e-5&&remainingAbsenceForSalaryApply>1e-5&&absCode!=="SALARY_DEDUCTION"&&!absenceIsSkipped&&!canApplyAttendanceDeductionToCreditSource(absenceSource,remainingAbsence,deductionCreditCtxAbsence)){setDeductError(`Absences charged to ${humanizeDeductionCharge(absenceSource)} have no usable balance.`);setDeducting(false);return;}
        if(deductSource==="normal"&&remainingTardiness>1e-5&&remainingTardinessForSalaryApply>1e-5&&tardCodePre!=="SALARY_DEDUCTION"&&!tardinessIsSkipped&&!canApplyAttendanceDeductionToCreditSource(tardinessSource,tardinessNeedOnPool,deductionCreditCtxTardiness)){setDeductError(absenceChargedToTardinessPool>0?`Not enough ${humanizeDeductionCharge(tardinessSource)} for tardiness after the absence is charged first. Charge tardiness to another source or to salary.`:`Tardiness charged to ${humanizeDeductionCharge(tardinessSource)} has no usable balance.`);setDeducting(false);return;}
        if(remainingAbsenceForSalaryApply>1e-5&&absCode==="SALARY_DEDUCTION"&&!(absencePending||absenceApproved)){
          await axios.post(`${API_BASE_URL}/api/leave-salary-shortfall`,{employeeNumber:employee.employeeNumber,periodYear:parseInt(year,10),periodMonth:parseInt(month,10),shortfallDays:remainingAbsenceForSalaryApply,leaveCode:"ABSENCE",entryType:"ATTENDANCE_SALARY_DEDUCTION",remarks:`Attendance absence charged to salary: ${remainingAbsenceForSalaryApply.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
        }else if(willApplyAbsence&&absCode==="SC"){
          const{data}=await axios.post(`${API_BASE_URL}/api/earnings/sc`,{employeeNumber:employee.employeeNumber,sc_type:"non_commutative",earned_hours:-(remainingAbsence*8),total_ot_hours:0,period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`Absence offset from SC: ${remainingAbsence.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
          await approveIfId("sc",data?.id);
        }else if(willApplyAbsence&&absCode==="CTO"){
          const{data}=await axios.post(`${API_BASE_URL}/api/earnings/cto`,{employeeNumber:employee.employeeNumber,ot_hours:0,earned_hours:-(remainingAbsence*8),period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`Absence offset: ${remainingAbsence.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
          await approveIfId("cto",data?.id);
        }else if(willApplyAbsence&&absCode&&absCode!=="SALARY_DEDUCTION"){
          const{data}=await axios.post(`${API_BASE_URL}/api/earnings/leave`,{employeeNumber:employee.employeeNumber,leave_code:absCode,earned_hours:-(remainingAbsence*8),period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`Absence offset: ${remainingAbsence.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
          await approveIfId("leave",data?.id);
        }
        const tardCode=tardCodePre;
        if(remainingTardinessForSalaryApply>1e-5&&tardCode==="SALARY_DEDUCTION"&&!(tardinessPending||tardinessApproved)){
          await axios.post(`${API_BASE_URL}/api/leave-salary-shortfall`,{employeeNumber:employee.employeeNumber,periodYear:parseInt(year,10),periodMonth:parseInt(month,10),shortfallDays:remainingTardinessForSalaryApply,leaveCode:"TARDINESS",entryType:"TARDINESS_SALARY_DEDUCTION",remarks:`Attendance tardiness charged to salary: ${remainingTardinessForSalaryApply.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
        }else if(willApplyTardiness&&tardCode==="CTO"){
          const{data}=await axios.post(`${API_BASE_URL}/api/earnings/cto`,{employeeNumber:employee.employeeNumber,ot_hours:0,earned_hours:-(remainingTardiness*8),period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`Tardiness deduction: ${remainingTardiness.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
          await approveIfId("cto",data?.id);
        }else if(willApplyTardiness&&tardCode==="SC"){
          const{data}=await axios.post(`${API_BASE_URL}/api/earnings/sc`,{employeeNumber:employee.employeeNumber,sc_type:"non_commutative",earned_hours:-(remainingTardiness*8),total_ot_hours:0,period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"DEDUCTION",remarks:`Tardiness deduction: ${remainingTardiness.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
          await approveIfId("sc",data?.id);
        }else if(willApplyTardiness&&tardCode&&tardCode!=="SALARY_DEDUCTION"){
          const{data}=await axios.post(`${API_BASE_URL}/api/earnings/leave`,{employeeNumber:employee.employeeNumber,leave_code:tardCode,earned_hours:-(remainingTardiness*8),period_year:parseInt(year,10),period_month:parseInt(month,10),entry_type:"TARDINESS_DEDUCTION",remarks:`Tardiness deduction: ${remainingTardiness.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
          await approveIfId("leave",data?.id);
        }
      }
      setDeductSuccess("Deduction submitted successfully.");
      closeConfirm();
      await Promise.all([fetchBalances(),fetchExistingDeductions(),fetchPeriodSalaryShortfall()]);
      if(onDeductSuccess)onDeductSuccess();
      setTimeout(()=>setDeductSuccess(""),5000);
    }catch(err){
      setDeductError("Deduction failed: "+(err.response?.data?.error||err.message));
    }finally{setDeducting(false);}
  };

  const handleSalaryShortcutConfirm=async()=>{
    if(!employee||salaryModalTotalDays<=1e-5)return;
    setSalaryOnlySubmitting(true); setSalaryOnlyModalError("");
    const token=localStorage.getItem("token");
    const headers={Authorization:`Bearer ${token}`};
    try{
      if(salaryModalAbsenceDays>1e-5&&!(absencePending||absenceApproved))
        await axios.post(`${API_BASE_URL}/api/leave-salary-shortfall`,{employeeNumber:employee.employeeNumber,periodYear:parseInt(year,10),periodMonth:parseInt(month,10),shortfallDays:salaryModalAbsenceDays,leaveCode:"ABSENCE",entryType:"ATTENDANCE_SALARY_DEDUCTION",remarks:`Attendance absence charged to salary: ${salaryModalAbsenceDays.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
      if(salaryModalTardinessDays>1e-5&&!(tardinessPending||tardinessApproved))
        await axios.post(`${API_BASE_URL}/api/leave-salary-shortfall`,{employeeNumber:employee.employeeNumber,periodYear:parseInt(year,10),periodMonth:parseInt(month,10),shortfallDays:salaryModalTardinessDays,leaveCode:"TARDINESS",entryType:"TARDINESS_SALARY_DEDUCTION",remarks:`Attendance tardiness charged to salary: ${salaryModalTardinessDays.toFixed(3)}d for ${monthName(month)} ${year}`},{headers});
      setDeductSuccess("Salary shortfall recorded.");
      setSalaryOnlyModalOpen(false);
      await Promise.all([fetchBalances(),fetchExistingDeductions(),fetchPeriodSalaryShortfall()]);
      if(onDeductSuccess)onDeductSuccess();
      setTimeout(()=>setDeductSuccess(""),5000);
    }catch(err){
      setSalaryOnlyModalError(err?.response?.data?.message||err?.response?.data?.error||err?.message||"Request failed");
    }finally{setSalaryOnlySubmitting(false);}
  };

  // ── Derived display helpers ─────────────────────────────────────────────────
  const showAbsence=absentDays>0;
  const showTardiness=tardDays>0;
  const showStep1=showAbsence||showTardiness||showScWarningButtons;
  const lockedAbsencePolicy=absencePending||absenceApproved||scPending||scApproved;
  const useScCtoPolicyPreview=showScWarningButtons&&remainingAbsence>0&&!absenceCoveredBySC&&!absenceFullyDeducted&&!lockedAbsencePolicy;

  const absenceOptionLabel=absenceOptionsUi.find((o)=>o.value===absenceSource)?.label?.trim()||"";
  const tardinessOptionLabel=tardinessOptionsUi.find((o)=>o.value===tardinessSource)?.label?.trim()||"";
  const tardinessDisplayOptionLabel=tardinessOptionsUi.find((o)=>o.value===tardinessDisplaySource)?.label?.trim()||"";

  const scopeLabelFromSource=(src,optionLabel)=>{
    if(optionLabel){const paren=optionLabel.match(/\(([^)]+)\)\s*$/);if(paren?.[1])return String(paren[1]).trim();}
    if(isDeductionSkipSource(src))return"—";
    const u=String(src||"").toUpperCase();
    return u==="SALARY_DEDUCTION"?"Salary":u||"—";
  };

  const absenceOffsetScopeLabel=scopeLabelFromSource(absenceSource,absenceOptionLabel);

  const tardinessOffsetScopeLabel=scopeLabelFromSource(tardinessDisplaySource,tardinessDisplayOptionLabel);

  const tardinessLedgerHeading=tardinessIsSkipped&&!postedTardinessChargeSource?postedTardinessLeaveCode:tardinessDisplayOptionLabel||(String(tardinessDisplaySource).toUpperCase()==="CTO"?"Compensatory Time Off (CTO)":String(tardinessDisplaySource).toUpperCase()==="SC"?"Service Credit (SC)":"Leave");
  const tardinessOffsetTitle=`Tardiness offset (${tardinessOffsetScopeLabel})`;

  const balanceDaysForTardinessSource=(src)=>{
    if(isDeductionSkipSource(src))return vlBal;
    const code=String(src||"").toUpperCase();
    if(!code||code==="SALARY_DEDUCTION")return code==="SALARY_DEDUCTION"?0:vlBal;
    if(code==="SC")return scBuffer;
    if(code==="CTO")return ctoBal;
    const d=getDeductionSourceBalanceDays(src,deductionCreditCtxTardiness);
    return d!=null&&Number.isFinite(d)?d:0;
  };
  const tardDisplayBalDays=balanceDaysForTardinessSource(tardinessDisplaySource);

  const absenceLedgerOutline=showAbsence&&absenceCoveredBySC&&absentDays>0?scApproved?"success":"warning":showAbsence&&absenceFullyDeducted&&!absenceCoveredBySC?absenceApproved?"success":"warning":showAbsence&&absentDays>0&&absenceSalaryFullyRecovered&&!absenceCoveredBySC&&!absenceFullyDeducted?"success":"default";
  const tardinessLedgerOutline=showTardiness&&tardinessFullyDeducted?tardinessApproved||tardinessSalaryFullyRecovered?"success":"warning":"default";

  const absenceHeaderValue=!showAbsence?"—":absenceCoveredBySC?"Covered (SC)":absenceFullyDeducted?"Applied":remainingAbsence>0?`−${remainingAbsence.toFixed(3)} d`:"—";
  const absenceHeaderColor=!showAbsence?T.faint:absenceCoveredBySC||absenceFullyDeducted?"#2e7d32":remainingAbsence>0?"#c62828":T.faint;
  const tardinessHeaderValue=!showTardiness?"—":tardinessFullyDeducted?"Applied":remainingTardiness>0?`−${remainingTardiness.toFixed(3)} d`:"—";
  const tardinessHeaderColor=!showTardiness?T.faint:tardinessFullyDeducted?"#2e7d32":remainingTardiness>0?"#c62828":T.faint;

  const leftAbsLedgerBal=!showAbsence?null:useScCtoPolicyPreview?policySelection==="cto"?Number((ctoBal-remainingAbsence).toFixed(3)):Number((scBuffer-remainingAbsence).toFixed(3)):absenceIsSkipped?Number(ctoBal.toFixed(3)):absenceFullyDeducted||absenceCoveredBySC?Number((ctoBal-alreadyCtoDeducted).toFixed(3)):String(absenceSource).toUpperCase()==="SC"?newScBalanceAfterAbsence:String(absenceSource).toUpperCase()==="CTO"?newCtoBalance:String(absenceSource).toUpperCase()!=="SALARY_DEDUCTION"?Number((toNum(assignmentMap[absenceSource]?.remaining_hours)/8-remainingAbsence).toFixed(3)):newCtoBalance;
  const leftAbsLedgerLabel=!showAbsence?"":useScCtoPolicyPreview?policySelection==="cto"?"New CTO balance":"New SC balance":absenceIsSkipped?"No change":absenceFullyDeducted||absenceCoveredBySC?"New CTO bal":String(absenceSource).toUpperCase()==="SC"?"New SC bal":String(absenceSource).toUpperCase()==="CTO"?"New CTO bal":String(absenceSource).toUpperCase()!=="SALARY_DEDUCTION"?`New ${humanizeDeductionCharge(absenceSource)} bal`:"New CTO bal";
  const rightTardLedgerBal=!showTardiness?null:tardinessIsSkipped&&!postedTardinessChargeSource?Number(tardDisplayBalDays.toFixed(3)):tardinessFullyDeducted?(()=>{
    const code=String(tardinessDisplaySource||"").toUpperCase();
    if(code==="SC")return Number((scBuffer-postedTardinessScDays).toFixed(3));
    if(code==="CTO")return Number((ctoBal-postedTardinessCtoDays).toFixed(3));
    if(code==="SALARY_DEDUCTION")return 0;
    return Number((tardDisplayBalDays-totalTardPostedLeave).toFixed(3));
  })():Number((tardDisplayBalDays-absenceChargedToTardinessPool-(tardinessIsSkipped?0:remainingTardiness)).toFixed(3));
  const rightTardLedgerLabel=!showTardiness?"":tardinessIsSkipped&&!postedTardinessChargeSource?"No change":String(tardinessDisplaySource).toUpperCase()==="SALARY_DEDUCTION"?"Salary (no leave deducted)":`New ${humanizeDeductionCharge(tardinessDisplaySource)} bal`;

  // ── Confirm modal data ──────────────────────────────────────────────────────
  const confirmSlipTotalDays=useMemo(()=>{
    if(deductSource==="sc"||deductSource==="cto")return absenceAmountForSource;
    if(deductSource==="normal"&&applyIsSalaryOnly)return Number((remainingAbsenceForSalaryApply+remainingTardinessForSalaryApply).toFixed(6));
    return Number(((willApplyAbsence?remainingAbsence:0)+(willApplyTardiness?remainingTardiness:0)).toFixed(6));
  },[deductSource,absenceAmountForSource,applyIsSalaryOnly,remainingAbsenceForSalaryApply,remainingTardinessForSalaryApply,willApplyAbsence,remainingAbsence,willApplyTardiness,remainingTardiness]);
  const confirmSlipTotalHrs=confirmSlipTotalDays*8;

  const confirmTransactionLines=useMemo(()=>{
    const lines=[];
    if(deductSource==="sc"||deductSource==="cto"){lines.push({key:"abs-policy",title:"Absence deduction",sub:`Charged to ${deductSource.toUpperCase()} · ${Number(absentDays||0).toFixed(3)} day(s) assessed`,amount:absenceAmountForSource});return lines;}
    if(deductSource==="normal"){
      if(willApplyAbsence&&remainingAbsence>0)lines.push({key:"abs",title:"Absence deduction",sub:`Charged to ${humanizeDeductionCharge(absenceSource)} · ${Number(absentDays||0).toFixed(3)}d absent`,amount:remainingAbsence});
      else if(willApplyAbsenceToSalary&&remainingAbsenceForSalaryApply>1e-5)lines.push({key:"abs-sal",title:"Absence deduction",sub:"Charged to salary · assessed absence",amount:remainingAbsenceForSalaryApply});
      if(willApplyTardiness&&remainingTardiness>0)lines.push({key:"tar",title:"Tardiness deduction",sub:`Charged to ${tardinessOffsetScopeLabel} · ${tardHrs.toFixed(3)} hrs late`,amount:remainingTardiness});
      else if(willApplyTardinessToSalary&&remainingTardinessForSalaryApply>1e-5)lines.push({key:"tar-sal",title:"Tardiness deduction",sub:"Charged to salary · assessed tardiness",amount:remainingTardinessForSalaryApply});
    }
    return lines;
  },[deductSource,absentDays,absenceAmountForSource,willApplyAbsence,remainingAbsence,absenceSource,willApplyAbsenceToSalary,remainingAbsenceForSalaryApply,willApplyTardiness,remainingTardiness,tardinessOffsetScopeLabel,tardHrs,willApplyTardinessToSalary,remainingTardinessForSalaryApply]);

  const confirmModalBalanceTiles=useMemo(()=>{
    if(!deductSource)return[];
    const tiles=[];
    if(deductSource==="sc"){const nb=allowScNegZero&&Object.is(newScBalance,-0)?0:newScBalance;tiles.push({key:"sc",label:"SC before",before:scBuffer,delta:-absenceAmountForSource,after:nb});}
    else if(deductSource==="cto")tiles.push({key:"cto",label:"CTO before",before:ctoBal,delta:-absenceAmountForSource,after:newCtoBalanceOverride});
    else if(deductSource==="normal"){
      if(willApplyAbsence&&remainingAbsence>0){
        const au=String(absenceSource||"").toUpperCase();
        const absStep={label:"1st · Absence",delta:-remainingAbsence};
        if(au==="CTO")tiles.push({key:"cto-a",code:au,label:"CTO before",before:ctoBal,delta:-remainingAbsence,after:newCtoBalance,steps:[absStep]});
        else if(au==="SC")tiles.push({key:"sc-a",code:au,label:"SC before",before:scBuffer,delta:-remainingAbsence,after:newScBalanceAfterAbsence,steps:[absStep]});
        else if(au!=="SALARY_DEDUCTION"){const prev=toNum(assignmentMap[absenceSource]?.remaining_hours)/8;tiles.push({key:`leave-${au}`,code:au,label:`${humanizeDeductionCharge(absenceSource)} before`,before:prev,delta:-remainingAbsence,after:prev-remainingAbsence,steps:[absStep]});}
      }
      if(willApplyTardiness&&remainingTardiness>0){
        const code=String(tardinessSource||"").toUpperCase();
        const tardStep={label:"2nd · Tardiness",delta:-remainingTardiness};
        // Same pool as the absence: one running balance (absence first, then tardiness).
        const shared=tiles.find((t)=>t.code===code);
        if(shared){shared.delta+=tardStep.delta;shared.after=newVlBalance;shared.steps.push(tardStep);}
        else{const short=code==="VL"?"VL":code==="CTO"?"CTO":humanizeDeductionCharge(tardinessSource);tiles.push({key:"tard",code,label:`${short} before`,before:tardPoolBeforeTardiness,delta:-remainingTardiness,after:newVlBalance,steps:[{...tardStep,label:"Tardiness"}]});}
      }
    }
    return tiles;
  },[deductSource,allowScNegZero,newScBalance,scBuffer,absenceAmountForSource,ctoBal,newCtoBalanceOverride,willApplyAbsence,remainingAbsence,absenceSource,assignmentMap,newCtoBalance,newScBalanceAfterAbsence,willApplyTardiness,remainingTardiness,tardinessSource,tardPoolBeforeTardiness,newVlBalance]);

  const slipAfterDotColor=(after)=>after<0?T.balBad:Math.abs(after)<1e-9?"#f59e0b":T.balOk;
  const slipAfterTextColor=(after)=>after<0?T.balBad:Math.abs(after)<1e-9?"#92400e":T.balOk;

  if(!attendanceData?.summary)return null;
  const summaryOutOfDate=absenceReconcile.skipDays>0||absenceReconcile.missingDays>0;
  const hasAnything=absentDays>0||tardDays>0||absenceFullyDeducted||tardinessFullyDeducted||(empCatAllowsCto&&ctoBal>0)||scBuffer>0||halfDayRows.length>0||summaryOutOfDate;
  if(!hasAnything&&!balLoading)return null;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <Box sx={{ mt:0, display:"flex", flexDirection:"column", gap:1.25 }}>
        {deductSuccess && (
          <Alert severity="success" sx={{ py:0.5, fontSize:"0.65rem", borderRadius:1.25 }}>{deductSuccess}</Alert>
        )}
        {absenceReconcile.skipDays>0 && (
          <Alert severity="info" sx={{ py:0.5, fontSize:"0.65rem", borderRadius:1.25 }}>
            Attendance summary is out of date: {absenceReconcile.skipDays} absence day(s) now have HR-approved leave
            ({absenceReconcile.coveredDates.join(", ")}). The leave request already deducted {absenceReconcile.skipDays===1?"it":"them"}, so {absenceReconcile.skipDays===1?"it is":"they are"} not charged again here.
            Re-save the Attendance Summary to update the record.
          </Alert>
        )}
        {absenceReconcile.missingDays>0 && (
          <Alert severity="warning" sx={{ py:0.5, fontSize:"0.65rem", borderRadius:1.25 }}>
            Attendance now shows {absenceReconcile.missingDays} more absence day(s) than the saved summary (a leave may have been denied or cancelled after it was saved).
            Re-save the Attendance Summary before deducting.
          </Alert>
        )}

        {/* ═══ STEP 1 ═══ */}
        {showStep1 && (
          <Box sx={{ borderRadius:1.5, border:`1px solid ${bothDone?"rgba(46,125,50,0.22)":"rgba(109,35,35,0.14)"}`, bgcolor:"#fff", overflow:"hidden" }}>
            <Box sx={{ px:1.6, py:0.9, bgcolor:"rgba(0,0,0,0.03)", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:1, flexWrap:"wrap" }}>
              <Box sx={{ display:"flex", alignItems:"center", gap:0.75, minWidth:0 }}>
                <StepNum n={1} done={bothDone} />
                <Typography sx={{ fontSize:"0.72rem", fontWeight:600, color:T.text, fontFamily:T.poppins }}>
                  Absence &amp; Tardiness Offset
                </Typography>
                <Typography sx={{ fontSize:"0.63rem", color:T.muted, fontFamily:T.poppins }}>
                  · click a card to expand
                </Typography>
              </Box>
              <Box sx={{ display:"flex", alignItems:"center", gap:0.5, flexWrap:"wrap" }}>
                {isLoading && <CircularProgress size={11} sx={{ color:T.accent }} />}
                {scBuffer>0&&<Chip size="small" label={`SC: ${scBuffer.toFixed(3)} d`} sx={{ height:18,fontSize:"0.6rem",fontWeight:600,bgcolor:"#EAF3DE",color:"#27500A",border:"none" }} />}
                {(absencePending||absenceApproved)&&<SBadge approved={absenceApproved} />}
                {(scPending||scApproved)&&<SBadge label={scApproved?"SC applied":"SC pending"} approved={scApproved} />}
                {(tardinessPending||tardinessApproved)&&showTardiness&&<SBadge approved={tardinessApproved} />}
                {bothDone&&<SBadge label="All done" approved />}
              </Box>
            </Box>

            <Box sx={{ px:1.6, py:1.1 }}>
              {showScWarningButtons && (
                <Box sx={{ display:"flex", gap:0.75, alignItems:"flex-start", p:"8px 10px", mb:1, borderRadius:1.25, bgcolor:"#FAEEDA", border:"0.5px solid #FAC775" }}>
                  <Box sx={{ width:13,height:13,borderRadius:"50%",bgcolor:"#FAC775",color:"#633806",fontSize:"0.6rem",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,mt:"2px" }}>!</Box>
                  <Typography sx={{ fontSize:"0.7rem", color:"#633806", fontFamily:T.poppins, lineHeight:1.4 }}>
                    Policy: deduct from <strong>Service Credits first</strong> before CTO.
                  </Typography>
                </Box>
              )}

              {showScWarningButtons&&absentDays>0&&!absenceCoveredBySC&&!absenceFullyDeducted&&remainingAbsence>0&&(
                <Box sx={{ border:"2px solid #185FA5", borderRadius:1.25, overflow:"hidden", mb:1 }}>
                  <Box sx={{ px:1, py:0.4, bgcolor:"#E6F1FB", borderBottom:"1px solid #B5D4F4" }}>
                    <Typography sx={{ fontSize:"0.66rem", fontWeight:700, color:"#0C447C", fontFamily:T.poppins }}>Draw order</Typography>
                  </Box>
                  <Box sx={{ px:1, py:0.75, bgcolor:"#fff" }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cto-sc-first-pool-step1">SC vs CTO — draw first</InputLabel>
                      <Select labelId="cto-sc-first-pool-step1" label="SC vs CTO — draw first"
                        value={policySelection==="cto"?"cto":"sc"}
                        onChange={(e)=>setPolicySelection(e.target.value)}
                        disabled={deducting||isLoading||scPending||scApproved||absencePending||absenceApproved}
                        sx={{ fontSize:"0.78rem", borderRadius:1, bgcolor:"#fff" }}>
                        <MenuItem value="sc"><Box sx={{ display:"flex",alignItems:"center",gap:0.75 }}><SCIcon sx={{ fontSize:15,color:"#2e7d32" }} />Service Credit first</Box></MenuItem>
                        <MenuItem value="cto"><Box sx={{ display:"flex",alignItems:"center",gap:0.75 }}><CTOIcon sx={{ fontSize:15,color:"#6a1b9a" }} />CTO first</Box></MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              )}

              <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1 }}>
                {/* LEFT — Absence offset */}
                <CollapsibleLedger
                  title="Absence offset (SC / CTO)"
                  valueLabel={absenceHeaderValue}
                  valueColor={absenceHeaderColor}
                  outline={absenceLedgerOutline}
                  open={offsetsOpen}
                  onToggle={setOffsetsOpen}
                  statusBadge={
                    !showAbsence ? (
                      <Chip size="small" label="None" sx={{ height:15,fontSize:"0.55rem",fontWeight:600,bgcolor:"rgba(46,125,50,0.1)",color:"#1b5e20",border:"none" }} />
                    ) : absenceCoveredBySC ? (
                      <SBadge label={scApproved?"SC applied":"SC pending"} approved={scApproved} />
                    ) : absenceFullyDeducted ? (
                      <SBadge label={absenceApproved?"Applied":"Pending"} approved={absenceApproved} />
                    ) : null
                  }
                  footer={
                    !showAbsence ? (
                      <Box sx={{ px:1.25,py:0.5,borderTop:"1px solid rgba(46,125,50,0.22)",bgcolor:"rgba(46,125,50,0.06)",display:"flex",alignItems:"center",gap:0.5,minHeight:26 }}>
                        <CheckIcon sx={{ fontSize:12,color:"#2e7d32",flexShrink:0 }} />
                        <Typography noWrap sx={{ fontSize:"0.6rem",fontWeight:600,color:"#1b5e20",fontFamily:T.poppins,flex:1,minWidth:0 }}>{NO_ABSENCES_RECORDED_MESSAGE}</Typography>
                      </Box>
                    ) : absenceCoveredBySC ? (
                      <Box sx={{ px:1.25,py:0.5,borderTop:`1.5px solid ${scApproved?"rgba(46,125,50,0.38)":"rgba(230,81,0,0.35)"}`,bgcolor:scApproved?"rgba(46,125,50,0.07)":"rgba(230,81,0,0.07)",display:"flex",alignItems:"center",gap:0.5,minHeight:26 }}>
                        <CheckIcon sx={{ fontSize:12,color:scApproved?"#2e7d32":"#e65100",flexShrink:0 }} />
                        <Typography noWrap sx={{ fontSize:"0.6rem",fontWeight:700,color:scApproved?"#1b5e20":"#7a4a00",fontFamily:T.poppins,flex:1,minWidth:0 }}>
                          {scApproved?"Covered by SC — applied.":"SC offset pending approval."}
                        </Typography>
                      </Box>
                    ) : absenceFullyDeducted ? (
                      <Box sx={{ px:1.25,py:0.5,borderTop:`1.5px solid ${absenceApproved?"rgba(46,125,50,0.38)":"rgba(230,81,0,0.35)"}`,bgcolor:absenceApproved?"rgba(46,125,50,0.07)":"rgba(230,81,0,0.07)",display:"flex",alignItems:"center",gap:0.5,minHeight:26 }}>
                        <CheckIcon sx={{ fontSize:12,color:absenceApproved?"#2e7d32":"#e65100",flexShrink:0 }} />
                        <Typography noWrap sx={{ fontSize:"0.6rem",fontWeight:700,color:absenceApproved?"#1b5e20":"#7a4a00",fontFamily:T.poppins,flex:1,minWidth:0 }}>
                          {absenceApproved?"Fully deducted.":"Pending approval."}
                        </Typography>
                      </Box>
                    ) : absenceSalaryFullyRecovered&&!absenceCoveredBySC&&!absenceFullyDeducted ? (
                      <Box sx={{ px:1.25,py:0.5,borderTop:"1.5px solid rgba(46,125,50,0.38)",bgcolor:"rgba(46,125,50,0.07)",display:"flex",alignItems:"center",gap:0.5,minHeight:26 }}>
                        <CheckIcon sx={{ fontSize:12,color:"#2e7d32",flexShrink:0 }} />
                        <Typography noWrap sx={{ fontSize:"0.6rem",fontWeight:700,color:"#1b5e20",fontFamily:T.poppins,flex:1,minWidth:0 }}>Charged to salary.</Typography>
                      </Box>
                    ) : leftAbsLedgerBal!=null ? (
                      <BalanceFooter bal={leftAbsLedgerBal} label={leftAbsLedgerLabel} />
                    ) : (
                      <Box sx={{ px:1.1,py:0.6,borderTop:"1px solid rgba(0,0,0,0.08)",bgcolor:"rgba(0,0,0,0.02)" }}>
                        <Typography sx={{ fontSize:"0.6rem",color:T.muted,fontFamily:T.poppins }}>No absence offset this period.</Typography>
                      </Box>
                    )
                  }
                >
                  {showAbsence ? (
                    <>
                      {empCatAllowsCto && <R label="CTO balance" sub={balLoading?"Loading…":"Current"} value={balLoading?"…":`${ctoBal.toFixed(3)} d`} valueColor={ctoBal>0?"#1e4d20":T.faint} bold />}
                      {scBuffer>0 && <R label="SC buffer" sub="Applies before CTO" value={fmtDays3(scBuffer,{allowNegZero:allowScNegZero})} valueColor="#185FA5" />}
                      {!empCatAllowsCto&&scBuffer<=0 && <Typography sx={{ fontSize:"0.6rem",color:T.muted,fontFamily:T.poppins,mb:0.5 }}>CTO not used for this category — choose leave in Step 2.</Typography>}
                      <R label="Absences to offset" sub={`${absentDays.toFixed(3)} d recorded`} value={absenceCoveredBySC?"Covered":remainingAbsence>0?`− ${remainingAbsence.toFixed(3)} d`:"0.000 d"} valueColor={absenceCoveredBySC?"#2e7d32":remainingAbsence>0?"#c62828":T.faint} />
                      {alreadyCtoDeducted>0&&<R label={`CTO offset (${existingCtoDeductions[0]?.earn_status||"pending"})`} value={`− ${alreadyCtoDeducted.toFixed(3)} d`} valueColor="#2e7d32" faded />}
                      {alreadyScDeductedAbsenceOnly>0&&<R label={`SC deducted (${existingScDeductions.find((e)=>!isScTardinessDeductionRow(e))?.earn_status||"pending"})`} value={`− ${alreadyScDeductedAbsenceOnly.toFixed(3)} d`} valueColor="#1565c0" faded />}
                    </>
                  ) : (
                    <Typography sx={{ fontSize:"0.7rem",fontWeight:500,color:T.text,fontFamily:T.poppins,lineHeight:1.5,py:0.5 }}>{NO_ABSENCES_RECORDED_MESSAGE}</Typography>
                  )}
                </CollapsibleLedger>

                {/* RIGHT — Tardiness offset */}
                <CollapsibleLedger
                  title={tardinessOffsetTitle}
                  valueLabel={tardinessHeaderValue}
                  valueColor={tardinessHeaderColor}
                  outline={tardinessLedgerOutline}
                  open={offsetsOpen}
                  onToggle={setOffsetsOpen}
                  statusBadge={
                    tardinessFullyDeducted ? (
                      <>
                        {postedTardinessChargeSource==="SC"&&<SBadge label={existingScTardinessDeductions.some((e)=>e.earn_status==="approved")?"SC applied":"SC pending"} approved={existingScTardinessDeductions.some((e)=>e.earn_status==="approved")} />}
                        <SBadge label={tardinessApproved||tardinessSalaryFullyRecovered?"Applied":"Pending"} approved={tardinessApproved||tardinessSalaryFullyRecovered} />
                      </>
                    ) : null
                  }
                  footer={
                    showTardiness&&tardinessFullyDeducted ? (
                      <Box sx={{ px:1.25,py:0.5,borderTop:`1.5px solid ${tardinessApproved||tardinessSalaryFullyRecovered?"rgba(46,125,50,0.38)":"rgba(230,81,0,0.35)"}`,bgcolor:tardinessApproved||tardinessSalaryFullyRecovered?"rgba(46,125,50,0.07)":"rgba(230,81,0,0.07)",display:"flex",alignItems:"center",gap:0.5,minHeight:26 }}>
                        <CheckIcon sx={{ fontSize:12,color:tardinessApproved||tardinessSalaryFullyRecovered?"#2e7d32":"#e65100",flexShrink:0 }} />
                        <Typography noWrap sx={{ fontSize:"0.6rem",fontWeight:700,color:tardinessApproved||tardinessSalaryFullyRecovered?"#1b5e20":"#7a4a00",fontFamily:T.poppins,flex:1,minWidth:0 }}>
                          {tardinessSalaryFullyRecovered?"Charged to salary.":tardinessApproved?"Fully deducted.":"Pending approval."}
                        </Typography>
                      </Box>
                    ) : rightTardLedgerBal!=null ? (
                      <BalanceFooter bal={rightTardLedgerBal} label={rightTardLedgerLabel} />
                    ) : (
                      <Box sx={{ px:1.1,py:0.6,borderTop:"1px solid rgba(0,0,0,0.08)",bgcolor:"rgba(0,0,0,0.02)" }}>
                        <Typography sx={{ fontSize:"0.6rem",color:T.muted,fontFamily:T.poppins }}>No tardiness this period.</Typography>
                      </Box>
                    )
                  }
                >
                  <R label={`${tardinessLedgerHeading} balance`} sub={balLoading?"Loading…":tardinessIsSkipped&&!postedTardinessChargeSource?"No new charge":"Current"} value={balLoading?"…":`${(String(tardinessDisplaySource).toUpperCase()==="SALARY_DEDUCTION"?0:tardDisplayBalDays).toFixed(3)} d`} valueColor={tardDisplayBalDays>0||String(tardinessDisplaySource).toUpperCase()==="SALARY_DEDUCTION"?"#1e4d20":T.faint} bold />
                  {!tardinessIsSkipped && <R label="Buffer" sub="—" value="—" valueColor={T.faint} faded />}
                  {showTardiness && (
                    <R label="Tardiness to offset" sub={tardHrs>0?`${tardHrs.toFixed(3)} hrs`:"—"} value={remainingTardiness>0.0001?`− ${remainingTardiness.toFixed(3)} d`:tardDays>0?`− ${tardDays.toFixed(3)} d`:"0.000 d"} valueColor={tardDays>0?"#c62828":T.faint} />
                  )}
                  {(totalTardPostedLeave>0||postedTardinessCtoDays>0) && (
                    <R label={`Posted (${existingTardinessDeductions[0]?.earn_status||existingCtoTardinessDeductions[0]?.earn_status||"pending"})`} value={`− ${totalTardPostedLeaveAndCto.toFixed(3)} d`} valueColor="#2e7d32" faded />
                  )}
                </CollapsibleLedger>
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══ STEP 2 ═══ */}
        {showStep2AccountsCard && (
          <Box sx={{ borderRadius:1.5, border:"1px solid rgba(0,0,0,0.1)", bgcolor:"#fff", overflow:"hidden" }}>
            <Box sx={{ px:1.6, py:0.9, bgcolor:"rgba(0,0,0,0.03)", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", gap:0.75 }}>
              <StepNum n={2} />
              <Box>
                <Typography sx={{ fontSize:"0.72rem", fontWeight:600, color:T.text, fontFamily:T.poppins }}>
                  Select deduction accounts
                </Typography>
                <Typography sx={{ fontSize:"0.63rem", color:T.muted, fontFamily:T.poppins, mt:0.1, lineHeight:1.4 }}>
                  Choose where each amount posts. <strong>Absences apply first</strong>, then tardiness. Leave on <em>Select…</em> to skip that side.
                  {" "}<strong>Salary Deduction</strong> records a salary shortfall (payroll audit trail).
                </Typography>
              </Box>
            </Box>
            <Box sx={{ px:1.6, py:1.1 }}>
              <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", sm:"1fr 1fr" }, gap:1 }}>
                {/* Absence source selector */}
                {absentDays>0&&!absenceCoveredBySC&&!absenceFullyDeducted&&remainingAbsenceForSalaryApply>1e-5&&!(absencePending||absenceApproved) ? (
                  <ChargeSourceField
                    id="cto-absence-deduction-src"
                    label="Absences charged to"
                    value={absenceSource}
                    onChange={(e)=>setAbsenceSource(e.target.value)}
                    disabled={deductionOptionsLoading||absenceOptionsUi.length===0}
                    options={absenceOptionsUi}
                    skipValue={DEDUCTION_SKIP_VALUE}
                    describe={(o)=>{
                      const codeU=String(o.value||"").toUpperCase();
                      if(codeU==="SALARY_DEDUCTION")return null;
                      const bal=getDeductionSourceBalanceDays(o.value,deductionCreditCtxAbsence);
                      const rowOk=isDeductionSourceSufficient(bal,remainingAbsence,o.value);
                      const hasBalance=(bal??0)>1e-6;
                      return { text: balLoading?"…":`${(bal??0).toFixed(3)} d`, color: balLoading?T.muted:rowOk||hasBalance?T.balOk:T.balBad };
                    }}
                  />
                ) : (
                  <Box sx={{ border:"1px dashed rgba(0,0,0,0.12)",borderRadius:1.25,p:1.25,bgcolor:"rgba(0,0,0,0.02)" }}>
                    <Typography sx={{ fontSize:"0.65rem",color:T.muted,fontFamily:T.poppins,lineHeight:1.45 }}>
                      {absentDays<=1e-9?NO_ABSENCES_RECORDED_MESSAGE:"Absence charge not needed — covered, N/A, or pending approval."}
                    </Typography>
                  </Box>
                )}

                {/* Tardiness source selector */}
                {tardDays>0.0001&&!tardinessFullyDeducted ? (
                  <ChargeSourceField
                    id="cto-tardiness-deduction-src"
                    label="Tardiness charged to"
                    value={tardinessSource}
                    onChange={(e)=>setTardinessSource(e.target.value)}
                    disabled={deductionOptionsLoading||tardinessOptionsUi.length===0||remainingTardiness<=0.0001||tardinessPending||tardinessApproved}
                    options={tardinessOptionsUi}
                    skipValue={DEDUCTION_SKIP_VALUE}
                    describe={(o)=>{
                      const codeU=String(o.value||"").toUpperCase();
                      if(codeU==="SALARY_DEDUCTION")return null;
                      const bal=getDeductionSourceBalanceDays(o.value,deductionCreditCtxTardiness);
                      const rowOk=isDeductionSourceSufficient(bal,remainingTardiness,o.value);
                      const hasBalance=(bal??0)>1e-6;
                      return { text: balLoading?"…":`${(bal??0).toFixed(3)} d`, color: balLoading?T.muted:rowOk||hasBalance?T.balOk:T.balBad };
                    }}
                  />
                ) : (
                  <Box sx={{ border:"1px dashed rgba(0,0,0,0.12)",borderRadius:1.25,p:1.25,bgcolor:"rgba(0,0,0,0.02)" }}>
                    <Typography sx={{ fontSize:"0.65rem",color:T.muted,fontFamily:T.poppins,lineHeight:1.45 }}>
                      No tardiness charge needed — no tardiness, already posted, or pending approval.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Blocked credit alerts */}
        {(absenceCreditSelectedButBlocked||tardinessCreditSelectedButBlocked)&&!bothDone&&showStep2AccountsCard&&(
          <Alert severity="info" sx={{ py:0.5,fontSize:"0.65rem",borderRadius:1.25 }}>
            Selected leave/credit has <strong>no usable balance</strong>. Switch to <strong>Salary Deduction</strong> in Step 2, or use <strong>Deduct from salary</strong> below.
          </Alert>
        )}
        {(tardinessPending||tardinessApproved)&&tardDays>0&&!tardinessFullyDeducted&&(
          <Alert severity={tardinessApproved?"success":"warning"} sx={{ py:0.35,fontSize:"0.65rem" }}>Tardiness deduction already {tardinessApproved?"approved":"pending"}.</Alert>
        )}
        {(absencePending||absenceApproved||scPending||scApproved)&&absentDays>0&&!absenceCoveredBySC&&!absenceFullyDeducted&&remainingAbsence>0&&(
          <Alert severity={absenceApproved||scApproved?"success":"warning"} sx={{ py:0.35,fontSize:"0.65rem" }}>Absence deduction already {absenceApproved||scApproved?"approved":"pending"}.</Alert>
        )}

        {/* ═══ STEP 3 — Half-day deductions ═══ */}
        {halfDayRows.length>0&&typeof onDeductHalfDayVLRequested==="function"&&(
          <Box sx={{
            borderRadius:1.5,
            border:`1px solid ${halfDayPendingCount===0&&halfDayOnLeaveCount===0?"rgba(46,125,50,0.45)":halfDayOnLeaveCount>0&&halfDayPendingCount===0?LEAVE_OVERLAY.border:"rgba(0,0,0,0.1)"}`,
            bgcolor:"#fff", overflow:"hidden",
          }}>
            <Box sx={{
              px:1.6, py:0.9,
              bgcolor:halfDayPendingCount===0&&halfDayOnLeaveCount===0?"rgba(46,125,50,0.06)":halfDayOnLeaveCount>0&&halfDayPendingCount===0?LEAVE_OVERLAY.bg:"rgba(0,0,0,0.03)",
              borderBottom:"1px solid rgba(0,0,0,0.08)",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:1, flexWrap:"wrap",
            }}>
              <Box sx={{ display:"flex", alignItems:"center", gap:0.75, minWidth:0 }}>
                <StepNum n={3} done={halfDayPendingCount===0&&halfDayOnLeaveCount===0&&halfDayRows.length>0} />
                <Box>
                  <Typography sx={{ fontSize:"0.72rem", fontWeight:600, color:T.text, fontFamily:T.poppins }}>
                    Half-day VL deductions
                  </Typography>
                  <Typography sx={{ fontSize:"0.63rem", color:T.muted, fontFamily:T.poppins, mt:0.1 }}>
                    {halfDayPendingCount>0
                      ? `${halfDayPendingCount} pending · click "Deduct from VL" per date`
                      : halfDayOnLeaveCount>0&&halfDayRows.length>0
                        ? `${halfDayOnLeaveCount} on leave · deduct via Leave Request`
                        : "All half days applied for this period"}
                  </Typography>
                </Box>
              </Box>
              <Chip size="small"
                label={
                  halfDayPendingCount>0
                    ?`${halfDayPendingCount} pending`
                    :halfDayOnLeaveCount>0
                      ?`${halfDayOnLeaveCount} on leave`
                      :`${halfDayRows.length} applied`
                }
                sx={{
                  height:20,fontSize:"0.6rem",fontWeight:700,border:"none",
                  bgcolor:halfDayPendingCount>0?"#FCEBEB":halfDayOnLeaveCount>0?LEAVE_OVERLAY.bg:"rgba(46,125,50,0.12)",
                  color:halfDayPendingCount>0?"#791F1F":halfDayOnLeaveCount>0?LEAVE_OVERLAY.color:"#1b5e20",
                }}
              />
            </Box>

            <Box sx={{ px:1.6, py:1 }}>
              <Box sx={{ display:"flex", flexDirection:"column", gap:0.75 }}>
                {halfDayRows.map((d)=>{
                  const dateKey=normalizeHalfDayDateKey(d);
                  const isDeducted=halfDayDeductedSet.has(dateKey);
                  const leaveOverlay=!isDeducted?halfDayLeaveOverlayFor(d):null;
                  return(
                    <Box key={dateKey||d} sx={{
                      display:"flex", alignItems:"center", justifyContent:"space-between", gap:1, flexWrap:"wrap",
                      py:"8px", px:"10px",
                      border:isDeducted?"1.5px solid rgba(46,125,50,0.35)":leaveOverlay?`1.5px solid ${LEAVE_OVERLAY.border}`:"0.5px solid rgba(0,0,0,0.1)",
                      borderRadius:1.25,
                      bgcolor:isDeducted?"rgba(46,125,50,0.05)":leaveOverlay?LEAVE_OVERLAY.bg:"transparent",
                    }}>
                      <Box sx={{ display:"flex", alignItems:"center", gap:0.85, minWidth:0, flex:1 }}>
                        <Box sx={{ width:6,height:6,borderRadius:"50%",bgcolor:isDeducted?"#2e7d32":leaveOverlay?LEAVE_OVERLAY.color:"#E24B4A",flexShrink:0 }} />
                        <Box sx={{ minWidth:0 }}>
                          <Typography sx={{ fontSize:"0.78rem",fontWeight:600,fontFamily:T.poppins,color:T.text,lineHeight:1.2 }}>
                            {formatHalfDayHeading(d)}
                          </Typography>
                          {isDeducted?null:leaveOverlay?(
                            <Typography sx={{ fontSize:"0.62rem",color:LEAVE_OVERLAY.color,fontFamily:T.poppins,mt:0.1,lineHeight:1.35 }}>
                              {leaveOverlay.detail} — {leaveOverlay.sub}
                            </Typography>
                          ):(
                            <Typography sx={{ fontSize:"0.62rem",color:T.muted,fontFamily:T.poppins,mt:0.1 }}>Half day — deduction not yet applied</Typography>
                          )}
                        </Box>
                      </Box>
                      {isDeducted?(
                        <Box sx={{ display:"flex",alignItems:"center",gap:0.4,py:0.3,px:0.85,borderRadius:1,bgcolor:"rgba(46,125,50,0.12)",border:"1px solid rgba(46,125,50,0.3)",flexShrink:0 }}>
                          <CheckIcon sx={{ fontSize:13,color:"#2e7d32" }} />
                          <Typography sx={{ fontSize:"0.68rem",fontWeight:700,color:"#1b5e20",fontFamily:T.poppins,whiteSpace:"nowrap" }}>Deducted</Typography>
                        </Box>
                      ):leaveOverlay?(
                        <Box sx={{ display:"flex",alignItems:"center",gap:0.4,py:0.3,px:0.85,borderRadius:1,bgcolor:LEAVE_OVERLAY.bg,border:`1px solid ${LEAVE_OVERLAY.border}`,flexShrink:0 }}>
                          <Typography sx={{ fontSize:"0.68rem",fontWeight:700,color:LEAVE_OVERLAY.color,fontFamily:T.poppins,whiteSpace:"nowrap" }}>{leaveOverlay.label}</Typography>
                        </Box>
                      ):(
                        <Button variant="outlined" size="small" onClick={()=>onDeductHalfDayVLRequested(d)}
                          sx={{ textTransform:"none",fontWeight:600,fontSize:"0.7rem",py:0.4,px:1,borderRadius:1.25,borderColor:"rgba(220,80,80,0.6)",color:"#791F1F",bgcolor:"#FCEBEB","&:hover":{borderColor:"#E24B4A",bgcolor:"#FCE5E5"},flexShrink:0 }}>
                          Deduct VL
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </Box>
              <Typography sx={{ fontSize:"0.62rem",color:T.faint,fontFamily:T.poppins,mt:0.85,lineHeight:1.4 }}>
                Deducting reduces the employee's leave balance permanently — cannot be undone without a manual adjustment.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Negative balance note */}
        {(newCtoBalance<0||newVlBalance<0)&&(
          <Box sx={{ px:1,py:0.65,borderRadius:1.25,bgcolor:"rgba(198,40,40,0.06)",border:"1px solid rgba(198,40,40,0.22)" }}>
            <Typography sx={{ fontSize:"0.62rem",color:T.muted,fontFamily:T.poppins,lineHeight:1.5 }}>
              <strong style={{ color:"#c62828" }}>Note:</strong> Negative balance will be directly deducted from salary.
            </Typography>
          </Box>
        )}

        {deductError&&<Alert severity="error" sx={{ py:0.5,fontSize:"0.65rem",borderRadius:1 }}>{deductError}</Alert>}

        {bothDone&&!deductSuccess&&(
          <Box sx={{ px:1,py:0.65,borderRadius:1.25,bgcolor:"rgba(46,125,50,0.07)",border:"1px solid rgba(46,125,50,0.2)" }}>
            <Typography sx={{ fontSize:"0.65rem",fontWeight:700,color:"#1b5e20",fontFamily:T.poppins }}>
              All absence and tardiness deductions are applied for this period.
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        {(()=>{
          const lockedAbsence=absencePending||absenceApproved||scPending||scApproved;
          const lockedTardiness=tardinessPending||tardinessApproved;
          const canApply=!bothDone&&(((willApplyAbsence&&!lockedAbsence)||(willApplyTardiness&&!lockedTardiness))||((willApplyAbsenceToSalary&&!lockedAbsence)||(willApplyTardinessToSalary&&!lockedTardiness))||(showScWarningButtons&&(policySelection==="sc"||policySelection==="cto")&&!lockedAbsence));
          if(!showDeductFromSalaryButton&&!canApply)return null;
          return(
            <Box sx={{ display:"flex",flexDirection:"column",gap:0.75 }}>
              {showDeductFromSalaryButton&&(
                <Button fullWidth variant="outlined" size="medium"
                  onClick={()=>{ setSalaryOnlyModalError(""); setSalaryOnlyModalOpen(true); }}
                  startIcon={<MoneyOffIcon sx={{ fontSize:"16px !important" }} />}
                  sx={{ py:0.9,fontSize:"0.82rem",fontWeight:700,textTransform:"none",fontFamily:T.poppins,borderRadius:1.25,borderColor:T.accent,color:T.accent,borderWidth:1.5,"&:hover":{borderColor:T.accentDark,bgcolor:"rgba(109,35,35,0.06)"} }}>
                  Deduct from salary
                </Button>
              )}
              {canApply&&(
                <Button fullWidth variant="contained" size="medium"
                  onClick={()=>{ if(showScWarningButtons&&(policySelection==="sc"||policySelection==="cto"))openConfirm(policySelection);else openConfirm("normal"); }}
                  startIcon={<DeductIcon sx={{ fontSize:"16px !important" }} />}
                  sx={{ py:1,fontSize:"0.82rem",fontWeight:700,textTransform:"none",fontFamily:T.poppins,borderRadius:1.25,bgcolor:T.accent,color:"#fff",boxShadow:"none","&:hover":{bgcolor:T.accentDark,boxShadow:"none"} }}>
                  {applyIsSalaryOnly?"Apply deduction to salary":"Apply all deductions"}
                </Button>
              )}
            </Box>
          );
        })()}
      </Box>

{/* ══════════ CONFIRM MODAL ══════════ */}
{(()=>{
  // One column per charge. Posting order is absences first, then tardiness (handleDeduct).
  const poolBalanceDays=(src)=>{
    const c=String(src||"").toUpperCase();
    if(c==="CTO")return ctoBal;
    if(c==="SC")return scBuffer;
    return toNum(assignmentMap[src]?.remaining_hours)/8;
  };
  const cols=[];
  if(deductSource==="sc"||deductSource==="cto"){
    const isSc=deductSource==="sc";
    const before=isSc?scBuffer:ctoBal;
    const after=isSc?(allowScNegZero&&Object.is(newScBalance,-0)?0:newScBalance):newCtoBalanceOverride;
    cols.push({key:"abs",kind:"absence",pool:isSc?"Service Credit (SC)":"Comp. Time Off (CTO)",amount:absenceAmountForSource,before,after});
  }else if(deductSource==="normal"){
    if(willApplyAbsence&&remainingAbsence>0){
      const before=poolBalanceDays(absenceSource);
      cols.push({key:"abs",kind:"absence",pool:humanizeDeductionCharge(absenceSource),amount:remainingAbsence,before,after:Number((before-remainingAbsence).toFixed(3))});
    }else if(willApplyAbsenceToSalary&&remainingAbsenceForSalaryApply>1e-5){
      cols.push({key:"abs",kind:"absence",pool:"Salary",amount:remainingAbsenceForSalaryApply,before:null,after:null});
    }
    if(willApplyTardiness&&remainingTardiness>0){
      cols.push({key:"tar",kind:"tardiness",pool:humanizeDeductionCharge(tardinessSource),amount:remainingTardiness,before:tardPoolBeforeTardiness,after:newVlBalance,afterAbsence:absenceChargedToTardinessPool>0});
    }else if(willApplyTardinessToSalary&&remainingTardinessForSalaryApply>1e-5){
      cols.push({key:"tar",kind:"tardiness",pool:"Salary",amount:remainingTardinessForSalaryApply,before:null,after:null});
    }
  }
  const two=cols.length>1;
  const total=cols.reduce((s,c)=>s+c.amount,0);
  const pools=[...new Set(cols.map((c)=>c.pool))];
  const coveredAbsence=Math.max(0,absentDays-remainingAbsence);
  return (
<DeductionDialog
  open={confirmOpen}
  onClose={closeConfirm}
  busy={deducting}
  wide={two}
  title={two?"Absence & tardiness deduction":cols[0]?.kind==="tardiness"?"Tardiness deduction":"Absence deduction"}
  subtitle={`${monthName(month)} ${year} · Charged to ${pools.join(" and ")||"—"}`}
  footer={
    <DialogFooter
      onCancel={closeConfirm}
      onConfirm={handleDeduct}
      busy={deducting}
      disabled={!confirmDeductionAcknowledged||cols.length===0}
      confirmLabel={deductSource==="normal"&&applyIsSalaryOnly?"Apply to salary":"Confirm deduction"}
    />
  }
>
  <DSection>
    <EmployeeStrip
      name={employee?.fullName||employee?.employeeNumber||"Employee"}
      meta={`${employee?.employeeNumber||"—"}${empCatDisplay?` · ${empCatDisplay}`:""}`}
    />
  </DSection>

  <Box sx={{ display:"grid",gridTemplateColumns:{ xs:"1fr",md:two?"1fr 1fr":"1fr" } }}>
    {cols.map((c,i)=>(
      <Box key={c.key} sx={{ borderLeft:{ md:two&&i>0?`1px solid ${D.line}`:"none" },borderTop:{ xs:i>0?`1px solid ${D.line}`:"none",md:"none" },minWidth:0 }}>
        <DSection title={two?`${i===0?"1st":"2nd"} · ${c.kind==="absence"?"Absence":"Tardiness"}`:"What happened"}>
          <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:1,flexWrap:"wrap",mb:1.25 }}>
            <Typography sx={{ fontSize:"1.05rem",fontWeight:700,fontFamily:D.font }}>{monthName(month)} {year}</Typography>
            <Tag tone={c.kind==="absence"?"bad":"warn"}>{c.kind==="absence"?"Absence":"Tardiness"}</Tag>
          </Box>
          {c.kind==="absence"?(
            <StatRow items={[
              { label:"Recorded",value:`${absentDays.toFixed(3)} d` },
              { label:"Covered",value:`${coveredAbsence.toFixed(3)} d`,tone:"ok" },
              { label:"To deduct",value:`${c.amount.toFixed(3)} d`,tone:"bad" },
            ]} />
          ):(
            <StatRow items={[
              { label:"Late",value:hoursToClock(tardHrs) },
              { label:"Posted",value:hoursToClock(totalTardPostedLeaveAndCto*8),tone:"ok" },
              { label:"To deduct",value:hoursToClock(c.amount*8),tone:"bad" },
            ]} />
          )}
        </DSection>
        <DSection title="What will be deducted">
          <AmountLine hours={(c.amount*8).toFixed(3)} days={c.amount} />
        </DSection>
        <DSection title="Balance after" last={two}>
          <BalanceAfter
            before={c.before}
            after={c.after}
            poolLabel={c.pool}
            salaryText={`Recorded as a salary deduction (${c.amount.toFixed(3)} d). No leave credits are used.`}
          />
          {/* Below the meter so Before/After line up across both columns. */}
          {c.afterAbsence&&(
            <Typography sx={{ fontSize:"0.7rem",color:D.mute,fontFamily:D.font,mt:0.5,textAlign:"center" }}>Starts from the balance left after the absence is charged.</Typography>
          )}
        </DSection>
      </Box>
    ))}
  </Box>

  <DSection sx={{ borderTop:`1px solid ${D.line}` }}>
    {deductSource==="cto"&&(
      <Typography sx={{ fontSize:"0.74rem",color:"#bf360c",fontFamily:D.font,mb:1 }}>
        Policy override: the SC balance ({scBuffer.toFixed(3)} d) is not used up; deducting from CTO instead.
      </Typography>
    )}
    {deductSource==="sc"&&(
      <Typography sx={{ fontSize:"0.74rem",color:D.mute,fontFamily:D.font,mb:1 }}>Following the SC-first policy: SC is used before CTO.</Typography>
    )}
    <NoteToggle value={remark} onChange={setRemark} disabled={deducting} />
  </DSection>

  <DSection last>
    <ConfirmBlock
      warning={
        <>This deducts <b>{total.toFixed(3)} days</b>{two?<> (absence first, then tardiness)</>:null}{" "}from {pools.join(" and ")||"—"}.
        {" "}{pools.includes("Salary")&&pools.length===1?"It is recorded as a salary shortfall for payroll.":"It can only be undone by a manual adjustment or a Void in Leave Assignment."}</>
      }
      checked={confirmDeductionAcknowledged}
      onChange={setConfirmDeductionAcknowledged}
      disabled={deducting}
    />
    {deductError&&<Alert severity="error" sx={{ mt:1.25,py:0.25,fontSize:"0.72rem",borderRadius:"10px" }}>{deductError}</Alert>}
  </DSection>
</DeductionDialog>
  );
})()}


{/* ══════════ SALARY-ONLY MODAL ══════════ */}
<Dialog open={salaryOnlyModalOpen} onClose={()=>!salaryOnlySubmitting&&setSalaryOnlyModalOpen(false)} maxWidth={false}
        PaperProps={{ sx:{ width:"100%",maxWidth:400,borderRadius:"16px",overflow:"hidden",border:"0.5px solid rgba(0,0,0,0.09)",boxShadow:"0 12px 48px rgba(0,0,0,0.2)" } }}>

        {/* Header */}
        <Box sx={{ px:2.5,pt:2.25,pb:2,background:T.accent,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:1.5 }}>
          <Box sx={{ display:"flex",alignItems:"center",gap:1.25,minWidth:0 }}>
            <Box sx={{ width:36,height:36,borderRadius:"50%",bgcolor:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <MoneyOffIcon sx={{ fontSize:17,color:"#fff" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize:"0.6rem",color:"rgba(255,255,255,0.55)",fontWeight:400,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:T.poppins,mb:0.25 }}>Salary shortfall</Typography>
              <Typography sx={{ fontFamily:T.poppins,fontWeight:500,fontSize:"1.05rem",color:"#fff",lineHeight:1.2 }}>Confirm salary deduction</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={()=>!salaryOnlySubmitting&&setSalaryOnlyModalOpen(false)} disabled={salaryOnlySubmitting}
            sx={{ color:"#fff",bgcolor:"rgba(255,255,255,0.12)",borderRadius:1,p:0.5,"&:hover":{bgcolor:"rgba(255,255,255,0.22)"} }}>
            <Close sx={{ fontSize:14 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p:0 }}>
          <Box sx={{ px:2,pt:1.75,pb:2,display:"flex",flexDirection:"column",gap:1.5 }}>

            {/* Employee card */}
            <Box sx={{ display:"flex",alignItems:"center",gap:1.25,bgcolor:"rgba(0,0,0,0.04)",borderRadius:"10px",border:"0.5px solid rgba(0,0,0,0.08)",px:1.5,py:1.25 }}>
              <Avatar sx={{ width:36,height:36,bgcolor:T.accent,fontSize:"0.78rem",fontWeight:500,fontFamily:T.poppins,flexShrink:0 }}>
                {(employee?.fullName||employee?.employeeNumber||"Employee").split(" ").filter(Boolean).slice(0,2).map((n)=>n[0]?.toUpperCase()).join("")}
              </Avatar>
              <Box sx={{ flex:1,minWidth:0 }}>
                <Typography sx={{ fontSize:"0.875rem",fontWeight:500,color:T.text,fontFamily:T.poppins,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {employee?.fullName||employee?.employeeNumber||"Employee"}
                </Typography>
                <Typography sx={{ fontSize:"0.72rem",color:T.faint,fontFamily:T.poppins,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  #{employee?.employeeNumber||"—"}{empCatDisplay?` · ${empCatDisplay}`:""}
                </Typography>
              </Box>
              <Box sx={{ textAlign:"right",flexShrink:0 }}>
                <Typography sx={{ fontSize:"0.65rem",color:T.faint,fontFamily:T.poppins,mb:0.25 }}>Period</Typography>
                <Typography sx={{ fontSize:"0.8rem",fontWeight:500,color:T.text,fontFamily:T.poppins,lineHeight:1.15,textAlign:"right" }}>
                  {monthName(month)}<br/>{year}
                </Typography>
              </Box>
            </Box>

            {/* ── TRANSACTION SUMMARY ── */}
            <Box>
              <Typography sx={{ fontSize:"0.6rem",fontWeight:500,color:T.faint,fontFamily:T.poppins,textTransform:"uppercase",letterSpacing:"0.07em",mb:0.75 }}>Transaction summary</Typography>
              <Box sx={{ border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:"10px",overflow:"hidden",bgcolor:"#fff" }}>

                {/* Charge to */}
                <Box sx={{ px:1.75,py:1.1,borderBottom:"0.5px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:1 }}>
                  <Box sx={{ display:"flex",alignItems:"center",gap:0.75 }}>
                    <MoneyOffIcon sx={{ fontSize:16,color:T.faint }} />
                    <Typography sx={{ fontSize:"0.8rem",color:T.muted,fontFamily:T.poppins }}>Charge to</Typography>
                  </Box>
                  <Box sx={{ bgcolor:"rgba(0,0,0,0.05)",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:"6px",px:1.25,py:0.25 }}>
                    <Typography sx={{ fontSize:"0.78rem",fontWeight:700,color:T.text,fontFamily:T.poppins }}>Salary</Typography>
                  </Box>
                </Box>

                {/* Absence line — only if applicable */}
                {salaryModalAbsenceDays>1e-5&&(
                  <Box sx={{ px:1.75,py:1.1,borderBottom:salaryModalTardinessDays>1e-5?"0.5px solid rgba(0,0,0,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:1 }}>
                    <Box sx={{ display:"flex",alignItems:"center",gap:0.75 }}>
                      <DeductIcon sx={{ fontSize:16,color:T.faint }} />
                      <Typography sx={{ fontSize:"0.8rem",fontWeight:500,color:T.text,fontFamily:T.poppins }}>Absence</Typography>
                    </Box>
                    <Typography sx={{ fontSize:"0.875rem",fontWeight:500,color:"#c62828",fontFamily:T.poppins,flexShrink:0 }}>− {salaryModalAbsenceDays.toFixed(3)} d</Typography>
                  </Box>
                )}

                {/* Tardiness line — only if applicable */}
                {salaryModalTardinessDays>1e-5&&(
                  <Box sx={{ px:1.75,py:1.1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:1 }}>
                    <Box sx={{ display:"flex",alignItems:"center",gap:0.75 }}>
                      <DeductIcon sx={{ fontSize:16,color:T.faint }} />
                      <Typography sx={{ fontSize:"0.8rem",fontWeight:500,color:T.text,fontFamily:T.poppins }}>Tardiness</Typography>
                    </Box>
                    <Typography sx={{ fontSize:"0.875rem",fontWeight:500,color:"#c62828",fontFamily:T.poppins,flexShrink:0 }}>− {salaryModalTardinessDays.toFixed(3)} d</Typography>
                  </Box>
                )}

              </Box>
            </Box>

            {/* ── DASHED DIVIDER ── */}
            <Box sx={{ display:"flex",alignItems:"center",gap:1 }}>
              <Box sx={{ flex:1,borderTop:"1.5px dashed rgba(0,0,0,0.12)" }} />
              <Box sx={{ width:22,height:22,borderRadius:"50%",bgcolor:"rgba(0,0,0,0.06)",border:"0.5px solid rgba(0,0,0,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <Typography sx={{ fontSize:"0.65rem",color:T.faint,lineHeight:1 }}>✂</Typography>
              </Box>
              <Box sx={{ flex:1,borderTop:"1.5px dashed rgba(0,0,0,0.12)" }} />
            </Box>

            {/* ── TOTAL PILL ── */}
            <Box sx={{ bgcolor:T.accent,borderRadius:"10px",px:1.75,py:1.5,display:"flex",alignItems:"center",justifyContent:"space-between",gap:1 }}>
              <Box>
                <Typography sx={{ fontSize:"0.6rem",color:"rgba(255,255,255,0.55)",fontFamily:T.poppins,textTransform:"uppercase",letterSpacing:"0.07em",mb:0.4 }}>Total to be deducted on salary</Typography>
                <Typography sx={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.6)",fontFamily:T.poppins }}>{salaryModalTotalDays.toFixed(3)} days · {salaryModalTotalHrs.toFixed(3)} hrs</Typography>
              </Box>
              <Typography sx={{ fontSize:"1.5rem",fontWeight:500,color:"#fff",fontFamily:T.poppins,lineHeight:1 }}>{salaryModalTotalDays.toFixed(3)} d</Typography>
            </Box>

            {/* Note */}
            <Box sx={{ bgcolor:"#FAEEDA",borderRadius:"8px",px:1.5,py:1.1,border:"0.5px solid #FAC775",display:"flex",gap:0.85,alignItems:"flex-start" }}>
              <InfoOutlinedIcon sx={{ fontSize:15,color:"#633806",flexShrink:0,mt:"2px" }} />
              <Typography sx={{ fontSize:"0.72rem",color:"#633806",fontFamily:T.poppins,lineHeight:1.5 }}>
                Audit trail only — no SC, CTO, or leave balance will be reduced. Recorded as salary shortfall for payroll.
              </Typography>
            </Box>

            {/* Acknowledge checkbox */}
            <FormControlLabel
              control={<Checkbox size="small" checked={confirmDeductionAcknowledged} onChange={(e)=>setConfirmDeductionAcknowledged(e.target.checked)} disabled={salaryOnlySubmitting} sx={{ py:0,color:T.accent,"&.Mui-checked":{color:T.accent} }} />}
              label={<Typography sx={{ fontSize:"0.75rem",fontFamily:T.poppins,color:T.faint,lineHeight:1.5 }}>I confirm that this amount will be deducted from the employee's salary for this period.</Typography>}
              sx={{ alignItems:"flex-start",ml:0,mr:0,mb:0 }}
            />

            {salaryOnlyModalError&&(
              <Alert severity="error" sx={{ py:0.5,fontSize:"0.65rem",borderRadius:1.25 }}>{salaryOnlyModalError}</Alert>
            )}

          </Box>
        </DialogContent>

        <DialogActions sx={{ display:"flex",justifyContent:"stretch",gap:1,px:2,pt:0,pb:2.5,bgcolor:"transparent" }}>
          <Button size="medium" onClick={()=>!salaryOnlySubmitting&&setSalaryOnlyModalOpen(false)} disabled={salaryOnlySubmitting}
            sx={{ flex:1,fontSize:"0.8rem",fontWeight:500,textTransform:"none",fontFamily:T.poppins,color:T.text,borderRadius:"8px",py:1.25,border:"0.5px solid rgba(0,0,0,0.12)",bgcolor:"transparent" }}>
            Cancel
          </Button>
          <Button size="medium" variant="contained" onClick={handleSalaryShortcutConfirm}
            disabled={salaryOnlySubmitting||salaryModalTotalDays<=1e-5||!confirmDeductionAcknowledged}
            disableElevation
            startIcon={salaryOnlySubmitting?<CircularProgress size={11} sx={{ color:"#fff" }} />:<SaveIcon sx={{ fontSize:"13px !important" }} />}
            sx={{ flex:2,fontSize:"0.8rem",fontWeight:500,textTransform:"none",fontFamily:T.poppins,bgcolor:T.accent,borderRadius:"8px",py:1.25,boxShadow:"none","&:hover":{bgcolor:T.accentDark,boxShadow:"none"},"&.Mui-disabled":{bgcolor:"rgba(109,35,35,0.4)",color:"#fff"} }}>
            {salaryOnlySubmitting?"Recording…":"Confirm salary deduction"}
          </Button>
        </DialogActions>

      </Dialog>
    </>
  );
};

// ─── DeductionReceiptSwitcher ─────────────────────────────────────────────────
const DeductionReceiptSwitcher = ({
  employee, attendanceData, year, month, onDeductSuccess, refreshKey, empCat,
  onDeductHalfDayVLRequested, halfDayDeductDate, halfDayPendingDates,
  deductedVlHalfDates, leaveByDate, filedLeaveByDate, metricsTardinessHrs, metricsAbsentDays,
  cscCategory, onStatusChange,
}) => {
  if (!employee || !attendanceData?.summary) return null;
  return (
    <CTODeductionReceipt
      employee={employee} attendanceData={attendanceData} year={year} month={month}
      onDeductSuccess={onDeductSuccess} refreshKey={refreshKey} empCat={empCat}
      onDeductHalfDayVLRequested={onDeductHalfDayVLRequested}
      halfDayDeductDate={halfDayDeductDate} halfDayPendingDates={halfDayPendingDates}
      deductedVlHalfDates={deductedVlHalfDates}
      leaveByDate={leaveByDate}
      filedLeaveByDate={filedLeaveByDate}
      metricsTardinessHrs={metricsTardinessHrs}
      metricsAbsentDays={metricsAbsentDays}
      cscCategory={cscCategory}
      onStatusChange={onStatusChange}
    />
  );
};

export { CTODeductionReceipt, DeductionReceiptSwitcher };