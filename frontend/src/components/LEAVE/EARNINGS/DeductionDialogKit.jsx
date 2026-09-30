import React, { useState } from "react";
import { Dialog, Box, Typography, IconButton, Checkbox, CircularProgress } from "@mui/material";
import { Close } from "@mui/icons-material";

/**
 * Shared look for attendance deduction confirmations (half-day, absence, tardiness), from the
 * "Half-day deduction" design: gradient header, employee strip, "What happened",
 * "What will be deducted", "Balance after" with a meter, warning + confirmation checkbox.
 * Presentation only — callers keep their own state and submit logic.
 */
export const D = {
  brand: "#7a1f2b",
  brand2: "#a52f40",
  ink: "#23191b",
  mute: "#857779",
  line: "#eadfe0",
  soft: "#faf5f5",
  ok: "#2e8b4f",
  bad: "#c4324a",
  badBg: "#fdeaed",
  vl: "#2563eb",
  font: "'Poppins', system-ui, sans-serif",
};

const f3 = (n) => (Number.isFinite(n) ? n.toFixed(3) : "—");

/** "11.367" hours → "11:22". */
export const hoursToClock = (h) => {
  const mins = Math.round(Math.max(0, Number(h) || 0) * 60);
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
};

/** "07:00:00" | "7:00 AM" → minutes after midnight (null if unparseable). */
const toMinutes = (v) => {
  if (!v) return null;
  const s = String(v).trim().toUpperCase();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3] === "PM" && h < 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  return h * 60 + min;
};
const minutesLabel = (mins) => {
  if (mins == null) return "—";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
};

export const DeductionDialog = ({ open, onClose, busy, title, subtitle, wide = false, children, footer }) => (
  <Dialog
    open={open}
    onClose={() => !busy && onClose()}
    maxWidth={false}
    PaperProps={{
      sx: {
        width: "100%",
        maxWidth: wide ? 920 : 480,
        borderRadius: "22px",
        overflow: "hidden",
        boxShadow: "0 30px 70px -25px rgba(90,15,30,.45)",
        fontFamily: D.font,
      },
    }}
  >
    <Box sx={{ background: `linear-gradient(135deg,#5e1420,${D.brand2})`, color: "#fff", px: "22px", py: "16px", display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: D.font, lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: "0.78rem", opacity: 0.8, fontFamily: D.font }}>{subtitle}</Typography>}
      </Box>
      <IconButton size="small" onClick={onClose} disabled={busy} aria-label="Close" sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.14)", "&:hover": { bgcolor: "rgba(255,255,255,0.24)" } }}>
        <Close sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
    <Box sx={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>{children}</Box>
    {footer}
  </Dialog>
);

export const DSection = ({ title, children, last = false, sx }) => (
  <Box sx={{ px: "22px", py: "14px", borderBottom: last ? "none" : `1px solid ${D.line}`, ...sx }}>
    {title && <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: D.mute, fontFamily: D.font, mb: 1.1 }}>{title}</Typography>}
    {children}
  </Box>
);

export const EmployeeStrip = ({ name, meta, balanceLabel, balanceText, balanceColor }) => {
  const initials = String(name || "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${D.brand},${D.brand2})`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.85rem", flex: "none", fontFamily: D.font }}>
        {initials || "—"}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, lineHeight: 1.3, fontFamily: D.font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</Typography>
        <Typography sx={{ fontSize: "0.74rem", color: D.mute, fontFamily: D.font }}>{meta}</Typography>
      </Box>
      {balanceLabel && (
        <Box sx={{ textAlign: "right", flex: "none" }}>
          <Typography sx={{ fontSize: "0.72rem", color: D.mute, fontFamily: D.font }}>{balanceLabel}</Typography>
          <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, color: balanceColor || D.vl, fontFamily: D.font, fontVariantNumeric: "tabular-nums" }}>{balanceText}</Typography>
        </Box>
      )}
    </Box>
  );
};

export const Tag = ({ children, tone = "warn" }) => (
  <Box component="span" sx={{ fontSize: "0.68rem", fontWeight: 600, px: "10px", py: "2px", borderRadius: 99, fontFamily: D.font, ...(tone === "warn" ? { bgcolor: "#fdebc8", color: "#8a5d06" } : { bgcolor: D.badBg, color: D.bad }) }}>
    {children}
  </Box>
);

/** Official day bar: morning / break / afternoon, from the official schedule times. */
export const DayTimeline = ({ timeIn, breakIn, breakOut, timeOut }) => {
  const a = toMinutes(timeIn);
  const b1 = toMinutes(breakIn);
  const b2 = toMinutes(breakOut);
  const z = toMinutes(timeOut);
  if (a == null || z == null) return null;
  const hasBreak = b1 != null && b2 != null && b2 > b1;
  const am = Math.max(0, (hasBreak ? b1 : z) - a);
  const bk = hasBreak ? b2 - b1 : 0;
  const pm = hasBreak ? Math.max(0, z - b2) : 0;
  const hrs = (m) => `${Math.round((m / 60) * 10) / 10} hrs`;
  const seg = { display: "grid", placeItems: "center", fontSize: "0.72rem", fontWeight: 600, fontFamily: D.font };
  return (
    <>
      <Box role="img" aria-label={`Official day ${minutesLabel(a)} to ${minutesLabel(z)}`} sx={{ display: "flex", height: 38, gap: "3px", mt: 1.5, mb: 0.75 }}>
        <Box sx={{ ...seg, flex: am || 1, bgcolor: `${D.brand}24`, color: D.brand, borderRadius: hasBreak ? "12px 8px 8px 12px" : "12px" }}>Morning · {hrs(am)}</Box>
        {hasBreak && <Box sx={{ ...seg, flex: bk, minWidth: 44, color: D.mute, fontSize: "0.66rem", background: `repeating-linear-gradient(135deg,${D.line} 0 4px,transparent 4px 8px)`, borderRadius: "8px" }}>Break</Box>}
        {hasBreak && <Box sx={{ ...seg, flex: pm || 1, bgcolor: `${D.brand}24`, color: D.brand, borderRadius: "8px 12px 12px 8px" }}>Afternoon · {hrs(pm)}</Box>}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: D.mute, mb: 1.5, fontFamily: D.font }}>
        <span><b style={{ color: D.ink, fontWeight: 600 }}>{minutesLabel(a)}</b> in</span>
        {hasBreak && <span>break <b style={{ color: D.ink, fontWeight: 600 }}>{minutesLabel(b1)} to {minutesLabel(b2)}</b></span>}
        <span><b style={{ color: D.ink, fontWeight: 600 }}>{minutesLabel(z)}</b> out</span>
      </Box>
    </>
  );
};

/** Three small stat tiles, e.g. Scheduled / Worked / Short. `tone`: "ok" | "bad" | undefined. */
export const StatRow = ({ items }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1 }}>
    {items.map((it) => (
      <Box key={it.label} sx={{ bgcolor: it.tone === "bad" ? D.badBg : D.soft, borderRadius: "12px", px: 1.5, py: 1.1 }}>
        <Typography sx={{ fontSize: "0.7rem", color: it.tone === "bad" ? D.bad : D.mute, fontFamily: D.font }}>{it.label}</Typography>
        <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: D.font, fontVariantNumeric: "tabular-nums", color: it.tone === "bad" ? D.bad : it.tone === "ok" ? D.ok : D.ink }}>{it.value}</Typography>
      </Box>
    ))}
  </Box>
);

/**
 * "[6] hrs = 0.750 day   Reset to 6:00". Editable when onHoursChange is given, otherwise read-only.
 */
export const AmountLine = ({ hours, days, onHoursChange, onReset, resetLabel, disabled, max }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
    {onHoursChange ? (
      <input
        type="number"
        min={0}
        max={max}
        step={0.25}
        value={hours}
        disabled={disabled}
        aria-label="Hours to deduct"
        onChange={(e) => onHoursChange(e.target.value)}
        style={{ width: 92, font: `700 22px ${D.font}`, padding: "6px 10px", borderRadius: 10, border: `1.5px solid ${D.line}`, background: "#fff", color: D.ink, textAlign: "center", outline: "none" }}
      />
    ) : (
      <Typography sx={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: D.font, fontVariantNumeric: "tabular-nums" }}>{hours}</Typography>
    )}
    <Typography component="span" sx={{ color: D.mute, fontSize: "0.85rem", fontFamily: D.font }}>hrs</Typography>
    <Typography component="span" sx={{ color: D.mute, fontSize: "1.35rem", fontFamily: D.font }}>=</Typography>
    <Typography component="span" sx={{ fontSize: "1.8rem", fontWeight: 800, color: D.bad, lineHeight: 1, fontFamily: D.font, fontVariantNumeric: "tabular-nums" }}>
      {f3(days)}
      <Box component="small" sx={{ fontSize: "0.85rem", fontWeight: 500, color: D.mute, ml: 0.5 }}>{Math.abs(days - 1) < 1e-9 ? "day" : "days"}</Box>
    </Typography>
    {onReset && (
      <Box component="button" type="button" onClick={onReset} disabled={disabled} sx={linkSx}>
        {resetLabel || "Reset"}
      </Box>
    )}
  </Box>
);

const linkSx = {
  all: "unset",
  ml: "auto",
  cursor: "pointer",
  whiteSpace: "nowrap",
  color: D.brand,
  fontSize: "0.78rem",
  fontWeight: 600,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  fontFamily: D.font,
  "&:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: 2 },
};

/** Before → After with a kept/removed meter. `before`/`after` in days; null = no credit pool. */
export const BalanceAfter = ({ before, after, poolLabel, salaryText }) => {
  if (before == null) {
    return <Typography sx={{ fontSize: "0.8rem", color: D.mute, fontFamily: D.font }}>{salaryText || "No leave balance is used."}</Typography>;
  }
  const d = Math.max(0, before - after);
  const keptPct = before > 0 ? Math.max(0, Math.min(100, (Math.max(0, after) / before) * 100)) : 0;
  const cutPct = before > 0 ? Math.max(0, Math.min(100 - keptPct, (d / before) * 100)) : 0;
  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 1, textAlign: "center" }}>
        <Box>
          <Typography sx={{ fontSize: "0.74rem", color: D.mute, fontFamily: D.font }}>Before</Typography>
          <Typography sx={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: D.font, fontVariantNumeric: "tabular-nums" }}>{f3(before)} d</Typography>
        </Box>
        <Typography sx={{ fontSize: "1.2rem", color: D.mute }}>→</Typography>
        <Box>
          <Typography sx={{ fontSize: "0.74rem", color: D.mute, fontFamily: D.font }}>After</Typography>
          <Typography sx={{ fontSize: "1.4rem", fontWeight: 800, color: after < 0 ? D.bad : D.ok, fontFamily: D.font, fontVariantNumeric: "tabular-nums" }}>{f3(after)} d</Typography>
        </Box>
      </Box>
      <Box aria-hidden="true" sx={{ position: "relative", height: 12, borderRadius: 6, bgcolor: D.line, mt: 1.5, mb: 0.75, overflow: "hidden" }}>
        <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${keptPct}%`, bgcolor: D.ok, transition: "width .5s" }} />
        <Box sx={{ position: "absolute", top: 0, bottom: 0, left: `${keptPct}%`, width: `${cutPct}%`, bgcolor: D.bad, transition: "all .5s" }} />
      </Box>
      <Typography sx={{ fontSize: "0.78rem", color: D.bad, fontWeight: 600, textAlign: "center", fontFamily: D.font }}>
        − {f3(d)} d from {poolLabel}
      </Typography>
      {after < 0 && (
        <Typography sx={{ fontSize: "0.72rem", color: D.bad, textAlign: "center", fontFamily: D.font, mt: 0.5 }}>Shortfall is charged to salary.</Typography>
      )}
    </>
  );
};

/** "Add a note (optional)" link that reveals a textarea. */
export const NoteToggle = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(Boolean(value));
  return (
    <>
      <Box component="button" type="button" onClick={() => setOpen((o) => !o)} sx={{ ...linkSx, ml: 0, mt: 1.25, display: "inline-block" }}>
        {open ? "Hide note" : "Add a note (optional)"}
      </Box>
      {open && (
        <textarea
          rows={3}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add a note for this deduction..."
          aria-label="Note"
          style={{ width: "100%", marginTop: 10, font: `400 13px ${D.font}`, padding: 10, borderRadius: 10, border: `1.5px solid ${D.line}`, resize: "vertical", boxSizing: "border-box" }}
        />
      )}
    </>
  );
};

export const ConfirmBlock = ({ warning, checked, onChange, disabled, label = "I checked the amount and balances above." }) => (
  <>
    {warning && (
      <Box sx={{ bgcolor: D.badBg, borderRadius: "12px", px: 1.75, py: 1.5, fontSize: "0.78rem", fontFamily: D.font, color: D.ink, lineHeight: 1.5 }}>{warning}</Box>
    )}
    <Box component="label" sx={{ display: "flex", gap: 1, alignItems: "flex-start", mt: 1.5, fontSize: "0.82rem", cursor: disabled ? "default" : "pointer", fontFamily: D.font }}>
      <Checkbox size="small" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} sx={{ p: 0, mt: "1px", color: D.mute, "&.Mui-checked": { color: D.brand } }} />
      <span>{label}</span>
    </Box>
  </>
);

export const DialogFooter = ({ onCancel, onConfirm, busy, disabled, confirmLabel = "Confirm deduction" }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.25, px: "22px", py: 2, bgcolor: D.soft }}>
    <Box component="button" type="button" onClick={onCancel} disabled={busy} sx={{ ...btnSx, bgcolor: "#fff", color: D.ink, border: `1.5px solid ${D.line}` }}>
      Cancel
    </Box>
    <Box
      component="button"
      type="button"
      onClick={onConfirm}
      disabled={disabled || busy}
      sx={{
        ...btnSx,
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        color: "#fff",
        border: "1.5px solid transparent",
        background: `linear-gradient(135deg,${D.brand},${D.brand2})`,
        transition: "transform .2s, opacity .2s",
        "&:not(:disabled):hover": { transform: "translateY(-2px)" },
        "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
      }}
    >
      {busy && <CircularProgress size={13} sx={{ color: "#fff" }} />}
      {busy ? "Processing…" : confirmLabel}
    </Box>
  </Box>
);

const btnSx = {
  all: "unset",
  cursor: "pointer",
  font: `600 13.5px ${D.font}`,
  borderRadius: "11px",
  px: "20px",
  py: "10px",
  "&:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: 2 },
};
