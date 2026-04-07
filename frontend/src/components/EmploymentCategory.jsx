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

// ─── Theme tokens (matching LeaveRequest) ─────────────────────────────────────
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

// ─── Styled primitives (matching LeaveRequest) ─────────────────────────────────
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

const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: "800px 100%",
      animation: "ecmShimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Section label used inside form panels ─────────────────────────────────────
const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography
      sx={{
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: alpha(T.accent, 0.45),
      }}
    >
      {children}
    </Typography>
  </Box>
);

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const EcmWireframe = () => (
  <>
    <style>{shimmerKeyframes}</style>
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
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${T.accentBorder}`,
          animation: "ecmPulse 2s ease-in-out infinite",
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
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(109,35,35,0.06)",
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.12)",
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Bone w={220} h={18} sx={{ mb: 1 }} />
              <Bone w={360} h={11} />
            </Box>
          </Box>
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
      <Grid container spacing={3}>
        {[0, 1].map((col) => (
          <Grid item xs={12} lg={col === 0 ? 4 : 8} key={col}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${T.accentBorder}`,
                bgcolor: "#fff",
                overflow: "hidden",
                animation: `ecmPulse 2s ease-in-out ${col * 0.1}s infinite`,
                height: "calc(100vh - 280px)",
              }}
            >
              <Box
                sx={{
                  px: 3.5,
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
                    bgcolor: "rgba(109,35,35,0.12)",
                  }}
                />
                <Bone w={180} h={13} />
              </Box>
              <Box
                sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}
              >
                {[100, 160, 120, 140, 110].map((w, i) => (
                  <Box key={i}>
                    <Bone w={w} h={10} sx={{ mb: 1 }} />
                    <Box
                      sx={{
                        height: 40,
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

// ─── System settings hook (inline) ───────────────────────────────────────────
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
          localStorage.setItem(
            "systemSettings",
            JSON.stringify(response.data)
          );
        }
      } catch (e) {
        console.error("Error fetching system settings:", e);
      }
    };
    fetchSettings();
  }, []);

  return settings;
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
const buildEmployeeTextField = () =>
  styled(TextField)(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      fontSize: "0.875rem",
      backgroundColor: "#fff",
      "& fieldset": { borderColor: T.accentBorder },
      "&:hover fieldset": { borderColor: T.accent },
      "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
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
}) => {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const EmpTextField = useMemo(() => buildEmployeeTextField(), []);

  useEffect(() => {
    if (value && !selectedEmployee) fetchEmployeeById(value);
  }, [value]); // eslint-disable-line

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
        getAuthHeaders()
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
        getAuthHeaders()
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
        getAuthHeaders()
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
          startAdornment: (
            <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />
          ),
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
              sx={{ color: T.muted }}
            >
              {showDropdown ? (
                <ExpandLessIcon sx={{ fontSize: 15 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 15 }} />
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
            borderRadius: 2,
            border: `1px solid ${T.accentBorder}`,
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
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography
                variant="body2"
                sx={{ fontSize: "0.8rem", color: T.muted }}
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
                      <Typography
                        sx={{ fontSize: "0.72rem", color: T.muted }}
                      >
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
                sx={{
                  fontSize: "0.8rem",
                  color: T.faint,
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
const CategorySelect = ({ value, onChange, disabled = false }) => (
  <FormControl fullWidth size="small">
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      sx={{
        ...selectSx,
        "& .MuiSelect-select": { display: "flex", alignItems: "center" },
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
            color: alpha(T.accent, 0.45),
            lineHeight: "2em",
            bgcolor: T.accentFaint,
          }}
        >
          {group}
        </ListSubheader>,
        ...items.map(({ value: v, label, color }) => (
          <MenuItem
            key={v}
            value={v}
            sx={{ py: 1, display: "flex", alignItems: "center" }}
          >
            <ListItemIcon
              sx={{ minWidth: 26, display: "flex", alignItems: "center" }}
            >
              <Circle sx={{ fontSize: 8, color }} />
            </ListItemIcon>
            <Typography sx={{ fontSize: "0.875rem", lineHeight: 1 }}>
              {label}
            </Typography>
          </MenuItem>
        )),
      ])}
    </Select>
  </FormControl>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EmploymentCategoryManagement = () => {
  const rawSettings = useLocalSystemSettings();

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

  useEffect(() => { setPage(0); }, [deferredSearch]);

  useEffect(() => {
    fetchEmploymentCategories().finally(() => setPageLoading(false));
  }, []); // eslint-disable-line

  const fetchEmploymentCategories = async () => {
    setLoading(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        getAuthHeaders()
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
    if (newRecord.employmentCategory === 5 && !newRecord.customCategory.trim()) {
      showSnackbar("Please enter a custom category description", "error");
      setErrors({ customCategory: 'Required for "Other"' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        newRecord,
        getAuthHeaders()
      );
      setNewRecord({ employeeNumber: "", employmentCategory: 0, customCategory: "" });
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
        "error"
      );
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRecord?.employeeNumber) {
      showSnackbar("Employee number is required.", "error");
      return;
    }
    if (editRecord.employmentCategory === 5 && !editRecord.customCategory?.trim()) {
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
        getAuthHeaders()
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
        "error"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${id}`,
        getAuthHeaders()
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
        getAuthHeaders()
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
        r.categoryLabel?.toLowerCase().includes(q)
    );
  }, [employmentCategories, deferredSearch]);

  const pagedData = useMemo(
    () => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  const canAdd =
    !loading &&
    newRecord.employeeNumber &&
    (newRecord.employmentCategory !== 5 || newRecord.customCategory.trim());

  if (pageLoading) return <EcmWireframe />;

  return (
    <>
      <style>{shimmerKeyframes}</style>
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
          <LoadingOverlay open={loading} message="Processing employment category…" />
          <SuccessfulOverlay
            open={successOpen}
            action={successAction}
            onClose={() => setSuccessOpen(false)}
            showOkButton={true}
          />

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
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
                <CategoryIcon sx={{ fontSize: 32, color: T.accent }} />
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
                    Employment Category Management
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      color: T.accentMid,
                      fontWeight: 700,
                      opacity: 0.9,
                    }}
                  >
                    Administrative Panel • Assign and manage employee employment categories
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
                    {employmentCategories.length}{" "}
                    {employmentCategories.length === 1 ? "record" : "records"}
                  </Typography>
                </Box>
                <Tooltip title="Refresh Data">
                  <IconButton
                    onClick={fetchEmploymentCategories}
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

          {/* ── Two-column layout ── */}
          <Grid container spacing={2}>

            {/* ── LEFT: Add New Category ── */}
            <Grid item xs={12} lg={4}>
              <SectionCard
                sx={{
                  height: "calc(100vh - 280px)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Panel header */}
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
                  <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography
                    sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}
                  >
                    Add New Category
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
                    <Box component="span" sx={{ color: "#c62828" }}>*</Box> required
                  </Typography>
                </Box>

                {/* Scrollable body */}
                <Box
                  sx={{
                    px: 3.5,
                    py: 3,
                    flexGrow: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  {/* ── SECTION: Employee ── */}
                  <FormSectionLabel icon={PersonIcon}>Employee</FormSectionLabel>

                  {/* Employee Search */}
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: T.accent,
                        mb: 0.75,
                      }}
                    >
                      Search Employee{" "}
                      <Box component="span" sx={{ color: "#c62828" }}>*</Box>
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
                      placeholder="Search name or employee ID…"
                      required
                      error={!!errors.employeeNumber}
                      helperText={errors.employeeNumber || ""}
                    />
                  </Box>

                  {/* Employee preview pill */}
                  {selectedEmployee ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.75,
                        py: 1.25,
                        mb: 2.5,
                        borderRadius: 2,
                        bgcolor: T.accentFaint,
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 30,
                          height: 30,
                          bgcolor: alpha(T.accent, 0.15),
                          fontSize: "0.78rem",
                          color: T.accent,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {selectedEmployee.name?.charAt(0)?.toUpperCase() || "?"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: T.text,
                            lineHeight: 1.2,
                          }}
                          noWrap
                        >
                          {selectedEmployee.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>
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
                        border: `1.5px dashed ${T.accentBorder}`,
                        borderRadius: 2,
                        py: 1.5,
                        mb: 2.5,
                        bgcolor: alpha(T.accent, 0.02),
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: T.faint,
                          fontStyle: "italic",
                        }}
                      >
                        No employee selected yet
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                  {/* ── SECTION: Employment Category ── */}
                  <FormSectionLabel icon={WorkIcon}>Employment Category</FormSectionLabel>

                  {/* Category Type */}
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: T.accent,
                        mb: 0.75,
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
                    />
                  </Box>

                  {/* Custom Category — only visible when "Other" is selected */}
                  {newRecord.employmentCategory === 5 && (
                    <Fade in>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: T.accent,
                            mb: 0.75,
                          }}
                        >
                          Custom Description{" "}
                          <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                        </Typography>
                        <FieldInput
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
                          helperText={errors.customCategory || "Max 100 characters"}
                          inputProps={{ maxLength: 100 }}
                        />
                      </Box>
                    </Fade>
                  )}

                  {/* Submit */}
                  <Box sx={{ mt: "auto" }}>
                    {selectedEmployee && (
                      <AccentButton
                        onClick={() => {
                          setNewRecord({
                            employeeNumber: "",
                            employmentCategory: 0,
                            customCategory: "",
                          });
                          setSelectedEmployee(null);
                          setErrors({});
                        }}
                        variant="outlined"
                        fullWidth
                        sx={{
                          mb: 1,
                          height: 36,
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
                        Clear Form
                      </AccentButton>
                    )}
                    <AccentButton
                      onClick={handleCreate}
                      variant="contained"
                      fullWidth
                      disabled={!canAdd}
                      startIcon={
                        loading ? (
                          <CircularProgress size={14} sx={{ color: "#fff" }} />
                        ) : (
                          <AddIcon sx={{ fontSize: "16px !important" }} />
                        )
                      }
                      sx={{
                        height: 42,
                        bgcolor: canAdd ? T.accent : "#d0d0d0",
                        color: canAdd ? "#fff" : "#888",
                        boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : "none",
                        "&:hover": {
                          bgcolor: canAdd ? T.accentDark : "#d0d0d0",
                          boxShadow: canAdd ? `0 4px 16px ${alpha(T.accent, 0.38)}` : "none",
                        },
                        "&:disabled": {
                          bgcolor: "#d0d0d0 !important",
                          color: "#888 !important",
                          boxShadow: "none !important",
                          transform: "none !important",
                        },
                      }}
                    >
                      {loading ? "Adding…" : "Add Category"}
                    </AccentButton>
                  </Box>
                </Box>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Records ── */}
            <Grid item xs={12} lg={8}>
              <SectionCard
                sx={{
                  height: "calc(100vh - 280px)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Records header / toolbar */}
                <Box
                  sx={{
                    px: 3.5,
                    py: 2,
                    borderBottom: `1px solid ${T.divider}`,
                    bgcolor: T.accentFaint,
                  }}
                >
                  {/* Title row */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <ReorderIcon sx={{ fontSize: 17, color: T.accent }} />
                      <Typography
                        sx={{
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: T.text,
                        }}
                      >
                        Employment Category Records
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
                          {filteredData.length} records
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

                  {/* Search */}
                  <FieldInput
                    size="small"
                    placeholder="Search by employee ID, name, or category…"
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

                {/* Records list */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    p: 2,
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  {pagedData.length === 0 ? (
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
                        <CategoryIcon
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
                        {employmentCategories.length === 0
                          ? "No categories yet"
                          : "No records match your search"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                        {employmentCategories.length === 0
                          ? "Use the form on the left to add a category."
                          : "Try a different search term."}
                      </Typography>
                    </Box>
                  ) : viewMode === "grid" ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {pagedData.map((record) => {
                        const catColor = getCategoryColor(record.employmentCategory);
                        return (
                          <Grid
                            item
                            xs={12}
                            sm={3}
                            key={record.id}
                            sx={{ display: "flex" }}
                          >
                            <Box
                              onClick={() => handleOpenModal(record)}
                              sx={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                p: 2,
                                borderRadius: 2,
                                cursor: "pointer",
                                bgcolor: "#fff",
                                border: `1px solid ${T.accentBorder}`,
                                position: "relative",
                                transition: "all 0.13s",
                                "&:hover": {
                                  bgcolor: T.rowHover,
                                  borderColor: T.accent,
                                  transform: "translateY(-2px)",
                                  boxShadow: `0 4px 14px ${alpha(catColor, 0.12)}`,
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  mb: 0.5,
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
                                  sx={{ fontSize: "0.7rem", color: T.faint }}
                                >
                                  #{record.employeeNumber}
                                </Typography>
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  color: T.text,
                                  mb: 1,
                                  flexGrow: 1,
                                }}
                                noWrap
                              >
                                {record.employeeName || "Loading…"}
                              </Typography>
                              <Chip
                                label={record.categoryLabel}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  color: catColor,
                                  bgcolor: alpha(catColor, 0.08),
                                  border: `1px solid ${alpha(catColor, 0.25)}`,
                                  borderRadius: "4px",
                                  "& .MuiChip-label": { px: 0.75 },
                                }}
                              />
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <>
                      {/* List header */}
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          display: "grid",
                          gridTemplateColumns: "110px 1fr 140px",
                          gap: 1,
                          alignItems: "center",
                          bgcolor: alpha(T.accent, 0.04),
                          borderRadius: 1.5,
                          mb: 1,
                        }}
                      >
                        {["Emp. No", "Employee", "Category"].map((col) => (
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
                      {pagedData.map((record, idx) => {
                        const catColor = getCategoryColor(record.employmentCategory);
                        return (
                          <Box
                            key={record.id}
                            onClick={() => handleOpenModal(record)}
                            sx={{
                              px: 1.5,
                              py: 1.25,
                              display: "grid",
                              gridTemplateColumns: "110px 1fr 140px",
                              gap: 1,
                              alignItems: "center",
                              borderRadius: 1.5,
                              cursor: "pointer",
                              bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                              border: "1px solid transparent",
                              transition: "background 0.13s ease",
                              "&:hover": { bgcolor: T.rowHover },
                            }}
                          >
                            <Box
                              sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
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
                                sx={{ fontSize: "0.75rem", color: T.muted }}
                              >
                                {record.employeeNumber}
                              </Typography>
                            </Box>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 500,
                                color: T.text,
                              }}
                              noWrap
                            >
                              {record.employeeName || "Loading…"}
                            </Typography>
                            <Chip
                              label={record.categoryLabel}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                color: catColor,
                                bgcolor: alpha(catColor, 0.08),
                                border: `1px solid ${alpha(catColor, 0.25)}`,
                                borderRadius: "4px",
                                "& .MuiChip-label": { px: 0.75 },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </>
                  )}
                </Box>

                {/* Pagination */}
                {filteredData.length > 0 && (
                  <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}` }}>
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
                        "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                          { fontSize: "0.78rem", fontWeight: 600 },
                      }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* ── Edit / View Modal ── */}
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
              p: 2,
            }}
          >
            <Fade in={!!editRecord}>
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 560,
                  maxHeight: "90vh",
                  borderRadius: 3,
                  overflow: "hidden",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                  bgcolor: T.surface,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {editRecord && (
                  <>
                    {/* Modal header */}
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
                          <CategoryIcon sx={{ fontSize: 18, color: "#fff" }} />
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
                            {isEditing ? "Edit Category" : "Category Details"}
                          </Typography>
                          <Box
                            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.72rem",
                                color: "rgba(255,255,255,0.68)",
                              }}
                            >
                              #{editRecord.employeeNumber} •{" "}
                              {selectedEditEmployee?.name || "—"}
                            </Typography>
                            {!isEditing && (
                              <Chip
                                label="View mode"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: "0.62rem",
                                  bgcolor: "rgba(255,255,255,0.1)",
                                  color: "rgba(255,255,255,0.7)",
                                  fontWeight: 500,
                                }}
                              />
                            )}
                            {isEditing && (
                              <Chip
                                label="Editing"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: "0.62rem",
                                  bgcolor: "rgba(255,200,0,0.22)",
                                  color: "#ffe082",
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <IconButton
                        onClick={() => {
                          setEditRecord(null);
                          setOriginalRecord(null);
                          setSelectedEditEmployee(null);
                          setIsEditing(false);
                        }}
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
                      <Divider sx={{ mb: 2.5, borderColor: T.divider }} />

                      <Grid container spacing={2.5}>
                        {/* Employee */}
                        <Grid item xs={12} sm={5}>
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: T.accent,
                              mb: 0.75,
                            }}
                          >
                            Employee
                          </Typography>
                          {isEditing ? (
                            <EmployeeAutocomplete
                              value={editRecord?.employeeNumber || ""}
                              onChange={(val) =>
                                setEditRecord((r) => ({
                                  ...r,
                                  employeeNumber: val,
                                }))
                              }
                              selectedEmployee={selectedEditEmployee}
                              onEmployeeSelect={setSelectedEditEmployee}
                              placeholder="Search employee…"
                              required
                            />
                          ) : (
                            <Box
                              sx={{
                                p: 1.5,
                                bgcolor: T.accentFaint,
                                borderRadius: 2,
                                border: `1px solid ${T.accentBorder}`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  color: T.accent,
                                }}
                              >
                                #{editRecord.employeeNumber}
                              </Typography>
                              <Typography
                                sx={{ fontSize: "0.72rem", color: T.muted }}
                              >
                                {selectedEditEmployee?.name ||
                                  editRecord.employeeName}
                              </Typography>
                            </Box>
                          )}
                        </Grid>

                        {/* Category */}
                        <Grid item xs={12} sm={7}>
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: T.accent,
                              mb: 0.75,
                            }}
                          >
                            Category Type
                          </Typography>
                          {isEditing ? (
                            <CategorySelect
                              value={editRecord.employmentCategory}
                              onChange={(v) =>
                                setEditRecord((r) => ({
                                  ...r,
                                  employmentCategory: v,
                                  customCategory:
                                    v === 5 ? r.customCategory : "",
                                }))
                              }
                            />
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                p: 1.5,
                                bgcolor: T.accentFaint,
                                borderRadius: 2,
                                border: `1px solid ${T.accentBorder}`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: getCategoryColor(
                                    editRecord.employmentCategory
                                  ),
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  color: getCategoryColor(
                                    editRecord.employmentCategory
                                  ),
                                }}
                              >
                                {editRecord.categoryLabel}
                              </Typography>
                            </Box>
                          )}
                        </Grid>

                        {/* Custom category — only when "Other" */}
                        {(isEditing
                          ? editRecord.employmentCategory === 5
                          : editRecord.employmentCategory === 5) && (
                          <Grid item xs={12}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: T.accent,
                                mb: 0.75,
                              }}
                            >
                              Custom Description{" "}
                              {isEditing && (
                                <Box component="span" sx={{ color: "#c62828" }}>
                                  *
                                </Box>
                              )}
                            </Typography>
                            {isEditing ? (
                              <FieldInput
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
                            ) : (
                              <Box
                                sx={{
                                  p: 1.5,
                                  bgcolor: T.accentFaint,
                                  borderRadius: 2,
                                  border: `1px solid ${T.accentBorder}`,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.82rem",
                                    color: T.text,
                                  }}
                                >
                                  {editRecord.customCategory || "—"}
                                </Typography>
                              </Box>
                            )}
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
                        gap: 1.25,
                        flexShrink: 0,
                      }}
                    >
                      {!isEditing ? (
                        <>
                          <AccentButton
                            onClick={() => handleDelete(editRecord.id)}
                            variant="outlined"
                            startIcon={<DeleteIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{
                              fontSize: "0.8rem",
                              borderColor: "#e57373",
                              color: "#c62828",
                              "&:hover": {
                                bgcolor: "rgba(198,40,40,0.04)",
                                borderColor: "#c62828",
                                transform: "none",
                              },
                            }}
                          >
                            Delete
                          </AccentButton>
                          <AccentButton
                            onClick={() => setIsEditing(true)}
                            variant="contained"
                            startIcon={<EditIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{
                              fontSize: "0.8rem",
                              bgcolor: T.accent,
                              color: "#fff",
                              boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                              "&:hover": { bgcolor: T.accentDark },
                            }}
                          >
                            Edit Record
                          </AccentButton>
                        </>
                      ) : (
                        <>
                          <AccentButton
                            onClick={() => {
                              setEditRecord({ ...originalRecord });
                              setSelectedEditEmployee({
                                name: originalRecord.employeeName || "Unknown",
                                employeeNumber: originalRecord.employeeNumber,
                              });
                              setIsEditing(false);
                            }}
                            variant="outlined"
                            startIcon={<CancelIcon sx={{ fontSize: "14px !important" }} />}
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
                            onClick={handleUpdate}
                            disabled={!hasChanges()}
                            variant="contained"
                            startIcon={<SaveIcon sx={{ fontSize: "14px !important" }} />}
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
                        </>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
              severity={snackbar.severity}
              sx={{ width: "100%", borderRadius: 2 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Fade>
    </>
  );
};

export default EmploymentCategoryManagement;