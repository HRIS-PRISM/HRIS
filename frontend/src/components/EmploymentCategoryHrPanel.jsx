import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
} from "@mui/material";
import { Category as CategoryIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { getAuthHeaders } from "../utils/auth";

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

/**
 * Read-only summary aligned with the Employment Category module:
 * employee assignment, schedule label, hour→decimal table, and deduction preview.
 */
export function EmploymentCategoryHrPanel({
  employeeNumber,
  employmentTypeName,
  hoursPerDay,
  whDayType,
  hourRows = [],
  deductionHoursDisplay,
  rateDecimalDisplay,
  computedDecimalFromHours,
}) {
  const [cat, setCat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (employeeNumber === undefined || employeeNumber === null || String(employeeNumber).trim() === "") {
      setCat(null);
      setErr("");
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await axios.get(
          `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category/${encodeURIComponent(employeeNumber)}`,
          getAuthHeaders(),
        );
        if (alive) setCat(res.data);
      } catch (e) {
        if (!alive) return;
        setCat(null);
        if (e.response?.status === 404) setErr("");
        else setErr(e.response?.data?.message || "Could not load employment category.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [employeeNumber]);

  const rows = Array.isArray(hourRows) ? hourRows.filter((r) => r && Number(r.rate_value) >= 1 && Number(r.rate_value) <= 8) : [];

  return (
    <Box
      sx={{
        height: "100%",
        borderRadius: "12px",
        border: "0.5px solid rgba(0,0,0,0.09)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
        bgcolor: T.surface,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header strip — matches Leave Request / ECM form panel headers */}
      <Box
        sx={{
          px: 1.75,
          py: 1.1,
          bgcolor: T.accentFaint,
          borderBottom: `1px solid ${T.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <CategoryIcon sx={{ fontSize: 15, color: T.accent }} />
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: T.accent,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Employment Category
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/employee-category"
          size="small"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
          sx={{
            fontSize: "0.7rem",
            textTransform: "none",
            fontWeight: 600,
            color: T.accent,
            minWidth: 0,
            px: 1,
            py: 0.25,
            borderRadius: 1.5,
            "&:hover": { bgcolor: T.accentHover },
          }}
        >
          Open module
        </Button>
      </Box>

      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1, minHeight: 0 }}>
        <Typography sx={{ fontSize: "0.7rem", color: T.muted, lineHeight: 1.5 }}>
          Same assignment as in Employment Category. Use with the table below to see how leave hours convert to payroll decimal.
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2.5 }}>
            <CircularProgress size={22} sx={{ color: T.accent }} />
          </Box>
        ) : err ? (
          <Typography sx={{ fontSize: "0.72rem", color: "#c62828" }}>{err}</Typography>
        ) : cat ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={cat.categoryLabel || "—"}
              sx={{
                height: 22,
                fontWeight: 700,
                fontSize: "0.7rem",
                borderRadius: "4px",
                borderLeft: `3px solid ${cat.colorHex || T.accent}`,
                bgcolor: T.accentFaint,
                border: `1px solid ${T.accentBorder}`,
                color: T.text,
                "& .MuiChip-label": { px: 1 },
              }}
            />
            {cat.employeeName && (
              <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>{cat.employeeName}</Typography>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              py: 1.25,
              px: 1.5,
              borderRadius: 2,
              border: `1px dashed ${T.accentBorder}`,
              bgcolor: alpha(T.accent, 0.02),
            }}
          >
            <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
              No employment category for this employee — assign it in Employment Category.
            </Typography>
          </Box>
        )}

        <Box sx={{ pt: 1.25, borderTop: `1px solid ${T.divider}` }}>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: alpha(T.accent, 0.55), mb: 0.5 }}>
            Leave deduction schedule
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: T.text, lineHeight: 1.45 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>{employmentTypeName || "—"}</Box>
            {hoursPerDay != null && Number.isFinite(Number(hoursPerDay)) ? (
              <>
                {" "}
                · {Number(hoursPerDay)} h/day basis
              </>
            ) : null}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: alpha(T.accent, 0.55), mb: 0.75 }}>
            Hour → decimal ({whDayType === "6hr" ? "6 h day" : "8 h day"})
          </Typography>
          <Box
            sx={{
              borderRadius: 2,
              border: `1px solid ${T.accentBorder}`,
              overflow: "hidden",
              bgcolor: "#fff",
            }}
          >
            <Table
              size="small"
              sx={{
                "& .MuiTableCell-root": {
                  py: 0.45,
                  px: 1.25,
                  fontSize: "0.7rem",
                  borderColor: T.divider,
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: T.accent }}>
                  <TableCell sx={{ fontWeight: 700, color: "#fff", fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Hours
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#fff", fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Decimal
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length ? (
                  rows.map((r, idx) => (
                    <TableRow
                      key={r.rate_value}
                      sx={{ bgcolor: idx % 2 === 0 ? "#fff" : "rgba(109,35,35,0.025)" }}
                    >
                      <TableCell sx={{ color: T.text }}>{r.rate_value} h</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                        {Number(r.decimal_equivalent).toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography sx={{ fontSize: "0.7rem", color: T.faint }}>Loading table…</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: T.accentFaint,
            border: `1px solid ${T.accentBorder}`,
            borderLeft: `3px solid ${T.accent}`,
            mt: "auto",
          }}
        >
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.accent, mb: 0.5 }}>
            Deduction preview
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: T.text, lineHeight: 1.5 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>{deductionHoursDisplay}</Box>
            {" "}h leave deduction →{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {computedDecimalFromHours != null ? Number(computedDecimalFromHours).toFixed(3) : "—"}
            </Box>{" "}
            decimal
          </Typography>
          <Typography sx={{ fontSize: "0.68rem", color: T.muted, mt: 0.4 }}>
            Decimal field (rate): <Box component="span" sx={{ fontWeight: 700, color: T.text }}>{rateDecimalDisplay}</Box>
            {" "}— keep in sync when editing hours.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default EmploymentCategoryHrPanel;
