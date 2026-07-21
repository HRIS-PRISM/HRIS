import React from "react";
import { Error } from "@mui/icons-material";
import { Button, Typography, Container, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import logo from "../assets/earist-logo.png";

// ✅ Separate Logo Background Component
const LogoBackground = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100%",
      opacity: 0.1, 
      zIndex: 0,
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <img
      src={logo}
      alt="EARIST Logo"
      style={{
        width: "100vw",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        maxWidth: "none",
        maxHeight: "none",
      }}
    />
  </div>
);

const AccessDenied = ({
  title = "Access Denied",
  message = "You do not have permission to access this page. Contact your administrator to request access.",
  showReturnButton = true,
  returnPath = "/admin-home",
  returnButtonText = "Return to Home",
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* ✅ Full Screen Logo Background */}
      <LogoBackground />

      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Container
          maxWidth="sm"
          sx={{ py: 4, position: "relative", zIndex: 2 }}
        >
          <Box sx={{ p: 3, textAlign: "center", position: "relative" }}>
            {/* Error Icon */}
            <Box sx={{ mb: 2 }}>
              <Error
                sx={{
                  fontSize: 80,
                  color: "#6d2323",
                  mb: 1,
                  animation: "pulse 2s infinite",
                  filter: "drop-shadow(0 4px 8px rgba(109, 35, 35, 0.3))",
                  textShadow: "2px 2px 4px rgba(255, 255, 255, 0.8)",
                }}
              />
            </Box>

            {/* Access Denied Title */}
            <Typography
              variant="h3"
              sx={{
                color: "#6d2323",
                fontWeight: "bold",
                mb: 1,
                fontSize: { xs: "1.8rem", md: "2.5rem" },
                textShadow:
                  "2px 2px 4px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.5)",
                animation: "fadeFlicker 3s infinite",
              }}
            >
              {title}
            </Typography>

            {/* Unauthorized Access Subtitle */}
            <Typography
              variant="h5"
              sx={{
                color: "#a31d1d",
                mb: 2,
                fontSize: { xs: "1.1rem", md: "1.4rem" },
                fontWeight: "600",
                textShadow: "1px 1px 3px rgba(255, 255, 255, 0.8)",
              }}
            >
              Unauthorized Access
            </Typography>

            {/* Message */}
            <Typography
              variant="body1"
              sx={{
                color: "#555",
                mb: 3,
                fontSize: "1rem",
                lineHeight: 1.5,
                maxWidth: "400px",
                margin: "0 auto 1.5rem auto",
                textShadow: "1px 1px 2px rgba(255, 255, 255, 0.8)",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                padding: "0.8rem",
                borderRadius: "8px",
              }}
            >
              {message}
            </Typography>

            {/* Return Button */}
            {showReturnButton && (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(returnPath)}
                sx={{
                  bgcolor: "#6d2323",
                  px: 3,
                  py: 1.5,
                  fontSize: "1rem",
                  borderRadius: "25px",
                  textTransform: "none",
                  boxShadow: "0 4px 15px rgba(109, 35, 35, 0.3)",
                  "&:hover": {
                    bgcolor: "#5a1e1e",
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 20px rgba(109, 35, 35, 0.4)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                {returnButtonText}
              </Button>
            )}
          </Box>
        </Container>
      </div>

      {/* ✅ Background Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "90%",
          backgroundColor: "rgba(245, 245, 245, 0.3)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* ✅ Keyframes */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
          @keyframes fadeFlicker {
            0%, 100% { opacity: 1; }
            25% { opacity: 0.9; }
            50% { opacity: 0.95; }
            75% { opacity: 0.85; }
          }
        `}
      </style>
    </>
  );
};

export default AccessDenied;
