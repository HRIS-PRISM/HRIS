import API_BASE_URL from "../../apiConfig";
import React, { forwardRef, useRef, useState, useEffect, useCallback, memo } from "react";
import {
  Paper, Typography, Box, Button, CircularProgress, Dialog,
  TextField, MenuItem, Avatar, Fade, Card, List, ListItem, ListItemText,
  styled, alpha, IconButton, Tooltip, Grid, InputAdornment,
  Alert, Snackbar, Modal,
  Checkbox,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import Search from "@mui/icons-material/Search";
import Refresh from "@mui/icons-material/Refresh";
import Send from "@mui/icons-material/Send";
import Download from "@mui/icons-material/Download";
import Person from "@mui/icons-material/Person";
import CalendarToday from "@mui/icons-material/CalendarToday";
import Visibility from "@mui/icons-material/Visibility";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { Close } from "@mui/icons-material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import usePayrollRealtimeRefresh from "../../hooks/usePayrollRealtimeRefresh";

// ─── Theme tokens (unified with ItemTable) ─────────────────────────────────────
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

// ─── Shimmer / Skeleton ────────────────────────────────────────────────────────
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
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: "800px 100%",
    animation: "shimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 } }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: "hidden", border: `1px solid ${T.accentBorder}`, animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ p: 3.5, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2.5, position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.06)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)", flexShrink: 0 }} />
            <Box><Bone w={220} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3}>
        {[4, 8].map((lg, idx) => (
          <Grid item xs={12} lg={lg} key={idx}>
            <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: "#fff", overflow: "hidden", animation: `blink 2s ease-in-out ${idx * 0.1}s infinite`, height: "calc(100vh - 280px)" }}>
              <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
                <Bone w={lg === 4 ? 160 : 220} h={13} />
              </Box>
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
                {[100, 160, 120, 140, 110, 130].map((w, i) => (
                  <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: "#fafafa" }} /></Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  </>
);

// ─── Generic Confirmation Modal ────────────────────────────────────────────────
const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", confirmColor = T.accent, confirmHoverColor = T.accentDark, icon: Icon = ErrorOutlineIcon, iconColor = T.accent, iconBg = T.accentFaint, loading = false }) => (
  <Modal open={open} onClose={onClose} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, zIndex: 1400 }}>
    <Fade in={open}>
      <Box sx={{ width: "100%", maxWidth: 420, borderRadius: 3, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", bgcolor: T.surface, display: "flex", flexDirection: "column" }}>
        <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon sx={{ fontSize: 17, color: "#fff" }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.93rem" }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: "0.875rem", color: T.text, lineHeight: 1.65, pt: 0.5, whiteSpace: "pre-line" }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1.25 }}>
          <AccentButton onClick={onClose} variant="outlined" sx={{ fontSize: "0.8rem", borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <AccentButton onClick={onConfirm} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : null}
            sx={{ fontSize: "0.8rem", bgcolor: confirmColor, color: "#fff", boxShadow: `0 2px 10px ${alpha(confirmColor, 0.32)}`, "&:hover": { bgcolor: confirmHoverColor }, "&:disabled": { bgcolor: "#ddd" } }}>
            {loading ? "Processing…" : confirmLabel}
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Error Modal ───────────────────────────────────────────────────────────────
const ErrorModal = ({ open, onClose, title, message, icon: Icon = ErrorOutlineIcon, iconColor = "#C62828", iconBg = "#FFEBEE" }) => (
  <Modal open={open} onClose={onClose} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, zIndex: 1500 }}>
    <Fade in={open}>
      <Box sx={{ width: "100%", maxWidth: 420, borderRadius: 3, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", bgcolor: T.surface, display: "flex", flexDirection: "column" }}>
        <Box sx={{ px: 3.5, py: 2.5, background: `linear-gradient(180deg,${iconColor} 0%,${alpha(iconColor, 0.82)} 100%)`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.05)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon sx={{ fontSize: 17, color: "#fff" }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.93rem" }}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3.5, py: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: iconBg, border: `1px solid ${alpha(iconColor, 0.2)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.25 }}>
              <Icon sx={{ fontSize: 18, color: iconColor }} />
            </Box>
            <Typography sx={{ fontSize: "0.875rem", color: T.text, lineHeight: 1.65, pt: 0.5 }}>{message}</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end" }}>
          <AccentButton onClick={onClose} variant="contained" sx={{ fontSize: "0.8rem", bgcolor: iconColor, color: "#fff", boxShadow: `0 2px 10px ${alpha(iconColor, 0.3)}`, "&:hover": { bgcolor: alpha(iconColor, 0.85) } }}>
            Understood
          </AccentButton>
        </Box>
      </Box>
    </Fade>
  </Modal>
);

// ─── Section label (from ItemTable) ───────────────────────────────────────────
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

// ─── Auth helper ───────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
};

// ─── Employee Autocomplete (ported from ItemTable) ────────────────────────────
const EmployeeAutocomplete = memo(({
  value, onChange, placeholder = "Search employee…", disabled = false,
  selectedEmployee, onEmployeeSelect,
}) => {
  const [query, setQuery]               = useState("");
  const [employees, setEmployees]       = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { if (value && !selectedEmployee) fetchEmployeeById(value); }, [value]); // eslint-disable-line
  useEffect(() => {
    if (selectedEmployee) setQuery(selectedEmployee.name || "");
    else if (!value) setQuery("");
  }, [selectedEmployee, value]);
  useEffect(() => {
    const handle = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const fetchEmployees = async (q) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`, getAuthHeaders());
      setEmployees(res.data);
    } catch { setEmployees([]); } finally { setIsLoading(false); }
  };
  const fetchAllEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, getAuthHeaders());
      setEmployees(res.data);
    } catch { setEmployees([]); } finally { setIsLoading(false); }
  };
  const fetchEmployeeById = async (num) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/Remittance/employees/${num}`, getAuthHeaders());
      onEmployeeSelect(res.data);
      setQuery(res.data.name || "");
    } catch { /* silent */ }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (selectedEmployee && v !== selectedEmployee.name) { onEmployeeSelect(null); onChange(""); }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 2) fetchEmployees(v);
      else if (v.trim().length === 0) fetchAllEmployees();
      else setEmployees([]);
    }, 300);
  };
  const handleSelect  = (emp) => { onEmployeeSelect(emp); setQuery(emp.name); setShowDropdown(false); onChange(emp.employeeNumber); };
  const handleFocus   = () => { setShowDropdown(true); if (!employees.length && !isLoading) { query.length >= 2 ? fetchEmployees(query) : fetchAllEmployees(); } };
  const handleToggle  = () => { if (!showDropdown) { setShowDropdown(true); if (!employees.length && !isLoading) fetchAllEmployees(); } else setShowDropdown(false); };

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={dropdownRef}>
      <FieldInput
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={(e) => { if (e.key === "Escape") setShowDropdown(false); }}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 15, color: T.muted }} /></InputAdornment>,
          endAdornment: (
            <IconButton onClick={handleToggle} size="small" sx={{ color: T.muted, p: 0.25 }}>
              {showDropdown ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper elevation={4} sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1300, maxHeight: 260, overflow: "auto", mt: 0.75, borderRadius: 2, border: `1px solid ${T.accentBorder}`, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
          {isLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, gap: 1 }}>
              <CircularProgress size={14} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: "0.78rem", color: T.muted }}>Loading…</Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem key={emp.employeeNumber} button onClick={() => handleSelect(emp)}
                  sx={{ py: 1, px: 1.5, "&:hover": { bgcolor: T.accentHover }, borderBottom: `1px solid ${T.divider}`, "&:last-child": { borderBottom: "none" } }}>
                  <Avatar sx={{ width: 26, height: 26, bgcolor: alpha(T.accent, 0.12), color: T.accent, fontSize: "0.68rem", fontWeight: 700, mr: 1.25, flexShrink: 0 }}>
                    {(emp.name?.[0] || "?").toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={emp.name}
                    secondary={`#${emp.employeeNumber}`}
                    primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}
                    secondaryTypographyProps={{ fontSize: "0.7rem", color: T.muted }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontStyle: "italic" }}>
                {query.length >= 2 ? `No employees found matching "${query}"` : "Type to search or click to browse all"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
};

// ─── Payslip layout sub-components ────────────────────────────────────────────
const MoneyCell = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2, borderBottom: "1.5px solid #ddd" }}>
    <Typography sx={{ fontSize: "18px", fontWeight: 700, color: "#333", fontFamily: '"Poppins",sans-serif' }}>{label}</Typography>
    <Typography sx={{ fontSize: "20px", fontWeight: 900, color: "#111", fontFamily: '"Poppins",sans-serif', minWidth: "140px", textAlign: "right" }}>{value || "—"}</Typography>
  </Box>
);

const DeductionRow = ({ items, isEven }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", backgroundColor: isEven ? "#fdf6f6" : "#fff", borderBottom: "1.5px solid #c9a8a8" }}>
    {items.map(([label, value], i) => (
      <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1.5, py: 0.5, borderRight: i < 2 ? "1.5px solid #c9a8a8" : "none", minHeight: "38px", gap: 0.5 }}>
        <Typography sx={{ fontSize: "20px", color: "#1a1a1a", fontFamily: '"Poppins",sans-serif', fontWeight: 700, lineHeight: 1.1, flex: 1 }}>{label || ""}</Typography>
        <Typography sx={{ fontSize: "20px", fontWeight: 900, color: value ? "#6d2323" : "#aaa", fontFamily: '"Poppins",sans-serif', minWidth: "100px", textAlign: "right", flexShrink: 0 }}>{value || "—"}</Typography>
      </Box>
    ))}
  </Box>
);

const SummaryCard = ({ label, value, accent = false }) => (
  <Box sx={{ flex: 1, borderRadius: 2, p: 1.5, background: accent ? "linear-gradient(135deg,#f5ede8 0%,#ede0d8 100%)" : "#fff", border: accent ? "2.5px solid #6d2323" : "2.5px solid #c9a8a8", boxShadow: accent ? "0 4px 16px rgba(109,35,35,0.25)" : "none", display: "flex", flexDirection: "column", gap: 0.8 }}>
    <Typography sx={{ fontSize: "17px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6d2323", fontFamily: '"Poppins",sans-serif' }}>{label}</Typography>
    <Typography sx={{ fontSize: "34px", fontWeight: 900, color: accent ? "#6d2323" : "#1a1a1a", fontFamily: '"Poppins",sans-serif', lineHeight: 1.1, letterSpacing: "-0.01em" }}>{value || "—"}</Typography>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PayslipDistribution = forwardRef(({ employee }, ref) => {
  const payslipRef = useRef();

  const [allPayroll, setAllPayroll] = useState([]);
  const [loading, setLoading] = useState(!employee);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("bulk");

  // Bulk
  const [sending, setSending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [successOverlay, setSuccessOverlay] = useState({ open: false, action: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredPayroll, setFilteredPayroll] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Payslip modal
  const [payslipModal, setPayslipModal] = useState({ open: false, emp: null });
  const [modalSending, setModalSending] = useState(false);

  // Individual
  const [indivSearch, setIndivSearch]         = useState("");
  const [indivHasSearched, setIndivHasSearched] = useState(false);
  const [indivMonth, setIndivMonth]           = useState("");
  const [displayEmployee, setDisplayEmployee] = useState(null);
  const [indivSending, setIndivSending]       = useState(false);
  const [selectedIndivEmployee, setSelectedIndivEmployee] = useState(null);

  // Error / confirm modals
  const [errorModal, setErrorModal] = useState({ open: false, title: "", message: "", iconColor: "#C62828", iconBg: "#FFEBEE", icon: ErrorOutlineIcon });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: "", message: "", confirmLabel: "Confirm", confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: Send, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {} });

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Integrity
  const [originalPayroll, setOriginalPayroll] = useState([]);
  const [payrollHash, setPayrollHash] = useState("");
  const [fetchedAt, setFetchedAt] = useState(null);

  const showError = useCallback((title, message, opts = {}) => setErrorModal({ open: true, title, message, iconColor: "#C62828", iconBg: "#FFEBEE", icon: ErrorOutlineIcon, ...opts }), []);
  const closeError = useCallback(() => setErrorModal((p) => ({ ...p, open: false })), []);
  const showConfirm = useCallback((opts) => setConfirmModal({ open: true, title: "", message: "", confirmLabel: "Confirm", confirmColor: T.accent, confirmHoverColor: T.accentDark, icon: Send, iconColor: T.accent, iconBg: T.accentFaint, loading: false, onConfirm: () => {}, ...opts }), []);
  const closeConfirm = useCallback(() => setConfirmModal((p) => ({ ...p, open: false, loading: false })), []);

  const { settings } = useSystemSettings();
  const institutionLogo = settings.institutionLogo || "";
  const hrisLogo = settings.hrisLogo || "";
  const institutionName = settings.institutionName || 'EULOGIO "AMANG" RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY';
  const institutionAddress = settings.institutionAddress || "Nagtahan, Sampaloc Manila";
  const certifierName = settings.certifierName || "GIOVANNI L. AHUNIN";
  const certifierPosition = settings.certifierPosition || "Director, Administrative Services";

  const { hasAccess, loading: accessLoading } = usePageAccess("distribution-payslip");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const fetchPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`, getAuthHeaders());
      const data = res.data || [];
      setAllPayroll(data);
      if (data.length > 0) {
        const immutable = Object.freeze(JSON.parse(JSON.stringify(data)));
        setOriginalPayroll(immutable);
        setPayrollHash(generateHash(data));
        setFetchedAt(new Date().toISOString());
      } else {
        setOriginalPayroll([]);
        setPayrollHash("");
        setFetchedAt(null);
      }
    } catch {
      setError("Failed to fetch payroll data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  usePayrollRealtimeRefresh(() => { if (!employee) fetchPayrollData(); });
  useEffect(() => { if (!employee) fetchPayrollData(); }, [employee]); // eslint-disable-line

  useEffect(() => {
    let result = [...allPayroll];
    if (selectedMonth) {
      const monthIndex = months.indexOf(selectedMonth);
      result = result.filter((emp) => {
        if (!emp.startDate) return false;
        const d = new Date(emp.startDate);
        return d.getMonth() === monthIndex && d.getFullYear() === selectedYear;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q) || e.employeeNumber.toString().includes(q));
    }
    setFilteredPayroll(result);
    setSelectedEmployees([]);
  }, [selectedMonth, selectedYear, searchQuery, allPayroll]); // eslint-disable-line

  const allSelected = filteredPayroll.length > 0 && selectedEmployees.length === filteredPayroll.length;
  const someSelected = selectedEmployees.length > 0 && selectedEmployees.length < filteredPayroll.length;
  const handleSelectAll = (e) => setSelectedEmployees(e.target.checked ? filteredPayroll.map((e) => e.employeeNumber) : []);
  const handleSelectOne = (id) => setSelectedEmployees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleIndivSearch = useCallback(() => {
    if (!indivSearch.trim() && !selectedIndivEmployee) return;
    setDisplayEmployee(null);
    setIndivMonth("");
    setIndivHasSearched(true);
  }, [indivSearch, selectedIndivEmployee]);

  const handleIndivClear = useCallback(() => {
    setIndivSearch("");
    setSelectedIndivEmployee(null);
    setIndivHasSearched(false);
    setIndivMonth("");
    setDisplayEmployee(null);
  }, []);

  const handleIndivEmployeeSelect = useCallback((emp) => {
    setSelectedIndivEmployee(emp);
    setIndivSearch(emp?.employeeNumber || "");
    if (emp) {
      setIndivHasSearched(true);
      setDisplayEmployee(null);
      setIndivMonth("");
    }
  }, []);

  const handleIndivMonthSelect = useCallback((month) => {
    setIndivMonth(month);
    const monthIndex = months.indexOf(month);
    const searchId   = selectedIndivEmployee?.employeeNumber || indivSearch.trim();
    const result = allPayroll.filter((e) =>
      (searchId
        ? e.employeeNumber.toString().includes(searchId) || e.name.toLowerCase().includes(searchId.toLowerCase())
        : true) &&
      new Date(e.startDate).getMonth() === monthIndex
    );
    setDisplayEmployee(result.length > 0 ? result[0] : null);
  }, [selectedIndivEmployee, indivSearch, allPayroll, months]);

  const openPayslipModal = (emp) => setPayslipModal({ open: true, emp });

  const formatCurrency = (v) => { const n = parseFloat(v); return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString()}` : ""; };
  const formatRenderedDays = (v) => { const h = Number(v); if (!isNaN(h) && h > 0) { const d = Math.floor(h / 8), r = h % 8; return `${d} days${r > 0 ? ` & ${r} hrs` : ""}`; } return ""; };
  const getSurname = (name) => { if (!name) return "EARIST"; const p = name.trim().split(" "); return p[p.length - 1] || "EARIST"; };
  const formatPeriod = (sd) => { if (!sd) return "Unknown"; const d = new Date(sd); return `${d.toLocaleString("en-US", { month: "long" })}_${d.getFullYear()}`; };
  const formatAbs = (v) => formatCurrency(v) || "Deducted from VL";
  const computeNetPay = (emp) => { const n = (parseFloat(emp.netSalary) || 0) - (parseFloat(emp.totalDeductions) || 0); return n !== 0 ? `₱${n.toLocaleString()}` : "—"; };
  const formatDateRange = (emp) => {
    if (!emp?.startDate || !emp?.endDate) return "";
    const s = new Date(emp.startDate), e = new Date(emp.endDate);
    return `${s.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${s.getDate()}–${e.getDate()} ${e.getFullYear()}`;
  };

  const verifyIntegrity = () => {
    if (!fetchedAt || originalPayroll.length === 0) {
      setSnackbar({ open: true, message: "No payroll data loaded.", severity: "warning" });
      return false;
    }
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    if (ageMs > 30 * 60 * 1000) {
      setSnackbar({ open: true, message: "Data older than 30 min. Please refresh.", severity: "warning" });
      return false;
    }
    if (generateHash(allPayroll) !== payrollHash) {
      setSnackbar({ open: true, message: "Integrity check failed. Please reload.", severity: "error" });
      return false;
    }
    return true;
  };

  // ── HTML payslip builder ───────────────────────────────────────────────────
  const buildPayslipHTML = (emp, logoSrc, hrisLogoSrc) => {
    const fc = (v) => { const n = parseFloat(v); return !isNaN(n) && n !== 0 ? `&#8369;${n.toLocaleString()}` : ""; };
    const fcAbs = (v) => fc(v) || "Deducted from VL";
    const frd = (v) => { const h = Number(v); if (!isNaN(h) && h > 0) { const d = Math.floor(h / 8), r = h % 8; return `${d} days${r > 0 ? ` & ${r} hrs` : ""}`; } return ""; };
    const period = (() => { if (!emp.startDate || !emp.endDate) return "&mdash;"; const s = new Date(emp.startDate), e = new Date(emp.endDate); return `${s.toLocaleString("en-US", { month: "long" }).toUpperCase()} ${s.getDate()}&ndash;${e.getDate()} ${e.getFullYear()}`; })();
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const netPayCalc = (() => { const n = (parseFloat(emp.netSalary) || 0) - (parseFloat(emp.totalDeductions) || 0); return n !== 0 ? `&#8369;${n.toLocaleString()}` : "&mdash;"; })();
    const headerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#6d2323 0%,#a31d1d 100%);border-radius:6px;padding:20px 28px;margin-bottom:18px;box-shadow:0 4px 20px rgba(109,35,35,0.3);">${logoSrc ? `<img src="${logoSrc}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin-left:8px;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);margin-left:8px;flex-shrink:0;"></div>`}<div style="flex:1;text-align:center;color:white;padding:0 16px;"><div style="font-style:italic;font-size:18px;opacity:0.9;font-family:Poppins,sans-serif;">Republic of the Philippines</div><div style="font-weight:900;font-size:22px;line-height:1.4;font-family:Poppins,sans-serif;letter-spacing:0.02em;margin-top:4px;">${institutionName}</div><div style="font-size:17px;opacity:0.85;font-family:Poppins,sans-serif;margin-top:4px;">${institutionAddress}</div></div>${hrisLogoSrc ? `<img src="${hrisLogoSrc}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;flex-shrink:0;" crossorigin="anonymous"/>` : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);flex-shrink:0;"></div>`}</div>`;
    const secHead = (t) => `<div style="background:#6D2323;color:white;padding:8px 16px;"><span style="font-weight:800;font-size:20px;letter-spacing:0.07em;font-family:Poppins,sans-serif;">${t}</span></div>`;
    const infoCell = (lbl, content, br = false, bb = false, fw = false) => `<div style="padding:12px 16px;${br ? "border-right:2px solid #e0c8c8;" : ""}${bb ? "border-bottom:2px solid #e0c8c8;" : ""}min-height:60px;${fw ? "grid-column:1/-1;" : ""}"><div style="font-size:18px;font-weight:800;letter-spacing:0.06em;color:#6d2323;margin-bottom:4px;font-family:Poppins,sans-serif;text-transform:uppercase;">${lbl}</div>${content}</div>`;
    const summaryCards = (netSal, totalDed, netPay) => `<div style="display:flex;gap:12px;margin-bottom:24px;">${[["Net Salary", netSal, false], ["Total Deductions", totalDed, false], ["Net Pay", netPay, true]].map(([lbl, val, acc]) => `<div style="flex:1;border-radius:8px;padding:12px;background:${acc ? "linear-gradient(135deg,#f5ede8 0%,#ede0d8 100%)" : "#fff"};border:${acc ? "2.5px solid #6d2323" : "2.5px solid #c9a8a8"};${acc ? "box-shadow:0 4px 16px rgba(109,35,35,0.25);" : ""}"><div style="font-size:17px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#6d2323;font-family:Poppins,sans-serif;">${lbl}</div><div style="font-size:34px;font-weight:900;color:${acc ? "#6d2323" : "#1a1a1a"};font-family:Poppins,sans-serif;line-height:1.1;">${val || "&mdash;"}</div></div>`).join("")}</div>`;
    const footer = `<div style="margin-top:40px;padding-top:24px;text-align:center;"><div style="font-size:18px;color:#555;margin-bottom:8px;font-family:Poppins,sans-serif;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Certified Correct</div><div style="font-size:24px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;">${certifierName}</div><div style="font-size:20px;color:#444;font-family:Poppins,sans-serif;font-weight:600;margin-top:4px;">${certifierPosition}</div></div>`;
    let bodyHTML = "";
    if (isJO) {
      bodyHTML = `<div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead("EMPLOYEE INFORMATION")}<div style="display:grid;grid-template-columns:1fr 1fr;">${infoCell("Employee Number", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : "&mdash;"}</div>`, true, true)}${infoCell("Name", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.name || "&mdash;"}</div>`, false, true)}${infoCell("Period", `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, false)}${infoCell("Rendered Days", `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${frd(emp.rh) || "&mdash;"}</div>`, false, false)}</div></div><div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead("DEDUCTIONS")}${[["SSS", fc(emp.sss)], ["Pag-IBIG", fc(emp.pagibigFundCont)]].map(([lbl, val]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1.5px solid #ddd;"><span style="font-size:18px;font-weight:700;color:#333;font-family:Poppins,sans-serif;">${lbl}</span><span style="font-size:20px;font-weight:900;color:#111;font-family:Poppins,sans-serif;min-width:140px;text-align:right;">${val || "&mdash;"}</span></div>`).join("")}</div>${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}${footer}`;
    } else {
      const rows = [
        [["Withholding Tax", fc(emp.withholdingTax)], ["GSIS Salary Loan", fc(emp.gsisSalaryLoan)], ["Life & Retirement", fc(emp.personalLifeRetIns)]],
        [["PhilHealth", fc(emp.PhilHealthContribution)], ["GSIS Policy Loan", fc(emp.gsisPolicyLoan)], ["PhilHealth Diff", fc(emp.philhealthDiff)]],
        [["Pag-IBIG", fc(emp.pagibigFundCont)], ["GSIS Housing Loan", fc(emp.gsisHousingLoan)], ["Pag-IBIG 2", fc(emp.pagibig2)]],
        [["SSS", fc(emp.sss)], ["GSIS Arrears", fc(emp.gsisArrears)], ["LBP Loan", fc(emp.lbpLoan)]],
        [["ECC", fc(emp.ecc)], ["GFAL", fc(emp.gfal)], ["MTSLAI", fc(emp.mtslai)]],
        [["To Be Refunded", fc(emp.toBeRefunded)], ["CPL", fc(emp.cpl)], ["ESLAI", fc(emp.eslai)]],
        [["FEU", fc(emp.feu)], ["MPL", fc(emp.mpl)], ["ABS", fcAbs(emp.abs)]],
        [["", ""], ["MPL Lite", fc(emp.mplLite)], ["ELA", fc(emp.ela)]],
      ];
      bodyHTML = `<div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead("EMPLOYEE INFORMATION")}<div style="display:grid;grid-template-columns:1fr 1fr;">${infoCell("Period", `<div style="font-size:21px;font-weight:700;color:#1a1a1a;font-family:Poppins,sans-serif;">${period}</div>`, true, true)}${infoCell("Employee Number", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.employeeNumber ? parseFloat(emp.employeeNumber) : "&mdash;"}</div>`, false, true)}${infoCell("Name", `<div style="font-size:26px;color:#c0392b;font-weight:900;font-family:Poppins,sans-serif;">${emp.name || "&mdash;"}</div>`, false, false, true)}</div></div><div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead("DEDUCTIONS BREAKDOWN")}<div style="display:grid;grid-template-columns:repeat(3,1fr);background:#f5eaea;border-bottom:2px solid #c9a8a8;">${["Government & Tax", "GSIS Loans", "Other Deductions"].map((h, i) => `<div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.06em;text-transform:uppercase;padding:8px 16px;font-family:Poppins,sans-serif;${i < 2 ? "border-right:2px solid #c9a8a8;" : ""}">${h}</div>`).join("")}</div>${rows.map((row, ri) => `<div style="display:grid;grid-template-columns:repeat(3,1fr);background:${ri % 2 === 0 ? "#fdf6f6" : "#fff"};border-bottom:1.5px solid #c9a8a8;">${row.map(([lbl, val], ci) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;${ci < 2 ? "border-right:1.5px solid #c9a8a8;" : ""}min-height:38px;gap:4px;"><span style="font-size:20px;color:#1a1a1a;font-family:Poppins,sans-serif;font-weight:700;flex:1;">${lbl || ""}</span><span style="font-size:20px;font-weight:900;color:${val ? "#6d2323" : "#aaa"};font-family:Poppins,sans-serif;min-width:100px;text-align:right;">${val || "&mdash;"}</span></div>`).join("")}</div>`).join("")}</div>${summaryCards(fc(emp.netSalary), fc(emp.totalDeductions), netPayCalc)}<div style="border:2.5px solid #6d2323;border-radius:6px;margin-bottom:16px;overflow:hidden;">${secHead("PAYMENT BREAKDOWN")}<div style="display:grid;grid-template-columns:1fr 1fr;">${[["1ST QUINCENA", fc(emp.pay1st)], ["2ND QUINCENA", fc(emp.pay2nd)]].map(([lbl, val], i) => `<div style="padding:16px;${i === 0 ? "border-right:2px solid #e0c8c8;" : ""}min-height:70px;"><div style="font-size:18px;font-weight:800;color:#6d2323;letter-spacing:0.1em;text-transform:uppercase;font-family:Poppins,sans-serif;margin-bottom:4px;">${lbl}</div><div style="font-size:26px;font-weight:900;color:#1a1a1a;font-family:Poppins,sans-serif;line-height:1.1;">${val || "&mdash;"}</div></div>`).join("")}</div></div>${footer}`;
    }
    return `<div style="font-family:Poppins,sans-serif;background:#fff;width:1100px;padding:24px 24px 32px;box-sizing:border-box;position:relative;"><div style="position:relative;z-index:1;">${headerHTML}${bodyHTML}</div>${hrisLogoSrc ? `<img data-watermark="1" src="${hrisLogoSrc}" crossorigin="anonymous" style="position:absolute;left:50%;width:70%;opacity:0.08;pointer-events:none;z-index:2;mix-blend-mode:multiply;top:50%;transform:translate(-50%,-50%);"/>` : ""}</div>`;
  };

  const generate3MonthPDF = async (emp) => {
    const s = new Date(emp.startDate);
    const monthsToGet = [0, 1, 2].map((i) => { const d = new Date(s.getFullYear(), s.getMonth() - i, 1); return { month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleString("en-US", { month: "long", year: "numeric" }) }; });
    const records = monthsToGet.map(({ month, year, label }) => ({ label, payroll: allPayroll.find((p) => p.employeeNumber === emp.employeeNumber && new Date(p.startDate).getMonth() === month && new Date(p.startDate).getFullYear() === year) }));
    const containers = records.map((_, i) => { const div = document.createElement("div"); div.style.cssText = `position:absolute;left:${-9999 - i * 1200}px;top:-9999px;width:1100px;background:#fff;`; document.body.appendChild(div); return div; });
    records.forEach(({ payroll, label }, i) => { containers[i].innerHTML = payroll ? buildPayslipHTML(payroll, institutionLogo, hrisLogo) : `<div style="width:1100px;height:1700px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:28px;font-weight:bold;color:#6D2323;font-family:Poppins,sans-serif;">No Data</div><div style="font-size:20px;color:#6D2323;font-family:Poppins,sans-serif;margin-top:8px;">for ${label}</div></div>`; });
    await new Promise((r) => requestAnimationFrame(r));
    containers.forEach((container) => { const root = container.firstElementChild; if (!root) return; const totalH = root.scrollHeight || root.offsetHeight; const wm = root.querySelector('img[data-watermark="1"]'); if (wm) { const wmH = wm.naturalHeight && wm.naturalWidth ? (wm.offsetWidth || 770) * (wm.naturalHeight / wm.naturalWidth) : 400; wm.style.transform = "none"; wm.style.top = `${totalH / 2 - wmH / 2}px`; wm.style.left = `${(1100 - (wm.offsetWidth || 770)) / 2}px`; } });
    const images = await Promise.all(containers.map((container) => { const root = container.firstElementChild || container; const h = root.scrollHeight || root.offsetHeight || 1700; return html2canvas(root, { scale: 1.0, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff", imageTimeout: 15000, windowWidth: 1100, windowHeight: h, height: h, foreignObjectRendering: false }).then((c) => c.toDataURL("image/jpeg", 0.82)); }));
    containers.forEach((c) => document.body.removeChild(c));
    const pdf = new jsPDF("l", "in", "a4");
    const cw = 3.5, ch = 7.1, gap = 0.2;
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const tw = cw * 3 + gap * 2;
    const yo = (ph - ch) / 2;
    const pos = [(pw - tw) / 2, (pw - tw) / 2 + cw + gap, (pw - tw) / 2 + (cw + gap) * 2];
    images.forEach((img, i) => pdf.addImage(img, "JPEG", pos[i], yo, cw, ch));
    return pdf;
  };

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleModalDownload = async () => {
    if (!payslipModal.emp || !verifyIntegrity()) return;
    setModalSending(true);
    try {
      const pdf = await generate3MonthPDF(payslipModal.emp);
      pdf.save(`${getSurname(payslipModal.emp.name)}_${formatPeriod(payslipModal.emp.startDate)}.pdf`);
      try { await axios.post(`${API_BASE_URL}/PayrollReleasedRoute/log-print`, { employeeNumber: payslipModal.emp.employeeNumber }, getAuthHeaders()); } catch (e) { console.error(e); }
      setSnackbar({ open: true, message: "PDF downloaded successfully.", severity: "success" });
    } catch { showError("Download Failed", "Failed to generate PDF. Please try again."); } finally { setModalSending(false); }
  };

  const handleModalSendGmail = async () => {
    if (!payslipModal.emp || !verifyIntegrity()) return;
    setModalSending(true);
    try {
      const emp = payslipModal.emp;
      const pdf = await generate3MonthPDF(emp);
      const filename = `${getSurname(emp.name)}_${formatPeriod(emp.startDate)}.pdf`;
      const blob = pdf.output("blob");
      const fd = new FormData();
      fd.append("pdf", blob, filename); fd.append("name", emp.name); fd.append("employeeNumber", emp.employeeNumber);
      const res = await axios.post(`${API_BASE_URL}/SendPayslipRoute/send-payslip`, fd, { ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" } });
      if (res.data.success) setSnackbar({ open: true, message: "Payslip sent successfully via Gmail.", severity: "success" });
      else showError("Send Failed", res.data.error || "Failed to send payslip.");
    } catch { showError("Send Failed", "An error occurred while sending."); } finally { setModalSending(false); }
  };

  const handleDownload = async () => {
    if (!displayEmployee || !verifyIntegrity()) return;
    setIndivSending(true);
    try {
      const pdf = await generate3MonthPDF(displayEmployee);
      pdf.save(`${getSurname(displayEmployee.name)}_${formatPeriod(displayEmployee.startDate)}.pdf`);
      try { await axios.post(`${API_BASE_URL}/PayrollReleasedRoute/log-print`, { employeeNumber: displayEmployee.employeeNumber }, getAuthHeaders()); } catch (e) { console.error(e); }
      setSnackbar({ open: true, message: "PDF downloaded successfully.", severity: "success" });
    } catch { showError("Download Failed", "Failed to generate PDF. Please try again."); } finally { setIndivSending(false); }
  };

  const handleSendGmail = async () => {
    if (!displayEmployee || !verifyIntegrity()) return;
    setIndivSending(true);
    try {
      const pdf = await generate3MonthPDF(displayEmployee);
      const filename = `${getSurname(displayEmployee.name)}_${formatPeriod(displayEmployee.startDate)}.pdf`;
      const blob = pdf.output("blob");
      const fd = new FormData();
      fd.append("pdf", blob, filename); fd.append("name", displayEmployee.name); fd.append("employeeNumber", displayEmployee.employeeNumber);
      const res = await axios.post(`${API_BASE_URL}/SendPayslipRoute/send-payslip`, fd, { ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" } });
      if (res.data.success) setSnackbar({ open: true, message: "Payslip sent successfully via Gmail.", severity: "success" });
      else showError("Send Failed", res.data.error || "Failed to send payslip.");
    } catch { showError("Send Failed", "An error occurred while sending."); } finally { setIndivSending(false); }
  };

  const sendSelectedPayslips = async () => {
    if (!selectedEmployees.length || !verifyIntegrity()) return;
    showConfirm({
      title: "Confirm Bulk Send",
      message: `Send payslips to ${selectedEmployees.length} employee${selectedEmployees.length !== 1 ? "s" : ""}?\n\nThis will generate and email each payslip via Gmail.`,
      confirmLabel: `Send ${selectedEmployees.length} Payslip${selectedEmployees.length !== 1 ? "s" : ""}`,
      icon: Send,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, loading: true }));
        setSending(true);
        setLoadingMessage("Generating payslips…");
        try {
          const emps = filteredPayroll.filter((e) => selectedEmployees.includes(e.employeeNumber));
          const batchSize = 3;
          const batches = [];
          for (let i = 0; i < emps.length; i += batchSize) batches.push(emps.slice(i, i + batchSize));
          const fd = new FormData();
          const meta = [];
          for (let bi = 0; bi < batches.length; bi++) {
            setLoadingMessage(`Processing batch ${bi + 1}/${batches.length}…`);
            const results = await Promise.all(batches[bi].map(async (emp) => { const pdf = await generate3MonthPDF(emp); return { blob: pdf.output("blob"), emp }; }));
            results.forEach(({ blob, emp }) => { fd.append("pdfs", blob, `${getSurname(emp.name)}_${formatPeriod(emp.startDate)}.pdf`); meta.push({ name: emp.name, employeeNumber: emp.employeeNumber }); });
          }
          fd.append("payslips", JSON.stringify(meta));
          await axios.post(`${API_BASE_URL}/SendPayslipRoute/send-bulk`, fd, { ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" } });
          setSuccessOverlay({ open: true, action: "gmail" });
          setSelectedEmployees([]);
        } catch { showError("Bulk Send Failed", "An error occurred while sending bulk payslips."); } finally { setSending(false); closeConfirm(); }
      },
    });
  };

  // ── Payslip preview renderer ───────────────────────────────────────────────
  const renderPayslipPreview = (emp) => {
    const isJO = (emp.employmentCategory ?? -1) === 0;
    const period = formatDateRange(emp);
    const SecHead = ({ title, icon }) => (
      <Box sx={{ backgroundColor: "#6D2323", color: "white", px: 2, py: 0.8, display: "flex", alignItems: "center", gap: 1.2 }}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: "20px", letterSpacing: "0.07em", fontFamily: '"Poppins",sans-serif' }}>{title}</Typography>
      </Box>
    );
    if (isJO) return (
      <>
        <Box sx={{ border: "2.5px solid #6d2323", borderRadius: "6px", mb: 2, overflow: "hidden" }}>
          <SecHead title="EMPLOYEE INFORMATION" />
          <Grid container>
            {[["EMPLOYEE NUMBER", <Typography sx={{ fontSize: "26px", color: "#c0392b", fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.employeeNumber ? `${parseFloat(emp.employeeNumber)}` : "—"}</Typography>], ["NAME", <Typography sx={{ fontSize: "26px", color: "#c0392b", fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.name || "—"}</Typography>], ["PERIOD", <Typography sx={{ fontSize: "21px", fontWeight: 700, color: "#1a1a1a", fontFamily: '"Poppins",sans-serif' }}>{period}</Typography>], ["RENDERED DAYS", <Typography sx={{ fontSize: "21px", fontWeight: 700, color: "#1a1a1a", fontFamily: '"Poppins",sans-serif' }}>{formatRenderedDays(emp.rh) || "—"}</Typography>]].map(([label, content], i) => (
              <Grid item xs={12} md={6} key={i}>
                <Box sx={{ p: 1.5, borderRight: i % 2 === 0 ? "2px solid #e0c8c8" : "none", borderBottom: i < 2 ? "2px solid #e0c8c8" : "none", minHeight: "60px" }}>
                  <Typography sx={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.06em", color: "#6d2323", mb: 0.5, fontFamily: '"Poppins",sans-serif', textTransform: "uppercase" }}>{label}</Typography>
                  {content}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ border: "2.5px solid #6d2323", borderRadius: "6px", mb: 2, overflow: "hidden" }}>
          <SecHead title="DEDUCTIONS" icon={<RemoveCircleOutlineIcon sx={{ fontSize: 22 }} />} />
          <MoneyCell label="SSS" value={formatCurrency(emp.sss)} />
          <MoneyCell label="Pag-IBIG" value={formatCurrency(emp.pagibigFundCont)} />
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}><SummaryCard label="Net Salary" value={formatCurrency(emp.netSalary)} /><SummaryCard label="Total Deductions" value={formatCurrency(emp.totalDeductions)} /><SummaryCard label="Net Pay" value={computeNetPay(emp)} accent /></Box>
        <Box sx={{ borderTop: "2.5px solid #e0c8c8", mt: 5, pt: 4, textAlign: "center" }}>
          <Typography sx={{ fontSize: "18px", color: "#555", mb: 1.5, fontFamily: '"Poppins",sans-serif', letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Certified Correct</Typography>
          <Typography sx={{ fontSize: "24px", fontWeight: 900, color: "#1a1a1a", fontFamily: '"Poppins",sans-serif' }}>{certifierName}</Typography>
          <Typography sx={{ fontSize: "20px", color: "#444", fontFamily: '"Poppins",sans-serif', fontWeight: 600, mt: 0.5 }}>{certifierPosition}</Typography>
        </Box>
      </>
    );
    return (
      <>
        <Box sx={{ border: "2.5px solid #6d2323", borderRadius: "6px", mb: 2, overflow: "hidden" }}>
          <SecHead title="EMPLOYEE INFORMATION" />
          <Grid container>
            {[["PERIOD", <Typography sx={{ fontSize: "21px", fontWeight: 700, color: "#1a1a1a", fontFamily: '"Poppins",sans-serif' }}>{period}</Typography>], ["EMPLOYEE NUMBER", <Typography sx={{ fontSize: "26px", color: "#c0392b", fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.employeeNumber ? `${parseFloat(emp.employeeNumber)}` : "—"}</Typography>], ["NAME", <Typography sx={{ fontSize: "26px", color: "#c0392b", fontWeight: 900, fontFamily: '"Poppins",sans-serif' }}>{emp.name || "—"}</Typography>]].map(([label, content], i) => (
              <Grid item xs={12} md={i === 2 ? 12 : 6} key={i}>
                <Box sx={{ p: 2, borderRight: i === 0 ? "2px solid #e0c8c8" : "none", borderBottom: i < 2 ? "2px solid #e0c8c8" : "none", minHeight: "70px" }}>
                  <Typography sx={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.06em", color: "#6d2323", mb: 0.5, fontFamily: '"Poppins",sans-serif', textTransform: "uppercase" }}>{label}</Typography>
                  {content}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ border: "2.5px solid #6d2323", borderRadius: "6px", mb: 2, overflow: "hidden" }}>
          <SecHead title="DEDUCTIONS BREAKDOWN" />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", backgroundColor: "#f5eaea", borderBottom: "2px solid #c9a8a8" }}>
            {["Government & Tax", "GSIS Loans", "Other Deductions"].map((h, i) => (
              <Typography key={i} sx={{ fontSize: "18px", fontWeight: 800, color: "#6d2323", letterSpacing: "0.06em", textTransform: "uppercase", px: 2, py: 1, fontFamily: '"Poppins",sans-serif', borderRight: i < 2 ? "2px solid #c9a8a8" : "none" }}>{h}</Typography>
            ))}
          </Box>
          {[[["Withholding Tax", formatCurrency(emp.withholdingTax)], ["GSIS Salary Loan", formatCurrency(emp.gsisSalaryLoan)], ["Life & Retirement", formatCurrency(emp.personalLifeRetIns)]], [["PhilHealth", formatCurrency(emp.PhilHealthContribution)], ["GSIS Policy Loan", formatCurrency(emp.gsisPolicyLoan)], ["PhilHealth Diff", formatCurrency(emp.philhealthDiff)]], [["Pag-IBIG", formatCurrency(emp.pagibigFundCont)], ["GSIS Housing Loan", formatCurrency(emp.gsisHousingLoan)], ["Pag-IBIG 2", formatCurrency(emp.pagibig2)]], [["SSS", formatCurrency(emp.sss)], ["GSIS Arrears", formatCurrency(emp.gsisArrears)], ["LBP Loan", formatCurrency(emp.lbpLoan)]], [["ECC", formatCurrency(emp.ecc)], ["GFAL", formatCurrency(emp.gfal)], ["MTSLAI", formatCurrency(emp.mtslai)]], [["To Be Refunded", formatCurrency(emp.toBeRefunded)], ["CPL", formatCurrency(emp.cpl)], ["ESLAI", formatCurrency(emp.eslai)]], [["FEU", formatCurrency(emp.feu)], ["MPL", formatCurrency(emp.mpl)], ["ABS", formatAbs(emp.abs)]], [["", ""], ["MPL Lite", formatCurrency(emp.mplLite)], ["ELA", formatCurrency(emp.ela)]]].map((row, i) => <DeductionRow key={i} items={row} isEven={i % 2 === 0} />)}
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}><SummaryCard label="Net Salary" value={formatCurrency(emp.netSalary)} /><SummaryCard label="Total Deductions" value={formatCurrency(emp.totalDeductions)} /><SummaryCard label="Net Pay" value={computeNetPay(emp)} accent /></Box>
        <Box sx={{ border: "2.5px solid #6d2323", borderRadius: "6px", mb: 2, overflow: "hidden" }}>
          <SecHead title="PAYMENT BREAKDOWN" />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)" }}>
            {[["1ST QUINCENA", formatCurrency(emp.pay1st)], ["2ND QUINCENA", formatCurrency(emp.pay2nd)]].map(([label, value], i) => (
              <Box key={i} sx={{ p: 2, borderRight: i === 0 ? "2px solid #e0c8c8" : "none", minHeight: "70px" }}>
                <Typography sx={{ fontSize: "18px", fontWeight: 800, color: "#6d2323", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: '"Poppins",sans-serif', mb: 0.5 }}>{label}</Typography>
                <Typography sx={{ fontSize: "26px", fontWeight: 900, color: "#1a1a1a", fontFamily: '"Poppins",sans-serif', lineHeight: 1.1 }}>{value || "—"}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ mt: 0.75, pt: 0.5, pb: 0.5, textAlign: "center" }}>
          <Typography sx={{ fontSize: "16px", color: "#555", mb: 0.5, fontFamily: '"Poppins",sans-serif', letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Certified Correct</Typography>
          <Typography sx={{ fontSize: "22px", fontWeight: 900, color: "#1a1a1a", fontFamily: '"Poppins",sans-serif', lineHeight: 1.05 }}>{certifierName}</Typography>
          <Typography sx={{ fontSize: "18px", color: "#444", fontFamily: '"Poppins",sans-serif', fontWeight: 600, mt: 0.25, lineHeight: 1.05 }}>{certifierPosition}</Typography>
        </Box>
      </>
    );
  };

  const PayslipInstitutionHeader = () => (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, background: "linear-gradient(135deg,#6d2323 0%,#a31d1d 100%)", borderRadius: "6px", p: "20px 28px", boxShadow: "0 4px 20px rgba(109,35,35,0.3)" }}>
      {institutionLogo ? <img src={institutionLogo} alt="Logo" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", marginLeft: 8 }} /> : <Box sx={{ width: 88, height: 88, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", marginLeft: 8, flexShrink: 0 }} />}
      <Box textAlign="center" flex={1} sx={{ color: "white", px: 2 }}>
        <Typography sx={{ fontStyle: "italic", fontSize: "18px", opacity: 0.9, fontFamily: '"Poppins",sans-serif' }}>Republic of the Philippines</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: "22px", lineHeight: 1.4, fontFamily: '"Poppins",sans-serif', letterSpacing: "0.02em", mt: 0.5 }}>{institutionName}</Typography>
        <Typography sx={{ fontSize: "17px", opacity: 0.85, fontFamily: '"Poppins",sans-serif', mt: 0.3 }}>{institutionAddress}</Typography>
      </Box>
      {hrisLogo ? <img src={hrisLogo} alt="HRIS Logo" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }} /> : <Box sx={{ width: 100, height: 100, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />}
    </Box>
  );

  // ── View mode pill toggle ──────────────────────────────────────────────────
  const ViewModePills = () => (
    <Box sx={{ display: "flex", bgcolor: alpha(T.accent, 0.05), border: `1px solid ${T.accentBorder}`, borderRadius: "9px", p: "3px", gap: "3px" }}>
      {[
        { value: "bulk", icon: <Send sx={{ fontSize: 12 }} />, label: "Bulk Send" },
        { value: "individual", icon: <Person sx={{ fontSize: 12 }} />, label: "Individual" },
      ].map(({ value, icon, label }) => (
        <Box key={value} onClick={() => setViewMode(value)} sx={{
          display: "flex", alignItems: "center", gap: 0.6,
          px: 1.75, py: 0.6, borderRadius: "6px", cursor: "pointer",
          fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
          bgcolor: viewMode === value ? T.accent : "transparent",
          color: viewMode === value ? "#fff" : T.muted,
          boxShadow: viewMode === value ? `0 1px 4px ${alpha(T.accent, 0.3)}` : "none",
          "&:hover": viewMode !== value ? { bgcolor: alpha(T.accent, 0.08), color: T.accent } : {},
        }}>
          {icon} {label}
        </Box>
      ))}
    </Box>
  );

  // ── Access guards ──────────────────────────────────────────────────────────
  if (loading || accessLoading) return <Wireframe />;
  if (!accessLoading && hasAccess !== true)
    return <AccessDenied title="Access Denied" message="You do not have permission to access Payslip Distribution." returnPath="/admin-home" returnButtonText="Return to Home" />;

  return (
    <Fade in timeout={400}>
      <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 } }}>
        <LoadingOverlay open={sending} message={loadingMessage || "Processing…"} />
        {successOverlay.open && <SuccessfulOverlay open={successOverlay.open} action={successOverlay.action} onClose={() => setSuccessOverlay({ open: false, action: "" })} showOkButton />}

        <ErrorModal open={errorModal.open} onClose={closeError} title={errorModal.title} message={errorModal.message} icon={errorModal.icon} iconColor={errorModal.iconColor} iconBg={errorModal.iconBg} />
        <ConfirmModal open={confirmModal.open} onClose={closeConfirm} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel} confirmColor={confirmModal.confirmColor} confirmHoverColor={confirmModal.confirmHoverColor} icon={confirmModal.icon} iconColor={confirmModal.iconColor} iconBg={confirmModal.iconBg} loading={confirmModal.loading} />

        {/* ── Page Header (matches ItemTable exactly) ── */}
        <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
          <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)" }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
              <WorkIcon sx={{ fontSize: 32, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Payslip Distribution</Typography>
                <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>Administrative Panel • Generate and distribute employee payslips</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }}>{allPayroll.length} {allPayroll.length === 1 ? "record" : "records"}</Typography>
              </Box>
              <ViewModePills />
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchPayrollData} size="small" sx={{ bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, color: T.accent, width: 34, height: 34, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                  <Refresh sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* ══════════════ BULK VIEW ══════════════ */}
        {viewMode === "bulk" && (
          <Fade in timeout={250}>
            <Grid container spacing={2}>

              {/* LEFT: Filter sidebar — styled as SectionCard matching ItemTable left panel */}
              <Grid item xs={12} lg={3}>
                <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                  <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint }}>
                    <FilterListIcon sx={{ fontSize: 15, color: T.accent }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Filters</Typography>
                  </Box>

                  <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                    {/* Search */}
                    <FormSectionLabel icon={Search}>Search</FormSectionLabel>
                    <Box sx={{ mb: 2.5 }}>
                      <FieldInput fullWidth size="small" placeholder="Name or ID…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 14, color: T.faint }} /></InputAdornment> }} />
                    </Box>

                    {/* Year */}
                    <FormSectionLabel icon={CalendarToday}>Year</FormSectionLabel>
                    <Box sx={{ mb: 2.5 }}>
                      <FieldInput fullWidth size="small" select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                        sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.82rem" } }}>
                        {years.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: "0.82rem" }}>{y}</MenuItem>)}
                      </FieldInput>
                    </Box>

                    {/* Month */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <CalendarToday sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
                        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: alpha(T.accent, 0.45) }}>Month</Typography>
                      </Box>
                      {selectedMonth && (
                        <Box onClick={() => setSelectedMonth("")} sx={{ fontSize: "0.65rem", color: T.accent, cursor: "pointer", fontWeight: 700, "&:hover": { textDecoration: "underline" } }}>Clear</Box>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {months.map((m) => (
                        <Box key={m} onClick={() => setSelectedMonth(m === selectedMonth ? "" : m)} sx={{
                          px: 1.5, py: 0.85, borderRadius: "7px", cursor: "pointer",
                          fontSize: "0.82rem", fontWeight: selectedMonth === m ? 700 : 500,
                          color: selectedMonth === m ? "#fff" : T.text,
                          bgcolor: selectedMonth === m ? T.accent : "transparent",
                          transition: "all 0.12s",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          "&:hover": selectedMonth !== m ? { bgcolor: T.accentFaint, color: T.accent } : {},
                        }}>
                          {m}
                          {selectedMonth === m && (
                            <Box sx={{ fontSize: "0.65rem", bgcolor: "rgba(255,255,255,0.2)", px: 0.75, py: 0.2, borderRadius: "4px", fontWeight: 700 }}>{filteredPayroll.length}</Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </SectionCard>
              </Grid>

              {/* RIGHT: Records table */}
              <Grid item xs={12} lg={9}>
                <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>

                  {/* Toolbar */}
                  <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Send sx={{ fontSize: 15, color: T.accent }} />
                        <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>
                          {selectedMonth ? `${selectedMonth} ${selectedYear}` : "Payroll Records"}
                        </Typography>
                        {selectedMonth && (
                          <Box sx={{ px: 1, py: 0.2, borderRadius: "5px", bgcolor: alpha(T.accent, 0.1), border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent }}>{filteredPayroll.length} employee{filteredPayroll.length !== 1 ? "s" : ""}</Typography>
                          </Box>
                        )}
                      </Box>
                      {selectedEmployees.length > 0 && (
                        <AccentButton variant="contained" size="small"
                          startIcon={<Send sx={{ fontSize: "13px !important" }} />}
                          onClick={sendSelectedPayslips}
                          sx={{ fontSize: "0.78rem", bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark }, boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}` }}>
                          Send {selectedEmployees.length} Payslip{selectedEmployees.length !== 1 ? "s" : ""}
                        </AccentButton>
                      )}
                    </Box>
                  </Box>

                  {/* Records area */}
                  <Box sx={{ flexGrow: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    {!selectedMonth ? (
                      <Box sx={{ py: 10, textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                          <CalendarToday sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>Select a Month</Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>Choose a month from the left panel to load employee records.</Typography>
                      </Box>
                    ) : filteredPayroll.length === 0 ? (
                      <Box sx={{ py: 10, textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                          <Search sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>No Records Found</Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>No employees match your search for {selectedMonth}.</Typography>
                      </Box>
                    ) : (
                      <>
                        {/* Column headers */}
                        <Box sx={{ px: 2, py: 1, display: "grid", gridTemplateColumns: "36px 1fr 160px 110px 110px", gap: 1, alignItems: "center", bgcolor: alpha(T.accent, 0.04), borderBottom: `1px solid ${T.divider}` }}>
                          <Checkbox checked={allSelected} indeterminate={someSelected} onChange={handleSelectAll} size="small" sx={{ p: 0.25, color: T.accent }} />
                          {["Employee Name", "ID Number", "Status", ""].map((col, i) => (
                            <Typography key={i} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>{col}</Typography>
                          ))}
                        </Box>

                        {filteredPayroll.map((emp, idx) => (
                          <Box key={emp.employeeNumber} sx={{
                            px: 2, py: 1.25,
                            display: "grid", gridTemplateColumns: "36px 1fr 160px 110px 110px", gap: 1, alignItems: "center",
                            bgcolor: idx % 2 !== 0 ? T.rowOdd : T.rowEven,
                            borderBottom: `1px solid ${T.divider}`,
                            transition: "background 0.1s",
                            "&:hover": { bgcolor: T.rowHover },
                            "&:last-child": { borderBottom: "none" },
                          }}>
                            <Checkbox checked={selectedEmployees.includes(emp.employeeNumber)} onChange={() => handleSelectOne(emp.employeeNumber)} size="small" sx={{ p: 0.25, color: T.accent }} />
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(T.accent, 0.1), color: T.accent, fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                                {(emp.name?.[0] || "?").toUpperCase()}
                              </Avatar>
                              <Typography noWrap sx={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}>{emp.name}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.75rem", color: T.muted, fontWeight: 500 }}>#{emp.employeeNumber}</Typography>
                            <Box>
                              {emp.startDate ? (
                                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: "7px", py: "3px", borderRadius: "5px", bgcolor: "rgba(46,125,50,0.08)", border: "0.5px solid rgba(46,125,50,0.3)" }}>
                                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#2e7d32" }} />
                                  <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#2e7d32" }}>Ready</Typography>
                                </Box>
                              ) : (
                                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, px: "7px", py: "3px", borderRadius: "5px", bgcolor: "rgba(198,40,40,0.08)", border: "0.5px solid rgba(198,40,40,0.3)" }}>
                                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#c62828" }} />
                                  <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#c62828" }}>No Data</Typography>
                                </Box>
                              )}
                            </Box>
                            <AccentButton size="small" startIcon={<Visibility sx={{ fontSize: "12px !important" }} />} onClick={() => openPayslipModal(emp)}
                              sx={{ fontSize: "0.72rem", px: 1.25, py: 0.4, border: `1px solid ${T.accentBorder}`, color: T.accent, bgcolor: T.accentFaint, "&:hover": { bgcolor: T.accentHover } }}>
                              View
                            </AccentButton>
                          </Box>
                        ))}
                      </>
                    )}
                  </Box>
                </SectionCard>
              </Grid>
            </Grid>
          </Fade>
        )}

        {/* ══════════════ INDIVIDUAL VIEW ══════════════ */}
        {viewMode === "individual" && (
          <Fade in timeout={250}>
            <Grid container spacing={2}>

              {/* LEFT: Search + month selector panel */}
              <Grid item xs={12} lg={3}>
                <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                  <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint }}>
                    <Person sx={{ fontSize: 15, color: T.accent }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Find Employee</Typography>
                  </Box>

                  <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>

                    {/* Employee Autocomplete */}
                    <FormSectionLabel icon={Person}>Employee Search</FormSectionLabel>
                    <Box sx={{ mb: 2 }}>
                      <EmployeeAutocomplete
                        value={indivSearch}
                        onChange={(num) => setIndivSearch(num || "")}
                        selectedEmployee={selectedIndivEmployee}
                        onEmployeeSelect={handleIndivEmployeeSelect}
                        placeholder="Search name or employee ID…"
                      />
                    </Box>

                    {/* Selected employee card */}
                    {selectedIndivEmployee ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: alpha(T.accent, 0.15), fontSize: "0.78rem", color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                          {(selectedIndivEmployee.name?.[0] || "?").toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>{selectedIndivEmployee.name}</Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>#{selectedIndivEmployee.employeeNumber}</Typography>
                        </Box>
                        <IconButton size="small" onClick={handleIndivClear} sx={{ color: T.faint, p: 0.25, "&:hover": { color: T.accent } }}>
                          <Close sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, py: 1.5, mb: 2.5, bgcolor: alpha(T.accent, 0.02) }}>
                        <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontStyle: "italic" }}>No employee selected yet</Typography>
                      </Box>
                    )}

                    {/* Month selector — only shown once an employee is picked */}
                    {indivHasSearched && (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
                          <CalendarToday sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: alpha(T.accent, 0.45) }}>Pay Period</Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {months.map((m) => (
                            <Box key={m} onClick={() => handleIndivMonthSelect(m)} sx={{
                              px: 1.5, py: 0.85, borderRadius: "7px", cursor: "pointer",
                              fontSize: "0.82rem", fontWeight: indivMonth === m ? 700 : 500,
                              color: indivMonth === m ? "#fff" : T.text,
                              bgcolor: indivMonth === m ? T.accent : "transparent",
                              transition: "all 0.12s",
                              "&:hover": indivMonth !== m ? { bgcolor: T.accentFaint, color: T.accent } : {},
                            }}>
                              {m}
                            </Box>
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                </SectionCard>
              </Grid>

              {/* RIGHT: Payslip preview panel */}
              <Grid item xs={12} lg={9}>
                <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>

                  {/* Toolbar */}
                  <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <WorkIcon sx={{ fontSize: 15, color: T.accent }} />
                        <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>Payslip Preview</Typography>
                        {displayEmployee && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: T.faint }} />
                            <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500 }}>{displayEmployee.name}</Typography>
                            {indivMonth && <Box sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: "5px", px: "6px", py: "2px" }}>{indivMonth}</Box>}
                          </Box>
                        )}
                      </Box>
                      {displayEmployee && (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <AccentButton variant="outlined" size="small"
                            startIcon={indivSending ? <CircularProgress size={12} sx={{ color: T.accent }} /> : <Download sx={{ fontSize: "13px !important" }} />}
                            onClick={handleDownload} disabled={indivSending}
                            sx={{ fontSize: "0.78rem", borderColor: T.accentBorder, color: T.accent, "&:hover": { bgcolor: T.accentFaint } }}>
                            {indivSending ? "Generating…" : "Download PDF"}
                          </AccentButton>
                          <AccentButton variant="contained" size="small"
                            startIcon={indivSending ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <Send sx={{ fontSize: "13px !important" }} />}
                            onClick={handleSendGmail} disabled={indivSending}
                            sx={{ fontSize: "0.78rem", bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`, "&:hover": { bgcolor: T.accentDark } }}>
                            {indivSending ? "Sending…" : "Send via Gmail"}
                          </AccentButton>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Content */}
                  <Box sx={{ flexGrow: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    {!selectedIndivEmployee ? (
                      <Box sx={{ py: 10, textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                          <Person sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>Search for an Employee</Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>Select an employee from the dropdown in the left panel.</Typography>
                      </Box>
                    ) : !indivMonth ? (
                      <Box sx={{ py: 10, textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                          <CalendarToday sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>Select a Pay Period</Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>Click a month in the left panel to load the payslip.</Typography>
                      </Box>
                    ) : !displayEmployee ? (
                      <Box sx={{ py: 10, textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                          <Search sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>No Payslip Found</Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>No record for <strong>{indivMonth}</strong> matching your search.</Typography>
                      </Box>
                    ) : (
                      <Fade in timeout={250}>
                        <Box sx={{ bgcolor: "#f4f0f0", p: 2.5, display: "flex", justifyContent: "center" }}>
                          <Paper ref={payslipRef} elevation={2} sx={{ zoom: 0.64, width: "920px", p: 1.5, borderRadius: "8px", bgcolor: "#fff", fontFamily: '"Poppins",sans-serif', position: "relative", boxSizing: "border-box" }}>
                            {hrisLogo && <Box component="img" src={hrisLogo} alt="Watermark" sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.08, width: "70%", pointerEvents: "none", userSelect: "none", zIndex: 2, mixBlendMode: "multiply" }} />}
                            <PayslipInstitutionHeader />
                            <Box sx={{ position: "relative", zIndex: 1 }}>{renderPayslipPreview(displayEmployee)}</Box>
                          </Paper>
                        </Box>
                      </Fade>
                    )}
                  </Box>
                </SectionCard>
              </Grid>
            </Grid>
          </Fade>
        )}

        {/* ── Payslip View Modal (from bulk table) ── */}
        <Modal open={payslipModal.open} onClose={() => !modalSending && setPayslipModal({ open: false, emp: null })}
          sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          <Fade in={payslipModal.open}>
            <Box sx={{ width: "100%", maxWidth: 920, maxHeight: "90vh", borderRadius: 3, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", bgcolor: T.surface, display: "flex", flexDirection: "column" }}>
              {payslipModal.emp && (
                <>
                  {/* Modal header — matches ItemTable modal header style */}
                  <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden", flexShrink: 0 }}>
                    <Box sx={{ position: "absolute", top: -50, right: -30, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <WorkIcon sx={{ fontSize: 18, color: "#fff" }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, mb: 0.3 }}>{payslipModal.emp.name}</Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.68)" }}>
                          #{payslipModal.emp.employeeNumber}{payslipModal.emp.startDate && ` · ${formatDateRange(payslipModal.emp)}`}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton onClick={() => !modalSending && setPayslipModal({ open: false, emp: null })} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
                      <Close sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>

                  {/* Payslip preview */}
                  <Box sx={{ overflowY: "auto", flex: "0 1 auto", minHeight: 0, maxHeight: "68vh", bgcolor: "#f4f0f0", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    <Box sx={{ display: "flex", justifyContent: "center", py: 1.5, px: 1.5 }}>
                      <Box sx={{ zoom: 0.64, width: "920px", bgcolor: "#fff", fontFamily: '"Poppins",sans-serif', position: "relative", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: "8px", p: 1.5, boxSizing: "border-box" }}>
                        {hrisLogo && <Box component="img" src={hrisLogo} alt="Watermark" sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.08, width: "70%", pointerEvents: "none", userSelect: "none", zIndex: 2, mixBlendMode: "multiply" }} />}
                        <PayslipInstitutionHeader />
                        <Box sx={{ position: "relative", zIndex: 1 }}>{renderPayslipPreview(payslipModal.emp)}</Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Modal footer — matches ItemTable modal footer */}
                  <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1.25, flexShrink: 0 }}>
                    <AccentButton variant="outlined"
                      startIcon={modalSending ? <CircularProgress size={13} sx={{ color: T.accent }} /> : <Download sx={{ fontSize: "14px !important" }} />}
                      onClick={handleModalDownload} disabled={modalSending}
                      sx={{ fontSize: "0.8rem", borderColor: T.accentBorder, color: T.accent, "&:hover": { bgcolor: T.accentFaint } }}>
                      {modalSending ? "Generating…" : "Download PDF"}
                    </AccentButton>
                    <AccentButton variant="contained"
                      startIcon={modalSending ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <Send sx={{ fontSize: "14px !important" }} />}
                      onClick={handleModalSendGmail} disabled={modalSending}
                      sx={{ fontSize: "0.8rem", bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>
                      {modalSending ? "Sending…" : "Send via Gmail"}
                    </AccentButton>
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>

        {/* ── Snackbar ── */}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
          <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2, fontSize: "0.82rem" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
});

export default PayslipDistribution;