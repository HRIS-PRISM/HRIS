import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Typography, Button, alpha } from "@mui/material";

const ACCENT = "#6d2323";
const Z_FULL_VIEWPORT = 20000;

const SuccessfulOverlay = ({ open, action, onClose, showOkButton = false, message: messageProp }) => {
  useEffect(() => {
    if (open && !showOkButton) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, showOkButton, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const getMessage = () => {
    const custom = messageProp != null && String(messageProp).trim();
    if (custom) return String(messageProp).trim();
    switch (action) {
      case "create":
        return "Successfully Created!";
      case "edit":
        return "Successfully Edited!";
      case "delete":
        return "Successfully Deleted!";
      case "send":
        return "Successfully Sent!";
      case "download":
        return "Successfully Downloaded!";
      case "gmail":
        return "Successfully Sent to Gmail!";
      case "reset":
        return "Successfully Reset!";
      case "bulk":
        return "Successfully Updated!";
      case "status":
        return "Status Updated!";
      case "cancel":
        return "Successfully Cancelled!";
      case "void":
        return "Successfully Voided!";
      default:
        return "Successful!";
    }
  };

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <Box
      role="dialog"
      aria-modal="true"
      aria-labelledby="successful-overlay-title"
      sx={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: Z_FULL_VIEWPORT,
        bgcolor: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            border: `2px solid ${alpha(ACCENT, 0.2)}`,
            borderTopColor: ACCENT,
            borderRadius: "50%",
            animation: "hris-success-spin 0.7s linear infinite",
            mx: "auto",
          }}
        />
        <Typography
          id="successful-overlay-title"
          sx={{
            mt: 2,
            color: "#fff",
            fontSize: "0.8rem",
            fontWeight: 500,
            mb: showOkButton ? 2 : 0,
          }}
        >
          {getMessage()}
        </Typography>

        {showOkButton && (
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              bgcolor: ACCENT,
              color: "#fff",
              fontWeight: 600,
              px: 4,
              py: 1,
              textTransform: "none",
              borderRadius: 1,
              boxShadow: "none",
              "&:hover": { bgcolor: "#5a1d1d", boxShadow: `0 2px 10px ${alpha(ACCENT, 0.32)}` },
            }}
          >
            OK
          </Button>
        )}
      </Box>
      <style>{`@keyframes hris-success-spin { to { transform: rotate(360deg); } }`}</style>
    </Box>,
    document.body
  );
};

export default SuccessfulOverlay;
