import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserInfo } from "../utils/auth";
import {
  Alert, TextField, Button, Box, Typography, InputAdornment, IconButton, Rating,
  Checkbox, FormControlLabel, Switch, Accordion, AccordionSummary, AccordionDetails,
  Chip, Grid, Dialog, DialogContent, DialogActions, Select, MenuItem, FormControl,
  alpha, Avatar, Card, CardContent, Tooltip, Fade, Divider, Backdrop,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  LockOutlined, Visibility, VisibilityOff, ArrowBack, VerifiedUserOutlined,
  LockResetOutlined, CheckCircleOutline, MarkEmailReadOutlined,
  Email as EmailIcon, Settings as SettingsIcon, VpnKey, Shield,
  QuestionAnswer, Business, Policy, ContactSupport, Close,
  People as PeopleIcon, Add, Edit, Delete, Save, Cancel,
  CheckCircle, HelpOutline, ExpandMore, AttachFile,
} from "@mui/icons-material";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { useSocket } from "../contexts/SocketContext";

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS  (mirrors LeaveRequest)
───────────────────────────────────────────────────────────────────────────── */
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  headerGrad:   "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven:      "#ffffff",
  rowOdd:       "rgba(109,35,35,0.025)",
  rowHover:     "rgba(109,35,35,0.055)",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
};

const PAGE_BG   = "#f8f4f4";
const BD        = T.accentBorder;
const TXT       = T.text;
const MUTED     = T.muted;
const SUBTLE    = "rgba(109,35,35,0.03)";
const SIDEBAR_W = 280;

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }
  @keyframes logout-fade {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }
  * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   STYLED PRIMITIVES  (mirrors LeaveRequest)
───────────────────────────────────────────────────────────────────────────── */
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: `0.5px solid ${T.accentBorder}`,
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

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON / WIREFRAME
───────────────────────────────────────────────────────────────────────────── */
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r, flexShrink: 0,
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: "800px 100%",
    animation: "shimmer 1.6s infinite linear",
    ...sx,
  }} />
);

const SettingsWireframe = () => (
  <Box sx={{ minHeight: "100vh" }}>
    <style>{GLOBAL_CSS}</style>
    {/* Sidebar ghost */}
    <Box sx={{
      width: SIDEBAR_W, bgcolor: "#fff", borderLeft: `1px solid ${BD}`,
      position: "fixed", right: 0, top: 0, height: "100vh", zIndex: 1200,
      display: "flex", flexDirection: "column",
    }}>
      <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", gap: 2, flexShrink: 0, animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha(T.accent, 0.12), flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}><Bone w="50%" h={11} r={4} sx={{ mb: 0.5 }} /><Bone w="35%" h={8} r={3} /></Box>
      </Box>
      {[52, 44, 66, null, 40, 28, 36, 55].map((w, i) =>
        w === null ? (
          <Box key={i} sx={{ px: 3, pb: 0.5, pt: 1 }}><Bone w="38%" h={7} r={3} /></Box>
        ) : (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 1.25, animation: `blink 2s ease-in-out ${i * 0.06}s infinite`, borderRadius: "0 6px 6px 0", mr: 1, ...(i === 0 ? { bgcolor: alpha(T.accent, 0.06) } : {}) }}>
            <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: alpha(T.accent, i === 0 ? 0.12 : 0.05), flexShrink: 0 }} />
            <Bone w={`${w}%`} h={10} r={3} />
          </Box>
        )
      )}
    </Box>

    {/* Main ghost */}
    <Box sx={{ width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", boxSizing: "border-box", pl: { xs: 2, sm: 3, md: 6 }, pr: `${SIDEBAR_W + 16}px`, py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, borderRadius: 3, overflow: "hidden", border: `1px solid ${BD}`, animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ p: 3.5, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", gap: 2.5 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: alpha(T.accent, 0.12), flexShrink: 0 }} />
          <Box><Bone w={220} h={18} sx={{ mb: 1 }} /><Bone w={360} h={11} /></Box>
        </Box>
      </Box>
      <Box sx={{ borderRadius: 3, border: `1px solid ${BD}`, bgcolor: "#fff", overflow: "hidden", animation: "blink 2s ease-in-out 0.14s infinite" }}>
        <Box sx={{ px: 3.5, py: 2.5, borderBottom: `1px solid ${BD}`, bgcolor: T.accentFaint, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: alpha(T.accent, 0.12) }} />
          <Bone w={180} h={13} />
        </Box>
        <Box sx={{ p: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {[100, 160, 120].map((w, i) => (
            <Box key={i}><Bone w={w} h={10} sx={{ mb: 1 }} /><Box sx={{ height: 40, borderRadius: 2, border: `1px solid ${BD}`, bgcolor: "#fafafa" }} /></Box>
          ))}
          <Box sx={{ width: 180, height: 40, borderRadius: 2, bgcolor: alpha(T.accent, 0.12) }} />
        </Box>
      </Box>
    </Box>
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED ATOMS
───────────────────────────────────────────────────────────────────────────── */
const selectSx = {
  borderRadius: "8px", fontSize: "0.875rem", bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: "1.5px" },
};

const Btn = ({ children, danger, outline, sm, fullWidth, startIcon, ...p }) => (
  <AccentButton
    disableElevation
    fullWidth={fullWidth}
    variant={outline ? "outlined" : "contained"}
    size={sm ? "small" : "medium"}
    startIcon={startIcon}
    sx={{
      fontSize: sm ? "0.78rem" : "0.85rem",
      py: sm ? 0.5 : 0.75,
      px: sm ? 1.5 : 2.25,
      boxShadow: "none",
      ...(outline
        ? { borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }
        : danger
          ? { bgcolor: "#c62828", color: "#fff", "&:hover": { bgcolor: "#b71c1c" }, "&:disabled": { bgcolor: "#f1f5f9", color: "#94a3b8" } }
          : { bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark, boxShadow: `0 4px 16px ${alpha(T.accent, 0.38)}` }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none !important", transform: "none !important" } }),
    }}
    {...p}
  >
    {children}
  </AccentButton>
);

/* Panel header (gradient bar matching LeaveRequest modal headers) */
const PanelHeader = ({ icon: Icon, title, subtitle, action }) => (
  <Box sx={{
    px: 3.5, py: 2.5, background: T.headerGrad,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "relative", overflow: "hidden", flexShrink: 0,
  }}>
    <Box sx={{ position: "absolute", top: -50, right: -30, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon sx={{ fontSize: 18, color: "#fff" }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, mb: 0.25 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.68)" }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box sx={{ position: "relative", zIndex: 1 }}>{action}</Box>}
  </Box>
);

/* Hero card (page-level header matching LR's page header) */
const PageHero = ({ icon: Icon, title, subtitle, badge }) => (
  <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
    <Box sx={{
      px: 4, py: 3,
      background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "relative", overflow: "hidden",
    }}>
      <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.1) 0%,transparent 70%)" }} />
      <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)" }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
        <Icon sx={{ fontSize: 32, color: T.accent }} />
        <Box>
          <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>{title}</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9 }}>{subtitle}</Typography>
        </Box>
      </Box>
      {badge && (
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
            <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700 }}>{badge}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  </SectionCard>
);

const InfoBox = ({ children }) => (
  <Box sx={{
    display: "flex", mb: 3, px: 2.5, py: 2,
    bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
    borderLeft: `3px solid ${alpha(T.accent, 0.5)}`,
    borderRadius: 1.5,
  }}>
    <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.7 }}>{children}</Typography>
  </Box>
);

const FL = ({ children, req }) => (
  <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75, display: "block" }}>
    {children}{req && <Box component="span" sx={{ color: "#c62828", ml: 0.25 }}>*</Box>}
  </Typography>
);

const FormSectionLabel = ({ icon: Icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
    <Icon sx={{ fontSize: 12, color: alpha(T.accent, 0.45) }} />
    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: alpha(T.accent, 0.45) }}>
      {children}
    </Typography>
  </Box>
);

const Tag = ({ label, color }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.25, py: 0.2, bgcolor: alpha(color, 0.06), borderRadius: "4px" }}>
    <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: alpha(color, 0.8), letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</Typography>
  </Box>
);

const STATUS_LABELS = { new: "New", on_process: "On Process", read: "Read", replied: "Replied", resolved: "Resolved" };
const STATUS_OPTIONS = [
  { value: "new", label: "New" }, { value: "read", label: "Read" },
  { value: "replied", label: "Replied" }, { value: "on_process", label: "On Process" },
  { value: "resolved", label: "Resolved" },
];

const StatusBadge = ({ status }) => {
  const map = {
    new: ["#92400e", "#fef9c3", "#eab308"], on_process: ["#7c2d12", "#fff7ed", "#f97316"],
    read: ["#1e40af", "#eff6ff", "#3b82f6"], replied: ["#166534", "#f0fdf4", "#22c55e"],
    resolved: ["#374151", "#f9fafb", "#6b7280"],
  };
  const [tc, bg] = map[status] || map.resolved;
  return (
    <Box sx={{ px: 1.25, py: 0.2, bgcolor: bg, borderRadius: "4px", display: "inline-flex", alignItems: "center" }}>
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: tc, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {STATUS_LABELS[status] || status}
      </Typography>
    </Box>
  );
};

