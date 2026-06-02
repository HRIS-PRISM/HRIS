import API_BASE_URL from "../apiConfig";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Grid,
  InputAdornment,
  Box,
  CircularProgress,
  Fade,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  TextField,
  Avatar,
  Chip,
  Checkbox,
  FormControlLabel,
  styled,
} from "@mui/material";
import {
  PersonOutline,
  EmailOutlined,
  BadgeOutlined,
  LockOutlined,
  PersonAddAlt1,
  CheckCircleOutline,
  ErrorOutline,
  AdminPanelSettings,
  InfoOutlined,
} from "@mui/icons-material";
import earistLogo from "../assets/earistLogo.jpg";

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  divider: "rgba(0,0,0,0.08)",
};

const EMPTY_FORM = {
  firstName: "", middleName: "", lastName: "", nameExtension: "",
  email: "", employeeNumber: "", role: "",
};

const Register = () => {
  const ModernTextField = useMemo(
    () =>
      styled(TextField)(() => ({
        "& .MuiOutlinedInput-root": {
          borderRadius: 8, transition: "all 0.18s ease", backgroundColor: "#fafafa",
          "& fieldset": { borderColor: T.accentBorder },
          "&:hover": { backgroundColor: "#fff", "& fieldset": { borderColor: T.accentMid } },
          "&.Mui-focused": { backgroundColor: "#fff", boxShadow: "0 0 0 2px rgba(109,35,35,0.12)", "& fieldset": { borderColor: T.accent } },
        },
        "& .MuiInputLabel-root": { fontWeight: 500, "&.Mui-focused": { color: T.accent } },
        "& .MuiFormHelperText-root": { marginLeft: 0, fontSize: "0.72rem" },
        "& .MuiInputAdornment-root .MuiSvgIcon-root": { color: T.faint },
      })),
    [],
  );

  const selectInnerSx = {
    borderRadius: 8, backgroundColor: "#fafafa", transition: "all 0.18s ease",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder, borderRadius: 8 },
    "&:hover": { backgroundColor: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentMid } },
    "&.Mui-focused": { backgroundColor: "#fff", boxShadow: "0 0 0 2px rgba(109,35,35,0.12)", "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accent } },
  };

  const selectControlSx = {
    "& .MuiInputLabel-root": { fontWeight: 500, "&.Mui-focused": { color: T.accent } },
  };

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInformationConfirmed, setIsInformationConfirmed] = useState(false);

  const [fieldRequirements, setFieldRequirements] = useState({
    firstName: true, lastName: true, email: true, employeeNumber: true,
    password: true, middleName: false, nameExtension: false,
  });

  const navigate = useNavigate();

  // Ensure body is never scroll-locked on this standalone page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fetch field requirements
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const base = API_BASE_URL.includes("/api") ? API_BASE_URL : `${API_BASE_URL}/api`;
        const res = await fetch(`${base}/system-settings/registration_field_requirements`, { headers });
        if (res.ok) {
          const d = await res.json();
          if (d?.setting_value) try { setFieldRequirements(JSON.parse(d.setting_value)); } catch {}
          return;
        }
        if (res.status === 404) {
          const all = await (await fetch(`${base}/system-settings`, { headers })).json();
          const raw = all?.registration_field_requirements;
          if (!raw) return;
          if (typeof raw === "string") try { setFieldRequirements(JSON.parse(raw)); } catch {}
          else if (typeof raw === "object") setFieldRequirements(raw);
        }
      } catch (err) {
        console.error("[Register] Failed to fetch field requirements:", err?.message);
      }
    })();
  }, []);

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isValidName = (n) =>
    !!n && n.trim().length >= 2 && n.trim().length <= 50 && /^[a-zA-Z\s'-]+$/.test(n.trim());

  const handleRegister = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, employeeNumber, role } = formData;

    const missing = [];
    if (fieldRequirements.firstName && !firstName) missing.push("First Name");
    if (fieldRequirements.lastName && !lastName) missing.push("Last Name");
    if (fieldRequirements.email && !email) missing.push("Email");
    if (fieldRequirements.employeeNumber && !employeeNumber) missing.push("Employee Number");
    if (!role) missing.push("Role");
    if (missing.length) { setErrorMessage(`Required fields missing: ${missing.join(", ")}.`); setSuccessMessage(""); return; }

    if (!isValidName(firstName)) { setErrorMessage("Enter a valid first name (2–50 letters)."); setSuccessMessage(""); return; }
    if (!isValidName(lastName)) { setErrorMessage("Enter a valid last name (2–50 letters)."); setSuccessMessage(""); return; }
    if (formData.middleName && !isValidName(formData.middleName)) { setErrorMessage("Enter a valid middle name (2–50 letters)."); setSuccessMessage(""); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMessage("Enter a valid email address."); setSuccessMessage(""); return; }

    const autoPassword = lastName.toUpperCase().replace(/\s+/g, "");
    setIsLoading(true); setErrorMessage(""); setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          middleName: formData.middleName || null,
          lastName,
          nameExtension: formData.nameExtension || null,
          email,
          employeeNumber,
          password: autoPassword,
          employmentCategory: 0,
          department: "",
        }),
      });

      if (res.ok) {
        setTimeout(() => {
          setIsLoading(false);
          setSuccessMessage("Account created successfully! Redirecting to login…");
          setIsInformationConfirmed(false);
          setTimeout(() => navigate("/"), 2000);
        }, 500);
      } else {
        const errData = await res.json();
        setIsLoading(false);
        setErrorMessage(errData.error || "Registration failed. Try again.");
      }
    } catch (err) {
      console.error("Registration Error", err);
      setIsLoading(false);
      setErrorMessage("A network error occurred. Please try again.");
    }
  };

  const autoPassword = formData.lastName ? formData.lastName.toUpperCase().replace(/\s+/g, "") : "";

  return (
    <>
      {/* Fixed full-screen background */}
      <Box sx={{ position: "fixed", inset: 0, background: "linear-gradient(135deg, rgba(75,0,0,0.82) 0%, rgba(0,0,0,0.88) 100%)" }} />

      {/* Fixed centered overlay */}
      <Box sx={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Fade in timeout={500}>
          <Box
            sx={{
              width: 600,
              maxWidth: "100%",
              maxHeight: "calc(100vh - 32px)",
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.93)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(200,180,180,0.35)",
              borderRadius: "24px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            {/* ── Card header ── */}
            <Box
              sx={{
                px: 3, py: 1.5, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(253,245,245,0.98) 0%, rgba(240,222,222,0.98) 100%)",
                position: "relative", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: `1px solid ${T.accentBorder}`,
              }}
            >
              <Box sx={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle, ${T.accentFaint} 0%, transparent 70%)` }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                <Avatar src={earistLogo} sx={{ width: 36, height: 36, boxShadow: "0 4px 14px rgba(109,35,35,0.18)" }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.2, color: T.accent, fontSize: "0.94rem" }}>Create account</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, color: T.muted }}>Emergency bypass — restore access for lost admin accounts</Typography>
                </Box>
              </Box>
              <Chip label="Bypass" size="small" sx={{ bgcolor: T.accentFaint, color: T.accent, fontWeight: 600, border: `1px solid ${T.accentBorder}`, position: "relative", zIndex: 1 }} />
            </Box>

            {/* ── Form body ── */}
            <Box
              component="form"
              onSubmit={handleRegister}
              sx={{
                px: 3, pt: 1.5, pb: 2,
                flex: 1, overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: `${T.accentBorder} transparent`,
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
              }}
            >
              {/* Personal Information */}
              <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: T.faint, mb: 0.75 }}>
                Personal information
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={3}>
                  <ModernTextField
                    name="firstName"
                    label={`First name${fieldRequirements.firstName ? " *" : ""}`}
                    fullWidth size="small" placeholder="Juan"
                    value={formData.firstName} onChange={handleChanges}
                    InputLabelProps={{ required: false }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 15 }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <ModernTextField
                    name="middleName"
                    label={`Middle name${fieldRequirements.middleName ? " *" : ""}`}
                    fullWidth size="small" placeholder="Santos"
                    value={formData.middleName} onChange={handleChanges}
                    InputLabelProps={{ required: false }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 15 }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <ModernTextField
                    name="lastName"
                    label={`Last name${fieldRequirements.lastName ? " *" : ""}`}
                    fullWidth size="small" placeholder="Dela Cruz"
                    value={formData.lastName} onChange={handleChanges}
                    InputLabelProps={{ required: false }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 15 }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <FormControl fullWidth size="small" sx={selectControlSx}>
                    <InputLabel shrink sx={{ fontWeight: 500 }}>Ext.</InputLabel>
                    <Select
                      name="nameExtension" value={formData.nameExtension}
                      label="Ext." onChange={handleChanges}
                      displayEmpty notched sx={selectInnerSx}
                      renderValue={(val) => val || <span style={{ color: T.faint }}>None</span>}
                    >
                      <MenuItem value=""><em style={{ color: T.faint, fontSize: "0.85rem" }}>None</em></MenuItem>
                      {["Jr.", "Sr.", "II", "III", "IV", "V"].map((v) => (
                        <MenuItem key={v} value={v} sx={{ fontSize: "0.875rem" }}>{v}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <ModernTextField
                    name="email"
                    label={`Email address${fieldRequirements.email ? " *" : ""}`}
                    type="email" fullWidth size="small"
                    placeholder="jdelacruz@earist.edu.ph"
                    value={formData.email} onChange={handleChanges}
                    InputLabelProps={{ required: false }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ fontSize: 15 }} /></InputAdornment> }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ borderTop: `1px dashed ${T.divider}`, my: 1.25 }} />

              {/* Account Details */}
              <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: T.faint, mb: 0.75 }}>
                Account details
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <ModernTextField
                    name="employeeNumber"
                    label={`Employee number${fieldRequirements.employeeNumber ? " *" : ""}`}
                    fullWidth size="small" placeholder="2013-4410"
                    value={formData.employeeNumber} onChange={handleChanges}
                    InputLabelProps={{ required: false }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlined sx={{ fontSize: 15 }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small" sx={selectControlSx}>
                    <InputLabel shrink sx={{ fontWeight: 500 }}>Role *</InputLabel>
                    <Select
                      name="role" value={formData.role} label="Role *"
                      onChange={handleChanges} displayEmpty notched
                      startAdornment={<InputAdornment position="start"><AdminPanelSettings sx={{ fontSize: 15 }} /></InputAdornment>}
                      sx={selectInnerSx}
                      renderValue={(val) => val || <span style={{ color: T.faint }}>Select role…</span>}
                    >
                      <MenuItem value="" disabled>
                        <Typography sx={{ color: T.faint, fontSize: "0.875rem" }}>Select role…</Typography>
                      </MenuItem>
                      {[
                        { value: "superadmin",    label: "Super admin" },
                        { value: "administrator", label: "Administrator" },
                        { value: "technical",     label: "Technical" },
                      ].map((opt) => (
                        <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.875rem" }}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Password banner */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 0.85, borderRadius: 2, border: `1px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
                    <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: "rgba(109,35,35,0.08)", border: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <LockOutlined sx={{ fontSize: 13, color: T.accent }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.text, lineHeight: 1.2 }}>Password</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: T.faint }}>From last name</Typography>
                    </Box>
                    <Box sx={{ width: "1px", height: 20, bgcolor: T.accentBorder, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {autoPassword ? (
                        <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.3, borderRadius: 1, bgcolor: "rgba(46,125,50,0.10)", border: "1px solid rgba(46,125,50,0.3)" }}>
                          <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.78rem", fontWeight: 700, color: "#1a5e20", letterSpacing: "0.08em" }}>
                            {autoPassword}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontStyle: "italic" }}>Enter a last name to preview…</Typography>
                      )}
                    </Box>
                    <Chip
                      icon={<CheckCircleOutline sx={{ fontSize: "11px !important" }} />}
                      label="Auto" size="small"
                      sx={{ bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, fontSize: "0.63rem", flexShrink: 0, height: 20, border: `1px solid ${T.accentBorder}`, "& .MuiChip-icon": { color: T.accent } }}
                    />
                    <Tooltip title="Derived from last name — uppercase, no spaces. Can be changed after first login." placement="top" arrow>
                      <InfoOutlined sx={{ fontSize: 14, color: T.faint, cursor: "help", flexShrink: 0 }} />
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>

              {/* Alerts */}
              {errMessage && (
                <Fade in>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: "7px 12px", mt: 1, borderRadius: "10px", bgcolor: "rgba(200,30,30,0.04)", border: "1px solid rgba(200,30,30,0.12)" }}>
                    <ErrorOutline sx={{ fontSize: 15, color: "#8a2020", flexShrink: 0, mt: "1px" }} />
                    <Typography sx={{ fontSize: "0.78rem", color: "#8a2020", lineHeight: 1.4 }}>{errMessage}</Typography>
                  </Box>
                </Fade>
              )}
              {successMessage && (
                <Fade in>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: "7px 12px", mt: 1, borderRadius: "10px", bgcolor: "rgba(46,125,50,0.05)", border: "1px solid rgba(46,125,50,0.22)" }}>
                    <CheckCircleOutline sx={{ fontSize: 15, color: "#2E7D32", flexShrink: 0, mt: "1px" }} />
                    <Typography sx={{ fontSize: "0.78rem", color: "#1a5e20", lineHeight: 1.4 }}>{successMessage}</Typography>
                  </Box>
                </Fade>
              )}

              {/* Footer */}
              <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${T.divider}` }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isInformationConfirmed}
                      onChange={(e) => setIsInformationConfirmed(e.target.checked)}
                      disabled={isLoading} size="small"
                      sx={{ p: 0.4, mr: 0.75, color: T.accentBorder, "&.Mui-checked": { color: T.accent } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: "0.74rem", color: T.muted, lineHeight: 1.4 }}>I certify that the information entered above is accurate and ready for official record.</Typography>}
                  sx={{ ml: 0, mr: 0, alignItems: "center", mb: 1 }}
                />
                <Box
                  component="button" type="submit"
                  disabled={isLoading || !isInformationConfirmed}
                  sx={{
                    width: "100%", height: 44,
                    background: (isLoading || !isInformationConfirmed) ? "rgba(109,35,35,0.25)" : T.accent,
                    border: "none", borderRadius: "12px", color: "#fff",
                    fontSize: "0.88rem", fontWeight: 600,
                    cursor: (isLoading || !isInformationConfirmed) ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    transition: "background 0.2s", fontFamily: "inherit",
                  }}
                >
                  {isLoading ? <CircularProgress size={15} sx={{ color: "#fff" }} /> : <PersonAddAlt1 sx={{ fontSize: 17 }} />}
                  {isLoading ? "Creating account…" : "Create account"}
                </Box>
                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Typography component="span" sx={{ fontSize: "0.79rem", color: T.muted }}>Already have an account? </Typography>
                  <Typography component="span" onClick={() => navigate("/")}
                    sx={{ fontSize: "0.79rem", color: T.accent, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>
                    Login here
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Box>
    </>
  );
};

export default Register;