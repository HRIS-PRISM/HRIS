import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, CircularProgress, Tooltip } from "@mui/material";
import { keyframes } from "@mui/system";
import { OpenInNew as OpenInNewIcon, EventBusy as EmptyIcon } from "@mui/icons-material";
import { POOL_META, RULE, ruleFor, isPoolLocked } from "../../../utils/cscLeaveRules";
import { monthContext } from "./useLeavePeriodData";
import { S } from "./EarningsStepper";

/** VL and SL always show; other leave types appear once assigned in Leave Assignment. */
const BASE_CODES = ["VL", "SL"];

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
`;

/** This month's movement: deducted (−) sits after "current balance", earned (+) on the right. */
const Delta = ({ value, text, pill = false }) => (
  <Box
    component="b"
    title={value < 0 ? "Deducted this month" : "Earned this month"}
    sx={{
      fontWeight: 700, color: value < 0 ? "#c4324a" : S.ok, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flexShrink: 0,
      ...(pill ? { fontSize: ".68rem", bgcolor: "#2e7d3214", borderRadius: 99, px: "7px", py: "1px" } : { ml: 0.5 }),
    }}
  >
    {text}
  </Box>
);

const CreditTile = ({ code, name, color, value, unitWord, deducted, earned, note, dimmed, badge, index }) => (
  <Box
    sx={{
      position: "relative",
      p: "10px 12px 11px",
      borderRadius: "13px",
      border: `1px solid ${S.divider}`,
      background: `linear-gradient(160deg, ${color}24, #fff 65%)`,
      overflow: "hidden",
      opacity: dimmed ? 0.55 : 1,
      transition: "transform .25s, box-shadow .25s",
      animation: `${rise} .6s both`,
      animationDelay: `${index * 0.08}s`,
      "&:hover": { transform: "translateY(-4px)", boxShadow: `0 14px 26px -14px ${color}` },
      "&::before": { content: '""', position: "absolute", left: 0, right: 0, top: 0, height: 4, bgcolor: color },
      "@media (prefers-reduced-motion: reduce)": { animation: "none", transition: "none" },
    }}
  >
    <Box
      component="span"
      aria-hidden="true"
      sx={{ position: "absolute", right: 10, top: 11, width: 28, height: 28, borderRadius: "9px", bgcolor: color, color: "#fff", display: "grid", placeItems: "center", fontSize: code.length > 3 ? ".52rem" : ".62rem", fontWeight: 700, fontFamily: S.font, boxShadow: `0 6px 14px -6px ${color}` }}
    >
      {code}
    </Box>
    <Typography sx={{ fontSize: ".7rem", fontWeight: 500, color: S.muted, fontFamily: S.font, maxWidth: "72%", lineHeight: 1.35 }}>
      {name} {badge}
    </Typography>
    <Typography sx={{ mt: "2px", fontSize: "1.45rem", fontWeight: 800, lineHeight: 1.2, color, fontFamily: S.font, fontVariantNumeric: "tabular-nums" }}>
      {value}
      <Box component="small" sx={{ fontSize: ".7rem", fontWeight: 500, color: S.muted, ml: 0.6 }}>{unitWord}</Box>
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.75, mt: "1px" }}>
      <Typography sx={{ fontSize: ".66rem", color: S.muted, fontFamily: S.font }}>{note}{deducted}</Typography>
      {earned}
    </Box>
  </Box>
);

/**
 * Read-only leave credits from Leave Assignment (current totals, same computation as that page),
 * with this month's deducted/earned movement as chips. Always visible above the stepper.
 */
