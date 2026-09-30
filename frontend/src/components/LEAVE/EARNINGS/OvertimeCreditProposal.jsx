import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography, Tooltip, TextField } from "@mui/material";
import API_BASE_URL from "../../../apiConfig";

const T = {
  accent: "#6d2323",
  text: "#1a1a1a",
  muted: "#666",
  line: "rgba(0,0,0,0.09)",
  ok: "#2e7d32",
  warn: "#8a5d06",
  warnBg: "#fff8e6",
  warnLine: "#f3d38a",
  bad: "#b4283f",
  font: "'Poppins', sans-serif",
};

/**
 * Server computation for CTO (CSC-DBM JC 2 s.2004) or Service Credit (8 h = 1 day) for the month.
 * @param {"cto"|"sc"} kind
 */
export function useOvertimeProposal(kind, employee, year, month, refreshKey = 0) {
  const [state, setState] = useState({ loading: false, proposal: null, error: "" });
  useEffect(() => {
    if (!employee?.employeeNumber) {
      setState({ loading: false, proposal: null, error: "" });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    axios
      .get(`${API_BASE_URL}/api/earnings/${kind}/proposal/${employee.employeeNumber}`, {
        params: { year, month },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => !cancelled && setState({ loading: false, proposal: r.data || null, error: "" }))
      .catch((e) => !cancelled && setState({ loading: false, proposal: null, error: e?.response?.data?.error || "Could not compute." }));
    return () => {
      cancelled = true;
    };
  }, [kind, employee?.employeeNumber, year, month, refreshKey]);
  return state;
}

/** True when the entered hours are not the computed amount (or the category does not earn it). */
export const differsFromOvertimeProposal = (proposal, hours) => {
  if (!proposal) return false;
  if (!proposal.eligible) return hours > 0;
  return Math.abs((Number(hours) || 0) - (Number(proposal.hours) || 0)) > 0.0005;
};

/** Computation card: result, formula, caps, per-day breakdown, warnings and legal basis. */
export const OvertimeProposalCard = ({ kind, proposal, loading, error, onUse }) => {
  const [showDays, setShowDays] = useState(false);
  const label = kind === "cto" ? "CTO (compensatory overtime credit)" : "Service credit";
  return (
    <Box sx={{ mb: 1.25, p: 1.25, borderRadius: "10px", border: `1px solid ${T.line}`, bgcolor: "rgba(0,0,0,0.02)" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.muted, fontFamily: T.font }}>
          {kind === "cto" ? "CSC computation" : "Computed"} · {label}
        </Typography>
        {proposal?.basis?.length > 0 && (
          <Tooltip title={<Box>{proposal.basis.map((b) => <Box key={b} sx={{ mb: 0.5 }}>{b}</Box>)}</Box>} arrow>
            <Typography component="span" sx={{ fontSize: "0.66rem", color: T.accent, fontFamily: T.font, cursor: "help", borderBottom: "1px dotted currentColor" }}>
              Basis
            </Typography>
          </Tooltip>
        )}
      </Box>
      {loading && !proposal ? (
        <Typography sx={{ fontSize: "0.74rem", color: T.muted, fontFamily: T.font, mt: 0.5 }}>Computing…</Typography>
      ) : error ? (
        <Typography sx={{ fontSize: "0.74rem", color: T.bad, fontFamily: T.font, mt: 0.5 }}>{error}</Typography>
      ) : !proposal ? null : !proposal.eligible ? (
        <Typography sx={{ fontSize: "0.78rem", color: T.bad, fontWeight: 600, fontFamily: T.font, mt: 0.5 }}>Not earned: {proposal.reason}</Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: T.ok, fontFamily: T.font, fontVariantNumeric: "tabular-nums" }}>
              {Number(proposal.hours).toFixed(3)} h
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontFamily: T.font }}>= {Number(proposal.days).toFixed(3)} d</Typography>
            {onUse && (
              <Box component="button" type="button" onClick={onUse} sx={{ all: "unset", ml: "auto", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, color: T.accent, textDecoration: "underline", textUnderlineOffset: "3px", fontFamily: T.font }}>
                Use computed amount
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: "0.7rem", color: T.muted, fontFamily: T.font }}>{proposal.formula}</Typography>
          {proposal.caps && (
            <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.font, mt: 0.25 }}>
              Earned this month {Number(proposal.caps.earnedThisMonth).toFixed(3)} / {proposal.caps.monthlyCap} h · balance {Number(proposal.caps.currentBalance).toFixed(3)} / {proposal.caps.balanceCap} h
              {proposal.expiryDate ? ` · usable until ${proposal.expiryDate}` : ""}
            </Typography>
          )}
          {proposal.perDay?.length > 0 && (
            <>
              <Box component="button" type="button" onClick={() => setShowDays((v) => !v)} sx={{ all: "unset", cursor: "pointer", fontSize: "0.68rem", color: T.accent, fontFamily: T.font, mt: 0.5, display: "inline-block" }}>
                {showDays ? "Hide" : "Show"} {proposal.perDay.length} day{proposal.perDay.length === 1 ? "" : "s"}
              </Box>
              {showDays && (
                <Box sx={{ mt: 0.5, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 0.5 }}>
                  {proposal.perDay.map((d) => (
                    <Typography key={d.date} sx={{ fontSize: "0.66rem", fontFamily: T.font, color: T.text }}>
                      {d.date} {d.weekday} · {Number(d.hours).toFixed(3)} h
                      {kind === "cto" && <Box component="span" sx={{ color: d.offDay ? T.warn : T.muted }}> × {d.offDay ? "1.5" : "1.0"}{d.holiday ? " (holiday)" : ""}</Box>}
                    </Typography>
                  ))}
                </Box>
              )}
            </>
          )}
        </>
      )}
      {(proposal?.warnings || []).map((w) => (
        <Typography key={w} sx={{ fontSize: "0.66rem", color: T.warn, fontFamily: T.font, mt: 0.4 }}>{w}</Typography>
      ))}
    </Box>
  );
};

