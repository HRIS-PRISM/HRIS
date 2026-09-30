import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Tooltip,
  alpha,
  styled,
} from "@mui/material";
import {
  Close,
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  Check,
  Today,
  Clear,
  Info,
} from "@mui/icons-material";

// ─── Shared tokens (mirrors the LeaveRequestUser theme, `T`) ───────────────────
// Kept local so this component stays drop-in portable, but every value below is
// intentionally the same as the parent page's `T` object so the two feel like
// one surface. Callers can still override accent/primary via props.
const makeTheme = (accentColor, accentDark, primaryColor) => ({
  accent: accentColor,
  accentDark: accentDark,
  accentFaint: alpha(accentColor, 0.06),
  accentBorder: alpha(accentColor, 0.14),
  accentHover: alpha(accentColor, 0.1),
  headerGrad: `linear-gradient(180deg, ${accentColor} 0%, ${alpha(accentColor, 0.86)} 100%)`,
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
  primaryColor,
});

// ─── Styled primitives (same shapes/behavior as AccentButton in LeaveRequestUser) ─
const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.8rem",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

const NavigationButton = styled(IconButton)(({ accentcolor }) => ({
  width: 38,
  height: 38,
  borderRadius: 10,
  backgroundColor: alpha(accentcolor, 0.08),
  color: accentcolor,
  transition: "all 0.18s ease",
  "&:hover": {
    backgroundColor: alpha(accentcolor, 0.15),
    transform: "translateY(-1px)",
  },
}));

const DayButton = styled(Box)(({ selected, disabled, istoday, accentcolor }) => ({
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: disabled ? "not-allowed" : "pointer",
  borderRadius: selected ? 10 : "50%",
  fontWeight: 600,
  fontSize: "0.82rem",
  transition: "all 0.15s ease",
  position: "relative",
  color: disabled ? "#c9c9c9" : selected ? "#fff" : "#333",
  backgroundColor: selected ? accentcolor : "transparent",
  border: istoday === "true" && !selected ? `1.5px solid ${accentcolor}` : "1.5px solid transparent",
  opacity: disabled ? 0.5 : 1,
  "&:hover": disabled
    ? {}
    : {
        backgroundColor: selected ? accentcolor : alpha(accentcolor, 0.1),
      },
}));

