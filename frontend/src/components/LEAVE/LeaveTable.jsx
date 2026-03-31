import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Card, Divider, InputAdornment, Select, MenuItem, FormControl, Fade, Tooltip,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon, Close, Search as SearchIcon,
  AccessTime as TimeIcon, Male as MaleIcon, Female as FemaleIcon,
  Wc as GenderIcon, Refresh as RefreshIcon, TableRows as TableRowsIcon,
  FolderSpecial as LeaveIcon, CheckCircleOutline, InfoOutlined,
  TableChart as TableChartIcon,
} from "@mui/icons-material";

import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  headerGrad: "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven: "#ffffff",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  male: { bg: "rgba(21,101,192,0.08)", color: "#1565C0", border: "rgba(21,101,192,0.22)" },
  female: { bg: "rgba(194,24,91,0.08)", color: "#C2185B", border: "rgba(194,24,91,0.22)" },
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

// ─── Styled primitives ─────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
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

// ─── Shimmer ───────────────────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`, backgroundSize: "800px 100%", animation: "shimmer 1.6s infinite linear", flexShrink: 0, ...sx }} />
);

const Wireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 } }}>
      {/* Header skeleton */}
      <Box sx={{ mb: 2, borderRadius: 3, overflow: "hidden", border: `1px solid ${T.accentBorder}`, animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ p: 3.5, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)", flexShrink: 0 }} />
            <Box><Bone w={200} h={18} sx={{ mb: 1 }} /><Bone w={340} h={11} /></Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}><Bone w={140} h={30} r={20} /><Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.1)" }} /></Box>
        </Box>
      </Box>
      {/* Form skeleton */}
      <Box sx={{ mb: 2, borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: "#fff", overflow: "hidden", animation: "blink 2s ease-in-out 0.1s infinite" }}>
        <Box sx={{ px: 3.5, py: 1.75, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint }}><Bone w={160} h={12} /></Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {[2, 3.5, 2, 2, 2.5].map((md, i) => (
              <Grid item xs={12} sm={6} md={md} key={i}>
                <Bone w={80} h={10} sx={{ mb: 1 }} />
                <Box sx={{ height: 38, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: "#fafafa" }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
      {/* Table skeleton — fixed height to match real component */}
      <Box sx={{ borderRadius: 3, border: `1px solid ${T.accentBorder}`, bgcolor: "#fff", overflow: "hidden", animation: "blink 2s ease-in-out 0.2s infinite", height: "calc(100vh - 360px)", display: "flex", flexDirection: "column" }}>
        <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <Bone w={160} h={14} />
          <Bone w={220} h={36} r={8} />
        </Box>
        <Box sx={{ px: 3.5, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: "flex", gap: 3, flexShrink: 0 }}>
          {[60, 200, 80, 120, 72, 72, 72].map((w, i) => <Bone key={i} w={w} h={10} />)}
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {[...Array(6)].map((_, i) => (
            <Box key={i} sx={{ px: 3.5, py: 1.6, borderBottom: `1px solid ${T.divider}`, display: "flex", gap: 3, alignItems: "center", bgcolor: i % 2 === 0 ? "#fff" : T.rowOdd }}>
              <Bone w={60} h={26} r={6} />
              <Bone w={200} h={11} />
              <Bone w={60} h={18} r={11} />
              <Bone w={100} h={20} r={10} />
              <Bone w={48} h={11} />
              <Bone w={48} h={11} />
              <Bone w={60} h={28} r={6} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Gender pill ───────────────────────────────────────────────────────────────
const GenderPill = ({ restriction }) => {
  if (!restriction) return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <GenderIcon sx={{ fontSize: 13, color: T.faint }} />
      <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>Any</Typography>
    </Box>
  );
  const isMale = restriction.toLowerCase() === "male";
  const c = isMale ? T.male : T.female;
  return (
    <Chip size="small" icon={isMale ? <MaleIcon style={{ fontSize: 11, color: c.color }} /> : <FemaleIcon style={{ fontSize: 11, color: c.color }} />} label={restriction}
      sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, bgcolor: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: "4px", "& .MuiChip-icon": { ml: "4px" } }} />
  );
};

// ─── Stat cell ─────────────────────────────────────────────────────────────────
const StatCell = ({ label, value, sub, color = T.accent }) => (
  <Box sx={{ flex: 1, textAlign: "center", py: 2, px: 1, borderRadius: 2, bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.12)}` }}>
    <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</Typography>
    {sub && <Typography sx={{ fontSize: "0.68rem", color: T.muted, mt: 0.3 }}>{sub}</Typography>}
    <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", mt: 0.5 }}>{label}</Typography>
  </Box>
);

// ─── Main component ────────────────────────────────────────────────────────────
const LeaveTable = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess("leave-table");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [newLeaveType, setNewLeaveType] = useState({ leave_description: "", leave_code: "", leave_hours: "", gender_restriction: "" });
  const [editLeaveType, setEditLeaveType] = useState(null);
  const [originalLeaveType, setOriginalLeaveType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");

  useEffect(() => { fetchLeaveTypes(); }, []);

  const fetchLeaveTypes = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`); setLeaveTypes(res.data); }
    catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  };

  const handleAdd = async () => {
    if (!newLeaveType.leave_code || !newLeaveType.leave_description) return;
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(newLeaveType).filter(([, v]) => v !== ""));
      await axios.post(`${API_BASE_URL}/leaveRoute/leave_table`, payload);
      setNewLeaveType({ leave_description: "", leave_code: "", leave_hours: "", gender_restriction: "" });
      fetchLeaveTypes();
      setTimeout(() => { setLoading(false); setSuccessAction("adding"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000); }, 300);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_table/${editLeaveType.id}`, editLeaveType);
      setEditLeaveType(null); setOriginalLeaveType(null); setIsEditing(false);
      fetchLeaveTypes();
      setSuccessAction("edit"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave type?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_table/${id}`);
      setEditLeaveType(null); setOriginalLeaveType(null); setIsEditing(false);
      fetchLeaveTypes();
      setSuccessAction("delete"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000);
    } catch (e) { console.error(e); }
  };

  const openModal = (lt) => { setEditLeaveType({ ...lt }); setOriginalLeaveType({ ...lt }); setIsEditing(false); };
  const openModalEdit = (lt) => { setEditLeaveType({ ...lt }); setOriginalLeaveType({ ...lt }); setIsEditing(true); };
  const closeModal = () => { setEditLeaveType(null); setOriginalLeaveType(null); setIsEditing(false); };
  const startEdit = () => setIsEditing(true);
  const cancelEdit = () => { setEditLeaveType({ ...originalLeaveType }); setIsEditing(false); };

  const filtered = leaveTypes.filter((lt) => {
    const s = searchTerm.toLowerCase();
    return (lt.leave_description || "").toLowerCase().includes(s) || (lt.leave_code || "").toLowerCase().includes(s);
  });

  const canAdd = !loading && newLeaveType.leave_code && newLeaveType.leave_description;

  const selectSx = {
    borderRadius: "8px", fontSize: "0.875rem", bgcolor: "#fff",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: "1.5px" },
  };

  if (accessLoading) return <Wireframe />;
  if (!hasAccess) return <AccessDenied />;
  if (pageLoading) return <Wireframe />;

  return (
    <Fade in timeout={400}>
      <Box sx={{ py: { xs: 2, md: 4 }, mt: { xs: 0, md: -5 }, width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 } }}>
        <LoadingOverlay open={loading} message="Processing leave type…" />
        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.1) 0%, transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)" }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
              <TableChartIcon sx={{ fontSize: 28, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.15rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3 }}>Leave Types Management</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600, opacity: 0.85 }}>Add and manage available leave types</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                <Typography sx={{ fontSize: "0.78rem", color: T.accent, fontWeight: 700 }}>{leaveTypes.length} {leaveTypes.length === 1 ? "type" : "types"} on record</Typography>
              </Box>
              <Tooltip title="Refresh data">
                <IconButton onClick={fetchLeaveTypes} size="small" sx={{ color: T.accent, bgcolor: alpha(T.accent, 0.1), "&:hover": { bgcolor: alpha(T.accent, 0.18) } }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Add Form ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint }}>
            <AddIcon sx={{ fontSize: 15, color: T.accent }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Add New Leave Type</Typography>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: "0.72rem", color: T.faint }}><Box component="span" sx={{ color: "#c62828" }}>*</Box> required fields</Typography>
          </Box>
          <Box sx={{ px: 3.5, py: 2.5 }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={2}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Leave Code <Box component="span" sx={{ color: "#c62828" }}>*</Box></Typography>
                <FieldInput value={newLeaveType.leave_code} onChange={(e) => setNewLeaveType({ ...newLeaveType, leave_code: e.target.value.toUpperCase() })} fullWidth size="small" placeholder="e.g. VL, SL" inputProps={{ maxLength: 6 }} />
                <Typography sx={{ fontSize: "0.68rem", color: T.faint, mt: 0.4 }}>2–6 uppercase letters</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3.5}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Leave Name <Box component="span" sx={{ color: "#c62828" }}>*</Box></Typography>
                <FieldInput value={newLeaveType.leave_description} onChange={(e) => setNewLeaveType({ ...newLeaveType, leave_description: e.target.value })} fullWidth size="small" placeholder="e.g. Vacation Leave" />
                <Typography sx={{ fontSize: "0.68rem", color: T.faint, mt: 0.4 }}>Official full name</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Default Days</Typography>
                <FieldInput type="number" fullWidth size="small" placeholder="0"
                  value={newLeaveType.leave_hours !== "" ? newLeaveType.leave_hours / 8 : ""}
                  onChange={(e) => setNewLeaveType({ ...newLeaveType, leave_hours: e.target.value !== "" ? parseFloat(e.target.value) * 8 : "" })}
                  inputProps={{ min: 0, step: 1 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><TimeIcon sx={{ fontSize: 14, color: T.muted }} /></InputAdornment>, endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: "0.68rem", color: T.faint, whiteSpace: "nowrap" }}>{newLeaveType.leave_hours || 0}h</Typography></InputAdornment> }} />
                <Typography sx={{ fontSize: "0.68rem", color: T.faint, mt: 0.4 }}>1 day = 8 hours</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Gender Restriction</Typography>
                <FormControl fullWidth size="small">
                  <Select value={newLeaveType.gender_restriction} onChange={(e) => setNewLeaveType({ ...newLeaveType, gender_restriction: e.target.value })} displayEmpty sx={selectSx}>
                    <MenuItem value=""><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><GenderIcon sx={{ fontSize: 14, opacity: 0.45 }} />No restriction</Box></MenuItem>
                    <MenuItem value="Male"><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><MaleIcon sx={{ fontSize: 14, color: "#1565C0" }} />Male only</Box></MenuItem>
                    <MenuItem value="Female"><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><FemaleIcon sx={{ fontSize: 14, color: "#C2185B" }} />Female only</Box></MenuItem>
                  </Select>
                </FormControl>
                <Typography sx={{ fontSize: "0.68rem", color: T.faint, mt: 0.4 }}>Paternity / Maternity</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={2.5}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "transparent", mb: 0.75, userSelect: "none" }}>.</Typography>
                <AccentButton onClick={handleAdd} variant="contained" fullWidth startIcon={<AddIcon sx={{ fontSize: "16px !important" }} />} disabled={!canAdd}
                  sx={{ height: 40, bgcolor: canAdd ? T.accent : "#d0d0d0", color: canAdd ? "#fff" : "#888", boxShadow: canAdd ? `0 2px 10px ${alpha(T.accent, 0.32)}` : "none", "&:hover": { bgcolor: canAdd ? T.accentDark : "#d0d0d0" }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" } }}>
                  {loading ? "Adding…" : "Add Leave Type"}
                </AccentButton>
                <Typography sx={{ fontSize: "0.68rem", color: "transparent", mt: 0.4, userSelect: "none" }}>.</Typography>
              </Grid>
            </Grid>
          </Box>
        </SectionCard>

        {/* ── Records Table (scrollable inside card) ── */}
        <SectionCard sx={{ height: "calc(100vh - 460px)", display: "flex", flexDirection: "column", mb: { xs: 6, md: 2 } }}>
          {/* Toolbar */}
          <Box sx={{ px: 3.5, py: 1.75, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <TableRowsIcon sx={{ fontSize: 17, color: T.accent }} />
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>Leave Types Registry</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>• {filtered.length} {filtered.length === 1 ? "type" : "types"}</Typography>
            </Box>
            <FieldInput size="small" placeholder="Search by code or name…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ width: 280 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: T.muted }} /></InputAdornment> }} />
          </Box>

          {/* Column header bar — sticky */}
          <Box sx={{ px: 3.5, py: 1.1, display: "grid", gridTemplateColumns: "110px 1fr 100px 160px 80px 80px 90px", gap: 1, alignItems: "center", bgcolor: alpha(T.accent, 0.04), borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
            {["Leave Code", "Leave Name", "Default", "Gender", "Days", "Hours", "Action"].map((col) => (
              <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>{col}</Typography>
            ))}
          </Box>

          {/* Scrollable body */}
          <Box sx={{ flexGrow: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 }, "&::-webkit-scrollbar-track": { background: "transparent" } }}>
            {filtered.length === 0 ? (
              <Box sx={{ py: 10, textAlign: "center" }}>
                <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                  <LeaveIcon sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }} />
                </Box>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: T.muted, mb: 0.5 }}>
                  {leaveTypes.length === 0 ? "No leave types configured yet" : "No records match your search"}
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                  {leaveTypes.length === 0 ? "Use the form above to add your first leave type." : "Try a different search term."}
                </Typography>
              </Box>
            ) : filtered.map((lt, idx) => {
              const days = ((lt.leave_hours || 0) / 8).toFixed(1);
              const hours = lt.leave_hours || 0;
              return (
                <Box key={lt.id} onClick={() => openModal(lt)} sx={{ px: 3.5, py: 1.4, display: "grid", gridTemplateColumns: "110px 1fr 100px 160px 80px 80px 90px", gap: 1, alignItems: "center", bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}`, cursor: "pointer", transition: "background 0.13s ease", "&:hover": { bgcolor: T.rowHover }, "&:last-child": { borderBottom: "none" } }}>
                  {/* Code badge */}
                  <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, width: "fit-content" }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: T.accent, letterSpacing: "0.05em" }}>{lt.leave_code}</Typography>
                  </Box>
                  {/* Description */}
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: T.text, lineHeight: 1.3 }} noWrap>{lt.leave_description || "—"}</Typography>
                  {/* Default indicator */}
                  <Box>
                    {hours > 0 ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CheckCircleOutline sx={{ fontSize: 13, color: "#2e7d32" }} />
                        <Typography sx={{ fontSize: "0.75rem", color: "#2e7d32", fontWeight: 600 }}>Set</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <InfoOutlined sx={{ fontSize: 13, color: T.faint }} />
                        <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>None</Typography>
                      </Box>
                    )}
                  </Box>
                  {/* Gender */}
                  <Box><GenderPill restriction={lt.gender_restriction} /></Box>
                  {/* Days */}
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: hours > 0 ? T.text : T.faint }}>{hours > 0 ? `${days}d` : "—"}</Typography>
                  {/* Hours */}
                  <Typography sx={{ fontSize: "0.875rem", color: hours > 0 ? T.muted : T.faint }}>{hours > 0 ? `${hours}h` : "—"}</Typography>
                  {/* Edit button */}
                  <Box onClick={(e) => { e.stopPropagation(); openModalEdit(lt); }}>
                    <AccentButton size="small" variant="outlined" sx={{ fontSize: "0.7rem", px: 1.25, py: 0.35, height: 26, minWidth: 0, borderColor: T.accentBorder, color: T.accent, "&:hover": { borderColor: T.accent, bgcolor: T.accentFaint, transform: "none" } }}>
                      <EditIcon sx={{ fontSize: 12, mr: 0.4 }} /> Edit
                    </AccentButton>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </SectionCard>

        {/* ── Edit / View Modal ── */}
        <Modal open={!!editLeaveType} onClose={closeModal} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          <Fade in={!!editLeaveType}>
            <Box sx={{ width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 3, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", bgcolor: T.surface, display: "flex", flexDirection: "column" }}>
              {editLeaveType && (
                <>
                  {/* Header */}
                  <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden", flexShrink: 0 }}>
                    <Box sx={{ position: "absolute", top: -50, right: -30, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#fff", letterSpacing: "0.04em" }}>{editLeaveType.leave_code?.substring(0, 2)}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, mb: 0.3 }}>{isEditing ? "Edit Leave Type" : "Leave Type Details"}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.68)" }}>{editLeaveType.leave_code}</Typography>
                          {editLeaveType.gender_restriction && <Chip label={editLeaveType.gender_restriction} size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(255,255,255,0.16)", color: "#fff", fontWeight: 600 }} />}
                          {!isEditing && <Chip label="View mode" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 500 }} />}
                          {isEditing && <Chip label="Editing" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(255,200,0,0.22)", color: "#ffe082", fontWeight: 600 }} />}
                        </Box>
                      </Box>
                    </Box>
                    <IconButton onClick={closeModal} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
                      <Close sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>

                  {/* Body */}
                  <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                    <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
                      <StatCell label="Days" value={((editLeaveType.leave_hours || 0) / 8).toFixed(1)} sub="default allocation" color={T.accent} />
                      <StatCell label="Hours" value={editLeaveType.leave_hours || 0} sub="equivalent" color={T.accentMid} />
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={5}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Leave Code</Typography>
                        <FieldInput value={editLeaveType.leave_code || ""} fullWidth size="small" onChange={(e) => setEditLeaveType({ ...editLeaveType, leave_code: e.target.value.toUpperCase() })} disabled={!isEditing} inputProps={{ maxLength: 6 }} />
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Description</Typography>
                        <FieldInput value={editLeaveType.leave_description || ""} fullWidth size="small" onChange={(e) => setEditLeaveType({ ...editLeaveType, leave_description: e.target.value })} disabled={!isEditing} />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Default Days</Typography>
                        <FieldInput type="number" fullWidth size="small"
                          value={editLeaveType.leave_hours != null && editLeaveType.leave_hours !== "" ? editLeaveType.leave_hours / 8 : ""}
                          onChange={(e) => setEditLeaveType({ ...editLeaveType, leave_hours: e.target.value !== "" ? parseFloat(e.target.value) * 8 : "" })}
                          disabled={!isEditing} inputProps={{ min: 0, step: 1 }}
                          InputProps={{ endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: "0.68rem", color: T.faint }}>{editLeaveType.leave_hours || 0}h</Typography></InputAdornment> }} />
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: T.accent, mb: 0.75 }}>Gender Restriction</Typography>
                        <FormControl fullWidth size="small" disabled={!isEditing}>
                          <Select value={editLeaveType.gender_restriction ?? ""} onChange={(e) => setEditLeaveType({ ...editLeaveType, gender_restriction: e.target.value })} displayEmpty sx={selectSx}>
                            <MenuItem value=""><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><GenderIcon sx={{ fontSize: 14, opacity: 0.45 }} />No restriction</Box></MenuItem>
                            <MenuItem value="Male"><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><MaleIcon sx={{ fontSize: 14, color: "#1565C0" }} />Male only</Box></MenuItem>
                            <MenuItem value="Female"><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><FemaleIcon sx={{ fontSize: 14, color: "#C2185B" }} />Female only</Box></MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Footer */}
                  <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1.25, flexShrink: 0 }}>
                    {!isEditing ? (
                      <>
                        <AccentButton onClick={() => handleDelete(editLeaveType.id)} variant="outlined" startIcon={<DeleteIcon sx={{ fontSize: "14px !important" }} />}
                          sx={{ fontSize: "0.8rem", borderColor: "#e57373", color: "#c62828", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}>
                          Delete
                        </AccentButton>
                        <AccentButton onClick={startEdit} variant="contained" startIcon={<EditIcon sx={{ fontSize: "14px !important" }} />}
                          sx={{ fontSize: "0.8rem", bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>
                          Edit Record
                        </AccentButton>
                      </>
                    ) : (
                      <>
                        <AccentButton onClick={cancelEdit} variant="outlined" startIcon={<CancelIcon sx={{ fontSize: "14px !important" }} />}
                          sx={{ fontSize: "0.8rem", borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
                          Cancel
                        </AccentButton>
                        <AccentButton onClick={handleUpdate} variant="contained" startIcon={<SaveIcon sx={{ fontSize: "14px !important" }} />}
                          sx={{ fontSize: "0.8rem", bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>
                          Save Changes
                        </AccentButton>
                      </>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Fade>
        </Modal>
      </Box>
    </Fade>
  );
};

export default LeaveTable;