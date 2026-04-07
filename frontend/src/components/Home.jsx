import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../contexts/SocketContext";
import API_BASE_URL from "../apiConfig";
import {
  IconButton, Modal, Tooltip, Box, Grid, Typography, Avatar, Button,
  Badge, Card, CardContent, Divider, Chip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Grow, Fade, Menu, MenuItem, CircularProgress,
  FormControl, InputLabel, Select, LinearProgress,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import {
  AccessTime, Receipt, ContactPage, Event, CalendarMonth, Logout, Settings,
  Dashboard as DashboardIcon, WorkHistory, Close, Add, Note, Flag, ArrowForward,
  PlayArrow, Pause, AccountCircle, HelpOutline, PrivacyTip, MoreVert, Delete, Save, ArrowDropDown,
} from "@mui/icons-material";

// ─── System Settings ──────────────────────────────────────────────────────────
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: "#894444", secondaryColor: "#6d2323", accentColor: "#FEF9E1",
    textColor: "#FFFFFF", textPrimaryColor: "#6D2323", textSecondaryColor: "#FEF9E1",
    hoverColor: "#6D2323", backgroundColor: "#FFFFFF",
  });
  useEffect(() => {
    const stored = localStorage.getItem("systemSettings");
    if (stored) { try { setSettings(JSON.parse(stored)); } catch {} }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api") ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        setSettings(response.data);
        localStorage.setItem("systemSettings", JSON.stringify(response.data));
      } catch {}
    };
    fetchSettings();
  }, []);
  return settings;
};

// ─── Carousel hook ────────────────────────────────────────────────────────────
const useCarousel = (items, autoPlay = true, interval = 5000) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    if (!isPlaying || !itemsRef.current || itemsRef.current.length === 0) return;
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % itemsRef.current.length), interval);
    return () => clearInterval(timer);
  }, [isPlaying, interval, items.length]);
  const handlePrevSlide = useCallback(() => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide((s) => (s - 1 + itemsRef.current.length) % itemsRef.current.length);
  }, []);
  const handleNextSlide = useCallback(() => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
  }, []);
  const handleSlideSelect = useCallback((index) => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide(index);
  }, []);
  const togglePlayPause = useCallback(() => setIsPlaying((prev) => !prev), []);
  return { currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause };
};

// ─── Shared expiry helpers ────────────────────────────────────────────────────
const isNotExpired = (date_end) => {
  if (!date_end) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const e = new Date(date_end); e.setHours(0, 0, 0, 0);
  return today <= e;
};

// ─── Ticket Status Badge ──────────────────────────────────────────────────────
const TICKET_STATUS_STYLE = {
  new:        { bg: "#fef3c7", color: "#92400e", border: "#d97706" },
  read:       { bg: "#dbeafe", color: "#1e3a5f", border: "#2563eb" },
  replied:    { bg: "#dcfce7", color: "#14532d", border: "#16a34a" },
  on_process: { bg: "#ffedd5", color: "#7c2d12", border: "#fb923c" },
  resolved:   { bg: "#f3f4f6", color: "#374151", border: "#6b7280" },
};
const TICKET_STATUS_LABEL = { new: "New", read: "Read", replied: "Replied", on_process: "On Process", resolved: "Resolved" };

const TicketStatusBadge = ({ notifId, contactTicketStatuses }) => {
  const entry = (contactTicketStatuses || {})[notifId];
  const ticketStatus = (entry && typeof entry === "object" ? entry.status : entry) || "new";
  const s = TICKET_STATUS_STYLE[ticketStatus] || TICKET_STATUS_STYLE.new;
  return (
    <Box sx={{ px: 1.25, py: 0.2, bgcolor: s.bg, border: `1px solid ${s.border}`, borderRadius: "20px", display: "inline-flex", alignItems: "center" }}>
      <Typography sx={{ fontSize: "0.6rem", fontWeight: 900, color: s.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {TICKET_STATUS_LABEL[ticketStatus] || ticketStatus}
      </Typography>
    </Box>
  );
};

// ─── Wireframe Loading — unified with AdminHome shimmer ───────────────────────
const shimmerKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
* { font-family: 'Poppins', sans-serif !important; }
@keyframes adminShimmer { 0% { background-position: -800px 0; } 100% { background-position: 800px 0; } }
@keyframes adminPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
`;
const SkeletonBox = ({ width = "100%", height = 16, borderRadius = 8, sx = {}, light = false }) => (
  <Box sx={{ width, height, borderRadius: `${borderRadius}px`, background: light ? "linear-gradient(90deg,rgba(255,255,255,0.22) 25%,rgba(255,255,255,0.42) 50%,rgba(255,255,255,0.22) 75%)" : "linear-gradient(90deg,#ede5e5 25%,#f7f2f2 50%,#ede5e5 75%)", backgroundSize: "800px 100%", animation: "adminShimmer 1.5s infinite linear", flexShrink: 0, ...sx }} />
);
const WireframeLoading = ({ settings }) => (
  <>
    <style>{shimmerKeyframes}</style>
    <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, background: settings.accentColor, borderRadius: 4, p: 2, border: `1px solid ${settings.primaryColor}26`, mt: -4, animation: "adminPulse 2s ease-in-out infinite" }}>
        <Box><SkeletonBox width={240} height={26} borderRadius={6} sx={{ mb: 1 }} /><SkeletonBox width={200} height={14} borderRadius={4} /></Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}><SkeletonBox width={36} height={36} borderRadius={18} /><SkeletonBox width={36} height={36} borderRadius={18} /><SkeletonBox width={36} height={36} borderRadius={18} /></Box>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7.5}>
          <Box sx={{ height: "calc(100vh - 250px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <SkeletonBox width="100%" height="100%" borderRadius={0} sx={{ position: "absolute", inset: 0 }} />
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${settings.secondaryColor}55 0%, transparent 100%)`, p: 4 }}>
              <SkeletonBox light width={110} height={22} borderRadius={11} sx={{ mb: 2 }} />
              <SkeletonBox light width="65%" height={36} borderRadius={6} sx={{ mb: 1.5 }} />
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={4.5}>
          <Box sx={{ display: "flex", gap: 2, height: "calc(100vh - 250px)" }}>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 1.5, height: 80, flexShrink: 0, animation: "adminPulse 2s ease-in-out 0.1s infinite" }}><SkeletonBox width="70%" height={13} borderRadius={4} sx={{ mb: 1 }} /></Box>
              <Box sx={{ background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 1.5, height: 185, flexShrink: 0, animation: "adminPulse 2s ease-in-out 0.15s infinite" }}><SkeletonBox width="50%" height={13} borderRadius={4} sx={{ mb: 1 }} /></Box>
              <Box sx={{ flex: 1, background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 2, animation: "adminPulse 2s ease-in-out 0.2s infinite" }}><SkeletonBox width={60} height={14} borderRadius={4} sx={{ mb: 2 }} /></Box>
            </Box>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 1.5, height: 130, flexShrink: 0, animation: "adminPulse 2s ease-in-out 0.25s infinite" }}><SkeletonBox width="60%" height={13} borderRadius={4} sx={{ mb: 1 }} /></Box>
              <Box sx={{ flex: 1, background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 2, animation: "adminPulse 2s ease-in-out 0.3s infinite" }}><SkeletonBox width={60} height={14} borderRadius={4} sx={{ mb: 2 }} /></Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─── Notification Filter Dropdown ─────────────────────────────────────────────
const NOTIF_FILTERS = [
  { key: "all",          label: "All" },
  { key: "unread",       label: "Unread" },
  { key: "payslip",      label: "Payslip" },
  { key: "contact",      label: "Tickets" },
  { key: "announcement", label: "Announcements" },
  { key: "holiday",      label: "Holidays" },
  { key: "suspension",   label: "Suspensions" },
];

const NotifFilterChips = ({ activeFilter, onChange, settings, unreadCount }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const activeLabel = NOTIF_FILTERS.find((f) => f.key === activeFilter)?.label || "All";
  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ArrowDropDown sx={{ fontSize: 15, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
        sx={{ minWidth: 74, height: 26, px: 0.85, py: 0.35, borderRadius: "8px", textTransform: "none", fontSize: "0.68rem", fontWeight: 500, color: "#fff", border: "1px solid rgba(255,255,255,0.28)", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.32)" }, "& .MuiButton-endIcon": { ml: 0.3 } }}>
        {activeLabel}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { mt: 0.6, minWidth: 170, borderRadius: "10px", border: `1px solid ${settings.primaryColor}26`, boxShadow: "0 10px 28px rgba(0,0,0,0.14)", overflow: "hidden" } }}>
        {NOTIF_FILTERS.map(({ key, label }) => {
          const active = key === activeFilter;
          return (
            <MenuItem key={key} onClick={() => { onChange(key); setAnchorEl(null); }}
              sx={{ py: 0.9, fontSize: "0.74rem", color: active ? settings.secondaryColor : settings.textPrimaryColor, fontWeight: active ? 600 : 400, bgcolor: active ? `${settings.primaryColor}14` : "transparent", "&:hover": { bgcolor: `${settings.primaryColor}0D` }, display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <Typography sx={{ fontSize: "0.74rem", fontWeight: "inherit" }}>{label}</Typography>
                {key === "unread" && unreadCount > 0 && <Typography sx={{ fontSize: "0.66rem", color: settings.secondaryColor, fontWeight: 700 }}>{unreadCount}</Typography>}
              </Box>
              {active && <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: settings.secondaryColor, color: "#fff", fontSize: "0.62rem", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✓</Box>}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

// ─── Home ─────────────────────────────────────────────────────────────────────
const Home = () => {
  const settings = useSystemSettings();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const _pendingTicketId = useRef(null);

  const [pageLoading, setPageLoading] = useState(true);
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
  const [allPayroll, setAllPayroll] = useState([]);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementDetails, setAnnouncementDetails] = useState({});
  const [contactTicketStatuses, setContactTicketStatuses] = useState({});
  const [leaveCredits, setLeaveCredits] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [openNoteDialog, setOpenNoteDialog] = useState(false);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [currentNote, setCurrentNote] = useState({ date: "", content: "" });
  const [currentEvent, setCurrentEvent] = useState({ date: "", title: "", description: "" });
  const [selectedDate, setSelectedDate] = useState("");
  const [viewNotesDialog, setViewNotesDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const [calendarLegendAnchorEl, setCalendarLegendAnchorEl] = useState(null);
  const openCalendarLegend = Boolean(calendarLegendAnchorEl);
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth());
  const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());
  const [notifFilter, setNotifFilter] = useState("all");

  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const payrollData = useMemo(() => {
    if (!allPayroll.length || !employeeNumber) return null;
    return allPayroll.find((p) => {
      if (!p.startDate) return false;
      const d = new Date(p.startDate);
      return String(p.employeeNumber) === String(employeeNumber) && d.getMonth() === payslipMonth && d.getFullYear() === payslipYear;
    }) || null;
  }, [allPayroll, employeeNumber, payslipMonth, payslipYear]);

  const scheduledHolidaysForCarousel = useMemo(() =>
    (rawHolidays || []).filter((h) => (h.status || "").toLowerCase() === "active" && isNotExpired(h.date_end || h.date))
      .map((h) => ({ id: `holiday-${h.id}`, title: h.title || h.description || "", about: h.about || "Official holiday.", date: h.date_start || h.date_end || h.date, date_start: h.date_start || h.date, date_end: h.date_end || h.date, image: h.image || null })),
    [rawHolidays]);

  const suspensionsForCarousel = useMemo(() =>
    (suspensions || []).filter((s) => isNotExpired(s.date_end))
      .map((s) => ({ id: `suspension-${s.id}`, title: s.title || "", about: s.about || "", date: s.date_start || s.date_end || s.date, date_start: s.date_start || s.date, date_end: s.date_end || s.date, image: s.image || null })),
    [suspensions]);

  const announcementsInRange = useMemo(() => (announcements || []).filter((a) => isNotExpired(a.date_end)), [announcements]);

  const carouselItems = useMemo(() =>
    [...scheduledHolidaysForCarousel, ...suspensionsForCarousel, ...announcementsInRange]
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date)),
    [scheduledHolidaysForCarousel, suspensionsForCarousel, announcementsInRange]);

  const { currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause } = useCarousel(carouselItems);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/holiday`);
      if (Array.isArray(res.data)) {
        setRawHolidays(res.data);
        setHolidays(res.data.map((item) => {
          const d = new Date(item.date);
          const normalizedDate = !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : item.date;
          return { date: normalizedDate, name: item.description, status: item.status };
        }));
      }
    } catch (err) { console.error("Error fetching holidays:", err); }
  }, []);

  const fetchSuspensions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/suspensions`);
      setSuspensions(Array.isArray(res.data) ? res.data : []);
    } catch { setSuspensions([]); }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/announcements`);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch { setAnnouncements([]); }
    finally { setAnnouncementsLoading(false); }
  }, []);

  const normalizeDate = (date) => {
    if (!date) return null;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const buildDateStr = (y, m, d) => {
    if (!d) return "";
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNotesAndEvents = async () => {
      if (!employeeNumber) return;
      try {
        const [notesRes, eventsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/notes/${employeeNumber}`),
          axios.get(`${API_BASE_URL}/api/events/${employeeNumber}`),
        ]);
        setNotes((Array.isArray(notesRes.data) ? notesRes.data : []).map((n) => ({ ...n, date: normalizeDate(n.date) })));
        setEvents((Array.isArray(eventsRes.data) ? eventsRes.data : []).map((e) => ({ ...e, date: normalizeDate(e.date) })));
      } catch {
        setNotes(JSON.parse(localStorage.getItem("employeeNotes") || "[]"));
        setEvents(JSON.parse(localStorage.getItem("employeeEvents") || "[]"));
      }
    };
    fetchNotesAndEvents();
  }, [employeeNumber]);

  useEffect(() => {
    const fetchLeaveCredits = async () => {
      if (!employeeNumber) return;
      setLeaveLoading(true);
      try {
        const [typesRes, assignmentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/leaveRoute/leave_table`),
          axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`),
        ]);
        const userAssignments = assignmentsRes.data.filter((a) => a.employeeNumber?.toString() === employeeNumber?.toString());
        const byCode = {};
        userAssignments.forEach((a) => { if (!byCode[a.leave_code]) byCode[a.leave_code] = []; byCode[a.leave_code].push(a); });
        const grouped = Object.entries(byCode).map(([code, entries]) => {
          const leaveType = typesRes.data.find((lt) => lt.leave_code === code);
          const sorted = entries.sort((a, b) => {
            const yearDiff = (b.period_year || 0) - (a.period_year || 0);
            if (yearDiff !== 0) return yearDiff;
            const semVal = (s) => s?.includes("2nd") ? 2 : s?.includes("1st") ? 1 : 0;
            return semVal(b.period_semester) - semVal(a.period_semester);
          });
          const current = sorted[0];
          const previous = sorted.slice(1);
          const currRemaining = (parseFloat(current?.remaining_hours) || 0) / 8;
          const currTotal = (parseFloat(current?.total_hours) || 0) / 8;
          const currAllocated = (parseFloat(current?.allocated_hours) || parseFloat(current?.total_hours) || 0) / 8;
          const prevRemaining = previous.reduce((s, e) => s + (parseFloat(e.remaining_hours) || 0) / 8, 0);
          const prevTotal = previous.reduce((s, e) => s + (parseFloat(e.total_hours) || 0) / 8, 0);
          return { code, name: leaveType?.leave_description || code, grandRemaining: currRemaining + prevRemaining, grandTotal: currTotal + prevTotal, currRemaining, currTotal, currAllocated, prevRemaining, period: current?.period_year ? `${current.period_year}${current.period_semester ? ` ${current.period_semester}` : ""}` : null };
        });
        setLeaveCredits(grouped);
      } catch { setLeaveCredits([]); }
      finally { setLeaveLoading(false); }
    };
    fetchLeaveCredits();
  }, [employeeNumber]);

  const fetchNotifications = useCallback(async () => {
    if (!employeeNumber) return;
    const empNum = String(employeeNumber).trim();
    if (!empNum) return;
    try {
      const notifRes = await axios.get(`${API_BASE_URL}/api/notifications/${empNum}`);
      const filteredNotifications = Array.isArray(notifRes.data) ? notifRes.data.filter((notif) => String(notif.employeeNumber).trim() === empNum) : [];
      setNotifications((prev) => {
        const localReadIds = new Set(prev.filter((n) => n.read_status === 1).map((n) => n.id));
        return filteredNotifications.map((n) => localReadIds.has(n.id) ? { ...n, read_status: 1 } : n);
      });
      const contactNotifs = filteredNotifications.filter((n) => n.notification_type === "contact" || n.notification_type === "ticket");
      if (contactNotifs.length > 0) {
        try {
          const token = localStorage.getItem("token");
          const ticketsRes = await axios.get(`${API_BASE_URL}/api/contact-us`, { headers: { Authorization: `Bearer ${token}` } });
          const ticketList = ticketsRes.data?.data || ticketsRes.data || [];
          const ticketIdMap = {};
          ticketList.forEach((t) => { ticketIdMap[t.id] = t; });
          const notifStatusMap = {};
          contactNotifs.forEach((notif) => {
            const contactMatch = (notif.action_link || "").match(/\/settings\/contact\/(\d+)/);
            const ticketId = contactMatch ? Number(contactMatch[1]) : null;
            const ticket = ticketId ? ticketIdMap[ticketId] : null;
            if (ticket) {
              notifStatusMap[notif.id] = { status: ticket.status, subject: ticket.subject || ticket.title || "", employee_name: ticket.employee_name || ticket.name || "", employee_number: ticket.employee_number || ticket.agencyEmployeeNum || "" };
            } else {
              const empTickets = ticketList.filter((t) => String(t.employee_number || "").trim() === empNum);
              if (empTickets.length > 0) {
                const latest = empTickets.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
                notifStatusMap[notif.id] = { status: latest.status, subject: latest.subject || latest.title || "", employee_name: latest.employee_name || latest.name || "", employee_number: latest.employee_number || latest.agencyEmployeeNum || "" };
              }
            }
          });
          setContactTicketStatuses(notifStatusMap);
        } catch {}
      }
      const announcementNotifs = filteredNotifications.filter((n) => n.notification_type === "announcement" && n.announcement_id);
      if (announcementNotifs.length > 0) {
        try {
          const annRes = await axios.get(`${API_BASE_URL}/api/announcements`);
          const announcementList = Array.isArray(annRes.data) ? annRes.data : [];
          const detailsMap = {};
          announcementNotifs.forEach((notif) => {
            const announcement = announcementList.find((ann) => ann.id === notif.announcement_id || ann.id === parseInt(notif.announcement_id));
            if (announcement) detailsMap[notif.id] = announcement;
          });
          setAnnouncementDetails(detailsMap);
        } catch {}
      }
    } catch { setNotifications([]); }
  }, [employeeNumber]);

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => { fetchNotificationsRef.current = fetchNotifications; }, [fetchNotifications]);
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !connected) return;
    const refreshTimeoutRef = { current: null };
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return;
      refreshTimeoutRef.current = setTimeout(() => { refreshTimeoutRef.current = null; if (typeof fetchNotificationsRef.current === "function") fetchNotificationsRef.current(); }, 250);
    };
    const handleAnnouncementChanged = (payload) => {
      const { action, announcement } = payload;
      if (action === "created") setAnnouncements((prev) => prev.some((a) => a.id === announcement.id) ? prev : [announcement, ...prev]);
      else if (action === "updated") setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? announcement : a)));
      else if (action === "deleted") { const deletedId = announcement?.id || announcement; setAnnouncements((prev) => prev.filter((a) => a.id !== deletedId)); }
    };
    const handleAdminDashboardUpdated = (payload) => {
      const { source } = payload;
      if (source === "holiday" || source === "suspensions") { fetchHolidays(); fetchSuspensions(); }
    };
    socket.on("notificationCreated", scheduleRefresh);
    socket.on("payrollChanged", scheduleRefresh);
    socket.on("announcementChanged", handleAnnouncementChanged);
    socket.on("adminDashboardUpdated", handleAdminDashboardUpdated);
    return () => {
      socket.off("notificationCreated", scheduleRefresh);
      socket.off("payrollChanged", scheduleRefresh);
      socket.off("announcementChanged", handleAnnouncementChanged);
      socket.off("adminDashboardUpdated", handleAdminDashboardUpdated);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [socket, connected, fetchHolidays, fetchSuspensions]);

  const handleNotificationClick = async (notification) => {
    if (notification.read_status === 0) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.put(`${API_BASE_URL}/api/notifications/${notification.id}/read`, {}, { headers });
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read_status: 1 } : n)));
      } catch {}
    }
    const type = notification.notification_type;
    const link = notification.action_link || "";
    if (type === "payslip" || link.includes("payslip")) {
      setNotifModalOpen(false); navigate("/payslip");
    } else if (type === "contact" || type === "ticket" || link.includes("settings")) {
      setNotifModalOpen(false);
      const contactMatch = (notification.action_link || "").match(/\/settings\/contact\/(\d+)/);
      const ticketIdFromLink = contactMatch ? Number(contactMatch[1]) : null;
      const statusMatch = (notification.action_link || "").match(/[?&]status=([^&]+)/);
      const ticketStatusFromLink = statusMatch ? statusMatch[1] : null;
      navigate("/settings", { state: { section: "contact", ticketId: ticketIdFromLink, ticketStatus: ticketStatusFromLink } });
    } else if (type === "announcement" || link.includes("announcement")) {
      try {
        const annRes = await axios.get(`${API_BASE_URL}/api/announcements`);
        const list = Array.isArray(annRes.data) ? annRes.data : [];
        let match = notification.announcement_id ? list.find((a) => a.id === notification.announcement_id || a.id === parseInt(notification.announcement_id)) : null;
        if (!match && notification.announcement_id) match = announcementDetails[notification.id];
        if (!match && list.length > 0) match = list[0];
        setNotifModalOpen(false);
        if (match) { setSelectedAnnouncement(match); setOpenModal(true); }
      } catch { setNotifModalOpen(false); }
    } else if (link) { setNotifModalOpen(false); navigate(link); }
  };

  const getUserInfo = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try { const decoded = JSON.parse(atob(token.split(".")[1])); return { role: decoded.role, employeeNumber: decoded.employeeNumber, username: decoded.username }; }
    catch { return {}; }
  };

  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.username) setUsername(userInfo.username);
    if (userInfo.employeeNumber) setEmployeeNumber(userInfo.employeeNumber);
  }, []);

  useEffect(() => {
    const fetchPayrollData = async () => {
      if (!employeeNumber) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`, { headers: { Authorization: `Bearer ${token}` } });
        setAllPayroll(Array.isArray(res.data) ? res.data : []);
      } catch {}
    };
    fetchPayrollData();
  }, [employeeNumber]);

  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([fetchAnnouncements(), fetchHolidays(), fetchSuspensions()]);
      setTimeout(() => setPageLoading(false), 400);
    };
    init();
  }, [fetchAnnouncements, fetchHolidays, fetchSuspensions]);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!employeeNumber) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/personalinfo/${employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = Array.isArray(res.data) ? (res.data[0] ?? {}) : (res.data ?? {});
        if (data.profile_picture) setProfilePicture(data.profile_picture);
        const fullNameFromPerson = `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""} ${data.nameExtension || ""}`.trim();
        if (fullNameFromPerson) setFullName(fullNameFromPerson);
      } catch {}
    };
    fetchProfilePicture();
  }, [employeeNumber]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);

  const generateCalendar = () => {
    const days = [];
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length < 42) days.push(null);
    return days;
  };
  const calendarDays = generateCalendar();

  // ─── Holiday range check helper ───────────────────────────────────────────
  const isDateInHolidayRange = useCallback((dateStr) => {
    if (!dateStr) return null;
    const check = new Date(dateStr);
    check.setHours(0, 0, 0, 0);
    for (const raw of rawHolidays) {
      if ((raw.status || "").toLowerCase() !== "active") continue;
      const startRaw = raw.date_start || raw.date;
      const endRaw = raw.date_end || raw.date;
      if (!startRaw) continue;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (check >= start && check <= end) {
        return { name: raw.description || raw.title || "", status: raw.status };
      }
    }
    return null;
  }, [rawHolidays]);

  const getAnnouncementsForDate = useCallback((dateStr) =>
    Array.isArray(announcements) ? announcements.filter((a) => normalizeDate(a.date) === dateStr) : [],
    [announcements]);

  const handleAddNote = () => { if (!selectedDate) return; setCurrentNote({ date: selectedDate, content: "" }); setOpenNoteDialog(true); };
  const handleSaveNote = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/notes`, { employee_number: employeeNumber, date: currentNote.date, content: currentNote.content });
      const normalizedNote = { ...res.data, date: normalizeDate(res.data.date) };
      setNotes((prev) => [...prev, normalizedNote]);
      localStorage.setItem("employeeNotes", JSON.stringify([...notes, normalizedNote]));
    } catch {
      const newNote = { id: Date.now(), date: currentNote.date, content: currentNote.content, createdAt: new Date().toISOString() };
      const updated = [...notes, newNote]; setNotes(updated); localStorage.setItem("employeeNotes", JSON.stringify(updated));
    }
    setOpenNoteDialog(false); setCurrentNote({ date: "", content: "" });
  };
  const handleDeleteNote = async (noteId) => {
    try { await axios.delete(`${API_BASE_URL}/api/notes/${noteId}`); } catch {}
    const updated = notes.filter((n) => n.id !== noteId); setNotes(updated); localStorage.setItem("employeeNotes", JSON.stringify(updated));
  };
  const handleAddEvent = () => { if (!selectedDate) return; setCurrentEvent({ date: selectedDate, title: "", description: "" }); setOpenEventDialog(true); };
  const handleSaveEvent = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/events`, { employee_number: employeeNumber, date: currentEvent.date, title: currentEvent.title, description: currentEvent.description });
      const normalizedEvent = { ...res.data, date: normalizeDate(res.data.date) };
      setEvents((prev) => [...prev, normalizedEvent]);
      localStorage.setItem("employeeEvents", JSON.stringify([...events, normalizedEvent]));
    } catch {
      const newEvent = { id: Date.now(), date: currentEvent.date, title: currentEvent.title, description: currentEvent.description, createdAt: new Date().toISOString() };
      const updated = [...events, newEvent]; setEvents(updated); localStorage.setItem("employeeEvents", JSON.stringify(updated));
    }
    setOpenEventDialog(false); setCurrentEvent({ date: "", title: "", description: "" });
  };
  const handleDeleteEvent = async (eventId) => {
    try { await axios.delete(`${API_BASE_URL}/api/events/${eventId}`); } catch {}
    const updated = events.filter((e) => e.id !== eventId); setEvents(updated); localStorage.setItem("employeeEvents", JSON.stringify(updated));
  };
  const getNotesForDate = (dateStr) => notes.filter((n) => n.date === dateStr);
  const getEventsForDate = (dateStr) => events.filter((e) => e.date === dateStr);
  const getRecentActivity = () => {
    const all = [
      ...notes.map((note) => ({ id: note.id, type: "note", title: "Note", content: note.content, date: note.date, createdAt: note.createdAt || new Date().toISOString() })),
      ...events.map((event) => ({ id: event.id, type: "event", title: event.title, content: event.description, date: event.date, createdAt: event.createdAt || new Date().toISOString() })),
    ];
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  };

  const quickActions = [
    { icon: <AccessTime sx={{ fontSize: 16 }} />, label: "DTR", link: "/daily_time_record" },
    { icon: <Receipt sx={{ fontSize: 16 }} />, label: "Payslip", link: "/payslip" },
    { icon: <ContactPage sx={{ fontSize: 16 }} />, label: "PDS", link: "/pds1" },
    { icon: <WorkHistory sx={{ fontSize: 16 }} />, label: "Leave", link: "/leave-request-user" },
  ];

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleOpenModal = (announcement) => { setSelectedAnnouncement(announcement); setOpenModal(true); };
  const handleCloseModal = () => { setOpenModal(false); setSelectedAnnouncement(null); };
  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

  const getLeaveStatusColor = (remaining, total) => {
    if (total === 0 || remaining === 0) return "#B71C1C";
    const pct = (remaining / total) * 100;
    if (pct > 50) return "#2E7D32";
    if (pct > 20) return "#EF6C00";
    return "#B71C1C";
  };

  const derivedUnreadCount = notifications.filter((n) => n.read_status === 0).length;

  const getCarouselItemForNotif = useCallback((notif) => {
    const type = notif.notification_type;
    if (type === "announcement") return announcementDetails[notif.id] || null;
    if (type === "holiday") {
      return scheduledHolidaysForCarousel.find((h) => {
        const link = notif.action_link || "";
        const idMatch = link.match(/holiday[/-](\d+)/i);
        return idMatch ? h.id === `holiday-${idMatch[1]}` : true;
      }) || scheduledHolidaysForCarousel[0] || null;
    }
    if (type === "suspension") {
      return suspensionsForCarousel.find((s) => {
        const link = notif.action_link || "";
        const idMatch = link.match(/suspension[/-](\d+)/i);
        return idMatch ? s.id === `suspension-${idMatch[1]}` : true;
      }) || suspensionsForCarousel[0] || null;
    }
    return null;
  }, [announcementDetails, scheduledHolidaysForCarousel, suspensionsForCarousel]);

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications.filter((n) => {
      if (notifFilter === "all") return true;
      if (notifFilter === "unread") return n.read_status === 0;
      if (notifFilter === "contact") return n.notification_type === "contact" || n.notification_type === "ticket";
      return n.notification_type === notifFilter;
    });
  }, [notifications, notifFilter]);

  const getNotificationDayLabel = useCallback((createdAt) => {
    if (!createdAt) return "Earlier";
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "Earlier";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unread = (notifications || []).filter((n) => n.read_status === 0);
    if (!unread.length) return;
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await Promise.allSettled(unread.map((n) => axios.put(`${API_BASE_URL}/api/notifications/${n.id}/read`, {}, { headers })));
    } finally {
      setNotifications((prev) => prev.map((n) => (n.read_status === 0 ? { ...n, read_status: 1 } : n)));
    }
  }, [notifications]);

  const handleCloseNotifModal = () => { setNotifModalOpen(false); setNotifFilter("all"); };

  if (pageLoading) {
    return (
      <Box sx={{ borderRadius: "1px", width: "100vw", maxWidth: "100%", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
        <WireframeLoading settings={settings} />
      </Box>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box sx={{ borderRadius: "1px", width: "100vw", maxWidth: "100%", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
        <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>

          {/* ── HEADER — unified with AdminHome ── */}
          <Grow in timeout={300}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, background: settings.accentColor, backdropFilter: "blur(15px)", borderRadius: 4, p: 2, border: `1px solid ${settings.secondaryColor}`, boxShadow: `0 15px 40px ${settings.primaryColor}33`, mt: -4, flexShrink: 0 }}>
              <Box>
                <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>Hello, <b>{fullName || username}!</b></Typography>
                <Typography variant="body2" sx={{ color: settings.textPrimaryColor, mt: 0.25, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTime sx={{ fontSize: 14 }} />
                  {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <span style={{ marginLeft: "8px" }}>{currentDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                {/* Refresh button — matches AdminHome */}
                <Tooltip title="Refresh">
                  <IconButton size="small" sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }}
                    onClick={() => { fetchAnnouncements(); fetchHolidays(); fetchSuspensions(); }}>
                    <AutorenewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Notifications">
                  <IconButton size="small" sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }}
                    onClick={async () => { if (!notifications.length) await fetchNotifications(); setNotifModalOpen(true); }}>
                    <Badge badgeContent={derivedUnreadCount} color="error" max={9}><NotificationsIcon fontSize="small" /></Badge>
                  </IconButton>
                </Tooltip>
                <Box sx={{ position: "relative", "&::before": { content: '""', position: "absolute", inset: -2, borderRadius: "50%", padding: "2px", background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" } }}>
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar alt={username} src={profilePicture ? `${API_BASE_URL}${profilePicture}` : undefined} sx={{ width: 36, height: 36 }} />
                  </IconButton>
                </Box>
                <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{ sx: { borderRadius: 2, minWidth: 180, backgroundColor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33`, "& .MuiMenuItem-root": { fontSize: "0.875rem", color: settings.textPrimaryColor, "&:hover": { background: `${settings.primaryColor}0A` } } } }}>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}><AccountCircle sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Profile</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}><Settings sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Settings</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/faqs"); }}><HelpOutline sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> FAQs</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/privacy-policy"); }}><PrivacyTip sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Privacy Policy</MenuItem>
                  <Divider sx={{ borderColor: `${settings.primaryColor}26` }} />
                  <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}><Logout sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Sign Out</MenuItem>
                </Menu>
              </Box>
            </Box>
          </Grow>

          {/* ── MAIN GRID ── */}
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            {/* LEFT COLUMN — Carousel */}
            <Grid item xs={12} md={7.5} sx={{ minHeight: 0, height: { xs: "auto", md: "calc(100vh - 250px)" } }}>
              <Fade in timeout={600}>
                <Card sx={{ height: "100%", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, overflow: "hidden", boxShadow: `0 15px 40px ${settings.primaryColor}33`, position: "relative", display: "flex", flexDirection: "column" }}>
                  <Box sx={{ position: "relative", height: "100%", flex: 1 }}>
                    {announcementsLoading ? (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 2, backgroundColor: `${settings.primaryColor}08` }}>
                        <CircularProgress size={48} sx={{ color: settings.primaryColor }} />
                        <Typography variant="body2" sx={{ color: settings.textPrimaryColor, fontWeight: 500 }}>Loading announcements...</Typography>
                      </Box>
                    ) : carouselItems.length > 0 ? (
                      <Fade in key={currentSlide} timeout={{ enter: 800, exit: 400 }}>
                        <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
                          <Box component="img" src={carouselItems[currentSlide]?.image ? `${API_BASE_URL}${carouselItems[currentSlide].image}` : "/api/placeholder/1200/600"} alt={carouselItems[currentSlide]?.title || "Announcement"} sx={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.7s ease", transform: "scale(1)" }} />
                          <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)" }} />
                          {/* Prev / Next — unified style */}
                          <IconButton onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }} sx={{ position: "absolute", left: { xs: 10, md: 24 }, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}><ArrowBackIosNewIcon /></IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); handleNextSlide(); }} sx={{ position: "absolute", right: { xs: 10, md: 24 }, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}><ArrowForwardIosIcon /></IconButton>
                          {/* Play/Pause — top right */}
                          <IconButton onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} sx={{ position: "absolute", top: { xs: 10, md: 24 }, right: { xs: 10, md: 24 }, bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>{isPlaying ? <Pause /> : <PlayArrow />}</IconButton>
                          {/* Caption */}
                          <Box onClick={() => handleOpenModal(carouselItems[currentSlide])} sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: { xs: 2, md: 4 }, color: "#ffffff", cursor: "pointer", transition: "transform 0.3s", "&:hover": { transform: "translateY(-4px)" }, zIndex: 10 }}>
                            <Chip label={carouselItems[currentSlide]?.id?.toString().startsWith("holiday-") ? "HOLIDAY" : carouselItems[currentSlide]?.id?.toString().startsWith("suspension-") ? "SUSPENSION" : "ANNOUNCEMENT"} size="small" sx={{ mb: 2, bgcolor: `${settings.primaryColor}80`, backdropFilter: "blur(10px)", color: "#ffffff", fontWeight: 700, fontSize: "0.7rem", border: "1px solid rgba(254, 249, 225, 0.3)" }} />
                            <Typography variant="h3" sx={{ color: "#ffffff", fontWeight: 800, mb: 1, lineHeight: 1.2, fontSize: { xs: "1.25rem", md: "2rem" }, textShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>{carouselItems[currentSlide]?.title}</Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: { xs: "0.75rem", md: "1rem" }, display: "flex", alignItems: "center", gap: 1, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                              <AccessTime sx={{ fontSize: 18 }} />{new Date(carouselItems[currentSlide]?.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                            </Typography>
                          </Box>
                          {/* Dots — unified */}
                          <Box sx={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 1.5, alignItems: "center", zIndex: 10 }}>
                            {carouselItems.map((_, idx) => (
                              <Box key={idx} sx={{ width: currentSlide === idx ? 32 : 10, height: 10, borderRadius: 5, bgcolor: currentSlide === idx ? "#ffffff" : "rgba(254,249,225,0.4)", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "pointer", border: "1px solid rgba(254,249,225,0.3)", "&:hover": { bgcolor: "rgba(254,249,225,0.7)", transform: "scale(1.2)" } }} onClick={(e) => { e.stopPropagation(); handleSlideSelect(idx); }} />
                            ))}
                          </Box>
                        </Box>
                      </Fade>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 2 }}>
                        <Flag sx={{ fontSize: 80, color: `${settings.primaryColor}4D` }} />
                        <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>No announcements, suspensions, or holidays available</Typography>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Fade>
            </Grid>

            {/* RIGHT COLUMN */}
            <Grid item xs={12} md={4.5} sx={{ minHeight: 0, height: { xs: "65vh", md: "calc(100vh - 230px)" }, display: "flex", flexDirection: "column", overflow: { xs: "auto", md: "visible" }, mt: { xs: 2, md: 0 } }}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column-reverse", md: "row" }, gap: 2, flex: 1, minHeight: 0, height: "100%" }}>

                {/* Left sub-column */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, minHeight: 0, height: "100%" }}>

                  {/* Quick Access */}
                  <Grow in timeout={400}>
                    <Card sx={{ background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, flexShrink: 0 }}>
                      <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 0.75 }}>
                          <DashboardIcon sx={{ color: settings.textPrimaryColor, mr: 0.5, fontSize: 16 }} />
                          <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.8rem" }}>Quick Access</Typography>
                        </Box>
                        <Grid container spacing={0.5}>
                          {quickActions.map((action, index) => (
                            <Grid item xs={3} key={index}>
                              <Link to={action.link} style={{ textDecoration: "none" }}>
                                <Tooltip title={action.label} arrow>
                                  <Box sx={{ p: 0.5, textAlign: "center", borderRadius: 1.5, background: `${settings.primaryColor}0A`, border: `1px solid ${settings.primaryColor}26`, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, transition: "all 0.3s", cursor: "pointer", "&:hover": { background: `${settings.primaryColor}1A`, transform: "translateY(-2px)", boxShadow: `0 4px 12px ${settings.primaryColor}33` } }}>
                                    <Box sx={{ color: settings.textPrimaryColor }}>{React.cloneElement(action.icon, { sx: { fontSize: 18 } })}</Box>
                                    <Typography sx={{ fontWeight: 600, color: settings.textPrimaryColor, fontSize: "0.6rem" }}>{action.label}</Typography>
                                  </Box>
                                </Tooltip>
                              </Link>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grow>

                  {/* Calendar — unified AdminHome style */}
                  <Grow in timeout={600}>
                    <Card sx={{ background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, flexShrink: 0 }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", flexDirection: "column" }}>
                        {/* Month nav */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.5, transition: "all 0.2s", "&:hover": { bgcolor: `${settings.primaryColor}1A`, transform: "scale(1.1)" } }}><ArrowBackIosNewIcon fontSize="small" /></IconButton>
                          <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: settings.textPrimaryColor }}>{new Date(year, month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</Typography>
                          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.5, transition: "all 0.2s", "&:hover": { bgcolor: `${settings.primaryColor}1A`, transform: "scale(1.1)" } }}><ArrowForwardIosIcon fontSize="small" /></IconButton>
                        </Box>
                        {/* Day headers — unified MON/TUE style */}
                        <Grid container spacing={0.3} sx={{ mb: 0.5 }}>
                          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                            <Grid item xs={12 / 7} key={day}>
                              <Typography sx={{ textAlign: "center", fontWeight: 600, fontSize: "0.55rem", color: settings.textPrimaryColor }}>{day}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                        {/* Day cells */}
                        <Grid container spacing={0.3}>
                          {calendarDays.map((day, index) => {
                            const currentDateStr = buildDateStr(year, month, day);
                            const holidayData = day ? isDateInHolidayRange(currentDateStr) : null;
                            const dayNotes = day ? getNotesForDate(currentDateStr) : [];
                            const dayEvents = day ? getEventsForDate(currentDateStr) : [];
                            const dayAnnouncements = day ? getAnnouncementsForDate(currentDateStr) : [];
                            const hasNotesOrEvents = dayNotes.length > 0 || dayEvents.length > 0;
                            const hasAnnouncements = dayAnnouncements.length > 0;
                            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                            const tooltipTitle = isToday
                              ? `Today${holidayData ? ` · Holiday: ${holidayData.name}` : hasAnnouncements ? ` · ${dayAnnouncements[0].title}` : ""}`
                              : holidayData
                              ? `Holiday: ${holidayData.name}`
                              : hasAnnouncements
                              ? `Announcement: ${dayAnnouncements[0].title}`
                              : "";

                            return (
                              <Grid item xs={12 / 7} key={index}>
                                <Tooltip title={tooltipTitle} arrow disableHoverListener={!tooltipTitle || !day}>
                                  <Box
                                    onClick={() => { if (day) { setSelectedDate(currentDateStr); setViewNotesDialog(true); } }}
                                    sx={{
                                      textAlign: "center",
                                      fontSize: "0.65rem",
                                      borderRadius: 0.5,
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      position: "relative",
                                      minHeight: 21,
                                      color: holidayData ? "#ffffff" : isToday ? settings.textColor : day ? settings.textPrimaryColor : "transparent",
                                      // Holiday gets gradient like AdminHome, today gets secondaryColor, announcements get subtle highlight
                                      background: holidayData
                                        ? `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`
                                        : isToday
                                        ? settings.secondaryColor
                                        : hasAnnouncements
                                        ? `${settings.primaryColor}15`
                                        : hasNotesOrEvents
                                        ? `${settings.primaryColor}0F`
                                        : "transparent",
                                      fontWeight: holidayData || isToday || hasAnnouncements || hasNotesOrEvents ? 700 : 400,
                                      border: isToday
                                        ? `2px solid ${settings.accentColor}`
                                        : hasAnnouncements
                                        ? `1px solid ${settings.primaryColor}40`
                                        : "none",
                                      cursor: day ? "pointer" : "default",
                                      transition: "all 0.2s",
                                      "&:hover": day ? {
                                        background: holidayData
                                          ? `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`
                                          : isToday
                                          ? settings.hoverColor
                                          : hasAnnouncements
                                          ? `${settings.primaryColor}25`
                                          : `${settings.primaryColor}1A`,
                                        transform: "scale(1.1)",
                                      } : {},
                                    }}
                                  >
                                    {day || ""}
                                    {/* Notes/Events dots */}
                                    {(hasNotesOrEvents) && day && (
                                      <Box sx={{ display: "flex", gap: 0.15, position: "absolute", bottom: 2 }}>
                                        {dayNotes.length > 0 && <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: holidayData ? "rgba(255,255,255,0.8)" : "#ff9800" }} />}
                                        {dayEvents.length > 0 && <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: holidayData ? "rgba(255,255,255,0.8)" : "#4caf50" }} />}
                                      </Box>
                                    )}
                                  </Box>
                                </Tooltip>
                              </Grid>
                            );
                          })}
                        </Grid>
                        {/* Footer hint */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, borderRadius: 1, bgcolor: `${settings.primaryColor}0A`, p: 0.5, mt: 0.75 }}>
                          <Typography variant="caption" sx={{ color: settings.textPrimaryColor, fontWeight: 500, fontSize: "0.65rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarMonth sx={{ fontSize: 13 }} /> Click day to view / add
                          </Typography>
                          <Tooltip title="Legends">
                            <IconButton size="small" onClick={(e) => setCalendarLegendAnchorEl(e.currentTarget)} sx={{ color: settings.textPrimaryColor, p: 0.4, transition: "all 0.2s", "&:hover": { bgcolor: `${settings.primaryColor}1A` } }}>
                              <MoreVert sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>

                  {/* Notes & Events */}
                  <Grow in timeout={700} style={{ flex: 0.94, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, minHeight: 0, overflow: "hidden" }}>
                      <CardContent sx={{ p: 1.1, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5, flexShrink: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.85rem" }}>Notes &amp; Events</Typography>
                          <Box>
                            <Tooltip title="Add Note">
                              <IconButton size="small" onClick={() => { setSelectedDate(normalizeDate(new Date())); handleAddNote(); }} sx={{ color: settings.textPrimaryColor, p: 0.4, transition: "all 0.2s", "&:hover": { bgcolor: `${settings.primaryColor}1A`, transform: "scale(1.1)" } }}><Note sx={{ fontSize: 18 }} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Add Event">
                              <IconButton size="small" onClick={() => { setSelectedDate(normalizeDate(new Date())); handleAddEvent(); }} sx={{ color: settings.textPrimaryColor, p: 0.4, transition: "all 0.2s", "&:hover": { bgcolor: `${settings.primaryColor}1A`, transform: "scale(1.1)" } }}><Event sx={{ fontSize: 18 }} /></IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, minHeight: 0, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-track": { background: `${settings.primaryColor}1A`, borderRadius: "2px" }, "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: "2px" } }}>
                          {getRecentActivity().length > 0 ? getRecentActivity().map((item, idx) => (
                            <Box key={idx} sx={{ mb: 0.5, pl: 0.75, py: 0.25, backgroundColor: item.type === "note" ? `${settings.primaryColor}1A` : "#e8f5e9", borderRadius: 1, borderLeft: `2px solid ${item.type === "note" ? settings.primaryColor : "#4caf50"}`, cursor: "pointer", transition: "all 0.2s", "&:hover": { transform: "translateX(2px)", boxShadow: `2px 0 8px ${settings.primaryColor}20` } }} onClick={() => { setSelectedDate(item.date); setViewNotesDialog(true); }}>
                              <Typography variant="caption" sx={{ color: item.type === "note" ? settings.textPrimaryColor : "#2e7d32", fontWeight: 600, fontSize: "0.7rem" }}>{item.type === "note" ? "Note" : "Event"}: {item.title}</Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ display: "block", fontSize: "0.65rem", mt: 0.25 }}>{item.content && item.content.length > 35 ? `${item.content.substring(0, 35)}...` : item.content}</Typography>
                            </Box>
                          )) : (
                            <Typography variant="caption" color="textSecondary" sx={{ textAlign: "center", py: 2, display: "block", fontSize: "0.7rem" }}>No recent activity</Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>
                </Box>

                {/* Right sub-column */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minWidth: { md: 220 }, minHeight: 0, height: "100%" }}>

                  {/* Payslip */}
                  <Grow in timeout={500}>
                    <Card sx={{ background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, flexShrink: 0 }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Receipt sx={{ color: settings.textPrimaryColor, mr: 0.5, fontSize: 18 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.85rem" }}>Payslip</Typography>
                          </Box>
                          <FormControl size="small" sx={{ minWidth: 70 }}>
                            <InputLabel sx={{ color: settings.textPrimaryColor, fontSize: "0.7rem" }}>Month</InputLabel>
                            <Select value={payslipMonth} label="Month" onChange={(e) => setPayslipMonth(Number(e.target.value))} sx={{ color: settings.textPrimaryColor, fontSize: "0.7rem", height: 30, "& .MuiOutlinedInput-notchedOutline": { borderColor: `${settings.primaryColor}40` }, "& .MuiSelect-select": { py: 0.5 } }}>
                              {monthNames.map((name, i) => (<MenuItem key={i} value={i}>{name.slice(0, 3)}</MenuItem>))}
                            </Select>
                          </FormControl>
                        </Box>
                        <Grid container spacing={0.75}>
                          {[{ label: "1st Quinceña", key: "pay1st", grad: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)` }, { label: "2nd Quinceña", key: "pay2nd", grad: `linear-gradient(135deg, ${settings.secondaryColor} 0%, ${settings.primaryColor} 100%)` }].map(({ label, key, grad }) => (
                            <Grid item xs={6} key={key}>
                              <Box sx={{ background: grad, borderRadius: 2.5, p: 1.25, display: "flex", flexDirection: "column", gap: 0.25, boxShadow: `0 4px 12px ${settings.primaryColor}33` }}>
                                <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
                                <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>
                                  {payrollData ? (() => { const n = parseFloat(payrollData[key]); return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₱0.00"; })() : "₱-.--"}
                                </Typography>
                                {payrollData && <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.55rem" }}>{monthNames[payslipMonth]} {payslipYear}</Typography>}
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                        {!payrollData && <Typography sx={{ fontSize: "0.6rem", color: settings.textPrimaryColor, opacity: 0.55, textAlign: "center", mt: 0.5 }}>No payslip for {monthNames[payslipMonth]}</Typography>}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, opacity: 0.35, mt: 0.5 }}>
                          <ArrowForward sx={{ fontSize: 11, color: settings.textPrimaryColor }} />
                          <Typography sx={{ fontSize: "0.6rem", color: settings.textPrimaryColor, fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/payslip", { state: { selectedMonth: payslipMonth, selectedYear: payslipYear } })}>Tap to view full payslip</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>

                  {/* Leave Credits */}
                  <Grow in timeout={550} style={{ flex: 0.96, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, width: "100%", overflow: "hidden" }}>
                      <CardContent sx={{ p: 1.25, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexShrink: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarMonth sx={{ color: settings.textPrimaryColor, fontSize: 16 }} />
                            <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.8rem" }}>My Leave Credits</Typography>
                          </Box>
                          {!leaveLoading && leaveCredits.length > 0 && <Chip label={`${(leaveCredits.reduce((s, g) => s + g.currRemaining + g.prevRemaining, 0)).toFixed(1)} Days`} size="small" sx={{ bgcolor: settings.primaryColor, color: "#fff", fontWeight: 700, fontSize: "0.6rem", height: 18 }} />}
                        </Box>
                        <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, pr: 0.25, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: 2 } }}>
                          {leaveLoading ? (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 3 }}>
                              <CircularProgress size={16} sx={{ color: settings.primaryColor }} />
                              <Typography sx={{ color: settings.textPrimaryColor, fontSize: "0.7rem" }}>Loading...</Typography>
                            </Box>
                          ) : leaveCredits.length === 0 ? (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                              <Typography sx={{ color: settings.textPrimaryColor, opacity: 0.45, textAlign: "center", fontSize: "0.68rem" }}>No leave credits assigned</Typography>
                            </Box>
                          ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                              {leaveCredits.map((leave, idx) => {
                                const pct = leave.currTotal > 0 ? (leave.currRemaining / leave.currTotal) * 100 : 0;
                                const statusColor = getLeaveStatusColor(leave.currRemaining, leave.currTotal);
                                const usedDays = leave.currAllocated - leave.currRemaining;
                                return (
                                  <Box key={idx} sx={{ p: 1, borderRadius: 2, border: `1px solid ${settings.primaryColor}18`, bgcolor: `${settings.primaryColor}05` }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                                      <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.68rem", lineHeight: 1.2 }}>{leave.name}</Typography>
                                      <Chip label={leave.code} size="small" sx={{ height: 15, fontSize: "0.52rem", bgcolor: `${statusColor}18`, color: statusColor, fontWeight: 700 }} />
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mb: 0.4 }}>
                                      <Box>
                                        <Typography sx={{ color: statusColor, fontWeight: 800, fontSize: "1rem", lineHeight: 1 }}>{leave.currRemaining.toFixed(1)}</Typography>
                                        <Typography sx={{ color: settings.textPrimaryColor, opacity: 0.55, fontSize: "0.57rem" }}>days left</Typography>
                                      </Box>
                                      <Typography sx={{ color: settings.textPrimaryColor, opacity: 0.45, fontSize: "0.57rem" }}>{usedDays < 0 ? 0 : usedDays.toFixed(1)} used / {leave.currAllocated.toFixed(1)} total</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ height: 3, borderRadius: 2, bgcolor: `${statusColor}20`, ".MuiLinearProgress-bar": { bgcolor: statusColor, borderRadius: 2 } }} />
                                    {leave.prevRemaining > 0 && (
                                      <Box sx={{ mt: 0.5, px: 0.5, py: 0.2, borderRadius: 1, bgcolor: "#FFF3E0", border: "1px dashed #FFB74D", display: "flex", alignItems: "center", gap: 0.4 }}>
                                        <Add sx={{ fontSize: 9, color: "#EF6C00" }} />
                                        <Typography sx={{ color: "#E65100", fontWeight: 700, fontSize: "0.55rem" }}>+{leave.prevRemaining.toFixed(1)} days carried over</Typography>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* ── ANNOUNCEMENT DETAIL MODAL — unified AdminHome rich style ── */}
          <Modal open={openModal} onClose={handleCloseModal}>
            <Fade in={openModal}>
              <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "96%", sm: "82%", md: "68%" }, maxWidth: 720, bgcolor: "background.paper", borderRadius: "18px", boxShadow: "0 48px 120px rgba(0,0,0,0.42), 0 8px 32px rgba(0,0,0,0.18)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                {selectedAnnouncement && (() => {
                  const isHoliday = selectedAnnouncement.id?.toString().startsWith("holiday-");
                  const isSuspension = selectedAnnouncement.id?.toString().startsWith("suspension-");
                  const type = isHoliday ? "HOLIDAY" : isSuspension ? "SUSPENSION" : "ANNOUNCEMENT";
                  const accentColor = isHoliday ? "#FB8C00" : isSuspension ? "#B71C1C" : "#1976D2";
                  const badgeBg = `${accentColor}55`;
                  const fmtDate = (raw) => { if (!raw) return null; const d = new Date(raw); if (isNaN(d)) return null; return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); };
                  const dateStart = fmtDate(selectedAnnouncement.date_start || selectedAnnouncement.date);
                  const dateEnd = fmtDate(selectedAnnouncement.date_end);
                  const dateRange = dateEnd && dateEnd !== dateStart ? `${dateStart} — ${dateEnd}` : dateStart;
                  const shortStart = selectedAnnouncement.date_start || selectedAnnouncement.date ? new Date(selectedAnnouncement.date_start || selectedAnnouncement.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                  const shortEnd = selectedAnnouncement.date_end ? new Date(selectedAnnouncement.date_end).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                  const dateChip = shortEnd && shortEnd !== shortStart ? `${shortStart} – ${shortEnd}` : shortStart;
                  return (
                    <>
                      <Box sx={{ position: "relative", height: { xs: 220, sm: 290, md: 330 }, flexShrink: 0, bgcolor: "#0d0d0d", overflow: "hidden" }}>
                        {selectedAnnouncement.image ? (
                          <Box component="img" src={`${API_BASE_URL}${selectedAnnouncement.image}`} alt={selectedAnnouncement.title} sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.42, display: "block" }} />
                        ) : (
                          <Box sx={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${accentColor}dd 0%, #050505 100%)` }} />
                        )}
                        <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 48%, rgba(0,0,0,0.04) 100%)" }} />
                        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, px: { xs: 2, md: 2.5 }, pt: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, bgcolor: badgeBg, border: "0.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", borderRadius: "20px", px: 1.4, py: 0.5 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: accentColor, boxShadow: `0 0 6px ${accentColor}`, "@keyframes pulse": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.4, transform: "scale(0.8)" } }, animation: "pulse 1.6s ease-in-out infinite" }} />
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.92)", textTransform: "uppercase" }}>{type}</Typography>
                          </Box>
                          <IconButton size="small" onClick={handleCloseModal} sx={{ bgcolor: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(8px)", border: "0.5px solid rgba(255,255,255,0.18)", width: 30, height: 30, transition: "all 0.2s", "&:hover": { bgcolor: "rgba(0,0,0,0.68)", transform: "rotate(90deg)" } }}>
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                        <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, px: { xs: 2.5, md: 3 }, pb: 2.5 }}>
                          {dateRange && <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}><AccessTimeIcon sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }} /><Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.03em" }}>{dateRange}</Typography></Box>}
                          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: { xs: "1.25rem", sm: "1.6rem", md: "1.9rem" }, lineHeight: 1.2, letterSpacing: "-0.01em", textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>{selectedAnnouncement.title}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ height: "3px", flexShrink: 0, background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}00 100%)` }} />
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.25, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", borderBottom: `1px solid ${settings.primaryColor}18`, flexShrink: 0 }}>
                        {dateChip && <Chip icon={<Event sx={{ fontSize: "13px !important", color: `${accentColor} !important` }} />} label={dateChip} size="small" sx={{ fontSize: "0.68rem", height: 24, fontWeight: 500, bgcolor: `${accentColor}0F`, border: `1px solid ${accentColor}28`, color: accentColor, "& .MuiChip-icon": { ml: "6px" } }} />}
                      </Box>
                      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2.5, md: 3 }, py: 2.25, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: `${settings.primaryColor}28`, borderRadius: 2 } }}>
                        <Typography sx={{ fontSize: "0.92rem", color: "text.primary", lineHeight: 1.9, whiteSpace: "pre-line", fontWeight: 400 }}>{selectedAnnouncement.about || "No additional details provided."}</Typography>
                      </Box>
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5, borderTop: `1px solid ${settings.primaryColor}18`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, bgcolor: `${settings.primaryColor}04`, gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                          {[["#FB8C00","Holiday"],["#B71C1C","Suspension"],["#1976D2","Announcement"]].map(([color, label]) => (
                            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                              <Typography sx={{ fontSize: "0.68rem", color: "#6B7280" }}>{label}</Typography>
                            </Box>
                          ))}
                        </Box>
                        <Button onClick={handleCloseModal} size="small" sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem", color: "#fff", bgcolor: accentColor, border: `1.5px solid ${accentColor}`, borderRadius: "8px", px: 2.5, py: 0.65, "&:hover": { bgcolor: "transparent", color: accentColor, transform: "translateY(-1px)" } }}>Dismiss</Button>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Fade>
          </Modal>

          {/* ── NOTIFICATIONS MODAL ── */}
          <Modal open={notifModalOpen} onClose={handleCloseNotifModal}>
            <Fade in={notifModalOpen}>
              <Box sx={{ position: "absolute", top: { xs: "50%", md: "76px" }, right: { xs: "50%", md: "20px" }, transform: { xs: "translate(50%, -50%)", md: "none" }, width: { xs: "92%", sm: "400px" }, maxHeight: "85vh", display: "flex", flexDirection: "column", bgcolor: "#ffffff", border: `1px solid ${settings.primaryColor}30`, boxShadow: `0 16px 48px ${settings.primaryColor}28`, borderRadius: "16px", overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1.25, background: `linear-gradient(135deg, ${settings.secondaryColor} 0%, ${settings.primaryColor} 55%, ${settings.secondaryColor} 100%)`, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <NotificationsIcon sx={{ fontSize: 15, color: "#fff" }} />
                    </Box>
                    <Typography sx={{ fontWeight: 500, fontSize: "0.9rem", color: "#fff", flexShrink: 0 }}>Notifications</Typography>
                    <Box sx={{ flex: 1 }} />
                    {derivedUnreadCount > 0 && (
                      <Box sx={{ px: 1, py: 0.15, borderRadius: "20px", bgcolor: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "0.62rem", fontWeight: 600, lineHeight: 1.7, flexShrink: 0, whiteSpace: "nowrap" }}>{derivedUnreadCount} unread</Box>
                    )}
                    <NotifFilterChips activeFilter={notifFilter} onChange={setNotifFilter} settings={settings} unreadCount={derivedUnreadCount} />
                    <IconButton size="small" onClick={handleCloseNotifModal} sx={{ color: "rgba(255,255,255,0.8)", width: 26, height: 26, flexShrink: 0, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", "&:hover": { background: "rgba(255,255,255,0.25)", color: "#fff" } }}>
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                </Box>
                <Button fullWidth onClick={markAllNotificationsAsRead} disabled={derivedUnreadCount === 0} sx={{ justifyContent: "flex-end", textTransform: "none", borderRadius: 0, py: 0.6, px: 2, fontSize: "0.68rem", fontWeight: 600, color: settings.secondaryColor, bgcolor: `${settings.primaryColor}0D`, borderBottom: "1px solid #efe4e4", "&:hover": { bgcolor: `${settings.primaryColor}16` } }}>
                  Mark all as read
                </Button>
                <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#ffffff", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: `${settings.primaryColor}40`, borderRadius: 4 } }}>
                  {Array.isArray(notifications) && notifications.length > 0 ? (
                    filteredNotifications.length > 0 ? (
                      filteredNotifications.slice(0, 15).map((notif, idx, arr) => {
                        const isContact = notif.notification_type === "contact" || notif.notification_type === "ticket";
                        const isRead = notif.read_status === 1;
                        const TYPE_CONFIG = {
                          payslip:      { label: "Payroll",       accent: "#2e7d32", iconBg: "#e8f5e9" },
                          contact:      { label: "Ticket",        accent: "#c17f24", iconBg: "#fff8e1" },
                          ticket:       { label: "Ticket",        accent: "#c17f24", iconBg: "#fff8e1" },
                          holiday:      { label: "Holiday",       accent: "#1565c0", iconBg: "#e3f2fd" },
                          suspension:   { label: "Suspension",    accent: "#c62828", iconBg: "#ffebee" },
                          announcement: { label: "Announcement",  accent: settings.primaryColor, iconBg: `${settings.primaryColor}18` },
                        };
                        const cfg = TYPE_CONFIG[notif.notification_type] || { label: "Notification", accent: settings.primaryColor, iconBg: `${settings.primaryColor}18` };
                        const ICON_MAP = {
                          payslip:      <Receipt sx={{ fontSize: 15, color: cfg.accent }} />,
                          contact:      <ContactPage sx={{ fontSize: 15, color: cfg.accent }} />,
                          ticket:       <ContactPage sx={{ fontSize: 15, color: cfg.accent }} />,
                          holiday:      <CalendarMonth sx={{ fontSize: 15, color: cfg.accent }} />,
                          suspension:   <Event sx={{ fontSize: 15, color: cfg.accent }} />,
                          announcement: <NotificationsIcon sx={{ fontSize: 15, color: cfg.accent }} />,
                        };
                        const icon = ICON_MAP[notif.notification_type] || <NotificationsIcon sx={{ fontSize: 15, color: cfg.accent }} />;
                        const rawDesc = notif.description || "";
                        const cleanDesc = rawDesc.replace(/\. Click to view details\.?$/i, ".").replace(/\. Click to view response\.?$/i, ".").replace(/submitted a new ticket:\s*/i, "opened a ticket — ").replace(/has responded to your ticket\./i, "responded to your ticket.").replace(/replied to your ticket\./i, "replied to your ticket.").replace(/has been marked as replied by /i, "was marked as replied by ").replace(/has been resolved by /i, "was resolved by ").trim();
                        const timeAgo = (() => {
                          if (!notif.created_at) return "";
                          const diff = Date.now() - new Date(notif.created_at).getTime();
                          const m = Math.floor(diff / 60000);
                          if (m < 1) return "just now";
                          if (m < 60) return `${m}m ago`;
                          const h = Math.floor(m / 60);
                          if (h < 24) return `${h}h ago`;
                          const d = Math.floor(h / 24);
                          if (d < 7) return `${d}d ago`;
                          return new Date(notif.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        })();
                        const dayLabel = getNotificationDayLabel(notif.created_at);
                        const prevDayLabel = idx > 0 ? getNotificationDayLabel(arr[idx - 1]?.created_at) : null;
                        const showDayLabel = idx === 0 || dayLabel !== prevDayLabel;
                        const isImageType = notif.notification_type === "announcement" || notif.notification_type === "holiday" || notif.notification_type === "suspension";
                        const isAnnouncementCard = notif.notification_type === "announcement";
                        const carouselItem = isImageType ? getCarouselItemForNotif(notif) : null;
                        const itemImage = carouselItem?.image ? `${API_BASE_URL}${carouselItem.image}` : null;
                        const itemTitle = carouselItem?.title || notif.title || "";
                        const itemAbout = carouselItem?.about || "";

                        if (isImageType) {
                          return (
                            <React.Fragment key={`notif-wrap-${notif.id}`}>
                              {showDayLabel && <Box sx={{ px: 2, pt: idx === 0 ? 0.9 : 1.2, pb: 0.45, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d7f7f", bgcolor: "#faf6f6", borderBottom: "1px solid #f2e9e9" }}>{dayLabel}</Box>}
                              <Box onClick={() => handleNotificationClick(notif)} sx={{ borderBottom: "1px solid #f5eeee", bgcolor: isRead ? "#ffffff" : `${settings.primaryColor}06`, cursor: "pointer", transition: "background 0.12s", "&:hover": { bgcolor: isRead ? "#fdf8f8" : `${settings.primaryColor}0E` }, "&:last-child": { borderBottom: "none" }, borderLeft: isRead ? "none" : `3px solid ${settings.primaryColor}` }}>
                                {isAnnouncementCard ? (
                                  <Box sx={{ position: "relative", height: 100, overflow: "hidden", mx: 1.5, mt: 1.25, borderRadius: "10px" }}>
                                    {itemImage ? <Box component="img" src={itemImage} alt={itemTitle} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <Box sx={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#3d0c6b,#1a0a3d)" }} />}
                                    <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.15) 55%,transparent 100%)" }} />
                                    <Box sx={{ position: "absolute", top: 7, left: 8, px: 1, py: 0.15, borderRadius: "20px", bgcolor: "rgba(123,31,162,0.9)" }}><Typography sx={{ fontSize: "0.55rem", fontWeight: 700, color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>{cfg.label}</Typography></Box>
                                    {!isRead && <Box sx={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", bgcolor: "#fff", outline: `2px solid ${settings.secondaryColor}` }} />}
                                    {itemTitle && <Typography sx={{ position: "absolute", bottom: 7, left: 10, right: 10, fontSize: "0.72rem", fontWeight: 500, color: "#fff", lineHeight: 1.35 }}>{itemTitle}</Typography>}
                                  </Box>
                                ) : (
                                  <Box sx={{ mx: 1.5, mt: 1.1, borderRadius: "10px", overflow: "hidden", height: 64, display: "flex", alignItems: "center", px: 1.75, gap: 1.5, border: `1px solid ${notif.notification_type === "holiday" ? "rgba(237,108,2,0.3)" : "rgba(211,47,47,0.25)"}`, bgcolor: notif.notification_type === "holiday" ? "rgba(237,108,2,0.12)" : "rgba(211,47,47,0.09)" }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: notif.notification_type === "holiday" ? "rgba(237,108,2,0.18)" : "rgba(211,47,47,0.15)" }}>{icon}</Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", mb: 0.25, color: notif.notification_type === "holiday" ? "#b45309" : "#b71c1c" }}>{cfg.label}</Typography>
                                      <Typography sx={{ fontSize: "0.74rem", fontWeight: 500, color: "#1d1d1d", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemTitle || cleanDesc}</Typography>
                                    </Box>
                                    {!isRead && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#fff", outline: `2px solid ${settings.secondaryColor}`, flexShrink: 0 }} />}
                                  </Box>
                                )}
                                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 1.5, py: 1, pb: 1.25 }}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontSize: "0.75rem", color: "#444", lineHeight: 1.45 }}>{cleanDesc || itemAbout}</Typography></Box>
                                  <Typography sx={{ fontSize: "0.62rem", color: "#999", flexShrink: 0, mt: 0.1 }}>{timeAgo}</Typography>
                                </Box>
                              </Box>
                            </React.Fragment>
                          );
                        }

                        const ticketEntry = isContact ? (contactTicketStatuses || {})[notif.id] : null;
                        const ticketSubject = ticketEntry?.subject || "";
                        const ticketEmpName = ticketEntry?.employee_name || "";
                        const ticketEmpNum  = ticketEntry?.employee_number || notif.employeeNumber || "";

                        return (
                          <React.Fragment key={`notif-wrap-${notif.id}`}>
                            {showDayLabel && <Box sx={{ px: 2, pt: idx === 0 ? 0.9 : 1.2, pb: 0.45, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d7f7f", bgcolor: "#faf6f6", borderBottom: "1px solid #f2e9e9" }}>{dayLabel}</Box>}
                            <Box onClick={() => handleNotificationClick(notif)} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, pl: isRead ? 2.25 : 2, pr: 2.25, py: 1.5, borderBottom: "1px solid #f5eeee", borderLeft: isRead ? "none" : `3px solid ${settings.primaryColor}`, bgcolor: isRead ? "#ffffff" : `${settings.primaryColor}06`, cursor: "pointer", transition: "background 0.12s", "&:hover": { bgcolor: isRead ? "#fdf8f8" : `${settings.primaryColor}0E` }, "&:last-child": { borderBottom: "none" } }}>
                              <Box sx={{ width: 38, height: 38, borderRadius: "10px", bgcolor: cfg.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.15 }}>{icon}</Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.3 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                    <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: cfg.accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>{cfg.label}</Typography>
                                    {isContact && <TicketStatusBadge notifId={notif.id} contactTicketStatuses={contactTicketStatuses} />}
                                  </Box>
                                  <Typography sx={{ fontSize: "0.62rem", color: "#999", flexShrink: 0, ml: 1 }}>{timeAgo}</Typography>
                                </Box>
                                {isContact && ticketSubject ? (
                                  <>
                                    <Typography sx={{ fontSize: "0.8rem", color: "#1a1a1a", fontWeight: isRead ? 500 : 700, lineHeight: 1.45, mb: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticketSubject}</Typography>
                                    <Typography sx={{ fontSize: "0.75rem", color: "#444", fontWeight: 400, lineHeight: 1.4, mb: 0.3 }}>{cleanDesc}</Typography>
                                    {(ticketEmpName || ticketEmpNum) && (
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.4, flexWrap: "wrap" }}>
                                        {ticketEmpName && <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}><Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: cfg.accent }} /><Typography sx={{ fontSize: "0.68rem", color: "#555", fontWeight: 500 }}>{ticketEmpName}</Typography></Box>}
                                        {ticketEmpNum && <Typography sx={{ fontSize: "0.65rem", color: "#888", fontFamily: "monospace", letterSpacing: "0.03em" }}>#{ticketEmpNum}</Typography>}
                                      </Box>
                                    )}
                                  </>
                                ) : (
                                  <Typography sx={{ fontSize: "0.8rem", color: "#1a1a1a", fontWeight: isRead ? 400 : 600, lineHeight: 1.55 }}>{cleanDesc}</Typography>
                                )}
                              </Box>
                              {!isRead && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: settings.primaryColor, flexShrink: 0, mt: 0.6 }} />}
                            </Box>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 7, px: 3 }}>
                        <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: `${settings.primaryColor}10`, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}><NotificationsIcon sx={{ fontSize: 24, color: `${settings.primaryColor}80` }} /></Box>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#1a1a1a", mb: 0.5 }}>No results</Typography>
                        <Typography sx={{ fontSize: "0.73rem", color: "#777", textAlign: "center" }}>No notifications match this filter.</Typography>
                      </Box>
                    )
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, px: 3 }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: `${settings.primaryColor}10`, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}><NotificationsIcon sx={{ fontSize: 28, color: `${settings.primaryColor}80` }} /></Box>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", color: "#1a1a1a", mb: 0.5 }}>All caught up</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#777", textAlign: "center" }}>No new notifications at this time.</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1.1, bgcolor: "#faf8f8", borderTop: "1px solid #ece3e3", flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#7a6f6f", letterSpacing: "0.08em", textTransform: "uppercase" }}>Legend:</Typography>
                  {[{ label: "Holiday", bg: "rgba(237,108,2,0.25)", border: "#ed6c02" }, { label: "Suspension", bg: "rgba(211,47,47,0.2)", border: "#d32f2f" }, { label: "On Leave", bg: "rgba(46,125,50,0.2)", border: "#2e7d32" }].map((item) => (
                    <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: item.bg, border: `1.5px solid ${item.border}` }} />
                      <Typography sx={{ fontSize: "0.64rem", color: "#666" }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Fade>
          </Modal>

          {/* ── CALENDAR LEGENDS MENU ── */}
          <Menu anchorEl={calendarLegendAnchorEl} open={openCalendarLegend} onClose={() => setCalendarLegendAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 180, backgroundColor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1 }}>Legends</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[["#ff9800", "Notes"], ["#4caf50", "Events"], [settings.primaryColor, "Holidays"], [settings.secondaryColor, "Today"]].map(([color, label]) => (
                  <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
                    <Typography variant="body2" sx={{ color: settings.textPrimaryColor, fontSize: "0.78rem" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Menu>

          {/* ── VIEW NOTES/EVENTS DIALOG ── */}
          <Dialog open={viewNotesDialog} onClose={() => setViewNotesDialog(false)} maxWidth="sm" fullWidth BackdropProps={{ sx: { backgroundColor: "rgba(0, 0, 0, 0.56)", backdropFilter: "blur(4px)" } }} PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}33` } }}>
            <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>{selectedDate && (() => { const [y, m, d] = selectedDate.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); })()}</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1, display: "flex", alignItems: "center" }}><Note sx={{ mr: 1 }} /> Notes</Typography>
              {getNotesForDate(selectedDate).length > 0 ? getNotesForDate(selectedDate).map((note) => (
                <Box key={note.id} sx={{ mb: 2, p: 2, backgroundColor: `${settings.primaryColor}1A`, borderRadius: 2, border: `1px solid ${settings.primaryColor}20` }}>
                  <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>{note.content}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <IconButton size="small" onClick={() => handleDeleteNote(note.id)} sx={{ color: "#d32f2f", borderRadius: "4px", transition: "all 0.15s", "&:hover": { bgcolor: "#FCEBEB" } }}><Delete fontSize="small" /></IconButton>
                  </Box>
                </Box>
              )) : <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>No notes for this date</Typography>}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1, mt: 3, display: "flex", alignItems: "center" }}><Event sx={{ mr: 1 }} /> Events</Typography>
              {getEventsForDate(selectedDate).length > 0 ? getEventsForDate(selectedDate).map((event) => (
                <Box key={event.id} sx={{ mb: 2, p: 2, backgroundColor: "#e8f5e9", borderRadius: 2, border: "1px solid #c8e6c9" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{event.title}</Typography>
                  <Typography variant="body2">{event.description}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <IconButton size="small" onClick={() => handleDeleteEvent(event.id)} sx={{ color: "#d32f2f", borderRadius: "4px", transition: "all 0.15s", "&:hover": { bgcolor: "#FCEBEB" } }}><Delete fontSize="small" /></IconButton>
                  </Box>
                </Box>
              )) : <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>No events for this date</Typography>}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1, mt: 3, display: "flex", alignItems: "center" }}><Flag sx={{ mr: 1 }} /> Announcements</Typography>
              {(() => {
                const dateAnnouncements = announcements.filter((a) => normalizeDate(a.date) === selectedDate);
                return dateAnnouncements.length > 0 ? dateAnnouncements.map((announcement) => (
                  <Box key={announcement.id} sx={{ mb: 2, p: 2, backgroundColor: "#e3f2fd", borderRadius: 2, border: "1px solid #bbdefb", cursor: "pointer", transition: "all 0.2s", "&:hover": { backgroundColor: "#bbdefb", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(25,118,210,0.15)" } }} onClick={() => { setViewNotesDialog(false); handleOpenModal(announcement); }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{announcement.title}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{announcement.about && announcement.about.length > 100 ? `${announcement.about.substring(0, 100)}...` : announcement.about}</Typography>
                  </Box>
                )) : <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>No announcements for this date</Typography>;
              })()}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 0.5 }}>
              <Button onClick={() => { setViewNotesDialog(false); handleAddNote(); }} startIcon={<Note />} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: "#fff", bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor, transform: "translateY(-1px)" }, transition: "all 0.2s" }}>Add Note</Button>
              <Button onClick={() => { setViewNotesDialog(false); handleAddEvent(); }} startIcon={<Add />} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: "#fff", bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor, transform: "translateY(-1px)" }, transition: "all 0.2s" }}>Add Event</Button>
              <Button onClick={() => setViewNotesDialog(false)} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: settings.textPrimaryColor, border: `1.5px solid ${settings.primaryColor}40`, "&:hover": { bgcolor: `${settings.primaryColor}0A` } }}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* ── ADD NOTE DIALOG ── */}
          <Dialog open={openNoteDialog} onClose={() => setOpenNoteDialog(false)} maxWidth="sm" fullWidth BackdropProps={{ sx: { backgroundColor: "rgba(0, 0, 0, 0.56)", backdropFilter: "blur(4px)" } }} PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}33` } }}>
            <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>Add Note</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <TextField autoFocus fullWidth multiline rows={4} label="Note Content" value={currentNote.content} onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              <Typography variant="caption" color="textSecondary">Date: {currentNote.date && (() => { const [y, m, d] = currentNote.date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(); })()}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenNoteDialog(false)} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: "#666", border: "1.5px solid #ddd", "&:hover": { bgcolor: "#f5f5f5" }, px: 2 }}>Cancel</Button>
              <Button onClick={handleSaveNote} variant="contained" startIcon={<Save />} disabled={!currentNote.content} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: settings.primaryColor, color: "#fff", px: 2.5, "&:hover": { bgcolor: settings.hoverColor } }}>Save Note</Button>
            </DialogActions>
          </Dialog>

          {/* ── ADD EVENT DIALOG ── */}
          <Dialog open={openEventDialog} onClose={() => setOpenEventDialog(false)} maxWidth="sm" fullWidth BackdropProps={{ sx: { backgroundColor: "rgba(0, 0, 0, 0.56)", backdropFilter: "blur(4px)" } }} PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}33` } }}>
            <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>Add Event</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <TextField autoFocus fullWidth label="Event Title" value={currentEvent.title} onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })} sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              <TextField fullWidth label="Event Date" type="date" variant="outlined" size="small" value={currentEvent.date} onChange={(e) => setCurrentEvent({ ...currentEvent, date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              <TextField fullWidth multiline rows={3} label="Event Description" value={currentEvent.description} onChange={(e) => setCurrentEvent({ ...currentEvent, description: e.target.value })} sx={{ mb: 0.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenEventDialog(false)} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: "#666", border: "1.5px solid #ddd", "&:hover": { bgcolor: "#f5f5f5" }, px: 2 }}>Cancel</Button>
              <Button onClick={handleSaveEvent} variant="contained" startIcon={<Save />} disabled={!currentEvent.title} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: settings.primaryColor, color: "#fff", px: 2.5, "&:hover": { bgcolor: settings.hoverColor } }}>Save Event</Button>
            </DialogActions>
          </Dialog>

        </Box>
      </Box>
    </Fade>
  );
};

export default Home;