import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Avatar,
  Alert,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  EventNote as LeaveIcon,
  Close,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  RemoveCircleOutline as DeductIcon,
} from "@mui/icons-material";
import { useOfficialAttendanceMetrics } from "./useOfficialAttendanceMetrics";

// ─── Theme tokens (matches CTODeductionReceipt) ───────────────────────────────
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
};

const monthName = (m) => {
  const MONTHS = [
    { value: "1", label: "January" }, { value: "2", label: "February" },
    { value: "3", label: "March" }, { value: "4", label: "April" },
    { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" },
    { value: "9", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" },
  ];
  return MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
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

const hrsToHMS = (h) => {
  const totalSec = Math.round(Math.abs(h) * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

// ─── StepNum (matches CTODeductionReceipt) ────────────────────────────────────
const StepNum = ({ done = false }) => (
  <Box sx={{
    width: 20, height: 20, borderRadius: "50%",
    bgcolor: done ? "#2e7d32" : T.accent,
    color: "#fff",
    fontSize: "0.68rem", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, fontFamily: T.poppins,
    boxShadow: `0 1px 4px ${done ? "rgba(46,125,50,0.35)" : "rgba(109,35,35,0.35)"}`,
  }}>
    {done
      ? <CheckIcon sx={{ fontSize: 11 }} />
      : <LeaveIcon sx={{ fontSize: 11 }} />
    }
  </Box>
);

// ─── Receipt row helper ───────────────────────────────────────────────────────
const R = ({ label, sub, value, valueColor, bold, faded }) => (
  <Box sx={{
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    opacity: faded ? 0.55 : 1, mb: 0.4,
  }}>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{
        fontSize: bold ? "0.67rem" : "0.65rem", fontWeight: bold ? 700 : 500,
        color: "#2a2a2a", fontFamily: T.poppins, lineHeight: 1.4,
      }}>
        {label}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: "0.57rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1.3, mt: 0.1 }}>
          {sub}
        </Typography>
      )}
    </Box>
    {value !== undefined && (
      <Typography sx={{
        fontSize: bold ? "0.82rem" : "0.7rem", fontWeight: bold ? 900 : 600,
        color: valueColor || "#1a1a1a", fontFamily: T.poppins, ml: 1, flexShrink: 0, lineHeight: 1.4,
      }}>
        {value}
      </Typography>
    )}
  </Box>
);

// ─── BalanceFooter (matches CTODeductionReceipt) ──────────────────────────────
const BalanceFooter = ({ bal, label }) => {
  const color = bal < 0 ? "#c62828" : bal === 0 ? "#7a4a00" : "#1e4d20";
  return (
    <Box sx={{
      px: 1.25, py: 0.85,
      borderTop: "1.5px solid rgba(109,35,35,0.14)",
      bgcolor: bal < 0
        ? "rgba(198,40,40,0.05)"
        : bal === 0 ? "rgba(122,74,0,0.05)" : "rgba(30,77,32,0.05)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      {label && (
        <Typography sx={{
          fontSize: "0.62rem", fontWeight: 700, color: "#555",
          fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {label}
        </Typography>
      )}
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 900, color, fontFamily: T.poppins, ml: "auto" }}>
        {bal.toFixed(3)} d
      </Typography>
    </Box>
  );
};

// ─── VLDeductionReceipt ───────────────────────────────────────────────────────
const VLDeductionReceipt = ({
  employee,
  attendanceData,
  year,
  month,
  onDeductSuccess,
  refreshKey,
}) => {
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState("");
  const [deductSuccess, setDeductSuccess] = useState("");
  const [vlBalance, setVlBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(false);
  const [existingDeductions, setExistingDeductions] = useState([]);
  const [deductionsLoading, setDeductionsLoading] = useState(false);

  // ── Fetch VL balance ────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) { setVlBalance(null); return; }
    if (!silent) setBalLoading(true);
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const vl = r.data?.VL;
      setVlBalance(vl ? toNum(vl.remaining_hours) / 8 : 0);
    } catch {
      setVlBalance(0);
    } finally {
      if (!silent) setBalLoading(false);
    }
  }, [employee]);

  // ── Fetch existing deductions ───────────────────────────────────────────────
  const fetchExistingDeductions = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) { setExistingDeductions([]); return; }
    if (!silent) setDeductionsLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [postedRes, leaveRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/leaveRoute/leave_credit_usage/tardiness_posted`, {
          headers,
          params: {
            employeeNumber: employee.employeeNumber,
            period_year: year,
            period_month: month,
            leave_code: "VL",
          },
        }),
        axios.get(
          `${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`,
          { headers },
        ),
      ]);

      const postedHours =
        postedRes.status === "fulfilled" ? toNum(postedRes.value.data?.posted_hours) : 0;
      const all =
        leaveRes.status === "fulfilled" ? leaveRes.value.data?.earnings || [] : [];
      const pendingLegacy = all.filter(
        (e) =>
          e.entry_type === "TARDINESS_DEDUCTION" &&
          e.leave_code === "VL" &&
          e.earn_status === "pending",
      );
      const syntheticApproved =
        postedHours > 1e-9
          ? [{
              id: `lcu-tard-vl-${year}-${month}`,
              employee_number: employee.employeeNumber,
              leave_code: "VL",
              earned_hours: -postedHours,
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "TARDINESS_DEDUCTION",
              earn_status: "approved",
              remarks: "Tardiness offset (leave credit ledger)",
              _ledgerTardinessSynthetic: true,
            }]
          : [];
      setExistingDeductions([...pendingLegacy, ...syntheticApproved]);
    } catch {
      setExistingDeductions([]);
    } finally {
      if (!silent) setDeductionsLoading(false);
    }
  }, [employee, year, month]);

  useEffect(() => {
    fetchBalance({ silent: false });
    fetchExistingDeductions({ silent: false });
  }, [fetchBalance, fetchExistingDeductions]);

  useEffect(() => {
    if (refreshKey === 0 || !employee) return;
    fetchBalance({ silent: true });
    fetchExistingDeductions({ silent: true });
  }, [refreshKey, employee, fetchBalance, fetchExistingDeductions]);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const officialStart = attendanceData?.summary?.startDate || attendanceData?.period?.start;
  const officialEnd = attendanceData?.summary?.endDate || attendanceData?.period?.end;
  const { absentDays: absentDaysOfficial, lateHrs: lateHrsOfficial } =
    useOfficialAttendanceMetrics({
      employeeNumber: employee?.employeeNumber,
      startDate: officialStart,
      endDate: officialEnd,
    });

  const absentDays = absentDaysOfficial || toNum(attendanceData?.stats?.absent_days);
  const tardHrs = lateHrsOfficial > 0
    ? lateHrsOfficial
    : (() => {
        const raw = attendanceData?.summary
          ? parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness)
          : 0;
        return Math.max(0, raw - absentDays * 8);
      })();

  const tardDays = tardHrs / 8;
  const tardDec = Number(tardDays.toFixed(3));

  const alreadyDeductedDays = existingDeductions.reduce(
    (sum, e) => sum + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );
  const alreadyDeductedDec = Number(alreadyDeductedDays.toFixed(3));
  const remainingToDeductDec = Number(Math.max(0, tardDec - alreadyDeductedDec).toFixed(3));

  const vlBal = vlBalance !== null ? vlBalance : 0;
  const newBalance = Number((vlBal - remainingToDeductDec).toFixed(3));

  const hasFullyDeducted = tardDec > 0 && alreadyDeductedDec >= tardDec;
  const hasPendingDeduction = existingDeductions.some((e) => e.earn_status === "pending");
  const hasApprovedDeduction = existingDeductions.some((e) => e.earn_status === "approved");

  const isLoading = balLoading || deductionsLoading;

  // ── Deduct handler ──────────────────────────────────────────────────────────
  const handleDeduct = async () => {
    if (!employee || remainingToDeductDec <= 0) return;
    setDeducting(true);
    setDeductError("");
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_BASE_URL}/api/earnings/leave`,
        {
          employeeNumber: employee.employeeNumber,
          leave_code: "VL",
          earned_hours: -(remainingToDeductDec * 8),
          period_year: parseInt(year, 10),
          period_month: parseInt(month, 10),
          entry_type: "TARDINESS_DEDUCTION",
          remarks: `Auto-deduction: tardiness ${remainingToDeductDec.toFixed(3)}d (${(remainingToDeductDec * 8).toFixed(3)}h / ${hrsToHMS(remainingToDeductDec * 8)}) for ${monthName(month)} ${year}`,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const newVL = Number((vlBal - remainingToDeductDec).toFixed(3));
      setDeductSuccess(
        newVL < 0
          ? `Applied ${remainingToDeductDec.toFixed(3)}d tardiness to VL. Balance is ${newVL.toFixed(3)}d — salary shortfall recorded for overdraw.`
          : `Deducted ${remainingToDeductDec.toFixed(3)}d from VL. New balance ≈ ${newVL.toFixed(3)}d.`,
      );
      setConfirmOpen(false);
      setChecked(false);
      await Promise.all([fetchBalance(), fetchExistingDeductions()]);
      if (onDeductSuccess) onDeductSuccess();
      setTimeout(() => setDeductSuccess(""), 5000);
    } catch (err) {
      setDeductError("Deduction failed: " + (err.response?.data?.error || err.message));
    } finally {
      setDeducting(false);
    }
  };

  if (!attendanceData?.summary) return null;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <Box sx={{ mt: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {deductSuccess && (
          <Alert severity="success" sx={{ py: 0.5, fontSize: "0.65rem", borderRadius: 1.25 }}>
            {deductSuccess}
          </Alert>
        )}

        {/* ═══ Main Card ═══════════════════════════════════════════════════════ */}
        <Box sx={{
          borderRadius: 1.5,
          border: `1px solid ${hasFullyDeducted ? "rgba(46,125,50,0.22)" : T.accentBorder}`,
          bgcolor: "#fff",
          overflow: "hidden",
        }}>
          {/* Header — matches CTO Step headers */}
          <Box sx={{
            px: 1.6, py: 0.9,
            bgcolor: hasFullyDeducted ? "rgba(46,125,50,0.06)" : "rgba(0,0,0,0.03)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 1, flexWrap: "wrap",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
              <StepNum done={hasFullyDeducted} />
              <Box>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: T.text, fontFamily: T.poppins }}>
                  VL Tardiness Deduction
                </Typography>
                <Typography sx={{ fontSize: "0.63rem", color: T.muted, fontFamily: T.poppins, mt: 0.1 }}>
                  {hasFullyDeducted
                    ? "All tardiness applied for this period"
                    : tardDec > 0
                      ? `${remainingToDeductDec.toFixed(3)} d remaining to deduct`
                      : "No tardiness recorded this period"}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {isLoading && <CircularProgress size={11} sx={{ color: T.accent }} />}
              {hasFullyDeducted && (
                <Chip size="small"
                  label={hasApprovedDeduction ? "Applied" : "Pending"}
                  sx={{
                    height: 18, fontSize: "0.6rem", fontWeight: 700,
                    bgcolor: hasApprovedDeduction ? "rgba(46,125,50,0.14)" : "rgba(255,160,0,0.14)",
                    color: hasApprovedDeduction ? "#1b5e20" : "#7a4a00",
                    border: `1px solid ${hasApprovedDeduction ? "rgba(46,125,50,0.28)" : "rgba(255,160,0,0.28)"}`,
                  }}
                />
              )}
              {hasPendingDeduction && !hasFullyDeducted && (
                <Chip size="small" label="Partial"
                  sx={{
                    height: 18, fontSize: "0.6rem", fontWeight: 700,
                    bgcolor: "rgba(255,160,0,0.14)", color: "#7a4a00",
                    border: "1px solid rgba(255,160,0,0.28)",
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Body */}
          <Box sx={{ px: 1.6, py: 1.1 }}>
            {/* Partial notice */}
            {!hasFullyDeducted && alreadyDeductedDec > 0 && (
              <Box sx={{
                mb: 1, px: 1, py: 0.6, borderRadius: 1.25,
                bgcolor: "rgba(255,160,0,0.07)", border: "1px solid rgba(255,160,0,0.22)",
              }}>
                <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: "#7a4a00", fontFamily: T.poppins }}>
                  Partial: {alreadyDeductedDec.toFixed(3)}d already deducted — {remainingToDeductDec.toFixed(3)}d remaining
                </Typography>
              </Box>
            )}

            {/* Ledger card — matches CTO CollapsibleLedger inner style */}
            <Box sx={{
              border: `1px solid ${hasFullyDeducted ? "rgba(46,125,50,0.3)" : T.accentBorder}`,
              borderRadius: 1.5, overflow: "hidden", bgcolor: "#fff",
            }}>
              {/* VL Balance row */}
              <Box sx={{ px: "11px", py: "8px", borderBottom: `1px solid ${T.divider}` }}>
                <R
                  label="Vacation Leave (VL)"
                  sub={balLoading ? "Loading…" : "Current balance"}
                  value={balLoading ? "…" : `${vlBal.toFixed(3)} d`}
                  valueColor={vlBal > 0 ? "#1e4d20" : T.faint}
                  bold
                />
              </Box>

              {/* Tardiness rows */}
              <Box sx={{ px: "11px", py: "8px" }}>
                <R
                  label="Tardiness to offset"
                  sub={tardHrs > 0 ? `${tardHrs.toFixed(3)} hrs · ${hrsToHMS(tardHrs)}` : "No tardiness"}
                  value={tardDays > 0 ? `− ${tardDays.toFixed(3)} d` : "0.000 d"}
                  valueColor={tardDays > 0 ? "#c62828" : T.faint}
                  faded={tardDays === 0}
                />
                {alreadyDeductedDec > 0 && (
                  <R
                    label={`Already deducted (${existingDeductions[0]?.earn_status || "pending"})`}
                    value={`− ${alreadyDeductedDec.toFixed(3)} d`}
                    valueColor="#2e7d32"
                    faded
                  />
                )}
                {!hasFullyDeducted && remainingToDeductDec > 0 && (
                  <R
                    label="Remaining to deduct"
                    value={`− ${remainingToDeductDec.toFixed(3)} d`}
                    valueColor="#c62828"
                  />
                )}
              </Box>

              {/* Footer balance — matches BalanceFooter */}
              <BalanceFooter
                bal={hasFullyDeducted
                  ? Number((vlBal - alreadyDeductedDec).toFixed(3))
                  : newBalance}
                label={hasFullyDeducted ? "New VL balance" : "Balance after deduction"}
              />
            </Box>

            {/* Fully deducted success state */}
            {hasFullyDeducted && (
              <Box sx={{
                mt: 1, px: 1, py: 0.65, borderRadius: 1.25,
                bgcolor: hasApprovedDeduction ? "rgba(46,125,50,0.07)" : "rgba(255,160,0,0.07)",
                border: `1px solid ${hasApprovedDeduction ? "rgba(46,125,50,0.2)" : "rgba(255,160,0,0.22)"}`,
                display: "flex", alignItems: "center", gap: 0.6,
              }}>
                <CheckIcon sx={{ fontSize: 13, color: hasApprovedDeduction ? "#2e7d32" : "#e65100", flexShrink: 0 }} />
                <Typography sx={{
                  fontSize: "0.65rem", fontWeight: 700,
                  color: hasApprovedDeduction ? "#1b5e20" : "#7a4a00",
                  fontFamily: T.poppins,
                }}>
                  {hasApprovedDeduction
                    ? "Tardiness fully deducted & applied to VL balance."
                    : "Deduction submitted — pending approval."}
                </Typography>
              </Box>
            )}

            {/* Negative balance note */}
            {newBalance < 0 && !hasFullyDeducted && (
              <Box sx={{
                mt: 1, px: 1, py: 0.65, borderRadius: 1.25,
                bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
              }}>
                <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.45 }}>
                  <strong style={{ color: T.accent }}>Note:</strong> Negative balance will be directly deducted from salary.
                </Typography>
              </Box>
            )}

            {/* Action area */}
            {!hasFullyDeducted && tardDec > 0 && (
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                      disabled={remainingToDeductDec <= 0}
                      sx={{ py: 0, color: T.accent, "&.Mui-checked": { color: T.accent } }}
                    />
                  }
                  label={
                    <Typography sx={{
                      fontSize: "0.63rem",
                      color: remainingToDeductDec > 0 ? "#333" : T.faint,
                      fontFamily: T.poppins, lineHeight: 1.55,
                    }}>
                      Confirm deduction of{" "}
                      <strong style={{ color: T.accent }}>{remainingToDeductDec.toFixed(3)}d</strong>{" "}
                      tardiness from VL balance
                    </Typography>
                  }
                  sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  size="medium"
                  disabled={!checked || remainingToDeductDec <= 0 || isLoading}
                  onClick={() => setConfirmOpen(true)}
                  startIcon={<DeductIcon sx={{ fontSize: "16px !important" }} />}
                  sx={{
                    py: 1, fontSize: "0.82rem", fontWeight: 700,
                    textTransform: "none", fontFamily: T.poppins,
                    borderRadius: 1.25, bgcolor: T.accent, color: "#fff", boxShadow: "none",
                    "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
                    "&.Mui-disabled": { bgcolor: "rgba(109,35,35,0.3) !important", color: "#fff !important" },
                  }}
                >
                  Apply VL deduction
                </Button>
                {deductError && (
                  <Alert severity="error" sx={{ py: 0.5, fontSize: "0.65rem", borderRadius: 1 }}>
                    {deductError}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ══════════ CONFIRM MODAL (matches CTO confirm modal style) ══════════ */}
      <Dialog
        open={confirmOpen}
        onClose={() => !deducting && setConfirmOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "100%", maxWidth: 400, borderRadius: "16px",
            overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
          },
        }}
      >
        {/* Modal header — maroon gradient */}
        <Box sx={{
          px: 2.5, pt: 2.5, pb: 2,
          background: T.accent,
          position: "relative", overflow: "hidden",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5,
        }}>
          <Box sx={{
            position: "absolute", top: -30, right: -30,
            width: 100, height: 100, borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.06)", pointerEvents: "none",
          }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, position: "relative", zIndex: 1 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <LeaveIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{
                fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", fontWeight: 400,
                letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: T.poppins, mb: 0.25,
              }}>
                VL deduction
              </Typography>
              <Typography sx={{
                fontFamily: T.poppins, fontWeight: 500,
                fontSize: "1.0625rem", color: "#fff", lineHeight: 1.2,
              }}>
                Confirm transaction
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setConfirmOpen(false)}
            disabled={deducting}
            sx={{
              color: "#fff", bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: 1, p: 0.5, position: "relative", zIndex: 1,
              "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
            }}
          >
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, pt: 2, pb: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>

            {/* Employee card */}
            <Box sx={{
              display: "flex", alignItems: "center", gap: 1.25,
              bgcolor: "rgba(0,0,0,0.04)", borderRadius: "10px", px: 1.5, py: 1.25,
            }}>
              <Avatar sx={{
                width: 38, height: 38, bgcolor: T.accent,
                fontSize: "0.8125rem", fontWeight: 500, fontFamily: T.poppins, flexShrink: 0,
              }}>
                {(employee?.fullName || employee?.employeeNumber || "E")
                  .split(" ").filter(Boolean).slice(0, 2)
                  .map((n) => n[0]?.toUpperCase()).join("")}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: "0.875rem", fontWeight: 500, color: T.text,
                  fontFamily: T.poppins, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {employee?.fullName || employee?.employeeNumber || "Employee"}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontFamily: T.poppins }}>
                  #{employee?.employeeNumber || "—"}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins, mb: 0.25 }}>
                  Period
                </Typography>
                <Typography sx={{
                  fontSize: "0.8125rem", fontWeight: 500, color: T.text,
                  fontFamily: T.poppins, lineHeight: 1.1,
                }}>
                  {monthName(month)} {year}
                </Typography>
              </Box>
            </Box>

            {/* Transaction summary */}
            <Box sx={{ bgcolor: "rgba(0,0,0,0.04)", borderRadius: "10px", overflow: "hidden" }}>
              <Box sx={{ px: 1.5, py: 1, borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                <Typography sx={{
                  fontSize: "0.69rem", fontWeight: 500, color: T.faint,
                  fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em",
                }}>
                  Transaction summary
                </Typography>
              </Box>
              <Box sx={{
                px: 1.5, py: 1.25,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1,
              }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: T.text, fontFamily: T.poppins }}>
                    Tardiness deduction
                  </Typography>
                  <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins, mt: 0.125 }}>
                    Charged to VL · {(remainingToDeductDec * 8).toFixed(3)} hrs · {hrsToHMS(remainingToDeductDec * 8)}
                  </Typography>
                </Box>
                <Typography sx={{
                  fontSize: "0.875rem", fontWeight: 500,
                  color: "#c62828", fontFamily: T.poppins, flexShrink: 0,
                }}>
                  −{remainingToDeductDec.toFixed(3)} d
                </Typography>
              </Box>
            </Box>

            {/* Total deduction block — maroon */}
            <Box sx={{
              bgcolor: T.accent, borderRadius: "10px", px: 1.75, py: 1.5,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
            }}>
              <Box>
                <Typography sx={{
                  fontSize: "0.69rem", color: "rgba(255,255,255,0.65)",
                  fontFamily: T.poppins, textTransform: "uppercase",
                  letterSpacing: "0.07em", mb: 0.375,
                }}>
                  Total deduction
                </Typography>
                <Typography sx={{ fontSize: "0.69rem", color: "rgba(255,255,255,0.55)", fontFamily: T.poppins }}>
                  {remainingToDeductDec.toFixed(3)} days · {(remainingToDeductDec * 8).toFixed(3)} hrs
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "1.375rem", fontWeight: 500, color: "#fff", fontFamily: T.poppins }}>
                {remainingToDeductDec.toFixed(3)} d
              </Typography>
            </Box>

            {/* Balance preview */}
            <Box sx={{ bgcolor: "rgba(0,0,0,0.04)", borderRadius: "10px", overflow: "hidden" }}>
              <Box sx={{ px: 1.5, py: 1, borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                <Typography sx={{
                  fontSize: "0.69rem", fontWeight: 500, color: T.faint,
                  fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em",
                }}>
                  Balance preview
                </Typography>
              </Box>
              <Box sx={{ p: 1.25 }}>
                <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins, mb: 0.5 }}>
                  VL before
                </Typography>
                <Typography sx={{ fontSize: "0.9375rem", fontWeight: 500, color: T.text, fontFamily: T.poppins }}>
                  {vlBal.toFixed(3)} d
                </Typography>
                <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontFamily: T.poppins, mt: 0.125 }}>
                  −{remainingToDeductDec.toFixed(3)} d
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.65 }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    bgcolor: newBalance < 0 ? "#c62828" : newBalance === 0 ? "#f59e0b" : "#2e7d32",
                  }} />
                  <Typography sx={{
                    fontSize: "0.75rem", fontWeight: 500, fontFamily: T.poppins,
                    color: newBalance < 0 ? "#c62828" : newBalance === 0 ? "#92400e" : "#2e7d32",
                  }}>
                    {newBalance.toFixed(3)} d after
                  </Typography>
                </Box>
                {newBalance < 0 && (
                  <Typography sx={{
                    fontSize: "0.65rem", color: "#c62828",
                    fontFamily: T.poppins, fontWeight: 600, mt: 0.5,
                  }}>
                    Shortfall → salary deduction
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Info note — amber */}
            <Box sx={{
              bgcolor: "#FAEEDA", borderRadius: "8px", px: 1.5, py: 1.25,
              border: "0.5px solid #FAC775", display: "flex", gap: 1, alignItems: "flex-start",
            }}>
              <LeaveIcon sx={{ fontSize: 16, color: "#633806", flexShrink: 0, mt: "2px" }} />
              <Typography sx={{ fontSize: "0.75rem", color: "#633806", fontFamily: T.poppins, lineHeight: 1.5 }}>
                Posts to VL earnings. Requires approval before balance finalizes.
              </Typography>
            </Box>

            {/* Confirm checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  disabled={deducting}
                  sx={{ py: 0, color: T.accent, "&.Mui-checked": { color: T.accent } }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.75rem", fontFamily: T.poppins, color: T.faint, lineHeight: 1.5 }}>
                  I confirm the deduction source, amounts, and balances are correct.
                </Typography>
              }
              sx={{ alignItems: "flex-start", ml: 0, mr: 0, mb: 0 }}
            />

            {deductError && (
              <Alert severity="error" sx={{ py: 0.25, fontSize: "0.68rem", borderRadius: 1.5 }}>
                {deductError}
              </Alert>
            )}
          </Box>
        </DialogContent>

        {/* Modal actions — matches CTO style */}
        <DialogActions sx={{
          display: "flex", justifyContent: "stretch", gap: 1,
          px: 2.5, pt: 0, pb: 2.5, bgcolor: "transparent",
        }}>
          <Button
            size="medium"
            onClick={() => setConfirmOpen(false)}
            disabled={deducting}
            sx={{
              flex: 1, fontSize: "0.8125rem", fontWeight: 500,
              textTransform: "none", fontFamily: T.poppins,
              color: T.text, borderRadius: "8px", py: 1.25,
              border: "0.5px solid rgba(0,0,0,0.12)", bgcolor: "transparent",
            }}
          >
            Cancel
          </Button>
          <Button
            size="medium"
            variant="contained"
            onClick={handleDeduct}
            disabled={deducting || !checked}
            disableElevation
            startIcon={
              deducting
                ? <CircularProgress size={11} sx={{ color: "#fff" }} />
                : <DeductIcon sx={{ fontSize: "13px !important" }} />
            }
            sx={{
              flex: 2, fontSize: "0.8125rem", fontWeight: 500,
              textTransform: "none", fontFamily: T.poppins,
              bgcolor: T.accent, borderRadius: "8px", py: 1.25,
              boxShadow: "none",
              "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
              "&.Mui-disabled": { bgcolor: "rgba(109,35,35,0.4)", color: "#fff" },
            }}
          >
            {deducting ? "Processing…" : "Confirm deduction"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export { VLDeductionReceipt };