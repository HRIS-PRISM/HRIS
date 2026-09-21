import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { getAuthHeaders } from "../utils/auth";
import {
  compareFacialUsers,
  ISSUE_LABELS,
  rowMatchesFilter,
} from "../utils/compareFacialUsers";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Download from "@mui/icons-material/Download";
import Refresh from "@mui/icons-material/Refresh";
import Search from "@mui/icons-material/Search";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Cancel from "@mui/icons-material/Cancel";
import People from "@mui/icons-material/People";
import Badge from "@mui/icons-material/Badge";
import WarningAmber from "@mui/icons-material/WarningAmber";
import PersonOff from "@mui/icons-material/PersonOff";
import SwapHoriz from "@mui/icons-material/SwapHoriz";
import Pin from "@mui/icons-material/Pin";

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  text: "#1a1a1a",
  border: "rgba(109,35,35,0.14)",
};

const ISSUE_TONE = {
  matched: { bg: "rgba(46,125,50,0.1)", color: "#2e7d32" },
  number_match_name_diff: { bg: "rgba(230,81,0,0.1)", color: "#e65100" },
  blank_name: { bg: "rgba(0,0,0,0.05)", color: "#6b6b6b" },
  name_match_number_diff: { bg: "rgba(198,40,40,0.1)", color: "#c62828" },
  near_number: { bg: "rgba(230,81,0,0.1)", color: "#e65100" },
  possible_id_mismatch: { bg: "rgba(109,35,35,0.08)", color: "#6d2323" },
  users_only: { bg: "rgba(198,40,40,0.1)", color: "#c62828" },
  facial_only: { bg: "rgba(198,40,40,0.1)", color: "#c62828" },
};

function fmtCount(value) {
  return Number(value || 0).toLocaleString();
}

function formatLastSeen(value) {
  if (value == null || value === "") return "";
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return String(value);
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function NumberCell({ value, matched, compared }) {
  if (!value) {
    return (
      <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontStyle: "italic" }}>
        Missing
      </Typography>
    );
  }
  const color = !compared ? T.text : matched ? "#2e7d32" : "#c62828";
  return (
    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color }}>
      #{value}
    </Typography>
  );
}

