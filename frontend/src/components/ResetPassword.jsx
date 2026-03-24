import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SuccessfulOverlay from "./SuccessfulOverlay";
import {
  Alert,
  TextField,
  Button,
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  InputAdornment,
  IconButton,
  Avatar,
  Chip,
  TablePagination,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Fade,
  Backdrop,
  styled,
  alpha,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LockReset as LockResetIcon,
  Cancel,
  Info,
  Person,
  Email,
  Badge as BadgeIcon,
  Business,
  Security,
  WarningAmberRounded,
  CheckCircle,
} from "@mui/icons-material";
import { getAuthHeaders } from "../utils/auth";

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKeyframes = `
@keyframes rpShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes rpPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
`;

const RpShim = ({ width = "100%", height = 16, borderRadius = 8, sx = {} }) => (
  <Box sx={{
    width, height, borderRadius: `${borderRadius}px`, flexShrink: 0,
    background: "linear-gradient(90deg,rgba(137,68,68,0.08) 25%,rgba(137,68,68,0.20) 50%,rgba(137,68,68,0.08) 75%)",
    backgroundSize: "800px 100%",
    animation: "rpShimmer 1.5s infinite linear",
    ...sx,
  }} />
);

// ─── System settings hook ─────────────────────────────────────────────────────
const useSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem("systemSettings");
      if (stored) { const parsed = JSON.parse(stored); if (parsed && typeof parsed === "object") return parsed; }
    } catch {}
    return { primaryColor: "#894444", secondaryColor: "#6d2323", accentColor: "#FEF9E1", textColor: "#FFFFFF", textPrimaryColor: "#6D2323", textSecondaryColor: "#FEF9E1", hoverColor: "#6D2323", backgroundColor: "#FFFFFF" };
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api") ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        if (response.data && typeof response.data === "object") {
          setSettings(response.data);
          localStorage.setItem("systemSettings", JSON.stringify(response.data));
        }
      } catch (e) { console.error("Error fetching system settings:", e); }
    };
    fetchSettings();
  }, []);

  return settings;
};

// ─── Wireframe skeleton ───────────────────────────────────────────────────────
const ResetPasswordWireframe = ({ settings }) => {
  const p  = settings?.primaryColor || "#894444";
  const ac = settings?.accentColor  || "#FEF9E1";
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box sx={{ pt: 3, pb: 0, width: "100vw", mx: "auto", maxWidth: "100%", overflow: "hidden", position: "relative", left: "50%", transform: "translateX(-50%)", minHeight: "92vh" }}>
        <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
          {/* Header */}
          <Box sx={{ mb: 4, borderRadius: 20, overflow: "hidden", background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: "rpPulse 2.2s ease-in-out infinite" }}>
            <Box sx={{ px: 4, py: 3, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)` }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: alpha(p, 0.12), flexShrink: 0 }} />
                  <Box><RpShim width={220} height={22} borderRadius={6} sx={{ mb: 0.75 }} /><RpShim width={360} height={12} borderRadius={4} /></Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}><RpShim width={80} height={26} borderRadius={14} /><Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: alpha(p, 0.1) }} /></Box>
              </Box>
            </Box>
          </Box>
          {/* Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[0, 0.05, 0.1].map((delay, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Box sx={{ borderRadius: 20, p: 3, background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: `rpPulse 2.2s ease-in-out ${delay}s infinite`, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: alpha(p, 0.1) }} />
                  <RpShim width={50} height={24} borderRadius={6} />
                  <RpShim width={90} height={11} borderRadius={4} />
                </Box>
              </Grid>
            ))}
          </Grid>
          {/* Search */}
          <Box sx={{ mb: 4, borderRadius: 20, overflow: "hidden", background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: "rpPulse 2.2s ease-in-out 0.08s infinite" }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${alpha(p, 0.08)}`, bgcolor: alpha(ac, 0.5) }}>
              <RpShim width={120} height={10} borderRadius={4} sx={{ mb: 0.5 }} /><RpShim width={260} height={10} borderRadius={4} />
            </Box>
            <Box sx={{ p: 4 }}><Box sx={{ height: 44, borderRadius: 3, border: `1px solid ${alpha(p, 0.15)}`, bgcolor: "rgba(255,255,255,0.8)" }} /></Box>
          </Box>
          {/* Table */}
          <Box sx={{ borderRadius: 20, overflow: "hidden", background: `${ac}F2`, border: `1px solid ${alpha(p, 0.1)}`, animation: "rpPulse 2.2s ease-in-out 0.12s infinite" }}>
            <Box sx={{ px: 3, py: 3, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, borderBottom: `1px solid ${alpha(p, 0.1)}` }}>
              <RpShim width={160} height={18} borderRadius={6} sx={{ mb: 0.5 }} /><RpShim width={300} height={11} borderRadius={4} />
            </Box>
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              {[0, 0.04, 0.08, 0.12, 0.16].map((delay, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, borderRadius: 3, border: `1px solid ${alpha(p, 0.07)}`, animation: `rpPulse 2.2s ease-in-out ${delay}s infinite` }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: alpha(p, 0.1), flexShrink: 0 }} />
                  <RpShim width="15%" height={11} borderRadius={4} />
                  <RpShim width="22%" height={11} borderRadius={4} />
                  <RpShim width="26%" height={11} borderRadius={4} />
                  <RpShim width="12%" height={22} borderRadius={12} />
                  <RpShim width={80} height={34} borderRadius={10} sx={{ ml: "auto" }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ResetPassword = () => {
  const settings = useSystemSettings();
  const p  = settings?.primaryColor     || "#894444";
  const s  = settings?.secondaryColor   || "#6d2323";
  const ac = settings?.accentColor      || "#FEF9E1";
  const tp = settings?.textPrimaryColor || "#6D2323";

  const GlassCard = useMemo(() => styled(Card)(() => ({
    borderRadius: 20,
    background: `${ac}F2`,
    backdropFilter: "blur(10px)",
    boxShadow: `0 8px 40px ${alpha(p, 0.08)}`,
    border: `1px solid ${alpha(p, 0.1)}`,
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": { boxShadow: `0 12px 48px ${alpha(p, 0.16)}`, transform: "translateY(-4px)" },
  })), [p, ac]);

  const ProfessionalButton = useMemo(() => styled(Button)(({ variant: v }) => ({
    borderRadius: 12, fontWeight: 600, padding: "10px 22px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none", fontSize: "0.9rem", letterSpacing: "0.025em",
    boxShadow: v === "contained" ? `0 4px 14px ${alpha(p, 0.4)}` : "none",
    "&:hover": { transform: "translateY(-2px)", boxShadow: v === "contained" ? `0 6px 20px ${alpha(p, 0.55)}` : "none" },
    "&:active": { transform: "translateY(0)" },
  })), [p]);

  const ModernTextField = useMemo(() => styled(TextField)(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backgroundColor: "rgba(255,255,255,0.8)",
      "&:hover": { transform: "translateY(-1px)", backgroundColor: "rgba(255,255,255,0.95)" },
      "&.Mui-focused": { transform: "translateY(-1px)", boxShadow: `0 4px 20px ${alpha(p, 0.4)}`, backgroundColor: "rgba(255,255,255,1)" },
    },
    "& .MuiInputLabel-root": { fontWeight: 500 },
  })), [p]);

  const PremiumTableContainer = useMemo(() => styled(TableContainer)({
    borderRadius: 0, overflow: "hidden",
  }), []);

  const PremiumTableCell = useMemo(() => styled(TableCell)(({ isHeader = false }) => ({
    fontWeight: isHeader ? 600 : 500,
    padding: "18px 20px",
    borderBottom: isHeader ? `2px solid ${alpha(p, 0.15)}` : `1px solid ${alpha(p, 0.07)}`,
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
  })), [p]);

  const [searchTerm, setSearchTerm]       = useState("");
  const [users, setUsers]                 = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [resetting, setResetting]         = useState({});
  const [errMessage, setErrorMessage]     = useState("");
  const [successOpen, setSuccessOpen]     = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(10);
  const [refreshing, setRefreshing]       = useState(false);
  const [activeTab, setActiveTab]         = useState(0);
  const navigate = useNavigate();

  // ── Split users into proper vs incomplete ──
  const properUsers     = useMemo(() => users.filter((u) => u.fullName && u.fullName.trim() !== ""), [users]);
  const incompleteUsers = useMemo(() => users.filter((u) => !u.fullName || u.fullName.trim() === ""), [users]);

  // ── Filter based on active tab ──
  const sourceUsers = activeTab === 0 ? properUsers : incompleteUsers;

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(sourceUsers);
    } else {
      setFilteredUsers(
        sourceUsers.filter(
          (user) =>
            (user.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(user.employeeNumber || "").includes(searchTerm)
        )
      );
    }
    setPage(0);
  }, [searchTerm, users, activeTab]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true); setRefreshing(true); setErrorMessage(""); setSuccessOpen(false);
    try {
      const res = await fetch(`${API_BASE_URL}/users/search`, { method: "GET", headers: getAuthHeaders().headers });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setErrorMessage(error.error || "Failed to fetch users");
        setUsers([]); setFilteredUsers([]); return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      if (refreshing) { setSuccessAction("create"); setSuccessOpen(true); }
    } catch {
      setErrorMessage("Something went wrong while fetching users.");
      setUsers([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const handleResetPassword = async (employeeNumber) => {
    setResetting((prev) => ({ ...prev, [employeeNumber]: true }));
    setErrorMessage(""); setSuccessOpen(false);
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: "POST",
        headers: { ...getAuthHeaders().headers, "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber }),
      });
      const data = await res.json();
      if (res.ok) { setSuccessAction("reset"); setSuccessOpen(true); }
      else         { setErrorMessage(data.error || "Failed to reset password"); }
    } catch { setErrorMessage("Something went wrong while resetting password."); }
    finally  { setResetting((prev) => ({ ...prev, [employeeNumber]: false })); }
  };

  const getInitials = (nameOrUsername) => {
    if (!nameOrUsername) return "?";
    const parts = nameOrUsername.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const getRoleColor = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin":    return { bgcolor: alpha(p, 0.15), color: p };
      case "administrator": return { bgcolor: alpha(s, 0.15), color: s };
      case "staff":         return { bgcolor: alpha(p, 0.1),  color: p };
      default:              return { bgcolor: alpha(p, 0.1),  color: p };
    }
  };

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading && users.length === 0) return <ResetPasswordWireframe settings={settings} />;

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Box sx={{ pt: 3, pb: 0, width: "100vw", mx: "auto", maxWidth: "100%", overflow: "hidden", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
        <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>

          {/* ── Header ── */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard>
                <Box sx={{ px: 4, py: 3, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, position: "relative", overflow: "hidden" }}>
                  <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha(p, 0.1)} 0%, transparent 70%)` }} />
                  <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, background: `radial-gradient(circle, ${alpha(p, 0.08)} 0%, transparent 70%)` }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                    <Box display="flex" alignItems="center" gap={3}>
                      <Avatar sx={{ bgcolor: alpha(p, 0.15), width: 52, height: 52, boxShadow: `0 6px 20px ${alpha(p, 0.15)}` }}>
                        <LockResetIcon sx={{ fontSize: 26, color: p }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2, color: p }}>Password Management</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 400, color: tp, mt: 0.25 }}>
                          Search for employees/users and reset their password to their surname (ALL CAPS)
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip label={`${users.length} Users`} size="small" sx={{ bgcolor: alpha(p, 0.15), color: p, fontWeight: 500 }} />
                      <Tooltip title="Refresh Users">
                        <IconButton
                          onClick={fetchUsers}
                          disabled={loading}
                          sx={{ bgcolor: alpha(p, 0.1), color: p, width: 44, height: 44, "&:hover": { bgcolor: alpha(p, 0.2) }, "&:disabled": { bgcolor: alpha(p, 0.05), color: alpha(p, 0.3) } }}
                        >
                          {loading ? <CircularProgress size={20} sx={{ color: p }} /> : <RefreshIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

          {/* ── Error backdrop ── */}
          {errMessage && (
            <Backdrop open={true} sx={{ zIndex: 9999, backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setErrorMessage("")}>
              <Fade in timeout={300}>
                <Box onClick={(e) => e.stopPropagation()} sx={{ position: "relative", minWidth: "400px", maxWidth: "600px" }}>
                  <Alert
                    severity="error"
                    icon={<Cancel />}
                    onClose={() => setErrorMessage("")}
                    sx={{ borderRadius: 4, boxShadow: "0 12px 48px rgba(0,0,0,0.4)", fontSize: "1.1rem", p: 3, "& .MuiAlert-message": { fontWeight: 500 }, "& .MuiAlert-icon": { fontSize: "2rem" } }}
                  >
                    {errMessage}
                  </Alert>
                </Box>
              </Fade>
            </Backdrop>
          )}

          {/* ── Stats Cards ── */}
          <Fade in timeout={700}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4}>
                <GlassCard>
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Person sx={{ fontSize: 44, color: tp, mb: 1 }} />
                    <Typography variant="h5" sx={{ color: tp, fontWeight: 700 }}>{users.length}</Typography>
                    <Typography variant="body2" sx={{ color: tp }}>Total Users</Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <GlassCard>
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <SearchIcon sx={{ fontSize: 44, color: tp, mb: 1 }} />
                    <Typography variant="h5" sx={{ color: tp, fontWeight: 700 }}>{filteredUsers.length}</Typography>
                    <Typography variant="body2" sx={{ color: tp }}>Filtered Results</Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <GlassCard>
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <LockResetIcon sx={{ fontSize: 44, color: tp, mb: 1 }} />
                    <Typography variant="h5" sx={{ color: tp, fontWeight: 700 }}>{Object.keys(resetting).filter(k => resetting[k]).length}</Typography>
                    <Typography variant="body2" sx={{ color: tp }}>Resets In Progress</Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
            </Grid>
          </Fade>

          {/* ── Search ── */}
          <Fade in timeout={900}>
            <GlassCard sx={{ mb: 4 }}>
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(ac, 0.8), color: tp }}><SearchIcon /></Avatar>
                    <Box>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: tp }}>Search Users</Typography>
                      <Typography variant="body2" sx={{ color: tp }}>Find users by name, email, or employee number</Typography>
                    </Box>
                  </Box>
                }
                sx={{ bgcolor: alpha(ac, 0.5), pb: 2, borderBottom: `1px solid ${alpha(p, 0.08)}` }}
              />
              <CardContent sx={{ p: 4 }}>
                <ModernTextField
                  fullWidth
                  label="Search Users"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or employee number..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: tp }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </GlassCard>
          </Fade>

          {/* ── Loading backdrop ── */}
          <Backdrop sx={{ color: ac, zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading && !refreshing}>
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress color="inherit" size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2, color: ac }}>Loading users...</Typography>
            </Box>
          </Backdrop>

          {/* ── Table with Tabs ── */}
          {!loading && (
            <Fade in timeout={1100}>
              <GlassCard>
                {/* Table header */}
                <Box sx={{ px: 3, py: 3, background: `linear-gradient(135deg, ${ac} 0%, ${alpha(ac, 0.9)} 100%)`, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${alpha(p, 0.1)}` }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: p }}>User Accounts</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75, color: tp }}>
                      {searchTerm
                        ? `Showing ${filteredUsers.length} of ${sourceUsers.length} users matching "${searchTerm}"`
                        : `Total: ${users.length} registered users`}
                    </Typography>
                  </Box>
                  {incompleteUsers.length > 0 && (
                    <Chip
                      icon={<WarningAmberRounded sx={{ fontSize: "14px !important" }} />}
                      label={`${incompleteUsers.length} incomplete`}
                      size="small"
                      sx={{ bgcolor: alpha("#f59e0b", 0.15), color: "#b45309", fontWeight: 600, border: `1px solid ${alpha("#f59e0b", 0.3)}` }}
                    />
                  )}
                </Box>

                {/* Tabs */}
                <Box sx={{ borderBottom: `1px solid ${alpha(p, 0.1)}`, bgcolor: alpha(ac, 0.4) }}>
                  <Tabs
                    value={activeTab}
                    onChange={(_, val) => { setActiveTab(val); setPage(0); setSearchTerm(""); }}
                    sx={{
                      px: 2,
                      "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.85rem", color: alpha(tp, 0.5), minHeight: 48 },
                      "& .Mui-selected": { color: p },
                      "& .MuiTabs-indicator": { backgroundColor: p, height: 3, borderRadius: "3px 3px 0 0" },
                    }}
                  >
                 <Tab
  label={
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {/* plain icon */}
      <CheckCircle sx={{ fontSize: 16 }} />
      <span>Accounts</span>
      <Chip
        label={properUsers.length}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.68rem",
          fontWeight: 700,
          bgcolor: "#16a34a33", 
          color: "#16a34a",  
          "& .MuiChip-label": { px: 0.75 }
        }}
      />
    </Box>
  }
