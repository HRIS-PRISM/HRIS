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
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
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
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${T.accentBorder}`,
        bgcolor: T.accentFaint,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <CategoryIcon sx={{ fontSize: 16, color: T.accent }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: T.accent, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Employment Category
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/employee-category"
          size="small"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          sx={{ fontSize: "0.68rem", textTransform: "none", fontWeight: 600, color: T.accent }}
        >
          Open module
        </Button>
      </Box>

      <Typography sx={{ fontSize: "0.7rem", color: T.muted, lineHeight: 1.45 }}>
        Same assignment as in <strong>Employment Category</strong>. Use this together with the table below to see how leave hours convert to payroll decimal.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={22} sx={{ color: T.accent }} />
        </Box>
      ) : err ? (
        <Typography sx={{ fontSize: "0.72rem", color: "#C62828" }}>{err}</Typography>
      ) : cat ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
          <Chip
            size="small"
            label={cat.categoryLabel || "—"}
            sx={{
              fontWeight: 700,
              fontSize: "0.72rem",
              borderLeft: `4px solid ${cat.colorHex || T.accent}`,
              bgcolor: "#fff",
              border: `1px solid ${T.accentBorder}`,
            }}
          />
          {cat.employeeName && (
            <Typography sx={{ fontSize: "0.68rem", color: T.muted }}>{cat.employeeName}</Typography>
          )}
        </Box>
      ) : (
        <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontStyle: "italic" }}>
          No employment category record for this employee (assign in Employment Category).
        </Typography>
      )}

      <Box sx={{ py: 0.75, borderTop: `1px dashed ${T.divider}`, borderBottom: `1px dashed ${T.divider}` }}>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.35 }}>Leave deduction schedule (HR)</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: T.text }}>
          <strong>{employmentTypeName || "—"}</strong>
          {hoursPerDay != null && Number.isFinite(Number(hoursPerDay)) ? (
            <>
              {" "}
              · <strong>{Number(hoursPerDay)}</strong> h/day basis
            </>
          ) : null}
        </Typography>
      </Box>

      <Box>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.5 }}>
          Hour → decimal ({whDayType === "6hr" ? "6 h day" : "8 h day"} table)
        </Typography>
        <Table size="small" sx={{ bgcolor: "#fff", borderRadius: 1, border: `1px solid ${T.accentBorder}`, "& .MuiTableCell-root": { py: 0.35, fontSize: "0.68rem" } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(T.accent, 0.06) }}>
              <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Decimal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length ? (
              rows.map((r) => (
                <TableRow key={r.rate_value}>
                  <TableCell>{r.rate_value} h</TableCell>
                  <TableCell align="right">{Number(r.decimal_equivalent).toFixed(3)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography sx={{ fontSize: "0.68rem", color: T.faint }}>Loading table…</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Box
        sx={{
          p: 1.25,
          borderRadius: 1.5,
          bgcolor: alpha("#1565C0", 0.06),
          border: `1px solid ${alpha("#1565C0", 0.22)}`,
        }}
      >
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#1565C0", mb: 0.5 }}>Deduction preview</Typography>
        <Typography sx={{ fontSize: "0.74rem", color: T.text, lineHeight: 1.5 }}>
          <strong>{deductionHoursDisplay}</strong> h leave deduction →{" "}
          <strong>{computedDecimalFromHours != null ? Number(computedDecimalFromHours).toFixed(3) : "—"}</strong> decimal (working-hours scale)
        </Typography>
        <Typography sx={{ fontSize: "0.68rem", color: T.muted, mt: 0.35 }}>
          Decimal field (rate): <strong>{rateDecimalDisplay}</strong> — must stay in sync when editing hours.
        </Typography>
      </Box>
    </Box>
  );
}

export default EmploymentCategoryHrPanel;
