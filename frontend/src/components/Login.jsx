import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  TextField,
  Button,
  Container,
  Link,
  Box,
  Paper,
  Typography,
  Modal,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  BadgeOutlined,
  LockOutlined,
  LoginOutlined,
  CheckCircleOutline,
  ErrorOutline,
  VerifiedUserOutlined,
  Visibility,
  VisibilityOff,
  KeyboardArrowDown,
  Announcement as AnnouncementIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Campaign as CampaignIcon,
  Pause,
  AccessTime as AccessTimeIcon,
  Close as CloseIcon,
  Event as EventIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../components/LoadingOverlay";
import logo from "../assets/logo.PNG";
import bg from "../assets/EaristBG.PNG";

// ─── Expiry helpers ───────────────────────────────────────────────────────────
// For HOLIDAYS: true only if today falls within [date_start, date_end].
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

// For ANNOUNCEMENTS / SUSPENSIONS: show unless date_end is explicitly set and already past.
const isNotExpired = (date_end) => {
  if (!date_end) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const e = new Date(date_end);
  e.setHours(0, 0, 0, 0);
  return today <= e;
};

// ─── Build combined carousel items ───────────────────────────────────────────
const buildCarouselItems = (announcements = [], suspensions = [], rawHolidays = []) => {
  const holidayItems = rawHolidays
    .filter((h) => (h.status || "").toLowerCase() === "active")
    .filter((h) => isHolidayActive(h.date_start || h.date, h.date_end || h.date, h.date))
    .map((h) => ({
      id: `holiday-${h.id}`,
      type: "HOLIDAY",
      title: h.title || h.description || "",
      about: h.about || "Official holiday.",
      date: h.date_start || h.date_end || h.date,
      date_start: h.date_start || h.date,
      date_end: h.date_end || h.date,
      image: h.image || null,
    }));

  const suspensionItems = suspensions
    .filter((s) => isNotExpired(s.date_end))
    .map((s) => ({
      id: `suspension-${s.id}`,
      type: "SUSPENSION",
      title: s.title || "",
      about: s.about || "",
      date: s.date_start || s.date_end || s.date,
      date_start: s.date_start || s.date,
      date_end: s.date_end || s.date,
      image: s.image || null,
    }));

  const announcementItems = announcements
    .filter((a) => isNotExpired(a.date_end))
    .map((a) => ({
      ...a,
      type: "ANNOUNCEMENT",
      date: a.date_start || a.date_end || a.date,
      date_start: a.date_start || a.date,
      date_end: a.date_end || a.date,
    }));

  return [...holidayItems, ...suspensionItems, ...announcementItems].sort(
    (a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date)
  );
};

const getTypeLabel = (type) => {
  if (type === "HOLIDAY") return "Holiday";
  if (type === "SUSPENSION") return "Suspension";
  return "Announcement";
};

