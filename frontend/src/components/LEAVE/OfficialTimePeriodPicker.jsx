
import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Paper,
  TextField,
  MenuItem,
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
  AccessTime,
} from "@mui/icons-material";

// -----------------------------------------------------------------------------
// Styled Components
// -----------------------------------------------------------------------------

const GlassPaper = styled(Paper)(() => ({
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(20px)",
  borderRadius: 24,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  overflow: "hidden",
}));

const DayButton = styled(Box)(
  ({ selected, disabled, isToday, accentColor }) => ({
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: selected ? 14 : "50%",
    fontWeight: 600,
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
    position: "relative",

    color: disabled ? "#ccc" : selected ? "#fff" : "#333",

    backgroundColor: selected
      ? accentColor
      : "transparent",

    border:
      isToday && !selected
        ? `2px solid ${accentColor}`
        : "none",

    opacity: disabled ? 0.4 : 1,

    transform: selected ? "scale(1.05)" : "scale(1)",

    boxShadow: selected
      ? `0 4px 12px ${alpha(accentColor, 0.4)}`
      : "none",

    "&:hover": disabled
      ? {}
      : {
          transform: selected
            ? "scale(1.08)"
            : "scale(1.1)",
          backgroundColor: selected
            ? accentColor
            : alpha(accentColor, 0.1),
        },
  })
);

const NavigationButton = styled(IconButton)(
  ({ accentColor }) => ({
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: alpha(accentColor, 0.08),
    color: accentColor,
    transition: "all 0.2s ease",

    "&:hover": {
      backgroundColor: alpha(accentColor, 0.15),
      transform: "scale(1.05)",
    },
  })
);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateTime = (date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  const formattedHours = String(hours).padStart(2, "0");

  return `${year}-${month}-${day} ${formattedHours}:${minutes} ${period}`;
};

