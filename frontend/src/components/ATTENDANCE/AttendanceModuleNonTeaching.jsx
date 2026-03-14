import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Fade,
  Alert,
  alpha,
  Chip,
  styled,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Collapse,
  Paper,
} from "@mui/material";
import {
  WorkHistory,
  Person,
  CalendarToday,
  Clear,
  SaveAs,
  Refresh,
  ExpandLess,
  ExpandMore,
  Schedule,
  Star,
  CreditScore,
  AccessTime,
} from "@mui/icons-material";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "109, 35, 35";
};

// ─────────────────────────────────────────────
// WIREFRAME
// ─────────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes ntsShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes ntsPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const S = ({ w = "100%", h = 14, r = 6, sx = {}, accent = "#6d2323" }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(90deg, ${alpha(accent, 0.07)} 25%, ${alpha(accent, 0.18)} 50%, ${alpha(accent, 0.07)} 75%)`,
      backgroundSize: "900px 100%",
      animation: "ntsShimmer 1.6s infinite linear",
      ...sx,
    }}
  />
);

const Placeholder = ({ w, h, r = 4, color = "rgba(109,35,35,0.08)", sx = {} }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, bgcolor: color, flexShrink: 0, ...sx }} />
);

const AttendanceNonTeachingWireframe = ({ accentColor = "#6d2323", primaryColor = "#FEF9E1", secondaryColor = "#FFF8E7" }) => {
  const ac = accentColor;
  const grad = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <Box sx={{ py: { xs: 2, md: 4 }, width: "100vw", mx: "auto", maxWidth: "100%", overflow: "hidden", position: "relative", left: "53%", transform: "translateX(-51%)", px: { xs: 2, sm: 3, md: 6 } }}>
        <Box sx={{ mb: 4, borderRadius: "20px", overflow: "hidden", border: `1px solid ${alpha(ac, 0.1)}`, animation: "ntsPulse 2.2s ease-in-out infinite" }}>
          <Box sx={{ p: 5, background: grad, position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(ac, 0.1)} 0%,transparent 70%)` }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Placeholder w={64} h={64} r="50%" color={alpha(ac, 0.13)} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <S w={280} h={26} r={6} accent={ac} />
                <S w={340} h={13} r={4} accent={ac} />
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ mb: 4, borderRadius: "20px", overflow: "hidden", border: `1px solid ${alpha(ac, 0.1)}`, animation: "ntsPulse 2.2s ease-in-out 0.08s infinite", bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)` }}>
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
              {[0, 1, 2].map((fi) => (
                <Box key={fi} sx={{ flex: 1 }}>
                  <S w={100} h={12} r={3} accent={ac} sx={{ mb: "6px" }} />
                  <Box sx={{ height: 56, borderRadius: "12px", border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: "rgba(255,255,255,0.85)" }} />
                </Box>
              ))}
            </Box>
            <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(ac, 0.20)}`, bgcolor: alpha(primaryColor, 0.30), mb: 4 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {Array.from({ length: 12 }, (_, i) => <S key={i} w={64} h={44} r={10} accent={ac} />)}
              </Box>
            </Box>
            <Box sx={{ height: 48, borderRadius: "12px", bgcolor: alpha(ac, 0.85) }} />
          </Box>
        </Box>
      </Box>
    </>
  );
};

// ─────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────
const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: "blur(10px)",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": { transform: "translateY(-4px)" },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: "12px 24px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  textTransform: "none",
  fontSize: "0.95rem",
  letterSpacing: "0.025em",
  boxShadow: variant === "contained" ? "0 4px 14px rgba(254,249,225,0.25)" : "none",
  "&:hover": { transform: "translateY(-2px)" },
  "&:active": { transform: "translateY(0)" },
}));

const ModernTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    "&:hover": { transform: "translateY(-1px)", backgroundColor: "rgba(255,255,255,0.95)" },
    "&.Mui-focused": { transform: "translateY(-1px)", backgroundColor: "rgba(255,255,255,1)" },
  },
  "& .MuiInputLabel-root": { fontWeight: 500 },
}));

const PremiumTableCell = styled(TableCell)(({ isHeader = false, bgColor = null }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: "12px 14px",
  borderBottom: isHeader ? "2px solid rgba(254,249,225,0.5)" : "1px solid rgba(109,35,35,0.06)",
  fontSize: "0.83rem",
  letterSpacing: "0.025em",
  backgroundColor: bgColor ? bgColor : "transparent",
  whiteSpace: "nowrap",
}));

// ─────────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────────
const VIEW_TABS = [
  { key: "regular",       label: "Regular Time",   icon: <Schedule sx={{ fontSize: 16 }} /> },
  { key: "honorarium",    label: "Honorarium",      icon: <Star sx={{ fontSize: 16 }} /> },
  { key: "serviceCredit", label: "Service Credit",  icon: <CreditScore sx={{ fontSize: 16 }} /> },
  { key: "overtime",      label: "Overtime",        icon: <AccessTime sx={{ fontSize: 16 }} /> },
];

const TAB_COLUMNS = {
  regular: [
    { label: "Date",                    key: "date",                minWidth: 130, bold: true },
    { label: "Day",                     key: "day",                 minWidth: 100, bold: true,  altBg: true },
    { label: "Time IN",                 key: "timeIN",              minWidth: 140 },
    { label: "Official Time IN",        key: "officialTimeIN",      minWidth: 130, altBg: true, bold: true },
    { label: "Breaktime IN",            key: "breaktimeIN",         minWidth: 140 },
    { label: "Official Breaktime IN",   key: "officialBreaktimeIN", minWidth: 140, altBg: true, bold: true },
    { label: "Morning Rendered",        key: "_morningRendered",    minWidth: 130, accent: true, bold: true },
    { label: "Morning Tardiness",       key: "_morningTardiness",   minWidth: 130, accentDark: true, bold: true },
    { label: "Breaktime OUT",           key: "breaktimeOUT",        minWidth: 130 },
    { label: "Official Breaktime OUT",  key: "officialBreaktimeOUT",minWidth: 140, altBg: true, bold: true },
    { label: "Time OUT",                key: "timeOUT",             minWidth: 120 },
    { label: "Official Time OUT",       key: "officialTimeOUT",     minWidth: 130, altBg: true, bold: true },
    { label: "Afternoon Rendered",      key: "_afternoonRendered",  minWidth: 130, accent: true, bold: true },
    { label: "Afternoon Tardiness",     key: "_afternoonTardiness", minWidth: 130, accentDark: true, bold: true },
  ],
  honorarium: [
    { label: "Date",                              key: "date",                       minWidth: 130, bold: true },
    { label: "Day",                               key: "day",                        minWidth: 100, bold: true, altBg: true },
    { label: "Time IN",                           key: "_hnTimeIN",                  minWidth: 140 },
    { label: "Official Honorarium Time IN",       key: "officialHonorariumTimeIN",   minWidth: 180, altBg: true, bold: true },
    { label: "Time OUT",                          key: "_hnTimeOUT",                 minWidth: 140 },
    { label: "Official Honorarium Time OUT",      key: "officialHonorariumTimeOUT",  minWidth: 180, altBg: true, bold: true },
    { label: "Honorarium Rendered",               key: "_hnRendered",                minWidth: 140, accent: true, bold: true },
    { label: "Honorarium Tardiness",              key: "_hnTardiness",               minWidth: 140, accentDark: true, bold: true },
  ],
  serviceCredit: [
    { label: "Date",                                  key: "date",                          minWidth: 130, bold: true },
    { label: "Day",                                   key: "day",                           minWidth: 100, bold: true, altBg: true },
    { label: "Time IN",                               key: "_scTimeIN",                     minWidth: 140 },
    { label: "Official Service Credit Time IN",       key: "officialServiceCreditTimeIN",   minWidth: 200, altBg: true, bold: true },
    { label: "Time OUT",                              key: "_scTimeOUT",                    minWidth: 140 },
    { label: "Official Service Credit Time OUT",      key: "officialServiceCreditTimeOUT",  minWidth: 200, altBg: true, bold: true },
    { label: "Service Credit Rendered",               key: "_scRendered",                   minWidth: 150, accent: true, bold: true },
    { label: "Service Credit Tardiness",              key: "_scTardiness",                  minWidth: 150, accentDark: true, bold: true },
  ],
  overtime: [
    { label: "Date",                          key: "date",              minWidth: 130, bold: true },
    { label: "Day",                           key: "day",               minWidth: 100, bold: true, altBg: true },
    { label: "Time IN",                       key: "_otTimeIN",         minWidth: 140 },
    { label: "Official Overtime Time IN",     key: "officialOverTimeIN", minWidth: 170, altBg: true, bold: true },
    { label: "Time OUT",                      key: "_otTimeOUT",        minWidth: 140 },
    { label: "Official Overtime Time OUT",    key: "officialOverTimeOUT",minWidth: 170, altBg: true, bold: true },
    { label: "Overtime Rendered",             key: "_otRendered",       minWidth: 140, accent: true, bold: true },
    { label: "Overtime Tardiness",            key: "_otTardiness",      minWidth: 140, accentDark: true, bold: true },
  ],
};

const getCellValue = (row, colKey, isFurlough = false) => {
  const NA = "N/A";
  const isNA = (v) => !v || v === "00:00:00 AM" || v === "00:00:00 PM" || v === "00:00:00";

  switch (colKey) {
    // ── Regular AM ──
    case "_morningRendered":
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeAM || row.formattedFacultyMaxRenderedTimeAM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeAM;
      return (!row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === "NaN:NaN:NaN") ? "00:00:00" : row.formattedFacultyRenderedTimeAM;
    case "_morningTardiness":
      if (isFurlough) return "00:00:00";
      return (!row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === "NaN:NaN:NaN") ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM;
    // ── Regular PM ──
    case "_afternoonRendered":
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimePM || row.formattedFacultyMaxRenderedTimePM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimePM;
      return (!row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === "NaN:NaN:NaN") ? "00:00:00" : row.formattedFacultyRenderedTimePM;
    case "_afternoonTardiness":
      if (isFurlough) return "00:00:00";
      return (!row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === "NaN:NaN:NaN") ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM;
    // ── Honorarium ──
    case "_hnTimeIN":  return isNA(row.officialHonorariumTimeIN) ? NA : row.timeIN;
    case "_hnTimeOUT": return isNA(row.officialHonorariumTimeOUT) ? NA : row.timeOUT;
    case "_hnRendered":
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeHN;
      return (!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN") ? "00:00:00" : row.formattedFacultyRenderedTimeHN;
    case "_hnTardiness":
      if (isFurlough) return "00:00:00";
      return (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN") ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;
    // ── Service Credit ──
    case "_scTimeIN":  return isNA(row.officialServiceCreditTimeIN) ? NA : row.timeIN;
    case "_scTimeOUT": return isNA(row.officialServiceCreditTimeOUT) ? NA : row.timeOUT;
    case "_scRendered":
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeSC;
      return (!row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN") ? "00:00:00" : row.formattedFacultyRenderedTimeSC;
    case "_scTardiness":
      if (isFurlough) return "00:00:00";
      return (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN") ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;
    // ── Overtime ──
    case "_otTimeIN":  return isNA(row.officialOverTimeIN) ? NA : row.timeIN;
    case "_otTimeOUT": return isNA(row.officialOverTimeOUT) ? NA : row.timeOUT;
    case "_otRendered":
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeOT;
      return (!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN") ? "00:00:00" : row.formattedFacultyRenderedTimeOT;
    case "_otTardiness":
      if (isFurlough) return "00:00:00";
      return (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN") ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;
    case "officialHonorariumTimeIN":
    case "officialHonorariumTimeOUT":
    case "officialServiceCreditTimeIN":
    case "officialServiceCreditTimeOUT":
    case "officialOverTimeIN":
    case "officialOverTimeOUT":
      return isNA(row[colKey]) ? NA : row[colKey];
    default:
      return row[colKey] ?? "—";
  }
};

// ─────────────────────────────────────────────
// UNIFIED FLOATING BAR — Non-Teaching labels
// ─────────────────────────────────────────────
const FloatingTotalsBar = ({
  accentColor, primaryColor, textPrimaryColor,
  totals, visible, onSave, saving, activeTab,
}) => {
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;

  const items = [
    { label: "Morning Rendered",    value: totals.morningRendered,    group: "regular" },
    { label: "Morning Tardiness",   value: totals.morningTardiness,   group: "regular" },
    { label: "Afternoon Rendered",  value: totals.afternoonRendered,  group: "regular" },
    { label: "Afternoon Tardiness", value: totals.afternoonTardiness, group: "regular" },
    { label: "Overall Rendered",    value: totals.overallRendered,    group: "regular", highlight: true },
    { label: "Overall Tardiness",   value: totals.overallTardiness,   group: "regular", highlight: true },
    { label: "HN Rendered",         value: totals.hnRendered,         group: "honorarium" },
    { label: "HN Tardiness",        value: totals.hnTardiness,        group: "honorarium" },
    { label: "SC Rendered",         value: totals.scRendered,         group: "serviceCredit" },
    { label: "SC Tardiness",        value: totals.scTardiness,        group: "serviceCredit" },
    { label: "OT Rendered",         value: totals.otRendered,         group: "overtime" },
    { label: "OT Tardiness",        value: totals.otTardiness,        group: "overtime" },
  ];

  return (
    <Paper elevation={12} sx={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 1300, borderRadius: 4, overflow: "hidden",
      minWidth: 340, maxWidth: "calc(100vw - 48px)",
      boxShadow: `0 8px 40px ${alpha(accentColor, 0.4)}, 0 2px 10px ${alpha(accentColor, 0.15)}`,
      border: `2px solid ${alpha(accentColor, 0.3)}`,
      bgcolor: `rgba(${hexToRgb(primaryColor)}, 0.97)`,
      backdropFilter: "blur(20px)", transition: "all 0.25s ease",
    }}>
      <Box onClick={() => setExpanded(p => !p)} sx={{
        px: 2.5, py: 1.25,
        background: `linear-gradient(135deg, ${accentColor} 0%, ${alpha(accentColor, 0.82)} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", userSelect: "none",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkHistory sx={{ color: "#fff", fontSize: 15 }} />
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.74rem", letterSpacing: "0.6px", textTransform: "uppercase" }}>
            Attendance Summary
          </Typography>
          <Chip label="All Categories" size="small" sx={{ bgcolor: "rgba(255,255,255,0.22)", color: "#fff", fontWeight: 700, fontSize: "0.67rem", height: 19 }} />
        </Box>
        <Box sx={{ color: "#fff", display: "flex", alignItems: "center" }}>
          {expanded ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 1.75, display: "flex", flexWrap: "nowrap", gap: 1, alignItems: "stretch", overflowX: "auto", "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { background: "rgba(109,35,35,0.3)", borderRadius: 2 } }}>
          {items.map(({ label, value, highlight, group }) => {
            const isActive = group === activeTab;
            return (
              <Box key={label} sx={{
                display: "flex", flexDirection: "column", alignItems: "center",
                minWidth: 80, px: 0.9, py: 0.9, borderRadius: 2,
                position: "relative",
                bgcolor: isActive
                  ? alpha(accentColor, highlight ? 0.22 : 0.15)
                  : highlight ? alpha(accentColor, 0.13) : alpha(accentColor, 0.05),
                border: `1px solid ${isActive ? accentColor : highlight ? alpha(accentColor, 0.38) : alpha(accentColor, 0.13)}`,
                boxShadow: isActive
                  ? `0 0 10px ${alpha(accentColor, 0.55)}, 0 0 22px ${alpha(accentColor, 0.28)}, inset 0 0 8px ${alpha(accentColor, 0.12)}`
                  : "none",
                transform: isActive ? "translateY(-2px) scale(1.04)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": { boxShadow: `0 2px 8px ${alpha(accentColor, 0.22)}` },
              }}>
                {isActive && (
                  <Box sx={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: "2px", borderRadius: "2px 2px 0 0",
                    background: `linear-gradient(90deg, ${alpha(accentColor, 0.6)}, ${accentColor}, ${alpha(accentColor, 0.6)})`,
                    animation: "glowPulse 1.8s ease-in-out infinite",
                    "@keyframes glowPulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }} />
                )}
                <Typography sx={{ fontSize: "0.61rem", color: isActive ? accentColor : alpha(textPrimaryColor, 0.6), fontWeight: isActive ? 800 : 700, textTransform: "uppercase", letterSpacing: "0.4px", mb: 0.2, textAlign: "center", lineHeight: 1.2, transition: "color 0.3s" }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: isActive ? "0.97rem" : "0.92rem", fontWeight: 800, color: isActive || highlight ? accentColor : textPrimaryColor, fontFamily: "monospace", letterSpacing: "0.4px", transition: "all 0.3s" }}>
                  {value || "00:00:00"}
                </Typography>
              </Box>
            );
          })}
          <Box sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minWidth: 140, px: 1.25, py: 0.9, borderRadius: 2,
            bgcolor: accentColor, border: `1px solid ${accentColor}`,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            boxShadow: `0 4px 14px ${alpha(accentColor, 0.35)}`,
            transition: "all 0.2s ease", flexShrink: 0,
            "&:hover": !saving ? { boxShadow: `0 6px 20px ${alpha(accentColor, 0.5)}`, transform: "translateY(-1px)" } : {},
            "&:active": { transform: "translateY(0)" },
          }} onClick={!saving ? onSave : undefined}>
            {saving ? <CircularProgress size={18} sx={{ color: primaryColor, mb: 0.3 }} /> : <SaveAs sx={{ color: primaryColor, fontSize: 18, mb: 0.3 }} />}
            <Typography sx={{ fontSize: "0.72rem", color: primaryColor, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", lineHeight: 1.2 }}>
              {saving ? "Saving…" : "Save Record"}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

// ─────────────────────────────────────────────
// STICKY SCROLLBAR
// ─────────────────────────────────────────────
const StickyScrollbar = ({ innerRef }) => {
  const proxyRef = useRef(null);
  const ghostRef = useRef(null);
  const syncingRef = useRef(false);
  useEffect(() => {
    const inner = innerRef.current, proxy = proxyRef.current, ghost = ghostRef.current;
    if (!inner || !proxy || !ghost) return;
    const updateWidth = () => { ghost.style.width = inner.scrollWidth + "px"; };
    const ro = new ResizeObserver(updateWidth);
    ro.observe(inner);
    updateWidth();
    const onInnerScroll = () => { if (syncingRef.current) return; syncingRef.current = true; proxy.scrollLeft = inner.scrollLeft; syncingRef.current = false; };
    const onProxyScroll = () => { if (syncingRef.current) return; syncingRef.current = true; inner.scrollLeft = proxy.scrollLeft; syncingRef.current = false; };
    inner.addEventListener("scroll", onInnerScroll);
    proxy.addEventListener("scroll", onProxyScroll);
    return () => { inner.removeEventListener("scroll", onInnerScroll); proxy.removeEventListener("scroll", onProxyScroll); ro.disconnect(); };
  }, [innerRef]);
  return (
    <Box ref={proxyRef} sx={{ position: "sticky", bottom: 0, left: 0, width: "100%", zIndex: 10, overflowX: "auto", overflowY: "hidden", height: 16, bgcolor: "rgba(254,249,225,0.9)", borderTop: "1px solid rgba(109,35,35,0.15)", "&::-webkit-scrollbar": { height: 12 }, "&::-webkit-scrollbar-track": { background: "rgba(254,249,225,0.6)", borderRadius: 4 }, "&::-webkit-scrollbar-thumb": { background: "rgba(109,35,35,0.45)", borderRadius: 4, "&:hover": { background: "rgba(109,35,35,0.7)" } } }}>
      <Box ref={ghostRef} sx={{ height: 1 }} />
    </Box>
  );
};

// ─────────────────────────────────────────────
// STATUS HELPERS (shared furlough logic)
// ─────────────────────────────────────────────
const getStatusLabel = (date, suspMap, leaveMap, holidayMap) => {
  if (suspMap?.[date])    return "WORK SUSPENDED";
  if (holidayMap?.[date]) return "HOLIDAY";
  if (leaveMap?.[date])   return "ON LEAVE";
  return "";
};

const getStatusStyle = (label) => {
  if (label === "WORK SUSPENDED") return { bgcolor: alpha("#d32f2f", 0.12), color: "#d32f2f", border: `1px solid ${alpha("#d32f2f", 0.4)}` };
  if (label === "HOLIDAY")        return { bgcolor: alpha("#f57c00", 0.12), color: "#f57c00", border: `1px solid ${alpha("#f57c00", 0.4)}` };
  if (label === "ON LEAVE")       return { bgcolor: alpha("#2e7d32", 0.12), color: "#2e7d32", border: `1px solid ${alpha("#2e7d32", 0.4)}` };
  return {};
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AttendanceModuleNonTeachingStaff = () => {
  const { settings } = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");
  const [pageLoading, setPageLoading]       = useState(true);
  const [activeTab, setActiveTab]           = useState("regular");

  // ── Furlough maps ──
  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate]           = useState({});
  const [holidayByDate, setHolidayByDate]       = useState({});

  const navigate = useNavigate();
  const resultsRef   = useRef(null);
  const tableBodyRef = useRef(null);

  const primaryColor       = settings.accentColor        || "#FEF9E1";
  const secondaryColor     = settings.backgroundColor    || "#FFF8E7";
  const accentColor        = settings.primaryColor       || "#6d2323";
  const accentDark         = settings.secondaryColor     || "#8B3333";
  const textPrimaryColor   = settings.textPrimaryColor   || "#6d2323";
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";

  const { hasAccess, loading: accessLoading } = usePageAccess("attendance-module");

  const currentYear = new Date().getFullYear();
  const months      = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [snackbar, setSnackbar]                   = useState({ open: false, message: "", severity: "success" });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const showSnackbar = (message, severity = "success") => { setSnackbar({ open: true, message, severity }); setSnackbarCountdown(6); };
  const handleCloseSnackbar = () => setSnackbar(p => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    const en = localStorage.getItem("employeeNumber");
    const sd = localStorage.getItem("startDate");
    const ed = localStorage.getItem("endDate");
    if (en) setEmployeeNumber(en);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
  }, []);

  useEffect(() => {
    if (attendanceData.length > 0 && resultsRef.current)
      setTimeout(() => resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [attendanceData]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

  // ── Furlough helper ──
  const getStatusLabelForDate = useCallback((date) =>
    getStatusLabel(date, suspensionByDate, leaveByDate, holidayByDate),
    [suspensionByDate, leaveByDate, holidayByDate]
  );

  // ── Segment calculator (same as original) ──
  const calcSegment = (startStr, endStr, officialStartStr, officialEndStr) => {
    const midnight = new Date("01/01/2000 00:00:00 AM");
    const start    = new Date(`01/01/2000 ${startStr}`);
    const end      = new Date(`01/01/2000 ${endStr}`);
    const offStart = new Date(`01/01/2000 ${officialStartStr}`);
    const offEnd   = new Date(`01/01/2000 ${officialEndStr}`);

    const effStart =
      end < offStart ? midnight
      : start > offEnd ? midnight
      : start < offStart ? offStart
      : start;
    const effEnd =
      effStart === midnight ? midnight
      : end < offStart ? midnight
      : end < offEnd ? end : offEnd;

    const diffMs = effEnd - effStart;
    const h = Math.floor(diffMs / 3600000), m = Math.floor((diffMs % 3600000) / 60000), s = Math.floor((diffMs % 60000) / 1000);
    const rendered = [h, m, s].map(x => String(x).padStart(2, "0")).join(":");

    const offDiff = offEnd - offStart;
    const oh = Math.floor(offDiff / 3600000), om = Math.floor((offDiff % 3600000) / 60000), os = Math.floor((offDiff % 60000) / 1000);
    const maxRendered = [oh, om, os].map(x => String(x).padStart(2, "0")).join(":");

    const tard = new Date(`01/01/2000 ${maxRendered}`) - new Date(`01/01/2000 ${rendered}`);
    const th = Math.floor(tard / 3600000), tm = Math.floor((tard % 3600000) / 60000), ts = Math.floor((tard % 60000) / 1000);
    const tardiness = [th, tm, ts].map(x => String(x).padStart(2, "0")).join(":");

    return { rendered, maxRendered, tardiness };
  };

  // ── handleSubmit ──
  const handleSubmit = async () => {
    localStorage.setItem("employeeNumber", employeeNumber);
    localStorage.setItem("startDate", startDate);
    localStorage.setItem("endDate", endDate);
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
        params: { personId: employeeNumber, startDate, endDate },
        ...getAuthHeaders(),
      });

      const processedData = response.data.map((row) => {
        const { timeIN, timeOUT, breaktimeIN, breaktimeOUT, officialBreaktimeIN, officialBreaktimeOUT, officialTimeIN, officialTimeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT, officialOverTimeIN, officialOverTimeOUT } = row;

        const am = calcSegment(timeIN, breaktimeIN, officialTimeIN, officialBreaktimeIN);
        const pm = calcSegment(breaktimeOUT, timeOUT, officialBreaktimeOUT, officialTimeOUT);
        const hn = calcSegment(timeIN, timeOUT, officialHonorariumTimeIN, officialHonorariumTimeOUT);
        const sc = calcSegment(timeIN, timeOUT, officialServiceCreditTimeIN, officialServiceCreditTimeOUT);
        const ot = calcSegment(timeIN, timeOUT, officialOverTimeIN, officialOverTimeOUT);

        return {
          ...row,
          formattedFacultyRenderedTimeAM:    am.rendered,
          formattedFacultyMaxRenderedTimeAM: am.maxRendered,
          formattedfinalcalcFacultyAM:       am.tardiness,
          formattedFacultyRenderedTimePM:    pm.rendered,
          formattedFacultyMaxRenderedTimePM: pm.maxRendered,
          formattedfinalcalcFacultyPM:       pm.tardiness,
          formattedFacultyRenderedTimeHN:    hn.rendered,
          formattedFacultyMaxRenderedTimeHN: hn.maxRendered,
          formattedfinalcalcFacultyHN:       hn.tardiness,
          formattedFacultyRenderedTimeSC:    sc.rendered,
          formattedFacultyMaxRenderedTimeSC: sc.maxRendered,
          formattedfinalcalcFacultySC:       sc.tardiness,
          formattedFacultyRenderedTimeOT:    ot.rendered,
          formattedFacultyMaxRenderedTimeOT: ot.maxRendered,
          formattedfinalcalcFacultyOT:       ot.tardiness,
        };
      });

      // ── Fetch furlough maps ──
      const [suspRes, leaveRes, holidayRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/attendance/api/suspensions`, { params: { startDate, endDate }, ...getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/attendance/api/leaves`,      { params: { startDate, endDate }, ...getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/attendance/api/holiday`,     { params: { startDate, endDate }, ...getAuthHeaders() }),
      ]);
      setSuspensionByDate(suspRes.data?.byDate  || {});
      setLeaveByDate(leaveRes.data?.byDate       || {});
      setHolidayByDate(holidayRes.data?.byDate   || {});

      setAttendanceData(processedData);
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      const msg = "Failed to fetch attendance data. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Totals (furlough-aware) ──
  const sumTime = useCallback((values) => {
    let total = 0;
    values.forEach(t => {
      if (!t || t === "NaN:NaN:NaN" || t === "—") return;
      const parts = t.split(":").map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n)))
        total += parts[0] * 3600 + parts[1] * 60 + parts[2];
    });
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }, []);

  const addTimes = useCallback((a, b) => {
    const parse = t => { const [h,m,s] = (t||"00:00:00").split(":").map(Number); return h*3600+m*60+s; };
    const total = parse(a) + parse(b);
    const h = Math.floor(total/3600), m = Math.floor((total%3600)/60), s = total%60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }, []);

  const totals = React.useMemo(() => {
    if (!attendanceData.length) return {};

    // Morning — furlough days get maxRendered (full credit), normal days get actual rendered
    const morningRendered = sumTime(attendanceData.map(r => {
      const f = Boolean(getStatusLabelForDate(r.date));
      return getCellValue(r, "_morningRendered", f);
    }));
    const morningTardiness = sumTime(attendanceData.map(r => {
      const f = Boolean(getStatusLabelForDate(r.date));
      return getCellValue(r, "_morningTardiness", f);
    }));
    const afternoonRendered = sumTime(attendanceData.map(r => {
      const f = Boolean(getStatusLabelForDate(r.date));
      return getCellValue(r, "_afternoonRendered", f);
    }));
    const afternoonTardiness = sumTime(attendanceData.map(r => {
      const f = Boolean(getStatusLabelForDate(r.date));
      return getCellValue(r, "_afternoonTardiness", f);
    }));
    const overallRendered  = addTimes(morningRendered, afternoonRendered);
    const overallTardiness = addTimes(morningTardiness, afternoonTardiness);

    const hnRendered  = sumTime(attendanceData.map(r => getCellValue(r, "_hnRendered",  Boolean(getStatusLabelForDate(r.date)))));
    const hnTardiness = sumTime(attendanceData.map(r => getCellValue(r, "_hnTardiness", Boolean(getStatusLabelForDate(r.date)))));
    const scRendered  = sumTime(attendanceData.map(r => getCellValue(r, "_scRendered",  Boolean(getStatusLabelForDate(r.date)))));
    const scTardiness = sumTime(attendanceData.map(r => getCellValue(r, "_scTardiness", Boolean(getStatusLabelForDate(r.date)))));
    const otRendered  = sumTime(attendanceData.map(r => getCellValue(r, "_otRendered",  Boolean(getStatusLabelForDate(r.date)))));
    const otTardiness = sumTime(attendanceData.map(r => getCellValue(r, "_otTardiness", Boolean(getStatusLabelForDate(r.date)))));

    return { morningRendered, morningTardiness, afternoonRendered, afternoonTardiness, overallRendered, overallTardiness, hnRendered, hnTardiness, scRendered, scTardiness, otRendered, otTardiness };
  }, [attendanceData, sumTime, addTimes, getStatusLabelForDate]);

  const getTabTotalsValues = (tab) => {
    switch (tab) {
      case "regular":       return [totals.morningRendered, totals.morningTardiness, totals.afternoonRendered, totals.afternoonTardiness];
      case "honorarium":    return [totals.hnRendered, totals.hnTardiness];
      case "serviceCredit": return [totals.scRendered, totals.scTardiness];
      case "overtime":      return [totals.otRendered, totals.otTardiness];
      default:              return [];
    }
  };

  // ── Save ──
  const saveOverallAttendance = async () => {
    setSaving(true);
    try {
      const dup = await axios.get(`${API_BASE_URL}/attendance/api/overall_attendance_record`, { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() });
      if (dup.data?.data?.length) {
        showSnackbar(`Record for Employee ${employeeNumber} covering ${startDate}–${endDate} already exists.`, "warning");
        setTimeout(() => navigate("/attendance_summary"), 2500);
        return;
      }
    } catch (e) {
      console.error("Duplicate-check failed:", e);
      showSnackbar("Could not verify duplicates. Saving aborted.", "error");
      return;
    } finally { setSaving(false); }

    setSaving(true);
    const record = {
      personID: employeeNumber, startDate, endDate,
      totalRenderedTimeMorning:             totals.morningRendered,
      totalRenderedTimeMorningTardiness:    totals.morningTardiness,
      totalRenderedTimeAfternoon:           totals.afternoonRendered,
      totalRenderedTimeAfternoonTardiness:  totals.afternoonTardiness,
      totalRenderedHonorarium:              totals.hnRendered,
      totalRenderedHonorariumTardiness:     totals.hnTardiness,
      totalRenderedServiceCredit:           totals.scRendered,
      totalRenderedServiceCreditTardiness:  totals.scTardiness,
      totalRenderedOvertime:                totals.otRendered,
      totalRenderedOvertimeTardiness:       totals.otTardiness,
      overallRenderedOfficialTime:          totals.overallRendered,
      overallRenderedOfficialTimeTardiness: totals.overallTardiness,
    };
    try {
      const response = await axios.post(`${API_BASE_URL}/attendance/api/overall_attendance`, record, getAuthHeaders());
      showSnackbar(response.data.message || "Attendance record saved successfully!", "success");
      setTimeout(() => navigate("/attendance_summary"), 1500);
    } catch (err) {
      console.error("Error saving overall attendance:", err);
      showSnackbar("Failed to save attendance record.", "error");
    } finally { setSaving(false); }
  };

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setEmployeeNumber(""); setStartDate(""); setEndDate("");
    setAttendanceData([]); setError(""); setSelectedMonth(null);
    setSuspensionByDate({}); setLeaveByDate({}); setHolidayByDate({});
  };

  // ── Guards ──
  if (pageLoading || accessLoading) return (
    <AttendanceNonTeachingWireframe accentColor={accentColor} primaryColor={primaryColor} secondaryColor={secondaryColor} />
  );
  if (hasAccess === false) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access Attendance Module for Non-Teaching Staff." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  const columns      = TAB_COLUMNS[activeTab];
  const tabTotals    = getTabTotalsValues(activeTab);
  const calcColCount = columns.filter(c => c.accent || c.accentDark).length;
  const nonCalcCount = columns.length - calcColCount;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <Fade in timeout={500}>
      <Box sx={{
        py: { xs: 2, md: 4 },
        width: "100vw", mx: "auto", maxWidth: "100%",
        overflow: "hidden", position: "relative",
        left: "53%", transform: "translateX(-51%)",
        px: { xs: 2, sm: 3, md: 6 },
        pb: attendanceData.length > 0 ? "160px" : undefined,
      }}>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%", fontWeight: 600 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.3)", color: "#fff", fontWeight: 700 }} />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* Hero Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{ background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <Box sx={{ p: 5, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, position: "relative", overflow: "hidden" }}>
                <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(accentColor,0.1)} 0%,transparent 70%)` }} />
                <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, background: `radial-gradient(circle,${alpha(accentColor,0.08)} 0%,transparent 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(accentColor,0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor,0.15)}` }}>
                      <WorkHistory sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Attendance Records (Non-teaching)
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>
                        Generate and review all attendance records of Non-Teaching employees
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip label="Non-Teaching" size="small" sx={{ bgcolor: alpha(accentColor,0.15), color: textPrimaryColor, fontWeight: 500 }} />
                    <Tooltip title="Refresh Data">
                      <IconButton onClick={handleSubmit} disabled={!employeeNumber || !startDate || !endDate} sx={{ bgcolor: alpha(accentColor,0.1), "&:hover": { bgcolor: alpha(accentColor,0.2) }, color: textPrimaryColor, width: 48, height: 48 }}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Controls Card */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4, background: `rgba(${hexToRgb(primaryColor)},0.95)`, boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`, border: `1px solid ${alpha(accentColor,0.1)}` }}>
            <CardContent sx={{ p: 4, "&:last-child": { pb: 4 } }}>
              <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                {[
                  { label: "Employee Number", value: employeeNumber, onChange: e => setEmployeeNumber(e.target.value), type: "text",  icon: <Person sx={{ color: textPrimaryColor }} /> },
                  { label: "Start Date",       value: startDate,      onChange: e => setStartDate(e.target.value),      type: "date",  icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                  { label: "End Date",         value: endDate,        onChange: e => setEndDate(e.target.value),        type: "date",  icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                ].map(({ label, value, onChange, type, icon }) => (
                  <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>{label}</Typography>
                    <ModernTextField type={type} value={value} onChange={onChange} required InputLabelProps={type === "date" ? { shrink: true } : {}} InputProps={{ startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }} fullWidth />
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3, borderColor: alpha(accentColor,0.1) }} />

              {/* Month picker */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(accentColor,0.2)}`, backgroundColor: alpha(primaryColor,0.3) }}>
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: textPrimaryColor, fontWeight: 600, mb: 0.5 }}>Select Entire Month</Typography>
                      <Typography variant="body2" sx={{ color: alpha(textPrimaryColor,0.7) }}>Choose a year, then click any month to view records for that entire month</Typography>
                    </Box>
                    <FormControl sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                      <Select value={selectedYear} label="Year" onChange={e => { setSelectedYear(e.target.value); setSelectedMonth(null); showSnackbar("Year changed — please click a month.", "info"); }} sx={{ backgroundColor: "white", borderRadius: 2, fontWeight: 600 }}>
                        {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                    {months.map((month, index) => {
                      const sel = selectedMonth === index;
                      return (
                        <ProfessionalButton key={month} variant={sel ? "contained" : "outlined"} size="medium" onClick={() => handleMonthClick(index)}
                          sx={{ borderColor: accentColor, backgroundColor: sel ? accentColor : "transparent", color: sel ? textSecondaryColor : textPrimaryColor, py: 1.5, px: 4.5, fontWeight: 600, boxShadow: sel ? `0 4px 12px ${alpha(accentColor,0.3)}` : "none" }}>
                          {month}
                        </ProfessionalButton>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3, flexWrap: "wrap", gap: 2 }}>
                <ProfessionalButton variant="outlined" startIcon={<Clear />} onClick={handleClearFilters} sx={{ borderColor: "#d32f2f", color: "#d32f2f", "&:hover": { borderColor: "#b71c1c", backgroundColor: alpha("#d32f2f",0.05) } }}>
                  Clear All Filters
                </ProfessionalButton>
                <ProfessionalButton variant="contained" startIcon={<Refresh />} onClick={handleSubmit} disabled={!employeeNumber || !startDate || !endDate} sx={{ py: 1.5, px: 4, bgcolor: accentColor, color: primaryColor, fontSize: "1rem", "&:hover": { bgcolor: accentDark } }}>
                  Search Records
                </ProfessionalButton>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError("")}>{error}</Alert>
          </Fade>
        )}

        {/* Results Table */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={500}>
            <GlassCard ref={resultsRef} sx={{ mb: 17, border: `1px solid ${alpha(accentColor,0.1)}` }}>

              {/* Banner */}
              <Box sx={{ p: 4, background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: "uppercase", letterSpacing: "0.1em", color: accentDark }}>Non-Teaching Staff Attendance Records</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}><b>{employeeNumber}</b></Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                    <Chip icon={<WorkHistory />} label={`${attendanceData.length} Records`} size="small" sx={{ bgcolor: alpha(accentColor,0.15), color: accentColor, fontWeight: 500 }} />
                    <Typography variant="body2" sx={{ opacity: 0.8, color: accentDark }}>{startDate} to {endDate}</Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: alpha(accentColor,0.15), width: 80, height: 80, color: accentColor }}>
                  <WorkHistory sx={{ fontSize: 36 }} />
                </Avatar>
              </Box>

              {/* Tab switcher */}
              <Box sx={{ px: 3, pt: 2.5 }}>
                <Box sx={{ display: "flex", border: `1px solid ${alpha(accentColor, 0.22)}`, borderRadius: 1.5, overflow: "hidden", mb: 2.5 }}>
                  {VIEW_TABS.map(({ key, label, icon }, i, arr) => (
                    <Button key={key} onClick={() => setActiveTab(key)} startIcon={icon} disableElevation fullWidth
                      sx={{
                        borderRadius: 0, textTransform: "none",
                        fontWeight: activeTab === key ? 700 : 500,
                        fontSize: "0.84rem", py: 1.1,
                        bgcolor: activeTab === key ? accentColor : "transparent",
                        color: activeTab === key ? "#fff" : textPrimaryColor,
                        borderRight: i < arr.length - 1 ? `1px solid ${alpha(accentColor, 0.2)}` : "none",
                        transition: "all 0.2s ease",
                        "&:hover": { bgcolor: activeTab === key ? accentDark : alpha(accentColor, 0.08) },
                      }}>
                      {label}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Table */}
              <Box sx={{ px: 3, pb: 3 }}>
                <Box sx={{ position: "relative", borderRadius: 2, border: `1px solid ${alpha(accentColor, 0.1)}`, overflow: "hidden" }}>
                  <Box ref={tableBodyRef} sx={{
                    overflowX: "auto", overflowY: "auto", maxHeight: 520, scrollbarWidth: "thin",
                    "&::-webkit-scrollbar": { height: 6, width: 6 },
                    "&::-webkit-scrollbar-track": { background: "rgba(254,249,225,0.3)", borderRadius: 4 },
                    "&::-webkit-scrollbar-thumb": { background: "rgba(109,35,35,0.4)", borderRadius: 4 },
                  }}>
                    <Table sx={{ minWidth: columns.reduce((s, c) => s + (c.minWidth || 120), 0) }}>
                      <TableHead>
                        <TableRow>
                          {columns.map(({ label, minWidth, altBg, accent, accentDark: adk }) => {
                            const bg = accent ? alpha(accentColor, 0.22) : adk ? alpha(accentColor, 0.32) : altBg ? alpha(primaryColor, 0.85) : alpha(primaryColor, 0.92);
                            return (
                              <PremiumTableCell key={label} isHeader bgColor={bg} sx={{ color: accentColor, minWidth: minWidth || 120, position: "sticky", top: 0, zIndex: 2, bgcolor: bg }}>
                                {label}
                              </PremiumTableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {attendanceData.map((row, ri) => {
                          const statusLabel = getStatusLabelForDate(row.date);
                          const isFurlough  = Boolean(statusLabel);
                          return (
                            <TableRow key={ri} sx={{ "&:nth-of-type(even)": { bgcolor: alpha(primaryColor, 0.3) }, "&:hover": { bgcolor: alpha(accentColor, 0.05) }, transition: "all 0.15s ease" }}>
                              {columns.map(({ key, bold, altBg, accent: ac2, accentDark: adk2 }) => {
                                const cellBg = ac2 ? alpha(accentColor, 0.1) : adk2 ? alpha(accentColor, 0.18) : altBg ? alpha(primaryColor, 0.45) : null;

                                // Date cell — show furlough chip
                                if (key === "date") {
                                  return (
                                    <PremiumTableCell key={key} bgColor={cellBg} sx={{ fontWeight: bold ? 700 : 500, textAlign: "center" }}>
                                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                                        <span>{row.date}</span>
                                        {statusLabel && (
                                          <Chip size="small" label={statusLabel} sx={{ mt: 0.5, fontWeight: 700, fontSize: "0.70rem", height: 20, ...getStatusStyle(statusLabel) }} />
                                        )}
                                      </Box>
                                    </PremiumTableCell>
                                  );
                                }

                                return (
                                  <PremiumTableCell key={key} bgColor={cellBg} sx={{ fontWeight: bold ? 700 : 500, textAlign: (bold || ac2 || adk2) ? "center" : "left" }}>
                                    {getCellValue(row, key, isFurlough)}
                                  </PremiumTableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}

                        {/* Totals row */}
                        <TableRow sx={{ bgcolor: alpha(accentColor, 0.07), borderTop: `2px solid ${alpha(accentColor, 0.2)}` }}>
                          {columns.map(({ key, accent: ac2, accentDark: adk2 }, ci) => {
                            if (ci === 0) return (
                              <PremiumTableCell key={key} colSpan={nonCalcCount} sx={{ fontWeight: 700, textAlign: "right", color: accentColor, fontSize: "0.8rem", pr: 2 }}>
                                TOTAL FOR PERIOD
                              </PremiumTableCell>
                            );
                            if (ci < nonCalcCount) return null;
                            const totalIdx = ci - nonCalcCount;
                            const bg = ac2 ? alpha(accentColor, 0.22) : adk2 ? alpha(accentColor, 0.32) : null;
                            return (
                              <PremiumTableCell key={key} bgColor={bg} sx={{ fontWeight: 800, textAlign: "center", fontFamily: "monospace", fontSize: "0.9rem", color: accentColor }}>
                                {tabTotals[totalIdx] || "00:00:00"}
                              </PremiumTableCell>
                            );
                          })}
                        </TableRow>

                        {/* Overall row — regular tab only */}
                        {activeTab === "regular" && (
                          <TableRow sx={{ bgcolor: alpha(accentColor, 0.12) }}>
                            <PremiumTableCell colSpan={nonCalcCount + (calcColCount - 2)} sx={{ fontWeight: 700, textAlign: "right", color: accentColor, fontSize: "0.8rem", pr: 2 }}>
                              OVERALL RENDERED — {startDate} → {endDate}
                            </PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(accentColor, 0.22)} sx={{ fontWeight: 900, textAlign: "center", fontFamily: "monospace", fontSize: "1rem", color: accentColor }}>
                              {totals.overallRendered}
                            </PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(accentColor, 0.32)} sx={{ fontWeight: 900, textAlign: "center", fontFamily: "monospace", fontSize: "1rem", color: accentColor }}>
                              {totals.overallTardiness}
                            </PremiumTableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* Floating Bar */}
        <FloatingTotalsBar
          accentColor={accentColor}
          primaryColor={primaryColor}
          textPrimaryColor={textPrimaryColor}
          totals={totals}
          visible={attendanceData.length > 0}
          onSave={saveOverallAttendance}
          saving={saving}
          activeTab={activeTab}
        />
      </Box>
    </Fade>
  );
};

export default AttendanceModuleNonTeachingStaff;