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
  Backdrop,
  CircularProgress,
  Fade,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from "@mui/material";
import {
  Security as SecurityOutlined,
  Visibility,
  VisibilityOff,
  Shield,
  AdminPanelSettings,
  CheckCircleOutline,
  LockOutlined,
  VerifiedUser,
  Settings,
  Email,
  Campaign,
} from "@mui/icons-material";
import { useSystemSettings } from "../contexts/SystemSettingsContext";


const AdminSecurity = () => {
  const { settings: systemSettings } = useSystemSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userRole, setUserRole] = useState("");


  // Confidential password states
  const [confidentialPassword, setConfidentialPassword] = useState("");
  const [confirmConfidentialPassword, setConfirmConfidentialPassword] = useState("");
  const [showConfidentialPassword, setShowConfidentialPassword] = useState(false);
  const [passwordExists, setPasswordExists] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState(null);


  // Global MFA states
  const [globalMFAEnabled, setGlobalMFAEnabled] = useState(true);


  // Email domain restriction states
  const [emailDomainRestricted, setEmailDomainRestricted] = useState(false);


  // Send Registration Emails State
  const [sendRegistrationEmails, setSendRegistrationEmails] = useState(true);


  // Broadcast State
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);


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


  // Get colors from system settings with professional defaults
  const primaryColor = systemSettings?.primaryColor || "#1976d2";
  const secondaryColor = systemSettings?.secondaryColor || "#0d47a1";
  const accentColor = systemSettings?.accentColor || "#f5f5f5";
  const textPrimaryColor = systemSettings?.textPrimaryColor || "#1a1a1a";
  const textSecondaryColor = systemSettings?.textSecondaryColor || "#666666";


  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.role) {
      setUserRole(userInfo.role);
    }
  }, []);


  useEffect(() => {
    const userInfo = getUserInfo();
    if (
      userInfo &&
      userInfo.role !== "superadmin" &&
      userInfo.role !== "administrator" &&
      userInfo.role !== "technical"
    ) {
      navigate("/access-denied");
      return;
    }


    const fetchPasswordInfo = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
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


    const fetchGlobalMFA = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/system-settings/global_mfa_enabled`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.setting_value !== undefined) {
          setGlobalMFAEnabled(
            response.data.setting_value === "true" || response.data.setting_value === true
          );
        }
      } catch (err) {
        console.log("Global MFA setting not found, defaulting to enabled");
        setGlobalMFAEnabled(true);
      }
    };


    const fetchEmailDomainRestriction = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/email-domain-restriction`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.setting_value !== undefined) {
          setEmailDomainRestricted(response.data.setting_value === true);
        }
      } catch (err) {
        console.log("Email domain restriction not found, defaulting to disabled");
        setEmailDomainRestricted(false);
      }
    };


    const fetchSendRegistrationEmails = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/send-registration-emails`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.setting_value !== undefined) {
          setSendRegistrationEmails(response.data.setting_value === true);
        }
      } catch (err) {
        console.log("Send registration emails setting not found, defaulting to enabled");
        setSendRegistrationEmails(true);
      }
    };


    const fetchFieldRequirements = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
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
        console.log("Field requirements not found, using defaults");
      }
    };


    fetchPasswordInfo();
    fetchGlobalMFA();
    fetchEmailDomainRestriction();
    fetchSendRegistrationEmails();
    fetchFieldRequirements();
  }, [navigate]);


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
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
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
          const fetchPasswordInfo = async () => {
            try {
              const token = localStorage.getItem("token") || sessionStorage.getItem("token");
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
        err.response?.data?.error || "Failed to save confidential password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  const handleToggleGlobalMFA = async (event) => {
    const newValue = event.target.checked;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");


    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/system-settings/global_mfa_enabled`,
        { value: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGlobalMFAEnabled(newValue);
      setSuccessMessage(
        `Global MFA ${newValue ? "enabled" : "disabled"} successfully! All users will ${
          newValue ? "require" : "not require"
        } MFA verification on login.`
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


  const handleToggleEmailDomainRestriction = async (event) => {
    const newValue = event.target.checked;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");


    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/email-domain-restriction`,
        { value: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailDomainRestricted(newValue);
      setSuccessMessage(
        `Email domain restriction ${newValue ? "enabled" : "disabled"} successfully! ${
          newValue
            ? "Only @earist.edu.ph email addresses will be accepted."
            : "All email domains are now allowed."
        }`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error updating email domain restriction:", err);
      setErrorMessage("Failed to update email domain restriction. Please try again.");
      setEmailDomainRestricted(!newValue);
    } finally {
      setLoading(false);
    }
  };


  const handleToggleSendRegistrationEmails = async (event) => {
    const newValue = event.target.checked;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");


    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/send-registration-emails`,
        { value: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSendRegistrationEmails(newValue);
      setSuccessMessage(
        `Registration emails ${newValue ? "enabled" : "disabled"} successfully!`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error updating registration email setting:", err);
      setErrorMessage("Failed to update email sending setting. Please try again.");
      setSendRegistrationEmails(!newValue);
    } finally {
      setLoading(false);
    }
  };


  // --- NEW: Broadcast Handlers ---
  const handleOpenBroadcastDialog = () => {
    setConfirmBroadcastOpen(true);
  };


  const handleCloseBroadcastDialog = () => {
    setConfirmBroadcastOpen(false);
  };


   const handleConfirmBroadcast = async () => {
    setConfirmBroadcastOpen(false);
    setBroadcastLoading(true);
    setErrorMessage("");
    setSuccessMessage("");


    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/broadcast-login-info`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );


      // Updated message to show who was skipped
      setSuccessMessage(
        `Broadcast Complete!\n` +
        `Sent to ${res.data.sent_to_default_users} users with default passwords.\n` +
        `Skipped ${res.data.skipped_password_changed} users who already changed their password.\n` +
        `Failed: ${res.data.failed}.`
      );
      setTimeout(() => setSuccessMessage(""), 10000); // Keep message up longer (10s) so they can read it
    } catch (err) {
      console.error("Error broadcasting emails:", err);
      setErrorMessage(
        err.response?.data?.error || "Failed to send broadcast emails. Please try again."
      );
    } finally {
      setBroadcastLoading(false);
    }
  };
  // ------------------------------


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


      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/system-settings/registration_field_requirements`,
        { value: JSON.stringify(updatedRequirements) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(
        `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is now ${
          newValue ? "required" : "optional"
        } for user registration.`
      );
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error updating field requirements:", err);
      setErrorMessage("Failed to update field requirements. Please try again.");
      setFieldRequirements(fieldRequirements);
    } finally {
      setLoading(false);
    }
  };


  const fieldsList = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email Address" },
    { key: "employeeNumber", label: "Employee Number" },
    { key: "employmentCategory", label: "Employment Category" },
    { key: "password", label: "Password" },
    { key: "middleName", label: "Middle Name" },
    { key: "nameExtension", label: "Name Extension" },
    { key: "department", label: "Department" },
  ];


  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Loading Backdrop */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        }}
        open={loading}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress
            color="inherit"
            size={60}
            thickness={4}
            sx={{
              filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))",
            }}
          />
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 500 }}>
            Processing...
          </Typography>
        </Box>
      </Backdrop>


      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 4,
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          color: "#fff",
          borderRadius: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <AdminPanelSettings sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Admin Security Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              Configure system-wide security settings and access controls
            </Typography>
          </Box>
        </Box>
      </Paper>


      {/* Alert Messages */}
      <Fade in={!!errMessage} timeout={300}>
        <Box>
          {errMessage && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(211, 47, 47, 0.2)",
              }}
              onClose={() => setErrorMessage("")}
            >
              {errMessage}
            </Alert>
          )}
        </Box>
      </Fade>


      <Fade in={!!successMessage} timeout={300}>
        <Box>
          {successMessage && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: 2,
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(46, 125, 50, 0.2)",
              }}
              onClose={() => setSuccessMessage("")}
            >
              {successMessage}
            </Alert>
          )}
        </Box>
      </Fade>


      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} lg={6}>
          <Stack spacing={3}>
            {/* Global MFA Section */}
            <Fade in timeout={700}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Shield sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Multi-Factor Authentication
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Control Multi-Factor Authentication (MFA) requirement for all system users.
                  </Typography>


                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: globalMFAEnabled
                        ? `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`
                        : "transparent",
                      border: `2px solid ${
                        globalMFAEnabled ? primaryColor : "rgba(0, 0, 0, 0.12)"
                      }`,
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": globalMFAEnabled
                        ? {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `linear-gradient(45deg, transparent 30%, ${primaryColor}05 50%, transparent 70%)`,
                            backgroundSize: "200% 200%",
                            animation: "shimmer 3s ease-in-out infinite",
                          }
                        : {},
                      "@keyframes shimmer": {
                        "0%": { backgroundPosition: "200% 0" },
                        "100%": { backgroundPosition: "-200% 0" },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Global MFA Enforcement
                          </Typography>
                          <Chip
                            label={globalMFAEnabled ? "Active" : "Inactive"}
                            size="small"
                            sx={{
                              bgcolor: globalMFAEnabled ? "success.main" : "grey.400",
                              color: "white",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {globalMFAEnabled
                            ? "All users must verify identity with MFA"
                            : "MFA is optional for users"}
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
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: primaryColor,
                          },
                        }}
                      />
                    </Box>
                  </Paper>
                </CardContent>
              </Card>
            </Fade>


            {/* Email Domain Restriction Section */}
            <Fade in timeout={750}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Email sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Email Domain Restriction
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Control which email domains are allowed for user registration.
                  </Typography>


                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: emailDomainRestricted
                        ? `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`
                        : "transparent",
                      border: `2px solid ${
                        emailDomainRestricted ? primaryColor : "rgba(0, 0, 0, 0.12)"
                      }`,
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": emailDomainRestricted
                        ? {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `linear-gradient(45deg, transparent 30%, ${primaryColor}05 50%, transparent 70%)`,
                            backgroundSize: "200% 200%",
                            animation: "shimmer 3s ease-in-out infinite",
                          }
                        : {},
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            EARIST Domain Only (@earist.edu.ph)
                          </Typography>
                          <Chip
                            label={emailDomainRestricted ? "Restricted" : "Unrestricted"}
                            size="small"
                            sx={{
                              bgcolor: emailDomainRestricted ? primaryColor : "grey.400",
                              color: "white",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {emailDomainRestricted
                            ? "Only @earist.edu.ph emails accepted"
                            : "All email domains (@gmail.com, @earist.edu.ph, etc.) allowed"}
                        </Typography>
                      </Box>
                      <Switch
                        checked={emailDomainRestricted}
                        onChange={handleToggleEmailDomainRestriction}
                        disabled={loading}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: primaryColor,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: primaryColor,
                          },
                        }}
                      />
                    </Box>
                  </Paper>
                </CardContent>
              </Card>
            </Fade>


            {/* Send Registration Emails Toggle */}
            <Fade in timeout={800}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Email sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Registration Notifications
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Enable or disable automatic welcome emails sent to new users upon registration.
                  </Typography>


                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: sendRegistrationEmails
                        ? `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`
                        : "transparent",
                      border: `2px solid ${
                        sendRegistrationEmails ? primaryColor : "rgba(0, 0, 0, 0.12)"
                      }`,
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": sendRegistrationEmails
                        ? {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `linear-gradient(45deg, transparent 30%, ${primaryColor}05 50%, transparent 70%)`,
                            backgroundSize: "200% 200%",
                            animation: "shimmer 3s ease-in-out infinite",
                          }
                        : {},
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Send Welcome Emails
                          </Typography>
                          <Chip
                            label={sendRegistrationEmails ? "Enabled" : "Disabled"}
                            size="small"
                            sx={{
                              bgcolor: sendRegistrationEmails ? "success.main" : "grey.400",
                              color: "white",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {sendRegistrationEmails
                            ? "Users will receive login credentials via email"
                            : "Email notifications will NOT be sent"}
                        </Typography>
                      </Box>
                      <Switch
                        checked={sendRegistrationEmails}
                        onChange={handleToggleSendRegistrationEmails}
                        disabled={loading}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: primaryColor,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: primaryColor,
                          },
                        }}
                      />
                    </Box>
                  </Paper>
                </CardContent>
              </Card>
            </Fade>


                   {/* --- NEW: Broadcast Login Info Card (Themed) --- */}
            <Fade in timeout={850}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    // CHANGED: Now uses system theme colors
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Campaign sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    Bulk Communication
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Send a reminder email containing Employee Number and Email address to all registered users.
                  </Typography>


                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={broadcastLoading ? <CircularProgress size={20} color="inherit" /> : <Campaign />}
                    onClick={handleOpenBroadcastDialog}
                    disabled={broadcastLoading}
                    sx={{
                      mt: 1,
                      py: 1.5,
                      // CHANGED: Uses primaryColor instead of Red
                      borderColor: primaryColor,
                      color: primaryColor,
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: "none",
                      "&:hover": {
                        borderColor: secondaryColor,
                        backgroundColor: `${primaryColor}08`,
                      },
                      "&:disabled": {
                        borderColor: "rgba(0, 0, 0, 0.12)",
                        color: "rgba(0, 0, 0, 0.26)",
                      },
                    }}
                  >
                    {broadcastLoading ? "Sending Emails..." : "Broadcast Login Info to All Users"}
                  </Button>
                </CardContent>
              </Card>
            </Fade>
            {/* ---------------------------------------- */}


            {/* Confidential Password Section */}
            {(userRole === "superadmin" || userRole === "technical") && (
              <Fade in timeout={900}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      p: 3,
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <LockOutlined sx={{ fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      Confidential Password
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Required for sensitive operations including payroll record deletion and audit
                      log access.
                    </Typography>


                    {passwordInfo && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          mb: 3,
                          borderRadius: 2,
                          background: passwordExists
                            ? "linear-gradient(135deg, #4caf5008 0%, #2e7d3208 100%)"
                            : "linear-gradient(135deg, #ff980008 0%, #ff572208 100%)",
                          border: `2px solid ${passwordExists ? "#4caf50" : "#ff9800"}`,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "8px",
                              background: passwordExists
                                ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                                : "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {passwordExists ? (
                              <CheckCircleOutline sx={{ fontSize: 20, color: "white" }} />
                            ) : (
                              <SecurityOutlined sx={{ fontSize: 20, color: "white" }} />
                            )}
                          </Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            Status: {passwordExists ? "Password Configured" : "No Password Set"}
                          </Typography>
                        </Box>
                        {passwordInfo.updated_at && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 5, display: "block" }}
                          >
                            Last updated: {new Date(passwordInfo.updated_at).toLocaleString()}
                          </Typography>
                        )}
                      </Paper>
                    )}


                    <TextField
                      type={showConfidentialPassword ? "text" : "password"}
                      label={
                        passwordExists ? "New Confidential Password" : "Confidential Password"
                      }
                      value={confidentialPassword}
                      onChange={(e) => setConfidentialPassword(e.target.value)}
                      fullWidth
                      margin="normal"
                      helperText="Minimum 6 characters required"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                          },
                          "&.Mui-focused": {
                            boxShadow: `0 4px 20px ${primaryColor}20`,
                          },
                        },
                      }}
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
                                setShowConfidentialPassword(!showConfidentialPassword)
                              }
                              edge="end"
                            >
                              {showConfidentialPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />


                    <TextField
                      type={showConfidentialPassword ? "text" : "password"}
                      label="Confirm Password"
                      value={confirmConfidentialPassword}
                      onChange={(e) => setConfirmConfidentialPassword(e.target.value)}
                      fullWidth
                      margin="normal"
                      helperText="Re-enter password to confirm"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                          },
                          "&.Mui-focused": {
                            boxShadow: `0 4px 20px ${primaryColor}20`,
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SecurityOutlined sx={{ color: primaryColor }} />
                          </InputAdornment>
                        ),
                      }}
                    />


                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleConfidentialPasswordSubmit}
                      disabled={loading || !confidentialPassword || !confirmConfidentialPassword}
                      startIcon={<LockOutlined />}
                      sx={{
                        mt: 2,
                        py: 1.5,
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        boxShadow: `0 4px 14px ${primaryColor}40`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 6px 20px ${primaryColor}60`,
                        },
                        "&:active": {
                          transform: "translateY(0)",
                        },
                        "&:disabled": {
                          background: "#e0e0e0",
                        },
                      }}
                    >
                      {loading
                        ? "Saving..."
                        : passwordExists
                        ? "Update Password"
                        : "Create Password"}
                    </Button>
                  </CardContent>
                </Card>
              </Fade>
            )}
          </Stack>
        </Grid>


        {/* Right Column - Field Requirements */}
        <Grid item xs={12} lg={6}>
          <Fade in timeout={900}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                },
              }}
            >
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Settings sx={{ fontSize: 28 }} />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Registration Field Requirements
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Configure required and optional fields for user registration forms. Changes apply
                  to both single and bulk registration.
                </Typography>


                <Box sx={{ mb: 3 }}>
                  {fieldsList.map((field, index) => (
                    <Fade in timeout={1000 + index * 50} key={field.key}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          mb: 1.5,
                          borderRadius: 2,
                          background: fieldRequirements[field.key]
                            ? `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`
                            : "transparent",
                          border: `2px solid ${
                            fieldRequirements[field.key] ? primaryColor : "rgba(0, 0, 0, 0.12)"
                          }`,
                          transition: "all 0.3s ease",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            transform: "translateX(4px)",
                            boxShadow: fieldRequirements[field.key]
                              ? `0 4px 16px ${primaryColor}20`
                              : "0 4px 16px rgba(0, 0, 0, 0.08)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {field.label}
                              </Typography>
                              <Chip
                                label={fieldRequirements[field.key] ? "Required" : "Optional"}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  bgcolor: fieldRequirements[field.key]
                                    ? primaryColor
                                    : "grey.300",
                                  color: fieldRequirements[field.key] ? "white" : "grey.700",
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {fieldRequirements[field.key]
                                ? "Users must provide this information"
                                : "Users may skip this field"}
                            </Typography>
                          </Box>
                          <Switch
                            checked={fieldRequirements[field.key] || false}
                            onChange={(e) =>
                              handleToggleFieldRequirement(field.key, e.target.checked)
                            }
                            disabled={loading}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": {
                                color: primaryColor,
                              },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: primaryColor,
                              },
                            }}
                          />
                        </Box>
                      </Paper>
                    </Fade>
                  ))}
                </Box>


                <Divider sx={{ my: 3 }} />


                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #fafafa 0%, #ffffff 100%)",
                    border: "2px solid rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <VerifiedUser sx={{ fontSize: 18, color: "white" }} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Configuration Notes
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" component="div">
                    <Box component="ul" sx={{ pl: 2, m: 0, "& li": { mb: 1 } }}>
                      <li>Required fields must be completed before registration submission</li>
                      <li>Optional fields can be left blank during registration</li>
                      <li>Changes take effect immediately for all registration forms</li>
                      <li>
                        Only superadmin and administrator roles can modify these settings
                      </li>
                      <li>Email domain restriction works independently from field requirements</li>
                    </Box>
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>


      {/* --- NEW: Broadcast Confirmation Dialog --- */}
      <Dialog
        open={confirmBroadcastOpen}
        onClose={handleCloseBroadcastDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 400 }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#d32f2f' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Campaign />
            Send Login Info to All Users?
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: '#555', fontSize: '0.95rem' }}>
            This action will send an email to <strong>every registered user</strong> containing their Employee Number and Email Address.
            <br /><br />
            <strong>Note:</strong> For security reasons, the email will <strong>NOT</strong> contain the password. Users will be instructed to use the "Forgot Password" feature if needed.
            <br /><br />
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseBroadcastDialog} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBroadcast}
            variant="contained"
            autoFocus
            sx={{
              background: '#d32f2f',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { background: '#b71c1c' }
            }}
          >
            Yes, Send Emails
          </Button>
        </DialogActions>
      </Dialog>
      {/* ------------------------------------------ */}
    </Container>
  );
};


export default AdminSecurity;

