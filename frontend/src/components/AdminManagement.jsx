import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getUserInfo } from "../utils/auth";
import {
  Alert,
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Card,
  Switch,
  Grid,
  Divider,
  alpha,
  styled,
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  Security as SecurityOutlined,
  Visibility,
  VisibilityOff,
  Shield,
  AdminPanelSettings,
  Lock as LockIcon,
  CheckCircle,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
};

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset":             { borderColor: T.accentBorder },
    "&:hover fieldset":       { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
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
  "&:hover":  { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

// ─── Shared sub-components ────────────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: "flex", alignItems: "center", gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>
      {title}
    </Typography>
    {right && <><Box sx={{ flex: 1 }} />{right}</>}
  </Box>
);

const ToggleRow = ({ label, description, checked, onChange, disabled }) => (
  <Box sx={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    px: 2, py: 1.25, borderRadius: 1.5, bgcolor: "#fff",
    border: `1px solid ${T.accentBorder}`, mb: 1,
    transition: "border-color 0.15s",
    "&:hover": { borderColor: T.accent },
  }}>
    <Box sx={{ pr: 1 }}>
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: T.text, lineHeight: 1.3 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.7rem", color: T.muted, mt: 0.2 }}>
        {description}
      </Typography>
    </Box>
    <Switch
      checked={checked} onChange={onChange} disabled={disabled} size="small"
      sx={{
        flexShrink: 0,
        "& .MuiSwitch-switchBase.Mui-checked": { color: T.accent },
        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: T.accent },
      }}
    />
  </Box>
);

const StatusBadge = ({ active, label }) => (
  <Box sx={{
    display: "inline-flex", alignItems: "center", gap: 0.5,
    px: 1.25, py: 0.3, borderRadius: "6px",
    bgcolor: active ? "rgba(46,125,50,0.08)" : T.accentFaint,
    border: `1px solid ${active ? "rgba(46,125,50,0.22)" : T.accentBorder}`,
  }}>
    {active
      ? <CheckCircle sx={{ fontSize: 10, color: "#2E7D32" }} />
      : <CancelIcon  sx={{ fontSize: 10, color: T.faint   }} />}
    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: active ? "#2E7D32" : T.faint }}>
      {label}
    </Typography>
  </Box>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminSecurity = () => {
  const { settings: systemSettings } = useSystemSettings();
  const navigate = useNavigate();

  const [loading,        setLoading]        = useState(false);
  const [errMessage,     setErrorMessage]   = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userRole,       setUserRole]       = useState("");

  const [confidentialPassword,        setConfidentialPassword]        = useState("");
  const [confirmConfidentialPassword, setConfirmConfidentialPassword] = useState("");
  const [showConfidentialPassword,    setShowConfidentialPassword]    = useState(false);
  const [passwordExists,              setPasswordExists]              = useState(false);
  const [passwordInfo,                setPasswordInfo]                = useState(null);

  const [globalMFAEnabled, setGlobalMFAEnabled] = useState(true);

  const [fieldRequirements, setFieldRequirements] = useState({
    firstName: true, lastName: true, email: true,
    employeeNumber: true, employmentCategory: true, password: true,
    middleName: false, nameExtension: false, department: false,
  });

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo?.role) setUserRole(userInfo.role);
    if (userInfo &&
      userInfo.role !== "superadmin" &&
      userInfo.role !== "administrator" &&
      userInfo.role !== "technical"
    ) { navigate("/access-denied"); return; }

    const token   = localStorage.getItem("token") || sessionStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    axios.get(`${API_BASE_URL}/api/confidential-password/exists`, { headers })
      .then(r => { setPasswordExists(r.data.exists); setPasswordInfo(r.data.passwordInfo); })
      .catch(() => {});

    axios.get(`${API_BASE_URL}/api/system-settings/global_mfa_enabled`, { headers })
      .then(r => {
        if (r.data?.setting_value !== undefined)
          setGlobalMFAEnabled(r.data.setting_value === "true" || r.data.setting_value === true);
      })
      .catch(() => setGlobalMFAEnabled(true));

    axios.get(`${API_BASE_URL}/api/system-settings/registration_field_requirements`, { headers })
      .then(r => {
        if (r.data?.setting_value)
          try { setFieldRequirements(JSON.parse(r.data.setting_value)); } catch {}
      })
      .catch(() => {});
  }, [navigate]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePasswordSubmit = async () => {
    if (!confidentialPassword || !confirmConfidentialPassword)
      return setErrorMessage("Please fill in all fields.");
    if (confidentialPassword !== confirmConfidentialPassword)
      return setErrorMessage("Passwords do not match!");
    if (confidentialPassword.length < 6)
      return setErrorMessage("Password must be at least 6 characters long.");

    setLoading(true); setErrorMessage(""); setSuccessMessage("");
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/confidential-password`,
        { password: confidentialPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 200) {
        setSuccessMessage(passwordExists ? "Password updated successfully!" : "Password created successfully!");
        setConfidentialPassword(""); setConfirmConfidentialPassword("");
        setTimeout(async () => {
          setSuccessMessage("");
          const t2 = localStorage.getItem("token") || sessionStorage.getItem("token");
          const r = await axios.get(`${API_BASE_URL}/api/confidential-password/exists`,
            { headers: { Authorization: `Bearer ${t2}` } }).catch(() => null);
          if (r) { setPasswordExists(r.data.exists); setPasswordInfo(r.data.passwordInfo); }
        }, 2000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to save confidential password.");
    } finally { setLoading(false); }
  };

  const handleToggleMFA = async (e) => {
    const val = e.target.checked;
    setLoading(true); setErrorMessage(""); setSuccessMessage("");
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/api/system-settings/global_mfa_enabled`,
        { value: val }, { headers: { Authorization: `Bearer ${token}` } });
      setGlobalMFAEnabled(val);
      setSuccessMessage(`Global MFA ${val ? "enabled" : "disabled"} successfully.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch {
      setErrorMessage("Failed to update MFA setting.");
      setGlobalMFAEnabled(!val);
    } finally { setLoading(false); }
  };

  const handleToggleField = async (key, val) => {
    const prev = { ...fieldRequirements };
    const next = { ...fieldRequirements, [key]: val };
    setFieldRequirements(next);
    setLoading(true); setErrorMessage(""); setSuccessMessage("");
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/api/system-settings/registration_field_requirements`,
        { value: JSON.stringify(next) }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccessMessage(`${key.charAt(0).toUpperCase() + key.slice(1)} is now ${val ? "required" : "optional"}.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch {
      setErrorMessage("Failed to update field requirements.");
      setFieldRequirements(prev);
    } finally { setLoading(false); }
  };

  const canSubmit = !loading && !!confidentialPassword && !!confirmConfidentialPassword;
  const showPasswordSection = userRole === "superadmin" || userRole === "technical";

  const fieldList = [
    { key: "firstName",          label: "First Name"          },
    { key: "lastName",           label: "Last Name"           },
    { key: "email",              label: "Email Address"       },
    { key: "employeeNumber",     label: "Employee Number"     },
    { key: "employmentCategory", label: "Employment Category" },
    { key: "password",           label: "Password"            },
    { key: "middleName",         label: "Middle Name"         },
    { key: "nameExtension",      label: "Name Extension"      },
    { key: "department",         label: "Department"          },
  ];

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        mb: { xs: 1, md: 2 },
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* ── Page header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative", overflow: "hidden",
          }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.10) 0%, transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,35,35,0.07) 0%, transparent 70%)" }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
              <AdminPanelSettings sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Admin Security Management
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600 }}>
                  MFA control · confidential password · registration field settings
                </Typography>
              </Box>
            </Box>

            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.accent, fontWeight: 700, textTransform: "capitalize" }}>
                  {userRole || "Admin"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Alerts ── */}
        {errMessage && (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem" }} onClose={() => setErrorMessage("")}>
            {errMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem" }} onClose={() => setSuccessMessage("")}>
            {successMessage}
          </Alert>
        )}

        {/* ── Body ── */}
        <Grid container spacing={2} alignItems="flex-start">

          {/* LEFT */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>

              {/* MFA */}
              <Grid item xs={12}>
                <SectionCard>
                  <PanelHeader icon={Shield} title="Universal MFA Control" />
                  <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
                    <Typography sx={{ fontSize: "0.76rem", color: T.muted, mb: 2, lineHeight: 1.65 }}>
                      When enabled, every user must complete MFA verification on login
                      regardless of their personal settings.
                    </Typography>

                    <ToggleRow
                      label="Enable Global MFA"
                      description={globalMFAEnabled
                        ? "All users must verify with MFA on login"
                        : "Users control their own MFA preferences"}
                      checked={globalMFAEnabled}
                      onChange={handleToggleMFA}
                      disabled={loading}
                    />

                    <Box sx={{
                      mt: 1.5, px: 2, py: 1.25, borderRadius: 1.5,
                      bgcolor: globalMFAEnabled ? "rgba(46,125,50,0.05)" : T.accentFaint,
                      border: `1px solid ${globalMFAEnabled ? "rgba(46,125,50,0.18)" : T.accentBorder}`,
                      display: "flex", alignItems: "center", gap: 1,
                    }}>
                      <CheckCircle sx={{ fontSize: 12, color: globalMFAEnabled ? "#2E7D32" : T.faint }} />
                      <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: globalMFAEnabled ? "#2E7D32" : T.faint }}>
                        {globalMFAEnabled
                          ? "MFA is enforced globally — all accounts are protected"
                          : "MFA is optional — users manage their own settings"}
                      </Typography>
                    </Box>
                  </Box>
                </SectionCard>
              </Grid>

              {/* Confidential password */}
              {showPasswordSection && (
                <Grid item xs={12}>
                  <SectionCard>
                    <PanelHeader
                      icon={SecurityOutlined}
                      title="Confidential Password"
                      right={
                        <StatusBadge
                          active={passwordExists}
                          label={passwordExists ? "Password set" : "Not configured"}
                        />
                      }
                    />
                    <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
                      <Typography sx={{ fontSize: "0.76rem", color: T.muted, mb: 2, lineHeight: 1.65 }}>
                        Required for sensitive operations such as deleting payroll records
                        and viewing audit logs.
                      </Typography>

                      {passwordInfo?.updated_at && (
                        <Box sx={{
                          mb: 2, px: 2, py: 1, borderRadius: 1.5,
                          bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>Last updated</Typography>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.text }}>
                            {new Date(passwordInfo.updated_at).toLocaleString()}
                          </Typography>
                        </Box>
                      )}

                      <FieldInput
                        type={showConfidentialPassword ? "text" : "password"}
                        label={passwordExists ? "New Password" : "Confidential Password"}
                        value={confidentialPassword}
                        onChange={e => setConfidentialPassword(e.target.value)}
                        fullWidth size="small" required
                        helperText="Minimum 6 characters"
                        sx={{ mb: 1.5 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SecurityOutlined sx={{ fontSize: 14, color: T.muted }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowConfidentialPassword(p => !p)} edge="end" size="small">
                                {showConfidentialPassword ? <VisibilityOff sx={{ fontSize: 15 }} /> : <Visibility sx={{ fontSize: 15 }} />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <FieldInput
                        type={showConfidentialPassword ? "text" : "password"}
                        label="Confirm Password"
                        value={confirmConfidentialPassword}
                        onChange={e => setConfirmConfidentialPassword(e.target.value)}
                        fullWidth size="small" required
                        helperText="Re-enter to confirm"
                        sx={{ mb: 2 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockIcon sx={{ fontSize: 14, color: T.muted }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowConfidentialPassword(p => !p)} edge="end" size="small">
                                {showConfidentialPassword ? <VisibilityOff sx={{ fontSize: 15 }} /> : <Visibility sx={{ fontSize: 15 }} />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <AccentButton
                        fullWidth variant="contained"
                        onClick={handlePasswordSubmit}
                        disabled={!canSubmit}
                        startIcon={loading
                          ? <CircularProgress size={13} sx={{ color: "#fff" }} />
                          : <SecurityOutlined sx={{ fontSize: "15px !important" }} />}
                        sx={{
                          height: 40,
                          bgcolor: canSubmit ? T.accent : "#d8d8d8",
                          color:   canSubmit ? "#fff"   : "#999",
                          boxShadow: canSubmit ? `0 2px 10px ${alpha(T.accent, 0.28)}` : "none",
                          "&:hover": { bgcolor: canSubmit ? T.accentDark : "#d8d8d8" },
                          "&:disabled": { bgcolor: "#d8d8d8 !important", color: "#999 !important", boxShadow: "none !important", transform: "none !important" },
                        }}
                      >
                        {loading ? "Saving…" : passwordExists ? "Update Password" : "Create Password"}
                      </AccentButton>
                    </Box>
                  </SectionCard>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* RIGHT — field requirements */}
          <Grid item xs={12} md={6}>
            <SectionCard>
              <PanelHeader
                icon={AdminPanelSettings}
                title="Registration Field Requirements"
                right={
                  <Typography sx={{ fontSize: "0.68rem", color: T.faint }}>applies immediately</Typography>
                }
              />
              <Box sx={{
                px: 2.5, pt: 2, pb: 2.5,
                maxHeight: 600, overflowY: "auto",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
              }}>
                <Typography sx={{ fontSize: "0.76rem", color: T.muted, mb: 2, lineHeight: 1.65 }}>
                  Toggle which fields are required during user registration.
                  Applies to both Single and Bulk Registration.
                </Typography>

                {fieldList.map(f => (
                  <ToggleRow
                    key={f.key}
                    label={f.label}
                    description={fieldRequirements[f.key]
                      ? "Required — must be filled before submitting"
                      : "Optional — can be skipped"}
                    checked={fieldRequirements[f.key] || false}
                    onChange={e => handleToggleField(f.key, e.target.checked)}
                    disabled={loading}
                  />
                ))}

                <Divider sx={{ my: 2, borderColor: T.divider }} />

                <Box sx={{
                  px: 2, py: 1.75, borderRadius: 1.5,
                  bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
                }}>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, mb: 0.75 }}>
                    How it works
                  </Typography>
                  {[
                    "Required fields block form submission if left empty",
                    "Optional fields can be left blank by the user",
                    "Changes take effect immediately on both registration forms",
                    "Only superadmin and administrator can modify these settings",
                  ].map((line, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, mb: i < 3 ? 0.5 : 0 }}>
                      <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: alpha(T.accent, 0.45), mt: "5px", flexShrink: 0 }} />
                      <Typography sx={{ fontSize: "0.7rem", color: T.muted, lineHeight: 1.55 }}>
                        {line}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>
          </Grid>

        </Grid>
      </Box>
    </Fade>
  );
};

export default AdminSecurity;