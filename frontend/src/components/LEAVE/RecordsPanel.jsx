// ─── RecordsPanel (drop-in replacement) ───────────────────────────────────────
//
// Changes from original:
//   1. fetch() now sends ?year=YYYY&month=M so the API filters by month too
//   2. The panel accepts a `selectedMonth` prop and passes it through
//   3. EarningRow label now shows the full month name instead of a 3-char slice
//   4. BalanceSummaryBar for leave now shows period_month when present
//
// Usage in LeaveEarningsPanel / SCEarningsPanel / CTOEarningsPanel:
//   <RecordsPanel
//     employeeNumber={employee?.employeeNumber}
//     type="leave"          // "leave" | "sc" | "cto"
//     unit={unit}
//     refreshKey={refreshKey}
//     selectedMonth={periodMonth}   // ← NEW: pass the currently-selected month
//   />

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  Box, Typography, CircularProgress, Button, IconButton,
  Chip, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Balance as BalanceIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Pending as PendingIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
} from "@mui/icons-material";

// ── Theme (matches EarningsManagement.jsx tokens) ─────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  divider:      "rgba(0,0,0,0.08)",
  surface:      "#ffffff",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  poppins:      "'Poppins', sans-serif",
  statusPending:  { bg: "rgba(237,108,2,0.1)",  color: "#bf360c", border: "rgba(237,108,2,0.3)"  },
  statusApproved: { bg: "rgba(46,125,50,0.1)",  color: "#1b5e20", border: "rgba(46,125,50,0.3)"  },
  statusRejected: { bg: "rgba(211,47,47,0.1)",  color: "#b71c1c", border: "rgba(211,47,47,0.3)"  },
};

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toNum    = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtNum   = (n) => toNum(n).toFixed(3);
const fmtHrs   = (h, unit) => unit === "hours"
  ? `${toNum(h).toFixed(3)} hrs`
  : `${(toNum(h) / 8).toFixed(3)} days`;

const monthLabel = (m) => {
  if (!m) return "";
  const idx = Number(m);
  return MONTH_NAMES[idx] || `Month ${m}`;
};

// period display: "2024 · March" or just "2024"
const periodDisplay = (year, month) => {
  if (!year) return "—";
  const m = monthLabel(month);
  return m ? `${year} · ${m}` : String(year);
};

const EARN_STATUS = {
  pending:  { label: "Pending",  ...T.statusPending,  Icon: PendingIcon },
  approved: { label: "Approved", ...T.statusApproved, Icon: CheckIcon   },
  rejected: { label: "Rejected", ...T.statusRejected, Icon: WarnIcon    },
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const meta = EARN_STATUS[status] || EARN_STATUS.pending;
  const { Icon } = meta;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.3, borderRadius: "20px",
      bgcolor: meta.bg, border: `1px solid ${meta.border}` }}>
      <Icon sx={{ fontSize: 11, color: meta.color }} />
      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: meta.color, fontFamily: T.poppins }}>
        {meta.label}
      </Typography>
    </Box>
  );
};

// ── BalanceSummaryBar ─────────────────────────────────────────────────────────
const BalanceStat = ({ label, value, unit, color, sub }) => (
  <Box sx={{ textAlign: "center", px: 1 }}>
    <Typography sx={{ fontSize: "0.58rem", color: T.faint, textTransform: "uppercase",
      letterSpacing: "0.07em", fontFamily: T.poppins, mb: 0.25 }}>{label}</Typography>
    <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: color || T.accent,
      lineHeight: 1, fontFamily: T.poppins }}>
      {toNum(value).toFixed(3)}
    </Typography>
    <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins }}>
      {unit === "hours" ? "hrs" : "days"}
    </Typography>
    {sub && (
      <Typography sx={{ fontSize: "0.55rem", color: alpha(color || T.accent, 0.6),
        fontFamily: T.poppins }}>{sub}</Typography>
    )}
  </Box>
);

const BalanceSummaryBar = ({ balances, unit, type }) => {
  if (!balances || balances.length === 0) return null;

  if (type === "leave") {
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
          <BalanceIcon sx={{ fontSize: 13, color: T.accent }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
            Current Balances (Assigned + Earned)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {balances.map((b) => {
            const total     = toNum(b.total_available_hours);
            const remaining = toNum(b.remaining_hours);
            const pct       = total > 0 ? Math.min((remaining / total) * 100, 100) : 0;
            // Show month label if present
            const periodStr = periodDisplay(b.period_year, b.period_month);
            return (
              <Box key={`${b.leave_code}-${b.period_year}-${b.period_month}`}
                sx={{ flex: "1 1 140px", p: 1.25, borderRadius: 2,
                  border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
                      {b.leave_code}
                    </Typography>
                    <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins }}>
                      {periodStr}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 900,
                    color: remaining > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
                    {unit === "hours" ? remaining.toFixed(3) : (remaining / 8).toFixed(3)}
                    <span style={{ fontSize: "0.6rem", color: T.faint }}> {unit === "hours" ? "h" : "d"}</span>
                  </Typography>
                </Box>
                <Box sx={{ height: 3, bgcolor: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden", mb: 0.5 }}>
                  <Box sx={{ height: "100%", width: `${pct}%`,
                    bgcolor: pct > 50 ? "#2e7d32" : pct > 20 ? "#ed6c02" : "#d32f2f", borderRadius: 2 }} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.56rem", color: T.faint, fontFamily: T.poppins }}>
                    Assigned: {fmtNum(unit === "hours" ? toNum(b.assigned_hours) : toNum(b.assigned_hours) / 8)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.56rem", color: "#1976d2", fontFamily: T.poppins }}>
                    +Earned: {fmtNum(unit === "hours" ? toNum(b.earned_hours) : toNum(b.earned_hours) / 8)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (type === "sc" || type === "cto") {
    const b = balances[0] || {};
    const periodStr = periodDisplay(b.period_year, b.period_month);
    return (
      <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
          <BalanceIcon sx={{ fontSize: 13, color: T.accent }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
            {type === "sc" ? "Service Credit" : "CTO"} Balance
            {periodStr && (
              <Box component="span" sx={{ ml: 1, fontSize: "0.65rem", fontWeight: 500, color: T.muted }}>
                — {periodStr}
              </Box>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "space-around", flexWrap: "wrap" }}>
          <BalanceStat label="Total Earned"
            value={unit === "hours" ? b.total_earned : toNum(b.total_earned) / 8}
            unit={unit} color="#1976d2" />
          <Box sx={{ width: 1, bgcolor: T.accentBorder }} />
          <BalanceStat label="Used"
            value={unit === "hours" ? b.total_used : toNum(b.total_used) / 8}
            unit={unit} color="#e65100" />
          <Box sx={{ width: 1, bgcolor: T.accentBorder }} />
          <BalanceStat label="Remaining"
            value={unit === "hours" ? b.total_remaining : toNum(b.total_remaining) / 8}
            unit={unit} color="#2e7d32" />
          <Box sx={{ width: 1, bgcolor: T.accentBorder }} />
          <BalanceStat label="Pending"
            value={unit === "hours" ? b.pending_hours : toNum(b.pending_hours) / 8}
            unit={unit} color="#bf360c" sub="awaiting approval" />
        </Box>
      </Box>
    );
  }

  return null;
};

// ── FieldInput (minimal styled TextField) ─────────────────────────────────────
const FieldInput = styled(({ ...props }) => <TextField {...props} />)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8, fontSize: "0.875rem", backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

// ── RejectDialog ──────────────────────────────────────────────────────────────
const RejectDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, fontFamily: T.poppins } }}>
      <DialogTitle sx={{ fontFamily: T.poppins, fontWeight: 700, fontSize: "0.95rem", color: T.accent }}>
        Reject Earning Entry
      </DialogTitle>
      <DialogContent>
        <FieldInput fullWidth multiline rows={3} size="small" label="Reason (optional)"
          value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Insufficient OT documentation…" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}
          sx={{ textTransform: "none", color: T.muted, fontFamily: T.poppins }}>Cancel</Button>
        <Button variant="contained" onClick={() => onConfirm(reason)} disabled={loading}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2,
            bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" }, fontFamily: T.poppins }}>
          {loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── EarningRow ────────────────────────────────────────────────────────────────
const EarningRow = ({ record, unit, type, onApprove, onReject, onDelete }) => {
  const earnH   = toNum(record.earned_hours ?? record.total_hours);
  const usedH   = toNum(record.used_hours);
  const remH    = toNum(record.remaining_hours ?? (earnH - usedH));
  const pct     = earnH > 0 ? Math.min((usedH / earnH) * 100, 100) : 0;
  const status  = record.earn_status || "pending";
  const typeColor = type === "leave" ? "#1976d2" : type === "sc" ? "#2e7d32" : T.accent;

  // Full period label: "2024 · March" or "2024"
  const periodStr = periodDisplay(record.period_year, record.period_month);

  return (
    <Box sx={{ px: 2, py: 1.75, border: `1px solid ${T.accentBorder}`, borderRadius: 2,
      bgcolor: "#fff", mb: 1,
      transition: "all 0.13s", "&:hover": { boxShadow: `0 2px 8px ${alpha(T.accent, 0.08)}` } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
            {/* Period — always show full month name */}
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: typeColor, fontFamily: T.poppins }}>
              {periodStr}
              {record.leave_code && ` · ${record.leave_code}`}
              {record.sc_type    && ` · SC`}
              {record.ot_hours !== undefined && !record.sc_type && ` · CTO`}
            </Typography>
            <StatusBadge status={status} />
            {record.sc_type && (
              <Chip size="small" label={record.sc_type.replace("_", "-")}
                sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700,
                  bgcolor: T.accentFaint, color: T.accentMid,
                  border: `1px solid ${T.accentBorder}` }} />
            )}
            {record.entry_type && record.entry_type !== "EARNED" && (
              <Chip size="small" label={record.entry_type}
                sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700,
                  bgcolor: "rgba(25,118,210,0.08)", color: "#1565c0" }} />
            )}
          </Box>

          {/* Progress bar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            <Box sx={{ flex: 1, height: 4, bgcolor: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: typeColor,
                borderRadius: 2, transition: "width 0.3s" }} />
            </Box>
            <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>
              {pct.toFixed(0)}% used
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {type === "sc" && (
              <Box>
                <Typography sx={{ fontSize: "0.58rem", color: T.faint, textTransform: "uppercase",
                  letterSpacing: "0.06em", fontFamily: T.poppins }}>OT Input</Typography>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>
                  {fmtHrs(toNum(record.total_ot_hours), unit)}
                </Typography>
              </Box>
            )}
            {[
              ["Earned",    earnH, typeColor],
              ["Used",      usedH, "#e65100"],
              ["Remaining", remH,  remH > 0 ? "#2e7d32" : T.faint],
            ].map(([lbl, val, clr]) => (
              <Box key={lbl}>
                <Typography sx={{ fontSize: "0.58rem", color: T.faint, textTransform: "uppercase",
                  letterSpacing: "0.06em", fontFamily: T.poppins }}>{lbl}</Typography>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: clr, fontFamily: T.poppins }}>
                  {fmtHrs(val, unit)}
                </Typography>
              </Box>
            ))}
          </Box>

          {record.remarks && (
            <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
              <InfoIcon sx={{ fontSize: 11, color: T.faint }} />
              <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins }}>
                {record.remarks}
              </Typography>
            </Box>
          )}

          {record.approved_by && (
            <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, mt: 0.5 }}>
              {status === "approved" ? "✓ Approved" : "✗ Rejected"} by {record.approved_by}
              {record.rejected_reason ? ` — "${record.rejected_reason}"` : ""}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flexShrink: 0 }}>
          {status === "pending" && (
            <>
              <Tooltip title="Approve">
                <IconButton size="small" onClick={() => onApprove(record)}
                  sx={{ width: 28, height: 28, bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32",
                    border: "1px solid rgba(46,125,50,0.25)",
                    "&:hover": { bgcolor: "rgba(46,125,50,0.15)" } }}>
                  <ApproveIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton size="small" onClick={() => onReject(record)}
                  sx={{ width: 28, height: 28, bgcolor: "rgba(211,47,47,0.06)", color: "#d32f2f",
                    border: "1px solid rgba(211,47,47,0.2)",
                    "&:hover": { bgcolor: "rgba(211,47,47,0.12)" } }}>
                  <RejectIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(record)}
              sx={{ width: 28, height: 28, color: T.faint,
                border: `1px solid ${T.accentBorder}`,
                "&:hover": { color: "#d32f2f", borderColor: "rgba(211,47,47,0.3)" } }}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  RecordsPanel — the main export
// ══════════════════════════════════════════════════════════════════════════════
const RecordsPanel = ({ employeeNumber, type, unit, refreshKey, selectedMonth }) => {
  const [data, setData]                   = useState({ earnings: [], balances: [] });
  const [loading, setLoading]             = useState(false);
  const [showAll, setShowAll]             = useState(false);
  const [rejectDialog, setRejectDialog]   = useState({ open: false, record: null });
  const [actionLoading, setActionLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!employeeNumber) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const year  = new Date().getFullYear();

      // Build query: always include year; include month when one is selected
      let url = `${API_BASE_URL}/api/earnings/${type}/${employeeNumber}?year=${year}`;
      if (selectedMonth) url += `&month=${selectedMonth}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData({ earnings: res.data.earnings || [], balances: res.data.balances || [] });
    } catch {
      setData({ earnings: [], balances: [] });
    }
    setLoading(false);
  }, [employeeNumber, type, selectedMonth]);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  const handleApprove = async (record) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/earnings/${type}/${record.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetch();
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/earnings/${type}/${rejectDialog.record.id}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRejectDialog({ open: false, record: null });
      fetch();
    } catch {}
    setActionLoading(false);
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Delete this earning record? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/api/earnings/${type}/${record.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetch();
    } catch {}
  };

  if (!employeeNumber) return null;

  const displayed     = showAll ? data.earnings : data.earnings.slice(0, 5);
  const pendingCount  = data.earnings.filter((e) => e.earn_status === "pending").length;
  const monthName     = selectedMonth ? MONTH_NAMES[Number(selectedMonth)] : null;

  return (
    <Box sx={{ mt: 3 }}>
      {/* Section header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1, height: 1, bgcolor: T.divider }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <HistoryIcon sx={{ fontSize: 13, color: T.accent }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
            Earnings History
            {monthName && (
              <Box component="span" sx={{ ml: 0.75, fontWeight: 500, color: T.muted }}>
                — {monthName}
              </Box>
            )}
          </Typography>
          {pendingCount > 0 && (
            <Chip size="small" label={`${pendingCount} pending`}
              sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700,
                bgcolor: T.statusPending.bg, color: T.statusPending.color,
                border: `1px solid ${T.statusPending.border}` }} />
          )}
        </Box>
        <IconButton size="small" onClick={fetch} disabled={loading} sx={{ p: 0.25 }}>
          <RefreshIcon sx={{ fontSize: 14, color: loading ? T.faint : T.accent }} />
        </IconButton>
        <Box sx={{ flex: 1, height: 1, bgcolor: T.divider }} />
      </Box>

      {/* Balance summary */}
      <BalanceSummaryBar balances={data.balances} unit={unit} type={type} />

      {/* Records */}
      {loading ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <CircularProgress size={20} sx={{ color: T.accent }} />
        </Box>
      ) : data.earnings.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center", bgcolor: T.accentFaint, borderRadius: 2,
          border: `1px dashed ${T.accentBorder}` }}>
          <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>
            {monthName
              ? `No earning records for ${monthName} ${new Date().getFullYear()}`
              : `No earning records yet for this year`}
          </Typography>
        </Box>
      ) : (
        <>
          {displayed.map((record) => (
            <EarningRow
              key={record.id}
              record={record}
              unit={unit}
              type={type}
              onApprove={handleApprove}
              onReject={(r) => setRejectDialog({ open: true, record: r })}
              onDelete={handleDelete}
            />
          ))}
          {data.earnings.length > 5 && (
            <Box sx={{ textAlign: "center", mt: 0.5 }}>
              <Button size="small" onClick={() => setShowAll((v) => !v)}
                endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ fontSize: "0.72rem", color: T.accent, textTransform: "none",
                  fontFamily: T.poppins }}>
                {showAll ? "Show less" : `Show all ${data.earnings.length} records`}
              </Button>
            </Box>
          )}
        </>
      )}

      <RejectDialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, record: null })}
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </Box>
  );
};

export default RecordsPanel;