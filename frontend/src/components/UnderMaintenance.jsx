import React from "react";
import { Build } from "@mui/icons-material";
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

const STEP_STATUS = {
  DONE: "done",
  ACTIVE: "active",
  PENDING: "pending",
};

const StepDot = ({ status }) => {
  const colors = {
    [STEP_STATUS.DONE]: "#16a34a",
    [STEP_STATUS.ACTIVE]: "#b45309",
    [STEP_STATUS.PENDING]: "rgba(0,0,0,0.15)",
  };
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
        bgcolor: colors[status],
        border:
          status === STEP_STATUS.PENDING ? "0.5px solid rgba(0,0,0,0.2)" : "none",
        animation:
          status === STEP_STATUS.ACTIVE ? "pulseDot 1.6s ease-in-out infinite" : "none",
      }}
    />
  );
};

const UnderMaintenance = ({
  title = "We'll be right back",
  subtitle = "System update in progress",
  message = "This module is currently undergoing scheduled maintenance or an update. Your data is safe — please check back shortly once the process is complete.",
  showReturnButton = true,
  returnPath = "/admin-home",
  returnButtonText = "Return to Home",
  steps = [
    { label: "Backup completed", status: STEP_STATUS.DONE },
    { label: "Applying updates", status: STEP_STATUS.ACTIVE },
    { label: "System verification", status: STEP_STATUS.PENDING },
    { label: "Back online", status: STEP_STATUS.PENDING },
  ],
}) => {
  const navigate = useNavigate();

  const statusLabel = {
    [STEP_STATUS.DONE]: "Done",
    [STEP_STATUS.ACTIVE]: "In progress",
    [STEP_STATUS.PENDING]: "Pending",
  };

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
              boxShadow: "0 2px 24px rgba(180,83,9,0.06)",
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(180,83,9,0.06)",
                border: "0.5px solid rgba(180,83,9,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                animation: "pulseDot 1.6s ease-in-out infinite",
              }}
            >
              <Build sx={{ fontSize: 32, color: "#b45309" }} />
            </Box>

            <Chip
              label="Under Maintenance"
              size="small"
              sx={{
                mb: 2,
                bgcolor: "#fef3e2",
                color: "#92400e",
                border: "0.5px solid #f0b95a",
                fontWeight: 600,
                fontSize: "0.72rem",
              }}
            />

            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1a1a1a", mb: 0.75 }}>
              {title}
            </Typography>

            <Typography sx={{ fontSize: "0.88rem", color: "#b45309", fontWeight: 600, mb: 1.5 }}>
              {subtitle}
            </Typography>

            <Typography sx={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.7, mb: 3 }}>
              {message}
            </Typography>

            <Box sx={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", mb: 2.5 }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
              {steps.map((step, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    bgcolor: "rgba(0,0,0,0.03)",
                    border: "0.5px solid rgba(0,0,0,0.07)",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    textAlign: "left",
                  }}
                >
                  <StepDot status={step.status} />
                  <Typography sx={{ fontSize: "0.82rem", color: "#444", flex: 1 }}>
                    {step.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color:
                        step.status === STEP_STATUS.DONE
                          ? "#16a34a"
                          : step.status === STEP_STATUS.ACTIVE
                            ? "#b45309"
                            : "#aaa",
                    }}
                  >
                    {statusLabel[step.status]}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontSize: "0.78rem", color: "#888", mb: showReturnButton ? 2.5 : 0 }}>
              Contact your administrator for the estimated completion time.
            </Typography>

            {showReturnButton && (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(returnPath)}
                sx={{
                  bgcolor: "#b45309",
                  px: 3,
                  py: 1.25,
                  fontSize: "0.9rem",
                  borderRadius: "25px",
                  textTransform: "none",
                  boxShadow: "0 4px 15px rgba(180,83,9,0.25)",
                  "&:hover": {
                    bgcolor: "#92400e",
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 20px rgba(180,83,9,0.35)",
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

      <style>
        {`
          @keyframes pulseDot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.08); }
          }
        `}
      </style>
    </>
  );
};

export { STEP_STATUS };
export default UnderMaintenance;