/>

<Tab
  label={
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {/* plain icon */}
      <WarningAmberRounded sx={{ fontSize: 16 }} />
      <span>Incomplete Accounts</span>
      <Chip
        label={incompleteUsers.length}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.68rem",
          fontWeight: 700,
          bgcolor: "#f59e0b33",
          color: "#d97706",   
          "& .MuiChip-label": { px: 0.75 }
        }}
      />
    </Box>
  }
/>
                  </Tabs>
                </Box>

                {/* Incomplete accounts notice */}
                {activeTab === 1 && incompleteUsers.length > 0 && (
                  <Box sx={{ px: 3, py: 1.5, bgcolor: alpha("#f59e0b", 0.06), borderBottom: `1px solid ${alpha("#f59e0b", 0.2)}`, display: "flex", alignItems: "center", gap: 1 }}>
                    <WarningAmberRounded sx={{ fontSize: 15, color: "#d97706", flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.75rem", color: "#92400e" }}>
                      These accounts are missing a full name. They can still have their password reset, but should be updated in employee records.
                    </Typography>
                  </Box>
                )}

                <PremiumTableContainer component={Paper} elevation={0}>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: alpha(ac, 0.7) }}>
                      <TableRow>
                        <PremiumTableCell isHeader sx={{ color: tp }}><BadgeIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }} />Employee #</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: tp }}><Person sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }} />Full Name</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: tp }}><Email sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }} />Email</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: tp }}><Business sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }} />Role</PremiumTableCell>
                        <PremiumTableCell isHeader sx={{ color: tp, textAlign: "center" }}><Security sx={{ mr: 1, verticalAlign: "middle", fontSize: 18 }} />Action</PremiumTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedUsers.length > 0 ? (
                        paginatedUsers.map((user) => (
                          <TableRow
                            key={user.employeeNumber}
                            sx={{ "&:nth-of-type(even)": { bgcolor: alpha(ac, 0.3) }, "&:hover": { bgcolor: alpha(p, 0.05) }, transition: "all 0.2s ease" }}
                          >
                            <PremiumTableCell sx={{ fontWeight: 600, color: tp }}>{user.employeeNumber}</PremiumTableCell>
                            <PremiumTableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Avatar
                                  src={user.avatar || ""}
                                  alt={user.fullName}
                                  sx={{
                                    width: 48, height: 48,
                                    bgcolor: activeTab === 1 ? alpha("#f59e0b", 0.2) : p,
                                    color: activeTab === 1 ? "#d97706" : ac,
                                    fontWeight: 700, fontSize: "1rem",
                                    boxShadow: `0 4px 12px ${alpha(p, 0.2)}`,
                                    border: "2px solid #fff",
                                  }}
                                >
                                  {!user.avatar && (activeTab === 1 ? "?" : getInitials(user.fullName))}
                                </Avatar>
                                {activeTab === 1 ? (
                                  <Box>
                                    <Typography variant="body2" sx={{ fontStyle: "italic", color: alpha(tp, 0.4), fontSize: "0.85rem" }}>No name on record</Typography>
                                    <Chip label="Missing" size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: alpha("#f59e0b", 0.12), color: "#d97706", mt: 0.25, "& .MuiChip-label": { px: 0.75 } }} />
                                  </Box>
                                ) : (
                                  <Typography variant="body1" sx={{ fontWeight: 600, color: tp }}>{user.fullName}</Typography>
                                )}
                              </Box>
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ color: tp }}>{user.email || "N/A"}</PremiumTableCell>
                            <PremiumTableCell>
                              <Chip label={user.role || "N/A"} size="small" sx={{ ...getRoleColor(user.role), fontWeight: 600 }} />
                            </PremiumTableCell>
                            <PremiumTableCell sx={{ textAlign: "center" }}>
                              <ProfessionalButton
                                variant="contained"
                                size="small"
                                onClick={() => handleResetPassword(user.employeeNumber)}
                                disabled={resetting[user.employeeNumber] || !user.email}
                                startIcon={resetting[user.employeeNumber] ? <CircularProgress size={16} sx={{ color: ac }} /> : <LockResetIcon />}
                                sx={{ bgcolor: p, color: ac, "&:hover": { bgcolor: s }, "&:disabled": { bgcolor: alpha(p, 0.3), color: alpha(ac, 0.6) } }}
                              >
                                {resetting[user.employeeNumber] ? "Resetting..." : "Reset"}
                              </ProfessionalButton>
                            </PremiumTableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 8, border: "none" }}>
                            <Info sx={{ fontSize: 80, color: alpha(p, 0.3), mb: 3 }} />
                            <Typography variant="h5" sx={{ color: alpha(p, 0.6), fontWeight: 600, mb: 1 }}>
                              {activeTab === 1 ? "No Incomplete Accounts" : "No Users Found"}
                            </Typography>
                            <Typography variant="body1" sx={{ color: alpha(p, 0.4) }}>
                              {searchTerm
                                ? "Try adjusting your search criteria"
                                : activeTab === 1
                                  ? "All accounts have a full name on record"
                                  : "No users available"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </PremiumTableContainer>

                {filteredUsers.length > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2, borderTop: `1px solid ${alpha(p, 0.07)}` }}>
                    <TablePagination
                      component="div"
                      count={filteredUsers.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                      rowsPerPageOptions={[5, 10, 25, 50, 100]}
                      sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { color: tp, fontWeight: 600 } }}
                    />
                  </Box>
                )}
              </GlassCard>
            </Fade>
          )}

          {/* ── Back button ── */}
          <Fade in timeout={1300}>
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <ProfessionalButton
                onClick={() => navigate(-1)}
                variant="outlined"
                sx={{ borderColor: alpha(p, 0.4), color: tp, "&:hover": { borderColor: p, bgcolor: alpha(p, 0.05) } }}
              >
                Go Back
              </ProfessionalButton>
            </Box>
          </Fade>

        </Box>
      </Box>

      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
    </>
  );
};

export default ResetPassword;