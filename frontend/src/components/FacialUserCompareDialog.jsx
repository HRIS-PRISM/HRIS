import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Download from "@mui/icons-material/Download";
import Refresh from "@mui/icons-material/Refresh";
import Search from "@mui/icons-material/Search";
import Close from "@mui/icons-material/Close";
import ChevronRight from "@mui/icons-material/ChevronRight";

const T = {
  accent: "#6d2323",
  accentSoft: "rgba(109,35,35,0.08)",
  border: "#e8e8e8",
  borderStrong: "#d6d6d6",
  text: "#1c1c1c",
  secondary: "#5c5c5c",
  muted: "#8a8a8a",
  surface: "#ffffff",
  canvas: "#f7f7f7",
  head: "#fafafa",
  rowHover: "#f5f5f5",
  ok: "#1b7a3d",
  warn: "#9a5b00",
  bad: "#b42318",
};

const ISSUE_STYLE = {
  matched: { color: T.ok },
  number_match_name_diff: { color: T.warn },
  blank_name: { color: T.muted },
  name_match_number_diff: { color: T.bad },
  near_number: { color: T.warn },
  possible_id_mismatch: { color: T.accent },
  users_only: { color: T.bad },
  facial_only: { color: T.bad },
};

const ISSUE_DETAILS = {
  matched:
    "Users List Emp. No. and AttendanceRecordInfo Emp. No. are the same, and the names match.",
  number_match_name_diff:
    "Users List Emp. No. and AttendanceRecordInfo Emp. No. are the same, but the names do not match. Check which name is correct.",
  blank_name:
    "Users List Emp. No. and AttendanceRecordInfo Emp. No. are the same, but a name is missing on one or both sides.",
  name_match_number_diff:
    "The names match, but Users List Emp. No. and AttendanceRecordInfo Emp. No. are different. One Emp. No. may be wrong.",
  near_number:
    "Emp. No. values are nearly the same after removing leading zeros or spaces. Confirm the correct Emp. No. format.",
  possible_id_mismatch:
    "Names are similar enough to suggest the same person, but Emp. No. values do not match. Review manually.",
  users_only:
    "This Emp. No. exists in Users List but was not found in AttendanceRecordInfo.",
  facial_only:
    "This Emp. No. exists in AttendanceRecordInfo but was not found in Users List.",
};

/** Sidebar filters — labels match status wording exactly. */
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "number_match", label: ISSUE_LABELS.matched, countKey: "bothNumbersMatch" },
  {
    id: "no_records",
    label: "Emp. No. missing on device",
    countKey: "noRecordsCount",
  },
  {
    id: "name_diff",
    label: ISSUE_LABELS.number_match_name_diff,
    countKey: "bothNumbersMatchNamesDiffer",
  },
  {
    id: "name_number_diff",
    label: ISSUE_LABELS.name_match_number_diff,
    countKey: "namesMatchNumbersDiffer",
  },
  {
    id: "near_number",
    label: ISSUE_LABELS.near_number,
    countKey: "nearNumber",
  },
  {
    id: "possible",
    label: ISSUE_LABELS.possible_id_mismatch,
    countKey: "possibleIdMismatch",
  },
  {
    id: "blank_name",
    label: ISSUE_LABELS.blank_name,
    countKey: "blankName",
  },
  {
    id: "users_only",
    label: ISSUE_LABELS.users_only,
    countKey: "usersOnly",
  },
  {
    id: "facial_only",
    label: ISSUE_LABELS.facial_only,
    countKey: "facialOnly",
  },
];

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const facialClientCache = {
  data: null,
  fetchedAt: 0,
  promise: null,
};

/** Warm the facial PersonID cache while Users List is open. */
export function prefetchFacialUsers() {
  return loadFacialRows(false);
}

async function loadFacialRows(force = false) {
  const now = Date.now();
  if (
    !force &&
    facialClientCache.data &&
    now - facialClientCache.fetchedAt < CLIENT_CACHE_TTL_MS
  ) {
    return facialClientCache.data;
  }
  if (!force && facialClientCache.promise) {
    return facialClientCache.promise;
  }

  const request = axios
    .get(
      `${API_BASE_URL}/attendance/api/all-device-users?mode=compare`,
      getAuthHeaders(),
    )
    .then((res) => {
      const rows = Array.isArray(res.data) ? res.data : [];
      facialClientCache.data = rows;
      facialClientCache.fetchedAt = Date.now();
      facialClientCache.promise = null;
      return rows;
    })
    .catch((err) => {
      facialClientCache.promise = null;
      throw err;
    });

  facialClientCache.promise = request;
  return request;
}

