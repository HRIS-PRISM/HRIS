import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Modal,
  IconButton,
  CircularProgress,
  Card,
  Typography,
  Fade,
  Avatar,
  Tooltip,
  Button,
  TextField,
  Chip,
  List,
  ListItem,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Domain as DomainIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  SupervisorAccount as SupervisorIcon,
  ArrowBack as ArrowBackIcon,
  ManageAccounts as ManageAccountsIcon,
  WorkspacePremium as PremiumIcon,
  Badge as BadgeIcon,
  AccessTime as AccessTimeIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import AccessDenied from "../AccessDenied";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import OfficialTimePeriodPicker from "./OfficialTimePeriodPicker";
import { useSocket } from "../../contexts/SocketContext";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

const getUserRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ? String(payload.role) : null;
  } catch {
    return null;
  }
};

// ── Theme ──────────────────────────────────────────────────────────────────────
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

const titleStylePresets = {
  Dean: {
    color: "#6d2323",
    bg: "rgba(109,35,35,0.08)",
    border: "rgba(109,35,35,0.25)",
  },
  "Department Head": {
    color: "#1B5E20",
    bg: "rgba(27,94,32,0.08)",
    border: "rgba(27,94,32,0.25)",
  },
  Supervisor: {
    color: "#1565C0",
    bg: "rgba(21,101,192,0.08)",
    border: "rgba(21,101,192,0.25)",
  },
  Coordinator: {
    color: "#F57C00",
    bg: "rgba(245,124,0,0.08)",
    border: "rgba(245,124,0,0.25)",
  },
  "Unit Head": {
    color: "#4A148C",
    bg: "rgba(74,20,140,0.08)",
    border: "rgba(74,20,140,0.25)",
  },
  Other: {
    color: "#5f5f5f",
    bg: "rgba(93,64,55,0.08)",
    border: "rgba(93,64,55,0.22)",
  },
};

const defaultTitleStyle = {
  color: "#5D4037",
  bg: "rgba(93,64,55,0.08)",
  border: "rgba(93,64,55,0.22)",
};
const TITLE_SUGGESTIONS = [
  "Supervisor",
  "Department Head",
  "Dean",
  "Coordinator",
  "Unit Head",
  "Other",
];

// Any role that isn't one of the declared, recognized labels is treated as
// "Other" for display/styling purposes (fetched/legacy free-text roles included).
const normalizeTitle = (title) => {
  const raw = (title || "Supervisor").trim() || "Supervisor";
  return TITLE_SUGGESTIONS.includes(raw) ? raw : "Other";
};

// ── Shimmer / Wireframe ────────────────────────────────────────────────────────
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
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      width: w,
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
      {/* Page Header skeleton */}
      <Box
        sx={{
          mb: 2,
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${T.accentBorder}`,
          animation: "blink 2s ease-in-out infinite",
        }}
      >
        <Box
          sx={{
            px: 4,
            py: 3,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
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
                bgcolor: "rgba(109,35,35,0.12)",
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Bone w={260} h={18} sx={{ mb: 1 }} />
              <Bone w={400} h={11} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Bone w={130} h={32} r={24} />
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.1)",
              }}
            />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* LEFT: Assign Form skeleton */}
        <Grid item xs={12} lg={4}>
          <Box
            sx={{
              borderRadius: 2,
              border: `1px solid ${T.accentBorder}`,
              bgcolor: "#fff",
              overflow: "hidden",
              animation: "blink 2s ease-in-out 0s infinite",
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 1.25,
                borderBottom: `1px solid ${T.divider}`,
                bgcolor: T.accentFaint,
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
                  bgcolor: "rgba(109,35,35,0.2)",
                }}
              />
              <Bone w={200} h={13} />
            </Box>
            <Box
              sx={{
                px: 3,
                py: 2.5,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* Role field */}
              <Box>
                <Bone w={60} h={10} sx={{ mb: 0.75 }} />
                <Box
                  sx={{
                    height: 24,
                    borderRadius: 6,
                    bgcolor: "rgba(109,35,35,0.06)",
                    border: `1px solid ${T.accentBorder}`,
                    width: 100,
                  }}
                />
              </Box>
              {/* Department field */}
              <Box>
                <Bone w={90} h={10} sx={{ mb: 0.75 }} />
                <Box
                  sx={{
                    height: 40,
                    borderRadius: 2,
                    border: `1px solid ${T.accentBorder}`,
                    bgcolor: "#fafafa",
                  }}
                />
              </Box>
              {/* Employee field */}
              <Box>
                <Bone w={80} h={10} sx={{ mb: 0.75 }} />
                <Box
                  sx={{
                    height: 40,
                    borderRadius: 2,
                    border: `1px solid ${T.accentBorder}`,
                    bgcolor: "#fafafa",
                  }}
                />
              </Box>
              {/* Assign button */}
              <Box
                sx={{
                  height: 38,
                  borderRadius: 2,
                  bgcolor: "rgba(109,35,35,0.15)",
                  mt: 1,
                }}
              />
              {/* Role info */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${T.divider}`,
                  bgcolor: "#fafafa",
                }}
              >
                <Bone w={40} h={9} sx={{ mb: 1 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 22,
                      borderRadius: 6,
                      bgcolor: "rgba(109,35,35,0.06)",
                      border: `1px solid ${T.accentBorder}`,
                    }}
                  />
                  <Bone w={180} h={10} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* RIGHT: Assignment Records skeleton */}
        <Grid item xs={12} lg={8}>
          <Box
            sx={{
              borderRadius: 2,
              border: `1px solid ${T.accentBorder}`,
              bgcolor: "#fff",
              overflow: "hidden",
              animation: "blink 2s ease-in-out 0.1s infinite",
              height: "calc(100vh - 280px)",
              display: "flex",
              flexDirection: "column",
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 17,
                      height: 17,
                      borderRadius: "50%",
                      bgcolor: "rgba(109,35,35,0.2)",
                    }}
                  />
                  <Bone w={160} h={13} />
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 24,
                      borderRadius: 6,
                      bgcolor: "rgba(109,35,35,0.08)",
                      border: `1px solid ${T.accentBorder}`,
                    }}
                  />
                  <Box
                    sx={{
                      width: 60,
                      height: 28,
                      borderRadius: 2,
                      border: `1px solid ${T.accentBorder}`,
                      bgcolor: "#fff",
                    }}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  height: 40,
                  borderRadius: 2,
                  border: `1px solid ${T.accentBorder}`,
                  bgcolor: "#fff",
                }}
              />
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {/* Fake table header */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 140px 100px",
                  gap: 1,
                  borderRadius: 1.5,
                  bgcolor: "rgba(109,35,35,0.04)",
                }}
              >
                {[90, 70, 60, 50].map((w, i) => (
                  <Bone key={i} w={w} h={9} />
                ))}
              </Box>
              {/* Fake rows */}
              {[...Array(7)].map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    px: 2,
                    py: 1.25,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 140px 100px",
                    gap: 1,
                    alignItems: "center",
                    borderRadius: 1.5,
                    bgcolor: i % 2 === 0 ? "#fff" : "rgba(109,35,35,0.025)",
                    animation: "blink 2s ease-in-out infinite",
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        bgcolor: "rgba(109,35,35,0.1)",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Bone w="70%" h={11} sx={{ mb: 0.5 }} />
                      <Bone w="45%" h={9} />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 13,
                        height: 13,
                        borderRadius: "50%",
                        bgcolor: "rgba(109,35,35,0.1)",
                        flexShrink: 0,
                      }}
                    />
                    <Bone w="60%" h={11} />
                  </Box>
                  <Box
                    sx={{
                      width: 90,
                      height: 22,
                      borderRadius: 6,
                      bgcolor: "rgba(109,35,35,0.06)",
                      border: `1px solid ${T.accentBorder}`,
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: "rgba(109,35,35,0.06)",
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    />
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: "rgba(198,40,40,0.06)",
                        border: "1px solid rgba(198,40,40,0.15)",
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ── Components ─────────────────────────────────────────────────────────────────

const TitleBadge = ({ title }) => {
  // Display the actual saved role text, but style it using the "Other"
  // preset whenever that text isn't one of the declared suggestions.
  const label = (title || "Supervisor").trim() || "Supervisor";
  const cfg = titleStylePresets[normalizeTitle(title)] || defaultTitleStyle;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.3,
        borderRadius: 6,
        bgcolor: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <BadgeIcon sx={{ fontSize: 11, color: cfg.color }} />
      <Typography
        sx={{ fontSize: "0.7rem", fontWeight: 700, color: cfg.color }}
      >
        {label}
      </Typography>
    </Box>
  );
};

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

const scrollbarSx = {
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
};

const getSurname = (name = "") => {
  const p = name.trim().split(/\s+/);
  return p[p.length - 1].toLowerCase();
};
const sortByLastName = (arr) =>
  [...arr].sort((a, b) =>
    getSurname(a.supervisorName || a.name || "").localeCompare(
      getSurname(b.supervisorName || b.name || ""),
    ),
  );

// ── Dept Code Autocomplete ─────────────────────────────────────────────────────
const DeptCodeAutocomplete = ({
  value,
  onChange,
  departmentList = [],
  placeholder = "Type or select department code…",
  disabled = false,
}) => {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = departmentList.filter(
    (d) =>
      d.code.toLowerCase().includes(query.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={ref}>
      <FieldInput
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: (
            <DomainIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />
          ),
          endAdornment: (
            <IconButton
              size="small"
              sx={{ color: T.muted }}
              onClick={() => setOpen((p) => !p)}
              disabled={disabled}
            >
              {open ? (
                <ExpandLessIcon sx={{ fontSize: 15 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          ),
        }}
      />
      {open && !disabled && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1400,
            maxHeight: 220,
            overflow: "auto",
            mt: 0.75,
            borderRadius: 2,
            border: `1px solid ${T.accentBorder}`,
            ...scrollbarSx,
          }}
        >
          {filtered.length > 0 ? (
            <List dense disablePadding>
              {filtered.map((dept) => (
                <ListItem
                  key={dept.code}
                  button
                  onClick={() => {
                    setQuery(dept.code);
                    onChange(dept.code);
                    setOpen(false);
                  }}
                  sx={{
                    py: 0.9,
                    px: 1.5,
                    "&:hover": { bgcolor: T.accentFaint },
                    borderBottom: `1px solid ${T.divider}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 0,
                    }}
                  >
                    <DomainIcon
                      sx={{ fontSize: 14, color: T.accent, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: T.text,
                        }}
                      >
                        {dept.code}
                      </Typography>
                      {dept.description && (
                        <Typography
                          sx={{ fontSize: "0.7rem", color: T.muted }}
                          noWrap
                        >
                          {dept.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography
                sx={{ fontSize: "0.8rem", color: T.faint, fontStyle: "italic" }}
              >
                {query
                  ? `No match for "${query}"`
                  : "No department codes found"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Employee Autocomplete ──────────────────────────────────────────────────────
const EmployeeAutocomplete = ({
  value,
  onChange,
  selectedEmployee,
  onEmployeeSelect,
  placeholder = "Search employee…",
  disabled = false,
}) => {
  const [query, setQuery] = useState("");
  const [employees, setEmps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    if (selectedEmployee) setQuery(selectedEmployee.name || "");
    else if (!value) setQuery("");
  }, [selectedEmployee, value]);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const search = async (q) => {
    setLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`,
        getAuthHeaders(),
      );
      setEmps(r.data);
    } catch {
      setEmps([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search`,
        getAuthHeaders(),
      );
      setEmps(r.data);
    } catch {
      setEmps([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={ref}>
      <FieldInput
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          if (selectedEmployee && v !== selectedEmployee.name) {
            onEmployeeSelect(null);
            onChange("");
          }
          clearTimeout(debRef.current);
          debRef.current = setTimeout(() => {
            if (v.trim().length >= 2) search(v);
            else if (!v.trim()) fetchAll();
            else setEmps([]);
          }, 300);
        }}
        onFocus={() => {
          setOpen(true);
          if (!employees.length && !loading) {
            query.length >= 2 ? search(query) : fetchAll();
          }
        }}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: (
            <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />
          ),
          endAdornment: (
            <IconButton
              size="small"
              sx={{ color: T.muted }}
              onClick={() => {
                if (!open) {
                  setOpen(true);
                  if (!employees.length && !loading) fetchAll();
                } else setOpen(false);
              }}
            >
              {open ? (
                <ExpandLessIcon sx={{ fontSize: 15 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          ),
        }}
      />
      {open && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1400,
            maxHeight: 260,
            overflow: "auto",
            mt: 0.75,
            borderRadius: 2,
            border: `1px solid ${T.accentBorder}`,
            ...scrollbarSx,
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
                gap: 1,
              }}
            >
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography sx={{ fontSize: "0.8rem", color: T.muted }}>
                Loading…
              </Typography>
            </Box>
          ) : employees.length > 0 ? (
            <List dense disablePadding>
              {employees.map((emp) => (
                <ListItem
                  key={emp.employeeNumber}
                  button
                  onClick={() => {
                    onEmployeeSelect(emp);
                    setQuery(emp.name);
                    setOpen(false);
                    onChange(emp.employeeNumber);
                  }}
                  sx={{
                    py: 1,
                    px: 1.5,
                    "&:hover": { bgcolor: T.accentFaint },
                    borderBottom: `1px solid ${T.divider}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: "0.72rem",
                        bgcolor: T.accent,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {emp.name?.charAt(0)?.toUpperCase() || "?"}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                        {emp.name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                        #{emp.employeeNumber}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography
                sx={{ fontSize: "0.8rem", color: T.faint, fontStyle: "italic" }}
              >
                {query.length >= 2
                  ? `No employees found for "${query}"`
                  : "Type to search or browse"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ── Modal Header ───────────────────────────────────────────────────────────────
const ModalHeader = ({ title, subtitle, chips = [], onBack, onClose }) => (
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
      <Avatar
        sx={{
          width: 44,
          height: 44,
          bgcolor: "rgba(255,255,255,0.15)",
          color: "#fff",
        }}
      >
        <SupervisorIcon sx={{ fontSize: 22 }} />
      </Avatar>
      <Box>
        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
          {chips.map((c) => (
            <Chip
              key={c}
              label={c}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.68rem",
                bgcolor: "rgba(255,255,255,0.18)",
                color: "#fff",
                fontWeight: 700,
              }}
            />
          ))}
          {subtitle && (
            <Typography
              sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.68)" }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
    <Box sx={{ display: "flex", gap: 1, position: "relative", zIndex: 1 }}>
      {onBack && (
        <IconButton
          onClick={onBack}
          size="small"
          sx={{
            color: "rgba(255,255,255,0.75)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 17 }} />
        </IconButton>
      )}
      <IconButton
        onClick={onClose}
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
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SupervisorAssignment = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess(
    "supervisor-assignment",
  );
  const userRole = getUserRole();

  const [assignments, setAssignments] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("create");
  const [snackMsg, setSnackMsg] = useState("");

  // Form state
  const [formEmployee, setFormEmployee] = useState(null);
  const [formEmployeeNum, setFormEmployeeNum] = useState("");
  const [formDepartmentCode, setFormDepartmentCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  // The free-text Title field is only editable once the "Other" chip has
  // been explicitly selected — otherwise the title comes from a suggestion.
  const [isOtherTitle, setIsOtherTitle] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPeriodPickerOpen, setEditPeriodPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Archive state
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivedAssignments, setArchivedAssignments] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAssignments(), fetchDepartmentList()]);
      setPageLoading(false);
    };
    init();
  }, []);

  // Auto-dismiss the error/snack banner a few seconds after it appears.
  // Any new message resets the timer (cleanup cancels the previous one).
  useEffect(() => {
    if (!snackMsg) return;
    const timer = setTimeout(() => setSnackMsg(""), 4000);
    return () => clearTimeout(timer);
  }, [snackMsg]);

  const fetchAssignments = async () => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/supervisor-assignment`,
        getAuthHeaders(),
      );
      setAssignments(Array.isArray(r.data) ? r.data : []);
    } catch {
      setSnackMsg("Failed to load supervisor assignments.");
    }
  };

  const fetchDepartmentList = async () => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/department-table`,
        getAuthHeaders(),
      );
      setDepartmentList(Array.isArray(r.data) ? r.data : []);
    } catch {
      /* silent */
    }
  };

  const fetchArchivedAssignments = async () => {
    setArchiveLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/supervisor-assignment/archived`,
        getAuthHeaders(),
      );
      setArchivedAssignments(Array.isArray(r.data) ? r.data : []);
    } catch {
      setArchivedAssignments([]);
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleOpenArchive = () => {
    setArchiveOpen(true);
    fetchArchivedAssignments();
  };

  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected) return;

    const handleSupervisorAssignmentChanged = () => {
      fetchAssignments();
      if (archiveOpen) fetchArchivedAssignments();
    };

    socket.on("supervisorAssignmentChanged", handleSupervisorAssignmentChanged);
    return () => {
      socket.off(
        "supervisorAssignmentChanged",
        handleSupervisorAssignmentChanged,
      );
    };
  }, [socket, connected, archiveOpen]);
  // Select a title suggestion chip. Choosing "Other" clears the field and
  // unlocks it for free-text entry; choosing any other suggestion sets the
  // title directly and re-locks the field.
  const handleTitleSuggestionSelect = (suggestion) => {
    if (suggestion === "Other") {
      setIsOtherTitle(true);
      setFormTitle("");
    } else {
      setIsOtherTitle(false);
      setFormTitle(suggestion);
    }
  };

  const handleAssign = async () => {
    if (!formEmployee || !formDepartmentCode) {
      setSnackMsg("Please select both an employee and a department code.");
      return;
    }

    if (!formStartDate || !formEndDate) {
      setSnackMsg("Please select the official start and end time.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/supervisor-assignment`,
        {
          supervisorEmployeeNumber: formEmployee.employeeNumber,
          departmentCode: formDepartmentCode,
          role: formTitle.trim() || "Supervisor",
          start: formStartDate,
          end: formEndDate,
        },
        getAuthHeaders(),
      );
      setFormEmployee(null);
      setFormEmployeeNum("");
      setFormDepartmentCode("");
      setFormTitle("");
      setIsOtherTitle(false);
      setFormStartDate("");
      setFormEndDate("");
      setSuccessAction("create");
      setSuccessOpen(true);
      fetchAssignments();
    } catch (e) {
      setSnackMsg(e.response?.data?.error || "Failed to assign supervisor.");
    } finally {
      setLoading(false);
    }
  };

  // Updates Title, Start, and End together for the selected assignment.
  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return;

    if (!editStart || !editEnd) {
      setSnackMsg("Please select both a start and end time.");
      return;
    }
    if (new Date(editStart) >= new Date(editEnd)) {
      setSnackMsg("Start time must be before end time.");
      return;
    }

    setLoading(true);
    try {
      const r = await axios.put(
        `${API_BASE_URL}/api/supervisor-assignment/${selectedAssignment.id}`,
        {
          role: editTitle.trim() || "Supervisor",
          start: editStart,
          end: editEnd,
        },
        getAuthHeaders(),
      );
      setSuccessAction("edit");
      setSuccessOpen(true);
      setIsEditing(false);
      fetchAssignments();
      setSelectedAssignment((p) => (p ? { ...p, ...r.data } : p));
    } catch (e) {
      setSnackMsg(e.response?.data?.error || "Failed to update assignment.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await axios.delete(
        `${API_BASE_URL}/api/supervisor-assignment/${id}`,
        getAuthHeaders(),
      );
      setSuccessAction("delete");
      setSuccessOpen(true);
      setDeleteConfirmId(null);
      setModalOpen(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch {
      setSnackMsg("Failed to remove assignment.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (assignment) => {
    setSelectedAssignment(assignment);
    setEditTitle(assignment.role || "");
    setEditStart(assignment.start || "");
    setEditEnd(assignment.end || "");
    setIsEditing(false);
    setModalOpen(true);
  };

  if (accessLoading || pageLoading) return <Wireframe />;

  const isTechAdmin = ["superadmin", "technical", "administrator"].includes(
    userRole,
  );
  const hasPermission = isTechAdmin || hasAccess === true;

  if (hasPermission === false)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Supervisor Assignment. Contact your HR administrator if you believe this is an error."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

  const filtered = assignments.filter((a) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      (a.supervisorName || "").toLowerCase().includes(term) ||
      (a.supervisorEmployeeNumber || "").toLowerCase().includes(term) ||
      (a.departmentCode || "").toLowerCase().includes(term) ||
      (a.departmentDescription || "").toLowerCase().includes(term) ||
      (a.role || "").toLowerCase().includes(term)
    );
  });

  const deptObj = departmentList.find((d) => d.code === formDepartmentCode);

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
          left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        {/* Page Header */}
        <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
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
                  "radial-gradient(circle, rgba(109,35,35,0.12) 0%, transparent 70%)",
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
                background:
                  "radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)",
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
              <ManageAccountsIcon sx={{ fontSize: 32, color: T.accent }} />
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
                  Supervisor Assignment Management
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: T.accentMid,
                    fontWeight: 700,
                    opacity: 0.9,
                  }}
                >
                  Administrative Panel • Assign Deans, Department Heads, and
                  Supervisors to departments
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
                  sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }}
                >
                  {assignments.length}{" "}
                  {assignments.length === 1 ? "assignment" : "assignments"}
                </Typography>
              </Box>
              <Tooltip title="View Archive">
                <IconButton
                  onClick={handleOpenArchive}
                  sx={{
                    bgcolor: alpha(T.accent, 0.08),
                    color: T.accent,
                    width: 36,
                    height: 36,
                    "&:hover": { bgcolor: alpha(T.accent, 0.15) },
                  }}
                >
                  <ArchiveIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => {
                    fetchAssignments();
                    fetchDepartmentList();
                  }}
                  sx={{
                    bgcolor: alpha(T.accent, 0.08),
                    color: T.accent,
                    width: 36,
                    height: 36,
                    "&:hover": { bgcolor: alpha(T.accent, 0.15) },
                  }}
                >
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        <Grid container spacing={2}>
          {/* LEFT: Assign Form */}
          <Grid item xs={12} lg={4}>
            <SectionCard sx={{ display: "flex", flexDirection: "column" }}>
              <Box
                sx={{
                  px: 3,
                  py: 1.25,
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
                  Assign Department Supervisor
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {/* Title (display only — not login role) */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Title{" "}
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.68rem",
                        color: T.muted,
                        fontWeight: 500,
                      }}
                    >
                      (optional label)
                    </Typography>
                  </Typography>
                  <FieldInput
                    size="small"
                    fullWidth
                    placeholder={
                      isOtherTitle
                        ? "Enter a custom title…"
                        : "Select 'Other' below to type a custom title"
                    }
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    disabled={!isOtherTitle}
                  />
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}
                  >
                    {TITLE_SUGGESTIONS.map((suggestion) => {
                      const isSelected =
                        suggestion === "Other"
                          ? isOtherTitle
                          : !isOtherTitle && formTitle === suggestion;
                      return (
                        <Chip
                          key={suggestion}
                          label={suggestion}
                          size="small"
                          onClick={() =>
                            handleTitleSuggestionSelect(suggestion)
                          }
                          sx={{
                            height: 24,
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            bgcolor: isSelected ? T.accentFaint : "#fafafa",
                            border: `1px solid ${isSelected ? T.accentBorder : T.divider}`,
                            color: isSelected ? T.accent : T.muted,
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>

                {/* Department */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Department{" "}
                    <Box component="span" sx={{ color: "#c62828" }}>
                      *
                    </Box>
                  </Typography>
                  <DeptCodeAutocomplete
                    value={formDepartmentCode}
                    onChange={setFormDepartmentCode}
                    departmentList={departmentList}
                  />
                  {deptObj?.description && (
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: T.muted,
                        mt: 0.5,
                        ml: 0.5,
                      }}
                    >
                      {deptObj.description}
                    </Typography>
                  )}
                </Box>

                {/* Employee */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Employee{" "}
                    <Box component="span" sx={{ color: "#c62828" }}>
                      *
                    </Box>
                  </Typography>
                  <EmployeeAutocomplete
                    value={formEmployeeNum}
                    onChange={setFormEmployeeNum}
                    selectedEmployee={formEmployee}
                    onEmployeeSelect={setFormEmployee}
                    placeholder="Search employee to assign…"
                  />
                  {formEmployee && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mt: 1,
                        p: "10px 12px",
                        borderRadius: 2,
                        border: `1px solid ${alpha(T.accent, 0.25)}`,
                        bgcolor: T.accentFaint,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: T.accent,
                          color: "#fff",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {formEmployee.name?.charAt(0)?.toUpperCase() || "?"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          noWrap
                          sx={{
                            fontSize: "0.83rem",
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {formEmployee.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>
                          #{formEmployee.employeeNumber}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFormEmployee(null);
                          setFormEmployeeNum("");
                        }}
                        sx={{ color: "#c62828", width: 22, height: 22 }}
                      >
                        <Close sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.accent,
                      mb: 0.75,
                    }}
                  >
                    Official Time Period
                    <Box component="span" sx={{ color: "#c62828" }}>
                      *
                    </Box>
                  </Typography>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setPeriodPickerOpen(true)}
                    startIcon={<AccessTimeIcon />}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      borderRadius: 2,
                      borderColor: T.accentBorder,
                      color: formStartDate && formEndDate ? T.text : T.muted,
                      minHeight: 42,
                      "&:hover": {
                        borderColor: T.accent,
                      },
                    }}
                  >
                    {formStartDate && formEndDate
                      ? `${new Date(formStartDate).toLocaleString()} — ${new Date(formEndDate).toLocaleString()}`
                      : "Select official time period"}
                  </Button>

                  <OfficialTimePeriodPicker
                    open={periodPickerOpen}
                    onClose={() => setPeriodPickerOpen(false)}
                    startValue={formStartDate}
                    endValue={formEndDate}
                    onConfirm={({ start, end }) => {
                      setFormStartDate(start);
                      setFormEndDate(end);
                      setPeriodPickerOpen(false);
                    }}
                  />
                </Box>
                {snackMsg && (
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderRadius: 2,
                      bgcolor: "#FFEBEE",
                      border: "1px solid rgba(198,40,40,0.25)",
                    }}
                  >
                    <Typography sx={{ fontSize: "0.78rem", color: "#C62828" }}>
                      {snackMsg}
                    </Typography>
                  </Box>
                )}

                <AccentButton
                  onClick={handleAssign}
                  variant="contained"
                  startIcon={
                    loading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <AddIcon sx={{ fontSize: "16px !important" }} />
                    )
                  }
                  fullWidth
                  disabled={loading || !formEmployee || !formDepartmentCode}
                  sx={{
                    height: 38,
                    bgcolor: T.accent,
                    color: "#fff",
                    boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                    "&:hover": { bgcolor: T.accentDark },
                    "&:disabled": {
                      bgcolor: `${alpha(T.accent, 0.35)} !important`,
                      color: "#fff !important",
                    },
                  }}
                >
                  {loading ? "Assigning…" : "Assign"}
                </AccentButton>

                <Typography
                  sx={{ fontSize: "0.72rem", color: T.muted, lineHeight: 1.5 }}
                >
                  Assigned employees can approve leave requests for staff in the
                  selected department. Title is for display only and does not
                  change login role.
                </Typography>
              </Box>
            </SectionCard>
          </Grid>

          {/* RIGHT: Assignment Records */}
          <Grid item xs={12} lg={8}>
            <SectionCard
              sx={{
                height: "calc(100vh - 280px)",
                display: "flex",
                flexDirection: "column",
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <SupervisorIcon sx={{ fontSize: 17, color: T.accent }} />
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: T.text,
                      }}
                    >
                      Supervisor Records
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.4,
                        borderRadius: 6,
                        bgcolor: alpha(T.accent, 0.08),
                        border: `1px solid ${alpha(T.accent, 0.15)}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: T.accent,
                          fontWeight: 700,
                        }}
                      >
                        {filtered.length} record
                        {filtered.length !== 1 ? "s" : ""}
                      </Typography>
                    </Box>
                    <ToggleButtonGroup
                      value={viewMode}
                      exclusive
                      onChange={(_, v) => v && setViewMode(v)}
                      size="small"
                      sx={{
                        "& .MuiToggleButton-root": {
                          px: 1,
                          py: 0.35,
                          border: `1px solid ${T.accentBorder}`,
                          color: T.muted,
                          "&.Mui-selected": {
                            bgcolor: T.accentFaint,
                            color: T.accent,
                          },
                        },
                      }}
                    >
                      <ToggleButton value="grid">
                        <ViewModuleIcon sx={{ fontSize: 14 }} />
                      </ToggleButton>
                      <ToggleButton value="list">
                        <ViewListIcon sx={{ fontSize: 14 }} />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>
                <FieldInput
                  size="small"
                  placeholder="Search by name, employee ID, department, or title…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <SearchIcon
                        sx={{ fontSize: 15, color: T.muted, mr: 0.5 }}
                      />
                    ),
                  }}
                />
              </Box>

              <Box
                sx={{ flexGrow: 1, overflowY: "auto", p: 2, ...scrollbarSx }}
              >
                {filtered.length === 0 ? (
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
                      <SupervisorIcon
                        sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: T.muted,
                        mb: 0.5,
                      }}
                    >
                      {assignments.length === 0
                        ? "No supervisors assigned yet"
                        : "No records match your search"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                      {assignments.length === 0
                        ? "Use the form on the left to assign."
                        : "Try a different search term."}
                    </Typography>
                  </Box>
                ) : viewMode === "grid" ? (
                  <Grid container spacing={1.5}>
                    {filtered.map((a) => {
                      const roleCfg =
                        titleStylePresets[normalizeTitle(a.role)] ||
                        defaultTitleStyle;
                      return (
                        <Grid item xs={6} sm={4} md={3} key={a.id}>
                          <Box
                            onClick={() => handleOpenModal(a)}
                            sx={{
                              p: "12px 14px",
                              borderRadius: 2,
                              cursor: "pointer",
                              bgcolor: "#fff",
                              border: `1px solid ${T.accentBorder}`,
                              transition: "all 0.15s ease",
                              "&:hover": {
                                bgcolor: T.rowHover,
                                borderColor: T.accent,
                                transform: "translateY(-2px)",
                                boxShadow: `0 4px 16px ${alpha(T.accent, 0.12)}`,
                              },
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.75,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 30,
                                  height: 30,
                                  bgcolor: roleCfg.bg,
                                  color: roleCfg.color,
                                  border: `1px solid ${roleCfg.border}`,
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                }}
                              >
                                {(a.supervisorName || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </Avatar>
                              <TitleBadge title={a.role} />
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  color: T.text,
                                  lineHeight: 1.2,
                                }}
                                noWrap
                              >
                                {a.supervisorName ||
                                  `#${a.supervisorEmployeeNumber}`}
                              </Typography>
                              <Typography
                                sx={{ fontSize: "0.7rem", color: T.muted }}
                              >
                                #{a.supervisorEmployeeNumber}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1,
                                py: 0.35,
                                borderRadius: 1,
                                bgcolor: T.accentFaint,
                                border: `0.5px solid ${T.accentBorder}`,
                              }}
                            >
                              <DomainIcon
                                sx={{ fontSize: 11, color: T.accent }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: T.accent,
                                }}
                              >
                                {a.departmentCode}
                              </Typography>
                              {a.departmentDescription && (
                                <Typography
                                  sx={{ fontSize: "0.68rem", color: T.muted }}
                                  noWrap
                                >
                                  · {a.departmentDescription}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                ) : (
                  <>
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 130px 140px 120px 120px",
                        gap: 1,
                        alignItems: "center",
                        bgcolor: alpha(T.accent, 0.04),
                        borderRadius: 1.5,
                        mb: 1,
                      }}
                    >
                      {[
                        "Supervisor",
                        "Department",
                        "Role",
                        "Period Start",
                        "Period End",
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
                    {filtered.map((a, i) => (
                      <Box
                        key={a.id}
                        sx={{
                          px: 2,
                          py: 1.25,
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr 130px 140px 120px 120px",
                          gap: 1,
                          alignItems: "center",
                          borderRadius: 1.5,
                          bgcolor: i % 2 === 0 ? T.rowEven : T.rowOdd,
                          border: "1px solid transparent",
                          "&:hover": { bgcolor: T.rowHover },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            minWidth: 0,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 26,
                              height: 26,
                              bgcolor: alpha(T.accent, 0.12),
                              color: T.accent,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(a.supervisorName || "?").charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                color: T.text,
                              }}
                              noWrap
                            >
                              {a.supervisorName ||
                                `Employee #${a.supervisorEmployeeNumber}`}
                            </Typography>
                            <Typography
                              sx={{ fontSize: "0.7rem", color: T.muted }}
                            >
                              #{a.supervisorEmployeeNumber}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            minWidth: 0,
                          }}
                        >
                          <DomainIcon
                            sx={{ fontSize: 13, color: T.muted, flexShrink: 0 }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: T.text,
                              }}
                              noWrap
                            >
                              {a.departmentCode}
                            </Typography>
                            {a.departmentDescription && (
                              <Typography
                                sx={{ fontSize: "0.68rem", color: T.muted }}
                                noWrap
                              >
                                {a.departmentDescription}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <TitleBadge title={a.role} />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            minWidth: 0,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                color: T.text,
                                textAlign: "center",
                              }}
                              noWrap
                            >
                              {a.start || `-`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            minWidth: 0,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                color: T.text,
                                textAlign: "center",
                              }}
                              noWrap
                            >
                              {a.end || `-`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.75 }}>
                          <Tooltip title="View / Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenModal(a)}
                              sx={{
                                width: 28,
                                height: 28,
                                color: T.accent,
                                border: `1px solid ${T.accentBorder}`,
                                "&:hover": { bgcolor: T.accentFaint },
                              }}
                            >
                              <EditIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteConfirmId(a.id)}
                              sx={{
                                width: 28,
                                height: 28,
                                color: "#c62828",
                                border: "1px solid rgba(198,40,40,0.2)",
                                "&:hover": { bgcolor: "rgba(198,40,40,0.06)" },
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                  </>
                )}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* Detail Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Fade in={modalOpen}>
            <Box
              sx={{
                width: "95%",
                maxWidth: 520,
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                outline: "none",
                bgcolor: T.surface,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {selectedAssignment && (
                <>
                  <ModalHeader
                    title={
                      selectedAssignment.supervisorName ||
                      `Employee #${selectedAssignment.supervisorEmployeeNumber}`
                    }
                    chips={[selectedAssignment.departmentCode]}
                    subtitle={selectedAssignment.departmentDescription}
                    onClose={() => setModalOpen(false)}
                  />
                  <Box
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Box
                        sx={{
                          flex: 1,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: T.accentFaint,
                          border: `1px solid ${T.accentBorder}`,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "0.7rem", color: T.muted, mb: 0.5 }}
                        >
                          Employee
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {selectedAssignment.supervisorName || "—"}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.72rem", color: T.muted }}
                        >
                          #{selectedAssignment.supervisorEmployeeNumber}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: T.accentFaint,
                          border: `1px solid ${T.accentBorder}`,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "0.7rem", color: T.muted, mb: 0.5 }}
                        >
                          Department
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {selectedAssignment.departmentCode}
                        </Typography>
                        {selectedAssignment.departmentDescription && (
                          <Typography
                            sx={{ fontSize: "0.72rem", color: T.muted }}
                          >
                            {selectedAssignment.departmentDescription}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 0.75,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: T.accent,
                          }}
                        >
                          Title &amp; Official Time Period
                        </Typography>
                        {!isEditing && (
                          <AccentButton
                            onClick={() => setIsEditing(true)}
                            variant="text"
                            size="small"
                            startIcon={
                              <EditIcon sx={{ fontSize: "14px !important" }} />
                            }
                            sx={{
                              fontSize: "0.72rem",
                              color: T.accent,
                              minWidth: 0,
                              p: 0,
                              "&:hover": {
                                bgcolor: "transparent",
                                transform: "none",
                              },
                            }}
                          >
                            Edit
                          </AccentButton>
                        )}
                      </Box>
                      {isEditing ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                          }}
                        >
                          <FieldInput
                            size="small"
                            fullWidth
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Enter title…"
                          />

                          <Box>
                            <Typography
                              sx={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: T.accent,
                                mb: 0.5,
                              }}
                            >
                              Official Time Period
                            </Typography>
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => setEditPeriodPickerOpen(true)}
                              startIcon={<AccessTimeIcon />}
                              sx={{
                                justifyContent: "flex-start",
                                textTransform: "none",
                                borderRadius: 2,
                                borderColor: T.accentBorder,
                                color: editStart && editEnd ? T.text : T.muted,
                                minHeight: 42,
                                "&:hover": { borderColor: T.accent },
                              }}
                            >
                              {editStart && editEnd
                                ? `${new Date(editStart).toLocaleString()} — ${new Date(editEnd).toLocaleString()}`
                                : "Select official time period"}
                            </Button>

                            <OfficialTimePeriodPicker
                              open={editPeriodPickerOpen}
                              onClose={() => setEditPeriodPickerOpen(false)}
                              startValue={editStart}
                              endValue={editEnd}
                              onConfirm={({ start, end }) => {
                                setEditStart(start);
                                setEditEnd(end);
                                setEditPeriodPickerOpen(false);
                              }}
                            />
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <AccentButton
                              onClick={() => {
                                setIsEditing(false);
                                setEditTitle(selectedAssignment.role || "");
                                setEditStart(selectedAssignment.start || "");
                                setEditEnd(selectedAssignment.end || "");
                              }}
                              variant="outlined"
                              size="small"
                              sx={{
                                fontSize: "0.75rem",
                                borderColor: T.accentBorder,
                                color: T.muted,
                                "&:hover": { transform: "none" },
                              }}
                            >
                              Cancel
                            </AccentButton>
                            <AccentButton
                              onClick={handleUpdateAssignment}
                              variant="contained"
                              size="small"
                              disabled={loading}
                              startIcon={
                                <SaveIcon
                                  sx={{ fontSize: "14px !important" }}
                                />
                              }
                              sx={{
                                fontSize: "0.75rem",
                                bgcolor: T.accent,
                                color: "#fff",
                                "&:hover": { bgcolor: T.accentDark },
                              }}
                            >
                              Save
                            </AccentButton>
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <TitleBadge title={selectedAssignment.role} />
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: T.muted,
                              mt: 1,
                            }}
                          >
                            {selectedAssignment.start
                              ? new Date(selectedAssignment.start).toLocaleString()
                              : "-"}
                            {" — "}
                            {selectedAssignment.end
                              ? new Date(selectedAssignment.end).toLocaleString()
                              : "-"}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderTop: `1px solid ${T.divider}`,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <AccentButton
                      onClick={() => setDeleteConfirmId(selectedAssignment.id)}
                      variant="outlined"
                      startIcon={
                        <DeleteIcon sx={{ fontSize: "14px !important" }} />
                      }
                      sx={{
                        fontSize: "0.8rem",
                        borderColor: "#e57373",
                        color: "#c62828",
                        "&:hover": {
                          bgcolor: "rgba(198,40,40,0.06)",
                          borderColor: "#c62828",
                          transform: "none",
                        },
                      }}
                    >
                      Remove
                    </AccentButton>
                    <AccentButton
                      onClick={() => setModalOpen(false)}
                      variant="contained"
                      startIcon={
                        <CancelIcon sx={{ fontSize: "14px !important" }} />
                      }
                      sx={{
                        fontSize: "0.8rem",
                        bgcolor: T.muted,
                        color: "#fff",
                        "&:hover": { bgcolor: "#555" },
                      }}
                    >
                      Close
                    </AccentButton>
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>

        {/* Delete Confirm */}
        <Modal
          open={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Fade in={!!deleteConfirmId}>
            <Box
              sx={{
                width: "100%",
                maxWidth: 400,
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: T.surface,
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  background: "linear-gradient(180deg,#c62828 0%,#d32f2f 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}
                >
                  Confirm Removal
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setDeleteConfirmId(null)}
                  sx={{ color: "rgba(255,255,255,0.75)" }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box sx={{ px: 3, py: 3 }}>
                <Typography
                  sx={{ fontSize: "0.88rem", color: T.text, lineHeight: 1.65 }}
                >
                  Are you sure you want to remove this supervisor assignment?
                  This action cannot be undone.
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderTop: `1px solid ${T.divider}`,
                  bgcolor: "#f9f9f9",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                }}
              >
                <AccentButton
                  onClick={() => setDeleteConfirmId(null)}
                  variant="outlined"
                  sx={{
                    fontSize: "0.8rem",
                    borderColor: T.accentBorder,
                    color: T.muted,
                    "&:hover": { transform: "none" },
                  }}
                >
                  Cancel
                </AccentButton>
                <AccentButton
                  onClick={() => handleDelete(deleteConfirmId)}
                  variant="contained"
                  disabled={loading}
                  sx={{
                    fontSize: "0.8rem",
                    bgcolor: "#c62828",
                    color: "#fff",
                    "&:hover": { bgcolor: "#b71c1c" },
                    "&:disabled": { bgcolor: "#ddd" },
                  }}
                >
                  {loading ? "Removing…" : "Remove"}
                </AccentButton>
              </Box>
            </Box>
          </Fade>
        </Modal>

        {/* Archive Modal */}
        <Modal
          open={archiveOpen}
          onClose={() => setArchiveOpen(false)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Fade in={archiveOpen}>
            <Box
              sx={{
                width: "95%",
                maxWidth: 640,
                maxHeight: "85vh",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                outline: "none",
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
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}
                  >
                    <ArchiveIcon sx={{ fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      Archived Assignments
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: "rgba(255,255,255,0.68)",
                      }}
                    >
                      {archivedAssignments.length} expired{" "}
                      {archivedAssignments.length === 1 ? "record" : "records"}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setArchiveOpen(false)}
                  size="small"
                  sx={{
                    color: "rgba(255,255,255,0.75)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                  }}
                >
                  <Close sx={{ fontSize: 17 }} />
                </IconButton>
              </Box>

              <Box
                sx={{ flexGrow: 1, overflowY: "auto", p: 2, ...scrollbarSx }}
              >
                {archiveLoading ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 6,
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={18} sx={{ color: T.accent }} />
                    <Typography sx={{ fontSize: "0.82rem", color: T.muted }}>
                      Loading archive…
                    </Typography>
                  </Box>
                ) : archivedAssignments.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
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
                      <ArchiveIcon
                        sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: T.muted,
                      }}
                    >
                      No archived assignments
                    </Typography>
                    <Typography
                      sx={{ fontSize: "0.76rem", color: T.faint, mt: 0.5 }}
                    >
                      Expired supervisor assignments will appear here.
                    </Typography>
                  </Box>
                ) : (
                  archivedAssignments.map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        px: 2,
                        py: 1.5,
                        mb: 1,
                        borderRadius: 2,
                        border: `1px solid ${T.divider}`,
                        bgcolor: "#fafafa",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: T.text,
                            minWidth: 0,
                          }}
                          noWrap
                        >
                          {a.supervisorName ||
                            `Employee #${a.supervisorEmployeeNumber}`}{" "}
                          ({a.supervisorEmployeeNumber})
                        </Typography>
                        <Chip
                          label="Period Already Ended"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            flexShrink: 0,
                            bgcolor: "#ffebee",
                            color: "#c62828",
                            border: "1px solid rgba(198,40,40,0.25)",
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{ fontSize: "0.75rem", color: T.muted, mt: 0.5 }}
                      >
                        {a.departmentCode}
                        {a.departmentDescription
                          ? ` (${a.departmentDescription})`
                          : ""}{" "}
                        · {a.start ? new Date(a.start).toLocaleString() : "-"} -{" "}
                        {a.end ? new Date(a.end).toLocaleString() : "-"}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </Fade>
        </Modal>

        <LoadingOverlay open={loading} message="Processing…" />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />
      </Box>
    </Fade>
  );
};

export default SupervisorAssignment;