/** Office order / certificate reference (required for CTO) and the override reason when needed. */
export const OvertimeAuthorityAndOverride = ({ kind, authorityRef, onAuthorityRef, overrideNeeded, overrideReason, onOverrideReason, proposal }) => (
  <>
    {kind === "cto" && (
      <TextField
        size="small"
        fullWidth
        required
        label="Office order / Certificate of COC Earned no."
        value={authorityRef}
        onChange={(e) => onAuthorityRef(e.target.value)}
        error={!String(authorityRef || "").trim()}
        helperText="Required: overtime must be authorized in advance (CSC-DBM JC 2 s.2004)."
        sx={{ mb: 1, "& .MuiInputBase-input, & .MuiInputLabel-root, & .MuiFormHelperText-root": { fontFamily: T.font, fontSize: "0.76rem" } }}
      />
    )}
    {overrideNeeded && (
      <Box sx={{ mb: 1, p: 1.1, borderRadius: "10px", bgcolor: T.warnBg, border: `1px solid ${T.warnLine}` }}>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.warn, fontFamily: T.font, mb: 0.75 }}>
          Override: the amount differs from the computation
          {proposal?.eligible ? ` (${Number(proposal.hours).toFixed(3)} h)` : " (not earned by this category)"}
        </Typography>
        <TextField
          size="small"
          fullWidth
          required
          placeholder="Reason for the override (required, saved with the earning)"
          value={overrideReason}
          onChange={(e) => onOverrideReason(e.target.value)}
          error={!String(overrideReason || "").trim()}
          sx={{ "& .MuiInputBase-input": { fontFamily: T.font, fontSize: "0.76rem" }, bgcolor: "#fff" }}
        />
      </Box>
    )}
  </>
);
