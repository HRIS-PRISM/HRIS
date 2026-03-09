import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Modal,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Divider,
  Alert,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  AccessTime as TimeIcon,
  Category as CategoryIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Wc as GenderIcon,
} from "@mui/icons-material";

import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";

// ─────────────────────────────────────────────
// SHARED STYLED HELPERS (mirrors LeaveAssignment)
// ─────────────────────────────────────────────
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
      backdropFilter: "blur(10px)",
      borderRadius: 3,
      border: "1px solid rgba(109, 35, 35, 0.1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
      transition: "all 0.3s ease",
      overflow: "visible",
      "&:hover": { boxShadow: "0 12px 40px rgba(109, 35, 35, 0.12)" },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <Box
    sx={{
      p: 4,
      background: "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)",
      color: "#6d2323",
      display: "flex",
      alignItems: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    }}
  >
    <Icon sx={{ fontSize: "1.8rem", mr: 2, color: "#6d2323" }} />
    <Box>
      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#6d2323" }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.9, color: "#8B3333" }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const LeaveTable = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [newLeaveType, setNewLeaveType] = useState({
    leave_description: "",
    leave_code: "",
    leave_hours: "",
    gender_restriction: "",
  });
  const [editLeaveType, setEditLeaveType] = useState(null);
  const [originalLeaveType, setOriginalLeaveType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`);
      setLeaveTypes(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleAdd = async () => {
    if (!newLeaveType.leave_code || !newLeaveType.leave_description) return;
    setLoading(true);
    try {
      const filteredLeaveType = Object.fromEntries(
        Object.entries(newLeaveType).filter(([_, value]) => value !== ""),
      );
      await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_table`,
        filteredLeaveType,
      );
      setNewLeaveType({
        leave_description: "",
        leave_code: "",
        leave_hours: "",
        gender_restriction: "",
      });
      setTimeout(() => {
        setLoading(false);
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      fetchLeaveTypes();
    } catch (error) {
      console.error("Error adding data:", error);
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_table/${editLeaveType.id}`,
        editLeaveType,
      );
      setEditLeaveType(null);
      setOriginalLeaveType(null);
      setIsEditing(false);
      fetchLeaveTypes();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave type?"))
      return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_table/${id}`);
      setEditLeaveType(null);
      setOriginalLeaveType(null);
      setIsEditing(false);
      fetchLeaveTypes();
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error("Error deleting data:", error);
    }
  };

  const handleOpenModal = (leaveType) => {
    setEditLeaveType({ ...leaveType });
    setOriginalLeaveType({ ...leaveType });
    setIsEditing(false);
  };
  const handleStartEdit = () => setIsEditing(true);
  const handleCancelEdit = () => {
    setEditLeaveType({ ...originalLeaveType });
    setIsEditing(false);
  };
  const handleCloseModal = () => {
    setEditLeaveType(null);
    setOriginalLeaveType(null);
    setIsEditing(false);
  };

  const fieldLabels = {
    leave_description: "Leave Description",
    leave_code: "Leave Code",
    leave_hours: "Default Days",
    gender_restriction: "Gender Restriction",
  };

  const filteredLeaveTypes = leaveTypes.filter((lt) => {
    const description = lt.leave_description?.toLowerCase() || "";
    const code = lt.leave_code?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return description.includes(search) || code.includes(search);
  });

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderColor: "rgba(109, 35, 35, 0.2)" },
      "&:hover fieldset": { borderColor: "#6d2323" },
      "&.Mui-focused fieldset": { borderColor: "#6d2323", borderWidth: 2 },
    },
  };

  return (
    <Box
      sx={{
        py: { xs: 2, md: 4 },
        mt: { xs: 0, md: -5 },
        width: "100%",
        maxWidth: "1600px",
        mx: "auto",
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Overlays */}
      <LoadingOverlay open={loading} message="Processing leave type..." />
      <SuccessfulOverlay
        open={successOpen}
        action={successAction}
        onClose={() => setSuccessOpen(false)}
      />

      {/* ── Hero Header ── */}
      <GlassCard sx={{ mb: 4 }}>
        <Box
          sx={{
            p: 5,
            background: "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)",
            color: "#6d2323",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* decorative blobs */}
          <Box
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background:
                "radial-gradient(circle, rgba(109,35,35,0.1) 0%, rgba(109,35,35,0) 70%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -30,
              left: "30%",
              width: 150,
              height: 150,
              background:
                "radial-gradient(circle, rgba(109,35,35,0.08) 0%, rgba(109,35,35,0) 70%)",
            }}
          />
          <Box
            display="flex"
            alignItems="center"
            position="relative"
            zIndex={1}
          >
            <Avatar
              sx={{
                bgcolor: "rgba(109,35,35,0.15)",
                mr: 4,
                width: 64,
                height: 64,
                boxShadow: "0 8px 24px rgba(109,35,35,0.15)",
              }}
            >
              <CategoryIcon sx={{ color: "#6d2323", fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  lineHeight: 1.2,
                  color: "#6d2323",
                }}
              >
                Leave Types Management
              </Typography>
              <Typography
                variant="body1"
                sx={{ opacity: 0.8, fontWeight: 400, color: "#8B3333" }}
              >
                Administrative Panel • Define universal leave types and their
                default hours
              </Typography>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* ── Add Leave Type Section ── */}
      <GlassCard sx={{ mb: 4 }}>
        <SectionHeader
          icon={EventNote}
          title="Add New Leave Type"
          subtitle="Define a leave code, description, and default days allocation"
        />

        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Leave Code */}
            <Grid item xs={12} sm={6} md={2.5}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: "#6d2323",
                  fontSize: "0.875rem",
                }}
              >
                Leave Code *
              </Typography>
              <TextField
                value={newLeaveType.leave_code}
                onChange={(e) =>
                  setNewLeaveType({
                    ...newLeaveType,
                    leave_code: e.target.value.toUpperCase(),
                  })
                }
                fullWidth
                placeholder="e.g., VL, SL, EL"
                size="small"
                sx={inputSx}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "#888",
                  mt: 0.5,
                  display: "block",
                  fontSize: "0.7rem",
                }}
              >
                2–4 letters
              </Typography>
            </Grid>

            {/* Leave Description */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: "#6d2323",
                  fontSize: "0.875rem",
                }}
              >
                Leave Description *
              </Typography>
              <TextField
                value={newLeaveType.leave_description}
                onChange={(e) =>
                  setNewLeaveType({
                    ...newLeaveType,
                    leave_description: e.target.value,
                  })
                }
                fullWidth
                placeholder="e.g., Vacation Leave"
                size="small"
                sx={inputSx}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "#888",
                  mt: 0.5,
                  display: "block",
                  fontSize: "0.7rem",
                }}
              >
                Full name of the leave type
              </Typography>
            </Grid>

            {/* Default Days (converts to hours) */}
            <Grid item xs={12} sm={6} md={2}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: "#6d2323",
                  fontSize: "0.875rem",
                }}
              >
                Default Days
              </Typography>
              <TextField
                type="number"
                value={
                  newLeaveType.leave_hours !== ""
                    ? newLeaveType.leave_hours / 8
                    : ""
                }
                onChange={(e) => {
                  const days = e.target.value;
                  setNewLeaveType({
                    ...newLeaveType,
                    leave_hours: days !== "" ? parseFloat(days) * 8 : "",
                  });
                }}
                fullWidth
                placeholder="e.g., 10"
                size="small"
                inputProps={{ min: 0, step: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon sx={{ color: "#6d2323", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography
                        variant="caption"
                        sx={{ color: "#888", fontSize: "0.7rem" }}
                      >
                        = {newLeaveType.leave_hours || 0} hrs
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "#888",
                  mt: 0.5,
                  display: "block",
                  fontSize: "0.7rem",
                }}
              >
                1 day = 8 hrs
              </Typography>
            </Grid>

            {/* Gender Restriction */}
            <Grid item xs={12} sm={6} md={2}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: "#6d2323",
                  fontSize: "0.875rem",
                }}
              >
                Gender Restriction
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={newLeaveType.gender_restriction}
                  onChange={(e) =>
                    setNewLeaveType({
                      ...newLeaveType,
                      gender_restriction: e.target.value,
                    })
                  }
                  displayEmpty
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(109,35,35,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#6d2323",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#6d2323",
                      borderWidth: 2,
                    },
                  }}
                >
                  <MenuItem value="">
                    <GenderIcon sx={{ fontSize: 15, mr: 1 }} />
                    No Restriction
                  </MenuItem>
                  <MenuItem value="Male">
                    <MaleIcon sx={{ fontSize: 15, mr: 1, color: "#1565C0" }} />
                    Male Only
                  </MenuItem>
                  <MenuItem value="Female">
                    <FemaleIcon
                      sx={{ fontSize: 15, mr: 1, color: "#C2185B" }}
                    />
                    Female Only
                  </MenuItem>
                </Select>
              </FormControl>
              <Typography
                variant="caption"
                sx={{
                  color: "#888",
                  mt: 0.5,
                  display: "block",
                  fontSize: "0.7rem",
                }}
              >
                e.g., Paternity = Male, Maternity = Female
              </Typography>
            </Grid>

            {/* Add Button */}
            <Grid item xs={12} sm={6} md={2.5}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: "transparent",
                  fontSize: "0.875rem",
                }}
              >
                Action
              </Typography>
              <Button
                onClick={handleAdd}
                variant="contained"
                fullWidth
                size="medium"
                startIcon={<AddIcon />}
                disabled={
                  loading ||
                  !newLeaveType.leave_code ||
                  !newLeaveType.leave_description
                }
                sx={{
                  height: 40,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  backgroundColor:
                    !newLeaveType.leave_code || !newLeaveType.leave_description
                      ? "#cccccc"
                      : "#6D2323",
                  color:
                    !newLeaveType.leave_code || !newLeaveType.leave_description
                      ? "#666"
                      : "#FFF",
                  boxShadow:
                    !newLeaveType.leave_code || !newLeaveType.leave_description
                      ? "none"
                      : "0 4px 12px rgba(109,35,35,0.3)",
                  "&:hover": {
                    backgroundColor:
                      !newLeaveType.leave_code ||
                      !newLeaveType.leave_description
                        ? "#cccccc"
                        : "#5a1d1d",
                  },
                  "&:disabled": {
                    backgroundColor: "#cccccc !important",
                    color: "#666 !important",
                    boxShadow: "none !important",
                  },
                }}
              >
                {loading ? "Adding..." : "Add Type"}
              </Button>
              <Typography
                variant="caption"
                sx={{
                  color: "transparent",
                  mt: 0.5,
                  display: "block",
                  fontSize: "0.7rem",
                }}
              >
                &nbsp;
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </GlassCard>

      {/* ── Records Section ── */}
      <GlassCard sx={{ mb: { xs: 6, md: 10 }, overflow: "visible" }}>
        {/* Records header */}
        <Box
          sx={{
            p: 4,
            background: "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)",
            color: "#6d2323",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(109,35,35,0.15)",
                width: 56,
                height: 56,
                boxShadow: "0 4px 12px rgba(109,35,35,0.15)",
              }}
            >
              <TimeIcon sx={{ fontSize: 28, color: "#6d2323" }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#6d2323" }}
              >
                Leave Types Records
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.8, color: "#8B3333" }}
              >
                {filteredLeaveTypes.length}{" "}
                {filteredLeaveTypes.length === 1 ? "leave type" : "leave types"}{" "}
                configured
              </Typography>
            </Box>
          </Box>

          <TextField
            size="small"
            variant="outlined"
            placeholder="Search leave types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              minWidth: 300,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "#fff",
                "& fieldset": { borderColor: "rgba(109,35,35,0.2)" },
                "&:hover fieldset": { borderColor: "#6d2323" },
                "&.Mui-focused fieldset": { borderColor: "#6d2323" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#6d2323" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <CardContent sx={{ p: 4, overflow: "visible" }}>
          {filteredLeaveTypes.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 10 }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  bgcolor: "rgba(109,35,35,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <EventNote
                  sx={{ fontSize: 56, color: "rgba(109,35,35,0.3)" }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ color: "#6D2323", fontWeight: 700, mb: 1 }}
              >
                {leaveTypes.length === 0
                  ? "No Leave Types Found"
                  : "No Matching Records"}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#888", maxWidth: 400, mx: "auto" }}
              >
                {leaveTypes.length === 0
                  ? "Get started by creating your first leave type using the form above."
                  : "Try adjusting your search criteria."}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredLeaveTypes.map((leaveType) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={leaveType.id}>
                  <Box
                    onClick={() => handleOpenModal(leaveType)}
                    sx={{
                      border: "1px solid rgba(109,35,35,0.15)",
                      borderRadius: 3,
                      p: 2.5,
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                      background:
                        "linear-gradient(135deg, #FFFFFF 0%, #FEFEFE 100%)",
                      minHeight: 180,
                      display: "flex",
                      flexDirection: "column",
                      "&:hover": {
                        boxShadow: "0 12px 32px rgba(109,35,35,0.18)",
                        borderColor: "#6d2323",
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    {/* Card Header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: "#6d2323",
                          width: 48,
                          height: 48,
                          boxShadow: "0 4px 12px rgba(109,35,35,0.25)",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: "#fff",
                          }}
                        >
                          {leaveType.leave_code?.substring(0, 2)}
                        </Typography>
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: "#6d2323",
                            fontSize: "0.95rem",
                            lineHeight: 1.3,
                            mb: 0.2,
                          }}
                        >
                          {leaveType.leave_description || "Untitled Leave Type"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#888",
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {leaveType.gender_restriction === "Male" && (
                            <MaleIcon sx={{ fontSize: 14, color: "#1976d2" }} />
                          )}

                          {leaveType.gender_restriction === "Female" && (
                            <FemaleIcon
                              sx={{ fontSize: 14, color: "#e91e63" }}
                            />
                          )}

                          {leaveType.gender_restriction === "Both" && (
                            <GenderIcon
                              sx={{ fontSize: 14, color: "#9c27b0" }}
                            />
                          )}

                          {leaveType.leave_code}
                          {leaveType.gender_restriction &&
                            ` (${leaveType.gender_restriction})`}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider
                      sx={{ mb: 1.5, borderColor: "rgba(109,35,35,0.1)" }}
                    />

                    {/* Hours / Days Row */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-around",
                        py: 1,
                        bgcolor: "rgba(109,35,35,0.02)",
                        borderRadius: 2,
                      }}
                    >
                      {[
                        [
                          "Days",
                          ((leaveType.leave_hours || 0) / 8).toFixed(1),
                          "#6d2323",
                        ],
                        ["Hours", `${leaveType.leave_hours || 0}`, "#8B3333"],
                      ].map(([label, val, color]) => (
                        <Box key={label} sx={{ textAlign: "center" }}>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 700, color, fontSize: "1.1rem" }}
                          >
                            {val}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#888", fontSize: "0.65rem" }}
                          >
                            {label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Click hint */}
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1,
                        borderTop: "1px solid rgba(109,35,35,0.06)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#888",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <EditIcon sx={{ fontSize: 13 }} /> Click to view or edit
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </GlassCard>

      {/* ── Edit / View Modal ── */}
      <Modal
        open={!!editLeaveType}
        onClose={handleCloseModal}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: 4,
            width: "90%",
            maxWidth: "520px",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}
        >
          {editLeaveType && (
            <>
              {/* Modal Header */}
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, #6D2323 0%, #8B4545 100%)",
                  color: "#fff",
                  p: 4,
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
                    right: -40,
                    width: 160,
                    height: 160,
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                  }}
                />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2.5,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255,255,255,0.2)",
                      width: 56,
                      height: 56,
                    }}
                  >
                    <EditIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {isEditing ? "Edit Leave Type" : "Leave Type Details"}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      {editLeaveType.leave_code}
                    </Typography>
                    <Chip
                      label={`${(editLeaveType.leave_hours || 0) / 8} days default`}
                      size="small"
                      sx={{
                        mt: 0.75,
                        bgcolor: "rgba(255,255,255,0.25)",
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
                <IconButton
                  onClick={handleCloseModal}
                  sx={{ color: "#fff", position: "relative", zIndex: 1 }}
                >
                  <Close />
                </IconButton>
              </Box>

              {/* Modal Body */}
              <Box sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  {Object.keys(newLeaveType).map((field) => (
                    <Grid item xs={12} key={field}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, mb: 1, color: "#6d2323" }}
                      >
                        {fieldLabels[field]}
                      </Typography>

                      {/* Gender restriction gets a Select, others get TextField */}
                      {field === "gender_restriction" ? (
                        <FormControl fullWidth disabled={!isEditing}>
                          <Select
                            value={editLeaveType[field] ?? ""}
                            onChange={(e) =>
                              setEditLeaveType({
                                ...editLeaveType,
                                gender_restriction: e.target.value,
                              })
                            }
                            displayEmpty
                            sx={{ borderRadius: 2 }}
                          >
                            <MenuItem value="">
                              <GenderIcon sx={{ fontSize: 15, mr: 1 }} />
                              No Restriction
                            </MenuItem>
                            <MenuItem value="Male">
                              <MaleIcon
                                sx={{ fontSize: 15, mr: 1, color: "#1565C0" }}
                              />
                              Male Only
                            </MenuItem>
                            <MenuItem value="Female">
                              <FemaleIcon
                                sx={{ fontSize: 15, mr: 1, color: "#C2185B" }}
                              />
                              Female Only
                            </MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          value={
                            field === "leave_hours"
                              ? editLeaveType[field] != null &&
                                editLeaveType[field] !== ""
                                ? editLeaveType[field] / 8
                                : ""
                              : editLeaveType[field] || ""
                          }
                          onChange={(e) => {
                            if (field === "leave_hours") {
                              const days = e.target.value;
                              setEditLeaveType({
                                ...editLeaveType,
                                leave_hours:
                                  days !== "" ? parseFloat(days) * 8 : "",
                              });
                            } else {
                              setEditLeaveType({
                                ...editLeaveType,
                                [field]:
                                  field === "leave_code"
                                    ? e.target.value.toUpperCase()
                                    : e.target.value,
                              });
                            }
                          }}
                          fullWidth
                          disabled={!isEditing}
                          type={field === "leave_hours" ? "number" : "text"}
                          inputProps={
                            field === "leave_hours"
                              ? { min: 0, step: 1 }
                              : undefined
                          }
                          InputProps={
                            field === "leave_hours"
                              ? {
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Typography
                                        variant="caption"
                                        sx={{ color: "#888" }}
                                      >
                                        = {editLeaveType.leave_hours || 0} hrs
                                      </Typography>
                                    </InputAdornment>
                                  ),
                                }
                              : undefined
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": { borderRadius: 2 },
                            "& .MuiInputBase-input.Mui-disabled": {
                              WebkitTextFillColor: "#000",
                            },
                          }}
                        />
                      )}
                    </Grid>
                  ))}

                  {/* Days Summary Box */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "rgba(109,35,35,0.04)",
                        border: "1px solid rgba(109,35,35,0.1)",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, mb: 1.5, color: "#6d2323" }}
                      >
                        Days Equivalent (8 hours = 1 day)
                      </Typography>
                      <Grid container spacing={2}>
                        {[
                          [
                            "Total Days",
                            ((editLeaveType.leave_hours || 0) / 8).toFixed(1),
                            "#6d2323",
                          ],
                          [
                            "Total Hours",
                            `${editLeaveType.leave_hours || 0} hrs`,
                            "#8B3333",
                          ],
                        ].map(([label, val, color]) => (
                          <Grid item xs={6} key={label}>
                            <Typography
                              variant="h4"
                              sx={{ fontWeight: 700, color }}
                            >
                              {val}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "#666" }}
                            >
                              {label}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mt: 4,
                    gap: 2,
                  }}
                >
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={() => handleDelete(editLeaveType.id)}
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        sx={{
                          borderColor: "#d32f2f",
                          color: "#d32f2f",
                          borderRadius: 2,
                          px: 3,
                          "&:hover": {
                            bgcolor: "rgba(211,47,47,0.08)",
                            borderColor: "#c62828",
                          },
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        onClick={handleStartEdit}
                        variant="contained"
                        startIcon={<EditIcon />}
                        sx={{
                          bgcolor: "#6D2323",
                          color: "#FFF",
                          borderRadius: 2,
                          px: 3,
                          boxShadow: "0 4px 12px rgba(109,35,35,0.3)",
                          "&:hover": { bgcolor: "#5a1d1d" },
                        }}
                      >
                        Edit
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                          color: "#6d2323",
                          borderColor: "#6d2323",
                          borderRadius: 2,
                          px: 3,
                          "&:hover": {
                            borderColor: "#6d2323",
                            bgcolor: "rgba(109,35,35,0.05)",
                          },
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdate}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        sx={{
                          bgcolor: "#6D2323",
                          color: "#FFF",
                          borderRadius: 2,
                          px: 3,
                          boxShadow: "0 4px 12px rgba(109,35,35,0.3)",
                          "&:hover": { bgcolor: "#5a1d1d" },
                        }}
                      >
                        Save Changes
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default LeaveTable;