function fmt(value) {
  return Number(value || 0).toLocaleString();
}

function formatLastSeen(value) {
  if (value == null || value === "") return "—";
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return String(value);
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function EmpNo({ value, aligned }) {
  if (!value) {
    return (
      <Typography sx={{ fontSize: 13, color: T.muted }}>—</Typography>
    );
  }
  const mismatch = aligned === false;
  const match = aligned === true;
  return (
    <Typography
      sx={{
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        color: mismatch ? T.bad : match ? T.ok : T.text,
        letterSpacing: "-0.01em",
      }}
    >
      {value}
    </Typography>
  );
}

function StatusDot({ issue, onClick }) {
  const tone = ISSUE_STYLE[issue] || ISSUE_STYLE.blank_name;
  const label = ISSUE_LABELS[issue] || issue;
  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick?.();
        }
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        maxWidth: "100%",
        cursor: "pointer",
        px: 0.75,
        py: 0.4,
        borderRadius: 1,
        border: `1px solid transparent`,
        transition: "background-color 0.12s, border-color 0.12s",
        "&:hover": {
          bgcolor: "rgba(109,35,35,0.06)",
          borderColor: T.borderStrong,
        },
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: tone.color,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 500,
          color: T.secondary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </Typography>
      <ChevronRight sx={{ fontSize: 14, color: T.muted, flexShrink: 0 }} />
    </Box>
  );
}

