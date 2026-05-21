import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
import axios from "axios";
import useAttendanceRealtimeRefresh from "../../hooks/useAttendanceRealtimeRefresh";
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Fade,
  FormControl,
  Select,
  MenuItem,
  alpha,
  styled,
  Card,
  Button,
  Fab,
  Zoom,
  TextField,
  IconButton,
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
} from "@mui/icons-material";
import { Grid } from "@mui/material";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import {
  buildAuditPeriodLabel,
  logAttendanceStateView,
} from "../../utils/moduleEmployeeSearchAudit";
import {
  Paper,
  List,
  ListItem,
  CircularProgress,
  InputAdornment,
} from "@mui/material";

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

// ─── Attendance helpers ────────────────────────────────────────────────────
const getAttendanceIcon = (state) => {
  switch (state) {
    case 1: return <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />;
    case 2: return <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />;
    case 3: return <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />;
    case 4: return <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />;
    default: return <Cancel     sx={{ fontSize: 13, color: "#f44336" }} />;
  }
};
const getAttendanceColor = (state) => {
  switch (state) {
    case 1: return "#4caf50"; case 2: return "#ff9800";
    case 3: return "#ff9800"; case 4: return "#4caf50";
    default: return "#f44336";
  }
};
const getAttendanceLabel = (state) => {
  switch (state) {
    case 1: return "Time IN";      case 2: return "Breaktime OUT";
    case 3: return "Breaktime IN"; case 4: return "Time OUT";
    default: return "Uncategorized";
  }
};

const getEmployeeIdentifier = (emp) => {
  if (!emp || typeof emp !== "object") return "";
  const raw =
    emp.personID ?? emp.PersonID ?? emp.employeeNum ??
    emp.employeeNumber ?? emp.agencyEmployeeNum ?? "";
  return String(raw).trim();
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
      _rowKey: `${record?.PersonID ?? ""}|${record?.Date ?? ""}|${record?.Time ?? ""}|${record?.AttendanceState ?? ""}|${index}`,
    };
  });

