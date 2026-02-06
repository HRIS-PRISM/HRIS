import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Container, Box, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Card, CardContent, CardHeader, Avatar,
  Fade, Backdrop, CircularProgress, Chip, Tooltip,
  IconButton, styled, alpha, Breadcrumbs, Link,
  Grid, InputAdornment, FormHelperText, Paper,
  ToggleButtonGroup, ToggleButton, Snackbar,
  MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon,
  Announcement as AnnouncementIcon, Reorder as ReorderIcon,
  Search as SearchIcon, Close as CloseIcon, Home,
  Image as ImageIcon, FilterList, Refresh, CheckCircle,
  Error, Info, Warning, Event as EventIcon,
  Block as BlockIcon,
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
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [createFormType, setCreateFormType] = useState("announcement"); // "announcement" | "suspension" | "holiday"
  const [newSuspension, setNewSuspension] = useState({
    title: "",
    about: "",
    date_start: "",
    date_end: "",
    reason: "",
    image: null,
  });
  const [newHoliday, setNewHoliday] = useState({
    title: "",
    about: "",
    date_start: "",
    date_end: "",
    status: "Active",
    image: null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "holiday" | "announcement" | "suspension"
  const [suspensions, setSuspensions] = useState([]);
  const [error, setError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
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
    fetchSuspensions();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders());
      setHolidays(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching holidays for announcements", err.message);
    }
  };

  const fetchSuspensions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders());
      setSuspensions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching suspensions", err.message);
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
        setSnackbarMessage("Please fill in Title, About, and Date Range (Start & End)");
        setSnackbarOpen(true);
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
      setSnackbarMessage("Failed to add announcement");
      setSnackbarOpen(true);
      setLoading(false);
    }
  };

  const handleNewSuspensionChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setNewSuspension((prev) => ({ ...prev, image: files ? files[0] : null }));
    } else {
      setNewSuspension((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddSuspension = async () => {
    setError("");
    if (!newSuspension.title || !newSuspension.date_start || !newSuspension.date_end) {
      setSnackbarMessage("Please fill in Title and Date Range (Start & End) for suspension.");
      setSnackbarOpen(true);
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", newSuspension.title);
      formData.append("about", newSuspension.about || "");
      formData.append("date_start", newSuspension.date_start);
      formData.append("date_end", newSuspension.date_end);
      formData.append("reason", newSuspension.reason || "");
      if (newSuspension.image) formData.append("image", newSuspension.image);

      await axios.post(`${API_BASE_URL}/api/suspensions`, formData, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers },
      });
      fetchSuspensions();
      setNewSuspension({ title: "", about: "", date_start: "", date_end: "", reason: "", image: null });
      setSuccessAction("create");
      setSuccessOpen(true);
    } catch (err) {
      setSnackbarMessage("Failed to add suspension.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNewHolidayChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setNewHoliday((prev) => ({ ...prev, image: files ? files[0] : null }));
    } else {
      setNewHoliday((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddHoliday = async () => {
    setError("");
    if (!newHoliday.title || !newHoliday.date_start || !newHoliday.date_end || !newHoliday.status) {
      setSnackbarMessage("Please fill in Title, Date Range (Start & End), and Status");
      setSnackbarOpen(true);
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", newHoliday.title);
      formData.append("about", newHoliday.about || "");
      formData.append("date_start", newHoliday.date_start);
      formData.append("date_end", newHoliday.date_end);
      formData.append("status", newHoliday.status);
      if (newHoliday.image) formData.append("image", newHoliday.image);

      await axios.post(`${API_BASE_URL}/holiday`, formData, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers },
      });
      fetchHolidays();
      setNewHoliday({ title: "", about: "", date_start: "", date_end: "", status: "Active", image: null });
      setSuccessAction("create");
      setSuccessOpen(true);
    } catch (err) {
      setSnackbarMessage("Failed to add holiday.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormTypeChange = (_, newType) => {
    if (newType) setCreateFormType(newType);
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
    setIsEditingAnnouncement(false);
    setOpenEditModal(true);
    setError("");
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setIsEditingAnnouncement(false);
    setEditingId(null);
    setEditForm({});
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
      setIsEditingAnnouncement(false);
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

  const handleDelete = async (item) => {
    const isSuspension = item.id && String(item.id).startsWith("suspension-");
    const numericId = isSuspension ? String(item.id).replace("suspension-", "") : item.id;
    const message = isSuspension ? "Are you sure you want to delete this suspension?" : "Are you sure you want to delete this announcement?";
    if (!window.confirm(message)) return;
    try {
      setLoading(true);
      if (isSuspension) {
        await axios.delete(`${API_BASE_URL}/api/suspensions/${numericId}`, getAuthHeaders());
        fetchSuspensions();
      } else {
        await axios.delete(`${API_BASE_URL}/api/announcements/${numericId}`, getAuthHeaders());
        fetchAnnouncements();
      }
      setSuccessAction("delete");
      setSuccessOpen(true);
      setLoading(false);
    } catch (error) {
      console.error("Error deleting", error);
      setSnackbarMessage(isSuspension ? "Failed to delete suspension." : "Failed to delete announcement.");
      setSnackbarOpen(true);
      setLoading(false);
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

  const suspensionsMapped = (suspensions || []).map((s) => ({
    id: `suspension-${s.id}`,
    title: s.title || "",
    about: s.about || "",
    date_start: s.date_start || s.date,
    date_end: s.date_end || s.date,
    date: s.date_start || s.date_end || s.date,
    image: s.image || null,
    isHoliday: false,
    isSuspension: true,
  }));

  const combinedItems = [
    ...scheduledHolidays,
    ...suspensionsMapped,
    ...announcements.map((a) => ({
      ...a,
      date_start: a.date_start || a.date,
      date_end: a.date_end || a.date,
      isHoliday: false,
      isSuspension: !!a.isSuspension,
    })),
  ].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date));

  // True when end date has passed (date range exceeded)
  const isDateRangeExceeded = (item) => {
    const end = item.date_end || item.date;
    if (!end) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    return today > endDate;
  };

  // Type chip colors: Announcement = white bg, Holiday = orange, Suspension = red
  const getTypeChipProps = (item) => {
    if (item.isSuspension) {
      return { label: "Suspension", icon: <BlockIcon sx={{ fontSize: 18 }} />, bgcolor: alpha("#d32f2f", 0.2), color: "#b71c1c", border: "1px solid #d32f2f" };
    }
    if (item.isHoliday) {
      return { label: "Holiday", icon: <EventIcon sx={{ fontSize: 18 }} />, bgcolor: alpha("#ed6c02", 0.25), color: "#e65100", border: "1px solid #ed6c02" };
    }
    return { label: "Announcement", icon: <AnnouncementIcon sx={{ fontSize: 18 }} />, bgcolor: "#ffffff", color: "#333333", border: "1px solid #e0e0e0" };
  };

  const filteredByType =
    typeFilter === "all"
      ? combinedItems
      : typeFilter === "holiday"
        ? combinedItems.filter((item) => item.isHoliday)
        : typeFilter === "announcement"
          ? combinedItems.filter((item) => !item.isHoliday && !item.isSuspension)
          : combinedItems.filter((item) => item.isSuspension);

  const filteredAnnouncements = filteredByType.filter(
    (item) =>
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

        {/* Error Alert - Center Modal Overlay (announcement errors only; suspension uses Snackbar below) */}
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

        {/* Validation/error Snackbar — portaled to body so it’s never clipped */}
        {createPortal(
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            sx={{ zIndex: 9998 }}
          >
            <Alert
              severity="error"
              onClose={() => setSnackbarOpen(false)}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>,
          document.body
        )}

        {/* Add Form - switch between Announcement, Suspension, and Holiday */}
        <Fade in timeout={700}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.8),
                        color: settings?.textPrimaryColor || '#6D2323',
                      }}
                    >
                      {createFormType === "announcement" && <AnnouncementIcon />}
                      {createFormType === "suspension" && <BlockIcon />}
                      {createFormType === "holiday" && <EventIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: settings?.textPrimaryColor || '#6D2323' }}>
                        {createFormType === "announcement" && "Create New Announcement"}
                        {createFormType === "suspension" && "Create New Suspension"}
                        {createFormType === "holiday" && "Create New Holiday"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ color: settings?.textPrimaryColor || '#6D2323' }}>
                        {createFormType === "announcement" && "Add a new announcement for employees"}
                        {createFormType === "suspension" && "Add a new suspension notice for employees"}
                        {createFormType === "holiday" && "Add a new official holiday for employees"}
                      </Typography>
                    </Box>
                  </Box>
                  <ToggleButtonGroup
                    value={createFormType}
                    exclusive
                    onChange={handleCreateFormTypeChange}
                    aria-label="create type"
                    size="small"
                    sx={{
                      border: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.3)}`,
                      "& .MuiToggleButton-root": {
                        color: settings?.textPrimaryColor || '#6D2323',
                        borderColor: alpha(settings?.primaryColor || '#894444', 0.3),
                        textTransform: "none",
                        fontWeight: 600,
                        "&.Mui-selected": {
                          bgcolor: alpha(settings?.primaryColor || '#894444', 0.15),
                          color: settings?.primaryColor || '#894444',
                          "&:hover": { bgcolor: alpha(settings?.primaryColor || '#894444', 0.25) },
                        },
                        "&:hover": { bgcolor: alpha(settings?.primaryColor || '#894444', 0.08) },
                      },
                    }}
                  >
                    <ToggleButton value="announcement" aria-label="announcement">
                      <AnnouncementIcon sx={{ fontSize: 18, mr: 0.5 }} />
                      Announcement
                    </ToggleButton>
                    <ToggleButton value="suspension" aria-label="suspension">
                      <BlockIcon sx={{ fontSize: 18, mr: 0.5 }} />
                      Suspension
                    </ToggleButton>
                    <ToggleButton value="holiday" aria-label="holiday">
                      <EventIcon sx={{ fontSize: 18, mr: 0.5 }} />
                      Holiday
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              }
              sx={{
                bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(settings?.primaryColor || '#894444', 0.1)}`,
              }}
            />
            <CardContent sx={{ p: 4 }}>
              {createFormType === "announcement" && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Title" name="title" value={newAnnouncement.title} onChange={handleNewChange} required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Date Range Start" name="date_start" type="date" value={newAnnouncement.date_start} onChange={handleNewChange} InputLabelProps={{ shrink: true }} required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Date Range End" name="date_end" type="date" value={newAnnouncement.date_end} onChange={handleNewChange} InputLabelProps={{ shrink: true }} required />
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="About" name="about" value={newAnnouncement.about} onChange={handleNewChange} multiline rows={3} required />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <ProfessionalButton variant="outlined" component="label" startIcon={<ImageIcon />} sx={{ borderColor: settings?.primaryColor || '#894444', color: settings?.primaryColor || '#894444', "&:hover": { borderColor: settings?.secondaryColor || '#6d2323', bgcolor: alpha(settings?.primaryColor || '#894444', 0.05) } }}>
                        Upload Image
                        <input type="file" hidden name="image" onChange={handleNewChange} />
                      </ProfessionalButton>
                      {newAnnouncement.image && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography variant="body2" sx={{ color: settings?.textPrimaryColor || '#6D2323' }}>{newAnnouncement.image.name}</Typography>
                          <img src={getImageUrl(newAnnouncement.image)} alt="preview" style={{ maxWidth: 160, maxHeight: 90, borderRadius: 4 }} />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <ProfessionalButton onClick={handleAdd} variant="contained" startIcon={<AddIcon />} disabled={loading} fullWidth sx={{ bgcolor: settings?.primaryColor || '#894444', color: settings?.accentColor || '#FEF9E1', "&:hover": { bgcolor: settings?.secondaryColor || '#6d2323' } }}>
                      {loading ? 'Adding...' : 'Add Announcement'}
                    </ProfessionalButton>
                  </Grid>
                </Grid>
              )}
              {createFormType === "suspension" && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Title" name="title" value={newSuspension.title} onChange={handleNewSuspensionChange} required placeholder="e.g. Office Suspension Notice" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Reason / Type" name="reason" value={newSuspension.reason} onChange={handleNewSuspensionChange} placeholder="e.g. Policy violation, Pending investigation" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Date Range Start" name="date_start" type="date" value={newSuspension.date_start} onChange={handleNewSuspensionChange} InputLabelProps={{ shrink: true }} required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField fullWidth label="Date Range End" name="date_end" type="date" value={newSuspension.date_end} onChange={handleNewSuspensionChange} InputLabelProps={{ shrink: true }} required />
                  </Grid>
                  <Grid item xs={12}>
                    <ModernTextField fullWidth label="Details / Description" name="about" value={newSuspension.about} onChange={handleNewSuspensionChange} multiline rows={3} placeholder="Full suspension details for employees" />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <ProfessionalButton variant="outlined" component="label" startIcon={<ImageIcon />} sx={{ borderColor: settings?.primaryColor || '#894444', color: settings?.primaryColor || '#894444', "&:hover": { borderColor: settings?.secondaryColor || '#6d2323', bgcolor: alpha(settings?.primaryColor || '#894444', 0.05) } }}>
                        Upload Image (optional)
                        <input type="file" hidden name="image" accept="image/*" onChange={handleNewSuspensionChange} />
                      </ProfessionalButton>
                      {newSuspension.image && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography variant="body2" sx={{ color: settings?.textPrimaryColor || '#6D2323' }}>{newSuspension.image.name}</Typography>
                          <img src={getImageUrl(newSuspension.image)} alt="preview" style={{ maxWidth: 160, maxHeight: 90, borderRadius: 4 }} />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <ProfessionalButton onClick={handleAddSuspension} variant="contained" startIcon={<AddIcon />} disabled={loading} fullWidth sx={{ bgcolor: settings?.primaryColor || '#894444', color: settings?.accentColor || '#FEF9E1', "&:hover": { bgcolor: settings?.secondaryColor || '#6d2323' } }}>
                      {loading ? 'Adding...' : 'Add Suspension'}
                    </ProfessionalButton>
                  </Grid>
                </Grid>
              )}
              {createFormType === "holiday" && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ModernTextField
                      fullWidth
                      label="Title"
                      name="title"
                      value={newHoliday.title}
                      onChange={handleNewHolidayChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <ModernTextField
                      fullWidth
                      label="About"
                      name="about"
                      value={newHoliday.about}
                      onChange={handleNewHolidayChange}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <ModernTextField
                      fullWidth
                      label="Date Range Start"
                      name="date_start"
                      type="date"
                      value={newHoliday.date_start}
                      onChange={handleNewHolidayChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <ModernTextField
                      fullWidth
                      label="Date Range End"
                      name="date_end"
                      type="date"
                      value={newHoliday.date_end}
                      onChange={handleNewHolidayChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel
                        sx={{
                          fontWeight: 500,
                          color: settings?.textPrimaryColor || '#6D2323',
                          "&.Mui-focused": { color: settings?.primaryColor || '#894444' },
                        }}
                      >
                        Status
                      </InputLabel>
                      <Select
                        name="status"
                        value={newHoliday.status}
                        onChange={(e) => setNewHoliday((prev) => ({ ...prev, status: e.target.value }))}
                        label="Status"
                        sx={{
                          borderRadius: 3,
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.95)" },
                          "&.Mui-focused": {
                            boxShadow: `0 4px 20px ${settings?.primaryColor || '#894444'}40`,
                            backgroundColor: "rgba(255, 255, 255, 1)",
                          },
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(settings?.primaryColor || '#894444', 0.3) },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(settings?.primaryColor || '#894444', 0.5) },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: settings?.primaryColor || '#894444' },
                        }}
                      >
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: settings?.textPrimaryColor || '#6D2323', fontWeight: 600 }}>
                      Picture (optional) — shown in announcements & carousel
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <ProfessionalButton
                        variant="outlined"
                        component="label"
                        startIcon={<ImageIcon />}
                        sx={{
                          borderColor: settings?.primaryColor || '#894444',
                          color: settings?.primaryColor || '#894444',
                          "&:hover": { borderColor: settings?.secondaryColor || '#6d2323', bgcolor: alpha(settings?.primaryColor || '#894444', 0.05) },
                        }}
                      >
                        Upload Picture
                        <input type="file" hidden name="image" accept="image/*" onChange={handleNewHolidayChange} />
                      </ProfessionalButton>
                      {newHoliday.image && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography variant="body2" sx={{ color: settings?.textPrimaryColor || '#6D2323' }}>{newHoliday.image.name}</Typography>
                          <img src={getImageUrl(newHoliday.image)} alt="Preview" style={{ maxWidth: 120, maxHeight: 70, borderRadius: 8 }} />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <ProfessionalButton
                      onClick={handleAddHoliday}
                      variant="contained"
                      startIcon={<AddIcon />}
                      disabled={loading}
                      fullWidth
                      sx={{ bgcolor: settings?.primaryColor || '#894444', color: settings?.accentColor || '#FEF9E1', "&:hover": { bgcolor: settings?.secondaryColor || '#6d2323' } }}
                    >
                      {loading ? 'Adding...' : 'Add Holiday'}
                    </ProfessionalButton>
                  </Grid>
                </Grid>
              )}
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
                      ? `Showing ${filteredAnnouncements.length} of ${filteredByType.length} items matching "${searchQuery}"`
                      :                     typeFilter !== "all"
                        ? `Showing ${filteredAnnouncements.length} ${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}(s)`
                        : `Total: ${combinedItems.length} items (${announcements.length} announcements${scheduledHolidays.length ? `, ${scheduledHolidays.length} holiday(s)` : ""}${suspensions.length ? `, ${suspensions.length} suspension(s)` : ""})`}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="type-filter-label">Type</InputLabel>
                    <Select
                      labelId="type-filter-label"
                      label="Type"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(settings?.primaryColor || '#894444', 0.3) },
                      }}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="holiday">Holiday</MenuItem>
                      <MenuItem value="announcement">Announcement</MenuItem>
                      <MenuItem value="suspension">Suspension</MenuItem>
                    </Select>
                  </FormControl>
                  <ModernTextField
                    size="small"
                    variant="outlined"
                    placeholder="Search by Title or About"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: "280px" }}
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

              <Box sx={{ width: "100%", maxHeight: "55vh", overflow: "auto" }}>
                <PremiumTableContainer elevation={0}>
                  <Table sx={{ minWidth: 800, width: "100%" }} stickyHeader>
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
                                No announcements, holidays, or suspensions
                              </Typography>
                              <Typography
                                variant="body1"
                                color={alpha(settings?.primaryColor || '#894444', 0.4)}
                              >
                                {searchQuery
                                  ? "Try adjusting your search criteria"
                                  : typeFilter !== "all"
                                    ? `No ${typeFilter}s found.`
                                    : "No announcements, holidays, or suspensions. Add one above or switch the Type filter."}
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
                              {(() => {
                                const chip = getTypeChipProps(item);
                                return (
                                  <Chip
                                    size="small"
                                    icon={chip.icon}
                                    label={chip.label}
                                    sx={{
                                      bgcolor: chip.bgcolor,
                                      color: chip.color,
                                      border: chip.border,
                                      fontWeight: 600,
                                      "& .MuiChip-icon": { color: "inherit" },
                                    }}
                                  />
                                );
                              })()}
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
                                  Ended
                                </Typography>
                              ) : isDateRangeExceeded(item) ? (
                                <Typography variant="body2" sx={{ color: alpha(settings?.textPrimaryColor || "#6D2323", 0.6), fontStyle: "italic" }}>
                                  Ended
                                </Typography>
                              ) : (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                                  {!item.isSuspension && (
                                    <Tooltip title="Edit Announcement">
                                      <ProfessionalButton
                                        onClick={() => handleEdit(item)}
                                        variant="contained"
                                        startIcon={<EditIcon />}
                                        sx={{
                                          bgcolor: settings?.updateButtonColor || settings?.primaryColor || '#894444',
                                          color: settings?.accentColor || '#FEF9E1',
                                          minWidth: '120px',
                                          "&:hover": { bgcolor: settings?.updateButtonHoverColor || settings?.secondaryColor || '#6d2323' },
                                        }}
                                      >
                                        Edit
                                      </ProfessionalButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title={item.isSuspension ? "Delete Suspension" : "Delete Announcement"}>
                                    <ProfessionalButton
                                      onClick={() => handleDelete(item)}
                                      variant="outlined"
                                      startIcon={<DeleteIcon />}
                                      sx={{
                                        borderColor: settings?.deleteButtonColor || settings?.primaryColor || '#6d2323',
                                        color: settings?.deleteButtonColor || settings?.primaryColor || '#6d2323',
                                        minWidth: '120px',
                                        '&:hover': {
                                          backgroundColor: alpha(settings?.deleteButtonColor || settings?.primaryColor || '#6d2323', 0.1),
                                          borderColor: settings?.deleteButtonHoverColor || settings?.secondaryColor || '#a31d1d',
                                          color: settings?.deleteButtonHoverColor || settings?.secondaryColor || '#a31d1d',
                                        },
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

        {/* Edit Modal - same as Children/Holiday: view mode (Edit + Delete) then edit mode (Cancel + Save) */}
        <Dialog
          open={openEditModal}
          onClose={handleCloseEditModal}
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
              {isEditingAnnouncement ? "Edit Announcement" : "Announcement Details"}
            </Box>
            <IconButton onClick={handleCloseEditModal} sx={{ color: settings?.accentColor || '#FEF9E1' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
            {!isEditingAnnouncement ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: settings?.textPrimaryColor || '#6D2323', fontWeight: 600 }}>Title</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{editForm.title || "—"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: settings?.textPrimaryColor || '#6D2323', fontWeight: 600 }}>About</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{editForm.about || "—"}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: settings?.textPrimaryColor || '#6D2323', fontWeight: 600 }}>Date Start</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{editForm.date_start ? formatDateForDisplay(editForm.date_start) : "—"}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ color: settings?.textPrimaryColor || '#6D2323', fontWeight: 600 }}>Date End</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{editForm.date_end ? formatDateForDisplay(editForm.date_end) : "—"}</Typography>
                </Grid>
                {editForm.image && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: settings?.textPrimaryColor || '#6D2323', fontWeight: 600 }}>Image</Typography>
                    <Box sx={{ mt: 1 }}>
                      <img src={getImageUrl(editForm.image)} alt="Announcement" style={{ maxWidth: 200, maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
                    </Box>
                  </Grid>
                )}
              </Grid>
            ) : (
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
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: alpha(settings?.accentColor || '#FEF9E1', 0.5), display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
            {!isEditingAnnouncement ? (
              <>
                <ProfessionalButton
                  onClick={() => setIsEditingAnnouncement(true)}
                  variant="contained"
                  startIcon={<EditIcon />}
                  sx={{
                    bgcolor: settings?.updateButtonColor || settings?.primaryColor || '#894444',
                    color: settings?.accentColor || '#FEF9E1',
                    minWidth: '120px',
                    '&:hover': { bgcolor: settings?.updateButtonHoverColor || settings?.secondaryColor || '#6d2323' },
                  }}
                >
                  Edit
                </ProfessionalButton>
                <ProfessionalButton
                  onClick={() => {
                    const idToDelete = editingId;
                    handleCloseEditModal();
                    if (idToDelete) handleDelete({ id: idToDelete });
                  }}
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  sx={{
                    borderColor: settings?.deleteButtonColor || settings?.primaryColor || '#6d2323',
                    color: settings?.deleteButtonColor || settings?.primaryColor || '#6d2323',
                    minWidth: '120px',
                    '&:hover': {
                      backgroundColor: alpha(settings?.deleteButtonColor || settings?.primaryColor || '#6d2323', 0.1),
                      borderColor: settings?.deleteButtonHoverColor || settings?.secondaryColor || '#a31d1d',
                      color: settings?.deleteButtonHoverColor || settings?.secondaryColor || '#a31d1d',
                    },
                  }}
                >
                  Delete
                </ProfessionalButton>
              </>
            ) : (
              <>
                <ProfessionalButton
                  onClick={() => setIsEditingAnnouncement(false)}
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  sx={{
                    borderColor: settings?.cancelButtonColor || '#6c757d',
                    color: settings?.cancelButtonColor || '#6c757d',
                    minWidth: '120px',
                    '&:hover': {
                      borderColor: settings?.cancelButtonHoverColor || '#5a6268',
                      bgcolor: alpha(settings?.cancelButtonColor || '#6c757d', 0.1),
                    },
                  }}
                >
                  Cancel
                </ProfessionalButton>
                <ProfessionalButton
                  onClick={handleSaveEdit}
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  sx={{
                    bgcolor: settings?.updateButtonColor || settings?.primaryColor || '#894444',
                    color: settings?.accentColor || '#FEF9E1',
                    minWidth: '120px',
                    '&:hover': { bgcolor: settings?.updateButtonHoverColor || settings?.secondaryColor || '#6d2323' },
                  }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </ProfessionalButton>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AnnouncementForm;