import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
import axios from "axios";
import useAttendanceRealtimeRefresh from "../../hooks/useAttendanceRealtimeRefresh";
import useAttendanceWorkflow from "../../hooks/useAttendanceWorkflow";
import AttendanceWorkflowNav from "./AttendanceWorkflowNav";
import { navigateAttendanceWorkflow } from "../../utils/attendanceWorkflow";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Fade,
  MenuItem,
  alpha,
  styled,
  Card,
  Button,
  Fab,
  Zoom,
  TextField,
  IconButton,
  Avatar,
  Chip,
} from "@mui/material";
import {
  Search,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Info,
  Refresh,
  KeyboardArrowUp,
  KeyboardArrowDown,
  FilterList,
  Close,
  SearchOutlined,
  Assignment,
  Edit,
  Male as MaleIcon,
  Female as FemaleIcon,
} from "@mui/icons-material";
import { DeptBadge, EmpCatBadge } from "../LEAVE/EARNINGS/RecordsList";
import {
  AttendanceFilterHeader,
  AttendanceFilterSectionLabel,
  AttendanceFilterDateControls,
  AttendanceFilterSummaryBox,
  filterPanelBoxSx,
  filterSidebarCardSx,
  attendanceMainPanelHeightSx,
  ATTENDANCE_COMPACT_PAGE_SX,
  MONTHS_SHORT,
  AttendanceEmployeeSearchSection,
  useAttendanceCompactPage,
} from "./attendanceFilterLayout";
import AttendanceEmployeeSearchField from "./AttendanceEmployeeSearchField";
import { Grid } from "@mui/material";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import {
  buildAuditPeriodLabel,
  logAttendanceStateView,
  logAttendanceStateChange,
} from "../../utils/moduleEmployeeSearchAudit";
import {
  Paper,
  List,
  ListItemButton,
  CircularProgress,
  InputAdornment,
  Menu,
  Dialog,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import { List as VirtualList } from "react-window";

// ─── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  rowOdd:       "rgba(109,35,35,0.025)",
  rowHover:     "rgba(109,35,35,0.055)",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
};

// ─── Shimmer keyframes ─────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Shimmer bone ──────────────────────────────────────────────────────────
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r,
      background:
        "linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)",
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe skeleton ────────────────────────────────────────────────────
const AllAttendanceWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "63%", transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2, borderRadius: 3, overflow: "hidden", border: `1px solid ${T.accentBorder}`, animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
            <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
          </Box>
          <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
        </Box>
      </Box>
      {/* Two-column */}
      <Grid container spacing={2}>
        {[3, 9].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box
              sx={{
                borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: "#fff",
                overflow: "hidden", animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`,
                height: "calc(100vh - 280px)",
              }}
            >
              <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
                <Bone w={lg === 3 ? 140 : 220} h={12} />
              </Box>
              {lg === 3 ? (
                <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {[100, 160, 120, 140].map((w, i) => (
                    <Box key={i}>
                      <Bone w={w} h={10} sx={{ mb: 1 }} />
                      <Box sx={{ height: 38, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: "#fafafa" }} />
                    </Box>
                  ))}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Box key={i} sx={{ width: 52, height: 34, borderRadius: "6px", bgcolor: T.accentFaint }} />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 0, display: "flex", flexDirection: "column", gap: 0 }}>
                  <Box sx={{ px: 2.5, py: 1.1, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accent, display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", gap: 1 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Box key={i} sx={{ height: 9, borderRadius: 4, bgcolor: "rgba(255,255,255,0.36)" }} />
                    ))}
                  </Box>
                  <Box sx={{ px: 2.5, py: 1.2, display: "flex", flexDirection: "column", gap: 0.8 }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <Box key={i} sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", gap: 1, py: 0.45 }}>
                        {Array.from({ length: 4 }).map((__, j) => <Bone key={j} h={10} />)}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Styled components ─────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.8rem",
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

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography
      sx={{
        fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em",
        textTransform: "uppercase", color: alpha(T.accent, 0.45),
      }}
    >
      {children}
    </Typography>
  </Box>
);

const scrollbarSx = {
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
};

const selectSx = {
  borderRadius: "8px",
  fontSize: "0.82rem",
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: "1.5px" },
};

// ─── Row action button ─────────────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: "transparent",
      border: `1px solid ${color}40`,
      borderRadius: "6px",
      padding: "4px 10px",
      cursor: disabled ? "default" : "pointer",
      color,
      display: "flex", alignItems: "center", gap: "4px",
      fontSize: "0.72rem", fontWeight: 700,
      fontFamily: "inherit",
      transition: "background-color 0.15s, border-color 0.15s",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

const DetailsActionButton = ({ onClick }) => (
  <Tooltip title="View punch details and edit status" placement="top">
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        px: 1.35,
        py: 0.6,
        borderRadius: "8px",
        border: `1px solid ${T.accent}`,
        bgcolor: T.accent,
        color: "#FEF9E1",
        fontSize: "0.72rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        boxShadow: `0 2px 6px ${alpha(T.accent, 0.28)}`,
        "&:hover": {
          bgcolor: T.accentDark,
          borderColor: T.accentDark,
          boxShadow: `0 4px 12px ${alpha(T.accent, 0.32)}`,
          transform: "translateY(-1px)",
        },
        "&:active": {
          transform: "translateY(0)",
          boxShadow: `0 1px 4px ${alpha(T.accent, 0.22)}`,
        },
      }}
    >
      <Info sx={{ fontSize: 14 }} />
      Details
    </Box>
  </Tooltip>
);

const DetailField = ({ label, value, children }) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: "10px",
      bgcolor: "#fafafa",
      border: `1px solid ${T.divider}`,
      minWidth: 0,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.62rem",
        color: T.faint,
        mb: 0.5,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontWeight: 700,
      }}
    >
      {label}
    </Typography>
    {children || (
      <Typography sx={{ fontSize: "0.86rem", fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
        {value}
      </Typography>
    )}
  </Box>
);

const dialogPaperSx = {
  borderRadius: "14px",
  overflow: "hidden",
  boxShadow: `0 24px 48px ${alpha(T.accent, 0.2)}`,
};

// ─── Attendance helpers ────────────────────────────────────────────────────
const getAttendanceIcon = (state) => {
  switch (state) {
    case 1: return <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />;
    case 2: return <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />;
    case 3: return <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />;
    case 4: return <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />;
    case 5: return <AccessTime  sx={{ fontSize: 13, color: "#1565C0" }} />;
    case 6: return <AccessTime  sx={{ fontSize: 13, color: "#1565C0" }} />;
    default: return <Cancel     sx={{ fontSize: 13, color: "#f44336" }} />;
  }
};
const getAttendanceColor = (state) => {
  switch (state) {
    case 1: return "#4caf50"; case 2: return "#ff9800";
    case 3: return "#ff9800"; case 4: return "#4caf50";
    case 5: return "#1565C0"; case 6: return "#1565C0";
    default: return "#f44336";
  }
};
const getAttendanceLabel = (state) => {
  switch (state) {
    case 1: return "Time IN";      case 2: return "Breaktime OUT";
    case 3: return "Breaktime IN"; case 4: return "Time OUT";
    case 5: return "Special Time IN"; case 6: return "Special Time OUT";
    default: return "Uncategorized";
  }
};

const ATTENDANCE_STATE_OPTIONS = [
  { value: 1, label: "Time IN" },
  { value: 2, label: "Breaktime OUT" },
  { value: 3, label: "Breaktime IN" },
  { value: 4, label: "Time OUT" },
  { value: 5, label: "Special Time IN" },
  { value: 6, label: "Special Time OUT" },
];

const STATE_ROW_HEIGHT = 52;

const AttendanceStatusChip = ({
  value,
  saving = false,
  editable = false,
  onOpenMenu,
}) => {
  const state = Number(value) || 0;
  const stateColor = getAttendanceColor(state);
  return (
    <Box
      component={editable ? "button" : "div"}
      type={editable ? "button" : undefined}
      disabled={editable && saving}
      onClick={
        editable
          ? (e) => {
              e.stopPropagation();
              onOpenMenu?.(e);
            }
          : undefined
      }
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.25,
        py: 0.4,
        borderRadius: "12px",
        bgcolor: alpha(stateColor, 0.1),
        border: `1px solid ${alpha(stateColor, 0.25)}`,
        cursor: editable && !saving ? "pointer" : "default",
        font: "inherit",
        outline: "none",
        opacity: saving ? 0.7 : 1,
        "&:hover": editable && !saving ? { bgcolor: alpha(stateColor, 0.16) } : {},
      }}
    >
      {saving ? (
        <CircularProgress size={12} sx={{ color: stateColor }} />
      ) : (
        getAttendanceIcon(state)
      )}
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: stateColor }}>
        {getAttendanceLabel(state)}
      </Typography>
      {editable && !saving && (
        <KeyboardArrowDown sx={{ fontSize: 14, color: stateColor, ml: -0.25 }} />
      )}
    </Box>
  );
};

const AttendanceStateDetailsDialog = ({ record, open, onClose, onStatusMenuOpen, savingStatus }) => {
  if (!record) return null;
  const state = record.AttendanceState;
  const canEditStatus = Boolean(record.AttendanceDateTime);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: T.accent,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: "10px",
            bgcolor: alpha("#fff", 0.14),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Assignment sx={{ fontSize: 22, color: "#FEF9E1" }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
          <Typography sx={{ color: "#FEF9E1", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>
            Punch Details
          </Typography>
          <Typography sx={{ color: alpha("#FEF9E1", 0.82), fontSize: "0.74rem", mt: 0.35 }}>
            Review this device punch and correct its status if needed.
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: alpha("#FEF9E1", 0.9),
            bgcolor: alpha("#fff", 0.1),
            "&:hover": { bgcolor: alpha("#fff", 0.18) },
          }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 2.5, py: 2.5, bgcolor: "#fff" }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <DetailField label="Employee ID" value={record.PersonID} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailField label="Date" value={record._dateLabel || record.Date} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailField label="Time" value={record.Time} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailField label="Status">
              <AttendanceStatusChip
                value={state}
                saving={savingStatus}
                editable={canEditStatus}
                onOpenMenu={(e) => onStatusMenuOpen?.(e, record)}
              />
            </DetailField>
          </Grid>
        </Grid>
        {canEditStatus && (
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, mt: 2, lineHeight: 1.45 }}>
            Click the status chip above to change the punch type. The daily time record will rebuild after you save.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: T.accentFaint,
          borderTop: `1px solid ${T.divider}`,
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
            px: 2.5,
            bgcolor: T.accent,
            boxShadow: `0 2px 8px ${alpha(T.accent, 0.25)}`,
            "&:hover": { bgcolor: T.accentDark },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const StatusUpdateSuccessDialog = ({ open, message, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{ sx: dialogPaperSx }}
  >
    <DialogContent sx={{ px: 3, pt: 4, pb: 2, textAlign: "center", bgcolor: "#fff" }}>
      <Box
        sx={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          bgcolor: alpha("#2e7d32", 0.1),
          border: `2px solid ${alpha("#2e7d32", 0.2)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 2,
        }}
      >
        <CheckCircle sx={{ fontSize: 34, color: "#2e7d32" }} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: T.text, mb: 1 }}>
        Status Updated
      </Typography>
      <Typography sx={{ fontSize: "0.84rem", color: T.muted, lineHeight: 1.55 }}>
        {message}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ justifyContent: "center", pb: 3, pt: 0, bgcolor: "#fff" }}>
      <Button
        onClick={onClose}
        variant="contained"
        sx={{
          textTransform: "none",
          fontWeight: 700,
          borderRadius: "8px",
          px: 4,
          bgcolor: T.accent,
          boxShadow: `0 2px 8px ${alpha(T.accent, 0.25)}`,
          "&:hover": { bgcolor: T.accentDark },
        }}
      >
        OK
      </Button>
    </DialogActions>
  </Dialog>
);

const getEmployeeIdentifier = (emp) => {
  if (!emp || typeof emp !== "object") return "";
  const raw =
    emp.personID ?? emp.PersonID ?? emp.employeeNum ??
    emp.employeeNumber ?? emp.agencyEmployeeNum ?? "";
  return String(raw).trim();
};

const toProfileEmployee = (emp) => {
  if (!emp) return null;
  const num = getEmployeeIdentifier(emp);
  return { ...emp, employeeNumber: num };
};

const buildDisplayName = (e) => {
  const last = (e?.lastName || "").trim();
  const first = (e?.firstName || "").trim();
  const mid = (e?.middleName || "").trim();
  if (!last && !first) {
    const raw = String(e?.name || e?.fullName || "").trim();
    if (!raw) {
      const num = getEmployeeIdentifier(e);
      return num ? `#${num}` : "";
    }
    if (raw.includes(",")) return raw;
    return raw;
  }
  return last
    ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(" ")}`
    : [first, mid].filter(Boolean).join(" ");
};

const getEmployeeInitials = (e) => {
  const last = e?.lastName?.[0];
  const first = e?.firstName?.[0];
  if (last || first) {
    return `${last || ""}${first || ""}`.toUpperCase() || "?";
  }
  const nm = String(e?.name || e?.fullName || "").trim();
  if (!nm) return "?";
  const parts = nm.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return nm[0]?.toUpperCase() || "?";
};

const GenderBadge = ({ gender }) => {
  if (!gender) return null;
  const isMale = String(gender).trim().toLowerCase() === "male";
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon style={{ fontSize: 11, color: "#1565C0" }} />
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

const EmployeeProfileRow = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
  avatarSize = 30,
}) => {
  if (!employee) return null;
  const num = getEmployeeIdentifier(employee);
  const initials = getEmployeeInitials(employee);
  const name = buildDisplayName(employee);
  const dc = deptMap[num];
  const ec = empCatMap[num];
  const gender = sexMap[num] || employee.sex || employee.gender;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Avatar
        sx={{
          width: avatarSize,
          height: avatarSize,
          bgcolor: T.accent,
          fontSize: avatarSize <= 30 ? "0.65rem" : "0.8rem",
          fontWeight: 800,
          borderRadius: avatarSize <= 30 ? "4px" : "8px",
          flexShrink: 0,
        }}
      >
        {initials}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: avatarSize <= 30 ? "0.78rem" : "0.84rem",
            color: T.text,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.45,
            flexWrap: "wrap",
            mt: 0.25,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: T.faint, fontSize: "0.65rem", whiteSpace: "nowrap" }}
          >
            #{num}
          </Typography>
          {gender && <GenderBadge gender={gender} />}
          {dc && <DeptBadge code={dc} />}
          {ec && <EmpCatBadge label={ec.label} colorHex={ec.colorHex} />}
        </Box>
      </Box>
    </Box>
  );
};

const EmployeeProfileCard = ({
  employee,
  deptMap = {},
  empCatMap = {},
  sexMap = {},
  loading = false,
}) => {
  if (!employee) return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: `1px solid ${T.accentBorder}`,
        bgcolor: "#fafafa",
      }}
    >
      <EmployeeProfileRow
        employee={employee}
        deptMap={deptMap}
        empCatMap={empCatMap}
        sexMap={sexMap}
        avatarSize={44}
      />
      {loading && (
        <CircularProgress size={14} sx={{ color: T.accent, flexShrink: 0 }} />
      )}
    </Box>
  );
};

const toISODateFromRecord = (rawDate) => {
  const [month, day, year] = String(rawDate || "").split("/");
  if (!month || !day || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const recordSortTimestamp = (record) => {
  const [month, day, year] = String(record?.Date || "").split("/");
  if (month && day && year) {
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${record?.Time || "00:00:00"}`;
    const ts = new Date(iso).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  const fallback = new Date(`${record?.Date || ""} ${record?.Time || ""}`).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
};

const enrichAttendanceRecords = (rows) =>
  rows.map((record, index) => {
    const iso = toISODateFromRecord(record?.Date);
    const sortTs = recordSortTimestamp(record);
    const dateForLabel = iso ? new Date(`${iso}T12:00:00`) : null;
    const dateLabel =
      dateForLabel && !Number.isNaN(dateForLabel.getTime())
        ? dateForLabel.toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : String(record?.Date || "");
    return {
      ...record,
      _isoDate: iso,
      _sortTs: sortTs,
      _dateLabel: dateLabel,
      _rowKey: `${record?.AttendanceDateTime ?? record?.PersonID ?? ""}|${record?.Date ?? ""}|${record?.Time ?? ""}`,
    };
  });

// ─── Memoized table row ────────────────────────────────────────────────────
const AttendanceStateRow = React.memo(function AttendanceStateRow({
  record,
  rowIndex,
  onStatusMenuOpen,
  onDetailsOpen,
  savingStatus,
}) {
  const state = record.AttendanceState;
  const canEditStatus = Boolean(record.AttendanceDateTime) && typeof onStatusMenuOpen === "function";
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
        px: 2.5,
        py: 1.5,
        gap: 2,
        alignItems: "center",
        height: STATE_ROW_HEIGHT,
        boxSizing: "border-box",
        bgcolor: rowIndex % 2 === 0 ? "#fff" : T.rowOdd,
        borderBottom: `1px solid ${T.divider}`,
        transition: "background 0.12s",
        "&:hover": { bgcolor: T.rowHover },
      }}
    >
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: "0.82rem",
          color: T.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {record._dateLabel}
      </Typography>
      <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontWeight: 500 }}>
        {record.Time}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <AttendanceStatusChip
          value={state}
          saving={savingStatus}
          editable={canEditStatus}
          onOpenMenu={(e) => onStatusMenuOpen?.(e, record)}
        />
      </Box>
      <DetailsActionButton
        onClick={(e) => {
          e.stopPropagation();
          onDetailsOpen?.(record);
        }}
      />
    </Box>
  );
});