export default function FacialUserComparePanel({ active = true, users, onStats }) {
  const [facialRows, setFacialRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const rowsPerPage = 25;

  const loadFacial = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${API_BASE_URL}/attendance/api/all-device-users`,
        getAuthHeaders(),
      );
      setFacialRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setFacialRows([]);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to load AttendanceRecordInfo employee numbers",
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  };

  const fetchedRef = useRef(false);
  const [compared, setCompared] = useState(() => compareFacialUsers([], []));

  useEffect(() => {
    if (!active || fetchedRef.current) return;
    fetchedRef.current = true;
    loadFacial();
  }, [active]);

  useEffect(() => {
    if (!active || !ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setCompared(compareFacialUsers(users, facialRows));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, ready, users, facialRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return compared.rows.filter((row) => {
      if (filter === "no_records") {
        if (!row.usersEmployeeNumber || row.numbersExact) return false;
      } else if (!rowMatchesFilter(row, filter)) return false;
      if (!term) return true;
      return [
        row.usersEmployeeNumber,
        row.usersName,
        row.attendanceEmployeeNumber,
        row.attendanceName,
        ISSUE_LABELS[row.issue],
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [compared.rows, filter, search]);

  useEffect(() => {
    if (!ready) return;
    onStats?.(compared.stats);
  }, [ready, compared.stats, onStats]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pageRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = compared.stats;
  const summaryCards = [
    {
      id: "number_match",
      icon: CheckCircle,
      value: `${stats.matchRate}%`,
      label: "Match rate",
      sub: `${fmtCount(stats.bothNumbersMatch)} exact number matches`,
      tone: "good",
    },
    {
      id: "no_records",
      icon: Cancel,
      value: fmtCount(stats.noRecordsCount),
      label: "No Records risk",
      sub: "Number missing from facial data",
      tone: "bad",
    },
    {
      id: "users",
      icon: People,
      value: fmtCount(stats.usersCount),
      label: "Users List",
      sub: "HRIS employee numbers",
      tone: "accent",
    },
    {
      id: "facial",
      icon: Badge,
      value: fmtCount(stats.facialCount),
      label: "AttendanceRecordInfo",
      sub: "Raw facial PersonID",
      tone: "accent",
    },
  ];
  const issueCards = [
    {
      id: "number_match",
      value: stats.bothNumbersMatch,
      label: "Both numbers match",
      icon: CheckCircle,
      tone: "good",
    },
    {
      id: "name_diff",
      value: stats.bothNumbersMatchNamesDiffer,
      label: "Same number, different name",
      icon: WarningAmber,
      tone: "warn",
    },
    {
      id: "name_number_diff",
      value: stats.namesMatchNumbersDiffer,
      label: "Same name, different number",
      icon: SwapHoriz,
      tone: "bad",
    },
    {
      id: "near_number",
      value: stats.nearNumber,
      label: "Leading zeros or spaces",
      icon: Pin,
      tone: "warn",
    },
    {
      id: "users_only",
      value: stats.usersOnly,
      label: "Users List only",
      icon: PersonOff,
      tone: "bad",
    },
    {
      id: "facial_only",
      value: stats.facialOnly,
      label: "Facial only",
      icon: PersonOff,
      tone: "bad",
    },
    {
      id: "possible",
      value: stats.possibleIdMismatch,
      label: "Possible ID mismatch",
      icon: WarningAmber,
      tone: "accent",
    },
    {
      id: "blank_name",
      value: stats.blankName,
      label: "Name missing",
      icon: WarningAmber,
      tone: "muted",
    },
  ];

  const exportCsv = () => {
    const header = [
      "Users List employee number",
      "Users List name",
      "AttendanceRecordInfo employee number",
      "AttendanceRecordInfo name",
      "Last seen",
      "Issue",
    ];
    const lines = filteredRows.map((row) =>
      [
        row.usersEmployeeNumber,
        row.usersName,
        row.attendanceEmployeeNumber,
        row.attendanceName,
        formatLastSeen(row.lastSeen),
        ISSUE_LABELS[row.issue] || row.issue,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "facial-employee-number-compare.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectFilter = (id) => {
    setFilter(id);
    setPage(1);
  };

  if (!active) return null;

  const toneColor = {
    good: "#2e7d32",
    bad: "#c62828",
    warn: "#e65100",
    accent: T.accent,
    muted: T.muted,
  };

  return (
    <Box sx={{ px: 2.5, py: 2, bgcolor: "#faf7f7" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: T.text, fontSize: "0.92rem" }}>
            Employee number compare
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, mt: 0.25 }}>
            Users List number against raw AttendanceRecordInfo PersonID
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search either number or name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            sx={{
              width: { xs: "100%", sm: 280 },
              bgcolor: "#fff",
              "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.84rem" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: T.muted }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<Download sx={{ fontSize: 16 }} />}
            onClick={exportCsv}
            disabled={!filteredRows.length}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.78rem",
              color: T.accent,
              borderColor: T.border,
              bgcolor: "#fff",
              borderRadius: 2,
              height: 40,
            }}
          >
            Export
          </Button>
          <Tooltip title="Reload AttendanceRecordInfo">
            <span>
              <IconButton
                onClick={loadFacial}
                disabled={loading}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "#fff",
                  border: `1px solid ${T.border}`,
                  borderRadius: 2,
                  color: T.accent,
                }}
              >
                {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 1.25,
          mb: 1.25,
        }}
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const color = toneColor[card.tone];
          const selected = filter === card.id;
          return (
            <Box
              key={card.label}
              onClick={() => selectFilter(selected ? "all" : card.id)}
              sx={{
                px: 1.75,
                py: 1.4,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                cursor: "pointer",
                bgcolor: "#fff",
                borderRadius: 2,
                border: `1px solid ${selected ? T.accent : "rgba(0,0,0,0.08)"}`,
                boxShadow: selected ? `0 0 0 2px ${alpha(T.accent, 0.12)}` : "none",
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: alpha(color, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ fontSize: 18, color }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: T.text, lineHeight: 1 }}>
                  {loading && !ready ? "—" : card.value}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.muted, mt: 0.35 }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontSize: "0.64rem", color: T.faint, mt: 0.15 }} noWrap>
                  {card.sub}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 1,
          mb: 1.5,
        }}
      >
        {issueCards.map((card) => {
          const Icon = card.icon;
          const color = toneColor[card.tone];
          const selected = filter === card.id;
          return (
            <Box
              key={card.id}
              onClick={() => selectFilter(selected ? "all" : card.id)}
              sx={{
                px: 1.25,
                py: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                bgcolor: selected ? alpha(color, 0.08) : "#fff",
                borderRadius: 1.5,
                border: `1px solid ${selected ? color : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <Icon sx={{ fontSize: 16, color, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.muted }} noWrap>
                  {card.label}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color }}>
                {loading && !ready ? "—" : fmtCount(card.value)}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          bgcolor: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.muted }}>
            {fmtCount(filteredRows.length)} shown
            {filter !== "all" ? " · click a stat again to clear" : ""}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 32, color: T.accent }}>
              ‹
            </Button>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.muted, minWidth: 48, textAlign: "center" }}>
              {page} / {totalPages}
            </Typography>
            <Button size="small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 32, color: T.accent }}>
              ›
            </Button>
          </Box>
        </Box>
        <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 520px)", minHeight: 280 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 920 }}>
            <TableHead>
              <TableRow>
                <TableCell colSpan={2} sx={groupHeadSx}>
                  Users List
                </TableCell>
                <TableCell colSpan={2} sx={groupHeadSx}>
                  AttendanceRecordInfo
                </TableCell>
                <TableCell sx={groupHeadSx}> </TableCell>
                <TableCell sx={groupHeadSx}> </TableCell>
              </TableRow>
              <TableRow>
                {["Emp. No.", "Name", "Emp. No.", "Name", "Last seen", "Issue"].map((heading, index) => (
                  <TableCell key={`${heading}-${index}`} sx={{ ...colHeadSx, top: 32 }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} sx={{ color: T.accent }} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: T.muted, border: "none" }}>
                    No rows for this filter
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                pageRows.map((row, idx) => {
                  const tone = ISSUE_TONE[row.issue] || ISSUE_TONE.blank_name;
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ bgcolor: idx % 2 === 0 ? "#fff" : "rgba(109,35,35,0.025)" }}
                    >
                      <TableCell>
                        <NumberCell
                          value={row.usersEmployeeNumber}
                          matched={row.numbersExact}
                          compared={Boolean(row.attendanceEmployeeNumber)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.text, maxWidth: 220 }}>
                        {row.usersName || "—"}
                      </TableCell>
                      <TableCell>
                        <NumberCell
                          value={row.attendanceEmployeeNumber}
                          matched={row.numbersExact}
                          compared={Boolean(row.usersEmployeeNumber)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", color: T.text, maxWidth: 220 }}>
                        {row.attendanceName || "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.74rem", color: T.muted, whiteSpace: "nowrap" }}>
                        {formatLastSeen(row.lastSeen) || "—"}
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-flex",
                            px: 1,
                            py: 0.3,
                            borderRadius: 10,
                            bgcolor: tone.bg,
                            color: tone.color,
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ISSUE_LABELS[row.issue] || row.issue}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}

const groupHeadSx = {
  bgcolor: "#6d2323",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.68rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  py: 0.8,
  borderBottom: "none",
};

const colHeadSx = {
  bgcolor: "#f7f1f1",
  color: "#6d2323",
  fontWeight: 800,
  fontSize: "0.7rem",
  py: 1,
  borderBottom: "1px solid rgba(109,35,35,0.12)",
};
