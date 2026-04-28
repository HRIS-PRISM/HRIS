import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Typography, alpha } from "@mui/material";

const ACCENT = "#6d2323";
/** Above App shell (AppBar 1201, drawer, footer); portaled to body so parent `transform` cannot clip the overlay */
const Z_FULL_VIEWPORT = 20000;

const LoadingOverlay = ({ open, message = "Processing…" }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <Box
      role="progressbar"
      aria-busy="true"
      aria-live="polite"
      aria-label={message}
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
            animation: "hris-loading-spin 0.7s linear infinite",
            mx: "auto",
          }}
        />
        <Typography sx={{ mt: 2, color: "#fff", fontSize: "0.8rem", fontWeight: 500 }}>
          {message}
        </Typography>
      </Box>
      <style>{`@keyframes hris-loading-spin { to { transform: rotate(360deg); } }`}</style>
    </Box>,
    document.body
  );
};

export default LoadingOverlay;