const AttendanceStateVirtualRow = React.memo(function AttendanceStateVirtualRow({
  index,
  style,
  records,
  savingStatusKey,
  onStatusMenuOpen,
  onDetailsOpen,
}) {
  const record = records[index];
  if (!record) return null;
  return (
    <Box style={style} sx={{ width: "100%", boxSizing: "border-box" }}>
      <AttendanceStateRow
        record={record}
        rowIndex={index}
        savingStatus={savingStatusKey === record._rowKey}
        onStatusMenuOpen={onStatusMenuOpen}
        onDetailsOpen={onDetailsOpen}
      />
    </Box>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────
const AllAttendanceRecord = () => {
  const navigate = useNavigate();
  const [personID, setPersonID]           = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");
  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [detailsRecord, setDetailsRecord] = useState(null);
  const [statusMenu, setStatusMenu]       = useState({ anchor: null, record: null });
  const [sortOrder, setSortOrder]         = useState("desc");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [recordDateFilter, setRecordDateFilter] = useState("");
  const [pageLoading, setPageLoading]     = useState(true);
  const [hasSearched, setHasSearched]     = useState(false);
  const [successOverlayOpen, setSuccessOverlayOpen] = useState(false);
  const [statusSuccessDialog, setStatusSuccessDialog] = useState({ open: false, message: "" });
  const [savingStatusKey, setSavingStatusKey] = useState(null);
  const [listHeight, setListHeight]       = useState(420);
  const [departmentAssignmentsMap, setDepartmentAssignmentsMap] = useState({});
  const [empCatMap, setEmpCatMap] = useState({});
  const [sexMap, setSexMap] = useState({});

  const fetchRecordsRef       = useRef(null);
  const requestControllerRef  = useRef(null);
  const loadingRequestIdRef   = useRef(0);
  const isLoadingFetchRef     = useRef(false);
  const queryCacheRef         = useRef(new Map());
  const listContainerRef      = useRef(null);
  const listViewportRef       = useRef(null);

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const monthsShort = MONTHS_SHORT;

  const { hasAccess, loading: accessLoading } = usePageAccess("attendance-form");

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    if (accessLoading || hasAccess === false) return;
    let cancelled = false;
    (async () => {
      try {
        const [assignRes, empCatRes, personsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/department-assignment`, getAuthHeaders()),
          axios.get(
            `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
            getAuthHeaders(),
          ),
          axios.get(`${API_BASE_URL}/personalinfo/person_table`, getAuthHeaders()),
        ]);
        if (cancelled) return;
        if (assignRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(assignRes.value.data) ? assignRes.value.data : []).forEach(
            (a) => {
              if (!a?.employeeNumber) return;
              map[String(a.employeeNumber)] = a.code || "";
            },
          );
          setDepartmentAssignmentsMap(map);
        }
        if (empCatRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(empCatRes.value.data) ? empCatRes.value.data : []).forEach(
            (item) => {
              if (!item.employeeNumber) return;
              const label =
                item.parentGroup && item.typeName
                  ? `${item.parentGroup} | ${item.typeName}`
                  : item.categoryLabel || "";
              if (label) {
                map[String(item.employeeNumber)] = {
                  label,
                  colorHex: item.colorHex || "#757575",
                };
              }
            },
          );
          setEmpCatMap(map);
        }
        if (personsRes.status === "fulfilled") {
          const list = Array.isArray(personsRes.value.data)
            ? personsRes.value.data
            : personsRes.value.data?.data || [];
          const gMap = {};
          list.forEach((p) => {
            const num =
              p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString();
            if (num && p.sex) gMap[num] = p.sex;
          });
          setSexMap(gMap);
        }
      } catch (err) {
        console.error("Error loading employee reference data:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, hasAccess]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getStateTargetUsername = useCallback(() => {
    const u = selectedEmployee?.username;
    if (u) return String(u).trim();
    return String(personID || "").trim();
  }, [selectedEmployee, personID]);

  const getStateMonthLabel = useCallback(
    () =>
      buildAuditPeriodLabel({
        selectedMonth,
        monthNames: monthsShort,
        selectedYear,
        startDate,
        endDate,
      }),
    [selectedMonth, selectedYear, startDate, endDate],
  );

  const auditStateView = useCallback(
    (recordsCount) => {
      const targetId = String(personID || "").trim();
      if (!targetId || !startDate || !endDate) return;
      logAttendanceStateView({
        targetEmployeeNumber: targetId,
        targetUsername: getStateTargetUsername(),
        periodStart: startDate,
        periodEnd: endDate,
        monthLabel: getStateMonthLabel(),
        recordsCount,
      });
    },
    [personID, startDate, endDate, getStateTargetUsername, getStateMonthLabel],
  );

  const fetchRecords = useCallback(async (
    showLoading = true,
    { force = false } = {},
  ) => {
    if (!personID || !startDate || !endDate) return null;
    const normalizedID = String(personID || "").trim();
    const queryKey = `${normalizedID}|${startDate}|${endDate}`;

    setDetailsRecord(null);

    if (!force && queryCacheRef.current.has(queryKey)) {
      const cached = queryCacheRef.current.get(queryKey) || [];
      startTransition(() => setRecords(cached));
      if (showLoading) {
        setLoading(false);
        setSuccessOverlayOpen(true);
      }
      return cached.length;
    }

    let loadingRequestId = 0;
    if (showLoading) {
      loadingRequestId = ++loadingRequestIdRef.current;
      isLoadingFetchRef.current = true;
      setLoading(true);
      setSuccessOverlayOpen(false);
      if (requestControllerRef.current) requestControllerRef.current.abort();
    } else if (isLoadingFetchRef.current) {
      return null;
    }

    setError("");

    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const adjustedStart = new Date(startDate);
      adjustedStart.setDate(adjustedStart.getDate() - 1);
      const adjustedEnd = new Date(endDate);
      adjustedEnd.setDate(adjustedEnd.getDate() + 1);

      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        {
          personID: normalizedID,
          startDate: adjustedStart.toISOString().substring(0, 10),
          endDate: adjustedEnd.toISOString().substring(0, 10),
        },
        { ...getAuthHeaders(), signal: controller.signal },
      );

      const raw = Array.isArray(response.data) ? response.data : [];
      const filteredData = enrichAttendanceRecords(
        raw.filter((record) => {
          const iso = toISODateFromRecord(record?.Date);
          return iso && iso >= startDate && iso <= endDate;
        }),
      );

      queryCacheRef.current.set(queryKey, filteredData);
      if (queryCacheRef.current.size > 20) {
        const firstKey = queryCacheRef.current.keys().next().value;
        queryCacheRef.current.delete(firstKey);
      }

      startTransition(() => setRecords(filteredData));
      if (showLoading) setSuccessOverlayOpen(true);
      return filteredData.length;
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return null;
      console.error("Error fetching attendance records:", err);
      setError("Failed to fetch attendance records");
      return null;
    } finally {
      if (showLoading && loadingRequestId === loadingRequestIdRef.current) {
        isLoadingFetchRef.current = false;
        setLoading(false);
      }
    }
  }, [personID, startDate, endDate]);

  useEffect(() => {
    fetchRecordsRef.current = fetchRecords;
  }, [fetchRecords]);

  useAttendanceRealtimeRefresh(
    useCallback(() => {
      if (!hasSearched || !personID || !startDate || !endDate) return;
      fetchRecordsRef.current?.(false, { force: true });
    }, [hasSearched, personID, startDate, endDate]),
    {
      personId: personID,
      startDate,
      endDate,
      requireDateRange: true,
      matchMode: "strict",
      debounceMs: 250,
    },
  );

  useEffect(() => () => {
    requestControllerRef.current?.abort();
  }, []);

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
    setRecordDateFilter("");
    setHasSearched(false);
    setRecords([]);
  };

  const setQuickDate = (s, e) => {
    setStartDate(s); setEndDate(e);
    setSelectedMonth(null);
    setRecordDateFilter("");
    setHasSearched(false);
    setRecords([]);
  };

  const handleQuickDateSelect = (value) => {
    if (!value) return;
    if (value === "today") { setQuickDate(formattedToday, formattedToday); return; }
    if (value === "yesterday") {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      const s = y.toISOString().substring(0, 10);
      setQuickDate(s, s); return;
    }
    if (value === "last7") {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      setQuickDate(d.toISOString().substring(0, 10), formattedToday); return;
    }
    if (value === "last15") {
      const d = new Date(today); d.setDate(d.getDate() - 15);
      setQuickDate(d.toISOString().substring(0, 10), formattedToday); return;
    }
    if (value === "last30") {
      const d = new Date(today); d.setMonth(d.getMonth() - 1);
      setQuickDate(d.toISOString().substring(0, 10), formattedToday);
    }
  };

  const handleSearch = async () => {
    if (!personID || !startDate || !endDate) {
      setError("Please enter an employee number and select a period.");
      return;
    }
    setError("");
    setHasSearched(true);
    const count = await fetchRecords(true, { force: true });
    if (count > 0) {
      auditStateView(count);
    }
  };

  const handleSort = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");

  const handleStatusMenuOpen = useCallback((event, record) => {
    event.stopPropagation();
    setStatusMenu({ anchor: event.currentTarget, record });
  }, []);

  const handleStatusMenuClose = useCallback(() => {
    setStatusMenu({ anchor: null, record: null });
  }, []);

  const handleDetailsOpen = useCallback((record) => {
    setDetailsRecord(record);
  }, []);

  const handleStatusChange = useCallback(async (record, newState) => {
    const ts = record?.AttendanceDateTime;
    const previousState = Number(record?.AttendanceState);
    const nextState = Number(newState);
    if (!ts || !Number.isFinite(nextState) || previousState === nextState) return;

    const rowKey = record._rowKey;
    setSavingStatusKey(rowKey);
    setError("");
    setStatusSuccessDialog({ open: false, message: "" });

    try {
      await axios.patch(
        `${API_BASE_URL}/attendance/api/attendance-record-state`,
        {
          personID: record.PersonID,
          attendanceDateTime: ts,
          attendanceState: nextState,
        },
        getAuthHeaders(),
      );

      const applyUpdate = (rows) =>
        rows.map((r) =>
          r._rowKey === rowKey ? { ...r, AttendanceState: nextState } : r,
        );

      startTransition(() => {
        setRecords((prev) => {
          const updated = applyUpdate(prev);
          const queryKey = `${String(personID || "").trim()}|${startDate}|${endDate}`;
          if (queryCacheRef.current.has(queryKey)) {
            queryCacheRef.current.set(queryKey, applyUpdate(queryCacheRef.current.get(queryKey) || []));
          }
          return updated;
        });
      });

      setStatusSuccessDialog({
        open: true,
        message: `Status updated to ${getAttendanceLabel(nextState)}. DTR will reflect the corrected punch.`,
      });

      logAttendanceStateChange({
        targetEmployeeNumber: String(record.PersonID || personID || "").trim(),
        targetUsername: getStateTargetUsername(),
        periodStart: startDate,
        periodEnd: endDate,
        monthLabel: getStateMonthLabel(),
        punchDate: record.Date,
        punchTime: record.Time,
        previousState,
        newState: nextState,
      });

      setDetailsRecord((prev) =>
        prev?._rowKey === rowKey ? { ...prev, AttendanceState: nextState } : prev,
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update attendance status");
    } finally {
      setSavingStatusKey(null);
    }
  }, [personID, startDate, endDate, getStateTargetUsername, getStateMonthLabel]);

  const handleStatusPick = useCallback((newState) => {
    const record = statusMenu.record;
    handleStatusMenuClose();
    if (record) handleStatusChange(record, newState);
  }, [statusMenu.record, handleStatusMenuClose, handleStatusChange]);

  const filteredRecords = useMemo(() => {
    const visibleRecords = recordDateFilter
      ? records.filter((record) => record._isoDate === recordDateFilter)
      : records;
    return [...visibleRecords].sort((a, b) => {
      const diff = (a._sortTs ?? 0) - (b._sortTs ?? 0);
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [records, sortOrder, recordDateFilter]);

  const virtualListRowProps = useMemo(
    () => ({
      records: filteredRecords,
      savingStatusKey,
      onStatusMenuOpen: handleStatusMenuOpen,
      onDetailsOpen: handleDetailsOpen,
    }),
    [filteredRecords, savingStatusKey, handleStatusMenuOpen, handleDetailsOpen],
  );

  useEffect(() => {
    const el = listViewportRef.current;
    if (!el) return undefined;
    const measure = () => {
      const next = Math.max(240, Math.floor(el.clientHeight));
      setListHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasSearched, records.length, filteredRecords.length]);

  const displayEmployee = useMemo(() => {
    if (selectedEmployee) return toProfileEmployee(selectedEmployee);
    if (!personID) return null;
    return { employeeNumber: personID };
  }, [selectedEmployee, personID]);

  const handleWorkflowHydrate = useCallback((payload) => {
    setPersonID(payload.employeeNumber);
    setStartDate(payload.startDate);
    setEndDate(payload.endDate);
    if (payload.selectedYear != null) setSelectedYear(payload.selectedYear);
    if (payload.selectedMonth != null) setSelectedMonth(payload.selectedMonth);
    setHasSearched(true);
    setTimeout(() => {
      fetchRecordsRef.current?.(true, { force: true });
    }, 250);
  }, []);

  const {
    prevStep,
    nextStep,
    goPrevious,
    goNext,
  } = useAttendanceWorkflow("state", {
    employeeNumber: personID,
    startDate,
    endDate,
    onHydrate: handleWorkflowHydrate,
  });

  useAttendanceCompactPage();

  const handleGoToModification = () => {
    if (!personID || !startDate || !endDate) {
      setError("Please enter an employee number and select a period.");
      return;
    }
    const fullName = selectedEmployee
      ? String(selectedEmployee.name || selectedEmployee.fullName || "").trim()
      : "";
    navigateAttendanceWorkflow(navigate, "modification", {
      employeeNumber: personID,
      fullName,
      startDate,
      endDate,
    });
  };

  const handleEmployeeSelect = (emp, num) => {
    if (emp && typeof emp === "object") {
      setSelectedEmployee(toProfileEmployee(emp));
      setPersonID(getEmployeeIdentifier(emp) || num || "");
    } else {
      setSelectedEmployee(null);
      setPersonID(num || "");
    }
    setHasSearched(false);
    setRecords([]);
  };

  // ── Guards ──
  if (pageLoading || accessLoading) return <AllAttendanceWireframe />;
  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Form."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  // ─── Left panel ────────────────────────────────────────────────────────
  const renderLeftPanel = () => (
    <Box sx={filterPanelBoxSx}>
      <AttendanceEmployeeSearchSection selected={Boolean(displayEmployee)}>
        <AttendanceEmployeeSearchField
          searchApi="remittance"
          value={personID}
          selectedEmployee={selectedEmployee}
          onSelectEmployee={handleEmployeeSelect}
          onClear={() => handleEmployeeSelect(null, "")}
          deptMap={departmentAssignmentsMap}
          empCatMap={empCatMap}
          sexMap={sexMap}
        />
      </AttendanceEmployeeSearchSection>
      {displayEmployee && (
        <Box sx={{ mb: 0.75 }}>
          <EmployeeProfileCard
            employee={displayEmployee}
            deptMap={departmentAssignmentsMap}
            empCatMap={empCatMap}
            sexMap={sexMap}
            loading={loading}
          />
        </Box>
      )}

      <AttendanceFilterDateControls
        selectedYear={selectedYear}
        onYearChange={(e) => {
          setSelectedYear(parseInt(e.target.value));
          setSelectedMonth(null);
          setHasSearched(false);
          setRecords([]);
        }}
        yearOptions={yearOptions}
        selectedMonth={selectedMonth}
        onMonthClick={handleMonthClick}
        onMonthClear={() => {
          setSelectedMonth(null);
          setStartDate("");
          setEndDate("");
          setRecords([]);
          setHasSearched(false);
        }}
        onQuickDate={handleQuickDateSelect}
      />

      <AccentButton
          variant="contained"
          fullWidth
          onClick={handleSearch}
          startIcon={<Search sx={{ fontSize: "14px !important" }} />}
          sx={{
            borderRadius: "6px",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.74rem",
            py: 0.6,
            mb: 0.75,
            bgcolor: T.accent,
            color: "#fff",
            boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
            "&:hover": { bgcolor: T.accentDark },
          }}
        >
          Fetch Records
        </AccentButton>

        <AttendanceFilterSummaryBox
          title="Record Summary"
          primary={
            loading
              ? "Loading records..."
              : hasSearched
                ? recordDateFilter
                  ? `${filteredRecords.length} of ${records.length} ${records.length === 1 ? "record" : "records"} shown`
                  : `${records.length} ${records.length === 1 ? "record" : "records"} found`
                : "No records loaded"
          }
          secondary={
            loading
              ? "Fetching attendance data..."
              : hasSearched
                ? startDate && endDate ? `${startDate} → ${endDate}` : "Search complete."
                : "Select month and fetch records."
          }
        />

        <Box sx={{ mt: 1, px: 0.25 }}>
          <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: alpha(T.accent, 0.75), mb: 0.5, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Search Date (Within Loaded Records)
          </Typography>
          <FieldInput
            fullWidth
            size="small"
            type="date"
            value={recordDateFilter}
            disabled={!hasSearched || records.length === 0}
            onChange={(e) => setRecordDateFilter(e.target.value)}
            inputProps={{ min: startDate || undefined, max: endDate || undefined }}
          />
          {recordDateFilter && (
            <Typography
              onClick={() => setRecordDateFilter("")}
              sx={{ fontSize: "0.68rem", color: T.accent, fontWeight: 700, mt: 0.45, cursor: "pointer", width: "fit-content", "&:hover": { textDecoration: "underline" } }}
            >
              Clear date filter
            </Typography>
          )}
        </Box>
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={150}>
      <Box>
        <style>{shimmerKf}</style>

        <Box sx={ATTENDANCE_COMPACT_PAGE_SX}>
          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
            <Box
              sx={{
                px: 4, py: 3,
                background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                position: "relative", overflow: "hidden",
              }}
            >
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)" }} />
              <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)" }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <Search sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Attendance Record State
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    Administrative Panel - Review individual attendance record states
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
                <AttendanceWorkflowNav
                  inline
                  prevStep={prevStep}
                  nextStep={nextStep}
                  onPrevious={goPrevious}
                  onNext={goNext}
                />
                <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                  <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700 }}>System Generated</Typography>
                </Box>
                {records.length > 0 && (
                  <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                    <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }}>
                      {records.length} records
                    </Typography>
                  </Box>
                )}
                <IconButton
                  onClick={() => fetchRecords(true, { force: true })}
                  disabled={!personID || !startDate || !endDate}
                  sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}
                >
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          </SectionCard>

          {/* Error alert */}
          <Collapse in={!!error}>
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem" }}>
              {error}
            </Alert>
          </Collapse>

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>

            {/* LEFT: Sidebar */}
            <Grid item xs={12} lg={3}>
              <SectionCard sx={filterSidebarCardSx}>
                <AttendanceFilterHeader />
                {renderLeftPanel()}
              </SectionCard>
            </Grid>

            {/* RIGHT: Records */}
            <Grid item xs={12} lg={9}>
              <SectionCard sx={{ ...attendanceMainPanelHeightSx, display: "flex", flexDirection: "column", position: "relative" }}>

                {/* Toolbar */}
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Assignment sx={{ fontSize: 15, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>
                        Attendance States
                      </Typography>
                    </Box>
                    {records.length > 0 && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontWeight: 600 }}>
                          {filteredRecords.length.toLocaleString()} punch{filteredRecords.length === 1 ? "" : "es"}
                        </Typography>
                        <AccentButton
                          variant="contained"
                          size="small"
                          startIcon={<Edit sx={{ fontSize: "13px !important" }} />}
                          onClick={handleGoToModification}
                          sx={{
                            fontSize: "0.78rem",
                            bgcolor: T.accent,
                            color: "#fff",
                            boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
                            "&:hover": { bgcolor: T.accentDark },
                          }}
                        >
                          Go to Attendance Modification
                        </AccentButton>
                        <RowBtn
                          icon={sortOrder === "asc"
                            ? <KeyboardArrowUp sx={{ fontSize: 13 }} />
                            : <KeyboardArrowDown sx={{ fontSize: 13 }} />}
                          label={`Sort ${sortOrder === "asc" ? "Newest First" : "Oldest First"}`}
                          color={T.accent}
                          hoverBg={T.accentFaint}
                          onClick={handleSort}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Records area */}
                <Box
                  ref={listContainerRef}
                  sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {!hasSearched || !personID ? (
                    <Box sx={{ py: 10, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                        <Person sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>
                        Select an Employee & Period
                      </Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                        {!personID
                          ? "Enter an employee number and select a month from the left panel."
                          : "Click Fetch Records to load attendance data."}
                      </Typography>
                    </Box>
                  ) : (records.length === 0 || filteredRecords.length === 0) && !loading ? (
                    <Box sx={{ py: 10, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                        <Info sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>
                        {records.length === 0 ? "No records found" : "No records for selected date"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                        {records.length === 0
                          ? "Try adjusting your date range or employee number."
                          : "Try another date within your loaded range or clear the date filter."}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                      {/* Column headers */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
                          px: 2.5,
                          py: 1.25,
                          bgcolor: T.accent,
                          gap: 2,
                          flexShrink: 0,
                        }}
                      >
                        {[
                          { label: "DATE", sortable: true },
                          { label: "TIME" },
                          { label: "STATUS" },
                          { label: "DETAILS" },
                        ].map(({ label, sortable }) => (
                          <Typography
                            key={label}
                            onClick={sortable ? handleSort : undefined}
                            sx={{
                              color: "#fff",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              letterSpacing: "0.07em",
                              cursor: sortable ? "pointer" : "default",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              userSelect: "none",
                              "&:hover": sortable ? { opacity: 0.8 } : {},
                            }}
                          >
                            {label}
                            {sortable &&
                              (sortOrder === "asc" ? (
                                <KeyboardArrowUp sx={{ fontSize: 14 }} />
                              ) : (
                                <KeyboardArrowDown sx={{ fontSize: 14 }} />
                              ))}
                          </Typography>
                        ))}
                      </Box>

                      <Box ref={listViewportRef} sx={{ flex: 1, minHeight: 0 }}>
                        <VirtualList
                          rowCount={filteredRecords.length}
                          rowHeight={STATE_ROW_HEIGHT}
                          rowComponent={AttendanceStateVirtualRow}
                          rowProps={virtualListRowProps}
                          overscanCount={12}
                          style={{ height: listHeight, width: "100%" }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>

                <Menu
                  anchorEl={statusMenu.anchor}
                  open={Boolean(statusMenu.anchor)}
                  onClose={handleStatusMenuClose}
                >
                  {ATTENDANCE_STATE_OPTIONS.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      selected={Number(statusMenu.record?.AttendanceState) === opt.value}
                      onClick={() => handleStatusPick(opt.value)}
                      sx={{ fontSize: "0.78rem" }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {getAttendanceIcon(opt.value)}
                        {opt.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Menu>

                <AttendanceStateDetailsDialog
                  record={detailsRecord}
                  open={Boolean(detailsRecord)}
                  onClose={() => setDetailsRecord(null)}
                  onStatusMenuOpen={handleStatusMenuOpen}
                  savingStatus={Boolean(detailsRecord && savingStatusKey === detailsRecord._rowKey)}
                />

                <StatusUpdateSuccessDialog
                  open={statusSuccessDialog.open}
                  message={statusSuccessDialog.message}
                  onClose={() => setStatusSuccessDialog({ open: false, message: "" })}
                />

                {/* Footer legend */}
                {records.length > 0 && (
                  <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
                    {[
                      { icon: <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />, label: "Time IN / Time OUT" },
                      { icon: <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />, label: "Breaktime OUT / Breaktime IN" },
                      { icon: <Cancel      sx={{ fontSize: 13, color: "#f44336" }} />, label: "Uncategorized" },
                      { icon: <Assignment sx={{ fontSize: 13, color: T.accent }} />, label: "Click status to change punch type" },
                      { icon: <Info sx={{ fontSize: 13, color: T.accent }} />, label: "Details opens a single record panel" },
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        {item.icon}
                        <Typography sx={{ fontSize: "0.7rem", color: T.faint }}>{item.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        </Box>

        {/* Scroll to top FAB */}
        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{
              position: "fixed", bottom: 24, right: 45, zIndex: 1000,
              bgcolor: T.accent, color: "#fff",
              "&:hover": { bgcolor: T.accentDark },
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

        {/* Unified loading & success overlays — matches AttendanceUserState */}
        <LoadingOverlay
          open={loading}
          message="Fetching attendance records…"
          showDelayMs={0}
          minVisibleMs={0}
        />
        <SuccessfulOverlay
          open={successOverlayOpen}
          onClose={() => setSuccessOverlayOpen(false)}
          message="Attendance records loaded"
        />
      </Box>
    </Fade>
  );
};

export default AllAttendanceRecord;