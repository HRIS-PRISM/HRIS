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
  Tab,
  Tabs,
  Badge,
  Collapse,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  FormGroup,
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
  Settings as SettingsIcon,
  Assignment as AssignIcon,
  Palette as PaletteIcon,
  FolderOpen as FolderOpenIcon,
  Label as LabelIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  DragIndicator as DragIcon,
  FactCheck as DeductionPolicyIcon,
} from "@mui/icons-material";
import ReorderIcon from "@mui/icons-material/Reorder";
import LoadingOverlay from "./LoadingOverlay";
import SuccessfulOverlay from "./SuccessfulOverlay";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
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

// ─── Styled primitives ────────────────────────────────────────────────────────
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

// ─── Shimmer ─────────────────────────────────────────────────────────────────
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
            gap: 2.5,
          }}
        >
          <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
          <Box sx={{ flex: 1 }}>
            <Bone w={220} h={18} sx={{ mb: 1 }} />
            <Bone w={360} h={11} />
          </Box>
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
                height: "calc(100vh - 280px)",
                animation: `ecmPulse 2s ease-in-out ${col * 0.1}s infinite`,
              }}
            >
              <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
                {[100, 160, 120, 140, 110].map((w, i) => (
                  <Box key={i}>
                    <Bone w={w} h={10} sx={{ mb: 1 }} />
                    <Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: "#fafafa" }} />
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

// ─── Auth helper ──────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    withCredentials: true,
  };
};

// ─── Color swatch input ───────────────────────────────────────────────────────
const ColorSwatch = ({ value, onChange, disabled }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Box
      component="input"
      type="color"
      value={value || "#757575"}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      sx={{
        width: 36,
        height: 36,
        borderRadius: 1.5,
        border: `1px solid ${T.accentBorder}`,
        cursor: disabled ? "not-allowed" : "pointer",
        p: 0.25,
        bgcolor: "#fff",
      }}
    />
    <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontFamily: "monospace" }}>
      {value || "#757575"}
    </Typography>
  </Box>
);

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
    } catch { setEmployees([]); }
    finally { setIsLoading(false); }
  };

  const fetchAllEmployees = async () => {
    setIsLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/search`, getAuthHeaders());
      setEmployees(r.data);
    } catch { setEmployees([]); }
    finally { setIsLoading(false); }
  };

  const fetchEmployeeById = async (empNum) => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${empNum}`, getAuthHeaders());
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
          startAdornment: <PersonIcon sx={{ color: T.muted, mr: 1, fontSize: 15 }} />,
          endAdornment: (
            <IconButton
              onClick={() => {
                setShowDropdown(!showDropdown);
                if (!showDropdown && !employees.length && !isLoading) fetchAllEmployees();
              }}
              size="small"
              sx={{ color: T.muted }}
            >
              {showDropdown ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
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
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 2, gap: 1 }}>
              <CircularProgress size={16} sx={{ color: T.accent }} />
              <Typography variant="body2" sx={{ fontSize: "0.8rem", color: T.muted }}>Loading…</Typography>
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
                  sx={{ py: 1, px: 1.5, "&:hover": { bgcolor: T.accentFaint }, borderBottom: `1px solid ${T.divider}` }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: "0.72rem", bgcolor: T.accent, color: "#fff", fontWeight: 700 }}>
                      {emp.name?.charAt(0)?.toUpperCase() || "?"}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text }}>{emp.name}</Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>#{emp.employeeNumber}</Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.8rem", color: T.faint, fontStyle: "italic" }}>
                {query.length >= 2 ? `No employees found for "${query}"` : "Type to search or scroll to browse"}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// ─── Dynamic Category Select ──────────────────────────────────────────────────
const DynamicCategorySelect = ({ value, onChange, typeConfigs, disabled = false }) => {
  const grouped = useMemo(() => {
    const g = {};
    typeConfigs.filter(t => t.isActive).forEach(t => {
      if (!g[t.parentGroup]) g[t.parentGroup] = [];
      g[t.parentGroup].push(t);
    });
    return g;
  }, [typeConfigs]);

  return (
    <FormControl fullWidth size="small">
      <Select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        displayEmpty
        sx={{ ...selectSx, "& .MuiSelect-select": { display: "flex", alignItems: "center" } }}
        renderValue={(val) => {
          if (!val) return <Typography sx={{ color: T.faint, fontSize: "0.875rem" }}>Select a category…</Typography>;
          const found = typeConfigs.find(t => t.id === parseInt(val));
          if (!found) return val;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Circle sx={{ fontSize: 8, color: found.colorHex }} />
              <Typography sx={{ fontSize: "0.875rem" }}>{found.parentGroup} | {found.typeName}</Typography>
            </Box>
          );
        }}
      >
        <MenuItem value="" disabled>
          <Typography sx={{ color: T.faint, fontSize: "0.875rem" }}>Select a category…</Typography>
        </MenuItem>
        {Object.entries(grouped).map(([group, items]) => [
          <ListSubheader
            key={group}
            sx={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: alpha(T.accent, 0.55),
              lineHeight: "2em",
              bgcolor: T.accentFaint,
            }}
          >
            {group}
          </ListSubheader>,
          ...items.map((item) => (
            <MenuItem key={item.id} value={item.id} sx={{ py: 1, display: "flex", alignItems: "center" }}>
              <ListItemIcon sx={{ minWidth: 26, display: "flex", alignItems: "center" }}>
                <Circle sx={{ fontSize: 8, color: item.colorHex }} />
              </ListItemIcon>
              <Typography sx={{ fontSize: "0.875rem", lineHeight: 1 }}>{item.typeName}</Typography>
            </MenuItem>
          )),
        ])}
      </Select>
    </FormControl>
  );
};

const EMPLOYMENT_CLASSIFICATIONS = ["Academic - 30 Hours", "Academic - 40 Hours", "Non-Academic"];

const EMPLOYMENT_CATEGORIES = [
  "Part-Time",
  "Temporary",
  "General Administration",
  "Auxiliary",
  "Research",
  "Contractual",
  "Casual",
  "Job Order",
  "Others",
];

const JOB_ORDER_SUBCATEGORIES = ["Graduate", "Undergraduate"];

// Builds the string actually saved into typeName. Existing DB columns only — no new fields.
const computeTypeName = (category, jobOrderSubcategory, othersText) => {
  if (category === "Job Order") return `Job Order - ${jobOrderSubcategory || ""}`.trim();
  if (category === "Others") return (othersText || "").trim();
  return category || "";
};

// Tolerant match for existing Job Order rows saved with slightly different wording/punctuation.
const parseJobOrderSubcategory = (typeName) => {
  const t = String(typeName || "").trim().toLowerCase();
  if (!/^(job\s*order|jo)\b/.test(t)) return null;
  if (/under\s*-?\s*grad/.test(t)) return "Undergraduate";
  if (/\bgrad/.test(t)) return "Graduate";
  return null;
};

