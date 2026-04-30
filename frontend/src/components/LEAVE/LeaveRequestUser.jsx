import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Avatar,
  Chip,
  Card,
  Fade,
  Grid,
  FormControl,
  Tooltip,
  IconButton,
  Backdrop,
  Snackbar,
  Modal,
  styled,
  alpha,
  Divider,
  Select,
  MenuItem,
  TextField,
  CardContent,
} from "@mui/material";
import {
  EventNote,
  FilterList as FilterIcon,
  EventAvailable as ReorderIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Refresh,
  AccessTime,
  CheckCircle,
  Block,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  WarningAmber as WarningIcon,
  AccountBalanceWallet as WalletIcon,
  HistoryToggleOff,
  Close,
  KeyboardArrowUp,
  Delete as DeleteIcon,
  ErrorOutline as ErrorOutlineIcon,
  HelpOutline as HelpOutlineIcon,
  Lock as LockIcon,
  TableRows as TableRowsIcon,
} from "@mui/icons-material";
import axios from "axios";
import { getAuthHeaders } from "../../utils/auth";
import { useSocket } from "../../contexts/SocketContext";
import { jwtDecode } from "jwt-decode";

import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import SuccessfulOverlay from "../SuccessfulOverlay";
import LeaveDatePicker from "./LeaveDatePicker";
import { useSystemSettings } from "../../hooks/useSystemSettings";

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  headerGrad: "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven: "#ffffff",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

// ─── Styled primitives ─────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: T.surface,
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
    "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: T.text },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

const ModernSelect = styled(Select)({
  borderRadius: 8,
  fontSize: "0.875rem",
  backgroundColor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: T.accent,
    borderWidth: "1.5px",
  },
});

