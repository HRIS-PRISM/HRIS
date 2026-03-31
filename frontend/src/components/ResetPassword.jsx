import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SuccessfulOverlay from "./SuccessfulOverlay";
import {
  Alert, TextField, Button, Box, Paper, Typography,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, InputAdornment,
  IconButton, Avatar, Chip, TablePagination,
  Backdrop, Tooltip, Portal, alpha,
} from "@mui/material";
import {
  Search, Refresh, LockReset as LockResetIcon,
  Cancel, Info, Person, Email,
  Badge as BadgeIcon, Business, Security,
  WarningAmberRounded, CheckCircle,
} from "@mui/icons-material";
import { getAuthHeaders } from "../utils/auth";

/* ─────────────────────────────────────────────────────────────────
   GLOBAL CSS — identical to PagesList
───────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes sectionIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bannerSlide {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(109,35,35,0.4); }
    70%  { box-shadow: 0 0 0 8px rgba(109,35,35,0); }
    100% { box-shadow: 0 0 0 0 rgba(109,35,35,0); }
  }
  * { font-family: 'IBM Plex Sans', sans-serif; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #f0f0f0; }
  ::-webkit-scrollbar-thumb { background: rgba(109,35,35,0.25); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(109,35,35,0.5); }
`;

/* ─────────────────────────────────────────────────────────────────
   DESIGN TOKENS — identical to PagesList
───────────────────────────────────────────────────────────────── */
const P      = "#6D2323";
const S      = "#8B4545";
const P_DARK = "#4a1515";
const PANEL  = "#ffffff";
const BD     = "#e2e4e8";
const TXT    = "#111827";
const MUTED  = "#6b7280";
const SUBTLE = "#f7f8fa";
const SIDEBAR_W = 240;

/* ─────────────────────────────────────────────────────────────────
   SHARED ATOMS — mirrors PagesList exactly
───────────────────────────────────────────────────────────────── */
const GlassCard = ({ children, sx = {} }) => (
  <Box sx={{
    background: PANEL, borderRadius: 3,
    border: `1px solid ${alpha(P, 0.09)}`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    overflow: "hidden", ...sx,
  }}>
    {children}
  </Box>
);

const CardBanner = () => (
  <Box sx={{ height: 6, background: `linear-gradient(90deg, ${P} 0%, ${S} 60%, ${alpha(P, 0.4)} 100%)` }} />
);

const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <Box sx={{
    px: 4, py: 3,
    background: "linear-gradient(135deg,#ffffff 0%,#f6f6f6 100%)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 2, flexWrap: "wrap", borderBottom: `1px solid ${BD}`,
  }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Avatar sx={{ bgcolor: alpha(P, 0.1), width: 52, height: 52, boxShadow: `0 4px 16px ${alpha(P, 0.12)}` }}>
        <Icon sx={{ color: P, fontSize: 26 }} />
      </Avatar>
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: "1rem", color: P, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: "0.78rem", color: MUTED, fontWeight: 600, mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
    </Box>
    {action && <Box>{action}</Box>}
  </Box>
);

const Btn = ({ children, danger, outline, sm, fullWidth, startIcon, ...p }) => (
  <Button
    disableElevation fullWidth={fullWidth}
    variant={outline ? "outlined" : "contained"}
    startIcon={startIcon}
    sx={{
      borderRadius: 2, textTransform: "none", fontWeight: 700,
      fontSize: sm ? "0.78rem" : "0.875rem",
      py: sm ? 0.75 : 1.1, px: sm ? 2 : 3,
      boxShadow: outline ? "none" : `0 4px 12px ${alpha(P, 0.28)}`,
      ...(outline
        ? { borderColor: alpha(P, 0.45), color: P, "&:hover": { borderColor: P, bgcolor: alpha(P, 0.04) } }
        : danger
          ? { bgcolor: "#b91c1c", color: "#fff", "&:hover": { bgcolor: "#991b1b" }, "&:disabled": { bgcolor: "#e5e7eb", color: "#9ca3af", boxShadow: "none" } }
          : { bgcolor: P, color: "#fff", "&:hover": { bgcolor: P_DARK }, "&:disabled": { bgcolor: "#e5e7eb", color: "#9ca3af", boxShadow: "none" } }),
    }}
    {...p}
  >
    {children}
  </Button>
);

