import API_BASE_URL from "../apiConfig";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useDeferredValue,
} from "react";
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
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Fade,
  Divider,
  styled,
  alpha,
  Avatar,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  ListSubheader,
  ListItemIcon,
  TablePagination,
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
  Category as CategoryIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh,
  Work as WorkIcon,
  Circle,
} from "@mui/icons-material";
import ReorderIcon from "@mui/icons-material/Reorder";
import LoadingOverlay from "./LoadingOverlay";
import SuccessfulOverlay from "./SuccessfulOverlay";
import { useSystemSettings } from "../hooks/useSystemSettings";

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKeyframes = `
@keyframes ecmShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes ecmPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
`;

const EcmShim = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  sx = {},
}) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: `${borderRadius}px`,
      flexShrink: 0,
      background:
        "linear-gradient(90deg,rgba(137,68,68,0.08) 25%,rgba(137,68,68,0.20) 50%,rgba(137,68,68,0.08) 75%)",
      backgroundSize: "800px 100%",
      animation: "ecmShimmer 1.5s infinite linear",
      ...sx,
    }}
  />
);

// ─── System settings hook (inline, same pattern as BulkRegister) ──────────────
const useLocalSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem("systemSettings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return {
      primaryColor: "#894444",
      secondaryColor: "#6d2323",
      accentColor: "#FEF9E1",
      textColor: "#FFFFFF",
      textPrimaryColor: "#6D2323",
      textSecondaryColor: "#FEF9E1",
      hoverColor: "#6D2323",
      backgroundColor: "#FFFFFF",
    };
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        if (response.data && typeof response.data === "object") {
          setSettings(response.data);
          localStorage.setItem("systemSettings", JSON.stringify(response.data));
        }
      } catch (e) {
        console.error("Error fetching system settings:", e);
      }
    };
    fetchSettings();
  }, []);

  return settings;
};

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const EcmWireframe = ({ settings }) => {
  const p = settings?.primaryColor || "#894444";
  const ac = settings?.accentColor || "#FEF9E1";

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box
        sx={{
          py: 3,
          width: "100vw",
          mx: "auto",
          maxWidth: "100%",
          overflow: "hidden",
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
          minHeight: "92vh",
        }}
      >
        <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
          {/* Header shimmer */}
          <Box
            sx={{
              mb: 3,
              borderRadius: 20,
              overflow: "hidden",
              background: `${ac}F2`,
              border: `1px solid ${alpha(p, 0.1)}`,
              boxShadow: `0 8px 40px ${alpha(p, 0.08)}`,
              animation: "ecmPulse 2.2s ease-in-out infinite",
            }}
          >
            <Box
              sx={{
                px: 4,
                py: 3,
                position: "relative",
                overflow: "hidden",
                background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      bgcolor: alpha(p, 0.12),
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <EcmShim
                      width={260}
                      height={22}
                      borderRadius={6}
                      sx={{ mb: 0.75 }}
                    />
                    <EcmShim width={300} height={12} borderRadius={4} />
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: alpha(p, 0.1),
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Left panel shimmer */}
            <Grid item xs={12} lg={4}>
              <Box
                sx={{
                  borderRadius: 20,
                  overflow: "hidden",
                  background: `${ac}F2`,
                  border: `1px solid ${alpha(p, 0.1)}`,
                  animation: "ecmPulse 2.2s ease-in-out 0.05s infinite",
                }}
              >
                <Box
                  sx={{
                    px: 3.5,
                    py: 2.5,
                    borderBottom: `1px solid ${alpha(p, 0.08)}`,
                    bgcolor: alpha(ac, 0.5),
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: alpha(p, 0.12),
                    }}
                  />
                  <Box>
                    <EcmShim
                      width={160}
                      height={13}
                      borderRadius={5}
                      sx={{ mb: 0.5 }}
                    />
                    <EcmShim width={220} height={10} borderRadius={4} />
                  </Box>
                </Box>
                <Box
                  sx={{
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2.5,
                  }}
                >
                  <Box>
                    <EcmShim
                      width={160}
                      height={11}
                      borderRadius={4}
                      sx={{ mb: 1.5 }}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <EcmShim width="100%" height={40} borderRadius={12} />
                      </Grid>
                      <Grid item xs={6}>
                        <EcmShim width="100%" height={40} borderRadius={12} />
                      </Grid>
                    </Grid>
                  </Box>
                  <Box
                    sx={{ borderTop: `1px solid ${alpha(p, 0.1)}`, pt: 2.5 }}
                  >
                    <EcmShim
                      width={180}
                      height={11}
                      borderRadius={4}
                      sx={{ mb: 1.5 }}
                    />
                    <EcmShim
                      width="100%"
                      height={40}
                      borderRadius={12}
                      sx={{ mb: 1.5 }}
                    />
                  </Box>
                  <EcmShim width="100%" height={44} borderRadius={12} />
                </Box>
              </Box>
            </Grid>

            {/* Right panel shimmer */}
            <Grid item xs={12} lg={8}>
              <Box
                sx={{
                  borderRadius: 20,
                  overflow: "hidden",
                  background: `${ac}F2`,
                  border: `1px solid ${alpha(p, 0.1)}`,
                  animation: "ecmPulse 2.2s ease-in-out 0.08s infinite",
                }}
              >
                <Box
                  sx={{
                    px: 3.5,
                    py: 2.5,
                    background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                    borderBottom: `1px solid ${alpha(p, 0.1)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        bgcolor: alpha(p, 0.12),
                      }}
                    />
                    <Box>
                      <EcmShim
                        width={200}
                        height={14}
                        borderRadius={5}
                        sx={{ mb: 0.5 }}
                      />
                      <EcmShim width={240} height={10} borderRadius={4} />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <EcmShim width={36} height={36} borderRadius={8} />
                    <EcmShim width={36} height={36} borderRadius={8} />
                  </Box>
                </Box>
                <Box sx={{ p: 3 }}>
                  <EcmShim
                    width="100%"
                    height={40}
                    borderRadius={12}
                    sx={{ mb: 2.5 }}
                  />
                  <Grid container spacing={1.5}>
                    {[...Array(8)].map((_, i) => (
                      <Grid item xs={3} key={i}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 3,
                            border: `1px solid ${alpha(p, 0.1)}`,
                            animation: `ecmPulse 2.2s ease-in-out ${i * 0.06}s infinite`,
                          }}
                        >
                          <EcmShim
                            width="50%"
                            height={10}
                            borderRadius={3}
                            sx={{ mb: 0.75 }}
                          />
                          <EcmShim
                            width="80%"
                            height={12}
                            borderRadius={4}
                            sx={{ mb: 0.75 }}
                          />
                          <EcmShim width={70} height={20} borderRadius={10} />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

// ─── Styled components (matching BulkRegister pattern) ───────────────────────
const getStyledComponents = (p, ac) => {
  const GlassCard = styled(Card)(() => ({
    borderRadius: 20,
    background: `${ac}F2`,
    backdropFilter: "blur(10px)",
    boxShadow: `0 8px 40px ${alpha(p, 0.08)}`,
    border: `1px solid ${alpha(p, 0.1)}`,
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": { boxShadow: `0 12px 48px ${alpha(p, 0.16)}` },
  }));

  const ProfessionalButton = styled(Button)(({ variant: v }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: "10px 22px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none",
    fontSize: "0.9rem",
    letterSpacing: "0.025em",
    boxShadow: v === "contained" ? `0 4px 14px ${alpha(p, 0.4)}` : "none",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: v === "contained" ? `0 6px 20px ${alpha(p, 0.55)}` : "none",
    },
    "&:active": { transform: "translateY(0)" },
  }));

  const ModernTextField = styled(TextField)(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backgroundColor: "rgba(255,255,255,0.8)",
      "&:hover": { backgroundColor: "rgba(255,255,255,0.95)" },
      "&.Mui-focused": {
        backgroundColor: "rgba(255,255,255,1)",
        boxShadow: `0 4px 20px ${alpha(p, 0.12)}`,
      },
      "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(p, 0.25) },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(p, 0.45),
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p },
    },
    "& .MuiInputLabel-root": { fontWeight: 500 },
  }));

  const ModernSelect = styled(Select)(() => ({
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    "&:hover": { backgroundColor: "rgba(255,255,255,0.95)" },
    "&.Mui-focused": { backgroundColor: "rgba(255,255,255,1)" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(p, 0.25) },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(p, 0.45) },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p },
  }));

  return { GlassCard, ProfessionalButton, ModernTextField, ModernSelect };
};

// ─── Auth helper ──────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    withCredentials: true,
  };
};

// ─── Category color map ───────────────────────────────────────────────────────
const getCategoryColor = (catId) => {
  const map = {
    0: "#F57C00",
    1: "#E64A19",
    2: "#2E7D32",
    3: "#1565C0",
    4: "#7B1FA2",
    5: "#00796B",
  };
  return map[parseInt(catId)] || "#757575";
};

const CATEGORY_OPTIONS = [
  {
    group: "Job Order (JO)",
    items: [
      { value: 0, label: "Graduated", color: "#F57C00" },
      { value: 1, label: "UnderGrad", color: "#E64A19" },
    ],
  },
  {
    group: "Regular",
    items: [
      { value: 2, label: "Non-Teaching", color: "#2E7D32" },
      { value: 3, label: "Teaching (30Hrs)", color: "#1565C0" },
      { value: 4, label: "Designated (40Hrs)", color: "#7B1FA2" },
    ],
  },
  {
    group: "Custom",
    items: [{ value: 5, label: "Other (specify)", color: "#00796B" }],
  },
];

// ─── Employee Autocomplete ────────────────────────────────────────────────────
// FIX 2: Moved styled TextField OUTSIDE the component so it doesn't
// get recreated on every render, which was breaking focus/typing.
const buildEmployeeTextField = (p) =>
  styled(TextField)(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.8)",
      "&:hover": { backgroundColor: "rgba(255,255,255,0.95)" },
      "&.Mui-focused": {
        backgroundColor: "#fff",
        boxShadow: `0 4px 20px ${alpha(p, 0.12)}`,
      },
      "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(p, 0.25) },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(p, 0.45),
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p },
    },
  }));

const EmployeeAutocomplete = ({
  value,
  onChange,
  placeholder = "Search employee...",
  required = false,
  disabled = false,
  error = false,
  helperText = "",
  selectedEmployee,
  onEmployeeSelect,
  dropdownDisabled = false,
  p,
  ac,
  tp,
}) => {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // FIX 2: Memoize the styled component so it's stable across renders
  const EmpTextField = useMemo(() => buildEmployeeTextField(p), [p]);

  useEffect(() => {
    if (value && !selectedEmployee) fetchEmployeeById(value);
  }, [value]);
  useEffect(() => {
    if (selectedEmployee) setQuery(selectedEmployee.name || "");
    else if (!value) setQuery("");
  }, [selectedEmployee, value]);
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchEmployees = async (q) => {
    setIsLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search?q=${encodeURIComponent(q)}`,
        getAuthHeaders(),
      );
      setEmployees(r.data);
    } catch {
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchAllEmployees = async () => {
    setIsLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/search`,
        getAuthHeaders(),
      );
      setEmployees(r.data);
    } catch {
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchEmployeeById = async (empNum) => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/${empNum}`,
        getAuthHeaders(),
      );
      onEmployeeSelect(r.data);
      setQuery(r.data.name || "");
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowDropdown(true);
    if (selectedEmployee && v !== selectedEmployee.name) {
      onEmployeeSelect(null);
      onChange("");
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 2) fetchEmployees(v);
      else if (v.trim().length === 0) fetchAllEmployees();
      else setEmployees([]);
    }, 300);
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }} ref={dropdownRef}>
      <EmpTextField
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setShowDropdown(true);
          if (!employees.length && !isLoading) {
            query.length >= 2 ? fetchEmployees(query) : fetchAllEmployees();
          }
        }}
        onKeyDown={(e) => e.key === "Escape" && setShowDropdown(false)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        fullWidth
        autoComplete="off"
        size="small"
        InputProps={{
          startAdornment: <PersonIcon sx={{ color: p, mr: 1, fontSize: 18 }} />,
          endAdornment: (
            <IconButton
              onClick={
                dropdownDisabled
                  ? undefined
                  : () => {
                      if (!showDropdown) {
                        setShowDropdown(true);
                        if (!employees.length && !isLoading)
                          fetchAllEmployees();
                      } else setShowDropdown(false);
                    }
              }
              size="small"
              disabled={dropdownDisabled}
              sx={{ color: p }}
            >
              {showDropdown ? (
                <ExpandLessIcon sx={{ fontSize: 18 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          ),
        }}
      />
      {showDropdown && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 280,
            overflow: "auto",
            mt: 0.75,
            borderRadius: 3,
            border: `1px solid ${alpha(p, 0.15)}`,
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
                gap: 1,
              }}
            >
              <CircularProgress size={16} sx={{ color: p }} />
              <Typography
                variant="body2"
                sx={{ fontSize: "0.8rem", color: alpha("#000", 0.5) }}
              >
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
                    setShowDropdown(false);
                    onChange(emp.employeeNumber);
                  }}
                  sx={{
                    py: 1,
                    px: 1.5,
                    "&:hover": { bgcolor: alpha(p, 0.05) },
                    borderBottom: `1px solid ${alpha(p, 0.05)}`,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        sx={{ fontSize: "0.82rem", fontWeight: 600, color: p }}
                      >
                        {emp.name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        sx={{ fontSize: "0.72rem", color: alpha("#000", 0.45) }}
                      >
                        #{emp.employeeNumber}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  color: alpha("#000", 0.4),
                  fontStyle: "italic",
                }}
              >
                {query.length >= 2
                  ? `No employees found for "${query}"`
                  : "Type to search or scroll to browse"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Category Select ──────────────────────────────────────────────────────────
const CategorySelect = ({ value, onChange, p, disabled = false }) => {
  return (
    <FormControl fullWidth size="small">
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        sx={{
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.8)",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(p, 0.25) },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(p, 0.45),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p },
          // FIX 3: Ensure the selected value renders with flex + centered alignment
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
          },
        }}
      >
        {CATEGORY_OPTIONS.map(({ group, items }) => [
          <ListSubheader
            key={group}
            sx={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: alpha(p, 0.5),
              lineHeight: "2em",
              bgcolor: alpha("#FEF9E1", 0.6),
            }}
          >
            {group}
          </ListSubheader>,
          ...items.map(({ value: v, label, color }) => (
            // FIX 3: Added display:flex + alignItems:center to MenuItem so dot and label are vertically aligned
            <MenuItem
              key={v}
              value={v}
              sx={{ py: 1, display: "flex", alignItems: "center" }}
            >
              <ListItemIcon
                sx={{ minWidth: 26, display: "flex", alignItems: "center" }}
              >
                <Circle sx={{ fontSize: 10, color }} />
              </ListItemIcon>
              <Typography sx={{ fontSize: "0.85rem", lineHeight: 1 }}>
                {label}
              </Typography>
            </MenuItem>
          )),
        ])}
      </Select>
    </FormControl>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const EmploymentCategoryManagement = () => {
  const rawSettings = useLocalSystemSettings();
  const p = rawSettings?.primaryColor || "#894444";
  const s = rawSettings?.secondaryColor || "#6d2323";
  const ac = rawSettings?.accentColor || "#FEF9E1";
  const tp = rawSettings?.textPrimaryColor || "#6D2323";

  const { GlassCard, ProfessionalButton, ModernTextField } = useMemo(
    () => getStyledComponents(p, ac),
    [p, ac],
  );

  // ── State ──
  const [employmentCategories, setEmploymentCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [editRecord, setEditRecord] = useState(null);
  const [originalRecord, setOriginalRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRecord, setNewRecord] = useState({
    employeeNumber: "",
    employmentCategory: 0,
    customCategory: "",
  });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setPage(0);
  }, [deferredSearch]);

  useEffect(() => {
    fetchEmploymentCategories().finally(() => setPageLoading(false));
  }, []);

  const fetchEmploymentCategories = async () => {
    setLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        getAuthHeaders(),
      );
      setEmploymentCategories(r.data);
    } catch {
      showSnackbar("Failed to fetch employment categories.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const handleCreate = async () => {
    if (!newRecord.employeeNumber) {
      showSnackbar("Please select an employee", "error");
      setErrors({ employeeNumber: "Required" });
      return;
    }
    if (
      newRecord.employmentCategory === 5 &&
      !newRecord.customCategory.trim()
    ) {
      showSnackbar("Please enter a custom category description", "error");
      setErrors({ customCategory: 'Required for "Other"' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        newRecord,
        getAuthHeaders(),
      );
      setNewRecord({
        employeeNumber: "",
        employmentCategory: 0,
        customCategory: "",
      });
      setSelectedEmployee(null);
      setErrors({});
      fetchEmploymentCategories();
      setTimeout(() => {
        setLoading(false);
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
    } catch (err) {
      showSnackbar(
        err.response?.data?.error || "Failed to create employment category.",
        "error",
      );
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRecord?.employeeNumber) {
      showSnackbar("Employee number is required.", "error");
      return;
    }
    if (
      editRecord.employmentCategory === 5 &&
      !editRecord.customCategory?.trim()
    ) {
      showSnackbar("Please enter a custom category description", "error");
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editRecord.id}`,
        {
          employeeNumber: editRecord.employeeNumber,
          employmentCategory: editRecord.employmentCategory,
          customCategory: editRecord.customCategory || "",
        },
        getAuthHeaders(),
      );
      setEditRecord(null);
      setOriginalRecord(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchEmploymentCategories();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      showSnackbar(
        err.response?.data?.error || "Failed to update employment category.",
        "error",
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${id}`,
        getAuthHeaders(),
      );
      setEditRecord(null);
      setOriginalRecord(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      fetchEmploymentCategories();
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch {
      showSnackbar("Failed to delete employment category.", "error");
    }
  };

  const handleOpenModal = async (record) => {
    setEditRecord({ ...record });
    setOriginalRecord({ ...record });
    try {
      const r = await axios.get(
        `${API_BASE_URL}/Remittance/employees/${record.employeeNumber}`,
        getAuthHeaders(),
      );
      setSelectedEditEmployee({
        name: r.data.name,
        employeeNumber: record.employeeNumber,
      });
    } catch {
      setSelectedEditEmployee({
        name: record.employeeName || "Unknown",
        employeeNumber: record.employeeNumber,
      });
    }
    setIsEditing(false);
  };

  const hasChanges = () => {
    if (!editRecord || !originalRecord) return false;
    return (
      editRecord.employeeNumber !== originalRecord.employeeNumber ||
      editRecord.employmentCategory !== originalRecord.employmentCategory ||
      editRecord.customCategory !== originalRecord.customCategory
    );
  };

  const filteredData = useMemo(() => {
    const q = (deferredSearch || "").toString().toLowerCase().trim();
    if (!q) return employmentCategories;
    return employmentCategories.filter(
      (r) =>
        r.employeeNumber?.toString().includes(q) ||
        r.employeeName?.toLowerCase().includes(q) ||
        r.categoryLabel?.toLowerCase().includes(q),
    );
  }, [employmentCategories, deferredSearch]);

  const pagedData = useMemo(
    () =>
      filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage],
  );

  // Show wireframe while initial load
  if (pageLoading) return <EcmWireframe settings={rawSettings} />;

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box
        sx={{
          pt: 3,
          pb: 0,
          width: "100vw",
          mx: "auto",
          maxWidth: "100%",
          overflow: "hidden",
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
          {/* ── Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 3 }}>
              <GlassCard>
                <Box
                  sx={{
                    px: 4,
                    py: 3,
                    background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 160,
                      height: 160,
                      background: `radial-gradient(circle, ${alpha(p, 0.1)} 0%, transparent 70%)`,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: -25,
                      left: "30%",
                      width: 120,
                      height: 120,
                      background: `radial-gradient(circle, ${alpha(p, 0.07)} 0%, transparent 70%)`,
                    }}
                  />
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    position="relative"
                    zIndex={1}
                  >
                    <Box display="flex" alignItems="center" gap={3}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(p, 0.15),
                          width: 52,
                          height: 52,
                          boxShadow: `0 6px 20px ${alpha(p, 0.15)}`,
                        }}
                      >
                        <CategoryIcon sx={{ fontSize: 26, color: p }} />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h5"
                          component="h1"
                          sx={{ fontWeight: 700, lineHeight: 1.2, color: p }}
                        >
                          Employment Category Management
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            opacity: 0.75,
                            fontWeight: 400,
                            color: tp,
                            mt: 0.25,
                          }}
                        >
                          Manage employee employment categories and assignments
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        label="Category Management"
                        size="small"
                        sx={{
                          bgcolor: alpha(p, 0.15),
                          color: p,
                          fontWeight: 500,
                        }}
                      />
                      <Tooltip title="Refresh Data">
                        <IconButton
                          onClick={fetchEmploymentCategories}
                          sx={{
                            bgcolor: alpha(p, 0.1),
                            "&:hover": { bgcolor: alpha(p, 0.2) },
                            color: p,
                            width: 44,
                            height: 44,
                          }}
                        >
                          <Refresh sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          <Grid container spacing={3} alignItems="flex-start">
            {/* ── LEFT: Add New Category ── */}
            <Grid item xs={12} lg={4}>
              <Fade in timeout={700}>
                <GlassCard>
                  {/* Panel header */}
                  <Box
                    sx={{
                      px: 3.5,
                      py: 2.5,
                      background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                      borderBottom: `1px solid ${alpha(p, 0.1)}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 90,
                        height: 90,
                        background: `radial-gradient(circle, ${alpha(p, 0.07)} 0%, transparent 70%)`,
                      }}
                    />
                    <Avatar
                      sx={{ bgcolor: alpha(p, 0.15), width: 42, height: 42 }}
                    >
                      <CategoryIcon sx={{ fontSize: 20, color: p }} />
                    </Avatar>
                    <Box sx={{ flex: 1, zIndex: 1 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: p,
                          lineHeight: 1.2,
                        }}
                      >
                        Add New Category
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: alpha(tp, 0.65),
                          mt: 0.2,
                        }}
                      >
                        Assign employment category to employee
                      </Typography>
                    </Box>
                    <Chip
                      label="New"
                      size="small"
                      sx={{
                        bgcolor: alpha(p, 0.15),
                        color: p,
                        fontWeight: 600,
                        zIndex: 1,
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {/* ── Search Employee ── */}
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.09em",
                          textTransform: "uppercase",
                          color: alpha(tp, 0.45),
                          mb: 1.25,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 13 }} /> Employee
                        Information
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: tp,
                          mb: 0.6,
                        }}
                      >
                        Search Employee{" "}
                        <Box component="span" sx={{ color: "red" }}>
                          *
                        </Box>
                      </Typography>
                      <EmployeeAutocomplete
                        value={newRecord.employeeNumber}
                        onChange={(val) => {
                          setNewRecord((r) => ({ ...r, employeeNumber: val }));
                          setErrors((e) => {
                            const n = { ...e };
                            delete n.employeeNumber;
                            return n;
                          });
                        }}
                        selectedEmployee={selectedEmployee}
                        onEmployeeSelect={setSelectedEmployee}
                        placeholder="Search employee…"
                        required
                        error={!!errors.employeeNumber}
                        helperText={errors.employeeNumber || ""}
                        p={p}
                        ac={ac}
                        tp={tp}
                      />
                    </Box>

                    {/* ── Selected Employee display ── */}
                    {selectedEmployee ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          px: 1.75,
                          py: 1.25,
                          borderRadius: 3,
                          bgcolor: alpha(p, 0.05),
                          border: `1px solid ${alpha(p, 0.15)}`,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: alpha(p, 0.15),
                            fontSize: "0.8rem",
                            color: p,
                            flexShrink: 0,
                          }}
                        >
                          {selectedEmployee.name?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              color: p,
                              lineHeight: 1.2,
                            }}
                            noWrap
                          >
                            {selectedEmployee.name}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.68rem", color: alpha(tp, 0.5) }}
                          >
                            #{selectedEmployee.employeeNumber}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `2px dashed ${alpha(p, 0.18)}`,
                          borderRadius: 3,
                          py: 1.5,
                          bgcolor: alpha(p, 0.02),
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            color: alpha(tp, 0.35),
                            fontStyle: "italic",
                          }}
                        >
                          No employee selected yet
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ borderTop: `1px dashed ${alpha(p, 0.12)}` }} />

                    {/* ── Category Type ── */}
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.09em",
                          textTransform: "uppercase",
                          color: alpha(tp, 0.45),
                          mb: 1.25,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        <WorkIcon sx={{ fontSize: 13 }} /> Employment Category
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: tp,
                          mb: 0.6,
                        }}
                      >
                        Category Type
                      </Typography>
                      <CategorySelect
                        value={newRecord.employmentCategory}
                        onChange={(v) =>
                          setNewRecord((r) => ({
                            ...r,
                            employmentCategory: v,
                            customCategory: v === 5 ? r.customCategory : "",
                          }))
                        }
                        p={p}
                      />

                      {newRecord.employmentCategory === 5 && (
                        <Fade in>
                          <Box sx={{ mt: 1.5 }}>
                            <Typography
                              sx={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: tp,
                                mb: 0.6,
                              }}
                            >
                              Custom Category{" "}
                              <Box component="span" sx={{ color: "red" }}>
                                *
                              </Box>
                            </Typography>
                            <ModernTextField
                              value={newRecord.customCategory}
                              onChange={(e) => {
                                setNewRecord((r) => ({
                                  ...r,
                                  customCategory: e.target.value,
                                }));
                                setErrors((er) => {
                                  const n = { ...er };
                                  delete n.customCategory;
                                  return n;
                                });
                              }}
                              placeholder="e.g., Part-timer, OJT, Consultant…"
                              fullWidth
                              size="small"
                              error={!!errors.customCategory}
                              helperText={
                                errors.customCategory || "Max 100 characters"
                              }
                              inputProps={{ maxLength: 100 }}
                            />
                          </Box>
                        </Fade>
                      )}
                    </Box>

                    {/* ── Actions ── */}
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        pt: 1,
                        borderTop: `1px solid ${alpha(p, 0.08)}`,
                        justifyContent: "flex-end",
                      }}
                    >
                      {(selectedEmployee || newRecord.customCategory) && (
                        <ProfessionalButton
                          variant="outlined"
                          onClick={() => {
                            setNewRecord({
                              employeeNumber: "",
                              employmentCategory: 0,
                              customCategory: "",
                            });
                            setSelectedEmployee(null);
                            setErrors({});
                          }}
                          sx={{
                            borderColor: alpha(p, 0.4),
                            color: alpha(tp, 0.6),
                            "&:hover": {
                              borderColor: p,
                              bgcolor: alpha(p, 0.05),
                            },
                          }}
                        >
                          Clear
                        </ProfessionalButton>
                      )}
                      <ProfessionalButton
                        variant="contained"
                        disabled={loading}
                        onClick={handleCreate}
                        startIcon={
                          loading ? (
                            <CircularProgress size={16} sx={{ color: ac }} />
                          ) : (
                            <AddIcon />
                          )
                        }
                        sx={{
                          bgcolor: p,
                          color: ac,
                          "&:hover": { bgcolor: s },
                          "&:disabled": {
                            bgcolor: alpha(p, 0.4),
                            color: alpha(ac, 0.7),
                          },
                        }}
                      >
                        {loading ? "Adding…" : "Add Category"}
                      </ProfessionalButton>
                    </Box>
                  </Box>
                </GlassCard>
              </Fade>
            </Grid>

            {/* ── RIGHT: Records ── */}
            <Grid item xs={12} lg={8}>
              <Fade in timeout={900}>
                <GlassCard>
                  {/* Panel header */}
                  <Box
                    sx={{
                      px: 3.5,
                      py: 2.5,
                      background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                      borderBottom: `1px solid ${alpha(p, 0.1)}`,
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
                        top: -25,
                        right: -25,
                        width: 110,
                        height: 110,
                        background: `radial-gradient(circle, ${alpha(p, 0.07)} 0%, transparent 70%)`,
                      }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        zIndex: 1,
                      }}
                    >
                      <Avatar
                        sx={{ bgcolor: alpha(p, 0.15), width: 42, height: 42 }}
                      >
                        <ReorderIcon sx={{ fontSize: 20, color: p }} />
                      </Avatar>
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: p,
                            lineHeight: 1.2,
                          }}
                        >
                          Employment Category Records
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            color: alpha(tp, 0.65),
                            mt: 0.2,
                          }}
                        >
                          View and manage existing records
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        label={`${filteredData.length} records`}
                        size="small"
                        sx={{
                          bgcolor: alpha(p, 0.15),
                          color: p,
                          fontWeight: 500,
                        }}
                      />
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, m) => m && setViewMode(m)}
                        size="small"
                        sx={{
                          bgcolor: alpha(p, 0.08),
                          borderRadius: 2,
                          "& .MuiToggleButton-root": {
                            color: alpha(p, 0.5),
                            border: "none",
                            borderRadius: "8px !important",
                            px: 1.25,
                            py: 0.75,
                            "&.Mui-selected": {
                              bgcolor: alpha(p, 0.15),
                              color: p,
                            },
                          },
                        }}
                      >
                        <ToggleButton value="grid">
                          <ViewModuleIcon sx={{ fontSize: 18 }} />
                        </ToggleButton>
                        <ToggleButton value="list">
                          <ViewListIcon sx={{ fontSize: 18 }} />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  <Box sx={{ p: 3 }}>
                    {/* Search */}
                    <Box sx={{ mb: 2 }}>
                      <ModernTextField
                        size="small"
                        placeholder="Search by Employee ID, Name, or Category…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <SearchIcon
                              sx={{ color: p, mr: 1, fontSize: 18 }}
                            />
                          ),
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        maxHeight: 420,
                        minHeight: 220,
                        overflowY: "auto",
                        pr: 0.5,
                        "&::-webkit-scrollbar": { width: "4px" },
                        "&::-webkit-scrollbar-track": {
                          background: alpha(p, 0.04),
                          borderRadius: 2,
                        },
                        "&::-webkit-scrollbar-thumb": {
                          background: alpha(p, 0.25),
                          borderRadius: 2,
                        },
                      }}
                    >
                      {viewMode === "grid" ? (
                        <Grid container spacing={1.25}>
                          {pagedData.map((record) => {
                            const catColor = getCategoryColor(
                              record.employmentCategory,
                            );
                            return (
                              <Grid
                                item
                                xs={3}
                                key={record.id}
                                sx={{ mb: 0.5 }}
                              >
                                <Box
                                  onClick={() => handleOpenModal(record)}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    border: `1px solid ${alpha(p, 0.09)}`,
                                    bgcolor: alpha(ac, 0.5),
                                    cursor: "pointer",
                                    transition: "all 0.18s ease",
                                    justifyContent: "space-between",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                    "&:hover": {
                                      border: `1px solid ${alpha(catColor, 0.4)}`,
                                      bgcolor: alpha(ac, 0.85),
                                      transform: "translateY(-2px)",
                                      boxShadow: `0 4px 14px ${alpha(catColor, 0.12)}`,
                                    },
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "0.63rem",
                                      fontWeight: 700,
                                      color: alpha(p, 0.5),
                                      letterSpacing: "0.02em",
                                    }}
                                  >
                                    #{record.employeeNumber}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: "0.78rem",
                                      fontWeight: 700,
                                      color: tp,
                                      lineHeight: 1.3,
                                    }}
                                    noWrap
                                  >
                                    {record.employeeName || "Loading…"}
                                  </Typography>
                                  <Box sx={{ mt: 0.25 }}>
                                    <Chip
                                      label={record.categoryLabel}
                                      size="small"
                                      sx={{
                                        width: "100%",
                                        color: catColor,
                                        bgcolor: alpha(catColor, 0.08),
                                        border: `1px solid ${alpha(catColor, 0.25)}`,
                                        fontWeight: 600,
                                        fontSize: "0.62rem",
                                        height: 20,
                                        maxWidth: "100%",
                                        "& .MuiChip-label": {
                                          px: 0.75,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        },
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.6,
                          }}
                        >
                          {pagedData.map((record) => {
                            const catColor = getCategoryColor(
                              record.employmentCategory,
                            );
                            return (
                              <Box
                                key={record.id}
                                onClick={() => handleOpenModal(record)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  px: 1.75,
                                  py: 1.25,
                                  borderRadius: 2.5,
                                  border: `1px solid ${alpha(p, 0.09)}`,
                                  bgcolor: alpha(ac, 0.5),
                                  cursor: "pointer",
                                  transition: "all 0.18s ease",
                                  "&:hover": {
                                    border: `1px solid ${alpha(catColor, 0.35)}`,
                                    bgcolor: alpha(ac, 0.85),
                                    transform: "translateX(3px)",
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: catColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    color: alpha(p, 0.5),
                                    flexShrink: 0,
                                  }}
                                >
                                  #{record.employeeNumber}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    color: tp,
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                  noWrap
                                >
                                  {record.employeeName || "Loading…"}
                                </Typography>
                                <Chip
                                  label={record.categoryLabel}
                                  size="small"
                                  sx={{
                                    color: catColor,
                                    bgcolor: alpha(catColor, 0.08),
                                    border: `1px solid ${alpha(catColor, 0.25)}`,
                                    fontWeight: 600,
                                    fontSize: "0.65rem",
                                    height: 20,
                                    flexShrink: 0,
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      )}

                      {filteredData.length === 0 && (
                        <Box sx={{ textAlign: "center", py: 6 }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: "50%",
                              bgcolor: alpha(p, 0.07),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              mx: "auto",
                              mb: 1.25,
                            }}
                          >
                            <CategoryIcon
                              sx={{ fontSize: 22, color: alpha(p, 0.3) }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "0.88rem",
                              fontWeight: 600,
                              color: p,
                              mb: 0.4,
                            }}
                          >
                            No Records Found
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.76rem", color: alpha(tp, 0.45) }}
                          >
                            Try adjusting your search criteria
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Pagination */}
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: `1px solid ${alpha(p, 0.08)}`,
                      }}
                    >
                      <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[12, 24, 48, 96]}
                        sx={{
                          "& .MuiTablePagination-toolbar": {
                            minHeight: 44,
                            px: 0,
                          },
                          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                            { fontSize: "0.75rem", color: alpha(tp, 0.6) },
                        }}
                      />
                    </Box>
                  </Box>
                </GlassCard>
              </Fade>
            </Grid>
          </Grid>
        </Box>

        {/* ── Edit/View Modal ── */}
        <Modal
          open={!!editRecord}
          onClose={() => {
            setEditRecord(null);
            setOriginalRecord(null);
            setSelectedEditEmployee(null);
            setIsEditing(false);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <Fade in={!!editRecord}>
            <Box
              sx={{
                width: "90%",
                maxWidth: 560,
                maxHeight: "90vh",
                overflowY: "auto",
                borderRadius: 4,
                background: `${ac}FA`,
                border: `1px solid ${alpha(p, 0.15)}`,
                boxShadow: `0 24px 80px ${alpha(p, 0.2)}`,
              }}
            >
              {editRecord && (
                <>
                  {/* Modal header */}
                  <Box
                    sx={{
                      px: 3.5,
                      py: 2.5,
                      background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`,
                      borderBottom: `1px solid ${alpha(p, 0.1)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{ bgcolor: alpha(p, 0.15), width: 38, height: 38 }}
                      >
                        <CategoryIcon sx={{ fontSize: 18, color: p }} />
                      </Avatar>
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: p,
                            lineHeight: 1.2,
                          }}
                        >
                          {isEditing
                            ? "Edit Employment Category"
                            : "Category Details"}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.7rem", color: alpha(tp, 0.55) }}
                        >
                          {isEditing
                            ? "Make changes and save"
                            : "View record details"}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={() => {
                        setEditRecord(null);
                        setOriginalRecord(null);
                        setSelectedEditEmployee(null);
                        setIsEditing(false);
                      }}
                      sx={{
                        color: p,
                        bgcolor: alpha(p, 0.08),
                        "&:hover": { bgcolor: alpha(p, 0.15) },
                        width: 34,
                        height: 34,
                      }}
                    >
                      <Close sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>

                  <Box sx={{ p: 3 }}>
                    {/* Employee section */}
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.09em",
                        textTransform: "uppercase",
                        color: alpha(tp, 0.45),
                        mb: 1.75,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 14 }} /> Employee Information
                    </Typography>

                    <Grid container spacing={2} sx={{ mb: 0.5 }}>
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            border: `1px solid ${alpha(p, 0.1)}`,
                            bgcolor: alpha(ac, 0.4),
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: tp,
                              mb: 1,
                            }}
                          >
                            Search Employee
                          </Typography>
                          <EmployeeAutocomplete
                            value={editRecord?.employeeNumber || ""}
                            onChange={
                              isEditing
                                ? (val) =>
                                    setEditRecord((r) => ({
                                      ...r,
                                      employeeNumber: val,
                                    }))
                                : () => {}
                            }
                            selectedEmployee={selectedEditEmployee}
                            onEmployeeSelect={
                              isEditing ? setSelectedEditEmployee : () => {}
                            }
                            placeholder="Search employee…"
                            required
                            disabled={!isEditing}
                            dropdownDisabled={!isEditing}
                            p={p}
                            ac={ac}
                            tp={tp}
                          />
                          {!isEditing && (
                            <Typography
                              sx={{
                                fontSize: "0.68rem",
                                color: alpha(tp, 0.4),
                                fontStyle: "italic",
                                mt: 0.5,
                              }}
                            >
                              Contact administrator to change employee.
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            border: `1px solid ${alpha(p, 0.1)}`,
                            bgcolor: alpha(ac, 0.4),
                            height: "100%",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: tp,
                              mb: 1,
                            }}
                          >
                            Selected Employee
                          </Typography>
                          {selectedEditEmployee ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                p: 1.25,
                                borderRadius: 2,
                                bgcolor: alpha(p, 0.05),
                                border: `1px solid ${alpha(p, 0.15)}`,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 30,
                                  height: 30,
                                  bgcolor: alpha(p, 0.15),
                                  fontSize: "0.75rem",
                                  color: p,
                                }}
                              >
                                {selectedEditEmployee.name?.charAt(0)}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    color: p,
                                    lineHeight: 1.2,
                                  }}
                                  noWrap
                                >
                                  {selectedEditEmployee.name}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.68rem",
                                    color: alpha(tp, 0.5),
                                  }}
                                >
                                  #{selectedEditEmployee.employeeNumber}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: `2px dashed ${alpha(p, 0.2)}`,
                                borderRadius: 2,
                                minHeight: 52,
                                bgcolor: alpha(p, 0.02),
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: alpha(tp, 0.4),
                                  fontStyle: "italic",
                                }}
                              >
                                No employee selected
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    </Grid>

                    <Box
                      sx={{ borderTop: `1px dashed ${alpha(p, 0.15)}`, my: 2 }}
                    />

                    {/* Category section */}
                    <Typography
                      sx={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.09em",
                        textTransform: "uppercase",
                        color: alpha(tp, 0.45),
                        mb: 1.75,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <WorkIcon sx={{ fontSize: 14 }} /> Employment Category
                    </Typography>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: `1px solid ${alpha(p, 0.1)}`,
                        bgcolor: alpha(ac, 0.4),
                      }}
                    >
                      {isEditing ? (
                        <>
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: tp,
                              mb: 1,
                            }}
                          >
                            Category Type
                          </Typography>
                          <CategorySelect
                            value={editRecord.employmentCategory}
                            onChange={(v) =>
                              setEditRecord((r) => ({
                                ...r,
                                employmentCategory: v,
                                customCategory: v === 5 ? r.customCategory : "",
                              }))
                            }
                            p={p}
                          />
                          {editRecord.employmentCategory === 5 && (
                            <Fade in>
                              <Box sx={{ mt: 1.5 }}>
                                <Typography
                                  sx={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    color: tp,
                                    mb: 0.75,
                                  }}
                                >
                                  Custom Category{" "}
                                  <Box component="span" sx={{ color: "red" }}>
                                    *
                                  </Box>
                                </Typography>
                                <ModernTextField
                                  value={editRecord.customCategory || ""}
                                  onChange={(e) =>
                                    setEditRecord((r) => ({
                                      ...r,
                                      customCategory: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g., Part-timer, OJT, Consultant…"
                                  fullWidth
                                  size="small"
                                  helperText="Max 100 characters"
                                  inputProps={{ maxLength: 100 }}
                                />
                              </Box>
                            </Fade>
                          )}
                        </>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            p: 1.25,
                            borderRadius: 2,
                            border: `1px solid ${alpha(getCategoryColor(editRecord.employmentCategory), 0.3)}`,
                            bgcolor: alpha(
                              getCategoryColor(editRecord.employmentCategory),
                              0.05,
                            ),
                          }}
                        >
                          <Circle
                            sx={{
                              fontSize: 10,
                              color: getCategoryColor(
                                editRecord.employmentCategory,
                              ),
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: getCategoryColor(
                                editRecord.employmentCategory,
                              ),
                            }}
                          >
                            {editRecord.categoryLabel}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Modal actions */}
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        mt: 2.5,
                        pt: 2,
                        borderTop: `1px solid ${alpha(p, 0.08)}`,
                        justifyContent: "flex-end",
                      }}
                    >
                      {!isEditing ? (
                        <>
                          <ProfessionalButton
                            variant="outlined"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDelete(editRecord.id)}
                            sx={{
                              color: "#dc2626",
                              borderColor: alpha("#dc2626", 0.4),
                              "&:hover": {
                                bgcolor: alpha("#dc2626", 0.06),
                                borderColor: "#dc2626",
                              },
                            }}
                          >
                            Delete
                          </ProfessionalButton>
                          <ProfessionalButton
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => setIsEditing(true)}
                            sx={{
                              bgcolor: p,
                              color: ac,
                              "&:hover": { bgcolor: s },
                            }}
                          >
                            Edit
                          </ProfessionalButton>
                        </>
                      ) : (
                        <>
                          <ProfessionalButton
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => {
                              setEditRecord({ ...originalRecord });
                              setSelectedEditEmployee({
                                name: originalRecord.employeeName || "Unknown",
                                employeeNumber: originalRecord.employeeNumber,
                              });
                              setIsEditing(false);
                            }}
                            sx={{
                              color: alpha(tp, 0.5),
                              borderColor: alpha(tp, 0.25),
                              "&:hover": {
                                borderColor: alpha(tp, 0.45),
                                bgcolor: alpha(p, 0.04),
                              },
                            }}
                          >
                            Cancel
                          </ProfessionalButton>
                          <ProfessionalButton
                            variant="contained"
                            startIcon={<SaveIcon />}
                            disabled={!hasChanges()}
                            onClick={handleUpdate}
                            sx={{
                              bgcolor: p,
                              color: ac,
                              "&:hover": { bgcolor: s },
                              "&:disabled": {
                                bgcolor: alpha(p, 0.4),
                                color: alpha(ac, 0.7),
                              },
                            }}
                          >
                            Save Changes
                          </ProfessionalButton>
                        </>
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>

        <LoadingOverlay
          open={loading}
          message="Processing employment category…"
        />
        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
          showOkButton={true}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%", borderRadius: 3 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default EmploymentCategoryManagement;
