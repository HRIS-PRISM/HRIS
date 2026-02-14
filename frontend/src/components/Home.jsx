import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../contexts/SocketContext";
import {
  IconButton,
  Modal,
  Tooltip,
  Box,
  Grid,
  Typography,
  Avatar,
  Button,
  Badge,
  Card,
  CardContent,
  Divider,
  Paper,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grow,
  Fade,
  Menu,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";

import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import NotificationsIcon from "@mui/icons-material/Notifications";
import {
  AccessTime,
  AccountBalance,
  Description,
  Download,
  Person,
  ContactPage,
  Receipt,
  Event,
  TrendingUp,
  CalendarMonth,
  Logout,
  Settings,
  Dashboard as DashboardIcon,
  InsertDriveFile,
  WorkHistory,
  Close,
  Add,
  Note,
  Edit,
  Delete,
  Save,
  Flag,
  ArrowForward,
  PlayArrow,
  Pause,
  AccountCircle,
  HelpOutline,
  PrivacyTip,
  EditCalendar,
  ManageAccounts,
  MoreVert,
} from "@mui/icons-material";

const API_BASE_URL = "http://localhost:5000";

// Add the useSystemSettings hook from HomeAdmin.jsx
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: "#894444",
    secondaryColor: "#6d2323",
    accentColor: "#FEF9E1",
    textColor: "#FFFFFF",
    textPrimaryColor: "#6D2323",
    textSecondaryColor: "#FEF9E1",
    hoverColor: "#6D2323",
    backgroundColor: "#FFFFFF",
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem("systemSettings");
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error("Error parsing stored settings:", error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;

        const response = await axios.get(url);
        setSettings(response.data);
        localStorage.setItem("systemSettings", JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching system settings:", error);
      }
    };

    fetchSettings();
  }, []);

  return settings;
};

// --- OPTIMIZED useCarousel Hook ---
// FIXED: Added 'items.length' to dependencies to restart timer on data load
const useCarousel = (items, autoPlay = true, interval = 5000) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Keep a ref to the latest items to prevent timer reset on component re-renders
  const itemsRef = useRef(items);

  // Update ref when items prop changes
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    // Only restart timer if isPlaying changes or items.length changes.
    // This prevents the timer from clearing every time the component re-renders.
    if (!isPlaying || !itemsRef.current || itemsRef.current.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [isPlaying, interval, items.length]); // Added items.length

  const handlePrevSlide = useCallback(() => {
    if (!itemsRef.current || itemsRef.current.length === 0) return;
    setCurrentSlide((s) => (s - 1 + itemsRef.current.length) % itemsRef.current.length);
  }, []);

  const handleNextSlide = useCallback(() => {
    if (!itemsRef.current || itemsRef.current.length === 0) return;
    setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
  }, []);

  const handleSlideSelect = useCallback(
    (index) => {
      if (!itemsRef.current || itemsRef.current.length === 0) return;
      setCurrentSlide(index);
    },
    []
  );

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  };
};

const Home = () => {
  // Add the useSystemSettings hook
  const settings = useSystemSettings();
  const { socket, connected } = useSocket();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [payrollData, setPayrollData] = useState(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementDetails, setAnnouncementDetails] = useState({}); // Store announcement details by notification id

  // New states for notes and events
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [openNoteDialog, setOpenNoteDialog] = useState(false);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [currentNote, setCurrentNote] = useState({ date: "", content: "" });
  const [currentEvent, setCurrentEvent] = useState({
    date: "",
    title: "",
    description: "",
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [viewNotesDialog, setViewNotesDialog] = useState(false);

  // Avatar dropdown state
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // Calendar legends menu (3 dots)
  const [calendarLegendAnchorEl, setCalendarLegendAnchorEl] = useState(null);
  const openCalendarLegend = Boolean(calendarLegendAnchorEl);

  // Payslip month for dropdown (wireframe)
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth());
  const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());

  const navigate = useNavigate();

  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fetch holidays and suspensions
  const fetchHolidays = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/holiday`);
      if (Array.isArray(res.data)) {
        setRawHolidays(res.data);
        const transformedHolidays = res.data.map((item) => {
          const d = new Date(item.date);
          const normalizedDate = !isNaN(d)
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : item.date;
          return {
            date: normalizedDate,
            name: item.description,
            status: item.status,
          };
        });
        setHolidays(transformedHolidays);
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
    }
  }, []);

  const fetchSuspensions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/suspensions`);
      setSuspensions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching suspensions:", err);
      setSuspensions([]);
    }
  }, []);

  // Build carousel items (same logic as HomeAdmin.jsx)
  const todayInRange = (start, end, fallbackDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const fb = fallbackDate ? new Date(fallbackDate) : null;
    if (s) s.setHours(0, 0, 0, 0);
    if (e) e.setHours(0, 0, 0, 0);
    if (fb) fb.setHours(0, 0, 0, 0);
    if (s && e) return today >= s && today <= e;
    if (s && !e) return today >= s;
    if (!s && e) return today <= e;
    if (fb) return today >= fb;
    return false;
  };

  let scheduledHolidaysForCarousel = (rawHolidays || [])
    .filter((h) => (h.status || "").toLowerCase() === "active")
    .filter((h) => {
      if (todayInRange(h.date_start, h.date_end, h.date)) return true;
      const endDate = h.date_end || h.date;
      if (!endDate) return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      return today <= end;
    })
    .map((h) => ({
      id: `holiday-${h.id}`,
      title: h.title || h.description || "",
      about: h.about || "Official holiday.",
      date: h.date_start || h.date_end || h.date,
      date_start: h.date_start || h.date,
      date_end: h.date_end || h.date,
      image: h.image || null,
    }));

  if (scheduledHolidaysForCarousel.length === 0 && Array.isArray(rawHolidays) && rawHolidays.length > 0) {
    const active = rawHolidays.filter((h) => (h.status || "").toLowerCase() === "active");
    scheduledHolidaysForCarousel = active
      .slice()
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date))
      .slice(0, 10)
      .map((h) => ({
        id: `holiday-${h.id}`,
        title: h.title || h.description || "",
        about: h.about || "Official holiday.",
        date: h.date_start || h.date_end || h.date,
        date_start: h.date_start || h.date,
        date_end: h.date_end || h.date,
        image: h.image || null,
      }));
  }

  let announcementsInRange = (announcements || []).filter((a) => {
    if (todayInRange(a.date_start, a.date_end, a.date)) return true;
    const endDate = a.date_end || a.date;
    if (!endDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return today <= end;
  });

  if (announcementsInRange.length === 0 && Array.isArray(announcements) && announcements.length > 0) {
    announcementsInRange = announcements
      .slice()
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date))
      .slice(0, 10);
  }

  let suspensionsInRange = (suspensions || []).filter((s) => {
    if (todayInRange(s.date_start, s.date_end, s.date)) return true;
    const endDate = s.date_end || s.date;
    if (!endDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return today <= end;
  });

  if (suspensionsInRange.length === 0 && Array.isArray(suspensions) && suspensions.length > 0) {
    suspensionsInRange = suspensions
      .slice()
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date))
      .slice(0, 10);
  }

  const suspensionsForCarousel = suspensionsInRange.map((s) => ({
    id: `suspension-${s.id}`,
    title: s.title || "",
    about: s.about || "",
    date: s.date_start || s.date_end || s.date,
    date_start: s.date_start || s.date,
    date_end: s.date_end || s.date,
    image: s.image || null,
  }));

  // Use useMemo to prevent recalculating array on re-renders (e.g. clock updates)
  const carouselItems = useMemo(() => [
    ...scheduledHolidaysForCarousel,
    ...suspensionsForCarousel,
    ...announcementsInRange,
  ].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date)),
  [scheduledHolidaysForCarousel, suspensionsForCarousel, announcementsInRange]);

  // Use the carousel hook with combined items
  const {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  } = useCarousel(carouselItems);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to normalize date to YYYY-MM-DD
  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split("T")[0];
  };

  // Load notes and events from database
  useEffect(() => {
    const fetchNotesAndEvents = async () => {
      if (!employeeNumber) return;
      console.log(`Fetching notes and events for employee: ${employeeNumber}`);

      try {
        const [notesRes, eventsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/notes/${employeeNumber}`),
          axios.get(`${API_BASE_URL}/api/events/${employeeNumber}`),
        ]);

        const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];
        const fetchedEvents = Array.isArray(eventsRes.data)
          ? eventsRes.data
          : [];

        // Normalize dates from API response
        const normalizedNotes = fetchedNotes.map((note) => ({
          ...note,
          date: normalizeDate(note.date),
        }));
        const normalizedEvents = fetchedEvents.map((event) => ({
          ...event,
          date: normalizeDate(event.date),
        }));

        console.log("Normalized Notes:", normalizedNotes);
        console.log("Normalized Events:", normalizedEvents);

        setNotes(normalizedNotes);
        setEvents(normalizedEvents);
      } catch (err) {
        console.error("Error fetching notes and events:", err);
        // Fallback to localStorage if API fails
        const savedNotes = JSON.parse(
          localStorage.getItem("employeeNotes") || "[]"
        );
        const savedEvents = JSON.parse(
          localStorage.getItem("employeeEvents") || "[]"
        );
        setNotes(savedNotes);
        setEvents(savedEvents);
      }
    };

    fetchNotesAndEvents();
  }, [employeeNumber]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!employeeNumber) {
      console.log("No employeeNumber, skipping notification fetch");
      return;
    }

    const empNum = String(employeeNumber).trim();
    if (!empNum) return;

    try {
      console.log(`Fetching notifications for employeeNumber: ${empNum}`);
      const [notifRes, unreadRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/notifications/${empNum}`),
        axios.get(`${API_BASE_URL}/api/notifications/${empNum}/unread-count`),
      ]);

      const filteredNotifications = Array.isArray(notifRes.data)
        ? notifRes.data.filter(
            (notif) => String(notif.employeeNumber).trim() === empNum
          )
        : [];

      setNotifications(filteredNotifications);
      setUnreadCount(unreadRes.data?.count || 0);

      const announcementNotifs = filteredNotifications.filter(
        (n) => n.notification_type === "announcement" && n.announcement_id
      );
      if (announcementNotifs.length > 0) {
        try {
          const annRes = await axios.get(`${API_BASE_URL}/api/announcements`);
          const announcementList = Array.isArray(annRes.data) ? annRes.data : [];
          const detailsMap = {};
          announcementNotifs.forEach((notif) => {
            const announcement = announcementList.find(
              (ann) =>
                ann.id === notif.announcement_id ||
                ann.id === parseInt(notif.announcement_id)
            );
            if (announcement) {
              detailsMap[notif.id] = announcement;
            }
          });
          setAnnouncementDetails(detailsMap);
        } catch (err) {
          console.error("Error fetching announcement details:", err);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [employeeNumber]);

  // Keep latest fetch function for Socket.IO handlers
  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  // Initial fetch (and when employee changes)
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Fetch announcements function (runs on load; WebSocket only pushes updates)
  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/announcements`);
      const announcementsList = Array.isArray(res.data) ? res.data : [];
      setAnnouncements(announcementsList);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  // Keep latest fetchAnnouncements function for Socket.IO handlers
  const fetchAnnouncementsRef = useRef(fetchAnnouncements);
  useEffect(() => {
    fetchAnnouncementsRef.current = fetchAnnouncements;
  }, [fetchAnnouncements]);

  // Universal Socket.IO: refresh notifications when server pushes updates
  useEffect(() => {
    if (!socket || !connected) return;

    const refreshTimeoutRef = { current: null };
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return;
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        if (typeof fetchNotificationsRef.current === "function") {
          fetchNotificationsRef.current();
        }
      }, 250);
    };

    const handleNotificationCreated = (payload) => {
      scheduleRefresh();
    };
    const handlePayrollChanged = () => scheduleRefresh();

    // Handle announcement changes - update state DIRECTLY from socket (no API call = instant!)
    const handleAnnouncementChanged = (payload) => {
      console.log('📢 Announcement changed via socket:', payload);
      const { action, announcement } = payload;
      
      if (action === "created") {
        // Add new announcement to the beginning of the list
        setAnnouncements((prev) => {
          // Check if already exists (avoid duplicates)
          const exists = prev.some((a) => a.id === announcement.id);
          if (exists) {
            console.log('Announcement already exists, skipping duplicate');
            return prev;
          }
          console.log('Adding new announcement:', announcement);
          return [announcement, ...prev];
        });
      } else if (action === "updated") {
        // Update existing announcement in the list
        console.log('Updating announcement:', announcement);
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === announcement.id ? announcement : a))
        );
      } else if (action === "deleted") {
        // Remove announcement from the list
        const deletedId = announcement?.id || announcement;
        console.log('Deleting announcement:', deletedId);
        setAnnouncements((prev) =>
          prev.filter((a) => a.id !== deletedId)
        );
      }
    };

    const handleAdminDashboardUpdated = (payload) => {
      console.log('📊 Admin dashboard updated via socket:', payload);
      const { source, action } = payload;
      if (source === 'holiday' || source === 'suspensions') {
        // Refresh holidays and suspensions when they're created/updated/deleted
        fetchHolidays();
        fetchSuspensions();
      }
    };

    socket.on("notificationCreated", handleNotificationCreated);
    socket.on("payrollChanged", handlePayrollChanged);
    socket.on("announcementChanged", handleAnnouncementChanged);
    socket.on("adminDashboardUpdated", handleAdminDashboardUpdated);

    return () => {
      socket.off("notificationCreated", handleNotificationCreated);
      socket.off("payrollChanged", handlePayrollChanged);
      socket.off("announcementChanged", handleAnnouncementChanged);
      socket.off("adminDashboardUpdated", handleAdminDashboardUpdated);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [socket, connected, fetchHolidays, fetchSuspensions]);

  const handleNotificationClick = async (notification) => {
    if (notification.read_status === 0) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.put(
          `${API_BASE_URL}/api/notifications/${notification.id}/read`,
          {},
          { headers }
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read_status: 1 } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    if (
      notification.notification_type === "payslip" ||
      (notification.action_link && notification.action_link.includes("payslip"))
    ) {
      setNotifModalOpen(false);
      navigate("/payslip");
    } else if (
      notification.notification_type === "contact" ||
      (notification.action_link &&
        notification.action_link.includes("settings"))
    ) {
      setNotifModalOpen(false);
      navigate("/settings");
    } else if (
      notification.notification_type === "announcement" ||
      (notification.action_link &&
        notification.action_link.includes("announcement"))
    ) {
      try {
        const annRes = await axios.get(`${API_BASE_URL}/api/announcements`);
        const announcementList = Array.isArray(annRes.data) ? annRes.data : [];
        let matchingAnnouncement = null;
        if (notification.announcement_id) {
          matchingAnnouncement = announcementList.find(
            (ann) =>
              ann.id === notification.announcement_id ||
              ann.id === parseInt(notification.announcement_id)
          );
        }
        if (!matchingAnnouncement && notification.announcement_id) {
          const cachedAnnouncement = announcementDetails[notification.id];
          if (cachedAnnouncement) {
            matchingAnnouncement = cachedAnnouncement;
          }
        }
        if (!matchingAnnouncement && announcementList.length > 0) {
          matchingAnnouncement = announcementList[0]; // Most recent
        }
        if (matchingAnnouncement) {
          setNotifModalOpen(false);
          setSelectedAnnouncement(matchingAnnouncement);
          setOpenModal(true);
        } else {
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
        setNotifModalOpen(false);
      }
    } else if (notification.notification_type === "holiday") {
      try {
        const holidayRes = await axios.get(`${API_BASE_URL}/holiday`);
        const holidayList = Array.isArray(holidayRes.data) ? holidayRes.data : [];
        let matchingHoliday = null;
        if (holidayList.length > 0) {
          matchingHoliday = holidayList[0]; // Most recent
        }
        if (matchingHoliday) {
          const holidayItem = {
            id: `holiday-${matchingHoliday.id}`,
            title: matchingHoliday.title || matchingHoliday.description || "",
            about: matchingHoliday.about || "Official holiday.",
            date: matchingHoliday.date_start || matchingHoliday.date_end || matchingHoliday.date,
            date_start: matchingHoliday.date_start || matchingHoliday.date,
            date_end: matchingHoliday.date_end || matchingHoliday.date,
            image: matchingHoliday.image || null,
          };
          setNotifModalOpen(false);
          setSelectedAnnouncement(holidayItem);
          setOpenModal(true);
        } else {
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.error("Error fetching holiday:", err);
        setNotifModalOpen(false);
      }
    } else if (notification.notification_type === "suspension") {
      try {
        const suspRes = await axios.get(`${API_BASE_URL}/api/suspensions`);
        const suspensionList = Array.isArray(suspRes.data) ? suspRes.data : [];
        let matchingSuspension = null;
        if (suspensionList.length > 0) {
          matchingSuspension = suspensionList[0]; // Most recent
        }
        if (matchingSuspension) {
          const suspensionItem = {
            id: `suspension-${matchingSuspension.id}`,
            title: matchingSuspension.title || "",
            about: matchingSuspension.about || "",
            date: matchingSuspension.date_start || matchingSuspension.date_end || matchingSuspension.date,
            date_start: matchingSuspension.date_start || matchingSuspension.date,
            date_end: matchingSuspension.date_end || matchingSuspension.date,
            image: matchingSuspension.image || null,
          };
          setNotifModalOpen(false);
          setSelectedAnnouncement(suspensionItem);
          setOpenModal(true);
        } else {
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.error("Error fetching suspension:", err);
        setNotifModalOpen(false);
      }
    } else if (notification.action_link) {
      setNotifModalOpen(false);
      navigate(notification.action_link);
    }
  };

  const getUserInfo = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      return {
        role: decoded.role,
        employeeNumber: decoded.employeeNumber,
        username: decoded.username,
      };
    } catch (err) {
      console.error("Error decoding token:", err);
      return {};
    }
  };

  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.username) setUsername(userInfo.username);
    if (userInfo.employeeNumber) setEmployeeNumber(userInfo.employeeNumber);
  }, []);

  // Initial fetch for announcements, holidays, and suspensions
  useEffect(() => {
    fetchAnnouncements();
    fetchHolidays();
    fetchSuspensions();
  }, [fetchAnnouncements, fetchHolidays, fetchSuspensions]);

  const handleOpenModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedAnnouncement(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/personalinfo/person_table`
        );
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find(
          (p) => String(p.agencyEmployeeNum) === String(employeeNumber)
        );
        if (match && match.profile_picture)
          setProfilePicture(match.profile_picture);
        const fullNameFromPerson = `${match.firstName || ""} ${
          match.middleName || ""
        } ${match.lastName || ""} ${match.nameExtension || ""}`.trim();
        if (fullNameFromPerson) {
          setFullName(fullNameFromPerson);
        }
      } catch (err) {
        console.error("Error loading profile picture:", err);
      }
    };

    if (employeeNumber) fetchProfilePicture();
  }, [employeeNumber]);

  useEffect(() => {
    const fetchPayrollData = async () => {
      if (!employeeNumber) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/finalized-payroll`);
        const list = Array.isArray(res.data) ? res.data : [];
        const userPayroll = list.find(
          (p) =>
            String(p.employeeNumber) === String(employeeNumber) ||
            String(p.agencyEmployeeNum) === String(employeeNumber)
        );
        setPayrollData(userPayroll || null);
      } catch (err) {
        console.error("Error fetching payroll:", err);
      }
    };
    fetchPayrollData();
  }, [employeeNumber]);

  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === "" || value === "0")
      return "₱0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "₱0.00";
    return `₱${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const generateCalendar = () => {
    const days = [];
    const totalCells = 42;
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    const remaining = totalCells - days.length;
    for (let i = 0; i < remaining; i++) days.push(null);
    return days;
  };

  const calendarDays = generateCalendar();

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/holiday`);
        if (Array.isArray(res.data)) {
          const transformedHolidays = res.data.map((item) => {
            const d = new Date(item.date);
            const normalizedDate = !isNaN(d)
              ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                  2,
                  "0"
                )}-${String(d.getDate()).padStart(2, "0")}`
              : item.date;

            return {
              date: normalizedDate,
              name: item.description,
              status: item.status,
            };
          });
          setHolidays(transformedHolidays);
        }
      } catch (err) {
        console.error("Error fetching holidays:", err);
      }
    };
    fetchHolidays();
  }, []);

  // Note and Event handlers
  const handleAddNote = () => {
    if (!selectedDate) return;
    setCurrentNote({ date: selectedDate, content: "" });
    setOpenNoteDialog(true);
  };

  const handleSaveNote = async () => {
    try {
      const newNotePayload = {
        employee_number: employeeNumber,
        date: currentNote.date, // This should already be in YYYY-MM-DD format
        content: currentNote.content,
      };
      console.log("Saving note with payload:", newNotePayload);

      const res = await axios.post(`${API_BASE_URL}/api/notes`, newNotePayload);
      const savedNote = res.data;
      // Normalize the date from the response to be safe
      const normalizedNote = {
        ...savedNote,
        date: normalizeDate(savedNote.date),
      };

      console.log("Saved and normalized note:", normalizedNote);
      setNotes((prevNotes) => [...prevNotes, normalizedNote]);
      localStorage.setItem(
        "employeeNotes",
        JSON.stringify([...notes, normalizedNote])
      );

      setOpenNoteDialog(false);
      setCurrentNote({ date: "", content: "" });
    } catch (err) {
      console.error("Error saving note:", err);
      // Fallback to localStorage if API fails
      const newNote = {
        id: Date.now(),
        date: currentNote.date,
        content: currentNote.content,
        createdAt: new Date().toISOString(),
      };
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      localStorage.setItem("employeeNotes", JSON.stringify(updatedNotes));
      setOpenNoteDialog(false);
      setCurrentNote({ date: "", content: "" });
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/notes/${noteId}`);
      const updatedNotes = notes.filter((n) => n.id !== noteId);
      setNotes(updatedNotes);
      localStorage.setItem("employeeNotes", JSON.stringify(updatedNotes));
    } catch (err) {
      console.error("Error deleting note:", err);
      const updatedNotes = notes.filter((n) => n.id !== noteId);
      setNotes(updatedNotes);
      localStorage.setItem("employeeNotes", JSON.stringify(updatedNotes));
    }
  };

  const handleAddEvent = () => {
    if (!selectedDate) return;
    setCurrentEvent({ date: selectedDate, title: "", description: "" });
    setOpenEventDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      const newEventPayload = {
        employee_number: employeeNumber,
        date: currentEvent.date, // This should already be in YYYY-MM-DD format
        title: currentEvent.title,
        description: currentEvent.description,
      };
      console.log("Saving event with payload:", newEventPayload);

      const res = await axios.post(
        `${API_BASE_URL}/api/events`,
        newEventPayload
      );
      const savedEvent = res.data;
      // Normalize the date from the response to be safe
      const normalizedEvent = {
        ...savedEvent,
        date: normalizeDate(savedEvent.date),
      };

      console.log("Saved and normalized event:", normalizedEvent);
      setEvents((prevEvents) => [...prevEvents, normalizedEvent]);
      localStorage.setItem(
        "employeeEvents",
        JSON.stringify([...events, normalizedEvent])
      );

      setOpenEventDialog(false);
      setCurrentEvent({ date: "", title: "", description: "" });
    } catch (err) {
      console.error("Error saving event:", err);
      const newEvent = {
        id: Date.now(),
        date: currentEvent.date,
        title: currentEvent.title,
        description: currentEvent.description,
        createdAt: new Date().toISOString(),
        notified: false,
      };
      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      localStorage.setItem("employeeEvents", JSON.stringify(updatedEvents));
      setOpenEventDialog(false);
      setCurrentEvent({ date: "", title: "", description: "" });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/events/${eventId}`);
      const updatedEvents = events.filter((e) => e.id !== eventId);
      setEvents(updatedEvents);
      localStorage.setItem("employeeEvents", JSON.stringify(updatedEvents));
    } catch (err) {
      console.error("Error deleting event:", err);
      const updatedEvents = events.filter((e) => e.id !== eventId);
      setEvents(updatedEvents);
      localStorage.setItem("employeeEvents", JSON.stringify(updatedEvents));
    }
  };

  const getNotesForDate = (dateStr) => {
    const dayNotes = notes.filter((n) => n.date === dateStr);
    console.log(`Notes for ${dateStr}:`, dayNotes);
    return dayNotes;
  };

  const getEventsForDate = (dateStr) => {
    const dayEvents = events.filter((e) => e.date === dateStr);
    console.log(`Events for ${dateStr}:`, dayEvents);
    return dayEvents;
  };

  const getTodayEvents = () => {
    const today = normalizeDate(new Date());
    return events.filter((e) => e.date === today);
  };

  const getUpcomingEvents = () => {
    const today = normalizeDate(new Date());
    const threeDaysLater = normalizeDate(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );
    return events.filter((e) => e.date >= today && e.date <= threeDaysLater);
  };

  const getRecentActivity = () => {
    const allActivity = [
      ...notes.map((note) => ({
        id: note.id,
        type: "note",
        title: "Note",
        content: note.content,
        date: note.date,
        createdAt: note.createdAt || new Date().toISOString(),
      })),
      ...events.map((event) => ({
        id: event.id,
        type: "event",
        title: event.title,
        content: event.description,
        date: event.date,
        createdAt: event.createdAt || new Date().toISOString(),
      })),
    ];
    return allActivity
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  };

  const quickActions = [
    {
      icon: <AccessTime />,
      label: "DTR",
      link: "/daily_time_record",
      color: settings.primaryColor,
    },
    {
      icon: <Receipt />,
      label: "Payslip",
      link: "/payslip",
      color: settings.primaryColor,
    },
    {
      icon: <ContactPage />,
      label: "PDS",
      link: "/pds1",
      color: settings.primaryColor,
    },
    {
      icon: <WorkHistory />,
      label: "Attendance",
      link: "/attendance-user-state",
      color: settings.primaryColor,
    },
  ];

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // PAGE OVERFLOW HIDDEN (HomeAdmin Style)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        height: "86%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        p: 1,
        mt: -2
      }}
    >
      {/* Header */}
      <Grow in timeout={300}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            background: settings.accentColor,
            backdropFilter: "blur(15px)",
            borderRadius: 4,
            p: 2,
            border: `1px solid ${settings.secondaryColor}`,
            flexShrink: 0, // Prevent header from shrinking
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ color: settings.textPrimaryColor }}
            >
              Hello, <b>{fullName || username}!</b>
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: settings.textPrimaryColor,
                mt: 0.25,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <AccessTime sx={{ fontSize: 14 }} />
              {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              <span style={{ marginLeft: "8px",}}>
                {currentDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <IconButton
              size="small"
              sx={{
                bgcolor: `${settings.primaryColor}1A`,
                "&:hover": { bgcolor: `${settings.primaryColor}33` },
                color: settings.textPrimaryColor,
              }}
              onClick={async () => {
                if (employeeNumber) {
                  try {
                    const empNum = String(employeeNumber).trim();
                    const [notifRes, unreadRes] = await Promise.all([
                      axios.get(`${API_BASE_URL}/api/notifications/${empNum}`),
                      axios.get(
                        `${API_BASE_URL}/api/notifications/${empNum}/unread-count`
                      ),
                    ]);
                    const filteredNotifications = Array.isArray(notifRes.data)
                      ? notifRes.data.filter(
                          (notif) =>
                            String(notif.employeeNumber).trim() === empNum
                        )
                      : [];
                    setNotifications(filteredNotifications);
                    setUnreadCount(unreadRes.data?.count || 0);
                  } catch (err) {
                    console.error("Error fetching notifications:", err);
                  }
                }
                setNotifModalOpen(true);
              }}
            >
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
            <Box
              sx={{
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: -2,
                  borderRadius: "50%",
                  padding: "2px",
                  background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                },
              }}
            >
              <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                <Avatar
                  alt={username}
                  src={
                    profilePicture
                      ? `${API_BASE_URL}${profilePicture}`
                      : undefined
                  }
                  sx={{ width: 36, height: 36 }}
                />
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  minWidth: 180,
                  backgroundColor: settings.accentColor,
                  border: `1px solid ${settings.primaryColor}26`,
                  boxShadow: `0 15px 40px ${settings.primaryColor}33`,
                  "& .MuiMenuItem-root": {
                    fontSize: "0.875rem",
                    color: settings.textPrimaryColor,
                    "&:hover": { background: `${settings.primaryColor}0A` },
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/profile");
                }}
              >
                <AccountCircle
                  sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }}
                />{" "}
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/settings");
                }}
              >
                <Settings
                  sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }}
                />{" "}
                Settings
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/settings");
                }}
              >
                <HelpOutline
                  sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }}
                />{" "}
                FAQs
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/settings");
                }}
              >
                <PrivacyTip
                  sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }}
                />{" "}
                Privacy Policy
              </MenuItem>
              <Divider sx={{ borderColor: `${settings.primaryColor}26` }} />
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  handleLogout();
                }}
              >
                <Logout
                  sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }}
                />{" "}
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Grow>

      {/* Main Content Grid */}
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Column - Carousel */}