export const LeaveCreditsPanel = ({
  employee,
  year,
  month,
  unit,
  hoursPerDay = 8,
  category,
  periods = [],
  currentTotals = {},
  leaveTypes = {},
  sc,
  cto,
  loading,
}) => {
  const navigate = useNavigate();
  if (!employee) return null;

  const conv = (h) => (unit === "days" ? h / hoursPerDay : h);
  const f3 = (h) => conv(h).toFixed(3);
  const unitWord = unit === "days" ? "days" : "hours";
  const hasAssignment = Object.keys(currentTotals).length > 0;

  const leaveCodes = [
    ...BASE_CODES,
    ...Object.keys(currentTotals).filter((c) => !BASE_CODES.includes(c)).sort(),
  ];

  const tiles = [
    ...leaveCodes.map((code) => {
      const assigned = Object.prototype.hasOwnProperty.call(currentTotals, code);
      const { current } = monthContext(periods, code, year, month);
      return { code, hours: currentTotals[code] || 0, used: current?.used || 0, earned: current?.earned || 0, assigned };
    }),
    { code: "CTO", hours: cto?.remainingHours || 0, used: 0, earned: 0, assigned: true },
    { code: "SC", hours: sc?.remainingHours || 0, used: 0, earned: 0, assigned: true },
  ];

  return (
    <Box component="section" aria-labelledby="leave-credits-h" sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${S.divider}` }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25, flexWrap: "wrap", mb: 1 }}>
        <Typography id="leave-credits-h" component="h2" sx={{ m: 0, fontSize: "1.05rem", fontWeight: 700, fontFamily: S.font, color: S.text }}>
          Credits Balances
        </Typography>
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "6px", px: "9px", py: "2px", borderRadius: 99, bgcolor: S.accentFaint, color: S.accent, fontWeight: 700, fontSize: ".64rem", fontFamily: S.font }}>
          Read-only · from Leave Assignment
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={20} sx={{ color: S.accent }} />
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1.25 }}>
          {tiles.map((t, i) => {
            const locked = isPoolLocked(category, t.code, "earns");
            const earnsRule = ruleFor(category, t.code, "earns");
            const color = POOL_META[t.code]?.color || S.accent;
            const name = leaveTypes[t.code] || POOL_META[t.code]?.label || t.code;
            const note = locked && t.hours <= 1e-6
              ? "not used for this category"
              : !t.assigned
                ? "not assigned yet"
                : "current balance";
            return (
              <CreditTile
                key={t.code}
                code={t.code}
                name={name}
                color={color}
                value={f3(t.hours)}
                unitWord={unitWord}
                index={i}
                note={note}
                deducted={t.used > 1e-6 ? <Delta value={-1} text={`−${f3(t.used)}`} /> : null}
                earned={t.earned > 1e-6 ? <Delta value={1} pill text={`+${f3(t.earned)}`} /> : null}
                dimmed={(locked && t.hours <= 1e-6) || !t.assigned}
                badge={
                  earnsRule?.value === RULE.CONFIRM ? (
                    <Tooltip title={earnsRule.note || "Pending HR confirmation for this category."} arrow>
                      <Box component="span" sx={{ px: "7px", py: "1px", borderRadius: 99, fontSize: ".55rem", fontWeight: 700, color: "#9a6a08", bgcolor: "#fdebc8", cursor: "help", fontFamily: S.font, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        Confirm
                      </Box>
                    </Tooltip>
                  ) : null
                }
              />
            );
          })}
        </Box>
      )}

      {!loading && !hasAssignment && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5, p: 1.75, border: `1px dashed ${S.accentBorder}`, borderRadius: "12px", bgcolor: S.accentFaint, flexWrap: "wrap" }}>
          <EmptyIcon sx={{ fontSize: 22, color: S.accent, flexShrink: 0 }} />
          <Typography sx={{ flex: 1, minWidth: 200, fontSize: ".8rem", color: S.muted, fontFamily: S.font }}>
            This employee has no leave credits in Leave Assignment yet.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon sx={{ fontSize: "14px !important" }} />}
            onClick={() => navigate("/leave-assignment")}
            sx={{ textTransform: "none", fontFamily: S.font, fontWeight: 700, fontSize: ".74rem", color: S.accent, borderColor: S.accentBorder, borderRadius: "8px", "&:hover": { borderColor: S.accent, bgcolor: S.accentFaint } }}
          >
            Open Leave Assignment
          </Button>
        </Box>
      )}

      <Typography sx={{ mt: 1, mb: 0, fontSize: ".64rem", color: S.faint, fontFamily: S.font }}>
        To assign or correct credits, use Leave Assignment. These balances change here only when deductions or earnings are posted.
      </Typography>
    </Box>
  );
};

export default LeaveCreditsPanel;
