import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Grid,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@mui/material";
import { ArrowBack, Print, Refresh, TrendingUp, TrendingDown } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import AttendanceCalendar from "./AttendanceCalendar";

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

const cardSx = {
  p: 2,
  borderRadius: 2,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
};

/* ─── helpers ─────────────────────────────────────────────────────── */

const formatDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Convert "M/D/YYYY" (AttendanceUserState Date field) → "YYYY-MM-DD"
 */
const punchDateToISO = (rawDate) => {
  const parts = String(rawDate || "").split("/");
  if (parts.length !== 3) return "";
  const [month, day, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

/**
 * Convert "YYYY-MM-DD" → Date at midnight local time (avoids off-by-one from UTC).
 */
const isoToLocal = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/* ─── component ───────────────────────────────────────────────────── */

const MyAttendance = () => {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [error, setError] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Punch records from /attendance/api/attendance.
   * Same endpoint + same filtering as AttendanceUserState.
   * Each record: { PersonID, Date: "M/D/YYYY", Time: "HH:MM:SS", AttendanceState: 1|2|3|4 }
   *   1 = Time IN, 2 = Breaktime OUT, 3 = Breaktime IN, 4 = Time OUT
   */
  const [punchRecords, setPunchRecords] = useState([]);

  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    late: 0,
    total: 0, // weekdays that have any punch
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

  /* ── fetch punches for current month ── */
  const fetchPunchData = async (emp) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDate = formatDate(startOfMonth);
    const endDate = formatDate(endOfMonth);

    const headers = getAuthHeaders().headers;

    // Widen ±1 day, filter client-side (same as AttendanceUserState)
    const adjStart = new Date(startOfMonth);
    adjStart.setDate(adjStart.getDate() - 1);
    const adjEnd = new Date(endOfMonth);
    adjEnd.setDate(adjEnd.getDate() + 1);

    const resp = await axios.post(
      `${API_BASE_URL}/attendance/api/attendance`,
      {
        personID: emp,
        startDate: adjStart.toISOString().substring(0, 10),
        endDate: adjEnd.toISOString().substring(0, 10),
      },
      { headers }
    );

    const allPunches = Array.isArray(resp.data) ? resp.data : [];

    // Client-side filter exactly like AttendanceUserState
    const filtered = allPunches.filter((record) => {
      const iso = punchDateToISO(record.Date);
      return iso >= startDate && iso <= endDate;
    });

    return { filtered, startDate, endDate };
  };

  /* ── derive stats from punch records ── */
  const calcStats = (punches) => {
    // Group by ISO date
    const byDate = new Map();
    for (const p of punches) {
      const iso = punchDateToISO(p.Date);
      if (!iso) continue;
      if (!byDate.has(iso)) byDate.set(iso, []);
      byDate.get(iso).push(p);
    }

    let present = 0;
    let late = 0;

    for (const [iso, dayPunches] of byDate) {
      const d = isoToLocal(iso);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends

      const timeInPunch = dayPunches.find((p) => p.AttendanceState === 1);
      if (!timeInPunch) continue; // no Time IN on this day

      // Simple late check: Time IN after 08:00
      const [hh, mm] = String(timeInPunch.Time || "").split(":").map(Number);
      const isLate = !Number.isNaN(hh) && (hh > 8 || (hh === 8 && mm > 0));

      if (isLate) {
        late++;
      } else {
        present++;
      }
    }

    return { present, late, total: present + late };
  };

  /* ── initial load ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = getAuthHeaders().headers;

        // 1. Employee profile
        const profileUrl = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/profile`
          : `${API_BASE_URL}/api/profile`;
        const profileResp = await axios.get(profileUrl, { headers });
        const emp = profileResp.data?.employeeNumber || "";
        const name =
          `${profileResp.data?.firstName || ""} ${profileResp.data?.lastName || ""}`.trim();
        setEmployeeNumber(emp);
        setFullName(name);

        // 2. Holidays (full year)
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        const holidayUrl = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/holiday?startDate=${formatDate(startOfYear)}&endDate=${formatDate(endOfYear)}`
          : `${API_BASE_URL}/api/holiday?startDate=${formatDate(startOfYear)}&endDate=${formatDate(endOfYear)}`;
        const holidayResp = await axios.get(holidayUrl, { headers });
        const holidays = Array.isArray(holidayResp.data?.byDate)
          ? Object.values(holidayResp.data.byDate).map((h, idx) => ({
              ...h,
              id: `holiday-${idx}`,
              status: "active",
            }))
          : holidayResp.data || [];
        setRawHolidays(Array.isArray(holidays) ? holidays : []);

        // 3. Punch records — same source as AttendanceUserState
        if (emp) {
          const { filtered } = await fetchPunchData(emp);
          setPunchRecords(filtered);
          setAttendanceStats(calcStats(filtered));
        }
      } catch (err) {
        console.error("Error fetching attendance data:", err);
        setError("Failed to load attendance data. Please try again.");
        setRawHolidays([]);
        setPunchRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── refresh ── */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const headers = getAuthHeaders().headers;
      const profileUrl = API_BASE_URL.includes("/api")
        ? `${API_BASE_URL}/profile`
        : `${API_BASE_URL}/api/profile`;
      const profileResp = await axios.get(profileUrl, { headers });
      const emp = profileResp.data?.employeeNumber || "";

      if (emp) {
        const { filtered } = await fetchPunchData(emp);
        setPunchRecords(filtered);
        setAttendanceStats(calcStats(filtered));
      }
    } catch (err) {
      console.error("Error refreshing attendance:", err);
    } finally {
      setRefreshing(false);
    }
  };

  /* ── derive recent records table from punch data ── */
  const recentDayRecords = React.useMemo(() => {
    // Collapse punches → one row per date (latest 10 weekdays)
    const byDate = new Map();
    for (const p of punchRecords) {
      const iso = punchDateToISO(p.Date);
      if (!iso) continue;
      if (!byDate.has(iso)) byDate.set(iso, { iso, punches: [] });
      byDate.get(iso).punches.push(p);
    }

    return Array.from(byDate.values())
      .sort((a, b) => (a.iso > b.iso ? -1 : 1)) // newest first
      .slice(0, 10);
  }, [punchRecords]);

  /* ── loading ── */
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={60} sx={{ color: T.accent }} />
        <Typography sx={{ color: T.muted }}>Loading your attendance…</Typography>
      </Box>
    );
  }

  /* ── render ── */
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: "1400px", mx: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
          pb: 2,
          borderBottom: `2px solid ${T.accentBorder}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ color: T.accent, textTransform: "none", "&:hover": { bgcolor: T.accentFaint } }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: T.text }}>
              My Attendance
            </Typography>
            <Typography sx={{ color: T.muted, fontSize: "0.9rem" }}>
              {fullName} ({employeeNumber})
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outlined"
            sx={{ color: T.accent, borderColor: T.accentBorder, "&:hover": { bgcolor: T.accentFaint } }}
          >
            Refresh
          </Button>
          <Button
            startIcon={<Print />}
            onClick={() => setPrintDialogOpen(true)}
            variant="contained"
            sx={{ bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark } }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stats — only Present / Late / Total punched days (no phantom Absent) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={cardSx}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontWeight: 600 }}>
                  Present
                </Typography>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#166534" }}>
                  {attendanceStats.present}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "#dcfce7", borderRadius: 1.5 }}>
                <TrendingUp sx={{ fontSize: 24, color: "#166534" }} />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={cardSx}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontWeight: 600 }}>
                  Late
                </Typography>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#92400e" }}>
                  {attendanceStats.late}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "#fef3c7", borderRadius: 1.5 }}>
                <TrendingDown sx={{ fontSize: 24, color: "#92400e" }} />
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={cardSx}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontWeight: 600 }}>
                  Days with Punches
                </Typography>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: T.accent }}>
                  {attendanceStats.total}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: T.accentFaint,
                  borderRadius: 1.5,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                <TrendingUp sx={{ fontSize: 24, color: T.accent }} />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Calendar + recent records */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
              border: "0.5px solid rgba(0,0,0,0.09)",
              overflow: "hidden",
            }}
          >
            <AttendanceCalendar employeeNumber={employeeNumber} holidays={rawHolidays} />
          </Card>
        </Grid>

        {/* Recent records — derived from real punch data */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
              border: "0.5px solid rgba(0,0,0,0.09)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: `1px solid ${T.divider}`,
                bgcolor: T.accentFaint,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.accent }}>
                Recent Attendance Records
              </Typography>
              <Button
                size="small"
                onClick={() => navigate("/attendance-user-state")}
                sx={{ textTransform: "none", fontSize: "0.8rem", color: T.accent }}
              >
                View All →
              </Button>
            </Box>

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: T.accent }}>
                    {["Date", "Time In", "Breaktime Out", "Breaktime In", "Time Out", "Status"].map(
                      (h) => (
                        <TableCell
                          key={h}
                          sx={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}
                        >
                          {h}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDayRecords.length > 0 ? (
                    recentDayRecords.map(({ iso, punches }, idx) => {
                      const d = isoToLocal(iso);
                      const dow = d.getDay();
                      const isWeekend = dow === 0 || dow === 6;

                      const timeIn = punches.find((p) => p.AttendanceState === 1)?.Time || "—";
                      const breaktimeOut = punches.find((p) => p.AttendanceState === 2)?.Time || "—";
                      const breaktimeIn = punches.find((p) => p.AttendanceState === 3)?.Time || "—";
                      const timeOut = punches.find((p) => p.AttendanceState === 4)?.Time || "—";

                      // Determine status chip
                      let statusChip = { label: "—", color: "#999", bg: "#f5f5f5" };
                      if (isWeekend) {
                        statusChip = {
                          label: dow === 0 ? "Sunday" : "Saturday",
                          color: "#666",
                          bg: "#f0f0f0",
                        };
                      } else if (timeIn !== "—") {
                        const [hh, mm] = timeIn.split(":").map(Number);
                        const isLate = !Number.isNaN(hh) && (hh > 8 || (hh === 8 && mm > 0));
                        statusChip = isLate
                          ? { label: "Late", color: "#92400e", bg: "#fef3c7" }
                          : { label: "Present", color: "#166534", bg: "#dcfce7" };
                      }

                      return (
                        <TableRow
                          key={iso}
                          sx={{
                            bgcolor: idx % 2 === 0 ? T.rowOdd : "transparent",
                            "&:hover": { bgcolor: T.rowHover },
                          }}
                        >
                          <TableCell sx={{ fontSize: "0.8rem", py: 1.5 }}>
                            {d.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem", py: 1.5, fontWeight: 600 }}>
                            {timeIn}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem", py: 1.5, fontWeight: 600 }}>
                            {breaktimeOut}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem", py: 1.5, fontWeight: 600 }}>
                            {breaktimeIn}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem", py: 1.5, fontWeight: 600 }}>
                            {timeOut}
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip
                              label={statusChip.label}
                              size="small"
                              sx={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                bgcolor: statusChip.bg,
                                color: statusChip.color,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{ textAlign: "center", py: 3, color: T.muted }}
                      >
                        No attendance records found for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>

        {/* Legend */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, ...cardSx }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: T.accent, mb: 2 }}>
              Attendance Legend
            </Typography>
            <Grid container spacing={2}>
              {[
                { code: "P", bg: "#dcfce7", border: "#22c55e", fg: "#166534", label: "Present", desc: "Logged in on time" },
                { code: "L", bg: "#fef3c7", border: "#f59e0b", fg: "#92400e", label: "Late", desc: "Time IN after 08:00" },
                { code: "H", bg: "#fde8d8", border: "#ea580c", fg: "#9a3412", label: "Holiday", desc: "" },
                { code: "SL", bg: "#fef9c3", border: "#eab308", fg: "#854d0e", label: "Sick Leave", desc: "" },
                { code: "VL", bg: "#dbeafe", border: "#3b82f6", fg: "#1e3a8a", label: "Vacation Leave", desc: "" },
                { code: "SA", bg: "#f3f4f6", border: "#d1d5db", fg: "#374151", label: "Saturday", desc: "" },
                { code: "SU", bg: "#f3f4f6", border: "#d1d5db", fg: "#374151", label: "Sunday", desc: "" },
              ].map(({ code, bg, border, fg, label, desc }) => (
                <Grid item xs={12} sm={6} md={3} key={code}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: bg,
                        border: `1px solid ${border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: fg }}>
                        {code}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.9rem", color: T.text }}>
                      <strong>{label}</strong>
                      {desc ? ` — ${desc}` : ""}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Typography sx={{ mt: 2, fontSize: "0.75rem", color: T.faint }}>
              Blank calendar cells mean no biometric punch was recorded for that day — they are not
              counted as absent. Absent tracking requires schedule data available in the HR module.
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Print dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Print Attendance</DialogTitle>
        <DialogContent>
          <Typography>
            This will print your attendance calendar. Make sure your printer is connected and ready.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => { window.print(); setPrintDialogOpen(false); }}
            variant="contained"
            sx={{ bgcolor: T.accent, "&:hover": { bgcolor: T.accentDark } }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyAttendance;