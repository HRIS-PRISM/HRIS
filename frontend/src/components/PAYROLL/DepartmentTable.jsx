import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Modal,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  Fade,
  Avatar,
  Tooltip,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Card,
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
  Refresh,
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";

import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import AccessDenied from "../AccessDenied";
import { useNavigate } from "react-router-dom";
import usePageAccess from "../../hooks/usePageAccess";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePayrollRealtimeRefresh from "../../hooks/usePayrollRealtimeRefresh";

// ── Theme tokens (mirrors DepartmentAssignment) ───────────────
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

const scrollbarSx = {
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
};

// ── Styled components ─────────────────────────────────────────
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

// ── Auth helper ───────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

// ── Grid card ─────────────────────────────────────────────────
const DeptCard = ({ department, onClick }) => (
  <Box
    onClick={onClick}
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: alpha(T.accent, 0.1),
          color: T.accent,
        }}
      >
        <DomainIcon sx={{ fontSize: 14 }} />
      </Avatar>
    </Box>
    <Box>
      <Typography sx={{ fontSize: "0.68rem", color: T.faint, mb: 0.1 }}>
        Code
      </Typography>
      <Typography
        sx={{
          fontSize: "0.82rem",
          fontWeight: 700,
          color: T.text,
          lineHeight: 1.2,
        }}
        noWrap
      >
        {department.code}
      </Typography>
      {department.description && (
        <Typography sx={{ fontSize: "0.7rem", color: T.muted, mt: 0.2 }} noWrap>
          {department.description}
        </Typography>
      )}
    </Box>
  </Box>
);

// ── List row ──────────────────────────────────────────────────
const DeptRow = ({ department, index, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      px: 2,
      py: 1.25,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      borderRadius: 1.5,
      cursor: "pointer",
      bgcolor: index % 2 === 0 ? T.rowEven : T.rowOdd,
      border: "1px solid transparent",
      transition: "background 0.13s ease",
      "&:hover": { bgcolor: T.rowHover },
      mb: 0.5,
    }}
  >
    <DomainIcon sx={{ fontSize: 16, color: T.accent, flexShrink: 0 }} />
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{ fontSize: "0.83rem", fontWeight: 600, color: T.text }}
        noWrap
      >
        {department.code}
      </Typography>
      {department.description && (
        <Typography sx={{ fontSize: "0.72rem", color: T.muted }} noWrap>
          {department.description}
        </Typography>
      )}
    </Box>
  </Box>
);

// ════════════════════════════════════════════════════════════
// ── Main Component
// ════════════════════════════════════════════════════════════
const DepartmentTable = () => {
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [newEntry, setNewEntry] = useState({ code: "", description: "" });
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalDepartment, setOriginalDepartment] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const { hasAccess, loading: accessLoading } =
    usePageAccess("department-table");

  useEffect(() => {
    fetchData();
  }, []);

  usePayrollRealtimeRefresh(() => {
    fetchData();
  });

  const fetchData = async () => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/department-table`,
        getAuthHeaders(),
      );
      setData(Array.isArray(r.data) ? r.data : []);
    } catch {
      showSnackbar(
        "Failed to fetch department data. Please try again.",
        "error",
      );
    }
  };

  const addEntry = async () => {
    if (!newEntry.code || !newEntry.description) {
      showSnackbar("Please fill in all required fields", "error");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/department-table`,
        newEntry,
        getAuthHeaders(),
      );
      setNewEntry({ code: "", description: "" });
      fetchData();
      setTimeout(() => {
        setLoading(false);
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
    } catch {
      setLoading(false);
      showSnackbar("Failed to add department. Please try again.", "error");
    }
  };

  const startEditing = (item) => {
    setSelectedDepartment(item);
    setOriginalDepartment({ ...item });
    setEditData({ code: item.code, description: item.description });
    setModalOpen(true);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setSelectedDepartment({ ...originalDepartment });
    setEditData({
      code: originalDepartment.code,
      description: originalDepartment.description,
    });
    setIsEditing(false);
  };

  const saveEdit = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/department-table/${selectedDepartment.id}`,
        editData,
        getAuthHeaders(),
      );
      setModalOpen(false);
      setSelectedDepartment(null);
      setOriginalDepartment(null);
      setIsEditing(false);
      fetchData();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch {
      showSnackbar("Failed to update department. Please try again.", "error");
    }
  };

  const deleteEntry = async (id) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/department-table/${id}`,
        getAuthHeaders(),
      );
      setModalOpen(false);
      setSelectedDepartment(null);
      setOriginalDepartment(null);
      setIsEditing(false);
      fetchData();
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch {
      showSnackbar("Failed to delete department. Please try again.", "error");
    }
  };

  const hasChanges = () =>
    editData.code !== originalDepartment?.code ||
    editData.description !== originalDepartment?.description;

  const filteredData = data.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      (d.code?.toLowerCase() || "").includes(term) ||
      (d.description?.toLowerCase() || "").includes(term)
    );
  });

  // ── Access guards ────────────────────────────────────────────
  if (accessLoading)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress sx={{ color: T.accent, mb: 2 }} />
        <Typography sx={{ color: T.accent }}>
          Loading access information…
        </Typography>
      </Box>
    );

  if (hasAccess === false)
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Department Information. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );

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
        <LoadingOverlay open={loading} message="Processing department record…" />

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
                display: "flex",
                alignItems: "center",
                gap: 3,
                position: "relative",
                zIndex: 1,
              }}
            >
              <DomainIcon sx={{ fontSize: 32, color: T.accent }} />
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
                  Department Information Management
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: T.accentMid,
                    fontWeight: 700,
                    opacity: 0.9,
                  }}
                >
                  Administrative Panel • Add and manage department records
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
                  {data.length}{" "}
                  {data.length === 1 ? "department" : "departments"}
                </Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={() => fetchData()}
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
          {/* ── LEFT: Add Form ── */}
          <Grid item xs={12} lg={5}>
            <SectionCard
              sx={{
                height: "calc(100vh - 280px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Section label */}
              <Box
                sx={{
                  px: 3,
                  py: 1.25,
                  borderBottom: `1px solid ${T.divider}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  bgcolor: T.accentFaint,
                  flexShrink: 0,
                }}
              >
                <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                <Typography
                  sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}
                >
                  Add New Department
                </Typography>
              </Box>

              {/* Fields */}
              <Box sx={{ px: 3, pt: 2.5, pb: 1, flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: alpha(T.accent, 0.55),
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    mb: 0.75,
                  }}
                >
                  Department Code{" "}
                  <Box component="span" sx={{ color: "#c62828" }}>
                    *
                  </Box>
                </Typography>
                <FieldInput
                  value={newEntry.code}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, code: e.target.value })
                  }
                  placeholder="e.g. HR, FINANCE, IT"
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <DomainIcon
                        sx={{ color: T.muted, mr: 1, fontSize: 15 }}
                      />
                    ),
                  }}
                />

                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: alpha(T.accent, 0.55),
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    mb: 0.75,
                    mt: 2,
                  }}
                >
                  Description{" "}
                  <Box component="span" sx={{ color: "#c62828" }}>
                    *
                  </Box>
                </Typography>
                <FieldInput
                  value={newEntry.description}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                  placeholder="e.g. Human Resources"
                  fullWidth
                  size="small"
                />
              </Box>

              <Box sx={{ flex: 1 }} />

              {/* Submit */}
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  borderTop: `1px solid ${T.divider}`,
                  bgcolor: T.accentFaint,
                  flexShrink: 0,
                }}
              >
                <AccentButton
                  onClick={addEntry}
                  variant="contained"
                  startIcon={
                    loading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <AddIcon sx={{ fontSize: "16px !important" }} />
                    )
                  }
                  fullWidth
                  disabled={loading}
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
                  {loading ? "Adding…" : "Add Department"}
                </AccentButton>
              </Box>
            </SectionCard>
          </Grid>

          {/* ── RIGHT: Records ── */}
          <Grid item xs={12} lg={7}>
            <SectionCard
              sx={{
                height: "calc(100vh - 280px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Section header */}
              <Box
                sx={{
                  px: 3.5,
                  py: 2,
                  borderBottom: `1px solid ${T.divider}`,
                  bgcolor: T.accentFaint,
                  flexShrink: 0,
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
                    <DomainIcon sx={{ fontSize: 17, color: T.accent }} />
                    <Typography
                      sx={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: T.text,
                      }}
                    >
                      Department Records
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
                        {filteredData.length} dept
                        {filteredData.length !== 1 ? "s" : ""}
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
                  placeholder="Search by code or description…"
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

              {/* Content */}
              <Box
                sx={{ flexGrow: 1, overflowY: "auto", p: 2, ...scrollbarSx }}
              >
                {filteredData.length === 0 ? (
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
                      <DomainIcon
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
                      {data.length === 0
                        ? "No departments yet"
                        : "No departments match your search"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                      {data.length === 0
                        ? "Use the form on the left to add a department."
                        : "Try a different search term."}
                    </Typography>
                  </Box>
                ) : viewMode === "grid" ? (
                  <Grid container spacing={1.5}>
                    {filteredData.map((dept) => (
                      <Grid item xs={6} sm={4} md={3} key={dept.id}>
                        <DeptCard
                          department={dept}
                          onClick={() => startEditing(dept)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <>
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        bgcolor: alpha(T.accent, 0.04),
                        borderRadius: 1.5,
                        mb: 1,
                      }}
                    >
                      {["Code / Description"].map((col) => (
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
                    {filteredData.map((dept, i) => (
                      <DeptRow
                        key={dept.id}
                        department={dept}
                        index={i}
                        onClick={() => startEditing(dept)}
                      />
                    ))}
                  </>
                )}
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        {/* ── Edit Modal ── */}
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
                maxWidth: 560,
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                outline: "none",
                bgcolor: T.surface,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {selectedDepartment && (
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
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: "rgba(255,255,255,0.15)",
                          color: "#fff",
                        }}
                      >
                        <DomainIcon sx={{ fontSize: 22 }} />
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
                          {isEditing ? "Edit Department" : "Department Details"}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            color: "rgba(255,255,255,0.68)",
                            mt: 0.3,
                          }}
                        >
                          {selectedDepartment.code}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={() => setModalOpen(false)}
                      size="small"
                      sx={{
                        color: "rgba(255,255,255,0.75)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Close sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>

                  {/* Modal body */}
                  <Box sx={{ p: 3, ...scrollbarSx }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: alpha(T.accent, 0.55),
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            mb: 0.75,
                          }}
                        >
                          Department Code
                        </Typography>
                        {isEditing ? (
                          <FieldInput
                            value={editData.code}
                            onChange={(e) =>
                              setEditData({ ...editData, code: e.target.value })
                            }
                            fullWidth
                            size="small"
                          />
                        ) : (
                          <Typography
                            sx={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              color: T.text,
                            }}
                          >
                            {selectedDepartment.code}
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: alpha(T.accent, 0.55),
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            mb: 0.75,
                          }}
                        >
                          Description
                        </Typography>
                        {isEditing ? (
                          <FieldInput
                            value={editData.description}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                description: e.target.value,
                              })
                            }
                            fullWidth
                            size="small"
                          />
                        ) : (
                          <Typography
                            sx={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              color: T.text,
                            }}
                          >
                            {selectedDepartment.description || "—"}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Modal footer */}
                  <Box
                    sx={{
                      p: 2,
                      borderTop: `1px solid ${T.divider}`,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 1.5,
                      bgcolor: "#fff",
                    }}
                  >
                    {!isEditing ? (
                      <>
                        <AccentButton
                          onClick={() => deleteEntry(selectedDepartment.id)}
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
                          Delete
                        </AccentButton>
                        <AccentButton
                          onClick={() => setIsEditing(true)}
                          variant="contained"
                          startIcon={
                            <EditIcon sx={{ fontSize: "14px !important" }} />
                          }
                          sx={{
                            fontSize: "0.8rem",
                            bgcolor: T.accent,
                            color: "#fff",
                            boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                            "&:hover": { bgcolor: T.accentDark },
                          }}
                        >
                          Edit
                        </AccentButton>
                      </>
                    ) : (
                      <>
                        <AccentButton
                          onClick={handleCancelEdit}
                          variant="outlined"
                          startIcon={
                            <CancelIcon sx={{ fontSize: "14px !important" }} />
                          }
                          sx={{
                            fontSize: "0.8rem",
                            borderColor: T.accentBorder,
                            color: T.muted,
                            "&:hover": {
                              bgcolor: T.accentFaint,
                              borderColor: T.accent,
                              color: T.accent,
                              transform: "none",
                            },
                          }}
                        >
                          Cancel
                        </AccentButton>
                        <AccentButton
                          onClick={saveEdit}
                          variant="contained"
                          startIcon={
                            <SaveIcon sx={{ fontSize: "14px !important" }} />
                          }
                          disabled={!hasChanges()}
                          sx={{
                            fontSize: "0.8rem",
                            bgcolor: "#639922",
                            color: "#fff",
                            boxShadow: "0 2px 10px rgba(99,153,34,0.32)",
                            "&:hover": { bgcolor: "#3B6D11" },
                            "&:disabled": {
                              bgcolor: "#b9c7a5 !important",
                              color: "#fff !important",
                            },
                          }}
                        >
                          Save
                        </AccentButton>
                      </>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>

        <SuccessfulOverlay
          open={successOpen}
          action={successAction}
          onClose={() => setSuccessOpen(false)}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%", borderRadius: 2 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default DepartmentTable;
