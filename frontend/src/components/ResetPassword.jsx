import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SuccessfulOverlay from "./SuccessfulOverlay";
import {
  Alert,
  TextField,
  Button,
  Container,
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
  Breadcrumbs,
  Link,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LockReset as LockResetIcon,
  Home,
  Security,
  CheckCircle,
  Cancel,
  Info,
  Person,
  Email,
  Badge as BadgeIcon,
  Business,
} from "@mui/icons-material";
import { getAuthHeaders } from "../utils/auth";

// System Settings Hook (from AdminHome)
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#894444',
    secondaryColor: '#6d2323',
    accentColor: '#FEF9E1',
    textColor: '#FFFFFF',
    textPrimaryColor: '#6D2323', 
    textSecondaryColor: '#FEF9E1', 
    hoverColor: '#6D2323',
    backgroundColor: '#FFFFFF',
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('systemSettings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api') 
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        
        const response = await axios.get(url);
        setSettings(response.data);
        localStorage.setItem('systemSettings', JSON.stringify(response.data));
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
    };

    fetchSettings();
  }, []);

  return settings;
};

const ResetPassword = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState({});
  const [errMessage, setErrorMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Use system settings
  const settings = useSystemSettings();
  
  // Memoize styled components to prevent recreation on every render
  const GlassCard = useMemo(() => styled(Card)({
    borderRadius: 20,
    background: `${settings.accentColor}F2`,
    backdropFilter: "blur(10px)",
    boxShadow: `0 8px 40px ${settings.primaryColor}14`,
    border: `1px solid ${settings.primaryColor}1A`,
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      boxShadow: `0 12px 48px ${settings.primaryColor}26`,
      transform: "translateY(-4px)",
    },
  }), [settings]);

  const ProfessionalButton = useMemo(() => styled(Button)(({ variant }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: "12px 24px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none",
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
    boxShadow: variant === "contained" ? `0 4px 14px ${settings.primaryColor}40` : "none",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: variant === "contained" ? `0 6px 20px ${settings.primaryColor}59` : "none",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  })), [settings]);

  const ModernTextField = useMemo(() => styled(TextField)({
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
        boxShadow: `0 4px 20px ${settings.primaryColor}40`,
        backgroundColor: "rgba(255, 255, 255, 1)",
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 500,
    },
  }), [settings]);

  const PremiumTableContainer = useMemo(() => styled(TableContainer)({
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: `0 4px 24px ${settings.primaryColor}0F`,
    border: `1px solid ${settings.primaryColor}14`,
  }), [settings]);

  const PremiumTableCell = useMemo(() => styled(TableCell)(({ isHeader = false }) => ({
    fontWeight: isHeader ? 600 : 500,
    padding: "18px 20px",
    borderBottom: isHeader
      ? `2px solid ${settings.primaryColor}4D`
      : `1px solid ${settings.primaryColor}0F`,
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
  })), [settings]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          (user.fullName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (user.email || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          String(user.employeeNumber || "").includes(searchTerm)
      );
      setFilteredUsers(filtered);
    }
    setPage(0);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setRefreshing(true);
    setErrorMessage("");
    setSuccessOpen(false);

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/search`, {
        method: "GET",
        headers: authHeaders.headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setErrorMessage(error.error || "Failed to fetch users");
        setUsers([]);
        setFilteredUsers([]);
        return;
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
      setFilteredUsers(Array.isArray(data) ? data : []);

      if (refreshing) {
        setSuccessAction("create");
        setSuccessOpen(true);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setErrorMessage("Something went wrong while fetching users.");
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResetPassword = async (employeeNumber) => {
    setResetting((prev) => ({ ...prev, [employeeNumber]: true }));
    setErrorMessage("");
    setSuccessOpen(false);

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: "POST",
        headers: {
          ...authHeaders.headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessAction("reset");
        setSuccessOpen(true);
      } else {
        setErrorMessage(data.error || "Failed to reset password");
      }
    } catch (err) {
      console.error("Reset Password Error", err);
      setErrorMessage("Something went wrong while resetting password.");
    } finally {
      setResetting((prev) => ({ ...prev, [employeeNumber]: false }));
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getInitials = (nameOrUsername) => {
    if (!nameOrUsername) return "U";
    const parts = nameOrUsername.trim().split(" ").filter(Boolean);
    
    // FIX: Handle case where split results in an empty array (e.g., input was only whitespace)
    if (parts.length === 0) return "U";
    
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const getRoleColor = (role = "") => {
    switch ((role || "").toLowerCase()) {
      case "superadmin":
        return { bgcolor: alpha(settings.primaryColor, 0.15), color: settings.primaryColor };
      case "administrator":
        return { bgcolor: alpha(settings.secondaryColor, 0.15), color: settings.secondaryColor };
      case "staff":
        return { bgcolor: alpha(settings.primaryColor, 0.1), color: settings.primaryColor };
      default:
        return { bgcolor: alpha(settings.primaryColor, 0.1), color: settings.primaryColor };
    }
  };

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
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
          minHeight: "92vh",
        }}
      >
        <Box sx={{ px: 6, mx: "auto", maxWidth: "1600px" }}>
          {/* Header */}
          <Fade in timeout={500}>
            <Box sx={{ mb: 4 }}>
              <GlassCard>
                <Box
                  sx={{
                    p: 5,
                    background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${alpha(settings.accentColor, 0.9)} 100%)`,
                    color: settings.primaryColor,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: -50,
                      right: -50,
                      width: 200,
                      height: 200,
                      background: `radial-gradient(circle, ${alpha(settings.primaryColor, 0.1)} 0%, ${alpha(settings.primaryColor, 0)} 70%)`,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: -30,
                      left: "30%",
                      width: 150,
                      height: 150,
                      background: `radial-gradient(circle, ${alpha(settings.primaryColor, 0.08)} 0%, ${alpha(settings.primaryColor, 0)} 70%)`,
                    }}
                  />

                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    position="relative"
                    zIndex={1}
                  >
                    <Box display="flex" alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: alpha(settings.primaryColor, 0.15),
                          mr: 4,
                          width: 64,
                          height: 64,
                          boxShadow: `0 8px 24px ${alpha(settings.primaryColor, 0.15)}`,
                        }}
                      >
                        <LockResetIcon sx={{ fontSize: 32, color: settings.primaryColor }} />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h4"
                          component="h1"
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            lineHeight: 1.2,
                            color: settings.primaryColor,
                          }}
                        >
                          Password Management
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            opacity: 0.8,
                            fontWeight: 400,
                            color: settings.textPrimaryColor,
                          }}
                        >
                          Search for employees/users and reset their password to their surname (ALL CAPS)
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        label={`${users.length} Users`}
                        size="small"
                        sx={{
                          bgcolor: alpha(settings.primaryColor, 0.15),
                          color: settings.primaryColor,
                          fontWeight: 500,
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                      <Tooltip title="Refresh Users">
                        <IconButton
                          onClick={fetchUsers}
                          disabled={loading}
                          sx={{
                            bgcolor: alpha(settings.primaryColor, 0.1),
                            "&:hover": { bgcolor: alpha(settings.primaryColor, 0.2) },
                            color: settings.primaryColor,
                            width: 48,
                            height: 48,
                            "&:disabled": {
                              bgcolor: alpha(settings.primaryColor, 0.05),
                              color: alpha(settings.primaryColor, 0.3),
                            },
                          }}
                        >
                          {loading ? (
                            <CircularProgress
                              size={24}
                              sx={{ color: settings.primaryColor }}
                            />
                          ) : (
                            <RefreshIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Fade>

        {/* Error Alert - Center Modal Overlay */}
        {errMessage && (
          <Backdrop
            open={true}
            sx={{
              zIndex: 9999,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => setErrorMessage("")}
          >
            <Fade in timeout={300}>
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "relative",
                  minWidth: "400px",
                  maxWidth: "600px",
                }}
              >
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 4,
                    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.4)",
                    fontSize: "1.1rem",
                    p: 3,
                    "& .MuiAlert-message": { fontWeight: 500 },
                    "& .MuiAlert-icon": { fontSize: "2rem" },
                  }}
                  icon={<Cancel />}
                  onClose={() => setErrorMessage("")}
                >
                  {errMessage}
                </Alert>
              </Box>
            </Fade>
          </Backdrop>
        )}

        {/* Stats Cards */}
        <Fade in timeout={700}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <GlassCard>
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  <Person sx={{ fontSize: 44, color: settings.textPrimaryColor, mb: 1 }} />
                  <Typography
                    variant="h5"
                    sx={{ color: settings.textPrimaryColor, fontWeight: 700 }}
                  >
                    {users.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>
                    Total Users
                  </Typography>
                </CardContent>
              </GlassCard>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <GlassCard>
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  <SearchIcon sx={{ fontSize: 44, color: settings.textPrimaryColor, mb: 1 }} />
                  <Typography
                    variant="h5"
                    sx={{ color: settings.textPrimaryColor, fontWeight: 700 }}
                  >
                    {filteredUsers.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>
                    Filtered Results
                  </Typography>
                </CardContent>
              </GlassCard>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <GlassCard>
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  <LockResetIcon sx={{ fontSize: 44, color: settings.textPrimaryColor, mb: 1 }} />
                  <Typography
                    variant="h5"
                    sx={{ color: settings.textPrimaryColor, fontWeight: 700 }}
                  >
                    {Object.keys(resetting).filter(k => resetting[k]).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: settings.textPrimaryColor }}>
                    Resets In Progress
                  </Typography>
                </CardContent>
              </GlassCard>
            </Grid>
          </Grid>
        </Fade>

        {/* Search Controls */}
        <Fade in timeout={900}>
          <GlassCard sx={{ mb: 4 }}>
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(settings.accentColor, 0.8),
                      color: settings.textPrimaryColor,
                    }}
                  >
                    <SearchIcon />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: 600, color: settings.textPrimaryColor }}
                    >
                      Search Users
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ color: settings.textPrimaryColor }}
                    >
                      Find users by name, email, or employee number
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(settings.accentColor, 0.5),
                pb: 2,
                borderBottom: `1px solid ${alpha(settings.primaryColor, 0.1)}`,
              }}
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
                      <SearchIcon sx={{ color: settings.textPrimaryColor }} />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </GlassCard>
        </Fade>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: settings.accentColor,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
          open={loading && !refreshing}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: settings.accentColor }}>
              Loading users...
            </Typography>
          </Box>
        </Backdrop>

        {/* Users Table */}
        {!loading && (
          <Fade in timeout={1100}>
            <GlassCard>
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${settings.accentColor} 0%, ${alpha(settings.accentColor, 0.9)} 100%)`,
                  color: settings.primaryColor,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: `1px solid ${alpha(settings.primaryColor, 0.1)}`,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 600, color: settings.primaryColor }}
                  >
                    User Accounts
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.8, color: settings.accentColor }}
                  >
                    {searchTerm
                      ? `Showing ${filteredUsers.length} of ${users.length} users matching "${searchTerm}"`
                      : `Total: ${users.length} registered users`}
                  </Typography>
                </Box>
              </Box>

              <PremiumTableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ bgcolor: alpha(settings.accentColor, 0.7) }}>
                    <TableRow>
                      <PremiumTableCell isHeader sx={{ color: settings.textPrimaryColor }}>
                        <BadgeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Employee #
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings.textPrimaryColor }}>
                        <Person sx={{ mr: 1, verticalAlign: "middle" }} />
                        Full Name
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings.textPrimaryColor }}>
                        <Email sx={{ mr: 1, verticalAlign: "middle" }} />
                        Email
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: settings.textPrimaryColor }}>
                        <Business sx={{ mr: 1, verticalAlign: "middle" }} />
                        Role
                      </PremiumTableCell>
                      <PremiumTableCell
                        isHeader
                        sx={{ color: settings.textPrimaryColor, textAlign: "center" }}
                      >
                        <Security sx={{ mr: 1, verticalAlign: "middle" }} />
                        Action
                      </PremiumTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <TableRow
                          key={user.employeeNumber}
                          sx={{
                            "&:nth-of-type(even)": {
                              bgcolor: alpha(settings.accentColor, 0.3),
                            },
                            "&:hover": { bgcolor: alpha(settings.primaryColor, 0.05) },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <PremiumTableCell
                            sx={{ fontWeight: 600, color: settings.textPrimaryColor }}
                          >
                            {user.employeeNumber}
                          </PremiumTableCell>

                          <PremiumTableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Avatar
                                src={user.avatar || ""}
                                alt={user.fullName}
                                sx={{
                                  width: 48,
                                  height: 48,
                                  bgcolor: settings.primaryColor,
                                  color: settings.accentColor,
                                  fontWeight: 700,
                                  fontSize: "1rem",
                                  boxShadow: `0 4px 12px ${alpha(settings.primaryColor, 0.2)}`,
                                  border: "2px solid #fff",
                                }}
                              >
                                {!user.avatar && getInitials(user.fullName)}
                              </Avatar>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, color: settings.textPrimaryColor }}
                              >
                                {user.fullName || "N/A"}
                              </Typography>
                            </Box>
                          </PremiumTableCell>

                          <PremiumTableCell sx={{ color: settings.textPrimaryColor }}>
                            {user.email || "N/A"}
                          </PremiumTableCell>

                          <PremiumTableCell>
                            <Chip
                              label={user.role || "N/A"}
                              size="small"
                              sx={{
                                ...getRoleColor(user.role),
                                fontWeight: 600,
                              }}
                            />
                          </PremiumTableCell>

                          <PremiumTableCell sx={{ textAlign: "center" }}>
                            <ProfessionalButton
                              variant="contained"
                              size="small"
                              onClick={() => handleResetPassword(user.employeeNumber)}
                              disabled={resetting[user.employeeNumber] || !user.email}
                              startIcon={
                                resetting[user.employeeNumber] ? (
                                  <CircularProgress size={16} sx={{ color: settings.accentColor }} />
                                ) : (
                                  <LockResetIcon />
                                )
                              }
                              sx={{
                                bgcolor: settings.primaryColor,
                                color: settings.accentColor,
                                "&:hover": {
                                  bgcolor: settings.secondaryColor,
                                },
                                "&:disabled": {
                                  bgcolor: alpha(settings.primaryColor, 0.3),
                                },
                              }}
                            >
                              {resetting[user.employeeNumber] ? "Resetting..." : "Reset"}
                            </ProfessionalButton>
                          </PremiumTableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          sx={{ textAlign: "center", py: 8 }}
                        >
                          <Box sx={{ textAlign: "center" }}>
                            <Info
                              sx={{
                                fontSize: 80,
                                color: alpha(settings.primaryColor, 0.3),
                                mb: 3,
                              }}
                            />
                            <Typography
                              variant="h5"
                              color={alpha(settings.primaryColor, 0.6)}
                              gutterBottom
                              sx={{ fontWeight: 600 }}
                            >
                              No Users Found
                            </Typography>
                            <Typography
                              variant="body1"
                              color={alpha(settings.primaryColor, 0.4)}
                            >
                              {searchTerm
                                ? "Try adjusting your search criteria"
                                : "No users available"}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>

              {/* Pagination */}
              {filteredUsers.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
                  <TablePagination
                    component="div"
                    count={filteredUsers.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    sx={{
                      "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                        {
                          color: settings.textPrimaryColor,
                          fontWeight: 600,
                        },
                    }}
                  />
                </Box>
              )}
            </GlassCard>
          </Fade>
        )}

        {/* Back Button */}
        <Fade in timeout={1300}>
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <ProfessionalButton
              onClick={() => navigate(-1)}
              variant="outlined"
              sx={{
                borderColor: settings.accentColor,
                color: settings.accentColor,
                "&:hover": {
                  borderColor: alpha(settings.accentColor, 0.8),
                  bgcolor: alpha(settings.accentColor, 0.1),
                },
              }}
            >
              Go Back
            </ProfessionalButton>
          </Box>
        </Fade>
      </Box>
    </Box>

    {/* Success Overlay - Outside main container for fullscreen */}
    <SuccessfulOverlay 
      open={successOpen} 
      action={successAction} 
      onClose={() => setSuccessOpen(false)} 
    />
    </>
  );
};

export default ResetPassword;