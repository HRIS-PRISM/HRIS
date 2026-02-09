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
  Container,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  Switch,
  Grid,
  Divider,
  alpha,
  styled,
  Backdrop,
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  Security as SecurityOutlined,
  Visibility,
  VisibilityOff,
  Shield,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useSystemSettings } from "../contexts/SystemSettingsContext";

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : "109, 35, 35";
};

// Professional styled components
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: "blur(10px)",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-4px)",
  },
}));

const ProfessionalButton = styled(Button)(
  ({ theme, variant, color = "primary" }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: "12px 24px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none",
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
    boxShadow:
      variant === "contained" ? "0 4px 14px rgba(254, 249, 225, 0.25)" : "none",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow:
        variant === "contained"
          ? "0 6px 20px rgba(254, 249, 225, 0.35)"
          : "none",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  })
);

const ModernTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    "&:hover": {
      transform: "translateY(-1px)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
    },
    "&.Mui-focused": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 20px rgba(254, 249, 225, 0.25)",
      backgroundColor: "rgba(255, 255, 255, 1)",
    },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 500,
  },
}));

const AdminSecurity = () => {
  const { settings: systemSettings } = useSystemSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userRole, setUserRole] = useState("");

  // Confidential password states
  const [confidentialPassword, setConfidentialPassword] = useState("");
  const [confirmConfidentialPassword, setConfirmConfidentialPassword] =
    useState("");
  const [showConfidentialPassword, setShowConfidentialPassword] =
    useState(false);
  const [passwordExists, setPasswordExists] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState(null);

  // Global MFA states
  const [globalMFAEnabled, setGlobalMFAEnabled] = useState(true);

  // Field requirements states
  const [fieldRequirements, setFieldRequirements] = useState({
    firstName: true,
    lastName: true,
    email: true,
    employeeNumber: true,
    employmentCategory: true,
    password: true,
    middleName: false,
    nameExtension: false,
    department: false,
  });

  const employeeNumber = localStorage.getItem("employeeNumber");

  // Get user role from token
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.role) {
      setUserRole(userInfo.role);
    }
  }, []);

  // Get colors from system settings
  const primaryColor = systemSettings?.primaryColor || "#6d2323";
  const secondaryColor = systemSettings?.secondaryColor || "#6d2323";
  const accentColor = systemSettings?.accentColor || "#FEF9E1";
  const textPrimaryColor = systemSettings?.textPrimaryColor || "#6D2323";
  const textSecondaryColor = systemSettings?.textSecondaryColor || "#FFFFFF";
  const backgroundColor = systemSettings?.backgroundColor || "#FFFFFF";

  useEffect(() => {
    // Check if user is superadmin, administrator, or technical
    const userInfo = getUserInfo();
    if (userInfo && userInfo.role !== "superadmin" && userInfo.role !== "administrator" && userInfo.role !== "technical") {
      navigate("/access-denied");
      return;
    }

    // Fetch confidential password info
    const fetchPasswordInfo = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/confidential-password/exists`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPasswordExists(response.data.exists);
        setPasswordInfo(response.data.passwordInfo);
      } catch (err) {
        console.error("Error loading confidential password info:", err);
      }
    };

    // Fetch global MFA setting
    const fetchGlobalMFA = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/system-settings/global_mfa_enabled`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // If setting exists, use it; otherwise default to true
        if (response.data && response.data.setting_value !== undefined) {
          setGlobalMFAEnabled(response.data.setting_value === "true" || response.data.setting_value === true);
        }
      } catch (err) {
        // If setting doesn't exist, default to true
        console.log("Global MFA setting not found, defaulting to enabled");
        setGlobalMFAEnabled(true);
      }
    };

    // Fetch field requirements
    const fetchFieldRequirements = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/system-settings/registration_field_requirements`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.setting_value) {
          try {
            const requirements = JSON.parse(response.data.setting_value);
            setFieldRequirements(requirements);
          } catch (parseErr) {
            console.error("Error parsing field requirements:", parseErr);
          }
        }
      } catch (err) {
        // If setting doesn't exist, use defaults
        console.log("Field requirements not found, using defaults");
      }
    };

    fetchPasswordInfo();
    fetchGlobalMFA();
    fetchFieldRequirements();
  }, [navigate]);

  // Handle confidential password creation/update
  const handleConfidentialPasswordSubmit = async () => {
    if (!confidentialPassword || !confirmConfidentialPassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (confidentialPassword !== confirmConfidentialPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    if (confidentialPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/confidential-password`,
        { password: confidentialPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 200) {
        setSuccessMessage(
          passwordExists
            ? "Confidential password updated successfully!"
            : "Confidential password created successfully!"
        );
        setConfidentialPassword("");
        setConfirmConfidentialPassword("");
        setTimeout(() => {
          setSuccessMessage("");
          // Refresh password info
          const fetchPasswordInfo = async () => {
            try {
              const token =
                localStorage.getItem("token") || sessionStorage.getItem("token");
              const response = await axios.get(
                `${API_BASE_URL}/api/confidential-password/exists`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setPasswordExists(response.data.exists);
              setPasswordInfo(response.data.passwordInfo);
            } catch (err) {
              console.error("Error loading confidential password info:", err);
            }
          };
          fetchPasswordInfo();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.error ||
          "Failed to save confidential password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle global MFA toggle
  const handleToggleGlobalMFA = async (event) => {
    const newValue = event.target.checked;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/system-settings/global_mfa_enabled`,
        { value: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGlobalMFAEnabled(newValue);
      setSuccessMessage(
        `Global MFA ${newValue ? "enabled" : "disabled"} successfully! All users will ${newValue ? "require" : "not require"} MFA verification on login.`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error updating global MFA setting:", err);
      setErrorMessage("Failed to update global MFA setting. Please try again.");
      setGlobalMFAEnabled(!newValue);
    } finally {
      setLoading(false);
    }
  };

  // Handle field requirement toggle
  const handleToggleFieldRequirement = async (fieldName, newValue) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedRequirements = {
        ...fieldRequirements,
        [fieldName]: newValue,
      };
      setFieldRequirements(updatedRequirements);

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/system-settings/registration_field_requirements`,
        { value: JSON.stringify(updatedRequirements) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(
        `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is now ${newValue ? "required" : "optional"} for user registration.`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error updating field requirements:", err);
      setErrorMessage("Failed to update field requirements. Please try again.");
      // Revert the change
      setFieldRequirements(fieldRequirements);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        py: 4,
        borderRadius: "14px",
        width: "100vw",
        mx: "auto",
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
        {/* Header */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard
              sx={{
                background: `rgba(${hexToRgb(accentColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(primaryColor, 0.08)}`,
                border: `1px solid ${alpha(primaryColor, 0.1)}`,
                "&:hover": {
                  boxShadow: `0 12px 48px ${alpha(primaryColor, 0.15)}`,
                },
              }}
            >
              <Box
                sx={{
                  p: 5,
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${backgroundColor} 100%)`,
                  color: textPrimaryColor,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  position="relative"
                  zIndex={1}
                >
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        bgcolor: alpha(primaryColor, 0.15),
                        mr: 4,
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 8px 24px ${alpha(primaryColor, 0.15)}`,
                      }}
                    >
                      <AdminPanelSettings
                        sx={{ color: textPrimaryColor, fontSize: 32 }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          lineHeight: 1.2,
                          color: textPrimaryColor,
                        }}
                      >
                        Admin Security Management
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.8,
                          fontWeight: 400,
                          color: textPrimaryColor,
                        }}
                      >
                        Manage system-wide security settings and confidential passwords
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: accentColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: textPrimaryColor }}>
              Processing...
            </Typography>
          </Box>
        </Backdrop>

        {errMessage && (
          <Fade in timeout={300}>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 3,
                "& .MuiAlert-message": { fontWeight: 500 },
              }}
            >
              {errMessage}
            </Alert>
          </Fade>
        )}

        {successMessage && (
          <Fade in timeout={300}>
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: 3,
                "& .MuiAlert-message": { fontWeight: 500 },
              }}
            >
              {successMessage}
            </Alert>
          </Fade>
        )}

        {/* Main Grid Layout */}
        <Grid container spacing={3}>
          {/* Left Column - MFA and Confidential Password */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              {/* Global MFA Section */}
              <Grid item xs={12}>
                <GlassCard
                  sx={{
                    background: `rgba(${hexToRgb(accentColor)}, 0.95)`,
                    boxShadow: `0 8px 40px ${alpha(primaryColor, 0.08)}`,
                    border: `1px solid ${alpha(primaryColor, 0.1)}`,
                    "&:hover": {
                      boxShadow: `0 12px 48px ${alpha(primaryColor, 0.15)}`,
                    },
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardContent
                    sx={{
                      p: 0,
                      flex: "1 1 auto",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        p: 3,
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Shield sx={{ fontSize: 28 }} />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Universal MFA Control
                      </Typography>
                    </Box>
                    <Box sx={{ p: 3 }}>
                      <Typography
                        variant="body2"
                        sx={{ mb: 2, color: "#666", lineHeight: 1.6 }}
                      >
                        Control Multi-Factor Authentication (MFA) for all users system-wide.
                      </Typography>

                      <GlassCard
                        sx={{
                          mb: 2,
                          backgroundColor: "white",
                          border: `2px solid ${primaryColor}40`,
                          borderRadius: 2,
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  color: primaryColor,
                                  fontWeight: 600,
                                  mb: 0.5,
                                }}
                              >
                                Enable Global MFA
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: "#666", fontSize: "0.85rem" }}
                              >
                                {globalMFAEnabled
                                  ? "All users must verify with MFA"
                                  : "Users control their own MFA"}
                              </Typography>
                            </Box>
                            <Switch
                              checked={globalMFAEnabled}
                              onChange={handleToggleGlobalMFA}
                              disabled={loading}
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                  color: primaryColor,
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                  {
                                    backgroundColor: primaryColor,
                                  },
                              }}
                            />
                          </Box>
                        </CardContent>
                      </GlassCard>
                    </Box>
                  </CardContent>
                </GlassCard>
              </Grid>

              {/* Confidential Password Section */}
              {(userRole === "superadmin" || userRole === "technical") && (
                <Grid item xs={12}>
                  <GlassCard
                    sx={{
                      background: `rgba(${hexToRgb(accentColor)}, 0.95)`,
                      boxShadow: `0 8px 40px ${alpha(primaryColor, 0.08)}`,
                      border: `1px solid ${alpha(primaryColor, 0.1)}`,
                      "&:hover": {
                        boxShadow: `0 12px 48px ${alpha(primaryColor, 0.15)}`,
                      },
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent
                      sx={{
                        p: 0,
                        flex: "1 1 auto",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <SecurityOutlined sx={{ fontSize: 28 }} />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          Confidential Password Management
                        </Typography>
                      </Box>
                      <Box sx={{ p: 3 }}>
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: "#666", lineHeight: 1.6 }}
                        >
                          Required for sensitive operations such as deleting payroll records and viewing audit logs.
                        </Typography>

                        {passwordInfo && (
                          <Box
                            sx={{
                              mb: 2,
                              p: 2,
                              borderRadius: 2,
                              backgroundColor: "#f8f9fa",
                              border: `1px solid ${primaryColor}30`,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ color: "#333", mb: 0.5, fontSize: "0.85rem" }}
                            >
                              <strong>Status:</strong>{" "}
                              {passwordExists
                                ? "Password is set"
                                : "No password set"}
                            </Typography>
                            {passwordInfo.updated_at && (
                              <Typography variant="body2" sx={{ color: "#333", fontSize: "0.85rem" }}>
                                <strong>Last Updated:</strong>{" "}
                                {new Date(
                                  passwordInfo.updated_at
                                ).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        )}

                        <ModernTextField
                          type={showConfidentialPassword ? "text" : "password"}
                          label={
                            passwordExists
                              ? "New Confidential Password"
                              : "Confidential Password"
                          }
                          value={confidentialPassword}
                          onChange={(e) =>
                            setConfidentialPassword(e.target.value)
                          }
                          fullWidth
                          size="small"
                          sx={{
                            mb: 2,
                          }}
                          required
                          helperText="Minimum 6 characters"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SecurityOutlined sx={{ color: primaryColor }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowConfidentialPassword(
                                      !showConfidentialPassword
                                    )
                                  }
                                  edge="end"
                                  size="small"
                                >
                                  {showConfidentialPassword ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <ModernTextField
                          type={showConfidentialPassword ? "text" : "password"}
                          label="Confirm Password"
                          value={confirmConfidentialPassword}
                          onChange={(e) =>
                            setConfirmConfidentialPassword(e.target.value)
                          }
                          fullWidth
                          size="small"
                          sx={{
                            mb: 2,
                          }}
                          required
                          helperText="Re-enter password to confirm"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SecurityOutlined sx={{ color: primaryColor }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowConfidentialPassword(
                                      !showConfidentialPassword
                                    )
                                  }
                                  edge="end"
                                  size="small"
                                >
                                  {showConfidentialPassword ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <ProfessionalButton
                          fullWidth
                          variant="contained"
                          onClick={handleConfidentialPasswordSubmit}
                          disabled={
                            loading ||
                            !confidentialPassword ||
                            !confirmConfidentialPassword
                          }
                          startIcon={<SecurityOutlined />}
                          sx={{
                            py: 1.5,
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            bgcolor: primaryColor,
                            color: "white",
                            "&:hover": {
                              bgcolor: secondaryColor,
                              transform: "scale(1.02)",
                            },
                            transition: "transform 0.2s ease-in-out",
                            "&:disabled": { bgcolor: "#cccccc" },
                          }}
                        >
                          {loading
                            ? "Saving..."
                            : passwordExists
                            ? "Update Password"
                            : "Create Password"}
                        </ProfessionalButton>
                      </Box>
                    </CardContent>
                  </GlassCard>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* Right Column - Field Requirements Section */}
          <Grid item xs={12} md={6}>
            <GlassCard
              sx={{
                background: `rgba(${hexToRgb(accentColor)}, 0.95)`,
                boxShadow: `0 8px 40px ${alpha(primaryColor, 0.08)}`,
                border: `1px solid ${alpha(primaryColor, 0.1)}`,
                "&:hover": {
                  boxShadow: `0 12px 48px ${alpha(primaryColor, 0.15)}`,
                },
                maxHeight: "800px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <AdminPanelSettings sx={{ fontSize: 28 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Registration Field Requirements
                  </Typography>
                </Box>
                <Box sx={{ p: 4, flex: "1 1 auto", overflowY: "auto" }}>
                  <Typography
                    variant="body1"
                    sx={{ mb: 3, color: "#666", lineHeight: 1.6 }}
                  >
                    Configure which fields are required or optional for user registration. 
                    Changes will apply to both Single Registration and Bulk Registration forms.
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    {[
                      { key: "firstName", label: "First Name" },
                      { key: "lastName", label: "Last Name" },
                      { key: "email", label: "Email Address" },
                      { key: "employeeNumber", label: "Employee Number" },
                      { key: "employmentCategory", label: "Employment Category" },
                      { key: "password", label: "Password" },
                      { key: "middleName", label: "Middle Name" },
                      { key: "nameExtension", label: "Name Extension" },
                      { key: "department", label: "Department" },
                    ].map((field) => (
                      <GlassCard
                        key={field.key}
                        sx={{
                          mb: 2,
                          backgroundColor: "white",
                          border: `2px solid ${primaryColor}40`,
                          borderRadius: 2,
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="h6"
                                sx={{
                                  color: primaryColor,
                                  fontWeight: 600,
                                  mb: 0.5,
                                  fontSize: "1rem",
                                }}
                              >
                                {field.label}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: "#666", fontSize: "0.85rem" }}
                              >
                                {fieldRequirements[field.key]
                                  ? "Required field - users must fill this in"
                                  : "Optional field - users can skip this"}
                              </Typography>
                            </Box>
                            <Switch
                              checked={fieldRequirements[field.key] || false}
                              onChange={(e) =>
                                handleToggleFieldRequirement(
                                  field.key,
                                  e.target.checked
                                )
                              }
                              disabled={loading}
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                  color: primaryColor,
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                  {
                                    backgroundColor: primaryColor,
                                  },
                              }}
                            />
                          </Box>
                        </CardContent>
                      </GlassCard>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      backgroundColor: "#f8f9fa",
                      border: `1px solid ${primaryColor}20`,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: primaryColor,
                        fontWeight: 600,
                        mb: 2,
                      }}
                    >
                      How it works:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#666", lineHeight: 1.8 }}
                    >
                      • Required fields must be filled before registration can proceed
                      <br />
                      • Optional fields can be left empty
                      <br />
                      • Changes apply immediately to both registration forms
                      <br />
                      • Only superadmin and administrator can modify these settings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminSecurity;
