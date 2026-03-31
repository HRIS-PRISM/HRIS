import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Modal,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Alert,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Divider,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  LinearProgress,
  Tooltip,
  Fade,
  CircularProgress,
} from "@mui/material";

import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  EventAvailable as ReorderIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  MonetizationOn as CommutationIcon,
  CheckCircle as CheckIcon,
  AutoFixHigh as AutoAssignIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Wc as GenderIcon,
  Warning as WarningIcon,
  PlayArrow as RunIcon,
  TableRows as TableRowsIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  headerGrad: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
  modalGrad: "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven: "#ffffff",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: T.surface,
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 700,
  fontSize: "0.875rem",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

// ─── Shimmer / Wireframe ──────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      <Box
        sx={{
          mb: 2,
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${T.accentBorder}`,
          animation: "blink 2s ease-in-out infinite",
        }}
      >
        <Box
          sx={{
            px: 4,
            py: 4,
            background: T.headerGrad,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: "50%",
              bgcolor: "rgba(109,35,35,0.06)",
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.15)",
                flexShrink: 0,
              }}
            />
            <Box>
              <Bone w={260} h={18} sx={{ mb: 1 }} />
              <Bone w={400} h={11} />
            </Box>
          </Box>
          <Bone w={140} h={28} r={20} />
        </Box>
      </Box>
      <Box
        sx={{
          mb: 2,
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${T.accentBorder}`,
          bgcolor: "#fff",
          animation: "blink 2s ease-in-out 0.08s infinite",
        }}
      >
        <Box
          sx={{
            px: 3.5,
            py: 1.5,
            bgcolor: T.accentFaint,
            borderBottom: `1px solid ${T.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              bgcolor: "rgba(109,35,35,0.25)",
            }}
          />
          <Bone w={220} h={12} />
        </Box>
        <Box sx={{ p: 3.5 }}>
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} md={i < 3 ? 4 : 3} key={i}>
                <Bone w={130} h={11} r={3} sx={{ mb: 1.5 }} />
                <Box
                  sx={{
                    height: 50,
                    borderRadius: 2,
                    border: `1px solid ${T.accentBorder}`,
                    bgcolor: "rgba(255,255,255,0.8)",
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
      <Box
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${T.accentBorder}`,
          bgcolor: "#fff",
          height: "calc(100vh - 420px)",
          animation: "blink 2s ease-in-out 0.16s infinite",
        }}
      >
        <Box
          sx={{
            px: 3.5,
            py: 2,
            borderBottom: `1px solid ${T.divider}`,
            bgcolor: T.accentFaint,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Bone w={180} h={13} />
          <Box
            sx={{
              width: 280,
              height: 36,
              borderRadius: 2,
              border: `1px solid ${T.accentBorder}`,
              bgcolor: "#fff",
            }}
          />
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 0.8fr 0.8fr 1.4fr 1.2fr 1fr",
            gap: 2,
            px: 3.5,
            py: 1,
            bgcolor: alpha(T.accent, 0.04),
            borderBottom: `1px solid ${T.divider}`,
          }}
        >
          {[80, 60, 70, 100, 80, 60].map((w, i) => (
            <Bone key={i} w={w} h={9} />
          ))}
        </Box>
        {[...Array(7)].map((_, i) => (
          <Box
            key={i}
            sx={{
              display: "grid",
              gridTemplateColumns: "2fr 0.8fr 0.8fr 1.4fr 1.2fr 1fr",
              gap: 2,
              px: 3.5,
              py: 1.5,
              alignItems: "center",
              borderBottom: i < 6 ? `1px solid ${T.divider}` : "none",
              bgcolor: i % 2 === 0 ? T.rowEven : T.rowOdd,
              animation: `blink 2s ease-in-out ${i * 0.06}s infinite`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  bgcolor: "rgba(109,35,35,0.12)",
                  flexShrink: 0,
                }}
              />
              <Box>
                <Bone w={120} h={12} sx={{ mb: 0.5 }} />
                <Bone w={64} h={9} />
              </Box>
            </Box>
            <Box
              sx={{
                width: 46,
                height: 20,
                borderRadius: 1,
                bgcolor: "rgba(109,35,35,0.08)",
              }}
            />
            <Bone w={60} h={11} />
            <Bone w={80} h={11} />
            <Box>
              <Bone w={88} h={14} sx={{ mb: 0.4 }} />
              <Bone w={54} h={9} />
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Bone w={40} h={20} r={4} />
              <Bone w={40} h={20} r={4} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const semOrder = (s) => {
  if (!s) return 0;
  const l = String(s).toLowerCase();
  if (l.includes("2nd")) return 2;
  if (l.includes("1st")) return 1;
  return 0;
};
const periodLabel = (year, sem) => {
  if (!year) return "Unknown period";
  return sem ? `${year} ${sem}` : `${year}`;
};
const getStatusColor = (remaining, total) => {
  if (!total || total === 0) return "#9e9e9e";
  const pct = (remaining / total) * 100;
  if (pct > 50) return "#2e7d32";
  if (pct > 20) return "#ed6c02";
  return "#d32f2f";
};
const daysToHours = (days) => (parseFloat(days) || 0) * 8;
const hoursToDays = (hours) => ((hours || 0) / 8).toString();
const parseHoursToComponents = (hoursLike, hoursPerDay = 8) => {
  const hours = Math.max(0, toNum(hoursLike));
  const totalSeconds = Math.round(hours * 3600);
  const daySeconds = hoursPerDay * 3600;
  const days = Math.floor(totalSeconds / daySeconds);
  let rem = totalSeconds % daySeconds;
  const h = Math.floor(rem / 3600);
  rem %= 3600;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return { days, h, m, s };
};
const getLeaveLabel = (leaveCode, leaveTypes) => {
  if (!leaveCode) return "—";
  const found = Array.isArray(leaveTypes)
    ? leaveTypes.find((t) => t.leave_code === leaveCode)
    : null;
  const desc =
    found?.leave_description || found?.description || found?.leave_name || "";
  return desc ? `${leaveCode} — ${desc}` : `${leaveCode}`;
};
const isCommutedLocked = (row) =>
  toNum(row?.remaining_hours) === 0 &&
  toNum(row?.total_hours) > 0 &&
  toNum(row?.used_hours) > 0 &&
  toNum(row?.used_hours) >= toNum(row?.total_hours);
const getActivePeriods = (periods = []) =>
  (Array.isArray(periods) ? periods : []).filter((p) => !isCommutedLocked(p));
const getLeaveTypeStatsActive = (periods) =>
  getActivePeriods(periods).reduce(
    (s, p) => ({
      totalHours: s.totalHours + toNum(p.total_hours),
      usedHours: s.usedHours + toNum(p.used_hours),
      remainingHours: s.remainingHours + toNum(p.remaining_hours),
    }),
    { totalHours: 0, usedHours: 0, remainingHours: 0 },
  );

// ─── Gender helpers ───────────────────────────────────────────────────────────
const getLeaveGenderRestriction = (leaveType) => {
  if (!leaveType?.gender_restriction) return null;
  return leaveType.gender_restriction.toLowerCase();
};
const isLeaveAllowedForGender = (leaveType, employeeGender) => {
  const restriction = getLeaveGenderRestriction(leaveType);
  if (!restriction) return true;
  if (!employeeGender) return false;
  const gLower = employeeGender.toLowerCase();
  if (restriction === "male") return gLower === "male" || gLower === "m";
  if (restriction === "female") return gLower === "female" || gLower === "f";
  return true;
};

const GenderBadge = ({ gender, light = false }) => {
  if (!gender) return null;
  const isMale = gender.toLowerCase() === "male";
  if (light)
    return (
      <Chip
        size="small"
        icon={
          isMale ? (
            <MaleIcon
              style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}
            />
          ) : (
            <FemaleIcon
              style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}
            />
          )
        }
        label={gender}
        sx={{
          height: 20,
          fontSize: "0.65rem",
          bgcolor: "rgba(255,255,255,0.18)",
          color: "#fff",
          fontWeight: 900,
          border: "1px solid rgba(255,255,255,0.35)",
        }}
      />
    );
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon
            style={{ fontSize: 11, color: isMale ? "#1565C0" : "#c2185b" }}
          />
        ) : (
          <FemaleIcon style={{ fontSize: 11, color: "#c2185b" }} />
        )
      }
      label={gender}
      sx={{
        height: 18,
        fontSize: "0.6rem",
        fontWeight: 800,
        letterSpacing: 0.3,
        bgcolor: isMale ? "rgba(21,101,192,0.08)" : "rgba(194,24,91,0.08)",
        color: isMale ? "#1565C0" : "#c2185b",
        border: `1px solid ${isMale ? "rgba(21,101,192,0.25)" : "rgba(194,24,91,0.25)"}`,
        borderRadius: "4px",
      }}
    />
  );
};

// ─── RemainingBalance ─────────────────────────────────────────────────────────
const RemainingBalance = ({
  hoursLike,
  color,
  alignItems = "flex-end",
  largeDays = false,
}) => {
  const { days, h, m, s } = parseHoursToComponents(hoursLike);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems }}>
      <Typography
        sx={{
          fontWeight: 900,
          color: color || "inherit",
          fontSize: largeDays ? "1.4rem" : "0.95rem",
          lineHeight: 1.2,
        }}
      >
        {days} {days === 1 ? "day" : "days"}
      </Typography>
      <Typography
        sx={{
          fontWeight: 600,
          color: color || "inherit",
          fontSize: "0.70rem",
          opacity: 0.75,
          lineHeight: 1.3,
        }}
      >
        &amp; {h}h, {m}m, {s}s
      </Typography>
    </Box>
  );
};

// ─── StatPill ─────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, color = "#444" }) => (
  <Box
    sx={{
      px: 1.5,
      py: 1,
      bgcolor: "#faf9f8",
      borderRadius: "6px",
      textAlign: "center",
      minWidth: 56,
    }}
  >
    <Typography
      sx={{
        fontWeight: 800,
        fontSize: "1rem",
        color,
        lineHeight: 1.1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: "0.58rem",
        color: "#aaa",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        mt: 0.3,
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── FieldLabel ───────────────────────────────────────────────────────────────
const FieldLabel = ({ children, endAdornment }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 24,
      mb: 0.75,
    }}
  >
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 900, color: T.accent, lineHeight: 1 }}
    >
      {children}
    </Typography>
    {endAdornment && <Box sx={{ flexShrink: 0 }}>{endAdornment}</Box>}
  </Box>
);

const FieldHelper = ({ children, color = "#888", strong = false }) => (
  <Box sx={{ minHeight: 20, mt: 0.5 }}>
    {children && (
      <Typography
        variant="caption"
        sx={{
          color,
          fontWeight: strong ? 900 : 700,
          display: "block",
          lineHeight: 1.4,
        }}
      >
        {children}
      </Typography>
    )}
  </Box>
);

