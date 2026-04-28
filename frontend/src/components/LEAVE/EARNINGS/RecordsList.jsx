import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Autocomplete,
  TextField,
  Alert,
  Fade,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Paper,
  Tabs,
  Tab,
  Checkbox,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  EventNote as LeaveIcon,
  WorkHistory as SCIcon,
  AccessTime as CTOIcon,
  Close,
  Person as PersonIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  CalendarToday as CalIcon,
  MonetizationOn as EarnIcon,
  Pending as PendingIcon,
  Domain as DeptIcon,
  Work as WorkIcon,
  Today as DayIcon,
  Schedule as HourIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  AccessTimeFilled as LateIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  PersonOff as AbsentIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  DateRange as DateRangeIcon,
  EventAvailable as PresentIcon,
  Calculate as CalculateIcon,
  SwapHoriz as ConvertIcon,
  OpenInNew as OpenInNewIcon,
  RemoveCircleOutline as DeductIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.12)",
  headerGrad: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider: "rgba(0,0,0,0.08)",
  surface: "#ffffff",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#888888",
  poppins: "'Poppins', sans-serif",
  statusPending: {
    bg: "rgba(0,0,0,0.04)",
    color: "#7a4a00",
    border: "rgba(0,0,0,0.12)",
  },
  statusApproved: {
    bg: "rgba(0,0,0,0.04)",
    color: "#1e4d20",
    border: "rgba(0,0,0,0.12)",
  },
  statusRejected: {
    bg: "rgba(0,0,0,0.04)",
    color: "#6b1a1a",
    border: "rgba(0,0,0,0.12)",
  },
};

const MONTHS = [
  { value: "1", label: "January", short: "Jan" },
  { value: "2", label: "February", short: "Feb" },
  { value: "3", label: "March", short: "Mar" },
  { value: "4", label: "April", short: "Apr" },
  { value: "5", label: "May", short: "May" },
  { value: "6", label: "June", short: "Jun" },
  { value: "7", label: "July", short: "Jul" },
  { value: "8", label: "August", short: "Aug" },
  { value: "9", label: "September", short: "Sep" },
  { value: "10", label: "October", short: "Oct" },
  { value: "11", label: "November", short: "Nov" },
  { value: "12", label: "December", short: "Dec" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

const getCalendarDays = (year, month) => new Date(year, month, 0).getDate();

const EARN_STATUS = {
  pending: { label: "Pending", ...T.statusPending, icon: PendingIcon },
  approved: { label: "Approved", ...T.statusApproved, icon: CheckIcon },
  rejected: { label: "Rejected", ...T.statusRejected, icon: WarnIcon },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All", color: "#555" },
  { value: "pending", label: "Pending", color: "#7a4a00" },
  { value: "approved", label: "Approved", color: "#1e4d20" },
  { value: "rejected", label: "Rejected", color: "#6b1a1a" },
];

const monthName = (m) =>
  MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
const monthShort = (m) =>
  MONTHS.find((x) => x.value === String(m))?.short || `M${m}`;
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toHours = (val, unit) => (unit === "days" ? val * 8 : val);
const fmtHrs = (h, unit) =>
  unit === "hours"
    ? `${toNum(h).toFixed(3)} hrs`
    : `${(toNum(h) / 8).toFixed(3)} days`;

const parseHHMM = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return (
      Number(parts[0]) +
      Number(parts[1] || 0) / 60 +
      Number(parts[2] || 0) / 3600
    );
  }
  return parseFloat(str) || 0;
};

const hoursToHHMM = (h) => {
  const total = Math.round(h * 3600);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const hrsToHMS = (h) => {
  const totalSec = Math.round(Math.abs(h) * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes emFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes attPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
`;

const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Conversion defaults ──────────────────────────────────────────────────────
const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "8hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));
const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "6hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));
const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute",
  day_type: "minute",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));
const DEFAULT_LWP_TABLE = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  e: Number(((i + 1) * 0.04167).toFixed(3)),
}));
const DEFAULT_ABS_TABLE = [
  { a: 0.5, e: 1.229 },
  { a: 1.0, e: 1.208 },
  { a: 1.5, e: 1.188 },
  { a: 2.0, e: 1.167 },
  { a: 2.5, e: 1.146 },
  { a: 3.0, e: 1.125 },
  { a: 3.5, e: 1.104 },
  { a: 4.0, e: 1.083 },
  { a: 4.5, e: 1.063 },
  { a: 5.0, e: 1.042 },
  { a: 5.5, e: 1.021 },
  { a: 6.0, e: 1.0 },
  { a: 6.5, e: 0.979 },
  { a: 7.0, e: 0.958 },
  { a: 7.5, e: 0.938 },
  { a: 8.0, e: 0.917 },
  { a: 8.5, e: 0.854 },
  { a: 9.0, e: 0.833 },
  { a: 9.5, e: 0.875 },
  { a: 10.0, e: 0.833 },
  { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 },
  { a: 11.5, e: 0.771 },
  { a: 12.0, e: 0.75 },
  { a: 12.5, e: 0.729 },
  { a: 13.0, e: 0.708 },
  { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 },
  { a: 14.5, e: 0.646 },
  { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 },
  { a: 16.0, e: 0.583 },
  { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 },
  { a: 17.5, e: 0.521 },
  { a: 18.0, e: 0.5 },
  { a: 18.5, e: 0.479 },
  { a: 19.0, e: 0.458 },
  { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 },
  { a: 20.5, e: 0.396 },
  { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 },
  { a: 22.0, e: 0.333 },
  { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 },
  { a: 23.5, e: 0.271 },
  { a: 24.0, e: 0.25 },
  { a: 24.5, e: 0.229 },
  { a: 25.0, e: 0.208 },
  { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 },
  { a: 26.5, e: 0.146 },
  { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 },
  { a: 28.0, e: 0.083 },
  { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 },
  { a: 29.5, e: 0.021 },
];

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

// ─── Styled components ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  overflow: "hidden",
  background: T.surface,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
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

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const meta = EARN_STATUS[status] || EARN_STATUS.pending;
  const Icon = meta.icon;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        px: 0.9,
        py: 0.2,
        borderRadius: "20px",
        bgcolor: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <Icon sx={{ fontSize: 9, color: meta.color }} />
      <Typography
        sx={{
          fontSize: "0.6rem",
          fontWeight: 700,
          color: meta.color,
          fontFamily: T.poppins,
        }}
      >
        {meta.label}
      </Typography>
    </Box>
  );
};

const DeptBadge = ({ code }) =>
  !code ? null : (
    <Chip
      size="small"
      icon={<DeptIcon style={{ fontSize: 10, color: T.muted }} />}
      label={code}
      sx={{
        height: 18,
        fontSize: "0.62rem",
        fontWeight: 700,
        bgcolor: "rgba(0,0,0,0.05)",
        color: "#333",
        border: "1px solid rgba(0,0,0,0.1)",
        "& .MuiChip-label": { px: 0.75 },
      }}
    />
  );

const EmpCatBadge = ({ label, colorHex }) => {
  if (!label) return null;
  const color = colorHex || "#757575";
  return (
    <Chip
      size="small"
      icon={<WorkIcon style={{ fontSize: 10, color }} />}
      label={label}
      sx={{
        height: 18,
        fontSize: "0.62rem",
        fontWeight: 700,
        bgcolor: alpha(color, 0.08),
        color: "#333",
        border: `1px solid ${alpha(color, 0.25)}`,
        maxWidth: 180,
        "& .MuiChip-label": {
          px: 0.75,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      }}
    />
  );
};

// ─── Reject Dialog ─────────────────────────────────────────────────────────────
const RejectDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          fontFamily: T.poppins,
          fontWeight: 700,
          fontSize: "0.95rem",
          color: T.accent,
        }}
      >
        Reject Earning Entry
      </DialogTitle>
      <DialogContent>
        <FieldInput
          fullWidth
          multiline
          rows={3}
          size="small"
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Insufficient OT documentation…"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: "none", color: T.muted, fontFamily: T.poppins }}
        >
          Cancel
        </Button>
        <AccentButton
          variant="contained"
          onClick={() => onConfirm(reason)}
          disabled={loading}
          sx={{ bgcolor: "#6b1a1a", "&:hover": { bgcolor: "#4a1010" } }}
        >
          {loading ? (
            <CircularProgress size={14} sx={{ color: "#fff" }} />
          ) : (
            "Reject"
          )}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── Earning Record Row ────────────────────────────────────────────────────────
const EarningRow = ({
  record,
  unit,
  type,
  onApprove,
  onReject,
  showTypeBadge,
  onViewAudit,
}) => {
  const earnH = toNum(record.earned_hours ?? record.total_hours);
  const status = record.earn_status || "pending";
  const isTardinessDeduction = record.entry_type === "TARDINESS_DEDUCTION";
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        border: `1px solid ${isTardinessDeduction ? "rgba(198,40,40,0.15)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 2,
        bgcolor: isTardinessDeduction ? "rgba(198,40,40,0.02)" : "#fff",
        mb: 0.75,
        animation: "emFadeUp 0.25s ease",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
              mb: 0.4,
            }}
          >
            {/* Type badge — only shown in "all" view */}
            {showTypeBadge && <TypeBadge type={type} />}
 
            <Typography
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#1a1a1a",
                fontFamily: T.poppins,
              }}
            >
              {record.period_year}
              {record.period_month
                ? ` · ${monthShort(record.period_month)}`
                : ""}
              {record.leave_code && ` · ${record.leave_code}`}
              {record.sc_type &&
                record.sc_type !== "commutative" &&
                record.sc_type !== "non_commutative" &&
                ` · SC (${String(record.sc_type).replace(/_/g, " ")})`}
              {type === "cto" && !record.sc_type && ` · CTO`}
            </Typography>
            <StatusBadge status={status} />
            {isTardinessDeduction && (
              <Chip
                size="small"
                icon={<DeductIcon style={{ fontSize: 9, color: "#c62828" }} />}
                label="Tardiness Deduction"
                sx={{
                  height: 16,
                  fontSize: "0.56rem",
                  fontWeight: 700,
                  bgcolor: "rgba(198,40,40,0.08)",
                  color: "#c62828",
                  border: "1px solid rgba(198,40,40,0.2)",
                }}
              />
            )}
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "baseline", gap: 0.4, mb: 0.25 }}
          >
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: T.faint,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: T.poppins,
              }}
            >
              {earnH < 0 ? "Deducted" : "Earned"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.82rem",
                fontWeight: 800,
                color: earnH < 0 ? "#c62828" : "#1a1a1a",
                fontFamily: T.poppins,
              }}
            >
              {earnH < 0 ? "−" : ""}
              {fmtHrs(Math.abs(earnH), unit)}
            </Typography>
          </Box>
          {record.created_at && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                color: T.faint,
                fontFamily: T.poppins,
                mt: 0.15,
              }}
            >
              Added{" "}
              {new Date(record.created_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              {new Date(record.created_at).toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
          {record.remarks && (
            <Typography
              sx={{
                fontSize: "0.65rem",
                color: T.muted,
                fontFamily: T.poppins,
              }}
            >
              {record.remarks}
            </Typography>
          )}
          {record.approved_by && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                color: T.faint,
                fontFamily: T.poppins,
                mt: 0.2,
              }}
            >
              {status === "approved" ? "Approved" : "Rejected"} by{" "}
              {record.approved_by}
              {record.rejected_reason ? ` — "${record.rejected_reason}"` : ""}
            </Typography>
          )}
        </Box>
 
        {/* Actions column */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
            flexShrink: 0,
          }}
        >
          <StatusBadge status={status} />

          <Box
            onClick={() => onViewAudit && onViewAudit(record)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              px: 0.9,
              py: 0.35,
              borderRadius: 1.5,
              bgcolor: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.10)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: "rgba(0,0,0,0.06)",
                transform: "translateY(-1px)",
              },
            }}
            title="View earnings audit trail"
          >
            <HistoryIcon sx={{ fontSize: 12, color: T.faint }} />
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                color: T.faint,
                fontFamily: T.poppins,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Audit
            </Typography>
          </Box>
 
          {status === "pending" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box
                onClick={() => onApprove(record)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: "rgba(46,125,50,0.07)",
                  border: "1px solid rgba(46,125,50,0.22)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "rgba(46,125,50,0.14)",
                    border: "1px solid rgba(46,125,50,0.4)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <ApproveIcon sx={{ fontSize: 11, color: "#2e7d32" }} />
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#2e7d32",
                    fontFamily: T.poppins,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Approve
                </Typography>
              </Box>
 
              <Box
                onClick={() => onReject(record)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: "rgba(198,40,40,0.07)",
                  border: "1px solid rgba(198,40,40,0.22)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "rgba(198,40,40,0.14)",
                    border: "1px solid rgba(198,40,40,0.4)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <RejectIcon sx={{ fontSize: 11, color: "#c62828" }} />
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#c62828",
                    fontFamily: T.poppins,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Reject
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
// ─── Pagination Controls ───────────────────────────────────────────────────────
const PaginationControls = ({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
  filteredCount,
}) => {
  const start = totalPages === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredCount);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        py: 0.75,
        borderTop: `1px solid ${T.divider}`,
        bgcolor: "rgba(0,0,0,0.015)",
        flexShrink: 0,
        flexWrap: "wrap",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}
        >
          Rows:
        </Typography>
        <FormControl size="small" sx={{ minWidth: 54 }}>
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: T.accent,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: T.accentBorder,
              },
              bgcolor: "#fff",
              borderRadius: 1,
              height: 22,
              "& .MuiSelect-select": { py: "1px", pl: "6px" },
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <MenuItem key={n} value={n} sx={{ fontSize: "0.72rem" }}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography
          sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}
        >
          {filteredCount > 0 ? `${start}–${end} of ${filteredCount}` : "0"}
          {filteredCount !== totalCount && (
            <span style={{ color: T.faint }}>
              {" "}
              (filtered from {totalCount})
            </span>
          )}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <IconButton
          size="small"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          sx={{ p: 0.25, color: page === 1 ? T.faint : T.accent }}
        >
          <PrevIcon sx={{ fontSize: 13 }} />
          <PrevIcon sx={{ fontSize: 13, ml: -1 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          sx={{ p: 0.25, color: page === 1 ? T.faint : T.accent }}
        >
          <PrevIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let p;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <Box
                key={p}
                onClick={() => onPageChange(p)}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  bgcolor: p === page ? T.accent : "transparent",
                  border: `1px solid ${p === page ? T.accent : T.accentBorder}`,
                  "&:hover": {
                    bgcolor: p === page ? T.accentDark : "rgba(109,35,35,0.06)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.58rem",
                    fontWeight: p === page ? 800 : 500,
                    color: p === page ? "#fff" : T.accent,
                    fontFamily: T.poppins,
                  }}
                >
                  {p}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <IconButton
          size="small"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          sx={{ p: 0.25, color: page >= totalPages ? T.faint : T.accent }}
        >
          <NextIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || totalPages === 0}
          sx={{ p: 0.25, color: page >= totalPages ? T.faint : T.accent }}
        >
          <NextIcon sx={{ fontSize: 13 }} />
          <NextIcon sx={{ fontSize: 13, ml: -1 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

// ─── Status Filter Bar ─────────────────────────────────────────────────────────
const StatusFilterBar = ({ statusFilter, onStatusFilter, counts }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.5,
      py: 0.6,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "rgba(0,0,0,0.015)",
      flexShrink: 0,
      flexWrap: "wrap",
    }}
  >
    <FilterIcon sx={{ fontSize: 11, color: T.faint }} />
    {STATUS_FILTER_OPTIONS.map((opt) => {
      const count = counts[opt.value] ?? 0;
      const active = statusFilter === opt.value;
      return (
        <Box
          key={opt.value}
          onClick={() => onStatusFilter(opt.value)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.4,
            px: 0.9,
            py: 0.25,
            borderRadius: "20px",
            cursor: "pointer",
            border: `1px solid ${active ? opt.color : "rgba(0,0,0,0.1)"}`,
            bgcolor: active ? alpha(opt.color, 0.1) : "transparent",
            transition: "all 0.15s",
            "&:hover": {
              bgcolor: alpha(opt.color, 0.08),
              borderColor: opt.color,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: active ? 800 : 500,
              color: active ? opt.color : T.faint,
              fontFamily: T.poppins,
            }}
          >
            {opt.label}
          </Typography>
          {opt.value !== "all" && (
            <Box
              sx={{
                minWidth: 14,
                height: 14,
                borderRadius: "7px",
                bgcolor: active ? opt.color : "rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.5rem",
                  fontWeight: 800,
                  color: active ? "#fff" : T.faint,
                  fontFamily: T.poppins,
                  lineHeight: 1,
                }}
              >
                {count}
              </Typography>
            </Box>
          )}
        </Box>
      );
    })}
  </Box>
);

const TYPE_META = {
  leave: {
    label: "Leave",
    color: "#6d2323",
    bg: "rgba(109,35,35,0.08)",
    border: "rgba(109,35,35,0.22)",
    icon: LeaveIcon,
  },
  sc: {
    label: "SC",
    color: "#1565c0",
    bg: "rgba(21,101,192,0.08)",
    border: "rgba(21,101,192,0.22)",
    icon: SCIcon,
  },
  cto: {
    label: "CTO",
    color: "#2e7d32",
    bg: "rgba(46,125,50,0.08)",
    border: "rgba(46,125,50,0.22)",
    icon: CTOIcon,
  },
};
 
const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types", color: "#555" },
  { value: "leave", label: "Leave", color: TYPE_META.leave.color },
  { value: "sc", label: "SC", color: TYPE_META.sc.color },
  { value: "cto", label: "CTO", color: TYPE_META.cto.color },
];
 
// Badge shown on each earning row when viewing "all" types
const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.35,
        px: 0.75,
        py: 0.15,
        borderRadius: "20px",
        bgcolor: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <Icon sx={{ fontSize: 9, color: meta.color }} />
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontWeight: 800,
          color: meta.color,
          fontFamily: T.poppins,
          letterSpacing: "0.05em",
        }}
      >
        {meta.label}
      </Typography>
    </Box>
  );
};
 