// ─── Shimmer ───────────────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes lruShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes lruBlink {
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
      animation: "lruShimmer 1.6s infinite linear",
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
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "49%",
        transform: "translateX(-48%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      <Box
        sx={{
          mb: 2,
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${T.accentBorder}`,
          animation: "lruBlink 2s ease-in-out infinite",
        }}
      >
        <Box
          sx={{
            p: 3.5,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.12)",
                flexShrink: 0,
              }}
            />
            <Box>
              <Bone w={200} h={16} sx={{ mb: 1 }} />
              <Bone w={280} h={10} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Bone w={140} h={30} r={8} />
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.1)",
              }}
            />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          mb: 2,
          borderRadius: 3,
          border: `1px solid ${T.accentBorder}`,
          bgcolor: "#fff",
          overflow: "hidden",
          animation: "lruBlink 2s ease-in-out 0.07s infinite",
        }}
      >
        <Box
          sx={{
            px: 3.5,
            py: 2,
            borderBottom: `1px solid ${T.divider}`,
            bgcolor: T.accentFaint,
          }}
        >
          <Bone w={150} h={12} />
        </Box>
        <Box sx={{ p: 3, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {[...Array(5)].map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 160,
                height: 52,
                borderRadius: 2,
                border: `1px solid ${T.accentBorder}`,
                bgcolor: "#fafafa",
              }}
            />
          ))}
        </Box>
      </Box>
      <Grid container spacing={2}>
        {[0, 1].map((col) => (
          <Grid item xs={12} lg={6} key={col}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${T.accentBorder}`,
                bgcolor: "#fff",
                overflow: "hidden",
                animation: `lruBlink 2s ease-in-out ${col * 0.1}s infinite`,
                height: "calc(100vh - 340px)",
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
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "rgba(109,35,35,0.12)",
                  }}
                />
                <Bone w={160} h={12} />
              </Box>
              <Box
                sx={{
                  p: 3.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                }}
              >
                {[100, 140, 110, 120, 100].map((w, i) => (
                  <Box key={i}>
                    <Bone w={w} h={10} sx={{ mb: 1 }} />
                    <Box
                      sx={{
                        height: 38,
                        borderRadius: 2,
                        border: `1px solid ${T.accentBorder}`,
                        bgcolor: "#fafafa",
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Status config ─────────────────────────────────────────────────────────────
const allStatusOptions = [
  {
    value: "0",
    label: "Pending",
    color: "#F57C00",
    bg: "#FFF3E0",
    icon: AccessTime,
  },
  {
    value: "1",
    label: "Supervisor Approved",
    color: "#1565C0",
    bg: "#E3F2FD",
    icon: CheckCircle,
  },
  {
    value: "2",
    label: "HR Approved",
    color: "#2E7D32",
    bg: "#E8F5E9",
    icon: CheckCircle,
  },
  { value: "3", label: "Denied", color: "#C62828", bg: "#FFEBEE", icon: Block },
  {
    value: "4",
    label: "Cancelled",
    color: "#757575",
    bg: "#F5F5F5",
    icon: CancelIcon,
  },
];

const selectSx = {
  borderRadius: "8px",
  fontSize: "0.875rem",
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: T.accent,
    borderWidth: "1.5px",
  },
};

// ─── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const opt =
    allStatusOptions.find((o) => o.value === String(status)) ||
    allStatusOptions[0];
  const Icon = opt.icon;
  return (
    <Chip
      size="small"
      icon={<Icon style={{ fontSize: 11, color: opt.color }} />}
      label={opt.label}
      sx={{
        height: 20,
        fontSize: "0.7rem",
        fontWeight: 600,
        bgcolor: opt.bg,
        color: opt.color,
        border: `1px solid ${alpha(opt.color, 0.25)}`,
        borderRadius: "4px",
        "& .MuiChip-icon": { ml: "4px" },
      }}
    />
  );
};

// ─── Generic Confirm Modal ─────────────────────────────────────────────────────
const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = T.accent,
  confirmHoverColor = T.accentDark,
  icon: Icon = HelpOutlineIcon,
  iconColor = T.accent,
  iconBg = T.accentFaint,
  loading = false,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: 2,
      zIndex: 1400,
    }}
  >
    <Fade in={open}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          bgcolor: T.surface,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            px: 3.5,
            py: 2.5,
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
              top: -40,
              right: -30,
              width: 140,
              height: 140,
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
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon sx={{ fontSize: 17, color: "#fff" }} />
            </Box>
            <Typography
              sx={{ fontWeight: 700, color: "#fff", fontSize: "0.93rem" }}
            >
              {title}
            </Typography>
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
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: iconBg,
                border: `1px solid ${alpha(iconColor, 0.2)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: T.text,
                lineHeight: 1.65,
                pt: 0.5,
                whiteSpace: "pre-line",
              }}
            >
              {message}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            px: 3.5,
            py: 2,
            borderTop: `1px solid ${T.divider}`,
            bgcolor: "#f9f9f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.25,
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
              ) : null
            }
            sx={{
              fontSize: "0.8rem",
              bgcolor: confirmColor,
              color: "#fff",
              boxShadow: `0 2px 10px ${alpha(confirmColor, 0.32)}`,
              "&:hover": { bgcolor: confirmHoverColor },
              "&:disabled": { bgcolor: "#ddd" },
            }}
          >
            {loading ? "Processing…" : confirmLabel}
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Error Modal ───────────────────────────────────────────────────────────────
const ErrorModal = ({
  open,
  onClose,
  title,
  message,
  icon: Icon = ErrorOutlineIcon,
  iconColor = "#C62828",
  iconBg = "#FFEBEE",
}) => (
  <Modal
    open={open}
    onClose={onClose}
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: 2,
      zIndex: 1500,
    }}
  >
    <Fade in={open}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          bgcolor: T.surface,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            px: 3.5,
            py: 2.5,
            background: `linear-gradient(180deg,${iconColor} 0%,${alpha(iconColor, 0.82)} 100%)`,
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
              width: 140,
              height: 140,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.05)",
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
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon sx={{ fontSize: 17, color: "#fff" }} />
            </Box>
            <Typography
              sx={{ fontWeight: 700, color: "#fff", fontSize: "0.93rem" }}
            >
              {title}
            </Typography>
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
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: iconBg,
                border: `1px solid ${alpha(iconColor, 0.2)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: T.text,
                lineHeight: 1.65,
                pt: 0.5,
              }}
            >
              {message}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            px: 3.5,
            py: 2,
            borderTop: `1px solid ${T.divider}`,
            bgcolor: "#f9f9f9",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <AccentButton
            onClick={onClose}
            variant="contained"
            sx={{
              fontSize: "0.8rem",
              bgcolor: iconColor,
              color: "#fff",
              boxShadow: `0 2px 10px ${alpha(iconColor, 0.3)}`,
              "&:hover": { bgcolor: alpha(iconColor, 0.85) },
            }}
          >
            Understood
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const LeaveRequestUser = () => {
  const { hasAccess, loading: accessLoading } =
    usePageAccess("leave-request-user");
  const { socket, connected } = useSocket();
  const refreshRef = useRef(null);
  const fetchTransactionRef = useRef(null);
  const fetchAssignmentsRef = useRef(null);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    leave_code: "",
    leave_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [personID, setPersonID] = useState("");
  const [userName, setUserName] = useState(""); // ← full name resolved from token/API
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [transactionLogsModalOpen, setTransactionLogsModalOpen] =
    useState(false);
  const [transactionLogs, setTransactionLogs] = useState([]);
  const [transactionLogsLoading, setTransactionLogsLoading] = useState(false);
  const [transactionLogsError, setTransactionLogsError] = useState("");
  const [auditLogPage, setAuditLogPage] = useState(1);
  const AUDIT_LOGS_PER_PAGE = 5;
  const [selectedDates, setSelectedDates] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const [errorModal, setErrorModal] = useState({
    open: false,
    title: "",
    message: "",
    iconColor: "#C62828",
    iconBg: "#FFEBEE",
    icon: ErrorOutlineIcon,
  });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmColor: T.accent,
    confirmHoverColor: T.accentDark,
    icon: HelpOutlineIcon,
    iconColor: T.accent,
    iconBg: T.accentFaint,
    loading: false,
    onConfirm: () => {},
  });

  const showError = (title, message, opts = {}) =>
    setErrorModal({
      open: true,
      title,
      message,
      iconColor: "#C62828",
      iconBg: "#FFEBEE",
      icon: ErrorOutlineIcon,
      ...opts,
    });
  const closeError = () => setErrorModal((p) => ({ ...p, open: false }));
  const showConfirm = (opts) =>
    setConfirmModal({
      open: true,
      title: "",
      message: "",
      confirmLabel: "Confirm",
      confirmColor: T.accent,
      confirmHoverColor: T.accentDark,
      icon: HelpOutlineIcon,
      iconColor: T.accent,
      iconBg: T.accentFaint,
      loading: false,
      onConfirm: () => {},
      ...opts,
    });
  const closeConfirm = () =>
    setConfirmModal((p) => ({ ...p, open: false, loading: false }));

  const { settings } = useSystemSettings();
  const accentColor = settings.primaryColor || T.accent;

  const isSickLeave = () => {
    const t = leaveTypes.find(
      (x) => x.leave_code === newLeaveRequest.leave_code,
    );
    if (!t) return false;
    return (
      (t.leave_code || "").toLowerCase().includes("sl") ||
      (t.leave_description || "").toLowerCase().includes("sick")
    );
  };

  const groupedBalances = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const code = a.leave_code;
      const desc =
        leaveTypes.find((lt) => lt.leave_code === code)?.leave_description ||
        code;
      if (!map[code]) map[code] = { code, description: desc, totalHours: 0 };
      map[code].totalHours += parseFloat(a.remaining_hours || 0);
    });
    return Object.values(map).map((b) => ({
      ...b,
      totalDays: (b.totalHours / 8).toFixed(3),
    }));
  }, [assignments, leaveTypes]);

  const getAllocatedRemainingDays = () => {
    if (!newLeaveRequest.leave_code || !assignments.length) return null;
    const allocated = assignments
      .filter(
        (a) =>
          a.leave_code === newLeaveRequest.leave_code &&
          (a.carried_forward_hours === null ||
            Number(a.carried_forward_hours) === 0),
      )
      .sort((a, b) => {
        if (b.period_year !== a.period_year)
          return b.period_year - a.period_year;
        const semVal = (s) => {
          if (!s) return 0;
          if (s.includes("2nd")) return 2;
          if (s.includes("1st")) return 1;
          return 0;
        };
        return semVal(b.period_semester) - semVal(a.period_semester);
      })[0];
    if (!allocated) return null;
    return (parseFloat(allocated.remaining_hours) || 0) / 8;
  };

  const months = [
    { value: "", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "0", label: "Pending" },
    { value: "1", label: "Supervisor Approved" },
    { value: "2", label: "HR Approved" },
    { value: "3", label: "Denied" },
    { value: "4", label: "Cancelled" },
  ];

  // ── Decode token and resolve name ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setPersonID(decoded.employeeNumber);
        // Try common JWT name fields first; fall back to a personal-info fetch below
        const nameFromToken =
          decoded.fullName ||
          decoded.name ||
          [decoded.firstName, decoded.lastName].filter(Boolean).join(" ") ||
          "";
        if (nameFromToken) setUserName(nameFromToken);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // ── Fetch full name from personal-info API if token didn't carry it ────────
  useEffect(() => {
    if (!personID || userName) return;
    const fetchName = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/personalinfo/person_table/${personID}`,
          getAuthHeaders(),
        );
        const name = [res.data.firstName, res.data.lastName]
          .filter(Boolean)
          .join(" ");
        if (name) setUserName(name);
      } catch (e) {
        console.error("Could not resolve user name", e);
      }
    };
    fetchName();
  }, [personID, userName]); // eslint-disable-line

  useEffect(() => {
    if (!personID || initialLoadDone.current) return;
    initialLoadDone.current = true;
    const init = async () => {
      await Promise.allSettled([
        fetchLeaveRequests(),
        fetchLeaveTypes(),
        fetchAssignments(),
      ]);
      setTimeout(() => setPageLoading(false), 350);
    };
    init();
  }, [personID]); // eslint-disable-line

  useEffect(() => {
    refreshRef.current = fetchLeaveRequests;
  });
  useEffect(() => {
    fetchTransactionRef.current = fetchTransactionLogs;
  });
  useEffect(() => {
    fetchAssignmentsRef.current = fetchAssignments;
  });

  useEffect(() => {
    if (!socket || !connected) return;
    const handleReq = () => {
      refreshRef.current?.();
      fetchAssignmentsRef.current?.();
      fetchTransactionRef.current?.();
    };
    const handleAssign = () => {
      fetchAssignmentsRef.current?.();
      refreshRef.current?.();
      fetchTransactionRef.current?.();
    };
    socket.on("leaveRequestChanged", handleReq);
    socket.on("leaveAssignmentChanged", handleAssign);
    return () => {
      socket.off("leaveRequestChanged", handleReq);
      socket.off("leaveAssignmentChanged", handleAssign);
    };
  }, [socket, connected]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/${personID}`,
        getAuthHeaders(),
      );
      setLeaveRequests(res.data);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_table`,
        getAuthHeaders(),
      );
      setLeaveTypes(res.data);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchAssignments = async () => {
    if (!personID) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_assignment`,
        getAuthHeaders(),
      );
      const mine = (Array.isArray(res.data) ? res.data : []).filter(
        (a) => a.employeeNumber?.toString() === personID?.toString(),
      );
      setAssignments(mine);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchTransactionLogs = async () => {
    if (!personID) return;
    setTransactionLogsLoading(true);
    setTransactionLogsError("");
    try {
      const res = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/transactions/${personID}`,
        getAuthHeaders(),
      );
      setTransactionLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setTransactionLogsError("Failed to load transaction logs.");
      setTransactionLogs([]);
    } finally {
      setTransactionLogsLoading(false);
    }
  };

  useEffect(() => {
    if (transactionLogsModalOpen) fetchTransactionLogs();
  }, [transactionLogsModalOpen, personID]); // eslint-disable-line

  const remainingDays = getAllocatedRemainingDays();
  const isOverBalance =
    remainingDays !== null && selectedDates.length > remainingDays;

  const inlineLeaveTypeError = useMemo(() => {
    if (!newLeaveRequest.leave_code) return "";
    const hasAllocation = assignments.some(
      (a) =>
        a.leave_code === newLeaveRequest.leave_code &&
        parseFloat(a.allocated_hours || 0) > 0,
    );
    if (!hasAllocation)
      return "This request cannot be processed due to insufficient leave balance.";
    return "";
  }, [newLeaveRequest.leave_code, assignments]);

  const handleAdd = async () => {
    if (!newLeaveRequest.leave_code) {
      showError("Missing Fields", "Please select a leave type.", {
        icon: WarningIcon,
        iconColor: "#F57C00",
        iconBg: "#FFF3E0",
      });
      return;
    }
    if (!selectedDates.length) {
      showError("Missing Fields", "Please pick at least one leave date.", {
        icon: WarningIcon,
        iconColor: "#F57C00",
        iconBg: "#FFF3E0",
      });
      return;
    }
    const unavailableDates = selectedDates.filter((date) =>
      leaveRequests.some((req) => {
        const reqDates = (req.leave_date || "").split(",").map((s) => s.trim());
        return reqDates.includes(date) && String(req.status) === "2";
      }),
    );
    if (unavailableDates.length > 0) {
      showError(
        "Unavailable Dates",
        "One or more selected dates conflict with existing HR-approved leave.",
      );
      return;
    }
    if (remainingDays !== null && selectedDates.length > remainingDays) {
      const typeName =
        leaveTypes.find((t) => t.leave_code === newLeaveRequest.leave_code)
          ?.leave_description || newLeaveRequest.leave_code;
      showError(
        "Insufficient Balance",
        `You are requesting ${selectedDates.length} day(s) of "${typeName}" but only have ${remainingDays.toFixed(3)} allocated day(s) remaining.`,
      );
      return;
    }
    const typeName =
      leaveTypes.find((t) => t.leave_code === newLeaveRequest.leave_code)
        ?.leave_description || newLeaveRequest.leave_code;
    showConfirm({
      title: "Submit Leave Request",
      message: `Submit a leave request?\n\nLeave Type: ${typeName}\nDuration: ${selectedDates.length} day(s)`,
      confirmLabel: "Submit Request",
      confirmColor: T.accent,
      confirmHoverColor: T.accentDark,
      icon: AddIcon,
      iconColor: T.accent,
      iconBg: T.accentFaint,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        setLoading(true);
        try {
          await axios.post(
            `${API_BASE_URL}/leaveRoute/leave_request`,
            {
              employeeNumber: personID,
              leave_code: newLeaveRequest.leave_code,
              leave_dates: selectedDates,
              status: "0",
            },
            getAuthHeaders(),
          );
          setSuccessAction("Leave Request Submitted Successfully");
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          await fetchLeaveRequests();
          await fetchAssignments();
          setNewLeaveRequest({ leave_code: "", leave_date: "" });
          setSelectedDates([]);
        } catch (err) {
          const errMsg = err.response?.data?.error || err.message;
          showError("Submission Failed", errMsg);
        } finally {
          setLoading(false);
          closeConfirm();
        }
      },
    });
  };

  const handleCancelRequest = async (id) => {
    showConfirm({
      title: "Cancel Leave Request",
      message:
        "Are you sure you want to cancel this leave request? This action cannot be undone.",
      confirmLabel: "Cancel Request",
      confirmColor: "#C62828",
      confirmHoverColor: "#B71C1C",
      icon: CancelIcon,
      iconColor: "#C62828",
      iconBg: "#FFEBEE",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        try {
          const req = leaveRequests.find((r) => r.id === id);
          await axios.put(
            `${API_BASE_URL}/leaveRoute/leave_request/${id}`,
            {
              employeeNumber: req.employeeNumber,
              leave_code: req.leave_code,
              leave_date: req.leave_date,
              status: 4,
            },
            getAuthHeaders(),
          );
          setSuccessAction("Request Cancelled Successfully");
          setSuccessOpen(true);
          setTimeout(() => setSuccessOpen(false), 2000);
          await fetchLeaveRequests();
          await fetchAssignments();
        } catch (err) {
          showError("Error", err.response?.data?.error || err.message);
        } finally {
          closeConfirm();
        }
      },
    });
  };

  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests
      .filter((request) => {
        if (monthFilter) {
          const m = String(
            new Date(request.leave_date).getMonth() + 1,
          ).padStart(2, "0");
          if (m !== monthFilter) return false;
        }
        if (leaveTypeFilter && request.leave_code !== leaveTypeFilter)
          return false;
        if (statusFilter && String(request.status) !== statusFilter)
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.leave_date) - new Date(a.leave_date));
  }, [leaveRequests, monthFilter, leaveTypeFilter, statusFilter]);

  const formatDate = (d) => {
    if (!d) return "N/A";
    const s = Array.isArray(d) ? d[0] : d.split(",")[0].trim();
    const [y, m, day] = s.split("-");
    return new Date(y, m - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── Tx log helpers ─────────────────────────────────────────────────────────
  const getTxKind = (log) => {
    const lower = (log.message || "").toLowerCase();
    if (lower.includes("deleted")) return "deleted";
    if (lower.includes("reversed") || lower.includes("reversal"))
      return "reversal";
    if (lower.includes("hr") && lower.includes("approv")) return "hr_approved";
    if (
      (lower.includes("supervisor") || lower.includes("immediate")) &&
      lower.includes("approv")
    )
      return "supervisor_approved";
    if (lower.includes("approv")) return "approved";
    if (
      lower.includes("reject") ||
      lower.includes("denied") ||
      lower.includes("deny")
    )
      return "denied";
    if (lower.includes("cancel")) return "cancelled";
    if (
      lower.includes("credit") &&
      (lower.includes("added") || lower.includes("monthly"))
    )
      return "credit_added";
    if (
      lower.includes("balance") &&
      (lower.includes("remaining") || lower.includes("adjusted"))
    )
      return "balance_update";
    if (
      lower.includes("assigned") &&
      (lower.includes("leave") || lower.includes("hrs"))
    )
      return "assigned";
    if (
      lower.includes("submit") ||
      lower.includes("request") ||
      lower.includes("filed")
    )
      return "submitted";
    if (lower.includes("pending")) return "pending";
    return "activity";
  };

  const kindMap = {
    submitted: {
      label: "Submitted",
      color: T.accent,
      bg: T.accentFaint,
      Icon: AddIcon,
    },
    pending: {
      label: "Pending",
      color: "#F57C00",
      bg: "#FFF8E1",
      Icon: AccessTime,
    },
    supervisor_approved: {
      label: "Supervisor Approved",
      color: "#1565C0",
      bg: "#E3F2FD",
      Icon: CheckCircle,
    },
    hr_approved: {
      label: "HR Approved",
      color: "#2E7D32",
      bg: "#E8F5E9",
      Icon: CheckCircle,
    },
    approved: {
      label: "Approved",
      color: "#2E7D32",
      bg: "#E8F5E9",
      Icon: CheckCircle,
    },
    denied: { label: "Denied", color: "#C62828", bg: "#FFEBEE", Icon: Block },
    cancelled: {
      label: "Cancelled",
      color: "#757575",
      bg: "#F5F5F5",
      Icon: CancelIcon,
    },
    deleted: {
      label: "Deleted",
      color: "#C62828",
      bg: "#FFEBEE",
      Icon: DeleteIcon,
    },
    reversal: {
      label: "VL Reversal",
      color: "#B71C1C",
      bg: "#FFEBEE",
      Icon: Block,
    },
    credit_added: {
      label: "Credit Added",
      color: "#2E7D32",
      bg: "#E8F5E9",
      Icon: AddIcon,
    },
    balance_update: {
      label: "Balance Update",
      color: "#1565C0",
      bg: "#E3F2FD",
      Icon: WalletIcon,
    },
    assigned: {
      label: "Leave Assigned",
      color: "#1565C0",
      bg: "#E3F2FD",
      Icon: AddIcon,
    },
    activity: {
      label: "Activity",
      color: "#546E7A",
      bg: "#ECEFF1",
      Icon: ScheduleIcon,
    },
  };

  if (accessLoading || pageLoading) return <Wireframe />;
  if (!hasAccess) return <AccessDenied />;

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "49%",
          transform: "translateX(-48%)",
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        <Backdrop
          sx={{ color: "#fff", zIndex: (t) => t.zIndex.drawer + 1 }}
          open={loading}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={48} thickness={4} />
            <Typography variant="body2" sx={{ mt: 1.5, color: "#fff" }}>
              Submitting…
            </Typography>
          </Box>
        </Backdrop>

        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />
        <ErrorModal
          open={errorModal.open}
          onClose={closeError}
          title={errorModal.title}
          message={errorModal.message}
          icon={errorModal.icon}
          iconColor={errorModal.iconColor}
          iconBg={errorModal.iconBg}
        />
        <ConfirmModal
          open={confirmModal.open}
          onClose={closeConfirm}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          confirmHoverColor={confirmModal.confirmHoverColor}
          icon={confirmModal.icon}
          iconColor={confirmModal.iconColor}
          iconBg={confirmModal.iconBg}
          loading={confirmModal.loading}
        />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
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
                background:
                  "radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)",
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
              <EventNote sx={{ fontSize: 28, color: T.accent }} />
              <Box>
                <Typography
                  sx={{
                    fontSize: "1.15rem",
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.3,
                  }}
                >
                  Employee Leave Request
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    color: T.accentMid,
                    fontWeight: 600,
                    opacity: 0.85,
                  }}
                >
                  Submit and track your leave requests
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
              <AccentButton
                onClick={() => {
                  setTransactionLogsModalOpen(true);
                  setAuditLogPage(1);
                }}
                variant="contained"
                startIcon={
                  <HistoryToggleOff sx={{ fontSize: "15px !important" }} />
                }
                sx={{
                  fontSize: "0.8rem",
                  bgcolor: T.accent,
                  color: "#fff",
                  "&:hover": { bgcolor: T.accentDark },
                }}
              >
                Transaction Logs
              </AccentButton>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => window.location.reload()}
                  size="small"
                  sx={{
                    color: T.accent,
                    bgcolor: alpha(T.accent, 0.1),
                    "&:hover": { bgcolor: alpha(T.accent, 0.18) },
                  }}
                >
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Leave Balances ── */}
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
            <WalletIcon sx={{ fontSize: 15, color: T.accent }} />
            <Typography
              sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}
            >
              Leave Balances
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: T.faint, ml: 0.5 }}>
              •  &emsp;Remaining credits per type
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            {groupedBalances.length === 0 ? (
              <Typography
                sx={{
                  py: 1.5,
                  color: T.faint,
                  fontSize: "0.82rem",
                  textAlign: "center",
                }}
              >
                No balance information available.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
                {groupedBalances.map((balance) => {
                  const maxAssignment = assignments
                    .filter((a) => a.leave_code === balance.code)
                    .reduce((max, a) => {
                      const days = parseFloat(a.allocated_hours || 0) / 8;
                      return days > max ? days : max;
                    }, 0);
                  const daysRemaining = balance.totalHours / 8;
                  const pct =
                    maxAssignment > 0
                      ? Math.min(
                          100,
                          (daysRemaining / maxAssignment) * 100,
                        )
                      : 0;
                  const barColor =
                    pct > 60 ? "#2E7D32" : pct > 30 ? "#F57C00" : "#C62828";
                  return (
                    <Box
                      key={balance.code}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: "#fff",
                        border: `1px solid ${T.accentBorder}`,
                        minWidth: 80,
                      }}
                    >
                      <Chip
                        label={balance.code}
                        size="small"
                        sx={{
                          bgcolor: T.accentFaint,
                          color: T.accent,
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          height: 20,
                          mb: 0.5,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: T.muted,
                          textAlign: "center",
                          lineHeight: 1.2,
                          mb: 0.5,
                        }}
                      >
                        {balance.description}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: T.accent,
                          fontSize: "0.85rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {balance.totalDays}
                        <Box
                          component="span"
                          sx={{
                            color: T.faint,
                            fontWeight: 400,
                            fontSize: "0.7rem",
                            ml: 0.3,
                          }}
                        >
                          / {maxAssignment.toFixed(3)}
                        </Box>
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.6,
                          height: 3,
                          width: "100%",
                          bgcolor: "#e8e8e8",
                          borderRadius: 2,
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${pct}%`,
                            bgcolor: barColor,
                            borderRadius: 2,
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </SectionCard>

        {/* ── Two Column ── */}
        <Grid container spacing={2}>
          {/* ── LEFT: Submit Form ── */}
          <Grid item xs={12} lg={5}>
            <SectionCard
              sx={{
                height: "calc(100vh - 450px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  px: 3.5,
                  py: 1.25,
                  borderBottom: `1px solid ${T.divider}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  bgcolor: T.accentFaint,
                }}
              >
                <PersonIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography
                  sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}
                >
                  Submit New Leave Request
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
                  <Box component="span" sx={{ color: "#c62828" }}>
                    *
                  </Box>{" "}
                  required
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 3.5,
                  py: 3,
                  flexGrow: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: T.accentBorder,
                    borderRadius: 2,
                  },
                }}
              >
                {/* Employee Number */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Employee Number
                  </Typography>
                  <FieldInput
                    value={personID}
                    disabled
                    fullWidth
                    size="small"
                  />
                </Box>

                <Divider sx={{ borderColor: T.divider }} />

                {/* Leave Type */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Leave Type{" "}
                    <Box component="span" sx={{ color: "#c62828" }}>
                      *
                    </Box>
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={newLeaveRequest.leave_code}
                      onChange={(e) => {
                        setNewLeaveRequest((p) => ({
                          ...p,
                          leave_code: e.target.value,
                        }));
                        setSelectedDates([]);
                      }}
                      displayEmpty
                      sx={selectSx}
                      renderValue={(v) =>
                        v ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
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
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  color: T.accent,
                                }}
                              >
                                {v}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.875rem" }}>
                              {leaveTypes.find((t) => t.leave_code === v)
                                ?.leave_description || ""}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography
                            sx={{ fontSize: "0.875rem", color: T.faint }}
                          >
                            Select leave type…
                          </Typography>
                        )
                      }
                    >
                      <MenuItem value="">
                        <em>Select Leave Type</em>
                      </MenuItem>
                      {leaveTypes.map((type) => (
                        <MenuItem key={type.id} value={type.leave_code}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
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
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  color: T.accent,
                                }}
                              >
                                {type.leave_code}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.875rem" }}>
                              {type.leave_description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {inlineLeaveTypeError && (
                    <Box
                      sx={{
                        mt: 0.75,
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: "rgba(198,40,40,0.05)",
                        border: "1px solid rgba(198,40,40,0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <WarningIcon
                        sx={{ fontSize: 14, color: "#C62828", flexShrink: 0 }}
                      />
                      <Typography
                        sx={{ fontSize: "0.75rem", color: "#C62828" }}
                      >
                        {inlineLeaveTypeError}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Over-balance warning */}
                {newLeaveRequest.leave_code &&
                  remainingDays !== null &&
                  isOverBalance && (
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: "rgba(198,40,40,0.05)",
                        border: "1.5px solid rgba(198,40,40,0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <WarningIcon
                        sx={{ fontSize: 14, color: "#C62828", flexShrink: 0 }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#C62828",
                        }}
                      >
                        {`Insufficient — ${remainingDays.toFixed(3)} day(s) available, ${selectedDates.length} selected.`}
                      </Typography>
                    </Box>
                  )}

                {/* Leave Date Picker */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Leave Date(s){" "}
                    <Box component="span" sx={{ color: "#c62828" }}>
                      *
                    </Box>
                  </Typography>
                  <AccentButton
                    variant="outlined"
                    onClick={() => setDateModalOpen(true)}
                    fullWidth
                    startIcon={
                      <CalendarIcon sx={{ fontSize: "15px !important" }} />
                    }
                    disabled={remainingDays === 0}
                    sx={{
                      height: 40,
                      border: `1.5px solid ${isOverBalance ? "#C62828" : T.accentBorder}`,
                      color: selectedDates.length
                        ? isOverBalance
                          ? "#C62828"
                          : T.accent
                        : T.muted,
                      justifyContent: "flex-start",
                      px: 1.5,
                      bgcolor: selectedDates.length
                        ? isOverBalance
                          ? "rgba(198,40,40,0.04)"
                          : T.accentFaint
                        : "#fff",
                      "&:hover": {
                        bgcolor: T.accentFaint,
                        borderColor: T.accent,
                        color: T.accent,
                        transform: "none",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: "0.875rem" }}>
                      {selectedDates.length > 0
                        ? `${selectedDates.length} date(s) selected`
                        : "Pick leave dates…"}
                    </Typography>
                  </AccentButton>
                  {isSickLeave() && (
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        color: "#1565C0",
                        mt: 0.5,
                        fontStyle: "italic",
                      }}
                    >
                      * Past dates allowed for sick leave
                    </Typography>
                  )}
                  <LeaveDatePicker
                    open={dateModalOpen}
                    onClose={() => {
                      setNewLeaveRequest((p) => ({
                        ...p,
                        leave_date: selectedDates.join(","),
                      }));
                      setDateModalOpen(false);
                    }}
                    selectedDates={selectedDates}
                    setSelectedDates={setSelectedDates}
                    accentColor={T.accent}
                    accentDark={T.accentDark}
                    primaryColor="#fdf5f5"
                    secondaryColor="#f0dede"
                    allowPastDates={isSickLeave()}
                    leaveType={newLeaveRequest.leave_code}
                    leaveRequests={leaveRequests}
                    maxSelectableDates={remainingDays}
                  />
                </Box>

                {/* Selected dates chips */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Selected Dates
                  </Typography>
                  <Box
                    sx={{
                      minHeight: 48,
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 0.75,
                      p: 1.5,
                      border: `1px solid ${alpha(isOverBalance ? "#C62828" : T.accent, 0.2)}`,
                      borderRadius: 2,
                      bgcolor: T.accentFaint,
                    }}
                  >
                    {selectedDates.length > 0 ? (
                      selectedDates.map((date) => {
                        const isHRApproved = leaveRequests.some(
                          (req) =>
                            (req.leave_date || "")
                              .split(",")
                              .map((s) => s.trim())
                              .includes(date) && String(req.status) === "2",
                        );
                        const chip = (
                          <Chip
                            key={date}
                            size="small"
                            label={formatDateDisplay(date)}
                            onDelete={
                              isHRApproved
                                ? undefined
                                : () =>
                                    setSelectedDates((prev) =>
                                      prev.filter((d) => d !== date),
                                    )
                            }
                            sx={{
                              bgcolor: isHRApproved
                                ? alpha("#C62828", 0.1)
                                : alpha("#2E7D32", 0.1),
                              color: isHRApproved ? "#C62828" : "#2E7D32",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              height: 24,
                              border: `1px solid ${alpha(isHRApproved ? "#C62828" : "#2E7D32", 0.25)}`,
                            }}
                            disabled={isHRApproved}
                          />
                        );
                        return isHRApproved ? (
                          <Tooltip
                            key={date}
                            title="HR-approved leave already exists on this date."
                            arrow
                          >
                            <span>{chip}</span>
                          </Tooltip>
                        ) : (
                          chip
                        );
                      })
                    ) : (
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          color: T.faint,
                          fontStyle: "italic",
                        }}
                      >
                        No dates selected
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Submit */}
                <Box sx={{ mt: "auto", pt: 1 }}>
                  <AccentButton
                    onClick={handleAdd}
                    variant="contained"
                    fullWidth
                    startIcon={
                      isOverBalance ? (
                        <WarningIcon sx={{ fontSize: "16px !important" }} />
                      ) : (
                        <AddIcon sx={{ fontSize: "16px !important" }} />
                      )
                    }
                    disabled={isOverBalance || remainingDays === 0}
                    sx={{
                      height: 42,
                      bgcolor:
                        isOverBalance || remainingDays === 0
                          ? "#d0d0d0"
                          : T.accent,
                      color:
                        isOverBalance || remainingDays === 0 ? "#888" : "#fff",
                      boxShadow:
                        isOverBalance || remainingDays === 0
                          ? "none"
                          : `0 2px 10px ${alpha(T.accent, 0.32)}`,
                      "&:hover": {
                        bgcolor:
                          isOverBalance || remainingDays === 0
                            ? "#d0d0d0"
                            : T.accentDark,
                      },
                      "&:disabled": {
                        bgcolor: "#d0d0d0 !important",
                        color: "#888 !important",
                      },
                    }}
                  >
                    {remainingDays === 0
                      ? "No Balance — Cannot Submit"
                      : isOverBalance
                        ? "Insufficient Balance"
                        : "Submit Leave Request"}
                  </AccentButton>
                </Box>
              </Box>
            </SectionCard>
          </Grid>

          {/* ── RIGHT: Records ── */}
          <Grid item xs={12} lg={7}>
            <SectionCard
              sx={{
                height: "calc(100vh - 450px)",
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
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <TableRowsIcon sx={{ fontSize: 17, color: T.accent }} />
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: T.text,
                      }}
                    >
                      My Leave Request Records
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
                      • {filteredLeaveRequests.length} record(s)
                    </Typography>
                  </Box>
                </Box>
                {/* Filters */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <FilterIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: T.accent,
                    }}
                  >
                    Filter:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      displayEmpty
                      sx={{ ...selectSx, fontSize: "0.78rem" }}
                      renderValue={(v) =>
                        v ? months.find((m) => m.value === v)?.label : "Month"
                      }
                    >
                      {months.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={leaveTypeFilter}
                      onChange={(e) => setLeaveTypeFilter(e.target.value)}
                      displayEmpty
                      sx={{ ...selectSx, fontSize: "0.78rem" }}
                      renderValue={(v) => v || "Leave Type"}
                    >
                      <MenuItem value="">
                        <em>All Types</em>
                      </MenuItem>
                      {leaveTypes.map((t) => (
                        <MenuItem key={t.id} value={t.leave_code}>
                          {t.leave_code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      displayEmpty
                      sx={{ ...selectSx, fontSize: "0.78rem" }}
                      renderValue={(v) =>
                        v
                          ? statusOptions.find((s) => s.value === v)?.label
                          : "Status"
                      }
                    >
                      {statusOptions.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Column headers */}
              <Box
                sx={{
                  px: 3.5,
                  py: 1.25,
                  display: "grid",
                  gridTemplateColumns: "120px 90px 1fr 130px 80px",
                  gap: 1,
                  alignItems: "center",
                  bgcolor: alpha(T.accent, 0.04),
                  borderBottom: `1px solid ${T.divider}`,
                }}
              >
                {["Leave Type", "Date", "Submitted", "Status", ""].map(
                  (col) => (
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
                  ),
                )}
              </Box>

              {/* Records list */}
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
                {filteredLeaveRequests.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: "center" }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
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
                        sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: T.muted,
                        mb: 0.5,
                      }}
                    >
                      No leave requests found
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                      {monthFilter || leaveTypeFilter || statusFilter
                        ? "Try adjusting your filters"
                        : "Submit your first request using the form"}
                    </Typography>
                  </Box>
                ) : (
                  filteredLeaveRequests.map((req, idx) => {
                    const statusOpt =
                      allStatusOptions.find(
                        (o) => o.value === String(req.status),
                      ) || allStatusOptions[0];
                    const canCancel = String(req.status) === "0";
                    const typeDesc =
                      leaveTypes.find((t) => t.leave_code === req.leave_code)
                        ?.leave_description || req.leave_code;
                    return (
                      <Box
                        key={req.id}
                        sx={{
                          px: 3.5,
                          py: 1.5,
                          display: "grid",
                          gridTemplateColumns: "120px 90px 1fr 130px 80px",
                          gap: 1,
                          alignItems: "center",
                          bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                          borderBottom: `1px solid ${T.divider}`,
                          "&:last-child": { borderBottom: "none" },
                          "&:hover": { bgcolor: T.rowHover },
                        }}
                      >
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              mb: 0.25,
                            }}
                          >
                            <Box
                              sx={{
                                px: 0.75,
                                py: 0.15,
                                borderRadius: 1,
                                bgcolor: T.accentFaint,
                                border: `1px solid ${T.accentBorder}`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  color: T.accent,
                                }}
                              >
                                {req.leave_code}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography
                            sx={{ fontSize: "0.72rem", color: T.muted }}
                            noWrap
                          >
                            {typeDesc}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            color: T.text,
                            fontWeight: 500,
                          }}
                        >
                          {formatDate(req.leave_date)}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <ScheduleIcon sx={{ fontSize: 12, color: T.faint }} />
                          <Typography
                            sx={{ fontSize: "0.75rem", color: T.muted }}
                          >
                            {req.created_at
                              ? new Date(req.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )
                              : "N/A"}
                          </Typography>
                        </Box>
                        <StatusPill status={req.status} />
                        <Box>
                          {canCancel && (
                            <AccentButton
                              size="small"
                              variant="outlined"
                              onClick={() => handleCancelRequest(req.id)}
                              sx={{
                                fontSize: "0.7rem",
                                px: 1,
                                py: 0.35,
                                height: 26,
                                minWidth: 0,
                                borderColor: alpha("#C62828", 0.3),
                                color: "#C62828",
                                "&:hover": {
                                  bgcolor: alpha("#C62828", 0.06),
                                  borderColor: "#C62828",
                                  transform: "none",
                                },
                              }}
                            >
                              Cancel
                            </AccentButton>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Transaction Logs Modal ── */}
        <Modal
          open={transactionLogsModalOpen}
          onClose={() => setTransactionLogsModalOpen(false)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Fade in={transactionLogsModalOpen}>
            <Box
              sx={{
                width: "100%",
                maxWidth: 620,
                maxHeight: "90vh",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                bgcolor: T.surface,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  px: 3.5,
                  py: 2.5,
                  background: T.headerGrad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -50,
                    right: -30,
                    width: 180,
                    height: 180,
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
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <HistoryToggleOff sx={{ fontSize: 18, color: "#fff" }} />
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#fff",
                        fontSize: "0.95rem",
                        lineHeight: 1.2,
                        mb: 0.3,
                      }}
                    >
                      Transaction Logs
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: "rgba(255,255,255,0.68)",
                      }}
                    >
                      {transactionLogs.length > 0
                        ? `${transactionLogs.length} recorded action(s)`
                        : "All activity on your leave requests"}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setTransactionLogsModalOpen(false)}
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

              {/* Body */}
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  overflowY: "auto",
                  flexGrow: 1,
                  bgcolor: T.accentFaint,
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: T.accentBorder,
                    borderRadius: 2,
                  },
                }}
              >
                {transactionLogsLoading ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {[...Array(AUDIT_LOGS_PER_PAGE)].map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          bgcolor: "#fff",
                          border: `1px solid ${T.accentBorder}`,
                        }}
                      >
                        <Bone w={90} h={16} sx={{ mb: 1 }} />
                        <Bone w="80%" h={12} sx={{ mb: 0.75 }} />
                        <Bone w="55%" h={12} />
                      </Box>
                    ))}
                  </Box>
                ) : transactionLogsError ? (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {transactionLogsError}
                  </Alert>
                ) : transactionLogs.length === 0 ? (
                  <Box sx={{ py: 10, textAlign: "center" }}>
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                      }}
                    >
                      <HistoryToggleOff
                        sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: T.muted,
                      }}
                    >
                      No activity yet.
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                      Actions on your leave requests will appear here.
                    </Typography>
                  </Box>
                ) : (
                  (() => {
                    const totalPages = Math.ceil(
                      transactionLogs.length / AUDIT_LOGS_PER_PAGE,
                    );
                    const paginated = transactionLogs.slice(
                      (auditLogPage - 1) * AUDIT_LOGS_PER_PAGE,
                      auditLogPage * AUDIT_LOGS_PER_PAGE,
                    );
                    return (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                        }}
                      >
                        {paginated.map((log) => {
                          const kind = getTxKind(log);
                          const { label, color, bg, Icon } =
                            kindMap[kind] || kindMap.activity;
                          const loggedAt =
                            log.created_at || log.createdAt || log.timestamp;
                          const timeLabel = loggedAt
                            ? (() => {
                                const d = new Date(loggedAt);
                                return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
                              })()
                            : null;
                          const raw = (log.message || "").trim();
                          const sentence =
                            raw.charAt(0).toUpperCase() +
                            raw.slice(1) +
                            (raw.endsWith(".") ? "" : ".");

                          // ── Resolve employee number for this log entry ──
                          // In the user-facing view all logs belong to the current user,
                          // so we fall back to personID if the log doesn't carry one.
                          const logEmpNum =
                            log.employee_id || log.employeeNumber || personID;
                          // Use the resolved full name; gracefully omit if blank
                          const logEmpName =
                            userName && userName !== "Unknown" ? userName : null;

                          return (
                            <Box
                              key={`log-${log.id}`}
                              sx={{
                                bgcolor: "#fff",
                                borderRadius: 2,
                                p: 2.5,
                                border: `1px solid ${T.accentBorder}`,
                                borderLeft: `4px solid ${color}`,
                                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                                "&:hover": {
                                  boxShadow: `0 4px 12px ${alpha(color, 0.12)}`,
                                },
                              }}
                            >
                              {/* ── Top row: kind badge (left) + timestamp (right) ── */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  mb: 1.25,
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.6,
                                    px: 1.25,
                                    py: 0.35,
                                    borderRadius: "6px",
                                    bgcolor: bg,
                                    border: `1px solid ${alpha(color, 0.2)}`,
                                  }}
                                >
                                  <Icon sx={{ fontSize: 12, color }} />
                                  <Typography
                                    sx={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      color,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {label}
                                  </Typography>
                                </Box>
                                {timeLabel && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                    }}
                                  >
                                    <ScheduleIcon
                                      sx={{ fontSize: 11, color: T.faint }}
                                    />
                                    <Typography
                                      sx={{
                                        fontSize: "0.7rem",
                                        color: T.faint,
                                      }}
                                    >
                                      {timeLabel}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>

                              {/* ── Employee pill — right-aligned, shows #number + name ── */}
                              {logEmpNum && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    mb: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 0.75,
                                      px: 1.25,
                                      py: 0.5,
                                      bgcolor: alpha("#1565C0", 0.05),
                                      borderRadius: 1.5,
                                      border:
                                        "1px solid rgba(21,101,192,0.15)",
                                    }}
                                  >
                                    <PersonIcon
                                      sx={{ fontSize: 13, color: "#1565C0" }}
                                    />
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        color: "#1565C0",
                                        lineHeight: 1,
                                      }}
                                    >
                                      #{logEmpNum}
                                    </Typography>
                                    {logEmpName && (
                                      <>
                                        <Box
                                          sx={{
                                            width: "1px",
                                            height: 12,
                                            bgcolor: "rgba(21,101,192,0.3)",
                                            flexShrink: 0,
                                          }}
                                        />
                                        <Typography
                                          sx={{
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            color: "#1565C0",
                                            lineHeight: 1,
                                          }}
                                        >
                                          {logEmpName}
                                        </Typography>
                                      </>
                                    )}
                                  </Box>
                                </Box>
                              )}

                              {/* ── Log message ── */}
                              <Typography
                                sx={{
                                  fontSize: "0.86rem",
                                  fontWeight: 400,
                                  color: T.text,
                                  lineHeight: 1.6,
                                }}
                              >
                                {sentence}
                              </Typography>
                            </Box>
                          );
                        })}

                        {totalPages > 1 && (
                          <Box
                            sx={{
                              mt: 1,
                              pt: 2,
                              borderTop: `1px solid ${T.divider}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography
                              sx={{ fontSize: "0.72rem", color: T.faint }}
                            >
                              Showing{" "}
                              {(auditLogPage - 1) * AUDIT_LOGS_PER_PAGE + 1}–
                              {Math.min(
                                auditLogPage * AUDIT_LOGS_PER_PAGE,
                                transactionLogs.length,
                              )}{" "}
                              of {transactionLogs.length}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <IconButton
                                size="small"
                                disabled={auditLogPage === 1}
                                onClick={() => setAuditLogPage((p) => p - 1)}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 1.5,
                                  border: `1px solid ${auditLogPage === 1 ? T.divider : T.accentBorder}`,
                                  color:
                                    auditLogPage === 1 ? T.faint : T.accent,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    lineHeight: 1,
                                  }}
                                >
                                  ‹
                                </Box>
                              </IconButton>
                              {Array.from(
                                { length: totalPages },
                                (_, i) => i + 1,
                              ).map((p) => (
                                <IconButton
                                  key={p}
                                  size="small"
                                  onClick={() => setAuditLogPage(p)}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 1.5,
                                    fontSize: "0.72rem",
                                    fontWeight: p === auditLogPage ? 700 : 400,
                                    bgcolor:
                                      p === auditLogPage
                                        ? T.accent
                                        : "transparent",
                                    color:
                                      p === auditLogPage ? "#fff" : T.muted,
                                    border: `1px solid ${p === auditLogPage ? T.accent : T.accentBorder}`,
                                    "&:hover": {
                                      bgcolor:
                                        p === auditLogPage
                                          ? T.accent
                                          : T.accentFaint,
                                    },
                                  }}
                                >
                                  {p}
                                </IconButton>
                              ))}
                              <IconButton
                                size="small"
                                disabled={auditLogPage === totalPages}
                                onClick={() => setAuditLogPage((p) => p + 1)}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 1.5,
                                  border: `1px solid ${auditLogPage === totalPages ? T.divider : T.accentBorder}`,
                                  color:
                                    auditLogPage === totalPages
                                      ? T.faint
                                      : T.accent,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    lineHeight: 1,
                                  }}
                                >
                                  ›
                                </Box>
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })()
                )}
              </Box>
            </Box>
          </Fade>
        </Modal>

        {/* Scroll to Top */}
        <Fade in={showScrollTop}>
          <Box
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: T.accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.4)}`,
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: T.accentDark,
                transform: "translateY(-2px)",
              },
            }}
          >
            <KeyboardArrowUp sx={{ fontSize: 20 }} />
          </Box>
        </Fade>
      </Box>
    </Fade>
  );
};

export default LeaveRequestUser;