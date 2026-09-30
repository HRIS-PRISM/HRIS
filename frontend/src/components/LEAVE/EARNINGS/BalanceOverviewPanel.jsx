import React, { useMemo } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { POOL_META } from "../../../utils/cscLeaveRules";
import { periodsFor, periodKeyOf } from "./useLeavePeriodData";

const T = {
  accent: "#6d2323",
  line: "rgba(0,0,0,0.09)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  ok: "#2e7d32",
  bad: "#b4283f",
  poppins: "'Poppins', sans-serif",
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Row = ({ label, value, color }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: "7px", borderTop: `1px solid ${T.line}`, fontSize: "0.74rem", fontFamily: T.poppins }}>
    <span>{label}</span>
    <Box component="b" sx={{ fontVariantNumeric: "tabular-nums", color: color || T.text }}>{value}</Box>
  </Box>
);

/**
 * Month-by-month balance for one leave pool: annual summary, a 12-month picker and the selected
 * month's before / deducted / earned / after. Picking a month opens that month in the workflow.
 * @param {Array} props.periods normalized leave_assignment periods (useLeavePeriodData)
 * @param {string} props.selectedPool "VL" | "SL"
 */
export const BalanceOverviewPanel = ({
  periods,
  loading,
  year,
  month,
  unit,
  hoursPerDay = 8,
  selectedPool,
  onSelectPool,
  onSelectMonth,
}) => {
  const conv = (h) => (unit === "days" ? h / hoursPerDay : h);
  const fmt = (h) => conv(h).toFixed(3);
  const u = unit === "days" ? "d" : "h";

  /** All rows for the year, including an annual (whole-year) assignment stored with month 0. */
  const yearRows = useMemo(
    () => periodsFor(periods, selectedPool).filter((p) => p.year === year).sort((a, b) => a.key - b.key),
    [periods, selectedPool, year],
  );
  const byMonth = useMemo(() => {
    const m = {};
    for (const r of yearRows) if (r.month >= 1) m[r.month] = r; // latest row per month wins (rows are sorted)
    return m;
  }, [yearRows]);

  const first = yearRows[0];
  const last = yearRows[yearRows.length - 1];
  const totals = yearRows.reduce((a, r) => ({ used: a.used + r.used, earned: a.earned + r.earned }), { used: 0, earned: 0 });
  const signed = (sign, h) => (conv(h) >= 0.0005 ? `${sign}${fmt(h)}` : fmt(0));
  const selectedKey = periodKeyOf(year, month);
  // A month with its own period shows that period. A month without one had no activity: it
  // carries the balance of the latest period before it (the annual row or an earlier month).
  const ownRow = byMonth[month] || null;
  const carryFrom = ownRow ? null : [...yearRows].reverse().find((r) => r.key < selectedKey && !r.commuted) || null;
  const sel = ownRow
    || (carryFrom && { allocated: carryFrom.remaining, used: 0, earned: 0, remaining: carryFrom.remaining, carried: true });
  const carryLabel = carryFrom ? (carryFrom.month >= 1 ? `${MONTH_SHORT[carryFrom.month - 1]} ${carryFrom.year}` : "the annual assignment") : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", gap: 0.6 }}>
        {["VL", "SL"].map((code) => {
          const active = selectedPool === code;
          return (
            <Box
              key={code}
              component="button"
              type="button"
              onClick={() => onSelectPool(code)}
              aria-pressed={active}
              sx={{ all: "unset", cursor: "pointer", fontSize: "0.68rem", fontFamily: T.poppins, px: 1.1, py: "1px", borderRadius: 99, border: `1px solid ${active ? T.text : T.line}`, bgcolor: active ? T.text : "#fff", color: active ? "#fff" : T.muted, "&:focus-visible": { outline: `2px solid ${T.accent}` } }}
            >
              {code}
            </Box>
          );
        })}
      </Box>

      {loading ? (
        <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={18} sx={{ color: T.accent }} />
        </Box>
      ) : (
        <>
          <Box sx={{ borderRadius: "14px", p: 1.75, color: "#fff", background: "linear-gradient(135deg,#5e1420,#a52f40)" }}>
            <Typography sx={{ fontSize: "0.7rem", opacity: 0.8, fontFamily: T.poppins }}>
              {year} annual · {selectedPool}
            </Typography>
            <Typography sx={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.2, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
              {last ? fmt(last.remaining) : "—"} {last ? u : ""}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.75, mt: 1, flexWrap: "wrap", fontSize: "0.7rem", fontFamily: T.poppins }}>
              {[
                ["Before", first ? fmt(first.allocated) : "—"],
                ["Deducted", signed("−", totals.used)],
                ["Earned", signed("+", totals.earned)],
              ].map(([k, v]) => (
                <span key={k}>
                  {k}
                  <Box component="b" sx={{ display: "block", fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" }}>{v}</Box>
                </span>
              ))}
            </Box>
          </Box>

          <Box role="group" aria-label="Select month" sx={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
            {MONTH_SHORT.map((name, i) => {
              const m = i + 1;
              const row = byMonth[m];
              const on = periodKeyOf(year, m) === selectedKey;
              const active = row && (row.used > 1e-6 || row.earned > 1e-6);
              return (
                <Box
                  key={name}
                  component="button"
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelectMonth(year, m)}
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    fontFamily: T.poppins,
                    pt: "7px",
                    pb: "5px",
                    borderRadius: "10px",
                    border: `1.5px solid ${on ? T.accent : T.line}`,
                    bgcolor: on ? T.accent : "#fff",
                    color: on ? "#fff" : row ? T.text : T.muted,
                    opacity: on || row ? 1 : 0.6,
                    transition: "transform .2s",
                    "&:hover": { transform: "translateY(-2px)" },
                    "&:focus-visible": { outline: `2px solid ${T.accent}` },
                  }}
                >
                  {name}
                  <Box component="i" sx={{ display: "block", width: 5, height: 5, borderRadius: "50%", mx: "auto", mt: "3px", bgcolor: on ? "#fff" : active ? T.accent : "transparent" }} />
                </Box>
              );
            })}
          </Box>

          <Box sx={{ border: `1.5px solid ${T.line}`, borderRadius: "14px", bgcolor: "#fff", p: 1.75 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1.25 }}>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: T.poppins }}>
                {MONTH_FULL[month - 1] || "Annual"} {year}
              </Typography>
              {sel?.carried && (
                <Box component="span" sx={{ fontSize: "0.62rem", fontWeight: 600, px: 1, borderRadius: 99, bgcolor: "rgba(0,0,0,0.06)", color: T.muted }}>No activity</Box>
              )}
              {sel?.commuted && (
                <Box component="span" sx={{ fontSize: "0.62rem", fontWeight: 600, px: 1, borderRadius: 99, bgcolor: "rgba(0,0,0,0.06)", color: T.muted }}>Commuted</Box>
              )}
            </Box>
            {sel ? (
              <>
                <Row label={sel.carried ? `Before (carried from ${carryLabel})` : "Before"} value={`${fmt(sel.allocated)} ${u}`} />
                <Row label="Deducted" value={`${signed("−", sel.used)} ${u}`} color={T.bad} />
                <Row label="Earned" value={`${signed("+", sel.earned)} ${u}`} color={T.ok} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `2px solid ${T.text}`, pt: 1.25, mt: "2px", fontFamily: T.poppins }}>
                  <Typography component="span" sx={{ fontSize: "0.76rem", fontFamily: T.poppins }}>Balance after</Typography>
                  <Typography component="b" sx={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums", color: POOL_META[selectedPool]?.color || T.text }}>
                    {fmt(sel.remaining)} {u}
                  </Typography>
                </Box>
              </>
            ) : (
              <Typography sx={{ textAlign: "center", color: T.muted, fontSize: "0.74rem", py: 1.5, fontFamily: T.poppins }}>
                No data for this month yet.
              </Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.4 }}>
            Each month starts from the previous month&apos;s balance; a month with no deductions or earnings
            just carries it forward. Pick a month to open it.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default BalanceOverviewPanel;