// ─── Type Filter Bar ──────────────────────────────────────────────────────────
const TypeFilterBar = ({ typeFilter, onTypeFilter, typeCounts }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.5,
      py: 0.55,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: alpha(T.accent, 0.03),
      flexShrink: 0,
      flexWrap: "wrap",
    }}
  >
    {/* Label */}
    <Typography
      sx={{
        fontSize: "0.56rem",
        fontWeight: 800,
        color: T.faint,
        fontFamily: T.poppins,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        mr: 0.25,
      }}
    >
      Type
    </Typography>
 
    {TYPE_FILTER_OPTIONS.map((opt) => {
      const count = typeCounts[opt.value] ?? 0;
      const active = typeFilter === opt.value;
      return (
        <Box
          key={opt.value}
          onClick={() => onTypeFilter(opt.value)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.4,
            px: 0.85,
            py: 0.2,
            borderRadius: "20px",
            cursor: "pointer",
            border: `1px solid ${active ? opt.color : "rgba(0,0,0,0.1)"}`,
            bgcolor: active ? alpha(opt.color, 0.1) : "transparent",
            transition: "all 0.15s",
            "&:hover": {
              bgcolor: alpha(opt.color, 0.08),
              borderColor: opt.color,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: active ? 800 : 500,
              color: active ? opt.color : T.faint,
              fontFamily: T.poppins,
            }}
          >
            {opt.label}
          </Typography>
          {/* count bubble (skip "all" — it's implied by total) */}
          {opt.value !== "all" && (
            <Box
              sx={{
                minWidth: 14,
                height: 14,
                borderRadius: "7px",
                bgcolor: active ? opt.color : "rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.5rem",
                  fontWeight: 800,
                  color: active ? "#fff" : T.faint,
                  fontFamily: T.poppins,
                  lineHeight: 1,
                }}
              >
                {count}
              </Typography>
            </Box>
          )}
        </Box>
      );
    })}
  </Box>
);