const Login = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [resolvedEmployeeNumber, setResolvedEmployeeNumber] = useState("");
  const [formData, setFormData] = useState({ password: "" });
  const [errMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pin, setPin] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [success, setSuccess] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [codeTimer, setCodeTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // ── Carousel data ──────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [showLaterModal, setShowLaterModal] = useState(false);
  const [dashWarning, setDashWarning] = useState("");
  const [dontRemindToday, setDontRemindToday] = useState(false);

  // Login attempt tracking
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLoginLocked, setIsLoginLocked] = useState(false);
  const [loginLockTimer, setLoginLockTimer] = useState(0);

  const primaryGradient = "linear-gradient(135deg, #800020, #A52A2A)";
  const primaryHoverGradient = "linear-gradient(135deg, #A52A2A, #800020)";
  const lightText = "#FFF8E7";
  const darkText = "#4B0000";
  const mediumText = "#800020";
  const placeholderGray = "rgba(0, 0, 0, 0.45)";

  // ── Combined carousel items (Announcements + Holidays + Suspensions) ───────
  const carouselItems = useMemo(
    () => buildCarouselItems(announcements, suspensions, rawHolidays),
    [announcements, suspensions, rawHolidays]
  );

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // ── Dismiss intro slide on Space or Enter key ──────────────────────────────
  useEffect(() => {
    if (!showIntro) return;
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        const introEl = document.getElementById("introSlide");
        if (introEl) introEl.style.transform = "translateY(-100%)";
        setTimeout(() => setShowIntro(false), 800);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showIntro]);

  const employeeNumberForRequests = useMemo(
    () => resolvedEmployeeNumber || employeeNumber,
    [resolvedEmployeeNumber, employeeNumber]
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for existing login lock on mount
  useEffect(() => {
    const lockData = localStorage.getItem("loginLockData");
    if (lockData) {
      const { lockUntil } = JSON.parse(lockData);
      const now = Date.now();
      if (lockUntil > now) {
        setIsLoginLocked(true);
        setLoginLockTimer(Math.ceil((lockUntil - now) / 1000));
      } else {
        localStorage.removeItem("loginLockData");
      }
    }

    const reminderData = localStorage.getItem("passwordReminderSkipped");
    if (reminderData) {
      try {
        const { date } = JSON.parse(reminderData);
        const today = new Date().toDateString();
        if (date !== today) {
          localStorage.removeItem("passwordReminderSkipped");
          sessionStorage.removeItem("passwordReminderSkipped");
        }
      } catch {
        localStorage.removeItem("passwordReminderSkipped");
        sessionStorage.removeItem("passwordReminderSkipped");
      }
    }
  }, []);

  // ── Fetch Announcements, Holidays, and Suspensions ────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [annRes, holidayRes, suspRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/announcements`).then((r) => r.json()),
          fetch(`${API_BASE_URL}/holiday`).then((r) => r.json()),
          fetch(`${API_BASE_URL}/api/suspensions`).then((r) => r.json()),
        ]);

        if (annRes.status === "fulfilled" && Array.isArray(annRes.value)) {
          setAnnouncements(annRes.value);
        }
        if (holidayRes.status === "fulfilled" && Array.isArray(holidayRes.value)) {
          setRawHolidays(holidayRes.value);
        }
        if (suspRes.status === "fulfilled" && Array.isArray(suspRes.value)) {
          setSuspensions(suspRes.value);
        }
      } catch (error) {
        console.error("Error fetching carousel data:", error);
      }
    };

    fetchAll();

    // Poll every 60 seconds so new items / expirations reflect without page refresh
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Slideshow auto-play
  useEffect(() => {
    if (carouselItems.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselItems.length]);

  // 2FA Lock timer
  useEffect(() => {
    let interval;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            setTwoFactorError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  // Login lock timer
  useEffect(() => {
    let interval;
    if (isLoginLocked && loginLockTimer > 0) {
      interval = setInterval(() => {
        setLoginLockTimer((prev) => {
          if (prev <= 1) {
            setIsLoginLocked(false);
            setLoginAttempts(0);
            localStorage.removeItem("loginLockData");
            setErrorMessage("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoginLocked, loginLockTimer]);

  // Code timer
  useEffect(() => {
    let interval;
    if (codeTimer > 0) interval = setInterval(() => setCodeTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [codeTimer]);

  // Auto-hide login error after 3 seconds
  useEffect(() => {
    if (errMessage && !isLoginLocked) {
      const timer = setTimeout(() => setErrorMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [errMessage, isLoginLocked]);

  useEffect(() => {
    if (twoFactorError) {
      const timer = setTimeout(() => setTwoFactorError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [twoFactorError]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (dashWarning) {
      const timer = setTimeout(() => setDashWarning(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [dashWarning]);

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeNumberChange = (e) => {
    const raw = e.target.value ?? "";
    if (raw.includes("-")) {
      setDashWarning("Hyphens (dashes) are not allowed in the employee number.");
    } else {
      setDashWarning("");
    }
    const allowed = String(raw).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    setEmployeeNumber(allowed);
    setResolvedEmployeeNumber("");
  };

  const send2FACode = async (email, empNumber) => {
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/send-2fa-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, employeeNumber: empNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Verification code sent to your email.");
        setCodeTimer(2 * 60);
        setAttempts(0);
        setIsLocked(false);
        setTwoFactorError("");
      } else {
        setTwoFactorError(data.error || "Failed to send code.");
      }
    } catch {
      setTwoFactorError("Failed to send verification code.");
    } finally {
      setResendLoading(false);
    }
  };

  const shouldSkipPasswordReminder = (employeeNumber) => {
    let reminderData = localStorage.getItem("passwordReminderSkipped");
    if (!reminderData) {
      reminderData = sessionStorage.getItem("passwordReminderSkipped");
      if (reminderData) localStorage.setItem("passwordReminderSkipped", reminderData);
    }
    if (!reminderData) return false;
    try {
      const { date, employeeNumber: skippedEmpNum } = JSON.parse(reminderData);
      const today = new Date().toDateString();
      const normalizedCurrent = String(employeeNumber).trim().toUpperCase();
      const normalizedSkipped = String(skippedEmpNum).trim().toUpperCase();
      const shouldSkip = date === today && normalizedSkipped === normalizedCurrent;
      if (date !== today) {
        localStorage.removeItem("passwordReminderSkipped");
        sessionStorage.removeItem("passwordReminderSkipped");
      }
      return shouldSkip;
    } catch {
      localStorage.removeItem("passwordReminderSkipped");
      sessionStorage.removeItem("passwordReminderSkipped");
      return false;
    }
  };

  const navigateToDashboard = (role) => {
    if (role === "superadmin" || role === "administrator" || role === "technical") {
      window.location.href = "/admin-home";
    } else {
      window.location.href = "/home";
    }
  };

  const handlePostLoginFlow = (loginData) => {
    localStorage.setItem("token", loginData.token);
    const decoded = JSON.parse(atob(loginData.token.split(".")[1]));
    localStorage.setItem("employeeNumber", decoded.employeeNumber || "");
    localStorage.setItem("role", decoded.role || "");

    if (loginData.isDefaultPassword) {
      if (shouldSkipPasswordReminder(decoded.employeeNumber)) {
        navigateToDashboard(decoded.role);
      } else {
        setIsDefaultPassword(true);
        setShowPasswordPrompt(true);
        setShow2FA(false);
      }
    } else {
      navigateToDashboard(decoded.role);
    }
  };

  const verify2FACode = async () => {
    if (!pin.trim()) { setTwoFactorError("Please enter the verification code"); return; }
    if (isLocked) { setTwoFactorError(`Too many failed attempts. Wait ${formatTime(lockTimer)}.`); return; }

    setTwoFactorLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/verify-2fa-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, code: pin }),
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        const loginRes = await fetch(`${API_BASE_URL}/complete-2fa-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, employeeNumber: employeeNumberForRequests }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          handlePostLoginFlow(loginData);
        } else {
          setTwoFactorError(loginData.error || "Login completion failed.");
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(60);
          setTwoFactorError("Too many failed attempts. Locked for 1 min.");
        } else {
          setTwoFactorError(data.error || "Invalid verification code. Try again.");
        }
      }
    } catch {
      setTwoFactorError("Verification failed. Please try again.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isLoginLocked) {
      setErrorMessage(`Too many failed login attempts. Please wait ${formatTime(loginLockTimer)} before trying again.`);
      return;
    }
    if (!employeeNumber.trim() || !formData.password) {
      setErrorMessage("Please fill all credentials");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const payload = { employeeNumber, password: formData.password };
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        setLoginAttempts(0);
        localStorage.removeItem("loginLockData");

        const canonicalEmp = data.employeeNumber || employeeNumber;
        setResolvedEmployeeNumber(canonicalEmp);
        setUserEmail(data.email);

        try {
          let globalMfaEnabled = false;
          try {
            const globalMfaResponse = await fetch(`${API_BASE_URL}/api/system-settings/global_mfa_enabled`);
            if (globalMfaResponse.ok) {
              const globalMfaData = await globalMfaResponse.json();
              globalMfaEnabled = globalMfaData.setting_value === "true" || globalMfaData.setting_value === true;
            }
          } catch {}

          if (!globalMfaEnabled) {
            const loginRes = await fetch(`${API_BASE_URL}/complete-2fa-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.email, employeeNumber: canonicalEmp }),
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
              handlePostLoginFlow(loginData);
            } else {
              setErrorMessage(loginData.error || "Login completion failed.");
            }
          } else {
            const prefResponse = await fetch(`${API_BASE_URL}/api/user-preferences/${canonicalEmp}`);
            let mfaEnabled = true;
            if (prefResponse.ok) {
              const prefData = await prefResponse.json();
              mfaEnabled = !(prefData.enable_mfa === 0 || prefData.enable_mfa === false);
            }

            if (mfaEnabled) {
              await send2FACode(data.email, canonicalEmp);
              setShow2FA(true);
            } else {
              const loginRes = await fetch(`${API_BASE_URL}/complete-2fa-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: data.email, employeeNumber: canonicalEmp }),
              });
              const loginData = await loginRes.json();
              if (loginRes.ok) {
                handlePostLoginFlow(loginData);
              } else {
                setErrorMessage(loginData.error || "Login completion failed.");
              }
            }
          }
        } catch {
          await send2FACode(data.email, canonicalEmp);
          setShow2FA(true);
        }
      } else {
        const newLoginAttempts = loginAttempts + 1;
        setLoginAttempts(newLoginAttempts);

        if (newLoginAttempts >= 3) {
          setIsLoginLocked(true);
          setLoginLockTimer(5 * 60);
          const lockUntil = Date.now() + 5 * 60 * 1000;
          localStorage.setItem("loginLockData", JSON.stringify({ lockUntil }));
          setErrorMessage("Too many failed login attempts. Your account is locked for 5 minutes.");
        } else {
          const remaining = 3 - newLoginAttempts;
          setErrorMessage(
            `${data.error || data.message || "Invalid credentials"}. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
          );
        }
      }
    } catch {
      setErrorMessage("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const blobPositions = React.useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        size: 60 + i * 20,
        top: Math.random() * 70,
        left: Math.random() * 70,
        delay: i * 0.3,
        duration: 1 + i * 2,
      })),
    []
  );

  const blobs = blobPositions.map((blob, i) => (
    <Box
      key={i}
      sx={{
        position: "absolute",
        width: blob.size,
        height: blob.size,
        borderRadius: "50%",
        background: primaryGradient,
        opacity: 0.15 + i * 0.1,
        top: `${blob.top}%`,
        left: `${blob.left}%`,
        animation: `float${i} ${blob.duration}s ease-in-out ${blob.delay}s infinite`,
        [`@keyframes float${i}`]: {
          "0%,100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(15px, -10px) rotate(20deg)" },
        },
      }}
    />
  ));

  return (
    <>
      <Box
        sx={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundImage: `url(${bg})`, backgroundSize: "cover",
          backgroundPosition: "center", backgroundRepeat: "no-repeat",
          animation: "zoomPulse 20s ease-in-out infinite",
          "@keyframes zoomPulse": {
            "0%, 100%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.05)" },
          },
        }}
      />
      <Box
        sx={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          animation: "subtlePulse 8s ease-in-out infinite",
          "@keyframes subtlePulse": {
            "0%, 100%": { opacity: 0.75 },
            "50%": { opacity: 0.7 },
          },
        }}
      />

      <Box sx={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden", zIndex: 10 }}>
        <LoadingOverlay open={loading} message="Please wait..." />

        <Box sx={{ height: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>

          {/* ── LEFT SIDE — Combined Carousel (Announcements + Holidays + Suspensions) ── */}
          <Box sx={{ width: "100%", maxWidth: 800, mx: "auto", py: 2, overflow: "hidden", position: "relative" }}>
            {carouselItems.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  width: "max-content",
                  animation: `slide ${Math.max(carouselItems.length * 5, 15)}s linear infinite`,
                  "&:hover": { animationPlayState: "paused" },
                }}
              >
                {/* Duplicate for seamless looping */}
                {[...carouselItems, ...carouselItems].map((item, idx) => (
                  <Box
                    key={`${item.id}-${idx}`}
                    sx={{
                      flex: "0 0 650px",
                      borderRadius: 3,
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                      transition: "transform 0.3s, box-shadow 0.3s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={item.image ? `${API_BASE_URL}${item.image}` : "/api/placeholder/350/300"}
                      alt={item.title || item.type}
                      sx={{
                        width: "100%",
                        height: 560,
                        objectFit: "cover",
                        borderRadius: 2,
                        filter: "brightness(0.65)",
                        transition: "transform 0.3s, filter 0.3s",
                        "&:hover": { filter: "brightness(0.55)" },
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        width: "100%",
                        bgcolor: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        p: 2,
                        textAlign: "left",
                      }}
                    >
                      {/* Type badge */}
                      <Box sx={{ mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={getTypeLabel(item.type)}
                          icon={
                            item.type === "HOLIDAY" ? (
                              <EventIcon sx={{ fontSize: "14px !important", color: "#fff !important" }} />
                            ) : item.type === "SUSPENSION" ? (
                              <BlockIcon sx={{ fontSize: "14px !important", color: "#fff !important" }} />
                            ) : (
                              <AnnouncementIcon sx={{ fontSize: "14px !important", color: "#fff !important" }} />
                            )
                          }
                          sx={{
                            bgcolor:
                              item.type === "HOLIDAY"
                                ? "rgba(237,108,2,0.8)"
                                : item.type === "SUSPENSION"
                                ? "rgba(211,47,47,0.8)"
                                : "rgba(128,0,32,0.8)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.65rem",
                            height: 22,
                            backdropFilter: "blur(4px)",
                            "& .MuiChip-icon": { color: "#fff" },
                          }}
                        />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85 }}>
                        {item.date ? new Date(item.date).toDateString() : ""}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.5)", textAlign: "center", py: 4 }}>
                No announcements, holidays, or suspensions available
              </Typography>
            )}
            <style>{`
              @keyframes slide {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
          </Box>

          {/* ── RIGHT SIDE — Login Form ── */}
          <Container maxWidth="sm" sx={{ position: "relative" }}>
            <Paper
              elevation={24}
              sx={{
                padding: { xs: 3, md: 3 },
                borderRadius: 4,
                textAlign: "center",
                background: "rgba(255,248,231,0.85)",
                backdropFilter: "blur(15px)",
                boxShadow: "0 15px 40px rgba(128,0,32,0.2)",
                border: "1px solid rgba(128,0,32,0.15)",
                transition: "transform 0.6s ease, box-shadow 0.6s ease",
                "&:hover": {
                  transform: "scale(1.03)",
                  boxShadow: "0 25px 50px rgba(128,0,32,0.35)",
                },
              }}
            >
              <Box sx={{ width: 100, height: 100, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={logo} alt="Logo" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
              </Box>

              <Typography variant="h4" sx={{ color: darkText, fontWeight: 800, mb: 1 }}>
                Human Resources Information System
              </Typography>
              <Typography sx={{ mb: 3, color: mediumText }}>Sign in to access your account</Typography>

              <form onSubmit={handleLogin}>
                <TextField
                  name="employeeNumber"
                  placeholder="Employee Number"
                  fullWidth
                  value={employeeNumber}
                  inputProps={{ maxLength: 20 }}
                  disabled={isLoginLocked}
                  sx={{
                    mb: 3,
                    "& .MuiInputBase-input": { color: "#000" },
                    "& .MuiInputBase-input::placeholder": { color: placeholderGray, opacity: 1 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      background: "#fff",
                      "& fieldset": { borderColor: placeholderGray },
                      "&.Mui-focused fieldset": { borderColor: placeholderGray },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlined sx={{ color: "#a31d1d", mr: 0.75 }} />
                      </InputAdornment>
                    ),
                  }}
                  onChange={handleEmployeeNumberChange}
                />
                <TextField
                  name="password"
                  placeholder="Password"
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  disabled={isLoginLocked}
                  sx={{
                    mb: 1,
                    "& .MuiInputBase-input": { color: "#000" },
                    "& .MuiInputBase-input::placeholder": { color: placeholderGray, opacity: 1 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      background: "#fff",
                      "& fieldset": { borderColor: placeholderGray },
                      "&.Mui-focused fieldset": { borderColor: placeholderGray },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: "#a31d1d" }} />
                      </InputAdornment>
                    ),
                  }}
                  onChange={handleChanges}
                />
                
                {/* ── Conditional Password Tip (Subtle) ── */}
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ 
                    textAlign: "left", 
                    color: "rgba(128, 0, 32, 0.6)", 
                    mb: 2, 
                    pl: 1,
                    fontSize: "0.75rem", 
                    fontStyle: "italic",
                    opacity: 0.8
                  }}
                >
                 If using the default password, enter it in ALL CAPS with NO SPACES.
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 2 }}>
                  <Link href="/forgot-password" underline="hover" sx={{ color: mediumText, flexShrink: 0 }}>
                    Forgot password?
                  </Link>
                </Box>

                {errMessage && <Alert severity="error" sx={{ mb: 2 }}>{errMessage}</Alert>}

                {isLoginLocked && (
                  <Alert severity="warning" icon={<AccessTimeIcon />} sx={{ mb: 2 }}>
                    Too many attempts. Try again in {formatTime(loginLockTimer)}
                  </Alert>
                )}

                {dashWarning && (
                  <Alert severity="warning" sx={{ mb: 3, py: 0.5, fontSize: "0.8rem" }}>
                    {dashWarning}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoginLocked}
                  startIcon={<LoginOutlined />}
                  sx={{
                    py: 1.8,
                    mb: 1,
                    background: isLoginLocked ? "rgba(128,0,32,0.3)" : primaryGradient,
                    "&:hover": { background: isLoginLocked ? "rgba(128,0,32,0.3)" : primaryHoverGradient },
                    opacity: isLoginLocked ? 0.6 : 1,
                  }}
                >
                  {isLoginLocked ? `Locked (${formatTime(loginLockTimer)})` : loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Paper>
          </Container>
        </Box>

        {/* ── Glassy Intro Slide ── */}
        {showIntro && (
          <Box
            id="introSlide"
            onClick={() => {
              document.getElementById("introSlide").style.transform = "translateY(-100%)";
              setTimeout(() => setShowIntro(false), 800);
            }}
            sx={{
              position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
              zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center",
              background: "rgba(0, 0, 0, 0.35)", backdropFilter: "blur(15px)",
              borderRadius: 2, overflow: "hidden", transform: "translateY(0%)",
              transition: "transform 0.8s ease-in-out", cursor: "pointer", flexDirection: "column",
            }}
          >
            {blobs}

            <Box sx={{ textAlign: "center", px: 3, mb: 2 }} onClick={(e) => e.stopPropagation()}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900, mb: 2,
                  background: "linear-gradient(90deg, #bd7486ff, #e84a72ff)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  textShadow: "2px 2px 8px rgba(35, 1, 1, 0.7)",
                }}
              >
                H R I S
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: "#FFFFFF", textShadow: "1px 1px 5px rgba(0,0,0,0.5)" }}>
                Human Resources Information System
              </Typography>
            </Box>

            <Box sx={{ position: "absolute", bottom: 80, right: 16, textAlign: "right", color: "#FFF8E7" }} onClick={(e) => e.stopPropagation()}>
              <Typography sx={{ fontSize: "2.2rem", fontWeight: 500 }}>
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                {currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </Typography>
            </Box>

            <Box sx={{ position: "absolute", bottom: 55, right: 16, display: "flex", justifyContent: "space-between", width: "181px", color: "#FFF8E7", fontSize: "0.9rem" }}>
              <Link component="button" onClick={(e) => { e.stopPropagation(); setOpenPolicy(true); }} underline="hover" sx={{ color: "#FFF8E7", fontWeight: 500 }}>
                Privacy Policy
              </Link>
              <Link component="button" onClick={(e) => { e.stopPropagation(); setOpenFAQ(true); }} underline="hover" sx={{ color: "#FFF8E7", fontWeight: 500 }}>
                FAQs
              </Link>
            </Box>

            <Dialog open={openPolicy} onClose={() => setOpenPolicy(false)} fullWidth maxWidth="md">
              <Box p={3} position="relative">
                <IconButton onClick={(e) => { e.stopPropagation(); setOpenPolicy(false); }} sx={{ position: "absolute", top: 8, right: 8, color: "#6d2323" }}>
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" gutterBottom>Privacy Policy</Typography>
                <Typography variant="body2">This is the Privacy Policy content.</Typography>
              </Box>
            </Dialog>

            <Dialog open={openFAQ} onClose={() => setOpenFAQ(false)} fullWidth maxWidth="md">
              <Box p={3} position="relative">
                <IconButton onClick={(e) => { e.stopPropagation(); setOpenFAQ(false); }} sx={{ position: "absolute", top: 8, right: 8, color: "#6d2323" }}>
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" gutterBottom>FAQs</Typography>
                <Typography variant="body2">This is the FAQs content.</Typography>
              </Box>
            </Dialog>

            <IconButton
              onClick={() => {
                document.getElementById("introSlide").style.transform = "translateY(-100%)";
                setTimeout(() => setShowIntro(false), 800);
              }}
              sx={{ color: "#FFF8E7", fontSize: "3rem", animation: "bounce 2s infinite" }}
            >
              <KeyboardArrowDown fontSize="inherit" />
            </IconButton>

            <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(15px); } }`}</style>
          </Box>
        )}

        {/* ── 2FA Modal ── */}
        <Modal open={show2FA} onClose={() => setShow2FA(false)}>
          <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, maxWidth: "90%", bgcolor: "rgba(255,248,231,0.85)", borderRadius: 4, p: 5, textAlign: "center", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px rgba(128,0,32,0.3)" }}>
            <Typography variant="h5" sx={{ color: darkText, fontWeight: "bold", mb: 3 }}>Email Verification</Typography>
            <Typography sx={{ mb: 3, color: mediumText }}>Verification code sent to <b>{userEmail}</b></Typography>
            {success && <Alert icon={<CheckCircleOutline />} severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {twoFactorError && <Alert icon={<ErrorOutline />} severity="error" sx={{ mb: 2 }}>{twoFactorError}</Alert>}
            <TextField
              fullWidth
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputProps={{ maxLength: 6, style: { letterSpacing: "0.15rem", fontSize: "1.6rem", textAlign: "center" } }}
              sx={{
                mb: 2,
                "& .MuiInputBase-input": { color: "#000" },
                "& .MuiInputBase-input::placeholder": { color: placeholderGray, opacity: 1 },
                "& .MuiOutlinedInput-root": { borderRadius: 2, background: "#fff", "& fieldset": { borderColor: placeholderGray } },
              }}
            />
            <Button fullWidth variant="contained" sx={{ mb: 2, py: 1.8, background: primaryGradient, "&:hover": { background: primaryHoverGradient, transform: "scale(1.05)" }, transition: "transform 0.2s ease-in-out" }} onClick={verify2FACode} startIcon={<VerifiedUserOutlined sx={{ fontSize: 28, color: "#FFF8E7" }} />}>
              {twoFactorLoading ? "Verifying..." : "Verify"}
            </Button>
            <Button fullWidth variant="outlined" sx={{ py: 1.8, color: "#000", borderColor: "#000", "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#000" } }} onClick={() => send2FACode(userEmail, employeeNumberForRequests)} disabled={resendLoading || codeTimer > 0}>
              {codeTimer > 0 ? `Resend in ${formatTime(codeTimer)}` : resendLoading ? "Sending..." : "Resend Code"}
            </Button>
          </Box>
        </Modal>

        {/* ── Change Default Password Prompt ── */}
        <Modal open={showPasswordPrompt} onClose={() => {}}>
          <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 560, maxWidth: "90%", bgcolor: "rgba(255,248,231,0.98)", borderRadius: 3, p: 4, textAlign: "left", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px rgba(128,0,32,0.25)", border: "1px solid rgba(128,0,32,0.15)" }}>
            <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, background: primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LockOutlined sx={{ fontSize: 28, color: lightText }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: darkText, fontWeight: 700, mb: 1 }}>Password Security Notice</Typography>
                <Typography variant="body2" sx={{ color: mediumText, lineHeight: 1.6 }}>
                  Your account is currently using a default password. To protect the security and integrity of your account, you are required to create a new, unique password.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: "rgba(255, 152, 0, 0.08)", border: "1px solid rgba(255, 152, 0, 0.3)", borderRadius: 2, p: 2.5, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: "#e65100", fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <LockOutlined sx={{ fontSize: 18 }} /> Password Requirements
              </Typography>
              <Typography variant="body2" sx={{ color: "#5d4037", lineHeight: 1.7, fontSize: "0.9rem" }}>
                • Must be at least 8 characters in long<br />
                • Must include both uppercase and lowercase letters<br />
                • Must contain at least one number and one special character<br />
                • Must not contain common words or personal information
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button fullWidth variant="contained" sx={{ py: 1.5, background: primaryGradient, fontWeight: 600, textTransform: "none", fontSize: "0.95rem", "&:hover": { background: primaryHoverGradient } }} onClick={() => { window.location.href = "/settings?tab=security"; }} startIcon={<LockOutlined />}>
                Update Password Now
              </Button>
              <Button fullWidth variant="outlined" sx={{ py: 1.5, color: mediumText, borderColor: mediumText, fontWeight: 600, textTransform: "none", fontSize: "0.95rem", "&:hover": { backgroundColor: "rgba(128,0,32,0.05)", borderColor: mediumText } }} onClick={() => { setShowPasswordPrompt(false); setShowLaterModal(true); }}>
                Remind Me Later
              </Button>
            </Box>
            <Typography variant="caption" sx={{ display: "block", color: "rgba(0,0,0,0.6)", fontSize: "0.75rem", textAlign: "center" }}>
              You can update your password at any time via Settings → Security → Change Password.
            </Typography>
          </Box>
        </Modal>

        {/* ── Later Modal ── */}
        <Modal open={showLaterModal} onClose={() => {}}>
          <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 520, maxWidth: "90%", bgcolor: "rgba(255,248,231,0.98)", borderRadius: 3, p: 4, textAlign: "left", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px rgba(128,0,32,0.25)", border: "1px solid rgba(128,0,32,0.15)" }}>
            <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, background: primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LockOutlined sx={{ fontSize: 28, color: lightText }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: darkText, fontWeight: 700, mb: 1 }}>Password Update Reminder</Typography>
                <Typography variant="body2" sx={{ color: mediumText, lineHeight: 1.6 }}>
                  For security purposes, please update your password as soon as possible.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ bgcolor: "rgba(128,0,32,0.05)", borderRadius: 2, p: 2.5, mb: 3, border: "1px solid rgba(128,0,32,0.1)" }}>
              <Typography variant="body2" sx={{ color: mediumText, fontWeight: 600, mb: 0.5 }}>You can update your password at:</Typography>
              <Typography variant="body2" sx={{ color: darkText, fontWeight: 600 }}>Settings → Security → Change Password</Typography>
            </Box>
            <Box sx={{ mb: 3, p: 2, bgcolor: "rgba(255, 152, 0, 0.05)", borderRadius: 2, border: "1px solid rgba(255, 152, 0, 0.2)" }}>
              <FormControlLabel
                control={<Checkbox checked={dontRemindToday} onChange={(e) => setDontRemindToday(e.target.checked)} sx={{ color: mediumText, "&.Mui-checked": { color: mediumText } }} />}
                label="Don't remind me again today"
                sx={{ margin: 0, "& .MuiFormControlLabel-label": { fontSize: "0.9rem", color: darkText, fontWeight: 500 } }}
              />
            </Box>
            <Button
              fullWidth variant="contained"
              sx={{ py: 1.5, background: primaryGradient, fontWeight: 600, textTransform: "none", fontSize: "0.95rem", "&:hover": { background: primaryHoverGradient } }}
              onClick={() => {
                const token = localStorage.getItem("token");
                if (!token) return;
                const decoded = JSON.parse(atob(token.split(".")[1]));
                if (dontRemindToday) {
                  const reminderData = JSON.stringify({ date: new Date().toDateString(), employeeNumber: decoded.employeeNumber, timestamp: Date.now() });
                  localStorage.setItem("passwordReminderSkipped", reminderData);
                  sessionStorage.setItem("passwordReminderSkipped", reminderData);
                }
                setShowLaterModal(false);
                setTimeout(() => navigateToDashboard(decoded.role), 300);
              }}
            >
              Continue to Dashboard
            </Button>
          </Box>
        </Modal>
      </Box>
    </>
  );
};

export default Login;