// ─── Memoized table row ────────────────────────────────────────────────────
const AttendanceStateRow = React.memo(function AttendanceStateRow({
  record,
  rowIndex,
  expanded,
  onToggle,
}) {
  const state = record.AttendanceState;
  const stateColor = getAttendanceColor(state);
  return (
    <>
      <Box
        onClick={onToggle}
        sx={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
          px: 2.5,
          py: 1.5,
          gap: 2,
          alignItems: "center",
          bgcolor: rowIndex % 2 === 0 ? "#fff" : T.rowOdd,
          borderBottom: `1px solid ${T.divider}`,
          cursor: "pointer",
          transition: "background 0.12s",
          "&:hover": { bgcolor: T.rowHover },
          "&:last-child": { borderBottom: "none" },
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: "0.82rem", color: T.text }}>
          {record._dateLabel}
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontWeight: 500 }}>
          {record.Time}
        </Typography>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.6,
            px: 1.25,
            py: 0.4,
            borderRadius: "12px",
            bgcolor: alpha(stateColor, 0.1),
            border: `1px solid ${alpha(stateColor, 0.25)}`,
          }}
        >
          {getAttendanceIcon(state)}
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: stateColor }}>
            {getAttendanceLabel(state)}
          </Typography>
        </Box>
        <RowBtn
          icon={
            expanded ? (
              <KeyboardArrowUp sx={{ fontSize: 13 }} />
            ) : (
              <KeyboardArrowDown sx={{ fontSize: 13 }} />
            )
          }
          label={expanded ? "Collapse" : "Details"}
          color={T.accent}
          hoverBg={T.accentFaint}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        />
      </Box>
      {expanded && (
        <Box sx={{ px: 2.5, py: 2, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: T.accent,
              mb: 1.25,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Record Details
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {[
              { label: "Employee ID", value: record.PersonID },
              { label: "Date", value: record.Date },
              { label: "Time", value: record.Time },
              { label: "Status", value: getAttendanceLabel(state) },
            ].map(({ label, value }) => (
              <Box key={label}>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: T.faint,
                    mb: 0.3,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </>
  );
});

// ─── Employee search field ─────────────────────────────────────────────────
const EmployeeSearchField = ({
  value,
  onSelectEmployeeNumber,
  onSelectEmployee,
  disabled = false,
}) => {
  const [query, setQuery]               = useState(value || "");
  const [debouncedQuery, setDebouncedQuery] = useState(value || "");
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [open, setOpen]                 = useState(false);
  const debounceRef  = useRef(null);
  const containerRef = useRef(null);
  const abortRef     = useRef(null);

  useEffect(() => { setQuery(value || ""); setDebouncedQuery(value || ""); }, [value]);

  useEffect(() => {
    const handleOutside = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();
    const q = debouncedQuery.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    axios
      .get(`${API_BASE_URL}/Remittance/employees/search`, {
        params: { q },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
        signal: controller.signal,
      })
      .then((res) => { const list = Array.isArray(res.data) ? res.data : []; setResults(list.slice(0, 20)); })
      .catch((err) => { if (err?.code === "ERR_CANCELED") return; setResults([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, open]);

  const queueSearch = (nextValue) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedQuery(nextValue); setOpen(true); }, 220);
  };

  const handleInputChange = (e) => {
    const next = e.target.value;
    onSelectEmployeeNumber(next);
    setQuery(next);
    queueSearch(next);
  };
  const handleSelect = (emp) => {
    const num = getEmployeeIdentifier(emp) || "";
    onSelectEmployeeNumber(num);
    onSelectEmployee?.(emp || null);
    setQuery(num);
    setDebouncedQuery(num);
    setOpen(false);
  };
  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery(""); setDebouncedQuery(""); setResults([]); setOpen(false);
    onSelectEmployeeNumber("");
    onSelectEmployee?.(null);
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={containerRef}>
      <FieldInput
        fullWidth size="small" value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Type name or employee number..."
        disabled={disabled}
        autoComplete="off"
        inputProps={{ autoComplete: "new-password" }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined sx={{ color: T.muted, fontSize: 16 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={14} sx={{ color: T.accent }} />
              ) : query ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
      />
      {open && (
        <Paper elevation={6} sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1300, mt: 0.5, maxHeight: 280, overflow: "auto", borderRadius: "10px", border: `1px solid ${T.accentBorder}` }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 2.5 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: "0.8rem", color: T.muted }}>Searching...</Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding>
              {results.map((emp) => (
                <ListItem
                  key={getEmployeeIdentifier(emp)}
                  button
                  onClick={() => handleSelect(emp)}
                  sx={{ py: 1, px: 1.5, borderBottom: `1px solid ${T.divider}`, "&:hover": { bgcolor: T.accentFaint }, "&:last-child": { borderBottom: "none" } }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Typography sx={{ fontSize: "0.83rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                      {emp.name || emp.fullName || ""}
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                      #{getEmployeeIdentifier(emp)}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontStyle: "italic" }}>
                {query.trim().length >= 2
                  ? `No results for "${query.trim()}"`
                  : "Type at least 2 characters to search"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AllAttendanceRecord = () => {
  const [personID, setPersonID]           = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");
  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [expandedRow, setExpandedRow]     = useState(null);
  const [sortOrder, setSortOrder]         = useState("desc");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [recordDateFilter, setRecordDateFilter] = useState("");
  const [pageLoading, setPageLoading]     = useState(true);
  const [hasSearched, setHasSearched]     = useState(false);
  const [successOverlayOpen, setSuccessOverlayOpen] = useState(false);

  const fetchRecordsRef       = useRef(null);
  const requestControllerRef  = useRef(null);
  const loadingRequestIdRef   = useRef(0);
  const isLoadingFetchRef     = useRef(false);
  const queryCacheRef         = useRef(new Map());

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const { hasAccess, loading: accessLoading } = usePageAccess("attendance-form");

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });

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

    setExpandedRow(null);

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

  const handleSort      = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  const handleRowExpand = (i) => setExpandedRow(expandedRow === i ? null : i);

  const filteredRecords = useMemo(() => {
    const visibleRecords = recordDateFilter
      ? records.filter((record) => record._isoDate === recordDateFilter)
      : records;
    return [...visibleRecords].sort((a, b) => {
      const diff = (a._sortTs ?? 0) - (b._sortTs ?? 0);
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [records, sortOrder, recordDateFilter]);

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
    <Box sx={{ px: 3, py: 1, flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, ...scrollbarSx }}>

      {/* Year */}
      <FormSectionLabel icon={CalendarToday}>Year</FormSectionLabel>
      <Box sx={{ mb: 2.5 }}>
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(parseInt(e.target.value));
            setSelectedMonth(null);
            setHasSearched(false);
            setRecords([]);
          }}
          style={{
            width: "100%", padding: "9px 13px", borderRadius: "8px",
            border: `1px solid ${T.accentBorder}`, fontSize: "0.82rem",
            outline: "none", fontFamily: "inherit", background: "#fff",
            color: T.text, cursor: "pointer",
          }}
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </Box>

      {/* Month */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <CalendarToday sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: alpha(T.accent, 0.45) }}>
            Month
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <FormControl size="small" sx={{ minWidth: 118 }}>
            <Select
              value=""
              displayEmpty
              onChange={(e) => handleQuickDateSelect(e.target.value)}
              sx={{ ...selectSx, fontSize: "0.72rem", "& .MuiSelect-select": { py: "6px", pr: "24px !important" } }}
              renderValue={() => "Quick Dates"}
            >
              <MenuItem value="today"     sx={{ fontSize: "0.78rem" }}>Today</MenuItem>
              <MenuItem value="yesterday" sx={{ fontSize: "0.78rem" }}>Yesterday</MenuItem>
              <MenuItem value="last7"     sx={{ fontSize: "0.78rem" }}>Last 7 Days</MenuItem>
              <MenuItem value="last15"    sx={{ fontSize: "0.78rem" }}>Last 15 Days</MenuItem>
              <MenuItem value="last30"    sx={{ fontSize: "0.78rem" }}>Last 30 Days</MenuItem>
            </Select>
          </FormControl>
          {selectedMonth !== null && (
            <Box
              onClick={() => {
                setSelectedMonth(null);
                setStartDate("");
                setEndDate("");
                setRecords([]);
                setHasSearched(false);
              }}
              sx={{ fontSize: "0.65rem", color: T.accent, cursor: "pointer", fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
            >
              Clear
            </Box>
          )}
        </Box>
      </Box>

      {/* Month grid — border always visible, matching AttendanceUserState */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", mb: 2.5 }}>
        {monthsShort.map((m, idx) => {
          const isSelected = selectedMonth === idx;
          return (
            <Box
              key={m}
              onClick={() => handleMonthClick(idx)}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 38, px: 1, py: 0.75, borderRadius: "7px", cursor: "pointer",
                // Always-visible border — accent when selected, faint otherwise
                border: `1px solid ${isSelected ? T.accent : T.accentBorder}`,
                bgcolor: isSelected ? T.accent : "transparent",
                transition: "all 0.14s ease",
                "&:hover": isSelected ? {} : { bgcolor: T.accentFaint, border: `1px solid ${T.accent}` },
              }}
            >
              <Typography sx={{ fontSize: "0.84rem", fontWeight: isSelected ? 700 : 600, color: isSelected ? "#fff" : T.text, lineHeight: 1, letterSpacing: "0.03em", textAlign: "center", width: "100%" }}>
                {m}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Employee */}
      <Box sx={{ mt: 0.5 }}>
        <FormSectionLabel icon={SearchOutlined}>Employee</FormSectionLabel>
        <Box sx={{ mb: 1.5 }}>
          <EmployeeSearchField
            value={personID}
            onSelectEmployeeNumber={(next) => {
              setPersonID(next);
              if (!next) setSelectedEmployee(null);
              setHasSearched(false);
              setRecords([]);
            }}
            onSelectEmployee={setSelectedEmployee}
          />
        </Box>
        <AccentButton
          variant="contained"
          fullWidth
          onClick={handleSearch}
          startIcon={<Search sx={{ fontSize: "16px !important" }} />}
          sx={{
            bgcolor: T.accent, color: "#fff",
            boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
            "&:hover": { bgcolor: T.accentDark },
          }}
        >
          Fetch Records
        </AccentButton>

        {/* Summary */}
        <Box sx={{ mt: 1.25, px: 1.5, py: 1.35, borderRadius: 1.75, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: alpha(T.accent, 0.65), mb: 0.5, lineHeight: 1 }}>
            Record Summary
          </Typography>
          <Typography sx={{ fontSize: "0.98rem", fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
            {loading
              ? "Loading records..."
              : hasSearched
                ? recordDateFilter
                  ? `${filteredRecords.length} of ${records.length} ${records.length === 1 ? "record" : "records"} shown`
                  : `${records.length} ${records.length === 1 ? "record" : "records"} found`
                : "No records loaded"}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: T.muted, mt: 0.35, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {loading
              ? "Fetching attendance data..."
              : hasSearched
                ? startDate && endDate ? `${startDate} → ${endDate}` : "Search complete."
                : "Select month and fetch records."}
          </Typography>

          <Box sx={{ mt: 1.2, pt: 1, borderTop: `1px dashed ${T.accentBorder}` }}>
            <Typography sx={{ fontSize: "0.64rem", fontWeight: 700, color: alpha(T.accent, 0.75), mb: 0.5, letterSpacing: "0.03em", textTransform: "uppercase" }}>
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
      </Box>
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={150}>
      <Box>
        <style>{shimmerKf}</style>

        <Box
          sx={{
            py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
            width: "100vw", maxWidth: "100%",
            position: "relative", left: "63%", transform: "translateX(-61%)",
            px: { xs: 2, sm: 3, md: 6 },
          }}
        >
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
              <SectionCard sx={{ height: { xs: "auto", lg: "calc(100vh - 280px)" }, display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint }}>
                  <FilterList sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>
                    Attendance Filter
                  </Typography>
                </Box>
                {renderLeftPanel()}
              </SectionCard>
            </Grid>

            {/* RIGHT: Records */}
            <Grid item xs={12} lg={9}>
              <SectionCard sx={{ height: { xs: "auto", lg: "calc(100vh - 280px)" }, display: "flex", flexDirection: "column", position: "relative" }}>

                {/* Toolbar */}
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Assignment sx={{ fontSize: 15, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>
                        Attendance States
                      </Typography>
                      {hasSearched && personID && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: T.faint }} />
                          <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500 }}>
                            {personID}
                          </Typography>
                          {selectedMonth !== null && (
                            <Box sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: "5px", px: "6px", py: "2px" }}>
                              {monthsShort[selectedMonth]}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                    {records.length > 0 && (
                      <RowBtn
                        icon={sortOrder === "asc"
                          ? <KeyboardArrowUp sx={{ fontSize: 13 }} />
                          : <KeyboardArrowDown sx={{ fontSize: 13 }} />}
                        label={`Sort ${sortOrder === "asc" ? "Newest First" : "Oldest First"}`}
                        color={T.accent}
                        hoverBg={T.accentFaint}
                        onClick={handleSort}
                      />
                    )}
                  </Box>
                </Box>

                {/* Records area */}
                <Box sx={{ flexGrow: 1, overflowY: "auto", position: "relative", ...scrollbarSx }}>
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
                    <Box>
                      {/* Column headers */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
                          px: 2.5,
                          py: 1.25,
                          bgcolor: T.accent,
                          gap: 2,
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
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

                      {filteredRecords.map((record, idx) => (
                        <AttendanceStateRow
                          key={record._rowKey}
                          record={record}
                          rowIndex={idx}
                          expanded={expandedRow === idx}
                          onToggle={() => handleRowExpand(idx)}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Footer legend */}
                {records.length > 0 && (
                  <Box sx={{ px: 3, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
                    {[
                      { icon: <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />, label: "Time IN / Time OUT" },
                      { icon: <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />, label: "Breaktime OUT / Breaktime IN" },
                      { icon: <Cancel      sx={{ fontSize: 13, color: "#f44336" }} />, label: "Uncategorized" },
                      { icon: <KeyboardArrowDown sx={{ fontSize: 13, color: T.accent }} />, label: "Click row to expand details" },
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