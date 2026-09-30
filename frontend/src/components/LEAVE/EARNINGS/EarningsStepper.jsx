import React from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { keyframes } from "@mui/system";
import {
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  LockOutlined as LockIcon,
} from "@mui/icons-material";

/** Palette from the Earnings stepper v4 design. */
export const S = {
  accent: "#6d2323",
  accentFaint: "rgba(109,35,35,.06)",
  accentBorder: "rgba(109,35,35,.16)",
  surface: "#fff",
  surface2: "#faf7f7",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  divider: "rgba(0,0,0,.08)",
  dash: "rgba(0,0,0,.22)",
  ok: "#166534",
  okLine: "#2e7d32",
  okBg: "rgba(21,128,61,.10)",
  okWash: "rgba(21,128,61,.07)",
  warn: "#8B5E00",
  warnBg: "rgba(139,94,0,.12)",
  chipN: "rgba(0,0,0,.06)",
  font: "'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const CHIP_LABEL = { done: "Done", current: "Do this next", todo: "To do", locked: "Locked" };

const ring = keyframes`
  0% { transform: scale(.85); opacity: .5; }
  100% { transform: scale(1.25); opacity: 0; }
`;

/** Segmented progress: one named segment per step, plus "N of M steps done · Next: …". */
export const StepProgress = ({ steps, onSelect, allDoneText }) => {
  const done = steps.filter((s) => s.status === "done").length;
  const current = steps.find((s) => s.status === "current");
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: "6px", mb: 1 }}>
        {steps.map((s) => (
          <Box
            key={s.key}
            component="button"
            type="button"
            aria-label={`${s.short}: ${CHIP_LABEL[s.status]}`}
            onClick={() => s.status !== "locked" && onSelect(s.key)}
            sx={{
              background: "none",
              border: 0,
              p: 0,
              textAlign: "left",
              cursor: s.status === "locked" ? "not-allowed" : "pointer",
              fontFamily: S.font,
              "&:focus-visible": { outline: `2px solid ${S.accent}`, outlineOffset: 2 },
            }}
          >
            <Box
              sx={{
                height: 5,
                borderRadius: 99,
                transition: "background-color .3s",
                background:
                  s.status === "done"
                    ? S.okLine
                    : s.status === "current"
                      ? `linear-gradient(90deg, ${S.accent} 0 50%, ${S.chipN} 50% 100%)`
                      : S.chipN,
              }}
            />
            <Typography
              component="span"
              sx={{
                display: "block",
                mt: "4px",
                fontSize: ".62rem",
                fontWeight: 600,
                fontFamily: S.font,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: s.status === "done" ? S.ok : s.status === "current" ? S.accent : S.muted,
              }}
            >
              {s.short}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
        <Typography sx={{ fontSize: ".85rem", fontWeight: 800, fontFamily: S.font, color: S.text }}>
          {done}
          <Box component="span" sx={{ color: S.faint, fontWeight: 600 }}> of {steps.length} steps done</Box>
        </Typography>
        <Typography sx={{ fontSize: ".7rem", color: S.muted, fontFamily: S.font }}>
          {current ? (
            <>
              Next: <Box component="b" sx={{ fontWeight: 700, color: S.accent }}>{current.title}</Box>
            </>
          ) : (
            <Box component="b" sx={{ fontWeight: 700, color: S.ok }}>{allDoneText}</Box>
          )}
        </Typography>
      </Box>
    </Box>
  );
};

const PILL_TONES = {
  ok: "#2e7d32",
  warn: "#8B5E00",
  late: "#d9822b",
  abs: "#c4324a",
  ot: "#7c3aed",
  neutral: "#6b6b6b",
};

/**
 * Result chip shown on a finished step's header.
 * tone: ok | warn | late | abs | ot | neutral; icon: short glyph in the leading circle.
 */
export const StepPill = ({ tone = "neutral", icon, children }) => {
  const c = PILL_TONES[tone] || PILL_TONES.neutral;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        pl: icon ? "3px" : "9px",
        pr: "9px",
        py: "2px",
        borderRadius: 99,
        fontSize: ".66rem",
        fontWeight: 600,
        fontFamily: S.font,
        color: c,
        bgcolor: `${c}1f`,
        border: `1px solid ${c}59`,
        transition: "transform .2s, box-shadow .2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 12px -8px ${c}` },
      }}
    >
      {icon && (
        <Box component="i" aria-hidden="true" sx={{ fontStyle: "normal", width: 16, height: 16, borderRadius: "50%", bgcolor: c, color: "#fff", display: "grid", placeItems: "center", fontSize: "9px", lineHeight: 1 }}>
          {icon}
        </Box>
      )}
      {children}
    </Box>
  );
};

/**
 * One step row: status node + connector + card. status: done | current | todo | locked.
 * Children stay mounted while collapsed so a step can keep reporting its status.
 */