const DlgHeader = ({ icon: Icon, title, onClose }) => (
  <Box sx={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    px: 3.5, py: 2.5, background: T.headerGrad,
    position: "relative", overflow: "hidden",
  }}>
    <Box sx={{ position: "absolute", top: -50, right: -30, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon sx={{ fontSize: 16, color: "#fff" }} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: "0.93rem", color: "#fff" }}>{title}</Typography>
    </Box>
    <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.75)", p: 0.5, position: "relative", zIndex: 1, "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.12)" } }}>
      <Close sx={{ fontSize: 16 }} />
    </IconButton>
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const Settings = () => {
  const { settings: sys } = useSystemSettings();
  const { socket, connected } = useSocket();
  const navigate   = useNavigate();
  const location   = useLocation();
  const _pendingTicketId       = useRef(null);
  const _pendingFromNotification = useRef(false);

  const [currentStep, setCurrentStep]               = useState(0);
  const [activeSection, setActiveSection]           = useState("password");
  const [formData, setFormData]                     = useState({ currentPassword: "", verificationCode: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw]                         = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading]                       = useState(false);
  const [pageLoading, setPageLoading]               = useState(true);
  const [errMsg, setErrMsg]                         = useState("");
  const [userEmail, setUserEmail]                   = useState("");
  const [passwordConfirmed, setPasswordConfirmed]   = useState(false);
  const [showSuccessModal, setShowSuccessModal]     = useState(false);
  const [showVerifyModal, setShowVerifyModal]       = useState(false);
  const [logoutOpen, setLogoutOpen]                 = useState(false);
  const [newEmail, setNewEmail]                     = useState("");
  const [confirmEmail, setConfirmEmail]             = useState("");
  const [enableMFA, setEnableMFA]                   = useState(true);
  const [faqs, setFaqs]                             = useState([]);
  const [aboutUs, setAboutUs]                       = useState(null);
  const [policies, setPolicies]                     = useState([]);
  const [userRole, setUserRole]                     = useState("");
  const [contactForm, setContactForm]               = useState({ name: "", email: "", subject: "", message: "" });
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [selectedSub, setSelectedSub]               = useState(null);
  const [contactView, setContactView]               = useState("thread");
  const [contactStatusFilter, setContactStatusFilter] = useState("all");
  const [adminReply, setAdminReply]                 = useState("");
  const [contactMessages, setContactMessages]       = useState([]);
  const [messagesLoading, setMessagesLoading]       = useState(false);
  const [feedbackOpen, setFeedbackOpen]             = useState(false);
  const [feedbackMessages, setFeedbackMessages]     = useState([]);
  const [feedbackLoading, setFeedbackLoading]       = useState(false);
  const [feedbackReply, setFeedbackReply]           = useState("");
  const [feedbackAttachment, setFeedbackAttachment] = useState(null);
  const [feedbackRating, setFeedbackRating]         = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted]   = useState(false);
  const [faqDialogOpen, setFaqDialogOpen]           = useState(false);
  const [editingFaq, setEditingFaq]                 = useState(null);
  const [faqForm, setFaqForm]                       = useState({ question: "", answer: "", category: "general", display_order: 0, is_active: true });
  const [aboutEditMode, setAboutEditMode]           = useState(false);
  const [aboutForm, setAboutForm]                   = useState({ title: "", content: "", version: "" });
  const [policyDialogOpen, setPolicyDialogOpen]     = useState(false);
  const [editingPolicy, setEditingPolicy]           = useState(null);
  const [policyForm, setPolicyForm]                 = useState({ title: "", content: "", category: "privacy", display_order: 0, is_active: true });
  const [toast, setToast]                           = useState({ open: false, message: "", severity: "success" });
  const [firstName, setFirstName]                   = useState("");
  const [lastName, setLastName]                     = useState("");
  const threadScrollRef = useRef(null);
  const [contactAttachment, setContactAttachment]   = useState(null);
  const [replyAttachment, setReplyAttachment]       = useState(null);

  const employeeNumber = localStorage.getItem("employeeNumber");
  const STEPS = ["Verify Identity", "Enter Code", "Set New Password"];

  /* ── Effects ── */
  useEffect(() => { const i = getUserInfo(); if (i?.role) setUserRole(i.role); }, []);

  useEffect(() => {
    if (pageLoading) return;
    const { section, ticketId } = location.state || {};
    if (!section) return;
    if (ticketId) _pendingTicketId.current = Number(ticketId);
    if (section === "contact") _pendingFromNotification.current = true;
    if (section === "contact") setContactStatusFilter("all");
    window.history.replaceState({}, "");
    if (section === activeSection) { fetchTickets(); } else { setActiveSection(section); }
  }, [pageLoading]); // eslint-disable-line

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) { setErrMsg("Session expired."); setTimeout(() => (window.location.href = "/"), 2000); return; }
    try { const d = JSON.parse(atob(token.split(".")[1])); setUserEmail(d.email); } catch { setErrMsg("Invalid session."); setTimeout(() => (window.location.href = "/"), 2000); }
    (async () => {
      try {
        const [f, a, pol] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/faqs`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/api/about-us`).catch(() => ({ data: null })),
          axios.get(`${API_BASE_URL}/api/policies`).catch(() => ({ data: [] })),
        ]);
        setFaqs(f.data); setAboutUs(a.data); setPolicies(pol.data);
        if (employeeNumber) {
          try {
            const r = await axios.get(`${API_BASE_URL}/api/user-preferences/${employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } });
            setEnableMFA(r.data.enable_mfa === 1 || r.data.enable_mfa === true);
          } catch {}
        }
      } finally { setPageLoading(false); }
    })();
  }, [employeeNumber]);

  /* ── Helpers ── */
  const notify        = (msg, sev = "success") => setToast({ open: true, message: msg, severity: sev });
  const tok           = () => localStorage.getItem("token") || sessionStorage.getItem("token");
  const handleChanges = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); if (errMsg) setErrMsg(""); };

  const handleUpdateEmail = async () => {
    if (!newEmail || !confirmEmail) { setErrMsg("Fill in both fields."); return; }
    if (newEmail !== confirmEmail)  { setErrMsg("Emails do not match."); return; }
    setLoading(true); setErrMsg("");
    try {
      const res = await axios.post(`${API_BASE_URL}/update-email`, { email: newEmail }, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.status === 200) { setUserEmail(newEmail); setNewEmail(""); setConfirmEmail(""); notify("Email updated successfully."); }
    } catch { setErrMsg("Connection error. Please try again."); } finally { setLoading(false); }
  };

  const handleToggleMFA = async (e) => {
    const v = e.target.checked; setLoading(true); setErrMsg("");
    try {
      await axios.put(`${API_BASE_URL}/api/user-preferences/${employeeNumber}`, { enable_mfa: v }, { headers: { Authorization: `Bearer ${tok()}` } });
      setEnableMFA(v); notify(`Two-factor authentication ${v ? "enabled" : "disabled"}.`);
    } catch { setErrMsg("Failed to update preference."); setEnableMFA(!v); } finally { setLoading(false); }
  };
const handleRequestCode = async (e) => {
  e.preventDefault();

  if (!formData.currentPassword) {
    setErrMsg("Enter your current password.");
    return;
  }

  if (!userEmail || !userEmail.trim()) {
    setErrMsg("No email found in your session. Please log in again.");
    return;
  }

  if (!employeeNumber || !String(employeeNumber).trim()) {
    setErrMsg("No employee number found in your session. Please log in again.");
    return;
  }

  setLoading(true);
  setErrMsg("");

  try {
    const safeEmail = userEmail.trim();
    const safeEmployeeNumber = String(employeeNumber).trim();

    const vr = await fetch(`${API_BASE_URL}/verify-current-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok()}`
      },
      body: JSON.stringify({
        email: safeEmail,
        employeeNumber: safeEmployeeNumber,
        currentPassword: formData.currentPassword
      })
    });

    const vd = await vr.json();

    if (!vr.ok) {
      setErrMsg(vd.error || "Incorrect password.");
      return;
    }

    const r = await fetch(`${API_BASE_URL}/send-password-change-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok()}`
      },
      body: JSON.stringify({
        email: safeEmail,
        employeeNumber: safeEmployeeNumber
      })
    });

    const d = await r.json();

    if (r.ok) {
      setCurrentStep(1);
      setShowVerifyModal(true);
    } else {
      setErrMsg(d.error || "Failed to send code.");
    }
  } catch {
    setErrMsg("Connection error.");
  } finally {
    setLoading(false);
  }
};

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!formData.verificationCode) { setErrMsg("Enter the verification code."); return; }
    if (!userEmail || !userEmail.trim()) { setErrMsg("No email found in your session. Please log in again."); return; }
    if (!employeeNumber || !String(employeeNumber).trim()) { setErrMsg("No employee number found in your session. Please log in again."); return; }
    setLoading(true); setErrMsg("");
    try {
      const r = await fetch(`${API_BASE_URL}/verify-password-change-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: userEmail.trim(), employeeNumber: String(employeeNumber).trim(), code: formData.verificationCode }) });
      const d = await r.json();
      if (r.ok) setCurrentStep(2); else setErrMsg(d.error || "Invalid or expired code.");
    } catch { setErrMsg("Connection error."); } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) { setErrMsg("Passwords do not match."); return; }
    if (formData.newPassword.length < 6) { setErrMsg("Password must be at least 6 characters."); return; }
    if (!passwordConfirmed) { setErrMsg("Tick the confirmation checkbox."); return; }
    if (!userEmail || !userEmail.trim()) { setErrMsg("No email found in your session. Please log in again."); return; }
    if (!employeeNumber || !String(employeeNumber).trim()) { setErrMsg("No employee number found in your session. Please log in again."); return; }
    setLoading(true); setErrMsg("");
    try {
      const r = await fetch(`${API_BASE_URL}/complete-password-change`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: userEmail.trim(), employeeNumber: String(employeeNumber).trim(), newPassword: formData.newPassword, confirmPassword: formData.confirmPassword }) });
      const d = await r.json();
      if (r.ok) setShowSuccessModal(true); else setErrMsg(d.error || "Failed to change password.");
    } catch { setErrMsg("Connection error."); } finally { setLoading(false); }
  };

  const handleSuccessClose = () => { setShowSuccessModal(false); setLogoutOpen(true); setTimeout(() => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/"; }, 3000); };

  const handleContactSubmit = async () => {
    if (!contactForm.message && !contactAttachment) { setErrMsg("Message or attachment is required."); return; }
    setLoading(true); setErrMsg("");
    try {
      const fd = new FormData();
      fd.append("name", [firstName, lastName].filter(Boolean).join(" ") || userEmail);
      fd.append("email", userEmail);
      fd.append("employee_number", employeeNumber || "");
      fd.append("subject", contactForm.subject || "");
      fd.append("message", contactForm.message);
      if (contactAttachment) fd.append("attachment", contactAttachment);
      const res = await axios.post(`${API_BASE_URL}/api/contact-us`, fd, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.status === 200 || res.status === 201) {
        notify("Message submitted."); setContactForm(p => ({ ...p, subject: "", message: "" })); setContactAttachment(null);
        await fetchTickets(res.data?.id); setContactView("thread");
      }
    } catch { setErrMsg("Connection error."); } finally { setLoading(false); }
  };

  const fetchTickets = async (selectId = null) => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/contact-us`, { headers: { Authorization: `Bearer ${tok()}` } });
      const list = r.data.data || r.data || [];
      const statusOrder = { new: 1, read: 2, replied: 3, on_process: 4, resolved: 5 };
      list.sort((a, b) => {
        const ar = statusOrder[a.status] || 99, br = statusOrder[b.status] || 99;
        return ar !== br ? ar - br : new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      setContactSubmissions(list);
      if (selectId) { const match = list.find(s => String(s.id) === String(selectId)); if (match) { setSelectedSub(match); setContactView("thread"); return; } }
      const pendingId = _pendingTicketId.current;
      if (pendingId) {
        _pendingTicketId.current = null; _pendingFromNotification.current = false;
        const match = list.find(s => String(s.id) === String(pendingId));
        if (match) { setSelectedSub(match); setContactView("thread"); return; }
      }
      if (_pendingFromNotification.current) {
        _pendingFromNotification.current = false;
        const mostRecent = [...list].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0];
        if (mostRecent) { setSelectedSub(mostRecent); setContactView("thread"); return; }
      }
      if (!selectedSub && list.length > 0) setSelectedSub(list[0]);
    } catch {}
  };

  const fetchMessages = async (ticketId) => {
    if (!ticketId) { setContactMessages([]); return; }
    setMessagesLoading(true);
    try { const r = await axios.get(`${API_BASE_URL}/api/contact-us/${ticketId}/messages`, { headers: { Authorization: `Bearer ${tok()}` } }); setContactMessages(r.data.data || r.data || []); }
    catch { setContactMessages([]); } finally { setMessagesLoading(false); }
  };

  const handleSendThreadMessage = async () => {
    if (!selectedSub || (!adminReply.trim() && !replyAttachment)) return;
    setLoading(true); setErrMsg("");
    try {
      const fd = new FormData(); fd.append("message", adminReply.trim()); if (replyAttachment) fd.append("attachment", replyAttachment);
      await axios.post(`${API_BASE_URL}/api/contact-us/${selectedSub.id}/messages`, fd, { headers: { Authorization: `Bearer ${tok()}` } });
      setAdminReply(""); setReplyAttachment(null); await fetchTickets(selectedSub.id); await fetchMessages(selectedSub.id);
    } catch { setErrMsg("Failed to send message."); } finally { setLoading(false); }
  };

  const fetchFeedbackMessages = async (ticketId) => {
    if (!ticketId) { setFeedbackMessages([]); return; }
    setFeedbackLoading(true);
    try { const r = await axios.get(`${API_BASE_URL}/api/contact-us/${ticketId}/feedback`, { headers: { Authorization: `Bearer ${tok()}` } }); const list = r.data.data || r.data || []; setFeedbackMessages(list); if (!isAdmin) setFeedbackSubmitted(list.length > 0); }
    catch { setFeedbackMessages([]); } finally { setFeedbackLoading(false); }
  };

  const handleSendFeedback = async () => {
    if (!selectedSub || (!feedbackReply.trim() && !feedbackAttachment && !feedbackRating)) return;
    setLoading(true); setErrMsg("");
    try {
      const fd = new FormData(); fd.append("message", feedbackReply.trim()); if (feedbackRating) fd.append("rating", String(feedbackRating)); if (feedbackAttachment) fd.append("attachment", feedbackAttachment);
      await axios.post(`${API_BASE_URL}/api/contact-us/${selectedSub.id}/feedback`, fd, { headers: { Authorization: `Bearer ${tok()}` } });
      if (isAdmin) await fetchFeedbackMessages(selectedSub.id);
      setFeedbackReply(""); setFeedbackAttachment(null); setFeedbackRating(0); setFeedbackSubmitted(true); setFeedbackOpen(false);
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed to send feedback."); } finally { setLoading(false); }
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question || !faqForm.answer) { setErrMsg("Question and answer required."); return; }
    setLoading(true); setErrMsg("");
    try {
      if (editingFaq) await axios.put(`${API_BASE_URL}/api/faqs/${editingFaq.id}`, faqForm, { headers: { Authorization: `Bearer ${tok()}` } });
      else await axios.post(`${API_BASE_URL}/api/faqs`, faqForm, { headers: { Authorization: `Bearer ${tok()}` } });
      setFaqDialogOpen(false); const r = await axios.get(`${API_BASE_URL}/api/faqs`); setFaqs(r.data); notify(editingFaq ? "FAQ updated." : "FAQ created.");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed to save."); } finally { setLoading(false); }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    setLoading(true);
    try { await axios.delete(`${API_BASE_URL}/api/faqs/${id}`, { headers: { Authorization: `Bearer ${tok()}` } }); const r = await axios.get(`${API_BASE_URL}/api/faqs`); setFaqs(r.data); notify("FAQ deleted."); }
    catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleSaveAbout = async () => {
    if (!aboutForm.title || !aboutForm.content) { setErrMsg("Title and content required."); return; }
    setLoading(true); setErrMsg("");
    try {
      await axios.put(`${API_BASE_URL}/api/about-us`, aboutForm, { headers: { Authorization: `Bearer ${tok()}` } });
      setAboutEditMode(false); const r = await axios.get(`${API_BASE_URL}/api/about-us`); setAboutUs(r.data); notify("About Us updated.");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const fetchUsersData = async (empNum) => {
    try {
      const token = tok(); if (!token || !empNum) return;
      const res = await axios.get(`${API_BASE_URL}/users/${empNum}`, { headers: { Authorization: `Bearer ${token}` } });
      const user = res.data?.user || res.data; setFirstName(user?.firstName || ""); setLastName(user?.lastName || "");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleSavePolicy = async () => {
    if (!policyForm.title || !policyForm.content) { setErrMsg("Title and content required."); return; }
    setLoading(true); setErrMsg("");
    try {
      const r = editingPolicy
        ? await axios.put(`${API_BASE_URL}/api/policies/${editingPolicy.id}`, policyForm, { headers: { Authorization: `Bearer ${tok()}` } })
        : await axios.post(`${API_BASE_URL}/api/policies`, policyForm, { headers: { Authorization: `Bearer ${tok()}` } });
      notify(`Policy ${editingPolicy ? "updated" : "created"}. Version: ${r.data.version}`);
      setPolicyDialogOpen(false); const pr = await axios.get(`${API_BASE_URL}/api/policies`); setPolicies(pr.data);
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm("Delete this policy?")) return;
    setLoading(true);
    try { await axios.delete(`${API_BASE_URL}/api/policies/${id}`, { headers: { Authorization: `Bearer ${tok()}` } }); const r = await axios.get(`${API_BASE_URL}/api/policies`); setPolicies(r.data); notify("Policy deleted."); }
    catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleUpdateSubStatus = async (id, status, adminNotes = null) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/contact-us/${id}`, { status, admin_notes: adminNotes }, { headers: { Authorization: `Bearer ${tok()}` } });
      notify(adminNotes ? "Reply sent." : "Status updated."); fetchTickets(id); fetchMessages(id);
      if (selectedSub) setSelectedSub(p => ({ ...p, status: status || p.status, admin_notes: adminNotes !== null ? adminNotes : p.admin_notes }));
      if (adminNotes) setAdminReply("");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handlePasteAttachment = (e, setAttachment) => {
    const items = Array.from(e.clipboardData?.items || []); const fileItem = items.find(i => i.kind === "file");
    if (fileItem) { const file = fileItem.getAsFile(); if (file) setAttachment(file); }
  };

  useEffect(() => { fetchUsersData(employeeNumber); }, []);
  useEffect(() => { if (activeSection === "contact") fetchTickets(); }, [activeSection]);
  useEffect(() => { fetchMessages(selectedSub?.id); }, [selectedSub?.id]);

  useEffect(() => {
    if (!socket || !connected) return;
    const onContactThreadChanged = (payload) => {
      if (activeSection !== "contact") return;
      const contactId = payload?.contactId;
      fetchTickets(contactId || selectedSub?.id);
      if (!contactId || contactId === selectedSub?.id) fetchMessages(selectedSub?.id);
    };
    socket.on("contactThreadChanged", onContactThreadChanged);
    return () => socket.off("contactThreadChanged", onContactThreadChanged);
  }, [socket, connected, activeSection, selectedSub?.id]);

  useEffect(() => {
    if (!firstName && !lastName && !userEmail) return;
    setContactForm(p => ({ ...p, name: [firstName, lastName].filter(Boolean).join(" ") || p.name, email: userEmail || p.email }));
  }, [firstName, lastName, userEmail]);

  useEffect(() => { setFeedbackMessages([]); setFeedbackReply(""); setFeedbackAttachment(null); setFeedbackRating(0); setFeedbackSubmitted(false); }, [selectedSub?.id]);

  useEffect(() => {
    if (contactView === "compose" || !selectedSub) return;
    setTimeout(() => { if (threadScrollRef.current) threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight; }, 100);
  }, [contactMessages, messagesLoading, contactView, selectedSub?.id]);

  if (pageLoading) return <SettingsWireframe />;

  const isAdmin = ["superadmin", "administrator", "technical"].includes(userRole);
  const filteredContactSubmissions = contactStatusFilter === "all" ? contactSubmissions : contactSubmissions.filter(sub => (sub.status || "new") === contactStatusFilter);

  const displayName  = [firstName, lastName].filter(Boolean).join(" ") || userEmail;
  const displayEmpNo = employeeNumber || "—";
  const displayEmail = userEmail || "—";

  /* ── Password step forms ── */
  const renderStep = () => {
    switch (currentStep) {
      case 0: return (
        <Box component="form" onSubmit={handleRequestCode}>
          <InfoBox>{userEmail ? <>Enter your current password to verify identity. A one-time code will be sent to <strong style={{ color: TXT }}>{userEmail}</strong>.</> : <>No email linked. Configure one under <strong style={{ color: TXT }}>Email Settings</strong> first.</>}</InfoBox>
          <Box sx={{ mb: 2.5 }}>
            <FL req>Current Password</FL>
            <FieldInput fullWidth size="small" type={showPw.current ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleChanges}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} sx={{ color: MUTED }}>{showPw.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
          </Box>
          <Btn type="submit" disabled={loading || !userEmail} startIcon={<MarkEmailReadOutlined />}>{loading ? "Sending…" : "Send Verification Code"}</Btn>
        </Box>
      );
      case 1: return (
        <Box component="form" onSubmit={handleVerifyCode}>
          <InfoBox>A 6-digit code has been sent to <strong style={{ color: TXT }}>{userEmail}</strong>. Check your inbox.</InfoBox>
          <Box sx={{ mb: 2.5 }}>
            <FL req>Verification Code</FL>
            <FieldInput fullWidth size="small" name="verificationCode" value={formData.verificationCode} onChange={handleChanges}
              inputProps={{ maxLength: 6, style: { textAlign: "center", fontSize: "1.75rem", letterSpacing: "0.6rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", padding: "12px" } }} />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Btn outline onClick={() => setCurrentStep(0)} startIcon={<ArrowBack />}>Back</Btn>
            <Btn type="submit" disabled={loading} startIcon={<VerifiedUserOutlined />}>{loading ? "Verifying…" : "Verify Code"}</Btn>
          </Box>
        </Box>
      );
      case 2: return (
        <Box component="form" onSubmit={handleResetPassword}>
          <InfoBox>Set a new password of at least 6 characters.</InfoBox>
          {[{ k: "new", name: "newPassword", lbl: "New Password" }, { k: "confirm", name: "confirmPassword", lbl: "Confirm New Password" }].map(({ k, name, lbl }) => (
            <Box key={k} sx={{ mb: 2.5 }}>
              <FL req>{lbl}</FL>
              <FieldInput fullWidth size="small" type={showPw[k] ? "text" : "password"} name={name} value={formData[name]} onChange={handleChanges}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))} sx={{ color: MUTED }}>{showPw[k] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
            </Box>
          ))}
          <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Checkbox checked={passwordConfirmed} onChange={e => setPasswordConfirmed(e.target.checked)} size="small" sx={{ mt: "-2px", p: 0.25, color: BD, "&.Mui-checked": { color: T.accent } }} />
            <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.6, cursor: "pointer" }} onClick={() => setPasswordConfirmed(!passwordConfirmed)}>I confirm that I want to change my account password.</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Btn outline onClick={() => setCurrentStep(1)} startIcon={<ArrowBack />}>Back</Btn>
            <Btn type="submit" disabled={!passwordConfirmed || loading} startIcon={<LockResetOutlined />}>{loading ? "Updating…" : "Update Password"}</Btn>
          </Box>
        </Box>
      );
      default: return null;
    }
  };

  /* ── Sidebar NavItem ── */
  const NavItem = ({ section, icon: Icon, label }) => {
    const active = activeSection === section;
    return (
      <Box onClick={() => setActiveSection(section)} sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 3, py: 1.15, cursor: "pointer", mx: 1,
        borderRadius: "0 6px 6px 0",
        bgcolor: active ? alpha(T.accent, 0.07) : "transparent",
        transition: "all 0.12s ease",
        "&:hover": { bgcolor: active ? alpha(T.accent, 0.07) : alpha(T.accent, 0.03) },
      }}>
        <Icon sx={{ fontSize: 15, color: active ? T.accent : MUTED, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.84rem", fontWeight: active ? 600 : 400, color: active ? TXT : MUTED, flex: 1 }}>{label}</Typography>
      </Box>
    );
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Loading overlay */}
      <Backdrop open={loading} sx={{ zIndex: (t) => t.zIndex.modal, position: "fixed", inset: 0, bgcolor: "rgba(15,23,42,0.45)" }}>
        <Box sx={{ textAlign: "center" }}>
          <Box sx={{ width: 36, height: 36, border: `2px solid ${alpha(T.accent, 0.2)}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite", mx: "auto" }} />
          <Typography sx={{ mt: 2, color: "#fff", fontSize: "0.8rem", fontWeight: 500 }}>Processing…</Typography>
        </Box>
      </Backdrop>

      {/* ══ MAIN CONTENT ══ */}
      <Box sx={{
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "67%", transform: "translateX(-68%)",
        boxSizing: "border-box",
        pl: { xs: 2, sm: 3, md: 6 },
        pr: `${SIDEBAR_W - 35}px`,
        py: { xs: 2, md: 2 },
      }}>

        {errMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 500, fontSize: "0.84rem" }} onClose={() => setErrMsg("")}>{errMsg}</Alert>}

        {/* ── CHANGE PASSWORD ── */}
        {activeSection === "password" && (
          <>
            <PageHero icon={VpnKey} title="Change Password" subtitle="Administrative Panel • Update your account password with three-step verification" />
            <SectionCard>
              <PanelHeader icon={VpnKey} title="Password Update" subtitle="Identity verification required" />
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                {/* Step indicator */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                  {STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          bgcolor: i <= currentStep ? T.accent : "transparent",
                          border: `1.5px solid ${i <= currentStep ? T.accent : BD}`,
                          transition: "all 0.2s ease",
                          ...(i === currentStep ? { boxShadow: `0 0 0 3px ${alpha(T.accent, 0.15)}` } : {}),
                        }}>
                          {i < currentStep
                            ? <CheckCircle sx={{ fontSize: 14, color: "#fff" }} />
                            : <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", fontWeight: 700, color: i <= currentStep ? "#fff" : MUTED }}>{i + 1}</Typography>}
                        </Box>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: i === currentStep ? 700 : 400, color: i === currentStep ? TXT : MUTED, whiteSpace: "nowrap" }}>{label}</Typography>
                      </Box>
                      {i < STEPS.length - 1 && <Box sx={{ flex: 1, height: 1.5, bgcolor: i < currentStep ? T.accent : BD, mx: 2, transition: "background-color 0.2s ease", borderRadius: 1 }} />}
                    </React.Fragment>
                  ))}
                </Box>
                <Box sx={{ border: `1px solid ${BD}`, bgcolor: SUBTLE, p: 3.5, borderRadius: 2 }}>
                  {renderStep()}
                </Box>
              </Box>
            </SectionCard>
          </>
        )}

        {/* ── EMAIL SETTINGS ── */}
        {activeSection === "email" && (
          <>
            <PageHero icon={EmailIcon} title="Email Settings" subtitle="Administrative Panel • Manage the email address linked to your account" />
            <SectionCard>
              <PanelHeader icon={EmailIcon} title={userEmail ? "Update Email Address" : "Add Email Address"} subtitle="Used for notifications and two-factor codes" />
              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <InfoBox>{userEmail ? "Update the email address linked to your account." : "No email is associated. Add one to enable 2FA."}</InfoBox>
                {userEmail && (
                  <Box sx={{ mb: 3, p: 2.5, bgcolor: SUBTLE, border: `1px solid ${BD}`, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: alpha(T.accent, 0.08), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <EmailIcon sx={{ color: T.accent, fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "0.65rem", color: MUTED, fontWeight: 700, mb: 0.15, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Email</Typography>
                      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.84rem", color: TXT, fontWeight: 600 }}>{userEmail}</Typography>
                    </Box>
                  </Box>
                )}
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <FL req>{userEmail ? "New Email Address" : "Email Address"}</FL>
                    <FieldInput fullWidth size="small" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@organisation.ph" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FL req>Confirm Address</FL>
                    <FieldInput fullWidth size="small" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="Re-enter address" />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3 }}>
                  <Btn onClick={handleUpdateEmail} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : userEmail ? "Update Email" : "Add Email"}</Btn>
                </Box>
              </Box>
            </SectionCard>
          </>
        )}

        {/* ── SECURITY / 2FA ── */}
        {activeSection === "security" && (
          <SectionCard>
            <PanelHeader icon={Shield} title="Two-Factor Authentication" subtitle="Add an extra layer of security to your account" />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <InfoBox>When enabled, a 6-digit one-time code is required at each login.</InfoBox>
              <Box sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                p: 3, mb: 4, border: `1px solid ${BD}`, borderRadius: 2,
                bgcolor: enableMFA ? T.accentFaint : SUBTLE,
              }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: TXT, fontSize: "0.95rem", mb: 0.25 }}>Two-Factor Authentication</Typography>
                  <Typography sx={{ fontSize: "0.84rem", color: MUTED }}>{enableMFA ? "Active — OTP required at each login." : "Inactive — password login only."}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Tag label={enableMFA ? "ENABLED" : "DISABLED"} color={enableMFA ? "#16a34a" : "#6b7280"} />
                  <Switch checked={enableMFA} onChange={handleToggleMFA} disabled={loading}
                    sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: T.accent }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: T.accent } }} />
                </Box>
              </Box>
              <Box sx={{ border: `1px solid ${BD}`, borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: 3, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${BD}` }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: alpha(T.accent, 0.6), letterSpacing: "0.07em", textTransform: "uppercase" }}>Protocol Overview</Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  {[
                    "After entering your password, a 6-digit code is dispatched to your registered email.",
                    "Enter the code on the verification screen within 15 minutes to complete login.",
                    "Each code is single-use and expires automatically.",
                    "You may toggle 2FA at any time from this panel.",
                  ].map((t, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 2, mb: i < 3 ? 2 : 0, p: 1.5, borderRadius: 1.5, bgcolor: i % 2 === 0 ? SUBTLE : "transparent" }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", fontWeight: 700, color: "#fff" }}>0{i + 1}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.7, pt: "2px" }}>{t}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </SectionCard>
        )}

        {/* ── ABOUT US ── */}
        {activeSection === "about" && (
          <SectionCard>
            <PanelHeader icon={Business} title="About Us" subtitle="View and edit the organization information"
              action={isAdmin && (
                <AccentButton size="small" variant="outlined"
                  startIcon={aboutEditMode ? <Cancel sx={{ fontSize: 14 }} /> : <Edit sx={{ fontSize: 14 }} />}
                  onClick={() => aboutEditMode ? setAboutEditMode(false) : (setAboutForm({ title: aboutUs?.title || "", content: aboutUs?.content || "", version: aboutUs?.version || "" }), setAboutEditMode(true))}
                  sx={{ fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.35)", color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "#fff" } }}>
                  {aboutEditMode ? "Cancel" : "Edit"}
                </AccentButton>
              )}
            />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              {aboutEditMode ? (
                <>
                  <Box sx={{ mb: 2.5 }}><FL req>Title</FL><FieldInput fullWidth size="small" value={aboutForm.title} onChange={e => setAboutForm(p => ({ ...p, title: e.target.value }))} /></Box>
                  <Box sx={{ mb: 2.5 }}><FL req>Content (HTML supported)</FL><FieldInput fullWidth multiline rows={12} value={aboutForm.content} onChange={e => setAboutForm(p => ({ ...p, content: e.target.value }))} /></Box>
                  <Box sx={{ mb: 3 }}><FL>Version</FL><FieldInput fullWidth size="small" value={aboutForm.version} onChange={e => setAboutForm(p => ({ ...p, version: e.target.value }))} placeholder="e.g. 2.1.0" /></Box>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Btn outline onClick={() => setAboutEditMode(false)}>Cancel</Btn>
                    <Btn onClick={handleSaveAbout} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : "Save Changes"}</Btn>
                  </Box>
                </>
              ) : aboutUs ? (
                <>
                  {/* About hero strip */}
                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 2.5, mb: 3.5, p: 3,
                    background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
                    borderRadius: 2, border: `1px solid ${BD}`,
                    position: "relative", overflow: "hidden",
                  }}>
                    <Box sx={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.08) 0%,transparent 70%)" }} />
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Business sx={{ fontSize: 22, color: T.accent }} />
                    </Box>
                    <Box sx={{ flex: 1, position: "relative", zIndex: 1 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", color: T.accent, lineHeight: 1.2, mb: 0.4 }}>{aboutUs.title}</Typography>
                      {aboutUs.version && (
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.2, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${BD}`, borderRadius: 1 }}>
                          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, letterSpacing: "0.05em", textTransform: "uppercase" }}>Version {aboutUs.version}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {/* Content body */}
                  <Box sx={{
                    px: 3, py: 2.5, bgcolor: "#fff", border: `1px solid ${BD}`, borderRadius: 2,
                    "& h2": { fontSize: "1rem", fontWeight: 800, color: T.accent, mt: 2.5, mb: 1, borderBottom: `2px solid ${BD}`, pb: 0.5 },
                    "& h3": { fontSize: "0.9rem", fontWeight: 700, color: T.text, mt: 2, mb: 0.75 },
                    "& h4": { fontSize: "0.85rem", fontWeight: 700, color: T.accentMid, mt: 1.5, mb: 0.5 },
                    "& p": { mb: 1.5, lineHeight: 1.85, color: MUTED, fontSize: "0.875rem" },
                    "& ul, & ol": { pl: 3, mb: 1.5 },
                    "& li": { mb: 0.6, lineHeight: 1.8, color: MUTED, fontSize: "0.875rem" },
                    "& strong": { color: T.text, fontWeight: 700 },
                    "& a": { color: T.accent, textDecoration: "none", "&:hover": { textDecoration: "underline" } },
                  }} dangerouslySetInnerHTML={{ __html: aboutUs.content }} />
                </>
              ) : (
                <Box sx={{ py: 10, textAlign: "center" }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <Business sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                  </Box>
                  <Typography sx={{ color: MUTED }}>No content available.</Typography>
                </Box>
              )}
            </Box>
          </SectionCard>
        )}

        {/* ── FAQs ── */}
        {activeSection === "faqs" && (
          <SectionCard>
            <PanelHeader icon={QuestionAnswer} title="Frequently Asked Questions" subtitle="View and manage FAQs for employees"
              action={isAdmin && (
                <AccentButton size="small" variant="outlined"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  onClick={() => { setEditingFaq(null); setFaqForm({ question: "", answer: "", category: "general", display_order: 0, is_active: true }); setFaqDialogOpen(true); }}
                  sx={{ fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.35)", color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "#fff" } }}>
                  Add FAQ
                </AccentButton>
              )}
            />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              {faqs.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {faqs.map((faq, idx) => (
                    <Box key={faq.id} sx={{
                      border: `1px solid ${BD}`, borderRadius: 2, overflow: "hidden",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: alpha(T.accent, 0.4), boxShadow: `0 2px 12px ${alpha(T.accent, 0.07)}` },
                    }}>
                      <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                        <AccordionSummary
                          expandIcon={<ExpandMore sx={{ color: T.accent, fontSize: 20 }} />}
                          sx={{
                            px: 3, minHeight: 58,
                            bgcolor: T.rowEven,
                            "& .MuiAccordionSummary-content": { alignItems: "center", my: 1.25, gap: 2 },
                            "&.Mui-expanded": { bgcolor: T.accentFaint },
                          }}
                        >
                          {/* Number badge */}
                          <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", fontWeight: 800, color: T.accent }}>{String(idx + 1).padStart(2, "0")}</Typography>
                          </Box>
                          <Typography sx={{ fontWeight: 600, color: TXT, fontSize: "0.875rem", flex: 1, lineHeight: 1.4 }}>{faq.question}</Typography>
                          {faq.category && (
                            <Box sx={{ px: 1.25, py: 0.2, bgcolor: alpha(T.accent, 0.06), border: `1px solid ${BD}`, borderRadius: 1, flexShrink: 0 }}>
                              <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accentMid, letterSpacing: "0.05em", textTransform: "uppercase" }}>{faq.category}</Typography>
                            </Box>
                          )}
                          {isAdmin && (
                            <Box sx={{ display: "flex", gap: 0.25, ml: 0.5, flexShrink: 0 }}>
                              <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category || "general", display_order: faq.display_order || 0, is_active: faq.is_active !== false }); setFaqDialogOpen(true); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: T.accent, bgcolor: T.accentFaint } }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                              <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeleteFaq(faq.id); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: "#c62828", bgcolor: "rgba(198,40,40,0.05)" } }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                            </Box>
                          )}
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, py: 2.5, bgcolor: "#fafafa", borderTop: `1px solid ${BD}` }}>
                          <Box sx={{ display: "flex", gap: 2 }}>
                            <Box sx={{ width: 2, bgcolor: T.accent, borderRadius: 1, flexShrink: 0, alignSelf: "stretch", opacity: 0.4 }} />
                            <Typography sx={{ fontSize: "0.875rem", color: MUTED, lineHeight: 1.85 }}>{faq.answer}</Typography>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ py: 10, textAlign: "center" }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <QuestionAnswer sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, color: MUTED, mb: 0.5 }}>No FAQs on record.</Typography>
                  {isAdmin && <Typography sx={{ fontSize: "0.8rem", color: T.faint }}>Click "Add FAQ" to create the first entry.</Typography>}
                </Box>
              )}
            </Box>
          </SectionCard>
        )}

        {/* ── POLICIES ── */}
        {activeSection === "policy" && (
          <SectionCard>
            <PanelHeader icon={Policy} title="Policies & Terms" subtitle="View and manage organisational policies"
              action={isAdmin && (
                <AccentButton size="small" variant="outlined"
                  startIcon={<Add sx={{ fontSize: 14 }} />}
                  onClick={() => { setEditingPolicy(null); setPolicyForm({ title: "", content: "", category: "privacy", display_order: 0, is_active: true }); setPolicyDialogOpen(true); }}
                  sx={{ fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.35)", color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "#fff" } }}>
                  Add Policy
                </AccentButton>
              )}
            />
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              {policies.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {policies.map((policy) => (
                    <Box key={policy.id} sx={{
                      border: `1px solid ${BD}`, borderRadius: 2, overflow: "hidden",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: alpha(T.accent, 0.4), boxShadow: `0 2px 12px ${alpha(T.accent, 0.07)}` },
                    }}>
                      <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                        <AccordionSummary
                          expandIcon={<ExpandMore sx={{ color: T.accent, fontSize: 20 }} />}
                          sx={{
                            px: 3, minHeight: 60,
                            bgcolor: T.rowEven,
                            "& .MuiAccordionSummary-content": { alignItems: "center", my: 1.25, gap: 2 },
                            "&.Mui-expanded": { bgcolor: T.accentFaint },
                          }}
                        >
                          {/* Policy icon box */}
                          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Policy sx={{ fontSize: 16, color: T.accent }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: TXT, fontSize: "0.875rem", lineHeight: 1.3, mb: 0.25 }}>{policy.title}</Typography>
                            {policy.updated_at && (
                              <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: "'JetBrains Mono', monospace" }}>
                                Updated {new Date(policy.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexShrink: 0 }}>
                            {policy.category && (
                              <Box sx={{ px: 1.25, py: 0.2, bgcolor: alpha(T.accent, 0.06), border: `1px solid ${BD}`, borderRadius: 1 }}>
                                <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accentMid, letterSpacing: "0.05em", textTransform: "uppercase" }}>{policy.category}</Typography>
                              </Box>
                            )}
                            {policy.version && (
                              <Box sx={{ px: 1.25, py: 0.2, bgcolor: "rgba(0,0,0,0.03)", border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 1 }}>
                                <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: MUTED, letterSpacing: "0.04em" }}>v{policy.version}</Typography>
                              </Box>
                            )}
                            {isAdmin && (
                              <Box sx={{ display: "flex", gap: 0.25, ml: 0.25 }}>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingPolicy(policy); setPolicyForm({ title: policy.title, content: policy.content, category: policy.category || "privacy", display_order: policy.display_order || 0, is_active: policy.is_active !== false }); setPolicyDialogOpen(true); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: T.accent, bgcolor: T.accentFaint } }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeletePolicy(policy.id); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: "#c62828", bgcolor: "rgba(198,40,40,0.05)" } }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                              </Box>
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 3, py: 3, bgcolor: "#fafafa", borderTop: `1px solid ${BD}` }}>
                          <Box sx={{
                            fontSize: "0.875rem", color: MUTED, lineHeight: 1.85,
                            "& h2": { fontSize: "0.95rem", fontWeight: 800, color: T.accent, mt: 2.5, mb: 1, borderBottom: `1px solid ${BD}`, pb: 0.4 },
                            "& h3": { fontSize: "0.875rem", fontWeight: 700, color: T.text, mt: 1.75, mb: 0.5 },
                            "& p": { mb: 1.25 },
                            "& ul, & ol": { pl: 3, mb: 1.25 },
                            "& li": { mb: 0.5 },
                            "& strong": { color: T.text, fontWeight: 700 },
                          }} dangerouslySetInnerHTML={{ __html: policy.content }} />
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ py: 10, textAlign: "center" }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <Policy sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, color: MUTED, mb: 0.5 }}>No policies on record.</Typography>
                  {isAdmin && <Typography sx={{ fontSize: "0.8rem", color: T.faint }}>Click "Add Policy" to create the first entry.</Typography>}
                </Box>
              )}
            </Box>
          </SectionCard>
        )}

        {/* ── CONTACT SUPPORT ── */}
        {activeSection === "contact" && (
          <SectionCard sx={{ overflow: "hidden" }}>
            <PanelHeader icon={ContactSupport} title="Contact Support" subtitle="View and manage your communications"
              action={
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {!isAdmin && (
                    <AccentButton size="small" variant="outlined"
                      startIcon={<Add sx={{ fontSize: 14 }} />}
                      onClick={() => { setSelectedSub(null); setContactView("compose"); }}
                      sx={{ fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.35)", color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "#fff" } }}>
                      New Message
                    </AccentButton>
                  )}
                  <AccentButton size="small" variant="outlined"
                    onClick={() => fetchTickets(selectedSub?.id)}
                    sx={{ fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.8)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.6)" } }}>
                    Refresh
                  </AccentButton>
                </Box>
              }
            />
            <Box sx={{ p: { xs: 3, md: 4 }, "&:last-child": { pb: { xs: 3, md: 4 } } }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, gap: 3, alignItems: "start" }}>

                {/* Inbox list */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: alpha(T.accent, 0.55), letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700 }}>Conversations</Typography>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <Select value={contactStatusFilter} onChange={e => setContactStatusFilter(e.target.value)} sx={{ ...selectSx, fontSize: "0.75rem" }}>
                        <MenuItem value="all">All</MenuItem>
                        {STATUS_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ border: `1px solid ${BD}`, borderRadius: 2, height: 520, overflowY: "auto", bgcolor: "#fff", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    {filteredContactSubmissions.length > 0 ? filteredContactSubmissions.map(sub => {
                      const isActive = selectedSub?.id === sub.id && contactView === "thread";
                      return (
                        <Box key={sub.id}
                          onClick={() => { setSelectedSub(sub); setAdminReply(sub.admin_notes || ""); setContactView("thread"); if (isAdmin && sub.status === "new") handleUpdateSubStatus(sub.id, "read", null); }}
                          sx={{
                            px: 2.5, py: 2, borderBottom: `1px solid ${alpha(BD, 0.6)}`, cursor: "pointer",
                            bgcolor: isActive ? T.accentFaint : "transparent",
                            borderLeft: isActive ? `3px solid ${T.accent}` : "3px solid transparent",
                            transition: "all 0.1s",
                            "&:hover": { bgcolor: isActive ? T.accentFaint : T.rowHover },
                            "&:last-child": { borderBottom: "none" },
                          }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
                            <Typography sx={{ fontSize: "0.84rem", fontWeight: 600, color: TXT, flex: 1, lineHeight: 1.3 }}>
                              {sub.name || "Unknown"}
                              {sub.employee_number && (
                                <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: MUTED, ml: 0.75, px: 0.6, py: 0.1, borderRadius: 0.5, bgcolor: SUBTLE, border: `1px solid ${BD}` }}>
                                  #{sub.employee_number}
                                </Box>
                              )}
                            </Typography>
                            <StatusBadge status={sub.status} />
                          </Box>
                          <Typography sx={{ fontSize: "0.8rem", color: isActive ? TXT : MUTED, fontWeight: isActive ? 600 : 400, mb: 0.25, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {sub.subject || "General Inquiry"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                            {new Date(sub.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                          </Typography>
                        </Box>
                      );
                    }) : (
                      <Box sx={{ py: 6, textAlign: "center" }}>
                        <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5 }}>
                          <ContactSupport sx={{ fontSize: 26, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ color: MUTED, fontSize: "0.84rem" }}>{contactStatusFilter === "all" ? "No conversations yet." : "No conversations in this status."}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Thread / Composer */}
                <Box sx={{ border: `1px solid ${BD}`, borderRadius: 2, height: 565, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#fff" }}>

                  {contactView === "compose" && (
                    <Box sx={{ p: 3.5, flex: 1, overflowY: "auto" }}>
                      <FormSectionLabel icon={ContactSupport}>New Message</FormSectionLabel>
                      <Box sx={{ mb: 3, p: 2, bgcolor: T.accentFaint, border: `1px solid ${BD}`, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                        <LockOutlined sx={{ fontSize: 15, color: alpha(T.accent, 0.5), flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.78rem", color: MUTED, lineHeight: 1.5 }}>Sender identity is locked to your account.</Typography>
                      </Box>
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={4}><FL>Full Name</FL><FieldInput fullWidth size="small" value={displayName} disabled InputProps={{ endAdornment: <InputAdornment position="end"><LockOutlined sx={{ fontSize: 13, color: BD }} /></InputAdornment> }} /></Grid>
                        <Grid item xs={12} sm={4}><FL>Employee No.</FL><FieldInput fullWidth size="small" value={displayEmpNo} disabled InputProps={{ endAdornment: <InputAdornment position="end"><LockOutlined sx={{ fontSize: 13, color: BD }} /></InputAdornment> }} sx={{ "& .MuiInputBase-input.Mui-disabled": { fontFamily: "'JetBrains Mono', monospace" } }} /></Grid>
                        <Grid item xs={12} sm={4}><FL>Email Address</FL><FieldInput fullWidth size="small" value={displayEmail} disabled InputProps={{ endAdornment: <InputAdornment position="end"><LockOutlined sx={{ fontSize: 13, color: BD }} /></InputAdornment> }} /></Grid>
                        <Grid item xs={12}><FL>Subject</FL><FieldInput fullWidth size="small" value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief description of your concern" /></Grid>
                        <Grid item xs={12}>
                          <FL req>Message</FL>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <IconButton component="label" size="small" sx={{ mt: 0.5, border: `1px solid ${BD}`, borderRadius: 1, color: MUTED, "&:hover": { borderColor: T.accent, color: T.accent } }}>
                              <AttachFile sx={{ fontSize: 16 }} /><input type="file" hidden onChange={e => setContactAttachment(e.target.files?.[0] || null)} />
                            </IconButton>
                            <FieldInput fullWidth multiline rows={4} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} onPaste={e => handlePasteAttachment(e, setContactAttachment)} placeholder="Describe your concern in detail…" />
                          </Box>
                          {contactAttachment && <Chip size="small" label={contactAttachment.name} onDelete={() => setContactAttachment(null)} sx={{ mt: 1, bgcolor: SUBTLE, border: `1px solid ${BD}` }} />}
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 3, display: "flex", gap: 1 }}>
                        <Btn outline onClick={() => setContactView("thread")}>Cancel</Btn>
                        <Btn onClick={handleContactSubmit} disabled={loading || (!contactForm.message.trim() && !contactAttachment)} startIcon={<Save />}>{loading ? "Sending…" : "Send Message"}</Btn>
                      </Box>
                    </Box>
                  )}

                  {contactView === "thread" && selectedSub && (
                    <>
                      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: SUBTLE, flexShrink: 0 }}>
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedSub.subject || "General Inquiry"}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: MUTED }}>
                            {selectedSub.name}
                            {selectedSub.employee_number && <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: MUTED, ml: 0.75 }}>#{selectedSub.employee_number}</Box>}
                            {" · "}{new Date(selectedSub.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <StatusBadge status={selectedSub.status} />
                      </Box>
                      <Box ref={threadScrollRef} sx={{ flex: 1, overflowY: "auto", p: 2.5, minHeight: 0, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                        {messagesLoading ? (
                          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <Box sx={{ width: 24, height: 24, border: `2px solid ${alpha(T.accent, 0.15)}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                          </Box>
                        ) : (
                          [...(selectedSub ? [{ id: `orig-${selectedSub.id}`, message: selectedSub.message, sender_name: selectedSub.name, sender_email: selectedSub.email, sender_employee_number: selectedSub.employee_number, created_at: selectedSub.created_at, attachment: selectedSub.attachment, is_original: true }] : []), ...contactMessages]
                            .filter(Boolean)
                            .map(msg => {
                              const isMe = (msg.sender_employee_number && String(msg.sender_employee_number) === String(employeeNumber)) || (msg.sender_email && msg.sender_email === userEmail);
                              return (
                                <Box key={msg.id} sx={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", mb: 2 }}>
                                  <Box sx={{
                                    maxWidth: "75%", px: 2.5, py: 2,
                                    bgcolor: isMe ? T.accentFaint : "#fff",
                                    border: `1px solid ${isMe ? alpha(T.accent, 0.2) : BD}`,
                                    borderRadius: isMe ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                                  }}>
                                    <Typography sx={{ fontSize: "0.68rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mb: 0.5, fontWeight: 600 }}>
                                      {isMe ? "You" : (msg.sender_name || (msg.sender_role ? msg.sender_role : "Support"))}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.84rem", color: TXT, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message}</Typography>
                                    {msg.attachment && <Typography component="a" href={`${API_BASE_URL}${msg.attachment}`} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-block", mt: 0.5, fontSize: "0.75rem", color: T.accent, textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>View attachment</Typography>}
                                    <Typography sx={{ fontSize: "0.65rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mt: 0.75 }}>{new Date(msg.created_at).toLocaleString()}</Typography>
                                  </Box>
                                </Box>
                              );
                            })
                        )}
                      </Box>
                      <Box sx={{ p: 2.5, borderTop: `1px solid ${BD}`, display: "flex", flexDirection: "column", gap: 1.5, flexShrink: 0 }}>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                          <IconButton component="label" size="small" disabled={selectedSub.status === "resolved"} sx={{ mt: 0.5, border: `1px solid ${BD}`, borderRadius: 1, color: MUTED, "&:hover": { borderColor: T.accent, color: T.accent } }}>
                            <AttachFile sx={{ fontSize: 16 }} /><input type="file" hidden onChange={e => setReplyAttachment(e.target.files?.[0] || null)} />
                          </IconButton>
                          <FieldInput fullWidth multiline rows={2} value={adminReply} onChange={e => setAdminReply(e.target.value)} onPaste={e => handlePasteAttachment(e, setReplyAttachment)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendThreadMessage(); } }}
                            placeholder={selectedSub.status === "resolved" ? "Ticket resolved. You can still send feedback..." : "Type your response… (Enter to send)"} disabled={selectedSub.status === "resolved"} />
                        </Box>
                        {replyAttachment && <Chip size="small" label={replyAttachment.name} onDelete={() => setReplyAttachment(null)} sx={{ maxWidth: "100%", bgcolor: SUBTLE, border: `1px solid ${BD}` }} />}
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                          <Btn onClick={handleSendThreadMessage} disabled={loading || (!adminReply.trim() && !replyAttachment) || selectedSub.status === "resolved"} startIcon={<Save />}>{loading ? "Sending..." : "Send Reply"}</Btn>
                          {isAdmin && <Btn outline onClick={() => handleUpdateSubStatus(selectedSub.id, "resolved", adminReply || null)} disabled={loading || selectedSub.status === "resolved"}>{selectedSub.status === "resolved" ? "Resolved" : "Mark Resolved"}</Btn>}
                          {selectedSub.status === "resolved" && !isAdmin && <Btn outline onClick={() => { setFeedbackOpen(true); fetchFeedbackMessages(selectedSub.id); }}>{feedbackSubmitted ? "View Feedback" : "Give Feedback"}</Btn>}
                          {isAdmin && selectedSub.status === "resolved" && <Btn outline onClick={() => { setFeedbackOpen(true); fetchFeedbackMessages(selectedSub.id); }}>View Feedback</Btn>}
                        </Box>
                      </Box>
                    </>
                  )}

                  {contactView !== "compose" && !selectedSub && (
                    <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5 }}>
                          <ContactSupport sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                        </Box>
                        <Typography sx={{ color: MUTED }}>Select a conversation to view it</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </SectionCard>
        )}
      </Box>
      {/* ══ END MAIN CONTENT ══ */}

      {/* ══ SIDEBAR (UNCHANGED) ══ */}
      <Box sx={{
        width: SIDEBAR_W, bgcolor: "#fff",
        borderLeft: `1px solid ${BD}`,
        display: "flex", flexDirection: "column",
        position: "fixed", right: 0, top: 0, height: "100vh",
        overflowY: "auto", zIndex: 1200,
      }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <Box sx={{ width: 30, height: 30, bgcolor: sys?.primaryColor || T.accent, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1, flexShrink: 0 }}>
            <SettingsIcon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: TXT, lineHeight: 1.2 }}>Settings</Typography>
            <Typography sx={{ fontSize: "0.62rem", color: MUTED, letterSpacing: "0.03em" }}>HRIS Platform</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, pt: 1 }}>
          <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", px: 4, pb: 0.5, pt: 0.75 }}>Account</Typography>

          {(() => {
            const P = sys?.primaryColor || T.accent;
            const NavItem = ({ section, icon: Icon, label }) => {
              const active = activeSection === section;
              return (
                <Box onClick={() => setActiveSection(section)} sx={{
                  display: "flex", alignItems: "center", gap: 1.5,
                  px: 3, py: 1.15, cursor: "pointer", mx: 1,
                  borderRadius: "0 6px 6px 0",
                  bgcolor: active ? alpha(P, 0.07) : "transparent",
                  transition: "all 0.12s ease",
                  "&:hover": { bgcolor: active ? alpha(P, 0.07) : alpha(P, 0.03) },
                }}>
                  <Icon sx={{ fontSize: 15, color: active ? P : MUTED, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.84rem", fontWeight: active ? 600 : 400, color: active ? TXT : MUTED, flex: 1 }}>{label}</Typography>
                </Box>
              );
            };
            return (
              <>
                <NavItem section="password" icon={VpnKey}        label="Change Password" />
                <NavItem section="email"    icon={EmailIcon}     label="Email Settings"  />
                <NavItem section="security" icon={Shield}        label="Two-Factor Auth"  />
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", px: 4, pb: 0.5, pt: 1.5 }}>Information</Typography>
                <NavItem section="about"   icon={Business}       label="About Us"        />
                <NavItem section="faqs"    icon={QuestionAnswer} label="FAQs"             />
                <NavItem section="policy"  icon={Policy}         label="Policies"         />
                <NavItem section="contact" icon={ContactSupport} label="Contact Support"  />
              </>
            );
          })()}
        </Box>

        <Box sx={{ px: 3, py: 2.5, borderTop: `1px solid ${BD}`, flexShrink: 0 }}>
          {userRole !== "staff" && (
            <Box onClick={() => navigate("/users-list")} sx={{
              display: "flex", alignItems: "center", gap: 1.25,
              py: 1, px: 1.5, cursor: "pointer",
              color: MUTED, borderRadius: 1.5,
              transition: "all 0.12s",
              "&:hover": { color: TXT, bgcolor: SUBTLE },
            }}>
              <PeopleIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: "0.84rem", fontWeight: 500 }}>User Management</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ══ MODALS ══ */}

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden" } }}>
        <DlgHeader icon={ContactSupport} title="Ticket Feedback" onClose={() => setFeedbackOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          {isAdmin && (
            <Box sx={{ border: `1px solid ${BD}`, bgcolor: SUBTLE, maxHeight: 320, overflowY: "auto", p: 2.5, mb: 2, borderRadius: 2 }}>
              {feedbackLoading
                ? <Typography sx={{ color: MUTED, textAlign: "center", py: 4 }}>Loading...</Typography>
                : feedbackMessages.length > 0 ? feedbackMessages.map(msg => {
                    const isMe = (msg.sender_employee_number && String(msg.sender_employee_number) === String(employeeNumber)) || (msg.sender_email && msg.sender_email === userEmail);
                    return (
                      <Box key={msg.id} sx={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", mb: 2 }}>
                        <Box sx={{ maxWidth: "75%", px: 2.5, py: 2, bgcolor: isMe ? T.accentFaint : "#fff", border: `1px solid ${isMe ? alpha(T.accent, 0.2) : BD}`, borderRadius: "10px" }}>
                          <Typography sx={{ fontSize: "0.72rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mb: 0.5, fontWeight: 600 }}>{isMe ? "You" : (msg.sender_name || "User")}</Typography>
                          <Typography sx={{ fontSize: "0.84rem", color: TXT, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{msg.message}</Typography>
                          {msg.rating && <Box sx={{ mt: 0.5 }}><Rating value={Number(msg.rating)} readOnly size="small" sx={{ "& .MuiRating-iconFilled": { color: T.accent } }} /></Box>}
                          <Typography sx={{ fontSize: "0.65rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mt: 0.75 }}>{new Date(msg.created_at).toLocaleString()}</Typography>
                        </Box>
                      </Box>
                    );
                  })
                : <Typography sx={{ color: MUTED, textAlign: "center", py: 4 }}>No feedback yet.</Typography>}
            </Box>
          )}
          {!isAdmin && !feedbackSubmitted && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: T.accent, mb: 0.75 }}>Rating</Typography>
                <Rating value={feedbackRating} onChange={(e, v) => setFeedbackRating(v || 0)} size="large" sx={{ "& .MuiRating-iconFilled": { color: T.accent } }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: T.accent, mb: 0.75 }}>Comment</Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1.5 }}>
                <IconButton component="label" size="small" sx={{ mt: 0.5, border: `1px solid ${BD}`, borderRadius: 1, color: MUTED, "&:hover": { borderColor: T.accent, color: T.accent } }}>
                  <AttachFile sx={{ fontSize: 16 }} /><input type="file" hidden onChange={e => setFeedbackAttachment(e.target.files?.[0] || null)} />
                </IconButton>
                <FieldInput fullWidth multiline rows={3} value={feedbackReply} onChange={e => setFeedbackReply(e.target.value)} onPaste={e => handlePasteAttachment(e, setFeedbackAttachment)} placeholder="Write your feedback..." />
              </Box>
              {feedbackAttachment && <Chip size="small" label={feedbackAttachment.name} onDelete={() => setFeedbackAttachment(null)} sx={{ bgcolor: SUBTLE, border: `1px solid ${BD}` }} />}
            </>
          )}
          {!isAdmin && feedbackSubmitted && (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "rgba(22,163,74,0.08)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <CheckCircleOutline sx={{ fontSize: 36, color: "#16a34a" }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: TXT }}>Thank you for your feedback!</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, borderTop: `1px solid ${BD}`, bgcolor: "#f9f9f9" }}>
          <Btn outline onClick={() => setFeedbackOpen(false)}>Close</Btn>
          {!isAdmin && !feedbackSubmitted && <Btn onClick={handleSendFeedback} disabled={loading || (!feedbackReply.trim() && !feedbackAttachment && !feedbackRating)} startIcon={<Save />}>{loading ? "Sending..." : "Send Feedback"}</Btn>}
        </DialogActions>
      </Dialog>

      {/* Verify modal */}
      {showVerifyModal && (
        <Fade in>
          <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400, backdropFilter: "blur(4px)" }}>
            <Box sx={{ bgcolor: "#fff", borderRadius: 3, width: "90%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
              <DlgHeader icon={MarkEmailReadOutlined} title="Code Dispatched" onClose={() => setShowVerifyModal(false)} />
              <Box sx={{ p: 3.5 }}>
                <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.75, mb: 3 }}>A 6-digit code has been sent to <strong style={{ color: TXT }}>{userEmail}</strong>. Enter it to continue.</Typography>
                <Btn fullWidth onClick={() => setShowVerifyModal(false)}>Acknowledge</Btn>
              </Box>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Password changed modal */}
      {showSuccessModal && (
        <Fade in>
          <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400, backdropFilter: "blur(4px)" }}>
            <Box sx={{ bgcolor: "#fff", borderRadius: 3, width: "90%", maxWidth: 420, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
              <Box sx={{ px: 3.5, py: 2.5, background: "linear-gradient(180deg,#16a34a 0%,#15803d 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircleOutline sx={{ fontSize: 17, color: "#fff" }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.93rem" }}>Password Updated</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 3.5 }}>
                <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.75, mb: 3 }}>Your password has been changed. You will be signed out momentarily for security.</Typography>
                <AccentButton fullWidth variant="contained" startIcon={<LockOutlined />} onClick={handleSuccessClose}
                  sx={{ bgcolor: "#16a34a", color: "#fff", boxShadow: "0 2px 10px rgba(22,163,74,0.32)", "&:hover": { bgcolor: "#15803d" } }}>
                  Continue
                </AccentButton>
              </Box>
            </Box>
          </Box>
        </Fade>
      )}

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onClose={() => setFaqDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden" } }}>
        <DlgHeader icon={QuestionAnswer} title={editingFaq ? "Edit FAQ" : "New FAQ"} onClose={() => setFaqDialogOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ mb: 2.5 }}><FL req>Question</FL><FieldInput fullWidth size="small" value={faqForm.question} onChange={e => setFaqForm(p => ({ ...p, question: e.target.value }))} /></Box>
          <Box sx={{ mb: 2.5 }}><FL req>Answer</FL><FieldInput fullWidth multiline rows={5} value={faqForm.answer} onChange={e => setFaqForm(p => ({ ...p, answer: e.target.value }))} /></Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FL>Category</FL>
              <FormControl fullWidth size="small">
                <Select value={faqForm.category} onChange={e => setFaqForm(p => ({ ...p, category: e.target.value }))} sx={selectSx}>
                  {["general","password","email","account","technical","other"].map(c => <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><FL>Display Order</FL><FieldInput fullWidth size="small" type="number" value={faqForm.display_order} onChange={e => setFaqForm(p => ({ ...p, display_order: e.target.value }))} inputProps={{ min: 0 }} /></Grid>
          </Grid>
          <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={faqForm.is_active} onChange={e => setFaqForm(p => ({ ...p, is_active: e.target.checked }))} size="small" sx={{ color: BD, "&.Mui-checked": { color: T.accent } }} />} label={<Typography sx={{ fontSize: "0.84rem" }}>Active</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, borderTop: `1px solid ${BD}`, bgcolor: "#f9f9f9" }}>
          <Btn outline onClick={() => setFaqDialogOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSaveFaq} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : "Save FAQ"}</Btn>
        </DialogActions>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden" } }}>
        <DlgHeader icon={Policy} title={editingPolicy ? "Edit Policy" : "New Policy"} onClose={() => setPolicyDialogOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ mb: 2.5 }}><FL req>Title</FL><FieldInput fullWidth size="small" value={policyForm.title} onChange={e => setPolicyForm(p => ({ ...p, title: e.target.value }))} /></Box>
          <Box sx={{ mb: 2.5 }}><FL req>Content (HTML — version auto-generated)</FL><FieldInput fullWidth multiline rows={9} value={policyForm.content} onChange={e => setPolicyForm(p => ({ ...p, content: e.target.value }))} /></Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FL>Category</FL>
              <FormControl fullWidth size="small">
                <Select value={policyForm.category} onChange={e => setPolicyForm(p => ({ ...p, category: e.target.value }))} sx={selectSx}>
                  {[["privacy","Privacy Policy"],["terms","Terms of Service"],["data","Data Protection"],["security","Security Policy"],["general","General Policy"],["other","Other"]].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><FL>Display Order</FL><FieldInput fullWidth size="small" type="number" value={policyForm.display_order} onChange={e => setPolicyForm(p => ({ ...p, display_order: e.target.value }))} inputProps={{ min: 0 }} /></Grid>
          </Grid>
          <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={policyForm.is_active} onChange={e => setPolicyForm(p => ({ ...p, is_active: e.target.checked }))} size="small" sx={{ color: BD, "&.Mui-checked": { color: T.accent } }} />} label={<Typography sx={{ fontSize: "0.84rem" }}>Active</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, borderTop: `1px solid ${BD}`, bgcolor: "#f9f9f9" }}>
          <Btn outline onClick={() => setPolicyDialogOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSavePolicy} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : "Save Policy"}</Btn>
        </DialogActions>
      </Dialog>

      {/* Logout overlay */}
      {logoutOpen && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "#0f172a", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 }}>
          <Box sx={{ width: 56, height: 56, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", animation: "logout-fade 1.5s ease-in-out infinite" }}>Signing out…</Typography>
        </Box>
      )}

      {/* Toast */}
      {toast.open && (
        <Box sx={{ position: "fixed", bottom: 60, right: SIDEBAR_W - 270, zIndex: 1500 }}>
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 2.5, py: 1.5, bgcolor: "#0f172a",
            borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            minWidth: 260, border: `1px solid ${alpha(T.accent, 0.2)}`,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: toast.severity === "success" ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.84rem", color: "#fff", flex: 1, fontWeight: 500 }}>{toast.message}</Typography>
            <IconButton size="small" onClick={() => setToast(p => ({ ...p, open: false }))} sx={{ color: "rgba(255,255,255,0.4)", p: 0.25, "&:hover": { color: "#fff" } }}><Close sx={{ fontSize: 14 }} /></IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Settings;