const INPUT_CHROME = {
  borderRadius: "8px", bgcolor: "#f4f5f7", fontSize: "0.875rem", color: TXT,
  transition: "background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  "& fieldset": { borderColor: "transparent", borderWidth: "1.5px", transition: "border-color 0.15s ease" },
  "&:hover": { bgcolor: "#eef0f3" },
  "&:hover fieldset": { borderColor: alpha(P, 0.22) },
  "&.Mui-focused": { bgcolor: "#ffffff", boxShadow: `0 0 0 2px ${alpha(P, 0.18)}, inset 0 1px 3px rgba(0,0,0,0.04)` },
  "&.Mui-focused fieldset": { borderColor: P, borderWidth: "1.5px" },
};
const FX = {
  "& .MuiOutlinedInput-root": INPUT_CHROME,
  "& .MuiInputBase-input": { py: "9px", px: "12px", fontWeight: 500 },
};

/* ─────────────────────────────────────────────────────────────────
   SIDEBAR NAV ITEMS
───────────────────────────────────────────────────────────────── */
const NAV = [
  { key: "all",        label: "All Accounts",       icon: Person },
  { key: "accounts",   label: "Complete Accounts",  icon: CheckCircle },
  { key: "incomplete", label: "Incomplete Accounts", icon: WarningAmberRounded },
];

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
const ResetPassword = () => {
  const [users, setUsers]             = useState([]);
  const [filteredUsers, setFiltered]  = useState([]);
  const [loading, setLoading]         = useState(false);
  const [resetting, setResetting]     = useState({});
  const [errMessage, setError]        = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm]   = useState("");
  const [activeSection, setSection]   = useState("all");
  const navigate = useNavigate();

  /* ── Derived sets ── */
  const properUsers     = useMemo(() => users.filter(u => u.fullName?.trim()), [users]);
  const incompleteUsers = useMemo(() => users.filter(u => !u.fullName?.trim()), [users]);

  const sourceUsers = useMemo(() => {
    if (activeSection === "accounts")   return properUsers;
    if (activeSection === "incomplete") return incompleteUsers;
    return users;
  }, [activeSection, users, properUsers, incompleteUsers]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const result = !term ? sourceUsers : sourceUsers.filter(u =>
      (u.fullName     || "").toLowerCase().includes(term) ||
      (u.email        || "").toLowerCase().includes(term) ||
      String(u.employeeNumber || "").includes(term)
    );
    setFiltered(result);
    setPage(0);
  }, [searchTerm, sourceUsers]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/search`, { method: "GET", headers: getAuthHeaders().headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.error || "Failed to fetch users"); setUsers([]); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setError("Something went wrong while fetching users."); setUsers([]); }
    finally { setLoading(false); }
  };

  const handleReset = async (employeeNumber) => {
    setResetting(p => ({ ...p, [employeeNumber]: true }));
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: "POST",
        headers: { ...getAuthHeaders().headers, "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber }),
      });
      const data = await res.json();
      if (res.ok) { setSuccessAction("reset"); setSuccessOpen(true); }
      else { setError(data.error || "Failed to reset password"); }
    } catch { setError("Something went wrong while resetting password."); }
    finally { setResetting(p => ({ ...p, [employeeNumber]: false })); }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (!parts.length) return "?";
    return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getRoleBadge = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin":    return { color: P };
      case "administrator": return { color: S };
      case "technical":     return { color: "#2563eb" };
      case "staff":         return { color: "#047857" };
      default:              return { color: MUTED };
    }
  };

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const currentNav = NAV.find(n => n.key === activeSection) || NAV[0];

  const navCount = (key) => {
    if (key === "all")        return users.length;
    if (key === "accounts")   return properUsers.length;
    if (key === "incomplete") return incompleteUsers.length;
    return 0;
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══ MAIN CONTENT ══ */}
      <Box sx={{
        width: "100vw", maxWidth: "100%", position: "relative",
        left: "63%", transform: "translateX(-61%)",
        pl: { xs: 2, sm: 3, md: 6 }, pr: `${SIDEBAR_W + 16}px`,
        py: { xs: 2, md: 4 },
        minHeight: "100vh",
        boxSizing: "border-box",
      }}>

        {/* ── Success overlay ── */}
        <Portal>
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
        </Portal>

        {/* ── Error backdrop ── */}
        <Backdrop open={!!errMessage} sx={{ zIndex: 9999, backdropFilter: "blur(8px)", bgcolor: "rgba(0,0,0,0.5)" }} onClick={() => setError("")}>
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 400, maxWidth: 560 }}>
            {errMessage && (
              <Alert severity="error" icon={<Cancel />} onClose={() => setError("")}
                sx={{ borderRadius: 3, boxShadow: "0 12px 48px rgba(0,0,0,0.4)", fontSize: "1rem", p: 3, "& .MuiAlert-message": { fontWeight: 600 } }}>
                {errMessage}
              </Alert>
            )}
          </Box>
        </Backdrop>

        {/* ── Breadcrumb ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3.5, flexWrap: "wrap", animation: "bannerSlide 0.4s ease" }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: MUTED }}>System</Typography>
          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: BD }} />
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: P, fontWeight: 700 }}>Password Management</Typography>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.75, bgcolor: PANEL, border: `1px solid ${BD}`, borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22c55e", animation: "pulse-ring 2s infinite", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.67rem", color: MUTED }}>{users.length} users registered</Typography>
          </Box>
        </Box>

        {/* ── HERO CARD ── */}
        <GlassCard sx={{ mb: 3, animation: "sectionIn 0.4s ease" }}>
          <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 }, display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.4rem", md: "1.75rem" }, color: P, lineHeight: 1.15, mb: 0.5, letterSpacing: "-0.01em" }}>
                Password Management
              </Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem", color: MUTED, fontWeight: 600, mb: 1.5 }}>
                Resets a user's password to their surname (ALL CAPS)
              </Typography>
              {/* Mini stats */}
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {[
                  { label: "Total",      value: users.length,         color: P },
                  { label: "Complete",   value: properUsers.length,   color: "#16a34a" },
                  { label: "Incomplete", value: incompleteUsers.length, color: "#d97706" },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ px: 2, py: 0.75, bgcolor: alpha(color, 0.07), border: `1px solid ${alpha(color, 0.2)}`, borderRadius: "20px", display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 900, fontSize: "0.85rem", color, lineHeight: 1 }}>{value}</Typography>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: alpha(color, 0.7), textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
              <Tooltip title="Refresh Users">
                <IconButton
                  onClick={fetchUsers} disabled={loading}
                  sx={{ width: 38, height: 38, border: `1px solid ${BD}`, borderRadius: 1.5, bgcolor: PANEL, "&:hover": { borderColor: P, color: P } }}
                >
                  {loading ? <CircularProgress size={16} sx={{ color: P }} /> : <Refresh sx={{ fontSize: 17 }} />}
                </IconButton>
              </Tooltip>
              <Btn outline onClick={() => navigate(-1)}>Go Back</Btn>
            </Box>
          </Box>
        </GlassCard>

        {/* ── SEARCH ── */}
        <GlassCard sx={{ mb: 3, animation: "sectionIn 0.35s ease 0.05s both" }}>
          <Box sx={{ px: 4, py: 2.5, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: alpha(P, 0.1), width: 36, height: 36 }}><Search sx={{ color: P, fontSize: 18 }} /></Avatar>
            <Typography sx={{ fontWeight: 900, fontSize: "0.88rem", color: P }}>Search Users</Typography>
          </Box>
          <Box sx={{ px: 4, py: 3 }}>
            <TextField
              fullWidth size="small"
              placeholder="Search by name, email, or employee number…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={FX}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: alpha(P, 0.4), fontSize: 18 }} /></InputAdornment> }}
            />
          </Box>
        </GlassCard>

        {/* ── Loading ── */}
        {loading && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress sx={{ color: P }} size={40} />
            <Typography sx={{ color: MUTED, mt: 2, fontWeight: 600 }}>Loading users…</Typography>
          </Box>
        )}

        {/* ── TABLE CARD ── */}
        <Box sx={{ animation: !loading ? "fadeIn 0.4s ease" : "none", display: loading ? "none" : undefined }}>
          <GlassCard sx={{ animation: "sectionIn 0.35s ease 0.1s both" }}>

            <SectionHeader
              icon={currentNav.icon}
              title={
                activeSection === "all"        ? "All Accounts" :
                activeSection === "accounts"   ? "Complete Accounts" :
                                                 "Incomplete Accounts"
              }
              subtitle={
                searchTerm
                  ? `${filteredUsers.length} of ${sourceUsers.length} users matching "${searchTerm}"`
                  : `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} in this section`
              }
              action={
                incompleteUsers.length > 0 && activeSection !== "accounts" ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.75, py: 0.6, bgcolor: alpha("#f59e0b", 0.08), border: `1px solid ${alpha("#f59e0b", 0.25)}`, borderRadius: "20px" }}>
                    <WarningAmberRounded sx={{ fontSize: 13, color: "#d97706" }} />
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", fontWeight: 900, color: "#d97706" }}>
                      {incompleteUsers.length} incomplete
                    </Typography>
                  </Box>
                ) : null
              }
            />

            {/* Incomplete notice banner */}
            {activeSection === "incomplete" && incompleteUsers.length > 0 && (
              <Box sx={{ px: 3, py: 1.5, bgcolor: alpha("#f59e0b", 0.05), borderBottom: `1px solid ${alpha("#f59e0b", 0.18)}`, display: "flex", alignItems: "center", gap: 1 }}>
                <WarningAmberRounded sx={{ fontSize: 14, color: "#d97706", flexShrink: 0 }} />
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.67rem", color: "#92400e" }}>
                  These accounts are missing a full name. They can still have their password reset, but should be updated in employee records.
                </Typography>
              </Box>
            )}

            <Box sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: SUBTLE }}>
                    {["Employee #", "Full Name", "Email", "Role", "Action"].map((h, i) => (
                      <TableCell key={h} sx={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", fontWeight: 700,
                        color: alpha(P, 0.5), textTransform: "uppercase", letterSpacing: "0.1em",
                        borderBottom: `2px solid ${alpha(P, 0.12)}`, py: 1.75, px: 2.5,
                        whiteSpace: "nowrap", textAlign: i === 4 ? "center" : "left",
                      }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.length > 0 ? paginatedUsers.map((user) => {
                    const isIncomplete = !user.fullName?.trim();
                    const roleStyle = getRoleBadge(user.role);
                    return (
                      <TableRow key={user.employeeNumber} sx={{
                        "&:nth-of-type(even)": { bgcolor: alpha(P, 0.018) },
                        "&:hover": { bgcolor: alpha(P, 0.04) },
                        transition: "background-color 0.15s ease",
                        borderBottom: `1px solid ${alpha(P, 0.06)}`,
                      }}>
                        {/* Employee # */}
                        <TableCell sx={{ px: 2.5, py: 2 }}>
                          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: alpha(P, 0.55), fontWeight: 600 }}>
                            #{user.employeeNumber}
                          </Typography>
                        </TableCell>

                        {/* Full Name */}
                        <TableCell sx={{ px: 2.5, py: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
                            <Avatar
                              src={user.avatar || ""}
                              alt={user.fullName}
                              sx={{
                                width: 40, height: 40,
                                bgcolor: isIncomplete ? alpha("#f59e0b", 0.18) : alpha(P, 0.12),
                                color: isIncomplete ? "#d97706" : P,
                                fontWeight: 700, fontSize: "0.85rem",
                                border: `2px solid ${PANEL}`,
                                boxShadow: `0 2px 8px ${alpha(P, 0.15)}`,
                              }}
                            >
                              {!user.avatar && (isIncomplete ? "?" : getInitials(user.fullName))}
                            </Avatar>
                            {isIncomplete ? (
                              <Box>
                                <Typography sx={{ fontStyle: "italic", color: alpha(TXT, 0.35), fontSize: "0.83rem" }}>No name on record</Typography>
                                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.25, px: 1, py: 0.15, bgcolor: alpha("#f59e0b", 0.1), border: `1px solid ${alpha("#f59e0b", 0.25)}`, borderRadius: "20px" }}>
                                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", fontWeight: 900, color: "#d97706" }}>MISSING</Typography>
                                </Box>
                              </Box>
                            ) : (
                              <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: TXT }}>{user.fullName}</Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* Email */}
                        <TableCell sx={{ px: 2.5, py: 2 }}>
                          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: MUTED, bgcolor: SUBTLE, px: 1, py: 0.4, borderRadius: 1, display: "inline-block", border: `1px solid ${BD}` }}>
                            {user.email || "N/A"}
                          </Typography>
                        </TableCell>

                        {/* Role */}
                        <TableCell sx={{ px: 2.5, py: 2 }}>
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, px: 1.5, py: 0.4, bgcolor: alpha(roleStyle.color, 0.08), border: `1px solid ${alpha(roleStyle.color, 0.22)}`, borderRadius: "20px" }}>
                            <Typography sx={{ fontSize: "0.68rem", fontWeight: 900, color: roleStyle.color }}>{(user.role || "N/A").toUpperCase()}</Typography>
                          </Box>
                        </TableCell>

                        {/* Action */}
                        <TableCell sx={{ px: 2.5, py: 2, textAlign: "center" }}>
                          <Btn
                            sm
                            disabled={resetting[user.employeeNumber] || !user.email}
                            onClick={() => handleReset(user.employeeNumber)}
                            startIcon={resetting[user.employeeNumber]
                              ? <CircularProgress size={13} sx={{ color: "#fff" }} />
                              : <LockResetIcon sx={{ fontSize: "14px !important" }} />}
                          >
                            {resetting[user.employeeNumber] ? "Resetting…" : "Reset"}
                          </Btn>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: "center", py: 8 }}>
                        <LockResetIcon sx={{ fontSize: 56, color: alpha(P, 0.2), mb: 2, display: "block", mx: "auto" }} />
                        <Typography sx={{ fontWeight: 700, color: alpha(P, 0.5), fontSize: "0.95rem", mb: 0.5 }}>
                          {activeSection === "incomplete" ? "No Incomplete Accounts" : "No Users Found"}
                        </Typography>
                        <Typography sx={{ color: MUTED, fontSize: "0.82rem" }}>
                          {searchTerm ? "Try adjusting your search" :
                           activeSection === "incomplete" ? "All accounts have a full name on record" :
                           "No users available"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>

            {filteredUsers.length > 0 && (
              <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${BD}`, display: "flex", justifyContent: "flex-end" }}>
                <TablePagination
                  component="div"
                  count={filteredUsers.length}
                  page={page}
                  onPageChange={(_, np) => setPage(np)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
                  sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: MUTED } }}
                />
              </Box>
            )}
          </GlassCard>
        </Box>
      </Box>

      {/* ══ RIGHT SIDEBAR ══ */}
      <Box sx={{
        width: SIDEBAR_W, bgcolor: PANEL, borderLeft: `2px solid ${alpha(P, 0.28)}`,
        boxShadow: `-3px 0 18px ${alpha(P, 0.05)}`,
        display: "flex", flexDirection: "column",
        position: "fixed", right: 0, top: 0, height: "100vh",
        overflowY: "auto", zIndex: 1200,
      }}>
        {/* Sidebar header */}
        <Box sx={{
          px: 3, py: 2.5, borderBottom: `1px solid ${alpha(P, 0.1)}`,
          display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
          background: `linear-gradient(135deg,${alpha(P, 0.07)} 0%,${alpha(P, 0.01)} 100%)`,
        }}>
          <Box sx={{ width: 36, height: 36, bgcolor: P, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, flexShrink: 0, boxShadow: `0 4px 12px ${alpha(P, 0.4)}` }}>
            <LockResetIcon sx={{ fontSize: 18, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "0.88rem", color: P, lineHeight: 1.2 }}>Password Mgmt</Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.57rem", color: alpha(P, 0.4), letterSpacing: "0.08em", textTransform: "uppercase" }}>User Administration</Typography>
          </Box>
        </Box>

        {/* Stats mini */}
        <Box sx={{ mx: 2.5, my: 2, p: 2, bgcolor: alpha(P, 0.04), borderRadius: 2, border: `1px solid ${alpha(P, 0.1)}`, flexShrink: 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            {[
              { label: "Total",    value: users.length },
              { label: "Filtered", value: filteredUsers.length },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ textAlign: "center" }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.3rem", color: P, lineHeight: 1 }}>{value}</Typography>
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.57rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</Typography>
              </Box>
            ))}
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.3rem", color: "#d97706", lineHeight: 1 }}>{incompleteUsers.length}</Typography>
              <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.57rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Incomplete</Typography>
            </Box>
          </Box>
        </Box>

        {/* Active section badge */}
        <Box sx={{ mx: 2.5, mb: 1.5, px: 2, py: 1.25, bgcolor: alpha(P, 0.06), borderRadius: 1.5, border: `1px solid ${alpha(P, 0.16)}`, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.56rem", color: alpha(P, 0.45), textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.3 }}>Active Filter</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: "0.8rem", color: P }}>
            {activeSection === "all" ? "All Accounts" : activeSection === "accounts" ? "Complete Accounts" : "Incomplete Accounts"}
          </Typography>
        </Box>

        {/* Nav label */}
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.56rem", fontWeight: 700, color: alpha(P, 0.32), letterSpacing: "0.14em", textTransform: "uppercase", px: 3, pb: 0.75, pt: 0.5 }}>
          Filter by Type
        </Typography>

        {/* Nav items */}
        <Box sx={{ flex: 1 }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = activeSection === key;
            const count  = navCount(key);
            return (
              <Box
                key={key}
                onClick={() => { setSection(key); setSearchTerm(""); setPage(0); }}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.75, px: 3, py: 1.25,
                  cursor: "pointer",
                  borderLeft: active ? `3px solid ${P}` : "3px solid transparent",
                  bgcolor: active ? alpha(P, 0.09) : "transparent",
                  transition: "all 0.14s ease",
                  "&:hover": { bgcolor: active ? alpha(P, 0.09) : alpha(P, 0.04) },
                }}
              >
                <Icon sx={{ fontSize: 15, color: active ? P : alpha(P, 0.35), flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.84rem", fontWeight: active ? 700 : 500, color: active ? P : MUTED, flex: 1 }}>{label}</Typography>
                {count > 0 && (
                  <Box sx={{ px: 1, py: 0.1, bgcolor: active ? alpha(P, 0.15) : alpha(P, 0.07), borderRadius: "20px" }}>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", fontWeight: 900, color: active ? P : MUTED }}>{count}</Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Sidebar footer */}
        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(P, 0.08)}`, flexShrink: 0, bgcolor: alpha(P, 0.013) }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", color: alpha(P, 0.4) }}>Password Management · HRIS System</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ResetPassword;