export const StepRow = ({
  index,
  stepKey,
  title,
  subtitle,
  status,
  lockedReason,
  pills = null,
  open,
  onToggle,
  isLast = false,
  children,
}) => {
  const locked = status === "locked";
  const done = status === "done";
  const current = status === "current";
  const isOpen = open && !locked;

  const node = {
    done: { background: "linear-gradient(135deg,#43a047,#1b5e20)", color: "#fff", boxShadow: "0 3px 10px rgba(30,110,50,.35)" },
    current: { background: "linear-gradient(135deg,#7e2c2c,#5a1d1d)", color: "#fff", boxShadow: "0 3px 12px rgba(109,35,35,.4)" },
    todo: { bgcolor: S.surface, color: S.muted, border: `2px solid ${S.dash}` },
    locked: { bgcolor: S.surface2, color: S.faint, border: `2px dashed ${S.dash}` },
  }[status];

  const chip = {
    done: { bgcolor: S.okBg, color: S.ok },
    current: { bgcolor: S.warnBg, color: S.warn },
    todo: { bgcolor: S.chipN, color: S.muted },
    locked: { bgcolor: S.chipN, color: S.muted },
  }[status];

  const second = locked ? lockedReason : done ? "" : subtitle;

  return (
    <Box sx={{ position: "relative", pl: { xs: "40px", sm: "44px" }, pb: isLast ? 0 : "10px" }}>
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          left: 0,
          top: 5,
          width: { xs: 26, sm: 30 },
          height: { xs: 26, sm: 30 },
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: ".78rem",
          fontFamily: S.font,
          zIndex: 1,
          ...node,
          ...(current && {
            "&::after": {
              content: '""',
              position: "absolute",
              inset: "-4px",
              borderRadius: "50%",
              border: `2px solid ${S.accent}`,
              opacity: 0.35,
              animation: `${ring} 2.4s ease-out infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            },
          }),
        }}
      >
        {done ? <CheckIcon sx={{ fontSize: 17 }} /> : locked ? <LockIcon sx={{ fontSize: 13 }} /> : index}
      </Box>
      {!isLast && (
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            left: { xs: "12px", sm: "14px" },
            top: { xs: 35, sm: 39 },
            bottom: "-2px",
            width: 2,
            borderRadius: 3,
            ...(done
              ? { bgcolor: S.okLine }
              : { backgroundImage: `repeating-linear-gradient(to bottom, ${S.dash} 0 5px, transparent 5px 10px)` }),
          }}
        />
      )}

      <Box
        sx={{
          border: `1px ${locked ? "dashed" : "solid"} ${done ? "rgba(46,125,50,.35)" : current ? S.accentBorder : S.divider}`,
          borderRadius: "10px",
          bgcolor: locked ? S.surface2 : S.surface,
          overflow: "hidden",
          transition: "box-shadow .2s, border-color .2s",
          boxShadow: current ? "0 4px 14px rgba(109,35,35,.12)" : "none",
        }}
      >
        <Box
          component="button"
          type="button"
          id={`step-h-${stepKey}`}
          aria-expanded={isOpen}
          aria-controls={`step-p-${stepKey}`}
          aria-disabled={locked || undefined}
          onClick={() => !locked && onToggle(stepKey)}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: "12px",
            py: "8px",
            border: 0,
            textAlign: "left",
            color: S.text,
            fontFamily: S.font,
            cursor: locked ? "not-allowed" : "pointer",
            background: done ? S.okWash : current ? `linear-gradient(90deg, ${S.accentFaint}, transparent)` : "none",
            "&:hover": locked ? {} : { filter: "brightness(.98)" },
            "&:focus-visible": { outline: `2px solid ${S.accent}`, outlineOffset: 2 },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ display: "block", fontSize: ".82rem", fontWeight: 700, lineHeight: 1.25, fontFamily: S.font, color: locked ? S.muted : S.text }}>
              {title}
            </Typography>
            {second && (
              <Typography sx={{ display: "block", fontSize: ".68rem", color: S.muted, mt: "1px", fontFamily: S.font }}>
                {second}
              </Typography>
            )}
            {done && pills && <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap", mt: "4px" }}>{pills}</Box>}
          </Box>
          <Box component="span" sx={{ px: "8px", py: "2px", borderRadius: 99, fontSize: ".6rem", fontWeight: 700, whiteSpace: "nowrap", fontFamily: S.font, ...chip }}>
            {CHIP_LABEL[status]}
          </Box>
          {locked ? (
            <LockIcon sx={{ fontSize: 14, color: S.faint, flexShrink: 0 }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 18, color: S.faint, flexShrink: 0, transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "none" }} />
          )}
        </Box>
        {!locked && (
          <Collapse in={isOpen}>
            <Box id={`step-p-${stepKey}`} role="region" aria-labelledby={`step-h-${stepKey}`} sx={{ px: "12px", pt: 1.25, pb: "12px", borderTop: `1px solid ${S.divider}` }}>
              {children}
            </Box>
          </Collapse>
        )}
      </Box>
    </Box>
  );
};

export default StepRow;
