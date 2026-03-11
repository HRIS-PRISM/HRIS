import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getUserInfo } from "../utils/auth";
import {
  Alert, TextField, Button, Box, Typography, InputAdornment, IconButton,
  Checkbox, FormControlLabel, Stepper, Step, StepLabel, Switch,
  Accordion, AccordionSummary, AccordionDetails, Chip, Grid, Divider,
  Dialog, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableHead, TableRow, Select, MenuItem, FormControl, Badge, alpha,
  Backdrop, CircularProgress,
} from "@mui/material";
import {
  LockOutlined, Visibility, VisibilityOff, ArrowBack, VerifiedUserOutlined,
  LockResetOutlined, CheckCircleOutline, MarkEmailReadOutlined,
  Email as EmailIcon, Settings as SettingsIcon, VpnKey, Shield,
  QuestionAnswer, Business, Policy, ContactSupport, Close,
  People as PeopleIcon, Add, Edit, Delete, Visibility as VisibilityIcon,
  Save, Cancel, CheckCircle, Error as ErrorIcon, HelpOutline,
  ExpandMore, KeyboardArrowRight, Logout as LogoutIcon,
} from "@mui/icons-material";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES + FONT IMPORT
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(137,68,68,0.35); }
    70%  { box-shadow: 0 0 0 10px rgba(137,68,68,0); }
    100% { box-shadow: 0 0 0 0 rgba(137,68,68,0); }
  }
  @keyframes shimmer-sweep {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes logout-fade {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }
  @keyframes logout-float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-8px); }
  }

  * { font-family: 'IBM Plex Sans', sans-serif; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SHIMMER SKELETON
───────────────────────────────────────────────────────────────────────────── */
const ShimmerBase = {
  background: "linear-gradient(90deg, #ebebeb 25%, #d8d8d8 50%, #ebebeb 75%)",
  backgroundSize: "600px 100%",
  animation: "shimmer-sweep 1.4s infinite linear",
};

const Bone = ({ w = "100%", h = 13, r = 2, mb = 0 }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, mb: mb / 8, flexShrink: 0, ...ShimmerBase }} />
);

const SkeletonRow = ({ cols = [40, 25, 20, 15] }) => (
  <Box sx={{ display: "flex", gap: 2, py: 1.5, borderBottom: "1px solid #f0f0f0", alignItems: "center" }}>
    {cols.map((w, i) => <Bone key={i} w={`${w}%`} h={11} />)}
  </Box>
);

const SettingsWireframe = () => (
  <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f0f1f3", fontFamily: "'IBM Plex Sans', sans-serif" }}>
    <style>{GLOBAL_CSS}</style>
    {/* Sidebar skeleton */}
    <Box sx={{ width: 260, flexShrink: 0, bgcolor: "#15181f", borderRight: "1px solid #0a0c11" }}>
      <Box sx={{ height: 56, borderBottom: "1px solid #252831", px: 2.5, display: "flex", alignItems: "center" }}>
        <Bone w="60%" h={14} r={2} />
      </Box>
      <Box sx={{ px: 2, pt: 2.5 }}>
        {[0,1,2].map(i => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.35, px: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: "#2a2d36", flexShrink: 0 }} />
            <Bone w={`${50+i*10}%`} h={11} r={2} />
          </Box>
        ))}
        <Box sx={{ height: 1, bgcolor: "#252831", my: 2 }} />
        {[0,1,2,3].map(i => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.35, px: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: "#2a2d36", flexShrink: 0 }} />
            <Bone w={`${45+i*8}%`} h={11} r={2} />
          </Box>
        ))}
      </Box>
    </Box>
    {/* Content skeleton */}
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Box sx={{ height: 48, bgcolor: "#fff", borderBottom: "1px solid #e4e4e4", display: "flex", alignItems: "center", px: 3, gap: 2 }}>
        <Bone w="12%" h={11} />
        <Bone w="1%" h={11} />
        <Bone w="14%" h={11} />
      </Box>
      <Box sx={{ p: 3.5 }}>
        <Box sx={{ bgcolor: "#fff", border: "1px solid #e4e4e4", mb: 3 }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: "3px solid #ebebeb", display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ width: 4, height: 20, bgcolor: "#d8d8d8", borderRadius: 1 }} />
            <Bone w="25%" h={14} />
          </Box>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
              {[0,1,2].map(i => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#e8e8e8" }} />
                  <Bone w={70} h={11} />
                </Box>
              ))}
            </Box>
            {[0,1].map(i => (
              <Box key={i} sx={{ mb: 3 }}>
                <Bone w="22%" h={10} mb={8} />
                <Bone w="100%" h={40} r={2} />
              </Box>
            ))}
            <Bone w="35%" h={40} r={2} />
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const Settings = () => {
  const { settings: sys } = useSystemSettings();
  const navigate = useNavigate();

  /* state */
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
  const [contactForm, setContactForm]               = useState({ name: "", email: "earisthrmstesting@gmail.com", subject: "", message: "" });
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [selectedSub, setSelectedSub]               = useState(null);
  const [subDialogOpen, setSubDialogOpen]           = useState(false);
  const [showTickets, setShowTickets]               = useState(false);
  const [adminReply, setAdminReply]                 = useState("");
  const [faqDialogOpen, setFaqDialogOpen]           = useState(false);
  const [editingFaq, setEditingFaq]                 = useState(null);
  const [faqForm, setFaqForm]                       = useState({ question: "", answer: "", category: "general", display_order: 0, is_active: true });
  const [aboutEditMode, setAboutEditMode]           = useState(false);
  const [aboutForm, setAboutForm]                   = useState({ title: "", content: "", version: "" });
  const [policyDialogOpen, setPolicyDialogOpen]     = useState(false);
  const [editingPolicy, setEditingPolicy]           = useState(null);
  const [policyForm, setPolicyForm]                 = useState({ title: "", content: "", category: "privacy", display_order: 0, is_active: true });
  const [toast, setToast]                           = useState({ open: false, message: "", severity: "success" });

  const employeeNumber = localStorage.getItem("employeeNumber");

  /* palette — driven by system settings */
  const P  = sys?.primaryColor       || "#894444";
  const S  = sys?.secondaryColor     || "#6d2323";

  /* fixed design tokens */
  const DARK     = "#15181f";        // sidebar bg
  const DARK2    = "#1e2130";        // sidebar hover
  const DARK_BD  = "#252a36";        // sidebar borders
  const PAGE_BG  = "#f0f1f3";        // page bg
  const PANEL    = "#ffffff";        // content panels
  const BD       = "#e2e4e8";        // content borders
  const TXT      = "#111827";        // primary text
  const MUTED    = "#6b7280";        // secondary text
  const SUBTLE   = "#f7f8fa";        // field bg

  const STEPS = ["Verify Identity", "Enter Code", "Set New Password"];

  useEffect(() => { const i = getUserInfo(); if (i?.role) setUserRole(i.role); }, []);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) { setErrMsg("Session expired."); setTimeout(() => (window.location.href = "/"), 2000); return; }
    try { const d = JSON.parse(atob(token.split(".")[1])); setUserEmail(d.email); } catch { setErrMsg("Invalid session."); setTimeout(() => (window.location.href = "/"), 2000); }
    (async () => {
      try {
        const [f, a, p] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/faqs`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/api/about-us`).catch(() => ({ data: null })),
          axios.get(`${API_BASE_URL}/api/policies`).catch(() => ({ data: [] })),
        ]);
        setFaqs(f.data); setAboutUs(a.data); setPolicies(p.data);
        if (employeeNumber) {
          try {
            const r = await axios.get(`${API_BASE_URL}/api/user-preferences/${employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } });
            setEnableMFA(r.data.enable_mfa === 1 || r.data.enable_mfa === true);
          } catch {}
        }
      } finally { setPageLoading(false); }
    })();
  }, [employeeNumber]);

  const notify = (msg, sev = "success") => setToast({ open: true, message: msg, severity: sev });
  const tok    = () => localStorage.getItem("token") || sessionStorage.getItem("token");

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
  const handleLogout       = () => { setLogoutOpen(true); setTimeout(() => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/"; }, 1500); };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.message) { setErrMsg("Name and message are required."); return; }
    setLoading(true); setErrMsg("");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/contact-us`, contactForm, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.status === 200 || res.status === 201) { notify("Message submitted."); setContactForm({ name: "", email: "earisthrmstesting@gmail.com", subject: "", message: "" }); }
    } catch { setErrMsg("Connection error."); } finally { setLoading(false); }
  };

  const fetchTickets = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/contact-us`, { headers: { Authorization: `Bearer ${tok()}` } });
      setContactSubmissions(r.data.data || r.data || []);
    } catch {}
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question || !faqForm.answer) { setErrMsg("Question and answer required."); return; }
    setLoading(true); setErrMsg("");
    try {
      if (editingFaq) await axios.put(`${API_BASE_URL}/api/faqs/${editingFaq.id}`, faqForm, { headers: { Authorization: `Bearer ${tok()}` } });
      else await axios.post(`${API_BASE_URL}/api/faqs`, faqForm, { headers: { Authorization: `Bearer ${tok()}` } });
      setFaqDialogOpen(false);
      const r = await axios.get(`${API_BASE_URL}/api/faqs`); setFaqs(r.data);
      notify(editingFaq ? "FAQ updated." : "FAQ created.");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed to save."); } finally { setLoading(false); }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/faqs/${id}`, { headers: { Authorization: `Bearer ${tok()}` } });
      const r = await axios.get(`${API_BASE_URL}/api/faqs`); setFaqs(r.data); notify("FAQ deleted.");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleSaveAbout = async () => {
    if (!aboutForm.title || !aboutForm.content) { setErrMsg("Title and content required."); return; }
    setLoading(true); setErrMsg("");
    try {
      await axios.put(`${API_BASE_URL}/api/about-us`, aboutForm, { headers: { Authorization: `Bearer ${tok()}` } });
      setAboutEditMode(false);
      const r = await axios.get(`${API_BASE_URL}/api/about-us`); setAboutUs(r.data); notify("About Us updated.");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleUpdateSubStatus = async (id, status, adminNotes = null) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/contact-us/${id}`, { status, admin_notes: adminNotes }, { headers: { Authorization: `Bearer ${tok()}` } });
      notify(adminNotes ? "Reply sent." : "Status updated."); fetchTickets();
      if (selectedSub) setSelectedSub(p => ({ ...p, status: status || p.status, admin_notes: adminNotes !== null ? adminNotes : p.admin_notes }));
      if (adminNotes) setAdminReply("");
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
      setPolicyDialogOpen(false);
      const pr = await axios.get(`${API_BASE_URL}/api/policies`); setPolicies(pr.data);
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm("Delete this policy?")) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/policies/${id}`, { headers: { Authorization: `Bearer ${tok()}` } });
      const r = await axios.get(`${API_BASE_URL}/api/policies`); setPolicies(r.data); notify("Policy deleted.");
    } catch (err) { setErrMsg(err.response?.data?.error || "Failed."); } finally { setLoading(false); }
  };

  if (pageLoading) return <SettingsWireframe />;

  const isAdmin = ["superadmin", "administrator", "technical"].includes(userRole);

  /* ── DESIGN ATOMS ─────────────────────────────────────────────────────── */

  /* Field label — mono uppercase tracking */
  const FL = ({ children, req }) => (
    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", fontWeight: 600, color: MUTED, letterSpacing: "0.10em", textTransform: "uppercase", mb: 0.75, display: "block" }}>
      {children}{req && <span style={{ color: "#c0392b", marginLeft: 3 }}>*</span>}
    </Typography>
  );

  /* Base text field */
  const FX = { "& .MuiOutlinedInput-root": { borderRadius: "3px", bgcolor: SUBTLE, fontSize: "0.9rem", fontFamily: "'IBM Plex Sans', sans-serif", "& fieldset": { borderColor: BD, borderWidth: "1px" }, "&:hover fieldset": { borderColor: alpha(P, 0.5) }, "&.Mui-focused fieldset": { borderColor: P, borderWidth: "2px" } }, "& .MuiInputBase-input": { py: "10px", px: "14px" } };
  const MFX = { "& .MuiOutlinedInput-root": { borderRadius: "3px", bgcolor: SUBTLE, fontSize: "0.9rem", fontFamily: "'IBM Plex Sans', sans-serif", "& fieldset": { borderColor: BD, borderWidth: "1px" }, "&:hover fieldset": { borderColor: alpha(P, 0.5) }, "&.Mui-focused fieldset": { borderColor: P, borderWidth: "2px" } } };

  /* Primary button */
  const Btn = ({ children, danger, outline, sm, ...p }) => (
    <Button disableElevation variant={outline ? "outlined" : "contained"}
      sx={{ borderRadius: "3px", textTransform: "none", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: sm ? "0.78rem" : "0.875rem", letterSpacing: "0.015em", py: sm ? 0.6 : 1, px: sm ? 1.5 : 2.5, boxShadow: "none",
        ...(outline ? { borderColor: alpha(P, 0.6), color: P, "&:hover": { borderColor: P, bgcolor: alpha(P, 0.05) } }
                    : danger ? { bgcolor: "#b91c1c", color: "#fff", "&:hover": { bgcolor: "#991b1b" }, "&:disabled": { bgcolor: "#e5e7eb", color: "#9ca3af" } }
                              : { bgcolor: P, color: "#fff", "&:hover": { bgcolor: S }, "&:disabled": { bgcolor: "#e5e7eb", color: "#9ca3af" } }),
      }} {...p}>{children}</Button>
  );

  /* Inline accent bar + section title */
  const SectionTitle = ({ icon: Icon, title, action }) => (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2.25, borderBottom: `1px solid ${BD}`, bgcolor: PANEL }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 3, height: 22, bgcolor: P, borderRadius: "2px", flexShrink: 0 }} />
        <Icon sx={{ fontSize: 18, color: P }} />
        <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: TXT, letterSpacing: "0.01em" }}>{title}</Typography>
      </Box>
      {action}
    </Box>
  );

  /* Call-out info box */
  const InfoBox = ({ children }) => (
    <Box sx={{ display: "flex", gap: 0, mb: 3 }}>
      <Box sx={{ width: 3, bgcolor: P, flexShrink: 0 }} />
      <Box sx={{ flex: 1, px: 2, py: 1.75, bgcolor: alpha(P, 0.04), border: `1px solid ${alpha(P, 0.15)}`, borderLeft: "none" }}>
        <Typography sx={{ fontSize: "0.875rem", color: TXT, lineHeight: 1.75, fontFamily: "'IBM Plex Sans', sans-serif" }}>{children}</Typography>
      </Box>
    </Box>
  );

  /* Tag/pill */
  const Tag = ({ label, color = P }) => (
    <Box sx={{ display: "inline-block", px: 1.25, py: 0.15, bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.3)}`, borderRadius: "2px" }}>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", fontWeight: 600, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</Typography>
    </Box>
  );

  /* Status badge */
  const StatusBadge = ({ status }) => {
    const map = { new: ["#92400e", "#fef3c7", "#d97706"], read: ["#1e3a5f", "#dbeafe", "#2563eb"], replied: ["#14532d", "#dcfce7", "#16a34a"], resolved: ["#374151", "#f3f4f6", "#6b7280"] };
    const [tc, bg, bc] = map[status] || map.resolved;
    return <Box sx={{ px: 1.25, py: 0.2, bgcolor: bg, border: `1px solid ${alpha(bc, 0.4)}`, borderRadius: "2px", display: "inline-block" }}>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: tc, letterSpacing: "0.1em", textTransform: "uppercase" }}>{status}</Typography>
    </Box>;
  };

  /* Sidebar nav item */
  const NavItem = ({ section, icon: Icon, label }) => {
    const active = activeSection === section;
    return (
      <Box onClick={() => setActiveSection(section)} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.3, cursor: "pointer", borderLeft: active ? `3px solid ${P}` : "3px solid transparent", bgcolor: active ? alpha(P, 0.14) : "transparent", "&:hover": { bgcolor: active ? alpha(P, 0.14) : "rgba(255,255,255,0.04)" } }}>
        <Icon sx={{ fontSize: 16, color: active ? P : "rgba(255,255,255,0.45)", flexShrink: 0 }} />
        <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.845rem", fontWeight: active ? 600 : 400, color: active ? "#fff" : "rgba(255,255,255,0.6)", flex: 1 }}>{label}</Typography>
        {active && <KeyboardArrowRight sx={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }} />}
      </Box>
    );
  };

  const NavDivider = ({ label }) => (
    <>
      <Box sx={{ height: 1, bgcolor: DARK_BD, mx: 2.5, my: 1.5 }} />
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em", textTransform: "uppercase", px: 2.5, pb: 0.75 }}>{label}</Typography>
    </>
  );

  /* Dialog chrome */
  const DlgHeader = ({ icon: Icon, title, onClose }) => (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2.25, bgcolor: DARK, borderBottom: `1px solid ${DARK_BD}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Icon sx={{ fontSize: 18, color: P }} />
        <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#fff", letterSpacing: "0.02em" }}>{title}</Typography>
      </Box>
      <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.5)", p: 0.5, "&:hover": { color: "#fff" } }}><Close sx={{ fontSize: 17 }} /></IconButton>
    </Box>
  );

  /* ── Step forms ─────────────────────────────────────────────────────────── */
  const renderStep = () => {
    switch (currentStep) {
      case 0: return (
        <Box component="form" onSubmit={handleRequestCode}>
          <InfoBox>{userEmail ? <>Enter your current password to verify your identity. A one-time code will be sent to <strong>{userEmail}</strong>.</> : <>No email is linked to this account. Configure one under <strong>Email Settings</strong> before proceeding.</>}</InfoBox>
          <Box sx={{ mb: 3 }}>
            <FL req>Current Password</FL>
            <TextField fullWidth size="small" sx={FX} type={showPw.current ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleChanges}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} sx={{ color: MUTED }}>{showPw.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
          </Box>
          <Btn type="submit" disabled={loading || !userEmail} startIcon={<MarkEmailReadOutlined sx={{ fontSize: 17 }} />}>{loading ? "Sending…" : "Send Verification Code"}</Btn>
        </Box>
      );
      case 1: return (
        <Box component="form" onSubmit={handleVerifyCode}>
          <InfoBox>A 6-digit code has been sent to <strong>{userEmail}</strong>. Check your inbox and enter it below.</InfoBox>
          <Box sx={{ mb: 3 }}>
            <FL req>Verification Code</FL>
            <TextField fullWidth size="small" sx={FX} name="verificationCode" value={formData.verificationCode} onChange={handleChanges}
              inputProps={{ maxLength: 6, style: { textAlign: "center", fontSize: "2rem", letterSpacing: "0.7rem", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", padding: "14px" } }} />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Btn outline onClick={() => setCurrentStep(0)} startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>Back</Btn>
            <Btn type="submit" disabled={loading} startIcon={<VerifiedUserOutlined sx={{ fontSize: 17 }} />}>{loading ? "Verifying…" : "Verify Code"}</Btn>
          </Box>
        </Box>
      );
      case 2: return (
        <Box component="form" onSubmit={handleResetPassword}>
          <InfoBox>Set a new password of at least 6 characters.</InfoBox>
          {[{ k: "new", name: "newPassword", lbl: "New Password" }, { k: "confirm", name: "confirmPassword", lbl: "Confirm New Password" }].map(({ k, name, lbl }) => (
            <Box key={k} sx={{ mb: 2.5 }}>
              <FL req>{lbl}</FL>
              <TextField fullWidth size="small" sx={FX} type={showPw[k] ? "text" : "password"} name={name} value={formData[name]} onChange={handleChanges}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))} sx={{ color: MUTED }}>{showPw[k] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
            </Box>
          ))}
          <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Checkbox checked={passwordConfirmed} onChange={e => setPasswordConfirmed(e.target.checked)} size="small" sx={{ mt: "-2px", p: 0.25, color: BD, "&.Mui-checked": { color: P } }} />
            <Typography sx={{ fontSize: "0.85rem", color: TXT, lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif", cursor: "pointer" }} onClick={() => setPasswordConfirmed(!passwordConfirmed)}>I confirm that I want to change my account password.</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Btn outline onClick={() => setCurrentStep(1)} startIcon={<ArrowBack sx={{ fontSize: 16 }} />}>Back</Btn>
            <Btn type="submit" disabled={!passwordConfirmed || loading} startIcon={<LockResetOutlined sx={{ fontSize: 17 }} />}>{loading ? "Updating…" : "Update Password"}</Btn>
          </Box>
        </Box>
      );
      default: return null;
    }
  };

  /* ────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────── */
  const sectionMeta = { password: "Change Password", email: "Email Settings", security: "Two-Factor Auth", about: "About Us", faqs: "FAQs", policy: "Policies", contact: "Contact Us" };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: PAGE_BG, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      <Backdrop open={loading} sx={{ zIndex: t => t.zIndex.drawer + 1, bgcolor: "rgba(0,0,0,0.5)" }}>
        <Box sx={{ textAlign: "center" }}>
          <Box sx={{ width: 48, height: 48, border: `3px solid ${alpha(P, 0.3)}`, borderTopColor: P, borderRadius: "50%", animation: "spin 0.8s linear infinite", mx: "auto" }} />
          <Typography sx={{ mt: 2, color: "#fff", fontSize: "0.85rem", fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>Processing…</Typography>
        </Box>
      </Backdrop>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <Box sx={{ width: 256, flexShrink: 0, bgcolor: DARK, borderRight: `1px solid ${DARK_BD}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Sidebar header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${DARK_BD}`, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, bgcolor: P, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", flexShrink: 0 }}>
            <SettingsIcon sx={{ fontSize: 17, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#fff", lineHeight: 1.2 }}>Settings</Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>HRIS Platform</Typography>
          </Box>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, pt: 1.5 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.14em", textTransform: "uppercase", px: 2.5, pb: 0.75 }}>Account</Typography>
          <NavItem section="password" icon={VpnKey}       label="Change Password" />
          <NavItem section="email"    icon={EmailIcon}    label="Email Settings" />
          <NavItem section="security" icon={Shield}       label="Two-Factor Auth" />
          <NavDivider label="Information" />
          <NavItem section="about"   icon={Business}       label="About Us" />
          <NavItem section="faqs"    icon={QuestionAnswer} label="FAQs" />
          <NavItem section="policy"  icon={Policy}         label="Policies" />
          <NavItem section="contact" icon={ContactSupport} label="Contact Us" />
        </Box>

        {/* Sidebar footer */}
        <Box sx={{ px: 2.5, py: 2, borderTop: `1px solid ${DARK_BD}` }}>
          {userRole !== "staff" && (
            <Box onClick={() => navigate("/users-list")} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, cursor: "pointer", color: "rgba(255,255,255,0.45)", "&:hover": { color: "rgba(255,255,255,0.8)" }, mb: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.82rem" }}>User Management</Typography>
            </Box>
          )}
          <Box onClick={handleLogout} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, cursor: "pointer", color: "rgba(255,255,255,0.45)", "&:hover": { color: "#ef4444" } }}>
            <LogoutIcon sx={{ fontSize: 15 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.82rem" }}>Log Out</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <Box sx={{ height: 48, bgcolor: PANEL, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", px: 3, gap: 1.5, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: MUTED }}>Settings</Typography>
          <Typography sx={{ color: BD, fontSize: "0.75rem" }}>/</Typography>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: P, fontWeight: 600 }}>{sectionMeta[activeSection]}</Typography>
          <Box sx={{ flex: 1 }} />
          {userEmail && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.5, bgcolor: SUBTLE, border: `1px solid ${BD}`, borderRadius: "3px" }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22c55e", animation: "pulse-ring 2s infinite", flexShrink: 0 }} />
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: MUTED }}>{userEmail}</Typography>
            </Box>
          )}
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, p: 3.5, overflowY: "auto" }}>

          {/* Global error */}
          {errMsg && <Alert severity="error" sx={{ mb: 2.5, borderRadius: "3px", fontSize: "0.85rem", fontFamily: "'IBM Plex Sans', sans-serif" }} onClose={() => setErrMsg("")}>{errMsg}</Alert>}

          {/* ── Change Password ── */}
          {activeSection === "password" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={VpnKey} title="Change Password" />
              <Box sx={{ p: 3.5 }}>
                {/* Custom stepper */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 0 }}>
                  {STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: i < currentStep ? P : i === currentStep ? P : BD, border: `2px solid ${i <= currentStep ? P : BD}`, flexShrink: 0 }}>
                          {i < currentStep ? <CheckCircle sx={{ fontSize: 14, color: "#fff" }} /> : <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", fontWeight: 700, color: i === currentStep ? "#fff" : MUTED }}>{i + 1}</Typography>}
                        </Box>
                        <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.8rem", fontWeight: i === currentStep ? 700 : 400, color: i === currentStep ? TXT : MUTED, whiteSpace: "nowrap" }}>{label}</Typography>
                      </Box>
                      {i < STEPS.length - 1 && <Box sx={{ flex: 1, height: 1, bgcolor: i < currentStep ? P : BD, mx: 1.5, minWidth: 24 }} />}
                    </React.Fragment>
                  ))}
                </Box>
                <Box sx={{ border: `1px solid ${BD}`, bgcolor: SUBTLE, p: 3 }}>
                  {renderStep()}
                </Box>
              </Box>
            </Box>
          )}

          {/* ── Email ── */}
          {activeSection === "email" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={EmailIcon} title={userEmail ? "Email Settings" : "Add Email Address"} />
              <Box sx={{ p: 3.5 }}>
                <InfoBox>{userEmail ? "Update the email address linked to your account. Notifications and verification codes are sent here." : "No email is associated with this account. Add one to enable notifications and two-factor authentication."}</InfoBox>
                {userEmail && <Box sx={{ mb: 3 }}>
                  <FL>Current Address</FL>
                  <Box sx={{ px: "14px", py: "10px", bgcolor: "#f0f1f3", border: `1px solid ${BD}`, borderRadius: "3px", display: "flex", alignItems: "center", gap: 1.5 }}>
                    <EmailIcon sx={{ fontSize: 16, color: MUTED }} />
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.85rem", color: MUTED }}>{userEmail}</Typography>
                  </Box>
                </Box>}
                <Box sx={{ mb: 2.5 }}><FL req>{userEmail ? "New Email Address" : "Email Address"}</FL><TextField fullWidth size="small" sx={FX} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@organisation.ph" /></Box>
                <Box sx={{ mb: 3.5 }}><FL req>Confirm Address</FL><TextField fullWidth size="small" sx={FX} value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="Re-enter address" /></Box>
                <Btn onClick={handleUpdateEmail} disabled={loading} startIcon={<Save sx={{ fontSize: 16 }} />}>{loading ? "Saving…" : userEmail ? "Update Email" : "Add Email"}</Btn>
              </Box>
            </Box>
          )}

          {/* ── Security ── */}
          {activeSection === "security" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={Shield} title="Two-Factor Authentication (2FA / OTP)" />
              <Box sx={{ p: 3.5 }}>
                <InfoBox>When enabled, a 6-digit one-time code is required after each successful password entry at login.</InfoBox>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2.5, mb: 3, border: `1px solid ${BD}`, bgcolor: SUBTLE }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: TXT, fontSize: "0.9rem", mb: 0.3, fontFamily: "'IBM Plex Sans', sans-serif" }}>Two-Factor Authentication</Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: MUTED, fontFamily: "'IBM Plex Sans', sans-serif" }}>{enableMFA ? "Active — OTP required at each login." : "Inactive — password login only."}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Tag label={enableMFA ? "ENABLED" : "DISABLED"} color={enableMFA ? "#16a34a" : MUTED} />
                    <Switch checked={enableMFA} onChange={handleToggleMFA} disabled={loading} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: P }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: P } }} />
                  </Box>
                </Box>
                <Box sx={{ border: `1px solid ${BD}` }}>
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: SUBTLE, borderBottom: `1px solid ${BD}` }}>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", fontWeight: 600, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>Protocol Overview</Typography>
                  </Box>
                  <Box sx={{ p: 2.5 }}>
                    {["After entering your password, a 6-digit code is dispatched to your registered email.", "Enter the code on the verification screen within 15 minutes to complete login.", "Each code is single-use and expires automatically.", "You may toggle 2FA at any time from this panel."].map((t, i) => (
                      <Box key={i} sx={{ display: "flex", gap: 2, mb: i < 3 ? 1.5 : 0 }}>
                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", fontWeight: 700, color: P, flexShrink: 0, width: 18, pt: "3px" }}>0{i + 1}</Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: TXT, lineHeight: 1.7, fontFamily: "'IBM Plex Sans', sans-serif" }}>{t}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* ── About Us ── */}
          {activeSection === "about" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={Business} title="About Us"
                action={isAdmin && <Btn sm outline startIcon={aboutEditMode ? <Cancel sx={{ fontSize: 14 }} /> : <Edit sx={{ fontSize: 14 }} />} onClick={() => aboutEditMode ? setAboutEditMode(false) : (setAboutForm({ title: aboutUs?.title || "", content: aboutUs?.content || "", version: aboutUs?.version || "" }), setAboutEditMode(true))}>{aboutEditMode ? "Cancel" : "Edit"}</Btn>} />
              <Box sx={{ p: 3.5 }}>
                {aboutEditMode ? (
                  <>
                    <Box sx={{ mb: 2.5 }}><FL req>Title</FL><TextField fullWidth size="small" sx={FX} name="title" value={aboutForm.title} onChange={e => setAboutForm(p => ({ ...p, title: e.target.value }))} /></Box>
                    <Box sx={{ mb: 2.5 }}><FL req>Content <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(HTML supported)</span></FL><TextField fullWidth multiline rows={12} sx={MFX} name="content" value={aboutForm.content} onChange={e => setAboutForm(p => ({ ...p, content: e.target.value }))} /></Box>
                    <Box sx={{ mb: 3 }}><FL>Version</FL><TextField fullWidth size="small" sx={FX} name="version" value={aboutForm.version} onChange={e => setAboutForm(p => ({ ...p, version: e.target.value }))} placeholder="e.g. 2.1.0" /></Box>
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Btn outline onClick={() => setAboutEditMode(false)}>Cancel</Btn>
                      <Btn onClick={handleSaveAbout} disabled={loading} startIcon={<Save sx={{ fontSize: 16 }} />}>{loading ? "Saving…" : "Save Changes"}</Btn>
                    </Box>
                  </>
                ) : aboutUs ? (
                  <>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 2.5, pb: 2, borderBottom: `1px solid ${BD}` }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", color: TXT, fontFamily: "'IBM Plex Sans', sans-serif" }}>{aboutUs.title}</Typography>
                      {aboutUs.version && <Tag label={`v${aboutUs.version}`} />}
                    </Box>
                    <Box sx={{ "& h2, & h3, & h4": { color: P, mt: 2.5, mb: 1, fontFamily: "'IBM Plex Sans', sans-serif" }, "& p": { mb: 1.5, lineHeight: 1.8, color: TXT, fontFamily: "'IBM Plex Sans', sans-serif" }, "& ul": { pl: 3, mb: 1.5 }, "& li": { mb: 0.5, lineHeight: 1.8, color: TXT, fontFamily: "'IBM Plex Sans', sans-serif" } }} dangerouslySetInnerHTML={{ __html: aboutUs.content }} />
                  </>
                ) : <Typography sx={{ color: MUTED, textAlign: "center", py: 6, fontFamily: "'IBM Plex Sans', sans-serif" }}>No content available.</Typography>}
              </Box>
            </Box>
          )}

          {/* ── FAQs ── */}
          {activeSection === "faqs" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={QuestionAnswer} title="Frequently Asked Questions"
                action={isAdmin && <Btn sm startIcon={<Add sx={{ fontSize: 14 }} />} onClick={() => { setEditingFaq(null); setFaqForm({ question: "", answer: "", category: "general", display_order: 0, is_active: true }); setFaqDialogOpen(true); }}>Add</Btn>} />
              <Box sx={{ p: 3.5 }}>
                {faqs.length > 0 ? faqs.map((faq, idx) => (
                  <Box key={faq.id} sx={{ border: `1px solid ${BD}`, mb: 1.5 }}>
                    <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMore sx={{ color: P, fontSize: 20 }} />}
                        sx={{ px: 2.5, minHeight: 52, bgcolor: SUBTLE, borderBottom: `1px solid ${BD}`, "& .MuiAccordionSummary-content": { alignItems: "center", my: 1.25, gap: 1.5 } }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: P, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: "#fff" }}>{(idx + 1).toString().padStart(2, "0")}</Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 600, color: TXT, fontSize: "0.875rem", flex: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>{faq.question}</Typography>
                        {faq.category && <Tag label={faq.category} />}
                        {isAdmin && (
                          <Box sx={{ display: "flex", gap: 0.25, ml: 0.5 }}>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category || "general", display_order: faq.display_order || 0, is_active: faq.is_active !== undefined ? faq.is_active : true }); setFaqDialogOpen(true); }} sx={{ color: P, p: 0.5 }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeleteFaq(faq.id); }} sx={{ color: "#b91c1c", p: 0.5 }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                          </Box>
                        )}
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 3, py: 2.5, bgcolor: PANEL }}>
                        <Typography sx={{ fontSize: "0.875rem", color: TXT, lineHeight: 1.8, pl: 4.5, fontFamily: "'IBM Plex Sans', sans-serif" }}>{faq.answer}</Typography>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )) : <Typography sx={{ color: MUTED, textAlign: "center", py: 6, fontFamily: "'IBM Plex Sans', sans-serif" }}>No FAQs on record.</Typography>}
              </Box>
            </Box>
          )}

          {/* ── Policies ── */}
          {activeSection === "policy" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={Policy} title="Policies & Terms"
                action={isAdmin && <Btn sm startIcon={<Add sx={{ fontSize: 14 }} />} onClick={() => { setEditingPolicy(null); setPolicyForm({ title: "", content: "", category: "privacy", display_order: 0, is_active: true }); setPolicyDialogOpen(true); }}>Add</Btn>} />
              <Box sx={{ p: 3.5 }}>
                {policies.length > 0 ? policies.map(policy => (
                  <Box key={policy.id} sx={{ border: `1px solid ${BD}`, mb: 1.5 }}>
                    <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMore sx={{ color: P, fontSize: 20 }} />}
                        sx={{ px: 2.5, minHeight: 52, bgcolor: SUBTLE, borderBottom: `1px solid ${BD}`, "& .MuiAccordionSummary-content": { alignItems: "center", my: 1.25, gap: 1.5 } }}>
                        <Policy sx={{ fontSize: 17, color: P, flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 600, color: TXT, fontSize: "0.875rem", flex: 1, fontFamily: "'IBM Plex Sans', sans-serif" }}>{policy.title}</Typography>
                        {policy.category && <Tag label={policy.category} />}
                        {policy.version && <Box sx={{ px: 1.25, py: 0.15, bgcolor: SUBTLE, border: `1px solid ${BD}`, borderRadius: "2px" }}><Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.62rem", color: MUTED }}>v{policy.version}</Typography></Box>}
                        {isAdmin && (
                          <Box sx={{ display: "flex", gap: 0.25, ml: 0.5 }}>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setEditingPolicy(policy); setPolicyForm({ title: policy.title, content: policy.content, category: policy.category || "privacy", display_order: policy.display_order || 0, is_active: policy.is_active !== undefined ? policy.is_active : true }); setPolicyDialogOpen(true); }} sx={{ color: P, p: 0.5 }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); handleDeletePolicy(policy.id); }} sx={{ color: "#b91c1c", p: 0.5 }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                          </Box>
                        )}
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 3, py: 2.5, bgcolor: PANEL }}>
                        <Box sx={{ fontSize: "0.875rem", color: TXT, lineHeight: 1.8, "& h2, & h3": { color: P, mt: 2, mb: 1 }, "& p": { mb: 1.5 }, "& ul": { pl: 3, mb: 1.5 }, "& li": { mb: 0.5 }, fontFamily: "'IBM Plex Sans', sans-serif" }} dangerouslySetInnerHTML={{ __html: policy.content }} />
                        {policy.updated_at && <Typography sx={{ mt: 2, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: MUTED }}>Last updated: {new Date(policy.updated_at).toLocaleString()}</Typography>}
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )) : <Typography sx={{ color: MUTED, textAlign: "center", py: 6, fontFamily: "'IBM Plex Sans', sans-serif" }}>No policies on record.</Typography>}
              </Box>
            </Box>
          )}

          {/* ── Contact Us ── */}
          {activeSection === "contact" && (
            <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}` }}>
              <SectionTitle icon={ContactSupport} title={showTickets ? "Ticket Submissions" : "Contact Us"}
                action={isAdmin && (
                  <Badge badgeContent={contactSubmissions.filter(s => s.status === "new").length} sx={{ "& .MuiBadge-badge": { bgcolor: "#ef4444", color: "#fff", fontSize: "0.6rem" } }}>
                    <Btn sm outline startIcon={showTickets ? <Add sx={{ fontSize: 14 }} /> : <VisibilityIcon sx={{ fontSize: 14 }} />}
                      onClick={() => { setShowTickets(!showTickets); if (!showTickets) fetchTickets(); }}>
                      {showTickets ? "New Message" : "View Tickets"}
                    </Btn>
                  </Badge>
                )} />
              <Box sx={{ p: 3.5 }}>
                {isAdmin && showTickets ? (
                  <>
                    {contactSubmissions.length > 0 ? (
                      <Box sx={{ border: `1px solid ${BD}` }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: SUBTLE }}>
                              {["Name", "Subject", "Date", "Status", ""].map(h => (
                                <TableCell key={h} sx={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: "0.65rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `2px solid ${BD}`, py: 1.5 }}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {contactSubmissions.map(sub => (
                              <TableRow key={sub.id} sx={{ "&:hover": { bgcolor: SUBTLE }, borderBottom: `1px solid ${BD}` }}>
                                <TableCell sx={{ fontSize: "0.875rem", fontWeight: 600, color: TXT, fontFamily: "'IBM Plex Sans', sans-serif", py: 1.5 }}>{sub.name}</TableCell>
                                <TableCell sx={{ fontSize: "0.85rem", color: MUTED, fontFamily: "'IBM Plex Sans', sans-serif" }}>{sub.subject || "—"}</TableCell>
                                <TableCell sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: MUTED }}>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                                <TableCell><StatusBadge status={sub.status} /></TableCell>
                                <TableCell>
                                  <IconButton size="small" onClick={() => { setSelectedSub(sub); setAdminReply(sub.admin_notes || ""); setSubDialogOpen(true); }} sx={{ color: P, p: 0.5 }}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    ) : <Typography sx={{ color: MUTED, textAlign: "center", py: 6, fontFamily: "'IBM Plex Sans', sans-serif" }}>No submissions on record.</Typography>}
                  </>
                ) : (
                  <>
                    <InfoBox>Use this form to submit questions, concerns, or feedback. Our team will review your message and respond via your registered email.</InfoBox>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}><FL req>Full Name</FL><TextField fullWidth size="small" sx={FX} value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} /></Grid>
                      <Grid item xs={12} sm={6}><FL req>Email Address</FL><TextField fullWidth size="small" sx={FX} value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} /></Grid>
                      <Grid item xs={12}><FL>Subject</FL><TextField fullWidth size="small" sx={FX} value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief description of your concern" /></Grid>
                      <Grid item xs={12}><FL req>Message</FL><TextField fullWidth multiline rows={6} sx={MFX} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} placeholder="Describe your concern in detail…" /></Grid>
                      <Grid item xs={12}><Btn onClick={handleContactSubmit} disabled={loading} startIcon={<ContactSupport sx={{ fontSize: 17 }} />}>{loading ? "Sending…" : "Submit Message"}</Btn></Grid>
                    </Grid>
                  </>
                )}
              </Box>
            </Box>
          )}

        </Box>
      </Box>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}

      {/* Verification sent */}
      {showVerifyModal && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(15,17,23,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400 }}>
          <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}`, width: "90%", maxWidth: 440 }}>
            <Box sx={{ bgcolor: DARK, px: 3, py: 2.25, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${DARK_BD}` }}>
              <MarkEmailReadOutlined sx={{ color: P, fontSize: 18 }} />
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem", fontFamily: "'IBM Plex Sans', sans-serif" }}>Verification Code Dispatched</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: "0.875rem", color: TXT, lineHeight: 1.75, mb: 3, fontFamily: "'IBM Plex Sans', sans-serif" }}>A 6-digit code has been sent to <strong>{userEmail}</strong>. Enter it to continue.</Typography>
              <Btn fullWidth onClick={() => setShowVerifyModal(false)}>Acknowledge</Btn>
            </Box>
          </Box>
        </Box>
      )}

      {/* Password changed */}
      {showSuccessModal && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(15,17,23,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400 }}>
          <Box sx={{ bgcolor: PANEL, border: `1px solid ${BD}`, width: "90%", maxWidth: 440 }}>
            <Box sx={{ bgcolor: DARK, px: 3, py: 2.25, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${DARK_BD}` }}>
              <CheckCircleOutline sx={{ color: "#22c55e", fontSize: 18 }} />
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem", fontFamily: "'IBM Plex Sans', sans-serif" }}>Password Updated</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: "0.875rem", color: TXT, lineHeight: 1.75, mb: 3, fontFamily: "'IBM Plex Sans', sans-serif" }}>Your password has been changed. You will be signed out momentarily for security.</Typography>
              <Btn fullWidth startIcon={<LockOutlined sx={{ fontSize: 16 }} />} onClick={handleSuccessClose}>Continue</Btn>
            </Box>
          </Box>
        </Box>
      )}

      {/* FAQ dialog */}
      <Dialog open={faqDialogOpen} onClose={() => setFaqDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" } }}>
        <DlgHeader icon={QuestionAnswer} title={editingFaq ? "Edit FAQ" : "New FAQ"} onClose={() => setFaqDialogOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ mb: 2.5 }}><FL req>Question</FL><TextField fullWidth size="small" sx={FX} name="question" value={faqForm.question} onChange={e => setFaqForm(p => ({ ...p, question: e.target.value }))} /></Box>
          <Box sx={{ mb: 2.5 }}><FL req>Answer</FL><TextField fullWidth multiline rows={5} sx={MFX} name="answer" value={faqForm.answer} onChange={e => setFaqForm(p => ({ ...p, answer: e.target.value }))} /></Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FL>Category</FL>
              <FormControl fullWidth size="small"><Select value={faqForm.category} onChange={e => setFaqForm(p => ({ ...p, category: e.target.value }))} sx={{ borderRadius: "3px", bgcolor: SUBTLE, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.9rem" }}>{["general", "password", "email", "account", "technical", "other"].map(c => <MenuItem key={c} value={c} sx={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}</Select></FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FL>Display Order</FL>
              <TextField fullWidth size="small" sx={FX} type="number" value={faqForm.display_order} onChange={e => setFaqForm(p => ({ ...p, display_order: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
          </Grid>
          <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={faqForm.is_active} onChange={e => setFaqForm(p => ({ ...p, is_active: e.target.checked }))} size="small" sx={{ color: BD, "&.Mui-checked": { color: P } }} />} label={<Typography sx={{ fontSize: "0.85rem", fontFamily: "'IBM Plex Sans', sans-serif" }}>Active</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Btn outline onClick={() => setFaqDialogOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSaveFaq} disabled={loading} startIcon={<Save sx={{ fontSize: 16 }} />}>{loading ? "Saving…" : "Save FAQ"}</Btn>
        </DialogActions>
      </Dialog>

      {/* Policy dialog */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" } }}>
        <DlgHeader icon={Policy} title={editingPolicy ? "Edit Policy" : "New Policy"} onClose={() => setPolicyDialogOpen(false)} />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ mb: 2.5 }}><FL req>Title</FL><TextField fullWidth size="small" sx={FX} value={policyForm.title} onChange={e => setPolicyForm(p => ({ ...p, title: e.target.value }))} /></Box>
          <Box sx={{ mb: 2.5 }}><FL req>Content <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(HTML — version auto-generated)</span></FL><TextField fullWidth multiline rows={9} sx={MFX} value={policyForm.content} onChange={e => setPolicyForm(p => ({ ...p, content: e.target.value }))} /></Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FL>Category</FL>
              <FormControl fullWidth size="small"><Select value={policyForm.category} onChange={e => setPolicyForm(p => ({ ...p, category: e.target.value }))} sx={{ borderRadius: "3px", bgcolor: SUBTLE, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.9rem" }}>{[["privacy", "Privacy Policy"], ["terms", "Terms of Service"], ["data", "Data Protection"], ["security", "Security Policy"], ["general", "General Policy"], ["other", "Other"]].map(([v, l]) => <MenuItem key={v} value={v} sx={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{l}</MenuItem>)}</Select></FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FL>Display Order</FL>
              <TextField fullWidth size="small" sx={FX} type="number" value={policyForm.display_order} onChange={e => setPolicyForm(p => ({ ...p, display_order: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
          </Grid>
          <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={policyForm.is_active} onChange={e => setPolicyForm(p => ({ ...p, is_active: e.target.checked }))} size="small" sx={{ color: BD, "&.Mui-checked": { color: P } }} />} label={<Typography sx={{ fontSize: "0.85rem", fontFamily: "'IBM Plex Sans', sans-serif" }}>Active</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Btn outline onClick={() => setPolicyDialogOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSavePolicy} disabled={loading} startIcon={<Save sx={{ fontSize: 16 }} />}>{loading ? "Saving…" : "Save Policy"}</Btn>
        </DialogActions>
      </Dialog>

      {/* Ticket dialog */}
      <Dialog open={subDialogOpen} onClose={() => setSubDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" } }}>
        <DlgHeader icon={ContactSupport} title="Ticket Details" onClose={() => setSubDialogOpen(false)} />
        <DialogContent sx={{ px: 3, pt: 3 }}>
          {selectedSub && (
            <Box>
              {/* Metadata table */}
              <Box sx={{ border: `1px solid ${BD}`, mb: 3 }}>
                {[["From", `${selectedSub.name} (${selectedSub.email})`], selectedSub.employee_number ? ["Employee No.", selectedSub.employee_number] : null, ["Subject", selectedSub.subject || "No subject"], ["Submitted", new Date(selectedSub.created_at).toLocaleString()], ["Status", null]].filter(Boolean).map(([label, value]) => (
                  <Box key={label} sx={{ display: "flex", borderBottom: `1px solid ${BD}`, "&:last-child": { borderBottom: "none" } }}>
                    <Box sx={{ width: 140, flexShrink: 0, px: 2, py: 1.4, bgcolor: SUBTLE, borderRight: `1px solid ${BD}` }}>
                      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, px: 2, py: 1.4, display: "flex", alignItems: "center" }}>
                      {label === "Status" ? <StatusBadge status={selectedSub.status} /> : <Typography sx={{ fontSize: "0.875rem", color: TXT, fontFamily: "'IBM Plex Sans', sans-serif" }}>{value}</Typography>}
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Message body */}
              <Box sx={{ mb: 3 }}>
                <FL>Message</FL>
                <Box sx={{ p: 2.5, bgcolor: SUBTLE, border: `1px solid ${BD}`, fontSize: "0.875rem", color: TXT, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'IBM Plex Sans', sans-serif" }}>{selectedSub.message}</Box>
              </Box>

              {/* Previous response */}
              {selectedSub.admin_notes && (
                <Box sx={{ mb: 3 }}>
                  <FL>Previous Response</FL>
                  <Box sx={{ p: 2.5, bgcolor: alpha(P, 0.04), border: `1px solid ${alpha(P, 0.2)}`, fontSize: "0.875rem", color: TXT, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'IBM Plex Sans', sans-serif" }}>{selectedSub.admin_notes}</Box>
                </Box>
              )}

              {isAdmin && (
                <>
                  <Box sx={{ height: 1, bgcolor: BD, my: 3 }} />
                  <Box sx={{ mb: 2.5 }}><FL>Reply</FL><TextField fullWidth multiline rows={4} sx={MFX} value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Type your response…" /></Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <FL>Update Status</FL>
                    <FormControl size="small" sx={{ minWidth: 160, mb: 0 }}>
                      <Select value={selectedSub.status} onChange={e => { const ns = e.target.value; setSelectedSub(p => ({ ...p, status: ns })); handleUpdateSubStatus(selectedSub.id, ns, adminReply || selectedSub.admin_notes); }} sx={{ borderRadius: "3px", bgcolor: SUBTLE, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.875rem" }}>
                        {["new", "read", "replied", "resolved"].map(s => <MenuItem key={s} value={s} sx={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Btn outline onClick={() => { setSubDialogOpen(false); setAdminReply(""); }}>Close</Btn>
          {isAdmin && <Btn onClick={() => { if (adminReply.trim()) handleUpdateSubStatus(selectedSub.id, "replied", adminReply); }} disabled={loading || !adminReply.trim()} startIcon={<Save sx={{ fontSize: 16 }} />}>{loading ? "Sending…" : "Send Reply"}</Btn>}
        </DialogActions>
      </Dialog>

      {/* Logout overlay */}
      {logoutOpen && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: DARK, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 }}>
          <Box sx={{ width: 72, height: 72, border: `3px solid ${alpha(P, 0.3)}`, borderTopColor: P, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.18em", textTransform: "uppercase", animation: "logout-fade 1.5s ease-in-out infinite" }}>Signing out…</Typography>
        </Box>
      )}

      {/* Toast */}
      {toast.open && (
        <Box sx={{ position: "fixed", bottom: 28, right: 28, zIndex: 1500 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.4, bgcolor: DARK, border: `1px solid ${DARK_BD}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 280 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: toast.severity === "success" ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.875rem", color: "#fff", flex: 1 }}>{toast.message}</Typography>
            <IconButton size="small" onClick={() => setToast(p => ({ ...p, open: false }))} sx={{ color: "rgba(255,255,255,0.4)", p: 0.25, "&:hover": { color: "#fff" } }}><Close sx={{ fontSize: 14 }} /></IconButton>
          </Box>
        </Box>
      )}

    </Box>
  );
};

export default Settings;