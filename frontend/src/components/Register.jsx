import API_BASE_URL from "../apiConfig";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  TextField,
  Button,
  Container,
  Box,
  Paper,
  Typography,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Fade,
  Grow,
  Zoom,
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
} from "@mui/icons-material";
import earistLogo from "../assets/earistLogo.jpg";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    nameExtension: "",
    email: "",
    employeeNumber: "",
    role: "",
  });
  const [errMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isValidName = (name) => {
    if (!name || name.trim().length === 0) return false;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) return false;
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) return false;
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const {
      firstName,
      lastName,
      email,
      employeeNumber,
      role,
    } = formData;

    // Validation
    if (!firstName || !lastName || !email || !employeeNumber) {
      setErrorMessage("Please fill all required fields.");
      setSuccessMessage("");
      return;
    }

    if (role === "") {
      setErrorMessage("Please select a role.");
      setSuccessMessage("");
      return;
    }

    if (!isValidName(firstName)) {
      setErrorMessage("Please enter a valid first name (2-50 characters, letters only).");
      setSuccessMessage("");
      return;
    }

    if (!isValidName(lastName)) {
      setErrorMessage("Please enter a valid last name (2-50 characters, letters only).");
      setSuccessMessage("");
      return;
    }

    if (formData.middleName && !isValidName(formData.middleName)) {
      setErrorMessage("Please enter a valid middle name (2-50 characters, letters only).");
      setSuccessMessage("");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      setSuccessMessage("");
      return;
    }

    // Auto-generate password from lastName (uppercase, no spaces)
    const autoPassword = lastName.toUpperCase().replace(/\s+/g, '');

    // Start loading
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          middleName: formData.middleName || null,
          lastName: formData.lastName,
          nameExtension: formData.nameExtension || null,
          email: formData.email,
          employeeNumber: formData.employeeNumber,
          password: autoPassword,
          employmentCategory: 0, // Default to Job Order - Graduate
          department: "",
        }),
      });

      if (response.ok) {
        // Update the user's role after successful registration
        const updateRoleResponse = await fetch(`${API_BASE_URL}/users/${formData.employeeNumber}/role`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: formData.role }),
        });

        if (!updateRoleResponse.ok) {
          console.error("Failed to update role");
        }

        // Grant appropriate page access based on role
        if (formData.role === 'superadmin' || formData.role === 'administrator' || formData.role === 'technical') {
          // For admin roles, we need to grant access to all pages
          try {
            const allPagesResponse = await fetch(`${API_BASE_URL}/api/pages`);
            if (allPagesResponse.ok) {
              const allPages = await allPagesResponse.json();
              
              // Grant access to all pages for admin roles
              for (const page of allPages) {
                const grantAccessResponse = await fetch(`${API_BASE_URL}/api/page-access`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    employeeNumber: formData.employeeNumber,
                    pageId: page.id,
                    privilege: '1'
                  })
                });

                if (!grantAccessResponse.ok) {
                  console.error(`Failed to grant access to page ${page.id}`);
                }
              }
            }
          } catch (accessError) {
            console.error('Error granting page access:', accessError);
          }
        }

        setTimeout(() => {
          setIsLoading(false);
          setSuccessMessage("Account created successfully! Redirecting to login...");
          setErrorMessage("");
          setTimeout(() => {
            navigate("/");
          }, 2000);
        }, 500);
      } else {
        const errorData = await response.json();
        setIsLoading(false);
        setErrorMessage(errorData.error || "Registration failed. Try again.");
        setSuccessMessage("");
      }
    } catch (err) {
      console.error("Registration Error", err);
      setIsLoading(false);
      setErrorMessage("Something went wrong.");
      setSuccessMessage("");
    }
  };

  // Auto-hide messages after 3 seconds
  React.useEffect(() => {
    if (errMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [errMessage]);

  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <Container
      maxWidth="md"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Grow in={true} timeout={600}>
        <Paper
          elevation={0}
          sx={{
            padding: { xs: 3, sm: 4, md: 5 },
            width: "100%",
            maxWidth: 700,
            borderRadius: 3,
            border: "2px solid #f5e6e6",
            background: "linear-gradient(135deg, #ffffff 0%, #fffef9 100%)",
            boxShadow: "0 8px 32px rgba(109, 35, 35, 0.12)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: "0 12px 48px rgba(109, 35, 35, 0.18)",
              transform: "translateY(-4px)",
            },
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "linear-gradient(90deg, #6d2323 0%, #8a4747 50%, #6d2323 100%)",
            },
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 4, pt: 2 }}>
            <Zoom in={true} timeout={400}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    overflow: "hidden",
                    boxShadow: "0 4px 16px rgba(109, 35, 35, 0.2)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.05) rotate(5deg)",
                      boxShadow: "0 8px 24px rgba(109, 35, 35, 0.3)",
                    },
                  }}
                >
                  <img
                    src={earistLogo}
                    alt="E.A.R.I.S.T Logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              </Box>
            </Zoom>
            <Typography
              variant="h4"
              sx={{
                color: "#6d2323",
                fontWeight: 800,
                mb: 1,
                background: "linear-gradient(135deg, #6d2323 0%, #8a4747 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}
            >
              Registration
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#8a4747",
                fontSize: "1rem",
                fontWeight: 500,
              }}
            >
              Create your initial account
            </Typography>
          </Box>

          <form onSubmit={handleRegister}>
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5, mb: 2.5 }}>
                <TextField
                  name="firstName"
                  label="First Name *"
                  type="text"
                  fullWidth
                  value={formData.firstName}
                  onChange={handleChanges}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => setFocusedField(null)}
                  InputLabelProps={{
                    required: false,
                    sx: { fontWeight: 600 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline
                          sx={{
                            color: focusedField === "firstName" ? "#6d2323" : "#8a4747",
                            transition: "color 0.3s ease",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#8a4747",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(109, 35, 35, 0.15)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#6d2323",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#6d2323",
                      fontWeight: 700,
                    },
                  }}
                />
                <TextField
                  name="middleName"
                  label="Middle Name"
                  type="text"
                  fullWidth
                  value={formData.middleName}
                  onChange={handleChanges}
                  onFocus={() => setFocusedField("middleName")}
                  onBlur={() => setFocusedField(null)}
                  InputLabelProps={{
                    required: false,
                    sx: { fontWeight: 600 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline
                          sx={{
                            color: focusedField === "middleName" ? "#6d2323" : "#8a4747",
                            transition: "color 0.3s ease",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#8a4747",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(109, 35, 35, 0.15)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#6d2323",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#6d2323",
                      fontWeight: 700,
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5, mb: 2.5 }}>
                <TextField
                  name="lastName"
                  label="Last Name *"
                  type="text"
                  fullWidth
                  value={formData.lastName}
                  onChange={handleChanges}
                  onFocus={() => setFocusedField("lastName")}
                  onBlur={() => setFocusedField(null)}
                  InputLabelProps={{
                    required: false,
                    sx: { fontWeight: 600 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline
                          sx={{
                            color: focusedField === "lastName" ? "#6d2323" : "#8a4747",
                            transition: "color 0.3s ease",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#8a4747",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(109, 35, 35, 0.15)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#6d2323",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#6d2323",
                      fontWeight: 700,
                    },
                  }}
                />
                <TextField
                  name="nameExtension"
                  label="Name Extension"
                  type="text"
                  fullWidth
                  value={formData.nameExtension}
                  onChange={handleChanges}
                  onFocus={() => setFocusedField("nameExtension")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Jr., Sr., III, etc."
                  InputLabelProps={{
                    required: false,
                    sx: { fontWeight: 600 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline
                          sx={{
                            color: focusedField === "nameExtension" ? "#6d2323" : "#8a4747",
                            transition: "color 0.3s ease",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#8a4747",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(109, 35, 35, 0.15)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#6d2323",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#6d2323",
                      fontWeight: 700,
                    },
                  }}
                />
              </Box>

              <TextField
                name="email"
                label="Email Address *"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleChanges}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                sx={{ mb: 2.5 }}
                InputLabelProps={{
                  required: false,
                  sx: { fontWeight: 600 },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined
                        sx={{
                          color: focusedField === "email" ? "#6d2323" : "#8a4747",
                          transition: "color 0.3s ease",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
                <TextField
                  name="employeeNumber"
                  label="Employee Number *"
                  type="text"
                  fullWidth
                  value={formData.employeeNumber}
                  onChange={handleChanges}
                  onFocus={() => setFocusedField("employeeNumber")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g., 2013-4410"
                  helperText="Alphanumeric with hyphens allowed"
                  InputLabelProps={{
                    required: false,
                    sx: { fontWeight: 600 },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlined
                          sx={{
                            color: focusedField === "employeeNumber" ? "#6d2323" : "#8a4747",
                            transition: "color 0.3s ease",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#8a4747",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(109, 35, 35, 0.15)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#6d2323",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#6d2323",
                      fontWeight: 700,
                    },
                  }}
                />

                <FormControl
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#8a4747",
                        borderWidth: 2,
                      },
                      "&.Mui-focused": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(109, 35, 35, 0.15)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#6d2323",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#6d2323",
                      fontWeight: 700,
                    },
                  }}
                >
                  <InputLabel id="role-label" sx={{ fontWeight: 600 }}>
                    Role *
                  </InputLabel>
                  <Select
                    labelId="role-label"
                    name="role"
                    value={formData.role}
                    label="Role *"
                    onChange={handleChanges}
                    onFocus={() => setFocusedField("role")}
                    onBlur={() => setFocusedField(null)}
                    displayEmpty
                    startAdornment={
                      <InputAdornment position="start">
                        <AdminPanelSettings
                          sx={{
                            color: focusedField === "role" ? "#6d2323" : "#8a4747",
                            transition: "color 0.3s ease",
                          }}
                        />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="" disabled>
                      <em>Select Role</em>
                    </MenuItem>
                    <MenuItem value="superadmin">Super Admin</MenuItem>
                    <MenuItem value="administrator">Administrator</MenuItem>
                    <MenuItem value="technical">Technical</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Auto-generated Password Display */}
              <Box
                sx={{
                  mt: 2.5,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "rgba(109, 35, 35, 0.05)",
                  border: "2px solid rgba(109, 35, 35, 0.2)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <LockOutlined sx={{ color: "#6d2323", fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ color: "#6d2323", fontWeight: 700 }}>
                    Auto-Generated Password
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "#666", mb: 1.5, lineHeight: 1.6 }}>
                  Your password will be automatically set to your last name in all caps with no spaces.
                </Typography>
                {formData.lastName && (
                  <Box
                    sx={{
                      bgcolor: "#fff8e1",
                      border: "2px solid #ffc107",
                      borderRadius: 1.5,
                      p: 1.5,
                      fontFamily: "monospace",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#856404",
                      textAlign: "center",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {formData.lastName.toUpperCase().replace(/\s+/g, '')}
                  </Box>
                )}
                {!formData.lastName && (
                  <Box
                    sx={{
                      bgcolor: "#f5f5f5",
                      border: "2px dashed #ccc",
                      borderRadius: 1.5,
                      p: 1.5,
                      textAlign: "center",
                      color: "#999",
                      fontStyle: "italic",
                    }}
                  >
                    Enter your last name to see your password
                  </Box>
                )}
              </Box>
            </Box>

            {/* Alert Messages */}
            {errMessage && (
              <Fade in={true}>
                <Alert
                  icon={<ErrorOutline fontSize="inherit" />}
                  sx={{
                    mb: 2.5,
                    backgroundColor: "#fff",
                    color: "#d32f2f",
                    border: "2px solid #d32f2f",
                    borderRadius: 2,
                    fontWeight: 500,
                    fontSize: "0.95rem",
                    boxShadow: "0 4px 12px rgba(211, 47, 47, 0.2)",
                    "& .MuiAlert-icon": {
                      color: "#d32f2f",
                    },
                  }}
                  severity="error"
                >
                  {errMessage}
                </Alert>
              </Fade>
            )}
            {successMessage && (
              <Fade in={true}>
                <Alert
                  icon={<CheckCircleOutline fontSize="inherit" />}
                  sx={{
                    mb: 2.5,
                    backgroundColor: "#fff",
                    color: "#2e7d32",
                    border: "2px solid #2e7d32",
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    boxShadow: "0 4px 12px rgba(46, 125, 50, 0.2)",
                    "& .MuiAlert-icon": {
                      color: "#2e7d32",
                    },
                  }}
                  severity="success"
                >
                  {successMessage}
                </Alert>
              </Fade>
            )}

            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: "2px dashed rgba(109, 35, 35, 0.15)",
              }}
            >
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading}
                startIcon={<PersonAddAlt1 sx={{ fontSize: 24 }} />}
                sx={{
                  bgcolor: "#6d2323",
                  py: 2,
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: "none",
                  boxShadow: "0 4px 20px rgba(109, 35, 35, 0.3)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    transition: "left 0.6s ease",
                  },
                  "&:hover::before": {
                    left: "100%",
                  },
                  "&:hover": {
                    bgcolor: "#5a1e1e",
                    transform: "translateY(-3px)",
                    boxShadow: "0 8px 32px rgba(109, 35, 35, 0.45)",
                  },
                  "&:disabled": {
                    bgcolor: "#999",
                    color: "#fff",
                    cursor: "not-allowed",
                  },
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  mb: 2,
                }}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>

              <Typography variant="body2" sx={{ textAlign: "center", color: "#666" }}>
                Already have an account?{" "}
                <Button
                  onClick={() => navigate("/")}
                  sx={{
                    color: "#6d2323",
                    fontSize: "0.875rem",
                    textTransform: "none",
                    padding: 0,
                    minWidth: 0,
                    fontWeight: 700,
                    textDecoration: "underline",
                    "&:hover": {
                      backgroundColor: "transparent",
                      textDecoration: "underline",
                    },
                  }}
                >
                  Login here
                </Button>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Grow>
    </Container>
  );
};

export default Register;