const parseDateTime = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatDisplayDate = (date) => {
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDisplayTime = (date) => {
  if (!date) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const OfficialTimePeriodPicker = ({
  open,
  onClose,

  // Example:
  // "2026-09-02T08:00:00"
  startValue,
  endValue,

  onConfirm,

  accentColor = "#6d2323",
  accentDark = "#8B3333",

  allowPastDates = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    new Date()
  );

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [startHour, setStartHour] = useState("08");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");

  const [endHour, setEndHour] = useState("05");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("PM");

  const [selecting, setSelecting] = useState("start");

  const [error, setError] = useState("");

  // ---------------------------------------------------------------------------
  // Load existing values
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const start = parseDateTime(startValue);
    const end = parseDateTime(endValue);

    if (start) {
      setStartDate(start);
      setCurrentMonth(
        new Date(
          start.getFullYear(),
          start.getMonth(),
          1
        )
      );

      let hour = start.getHours();
      const minute = start.getMinutes();

      const period = hour >= 12 ? "PM" : "AM";

      hour = hour % 12;

      if (hour === 0) {
        hour = 12;
      }

      setStartHour(String(hour).padStart(2, "0"));
      setStartMinute(String(minute).padStart(2, "0"));
      setStartPeriod(period);
    } else {
      setStartDate(null);
    }

    if (end) {
      setEndDate(end);

      let hour = end.getHours();
      const minute = end.getMinutes();

      const period = hour >= 12 ? "PM" : "AM";

      hour = hour % 12;

      if (hour === 0) {
        hour = 12;
      }

      setEndHour(String(hour).padStart(2, "0"));
      setEndMinute(String(minute).padStart(2, "0"));
      setEndPeriod(period);
    } else {
      setEndDate(null);
    }

    setSelecting("start");
    setError("");
  }, [open, startValue, endValue]);

  // ---------------------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------------------

  const daysOfWeek = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const calendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const blanks = Array.from(
      { length: firstDay },
      (_, i) => ({
        type: "blank",
        key: `blank-${i}`,
      })
    );

    const days = Array.from(
      { length: daysInMonth },
      (_, i) => {
        const dayNum = i + 1;

        const dateObj = new Date(
          year,
          month,
          dayNum
        );

        const dateStr = formatDate(dateObj);

        const startStr = startDate
          ? formatDate(startDate)
          : "";

        const endStr = endDate
          ? formatDate(endDate)
          : "";

        const isStart =
          dateStr === startStr;

        const isEnd =
          dateStr === endStr;

        const isToday =
          dateObj.getTime() === today.getTime();

        const isPast =
          !allowPastDates &&
          dateObj < today;

        return {
          type: "day",
          key: dateStr,
          dayNum,
          dateObj,
          dateStr,
          isStart,
          isEnd,
          isToday,
          isPast,
        };
      }
    );

    return [...blanks, ...days];
  };

  // ---------------------------------------------------------------------------
  // Select Date
  // ---------------------------------------------------------------------------

  const handleDateSelect = (dateObj) => {
    const date = new Date(dateObj);

    date.setHours(0, 0, 0, 0);

    if (
      !allowPastDates &&
      date < new Date(
        new Date().setHours(0, 0, 0, 0)
      )
    ) {
      return;
    }

    if (selecting === "start") {
      setStartDate(date);

      // If selected start is after current end,
      // automatically clear the end.
      if (
        endDate &&
        date > endDate
      ) {
        setEndDate(null);
      }

      setSelecting("end");
    } else {
      if (
        startDate &&
        date < startDate
      ) {
        setError(
          "Period End cannot be earlier than Period Start."
        );
        return;
      }

      setEndDate(date);
      setError("");
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goToPreviousMonth = () => {
    setCurrentMonth(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth() - 1,
          1
        )
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth() + 1,
          1
        )
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // ---------------------------------------------------------------------------
  // Convert 12-hour time to Date
  // ---------------------------------------------------------------------------

  const createDateTime = (
    date,
    hour,
    minute,
    period
  ) => {
    if (!date) return null;

    let h = Number(hour);

    if (period === "AM") {
      if (h === 12) {
        h = 0;
      }
    } else {
      if (h !== 12) {
        h += 12;
      }
    }

    const result = new Date(date);

    result.setHours(
      h,
      Number(minute),
      0,
      0
    );

    return result;
  };

  // ---------------------------------------------------------------------------
  // Confirm
  // ---------------------------------------------------------------------------

  const handleConfirm = () => {
    setError("");

    if (!startDate) {
      setError("Please select a Period Start date.");
      return;
    }

    if (!endDate) {
      setError("Please select a Period End date.");
      return;
    }

    const start = createDateTime(
      startDate,
      startHour,
      startMinute,
      startPeriod
    );

    const end = createDateTime(
      endDate,
      endHour,
      endMinute,
      endPeriod
    );

    if (!start || !end) {
      setError("Please complete the date and time.");
      return;
    }

    if (end <= start) {
      setError(
        "Period End must be later than Period Start."
      );
      return;
    }

    onConfirm({
        start: formatDateTime(start),
        end: formatDateTime(end),
    });

    onClose();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Fade in={open}>
        <GlassPaper
          sx={{
            width: "100%",
            maxWidth: 560,
            maxHeight: "92vh",
            overflow: "auto",
          }}
        >
          {/* Header */}

          <Box
            sx={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
              p: 3,
              color: "#fff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    background:
                      "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalendarMonth
                    sx={{
                      fontSize: 26,
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Select Official Time Period
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.85,
                    }}
                  >
                    Select the start and end date and time
                  </Typography>
                </Box>
              </Box>

              <IconButton
                onClick={onClose}
                sx={{
                  color: "#fff",
                  backgroundColor:
                    "rgba(255,255,255,0.15)",
                  "&:hover": {
                    backgroundColor:
                      "rgba(255,255,255,0.25)",
                  },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Start / End Selection */}

          <Box
            sx={{
              p: 2.5,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
              },
              gap: 1.5,
              borderBottom:
                `1px solid ${alpha(
                  accentColor,
                  0.1
                )}`,
            }}
          >
            {/* Start */}

            <Box
              onClick={() =>
                setSelecting("start")
              }
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border:
                  selecting === "start"
                    ? `2px solid ${accentColor}`
                    : `1px solid ${alpha(
                        accentColor,
                        0.15
                      )}`,
                backgroundColor:
                  selecting === "start"
                    ? alpha(
                        accentColor,
                        0.06
                      )
                    : "#fff",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: accentColor,
                  textTransform: "uppercase",
                  mb: 0.5,
                }}
              >
                Period Start
              </Typography>

              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {startDate
                  ? formatDisplayDate(startDate)
                  : "Select date"}
              </Typography>

              {startDate && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#777",
                    mt: 0.25,
                  }}
                >
                  {formatDisplayTime(
                    createDateTime(
                      startDate,
                      startHour,
                      startMinute,
                      startPeriod
                    )
                  )}
                </Typography>
              )}
            </Box>

            {/* End */}

            <Box
              onClick={() =>
                setSelecting("end")
              }
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border:
                  selecting === "end"
                    ? `2px solid ${accentColor}`
                    : `1px solid ${alpha(
                        accentColor,
                        0.15
                      )}`,
                backgroundColor:
                  selecting === "end"
                    ? alpha(
                        accentColor,
                        0.06
                      )
                    : "#fff",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: accentColor,
                  textTransform: "uppercase",
                  mb: 0.5,
                }}
              >
                Period End
              </Typography>

              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {endDate
                  ? formatDisplayDate(endDate)
                  : "Select date"}
              </Typography>

              {endDate && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#777",
                    mt: 0.25,
                  }}
                >
                  {formatDisplayTime(
                    createDateTime(
                      endDate,
                      endHour,
                      endMinute,
                      endPeriod
                    )
                  )}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Calendar Navigation */}

          <Box
            sx={{
              px: 3,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom:
                `1px solid ${alpha(
                  accentColor,
                  0.1
                )}`,
            }}
          >
            <NavigationButton
              onClick={goToPreviousMonth}
              accentColor={accentColor}
            >
              <ChevronLeft />
            </NavigationButton>

            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: accentColor,
                }}
              >
                {currentMonth.toLocaleString(
                  "default",
                  {
                    month: "long",
                  }
                )}{" "}
                {currentMonth.getFullYear()}
              </Typography>

              <Button
                size="small"
                onClick={goToToday}
                startIcon={
                  <Today
                    sx={{
                      fontSize: 16,
                    }}
                  />
                }
                sx={{
                  mt: 0.5,
                  color: accentColor,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                Today
              </Button>
            </Box>

            <NavigationButton
              onClick={goToNextMonth}
              accentColor={accentColor}
            >
              <ChevronRight />
            </NavigationButton>
          </Box>

          {/* Calendar */}

          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(7, 1fr)",
                gap: 0.5,
                mb: 1.5,
              }}
            >
              {daysOfWeek.map((day) => (
                <Box
                  key={day}
                  sx={{
                    textAlign: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#888",
                  }}
                >
                  {day}
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(7, 1fr)",
                gap: 0.5,
                justifyItems: "center",
              }}
            >
              {calendarData().map((item) => {
                if (item.type === "blank") {
                  return (
                    <Box
                      key={item.key}
                      sx={{
                        width: 44,
                        height: 44,
                      }}
                    />
                  );
                }

                const selected =
                  item.isStart ||
                  item.isEnd;

                return (
                  <DayButton
                    key={item.key}
                    selected={selected}
                    disabled={item.isPast}
                    isToday={item.isToday}
                    accentColor={accentColor}
                    onClick={() =>
                      !item.isPast &&
                      handleDateSelect(
                        item.dateObj
                      )
                    }
                  >
                    {item.dayNum}

                    {item.isStart && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 3,
                          left: "50%",
                          transform:
                            "translateX(-50%)",
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          backgroundColor:
                            "#fff",
                        }}
                      />
                    )}
                  </DayButton>
                );
              })}
            </Box>
          </Box>

          {/* Time Selection */}

          <Box
            sx={{
              px: 3,
              pb: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1.5,
              }}
            >
              <AccessTime
                sx={{
                  fontSize: 18,
                  color: accentColor,
                }}
              />

              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: accentColor,
                }}
              >
                {selecting === "start"
                  ? "Period Start Time"
                  : "Period End Time"}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr 1fr",
                gap: 1,
              }}
            >
              <TextField
                select
                label="Hour"
                size="small"
                value={
                  selecting === "start"
                    ? startHour
                    : endHour
                }
                onChange={(e) => {
                  if (selecting === "start") {
                    setStartHour(
                      e.target.value
                    );
                  } else {
                    setEndHour(
                      e.target.value
                    );
                  }
                }}
              >
                {Array.from(
                  { length: 12 },
                  (_, i) => {
                    const value = String(
                      i + 1
                    ).padStart(2, "0");

                    return (
                      <MenuItem
                        key={value}
                        value={value}
                      >
                        {value}
                      </MenuItem>
                    );
                  }
                )}
              </TextField>

              <TextField
                select
                label="Minute"
                size="small"
                value={
                  selecting === "start"
                    ? startMinute
                    : endMinute
                }
                onChange={(e) => {
                  if (selecting === "start") {
                    setStartMinute(
                      e.target.value
                    );
                  } else {
                    setEndMinute(
                      e.target.value
                    );
                  }
                }}
              >
                {Array.from(
                  { length: 60 },
                  (_, i) => {
                    const value = String(
                      i
                    ).padStart(2, "0");

                    return (
                      <MenuItem
                        key={value}
                        value={value}
                      >
                        {value}
                      </MenuItem>
                    );
                  }
                )}
              </TextField>

              <TextField
                select
                label="AM / PM"
                size="small"
                value={
                  selecting === "start"
                    ? startPeriod
                    : endPeriod
                }
                onChange={(e) => {
                  if (selecting === "start") {
                    setStartPeriod(
                      e.target.value
                    );
                  } else {
                    setEndPeriod(
                      e.target.value
                    );
                  }
                }}
              >
                <MenuItem value="AM">
                  AM
                </MenuItem>

                <MenuItem value="PM">
                  PM
                </MenuItem>
              </TextField>
            </Box>
          </Box>

          {/* Error */}

          {error && (
            <Box
              sx={{
                mx: 3,
                mb: 2,
                px: 2,
                py: 1.25,
                borderRadius: 2,
                backgroundColor: "#FFEBEE",
                border:
                  "1px solid rgba(198,40,40,0.25)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  color: "#C62828",
                  fontWeight: 600,
                }}
              >
                {error}
              </Typography>
            </Box>
          )}

          {/* Footer */}

          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderTop:
                `1px solid ${alpha(
                  accentColor,
                  0.1
                )}`,
              backgroundColor:
                alpha(accentColor, 0.03),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Button
              onClick={onClose}
              sx={{
                color: accentColor,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleConfirm}
              variant="contained"
              startIcon={<Check />}
              sx={{
                backgroundColor: accentColor,
                color: "#fff",
                fontWeight: 700,
                textTransform: "none",
                px: 4,
                py: 1.2,
                borderRadius: 3,

                "&:hover": {
                  backgroundColor: accentDark,
                },
              }}
            >
              Confirm Period
            </Button>
          </Box>
        </GlassPaper>
      </Fade>
    </Modal>
  );
};

export default OfficialTimePeriodPicker;
