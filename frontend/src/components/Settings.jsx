import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserInfo } from "../utils/auth";
import {
  Alert, TextField, Button, Box, Typography, InputAdornment, IconButton, Rating,
  Checkbox, FormControlLabel, Switch, Accordion, AccordionSummary, AccordionDetails,
  Chip, Grid, Dialog, DialogContent, DialogActions, Select, MenuItem, FormControl,
  alpha, Backdrop, Avatar, Card, CardContent, Tooltip,
} from "@mui/material";
import {
  LockOutlined, Visibility, VisibilityOff, ArrowBack, VerifiedUserOutlined,
  LockResetOutlined, CheckCircleOutline, MarkEmailReadOutlined,
  Email as EmailIcon, Settings as SettingsIcon, VpnKey, Shield,
  QuestionAnswer, Business, Policy, ContactSupport, Close,
  People as PeopleIcon, Add, Edit, Delete, Save, Cancel,
  CheckCircle, HelpOutline, ExpandMore, KeyboardArrowRight,
  AttachFile,
} from "@mui/icons-material";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { useSocket } from "../contexts/SocketContext";

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(30,41,59,0.3); }
    70%  { box-shadow: 0 0 0 8px rgba(30,41,59,0); }
    100% { box-shadow: 0 0 0 0 rgba(30,41,59,0); }
  }
  @keyframes laShimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes laPulse {
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
   STATIC TOKENS
───────────────────────────────────────────────────────────────────────────── */
const FALLBACK_P  = "#1e293b";
const FALLBACK_S  = "#334155";
const PAGE_BG     = "#f1f5f9";
const PANEL       = "#ffffff";
const BD          = "#e2e8f0";
const TXT         = "#0f172a";
const MUTED       = "#64748b";
const SUBTLE      = "#f8fafc";
const DARK        = "#0f172a";
const SIDEBAR_W   = 280;

/* ─────────────────────────────────────────────────────────────────────────────
   SKELETON ATOM
───────────────────────────────────────────────────────────────────────────── */
const LASkeletonBox = ({ width = "100%", height = 16, borderRadius = 8, sx = {} }) => (
  <Box sx={{
    width, height, borderRadius: `${borderRadius}px`, flexShrink: 0,
    background: "linear-gradient(90deg,rgba(30,41,59,0.05) 25%,rgba(30,41,59,0.12) 50%,rgba(30,41,59,0.05) 75%)",
    backgroundSize: "800px 100%",
    animation: "laShimmer 1.6s infinite linear",
    ...sx,
  }} />
);

/* ─────────────────────────────────────────────────────────────────────────────
   LOADING WIREFRAME
───────────────────────────────────────────────────────────────────────────── */
const SettingsWireframe = () => (
  <Box sx={{ minHeight: "100vh" }}>
    <style>{GLOBAL_CSS}</style>

    {/* Sidebar ghost */}
    <Box sx={{
      width: SIDEBAR_W, bgcolor: "#fff",
      borderLeft: `1px solid ${BD}`,
      position: "fixed", right: 0, top: 0, height: "100vh", zIndex: 1200,
      display: "flex", flexDirection: "column",
    }}>
      <Box sx={{
        px: 3, py: 2.5,
        borderBottom: `1px solid ${BD}`,
        display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
        animation: "laPulse 2s ease-in-out infinite",
      }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: alpha(FALLBACK_P, 0.08), flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <LASkeletonBox width="50%" height={11} borderRadius={4} sx={{ mb: 0.5 }} />
          <LASkeletonBox width="35%" height={8} borderRadius={3} />
        </Box>
      </Box>

      {[52, 44, 66, null, 40, 28, 36, 55].map((w, i) =>
        w === null ? (
          <Box key={i} sx={{ px: 3, pb: 0.5, pt: 1 }}>
            <LASkeletonBox width="38%" height={7} borderRadius={3} />
          </Box>
        ) : (
          <Box key={i} sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 3, py: 1.25,
            animation: `laPulse 2s ease-in-out ${i * 0.06}s infinite`,
            borderRadius: "0 6px 6px 0", mr: 1,
            ...(i === 0 ? { bgcolor: alpha(FALLBACK_P, 0.06) } : {}),
          }}>
            <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: alpha(FALLBACK_P, i === 0 ? 0.12 : 0.05), flexShrink: 0 }} />
            <LASkeletonBox width={`${w}%`} height={10} borderRadius={3} />
          </Box>
        )
      )}

      <Box sx={{ mt: "auto", px: 3, py: 2.5, borderTop: `1px solid ${BD}`, flexShrink: 0 }}>
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.25, py: 1, px: 1.5,
          borderRadius: 1.5, animation: "laPulse 2s ease-in-out 0.3s infinite",
        }}>
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: alpha(FALLBACK_P, 0.06), flexShrink: 0 }} />
          <LASkeletonBox width="55%" height={10} borderRadius={3} />
        </Box>
      </Box>
    </Box>

    {/* Main content ghost */}
    <Box sx={{
      width: "100vw", maxWidth: "100%",
      position: "relative", left: "63%", transform: "translateX(-61%)",
      boxSizing: "border-box",
      pl: { xs: 2, sm: 3, md: 6 },
      pr: `${SIDEBAR_W + 16}px`,
      py: { xs: 2, md: 4 },
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4, animation: "laPulse 2s ease-in-out infinite" }}>
        <LASkeletonBox width={55} height={9} borderRadius={3} />
        <LASkeletonBox width={6} height={9} borderRadius={3} />
        <LASkeletonBox width={110} height={9} borderRadius={3} />
        <Box sx={{ flex: 1 }} />
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1,
          px: 2, py: 0.6, bgcolor: "#fff", border: `1px solid ${BD}`, borderRadius: "16px",
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: alpha(FALLBACK_P, 0.2), flexShrink: 0 }} />
          <LASkeletonBox width={140} height={9} borderRadius={3} />
        </Box>
      </Box>

      <Box sx={{
        mb: 4, borderRadius: 2, overflow: "hidden",
        border: `1px solid ${BD}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        animation: "laPulse 2s ease-in-out 0.04s infinite",
      }}>
        <Box sx={{ p: 5, bgcolor: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: alpha(FALLBACK_P, 0.08), flexShrink: 0 }} />
          <Box>
            <LASkeletonBox width={240} height={22} borderRadius={6} sx={{ mb: 1 }} />
            <LASkeletonBox width={340} height={12} borderRadius={4} />
          </Box>
        </Box>
      </Box>

      <Box sx={{
        borderRadius: 2, overflow: "hidden",
        border: `1px solid ${BD}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        bgcolor: "#fff",
        animation: "laPulse 2s ease-in-out 0.14s infinite",
      }}>
        <Box sx={{
          px: 4, py: 2.5, bgcolor: "#fff",
          display: "flex", alignItems: "center", gap: 2,
          borderBottom: `1px solid ${BD}`,
        }}>
          <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: alpha(FALLBACK_P, 0.06), flexShrink: 0 }} />
          <Box>
            <LASkeletonBox width={170} height={13} borderRadius={4} sx={{ mb: 0.5 }} />
            <LASkeletonBox width={240} height={10} borderRadius={3} />
          </Box>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    bgcolor: i === 0 ? alpha(FALLBACK_P, 0.2) : alpha(FALLBACK_P, 0.06),
                  }} />
                  <LASkeletonBox width={i === 0 ? 80 : i === 1 ? 70 : 100} height={10} borderRadius={3} />
                </Box>
                {i < 2 && <Box sx={{ flex: 1, height: 1, bgcolor: BD, mx: 2 }} />}
              </React.Fragment>
            ))}
          </Box>

          <Box sx={{ border: `1px solid ${BD}`, bgcolor: SUBTLE, p: 3, borderRadius: 1.5 }}>
            <Box sx={{ display: "flex", mb: 2.5 }}>
              <Box sx={{ width: 3, bgcolor: alpha(FALLBACK_P, 0.3), borderRadius: "3px 0 0 3px", flexShrink: 0 }} />
              <Box sx={{ flex: 1, px: 2, py: 1.5, bgcolor: alpha(FALLBACK_P, 0.02), borderRadius: "0 6px 6px 0" }}>
                <LASkeletonBox width="80%" height={10} borderRadius={3} sx={{ mb: 0.5 }} />
                <LASkeletonBox width="55%" height={10} borderRadius={3} />
              </Box>
            </Box>
            <Box sx={{ mb: 2.5 }}>
              <LASkeletonBox width="16%" height={9} borderRadius={3} sx={{ mb: 0.75 }} />
              <Box sx={{ height: 42, borderRadius: 1.5, border: `1px solid ${BD}`, bgcolor: SUBTLE, display: "flex", alignItems: "center", px: 1.5, gap: 1 }}>
                <LASkeletonBox width="50%" height={12} borderRadius={3} />
                <Box sx={{ ml: "auto", width: 24, height: 24, borderRadius: "50%", bgcolor: alpha(FALLBACK_P, 0.05) }} />
              </Box>
            </Box>
            <Box sx={{ width: 180, height: 40, borderRadius: 1.5, bgcolor: alpha(FALLBACK_P, 0.12) }} />
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED ATOMS
───────────────────────────────────────────────────────────────────────────── */
const GlassCard = ({ children, sx = {} }) => (
  <Card elevation={0} sx={{
    bgcolor: PANEL, borderRadius: 2,
    border: `1px solid ${BD}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.2s ease", overflow: "visible",
    ...sx,
  }}>{children}</Card>
);

const SectionHeader = ({ icon: Icon, title, subtitle, action, P, S }) => (
  <Box sx={{
    px: 4, py: 2.5,
    bgcolor: "#fff",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 2, flexWrap: "wrap",
    borderBottom: `1px solid ${BD}`,
    borderRadius: "8px 8px 0 0",
  }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{
        bgcolor: alpha(P, 0.08), width: 44, height: 44,
        "& .MuiSvgIcon-root": { color: P, fontSize: 22 },
      }}>
        <Icon />
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: TXT, lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: "0.78rem", color: MUTED, mt: 0.15 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

const SectionHero = ({ icon: Icon, title, subtitle, P, S }) => (
  <GlassCard sx={{ mb: 3, overflow: "hidden" }}>
    <Box sx={{ p: { xs: 4, md: 5 }, bgcolor: "#fff" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <Avatar sx={{
          bgcolor: alpha(P, 0.08), width: 56, height: 56,
          "& .MuiSvgIcon-root": { color: P, fontSize: 28 },
        }}>
          <Icon />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 0.5, lineHeight: 1.2, color: TXT, letterSpacing: "-0.02em" }}>{title}</Typography>
          <Typography variant="body1" sx={{ color: MUTED }}>{subtitle}</Typography>
        </Box>
      </Box>
    </Box>
  </GlassCard>
);

const makeBtn = (P, S) => {
  const Btn = ({ children, danger, outline, sm, fullWidth, ...p }) => (
    <Button disableElevation fullWidth={fullWidth} variant={outline ? "outlined" : "contained"}
      sx={{
        borderRadius: 1.5, textTransform: "none", fontWeight: 600,
        fontSize: sm ? "0.78rem" : "0.85rem",
        py: sm ? 0.6 : 0.8, px: sm ? 2 : 2.5,
        boxShadow: "none",
        transition: "all 0.15s ease",
        ...(outline
          ? { borderColor: BD, color: TXT, "&:hover": { borderColor: P, bgcolor: alpha(P, 0.04), boxShadow: "none" } }
          : danger
            ? { bgcolor: "#dc2626", color: "#fff", "&:hover": { bgcolor: "#b91c1c" }, "&:disabled": { bgcolor: "#f1f5f9", color: "#94a3b8" } }
            : { bgcolor: P, color: "#fff", "&:hover": { bgcolor: S, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }, "&:disabled": { bgcolor: "#f1f5f9", color: "#94a3b8" } }),
      }} {...p}>{children}
    </Button>
  );
  return Btn;
};

const InfoBox = ({ children, P }) => (
  <Box sx={{
    display: "flex", mb: 3, px: 3, py: 2.5,
    bgcolor: alpha(P, 0.03),
    border: `1px solid ${alpha(P, 0.08)}`,
    borderRadius: 1.5,
    borderLeft: `3px solid ${alpha(P, 0.4)}`,
  }}>
    <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.7 }}>{children}</Typography>
  </Box>
);

const FL = ({ children, req, P }) => (
  <Typography sx={{
    fontSize: "0.78rem", fontWeight: 600, color: TXT, mb: 0.6, display: "block",
  }}>
    {children}{req && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
  </Typography>
);

const makeFX = (P) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5, bgcolor: "#fff", fontSize: "0.875rem",
    "& fieldset": { borderColor: BD },
    "&:hover fieldset": { borderColor: alpha(P, 0.3) },
    "&.Mui-focused fieldset": { borderColor: P },
  },
  "& .MuiInputBase-input": { py: "10px", px: "12px" },
});

const makeReadOnlyFX = (P) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5, bgcolor: SUBTLE, fontSize: "0.875rem",
    "& fieldset": { borderColor: BD, borderStyle: "dashed" },
    "&:hover fieldset": { borderColor: alpha(P, 0.15) },
  },
  "& .MuiInputBase-input": { py: "10px", px: "12px" },
  "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: TXT, fontWeight: 500 },
});

const makeMFX = (P) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5, bgcolor: "#fff", fontSize: "0.875rem",
    "& fieldset": { borderColor: BD },
    "&:hover fieldset": { borderColor: alpha(P, 0.3) },
    "&.Mui-focused fieldset": { borderColor: P },
  },
});

const Tag = ({ label, color }) => (
  <Box sx={{
    display: "inline-flex", alignItems: "center",
    px: 1.25, py: 0.2,
    bgcolor: alpha(color, 0.06),
    borderRadius: "4px",
  }}>
    <Typography sx={{
      fontSize: "0.62rem", fontWeight: 600, color: alpha(color, 0.8),
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>{label}</Typography>
  </Box>
);

const STATUS_LABELS  = { new: "New", on_process: "On Process", read: "Read", replied: "Replied", resolved: "Resolved" };
const STATUS_OPTIONS = [
  { value: "new", label: "New" }, { value: "read", label: "Read" },
  { value: "replied", label: "Replied" }, { value: "on_process", label: "On Process" },
  { value: "resolved", label: "Resolved" },
];

const StatusBadge = ({ status }) => {
  const map = {
    new: ["#92400e","#fef9c3","#eab308"], on_process: ["#7c2d12","#fff7ed","#f97316"],
    read: ["#1e40af","#eff6ff","#3b82f6"], replied: ["#166534","#f0fdf4","#22c55e"],
    resolved: ["#374151","#f9fafb","#6b7280"],
  };
  const [tc, bg] = map[status] || map.resolved;
  return (
    <Box sx={{
      px: 1.25, py: 0.2, bgcolor: bg, borderRadius: "4px", display: "inline-flex", alignItems: "center",
    }}>
      <Typography sx={{
        fontSize: "0.62rem", fontWeight: 600, color: tc,
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{STATUS_LABELS[status] || status}</Typography>
    </Box>
  );
};

const DlgHeader = ({ icon: Icon, title, onClose, P, S }) => (
  <Box sx={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    px: 3, py: 2, bgcolor: P, borderBottom: `1px solid ${alpha(P, 0.2)}`,
  }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)", width: 34, height: 34 }}>
        <Icon sx={{ fontSize: 16, color: "#fff" }} />
      </Avatar>
      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{title}</Typography>
    </Box>
    <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.6)", p: 0.5, "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}>
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
  const navigate         = useNavigate();
  const location         = useLocation();
  const _pendingTicketId       = useRef(null);
  const _pendingFromNotification = useRef(false);

  const P = sys?.primaryColor   || FALLBACK_P;
  const S = sys?.secondaryColor || FALLBACK_S;

  const Btn        = React.useMemo(() => makeBtn(P, S),      [P, S]);
  const FX         = React.useMemo(() => makeFX(P),          [P]);
  const MFX        = React.useMemo(() => makeMFX(P),         [P]);
  const ReadOnlyFX = React.useMemo(() => makeReadOnlyFX(P),  [P]);

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
  const [contactStatusFilter, setContactStatusFilter] = useState("new");
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
  const threadScrollRef                             = useRef(null);
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
  }, [pageLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!formData.currentPassword) { setErrMsg("Enter your current password."); return; }
    setLoading(true); setErrMsg("");
    try {
      const vr = await fetch(`${API_BASE_URL}/verify-current-password`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` }, body: JSON.stringify({ email: userEmail, currentPassword: formData.currentPassword }) });
      const vd = await vr.json();
      if (!vr.ok) { setErrMsg(vd.error || "Incorrect password."); return; }
      const r = await fetch(`${API_BASE_URL}/send-password-change-code`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` }, body: JSON.stringify({ email: userEmail }) });
      const d = await r.json();
      if (r.ok) { setCurrentStep(1); setShowVerifyModal(true); } else setErrMsg(d.error || "Failed to send code.");
    } catch { setErrMsg("Connection error."); } finally { setLoading(false); }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!formData.verificationCode) { setErrMsg("Enter the verification code."); return; }
    setLoading(true); setErrMsg("");
    try {
      const r = await fetch(`${API_BASE_URL}/verify-password-change-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: userEmail, code: formData.verificationCode }) });
      const d = await r.json();
      if (r.ok) setCurrentStep(2); else setErrMsg(d.error || "Invalid or expired code.");
    } catch { setErrMsg("Connection error."); } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) { setErrMsg("Passwords do not match."); return; }
    if (formData.newPassword.length < 6) { setErrMsg("Password must be at least 6 characters."); return; }
    if (!passwordConfirmed) { setErrMsg("Tick the confirmation checkbox."); return; }
    setLoading(true); setErrMsg("");
    try {
      const r = await fetch(`${API_BASE_URL}/complete-password-change`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: userEmail, newPassword: formData.newPassword, confirmPassword: formData.confirmPassword }) });
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
        const ar = statusOrder[a.status] || 99;
        const br = statusOrder[b.status] || 99;
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
  const sectionMeta = { password: "Change Password", email: "Email Settings", security: "Two-Factor Authentication", about: "About Us", faqs: "FAQs", policy: "Policies", contact: "Contact Support" };

  /* ── Password step forms ── */
  const renderStep = () => {
    switch (currentStep) {
      case 0: return (
        <Box component="form" onSubmit={handleRequestCode}>
          <InfoBox P={P}>{userEmail ? <>Enter your current password to verify identity. A one-time code will be sent to <strong style={{ color: TXT }}>{userEmail}</strong>.</> : <>No email linked. Configure one under <strong style={{ color: TXT }}>Email Settings</strong> first.</>}</InfoBox>
          <Box sx={{ mb: 3 }}>
            <FL req P={P}>Current Password</FL>
            <TextField fullWidth size="small" sx={FX} type={showPw.current ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleChanges}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} sx={{ color: MUTED }}>{showPw.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
          </Box>
          <Btn type="submit" disabled={loading || !userEmail} startIcon={<MarkEmailReadOutlined />}>{loading ? "Sending…" : "Send Verification Code"}</Btn>
        </Box>
      );
      case 1: return (
        <Box component="form" onSubmit={handleVerifyCode}>
          <InfoBox P={P}>A 6-digit code has been sent to <strong style={{ color: TXT }}>{userEmail}</strong>. Check your inbox.</InfoBox>
          <Box sx={{ mb: 3 }}>
            <FL req P={P}>Verification Code</FL>
            <TextField fullWidth size="small" sx={FX} name="verificationCode" value={formData.verificationCode} onChange={handleChanges}
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
          <InfoBox P={P}>Set a new password of at least 6 characters.</InfoBox>
          {[{ k: "new", name: "newPassword", lbl: "New Password" }, { k: "confirm", name: "confirmPassword", lbl: "Confirm New Password" }].map(({ k, name, lbl }) => (
            <Box key={k} sx={{ mb: 2.5 }}>
              <FL req P={P}>{lbl}</FL>
              <TextField fullWidth size="small" sx={FX} type={showPw[k] ? "text" : "password"} name={name} value={formData[name]} onChange={handleChanges}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))} sx={{ color: MUTED }}>{showPw[k] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
            </Box>
          ))}
          <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Checkbox checked={passwordConfirmed} onChange={e => setPasswordConfirmed(e.target.checked)} size="small" sx={{ mt: "-2px", p: 0.25, color: BD, "&.Mui-checked": { color: P } }} />
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
        bgcolor: active ? alpha(P, 0.07) : "transparent",
        transition: "all 0.12s ease",
        "&:hover": { bgcolor: active ? alpha(P, 0.07) : alpha(P, 0.03) },
      }}>
        <Icon sx={{ fontSize: 15, color: active ? P : MUTED, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.84rem", fontWeight: active ? 600 : 400, color: active ? TXT : MUTED, flex: 1 }}>{label}</Typography>
      </Box>
    );
  };

  const displayName  = [firstName, lastName].filter(Boolean).join(" ") || userEmail;
  const displayEmpNo = employeeNumber || "—";
  const displayEmail = userEmail || "—";

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Loading overlay */}
      <Backdrop open={loading} sx={{ zIndex: t => t.zIndex.drawer + 1, bgcolor: "rgba(15,23,42,0.4)" }}>
        <Box sx={{ textAlign: "center" }}>
          <Box sx={{ width: 36, height: 36, border: `2px solid ${alpha(P, 0.2)}`, borderTopColor: P, borderRadius: "50%", animation: "spin 0.7s linear infinite", mx: "auto" }} />
          <Typography sx={{ mt: 2, color: "#fff", fontSize: "0.8rem", fontWeight: 500 }}>Processing…</Typography>
        </Box>
      </Backdrop>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════ */}
      <Box sx={{
        width: '100vw', maxWidth: '100%',
        position: 'relative', left: '63%', transform: 'translateX(-61%)',
        boxSizing: 'border-box',
        pl: { xs: 2, sm: 3, md: 6 },
        pr: `${SIDEBAR_W + 16}px`,
        py: { xs: 2, md: 4 },
      }}>

        {/* Breadcrumb */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.78rem", color: MUTED }}>Settings</Typography>
          <Typography sx={{ color: BD, fontSize: "0.7rem" }}>/</Typography>
          <Typography sx={{ fontSize: "0.78rem", color: TXT, fontWeight: 600 }}>{sectionMeta[activeSection]}</Typography>
          <Box sx={{ flex: 1 }} />
          {firstName && lastName && (
            <Box sx={{
              display: "flex", alignItems: "center", gap: 1,
              px: 2, py: 0.5, bgcolor: PANEL, border: `1px solid ${BD}`,
              borderRadius: "20px",
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e", animation: "pulse-ring 2s infinite", flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.72rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{firstName} {lastName} · {employeeNumber}</Typography>
            </Box>
          )}
        </Box>

        {errMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5, fontWeight: 500, fontSize: "0.84rem" }} onClose={() => setErrMsg("")}>{errMsg}</Alert>}

        {/* ── CHANGE PASSWORD ─────────────────────────────────── */}
        {activeSection === "password" && (
          <>
            <SectionHero P={P} S={S} icon={VpnKey} title="Change Password" subtitle="Update your account password with three-step verification" />
            <GlassCard sx={{ mb: 4 }}>
              <SectionHeader P={P} S={S} icon={VpnKey} title="Password Update" subtitle="Identity verification required" />
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                  {STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          bgcolor: i <= currentStep ? P : "transparent",
                          border: `1.5px solid ${i <= currentStep ? P : BD}`,
                          transition: "all 0.2s ease",
                          ...(i === currentStep ? { boxShadow: `0 0 0 3px ${alpha(P, 0.12)}` } : {}),
                        }}>
                          {i < currentStep
                            ? <CheckCircle sx={{ fontSize: 14, color: "#fff" }} />
                            : <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", fontWeight: 600, color: i <= currentStep ? "#fff" : MUTED }}>{i + 1}</Typography>}
                        </Box>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: i === currentStep ? 600 : 400, color: i === currentStep ? TXT : MUTED, whiteSpace: "nowrap" }}>{label}</Typography>
                      </Box>
                      {i < STEPS.length - 1 && <Box sx={{ flex: 1, height: 1, bgcolor: i < currentStep ? P : BD, mx: 2, transition: "background-color 0.2s ease" }} />}
                    </React.Fragment>
                  ))}
                </Box>
                <Box sx={{ border: `1px solid ${BD}`, bgcolor: SUBTLE, p: 3.5, borderRadius: 1.5 }}>
                  {renderStep()}
                </Box>
              </CardContent>
            </GlassCard>
          </>
        )}

        {/* ── EMAIL SETTINGS ──────────────────────────────────── */}
        {activeSection === "email" && (
          <>
            <SectionHero P={P} S={S} icon={EmailIcon} title="Email Settings" subtitle="Manage the email address linked to your account" />
            <GlassCard sx={{ mb: 4 }}>
              <SectionHeader P={P} S={S} icon={EmailIcon} title={userEmail ? "Update Email Address" : "Add Email Address"} subtitle="Used for notifications and two-factor codes" />
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <InfoBox P={P}>{userEmail ? "Update the email address linked to your account." : "No email is associated. Add one to enable 2FA."}</InfoBox>
                {userEmail && (
                  <Box sx={{
                    mb: 3, p: 2.5, bgcolor: SUBTLE, border: `1px solid ${BD}`, borderRadius: 1.5,
                    display: "flex", alignItems: "center", gap: 2,
                  }}>
                    <Avatar sx={{ bgcolor: alpha(P, 0.06), width: 36, height: 36 }}><EmailIcon sx={{ color: P, fontSize: 18 }} /></Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.65rem", color: MUTED, fontWeight: 600, mb: 0.15, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Email</Typography>
                      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.84rem", color: TXT, fontWeight: 500 }}>{userEmail}</Typography>
                    </Box>
                  </Box>
                )}
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}><FL req P={P}>{userEmail ? "New Email Address" : "Email Address"}</FL><TextField fullWidth size="small" sx={FX} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@organisation.ph" /></Grid>
                  <Grid item xs={12} md={6}><FL req P={P}>Confirm Address</FL><TextField fullWidth size="small" sx={FX} value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="Re-enter address" /></Grid>
                </Grid>
                <Box sx={{ mt: 3 }}>
                  <Btn onClick={handleUpdateEmail} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : userEmail ? "Update Email" : "Add Email"}</Btn>
                </Box>
              </CardContent>
            </GlassCard>
          </>
        )}

        {/* ── SECURITY / 2FA ──────────────────────────────────── */}
        {activeSection === "security" && (
          <>
            <GlassCard sx={{ mb: 4 }}>
              <SectionHeader P={P} S={S} icon={Shield} title="Two-Factor Authentication" subtitle="Add an extra layer of security to your account" />
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <InfoBox P={P}>When enabled, a 6-digit one-time code is required at each login.</InfoBox>
                <Box sx={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  p: 3, mb: 4, border: `1px solid ${BD}`, borderRadius: 1.5,
                  bgcolor: enableMFA ? alpha(P, 0.02) : SUBTLE,
                }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: TXT, fontSize: "0.95rem", mb: 0.25 }}>Two-Factor Authentication</Typography>
                    <Typography sx={{ fontSize: "0.84rem", color: MUTED }}>{enableMFA ? "Active — OTP required at each login." : "Inactive — password login only."}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Tag label={enableMFA ? "ENABLED" : "DISABLED"} color={enableMFA ? "#16a34a" : MUTED} />
                    <Switch checked={enableMFA} onChange={handleToggleMFA} disabled={loading}
                      sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: P }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: P } }} />
                  </Box>
                </Box>
                <Box sx={{ border: `1px solid ${BD}`, borderRadius: 1.5, overflow: "hidden" }}>
                  <Box sx={{ px: 3, py: 1.5, bgcolor: SUBTLE, borderBottom: `1px solid ${BD}` }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase" }}>Protocol Overview</Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    {[
                      "After entering your password, a 6-digit code is dispatched to your registered email.",
                      "Enter the code on the verification screen within 15 minutes to complete login.",
                      "Each code is single-use and expires automatically.",
                      "You may toggle 2FA at any time from this panel.",
                    ].map((t, i) => (
                      <Box key={i} sx={{ display: "flex", gap: 2, mb: i < 3 ? 2 : 0, p: 1.5, borderRadius: 1, bgcolor: i % 2 === 0 ? SUBTLE : "transparent" }}>
                        <Box sx={{
                          width: 24, height: 24, borderRadius: "50%", bgcolor: P,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "#fff" }}>0{i + 1}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.7, pt: "2px" }}>{t}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </>
        )}

        {/* ── ABOUT US ────────────────────────────────────────── */}
        {activeSection === "about" && (
          <>
            <GlassCard sx={{ mb: 4 }}>
              <SectionHeader P={P} S={S} icon={Business} title="About Us" subtitle="View and edit the organization information"
                action={isAdmin && (
                  <Btn sm outline startIcon={aboutEditMode ? <Cancel sx={{ fontSize: 14 }} /> : <Edit sx={{ fontSize: 14 }} />}
                    onClick={() => aboutEditMode ? setAboutEditMode(false) : (setAboutForm({ title: aboutUs?.title || "", content: aboutUs?.content || "", version: aboutUs?.version || "" }), setAboutEditMode(true))}>
                    {aboutEditMode ? "Cancel" : "Edit"}
                  </Btn>
                )}
              />
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                {aboutEditMode ? (
                  <>
                    <Box sx={{ mb: 2.5 }}><FL req P={P}>Title</FL><TextField fullWidth size="small" sx={FX} value={aboutForm.title} onChange={e => setAboutForm(p => ({ ...p, title: e.target.value }))} /></Box>
                    <Box sx={{ mb: 2.5 }}><FL req P={P}>Content (HTML supported)</FL><TextField fullWidth multiline rows={12} sx={MFX} value={aboutForm.content} onChange={e => setAboutForm(p => ({ ...p, content: e.target.value }))} /></Box>
                    <Box sx={{ mb: 3 }}><FL P={P}>Version</FL><TextField fullWidth size="small" sx={FX} value={aboutForm.version} onChange={e => setAboutForm(p => ({ ...p, version: e.target.value }))} placeholder="e.g. 2.1.0" /></Box>
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Btn outline onClick={() => setAboutEditMode(false)}>Cancel</Btn>
                      <Btn onClick={handleSaveAbout} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : "Save Changes"}</Btn>
                    </Box>
                  </>
                ) : aboutUs ? (
                  <>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 3, pb: 2.5, borderBottom: `1px solid ${BD}` }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "1.3rem", color: TXT }}>{aboutUs.title}</Typography>
                      {aboutUs.version && <Tag label={`v${aboutUs.version}`} color={P} />}
                    </Box>
                    <Box sx={{ "& h2,& h3,& h4": { color: P, mt: 2.5, mb: 1 }, "& p": { mb: 1.5, lineHeight: 1.8, color: MUTED }, "& ul": { pl: 3, mb: 1.5 }, "& li": { mb: 0.5, lineHeight: 1.8, color: MUTED } }} dangerouslySetInnerHTML={{ __html: aboutUs.content }} />
                  </>
                ) : (
                  <Box sx={{ py: 10, textAlign: "center" }}>
                    <Business sx={{ fontSize: 44, color: BD, mb: 1.5 }} />
                    <Typography sx={{ color: MUTED }}>No content available.</Typography>
                  </Box>
                )}
              </CardContent>
            </GlassCard>
          </>
        )}

        {/* ── FAQs ────────────────────────────────────────────── */}
        {activeSection === "faqs" && (
          <>
            <GlassCard sx={{ mb: 4 }}>
              <SectionHeader P={P} S={S} icon={QuestionAnswer} title="Frequently Asked Questions" subtitle="View and manage FAQs for employees"
                action={isAdmin && (
                  <Btn sm startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={() => { setEditingFaq(null); setFaqForm({ question: "", answer: "", category: "general", display_order: 0, is_active: true }); setFaqDialogOpen(true); }}>
                    Add FAQ
                  </Btn>
                )}
              />
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                {faqs.length > 0 ? faqs.map(faq => (
                  <Box key={faq.id} sx={{ border: `1px solid ${BD}`, mb: 1, borderRadius: 1.5, overflow: "hidden", transition: "border-color 0.15s", "&:hover": { borderColor: alpha(P, 0.3) } }}>
                    <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMore sx={{ color: MUTED, fontSize: 20 }} />}
                        sx={{ px: 3, minHeight: 52, "& .MuiAccordionSummary-content": { alignItems: "center", my: 1, gap: 1.5 } }}>
                        <HelpOutline sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 500, color: TXT, fontSize: "0.875rem", flex: 1 }}>{faq.question}</Typography>
                        {faq.category && <Tag label={faq.category} color={P} />}
                        {isAdmin && (
                          <Box sx={{ display: "flex", gap: 0.25, ml: 0.5 }}>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category || "general", display_order: faq.display_order || 0, is_active: faq.is_active !== false }); setFaqDialogOpen(true); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: P } }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeleteFaq(faq.id); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: "#dc2626" } }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                          </Box>
                        )}
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 4, py: 2.5, bgcolor: SUBTLE }}>
                        <Typography sx={{ fontSize: "0.875rem", color: MUTED, lineHeight: 1.8 }}>{faq.answer}</Typography>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )) : (
                  <Box sx={{ py: 10, textAlign: "center" }}>
                    <QuestionAnswer sx={{ fontSize: 44, color: BD, mb: 1.5 }} />
                    <Typography sx={{ color: MUTED }}>No FAQs on record.</Typography>
                  </Box>
                )}
              </CardContent>
            </GlassCard>
          </>
        )}

        {/* ── POLICIES ────────────────────────────────────────── */}
        {activeSection === "policy" && (
          <>
            <GlassCard sx={{ mb: 4 }}>
              <SectionHeader P={P} S={S} icon={Policy} title="Policies & Terms" subtitle="View and manage organisational policies"
                action={isAdmin && (
                  <Btn sm startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={() => { setEditingPolicy(null); setPolicyForm({ title: "", content: "", category: "privacy", display_order: 0, is_active: true }); setPolicyDialogOpen(true); }}>
                    Add Policy
                  </Btn>
                )}
              />
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                {policies.length > 0 ? policies.map(policy => (
                  <Box key={policy.id} sx={{ border: `1px solid ${BD}`, mb: 1, borderRadius: 1.5, overflow: "hidden", transition: "border-color 0.15s", "&:hover": { borderColor: alpha(P, 0.3) } }}>
                    <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMore sx={{ color: MUTED, fontSize: 20 }} />}
                        sx={{ px: 3, minHeight: 52, "& .MuiAccordionSummary-content": { alignItems: "center", my: 1, gap: 1.5 } }}>
                        <Policy sx={{ fontSize: 17, color: MUTED, flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 500, color: TXT, fontSize: "0.875rem", flex: 1 }}>{policy.title}</Typography>
                        {policy.category && <Tag label={policy.category} color={P} />}
                        {policy.version && <Tag label={`v${policy.version}`} color={MUTED} />}
                        {isAdmin && (
                          <Box sx={{ display: "flex", gap: 0.25, ml: 0.5 }}>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingPolicy(policy); setPolicyForm({ title: policy.title, content: policy.content, category: policy.category || "privacy", display_order: policy.display_order || 0, is_active: policy.is_active !== false }); setPolicyDialogOpen(true); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: P } }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeletePolicy(policy.id); }} sx={{ color: MUTED, p: 0.5, "&:hover": { color: "#dc2626" } }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                          </Box>
                        )}
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 4, py: 2.5, bgcolor: SUBTLE }}>
                        <Box sx={{ fontSize: "0.875rem", color: MUTED, lineHeight: 1.8, "& h2,& h3": { color: P, mt: 2, mb: 1 }, "& p": { mb: 1.5 }, "& ul": { pl: 3, mb: 1.5 }, "& li": { mb: 0.5 } }} dangerouslySetInnerHTML={{ __html: policy.content }} />
                        {policy.updated_at && <Typography sx={{ mt: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: MUTED }}>Last updated: {new Date(policy.updated_at).toLocaleString()}</Typography>}
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )) : (
                  <Box sx={{ py: 10, textAlign: "center" }}>
                    <Policy sx={{ fontSize: 44, color: BD, mb: 1.5 }} />
                    <Typography sx={{ color: MUTED }}>No policies on record.</Typography>
                  </Box>
                )}
              </CardContent>
            </GlassCard>
          </>
        )}

        {/* ── CONTACT SUPPORT ───────────────────────────────────────── */}
        {activeSection === "contact" && (
          <>
            <GlassCard sx={{ mb: -40, overflow: "hidden" }}>
              <SectionHeader P={P} S={S} icon={ContactSupport} title="Contact Support" subtitle="View and manage your communications with us"
                action={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {!isAdmin && <Btn sm startIcon={<Add sx={{ fontSize: 14 }} />} onClick={() => { setSelectedSub(null); setContactView("compose"); }}>New Message</Btn>}
                    <Btn sm outline onClick={() => fetchTickets(selectedSub?.id)}>Refresh</Btn>
                  </Box>
                }
              />
              <CardContent sx={{ p: { xs: 3, md: 4 }, "&:last-child": { pb: { xs: 3, md: 4 } } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, gap: 3, alignItems: "start" }}>

                  {/* ── Inbox / Conversation List ── */}
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography sx={{ fontSize: "0.68rem", color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>Conversations</Typography>
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select value={contactStatusFilter} onChange={e => setContactStatusFilter(e.target.value)}
                          sx={{ borderRadius: 1.5, bgcolor: "#fff", fontSize: "0.75rem", fontWeight: 500, "& .MuiOutlinedInput-notchedOutline": { borderColor: BD } }}>
                          <MenuItem value="all">All</MenuItem>
                          {STATUS_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ border: `1px solid ${BD}`, borderRadius: 1.5, height: 520, overflowY: "auto", bgcolor: "#fff" }}>
                      {filteredContactSubmissions.length > 0 ? filteredContactSubmissions.map(sub => {
                        const isActive = selectedSub?.id === sub.id && contactView === "thread";
                        return (
                          <Box key={sub.id}
                            onClick={() => { setSelectedSub(sub); setAdminReply(sub.admin_notes || ""); setContactView("thread"); if (isAdmin && sub.status === "new") handleUpdateSubStatus(sub.id, "read", null); }}
                            sx={{
                              px: 2.5, py: 2, borderBottom: `1px solid ${alpha(BD, 0.6)}`, cursor: "pointer",
                              bgcolor: isActive ? alpha(P, 0.04) : "transparent",
                              transition: "background-color 0.1s",
                              "&:hover": { bgcolor: isActive ? alpha(P, 0.04) : SUBTLE },
                              "&:last-child": { borderBottom: "none" },
                            }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
                              <Typography sx={{ fontSize: "0.84rem", fontWeight: 500, color: TXT, flex: 1, lineHeight: 1.3 }}>
                                {sub.name || "Unknown"}
                                {sub.employee_number && (
                                  <Box component="span" sx={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: MUTED,
                                    ml: 0.75, px: 0.6, py: 0.1, borderRadius: 0.5,
                                    bgcolor: SUBTLE, border: `1px solid ${BD}`,
                                  }}>#{sub.employee_number}</Box>
                                )}
                              </Typography>
                              <StatusBadge status={sub.status} />
                            </Box>
                            <Typography sx={{ fontSize: "0.8rem", color: isActive ? TXT : MUTED, fontWeight: isActive ? 500 : 400, mb: 0.25, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {sub.subject || "General Inquiry"}
                            </Typography>
                            <Typography sx={{ fontSize: "0.68rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                              {new Date(sub.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            </Typography>
                          </Box>
                        );
                      }) : (
                        <Box sx={{ py: 6, textAlign: "center" }}>
                          <ContactSupport sx={{ fontSize: 32, color: BD, mb: 1 }} />
                          <Typography sx={{ color: MUTED, fontSize: "0.84rem" }}>{contactStatusFilter === "all" ? "No conversations yet." : "No conversations in this status."}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* ── Thread / Composer Panel ── */}
                  <Box sx={{ border: `1px solid ${BD}`, borderRadius: 1.5, height: 565, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#fff" }}>

                    {contactView === "compose" && (
                      <Box sx={{ p: 3.5, flex: 1, overflowY: "auto" }}>
                        <Typography sx={{ fontSize: "0.68rem", color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600, mb: 2.5 }}>New Message</Typography>
                        <Box sx={{ mb: 3, p: 2, bgcolor: SUBTLE, border: `1px solid ${BD}`, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                          <LockOutlined sx={{ fontSize: 15, color: MUTED, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.78rem", color: MUTED, lineHeight: 1.5 }}>
                            Sender identity is locked to your account.
                          </Typography>
                        </Box>
                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={4}>
                            <FL P={P}>Full Name</FL>
                            <TextField fullWidth size="small" sx={ReadOnlyFX} value={displayName} disabled
                              InputProps={{ endAdornment: <InputAdornment position="end"><LockOutlined sx={{ fontSize: 13, color: BD }} /></InputAdornment> }} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <FL P={P}>Employee No.</FL>
                            <TextField fullWidth size="small"
                              sx={{ ...ReadOnlyFX, "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: TXT, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 } }}
                              value={displayEmpNo} disabled
                              InputProps={{ endAdornment: <InputAdornment position="end"><LockOutlined sx={{ fontSize: 13, color: BD }} /></InputAdornment> }} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <FL P={P}>Email Address</FL>
                            <TextField fullWidth size="small" sx={ReadOnlyFX} value={displayEmail} disabled
                              InputProps={{ endAdornment: <InputAdornment position="end"><LockOutlined sx={{ fontSize: 13, color: BD }} /></InputAdornment> }} />
                          </Grid>
                          <Grid item xs={12}>
                            <FL P={P}>Subject</FL>
                            <TextField fullWidth size="small" sx={FX} value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief description of your concern" />
                          </Grid>
                          <Grid item xs={12}>
                            <FL req P={P}>Message</FL>
                            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                              <IconButton component="label" size="small" sx={{ mt: 0.5, border: `1px solid ${BD}`, borderRadius: 1, color: MUTED, "&:hover": { borderColor: P, color: P } }}>
                                <AttachFile sx={{ fontSize: 16 }} /><input type="file" hidden onChange={e => setContactAttachment(e.target.files?.[0] || null)} />
                              </IconButton>
                              <TextField fullWidth multiline rows={4} sx={MFX} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} onPaste={e => handlePasteAttachment(e, setContactAttachment)} placeholder="Describe your concern in detail…" />
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
                        <Box sx={{
                          px: 3, py: 2, borderBottom: `1px solid ${BD}`,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          bgcolor: SUBTLE, flexShrink: 0,
                        }}>
                          <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedSub.subject || "General Inquiry"}</Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: MUTED }}>
                              {selectedSub.name}
                              {selectedSub.employee_number && <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: MUTED, ml: 0.75 }}>#{selectedSub.employee_number}</Box>}
                              {" · "}{new Date(selectedSub.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <StatusBadge status={selectedSub.status} />
                        </Box>
                        <Box ref={threadScrollRef} sx={{ flex: 1, overflowY: "auto", p: 2.5, minHeight: 0 }}>
                          {messagesLoading ? (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                              <Box sx={{ width: 24, height: 24, border: `2px solid ${alpha(P, 0.15)}`, borderTopColor: P, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
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
                                      bgcolor: isMe ? alpha(P, 0.06) : "#fff",
                                      border: `1px solid ${isMe ? alpha(P, 0.12) : BD}`,
                                      borderRadius: isMe ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                                    }}>
                                      <Typography sx={{ fontSize: "0.68rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mb: 0.5, fontWeight: 500 }}>
                                        {isMe ? "You" : (msg.sender_name || (msg.sender_role ? msg.sender_role : "Support"))}
                                      </Typography>
                                      <Typography sx={{ fontSize: "0.84rem", color: TXT, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message}</Typography>
                                      {msg.attachment && <Typography component="a" href={`${API_BASE_URL}${msg.attachment}`} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-block", mt: 0.5, fontSize: "0.75rem", color: P, textDecoration: "none", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>View attachment</Typography>}
                                      <Typography sx={{ fontSize: "0.65rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mt: 0.75 }}>{new Date(msg.created_at).toLocaleString()}</Typography>
                                    </Box>
                                  </Box>
                                );
                              })
                          )}
                        </Box>
                        <Box sx={{ p: 2.5, borderTop: `1px solid ${BD}`, display: "flex", flexDirection: "column", gap: 1.5, flexShrink: 0 }}>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <IconButton component="label" size="small" disabled={selectedSub.status === "resolved"} sx={{ mt: 0.5, border: `1px solid ${BD}`, borderRadius: 1, color: MUTED, "&:hover": { borderColor: P, color: P } }}>
                              <AttachFile sx={{ fontSize: 16 }} /><input type="file" hidden onChange={e => setReplyAttachment(e.target.files?.[0] || null)} />
                            </IconButton>
                            <TextField fullWidth multiline rows={2} sx={MFX} value={adminReply} onChange={e => setAdminReply(e.target.value)} onPaste={e => handlePasteAttachment(e, setReplyAttachment)}
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
                          <ContactSupport sx={{ fontSize: 44, color: BD, mb: 1.5 }} />
                          <Typography sx={{ color: MUTED }}>Select a conversation to view it</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </>
        )}

      </Box>
      {/* ══ END MAIN CONTENT ══════════════════════════════════════════ */}

      {/* ══ SIDEBAR ═══════════════════════════════════════════════════ */}
      <Box sx={{
        width: SIDEBAR_W, bgcolor: "#fff",
        borderLeft: `1px solid ${BD}`,
        display: "flex", flexDirection: "column",
        position: "fixed", right: 0, top: 0, height: "100vh",
        overflowY: "auto", zIndex: 1200,
      }}>
        <Box sx={{
          px: 3, py: 2.5,
          borderBottom: `1px solid ${BD}`,
          display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
        }}>
          <Box sx={{
            width: 30, height: 30, bgcolor: P,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 1, flexShrink: 0,
          }}>
            <SettingsIcon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: TXT, lineHeight: 1.2 }}>Settings</Typography>
            <Typography sx={{ fontSize: "0.62rem", color: MUTED, letterSpacing: "0.03em" }}>HRIS Platform</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, pt: 1 }}>
          <Typography sx={{
            fontSize: "0.62rem", fontWeight: 600, color: MUTED,
            letterSpacing: "0.08em", textTransform: "uppercase",
            px: 4, pb: 0.5, pt: 0.75,
          }}>Account</Typography>
          <NavItem section="password" icon={VpnKey}        label="Change Password" />
          <NavItem section="email"    icon={EmailIcon}     label="Email Settings"  />
          <NavItem section="security" icon={Shield}        label="Two-Factor Auth"  />

          <Typography sx={{
            fontSize: "0.62rem", fontWeight: 600, color: MUTED,
            letterSpacing: "0.08em", textTransform: "uppercase",
            px: 4, pb: 0.5, pt: 1.5,
          }}>Information</Typography>
          <NavItem section="about"   icon={Business}       label="About Us"        />
          <NavItem section="faqs"    icon={QuestionAnswer} label="FAQs"             />
          <NavItem section="policy"  icon={Policy}         label="Policies"         />
          <NavItem section="contact" icon={ContactSupport} label="Contact Support"  />
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

      {/* ══ MODALS ════════════════════════════════════════════════════ */}

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" } }}>
        <DlgHeader P={P} S={S} icon={ContactSupport} title="Ticket Feedback" onClose={() => setFeedbackOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          {isAdmin && (
            <Box sx={{ border: `1px solid ${BD}`, bgcolor: SUBTLE, maxHeight: 320, overflowY: "auto", p: 2.5, mb: 2, borderRadius: 1.5 }}>
              {feedbackLoading
                ? <Typography sx={{ color: MUTED, textAlign: "center", py: 4 }}>Loading...</Typography>
                : feedbackMessages.length > 0 ? feedbackMessages.map(msg => {
                    const isMe = (msg.sender_employee_number && String(msg.sender_employee_number) === String(employeeNumber)) || (msg.sender_email && msg.sender_email === userEmail);
                    return (
                      <Box key={msg.id} sx={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", mb: 2 }}>
                        <Box sx={{ maxWidth: "75%", px: 2.5, py: 2, bgcolor: isMe ? alpha(P, 0.06) : "#fff", border: `1px solid ${isMe ? alpha(P, 0.12) : BD}`, borderRadius: "10px" }}>
                          <Typography sx={{ fontSize: "0.72rem", color: MUTED, fontFamily: "'JetBrains Mono', monospace", mb: 0.5, fontWeight: 500 }}>{isMe ? "You" : (msg.sender_name || "User")}</Typography>
                          <Typography sx={{ fontSize: "0.84rem", color: TXT, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{msg.message}</Typography>
                          {msg.rating && <Box sx={{ mt: 0.5 }}><Rating value={Number(msg.rating)} readOnly size="small" /></Box>}
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
                <Typography sx={{ fontWeight: 600, fontSize: "0.78rem", color: TXT, mb: 0.75 }}>Rating</Typography>
                <Rating value={feedbackRating} onChange={(e, v) => setFeedbackRating(v || 0)} size="large" />
              </Box>
              <Typography sx={{ fontWeight: 600, fontSize: "0.78rem", color: TXT, mb: 0.75 }}>Comment</Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1.5 }}>
                <IconButton component="label" size="small" sx={{ mt: 0.5, border: `1px solid ${BD}`, borderRadius: 1, color: MUTED, "&:hover": { borderColor: P, color: P } }}>
                  <AttachFile sx={{ fontSize: 16 }} /><input type="file" hidden onChange={e => setFeedbackAttachment(e.target.files?.[0] || null)} />
                </IconButton>
                <TextField fullWidth multiline rows={3} sx={MFX} value={feedbackReply} onChange={e => setFeedbackReply(e.target.value)} onPaste={e => handlePasteAttachment(e, setFeedbackAttachment)} placeholder="Write your feedback..." />
              </Box>
              {feedbackAttachment && <Chip size="small" label={feedbackAttachment.name} onDelete={() => setFeedbackAttachment(null)} sx={{ bgcolor: SUBTLE, border: `1px solid ${BD}` }} />}
            </>
          )}
          {!isAdmin && feedbackSubmitted && (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <CheckCircleOutline sx={{ fontSize: 44, color: "#16a34a", mb: 1.5 }} />
              <Typography sx={{ fontWeight: 600, color: TXT }}>Thank you for your feedback!</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Btn outline onClick={() => setFeedbackOpen(false)}>Close</Btn>
          {!isAdmin && !feedbackSubmitted && <Btn onClick={handleSendFeedback} disabled={loading || (!feedbackReply.trim() && !feedbackAttachment && !feedbackRating)} startIcon={<Save />}>{loading ? "Sending..." : "Send Feedback"}</Btn>}
        </DialogActions>
      </Dialog>

      {/* Verify modal */}
      {showVerifyModal && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400, backdropFilter: "blur(4px)" }}>
          <Box sx={{ bgcolor: PANEL, borderRadius: 2, width: "90%", maxWidth: 420, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <Box sx={{ bgcolor: P, px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)", width: 32, height: 32 }}><MarkEmailReadOutlined sx={{ color: "#fff", fontSize: 16 }} /></Avatar>
              <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>Code Dispatched</Typography>
            </Box>
            <Box sx={{ p: 3.5 }}>
              <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.75, mb: 3 }}>A 6-digit code has been sent to <strong style={{ color: TXT }}>{userEmail}</strong>. Enter it to continue.</Typography>
              <Btn fullWidth onClick={() => setShowVerifyModal(false)}>Acknowledge</Btn>
            </Box>
          </Box>
        </Box>
      )}

      {/* Password changed modal */}
      {showSuccessModal && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400, backdropFilter: "blur(4px)" }}>
          <Box sx={{ bgcolor: PANEL, borderRadius: 2, width: "90%", maxWidth: 420, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <Box sx={{ bgcolor: "#16a34a", px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)", width: 32, height: 32 }}><CheckCircleOutline sx={{ color: "#fff", fontSize: 16 }} /></Avatar>
              <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>Password Updated</Typography>
            </Box>
            <Box sx={{ p: 3.5 }}>
              <Typography sx={{ fontSize: "0.84rem", color: MUTED, lineHeight: 1.75, mb: 3 }}>Your password has been changed. You will be signed out momentarily for security.</Typography>
              <Btn fullWidth startIcon={<LockOutlined />} onClick={handleSuccessClose}>Continue</Btn>
            </Box>
          </Box>
        </Box>
      )}

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onClose={() => setFaqDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" } }}>
        <DlgHeader P={P} S={S} icon={QuestionAnswer} title={editingFaq ? "Edit FAQ" : "New FAQ"} onClose={() => setFaqDialogOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ mb: 2.5 }}><FL req P={P}>Question</FL><TextField fullWidth size="small" sx={FX} value={faqForm.question} onChange={e => setFaqForm(p => ({ ...p, question: e.target.value }))} /></Box>
          <Box sx={{ mb: 2.5 }}><FL req P={P}>Answer</FL><TextField fullWidth multiline rows={5} sx={MFX} value={faqForm.answer} onChange={e => setFaqForm(p => ({ ...p, answer: e.target.value }))} /></Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FL P={P}>Category</FL>
              <FormControl fullWidth size="small">
                <Select value={faqForm.category} onChange={e => setFaqForm(p => ({ ...p, category: e.target.value }))} sx={{ borderRadius: 1.5, bgcolor: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: BD } }}>
                  {["general","password","email","account","technical","other"].map(c => <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><FL P={P}>Display Order</FL><TextField fullWidth size="small" sx={FX} type="number" value={faqForm.display_order} onChange={e => setFaqForm(p => ({ ...p, display_order: e.target.value }))} inputProps={{ min: 0 }} /></Grid>
          </Grid>
          <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={faqForm.is_active} onChange={e => setFaqForm(p => ({ ...p, is_active: e.target.checked }))} size="small" sx={{ color: BD, "&.Mui-checked": { color: P } }} />} label={<Typography sx={{ fontSize: "0.84rem" }}>Active</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Btn outline onClick={() => setFaqDialogOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSaveFaq} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : "Save FAQ"}</Btn>
        </DialogActions>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" } }}>
        <DlgHeader P={P} S={S} icon={Policy} title={editingPolicy ? "Edit Policy" : "New Policy"} onClose={() => setPolicyDialogOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ mb: 2.5 }}><FL req P={P}>Title</FL><TextField fullWidth size="small" sx={FX} value={policyForm.title} onChange={e => setPolicyForm(p => ({ ...p, title: e.target.value }))} /></Box>
          <Box sx={{ mb: 2.5 }}><FL req P={P}>Content (HTML — version auto-generated)</FL><TextField fullWidth multiline rows={9} sx={MFX} value={policyForm.content} onChange={e => setPolicyForm(p => ({ ...p, content: e.target.value }))} /></Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FL P={P}>Category</FL>
              <FormControl fullWidth size="small">
                <Select value={policyForm.category} onChange={e => setPolicyForm(p => ({ ...p, category: e.target.value }))} sx={{ borderRadius: 1.5, bgcolor: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: BD } }}>
                  {[["privacy","Privacy Policy"],["terms","Terms of Service"],["data","Data Protection"],["security","Security Policy"],["general","General Policy"],["other","Other"]].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><FL P={P}>Display Order</FL><TextField fullWidth size="small" sx={FX} type="number" value={policyForm.display_order} onChange={e => setPolicyForm(p => ({ ...p, display_order: e.target.value }))} inputProps={{ min: 0 }} /></Grid>
          </Grid>
          <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={policyForm.is_active} onChange={e => setPolicyForm(p => ({ ...p, is_active: e.target.checked }))} size="small" sx={{ color: BD, "&.Mui-checked": { color: P } }} />} label={<Typography sx={{ fontSize: "0.84rem" }}>Active</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Btn outline onClick={() => setPolicyDialogOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSavePolicy} disabled={loading} startIcon={<Save />}>{loading ? "Saving…" : "Save Policy"}</Btn>
        </DialogActions>
      </Dialog>

      {/* Logout overlay */}
      {logoutOpen && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: DARK, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 }}>
          <Box sx={{ width: 56, height: 56, border: `2px solid rgba(255,255,255,0.1)`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", animation: "logout-fade 1.5s ease-in-out infinite" }}>Signing out…</Typography>
        </Box>
      )}

      {/* Toast */}
      {toast.open && (
        <Box sx={{ position: "fixed", bottom: 28, right: SIDEBAR_W + 16, zIndex: 1500 }}>
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 2.5, py: 1.5, bgcolor: TXT,
            borderRadius: 1.5,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            minWidth: 260,
          }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: "50%",
              bgcolor: toast.severity === "success" ? "#22c55e" : "#ef4444", flexShrink: 0,
            }} />
            <Typography sx={{ fontSize: "0.84rem", color: "#fff", flex: 1, fontWeight: 500 }}>{toast.message}</Typography>
            <IconButton size="small" onClick={() => setToast(p => ({ ...p, open: false }))} sx={{ color: "rgba(255,255,255,0.4)", p: 0.25, "&:hover": { color: "#fff" } }}><Close sx={{ fontSize: 14 }} /></IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Settings;