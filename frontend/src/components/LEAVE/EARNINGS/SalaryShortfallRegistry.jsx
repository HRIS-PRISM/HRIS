import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";

const T = {
  accent: "#6d2323",
  muted: "#555555",
  faint: "#888888",
  divider: "rgba(0,0,0,0.08)",
  poppins: "'Poppins', sans-serif",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

/** Surname, First name, M.I. (e.g. DELA CRUZ, Juan M.) */
function formatNameSnNMi(row) {
  const sn = (row?.emp_last_name || "").trim();
  const n = (row?.emp_first_name || "").trim();
  const mid = (row?.emp_middle_name || "").trim();
  const mi = mid ? `${mid.charAt(0).toUpperCase()}.` : "";
  const right = [n, mi].filter(Boolean).join(" ");
  if (!sn && !right) return "—";
  return sn ? `${sn}, ${right}`.replace(/,\s*$/, "") : right;
}

/**
 * Registry of leave deductions that exceeded credits and must be recovered via salary.
 * Filled when an admin approves a leave earning deduction and remaining balance is insufficient.
 */
export function SalaryShortfallRegistry({ employee, year, month }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const params = { year, month };
      if (employee?.employeeNumber) params.employeeNumber = employee.employeeNumber;
      const { data } = await axios.get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      setRows([]);
      setError(
        e.response?.data?.error ||
          e.response?.data?.message ||
          e.message ||
          "Failed to load salary shortfall records",
      );
    } finally {
      setLoading(false);
    }
  }, [employee?.employeeNumber, year, month]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return (
    <Box sx={{ px: { xs: 1, sm: 1.5 }, py: 1.5, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
            Salary recovery (leave shortfall)
          </Typography>
          <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, mt: 0.25 }}>
            Rows include <strong>approved leave</strong> overdraws, explicit <strong>Salary Deduction</strong> attendance lines,
            and <strong>SC / CTO</strong> absence deductions when credits were insufficient (balance 0 or short). Filter follows
            the header month and selected employee.
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={loading ? <CircularProgress size={11} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={fetchRows}
          disabled={loading}
          sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", fontFamily: T.poppins, color: T.accent }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: "0.72rem", py: 0.25 }}>
          {error}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: `1px solid ${T.divider}`, borderRadius: 1.5, flex: 1, maxHeight: { md: "calc(100vh - 420px)" } }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {[
                "Employee #",
                "Name (SN, N, MI)",
                "Employment category",
                "Period",
                "Leave",
                "Type",
                "Negative (d)",
                "To salary (d)",
                "Hours",
                "Created",
              ].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.62rem",
                    fontFamily: T.poppins,
                    bgcolor: "rgba(109,35,35,0.06)",
                    color: T.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !rows.length ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} sx={{ color: T.accent }} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 3, fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                  No shortfall rows for this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover sx={{ "& td": { fontFamily: T.poppins, fontSize: "0.72rem" } }}>
                  <TableCell>{r.employee_number}</TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {formatNameSnNMi(r)}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.employment_category_label || "—"}
                  </TableCell>
                  <TableCell>
                    {MONTHS[(parseInt(r.period_month, 10) || 1) - 1]} {r.period_year}
                  </TableCell>
                  <TableCell>{r.leave_code}</TableCell>
                  <TableCell sx={{ maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.entry_type || "—"}
                  </TableCell>
                  <TableCell sx={{ color: toNum(r.negative_balance_days) < 0 ? "#c62828" : "inherit", fontWeight: 700 }}>
                    {toNum(r.negative_balance_days).toFixed(3)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{toNum(r.shortfall_days).toFixed(3)}</TableCell>
                  <TableCell>{toNum(r.shortfall_hours).toFixed(3)}</TableCell>
                  <TableCell sx={{ color: T.muted, fontSize: "0.68rem !important" }}>{fmtWhen(r.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
