import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Container, Box, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Card, CardContent, CardHeader, Avatar,
  Fade, Backdrop, CircularProgress, Chip, Tooltip,
  IconButton, styled, alpha, Breadcrumbs, Link,
  Grid, InputAdornment, FormHelperText, Paper
} from "@mui/material";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon,
  Announcement as AnnouncementIcon, Reorder as ReorderIcon,
  Search as SearchIcon, Close as CloseIcon, Home,
  Image as ImageIcon, FilterList, Refresh, CheckCircle,
  Error, Info, Warning, Event as EventIcon
} from "@mui/icons-material";
import usePageAccess from '../hooks/usePageAccess';
import AccessDenied from './AccessDenied';
import SuccessfulOverlay from './SuccessfulOverlay';

// Get auth headers function
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      // Do NOT set Content-Type here so axios can set it correctly
      Authorization: `Bearer ${token}`,
    },
  };
};

// System Settings Hook (from AdminHome)
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#894444',
    secondaryColor: '#6d2323',
    accentColor: '#FEF9E1',
    textColor: '#FFFFFF',
    textPrimaryColor: '#6D2323', 
    textSecondaryColor: '#FEF9E1', 
    hoverColor: '#6D2323',
    backgroundColor: '#FFFFFF',
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('systemSettings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          setSettings(parsedSettings);
        }
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api') 
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        
        const response = await axios.get(url, getAuthHeaders());
        if (response.data && typeof response.data === 'object') {
          setSettings(response.data);
          localStorage.setItem('systemSettings', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
    };

    fetchSettings();
  }, []);

  return settings;
};

