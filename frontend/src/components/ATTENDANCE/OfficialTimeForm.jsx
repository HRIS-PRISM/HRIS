// ─── OfficialTimeForm — Search-First Layout ──────────────────────────────────
// Layout: Left panel (search + control) | Right panel (schedule detail/create)
// Employee autocomplete mirrors Children.jsx pattern (debounced, lazy)
// ─────────────────────────────────────────────────────────────────────────────
//
// CHANGES vs previous version:
//  [A] makeDefaultRow — Saturday & Sunday now default to blank ("") for all
//      time fields instead of "00:00:00 AM/PM". Weekdays keep their defaults.
//  [B] ScheduleTimeRows — new "Fill break" ActionBtn on the Work Days tab.
//      Appears only when BOTH officialBreaktimeIN and officialBreaktimeOUT are
//      empty for that row. Clicking it sets Break In → "12:00:00 PM" and
//      Break Out → "01:00:00 PM" (or keeps any existing partial value).
//  [C] Department-scoped Excel upload — Filters bar + "Upload Excel by
//      Department" panel + confirmation modal added to the All Users view.
//  [D] FIX — moved `fetchAllUsers` declaration earlier in the component so it
//      is initialized before handlers that reference it in their dependency
//      arrays (handleConfirmUpload, handleConfirmDeptUpload, handleConfirmCatUpload).
//  [E] Department dropdown now sourced from the Department Table (via
//      GET /officialtime/departments) instead of being derived from whichever
//      departments happen to already have uploaded users in All Users view.
//  [F] All Users view restructured into the same 360px-sticky-left /
//      flexible-right two-panel layout as the Single Employee view.
//  [G] Employment Category — added as a THIRD, independent filter axis
//      alongside Department (e.g. Department = "College of Engineering",
//      Employment Category = "Non-Teaching | General Administration").
//      Added to: All Users filters, All Users table column, and a new
//      "Excel upload by Employment Category" panel + validate/confirm modal,
//      mirroring the existing Department-scoped upload 1:1.
//  [H] Employment Category COLOR — the color dot / colored chip
//      treatment used in EmploymentCategoryManagement.jsx (DynamicCategorySelect)
//      is now applied here too: the "Target employment category" upload
//      dropdown, the All Users "Employment Category" filter dropdown, and the
//      All Users table's Employment Category column all render the
//      employment_type_config.colorHex color (dot in menus, colored chip in
//      the table) instead of plain text.
//  [I] [NEW] Excel "Name" column support — Excel uploads (single-employee,
//      department-scoped, and category-scoped) now accept an optional "Name"
//      column, which the backend echoes back per row as `schedules[].name`
//      in each validate response. This value is DISPLAY-ONLY: it is never
//      sent back to the server and never used to match/filter/validate rows
//      — matching remains 100% by employeeID/employeeNumber, and Department /
//      Employment Category are still resolved from the system by employeeID,
//      never from the Excel file (which doesn't include those columns). If a
//      row's Excel had no Name (or a blank one), we fall back to the existing
//      system lookup by employeeNumber so the table still shows a readable
//      name. This applies identically to all three analyze/validate flows
//      (single-employee, department-scoped, category-scoped).
// ─────────────────────────────────────────────────────────────────────────────

import API_BASE_URL from "../../apiConfig";
import {
  logOfficialTimeAdd,
  logOfficialTimeEdit,
  logOfficialTimeSearch,
} from "../../utils/moduleEmployeeSearchAudit";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import axios from "axios";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useCRUDButtonStyles } from "../../hooks/useCRUDButtonStyles";

import {
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  Grid,
  InputAdornment,
  Avatar,
  Tooltip,
  Chip,
  Fade,
  Alert,
  styled,
  Divider,
  Checkbox,
  Autocomplete,
  Select,
  MenuItem,
  Popover,
  List,
  ListItem,
} from "@mui/material";
import { TablePagination } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Close,
  Schedule,
  UploadFile,
  Person,
  AccessTime,
  CheckCircle,
  WarningAmber,
  Visibility,
  Add,
  Delete,
  ClearAll,
  Edit,
  ArrowBack,
  ArrowForward,
  CalendarToday,
  ExpandMore,
  ExpandLess,
  Circle,
} from "@mui/icons-material";

import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import useAttendanceRealtimeRefresh from "../../hooks/useAttendanceRealtimeRefresh";
import AccessDenied from "../AccessDenied";
import CircularProgress from "@mui/material/CircularProgress";

// ─────────────────────────────────────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

// #H: fallback color when an employment type has no colorHex assigned
const DEFAULT_CATEGORY_COLOR = "#757575";

// ─────────────────────────────────────────────────────────────────────────────
// SHIMMER
// ─────────────────────────────────────────────────────────────────────────────
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
      background:
        "linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)",
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

const OfficialTimeWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid rgba(0,0,0,0.09)`,
          animation: "blink 2s ease-in-out infinite",
        }}
      >
        <Box
          sx={{
            p: 3.5,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              bgcolor: "rgba(109,35,35,0.12)",
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Bone w={220} h={18} sx={{ mb: 1 }} />
            <Bone w={360} h={11} />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Box
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.09)",
              bgcolor: "#fff",
              minHeight: { xs: 400, lg: "calc(100vh - 280px)" },
              animation: "blink 2s ease-in-out 0.1s infinite",
            }}
          >
            <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
              {[100, 160, 120, 140, 110].map((w, i) => (
                <Box key={i}>
                  <Bone w={w} h={10} sx={{ mb: 1 }} />
                  <Box sx={{ height: 40, borderRadius: 2, border: `1px solid rgba(0,0,0,0.09)`, bgcolor: "#fafafa" }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} lg={8}>
          <Box
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.09)",
              bgcolor: "#fff",
              minHeight: { xs: 400, lg: "calc(100vh - 280px)" },
              animation: "blink 2s ease-in-out 0.2s infinite",
            }}
          >
            <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
              {[140, 180, 150, 160, 130].map((w, i) => (
                <Box key={i}>
                  <Bone w={w} h={10} sx={{ mb: 1 }} />
                  <Box sx={{ height: 40, borderRadius: 2, border: `1px solid rgba(0,0,0,0.09)`, bgcolor: "#fafafa" }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
  transition: "none",
});

const PanelHeader = ({ icon: Icon, title, rightContent }) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.5,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: T.accentFaint,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {Icon && <Icon sx={{ fontSize: 15, color: T.accent }} />}
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>
        {title}
      </Typography>
    </Box>
    {rightContent}
  </Box>
);

const ModernTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    backgroundColor: "#fff",
    transition: "border-color 0.18s",
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent },
  },
  "& label.Mui-focused": { color: T.accent },
  "& .MuiInputLabel-root": { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 10,
  overflow: "auto",
  boxShadow: "none",
  border: `1px solid ${T.accentBorder}`,
  maxHeight: "500px",
  "&::-webkit-scrollbar": { width: "6px", height: "6px" },
  "&::-webkit-scrollbar-track": { background: T.accentFaint, borderRadius: "4px" },
  "&::-webkit-scrollbar-thumb": {
    background: alpha(T.accent, 0.4),
    borderRadius: "4px",
    "&:hover": { background: alpha(T.accent, 0.6) },
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1,
      py: 0.3,
      borderRadius: "9px",
      fontSize: "0.72rem",
      fontWeight: 600,
      border: "0.5px solid",
      ...(active
        ? { bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32", borderColor: "rgba(46,125,50,0.3)" }
        : { bgcolor: "rgba(237,108,2,0.08)", color: "#b45309", borderColor: "rgba(237,108,2,0.3)" }),
    }}
  >
    {active && (
      <Box component="span" sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#2e7d32", display: "inline-block" }} />
    )}
    {active ? "Active" : "Inactive"}
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// [NEW #H] EMPLOYMENT CATEGORY COLOR CHIP — mirrors the colored chip/dot
// treatment used in EmploymentCategoryManagement.jsx's DynamicCategorySelect,
// so the "Employment Category" column in the All Users table shows the same
// color as the Manage Types / Assign Categories tabs there.
// ─────────────────────────────────────────────────────────────────────────────
const EmploymentCategoryChip = ({ label, colorHex }) => {
  if (!label) {
    return <Typography sx={{ fontSize: "0.88rem", color: T.faint }}>—</Typography>;
  }
  const color = colorHex || DEFAULT_CATEGORY_COLOR;
  return (
    <Chip
      icon={
        <Circle
          sx={{
            fontSize: "8px !important",
            color: `${color} !important`,
          }}
        />
      }
      label={label}
      size="small"
      sx={{
        height: 22,
        fontSize: "0.72rem",
        fontWeight: 700,
        color,
        bgcolor: alpha(color, 0.1),
        border: `1px solid ${alpha(color, 0.28)}`,
        borderRadius: "6px",
        "& .MuiChip-icon": { ml: 0.9 },
        "& .MuiChip-label": { px: 0.9 },
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
const SCHEDULE_TABS = [
  { key: "workDays", label: "Work Days" },
  { key: "honorarium", label: "Honorarium" },
  { key: "serviceCredits", label: "Service Credits" },
  { key: "overtime", label: "Overtime" },
];

const ScheduleTabBar = ({ activeTab, setTab }) => (
  <Box
    sx={{
      display: "flex",
      border: `1px solid ${T.accentBorder}`,
      borderRadius: 1,
      overflow: "hidden",
      flex: 1,
      minWidth: 280,
    }}
  >
    {SCHEDULE_TABS.map(({ key, label }, i, arr) => (
      <Button
        key={key}
        onClick={() => setTab(key)}
        disableElevation
        fullWidth
        sx={{
          borderRadius: 0,
          textTransform: "none",
          fontWeight: activeTab === key ? 700 : 400,
          fontSize: "0.82rem",
          py: 0.9,
          bgcolor: activeTab === key ? T.accent : "#fff",
          color: activeTab === key ? "#fff" : "#444",
          borderRight: i < arr.length - 1 ? `1px solid ${T.accentBorder}` : "none",
          "&:hover": { bgcolor: activeTab === key ? T.accentDark : T.accentFaint },
        }}
      >
        {label}
      </Button>
    ))}
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE AUTOCOMPLETE — debounced, lazy load, mirrors Children.jsx
// ─────────────────────────────────────────────────────────────────────────────
const EmployeeSearchField = ({ onSelect, selectedEmployee, onClear, disabled = false }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!selectedEmployee) setQuery("");
    else setQuery(selectedEmployee.name || "");
  }, [selectedEmployee]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setResults(r.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByQuery = useCallback(async (q) => {
    setLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      setResults(r.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (selectedEmployee) onClear();
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length === 0) fetchAll();
      else if (val.trim().length >= 2) fetchByQuery(val.trim());
      else setResults([]);
    }, 300);
  };

  const handleFocus = () => {
    setOpen(true);
    if (!results.length && !loading) {
      query.trim().length >= 2 ? fetchByQuery(query.trim()) : fetchAll();
    }
  };

  const handleSelect = (emp) => {
    setQuery(emp.name || "");
    setOpen(false);
    onSelect(emp);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onClear();
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={dropdownRef}>
      <ModernTextField
        inputRef={inputRef}
        fullWidth
        size="small"
        placeholder="Type name or employee number…"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        disabled={disabled}
        autoComplete="off"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person sx={{ color: T.accentMid, fontSize: 18 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={14} sx={{ color: T.accent }} />
              ) : selectedEmployee ? (
                <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 14, color: T.faint }} />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  onClick={() => { setOpen((o) => !o); if (!open && !results.length) fetchAll(); }}
                  sx={{ p: 0.25 }}
                >
                  {open ? <ExpandLess sx={{ fontSize: 16, color: T.faint }} /> : <ExpandMore sx={{ fontSize: 16, color: T.faint }} />}
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderColor: selectedEmployee ? T.accent : undefined,
            "& fieldset": selectedEmployee ? { borderColor: T.accent, borderWidth: 1.5 } : {},
          },
        }}
      />

      {open && (
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1400,
            maxHeight: 260,
            overflow: "auto",
            mt: 0.5,
            borderRadius: "10px",
            border: `1px solid ${T.accentBorder}`,
            "&::-webkit-scrollbar": { width: "5px" },
            "&::-webkit-scrollbar-thumb": { background: "#d0b8b8", borderRadius: "4px" },
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 2.5 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: "0.8rem", color: T.muted }}>Searching…</Typography>
            </Box>
          ) : results.length > 0 ? (
            <List dense disablePadding>
              {results.map((emp) => (
                <ListItem
                  key={emp.employeeNumber}
                  button
                  onClick={() => handleSelect(emp)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderBottom: `1px solid ${T.divider}`,
                    "&:hover": { bgcolor: T.accentFaint },
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: "0.72rem", bgcolor: alpha(T.accent, 0.15), color: T.accent, fontWeight: 700 }}>
                      {emp.name?.charAt(0)?.toUpperCase() || "?"}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.83rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                        {emp.name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                        #{emp.employeeNumber}{emp.department ? ` · ${emp.department}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.8rem", color: T.faint, fontStyle: "italic" }}>
                {query.length >= 2 ? `No results for "${query}"` : "Type to search or browse"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC YEAR AUTOCOMPLETE
// ─────────────────────────────────────────────────────────────────────────────
const generateAcademicYearOptions = () => {
  const y = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, i) => `${y - 5 + i} - ${y - 5 + i + 1}`);
};
const ACADEMIC_YEAR_OPTIONS = generateAcademicYearOptions();

const autoFormatAcademicYear = (raw) => {
  if (!raw) return raw;
  const t = raw.trim();
  if (/^\d{4}\s*-\s*\d{4}$/.test(t)) return t.replace(/\s*-\s*/, " - ");
  if (/^\d{4}$/.test(t)) { const y = parseInt(t, 10); return `${y} - ${y + 1}`; }
  return raw;
};

const AcademicYearAutocomplete = ({ value, onChange, onBlur, sx, size = "small", label = "Academic Year", placeholder = "e.g. 2025 - 2026" }) => (
  <Autocomplete
    freeSolo
    disableClearable
    filterOptions={(options) => options}  //← show all options always, no filtering
    options={ACADEMIC_YEAR_OPTIONS}
    value={value || ""}
    inputValue={value || ""}
    onInputChange={(_, v, reason) => {
      if (reason === "input") onChange(v ?? "");  //* ← only update on actual user typing
    }}
    onChange={(_, v) => {
      if (typeof v === "string") onChange(v);
    }}
    popupIcon={<CalendarToday sx={{ fontSize: 16 }} />}
    renderInput={(params) => (
      <TextField
        {...params}
        size={size}
        label={label}
        placeholder={placeholder}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.target.blur(); // ← commit on Enter the same way Tab/click-away does
          }
          params.inputProps?.onKeyDown?.(e); // preserve MUI's own Enter handling (highlighted option selection)
        }}
        sx={{
          bgcolor: "#fff",
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "&:hover fieldset": { borderColor: T.accent },
            "&.Mui-focused fieldset": { borderColor: T.accent },
          },
          "& label.Mui-focused": { color: T.accent },
          ...sx,
        }}
      />
    )}
    renderOption={(props, option) => (
      <Box component="li" {...props} sx={{ fontSize: "0.875rem", fontWeight: 500, py: "6px !important", px: "14px !important", "&.Mui-focused,&:hover": { bgcolor: `${T.accentFaint} !important`, color: T.accent } }}>
        <CalendarToday sx={{ fontSize: 14, mr: 1, opacity: 0.5 }} />
        {option}
      </Box>
    )}
    PaperComponent={({ children, ...p }) => (
      <Paper {...p} elevation={4} sx={{ borderRadius: "10px", border: `1px solid ${T.accentBorder}`, overflow: "hidden", mt: 0.5 }}>
        {children}
      </Paper>
    )}
  />
);
// ─────────────────────────────────────────────────────────────────────────────
// TIME PICKER FIELD
// ─────────────────────────────────────────────────────────────────────────────
const TimePickerField = ({ value, onChange, label, size = "small", disabled = false, accentColor = T.accent }) => {
  const parseVal = (v) => {
    if (!v || !String(v).trim()) return { hh: "", mm: "", ss: "", ampm: "AM" };
    const m = String(v).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!m) return { hh: "", mm: "", ss: "", ampm: "AM" };
    return { hh: m[1].padStart(2, "0"), mm: m[2], ss: m[3] || "00", ampm: (m[4] || "AM").toUpperCase() };
  };
  const init = parseVal(value);
  const [hh, setHh] = useState(init.hh);
  const [mm, setMm] = useState(init.mm);
  const [ss, setSs] = useState(init.ss);
  const [ampm, setAmpm] = useState(init.ampm);
  const [focused, setFocused] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const lastEmittedRef = useRef(value);
  const hhRef = useRef(null);
  const mmRef = useRef(null);
  const ssRef = useRef(null);

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      const { hh: h, mm: m, ss: s, ampm: a } = parseVal(value);
      setHh(h); setMm(m); setSs(s); setAmpm(a);
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emit = useCallback((h, m, s, a) => {
    const empty = !h && !m && !s;
    const out = empty ? "" : `${(h || "00").padStart(2, "0")}:${(m || "00").padStart(2, "0")}:${(s || "00").padStart(2, "0")} ${a}`;
    lastEmittedRef.current = out;
    onChange(out);
  }, [onChange]);

  const segStyle = {
    width: 24, textAlign: "center", border: "none", outline: "none",
    background: "transparent", fontSize: "0.82rem", fontFamily: "monospace",
    fontWeight: 600, color: disabled ? "#aaa" : T.text, padding: 0,
    cursor: disabled ? "not-allowed" : "text",
  };
  const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const MINUTES = ["00", "15", "30", "45"];
  const isEmpty = !hh && !mm && !ss;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, width: "100%" }}>
      <Box
        onClick={() => !disabled && hhRef.current?.focus()}
        sx={{
          flex: 1, display: "flex", alignItems: "center", minWidth: 0,
          px: 1, py: 0.65,
          border: `1px solid ${focused ? accentColor : "rgba(0,0,0,0.23)"}`,
          borderRadius: "4px",
          boxShadow: focused ? `0 0 0 1px ${accentColor}` : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          bgcolor: disabled ? "#f5f5f5" : "#fff",
          cursor: disabled ? "not-allowed" : "text",
          position: "relative",
        }}
      >
        {label && (
          <Box component="span" sx={{ position: "absolute", top: -8, left: 7, px: 0.4, bgcolor: disabled ? "#f5f5f5" : "#fff", fontSize: "0.62rem", color: focused ? accentColor : "rgba(0,0,0,0.55)", lineHeight: 1, pointerEvents: "none", transition: "color 0.15s", whiteSpace: "nowrap" }}>
            {label}
          </Box>
        )}
        <input
          ref={hhRef} type="text" inputMode="numeric" maxLength={2} placeholder="HH" value={hh} disabled={disabled}
          onChange={(e) => { const r = e.target.value.replace(/\D/g, "").slice(0, 2); setHh(r); emit(r, mm, ss, ampm); if (r.length === 2) { mmRef.current?.focus(); mmRef.current?.select(); } }}
          onBlur={(e) => { setFocused(false); const v = e.target.value.replace(/\D/g, ""); const p = v ? v.padStart(2, "0") : ""; setHh(p); emit(p, mm, ss, ampm); }}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && e.target.selectionStart === e.target.value.length) { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
            if (e.key === ":") { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
          }}
          style={segStyle}
        />
        <span style={{ fontSize: "0.82rem", fontFamily: "monospace", color: "#bbb", lineHeight: 1, margin: "0 1px", userSelect: "none" }}>:</span>
        <input
          ref={mmRef} type="text" inputMode="numeric" maxLength={2} placeholder="MM" value={mm} disabled={disabled}
          onChange={(e) => { const r = e.target.value.replace(/\D/g, "").slice(0, 2); setMm(r); emit(hh, r, ss, ampm); if (r.length === 2) { ssRef.current?.focus(); ssRef.current?.select(); } }}
          onBlur={(e) => { setFocused(false); const v = e.target.value.replace(/\D/g, ""); const p = v ? v.padStart(2, "0") : ""; setMm(p); emit(hh, p, ss, ampm); }}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !mm) { e.preventDefault(); hhRef.current?.focus(); hhRef.current?.select(); }
            if (e.key === "ArrowLeft" && e.target.selectionStart === 0) { e.preventDefault(); hhRef.current?.focus(); hhRef.current?.select(); }
            if (e.key === "ArrowRight" && e.target.selectionStart === e.target.value.length) { e.preventDefault(); ssRef.current?.focus(); ssRef.current?.select(); }
            if (e.key === ":") { e.preventDefault(); ssRef.current?.focus(); ssRef.current?.select(); }
          }}
          style={segStyle}
        />
        <span style={{ display: "none", fontSize: "0.82rem", fontFamily: "monospace", color: "#bbb", lineHeight: 1, margin: "0 1px", userSelect: "none" }}>:</span>
        <input
          ref={ssRef} type="text" inputMode="numeric" maxLength={2} placeholder="SS" value={ss} disabled={disabled}
          onChange={(e) => { const r = e.target.value.replace(/\D/g, "").slice(0, 2); setSs(r); emit(hh, mm, r, ampm); }}
          onBlur={(e) => { setFocused(false); const v = e.target.value.replace(/\D/g, ""); const p = v ? v.padStart(2, "0") : ""; setSs(p); emit(hh, mm, p, ampm); }}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !ss) { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
            if (e.key === "ArrowLeft" && e.target.selectionStart === 0) { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
          }}
          style={{ ...segStyle, display: "none" }}
        />
      </Box>

      <Select
        size={size}
        value={ampm}
        onChange={(e) => { setAmpm(e.target.value); emit(hh, mm, ss, e.target.value); }}
        disabled={disabled}
        renderValue={(v) => v}
        sx={{
          fontSize: "0.78rem", fontWeight: 700, minWidth: 58, width: 58,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: accentColor },
          color: ampm === "AM" ? "#1565c0" : accentColor,
          "& .MuiSelect-select": { px: 1, py: 0.85, pr: "24px !important" },
          "& .MuiSelect-icon": { right: 2, fontSize: "1rem" },
        }}
      >
        <MenuItem value="AM" sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1565c0" }}>AM</MenuItem>
        <MenuItem value="PM" sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>PM</MenuItem>
      </Select>

      <Tooltip title="Quick pick">
        <span>
          <IconButton
            size="small" disabled={disabled}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ color: alpha(accentColor, 0.7), p: 0.5, "&:hover": { color: accentColor, bgcolor: alpha(accentColor, 0.08) } }}
          >
            <AccessTime fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {!isEmpty && (
        <Tooltip title="Clear">
          <IconButton
            size="small" disabled={disabled}
            onClick={() => { setHh(""); setMm(""); setSs(""); setAmpm("AM"); lastEmittedRef.current = ""; onChange(""); }}
            sx={{ color: alpha("#000", 0.35), p: 0.5, "&:hover": { color: "#c62828", bgcolor: alpha("#c62828", 0.08) } }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Popover
        open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            borderRadius: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            border: `1px solid ${alpha(accentColor, 0.18)}`,
            p: 0, width: 300, maxHeight: 340, overflow: "hidden",
            display: "flex", flexDirection: "column",
          },
        }}
      >
        <Box sx={{ bgcolor: accentColor, px: 2, py: 1, flexShrink: 0 }}>
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Quick Pick
          </Typography>
        </Box>
        <Box sx={{ overflowY: "auto", flex: 1 }}>
          {["AM", "PM"].map((ap) => (
            <Box key={ap}>
              <Box sx={{ px: 2, py: 0.6, bgcolor: ap === "AM" ? "#e3f0fb" : "#f7f0f0", position: "sticky", top: 0, zIndex: 1 }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: ap === "AM" ? "#1565c0" : accentColor, letterSpacing: "0.6px" }}>
                  {ap}
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "3px", px: 1.25, py: 0.75 }}>
                {HOURS.map((h) =>
                  MINUTES.map((min) => (
                    <Button
                      key={`${h}${min}${ap}`} size="small"
                      onClick={() => { setHh(h); setMm(min); setSs("00"); setAmpm(ap); emit(h, min, "00", ap); setAnchorEl(null); }}
                      sx={{
                        minWidth: 0, height: 26, fontSize: "0.68rem", fontWeight: 600,
                        fontFamily: "monospace", px: 0, borderRadius: 1, textTransform: "none",
                        bgcolor: alpha(ap === "AM" ? "#1565c0" : accentColor, 0.06),
                        color: ap === "AM" ? "#1565c0" : accentColor,
                        border: `1px solid ${alpha(ap === "AM" ? "#1565c0" : accentColor, 0.18)}`,
                        "&:hover": { bgcolor: alpha(ap === "AM" ? "#1565c0" : accentColor, 0.18), transform: "scale(1.05)" },
                        transition: "all 0.1s ease",
                      }}
                    >
                      {h}:{min}
                    </Button>
                  )),
                )}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ px: 2, py: 0.75, borderTop: `1px solid ${alpha(accentColor, 0.12)}`, display: "flex", justifyContent: "flex-end", flexShrink: 0, bgcolor: "#fafafa" }}>
          <Button size="small" onClick={() => setAnchorEl(null)} sx={{ fontSize: "0.72rem", color: "#555", textTransform: "none", minWidth: 0, px: 1.5 }}>
            Close
          </Button>
        </Box>
      </Popover>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  },
});

const countUniqueSchedules = (rows) => {
  const keys = new Set();
  for (const r of rows || []) {
    const s = normalizeDateStr(r?.startDate);
    const e = normalizeDateStr(r?.endDate);
    if (s && e) keys.add(`${s}|${e}`);
  }
  return keys.size;
};

const officialTimeGetConfig = (skipAudit = false) => ({
  ...getAuthHeaders(),
  ...(skipAudit ? { params: { skipAudit: "1" } } : {}),
});

const formatDateOnly = (val) => {
  if (!val) return "—";
  const s = String(val).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateLong = (val) => {
  if (!val) return "";
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const s = String(val).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return `${months[m - 1]} ${String(d).padStart(2, "0")}, ${y}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;
};

const formatScheduleDisplayText = (academicYear) => {
  if (!academicYear) return "—";
  const str = String(academicYear).trim();
  const yearsMatch = str.match(/(\d{4})\s*-\s*(\d{4})/);
  const semesterMatch =
    str.match(/(1st|2nd|Summer|Vacation|Christmas|Midyear|Enrollment)\s+\w+/i) ||
    str.match(/(1st|2nd|Summer|Vacation|Christmas|Midyear|Enrollment)/i);
  if (yearsMatch) {
    const years = `${yearsMatch[1]} - ${yearsMatch[2]}`;
    const semester = semesterMatch ? semesterMatch[0].trim() : "";
    return semester ? `${semester} S.Y ${years}` : `S.Y ${years}`;
  }
  return str;
};

const normalizeDateStr = (val) => {
  if (!val) return "";
  const s = String(val).split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

const parseTimeToMinutes = (str) => {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

const formatMinutesToTime = (m) => {
  if (m == null || m < 0 || m >= 24 * 60) return "";
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ap}`;
};

const checkTimeOverlaps = (rows) => {
  if (!rows?.length) return { valid: true };
  for (const row of rows) {
    const segs = [];
    const r = row || {};
    const push = (inKey, outKey, label) => {
      const s = parseTimeToMinutes(r[inKey]);
      const e = parseTimeToMinutes(r[outKey]);
      if (s != null && e != null && s < e && !(s === 0 && e === 12 * 60)) segs.push({ start: s, end: e, label });
    };
    const tIn = parseTimeToMinutes(r.officialTimeIN);
    const tOut = parseTimeToMinutes(r.officialTimeOUT);
    const bIn = parseTimeToMinutes(r.officialBreaktimeIN);
    const bOut = parseTimeToMinutes(r.officialBreaktimeOUT);
    if (tIn != null && tOut != null && tIn < tOut) {
      if (bIn != null && bOut != null && bIn > tIn && bOut < tOut && bIn < bOut) {
        if (tIn < bIn) segs.push({ start: tIn, end: bIn, label: "Work Days" });
        if (bOut < tOut) segs.push({ start: bOut, end: tOut, label: "Work Days" });
      } else segs.push({ start: tIn, end: tOut, label: "Work Days" });
    }
    push("officialHonorariumTimeIN", "officialHonorariumTimeOUT", "Honorarium");
    push("officialServiceCreditTimeIN", "officialServiceCreditTimeOUT", "Service Credits");
    push("officialOverTimeIN", "officialOverTimeOUT", "Overtime");
    for (let a = 0; a < segs.length; a++)
      for (let b = a + 1; b < segs.length; b++)
        if (segs[a].start < segs[b].end && segs[b].start < segs[a].end)
          return { valid: false, day: r.day, segmentA: segs[a], segmentB: segs[b] };
  }
  return { valid: true };
};

const deepClone = (o) => JSON.parse(JSON.stringify(o));
const computeChecksum = (data) => {
  const s = JSON.stringify(data);
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h = h >>> 0; }
  return h;
};

const DAYS_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ─────────────────────────────────────────────────────────────────────────────
// [CHANGE A] makeDefaultRow — weekends default to blank for all time fields
// ─────────────────────────────────────────────────────────────────────────────
const makeDefaultRow = (employeeID, day) => {
  const isWeekend = day === "Saturday" || day === "Sunday";
  return {
    employeeID,
    day,
    officialTimeIN:              isWeekend ? "" : "08:00:00 AM",
    officialBreaktimeIN:         isWeekend ? "" : "00:00:00 AM",
    officialBreaktimeOUT:        isWeekend ? "" : "00:00:00 PM",
    officialTimeOUT:             isWeekend ? "" : "05:00:00 PM",
    officialHonorariumTimeIN:    isWeekend ? "" : "00:00:00 AM",
    officialHonorariumTimeOUT:   isWeekend ? "" : "00:00:00 PM",
    officialServiceCreditTimeIN: isWeekend ? "" : "00:00:00 AM",
    officialServiceCreditTimeOUT:isWeekend ? "" : "00:00:00 AM",
    officialOverTimeIN:          isWeekend ? "" : "00:00:00 AM",
    officialOverTimeOUT:         isWeekend ? "" : "00:00:00 PM",
    breaktime: "",
  };
};

const TIME_FIELDS = {
  workDays: [
    { key: "officialTimeIN", label: "Time In" },
    { key: "officialBreaktimeIN", label: "Break In" },
    { key: "officialBreaktimeOUT", label: "Break Out" },
    { key: "officialTimeOUT", label: "Time Out" },
  ],
  honorarium: [
    { key: "officialHonorariumTimeIN", label: "Honorarium In" },
    { key: "officialHonorariumTimeOUT", label: "Honorarium Out" },
  ],
  serviceCredits: [
    { key: "officialServiceCreditTimeIN", label: "SC In" },
    { key: "officialServiceCreditTimeOUT", label: "SC Out" },
  ],
  overtime: [
    { key: "officialOverTimeIN", label: "OT In" },
    { key: "officialOverTimeOUT", label: "OT Out" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BUTTON — reusable labeled pill button for row actions
// ─────────────────────────────────────────────────────────────────────────────
const ActionBtn = ({ onClick, disabled, icon: Icon, label, variant = "default", tooltip }) => {
  const styles = {
    default: { color: disabled ? T.faint : T.faint, borderColor: T.divider, bgcolor: "transparent", hoverBg: "rgba(0,0,0,0.05)" },
    clear:   { color: "#a32d2d", borderColor: "rgba(198,40,40,0.3)", bgcolor: "rgba(198,40,40,0.04)", hoverBg: "rgba(198,40,40,0.10)" },
    copy:    { color: T.accent, borderColor: alpha(T.accent, 0.32), bgcolor: T.accentFaint, hoverBg: alpha(T.accent, 0.12) },
    apply:   { color: "#185fa5", borderColor: "rgba(21,101,192,0.32)", bgcolor: "rgba(21,101,192,0.05)", hoverBg: "rgba(21,101,192,0.12)" },
    // [CHANGE B] new variant for Fill Break
    break:   { color: "#6a1f8a", borderColor: "rgba(106,31,138,0.32)", bgcolor: "rgba(106,31,138,0.05)", hoverBg: "rgba(106,31,138,0.13)" },
  };
  const s = styles[variant] || styles.default;

  const btn = (
    <Button
      size="small"
      onClick={onClick}
      disabled={disabled}
      startIcon={<Icon sx={{ fontSize: "13px !important" }} />}
      sx={{
        fontSize: "0.66rem", fontWeight: 600, textTransform: "none",
        px: 0.9, py: 0.35, borderRadius: "6px",
        border: `0.5px solid ${disabled ? T.divider : s.borderColor}`,
        color: disabled ? T.faint : s.color,
        bgcolor: disabled ? "transparent" : s.bgcolor,
        minWidth: 0, lineHeight: 1.4, whiteSpace: "nowrap", gap: 0.4,
        "& .MuiButton-startIcon": { mr: 0.4 },
        "&:hover": { bgcolor: disabled ? "transparent" : s.hoverBg, borderColor: disabled ? T.divider : s.borderColor },
        "&.Mui-disabled": { opacity: 0.38, color: T.faint, borderColor: T.divider, bgcolor: "transparent" },
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {label}
    </Button>
  );

  return tooltip && !disabled ? (
    <Tooltip title={tooltip} placement="top" arrow><span>{btn}</span></Tooltip>
  ) : btn;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE TIME ROWS
// [CHANGE B] Added fillBreak helper + "Fill break" ActionBtn on Work Days tab
// ─────────────────────────────────────────────────────────────────────────────
const ScheduleTimeRows = ({ records, onChangeRecord, scheduleView, readOnly = false }) => {
  const fields = TIME_FIELDS[scheduleView] || TIME_FIELDS.workDays;

  const rowHasValues = (record) =>
    fields.some((f) => record[f.key] && record[f.key] !== "");

  const rowMatchesAbove = (index) => {
    if (index === 0) return false;
    const above = records[index - 1];
    const current = records[index];
    return fields.every((f) => (above[f.key] || "") === (current[f.key] || ""));
  };

  const clearRow = (index) => {
    fields.forEach((f) => onChangeRecord(index, f.key, ""));
  };

  const copyFromAbove = (index) => {
    const above = records[index - 1];
    fields.forEach((f) => onChangeRecord(index, f.key, above[f.key] || ""));
  };

  const applyToAllBelow = (fromIndex) => {
    const source = records[fromIndex];
    for (let i = fromIndex + 1; i < records.length; i++) {
      fields.forEach((f) => onChangeRecord(i, f.key, source[f.key] || ""));
    }
  };

  // [CHANGE B] Fill Break In + Break Out with defaults if they are empty
  const isNoTimeValue = (v) =>
    !v || v === "" || /^00:00:00\s*(AM|PM)$/i.test(String(v).trim());

  const fillBreak = (index) => {
    const row = records[index];
    const breakInVal  = isNoTimeValue(row.officialBreaktimeIN)  ? "12:00:00 PM" : row.officialBreaktimeIN;
    const breakOutVal = isNoTimeValue(row.officialBreaktimeOUT) ? "01:00:00 PM" : row.officialBreaktimeOUT;
    onChangeRecord(index, "officialBreaktimeIN",  breakInVal);
    onChangeRecord(index, "officialBreaktimeOUT", breakOutVal);
  };

  // [CHANGE B] Button appears whenever BOTH break fields have no real time set —
  // either truly empty (weekends), OR still at the "00:00:00 AM/PM" placeholder
  // default used on weekdays. Either way, the user hasn't set a real break yet.
  const breakIsEmpty = (index) => {
    const row = records[index];
    return isNoTimeValue(row.officialBreaktimeIN) && isNoTimeValue(row.officialBreaktimeOUT);
  };

  return (
    <>
      <TableHead>
        <TableRow sx={{ bgcolor: T.accent }}>
          <TableCell
            sx={{
              color: "#fff", fontWeight: 700, fontSize: "0.75rem", py: 1.25,
              width: 100, position: "sticky", top: 0, zIndex: 1, bgcolor: T.accent,
            }}
          >
            Day
          </TableCell>
          {fields.map((f) => (
            <TableCell
              key={f.key}
              sx={{
                color: "#fff", fontWeight: 700, fontSize: "0.75rem", py: 1.25,
                minWidth: readOnly ? 130 : 170, position: "sticky", top: 0, zIndex: 1, bgcolor: T.accent,
              }}
            >
              {f.label}
            </TableCell>
          ))}
          {!readOnly && (
            <TableCell
              sx={{
                color: "#fff", fontWeight: 700, fontSize: "0.75rem", py: 1.25,
                width: 220, position: "sticky", top: 0, zIndex: 1, bgcolor: T.accent,
              }}
            >
              Actions
            </TableCell>
          )}
        </TableRow>
      </TableHead>

      <TableBody>
        {records.map((record, index) => {
          const hasValues        = rowHasValues(record);
          const aboveHasValues   = index > 0 && rowHasValues(records[index - 1]);
          const matchesAbove     = !readOnly && rowMatchesAbove(index);
          const canCopyFromAbove = !readOnly && index > 0 && aboveHasValues && !matchesAbove;
          const isLastRow        = index === records.length - 1;
          // [CHANGE B] only relevant on Work Days tab
          const showFillBreak    = !readOnly && scheduleView === "workDays" && breakIsEmpty(index);

          return (
            <TableRow
              key={record.day || index}
              sx={{ "&:nth-of-type(even)": { bgcolor: T.rowOdd }, "&:hover": { bgcolor: T.rowHover } }}
            >
              <TableCell sx={{ fontWeight: 700, color: T.text, fontSize: "0.82rem", py: 0.75, verticalAlign: "middle" }}>
                {record.day}
              </TableCell>

              {fields.map((f) => (
                <TableCell key={f.key} sx={{ py: 0.6, minWidth: readOnly ? 130 : 170, verticalAlign: "middle" }}>
                  {readOnly ? (
                    <Typography sx={{ color: T.text, fontSize: "0.82rem", fontFamily: "monospace" }}>
                      {record[f.key] || "—"}
                    </Typography>
                  ) : (
                    <TimePickerField
                      value={record[f.key] || ""}
                      onChange={(val) => onChangeRecord(index, f.key, val)}
                      accentColor={T.accent}
                    />
                  )}
                </TableCell>
              ))}

              {!readOnly && (
                <TableCell sx={{ py: 0.6, verticalAlign: "middle" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "nowrap" }}>

                    {/* 1. Clear this row */}
                    <ActionBtn
                      onClick={() => clearRow(index)}
                      disabled={!hasValues}
                      icon={ClearAll}
                      label="Clear row"
                      variant="clear"
                      tooltip={`Clear all ${scheduleView} times for ${record.day}`}
                    />

                    {/* [CHANGE B] 2. Fill Break — Work Days tab only, shown when both break fields empty */}
                    {showFillBreak && (
                      <ActionBtn
                        onClick={() => fillBreak(index)}
                        icon={AccessTime}
                        label="Fill break"
                        variant="break"
                        tooltip={`Auto-fill Break In (12:00 PM) & Break Out (1:00 PM) for ${record.day}`}
                      />
                    )}

                    {/* 3. Copy from above */}
                    {canCopyFromAbove && (
                      <ActionBtn
                        onClick={() => copyFromAbove(index)}
                        icon={ArrowBack}
                        label="Copy above"
                        variant="copy"
                        tooltip={`Copy ${records[index - 1].day}'s times to ${record.day}`}
                      />
                    )}

                    {/* 4. Apply to all below */}
                    {hasValues && !isLastRow && (
                      <ActionBtn
                        onClick={() => applyToAllBelow(index)}
                        icon={ArrowForward}
                        label="Apply to all"
                        variant="apply"
                        tooltip={`Apply ${record.day}'s times to all days below`}
                      />
                    )}

                  </Box>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VIEW TOGGLE (Single / All Users)
// ─────────────────────────────────────────────────────────────────────────────
const ViewToggle = ({ value, onChange }) => (
  <Box sx={{ display: "flex", border: `1.5px solid ${alpha(T.accent, 0.35)}`, borderRadius: 2, overflow: "hidden", bgcolor: alpha(T.accent, 0.04) }}>
    {[
      { key: "single", label: "Single Employee", icon: <Person sx={{ fontSize: 16 }} /> },
      { key: "allUsers", label: "All Users", icon: <PeopleIcon sx={{ fontSize: 16 }} /> },
    ].map(({ key, label, icon }, i) => {
      const active = value === key;
      return (
        <Button
          key={key}
          onClick={() => onChange(key)}
          startIcon={icon}
          disableElevation
          sx={{
            borderRadius: 0, textTransform: "none",
            fontWeight: active ? 700 : 500, fontSize: "0.85rem", px: 2.5, py: 1,
            bgcolor: active ? T.accent : "transparent",
            color: active ? "#fff" : T.accent,
            borderRight: i === 0 ? `1px solid ${alpha(T.accent, 0.25)}` : "none",
            transition: "all 0.18s ease",
            "&:hover": { bgcolor: active ? T.accentDark : alpha(T.accent, 0.1) },
          }}
        >
          {label}
        </Button>
      );
    })}
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// TAMPER WARNING BANNER
// ─────────────────────────────────────────────────────────────────────────────
const TamperWarningBanner = ({ onRestore }) => (
  <Box
    sx={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      bgcolor: "#7a0000", color: "#fff", px: 3, py: 1.5,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)", borderBottom: "3px solid #ff4444",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <WarningAmber sx={{ color: "#ffd180", fontSize: 22 }} />
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.2 }}>⚠ Data Tampering Detected</Typography>
        <Typography sx={{ fontSize: "0.78rem", opacity: 0.85, mt: 0.25 }}>Schedule data was modified outside the application.</Typography>
      </Box>
    </Box>
    <Button
      variant="outlined" size="small" onClick={onRestore}
      sx={{ borderColor: "#ffd180", color: "#ffd180", fontWeight: 700, textTransform: "none", fontSize: "0.8rem", flexShrink: 0, ml: 2, "&:hover": { bgcolor: "rgba(255,209,128,0.15)", borderColor: "#ffd180" } }}
    >
      Restore from Server
    </Button>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const OfficialTimeForm = () => {
  const { settings } = useSystemSettings();
  const { hasAccess, loading: accessLoading } = usePageAccess("official-time");

  const [viewMode, setViewMode] = useState("single");
  const showSingleView = viewMode === "single";
  const showAllUsers = viewMode === "allUsers";

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeID, setEmployeeID] = useState("");
  const [records, setRecords] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [found, setFound] = useState(false);
  const [file, setFile] = useState(null);

  const [draftAcademicYear, setDraftAcademicYear] = useState("");
  const [draftSemester, setDraftSemester] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const draftStatus = "active";

  const [activeScheduleKey, setActiveScheduleKey] = useState(null);
  const [scheduleView, setScheduleView] = useState("workDays");

  const [showViewScheduleModal, setShowViewScheduleModal] = useState(false);
  const [viewScheduleInfo, setViewScheduleInfo] = useState(null);
  const [viewScheduleRecords, setViewScheduleRecords] = useState([]);
  const [viewScheduleView, setViewScheduleView] = useState("workDays");
  const [isEditingViewSchedule, setIsEditingViewSchedule] = useState(false);
  const [editViewRecords, setEditViewRecords] = useState([]);
  const [editViewScheduleView, setEditViewScheduleView] = useState("workDays");
  const [editViewSaving, setEditViewSaving] = useState(false);
  const [editViewEndDate, setEditViewEndDate] = useState("");

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [modalRecords, setModalRecords] = useState([]);
  const [modalScheduleView, setModalScheduleView] = useState("workDays");
  const [checkingOverlap, setCheckingOverlap] = useState(false);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningOverlap, setWarningOverlap] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsersPage, setAllUsersPage] = useState(0);
  const [allUsersRowsPerPage, setAllUsersRowsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showBulkBlocksModal, setShowBulkBlocksModal] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkScheduleBlocks, setBulkScheduleBlocks] = useState([]);
  const [bulkTargetEmployees, setBulkTargetEmployees] = useState([]);
  const [isBulkSchedule, setIsBulkSchedule] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [previewViewScheduleView, setPreviewViewScheduleView] = useState("workDays");
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzeEmployeeNames, setAnalyzeEmployeeNames] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadAcknowledgeChecked, setUploadAcknowledgeChecked] = useState(false);

  // ── Department-scoped upload ──
  const [deptFile, setDeptFile] = useState(null);
  const [deptUploadDepartment, setDeptUploadDepartment] = useState("");
  const [deptAnalyzing, setDeptAnalyzing] = useState(false);
  const [deptConfirming, setDeptConfirming] = useState(false);
  const [deptAnalyzeResult, setDeptAnalyzeResult] = useState(null);
  const [showDeptAnalyzeModal, setShowDeptAnalyzeModal] = useState(false);
  const [deptUploadAcknowledgeChecked, setDeptUploadAcknowledgeChecked] = useState(false);
  const [deptAnalyzeEmployeeNames, setDeptAnalyzeEmployeeNames] = useState({});

  // ── Employment-Category-scoped upload ──
  // Mirrors the Department-scoped upload state/handlers exactly, but scopes
  // the upload to a single employment_type_config.id instead of a department.
  const [catFile, setCatFile] = useState(null);
  const [catUploadCategory, setCatUploadCategory] = useState("");
  const [catAnalyzing, setCatAnalyzing] = useState(false);
  const [catConfirming, setCatConfirming] = useState(false);
  const [catAnalyzeResult, setCatAnalyzeResult] = useState(null);
  const [showCatAnalyzeModal, setShowCatAnalyzeModal] = useState(false);
  const [catUploadAcknowledgeChecked, setCatUploadAcknowledgeChecked] = useState(false);
  const [catAnalyzeEmployeeNames, setCatAnalyzeEmployeeNames] = useState({});

  // ── Department Table options (source of truth for the Department dropdowns) ──
  // [CHANGE E] Fetched from GET /officialtime/departments, which reads
  // directly from department_table (joined with department_assignment).
  const [departmentTableList, setDepartmentTableList] = useState([]);

  const fetchDepartmentTableOptions = useCallback(async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/officialtime/departments`, getAuthHeaders());
      setDepartmentTableList(Array.isArray(r.data) ? r.data : []);
    } catch {
      setDepartmentTableList([]);
    }
  }, []);

  useEffect(() => {
    fetchDepartmentTableOptions();
  }, [fetchDepartmentTableOptions]);

  // ── Employment Category options (source of truth for the Employment
  // Category dropdowns) — fetched from GET /officialtime/employment-categories,
  // which reads directly from employment_type_config (isActive = 1). This is
  // an INDEPENDENT axis from Department: e.g. Department = "College of
  // Engineering", Employment Category = "Non-Teaching | General Administration".
  // [CHANGE H] Each item now also carries colorHex (from employment_type_config)
  // so the dropdowns/table can render the same color used in
  // EmploymentCategoryManagement.jsx.
  const [employmentCategoryList, setEmploymentCategoryList] = useState([]);

  const fetchEmploymentCategoryOptions = useCallback(async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/officialtime/employment-categories`, getAuthHeaders());
      setEmploymentCategoryList(Array.isArray(r.data) ? r.data : []);
    } catch {
      setEmploymentCategoryList([]);
    }
  }, []);

  useEffect(() => {
    fetchEmploymentCategoryOptions();
  }, [fetchEmploymentCategoryOptions]);

  // [CHANGE H] Quick id → colorHex lookup, used wherever we only have an id
  // (e.g. the currently-selected upload category) and need its color.
  const employmentCategoryColorById = useMemo(() => {
    const map = new Map();
    employmentCategoryList.forEach((c) => map.set(String(c.id), c.colorHex || DEFAULT_CATEGORY_COLOR));
    return map;
  }, [employmentCategoryList]);

  // ── All Users filters ──
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEmploymentCategory, setFilterEmploymentCategory] = useState(""); // [NEW]
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [tamperDetected, setTamperDetected] = useState(false);

  const serverRecordsRef = useRef([]);
  const checksumRef = useRef(null);
  const tamperCheckIntervalRef = useRef(null);

  // ── Helpers ──
  const showToast = useCallback((msg) => {
    setSuccessAction(msg);
    setSuccessOpen(true);
    setTimeout(() => setSuccessOpen(false), 3000);
  }, []);

  const buildDefaultRecords = useCallback(
    (empId) => DAYS_ORDER.map((day) => makeDefaultRow(empId, day)),
    [],
  );

  const stampServerRecords = useCallback((data) => {
    const clean = deepClone(data);
    serverRecordsRef.current = clean;
    checksumRef.current = computeChecksum(clean);
    setTamperDetected(false);
  }, []);

  // ── All Users — fetchAllUsers ──
  // [FIX D] Declared here (before handleAnalyzeFile/handleConfirmUpload/
  // handleConfirmDeptUpload/handleConfirmCatUpload) so it is initialized
  // before those callbacks' dependency arrays close over it.
  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/officialtime/users-status`, getAuthHeaders());
      setAllUsers(r.data || []);
      setAllUsersPage(0);
    } catch {
      showToast("Error fetching users.");
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  const scheduleBlocks = useMemo(() => {
    const byKey = new Map();
    for (const r of records) {
      const key = `${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
      if (!byKey.has(key)) byKey.set(key, { academicYear: r.academicYear, startDate: r.startDate, endDate: r.endDate, status: r.status, key });
    }
    return Array.from(byKey.values())
      .filter((v) => normalizeDateStr(v.startDate) || normalizeDateStr(v.endDate))
      .sort((a, b) => (String(b.status).toLowerCase() === "active" ? 1 : 0) - (String(a.status).toLowerCase() === "active" ? 1 : 0));
  }, [records]);

  const scheduleBlockRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < scheduleBlocks.length; i += 2) rows.push(scheduleBlocks.slice(i, i + 2));
    return rows;
  }, [scheduleBlocks]);

  const activeBlockData = useMemo(() => {
    if (!activeScheduleKey) return scheduleBlocks[0] || null;
    return scheduleBlocks.find((b) => b.key === activeScheduleKey) || scheduleBlocks[0] || null;
  }, [activeScheduleKey, scheduleBlocks]);

  const activeBlockRecords = useMemo(() => {
    if (!activeBlockData) return [];
    const normStart = normalizeDateStr(activeBlockData.startDate);
    const normEnd = normalizeDateStr(activeBlockData.endDate);
    return [...records.filter((r) => normalizeDateStr(r.startDate) === normStart && normalizeDateStr(r.endDate) === normEnd)]
      .sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
  }, [activeBlockData, records]);

  // ── Tamper check ──
  useEffect(() => {
    if (tamperCheckIntervalRef.current) clearInterval(tamperCheckIntervalRef.current);
    if (!serverRecordsRef.current.length) return;
    tamperCheckIntervalRef.current = setInterval(() => {
      setRecords((current) => {
        if (checksumRef.current && computeChecksum(current) !== checksumRef.current) {
          setTamperDetected(true);
          return deepClone(serverRecordsRef.current);
        }
        return current;
      });
    }, 3000);
    return () => clearInterval(tamperCheckIntervalRef.current);
  }, [hasSearched]);

  useEffect(() => () => { if (tamperCheckIntervalRef.current) clearInterval(tamperCheckIntervalRef.current); }, []);

  // ── Employee select ──
  const handleEmployeeSelect = useCallback(async (emp) => {
    setSelectedEmployee(emp);
    setEmployeeID(String(emp.employeeNumber));
    setRecords([]);
    setHasSearched(false);
    setFound(false);
    setActiveScheduleKey(null);
    setDraftAcademicYear("");
    setDraftSemester("");
    setDraftStartDate("");
    setDraftEndDate("");
    setLastSaved(null);
    serverRecordsRef.current = [];
    checksumRef.current = null;
    setTamperDetected(false);

    const id = String(emp.employeeNumber);
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${id}`, officialTimeGetConfig(true));
      const data = res.data.length > 0 ? res.data : buildDefaultRecords(id);
      stampServerRecords(data);
      setRecords(deepClone(data));
      const hadExisting = res.data.length > 0;
      setFound(hadExisting);
      if (hadExisting) {
        const byKey = new Map();
        for (const r of res.data) {
          const key = `${normalizeDateStr(r.startDate)}|${normalizeDateStr(r.endDate)}`;
          if (!byKey.has(key)) byKey.set(key, { status: r.status, key });
        }
        const sorted = Array.from(byKey.values()).sort((a, b) => (String(b.status).toLowerCase() === "active" ? 1 : 0) - (String(a.status).toLowerCase() === "active" ? 1 : 0));
        if (sorted.length > 0) setActiveScheduleKey(sorted[0].key);
      }
      logOfficialTimeSearch({
        targetEmployeeNumber: id,
        targetName: emp?.name || String(emp.employeeNumber || id),
        scheduleCount: countUniqueSchedules(res.data),
        hadExisting,
      });
    } catch (err) {
      console.error("Error fetching records:", err);
      showToast("Error fetching records.");
    } finally {
      setLoading(false);
    }
  }, [buildDefaultRecords, showToast, stampServerRecords]);

  const handleEmployeeClear = useCallback(() => {
    setSelectedEmployee(null);
    setEmployeeID("");
    setRecords([]);
    setHasSearched(false);
    setFound(false);
    setActiveScheduleKey(null);
    serverRecordsRef.current = [];
    checksumRef.current = null;
    setTamperDetected(false);
  }, []);

  const handleRestoreFromServer = useCallback(async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${employeeID}`, officialTimeGetConfig(true));
      const fresh = res.data.length > 0 ? res.data : buildDefaultRecords(employeeID);
      stampServerRecords(fresh);
      setRecords(deepClone(fresh));
      setFound(res.data.length > 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTamperDetected(false);
    }
  }, [employeeID, buildDefaultRecords, stampServerRecords]);

  // ── Create schedule modal ──
  const openCreateScheduleModal = useCallback(async () => {
    if (!employeeID) { showToast("Please select an employee first."); return; }
    if (!draftAcademicYear) { showToast("Please fill Academic Year first."); return; }
    if (!draftStartDate || !draftEndDate) { showToast("Please fill Start Date and End Date first."); return; }
    if (new Date(draftStartDate) > new Date(draftEndDate)) { showToast("Start date must be on or before End date."); return; }

    const draftStart = new Date(draftStartDate).getTime();
    const draftEnd   = new Date(draftEndDate).getTime();
    const hasConflict = scheduleBlocks.some((v) => {
      const s = v.startDate ? new Date(v.startDate).getTime() : 0;
      const e = v.endDate   ? new Date(v.endDate).getTime()   : 0;
      return s < draftEnd && e > draftStart;
    });
    if (hasConflict) { setShowConflictModal(true); return; }

    const sevenRows = DAYS_ORDER.map((day) => {
      const existing = records.find((r) => r.day === day && activeBlockData && normalizeDateStr(r.startDate) === normalizeDateStr(activeBlockData.startDate));
      return existing ? { ...existing, employeeID } : makeDefaultRow(employeeID, day);
    });
    setModalRecords(sevenRows);
    setModalScheduleView("workDays");
    setIsBulkSchedule(false);
    setShowScheduleModal(true);
  }, [employeeID, draftAcademicYear, draftSemester, draftStartDate, draftEndDate, scheduleBlocks, records, activeBlockData, showToast]);

  const handleModalRecordChange = useCallback((index, field, value) => {
    setModalRecords((prev) => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  }, []);

  const handleClearModalTimes = useCallback(() => {
    const fields = (TIME_FIELDS[modalScheduleView] || []).map((f) => f.key);
    setModalRecords((prev) => prev.map((row) => { const u = { ...row }; fields.forEach((f) => { u[f] = ""; }); return u; }));
  }, [modalScheduleView]);

  const handleResetModalToDefault = useCallback(() => {
    setModalRecords(DAYS_ORDER.map((day) => makeDefaultRow(employeeID, day)));
  }, [employeeID]);

  const handleSubmitFromModal = useCallback(async () => {
    if (!employeeID || !draftStartDate || !draftEndDate) { showToast("Employee, start date and end date are required."); return; }
    const sevenRows = DAYS_ORDER.map((day) => { const r = modalRecords.find((x) => x.day === day); return r ? { ...r, day } : makeDefaultRow(employeeID, day); });
    setCheckingOverlap(true);
    await new Promise((r) => setTimeout(r, 300));
    const overlapResult = checkTimeOverlaps(sevenRows);
    setCheckingOverlap(false);
    if (!overlapResult.valid) {
      const a = overlapResult.segmentA, b = overlapResult.segmentB;
      setWarningMessage(`Time overlap on ${overlapResult.day}: ${a.label} (${formatMinutesToTime(a.start)} – ${formatMinutesToTime(a.end)}) overlaps with ${b.label} (${formatMinutesToTime(b.start)} – ${formatMinutesToTime(b.end)}).`);
      setShowWarningModal(true);
      return;
    }
    setSaving(true);
    try {
      const academicYearForBackend = [draftAcademicYear, draftSemester].filter(Boolean).join(" ").trim() || null;
      await axios.post(
        `${API_BASE_URL}/officialtimetable`,
        { employeeID, academicYear: academicYearForBackend, startDate: draftStartDate, endDate: draftEndDate, status: draftStatus || "active", records: sevenRows },
        { ...getAuthHeaders(), timeout: 30000 },
      );
      setLastSaved(new Date());
      showToast("Official time saved successfully.");
      setShowScheduleModal(false);
      logOfficialTimeAdd({ targetEmployeeNumber: employeeID, targetName: selectedEmployee?.name || employeeID, periodStart: draftStartDate, periodEnd: draftEndDate, academicYear: academicYearForBackend });
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${employeeID}`, officialTimeGetConfig(true));
      const allRows = res.data || [];
      stampServerRecords(allRows);
      setRecords(deepClone(allRows));
      setFound(allRows.length > 0);
      const newKey = `${normalizeDateStr(draftStartDate)}|${normalizeDateStr(draftEndDate)}`;
      setActiveScheduleKey(newKey);
    } catch (err) {
      const msg = err.code === "ECONNABORTED" ? "Request timed out."
        : err.response?.status === 409 ? err.response?.data?.message || "Date range overlaps an existing schedule."
        : err.response?.data?.error || err.response?.data?.message || err.message || "Error saving records.";
      setWarningMessage(msg);
      setWarningOverlap(err.response?.data?.overlap || null);
      setShowWarningModal(true);
    } finally {
      setSaving(false);
    }
  }, [employeeID, draftAcademicYear, draftSemester, draftStartDate, draftEndDate, draftStatus, modalRecords, showToast, stampServerRecords, selectedEmployee]);

  // ── View/Edit schedule ──
  const handleStartEditViewSchedule = useCallback(() => {
    setEditViewRecords(deepClone(viewScheduleRecords));
    setEditViewScheduleView(viewScheduleView);
    setEditViewEndDate(normalizeDateStr(viewScheduleInfo?.endDate) || "");
    setIsEditingViewSchedule(true);
  }, [viewScheduleRecords, viewScheduleView, viewScheduleInfo]);

  const handleCancelEditViewSchedule = useCallback(() => {
    setIsEditingViewSchedule(false);
    setEditViewRecords([]);
    setEditViewEndDate("");
  }, []);

  const handleSaveEditedSchedule = useCallback(async () => {
    if (!viewScheduleInfo || !employeeID) return;
    const newEndDate = editViewEndDate || normalizeDateStr(viewScheduleInfo.endDate);
    if (newEndDate && normalizeDateStr(viewScheduleInfo.startDate) && newEndDate < normalizeDateStr(viewScheduleInfo.startDate)) {
      showToast("End date cannot be before start date."); return;
    }
    const overlapResult = checkTimeOverlaps(editViewRecords);
    if (!overlapResult.valid) {
      const a = overlapResult.segmentA, b = overlapResult.segmentB;
      setWarningMessage(`Time overlap on ${overlapResult.day}: ${a.label} (${formatMinutesToTime(a.start)} – ${formatMinutesToTime(a.end)}) overlaps with ${b.label}.`);
      setShowWarningModal(true);
      return;
    }
    setEditViewSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/officialtimetable/${employeeID}`,
        { startDate: viewScheduleInfo.startDate, endDate: newEndDate || viewScheduleInfo.endDate, origEndDate: normalizeDateStr(viewScheduleInfo.endDate), records: editViewRecords },
        getAuthHeaders(),
      );
      showToast("Schedule updated successfully.");
      logOfficialTimeEdit({ targetEmployeeNumber: employeeID, targetName: selectedEmployee?.name || employeeID, periodStart: normalizeDateStr(viewScheduleInfo.startDate), periodEnd: newEndDate || normalizeDateStr(viewScheduleInfo.endDate) });
      setIsEditingViewSchedule(false);
      setEditViewRecords([]);
      setEditViewEndDate("");
      const res = await axios.get(`${API_BASE_URL}/officialtimetable/${employeeID}`, officialTimeGetConfig(true));
      const allRows = res.data || [];
      stampServerRecords(allRows);
      setRecords(deepClone(allRows));
      setFound(allRows.length > 0);
      const normStart = normalizeDateStr(viewScheduleInfo.startDate);
      const normEnd = normalizeDateStr(newEndDate || viewScheduleInfo.endDate);
      setViewScheduleRecords(allRows.filter((r) => normalizeDateStr(r.startDate) === normStart && normalizeDateStr(r.endDate) === normEnd));
      setViewScheduleInfo((prev) => prev ? { ...prev, endDate: newEndDate || prev.endDate } : prev);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Error updating schedule.";
      setWarningMessage(msg);
      setWarningOverlap(err.response?.data?.overlap || null);
      setShowWarningModal(true);
    } finally {
      setEditViewSaving(false);
    }
  }, [viewScheduleInfo, employeeID, editViewRecords, editViewEndDate, showToast, stampServerRecords, selectedEmployee]);

  // ── Upload ──
  const handleAnalyzeFile = useCallback(async () => {
    if (!file || analyzing) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploadAcknowledgeChecked(false);
    setAnalyzeEmployeeNames({});
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/upload-excel-faculty-official-time/validate`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setAnalyzeResult({ ok: true, ...res.data });
      setShowAnalyzeModal(true);

      // ── [CHANGE I] Names come from the Excel "Name" column when present
      // (backend already echoes it back as schedules[].name, display-only).
      // Only fall back to a system lookup by employeeID for rows where the
      // Excel had no Name / a blank Name — this never affects matching.
      const schedulesData = res.data.schedules || [];
      const idsNeedingLookup = [...new Set(
        schedulesData
          .filter((s) => !s.name || !String(s.name).trim())
          .map((s) => String(s.employeeID)),
      )];
      const namesMap = {};
      await Promise.all(
        idsNeedingLookup.map(async (id) => {
          try {
            const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(id)}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const match = (r.data || []).find((emp) => String(emp.employeeNumber) === id);
            namesMap[id] = match?.name || "—";
          } catch {
            namesMap[id] = "—";
          }
        }),
      );
      setAnalyzeEmployeeNames(namesMap);
    } catch (error) {
      const d = error.response?.data || {};
      setAnalyzeResult({ ok: false, message: d.message || error.message || "Validation failed.", timeErrors: d.timeErrors || [], allErrors: d.allErrors || [], skippedRows: d.skippedRows || [], warnings: d.warnings || [], overlap: d.overlap || null });
      setShowAnalyzeModal(true);
    } finally {
      setAnalyzing(false);
    }
  }, [file, analyzing]);

  const handleConfirmUpload = useCallback(async () => {
    if (!file || confirming || !uploadAcknowledgeChecked) return;
    const formData = new FormData();
    formData.append("file", file);
    setConfirming(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/upload-excel-faculty-official-time`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setShowAnalyzeModal(false);
      setAnalyzeResult(null);
      setAnalyzeEmployeeNames({});
      setUploadAcknowledgeChecked(false);
      if (response.data.records?.length > 0) {
        setPreviewRecords(response.data.records);
        setPreviewViewScheduleView("workDays");
        setShowPreviewModal(true);
        const uploadedEmpId = String(response.data.records[0]?.employeeID || "").trim();
        if (uploadedEmpId && uploadedEmpId === employeeID) {
          const refreshed = await axios.get(`${API_BASE_URL}/officialtimetable/${uploadedEmpId}`, officialTimeGetConfig(true)).catch(() => null);
          if (refreshed?.data?.length > 0) { stampServerRecords(refreshed.data); setRecords(deepClone(refreshed.data)); setFound(true); }
        }
      }
      showToast(`Upload complete! Inserted: ${response.data.inserted} rows.`);
      setFile(null);
    } catch (error) {
      const d = error.response?.data || {};
      setWarningMessage(d.message || error.message || "Upload failed.");
      setWarningOverlap(d.overlap || null);
      setShowWarningModal(true);
      setShowAnalyzeModal(false);
      setUploadAcknowledgeChecked(false);
    } finally {
      setConfirming(false);
    }
  }, [file, confirming, uploadAcknowledgeChecked, employeeID, showToast, stampServerRecords]);

  // ── Department-scoped upload handlers ──
  const handleAnalyzeDeptFile = useCallback(async () => {
    if (!deptFile || !deptUploadDepartment || deptAnalyzing) return;
    const formData = new FormData();
    formData.append("file", deptFile);
    formData.append("department", deptUploadDepartment);
    setDeptUploadAcknowledgeChecked(false);
    setDeptAnalyzeEmployeeNames({});
    setDeptAnalyzing(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time-by-department/validate`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setDeptAnalyzeResult({ ok: true, ...res.data });
      setShowDeptAnalyzeModal(true);

      // [CHANGE I] Same Excel-Name-first, lookup-fallback pattern as the
      // single-employee upload above. Department scoping/matching itself is
      // untouched — it's still resolved by employeeID against the system.
      const schedulesData = res.data.schedules || [];
      const idsNeedingLookup = [...new Set(
        schedulesData
          .filter((s) => !s.name || !String(s.name).trim())
          .map((s) => String(s.employeeID)),
      )];
      const namesMap = {};
      await Promise.all(
        idsNeedingLookup.map(async (id) => {
          try {
            const r = await axios.get(
              `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(id)}`,
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            const match = (r.data || []).find((emp) => String(emp.employeeNumber) === id);
            namesMap[id] = match?.name || "—";
          } catch {
            namesMap[id] = "—";
          }
        }),
      );
      setDeptAnalyzeEmployeeNames(namesMap);
    } catch (error) {
      const d = error.response?.data || {};
      setDeptAnalyzeResult({
        ok: false,
        message: d.message || error.message || "Validation failed.",
        timeErrors: d.timeErrors || [],
        allErrors: d.allErrors || [],
        skippedRows: d.skippedRows || [],
        warnings: d.warnings || [],
        overlap: d.overlap || null,
      });
      setShowDeptAnalyzeModal(true);
    } finally {
      setDeptAnalyzing(false);
    }
  }, [deptFile, deptUploadDepartment, deptAnalyzing]);

  const handleConfirmDeptUpload = useCallback(async () => {
    if (!deptFile || !deptUploadDepartment || deptConfirming || !deptUploadAcknowledgeChecked) return;
    const formData = new FormData();
    formData.append("file", deptFile);
    formData.append("department", deptUploadDepartment);
    setDeptConfirming(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time-by-department`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setShowDeptAnalyzeModal(false);
      setDeptAnalyzeResult(null);
      setDeptAnalyzeEmployeeNames({});
      setDeptUploadAcknowledgeChecked(false);
      setDeptFile(null);
      showToast(`Upload complete! Inserted: ${response.data.inserted} rows for "${deptUploadDepartment}".`);
      await fetchAllUsers();
    } catch (error) {
      const d = error.response?.data || {};
      setWarningMessage(d.message || error.message || "Upload failed.");
      setWarningOverlap(d.overlap || null);
      setShowWarningModal(true);
      setShowDeptAnalyzeModal(false);
      setDeptUploadAcknowledgeChecked(false);
    } finally {
      setDeptConfirming(false);
    }
  }, [deptFile, deptUploadDepartment, deptConfirming, deptUploadAcknowledgeChecked, showToast, fetchAllUsers]);

  // ── Employment-Category-scoped upload handlers — mirrors the
  // Department-scoped handlers 1:1, posting to the
  // /upload-excel-faculty-official-time-by-category routes with
  // employmentCategory (the employment_type_config.id) instead of department.
  const handleAnalyzeCatFile = useCallback(async () => {
    if (!catFile || !catUploadCategory || catAnalyzing) return;
    const formData = new FormData();
    formData.append("file", catFile);
    formData.append("employmentCategory", catUploadCategory);
    setCatUploadAcknowledgeChecked(false);
    setCatAnalyzeEmployeeNames({});
    setCatAnalyzing(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time-by-category/validate`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setCatAnalyzeResult({ ok: true, ...res.data });
      setShowCatAnalyzeModal(true);

      // [CHANGE I] Same Excel-Name-first, lookup-fallback pattern as the
      // single-employee upload above. Category scoping/matching itself is
      // untouched — it's still resolved by employeeID against the system.
      const schedulesData = res.data.schedules || [];
      const idsNeedingLookup = [...new Set(
        schedulesData
          .filter((s) => !s.name || !String(s.name).trim())
          .map((s) => String(s.employeeID)),
      )];
      const namesMap = {};
      await Promise.all(
        idsNeedingLookup.map(async (id) => {
          try {
            const r = await axios.get(
              `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(id)}`,
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            const match = (r.data || []).find((emp) => String(emp.employeeNumber) === id);
            namesMap[id] = match?.name || "—";
          } catch {
            namesMap[id] = "—";
          }
        }),
      );
      setCatAnalyzeEmployeeNames(namesMap);
    } catch (error) {
      const d = error.response?.data || {};
      setCatAnalyzeResult({
        ok: false,
        message: d.message || error.message || "Validation failed.",
        timeErrors: d.timeErrors || [],
        allErrors: d.allErrors || [],
        skippedRows: d.skippedRows || [],
        warnings: d.warnings || [],
        overlap: d.overlap || null,
      });
      setShowCatAnalyzeModal(true);
    } finally {
      setCatAnalyzing(false);
    }
  }, [catFile, catUploadCategory, catAnalyzing]);

  const handleConfirmCatUpload = useCallback(async () => {
    if (!catFile || !catUploadCategory || catConfirming || !catUploadAcknowledgeChecked) return;
    const formData = new FormData();
    formData.append("file", catFile);
    formData.append("employmentCategory", catUploadCategory);
    setCatConfirming(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-excel-faculty-official-time-by-category`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setShowCatAnalyzeModal(false);
      setCatAnalyzeResult(null);
      setCatAnalyzeEmployeeNames({});
      setCatUploadAcknowledgeChecked(false);
      setCatFile(null);
      const catLabel = employmentCategoryList.find((c) => String(c.id) === String(catUploadCategory))?.label || catUploadCategory;
      showToast(`Upload complete! Inserted: ${response.data.inserted} rows for "${catLabel}".`);
      await fetchAllUsers();
    } catch (error) {
      const d = error.response?.data || {};
      setWarningMessage(d.message || error.message || "Upload failed.");
      setWarningOverlap(d.overlap || null);
      setShowWarningModal(true);
      setShowCatAnalyzeModal(false);
      setCatUploadAcknowledgeChecked(false);
    } finally {
      setCatConfirming(false);
    }
  }, [catFile, catUploadCategory, catConfirming, catUploadAcknowledgeChecked, showToast, fetchAllUsers, employmentCategoryList]);

  // ── All Users — fetch on view switch ──
  useEffect(() => { if (showAllUsers) { fetchAllUsers(); setSelectedUsers(new Set()); } }, [showAllUsers, fetchAllUsers]);

  const socketRefresh = useCallback(() => {
    if (showAllUsers) { fetchAllUsers(); return; }
    if (employeeID && hasSearched) { handleRestoreFromServer(); }
  }, [showAllUsers, employeeID, hasSearched, fetchAllUsers, handleRestoreFromServer]);

  useAttendanceRealtimeRefresh(socketRefresh, { personId: employeeID, requireDateRange: false, matchMode: "loose" });

  // ── Derived filter option lists ──
  const academicYearOptions = useMemo(() => {
    const set = new Set(allUsers.map((u) => u.academicYear).filter(Boolean));
    return [...set].sort();
  }, [allUsers]);

  const filteredAllUsers = useMemo(() => {
    let list = allUsers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          (u.fullName || "").toLowerCase().includes(q) ||
          (u.employeeNumber || "").toLowerCase().includes(q),
      );
    }

    if (filterDepartment) {
      list = list.filter((u) => u.department === filterDepartment);
    }

    // [NEW] Employment Category filter — independent from Department filter above
    if (filterEmploymentCategory) {
      list = list.filter((u) => String(u.employmentCategoryId || "") === String(filterEmploymentCategory));
    }

    if (filterStatus) {
      list = list.filter((u) =>
        filterStatus === "active" ? u.hasDefaultOfficialTime : !u.hasDefaultOfficialTime,
      );
    }

    if (filterAcademicYear) {
      list = list.filter((u) => u.academicYear === filterAcademicYear);
    }

    if (filterStartDate) {
      list = list.filter((u) => u.startDate && normalizeDateStr(u.startDate) >= filterStartDate);
    }

    if (filterEndDate) {
      list = list.filter((u) => u.endDate && normalizeDateStr(u.endDate) <= filterEndDate);
    }

    return list;
  }, [
    allUsers,
    searchQuery,
    filterDepartment,
    filterEmploymentCategory,
    filterStatus,
    filterAcademicYear,
    filterStartDate,
    filterEndDate,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setFilterDepartment("");
    setFilterEmploymentCategory(""); // [NEW]
    setFilterStatus("");
    setFilterAcademicYear("");
    setFilterStartDate("");
    setFilterEndDate("");
    setAllUsersPage(0);
  }, []);

  const activeFilterCount = [
    filterDepartment,
    filterEmploymentCategory, // [NEW]
    filterStatus,
    filterAcademicYear,
    filterStartDate,
    filterEndDate,
  ].filter(Boolean).length;

  const paginatedAllUsers = useMemo(
    () => filteredAllUsers.slice(allUsersPage * allUsersRowsPerPage, (allUsersPage + 1) * allUsersRowsPerPage),
    [filteredAllUsers, allUsersPage, allUsersRowsPerPage],
  );

  const openBulkModalForSelected = useCallback(() => {
    if (selectedUsers.size === 0) { showToast("Please select at least one user."); return; }
    setBulkScheduleBlocks([{ id: Date.now(), academicYear: "", semester: "", startDate: "", endDate: "" }]);
    setBulkTargetEmployees(Array.from(selectedUsers));
    setShowBulkBlocksModal(true);
  }, [selectedUsers, showToast]);

  const openBulkModalForAllMissing = useCallback(() => {
    const missing = allUsers.filter((u) => !u.hasDefaultOfficialTime).map((u) => u.employeeNumber);
    if (missing.length === 0) { showToast("All users already have default official time."); return; }
    setBulkScheduleBlocks([{ id: Date.now(), academicYear: "", semester: "", startDate: "", endDate: "" }]);
    setBulkTargetEmployees(missing);
    setShowBulkBlocksModal(true);
  }, [allUsers, showToast]);

  const handleConfirmBulkBlocks = useCallback(() => {
    const block = bulkScheduleBlocks[0];
    if (!block) return;
    if (!block.academicYear || !block.startDate || !block.endDate) { showToast("Please complete all required fields."); return; }
    setIsBulkSchedule(true);
    setDraftAcademicYear(block.academicYear);
    setDraftSemester(block.semester);
    setDraftStartDate(block.startDate);
    setDraftEndDate(block.endDate);
    const empId = String(bulkTargetEmployees[0] || "");
    setEmployeeID(empId);
    setModalRecords(DAYS_ORDER.map((day) => makeDefaultRow(empId, day)));
    setModalScheduleView("workDays");
    setShowBulkBlocksModal(false);
    setShowScheduleModal(true);
  }, [bulkScheduleBlocks, bulkTargetEmployees, showToast]);

  const dialogHeaderSx = {
    bgcolor: T.accent, px: 3, py: 2,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };
  const dialogCloseBtn = (onClose, disabled) => (
    <IconButton size="small" onClick={onClose} disabled={disabled} sx={{ color: "#fff", ml: 1, flexShrink: 0, "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }} aria-label="Close">
      <Close fontSize="small" />
    </IconButton>
  );

  if (accessLoading) return <OfficialTimeWireframe />;
  if (hasAccess === false)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Official Time Form."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{shimmerKf}</style>
      {tamperDetected && <TamperWarningBanner onRestore={handleRestoreFromServer} />}

      <LoadingOverlay
        open={loading || checkingOverlap || saving || uploading}
        message={checkingOverlap ? "Checking for conflicts…" : uploading ? "Uploading…" : saving ? "Saving…" : "Loading…"}
      />

      <Fade in timeout={400}>
        <Box
          sx={{
            py: { xs: 1, md: 2 },
            mt: tamperDetected ? "56px" : { xs: 0, md: -2 },
            mb: { xs: 1, md: 2 },
            width: "100vw",
            maxWidth: "100%",
            position: "relative",
            left: "55%",
            transform: "translateX(-53%)",
            px: { xs: 2, sm: 3, md: 6 },
            transition: "margin-top 0.2s ease",
          }}
        >
          {/* ══ PAGE HEADER ══ */}
          <SectionCard sx={{ mb: 2 }}>
            <Box
              sx={{
                px: 4, py: 3,
                background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                position: "relative", overflow: "hidden",
              }}
            >
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
                <Schedule sx={{ fontSize: 30, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                    Official Time Schedule
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600 }}>
                    Search an employee to view and manage their official time schedules
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                {lastSaved && (
                  <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha("#4caf50", 0.12), border: "1px solid rgba(76,175,80,0.25)" }}>
                    <Typography sx={{ fontSize: "0.72rem", color: "#2e7d32", fontWeight: 700 }}>
                      Saved {lastSaved.toLocaleTimeString()}
                    </Typography>
                  </Box>
                )}
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </Box>
            </Box>
          </SectionCard>

          {/* ══ SINGLE EMPLOYEE VIEW ══ */}
          {showSingleView && (
            <Fade in timeout={400} key="single-view">
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "360px 1fr" },
                  gap: 2,
                  alignItems: "stretch",
                  minHeight: { lg: "calc(100vh - 295px)" },
                }}
              >
                {/* ─── LEFT PANEL ─── */}
                <SectionCard sx={{ position: { lg: "sticky" }, top: { lg: 16 }, minHeight: { lg: "calc(100vh - 295px)" }, height: "100%", display: "flex", flexDirection: "column" }}>
                  <PanelHeader icon={Person} title="Step 1 — Search employee" />
                  <Box sx={{ p: 2.5 }}>
                    <EmployeeSearchField onSelect={handleEmployeeSelect} selectedEmployee={selectedEmployee} onClear={handleEmployeeClear} />
                    {selectedEmployee ? (
                      <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(T.accent, 0.15), color: T.accent, fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
                          {selectedEmployee.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>{selectedEmployee.name}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>#{selectedEmployee.employeeNumber}{selectedEmployee.department ? ` · ${selectedEmployee.department}` : ""}</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, py: 1.75, bgcolor: alpha(T.accent, 0.02) }}>
                        <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontStyle: "italic" }}>No employee selected — type to search above</Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ borderColor: T.divider }} />

                  <PanelHeader icon={Add} title="Create new schedule" rightContent={<Typography sx={{ fontSize: "0.7rem", color: "#2e7d32", fontWeight: 700 }}>Status: Active</Typography>} />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 1.5 }}>
                      <AcademicYearAutocomplete value={draftAcademicYear} onChange={setDraftAcademicYear} />
                      <Autocomplete
                        freeSolo
                        options={["1st Semester","2nd Semester","Summer","Vacation","Christmas break","Midyear","Enrollment period"]}
                        value={draftSemester || null}
                        onInputChange={(_, v) => setDraftSemester(v ?? "")}
                        onChange={(_, v) => setDraftSemester(typeof v === "string" ? v : "")}
                        renderInput={(params) => (
                          <TextField {...params} size="small" label="Semester" placeholder="e.g. 1st Semester"
                            sx={{ bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: "8px", "&:hover fieldset": { borderColor: T.accent }, "&.Mui-focused fieldset": { borderColor: T.accent } }, "& label.Mui-focused": { color: T.accent } }}
                          />
                        )}
                      />
                      <ModernTextField fullWidth size="small" label="Status" value="Active" disabled />
                      <ModernTextField fullWidth size="small" label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)} />
                      <ModernTextField fullWidth size="small" label="End Date" type="date" InputLabelProps={{ shrink: true }} value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)} />
                    </Box>
                    <Button
                      fullWidth variant="contained"
                      onClick={openCreateScheduleModal}
                      disabled={!selectedEmployee || !draftAcademicYear || !draftStartDate || !draftEndDate}
                      startIcon={<Schedule sx={{ fontSize: 16 }} />}
                      sx={{ bgcolor: T.accent, color: "#fff", borderRadius: "8px", fontWeight: 600, textTransform: "none", py: 1, boxShadow: `0 2px 10px ${alpha(T.accent, 0.35)}`, "&:hover": { bgcolor: T.accentDark }, "&.Mui-disabled": { bgcolor: "#c0a0a0", color: "#fff" } }}
                    >
                      Create Schedule
                    </Button>
                  </Box>

                  <Divider sx={{ borderColor: T.divider }} />

                  <PanelHeader icon={CloudUploadIcon} title="Excel upload" rightContent={<Typography sx={{ fontSize: "0.7rem", color: T.faint, fontStyle: "italic" }}>optional</Typography>} />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <input type="file" accept=".xlsx,.xls" id="upload-button" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0] || null)} />
                      <label htmlFor="upload-button">
                        <Button variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />}
                          sx={{ borderColor: T.accentBorder, color: T.accent, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent } }}
                        >
                          Choose file
                        </Button>
                      </label>
                      {file && (
                        <Typography variant="body2" sx={{ color: T.muted, bgcolor: T.accentFaint, border: `0.5px solid ${T.accentBorder}`, borderRadius: 1.5, px: 1.25, py: 0.5, fontSize: "0.8rem" }}>
                          {file.name}
                        </Typography>
                      )}
                      <Button
                        variant="contained" size="small"
                        onClick={handleAnalyzeFile}
                        disabled={!file || analyzing || confirming}
                        startIcon={analyzing ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SearchIcon />}
                        sx={{ bgcolor: T.accent, color: "#fff", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentDark } }}
                      >
                        {analyzing ? "Validating…" : "Validate"}
                      </Button>
                    </Box>
                    {file && !analyzing && (
                      <Typography sx={{ mt: 1, fontSize: "0.71rem", color: T.faint }}>
                        Click <strong>Validate</strong> to preview before uploading.
                      </Typography>
                    )}
                    {/* [CHANGE I] Readability note for the optional Name column */}
                    <Typography sx={{ mt: 1, fontSize: "0.7rem", color: T.faint, fontStyle: "italic" }}>
                      An optional "Name" column is supported for readability only — matching is always done by Employee Number.
                    </Typography>
                  </Box>
                </SectionCard>

                {/* ─── RIGHT PANEL ─── */}
                <SectionCard sx={{ minHeight: { lg: "calc(100vh - 295px)" }, height: "100%", display: "flex", flexDirection: "column" }}>
                  {!selectedEmployee ? (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: { xs: 400, lg: "calc(100vh - 405px)" }, flex: 1, gap: 2, p: 4, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Schedule sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: T.accent, mb: 0.5 }}>No employee selected</Typography>
                        <Typography sx={{ fontSize: "0.82rem", color: T.faint }}>Search for an employee on the left to view their official time schedule.</Typography>
                      </Box>
                    </Box>
                  ) : loading ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: { xs: 400, lg: "calc(100vh - 405px)" }, flex: 1, gap: 1.5 }}>
                      <CircularProgress size={22} sx={{ color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", color: T.muted }}>Loading schedules…</Typography>
                    </Box>
                  ) : !activeBlockData ? (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: { xs: 400, lg: "calc(100vh - 405px)" }, flex: 1, gap: 2, p: 4, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Schedule sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: T.accent, mb: 0.5 }}>No schedules yet</Typography>
                        <Typography sx={{ fontSize: "0.82rem", color: T.faint, mb: 1.5 }}>Fill the schedule details on the left and click "Create Schedule".</Typography>
                        <Chip label={selectedEmployee.name} size="small" sx={{ bgcolor: T.accentFaint, color: T.accent, border: `0.5px solid ${T.accentBorder}`, fontWeight: 600 }} />
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <PanelHeader
                        icon={Schedule}
                        title={`${activeBlockData.academicYear || "Schedule"}`}
                        rightContent={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <StatusBadge active={String(activeBlockData.status || "active").toLowerCase() === "active"} />
                            {String(activeBlockData.status || "active").toLowerCase() === "active" && (
                              <Tooltip title="Edit this schedule">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const normStart = normalizeDateStr(activeBlockData.startDate);
                                    const normEnd = normalizeDateStr(activeBlockData.endDate);
                                    const rows = [...records.filter((r) => normalizeDateStr(r.startDate) === normStart && normalizeDateStr(r.endDate) === normEnd)].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
                                    setViewScheduleInfo({ academicYear: activeBlockData.academicYear, startDate: activeBlockData.startDate, endDate: activeBlockData.endDate, status: activeBlockData.status });
                                    setViewScheduleRecords(rows);
                                    setViewScheduleView("workDays");
                                    setIsEditingViewSchedule(false);
                                    setEditViewRecords([]);
                                    setEditViewEndDate("");
                                    setShowViewScheduleModal(true);
                                  }}
                                  sx={{ width: 26, height: 26, border: `0.5px solid ${T.accentBorder}`, borderRadius: 1.5, color: T.faint, "&:hover": { borderColor: T.accent, color: T.accent, bgcolor: T.accentFaint } }}
                                >
                                  <Edit sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        }
                      />

                      <Box sx={{ px: 3, py: 2, flex: 1 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2.5, p: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: "10px", alignItems: "center" }}>
                          {[
                            { label: "Employee", value: selectedEmployee.name },
                            { label: "Employee No.", value: `#${employeeID}` },
                            { label: "Start Date", value: formatDateLong(activeBlockData.startDate) || formatDateOnly(activeBlockData.startDate) },
                            { label: "End Date", value: formatDateLong(activeBlockData.endDate) || formatDateOnly(activeBlockData.endDate) },
                          ].map(({ label, value }) => (
                            <Box key={label}>
                              <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
                              <Typography sx={{ fontWeight: 600, color: T.text, fontSize: "0.85rem", mt: 0.25 }}>{value}</Typography>
                            </Box>
                          ))}
                          <Box sx={{ ml: "auto", alignSelf: "flex-start" }}>
                            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha(T.accent, 0.1), color: T.accent, border: `0.5px solid ${T.accentBorder}`, borderRadius: "9px", px: 0.9, py: 0.2, whiteSpace: "nowrap" }}>
                              {scheduleBlocks.length} schedule{scheduleBlocks.length === 1 ? "" : "s"}
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 1.75, border: `1px solid ${T.accentBorder}`, borderRadius: 1.5, overflow: "hidden", bgcolor: alpha(T.accent, 0.02) }}>
                          <Box sx={{ px: 1.5, py: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.accentBorder}`, bgcolor: "#fff" }}>
                            <Typography sx={{ fontSize: "0.75rem", color: T.accent, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" }}>Existing schedules</Typography>
                            <Box component="span" sx={{ fontSize: "0.68rem", fontWeight: 700, bgcolor: alpha("#2e7d32", 0.1), color: "#2e7d32", border: "0.5px solid rgba(46,125,50,0.3)", borderRadius: "9px", px: 1, py: 0.25 }}>
                              {scheduleBlocks.length}
                            </Box>
                          </Box>
                          <Box sx={{ maxHeight: 148, overflowY: "auto", "&::-webkit-scrollbar": { width: "6px" }, "&::-webkit-scrollbar-thumb": { background: "#d0b8b8", borderRadius: "4px" } }}>
                            {scheduleBlockRows.map((row, rowIndex) => (
                              <Box key={`schedule-row-${rowIndex}`} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, borderBottom: rowIndex < scheduleBlockRows.length - 1 ? `0.5px solid ${T.accentBorder}` : "none" }}>
                                {row.map((v, colIndex) => {
                                  const absoluteIndex = rowIndex * 2 + colIndex;
                                  const isActive = String(v.status || "active").toLowerCase() === "active";
                                  const isSelected = activeScheduleKey === v.key || (!activeScheduleKey && absoluteIndex === 0);
                                  return (
                                    <Box key={v.key} onClick={() => setActiveScheduleKey(v.key)}
                                      sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.65, borderLeft: isActive ? "3px solid #2e7d32" : "3px solid transparent", borderRight: { md: colIndex === 0 ? `0.5px solid ${T.accentBorder}` : "none" }, cursor: "pointer", bgcolor: isSelected ? alpha(T.accent, 0.06) : "transparent", transition: "all 0.15s", "&:hover": { bgcolor: T.accentFaint } }}
                                    >
                                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: isActive ? "#2e7d32" : "#b7b7b7", flexShrink: 0 }} />
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>{formatScheduleDisplayText(v.academicYear)}</Typography>
                                        <Typography sx={{ fontSize: "0.68rem", color: T.faint, mt: 0.1 }} noWrap>
                                          {formatDateLong(v.startDate) || formatDateOnly(v.startDate)} to {formatDateLong(v.endDate) || formatDateOnly(v.endDate)}
                                        </Typography>
                                      </Box>
                                      <Tooltip title="View in modal">
                                        <IconButton size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const normStart = normalizeDateStr(v.startDate);
                                            const normEnd = normalizeDateStr(v.endDate);
                                            setViewScheduleInfo({ academicYear: v.academicYear, startDate: v.startDate, endDate: v.endDate, status: v.status });
                                            setViewScheduleRecords([...records.filter((r) => normalizeDateStr(r.startDate) === normStart && normalizeDateStr(r.endDate) === normEnd)].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)));
                                            setViewScheduleView("workDays");
                                            setIsEditingViewSchedule(false);
                                            setEditViewRecords([]);
                                            setEditViewEndDate("");
                                            setShowViewScheduleModal(true);
                                          }}
                                          sx={{ width: 22, height: 22, border: `0.5px solid ${T.accentBorder}`, borderRadius: 1.25, color: T.faint, "&:hover": { borderColor: T.accent, color: T.accent, bgcolor: T.accentFaint } }}
                                        >
                                          <Visibility sx={{ fontSize: 11.5 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  );
                                })}
                                {row.length === 1 && <Box sx={{ display: { xs: "none", md: "block" } }} />}
                              </Box>
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <ScheduleTabBar activeTab={scheduleView} setTab={setScheduleView} />
                        </Box>

                        <PremiumTableContainer>
                          <Table size="small" stickyHeader>
                            <ScheduleTimeRows
                              records={activeBlockRecords.length > 0 ? activeBlockRecords : DAYS_ORDER.map((day) => makeDefaultRow(employeeID, day))}
                              onChangeRecord={() => {}}
                              scheduleView={scheduleView}
                              readOnly
                            />
                          </Table>
                        </PremiumTableContainer>
                      </Box>

                      <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 1.75, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1.5 }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.faint, flex: 1 }}>Viewing in read-only mode — click Edit to make changes</Typography>
                        {String(activeBlockData.status || "active").toLowerCase() === "active" && (
                          <Button
                            variant="outlined" size="small" startIcon={<Edit sx={{ fontSize: 14 }} />}
                            onClick={() => {
                              const normStart = normalizeDateStr(activeBlockData.startDate);
                              const normEnd = normalizeDateStr(activeBlockData.endDate);
                              const rows = [...records.filter((r) => normalizeDateStr(r.startDate) === normStart && normalizeDateStr(r.endDate) === normEnd)].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
                              setViewScheduleInfo({ academicYear: activeBlockData.academicYear, startDate: activeBlockData.startDate, endDate: activeBlockData.endDate, status: activeBlockData.status });
                              setViewScheduleRecords(rows);
                              setViewScheduleView("workDays");
                              setIsEditingViewSchedule(false);
                              setEditViewRecords([]);
                              setEditViewEndDate("");
                              setShowViewScheduleModal(true);
                            }}
                            sx={{ borderColor: T.accentBorder, color: T.accent, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent } }}
                          >
                            Edit Schedule
                          </Button>
                        )}
                      </Box>
                    </>
                  )}
                </SectionCard>
              </Box>
            </Fade>
          )}

          {/* ══ ALL USERS VIEW ══ */}
          {showAllUsers && (
            <Fade in timeout={400} key="all-users-view">
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "360px 1fr" },
                  gap: 2,
                  alignItems: "stretch",
                  minHeight: { lg: "calc(100vh - 295px)" },
                }}
              >
                {/* ─── LEFT PANEL ─── */}
                <SectionCard
                  sx={{
                    position: { lg: "sticky" },
                    top: { lg: 16 },
                    minHeight: { lg: "calc(100vh - 295px)" },
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    overflowY: { lg: "auto" },
                  }}
                >
                  <PanelHeader icon={PeopleIcon} title="Bulk actions" />
                  <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
                    <Button
                      fullWidth variant="contained" size="small"
                      onClick={openBulkModalForSelected}
                      disabled={selectedUsers.size === 0}
                      startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        bgcolor: T.accent, color: "#fff", borderRadius: "8px", fontWeight: 600,
                        textTransform: "none", py: 1, boxShadow: `0 2px 10px ${alpha(T.accent, 0.35)}`,
                        "&:hover": { bgcolor: T.accentDark },
                        "&.Mui-disabled": { bgcolor: "#c0a0a0", color: "#fff" },
                      }}
                    >
                      Bulk Create (Selected: {selectedUsers.size})
                    </Button>
                    <Button
                      fullWidth variant="outlined" size="small"
                      onClick={openBulkModalForAllMissing}
                      disabled={allUsers.filter((u) => !u.hasDefaultOfficialTime).length === 0}
                      sx={{
                        borderColor: T.accentBorder, color: T.accent, textTransform: "none",
                        fontWeight: 600, py: 1, borderRadius: "8px",
                        "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                      }}
                    >
                      Bulk Create (All Missing)
                    </Button>
                  </Box>

                  <Divider sx={{ borderColor: T.divider }} />

                  <PanelHeader
                    icon={CloudUploadIcon}
                    title="Excel upload by department"
                    rightContent={<Typography sx={{ fontSize: "0.7rem", color: T.faint, fontStyle: "italic" }}>optional</Typography>}
                  />
                  <Box sx={{ p: 2.5 }}>
                    <Typography sx={{ fontSize: "0.71rem", color: T.faint, mb: 1.5 }}>
                      Only rows for employees in the selected department will be processed.
                    </Typography>

                    <ModernTextField
                      select fullWidth size="small" label="Target department"
                      value={deptUploadDepartment}
                      onChange={(e) => setDeptUploadDepartment(e.target.value)}
                      sx={{ mb: 1.5 }}
                    >
                      <MenuItem value="">Select department…</MenuItem>
                      {departmentTableList.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </ModernTextField>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <input type="file" accept=".xlsx,.xls" id="dept-upload-button" style={{ display: "none" }} onChange={(e) => setDeptFile(e.target.files[0] || null)} />
                      <label htmlFor="dept-upload-button">
                        <Button
                          variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />}
                          sx={{ borderColor: T.accentBorder, color: T.accent, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent } }}
                        >
                          Choose file
                        </Button>
                      </label>
                      <Button
                        variant="contained" size="small"
                        onClick={handleAnalyzeDeptFile}
                        disabled={!deptFile || !deptUploadDepartment || deptAnalyzing || deptConfirming}
                        startIcon={deptAnalyzing ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SearchIcon />}
                        sx={{ bgcolor: T.accent, color: "#fff", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentDark } }}
                      >
                        {deptAnalyzing ? "Validating…" : "Validate"}
                      </Button>
                    </Box>

                    {deptFile && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: T.muted, bgcolor: T.accentFaint, border: `0.5px solid ${T.accentBorder}`, borderRadius: 1.5, px: 1.25, py: 0.5, fontSize: "0.8rem", display: "inline-block" }}
                      >
                        {deptFile.name}
                      </Typography>
                    )}
                    {deptFile && !deptUploadDepartment && (
                      <Typography sx={{ mt: 1, fontSize: "0.71rem", color: "#b45309" }}>
                        Select a target department before validating — rows for other departments will be skipped.
                      </Typography>
                    )}
                    {/* [CHANGE I] Readability note for the optional Name column */}
                    <Typography sx={{ mt: 1, fontSize: "0.7rem", color: T.faint, fontStyle: "italic" }}>
                      An optional "Name" column is supported for readability only — Department is always resolved from the system by Employee Number, not from the Excel file.
                    </Typography>
                  </Box>

                  <Divider sx={{ borderColor: T.divider }} />

                  {/* Excel upload by Employment Category — mirrors the Department
                      upload panel above, but scopes rows to a single Employment Category
                      (e.g. "Non-Teaching | General Administration") instead of a Department.
                      [CHANGE H] Target dropdown items now show a colorHex dot matching
                      the type's color from EmploymentCategoryManagement.jsx. */}
                  <PanelHeader
                    icon={CloudUploadIcon}
                    title="Excel upload by employment category"
                    rightContent={<Typography sx={{ fontSize: "0.7rem", color: T.faint, fontStyle: "italic" }}>optional</Typography>}
                  />
                  <Box sx={{ p: 2.5 }}>
                    <Typography sx={{ fontSize: "0.71rem", color: T.faint, mb: 1.5 }}>
                      Only rows for employees assigned to the selected employment category will be processed.
                    </Typography>

                    <ModernTextField
                      select fullWidth size="small" label="Target employment category"
                      value={catUploadCategory}
                      onChange={(e) => setCatUploadCategory(e.target.value)}
                      sx={{ mb: 1.5 }}
                      SelectProps={{
                        renderValue: (val) => {
                          if (!val) return <Typography sx={{ color: T.faint, fontSize: "0.875rem" }}>Select employment category…</Typography>;
                          const found = employmentCategoryList.find((c) => String(c.id) === String(val));
                          if (!found) return val;
                          return (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Circle sx={{ fontSize: 8, color: found.colorHex || DEFAULT_CATEGORY_COLOR }} />
                              <Typography sx={{ fontSize: "0.875rem" }}>{found.label}</Typography>
                            </Box>
                          );
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        <Typography sx={{ color: T.faint, fontSize: "0.875rem" }}>Select employment category…</Typography>
                      </MenuItem>
                      {employmentCategoryList.map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Circle sx={{ fontSize: 8, color: c.colorHex || DEFAULT_CATEGORY_COLOR }} />
                            <Typography sx={{ fontSize: "0.875rem" }}>{c.label}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </ModernTextField>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <input type="file" accept=".xlsx,.xls" id="cat-upload-button" style={{ display: "none" }} onChange={(e) => setCatFile(e.target.files[0] || null)} />
                      <label htmlFor="cat-upload-button">
                        <Button
                          variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />}
                          sx={{ borderColor: T.accentBorder, color: T.accent, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent } }}
                        >
                          Choose file
                        </Button>
                      </label>
                      <Button
                        variant="contained" size="small"
                        onClick={handleAnalyzeCatFile}
                        disabled={!catFile || !catUploadCategory || catAnalyzing || catConfirming}
                        startIcon={catAnalyzing ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SearchIcon />}
                        sx={{ bgcolor: T.accent, color: "#fff", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: T.accentDark } }}
                      >
                        {catAnalyzing ? "Validating…" : "Validate"}
                      </Button>
                    </Box>

                    {catFile && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: T.muted, bgcolor: T.accentFaint, border: `0.5px solid ${T.accentBorder}`, borderRadius: 1.5, px: 1.25, py: 0.5, fontSize: "0.8rem", display: "inline-block" }}
                      >
                        {catFile.name}
                      </Typography>
                    )}
                    {catFile && !catUploadCategory && (
                      <Typography sx={{ mt: 1, fontSize: "0.71rem", color: "#b45309" }}>
                        Select a target employment category before validating — rows for other categories will be skipped.
                      </Typography>
                    )}
                    {/* [CHANGE I] Readability note for the optional Name column */}
                    <Typography sx={{ mt: 1, fontSize: "0.7rem", color: T.faint, fontStyle: "italic" }}>
                      An optional "Name" column is supported for readability only — Employment Category is always resolved from the system by Employee Number, not from the Excel file.
                    </Typography>
                  </Box>
                </SectionCard>

                {/* ─── RIGHT PANEL — table card, with Search & Filter bar at the top ─── */}
                <SectionCard sx={{ minHeight: { lg: "calc(100vh - 295px)" }, height: "100%", display: "flex", flexDirection: "column" }}>
                  <PanelHeader
                    icon={PeopleIcon}
                    title="All Users — Official Time Status"
                    rightContent={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {activeFilterCount > 0 && (
                          <Button
                            size="small"
                            onClick={clearAllFilters}
                            sx={{ fontSize: "0.68rem", color: T.accent, textTransform: "none", fontWeight: 700, minWidth: 0, p: 0 }}
                          >
                            Clear filters ({activeFilterCount})
                          </Button>
                        )}
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex", alignItems: "center", fontSize: "0.68rem", fontWeight: 700,
                            bgcolor: alpha(T.accent, 0.1), color: T.accent, border: `0.5px solid ${T.accentBorder}`,
                            borderRadius: "9px", px: 0.9, py: 0.2, whiteSpace: "nowrap",
                          }}
                        >
                          {filteredAllUsers.length} user{filteredAllUsers.length === 1 ? "" : "s"}
                        </Box>
                      </Box>
                    }
                  />

                  {/* ── Search & Filter bar — now lives at the top of the table card ── */}
                  <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: alpha(T.accent, 0.02) }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "flex-start" }}>
                      <ModernTextField
                        size="small"
                        placeholder="Search by name or employee number…"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setAllUsersPage(0); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.accentMid, fontSize: 18 }} /></InputAdornment> }}
                        sx={{ flex: "2 1 240px", minWidth: 220 }}
                      />

                      <ModernTextField
                        select size="small" label="Department"
                        value={filterDepartment}
                        onChange={(e) => { setFilterDepartment(e.target.value); setAllUsersPage(0); }}
                        sx={{ flex: "1 1 170px", minWidth: 160 }}
                      >
                        <MenuItem value="">All Departments</MenuItem>
                        {departmentTableList.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                      </ModernTextField>

                      {/* Employment Category filter — independent axis from Department above.
                          [CHANGE H] color dot added to match module styling. */}
                      <ModernTextField
                        select size="small" label="Employment Category"
                        value={filterEmploymentCategory}
                        onChange={(e) => { setFilterEmploymentCategory(e.target.value); setAllUsersPage(0); }}
                        sx={{ flex: "1 1 200px", minWidth: 190 }}
                        SelectProps={{
                          renderValue: (val) => {
                            if (!val) return <Typography sx={{ fontSize: "0.875rem", color: T.faint }}>All Employment Categories</Typography>;
                            const found = employmentCategoryList.find((c) => String(c.id) === String(val));
                            if (!found) return val;
                            return (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Circle sx={{ fontSize: 8, color: found.colorHex || DEFAULT_CATEGORY_COLOR }} />
                                <Typography sx={{ fontSize: "0.875rem" }}>{found.label}</Typography>
                              </Box>
                            );
                          },
                        }}
                      >
                        <MenuItem value="">All Employment Categories</MenuItem>
                        {employmentCategoryList.map((c) => (
                          <MenuItem key={c.id} value={String(c.id)}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Circle sx={{ fontSize: 8, color: c.colorHex || DEFAULT_CATEGORY_COLOR }} />
                              <Typography sx={{ fontSize: "0.875rem" }}>{c.label}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </ModernTextField>

                      <ModernTextField
                        select size="small" label="Status"
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setAllUsersPage(0); }}
                        sx={{ flex: "1 1 150px", minWidth: 140 }}
                      >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="active">Has Schedule</MenuItem>
                        <MenuItem value="inactive">No Schedule</MenuItem>
                      </ModernTextField>

                      <ModernTextField
                        select size="small" label="Academic Year"
                        value={filterAcademicYear}
                        onChange={(e) => { setFilterAcademicYear(e.target.value); setAllUsersPage(0); }}
                        sx={{ flex: "1 1 160px", minWidth: 150 }}
                      >
                        <MenuItem value="">All Academic Years</MenuItem>
                        {academicYearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </ModernTextField>

                      <ModernTextField
                        size="small" label="Start date from" type="date"
                        InputLabelProps={{ shrink: true }}
                        value={filterStartDate}
                        onChange={(e) => { setFilterStartDate(e.target.value); setAllUsersPage(0); }}
                        sx={{ flex: "1 1 150px", minWidth: 145 }}
                      />

                      <ModernTextField
                        size="small" label="End date until" type="date"
                        InputLabelProps={{ shrink: true }}
                        value={filterEndDate}
                        onChange={(e) => { setFilterEndDate(e.target.value); setAllUsersPage(0); }}
                        sx={{ flex: "1 1 150px", minWidth: 145 }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
                    {loadingUsers ? (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 1.5, py: 6 }}>
                        <CircularProgress size={22} sx={{ color: T.accent }} />
                        <Typography sx={{ fontSize: "0.88rem", color: T.muted }}>Loading users…</Typography>
                      </Box>
                    ) : (
                      <>
                        <PremiumTableContainer>
                          <Table stickyHeader>
                            <TableHead>
                              <TableRow sx={{ bgcolor: T.accent }}>
                                <TableCell sx={{ bgcolor: T.accent, py: 1.25 }}>
                                  <Checkbox
                                    checked={paginatedAllUsers.length > 0 && paginatedAllUsers.every((u) => selectedUsers.has(u.employeeNumber))}
                                    indeterminate={paginatedAllUsers.some((u) => selectedUsers.has(u.employeeNumber)) && !paginatedAllUsers.every((u) => selectedUsers.has(u.employeeNumber))}
                                    onChange={(e) => { if (e.target.checked) setSelectedUsers(new Set(paginatedAllUsers.map((u) => u.employeeNumber))); else setSelectedUsers(new Set()); }}
                                    sx={{ color: "rgba(255,255,255,0.7)", "&.Mui-checked": { color: "#fff" }, "&.MuiCheckbox-indeterminate": { color: "#fff" } }}
                                  />
                                </TableCell>
                                {["Employee Number","Name","Department","Employment Category","Academic Year","Status","Start Date","End Date"].map((h) => (
                                  <TableCell key={h} sx={{ color: "#fff", bgcolor: T.accent, fontSize: "0.7rem", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700, py: 1.25 }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paginatedAllUsers.map((user) => (
                                <TableRow key={user.employeeNumber} sx={{ "&:nth-of-type(even)": { bgcolor: T.rowOdd }, "&:hover": { bgcolor: T.rowHover } }}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedUsers.has(user.employeeNumber)}
                                      onChange={() => { setSelectedUsers((prev) => { const n = new Set(prev); if (n.has(user.employeeNumber)) n.delete(user.employeeNumber); else n.add(user.employeeNumber); return n; }); }}
                                      sx={{ color: T.accentBorder, "&.Mui-checked": { color: T.accent } }}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ fontSize: "0.88rem" }}>{user.employeeNumber}</TableCell>
                                  <TableCell sx={{ fontSize: "0.88rem" }}>{user.fullName || "N/A"}</TableCell>
                                  <TableCell sx={{ fontSize: "0.88rem" }}>{user.department || "—"}</TableCell>
                                  {/* [CHANGE H] Employment Category column now renders a colored
                                      chip (dot + label) using employmentCategoryColor from the
                                      backend, matching the Manage Types / Assign Categories tabs
                                      in EmploymentCategoryManagement.jsx. */}
                                  <TableCell>
                                    <EmploymentCategoryChip
                                      label={user.employmentCategoryLabel}
                                      colorHex={user.employmentCategoryColor || employmentCategoryColorById.get(String(user.employmentCategoryId))}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ fontSize: "0.88rem" }}>{user.academicYear || "—"}</TableCell>
                                  <TableCell>
                                    {user.hasDefaultOfficialTime ? (
                                      <Chip icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />} label="Has Schedule" size="small" sx={{ bgcolor: alpha("#4caf50", 0.1), color: "#2e7d32", border: "1px solid #c8e6c9", fontWeight: 600 }} />
                                    ) : (
                                      <Chip icon={<CancelIcon sx={{ fontSize: "14px !important" }} />} label="No Schedule" size="small" sx={{ bgcolor: alpha("#f44336", 0.1), color: "#c62828", border: "1px solid #ffcdd2", fontWeight: 600 }} />
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: "0.88rem" }}>{user.startDate ? formatDateOnly(user.startDate) : "—"}</TableCell>
                                  <TableCell sx={{ fontSize: "0.88rem" }}>{user.endDate ? formatDateOnly(user.endDate) : "—"}</TableCell>
                                </TableRow>
                              ))}
                              {filteredAllUsers.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography sx={{ color: T.accent }}>{searchQuery ? "No users found matching your search." : "No users found."}</Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </PremiumTableContainer>
                        <Box sx={{ borderTop: `1px solid ${T.divider}` }}>
                          <TablePagination
                            component="div"
                            count={filteredAllUsers.length}
                            page={allUsersPage}
                            onPageChange={(_, p) => setAllUsersPage(p)}
                            rowsPerPage={allUsersRowsPerPage}
                            onRowsPerPageChange={(e) => { setAllUsersRowsPerPage(parseInt(e.target.value, 10)); setAllUsersPage(0); }}
                            rowsPerPageOptions={[10, 20, 30, 50]}
                          />
                        </Box>
                      </>
                    )}
                  </Box>
                </SectionCard>
              </Box>
            </Fade>
          )}

          {/* ══════════════ DIALOGS ══════════════ */}

          {/* ── Create / Bulk Schedule ── */}
          <Dialog
            open={showScheduleModal}
            onClose={() => { if (saving) return; setShowScheduleModal(false); setIsBulkSchedule(false); setBulkTargetEmployees([]); }}
            maxWidth={false}
            PaperProps={{ sx: { borderRadius: 2, overflow: "hidden", width: "96vw", maxWidth: "1500px" } }}
          >
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Schedule sx={{ color: "#fff", fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "1rem", lineHeight: 1.25 }}>
                    {isBulkSchedule ? "Bulk Schedule — Step 2 of 2" : "Create New Schedule"}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", mt: 0.25 }}>
                    {isBulkSchedule ? `Setting time for ${bulkTargetEmployees.length} employee(s)` : selectedEmployee ? `${selectedEmployee.name} (#${employeeID})` : `Employee #${employeeID}`}
                  </Typography>
                </Box>
              </Box>
              {dialogCloseBtn(() => { if (saving) return; setShowScheduleModal(false); setIsBulkSchedule(false); setBulkTargetEmployees([]); }, saving)}
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 0 }}>
              <Box sx={{ bgcolor: "#f7f0f0", border: `1px solid ${T.accentBorder}`, borderRadius: 1.5, p: 2, mb: 2.5 }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px", mb: 1.5 }}>
                  Schedule Period (read-only — set before opening)
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { label: "Academic Year", value: draftAcademicYear },
                    { label: "Semester", value: draftSemester },
                    { label: "Start Date", value: formatDateLong(draftStartDate) || draftStartDate },
                    { label: "End Date", value: formatDateLong(draftEndDate) || draftEndDate },
                  ].map(({ label, value }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <Typography sx={{ fontSize: "0.65rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.4px", mb: 0.25 }}>{label}</Typography>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>{value || "—"}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1, flexWrap: "wrap" }}>
                <ScheduleTabBar activeTab={modalScheduleView} setTab={setModalScheduleView} />
                <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <Button size="small" variant="outlined" onClick={handleClearModalTimes} startIcon={<ClearAll fontSize="small" />}
                    sx={{ borderColor: T.accentBorder, color: T.accent, fontWeight: 600, textTransform: "none", fontSize: "0.78rem", "&:hover": { bgcolor: T.accentFaint } }}
                  >
                    Clear Tab
                  </Button>
                  <Button size="small" variant="outlined" onClick={handleResetModalToDefault}
                    sx={{ borderColor: T.accentBorder, color: "#555", fontWeight: 600, textTransform: "none", fontSize: "0.78rem", "&:hover": { bgcolor: "#f5f5f5" } }}
                  >
                    Reset Default
                  </Button>
                </Box>
              </Box>

              <TableContainer sx={{ border: `1px solid ${T.divider}`, borderRadius: 1.5, overflow: "auto", mb: 3 }}>
                <Table size="small">
                  <ScheduleTimeRows
                    records={modalRecords}
                    onChangeRecord={handleModalRecordChange}
                    scheduleView={modalScheduleView}
                    readOnly={false}
                  />
                </Table>
              </TableContainer>
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5 }}>
              <Button variant="outlined" onClick={() => { if (saving) return; setShowScheduleModal(false); setIsBulkSchedule(false); setBulkTargetEmployees([]); }} disabled={saving}
                sx={{ borderColor: "#ccc", color: "#444", fontWeight: 600, textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button variant="contained" disableElevation onClick={handleSubmitFromModal} disabled={saving}
                startIcon={saving ? <CircularProgress size={15} sx={{ color: "#fff" }} /> : <SaveIcon />}
                sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 140, "&:hover": { bgcolor: T.accentDark }, "&.Mui-disabled": { bgcolor: "#c0a0a0", color: "#fff" } }}
              >
                {saving ? "Saving…" : "Save Schedule"}
              </Button>
            </Box>
          </Dialog>

          {/* ── View/Edit Schedule Modal ── */}
          <Dialog
            open={showViewScheduleModal}
            onClose={() => { setShowViewScheduleModal(false); setIsEditingViewSchedule(false); setEditViewRecords([]); setEditViewEndDate(""); }}
            maxWidth={false}
            PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden", width: "96vw", maxWidth: "1500px" } }}
          >
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                {isEditingViewSchedule ? <Edit sx={{ color: "#fff", fontSize: 20 }} /> : <Visibility sx={{ color: "#fff", fontSize: 20 }} />}
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.975rem", lineHeight: 1.25 }}>
                    {isEditingViewSchedule ? "Edit Official Time Schedule" : "View Official Time Schedule"}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", mt: 0.25 }}>
                    {selectedEmployee ? `${employeeID} — ${selectedEmployee.name}` : `Employee #${employeeID}`}
                  </Typography>
                </Box>
              </Box>
              {dialogCloseBtn(() => { setShowViewScheduleModal(false); setIsEditingViewSchedule(false); setEditViewRecords([]); setEditViewEndDate(""); })}
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 0 }}>
              {viewScheduleInfo && (
                <>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2.5, p: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: "12px", alignItems: "flex-end" }}>
                    {[
                      { label: "Academic Year", value: viewScheduleInfo.academicYear || "—" },
                      { label: "Start Date", value: formatDateLong(viewScheduleInfo.startDate) || formatDateOnly(viewScheduleInfo.startDate) },
                    ].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</Typography>
                        <Typography sx={{ fontWeight: 600, color: T.text, fontSize: "0.88rem", mt: 0.25 }}>{value}</Typography>
                      </Box>
                    ))}
                    <Box>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px", mb: 0.5 }}>
                        End Date
                        {isEditingViewSchedule && <Box component="span" sx={{ ml: 0.75, fontSize: "0.65rem", color: "#2e7d32", fontWeight: 600, textTransform: "none" }}>(editable)</Box>}
                      </Typography>
                      {isEditingViewSchedule ? (
                        <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={editViewEndDate} onChange={(e) => setEditViewEndDate(e.target.value)} inputProps={{ min: normalizeDateStr(viewScheduleInfo.startDate) || undefined }}
                          sx={{ bgcolor: "#fff", minWidth: 160, "& .MuiOutlinedInput-root": { fontSize: "0.85rem", borderRadius: "8px", "&.Mui-focused fieldset": { borderColor: T.accent } }, "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accent } }}
                        />
                      ) : (
                        <Typography sx={{ fontWeight: 600, color: T.text, fontSize: "0.88rem" }}>
                          {formatDateLong(viewScheduleInfo.endDate) || formatDateOnly(viewScheduleInfo.endDate)}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px" }}>Status</Typography>
                      <Box sx={{ mt: 0.5 }}><StatusBadge active={String(viewScheduleInfo.status || "active").toLowerCase() === "active"} /></Box>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <ScheduleTabBar
                      activeTab={isEditingViewSchedule ? editViewScheduleView : viewScheduleView}
                      setTab={isEditingViewSchedule ? setEditViewScheduleView : setViewScheduleView}
                    />
                  </Box>
                  <TableContainer sx={{ border: `1px solid ${T.divider}`, borderRadius: "10px", overflow: "hidden", mb: 3 }}>
                    <Table size="small">
                      {isEditingViewSchedule ? (
                        <ScheduleTimeRows
                          records={[...editViewRecords].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day))}
                          onChangeRecord={(index, field, value) => {
                            const sorted = [...editViewRecords].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
                            const day = sorted[index]?.day;
                            setEditViewRecords((prev) => prev.map((r) => r.day === day ? { ...r, [field]: value } : r));
                          }}
                          scheduleView={editViewScheduleView}
                          readOnly={false}
                        />
                      ) : (
                        <ScheduleTimeRows
                          records={[...viewScheduleRecords].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day))}
                          onChangeRecord={() => {}}
                          scheduleView={viewScheduleView}
                          readOnly
                        />
                      )}
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1.5 }}>
              {isEditingViewSchedule ? (
                <>
                  <Button variant="outlined" onClick={handleCancelEditViewSchedule} disabled={editViewSaving} sx={{ fontWeight: 700, textTransform: "none", borderColor: "#ccc", color: "#444", "&:hover": { bgcolor: "#f5f5f5" } }}>Cancel</Button>
                  <Button variant="contained" disableElevation startIcon={editViewSaving ? <CircularProgress size={15} sx={{ color: "#fff" }} /> : <SaveIcon />} onClick={handleSaveEditedSchedule} disabled={editViewSaving}
                    sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 130, "&:hover": { bgcolor: T.accentDark } }}
                  >
                    {editViewSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outlined" onClick={() => setShowViewScheduleModal(false)} sx={{ fontWeight: 700, textTransform: "none", borderColor: "#ccc", color: "#444", "&:hover": { bgcolor: "#f5f5f5" } }}>Close</Button>
                  {viewScheduleInfo && String(viewScheduleInfo.status || "active").toLowerCase() === "active" && (
                    <Button variant="contained" disableElevation startIcon={<Edit />} onClick={handleStartEditViewSchedule}
                      sx={{ fontWeight: 700, textTransform: "none", bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark } }}
                    >
                      Edit Schedule
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Dialog>

          {/* ── Date Conflict ── */}
          <Dialog open={showConflictModal} onClose={() => setShowConflictModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <WarningAmber sx={{ color: "#ffd180", fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>Schedule Conflict</Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 2 }}>
              <Typography sx={{ color: T.text, lineHeight: 1.7, fontSize: "0.93rem" }}>A schedule already exists for this employee during the selected date range.</Typography>
              <Box sx={{ mt: 1.5, mb: 2, px: 2, py: 1.25, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: "10px", display: "flex", alignItems: "center", gap: 1 }}>
                <Schedule sx={{ color: T.accent, fontSize: 16 }} />
                <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.9rem" }}>{formatDateLong(draftStartDate) || draftStartDate} — {formatDateLong(draftEndDate) || draftEndDate}</Typography>
              </Box>
              <Typography sx={{ color: "#555", fontSize: "0.88rem", lineHeight: 1.6 }}>Please choose a different date range.</Typography>
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" disableElevation onClick={() => setShowConflictModal(false)} sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: T.accentDark } }}>Got It</Button>
            </Box>
          </Dialog>

          {/* ── Warning / Error ── */}
          <Dialog open={showWarningModal} onClose={() => { setShowWarningModal(false); setWarningOverlap(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <WarningAmber sx={{ color: "#ffd180", fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{warningOverlap ? "Time Schedule Conflict" : "Cannot Save"}</Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 2 }}>
              <Typography sx={{ color: T.text, lineHeight: 1.7, fontSize: "0.93rem", whiteSpace: "pre-wrap" }}>{warningMessage}</Typography>
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" disableElevation onClick={() => { setShowWarningModal(false); setWarningOverlap(null); }} sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: T.accentDark } }}>OK, Go Back</Button>
            </Box>
          </Dialog>

          {/* ── Bulk Schedule Blocks (Step 1) ── */}
          <Dialog open={showBulkBlocksModal} onClose={() => setShowBulkBlocksModal(false)} maxWidth={false} PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden", width: 680, maxWidth: 680 } }}>
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PeopleIcon sx={{ color: "#fff", fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.975rem", lineHeight: 1.25 }}>Bulk Schedule — Step 1 of 2</Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", mt: 0.25 }}>Define schedule period for {bulkTargetEmployees.length} employee(s)</Typography>
                </Box>
              </Box>
              {dialogCloseBtn(() => setShowBulkBlocksModal(false))}
            </Box>
            <Box sx={{ px: 3, pt: 2.5, pb: 0, bgcolor: "#fff" }}>
              <Box sx={{ border: `1px solid ${T.accentBorder}`, borderRadius: "10px", overflow: "hidden", mb: 3 }}>
                <Box sx={{ bgcolor: T.accentFaint, px: 2, py: 1.25, borderBottom: `1px solid ${T.accentBorder}` }}>
                  <Typography sx={{ fontSize: "0.80rem", fontWeight: 600, color: T.text }}>Period details</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <AcademicYearAutocomplete
                        value={bulkScheduleBlocks[0]?.academicYear || ""}
                        onChange={(v) => setBulkScheduleBlocks((prev) => prev.map((b, i) => i === 0 ? { ...b, academicYear: v } : b))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Autocomplete
                        freeSolo
                        options={["1st Semester","2nd Semester","Summer","Vacation","Christmas break","Midyear","Enrollment period"]}
                        value={bulkScheduleBlocks[0]?.semester || ""}
                        onInputChange={(_, v) => setBulkScheduleBlocks((prev) => prev.map((b, i) => i === 0 ? { ...b, semester: v ?? "" } : b))}
                        onChange={(_, v) => setBulkScheduleBlocks((prev) => prev.map((b, i) => i === 0 ? { ...b, semester: typeof v === "string" ? v : "" } : b))}
                        renderInput={(params) => (
                          <TextField {...params} size="small" label="Semester"
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "&:hover fieldset": { borderColor: T.accent }, "&.Mui-focused fieldset": { borderColor: T.accent } }, "& label.Mui-focused": { color: T.accent } }}
                          />
                        )}
                      />
                    </Grid>
                    {[{ label: "Start date", key: "startDate" }, { label: "End date", key: "endDate" }].map(({ label, key }) => (
                      <Grid item xs={6} key={key}>
                        <TextField fullWidth size="small" label={label} type="date" InputLabelProps={{ shrink: true }}
                          value={bulkScheduleBlocks[0]?.[key] || ""}
                          onChange={(e) => setBulkScheduleBlocks((prev) => prev.map((b, i) => i === 0 ? { ...b, [key]: e.target.value } : b))}
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", "&:hover fieldset": { borderColor: T.accent }, "&.Mui-focused fieldset": { borderColor: T.accent } }, "& label.Mui-focused": { color: T.accent } }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
              <Button variant="outlined" onClick={() => setShowBulkBlocksModal(false)} sx={{ borderColor: "#ccc", color: "#444", fontWeight: 600, textTransform: "none" }}>Cancel</Button>
              <Button variant="contained" disableElevation onClick={handleConfirmBulkBlocks}
                disabled={!bulkScheduleBlocks[0]?.academicYear || !bulkScheduleBlocks[0]?.startDate || !bulkScheduleBlocks[0]?.endDate}
                endIcon={<ArrowForward fontSize="small" />}
                sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 200, "&:hover": { bgcolor: T.accentDark }, "&.Mui-disabled": { bgcolor: "#d0b8b8", color: "#fff" } }}
              >
                Next: Set Time Schedule
              </Button>
            </Box>
          </Dialog>

          {/* ── Bulk Confirm ── */}
          <Dialog open={showBulkConfirmModal} onClose={() => setShowBulkConfirmModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <WarningAmber sx={{ color: "#ffd180", fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>Confirm Bulk Schedule</Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 3, pb: 2 }}>
              <Typography sx={{ color: T.text, lineHeight: 1.7, fontSize: "0.93rem" }}>
                You are about to create schedules for <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{bulkTargetEmployees.length} employee(s)</Box>.
              </Typography>
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "#fff9f0", border: "1px solid #f5d89a", borderRadius: "10px" }}>
                <Typography sx={{ color: "#7a5000", fontSize: "0.82rem", lineHeight: 1.55 }}>⚠ Existing active schedules will be set to inactive.</Typography>
              </Box>
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
              <Button variant="outlined" onClick={() => setShowBulkConfirmModal(false)} sx={{ borderColor: "#ccc", color: "#444", fontWeight: 600, textTransform: "none" }}>Cancel</Button>
              <Button variant="contained" disableElevation
                onClick={async () => {
                  setShowBulkConfirmModal(false);
                  const sevenRows = DAYS_ORDER.map((day) => { const r = modalRecords.find((x) => x.day === day); return r ? { ...r, day } : makeDefaultRow(employeeID, day); });
                  setSaving(true);
                  try {
                    const res = await axios.post(`${API_BASE_URL}/officialtime/bulk-schedules`, { employeeIDs: bulkTargetEmployees, blocks: bulkScheduleBlocks, records: sevenRows }, { ...getAuthHeaders(), timeout: 30000 });
                    showToast(`Bulk schedules processed. Inserted for ${Math.round((res.data.totalInserted || 0) / 7)} users.`);
                    await fetchAllUsers();
                  } catch (err) {
                    setWarningMessage(err.response?.data?.message || err.message || "Error saving bulk schedules.");
                    setShowWarningModal(true);
                  } finally {
                    setSaving(false);
                    setShowScheduleModal(false);
                    setIsBulkSchedule(false);
                    setBulkTargetEmployees([]);
                    setBulkScheduleBlocks([]);
                  }
                }}
                sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 120, "&:hover": { bgcolor: T.accentDark } }}
              >
                Yes, Proceed
              </Button>
            </Box>
          </Dialog>

          {/* ── Upload Preview ── */}
          <Dialog open={showPreviewModal} onClose={() => setShowPreviewModal(false)} maxWidth={false} PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden", width: "96vw", maxWidth: "1500px" } }}>
            <Box sx={dialogHeaderSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Visibility sx={{ color: "#fff", fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.975rem" }}>Upload Preview</Typography>
              </Box>
              {dialogCloseBtn(() => setShowPreviewModal(false))}
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 0 }}>
              {previewRecords.length > 0 && (
                <>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2.5, p: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: "12px" }}>
                    {[
                      { label: "Academic Year", value: previewRecords[0].academicYear || "—" },
                      { label: "Start Date", value: formatDateLong(previewRecords[0].startDate) || formatDateOnly(previewRecords[0].startDate) },
                      { label: "End Date", value: formatDateLong(previewRecords[0].endDate) || formatDateOnly(previewRecords[0].endDate) },
                    ].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</Typography>
                        <Typography sx={{ fontWeight: 600, color: T.text, fontSize: "0.88rem", mt: 0.25 }}>{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ mb: 2 }}><ScheduleTabBar activeTab={previewViewScheduleView} setTab={setPreviewViewScheduleView} /></Box>
                  <TableContainer sx={{ border: `1px solid ${T.divider}`, borderRadius: "10px", overflow: "hidden", mb: 3 }}>
                    <Table size="small">
                      <ScheduleTimeRows
                        records={[...previewRecords].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day))}
                        onChangeRecord={() => {}}
                        scheduleView={previewViewScheduleView}
                        readOnly
                      />
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" disableElevation onClick={() => setShowPreviewModal(false)} sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: T.accentDark } }}>Close</Button>
            </Box>
          </Dialog>

          {/* ── Analyze / Validate Modal (single-employee upload) ── */}
          <Dialog
            open={showAnalyzeModal}
            onClose={() => { if (confirming) return; setShowAnalyzeModal(false); setAnalyzeResult(null); setUploadAcknowledgeChecked(false); setAnalyzeEmployeeNames({}); }}
            maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}
          >
            <Box sx={{ ...dialogHeaderSx, bgcolor: analyzeResult?.ok ? T.accent : "#b71c1c" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.975rem", lineHeight: 1.25 }}>
                    {analyzeResult?.ok ? "Validation Complete — Ready to Upload" : "Validation Failed"}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: "0.78rem", mt: 0.25 }}>
                    {analyzeResult?.ok ? "Review details before confirming." : "Fix your file and re-upload."}
                  </Typography>
                </Box>
              </Box>
              {dialogCloseBtn(() => { if (confirming) return; setShowAnalyzeModal(false); setAnalyzeResult(null); setUploadAcknowledgeChecked(false); setAnalyzeEmployeeNames({}); }, confirming)}
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 1, maxHeight: "65vh", overflowY: "auto" }}>
              {analyzeResult?.ok ? (
                <>
                  <Box sx={{ border: `1px solid ${T.accentBorder}`, borderRadius: "10px", overflow: "hidden", mb: 2.5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.6fr 1fr 1fr 60px", columnGap: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.accentBorder}`, px: 2, py: 1 }}>
                      {["Employee ID","Name","Academic Year","Start Date","End Date","Rows"].map((h) => (
                        <Typography key={h} sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</Typography>
                      ))}
                    </Box>
                    {(analyzeResult.schedules || []).map((s, idx) => (
                      <Box key={idx} sx={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.6fr 1fr 1fr 60px", columnGap: 1.5, px: 2, py: 1.1, bgcolor: idx % 2 === 0 ? "#fff" : T.accentFaint, borderBottom: idx < (analyzeResult.schedules?.length || 0) - 1 ? `0.5px solid ${T.accentBorder}` : "none", alignItems: "center" }}>
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text }}>{s.employeeID}</Typography>
                        {/* [CHANGE I] Prefer the Excel "Name" column (display-only, backend-echoed).
                            Fall back to the system lookup by employeeID only when Excel had none. */}
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 0.75 }}>
                          {s.name ? (
                            s.name
                          ) : analyzeEmployeeNames[String(s.employeeID)] === undefined ? (
                            <CircularProgress size={11} sx={{ color: T.accent }} />
                          ) : (
                            analyzeEmployeeNames[String(s.employeeID)] || "—"
                          )}
                        </Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{s.academicYear || "—"}</Typography>
<Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{formatDateLong(s.startDate)}</Typography>
<Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{formatDateLong(s.endDate)}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#2e7d32", fontWeight: 700 }}>{s.rows}</Typography>
                      </Box>
                    ))}
                  </Box>
                 <Box
  onClick={() => setUploadAcknowledgeChecked((v) => !v)}
  sx={{
    display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, mb: 2,
    bgcolor: uploadAcknowledgeChecked ? T.accentFaint : "#fff",
    border: `1px solid ${uploadAcknowledgeChecked ? T.accent : T.accentBorder}`,
    borderRadius: "10px", cursor: "pointer",
    transition: "all 0.15s ease",
    "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
  }}
>
  <Checkbox
    size="small"
    checked={uploadAcknowledgeChecked}
    onChange={(e) => setUploadAcknowledgeChecked(e.target.checked)}
    onClick={(e) => e.stopPropagation()}
    sx={{ color: T.accent, mt: "-2px" }}
  />
  <Typography sx={{ fontSize: "0.80rem", color: T.accentDark, lineHeight: 1.55, userSelect: "none" }}>
    I confirm that I reviewed this upload. Current active schedules for listed employees will be set to Inactive before new schedules are activated.
  </Typography>
</Box>
                </>
              ) : (
                <>
                  {analyzeResult?.message && (
                    <Box sx={{ p: 1.75, mb: 2.5, bgcolor: "#fff9f0", border: "1px solid #f5d89a", borderRadius: "10px" }}>
                      <Typography sx={{ fontSize: "0.83rem", color: "#7a5000", lineHeight: 1.6 }}>{analyzeResult.message}</Typography>
                    </Box>
                  )}
                  {(analyzeResult?.timeErrors || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#c62828", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>
                        Time Format Errors ({analyzeResult.timeErrors.length})
                      </Typography>
                      <Box sx={{ border: "1px solid #ffcdd2", borderRadius: "10px", overflow: "hidden" }}>
                        {analyzeResult.timeErrors.map((e, idx) => (
                          <Box key={idx} sx={{ px: 1.75, py: 0.85, bgcolor: idx % 2 === 0 ? "#fff" : "#fff5f5", borderBottom: idx < analyzeResult.timeErrors.length - 1 ? "0.5px solid #ffcdd2" : "none" }}>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#7a0000" }}>Row {e.row} — {e.employeeID} ({e.day}) — {e.field}</Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: "#c62828", mt: 0.2 }}>{e.reason}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Button variant="outlined" onClick={() => { setShowAnalyzeModal(false); setAnalyzeResult(null); setUploadAcknowledgeChecked(false); setAnalyzeEmployeeNames({}); }} disabled={confirming}
                sx={{ borderColor: "#ccc", color: "#444", fontWeight: 600, textTransform: "none" }}
              >
                {analyzeResult?.ok ? "Cancel" : "Close"}
              </Button>
              {analyzeResult?.ok && (
                <Button variant="contained" disableElevation onClick={handleConfirmUpload} disabled={confirming || !uploadAcknowledgeChecked}
                  startIcon={confirming ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <CloudUploadIcon />}
                  sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 180, "&:hover": { bgcolor: T.accentDark }, "&.Mui-disabled": { bgcolor: "#c0a0a0", color: "#fff" } }}
                >
                  {confirming ? "Uploading…" : "Confirm & Upload"}
                </Button>
              )}
            </Box>
          </Dialog>

          {/* ── Department Upload Validate/Confirm Modal ── */}
          <Dialog
            open={showDeptAnalyzeModal}
            onClose={() => { if (deptConfirming) return; setShowDeptAnalyzeModal(false); setDeptAnalyzeResult(null); setDeptUploadAcknowledgeChecked(false); setDeptAnalyzeEmployeeNames({}); }}
            maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}
          >
            <Box sx={{ ...dialogHeaderSx, bgcolor: deptAnalyzeResult?.ok ? T.accent : "#b71c1c" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.975rem", lineHeight: 1.25 }}>
                    {deptAnalyzeResult?.ok ? `Validation Complete — ${deptUploadDepartment}` : "Validation Failed"}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: "0.78rem", mt: 0.25 }}>
                    {deptAnalyzeResult?.ok ? "Review details before confirming." : "Fix your file and re-upload."}
                  </Typography>
                </Box>
              </Box>
              {dialogCloseBtn(() => { if (deptConfirming) return; setShowDeptAnalyzeModal(false); setDeptAnalyzeResult(null); setDeptUploadAcknowledgeChecked(false); setDeptAnalyzeEmployeeNames({}); }, deptConfirming)}
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 1, maxHeight: "65vh", overflowY: "auto" }}>
              {deptAnalyzeResult?.ok ? (
                <>
                  <Box sx={{ border: `1px solid ${T.accentBorder}`, borderRadius: "10px", overflow: "hidden", mb: 2.5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.6fr 1fr 1fr 60px", columnGap: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.accentBorder}`, px: 2, py: 1 }}>
                      {["Employee ID","Name","Academic Year","Start Date","End Date","Rows"].map((h) => (
                        <Typography key={h} sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</Typography>
                      ))}
                    </Box>
                    {(deptAnalyzeResult.schedules || []).map((s, idx) => (
                      <Box key={idx} sx={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.6fr 1fr 1fr 60px", columnGap: 1.5, px: 2, py: 1.1, bgcolor: idx % 2 === 0 ? "#fff" : T.accentFaint, borderBottom: idx < (deptAnalyzeResult.schedules?.length || 0) - 1 ? `0.5px solid ${T.accentBorder}` : "none", alignItems: "center" }}>
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text }}>{s.employeeID}</Typography>
                        {/* [CHANGE I] Prefer the Excel "Name" column (display-only, backend-echoed).
                            Fall back to the system lookup by employeeID only when Excel had none. */}
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 0.75 }}>
                          {s.name ? (
                            s.name
                          ) : deptAnalyzeEmployeeNames[String(s.employeeID)] === undefined ? (
                            <CircularProgress size={11} sx={{ color: T.accent }} />
                          ) : (
                            deptAnalyzeEmployeeNames[String(s.employeeID)] || "—"
                          )}
                        </Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{s.academicYear || "—"}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{formatDateLong(s.startDate)}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{formatDateLong(s.endDate)}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#2e7d32", fontWeight: 700 }}>{s.rows}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {(deptAnalyzeResult.warnings || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>
                        Warnings ({deptAnalyzeResult.warnings.length})
                      </Typography>
                      <Box sx={{ border: "1px solid #f5d89a", borderRadius: "10px", overflow: "hidden", maxHeight: 160, overflowY: "auto" }}>
                        {deptAnalyzeResult.warnings.map((w, idx) => (
                          <Box key={idx} sx={{ px: 1.75, py: 0.65, bgcolor: idx % 2 === 0 ? "#fff" : "#fff9f0", borderBottom: idx < deptAnalyzeResult.warnings.length - 1 ? "0.5px solid #f5d89a" : "none" }}>
                            <Typography sx={{ fontSize: "0.76rem", color: "#7a5000" }}>{w}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box
                    onClick={() => setDeptUploadAcknowledgeChecked((v) => !v)}
                    sx={{
                      display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, mb: 2,
                      bgcolor: deptUploadAcknowledgeChecked ? T.accentFaint : "#fff",
                      border: `1px solid ${deptUploadAcknowledgeChecked ? T.accent : T.accentBorder}`,
                      borderRadius: "10px", cursor: "pointer", transition: "all 0.15s ease",
                      "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                    }}
                  >
                    <Checkbox
                      size="small" checked={deptUploadAcknowledgeChecked}
                      onChange={(e) => setDeptUploadAcknowledgeChecked(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ color: T.accent, mt: "-2px" }}
                    />
                    <Typography sx={{ fontSize: "0.80rem", color: T.accentDark, lineHeight: 1.55, userSelect: "none" }}>
                      I confirm this upload is scoped to department "<strong>{deptUploadDepartment}</strong>". Current active schedules for the listed employees will be set to Inactive before new schedules are activated.
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  {deptAnalyzeResult?.message && (
                    <Box sx={{ p: 1.75, mb: 2.5, bgcolor: "#fff9f0", border: "1px solid #f5d89a", borderRadius: "10px" }}>
                      <Typography sx={{ fontSize: "0.83rem", color: "#7a5000", lineHeight: 1.6 }}>{deptAnalyzeResult.message}</Typography>
                    </Box>
                  )}
                  {(deptAnalyzeResult?.timeErrors || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#c62828", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>
                        Time Format Errors ({deptAnalyzeResult.timeErrors.length})
                      </Typography>
                      <Box sx={{ border: "1px solid #ffcdd2", borderRadius: "10px", overflow: "hidden" }}>
                        {deptAnalyzeResult.timeErrors.map((e, idx) => (
                          <Box key={idx} sx={{ px: 1.75, py: 0.85, bgcolor: idx % 2 === 0 ? "#fff" : "#fff5f5", borderBottom: idx < deptAnalyzeResult.timeErrors.length - 1 ? "0.5px solid #ffcdd2" : "none" }}>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#7a0000" }}>Row {e.row} — {e.employeeID} ({e.day}) — {e.field}</Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: "#c62828", mt: 0.2 }}>{e.reason}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Button variant="outlined" onClick={() => { setShowDeptAnalyzeModal(false); setDeptAnalyzeResult(null); setDeptUploadAcknowledgeChecked(false); setDeptAnalyzeEmployeeNames({}); }} disabled={deptConfirming}
                sx={{ borderColor: "#ccc", color: "#444", fontWeight: 600, textTransform: "none" }}
              >
                {deptAnalyzeResult?.ok ? "Cancel" : "Close"}
              </Button>
              {deptAnalyzeResult?.ok && (
                <Button variant="contained" disableElevation onClick={handleConfirmDeptUpload} disabled={deptConfirming || !deptUploadAcknowledgeChecked}
                  startIcon={deptConfirming ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <CloudUploadIcon />}
                  sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 180, "&:hover": { bgcolor: T.accentDark }, "&.Mui-disabled": { bgcolor: "#c0a0a0", color: "#fff" } }}
                >
                  {deptConfirming ? "Uploading…" : "Confirm & Upload"}
                </Button>
              )}
            </Box>
          </Dialog>

          {/* ── Employment Category Upload Validate/Confirm Modal — mirrors the
               Department upload modal above 1:1, scoped to a single employment
               category instead of a department. Employee name/category rows in
               this table don't need a color dot (the picker/filter/table already
               show it); the label alone is sufficient here. ── */}
          <Dialog
            open={showCatAnalyzeModal}
            onClose={() => { if (catConfirming) return; setShowCatAnalyzeModal(false); setCatAnalyzeResult(null); setCatUploadAcknowledgeChecked(false); setCatAnalyzeEmployeeNames({}); }}
            maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}
          >
            <Box sx={{ ...dialogHeaderSx, bgcolor: catAnalyzeResult?.ok ? T.accent : "#b71c1c" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.975rem", lineHeight: 1.25 }}>
                    {catAnalyzeResult?.ok
                      ? `Validation Complete — ${catAnalyzeResult.employmentCategoryLabel || employmentCategoryList.find((c) => String(c.id) === String(catUploadCategory))?.label || "Employment Category"}`
                      : "Validation Failed"}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: "0.78rem", mt: 0.25 }}>
                    {catAnalyzeResult?.ok ? "Review details before confirming." : "Fix your file and re-upload."}
                  </Typography>
                </Box>
              </Box>
              {dialogCloseBtn(() => { if (catConfirming) return; setShowCatAnalyzeModal(false); setCatAnalyzeResult(null); setCatUploadAcknowledgeChecked(false); setCatAnalyzeEmployeeNames({}); }, catConfirming)}
            </Box>
            <Box sx={{ bgcolor: "#fff", px: 3, pt: 2.5, pb: 1, maxHeight: "65vh", overflowY: "auto" }}>
              {catAnalyzeResult?.ok ? (
                <>
                  <Box sx={{ border: `1px solid ${T.accentBorder}`, borderRadius: "10px", overflow: "hidden", mb: 2.5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.6fr 1fr 1fr 60px", columnGap: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.accentBorder}`, px: 2, py: 1 }}>
                      {["Employee ID","Name","Academic Year","Start Date","End Date","Rows"].map((h) => (
                        <Typography key={h} sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</Typography>
                      ))}
                    </Box>
                    {(catAnalyzeResult.schedules || []).map((s, idx) => (
                      <Box key={idx} sx={{ display: "grid", gridTemplateColumns: "0.9fr 1.2fr 1.6fr 1fr 1fr 60px", columnGap: 1.5, px: 2, py: 1.1, bgcolor: idx % 2 === 0 ? "#fff" : T.accentFaint, borderBottom: idx < (catAnalyzeResult.schedules?.length || 0) - 1 ? `0.5px solid ${T.accentBorder}` : "none", alignItems: "center" }}>
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text }}>{s.employeeID}</Typography>
                        {/* [CHANGE I] Prefer the Excel "Name" column (display-only, backend-echoed).
                            Fall back to the system lookup by employeeID only when Excel had none. */}
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 0.75 }}>
                          {s.name ? (
                            s.name
                          ) : catAnalyzeEmployeeNames[String(s.employeeID)] === undefined ? (
                            <CircularProgress size={11} sx={{ color: T.accent }} />
                          ) : (
                            catAnalyzeEmployeeNames[String(s.employeeID)] || "—"
                          )}
                        </Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{s.academicYear || "—"}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{formatDateLong(s.startDate)}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#333" }}>{formatDateLong(s.endDate)}</Typography>
                        <Typography sx={{ fontSize: "0.83rem", color: "#2e7d32", fontWeight: 700 }}>{s.rows}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {(catAnalyzeResult.warnings || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>
                        Warnings ({catAnalyzeResult.warnings.length})
                      </Typography>
                      <Box sx={{ border: "1px solid #f5d89a", borderRadius: "10px", overflow: "hidden", maxHeight: 160, overflowY: "auto" }}>
                        {catAnalyzeResult.warnings.map((w, idx) => (
                          <Box key={idx} sx={{ px: 1.75, py: 0.65, bgcolor: idx % 2 === 0 ? "#fff" : "#fff9f0", borderBottom: idx < catAnalyzeResult.warnings.length - 1 ? "0.5px solid #f5d89a" : "none" }}>
                            <Typography sx={{ fontSize: "0.76rem", color: "#7a5000" }}>{w}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box
                    onClick={() => setCatUploadAcknowledgeChecked((v) => !v)}
                    sx={{
                      display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, mb: 2,
                      bgcolor: catUploadAcknowledgeChecked ? T.accentFaint : "#fff",
                      border: `1px solid ${catUploadAcknowledgeChecked ? T.accent : T.accentBorder}`,
                      borderRadius: "10px", cursor: "pointer", transition: "all 0.15s ease",
                      "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                    }}
                  >
                    <Checkbox
                      size="small" checked={catUploadAcknowledgeChecked}
                      onChange={(e) => setCatUploadAcknowledgeChecked(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ color: T.accent, mt: "-2px" }}
                    />
                    <Typography sx={{ fontSize: "0.80rem", color: T.accentDark, lineHeight: 1.55, userSelect: "none" }}>
                      I confirm this upload is scoped to employment category "
                      <strong>{catAnalyzeResult.employmentCategoryLabel || employmentCategoryList.find((c) => String(c.id) === String(catUploadCategory))?.label}</strong>
                      ". Current active schedules for the listed employees will be set to Inactive before new schedules are activated.
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  {catAnalyzeResult?.message && (
                    <Box sx={{ p: 1.75, mb: 2.5, bgcolor: "#fff9f0", border: "1px solid #f5d89a", borderRadius: "10px" }}>
                      <Typography sx={{ fontSize: "0.83rem", color: "#7a5000", lineHeight: 1.6 }}>{catAnalyzeResult.message}</Typography>
                    </Box>
                  )}
                  {(catAnalyzeResult?.timeErrors || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#c62828", textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.75 }}>
                        Time Format Errors ({catAnalyzeResult.timeErrors.length})
                      </Typography>
                      <Box sx={{ border: "1px solid #ffcdd2", borderRadius: "10px", overflow: "hidden" }}>
                        {catAnalyzeResult.timeErrors.map((e, idx) => (
                          <Box key={idx} sx={{ px: 1.75, py: 0.85, bgcolor: idx % 2 === 0 ? "#fff" : "#fff5f5", borderBottom: idx < catAnalyzeResult.timeErrors.length - 1 ? "0.5px solid #ffcdd2" : "none" }}>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#7a0000" }}>Row {e.row} — {e.employeeID} ({e.day}) — {e.field}</Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: "#c62828", mt: 0.2 }}>{e.reason}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>
            <Box sx={{ borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Button variant="outlined" onClick={() => { setShowCatAnalyzeModal(false); setCatAnalyzeResult(null); setCatUploadAcknowledgeChecked(false); setCatAnalyzeEmployeeNames({}); }} disabled={catConfirming}
                sx={{ borderColor: "#ccc", color: "#444", fontWeight: 600, textTransform: "none" }}
              >
                {catAnalyzeResult?.ok ? "Cancel" : "Close"}
              </Button>
              {catAnalyzeResult?.ok && (
                <Button variant="contained" disableElevation onClick={handleConfirmCatUpload} disabled={catConfirming || !catUploadAcknowledgeChecked}
                  startIcon={catConfirming ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <CloudUploadIcon />}
                  sx={{ bgcolor: T.accent, color: "#fff", fontWeight: 700, textTransform: "none", minWidth: 180, "&:hover": { bgcolor: T.accentDark }, "&.Mui-disabled": { bgcolor: "#c0a0a0", color: "#fff" } }}
                >
                  {catConfirming ? "Uploading…" : "Confirm & Upload"}
                </Button>
              )}
            </Box>
          </Dialog>

          <SuccessfulOverlay open={successOpen} action={successAction} />
        </Box>
      </Fade>
    </>
  );
};

export default OfficialTimeForm;