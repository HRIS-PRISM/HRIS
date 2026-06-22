import React from "react";
import { RocketLaunch } from "@mui/icons-material";
import { Button, Typography, Container, Box, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import logo from "../assets/earist-logo.png";

const LogoBackground = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100%",
      opacity: 0.05,
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

const ComingSoon = ({
  title = "Something new is on the way",
  subtitle = "Next project — under development",
  message = "This module is currently being built by the development team. Stay tuned for updates — it will be available in a future release.",
  showReturnButton = true,
  returnPath = "/admin-home",
  returnButtonText = "Return to Home",
  features = [
    { icon: "💻", label: "In active development" },
    { icon: "🛡️", label: "Quality tested" },
    { icon: "👥", label: "Built for your team" },
    { icon: "🔔", label: "Notify on release" },
  ],
}) => {
  const navigate = useNavigate();

  return (
    <>
      <LogoBackground />

      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Box
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: "background.paper",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 3,
              boxShadow: "0 2px 24px rgba(109,35,35,0.06)",
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.06)",
                border: "0.5px solid rgba(109,35,35,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <RocketLaunch sx={{ fontSize: 32, color: "#6d2323" }} />
            </Box>

            <Chip
              label="Coming Soon"
              size="small"
              sx={{
                mb: 2,
                bgcolor: "rgba(109,35,35,0.07)",
                color: "#6d2323",
                border: "0.5px solid rgba(109,35,35,0.2)",
                fontWeight: 600,
                fontSize: "0.72rem",
              }}
            />

            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1a1a1a", mb: 0.75 }}>
              {title}
            </Typography>

            <Typography sx={{ fontSize: "0.88rem", color: "#6d2323", fontWeight: 600, mb: 1.5 }}>
              {subtitle}
            </Typography>

            <Typography sx={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.7, mb: 3 }}>
              {message}
            </Typography>

            <Box sx={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", mb: 3 }} />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.25,
                mb: 3,
              }}
            >
              {features.map((f, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "rgba(109,35,35,0.04)",
                    border: "0.5px solid rgba(109,35,35,0.08)",
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    textAlign: "left",
                  }}
                >
                  <Typography sx={{ fontSize: "1rem" }}>{f.icon}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.4 }}>
                    {f.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontSize: "0.78rem", color: "#888", mb: showReturnButton ? 2.5 : 0 }}>
              Contact your administrator for a target release date.
            </Typography>

            {showReturnButton && (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(returnPath)}
                sx={{
                  bgcolor: "#6d2323",
                  px: 3,
                  py: 1.25,
                  fontSize: "0.9rem",
                  borderRadius: "25px",
                  textTransform: "none",
                  boxShadow: "0 4px 15px rgba(109,35,35,0.25)",
                  "&:hover": {
                    bgcolor: "#5a1e1e",
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 20px rgba(109,35,35,0.35)",
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
    </>
  );
};

export default ComingSoon;
