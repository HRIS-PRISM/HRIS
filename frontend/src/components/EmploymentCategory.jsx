import API_BASE_URL from "../apiConfig";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useDeferredValue,
} from "react";
import axios from "axios";
import { sortEmployeesByLastName } from "../utils/sortEmployeesByLastName";
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
  FolderOpen as FolderOpenIcon,
  Label as LabelIcon,
  WarningAmber as WarningIcon,
  FactCheck as DeductionPolicyIcon,
} from "@mui/icons-material";
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
  headerGrad: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
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
const ColorSwatch = ({ value, onChange, disabled, fullWidth = false }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      height: 40,
      px: 1,
      borderRadius: 2,
      border: `1px solid ${T.accentBorder}`,
      bgcolor: "#fff",
      width: fullWidth ? "100%" : "auto",
      opacity: disabled ? 0.55 : 1,
    }}
  >
    <Box
      component="input"
      type="color"
      value={value || "#757575"}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        p: 0,
        bgcolor: "transparent",
        flexShrink: 0,
        "&::-webkit-color-swatch-wrapper": { p: 0 },
        "&::-webkit-color-swatch": { border: "none", borderRadius: "4px" },
      }}
    />
    <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontFamily: "monospace", letterSpacing: "0.02em" }}>
      {(value || "#757575").toUpperCase()}
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
  const [typeSearch, setTypeSearch] = useState("");
  const deferredTypeSearch = useDeferredValue(typeSearch);

  const grouped = useMemo(() => {
    const q = deferredTypeSearch.trim().toLowerCase();
    const filtered = !q
      ? typeConfigs
      : typeConfigs.filter(
          (t) =>
            String(t.parentGroup || "").toLowerCase().includes(q) ||
            String(t.typeName || "").toLowerCase().includes(q),
        );
    const g = {};
    filtered.forEach((t) => {
      if (!g[t.parentGroup]) g[t.parentGroup] = [];
      g[t.parentGroup].push(t);
    });
    return g;
  }, [typeConfigs, deferredTypeSearch]);

  const visibleCount = Object.values(grouped).reduce((n, arr) => n + arr.length, 0);

  const resetNewType = () =>
    setNewType({ classification: "", category: "", jobOrderSubcategory: "", othersText: "", colorHex: "#6d2323" });

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

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
    setDeleteConfirm(null);
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
      cancelEdit();
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
      if (editingId === id) cancelEdit();
      onRefresh();
      showSnackbar("Employment type deleted successfully", "success");
    } catch (err) {
      showSnackbar(err.response?.data?.error || "Failed to delete employment type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !!editingId;
  const form = isEditing ? editData : newType;
  const setForm = isEditing
    ? (updater) => setEditData((p) => (typeof updater === "function" ? updater(p) : updater))
    : (updater) => setNewType((p) => (typeof updater === "function" ? updater(p) : updater));

  const previewLabel = (() => {
    if (isEditing && form.isLegacy) {
      if (!form.parentGroup?.trim() || !form.typeName?.trim()) return null;
      return `${form.parentGroup.trim()} | ${form.typeName.trim()}`;
    }
    const classification = form.classification;
    const category = form.category;
    if (!classification || !category) return null;
    if (category === "Others" && !String(form.othersText || "").trim()) return null;
    if (category === "Job Order" && !form.jobOrderSubcategory) return null;
    return `${classification} | ${computeTypeName(category, form.jobOrderSubcategory, form.othersText)}`;
  })();

  const canSubmit = (() => {
    if (isEditing && form.isLegacy) return !!(form.parentGroup?.trim() && form.typeName?.trim());
    if (!form.classification || !form.category) return false;
    if (form.category === "Job Order" && !form.jobOrderSubcategory) return false;
    if (form.category === "Others" && !String(form.othersText || "").trim()) return false;
    return true;
  })();

  const fieldLabel = (text, required = false) => (
    <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: T.accent, mb: 0.65 }}>
      {text}
      {required && (
        <Box component="span" sx={{ color: "#c62828", ml: 0.35 }}>
          *
        </Box>
      )}
    </Typography>
  );

  return (
    <Grid container spacing={2} sx={{ height: "calc(100vh - 320px)" }}>
      {/* LEFT — Add / Edit form */}
      <Grid item xs={12} lg={4} sx={{ height: { xs: "auto", lg: "100%" } }}>
        <SectionCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              px: 2.5,
              py: 1.25,
              borderBottom: `1px solid ${T.divider}`,
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: T.accentFaint,
              flexShrink: 0,
            }}
          >
            {isEditing ? <EditIcon sx={{ fontSize: 15, color: T.accent }} /> : <AddIcon sx={{ fontSize: 15, color: T.accent }} />}
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>
              {isEditing ? "Edit Category Type" : "Add Category Type"}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 2.5,
              py: 2.5,
              flexGrow: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
            }}
          >
            {isEditing && form.isLegacy && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  borderLeft: `3px solid ${T.accent}`,
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, mb: 1.25, lineHeight: 1.5 }}>
                  This entry doesn't match the standard options — editing as free text.
                </Typography>
                <AccentButton
                  size="small"
                  variant="contained"
                  fullWidth
                  onClick={() =>
                    setEditData((p) => ({
                      ...p,
                      isLegacy: false,
                      classification: "",
                      category: "",
                      jobOrderSubcategory: "",
                      othersText: "",
                    }))
                  }
                  sx={{
                    height: 34,
                    fontSize: "0.75rem",
                    bgcolor: T.accent,
                    color: "#fff",
                    boxShadow: `0 2px 8px ${alpha(T.accent, 0.28)}`,
                    "&:hover": { bgcolor: T.accentDark },
                  }}
                >
                  Convert to standard options
                </AccentButton>
              </Box>
            )}

            {isEditing && form.isLegacy ? (
              <>
                <Box>
                  {fieldLabel("Employment Classification", true)}
                  <FieldInput
                    value={form.parentGroup || ""}
                    onChange={(e) => setForm((p) => ({ ...p, parentGroup: e.target.value }))}
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box>
                  {fieldLabel("Employment Category", true)}
                  <FieldInput
                    value={form.typeName || ""}
                    onChange={(e) => setForm((p) => ({ ...p, typeName: e.target.value }))}
                    size="small"
                    fullWidth
                  />
                </Box>
              </>
            ) : (
              <>
                <Box>
                  {fieldLabel("Employment Classification", true)}
                  <FormControl fullWidth size="small">
                    <Select
                      value={form.classification || ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          classification: e.target.value,
                          category: "",
                          jobOrderSubcategory: "",
                          othersText: "",
                        }))
                      }
                      displayEmpty
                      sx={selectSx}
                    >
                      <MenuItem value="" disabled>
                        <Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select classification…</Typography>
                      </MenuItem>
                      {EMPLOYMENT_CLASSIFICATIONS.map((c) => (
                        <MenuItem key={c} value={c}>
                          <Typography sx={{ fontSize: "0.85rem" }}>{c}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  {fieldLabel("Employment Category", true)}
                  <FormControl fullWidth size="small" disabled={!form.classification}>
                    <Select
                      value={form.category || ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          category: e.target.value,
                          jobOrderSubcategory: "",
                          othersText: "",
                        }))
                      }
                      displayEmpty
                      sx={selectSx}
                    >
                      <MenuItem value="" disabled>
                        <Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>
                          {form.classification ? "Select category…" : "Select classification first"}
                        </Typography>
                      </MenuItem>
                      {EMPLOYMENT_CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          <Typography sx={{ fontSize: "0.85rem" }}>{c}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {form.category === "Job Order" && (
                  <Box>
                    {fieldLabel("Job Order Category", true)}
                    <FormControl fullWidth size="small">
                      <Select
                        value={form.jobOrderSubcategory || ""}
                        onChange={(e) => setForm((p) => ({ ...p, jobOrderSubcategory: e.target.value }))}
                        displayEmpty
                        sx={selectSx}
                      >
                        <MenuItem value="" disabled>
                          <Typography sx={{ color: T.faint, fontSize: "0.8rem" }}>Select…</Typography>
                        </MenuItem>
                        {JOB_ORDER_SUBCATEGORIES.map((s) => (
                          <MenuItem key={s} value={s}>
                            <Typography sx={{ fontSize: "0.85rem" }}>{s}</Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {form.category === "Others" && (
                  <Box>
                    {fieldLabel("Specify Category", true)}
                    <FieldInput
                      value={form.othersText || ""}
                      onChange={(e) => setForm((p) => ({ ...p, othersText: e.target.value }))}
                      placeholder="e.g. Batch 4"
                      size="small"
                      fullWidth
                      inputProps={{ maxLength: 100 }}
                    />
                  </Box>
                )}
              </>
            )}

            <Box>
              {fieldLabel("Display color")}
              <ColorSwatch
                fullWidth
                value={form.colorHex}
                onChange={(v) => setForm((p) => ({ ...p, colorHex: v }))}
              />
            </Box>

            {previewLabel && (
              <Box
                sx={{
                  px: 1.5,
                  py: 1.15,
                  borderRadius: 2,
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                  borderLeft: `3px solid ${form.colorHex || T.accent}`,
                }}
              >
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: alpha(T.accent, 0.55), mb: 0.35 }}>
                  Preview label
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.text }}>{previewLabel}</Typography>
              </Box>
            )}

            <Box sx={{ mt: "auto", pt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              {isEditing ? (
                <>
                  <AccentButton
                    onClick={() => handleUpdate(editingId)}
                    disabled={!canSubmit || submitting}
                    variant="contained"
                    fullWidth
                    startIcon={submitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon sx={{ fontSize: "16px !important" }} />}
                    sx={{
                      height: 42,
                      bgcolor: canSubmit ? T.accent : "#d0d0d0",
                      color: canSubmit ? "#fff" : "#888",
                      boxShadow: canSubmit ? `0 2px 10px ${alpha(T.accent, 0.32)}` : "none",
                      "&:hover": { bgcolor: canSubmit ? T.accentDark : "#d0d0d0" },
                      "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none !important", transform: "none !important" },
                    }}
                  >
                    {submitting ? "Saving…" : "Save Changes"}
                  </AccentButton>
                  <AccentButton
                    onClick={cancelEdit}
                    variant="outlined"
                    fullWidth
                    sx={{
                      height: 36,
                      fontSize: "0.8rem",
                      borderColor: T.accentBorder,
                      color: T.muted,
                      "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent },
                    }}
                  >
                    Cancel
                  </AccentButton>
                </>
              ) : (
                <>
                  {(form.classification || form.category) && (
                    <AccentButton
                      onClick={resetNewType}
                      variant="outlined"
                      fullWidth
                      sx={{
                        height: 36,
                        fontSize: "0.8rem",
                        borderColor: T.accentBorder,
                        color: T.muted,
                        "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent },
                      }}
                    >
                      Clear Form
                    </AccentButton>
                  )}
                  <AccentButton
                    onClick={handleCreate}
                    disabled={!canSubmit || submitting}
                    variant="contained"
                    fullWidth
                    startIcon={submitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                    sx={{
                      height: 42,
                      bgcolor: canSubmit ? T.accent : "#d0d0d0",
                      color: canSubmit ? "#fff" : "#888",
                      boxShadow: canSubmit ? `0 2px 10px ${alpha(T.accent, 0.32)}` : "none",
                      "&:hover": { bgcolor: canSubmit ? T.accentDark : "#d0d0d0" },
                      "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none !important", transform: "none !important" },
                    }}
                  >
                    {submitting ? "Adding…" : "Add Type"}
                  </AccentButton>
                </>
              )}
            </Box>
          </Box>
        </SectionCard>
      </Grid>

      {/* RIGHT — Types list */}
      <Grid item xs={12} lg={8} sx={{ height: { xs: "auto", lg: "100%" } }}>
        <SectionCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderBottom: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <SettingsIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Category Types</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                {visibleCount}
              </Typography>
            </Box>
            <FieldInput
              size="small"
              placeholder="Search…"
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 160, maxWidth: 280, ml: "auto" }}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }}
            />
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: 2,
              bgcolor: "#fafafa",
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
            }}
          >
            {typeConfigs.length === 0 ? (
              <Box sx={{ py: 10, textAlign: "center", px: 3 }}>
                <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                  <FolderOpenIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                </Box>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>No types configured yet</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>Use the form on the left to add your first employment type.</Typography>
              </Box>
            ) : visibleCount === 0 ? (
              <Box sx={{ py: 10, textAlign: "center", px: 3 }}>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>No matches</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>Try a different search term.</Typography>
              </Box>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <Box
                  key={group}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    border: `1px solid ${T.accentBorder}`,
                    bgcolor: "#fff",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.1,
                      bgcolor: alpha(T.accent, 0.04),
                      borderBottom: `1px solid ${T.divider}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: T.accent,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {group}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 600 }}>
                      {items.length} {items.length === 1 ? "type" : "types"}
                    </Typography>
                  </Box>

                  {items.map((type, idx) => {
                    const isRowEditing = editingId === type.id;
                    const isDeleting = deleteConfirm === type.id;

                    if (isDeleting) {
                      return (
                        <Box
                          key={type.id}
                          sx={{
                            px: 2,
                            py: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            flexWrap: "wrap",
                            bgcolor: "rgba(198,40,40,0.04)",
                            borderTop: idx > 0 ? `1px solid ${T.divider}` : "none",
                          }}
                        >
                          <WarningIcon sx={{ fontSize: 16, color: "#c62828", flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.78rem", color: "#c62828", flex: 1, minWidth: 140 }}>
                            Delete <strong>{type.typeName}</strong>?
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.75 }}>
                            <AccentButton
                              onClick={() => handleDelete(type.id)}
                              disabled={submitting}
                              variant="contained"
                              size="small"
                              sx={{ fontSize: "0.72rem", height: 30, px: 1.5, bgcolor: "#c62828", color: "#fff", "&:hover": { bgcolor: "#b71c1c" } }}
                            >
                              {submitting ? "Deleting…" : "Delete"}
                            </AccentButton>
                            <AccentButton
                              onClick={() => setDeleteConfirm(null)}
                              variant="outlined"
                              size="small"
                              sx={{ fontSize: "0.72rem", height: 30, px: 1.5, borderColor: T.accentBorder, color: T.muted }}
                            >
                              Cancel
                            </AccentButton>
                          </Box>
                        </Box>
                      );
                    }

                    return (
                      <Box
                        key={type.id}
                        sx={{
                          px: 2,
                          py: 1.35,
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          borderTop: idx > 0 ? `1px solid ${T.divider}` : "none",
                          bgcolor: isRowEditing ? T.accentFaint : "#fff",
                          borderLeft: isRowEditing ? `3px solid ${T.accent}` : "3px solid transparent",
                          transition: "background 0.13s ease",
                          "&:hover": {
                            bgcolor: isRowEditing ? T.accentFaint : alpha(T.accent, 0.03),
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: type.colorHex || T.accent,
                            flexShrink: 0,
                            border: "1px solid rgba(0,0,0,0.1)",
                          }}
                        />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }} noWrap>
                            {type.typeName}
                          </Typography>
                          {(isRowEditing || !type.isActive) && (
                            <Typography sx={{ fontSize: "0.68rem", color: isRowEditing ? T.accent : T.faint, fontWeight: 600, mt: 0.15 }}>
                              {isRowEditing ? "Editing in form" : "Inactive"}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                          <AccentButton
                            size="small"
                            variant={isRowEditing ? "contained" : "outlined"}
                            onClick={() => startEdit(type)}
                            startIcon={<EditIcon sx={{ fontSize: "13px !important" }} />}
                            sx={{
                              height: 30,
                              fontSize: "0.72rem",
                              px: 1.25,
                              ...(isRowEditing
                                ? {
                                    bgcolor: T.accent,
                                    color: "#fff",
                                    "&:hover": { bgcolor: T.accentDark },
                                  }
                                : {
                                    borderColor: T.accentBorder,
                                    color: T.accent,
                                    "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                                  }),
                            }}
                          >
                            Edit
                          </AccentButton>
                          <AccentButton
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              cancelEdit();
                              setDeleteConfirm(type.id);
                            }}
                            startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />}
                            sx={{
                              height: 30,
                              fontSize: "0.72rem",
                              px: 1.25,
                              borderColor: "rgba(198,40,40,0.35)",
                              color: "#c62828",
                              "&:hover": { bgcolor: "rgba(198,40,40,0.06)", borderColor: "#c62828" },
                            }}
                          >
                            Delete
                          </AccentButton>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ))
            )}
          </Box>
        </SectionCard>
      </Grid>
    </Grid>
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
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fff", flexShrink: 0 }}>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: alpha(T.accent, 0.5), mb: 1 }}>
          Employment type
        </Typography>
        <DynamicCategorySelect
          value={selectedTypeId}
          onChange={(v) => setSelectedTypeId(String(v))}
          typeConfigs={typeConfigs}
          disabled={loadingTypes}
        />
        {selectedCfg && (
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, mt: 1 }}>
            Policy for <Box component="span" sx={{ fontWeight: 700, color: T.text }}>{selectedCfg.parentGroup}</Box>
            {" · "}
            <Box component="span" sx={{ fontWeight: 700, color: T.text }}>{selectedCfg.typeName}</Box>
          </Typography>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, bgcolor: alpha(T.accent, 0.015), "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
        {!selectedTypeId ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5 }}>
              <DeductionPolicyIcon sx={{ fontSize: 28, color: alpha(T.accent, 0.35) }} />
            </Box>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>No type selected</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>Choose an employment type above to configure deduction leave types.</Typography>
          </Box>
        ) : loadingPolicy || loadingTypes ? (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} sx={{ color: T.accent }} />
          </Box>
        ) : leaveTypes.length === 0 ? (
          <Typography sx={{ fontSize: "0.82rem", color: T.muted }}>No leave types found. Configure the Leave Types module first.</Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: alpha(T.accent, 0.5), mb: 1.5 }}>
              Allowed deduction sources
            </Typography>
            {DEDUCTION_CONTEXT_BLOCKS.map((block) => (
              <Box
                key={block.key}
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${T.accentBorder}`,
                  bgcolor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                  }}
                >
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text }}>
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
                <Typography sx={{ fontSize: "0.68rem", color: T.muted, mb: 1, lineHeight: 1.5, px: 2 }}>
                  {block.hint}
                </Typography>
                <FormGroup row sx={{ flexWrap: "wrap", gap: 0.5, px: 2, pb: 1.5 }}>
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
                        label={<Typography sx={{ fontSize: "0.78rem", color: T.text }}>{label}</Typography>}
                        sx={{
                          mr: 1,
                          ml: 0,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1.5,
                          border: `1px solid ${isOn ? T.accentBorder : "transparent"}`,
                          bgcolor: isOn ? T.accentFaint : "transparent",
                          "&:hover": { bgcolor: T.accentHover },
                        }}
                      />
                    );
                  })}
                </FormGroup>
              </Box>
            ))}
          </>
        )}
      </Box>

      <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", flexShrink: 0, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <AccentButton
          variant="contained"
          disabled={!selectedTypeId || saving || loadingPolicy}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon sx={{ fontSize: "15px !important" }} />}
          sx={{
            bgcolor: T.accent,
            color: "#fff",
            boxShadow: `0 2px 10px ${alpha(T.accent, 0.28)}`,
            "&:hover": { bgcolor: T.accentDark },
            "&:disabled": { bgcolor: "#d0d0d0", boxShadow: "none" },
          }}
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
  const [viewMode, setViewMode] = useState("list");
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
    if (q) {
      data = data.filter(r =>
        r.employeeNumber?.toString().includes(q) ||
        r.employeeName?.toLowerCase().includes(q) ||
        r.categoryLabel?.toLowerCase().includes(q) ||
        r.parentGroup?.toLowerCase().includes(q) ||
        r.typeName?.toLowerCase().includes(q)
      );
    }

    // 3. Alphabetical by last name (A–Z first; specials / empty last)
    return sortEmployeesByLastName(data, (r) => r.employeeName || r);
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    bgcolor: alpha(T.accent, 0.12),
                    border: `1px solid ${T.accentBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <WorkIcon sx={{ fontSize: 26, color: T.accent }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>
                    Employment Classification
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>
                    HR Records • Assign employment categories and manage payroll deduction types
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                <Box sx={{ px: 1.5, py: 0.65, borderRadius: 1.5, bgcolor: "#fff", border: `1px solid ${T.accentBorder}`, textAlign: "center", minWidth: 72 }}>
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: T.accent, lineHeight: 1.1 }}>
                    {employmentCategories.length.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Employees
                  </Typography>
                </Box>
                <Box sx={{ px: 1.5, py: 0.65, borderRadius: 1.5, bgcolor: "#fff", border: `1px solid ${T.accentBorder}`, textAlign: "center", minWidth: 72 }}>
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: T.accent, lineHeight: 1.1 }}>
                    {typeConfigs.length}
                  </Typography>
                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Types
                  </Typography>
                </Box>
                <Tooltip title="Refresh HR data">
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
                      <PersonIcon sx={{ fontSize: 15 }} />
                      Employee Assignments
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <SettingsIcon sx={{ fontSize: 15 }} />
                      Category Setup
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
                      Deduction Policy
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
                    <AssignIcon sx={{ fontSize: 15, color: T.accent }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Assign Employment Category</Typography>
                  </Box>

                  <Box sx={{ px: 3.5, py: 3, flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    <FormSectionLabel icon={PersonIcon}>Employee Information</FormSectionLabel>

                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>
                        Employee <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                      </Typography>
                      <EmployeeAutocomplete
                        value={newRecord.employeeNumber}
                        onChange={(val) => { setNewRecord(r => ({ ...r, employeeNumber: val })); setErrors(e => { const n = { ...e }; delete n.employeeNumber; return n; }); }}
                        selectedEmployee={selectedEmployee}
                        onEmployeeSelect={setSelectedEmployee}
                        placeholder="Search by name or employee number…"
                        required
                        error={!!errors.employeeNumber}
                        helperText={errors.employeeNumber || ""}
                      />
                    </Box>

                    {selectedEmployee ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.35, mb: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: T.accent, color: "#fff", fontSize: "0.78rem", fontWeight: 800, borderRadius: "8px", flexShrink: 0 }}>
                          {selectedEmployee.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }} noWrap>{selectedEmployee.name}</Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>Employee No. {selectedEmployee.employeeNumber}</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${T.accentBorder}`, borderRadius: 2, py: 2, mb: 2.5, bgcolor: alpha(T.accent, 0.02) }}>
                        <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>Select an employee to continue</Typography>
                      </Box>
                    )}

                    <Divider sx={{ borderColor: T.divider, mb: 2.5 }} />

                    <FormSectionLabel icon={WorkIcon}>Classification Details</FormSectionLabel>

                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>
                        Employment Category <Box component="span" sx={{ color: "#c62828" }}>*</Box>
                      </Typography>
                      {typeConfigs.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: "center", border: `1px dashed ${T.accentBorder}`, borderRadius: 2, bgcolor: alpha(T.accent, 0.02) }}>
                          <Typography sx={{ fontSize: "0.75rem", color: T.muted }}>
                            No categories configured.{" "}
                            <Box component="span" onClick={() => setActiveTab(1)} sx={{ color: T.accent, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                              Category Setup
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
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 1.5, py: 1.15, mb: 2, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: cfg.colorHex || T.accent, mt: 0.55, flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.2 }}>
                              Assignment preview
                            </Typography>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text }}>
                              {cfg.parentGroup} · {cfg.typeName}
                            </Typography>
                          </Box>
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
                          Clear
                        </AccentButton>
                      )}
                      <AccentButton
                        onClick={handleCreate}
                        variant="contained"
                        fullWidth
                        disabled={!canAdd}
                        startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AssignIcon sx={{ fontSize: "16px !important" }} />}
                        sx={{
                          height: 42,
                          bgcolor: canAdd ? T.accent : "#d0d0d0",
                          color: canAdd ? "#fff" : "#888",
                          boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : "none",
                          "&:hover": { bgcolor: canAdd ? T.accentDark : "#d0d0d0" },
                          "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none !important", transform: "none !important" },
                        }}
                      >
                        {loading ? "Saving…" : "Save Assignment"}
                      </AccentButton>
                    </Box>
                  </Box>
                </SectionCard>
              </Grid>

              {/* RIGHT: Records */}
              <Grid item xs={12} lg={8}>
                <SectionCard sx={{ height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
                  {/* Toolbar */}
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.75,
                      borderBottom: `1px solid ${T.divider}`,
                      bgcolor: T.accentFaint,
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.35, gap: 1, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <PersonIcon sx={{ fontSize: 17, color: T.accent }} />
                        <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>
                          Employee Category Records
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            px: 1.35,
                            py: 0.35,
                            borderRadius: 1.5,
                            bgcolor: alpha(T.accent, 0.08),
                            border: `1px solid ${alpha(T.accent, 0.15)}`,
                          }}
                        >
                          <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700 }}>
                            {filteredData.length.toLocaleString()} employees
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
                              py: 0.45,
                              border: `1px solid ${T.accentBorder}`,
                              color: T.muted,
                              "&.Mui-selected": { bgcolor: alpha(T.accent, 0.12), color: T.accent },
                            },
                          }}
                        >
                          <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 15 }} /></ToggleButton>
                          <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 15 }} /></ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <FieldInput
                        size="small"
                        placeholder="Search by employee number, name, or category…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flex: 1, minWidth: 180 }}
                        InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }}
                      />

                      <FormControl size="small" sx={{ minWidth: 160, flexShrink: 0 }}>
                        <Select
                          value={filterCategory}
                          onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
                          displayEmpty
                          sx={{
                            ...selectSx,
                            "& .MuiSelect-select": { display: "flex", alignItems: "center", gap: 0.75, py: 0.85 },
                          }}
                          renderValue={(val) => {
                            if (!val) return (
                              <Typography sx={{ fontSize: "0.8rem", color: T.faint }}>All classifications</Typography>
                            );
                            const [filterType, filterValue] = val.split("||");
                            if (filterType === "group") return (
                              <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }} noWrap>{filterValue}</Typography>
                            );
                            const cfg = typeConfigs.find(t => String(t.id) === filterValue);
                            return cfg ? (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                                <Circle sx={{ fontSize: 8, color: cfg.colorHex, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: "0.8rem", color: T.text, fontWeight: 600 }} noWrap>{cfg.typeName}</Typography>
                              </Box>
                            ) : <Typography sx={{ fontSize: "0.8rem" }}>{filterValue}</Typography>;
                          }}
                        >
                          <MenuItem value="">
                            <Typography sx={{ fontSize: "0.83rem", color: T.muted }}>All classifications</Typography>
                          </MenuItem>
                          {Object.entries(groupedTypeConfigs).flatMap(([group, items]) => [
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
                              }}
                            >
                              {group}
                            </ListSubheader>,
                            <MenuItem key={`group-all-${group}`} value={`group||${group}`} sx={{ py: 0.75, pl: 2 }}>
                              <Typography sx={{ fontSize: "0.78rem", color: T.accent, fontStyle: "italic" }}>
                                All in {group}
                              </Typography>
                            </MenuItem>,
                            ...items.map(item => (
                              <MenuItem key={`type-${item.id}`} value={`type||${item.id}`} sx={{ py: 0.75, pl: 3 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Circle sx={{ fontSize: 8, color: item.colorHex }} />
                                  <Typography sx={{ fontSize: "0.82rem" }}>{item.typeName}</Typography>
                                </Box>
                              </MenuItem>
                            )),
                          ])}
                        </Select>
                      </FormControl>

                      {filterCategory && (
                        <Tooltip title="Clear filter">
                          <IconButton
                            size="small"
                            onClick={() => { setFilterCategory(""); setPage(0); }}
                            sx={{
                              color: T.accent,
                              border: `1px solid ${T.accentBorder}`,
                              borderRadius: 1.5,
                              width: 34,
                              height: 34,
                              "&:hover": { bgcolor: T.accentHover },
                            }}
                          >
                            <Close sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Records */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: "auto",
                      p: viewMode === "grid" ? 2 : 0,
                      bgcolor: viewMode === "grid" ? "#fafafa" : "#fff",
                      "&::-webkit-scrollbar": { width: 4 },
                      "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
                    }}
                  >
                    {pagedData.length === 0 ? (
                      <Box sx={{ py: 10, textAlign: "center", px: 2 }}>
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
                          const catColor = cfg?.colorHex || record.colorHex || T.accent;
                          const groupLabel = record.parentGroup || "";
                          const typeLabel = record.typeName || record.categoryLabel || "Unassigned";
                          const name = record.employeeName || "Loading…";
                          return (
                            <Grid item xs={12} sm={6} md={4} key={record.id} sx={{ display: "flex" }}>
                              <Box
                                onClick={() => handleOpenModal(record)}
                                sx={{
                                  width: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  p: 1.75,
                                  borderRadius: 2,
                                  cursor: "pointer",
                                  bgcolor: "#fff",
                                  border: `1px solid ${T.accentBorder}`,
                                  transition: "all 0.13s",
                                  "&:hover": {
                                    bgcolor: T.rowHover,
                                    borderColor: T.accent,
                                    transform: "translateY(-2px)",
                                    boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}`,
                                  },
                                }}
                              >
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.25 }} noWrap title={name}>
                                  {name}
                                </Typography>
                                <Typography sx={{ fontSize: "0.68rem", color: T.faint, mb: 0.85 }}>
                                  Emp. No. {record.employeeNumber}
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      bgcolor: catColor,
                                      flexShrink: 0,
                                      border: "1px solid rgba(0,0,0,0.08)",
                                    }}
                                  />
                                  <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontWeight: 600 }} noWrap>
                                    {groupLabel ? `${groupLabel} · ${typeLabel}` : typeLabel}
                                  </Typography>
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
                            px: 2.5,
                            py: 1.1,
                            display: "grid",
                            gridTemplateColumns: "minmax(200px, 2fr) minmax(120px, 1fr) minmax(120px, 1.2fr)",
                            gap: 1.5,
                            alignItems: "center",
                            bgcolor: T.accent,
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                          }}
                        >
                          {["Employee", "Employment Classification", "Category Type"].map((col) => (
                            <Typography
                              key={col}
                              sx={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                color: "#fff",
                                textTransform: "uppercase",
                                letterSpacing: "0.07em",
                              }}
                            >
                              {col}
                            </Typography>
                          ))}
                        </Box>
                        {pagedData.map((record, idx) => {
                          const cfg = getTypeConfig(record.employmentCategory);
                          const catColor = cfg?.colorHex || record.colorHex || T.accent;
                          const name = record.employeeName || "Loading…";
                          return (
                            <Box
                              key={record.id}
                              onClick={() => handleOpenModal(record)}
                              sx={{
                                px: 2.5,
                                py: 1.25,
                                display: "grid",
                                gridTemplateColumns: "minmax(200px, 2fr) minmax(120px, 1fr) minmax(120px, 1.2fr)",
                                gap: 1.5,
                                alignItems: "center",
                                cursor: "pointer",
                                bgcolor: idx % 2 === 0 ? "#fff" : T.rowOdd,
                                borderBottom: `1px solid ${T.divider}`,
                                transition: "background 0.12s",
                                "&:hover": { bgcolor: T.rowHover },
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.text }} noWrap>
                                  {name}
                                </Typography>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint }}>
                                  Emp. No. {record.employeeNumber}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: "0.75rem", color: T.muted }} noWrap>
                                {record.parentGroup || "—"}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.85, minWidth: 0 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: catColor,
                                    flexShrink: 0,
                                    border: "1px solid rgba(0,0,0,0.08)",
                                  }}
                                />
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: T.text }} noWrap>
                                  {record.typeName || record.categoryLabel || "—"}
                                </Typography>
                              </Box>
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
            <ManageTypesTab
              typeConfigs={typeConfigs}
              onRefresh={handleRefreshAll}
              showSnackbar={showSnackbar}
            />
          )}

          {/* ── Tab 2: Deduction policy (per employment type) ── */}
          {activeTab === 2 && (
            <SectionCard sx={{ height: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                <DeductionPolicyIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Leave Deduction Policy</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, maxWidth: 420, textAlign: "right", display: { xs: "none", md: "block" } }}>
                  Map each employment category to leave types used for absence, half-day, and tardiness.
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
                            {isEditing ? "Edit Assignment" : "Employee Assignment"}
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
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: T.accentFaint,
                              borderRadius: 2,
                              border: `1px solid ${T.accentBorder}`,
                              borderLeft: `3px solid ${editRecord.colorHex || T.accent}`,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <LabelIcon sx={{ fontSize: 14, color: T.accent }} />
                            <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontWeight: 600 }}>Label in other modules:</Typography>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text }}>
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
                            Edit Assignment
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