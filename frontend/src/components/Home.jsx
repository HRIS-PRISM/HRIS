import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../contexts/SocketContext";
import API_BASE_URL from "../apiConfig";
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
  LinearProgress,
} from "@mui/material";

import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import NotificationsIcon from "@mui/icons-material/Notifications";
import {
  AccessTime,
  Receipt,
  ContactPage,
  Event,
  CalendarMonth,
  Logout,
  Settings,
  Dashboard as DashboardIcon,
  WorkHistory,
  Close,
  Add,
  Note,
  Flag,
  ArrowForward,
  PlayArrow,
  Pause,
  AccountCircle,
  HelpOutline,
  PrivacyTip,
  MoreVert,
  Delete,
  Save,
} from "@mui/icons-material";

// ─── System Settings ──────────────────────────────────────────────────────────
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
      try { setSettings(JSON.parse(storedSettings)); } catch {}
    }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
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
    const timer = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
    }, interval);
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
const isHolidayActive = (date_start, date_end, fallbackDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = date_start || fallbackDate;
  const end = date_end || fallbackDate;
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s) s.setHours(0, 0, 0, 0);
  if (e) e.setHours(0, 0, 0, 0);
  if (e && today > e) return false;
  if (s && today < s) return false;
  return true;
};

const isNotExpired = (date_end) => {
  if (!date_end) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const e = new Date(date_end);
  e.setHours(0, 0, 0, 0);
  return today <= e;
};