// Derives structured (classification/category/subcategory) state from the existing
// parentGroup/typeName columns, purely for pre-filling the edit form. Never writes anything.
const classifyExistingType = (type) => {
  const classification = EMPLOYMENT_CLASSIFICATIONS.find(
    (c) => c.toLowerCase() === String(type.parentGroup || "").trim().toLowerCase()
  );
  if (!classification) return { mode: "legacy" };

  const jobOrderSub = parseJobOrderSubcategory(type.typeName);
  if (jobOrderSub) {
    return {
      mode: "structured",
      classification,
      category: "Job Order",
      jobOrderSubcategory: jobOrderSub,
      othersText: "",
    };
  }

  const exactCategory = EMPLOYMENT_CATEGORIES.find(
    (c) =>
      c !== "Job Order" &&
      c !== "Others" &&
      c.toLowerCase() === String(type.typeName || "").trim().toLowerCase()
  );
  if (exactCategory) {
    return {
      mode: "structured",
      classification,
      category: exactCategory,
      jobOrderSubcategory: "",
      othersText: "",
    };
  }

  return { mode: "legacy" };
};

// ─── Manage Types Tab ─────────────────────────────────────────────────────────
const ManageTypesTab = ({ typeConfigs, onRefresh, showSnackbar }) => {
  const [newType, setNewType] = useState({
    classification: "",
    category: "",
    jobOrderSubcategory: "",
    othersText: "",
    colorHex: "#6d2323",
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  const grouped = useMemo(() => {
    const g = {};
    typeConfigs.forEach((t) => {
      if (!g[t.parentGroup]) g[t.parentGroup] = [];
      g[t.parentGroup].push(t);
    });
    return g;
  }, [typeConfigs]);

  const toggleGroup = (group) => setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const resetNewType = () =>
    setNewType({ classification: "", category: "", jobOrderSubcategory: "", othersText: "", colorHex: "#6d2323" });

  const handleCreate = async () => {
    const { classification, category, jobOrderSubcategory, othersText, colorHex } = newType;
    if (!classification) return showSnackbar("Employment Classification is required", "error");
    if (!category) return showSnackbar("Employment Category is required", "error");
    if (category === "Job Order" && !jobOrderSubcategory)
      return showSnackbar("Job Order Category is required", "error");
    if (category === "Others" && !othersText.trim())
      return showSnackbar("Please specify the category name", "error");

    const parentGroup = classification;
    const typeName = computeTypeName(category, jobOrderSubcategory, othersText);

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`,
        { parentGroup, typeName, colorHex },
        getAuthHeaders()
      );
      resetNewType();
      onRefresh();
      showSnackbar("Employment type created successfully", "success");
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Failed to create employment type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (type) => {
    const classified = classifyExistingType(type);
    setEditingId(type.id);
    if (classified.mode === "structured") {
      setEditData({
        isLegacy: false,
        classification: classified.classification,
        category: classified.category,
        jobOrderSubcategory: classified.jobOrderSubcategory,
        othersText: classified.othersText,
        colorHex: type.colorHex,
        isActive: type.isActive,
        sortOrder: type.sortOrder,
      });
    } else {
      setEditData({
        isLegacy: true,
        parentGroup: type.parentGroup,
        typeName: type.typeName,
        colorHex: type.colorHex,
        isActive: type.isActive,
        sortOrder: type.sortOrder,
      });
    }
  };

  const handleUpdate = async (id) => {
    let parentGroup, typeName;

    if (editData.isLegacy) {
      if (!editData.parentGroup?.trim()) return showSnackbar("Parent group is required", "error");
      if (!editData.typeName?.trim()) return showSnackbar("Type name is required", "error");
      parentGroup = editData.parentGroup.trim();
      typeName = editData.typeName.trim();
    } else {
      if (!editData.classification) return showSnackbar("Employment Classification is required", "error");
      if (!editData.category) return showSnackbar("Employment Category is required", "error");
      if (editData.category === "Job Order" && !editData.jobOrderSubcategory)
        return showSnackbar("Job Order Category is required", "error");
      if (editData.category === "Others" && !editData.othersText.trim())
        return showSnackbar("Please specify the category name", "error");
      parentGroup = editData.classification;
      typeName = computeTypeName(editData.category, editData.jobOrderSubcategory, editData.othersText);
    }

    setSubmitting(true);
    try {
      await axios.put(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config/${id}`,
        {
          parentGroup,
          typeName,
          colorHex: editData.colorHex,
          isActive: editData.isActive,
          sortOrder: editData.sortOrder,
        },
        getAuthHeaders()
      );
      setEditingId(null);
      onRefresh();
      showSnackbar("Employment type updated successfully", "success");
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Failed to update employment type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setSubmitting(true);
    try {
      await axios.delete(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config/${id}`, getAuthHeaders());
      setDeleteConfirm(null);
      onRefresh();
      showSnackbar("Employment type deleted successfully", "success");
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Failed to delete employment type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Add new type form */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent, mb: 1.5, display: "flex", alignItems: "center", gap: 0.75 }}>
          <AddIcon sx={{ fontSize: 14 }} /> Add New Employment Type
        </Typography>

        <Grid container spacing={1.5} alignItems="flex-start">
          <Grid item xs={12} sm={3}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: T.accent, mb: 0.5 }}>
              Employment Classification <Box component="span" sx={{ color: "#c62828" }}>*</Box>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={newType.classification}
                onChange={(e) =>
                  setNewType((p) => ({ ...p, classification: e.target.value, category: "", jobOrderSubcategory: "", othersText: "" }))
                }
                displayEmpty
                sx={selectSx}
              >
                <MenuItem value="" disabled>
                  <Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select classification…</Typography>
                </MenuItem>
                {EMPLOYMENT_CLASSIFICATIONS.map((c) => (
                  <MenuItem key={c} value={c}><Typography sx={{ fontSize: "0.85rem" }}>{c}</Typography></MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: T.accent, mb: 0.5 }}>
              Employment Category <Box component="span" sx={{ color: "#c62828" }}>*</Box>
            </Typography>
            <FormControl fullWidth size="small" disabled={!newType.classification}>
              <Select
                value={newType.category}
                onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value, jobOrderSubcategory: "", othersText: "" }))}
                displayEmpty
                sx={selectSx}
              >
                <MenuItem value="" disabled>
                  <Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>
                    {newType.classification ? "Select category…" : "Select classification first"}
                  </Typography>
                </MenuItem>
                {EMPLOYMENT_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}><Typography sx={{ fontSize: "0.85rem" }}>{c}</Typography></MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            {newType.category === "Job Order" ? (
              <>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: T.accent, mb: 0.5 }}>
                  Job Order Category <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={newType.jobOrderSubcategory}
                    onChange={(e) => setNewType((p) => ({ ...p, jobOrderSubcategory: e.target.value }))}
                    displayEmpty
                    sx={selectSx}
                  >
                    <MenuItem value="" disabled>
                      <Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select…</Typography>
                    </MenuItem>
                    {JOB_ORDER_SUBCATEGORIES.map((s) => (
                      <MenuItem key={s} value={s}><Typography sx={{ fontSize: "0.85rem" }}>{s}</Typography></MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : newType.category === "Others" ? (
              <>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: T.accent, mb: 0.5 }}>
                  Specify Category <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                </Typography>
                <FieldInput
                  value={newType.othersText}
                  onChange={(e) => setNewType((p) => ({ ...p, othersText: e.target.value }))}
                  placeholder="e.g. Batch 4"
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 100 }}
                />
              </>
            ) : (
              <Box sx={{ pt: 3 }}>
                <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontStyle: "italic" }}>
                  No extra field needed for this category.
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={6} sm={1.5}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: T.accent, mb: 0.5 }}>Color</Typography>
            <ColorSwatch value={newType.colorHex} onChange={(v) => setNewType((p) => ({ ...p, colorHex: v }))} />
          </Grid>

          <Grid item xs={6} sm={1.5} sx={{ display: "flex", alignItems: "flex-end" }}>
            <AccentButton
              onClick={handleCreate}
              disabled={submitting}
              variant="contained"
              fullWidth
              startIcon={submitting ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "15px !important" }} />}
              sx={{
                height: 36, bgcolor: T.accent, color: "#fff",
                "&:hover": { bgcolor: T.accentDark },
                "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" },
              }}
            >
              Add
            </AccentButton>
          </Grid>
        </Grid>

        {newType.classification && newType.category && (newType.category !== "Others" || newType.othersText.trim()) && (newType.category !== "Job Order" || newType.jobOrderSubcategory) && (
          <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: "#fff", border: `1px dashed ${T.accentBorder}` }}>
            <PaletteIcon sx={{ fontSize: 13, color: T.accent }} />
            <Typography sx={{ fontSize: "0.75rem", color: T.muted }}>
              Will be saved as:{" "}
              <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>
                {newType.classification} | {computeTypeName(newType.category, newType.jobOrderSubcategory, newType.othersText)}
              </Box>
            </Typography>
          </Box>
        )}
      </Box>

      {/* Existing types list grouped */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
        {Object.keys(grouped).length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <FolderOpenIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.2), mb: 1 }} />
            <Typography sx={{ fontSize: "0.85rem", color: T.muted }}>No employment types configured yet</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>Use the form above to add your first type.</Typography>
          </Box>
        ) : (
          Object.entries(grouped).map(([group, items]) => {
            const isExpanded = expandedGroups[group] !== false;
            return (
              <Box key={group} sx={{ mb: 1.5, borderRadius: 2, border: `1px solid ${T.accentBorder}`, overflow: "hidden" }}>
                <Box
                  onClick={() => toggleGroup(group)}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, bgcolor: alpha(T.accent, 0.05), cursor: "pointer", "&:hover": { bgcolor: alpha(T.accent, 0.08) } }}
                >
                  <FolderOpenIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent, flex: 1 }}>{group}</Typography>
                  <Chip label={`${items.length} type${items.length !== 1 ? "s" : ""}`} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 600 }} />
                  {isExpanded ? <ExpandLessIcon sx={{ fontSize: 16, color: T.muted }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: T.muted }} />}
                </Box>

                <Collapse in={isExpanded}>
                  {items.map((type, idx) => (
                    <Box key={type.id}>
                      {idx > 0 && <Divider sx={{ borderColor: T.divider }} />}
                      {editingId === type.id ? (
                        <Box sx={{ px: 2, py: 1.75, bgcolor: alpha(T.accent, 0.02) }}>
                          {editData.isLegacy && (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, p: 1, borderRadius: 1.5, bgcolor: "#FFF8E1", border: "1px solid rgba(245,124,0,0.25)" }}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#7c4300" }}>
                                This entry doesn't match the standard categories — editing as free text.
                              </Typography>
                              <Button
                                size="small"
                                onClick={() => setEditData((p) => ({ ...p, isLegacy: false, classification: "", category: "", jobOrderSubcategory: "", othersText: "" }))}
                                sx={{ fontSize: "0.68rem", textTransform: "none", fontWeight: 700, color: T.accent, whiteSpace: "nowrap" }}
                              >
                                Convert to standard options →
                              </Button>
                            </Box>
                          )}

                          {editData.isLegacy ? (
                            <Grid container spacing={1.5} alignItems="center">
                              <Grid item xs={12} sm={3.5}>
                                <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Employment Classification</Typography>
                                <FieldInput value={editData.parentGroup} onChange={(e) => setEditData((p) => ({ ...p, parentGroup: e.target.value }))} size="small" fullWidth />
                              </Grid>
                              <Grid item xs={12} sm={3.5}>
                                <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Employment Category</Typography>
                                <FieldInput value={editData.typeName} onChange={(e) => setEditData((p) => ({ ...p, typeName: e.target.value }))} size="small" fullWidth />
                              </Grid>
                              <Grid item xs={12} sm={2}>
                                <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Color</Typography>
                                <ColorSwatch value={editData.colorHex} onChange={(v) => setEditData((p) => ({ ...p, colorHex: v }))} />
                              </Grid>
                              <Grid item xs={12} sm={3} sx={{ display: "flex", gap: 0.75, alignItems: "flex-end" }}>
                                <AccentButton onClick={() => handleUpdate(type.id)} disabled={submitting} variant="contained" size="small" startIcon={<SaveIcon sx={{ fontSize: "13px !important" }} />} sx={{ fontSize: "0.75rem", height: 32, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark } }}>Save</AccentButton>
                                <AccentButton onClick={() => setEditingId(null)} variant="outlined" size="small" sx={{ fontSize: "0.75rem", height: 32, borderColor: T.accentBorder, color: T.muted }}>Cancel</AccentButton>
                              </Grid>
                            </Grid>
                          ) : (
                            <>
                              <Grid container spacing={1.5} alignItems="flex-start">
                                <Grid item xs={12} sm={3}>
                                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Employment Classification</Typography>
                                  <FormControl fullWidth size="small">
                                    <Select value={editData.classification} onChange={(e) => setEditData((p) => ({ ...p, classification: e.target.value, category: "", jobOrderSubcategory: "", othersText: "" }))} sx={selectSx} displayEmpty>
                                      <MenuItem value="" disabled><Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select…</Typography></MenuItem>
                                      {EMPLOYMENT_CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Employment Category</Typography>
                                  <FormControl fullWidth size="small" disabled={!editData.classification}>
                                    <Select value={editData.category} onChange={(e) => setEditData((p) => ({ ...p, category: e.target.value, jobOrderSubcategory: "", othersText: "" }))} sx={selectSx} displayEmpty>
                                      <MenuItem value="" disabled><Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select…</Typography></MenuItem>
                                      {EMPLOYMENT_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                  {editData.category === "Job Order" ? (
                                    <>
                                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Job Order Category</Typography>
                                      <FormControl fullWidth size="small">
                                        <Select value={editData.jobOrderSubcategory} onChange={(e) => setEditData((p) => ({ ...p, jobOrderSubcategory: e.target.value }))} sx={selectSx} displayEmpty>
                                          <MenuItem value="" disabled><Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select…</Typography></MenuItem>
                                          {JOB_ORDER_SUBCATEGORIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                        </Select>
                                      </FormControl>
                                    </>
                                  ) : editData.category === "Others" ? (
                                    <>
                                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Specify Category</Typography>
                                      <FieldInput value={editData.othersText} onChange={(e) => setEditData((p) => ({ ...p, othersText: e.target.value }))} size="small" fullWidth placeholder="e.g. Batch 4" />
                                    </>
                                  ) : null}
                                </Grid>
                                <Grid item xs={12} sm={1.5}>
                                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>Color</Typography>
                                  <ColorSwatch value={editData.colorHex} onChange={(v) => setEditData((p) => ({ ...p, colorHex: v }))} />
                                </Grid>
                                <Grid item xs={12} sm={1.5} sx={{ display: "flex", gap: 0.75, alignItems: "flex-end" }}>
                                  <AccentButton onClick={() => handleUpdate(type.id)} disabled={submitting} variant="contained" size="small" sx={{ fontSize: "0.75rem", height: 32, minWidth: 0, px: 1, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark } }}><SaveIcon sx={{ fontSize: 15 }} /></AccentButton>
                                  <AccentButton onClick={() => setEditingId(null)} variant="outlined" size="small" sx={{ fontSize: "0.75rem", height: 32, minWidth: 0, px: 1, borderColor: T.accentBorder, color: T.muted }}><CancelIcon sx={{ fontSize: 15 }} /></AccentButton>
                                </Grid>
                              </Grid>
                              {editData.classification && editData.category && (
                                <Typography sx={{ fontSize: "0.7rem", color: T.muted, mt: 1 }}>
                                  Will be saved as: <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{editData.classification} | {computeTypeName(editData.category, editData.jobOrderSubcategory, editData.othersText)}</Box>
                                </Typography>
                              )}
                            </>
                          )}
                        </Box>
                      ) : deleteConfirm === type.id ? (
                        <Box sx={{ px: 2, py: 1.25, bgcolor: "rgba(198,40,40,0.04)", display: "flex", alignItems: "center", gap: 1.5 }}>
                          <WarningIcon sx={{ fontSize: 16, color: "#c62828" }} />
                          <Typography sx={{ fontSize: "0.78rem", color: "#c62828", flex: 1 }}>Delete <strong>{type.typeName}</strong>? This cannot be undone.</Typography>
                          <AccentButton onClick={() => handleDelete(type.id)} disabled={submitting} variant="contained" size="small" sx={{ fontSize: "0.72rem", height: 28, bgcolor: "#c62828", color: "#fff", "&:hover": { bgcolor: "#b71c1c" } }}>{submitting ? "Deleting…" : "Confirm Delete"}</AccentButton>
                          <AccentButton onClick={() => setDeleteConfirm(null)} variant="outlined" size="small" sx={{ fontSize: "0.72rem", height: 28, borderColor: T.accentBorder, color: T.muted }}>Cancel</AccentButton>
                        </Box>
                      ) : (
                        <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 2, bgcolor: idx % 2 === 0 ? "#fff" : T.rowOdd, "&:hover": { bgcolor: T.rowHover } }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: type.colorHex, flexShrink: 0, border: "1.5px solid rgba(0,0,0,0.08)" }} />
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: T.text, flex: 1 }}>{type.typeName}</Typography>
                          {!type.isActive && <Chip label="Inactive" size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "#eee", color: T.muted }} />}
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="Edit type">
                              <IconButton size="small" onClick={() => startEdit(type)} sx={{ color: T.accent, p: 0.5, "&:hover": { bgcolor: T.accentFaint } }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Delete type">
                              <IconButton size="small" onClick={() => setDeleteConfirm(type.id)} sx={{ color: "#c62828", p: 0.5, "&:hover": { bgcolor: "rgba(198,40,40,0.07)" } }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Collapse>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

const DEDUCTION_CONTEXT_BLOCKS = [
  {
    key: "ABSENCE",
    title: "Absence (leave form filed)",
    hint: "Used when a full-day absence has an approved/pending leave request. Absence with no leave form is salary-only (system rule).",
  },
  {
    key: "HALF_DAY",
    title: "Half-day (leave form filed)",
    hint: "Used when a half-day has a filed leave form. Half-day without a leave form defaults to VL only (system rule).",
  },
  {
    key: "TARDINESS",
    title: "Tardiness",
    hint: "Leave types that may be charged for tardiness offsets in Earnings / policy-driven flows.",
  },
];

// ─── Deduction policy tab (employment_type_config ↔ leave types) ────────────
const DeductionPolicyTab = ({ typeConfigs, showSnackbar }) => {
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [checked, setChecked] = useState(() => ({
    ABSENCE: new Set(),
    HALF_DAY: new Set(),
    TARDINESS: new Set(),
  }));
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingTypes(true);
      try {
        const r = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`, getAuthHeaders());
        const rows = Array.isArray(r.data) ? r.data : [];
        if (alive) setLeaveTypes(rows);
      } catch {
        if (alive) {
          setLeaveTypes([]);
          showSnackbar("Could not load leave types.", "error");
        }
      } finally {
        if (alive) setLoadingTypes(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadPolicy = async (typeId) => {
    if (!typeId) {
      setChecked({
        ABSENCE: new Set(),
        HALF_DAY: new Set(),
        TARDINESS: new Set(),
      });
      return;
    }
    setLoadingPolicy(true);
    try {
      const r = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category-deduction-types/${typeId}`,
        getAuthHeaders(),
      );
      const by = r.data?.byContext || {};
      setChecked({
        ABSENCE: new Set((by.ABSENCE || []).map(Number)),
        HALF_DAY: new Set((by.HALF_DAY || []).map(Number)),
        TARDINESS: new Set((by.TARDINESS || []).map(Number)),
      });
    } catch (err) {
      showSnackbar(
        err.response?.data?.error || err.response?.data?.message || "Failed to load deduction policy.",
        "error",
      );
      setChecked({
        ABSENCE: new Set(),
        HALF_DAY: new Set(),
        TARDINESS: new Set(),
      });
    } finally {
      setLoadingPolicy(false);
    }
  };

  useEffect(() => {
    if (!selectedTypeId) {
      setChecked({
        ABSENCE: new Set(),
        HALF_DAY: new Set(),
        TARDINESS: new Set(),
      });
      return;
    }
    loadPolicy(selectedTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeId]);

  const toggleLeave = (contextKey, leaveTypeId, on) => {
    setChecked((prev) => {
      const next = {
        ABSENCE: new Set(prev.ABSENCE),
        HALF_DAY: new Set(prev.HALF_DAY),
        TARDINESS: new Set(prev.TARDINESS),
      };
      const s = next[contextKey];
      if (on) s.add(leaveTypeId);
      else s.delete(leaveTypeId);
      return next;
    });
  };

  const allLeaveTypeIds = useMemo(
    () =>
      leaveTypes
        .map((lt) => Number(lt.id))
        .filter((id) => Number.isFinite(id)),
    [leaveTypes],
  );

  const setContextIds = (contextKey, ids) => {
    setChecked((prev) => ({
      ABSENCE: new Set(prev.ABSENCE),
      HALF_DAY: new Set(prev.HALF_DAY),
      TARDINESS: new Set(prev.TARDINESS),
      [contextKey]: new Set(ids),
    }));
  };

  const selectAllInContext = (contextKey) => {
    setContextIds(contextKey, allLeaveTypeIds);
  };

  const clearAllInContext = (contextKey) => {
    setContextIds(contextKey, []);
  };

  const handleSave = async () => {
    if (!selectedTypeId) {
      showSnackbar("Select an employment category (type) first.", "error");
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category-deduction-types/${selectedTypeId}`,
        {
          ABSENCE: [...checked.ABSENCE],
          HALF_DAY: [...checked.HALF_DAY],
          TARDINESS: [...checked.TARDINESS],
        },
        getAuthHeaders(),
      );
      showSnackbar("Deduction policy saved.", "success");
      await loadPolicy(selectedTypeId);
    } catch (err) {
      showSnackbar(
        err.response?.data?.error || err.response?.data?.message || "Failed to save policy.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCfg = typeConfigs.find((t) => String(t.id) === String(selectedTypeId));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent, mb: 1 }}>
          1. Select employment category (type)
        </Typography>
        <DynamicCategorySelect
          value={selectedTypeId}
          onChange={(v) => setSelectedTypeId(String(v))}
          typeConfigs={typeConfigs}
          disabled={loadingTypes}
        />
        {selectedCfg && (
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, mt: 1 }}>
            Editing policy for <strong>{selectedCfg.parentGroup}</strong> · <strong>{selectedCfg.typeName}</strong>{" "}
            <Box component="span" sx={{ fontFamily: "monospace", color: T.faint }}>
              (id {selectedCfg.id})
            </Box>
          </Typography>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
        {!selectedTypeId ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <DeductionPolicyIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.25), mb: 1 }} />
            <Typography sx={{ fontSize: "0.85rem", color: T.muted }}>Choose an employment type above to configure allowed deduction leave types.</Typography>
          </Box>
        ) : loadingPolicy || loadingTypes ? (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} sx={{ color: T.accent }} />
          </Box>
        ) : leaveTypes.length === 0 ? (
          <Typography sx={{ fontSize: "0.82rem", color: T.muted }}>No leave types found. Configure the Leave Types module first.</Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent, mb: 1.5 }}>
              2. Allowed deduction sources (from Leave Types)
            </Typography>
            {DEDUCTION_CONTEXT_BLOCKS.map((block) => (
              <Box
                key={block.key}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${T.accentBorder}`,
                  bgcolor: "#fff",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                    mb: 0.5,
                  }}
                >
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: T.text }}>
                    {block.title}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => selectAllInContext(block.key)}
                      disabled={!allLeaveTypeIds.length}
                      sx={{
                        minWidth: 0,
                        px: 0.75,
                        py: 0.125,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: T.accent,
                        textTransform: "none",
                      }}
                    >
                      Select all
                    </Button>
                    <Typography component="span" sx={{ fontSize: "0.65rem", color: T.faint, userSelect: "none" }}>
                      ·
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => clearAllInContext(block.key)}
                      disabled={checked[block.key].size === 0}
                      sx={{
                        minWidth: 0,
                        px: 0.75,
                        py: 0.125,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: T.muted,
                        textTransform: "none",
                      }}
                    >
                      Clear all
                    </Button>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: "0.68rem", color: T.muted, mb: 1.25, lineHeight: 1.5 }}>
                  {block.hint}
                </Typography>
                <FormGroup row sx={{ flexWrap: "wrap", gap: 0.5 }}>
                  {leaveTypes.map((lt) => {
                    const id = Number(lt.id);
                    const isOn = checked[block.key].has(id);
                    const code = String(lt.leave_code || "").trim();
                    const desc = String(lt.leave_description || "").trim();
                    const label = desc && code ? `${desc} (${code})` : code || desc || `id ${id}`;
                    return (
                      <FormControlLabel
                        key={`${block.key}-${id}`}
                        control={
                          <Checkbox
                            size="small"
                            checked={isOn}
                            onChange={(e) => toggleLeave(block.key, id, e.target.checked)}
                            sx={{ py: 0.25, color: T.accent, "&.Mui-checked": { color: T.accent } }}
                          />
                        }
                        label={<Typography sx={{ fontSize: "0.78rem" }}>{label}</Typography>}
                        sx={{ mr: 1.5, ml: 0 }}
                      />
                    );
                  })}
                </FormGroup>
              </Box>
            ))}
          </>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", flexShrink: 0, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <AccentButton
          variant="contained"
          disabled={!selectedTypeId || saving || loadingPolicy}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon sx={{ fontSize: "15px !important" }} />}
          sx={{ bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#ccc" } }}
        >
          {saving ? "Saving…" : "Save deduction policy"}
        </AccentButton>
      </Box>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const EmploymentCategoryManagement = () => {
  // ── State ──
  const [employmentCategories, setEmploymentCategories] = useState([]);
  const [typeConfigs, setTypeConfigs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState(""); // ← NEW: "" = show all
  const deferredSearch = useDeferredValue(searchTerm);
  const [editRecord, setEditRecord] = useState(null);
  const [originalRecord, setOriginalRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRecord, setNewRecord] = useState({ employeeNumber: "", employmentCategory: "" });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => { setPage(0); }, [deferredSearch, filterCategory]);

  useEffect(() => {
    Promise.all([fetchEmploymentCategories(), fetchTypeConfigs()]).finally(() => setPageLoading(false));
  }, []); // eslint-disable-line

  const fetchEmploymentCategories = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, getAuthHeaders());
      setEmploymentCategories(r.data);
    } catch {
      showSnackbar("Failed to fetch employment categories.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTypeConfigs = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`, getAuthHeaders());
      setTypeConfigs(r.data.flat || []);
    } catch {
      showSnackbar("Failed to fetch employment type configurations.", "error");
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([fetchEmploymentCategories(), fetchTypeConfigs()]);
  };

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const handleCreate = async () => {
    if (!newRecord.employeeNumber) {
      showSnackbar("Please select an employee", "error");
      setErrors({ employeeNumber: "Required" });
      return;
    }
    if (!newRecord.employmentCategory) {
      showSnackbar("Please select an employment category", "error");
      setErrors({ employmentCategory: "Required" });
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        { employeeNumber: newRecord.employeeNumber, employmentCategory: newRecord.employmentCategory },
        getAuthHeaders()
      );
      setNewRecord({ employeeNumber: "", employmentCategory: "" });
      setSelectedEmployee(null);
      setErrors({});
      await fetchEmploymentCategories();
      setLoading(false);
      setSuccessAction("adding");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Failed to create employment category.", "error");
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRecord?.employeeNumber) { showSnackbar("Employee number is required.", "error"); return; }
    if (!editRecord?.employmentCategory) { showSnackbar("Please select an employment category.", "error"); return; }
    try {
      await axios.put(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${editRecord.id}`,
        { employeeNumber: editRecord.employeeNumber, employmentCategory: editRecord.employmentCategory },
        getAuthHeaders()
      );
      setEditRecord(null);
      setOriginalRecord(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      await fetchEmploymentCategories();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Failed to update employment category.", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${id}`, getAuthHeaders());
      setEditRecord(null);
      setOriginalRecord(null);
      setSelectedEditEmployee(null);
      setIsEditing(false);
      await fetchEmploymentCategories();
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
      const r = await axios.get(`${API_BASE_URL}/Remittance/employees/${record.employeeNumber}`, getAuthHeaders());
      setSelectedEditEmployee({ name: r.data.name, employeeNumber: record.employeeNumber });
    } catch {
      setSelectedEditEmployee({ name: record.employeeName || "Unknown", employeeNumber: record.employeeNumber });
    }
    setIsEditing(false);
  };

  const hasChanges = () => {
    if (!editRecord || !originalRecord) return false;
    return (
      editRecord.employeeNumber !== originalRecord.employeeNumber ||
      editRecord.employmentCategory !== originalRecord.employmentCategory
    );
  };

  const getTypeConfig = (catId) => typeConfigs.find(t => t.id === parseInt(catId));

  // ── Filtered data with category filter + text search ──────────────────────
  const filteredData = useMemo(() => {
    const q = (deferredSearch || "").toString().toLowerCase().trim();
    let data = employmentCategories;

    // 1. Apply category / group filter
    if (filterCategory) {
      const [filterType, filterValue] = filterCategory.split("||");
      data = data.filter(r =>
        filterType === "group"
          ? r.parentGroup === filterValue
          : String(r.employmentCategory) === filterValue
      );
    }

    // 2. Apply text search on top
    if (!q) return data;
    return data.filter(r =>
      r.employeeNumber?.toString().includes(q) ||
      r.employeeName?.toLowerCase().includes(q) ||
      r.categoryLabel?.toLowerCase().includes(q) ||
      r.parentGroup?.toLowerCase().includes(q) ||
      r.typeName?.toLowerCase().includes(q)
    );
  }, [employmentCategories, deferredSearch, filterCategory]);

  const pagedData = useMemo(
    () => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  // ── Grouped typeConfigs for the filter dropdown ───────────────────────────
  const groupedTypeConfigs = useMemo(() => {
    const g = {};
    typeConfigs.filter(t => t.isActive).forEach(t => {
      if (!g[t.parentGroup]) g[t.parentGroup] = [];
      g[t.parentGroup].push(t);
    });
    return g;
  }, [typeConfigs]);

  const canAdd = !loading && newRecord.employeeNumber && newRecord.employmentCategory;

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
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} showOkButton={true} />

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
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)" }} />
              <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)" }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <CategoryIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Employment Category Management
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    Administrative Panel • Assign and manage employee employment categories
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }}>
                    {employmentCategories.length} {employmentCategories.length === 1 ? "record" : "records"}
                  </Typography>
                </Box>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={handleRefreshAll} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: `1px solid ${T.divider}`, bgcolor: "#fff" }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  px: 3,
                  "& .MuiTab-root": { textTransform: "none", fontSize: "0.82rem", fontWeight: 600, minHeight: 44, color: T.muted },
                  "& .Mui-selected": { color: `${T.accent} !important` },
                  "& .MuiTabs-indicator": { bgcolor: T.accent, height: 2 },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <AssignIcon sx={{ fontSize: 15 }} />
                      Assign Categories
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <SettingsIcon sx={{ fontSize: 15 }} />
                      Manage Types
                      <Chip
                        label={typeConfigs.length}
                        size="small"
                        sx={{ height: 16, fontSize: "0.62rem", bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 700 }}
                      />
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <DeductionPolicyIcon sx={{ fontSize: 15 }} />
                      Deduction policy
                    </Box>
                  }
                />
              </Tabs>
            </Box>
          </SectionCard>

          {/* ── Tab 0: Assign Categories ── */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              {/* LEFT: Add New */}
              <Grid item xs={12} lg={4}>
                <SectionCard sx={{ height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
                  <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint }}>
                    <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Add New Category</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
                      <Box component="span" sx={{ color: "#c62828" }}>*</Box> required
                    </Typography>
                  </Box>

                  <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    <FormSectionLabel icon={PersonIcon}>Employee</FormSectionLabel>

                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>
                        Search Employee <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                      </Typography>
                      <EmployeeAutocomplete
                        value={newRecord.employeeNumber}
                        onChange={(val) => { setNewRecord(r => ({ ...r, employeeNumber: val })); setErrors(e => { const n = { ...e }; delete n.employeeNumber; return n; }); }}
                        selectedEmployee={selectedEmployee}
                        onEmployeeSelect={setSelectedEmployee}
                        placeholder="Search name or employee ID…"
                        required
                        error={!!errors.employeeNumber}
                        helperText={errors.employeeNumber || ""}
                      />
                    </Box>

                    {selectedEmployee ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: alpha(T.accent, 0.15), fontSize: "0.78rem", color: T.accent, fontWeight: 700, flexShrink: 0 }}>
                          {selectedEmployee.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>{selectedEmployee.name}</Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>#{selectedEmployee.employeeNumber}</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, py: 1.5, mb: 2.5, bgcolor: alpha(T.accent, 0.02) }}>
                        <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontStyle: "italic" }}>No employee selected yet</Typography>
                      </Box>
                    )}

                    <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                    <FormSectionLabel icon={WorkIcon}>Employment Category</FormSectionLabel>

                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>
                        Category Type <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                      </Typography>
                      {typeConfigs.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: "center", border: `1.5px dashed ${T.accentBorder}`, borderRadius: 2, bgcolor: alpha(T.accent, 0.02) }}>
                          <Typography sx={{ fontSize: "0.75rem", color: T.muted }}>
                            No types configured.{" "}
                            <Box component="span" onClick={() => setActiveTab(1)} sx={{ color: T.accent, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                              Manage Types
                            </Box>
                            {" "}to add some.
                          </Typography>
                        </Box>
                      ) : (
                        <DynamicCategorySelect
                          value={newRecord.employmentCategory}
                          onChange={(v) => { setNewRecord(r => ({ ...r, employmentCategory: v })); setErrors(e => { const n = { ...e }; delete n.employmentCategory; return n; }); }}
                          typeConfigs={typeConfigs}
                        />
                      )}
                      {errors.employmentCategory && (
                        <Typography sx={{ fontSize: "0.72rem", color: "#c62828", mt: 0.5 }}>{errors.employmentCategory}</Typography>
                      )}
                    </Box>

                    {newRecord.employmentCategory && (() => {
                      const cfg = getTypeConfig(newRecord.employmentCategory);
                      return cfg ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, mb: 2, borderRadius: 2, bgcolor: alpha(cfg.colorHex, 0.06), border: `1px solid ${alpha(cfg.colorHex, 0.2)}` }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cfg.colorHex, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: cfg.colorHex }}>
                            {cfg.parentGroup} | {cfg.typeName}
                          </Typography>
                        </Box>
                      ) : null;
                    })()}

                    <Box sx={{ mt: "auto" }}>
                      {selectedEmployee && (
                        <AccentButton
                          onClick={() => { setNewRecord({ employeeNumber: "", employmentCategory: "" }); setSelectedEmployee(null); setErrors({}); }}
                          variant="outlined"
                          fullWidth
                          sx={{ mb: 1, height: 36, fontSize: "0.8rem", borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                        >
                          Clear Form
                        </AccentButton>
                      )}
                      <AccentButton
                        onClick={handleCreate}
                        variant="contained"
                        fullWidth
                        disabled={!canAdd}
                        startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                        sx={{
                          height: 42,
                          bgcolor: canAdd ? T.accent : "#d0d0d0",
                          color: canAdd ? "#fff" : "#888",
                          boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : "none",
                          "&:hover": { bgcolor: canAdd ? T.accentDark : "#d0d0d0" },
                          "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none !important", transform: "none !important" },
                        }}
                      >
                        {loading ? "Adding…" : "Add Category"}
                      </AccentButton>
                    </Box>
                  </Box>
                </SectionCard>
              </Grid>

              {/* RIGHT: Records */}
              <Grid item xs={12} lg={8}>
                <SectionCard sx={{ height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
                  {/* Toolbar */}
                  <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <ReorderIcon sx={{ fontSize: 17, color: T.accent }} />
                        <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>Employment Category Records</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                          <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700 }}>{filteredData.length} records</Typography>
                        </Box>
                        <ToggleButtonGroup
                          value={viewMode}
                          exclusive
                          onChange={(_, v) => v && setViewMode(v)}
                          size="small"
                          sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, "&.Mui-selected": { bgcolor: T.accentFaint, color: T.accent } } }}
                        >
                          <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                          <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Box>

                    {/* ── Search + Filter row ── */}
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      {/* Search */}
                      <FieldInput
                        size="small"
                        placeholder="Search by employee ID, name, category, or group…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }}
                      />

                      {/* Category Filter */}
                      <FormControl size="small" sx={{ minWidth: 190, flexShrink: 0 }}>
                        <Select
                          value={filterCategory}
                          onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
                          displayEmpty
                          sx={{
                            ...selectSx,
                            "& .MuiSelect-select": { display: "flex", alignItems: "center", gap: 0.75 },
                          }}
                          renderValue={(val) => {
                            if (!val) return (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <LabelIcon sx={{ fontSize: 13, color: T.muted }} />
                                <Typography sx={{ fontSize: "0.8rem", color: T.faint }}>All Types</Typography>
                              </Box>
                            );
                            const [filterType, filterValue] = val.split("||");
                            if (filterType === "group") return (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <FolderOpenIcon sx={{ fontSize: 13, color: T.accent }} />
                                <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }}>{filterValue}</Typography>
                              </Box>
                            );
                            const cfg = typeConfigs.find(t => String(t.id) === filterValue);
                            return cfg ? (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Circle sx={{ fontSize: 8, color: cfg.colorHex }} />
                                <Typography sx={{ fontSize: "0.8rem", color: T.text, fontWeight: 600 }}>{cfg.typeName}</Typography>
                              </Box>
                            ) : <Typography sx={{ fontSize: "0.8rem" }}>{filterValue}</Typography>;
                          }}
                        >
                          {/* All Types option */}
                          <MenuItem value="">
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <LabelIcon sx={{ fontSize: 13, color: T.muted }} />
                              <Typography sx={{ fontSize: "0.83rem", color: T.muted }}>All Types</Typography>
                            </Box>
                          </MenuItem>

                          {/* Grouped options */}
                          {Object.entries(groupedTypeConfigs).flatMap(([group, items]) => [
                            // Group subheader
                            <ListSubheader
                              key={`gh-${group}`}
                              sx={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase",
                                color: alpha(T.accent, 0.55),
                                lineHeight: "2em",
                                bgcolor: T.accentFaint,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <FolderOpenIcon sx={{ fontSize: 11 }} />
                              {group}
                            </ListSubheader>,

                            // "All in group" shortcut
                            <MenuItem key={`group-all-${group}`} value={`group||${group}`} sx={{ py: 0.75, pl: 2.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: alpha(T.accent, 0.3), flexShrink: 0 }} />
                                <Typography sx={{ fontSize: "0.78rem", color: T.accent, fontStyle: "italic" }}>
                                  All in {group}
                                </Typography>
                              </Box>
                            </MenuItem>,

                            // Individual types
                            ...items.map(item => (
                              <MenuItem key={`type-${item.id}`} value={`type||${item.id}`} sx={{ py: 0.75, pl: 3.5 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Circle sx={{ fontSize: 8, color: item.colorHex }} />
                                  <Typography sx={{ fontSize: "0.82rem" }}>{item.typeName}</Typography>
                                </Box>
                              </MenuItem>
                            )),
                          ])}
                        </Select>
                      </FormControl>

                      {/* Clear filter button — only shown when a filter is active */}
                      {filterCategory && (
                        <Tooltip title="Clear filter">
                          <IconButton
                            size="small"
                            onClick={() => { setFilterCategory(""); setPage(0); }}
                            sx={{
                              flexShrink: 0,
                              color: T.accent,
                              border: `1px solid ${T.accentBorder}`,
                              borderRadius: 2,
                              width: 34,
                              height: 34,
                              "&:hover": { bgcolor: T.accentFaint },
                            }}
                          >
                            <Close sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Records */}
                  <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    {pagedData.length === 0 ? (
                      <Box sx={{ py: 10, textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                          <CategoryIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>
                          {employmentCategories.length === 0 ? "No categories yet" : "No records match your search"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                          {employmentCategories.length === 0
                            ? "Use the form on the left to add a category."
                            : filterCategory
                              ? "Try clearing the filter or changing your search term."
                              : "Try a different search term."}
                        </Typography>
                      </Box>
                    ) : viewMode === "grid" ? (
                      <Grid container spacing={1.5} alignItems="stretch">
                        {pagedData.map((record) => {
                          const cfg = getTypeConfig(record.employmentCategory);
                          const catColor = cfg?.colorHex || record.colorHex || "#757575";
                          return (
                            <Grid item xs={12} sm={3} key={record.id} sx={{ display: "flex" }}>
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
                                  "&:hover": { bgcolor: T.rowHover, borderColor: T.accent, transform: "translateY(-2px)", boxShadow: `0 4px 14px ${alpha(catColor, 0.12)}` },
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: catColor, flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: "0.7rem", color: T.faint }}>#{record.employeeNumber}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, mb: 1, flexGrow: 1 }} noWrap>
                                  {record.employeeName || "Loading…"}
                                </Typography>
                                {record.parentGroup && record.typeName ? (
                                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                                    <Chip
                                      label={record.parentGroup}
                                      size="small"
                                      sx={{ height: 18, fontSize: "0.65rem", fontWeight: 600, color: alpha(catColor, 0.85), bgcolor: alpha(catColor, 0.06), border: `1px solid ${alpha(catColor, 0.18)}`, borderRadius: "4px", "& .MuiChip-label": { px: 0.75 } }}
                                    />
                                    <Chip
                                      label={record.typeName}
                                      size="small"
                                      sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, color: catColor, bgcolor: alpha(catColor, 0.1), border: `1px solid ${alpha(catColor, 0.28)}`, borderRadius: "4px", "& .MuiChip-label": { px: 0.75 } }}
                                    />
                                  </Box>
                                ) : (
                                  <Chip
                                    label={record.categoryLabel || "Unassigned"}
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, color: catColor, bgcolor: alpha(catColor, 0.08), border: `1px solid ${alpha(catColor, 0.25)}`, borderRadius: "4px", "& .MuiChip-label": { px: 0.75 } }}
                                  />
                                )}
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    ) : (
                      <>
                        <Box sx={{ px: 1.5, py: 1, display: "grid", gridTemplateColumns: "110px 1fr 80px 120px", gap: 1, alignItems: "center", bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1 }}>
                          {["Emp. No", "Employee", "Group", "Type"].map((col) => (
                            <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>{col}</Typography>
                          ))}
                        </Box>
                        {pagedData.map((record, idx) => {
                          const cfg = getTypeConfig(record.employmentCategory);
                          const catColor = cfg?.colorHex || record.colorHex || "#757575";
                          return (
                            <Box
                              key={record.id}
                              onClick={() => handleOpenModal(record)}
                              sx={{
                                px: 1.5, py: 1.25,
                                display: "grid",
                                gridTemplateColumns: "110px 1fr 80px 120px",
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
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: catColor, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: "0.75rem", color: T.muted }}>{record.employeeNumber}</Typography>
                              </Box>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, color: T.text }} noWrap>{record.employeeName || "Loading…"}</Typography>
                              <Typography sx={{ fontSize: "0.72rem", color: T.muted }} noWrap>{record.parentGroup || "—"}</Typography>
                              <Chip
                                label={record.typeName || record.categoryLabel || "—"}
                                size="small"
                                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, color: catColor, bgcolor: alpha(catColor, 0.08), border: `1px solid ${alpha(catColor, 0.25)}`, borderRadius: "4px", "& .MuiChip-label": { px: 0.75 } }}
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
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[12, 24, 48, 96]}
                        sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.78rem", fontWeight: 600 } }}
                      />
                    </Box>
                  )}
                </SectionCard>
              </Grid>
            </Grid>
          )}

          {/* ── Tab 1: Manage Types ── */}
          {activeTab === 1 && (
            <SectionCard sx={{ height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                <SettingsIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Employment Type Configuration</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                  {typeConfigs.length} type{typeConfigs.length !== 1 ? "s" : ""} configured across {[...new Set(typeConfigs.map(t => t.parentGroup))].length} group{[...new Set(typeConfigs.map(t => t.parentGroup))].length !== 1 ? "s" : ""}
                </Typography>
              </Box>
              <ManageTypesTab
                typeConfigs={typeConfigs}
                onRefresh={handleRefreshAll}
                showSnackbar={showSnackbar}
              />
            </SectionCard>
          )}

          {/* ── Tab 2: Deduction policy (per employment type) ── */}
          {activeTab === 2 && (
            <SectionCard sx={{ height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                <DeductionPolicyIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Attendance deduction policy</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, maxWidth: 420, textAlign: "right", display: { xs: "none", md: "block" } }}>
                  Maps each employment type to leave types allowed in Earnings (absence / half-day / tardiness).
                </Typography>
              </Box>
              <DeductionPolicyTab typeConfigs={typeConfigs} showSnackbar={showSnackbar} />
            </SectionCard>
          )}

          {/* ── Edit / View Modal ── */}
          <Modal
            open={!!editRecord}
            onClose={() => { setEditRecord(null); setOriginalRecord(null); setSelectedEditEmployee(null); setIsEditing(false); }}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}
          >
            <Fade in={!!editRecord}>
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 520,
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
                    <Box
                      sx={{
                        px: 3.5, py: 2.5,
                        background: T.headerGrad,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "relative",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CategoryIcon sx={{ fontSize: 18, color: "#fff" }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, mb: 0.3 }}>
                            {isEditing ? "Edit Category" : "Category Details"}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.68)" }}>
                              #{editRecord.employeeNumber} • {selectedEditEmployee?.name || "—"}
                            </Typography>
                            {!isEditing && <Chip label="View mode" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 500 }} />}
                            {isEditing && <Chip label="Editing" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(255,200,0,0.22)", color: "#ffe082", fontWeight: 600 }} />}
                          </Box>
                        </Box>
                      </Box>
                      <IconButton
                        onClick={() => { setEditRecord(null); setOriginalRecord(null); setSelectedEditEmployee(null); setIsEditing(false); }}
                        size="small"
                        sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}
                      >
                        <Close sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>

                    <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                      <Divider sx={{ mb: 2.5, borderColor: T.divider }} />
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={5}>
                          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Employee</Typography>
                          {isEditing ? (
                            <EmployeeAutocomplete
                              value={editRecord?.employeeNumber || ""}
                              onChange={(val) => setEditRecord(r => ({ ...r, employeeNumber: val }))}
                              selectedEmployee={selectedEditEmployee}
                              onEmployeeSelect={setSelectedEditEmployee}
                              placeholder="Search employee…"
                              required
                            />
                          ) : (
                            <Box sx={{ p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>#{editRecord.employeeNumber}</Typography>
                              <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>{selectedEditEmployee?.name || editRecord.employeeName}</Typography>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12} sm={7}>
                          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Category Type</Typography>
                          {isEditing ? (
                            <DynamicCategorySelect
                              value={editRecord.employmentCategory}
                              onChange={(v) => setEditRecord(r => ({ ...r, employmentCategory: v }))}
                              typeConfigs={typeConfigs}
                            />
                          ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 1.5, bgcolor: T.accentFaint, borderRadius: 2, border: `1px solid ${T.accentBorder}` }}>
                              {editRecord.parentGroup && (
                                <Typography sx={{ fontSize: "0.7rem", color: T.muted, fontWeight: 600 }}>{editRecord.parentGroup}</Typography>
                              )}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: editRecord.colorHex || "#757575", flexShrink: 0 }} />
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: editRecord.colorHex || T.accent }}>
                                  {editRecord.typeName || editRecord.categoryLabel || "—"}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ p: 1.5, bgcolor: alpha(editRecord.colorHex || T.accent, 0.04), borderRadius: 2, border: `1px dashed ${alpha(editRecord.colorHex || T.accent, 0.2)}`, display: "flex", alignItems: "center", gap: 1 }}>
                            <LabelIcon sx={{ fontSize: 14, color: editRecord.colorHex || T.accent }} />
                            <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontWeight: 600 }}>Label shown in other modules:</Typography>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: editRecord.colorHex || T.accent }}>
                              {editRecord.parentGroup && editRecord.typeName
                                ? `${editRecord.parentGroup} | ${editRecord.typeName}`
                                : editRecord.categoryLabel || "—"}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1.25, flexShrink: 0 }}>
                      {!isEditing ? (
                        <>
                          <AccentButton
                            onClick={() => handleDelete(editRecord.id)}
                            variant="outlined"
                            startIcon={<DeleteIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{ fontSize: "0.8rem", borderColor: "#e57373", color: "#c62828", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}
                          >
                            Delete
                          </AccentButton>
                          <AccentButton
                            onClick={() => setIsEditing(true)}
                            variant="contained"
                            startIcon={<EditIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{ fontSize: "0.8rem", bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}
                          >
                            Edit Record
                          </AccentButton>
                        </>
                      ) : (
                        <>
                          <AccentButton
                            onClick={() => { setEditRecord({ ...originalRecord }); setSelectedEditEmployee({ name: originalRecord.employeeName || "Unknown", employeeNumber: originalRecord.employeeNumber }); setIsEditing(false); }}
                            variant="outlined"
                            startIcon={<CancelIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{ fontSize: "0.8rem", borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}
                          >
                            Cancel
                          </AccentButton>
                          <AccentButton
                            onClick={handleUpdate}
                            disabled={!hasChanges()}
                            variant="contained"
                            startIcon={<SaveIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{ fontSize: "0.8rem", bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}
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
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Fade>
    </>
  );
};

export default EmploymentCategoryManagement;

/** Compact panel for HR leave deduction flows (same data as this module). */
export { EmploymentCategoryHrPanel } from "./EmploymentCategoryHrPanel";