const AnnouncementForm = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    about: "",
    date_start: "",
    date_end: "",
    image: null,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [openEditModal, setOpenEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  //ACCESSING
    // Dynamic page access control using component identifier
    // The identifier 'philhealth' should match the component_identifier in the pages table
    const {
      hasAccess,
      loading: accessLoading,
      error: accessError,
    } = usePageAccess('announcement');
    // ACCESSING END

  // Use system settings
  const settings = useSystemSettings();
  
  // Memoize styled components to prevent recreation on every render
  const GlassCard = useMemo(() => styled(Card)(({ theme }) => ({
    borderRadius: 20,
    background: `${settings?.accentColor || '#FEF9E1'}F2`,
    backdropFilter: "blur(10px)",
    boxShadow: `0 8px 40px ${settings?.primaryColor || '#894444'}14`,
    border: `1px solid ${settings?.primaryColor || '#894444'}1A`,
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      boxShadow: `0 12px 48px ${settings?.primaryColor || '#894444'}26`,
      transform: "translateY(-4px)",
    },
  })), [settings]);

  const ProfessionalButton = useMemo(() => styled(Button)(({ theme, variant }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: "12px 24px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none",
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
    boxShadow: variant === "contained" ? `0 4px 14px ${settings?.primaryColor || '#894444'}40` : "none",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: variant === "contained" ? `0 6px 20px ${settings?.primaryColor || '#894444'}59` : "none",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  })), [settings]);

  const ModernTextField = useMemo(() => styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      "&:hover": {
        transform: "translateY(-1px)",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
      },
      "&.Mui-focused": {
        transform: "translateY(-1px)",
        boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
        backgroundColor: "rgba(255, 255, 255, 1)",
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 500,
    },
  })), [settings]);

  const PremiumTableContainer = useMemo(() => styled(Paper)(({ theme }) => ({
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: `0 4px 24px ${settings?.primaryColor || '#894444'}0F`,
    border: `1px solid ${settings?.primaryColor || '#894444'}14`,
    background: "rgba(255, 255, 255, 0.9)",
    width: "100%",
  })), [settings]);

  const PremiumTableCell = useMemo(() => styled(TableCell)(({ theme, isHeader = false }) => ({
    fontWeight: isHeader ? 600 : 500,
    padding: "18px 20px",
    borderBottom: isHeader
      ? `2px solid ${settings?.primaryColor || '#894444'}4D`
      : `1px solid ${settings?.primaryColor || '#894444'}0F`,
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
  })), [settings]);

  useEffect(() => {
    fetchAnnouncements();
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders());
      setHolidays(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching holidays for announcements", err.message);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const response = await axios.get(`${API_BASE_URL}/api/announcements`, getAuthHeaders());
      setAnnouncements(response.data);
      
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
        
        if (refreshing && announcements.length > 0) {
          setSuccessAction("create");
          setSuccessOpen(true);
        }
      }, 1000);
    } catch (err) {
      console.error("Error fetching announcements", err.message);
      setLoading(false);
      setRefreshing(false);
      setError("Failed to fetch announcements");
    }
  };

  const handleNewChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setNewAnnouncement({ ...newAnnouncement, image: files[0] });
    } else {
      setNewAnnouncement({ ...newAnnouncement, [name]: value });
    }
  };

  const handleAdd = async () => {
    try {
      setError("");
      setLoading(true);
      
      if (!newAnnouncement.title || !newAnnouncement.about || !newAnnouncement.date_start || !newAnnouncement.date_end) {
        setError("Please fill in Title, About, and Date Range (Start & End)");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", newAnnouncement.title);
      formData.append("about", newAnnouncement.about);
      formData.append("date_start", newAnnouncement.date_start);
      formData.append("date_end", newAnnouncement.date_end);
      if (newAnnouncement.image) formData.append("image", newAnnouncement.image);

      await axios.post(`${API_BASE_URL}/api/announcements`, formData, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers },
      });

      fetchAnnouncements();
      setNewAnnouncement({ title: "", about: "", date_start: "", date_end: "", image: null });
      setSuccessAction("create");
      setSuccessOpen(true);
      setLoading(false);
    } catch (error) {
      console.error("Error adding announcement", error);
      setError("Failed to add announcement");
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      about: item.about,
      date_start: item.date_start || item.date ? new Date(item.date_start || item.date).toISOString().split("T")[0] : "",
      date_end: item.date_end || item.date ? new Date(item.date_end || item.date).toISOString().split("T")[0] : "",
      image: item.image || null,
    });
    setOpenEditModal(true);
    setError("");
  };

  const handleSaveEdit = async () => {
    try {
      setError("");
      setLoading(true);

      if (!editingId) {
        setError("No announcement selected for editing.");
        setLoading(false);
        return;
      }

      const payload = new FormData();
      payload.append("title", editForm.title || "");
      payload.append("about", editForm.about || "");
      payload.append("date_start", editForm.date_start || "");
      payload.append("date_end", editForm.date_end || "");

      if (editForm.image && editForm.image instanceof File) {
        payload.append("image", editForm.image);
      }

      await axios.put(
        `${API_BASE_URL}/api/announcements/${editingId}`,
        payload,
        { headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers } }
      );

      setOpenEditModal(false);
      setEditingId(null);
      setEditForm({});
      fetchAnnouncements();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setLoading(false);
    } catch (err) {
      console.error("Error updating announcement:", err);
      setError("Failed to update announcement");
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/api/announcements/${id}`, getAuthHeaders());
        fetchAnnouncements();
        setSuccessAction("delete");
        setSuccessOpen(true);
        setLoading(false);
      } catch (error) {
        console.error("Error deleting announcement", error);
        setError("Failed to delete announcement");
        setLoading(false);
      }
    }
  };

  // Helper: is today within date range (inclusive)
  const todayInRange = (start, end) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s) s.setHours(0, 0, 0, 0);
    if (e) e.setHours(0, 0, 0, 0);
    if (!s && !e) return true;
    if (s && !e) return today >= s;
    if (!s && e) return today <= e;
    return today >= s && today <= e;
  };

  // Active holidays (same structure as announcement: Title, About, Date Range)
  const scheduledHolidays = holidays
    .filter((h) => (h.status || "").toLowerCase() === "active")
    .map((h) => ({
      id: `holiday-${h.id}`,
      title: h.title || h.description || "",
      about: h.about || "Official holiday.",
      date_start: h.date_start || h.date,
      date_end: h.date_end || h.date,
      date: h.date_start || h.date_end || h.date,
      image: h.image || null,
      isHoliday: true,
    }));

  const combinedItems = [
    ...scheduledHolidays,
    ...announcements.map((a) => ({
      ...a,
      date_start: a.date_start || a.date,
      date_end: a.date_end || a.date,
      isHoliday: false,
    })),
  ].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date));

  const filteredAnnouncements = combinedItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.about && item.about.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDateRange = (start, end) => {
    if (!start && !end) return "—";
    const s = formatDateForDisplay(start);
    const e = formatDateForDisplay(end);
    if (s === e) return s;
    return `${s} – ${e}`;
  };

  // Helper to build correct image URL for previews
  const getImageUrl = (image) => {
    if (!image) return "";

    // If this is a File from an <input type="file">
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }

    if (typeof image === "string") {
      // Absolute URL already
      if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
      }
      // Backend stores paths like `/uploads/filename`
      if (image.startsWith("/uploads")) {
        return `${API_BASE_URL}${image}`;
      }
    }

    return image;
  };


    // ACCESSING 2
    // Loading state
    if (accessLoading) {
      return (
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <CircularProgress sx={{ color: '#6d2323', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#6d2323' }}>
              Loading access information...
            </Typography>
          </Box>
        </Container>
      );
    }
    // Access denied state - Now using the reusable component
    if (!accessLoading && hasAccess !== true) {
      return (
        <AccessDenied
          title="Access Denied"
          message="You do not have permission to access PhilHealth Table. Contact your administrator to request access."
          returnPath="/admin-home"
          returnButtonText="Return to Home"
        />
      );
    }
    //ACCESSING END2

  return (
    <Box
      sx={{
        py: 4,
        borderRadius: "14px",
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
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard>
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${settings?.accentColor || '#FEF9E1'} 0%, ${alpha(settings?.accentColor || '#FEF9E1', 0.9)} 100%)`,
                  color: settings?.primaryColor || '#894444',
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
                    background: `radial-gradient(circle, ${alpha(settings?.primaryColor || '#894444', 0.1)} 0%, ${alpha(settings?.primaryColor || '#894444', 0)} 70%)`,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -30,
                    left: "30%",
                    width: 150,
                    height: 150,
                    background: `radial-gradient(circle, ${alpha(settings?.primaryColor || '#894444', 0.08)} 0%, ${alpha(settings?.primaryColor || '#894444', 0)} 70%)`,
                  }}
                />

                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  position="relative"
                  zIndex={1}
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        boxShadow: `0 8px 24px ${alpha(settings?.primaryColor || '#894444', 0.15)}`,
                      }}
                    >
                      <AnnouncementIcon sx={{ fontSize: 32, color: settings?.primaryColor || '#894444' }} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: settings?.primaryColor || '#894444',
                        }}
                      >
                        Announcement Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: settings?.textPrimaryColor || '#6D2323',
                        }}
                      >
                        Post and manage employee announcements
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={`${announcements.length} Announcements${scheduledHolidays.length ? ` + ${scheduledHolidays.length} Holiday(s)` : ""}`}
                      size="small"
                      sx={{
                        bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                        color: settings?.primaryColor || '#894444',
                        fontWeight: 500,
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                    <Tooltip title="Refresh Announcements & Holidays">
                      <IconButton
                        onClick={() => { fetchAnnouncements(); fetchHolidays(); }}
                        disabled={loading}
                        sx={{
                          bgcolor: alpha(settings?.primaryColor || '#894444', 0.1),
                          "&:hover": { bgcolor: alpha(settings?.primaryColor || '#894444', 0.2) },
                          color: settings?.primaryColor || '#894444',
                          width: 48,
                          height: 48,
                          "&:disabled": {
                            bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                            color: alpha(settings?.primaryColor || '#894444', 0.3),
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: settings?.primaryColor || '#894444' }}
                          />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Success Overlay */}
        <SuccessfulOverlay 
          open={successOpen} 
          action={successAction} 
          onClose={() => setSuccessOpen(false)} 
        />

        {/* Error Alert - Center Modal Overlay */}
        {error && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => setError("")}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "relative",
                  minWidth: "400px",
                  maxWidth: "600px",
                }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.4)",
                    fontSize: "1.1rem",
                    p: 3,
                    "& .MuiAlert-message": { fontWeight: 500 },
                    "& .MuiAlert-icon": { fontSize: "2rem" },
                  }}
                  icon={<Error />}
                  onClose={() => setError("")}
                >
                  {error}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* Add Form */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.8),
                      color: settings?.textPrimaryColor || '#6D2323',
                    }}
                  >
                    <AddIcon />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: 600, color: settings?.textPrimaryColor || '#6D2323' }}
                    >
                      Create New Announcement
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ color: settings?.textPrimaryColor || '#6D2323' }}
                    >
                      Add a new announcement for employees
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.1)}`,
              }}
            />
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <ModernTextField
                    fullWidth
                    label="Title"
                    name="title"
                    value={newAnnouncement.title}
                    onChange={handleNewChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ModernTextField
                    fullWidth
                    label="Date Range Start"
                    name="date_start"
                    type="date"
                    value={newAnnouncement.date_start}
                    onChange={handleNewChange}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ModernTextField
                    fullWidth
                    label="Date Range End"
                    name="date_end"
                    type="date"
                    value={newAnnouncement.date_end}
                    onChange={handleNewChange}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <ModernTextField
                    fullWidth
                    label="About"
                    name="about"
                    value={newAnnouncement.about}
                    onChange={handleNewChange}
                    multiline
                    rows={3}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <ProfessionalButton
                      variant="outlined"
                      component="label"
                      startIcon={<ImageIcon />}
                      sx={{
                        borderColor: settings?.primaryColor || '#894444',
                        color: settings?.primaryColor || '#894444',
                        "&:hover": {
                          borderColor: settings?.secondaryColor || '#6d2323',
                          bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                        },
                      }}
                    >
                      Upload Image
                      <input
                        type="file"
                        hidden
                        name="image"
                        onChange={handleNewChange}
                      />
                    </ProfessionalButton>
                    {newAnnouncement.image && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{ color: settings?.textPrimaryColor || '#6D2323' }}
                        >
                          {newAnnouncement.image.name}
                        </Typography>
                        <img
                          src={getImageUrl(newAnnouncement.image)}
                          alt="preview"
                          style={{ maxWidth: 160, maxHeight: 90, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <ProfessionalButton
                    onClick={handleAdd}
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled={loading}
                    fullWidth
                    sx={{
                      bgcolor: settings?.primaryColor || '#894444',
                      color: settings?.accentColor || '#FEF9E1',
                      "&:hover": { bgcolor: settings?.secondaryColor || '#6d2323' },
                    }}
                  >
                    {loading ? 'Adding...' : 'Add Announcement'}
                  </ProfessionalButton>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: settings?.accentColor || '#FEF9E1',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading && !refreshing}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: settings?.accentColor || '#FEF9E1' }}>
              Processing announcement...
            </Typography>
          </Box>
        </Backdrop>

        {/* Announcements Table */}
        {!loading && (
          <Fade in timeout={900}>
            <GlassCard>
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${settings?.accentColor || '#FEF9E1'} 0%, ${alpha(settings?.accentColor || '#FEF9E1', 0.9)} 100%)`,
                  color: settings?.primaryColor || '#894444',
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.1)}`,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 600, color: settings?.primaryColor || '#894444' }}
                  >
                    Announcement Records
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.8, color: settings?.accentColor || '#FEF9E1' }}
                  >
                    {searchQuery
                      ? `Showing ${filteredAnnouncements.length} of ${combinedItems.length} items matching "${searchQuery}"`
                      : `Total: ${combinedItems.length} items (${announcements.length} announcements${scheduledHolidays.length ? `, ${scheduledHolidays.length} scheduled holiday(s)` : ""})`}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <ModernTextField
                    size="small"
                    variant="outlined"
                    placeholder="Search by Title or About"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: "300px" }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: settings?.primaryColor || '#894444' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ width: "100%" }}>
                <PremiumTableContainer elevation={0}>
                  <Table sx={{ minWidth: 800, width: "100%" }}>
                    <TableHead sx={{ bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.7) }}>
                      <TableRow>
                        <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "10%" }}>
                          No.
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "12%" }}>
                          Type
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "23%" }}>
                          Title
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "30%" }}>
                          About
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "15%" }}>
                          Date Range
                        </PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "20%", textAlign: "center" }}>
                          Actions
                        </PremiumTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAnnouncements.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                sx={{ textAlign: "center", py: 8 }}
                              >
                            <Box sx={{ textAlign: "center" }}>
                              <Info
                                sx={{
                                  fontSize: 80,
                                  color: alpha(settings?.primaryColor || '#894444', 0.3),
                                  mb: 3,
                                }}
                              />
                              <Typography
                                variant="h5"
                                color={alpha(settings?.primaryColor || '#894444', 0.6)}
                                gutterBottom
                                sx={{ fontWeight: 600 }}
                              >
                                No Announcements or Holidays
                              </Typography>
                              <Typography
                                variant="body1"
                                color={alpha(settings?.primaryColor || '#894444', 0.4)}
                              >
                                {searchQuery
                                  ? "Try adjusting your search criteria"
                                  : "No announcements or scheduled holidays. Active holidays (today or future) appear here automatically."}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAnnouncements.map((item, index) => (
                          <TableRow
                            key={item.id}
                            sx={{
                              "&:nth-of-type(even)": {
                                bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.3),
                              },
                              "&:hover": { bgcolor: alpha(settings?.primaryColor || '#894444', 0.05) },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <PremiumTableCell sx={{ fontWeight: 600, color: settings?.textPrimaryColor || '#6D2323', width: "10%" }}>
                              {index + 1}
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "12%" }}>
                              {item.isHoliday ? (
                                <Chip
                                  size="small"
                                  icon={<EventIcon sx={{ fontSize: 18 }} />}
                                  label="Holiday"
                                  sx={{
                                    bgcolor: alpha(settings?.primaryColor || "#894444", 0.15),
                                    color: settings?.primaryColor || "#894444",
                                    fontWeight: 600,
                                    "& .MuiChip-icon": { color: "inherit" },
                                  }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<AnnouncementIcon sx={{ fontSize: 18 }} />}
                                  label="Announcement"
                                  sx={{
                                    bgcolor: alpha(settings?.secondaryColor || "#6d2323", 0.15),
                                    color: settings?.secondaryColor || "#6d2323",
                                    fontWeight: 600,
                                    "& .MuiChip-icon": { color: "inherit" },
                                  }}
                                />
                              )}
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "23%" }}>
                              {item.title}
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "30%" }}>
                              {item.about}
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ color: settings?.textPrimaryColor || '#6D2323', width: "15%" }}>
                              {formatDateRange(item.date_start, item.date_end) || formatDateForDisplay(item.date)}
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ textAlign: "center", width: "20%" }}>
                              {item.isHoliday ? (
                                <Typography variant="body2" sx={{ color: alpha(settings?.textPrimaryColor || "#6D2323", 0.8), fontStyle: "italic" }}>
                                  Scheduled — managed in Holiday
                                </Typography>
                              ) : (
                                <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                                  <Tooltip title="Edit Announcement">
                                    <ProfessionalButton
                                      onClick={() => handleEdit(item)}
                                      variant="contained"
                                      startIcon={<EditIcon />}
                                      sx={{
                                        bgcolor: settings?.primaryColor || '#894444',
                                        color: settings?.accentColor || '#FEF9E1',
                                        "&:hover": { bgcolor: settings?.secondaryColor || '#6d2323' },
                                      }}
                                    >
                                      Edit
                                    </ProfessionalButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Announcement">
                                    <ProfessionalButton
                                      onClick={() => handleDelete(item.id)}
                                      variant="contained"
                                      startIcon={<DeleteIcon />}
                                      sx={{
                                        bgcolor: "#000000",
                                        color: "#ffffff",
                                        "&:hover": { bgcolor: "#333333" },
                                      }}
                                    >
                                      Delete
                                    </ProfessionalButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </PremiumTableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </PremiumTableContainer>
              </Box>
            </GlassCard>
          </Fade>
        )}

        {/* Edit Modal */}
        <Dialog
          open={openEditModal}
          onClose={() => setOpenEditModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              bgcolor: settings?.accentColor || '#FEF9E1',
            },
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${settings?.primaryColor || '#894444'} 0%, ${settings?.secondaryColor || '#6d2323'} 100%)`,
              color: settings?.accentColor || '#FEF9E1',
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 3,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <EditIcon sx={{ fontSize: 30 }} />
              Edit Announcement
            </Box>
            <IconButton onClick={() => setOpenEditModal(false)} sx={{ color: settings?.accentColor || '#FEF9E1' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ModernTextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  sx={{ marginTop: 5}}
                />
              </Grid>
              <Grid item xs={12}>
                <ModernTextField
                  fullWidth
                  label="About"
                  name="about"
                  value={editForm.about || ""}
                  onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ModernTextField
                  fullWidth
                  label="Date Range Start"
                  name="date_start"
                  type="date"
                  value={editForm.date_start || ""}
                  onChange={(e) => setEditForm({ ...editForm, date_start: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ModernTextField
                  fullWidth
                  label="Date Range End"
                  name="date_end"
                  type="date"
                  value={editForm.date_end || ""}
                  onChange={(e) => setEditForm({ ...editForm, date_end: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                {editForm.image && (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: settings?.textPrimaryColor || '#6D2323' }}>
                      Current Image:
                    </Typography>
                    <img
                      src={getImageUrl(editForm.image)}
                      alt="current"
                      style={{ maxWidth: 160, maxHeight: 90, borderRadius: 4 }}
                    />
                  </Box>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <ProfessionalButton
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                    sx={{
                      borderColor: settings?.primaryColor || '#894444',
                      color: settings?.primaryColor || '#894444',
                      "&:hover": {
                        borderColor: settings?.secondaryColor || '#6d2323',
                        bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                      },
                    }}
                  >
                    Replace Image
                    <input
                      type="file"
                      hidden
                      onChange={(e) =>
                        setEditForm({ ...editForm, image: e.target.files ? e.target.files[0] : null })
                      }
                    />
                  </ProfessionalButton>
                  {editForm.image && editForm.image instanceof File && (
                    <Typography variant="body2" sx={{ color: settings?.textPrimaryColor || '#6D2323' }}>
                      {editForm.image.name}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5) }}>
            <ProfessionalButton
              onClick={handleSaveEdit}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
              sx={{
                bgcolor: settings?.primaryColor || '#894444',
                color: settings?.accentColor || '#FEF9E1',
                "&:hover": { bgcolor: settings?.secondaryColor || '#6d2323' },
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </ProfessionalButton>
            <ProfessionalButton
              onClick={() => setOpenEditModal(false)}
              variant="outlined"
              startIcon={<CancelIcon />}
              sx={{
                borderColor: settings?.primaryColor || '#894444',
                color: settings?.primaryColor || '#894444',
                "&:hover": {
                  borderColor: settings?.secondaryColor || '#6d2323',
                  bgcolor: alpha(settings?.primaryColor || '#894444', 0.05),
                },
              }}
            >
              Cancel
            </ProfessionalButton>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AnnouncementForm;