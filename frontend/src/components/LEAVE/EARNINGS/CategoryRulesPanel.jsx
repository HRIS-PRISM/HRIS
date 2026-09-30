import React, { useState } from "react";
import { Box, Typography, Tooltip, Collapse } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
  CSC_CATEGORIES,
  POOLS,
  POOL_META,
  RULE,
  SALARY_RULES,
} from "../../../utils/cscLeaveRules";

const T = {
  accent: "#6d2323",
  accentFaint: "rgba(109,35,35,0.05)",
  divider: "rgba(0,0,0,0.08)",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#888888",
  poppins: "'Poppins', sans-serif",
};

const CHIP = {
  [RULE.YES]: { label: "Yes", color: "#1e6b2a", bg: "#e3f3e5" },
  [RULE.IF]: { label: "If", color: "#8a5a00", bg: "#fbf0d9" },
  [RULE.NO]: { label: "No", color: "#a32d2d", bg: "#fbe4e4" },
  [RULE.CONFIRM]: { label: "Confirm", color: "#5b4a00", bg: "#f3ecc8" },
};

const COLUMNS = [
  { key: "earns", label: "Earns", bg: "#1f5c2c" },
  { key: "absence", label: "Absence", bg: "#8e1f1f" },
  { key: "half_day", label: "Half-day", bg: "#8e1f1f" },
  { key: "tardiness", label: "Tardiness", bg: "#8e1f1f" },
];

export const RuleChip = ({ value, note }) => {
  if (!value) {
    return <Typography sx={{ fontSize: "0.7rem", color: T.faint, fontFamily: T.poppins }}>—</Typography>;
  }
  const c = CHIP[value] || CHIP[RULE.CONFIRM];
  const chip = (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: "7px",
        py: "1px",
        borderRadius: "10px",
        fontSize: "0.58rem",
        fontWeight: 700,
        fontFamily: T.poppins,
        color: c.color,
        bgcolor: c.bg,
        cursor: note ? "help" : "default",
      }}
    >
      {c.label}
    </Box>
  );
  return note ? <Tooltip title={note} arrow>{chip}</Tooltip> : chip;
};

const headCellSx = (bg) => ({
  px: "4px",
  py: "7px",
  bgcolor: bg,
  color: "#fff",
  fontSize: "0.6rem",
  fontWeight: 700,
  fontFamily: T.poppins,
  textAlign: "center",
  "&:first-of-type": { textAlign: "left", pl: "10px" },
});

const RulesTable = ({ category }) => (
  <Box
    component="table"
    sx={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: `1px solid ${T.divider}`, borderRadius: 1, overflow: "hidden" }}
  >
    <thead>
      <tr>
        <Box component="th" sx={headCellSx("#6d2323")}>Pool</Box>
        {COLUMNS.map((c) => (
          <Box component="th" key={c.key} sx={headCellSx(c.bg)}>{c.label}</Box>
        ))}
      </tr>
    </thead>
    <tbody>
      {POOLS.map((pool) => (
        <Box component="tr" key={pool} sx={{ borderTop: `1px solid ${T.divider}` }}>
          <Box component="td" sx={{ pl: "10px", py: "7px", fontSize: "0.72rem", fontWeight: 800, color: POOL_META[pool].color, fontFamily: T.poppins }}>
            {pool}
          </Box>
          {COLUMNS.map((c) => {
            const rc = category.rules?.[pool]?.[c.key];
            return (
              <Box component="td" key={c.key} sx={{ px: "3px", py: "7px", textAlign: "center" }}>
                <RuleChip value={rc?.value} note={rc?.note} />
              </Box>
            );
          })}
        </Box>
      ))}
      <Box component="tr" sx={{ borderTop: `1px solid ${T.divider}` }}>
        <Box component="td" sx={{ pl: "10px", py: "7px", fontSize: "0.72rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>
          Salary
        </Box>
        {COLUMNS.map((c) => (
          <Box component="td" key={c.key} sx={{ px: "3px", py: "7px", textAlign: "center" }}>
            <RuleChip
              value={c.key === "earns" ? null : SALARY_RULES[c.key]}
              note={c.key === "earns" ? "" : "Any gap not covered by credits is deducted from salary."}
            />
          </Box>
        ))}
      </Box>
    </tbody>
  </Box>
);

const Note = ({ kind, text }) => (
  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        mt: "1px",
        px: 0.9,
        py: "1px",
        borderRadius: "6px",
        fontSize: "0.6rem",
        fontWeight: 700,
        fontFamily: T.poppins,
        color: kind === "confirm" ? "#8a5a00" : "#1e6b2a",
        bgcolor: kind === "confirm" ? "#fbf0d9" : "#e3f3e5",
        minWidth: 50,
        textAlign: "center",
      }}
    >
      {kind === "confirm" ? "Confirm" : "Basis"}
    </Box>
    <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.45 }}>
      {text}
    </Typography>
  </Box>
);

const CompareAllCategories = () => {
  const cats = Object.values(CSC_CATEGORIES);
  return (
    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mt: 1 }}>
      <thead>
        <tr>
          <Box component="th" sx={headCellSx("#6d2323")}>Category (earns)</Box>
          {POOLS.map((p) => (
            <Box component="th" key={p} sx={headCellSx("#1f5c2c")}>{p}</Box>
          ))}
        </tr>
      </thead>
      <tbody>
        {cats.map((cat) => (
          <Box component="tr" key={cat.code} sx={{ borderTop: `1px solid ${T.divider}` }}>
            <Box component="td" sx={{ px: 1, py: 0.75, fontSize: "0.66rem", fontWeight: 600, color: T.text, fontFamily: T.poppins }}>
              {cat.title}
              {!cat.confirmed && (
                <Typography component="span" sx={{ display: "block", fontSize: "0.58rem", color: "#8a5a00", fontFamily: T.poppins }}>
                  pending HR confirmation
                </Typography>
              )}
            </Box>
            {POOLS.map((p) => (
              <Box component="td" key={p} sx={{ px: 1, py: 0.75 }}>
                <RuleChip value={cat.rules[p].earns.value} note={cat.rules[p].earns.note} />
              </Box>
            ))}
          </Box>
        ))}
      </tbody>
    </Box>
  );
};

/**
 * @param {{ category: object|null, empCatLabel?: string }} props
 */
export const CategoryRulesPanel = ({ category, empCatLabel }) => {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <Box sx={{ border: `1px solid ${T.divider}`, borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
      <Box sx={{ px: 2, py: 1.1, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}>
        <Typography sx={{ fontSize: "0.64rem", fontWeight: 800, color: T.accent, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: T.poppins }}>
          Rules for this category
        </Typography>
      </Box>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {!category ? (
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "#fbf0d9", border: "1px solid rgba(138,90,0,0.2)" }}>
            <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: "#8a5a00", fontFamily: T.poppins }}>
              {empCatLabel ? `"${empCatLabel}" is not mapped to a CSC category` : "No employment category"}
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, mt: 0.5, lineHeight: 1.45 }}>
              No pool is locked for this employee. Ask HR which CSC category this employment type follows
              (Non-Academic, Academic 40-hr, Academic 30-hr, or Job Order / COS).
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: T.text, fontFamily: T.poppins }}>
                {category.title}
              </Typography>
              {!category.confirmed && (
                <Tooltip title="These rules are pending HR confirmation. The page warns but does not lock pools for this category." arrow>
                  <Box component="span" sx={{ px: 0.9, py: "1px", borderRadius: "6px", fontSize: "0.6rem", fontWeight: 700, color: "#8a5a00", bgcolor: "#fbf0d9", fontFamily: T.poppins, cursor: "help" }}>
                    Confirm with HR
                  </Box>
                </Tooltip>
              )}
            </Box>

            <RulesTable category={category} />

            <Typography sx={{ fontSize: "0.66rem", color: T.muted, fontFamily: T.poppins, display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
              <RuleChip value={RULE.YES} /> allowed
              <RuleChip value={RULE.IF} /> allowed with a condition
              <RuleChip value={RULE.NO} /> not allowed
              {!category.confirmed && (
                <>
                  <RuleChip value={RULE.CONFIRM} /> pending HR
                </>
              )}
              . Hover a chip for the condition.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {category.basis.map((n, i) => (
                <Note key={i} kind={n.kind} text={n.text} />
              ))}
            </Box>
          </>
        )}

        <Box sx={{ border: `1px solid ${T.divider}`, borderRadius: 1.5, bgcolor: T.accentFaint }}>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => setCompareOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setCompareOpen((v) => !v);
            }}
            sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          >
            <Typography sx={{ fontSize: "0.64rem", fontWeight: 800, color: T.accent, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: T.poppins }}>
              Compare all categories
            </Typography>
            <ExpandMoreIcon sx={{ fontSize: 18, color: T.accent, transform: compareOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </Box>
          <Collapse in={compareOpen}>
            <Box sx={{ px: 1.5, pb: 1.5, bgcolor: "#fff" }}>
              <CompareAllCategories />
            </Box>
          </Collapse>
        </Box>
      </Box>
    </Box>
  );
};

export default CategoryRulesPanel;