function DetailField({ label, value, mono, color }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 600,
          color: T.muted,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          fontWeight: 600,
          color: color || (value ? T.text : T.muted),
          fontFamily: mono
            ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
            : "inherit",
          fontVariantNumeric: mono ? "tabular-nums" : "normal",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

function StatusDetailsDialog({ row, open, onClose }) {
  if (!row) return null;
  const statusLabel = ISSUE_LABELS[row.issue] || row.issue;
  const detailText = ISSUE_DETAILS[row.issue] || "";
  const bothPresent =
    Boolean(row.usersEmployeeNumber) && Boolean(row.attendanceEmployeeNumber);
  const numbersAligned = bothPresent ? row.numbersExact : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: "#ffffff",
          backgroundImage: "none",
          border: `1px solid ${T.border}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          bgcolor: T.accent,
          color: "#ffffff",
          borderBottom: "none",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            Status details
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              mt: 0.75,
              px: 1,
              py: 0.4,
              borderRadius: 1,
              bgcolor: "rgba(255,255,255,0.16)",
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: "#ffffff",
              }}
            />
            <Typography
              sx={{ fontSize: 12.5, fontWeight: 600, color: "#ffffff" }}
            >
              {statusLabel}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: "rgba(255,255,255,0.85)",
            mt: -0.25,
            "&:hover": { bgcolor: "rgba(255,255,255,0.12)", color: "#fff" },
          }}
          aria-label="Close"
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2.5, bgcolor: "#ffffff" }}>
        <Typography sx={{ fontSize: 13, color: T.secondary, lineHeight: 1.55, mb: 2.25 }}>
          {detailText}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              p: 1.75,
              borderRadius: 1.5,
              border: `1px solid rgba(109,35,35,0.2)`,
              bgcolor: "rgba(109,35,35,0.04)",
            }}
          >
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                color: T.accent,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                mb: 1.25,
              }}
            >
              Users List
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <DetailField
                label="Emp. No."
                value={row.usersEmployeeNumber}
                mono
                color={
                  numbersAligned === true
                    ? T.ok
                    : numbersAligned === false
                      ? T.bad
                      : undefined
                }
              />
              <DetailField label="Name" value={row.usersName} />
            </Box>
          </Box>

          <Box
            sx={{
              p: 1.75,
              borderRadius: 1.5,
              border: "1px solid rgba(21, 101, 192, 0.25)",
              bgcolor: "rgba(21, 101, 192, 0.04)",
            }}
          >
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#1565c0",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                mb: 1.25,
              }}
            >
              AttendanceRecordInfo
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <DetailField
                label="Emp. No."
                value={row.attendanceEmployeeNumber}
                mono
                color={
                  numbersAligned === true
                    ? T.ok
                    : numbersAligned === false
                      ? T.bad
                      : undefined
                }
              />
              <DetailField label="Name" value={row.attendanceName} />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 1.75,
            borderRadius: 1.5,
            border: `1px solid ${T.border}`,
            bgcolor: T.head,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.25,
          }}
        >
          <DetailField label="Last seen" value={formatLastSeen(row.lastSeen)} />
          <DetailField
            label="Emp. No. comparison"
            value={
              !bothPresent
                ? "Only one side has Emp. No."
                : numbersAligned
                  ? "Emp. No. values match"
                  : "Emp. No. values differ"
            }
            color={
              !bothPresent ? T.muted : numbersAligned ? T.ok : T.bad
            }
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          disableElevation
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13,
            bgcolor: T.accent,
            borderRadius: 1,
            px: 2,
            "&:hover": { bgcolor: "#5a1d1d" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Metric({ label, value, emphasize }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 500,
          color: T.muted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 600,
          color: emphasize || T.text,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function FacialUserComparePanel({
  active = true,
  users,
  onStats,
  prefetch = true,
}) {
  const [facialRows, setFacialRows] = useState(
    () => facialClientCache.data || [],
  );
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [ready, setReady] = useState(() => Boolean(facialClientCache.data));
  const [compared, setCompared] = useState(() => compareFacialUsers([], []));
  const [detailRow, setDetailRow] = useState(null);

  const runLoad = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const rows = await loadFacialRows(force);
      setFacialRows(rows);
    } catch (err) {
      if (!facialClientCache.data) setFacialRows([]);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to load facial device users",
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!prefetch && !active) return;
    if (facialClientCache.data) {
      setFacialRows(facialClientCache.data);
      setReady(true);
      if (Date.now() - facialClientCache.fetchedAt >= CLIENT_CACHE_TTL_MS) {
        runLoad(false);
      }
      return;
    }
    runLoad(false);
  }, [active, prefetch, runLoad]);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    setComparing(true);
    const timer = setTimeout(() => {
      startTransition(() => {
        if (cancelled) return;
        setCompared(compareFacialUsers(users, facialRows));
        setComparing(false);
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, users, facialRows]);

  useEffect(() => {
    if (!ready) return;
    onStats?.(compared.stats);
  }, [ready, compared.stats, onStats]);

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

  const pageRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filteredRows.length / rowsPerPage) - 1,
    );
    if (page > maxPage) setPage(maxPage);
  }, [filteredRows.length, rowsPerPage, page]);

  const stats = compared.stats;

  const tabCounts = useMemo(() => {
    const total = compared.rows.length;
    return {
      all: total,
      bothNumbersMatch: stats.bothNumbersMatch,
      noRecordsCount: stats.noRecordsCount,
      bothNumbersMatchNamesDiffer: stats.bothNumbersMatchNamesDiffer,
      namesMatchNumbersDiffer: stats.namesMatchNumbersDiffer,
      nearNumber: stats.nearNumber,
      possibleIdMismatch: stats.possibleIdMismatch,
      blankName: stats.blankName,
      usersOnly: stats.usersOnly,
      facialOnly: stats.facialOnly,
    };
  }, [compared.rows.length, stats]);

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

  if (!active) return null;

  const busy = loading && !ready;

  return (
    <Box
      sx={{
        bgcolor: T.canvas,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: { md: "100%" },
        overflow: "hidden",
      }}
    >
      {(loading || comparing) && ready && (
        <LinearProgress
          sx={{
            height: 1.5,
            flexShrink: 0,
            bgcolor: "transparent",
            "& .MuiLinearProgress-bar": { bgcolor: T.accent },
          }}
        />
      )}

      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: T.surface,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 600,
              color: T.text,
              letterSpacing: "-0.01em",
            }}
          >
            Facial / System Comparison
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: T.muted, mt: 0.35 }}>
            Reconcile Users List Emp. No. with AttendanceRecordInfo Emp. No.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search number or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              width: { xs: "100%", sm: 220 },
              "& .MuiOutlinedInput-root": {
                height: 34,
                fontSize: 13,
                borderRadius: 1,
                bgcolor: T.canvas,
                "& fieldset": { borderColor: T.border },
                "&:hover fieldset": { borderColor: T.borderStrong },
                "&.Mui-focused fieldset": {
                  borderColor: T.accent,
                  borderWidth: 1,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: T.muted }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download sx={{ fontSize: "15px !important" }} />}
            onClick={exportCsv}
            disabled={!filteredRows.length}
            sx={btnOutlined}
          >
            Export
          </Button>
          <Tooltip title="Refresh device data" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => runLoad(true)}
                disabled={loading}
                sx={{
                  width: 34,
                  height: 34,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: 1,
                  color: T.secondary,
                  "&:hover": { bgcolor: T.canvas, borderColor: T.muted },
                }}
              >
                {loading ? (
                  <CircularProgress size={14} sx={{ color: T.accent }} />
                ) : (
                  <Refresh sx={{ fontSize: 17 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Body: left sidebar + main */}
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Left filter sidebar */}
        <Box
          component="nav"
          aria-label="Compare filters"
          sx={{
            width: { xs: "100%", md: 260 },
            flexShrink: 0,
            bgcolor: T.surface,
            borderRight: { md: `1px solid ${T.border}` },
            borderBottom: { xs: `1px solid ${T.border}`, md: "none" },
            display: "flex",
            flexDirection: "column",
            py: 1.5,
            px: 1.25,
            gap: 0.25,
            maxHeight: { xs: 220, md: "none" },
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <Typography
            sx={{
              px: 1.25,
              pb: 1,
              pt: 0.25,
              fontSize: 10.5,
              fontWeight: 600,
              color: T.muted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Filters
          </Typography>

          {FILTER_TABS.map((tab) => {
            const selected = filter === tab.id;
            const count = busy
              ? null
              : tab.id === "all"
                ? tabCounts.all
                : tabCounts[tab.countKey];
            return (
              <Box
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                role="button"
                aria-pressed={selected}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.25,
                  py: 0.85,
                  borderRadius: 1,
                  cursor: "pointer",
                  bgcolor: selected ? T.accentSoft : "transparent",
                  color: selected ? T.accent : T.secondary,
                  borderLeft: selected
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                  transition: "background-color 0.12s, color 0.12s",
                  "&:hover": {
                    bgcolor: selected ? T.accentSoft : T.canvas,
                    color: selected ? T.accent : T.text,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5,
                    fontWeight: selected ? 600 : 500,
                    color: "inherit",
                    lineHeight: 1.3,
                  }}
                >
                  {tab.label}
                </Typography>
                {count != null && (
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: selected ? T.accent : T.muted,
                      bgcolor: selected ? "rgba(109,35,35,0.06)" : T.canvas,
                      px: 0.75,
                      py: 0.15,
                      borderRadius: 0.75,
                      minWidth: 28,
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                  >
                    {fmt(count)}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            px: { xs: 2, md: 2.5 },
            pt: 2,
            pb: 1.5,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 1.5,
                flexShrink: 0,
                borderRadius: 1,
                border: `1px solid ${T.border}`,
                bgcolor: "#fff",
                "& .MuiAlert-message": { fontSize: 13 },
              }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => runLoad(true)}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Metrics */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "repeat(4, 1fr)",
              },
              gap: { xs: 2, sm: 0 },
              bgcolor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 1.5,
              px: { xs: 2, sm: 0 },
              py: 1.5,
              mb: 1.5,
              flexShrink: 0,
            }}
          >
            {[
              {
                label: "Match rate",
                value: busy ? "—" : `${stats.matchRate}%`,
                emphasize: stats.matchRate >= 90 ? T.ok : T.text,
              },
              {
                label: "Exact matches",
                value: busy ? "—" : fmt(stats.bothNumbersMatch),
              },
              {
                label: "Missing on device",
                value: busy ? "—" : fmt(stats.noRecordsCount),
                emphasize: stats.noRecordsCount > 0 ? T.bad : T.text,
              },
              {
                label: "Sources",
                value: busy
                  ? "—"
                  : `${fmt(stats.usersCount)} / ${fmt(stats.facialCount)}`,
              },
            ].map((m, i) => (
              <Box
                key={m.label}
                sx={{
                  px: { sm: 3 },
                  borderLeft: {
                    sm: i === 0 ? "none" : `1px solid ${T.border}`,
                  },
                }}
              >
                <Metric
                  label={m.label}
                  value={m.value}
                  emphasize={m.emphasize}
                />
                {m.label === "Sources" && (
                  <Typography sx={{ fontSize: 11, color: T.muted, mt: 0.4 }}>
                    Users List / Device
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          {/* Table + pagination — same pattern as Users List Accounts tab */}
          <Box
            sx={{
              bgcolor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 1.5,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.15,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                borderBottom: `1px solid ${T.border}`,
                bgcolor: T.head,
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
                  Side-by-side comparison
                </Typography>
                <Typography sx={{ fontSize: 12, color: T.muted }}>
                  {busy
                    ? "Loading…"
                    : `${fmt(filteredRows.length)} result${filteredRows.length === 1 ? "" : "s"}`}
                  {comparing ? " · Updating" : ""}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: 0.4,
                      bgcolor: "rgba(109,35,35,0.2)",
                      border: `1px solid ${T.accent}`,
                    }}
                  />
                  <Typography sx={{ fontSize: 11.5, color: T.muted }}>
                    Users List
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: 0.4,
                      bgcolor: "rgba(21, 101, 192, 0.18)",
                      border: "1px solid #1565c0",
                    }}
                  />
                  <Typography sx={{ fontSize: 11.5, color: T.muted }}>
                    AttendanceRecordInfo
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                // Internal scroll only — pagination stays pinned below (Accounts pattern)
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  minWidth: 920,
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  "& .MuiTableCell-root": {
                    borderRight: `1px solid ${T.border}`,
                  },
                  "& .MuiTableCell-root:last-of-type": {
                    borderRight: "none",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ ...groupHris, top: 0, zIndex: 4 }}>
                      Users List
                    </TableCell>
                    <TableCell colSpan={2} sx={{ ...groupDevice, top: 0, zIndex: 4 }}>
                      AttendanceRecordInfo
                    </TableCell>
                    <TableCell colSpan={2} sx={{ ...groupMeta, top: 0, zIndex: 4 }}>
                      Status
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ ...thHris, width: 120, top: 33, zIndex: 3 }}>
                      Emp. No.
                    </TableCell>
                    <TableCell sx={{ ...thHris, top: 33, zIndex: 3 }}>Name</TableCell>
                    <TableCell sx={{ ...thDevice, width: 120, top: 33, zIndex: 3 }}>
                      Emp. No.
                    </TableCell>
                    <TableCell sx={{ ...thDevice, top: 33, zIndex: 3 }}>Name</TableCell>
                    <TableCell sx={{ ...thMeta, width: 150, top: 33, zIndex: 3 }}>
                      Last seen
                    </TableCell>
                    <TableCell sx={{ ...thMeta, width: 220, top: 33, zIndex: 3 }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {busy && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}>
                        <CircularProgress
                          size={22}
                          thickness={4}
                          sx={{ color: T.accent, mb: 1.5 }}
                        />
                        <Typography sx={{ fontSize: 13, color: T.muted }}>
                          Loading device registry…
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {!busy && pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10, border: 0 }}>
                        <Typography sx={{ fontSize: 13, color: T.muted }}>
                          No records match the current filters
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {!busy &&
                    pageRows.map((row) => {
                      const bothPresent =
                        Boolean(row.usersEmployeeNumber) &&
                        Boolean(row.attendanceEmployeeNumber);
                      const numbersAligned = bothPresent
                        ? row.numbersExact
                        : undefined;
                      return (
                        <TableRow
                          key={row.id}
                          sx={{
                            "&:hover .cell-hris": {
                              bgcolor: "rgba(109,35,35,0.1)",
                            },
                            "&:hover .cell-device": {
                              bgcolor: "rgba(21, 101, 192, 0.08)",
                            },
                            "&:hover .cell-meta": {
                              bgcolor: T.rowHover,
                            },
                          }}
                        >
                          <TableCell className="cell-hris" sx={tdHris}>
                            <EmpNo
                              value={row.usersEmployeeNumber}
                              aligned={numbersAligned}
                            />
                          </TableCell>
                          <TableCell className="cell-hris" sx={tdHris}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: row.usersName ? T.text : T.muted,
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.usersName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell className="cell-device" sx={tdDevice}>
                            <EmpNo
                              value={row.attendanceEmployeeNumber}
                              aligned={numbersAligned}
                            />
                          </TableCell>
                          <TableCell className="cell-device" sx={tdDevice}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                color: row.attendanceName ? T.secondary : T.muted,
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.attendanceName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell className="cell-meta" sx={tdMeta}>
                            <Typography
                              sx={{
                                fontSize: 12.5,
                                color: T.muted,
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatLastSeen(row.lastSeen)}
                            </Typography>
                          </TableCell>
                          <TableCell className="cell-meta" sx={tdMeta}>
                            <Tooltip title="View full details" arrow>
                              <Box component="span">
                                <StatusDot
                                  issue={row.issue}
                                  onClick={() => setDetailRow(row)}
                                />
                              </Box>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>

            {!busy && filteredRows.length > 0 && (
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderTop: `1px solid ${T.border}`,
                  flexShrink: 0,
                }}
              >
                <TablePagination
                  component="div"
                  count={filteredRows.length}
                  page={page}
                  onPageChange={(_, next) => setPage(next)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
                  sx={{
                    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                      { fontSize: "0.78rem", fontWeight: 600 },
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <StatusDetailsDialog
        row={detailRow}
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
      />
    </Box>
  );
}

const groupHris = {
  bgcolor: T.accent,
  color: "#fff",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  py: 0.85,
  px: 2,
  borderBottom: "none",
  borderRight: "none !important",
  whiteSpace: "nowrap",
  position: "sticky",
};

const groupDevice = {
  bgcolor: "#1565c0",
  color: "#fff",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  py: 0.85,
  px: 2,
  borderBottom: "none",
  borderRight: "none !important",
  whiteSpace: "nowrap",
  position: "sticky",
  borderLeft: "2px solid #0d47a1",
};

const groupMeta = {
  bgcolor: "#5a5a5a",
  color: "#fff",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  py: 0.85,
  px: 2,
  borderBottom: "none",
  borderRight: "none !important",
  whiteSpace: "nowrap",
  position: "sticky",
  borderLeft: `1px solid ${T.border}`,
};

const thBase = {
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  py: 1,
  px: 2,
  borderBottom: `1px solid ${T.border}`,
  whiteSpace: "nowrap",
  position: "sticky",
};

const thHris = {
  ...thBase,
  bgcolor: "#f7ecec",
  color: T.accent,
};

const thDevice = {
  ...thBase,
  bgcolor: "#eaf2fb",
  color: "#1565c0",
  borderLeft: "2px solid rgba(21, 101, 192, 0.35)",
};

const thMeta = {
  ...thBase,
  bgcolor: "#f3f3f3",
  color: T.muted,
  borderLeft: `1px solid ${T.border}`,
};

const tdBase = {
  py: 1.15,
  px: 2,
  verticalAlign: "middle",
  borderBottom: `1px solid ${T.border}`,
};

const tdHris = {
  ...tdBase,
  bgcolor: "rgba(109,35,35,0.03)",
};

const tdDevice = {
  ...tdBase,
  bgcolor: "rgba(21, 101, 192, 0.04)",
  borderLeft: "2px solid rgba(21, 101, 192, 0.28)",
};

const tdMeta = {
  ...tdBase,
  borderLeft: `1px solid ${T.border}`,
  bgcolor: "#ffffff",
};

const btnOutlined = {
  textTransform: "none",
  fontWeight: 500,
  fontSize: 12.5,
  color: T.secondary,
  borderColor: T.borderStrong,
  borderRadius: 1,
  height: 34,
  px: 1.5,
  bgcolor: T.surface,
  "&:hover": {
    borderColor: T.muted,
    bgcolor: T.canvas,
  },
  "&.Mui-disabled": {
    borderColor: T.border,
  },
};
