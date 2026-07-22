import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  Box, Typography, Card, CircularProgress, Tabs, Tab,
  ToggleButton, ToggleButtonGroup, Chip, Collapse, Paper,
  Button, Tooltip,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  EventNote as LeaveIcon,
  WorkHistory as SCIcon,
  AccessTime as CTOIcon,
  Calculate as CalculateIcon,
  SwapHoriz as ConvertIcon,
  OpenInNew as OpenInNewIcon,
  Close,
} from "@mui/icons-material";

const LeaveAssignment     = lazy(() => import("./LeaveAssignment"));
const ServiceCredit       = lazy(() => import("./ServiceCredits"));
const CompensatoryTimeOff = lazy(() => import("./CompensatoryTimeOff"));

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  headerGrad:   "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider:      "rgba(0,0,0,0.08)",
  surface:      "#ffffff",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  poppins:      "'Poppins', sans-serif",
};

const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: T.surface,
});

const shimmerKf = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
@keyframes amFadeIn {
  from { opacity:0; transform:translateY(5px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

// ─── Conversion defaults ──────────────────────────────────────────────────────
const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour", day_type: "8hr", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));
const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour", day_type: "6hr", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));
const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute", day_type: "minute", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));
const DEFAULT_LWP_TABLE = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1, e: Number(((i + 1) * 0.04167).toFixed(3)),
}));
const DEFAULT_ABS_TABLE = [
  { a: 0.5,  e: 1.229 }, { a: 1.0,  e: 1.208 }, { a: 1.5,  e: 1.188 },
  { a: 2.0,  e: 1.167 }, { a: 2.5,  e: 1.146 }, { a: 3.0,  e: 1.125 },
  { a: 3.5,  e: 1.104 }, { a: 4.0,  e: 1.083 }, { a: 4.5,  e: 1.063 },
  { a: 5.0,  e: 1.042 }, { a: 5.5,  e: 1.021 }, { a: 6.0,  e: 1.0   },
  { a: 6.5,  e: 0.979 }, { a: 7.0,  e: 0.958 }, { a: 7.5,  e: 0.938 },
  { a: 8.0,  e: 0.917 }, { a: 8.5,  e: 0.854 }, { a: 9.0,  e: 0.833 },
  { a: 9.5,  e: 0.875 }, { a: 10.0, e: 0.833 }, { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 }, { a: 11.5, e: 0.771 }, { a: 12.0, e: 0.75  },
  { a: 12.5, e: 0.729 }, { a: 13.0, e: 0.708 }, { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 }, { a: 14.5, e: 0.646 }, { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 }, { a: 16.0, e: 0.583 }, { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 }, { a: 17.5, e: 0.521 }, { a: 18.0, e: 0.5   },
  { a: 18.5, e: 0.479 }, { a: 19.0, e: 0.458 }, { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 }, { a: 20.5, e: 0.396 }, { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 }, { a: 22.0, e: 0.333 }, { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 }, { a: 23.5, e: 0.271 }, { a: 24.0, e: 0.25  },
  { a: 24.5, e: 0.229 }, { a: 25.0, e: 0.208 }, { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 }, { a: 26.5, e: 0.146 }, { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 }, { a: 28.0, e: 0.083 }, { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 }, { a: 29.5, e: 0.021 },
];

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

// ─── Result Pill ──────────────────────────────────────────────────────────────
const ResultPill = ({ label, value, primary = false }) => (
  <Box sx={{
    flex: 1, py: 1, px: 0.75, borderRadius: "8px", textAlign: "center",
    bgcolor: primary ? T.accent : T.accentFaint,
    border: `1px solid ${primary ? T.accent : T.accentBorder}`,
  }}>
    <Typography sx={{ fontSize: "0.56rem", fontWeight: 700, color: primary ? "rgba(255,255,255,0.6)" : alpha(T.accent, 0.5), textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.4, fontFamily: T.poppins }}>{label}</Typography>
    <Typography sx={{ fontWeight: 900, fontSize: primary ? "1.05rem" : "0.95rem", color: primary ? "#fff" : T.accent, lineHeight: 1, fontFamily: T.poppins }}>{value}</Typography>
  </Box>
);

// ─── Clearable Int Field ──────────────────────────────────────────────────────
const ClearableIntField = ({ value, onChange, placeholder, min = 0, max, label, widgetInputSx, inputLabelSx }) => {
  const [draft, setDraft] = useState(null);
  const [focused, setFocused] = useState(false);
  const displayVal = focused && draft !== null
    ? draft
    : (value === 0 ? "" : String(value));
  return (
    <Box>
      {label && <Typography sx={inputLabelSx}>{label}</Typography>}
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? String(min)}
        value={displayVal}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          setDraft(raw);
        }}
        onFocus={() => {
          setFocused(true);
          setDraft(value === 0 ? "" : String(value));
        }}
        onBlur={() => {
          setFocused(false);
          let num = parseInt(draft ?? "", 10);
          if (isNaN(num)) num = min;
          if (max !== undefined) num = Math.min(num, max);
          num = Math.max(num, min);
          onChange(num);
          setDraft(null);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={widgetInputSx?.__raw}
      />
    </Box>
  );
};

// ─── Clearable Decimal Field ──────────────────────────────────────────────────
const ClearableDecimalField = ({ value, onChange, placeholder, min = 0, max, step = 0.5, label, snapToStep = false, widgetInputSx, inputLabelSx }) => {
  const [draft, setDraft] = useState(null);
  const [focused, setFocused] = useState(false);
  const displayVal = focused && draft !== null
    ? draft
    : (value === 0 ? "" : String(value));
  return (
    <Box>
      {label && <Typography sx={inputLabelSx}>{label}</Typography>}
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder ?? "0"}
        value={displayVal}
        onChange={(e) => {
          let raw = e.target.value.replace(",", ".");
          raw = raw.replace(/[^\d.]/g, "");
          const dot = raw.indexOf(".");
          if (dot !== -1) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, "");
          setDraft(raw);
        }}
        onFocus={() => {
          setFocused(true);
          setDraft(value === 0 ? "" : String(value));
        }}
        onBlur={() => {
          setFocused(false);
          let num = parseFloat((draft ?? "").replace(",", "."));
          if (!Number.isFinite(num)) num = 0;
          if (snapToStep && step) num = Math.round(num / step) * step;
          if (max !== undefined) num = Math.min(num, max);
          num = Math.max(num, min);
          onChange(num);
          setDraft(null);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={widgetInputSx?.__raw}
      />
    </Box>
  );
};

// ─── Floating Conversion Widget ───────────────────────────────────────────────
const FloatingConversionWidget = () => {
  const [open, setOpen]           = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [hours8Table,  setHours8Table]  = useState(DEFAULT_HOURS_8);
  const [hours6Table,  setHours6Table]  = useState(DEFAULT_HOURS_6);
  const [minutesTable, setMinutesTable] = useState(DEFAULT_MINUTES);
  const [lwpTable,     setLwpTable]     = useState(DEFAULT_LWP_TABLE);
  const [absTable,     setAbsTable]     = useState(DEFAULT_ABS_TABLE);
  const [ratesLoaded,  setRatesLoaded]  = useState(false);

  const [whDayType, setWhDayType] = useState("8hr");
  const [whHours,   setWhHours]   = useState(0);
  const [whMinutes, setWhMinutes] = useState(0);
  const [lcDays,    setLcDays]    = useState(1);
  const [lcAbs,     setLcAbs]     = useState(0);

  useEffect(() => {
    if (!open || ratesLoaded) return;
    (async () => {
      try {
        const [whRes, lcRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/working-hours/rates`),
          axios.get(`${API_BASE_URL}/api/working-hours/leave-credits/rates`),
        ]);
        if (whRes.status === "fulfilled") {
          const d = whRes.value.data;
          const ensureHours = (rows, dayType, fallback) => {
            const byHour = new Map((rows || []).map((r) => [Number(r.rate_value), r]));
            const baseRate = Number(byHour.get(1)?.decimal_equivalent ?? fallback);
            return Array.from({ length: 8 }, (_, i) => {
              const h = i + 1;
              const found = byHour.get(h);
              return found
                ? { ...found, rate_type: "hour", day_type: dayType, rate_value: h, decimal_equivalent: sanitizeDecimal(found.decimal_equivalent) }
                : { rate_type: "hour", day_type: dayType, rate_value: h, decimal_equivalent: sanitizeDecimal(h * baseRate) };
            });
          };
          if (Array.isArray(d.hours8)  && d.hours8.length  > 0)   setHours8Table(ensureHours(d.hours8,  "8hr", 0.125));
          if (Array.isArray(d.hours6)  && d.hours6.length  > 0)   setHours6Table(ensureHours(d.hours6,  "6hr", 0.167));
          if (Array.isArray(d.minutes) && d.minutes.length === 60) setMinutesTable(d.minutes);
        }
        if (lcRes.status === "fulfilled") {
          const d = lcRes.value.data;
          if (Array.isArray(d.lwp) && d.lwp.length === 30) setLwpTable(d.lwp);
          if (Array.isArray(d.abs) && d.abs.length  >= 1)  setAbsTable(d.abs);
        }
      } catch { /* keep defaults */ }
      setRatesLoaded(true);
    })();
  }, [open, ratesLoaded]);

  const activeHoursTable = whDayType === "6hr" ? hours6Table : hours8Table;

  const whResult = useMemo(() => {
    const defaultHourlyRate = whDayType === "6hr" ? 0.167 : 0.125;
    const hourlyRate = Number(activeHoursTable.find((h) => h.rate_value === 1)?.decimal_equivalent ?? defaultHourlyRate);
    const hEntry = activeHoursTable.find((h) => h.rate_value === whHours);
    const mEntry = minutesTable.find((m) => m.rate_value === whMinutes);
    const hDec   = whHours   === 0 ? 0 : Number((hEntry?.decimal_equivalent ?? whHours * hourlyRate).toFixed(3));
    const mDec   = whMinutes === 0 ? 0 : (mEntry?.decimal_equivalent ?? 0);
    return { hDec, mDec, total: Number((hDec + mDec).toFixed(3)) };
  }, [whHours, whMinutes, whDayType, activeHoursTable, minutesTable]);

  const lcResult = useMemo(() => {
    const daysEntry = lwpTable.find((r) => r.d === lcDays);
    const earned    = daysEntry ? daysEntry.e : parseFloat((lcDays * 0.04167).toFixed(3));
    const absEntry  = lcAbs > 0 ? absTable.find((r) => Math.abs(r.a - lcAbs) < 0.001) : null;
    const absEarned = absEntry ? absEntry.e : earned;
    return { earned, absEarned };
  }, [lcDays, lcAbs, lwpTable, absTable]);

  const inputLabelSx = {
    fontSize: "0.62rem", fontWeight: 700, color: alpha(T.accent, 0.45),
    textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5,
    fontFamily: T.poppins, display: "block",
  };

  const inputStyle = {
    width: "100%", height: 34, borderRadius: 7, fontSize: "0.82rem",
    fontWeight: 700, color: T.text, padding: "6px 10px",
    border: `1px solid ${T.accentBorder}`, outline: "none",
    backgroundColor: "#fff", fontFamily: T.poppins,
    boxSizing: "border-box",
  };

  return (
    <>
      <Tooltip title="Quick Conversion Tool" placement="left">
        <Box
          onClick={() => setOpen((v) => !v)}
          sx={{
            width: 48, height: 48, borderRadius: "50%",
            bgcolor: open ? T.accentDark : T.accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${alpha(T.accent, 0.45)}`,
            transition: "all 0.2s ease",
            "&:hover": { bgcolor: T.accentDark, transform: "scale(1.08)", boxShadow: `0 6px 22px ${alpha(T.accent, 0.55)}` },
          }}
        >
          {open ? <Close sx={{ fontSize: 20 }} /> : <CalculateIcon sx={{ fontSize: 22 }} />}
        </Box>
      </Tooltip>

      {/* Panel */}
      <Collapse in={open} timeout={200}>
        <Paper elevation={0} sx={{
          position: "fixed", bottom: 125, right: 32, zIndex: 9998, width: 310,
          borderRadius: "12px", border: `1px solid ${T.accentBorder}`,
          boxShadow: `0 8px 32px ${alpha(T.accent, 0.18)}, 0 2px 8px rgba(0,0,0,0.08)`,
          overflow: "hidden", fontFamily: T.poppins,
        }}>
          {/* Header */}
          <Box sx={{ px: 2, py: 1.25, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ConvertIcon sx={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }} />
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", fontFamily: T.poppins }}>Quick Converter</Typography>
              {!ratesLoaded && <CircularProgress size={10} sx={{ color: "rgba(255,255,255,0.6)" }} />}
            </Box>
            <Button
              onClick={() => { window.location.href = "/working-hours"; }}
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
              sx={{
                fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.75)",
                textTransform: "none", fontFamily: T.poppins,
                px: 1, py: 0.25, borderRadius: "5px", minWidth: 0,
                border: "1px solid rgba(255,255,255,0.25)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)", color: "#fff" },
              }}
            >
              View Tables
            </Button>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
            <Tabs
              value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth"
              sx={{
                minHeight: 36,
                "& .MuiTab-root": { minHeight: 36, fontSize: "0.7rem", fontWeight: 700, textTransform: "none", fontFamily: T.poppins, color: T.muted, py: 0, "&.Mui-selected": { color: T.accent } },
                "& .MuiTabs-indicator": { bgcolor: T.accent, height: 2 },
              }}
            >
              <Tab label="Working Hours" />
              <Tab label="Leave Credits" />
            </Tabs>
          </Box>

          {/* Tab 0: Working Hours */}
          <Box sx={{ display: activeTab === 0 ? "flex" : "none", p: 1.75, flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={inputLabelSx}>Day type</Typography>
              <ToggleButtonGroup value={whDayType} exclusive onChange={(_, v) => v && setWhDayType(v)} size="small"
                sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.2, border: `1px solid ${T.accentBorder}`, fontSize: "0.68rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, minHeight: 26, "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent } } }}>
                <ToggleButton value="8hr">8-hr</ToggleButton>
                <ToggleButton value="6hr">6-hr</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Box>
                <Typography sx={inputLabelSx}>Hours</Typography>
                <ClearableIntField value={whHours} onChange={setWhHours} placeholder="0" min={0} widgetInputSx={{ __raw: inputStyle }} />
              </Box>
              <Box>
                <Typography sx={inputLabelSx}>Minutes (0–59)</Typography>
                <ClearableIntField value={whMinutes} onChange={setWhMinutes} placeholder="0" min={0} max={59} widgetInputSx={{ __raw: inputStyle }} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 0.75 }}>
              <ResultPill label="Hours" value={Number(whResult.hDec).toFixed(3)} />
              <ResultPill label="Total" value={whResult.total.toFixed(3)} primary />
              <ResultPill label="Mins." value={Number(whResult.mDec).toFixed(3)} />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, p: "6px 10px", borderRadius: "7px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
              <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontWeight: 600, fontFamily: T.poppins }}>Equivalent:</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
                {whHours}h {whMinutes}m = {whResult.total.toFixed(3)}
              </Typography>
              <Chip label={whDayType} size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: T.accent, color: "#fff", fontFamily: T.poppins }} />
            </Box>
          </Box>

          {/* Tab 1: Leave Credits */}
          <Box sx={{ display: activeTab === 1 ? "flex" : "none", p: 1.75, flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Box>
                <Typography sx={inputLabelSx}>LWP Days (1–30)</Typography>
                <ClearableIntField value={lcDays} onChange={(v) => setLcDays(Math.min(30, Math.max(1, v || 1)))} placeholder="1" min={1} max={30} widgetInputSx={{ __raw: inputStyle }} />
              </Box>
              <Box>
                <Typography sx={inputLabelSx}>Abs w/o Pay (0–29.5)</Typography>
                <ClearableDecimalField value={lcAbs} onChange={setLcAbs} placeholder="0" min={0} max={29.5} step={0.5} snapToStep widgetInputSx={{ __raw: inputStyle }} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 0.75 }}>
              <ResultPill label="LWP Earned"         value={lcResult.earned.toFixed(3)}    primary />
              <ResultPill label="Abs w/o Pay Earned" value={lcResult.absEarned.toFixed(3)} />
            </Box>

            <Box sx={{ p: "6px 10px", borderRadius: "7px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
              <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontWeight: 600, fontFamily: T.poppins, textAlign: "center" }}>
                Earned at <strong style={{ color: T.accent }}>1.250/mo</strong> · Absents w/o pay reduce credits
              </Typography>
            </Box>

            <Typography sx={{ fontSize: "0.62rem", color: T.faint, textAlign: "center", fontFamily: T.poppins }}>
              For the full absence deduction table, click <strong style={{ color: T.accent }}>View Tables</strong> above.
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
};

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
    backgroundSize: "800px 100%",
    animation: "shimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -5 },
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* ── Header card skeleton ── */}
      <Box
        sx={{
          mb: 0,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
          border: `1px solid rgba(109,35,35,0.12)`,
          animation: "blink 2s ease-in-out infinite",
        }}
      >
        {/* Gradient top bar */}
        <Box
          sx={{
            p: 3,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.06)" }} />
          <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.04)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.1)", flexShrink: 0 }} />
            <Box>
              <Bone w={220} h={16} sx={{ mb: 1 }} />
              <Bone w={340} h={10} />
            </Box>
          </Box>
          <Bone w={140} h={30} r={8} sx={{ position: "relative", zIndex: 1 }} />
        </Box>

        {/* Tab row */}
        <Box
          sx={{
            background: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
            px: 1,
            pt: 0.75,
            pb: 0,
            display: "flex",
            alignItems: "flex-end",
            gap: 0.5,
          }}
        >
          {[110, 120, 175].map((w, i) => (
            <Box
              key={i}
              sx={{
                px: 2.5,
                py: 1.1,
                borderRadius: "8px 8px 0 0",
                bgcolor: i === 0 ? "rgba(255,255,255,0.95)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Box sx={{
                width: 13, height: 13, borderRadius: "50%",
                bgcolor: i === 0 ? "rgba(109,35,35,0.2)" : "rgba(255,255,255,0.25)",
              }} />
              <Bone
                w={w}
                h={11}
                sx={{
                  background: i === 0
                    ? `linear-gradient(90deg,rgba(109,35,35,0.1) 25%,rgba(109,35,35,0.2) 50%,rgba(109,35,35,0.1) 75%)`
                    : `linear-gradient(90deg,rgba(255,255,255,0.15) 25%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0.15) 75%)`,
                  backgroundSize: "800px 100%",
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Body skeleton ── */}
      <Box
        sx={{
          borderRadius: "0 0 12px 12px",
          border: `1px solid rgba(109,35,35,0.12)`,
          borderTop: "none",
          overflow: "hidden",
          bgcolor: "#fff",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          height: "calc(100vh - 300px)",
          minHeight: 480,
          animation: "blink 2s ease-in-out 0.1s infinite",
        }}
      >
        {/* ── Col 1 — Leave Assignment ── */}
        <Box sx={{ borderRight: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
            <Bone w={150} h={10} />
          </Box>
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Search / filter bar */}
            <Bone w="100%" h={32} r={8} />
            {/* Leave type rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                sx={{
                  borderRadius: 1.5,
                  border: "1px solid rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  animation: `blink 1.6s ease-in-out ${i * 0.08}s infinite`,
                }}
              >
                <Box sx={{ px: 1.5, py: 0.6, bgcolor: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Bone w={80} h={10} />
                  <Bone w={50} h={16} r={20} />
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Bone w={140} h={12} sx={{ mb: 0.5 }} />
                    <Bone w={90} h={9} />
                  </Box>
                  <Bone w={60} h={26} r={5} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Col 2 — Service Credits ── */}
        <Box sx={{ borderRight: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
            <Bone w={130} h={10} />
          </Box>
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Summary card */}
            <Box sx={{ borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden" }}>
              <Box sx={{ display: "flex", height: 80 }}>
                <Box sx={{ width: 56, bgcolor: "rgba(109,35,35,0.04)", borderRight: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.1)" }} />
                </Box>
                <Box sx={{ flex: 1, p: 1.5, display: "flex", flexDirection: "column", gap: 0.75, justifyContent: "center" }}>
                  <Bone w="70%" h={18} />
                  <Bone w="50%" h={10} />
                </Box>
              </Box>
            </Box>
            {/* Balance cards */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              {[1, 2].map((i) => (
                <Box key={i} sx={{ borderRadius: 1.5, border: "1px solid rgba(0,0,0,0.08)", p: 1.25 }}>
                  <Bone w="60%" h={9} sx={{ mb: 0.75 }} />
                  <Bone w="80%" h={20} sx={{ mb: 0.5 }} />
                  <Bone w="50%" h={9} />
                </Box>
              ))}
            </Box>
            {/* SC type rows */}
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.25,
                  py: 0.85,
                  borderRadius: 1.5,
                  border: "1px solid rgba(0,0,0,0.08)",
                  bgcolor: "rgba(0,0,0,0.01)",
                  animation: `blink 1.6s ease-in-out ${i * 0.1}s infinite`,
                }}
              >
                <Box>
                  <Bone w={90} h={11} sx={{ mb: 0.5 }} />
                  <Bone w={120} h={8} />
                </Box>
                <Bone w={70} h={28} r={6} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Col 3 — Compensatory Time Off ── */}
        <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
            <Bone w={160} h={10} />
          </Box>
          {/* Status filter pills */}
          <Box sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.02)", display: "flex", gap: 0.75, flexShrink: 0 }}>
            {[55, 60, 65, 55].map((w, i) => <Bone key={i} w={w} h={20} r={20} />)}
          </Box>
          {/* Record rows */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pt: 1.25, pb: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid rgba(0,0,0,0.08)",
                  bgcolor: "#fff",
                  animation: `blink 1.6s ease-in-out ${i * 0.1}s infinite`,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                    <Bone w={45} h={16} r={20} />
                    <Bone w={90} h={14} />
                    <Bone w={55} h={16} r={20} />
                  </Box>
                  <Bone w={55} h={22} r={6} />
                </Box>
                <Bone w="40%" h={18} sx={{ mb: 0.5 }} />
                <Bone w="65%" h={9} />
              </Box>
            ))}
          </Box>
          {/* Pagination */}
          <Box sx={{ px: 1.5, py: 0.85, borderTop: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.015)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Bone w={120} h={10} />
            <Box sx={{ display: "flex", gap: 0.4 }}>
              {[1, 2, 3, 4].map((i) => <Bone key={i} w={20} h={20} r={4} />)}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "leave", label: "Leave Assignment",     shortLabel: "Leave", icon: LeaveIcon, color: "#6d2323", component: LeaveAssignment },
  { id: "sc",    label: "Service Credits",       shortLabel: "SC",    icon: SCIcon,    color: "#6d2323", component: ServiceCredit },
  { id: "cto",   label: "Compensatory Time Off", shortLabel: "CTO",   icon: CTOIcon,   color: "#6d2323", component: CompensatoryTimeOff },
];

// ─── Main component ───────────────────────────────────────────────────────────
const AssignmentManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS[activeTab];
  const ActiveComponent = tab.component;

  return (
    // NO transform, NO overflow:hidden on this wrapper — both break position:fixed children
    <Box sx={{ fontFamily: T.poppins }}>
      <style>{shimmerKf}</style>

      {/* Our header — uses same left+transform offset as LeaveAssignment's root Box
          so it sits in the exact same horizontal position as the child content   */}
      <Box sx={{
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
        pt: { xs: 2, md: 4 },
        pb: 0,
        mt: { xs: 0, md: -5 },
      }}>
        <SectionCard sx={{ borderRadius: "12px 12px 0 0" }}>
          {/* Gradient header */}
          <Box sx={{
            px: 4,
            py: 2,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)" }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: alpha(T.accent, 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <tab.icon sx={{ fontSize: 18, color: T.accent }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.2, fontFamily: T.poppins }}>
                  Assignment Management
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: T.accentMid, fontWeight: 600, fontFamily: T.poppins }}>
                  Leave Assignment · Service Credits (SC) · Compensatory Time Off (CTO)
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Tab row */}
          <Box sx={{ background: T.headerGrad, px: { xs: 0, sm: 1 }, pt: 0.75, pb: 0, display: "flex", alignItems: "flex-end" }}>
            {TABS.map((t, idx) => {
              const Icon = t.icon;
              const isActive = idx === activeTab;
              return (
                <Box
                  key={t.id}
                  onClick={() => setActiveTab(idx)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: { xs: 1.5, sm: 2.5 },
                    py: 0.85,
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: "8px 8px 0 0",
                    transition: "background 0.15s",
                    bgcolor: isActive ? "rgba(255,255,255,0.97)" : "transparent",
                    "&:hover": isActive ? {} : { bgcolor: "rgba(255,255,255,0.1)" },
                    "&::after": isActive ? { content: '""', position: "absolute", bottom: -1, left: 0, right: 0, height: 2, bgcolor: "rgba(255,255,255,0.97)" } : {},
                  }}
                >
                  <Icon sx={{ fontSize: 13, color: isActive ? T.accent : "rgba(255,255,255,0.6)", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.73rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : "rgba(255,255,255,0.7)", fontFamily: T.poppins, whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>
                    {t.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.73rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : "rgba(255,255,255,0.7)", fontFamily: T.poppins, whiteSpace: "nowrap", display: { xs: "block", sm: "none" } }}>
                    {t.shortLabel}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      </Box>

      {/* Active child module
          - The child handles its own full-width positioning (left+transform on its root)
          - We ONLY hide its own header (first child) and strip top spacing
          - NO overflow:hidden or transform on this wrapper                        */}
      <Box sx={{
        "& > div > *:first-of-type": { display: "none !important" },
        "& > div": { pt: "0 !important", mt: "0 !important", py: "0 !important" },
      }}>
        <Suspense fallback={<Wireframe />}>
          <ActiveComponent />
        </Suspense>
      </Box>

      {/* Floating Conversion Widget — fixed stack matches EarningsManagement */}
      <Box
        sx={{
          position: "fixed",
          bottom: 60,
          right: 10,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <FloatingConversionWidget />
      </Box>
    </Box>
  );
};

export default AssignmentManagement;