const LeaveDatePicker = ({
  open,
  onClose,
  selectedDates,
  setSelectedDates,
  accentColor = "#6d2323",
  accentDark = "#5a1d1d",
  primaryColor = "#fdf5f5",
  secondaryColor = "#f0dede", // eslint-disable-line no-unused-vars
  allowPastDates = false,
  leaveType = "", // eslint-disable-line no-unused-vars
  leaveRequests = [],
  maxSelectableDates = null,
  adminOverride = false,
  // CSC MC 41 s.1998: leave counts working days only. With an employee number the picker
  // loads holidays and the employee's official-time schedule and disables other days.
  employeeNumber = null,
  // HR only: holidays stay selectable (special schedules); the server asks for a reason.
  allowNonWorkingDays = false,
  // Called with [{ date, reason }] for selected dates that have no official time schedule
  // (still selectable — the form shows a warning).
  onUnscheduledChange = null,
}) => {
  const T = makeTheme(accentColor, accentDark, primaryColor);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workCal, setWorkCal] = useState(null); // { workingWeekdays: string[] | null, holidays: Map }

  useEffect(() => {
    if (!open || !employeeNumber) {
      setWorkCal(null);
      return undefined;
    }
    let alive = true;
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const pad = (n) => String(n).padStart(2, "0");
    const start = `${y}-${pad(m + 1)}-01`;
    const end = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
    axios
      .get(`${API_BASE_URL}/leaveRoute/leave_request/calendar/${encodeURIComponent(employeeNumber)}`, {
        params: { start, end },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => {
        if (!alive) return;
        const holidays = new Map((r.data?.holidays || []).map((h) => [h.date, h.label]));
        const wk = Array.isArray(r.data?.workingWeekdays) ? r.data.workingWeekdays.map((d) => String(d).toLowerCase()) : null;
        setWorkCal({ workingWeekdays: wk, holidays });
      })
      .catch(() => alive && setWorkCal(null));
    return () => {
      alive = false;
    };
  }, [open, employeeNumber, currentMonth]);

  /**
   * { kind: "holiday" | "no_schedule", reason } when the date is not a working day, else null.
   * Holidays are blocked (HR may override); unscheduled days stay selectable with a warning.
   * Falls back to Sat/Sun when no schedule is on file.
   */
  const nonWorkingInfo = (dateObj, dateStr) => {
    const wd = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dateObj.getDay()];
    const Wd = `${wd[0].toUpperCase()}${wd.slice(1)}`;
    if (workCal?.holidays?.has(dateStr)) return { kind: "holiday", reason: `Holiday — ${workCal.holidays.get(dateStr)}` };
    if (workCal?.workingWeekdays) {
      return workCal.workingWeekdays.includes(wd) ? null : { kind: "no_schedule", reason: `No schedule on ${Wd}s` };
    }
    return wd === "saturday" || wd === "sunday" ? { kind: "no_schedule", reason: `${Wd} (no schedule on file)` } : null;
  };

  const unscheduledSelected = useMemo(
    () =>
      [...selectedDates]
        .sort()
        .map((d) => {
          const [y, m, dd] = d.split("-").map((x) => parseInt(x, 10));
          const info = nonWorkingInfo(new Date(y, m - 1, dd), d);
          return info?.kind === "no_schedule" ? { date: d, reason: info.reason } : null;
        })
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDates, workCal],
  );
  useEffect(() => {
    if (onUnscheduledChange) onUnscheduledChange(unscheduledSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unscheduledSelected]);
  const [overBalanceWarning, setOverBalanceWarning] = useState("");

  // ── HR-approved dates (locked / uneditable) ────────────────────────────────
  const hrApprovedDates = useMemo(() => {
    const dates = new Set();
    leaveRequests.forEach((req) => {
      if (String(req.status) === "2") {
        (req.leave_date || "").split(",").forEach((d) => {
          if (d.trim()) dates.add(d.trim());
        });
      }
    });
    return dates;
  }, [leaveRequests]);

  // ── Over-balance warning ────────────────────────────────────────────────────
  useEffect(() => {
    if (maxSelectableDates !== null && selectedDates.length > maxSelectableDates) {
      setOverBalanceWarning(
        `Insufficient balance — you have ${maxSelectableDates.toFixed(1)} day(s) but selected ${selectedDates.length}.`,
      );
    } else {
      setOverBalanceWarning("");
    }
  }, [selectedDates, maxSelectableDates]);

  const formatDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toggleDate = (dateStr) => {
    if (hrApprovedDates.has(dateStr)) return;
    setSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      }
      return [...prev, dateStr];
    });
  };

  const clearAllDates = () => setSelectedDates([]);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const blanks = Array.from({ length: firstDay }, (_, i) => ({
      type: "blank",
      key: `blank-${i}`,
    }));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(year, month, dayNum);
      const dateStr = formatDate(dateObj);
      const isSelected = selectedDates.includes(dateStr);
      const isToday = dateObj.getTime() === today.getTime();
      const isPast = !adminOverride && !allowPastDates && dateObj < today;
      const isHRApproved = hrApprovedDates.has(dateStr);
      const nonWorking = nonWorkingInfo(dateObj, dateStr);

      return {
        type: "day",
        key: dateStr,
        dayNum,
        dateStr,
        isSelected,
        isToday,
        isPast,
        isHRApproved,
        nonWorking,
        isBlocked: isPast || isHRApproved || (nonWorking?.kind === "holiday" && !allowNonWorkingDays),
      };
    });

    return [...blanks, ...days];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, selectedDates, allowPastDates, adminOverride, hrApprovedDates, workCal, allowNonWorkingDays]);

  const goToPreviousMonth = () =>
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const formatSelectedDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const sortedSelectedDates = [...selectedDates].sort();

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, zIndex: 1400 }}
    >
      <Fade in={open}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 480,
            maxHeight: "90vh",
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
            bgcolor: T.surface,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Header ── layered radial blooms + glowing icon badge instead of a flat wash */}
          <Box
            sx={{
              px: 3.5,
              py: 3,
              background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentDark} 100%)`,
              position: "relative",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {/* soft radial blooms for depth, echoing the page header treatment */}
            <Box
              sx={{
                position: "absolute",
                top: -60,
                right: -40,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -50,
                left: "20%",
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 14px)",
                pointerEvents: "none",
              }}
            />
            {/* thin luminous seam along the bottom edge */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${alpha("#fff", 0.5)}, transparent)`,
                pointerEvents: "none",
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: "rgba(255,255,255,0.16)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 21, color: "#fff" }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: "#fff",
                      fontSize: "1rem",
                      lineHeight: 1.2,
                      letterSpacing: "0.01em",
                    }}
                  >
                    Select Leave Dates
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.72)", mt: 0.3 }}>
                    Click dates to select or deselect
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  color: "rgba(255,255,255,0.85)",
                  bgcolor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  position: "relative",
                  zIndex: 1,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>

          {/* ── Info banners (match the InfoCircleIcon notice style used in ReviewModal) ── */}
          {allowPastDates && (
            <Box
              sx={{
                px: 3,
                py: 1.25,
                bgcolor: "rgba(21,101,192,0.06)",
                borderBottom: "1px solid rgba(21,101,192,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexShrink: 0,
              }}
            >
              <Info sx={{ color: "#1565C0", fontSize: 16 }} />
              <Typography sx={{ fontSize: "0.78rem", color: "#1565C0", fontWeight: 600 }}>
                Past dates are enabled for sick leave filing
              </Typography>
            </Box>
          )}

          {adminOverride && (
            <Box
              sx={{
                px: 3,
                py: 1.25,
                bgcolor: T.accentFaint,
                borderBottom: `1px solid ${T.accentBorder}`,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexShrink: 0,
              }}
            >
              <Info sx={{ color: T.accent, fontSize: 16 }} />
              <Typography sx={{ fontSize: "0.78rem", color: T.accent, fontWeight: 600 }}>
                Admin override active — past dates are selectable for backdated filing
              </Typography>
            </Box>
          )}

          {/* ── Month navigation ── */}
          <Box
            sx={{
              px: 3,
              py: 1.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${T.divider}`,
              bgcolor: T.accentFaint,
              flexShrink: 0,
            }}
          >
            <NavigationButton onClick={goToPreviousMonth} accentcolor={T.accent}>
              <ChevronLeft sx={{ fontSize: 19 }} />
            </NavigationButton>

            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: T.accent }}>
                {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
              </Typography>
              <AccentButton
                size="small"
                onClick={goToToday}
                startIcon={<Today sx={{ fontSize: "13px !important" }} />}
                sx={{ mt: 0.25, fontSize: "0.68rem", color: T.accent, minWidth: 0, py: 0.25 }}
              >
                Today
              </AccentButton>
            </Box>

            <NavigationButton onClick={goToNextMonth} accentcolor={T.accent}>
              <ChevronRight sx={{ fontSize: 19 }} />
            </NavigationButton>
          </Box>

          {/* ── Calendar grid ── */}
          <Box sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1 }}>
              {daysOfWeek.map((day, index) => (
                <Box
                  key={day}
                  sx={{
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.06em",
                    color: index === 0 || index === 6 ? alpha(T.accent, 0.45) : T.muted,
                    textTransform: "uppercase",
                  }}
                >
                  {day}
                </Box>
              ))}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
              {calendarData.map((item) => {
                if (item.type === "blank") {
                  return <Box key={item.key} sx={{ width: 40, height: 40 }} />;
                }

                const dayButton = (
                  <DayButton
                    key={item.key}
                    selected={item.isSelected}
                    disabled={item.isBlocked}
                    istoday={item.isToday ? "true" : "false"}
                    accentcolor={T.accent}
                    onClick={() => !item.isBlocked && toggleDate(item.dateStr)}
                    sx={
                      item.isHRApproved
                        ? { border: "1.5px solid #C62828", background: "rgba(198,40,40,0.06)" }
                        : item.nonWorking?.kind === "holiday" && !item.isSelected
                          ? { border: "1.5px dashed rgba(0,0,0,0.18)", textDecoration: allowNonWorkingDays ? "none" : "line-through" }
                          : item.nonWorking?.kind === "no_schedule" && !item.isSelected
                            ? { border: "1.5px dashed #f0a020", color: "#9a6700" }
                            : {}
                    }
                  >
                    {item.dayNum}
                    {item.isSelected && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: "#fff",
                        }}
                      />
                    )}
                  </DayButton>
                );

                if (item.isHRApproved) {
                  return (
                    <Tooltip
                      key={item.key}
                      title="This date is unavailable. An HR-approved leave has already been scheduled."
                      arrow
                    >
                      <span>{dayButton}</span>
                    </Tooltip>
                  );
                }
                if (item.nonWorking) {
                  return (
                    <Tooltip
                      key={item.key}
                      title={
                        item.nonWorking.kind === "holiday"
                          ? `${item.nonWorking.reason}. ${allowNonWorkingDays ? "HR can still file it with a reason." : "Leave is not counted on holidays (CSC)."}`
                          : `${item.nonWorking.reason} — you can still select it, but there is no official time on this day.`
                      }
                      arrow
                    >
                      <span>{dayButton}</span>
                    </Tooltip>
                  );
                }
                return dayButton;
              })}
            </Box>
          </Box>

          {unscheduledSelected.length > 0 && (
            <Box sx={{ mx: 3, mb: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: "#fff8e6", border: "1px solid #ffd98a", display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Info sx={{ color: "#b7791f", fontSize: 16, mt: 0.1 }} />
              <Typography sx={{ fontSize: "0.74rem", color: "#8a5a00", lineHeight: 1.45 }}>
                No official time schedule on {unscheduledSelected.map((u) => formatSelectedDate(u.date)).join(", ")}. You can still file it; HR will check these dates.
              </Typography>
            </Box>
          )}

          {/* ── Selected-date summary chips (matches the "selected dates" tray on the form) ── */}
          {sortedSelectedDates.length > 0 && (
            <Box sx={{ px: 3, pb: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.6,
                  p: 1.25,
                  border: `1px solid ${T.divider}`,
                  borderRadius: 2,
                  bgcolor: "#fafafa",
                  maxHeight: 84,
                  overflowY: "auto",
                }}
              >
                {sortedSelectedDates.map((d) => (
                  <Box
                    key={d}
                    sx={{
                      px: 1,
                      py: 0.3,
                      borderRadius: 1,
                      bgcolor: T.accentFaint,
                      border: `1px solid ${T.accentBorder}`,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: T.accent }}>
                      {formatSelectedDate(d)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* ── Over-balance warning ── */}
          {overBalanceWarning && (
            <Box sx={{ px: 3, pb: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: "rgba(198,40,40,0.06)",
                  border: "1px solid rgba(198,40,40,0.2)",
                  borderRadius: 2,
                }}
              >
                <Info sx={{ fontSize: 15, color: "#C62828", flexShrink: 0, mt: 0.15 }} />
                <Typography sx={{ fontSize: "0.76rem", color: "#C62828", fontWeight: 600, lineHeight: 1.5 }}>
                  {overBalanceWarning}
                </Typography>
              </Box>
            </Box>
          )}

          {/* ── Footer (same Cancel/Confirm pattern as ReviewModal / ConfirmModal) ── */}
          <Box
            sx={{
              px: 3,
              py: 1.75,
              borderTop: `1px solid ${T.divider}`,
              bgcolor: "#f9f9f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.25,
              flexShrink: 0,
            }}
          >
            <AccentButton
              onClick={clearAllDates}
              disabled={selectedDates.length === 0}
              startIcon={<Clear sx={{ fontSize: "15px !important" }} />}
              variant="outlined"
              sx={{
                borderColor: T.accentBorder,
                color: T.accent,
                "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                "&:disabled": { color: "#ccc", borderColor: T.divider },
              }}
            >
              Clear All
            </AccentButton>

            <AccentButton
              onClick={onClose}
              variant="contained"
              startIcon={<Check sx={{ fontSize: "15px !important" }} />}
              sx={{
                bgcolor: T.accent,
                color: "#fff",
                px: 3,
                "&:hover": { bgcolor: T.accentDark },
              }}
            >
              Confirm ({selectedDates.length} selected)
            </AccentButton>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default LeaveDatePicker;