// ─── DaysInputField ───────────────────────────────────────────────────────────
const DaysInputField = ({
  label,
  value,
  onChange,
  color = T.accent,
  bgColor = "transparent",
  borderColor,
  helperText,
  isAutoFilled = false,
  disabled = false,
  readOnly = false,
}) => {
  const hours = daysToHours(value);
  const bc =
    borderColor || (isAutoFilled ? "rgba(46,125,50,0.5)" : `${color}30`);
  return (
    <Box>
      <TextField
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        fullWidth
        size="medium"
        disabled={disabled}
        InputProps={{
          readOnly,
          startAdornment: (
            <InputAdornment position="start">
              <CalendarIcon sx={{ color, fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Typography
                variant="caption"
                sx={{ color: "#888", fontWeight: 800, whiteSpace: "nowrap" }}
              >
                = {hours} hrs
              </Typography>
            </InputAdornment>
          ),
        }}
        inputProps={{ min: 0, step: 0.5 }}
        variant={readOnly ? "standard" : "outlined"}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            backgroundColor: isAutoFilled ? "rgba(46,125,50,0.03)" : bgColor,
            "& fieldset": {
              borderColor: bc,
              borderWidth: isAutoFilled ? 2 : 1,
            },
            "&:hover fieldset": { borderColor: color },
            "&.Mui-focused fieldset": { borderColor: color, borderWidth: 2 },
          },
          "& .MuiInputBase-input": { color, fontWeight: 800 },
          "& .MuiInputLabel-root": { color },
          "& .MuiInputLabel-root.Mui-focused": { color },
          ...(readOnly && {
            "& .MuiInputBase-input": { color: "#333", fontWeight: 800 },
          }),
        }}
      />
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            color: isAutoFilled ? "#2E7D32" : "#888",
            mt: 0.5,
            display: "block",
            fontWeight: isAutoFilled ? 800 : 600,
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

// ─── CarryForwardSummary ──────────────────────────────────────────────────────
const CarryForwardSummary = ({
  leaveCode,
  employeeAssignments,
  commutedDays,
}) => {
  if (!leaveCode || !employeeAssignments?.length) return null;
  const allRows = employeeAssignments.filter((a) => a.leave_code === leaveCode);
  if (!allRows.length) return null;
  const sorted = [...allRows].sort((a, b) => {
    const yearDiff = (b.period_year || 0) - (a.period_year || 0);
    if (yearDiff !== 0) return yearDiff;
    return semOrder(b.period_semester) - semOrder(a.period_semester);
  });
  const totalRemainingHours = sorted.reduce(
    (s, r) => s + toNum(r.remaining_hours),
    0,
  );
  const hasCommuted = toNum(commutedDays) > 0;
  const effectiveCarryDays = hasCommuted
    ? toNum(commutedDays)
    : totalRemainingHours / 8;
  const hasBalance = effectiveCarryDays > 0;
  return (
    <Box
      sx={{
        border: `1px solid ${T.accentBorder}`,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "#fafafa",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: T.accentFaint,
          borderBottom: `1px solid ${T.accentBorder}`,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
        }}
      >
        <HistoryIcon sx={{ fontSize: 16, color: T.accent }} />
        <Typography
          sx={{
            fontWeight: 900,
            color: T.accent,
            fontSize: "0.82rem",
            letterSpacing: 0.2,
          }}
        >
          Leave History — {leaveCode}
        </Typography>
        <Typography sx={{ color: "#999", fontSize: "0.75rem", ml: 0.5 }}>
          ({sorted.length} {sorted.length === 1 ? "period" : "periods"} on
          record)
        </Typography>
        {hasCommuted && (
          <Chip
            label="Has Commutation"
            size="small"
            icon={<CommutationIcon style={{ fontSize: 12 }} />}
            sx={{
              ml: "auto",
              height: 22,
              fontSize: "0.65rem",
              bgcolor: T.accentFaint,
              color: T.accent,
              fontWeight: 900,
            }}
          />
        )}
      </Box>
      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            maxHeight: 160,
            overflowY: "auto",
            pr: 1,
          }}
        >
          {sorted.map((row, idx) => {
            const remHrs = toNum(row.remaining_hours);
            const usedHrs = toNum(row.used_hours);
            const totalHrs = toNum(row.total_hours);
            const remDays = remHrs / 8;
            const usedDays = usedHrs / 8;
            const totalDays = totalHrs / 8;
            const isFullyUsed =
              totalHrs > 0 && usedHrs >= totalHrs && remHrs <= 0;
            const pct =
              totalHrs > 0 ? Math.min((usedHrs / totalHrs) * 100, 100) : 0;
            const barColor = isFullyUsed
              ? "#2E7D32"
              : getStatusColor(remHrs, totalHrs);
            const label = periodLabel(row.period_year, row.period_semester);
            const isLatest = idx === 0;
            const isCommuted =
              remHrs === 0 &&
              toNum(row.used_hours) === totalHrs &&
              hasCommuted &&
              isLatest;
            return (
              <Box
                key={row.id}
                sx={{
                  py: 0.6,
                  borderBottom:
                    idx < sorted.length - 1
                      ? "1px solid rgba(0,0,0,0.06)"
                      : "none",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: "#2c2c2c",
                        fontSize: "0.78rem",
                      }}
                    >
                      {label}
                    </Typography>
                    {isLatest && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.2,
                          borderRadius: 1,
                          bgcolor: T.accentFaint,
                          border: `1px solid ${T.accentBorder}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.62rem",
                            fontWeight: 900,
                            color: T.accent,
                            letterSpacing: 0.3,
                          }}
                        >
                          MOST RECENT
                        </Typography>
                      </Box>
                    )}
                    {isCommuted && (
                      <Chip
                        label="COMMUTED"
                        size="small"
                        icon={<CommutationIcon style={{ fontSize: 11 }} />}
                        sx={{
                          height: 20,
                          fontSize: "0.62rem",
                          bgcolor: T.accentFaint,
                          color: T.accent,
                          fontWeight: 900,
                        }}
                      />
                    )}
                  </Box>
                  {remHrs <= 0 ? (
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: barColor,
                        fontSize: "0.82rem",
                      }}
                    >
                      No balance left
                    </Typography>
                  ) : (
                    <RemainingBalance
                      hoursLike={remHrs}
                      color={barColor}
                      alignItems="flex-end"
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    position: "relative",
                    height: 6,
                    bgcolor: "rgba(0,0,0,0.07)",
                    borderRadius: 4,
                    overflow: "hidden",
                    mb: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${pct}%`,
                      bgcolor: barColor,
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography sx={{ fontSize: "0.68rem", color: "#888" }}>
                    {remHrs <= 0
                      ? isCommuted
                        ? "Commuted to carry-forward"
                        : "Fully used"
                      : `${remDays.toFixed(1)} days available`}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: "#aaa" }}>
                    {usedDays.toFixed(1)} used · {totalDays.toFixed(1)} total
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: hasBalance
            ? hasCommuted
              ? T.accentFaint
              : "rgba(46,125,50,0.04)"
            : "rgba(0,0,0,0.02)",
          borderTop: `1px solid ${hasBalance ? (hasCommuted ? T.accentBorder : "rgba(46,125,50,0.14)") : "rgba(0,0,0,0.06)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "0.82rem",
              color: hasBalance ? (hasCommuted ? T.accent : "#2E7D32") : "#888",
              mb: 0.25,
            }}
          >
            {hasBalance
              ? hasCommuted
                ? "Carried balance sourced from commutation record."
                : "Unused leave days will be carried over."
              : "No unused leave days to carry over."}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#777" }}>
            {hasBalance
              ? 'The "Carried Balance" field above is filled automatically.'
              : "The employee has used all allocated leave for previous periods."}
          </Typography>
        </Box>
        {hasBalance && (
          <Box
            sx={{
              flexShrink: 0,
              textAlign: "center",
              px: 2.5,
              py: 1,
              bgcolor: hasCommuted ? T.accentFaint : "rgba(46,125,50,0.09)",
              border: `1px solid ${hasCommuted ? T.accentBorder : "rgba(46,125,50,0.2)"}`,
              borderRadius: 2,
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: hasCommuted ? T.accent : "#2E7D32",
                fontSize: "1.5rem",
                lineHeight: 1,
              }}
            >
              {effectiveCarryDays.toFixed(1)}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.68rem",
                color: hasCommuted ? T.accentMid : "#4a9d55",
                fontWeight: 900,
                mt: 0.25,
              }}
            >
              days to carry forward
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── CommuteDialog ────────────────────────────────────────────────────────────
const CommuteDialog = ({ open, period, onClose, onConfirm, loading }) => {
  const remainingDays = toNum(period?.remaining_hours) / 8;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: 3.5,
            py: 2.5,
            background: T.modalGrad,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.04)",
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              position: "relative",
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CommutationIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: "0.95rem",
                  lineHeight: 1.2,
                }}
              >
                Commute Leave Balance
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: 500,
                }}
              >
                This action cannot be undone
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "rgba(255,255,255,0.75)",
              position: "relative",
              zIndex: 1,
              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box
          sx={{
            bgcolor: T.accentFaint,
            border: `1px solid ${T.accentBorder}`,
            borderRadius: 2,
            p: 2.5,
            mb: 2.5,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: T.accent,
              mb: 1.25,
            }}
          >
            Summary
          </Typography>
          {[
            ["Employee", period?.fullName || period?.employeeNumber],
            ["Leave Code", period?.leave_code],
            [
              "Period",
              periodLabel(period?.period_year, period?.period_semester),
            ],
            [
              "Days to Commute",
              `${remainingDays.toFixed(2)} days (${toNum(period?.remaining_hours).toFixed(2)} hrs)`,
            ],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.6,
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                "&:last-child": { borderBottom: "none", pb: 0 },
              }}
            >
              <Typography
                sx={{ fontSize: "0.73rem", color: T.faint, fontWeight: 700 }}
              >
                {label}
              </Typography>
              <Typography
                sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.text }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            You are about to commute the remaining leave balance for this
            period.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
            Once confirmed, all remaining hours will be moved to Leave
            Commutation and this assignment will be cleared.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${T.divider}`,
          bgcolor: "#f9f9f9",
          gap: 1,
        }}
      >
        <AccentButton
          onClick={onClose}
          variant="outlined"
          sx={{
            fontSize: "0.8rem",
            borderColor: T.accentBorder,
            color: T.muted,
            "&:hover": {
              bgcolor: T.accentFaint,
              borderColor: T.accent,
              color: T.accent,
            },
          }}
        >
          Cancel
        </AccentButton>
        <AccentButton
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={12} sx={{ color: "#fff" }} />
            ) : (
              <CommutationIcon sx={{ fontSize: "14px !important" }} />
            )
          }
          sx={{
            fontSize: "0.8rem",
            bgcolor: T.accent,
            color: "#fff",
            "&:hover": { bgcolor: T.accentDark },
            "&:disabled": { bgcolor: "#ccc" },
          }}
        >
          {loading ? "Processing…" : "Confirm Commutation"}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── BulkAutoAssignDialog ─────────────────────────────────────────────────────
const BulkAutoAssignDialog = ({
  open,
  onClose,
  leaveTypes,
  assignments,
  employees,
  commutationMap = {},
  onSuccess,
}) => {
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [results, setResults] = useState(null);

  const employeesWithAssignments = useMemo(() => {
    const empNums = [
      ...new Set(assignments.map((a) => a.employeeNumber?.toString())),
    ];
    return empNums.map((num) => {
      const empInfo = employees.find(
        (e) => e.employeeNumber?.toString() === num,
      );
      return {
        employeeNumber: num,
        fullName: empInfo?.fullName || num,
        sex: empInfo?.sex || empInfo?.gender || null,
      };
    });
  }, [assignments, employees]);

  const preview = useMemo(() => {
    if (!selectedLeaveTypes.length)
      return { total: 0, skipped: 0, toCreate: 0, byLeave: [] };
    let toCreate = 0;
    let toSkip = 0;
    const byLeave = selectedLeaveTypes.map((lt) => {
      const restriction = getLeaveGenderRestriction(lt);
      let eligible = employeesWithAssignments.filter((emp) =>
        isLeaveAllowedForGender(lt, emp.sex),
      );
      let skippedForThisType = 0;
      let createdForThisType = 0;
      eligible.forEach((emp) => {
        const alreadyExists = assignments.some(
          (a) =>
            a.employeeNumber?.toString() === emp.employeeNumber &&
            a.leave_code === lt.leave_code &&
            a.period_year?.toString() === targetYear.toString(),
        );
        if (alreadyExists) {
          skippedForThisType++;
        } else {
          createdForThisType++;
        }
      });
      toCreate += createdForThisType;
      toSkip += skippedForThisType;
      return {
        code: lt.leave_code,
        desc: lt.leave_description,
        restriction,
        eligible: eligible.length,
        toCreate: createdForThisType,
        toSkip: skippedForThisType,
      };
    });
    return { total: toCreate + toSkip, toCreate, skipped: toSkip, byLeave };
  }, [selectedLeaveTypes, employeesWithAssignments, assignments, targetYear]);

  const pendingCommutations = useMemo(() => {
    const seen = new Set();
    const warnings = [];
    assignments.forEach((a) => {
      if (a.period_year?.toString() === targetYear.toString()) return;
      if (toNum(a.remaining_hours) <= 0) return;
      const mapKey = `${a.employeeNumber}_${a.leave_code}`;
      if (toNum(commutationMap[mapKey]) > 0) return;
      if (seen.has(mapKey)) return;
      seen.add(mapKey);
      const totalRemainingDays =
        assignments
          .filter(
            (x) =>
              x.employeeNumber?.toString() === a.employeeNumber?.toString() &&
              x.leave_code === a.leave_code &&
              x.period_year?.toString() !== targetYear.toString(),
          )
          .reduce((s, x) => s + toNum(x.remaining_hours), 0) / 8;
      const empInfo = employees.find(
        (e) => e.employeeNumber?.toString() === a.employeeNumber?.toString(),
      );
      warnings.push({
        employeeNumber: a.employeeNumber,
        fullName: a.fullName || empInfo?.fullName || a.employeeNumber,
        leaveCode: a.leave_code,
        remainingDays: totalRemainingDays,
      });
    });
    return warnings;
  }, [assignments, commutationMap, targetYear, employees]);

  const handleRun = async () => {
    if (!selectedLeaveTypes.length) return;
    if (pendingCommutations.length > 0) return;
    setRunning(true);
    setProgress(0);
    setResults(null);
    let created = 0;
    let skipped = 0;
    let errors = 0;
    const total = preview.toCreate;
    for (let ltIdx = 0; ltIdx < selectedLeaveTypes.length; ltIdx++) {
      const lt = selectedLeaveTypes[ltIdx];
      const eligible = employeesWithAssignments.filter((emp) =>
        isLeaveAllowedForGender(lt, emp.sex),
      );
      for (let eIdx = 0; eIdx < eligible.length; eIdx++) {
        const emp = eligible[eIdx];
        const alreadyExists = assignments.some(
          (a) =>
            a.employeeNumber?.toString() === emp.employeeNumber &&
            a.leave_code === lt.leave_code &&
            a.period_year?.toString() === targetYear.toString(),
        );
        if (alreadyExists) {
          skipped++;
          continue;
        }
        setProgressMsg(`Creating ${lt.leave_code} for ${emp.fullName}…`);
        try {
          const mapKey = `${emp.employeeNumber}_${lt.leave_code}`;
          const commutedDays = toNum(commutationMap[mapKey]);
          let carriedForwardHours = 0;
          if (commutedDays > 0) {
            carriedForwardHours = commutedDays * 8;
          } else {
            const prevAssignments = assignments.filter(
              (a) =>
                a.employeeNumber?.toString() === emp.employeeNumber &&
                a.leave_code === lt.leave_code,
            );
            carriedForwardHours = prevAssignments.reduce(
              (s, a) => s + toNum(a.remaining_hours),
              0,
            );
          }
          await axios.post(
            `${API_BASE_URL}/leaveRoute/leave_assignment`,
            {
              leave_code: lt.leave_code,
              employeeNumber: emp.employeeNumber,
              total_hours: 0,
              carried_forward_hours: carriedForwardHours,
              allocated_hours: 0,
              period_year: parseInt(targetYear, 10),
              period_semester: null,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
          created++;
        } catch {
          errors++;
        }
        const done = created + errors;
        setProgress(total > 0 ? Math.round((done / total) * 100) : 100);
      }
    }
    setRunning(false);
    setProgress(100);
    setProgressMsg("");
    setResults({ created, skipped, errors });
    onSuccess?.();
  };

  const handleClose = () => {
    if (running) return;
    setResults(null);
    setProgress(0);
    setProgressMsg("");
    setSelectedLeaveTypes([]);
    onClose();
  };
  const toggleLeaveType = (lt) =>
    setSelectedLeaveTypes((prev) =>
      prev.find((x) => x.leave_code === lt.leave_code)
        ? prev.filter((x) => x.leave_code !== lt.leave_code)
        : [...prev, lt],
    );
  const selectAll = () => setSelectedLeaveTypes([...leaveTypes]);
  const clearAll = () => setSelectedLeaveTypes([]);
  const yearOptions = [];
  for (
    let y = new Date().getFullYear() - 2;
    y <= new Date().getFullYear() + 5;
    y++
  )
    yearOptions.push(y);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: "90vh", overflow: "hidden" },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: 3.5,
            py: 2.5,
            background: T.modalGrad,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.04)",
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              position: "relative",
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AutoAssignIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: "0.95rem",
                  lineHeight: 1.2,
                }}
              >
                Reset to Default (Existing Only)
              </Typography>
              <Typography
                sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}
              >
                Auto-create assignments for all{" "}
                {employeesWithAssignments.length} employees with records
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={running}
            size="small"
            sx={{
              color: "rgba(255,255,255,0.75)",
              position: "relative",
              zIndex: 1,
              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3, overflowY: "auto" }}>
        {results ? (
          <Box>
            <Alert
              severity={results.errors > 0 ? "warning" : "success"}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                Bulk Assignment Complete
              </Typography>
              <Typography variant="body2">
                Created: <strong>{results.created}</strong> · Skipped:{" "}
                <strong>{results.skipped}</strong>
                {results.errors > 0 ? ` · Errors: ${results.errors}` : ""}
              </Typography>
            </Alert>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                New credits were set to <strong>0 days</strong> as default.
                Carried balance was <strong>auto-filled</strong> from each
                employee's commutation record or prior remaining balance.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: T.accent,
                  mb: 1.5,
                  fontSize: "0.85rem",
                }}
              >
                1. Select Target Period Year
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  disabled={running}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: T.accentBorder,
                    },
                  }}
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}{" "}
                      {y === new Date().getFullYear()
                        ? "(Current)"
                        : y === new Date().getFullYear() + 1
                          ? "(Next Year)"
                          : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{ fontWeight: 800, color: T.accent, fontSize: "0.85rem" }}
                >
                  2. Select Leave Types to Auto-Assign
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    onClick={selectAll}
                    disabled={running}
                    sx={{
                      color: T.accent,
                      fontWeight: 800,
                      fontSize: "0.72rem",
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={clearAll}
                    disabled={running}
                    sx={{ color: "#888", fontWeight: 800, fontSize: "0.72rem" }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
              {(() => {
                const noGenderCount = employeesWithAssignments.filter(
                  (e) => !e.sex,
                ).length;
                const hasGenderRestricted = leaveTypes.some((lt) =>
                  getLeaveGenderRestriction(lt),
                );
                return noGenderCount > 0 && hasGenderRestricted ? (
                  <Alert
                    severity="warning"
                    sx={{ mb: 2, borderRadius: 2, py: 0.5 }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      <strong>
                        {noGenderCount} employee{noGenderCount > 1 ? "s" : ""}
                      </strong>{" "}
                      have no gender recorded. Gender-restricted leave types
                      will be <strong>skipped</strong>.
                    </Typography>
                  </Alert>
                ) : null;
              })()}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {leaveTypes.map((lt) => {
                  const isSelected = !!selectedLeaveTypes.find(
                    (x) => x.leave_code === lt.leave_code,
                  );
                  const restriction = getLeaveGenderRestriction(lt);
                  return (
                    <Tooltip
                      key={lt.leave_code}
                      title={
                        restriction
                          ? `${restriction === "male" ? "Male only" : "Female only"} — will only assign to eligible gender`
                          : "All genders"
                      }
                    >
                      <Chip
                        label={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            {restriction === "male" && (
                              <MaleIcon
                                sx={{
                                  fontSize: 13,
                                  color: isSelected ? "#fff" : "#1565C0",
                                }}
                              />
                            )}
                            {restriction === "female" && (
                              <FemaleIcon
                                sx={{
                                  fontSize: 13,
                                  color: isSelected ? "#fff" : "#C2185B",
                                }}
                              />
                            )}
                            {lt.leave_code}
                          </Box>
                        }
                        onClick={() => !running && toggleLeaveType(lt)}
                        sx={{
                          cursor: running ? "not-allowed" : "pointer",
                          bgcolor: isSelected ? T.accent : T.accentFaint,
                          color: isSelected ? "#fff" : T.accent,
                          fontWeight: 900,
                          border: `1px solid ${isSelected ? T.accent : T.accentBorder}`,
                          "&:hover": {
                            bgcolor: isSelected ? T.accentDark : T.accentHover,
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
            {pendingCommutations.length > 0 && (
              <Box
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  border: "1.5px solid #e65100",
                  bgcolor: "rgba(230,81,0,0.04)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: "rgba(230,81,0,0.1)",
                    borderBottom: "1px solid rgba(230,81,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                  }}
                >
                  <WarningIcon sx={{ fontSize: 18, color: "#e65100" }} />
                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: "#e65100",
                      fontSize: "0.85rem",
                    }}
                  >
                    Action required — {pendingCommutations.length} pending
                    commutation{pendingCommutations.length > 1 ? "s" : ""} must
                    be resolved first
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#bf360c",
                      fontWeight: 700,
                      display: "block",
                      mb: 1.25,
                    }}
                  >
                    The employees below still have{" "}
                    <strong>remaining leave hours from prior periods</strong>{" "}
                    not transferred to Leave Commutation.
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 180,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {pendingCommutations.map((w, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 0.6,
                          px: 1.5,
                          borderRadius: 1,
                          bgcolor: "rgba(230,81,0,0.06)",
                          border: "1px solid rgba(230,81,0,0.14)",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.8rem",
                              fontWeight: 800,
                              color: "#bf360c",
                            }}
                          >
                            {w.fullName}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              color: "#999",
                              fontWeight: 600,
                            }}
                          >
                            #{w.employeeNumber}
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Chip
                            label={w.leaveCode}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              bgcolor: "rgba(230,81,0,0.12)",
                              color: "#e65100",
                              fontWeight: 900,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              color: "#e65100",
                            }}
                          >
                            {w.remainingDays.toFixed(1)}d untransferred
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
            {selectedLeaveTypes.length > 0 && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: T.accent,
                    mb: 1.5,
                    fontSize: "0.82rem",
                  }}
                >
                  Preview
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 3, mb: 1.5, flexWrap: "wrap" }}
                >
                  {[
                    [`${employeesWithAssignments.length}`, "Total Employees"],
                    [`${preview.toCreate}`, "Will Create"],
                    [`${preview.skipped}`, "Already Exists (Skip)"],
                  ].map(([val, label]) => (
                    <Box key={label} sx={{ textAlign: "center" }}>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: "1.3rem",
                          color: T.accent,
                          lineHeight: 1,
                        }}
                      >
                        {val}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          color: "#888",
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ maxHeight: 160, overflowY: "auto" }}>
                  {preview.byLeave.map((bl) => (
                    <Box
                      key={bl.code}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 0.4,
                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {bl.restriction === "male" && (
                          <MaleIcon sx={{ fontSize: 14, color: "#1565C0" }} />
                        )}
                        {bl.restriction === "female" && (
                          <FemaleIcon sx={{ fontSize: 14, color: "#C2185B" }} />
                        )}
                        {!bl.restriction && (
                          <GenderIcon sx={{ fontSize: 14, color: "#888" }} />
                        )}
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "#333",
                          }}
                        >
                          {bl.code} — {bl.desc}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Chip
                          label={`${bl.toCreate} new`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.62rem",
                            bgcolor: "rgba(46,125,50,0.1)",
                            color: "#2e7d32",
                            fontWeight: 900,
                          }}
                        />
                        {bl.toSkip > 0 && (
                          <Chip
                            label={`${bl.toSkip} skip`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              bgcolor: "rgba(0,0,0,0.05)",
                              color: "#888",
                              fontWeight: 900,
                            }}
                          />
                        )}
                        {bl.restriction && (
                          <Chip
                            label={`${bl.eligible} eligible`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              bgcolor:
                                bl.restriction === "male"
                                  ? "rgba(21,101,192,0.1)"
                                  : "rgba(194,24,91,0.1)",
                              color:
                                bl.restriction === "male"
                                  ? "#1565C0"
                                  : "#C2185B",
                              fontWeight: 900,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Alert
                  severity="info"
                  sx={{ mt: 1.5, py: 0.5, borderRadius: 1.5 }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    New credits default to <strong>0 days</strong>. Carried
                    balance will be <strong>auto-filled</strong> from
                    commutation or previous balance.
                  </Typography>
                </Alert>
              </Box>
            )}
            {running && (
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: T.accent,
                      fontWeight: 700,
                    }}
                  >
                    {progressMsg}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.75rem", color: "#888", fontWeight: 700 }}
                  >
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    borderRadius: 2,
                    height: 8,
                    bgcolor: T.accentFaint,
                    "& .MuiLinearProgress-bar": { bgcolor: T.accent },
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          borderTop: `1px solid ${T.divider}`,
          bgcolor: "#f9f9f9",
        }}
      >
        {results ? (
          <AccentButton
            onClick={handleClose}
            variant="contained"
            sx={{
              fontSize: "0.8rem",
              bgcolor: T.accent,
              color: "#fff",
              "&:hover": { bgcolor: T.accentDark },
            }}
          >
            Done
          </AccentButton>
        ) : (
          <>
            <AccentButton
              onClick={handleClose}
              disabled={running}
              variant="outlined"
              sx={{
                fontSize: "0.8rem",
                borderColor: T.accentBorder,
                color: T.muted,
                "&:hover": {
                  bgcolor: T.accentFaint,
                  borderColor: T.accent,
                  color: T.accent,
                },
              }}
            >
              Cancel
            </AccentButton>
            <AccentButton
              onClick={handleRun}
              disabled={
                running ||
                !selectedLeaveTypes.length ||
                preview.toCreate === 0 ||
                pendingCommutations.length > 0
              }
              variant="contained"
              startIcon={
                running ? (
                  <CircularProgress size={12} sx={{ color: "#fff" }} />
                ) : (
                  <RunIcon sx={{ fontSize: "14px !important" }} />
                )
              }
              sx={{
                fontSize: "0.8rem",
                bgcolor: T.accent,
                color: "#fff",
                "&:hover": { bgcolor: T.accentDark },
                "&:disabled": { bgcolor: "#ccc", color: "#666" },
              }}
            >
              {running
                ? `Running… (${progress}%)`
                : pendingCommutations.length > 0
                  ? `Resolve ${pendingCommutations.length} pending first`
                  : `Run Auto-Assign (${preview.toCreate} records)`}
            </AccentButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LeaveAssignment = () => {
  const { hasAccess, loading: accessLoading } =
    usePageAccess("leave-assignment");

  const [assignments, setAssignments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newAssignment, setNewAssignment] = useState({
    leave_code: "",
    employeeNumber: "",
    total_hours: "",
    carried_forward_days: "0",
    allocated_days: "",
    period_year: new Date().getFullYear().toString(),
  });
  const [editAssignment, setEditAssignment] = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error, setError] = useState("");
  const [isCarryForwardAutoSuggested, setIsCarryForwardAutoSuggested] =
    useState(false);
  const [employeeLeavesModalOpen, setEmployeeLeavesModalOpen] = useState(false);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState(null);
  const [selectedLeaveTypeInModal, setSelectedLeaveTypeInModal] =
    useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState([]);
  const [editCarriedDays, setEditCarriedDays] = useState("0");
  const [editAllocatedDays, setEditAllocatedDays] = useState("0");
  const [commuteDialogOpen, setCommuteDialogOpen] = useState(false);
  const [commutePeriod, setCommutePeriod] = useState(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteSuccess, setCommuteSuccess] = useState("");
  const [commutationMap, setCommutationMap] = useState({});
  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsRowsPerPage, setRecordsRowsPerPage] = useState(12);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchAssignments(),
        fetchLeaveTypes(),
        fetchEmployees(),
        fetchAllCommutations(),
      ]);
      setPageLoading(false);
    };
    init();
  }, []);
  useEffect(() => {
    setRecordsPage(0);
  }, [searchTerm]);

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.map((e) => {
      const name = (
        e?.fullName || `${e?.firstName || ""} ${e?.lastName || ""}`.trim()
      ).trim();
      const empNo = (e?.employeeNumber || "").toString().trim();
      return { ...e, _searchKey: `${name} ${empNo}`.toLowerCase() };
    });
  }, [employees]);

  const selectedEmployeeGender = useMemo(() => {
    if (!selectedEmployee) return null;
    return selectedEmployee.sex || selectedEmployee.gender || null;
  }, [selectedEmployee]);
  const filteredLeaveTypesForNew = useMemo(() => {
    if (!leaveTypes.length) return leaveTypes;
    return leaveTypes.filter((lt) =>
      isLeaveAllowedForGender(lt, selectedEmployeeGender),
    );
  }, [leaveTypes, selectedEmployeeGender]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber || !newAssignment.leave_code) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: "0" }));
      return;
    }
    const empNum = selectedEmployee.employeeNumber?.toString();
    const lc = newAssignment.leave_code;
    const mapKey = `${empNum}_${lc}`;
    const empAssignments = assignments.filter(
      (a) => a.employeeNumber?.toString() === empNum,
    );
    setEmployeeAssignments(empAssignments);
    const leaveRows = empAssignments.filter((a) => a.leave_code === lc);
    if (!leaveRows.length) {
      setIsCarryForwardAutoSuggested(false);
      setNewAssignment((prev) => ({ ...prev, carried_forward_days: "0" }));
      return;
    }
    const commutedDays = toNum(commutationMap[mapKey]);
    if (commutedDays > 0) {
      setNewAssignment((prev) => ({
        ...prev,
        carried_forward_days: commutedDays.toString(),
      }));
      setIsCarryForwardAutoSuggested(true);
    } else {
      const totalRemainingDays =
        leaveRows.reduce((s, r) => s + toNum(r.remaining_hours), 0) / 8;
      setNewAssignment((prev) => ({
        ...prev,
        carried_forward_days: totalRemainingDays.toString(),
      }));
      setIsCarryForwardAutoSuggested(totalRemainingDays > 0);
    }
  }, [selectedEmployee, newAssignment.leave_code, assignments, commutationMap]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) {
      setEmployeeAssignments([]);
      return;
    }
    setEmployeeAssignments(
      assignments.filter(
        (a) =>
          a.employeeNumber?.toString() ===
          selectedEmployee.employeeNumber?.toString(),
      ),
    );
  }, [selectedEmployee, assignments]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
      );
      setAssignments(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch {
      setAssignments([]);
      setError("Failed to fetch assignments");
    }
  };
  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`);
      setLeaveTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLeaveTypes([]);
    }
  };
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setEmployees([]);
        return;
      }
      const [usersRes, personalRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/personalinfo/person_table`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      let usersData = [];
      if (usersRes.status === "fulfilled") {
        const d = usersRes.value.data;
        if (Array.isArray(d)) usersData = d;
        else if (d?.users) usersData = d.users;
        else if (d?.data) usersData = d.data;
      }
      const sexMap = {};
      if (personalRes.status === "fulfilled") {
        const pd = personalRes.value.data;
        const personalList = Array.isArray(pd)
          ? pd
          : pd?.data || pd?.personalInfo || [];
        personalList.forEach((p) => {
          const empNum =
            p.agencyEmployeeNum?.toString() ||
            p.employeeNumber?.toString() ||
            p.employee_number?.toString();
          const sex = p.sex || p.gender || p.Sex || p.Gender;
          if (empNum && sex) sexMap[empNum] = sex;
        });
      }
      setEmployees(
        usersData.map((u) => {
          const empNum =
            u.employeeNumber?.toString() || u.employee_number?.toString();
          return {
            ...u,
            sex: (empNum ? sexMap[empNum] : null) || u.sex || u.gender || null,
          };
        }),
      );
    } catch {
      setEmployees([]);
    }
  };
  const fetchAllCommutations = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/commutationRoute/leave_commutation`,
      );
      const records = Array.isArray(res.data) ? res.data : [];
      const map = {};
      records
        .filter((r) => r.status === 0 || r.status === 1)
        .forEach((r) => {
          const key = `${r.employeeNumber}_${r.leave_code}`;
          map[key] = (map[key] || 0) + toNum(r.commuted_days);
        });
      setCommutationMap(map);
    } catch {
      /* non-fatal */
    }
  };

  const openCommuteDialog = (period) => {
    setCommutePeriod(period);
    setCommuteDialogOpen(true);
    setCommuteSuccess("");
  };
  const handleCommute = async () => {
    if (!commutePeriod) return;
    setCommuteLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/commutationRoute/leave_commutation/commute/${commutePeriod.id}`,
        { commuted_by: token ? "admin" : null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCommuteDialogOpen(false);
      setCommuteLoading(false);
      setCommuteSuccess(
        `Successfully commuted ${(toNum(commutePeriod.remaining_hours) / 8).toFixed(2)} days.`,
      );
      await fetchAssignments();
      await fetchAllCommutations();
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(
          `${API_BASE_URL}/leaveRoute/leave_assignment`,
        );
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter(
          (a) =>
            a.employeeNumber?.toString() ===
            selectedEmployeeLeaves.employeeNumber?.toString(),
        );
        const grouped = empData.reduce((acc, a) => {
          if (!acc[a.leave_code])
            acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
          acc[a.leave_code].periods.push(a);
          return acc;
        }, {});
        setSelectedEmployeeLeaves((prev) => ({
          ...prev,
          leaveTypes: Object.values(grouped),
        }));
        if (selectedLeaveTypeInModal) {
          const refreshedLT = grouped[selectedLeaveTypeInModal.leave_code];
          if (refreshedLT) setSelectedLeaveTypeInModal(refreshedLT);
        }
      }
      if (editAssignment)
        setEditAssignment((prev) => ({
          ...prev,
          remaining_hours: 0,
          used_hours: prev.total_hours,
        }));
      setTimeout(() => setCommuteSuccess(""), 4000);
    } catch (e) {
      setCommuteLoading(false);
      setError("Commutation failed: " + (e.response?.data?.error || e.message));
    }
  };

  const isDuplicateAssignment = (
    employeeNumber,
    leaveCode,
    periodYear,
    excludeId = null,
  ) => {
    if (!employeeNumber || !leaveCode) return false;
    const emp = employeeNumber?.toString();
    const py =
      periodYear !== undefined && periodYear !== null
        ? periodYear?.toString()
        : new Date().getFullYear().toString();
    return assignments.some((a) => {
      if (excludeId && String(a.id) === String(excludeId)) return false;
      return (
        a.employeeNumber?.toString() === emp &&
        a.leave_code === leaveCode &&
        a.period_year?.toString() === py
      );
    });
  };

  const handleAdd = async () => {
    const employeeNumber = selectedEmployee?.employeeNumber?.toString().trim();
    const leaveCode = newAssignment.leave_code;
    const carriedHours = daysToHours(newAssignment.carried_forward_days);
    const allocatedHours = daysToHours(newAssignment.allocated_days);
    if (!employeeNumber || !leaveCode) {
      setError("Please select an employee and leave type");
      return;
    }
    if (!allocatedHours || allocatedHours <= 0) {
      setError("Please enter valid allocation days (must be greater than 0)");
      return;
    }
    if (
      isDuplicateAssignment(
        employeeNumber,
        leaveCode,
        newAssignment.period_year,
      )
    ) {
      setError(
        "This employee already has an assignment for this leave type and period",
      );
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
        {
          leave_code: leaveCode,
          employeeNumber,
          total_hours: allocatedHours,
          carried_forward_hours: carriedHours,
          allocated_hours: allocatedHours,
          period_year:
            parseInt(newAssignment.period_year, 10) || new Date().getFullYear(),
          period_semester: null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setSelectedEmployee(null);
      setNewAssignment({
        leave_code: "",
        employeeNumber: "",
        total_hours: "",
        carried_forward_days: "0",
        allocated_days: "",
        period_year: new Date().getFullYear().toString(),
      });
      setIsCarryForwardAutoSuggested(false);
      await fetchAssignments();
      await fetchAllCommutations();
      setTimeout(() => {
        setLoading(false);
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 250);
    } catch (error) {
      setError(
        "Error adding assignment: " +
          (error.response?.data?.error || error.message),
      );
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const assignmentId = editAssignment?.id;
    const employeeNumber = editAssignment?.employeeNumber?.toString().trim();
    const leaveCode = editAssignment?.leave_code;
    const carriedHours = daysToHours(editCarriedDays);
    const allocatedHours = daysToHours(editAllocatedDays);
    const usedHours = toNum(editAssignment.used_hours);
    const remainingHours = Math.max(0, allocatedHours - usedHours);
    if (!assignmentId) {
      setError("Error: Assignment ID is missing.");
      return;
    }
    if (!employeeNumber || !leaveCode) {
      setError("Please fill in all required fields");
      return;
    }
    if (
      isDuplicateAssignment(
        employeeNumber,
        leaveCode,
        editAssignment.period_year,
        editAssignment.id,
      )
    ) {
      setError(
        "This employee already has an assignment for this leave type and period",
      );
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_assignment/${assignmentId}`,
        {
          leave_code: leaveCode,
          employeeNumber,
          total_hours: allocatedHours,
          remaining_hours: remainingHours,
          carried_forward_hours: carriedHours,
          allocated_hours: allocatedHours,
          period_year:
            parseInt(editAssignment.period_year, 10) ||
            new Date().getFullYear(),
          period_semester: null,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError("");
      await fetchAssignments();
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(
          `${API_BASE_URL}/leaveRoute/leave_assignment`,
        );
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter(
          (a) =>
            a.employeeNumber?.toString() ===
            selectedEmployeeLeaves.employeeNumber?.toString(),
        );
        const grouped = empData.reduce((acc, a) => {
          if (!acc[a.leave_code])
            acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
          acc[a.leave_code].periods.push(a);
          return acc;
        }, {});
        setSelectedEmployeeLeaves((prev) => ({
          ...prev,
          leaveTypes: Object.values(grouped),
        }));
        if (selectedLeaveTypeInModal) {
          const refreshedLT = grouped[selectedLeaveTypeInModal.leave_code];
          if (refreshedLT) setSelectedLeaveTypeInModal(refreshedLT);
        }
      }
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 500);
    } catch (error) {
      setError(
        "Error updating assignment: " +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?"))
      return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setEditAssignment(null);
      setOriginalAssignment(null);
      setIsEditing(false);
      setError("");
      setEmployeeLeavesModalOpen(false);
      setSelectedEmployeeLeaves(null);
      setSelectedLeaveTypeInModal(null);
      await fetchAssignments();
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 1000);
    } catch (error) {
      setError(
        "Error deleting assignment: " +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment });
    setOriginalAssignment({ ...assignment });
    setEditCarriedDays(hoursToDays(assignment.carried_forward_hours));
    setEditAllocatedDays(hoursToDays(assignment.allocated_hours));
    setIsEditing(false);
    setError("");
  };
  const handleCancelEdit = () => {
    setEditAssignment({ ...originalAssignment });
    setEditCarriedDays(hoursToDays(originalAssignment.carried_forward_hours));
    setEditAllocatedDays(hoursToDays(originalAssignment.allocated_hours));
    setIsEditing(false);
    setError("");
  };
  const handleCloseModal = () => {
    setEditAssignment(null);
    setOriginalAssignment(null);
    setIsEditing(false);
    setError("");
    setEmployeeLeavesModalOpen(false);
    setSelectedEmployeeLeaves(null);
    setSelectedLeaveTypeInModal(null);
  };

  const filteredAssignments = assignments.filter((a) => {
    const search = searchTerm.toLowerCase();
    return (
      (a.fullName?.toLowerCase() || "").includes(search) ||
      (a.employeeNumber?.toString().toLowerCase() || "").includes(search) ||
      (a.leave_code?.toString().toLowerCase() || "").includes(search)
    );
  });
  const getEmployeeInfo = (empNum) =>
    employees.find(
      (e) => e.employeeNumber?.toString() === empNum?.toString(),
    ) || { fullName: empNum || "Unknown" };

  const groupedByEmployee = filteredAssignments.reduce((acc, a) => {
    const empNum = a.employeeNumber?.toString() || "Unknown";
    if (!acc[empNum]) {
      const info = getEmployeeInfo(empNum);
      acc[empNum] = {
        employeeNumber: empNum,
        fullName: info.fullName || empNum,
        firstName: info.firstName,
        lastName: info.lastName,
        leaveTypes: {},
      };
    }
    const lc = a.leave_code;
    if (!acc[empNum].leaveTypes[lc])
      acc[empNum].leaveTypes[lc] = { leave_code: lc, periods: [] };
    acc[empNum].leaveTypes[lc].periods.push(a);
    return acc;
  }, {});

  const employeeGroups = Object.values(groupedByEmployee)
    .map((emp) => ({ ...emp, leaveTypes: Object.values(emp.leaveTypes) }))
    .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  const paginatedEmployeeGroups = useMemo(() => {
    const start = recordsPage * recordsRowsPerPage;
    return employeeGroups.slice(start, start + recordsRowsPerPage);
  }, [employeeGroups, recordsPage, recordsRowsPerPage]);

  const selectedLeaveAssignments = newAssignment.leave_code
    ? employeeAssignments.filter(
        (a) => a.leave_code === newAssignment.leave_code,
      )
    : [];
  const mapKey = selectedEmployee
    ? `${selectedEmployee.employeeNumber}_${newAssignment.leave_code}`
    : "";
  const commutedDaysForNew = toNum(commutationMap[mapKey]);
  const carriedHoursNew = daysToHours(newAssignment.carried_forward_days);
  const allocatedHoursNew = daysToHours(newAssignment.allocated_days);
  const totalHoursNew = allocatedHoursNew;
  const totalDaysNew = totalHoursNew / 8;
  const canCommute = (period) => toNum(period?.remaining_hours) > 0;
  const selectedLeaveTypeObj = leaveTypes.find(
    (lt) => lt.leave_code === newAssignment.leave_code,
  );
  const leaveGenderRestriction = selectedLeaveTypeObj
    ? getLeaveGenderRestriction(selectedLeaveTypeObj)
    : null;
  const genderMismatch =
    leaveGenderRestriction &&
    selectedEmployeeGender &&
    !isLeaveAllowedForGender(selectedLeaveTypeObj, selectedEmployeeGender);

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderColor: T.accentBorder },
      "&:hover fieldset": { borderColor: T.accent },
      "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 2 },
    },
  };

  if (accessLoading) return <Wireframe />;
  if (!hasAccess) return <AccessDenied />;
  if (pageLoading) return <Wireframe />;

  return (
    <Fade in timeout={400}>
      <Box>
        <Box
          sx={{
            py: { xs: 1, md: 2 },
            mt: { xs: 0, md: -2 },
            mb: { xs: 1, md: 2 },
            width: "100vw",
            maxWidth: "100%",
            position: "relative",
            left: "63%",
            transform: "translateX(-61%)",
            px: { xs: 2, sm: 3, md: 6 },
          }}
        >
          <LoadingOverlay
            open={loading}
            message="Processing leave assignment..."
          />
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
          />
          <CommuteDialog
            open={commuteDialogOpen}
            period={commutePeriod}
            onClose={() => setCommuteDialogOpen(false)}
            onConfirm={handleCommute}
            loading={commuteLoading}
          />
          <BulkAutoAssignDialog
            open={bulkAssignOpen}
            onClose={() => setBulkAssignOpen(false)}
            leaveTypes={leaveTypes}
            assignments={assignments}
            employees={employees}
            commutationMap={commutationMap}
            onSuccess={async () => {
              await fetchAssignments();
            }}
          />

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
            <Box
              sx={{
                px: 4,
                py: 4,
                background: T.headerGrad,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${alpha(T.accent, 0.1)} 0%, transparent 70%)`,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: -30,
                  left: "30%",
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${alpha(T.accent, 0.07)} 0%, transparent 70%)`,
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <EventNote sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color: T.accent,
                      lineHeight: 1.2,
                      mb: 0.3,
                    }}
                  >
                    Leave Assignment Management
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      color: T.accentMid,
                      fontWeight: 700,
                      opacity: 0.9,
                    }}
                  >
                    Administrative Panel · Assign leave types and manage leave
                    credits
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 0.75,
                    borderRadius: 6,
                    bgcolor: alpha(T.accent, 0.1),
                    border: `1px solid ${alpha(T.accent, 0.2)}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: T.accent,
                      fontWeight: 700,
                    }}
                  >
                    {assignments.length}{" "}
                    {assignments.length === 1 ? "assignment" : "assignments"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Add Assignment ── */}
          <SectionCard sx={{ mb: 2 }}>
            <Box
              sx={{
                px: 3.5,
                py: 1.5,
                borderBottom: `1px solid ${T.divider}`,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                bgcolor: T.accentFaint,
              }}
            >
              <AddIcon sx={{ fontSize: 15, color: T.accent }} />
              <Typography
                sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}
              >
                Assign Leave to Employee
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
                <Box component="span" sx={{ color: "#c62828" }}>
                  *
                </Box>{" "}
                required fields
              </Typography>
            </Box>
            <Box sx={{ px: 3, py: 1 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              {commuteSuccess && (
                <Alert
                  severity="success"
                  icon={<CheckIcon />}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  {commuteSuccess}
                </Alert>
              )}
              {genderMismatch && (
                <Alert
                  severity="warning"
                  icon={<WarningIcon />}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Gender mismatch:{" "}
                    <strong>{selectedLeaveTypeObj?.leave_description}</strong>{" "}
                    is restricted to <strong>{leaveGenderRestriction}</strong>{" "}
                    employees.
                  </Typography>
                </Alert>
              )}
              <Grid container spacing={1.5} alignItems="flex-end">
                {/* Employee Select */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: "flex", flexDirection: "column", }}>
                    <FieldLabel>Select Employee *</FieldLabel>
                    <Autocomplete
                      value={selectedEmployee}
                      onChange={(e, v) => {
                        setSelectedEmployee(v);
                        setError("");
                        setNewAssignment((prev) => ({
                          ...prev,
                          leave_code: "",
                          carried_forward_days: "0",
                          total_hours: "",
                          allocated_days: "",
                        }));
                      }}
                      options={employeeOptions}
                      autoHighlight
                      limitTags={1}
                      getOptionLabel={(o) =>
                        `${o.fullName || `${o.firstName || ""} ${o.lastName || ""}`.trim()} (${o.employeeNumber})`
                      }
                      filterOptions={(options, { inputValue }) => {
                        const s = inputValue.toLowerCase().trim();
                        return options
                          .filter((o) => (o._searchKey || "").includes(s))
                          .slice(0, 80);
                      }}
                      isOptionEqualToValue={(o, v) =>
                        o.employeeNumber === v.employeeNumber
                      }
                      noOptionsText="No employees found"
                      renderOption={(props, option) => {
                        const { key, ...rest } = props;
                        const name =
                          option.fullName ||
                          `${option.firstName || ""} ${option.lastName || ""}`.trim();
                        const initials =
                          `${option.firstName?.[0] || ""}${option.lastName?.[0] || ""}`.toUpperCase() ||
                          "?";
                        return (
                          <li key={key} {...rest}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: T.accent,
                                  fontSize: "0.8rem",
                                }}
                              >
                                {initials}
                              </Avatar>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 700 }}
                                >
                                  {name}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "#888", fontWeight: 600 }}
                                  >
                                    {option.employeeNumber}
                                  </Typography>
                                  {(option.sex || option.gender) && (
                                    <GenderBadge
                                      gender={option.sex || option.gender}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </li>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Type employee name or number..."
                          size="medium"
                          sx={inputSx}
                        />
                      )}
                      sx={{ width: "100%" }}
                    />
                    <Box sx={{ minHeight: 24, mt: 0.75 }}>
                      {selectedEmployee && selectedEmployeeGender && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: "#888", fontWeight: 700 }}
                          >
                            Gender:
                          </Typography>
                          <GenderBadge gender={selectedEmployeeGender} />
                          <Typography
                            variant="caption"
                            sx={{ color: "#aaa", fontWeight: 600 }}
                          >
                            {filteredLeaveTypesForNew.length < leaveTypes.length
                              ? `(${leaveTypes.length - filteredLeaveTypesForNew.length} type(s) hidden)`
                              : "(all types available)"}
                          </Typography>
                        </Box>
                      )}
                      {selectedEmployee && !selectedEmployeeGender && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <WarningIcon
                            sx={{ fontSize: 14, color: "#e65100" }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ color: "#e65100", fontWeight: 700 }}
                          >
                            No gender on file — gender-restricted types hidden.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>
                {/* Leave Type */}
                <Grid item xs={12} md={5}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <FieldLabel
                      endAdornment={
                        selectedEmployee && selectedEmployeeGender ? (
                          <Tooltip
                            title={`Showing gender-appropriate types for ${selectedEmployeeGender}`}
                          >
                            <GenderIcon
                              sx={{
                                fontSize: 15,
                                color: "#aaa",
                                cursor: "help",
                              }}
                            />
                          </Tooltip>
                        ) : null
                      }
                    >
                      Leave Type *
                    </FieldLabel>
                    <FormControl>
                      <Select
                        value={newAssignment.leave_code || ""}
                        displayEmpty
                        size="medium"
                        onChange={(e) => {
                          setNewAssignment((prev) => ({
                            ...prev,
                            leave_code: e.target.value,
                          }));
                          setError("");
                        }}
                        sx={{
                          borderRadius: 2,
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: T.accentBorder,
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: T.accent,
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: T.accent,
                            borderWidth: 2,
                          },
                        }}
                      >
                        <MenuItem value="">
                          <em>Choose a leave type...</em>
                        </MenuItem>
                        {filteredLeaveTypesForNew.map((type) => {
                          const restriction = getLeaveGenderRestriction(type);
                          return (
                            <MenuItem
                              key={type.id || type.leave_code}
                              value={type.leave_code}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 900 }}
                                >
                                  {getLeaveLabel(type.leave_code, leaveTypes)}
                                </Typography>
                                {restriction === "male" && (
                                  <MaleIcon
                                    sx={{
                                      fontSize: 16,
                                      color: "#1565C0",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                {restriction === "female" && (
                                  <FemaleIcon
                                    sx={{
                                      fontSize: 16,
                                      color: "#C2185B",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <Box
                      sx={{
                        minHeight: 24,
                        mt: 0.75,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {leaveGenderRestriction && newAssignment.leave_code && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {leaveGenderRestriction === "male" ? (
                            <MaleIcon sx={{ fontSize: 13, color: "#1565C0" }} />
                          ) : (
                            <FemaleIcon
                              sx={{ fontSize: 13, color: "#C2185B" }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              color:
                                leaveGenderRestriction === "male"
                                  ? "#1565C0"
                                  : "#C2185B",
                            }}
                          >
                            {leaveGenderRestriction === "male"
                              ? "Male employees only"
                              : "Female employees only"}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>
                {/* Carry-Over */}
                <Grid item xs={12} md={3}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <FieldLabel
                      endAdornment={
                        <Chip
                          label={
                            commutedDaysForNew > 0
                              ? "From Commutation"
                              : "From History"
                          }
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.62rem",
                            bgcolor:
                              commutedDaysForNew > 0
                                ? T.accentFaint
                                : "rgba(46,125,50,0.1)",
                            color:
                              commutedDaysForNew > 0 ? T.accent : "#2E7D32",
                            fontWeight: 900,
                          }}
                        />
                      }
                    >
                      Carry-Over
                    </FieldLabel>
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: `1px solid ${commutedDaysForNew > 0 ? T.accentBorder : "rgba(46,125,50,0.3)"}`,
                        bgcolor:
                          commutedDaysForNew > 0
                            ? T.accentFaint
                            : "rgba(46,125,50,0.04)",
                        px: 2,
                        height: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {commutedDaysForNew > 0 ? (
                          <CommutationIcon
                            sx={{ color: T.accent, fontSize: 17 }}
                          />
                        ) : (
                          <CalendarIcon
                            sx={{ color: "#2E7D32", fontSize: 17 }}
                          />
                        )}
                        <Typography
                          sx={{
                            fontWeight: 900,
                            color:
                              commutedDaysForNew > 0 ? T.accent : "#2E7D32",
                            fontSize: "1.05rem",
                          }}
                        >
                          {parseFloat(newAssignment.carried_forward_days) || 0}{" "}
                          days
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: "#888", fontWeight: 900 }}
                      >
                        = {carriedHoursNew} hrs
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        minHeight: 24,
                        mt: 0.75,
                        display: "flex",
                        alignItems: "center",
                      }}
                    ></Box>
                  </Box>
                </Grid>
                {/* New Credits */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <FieldLabel>New Credits (This Period) *</FieldLabel>
                    <DaysInputField
                      value={newAssignment.allocated_days}
                      onChange={(days) => {
                        setNewAssignment((prev) => ({
                          ...prev,
                          allocated_days: days,
                        }));
                        setError("");
                      }}
                      color="#1976d2"
                    />
                    <FieldHelper color="#1976d2" strong>
                      Credits for this period only
                    </FieldHelper>
                  </Box>
                </Grid>
                {/* Period Year */}
                <Grid item xs={12} md={2}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <FieldLabel>Period Year</FieldLabel>
                    <TextField
                      type="number"
                      value={newAssignment.period_year}
                      onChange={(e) =>
                        setNewAssignment((prev) => ({
                          ...prev,
                          period_year: e.target.value,
                        }))
                      }
                      placeholder="Year..."
                      fullWidth
                      size="medium"
                      inputProps={{ min: 2020, max: 2030 }}
                      sx={inputSx}
                    />
                    <FieldHelper>e.g., 2024, 2025</FieldHelper>
                  </Box>
                </Grid>
                {/* This Period Total */}
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <FieldLabel>This Period Total</FieldLabel>
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: `2px solid ${T.accentBorder}`,
                        bgcolor: "#f5f5f5",
                        px: 2,
                        height: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: T.accent,
                          fontSize: "1rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {(Number.isFinite(totalDaysNew)
                          ? totalDaysNew
                          : 0
                        ).toFixed(1)}{" "}
                        days
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: "#999",
                          fontSize: "0.85rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {totalHoursNew || 0} hrs
                      </Typography>
                    </Box>
                    <FieldHelper color={T.accent} strong>
                      Credits for this period only
                    </FieldHelper>
                  </Box>
                </Grid>
                {/* Assign Button */}
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "transparent",
                        mb: 0.75,
                        userSelect: "none",
                      }}
                    >
                      .
                    </Typography>
                    <AccentButton
                      onClick={handleAdd}
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<AddIcon />}
                      disabled={
                        loading ||
                        !selectedEmployee ||
                        !newAssignment.leave_code ||
                        !allocatedHoursNew
                      }
                      sx={{
                        height: 50,
                        bgcolor:
                          !selectedEmployee ||
                          !newAssignment.leave_code ||
                          !allocatedHoursNew
                            ? "#d0d0d0"
                            : T.accent,
                        color:
                          !selectedEmployee ||
                          !newAssignment.leave_code ||
                          !allocatedHoursNew
                            ? "#888"
                            : "#fff",
                        boxShadow:
                          !selectedEmployee ||
                          !newAssignment.leave_code ||
                          !allocatedHoursNew
                            ? "none"
                            : `0 2px 10px ${alpha(T.accent, 0.32)}`,
                        "&:hover": {
                          bgcolor:
                            !selectedEmployee ||
                            !newAssignment.leave_code ||
                            !allocatedHoursNew
                              ? "#d0d0d0"
                              : T.accentDark,
                        },
                        "&:disabled": {
                          bgcolor: "#d0d0d0 !important",
                          color: "#888 !important",
                        },
                      }}
                    >
                      {loading ? "Adding..." : "Assign Leave"}
                    </AccentButton>
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        color: "transparent",
                        mt: 0.5,
                        userSelect: "none",
                      }}
                    >
                      .
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              {selectedEmployee && newAssignment.leave_code && (
                <Box sx={{ mt: 3 }}>
                  {selectedLeaveAssignments.length > 0 ? (
                    <CarryForwardSummary
                      leaveCode={newAssignment.leave_code}
                      employeeAssignments={employeeAssignments}
                      commutedDays={commutedDaysForNew}
                    />
                  ) : (
                    <Alert
                      severity="info"
                      icon={<EventNote />}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: T.accentFaint,
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 900, color: T.accent }}
                      >
                        No previous assignments found
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#666", fontWeight: 700 }}
                      >
                        First time assigning{" "}
                        <strong>{newAssignment.leave_code}</strong> to this
                        employee. No carry-over.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </SectionCard>

          {/* ── Records Table (compact, like LeaveCommutation) ── */}
          <SectionCard
            sx={{
              mb: { xs: 6, md: 10 },
              height: "calc(100vh - 679px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Toolbar */}
            <Box
              sx={{
                px: 3.5,
                py: 2,
                borderBottom: `1px solid ${T.divider}`,
                bgcolor: T.accentFaint,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <TableRowsIcon sx={{ fontSize: 17, color: T.accent }} />
                  <Typography
                    sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}
                  >
                    Leave Assignment Records
                  </Typography>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.3,
                      borderRadius: 4,
                      bgcolor: alpha(T.accent, 0.08),
                      border: `1px solid ${T.accentBorder}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: T.accent,
                        fontWeight: 700,
                      }}
                    >
                      {employeeGroups.length} employees ·{" "}
                      {filteredAssignments.length} records
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <FieldInput
                  size="small"
                  placeholder="Search by name or employee number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ flexGrow: 1, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 15, color: T.muted }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>

            {/* Column headers */}
            <Box
              sx={{
                px: 3.5,
                py: 1,
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1.4fr 1.4fr 1fr",
                gap: 2,
                alignItems: "center",
                bgcolor: alpha(T.accent, 0.04),
                borderBottom: `1px solid ${T.divider}`,
                flexShrink: 0,
              }}
            >
              {[
                "Employee",
                "Leave Types",
                "Total",
                "Used / Remaining",
                "Leave Credits",
                "Actions",
              ].map((col) => (
                <Typography
                  key={col}
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: T.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {col}
                </Typography>
              ))}
            </Box>

            {/* Rows */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: T.accentBorder,
                  borderRadius: 2,
                },
              }}
            >
              {paginatedEmployeeGroups.length === 0 ? (
                <Box sx={{ py: 10, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      bgcolor: T.accentFaint,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <EventNote
                      sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: T.muted,
                      mb: 0.5,
                    }}
                  >
                    {assignments.length === 0
                      ? "No Leave Assignments Found"
                      : "No Matching Records"}
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                    {assignments.length === 0
                      ? "Assign leave credits using the form above."
                      : "Try adjusting your search."}
                  </Typography>
                </Box>
              ) : (
                paginatedEmployeeGroups.map((employeeGroup, idx) => {
                  const allActivePeriods = employeeGroup.leaveTypes.flatMap(
                    (lt) => getActivePeriods(lt.periods),
                  );
                  const totalHours = allActivePeriods.reduce(
                    (s, p) => s + toNum(p.total_hours),
                    0,
                  );
                  const usedHours = allActivePeriods.reduce(
                    (s, p) => s + toNum(p.used_hours),
                    0,
                  );
                  const remainingHours = allActivePeriods.reduce(
                    (s, p) => s + toNum(p.remaining_hours),
                    0,
                  );
                  const overallColor = getStatusColor(
                    remainingHours,
                    totalHours,
                  );
                  const empInfo = getEmployeeInfo(employeeGroup.employeeNumber);
                  const empGender = empInfo?.sex || empInfo?.gender;
                  const initials =
                    `${employeeGroup.firstName?.[0] || ""}${employeeGroup.lastName?.[0] || ""}`.toUpperCase() ||
                    employeeGroup.fullName?.[0] ||
                    "?";

                  return (
                    <Box
                      key={employeeGroup.employeeNumber}
                      sx={{
                        px: 3.5,
                        py: 1.5,
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1.4fr 1.4fr 1fr",
                        gap: 2,
                        alignItems: "center",
                        bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                        borderBottom: `1px solid ${T.divider}`,
                        transition: "background 0.13s ease",
                        "&:hover": { bgcolor: T.rowHover },
                      }}
                    >
                      {/* Employee */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            bgcolor: T.accent,
                            color: "#fff",
                            borderRadius: "8px",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              color: T.text,
                              lineHeight: 1.25,
                            }}
                            noWrap
                          >
                            {employeeGroup.fullName}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.68rem",
                                color: T.faint,
                                fontWeight: 600,
                              }}
                            >
                              #{employeeGroup.employeeNumber}
                            </Typography>
                            {empGender && <GenderBadge gender={empGender} />}
                          </Box>
                        </Box>
                      </Box>

                      {/* Leave Types count */}
                      <Box>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: T.accentFaint,
                            border: `1px solid ${T.accentBorder}`,
                            display: "inline-block",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              color: T.accent,
                            }}
                          >
                            {employeeGroup.leaveTypes.length} type
                            {employeeGroup.leaveTypes.length !== 1 ? "s" : ""}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Total days */}
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color: T.text,
                            lineHeight: 1.2,
                          }}
                        >
                          {(totalHours / 8).toFixed(1)}d
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.7rem",
                            color: T.faint,
                            fontWeight: 600,
                          }}
                        >
                          {totalHours.toFixed(0)} hrs
                        </Typography>
                      </Box>

                      {/* Used / Remaining */}
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "#c25b00",
                            lineHeight: 1.2,
                          }}
                        >
                          {(usedHours / 8).toFixed(1)}d used
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            color: overallColor,
                          }}
                        >
                          {(remainingHours / 8).toFixed(1)}d left
                        </Typography>
                      </Box>

                      {/* Leave Credit Chips */}
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {employeeGroup.leaveTypes.slice(0, 4).map((lt) => {
                          const activeStats = getLeaveTypeStatsActive(
                            lt.periods,
                          );
                          const key = `${employeeGroup.employeeNumber}_${lt.leave_code}`;
                          const commutedDays = toNum(commutationMap[key]);
                          const displayDays =
                            commutedDays > 0
                              ? commutedDays
                              : activeStats.remainingHours / 8;
                          const sc =
                            commutedDays > 0
                              ? T.accent
                              : getStatusColor(
                                  activeStats.remainingHours,
                                  activeStats.totalHours,
                                );
                          return (
                            <Box
                              key={lt.leave_code}
                              sx={{
                                px: 0.75,
                                py: 0.2,
                                borderRadius: "4px",
                                bgcolor: `${sc}12`,
                                border: `1px solid ${sc}30`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: sc,
                                  fontVariantNumeric: "tabular-nums",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {lt.leave_code} {displayDays.toFixed(1)}d
                              </Typography>
                            </Box>
                          );
                        })}
                        {employeeGroup.leaveTypes.length > 4 && (
                          <Box
                            sx={{
                              px: 0.75,
                              py: 0.2,
                              borderRadius: "4px",
                              bgcolor: T.accentFaint,
                              border: `1px solid ${T.accentBorder}`,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                color: T.muted,
                              }}
                            >
                              +{employeeGroup.leaveTypes.length - 4}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Actions */}
                      <Box>
                        <AccentButton
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedEmployeeLeaves(employeeGroup);
                            setSelectedLeaveTypeInModal(null);
                            setEmployeeLeavesModalOpen(true);
                          }}
                          sx={{
                            fontSize: "0.72rem",
                            px: 1.5,
                            height: 28,
                            borderColor: T.accentBorder,
                            color: T.accent,
                            "&:hover": {
                              borderColor: T.accent,
                              bgcolor: T.accentFaint,
                              transform: "none",
                            },
                          }}
                        >
                          View
                        </AccentButton>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Pagination */}
            {employeeGroups.length > 0 && (
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderTop: `1px solid ${T.divider}`,
                  flexShrink: 0,
                }}
              >
                <TablePagination
                  component="div"
                  count={employeeGroups.length}
                  page={recordsPage}
                  onPageChange={(e, newPage) => setRecordsPage(newPage)}
                  rowsPerPage={recordsRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRecordsRowsPerPage(parseInt(e.target.value, 10));
                    setRecordsPage(0);
                  }}
                  rowsPerPageOptions={[8, 12, 16, 24, 48]}
                  labelRowsPerPage="Rows:"
                  sx={{
                    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                      { fontSize: "0.78rem", fontWeight: 600, color: T.accent },
                  }}
                />
              </Box>
            )}
          </SectionCard>

          {/* ── Employee Leaves Modal ── */}
          <Modal
            open={employeeLeavesModalOpen}
            onClose={() => {
              setEmployeeLeavesModalOpen(false);
              setSelectedEmployeeLeaves(null);
              setSelectedLeaveTypeInModal(null);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            <Fade in={employeeLeavesModalOpen}>
              <Box
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: 3,
                  width: "95%",
                  maxWidth: "1100px",
                  height: "85vh",
                  overflow: "hidden",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {selectedEmployeeLeaves && (
                  <>
                    {/* Modal Header */}
                    <Box
                      sx={{
                        px: 3.5,
                        py: 2.5,
                        background: T.modalGrad,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          top: -40,
                          right: -30,
                          width: 160,
                          height: 160,
                          borderRadius: "50%",
                          bgcolor: "rgba(255,255,255,0.04)",
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "rgba(255,255,255,0.15)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            width: 44,
                            height: 44,
                            fontSize: "1rem",
                            fontWeight: 800,
                          }}
                        >
                          {`${selectedEmployeeLeaves.firstName?.[0] || ""}${selectedEmployeeLeaves.lastName?.[0] || ""}`.toUpperCase() ||
                            selectedEmployeeLeaves.fullName?.[0] ||
                            "?"}
                        </Avatar>
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: "#fff",
                                fontSize: "0.95rem",
                                lineHeight: 1.2,
                              }}
                            >
                              {selectedEmployeeLeaves.fullName}
                            </Typography>
                            {(() => {
                              const info = getEmployeeInfo(
                                selectedEmployeeLeaves.employeeNumber,
                              );
                              const g = info?.sex || info?.gender;
                              return g ? (
                                <GenderBadge gender={g} light />
                              ) : null;
                            })()}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "rgba(255,255,255,0.65)",
                              mt: 0.25,
                            }}
                          >
                            #{selectedEmployeeLeaves.employeeNumber} ·{" "}
                            {selectedEmployeeLeaves.leaveTypes.length} Leave
                            Type(s)
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <IconButton
                          onClick={() => {
                            setEmployeeLeavesModalOpen(false);
                            setSelectedEmployeeLeaves(null);
                            setSelectedLeaveTypeInModal(null);
                          }}
                          size="small"
                          sx={{
                            color: "rgba(255,255,255,0.75)",
                            "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                          }}
                        >
                          <Close sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Body */}
                    <Box
                      sx={{
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
                        minHeight: 0,
                      }}
                    >
                      {/* Left panel — leave types list */}
                      <Box
                        sx={{
                          borderRight: {
                            xs: "none",
                            md: `1px solid ${T.divider}`,
                          },
                          p: 2.5,
                          overflowY: "auto",
                          bgcolor: "rgba(0,0,0,0.015)",
                          "&::-webkit-scrollbar": { width: 4 },
                          "&::-webkit-scrollbar-thumb": {
                            bgcolor: T.accentBorder,
                            borderRadius: 2,
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: T.accent,
                            mb: 0.75,
                            fontSize: "0.82rem",
                          }}
                        >
                          Leave Types
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#888",
                            display: "block",
                            mb: 2,
                            fontWeight: 600,
                          }}
                        >
                          Select a type to see period breakdown.
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          {selectedEmployeeLeaves.leaveTypes.map((lt) => {
                            const stats = getLeaveTypeStatsActive(lt.periods);
                            const sc = getStatusColor(
                              stats.remainingHours,
                              stats.totalHours,
                            );
                            const isActive =
                              selectedLeaveTypeInModal?.leave_code ===
                              lt.leave_code;
                            const ltObj = leaveTypes.find(
                              (x) => x.leave_code === lt.leave_code,
                            );
                            const restriction = ltObj
                              ? getLeaveGenderRestriction(ltObj)
                              : null;
                            return (
                              <Box
                                key={lt.leave_code}
                                onClick={() => setSelectedLeaveTypeInModal(lt)}
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  cursor: "pointer",
                                  border: isActive
                                    ? `2px solid ${sc}`
                                    : `1px solid ${sc}30`,
                                  bgcolor: isActive ? `${sc}10` : "#fff",
                                  transition: "all 0.18s",
                                  "&:hover": {
                                    transform: "translateY(-1px)",
                                    boxShadow: `0 4px 14px ${sc}20`,
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    mb: 0.75,
                                  }}
                                >
                                  {restriction === "male" && (
                                    <MaleIcon
                                      sx={{ fontSize: 13, color: "#1565C0" }}
                                    />
                                  )}
                                  {restriction === "female" && (
                                    <FemaleIcon
                                      sx={{ fontSize: 13, color: "#C2185B" }}
                                    />
                                  )}
                                  <Typography
                                    sx={{
                                      fontWeight: 800,
                                      color: T.accent,
                                      fontSize: "0.82rem",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {getLeaveLabel(lt.leave_code, leaveTypes)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-end",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "0.62rem",
                                        color: "#888",
                                        fontWeight: 700,
                                        mb: 0.25,
                                      }}
                                    >
                                      Available
                                    </Typography>
                                    <RemainingBalance
                                      hoursLike={stats.remainingHours}
                                      color={sc}
                                      alignItems="flex-start"
                                    />
                                  </Box>
                                  <Box sx={{ textAlign: "right" }}>
                                    <Typography
                                      sx={{
                                        fontSize: "0.62rem",
                                        color: "#888",
                                        fontWeight: 700,
                                        mb: 0.25,
                                      }}
                                    >
                                      Credits / Used
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color: "#555",
                                      }}
                                    >
                                      {(stats.totalHours / 8).toFixed(1)}d /{" "}
                                      {(stats.usedHours / 8).toFixed(1)}d
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.65rem",
                                    color: "#aaa",
                                    fontWeight: 600,
                                    mt: 1,
                                    pt: 0.75,
                                    borderTop: "1px solid rgba(0,0,0,0.05)",
                                  }}
                                >
                                  {lt.periods.length} period(s)
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>

                      {/* Right panel — period detail */}
                      <Box
                        sx={{
                          p: 2.5,
                          overflowY: "auto",
                          "&::-webkit-scrollbar": { width: 4 },
                          "&::-webkit-scrollbar-thumb": {
                            bgcolor: T.accentBorder,
                            borderRadius: 2,
                          },
                        }}
                      >
                        {!selectedLeaveTypeInModal ? (
                          <Box
                            sx={{
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <Box sx={{ textAlign: "center", maxWidth: 360 }}>
                              <EventNote
                                sx={{
                                  fontSize: 52,
                                  color: alpha(T.accent, 0.2),
                                  mb: 1.5,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: T.accent,
                                  mb: 0.75,
                                  fontSize: "0.9rem",
                                }}
                              >
                                Select a leave type
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#888",
                                  fontWeight: 600,
                                  fontSize: "0.82rem",
                                }}
                              >
                                Choose a leave type on the left to see
                                per-period credits, usage, and remaining
                                balance.
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <>
                            <Box
                              sx={{
                                mb: 2,
                                p: 2,
                                borderRadius: 2,
                                border: `1px solid ${T.accentBorder}`,
                                bgcolor: T.accentFaint,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              <Box>
                                <Typography
                                  sx={{
                                    fontWeight: 800,
                                    color: T.accent,
                                    fontSize: "0.88rem",
                                  }}
                                >
                                  {getLeaveLabel(
                                    selectedLeaveTypeInModal.leave_code,
                                    leaveTypes,
                                  )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "#777", fontWeight: 600 }}
                                >
                                  Use Edit to modify · Transfer to commute
                                  remaining balance
                                </Typography>
                              </Box>
                              <Chip
                                label={`${selectedLeaveTypeInModal.periods.length} period(s)`}
                                size="small"
                                sx={{
                                  bgcolor: T.accentFaint,
                                  color: T.accent,
                                  fontWeight: 800,
                                  border: `1px solid ${T.accentBorder}`,
                                  fontSize: "0.72rem",
                                }}
                              />
                            </Box>
                            {commuteSuccess && (
                              <Alert
                                severity="success"
                                icon={<CheckIcon />}
                                sx={{ mb: 2, borderRadius: 2 }}
                              >
                                {commuteSuccess}
                              </Alert>
                            )}
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                              }}
                            >
                              {[...selectedLeaveTypeInModal.periods]
                                .sort((a, b) => {
                                  if (b.period_year !== a.period_year)
                                    return b.period_year - a.period_year;
                                  return (
                                    semOrder(b.period_semester) -
                                    semOrder(a.period_semester)
                                  );
                                })
                                .map((period, index) => {
                                  const sc = getStatusColor(
                                    period.remaining_hours,
                                    period.total_hours,
                                  );
                                  const isLatest = index === 0;
                                  const isLocked = isCommutedLocked(period);
                                  return (
                                    <Box
                                      key={period.id}
                                      sx={{
                                        borderRadius: 2,
                                        border: isLatest
                                          ? "2px solid #2E7D32"
                                          : `1px solid ${T.accentBorder}`,
                                        bgcolor: isLatest
                                          ? "rgba(46,125,50,0.04)"
                                          : "#fff",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          px: 2.5,
                                          py: 2,
                                          opacity: isLocked ? 0.85 : 1,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 2,
                                            mb: 1.5,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              px: 1.5,
                                              py: 0.4,
                                              borderRadius: 1.5,
                                              bgcolor: `${sc}18`,
                                              border: `1px solid ${sc}30`,
                                            }}
                                          >
                                            <Typography
                                              sx={{
                                                fontWeight: 900,
                                                color: sc,
                                                fontSize: "0.88rem",
                                              }}
                                            >
                                              {periodLabel(
                                                period.period_year,
                                                period.period_semester,
                                              )}
                                            </Typography>
                                          </Box>
                                          {isLatest && (
                                            <Chip
                                              label="Most Recent"
                                              size="small"
                                              sx={{
                                                bgcolor: "#2E7D32",
                                                color: "#fff",
                                                fontWeight: 800,
                                                fontSize: "0.68rem",
                                                height: 22,
                                              }}
                                            />
                                          )}
                                          {isLocked && (
                                            <Chip
                                              size="small"
                                              icon={
                                                <CommutationIcon
                                                  style={{ fontSize: 11 }}
                                                />
                                              }
                                              label="Commuted"
                                              sx={{
                                                height: 22,
                                                fontSize: "0.68rem",
                                                bgcolor: T.accentFaint,
                                                color: T.accent,
                                                fontWeight: 800,
                                              }}
                                            />
                                          )}
                                        </Box>
                                        {isLocked && (
                                          <Alert
                                            severity="info"
                                            sx={{
                                              borderRadius: 1.5,
                                              mb: 1.5,
                                              py: 0.5,
                                              bgcolor: T.accentFaint,
                                              border: `1px solid ${T.accentBorder}`,
                                            }}
                                          >
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                fontWeight: 700,
                                                color: T.accent,
                                              }}
                                            >
                                              Commuted periods are locked.
                                              Create a new assignment for
                                              additional credits.
                                            </Typography>
                                          </Alert>
                                        )}
                                        <Box
                                          sx={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "repeat(4, 1fr) 1.25fr",
                                            gap: 1,
                                          }}
                                        >
                                          {[
                                            [
                                              "New Credits",
                                              toNum(period.allocated_hours) / 8,
                                              T.accent,
                                              T.accentFaint,
                                            ],
                                            [
                                              "Used",
                                              toNum(period.used_hours) / 8,
                                              "#ed6c02",
                                              "rgba(237,108,2,0.05)",
                                            ],
                                            [
                                              "Available",
                                              toNum(period.remaining_hours) / 8,
                                              sc,
                                              `${sc}12`,
                                            ],
                                            [
                                              "Total",
                                              toNum(period.total_hours) / 8,
                                              "#2E7D32",
                                              "rgba(46,125,50,0.05)",
                                            ],
                                          ].map(([label, val, color, bg]) => (
                                            <Box
                                              key={label}
                                              sx={{
                                                textAlign: "center",
                                                p: 1,
                                                borderRadius: 1.5,
                                                bgcolor: bg,
                                              }}
                                            >
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: "#888",
                                                  display: "block",
                                                  mb: 0.25,
                                                  fontSize: "0.58rem",
                                                  fontWeight: 800,
                                                  textTransform: "uppercase",
                                                  letterSpacing: 0.4,
                                                }}
                                              >
                                                {label}
                                              </Typography>
                                              <Typography
                                                sx={{
                                                  fontWeight: 900,
                                                  color,
                                                  fontSize: "0.9rem",
                                                }}
                                              >
                                                {Number(val).toFixed(1)}d
                                              </Typography>
                                            </Box>
                                          ))}
                                          <Box
                                            sx={{
                                              textAlign: "center",
                                              p: 1,
                                              borderRadius: 1.5,
                                              bgcolor:
                                                toNum(
                                                  period.carried_forward_hours,
                                                ) > 0
                                                  ? "rgba(46,125,50,0.08)"
                                                  : "rgba(0,0,0,0.02)",
                                              border: `1.5px dashed ${toNum(period.carried_forward_hours) > 0 ? "rgba(46,125,50,0.3)" : "rgba(0,0,0,0.1)"}`,
                                            }}
                                          >
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color:
                                                  toNum(
                                                    period.carried_forward_hours,
                                                  ) > 0
                                                    ? "#2E7D32"
                                                    : "#bbb",
                                                display: "block",
                                                mb: 0.25,
                                                fontSize: "0.58rem",
                                                fontWeight: 800,
                                                textTransform: "uppercase",
                                                letterSpacing: 0.4,
                                              }}
                                            >
                                              Carry-Over
                                            </Typography>
                                            <Typography
                                              sx={{
                                                fontWeight: 900,
                                                color:
                                                  toNum(
                                                    period.carried_forward_hours,
                                                  ) > 0
                                                    ? "#2E7D32"
                                                    : "#ccc",
                                                fontSize: "0.9rem",
                                              }}
                                            >
                                              {(
                                                toNum(
                                                  period.carried_forward_hours,
                                                ) / 8
                                              ).toFixed(1)}
                                              d
                                            </Typography>
                                            <Typography
                                              sx={{
                                                fontSize: "0.52rem",
                                                color: "#aaa",
                                                fontWeight: 700,
                                                mt: 0.2,
                                              }}
                                            >
                                              info only
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                      <Box
                                        sx={{
                                          borderTop: `1px solid ${T.accentBorder}`,
                                          px: 2.5,
                                          py: 1.25,
                                          bgcolor: canCommute(period)
                                            ? T.accentFaint
                                            : "rgba(0,0,0,0.02)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: 2,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: "#888",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {canCommute(period)
                                            ? `${(toNum(period.remaining_hours) / 8).toFixed(2)}d available to commute`
                                            : "No remaining balance"}
                                        </Typography>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                          {!isLocked && (
                                            <AccentButton
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenModal(period);
                                                setIsEditing(true);
                                              }}
                                              variant="outlined"
                                              size="small"
                                              startIcon={
                                                <EditIcon
                                                  sx={{
                                                    fontSize: "13px !important",
                                                  }}
                                                />
                                              }
                                              sx={{
                                                fontSize: "0.72rem",
                                                px: 1.5,
                                                height: 28,
                                                borderColor: T.accentBorder,
                                                color: T.accent,
                                                "&:hover": {
                                                  borderColor: T.accent,
                                                  bgcolor: T.accentFaint,
                                                  transform: "none",
                                                },
                                              }}
                                            >
                                              Edit
                                            </AccentButton>
                                          )}
                                          <AccentButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCommuteDialog({
                                                ...period,
                                                fullName:
                                                  selectedEmployeeLeaves.fullName,
                                              });
                                            }}
                                            disabled={!canCommute(period)}
                                            variant={
                                              canCommute(period)
                                                ? "contained"
                                                : "outlined"
                                            }
                                            size="small"
                                            startIcon={
                                              <CommutationIcon
                                                sx={{
                                                  fontSize: "13px !important",
                                                }}
                                              />
                                            }
                                            sx={{
                                              fontSize: "0.72rem",
                                              px: 1.5,
                                              height: 28,
                                              bgcolor: canCommute(period)
                                                ? T.accent
                                                : "transparent",
                                              color: canCommute(period)
                                                ? "#fff"
                                                : "#bbb",
                                              borderColor: canCommute(period)
                                                ? T.accent
                                                : "#ddd",
                                              "&:hover": {
                                                bgcolor: canCommute(period)
                                                  ? T.accentDark
                                                  : "transparent",
                                                transform: canCommute(period)
                                                  ? "translateY(-1px)"
                                                  : "none",
                                              },
                                              "&:disabled": {
                                                bgcolor:
                                                  "transparent !important",
                                                color: "#ccc !important",
                                                borderColor: "#eee !important",
                                              },
                                            }}
                                          >
                                            {canCommute(period)
                                              ? "Transfer"
                                              : "Commuted"}
                                          </AccentButton>
                                        </Box>
                                      </Box>
                                    </Box>
                                  );
                                })}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>

          {/* ── Edit Assignment Modal ── */}
          <Modal
            open={!!editAssignment}
            onClose={handleCloseModal}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            <Fade in={!!editAssignment}>
              <Box
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: 3,
                  width: "100%",
                  maxWidth: "580px",
                  maxHeight: "90vh",
                  overflow: "hidden",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {editAssignment &&
                  (() => {
                    const isEditLocked = isCommutedLocked(editAssignment);
                    return (
                      <>
                        {/* Modal Header */}
                        <Box
                          sx={{
                            px: 3.5,
                            py: 2.5,
                            background: T.modalGrad,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              top: -40,
                              right: -30,
                              width: 160,
                              height: 160,
                              borderRadius: "50%",
                              bgcolor: "rgba(255,255,255,0.04)",
                            }}
                          />
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,0.15)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <EditIcon sx={{ fontSize: 18, color: "#fff" }} />
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: "#fff",
                                  fontSize: "0.95rem",
                                  lineHeight: 1.2,
                                }}
                              >
                                Edit Leave Assignment
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: "0.72rem",
                                  color: "rgba(255,255,255,0.65)",
                                }}
                              >
                                {editAssignment.fullName ||
                                  editAssignment.employeeNumber}{" "}
                                · {editAssignment.leave_code}
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton
                            onClick={handleCloseModal}
                            size="small"
                            sx={{
                              color: "rgba(255,255,255,0.75)",
                              position: "relative",
                              zIndex: 1,
                              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                            }}
                          >
                            <Close sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Box>

                        {/* Modal body */}
                        <Box
                          sx={{
                            px: 3.5,
                            py: 3,
                            overflowY: "auto",
                            flexGrow: 1,
                            "&::-webkit-scrollbar": { width: 4 },
                            "&::-webkit-scrollbar-thumb": {
                              bgcolor: T.accentBorder,
                              borderRadius: 2,
                            },
                          }}
                        >
                          {error && (
                            <Alert
                              severity="error"
                              sx={{ mb: 2.5, borderRadius: 2 }}
                            >
                              {error}
                            </Alert>
                          )}
                          {isEditLocked && (
                            <Alert
                              severity="info"
                              sx={{
                                mb: 2.5,
                                borderRadius: 2,
                                bgcolor: T.accentFaint,
                                border: `1px solid ${T.accentBorder}`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: T.accent,
                                  mb: 0.25,
                                }}
                              >
                                Locked — already commuted
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: "#666" }}
                              >
                                To add credits for this leave type, create a new
                                assignment for a new period.
                              </Typography>
                            </Alert>
                          )}

                          {/* Summary highlight */}
                          <Box
                            sx={{
                              mb: 2.5,
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: T.accentFaint,
                              border: `1px solid ${T.accentBorder}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  color: T.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em",
                                  mb: 0.25,
                                }}
                              >
                                Remaining Balance
                              </Typography>
                              <RemainingBalance
                                hoursLike={toNum(
                                  editAssignment.remaining_hours,
                                )}
                                color={getStatusColor(
                                  toNum(editAssignment.remaining_hours),
                                  toNum(editAssignment.total_hours),
                                )}
                                alignItems="flex-start"
                                largeDays
                              />
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography
                                sx={{
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  color: T.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em",
                                  mb: 0.5,
                                }}
                              >
                                Period
                              </Typography>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: T.text,
                                  fontSize: "1rem",
                                }}
                              >
                                {periodLabel(
                                  editAssignment.period_year,
                                  editAssignment.period_semester,
                                )}
                              </Typography>
                              <Box
                                sx={{
                                  mt: 0.5,
                                  px: 1.25,
                                  py: 0.3,
                                  borderRadius: 1,
                                  bgcolor: T.accentFaint,
                                  border: `1px solid ${T.accentBorder}`,
                                  display: "inline-block",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    color: T.accent,
                                  }}
                                >
                                  {editAssignment.leave_code}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          {/* Read-only stats row */}
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 1.5,
                              mb: 2.5,
                            }}
                          >
                            {[
                              [
                                "Total",
                                toNum(editAssignment.total_hours),
                                T.accent,
                              ],
                              [
                                "Used",
                                toNum(editAssignment.used_hours),
                                "#ed6c02",
                              ],
                              [
                                "Remaining",
                                toNum(editAssignment.remaining_hours),
                                getStatusColor(
                                  toNum(editAssignment.remaining_hours),
                                  toNum(editAssignment.total_hours),
                                ),
                              ],
                            ].map(([label, val, color]) => (
                              <Box
                                key={label}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  textAlign: "center",
                                  bgcolor: `${color}08`,
                                  border: `1px solid ${color}20`,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.58rem",
                                    fontWeight: 800,
                                    color: T.muted,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                    mb: 0.25,
                                  }}
                                >
                                  {label}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontWeight: 900,
                                    color,
                                    fontSize: "1rem",
                                    lineHeight: 1,
                                  }}
                                >
                                  {(val / 8).toFixed(1)}d
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.65rem",
                                    color: T.faint,
                                    fontWeight: 600,
                                  }}
                                >
                                  {val.toFixed(1)} hrs
                                </Typography>
                              </Box>
                            ))}
                          </Box>

                          <Divider sx={{ mb: 2.5, borderColor: T.divider }}>
                            <Chip
                              label="Edit Fields"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.68rem",
                                bgcolor: T.accentFaint,
                                color: T.accent,
                                fontWeight: 700,
                                border: `1px solid ${T.accentBorder}`,
                              }}
                            />
                          </Divider>

                          <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: T.accent,
                                  mb: 0.75,
                                }}
                              >
                                Employee Number
                              </Typography>
                              <FieldInput
                                value={editAssignment.employeeNumber || ""}
                                onChange={(e) =>
                                  setEditAssignment({
                                    ...editAssignment,
                                    employeeNumber: e.target.value,
                                  })
                                }
                                fullWidth
                                size="small"
                                disabled={isEditLocked}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: T.accent,
                                  mb: 0.75,
                                }}
                              >
                                Leave Type
                              </Typography>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={editAssignment.leave_code || ""}
                                  onChange={(e) =>
                                    setEditAssignment({
                                      ...editAssignment,
                                      leave_code: e.target.value,
                                    })
                                  }
                                  disabled={isEditLocked}
                                  displayEmpty
                                  sx={{
                                    borderRadius: 2,
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: T.accentBorder,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      { borderColor: T.accent },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      { borderColor: T.accent },
                                  }}
                                >
                                  <MenuItem value="">
                                    <em>Select Leave Type</em>
                                  </MenuItem>
                                  {leaveTypes.map((t) => (
                                    <MenuItem
                                      key={t.id || t.leave_code}
                                      value={t.leave_code}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontSize: "0.82rem" }}
                                      >
                                        {getLeaveLabel(
                                          t.leave_code,
                                          leaveTypes,
                                        )}
                                      </Typography>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: T.accent,
                                  mb: 0.75,
                                }}
                              >
                                Carried Forward Days
                              </Typography>
                              <DaysInputField
                                value={editCarriedDays}
                                onChange={setEditCarriedDays}
                                label="Carried Days"
                                color="#2E7D32"
                                disabled={isEditLocked}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: T.accent,
                                  mb: 0.75,
                                }}
                              >
                                Allocated Days (New Credits)
                              </Typography>
                              <DaysInputField
                                value={editAllocatedDays}
                                onChange={setEditAllocatedDays}
                                label="Allocated Days"
                                color="#1976d2"
                                disabled={isEditLocked}
                              />
                            </Grid>
                            {!isEditLocked && (
                              <Grid item xs={12}>
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: T.accent,
                                    mb: 0.75,
                                  }}
                                >
                                  Remaining Hours (manual override)
                                </Typography>
                                <TextField
                                  type="number"
                                  value={toNum(editAssignment.remaining_hours)}
                                  onChange={(e) =>
                                    setEditAssignment({
                                      ...editAssignment,
                                      remaining_hours:
                                        parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  fullWidth
                                  size="small"
                                  inputProps={{ min: 0, step: 1 }}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: "#888",
                                            fontWeight: 700,
                                          }}
                                        >
                                          hrs
                                        </Typography>
                                      </InputAdornment>
                                    ),
                                  }}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: 2,
                                      "& fieldset": {
                                        borderColor: T.accentBorder,
                                      },
                                      "&:hover fieldset": {
                                        borderColor: T.accent,
                                      },
                                    },
                                  }}
                                />
                              </Grid>
                            )}
                          </Grid>
                        </Box>

                        {/* Modal footer */}
                        <Box
                          sx={{
                            px: 3.5,
                            py: 2,
                            borderTop: `1px solid ${T.divider}`,
                            bgcolor: "#f9f9f9",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1,
                            flexShrink: 0,
                          }}
                        >
                          {!isEditLocked && (
                            <AccentButton
                              onClick={() => handleDelete(editAssignment.id)}
                              variant="outlined"
                              startIcon={
                                <DeleteIcon
                                  sx={{ fontSize: "13px !important" }}
                                />
                              }
                              sx={{
                                fontSize: "0.8rem",
                                borderColor: "#ffcdd2",
                                color: "#c62828",
                                mr: "auto",
                                "&:hover": {
                                  bgcolor: "rgba(198,40,40,0.04)",
                                  borderColor: "#c62828",
                                  transform: "none",
                                },
                              }}
                            >
                              Delete
                            </AccentButton>
                          )}
                          <AccentButton
                            onClick={handleCloseModal}
                            variant="outlined"
                            sx={{
                              fontSize: "0.8rem",
                              borderColor: T.accentBorder,
                              color: T.muted,
                              "&:hover": {
                                bgcolor: T.accentFaint,
                                borderColor: T.accent,
                                color: T.accent,
                              },
                            }}
                          >
                            {isEditLocked ? "Close" : "Cancel"}
                          </AccentButton>
                          {!isEditLocked && (
                            <AccentButton
                              onClick={handleUpdate}
                              variant="contained"
                              startIcon={
                                <SaveIcon
                                  sx={{ fontSize: "13px !important" }}
                                />
                              }
                              sx={{
                                fontSize: "0.8rem",
                                bgcolor: T.accent,
                                color: "#fff",
                                boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                                "&:hover": { bgcolor: T.accentDark },
                              }}
                            >
                              Save Changes
                            </AccentButton>
                          )}
                        </Box>
                      </>
                    );
                  })()}
              </Box>
            </Fade>
          </Modal>
        </Box>

        {/* ── Floating Action Button ── */}
        <Tooltip
          title={`Auto-assign leave types to all ${[...new Set(assignments.map((a) => a.employeeNumber))].length} employees with existing records`}
          placement="left"
        >
          <Button
            onClick={() => setBulkAssignOpen(true)}
            variant="contained"
            startIcon={<AutoAssignIcon />}
            sx={{
              position: "fixed",
              bottom: 70,
              right: 32,
              zIndex: 1200,
              bgcolor: T.accent,
              color: "#fff",
              borderRadius: 3,
              fontWeight: 900,
              px: 3,
              py: 1.5,
              fontSize: "0.875rem",
              boxShadow: `0 6px 20px ${alpha(T.accent, 0.45)}`,
              whiteSpace: "nowrap",
              "&:hover": {
                bgcolor: T.accentDark,
                boxShadow: `0 8px 28px ${alpha(T.accent, 0.55)}`,
                transform: "translateY(-2px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Reset to Default
          </Button>
        </Tooltip>
      </Box>
    </Fade>
  );
};

export default LeaveAssignment;