<Grid item xs={12} md={7.5} sx={{ minHeight: 0 }}>
  <Fade in timeout={600}>
    <Card
      sx={{
        height: "100%",
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ position: "relative", height: "100%", flex: 1 }}>
        {announcementsLoading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: 2,
              backgroundColor: `${settings.primaryColor}08`,
            }}
          >
            <CircularProgress
              size={48}
              sx={{ color: settings.primaryColor }}
            />
            <Typography
              variant="body2"
              sx={{ color: settings.textPrimaryColor, fontWeight: 500 }}
            >
              Loading announcements...
            </Typography>
          </Box>
        ) : Array.isArray(carouselItems) && carouselItems.length > 0 ? (
          <>
            {/* ADDED Fade wrapper for smooth slideshow transition */}
            <Fade in={true} key={currentSlide} timeout={{ enter: 800, exit: 400 }}>
              <Box sx={{ position: "relative", height: "100%", flex: 1 }}>
                <Box
                  component="img"
                  src={
                    carouselItems[currentSlide]?.image
                      ? `${API_BASE_URL}${carouselItems[currentSlide].image}`
                      : "/api/placeholder/1200/600"
                  }
                  alt={
                    carouselItems[currentSlide]?.title ||
                    (carouselItems[currentSlide]?.id
                      ?.toString()
                      .startsWith("holiday-")
                      ? "Holiday"
                      : carouselItems[currentSlide]?.id
                          ?.toString()
                          .startsWith("suspension-")
                      ? "Suspension"
                      : "Announcement")
                  }
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.7s ease",
                    transform: "scale(1)",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)",
                  }}
                />
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevSlide();
                  }}
                  sx={{
                    position: "absolute",
                    left: { xs: 10, md: 24 },
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: `${settings.primaryColor}4D`,
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${settings.primaryColor}26`,
                    "&:hover": {
                      bgcolor: `${settings.primaryColor}80`,
                      transform: "translateY(-50%) scale(1.1)",
                    },
                    color: "#ffffff",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                    transition: "all 0.3s",
                    zIndex: 10,
                  }}
                >
                  <ArrowBackIosNewIcon />
                </IconButton>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextSlide();
                  }}
                  sx={{
                    position: "absolute",
                    right: { xs: 10, md: 24 },
                    top: "50%",
                    transform: "translateY(-50%)",
                    bgcolor: `${settings.primaryColor}4D`,
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${settings.primaryColor}26`,
                    "&:hover": {
                      bgcolor: `${settings.primaryColor}80`,
                      transform: "translateY(-50%) scale(1.1)",
                    },
                    color: "#ffffff",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                    transition: "all 0.3s",
                    zIndex: 10,
                  }}
                >
                  <ArrowForwardIosIcon />
                </IconButton>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  sx={{
                    position: "absolute",
                    top: { xs: 10, md: 24 },
                    right: { xs: 10, md: 24 },
                    bgcolor: `${settings.primaryColor}4D`,
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${settings.primaryColor}26`,
                    "&:hover": {
                      bgcolor: `${settings.primaryColor}80`,
                      transform: "scale(1.1)",
                    },
                    color: "#ffffff",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                    transition: "all 0.3s",
                    zIndex: 10,
                  }}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
                <Box
                  onClick={() => handleOpenModal(carouselItems[currentSlide])}
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: { xs: 2, md: 4 },
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "translateY(-4px)" },
                    zIndex: 10,
                  }}
                >
                  <Chip
                    label={
                      carouselItems[currentSlide]?.id
                        ?.toString()
                        .startsWith("holiday-")
                        ? "HOLIDAY"
                        : carouselItems[currentSlide]?.id
                            ?.toString()
                            .startsWith("suspension-")
                        ? "SUSPENSION"
                        : "ANNOUNCEMENT"
                    }
                    size="small"
                    sx={{
                      mb: 2,
                      bgcolor: `${settings.primaryColor}80`,
                      backdropFilter: "blur(10px)",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      border: "1px solid rgba(254, 249, 225, 0.3)",
                    }}
                  />
                  <Typography
                    variant="h3"
                    sx={{
                      color: "#ffffff",
                      fontWeight: 800,
                      mb: 1,
                      textShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      lineHeight: 1.2,
                      fontSize: { xs: "1.25rem", md: "2rem" },
                    }}
                  >
                    {carouselItems[currentSlide]?.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.9)",
                      fontSize: { xs: "0.75rem", md: "1rem" },
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 18 }} />
                    {new Date(carouselItems[currentSlide]?.date).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 24,
                    right: 24,
                    display: "flex",
                    gap: 1.5,
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  {carouselItems.map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: currentSlide === idx ? 32 : 10,
                        height: 10,
                        borderRadius: 5,
                        bgcolor:
                          currentSlide === idx
                            ? "#ffffff"
                            : "rgba(254,249,225,0.4)",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer",
                        border: "1px solid rgba(254,249,225,0.3)",
                        "&:hover": {
                          bgcolor: "rgba(254,249,225,0.7)",
                          transform: "scale(1.2)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlideSelect(idx);
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Fade>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Flag
              sx={{ fontSize: 80, color: `${settings.primaryColor}4D` }}
            />
            <Typography
              variant="h5"
              sx={{ color: settings.textPrimaryColor }}
            >
              No announcements, suspensions, or holidays available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  </Fade>
</Grid>

        {/* Right Column - Widgets Grid (Compact Layout) */}
        <Grid item xs={12} md={4.5} sx={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          
          {/* Row 1: Employee Panel & Payslip (Side by Side) */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* 1. Employee Panel */}
            <Grid item xs={12} sm={6}>
              <Grow in timeout={400}>
                <Card
                  sx={{
                    height: "100%",
                    background: settings.accentColor,
                    backdropFilter: "blur(15px)",
                    border: `1px solid ${settings.primaryColor}26`,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <DashboardIcon
                        sx={{
                          color: settings.textPrimaryColor,
                          mr: 0.5,
                          fontSize: 18,
                        }}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: settings.textPrimaryColor,
                          fontSize: "0.85rem",
                        }}
                      >
                        Quick Access
                      </Typography>
                    </Box>
                    <Grid container spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
                      {quickActions.map((action, index) => (
                        <Grid item xs={6} key={index}>
                          <Link to={action.link} style={{ textDecoration: "none" }}>
                            <Box
                              sx={{
                                p: 0.75,
                                textAlign: "center",
                                borderRadius: 2,
                                backgroundColor: `${settings.primaryColor}0A`,
                                border: `1px solid ${settings.primaryColor}26`,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.25,
                                transition: "all 0.3s",
                                cursor: "pointer",
                                "&:hover": {
                                  backgroundColor: settings.primaryColor,
                                  transform: "translateY(-2px)",
                                  boxShadow: `0 4px 12px ${settings.primaryColor}33`,
                                  "& .action-icon": {
                                    color: settings.textColor,
                                    transform: "scale(1.1)",
                                  },
                                  "& .action-label": { color: settings.textColor },
                                },
                              }}
                            >
                              <Box
                                className="action-icon"
                                sx={{
                                  color: action.color,
                                  fontSize: 20,
                                  transition: "all 0.3s",
                                }}
                              >
                                {action.icon}
                              </Box>
                              <Typography
                                className="action-label"
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  color: settings.textPrimaryColor,
                                  transition: "color 0.3s",
                                  fontSize: "0.65rem",
                                }}
                              >
                                {action.label}
                              </Typography>
                            </Box>
                          </Link>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>

            {/* 2. Payslip Card (Compact) */}
            <Grid item xs={12} sm={6}>
              <Grow in timeout={500}>
                <Card
                  sx={{
                    height: "100%",
                    background: settings.accentColor,
                    backdropFilter: "blur(15px)",
                    border: `1px solid ${settings.primaryColor}26`,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Receipt
                          sx={{
                            color: settings.textPrimaryColor,
                            mr: 0.5,
                            fontSize: 18,
                          }}
                        />
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: settings.textPrimaryColor,
                            fontSize: "0.85rem",
                          }}
                        >
                          Payslip
                        </Typography>
                      </Box>
                      <FormControl size="small" sx={{ minWidth: 70 }}>
                        <InputLabel id="payslip-month-label" sx={{ color: settings.textPrimaryColor, fontSize: "0.7rem" }}>Month</InputLabel>
                        <Select
                          labelId="payslip-month-label"
                          value={payslipMonth}
                          label="Month"
                          onChange={(e) => setPayslipMonth(Number(e.target.value))}
                          sx={{
                            color: settings.textPrimaryColor,
                            fontSize: "0.7rem",
                            height: 30,
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: `${settings.primaryColor}40` },
                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: settings.primaryColor },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: settings.primaryColor },
                            "& .MuiSelect-select": { py: 0.5 }
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <MenuItem key={i} value={i}>
                              {new Date(2000, i).toLocaleString("en-US", { month: "short" })}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Grid container spacing={0.5}>
                      <Grid item xs={6}>
                        <Card
                          elevation={0}
                          sx={{
                            background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`,
                            color: settings.textColor,
                            borderRadius: 2,
                            transition: "all 0.3s",
                            boxShadow: `0 2px 8px ${settings.primaryColor}33`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 1
                          }}
                        >
                          <Box textAlign="center">
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.9, fontSize: "0.65rem", display: "block" }}
                            >
                              1st Half
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.9rem",
                              }}
                            >
                              {payrollData
                                ? formatCurrency(payrollData.pay1st)
                                : "₱-.--"}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                          elevation={0}
                          sx={{
                            background: `linear-gradient(135deg, ${settings.secondaryColor} 0%, ${settings.primaryColor} 100%)`,
                            color: settings.textColor,
                            borderRadius: 2,
                            transition: "all 0.3s",
                            boxShadow: `0 2px 8px ${settings.primaryColor}33`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 1
                          }}
                        >
                          <Box textAlign="center">
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.9, fontSize: "0.65rem", display: "block" }}
                            >
                              2nd Half
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.9rem",
                              }}
                            >
                              {payrollData
                                ? formatCurrency(payrollData.pay2nd)
                                : "₱-.--"}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                    <Link to="/payslip" style={{ textDecoration: "none" }}>
                      <Button
                        fullWidth
                        variant="text"
                        size="small"
                        sx={{
                          mt: 0.5,
                          color: settings.textPrimaryColor,
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          "&:hover": {
                            backgroundColor: `${settings.primaryColor}0A`,
                          },
                        }}
                        endIcon={<ArrowForward sx={{fontSize: 14}} />}
                      >
                        View Full
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </Grow>
            </Grid>
          </Grid>

          {/* 3. Calendar - Fixed Height for Compactness */}
          <Grow in timeout={600} sx={{ mb: 2, display: 'flex', flexDirection: 'column', border: `1px solid ${settings.primaryColor}26`, borderRadius: 4}}>
            <Card
              sx={{
                display: "flex",
                flexDirection: "column",
                background: settings.accentColor,
                backdropFilter: "blur(15px)",
                border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4,
                boxShadow: `0 15px 40px ${settings.primaryColor}33`,
              }}
            >
              <CardContent sx={{ p: 1.5, display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() =>
                      setCalendarDate(new Date(year, month - 1, 1))
                    }
                    sx={{
                      color: settings.textPrimaryColor,
                      p: 0.5,
                      "&:hover": {
                        backgroundColor: `${settings.primaryColor}1A`,
                      },
                    }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      fontWeight={700}
                      sx={{
                        color: settings.textPrimaryColor,
                        fontSize: "0.9rem",
                      }}
                    >
                      {new Date(year, month).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setCalendarDate(new Date(year, month + 1, 1))
                    }
                    sx={{
                      color: settings.textPrimaryColor,
                      p: 0.5,
                      "&:hover": {
                        backgroundColor: `${settings.primaryColor}1A`,
                      },
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container spacing={0.25} sx={{ mb: 0.25 }}>
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <Grid item xs={12 / 7} key={i}>
                      <Typography
                        sx={{
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: settings.textPrimaryColor,
                          py: 0.25,
                        }}
                      >
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
                <Box>
                  <Grid container spacing={0.25}>
                    {calendarDays.map((day, index) => {
                      const currentDateStr = `${year}-${String(
                        month + 1
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const holidayData = holidays.find(
                        (h) => h.date === currentDateStr && h.status === "Active"
                      );
                      const dayNotes = getNotesForDate(currentDateStr);
                      const dayEvents = getEventsForDate(currentDateStr);
                      const dayAnnouncements = announcements.filter(
                        (announcement) => {
                          const announcementDate = normalizeDate(
                            announcement.date
                          );
                          return announcementDate === currentDateStr;
                        }
                      );
                      const hasAnnouncements = dayAnnouncements.length > 0;
                      const hasNotesOrEvents =
                        dayNotes.length > 0 ||
                        dayEvents.length > 0 ||
                        hasAnnouncements;
                      const isToday =
                        day === new Date().getDate() &&
                        month === new Date().getMonth() &&
                        year === new Date().getFullYear();
                      return (
                        <Grid item xs={12 / 7} key={index}>
                          <Tooltip
                            title={
                              isToday
                                ? "Today"
                                : holidayData
                                ? holidayData.name
                                : hasAnnouncements
                                ? `${dayAnnouncements[0].title}`
                                : hasNotesOrEvents
                                ? `${dayNotes.length} note(s), ${dayEvents.length} event(s)`
                                : ""
                            }
                            arrow
                          >
                            <Box
                              onClick={() => {
                                if (day) {
                                  setSelectedDate(currentDateStr);
                                  setViewNotesDialog(true);
                                }
                              }}
                              sx={{
                                textAlign: "center",
                                py: 0.5,
                                px: 0.25,
                                fontSize: "0.8rem",
                                borderRadius: 0.5,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: holidayData
                                  ? "#d32f2f"
                                  : isToday
                                  ? settings.textColor
                                  : day
                                  ? settings.textPrimaryColor
                                  : "transparent",
                                backgroundColor: isToday
                                  ? settings.secondaryColor
                                  : hasAnnouncements
                                  ? `${settings.primaryColor}0F`
                                  : hasNotesOrEvents
                                  ? `${settings.primaryColor}0F`
                                  : "transparent",
                                fontWeight:
                                  holidayData || isToday || hasNotesOrEvents || hasAnnouncements
                                    ? 700
                                    : 400,
                                border: isToday
                                  ? `1px solid ${settings.accentColor}`
                                  : hasNotesOrEvents || hasAnnouncements
                                  ? `1px solid ${settings.primaryColor}40`
                                  : "none",
                                cursor: day ? "pointer" : "default",
                                position: "relative",
                                transition: "all 0.2s",
                                "&:hover": day
                                  ? {
                                      transform: "scale(1.1)",
                                      backgroundColor: isToday
                                        ? settings.textSecondaryColor
                                        : hasAnnouncements || hasNotesOrEvents
                                        ? `${settings.primaryColor}1A`
                                        : "transparent",
                                      color: holidayData
                                        ? "#b71c1c"
                                        : isToday
                                        ? settings.textPrimaryColor
                                        : settings.textPrimaryColor,
                                      zIndex: 10,
                                    }
                                  : {},
                              }}
                            >
                              {day || ""}
                              {hasNotesOrEvents && day && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 0.25,
                                    mt: 0.1,
                                    position: "absolute",
                                    bottom: 2,
                                    left: 0,
                                    right: 0,
                                    justifyContent: "center",
                                  }}
                                >
                                  {dayNotes.length > 0 && (
                                    <Box
                                      sx={{
                                        width: 3,
                                        height: 3,
                                        borderRadius: "50%",
                                        backgroundColor: holidayData
                                          ? "#d32f2f" 
                                          : isToday
                                          ? settings.textColor
                                          : "#ff9800",
                                        boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                                      }}
                                    />
                                  )}
                                  {dayEvents.length > 0 && (
                                    <Box
                                      sx={{
                                        width: 3,
                                        height: 3,
                                        borderRadius: "50%",
                                        backgroundColor: holidayData
                                          ? "#d32f2f"
                                          : isToday
                                          ? settings.textColor
                                          : "#4caf50",
                                        boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                                      }}
                                    />
                                  )}
                                  {hasAnnouncements && (
                                    <Box
                                      sx={{
                                        width: 3,
                                        height: 3,
                                        borderRadius: "50%",
                                        backgroundColor: holidayData
                                          ? "#d32f2f"
                                          : isToday
                                          ? settings.textColor
                                          : "#2196f3",
                                        boxShadow: "0 0 4px rgba(0,0,0,0.3)",
                                      }}
                                    />
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>

                {/* Restored Tips Section */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                    borderRadius: 2,
                    backgroundColor: `${settings.primaryColor}0A`,
                    border: `1px dashed ${settings.primaryColor}26`,
                    p: 1.25,
                    mt: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: settings.textPrimaryColor,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <CalendarMonth sx={{ fontSize: 16, flexShrink: 0 }} />
                    Tips: Click any day to view or add notes and events
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Tooltip title="Add note">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const today = normalizeDate(new Date());
                          setSelectedDate(today);
                          handleAddNote();
                        }}
                        sx={{
                          color: settings.textPrimaryColor,
                          "&:hover": { backgroundColor: `${settings.primaryColor}1A` },
                        }}
                      >
                        <Note fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add event">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const today = normalizeDate(new Date());
                          setSelectedDate(today);
                          handleAddEvent();
                        }}
                        sx={{
                          color: settings.textPrimaryColor,
                          "&:hover": { backgroundColor: `${settings.primaryColor}1A` },
                        }}
                      >
                        <Event fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Legends">
                      <IconButton
                        size="small"
                        onClick={(e) => setCalendarLegendAnchorEl(e.currentTarget)}
                        sx={{
                          color: settings.textPrimaryColor,
                          "&:hover": { backgroundColor: `${settings.primaryColor}1A` },
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grow>

          {/* 4. Recent Activity (Notes & Events) - Fills remaining space */}
          <Grow in timeout={700} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: `1px solid ${settings.primaryColor}26`, borderRadius: 4}}>
            <Card
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                background: settings.accentColor,
                backdropFilter: "blur(15px)",
                border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4,
                boxShadow: `0 15px 40px ${settings.primaryColor}33`,
              }}
            >
              <CardContent sx={{ p: 1.5, display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: settings.textPrimaryColor,
                      fontSize: "0.85rem",
                    }}
                  >
                    Notes and Events
                  </Typography>
                  <Box>
                    <Tooltip title="Add Note">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const today = normalizeDate(new Date());
                          setSelectedDate(today);
                          handleAddNote();
                        }}
                        sx={{
                          color: settings.textPrimaryColor,
                          p: 0.5,
                          "&:hover": { backgroundColor: `${settings.primaryColor}1A` },
                        }}
                      >
                        <Note fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add Event">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const today = normalizeDate(new Date());
                          setSelectedDate(today);
                          handleAddEvent();
                        }}
                        sx={{
                          color: settings.textPrimaryColor,
                          p: 0.5,
                          "&:hover": { backgroundColor: `${settings.primaryColor}1A` },
                        }}
                      >
                        <Event fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    pr: 0.5,
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-track": { background: "transparent" },
                    "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: 2 },
                  }}
                >
                  {getRecentActivity().length > 0 ? (
                    getRecentActivity().map((item, idx) => (
                      <Grow in timeout={300 + idx * 50} key={idx}>
                        <Box
                          sx={{
                            mb: 1,
                            p: 0.75,
                            backgroundColor:
                              item.type === "note"
                                ? `${settings.primaryColor}1A`
                                : "#e8f5e9",
                            borderRadius: 2,
                            borderLeft: `3px solid ${
                              item.type === "note"
                                ? settings.primaryColor
                                : "#4caf50"
                            }`,
                            cursor: "pointer",
                            transition: "all 0.3s",
                            boxShadow: `0 2px 8px ${settings.primaryColor}33`,
                            "&:hover": {
                              transform: "translateX(4px)",
                              boxShadow: `0 4px 16px ${settings.primaryColor}4D`,
                            },
                          }}
                          onClick={() => {
                            setSelectedDate(item.date);
                            setViewNotesDialog(true);
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 0.25,
                            }}
                          >
                            {item.type === "note" ? (
                              <Note
                                sx={{
                                  fontSize: 12,
                                  mr: 0.5,
                                  color: settings.textPrimaryColor,
                                }}
                              />
                            ) : (
                              <Event
                                sx={{ fontSize: 12, mr: 0.5, color: "#4caf50" }}
                              />
                            )}
                            <Typography
                              variant="caption"
                              sx={{
                                color:
                                  item.type === "note"
                                    ? settings.textPrimaryColor
                                    : "#2e7d32",
                                fontWeight: 600,
                                display: "block",
                                fontSize: "0.75rem",
                                lineHeight: 1.2
                              }}
                            >
                              {item.type === "note" ? "Note" : "Event"}:{" "}
                              {item.title}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: "block", ml: 1.75, fontSize: "0.7rem", lineHeight: 1.2 }}
                          >
                            {item.content && item.content.length > 40
                              ? `${item.content.substring(0, 40)}...`
                              : item.content}
                          </Typography>
                        </Box>
                      </Grow>
                    ))
                  ) : (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      No recent activity
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>

      {/* Announcement Detail Modal */}
      <Modal open={openModal} onClose={handleCloseModal} maxWidth="md">
        <Fade in={openModal}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: { xs: "90%", sm: "80%", md: "800px" },
              maxHeight: "90vh",
              overflowY: "auto",
              bgcolor: settings.accentColor,
              backdropFilter: "blur(40px)",
              border: `1px solid ${settings.primaryColor}26`,
              boxShadow: `0 24px 64px ${settings.primaryColor}4D`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {selectedAnnouncement && (
              <>
                <Box sx={{ position: "relative" }}>
                  {selectedAnnouncement.image && (
                    <Box
                      component="img"
                      src={`${API_BASE_URL}${selectedAnnouncement.image}`}
                      alt={selectedAnnouncement.title}
                      sx={{ width: "100%", height: 350, objectFit: "cover" }}
                    />
                  )}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0, 0, 0, 0.7) 100%)",
                    }}
                  />
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{
                      position: "absolute",
                      top: 20,
                      right: 20,
                      bgcolor: `${settings.primaryColor}4D`,
                      backdropFilter: "blur(10px)",
                      border: `1px solid ${settings.primaryColor}26`,
                      color: "#ffffff",
                      "&:hover": {
                        bgcolor: `${settings.primaryColor}80`,
                        transform: "rotate(90deg)",
                      },
                      transition: "all 0.3s",
                    }}
                  >
                    <Close />
                  </IconButton>
                </Box>
                <Box sx={{ p: 4, overflowY: "auto" }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                      color: settings.textPrimaryColor,
                    }}
                  >
                    {selectedAnnouncement.title}
                  </Typography>
                  <Chip
                    icon={
                      <AccessTime sx={{ color: settings.textPrimaryColor }} />
                    }
                    label={new Date(
                      selectedAnnouncement.date
                    ).toLocaleDateString()}
                    sx={{
                      mb: 3,
                      bgcolor: `${settings.primaryColor}1A`,
                      color: settings.textPrimaryColor,
                      border: `1px solid ${settings.primaryColor}26`,
                    }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      color: settings.textPrimaryColor,
                      lineHeight: 1.8,
                      fontSize: "1.05rem",
                    }}
                  >
                    {selectedAnnouncement.about}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Notifications Modal */}
      <Modal open={notifModalOpen} onClose={() => setNotifModalOpen(false)}>
        <Fade in={notifModalOpen}>
          <Box
            sx={{
              position: "absolute",
              top: { xs: "50%", md: "80px" },
              right: { xs: "50%", md: "20px" },
              transform: { xs: "translate(50%, -50%)", md: "none" },
              width: { xs: "90%", sm: "400px" },
              maxHeight: "80vh",
              overflowY: "auto",
              bgcolor: settings.accentColor,
              backdropFilter: "blur(40px)",
              border: `1px solid ${settings.primaryColor}26`,
              boxShadow: `0 24px 64px ${settings.primaryColor}4D`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 3,
                borderBottom: `1px solid ${settings.primaryColor}26`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: `linear-gradient(135deg, ${settings.primaryColor}1A 0%, ${settings.secondaryColor}0D 100%)`,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: settings.textPrimaryColor }}
              >
                Notifications
              </Typography>
              <IconButton
                size="small"
                onClick={() => setNotifModalOpen(false)}
                sx={{
                  color: settings.textPrimaryColor,
                  "&:hover": {
                    backgroundColor: `${settings.primaryColor}1A`,
                    transform: "rotate(90deg)",
                  },
                  transition: "all 0.3s",
                }}
              >
                <Close />
              </IconButton>
            </Box>
            <Box
              sx={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto", p: 2 }}
            >
              {Array.isArray(notifications) && notifications.length > 0 ? (
                notifications.slice(0, 10).map((notif, idx) => {
                  const announcement =
                    notif.notification_type === "announcement"
                      ? announcementDetails[notif.id]
                      : null;
                  if (
                    notif.notification_type === "announcement" &&
                    announcement
                  ) {
                    return (
                      <Grow
                        in
                        timeout={300 + idx * 50}
                        key={`notif-${notif.id}`}
                      >
                        <Box
                          sx={{
                            mb: 2,
                            borderRadius: 3,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: `0 2px 8px ${settings.primaryColor}33`,
                            opacity: notif.read_status === 1 ? 0.7 : 1,
                            position: "relative",
                            height: 200,
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: `0 8px 24px ${settings.primaryColor}4D`,
                              opacity: 1,
                            },
                          }}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <Box
                            component="img"
                            src={
                              announcement.image
                                ? `${API_BASE_URL}${announcement.image}`
                                : "/api/placeholder/400/200"
                            }
                            alt={announcement.title}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
                              p: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Flag sx={{ color: "#ff69b4", fontSize: 18 }} />
                              <Typography
                                fontSize="0.75rem"
                                sx={{
                                  color: "#fff",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.5,
                                }}
                              >
                                New Announcement
                              </Typography>
                            </Box>
                            <Typography
                              fontWeight={700}
                              fontSize="1.1rem"
                              sx={{
                                color: "#fff",
                                mb: 0.5,
                                lineHeight: 1.3,
                                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                              }}
                            >
                              {announcement.title}
                            </Typography>
                            <Typography
                              fontSize="0.75rem"
                              sx={{
                                color: "rgba(255,255,255,0.9)",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <AccessTime sx={{ fontSize: 12 }} />
                              {notif.created_at
                                ? new Date(notif.created_at).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )
                                : ""}
                            </Typography>
                          </Box>
                        </Box>
                      </Grow>
                    );
                  }

                  // For other notifications (payslip, etc.), use the regular style
                  return (
                    <Grow in timeout={300 + idx * 50} key={`notif-${notif.id}`}>
                      <Box
                        sx={{
                          mb: 2,
                          p: 2.5,
                          borderRadius: 3,
                          background:
                            notif.read_status === 0
                              ? notif.notification_type === "payslip"
                                ? "rgba(76, 175, 80, 0.1)"
                                : notif.notification_type === "contact"
                                ? "rgba(255, 152, 0, 0.1)"
                                : notif.notification_type === "holiday"
                                ? "rgba(237, 108, 2, 0.1)"
                                : notif.notification_type === "suspension"
                                ? "rgba(211, 47, 47, 0.1)"
                                : `${settings.primaryColor}1A`
                              : `${settings.primaryColor}0A`,
                          border: `1px solid ${settings.primaryColor}26`,
                          borderLeft:
                            notif.read_status === 0
                              ? notif.notification_type === "payslip"
                                ? "4px solid #4caf50"
                                : notif.notification_type === "contact"
                                ? "4px solid #ff9800"
                                : notif.notification_type === "holiday"
                                ? "4px solid #ed6c02"
                                : notif.notification_type === "suspension"
                                ? "4px solid #d32f2f"
                                : `4px solid ${settings.primaryColor}`
                              : `1px solid ${settings.primaryColor}26`,
                          cursor: "pointer",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            background: `${settings.primaryColor}1A`,
                            transform: "translateX(8px)",
                            boxShadow: `0 8px 24px ${settings.primaryColor}33`,
                          },
                        }}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background:
                                notif.notification_type === "payslip"
                                  ? `linear-gradient(135deg, #4caf50, #2e7d32)`
                                  : notif.notification_type === "contact"
                                  ? `linear-gradient(135deg, #ff9800, #f57c00)`
                                  : notif.notification_type === "holiday"
                                  ? `linear-gradient(135deg, #ed6c02, #e65100)`
                                  : notif.notification_type === "suspension"
                                  ? `linear-gradient(135deg, #d32f2f, #b71c1c)`
                                  : `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                              mt: 0.5,
                              flexShrink: 0,
                              boxShadow: `0 0 12px ${settings.primaryColor}99`,
                              opacity: notif.read_status === 0 ? 1 : 0.5,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: settings.textPrimaryColor,
                                mb: 0.5,
                                lineHeight: 1.4,
                              }}
                            >
                              {notif.notification_type === "payslip"
                                ? "Payslip Available"
                                : notif.notification_type === "contact"
                                ? "New Ticket"
                                : notif.notification_type === "holiday"
                                ? "New Holiday"
                                : notif.notification_type === "suspension"
                                ? "New Suspension"
                                : "Notification"}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                color: settings.textPrimaryColor,
                                mb: 0.5,
                              }}
                            >
                              {notif.description}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                color: settings.textPrimaryColor,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <AccessTime sx={{ fontSize: 14 }} />
                              {notif.created_at
                                ? new Date(notif.created_at).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )
                                : ""}
                            </Typography>
                          </Box>
                          <ArrowForward
                            sx={{
                              color: settings.textPrimaryColor,
                              fontSize: 20,
                              transition: "transform 0.3s",
                              mt: 0.5,
                              flexShrink: 0,
                            }}
                          />
                        </Box>
                      </Box>
                    </Grow>
                  );
                })
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <NotificationsIcon
                    sx={{ fontSize: 80, color: `${settings.primaryColor}33` }}
                  />
                  <Typography
                    sx={{ color: settings.textPrimaryColor, fontSize: "1rem" }}
                  >
                    No notifications at the moment
                  </Typography>
                  <Typography
                    sx={{
                      color: settings.textPrimaryColor,
                      fontSize: "0.85rem",
                      mt: 1,
                    }}
                  >
                    You're all caught up!
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Calendar Legends Menu */}
      <Menu
        anchorEl={calendarLegendAnchorEl}
        open={openCalendarLegend}
        onClose={() => setCalendarLegendAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 180,
            backgroundColor: settings.accentColor,
            border: `1px solid ${settings.primaryColor}26`,
            boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1 }}>
            Legends
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff9800" }} />
              <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>Notes</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4caf50" }} />
              <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>Events</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2196f3" }} />
              <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>Announcements</Typography>
            </Box>
          </Box>
        </Box>
      </Menu>

      {/* View Notes/Events Dialog */}
      <Dialog
        open={viewNotesDialog}
        onClose={() => setViewNotesDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            bgcolor: settings.accentColor,
            backdropFilter: "blur(12px)",
            border: `1px solid ${settings.primaryColor}26`,
            boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontSize: "1rem",
            fontWeight: 600,
            color: settings.textPrimaryColor,
          }}
        >
          {selectedDate &&
            new Date(selectedDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: settings.textPrimaryColor,
              mb: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Note sx={{ mr: 1 }} /> Notes
          </Typography>
          {getNotesForDate(selectedDate).length > 0 ? (
            getNotesForDate(selectedDate).map((note) => (
              <Box
                key={note.id}
                sx={{
                  mb: 2,
                  p: 2,
                  backgroundColor: `${settings.primaryColor}1A`,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">{note.content}</Typography>
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteNote(note.id)}
                    sx={{ color: "#d32f2f" }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              No notes for this date
            </Typography>
          )}

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: settings.textPrimaryColor,
              mb: 1,
              mt: 3,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Event sx={{ mr: 1 }} /> Events
          </Typography>
          {getEventsForDate(selectedDate).length > 0 ? (
            getEventsForDate(selectedDate).map((event) => (
              <Box
                key={event.id}
                sx={{
                  mb: 2,
                  p: 2,
                  backgroundColor: "#e8f5e9",
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {event.title}
                </Typography>
                <Typography variant="body2">{event.description}</Typography>
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteEvent(event.id)}
                    sx={{ color: "#d32f2f" }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              No events for this date
            </Typography>
          )}

          {/* Add announcements section to the dialog */}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: settings.textPrimaryColor,
              mb: 1,
              mt: 3,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Flag sx={{ mr: 1 }} /> Announcements
          </Typography>
          {(() => {
            const dateAnnouncements = announcements.filter((announcement) => {
              const announcementDate = normalizeDate(announcement.date);
              return announcementDate === selectedDate;
            });

            return dateAnnouncements.length > 0 ? (
              dateAnnouncements.map((announcement) => (
                <Box
                  key={announcement.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: "#e3f2fd",
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.3s",
                    "&:hover": {
                      backgroundColor: "#bbdefb",
                      transform: "translateX(4px)",
                    },
                  }}
                  onClick={() => {
                    setViewNotesDialog(false);
                    handleOpenModal(announcement);
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {announcement.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {announcement.about && announcement.about.length > 100
                      ? `${announcement.about.substring(0, 100)}...`
                      : announcement.about}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                No announcements for this date
              </Typography>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setViewNotesDialog(false);
              handleAddNote();
            }}
            startIcon={<Note />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: settings.textColor,
              bgcolor: settings.primaryColor,
            }}
          >
            Add Note
          </Button>
          <Button
            onClick={() => {
              setViewNotesDialog(false);
              handleAddEvent();
            }}
            startIcon={<Add />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: settings.textColor,
              bgcolor: settings.primaryColor,
            }}
          >
            Add Event
          </Button>
          <Button
            onClick={() => setViewNotesDialog(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: settings.textColor,
              bgcolor: settings.primaryColor,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog
        open={openNoteDialog}
        onClose={() => setOpenNoteDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            bgcolor: settings.accentColor,
            backdropFilter: "blur(12px)",
            border: `1px solid ${settings.primaryColor}26`,
            boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontSize: "1rem",
            fontWeight: 600,
            color: settings.textPrimaryColor,
          }}
        >
          Add Note
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Note Content"
            value={currentNote.content}
            onChange={(e) =>
              setCurrentNote({ ...currentNote, content: e.target.value })
            }
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <Typography variant="caption" color="textSecondary">
            Date:{" "}
            {currentNote.date &&
              new Date(currentNote.date).toLocaleDateString()}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenNoteDialog(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: settings.textColor,
              bgcolor: settings.primaryColor,
            }}
            disabled={!currentNote.content}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveNote}
            variant="contained"
            startIcon={<Save />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              bgcolor: settings.primaryColor,
              "&:hover": { bgcolor: settings.hoverColor },
            }}
            disabled={!currentNote.content}
          >
            Save Note
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog
        open={openEventDialog}
        onClose={() => setOpenEventDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            bgcolor: settings.accentColor,
            backdropFilter: "blur(12px)",
            border: `1px solid ${settings.primaryColor}26`,
            boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontSize: "1rem",
            fontWeight: 600,
            color: settings.textPrimaryColor,
          }}
        >
          Add Event
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Event Title"
            value={currentEvent.title}
            onChange={(e) =>
              setCurrentEvent({ ...currentEvent, title: e.target.value })
            }
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Event Description"
            value={currentEvent.description}
            onChange={(e) =>
              setCurrentEvent({ ...currentEvent, description: e.target.value })
            }
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <Typography variant="caption" color="textSecondary">
            Date:{" "}
            {currentEvent.date &&
              new Date(currentEvent.date).toLocaleDateString()}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenEventDialog(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: settings.textColor,
              bgcolor: settings.primaryColor,
            }}
            disabled={!currentEvent.title}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEvent}
            variant="contained"
            startIcon={<Save />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              bgcolor: settings.primaryColor,
              "&:hover": { bgcolor: settings.hoverColor },
            }}
            disabled={!currentEvent.title}
          >
            Save Event
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;