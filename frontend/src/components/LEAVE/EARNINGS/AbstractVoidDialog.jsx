import React, { useEffect, useState } from "react";
import axios from "axios";
import { Dialog, Box, Typography, IconButton, Checkbox, FormControlLabel, Button, CircularProgress, Alert } from "@mui/material";
import { Close, Block as BlockIcon } from "@mui/icons-material";
import API_BASE_URL from "../../../apiConfig";

const T = {
  text: "#1a1a1a",
  muted: "#666",
  faint: "#888",
  divider: "rgba(0,0,0,0.08)",
  accent: "#6d2323",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.14)",
  font: "'Poppins', sans-serif",
};

const LEAVE_NAMES = { VL: "Vacation Leave", SL: "Sick Leave" };
const nameFor = (code) => LEAVE_NAMES[code] || code;

const Item = ({ tone, children }) => (
  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", py: 0.5 }}>
    <Box component="span" aria-hidden="true" sx={{ mt: "6px", width: 6, height: 6, borderRadius: "50%", flexShrink: 0, bgcolor: tone === "undo" ? "#c62828" : "#2e7d32" }} />
    <Typography sx={{ fontSize: "0.8rem", color: T.text, fontFamily: T.font, lineHeight: 1.45 }}>{children}</Typography>
  </Box>
);

/**
 * Void from the Abstract: the same rollback as Leave Assignment → Void (attendance deductions and
 * earnings for the leave type and year; assignment, approved leave requests and commutations stay).
 * Runs POST /leaveRoute/leave_assignment/void-rollback once per selected leave type.
 *
 * @param {{ employeeNumber, name, year, leaveCodes: string[], hasScCto: boolean }} target
 */
export default function AbstractVoidDialog({ open, target, onClose, onDone }) {
  const [selected, setSelected] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !target) return;
    setSelected(target.leaveCodes || []);
    setAgreed(false);
    setError("");
  }, [open, target]);

  if (!target) return null;
  const codes = target.leaveCodes || [];
  const selectedLabel = selected.map((c) => `${nameFor(c)} (${c})`).join(" and ") || "the selected leave";
  const toggle = (c) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const handleConfirm = async () => {
    setBusy(true);
    setError("");
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    const done = [];
    try {
      for (const code of selected) {
        await axios.post(
          `${API_BASE_URL}/leaveRoute/leave_assignment/void-rollback`,
          { employeeNumber: target.employeeNumber, leave_code: code, year: target.year },
          { headers },
        );
        done.push(code);
      }
      onDone?.(done);
      onClose();
    } catch (e) {
      setError(
        `${done.length ? `Voided ${done.join(", ")}. ` : ""}Could not void ${selected.filter((c) => !done.includes(c)).join(", ")}: ${e?.response?.data?.error || e.message}`,
      );
      if (done.length) onDone?.(done);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth={false} PaperProps={{ sx: { width: "100%", maxWidth: 500, borderRadius: "10px", overflow: "hidden", fontFamily: T.font } }}>
      <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fafbfc" }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "rgba(198,40,40,0.08)", border: "1px solid rgba(198,40,40,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BlockIcon sx={{ fontSize: 18, color: "#c62828" }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: T.text, fontFamily: T.font, lineHeight: 1.25 }}>Void deductions &amp; earnings</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.font }}>
            {target.name} · {target.employeeNumber} · {target.year}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={busy} size="small" aria-label="Close" sx={{ color: T.muted, border: `1px solid ${T.divider}`, borderRadius: "6px" }}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, py: 2.25 }}>
        <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.font, mb: 0.5 }}>
          Leave to void
        </Typography>
        {codes.length === 0 ? (
          <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontFamily: T.font }}>No leave deductions to void for this row.</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
            {codes.map((c) => (
              <FormControlLabel
                key={c}
                control={<Checkbox size="small" checked={selected.includes(c)} onChange={() => toggle(c)} disabled={busy} sx={{ "&.Mui-checked": { color: "#c62828" } }} />}
                label={<Typography sx={{ fontSize: "0.8rem", fontFamily: T.font }}>{nameFor(c)} ({c})</Typography>}
              />
            ))}
          </Box>
        )}

        <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.font, mt: 1, mb: 0.5 }}>Will be rolled back</Typography>
        <Item tone="undo">All absence, tardiness and half-day deductions charged to the selected leave in {target.year}</Item>
        <Item tone="undo">All earnings of the selected leave for {target.year} (pending and approved)</Item>
        <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.font, mt: 1.5, mb: 0.5 }}>Stays</Typography>
        <Item tone="keep">The assigned credits, approved leave requests and commutations</Item>
        <Item tone="keep">Leave types you did not select{target.hasScCto ? ", and SC / CTO deductions (void those from their own records)" : ", Service Credits and CTO"}</Item>

        <Box sx={{ mt: 1.75, p: 1.25, borderRadius: "8px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
          <Typography sx={{ fontSize: "0.74rem", color: T.muted, fontFamily: T.font, lineHeight: 1.45 }}>
            The balance returns to what was assigned, less leave actually taken. The rolled-back absences and half-days can be deducted again in Earnings Management.
          </Typography>
        </Box>

        <FormControlLabel
          sx={{ mt: 1.5, mr: 0, alignItems: "flex-start" }}
          control={<Checkbox size="small" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={busy || selected.length === 0} sx={{ pt: 0.25, "&.Mui-checked": { color: "#c62828" } }} />}
          label={
            <Typography sx={{ fontSize: "0.8rem", color: T.text, fontFamily: T.font, lineHeight: 1.45 }}>
              I confirm that I want to void all deductions and earnings for {selectedLabel} in {target.year}.
            </Typography>
          }
        />
        {error && <Alert severity="error" sx={{ mt: 1, fontSize: "0.74rem", py: 0.25 }}>{error}</Alert>}
      </Box>

      <Box sx={{ px: 3, py: 1.5, display: "flex", justifyContent: "flex-end", gap: 1, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafbfc" }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none", fontFamily: T.font, fontWeight: 600, fontSize: "0.8rem", color: T.muted }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!agreed || busy || selected.length === 0}
          startIcon={busy ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <BlockIcon sx={{ fontSize: "15px !important" }} />}
          sx={{ textTransform: "none", fontFamily: T.font, fontWeight: 600, fontSize: "0.8rem", bgcolor: "#c62828", boxShadow: "none", borderRadius: "8px", "&:hover": { bgcolor: "#b71c1c", boxShadow: "none" } }}
        >
          {busy ? "Voiding…" : "Void deductions & earnings"}
        </Button>
      </Box>
    </Dialog>
  );
}
