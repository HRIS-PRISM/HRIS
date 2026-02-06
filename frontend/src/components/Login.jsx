import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect } from "react";
import {
  Alert,
  TextField,
  Button,
  Container,
  Link,
  Box,
  Paper,
  Typography,
  Modal,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  BadgeOutlined,
  LockOutlined,
  LoginOutlined,
  CheckCircleOutline,
  ErrorOutline,
  VerifiedUserOutlined,
  Visibility,
  VisibilityOff,
  KeyboardArrowDown,
  Announcement as AnnouncementIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosIcon ,
  Campaign as CampaignIcon,
  Pause,
  AccessTime as AccessTimeIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../components/LoadingOverlay";
import logo from "../assets/logo.PNG";
import bg from "../assets/EaristBG.PNG";

const Login = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [resolvedEmployeeNumber, setResolvedEmployeeNumber] = useState("");
  const [formData, setFormData] = useState({ password: "" });
  const [errMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pin, setPin] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [success, setSuccess] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [codeTimer, setCodeTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [showLaterModal, setShowLaterModal] = useState(false);
  const [dashWarning, setDashWarning] = useState("");
  const [dontRemindToday, setDontRemindToday] = useState(false);
  
  // Login attempt tracking
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLoginLocked, setIsLoginLocked] = useState(false);
  const [loginLockTimer, setLoginLockTimer] = useState(0);

  const primaryGradient = "linear-gradient(135deg, #800020, #A52A2A)";
  const primaryHoverGradient = "linear-gradient(135deg, #A52A2A, #800020)";
  const lightText = "#FFF8E7";
  const darkText = "#4B0000";
  const mediumText = "#800020";
  const placeholderGray = "rgba(0, 0, 0, 0.45)";

  const employeeNumberForRequests = React.useMemo(() => {
    return resolvedEmployeeNumber || employeeNumber;
  }, [resolvedEmployeeNumber, employeeNumber]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check for existing login lock in localStorage on component mount
  useEffect(() => {
    // Check login lock
    const lockData = localStorage.getItem('loginLockData');
    if (lockData) {
      const { lockUntil } = JSON.parse(lockData);
      const now = Date.now();
      
      if (lockUntil > now) {
        setIsLoginLocked(true);
        setLoginLockTimer(Math.ceil((lockUntil - now) / 1000));
      } else {
        // Lock expired, clear it
        localStorage.removeItem('loginLockData');
      }
    }

    // Check password reminder - with detailed logging
    console.log('\n=== COMPONENT MOUNT - Checking reminder data ===');
    const reminderData = localStorage.getItem('passwordReminderSkipped');
    console.log('Reminder data in localStorage:', reminderData);
    
    if (!reminderData) {
      const sessionReminder = sessionStorage.getItem('passwordReminderSkipped');
      console.log('Reminder data in sessionStorage:', sessionReminder);
      
      if (sessionReminder) {
        console.log('Found in sessionStorage, copying to localStorage');
        localStorage.setItem('passwordReminderSkipped', sessionReminder);
      }
    }
    
    const finalReminderData = localStorage.getItem('passwordReminderSkipped');
    
    if (finalReminderData) {
      try {
        const { date, employeeNumber, timestamp } = JSON.parse(finalReminderData);
        const today = new Date().toDateString();
        
        console.log('Stored date:', date);
        console.log('Today:', today);
        console.log('Employee:', employeeNumber);
        if (timestamp) {
          console.log('Saved at:', new Date(timestamp).toLocaleString());
        }
        
        // If the stored date is not today, clear the skip flag
        if (date !== today) {
          console.log('Date is old, clearing reminder skip');
          localStorage.removeItem('passwordReminderSkipped');
          sessionStorage.removeItem('passwordReminderSkipped');
        } else {
          console.log('✅ Date is current, reminder skip is still valid');
        }
      } catch (e) {
        console.error('Error parsing reminder data on mount:', e);
        // Clear corrupted data
        localStorage.removeItem('passwordReminderSkipped');
        sessionStorage.removeItem('passwordReminderSkipped');
      }
    } else {
      console.log('No reminder data found on mount');
    }
    console.log('=== END MOUNT CHECK ===\n');
  }, []);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/announcements`);
        const data = await response.json();
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    fetchAnnouncements();
  }, []);

  // Slideshow auto-play
  useEffect(() => {
    if (announcements.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % announcements.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [announcements.length]);

  // 2FA Lock timer
  useEffect(() => {
    let interval;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            setTwoFactorError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  // Login lock timer
  useEffect(() => {
    let interval;
    if (isLoginLocked && loginLockTimer > 0) {
      interval = setInterval(() => {
        setLoginLockTimer(prev => {
          if (prev <= 1) {
            setIsLoginLocked(false);
            setLoginAttempts(0);
            localStorage.removeItem('loginLockData');
            setErrorMessage("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoginLocked, loginLockTimer]);

  // Code timer
  useEffect(() => {
    let interval;
    if (codeTimer > 0) interval = setInterval(() => setCodeTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [codeTimer]);

  // Auto-hide login error after 3 seconds
  useEffect(() => {
    if (errMessage && !isLoginLocked) {
      const timer = setTimeout(() => setErrorMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [errMessage, isLoginLocked]);

  // Auto-hide 2FA errors and success after 3 seconds
  useEffect(() => {
    if (twoFactorError) {
      const timer = setTimeout(() => setTwoFactorError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [twoFactorError]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-hide dash warning after 3 seconds
  useEffect(() => {
    if (dashWarning) {
      const timer = setTimeout(() => setDashWarning(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [dashWarning]);

  const handleChanges = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeNumberChange = e => {
    const raw = e.target.value ?? "";
    // Show warning if user tried to type a dash (hyphen)
    if (raw.includes("-")) {
      setDashWarning("Hyphens (dashes) are not allowed in the employee number.");
    } else {
      setDashWarning("");
    }
    // Allow digits and letters only; normalize to uppercase (CAPSLOCK-style)
    const allowed = String(raw).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    setEmployeeNumber(allowed);
    setResolvedEmployeeNumber("");
  };

  // Send 2FA code
  const send2FACode = async (email, empNumber) => {
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/send-2fa-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, employeeNumber: empNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Verification code sent to your email.");
        setCodeTimer(2 * 60);
        setAttempts(0);
        setIsLocked(false);
        setTwoFactorError("");
      } else setTwoFactorError(data.error || "Failed to send code.");
    } catch {
      setTwoFactorError("Failed to send verification code.");
    } finally {
      setResendLoading(false);
    }
  };

  // Helper function to check if password reminder should be skipped
  const shouldSkipPasswordReminder = (employeeNumber) => {
    console.log('\n=== CHECKING PASSWORD REMINDER SKIP ===');
    console.log('Checking for employee:', employeeNumber);
    
    // Check both localStorage and sessionStorage
    let reminderData = localStorage.getItem('passwordReminderSkipped');
    
    if (!reminderData) {
      console.log('Not found in localStorage, checking sessionStorage...');
      reminderData = sessionStorage.getItem('passwordReminderSkipped');
      
      if (reminderData) {
        console.log('Found in sessionStorage, copying to localStorage');
        localStorage.setItem('passwordReminderSkipped', reminderData);
      }
    }
    
    if (!reminderData) {
      console.log('❌ No password reminder skip data found in localStorage or sessionStorage');
      return false;
    }
    
    console.log('Raw data found:', reminderData);
    
    try {
      const { date, employeeNumber: skippedEmpNum, timestamp } = JSON.parse(reminderData);
      const today = new Date().toDateString();
      
      // Normalize employee numbers (trim, uppercase)
      const normalizedCurrent = String(employeeNumber).trim().toUpperCase();
      const normalizedSkipped = String(skippedEmpNum).trim().toUpperCase();
      
      console.log('Comparison details:');
      console.log('  Stored date:', date);
      console.log('  Today:', today);
      console.log('  Dates match:', date === today);
      console.log('  Stored employee (normalized):', normalizedSkipped);
      console.log('  Current employee (normalized):', normalizedCurrent);
      console.log('  Employees match:', normalizedSkipped === normalizedCurrent);
      if (timestamp) {
        console.log('  Timestamp:', new Date(timestamp).toLocaleString());
      }
      
      // Only skip if it's the same day AND same employee
      const shouldSkip = (date === today && normalizedSkipped === normalizedCurrent);
      
      if (shouldSkip) {
        console.log('✅ SKIPPING PASSWORD REMINDER (saved preference found)');
      } else {
        console.log('❌ NOT SKIPPING PASSWORD REMINDER');
        if (date !== today) {
          console.log('   Reason: Different date');
          // Clear old data
          localStorage.removeItem('passwordReminderSkipped');
          sessionStorage.removeItem('passwordReminderSkipped');
        }
        if (normalizedSkipped !== normalizedCurrent) {
          console.log('   Reason: Different employee number');
        }
      }
      
      console.log('=== END CHECK ===\n');
      return shouldSkip;
    } catch (e) {
      console.error('❌ Error parsing password reminder data:', e);
      // Clear corrupted data
      localStorage.removeItem('passwordReminderSkipped');
      sessionStorage.removeItem('passwordReminderSkipped');
      return false;
    }
  };

  // Verify 2FA code and complete login
  const verify2FACode = async () => {
    if (!pin.trim()) {
      setTwoFactorError("Please enter the verification code");
      return;
    }
    if (isLocked) {
      setTwoFactorError(`Too many failed attempts. Wait ${formatTime(lockTimer)}.`);
      return;
    }

    setTwoFactorLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/verify-2fa-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, code: pin }),
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        const loginRes = await fetch(`${API_BASE_URL}/complete-2fa-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, employeeNumber: employeeNumberForRequests }),
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
          localStorage.setItem("token", loginData.token);
          const decoded = JSON.parse(atob(loginData.token.split(".")[1]));
          localStorage.setItem("employeeNumber", decoded.employeeNumber || "");
          localStorage.setItem("role", decoded.role || "");

          // Check if user has default password
          if (loginData.isDefaultPassword) {
            // Check if user chose to skip reminder today
            const shouldSkip = shouldSkipPasswordReminder(decoded.employeeNumber);

            if (shouldSkip) {
              // Skip password prompt, go directly to dashboard
              setIsDefaultPassword(false);
              setShowPasswordPrompt(false);
              setShow2FA(false);
              
              if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
                window.location.href = "/admin-home";
              } else {
                window.location.href = "/home";
              }
            } else {
              // Show password prompt
              setIsDefaultPassword(true);
              setShowPasswordPrompt(true);
              setShow2FA(false);
            }
          } else {
            if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
              window.location.href = "/admin-home";
            } else {
              window.location.href = "/home";
            }
          }
        } else {
          setTwoFactorError(loginData.error || "Login completion failed.");
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(60);
          setTwoFactorError("Too many failed attempts. Locked for 1 min.");
        } else {
          setTwoFactorError(data.error || "Invalid verification code. Try again.");
        }
      }
    } catch (err) {
      console.error(err);
      setTwoFactorError("Verification failed. Please try again.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const formatTime = seconds => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleLogin = async e => {
    e.preventDefault();
    
    // Check if login is locked
    if (isLoginLocked) {
      setErrorMessage(`Too many failed login attempts. Please wait ${formatTime(loginLockTimer)} before trying again.`);
      return;
    }

    if (!employeeNumber.trim() || !formData.password) {
      setErrorMessage("Please fill all credentials");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const tryLogin = async (employeeNumber) => {
        const payload = { employeeNumber, password: formData.password };
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        return { response, data, employeeNumberAttempted: employeeNumber };
      };

      let { response, data, employeeNumberAttempted } = await tryLogin(employeeNumber);

      if (response.ok) {
        // Reset login attempts on successful login
        setLoginAttempts(0);
        localStorage.removeItem('loginLockData');
        
        const canonicalEmp = data.employeeNumber || employeeNumberAttempted;
        setResolvedEmployeeNumber(canonicalEmp);
        setUserEmail(data.email);
        
        // Check MFA settings: First check global MFA, then individual preference
        try {
          // First check global MFA setting
          let globalMfaEnabled = false;
          try {
            const globalMfaResponse = await fetch(`${API_BASE_URL}/api/system-settings/global_mfa_enabled`);
            if (globalMfaResponse.ok) {
              const globalMfaData = await globalMfaResponse.json();
              globalMfaEnabled = globalMfaData.setting_value === 'true' || globalMfaData.setting_value === true;
              console.log('Global MFA check:', { globalMfaEnabled });
            }
          } catch (globalErr) {
            console.error('Error checking global MFA:', globalErr);
            // If error, default to checking individual preference
          }

          // If global MFA is disabled, skip MFA completely (no code sent)
          if (!globalMfaEnabled) {
            console.log('Global MFA is disabled, completing login directly (no MFA for anyone)');
            const loginRes = await fetch(`${API_BASE_URL}/complete-2fa-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.email, employeeNumber: canonicalEmp }),
            });
            const loginData = await loginRes.json();
            
            if (loginRes.ok) {
              localStorage.setItem("token", loginData.token);
              const decoded = JSON.parse(atob(loginData.token.split(".")[1]));
              localStorage.setItem("employeeNumber", decoded.employeeNumber || "");
              localStorage.setItem("role", decoded.role || "");
              
              if (loginData.isDefaultPassword) {
                // Check if user chose to skip reminder today
                const shouldSkip = shouldSkipPasswordReminder(decoded.employeeNumber);

                if (shouldSkip) {
                  // Skip password prompt, go directly to dashboard
                  if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
                    window.location.href = "/admin-home";
                  } else {
                    window.location.href = "/home";
                  }
                } else {
                  // Show password prompt
                  setIsDefaultPassword(true);
                  setShowPasswordPrompt(true);
                }
              } else {
                if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
                  window.location.href = "/admin-home";
                } else {
                  window.location.href = "/home";
                }
              }
            } else {
              setErrorMessage(loginData.error || "Login completion failed.");
            }
          } else {
            // Global MFA is enabled, check individual user preference
            const prefResponse = await fetch(`${API_BASE_URL}/api/user-preferences/${canonicalEmp}`);
            
            let mfaEnabled = true; // Default to enabled when global MFA is on
            
            if (prefResponse.ok) {
              const prefData = await prefResponse.json();
              // Check if MFA is explicitly disabled (0 or false)
              if (prefData.enable_mfa === 0 || prefData.enable_mfa === false) {
                mfaEnabled = false;
              } else {
                // If 1, true, or undefined, MFA is enabled
                mfaEnabled = true;
              }
              console.log('Individual MFA preference check:', { enable_mfa: prefData.enable_mfa, mfaEnabled });
            } else {
              // If preferences don't exist, default to enabled when global MFA is on
              console.log('MFA preferences not found, defaulting to enabled (global MFA is on)');
              mfaEnabled = true;
            }
            
            if (mfaEnabled) {
              // Individual MFA is enabled, send code and show 2FA modal
              console.log('Individual MFA is enabled, sending verification code');
              await send2FACode(data.email, canonicalEmp);
              setShow2FA(true);
            } else {
              // User has individually disabled MFA, complete login directly
              console.log('User has MFA disabled individually, completing login directly');
              const loginRes = await fetch(`${API_BASE_URL}/complete-2fa-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: data.email, employeeNumber: canonicalEmp }),
              });
              const loginData = await loginRes.json();
              
              if (loginRes.ok) {
                localStorage.setItem("token", loginData.token);
                const decoded = JSON.parse(atob(loginData.token.split(".")[1]));
                localStorage.setItem("employeeNumber", decoded.employeeNumber || "");
                localStorage.setItem("role", decoded.role || "");
                
                if (loginData.isDefaultPassword) {
                  // Check if user chose to skip reminder today
                  const shouldSkip = shouldSkipPasswordReminder(decoded.employeeNumber);

                  if (shouldSkip) {
                    // Skip password prompt, go directly to dashboard
                    if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
                      window.location.href = "/admin-home";
                    } else {
                      window.location.href = "/home";
                    }
                  } else {
                    // Show password prompt
                    setIsDefaultPassword(true);
                    setShowPasswordPrompt(true);
                  }
                } else {
                  if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
                    window.location.href = "/admin-home";
                  } else {
                    window.location.href = "/home";
                  }
                }
              } else {
                setErrorMessage(loginData.error || "Login completion failed.");
              }
            }
          }
        } catch (prefErr) {
          console.error('Error checking MFA settings:', prefErr);
          // Default to enabled if error (for security)
          await send2FACode(data.email, canonicalEmp);
          setShow2FA(true);
        }
      } else {
        // Handle failed login attempt
        const newLoginAttempts = loginAttempts + 1;
        setLoginAttempts(newLoginAttempts);
        
        if (newLoginAttempts >= 3) {
          // Lock for 5 minutes (300 seconds)
          setIsLoginLocked(true);
          setLoginLockTimer(5 * 60);
          
          // Save lock data to localStorage
          const lockUntil = Date.now() + (5 * 60 * 1000);
          localStorage.setItem('loginLockData', JSON.stringify({ lockUntil }));
          
          setErrorMessage("Too many failed login attempts. Your account is locked for 5 minutes.");
        } else {
          const remainingAttempts = 3 - newLoginAttempts;
          setErrorMessage(`${data.error || data.message || "Invalid credentials"}. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
        }
      }
    } catch {
      setErrorMessage("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const blobPositions = React.useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      size: 60 + i * 20,
      top: Math.random() * 70,
      left: Math.random() * 70,
      delay: i * 0.3,
      duration: 1 + i * 2,
    }));
  }, []);

  const blobs = blobPositions.map((blob, i) => (
    <Box
      key={i}
      sx={{
        position: "absolute",
        width: blob.size,
        height: blob.size,
        borderRadius: "50%",
        background: primaryGradient,
        opacity: 0.15 + i * 0.1,
        top: `${blob.top}%`,
        left: `${blob.left}%`,
        animation: `float${i} ${blob.duration}s ease-in-out ${blob.delay}s infinite`,
        [`@keyframes float${i}`]: {
          "0%,100%": { transform: `translate(0,0)` },
          "50%": { transform: `translate(15px, -10px) rotate(20deg)` },
        },
      }}
    />
  ));

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          animation: "zoomPulse 20s ease-in-out infinite",
          "@keyframes zoomPulse": {
            "0%, 100%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.05)" },
          },
        }}
      />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          animation: "subtlePulse 8s ease-in-out infinite",
          "@keyframes subtlePulse": {
            "0%, 100%": { opacity: 0.75 },
            "50%": { opacity: 0.7 },
          },
        }}
      />

      <Box sx={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden", zIndex: 10 }}>
        <LoadingOverlay open={loading} message="Please wait..." />

        <Box
          sx={{
            height: "100vh",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Left Side - Announcement Slideshow */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 800,
              mx: "auto",
              py: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {announcements.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  width: "max-content",
                  animation: `slide ${announcements.length * 5}s linear infinite`,
                  "&:hover": { animationPlayState: "paused" },
                }}
              >
                {[...announcements, ...announcements].map((ann, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: "0 0 650px",
                      borderRadius: 3,
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                      transition: "transform 0.3s, box-shadow 0.3s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={ann.image ? `${API_BASE_URL}${ann.image}` : "/api/placeholder/350/300"}
                      alt={ann.title || "Announcement"}
                      sx={{
                        width: "100%",
                        height: 500,
                        objectFit: "cover",
                        borderRadius: 2,
                        filter: "brightness(0.65)",
                        transition: "transform 0.3s, filter 0.3s",
                        "&:hover": { filter: "brightness(0.55)" },
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        width: "100%",
                        bgcolor: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        p: 2,
                        textAlign: "left",
                        transition: "bgcolor 0.3s",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
                      }}
                    >
                      <Typography variant="caption" sx={{ textTransform: "uppercase", opacity: 0.8 }}>
                        Announcement
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {ann.title}
                      </Typography>
                      <Typography variant="body2">{new Date(ann.date).toDateString()}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.5)", textAlign: "center", py: 4 }}>
                No announcements available
              </Typography>
            )}
            <style>{`
              @keyframes slide {
                0% { transform: translateX(0); }
                100% { transform: translateX(-30%); }
              }
            `}</style>
          </Box>

          {/* Right Side - Login Form */}
          <Container maxWidth="sm" sx={{ position: "relative" }}>
            <Paper
              elevation={24}
              sx={{
                padding: { xs: 3, md: 3 },
                borderRadius: 4,
                textAlign: "center",
                background: "rgba(255,248,231,0.85)",
                backdropFilter: "blur(15px)",
                boxShadow: "0 15px 40px rgba(128,0,32,0.2)",
                border: "1px solid rgba(128,0,32,0.15)",
                transition: "transform 0.6s ease, box-shadow 0.6s ease",
                "&:hover": {
                  transform: "scale(1.03)",
                  boxShadow: "0 25px 50px rgba(128,0,32,0.35)",
                },
              }}
            >
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  margin: "0 auto 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={logo} alt="Logo" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
              </Box>

              <Typography variant="h4" sx={{ color: darkText, fontWeight: 800, mb: 1 }}>
                Human Resource Information System
              </Typography>
              <Typography sx={{ mb: 3, color: mediumText }}>Sign in to access your account</Typography>

              <form onSubmit={handleLogin}>
                <TextField
                  name="employeeNumber"
                  placeholder="Employee Number"
                  fullWidth
                  value={employeeNumber}
                  inputProps={{ maxLength: 20 }}
                  disabled={isLoginLocked}
                  sx={{
                    mb: 3,
                    "& .MuiInputBase-input": {
                      color: "#000",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: placeholderGray,
                      opacity: 1,
                    },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      background: "#fff",
                      "& fieldset": { borderColor: placeholderGray },
                      "&.Mui-focused fieldset": { borderColor: placeholderGray },
                      "& .MuiInputAdornment-root": {
                        marginRight: 0,
                      },
                      "& .MuiOutlinedInput-input": {
                        paddingLeft: 0,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlined sx={{ color: "#a31d1d", mr: 0.75 }} />
                      </InputAdornment>
                    ),
                  }}
                  onChange={handleEmployeeNumberChange}
                />
                <TextField
                  name="password"
                  placeholder="Password"
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  disabled={isLoginLocked}
                  sx={{
                    mb: 2,
                    "& .MuiInputBase-input": {
                      color: "#000",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: placeholderGray,
                      opacity: 1,
                    },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      background: "#fff",
                      "& fieldset": { borderColor: placeholderGray },
                      "&.Mui-focused fieldset": { borderColor: placeholderGray },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: "#a31d1d" }} />
                      </InputAdornment>
                    ),
                  }}
                  onChange={handleChanges}
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 2 }}>
                  <Link href="/forgot-password" underline="hover" sx={{ color: mediumText, flexShrink: 0 }}>
                    Forgot password?
                  </Link>
                </Box>
                
                {/* All alerts below "Forgot password" */}
                {errMessage && <Alert severity="error" sx={{ mb: 2 }}>{errMessage}</Alert>}
                
                {isLoginLocked && (
                  <Alert 
                    severity="warning" 
                    icon={<AccessTimeIcon />}
                    sx={{ mb: 2 }}
                  >
                    Attempt locked. Try again in {formatTime(loginLockTimer)}
                  </Alert>
                )}
                
                {dashWarning && (
                  <Alert severity="warning" sx={{ mb: 3, py: 0.5, fontSize: "0.8rem", "& .MuiAlert-message": { width: "100%", fontSize: "inherit" } }}>
                    {dashWarning}
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoginLocked}
                  startIcon={<LoginOutlined />}
                  sx={{ 
                    py: 1.8, 
                    mb: 1, 
                    background: isLoginLocked ? "rgba(128,0,32,0.3)" : primaryGradient, 
                    "&:hover": { background: isLoginLocked ? "rgba(128,0,32,0.3)" : primaryHoverGradient },
                    opacity: isLoginLocked ? 0.6 : 1
                  }}
                >
                  {isLoginLocked ? `Locked (${formatTime(loginLockTimer)})` : loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Paper>
          </Container>
        </Box>

        {/* Glassy Intro Slide */}
        {showIntro && (
          <Box
            id="introSlide"
            onClick={() => {
              document.getElementById("introSlide").style.transform = "translateY(-100%)";
              setTimeout(() => setShowIntro(false), 800);
            }}
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 9999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(15px)",
              borderRadius: 2,
              overflow: "hidden",
              transform: "translateY(0%)",
              transition: "transform 0.8s ease-in-out",
              cursor: "pointer",
              flexDirection: "column",
            }}
          >
            {blobs}

            <Box sx={{ textAlign: "center", px: 3, mb: 2 }} onClick={e => e.stopPropagation()}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  mb: 2,
                  background: "linear-gradient(90deg, #bd7486ff, #e84a72ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "2px 2px 8px rgba(35, 1, 1, 0.7)",
                }}
              >
                H R I S
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 600, mb: 2, color: "#FFFFFF", textShadow: "1px 1px 5px rgba(0,0,0,0.5)" }}
              >
                Human Resource Information System
              </Typography>
            </Box>

            <Box
              sx={{
                position: "absolute",
                bottom: 80,
                right: 16,
                textAlign: "right",
                color: "#FFF8E7",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Typography sx={{ fontSize: "2.2rem", fontWeight: 500 }}>
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 500 }}>
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>

            <Box
              sx={{
                position: "absolute",
                bottom: 55,
                right: 16,
                display: "flex",
                justifyContent: "space-between",
                width: "181px",
                color: "#FFF8E7",
                fontSize: "0.9rem",
              }}
            >
              <Link
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPolicy(true);
                }}
                underline="hover"
                sx={{ color: "#FFF8E7", fontWeight: 500 }}
              >
                Privacy Policy
              </Link>
              <Link
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFAQ(true);
                }}
                underline="hover"
                sx={{ color: "#FFF8E7", fontWeight: 500 }}
              >
                FAQs
              </Link>
            </Box>

            <Dialog open={openPolicy} onClose={() => setOpenPolicy(false)} fullWidth maxWidth="md">
              <Box p={3} position="relative">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenPolicy(false);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    color: "#6d2323",
                  }}
                >
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" gutterBottom>
                  Privacy Policy
                </Typography>
                <Typography variant="body2">
                  This is the Privacy Policy content.
                </Typography>
              </Box>
            </Dialog>

            <Dialog open={openFAQ} onClose={() => setOpenFAQ(false)} fullWidth maxWidth="md">
              <Box p={3} position="relative">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFAQ(false);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    color: "#6d2323",
                  }}
                >
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" gutterBottom>
                  FAQs
                </Typography>
                <Typography variant="body2">
                  This is the FAQs content.
                </Typography>
              </Box>
            </Dialog>

            <IconButton
              onClick={() => {
                document.getElementById("introSlide").style.transform = "translateY(-100%)";
                setTimeout(() => setShowIntro(false), 800);
              }}
              sx={{
                color: "#FFF8E7",
                fontSize: "3rem",
                animation: "bounce 2s infinite",
              }}
            >
              <KeyboardArrowDown fontSize="inherit" />
            </IconButton>

            <style>{`
              @keyframes bounce {
                0%,100% { transform: translateY(0); }
                50% { transform: translateY(15px); }
              }
            `}</style>
          </Box>
        )}

        {/* 2FA Modal */}
        <Modal open={show2FA} onClose={() => setShow2FA(false)}>
          <Box sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 480,
            maxWidth: "90%",
            bgcolor: "rgba(255,248,231,0.85)",
            borderRadius: 4,
            p: 5,
            textAlign: "center",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 50px rgba(128,0,32,0.3)"
          }}>
            <Typography variant="h5" sx={{ color: darkText, fontWeight: "bold", mb: 3 }}>Email Verification</Typography>
            <Typography sx={{ mb: 3, color: mediumText }}>Verification code sent to <b>{userEmail}</b></Typography>
            {success && <Alert icon={<CheckCircleOutline />} severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {twoFactorError && <Alert icon={<ErrorOutline />} severity="error" sx={{ mb: 2 }}>{twoFactorError}</Alert>}
            <TextField
              fullWidth
              placeholder="••••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              inputProps={{ maxLength: 6, style: { letterSpacing: "0.15rem", fontSize: "1.6rem", textAlign: "center" } }}
              sx={{
                mb: 2,
                "& .MuiInputBase-input": {
                  color: "#000",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: placeholderGray,
                  opacity: 1,
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  background: "#fff",
                  "& fieldset": { borderColor: placeholderGray },
                  "&:hover fieldset": { borderColor: placeholderGray },
                  "&.Mui-focused fieldset": { borderColor: placeholderGray },
                },
              }}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{
                mb: 2,
                py: 1.8,
                background: primaryGradient,
                "&:hover": { background: primaryHoverGradient, transform: "scale(1.05)" },
                transition: "transform 0.2s ease-in-out"
              }}
              onClick={verify2FACode}
              startIcon={<VerifiedUserOutlined sx={{ fontSize: 28, color: "#FFF8E7" }} />}
            >
              {twoFactorLoading ? "Verifying..." : "Verify"}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              sx={{
                py: 1.8,
                color: "#000",
                borderColor: "#000",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#000",
                },
              }}
              onClick={() => send2FACode(userEmail, employeeNumberForRequests)}
              disabled={resendLoading || codeTimer > 0}
            >
              {codeTimer > 0 ? `Resend in ${formatTime(codeTimer)}` : resendLoading ? "Sending..." : "Resend Code"}
            </Button>
          </Box>
        </Modal>

        {/* Change Default Password Prompt */}
        <Modal open={showPasswordPrompt} onClose={() => {}}>
          <Box sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 560,
            maxWidth: "90%",
            bgcolor: "rgba(255,248,231,0.98)",
            borderRadius: 3,
            p: 4,
            textAlign: "left",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 50px rgba(128,0,32,0.25)",
            border: "1px solid rgba(128,0,32,0.15)"
          }}>
            <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                background: primaryGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <LockOutlined sx={{ fontSize: 28, color: lightText }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: darkText, fontWeight: 700, mb: 1 }}>
                  Password Security Notice
                </Typography>
                <Typography variant="body2" sx={{ color: mediumText, lineHeight: 1.6 }}>
Your account is currently using a default password. To protect the security and integrity of your account, you are required to create a new, unique password.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              bgcolor: "rgba(255, 152, 0, 0.08)", 
              border: "1px solid rgba(255, 152, 0, 0.3)",
              borderRadius: 2,
              p: 2.5,
              mb: 3
            }}>
              <Typography variant="subtitle2" sx={{ color: "#e65100", fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <LockOutlined sx={{ fontSize: 18 }} />
                Password Requirements
              </Typography>
              <Typography variant="body2" sx={{ color: "#5d4037", lineHeight: 1.7, fontSize: "0.9rem" }}>
                • Must be at least 8 characters in long<br/>
                • Must include both uppercase and lowercase letters<br/>
                • Must contain at least one number and one special character<br/>
                • Must not contain common words or personal information
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  py: 1.5,
                  background: primaryGradient,
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  "&:hover": { background: primaryHoverGradient },
                }}
                onClick={() => {
                  const decoded = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
                  if (decoded.role === "superadmin" || decoded.role === "administrator" || decoded.role === "technical") {
                    window.location.href = "/settings?tab=security";
                  } else {
                    window.location.href = "/settings?tab=security";
                  }
                }}
                startIcon={<LockOutlined />}
              >
                Update Password Now
              </Button>

              <Button
                fullWidth
                variant="outlined"
                sx={{
                  py: 1.5,
                  color: mediumText,
                  borderColor: mediumText,
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  "&:hover": {
                    backgroundColor: "rgba(128,0,32,0.05)",
                    borderColor: mediumText,
                  },
                }}
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setShowLaterModal(true);
                }}
              >
                Remind Me Later
              </Button>
            </Box>

            <Typography variant="caption" sx={{ display: "block", color: "rgba(0,0,0,0.6)", fontSize: "0.75rem", textAlign: "center" }}>
              You can choose to be reminded again later today or proceed to update it now.<br/>
              You can update your password at any time via Settings → Security → Change Password.
            </Typography>
          </Box>
        </Modal>

        <Modal open={showLaterModal} onClose={() => {}}>
          <Box sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 520,
            maxWidth: "90%",
            bgcolor: "rgba(255,248,231,0.98)",
            borderRadius: 3,
            p: 4,
            textAlign: "left",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 50px rgba(128,0,32,0.25)",
            border: "1px solid rgba(128,0,32,0.15)"
          }}>
            <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                background: primaryGradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <LockOutlined sx={{ fontSize: 28, color: lightText }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: darkText, fontWeight: 700, mb: 1 }}>
                  Password Update Reminder
                </Typography>
                <Typography variant="body2" sx={{ color: mediumText, lineHeight: 1.6 }}>
                  For security purposes, please update your password as soon as possible.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              bgcolor: "rgba(128,0,32,0.05)", 
              borderRadius: 2, 
              p: 2.5,
              mb: 3,
              border: "1px solid rgba(128,0,32,0.1)"
            }}>
              <Typography variant="body2" sx={{ color: mediumText, fontWeight: 600, mb: 0.5 }}>
                You can update your password at:
              </Typography>
              <Typography variant="body2" sx={{ color: darkText, fontWeight: 600 }}>
                Settings → Security → Change Password
              </Typography>
            </Box>

            <Box sx={{ 
              mb: 3,
              p: 2,
              bgcolor: "rgba(255, 152, 0, 0.05)",
              borderRadius: 2,
              border: "1px solid rgba(255, 152, 0, 0.2)"
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={dontRemindToday}
                    onChange={(e) => setDontRemindToday(e.target.checked)}
                    sx={{
                      color: mediumText,
                      '&.Mui-checked': {
                        color: mediumText,
                      },
                    }}
                  />
                }
                label="Don't remind me again today"
                sx={{
                  margin: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: "0.9rem",
                    color: darkText,
                    fontWeight: 500,
                  }
                }}
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              sx={{
                py: 1.5,
                background: primaryGradient,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "0.95rem",
                "&:hover": { background: primaryHoverGradient },
              }}
              onClick={() => {
                const token = localStorage.getItem("token");
                if (!token) {
                  console.error('❌ No token found!');
                  return;
                }
                
                const decoded = JSON.parse(atob(token.split(".")[1]));
                const empNum = decoded.employeeNumber;
                
                console.log('\n=== SAVING REMINDER SKIP ===');
                console.log('Employee Number:', empNum);
                console.log('Checkbox checked:', dontRemindToday);
                
                if (dontRemindToday) {
                  const today = new Date().toDateString();
                  const reminderData = {
                    date: today,
                    employeeNumber: empNum,
                    timestamp: Date.now()
                  };
                  
                  try {
                    // Save to BOTH localStorage AND sessionStorage for redundancy
                    const dataString = JSON.stringify(reminderData);
                    localStorage.setItem('passwordReminderSkipped', dataString);
                    sessionStorage.setItem('passwordReminderSkipped', dataString);
                    
                    // Verify it was saved
                    const verify = localStorage.getItem('passwordReminderSkipped');
                    console.log('Data saved to localStorage:', verify);
                    console.log('Parsed back:', JSON.parse(verify));
                    
                    const verifySession = sessionStorage.getItem('passwordReminderSkipped');
                    console.log('Data saved to sessionStorage:', verifySession);
                    
                    if (!verify) {
                      console.error('❌ FAILED TO SAVE TO LOCALSTORAGE!');
                    } else {
                      console.log('✅ Successfully saved reminder skip');
                    }
                  } catch (e) {
                    console.error('❌ Error saving password reminder preference:', e);
                  }
                } else {
                  console.log('Checkbox not checked, not saving reminder skip');
                }
                
                setShowLaterModal(false);
                
                // Use a longer delay and verify data before navigation
                setTimeout(() => {
                  if (dontRemindToday) {
                    const verify = localStorage.getItem('passwordReminderSkipped');
                    console.log('Before navigation, localStorage still has data:', !!verify);
                    if (!verify) {
                      console.error('❌ DATA WAS LOST BEFORE NAVIGATION!');
                    }
                  }
                  
                  const role = decoded.role;
                  console.log('Navigating to dashboard for role:', role);
                  console.log('=== END SAVE ===\n');
                  
                  if (role === "superadmin" || role === "administrator" || role === "technical") {
                    window.location.href = "/admin-home";
                  } else {
                    window.location.href = "/home";
                  }
                }, 300); // Increased delay to 300ms
              }}
            >
              Continue to Dashboard
            </Button>
          </Box>
        </Modal>
      </Box>
    </>
  );
};

export default Login;