// ─── Column Header ─────────────────────────────────────────────────────────────
const ColHeader = ({ icon: Icon, label, color = T.accent, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 1.5,
      py: 1,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "rgba(0,0,0,0.02)",
      flexShrink: 0,
    }}
  >
    <Icon sx={{ fontSize: 13, color }} />
    <Typography
      sx={{
        fontSize: "0.65rem",
        fontWeight: 800,
        color,
        fontFamily: T.poppins,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        flex: 1,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

// ─── Records List (Column 2) ───────────────────────────────────────────────────
const RecordsList = ({
  employeeNumber,
  type,          // the tab's native type ("leave" | "sc" | "cto")
  unit,
  refreshKey,
  year,
  month,
  onApproved,
  standalone,
  onStatusChange,
}) => {
  const [data, setData] = useState({ earnings: [], balances: [] });
  const [loading, setLoading] = useState(false);
 
  // ── NEW: type filter (independent of the tab) ──
  const [typeFilter, setTypeFilter] = useState("all");
 
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    record: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const [auditDialog, setAuditDialog] = useState({
    open: false,
    record: null,
    rows: [],
    loading: false,
    error: "",
  });
 
  // ── fetch: all three or just one type ────────────────────────────────────
  const fetchEarnings = useCallback(async () => {
    if (!employeeNumber) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const qs = `?year=${year}&month=${month}`;
 
      // Always fetch all three so type-counts stay accurate regardless of filter
      const [leaveRes, scRes, ctoRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/earnings/leave/${employeeNumber}${qs}`, h),
        axios.get(`${API_BASE_URL}/api/earnings/sc/${employeeNumber}${qs}`, h),
        axios.get(`${API_BASE_URL}/api/earnings/cto/${employeeNumber}${qs}`, h),
      ]);
 
      const tag = (rows, t) =>
        (rows || []).map((r) => ({ ...r, _earningType: t }));
 
      const allEarnings = [
        ...tag(leaveRes.status === "fulfilled" ? leaveRes.value.data?.earnings : [], "leave"),
        ...tag(scRes.status  === "fulfilled" ? scRes.value.data?.earnings  : [], "sc"),
        ...tag(ctoRes.status === "fulfilled" ? ctoRes.value.data?.earnings : [], "cto"),
      ];
 
      setData({ earnings: allEarnings, balances: [] });
    } catch {
      setData({ earnings: [], balances: [] });
    }
    setLoading(false);
  }, [employeeNumber, year, month]);
 
  useEffect(() => { fetchEarnings(); }, [fetchEarnings, refreshKey]);
 
  // Reset to page 1 when any filter or key data changes
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, employeeNumber, year, month]);
 
  // ── sorting ───────────────────────────────────────────────────────────────
  const sortedEarnings = useMemo(
    () =>
      [...data.earnings].sort((a, b) => {
        const bd = new Date(b.created_at || b.approved_at || 0).getTime();
        const ad = new Date(a.created_at || a.approved_at || 0).getTime();
        if (bd !== ad) return bd - ad;
        return toNum(b.id) - toNum(a.id);
      }),
    [data.earnings],
  );
 
  // ── counts for the type filter bar ───────────────────────────────────────
  const typeCounts = useMemo(() => {
    const counts = { all: sortedEarnings.length, leave: 0, sc: 0, cto: 0 };
    sortedEarnings.forEach((e) => {
      const t = e._earningType;
      if (t in counts) counts[t]++;
    });
    return counts;
  }, [sortedEarnings]);
 
  // ── apply type filter ─────────────────────────────────────────────────────
  const typeFiltered = useMemo(
    () =>
      typeFilter === "all"
        ? sortedEarnings
        : sortedEarnings.filter((e) => e._earningType === typeFilter),
    [sortedEarnings, typeFilter],
  );
 
  // ── status counts (scoped to current type filter) ─────────────────────────
  const statusCounts = useMemo(() => {
    const counts = { all: typeFiltered.length, pending: 0, approved: 0, rejected: 0 };
    typeFiltered.forEach((e) => {
      const s = e.earn_status || "pending";
      if (s in counts) counts[s]++;
    });
    return counts;
  }, [typeFiltered]);
 
  // ── apply status filter ───────────────────────────────────────────────────
  const filteredEarnings = useMemo(
    () =>
      statusFilter === "all"
        ? typeFiltered
        : typeFiltered.filter((e) => (e.earn_status || "pending") === statusFilter),
    [typeFiltered, statusFilter],
  );
 
  const totalPages  = Math.max(1, Math.ceil(filteredEarnings.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pagedEarnings = filteredEarnings.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
  );
 
  // ── approve / reject ──────────────────────────────────────────────────────
  const handleApprove = async (record) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const recordType = record._earningType || type;
      await axios.patch(
        `${API_BASE_URL}/api/earnings/${recordType}/${record.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchEarnings();
      if (onApproved) onApproved();
      if (onStatusChange) onStatusChange();
    } catch {}
    setActionLoading(false);
  };
 
  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const recordType = rejectDialog.record._earningType || type;
      await axios.patch(
        `${API_BASE_URL}/api/earnings/${recordType}/${rejectDialog.record.id}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRejectDialog({ open: false, record: null });
      await fetchEarnings();
      if (onApproved) onApproved();
      if (onStatusChange) onStatusChange();
    } catch {}
    setActionLoading(false);
  };

  const openAudit = async (record) => {
    if (!record?.id) return;
    const recordType = record._earningType || type;
    setAuditDialog({ open: true, record, rows: [], loading: true, error: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/earnings/audit/${recordType}/${record.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAuditDialog((p) => ({
        ...p,
        rows: Array.isArray(res.data) ? res.data : [],
        loading: false,
      }));
    } catch (e) {
      setAuditDialog((p) => ({
        ...p,
        loading: false,
        error: "Failed to load earnings audit trail.",
        rows: [],
      }));
    }
  };
 
  // ── early-out when no employee selected ──────────────────────────────────
  if (!employeeNumber) {
    if (standalone)
      return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ColHeader icon={HistoryIcon} label="Earnings Records" />
        </Box>
      );
    return null;
  }
 
  const pendingCount = statusCounts.pending;
  const showTypeBadge = typeFilter === "all";   // show type badge only in "all" view
 
  const content = (
    <>
      {loading ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: T.accent }} />
        </Box>
      ) : filteredEarnings.length === 0 ? (
        <Box
          sx={{
            py: 2.5,
            textAlign: "center",
            bgcolor: "rgba(0,0,0,0.03)",
            borderRadius: 2,
            border: "1px dashed rgba(0,0,0,0.12)",
          }}
        >
          <Typography
            sx={{ fontSize: "0.73rem", color: T.faint, fontFamily: T.poppins }}
          >
            {statusFilter === "all"
              ? `No ${typeFilter === "all" ? "" : typeFilter.toUpperCase() + " "}earnings for ${monthName(month)} ${year}`
              : `No ${statusFilter} ${typeFilter === "all" ? "" : typeFilter.toUpperCase() + " "}earnings`}
          </Typography>
        </Box>
      ) : (
        pagedEarnings.map((record) => (
          <EarningRow
            key={`${record._earningType}-${record.id}`}
            record={record}
            unit={unit}
            type={record._earningType || type}
            showTypeBadge={showTypeBadge}
            onApprove={handleApprove}
            onReject={(r) => setRejectDialog({ open: true, record: r })}
            onViewAudit={openAudit}
          />
        ))
      )}
      <RejectDialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, record: null })}
        onConfirm={handleReject}
        loading={actionLoading}
      />
      <Dialog
        open={auditDialog.open}
        onClose={() =>
          setAuditDialog({
            open: false,
            record: null,
            rows: [],
            loading: false,
            error: "",
          })
        }
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", fontFamily: T.poppins },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: T.accent,
            color: "#fff",
            fontWeight: 800,
            fontFamily: T.poppins,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Earnings Audit Trail
          <IconButton
            onClick={() =>
              setAuditDialog({
                open: false,
                record: null,
                rows: [],
                loading: false,
                error: "",
              })
            }
            sx={{ color: "#fff" }}
            size="small"
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2.25 }}>
          {auditDialog.loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
              }}
            >
              <CircularProgress size={22} />
            </Box>
          ) : auditDialog.error ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {auditDialog.error}
            </Alert>
          ) : auditDialog.rows.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No audit entries yet for this earning record.
            </Alert>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {auditDialog.rows.map((r) => {
                const ts = r.created_at ? new Date(r.created_at) : null;
                const timeLabel =
                  ts && !isNaN(ts)
                    ? `${ts.toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })} • ${ts.toLocaleTimeString("en-PH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "—";
                return (
                  <Box
                    key={r.id}
                    sx={{
                      border: `1px solid ${T.divider}`,
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: "#fff",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 900,
                          color: T.accent,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {String(r.action || "").toUpperCase()}
                      </Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: T.faint }}>
                        {timeLabel}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.7rem", color: T.muted, mt: 0.4 }}
                    >
                      Actor: {r.actor || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>
                      Status: {(r.old_status || "—")} → {(r.new_status || "—")}
                    </Typography>
                    {r.notes && (
                      <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>
                        Notes: {r.notes}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 2.25,
            py: 1.5,
            borderTop: `1px solid ${T.divider}`,
            bgcolor: "rgba(0,0,0,0.02)",
          }}
        >
          <Button
            onClick={() =>
              setAuditDialog({
                open: false,
                record: null,
                rows: [],
                loading: false,
                error: "",
              })
            }
            sx={{ textTransform: "none", fontWeight: 800, fontFamily: T.poppins }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
 
  if (standalone)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* ── Column header ── */}
        <ColHeader icon={HistoryIcon} label="Earnings Records">
          {pendingCount > 0 && (
            <Chip
              size="small"
              label={`${pendingCount} pending`}
              sx={{
                height: 16,
                fontSize: "0.56rem",
                fontWeight: 700,
                bgcolor: "rgba(0,0,0,0.06)",
                color: "#7a4a00",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
          )}
          <IconButton
            size="small"
            onClick={fetchEarnings}
            disabled={loading}
            sx={{ p: 0.25 }}
          >
            <RefreshIcon
              sx={{ fontSize: 13, color: loading ? T.faint : T.accent }}
            />
          </IconButton>
        </ColHeader>
 
        {/* ── NEW: Type filter bar ── */}
        <TypeFilterBar
          typeFilter={typeFilter}
          onTypeFilter={(v) => { setTypeFilter(v); setStatusFilter("all"); }}
          typeCounts={typeCounts}
        />
 
        {/* ── Existing: Status filter bar ── */}
        <StatusFilterBar
          statusFilter={statusFilter}
          onStatusFilter={(v) => setStatusFilter(v)}
          counts={statusCounts}
        />
 
        {/* ── Scrollable records list ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 1.5,
            pt: 1.25,
            pb: 1,
            "&::-webkit-scrollbar": { width: 3 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(0,0,0,0.1)",
              borderRadius: 2,
            },
          }}
        >
          {content}
        </Box>
 
        {/* ── Pagination ── */}
        <PaginationControls
          page={clampedPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          totalCount={sortedEarnings.length}
          filteredCount={filteredEarnings.length}
        />
      </Box>
    );
 
  return <Box sx={{ mt: 1 }}>{content}</Box>;
};

// ─── Compact Input Grid ────────────────────────────────────────────────────────

export { RecordsList, DeptBadge, EmpCatBadge };