// ─── Skeleton / Wireframe shimmer ────────────────────────────────────────────
const shimmerKeyframes = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}
`;

const SkeletonBox = ({ width = "100%", height = 16, borderRadius = 8, sx = {}, light = false }) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: `${borderRadius}px`,
      background: light
        ? "linear-gradient(90deg,rgba(255,255,255,0.22) 25%,rgba(255,255,255,0.42) 50%,rgba(255,255,255,0.22) 75%)"
        : "linear-gradient(90deg,#ede5e5 25%,#f7f2f2 50%,#ede5e5 75%)",
      backgroundSize: "800px 100%",
      animation: "shimmer 1.5s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe Loading Skeleton ───────────────────────────────────────────────
const WireframeLoading = ({ settings }) => (
  <>
    <style>{shimmerKeyframes}</style>
    <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>

      {/* Header skeleton */}
      <Box sx={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        mb: 2, background: settings.accentColor, borderRadius: 4, p: 2,
        border: `1px solid ${settings.primaryColor}26`,
        animation: "skeletonPulse 2s ease-in-out infinite",
      }}>
        <Box>
          <SkeletonBox width={240} height={26} borderRadius={6} sx={{ mb: 1 }} />
          <SkeletonBox width={200} height={14} borderRadius={4} />
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </Box>
      </Box>

      <Grid container spacing={2}>

        {/* LEFT — Carousel skeleton */}
        <Grid item xs={12} md={7.5}>
          <Box sx={{
            height: "calc(100vh - 250px)",
            border: `1px solid ${settings.primaryColor}26`,
            borderRadius: 4, overflow: "hidden", position: "relative",
          }}>
            {/* Image shimmer */}
            <SkeletonBox width="100%" height="100%" borderRadius={0} sx={{ position: "absolute", inset: 0 }} />

            {/* Arrow ghost buttons */}
            <Box sx={{
              position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)",
              width: 44, height: 44, borderRadius: "50%",
              border: `1px dashed ${settings.primaryColor}40`,
              bgcolor: `${settings.primaryColor}12`,
            }} />
            <Box sx={{
              position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
              width: 44, height: 44, borderRadius: "50%",
              border: `1px dashed ${settings.primaryColor}40`,
              bgcolor: `${settings.primaryColor}12`,
            }} />
            {/* Play ghost */}
            <Box sx={{
              position: "absolute", top: 24, right: 24,
              width: 40, height: 40, borderRadius: "50%",
              border: `1px dashed ${settings.primaryColor}40`,
              bgcolor: `${settings.primaryColor}12`,
            }} />

            {/* Bottom text overlay */}
            <Box sx={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `linear-gradient(to top, ${settings.secondaryColor}55 0%, transparent 100%)`,
              p: 4,
            }}>
              <SkeletonBox light width={110} height={22} borderRadius={11} sx={{ mb: 2 }} />
              <SkeletonBox light width="65%" height={36} borderRadius={6} sx={{ mb: 1.5 }} />
              <SkeletonBox light width="42%" height={36} borderRadius={6} sx={{ mb: 2 }} />
              <SkeletonBox light width={200} height={16} borderRadius={4} />
            </Box>

            {/* Dot indicators */}
            <Box sx={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 1.5 }}>
              {[32, 10, 10, 10].map((w, i) => (
                <SkeletonBox key={i} light width={w} height={10} borderRadius={5} />
              ))}
            </Box>
          </Box>
        </Grid>

        {/* RIGHT column */}
        <Grid item xs={12} md={4.5}>
          <Box sx={{
            display: "flex", flexDirection: { xs: "column-reverse", md: "row" },
            gap: 2, height: "calc(100vh - 230px)",
          }}>

            {/* ── Left sub-column ── */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>

              {/* Quick Access */}
              <Box sx={{
                background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1.25,
                animation: "skeletonPulse 2s ease-in-out 0.1s infinite",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.75, gap: 0.5 }}>
                  <SkeletonBox width={16} height={16} borderRadius={4} />
                  <SkeletonBox width={90} height={13} borderRadius={4} />
                </Box>
                <Grid container spacing={0.5}>
                  {[...Array(4)].map((_, i) => (
                    <Grid item xs={3} key={i}>
                      <Box sx={{
                        p: 0.75, borderRadius: 2,
                        border: `1px dashed ${settings.primaryColor}30`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                        bgcolor: `${settings.primaryColor}06`,
                      }}>
                        <SkeletonBox width={22} height={22} borderRadius={11} />
                        <SkeletonBox width={26} height={9} borderRadius={3} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Calendar */}
              <Box sx={{
                background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1.25,
                animation: "skeletonPulse 2s ease-in-out 0.2s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                  <SkeletonBox width={14} height={14} borderRadius={4} />
                  <SkeletonBox width={90} height={13} borderRadius={4} />
                  <SkeletonBox width={14} height={14} borderRadius={4} />
                </Box>
                <Grid container sx={{ mb: 0.5 }}>
                  {[...Array(7)].map((_, i) => (
                    <Grid item xs={12 / 7} key={i}>
                      <Box sx={{ display: "flex", justifyContent: "center", py: 0.3 }}>
                        <SkeletonBox width={12} height={10} borderRadius={3} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Grid container spacing={0.25}>
                  {[...Array(42)].map((_, i) => (
                    <Grid item xs={12 / 7} key={i}>
                      <Box sx={{ display: "flex", justifyContent: "center", py: 0.2 }}>
                        {i >= 1 && i < 31 ? (
                          <SkeletonBox
                            width={18} height={18} borderRadius={i === 8 ? 9 : 3}
                            sx={i === 8 ? {
                              background: `linear-gradient(135deg, ${settings.primaryColor}55, ${settings.secondaryColor}55)`,
                              backgroundSize: "initial",
                              animation: "skeletonPulse 2s ease-in-out infinite",
                            } : {}}
                          />
                        ) : (
                          <Box sx={{ width: 18, height: 18 }} />
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ mt: 0.5, borderRadius: 1, bgcolor: `${settings.primaryColor}08`, p: 0.5 }}>
                  <SkeletonBox width="75%" height={10} borderRadius={3} />
                </Box>
              </Box>

              {/* Notes & Events */}
              <Box sx={{
                flex: 1, background: settings.accentColor,
                border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1.1, overflow: "hidden",
                animation: "skeletonPulse 2s ease-in-out 0.3s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <SkeletonBox width={100} height={13} borderRadius={4} />
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <SkeletonBox width={22} height={22} borderRadius={11} />
                    <SkeletonBox width={22} height={22} borderRadius={11} />
                  </Box>
                </Box>
                {[["55%", "#ff9800"], ["80%", settings.primaryColor], ["40%", "#4caf50"]].map(([w, color], i) => (
                  <Box key={i} sx={{
                    mb: 0.75, pl: 0.75, py: 0.6, borderRadius: 1,
                    borderLeft: `2px solid ${color}50`,
                    bgcolor: `${color}08`,
                  }}>
                    <SkeletonBox width={w} height={10} borderRadius={3} sx={{ mb: 0.4 }} />
                    <SkeletonBox width="90%" height={8} borderRadius={3} />
                  </Box>
                ))}
              </Box>
            </Box>

            {/* ── Right sub-column ── */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>

              {/* Payslip */}
              <Box sx={{
                background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1.5,
                animation: "skeletonPulse 2s ease-in-out 0.15s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <SkeletonBox width={18} height={18} borderRadius={4} />
                    <SkeletonBox width={55} height={13} borderRadius={4} />
                  </Box>
                  <SkeletonBox width={70} height={28} borderRadius={4} />
                </Box>
                <Grid container spacing={0.5}>
                  {[0, 1].map((i) => (
                    <Grid item xs={6} key={i}>
                      <Box sx={{
                        borderRadius: 2, py: 1, px: 1, textAlign: "center",
                        background: `linear-gradient(135deg, ${settings.primaryColor}30, ${settings.secondaryColor}30)`,
                        border: `1px dashed ${settings.primaryColor}30`,
                      }}>
                        <SkeletonBox light width="60%" height={9} borderRadius={3} sx={{ mb: 0.75, mx: "auto" }} />
                        <SkeletonBox light width="80%" height={18} borderRadius={4} sx={{ mx: "auto" }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <SkeletonBox width={80} height={18} borderRadius={4} sx={{ mt: 0.75, mx: "auto" }} />
              </Box>

              {/* Leave Credits */}
              <Box sx={{
                flex: 1, background: settings.accentColor,
                border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1, overflow: "hidden",
                animation: "skeletonPulse 2s ease-in-out 0.25s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <SkeletonBox width={16} height={16} borderRadius={4} />
                    <SkeletonBox width={115} height={13} borderRadius={4} />
                  </Box>
                  <SkeletonBox width={65} height={20} borderRadius={10} />
                </Box>
                {[["#2E7D32", "70%"], ["#EF6C00", "35%"], ["#B71C1C", "10%"]].map(([color, pct], i) => (
                  <Box key={i} sx={{
                    mb: 1, p: 0.75, borderRadius: 1.5,
                    border: `1px solid ${settings.primaryColor}18`,
                    bgcolor: `${settings.primaryColor}04`,
                  }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <SkeletonBox width="50%" height={11} borderRadius={3} />
                      <SkeletonBox width={30} height={15} borderRadius={7} />
                    </Box>
                    <SkeletonBox width={42} height={20} borderRadius={4} sx={{ mb: 0.25 }} />
                    <SkeletonBox width={50} height={9} borderRadius={3} sx={{ mb: 0.5 }} />
                    {/* Animated progress bar */}
                    <Box sx={{ height: 2.5, borderRadius: 2, bgcolor: `${color}20`, overflow: "hidden" }}>
                      <Box sx={{
                        height: "100%", width: pct, borderRadius: 2,
                        background: `linear-gradient(90deg, ${color}70 25%, ${color}BB 50%, ${color}70 75%)`,
                        backgroundSize: "400px 100%",
                        animation: "shimmer 1.8s infinite linear",
                      }} />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                      <SkeletonBox width={48} height={8} borderRadius={3} />
                      <SkeletonBox width={38} height={8} borderRadius={3} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─── Home ─────────────────────────────────────────────────────────────────────
const Home = () => {
  const settings = useSystemSettings();
  const { socket, connected } = useSocket();

  // pageLoading drives the wireframe → real transition
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
  const [payrollData, setPayrollData] = useState(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementDetails, setAnnouncementDetails] = useState({});
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

  const navigate = useNavigate();

  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ── Carousel items ────────────────────────────────────────────────────────

  const scheduledHolidaysForCarousel = useMemo(
    () =>
      (rawHolidays || [])
        .filter((h) => (h.status || "").toLowerCase() === "active")
.filter((h) => isNotExpired(h.date_end || h.date))
        .map((h) => ({
          id: `holiday-${h.id}`,
          title: h.title || h.description || "",
          about: h.about || "Official holiday.",
          date: h.date_start || h.date_end || h.date,
          date_start: h.date_start || h.date,
          date_end: h.date_end || h.date,
          image: h.image || null,
        })),
    [rawHolidays]
  );

  const suspensionsForCarousel = useMemo(
    () =>
      (suspensions || [])
        .filter((s) => isNotExpired(s.date_end))
        .map((s) => ({
          id: `suspension-${s.id}`,
          title: s.title || "",
          about: s.about || "",
          date: s.date_start || s.date_end || s.date,
          date_start: s.date_start || s.date,
          date_end: s.date_end || s.date,
          image: s.image || null,
        })),
    [suspensions]
  );

  const announcementsInRange = useMemo(
    () => (announcements || []).filter((a) => isNotExpired(a.date_end)),
    [announcements]
  );

  const carouselItems = useMemo(
    () =>
      [
        ...scheduledHolidaysForCarousel,
        ...suspensionsForCarousel,
        ...announcementsInRange,
      ].sort(
        (a, b) =>
          new Date(b.date_start || b.date) - new Date(a.date_start || a.date)
      ),
    [scheduledHolidaysForCarousel, suspensionsForCarousel, announcementsInRange]
  );

  const {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  } = useCarousel(carouselItems);

  // ── Fetch functions ───────────────────────────────────────────────────────

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
          return { date: normalizedDate, name: item.description, status: item.status };
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

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/announcements`);
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const fetchAnnouncementsRef = useRef(fetchAnnouncements);
  useEffect(() => { fetchAnnouncementsRef.current = fetchAnnouncements; }, [fetchAnnouncements]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
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
        const userAssignments = assignmentsRes.data.filter(
          (a) => a.employeeNumber?.toString() === employeeNumber?.toString()
        );
        const byCode = {};
        userAssignments.forEach((a) => {
          if (!byCode[a.leave_code]) byCode[a.leave_code] = [];
          byCode[a.leave_code].push(a);
        });
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
          return {
            code, name: leaveType?.leave_description || code,
            grandRemaining: currRemaining + prevRemaining, grandTotal: currTotal + prevTotal,
            currRemaining, currTotal, currAllocated, prevRemaining,
            period: current?.period_year ? `${current.period_year}${current.period_semester ? ` ${current.period_semester}` : ""}` : null,
          };
        });
        setLeaveCredits(grouped);
      } catch {
        setLeaveCredits([]);
      } finally {
        setLeaveLoading(false);
      }
    };
    fetchLeaveCredits();
  }, [employeeNumber]);

  const fetchNotifications = useCallback(async () => {
    if (!employeeNumber) return;
    const empNum = String(employeeNumber).trim();
    if (!empNum) return;
    try {
      const [notifRes, unreadRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/notifications/${empNum}`),
        axios.get(`${API_BASE_URL}/api/notifications/${empNum}/unread-count`),
      ]);
      const filteredNotifications = Array.isArray(notifRes.data)
        ? notifRes.data.filter((notif) => String(notif.employeeNumber).trim() === empNum)
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
              (ann) => ann.id === notif.announcement_id || ann.id === parseInt(notif.announcement_id)
            );
            if (announcement) detailsMap[notif.id] = announcement;
          });
          setAnnouncementDetails(detailsMap);
        } catch {}
      }
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [employeeNumber]);

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => { fetchNotificationsRef.current = fetchNotifications; }, [fetchNotifications]);
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !connected) return;
    const refreshTimeoutRef = { current: null };
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) return;
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        if (typeof fetchNotificationsRef.current === "function") fetchNotificationsRef.current();
      }, 250);
    };

    const handleAnnouncementChanged = (payload) => {
      const { action, announcement } = payload;
      if (action === "created") {
        setAnnouncements((prev) => {
          const exists = prev.some((a) => a.id === announcement.id);
          return exists ? prev : [announcement, ...prev];
        });
      } else if (action === "updated") {
        setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? announcement : a)));
      } else if (action === "deleted") {
        const deletedId = announcement?.id || announcement;
        setAnnouncements((prev) => prev.filter((a) => a.id !== deletedId));
      }
    };

    const handleAdminDashboardUpdated = (payload) => {
      const { source } = payload;
      if (source === "holiday" || source === "suspensions") {
        fetchHolidays();
        fetchSuspensions();
      }
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
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }

    const type = notification.notification_type;
    const link = notification.action_link || "";

    if (type === "payslip" || link.includes("payslip")) {
      setNotifModalOpen(false); navigate("/payslip");
    } else if (type === "contact" || link.includes("settings")) {
      setNotifModalOpen(false); navigate("/settings");
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
    } else if (link) {
      setNotifModalOpen(false); navigate(link);
    }
  };

  const getUserInfo = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      return { role: decoded.role, employeeNumber: decoded.employeeNumber, username: decoded.username };
    } catch { return {}; }
  };

  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.username) setUsername(userInfo.username);
    if (userInfo.employeeNumber) setEmployeeNumber(userInfo.employeeNumber);
  }, []);

  // ── Initial page load: fetch essentials, then reveal real UI ─────────────
  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([
        fetchAnnouncements(),
        fetchHolidays(),
        fetchSuspensions(),
      ]);
      // Small extra pause so the skeleton is always visible at least briefly
      setTimeout(() => setPageLoading(false), 400);
    };
    init();
  }, [fetchAnnouncements, fetchHolidays, fetchSuspensions]);

  const handleOpenModal = (announcement) => { setSelectedAnnouncement(announcement); setOpenModal(true); };
  const handleCloseModal = () => { setOpenModal(false); setSelectedAnnouncement(null); };
  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/personalinfo/person_table`);
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find((p) => String(p.agencyEmployeeNum) === String(employeeNumber));
        if (match && match.profile_picture) setProfilePicture(match.profile_picture);
        const fullNameFromPerson = `${match?.firstName || ""} ${match?.middleName || ""} ${match?.lastName || ""} ${match?.nameExtension || ""}`.trim();
        if (fullNameFromPerson) setFullName(fullNameFromPerson);
      } catch {}
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
          (p) => String(p.employeeNumber) === String(employeeNumber) || String(p.agencyEmployeeNum) === String(employeeNumber)
        );
        setPayrollData(userPayroll || null);
      } catch {}
    };
    fetchPayrollData();
  }, [employeeNumber]);

  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === "" || value === "0") return "₱0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "₱0.00";
    return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generateCalendar = () => {
    const days = [];
    const totalCells = 42;
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length < totalCells) days.push(null);
    return days;
  };

  const calendarDays = generateCalendar();

  const handleAddNote = () => {
    if (!selectedDate) return;
    setCurrentNote({ date: selectedDate, content: "" });
    setOpenNoteDialog(true);
  };

  const handleSaveNote = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/notes`, { employee_number: employeeNumber, date: currentNote.date, content: currentNote.content });
      const normalizedNote = { ...res.data, date: normalizeDate(res.data.date) };
      setNotes((prev) => [...prev, normalizedNote]);
      localStorage.setItem("employeeNotes", JSON.stringify([...notes, normalizedNote]));
    } catch {
      const newNote = { id: Date.now(), date: currentNote.date, content: currentNote.content, createdAt: new Date().toISOString() };
      const updated = [...notes, newNote];
      setNotes(updated);
      localStorage.setItem("employeeNotes", JSON.stringify(updated));
    }
    setOpenNoteDialog(false);
    setCurrentNote({ date: "", content: "" });
  };

  const handleDeleteNote = async (noteId) => {
    try { await axios.delete(`${API_BASE_URL}/api/notes/${noteId}`); } catch {}
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    localStorage.setItem("employeeNotes", JSON.stringify(updated));
  };

  const handleAddEvent = () => {
    if (!selectedDate) return;
    setCurrentEvent({ date: selectedDate, title: "", description: "" });
    setOpenEventDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/events`, { employee_number: employeeNumber, date: currentEvent.date, title: currentEvent.title, description: currentEvent.description });
      const normalizedEvent = { ...res.data, date: normalizeDate(res.data.date) };
      setEvents((prev) => [...prev, normalizedEvent]);
      localStorage.setItem("employeeEvents", JSON.stringify([...events, normalizedEvent]));
    } catch {
      const newEvent = { id: Date.now(), date: currentEvent.date, title: currentEvent.title, description: currentEvent.description, createdAt: new Date().toISOString() };
      const updated = [...events, newEvent];
      setEvents(updated);
      localStorage.setItem("employeeEvents", JSON.stringify(updated));
    }
    setOpenEventDialog(false);
    setCurrentEvent({ date: "", title: "", description: "" });
  };

  const handleDeleteEvent = async (eventId) => {
    try { await axios.delete(`${API_BASE_URL}/api/events/${eventId}`); } catch {}
    const updated = events.filter((e) => e.id !== eventId);
    setEvents(updated);
    localStorage.setItem("employeeEvents", JSON.stringify(updated));
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);

  const getLeaveStatusColor = (remaining, total) => {
    if (total === 0 || remaining === 0) return "#B71C1C";
    const pct = (remaining / total) * 100;
    if (pct > 50) return "#2E7D32";
    if (pct > 20) return "#EF6C00";
    return "#B71C1C";
  };

  // ── Show wireframe until initial data is ready ────────────────────────────
  if (pageLoading) {
    return (
      <Box sx={{ borderRadius: "1px", width: "100vw", maxWidth: "100%", position: "relative", left: "50%", transform: "translateX(-50%)", mt: -4 }}>
        <WireframeLoading settings={settings} />
      </Box>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box sx={{ borderRadius: "1px", width: "100vw", maxWidth: "100%", position: "relative", left: "50%", transform: "translateX(-50%)", mt: -4 }}>
        <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>

          {/* ── HEADER ── */}
          <Grow in timeout={300}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, background: settings.accentColor, backdropFilter: "blur(15px)", borderRadius: 4, p: 2, border: `1px solid ${settings.secondaryColor}`, flexShrink: 0 }}>
              <Box>
                <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>
                  Hello, <b>{fullName || username}!</b>
                </Typography>
                <Typography variant="body2" sx={{ color: settings.textPrimaryColor, mt: 0.25, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTime sx={{ fontSize: 14 }} />
                  {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <span style={{ marginLeft: "8px" }}>
                    {currentDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <IconButton size="small" sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }}
                  onClick={async () => {
                    if (employeeNumber) {
                      try {
                        const empNum = String(employeeNumber).trim();
                        const [notifRes, unreadRes] = await Promise.all([
                          axios.get(`${API_BASE_URL}/api/notifications/${empNum}`),
                          axios.get(`${API_BASE_URL}/api/notifications/${empNum}/unread-count`),
                        ]);
                        setNotifications(Array.isArray(notifRes.data) ? notifRes.data.filter((n) => String(n.employeeNumber).trim() === empNum) : []);
                        setUnreadCount(unreadRes.data?.count || 0);
                      } catch {}
                    }
                    setNotifModalOpen(true);
                  }}
                >
                  <Badge badgeContent={unreadCount} color="error" max={9}>
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
                <Box sx={{ position: "relative", "&::before": { content: '""', position: "absolute", inset: -2, borderRadius: "50%", padding: "2px", background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" } }}>
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar alt={username} src={profilePicture ? `${API_BASE_URL}${profilePicture}` : undefined} sx={{ width: 36, height: 36 }} />
                  </IconButton>
                </Box>
                <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{ sx: { borderRadius: 2, minWidth: 180, backgroundColor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33`, "& .MuiMenuItem-root": { fontSize: "0.875rem", color: settings.textPrimaryColor, "&:hover": { background: `${settings.primaryColor}0A` } } } }}>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}><AccountCircle sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Profile</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}><Settings sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Settings</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}><HelpOutline sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> FAQs</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}><PrivacyTip sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Privacy Policy</MenuItem>
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
                        <Box sx={{ position: "relative", height: "100%", flex: 1 }}>
                          <Box
                            component="img"
                            src={carouselItems[currentSlide]?.image ? `${API_BASE_URL}${carouselItems[currentSlide].image}` : "/api/placeholder/1200/600"}
                            alt={carouselItems[currentSlide]?.title || "Announcement"}
                            sx={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.7s ease", transform: "scale(1)" }}
                          />
                          <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)" }} />

                          <IconButton onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
                            sx={{ position: "absolute", left: { xs: 10, md: 24 }, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>
                            <ArrowBackIosNewIcon />
                          </IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
                            sx={{ position: "absolute", right: { xs: 10, md: 24 }, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>
                            <ArrowForwardIosIcon />
                          </IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                            sx={{ position: "absolute", top: { xs: 10, md: 24 }, right: { xs: 10, md: 24 }, bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>
                            {isPlaying ? <Pause /> : <PlayArrow />}
                          </IconButton>

                          <Box onClick={() => handleOpenModal(carouselItems[currentSlide])}
                            sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: { xs: 2, md: 4 }, color: "#ffffff", cursor: "pointer", transition: "transform 0.3s", "&:hover": { transform: "translateY(-4px)" }, zIndex: 10 }}>
                            <Chip
                              label={
                                carouselItems[currentSlide]?.id?.toString().startsWith("holiday-") ? "HOLIDAY"
                                : carouselItems[currentSlide]?.id?.toString().startsWith("suspension-") ? "SUSPENSION"
                                : "ANNOUNCEMENT"
                              }
                              size="small"
                              sx={{ mb: 2, bgcolor: `${settings.primaryColor}80`, backdropFilter: "blur(10px)", color: "#ffffff", fontWeight: 700, fontSize: "0.7rem", border: "1px solid rgba(254, 249, 225, 0.3)" }}
                            />
                            <Typography variant="h3" sx={{ color: "#ffffff", fontWeight: 800, mb: 1, textShadow: "0 4px 12px rgba(0,0,0,0.5)", lineHeight: 1.2, fontSize: { xs: "1.25rem", md: "2rem" } }}>
                              {carouselItems[currentSlide]?.title}
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: { xs: "0.75rem", md: "1rem" }, textShadow: "0 2px 8px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 1 }}>
                              <AccessTime sx={{ fontSize: 18 }} />
                              {new Date(carouselItems[currentSlide]?.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </Typography>
                          </Box>

                          <Box sx={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 1.5, alignItems: "center", zIndex: 10 }}>
                            {carouselItems.map((_, idx) => (
                              <Box key={idx}
                                sx={{ width: currentSlide === idx ? 32 : 10, height: 10, borderRadius: 5, bgcolor: currentSlide === idx ? "#ffffff" : "rgba(254,249,225,0.4)", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "pointer", border: "1px solid rgba(254,249,225,0.3)", "&:hover": { bgcolor: "rgba(254,249,225,0.7)", transform: "scale(1.2)" } }}
                                onClick={(e) => { e.stopPropagation(); handleSlideSelect(idx); }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Fade>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 2 }}>
                        <Flag sx={{ fontSize: 80, color: `${settings.primaryColor}4D` }} />
                        <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>
                          No announcements, suspensions, or holidays available
                        </Typography>
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
                                <Box sx={{ p: 0.5, textAlign: "center", borderRadius: 2, backgroundColor: `${settings.primaryColor}0A`, border: `1px solid ${settings.primaryColor}26`, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, transition: "all 0.3s", cursor: "pointer", "&:hover": { backgroundColor: settings.primaryColor, transform: "translateY(-2px)", boxShadow: `0 4px 12px ${settings.primaryColor}33`, "& .action-icon": { color: settings.textColor }, "& .action-label": { color: settings.textColor } } }}>
                                  <Box className="action-icon" sx={{ color: settings.primaryColor, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                                    {React.cloneElement(action.icon, { sx: { fontSize: 18 } })}
                                  </Box>
                                  <Typography className="action-label" sx={{ fontWeight: 600, color: settings.textPrimaryColor, fontSize: "0.6rem", lineHeight: 1.1 }}>{action.label}</Typography>
                                </Box>
                              </Link>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grow>

                  {/* Calendar */}
                  <Grow in timeout={600}>
                    <Card sx={{ background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, overflow: "hidden", flexShrink: 0 }}>
                      <CardContent sx={{ p: 1.25, pb: "10px !important", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.25 }}>
                            <ArrowBackIosNewIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                          </IconButton>
                          <Typography fontWeight={700} sx={{ color: settings.textPrimaryColor, fontSize: "0.8rem" }}>
                            {new Date(year, month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </Typography>
                          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.25 }}>
                            <ArrowForwardIosIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                        <Grid container spacing={0} sx={{ mb: 0.25 }}>
                          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                            <Grid item xs={12 / 7} key={i}>
                              <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.6rem", color: settings.textPrimaryColor, py: 0.25 }}>{day}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                        <Box sx={{ flex: "0 0 auto" }}>
                          <Grid container spacing={0.25}>
                            {calendarDays.map((day, index) => {
                              const currentDateStr = buildDateStr(year, month, day);
                              const holidayData = holidays.find((h) => h.date === currentDateStr && h.status === "Active");
                              const dayNotes = day ? getNotesForDate(currentDateStr) : [];
                              const dayEvents = day ? getEventsForDate(currentDateStr) : [];
                              const hasNotesOrEvents = dayNotes.length > 0 || dayEvents.length > 0;
                              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                              return (
                                <Grid item xs={12 / 7} key={index}>
                                  <Box
                                    onClick={() => { if (day) { setSelectedDate(currentDateStr); setViewNotesDialog(true); } }}
                                    sx={{ textAlign: "center", py: 0.2, fontSize: "0.75rem", borderRadius: 0.5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: holidayData ? "#d32f2f" : isToday ? settings.textColor : day ? settings.textPrimaryColor : "transparent", backgroundColor: isToday ? settings.secondaryColor : hasNotesOrEvents ? `${settings.primaryColor}0F` : "transparent", fontWeight: holidayData || isToday || hasNotesOrEvents ? 700 : 400, cursor: day ? "pointer" : "default", position: "relative", minHeight: 21, transition: "all 0.2s", "&:hover": day ? { backgroundColor: isToday ? settings.hoverColor : `${settings.primaryColor}1A`, transform: "scale(1.1)" } : {} }}>
                                    {day || ""}
                                    {hasNotesOrEvents && day && (
                                      <Box sx={{ display: "flex", gap: 0.15, position: "absolute", bottom: 2 }}>
                                        {dayNotes.length > 0 && <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#ff9800" }} />}
                                        {dayEvents.length > 0 && <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#4caf50" }} />}
                                      </Box>
                                    )}
                                  </Box>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, borderRadius: 1, backgroundColor: `${settings.primaryColor}0A`, p: 0.5, mt: -2 }}>
                          <Typography variant="caption" sx={{ color: settings.textPrimaryColor, fontWeight: 500, fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarMonth sx={{ fontSize: 13 }} /> Click day to add Notes &amp; Events
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Tooltip title="Legends">
                              <IconButton size="small" onClick={(e) => setCalendarLegendAnchorEl(e.currentTarget)} sx={{ color: settings.textPrimaryColor, p: 0.4 }}>
                                <MoreVert sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
                              <IconButton size="small" onClick={() => { setSelectedDate(normalizeDate(new Date())); handleAddNote(); }} sx={{ color: settings.textPrimaryColor, p: 0.4 }}>
                                <Note sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Add Event">
                              <IconButton size="small" onClick={() => { setSelectedDate(normalizeDate(new Date())); handleAddEvent(); }} sx={{ color: settings.textPrimaryColor, p: 0.4 }}>
                                <Event sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, minHeight: 0, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: 2 } }}>
                          {getRecentActivity().length > 0 ? (
                            getRecentActivity().map((item, idx) => (
                              <Box key={idx} sx={{ mb: 0.5, pl: 0.75, backgroundColor: item.type === "note" ? `${settings.primaryColor}1A` : "#e8f5e9", borderRadius: 1, borderLeft: `2px solid ${item.type === "note" ? settings.primaryColor : "#4caf50"}`, cursor: "pointer", transition: "all 0.2s", "&:hover": { transform: "translateX(2px)" } }} onClick={() => { setSelectedDate(item.date); setViewNotesDialog(true); }}>
                                <Typography variant="caption" sx={{ color: item.type === "note" ? settings.textPrimaryColor : "#2e7d32", fontWeight: 600, fontSize: "0.7rem" }}>
                                  {item.type === "note" ? "Note" : "Event"}: {item.title}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: "block", fontSize: "0.65rem", mt: 0.25 }}>
                                  {item.content && item.content.length > 35 ? `${item.content.substring(0, 35)}...` : item.content}
                                </Typography>
                              </Box>
                            ))
                          ) : (
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
                              {Array.from({ length: 12 }, (_, i) => (
                                <MenuItem key={i} value={i}>{new Date(2000, i).toLocaleString("en-US", { month: "short" })}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        <Grid container spacing={0.5}>
                          <Grid item xs={6}>
                            <Card elevation={0} sx={{ background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`, color: settings.textColor, borderRadius: 2, py: 1, textAlign: "center" }}>
                              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.65rem" }}>1st Half</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{payrollData ? formatCurrency(payrollData.pay1st) : "₱-.--"}</Typography>
                            </Card>
                          </Grid>
                          <Grid item xs={6}>
                            <Card elevation={0} sx={{ background: `linear-gradient(135deg, ${settings.secondaryColor} 0%, ${settings.primaryColor} 100%)`, color: settings.textColor, borderRadius: 2, py: 1, textAlign: "center" }}>
                              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.65rem" }}>2nd Half</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{payrollData ? formatCurrency(payrollData.pay2nd) : "₱-.--"}</Typography>
                            </Card>
                          </Grid>
                        </Grid>
                        <Link to="/payslip" style={{ textDecoration: "none" }}>
                          <Button fullWidth variant="text" size="small" sx={{ mt: 0.5, color: settings.textPrimaryColor, fontWeight: 600, fontSize: "0.7rem" }} endIcon={<ArrowForward sx={{ fontSize: 14 }} />}>
                            View Full
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </Grow>

                  {/* Leave Credits */}
                  <Grow in timeout={550} style={{ flex: 0.96, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, width: "100%", overflow: "hidden" }}>
                      <CardContent sx={{ p: 1, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexShrink: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarMonth sx={{ color: settings.textPrimaryColor, fontSize: 16 }} />
                            <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.8rem" }}>My Leave Credits</Typography>
                          </Box>
                          {!leaveLoading && leaveCredits.length > 0 && (
                            <Chip label={`${(leaveCredits.reduce((s, g) => s + g.currRemaining + g.prevRemaining, 0)).toFixed(1)} Days`} size="small" sx={{ bgcolor: settings.primaryColor, color: settings.textColor, fontWeight: 700, fontSize: "0.6rem" }} />
                          )}
                        </Box>
                        {leaveLoading ? (
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1.5 }}>
                            <CircularProgress size={18} sx={{ color: settings.primaryColor }} />
                            <Typography variant="body2" sx={{ color: settings.textPrimaryColor, fontSize: "0.75rem" }}>Loading...</Typography>
                          </Box>
                        ) : leaveCredits.length === 0 ? (
                          <Typography variant="caption" sx={{ color: settings.textPrimaryColor, opacity: 0.5, textAlign: "center", fontSize: "0.7rem" }}>No leave credits</Typography>
                        ) : (
                          <Grid container spacing={0.5}>
                            {leaveCredits.map((leave, idx) => {
                              const pct = leave.currTotal > 0 ? (leave.currRemaining / leave.currTotal) * 100 : 0;
                              const statusColor = getLeaveStatusColor(leave.currRemaining, leave.currTotal);
                              const usedDays = leave.currAllocated - leave.currRemaining;
                              return (
                                <Grid item xs={12} key={idx}>
                                  <Card sx={{ height: "100%", overflow: "hidden", borderRadius: 1.5, border: `1px solid ${settings.primaryColor}20`, boxShadow: "none", background: "transparent" }}>
                                    <Box sx={{ p: 0.75 }}>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.7rem" }}>{leave.name}</Typography>
                                        <Chip label={leave.code} size="small" sx={{ height: 16, fontSize: "0.55rem", bgcolor: `${statusColor}15`, color: statusColor }} />
                                      </Box>
                                      <Box sx={{ mb: 0.25 }}>
                                        <Typography variant="h6" sx={{ color: statusColor, fontWeight: 700, lineHeight: 1 }}>{leave.currRemaining.toFixed(1)}</Typography>
                                        <Typography variant="caption" sx={{ color: settings.textPrimaryColor, opacity: 0.6, fontSize: "0.6rem" }}>days left</Typography>
                                      </Box>
                                      <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ height: 2.5, borderRadius: 2, bgcolor: `${statusColor}20`, ".MuiLinearProgress-bar": { bgcolor: statusColor } }} />
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                                        <Typography variant="caption" sx={{ color: settings.textPrimaryColor, opacity: 0.5, fontSize: "0.55rem" }}>Used: {usedDays < 0 ? 0 : usedDays.toFixed(1)}</Typography>
                                        <Typography variant="caption" sx={{ color: settings.textPrimaryColor, opacity: 0.5, fontSize: "0.55rem" }}>Tot: {leave.currAllocated.toFixed(1)}</Typography>
                                      </Box>
                                      {leave.prevRemaining > 0 && (
                                        <Box sx={{ mt: 0.5, p: 0.25, borderRadius: 0.5, bgcolor: "#FFF3E0", border: "1px dashed #FFB74D", display: "flex", alignItems: "center", gap: 0.5 }}>
                                          <Add sx={{ fontSize: 10, color: "#EF6C00" }} />
                                          <Typography variant="caption" sx={{ color: "#E65100", fontWeight: 700, fontSize: "0.55rem" }}>+{leave.prevRemaining.toFixed(1)} Carried</Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        )}
                      </CardContent>
                    </Card>
                  </Grow>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* ── ANNOUNCEMENT DETAIL MODAL ── */}
          <Modal open={openModal} onClose={handleCloseModal}>
            <Fade in={openModal}>
              <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", sm: "80%", md: "800px" }, maxHeight: "90vh", overflowY: "auto", bgcolor: settings.accentColor, backdropFilter: "blur(40px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}4D`, borderRadius: 4, overflow: "hidden" }}>
                {selectedAnnouncement && (
                  <>
                    <Box sx={{ position: "relative" }}>
                      {selectedAnnouncement.image && (
                        <Box component="img" src={`${API_BASE_URL}${selectedAnnouncement.image}`} alt={selectedAnnouncement.title} sx={{ width: "100%", height: 350, objectFit: "cover" }} />
                      )}
                      <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)" }} />
                      <IconButton onClick={handleCloseModal} sx={{ position: "absolute", top: 20, right: 20, bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, color: "#ffffff", "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "rotate(90deg)" }, transition: "all 0.3s" }}>
                        <Close />
                      </IconButton>
                    </Box>
                    <Box sx={{ p: 4, overflowY: "auto" }}>
                      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: settings.textPrimaryColor }}>{selectedAnnouncement.title}</Typography>
                      <Chip icon={<AccessTime sx={{ color: settings.textPrimaryColor }} />} label={new Date(selectedAnnouncement.date).toLocaleDateString()} sx={{ mb: 3, bgcolor: `${settings.primaryColor}1A`, color: settings.textPrimaryColor, border: `1px solid ${settings.primaryColor}26` }} />
                      <Typography variant="body1" sx={{ color: settings.textPrimaryColor, lineHeight: 1.8, fontSize: "1.05rem" }}>{selectedAnnouncement.about}</Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>

          {/* ── NOTIFICATIONS MODAL ── */}
          <Modal open={notifModalOpen} onClose={() => setNotifModalOpen(false)}>
            <Fade in={notifModalOpen}>
              <Box sx={{ position: "absolute", top: { xs: "50%", md: "80px" }, right: { xs: "50%", md: "20px" }, transform: { xs: "translate(50%, -50%)", md: "none" }, width: { xs: "90%", sm: "400px" }, maxHeight: "80vh", overflowY: "auto", bgcolor: settings.accentColor, backdropFilter: "blur(40px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}4D`, borderRadius: 4, overflow: "hidden" }}>
                <Box sx={{ p: 3, borderBottom: `1px solid ${settings.primaryColor}26`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(135deg, ${settings.primaryColor}1A 0%, ${settings.secondaryColor}0D 100%)` }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: settings.textPrimaryColor }}>Notifications</Typography>
                  <IconButton size="small" onClick={() => setNotifModalOpen(false)} sx={{ color: settings.textPrimaryColor, "&:hover": { backgroundColor: `${settings.primaryColor}1A`, transform: "rotate(90deg)" }, transition: "all 0.3s" }}>
                    <Close />
                  </IconButton>
                </Box>
                <Box sx={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto", p: 2 }}>
                  {Array.isArray(notifications) && notifications.length > 0 ? (
                    notifications.slice(0, 10).map((notif, idx) => {
                      const announcement = notif.notification_type === "announcement" ? announcementDetails[notif.id] : null;
                      if (notif.notification_type === "announcement" && announcement) {
                        return (
                          <Grow in timeout={300 + idx * 50} key={`notif-${notif.id}`}>
                            <Box sx={{ mb: 2, borderRadius: 3, overflow: "hidden", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: `0 2px 8px ${settings.primaryColor}33`, opacity: notif.read_status === 1 ? 0.7 : 1, position: "relative", height: 200, "&:hover": { transform: "translateY(-4px)", boxShadow: `0 8px 24px ${settings.primaryColor}4D`, opacity: 1 } }} onClick={() => handleNotificationClick(notif)}>
                              <Box component="img" src={announcement.image ? `${API_BASE_URL}${announcement.image}` : "/api/placeholder/400/200"} alt={announcement.title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)", p: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                  <Flag sx={{ color: "#ff69b4", fontSize: 18 }} />
                                  <Typography fontSize="0.75rem" sx={{ color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>New Announcement</Typography>
                                </Box>
                                <Typography fontWeight={700} fontSize="1.1rem" sx={{ color: "#fff", mb: 0.5, lineHeight: 1.3, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{announcement.title}</Typography>
                                <Typography fontSize="0.75rem" sx={{ color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <AccessTime sx={{ fontSize: 12 }} />
                                  {notif.created_at ? new Date(notif.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                                </Typography>
                              </Box>
                            </Box>
                          </Grow>
                        );
                      }
                      return (
                        <Grow in timeout={300 + idx * 50} key={`notif-${notif.id}`}>
                          <Box sx={{ mb: 2, p: 2.5, borderRadius: 3, background: notif.read_status === 0 ? notif.notification_type === "payslip" ? "rgba(76,175,80,0.1)" : notif.notification_type === "contact" ? "rgba(255,152,0,0.1)" : notif.notification_type === "holiday" ? "rgba(237,108,2,0.1)" : notif.notification_type === "suspension" ? "rgba(211,47,47,0.1)" : `${settings.primaryColor}1A` : `${settings.primaryColor}0A`, border: `1px solid ${settings.primaryColor}26`, borderLeft: notif.read_status === 0 ? notif.notification_type === "payslip" ? "4px solid #4caf50" : notif.notification_type === "contact" ? "4px solid #ff9800" : notif.notification_type === "holiday" ? "4px solid #ed6c02" : notif.notification_type === "suspension" ? "4px solid #d32f2f" : `4px solid ${settings.primaryColor}` : `1px solid ${settings.primaryColor}26`, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", "&:hover": { background: `${settings.primaryColor}1A`, transform: "translateX(8px)", boxShadow: `0 8px 24px ${settings.primaryColor}33` } }} onClick={() => handleNotificationClick(notif)}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: "50%", background: notif.notification_type === "payslip" ? "linear-gradient(135deg,#4caf50,#2e7d32)" : notif.notification_type === "contact" ? "linear-gradient(135deg,#ff9800,#f57c00)" : notif.notification_type === "holiday" ? "linear-gradient(135deg,#ed6c02,#e65100)" : notif.notification_type === "suspension" ? "linear-gradient(135deg,#d32f2f,#b71c1c)" : `linear-gradient(135deg,${settings.primaryColor},${settings.secondaryColor})`, mt: 0.5, flexShrink: 0, boxShadow: `0 0 12px ${settings.primaryColor}99`, opacity: notif.read_status === 0 ? 1 : 0.5 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: settings.textPrimaryColor, mb: 0.5, lineHeight: 1.4 }}>
                                  {notif.notification_type === "payslip" ? "Payslip Available" : notif.notification_type === "contact" ? "New Ticket" : notif.notification_type === "holiday" ? "New Holiday" : notif.notification_type === "suspension" ? "New Suspension" : "Notification"}
                                </Typography>
                                <Typography sx={{ fontSize: "0.85rem", color: settings.textPrimaryColor, mb: 0.5 }}>{notif.description}</Typography>
                                <Typography sx={{ fontSize: "0.8rem", color: settings.textPrimaryColor, display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <AccessTime sx={{ fontSize: 14 }} />
                                  {notif.created_at ? new Date(notif.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                                </Typography>
                              </Box>
                              <ArrowForward sx={{ color: settings.textPrimaryColor, fontSize: 20, transition: "transform 0.3s", mt: 0.5, flexShrink: 0 }} />
                            </Box>
                          </Box>
                        </Grow>
                      );
                    })
                  ) : (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <NotificationsIcon sx={{ fontSize: 80, color: `${settings.primaryColor}33` }} />
                      <Typography sx={{ color: settings.textPrimaryColor, fontSize: "1rem" }}>No notifications at the moment</Typography>
                      <Typography sx={{ color: settings.textPrimaryColor, fontSize: "0.85rem", mt: 1 }}>You're all caught up!</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Fade>
          </Modal>

          {/* ── CALENDAR LEGENDS MENU ── */}
          <Menu anchorEl={calendarLegendAnchorEl} open={openCalendarLegend} onClose={() => setCalendarLegendAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} PaperProps={{ sx: { borderRadius: 2, minWidth: 180, backgroundColor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1 }}>Legends</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[["#ff9800", "Notes"], ["#4caf50", "Events"], ["#d32f2f", "Holidays"], [settings.secondaryColor, "Today"]].map(([color, label]) => (
                  <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
                    <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Menu>

          {/* ── VIEW NOTES/EVENTS DIALOG ── */}
          <Dialog open={viewNotesDialog} onClose={() => setViewNotesDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, backdropFilter: "blur(12px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}>
            <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>
              {selectedDate && (() => { const [y, m, d] = selectedDate.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); })()}
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1, display: "flex", alignItems: "center" }}><Note sx={{ mr: 1 }} /> Notes</Typography>
              {getNotesForDate(selectedDate).length > 0 ? getNotesForDate(selectedDate).map((note) => (
                <Box key={note.id} sx={{ mb: 2, p: 2, backgroundColor: `${settings.primaryColor}1A`, borderRadius: 2 }}>
                  <Typography variant="body2">{note.content}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <IconButton size="small" onClick={() => handleDeleteNote(note.id)} sx={{ color: "#d32f2f" }}><Delete fontSize="small" /></IconButton>
                  </Box>
                </Box>
              )) : <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>No notes for this date</Typography>}

              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1, mt: 3, display: "flex", alignItems: "center" }}><Event sx={{ mr: 1 }} /> Events</Typography>
              {getEventsForDate(selectedDate).length > 0 ? getEventsForDate(selectedDate).map((event) => (
                <Box key={event.id} sx={{ mb: 2, p: 2, backgroundColor: "#e8f5e9", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{event.title}</Typography>
                  <Typography variant="body2">{event.description}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <IconButton size="small" onClick={() => handleDeleteEvent(event.id)} sx={{ color: "#d32f2f" }}><Delete fontSize="small" /></IconButton>
                  </Box>
                </Box>
              )) : <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>No events for this date</Typography>}

              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: settings.textPrimaryColor, mb: 1, mt: 3, display: "flex", alignItems: "center" }}><Flag sx={{ mr: 1 }} /> Announcements</Typography>
              {(() => {
                const dateAnnouncements = announcements.filter((a) => normalizeDate(a.date) === selectedDate);
                return dateAnnouncements.length > 0 ? dateAnnouncements.map((announcement) => (
                  <Box key={announcement.id} sx={{ mb: 2, p: 2, backgroundColor: "#e3f2fd", borderRadius: 2, cursor: "pointer", transition: "all 0.3s", "&:hover": { backgroundColor: "#bbdefb", transform: "translateX(4px)" } }} onClick={() => { setViewNotesDialog(false); handleOpenModal(announcement); }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{announcement.title}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{announcement.about && announcement.about.length > 100 ? `${announcement.about.substring(0, 100)}...` : announcement.about}</Typography>
                  </Box>
                )) : <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>No announcements for this date</Typography>;
              })()}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => { setViewNotesDialog(false); handleAddNote(); }} startIcon={<Note />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: settings.textColor, bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor } }}>Add Note</Button>
              <Button onClick={() => { setViewNotesDialog(false); handleAddEvent(); }} startIcon={<Add />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: settings.textColor, bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor } }}>Add Event</Button>
              <Button onClick={() => setViewNotesDialog(false)} variant="contained" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: settings.textColor, bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor } }}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* ── ADD NOTE DIALOG ── */}
          <Dialog open={openNoteDialog} onClose={() => setOpenNoteDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, backdropFilter: "blur(12px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}>
            <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>Add Note</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <TextField fullWidth multiline rows={4} label="Note Content" value={currentNote.content} onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              <Typography variant="caption" color="textSecondary">
                Date: {currentNote.date && (() => { const [y, m, d] = currentNote.date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(); })()}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenNoteDialog(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: settings.textPrimaryColor, borderColor: `${settings.primaryColor}40` }}>Cancel</Button>
              <Button onClick={handleSaveNote} variant="contained" startIcon={<Save />} disabled={!currentNote.content} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor } }}>Save Note</Button>
            </DialogActions>
          </Dialog>

          {/* ── ADD EVENT DIALOG ── */}
          <Dialog open={openEventDialog} onClose={() => setOpenEventDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, backdropFilter: "blur(12px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}>
            <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>Add Event</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <TextField fullWidth label="Event Title" value={currentEvent.title} onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              <TextField fullWidth multiline rows={3} label="Event Description" value={currentEvent.description} onChange={(e) => setCurrentEvent({ ...currentEvent, description: e.target.value })} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              <Typography variant="caption" color="textSecondary">
                Date: {currentEvent.date && (() => { const [y, m, d] = currentEvent.date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(); })()}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenEventDialog(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: settings.textPrimaryColor, borderColor: `${settings.primaryColor}40` }}>Cancel</Button>
              <Button onClick={handleSaveEvent} variant="contained" startIcon={<Save />} disabled={!currentEvent.title} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, bgcolor: settings.primaryColor, "&:hover": { bgcolor: settings.hoverColor } }}>Save Event</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Fade>
  );
};

export default Home;